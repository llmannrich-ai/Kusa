-- Cripta na dificuldade 5 (comuns ×1,5, mini-bosses e Mímico ×2,1, Dragão jovem ×2): os monstros pagam mais gold e o
-- loot máximo da hunt passa de 1.200 (o `else` do teto). O teto da hunt solo e da sala no aparelho da Cripta sobe para
-- 1.500. Mude junto com `SOLO_LIMITS.maxLoot.crypt` (packages/shared/src/solo.ts).
-- `finish_solo_run` é remendada no texto atual do banco.

do $$
declare
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_old constant text := $q$v_max_loot := case v_run.map_id when 'fibula2' then 48000$q$;
  v_new constant text := $q$v_max_loot := case v_run.map_id when 'crypt' then 1500 when 'fibula2' then 48000$q$;
begin
  if position(v_new in v_finish) > 0 then return; end if;
  if position(v_old in v_finish) = 0 then raise exception 'finish_solo_run: trecho não encontrado: %', v_old; end if;
  execute replace(v_finish, v_old, v_new);
end;
$$;
