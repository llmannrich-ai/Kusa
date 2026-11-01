/**
 * Teste do slot 3 (magias supremas, Grimório 4.0 fase 3a), sem servidor (`arena.ts`):
 *   - regras: o slot 3 abre no nível 12; as magias de entrada ficam ao lado da raiz, custam 1.000 e pedem só a raiz;
 *     cada classe leva até 3 magias ativas no slot 3;
 *   - na hunt: antes do nível 12 o slot 3 recusa a escolha; no 12, escolhe, conjura e conta XP de uso;
 *   - cada magia de entrada faz o efeito dela: Fúria do Titã (salta e atordoa em volta), Flecha Celeste (cai no
 *     ponto depois de 1 s), Vórtice Arcano (atravessa a reta) e Revoada (fere em leque e cura o druida);
 *   - os bots usam o slot 3.
 * Uso: npx tsx scripts/slot3.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { CLASS_IDS, SPELLS, SPELL_SLOT_LEVELS, TALENTS, activeSpells, talentTree, tileDistance, type ClassId, type SpellId } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

const TARGET = "lizardfolk";
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

const ENTRY: Record<string, SpellId> = { knight: "titan_fury", paladin: "sky_arrow", sorcerer: "arcane_vortex", druid: "butterfly_swarm" };
const lostHp = (a: Arena, id: string) => {
  const m = a.state.monsters.get(id);
  return m ? m.maxHp - m.hp : Infinity;
};
function castS3(a: Arena, spellId: SpellId, at: { x: number; y: number }) {
  a.hunt.chooseSpell(HERO, { slot: 2, spellId });
  check(a.p.spell3 === spellId, `não escolheu ${spellId} no slot 3`);
  a.ready();
  a.cast(2, { x: at.x, y: at.y });
}

console.log("Regras:");
test("o slot 3 abre no nível 12", () => check(SPELL_SLOT_LEVELS[2] === 12, `nível ${SPELL_SLOT_LEVELS[2]}`));
test("magia de entrada do slot 3 ao lado da raiz, 1.000 de gold", () => {
  for (const [classId, spellId] of Object.entries(ENTRY)) {
    const node = TALENTS[`${classId}_${spellId}`];
    const root = talentTree(classId as ClassId).find((t) => t.row === 0 && t.lane === 0)!;
    check(!!node && SPELLS[spellId].slot === 2, `${spellId}: não é do slot 3`);
    check(node.row === 0 && node.baseCost === 1000 && node.requires?.id === root.id, `${node.id}: lugar ou preço errado`);
  }
});
test("as magias ativas incluem o slot 3", () => {
  const ranks = { knight_titan_fury: 1 };
  check(activeSpells("knight", ranks, {}, []).includes("titan_fury"), "a Fúria do Titã não ficou ativa");
});

console.log("Na hunt:");
test("antes do nível 12 o slot 3 fica trancado", () => {
  const a = arena({ classId: "knight", startLevel: 8 });
  a.hunt.chooseSpell(HERO, { slot: 2, spellId: "titan_fury" });
  check(a.p.spell3 === "", "escolheu antes do nível 12");
});
test("Fúria do Titã: salta até o ponto e atordoa em volta", () => {
  const a = arena({ classId: "knight", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 4, 0);
  const from = { x: a.p.x, y: a.p.y };
  castS3(a, "titan_fury", { x: a.p.x + 3, y: a.p.y });
  a.advance(200);
  check(tileDistance(from.x, from.y, a.p.x, a.p.y) >= 2, "o cavaleiro não saltou");
  check(lostHp(a, m.id) > 0 && m.stunned, `sem dano ou sem atordoar (${a.where()})`);
  check((a.seat().stats.spellXp.titan_fury ?? 0) > 0, "não contou XP de uso");
});
test("Flecha Celeste: cai no ponto 1 s depois", () => {
  const a = arena({ classId: "paladin", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 4, 0);
  a.brain(m).stunnedUntil = a.now() + 5000;
  m.stunned = true;
  castS3(a, "sky_arrow", m);
  a.advance(500);
  check(lostHp(a, m.id) === 0, "caiu antes da hora");
  a.advance(700);
  check(lostHp(a, m.id) > 0, `não caiu (${a.where()})`);
});
test("Vórtice Arcano: atravessa a reta e pega os dois", () => {
  const a = arena({ classId: "sorcerer", startLevel: 12, monsterHp: 50 });
  const near = a.place(TARGET, 2, 0);
  const far = a.place(TARGET, 5, 0);
  castS3(a, "arcane_vortex", far);
  a.advance(1200);
  check(lostHp(a, near.id) > 0 && lostHp(a, far.id) > 0, `perto ${lostHp(a, near.id)}, longe ${lostHp(a, far.id)}`);
});
test("Revoada: fere em leque e cura o druida", () => {
  const a = arena({ classId: "druid", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 2, 0);
  a.p.hp = Math.round(a.p.maxHp / 2);
  const before = a.p.hp;
  castS3(a, "butterfly_swarm", m);
  a.advance(800);
  check(lostHp(a, m.id) > 0 && a.p.hp > before, `dano ${lostHp(a, m.id)}, vida ${before} → ${a.p.hp}`);
});
test("o bot escolhe e usa a magia do slot 3", () => {
  const a = arena({ classId: "knight", startLevel: 12, monsterHp: 50, allies: [{ classId: "sorcerer", bot: true }] });
  a.place(TARGET, 3, 0);
  a.advance(3000);
  const bot = a.state.players.get("h2")!;
  check(bot.spell3 !== "", "o bot não escolheu a magia do slot 3");
});
for (const classId of CLASS_IDS.filter((c) => c in ENTRY)) {
  test(`${classId}: a escolha do slot 3 oferece a magia de entrada`, () => {
    const a = arena({ classId, startLevel: 12 });
    check(a.p.knownSpells.includes(ENTRY[classId]), "a magia de entrada não está entre as conhecidas");
  });
}

console.log("Ápices (fase 3b-1):");
test("cada Ápice fica no fim do tronco do ramo, a 2.000, pedindo a última magia do tronco", () => {
  for (const classId of ["knight", "paladin", "sorcerer", "druid"] as const) {
    const apices = talentTree(classId).filter((t) => t.spellId && SPELLS[t.spellId].slot === 2 && t.row > 0);
    for (const t of apices) {
      const parent = TALENTS[t.requires!.id];
      check(t.baseCost === 2000 && parent.col === t.col && parent.lane === 0 && parent.spellId !== undefined, `${t.id}: lugar ou preço`);
    }
  }
});
test("Ceifa do Campeão varre a meia-lua: pega quem está dos dois lados", () => {
  const a = arena({ classId: "knight", startLevel: 12, monsterHp: 50 });
  const up = a.place(TARGET, 0, -2);
  const down = a.place(TARGET, 0, 2);
  castS3(a, "champion_reap", { x: a.p.x + 3, y: a.p.y });
  a.advance(1500);
  check(lostHp(a, up.id) > 0 && lostHp(a, down.id) > 0, `cima ${lostHp(a, up.id)}, baixo ${lostHp(a, down.id)}`);
  const hits = a.damage.filter((d) => !d.toPlayer && d.attacker === HERO && !d.dot && d.x === up.x && d.y === up.y).length;
  check(hits >= 2, `passadas no mesmo monstro: ${hits}`);
});
test("Baluarte: escudo em você e no aliado, e provoca", () => {
  const a = arena({ classId: "knight", startLevel: 12, monsterHp: 50, allies: [{ classId: "druid" }] });
  const ally = a.state.players.get("h2")!;
  ally.x = a.p.x + 1;
  ally.y = a.p.y;
  const m = a.place(TARGET, -2, 0);
  castS3(a, "bulwark", a.p);
  a.advance(100);
  check(a.p.barrier > 0 && ally.barrier > 0, `escudo: herói ${a.p.barrier}, aliado ${ally.barrier}`);
  check(a.brain(m).tauntedBy === HERO, "não provocou");
});
test("Carga da Legião: o aliado perto ganha o bônus e perde ao se afastar", () => {
  const a = arena({ classId: "knight", startLevel: 12, monsterHp: 50, allies: [{ classId: "sorcerer" }] });
  const ally = a.state.players.get("h2")!;
  ally.x = a.p.x + 1;
  ally.y = a.p.y;
  castS3(a, "legion_charge", a.p);
  a.advance(200);
  check(a.seat("h2").rallyDamage > 0 && a.now() < a.seat("h2").rallyUntil, "o aliado perto não ganhou o bônus");
  ally.x = a.p.x + 8;
  a.advance(1500);
  check(a.now() >= a.seat("h2").rallyUntil, "o aliado longe continuou com o bônus");
  check(a.now() < a.seat().rallyUntil, "o próprio cavaleiro perdeu o bônus");
});
test("Chuva sem Fim canaliza e fere o leque", () => {
  const a = arena({ classId: "paladin", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 3, 0);
  castS3(a, "endless_rain", m);
  check(!!a.seat().channel, "não canalizou");
  a.advance(1500);
  const pulses = a.damage.filter((d) => !d.toPlayer && d.attacker === HERO && !d.dot).length;
  check(pulses >= 3, `pulsos: ${pulses}`);
});
test("Relâmpago Ramificado: os galhos pegam quem está fora da reta", () => {
  const a = arena({ classId: "sorcerer", startLevel: 12, monsterHp: 50 });
  const ahead = { x: a.p.x + 7, y: a.p.y };
  const side = a.place(TARGET, 9, 2);
  castS3(a, "branching_bolt", ahead);
  a.advance(500);
  check(lostHp(a, side.id) > 0, `o galho não pegou (${a.where()})`);
});
test("Era do Gelo deixa lento e prende", () => {
  const a = arena({ classId: "sorcerer", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 3, 0);
  castS3(a, "ice_age", m);
  a.advance(2200);
  check(m.slowed && a.seat().stats.ccMs.root > 0, `lento ${m.slowed}, preso ${a.seat().stats.ccMs.root} ms`);
});
test("Buraco Negro puxa para o centro e explode", () => {
  const a = arena({ classId: "sorcerer", startLevel: 12, monsterHp: 50 });
  const center = { x: a.p.x + 4, y: a.p.y };
  const m = a.place(TARGET, 6, 2);
  a.brain(m).stunnedUntil = a.now() + 5000;
  m.stunned = true;
  const before = tileDistance(center.x, center.y, m.x, m.y);
  castS3(a, "black_hole", center);
  a.advance(100);
  check(tileDistance(center.x, center.y, m.x, m.y) < before && lostHp(a, m.id) > 0, `distância ${before} → ${tileDistance(center.x, center.y, m.x, m.y)}`);
});
test("Caçada Selvagem: lobos e urso juntos", () => {
  const a = arena({ classId: "druid", startLevel: 12, monsterHp: 50 });
  castS3(a, "wild_hunt", a.p);
  a.advance(100);
  const kinds = [...a.state.summons.values()].filter((s) => s.owner === HERO).map((s) => s.kind);
  check(kinds.includes("wolf") && kinds.includes("bear"), `criaturas: ${kinds.join(",")}`);
});
test("Árvore da Vida cura quem está à sombra", () => {
  const a = arena({ classId: "druid", startLevel: 12, monsterHp: 50 });
  a.p.hp = Math.round(a.p.maxHp / 2);
  const before = a.p.hp;
  castS3(a, "tree_of_life", { x: a.p.x + 1, y: a.p.y });
  a.advance(2200);
  check(a.p.hp > before, `vida ${before} → ${a.p.hp}`);
});
test("Furacão de Folhas canaliza e empurra", () => {
  const a = arena({ classId: "druid", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 2, 0);
  castS3(a, "leaf_hurricane", m);
  a.advance(1000);
  check(lostHp(a, m.id) > 0, `sem dano (${a.where()})`);
});
test("Xamã Orc: o Totem Ancestral queima e reforça a equipe", () => {
  const a = arena({ classId: "shaman", startLevel: 12, monsterHp: 50 });
  const m = a.place(TARGET, 2, 0);
  castS3(a, "ancestral_totem", { x: a.p.x + 1, y: a.p.y });
  a.advance(2200);
  check(lostHp(a, m.id) > 0 && a.seat().fieldDamage > 0, `dano ${lostHp(a, m.id)}, reforço ${a.seat().fieldDamage}`);
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("SLOT3 OK");
process.exit(0);
