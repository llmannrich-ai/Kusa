-- Cofre e bag. Cada item do jogador fica num de três lugares:
--   * equipado (equipped = true): o loadout da próxima hunt, um por slot, não conta no cofre;
--   * cofre (location = 'vault'): até 20 itens, só mexe pelo menu Itens;
--   * bag (location = 'bag'): até 8 itens, entra na hunt com o jogador e recebe o que ele pega no chão.
-- Ao fim da hunt, o equipamento que sobrou no corpo volta equipado. Quem sai vivo esvazia a bag no cofre
-- (melhores primeiro) e o que não couber fica na bag; quem morre perde a bag inteira (e 1 equipamento sorteado,
-- que o servidor de jogo já tira de p_items).
-- Os limites repetem VAULT_SIZE e BAG_SIZE de packages/shared/src/items.ts; mude os dois juntos.

alter table public.profile_items
  add column location text not null default 'vault' check (location in ('vault', 'bag')),
  add constraint profile_items_bag_not_equipped check (not (equipped and location = 'bag'));

create index profile_items_profile_location_idx on public.profile_items (profile_id, location);

-- Itens no cofre (fora do equipamento) de um jogador.
create function public.vault_count(p_profile_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.profile_items
  where profile_id = p_profile_id and location = 'vault' and not equipped;
$$;

revoke execute on function public.vault_count(uuid) from public, anon, authenticated;
grant execute on function public.vault_count(uuid) to service_role;

-- Mercado: o item comprado vai para o cofre, que precisa ter espaço.
create or replace function public.buy_item(p_item_id text)
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

  -- Trava o perfil: duas compras ao mesmo tempo não passam do limite do cofre.
  perform 1 from public.profiles where id = v_uid for update;
  if public.vault_count(v_uid) >= 20 then raise exception 'cofre cheio'; end if;

  update public.profiles set gold = gold - v_price where id = v_uid and gold >= v_price
  returning gold into v_gold;
  if not found then raise exception 'gold insuficiente'; end if;

  insert into public.profile_items (profile_id, item_id, source, location) values (v_uid, p_item_id, 'market', 'vault');
  return v_gold;
end;
$$;

-- Equipa um item do cofre (o que estava no slot volta para o cofre) ou tira do equipamento (precisa de espaço no cofre).
create or replace function public.equip_item(p_item uuid, p_equipped boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.profile_items;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  perform 1 from public.profiles where id = v_uid for update;
  select * into v_item from public.profile_items where id = p_item and profile_id = v_uid;
  if not found then raise exception 'item não está no inventário'; end if;
  if v_item.location = 'bag' then raise exception 'item está na bag'; end if;
  if v_item.equipped = p_equipped then return; end if;

  if p_equipped then
    update public.profile_items set equipped = false
    where profile_id = v_uid and slot = v_item.slot and equipped and id <> p_item;
  elsif public.vault_count(v_uid) >= 20 then
    raise exception 'cofre cheio';
  end if;
  update public.profile_items set equipped = p_equipped where id = p_item;
end;
$$;

-- Tira um item da bag e guarda no cofre.
create function public.store_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  perform 1 from public.profiles where id = v_uid for update;
  perform 1 from public.profile_items where id = p_item and profile_id = v_uid and location = 'bag';
  if not found then raise exception 'item não está na bag'; end if;
  if public.vault_count(v_uid) >= 20 then raise exception 'cofre cheio'; end if;
  update public.profile_items set location = 'vault' where id = p_item;
end;
$$;

revoke execute on function public.store_item(uuid) from public, anon;
grant execute on function public.store_item(uuid) to authenticated;

-- Servidor de jogo: a hunt começou, a bag entra na dungeon com o jogador (o equipamento sai pelo take_loadout).
create function public.take_bag(p_profile_id uuid)
returns setof text
language sql
security definer
set search_path = ''
as $$
  delete from public.profile_items where profile_id = p_profile_id and location = 'bag' returning item_id;
$$;

revoke execute on function public.take_bag(uuid) from public, anon, authenticated;
grant execute on function public.take_bag(uuid) to service_role;
