-- Hunt solo que fecha sozinha (o celular mata o jogo por falta de memória) não chega a `finish_solo_run` e some da
-- telemetria. Para achar o próximo caso direto por versão e por aparelho:
-- - `solo_runs.client`: build do cliente e dados do aparelho (memória, núcleos, tela, navegador), mandados por
--   `start_solo_run(..., p_client)`; vai também para `telemetry_runs.stats.client` quando a hunt termina.
-- - `solo_runs.last_seen_at`: último sinal de vida da hunt (`solo_run_alive`, a cada 20 s jogando).
-- - `telemetry_solo_fechadas`: hunts solo sem resultado (fecharam no meio), com o build, o aparelho e quantos segundos
--   duraram até o último sinal.

alter table public.solo_runs
  add column if not exists client jsonb,
  add column if not exists last_seen_at timestamptz;

-- start_solo_run e start_guest_run ganham `p_client` (opcional: cliente velho continua chamando com 2 argumentos).
do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_head_old text := 'CREATE OR REPLACE FUNCTION public.start_solo_run(p_class_id text, p_map_id text)';
  v_head_new text := 'CREATE OR REPLACE FUNCTION public.start_solo_run(p_class_id text, p_map_id text, p_client jsonb DEFAULT NULL::jsonb)';
  v_insert_old text := 'insert into public.solo_runs (profile_id, class_id, map_id, seed, loadout, bag)
  values (v_uid, p_class_id, p_map_id, floor(random() * 2147483647)::int, v_items, v_bag)';
  v_insert_new text := 'insert into public.solo_runs (profile_id, class_id, map_id, seed, loadout, bag, client)
  values (v_uid, p_class_id, p_map_id, floor(random() * 2147483647)::int, v_items, v_bag,
    case when jsonb_typeof(p_client) = ''object'' and pg_column_size(p_client) <= 2048 then p_client end)';
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_stats_old text := 'case when pg_column_size(p_report) <= 65536 then coalesce(p_report -> ''stats'', ''{}''::jsonb) else ''{}''::jsonb end,';
  v_stats_new text := '(case when pg_column_size(p_report) <= 65536 then coalesce(p_report -> ''stats'', ''{}''::jsonb) else ''{}''::jsonb end)
      || case when v_run.client is not null then jsonb_build_object(''client'', v_run.client) else ''{}''::jsonb end,';
begin
  if position(v_head_old in v_start) = 0 then raise exception 'start_solo_run: cabeçalho não encontrado'; end if;
  if position(v_insert_old in v_start) = 0 then raise exception 'start_solo_run: insert não encontrado'; end if;
  if position(v_stats_old in v_finish) = 0 then raise exception 'finish_solo_run: stats não encontrado'; end if;
  execute replace(replace(v_start, v_head_old, v_head_new), v_insert_old, v_insert_new);
  execute replace(v_finish, v_stats_old, v_stats_new);
end;
$$;

drop function public.start_solo_run(text, text);
revoke all on function public.start_solo_run(text, text, jsonb) from public, anon;
grant execute on function public.start_solo_run(text, text, jsonb) to authenticated;

drop function public.start_guest_run(text, text);
create function public.start_guest_run(p_class_id text, p_map_id text, p_client jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('kusa.convidado', 'sim', true);
  return public.start_solo_run(p_class_id, p_map_id, p_client);
end;
$$;
revoke all on function public.start_guest_run(text, text, jsonb) from public, anon;
grant execute on function public.start_guest_run(text, text, jsonb) to authenticated;

-- Sinal de vida da hunt solo aberta (só a própria, nas primeiras 3 horas).
create or replace function public.solo_run_alive(p_run_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.solo_runs set last_seen_at = now()
  where id = p_run_id and profile_id = auth.uid() and finished_at is null and started_at > now() - interval '3 hours';
$$;
revoke all on function public.solo_run_alive(uuid) from public, anon;
grant execute on function public.solo_run_alive(uuid) to authenticated;

-- Hunts solo que não deram resultado: fecharam no meio (o jogo fechou, caiu ou foi largado) ou ainda estão abertas.
create or replace view public.telemetry_solo_fechadas with (security_invoker = true) as
select
  s.started_at,
  s.map_id,
  s.class_id,
  s.client ->> 'build' as client_build,
  case when s.client ->> 'mem' ~ '^[0-9]{1,3}(\.[0-9]+)?$' then (s.client ->> 'mem')::numeric end as memoria_gb,
  s.client ->> 'ua' as navegador,
  s.committed_at is not null as passou_do_inicio,
  extract(epoch from (greatest(coalesce(s.last_seen_at, s.started_at), coalesce(s.committed_at, s.started_at)) - s.started_at))::int as ultimo_sinal_s,
  s.finished_at is null as aberta,
  s.profile_id
from public.solo_runs s
where not exists (select 1 from public.telemetry_runs t where t.match_id = s.id);

revoke all on public.telemetry_solo_fechadas from public, anon, authenticated;

notify pgrst, 'reload schema';
