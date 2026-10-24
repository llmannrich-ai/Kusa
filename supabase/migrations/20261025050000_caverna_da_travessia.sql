-- Mapa novo: Caverna da Travessia ('cavern'), o ponto 5 da campanha de Verdemar (a primeira bifurcação). Dois covis, um boss em cada:
-- o Basilisco ('basilisk', o médio do mapa) e o Observador das Profundezas ('beholder', o mais forte do jogo). Cada boss dá a runa
-- dele uma vez por personagem, e o mapa mundi lê `profile_boss_runes` para liberar o caminho daquele lado da
-- bifurcação. A hunt solo e a sala no aparelho do jogador aceitam o mapa com os limites de `SOLO_LIMITS`
-- (packages/shared: 10 min, teto de loot 3000, teto cheio em 240 s). Os bosses de cada mapa repetem
-- `MAPS[...].bosses` do packages/shared: mude os dois juntos. As funções partem da versão em produção.

alter table public.solo_runs drop constraint solo_runs_map_id_check;
alter table public.solo_runs add constraint solo_runs_map_id_check
  check (map_id in ('crypt', 'swamp', 'desert', 'marsh', 'cavern'));

alter table public.profile_boss_runes drop constraint profile_boss_runes_boss_kind_check;
alter table public.profile_boss_runes add constraint profile_boss_runes_boss_kind_check
  check (boss_kind in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder'));

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then array['dragon']
    when 'swamp' then array['hydra', 'blackDragon']
    when 'desert' then array['sandWorm']
    when 'marsh' then array['ogreKing']
    when 'cavern' then array['basilisk', 'beholder']
    else '{}'::text[]
  end;
$$;

do $$
declare
  v_record text := pg_get_functiondef('public.record_boss_runes(uuid, text, text[])'::regprocedure);
  v_start text := pg_get_functiondef('public.start_solo_run(text, text)'::regprocedure);
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_bosses_old constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing')$q$;
  v_bosses_new constant text := $q$b in ('dragon', 'blackDragon', 'hydra', 'sandWorm', 'ogreKing', 'basilisk', 'beholder')$q$;
  v_maps_old constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh')$q$;
  v_maps_new constant text := $q$p_map_id not in ('crypt', 'swamp', 'desert', 'marsh', 'cavern')$q$;
  v_finish_pairs constant text[][] := array[
    array[$q$when 'marsh' then 600 else 240 end;$q$, $q$when 'marsh' then 600 when 'cavern' then 600 else 240 end;$q$],
    array[$q$when 'marsh' then 1900 else 1200 end;$q$, $q$when 'marsh' then 1900 when 'cavern' then 3000 else 1200 end;$q$],
    array[$q$when 'marsh' then 240 else 90 end;$q$, $q$when 'marsh' then 240 when 'cavern' then 240 else 90 end;$q$]
  ];
  i int;
begin
  if position(v_bosses_new in v_record) = 0 then
    if position(v_bosses_old in v_record) = 0 then raise exception 'record_boss_runes: lista de bosses não encontrada'; end if;
    execute replace(v_record, v_bosses_old, v_bosses_new);
  end if;

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
