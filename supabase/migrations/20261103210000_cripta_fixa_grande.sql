-- Cripta fixa e grande (96×128, 8 salões, comuns ×2,2): a hunt passa de 6 para 9 minutos e o loot máximo sobe. Na
-- hunt solo e na sala no aparelho, `finish_solo_run` passa a aceitar 540 s de hunt na Cripta, o teto do loot sobe de
-- 1.500 para 3.200 e só chega ao máximo em 240 s (era o `else` de 90 s). Mude junto com `SOLO_LIMITS.maxLoot.crypt` e
-- `SOLO_LIMITS.fullLootSeconds.crypt` (packages/shared/src/solo.ts) e `MAPS.crypt.durationSeconds`.
-- `finish_solo_run` é remendada no texto atual do banco.

do $$
declare
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_pairs constant text[][] := array[
    array[$q$when 'crypt' then 360 when$q$, $q$when 'crypt' then 540 when$q$],
    array[$q$v_max_loot := case v_run.map_id when 'crypt' then 1500 when$q$, $q$v_max_loot := case v_run.map_id when 'crypt' then 3200 when$q$],
    array[$q$v_full_loot_seconds := case v_run.map_id when 'fibula2' then 7200$q$, $q$v_full_loot_seconds := case v_run.map_id when 'crypt' then 240 when 'fibula2' then 7200$q$]
  ];
  i int;
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    if position(v_pairs[i][2] in v_finish) > 0 then continue; end if;
    if position(v_pairs[i][1] in v_finish) = 0 then raise exception 'finish_solo_run: trecho não encontrado: %', v_pairs[i][1]; end if;
    v_finish := replace(v_finish, v_pairs[i][1], v_pairs[i][2]);
  end loop;
  execute v_finish;
end;
$$;
