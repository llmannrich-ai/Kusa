-- Monstros do Mar de Areia (Escorpião da Areia, Abutre Gigante, Múmia, Gnoll, esqueletos e Aranha gigante em 6 zonas
-- e 4 campinas) e o Verme da Areia recalibrado: o loot máximo de uma hunt no deserto sobe para ~840. O teto da hunt
-- solo acompanha `SOLO_LIMITS.maxLoot.desert` do packages/shared: 240 → 1000. Só muda o teto do deserto (troca
-- pontual na definição atual, como em 20261023150000_caverna_deserto.sql).

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'desert' then 240 else 1200$q$;
  v_new constant text := $q$when 'desert' then 1000 else 1200$q$;
begin
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do deserto não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
