/**
 * Teste de fumaça das melhorias contra um servidor rodando (npm run dev:server):
 * um cavaleiro caça comuns até o nível 2. O servidor precisa oferecer 2 melhorias diferentes; uma
 * melhoria fora da oferta é recusada; escolher uma da oferta aplica (Vigor aumenta a vida máxima)
 * e fecha a escolha.
 * Uso: npx tsx apps/server/scripts/perks.ts [url]
 */
import { Client } from "@colyseus/sdk";
import {
  MONSTERS, MSG, PERK_CHOICES, PERK_IDS, ROOM_NAME, RULES_VERSION, generateDungeon, isPerk, tileDistance,
  type MonsterKind, type PerkId,
} from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

/** O bot de nível 1 avança sem descansar e às vezes morre antes do nível 2: aí recomeça numa sala nova. */
class Died extends Error {}
const ATTEMPTS = 5;
let room: any;
let died = false;
const me = () => room.state.players.get(room.sessionId);

for (let attempt = 1; ; attempt++) {
  try {
    await huntToLevel2();
    break;
  } catch (e) {
    if (!(e instanceof Died) || attempt === ATTEMPTS) throw e;
    console.log(`tentativa ${attempt}: o cavaleiro morreu caçando; recomeçando`);
    await room.leave();
  }
}
room.send(MSG.attacking, { on: false });
await wait(300);

const offer = [...me().perkOffer] as string[];
console.log(`nível ${me().level}: oferta ${offer.join(", ")}`);
if (offer.length !== PERK_CHOICES) throw new Error(`esperava ${PERK_CHOICES} melhorias, vieram ${offer.length}`);
if (new Set(offer).size !== offer.length || !offer.every(isPerk)) throw new Error("oferta repetida ou inválida");

// Fora da oferta: recusada.
const outside = PERK_IDS.find((id) => !offer.includes(id))!;
room.send(MSG.choosePerk, { perk: outside });
await wait(300);
if (me().perks.size !== 0) throw new Error("aceitou uma melhoria fora da oferta");

// Da oferta: aplicada (prefere o Vigor, que dá para conferir na vida máxima).
const pick = (offer.includes("vigor") ? "vigor" : offer[0]) as PerkId;
const maxHp = me().maxHp;
room.send(MSG.choosePerk, { perk: pick });
await wait(300);
if (me().perks.get(pick) !== 1) throw new Error(`a melhoria ${pick} não foi aplicada`);
if (me().perkOffer.length !== 0 && me().perksQueued === 0) throw new Error("a escolha não fechou");
if (pick === "vigor" && me().maxHp <= maxHp) throw new Error(`Vigor não aumentou a vida: ${maxHp} → ${me().maxHp}`);
console.log(`escolheu ${pick}: vida máxima ${maxHp} → ${me().maxHp}`);

// Repetir a escolha sem oferta nova não soma de novo.
room.send(MSG.choosePerk, { perk: pick });
await wait(300);
if (me().perkOffer.length === 0 && me().perks.get(pick) !== 1) throw new Error("somou a melhoria sem oferta");

console.log("PERKS OK");
process.exit(0);

/** Cria a sala e caça comuns até o nível 2 (o primeiro que dá melhoria). */
async function huntToLevel2() {
  died = false;
  room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
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
  room.send(MSG.attacking, { on: true });
  const dungeon = generateDungeon(room.state.seed);
  const deadline = Date.now() + 90_000;
  let targetId: string | null = null;

  while (me().level < 2) {
    if (Date.now() > deadline) throw new Error("timeout: não chegou ao nível 2");
    const p = me();
    if (targetId && !room.state.monsters.has(targetId)) targetId = null;
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
    if (m && tileDistance(p.x, p.y, m.x, m.y) > 1) {
      const blocked = new Set<number>();
      room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
      const step = nextStep(dungeon, p, m, 1, (x, y) => blocked.has(y * dungeon.width + x));
      if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
    }
    await wait(100);
  }
}

async function wait(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
  if (died) throw new Died();
}
