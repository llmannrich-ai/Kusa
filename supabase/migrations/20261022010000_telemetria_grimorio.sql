-- Fase 6 do Grimório (docs/GRIMORIO_PLANO.md, seção 8): views para medir se o Grimório ficou divertido.
-- Mesma regra das outras views de telemetria: security_invoker e sem acesso para anon/authenticated
-- (só o painel e o service role leem).

-- Por especialização (Traço comprado): quantas hunts, sobrevivência e chegada ao boss. Meta: nenhum lado abaixo de
-- 20% das escolhas do ramo.
create view public.telemetry_specs with (security_invoker = true) as
select
  r.build,
  r.class_id,
  s.value as traco,
  count(*) as hunts,
  round(avg((r.outcome in ('escaped', 'completed'))::int) * 100, 1) as sobrevivencia_pct,
  round(avg((r.outcome = 'completed')::int) * 100, 1) as boss_pct,
  round(avg(r.level), 1) as nivel_medio,
  r.map_id
from public.telemetry_runs r
cross join lateral jsonb_array_elements_text(coalesce(r.stats -> 'specs', '[]'::jsonb)) s
group by r.build, r.class_id, s.value, r.map_id;

-- Uso do Grimório por classe: quantas hunts chegam a cada slot (meta do slot 2: > 40%), nível médio comprado das
-- magias escolhidas, especializações por herói e os números das peças novas (escudos, bônus em si, Intervir, semente).
create view public.telemetry_grimoire with (security_invoker = true) as
select
  r.build,
  r.class_id,
  r.map_id,
  count(*) as hunts,
  round(avg(((r.stats -> 'spellsChosen') ? '1')::int) * 100, 1) as slot1_pct,
  round(avg(((r.stats -> 'spellsChosen') ? '2')::int) * 100, 1) as slot2_pct,
  round(avg((
    select avg((c.value ->> 'rank')::numeric) from jsonb_each(r.stats -> 'spellsChosen') c
  )), 2) as nivel_magia_medio,
  round(avg(jsonb_array_length(coalesce(r.stats -> 'specs', '[]'::jsonb))), 2) as especializacoes_media,
  round(avg(coalesce((r.stats ->> 'absorbed')::numeric, 0)), 0) as escudo_absorvido_medio,
  round(avg(coalesce((r.stats ->> 'buffMs')::numeric, 0)) / 1000, 1) as bonus_em_si_s_medio,
  round(avg(coalesce((r.stats ->> 'intercepted')::numeric, 0)), 0) as intervir_medio,
  sum(jsonb_array_length(coalesce(r.stats -> 'revives', '[]'::jsonb))) as reanimacoes
from public.telemetry_runs r
group by r.build, r.class_id, r.map_id;

revoke all on public.telemetry_specs, public.telemetry_grimoire from anon, authenticated;
