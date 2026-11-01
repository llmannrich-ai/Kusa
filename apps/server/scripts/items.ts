/**
 * Teste dos itens, sem servidor: confere as regras da bag (`pickupAction`, com restrição de classe) e o catálogo de
 * itens; depois, na arena (`arena.ts`: relógio falso, sorteios de seed fixa), um cavaleiro mata comuns até algum dropar
 * um item que ele veste, anda por cima dele e confere que o item foi equipado sozinho (o slot estava vazio) e que a bag
 * só guardou o que ele não veste. Antes isso rodava numa hunt de verdade, e o cavaleiro de nível 1 morria por azar.
 * Uso: npx tsx apps/server/scripts/items.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  BAG_SIZE, ITEMS, SERVER_TICK_MS, canUse, describeStats, gearStats, itemId, pickupAction, rollItem,
  type ClassId, type ItemRarity, type ItemTier,
} from "@kusa/shared";
import { arena, check } from "./arena.ts";

// Regras da bag: slot vazio equipa, melhor troca (o antigo vai para a bag), pior vai para a bag,
// e com a bag cheia nada sai do chão (só um slot vazio ainda recebe). Item de outra classe nunca veste.
const sword = (tier: ItemTier, rarity: ItemRarity = "common") => itemId("weapon", "sword", tier, rarity);
const rules: [string, string, number, ClassId, string][] = [
  [sword(2), "", 0, "knight", "equip"],
  [sword(2), "", BAG_SIZE, "knight", "equip"],
  [sword(3), sword(2), 0, "knight", "swap"],
  [sword(3), sword(2), BAG_SIZE, "knight", "full"],
  [sword(1), sword(2), BAG_SIZE - 1, "knight", "bag"],
  [sword(2), sword(2), BAG_SIZE, "knight", "full"],
  // Raridade vale meio nível: o mágico do mesmo material é melhor; o raro não passa o comum do nível acima.
  [sword(2, "magic"), sword(2), 0, "knight", "swap"],
  [sword(2, "rare"), sword(3), 0, "knight", "bag"],
  // Espada não é do druida: vai para a bag mesmo com a mão vazia.
  [sword(5, "magic"), "", 0, "druid", "bag"],
  [sword(5, "magic"), "", BAG_SIZE, "druid", "full"],
];
for (const [item, equipped, bag, classId, expected] of rules) {
  const got = pickupAction(item, equipped, bag, classId);
  if (got !== expected) throw new Error(`pickupAction(${item}, "${equipped}", ${bag}, ${classId}) = ${got}, esperado ${expected}`);
}
console.log("regras da bag: ok");

// Catálogo: classes das armas, cajado e varinha com dano mágico, espada sem, raro e mágico mais fortes.
const expectClasses: Record<string, ClassId[]> = {
  "weapon-sword": ["knight"], "weapon-axe": ["knight"], "weapon-bow": ["paladin"], "weapon-crossbow": ["paladin"],
  "weapon-wand": ["sorcerer", "druid"], "weapon-staff": ["sorcerer", "druid"],
  // O paladino (arco e besta, as duas mãos) não usa escudo.
  "shield-shield": ["knight", "sorcerer", "druid"],
};
for (const [family, classes] of Object.entries(expectClasses)) {
  const id = `${family}-3-common`;
  for (const c of ["knight", "paladin", "sorcerer", "druid"] as ClassId[]) {
    if (canUse(id, c) !== classes.includes(c)) throw new Error(`${id}: canUse(${c}) errado`);
  }
}
if (!(ITEMS[itemId("weapon", "staff", 3)].stats.spellPower! > 0)) throw new Error("cajado sem dano nas magias");
if (!(ITEMS[itemId("weapon", "wand", 3)].stats.spellPower! > 0)) throw new Error("varinha sem dano nas magias");
if (ITEMS[sword(5)].stats.spellPower) throw new Error("espada não aumenta magias");
if (!(ITEMS[sword(3, "rare")].stats.damage! > ITEMS[sword(3)].stats.damage!)) throw new Error("raro não é mais forte");
if (describeStats(ITEMS[sword(3, "magic")].stats).length < 2) throw new Error("mágico sem propriedade");
for (const slot of ["legs", "boots"] as const) {
  if (!Object.values(ITEMS).some((d) => d.slot === slot)) throw new Error(`sem itens de ${slot}`);
}
const gear = gearStats([itemId("boots", "boots", 3), itemId("armor", "war", 3), itemId("weapon", "staff", 3)]);
if (!(gear.armor > 0 && gear.speed > 0 && gear.spellPower > 0)) throw new Error("gearStats não somou");
// O drop não olha a classe: em 500 sorteios cai item que o cavaleiro não usa.
let seed = 1;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const drops = Array.from({ length: 500 }, () => rollItem("boss", 6, random));
if (drops.some((id) => !ITEMS[id])) throw new Error(`drop inválido: ${drops.find((id) => !ITEMS[id])}`);
if (drops.every((id) => canUse(id, "knight"))) throw new Error("o drop filtrou pela classe: só caiu o que o cavaleiro usa");
console.log("catálogo de itens: ok");

// Na arena (sorteios de seed fixa): o cavaleiro mata zumbis até cair um equipamento que ele veste, passa por cima e o
// item vai para o slot vazio; a bag fica só com o que ele não veste (o drop não olha a classe).
const a = arena({ classId: "knight", startLevel: 1 });
const groundGear = () => [...a.state.items.values()].filter((it) => ITEMS[it.itemId] && canUse(it.itemId, "knight"));
let kills = 0;
while (groundGear().length === 0) {
  check(kills < 500, `nenhum equipamento caiu em ${kills} mortes (${a.where()})`);
  a.kill(a.place("zombie", 2, 0));
  kills++;
  a.advance(SERVER_TICK_MS);
}
const [ground] = groundGear();
const def = ITEMS[ground.itemId];
console.log(`${kills} mortes; caiu ${def.name} (${def.slot}) em ${ground.x},${ground.y}`);
check(a.p[def.slot] === "", `o slot ${def.slot} devia estar vazio`);
a.walkTo(ground);
a.until(() => a.p[def.slot] === def.id, 2000, `não vestiu ${def.id} ao passar por cima`);
check(!a.state.items.has(ground.id), "o item continua no chão depois de equipado");
check(!a.p.bag.some((id) => canUse(id, "knight")), `a bag só devia ter itens de outra classe: ${[...a.p.bag].join(", ")}`);
console.log(`equipado: ${a.p[def.slot]}`);
console.log("ITEMS OK");
