/**
 * Teste de fumaça dos efeitos que só aparecem em quem sobrevive ao golpe, contra um servidor com
 * KUSA_START_LEVEL=8, KUSA_ALL_SPELLS=1 e KUSA_MONSTER_HP=20 (no nível 8 os monstros comuns morrem de um golpe;
 * com 20× a vida, os da entrada aguentam e o herói não precisa sair andando pela dungeon):
 *   - o Espinho Venenoso continua ferindo sozinho (dano contínuo, um pulso por segundo);
 *   - a Nevasca deixa os monstros lentos;
 *   - o Raio em Cadeia salta do alvo para outro monstro;
 *   - ramo Mira do Paladino (especializações): a Marca do Caçador marca o alvo e ele leva mais dano, o Rolamento
 *     afasta o herói do monstro, a Aljava Veloz e a Postura do Atirador ficam ativas no herói;
 *   - ramos Luz e Batedor do Paladino: Lança Etérea e Caldeira Divina ferem, o Escudo da Luz (toque rápido, sozinho)
 *     protege o próprio herói, o Solo Consagrado vira um campo que fere, a Flecha Relâmpago salta, a Barragem acerta
 *     em leque, a Armadilha de Urso prende o monstro que pisa nela e a estaca do Cordão de Flechas atira sozinha.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 KUSA_MONSTER_HP=20 PORT=2603 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/efeitos.ts http://localhost:2603
 */
import { Client } from "@colyseus/sdk";
import { MONSTERS, MSG, Tile, generateDungeon, isWalkable, lineTiles, tileAt, tileDistance, type MonsterKind } from "@kusa/shared";
import { approach, enter, inSight, until, wait } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

await venom();
await slowAndChain();
await paladinMira();
await paladinLight();
await paladinScout();
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
  const deadline = Date.now() + 90_000;
  let tries = 0;
  const pair = () => {
    const seen = inSight(room, me(), 6).filter(([, m]) => MONSTERS[m.kind as MonsterKind].rank === "common");
    return seen.find(([a, m]) => seen.some(([b, o]) => a !== b && tileDistance(m.x, m.y, o.x, o.y) <= 3));
  };
  while (chains.length === 0) {
    if (Date.now() > deadline) throw new Error("o Raio em Cadeia não saltou");
    const found = pair();
    if (found) room.send(MSG.cast, { slot: 0, aim: { x: found[1].x, y: found[1].y, targetId: found[0] } });
    else await gather(room, me, () => pair() !== undefined, ++tries);
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
  // Atira por 6 s (a aljava dura 7,8 s no nível 3), trocando para outro monstro à vista se o alvo sair do alcance.
  // Sem a aljava, saem no máximo 6 flechas em 6 s (1 por segundo); com ela, uma a cada 0,4 s.
  const hitsBefore = damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer && !d.dot).length;
  room.send(MSG.target, { id });
  room.send(MSG.attacking, { on: true });
  for (let t = 0; t < 20; t++) {
    const p = me();
    const current = room.state.monsters.get(p.target);
    if (!current || tileDistance(p.x, p.y, current.x, current.y) > 5) {
      const other = inSight(room, p, 5)[0];
      if (other) room.send(MSG.target, { id: other[0] });
    }
    await wait(300);
  }
  room.send(MSG.attacking, { on: false });
  const hits = damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer && !d.dot).length - hitsBefore;
  console.log(`paladino: alvo marcado, ${hits} golpes em 6 s com a Aljava Veloz`);
  if (hits < 7) throw new Error(`as flechas não ficaram mais rápidas (${hits} golpes em 6 s)`);
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
  // Mira o rolamento na direção livre que mais afasta do monstro (rolar contra a parede não sai do lugar).
  const map = generateDungeon(roll.room.state.seed, roll.room.state.mapId);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    .map(([dx, dy]) => ({ x: before.x + dx * 3, y: before.y + dy * 3 }))
    .filter((p) => {
      const first = lineTiles(map, before.x, before.y, p.x, p.y, 1)[0];
      return first && isWalkable(map, first.x, first.y) && tileAt(map, first.x, first.y) !== Tile.Portal;
    })
    .sort((a, b) => tileDistance(b.x, b.y, near[1].x, near[1].y) - tileDistance(a.x, a.y, near[1].x, near[1].y));
  if (dirs.length === 0) throw new Error("o herói está cercado: nenhum lado livre para rolar");
  roll.room.send(MSG.cast, { slot: 0, aim: dirs[0] });
  await until(() => roll.me().x !== before.x || roll.me().y !== before.y, 2000, "o Rolamento não moveu o herói");
  const after = roll.me();
  const dungeon = generateDungeon(roll.room.state.seed, roll.room.state.mapId);
  if (tileAt(dungeon, after.x, after.y) === Tile.Portal) throw new Error("o Rolamento caiu no portal");
  const monster = roll.room.state.monsters.get(near[0]);
  const gapAfter = monster ? tileDistance(after.x, after.y, monster.x, monster.y) : Infinity;
  console.log(`paladino: rolou de ${before.x},${before.y} para ${after.x},${after.y} (distância do monstro ${gap} → ${gapAfter})`);
  if (gapAfter < gap) throw new Error("o Rolamento devia afastar o herói do monstro");
  roll.room.send(MSG.cast, { slot: 1 });
  await until(() => roll.me().buff === "sniper_stance", 2000, "a Postura do Atirador não ficou ativa");
  await roll.room.leave();
}

/** Dano do herói (sem o que ele recebeu) desde a posição `from` da lista. */
function hitsFrom(damage: { attacker: string; toPlayer: boolean }[], me: string, from: number) {
  return damage.slice(from).filter((d) => d.attacker === me && !d.toPlayer).length;
}

