-- Mapas novos: Bosque Velho ('oldwood') e Coração da Mata ('heartwood'), o lado da floresta da bifurcação da Travessia
-- (etapas 6 e 7 da campanha de Verdemar). Por enquanto só o terreno, sem monstros.
--   - Hunt solo e sala no aparelho: aceitam os dois mapas com os limites de `SOLO_LIMITS` (packages/shared: 8 min,
--     teto de loot 100, cheio em 180 s). Quando o bestiário chegar, os tetos e `map_bosses` mudam junto.
--   - Campanha (packages/shared/src/world.ts, mude os dois juntos): 'oldwood' abre com o Basilisco ('basilisk', boss do
--     covil oeste da Caverna da Travessia), como as Dunas abrem com o Observador (`UNLOCK_BOSS`, aqui
--     `map_unlocked_by_boss`); 'heartwood' abre com o boss do Bosque Velho (`unlockedBy`, aqui `map_unlocked_by`).
-- Parte do estado depois de 20261027150000_portoes_do_imperio.sql (com 'gates' e a bifurcação por boss): as listas de
-- mapas mantêm 'gates' e `map_unlocked` mantém o lado de bifurcação por boss.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check
  check (map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'oldwood', 'heartwood'));

alter table public.profile_map_clears drop constraint profile_map_clears_map_id_check;
alter table public.profile_map_clears add constraint profile_map_clears_map_id_check
  check (map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'oldwood', 'heartwood'));

-- Campanha: cenário que precisa estar vencido para abrir este (null: o primeiro). `unlockedBy` do packages/shared.
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
    when 'gates' then 'mesas'
    when 'oldwood' then 'cavern'
    when 'heartwood' then 'oldwood'
    else null
  end;
$$;

-- Lado de bifurcação: o boss que abre o cenário (null: abre com o cenário anterior vencido). UNLOCK_BOSS do packages/shared.
create or replace function public.map_unlocked_by_boss(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'dunes' then 'beholder'
    when 'oldwood' then 'basilisk'
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
  select p_map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'oldwood', 'heartwood') and (
    public.map_unlocked_by(p_map_id) is null
    or case
      when public.map_unlocked_by_boss(p_map_id) is not null then exists (
        select 1 from public.profile_boss_clears b
        where b.profile_id = p_profile_id and b.class_id = p_class_id and b.boss_kind = public.map_unlocked_by_boss(p_map_id)
      )
      else exists (
        select 1 from public.profile_map_clears c
        where c.profile_id = p_profile_id and c.class_id = p_class_id and c.map_id = public.map_unlocked_by(p_map_id)
      )
    end
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
  where p_class_id in ('knight', 'paladin', 'sorcerer', 'druid')
    and p_map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'oldwood', 'heartwood')
  on conflict do nothing;
$$;

-- `create or replace` mantém os grants; repete por garantia (só o servidor de jogo).
revoke execute on function public.map_unlocked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.map_unlocked(uuid, text, text) to service_role;
revoke execute on function public.record_map_clear(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_map_clear(uuid, text, text) to service_role;

-- Hunt solo: os textos "antigos" são os que a migration dos Portões deixou (com 'gates').
do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_maps_old constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates')$q$;
  v_maps_new constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'oldwood', 'heartwood')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'gates' then 480 else 240 end;$q$, $q$when 'gates' then 480 when 'oldwood' then 480 when 'heartwood' then 480 else 240 end;$q$],
    array[$q$when 'gates' then 100 else 1200 end;$q$, $q$when 'gates' then 100 when 'oldwood' then 100 when 'heartwood' then 100 else 1200 end;$q$],
    array[$q$when 'gates' then 180 else 90 end;$q$, $q$when 'gates' then 180 when 'oldwood' then 180 when 'heartwood' then 180 else 90 end;$q$]
  ];
  i int;
begin
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
