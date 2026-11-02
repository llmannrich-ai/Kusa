-- A Fíbula volta a ser o mapa de três salões com um boss (o Rei Ossudo), e a caverna grande com os três covis vira um
-- mapa à parte, a Fíbula Profunda ('fibula2'), logo depois dela na campanha (abre com a Fíbula vencida; a Cripta
-- continua abrindo só com o Rei Ossudo). O mapa descoberto (`profile_map_memory`) vale para as duas.
-- Parte do estado depois de 20261102350000_fibula_tres_covis_e_mapa_descoberto.sql: `map_unlocked`, `record_map_clear`,
-- `start_solo_run` e `finish_solo_run` são remendadas no texto atual do banco.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check
  check (map_id in ('grove', 'fibula', 'fibula2', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands'));

alter table public.profile_map_clears drop constraint profile_map_clears_map_id_check;
alter table public.profile_map_clears add constraint profile_map_clears_map_id_check
  check (map_id in ('grove', 'fibula', 'fibula2', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands'));

alter table public.profile_map_memory drop constraint profile_map_memory_map_id_check;
alter table public.profile_map_memory add constraint profile_map_memory_map_id_check
  check (map_id in ('fibula', 'fibula2'));

create or replace function public.map_unlocked_by(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'marsh' then 'grove'
    when 'fibula' then 'marsh'
    when 'fibula2' then 'fibula'
    when 'crypt' then 'fibula'
    when 'desert' then 'crypt'
    when 'swamp' then 'desert'
    when 'cavern' then 'swamp'
    when 'dunes' then 'cavern'
    when 'mesas' then 'dunes'
    when 'fortress' then 'mesas'
    when 'oldwood' then 'cavern'
    when 'heartwood' then 'oldwood'
    when 'bog' then 'fortress'
    when 'badlands' then 'fortress'
    else null
  end;
$$;

-- `map_unlocked` é remendada no texto atual do banco (no bloco do fim): outra sessão (fortaleza_pelos_dois_lados) já a
-- reescreveu com `map_unlocked_by_also`, e recriá-la daqui apagaria isso.

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'grove' then array['dragon']
    when 'fibula' then array['boneKing']
    when 'fibula2' then array['boneKing', 'singingColossus', 'eternalPharaoh']
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
    when 'bog' then array['morgrana']
    when 'badlands' then array['kragmor']
    else '{}'::text[]
  end;
$$;

create or replace function public.save_map_memory(p_class_id text, p_map_id text, p_layout text, p_explored text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if p_class_id not in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman') then raise exception 'classe inválida'; end if;
  if p_map_id not in ('fibula', 'fibula2') then raise exception 'mapa sem memória'; end if;
  if p_layout is null or length(p_layout) > 32 or p_layout !~ '^[0-9a-f]+$' then raise exception 'planta inválida'; end if;
  if p_explored is null or length(p_explored) > 32768 or p_explored !~ '^[A-Za-z0-9+/=]*$' then raise exception 'mapa inválido'; end if;
  insert into public.profile_map_memory (profile_id, class_id, map_id, layout, explored, updated_at)
  values (v_uid, p_class_id, p_map_id, p_layout, p_explored, now())
  on conflict (profile_id, class_id, map_id) do update
    set layout = excluded.layout, explored = excluded.explored, updated_at = now();
end;
$$;

-- `create or replace` mantém os grants; repete por garantia.
revoke execute on function public.map_unlocked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.map_unlocked(uuid, text, text) to service_role;
revoke execute on function public.record_map_clear(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_map_clear(uuid, text, text) to service_role;
revoke execute on function public.save_map_memory(text, text, text, text) from public, anon;
grant execute on function public.save_map_memory(text, text, text, text) to authenticated;

do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_unlocked text := pg_get_functiondef('public.map_unlocked(uuid, text, text)'::regprocedure);
  v_unlocked_old constant text := $q$p_map_id in ('grove', 'fibula', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_unlocked_new constant text := $q$p_map_id in ('grove', 'fibula', 'fibula2', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_clear text := pg_get_functiondef('public.record_map_clear(uuid, text, text)'::regprocedure);
  v_clear_old constant text := $q$p_map_id in ('grove', 'fibula', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_clear_new constant text := $q$p_map_id in ('grove', 'fibula', 'fibula2', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_maps_old constant text := $q$p_map_id not in ('grove', 'fibula', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_maps_new constant text := $q$p_map_id not in ('grove', 'fibula', 'fibula2', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$v_duration := case v_run.map_id when 'fibula' then 7200$q$, $q$v_duration := case v_run.map_id when 'fibula2' then 7200 when 'fibula' then 7200$q$],
    array[$q$v_max_loot := case v_run.map_id when 'fibula' then 48000$q$, $q$v_max_loot := case v_run.map_id when 'fibula2' then 48000 when 'fibula' then 48000$q$],
    array[$q$v_full_loot_seconds := case v_run.map_id when 'fibula' then 7200$q$, $q$v_full_loot_seconds := case v_run.map_id when 'fibula2' then 7200 when 'fibula' then 7200$q$]
  ];
  i int;
begin
  if position(v_unlocked_new in v_unlocked) = 0 then
    if position(v_unlocked_old in v_unlocked) = 0 then raise exception 'map_unlocked: lista de mapas não encontrada'; end if;
    execute replace(v_unlocked, v_unlocked_old, v_unlocked_new);
  end if;

  if position(v_maps_new in v_start) = 0 then
    if position(v_maps_old in v_start) = 0 then raise exception 'start_solo_run: lista de mapas não encontrada'; end if;
    execute replace(v_start, v_maps_old, v_maps_new);
  end if;

  if position(v_clear_new in v_clear) = 0 then
    if position(v_clear_old in v_clear) = 0 then raise exception 'record_map_clear: lista de mapas não encontrada'; end if;
    execute replace(v_clear, v_clear_old, v_clear_new);
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
