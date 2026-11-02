/**
 * Teste das reações (Grimório 4.0, fase 4a-1; `packages/shared/src/reactions.ts`), sem servidor (`arena.ts`):
 *   - a regra de qual golpe reage com qual estado;
 *   - o estado congelado (preso por magia de gelo) e o ofuscado (atordoado por magia de luz) vêm das magias certas;
 *   - cada reação faz o que diz e gasta o estado que a preparou: Vapor, Estilhaço, Hemorragia, Brasa Tóxica, Espinheiro,
 *     Condenação, Incandescer e Exposto (que não gasta nada);
 *   - a explosão de uma reação não dispara outra (sem cadeia) e a magia que prende e fere não reage consigo mesma;
 *   - a telemetria conta as reações de quem disparou.
 * Uso: npx tsx scripts/reacoes.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { EXPOSED_BONUS, SHATTER_BONUS, hitReaction, type ClassId, type MonsterStates } from "@kusa/shared";
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

const NONE: MonsterStates = {
  burning: false, poisoned: false, bleeding: false, rooted: false, frozen: false, dazzled: false, stunned: false, marked: false,
};
const hitFrom = (a: ReturnType<typeof arena>) => ({ attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" as const });
/** Arena com monstros de muita vida (as reações não matam ninguém sem querer). */
const reactArena = (classId: ClassId = "sorcerer") => arena({ classId, monsterHp: 50 });

console.log("Regras:");
test("cada estado reage com o golpe certo", () => {
  check(hitReaction({ ...NONE, burning: true }, "ice", true) === "vapor", "queimando + magia de gelo");
  check(hitReaction({ ...NONE, burning: true }, "ice", false) === null, "o Vapor pede magia de gelo");
  check(hitReaction({ ...NONE, frozen: true }, "fire", false) === "vapor", "congelado + fogo");
  check(hitReaction({ ...NONE, frozen: true }, "energy", true) === "shatter", "congelado + energia");
  check(hitReaction({ ...NONE, frozen: true }, "physical", false) === "shatter", "congelado + físico");
  check(hitReaction({ ...NONE, rooted: true }, "physical", false) === null, "raiz não é gelo");
  check(hitReaction({ ...NONE, poisoned: true }, "fire", true) === "toxic_ember", "envenenado + fogo");
  check(hitReaction({ ...NONE, marked: true }, "dark", true) === "doom", "marcado + trevas");
  check(hitReaction({ ...NONE, dazzled: true, stunned: true }, "fire", true) === "incandesce", "ofuscado + fogo");
  check(hitReaction(NONE, "fire", true) === null, "sem estado, sem reação");
});

console.log("Estados:");
test("Lança de Gelo congela; Raízes Espinhosas só prendem", () => {
  const a = reactArena("sorcerer");
  a.choose("ice_lance");
  const m = a.place("lizardfolk", 2, 0);
  a.ready();
  a.cast(0, m);
  a.advance(600);
  check(m.rooted && m.frozen, `preso ${m.rooted}, congelado ${m.frozen} (${a.where()})`);
  a.advance(8000);
  check(!m.rooted && !m.frozen, "o gelo devia derreter junto com a prisão");
  const d = reactArena("druid");
  d.hunt.chooseSpell(HERO, { slot: 1, spellId: "thorn_roots" });
  const r = d.place("lizardfolk", 2, 0);
  d.ready();
  d.cast(1 as 0, r);
  d.advance(600);
  check(r.rooted && !r.frozen, `raiz: preso ${r.rooted}, congelado ${r.frozen}`);
});
test("o Julgamento Divino (luz) ofusca", () => {
  const a = reactArena("paladin");
  a.hunt.chooseSpell(HERO, { slot: 1, spellId: "divine_judgment" });
  const m = a.place("lizardfolk", 2, 0);
  a.ready();
  a.cast(1 as 0, m);
  a.advance(800);
  check(a.brain(m).dazzledUntil > a.now() && m.stunned, `ofuscado até ${a.brain(m).dazzledUntil}, agora ${a.now()} (${a.where()})`);
});

