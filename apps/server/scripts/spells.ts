/**
 * Teste de fumaça das magias contra um servidor iniciado com KUSA_START_LEVEL=8
 * (os dois slots já abertos): um feiticeiro escolhe as magias, anda até um monstro,
 * conjura a Esfera Sombria e confere mana, recarga, projétil do ataque básico e dano.
 * Uso: KUSA_START_LEVEL=8 PORT=2601 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/spells.ts http://localhost:2601
 */
import { Client } from "@colyseus/sdk";
import {
  MSG, ROOM_NAME, SPELLS, generateDungeon, tileDistance,
  type AttackMessage, type DamageMessage, type SpellMessage,
} from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "sorcerer" });
const spells: SpellMessage[] = [];
const attacks: AttackMessage[] = [];
let hits = 0;
room.onMessage(MSG.spell, (msg: SpellMessage) => spells.push(msg));
room.onMessage(MSG.attack, (msg: AttackMessage) => attacks.push(msg));
room.onMessage(MSG.damage, (msg: DamageMessage) => { if (!msg.toPlayer) hits++; });
room.onMessage(MSG.notice, () => {});
room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });

await wait(300);
room.send(MSG.start);
await wait(300);
const me = () => room.state.players.get(room.sessionId);
if (me().level < 8) throw new Error(`o servidor precisa de KUSA_START_LEVEL=8 (nível ${me().level})`);

// Slot vazio não conjura; magia de outra classe não entra no slot.
room.send(MSG.cast, { slot: 0 });
room.send(MSG.chooseSpell, { slot: 1, spellId: "war_cry" });
await wait(200);
if (spells.length) throw new Error("conjurou com o slot vazio");
if (me().spell2) throw new Error("aceitou magia de outra classe");

room.send(MSG.chooseSpell, { slot: 0, spellId: "shadow_orb" });
room.send(MSG.chooseSpell, { slot: 1, spellId: "void_storm" });
await wait(200);
if (me().spell1 !== "shadow_orb" || me().spell2 !== "void_storm") throw new Error(`slots: ${me().spell1}, ${me().spell2}`);

// Anda até ficar ao alcance da Esfera Sombria do monstro mais próximo.
const dungeon = generateDungeon(room.state.seed);
const range = SPELLS.shadow_orb.range;
const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  const p = me();
  let target: any = null;
  let best = Infinity;
  room.state.monsters.forEach((m: any) => {
    const d = tileDistance(p.x, p.y, m.x, m.y);
    if (d < best) { best = d; target = m; }
  });
  if (best <= range - 1) break;
  const blocked = new Set<number>();
  room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
  const step = nextStep(dungeon, p, target, 1, (x, y) => blocked.has(y * dungeon.width + x));
  if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
  await wait(100);
}

const manaBefore = me().mana;
const hitsBefore = hits;
room.send(MSG.cast, { slot: 0 });
await wait(150);
const manaAfter = me().mana;
room.send(MSG.cast, { slot: 0 }); // ainda em recarga: ignorado
await wait(1200);

const cast = spells.filter((s) => s.from === room.sessionId);
console.log(`magias: ${cast.length}, ataques básicos: ${attacks.length}, golpes: ${hits - hitsBefore}, mana ${manaBefore} → ${manaAfter}`);
if (cast.length !== 1) throw new Error(`esperava 1 magia conjurada (recarga), vieram ${cast.length}`);
if (cast[0].spellId !== "shadow_orb" || cast[0].ms <= 0) throw new Error("a Esfera Sombria devia voar até o alvo");
// Folga para a regeneração de 1 segundo que pode cair no meio.
if (manaAfter > manaBefore - SPELLS.shadow_orb.manaCost + Math.ceil(me().maxMana * 0.02)) throw new Error("a magia não gastou mana");
if (hits === hitsBefore) throw new Error("a magia não causou dano");
if (!attacks.some((a) => a.from === room.sessionId && a.ms > 0)) throw new Error("o ataque básico do feiticeiro devia ser um projétil");
console.log("SPELLS OK");
process.exit(0);

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
