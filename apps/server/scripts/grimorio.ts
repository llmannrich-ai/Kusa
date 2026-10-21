/**
 * Teste de fumaça do Grimório contra um servidor com KUSA_START_LEVEL=8 e KUSA_ALL_SPELLS=1
 * (slots abertos e todas as magias da classe no nível 3):
 *   - o Cavaleiro ergue o Escudo da Fé, que absorve o dano dos monstros antes da vida;
 *   - o Druida invoca o Lobo Espiritual e a Matilha, e os lobos ferem os monstros;
 *   - o Espinho Venenoso continua ferindo sozinho (dano contínuo);
 *   - o Raio em Cadeia salta de um monstro para outro e a Nevasca deixa lento o mini-boss (o único que sobrevive a ela);
 *   - o Disparo Perfurante vai em linha até o alcance inteiro (ou a parede) e fere quem está nela.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 PORT=2602 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/grimorio.ts http://localhost:2602
 */
import { Client } from "@colyseus/sdk";
import {
  MONSTERS, MSG, ROOM_NAME, RULES_VERSION, SPELLS, generateDungeon, hasLineOfSight, lineTiles, spellAtRank, tileDistance,
  type ChainMessage, type DamageMessage, type MonsterKind, type SpellMessage,
} from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

rules();
await knightShield();
await druidSummons();
await venomDot();
await sorcererSlowAndChain();
await paladinLine();
console.log("GRIMÓRIO OK");
process.exit(0);

async function knightShield() {
  const { room, me, damage } = await enter("knight");
  if (me().spellRanks.get("holy_shield") !== 3) throw new Error("o servidor precisa de KUSA_ALL_SPELLS=1");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "holy_shield" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "steel_wall" });
  await wait(200);
  if (me().spell1 !== "holy_shield") throw new Error(`slot 1: ${me().spell1}`);

  room.send(MSG.cast, { slot: 0 });
  await wait(200);
  const shield = me().barrier;
  // Nível 3: 40% × 1,4 = 56% da vida máxima.
  if (shield !== Math.round(me().maxHp * 0.56)) throw new Error(`escudo ${shield}, vida máxima ${me().maxHp}`);
  if (me().maxBarrier !== shield) throw new Error("maxBarrier devia acompanhar o escudo novo");

  // Anda até os monstros e deixa apanhar: o escudo absorve antes da vida.
  await approach(room, me, 1, () => damage.some((d) => d.toPlayer && (d.absorbed ?? 0) > 0));
  await wait(150); // o estado chega depois da mensagem de dano
  const absorbed = damage.filter((d) => d.toPlayer).reduce((sum, d) => sum + (d.absorbed ?? 0), 0);
  console.log(`cavaleiro: escudo ${shield}, absorvido ${absorbed}, escudo agora ${me().barrier}, vida ${me().hp}/${me().maxHp}`);
  if (absorbed === 0) throw new Error("o escudo não absorveu nenhum golpe");
  if (me().barrier >= shield) throw new Error("o escudo não diminuiu com o dano");
  await room.leave();
}

async function druidSummons() {
  const { room, me, damage } = await enter("druid");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "spirit_wolf" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "wolf_pack" });
  // Chega perto dos monstros antes de invocar: os lobos têm tempo de vida e sumiam no caminho.
  await approach(room, me, 4, () => nearestMonster(room, me()) <= 4);
  room.send(MSG.cast, { slot: 0 });
  await wait(200);
  const mine = () => [...room.state.summons.values()].filter((s: any) => s.owner === room.sessionId);
  if (mine().length !== 1 || mine()[0].kind !== "wolf") throw new Error(`invocou ${mine().map((s: any) => s.kind)}`);
  room.send(MSG.cast, { slot: 1 });
  await wait(200);
  if (mine().length !== 4) throw new Error(`esperava 4 lobos, há ${mine().length}`);
  // Conjurar de novo (em recarga) não invoca mais.
  room.send(MSG.cast, { slot: 0 });
  await wait(200);
  if (mine().length !== 4) throw new Error("invocou durante a recarga");

  // Os lobos caçam os monstros por perto: algum golpe vem de uma criatura invocada.
  await approach(room, me, 1, () => damage.some((d) => !d.toPlayer && d.attacker.startsWith("s")));
  const bites = damage.filter((d) => !d.toPlayer && d.attacker.startsWith("s")).length;
  console.log(`druida: ${mine().length} lobos, ${bites} mordidas`);
  if (bites === 0) throw new Error("os lobos não atacaram");
  await room.leave();
}

