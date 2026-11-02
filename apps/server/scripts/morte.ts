/**
 * Teste da perda de equipamento na morte, na arena (`arena.ts`: sem servidor, relógio falso, sorteios de seed fixa):
 *   - abaixo de `DEATH_SAFE_LEVEL` o corpo não perde equipamento, só a bag;
 *   - a partir dele perde 1 equipamento, sorteado com peso pela raridade (`DEATH_LOSS_WEIGHT`): com um item de cada
 *     raridade no corpo, o mágico sai bem menos que o comum.
 * Uso: npx tsx apps/server/scripts/morte.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { DEATH_LOSS_WEIGHT, DEATH_SAFE_LEVEL, type RunEndedMessage } from "@kusa/shared";
import { arena, check } from "./arena.ts";

const GEAR = { weapon: "weapon-axe-5-magic", helmet: "helmet-war-4-rare", armor: "armor-war-5-common", legs: "legs-war-5-common" };

function die(startLevel: number, seed: number): RunEndedMessage {
  const a = arena({ classId: "knight", startLevel, seed });
  const p = a.p as any;
  for (const [slot, id] of Object.entries(GEAR)) p[slot] = id;
  a.p.bag.push("boots-boots-2-common");
  return a.end("died");
}

// 1. Morte no começo (nível 1 e o último nível protegido): fica com todo o equipamento, perde a bag.
for (const level of [1, DEATH_SAFE_LEVEL - 1]) {
  const r = die(level, 7);
  check(r.lost === undefined, `nível ${level}: perdeu ${r.lost} do corpo`);
  for (const id of Object.values(GEAR)) check(r.items.includes(id), `nível ${level}: ${id} não voltou (${JSON.stringify(r.items)})`);
  check(r.lostBag.includes("boots-boots-2-common") && r.bag.length === 0, `nível ${level}: a bag não se perdeu`);
}
console.log(`até o nível ${DEATH_SAFE_LEVEL - 1}: equipamento intacto, bag perdida`);

// 2. A partir do nível protegido: perde 1 equipamento, com peso pela raridade.
const counts: Record<string, number> = {};
const TRIES = 400;
for (let seed = 1; seed <= TRIES; seed++) {
  const r = die(DEATH_SAFE_LEVEL, seed);
  check(!!r.lost && Object.values(GEAR).includes(r.lost), `seed ${seed}: devia perder 1 equipamento, perdeu ${r.lost}`);
  check(!r.items.includes(r.lost!), `seed ${seed}: ${r.lost} saiu e voltou`);
  counts[r.lost!] = (counts[r.lost!] ?? 0) + 1;
}
const share = (id: string) => (counts[id] ?? 0) / TRIES;
const total = 2 * DEATH_LOSS_WEIGHT.common + DEATH_LOSS_WEIGHT.rare + DEATH_LOSS_WEIGHT.magic;
const expectMagic = DEATH_LOSS_WEIGHT.magic / total;
const commonEach = (share(GEAR.armor) + share(GEAR.legs)) / 2;
console.log(`nível ${DEATH_SAFE_LEVEL}, ${TRIES} mortes: mágico ${(100 * share(GEAR.weapon)).toFixed(1)}% (esperado ${(100 * expectMagic).toFixed(1)}%), `
  + `raro ${(100 * share(GEAR.helmet)).toFixed(1)}%, cada comum ${(100 * commonEach).toFixed(1)}%`);
check(Math.abs(share(GEAR.weapon) - expectMagic) < 0.05, "o mágico não saiu com o peso dele");
check(share(GEAR.weapon) < share(GEAR.helmet) && share(GEAR.helmet) < commonEach, "a raridade não pesou no sorteio");
console.log("morte: ok");
