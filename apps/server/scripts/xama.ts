/**
 * Teste do Xamã Orc (Fase 1, docs/CLASSE_XAMA_ORC.md), sem servidor: as regras do `packages/shared` e, numa arena
 * (`arena.ts`: relógio falso, sorteios de seed fixa, monstro posto onde o teste precisa), as duas magias iniciais:
 *   - regras: a classe só abre com Vorgak vencido por qualquer personagem (as outras sempre abertas); veste cajado,
 *     varinha, vestes arcanas e escudo, e não espada nem arco; o Grimório da Fase 1 tem as 2 iniciais grátis, as
 *     áureas e só o Tomo do ramo que tem magia;
 *   - Totem da Brasa: o totem fica no chão e lança brasa sozinho no monstro perto (dano de fogo do herói, sem ele
 *     atacar); cabem 2 ao mesmo tempo (o terceiro tira o mais antigo) e somem no fim do tempo; na Maestria, a brasa queima;
 *   - Tambor de Guerra: o herói e o aliado perto batem mais forte (e o básico fica mais rápido), o aliado longe não
 *     ganha nada, a criatura de um aliado perto também é reforçada e o monstro colado fica lento; na Maestria, cura;
 *   - Fase 2, a Horda: os batedores aparecem com a arte do clã e lutam; o Comando do capitão e o totem do dono
 *     reforçam os orcs perto; o arqueiro recua do monstro colado; o Ogro da Forja queima e empurra; o Totem do
 *     Chamado chama batedores até o máximo; o Totem do Lodo deixa lento; a Lança de Brasa queima a reta e a Batida
 *     de Guerra atordoa. Cada magia no nível 0 (comprada, sem uso), pelo Grimório (`talents`);
 *   - Fase 3, especializações, costelas e Ápices: Sangue do Clã fortalece as criaturas; a Corrente da Submissão
 *     converte o monstro ferido (e não o mini-boss), sem XP; o Juramento de Sangue levanta o monstro morto perto do
 *     totem; Mãos de Entalhe põe 3 totens que duram mais; o Totem nas Costas anda com o xamã; o Totem Vulcânico explode
 *     no fim; a Investida do Javali leva o xamã ao monstro; o Círculo de Totens deixa lento e queima; a Fúria de Brasa
 *     cura e empurra; o Ritmo de Guerra alonga o tambor; a Marcha do Clã solta e protege da prisão e da lentidão; o
 *     Chefe de Guerra comanda; a Fúria da Horda chama batedores e acelera as criaturas.
 * Uso: npx tsx scripts/xama.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  BOUND_POWER, CLAN_TOTEM_BONUS, CLASSES, TALENTS, CLASS_IDS, CLASS_UNLOCK, ITEMS, MONSTERS, SPELLS, SUMMONS, classUnlocked, talentTree, tileDistance,
  type MonsterKind, type SpellId,
} from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const failures: string[] = [];
function run(name: string, test: () => void) {
  try {
    test();
    console.log(`✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`✘ ${name}: ${(err as Error).message}`);
  }
}

run("regras da classe", rules);
run("Totem da Brasa", totem);
run("Totem da Brasa: Maestria", totemMastery);
run("Tambor de Guerra", drum);
run("Tambor de Guerra: Maestria", drumMastery);
run("Horda: batedores e Comando do capitão", hordeCommand);
run("Horda: bônus perto do totem", hordeTotem);
run("Horda: o arqueiro recua", archerRetreat);
run("Horda: Ogro da Forja", forgeOgre);
run("Totem do Chamado", callTotem);
run("Totem do Lodo", mudTotem);
run("Lança de Brasa e Batida de Guerra", emberSpells);
run("Fase 3: regras do Grimório", phase3Rules);
run("Senhor da Horda: Sangue do Clã e Chefe de Guerra", hordeLord);
run("Domador de Sangue: Corrente da Submissão", submission);
run("Domador de Sangue: Juramento de Sangue", bloodOath);
run("Entalhador: Mãos de Entalhe e Totem Vulcânico", carver);
run("Nômade: Totem nas Costas, Investida e Círculo", nomad);
run("Coração de Brasa: Fúria de Brasa", emberHeart);
run("Tamboreiro: Ritmo de Guerra e Marcha do Clã", drummer);
run("Ápice: Fúria da Horda", hordeRoar);

if (failures.length) {
  console.error(`\n${failures.length} falha(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("XAMÃ OK");
process.exit(0);

function rules() {
  const boss = CLASS_UNLOCK.shaman as MonsterKind;
  check(boss === "emberWarlord" && !!MONSTERS[boss], `o Xamã abre com ${boss}, que devia ser Vorgak`);
  check(!classUnlocked([], "shaman"), "o Xamã devia começar trancado");
  check(!classUnlocked(["ogreKing", "fortress"], "shaman"), "outro boss não abre o Xamã");
  check(classUnlocked(["emberWarlord"], "shaman"), "Vorgak vencido devia abrir o Xamã");
  for (const id of CLASS_IDS) if (id !== "shaman") check(classUnlocked([], id), `${id} devia estar sempre aberto`);
  check(CLASSES.shaman.attackRange === 3, "o básico do Xamã tem alcance 3");

  const wears = (id: string) => {
    check(!!ITEMS[id], `item ${id} fora do catálogo`);
    return ITEMS[id].classes?.includes("shaman") ?? true;
  };
  for (const id of ["weapon-staff-1-common", "weapon-wand-1-common", "armor-arcane-1-common", "shield-shield-1-common"]) {
    check(wears(id), `o Xamã devia vestir ${id}`);
  }
  for (const id of ["weapon-sword-1-common", "weapon-bow-1-common", "armor-war-1-common"]) check(!wears(id), `o Xamã não veste ${id}`);

  const tree = talentTree("shaman");
  const free = tree.filter((t) => t.freeRank > 0).map((t) => t.spellId).sort();
  check(JSON.stringify(free) === JSON.stringify(["ember_totem", "war_drum"]), `iniciais grátis erradas: ${free}`);
  const tomes = tree.filter((t) => t.kind === "tome");
  check(tomes.map((t) => t.col).sort().join() === "0,1,2", `um Tomo por ramo: ${tomes.map((t) => t.id)}`);
  check(tree.filter((t) => t.kind === "aura").length === 4, "o Grimório tem as 4 áureas");
  // Fase 2: o tronco de cada ramo, na ordem, com o preço pela profundidade.
  const trunk = (col: number) => tree.filter((t) => t.col === col && t.lane === 0 && t.row > 0).sort((a, b) => a.row - b.row).map((t) => t.spellId ?? t.aura?.stat);
  check(trunk(0).join() === "clan_scouts,damage,clan_spearmen,clan_archers,clan_captain", `tronco da Horda: ${trunk(0)}`);
  check(trunk(1).join() === "mana,mud_totem,call_totem,speed,grand_totem", `tronco dos Totens: ${trunk(1)}`);
  check(trunk(2).join() === "war_drum,ember_lance,war_stomp,hp,forge_ogre", `tronco da Brasa: ${trunk(2)}`);
  const summons = tree.filter((t) => t.spellId && t.lane === 0 && t.row <= 5 && (SPELLS[t.spellId].summon || SPELLS[t.spellId].field?.spawn)).map((t) => t.spellId);
  check(summons.length === 6, `6 magias chamam o clã na Fase 2: ${summons}`);
  for (const kind of ["clanScout", "clanSpearman", "clanArcher", "clanCaptain", "forgeOgre"] as const) {
    check(!!SUMMONS[kind].look && !!MONSTERS[SUMMONS[kind].look!] && !!SUMMONS[kind].clan, `${kind} devia ter a arte de um monstro do clã`);
  }
  check(tree.filter((t) => t.kind === "gift").map((t) => t.col).sort().join() === "0,1,2", "um Dom por ramo");
  check(SPELLS.ember_totem.classId === "shaman" && SPELLS.war_drum.classId === "shaman", "as iniciais são do Xamã");
}

/** Totens no chão do herói. */
function totemsOf(a: ReturnType<typeof arena>) {
  return [...a.state.fields.values()].filter((f) => f.owner === HERO && f.spellId === "ember_totem");
}