console.log("Reações:");
test("Vapor: queimando + gelo explode em volta, ofusca e apaga o fogo", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  const other = a.place("lizardfolk", 3, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 1, 5000, "burn", a.now());
  const hp = other.hp;
  a.any.damageMonster(m, 100, hitFrom(a), "ice_lance");
  check(other.hp < hp && other.stunned && a.brain(other).dazzledUntil > a.now(), `vizinho ${hp} → ${other.hp}`);
  check(!a.brain(m).dot && a.seat().stats.reactions.vapor === 1, JSON.stringify(a.seat().stats.reactions));
});
test("Vapor: congelado + fogo derrete o gelo", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  a.any.root(m, a.brain(m), a.now() + 5000, true);
  a.any.damageMonster(m, 100, hitFrom(a), "fireball");
  check(!m.frozen && !m.rooted && a.seat().stats.reactions.vapor === 1, `congelado ${m.frozen}, preso ${m.rooted}`);
});
test("a explosão de uma reação não dispara outra", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  const other = a.place("lizardfolk", 3, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 1, 5000, "burn", a.now());
  a.any.applyDot(other, a.brain(other), HERO, "teste", 1, 5000, "burn", a.now());
  a.any.damageMonster(m, 100, hitFrom(a), "ice_lance");
  check(a.seat().stats.reactions.vapor === 1 && a.brain(other).dot?.kind === "burn", JSON.stringify(a.seat().stats.reactions));
});
test(`Estilhaço: +${SHATTER_BONUS * 100}% no golpe e o gelo quebra`, () => {
  const a = reactArena("knight");
  const frozen = a.place("lizardfolk", 2, 0);
  const plain = a.place("lizardfolk", 3, 0);
  a.any.root(frozen, a.brain(frozen), a.now() + 5000, true);
  const f0 = frozen.hp;
  const p0 = plain.hp;
  a.any.damageMonster(frozen, 100, hitFrom(a), "basic");
  a.any.damageMonster(plain, 100, hitFrom(a), "basic");
  const ratio = (f0 - frozen.hp) / (p0 - plain.hp);
  check(Math.abs(ratio - (1 + SHATTER_BONUS)) < 0.02 && !frozen.frozen && !frozen.rooted, `razão ${ratio}`);
  check(a.seat().stats.reactions.shatter === 1, JSON.stringify(a.seat().stats.reactions));
});
test("a magia que congela e fere não reage consigo mesma", () => {
  const a = reactArena();
  a.choose("ice_lance");
  const m = a.place("lizardfolk", 2, 0);
  a.ready();
  a.cast(0, m);
  a.advance(600);
  check(m.frozen && !a.seat().stats.reactions.shatter && !a.seat().stats.reactions.vapor, JSON.stringify(a.seat().stats.reactions));
});
test("Hemorragia: empurrar quem sangra faz o resto do sangramento entrar de uma vez", () => {
  const a = reactArena("knight");
  const m = a.place("lizardfolk", 2, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 20, 5000, "bleed", a.now());
  const hp = m.hp;
  a.any.push(m, a.p, 1, HERO);
  // 5 pulsos de 20 (o lagarto resiste um pouco ao físico).
  check(hp - m.hp >= 60 && !a.brain(m).dot && a.seat().stats.reactions.hemorrhage === 1, `vida ${hp} → ${m.hp}`);
});
test("Brasa Tóxica: o veneno pega fogo e queima quem está em volta", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  const other = a.place("lizardfolk", 3, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 1, 5000, "poison", a.now());
  a.any.damageMonster(m, 100, hitFrom(a), "fireball");
  check(a.brain(other).dot?.kind === "burn" && a.brain(m).dot?.kind !== "poison", `vizinho ${a.brain(other).dot?.kind}`);
  check(a.seat().stats.reactions.toxic_ember === 1, JSON.stringify(a.seat().stats.reactions));
});
test("Espinheiro: veneno em quem já estava preso por raiz vira espinhos", () => {
  const a = reactArena("druid");
  a.choose("venom_thorn");
  const m = a.place("lizardfolk", 2, 0);
  a.any.root(m, a.brain(m), a.now() + 5000);
  a.ready();
  a.cast(0, m);
  a.advance(800);
  check(!m.rooted && a.brain(m).dot?.kind === "poison" && a.seat().stats.reactions.thornbush === 1, `preso ${m.rooted}, ${JSON.stringify(a.seat().stats.reactions)} (${a.where()})`);
});
test("Condenação: marcado + trevas, a marca explode", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  const other = a.place("lizardfolk", 3, 0);
  a.brain(m).markUntil = a.now() + 5000;
  a.brain(m).markPct = 0.1;
  m.marked = true;
  const hp = other.hp;
  a.any.damageMonster(m, 100, hitFrom(a), "shadow_orb");
  check(other.hp < hp && !m.marked && a.seat().stats.reactions.doom === 1, `vizinho ${hp} → ${other.hp}`);
});
test("Incandescer: ofuscado + fogo explode, o dobro em morto-vivo", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  const undead = a.place("skeleton", 2, 1);
  const living = a.place("lizardfolk", 2, -1);
  a.brain(m).stunnedUntil = a.now() + 2000;
  a.brain(m).dazzledUntil = a.now() + 2000;
  m.stunned = true;
  const u0 = undead.hp;
  const l0 = living.hp;
  a.any.damageMonster(m, 100, hitFrom(a), "fireball");
  const ud = u0 - undead.hp;
  const ld = l0 - living.hp;
  check(ld > 0 && ud > ld * 1.5 && a.seat().stats.reactions.incandesce === 1, `morto-vivo ${ud}, vivo ${ld}`);
});
test(`Exposto: marcado e atordoado recebe +${EXPOSED_BONUS * 100}% e não gasta nada`, () => {
  const a = reactArena("knight");
  const exposed = a.place("lizardfolk", 2, 0);
  const plain = a.place("lizardfolk", 3, 0);
  const brain = a.brain(exposed);
  brain.markUntil = a.now() + 5000;
  brain.stunnedUntil = a.now() + 5000;
  const e0 = exposed.hp;
  const p0 = plain.hp;
  a.any.damageMonster(exposed, 100, hitFrom(a), "basic");
  a.any.damageMonster(plain, 100, hitFrom(a), "basic");
  const ratio = (e0 - exposed.hp) / (p0 - plain.hp);
  // A marca também soma o markPct dela (0 aqui): sobra só o Exposto.
  check(Math.abs(ratio - (1 + EXPOSED_BONUS)) < 0.02 && brain.markUntil > a.now(), `razão ${ratio}`);
  check(a.seat().stats.reactions.exposed === 1, JSON.stringify(a.seat().stats.reactions));
});
test("o pulso do dano contínuo não reage", () => {
  const a = reactArena();
  const m = a.place("lizardfolk", 2, 0);
  a.any.root(m, a.brain(m), a.now() + 5000, true);
  a.any.damageMonster(m, 10, { ...hitFrom(a), dot: "burn" }, "fireball");
  check(m.frozen && !a.seat().stats.reactions.vapor, "a queimadura derreteu o gelo");
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("REAÇÕES OK");
process.exit(0);
