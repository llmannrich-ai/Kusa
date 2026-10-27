-- A migration das runas de boss (20261025000000) recriou `finish_solo_run` a partir da versão anterior ao ajuste do
-- Pântano do Kosaradius (20261024220000) e trouxe de volta o teto antigo de loot do mapa. Volta o teto para 1900
-- (`SOLO_LIMITS.maxLoot.marsh` do packages/shared). Só troca o teto, mantendo o resto da definição atual.

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$when 'marsh' then 5000 else 1200$q$;
  v_new constant text := $q$when 'marsh' then 1900 else 1200$q$;
begin
  if position(v_new in v_def) > 0 then return; end if;
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto do Pântano não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
