/**
 * Teste de fumaça dos itens contra um servidor rodando (npm run dev:server):
 * um cavaleiro mata monstros comuns até algum dropar um item, anda por cima dele
 * e confere que o item foi equipado automaticamente (o slot estava vazio) e que a bag continuou vazia.
 * Antes, confere as regras da bag (`pickupAction`) sem servidor.
 * Uso: npx tsx apps/server/scripts/items.ts [url]
 */
import { Client } from "@colyseus/sdk";
import { BAG_SIZE, ITEMS, MONSTERS, MSG, ROOM_NAME, RULES_VERSION, generateDungeon, pickupAction, tileDistance, type MonsterKind } from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

// Regras da bag: slot vazio equipa, melhor troca (o antigo vai para a bag), pior vai para a bag,
// e com a bag cheia nada sai do chão (só um slot vazio ainda recebe).
const rules: [string, string, number, string][] = [
  ["weapon-2", "", 0, "equip"],
  ["weapon-2", "", BAG_SIZE, "equip"],
  ["weapon-3", "weapon-2", 0, "swap"],
  ["weapon-3", "weapon-2", BAG_SIZE, "full"],
  ["weapon-1", "weapon-2", BAG_SIZE - 1, "bag"],
  ["weapon-2", "weapon-2", BAG_SIZE, "full"],
];
for (const [item, equipped, bag, expected] of rules) {
  const got = pickupAction(item, equipped, bag);
  if (got !== expected) throw new Error(`pickupAction(${item}, "${equipped}", ${bag}) = ${got}, esperado ${expected}`);
}
console.log("regras da bag: ok");

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

/** O bot de nível 1 avança sem descansar e morre em cerca de metade das hunts: aí recomeça numa sala nova. */
class Died extends Error {}
const ATTEMPTS = 8;

let room: any;
let dungeon: ReturnType<typeof generateDungeon>;
let died = false;
const me = () => room.state.players.get(room.sessionId);
// Poções também caem no chão: aqui só interessa equipamento.
const groundGear = () => ([...room.state.items.values()] as any[]).filter((it) => ITEMS[it.itemId]);

for (let attempt = 1; ; attempt++) {
  try {
    await run();
    break;
  } catch (e) {
    if (!(e instanceof Died) || attempt === ATTEMPTS) throw e;
    console.log(`tentativa ${attempt}: o cavaleiro morreu caçando; recomeçando`);
    await room.leave();
  }
}
console.log("ITEMS OK");
process.exit(0);

/** Uma tentativa completa: caça até cair um equipamento, anda até ele e confere que foi equipado. */
async function run() {
  room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
  died = false;
  room.onMessage(MSG.damage, () => {});
  room.onMessage(MSG.notice, () => {});
  room.onMessage(MSG.attack, () => {});
  room.onMessage(MSG.runEnded, (msg: any) => {
    if (msg.outcome === "died") died = true;
    else throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`);
  });

  await wait(300);
  room.send(MSG.start);
  await wait(300);
  // Segura o ataque básico durante a fase de matar.
  room.send(MSG.attacking, { on: true });

  dungeon = generateDungeon(room.state.seed);
  let kills = 0;
  let targetId: string | null = null;
  const deadline = Date.now() + 180_000;

  // Fase 1: matar comuns até aparecer um item no chão.
  while (groundGear().length === 0) {
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

  const [ground] = groundGear();
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
  if (me().bag.length !== 0) throw new Error(`a bag devia estar vazia: ${[...me().bag].join(", ")}`);
  console.log(`equipado: ${me()[def.slot]}`);
}

function walkToward(to: { x: number; y: number }, range: number) {
  const p = me();
  if (tileDistance(p.x, p.y, to.x, to.y) <= range) return;
  const blocked = new Set<number>();
  room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
  // O herói nasce colado no portal de fuga: pisar nele no caminho encerra a hunt.
  blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
  const step = nextStep(dungeon, p, to, range, (x, y) => blocked.has(y * dungeon.width + x));
  if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
}

async function wait(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
  if (died) throw new Died();
}
