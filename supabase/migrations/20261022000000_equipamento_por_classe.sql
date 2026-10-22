-- Equipamento por classe: cada classe tem os próprios 6 slots no corpo. Um item equipado guarda a classe
-- que o veste (class_id); trocar de classe no menu mostra o equipamento dela. O mesmo item (a mesma linha)
-- só fica num corpo por vez: equipar em outra classe tira da anterior.

alter table public.profile_items
  add column class_id text check (class_id in ('knight', 'paladin', 'sorcerer', 'druid'));

-- O equipamento atual (que valia para todas as classes) fica com a última classe jogada, se ela usa o item;
-- senão, com a primeira classe que usa.
update public.profile_items pi
set class_id = case
    when m.classes is null or x.class_id = any (m.classes) then x.class_id
    else m.classes[1]
  end
from public.market_items m,
  (select p.id, coalesce((select mp.class_id from public.match_players mp where mp.profile_id = p.profile_id
                          order by mp.ended_at desc limit 1), 'knight') as class_id
   from public.profile_items p where p.equipped) x
where pi.equipped and x.id = pi.id and m.item_id = pi.item_id;

-- Item equipado sem classe que o use (não deveria existir): volta para o cofre.
update public.profile_items set equipped = false where equipped and class_id is null;
update public.profile_items set class_id = null where not equipped;

alter table public.profile_items
  add constraint profile_items_equipped_class check (equipped = (class_id is not null));

drop index if exists public.profile_items_one_equipped_per_slot;
create unique index profile_items_one_equipped_per_class_slot
  on public.profile_items (profile_id, class_id, slot) where equipped;

-- Equipa um item do cofre na classe (o que estava no slot dela volta para o cofre) ou tira do equipamento
-- (precisa de espaço no cofre). Um item equipado em outra classe passa para esta.
create function public.equip_item(p_item uuid, p_equipped boolean, p_class_id text)
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
    update public.profile_items set equipped = false, class_id = null
    where profile_id = v_uid and class_id = p_class_id and slot = v_item.slot and equipped and id <> p_item;
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

revoke execute on function public.equip_item(uuid, boolean, text) from public, anon;
grant execute on function public.equip_item(uuid, boolean, text) to authenticated;

-- Versão antiga (sem classe), para o cliente que ainda não atualizou: usa a classe que veste o item ou,
-- fora do equipamento, a última classe jogada que usa o item. Pode sair quando todo cliente mandar a classe.
create or replace function public.equip_item(p_item uuid, p_equipped boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_class text;
begin
  if v_uid is null then raise exception 'não autenticado'; end if;
  select coalesce(pi.class_id,
                  (select mp.class_id from public.match_players mp
                   where mp.profile_id = v_uid and (m.classes is null or mp.class_id = any (m.classes))
                   order by mp.ended_at desc limit 1),
                  coalesce(m.classes[1], 'knight'))
  into v_class
  from public.profile_items pi join public.market_items m on m.item_id = pi.item_id
  where pi.id = p_item and pi.profile_id = v_uid;
  if not found then raise exception 'item não está no inventário'; end if;
  perform public.equip_item(p_item, p_equipped, v_class);
end;
$$;

-- Servidor de jogo: a hunt começou, sai da conta o equipamento da classe escolhida.
create or replace function public.take_loadout(p_profile_id uuid, p_class_id text)
returns setof text
language sql
security definer
set search_path = ''
as $$
  delete from public.profile_items
  where profile_id = p_profile_id and equipped and class_id = p_class_id
  returning item_id;
$$;

-- O equipamento que sobrou no corpo volta equipado na classe da hunt. Se o jogador equipou outro item no
-- mesmo slot dessa classe pelo menu durante a hunt, o vestido vai para o cofre (ou para a bag, com o cofre cheio).
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
  v_rest text[] := '{}';
begin
  insert into public.matches (id) values (p_match_id) on conflict (id) do nothing;

  insert into public.match_players (match_id, profile_id, class_id, outcome, level_reached, loot_value, gold_awarded)
  values (p_match_id, p_profile_id, p_class_id, p_outcome, p_level, greatest(p_loot, 0), v_gold);

  update public.profiles set gold = gold + v_gold where id = p_profile_id;
  perform 1 from public.profiles where id = p_profile_id for update;

  foreach v_item in array p_items loop
    if not exists (select 1 from public.market_items m where m.item_id = v_item) then continue; end if;
    if p_class_id not in ('knight', 'paladin', 'sorcerer', 'druid')
       or exists (select 1 from public.profile_items
                  where profile_id = p_profile_id and equipped and class_id = p_class_id
                    and slot = split_part(v_item, '-', 1)) then
      v_rest := v_rest || v_item;
    else
      -- Slot ocupado por outra classe enquanto o índice antigo existir: vai para o cofre, sem derrubar o resultado.
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