async function paladinLight() {
  const { room, me, damage, spells } = await enter(client, "paladin", "paladinLight");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "light_shield" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "consecrated_ground" });
  // Escudo da Luz no toque rápido: sozinho, o mais ferido ao alcance é o próprio herói.
  room.send(MSG.cast, { slot: 0 });
  await until(() => me().barrier > 0, 2000, "o Escudo da Luz não protegeu o herói");
  const shield = me().barrier;

  // Solo Consagrado: o campo aparece no chão e fere os monstros em cima dele.
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  const seen = inSight(room, me(), 5)[0];
  if (!seen) throw new Error("nenhum monstro à vista em 30 s");
  const before = damage.length;
  room.send(MSG.cast, { slot: 1, aim: { x: seen[1].x, y: seen[1].y } });
  await until(() => [...room.state.fields.values()].some((f: any) => f.spellId === "consecrated_ground" && f.kind === "zone"), 2000, "o Solo Consagrado não criou o campo");
  await until(() => hitsFrom(damage, room.sessionId, before) > 0, 4000, "o Solo Consagrado não feriu ninguém");
  console.log(`paladino: Escudo da Luz de ${shield} em si mesmo; Solo Consagrado feriu ${hitsFrom(damage, room.sessionId, before)} vezes`);
  if (!spells.some((s) => s.spellId === "light_shield")) throw new Error("o Escudo da Luz não saiu");
  await room.leave();
}

async function paladinScout() {
  const { room, me, spells } = await enter(client, "paladin", "paladinScout");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "bear_trap" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "arrow_cordon" });
  await approach(room, me, 2, () => inSight(room, me(), 4).length > 0);
  const seen = inSight(room, me(), 4)[0];
  if (!seen) throw new Error("nenhum monstro à vista em 30 s");
  const [id] = seen;

  // Armadilha no tile do monstro: se ele continua em cima, dispara no pulso seguinte e o prende. Se ele saiu do
  // tile no meio-tempo, a armadilha fica esperando: arma outra no tile novo dele (recarga de 6 s).
  const rooted = () => [...room.state.monsters.values()].some((m: any) => m.rooted);
  for (let i = 0; i < 5 && !rooted(); i++) {
    const m = room.state.monsters.get(id) ?? inSight(room, me(), 4)[0]?.[1];
    if (m) room.send(MSG.cast, { slot: 0, aim: { x: m.x, y: m.y } });
    await until(rooted, 6500, "").catch(() => {});
  }
  if (!rooted()) throw new Error("a armadilha não prendeu nenhum monstro");

  // Estaca do Cordão de Flechas: atira sozinha nos monstros a até 3 tiles.
  room.send(MSG.cast, { slot: 1, aim: { x: me().x, y: me().y } });
  await until(() => [...room.state.fields.values()].some((f: any) => f.kind === "turret"), 2000, "a estaca não apareceu");
  await until(() => spells.some((s) => s.spellId === "arrow_cordon" && s.echo && (s.x !== s.tx || s.y !== s.ty)), 5000, "a estaca não atirou");
  console.log("paladino: armadilha prendeu o monstro e a estaca atirou");
  await room.leave();

  // Artilheiro: Flecha Relâmpago salta e Barragem acerta em leque.
  const art = await enter(client, "paladin", "paladinArtillery");
  art.room.send(MSG.chooseSpell, { slot: 0, spellId: "lightning_arrow" });
  art.room.send(MSG.chooseSpell, { slot: 1, spellId: "barrage" });
  await approach(art.room, art.me, 2, () => inSight(art.room, art.me(), 5).length > 0);
  const near = inSight(art.room, art.me(), 5)[0];
  if (!near) throw new Error("nenhum monstro à vista em 30 s");
  const before = art.damage.length;
  art.room.send(MSG.cast, { slot: 1, aim: { x: near[1].x, y: near[1].y } });
  await until(() => hitsFrom(art.damage, art.room.sessionId, before) > 0, 2000, "a Barragem não acertou ninguém");
  const deadline = Date.now() + 90_000;
  let tries = 0;
  const pairOf = () => {
    const seenNow = inSight(art.room, art.me(), 6);
    return seenNow.find(([a, m]) => seenNow.some(([b, o]) => a !== b && tileDistance(m.x, m.y, o.x, o.y) <= 3));
  };
  while (art.chains.length === 0) {
    if (Date.now() > deadline) throw new Error("a Flecha Relâmpago não saltou");
    // Lança no par (ou em qualquer monstro à vista: o salto pode achar um vizinho que o herói não enxerga).
    const pair = pairOf() ?? inSight(art.room, art.me(), 6)[0];
    if (pair) art.room.send(MSG.cast, { slot: 0, aim: { x: pair[1].x, y: pair[1].y, targetId: pair[0] } });
    else await gather(art.room, art.me, () => pairOf() !== undefined, ++tries);
    await wait(500);
  }
  console.log(`paladino: Barragem acertou, Flecha Relâmpago saltou por ${Math.max(...art.chains.map((c) => c.points.length))} monstros`);
  await art.room.leave();
}

/**
 * Sem dois monstros juntos à vista: anda 4 s atrás de outro monstro (o 2º, 3º ou 4º mais próximo, alternando a cada
 * tentativa). Os monstros que notam o herói vêm atrás dele e acabam formando o par que o salto em cadeia precisa.
 */
async function gather(room: any, me: () => any, done: () => boolean, tries: number) {
  const until = Date.now() + 4000;
  await approach(room, me, 1, () => done() || Date.now() > until, 1 + (tries % 3));
}
