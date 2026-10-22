/**
 * Teste de fumaça das habilidades especiais (só mini-bosses e bosses) contra um servidor rodando.
 *
 * 1. Regras: mini-bosses e bosses têm uma habilidade forte; golpe forte tem recarga longa; controle não passa de
 *    2 s; `abilityTiles` dá áreas determinísticas, sem paredes e do tamanho certo (faixa e leque na direção do alvo,
 *    área em volta do alvo ou do monstro).
 * 2. Na hunt: um cavaleiro vai até o mini-boss mais próximo sem atacá-lo e espera o golpe especial, que sai
 *    sem aviso (`MSG.monsterStrike`) e tem que acertá-lo com `special`.
 * Uso (servidor com KUSA_START_LEVEL=8, para o cavaleiro aguentar apanhar parado):
 *   npx tsx apps/server/scripts/specials.ts <url>
 */
import { Client } from "@colyseus/sdk";
import {
  MAP_IDS, MONSTERS, MSG, ROOM_NAME, RULES_VERSION, abilityTiles, blocksSight, centerOf, generateDungeon, tileDistance,
  type DamageMessage, type MonsterKind, type MonsterStrikeMessage,
} from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

// --- 1. Regras -----------------------------------------------------------------

for (const mapId of MAP_IDS) {
  const d = generateDungeon(1234, mapId);
  const c = centerOf(d.boss);
  for (const kind of Object.keys(MONSTERS) as MonsterKind[]) {
    const { rank, abilities = [] } = MONSTERS[kind];
    // Mini-boss e boss: um golpe forte ou um controle (o Cubo engole).
    if (rank !== "common" && !abilities.some((a) => a.power > 1 || a.effect)) throw new Error(`${kind}: ${rank} sem habilidade forte`);
    const ids = new Set(abilities.map((a) => a.id));
    if (ids.size !== abilities.length) throw new Error(`${kind}: habilidades com id repetido`);
    for (const ability of abilities) {
      const name = `${kind}.${ability.id}`;
      if (ability.phase && ability.belowHp === undefined) throw new Error(`${name}: troca de fase sem vida da fase`);
      if ((ability.minRange ?? 0) > ability.range) throw new Error(`${name}: alcance mínimo maior que o máximo`);
      if (ability.power >= 2 && ability.cooldownMs < 6000) throw new Error(`${name}: golpe forte com recarga curta demais`);
      if (ability.effect && ["root", "stun", "engulf", "blind"].includes(ability.effect.kind) && ability.effect.ms > 2000) {
        throw new Error(`${name}: controle passa do teto de 2 s`);
      }
      if (["vanish", "summon", "dive", "pull", "bolt"].includes(ability.shape)) continue;
      const target = { x: c.x + Math.max(1, Math.min(2, ability.range)), y: c.y };
      const tiles = abilityTiles(d, ability, c.x, c.y, target.x, target.y);
      const again = abilityTiles(d, ability, c.x, c.y, target.x, target.y);
      if (JSON.stringify(tiles) !== JSON.stringify(again)) throw new Error(`${name}: área não determinística`);
      // Sem dano nem efeito (o salto do Orc, o Rejuvenescer): não tem área para conferir.
      if (ability.power === 0 && !ability.effect) continue;
      if (tiles.length === 0) throw new Error(`${name}: área vazia no centro da sala do boss (${mapId})`);
      if (tiles.some((t) => blocksSight(d, t.x, t.y))) throw new Error(`${name}: área atravessa parede`);
      if (tiles.some((t) => t.x === c.x && t.y === c.y)) throw new Error(`${name}: o monstro se acerta`);
      if (ability.shape === "line") {
        if (tiles.some((t) => t.x <= c.x || t.x > c.x + ability.length!)) throw new Error(`${name}: faixa fora da direção do alvo`);
        if (tiles.some((t) => Math.abs(t.y - c.y) > ability.radius)) throw new Error(`${name}: faixa larga demais`);
      } else if (ability.shape === "cone") {
        if (tiles.some((t) => t.x <= c.x)) throw new Error(`${name}: leque para trás`);
        if (tiles.some((t) => tileDistance(c.x, c.y, t.x, t.y) > ability.length!)) throw new Error(`${name}: leque longo demais`);
      } else {
        const cx = ability.shape === "self" ? c.x : target.x;
        if (tiles.some((t) => tileDistance(cx, c.y, t.x, t.y) > ability.radius)) throw new Error(`${name}: área maior que o raio`);
        if (ability.shape === "target" && !tiles.some((t) => t.x === target.x && t.y === target.y)) throw new Error(`${name}: área não pega o alvo`);
      }
    }
  }
}
console.log("regras das habilidades OK");

// --- 2. Na hunt ----------------------------------------------------------------

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);
// Cerca de 1,6% dos mapas da Cripta saem sem sala lateral (sem mini-boss): troca de sala até ter um.
let room: any;
for (let attempt = 1; ; attempt++) {
  room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
  await wait(300);
  const has = [...room.state.monsters.values()].some((m: any) => MONSTERS[m.kind as MonsterKind].rank === "miniboss");
  if (has || attempt === 5) break;
  console.log("mapa sem mini-boss: trocando de sala");
  await room.leave();
}

let strike: MonsterStrikeMessage | null = null;
const specialHits: DamageMessage[] = [];
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
  let bestDist = Infinity;
  room.state.monsters.forEach((m: any, id: string) => {
    if (MONSTERS[m.kind as MonsterKind].rank !== "miniboss") return;
    const dist = tileDistance(p.x, p.y, m.x, m.y);
    if (dist < bestDist) { bestDist = dist; targetId = id; }
  });
  if (!targetId) throw new Error("nenhum mini-boss no mapa");
  console.log(`alvo ${targetId} (${room.state.monsters.get(targetId).kind}) a ${bestDist} tiles`);
}
if (!MONSTERS.ogre.abilities?.length) throw new Error("tabela de monstros inesperada");

// Outros monstros que se juntarem apanham do cavaleiro (o mini-boss nunca), senão o bot morre no caminho.
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

// Anda até o mini-boss e fica colado nele até o golpe especial sair.
const deadline = Date.now() + 120_000;
while (!strike) {
  if (Date.now() > deadline) throw new Error("timeout: o mini-boss não usou a habilidade especial");
  const p = me();
  if (p.status !== "playing") throw new Error(`jogador saiu da hunt: ${p.status}`);
  const m = room.state.monsters.get(targetId!);
  if (!m) throw new Error("o mini-boss sumiu");
  if (tileDistance(p.x, p.y, m.x, m.y) > 1) {
    const blocked = new Set<number>();
    room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
    blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
    const step = nextStep(dungeon, p, m, 1, (x, y) => blocked.has(y * dungeon.width + x));
    if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
  }
  await wait(60);
}
await wait(250);
const s = strike as MonsterStrikeMessage;
console.log(`golpe: ${MONSTERS[s.kind].abilities!.find((a) => a.id === s.ability)!.name}, ${s.tiles.length / 2} tiles`);
if (s.tiles.length === 0) throw new Error("golpe especial sem área");
if (specialHits.length === 0) throw new Error("o golpe especial não acertou o cavaleiro colado no mini-boss");
console.log(`golpe especial acertou: -${specialHits[0].amount}`);

console.log("SPECIALS OK");
process.exit(0);

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
