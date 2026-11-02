-- Fíbula 2 (docs/TERRENO_DE_CACA_PLANO.md): caverna aberta com o acampamento no centro e três covis, um por ala.
--   - Bosses do mapa (`map_bosses`): Rei Ossudo (oeste), Colosso Cantante (norte) e Faraó Eterno (leste). Qualquer um
--     vence o cenário; a Cripta abre só com o Rei Ossudo (`map_unlocked_by_boss('crypt')`, `UNLOCK_BOSS` do
--     packages/shared/src/world.ts: mude os dois juntos).
--   - Mapa descoberto guardado na conta, por personagem (`profile_map_memory`): o minimapa da Fíbula lembra o que o
--     jogador já viu em hunts anteriores. `layout` é o hash da planta (mudou a planta, a memória não vale) e `explored`
--     um bitset dos tiles em base64 (até 32 KB). O jogador lê as próprias linhas e grava por `save_map_memory`.

create or replace function public.map_bosses(p_map_id text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'grove' then array['dragon']
    when 'fibula' then array['boneKing', 'singingColossus', 'eternalPharaoh']
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

create or replace function public.map_unlocked_by_boss(p_map_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_map_id
    when 'dunes' then 'beholder'
    when 'oldwood' then 'basilisk'
    when 'crypt' then 'boneKing'
    else null
  end;
$$;

-- Quem já venceu a Fíbula (o Rei Ossudo da planta anterior, antes dos três covis) fica com o boss anotado: a Cripta
-- continua aberta para essas contas.
insert into public.profile_boss_clears (profile_id, class_id, boss_kind)
select c.profile_id, c.class_id, 'boneKing'
from public.profile_map_clears c
where c.map_id = 'fibula'
on conflict do nothing;

create table public.profile_map_memory (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null check (class_id in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman')),
  map_id text not null check (map_id in ('fibula')),
  layout text not null,
  explored text not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, class_id, map_id)
);

alter table public.profile_map_memory enable row level security;
create policy "jogador vê o próprio mapa descoberto"
  on public.profile_map_memory for select to authenticated
  using ((select auth.uid()) = profile_id);

-- Grava o mapa descoberto do personagem (o cliente já mesclou o que leu com o que viu nesta hunt).
create or replace function public.save_map_memory(p_class_id text, p_map_id text, p_layout text, p_explored text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if p_class_id not in ('knight', 'paladin', 'sorcerer', 'druid', 'shaman') then raise exception 'classe inválida'; end if;
  if p_map_id not in ('fibula') then raise exception 'mapa sem memória'; end if;
  if p_layout is null or length(p_layout) > 32 or p_layout !~ '^[0-9a-f]+$' then raise exception 'planta inválida'; end if;
  if p_explored is null or length(p_explored) > 32768 or p_explored !~ '^[A-Za-z0-9+/=]*$' then raise exception 'mapa inválido'; end if;
  insert into public.profile_map_memory (profile_id, class_id, map_id, layout, explored, updated_at)
  values (v_uid, p_class_id, p_map_id, p_layout, p_explored, now())
  on conflict (profile_id, class_id, map_id) do update
    set layout = excluded.layout, explored = excluded.explored, updated_at = now();
end;
$$;

revoke execute on function public.save_map_memory(text, text, text, text) from public, anon;
grant execute on function public.save_map_memory(text, text, text, text) to authenticated;
