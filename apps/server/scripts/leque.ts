/**
 * Teste das magias em leque (Grimório 4.0, fase 2a), sem servidor (`arena.ts`):
 *   - regras: a abertura do leque (`coneAngle`) muda quantos tiles ele cobre; os projéteis em leque (`spreadAimPoints`)
 *     saem espalhados em volta da direção mirada;
 *   - onda: o monstro perto é atingido antes do longe, e cada um leva o efeito uma vez só;
 *   - projéteis em leque: colado no monstro, todos acertam nele; espalhados, acertam monstros diferentes;
 *   - cada uma das 11 magias novas fere (ou cura, a Brisa de Pólen) e faz o efeito dela;
 *   - a telemetria conta os monstros pegos pelo leque (`fanHits`).
 * Uso: npx tsx scripts/leque.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { SPELLS, SPELL_MAX_LEVEL, coneTiles, spellAtRank, spreadAimPoints, tileDistance, type ClassId, type MonsterKind, type SpellId } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

const TARGET: MonsterKind = "lizardfolk";
const failures: string[] = [];
let passed = 0;

function test(name: string, classId: ClassId, fn: (a: Arena) => void, allies: { classId: ClassId }[] = []) {
  const a = arena({ classId, monsterHp: 50, allies });
  try {
    fn(a);
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

/** Põe a magia no slot dela e conjura mirando no ponto. */
function castAt(a: Arena, spellId: SpellId, at: { x: number; y: number }) {
  const slot = SPELLS[spellId].slot;
  a.hunt.chooseSpell(HERO, { slot, spellId });
  a.ready();
  a.cast(slot, { x: at.x, y: at.y });
}

const hurt = (a: Arena, id: string) => a.damage.filter((d) => !d.toPlayer && d.attacker === HERO && a.state.monsters.get(id) && d.x === a.state.monsters.get(id)!.x && d.y === a.state.monsters.get(id)!.y).length;
const lostHp = (a: Arena, id: string) => {
  const m = a.state.monsters.get(id);
  return m ? m.maxHp - m.hp : Infinity;
};

console.log("Regras:");
test("a abertura muda o tamanho do leque", "sorcerer", (a) => {
  const at = (angle: number) => coneTiles(a.d, a.p.x, a.p.y, a.p.x + 5, a.p.y, 4, angle).length;
  check(at(45) < at(90) && at(90) < at(180), `45° ${at(45)}, 90° ${at(90)}, 180° ${at(180)}`);
});
test("projéteis em leque saem espalhados em volta da mira", "paladin", () => {
  const points = spreadAimPoints(0, 0, 10, 0, 5, 60);
  const angles = points.map((p) => Math.round((Math.atan2(p.y, p.x) * 180) / Math.PI));
  check(points.length === 5 && angles[0] === -30 && angles[2] === 0 && angles[4] === 30, `ângulos ${angles.join(",")}`);
});

console.log("Na hunt:");
test("onda: o monstro perto apanha antes do longe, cada um uma vez", "sorcerer", (a) => {
  const near = a.place(TARGET, 1, 0);
  const far = a.place(TARGET, 3, 0);
  castAt(a, "fire_spit", far);
  a.advance(50);
  check(lostHp(a, near.id) > 0 && lostHp(a, far.id) === 0, `aos 50 ms: perto ${lostHp(a, near.id)}, longe ${lostHp(a, far.id)}`);
  a.advance(600);
  check(lostHp(a, far.id) > 0, "a onda não chegou ao longe");
  const hits = a.damage.filter((d) => !d.toPlayer && d.attacker === HERO && !d.dot).length;
  check(hits === 2, `golpes da onda: ${hits} (devia ser 1 por monstro)`);
  check(a.brain(far).dot?.kind === "burn", "o fogo não queimou");
});
test("projéteis em leque: colado, todas as flechas acertam o mesmo", "paladin", (a) => {
  const m = a.place(TARGET, 1, 0);
  castAt(a, "arrow_fan", m);
  a.advance(1000);
  // A arena usa as magias no nível máximo: o leque sai com as flechas da Maestria.
  const arrows = spellAtRank(SPELLS.arrow_fan, SPELL_MAX_LEVEL).spread!.count;
  check(hurt(a, m.id) === arrows, `flechas no monstro: ${hurt(a, m.id)} de ${arrows}`);
});
test("projéteis em leque: espalhados, acertam monstros diferentes", "sorcerer", (a) => {
  const ahead = a.place(TARGET, 4, 0);
  const up = a.place(TARGET, 4, -3);
  const down = a.place(TARGET, 4, 3);
  castAt(a, "lightning_fan", ahead);
  a.advance(1500);
  const struck = [ahead, up, down].filter((m) => lostHp(a, m.id) > 0).length;
  check(struck >= 2, `monstros atingidos: ${struck} (${a.where()})`);
});