function totem() {
  const a = arena({ classId: "shaman", allSpells: false, monsterHp: 20 });
  a.choose("ember_totem", "war_drum");
  const m = a.spawn("orcGrunt" as MonsterKind, 2);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  const before = a.damage.length;
  a.cast(0, { x: a.p.x, y: a.p.y });
  check(totemsOf(a).length === 1 && totemsOf(a)[0].style === "totem", "o totem não ficou no chão");
  a.advance(3000);
  const embers = a.damage.slice(before).filter((x) => x.attacker === HERO && !x.toPlayer && x.fx === "fire");
  check(embers.length >= 2, `o totem devia lançar brasa sozinho (${embers.length} brasas em 3 s)`);
  check(m.hp < m.maxHp, "a brasa não feriu o monstro");

  // Cabem 2: o terceiro tira o mais antigo.
  const first = totemsOf(a)[0].id;
  a.ready();
  a.cast(0, { x: a.p.x + 1, y: a.p.y });
  a.ready();
  a.cast(0, { x: a.p.x - 1, y: a.p.y });
  const now = totemsOf(a);
  check(now.length === 2, `cabem 2 totens, há ${now.length}`);
  check(!now.some((f) => f.id === first), "o totem mais antigo devia sair");

  a.advance(11_000);
  check(totemsOf(a).length === 0, "os totens deviam sumir no fim do tempo");
}

