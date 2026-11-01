-- Charco Cinzento ('bog') com monstros: Morgrana, a Rainha Afogada ('morgrana'), é o boss (`MAPS.bog.bosses` no
-- packages/shared) e dá a runa dela uma vez por personagem, como os outros bosses. É o último boss do lado do charco da
-- bifurcação da Fortaleza Orc.
--   - `map_bosses('bog')` repete `MAPS.bog.bosses`.
--   - Hunt solo e sala no aparelho: o teto de loot do Charco sobe de 100 para 4600, cheio em 240 s (`SOLO_LIMITS` no
--     packages/shared; mude os dois juntos).
-- As funções e a lista do `check` são remendadas no texto atual do banco (o que outras migrations puseram fica).

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in (
    'dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing',
    'emberWarlord', 'greenDragon', 'erlking', 'morgrana'
  ));

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_bosses text := pg_get_functiondef('public.map_bosses(text)'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_runes_old constant text := $q$'emberWarlord', 'greenDragon', 'erlking')$q$;
  v_runes_new constant text := $q$'emberWarlord', 'greenDragon', 'erlking', 'morgrana')$q$;
  v_map_old constant text := $q$when 'heartwood' then array['erlking']$q$;
  v_map_new constant text := $q$when 'heartwood' then array['erlking']
    when 'bog' then array['morgrana']$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'bog' then 100 when 'badlands'$q$, $q$when 'bog' then 4600 when 'badlands'$q$],
    array[$q$when 'bog' then 180 when 'badlands'$q$, $q$when 'bog' then 240 when 'badlands'$q$]
  ];
  i int;
begin
  if position(v_runes_new in v_record) = 0 then
    if position(v_runes_old in v_record) = 0 then raise exception 'record_boss_runes: lista de bosses não encontrada'; end if;
    execute replace(v_record, v_runes_old, v_runes_new);
  end if;

  if position($q$when 'bog' then array['morgrana']$q$ in v_bosses) = 0 then
    if position(v_map_old in v_bosses) = 0 then raise exception 'map_bosses: trecho do Coração da Mata não encontrado'; end if;
    execute replace(v_bosses, v_map_old, v_map_new);
  end if;

  for i in 1 .. array_length(v_finish_pairs, 1) loop
    if position(v_finish_pairs[i][2] in v_finish) > 0 then continue; end if;
    if position(v_finish_pairs[i][1] in v_finish) = 0 then
      raise exception 'finish_solo_run: trecho não encontrado: %', v_finish_pairs[i][1];
    end if;
    v_finish := replace(v_finish, v_finish_pairs[i][1], v_finish_pairs[i][2]);
  end loop;
  execute v_finish;
end;
$$;
