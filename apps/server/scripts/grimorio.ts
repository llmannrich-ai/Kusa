/**
 * Teste de fumaça do Grimório contra um servidor com KUSA_START_LEVEL=8 e KUSA_ALL_SPELLS=1
 * (slots abertos e todas as magias da classe no nível 5, com a Maestria):
 *   - regras: toda magia tem Maestria, que só entra no último nível, e os efeitos sobem com o nível; as
 *     especializações do Grimório se excluem (comprar um lado fecha o outro) e as magias de um lado pedem o Traço;
 *     o nó de baixo pede a magia de cima no nível 1 (ganho com o uso, não com gold);
 *   - o Cavaleiro ergue o Escudo da Fé, que absorve o dano dos monstros antes da vida;
 *   - o Giro da Lâmina gira de novo sozinho (Maestria);
 *   - o Druida invoca 2 Lobos Espirituais e a Matilha de 4 (Maestria), e os lobos ferem os monstros;
 *   - o Disparo Perfurante vai em linha até o alcance inteiro (9 com a Maestria) e fere quem está nela;
 *   - o Disparo Certeiro que mata devolve metade da recarga (Maestria).
 * Veneno, lentidão e cadeia ficam no `efeitos`, com monstros que aguentam mais de um golpe.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 PORT=2602 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/grimorio.ts http://localhost:2602
 */
import { Client } from "@colyseus/sdk";
import {
  CLASS_IDS, MASTERIES, MASTERY_RANK, SPELL_LEVEL_XP, MONSTERS, MSG, SPELLS, TALENTS, activeTraits, blocksSight, coneTiles, generateDungeon, hasLineOfSight,
  knownSpells, lineTiles, spellAtRank, spellFacts, talentBlocker, talentTree,
  type MonsterKind, type SpellId, type SpellXp, type TalentRanks,
} from "@kusa/shared";
import { approach, enter, inSight, nearestMonster, until, wait } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

rules();
await knightShield();
await knightEcho();
await druidSummons();
await paladinShots();
console.log("GRIMÓRIO OK");
process.exit(0);

/** Contas do `packages/shared` que cliente e servidor usam: linha, níveis dos efeitos e Maestrias. */
function rules() {
  const dungeon = generateDungeon(1);
  const { x, y } = dungeon.portal;
  const line = lineTiles(dungeon, x, y, x + 1, y, 7);
  if (line.length > 7 || line.some((t, i) => t.x !== x + i + 1 || t.y !== y)) throw new Error(`linha errada: ${JSON.stringify(line)}`);
  if (lineTiles(dungeon, x, y, x, y, 7).length !== 0) throw new Error("linha sem direção devia ser vazia");
  // A reta sempre passa pelo ponto mirado se o herói o enxerga (toque rápido num monstro visível nunca erra a direção).
  for (let ty = y - 7; ty <= y + 7; ty++) {
    for (let tx = x - 7; tx <= x + 7; tx++) {
      if ((tx === x && ty === y) || blocksSight(dungeon, tx, ty) || !hasLineOfSight(dungeon, x, y, tx, ty)) continue;
      if (!lineTiles(dungeon, x, y, tx, ty, 9).some((t) => t.x === tx && t.y === ty)) throw new Error(`a reta até ${tx},${ty} não passa por lá`);
    }
  }
  const venom = spellAtRank(SPELLS.venom_thorn, 2);
  if (Math.abs(venom.dot!.perSec - 0.3 * 1.2) > 1e-9 || venom.dot!.ms !== 4600) throw new Error(`veneno no nível 2: ${JSON.stringify(venom.dot)}`);
  if (spellAtRank(SPELLS.blizzard, 4).slow!.ms !== 5200) throw new Error("a lentidão devia durar mais no nível 4");
  // Toda magia tem Maestria, que só vale no último nível e muda algo além dos números do nível.
  for (const id of Object.keys(SPELLS) as SpellId[]) {
    const changes = MASTERIES[id].changes;
    if (Object.keys(changes).length === 0) throw new Error(`${id}: Maestria sem efeito`);
    if (!spellFacts(SPELLS[id], MASTERY_RANK).some((f) => f.startsWith("★ Maestria"))) throw new Error(`${id}: Maestria fora do texto`);
    if (spellFacts(SPELLS[id], MASTERY_RANK - 1).some((f) => f.includes("Maestria"))) throw new Error(`${id}: Maestria antes do nível ${MASTERY_RANK}`);
    const two = spellAtRank(SPELLS[id], MASTERY_RANK - 1);
    const three = spellAtRank(SPELLS[id], MASTERY_RANK);
    const changed = (Object.keys(changes) as (keyof typeof changes)[]).some((k) => JSON.stringify(two[k]) !== JSON.stringify(three[k]));
    if (!changed) throw new Error(`${id}: a Maestria não muda nada`);
  }
  if (spellAtRank(SPELLS.piercing_shot, MASTERY_RANK).range !== 9) throw new Error("a Maestria do Disparo Perfurante devia dar alcance 9");
  if (spellAtRank(SPELLS.spirit_wolf, MASTERY_RANK).summon!.count !== 2) throw new Error("a Maestria do Lobo Espiritual devia dar 2 lobos");
  specializations();
  // Leque (Barragem): passa pelo ponto mirado, não volta para trás e fica dentro do alcance.
  for (let ty = y - 4; ty <= y + 4; ty++) {
    for (let tx = x - 4; tx <= x + 4; tx++) {
      if ((tx === x && ty === y) || blocksSight(dungeon, tx, ty) || !hasLineOfSight(dungeon, x, y, tx, ty)) continue;
      const cone = coneTiles(dungeon, x, y, tx, ty, 5);
      if (!cone.some((t) => t.x === tx && t.y === ty)) throw new Error(`o leque até ${tx},${ty} não passa por lá`);
      if (cone.some((t) => (t.x - x) * (tx - x) + (t.y - y) * (ty - y) <= 0)) throw new Error(`o leque até ${tx},${ty} volta para trás`);
      if (cone.some((t) => Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) > 5)) throw new Error("o leque passou do alcance");
    }
  }
  // Mortos-vivos: o Esqueleto e o Afogado (a luz do Paladino fere mais).
  const undead = Object.values(MONSTERS).filter((m) => m.undead).map((m) => m.kind).sort().join();
  if (undead !== "bogBody,skeleton") throw new Error(`mortos-vivos: ${undead}`);
}

