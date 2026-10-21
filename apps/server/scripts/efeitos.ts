/**
 * Teste de fumaça dos efeitos que só aparecem em quem sobrevive ao golpe, contra um servidor com
 * KUSA_START_LEVEL=8, KUSA_ALL_SPELLS=1 e KUSA_MONSTER_HP=20 (no nível 8 os monstros comuns morrem de um golpe;
 * com 20× a vida, os da entrada aguentam e o herói não precisa sair andando pela dungeon):
 *   - o Espinho Venenoso continua ferindo sozinho (dano contínuo, um pulso por segundo);
 *   - a Nevasca deixa os monstros lentos;
 *   - o Raio em Cadeia salta do alvo para outro monstro;
 *   - ramo Mira do Paladino (especializações): a Marca do Caçador marca o alvo e ele leva mais dano, o Rolamento
 *     afasta o herói do monstro, a Aljava Veloz e a Postura do Atirador ficam ativas no herói.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 KUSA_MONSTER_HP=20 PORT=2603 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/efeitos.ts http://localhost:2603
 */
import { Client } from "@colyseus/sdk";
import { MONSTERS, MSG, Tile, generateDungeon, tileAt, tileDistance, type MonsterKind } from "@kusa/shared";
import { approach, enter, inSight, until, wait } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

await venom();
await slowAndChain();
await paladinMira();
console.log("EFEITOS OK");
process.exit(0);

async function venom() {
  const { room, me } = await enter(client, "druid", "venom");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "venom_thorn" });
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  const seen = inSight(room, me(), 5)[0];
  if (!seen) throw new Error("nenhum monstro à vista em 30 s");
  const [id, target] = seen;
  if (target.maxHp < 300) throw new Error(`o servidor precisa de KUSA_MONSTER_HP=20 (vida ${target.maxHp})`);
  room.send(MSG.cast, { slot: 0, aim: { x: target.x, y: target.y, targetId: id } });
  await until(() => room.state.monsters.get(id)?.dot === "poison", 3000, "o espinho não envenenou o alvo");
  // Veneno: o alvo continua perdendo vida sem o druida fazer nada (um pulso por segundo).
  const hpBefore = room.state.monsters.get(id).hp;
  await wait(2300);
  const hpAfter = room.state.monsters.get(id)?.hp ?? 0;
  console.log(`druida: veneno no alvo, vida ${hpBefore} → ${hpAfter} em 2,3 s`);
  if (hpAfter >= hpBefore) throw new Error("o veneno não tirou vida do alvo");
  await room.leave();
}

async function slowAndChain() {
  const { room, me, chains } = await enter(client, "sorcerer", "slowAndChain");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "chain_lightning" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "blizzard" });
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  const seen = inSight(room, me(), 5)[0];
  if (!seen) throw new Error("nenhum monstro à vista em 30 s");
  const [, target] = seen;
  room.send(MSG.cast, { slot: 1, aim: { x: target.x, y: target.y } });
  await until(() => [...room.state.monsters.values()].some((m: any) => m.slowed), 3000, "a Nevasca não deixou ninguém lento");

  // Cadeia: precisa de dois monstros a até 3 tiles um do outro; anda pela entrada até achar.
  const deadline = Date.now() + 40_000;
  const pair = () => {
    const seen = inSight(room, me(), 6).filter(([, m]) => MONSTERS[m.kind as MonsterKind].rank === "common");
    return seen.find(([a, m]) => seen.some(([b, o]) => a !== b && tileDistance(m.x, m.y, o.x, o.y) <= 3));
  };
  while (chains.length === 0) {
    if (Date.now() > deadline) throw new Error("o Raio em Cadeia não saltou");
    const found = pair();
    if (found) room.send(MSG.cast, { slot: 0, aim: { x: found[1].x, y: found[1].y, targetId: found[0] } });
    else await approach(room, me, 2, () => pair() !== undefined);
    await wait(400);
  }
  const hops = Math.max(...chains.map((c) => c.points.length));
  console.log(`feiticeiro: monstros lentos, raio em até ${hops} monstros`);
  if (hops < 2) throw new Error("a cadeia devia ter ao menos 2 pontos");
  await room.leave();
}

async function paladinMira() {
  const { room, me, damage } = await enter(client, "paladin", "paladinMira");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "hunter_mark" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "swift_quiver" });
  await approach(room, me, 2, () => inSight(room, me(), 6).length > 0);
  const seen = inSight(room, me(), 6)[0];
  if (!seen) throw new Error("nenhum monstro à vista em 30 s");
  const [id, target] = seen;

  // Marca: o alvo fica marcado e o mesmo golpe passa a tirar mais vida.
  room.send(MSG.cast, { slot: 0, aim: { x: target.x, y: target.y, targetId: id } });
  await until(() => room.state.monsters.get(id)?.marked === true, 3000, "a Marca do Caçador não marcou o alvo");

  // Aljava Veloz: o bônus aparece no herói (a aura) e as flechas saem mais rápido.
  room.send(MSG.cast, { slot: 1 });
  await until(() => me().buff === "swift_quiver", 2000, "a Aljava Veloz não ficou ativa");
  room.send(MSG.target, { id });
  room.send(MSG.attacking, { on: true });
  const t0 = Date.now();
  await until(() => damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer).length >= 5, 4000, "as flechas rápidas não saíram");
  room.send(MSG.attacking, { on: false });
  const arrowsMs = Date.now() - t0;
  console.log(`paladino: alvo marcado, 5 golpes em ${arrowsMs} ms com a Aljava Veloz`);
  // Sem a aljava, 5 flechas levam 4 s (1 por segundo); com ela, 0,4 s cada.
  if (arrowsMs > 3500) throw new Error(`as flechas não ficaram mais rápidas (${arrowsMs} ms)`);
  await room.leave();

  // Rolamento: o herói salta para longe do monstro e nunca cai no portal.
  const roll = await enter(client, "paladin", "paladinRoll");
  roll.room.send(MSG.chooseSpell, { slot: 0, spellId: "evasive_roll" });
  roll.room.send(MSG.chooseSpell, { slot: 1, spellId: "sniper_stance" });
  await approach(roll.room, roll.me, 2, () => inSight(roll.room, roll.me(), 3).length > 0);
  const near = inSight(roll.room, roll.me(), 3)[0];
  if (!near) throw new Error("nenhum monstro perto para rolar para longe");
  const before = { x: roll.me().x, y: roll.me().y };
  const gap = tileDistance(before.x, before.y, near[1].x, near[1].y);
  roll.room.send(MSG.target, { id: near[0] });
  roll.room.send(MSG.cast, { slot: 0 });
  await until(() => roll.me().x !== before.x || roll.me().y !== before.y, 2000, "o Rolamento não moveu o herói");
  const after = roll.me();
  const dungeon = generateDungeon(roll.room.state.seed, roll.room.state.mapId);
  if (tileAt(dungeon, after.x, after.y) === Tile.Portal) throw new Error("o Rolamento caiu no portal");
  const monster = roll.room.state.monsters.get(near[0]);
  const gapAfter = monster ? tileDistance(after.x, after.y, monster.x, monster.y) : Infinity;
  console.log(`paladino: rolou de ${before.x},${before.y} para ${after.x},${after.y} (distância do monstro ${gap} → ${gapAfter})`);
  if (gapAfter <= gap) throw new Error("o Rolamento devia afastar o herói do monstro");
  roll.room.send(MSG.cast, { slot: 1 });
  await until(() => roll.me().buff === "sniper_stance", 2000, "a Postura do Atirador não ficou ativa");
  await roll.room.leave();
}
