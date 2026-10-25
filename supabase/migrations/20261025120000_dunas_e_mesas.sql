-- Mapas novos: Dunas Cantantes ('dunes', 5 estrelas) e Mesas de Solária ('mesas', 6), o lado deserto da bifurcação da
-- Travessia (etapas 6 e 7 da campanha de Verdemar), com a Necrópole de Solária: a legião de ossos e as múmias da corte.
--   - Hunt solo e sala no aparelho: aceitam os dois mapas com os limites de `SOLO_LIMITS` (packages/shared: 8 min, teto
--     de loot 3300 e 3800, cheio em 240 s).
--   - Campanha: a ordem de `WORLD_ORDER` (packages/shared/src/world.ts) ganha 'dunes' (abre com um boss da Caverna da
--     Travessia) e 'mesas' (abre com o boss das Dunas). Mude os dois juntos.
--   - Bosses: Colosso Cantante ('singingColossus', Dunas) e Faraó Eterno ('eternalPharaoh', Mesas); cada um dá a runa dele
--     uma vez por personagem. `map_bosses` repete `MAPS[...].bosses`.
-- As funções partem da versão em produção.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check
  check (map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas'));

alter table public.profile_map_clears drop constraint profile_map_clears_map_id_check;
alter table public.profile_map_clears add constraint profile_map_clears_map_id_check
  check (map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas'));

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh'));

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then array['dragon']
    when 'swamp' then array['hydra', 'blackDragon']
    when 'desert' then array['sandWorm']
    when 'marsh' then array['ogreKing']
    when 'cavern' then array['basilisk', 'beholder']
    when 'dunes' then array['singingColossus']
    when 'mesas' then array['eternalPharaoh']
    else '{}'::text[]
  end;
$$;

-- Campanha: cenário que precisa estar vencido para abrir este (null: o primeiro). WORLD_ORDER do packages/shared.
create or replace function public.map_unlocked_by(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then 'marsh'
    when 'desert' then 'crypt'
    when 'swamp' then 'desert'
    when 'cavern' then 'swamp'
    when 'dunes' then 'cavern'
    when 'mesas' then 'dunes'
    else null
  end;
$$;

create or replace function public.map_unlocked(p_profile_id uuid, p_class_id text, p_map_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas') and (
    public.map_unlocked_by(p_map_id) is null
    or exists (
      select 1 from public.profile_map_clears c
      where c.profile_id = p_profile_id and c.class_id = p_class_id and c.map_id = public.map_unlocked_by(p_map_id)
    )
  );
$$;

create or replace function public.record_map_clear(p_profile_id uuid, p_class_id text, p_map_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_map_clears (profile_id, class_id, map_id)
  select p_profile_id, p_class_id, p_map_id
  where p_class_id in ('knight', 'paladin', 'sorcerer', 'druid') and p_map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas')
  on conflict do nothing;
$$;

-- `create or replace` mantém os grants; repete por garantia (só o servidor de jogo).
revoke execute on function public.map_unlocked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.map_unlocked(uuid, text, text) to service_role;
revoke execute on function public.record_map_clear(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_map_clear(uuid, text, text) to service_role;

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_bosses_old constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder')$q$;
  v_bosses_new constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder', 'singingColossus', 'eternalPharaoh')$q$;
  v_maps_old constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern')$q$;
  v_maps_new constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'cavern' then 600 else 240 end;$q$, $q$when 'cavern' then 600 when 'dunes' then 480 when 'mesas' then 480 else 240 end;$q$],
    array[$q$when 'cavern' then 3000 else 1200 end;$q$, $q$when 'cavern' then 3000 when 'dunes' then 3300 when 'mesas' then 3800 else 1200 end;$q$],
    array[$q$when 'cavern' then 240 else 90 end;$q$, $q$when 'cavern' then 240 when 'dunes' then 240 when 'mesas' then 240 else 90 end;$q$]
  ];
  i int;
begin
  if position(v_bosses_new in v_record) = 0 then
    if position(v_bosses_old in v_record) = 0 then raise exception 'record_boss_runes: lista de bosses não encontrada'; end if;
    execute replace(v_record, v_bosses_old, v_bosses_new);
  end if;

  if position(v_maps_new in v_start) = 0 then
    if position(v_maps_old in v_start) = 0 then raise exception 'start_solo_run: lista de mapas não encontrada'; end if;
    execute replace(v_start, v_maps_old, v_maps_new);
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
