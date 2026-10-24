/**
 * Teste de fumaça dos itens contra um servidor rodando (npm run dev:server):
 * um cavaleiro mata monstros comuns até algum dropar um item, anda por cima dele
 * e confere que o item foi equipado automaticamente (o slot estava vazio) e que a bag continuou vazia.
 * Antes, confere sem servidor as regras da bag (`pickupAction`, com restrição de classe) e o catálogo de itens.
 * Uso: npx tsx apps/server/scripts/items.ts [url]
 */
import { Client } from "@colyseus/sdk";
import {
  BAG_SIZE, ITEMS, MONSTERS, MSG, ROOM_NAME, canUse, describeStats, gearStats, generateDungeon, itemId, pickupAction,
  rollItem, tileDistance, type ClassId, type ItemRarity, type ItemTier, type MonsterKind,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";
import { nextStep } from "../src/pathfinding.ts";

// Regras da bag: slot vazio equipa, melhor troca (o antigo vai para a bag), pior vai para a bag,
// e com a bag cheia nada sai do chão (só um slot vazio ainda recebe). Item de outra classe nunca veste.
const sword = (tier: ItemTier, rarity: ItemRarity = "common") => itemId("weapon", "sword", tier, rarity);
const rules: [string, string, number, ClassId, string][] = [
  [sword(2), "", 0, "knight", "equip"],
  [sword(2), "", BAG_SIZE, "knight", "equip"],
  [sword(3), sword(2), 0, "knight", "swap"],
  [sword(3), sword(2), BAG_SIZE, "knight", "full"],
  [sword(1), sword(2), BAG_SIZE - 1, "knight", "bag"],
  [sword(2), sword(2), BAG_SIZE, "knight", "full"],
  // Raridade vale meio nível: o mágico do mesmo material é melhor; o raro não passa o comum do nível acima.
  [sword(2, "magic"), sword(2), 0, "knight", "swap"],
  [sword(2, "rare"), sword(3), 0, "knight", "bag"],
  // Espada não é do druida: vai para a bag mesmo com a mão vazia.
  [sword(5, "magic"), "", 0, "druid", "bag"],
  [sword(5, "magic"), "", BAG_SIZE, "druid", "full"],
];
for (const [item, equipped, bag, classId, expected] of rules) {
  const got = pickupAction(item, equipped, bag, classId);
  if (got !== expected) throw new Error(`pickupAction(${item}, "${equipped}", ${bag}, ${classId}) = ${got}, esperado ${expected}`);
}
console.log("regras da bag: ok");

// Catálogo: classes das armas, cajado e varinha com dano mágico, espada sem, raro e mágico mais fortes.
const expectClasses: Record<string, ClassId[]> = {
  "weapon-sword": ["knight"], "weapon-axe": ["knight"], "weapon-bow": ["paladin"], "weapon-crossbow": ["paladin"],
  "weapon-wand": ["sorcerer", "druid"], "weapon-staff": ["sorcerer", "druid"],
};
for (const [family, classes] of Object.entries(expectClasses)) {
  const id = `${family}-3-common`;
  for (const c of ["knight", "paladin", "sorcerer", "druid"] as ClassId[]) {
    if (canUse(id, c) !== classes.includes(c)) throw new Error(`${id}: canUse(${c}) errado`);
  }
}
if (!(ITEMS[itemId("weapon", "staff", 3)].stats.spellPower! > 0)) throw new Error("cajado sem dano nas magias");
if (!(ITEMS[itemId("weapon", "wand", 3)].stats.spellPower! > 0)) throw new Error("varinha sem dano nas magias");
if (ITEMS[sword(5)].stats.spellPower) throw new Error("espada não aumenta magias");
if (!(ITEMS[sword(3, "rare")].stats.damage! > ITEMS[sword(3)].stats.damage!)) throw new Error("raro não é mais forte");
if (describeStats(ITEMS[sword(3, "magic")].stats).length < 2) throw new Error("mágico sem propriedade");
for (const slot of ["legs", "boots"] as const) {
  if (!Object.values(ITEMS).some((d) => d.slot === slot)) throw new Error(`sem itens de ${slot}`);
}
const gear = gearStats([itemId("boots", "boots", 3), itemId("armor", "war", 3), itemId("weapon", "staff", 3)]);
if (!(gear.armor > 0 && gear.speed > 0 && gear.spellPower > 0)) throw new Error("gearStats não somou");
// O drop não olha a classe: em 500 sorteios cai item que o cavaleiro não usa.
let seed = 1;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const drops = Array.from({ length: 500 }, () => rollItem("boss", 6, random));
if (drops.some((id) => !ITEMS[id])) throw new Error(`drop inválido: ${drops.find((id) => !ITEMS[id])}`);
if (drops.every((id) => canUse(id, "knight"))) throw new Error("o drop filtrou pela classe: só caiu o que o cavaleiro usa");
console.log("catálogo de itens: ok");

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

/** O bot de nível 1 avança sem descansar e morre em cerca de metade das hunts: aí recomeça numa sala nova. */
class Died extends Error {}
const ATTEMPTS = 8;

let room: any;
let dungeon: ReturnType<typeof generateDungeon>;
let died = false;
const me = () => room.state.players.get(room.sessionId);
// Poções também caem no chão, e o drop não olha a classe: só interessa o equipamento que o cavaleiro veste.
const groundGear = () => ([...room.state.items.values()] as any[]).filter((it) => ITEMS[it.itemId] && canUse(it.itemId, "knight"));

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
  // Item de outra classe pego no caminho vai para a bag; o que o cavaleiro veste, não.
  if (me().bag.some((id: string) => canUse(id, "knight"))) throw new Error(`a bag só devia ter itens de outra classe: ${[...me().bag].join(", ")}`);
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