/** Contas do `packages/shared` que cliente e servidor usam: linha e níveis dos efeitos novos. */
function rules() {
  const dungeon = generateDungeon(1);
  const { x, y } = dungeon.portal;
  const line = lineTiles(dungeon, x, y, x + 1, y, 7);
  if (line.length > 7 || line.some((t, i) => t.x !== x + i + 1 || t.y !== y)) throw new Error(`linha errada: ${JSON.stringify(line)}`);
  if (lineTiles(dungeon, x, y, x, y, 7).length !== 0) throw new Error("linha sem direção devia ser vazia");
  const venom = spellAtRank(SPELLS.venom_thorn, 3);
  if (Math.abs(venom.dot!.perSec - 0.3 * 1.4) > 1e-9 || venom.dot!.ms !== 5200) throw new Error(`veneno no nível 3: ${JSON.stringify(venom.dot)}`);
  if (spellAtRank(SPELLS.blizzard, 3).slow!.ms !== 5200) throw new Error("a lentidão devia durar mais no nível 3");
}

async function venomDot() {
  const { room, me, damage } = await enter("druid");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "venom_thorn" });
  // Monstro comum morre antes do veneno pulsar: o espinho vai no mini-boss.
  const bossId = await huntMiniboss(room, me, (boss) => {
    room.send(MSG.cast, { slot: 0, aim: { x: boss.x, y: boss.y, targetId: boss.id } });
    return boss.dot === "poison";
  });
  // Veneno: depois do espinho, o mini-boss continua levando dano do druida sem ele fazer nada.
  const fromMe = () => damage.filter((d) => d.attacker === room.sessionId && d.dot === "poison").length;
  const before = fromMe();
  await wait(2300);
  const ticks = fromMe() - before;
  console.log(`druida: ${room.state.monsters.get(bossId)?.kind} envenenado, ${ticks} pulsos em 2,3 s`);
  if (ticks < 2) throw new Error(`o veneno pulsou ${ticks} vezes em 2,3 s`);
  await room.leave();
}

async function sorcererSlowAndChain() {
  const { room, me, damage, chains } = await enter("sorcerer");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "chain_lightning" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "blizzard" });
  // No nível 8 a Nevasca mata qualquer monstro comum na hora (e a lentidão nem aparece): só o mini-boss sobrevive a
  // ela. No caminho, o Raio em Cadeia limpa os outros monstros e precisa saltar ao menos uma vez.
  const dungeon = generateDungeon(room.state.seed, room.state.mapId);
  await huntMiniboss(room, me, (boss, p) => {
    if (!boss.slowed) room.send(MSG.cast, { slot: 1, aim: { x: boss.x, y: boss.y } });
    const other = [...room.state.monsters.entries()].find(([id, m]: [string, any]) =>
      id !== boss.id && tileDistance(p.x, p.y, m.x, m.y) <= 5 && hasLineOfSight(dungeon, p.x, p.y, m.x, m.y));
    if (other) room.send(MSG.cast, { slot: 0, aim: { x: other[1].x, y: other[1].y, targetId: other[0] } });
    return boss.slowed && chains.length > 0;
  }, (p) => {
    // Longe do mini-boss, o raio limpa o caminho (e salta quando dá).
    const other = [...room.state.monsters.entries()].find(([, m]: [string, any]) =>
      tileDistance(p.x, p.y, m.x, m.y) <= 5 && hasLineOfSight(dungeon, p.x, p.y, m.x, m.y));
    if (other) room.send(MSG.cast, { slot: 0, aim: { x: other[1].x, y: other[1].y, targetId: other[0] } });
  });
  if (chains.length === 0) throw new Error("o Raio em Cadeia não saltou");
  const hops = Math.max(...chains.map((c) => c.points.length));
  const hits = damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer).length;
  console.log(`feiticeiro: mini-boss lento, raio em até ${hops} monstros, ${hits} golpes`);
  if (hops < 2) throw new Error("a cadeia devia ter ao menos 2 pontos");
  await room.leave();
}

/**
 * Anda até ver o mini-boss mais próximo (a até 4 tiles, com linha de visão) e chama `act` a cada 100 ms até ela
 * devolver true; antes disso, `onWay` age no caminho. Devolve o id do mini-boss.
 */
