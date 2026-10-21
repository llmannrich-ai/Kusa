/**
 * Teste de fumaça da bag contra um servidor rodando (npm run dev:server): um cavaleiro mata comuns até
 * cair um item, veste ao passar por cima, guarda na bag, veste de novo pela bag, larga no chão (e não
 * pega de volta enquanto está em cima), pega de novo ao voltar ao tile e foge levando o item na bag
 * (que vai para o cofre de quem tem conta).
 * Uso: npx tsx apps/server/scripts/bag.ts [url]
 */
import { Client } from "@colyseus/sdk";
import { BAG_SIZE, ITEMS, MONSTERS, MSG, ROOM_NAME, RULES_VERSION, generateDungeon, tileDistance, type MonsterKind } from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

/** O bot de nível 1 avança sem descansar e morre em cerca de metade das hunts: aí recomeça numa sala nova. */
class Died extends Error {}
const ATTEMPTS = 8;

let room: any;
let dungeon: ReturnType<typeof generateDungeon>;
let ended: any = null;
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
console.log("BAG OK");
process.exit(0);

/** Uma tentativa completa: caça até cair um item e passa por todas as ações da bag. */
async function run() {
  ended = null;
  room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
  room.onMessage(MSG.damage, () => {});
  room.onMessage(MSG.notice, () => {});
  room.onMessage(MSG.runEnded, (msg: any) => { ended = msg; });
  await wait(300);
  room.send(MSG.start);
  await wait(300);
  dungeon = generateDungeon(room.state.seed);

  // Fase 1: matar comuns (segurando o ataque) até aparecer um item no chão.
  room.send(MSG.attacking, { on: true });
  let kills = 0;
  let targetId: string | null = null;
  const deadline = Date.now() + 180_000;
  while (groundGear().length === 0) {
    if (ended) throw new Died();
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
  room.send(MSG.target, { id: null });
  room.send(MSG.attacking, { on: false });
  const bag = () => [...me().bag] as string[];

  // 1. Passar por cima veste (o slot estava vazio).
  await until("vestir o item do chão", () => { walkToward(ground, 0); return me()[def.slot] === def.id; });
  const spot = { x: me().x, y: me().y };

  // 2. Guardar na bag e vestir de novo pela bag.
  room.send(MSG.unequip, { slot: def.slot });
  await until("guardar na bag", () => me()[def.slot] === "" && bag().includes(def.id));
  room.send(MSG.bagEquip, { index: bag().indexOf(def.id) });
  await until("vestir pela bag", () => me()[def.slot] === def.id && !bag().includes(def.id));

  // 3. Largar no chão: fica lá enquanto o cavaleiro continua em cima.
  room.send(MSG.unequip, { slot: def.slot });
  await until("guardar para largar", () => bag().includes(def.id));
  room.send(MSG.bagDrop, { index: bag().indexOf(def.id) });
  const onSpot = () => groundGear().some((it) => it.x === spot.x && it.y === spot.y && it.itemId === def.id);
  await until("largar no chão", onSpot);
  await wait(600);
  if (bag().includes(def.id) || me()[def.slot] === def.id) throw new Error("pegou de volta o item que acabou de largar");
  console.log(`largado em ${spot.x},${spot.y}; bag ${bag().length}/${BAG_SIZE}`);

  // 4. Sai do tile e volta: pega de novo.
  await until("sair do tile", () => {
    if (me().x !== spot.x || me().y !== spot.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) room.send(MSG.move, { dx, dy });
    return false;
  });
  // Um monstro pode parar em cima do item para atacar: mata antes de voltar ao tile.
  await until("pegar de novo", () => {
    let blocker: string | null = null;
    room.state.monsters.forEach((m: any, id: string) => { if (m.x === spot.x && m.y === spot.y) blocker = id; });
    room.send(MSG.target, { id: blocker });
    room.send(MSG.attacking, { on: blocker !== null });
    if (!blocker) walkToward(spot, 0);
    return me()[def.slot] === def.id;
  }, 60_000);
  room.send(MSG.attacking, { on: false });

  // 5. Guarda na bag e foge: o item da bag volta no resultado.
  room.send(MSG.unequip, { slot: def.slot });
  await until("guardar antes de fugir", () => bag().includes(def.id));
  // Na volta, segue atacando o que estiver ao alcance (sem alvo travado, o servidor escolhe o mais próximo).
  room.send(MSG.target, { id: null });
  room.send(MSG.attacking, { on: true });
  await until("fugir pelo portal", () => { if (!ended) walkToward(dungeon.portal, 0); return ended !== null; }, 120_000);
  if (ended.outcome === "died") throw new Died();
  if (ended.outcome !== "escaped") throw new Error(`esperava fuga, veio ${ended.outcome}`);
  if (!ended.bag.includes(def.id)) throw new Error(`o item da bag não voltou: ${JSON.stringify(ended)}`);
  console.log(`fugiu levando na bag: ${ended.bag.join(", ")}`);
}

async function until(what: string, check: () => boolean, ms = 30_000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (ended) throw new Died();
    if (Date.now() > end) throw new Error(`timeout ao ${what}`);
    await wait(100);
  }
}

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
