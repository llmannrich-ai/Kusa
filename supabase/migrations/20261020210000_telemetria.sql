-- Telemetria de jogabilidade: uma linha por jogador por hunt, gravada pelo servidor de jogo
-- (service role). Inclui convidados (profile_id nulo). Serve para balancear classes, magias,
-- monstros e economia; o detalhe fica em `stats` (ver apps/server/src/telemetry.ts).
-- Ninguém além do service role lê ou grava: RLS ligada e sem políticas.

create table public.telemetry_runs (
  id bigint generated always as identity primary key,
  match_id uuid not null,
  profile_id uuid references public.profiles (id) on delete set null,
  player_name text not null,
  class_id text not null,
  party_size int not null,
  seed bigint not null,
  -- Commit do servidor: compara o antes e o depois de cada ajuste de balanceamento.
  build text not null,
  outcome text not null check (outcome in ('died', 'escaped', 'completed', 'buried')),
  abandoned boolean not null default false,
  level int not null,
  duration_s numeric not null,
  loot int not null,
  -- Sala mais funda alcançada (-1 = não saiu da sala inicial; path_rooms = sala do boss).
  max_depth int not null,
  path_rooms int not null,
  killed_by text,
  stats jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.telemetry_runs enable row level security;
revoke all on public.telemetry_runs from anon, authenticated;

create index telemetry_runs_created_at_idx on public.telemetry_runs (created_at desc);
create index telemetry_runs_match_id_idx on public.telemetry_runs (match_id);
create index telemetry_runs_profile_id_idx on public.telemetry_runs (profile_id);

-- Views de análise (security_invoker: respeitam a RLS de quem consulta, ou seja, só o painel/service role).

-- Classes: taxa de sobrevivência, nível, loot e tempo médio.
create view public.telemetry_classes with (security_invoker = true) as
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
  round(avg(max_depth + 1), 1) as salas_media
from public.telemetry_runs
group by build, class_id;

-- Mortes: quem mata, em que profundidade e em que momento da hunt.
create view public.telemetry_deaths with (security_invoker = true) as
select
  build,
  coalesce(killed_by, case when outcome = 'buried' then 'soterrado' when abandoned then 'abandono' else '?' end) as causa,
  (stats -> 'death' ->> 'depth')::int as profundidade,
  class_id,
  count(*) as mortes,
  round(avg(level), 1) as nivel_medio,
  round(avg((stats -> 'death' ->> 'at')::numeric), 0) as segundo_medio
from public.telemetry_runs
where outcome in ('died', 'buried')
group by 1, 2, 3, 4;

-- Fontes de dano: ataque básico x cada magia, por classe.
create view public.telemetry_damage with (security_invoker = true) as
select
  r.build,
  r.class_id,
  d.key as fonte,
  count(*) as hunts_que_usaram,
  sum(d.value::numeric)::bigint as dano_total,
  round(avg(d.value::numeric), 0) as dano_medio_por_hunt,
  round(sum(d.value::numeric) / nullif(sum(r.duration_s), 0), 1) as dps_medio,
  sum(coalesce((r.stats -> 'casts' ->> d.key)::int, 0)) as conjuracoes
from public.telemetry_runs r
cross join lateral jsonb_each_text(r.stats -> 'damageDealt') d
group by 1, 2, 3;

-- Magias escolhidas em cada slot: popularidade e quando o slot foi preenchido.
create view public.telemetry_spell_picks with (security_invoker = true) as
select
  r.build,
  r.class_id,
  s.key::int as slot,
  s.value ->> 'id' as magia,
  count(*) as escolhas,
  round(avg((s.value ->> 'at')::numeric), 0) as segundo_medio,
  round(avg((r.outcome in ('escaped', 'completed'))::int) * 100, 1) as sobrevivencia_pct
from public.telemetry_runs r
cross join lateral jsonb_each(r.stats -> 'spellsChosen') s
group by 1, 2, 3, 4;

-- Curva de XP: em que segundo cada nível é alcançado.
create view public.telemetry_levels with (security_invoker = true) as
select
  r.build,
  r.class_id,
  l.key::int as nivel,
  count(*) as hunts,
  round(avg(l.value::numeric), 0) as segundo_medio,
  round(min(l.value::numeric), 0) as segundo_min,
  round(max(l.value::numeric), 0) as segundo_max
from public.telemetry_runs r
cross join lateral jsonb_each_text(r.stats -> 'levelAt') l
group by 1, 2, 3;

-- Monstros: abates e dano causado aos jogadores.
create view public.telemetry_monsters with (security_invoker = true) as
with kills as (
  select r.build, k.key as monstro, sum(k.value::int) as abates
  from public.telemetry_runs r cross join lateral jsonb_each_text(r.stats -> 'kills') k
  group by 1, 2
), taken as (
  select r.build, t.key as monstro, sum(t.value::numeric)::bigint as dano_nos_jogadores
  from public.telemetry_runs r cross join lateral jsonb_each_text(r.stats -> 'damageTaken') t
  group by 1, 2
), deaths as (
  select build, killed_by as monstro, count(*) as mortes_causadas
  from public.telemetry_runs where killed_by is not null
  group by 1, 2
)
select
  coalesce(k.build, t.build, d.build) as build,
  coalesce(k.monstro, t.monstro, d.monstro) as monstro,
  coalesce(k.abates, 0) as abates,
  coalesce(t.dano_nos_jogadores, 0) as dano_nos_jogadores,
  coalesce(d.mortes_causadas, 0) as mortes_causadas
from kills k
full join taken t on t.build = k.build and t.monstro = k.monstro
full join deaths d on d.build = coalesce(k.build, t.build) and d.monstro = coalesce(k.monstro, t.monstro);

-- Economia: de onde vem o loot e quanto vira gold.
create view public.telemetry_economy with (security_invoker = true) as
select
  build,
  party_size,
  count(*) as hunts,
  round(avg((stats -> 'loot' ->> 'monsters')::numeric), 0) as loot_monstros,
  round(avg((stats -> 'loot' ->> 'chests')::numeric), 0) as loot_baus,
  round(avg((stats -> 'loot' ->> 'bossBonus')::numeric), 0) as bonus_boss,
  round(avg(case when outcome in ('escaped', 'completed') then loot else 0 end), 0) as gold_medio_por_hunt,
  round(avg(jsonb_array_length(stats -> 'items' -> 'picked')), 1) as itens_pegos,
  round(avg(jsonb_array_length(stats -> 'items' -> 'lost')), 1) as itens_perdidos
from public.telemetry_runs
group by build, party_size;

revoke all on public.telemetry_classes, public.telemetry_deaths, public.telemetry_damage,
  public.telemetry_spell_picks, public.telemetry_levels, public.telemetry_monsters, public.telemetry_economy
  from anon, authenticated;
