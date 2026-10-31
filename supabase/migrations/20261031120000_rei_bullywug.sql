-- Rei Bullywug ('bullywugKing'): o boss único do Pântano das Ruínas (`MAPS.swamp.bosses` no packages/shared), no lugar
-- da Hidra e do Dragão negro. Dá a runa dele uma vez por personagem, como os outros bosses.
--   - `map_bosses('swamp')` repete `MAPS.swamp.bosses`, mas continua aceitando a Hidra e o Dragão negro: hunts abertas
--     na versão anterior (servidor ou aparelho ainda sem o deploy) não perdem a vitória nem a runa.
-- As funções partem da versão em produção (`record_boss_runes` com a lista de 20261025120000_dunas_e_mesas.sql).

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in (
    'dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing'
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
    else '{}'::text[]
  end;
$$;

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_bosses_old constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh')$q$;
  v_bosses_new constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing')$q$;
begin
  if position(v_bosses_new in v_record) = 0 then
    if position(v_bosses_old in v_record) = 0 then raise exception 'record_boss_runes: lista de bosses não encontrada'; end if;
    execute replace(v_record, v_bosses_old, v_bosses_new);
  end if;
end;
$$;
