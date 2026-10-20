/**
 * Teste de fumaça dos itens contra um servidor rodando (npm run dev:server):
 * um cavaleiro mata monstros comuns até algum dropar um item, anda por cima dele
 * e confere que o item foi equipado automaticamente (o slot estava vazio).
 * Uso: npx tsx apps/server/scripts/items.ts [url]
 */
import { Client } from "@colyseus/sdk";
import { ITEMS, MONSTERS, MSG, ROOM_NAME, generateDungeon, tileDistance, type MonsterKind } from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight" });
room.onMessage(MSG.damage, () => {});
room.onMessage(MSG.notice, () => {});
room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });

await wait(300);
room.send(MSG.start);
await wait(300);
// Segura o ataque básico durante a fase de matar.
room.send(MSG.attacking, { on: true });

const dungeon = generateDungeon(room.state.seed);
const me = () => room.state.players.get(room.sessionId);
let kills = 0;
let targetId: string | null = null;
const deadline = Date.now() + 180_000;

// Fase 1: matar comuns até aparecer um item no chão.
while (room.state.items.size === 0) {
  if (Date.now() > deadline) throw new Error(`timeout: nenhum item caiu em ${kills} mortes`);
  const p = me();
  if (targetId && !room.state.monsters.has(targetId)) { kills++; targetId = null; }
  if (!targetId) {
    let bestDist = Infinity;
    room.state.monsters.forEach((m: any, id: string) => {
      if (MONSTERS[m.kind as MonsterKind].rank !== "common") return;
      const dist = tileDistance(p.x, p.y, m.x, m.y);
      if (dist < bestDist) { bestDist = dist; targetId = id; }
    });
    if (!targetId) throw new Error("acabaram os monstros comuns");
    room.send(MSG.target, { id: targetId });
  }
  const m = room.state.monsters.get(targetId);
  if (m) walkToward(m, 1);
  await wait(100);
}

const [ground] = [...room.state.items.values()] as any[];
const def = ITEMS[ground.itemId];
console.log(`${kills + 1} mortes; caiu ${def.name} (${def.slot}) em ${ground.x},${ground.y}`);

// Fase 2: andar até o item e conferir que foi equipado.
room.send(MSG.target, { id: null });
room.send(MSG.attacking, { on: false });
while (me()[def.slot] !== def.id) {
  if (Date.now() > deadline) throw new Error("timeout: não conseguiu pegar o item");
  walkToward(ground, 0);
  await wait(100);
}
if (room.state.items.has(ground.id)) throw new Error("o item continua no chão depois de equipado");
console.log(`equipado: ${me()[def.slot]}`);
console.log("ITEMS OK");
process.exit(0);

function walkToward(to: { x: number; y: number }, range: number) {
  const p = me();
  if (tileDistance(p.x, p.y, to.x, to.y) <= range) return;
  const blocked = new Set<number>();
  room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
  const step = nextStep(dungeon, p, to, range, (x, y) => blocked.has(y * dungeon.width + x));
  if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
