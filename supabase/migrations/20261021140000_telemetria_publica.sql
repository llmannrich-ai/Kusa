-- Telemetria para todos os jogadores (Configurações > Telemetria). A tabela e as views continuam fechadas:
-- esta função devolve só números agregados (sem nome, id ou seed de ninguém) e o resumo das hunts de quem
-- consulta. `p_map` filtra pelo mapa (null = todos) e `p_days` pelos últimos dias (null = tudo).
-- Hunts abandonadas (fechou o jogo no meio) entram nas contagens, mas não nas taxas de dificuldade.

create function public.telemetry_dashboard(p_map text default null, p_days int default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with runs as (
    select * from public.telemetry_runs
    where (p_map is null or map_id = p_map)
      and (p_days is null or created_at >= now() - make_interval(days => greatest(p_days, 1)))
  ), fair as (
    select * from runs where not abandoned
  )
  select jsonb_build_object(
    'totais', (
      select jsonb_build_object(
        'hunts', count(*),
        'partidas', count(distinct match_id),
        'jogadores', count(distinct coalesce(profile_id::text, 'convidado:' || player_name)),
        'abandonos', count(*) filter (where abandoned),
        'sobrevivencia_pct', round(avg((outcome in ('escaped', 'completed'))::int) filter (where not abandoned) * 100, 1),
        'boss_pct', round(avg((outcome = 'completed')::int) filter (where not abandoned) * 100, 1),
        'soterrado_pct', round(avg((outcome = 'buried')::int) filter (where not abandoned) * 100, 1),
        'nivel_medio', round(avg(level), 1),
        'duracao_media_s', round(avg(duration_s), 0),
        'loot_medio_vivos', round(avg(loot) filter (where outcome in ('escaped', 'completed')), 0)
      ) from runs
    ),
    -- Últimos 14 dias, com zero nos dias sem hunt (fuso de Brasília).
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia::date, 'hunts', coalesce(c.n, 0)) order by d.dia), '[]')
      from generate_series((now() at time zone 'America/Sao_Paulo')::date - 13, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') as d(dia)
      left join (
        select (created_at at time zone 'America/Sao_Paulo')::date as dia, count(*) as n from runs group by 1
      ) c on c.dia = d.dia::date
    ),
    'fins', (
      select coalesce(jsonb_object_agg(outcome, n), '{}')
      from (select outcome, count(*) as n from runs group by 1) t
    ),
    'classes', (
      select coalesce(jsonb_agg(t order by t.hunts desc), '[]') from (
        select class_id, count(*) as hunts,
          round(avg((outcome in ('escaped', 'completed'))::int) * 100, 1) as sobrevivencia_pct,
          round(avg(level), 1) as nivel_medio,
          round(avg(loot) filter (where outcome in ('escaped', 'completed')), 0) as loot_medio_vivos,
          round(avg(max_depth + 1), 1) as salas_media
        from fair group by 1
      ) t
    ),
    'mapas', (
      select coalesce(jsonb_agg(t order by t.hunts desc), '[]') from (
        select map_id, count(*) as hunts,
          round(avg((outcome in ('escaped', 'completed'))::int) * 100, 1) as sobrevivencia_pct,
          round(avg(duration_s), 0) as duracao_media_s
        from fair group by 1
      ) t
    ),
    'mortes', (
      select coalesce(jsonb_agg(t order by t.mortes desc), '[]') from (
        select coalesce(killed_by, case when outcome = 'buried' then 'soterrado' else '?' end) as causa,
          count(*) as mortes,
          round(avg((stats -> 'death' ->> 'at')::numeric), 0) as segundo_medio
        from fair where outcome in ('died', 'buried')
        group by 1 order by 2 desc limit 8
      ) t
    ),
    'dano', (
      select coalesce(jsonb_agg(t order by t.dano_total desc), '[]') from (
        select r.class_id, d.key as fonte, sum(d.value::numeric)::bigint as dano_total,
          round(sum(d.value::numeric) / nullif(sum(r.duration_s), 0), 1) as dps_medio
        from runs r cross join lateral jsonb_each_text(r.stats -> 'damageDealt') d
        group by 1, 2 order by 3 desc limit 10
      ) t
    ),
    'magias', (
      select coalesce(jsonb_agg(t order by t.escolhas desc), '[]') from (
        select s.value ->> 'id' as magia, count(*) as escolhas,
          round(avg((r.outcome in ('escaped', 'completed'))::int) * 100, 1) as sobrevivencia_pct
        from fair r cross join lateral jsonb_each(r.stats -> 'spellsChosen') s
        group by 1 order by 2 desc limit 10
      ) t
    ),
    'melhorias', (
      select coalesce(jsonb_agg(t order by t.taxa_escolha_pct desc), '[]') from (
        select o.value as melhoria, count(*) as ofertas,
          count(*) filter (where c.value ->> 'id' = o.value) as escolhas,
          round(avg((c.value ->> 'id' = o.value)::int) * 100, 1) as taxa_escolha_pct
        from fair r
        cross join lateral jsonb_array_elements(r.stats -> 'perksChosen') c
        cross join lateral jsonb_array_elements_text(c.value -> 'offer') o
        group by 1
      ) t
    ),
    'monstros', (
      select coalesce(jsonb_agg(t order by t.abates desc), '[]') from (
        select k.key as monstro, sum(k.value::int) as abates
        from runs r cross join lateral jsonb_each_text(r.stats -> 'kills') k
        group by 1 order by 2 desc limit 10
      ) t
    ),
    -- Segundo médio em que cada nível chega (os slots de magia abrem no 3 e no 6).
    'niveis', (
      select coalesce(jsonb_agg(t order by t.nivel), '[]') from (
        select l.key::int as nivel, count(*) as hunts, round(avg(l.value::numeric), 0) as segundo_medio
        from runs r cross join lateral jsonb_each_text(r.stats -> 'levelAt') l
        where l.key::int between 2 and 12
        group by 1
      ) t
    ),
    -- Só as hunts de quem consulta.
    'minhas', (
      select jsonb_build_object(
        'hunts', count(*),
        'sobrevivencia_pct', round(avg((outcome in ('escaped', 'completed'))::int) * 100, 1),
        'bosses', count(*) filter (where outcome = 'completed'),
        'melhor_nivel', max(level),
        'loot_total', coalesce(sum(loot) filter (where outcome in ('escaped', 'completed')), 0),
        'abates', coalesce(sum((select sum(k.value::int) from jsonb_each_text(stats -> 'kills') k)), 0),
        'classe_favorita', mode() within group (order by class_id)
      ) from runs where profile_id = (select auth.uid())
    )
  );
$$;

revoke execute on function public.telemetry_dashboard(text, int) from public, anon;
grant execute on function public.telemetry_dashboard(text, int) to authenticated;
