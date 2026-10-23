-- Runas por classe: com o equipamento separado por classe, cada classe tem os próprios 3 slots de runa
-- (RUNE_SLOTS em packages/shared/src/runes.ts). O índice de um item por slot da classe não vale para runas;
-- a mesma runa não entra duas vezes na mesma classe.

drop index if exists public.profile_items_one_equipped_per_class_slot;
create unique index profile_items_one_equipped_per_class_slot
  on public.profile_items (profile_id, class_id, slot) where equipped and slot <> 'rune';

drop index if exists public.profile_items_one_equipped_rune;
create unique index profile_items_one_equipped_rune
  on public.profile_items (profile_id, class_id, item_id) where equipped and slot = 'rune';

-- Runas equipadas numa classe.
create function public.equipped_runes(p_profile_id uuid, p_class_id text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.profile_items
  where profile_id = p_profile_id and equipped and slot = 'rune' and class_id = p_class_id;
$$;

revoke execute on function public.equipped_runes(uuid, text) from public, anon, authenticated;
grant execute on function public.equipped_runes(uuid, text) to service_role;

drop function if exists public.equipped_runes(uuid);

-- Equipa um item do cofre na classe (o que estava no slot dela volta para o cofre) ou tira do equipamento
-- (precisa de espaço no cofre). Um item equipado em outra classe passa para esta.
-- Runa: ocupa um dos 3 slots de runa livres da classe e não pode repetir uma já equipada nela.
create or replace function public.equip_item(p_item uuid, p_equipped boolean, p_class_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.profile_items;
  v_classes text[];
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  if p_class_id is null or p_class_id not in ('knight', 'paladin', 'sorcerer', 'druid') then
    raise exception 'classe inválida';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  select * into v_item from public.profile_items where id = p_item and profile_id = v_uid;
  if not found then raise exception 'item não está no inventário'; end if;
  if v_item.location = 'bag' then raise exception 'item está na bag'; end if;

  if p_equipped then
    if v_item.equipped and v_item.class_id = p_class_id then return; end if;
    select classes into v_classes from public.market_items where item_id = v_item.item_id;
    if v_classes is not null and not p_class_id = any (v_classes) then raise exception 'classe não usa este item'; end if;
    if v_item.slot = 'rune' then
      if exists (select 1 from public.profile_items
                 where profile_id = v_uid and equipped and class_id = p_class_id and item_id = v_item.item_id) then
        raise exception 'runa igual já equipada';
      end if;
      if public.equipped_runes(v_uid, p_class_id) >= 3 then raise exception 'slots de runa cheios'; end if;
    else
      update public.profile_items set equipped = false, class_id = null
      where profile_id = v_uid and class_id = p_class_id and slot = v_item.slot and equipped and id <> p_item;
    end if;
    -- Só dispara se o índice antigo (um item por slot na conta) ainda existir.
    begin
      update public.profile_items set equipped = true, class_id = p_class_id where id = p_item;
    exception when unique_violation then
      raise exception 'slot ocupado por outra classe';
    end;
  else
    if not v_item.equipped then return; end if;
    if public.vault_count(v_uid) >= 20 then raise exception 'cofre cheio'; end if;
    update public.profile_items set equipped = false, class_id = null where id = p_item;
  end if;
end;
$$;

-- O equipamento que sobrou no corpo volta equipado na classe da hunt. Se o jogador equipou outro item no
-- mesmo slot dessa classe pelo menu durante a hunt (ou, numa runa, não sobrou slot de runa ou a mesma já está
-- equipada), o vestido vai para o cofre (ou para a bag, com o cofre cheio).
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

  foreach v_item in array p_items loop
    if not exists (select 1 from public.market_items m where m.item_id = v_item) then continue; end if;
    v_slot := split_part(v_item, '-', 1);
    if p_class_id not in ('knight', 'paladin', 'sorcerer', 'druid')
       or (v_slot = 'rune' and (public.equipped_runes(p_profile_id, p_class_id) >= 3 or exists (
             select 1 from public.profile_items
             where profile_id = p_profile_id and equipped and class_id = p_class_id and item_id = v_item)))
       or (v_slot <> 'rune' and exists (
             select 1 from public.profile_items
             where profile_id = p_profile_id and equipped and class_id = p_class_id and slot = v_slot)) then
      v_rest := v_rest || v_item;
    else
      -- Slot ocupado por outra classe enquanto o índice antigo (um por slot na conta) existir: vai para o cofre.
      begin
        insert into public.profile_items (profile_id, item_id, source, equipped, class_id)
        values (p_profile_id, v_item, 'hunt', true, p_class_id);
      exception when unique_violation then
        v_rest := v_rest || v_item;
      end;
    end if;
  end loop;
  perform public.store_bag(p_profile_id, v_rest);
  return v_gold;
end;
$$;
