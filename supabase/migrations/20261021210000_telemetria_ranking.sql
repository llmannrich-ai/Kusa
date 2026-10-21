-- Ranking entre amigos (Configurações > Telemetria): números de cada conta, com o nome. Entram só contas
-- (convidados escolhem qualquer nome e ficam de fora). Mesmos filtros de `telemetry_dashboard`: `p_map`
-- (null = todos) e `p_days` (null = tudo). Taxas sem as hunts abandonadas; somas com todas.

create function public.telemetry_ranking(p_map text default null, p_days int default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(t order by t.hunts desc, t.nome), '[]') from (
    select p.username as nome,
      (p.id = (select auth.uid())) as eu,
      count(*) as hunts,
      round(avg((r.outcome in ('escaped', 'completed'))::int) filter (where not r.abandoned) * 100, 1) as sobrevivencia_pct,
      count(*) filter (where r.outcome = 'completed') as bosses,
      count(*) filter (where r.outcome in ('died', 'buried')) as mortes,
      coalesce(sum(r.loot) filter (where r.outcome in ('escaped', 'completed')), 0) as loot_total,
      coalesce(sum((select sum(k.value::numeric) from jsonb_each_text(r.stats -> 'kills') k)), 0)::bigint as abates,
      coalesce(sum((select sum(d.value::numeric) from jsonb_each_text(r.stats -> 'damageDealt') d)), 0)::bigint as dano_causado,
      coalesce(sum((select sum(d.value::numeric) from jsonb_each_text(r.stats -> 'damageTaken') d)), 0)::bigint as dano_recebido,
      coalesce(sum((r.stats ->> 'healing')::numeric), 0)::bigint as cura,
      max(r.level) as melhor_nivel,
      round(sum(r.duration_s) / 60, 0) as minutos,
      mode() within group (order by r.class_id) as classe_favorita
    from public.telemetry_runs r
    join public.profiles p on p.id = r.profile_id
    where (p_map is null or r.map_id = p_map)
      and (p_days is null or r.created_at >= now() - make_interval(days => greatest(p_days, 1)))
    group by p.id, p.username
    order by count(*) desc
    limit 30
  ) t;
$$;

revoke execute on function public.telemetry_ranking(text, int) from public, anon;
grant execute on function public.telemetry_ranking(text, int) to authenticated;