function totemMastery() {
  const a = arena({ classId: "shaman", allSpells: true, monsterHp: 20 });
  a.choose("ember_totem", "war_drum");
  const m = a.spawn("orcGrunt" as MonsterKind, 2);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.cast(0, { x: a.p.x, y: a.p.y });
  a.until(() => m.dot === "burn", 3000, "na Maestria, a brasa do totem devia queimar");
}

function drum() {
  const a = arena({ classId: "shaman", allSpells: false, monsterHp: 20, allies: [{ classId: "knight" }, { classId: "druid" }] });
  a.choose("ember_totem", "war_drum");
  const near = a.state.players.get("h2")!;
  const far = a.state.players.get("h3")!;
  // O aliado longe fica fora do raio do tambor (4 tiles).
  far.x = a.p.x + 6;
  far.y = a.p.y;
  check(a.free(far.x, far.y), "arena: o tile do aliado longe devia estar livre");
  // Uma criatura do druida perto do xamã.
  const druid = a.state.players.get("h3")!;
  a.any.summon("h3", druid, SPELLS.spirit_wolf, 0);
  const wolf = [...a.state.summons.values()].find((s) => s.owner === "h3")!;
  wolf.x = a.p.x;
  wolf.y = a.p.y + 1;
  const colado = a.spawn("orcGrunt" as MonsterKind, 1);
  a.brain(colado).stunnedUntil = Number.MAX_SAFE_INTEGER;

  const bonus = (id: string) => a.any.damageBonus(a.seat(id), a.state.players.get(id));
  const heroBefore = bonus(HERO);
  const nearBefore = bonus("h2");
  const farBefore = bonus("h3");
  a.cast(1);
  check(bonus(HERO) > heroBefore + 0.1, `o tambor devia reforçar o próprio xamã (${heroBefore} → ${bonus(HERO)})`);
  check(bonus("h2") > nearBefore + 0.1, `o tambor devia reforçar o aliado perto (${nearBefore} → ${bonus("h2")})`);
  check(bonus("h3") === farBefore, "o aliado longe não devia ganhar nada");
  check(a.seat(HERO).rallyHaste === 0.25, "o básico devia ficar 25% mais rápido");
  const wolfBrain = a.any.summonBrains.get(wolf.id);
  check(wolfBrain.rallyUntil > a.now() && wolfBrain.hasteUntil > a.now(), "a criatura perto devia ser reforçada");
  check(colado.slowed, "o monstro colado devia ficar lento");

  // O básico sai mais rápido com o tambor: a próxima recarga é menor que o normal (1 s).
  a.any.seats.get(HERO).nextAttackAt = 0;
  a.hunt.attacking(HERO, { on: true });
  a.advance(100);
  const gap = a.seat(HERO).nextAttackAt - a.now();
  check(gap > 0 && gap < 900, `com o tambor, a recarga do básico devia cair (${gap} ms)`);
  a.hunt.attacking(HERO, { on: false });

  a.advance(7000);
  check(bonus(HERO) === heroBefore, "o reforço devia acabar no fim do tempo");
}

