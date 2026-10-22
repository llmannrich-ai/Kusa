/**
 * Teste da hunt solo, sem servidor: a simulação (`Hunt`) roda sozinha, como no navegador.
 * - O loot máximo de cada mapa cabe em SOLO_LIMITS.maxLoot (o teto do banco em `finish_solo_run`).
 * - Um cavaleiro entra, recebe equipamento e bag, foge pelo portal e o resultado sai pelo host.
 * - Outro sai no meio da hunt e conta como morte.
 * Uso: npx tsx apps/server/scripts/solo.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { ITEMS, MAP_IDS, SOLO_LIMITS, type ItemSlot, type RunEndedMessage } from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState } from "../src/state.ts";

let clock = 0;
const timers: { at: number; fn: () => void }[] = [];
const results: RunEndedMessage[] = [];
const host: HuntHost = {
  now: () => clock,
  setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
  send: () => {},
  broadcast: () => {},
  runEnded: (_id, result) => void results.push(result),
  ended: () => {},
};

/** Avança o relógio da hunt em ticks de 50 ms, disparando os timers vencidos. */
function advance(hunt: Hunt, ms: number) {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    for (const timer of timers.filter((x) => x.at <= clock)) {
      timers.splice(timers.indexOf(timer), 1);
      timer.fn();
    }
    hunt.tick(50);
  }
}

for (const mapId of MAP_IDS) {
  let max = 0;
  for (let i = 0; i < 300; i++) {
    max = Math.max(max, new Hunt(new DungeonState(), host, { mapId, seed: Math.floor(Math.random() * 2 ** 31) }).maxLoot());
  }
  console.log(`${mapId}: loot máximo ${max} (teto do solo ${SOLO_LIMITS.maxLoot[mapId]})`);
  if (max > SOLO_LIMITS.maxLoot[mapId]) throw new Error(`SOLO_LIMITS.maxLoot.${mapId} abaixo do loot possível (${max})`);
}

// Foge pelo portal: o cavaleiro nasce na diagonal dele.
{
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId: "crypt", seed: 12345 });
  hunt.join("solo", { name: "Solo", classId: "knight", talents: {}, spellXp: {} });
  if (!hunt.start("solo")) throw new Error("a hunt solo não começou");
  // Itens comuns que o cavaleiro pode usar.
  const knightItem = (slot: ItemSlot, tier: number) => Object.values(ITEMS).find((d) =>
    d.slot === slot && d.tier === tier && d.rarity === "common" && (!d.classes || d.classes.includes("knight")))!.id;
  const weapon = knightItem("weapon", 2);
  const armor = knightItem("armor", 1);
  hunt.equip("solo", [weapon, knightItem("helmet", 1)]);
  hunt.fillBag("solo", [armor]);
  const p = state.players.get("solo")!;
  if (p.weapon !== weapon || p.bag.length !== 1) throw new Error(`equipamento/bag não entraram: ${p.weapon} ${[...p.bag]}`);
  advance(hunt, 500);
  hunt.move("solo", { dx: 1, dy: 1 });
  advance(hunt, 100);
  const result = results.pop();
  console.log("fuga:", result);
  if (result?.outcome !== "escaped") throw new Error(`esperava fuga, veio ${result?.outcome}`);
  if (!result.items.includes(weapon) || !result.bag.includes(armor)) throw new Error("equipamento ou bag não voltaram");
  if (state.phase !== "ended") throw new Error(`fase esperada ended, veio ${state.phase}`);
}

// Sair no meio conta como morte.
{
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId: "swamp", seed: 777 });
  hunt.join("solo", { name: "Solo", classId: "druid", talents: {}, spellXp: {} });
  hunt.start("solo");
  advance(hunt, 2000);
  hunt.leave("solo");
  const result = results.pop();
  console.log("abandono:", result);
  if (result?.outcome !== "died") throw new Error(`esperava morte, veio ${result?.outcome}`);
}

console.log("SOLO OK");
process.exit(0);
