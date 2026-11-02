/**
 * Teste das magias do slot 3 de cada lado da especialização (Grimório 4.0, fase 6; `docs/GRIMORIO_4_PLANO.md`, seção 8),
 * sem servidor (`arena.ts`): o lugar na árvore (embaixo da última magia do lado, faixa ±1, 2.500 de gold) e o que cada
 * magia faz.
 *   - Cavaleiro: Massacre (básico corta os colados e rouba vida; Maestria: cada morte estende), Tempestade de Lâminas
 *     (leque de lâminas que sangram), Juramento do Protetor (o dano do aliado vem para você), Montanha (nada prende nem
 *     atordoa, metade do dano, devolve o golpe; Maestria: Terremoto no fim), Grito de Reunião (cura, escudo e marcha nos
 *     aliados) e Correntes do Desafio (puxa todos do leque e prende);
 *   - Paladino: Disparo Fantasma (marca e acerta os mais perto depois), Dança do Vento (recua, leque de flechas, 3
 *     cargas), Cruz Flamejante (4 retas), Santuário (corte de dano e empurrão), Bombardeio (bombas em onda) e Campo
 *     Minado (minas em leque que prendem e explodem).
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
/** Escolhe e lança a magia do slot 3 pelo caminho do jogador (mira opcional). */
const castS3 = (a: ReturnType<typeof arena>, id: SpellId, aim?: { x: number; y: number; targetId?: string }) => {
  a.hunt.chooseSpell(HERO, { slot: 2, spellId: id });
  a.p.spell3 = id;
  a.ready();
  a.hunt.cast(HERO, aim ? { slot: 2, aim } : { slot: 2 });
};
const bite = (a: ReturnType<typeof arena>, from: { id: string; x: number; y: number }, id: string, raw: number) =>
  a.any.damagePlayer(id, raw, { attacker: from.id, fromX: from.x, fromY: from.y, fx: "bite" });

