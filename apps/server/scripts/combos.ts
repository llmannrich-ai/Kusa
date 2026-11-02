/**
 * Teste das magias de combo das costelas novas (Grimório 4.0, fase 5; `docs/GRIMORIO_4_PLANO.md`, seção 8), sem
 * servidor (`arena.ts`): o lugar na árvore e o que cada magia faz com as reações.
 *   - Cavaleiro: Corte Hemorrágico (Hemorragia dobrada em quem já sangrava), Arremesso (quem bate em parede ou monstro
 *     fica atordoado, com o outro) e Golpe Exposto (marcado vira Exposto na hora); a Maestria do Brado Cortante enfraquece.
 * Uso: npx tsx scripts/combos.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { EXPOSED_BONUS, MASTERIES, SPELLS, talentTree, type ClassId, type SpellDef, type SpellId } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

/** Arena sem Traços (o teste mede a magia, não a especialização), monstros de muita vida. */
const comboArena = (classId: ClassId, monsterHp = 400) => {
  const a = arena({ classId, monsterHp });
  a.seat().traits = [];
  return a;
};
/** A magia com a Maestria. */
const mastered = (id: SpellId): SpellDef => ({ ...SPELLS[id], ...MASTERIES[id].changes });
/** Lança a magia direto no monstro (sem mira, mana nem recarga). */
const hitWith = (a: ReturnType<typeof arena>, spell: SpellDef, m: { id: string; x: number; y: number }) =>
  a.any.applySpell(HERO, spell, 0, m.id, m.x, m.y, 100 * (spell.damage ?? 0), undefined, spell.slot);

console.log("Árvore:");
test("as magias de combo ficam embaixo da de leque da mesma costela", () => {
  const pairs: [ClassId, SpellId, SpellId][] = [
    ["knight", "hemorrhagic_cut", "gale_blade"], ["knight", "shield_toss", "shield_wall"], ["knight", "exposed_strike", "cutting_shout"],
  ];
  for (const [classId, combo, fan] of pairs) {
    const tree = talentTree(classId);
    const c = tree.find((t) => t.spellId === combo)!;
    const f = tree.find((t) => t.spellId === fan)!;
    check(!!c && c.col === f.col && c.row === f.row + 1 && c.lane === f.lane && c.requires?.id === f.id, `${combo}: ${JSON.stringify(c)}`);
  }
});

console.log("Cavaleiro:");
test("Corte Hemorrágico: sangra; em quem já sangrava, a Hemorragia sai dobrada", () => {
  const blood = (power: number) => {
    const a = comboArena("knight");
    const m = a.place("lizardfolk", 1, 0);
    a.any.applyDot(m, a.brain(m), HERO, "teste", 10, 5000, "bleed", a.now());
    const hp = m.hp;
    a.any.hemorrhage(m, a.brain(m), HERO, power);
    return hp - m.hp;
  };
  check(Math.abs(blood(2) / blood(1) - 2) < 0.15, `Hemorragia ${blood(1)} → ${blood(2)}`);
  const a = comboArena("knight");
  const m = a.place("lizardfolk", 1, 0);
  hitWith(a, SPELLS.hemorrhagic_cut, m);
  check(a.brain(m).dot?.kind === "bleed" && !a.seat().stats.reactions.hemorrhage, "o 1º corte só sangra");
  hitWith(a, SPELLS.hemorrhagic_cut, m);
  check(a.seat().stats.reactions.hemorrhage === 1 && a.brain(m).dot?.kind === "bleed", `o 2º dispara a Hemorragia e sangra de novo: ${JSON.stringify(a.seat().stats.reactions)}`);
  const b = comboArena("knight");
  const t = b.place("lizardfolk", 1, 0);
  const side = b.place("lizardfolk", 1, 1);
  hitWith(b, mastered("hemorrhagic_cut"), t);
  check(b.brain(side).dot?.kind === "bleed", "Maestria: sangra também os colados no alvo");
});
test("Arremesso: joga 4 tiles; batendo em monstro, os dois ficam atordoados (Maestria: o impacto fere)", () => {
  const a = comboArena("knight");
  const m = a.place("lizardfolk", 1, 0);
  const back = a.place("lizardfolk", 3, 0);
  a.any.root(back, a.brain(back), a.now() + 60000);
  hitWith(a, SPELLS.shield_toss, m);
  check(m.x === back.x - 1 && a.brain(m).stunnedUntil >= a.now() + 1500 && a.brain(back).stunnedUntil >= a.now() + 1500, `parou em ${m.x} (o de trás em ${back.x}), atordoados ${m.stunned} ${back.stunned}`);
  const b = comboArena("knight");
  const free = b.place("lizardfolk", 1, 0);
  const x0 = free.x;
  hitWith(b, SPELLS.shield_toss, free);
  check(free.x - x0 === 4 || free.stunned, `voou ${free.x - x0} tiles`);
  const c = comboArena("knight");
  const t = c.place("lizardfolk", 1, 0);
  const wall = c.place("lizardfolk", 2, 0);
  c.any.root(wall, c.brain(wall), c.now() + 60000);
  const hp = wall.hp;
  hitWith(c, mastered("shield_toss"), t);
  check(wall.hp < hp, `Maestria: o impacto fere o de trás (${hp} → ${wall.hp})`);
});
test("Golpe Exposto: atordoa e, em marcado, o golpe já sai Exposto (Maestria: os marcados colados também)", () => {
  const strike = (marked: boolean) => {
    const a = comboArena("knight");
    const m = a.place("lizardfolk", 1, 0);
    if (marked) {
      a.brain(m).markPct = 0.0001;
      a.brain(m).markUntil = a.now() + 5000;
      m.marked = true;
    }
    const hp = m.hp;
    hitWith(a, SPELLS.exposed_strike, m);
    return { a, m, dealt: hp - m.hp };
  };
  const plain = strike(false);
  const marked = strike(true);
  check(plain.m.stunned && plain.a.brain(plain.m).stunnedUntil === plain.a.now() + 1000, "atordoa 1 s");
  check(Math.abs(marked.dealt / plain.dealt - (1 + EXPOSED_BONUS)) < 0.1, `Exposto: ${plain.dealt} → ${marked.dealt}`);
  const b = comboArena("knight");
  const t = b.place("lizardfolk", 1, 0);
  const side = b.place("lizardfolk", 1, 1);
  const far = b.place("lizardfolk", 1, -1);
  b.brain(side).markUntil = b.now() + 5000;
  hitWith(b, mastered("exposed_strike"), t);
  check(side.stunned && !far.stunned, "Maestria: só o marcado colado fica atordoado");
});
test("Brado Cortante (Maestria): enfraquece 20% por 4 s", () => {
  const a = comboArena("knight");
  const m = a.place("lizardfolk", 2, 0);
  a.any.applySpell(HERO, mastered("cutting_shout"), 0, m.id, m.x, m.y, 10, undefined, 0);
  check(a.brain(m).weakPct === 0.2 && a.brain(m).weakUntil === a.now() + 4000, `enfraquecido ${a.brain(m).weakPct} por ${a.brain(m).weakUntil - a.now()}`);
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("COMBOS OK");
process.exit(0);
