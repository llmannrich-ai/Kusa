/**
 * Teste da zona da entrada: em todo mapa e em várias seeds, a hunt começa com no máximo `MAX_START_MONSTERS`
 * monstros a até `START_ZONE_RADIUS` tiles do portal de fuga (a Cripta chegava a pôr 16 em cima da equipe).
 * Roda a `Hunt` direto, sem servidor.
 * Uso: npx tsx scripts/entrada.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MAP_IDS, createRng, tileDistance } from "@kusa/shared";
import { Hunt, MAX_START_MONSTERS, START_ZONE_RADIUS, type HuntHost } from "../src/hunt.ts";
import { DungeonState } from "../src/state.ts";

const SEEDS = 100;
const host: HuntHost = { now: () => 0, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} };

for (const mapId of MAP_IDS) {
  let worst = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const state = new DungeonState();
    const hunt = new Hunt(state, host, { mapId, seed, random: createRng(seed).next });
    hunt.join("h", { name: "Teste", classId: "druid", talents: {}, spellXp: {} });
    hunt.start("h");
    const portal = (hunt as any).dungeon.portal;
    const near = [...state.monsters.values()].filter((m) => tileDistance(m.x, m.y, portal.x, portal.y) <= START_ZONE_RADIUS);
    if (near.length > MAX_START_MONSTERS) {
      throw new Error(`${mapId} seed ${seed}: ${near.length} monstros perto da entrada (${near.map((m) => m.kind).join(", ")})`);
    }
    worst = Math.max(worst, near.length);
  }
  console.log(`  ${mapId}: no máximo ${worst} monstro(s) perto da entrada em ${SEEDS} seeds`);
}
console.log("ENTRADA OK");
process.exit(0);
