-- Runas, fase 1: 8 runas de magia novas (3 por classe, o Druida ganha as suas) que o mercado compra por 220,
-- como as de magia que já existiam. Os bônus da Runa do Vento (+12%) e do Troll (+2% de vida/s) mudam só no
-- packages/shared/src/runes.ts (o banco não guarda o efeito).
-- O catálogo repete RUNES; mude os dois juntos.

insert into public.market_items (item_id, buy_price, sell_price) values
  ('rune-charge', null, 220),
  ('rune-banner', null, 220),
  ('rune-roll', null, 220),
  ('rune-mark', null, 220),
  ('rune-mist', null, 220),
  ('rune-grove', null, 220),
  ('rune-wolf', null, 220),
  ('rune-plague', null, 220)
on conflict (item_id) do update set buy_price = excluded.buy_price, sell_price = excluded.sell_price;