function drumMastery() {
  const a = arena({ classId: "shaman", allSpells: true, allies: [{ classId: "knight" }] });
  a.choose("ember_totem", "war_drum");
  const ally = a.state.players.get("h2")!;
  ally.hp = Math.round(ally.maxHp / 2);
  const hp = ally.hp;
  a.cast(1);
  check(ally.hp > hp, `na Maestria, o tambor devia curar o aliado (${hp} → ${ally.hp})`);
}

/** Xamã no nível 8 com estas magias compradas (nível 0, sem uso) e monstros que aguentam apanhar. */
function horde(slot1: SpellId, slot2: SpellId, bought: string[]) {
  const talents = Object.fromEntries(bought.map((id) => [`shaman_${id}`, 1]));
  const a = arena({ classId: "shaman", allSpells: false, monsterHp: 40, talents });
  a.choose(slot1, slot2);
  return a;
}

function clanOf(a: ReturnType<typeof arena>, kind: string) {
  return [...a.state.summons.values()].filter((s) => s.owner === HERO && s.kind === kind);
}

function hordeCommand() {
  const a = horde("clan_scouts", "clan_captain", ["clan_scouts", "clan_captain"]);
  const m = a.spawn("orcGrunt" as MonsterKind, 3);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.cast(0);
  const scouts = clanOf(a, "clanScout");
  check(scouts.length === 2, `devia chamar 2 batedores, chamou ${scouts.length}`);
  const scout = scouts[0];
  check(a.any.clanBonus(scout, SUMMONS.clanScout, a.now()).damage === 0, "sem capitão, sem Comando");
  a.ready();
  a.cast(1);
  const captain = clanOf(a, "clanCaptain")[0];
  check(!!captain, "o capitão devia aparecer");
  captain.x = scout.x;
  captain.y = scout.y + 1;
  if (!a.free(captain.x, captain.y)) { captain.x = scout.x + 1; captain.y = scout.y; }
  const bonus = a.any.clanBonus(scout, SUMMONS.clanScout, a.now());
  check(bonus.damage >= 0.15 && bonus.haste >= 0.15, `o capitão perto devia comandar o batedor (${JSON.stringify(bonus)})`);
  check(a.any.clanBonus(captain, SUMMONS.clanCaptain, a.now()).damage === 0, "o capitão não comanda a si mesmo");
  const before = m.hp;
  a.until(() => m.hp < before, 6000, "os orcs do clã deviam ferir o monstro");
  check(a.damage.some((x) => x.attacker === scout.id || x.attacker === captain.id), "o golpe devia sair do orc do clã");
}

function hordeTotem() {
  const a = horde("ember_totem", "clan_archers", ["clan_archers"]);
  a.cast(1);
  const archer = clanOf(a, "clanArcher")[0];
  check(!!archer, "o arqueiro devia aparecer");
  check(a.any.clanBonus(archer, SUMMONS.clanArcher, a.now()).damage === 0, "longe de totem, sem bônus");
  a.cast(0, { x: archer.x, y: archer.y });
  const bonus = a.any.clanBonus(archer, SUMMONS.clanArcher, a.now()).damage;
  check(bonus === CLAN_TOTEM_BONUS.damage, `perto do totem do dono, o orc ganha +${CLAN_TOTEM_BONUS.damage} (${bonus})`);
}

function archerRetreat() {
  const a = horde("ember_totem", "clan_archers", ["clan_archers"]);
  a.cast(1);
  const archer = clanOf(a, "clanArcher")[0];
  // O monstro colado no arqueiro (atordoado, para não andar atrás dele).
  let m;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const x = archer.x + dx, y = archer.y + dy;
    if (a.free(x, y) && !(x === a.p.x && y === a.p.y) && ![...a.state.summons.values()].some((s) => s.x === x && s.y === y)) {
      m = a.any.addMonster("orcGrunt", x, y, 0);
      break;
    }
  }
  check(!!m, "arena: sem lugar para o monstro colado no arqueiro");
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.until(() => tileDistance(archer.x, archer.y, m.x, m.y) >= 2, 2000, "o arqueiro devia recuar do monstro colado");
  const before = m.hp;
  a.until(() => m.hp < before, 5000, "depois de recuar, o arqueiro devia atirar");
}

