-- Caverna do deserto: o Verme da Areia (boss) passa a morar no Mar de Areia, e a hunt solo do deserto agora
-- rende loot. O teto acompanha `SOLO_LIMITS.maxLoot.desert` do packages/shared: 0 → 240 (o máximo possível é o
-- loot do Verme com o bônus do boss, ~207). A runa dos baús entra como item novo, pelas regras de sempre.
-- Só muda o teto do deserto; o resto da função fica como está (troca pontual na definição atual).

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'desert' then 0 else 1200$q$;
  v_new constant text := $q$when 'desert' then 240 else 1200$q$;
begin
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do deserto não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
