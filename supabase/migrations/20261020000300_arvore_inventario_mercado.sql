-- Menu do jogador: árvore de magias por classe, inventário de itens e mercado.
-- O catálogo repete packages/shared/src/talents.ts e items.ts; mude os dois juntos.
-- Como sempre, o navegador só lê: compras, vendas e equipar passam por funções security definer,
-- e só o servidor de jogo (service role) tira o loadout do inventário e devolve os itens extraídos.

-- Árvore de magias -----------------------------------------------------------

create table public.talents (
  id text primary key,
  class_id text not null check (class_id in ('knight', 'paladin', 'sorcerer', 'druid')),
  max_rank int not null check (max_rank > 0),
  base_cost int not null check (base_cost > 0),
  -- custo do nível n+1 = base_cost * cost_growth^n
  cost_growth numeric not null default 1 check (cost_growth >= 1),
  requires_id text references public.talents (id),
  requires_rank int not null default 0 check (requires_rank >= 0)
);

alter table public.talents enable row level security;
create policy "catálogo da árvore é público"
  on public.talents for select to anon, authenticated using (true);
create index talents_requires_id_idx on public.talents (requires_id);

create table public.profile_talents (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  talent_id text not null references public.talents (id),
  rank int not null check (rank > 0),
  primary key (profile_id, talent_id)
);

alter table public.profile_talents enable row level security;
create policy "jogador vê a própria árvore"
  on public.profile_talents for select to authenticated
  using ((select auth.uid()) = profile_id);
create index profile_talents_talent_id_idx on public.profile_talents (talent_id);

-- Compra o próximo nível de um nó da árvore. Devolve o gold que sobrou.
create function public.buy_talent(p_talent_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_talent public.talents;
  v_current int;
  v_required int;
  v_cost bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;

  select * into v_talent from public.talents where id = p_talent_id;
  if not found then raise exception 'magia inexistente'; end if;

  -- Trava o perfil: duas compras ao mesmo tempo não gastam o mesmo gold.
  perform 1 from public.profiles where id = v_uid for update;

  select rank into v_current from public.profile_talents
  where profile_id = v_uid and talent_id = p_talent_id;
  v_current := coalesce(v_current, 0);
  if v_current >= v_talent.max_rank then raise exception 'já está no nível máximo'; end if;

  if v_talent.requires_id is not null then
    select rank into v_required from public.profile_talents
    where profile_id = v_uid and talent_id = v_talent.requires_id;
    if coalesce(v_required, 0) < v_talent.requires_rank then raise exception 'pré-requisito não comprado'; end if;
  end if;

  v_cost := ceil(v_talent.base_cost * power(v_talent.cost_growth, v_current));

  update public.profiles set gold = gold - v_cost where id = v_uid and gold >= v_cost
  returning gold into v_gold;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_talents (profile_id, talent_id, rank)
  values (v_uid, p_talent_id, v_current + 1)
  on conflict (profile_id, talent_id) do update set rank = excluded.rank;

  return v_gold;
end;
$$;

revoke execute on function public.buy_talent(text) from public, anon;
grant execute on function public.buy_talent(text) to authenticated;

-- Itens e mercado ------------------------------------------------------------

create table public.market_items (
  item_id text primary key,
  -- null = o mercado não vende (itens de Dragão só saem das hunts)
  buy_price int check (buy_price > 0),
  sell_price int not null check (sell_price >= 0)
);

alter table public.market_items enable row level security;
create policy "preços do mercado são públicos"
  on public.market_items for select to anon, authenticated using (true);

create table public.profile_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.market_items (item_id),
  -- "weapon-3" → "weapon": um item equipado por slot
  slot text generated always as (split_part(item_id, '-', 1)) stored,
  equipped boolean not null default false,
  source text not null check (source in ('hunt', 'market')),
  acquired_at timestamptz not null default now()
);

alter table public.profile_items enable row level security;
create policy "jogador vê o próprio inventário"
  on public.profile_items for select to authenticated
  using ((select auth.uid()) = profile_id);
create index profile_items_profile_id_idx on public.profile_items (profile_id);
create index profile_items_item_id_idx on public.profile_items (item_id);
create unique index profile_items_one_equipped_per_slot
  on public.profile_items (profile_id, slot) where equipped;

