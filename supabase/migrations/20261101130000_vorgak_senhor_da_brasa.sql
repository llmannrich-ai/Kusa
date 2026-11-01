-- Vorgak, o Senhor da Brasa ('emberWarlord'): o boss próprio da Fortaleza Orc (`MAPS.fortress.bosses` no
-- packages/shared), no lugar de Grumak. Dá a runa dele uma vez por personagem, como os outros bosses.
--   - `map_bosses('fortress')` repete `MAPS.fortress.bosses`, mas continua aceitando Grumak ('ogreKing'): uma hunt aberta
--     com a versão anterior das regras não perde a vitória nem a runa.
--   - Hunt solo e sala no aparelho (`SOLO_LIMITS`, mude os dois juntos): teto de loot da Fortaleza 4600 (era 4200; o
--     boss novo paga mais).
-- Parte da versão em produção (20261101120000_fortaleza_orc_monstros.sql e 20261031120000_rei_bullywug.sql).

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in (
    'dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing',
    'emberWarlord'
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
    else '{}'::text[]
  end;
$$;

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_bosses_old constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing')$q$;
  v_bosses_new constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh', 'bullywugKing', 'emberWarlord')$q$;
  v_loot_old constant text := $q$when 'fortress' then 4200 else 1200 end;$q$;
  v_loot_new constant text := $q$when 'fortress' then 4600 else 1200 end;$q$;
begin
  if position(v_bosses_new in v_record) = 0 then
    if position(v_bosses_old in v_record) = 0 then raise exception 'record_boss_runes: lista de bosses não encontrada'; end if;
    execute replace(v_record, v_bosses_old, v_bosses_new);
  end if;
  if position(v_loot_new in v_finish) = 0 then
    if position(v_loot_old in v_finish) = 0 then raise exception 'finish_solo_run: teto da Fortaleza não encontrado'; end if;
    execute replace(v_finish, v_loot_old, v_loot_new);
  end if;
end;
$$;

-- `create or replace` mantém os grants; repete por garantia (só o servidor de jogo grava runas de boss).
revoke execute on function public.record_boss_runes(uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.record_boss_runes(uuid, text, text[]) to service_role;
