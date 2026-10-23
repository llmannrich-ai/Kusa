-- Telemetria do "Jogar deitado (beta)": compara as hunts jogadas em pé e deitado (Configurações > Telemetria).
-- Conta como deitada a hunt com pelo menos metade do tempo na tela deitada (`stats.landscapeMs`).
-- Hunts de antes da medição (sem `landscapeMs`) ficam de fora. Mesmos filtros de `telemetry_dashboard`.

create function public.telemetry_screen(p_map text default null, p_days int default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with runs as (
    select *,
      case when (stats ->> 'landscapeMs')::numeric >= duration_s * 500 and duration_s > 0 then 'deitado' else 'em_pe' end as tela
    from public.telemetry_runs
    where stats ? 'landscapeMs'
      and (p_map is null or map_id = p_map)
      and (p_days is null or created_at >= now() - make_interval(days => greatest(p_days, 1)))
  )
  select coalesce(jsonb_agg(t order by t.tela desc), '[]') from (
    select tela, count(*) as hunts,
      count(distinct coalesce(profile_id::text, 'convidado:' || player_name)) as jogadores,
      round(avg(abandoned::int) * 100, 1) as abandono_pct,
      round(avg((outcome in ('escaped', 'completed'))::int) filter (where not abandoned) * 100, 1) as sobrevivencia_pct,
      round(avg(level) filter (where not abandoned), 1) as nivel_medio,
      round(avg(loot) filter (where outcome in ('escaped', 'completed')), 0) as loot_medio_vivos,
      round(avg(duration_s), 0) as duracao_media_s
    from runs group by 1
  ) t;
$$;

revoke execute on function public.telemetry_screen(text, int) from public, anon;
grant execute on function public.telemetry_screen(text, int) to authenticated;
