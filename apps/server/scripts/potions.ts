/**
 * Teste de fumaça das poções contra um servidor rodando (npm run dev:server), na Fíbula (terreno de caça):
 * um cavaleiro mata monstros comuns da Orla até juntar loot para uma poção de vida, volta ao acampamento e compra do
 * vendedor (`MSG.buyPotion`: só encostado na banca, o loot cai e a poção entra na mochila; poção não cai de monstro).
 * Depois de apanhar um pouco, bebe: a poção sai da mochila, a vida sobe e a recarga compartilhada começa (beber de novo
 * logo em seguida não gasta outra).
 * Uso: npx tsx apps/server/scripts/potions.ts [url]
 */
import { Client } from "@colyseus/sdk";
import {
  CAMP_VENDOR_PRICES, CAMP_VENDOR_RADIUS, MONSTERS, MSG, POTIONS, POTION_FIELD, ROOM_NAME, generateDungeon, isWalkable, tileDistance,
  type DrankMessage, type MonsterKind,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

/** O bot de nível 1 avança sem descansar e morre em cerca de metade das hunts: aí recomeça numa sala nova. */
class Died extends Error {}
/** Matou todos os comuns sem juntar o loot da poção: também recomeça numa sala nova. */
class NoPotion extends Died {}
const ATTEMPTS = 5;

let room: any;
let dungeon: ReturnType<typeof generateDungeon>;
let drank: DrankMessage[] = [];
let died = false;
let kills = 0;
let targetId: string | null = null;
let deadline = 0;
/** Descansando na fogueira (a resposta certa do terreno de caça: ferido, recua e volta cheio). */
let resting = false;
let lastStep: { x: number; y: number } | null = null;
/** Avisos que o servidor mandou (para explicar uma compra recusada). */
let notices: string[] = [];
const me = () => room.state.players.get(room.sessionId);
// O cavaleiro sem magias não gasta mana: o teste usa a poção de vida (o código das duas é o mesmo).

for (let attempt = 1; ; attempt++) {
  try {
    await run();
    break;
  } catch (e) {
    if (!(e instanceof Died) || attempt === ATTEMPTS) throw e;
    console.log(`tentativa ${attempt}: ${e instanceof NoPotion ? "acabaram os comuns antes do loot da poção" : "o cavaleiro morreu caçando"} (${kills} mortes, loot ${me()?.loot}, ${resting ? "recuando" : "lutando"}, dot "${me()?.dot}", nível ${me()?.level}); recomeçando`);
    await room.leave();
  }
}
console.log("POTIONS OK");
process.exit(0);

/** Uma tentativa completa: caça até juntar o loot, compra a poção do vendedor, apanha e bebe. */
async function run() {
  room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION, mapId: "fibula" });
  drank = [];
  notices = [];
  died = false;
  kills = 0;
  targetId = null;
  room.onMessage(MSG.damage, () => {});
  room.onMessage(MSG.notice, (msg: any) => notices.push(msg.text));
  room.onMessage(MSG.attack, () => {});
  room.onMessage(MSG.monsterStrike, () => {});
  room.onMessage(MSG.pickup, () => {});
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

  dungeon = generateDungeon(room.state.seed, "fibula");
  const vendor = dungeon.vendor;
  if (!vendor) throw new Error("a Fíbula devia ter o vendedor do acampamento");
  deadline = Date.now() + 300_000;
  resting = false;

  // Fase 1: caça na Orla até juntar o loot de duas poções de vida (a segunda é para o teste da recarga).
  const potion = POTIONS["potion-health"];
  const field = POTION_FIELD[potion.id];
  const price = CAMP_VENDOR_PRICES[potion.id]!;
  while (me().loot < price * 2) await fightCommons("não juntou o loot da poção");
  console.log(`${kills} mortes; loot: ${me().loot}`);

  // Fase 2: longe da banca a compra não vale; encostado, o loot cai e a poção entra na mochila.
  room.send(MSG.target, { id: null });
  targetId = null;
  const before = me()[field];
  if (tileDistance(me().x, me().y, vendor.x, vendor.y) > CAMP_VENDOR_RADIUS) {
    room.send(MSG.buyPotion, { potion: potion.id });
    await wait(300);
    if (me()[field] !== before) throw new Error("comprou poção longe do vendedor");
  }
  deadline = Date.now() + 60_000;
  while (tileDistance(me().x, me().y, vendor.x, vendor.y) > CAMP_VENDOR_RADIUS) {
    if (Date.now() > deadline) {
      const around = ([...room.state.monsters.values()] as any[]).filter((m) => tileDistance(me().x, me().y, m.x, m.y) <= 2).map((m) => `${m.kind}@${m.x},${m.y}`);
      throw new Error(`timeout: não chegou ao vendedor em ${vendor.x},${vendor.y} (herói em ${me().x},${me().y}, passo ${JSON.stringify(lastStep)}, perto: ${around.join(" ") || "ninguém"})`);
    }
    // Quem segue o herói até o acampamento apanha no caminho.
    const chaser = ([...room.state.monsters.entries()] as [string, any][]).find(([, m]) => tileDistance(me().x, me().y, m.x, m.y) <= 1)?.[0] ?? null;
    if (chaser !== targetId) { targetId = chaser; room.send(MSG.target, { id: chaser }); }
    walkToward(vendor, CAMP_VENDOR_RADIUS);
    await wait(100);
  }
  room.send(MSG.target, { id: null });
  targetId = null;
  room.send(MSG.attacking, { on: false });
  await wait(200);
  const lootBefore = me().loot;
  for (let k = 0; k < 2; k++) {
    // A mensagem pode cruzar com um passo atrasado do herói: tenta de novo, voltando para perto da banca.
    for (let tries = 0; tries < 5 && me()[field] !== before + k + 1; tries++) {
      if (tileDistance(me().x, me().y, vendor.x, vendor.y) > CAMP_VENDOR_RADIUS) { walkToward(vendor, CAMP_VENDOR_RADIUS); await wait(300); continue; }
      room.send(MSG.buyPotion, { potion: potion.id });
      await settle(() => me()[field] === before + k + 1);
    }
  }
  if (me()[field] !== before + 2) {
    throw new Error(`a compra não entrou na mochila: ${me()[field]} poções (herói em ${me().x},${me().y}, status ${me().status}, loot ${me().loot}, vendedor em ${vendor.x},${vendor.y}; avisos: ${notices.slice(-5).join(" | ")})`);
  }
  if (me().loot !== lootBefore - price * 2) throw new Error(`o loot não caiu pelo preço: ${lootBefore} → ${me().loot}`);
  console.log(`comprou 2 ${potion.name} por ${price * 2} de loot (sobrou ${me().loot})`);
  room.send(MSG.attacking, { on: true });

  // Fase 3: segue lutando com comuns até perder 10% da vida (bem mais que a regeneração) e bebe.
  while (me().maxHp - me().hp < me().maxHp * 0.1) await fightCommons("não apanhou o bastante");
  const carried = me()[field];
  const hp = me().hp;
  room.send(MSG.drink, { potion: potion.id });
  // O herói continua no meio da luta: os golpes podem levar a vida de volta ao que era antes do gole (no CI isso
  // acontecia: "131 → 131"). Vale o pico de vida visto depois do gole, não a vida no fim da espera.
  let peak = hp;
  for (let i = 0; i < 15; i++) {
    await wait(100);
    peak = Math.max(peak, me().hp);
    if (peak > hp && me()[field] === carried - 1) break;
  }
  if (me()[field] !== carried - 1) throw new Error("a poção não saiu da mochila");
  if (peak <= hp) throw new Error(`a vida não subiu: ${hp} → ${peak}`);
  if (drank.length !== 1) throw new Error("o servidor não confirmou a poção");
  console.log(`bebeu: vida ${hp} → ${peak}, recarga ${drank[0].cooldownMs} ms`);

  // Fase 4: em recarga, beber de novo não gasta poção (só dá para testar com outra na mochila).
  if (me()[field] > 0) {
    const left = me()[field];
    room.send(MSG.drink, { potion: potion.id });
    await wait(300);
    await settle(() => me()[field] === left);
    if (me()[field] !== left || drank.length !== 1) throw new Error("bebeu durante a recarga");
    console.log("recarga respeitada");
  }
}

