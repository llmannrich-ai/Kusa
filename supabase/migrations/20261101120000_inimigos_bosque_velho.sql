-- Bosque Velho ('oldwood') com monstros: o Dragão Verde Jovem ('greenDragon') é o boss (`MAPS.oldwood.bosses` no
-- packages/shared) e dá a runa dele uma vez por personagem, como os outros bosses. Vencê-lo abre o Coração da Mata
-- (`map_unlocked_by` já tinha 'heartwood' ← 'oldwood').
--   - `map_bosses('oldwood')` repete `MAPS.oldwood.bosses`.
--   - Hunt solo e sala no aparelho: o teto de loot do Bosque Velho sobe de 100 para 3200, cheio em 240 s
--     (`SOLO_LIMITS` no packages/shared; mude os dois juntos).
-- As funções partem da versão em produção (`record_boss_runes` de 20261031120000_rei_bullywug.sql e `finish_solo_run`
-- de 20261031210000_fortaleza_orc.sql).

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in (
    'dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing',
    'greenDragon'
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
    when 'oldwood' then array['greenDragon']
    else '{}'::text[]
  end;
$$;

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_bosses_old constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing')$q$;
  v_bosses_new constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing', 'greenDragon')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'oldwood' then 100 when 'heartwood'$q$, $q$when 'oldwood' then 3200 when 'heartwood'$q$],
    array[$q$when 'oldwood' then 180 when 'heartwood'$q$, $q$when 'oldwood' then 240 when 'heartwood'$q$]
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
