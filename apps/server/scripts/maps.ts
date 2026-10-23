/**
 * Teste dos mapas. Primeiro, sem servidor: para várias seeds, o gerador de cada mapa é determinístico
 * e todos os pontos importantes (salas, campinas, baús, boss) são alcançáveis a pé a partir do portal.
 * Depois, contra um servidor rodando: cada mapa cria a sala certa (monstros, tempo) e a fuga funciona,
 * e cliente de outra versão das regras (`RULES_VERSION`, o hash de `RULES_FILES`) é recusado; o gerador só depende
 * de arquivos dessa lista.
 * Uso: npx tsx apps/server/scripts/maps.ts [url]
 */
import { readFileSync } from "node:fs";
import { Client } from "@colyseus/sdk";
import {
  MAPS,
  mapMonsters,
  MAP_IDS,
  MSG,
  ROOM_NAME,
  RULES_FILES,
  VERSION_MISMATCH_CODE,
  caveDestination,
  centerOf,
  generateDungeon,
  isWalkable,
  type Dungeon,
  type MapId,
  type RunEndedMessage,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";

const SEEDS = 150;

for (const mapId of MAP_IDS) {
  for (let i = 1; i <= SEEDS; i++) {
    const seed = Math.imul(i, 2654435761) >>> 1;
    const d = generateDungeon(seed, mapId);
    const again = generateDungeon(seed, mapId);
    if (d.tiles.some((t, k) => again.tiles[k] !== t)) throw new Error(`${mapId}: seed ${seed} não é determinística`);
    const reach = reachable(d);
    const goals = [
      centerOf(d.boss), d.bossPortal, ...d.path.map(centerOf), ...d.meadows.map(centerOf),
      ...d.side.flatMap((r) => [centerOf(r), { x: r.x + 1, y: r.y + 1 }]),
      // Baús de runa da caverna: alcançáveis pelo tile da frente.
      ...(d.cave?.chests ?? []).map((c) => ({ x: c.x, y: c.y + 1 })),
    ];
    for (const g of goals) {
      if (!reach[g.y * d.width + g.x]) throw new Error(`${mapId}: seed ${seed}, ponto (${g.x}, ${g.y}) inalcançável`);
    }
  }
  console.log(`${MAPS[mapId].name}: ${SEEDS} seeds conectadas e determinísticas`);
}

// A versão das regras é o hash de RULES_FILES: o gerador não pode depender (em tempo de execução) de arquivo fora da
// lista, senão o mapa mudaria sem mudar a versão e cliente e servidor desenhariam mapas diferentes.
for (const file of ["dungeon.ts", "rng.ts"]) {
  const text = readFileSync(new URL(`../../../packages/shared/src/${file}`, import.meta.url), "utf8");
  for (const [, clause, dep] of text.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"\.\/([\w.]+)";/gm)) {
    if (clause) continue;
    if (!(RULES_FILES as readonly string[]).includes(dep)) throw new Error(`${file} importa ${dep}, que não está em RULES_FILES (rulesVersion.ts)`);
  }
}
console.log(`versão das regras ${RULES_VERSION}: o gerador só depende de ${RULES_FILES.join(", ")}`);

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);
for (const mapId of MAP_IDS) await playMap(mapId);
// Cliente sem versão (antigo) ou de outra versão: recusado, com a versão do servidor na mensagem.
for (const rulesVersion of [undefined, "00000000"]) {
  const err = await client.create<any>(ROOM_NAME, { name: "Velho", classId: "knight", rulesVersion }).then(
    (room) => { void room.leave(); return null; },
    (e: { code?: number; message: string }) => e,
  );
  if (err?.code !== VERSION_MISMATCH_CODE || !err.message.includes(`regras ${RULES_VERSION}`) || !err.message.includes("servidor v999")) {
    throw new Error(`versão ${rulesVersion} deveria ser recusada, veio ${err ? `${err.code} ${err.message}` : "entrada aceita"}`);
  }
}
console.log("versão diferente: recusada");
// Sem mapId: cai no mapa padrão.
const legacy = await client.create<any>(ROOM_NAME, { name: "Antigo", classId: "knight", rulesVersion: RULES_VERSION });
await wait(300);
if (legacy.state.mapId !== "crypt") throw new Error(`sala sem mapId deveria ser a cripta, veio ${legacy.state.mapId}`);
await legacy.leave();

console.log("MAPS OK");
process.exit(0);

async function playMap(mapId: MapId) {
  const map = MAPS[mapId];
  const room = await client.create<any>(ROOM_NAME, { name: "Lider", classId: "paladin", mapId, rulesVersion: RULES_VERSION });
  room.onMessage(MSG.damage, () => {});
  room.onMessage(MSG.notice, () => {});
  const ended = new Promise<RunEndedMessage>((resolve) => room.onMessage(MSG.runEnded, resolve));

  await wait(300);
  if (room.state.mapId !== mapId) throw new Error(`mapId esperado ${mapId}, veio ${room.state.mapId}`);
  const allowed = new Set<string>(mapMonsters(map));
  const kinds = new Set<string>();
  room.state.monsters.forEach((m: { kind: string }) => kinds.add(m.kind));
  for (const kind of kinds) if (!allowed.has(kind)) throw new Error(`${mapId}: monstro de outro mapa (${kind})`);
  // Mapa ainda em construção (sem boss na tabela): não nasce ninguém.
  if (map.bosses.length === 0 && kinds.size > 0) throw new Error(`${mapId}: mapa sem monstros com ${kinds.size} tipos de monstro`);
  if (map.bosses.length > 0 && !map.bosses.some(([boss]) => kinds.has(boss))) throw new Error(`${mapId}: sem boss`);

  room.send(MSG.start);
  await wait(300);
  if (room.state.timeLeft !== map.durationSeconds) {
    throw new Error(`${mapId}: tempo esperado ${map.durationSeconds}, veio ${room.state.timeLeft}`);
  }

  // O líder nasce na diagonal de cima à esquerda do portal.
  room.send(MSG.move, { dx: 1, dy: 1 });
  const result = await Promise.race([ended, wait(3000).then(() => { throw new Error(`${mapId}: timeout na fuga`); })]);
  if (result.outcome !== "escaped") throw new Error(`${mapId}: esperava fuga, veio ${result.outcome}`);
  console.log(`${map.name}: ${room.state.monsters.size} monstros, ${map.durationSeconds / 60} min, fuga ok`);
  await room.leave();
}

/** Tiles alcançáveis a partir do portal, andando como o servidor deixa (8 direções, sem cortar quina) e passando pela caverna. */
function reachable(d: Dungeon) {
  const seen = new Uint8Array(d.width * d.height);
  const start = d.portal.y * d.width + d.portal.x;
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const x = queue[head] % d.width;
    const y = Math.floor(queue[head] / d.width);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        const k = ny * d.width + nx;
        if ((!dx && !dy) || seen[k] || !isWalkable(d, nx, ny)) continue;
        if (dx && dy && (!isWalkable(d, nx, y) || !isWalkable(d, x, ny))) continue;
        seen[k] = 1;
        queue.push(k);
        // Caverna do deserto: pisar numa ponta leva à outra.
        const to = caveDestination(d, nx, ny);
        if (to && !seen[to.y * d.width + to.x]) {
          seen[to.y * d.width + to.x] = 1;
          queue.push(to.y * d.width + to.x);
        }
      }
    }
  }
  return seen;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
