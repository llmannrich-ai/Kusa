/**
 * Runas Mestras: regras (só uma Mestra vale entre as equipadas, preço e bônus somados) e o efeito de cada uma,
 * rodando a `Hunt` direto (arena: relógio falso, seed fixa), sem servidor.
 * Uso: npx tsx apps/server/scripts/mestras.ts
 */
import { MASTER_RUNES, activeRunes, heroBonuses, masterRune, tileDistance, type ClassId } from "@kusa/shared";
import { arena, HERO, type ArenaOptions } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

function test(name: string, classId: ClassId, fn: (a: ReturnType<typeof arena>) => void, options: ArenaOptions = {}) {
  const a = arena({ classId, allSpells: false, monsterHp: 20, ...options });
  try {
    fn(a);
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message} (${a.where()})`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

/** Golpe de monstro no herói, como se viesse dele. */
const hitHero = (a: ReturnType<typeof arena>, amount: number, from: { id: string; x: number; y: number }) =>
  a.any.damagePlayer(HERO, amount, { attacker: from.id, fromX: from.x, fromY: from.y, fx: "slash" });

console.log("regras:");
{
  const runes = activeRunes(["rune-glass", "rune-phoenix", "rune-fury", "rune-life"]);
  check(runes.join() === "rune-glass,rune-fury,rune-life", `só a primeira Mestra vale (${runes})`);
  check(masterRune(runes) === "glass", "a Mestra equipada é o Vidro");
  const bonus = heroBonuses({}, ["rune-glass"]);
  check(Math.abs(bonus.damage - 0.35) < 1e-9 && Math.abs(bonus.hp + 0.25) < 1e-9, `Vidro: ${JSON.stringify(bonus)}`);
  const colossus = heroBonuses({}, ["rune-colossus"]);
  check(colossus.hp === 0.4 && colossus.armor === 3 && colossus.speed === -0.12, `Colosso: ${JSON.stringify(colossus)}`);
  passed++;
  console.log("  ✔ uma Mestra só, com o preço somado ao bônus");
}

console.log("efeitos:");
test("Vidro: menos vida máxima", "knight", (a) => {
  const plain = arena({ classId: "knight", allSpells: false });
  check(a.p.maxHp < plain.p.maxHp * 0.8, `vida ${a.p.maxHp} (sem a runa ${plain.p.maxHp})`);
}, { runes: ["rune-glass"] });

test("Fênix: renasce uma vez, na segunda morte cai", "knight", (a) => {
  const m = a.spawn("lizardfolk", 1);
  hitHero(a, a.p.maxHp * 10, m);
  check(a.p.status === "playing", `morreu na primeira (${a.p.status})`);
  check(Math.abs(a.p.hp - Math.round(a.p.maxHp * MASTER_RUNES.phoenix.hp)) <= 1, `renasceu com ${a.p.hp}/${a.p.maxHp}`);
  hitHero(a, a.p.maxHp * 10, m);
  check(a.p.status === "playing", "o renascido não ficou invulnerável por um instante");
  a.advance(MASTER_RUNES.phoenix.invulnMs + 100);
  hitHero(a, a.p.maxHp * 10, m);
  check(a.p.status !== "playing", "renasceu duas vezes");
}, { runes: ["rune-phoenix"] });

/** Mana que a Lança de Gelo gasta num Feiticeiro sem runa. */
function plainCost() {
  const a = arena({ classId: "sorcerer" });
  a.choose("ice_lance");
  a.ready();
  a.cast(0, a.spawn("lizardfolk", 3));
  return a.p.maxMana - a.p.mana;
}

test("Eco: a quinta magia sai sem mana e sem recarga", "sorcerer", (a) => {
  a.choose("ice_lance");
  check(a.p.spell1 === "ice_lance", "a magia não entrou no slot");
  const m = a.spawn("lizardfolk", 3);
  const cost = Math.round(plainCost() * (1 + MASTER_RUNES.echo.extraCost));
  for (let i = 0; i < MASTER_RUNES.echo.every; i++) {
    a.ready();
    a.cast(0, m);
    check(a.p.mana === a.p.maxMana - cost, `magia ${i + 1} gastou ${a.p.maxMana - a.p.mana} (devia ${cost})`);
    a.advance(200);
  }
  a.ready();
  a.cast(0, m);
  check(a.p.mana === a.p.maxMana, `a magia do eco gastou ${a.p.maxMana - a.p.mana} de mana`);
  check(a.seat().spellReadyAt[0] <= a.now(), "a magia do eco entrou em recarga");
  check(a.notices.includes("Eco!"), "sem aviso do eco");
}, { runes: ["rune-echo"], allSpells: true });

test("Ceifador: matar devolve vida e mana", "knight", (a) => {
  const m = a.spawn("lizardfolk", 1);
  a.p.hp = Math.floor(a.p.maxHp / 2);
  a.p.mana = 0;
  const hp = a.p.hp;
  a.any.damageMonster(m, m.hp * 10, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "slash" }, "basic");
  check(!a.state.monsters.has(m.id), "o monstro não morreu");
  check(a.p.hp >= hp + Math.round(a.p.maxHp * MASTER_RUNES.reaper.hp), `vida ${hp} → ${a.p.hp}`);
  check(a.p.mana > 0, "sem mana de volta");
}, { runes: ["rune-reaper"], monsterHp: 1 });

/** Dano de 100 num monstro do tipo, com e sem a runa. */
function dealt(kind: "lizardfolk" | "ogre", runes: string[]) {
  const a = arena({ classId: "knight", allSpells: false, monsterHp: 20, runes });
  const m = a.spawn(kind, 1);
  return a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "slash" }, "basic") as number;
}

test("Regicida: +30% em mini-boss, -10% nos comuns", "knight", () => {
  const elite = dealt("ogre", ["rune-regicide"]) / dealt("ogre", []);
  const common = dealt("lizardfolk", ["rune-regicide"]) / dealt("lizardfolk", []);
  check(Math.abs(elite - 1.3) < 0.02, `mini-boss ×${elite.toFixed(2)}`);
  check(Math.abs(common - 0.9) < 0.02, `comum ×${common.toFixed(2)}`);
});

test("Ceifador: -15% em mini-boss, comuns iguais", "knight", () => {
  const elite = dealt("ogre", ["rune-reaper"]) / dealt("ogre", []);
  const common = dealt("lizardfolk", ["rune-reaper"]) / dealt("lizardfolk", []);
  check(Math.abs(elite - 0.85) < 0.02, `mini-boss ×${elite.toFixed(2)}`);
  check(common === 1, `comum ×${common.toFixed(2)}`);
});

test("Pacto: sem mana, a magia gasta vida", "sorcerer", (a) => {
  a.choose("ice_lance");
  const m = a.spawn("lizardfolk", 3);
  a.ready();
  a.p.mana = 0;
  const hp = a.p.hp;
  const cost = plainCost();
  a.cast(0, m);
  check(a.spells.some((s) => s.spellId === "ice_lance"), "a magia não saiu");
  check(a.p.hp === hp - cost, `vida ${hp} → ${a.p.hp} (custo ${cost})`);
  a.ready();
  a.p.mana = 0;
  a.p.hp = cost;
  a.cast(0, m);
  check(a.p.hp === cost, "gastou a última vida numa magia");
}, { runes: ["rune-pact"], allSpells: true });

test("Pacto: sem a runa, sem mana a magia não sai", "sorcerer", (a) => {
  a.choose("ice_lance");
  const m = a.spawn("lizardfolk", 3);
  a.ready();
  a.p.mana = 0;
  a.cast(0, m);
  check(a.p.spell1 === "ice_lance", "a magia não entrou no slot");
  check(!a.spells.some((s) => s.spellId === "ice_lance"), "a magia saiu sem mana");
}, { allSpells: true });

test("Vingança: quase caindo, fere, empurra e dá escudo; depois, recarga", "knight", (a) => {
  const m = a.spawn("lizardfolk", 1);
  const hp = m.hp;
  a.p.hp = Math.round(a.p.maxHp * 0.4);
  hitHero(a, a.p.maxHp * 0.2, m);
  check(a.p.barrier >= Math.round(a.p.maxHp * MASTER_RUNES.vengeance.barrier) - 1, `escudo ${a.p.barrier}`);
  check(m.hp < hp, "o monstro colado não apanhou");
  check(tileDistance(a.p.x, a.p.y, m.x, m.y) > 1, "o monstro não foi empurrado");
  const procs = a.seat().stats.runeProcs.vengeance;
  a.p.barrier = 0;
  hitHero(a, 1, m);
  check(a.seat().stats.runeProcs.vengeance === procs && a.p.barrier === 0, "saiu de novo antes da recarga");
}, { runes: ["rune-vengeance"] });

if (failures.length > 0) {
  console.error(`\n${failures.length} falha(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`MESTRAS OK (${passed} casos)`);
process.exit(0);