const cases: { id: SpellId; classId: ClassId; effect?: (a: Arena, m: ReturnType<Arena["place"]>) => string | null }[] = [
  { id: "gale_blade", classId: "knight", effect: (a, m) => (tileDistance(a.p.x, a.p.y, m.x, m.y) >= 2 ? null : "não empurrou (o monstro ficou colado)") },
  { id: "shield_wall", classId: "knight", effect: (a, m) => (m.stunned ? null : "não atordoou") },
  { id: "cutting_shout", classId: "knight", effect: (a, m) => (m.marked && a.brain(m).tauntedBy === HERO ? null : "não provocou e marcou") },
  { id: "holy_flash", classId: "paladin", effect: (_a, m) => (m.stunned ? null : "não ofuscou") },
  { id: "dark_wail", classId: "sorcerer" },
  { id: "pack_roar", classId: "druid" },
  { id: "thorn_spray", classId: "druid", effect: (a, m) => (a.brain(m).dot?.kind === "bleed" ? null : "não sangrou") },
];
for (const c of cases) {
  test(`${SPELLS[c.id].name} fere o monstro no leque`, c.classId, (a) => {
    const m = a.place(TARGET, 2, 0);
    castAt(a, c.id, m);
    // Logo depois do golpe: o empurrão e o atordoamento ainda aparecem antes de o monstro voltar a andar.
    a.advance(c.id === "holy_flash" || c.id === "shield_wall" || c.id === "gale_blade" ? 300 : 1200);
    check(lostHp(a, m.id) > 0, `sem dano (${a.where()})`);
    const problem = c.effect?.(a, m);
    if (problem) throw new Error(problem);
    if (SPELLS[c.id].shape === "cone") check((a.seat().stats.fanHits[c.id] ?? 0) >= 1, "a telemetria não contou");
  });
}
test("Brisa de Pólen cura o aliado no leque e deixa o monstro lento", "druid", (a) => {
  const ally = a.state.players.get("h2")!;
  ally.x = a.p.x + 2;
  ally.y = a.p.y;
  ally.hp = Math.round(ally.maxHp / 2);
  const before = ally.hp;
  const m = a.place(TARGET, 3, 1);
  castAt(a, "pollen_breeze", { x: a.p.x + 4, y: a.p.y });
  a.advance(1000);
  check(ally.hp > before, `aliado ${before} → ${ally.hp}`);
  check(m.slowed, "monstro não ficou lento");
}, [{ classId: "knight" }]);

console.log("Canalizar e armadilhas (fase 2b):");
test("Sopro Gélido pulsa enquanto dura, congela quem fica e deixa o herói lento", "sorcerer", (a) => {
  const m = a.place(TARGET, 2, 0);
  const slow = a.any.moveSpeed(a.p, a.seat(), a.now());
  castAt(a, "frost_breath", m);
  check(!!a.seat().channel, "não começou a canalizar");
  check(a.any.moveSpeed(a.p, a.seat(), a.now()) < slow, "o herói não ficou mais lento");
  a.advance(1100);
  const pulses = a.damage.filter((d) => !d.toPlayer && d.attacker === HERO && !d.dot).length;
  check(pulses >= 4, `pulsos no monstro: ${pulses}`);
  // A arena tem todos os Traços: o Estilhaçar solta o congelado no pulso seguinte. Vale que ele congelou.
  check(a.seat().stats.ccMs.root > 0, "o monstro não congelou");
  a.advance(1500);
  check(!a.seat().channel, "a canalização não acabou no tempo");
});
test("Sopro Gélido: soltar o dedo encerra", "sorcerer", (a) => {
  const m = a.place(TARGET, 2, 0);
  castAt(a, "frost_breath", m);
  a.advance(300);
  a.hunt.channel(HERO, { stop: true });
  // Conta só os pulsos (a arena tem a Combustão, que deixa o monstro queimando depois).
  const pulses = () => a.damage.filter((d) => !d.toPlayer && d.attacker === HERO && !d.dot).length;
  const before = pulses();
  a.advance(1000);
  check(!a.seat().channel && pulses() === before, `continuou depois de soltar (${before} → ${pulses()} pulsos)`);
});
test("Sopro Gélido: arrastar vira o leque", "sorcerer", (a) => {
  const east = a.place(TARGET, 2, 0);
  const west = a.place(TARGET, -2, 0);
  castAt(a, "frost_breath", east);
  a.advance(100);
  const westBefore = lostHp(a, west.id);
  a.hunt.channel(HERO, { x: a.p.x - 4, y: a.p.y });
  a.advance(600);
  check(westBefore === 0 && lostHp(a, west.id) > 0, `o leque não virou para o oeste (${westBefore} → ${lostHp(a, west.id)})`);
});
test("Abrolhos espalha várias armadilhas no leque", "paladin", (a) => {
  castAt(a, "caltrops", { x: a.p.x + 3, y: a.p.y });
  a.advance(50);
  const traps = [...a.state.fields.values()].filter((f) => f.spellId === "caltrops");
  const count = spellAtRank(SPELLS.caltrops, SPELL_MAX_LEVEL).field!.count!;
  check(traps.length === count, `armadilhas: ${traps.length} de ${count}`);
  check(new Set(traps.map((f) => `${f.x},${f.y}`)).size === traps.length, "armadilhas no mesmo tile");
  // Atordoado em cima da armadilha: ela confere o tile a cada pulso, e o monstro não sai andando antes.
  const m = a.place(TARGET, traps[0].x - a.p.x, traps[0].y - a.p.y);
  a.brain(m).stunnedUntil = a.now() + 2000;
  m.stunned = true;
  a.advance(500);
  check(m.slowed && a.brain(m).dot?.kind === "bleed", "a armadilha não deixou lento e sangrando");
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("LEQUE OK");
process.exit(0);