/**
 * Um passo da caça: escolhe o comum mais próximo como alvo e anda até ele. Com pouca vida, recua até a fogueira sem
 * largar o ataque (quem o segue morre lá, com a regen da fogueira) e descansa até quase encher: a resposta certa do
 * terreno de caça (o escorpião da Orla mata um nível 1 que insiste).
 */
async function fightCommons(reason: string) {
  if (Date.now() > deadline) throw new Error(`timeout: ${reason} em ${kills} mortes`);
  const p = me();
  const camp = dungeon.camp!;
  if (targetId && !room.state.monsters.has(targetId)) { kills++; targetId = null; }
  if (resting && p.hp >= p.maxHp * 0.95) resting = false;
  if (!resting && p.hp < p.maxHp * 0.55) { resting = true; targetId = null; }
  const nearest = (maxDist: number) => {
    let best: string | null = null;
    let bestDist = maxDist;
    room.state.monsters.forEach((m: any, id: string) => {
      if (MONSTERS[m.kind as MonsterKind].rank !== "common") return;
      const dist = tileDistance(p.x, p.y, m.x, m.y);
      if (dist <= bestDist) { bestDist = dist; best = id; }
    });
    return best;
  };
  if (resting) {
    // Só bate em quem veio atrás; o resto fica para depois.
    const chaser = nearest(1);
    if (chaser !== targetId) { targetId = chaser; room.send(MSG.target, { id: chaser }); }
    walkToward(camp, 1);
    await wait(100);
    return;
  }
  if (!targetId) {
    targetId = nearest(Infinity);
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
  let step = nextStep(dungeon, p, to, range, (x, y) => blocked.has(y * dungeon.width + x));
  // Longe demais para a busca do passo (a Fíbula é um salão aberto): anda na direção do alvo pelo vizinho livre.
  if (!step) {
    let best = Infinity;
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      const x = p.x + dx, y = p.y + dy;
      if ((!dx && !dy) || !isWalkable(dungeon, x, y) || blocked.has(y * dungeon.width + x)) continue;
      const dist = Math.hypot(to.x - x, to.y - y);
      if (dist < best) { best = dist; step = { x, y }; }
    }
  }
  lastStep = step;
  if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
}

/** Espera até 1 s o patch do estado alcançar as mensagens (o aviso `pickup` chega antes do patch da mochila). */
async function settle(done: () => boolean) {
  for (let i = 0; i < 10 && !done(); i++) await wait(100);
}

async function wait(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
  if (died) throw new Died();
}