function forgeOgre() {
  const a = horde("ember_totem", "forge_ogre", ["forge_ogre"]);
  const m = a.spawn("orcGrunt" as MonsterKind, 2);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.cast(1);
  check(clanOf(a, "forgeOgre").length === 1, "o Ogro da Forja devia aparecer");
  a.until(() => m.dot === "burn", 6000, "o malho em brasa devia queimar o monstro");
}

function callTotem() {
  const a = horde("ember_totem", "call_totem", ["call_totem"]);
  a.cast(1, { x: a.p.x + 1, y: a.p.y });
  const called = () => [...a.state.summons.values()].filter((s) => s.owner === HERO && a.any.summonBrains.get(s.id)?.spellId === "call_totem");
  a.advance(1000);
  check(called().length === 1, `o totem devia chamar o primeiro batedor logo (${called().length})`);
  a.advance(8000);
  check(called().length === 3, `em 9 s, 3 batedores (${called().length})`);
  a.advance(2500);
  check(called().length <= 3, "nunca passa de 3 chamados");
  check(called().every((s) => s.kind === "clanScout"), "o chamado é de batedores");
}

function mudTotem() {
  const a = horde("mud_totem", "war_drum", ["mud_totem"]);
  const m = a.spawn("orcGrunt" as MonsterKind, 3);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.cast(0, { x: m.x, y: m.y });
  check([...a.state.fields.values()].some((f) => f.spellId === "mud_totem" && f.style === "totem"), "o Totem do Lodo devia ficar no chão");
  a.until(() => m.slowed, 1500, "o lodo devia deixar o monstro lento");
}

function emberSpells() {
  const a = horde("ember_lance", "war_stomp", ["ember_lance", "war_stomp"]);
  const far = a.spawn("orcGrunt" as MonsterKind, 3);
  a.brain(far).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.cast(0, far);
  a.until(() => far.dot === "burn" && far.hp < far.maxHp, 2000, "a Lança de Brasa devia ferir e queimar");
  a.state.monsters.clear();
  a.any.brains.clear();
  const near = a.spawn("orcGrunt" as MonsterKind, 1);
  a.cast(1);
  check(near.stunned && near.hp < near.maxHp, "a Batida de Guerra devia ferir e atordoar quem está colado");
}

function phase3Rules() {
  const tree = talentTree("shaman");
  const specs = tree.filter((t) => t.kind === "trait").map((t) => t.traitId).sort();
  check(specs.join() === "blood_oath,carver_hands,clan_blood,totem_pack,vorgak_legacy,war_rhythm", `Traços: ${specs}`);
  for (const t of tree.filter((n) => n.kind === "trait")) {
    check(TALENTS[t.exclusiveWith!]?.col === t.col, `${t.id}: o outro lado devia ser do mesmo ramo`);
  }
  const apices = tree.filter((t) => t.spellId && SPELLS[t.spellId].slot === 2 && t.row > 0).map((t) => t.spellId).sort();
  check(apices.join() === "ancestor_circle,forge_rain,horde_roar", `Ápices: ${apices}`);
  check(tree.length === 48, `48 nós no Grimório do Xamã (${tree.length})`);
}

/** Arena do xamã com estas magias e Traços comprados (`slot3`: a magia do slot 3, no nível 12). */
function spec(slot1: SpellId, slot2: SpellId, bought: string[], options: { allies?: { classId: "knight" }[]; slot3?: SpellId } = {}) {
  const talents = Object.fromEntries(bought.map((id) => [`shaman_${id}`, 1]));
  const a = arena({ classId: "shaman", allSpells: false, monsterHp: 40, talents, allies: options.allies, startLevel: options.slot3 ? 12 : 8 });
  a.choose(slot1, slot2);
  if (options.slot3) a.hunt.chooseSpell(HERO, { slot: 2, spellId: options.slot3 });
  return a;
}

