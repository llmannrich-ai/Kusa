/**
 * Teste de fumaça das poções contra um servidor rodando (npm run dev:server):
 * um cavaleiro mata monstros comuns até guardar uma poção de vida (a até 1 tile ela é pega sozinha, mesmo no meio da
 * luta; mais longe, ele vai buscar) e confere que saiu do chão. Depois de apanhar um pouco, bebe: a poção sai da mochila, a vida sobe e a
 * recarga compartilhada começa (beber de novo logo em seguida não gasta outra).
 * Uso: npx tsx apps/server/scripts/potions.ts [url]
 */
import { Client } from "@colyseus/sdk";
import {
  MONSTERS, MSG, POTIONS, POTION_FIELD, ROOM_NAME, generateDungeon, tileDistance,
  type DrankMessage, type MonsterKind, type PickupMessage,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

/** O bot de nível 1 avança sem descansar e morre em cerca de metade das hunts: aí recomeça numa sala nova. */
class Died extends Error {}
/** Matou todos os comuns sem cair poção (azar no sorteio): também recomeça numa sala nova. */
class NoPotion extends Died {}
const ATTEMPTS = 5;

let room: any;
let dungeon: ReturnType<typeof generateDungeon>;
let drank: DrankMessage[] = [];
let died = false;
let kills = 0;
let targetId: string | null = null;
let deadline = 0;
/** Ids dos itens que o servidor avisou que este herói pegou (`MSG.pickup`). */
let picked: string[] = [];
const me = () => room.state.players.get(room.sessionId);
// O cavaleiro sem magias não gasta mana: o teste usa a poção de vida (o código das duas é o mesmo).
const groundPotions = () => ([...room.state.items.values()] as any[]).filter((it) => it.itemId === "potion-health");

for (let attempt = 1; ; attempt++) {
  try {
    await run();
    break;
  } catch (e) {
    if (!(e instanceof Died) || attempt === ATTEMPTS) throw e;
    console.log(`tentativa ${attempt}: ${e instanceof NoPotion ? "acabaram os comuns sem cair poção" : "o cavaleiro morreu caçando"}; recomeçando`);
    await room.leave();
  }
}
console.log("POTIONS OK");
process.exit(0);

/** Uma tentativa completa: caça até cair uma poção de vida, pega, apanha e bebe. */
async function run() {
  room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
  drank = [];
  picked = [];
  died = false;
  kills = 0;
  targetId = null;
  room.onMessage(MSG.damage, () => {});
  room.onMessage(MSG.notice, () => {});
  room.onMessage(MSG.attack, () => {});
  room.onMessage(MSG.monsterStrike, () => {});
  room.onMessage(MSG.pickup, (msg: PickupMessage) => { if (msg.sessionId === room.sessionId) picked.push(msg.id); });
  room.onMessage(MSG.drank, (msg: DrankMessage) => drank.push(msg));
  room.onMessage(MSG.runEnded, (msg: any) => {
    if (msg.outcome === "died") died = true;
    else throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`);
  });

  await wait(300);
  room.send(MSG.start);
  await wait(300);
  // Segura o ataque básico durante toda a caça.
  room.send(MSG.attacking, { on: true });

  dungeon = generateDungeon(room.state.seed);
  deadline = Date.now() + 180_000;

  // Fase 1: caça até guardar uma poção de vida. Lutando colado no monstro, a que cai a 1 tile já é pega sozinha;
  // a que cair mais longe, o cavaleiro vai buscar.
  const potion = POTIONS["potion-health"];
  const field = POTION_FIELD[potion.id];
  const before = me()[field];
  while (me()[field] === before) {
    const ground = groundPotions().sort((x, y) => tileDistance(me().x, me().y, x.x, x.y) - tileDistance(me().x, me().y, y.x, y.y))[0];
    if (!ground) {
      await fightCommons("nenhuma poção caiu");
      continue;
    }
    if (Date.now() > deadline) throw new Error(`timeout: não conseguiu pegar a poção em ${ground.x},${ground.y}`);
    room.send(MSG.target, { id: null });
    targetId = null;
    walkToward(ground, 0);
    await wait(100);
  }
  // Fase 2: a poção guardada saiu do chão e o servidor avisou quem pegou.
  if (picked.length === 0) throw new Error("guardou a poção sem a mensagem pickup");
  if (picked.some((id) => room.state.items.has(id))) throw new Error("a poção continua no chão depois de guardada");
  console.log(`${kills} mortes; guardada: ${me()[field]} ${potion.name}`);

  // Fase 3: segue lutando com comuns até perder 10% da vida (bem mais que a regeneração) e bebe.
  while (me().maxHp - me().hp < me().maxHp * 0.1) await fightCommons("não apanhou o bastante");
  const carried = me()[field];
  const hp = me().hp;
  room.send(MSG.drink, { potion: potion.id });
  await wait(300);
  if (me()[field] !== carried - 1) throw new Error("a poção não saiu da mochila");
  if (me().hp <= hp) throw new Error(`a vida não subiu: ${hp} → ${me().hp}`);
  if (drank.length !== 1) throw new Error("o servidor não confirmou a poção");
  console.log(`bebeu: vida ${hp} → ${me().hp}, recarga ${drank[0].cooldownMs} ms`);

  // Fase 4: em recarga, beber de novo não gasta poção (só dá para testar com outra na mochila).
  if (me()[field] > 0) {
    const left = me()[field];
    room.send(MSG.drink, { potion: potion.id });
    await wait(300);
    if (me()[field] !== left || drank.length !== 1) throw new Error("bebeu durante a recarga");
    console.log("recarga respeitada");
  }
}

/** Um passo da caça: escolhe o comum mais próximo como alvo e anda até ele. */
async function fightCommons(reason: string) {
  if (Date.now() > deadline) throw new Error(`timeout: ${reason} em ${kills} mortes`);
  const p = me();
  if (targetId && !room.state.monsters.has(targetId)) { kills++; targetId = null; }
  if (!targetId) {
    let bestDist = Infinity;
    room.state.monsters.forEach((m: any, id: string) => {
      if (MONSTERS[m.kind as MonsterKind].rank !== "common") return;
      const dist = tileDistance(p.x, p.y, m.x, m.y);
      if (dist < bestDist) { bestDist = dist; targetId = id; }
    });
    if (!targetId) throw new NoPotion("acabaram os monstros comuns");
    room.send(MSG.target, { id: targetId });
  }
  const m = room.state.monsters.get(targetId);
  if (m) walkToward(m, 1);
  await wait(100);
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
