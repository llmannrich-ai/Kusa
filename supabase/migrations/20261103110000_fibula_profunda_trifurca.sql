-- A Fíbula Profunda vira a trifurcação da campanha (packages/shared/src/world.ts: `UNLOCKED_BY` e `UNLOCK_BOSS`; mude
-- os dois juntos). Cada covil abre um lado, só com o boss dele:
--   - oeste, Rei Ossudo: a Cripta (que, por ora, não abre mais nada);
--   - norte, Colosso Cantante: o Mar de Areia (antes aberto pelo Dragão da Cripta);
--   - leste, Dragão Verde Jovem (no lugar do Faraó Eterno): o Bosque Velho (antes aberto pelo Basilisco da Travessia).
-- Quem já tinha o Mar de Areia ou o Bosque Velho aberto pelo caminho antigo continua com ele: o boss do lado novo fica
-- anotado como vencido para esse personagem (`profile_boss_clears`). Nenhuma classe abre com esses bosses
-- (`CLASS_UNLOCK` só usa Vorgak), então a anotação não abre mais nada.

create or replace function public.map_unlocked_by(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'marsh' then 'grove'
    when 'fibula' then 'marsh'
    when 'fibula2' then 'fibula'
    when 'crypt' then 'fibula2'
    when 'desert' then 'fibula2'
    when 'oldwood' then 'fibula2'
    when 'swamp' then 'desert'
    when 'cavern' then 'swamp'
    when 'dunes' then 'cavern'
    when 'mesas' then 'dunes'
    when 'fortress' then 'mesas'
    when 'heartwood' then 'oldwood'
    when 'bog' then 'fortress'
    when 'badlands' then 'fortress'
    else null
  end;
$$;

create or replace function public.map_unlocked_by_boss(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'crypt' then 'boneKing'
    when 'desert' then 'singingColossus'
    when 'oldwood' then 'greenDragon'
    when 'dunes' then 'beholder'
    else null
  end;
$$;

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'grove' then array['dragon']
    when 'fibula' then array['boneKing']
    when 'fibula2' then array['boneKing', 'singingColossus', 'greenDragon']
    when 'crypt' then array['dragon']
    when 'swamp' then array['bullywugKing', 'hydra', 'blackDragon']
    when 'desert' then array['sandWorm']
    when 'marsh' then array['ogreKing']
    when 'cavern' then array['basilisk', 'beholder']
    when 'dunes' then array['singingColossus']
    when 'mesas' then array['eternalPharaoh']
    when 'fortress' then array['emberWarlord', 'ogreKing']
    when 'oldwood' then array['greenDragon']
    when 'heartwood' then array['erlking']
    when 'bog' then array['morgrana']
    when 'badlands' then array['kragmor']
    else '{}'::text[]
  end;
$$;

-- Ninguém perde mapa aberto: quem venceu a Cripta (o Mar de Areia estava aberto) fica com o Colosso Cantante anotado,
-- e quem venceu o Basilisco (o Bosque Velho estava aberto), com o Dragão Verde Jovem.
insert into public.profile_boss_clears (profile_id, class_id, boss_kind)
select c.profile_id, c.class_id, 'singingColossus'
from public.profile_map_clears c
where c.map_id = 'crypt'
on conflict do nothing;

insert into public.profile_boss_clears (profile_id, class_id, boss_kind)
select b.profile_id, b.class_id, 'greenDragon'
from public.profile_boss_clears b
where b.boss_kind = 'basilisk'
on conflict do nothing;
