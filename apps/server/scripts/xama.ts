/**
 * Teste do Xamã Orc (Fase 1, docs/CLASSE_XAMA_ORC.md), sem servidor: as regras do `packages/shared` e, numa arena
 * (`arena.ts`: relógio falso, sorteios de seed fixa, monstro posto onde o teste precisa), as duas magias iniciais:
 *   - regras: a classe só abre com Vorgak vencido por qualquer personagem (as outras sempre abertas); veste cajado,
 *     varinha, vestes arcanas e escudo, e não espada nem arco; o Grimório da Fase 1 tem as 2 iniciais grátis, as
 *     áureas e só o Tomo do ramo que tem magia;
 *   - Totem da Brasa: o totem fica no chão e lança brasa sozinho no monstro perto (dano de fogo do herói, sem ele
 *     atacar); cabem 2 ao mesmo tempo (o terceiro tira o mais antigo) e somem no fim do tempo; na Maestria, a brasa queima;
 *   - Tambor de Guerra: o herói e o aliado perto batem mais forte (e o básico fica mais rápido), o aliado longe não
 *     ganha nada, a criatura de um aliado perto também é reforçada e o monstro colado fica lento; na Maestria, cura.
 * Uso: npx tsx scripts/xama.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CLASSES, CLASS_IDS, CLASS_UNLOCK, ITEMS, MONSTERS, SPELLS, classUnlocked, talentTree, type MonsterKind,
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
  check(tomes.length === 1 && tomes[0].col === 2, `só o ramo Brasa (com o Tambor) devia ter Tomo: ${tomes.map((t) => t.id)}`);
  check(tree.filter((t) => t.kind === "aura").length === 3, "o Grimório da Fase 1 tem 3 áureas");
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
