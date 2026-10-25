/**
 * O Catálogo (Configurações > Catálogo) mostra o que cada monstro larga pelas contas de `dropOdds`
 * (packages/shared/src/drops.ts). Este teste confere que elas batem com a hunt de verdade, sem servidor
 * (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - o gold de cada monstro de cada mapa é a faixa que o Catálogo mostra;
 *   - matando o mesmo monstro muitas vezes, os itens e as poções que caem ficam perto da média esperada
 *     (comum, mini-boss e boss de cada mapa, e o Mímico com o baú dele);
 *   - a telemetria (`items.drops`) conta cada item de equipamento que caiu, pela fonte;
 *   - a ilusão da Bruxa Verde não larga nada.
 * Uso: npx tsx scripts/catalogo.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { ITEMS, MAPS, MAP_IDS, MONSTERS, chestPotionChance, dropOdds, isPotion, mapMonsters, type MapId, type MonsterKind } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

const KILLS = 800;

/** Mata `kind` ao lado do herói `n` vezes e conta os itens e as poções que caíram no chão. */
function farm(a: Arena, kind: MonsterKind, n: number) {
  let items = 0;
  let potions = 0;
  const drops = a.seat().stats.items.drops as Record<string, number>;
  const before = { ...drops };
  for (let i = 0; i < n; i++) {
    a.state.items.clear();
    const m = a.spawn(kind, 2);
    // O Mímico do mapa nasce no lugar de um baú e guarda o loot dele (`Hunt.mimicDepth`).
    if (kind === "mimic") a.any.mimicDepth.set(m.id, 0);
    a.any.killMonster(m, a.brain(m), HERO);
    for (const it of a.state.items.values()) {
      if (ITEMS[it.itemId]) items++;
      else if (isPotion(it.itemId)) potions++;
    }
  }
  a.state.items.clear();
  const counted = Object.keys(drops).reduce((sum, k) => sum + drops[k] - before[k], 0);
  check(counted === items, `${MONSTERS[kind].name}: caíram ${items} itens, a telemetria contou ${counted}`);
  if (kind === "mimic") check(drops.chest - before.chest === n, `o Mímico devia contar ${n} itens de baú: ${drops.chest - before.chest}`);
  return { items, potions };
}

/** A contagem cabe na média esperada, com folga de 5 desvios (o sorteio é de seed fixa: não falha por azar). */
function near(got: number, draws: number, chance: number, what: string) {
  const mean = draws * chance;
  const sigma = Math.sqrt(draws * chance * (1 - chance));
  check(Math.abs(got - mean) <= 5 * sigma + 1, `${what}: caíram ${got}, o Catálogo promete perto de ${mean.toFixed(0)}`);
}

for (const mapId of MAP_IDS as MapId[]) {
  const map = MAPS[mapId];
  const kinds = mapMonsters(map);
  if (kinds.length === 0) continue;

  // Gold: a faixa de cada monstro (o cérebro guarda a da hunt, já com os cortes do mapa).
  const a = arena({ mapId });
  for (const kind of kinds) {
    const odds = dropOdds(map, kind);
    if (odds.nothing) continue;
    const m = a.spawn(kind, 2);
    const loot = a.brain(m).loot as [number, number];
    check(loot.join() === odds.gold.join(), `${map.name}, ${MONSTERS[kind].name}: gold ${loot} na hunt, ${odds.gold} no Catálogo`);
    a.state.monsters.delete(m.id);
    a.any.brains.delete(m.id);
  }

  // Itens e poções: um monstro de cada rank do mapa (e o Mímico).
  const sample = (["common", "miniboss", "boss"] as const)
    .map((rank) => kinds.find((k) => MONSTERS[k].rank === rank && k !== "mimic" && !dropOdds(map, k).nothing))
    .filter((k): k is MonsterKind => !!k);
  if (kinds.includes("mimic")) sample.push("mimic");
  for (const kind of sample) {
    const odds = dropOdds(map, kind);
    const got = farm(a, kind, KILLS);
    const chestItems = odds.chest ? KILLS : 0;
    near(got.items - chestItems, KILLS * odds.items, odds.itemChance, `${map.name}, itens de ${MONSTERS[kind].name}`);
    const chestPotions = odds.chest ? 2 * KILLS * chestPotionChance(map) : 0;
    near(got.potions - chestPotions, KILLS * odds.potions, odds.potionChance, `${map.name}, poções de ${MONSTERS[kind].name}`);
  }
  console.log(`${map.name}: gold de ${kinds.length} monstros e drops de ${sample.map((k) => MONSTERS[k].name).join(", ")} OK`);
}

// Ilusão: some sem dar nada.
const swamp = arena({ mapId: "swamp" });
const odds = dropOdds(MAPS.swamp, "hagIllusion");
check(odds.nothing && odds.items === 0 && odds.potions === 0, "o Catálogo diz que a ilusão não larga nada");
const got = farm(swamp, "hagIllusion", 50);
check(got.items + got.potions === 0, `a ilusão largou ${got.items} itens e ${got.potions} poções`);
console.log("ilusão da Bruxa Verde: nada OK");

console.log("\nCATÁLOGO OK");
