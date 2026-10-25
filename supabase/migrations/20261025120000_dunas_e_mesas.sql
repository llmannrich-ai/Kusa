-- Mapas novos: Dunas Cantantes ('dunes') e Mesas de Solária ('mesas'), o lado deserto da bifurcação da Travessia
-- (etapas 6 e 7 da campanha de Verdemar). Por enquanto só o terreno, sem monstros: a hunt solo e a sala no aparelho
-- do jogador aceitam os dois mapas com os limites de `SOLO_LIMITS` (packages/shared: 8 min, teto de loot 100,
-- teto cheio em 180 s). Quando o bestiário chegar, os tetos e `map_bosses` mudam junto. As funções partem da versão
-- em produção.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check
  check (map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas'));

do $$
declare
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_maps_old constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern')$q$;
  v_maps_new constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern', 'dunes', 'mesas')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'cavern' then 600 else 240 end;$q$, $q$when 'cavern' then 600 when 'dunes' then 480 when 'mesas' then 480 else 240 end;$q$],
    array[$q$when 'cavern' then 3000 else 1200 end;$q$, $q$when 'cavern' then 3000 when 'dunes' then 100 when 'mesas' then 100 else 1200 end;$q$],
    array[$q$when 'cavern' then 240 else 90 end;$q$, $q$when 'cavern' then 240 when 'dunes' then 180 when 'mesas' then 180 else 90 end;$q$]
  ];
  i int;
begin
  if position(v_maps_new in v_start) = 0 then
    if position(v_maps_old in v_start) = 0 then raise exception 'start_solo_run: lista de mapas não encontrada'; end if;
    execute replace(v_start, v_maps_old, v_maps_new);
  end if;

  for i in 1 .. array_length(v_finish_pairs, 1) loop
    if position(v_finish_pairs[i][2] in v_finish) > 0 then continue; end if;
    if position(v_finish_pairs[i][1] in v_finish) = 0 then
      raise exception 'finish_solo_run: trecho não encontrado: %', v_finish_pairs[i][1];
    end if;
    v_finish := replace(v_finish, v_finish_pairs[i][1], v_finish_pairs[i][2]);
  end loop;
  execute v_finish;
end;
$$;
