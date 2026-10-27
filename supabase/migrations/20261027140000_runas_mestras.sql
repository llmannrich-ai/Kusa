-- Runas Mestras (fase 2a do catálogo de runas): 8 runas que mudam o jeito de jogar e cobram um preço. Entre as 3 runas
-- equipadas de uma classe, só uma pode ser Mestra (MASTER_RUNE_SLOTS em packages/shared/src/runes.ts; o servidor de
-- jogo também confere com activeRunes). O mercado compra por 400 e não vende.
-- O catálogo repete RUNES; mude os dois juntos.

alter table public.market_items add column if not exists rune_master boolean not null default false;

insert into public.market_items (item_id, buy_price, sell_price, rune_master) values
  ('rune-phoenix', null, 400, true),
  ('rune-glass', null, 400, true),
  ('rune-colossus', null, 400, true),
  ('rune-echo', null, 400, true),
  ('rune-reaper', null, 400, true),
  ('rune-regicide', null, 400, true),
  ('rune-pact', null, 400, true),
  ('rune-vengeance', null, 400, true)
on conflict (item_id) do update set buy_price = excluded.buy_price, sell_price = excluded.sell_price,
  rune_master = excluded.rune_master;

-- Igual à versão anterior (equipamento_por_classe / runas_por_classe), mais a regra de uma Mestra por classe.
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
  v_master boolean;
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
    select classes, rune_master into v_classes, v_master from public.market_items where item_id = v_item.item_id;
    if v_classes is not null and not p_class_id = any (v_classes) then raise exception 'classe não usa este item'; end if;
    if v_item.slot = 'rune' then
      if exists (select 1 from public.profile_items
                 where profile_id = v_uid and equipped and class_id = p_class_id and item_id = v_item.item_id) then
        raise exception 'runa igual já equipada';
      end if;
      if public.equipped_runes(v_uid, p_class_id) >= 3 then raise exception 'slots de runa cheios'; end if;
      if v_master and exists (select 1 from public.profile_items pi join public.market_items m on m.item_id = pi.item_id
                              where pi.profile_id = v_uid and pi.equipped and pi.class_id = p_class_id and m.rune_master) then
        raise exception 'já há uma runa mestra equipada';
      end if;
    else
      update public.profile_items set equipped = false, class_id = null
      where profile_id = v_uid and class_id = p_class_id and slot = v_item.slot and equipped and id <> p_item;
    end if;
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
