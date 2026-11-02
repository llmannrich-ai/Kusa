-- Itens lendários (packages/shared/src/items.ts, `LEGENDARIES`): peças únicas de Dragão, mais fortes que o mágico,
-- com várias propriedades e, nas de classe, magias específicas mais fortes. Só caem na hunt (sem compra); vendem por
-- 2.400 (Dragão ×8). O id segue slot-família-nível-raridade e ganha a chave da peça no fim
-- (ex.: weapon-staff-5-legendary-frost), então `split_part(id, '-', 1)` continua sendo o slot e o 4º pedaço a raridade.
--   - `market_items.rarity` aceita 'legendary';
--   - o catálogo abaixo sai de `npx tsx apps/server/scripts/catalog-sql.ts` (só as linhas lendárias);
--   - `drop_random_item`: o lendário pesa 0,12 no sorteio da perda na morte, como `DEATH_LOSS_WEIGHT`
--     (packages/shared/src/maps.ts) e `Hunt.lostSlot`.

alter table public.market_items drop constraint market_items_rarity_check;
alter table public.market_items
  add constraint market_items_rarity_check check (rarity in ('common', 'rare', 'magic', 'legendary'));

insert into public.market_items (item_id, buy_price, sell_price, tier, rarity, classes) values
  ('weapon-sword-5-legendary-eclipse', null, 2400, 5, 'legendary', '{knight}'),
  ('weapon-axe-5-legendary-lastwinter', null, 2400, 5, 'legendary', '{knight}'),
  ('armor-war-5-legendary-ironheart', null, 2400, 5, 'legendary', '{knight,paladin}'),
  ('helmet-war-5-legendary-vigil', null, 2400, 5, 'legendary', '{knight,paladin}'),
  ('legs-war-5-legendary-stonegiant', null, 2400, 5, 'legendary', '{knight,paladin}'),
  ('weapon-bow-5-legendary-dawn', null, 2400, 5, 'legendary', '{paladin}'),
  ('weapon-crossbow-5-legendary-clockwork', null, 2400, 5, 'legendary', '{paladin}'),
  ('weapon-wand-5-legendary-phoenix', null, 2400, 5, 'legendary', '{sorcerer}'),
  ('weapon-staff-5-legendary-frost', null, 2400, 5, 'legendary', '{sorcerer}'),
  ('helmet-arcane-5-legendary-stormeye', null, 2400, 5, 'legendary', '{sorcerer}'),
  ('weapon-staff-5-legendary-dreamoak', null, 2400, 5, 'legendary', '{druid}'),
  ('armor-arcane-5-legendary-thousandwings', null, 2400, 5, 'legendary', '{druid}'),
  ('weapon-staff-5-legendary-redtotem', null, 2400, 5, 'legendary', '{shaman}'),
  ('helmet-arcane-5-legendary-warchief', null, 2400, 5, 'legendary', '{shaman}'),
  ('boots-boots-5-legendary-nobody', null, 2400, 5, 'legendary', null),
  ('shield-shield-5-legendary-moonmirror', null, 2400, 5, 'legendary', '{knight,sorcerer,druid,shaman}'),
  ('legs-arcane-5-legendary-astral', null, 2400, 5, 'legendary', '{sorcerer,druid,shaman}')
on conflict (item_id) do update set buy_price = excluded.buy_price, sell_price = excluded.sell_price,
  tier = excluded.tier, rarity = excluded.rarity, classes = excluded.classes;

create or replace function public.drop_random_item(p_items text[])
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  v_idx int[] := '{}';
  v_weight numeric[] := '{}';
  v_total numeric := 0;
  v_roll numeric;
  v_w numeric;
  v_i int;
begin
  for v_i in select i from generate_subscripts(coalesce(p_items, '{}'), 1) i loop
    continue when split_part(p_items[v_i], '-', 1) = 'rune';
    v_w := case split_part(p_items[v_i], '-', 4) when 'legendary' then 0.12 when 'magic' then 0.25 when 'rare' then 0.5 else 1 end;
    v_idx := v_idx || v_i;
    v_weight := v_weight || v_w;
    v_total := v_total + v_w;
  end loop;
  if coalesce(array_length(v_idx, 1), 0) = 0 then return p_items; end if;
  v_roll := random() * v_total;
  for v_i in 1 .. array_length(v_idx, 1) loop
    v_roll := v_roll - v_weight[v_i];
    if v_roll < 0 or v_i = array_length(v_idx, 1) then
      return p_items[:v_idx[v_i] - 1] || p_items[v_idx[v_i] + 1:];
    end if;
  end loop;
  return p_items;
end;
$$;

revoke execute on function public.drop_random_item(text[]) from public, anon, authenticated;
