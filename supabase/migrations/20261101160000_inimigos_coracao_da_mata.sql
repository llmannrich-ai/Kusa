-- Coração da Mata ('heartwood') com monstros: o Rei Galhado ('erlking') é o boss (`MAPS.heartwood.bosses` no
-- packages/shared) e dá a runa dele uma vez por personagem, como os outros bosses. É o último boss do lado da floresta
-- da bifurcação da Travessia (não abre outro cenário).
--   - `map_bosses('heartwood')` repete `MAPS.heartwood.bosses`.
--   - Hunt solo e sala no aparelho: o teto de loot do Coração da Mata sobe de 100 para 3800, cheio em 240 s
--     (`SOLO_LIMITS` no packages/shared; mude os dois juntos).
-- As funções partem da versão em produção (`record_boss_runes`, `map_bosses` e a lista do `check` de
-- 20261101140000_inimigos_bosque_velho.sql; `finish_solo_run` também).

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in (
    'dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing',
    'emberWarlord', 'greenDragon', 'erlking'
  ));

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then array['dragon']
    when 'swamp' then array['bullywugKing', 'hydra', 'blackDragon']
    when 'desert' then array['sandWorm']
    when 'marsh' then array['ogreKing']
    when 'cavern' then array['basilisk', 'beholder']
    when 'dunes' then array['singingColossus']
    when 'mesas' then array['eternalPharaoh']
    when 'fortress' then array['emberWarlord', 'ogreKing']
    when 'oldwood' then array['greenDragon']
    when 'heartwood' then array['erlking']
    else '{}'::text[]
  end;
$$;

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_bosses_old constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing', 'emberWarlord', 'greenDragon')$q$;
  v_bosses_new constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing', 'emberWarlord', 'greenDragon', 'erlking')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'heartwood' then 100 when 'fortress'$q$, $q$when 'heartwood' then 3800 when 'fortress'$q$],
    array[$q$when 'heartwood' then 180 when 'fortress'$q$, $q$when 'heartwood' then 240 when 'fortress'$q$]
  ];
  i int;
begin
  if position(v_bosses_new in v_record) = 0 then
    if position(v_bosses_old in v_record) = 0 then raise exception 'record_boss_runes: lista de bosses não encontrada'; end if;
    execute replace(v_record, v_bosses_old, v_bosses_new);
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
