-- Cripta e Mar de Areia viram mapas de 3 estrelas (packages/shared/src/maps.ts): espécies mais fortes, mini-bosses e
-- boss bem mais fortes e mais tempo de hunt. A hunt solo e a sala no aparelho repetem os limites de `SOLO_LIMITS`:
--   - duração: Cripta 240 -> 360 s, Mar de Areia 360 -> 480 s (o resultado vale até a duração + a folga);
--   - teto de loot do Mar de Areia: 1.700 -> 1.900 (o boss paga mais loot; a Cripta continua em 1.200).
-- Parte do estado depois de 20261102300000_orla_do_bosque.sql: `finish_solo_run` é remendada no texto atual do banco.

do $$
declare
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_pairs constant text[][] := array[
    array[$q$v_duration := case v_run.map_id when 'grove' then 480 when 'swamp' then 480 when 'desert' then 360$q$,
          $q$v_duration := case v_run.map_id when 'grove' then 480 when 'crypt' then 360 when 'swamp' then 480 when 'desert' then 480$q$],
    array[$q$when 'desert' then 1700$q$, $q$when 'desert' then 1900$q$]
  ];
  i int;
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    if position(v_pairs[i][2] in v_finish) > 0 then continue; end if;
    if position(v_pairs[i][1] in v_finish) = 0 then
      raise exception 'finish_solo_run: trecho não encontrado: %', v_pairs[i][1];
    end if;
    v_finish := replace(v_finish, v_pairs[i][1], v_pairs[i][2]);
  end loop;
  execute v_finish;
end;
$$;