console.log("Árvore:");
test("o slot 3 de cada lado fica embaixo da última magia do lado (faixa ±1, 2.500)", () => {
  const sides: [ClassId, SpellId, SpellId, 0 | 1][] = [
    ["knight", "massacre", "berserk_rage", 0], ["knight", "blade_storm", "thousand_cuts", 1],
    ["knight", "protector_oath", "shared_aegis", 0], ["knight", "mountain", "living_fortress", 1],
    ["knight", "rally_cry", "war_banner", 0], ["knight", "challenge_chains", "supreme_challenge", 1],
    ["paladin", "phantom_shot", "sniper_stance", 0], ["paladin", "wind_dance", "swift_quiver", 1],
    ["paladin", "flaming_cross", "divine_caldera", 0], ["paladin", "sanctuary", "consecrated_ground", 1],
    ["paladin", "bombardment", "barrage", 0], ["paladin", "minefield", "arrow_cordon", 1],
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

console.log("Paladino:");
test("Disparo Fantasma: marca os 3 mais perto e, 1,5 s depois, acerta cada um (o 4º fica de fora)", () => {
  const a = s3Arena("paladin");
  const ms = [a.place("lizardfolk", 2, 0), a.place("lizardfolk", 0, 2), a.place("lizardfolk", -2, 0), a.place("lizardfolk", 5, 5)];
  for (const m of ms) a.any.root(m, a.brain(m), a.now() + 60000);
  const hp = ms.map((m) => m.hp);
  self(a, SPELLS.phantom_shot);
  check(ms.slice(0, 3).every((m) => m.marked) && !ms[3].marked, "marca os 3 mais perto");
  check(ms.every((m, i) => m.hp === hp[i]), "ainda não fere");
  a.advance(1600);
  check(ms.slice(0, 3).every((m, i) => m.hp < hp[i]) && ms[3].hp === hp[3], `acerta ${ms.map((m, i) => hp[i] - m.hp).join(",")}`);
});
// (A arena conjura com a Maestria: a Dança do Vento tem 4 cargas e o Campo Minado, 7 minas.)
test("Dança do Vento: recua 3 tiles, solta 5 flechas e tem as cargas seguidas (4 na Maestria)", () => {
  const a = s3Arena("paladin", { mapId: "crypt" });
  const m = a.place("lizardfolk", 3, 0);
  a.any.root(m, a.brain(m), a.now() + 60000);
  const x0 = a.p.x;
  castS3(a, "wind_dance", { x: m.x, y: m.y, targetId: m.id });
  check(a.p.x < x0, `recuou (${x0} → ${a.p.x})`);
  check(a.spells.filter((s) => s.spellId === "wind_dance").length === 5, "5 flechas");
  a.advance(500);
  const charges = mastered("wind_dance").charges!.count;
  check(a.seat().spellReadyAt[2] <= a.now() && a.seat().charges.left === charges - 1, `carga seguinte pronta (${a.seat().charges.left})`);
  for (let i = 1; i < charges; i++) {
    a.p.mana = a.p.maxMana;
    a.hunt.cast(HERO, { slot: 2, aim: { x: m.x, y: m.y, targetId: m.id } });
    a.advance(450);
  }
  check(a.seat().charges.left === 0 && a.seat().spellReadyAt[2] > a.now() + 10000, `sem cargas, recarga inteira (${a.seat().spellReadyAt[2] - a.now()})`);
});
test("Cruz Flamejante: pega quem está nas 4 retas e queima; quem está na diagonal fica de fora", () => {
  const a = s3Arena("paladin");
  const up = a.place("lizardfolk", 0, -3);
  const right = a.place("lizardfolk", 3, 0);
  const diag = a.place("lizardfolk", 2, 2);
  const hp = [up.hp, right.hp, diag.hp];
  castS3(a, "flaming_cross");
  a.advance(50);
  check(up.hp < hp[0] && right.hp < hp[1] && diag.hp === hp[2] && a.brain(up).dot?.kind === "burn", `cruz ${hp[0] - up.hp},${hp[1] - right.hp},${hp[2] - diag.hp}`);
});
test("Santuário: aliados dentro levam 40% menos dano e o monstro que entra é empurrado para fora", () => {
  const a = s3Arena("paladin");
  const m = a.place("lizardfolk", 1, 0);
  self(a, SPELLS.sanctuary);
  a.advance(600);
  check(Math.max(Math.abs(m.x - a.p.x), Math.abs(m.y - a.p.y)) > 1, `empurrado para ${m.x - a.p.x},${m.y - a.p.y}`);
  check(a.seat().guard === 0.4 && a.seat().guardUntil > a.now(), `corte de dano ${a.seat().guard}`);
});
test("Bombardeio: 5 bombas em onda, da perto para a longe; Maestria: chão em chamas", () => {
  const a = s3Arena("paladin");
  const near = a.place("lizardfolk", 2, 0);
  const far = a.place("lizardfolk", 6, 0);
  for (const m of [near, far]) a.any.root(m, a.brain(m), a.now() + 60000);
  const hp = [near.hp, far.hp];
  a.any.castBombard(HERO, a.p, a.seat(), mastered("bombardment"), "bombardment", 2, a.p.x, a.p.y, a.p.x + 6, a.p.y);
  check(near.hp < hp[0] && far.hp === hp[1], "a 1ª cai perto, na hora");
  a.advance(1000);
  check(far.hp < hp[1] && a.spells.filter((s) => s.spellId === "bombardment").length === 5, `a última cai longe (${a.spells.length} bombas)`);
  check([...a.state.fields.values()].some((f) => f.style === "fire"), "Maestria: chão em chamas");
});
test("Campo Minado: minas no leque (7 na Maestria); quem pisa fica preso e a mina explode em volta", () => {
  const a = s3Arena("paladin");
  castS3(a, "minefield", { x: a.p.x + 4, y: a.p.y });
  const mines = [...a.state.fields.values()].filter((f) => f.spellId === "minefield");
  check(mines.length === mastered("minefield").field!.count, `minas ${mines.length}`);
  const mine = mines[0];
  const m = a.any.addMonster("lizardfolk", mine.x, mine.y, 0);
  const side = a.free(mine.x + 1, mine.y) && ![...a.state.monsters.values()].some((o) => o.x === mine.x + 1 && o.y === mine.y) ? a.any.addMonster("lizardfolk", mine.x + 1, mine.y, 0) : undefined;
  // Preso um instante, para não sair da mina antes do 1º pulso dela.
  a.any.root(m, a.brain(m), a.now() + 400);
  if (side) a.any.root(side, a.brain(side), a.now() + 400);
  const hp = side?.hp;
  a.advance(300);
  check(m.rooted && a.brain(m).rootedUntil > a.now() + 1500, "preso 2 s");
  if (side && hp !== undefined) check(side.hp < hp, "a explosão pega o vizinho");
  check(mastered("minefield").field!.count === 7, "Maestria: 7 minas");
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("S3 LADOS OK");
process.exit(0);
