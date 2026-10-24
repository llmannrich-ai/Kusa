-- Monstros do Pântano: o clã de orcs e ogros (8 comuns em 9 zonas e 8 campinas, 3 mini-bosses e Grumak, o Rei-Ogro).
-- O loot máximo de uma hunt no Pântano fica em ~2.200; o teto da hunt solo acompanha `SOLO_LIMITS.maxLoot.marsh` do
-- packages/shared: 0 → 2500. Só muda o teto do Pântano (troca pontual na definição atual, como em
-- 20261023210000_miniboss_deserto.sql).

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'marsh' then 0 else 1200$q$;
  v_new constant text := $q$when 'marsh' then 2500 else 1200$q$;
begin
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do Pântano não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
