-- Runas: pedras mágicas que só caem dos bosses. Ficam em profile_items como os itens (ids "rune-…", slot gerado
-- "rune"), no cofre ou na bag, e o jogador equipa até 3 diferentes para a próxima hunt.
-- O catálogo e o limite repetem packages/shared/src/runes.ts (RUNES, RUNE_SLOTS); mude os dois juntos.
-- O mercado compra runas e não vende (buy_price null).

insert into public.market_items (item_id, buy_price, sell_price) values
  ('rune-fury', null, 120),
  ('rune-life', null, 120),
  ('rune-stone', null, 120),
  ('rune-wind', null, 120),
  ('rune-arcane', null, 120),
  ('rune-blood', null, 120),
  ('rune-time', null, 120),
  ('rune-troll', null, 120),
  ('rune-lightning', null, 220),
  ('rune-faith', null, 220),
  ('rune-meteor', null, 220),
  ('rune-dawn', null, 220);

-- Um item equipado por slot vale só para o equipamento: runas são até 3 (conferido no equip_item e no finish_run).
drop index public.profile_items_one_equipped_per_slot;
create unique index profile_items_one_equipped_per_slot
  on public.profile_items (profile_id, slot) where equipped and slot <> 'rune';
-- A mesma runa não entra duas vezes.
create unique index profile_items_one_equipped_rune
  on public.profile_items (profile_id, item_id) where equipped and slot = 'rune';

-- Runas equipadas de um jogador.
create function public.equipped_runes(p_profile_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.profile_items
  where profile_id = p_profile_id and equipped and slot = 'rune';
$$;

revoke execute on function public.equipped_runes(uuid) from public, anon, authenticated;
grant execute on function public.equipped_runes(uuid) to service_role;

-- Equipa um item do cofre (o que estava no slot volta para o cofre) ou tira do equipamento (precisa de espaço no cofre).
-- Runa: ocupa um dos 3 slots de runa livres e não pode repetir uma já equipada.
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

  if p_equipped and v_item.slot = 'rune' then
    if exists (select 1 from public.profile_items
               where profile_id = v_uid and equipped and item_id = v_item.item_id) then
      raise exception 'runa igual já equipada';
    end if;
    if public.equipped_runes(v_uid) >= 3 then raise exception 'slots de runa cheios'; end if;
  elsif p_equipped then
    update public.profile_items set equipped = false
    where profile_id = v_uid and slot = v_item.slot and equipped and id <> p_item;
  elsif public.vault_count(v_uid) >= 20 then
    raise exception 'cofre cheio';
  end if;
  update public.profile_items set equipped = p_equipped where id = p_item;
end;
$$;

-- Servidor de jogo: esvazia a bag de quem saiu vivo no cofre, mais valiosos primeiro (itens e runas); o que não
-- couber fica na bag para a próxima hunt.
create or replace function public.store_bag(p_profile_id uuid, p_bag text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free int;
  v_item text;
begin
  perform 1 from public.profiles where id = p_profile_id for update;
  v_free := greatest(20 - public.vault_count(p_profile_id), 0);
  for v_item in
    select i from unnest(p_bag) i
    join public.market_items m on m.item_id = i
    order by m.sell_price desc
  loop
    insert into public.profile_items (profile_id, item_id, source, location)
    values (p_profile_id, v_item, 'hunt', case when v_free > 0 then 'vault' else 'bag' end);
    v_free := v_free - 1;
  end loop;
end;
$$;

-- finish_run: as runas equipadas voltam equipadas como o equipamento. Se o jogador equipou outras no menu durante
-- a hunt e não sobrou slot (ou a mesma runa já está equipada), ela vai para o cofre (ou para a bag, com o cofre cheio).
create or replace function public.finish_run(
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
  v_item text;
  v_slot text;
  v_rest text[] := '{}';
begin
  insert into public.matches (id) values (p_match_id) on conflict (id) do nothing;

  insert into public.match_players (match_id, profile_id, class_id, outcome, level_reached, loot_value, gold_awarded)
  values (p_match_id, p_profile_id, p_class_id, p_outcome, p_level, greatest(p_loot, 0), v_gold);

  update public.profiles set gold = gold + v_gold where id = p_profile_id;
  perform 1 from public.profiles where id = p_profile_id for update;

  -- O equipamento que sobrou no corpo volta equipado. Se o jogador equipou outro item no mesmo slot
  -- pelo menu durante a hunt, o vestido vai para o cofre (ou para a bag, com o cofre cheio).
  foreach v_item in array p_items loop
    if not exists (select 1 from public.market_items m where m.item_id = v_item) then continue; end if;
    v_slot := split_part(v_item, '-', 1);
    if v_slot = 'rune' then
      if public.equipped_runes(p_profile_id) >= 3 or exists (
        select 1 from public.profile_items where profile_id = p_profile_id and equipped and item_id = v_item
      ) then
        v_rest := v_rest || v_item;
        continue;
      end if;
    elsif exists (select 1 from public.profile_items
                  where profile_id = p_profile_id and equipped and slot = v_slot) then
      v_rest := v_rest || v_item;
      continue;
    end if;
    insert into public.profile_items (profile_id, item_id, source, equipped) values (p_profile_id, v_item, 'hunt', true);
  end loop;
  perform public.store_bag(p_profile_id, v_rest);
  return v_gold;
end;
$$;