async function huntMiniboss(
  room: any, me: () => any, act: (boss: any, p: any) => boolean, onWay?: (p: any) => void,
): Promise<string> {
  const dungeon = generateDungeon(room.state.seed, room.state.mapId);
  let bossId = "";
  let best = Infinity;
  room.state.monsters.forEach((m: any, id: string) => {
    const d = tileDistance(me().x, me().y, m.x, m.y);
    if (MONSTERS[m.kind as MonsterKind].rank === "miniboss" && d < best) { best = d; bossId = id; }
  });
  if (!bossId) throw new Error("nenhum mini-boss no mapa");
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (Date.now() > deadline) throw new Error("timeout indo até o mini-boss");
    const p = me();
    if (p.status !== "playing") throw new Error(`o herói saiu da hunt: ${p.status}`);
    const boss = room.state.monsters.get(bossId);
    if (!boss) throw new Error("o mini-boss morreu antes da hora");
    const near = tileDistance(p.x, p.y, boss.x, boss.y) <= 4 && hasLineOfSight(dungeon, p.x, p.y, boss.x, boss.y);
    if (near && act({ ...boss.toJSON(), id: bossId }, p)) return bossId;
    if (!near) {
      onWay?.(p);
      const blocked = new Set<number>();
      room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
      blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
      const step = nextStep(dungeon, p, boss, 4, (x, y) => blocked.has(y * dungeon.width + x));
      if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
    }
    await wait(100);
  }
}

async function paladinLine() {
  const { room, me, damage, spells } = await enter("paladin");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "piercing_shot" });
  await approach(room, me, 4, () => inSight(room, me(), 5));
  room.send(MSG.cast, { slot: 0 });
  await until(() => spells.some((s) => s.spellId === "piercing_shot"), 2000, "o Disparo Perfurante não saiu");
  const shot = spells.find((s) => s.spellId === "piercing_shot")!;
  const dungeon = generateDungeon(room.state.seed);
  const line = lineTiles(dungeon, shot.x, shot.y, shot.tx, shot.ty, SPELLS.piercing_shot.range);
  const end = line[line.length - 1];
  if (!end || end.x !== shot.tx || end.y !== shot.ty) throw new Error(`a flecha devia ir até o fim da linha: ${JSON.stringify({ shot, end })}`);
  await until(() => damage.some((d) => d.attacker === room.sessionId && !d.toPlayer), 2000, "a flecha não acertou ninguém");
  console.log(`paladino: linha de ${line.length} tiles até ${shot.tx},${shot.ty}`);
  await room.leave();
}

/** Algum monstro a até `range` tiles e com linha de visão (o toque rápido da magia acha um alvo). */
function inSight(room: any, p: { x: number; y: number }, range: number) {
  const dungeon = generateDungeon(room.state.seed);
  return [...room.state.monsters.values()].some((m: any) =>
    tileDistance(p.x, p.y, m.x, m.y) <= range && hasLineOfSight(dungeon, p.x, p.y, m.x, m.y));
}

async function until(done: () => boolean, ms: number, error: string) {
  const deadline = Date.now() + ms;
  while (!done()) {
    if (Date.now() > deadline) throw new Error(error);
    await wait(50);
  }
}

async function enter(classId: string) {
  const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId, rulesVersion: RULES_VERSION });
  const damage: DamageMessage[] = [];
  const spells: SpellMessage[] = [];
  const chains: ChainMessage[] = [];
  room.onMessage(MSG.damage, (msg: DamageMessage) => damage.push(msg));
  room.onMessage(MSG.spell, (msg: SpellMessage) => spells.push(msg));
  room.onMessage(MSG.chain, (msg: ChainMessage) => chains.push(msg));
  for (const type of [MSG.notice, MSG.attack]) room.onMessage(type, () => {});
  room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });
  await wait(300);
  room.send(MSG.start);
  await wait(300);
  const me = () => room.state.players.get(room.sessionId);
  if (me().level < 8) throw new Error(`o servidor precisa de KUSA_START_LEVEL=8 (nível ${me().level})`);
  return { room, me, damage, spells, chains };
}

/** Anda até ficar a `range` tiles do monstro mais próximo, até `done()` ou 30 s. */
async function approach(room: any, me: () => any, range: number, done: () => boolean) {
  const dungeon = generateDungeon(room.state.seed);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !done()) {
    const p = me();
    let target: any = null;
    let best = Infinity;
    room.state.monsters.forEach((m: any) => {
      const d = tileDistance(p.x, p.y, m.x, m.y);
      if (d < best) { best = d; target = m; }
    });
    if (target && best > range) {
      const blocked = new Set<number>();
      room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
      // O herói nasce colado no portal de fuga: pisar nele no caminho encerra a hunt.
      blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
      const step = nextStep(dungeon, p, target, range, (x, y) => blocked.has(y * dungeon.width + x));
      if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
    }
    await wait(100);
  }
}

/** Distância até o monstro mais próximo. */
function nearestMonster(room: any, p: { x: number; y: number }) {
  let best = Infinity;
  room.state.monsters.forEach((m: any) => { best = Math.min(best, tileDistance(p.x, p.y, m.x, m.y)); });
  return best;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
