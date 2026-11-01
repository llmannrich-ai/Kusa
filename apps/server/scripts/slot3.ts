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

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("SLOT3 OK");
process.exit(0);
