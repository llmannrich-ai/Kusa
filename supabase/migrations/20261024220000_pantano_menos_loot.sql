-- Pântano do Kosaradius pagava loot demais (~100 monstros e ~19 mini-bosses por hunt): o mapa passa a pagar 35% do
-- valor dos monstros e baús e 35% dos drops de item e poção (`MapDef.lootScale` e `dropScale`; o boss fica de fora).
-- O loot máximo cai de ~4.600 para ~1.650; o teto da hunt solo acompanha `SOLO_LIMITS.maxLoot.marsh` do
-- packages/shared: 5000 → 1900. Só muda o teto do Pântano (troca pontual na definição atual).

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'marsh' then 5000 else 1200$q$;
  v_new constant text := $q$when 'marsh' then 1900 else 1200$q$;
begin
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do Pântano não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
