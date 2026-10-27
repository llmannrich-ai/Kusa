-- A runa passa de mão em mão na equipe: um colega larga a sua da bag e outro pega. Na sala no aparelho do jogador,
-- cada um grava o seu por `finish_solo_run`, que só aceitava uma runa nova por boss anotado na hunt e recusava a
-- runa recebida de um colega. Agora aceita até 3 a mais (`SOLO_LIMITS.passedRunes` do packages/shared: o resto da
-- equipe de 4). O teto diário e o de itens novos por hunt continuam valendo. Só troca o teto das runas, mantendo o
-- resto da definição atual.

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$(v_item like 'rune-%' and v_new_runes >= v_rune_budget)$q$;
  v_new constant text := $q$(v_item like 'rune-%' and v_new_runes >= v_rune_budget + 3)$q$;
begin
  if position(v_new in v_def) > 0 then return; end if;
  if position(v_old in v_def) = 0 then raise exception 'finish_solo_run: teto das runas não encontrado'; end if;
  execute replace(v_def, v_old, v_new);
end;
$$;
