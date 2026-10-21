/**
 * Gera as linhas do catálogo de itens para `market_items` (Supabase) a partir de `ITEMS` em `@kusa/shared`.
 * Use ao mudar o catálogo e cole o resultado numa migration nova (preço, nível, raridade e classes).
 * Uso: npx tsx apps/server/scripts/catalog-sql.ts
 */
import { ITEMS, buyPrice, sellPrice } from "@kusa/shared";

const rows = Object.values(ITEMS).map((def) => {
  const buy = buyPrice(def.id);
  const classes = def.classes ? `'{${def.classes.join(",")}}'` : "null";
  return `  ('${def.id}', ${buy ?? "null"}, ${sellPrice(def.id)}, ${def.tier}, '${def.rarity}', ${classes})`;
});
console.log("insert into public.market_items (item_id, buy_price, sell_price, tier, rarity, classes) values");
console.log(`${rows.join(",\n")}\non conflict (item_id) do update set buy_price = excluded.buy_price, sell_price = excluded.sell_price,\n  tier = excluded.tier, rarity = excluded.rarity, classes = excluded.classes;`);
