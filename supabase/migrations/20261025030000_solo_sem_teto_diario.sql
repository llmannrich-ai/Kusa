-- Hunt solo sem teto diário: o `finish_solo_run` limitava o valor creditado (gold + preço dos itens novos) a 12.000
-- por conta em 24 horas, e quem jogava muito perdia o loot e a bag inteira da hunt sem aviso antes de entrar.
-- O jogo é entre amigos; continuam valendo os limites por hunt (teto de loot por mapa e por tempo, até 15 itens
-- novos, runas por boss anotado). Só tira o teto diário, mantendo o resto da definição atual.

do $$
declare
  v_def text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old_decl constant text := $q$  c_daily_value constant int := 12000;
$q$;
  v_old_budget constant text := $q$  select greatest(0, c_daily_value - coalesce(sum(gold_awarded + items_value), 0))::int into v_budget
  from public.solo_runs
  where profile_id = v_uid and finished_at > now() - interval '24 hours';
  v_gold := least(v_loot, v_budget);
  v_budget := v_budget - v_gold;
$q$;
  v_old_item constant text := $q$ or v_price > v_budget
        or$q$;
begin
  if position('c_daily_value' in v_def) = 0 then return; end if;
  if position(v_old_decl in v_def) = 0 or position(v_old_budget in v_def) = 0 or position(v_old_item in v_def) = 0 then
    raise exception 'finish_solo_run: teto diário não encontrado';
  end if;
  v_def := replace(v_def, v_old_decl, '');
  v_def := replace(v_def, v_old_budget, $q$  v_gold := v_loot;
$q$);
  v_def := replace(v_def, v_old_item, $q$
        or$q$);
  v_def := replace(v_def, $q$      v_budget := v_budget - v_price;
$q$, '');
  v_def := replace(v_def, $q$  v_budget int;
$q$, '');
  execute v_def;
end;
$$;
