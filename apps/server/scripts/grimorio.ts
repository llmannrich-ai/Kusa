/**
 * Teste de fumaça do Grimório contra um servidor com KUSA_START_LEVEL=8 e KUSA_ALL_SPELLS=1
 * (slots abertos e todas as magias da classe no nível 3):
 *   - o Cavaleiro ergue o Escudo da Fé, que absorve o dano dos monstros antes da vida;
 *   - o Druida invoca o Lobo Espiritual e a Matilha, e os lobos ferem os monstros.
 * Uso: KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 PORT=2602 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/grimorio.ts http://localhost:2602
 */
import { Client } from "@colyseus/sdk";
import { MSG, ROOM_NAME, RULES_VERSION, generateDungeon, tileDistance, type DamageMessage } from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

await knightShield();
await druidSummons();
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
  await wait(200);
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
  await approach(room, me, 4, () => damage.some((d) => !d.toPlayer && d.attacker.startsWith("s")));
  const bites = damage.filter((d) => !d.toPlayer && d.attacker.startsWith("s")).length;
  console.log(`druida: ${mine().length} lobos, ${bites} mordidas`);
  if (bites === 0) throw new Error("os lobos não atacaram");
  await room.leave();
}

async function enter(classId: string) {
  const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId, rulesVersion: RULES_VERSION });
  const damage: DamageMessage[] = [];
  room.onMessage(MSG.damage, (msg: DamageMessage) => damage.push(msg));
  for (const type of [MSG.notice, MSG.spell, MSG.attack]) room.onMessage(type, () => {});
  room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });
  await wait(300);
  room.send(MSG.start);
  await wait(300);
  const me = () => room.state.players.get(room.sessionId);
  if (me().level < 8) throw new Error(`o servidor precisa de KUSA_START_LEVEL=8 (nível ${me().level})`);
  return { room, me, damage };
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
      const step = nextStep(dungeon, p, target, range, (x, y) => blocked.has(y * dungeon.width + x));
      if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
    }
    await wait(100);
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
