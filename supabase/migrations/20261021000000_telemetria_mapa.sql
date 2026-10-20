-- Mapas: cada hunt passa a registrar o mapa (Cripta, Pântano das Ruínas...). Sem ele, a telemetria
-- misturaria mapas de dificuldades diferentes. Hunts antigas eram todas na cripta.

alter table public.telemetry_runs add column map_id text not null default 'crypt';

create index telemetry_runs_map_id_idx on public.telemetry_runs (map_id);

-- As views de balanceamento ganham o mapa como última coluna (create or replace só permite acrescentar no fim).

create or replace view public.telemetry_classes with (security_invoker = true) as
select
  build,
  class_id,
  count(*) as hunts,
  round(avg((outcome in ('escaped', 'completed'))::int) * 100, 1) as sobrevivencia_pct,
  round(avg((outcome = 'completed')::int) * 100, 1) as boss_pct,
  round(avg((outcome = 'buried')::int) * 100, 1) as soterrado_pct,
  round(avg(level), 1) as nivel_medio,
  round(avg(loot) filter (where outcome in ('escaped', 'completed')), 0) as loot_medio_vivos,
  round(avg(duration_s), 0) as duracao_media_s,
  round(avg(max_depth + 1), 1) as salas_media,
  map_id
from public.telemetry_runs
group by build, class_id, map_id;

create or replace view public.telemetry_deaths with (security_invoker = true) as
select
  build,
  coalesce(killed_by, case when outcome = 'buried' then 'soterrado' when abandoned then 'abandono' else '?' end) as causa,
  (stats -> 'death' ->> 'depth')::int as profundidade,
  class_id,
  count(*) as mortes,
  round(avg(level), 1) as nivel_medio,
  round(avg((stats -> 'death' ->> 'at')::numeric), 0) as segundo_medio,
  map_id
from public.telemetry_runs
where outcome in ('died', 'buried')
group by 1, 2, 3, 4, map_id;

create or replace view public.telemetry_levels with (security_invoker = true) as
select
  r.build,
  r.class_id,
  l.key::int as nivel,
  count(*) as hunts,
  round(avg(l.value::numeric), 0) as segundo_medio,
  round(min(l.value::numeric), 0) as segundo_min,
  round(max(l.value::numeric), 0) as segundo_max,
  r.map_id
from public.telemetry_runs r
cross join lateral jsonb_each_text(r.stats -> 'levelAt') l
group by 1, 2, 3, r.map_id;

create or replace view public.telemetry_economy with (security_invoker = true) as
select
  build,
  party_size,
  count(*) as hunts,
  round(avg((stats -> 'loot' ->> 'monsters')::numeric), 0) as loot_monstros,
  round(avg((stats -> 'loot' ->> 'chests')::numeric), 0) as loot_baus,
  round(avg((stats -> 'loot' ->> 'bossBonus')::numeric), 0) as bonus_boss,
  round(avg(case when outcome in ('escaped', 'completed') then loot else 0 end), 0) as gold_medio_por_hunt,
  round(avg(jsonb_array_length(stats -> 'items' -> 'picked')), 1) as itens_pegos,
  round(avg(jsonb_array_length(stats -> 'items' -> 'lost')), 1) as itens_perdidos,
  map_id
from public.telemetry_runs
group by build, party_size, map_id;

revoke all on public.telemetry_classes, public.telemetry_deaths, public.telemetry_levels, public.telemetry_economy
  from anon, authenticated;
