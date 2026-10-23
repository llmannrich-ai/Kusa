-- Mini-bosses do Mar de Areia: ruínas soterradas com Escorpião Negro Gigante, Sacerdote Mumificado ou Elemental de
-- Areia guardando um baú. O loot máximo de uma hunt no deserto sobe para ~1.475; o teto da hunt solo acompanha
-- `SOLO_LIMITS.maxLoot.desert` do packages/shared: 1000 → 1700. Só muda o teto do deserto (troca pontual na definição
-- atual, como em 20261023180000_monstros_deserto.sql).

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'desert' then 1000 else 1200$q$;
  v_new constant text := $q$when 'desert' then 1700 else 1200$q$;
begin
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do deserto não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