/** Especializações: os dois Traços de um ramo se excluem, cada lado tem 1 magia por slot e elas pedem o Traço. */
function specializations() {
  for (const classId of CLASS_IDS) {
    for (const t of talentTree(classId).filter((n) => n.kind === "trait")) {
      const rival = TALENTS[t.exclusiveWith!];
      if (!rival || rival.exclusiveWith !== t.id || rival.side === t.side || rival.col !== t.col) throw new Error(`${t.id}: lado rival errado`);
      const side = talentTree(classId).filter((n) => n.kind === "spell" && n.col === t.col && n.side === t.side);
      const slots = side.map((n) => SPELLS[n.spellId!].slot).sort().join(",");
      if (slots !== "0,1") throw new Error(`${t.id}: o lado devia ter uma magia de cada slot (tem ${slots})`);
    }
  }
  // Conta com o tronco do ramo Mira comprado: os dois lados abertos; comprou um, o outro fecha, com as magias dele.
  const base: TalentRanks = { paladin_damage: 1, paladin_piercing_shot: 1, paladin_stun_arrow: 1, paladin_deadly_shot: 1 };
  // Comprado não basta: o Traço pede o Disparo Certeiro no nível 1, que vem do uso nas hunts.
  if (!talentBlocker(TALENTS.paladin_eagle_eye, base, {})?.includes("Disparo Certeiro no nível 1")) throw new Error("o Traço devia pedir a magia de cima no nível 1");
  const xp: SpellXp = { paladin_deadly_shot: SPELL_LEVEL_XP[0] };
  if (talentBlocker(TALENTS.paladin_eagle_eye, base, xp) || talentBlocker(TALENTS.paladin_light_step, base, xp)) throw new Error("os dois lados deviam estar abertos");
  if (!talentBlocker(TALENTS.paladin_hunter_mark, base, xp)) throw new Error("a magia do lado não pode sair sem o Traço");
  const picked = { ...base, paladin_eagle_eye: 1 };
  if (!talentBlocker(TALENTS.paladin_light_step, picked, xp)?.includes("Atirador de Elite")) throw new Error("o outro lado devia fechar");
  if (talentBlocker(TALENTS.paladin_hunter_mark, picked, xp)) throw new Error("a magia do lado escolhido devia abrir");
  if (!talentBlocker(TALENTS.paladin_evasive_roll, picked, xp)) throw new Error("a magia do outro lado devia continuar fechada");
  // A raiz (magia inicial) já vem no nível 1: os primeiros nós de cada ramo abrem numa conta nova.
  if (talentBlocker(TALENTS.paladin_damage, {}, {})) throw new Error("a raiz devia abrir os nós de baixo");
  if (talentBlocker(TALENTS.paladin_piercing_shot, base, xp) !== "Já aprendida") throw new Error("magia comprada não se compra de novo");
  if (activeTraits("paladin", picked).join() !== "eagle_eye") throw new Error(`Traços ativos: ${activeTraits("paladin", picked)}`);
  if (!knownSpells("paladin", { ...picked, paladin_hunter_mark: 1 }).includes("hunter_mark")) throw new Error("a magia do lado devia virar opção na hunt");
}

async function knightShield() {
  const { room, me, damage } = await enter(client, "knight", "knightShield");
  if (me().spellRanks.get("holy_shield") !== MASTERY_RANK) throw new Error("o servidor precisa de KUSA_ALL_SPELLS=1");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "holy_shield" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "steel_wall" });
  await wait(200);
  if (me().spell1 !== "holy_shield") throw new Error(`slot 1: ${me().spell1}`);

  room.send(MSG.cast, { slot: 0 });
  await wait(200);
  const shield = me().barrier;
  // Nível 5: 40% × 1,5 = 60% da vida máxima.
  if (shield !== Math.round(me().maxHp * 0.6)) throw new Error(`escudo ${shield}, vida máxima ${me().maxHp}`);
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

