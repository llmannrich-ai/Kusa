/**
 * Teste de fumaça das habilidades especiais dos monstros contra um servidor rodando (npm run dev:server).
 *
 * 1. Regras: todo monstro tem habilidade especial, e `specialTiles` dá áreas determinísticas, sem paredes e
 *    do tamanho certo (faixa reta na direção do alvo, área em volta do alvo ou do monstro).
 * 2. Na hunt: um cavaleiro encosta no monstro comum mais fraco sem atacar e espera a habilidade especial.
 *    O aviso (`MSG.monsterCast`) tem que cobrir o tile do cavaleiro e o golpe (`MSG.monsterStrike`) tem que
 *    acertar com `special`. Na seguinte, o cavaleiro sai da área durante o aviso e não pode apanhar do golpe.
 * Uso: npx tsx apps/server/scripts/specials.ts [url]
 */
import { Client } from "@colyseus/sdk";
import {
  MAP_IDS, MONSTERS, MSG, ROOM_NAME, RULES_VERSION, blocksSight, centerOf, generateDungeon, isWalkable, specialTiles, tileDistance,
  type DamageMessage, type MonsterCastMessage, type MonsterKind, type MonsterStrikeMessage,
} from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

// --- 1. Regras -----------------------------------------------------------------

for (const mapId of MAP_IDS) {
  const d = generateDungeon(1234, mapId);
  const c = centerOf(d.boss);
  for (const kind of Object.keys(MONSTERS) as MonsterKind[]) {
    const special = MONSTERS[kind].special;
    if (!special || special.power <= 1 || special.windupMs < 400) throw new Error(`${kind}: habilidade especial fraca ou sem aviso`);
    const target = { x: c.x + Math.min(2, special.range), y: c.y };
    const tiles = specialTiles(d, special, c.x, c.y, target.x, target.y);
    const again = specialTiles(d, special, c.x, c.y, target.x, target.y);
    if (JSON.stringify(tiles) !== JSON.stringify(again)) throw new Error(`${kind}: área não determinística`);
    if (tiles.length === 0) throw new Error(`${kind}: área vazia no centro da sala do boss (${mapId})`);
    if (tiles.some((t) => blocksSight(d, t.x, t.y))) throw new Error(`${kind}: área atravessa parede`);
    if (tiles.some((t) => t.x === c.x && t.y === c.y)) throw new Error(`${kind}: o monstro se acerta`);
    if (special.shape === "line") {
      if (tiles.some((t) => t.x <= c.x || t.x > c.x + special.length!)) throw new Error(`${kind}: faixa fora da direção do alvo`);
      if (tiles.some((t) => Math.abs(t.y - c.y) > special.radius)) throw new Error(`${kind}: faixa larga demais`);
    } else {
      const cx = special.shape === "self" ? c.x : target.x;
      if (tiles.some((t) => tileDistance(cx, c.y, t.x, t.y) > special.radius)) throw new Error(`${kind}: área maior que o raio`);
      if (special.shape === "target" && !tiles.some((t) => t.x === target.x && t.y === target.y)) throw new Error(`${kind}: área não pega o alvo`);
    }
  }
}
console.log("regras das habilidades especiais OK");

// --- 2. Na hunt ----------------------------------------------------------------

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);
const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });

let cast: MonsterCastMessage | null = null;
let strike: MonsterStrikeMessage | null = null;
const specialHits: DamageMessage[] = [];
room.onMessage(MSG.monsterCast, (msg: MonsterCastMessage) => { if (msg.id === targetId) cast = msg; });
room.onMessage(MSG.monsterStrike, (msg: MonsterStrikeMessage) => { if (msg.id === targetId) strike = msg; });
room.onMessage(MSG.damage, (msg: DamageMessage) => { if (msg.toPlayer && msg.special && msg.attacker === targetId) specialHits.push(msg); });
room.onMessage(MSG.notice, () => {});
room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });

await wait(300);
room.send(MSG.start);
await wait(300);
if (room.state.phase !== "running") throw new Error(`fase esperada running, veio ${room.state.phase}`);

const dungeon = generateDungeon(room.state.seed, room.state.mapId);
const me = () => room.state.players.get(room.sessionId);
let targetId: string | null = null;
{
  const p = me();
  // O cavaleiro de nível 1 fica parado apanhando: escolhe o monstro comum mais fraco (o mais próximo dele).
  let bestDist = Infinity;
  let weakest = Infinity;
  room.state.monsters.forEach((m: any) => {
    const def = MONSTERS[m.kind as MonsterKind];
    if (def.rank === "common") weakest = Math.min(weakest, def.damage);
  });
  room.state.monsters.forEach((m: any, id: string) => {
    const def = MONSTERS[m.kind as MonsterKind];
    if (def.rank !== "common" || def.damage !== weakest) return;
    const dist = tileDistance(p.x, p.y, m.x, m.y);
    if (dist < bestDist) { bestDist = dist; targetId = id; }
  });
  if (!targetId) throw new Error("nenhum monstro comum no mapa");
  console.log(`alvo ${targetId} (${room.state.monsters.get(targetId).kind}) a ${bestDist} tiles`);
}

