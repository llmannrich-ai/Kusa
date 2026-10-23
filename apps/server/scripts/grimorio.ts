/**
 * Teste do Grimório: as regras no `packages/shared` e, sem servidor, as Maestrias em ação numa arena (`arena.ts`:
 * relógio falso, sorteios de seed fixa, monstro posto onde o teste precisa; nível 8 com o Grimório inteiro):
 *   - regras: toda magia tem Maestria, que só entra no último nível, e os efeitos sobem com o nível; as
 *     especializações do Grimório se excluem (comprar um lado fecha o outro) e as magias de um lado pedem o Traço;
 *     o nó de baixo pede a magia de cima no nível 1 (ganho com o uso, não com gold);
 *   - o Cavaleiro ergue o Escudo da Fé, que absorve o dano dos monstros antes da vida;
 *   - o Giro da Lâmina gira de novo sozinho (Maestria);
 *   - o Druida invoca 2 Lobos Espirituais e a Matilha de 4 (Maestria), e os lobos ferem os monstros;
 *   - o Disparo Perfurante vai em linha até o alcance inteiro (9 com a Maestria) e fere quem está nela;
 *   - o Disparo Certeiro que mata devolve metade da recarga (Maestria).
 * Veneno, lentidão e cadeia ficam no `efeitos`, com monstros que aguentam mais de um golpe.
 * Uso: npx tsx scripts/grimorio.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CLASS_IDS, MASTERIES, MASTERY_RANK, SPELL_LEVEL_XP, MONSTERS, SPELLS, TALENTS, activeTraits, blocksSight, coneTiles, generateDungeon, hasLineOfSight,
  knownSpells, lineTiles, spellAtRank, spellFacts, talentBlocker, talentTree,
  type SpellId, type SpellXp, type TalentRanks,
} from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

rules();
knightShield();
knightEcho();
druidSummons();
paladinShots();
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
  // Mortos-vivos (a luz do Paladino fere mais): o tipo de criatura decide.
  const undead = Object.values(MONSTERS).filter((m) => m.undead).map((m) => m.kind).sort().join();
  if (undead !== "bogBody,ghoul,mummy,skeleton,skeletonArcher,willOWisp,zombie") throw new Error(`mortos-vivos: ${undead}`);
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

function knightShield() {
  const a = arena({ classId: "knight" });
  check(a.p.spellRanks.get("holy_shield") === MASTERY_RANK, "o Grimório inteiro devia deixar o Escudo da Fé com a Maestria");
  a.choose("holy_shield", "steel_wall");
  check(a.p.spell1 === "holy_shield", `slot 1: ${a.p.spell1}`);
  a.cast(0);
  a.advance(100);
  const shield = a.p.barrier;
  // Nível 5: 40% × 1,5 = 60% da vida máxima, vezes a força extra das sinergias e do Tomo do Bastião.
  const bonus = a.p.spellBonus.get("holy_shield") ?? 0;
  const expected = Math.round(a.p.maxHp * spellAtRank(SPELLS.holy_shield, MASTERY_RANK, bonus).barrier!);
  check(bonus > 0, "o Escudo da Fé devia ter força extra com o Grimório inteiro");
  check(shield === expected, `escudo ${shield}, esperado ${expected} (força extra ${bonus}), vida máxima ${a.p.maxHp}`);
  check(a.p.maxBarrier === shield, "maxBarrier devia acompanhar o escudo novo");
  // Um monstro colado bate: o escudo absorve antes da vida.
  a.place("orc", 1, 0);
  const hp = a.p.hp;
  a.until(() => a.damage.some((d) => d.toPlayer && (d.absorbed ?? 0) > 0), 5000, "o escudo não absorveu nenhum golpe");
  const absorbed = a.damage.filter((d) => d.toPlayer).reduce((sum, d) => sum + (d.absorbed ?? 0), 0);
  console.log(`cavaleiro: escudo ${shield}, absorvido ${absorbed}, escudo agora ${a.p.barrier}, vida ${a.p.hp}/${a.p.maxHp}`);
  check(a.p.barrier < shield, "o escudo não diminuiu com o dano");
  check(a.p.hp === hp, `com escudo sobrando, a vida não devia cair (${hp} → ${a.p.hp})`);
}

function knightEcho() {
  const a = arena({ classId: "knight" });
  a.choose("blade_spin");
  a.place("orc", 1, 0);
  a.cast(0);
  // A Maestria repete o giro sozinha, sem outro toque: chega um `echo` do mesmo herói.
  const mine = () => a.spells.filter((s) => s.from === HERO && s.spellId === "blade_spin");
  a.until(() => mine().some((s) => s.echo), 2000, "o Giro da Lâmina não girou de novo");
  a.advance(2000);
  console.log(`cavaleiro: giro + repetição (${mine().length} efeitos)`);
  check(mine().length === 2, `esperava 2 giros, vieram ${mine().length}`);
}

function druidSummons() {
  const a = arena({ classId: "druid", monsterHp: 20 });
  a.choose("spirit_wolf", "wolf_pack");
  a.place("orc", 3, 0);
  const mine = () => [...a.state.summons.values()].filter((s) => s.owner === HERO);
  // Maestria: o Lobo Espiritual vem em dupla e a Matilha com 4 (o limite é 6 por jogador).
  a.cast(0);
  a.advance(100);
  check(mine().length === 2 && mine().every((s) => s.kind === "wolf"), `invocou ${mine().map((s) => s.kind)}`);
  a.cast(1);
  a.advance(100);
  check(mine().length === 6, `esperava 6 lobos, há ${mine().length}`);
  // Conjurar de novo (em recarga) não invoca mais.
  a.cast(0);
  a.advance(100);
  check(mine().length === 6, "invocou durante a recarga");
  // Os lobos caçam o monstro: algum golpe vem de uma criatura invocada.
  const bites = () => a.damage.filter((d) => !d.toPlayer && d.attacker.startsWith("s")).length;
  a.until(() => bites() > 0, 5000, "os lobos não atacaram");
  console.log(`druida: ${mine().length} lobos, ${bites()} mordidas`);
}

function paladinShots() {
  // Disparo Perfurante: a flecha vai até o fim da reta (alcance 9 com a Maestria) e fere quem está nela.
  {
    const a = arena({ classId: "paladin", monsterHp: 20 });
    a.choose("piercing_shot", "deadly_shot");
    const m = a.place("orc", 3, 0);
    a.hunt.target(HERO, { id: m.id });
    a.cast(0);
    a.until(() => a.spells.some((s) => s.spellId === "piercing_shot"), 2000, "o Disparo Perfurante não saiu");
    const shot = a.spells.find((s) => s.spellId === "piercing_shot")!;
    const range = spellAtRank(SPELLS.piercing_shot, MASTERY_RANK).range;
    const line = lineTiles(a.d, shot.x, shot.y, m.x, m.y, range);
    const end = line[line.length - 1];
    check(!!end && end.x === shot.tx && end.y === shot.ty, `a flecha devia ir até o fim da linha: ${JSON.stringify({ shot, end })}`);
    check(line.length === range || !a.free(end.x + Math.sign(end.x - shot.x), end.y), `a linha parou antes do alcance sem parede: ${line.length} tiles`);
    a.until(() => a.hitsFrom(0) > 0, 2000, "a flecha não acertou ninguém");
    console.log(`paladino: linha de ${line.length} tiles até ${shot.tx},${shot.ty}`);
  }
  // Disparo Certeiro (Maestria): no nível 8 ele mata um monstro comum e a recarga volta cortada pela metade.
  {
    const a = arena({ classId: "paladin" });
    a.choose("piercing_shot", "deadly_shot");
    const m = a.place("goblin", 3, 0);
    a.cast(1, m);
    a.until(() => !a.state.monsters.has(m.id), 2000, "o Disparo Certeiro não matou o goblin");
    a.until(() => a.cooldowns.length > 0, 1000, "o Disparo Certeiro não devolveu a recarga ao matar");
    const full = SPELLS.deadly_shot.cooldownMs;
    console.log(`paladino: Disparo Certeiro matou, recarga agora ${a.cooldowns[0].ms} ms (cheia ${full})`);
    check(a.cooldowns[0].slot === 1 && a.cooldowns[0].ms <= full / 2, `recarga devolvida errada: ${JSON.stringify(a.cooldowns[0])}`);
  }
}
