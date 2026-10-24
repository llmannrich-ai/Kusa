-- Pântano do Kosaradius mais povoado: até 2 clareiras de mini-boss com baú por zona (10 a 15 por mapa), 14 campinas
-- com 3 monstros cada e um mini-boss solto em 40% delas (~100 monstros e ~19 mini-bosses por hunt). O loot máximo
-- sobe para ~4.450; o teto da hunt solo acompanha `SOLO_LIMITS.maxLoot.marsh` do packages/shared: 2500 → 5000.
-- Só muda o teto do Pântano (troca pontual na definição atual, como em 20261024150000_monstros_pantano.sql).

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'marsh' then 2500 else 1200$q$;
  v_new constant text := $q$when 'marsh' then 5000 else 1200$q$;
begin
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do Pântano não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