async function knightEcho() {
  const { room, me, spells } = await enter(client, "knight", "knightEcho");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "blade_spin" });
  await approach(room, me, 1, () => nearestMonster(room, me()) <= 1);
  room.send(MSG.cast, { slot: 0 });
  // A Maestria repete o giro sozinha, sem outro toque: chega um `echo` do mesmo herói.
  const mine = () => spells.filter((s) => s.from === room.sessionId && s.spellId === "blade_spin");
  await until(() => mine().some((s) => s.echo), 2000, "o Giro da Lâmina não girou de novo");
  console.log(`cavaleiro: giro + repetição (${mine().length} efeitos)`);
  if (mine().length !== 2) throw new Error(`esperava 2 giros, vieram ${mine().length}`);
  await room.leave();
}

async function druidSummons() {
  const { room, me, damage } = await enter(client, "druid", "druidSummons");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "spirit_wolf" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "wolf_pack" });
  // Chega perto dos monstros antes de invocar: os lobos têm tempo de vida e sumiam no caminho.
  await approach(room, me, 4, () => nearestMonster(room, me()) <= 4);
  room.send(MSG.cast, { slot: 0 });
  await wait(200);
  const mine = () => [...room.state.summons.values()].filter((s: any) => s.owner === room.sessionId);
  // Maestria: o Lobo Espiritual vem em dupla e a Matilha com 4 (o limite é 6 por jogador).
  if (mine().length !== 2 || mine().some((s: any) => s.kind !== "wolf")) throw new Error(`invocou ${mine().map((s: any) => s.kind)}`);
  room.send(MSG.cast, { slot: 1 });
  await wait(200);
  if (mine().length !== 6) throw new Error(`esperava 6 lobos, há ${mine().length}`);
  // Conjurar de novo (em recarga) não invoca mais.
  room.send(MSG.cast, { slot: 0 });
  await wait(200);
  if (mine().length !== 6) throw new Error("invocou durante a recarga");

  // Os lobos caçam os monstros por perto: algum golpe vem de uma criatura invocada.
  await approach(room, me, 1, () => damage.some((d) => !d.toPlayer && d.attacker.startsWith("s")));
  const bites = damage.filter((d) => !d.toPlayer && d.attacker.startsWith("s")).length;
  console.log(`druida: ${mine().length} lobos, ${bites} mordidas`);
  if (bites === 0) throw new Error("os lobos não atacaram");
  await room.leave();
}

async function paladinShots() {
  const { room, me, damage, spells, cooldowns } = await enter(client, "paladin", "paladinShots");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "piercing_shot" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "deadly_shot" });

  // Disparo Perfurante: a flecha vai até o fim da reta (alcance 9 com a Maestria) e fere quem está nela.
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  room.send(MSG.cast, { slot: 0 });
  await until(() => spells.some((s) => s.spellId === "piercing_shot"), 2000, "o Disparo Perfurante não saiu");
  const shot = spells.find((s) => s.spellId === "piercing_shot")!;
  const line = lineTiles(generateDungeon(room.state.seed), shot.x, shot.y, shot.tx, shot.ty, spellAtRank(SPELLS.piercing_shot, MASTERY_RANK).range);
  const end = line[line.length - 1];
  if (!end || end.x !== shot.tx || end.y !== shot.ty) throw new Error(`a flecha devia ir até o fim da linha: ${JSON.stringify({ shot, end })}`);
  await until(() => damage.some((d) => d.attacker === room.sessionId && !d.toPlayer), 2000, "a flecha não acertou ninguém");
  console.log(`paladino: linha de ${line.length} tiles até ${shot.tx},${shot.ty}`);

  // Disparo Certeiro (Maestria): no nível 8 ele mata um monstro comum e o servidor manda a recarga cortada.
  const deadline = Date.now() + 60_000;
  while (cooldowns.length === 0) {
    if (Date.now() > deadline) throw new Error("o Disparo Certeiro não devolveu a recarga ao matar");
    await approach(room, me, 2, () => inSight(room, me(), 8).length > 0);
    const common = inSight(room, me(), 8).find(([, m]) => MONSTERS[m.kind as MonsterKind].rank === "common");
    if (common) room.send(MSG.cast, { slot: 1, aim: { x: common[1].x, y: common[1].y, targetId: common[0] } });
    await wait(800);
  }
  const full = SPELLS.deadly_shot.cooldownMs;
  console.log(`paladino: Disparo Certeiro matou, recarga agora ${cooldowns[0].ms} ms (cheia ${full})`);
  if (cooldowns[0].slot !== 1 || cooldowns[0].ms > full / 2) throw new Error(`recarga devolvida errada: ${JSON.stringify(cooldowns[0])}`);
  await room.leave();
}
