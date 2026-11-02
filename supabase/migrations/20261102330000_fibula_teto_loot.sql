-- Fíbula mais dura (os comuns ×1,4 e os guardas ×1,8 pagam mais gold): o teto do loot da hunt solo e da sala no
-- aparelho dobra para 48.000 em 7.200 s (400 por minuto), para quem limpa as salas rápido e espera elas encherem de novo
-- não ter o loot cortado. Mude junto com `SOLO_LIMITS.maxLoot.fibula` (packages/shared/src/solo.ts).
-- Parte do estado depois de 20261102320000_fibula.sql: `finish_solo_run` é remendada no texto atual do banco.

do $$
declare
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$v_max_loot := case v_run.map_id when 'fibula' then 24000$q$;
  v_new constant text := $q$v_max_loot := case v_run.map_id when 'fibula' then 48000$q$;
begin
  if position(v_new in v_finish) > 0 then return; end if;
  if position(v_old in v_finish) = 0 then raise exception 'finish_solo_run: trecho não encontrado: %', v_old; end if;
  execute replace(v_finish, v_old, v_new);
end;
$$;
