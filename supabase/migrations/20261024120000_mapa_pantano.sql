-- Mapa novo: Pântano ('marsh'), por enquanto só o cenário (sem monstros nem baús), só para 1 jogador. A hunt solo e a
-- sala no aparelho do jogador passam a aceitar o mapa, com os limites de `SOLO_LIMITS` do packages/shared: 10 min de
-- hunt (MAPS.marsh.durationSeconds), teto de loot 0 (não há o que saquear) e teto cheio só depois de 240 s. Quando os
-- monstros entrarem, suba o teto aqui e em `SOLO_LIMITS.maxLoot.marsh` juntos.
-- Troca pontual nas definições em produção (como em 20261023210000_miniboss_deserto.sql): só a lista de mapas válidos
-- e os limites por mapa.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check check (map_id in ('crypt', 'swamp', 'desert', 'marsh'));

do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_swaps constant text[][] := array[
    array[$q$when 'desert' then 360 else 240 end;$q$, $q$when 'desert' then 360 when 'marsh' then 600 else 240 end;$q$],
    array[$q$when 'desert' then 1700 else 1200 end;$q$, $q$when 'desert' then 1700 when 'marsh' then 0 else 1200 end;$q$],
    array[$q$when 'desert' then 180 else 90 end;$q$, $q$when 'desert' then 180 when 'marsh' then 240 else 90 end;$q$]
  ];
  v_old constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert')$q$;
  i int;
begin
  if position(v_old in v_start) = 0 then raise exception 'start_solo_run: lista de mapas não encontrada'; end if;
  execute replace(v_start, v_old, $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh')$q$);
  for i in 1 .. array_length(v_swaps, 1) loop
    if position(v_swaps[i][1] in v_finish) = 0 then raise exception 'finish_solo_run: trecho % não encontrado', i; end if;
    v_finish := replace(v_finish, v_swaps[i][1], v_swaps[i][2]);
  end loop;
  execute v_finish;
end;
$$;
