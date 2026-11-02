-- Lendários das armas de estilo (packages/shared/src/items.ts, `LEGENDARIES`): um por arma nova, cada um
-- fortalecendo magias da classe dela (Sino do Juízo Final, Lança do Último Raio, Orbe do Vazio Faminto, Foice da
-- Colheita Venenosa e Totem da Mãe-Fera). As linhas saem de `npx tsx apps/server/scripts/catalog-sql.ts`.

insert into public.market_items (item_id, buy_price, sell_price, tier, rarity, classes) values
  ('weapon-mace-5-legendary-doombell', null, 2400, 5, 'legendary', '{knight}'),
  ('weapon-spear-5-legendary-lastray', null, 2400, 5, 'legendary', '{paladin}'),
  ('weapon-orb-5-legendary-voidmaw', null, 2400, 5, 'legendary', '{sorcerer}'),
  ('weapon-scythe-5-legendary-venomharvest', null, 2400, 5, 'legendary', '{druid}'),
  ('weapon-totem-5-legendary-motherbeast', null, 2400, 5, 'legendary', '{shaman}')
on conflict (item_id) do update set buy_price = excluded.buy_price, sell_price = excluded.sell_price,
  tier = excluded.tier, rarity = excluded.rarity, classes = excluded.classes;
