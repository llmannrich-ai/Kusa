-- Melhorias da hunt (escolhidas a cada nível sem slot de magia): quantas vezes cada uma foi oferecida,
-- quantas foi escolhida, a taxa de escolha e a sobrevivência de quem escolheu. Lê `stats.perksChosen`
-- ({ id, offer, level, at }), gravado pelo servidor de jogo (apps/server/src/telemetry.ts).

create view public.telemetry_perk_picks with (security_invoker = true) as
with offers as (
  select r.build, r.map_id, r.class_id, r.outcome, c.value ->> 'id' as escolhida, o.value as oferecida,
    (c.value ->> 'level')::int as nivel, (c.value ->> 'at')::numeric as segundo
  from public.telemetry_runs r
  cross join lateral jsonb_array_elements(r.stats -> 'perksChosen') c
  cross join lateral jsonb_array_elements_text(c.value -> 'offer') o
  where not r.abandoned
)
select
  build,
  map_id,
  class_id,
  oferecida as melhoria,
  count(*) as ofertas,
  count(*) filter (where escolhida = oferecida) as escolhas,
  round(avg((escolhida = oferecida)::int) * 100, 1) as taxa_escolha_pct,
  round(avg(nivel) filter (where escolhida = oferecida), 1) as nivel_medio,
  round(avg((outcome in ('escaped', 'completed'))::int) filter (where escolhida = oferecida) * 100, 1) as sobrevivencia_pct
from offers
group by 1, 2, 3, 4;

revoke all on public.telemetry_perk_picks from anon, authenticated;
