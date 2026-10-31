-- Hunts simuladas (`apps/server/scripts/simular.ts`): o piloto automático joga hunts inteiras e grava uma linha por
-- hunt, no mesmo formato de `telemetry_runs`. Ficam numa tabela à parte para nada do que os jogadores veem (ranking,
-- histórico, painel) nem as views de balanceamento misturarem simulado com real; `telemetry_all` junta as duas com a
-- coluna `simulated`, para comparar.

create table public.telemetry_sim_runs (like public.telemetry_runs including all);

-- Perfil do jogador simulado (novato, medio, veterano), versão do piloto e seed da simulação.
alter table public.telemetry_sim_runs add column sim jsonb not null default '{}'::jsonb;

alter table public.telemetry_sim_runs enable row level security;
revoke all on public.telemetry_sim_runs from anon, authenticated;

create index telemetry_sim_runs_created_at_idx on public.telemetry_sim_runs (created_at desc);
create index telemetry_sim_runs_build_idx on public.telemetry_sim_runs (build);

-- Real e simulado juntos. `security_invoker`: quem consulta precisa poder ler as duas tabelas (só o service role).
create view public.telemetry_all with (security_invoker = true) as
select id, match_id, profile_id, player_name, class_id, party_size, seed, build, outcome, abandoned, level, duration_s,
  loot, max_depth, path_rooms, killed_by, stats, created_at, map_id, solo, false as simulated, null::jsonb as sim
from public.telemetry_runs
union all
select id, match_id, profile_id, player_name, class_id, party_size, seed, build, outcome, abandoned, level, duration_s,
  loot, max_depth, path_rooms, killed_by, stats, created_at, map_id, solo, true as simulated, sim
from public.telemetry_sim_runs;

revoke all on public.telemetry_all from anon, authenticated;
