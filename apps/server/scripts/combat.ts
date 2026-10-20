/**
 * Teste de fumaça do combate contra um servidor rodando (npm run dev:server):
 * um cavaleiro entra sozinho, anda até o monstro comum mais próximo, seleciona como alvo
 * e o mata no auto-attack. Valida que o monstro sumiu, que houve dano e que o jogador ganhou XP e loot.
 * Uso: npx tsx apps/server/scripts/combat.ts [url]
 */
import { Client } from "@colyseus/sdk";
import { MONSTERS, MSG, ROOM_NAME, generateDungeon, tileDistance, type DamageMessage, type MonsterKind } from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight" });
let hits = 0;
room.onMessage(MSG.damage, (msg: DamageMessage) => { if (!msg.toPlayer) hits++; });
room.onMessage(MSG.notice, () => {});
room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });

await wait(300);
room.send(MSG.start);
await wait(300);
if (room.state.phase !== "running") throw new Error(`fase esperada running, veio ${room.state.phase}`);

const dungeon = generateDungeon(room.state.seed);
const me = () => room.state.players.get(room.sessionId);
const startMonsters = room.state.monsters.size;
console.log(`seed ${room.state.seed}: ${startMonsters} monstros, ${room.state.chests.size} baús`);

let targetId: string | null = null;
const deadline = Date.now() + 60_000;

while (Date.now() < deadline) {
  const p = me();
  if (p.status !== "playing") throw new Error(`jogador saiu da hunt: ${p.status}`);

  // Alvo já morreu? Terminou.
  if (targetId && !room.state.monsters.has(targetId)) break;

  if (!targetId) {
    let bestDist = Infinity;
    room.state.monsters.forEach((m: any, id: string) => {
      if (MONSTERS[m.kind as MonsterKind].rank !== "common") return;
      const dist = tileDistance(p.x, p.y, m.x, m.y);
      if (dist < bestDist) { bestDist = dist; targetId = id; }
    });
    if (!targetId) throw new Error("nenhum monstro comum no mapa");
    room.send(MSG.target, { id: targetId });
    console.log(`alvo ${targetId} a ${bestDist} tiles`);
  }

  const m = room.state.monsters.get(targetId);
  if (m && tileDistance(p.x, p.y, m.x, m.y) > 1) {
    const blocked = new Set<number>();
    room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
    const step = nextStep(dungeon, p, m, 1, (x, y) => blocked.has(y * dungeon.width + x));
    if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
  }
  await wait(100);
}

await wait(200);
const p = me();
console.log(`golpes: ${hits}, XP: ${p.xp}, loot: ${p.loot}, nível: ${p.level}, HP: ${p.hp}/${p.maxHp}`);
if (!targetId || room.state.monsters.has(targetId)) throw new Error("timeout: o monstro não morreu");
if (room.state.monsters.size !== startMonsters - 1) throw new Error("esperava exatamente um monstro a menos");
if (hits === 0) throw new Error("nenhum evento de dano recebido");
if (p.xp <= 0) throw new Error("matar o monstro não deu XP");
if (p.loot <= 0) throw new Error("matar o monstro não deu loot");
console.log("COMBAT OK");
process.exit(0);

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
