-- Fortaleza Orc ('fortress') ganha monstros: o clã do Pântano do Kosaradius bem mais forte e em bandos que lotam as
-- salas (dificuldade 8). O boss é Grumak, o Rei-Ogro (`MAPS.fortress.bosses` no packages/shared).
--   - `map_bosses('fortress')`: o Rei-Ogro (vitória e runa da hunt; a runa dele continua uma vez por personagem).
--   - Hunt solo e sala no aparelho (`SOLO_LIMITS`, mude os dois juntos): teto de loot 4200 (era 100, mapa sem
--     monstros) e cheio em 240 s (era 180), como as Mesas de Solária.
-- Parte da versão em produção (20261031120000_rei_bullywug.sql e 20261031210000_fortaleza_orc.sql).

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then array['dragon']
    when 'swamp' then array['bullywugKing', 'hydra', 'blackDragon']
    when 'desert' then array['sandWorm']
    when 'marsh' then array['ogreKing']
    when 'cavern' then array['basilisk', 'beholder']
    when 'dunes' then array['singingColossus']
    when 'mesas' then array['eternalPharaoh']
    when 'fortress' then array['ogreKing']
    else '{}'::text[]
  end;
$$;

do $$
declare
  v_finish text := pg_get_functiondef('public.finish_solo_run(uuid, text, int, int, text[], text[], jsonb)'::regprocedure);
  v_pairs constant text[][] := array[
    array[$q$when 'fortress' then 100 else 1200 end;$q$, $q$when 'fortress' then 4200 else 1200 end;$q$],
    array[$q$when 'fortress' then 180 else 90 end;$q$, $q$when 'fortress' then 240 else 90 end;$q$]
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
