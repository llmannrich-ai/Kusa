/**
 * Teste das magias do slot 3 de cada lado da especialização (Grimório 4.0, fase 6; `docs/GRIMORIO_4_PLANO.md`, seção 8),
 * sem servidor (`arena.ts`): o lugar na árvore (embaixo da última magia do lado, faixa ±1, 2.500 de gold) e o que cada
 * magia faz.
 *   - Cavaleiro: Massacre (básico corta os colados e rouba vida; Maestria: cada morte estende), Tempestade de Lâminas
 *     (leque de lâminas que sangram), Juramento do Protetor (o dano do aliado vem para você), Montanha (nada prende nem
 *     atordoa, metade do dano, devolve o golpe; Maestria: Terremoto no fim), Grito de Reunião (cura, escudo e marcha nos
 *     aliados) e Correntes do Desafio (puxa todos do leque e prende).
 * Uso: npx tsx scripts/s3lados.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MASTERIES, SPELLS, talentTree, type ClassId, type SpellDef, type SpellId } from "@kusa/shared";
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

const s3Arena = (classId: ClassId, opts: Parameters<typeof arena>[0] = {}) => {
  const a = arena({ classId, monsterHp: 400, ...opts });
  a.seat().traits = [];
  return a;
};
const mastered = (id: SpellId): SpellDef => ({ ...SPELLS[id], ...MASTERIES[id].changes });
const self = (a: ReturnType<typeof arena>, spell: SpellDef, allyId?: string) =>
  a.any.applySpell(HERO, spell, 0, undefined, a.p.x, a.p.y, 0, undefined, 2, allyId);
const bite = (a: ReturnType<typeof arena>, from: { id: string; x: number; y: number }, id: string, raw: number) =>
  a.any.damagePlayer(id, raw, { attacker: from.id, fromX: from.x, fromY: from.y, fx: "bite" });

console.log("Árvore:");
test("o slot 3 de cada lado fica embaixo da última magia do lado (faixa ±1, 2.500)", () => {
  const sides: [ClassId, SpellId, SpellId, 0 | 1][] = [
    ["knight", "massacre", "berserk_rage", 0], ["knight", "blade_storm", "thousand_cuts", 1],
    ["knight", "protector_oath", "shared_aegis", 0], ["knight", "mountain", "living_fortress", 1],
    ["knight", "rally_cry", "war_banner", 0], ["knight", "challenge_chains", "supreme_challenge", 1],
  ];
  for (const [classId, s3, last, side] of sides) {
    const tree = talentTree(classId);
    const node = tree.find((t) => t.spellId === s3)!;
    const parent = tree.find((t) => t.spellId === last)!;
    check(SPELLS[s3].slot === 2, `${s3}: slot 3`);
    check(node.col === parent.col && node.row === parent.row + 1 && node.lane === parent.lane && node.side === side, `${s3}: ${JSON.stringify(node)}`);
    check(node.requires?.id === parent.id && node.baseCost === 2500, `${s3}: pede ${node.requires?.id}, custa ${node.baseCost}`);
  }
});

console.log("Cavaleiro:");
test("Massacre: o básico corta todos os colados e rouba 30%; Maestria: cada morte estende 1 s", () => {
  const a = s3Arena("knight");
  const front = a.place("lizardfolk", 1, 0);
  const side = a.place("lizardfolk", 0, 1);
  for (const m of [front, side]) a.any.root(m, a.brain(m), a.now() + 60000);
  self(a, SPELLS.massacre);
  a.p.hp = Math.round(a.p.maxHp / 2);
  const hp = side.hp;
  const heroHp = a.p.hp;
  a.p.target = front.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.advance(1500);
  a.seat().attacking = false;
  check(side.hp < hp, `o colado do lado também leva (${hp} → ${side.hp})`);
  check(a.p.hp > heroHp, `roubou vida (${heroHp} → ${a.p.hp})`);
  const b = s3Arena("knight", { monsterHp: 1 });
  self(b, mastered("massacre"));
  const until = b.seat().buff.until;
  const m = b.place("rat", 1, 0);
  b.p.target = m.id;
  b.seat().attacking = true;
  b.seat().targetLocked = true;
  b.advance(1200);
  check(!b.state.monsters.has(m.id) && b.seat().buff.until === until + 1000, `morte estende: ${b.seat().buff.until - until}`);
});
test("Tempestade de Lâminas: 5 lâminas que sangram; Maestria: 7", () => {
  const a = s3Arena("knight");
  const m = a.place("lizardfolk", 1, 0);
  a.any.castSpread(HERO, a.p, a.seat(), SPELLS.blade_storm, "blade_storm", 2, a.p.x, a.p.y, m.x, m.y, true);
  a.advance(500);
  check(a.brain(m).dot?.kind === "bleed" && a.spells.filter((s) => s.spellId === "blade_storm").length === 5, `lâminas ${a.spells.length}`);
  check(mastered("blade_storm").spread!.count === 7, "Maestria: 7 lâminas");
});
test("Juramento do Protetor: 60% do dano do aliado vem para você, com +10 de armadura", () => {
  const a = s3Arena("knight", { allies: [{ classId: "sorcerer" }] });
  const ally = a.state.players.get("h2")!;
  const m = a.place("lizardfolk", 0, 2);
  self(a, SPELLS.protector_oath, "h2");
  check(a.seat().armorBonus === 10 && a.seat("h2").oathBy === HERO, "armadura e juramento");
  const allyHp = ally.hp;
  const myHp = a.p.hp;
  bite(a, m, "h2", 100);
  check(a.p.hp < myHp && allyHp - ally.hp < 60, `aliado ${allyHp} → ${ally.hp}, cavaleiro ${myHp} → ${a.p.hp}`);
  a.advance(10100);
  const before = ally.hp;
  bite(a, m, "h2", 100);
  check(before - ally.hp > 50, "o juramento acaba em 10 s");
});
test("Montanha: nada atordoa, metade do dano, devolve o golpe; Maestria: Terremoto no fim", () => {
  const a = s3Arena("knight");
  const m = a.place("lizardfolk", 1, 0);
  a.seat().effects.stun = { until: a.now() + 5000, stacks: 1 };
  self(a, mastered("mountain"));
  check(!a.seat().effects.stun, "solta o atordoar");
  const stunned = a.any.affectHero(HERO, { kind: "stun", ms: 2000 }, m, 10);
  check(!stunned && !a.seat().effects.stun, "não fica atordoado");
  const hp = m.hp;
  bite(a, m, HERO, 50);
  check(m.hp < hp, `devolve o golpe (${hp} → ${m.hp})`);
  const mid = m.hp;
  a.any.root(m, a.brain(m), a.now() + 60000);
  a.advance(6200);
  check(m.hp < mid && a.brain(m).stunnedUntil > 0, `Terremoto no fim (${mid} → ${m.hp})`);
});
test("Grito de Reunião: cura 30%, escudo de 20% e marcha (+30%) nos aliados a até 6 tiles", () => {
  const a = s3Arena("knight", { allies: [{ classId: "sorcerer" }] });
  const ally = a.state.players.get("h2")!;
  ally.hp = Math.round(ally.maxHp / 2);
  const hp = ally.hp;
  self(a, SPELLS.rally_cry);
  check(ally.hp >= hp + Math.round(ally.maxHp * 0.3) - 1 && ally.barrier > 0 && a.seat("h2").rallyMove === 0.3, `vida ${hp} → ${ally.hp}, escudo ${ally.barrier}, marcha ${a.seat("h2").rallyMove}`);
  check(mastered("rally_cry").radius === 8, "Maestria: 8 tiles");
});
test("Correntes do Desafio: puxa todos do leque para perto e prende 2 s; Maestria: sangram", () => {
  const a = s3Arena("knight");
  const far = a.place("lizardfolk", 4, 0);
  const far2 = a.place("lizardfolk", 4, 1);
  a.hunt.chooseSpell(HERO, { slot: 2, spellId: "challenge_chains" });
  a.p.spell3 = "challenge_chains";
  a.ready();
  a.hunt.cast(HERO, { slot: 2, aim: { x: far.x, y: far.y, targetId: far.id } });
  a.advance(100);
  const near = (m: { x: number; y: number }) => Math.max(Math.abs(m.x - a.p.x), Math.abs(m.y - a.p.y)) <= 1;
  check(near(far) && near(far2), `puxados para ${far.x - a.p.x},${far.y - a.p.y} e ${far2.x - a.p.x},${far2.y - a.p.y}`);
  check(far.rooted && far2.rooted, "presos");
  check(mastered("challenge_chains").dot?.kind === "bleed", "Maestria: sangram");
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("S3 LADOS OK");
process.exit(0);
