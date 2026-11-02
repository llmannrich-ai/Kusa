-- Mapa novo: a Orla do Bosque ('grove'), o primeiro da campanha, antes do Pântano do Kosaradius. Mapa fixo de bosque
-- (o terreno do Bosque Velho com seed fixa), dificuldade 1, 8 min, com os bichos mais fracos da floresta; o boss é o
-- Dragão jovem (o mesmo da Cripta).
--   - Campanha (packages/shared/src/world.ts, mude os dois juntos): a Orla começa aberta e o boss dela abre o
--     Pântano do Kosaradius (`map_unlocked_by('marsh') = 'grove'`).
--   - Hunt solo e sala no aparelho: aceitam o mapa com os limites de `SOLO_LIMITS` (8 min, teto de loot 1.400, cheio
--     em 240 s).
--   - Personagens que já existem herdam a Orla como vencida (o Pântano continua aberto para eles): todo par
--     (conta, classe) que já jogou uma hunt, tem item ou já venceu um cenário ou um boss.
-- Parte do estado depois de 20261102020000_charco_cinzento_e_ermos_rubros.sql: `record_map_clear`, `start_solo_run` e
-- `finish_solo_run` são remendadas no texto atual do banco.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check
  check (map_id in ('grove', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands'));

alter table public.profile_map_clears drop constraint profile_map_clears_map_id_check;
alter table public.profile_map_clears add constraint profile_map_clears_map_id_check
  check (map_id in ('grove', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands'));

create or replace function public.map_unlocked_by(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'marsh' then 'grove'
    when 'crypt' then 'marsh'
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

create or replace function public.map_unlocked(p_profile_id uuid, p_class_id text, p_map_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_map_id in ('grove', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands') and (
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

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'grove' then array['dragon']
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

-- `create or replace` mantém os grants; repete por garantia (só o servidor de jogo).
revoke execute on function public.map_unlocked(uuid, text, text) from public, anon, authenticated;
grant execute on function public.map_unlocked(uuid, text, text) to service_role;
revoke execute on function public.record_map_clear(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_map_clear(uuid, text, text) to service_role;

do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_clear text := pg_get_functiondef('public.record_map_clear(uuid, text, text)'::regprocedure);
  v_clear_old constant text := $q$p_map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_clear_new constant text := $q$p_map_id in ('grove', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_maps_old constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_maps_new constant text := $q$p_map_id not in ('grove', 'crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas', 'gates', 'fortress', 'oldwood', 'heartwood', 'bog', 'badlands')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$v_duration := case v_run.map_id when 'swamp' then 480$q$, $q$v_duration := case v_run.map_id when 'grove' then 480 when 'swamp' then 480$q$],
    array[$q$v_max_loot := case v_run.map_id when 'swamp' then 3000$q$, $q$v_max_loot := case v_run.map_id when 'grove' then 1400 when 'swamp' then 3000$q$],
    array[$q$v_full_loot_seconds := case v_run.map_id when 'swamp' then 180$q$, $q$v_full_loot_seconds := case v_run.map_id when 'grove' then 240 when 'swamp' then 180$q$]
  ];
  i int;
begin
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

-- Personagens que já existem herdam a Orla vencida: o Pântano do Kosaradius continua aberto para eles.
insert into public.profile_map_clears (profile_id, class_id, map_id)
select distinct c.profile_id, c.class_id, 'grove'
from (
  select profile_id, class_id from public.solo_runs
  union select profile_id, class_id from public.match_players
  union select profile_id, class_id from public.profile_map_clears
  union select profile_id, class_id from public.profile_boss_clears
  union select profile_id, class_id from public.profile_items
) c
where c.profile_id is not null
  and c.class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman')
  and exists (select 1 from public.profiles p where p.id = c.profile_id)
on conflict do nothing;
