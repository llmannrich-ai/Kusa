/**
 * Teste de fumaça do alvo travado fora do alcance (bug do ⚔️ "parado"): um cavaleiro trava o monstro mais
 * longe do mapa, anda até o monstro comum mais próximo e segura o ataque. O golpe tem que ir no monstro
 * colado e matá-lo, e o alvo travado continua o mesmo.
 * Uso: npx tsx apps/server/scripts/alvo.ts [url]
 */
import { Client } from "@colyseus/sdk";
import {
  MONSTERS, MSG, ROOM_NAME, generateDungeon, tileDistance,
  type DamageMessage, type MonsterKind,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
let hits = 0;
room.onMessage(MSG.damage, (msg: DamageMessage) => { if (!msg.toPlayer && msg.attacker === room.sessionId) hits++; });
room.onMessage(MSG.notice, () => {});
room.onMessage(MSG.attack, () => {});
room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });

await wait(300);
room.send(MSG.start);
await wait(300);
if (room.state.phase !== "running") throw new Error(`fase esperada running, veio ${room.state.phase}`);

const dungeon = generateDungeon(room.state.seed);
const me = () => room.state.players.get(room.sessionId);

// Trava o monstro mais longe e escolhe o comum mais perto como vítima.
let far = "";
let near = "";
let farDist = -1;
let nearDist = Infinity;
room.state.monsters.forEach((m: any, id: string) => {
  // Escondido (Mímico disfarçado, Cubo camuflado) não pode ser travado.
  if (m.hidden) return;
  const dist = tileDistance(me().x, me().y, m.x, m.y);
  if (dist > farDist) { farDist = dist; far = id; }
});
room.state.monsters.forEach((m: any, id: string) => {
  if (id === far || MONSTERS[m.kind as MonsterKind].rank !== "common") return;
  const dist = tileDistance(me().x, me().y, m.x, m.y);
  if (dist < nearDist) { nearDist = dist; near = id; }
});
if (!far || !near) throw new Error("mapa sem monstros suficientes");
room.send(MSG.target, { id: far });
console.log(`travado ${far} a ${farDist} tiles; vítima ${near} a ${nearDist} tiles`);
await wait(200);
if (me().target !== far) throw new Error(`o alvo não travou: ${me().target}`);

let attacking = false;
const deadline = Date.now() + 60_000;
while (Date.now() < deadline && room.state.monsters.has(near)) {
  const p = me();
  if (p.status !== "playing") throw new Error(`jogador saiu da hunt: ${p.status}`);
  const m = room.state.monsters.get(near);
  if (tileDistance(p.x, p.y, m.x, m.y) <= 1) {
    if (!attacking) room.send(MSG.attacking, { on: true });
    attacking = true;
  } else {
    const blocked = new Set<number>();
    room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
    // O herói nasce colado no portal de fuga: pisar nele no caminho encerra a hunt.
    blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
    const step = nextStep(dungeon, p, m, 1, (x, y) => blocked.has(y * dungeon.width + x));
    if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
  }
  await wait(100);
}
room.send(MSG.attacking, { on: false });
await wait(200);

console.log(`golpes: ${hits}, alvo agora: ${me().target}`);
if (room.state.monsters.has(near)) throw new Error("timeout: com o alvo travado longe, o ataque não matou o monstro colado");
if (hits === 0) throw new Error("nenhum golpe saiu");
if (room.state.monsters.has(far) && me().target !== far) throw new Error(`o alvo travado mudou para ${me().target}`);
console.log("ALVO OK");
process.exit(0);

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
