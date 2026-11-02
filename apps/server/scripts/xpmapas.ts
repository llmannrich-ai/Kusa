/**
 * XP de cada mapa (`docs/GDD.md`, "Nível na hunt"): gera a hunt de verdade (várias seeds), soma a XP dos monstros que
 * nascem no mapa (o boss à parte) e calcula o nível com que um herói sozinho chega no boss limpando uma fração do
 * caminho. Campeões contam com a XP deles; monstros que as habilidades chamam não dão XP e ficam de fora.
 * Confere que, limpando 75% do mapa sozinho, nenhum herói chega no boss já no nível máximo: o nível 20 vem do boss ou
 * de limpar o mapa inteiro (`MapDef.xpScale` corta a XP dos mapas com muito monstro forte).
 * Uso (de dentro de apps/server, pelos decorators do schema):
 *   npx tsx scripts/xpmapas.ts           (confere)
 *   npx tsx scripts/xpmapas.ts --tabela  (só mostra a tabela de todos os mapas)
 */
import { MAPS, MAP_IDS, MAX_LEVEL, MONSTERS, levelForXp, xpForLevel, type MapId } from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState } from "../src/state.ts";
import { check } from "./arena.ts";

const SEEDS = [11, 4242, 90210];
/** Fração do mapa que a régua do GDD supõe limpa ("matando 75% do caminho"). */
const CLEAR = 0.75;
/**
 * Mapas fora da conta, de propósito: o Pântano do Kosaradius é o mapa de entrada (só 1 jogador, ~145 monstros fracos
 * e 10 min): limpando 75% chega no nível 20, mas na produção quem vence o Grumak chega em média no 12. Decidir o corte
 * dele com a telemetria de jogadores novos.
 */
const PENDING: MapId[] = ["marsh"];

function measure(mapId: MapId, seed: number) {
  const host: HuntHost = {
    now: () => 0, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {},
  };
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId, seed });
  hunt.join("h", { name: "Teste", classId: "knight", talents: {}, spellXp: {} });
  hunt.start("h");
  const brains = (hunt as any).brains as Map<string, { xp: number }>;
  let path = 0;
  let boss = 0;
  for (const [id, brain] of brains) {
    const m = state.monsters.get(id);
    if (!m) continue;
    if (MONSTERS[m.kind as keyof typeof MONSTERS].rank === "boss") boss += brain.xp;
    else path += brain.xp;
  }
  return { path, boss };
}

const rows = MAP_IDS.filter((id) => MAPS[id].bosses.length > 0 || MAPS[id].lairs?.length).map((id) => {
  const runs = SEEDS.map((seed) => measure(id, seed));
  const path = Math.round(runs.reduce((s, r) => s + r.path, 0) / runs.length);
  const boss = Math.round(runs.reduce((s, r) => s + r.boss, 0) / runs.length);
  return { id, path, boss, at75: levelForXp(path * CLEAR), full: levelForXp(path), after: levelForXp(path * CLEAR + boss) };
});

console.log(`XP do caminho (média de ${SEEDS.length} seeds), XP dos bosses e nível de um herói sozinho (nível 20 = ${xpForLevel(MAX_LEVEL)} XP):`);
console.log("mapa        xpScale  caminho  bosses  nível 75%  nível 100%  75% + boss");
for (const r of rows) {
  console.log(`${r.id.padEnd(11)} ${String(MAPS[r.id].xpScale ?? 1).padStart(7)}  ${String(r.path).padStart(7)}  ${String(r.boss).padStart(6)}  ${String(r.at75).padStart(9)}  ${String(r.full).padStart(10)}  ${String(r.after).padStart(10)}`);
}

if (!process.argv.includes("--tabela")) {
  for (const r of rows.filter((r) => !PENDING.includes(r.id))) check(r.at75 < MAX_LEVEL, `${r.id}: limpando 75% sozinho, chega no boss no nível ${r.at75} (abaixo do ${MAX_LEVEL})`);
  console.log("xpmapas OK");
}
process.exit(0);