function hordeLord() {
  const plain = spec("clan_scouts", "war_drum", ["clan_scouts"]);
  plain.cast(0);
  const weak = clanOf(plain, "clanScout")[0].maxHp;
  const a = spec("clan_berserkers", "warlord_call", ["clan_blood", "clan_berserkers", "warlord_call", "clan_scouts"]);
  a.cast(0);
  const berserkers = clanOf(a, "clanBerserker");
  check(berserkers.length === 2, `2 berserkers (${berserkers.length})`);
  const ratio = (berserkers[0].maxHp / weak) / (0.6 / 0.25);
  check(ratio > 1.2, `o Sangue do Clã devia dar +25% de vida (${ratio.toFixed(2)})`);
  a.cast(1);
  const warlord = clanOf(a, "clanWarlord")[0];
  check(!!warlord, "o Chefe de Guerra devia aparecer");
  warlord.x = berserkers[0].x;
  warlord.y = berserkers[0].y + 1;
  check(a.any.clanBonus(berserkers[0], SUMMONS.clanBerserker, a.now()).damage >= 0.2, "o Chefe de Guerra comanda +20%");
}

function submission() {
  const a = spec("submission_chain", "war_drum", ["blood_oath", "submission_chain"]);
  const xp = a.p.xp;
  const m = a.spawn("orcGrunt" as MonsterKind, 2);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  m.hp = Math.round(m.maxHp * 0.2);
  a.cast(0, m);
  a.until(() => !a.state.monsters.has(m.id), 1500, "o monstro ferido devia ser convertido");
  const bound = [...a.state.summons.values()].filter((s) => s.owner === HERO && s.kind === "bound");
  check(bound.length === 1 && bound[0].look === "orcGrunt", `um aliado com a arte do monstro (${JSON.stringify(bound.map((b) => b.look))})`);
  check(bound[0].maxHp === Math.round(m.maxHp * BOUND_POWER.hp), "o convertido fica com parte da vida do monstro");
  check(a.p.xp === xp, "converter não rende XP");
  check((a.seat().stats.converted.orcGrunt ?? 0) === 1, "a telemetria conta a conversão");
  // Mini-boss não se converte.
  a.ready();
  const boss = a.spawn("orcWarlord" as MonsterKind, 2);
  a.brain(boss).stunnedUntil = Number.MAX_SAFE_INTEGER;
  boss.hp = Math.round(boss.maxHp * 0.2);
  a.cast(0, boss);
  a.advance(1000);
  check(a.state.monsters.has(boss.id), "o mini-boss não pode ser convertido");
}

function bloodOath() {
  const a = spec("ember_totem", "war_drum", ["blood_oath"]);
  const m = a.spawn("orcGrunt" as MonsterKind, 2);
  a.cast(0, { x: m.x, y: m.y });
  const random = a.any.random;
  a.any.random = () => 0;
  a.kill(m);
  a.any.random = random;
  const bound = [...a.state.summons.values()].filter((s) => s.owner === HERO && s.kind === "bound");
  check(bound.length === 1 && bound[0].look === "orcGrunt", "o monstro morto perto do totem devia se levantar aliado");
}

function carver() {
  const a = spec("ember_totem", "volcanic_totem", ["carver_hands", "thunder_totem", "volcanic_totem"]);
  for (const dx of [0, 1, -1]) { a.ready(); a.cast(0, { x: a.p.x + dx, y: a.p.y + 2 }); }
  check(totemsOf(a).length === 3, `com Mãos de Entalhe cabem 3 totens (${totemsOf(a).length})`);
  const until = a.any.fieldBrains.get(totemsOf(a)[0].id).until - a.now();
  check(until > 14_000, `o totem dura 50% mais (${until} ms)`);
  // Totem Vulcânico: explode no fim e fere quem está perto (sem os Totens da Brasa de antes atirando no monstro).
  a.state.monsters.clear();
  a.any.brains.clear();
  for (const f of totemsOf(a)) a.any.removeField(f.id);
  const m = a.spawn("orcGrunt" as MonsterKind, 3);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.ready();
  a.cast(1, { x: m.x, y: m.y });
  a.advance(6000);
  check(m.hp === m.maxHp, "o vulcão só fere quando explode");
  a.until(() => m.hp < m.maxHp && m.dot === "burn", 7000, "o Totem Vulcânico devia explodir no fim e queimar");
}

