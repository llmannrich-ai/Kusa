-- Economia: as hunts davam gold demais (uma ou duas bastavam para boa parte do Grimório).
-- O loot dos monstros e baús caiu no servidor (packages/shared/src/monsters.ts); aqui cai o preço
-- de venda dos itens, que era a maior fonte (o boss dropa 2 itens de Dragão). Repete ITEM_SELL_PRICES.
update public.market_items set sell_price = case split_part(item_id, '-', 2)
  when '1' then 10
  when '2' then 25
  when '3' then 60
  when '4' then 130
  when '5' then 300
end;