-- Compra um item no mercado. Devolve o gold que sobrou.
create function public.buy_item(p_item_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select buy_price into v_price from public.market_items where item_id = p_item_id;
  if v_price is null then raise exception 'item fora de venda'; end if;

  update public.profiles set gold = gold - v_price where id = v_uid and gold >= v_price
  returning gold into v_gold;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_items (profile_id, item_id, source) values (v_uid, p_item_id, 'market');
  return v_gold;
end;
$$;

revoke execute on function public.buy_item(text) from public, anon;
grant execute on function public.buy_item(text) to authenticated;

-- Vende um item do inventário ao mercado. Devolve o gold novo.
create function public.sell_item(p_item uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item_id text;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  delete from public.profile_items where id = p_item and profile_id = v_uid returning item_id into v_item_id;
  if not found then raise exception 'item não está no inventário'; end if;

  update public.profiles p set gold = p.gold + m.sell_price
  from public.market_items m
  where p.id = v_uid and m.item_id = v_item_id
  returning p.gold into v_gold;
  return v_gold;
end;
$$;

revoke execute on function public.sell_item(uuid) from public, anon;
grant execute on function public.sell_item(uuid) to authenticated;

-- Equipa (ou desequipa) um item do inventário para levar na próxima hunt.
create function public.equip_item(p_item uuid, p_equipped boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_slot text;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select slot into v_slot from public.profile_items where id = p_item and profile_id = v_uid;
  if not found then raise exception 'item não está no inventário'; end if;

  if p_equipped then
    update public.profile_items set equipped = false
    where profile_id = v_uid and slot = v_slot and equipped and id <> p_item;
  end if;
  update public.profile_items set equipped = p_equipped where id = p_item;
end;
$$;

revoke execute on function public.equip_item(uuid, boolean) from public, anon;
grant execute on function public.equip_item(uuid, boolean) to authenticated;

-- Servidor de jogo: a hunt começou, o equipamento escolhido sai do inventário e entra na dungeon.
-- Quem morre perde; quem sai vivo devolve pelo finish_run.
create function public.take_loadout(p_profile_id uuid)
returns setof text
language sql
security definer
set search_path = ''
as $$
  delete from public.profile_items where profile_id = p_profile_id and equipped returning item_id;
$$;

revoke execute on function public.take_loadout(uuid) from public, anon, authenticated;
grant execute on function public.take_loadout(uuid) to service_role;

-- finish_run passa a receber os itens equipados ao sair: quem sai vivo leva para o inventário.
drop function public.finish_run(uuid, uuid, text, text, int, int);

create function public.finish_run(
  p_match_id uuid,
  p_profile_id uuid,
  p_class_id text,
  p_outcome text,
  p_level int,
  p_loot int,
  p_items text[] default '{}'
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_survived boolean := p_outcome in ('escaped', 'completed');
  v_gold int := case when v_survived then greatest(p_loot, 0) else 0 end;
begin
  insert into public.matches (id) values (p_match_id) on conflict (id) do nothing;

  insert into public.match_players (match_id, profile_id, class_id, outcome, level_reached, loot_value, gold_awarded)
  values (p_match_id, p_profile_id, p_class_id, p_outcome, p_level, greatest(p_loot, 0), v_gold);

  update public.profiles set gold = gold + v_gold where id = p_profile_id;

  if v_survived then
    insert into public.profile_items (profile_id, item_id, source)
    select p_profile_id, i, 'hunt' from unnest(p_items) i
    where exists (select 1 from public.market_items m where m.item_id = i);
  end if;
  return v_gold;
end;
$$;

revoke execute on function public.finish_run(uuid, uuid, text, text, int, int, text[]) from public, anon, authenticated;
grant execute on function public.finish_run(uuid, uuid, text, text, int, int, text[]) to service_role;

-- Catálogo -------------------------------------------------------------------

insert into public.talents (id, class_id, max_rank, base_cost, cost_growth, requires_id, requires_rank) values
  ('knight_damage', 'knight', 3, 120, 1.8, null, 0),
  ('knight_hp', 'knight', 3, 120, 1.8, null, 0),
  ('knight_crushing_blow', 'knight', 1, 400, 1, 'knight_damage', 1),
  ('knight_mana', 'knight', 3, 150, 1.8, 'knight_hp', 1),
  ('knight_iron_skin', 'knight', 1, 900, 1, 'knight_crushing_blow', 1),
  ('knight_speed', 'knight', 2, 300, 1.8, 'knight_mana', 1),
  ('paladin_damage', 'paladin', 3, 120, 1.8, null, 0),
  ('paladin_hp', 'paladin', 3, 120, 1.8, null, 0),
  ('paladin_piercing_shot', 'paladin', 1, 400, 1, 'paladin_damage', 1),
  ('paladin_mana', 'paladin', 3, 150, 1.8, 'paladin_hp', 1),
  ('paladin_healing_light', 'paladin', 1, 900, 1, 'paladin_piercing_shot', 1),
  ('paladin_speed', 'paladin', 2, 300, 1.8, 'paladin_mana', 1),
  ('sorcerer_damage', 'sorcerer', 3, 120, 1.8, null, 0),
  ('sorcerer_hp', 'sorcerer', 3, 120, 1.8, null, 0),
  ('sorcerer_lightning_bolt', 'sorcerer', 1, 400, 1, 'sorcerer_damage', 1),
  ('sorcerer_mana', 'sorcerer', 3, 150, 1.8, 'sorcerer_hp', 1),
  ('sorcerer_frost_nova', 'sorcerer', 1, 900, 1, 'sorcerer_lightning_bolt', 1),
  ('sorcerer_speed', 'sorcerer', 2, 300, 1.8, 'sorcerer_mana', 1),
  ('druid_damage', 'druid', 3, 120, 1.8, null, 0),
  ('druid_hp', 'druid', 3, 120, 1.8, null, 0),
  ('druid_venom_thorn', 'druid', 1, 400, 1, 'druid_damage', 1),
  ('druid_mana', 'druid', 3, 150, 1.8, 'druid_hp', 1),
  ('druid_nature_wrath', 'druid', 1, 900, 1, 'druid_venom_thorn', 1),
  ('druid_speed', 'druid', 2, 300, 1.8, 'druid_mana', 1);

insert into public.market_items (item_id, buy_price, sell_price) values
  ('weapon-1', 60, 20),
  ('weapon-2', 150, 60),
  ('weapon-3', 350, 140),
  ('weapon-4', 800, 320),
  ('weapon-5', null, 900),
  ('helmet-1', 60, 20),
  ('helmet-2', 150, 60),
  ('helmet-3', 350, 140),
  ('helmet-4', 800, 320),
  ('helmet-5', null, 900),
  ('armor-1', 60, 20),
  ('armor-2', 150, 60),
  ('armor-3', 350, 140),
  ('armor-4', 800, 320),
  ('armor-5', null, 900),
  ('shield-1', 60, 20),
  ('shield-2', 150, 60),
  ('shield-3', 350, 140),
  ('shield-4', 800, 320),
  ('shield-5', null, 900);