function nomad() {
  const a = spec("boar_charge", "totem_ring", ["totem_pack", "boar_charge", "totem_ring", "ember_totem"]);
  // Totem nas Costas: o último totem anda com o xamã.
  a.hunt.chooseSpell(HERO, { slot: 0, spellId: "boar_charge" });
  a.any.placeField(HERO, a.p, a.seat(), SPELLS.ember_totem, 0, a.p.x + 1, a.p.y, 0);
  const totem = totemsOf(a)[0];
  a.p.x += 1;
  a.advance(300);
  check(totem.x === a.p.x && totem.y === a.p.y, "o totem devia andar com o xamã");
  // Investida do Javali: corre até o monstro.
  const m = a.spawn("orcGrunt" as MonsterKind, 3);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.cast(0, m);
  a.until(() => m.hp < m.maxHp, 1500, "a Investida do Javali devia ferir o monstro");
  check(tileDistance(a.p.x, a.p.y, m.x, m.y) <= 2, "o xamã devia chegar colado (e o monstro, empurrado 1 tile)");
  // Círculo de Totens: lento e queimando em volta.
  a.cast(1);
  a.until(() => m.slowed && m.dot === "burn", 2000, "o Círculo de Totens devia deixar lento e queimar");
}

function emberHeart() {
  const a = spec("ember_rift", "ember_fury", ["vorgak_legacy", "ember_rift", "ember_fury"]);
  const m = a.spawn("orcGrunt" as MonsterKind, 1);
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  a.p.hp = Math.round(a.p.maxHp / 2);
  const hp = a.p.hp;
  a.cast(1);
  check(a.p.hp > hp, "a Fúria de Brasa devia curar o xamã");
  check(m.hp < m.maxHp && m.dot === "burn", "a Fúria de Brasa devia ferir e queimar");
  check(tileDistance(a.p.x, a.p.y, m.x, m.y) >= 2, "a Fúria de Brasa devia empurrar o monstro");
}

function drummer() {
  const a = spec("blood_drum", "clan_march", ["war_rhythm", "blood_drum", "clan_march"], { allies: [{ classId: "knight" }] });
  a.cast(0);
  const left = a.seat(HERO).rallyUntil - a.now();
  check(left >= 7000, `o Ritmo de Guerra devia alongar o tambor (${left} ms)`);
  // Marcha do Clã: solta o aliado preso e lento, e ninguém prende nem deixa lento enquanto dura.
  const ally = a.seat("h2");
  ally.effects.root = { until: a.now() + 5000, stacks: 1 };
  a.any.slowHero("h2", 0.5, 5000);
  const before = a.any.moveSpeed(a.p, a.seat(HERO), a.now());
  a.cast(1);
  check(!ally.effects.root && !ally.slow, "a marcha devia soltar o aliado preso e lento");
  a.any.slowHero("h2", 0.5, 5000);
  check(!ally.slow, "durante a marcha ninguém fica lento");
  check(a.any.moveSpeed(a.p, a.seat(HERO), a.now()) > before * 1.2, "a marcha devia acelerar o xamã");
}

function hordeRoar() {
  const a = spec("clan_scouts", "war_drum", ["clan_scouts", "horde_roar"], { slot3: "horde_roar" });
  a.cast(0);
  a.ready();
  a.any.seats.get(HERO).spellReadyAt = [0, 0, 0];
  a.cast(2 as 0);
  check(clanOf(a, "clanScout").length >= 3, `a Fúria da Horda devia chamar batedores (${clanOf(a, "clanScout").length})`);
  const brains = clanOf(a, "clanScout").map((s) => a.any.summonBrains.get(s.id));
  check(brains.every((b) => b.hasteUntil > a.now()), "todas as criaturas deviam atacar mais rápido");
}