// Outros monstros que se juntarem apanham do cavaleiro (o alvo do teste nunca), senão o bot morre parado.
let defending = false;
setInterval(() => {
  const p = me();
  if (!p || p.status !== "playing") return;
  let other: string | null = null;
  room.state.monsters.forEach((m: any, id: string) => {
    if (id !== targetId && !other && tileDistance(p.x, p.y, m.x, m.y) <= 1) other = id;
  });
  if (other) {
    room.send(MSG.target, { id: other });
    if (!defending) room.send(MSG.attacking, { on: true });
    defending = true;
  } else if (defending) {
    room.send(MSG.attacking, { on: false });
    room.send(MSG.target, { id: null });
    defending = false;
  }
}, 150);

/** Encosta no alvo até ele começar a habilidade especial. */
async function waitForCast() {
  cast = null;
  strike = null;
  const deadline = Date.now() + 40_000;
  while (!cast) {
    if (Date.now() > deadline) throw new Error("timeout: o monstro não usou a habilidade especial");
    const p = me();
    if (p.status !== "playing") throw new Error(`jogador saiu da hunt: ${p.status}`);
    const m = room.state.monsters.get(targetId!);
    if (!m) throw new Error("o alvo sumiu");
    if (tileDistance(p.x, p.y, m.x, m.y) > 1) {
      const blocked = new Set<number>();
      room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
      blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
      const step = nextStep(dungeon, p, m, 1, (x, y) => blocked.has(y * dungeon.width + x));
      if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
    }
    await wait(50);
  }
  return cast as MonsterCastMessage;
}

async function waitForStrike(ms: number) {
  const deadline = Date.now() + ms + 1500;
  while (!strike) {
    if (Date.now() > deadline) throw new Error("timeout: o golpe especial não saiu depois do aviso");
    await wait(30);
  }
  await wait(250);
}

const covers = (msg: MonsterCastMessage, x: number, y: number) => {
  for (let i = 0; i < msg.tiles.length; i += 2) if (msg.tiles[i] === x && msg.tiles[i + 1] === y) return true;
  return false;
};

// Primeira: fica parado e apanha. Se o jogador ainda andava quando o aviso saiu (um passo pode chegar
// depois do aviso), a área pode não cobrir onde ele parou: espera a próxima.
let p = me();
for (let round = 1; ; round++) {
  const first = await waitForCast();
  await wait(150);
  p = me();
  console.log(`aviso: ${MONSTERS[first.kind].special.name}, ${first.tiles.length / 2} tiles, ${first.ms} ms`);
  const inside = covers(first, p.x, p.y);
  await waitForStrike(first.ms);
  if (inside && specialHits.length > 0) break;
  if (inside) throw new Error("o golpe especial não acertou quem ficou na área");
  if (round === 3) throw new Error(`o aviso nunca cobriu o tile do jogador (${p.x},${p.y}): ${first.tiles.join(",")}`);
}
console.log(`golpe especial acertou: -${specialHits[0].amount}`);

// Segunda: sai da área durante o aviso.
const second = await waitForCast();
await wait(100);
p = me();
const occupied = new Set<string>();
room.state.monsters.forEach((o: any) => occupied.add(`${o.x},${o.y}`));
const escape = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  .map(([dx, dy]) => ({ dx, dy, x: p.x + dx, y: p.y + dy }))
  .find((t) => isWalkable(dungeon, t.x, t.y) && !occupied.has(`${t.x},${t.y}`) && !covers(second, t.x, t.y)
    && !(t.x === dungeon.portal.x && t.y === dungeon.portal.y)
    && (t.dx === 0 || t.dy === 0 || (isWalkable(dungeon, t.x, p.y) && isWalkable(dungeon, p.x, t.y))));
if (escape) {
  const before = specialHits.length;
  room.send(MSG.move, { dx: escape.dx, dy: escape.dy });
  await waitForStrike(second.ms);
  if (me().x !== escape.x || me().y !== escape.y) throw new Error("o passo para fora da área não saiu");
  if (specialHits.length !== before) throw new Error("apanhou do golpe especial mesmo fora da área avisada");
  console.log("esquivou do golpe especial");
} else {
  console.log("sem tile livre em volta para esquivar: pulando a esquiva");
}

console.log("SPECIALS OK");
process.exit(0);

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
