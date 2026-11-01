/**
 * Teste das costelas do Grimório (galhos laterais do tronco). A parte da hunt roda sem servidor, numa arena
 * (`arena.ts`: relógio falso, sorteios de seed fixa, monstro posto onde o teste precisa), no nível 8 com todas as
 * magias no nível 5 (Maestria):
 *   - regras: as costelas ficam no ramo do pai e acima da bifurcação das especializações, e o nó de dois pais só
 *     abre com os dois no nível 1;
 *   - na hunt, cada magia das costelas sai, colada num monstro, e, se tem dano, fere o monstro.
 * Uso: npx tsx scripts/costelas.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { CLASS_IDS, SPELL_LEVEL_XP, SPELL_SLOT_LEVELS, SPELLS, TALENTS, talentBlocker, talentTree, type ClassId } from "@kusa/shared";
import { HERO, arena } from "./arena.ts";

rules();
for (const classId of CLASS_IDS) castRibs(classId);
console.log("COSTELAS OK");
process.exit(0);

function ribs(classId: ClassId) {
  return talentTree(classId).filter((t) => t.kind === "spell" && t.lane !== 0 && t.side === undefined);
}

function rules() {
  for (const classId of CLASS_IDS) {
    const tree = talentTree(classId);
    for (const rib of ribs(classId)) {
      for (const req of [rib.requires, rib.alsoRequires]) {
        if (req && TALENTS[req.id].col !== rib.col) throw new Error(`${rib.id}: pai ${req.id} em outro ramo`);
      }
      // A bifurcação usa os lados −1 e 1 das linhas de baixo: a costela não pode descer até lá.
      const fork = tree.find((t) => t.kind === "trait" && t.col === rib.col);
      if (fork && rib.row >= fork.row) throw new Error(`${rib.id}: costela na altura da especialização`);
    }
  }
  const rift = TALENTS.knight_seismic_rift;
  const both = { knight_earthquake: 1, knight_open_wound: 1 };
  const xp = { knight_earthquake: SPELL_LEVEL_XP[0], knight_open_wound: SPELL_LEVEL_XP[0] };
  if (!talentBlocker(rift, { knight_open_wound: 1 }, xp)?.includes("Terremoto")) throw new Error("a Fenda Sísmica devia pedir o Terremoto");
  if (!talentBlocker(rift, { knight_earthquake: 1 }, xp)?.includes("Ferida Aberta")) throw new Error("a Fenda Sísmica devia pedir a Ferida Aberta");
  if (!talentBlocker(rift, both, { knight_earthquake: SPELL_LEVEL_XP[0] })?.includes("Ferida Aberta no nível 1")) throw new Error("a Fenda Sísmica devia pedir a Ferida Aberta no nível 1");
  if (talentBlocker(rift, both, xp)) throw new Error("a Fenda Sísmica devia abrir com os dois pais no nível 1");
}

/** Cada magia das costelas numa arena própria, com um monstro colado (toda forma de magia acerta colada nele). */
function castRibs(classId: ClassId) {
  for (const id of ribs(classId).map((t) => t.spellId!)) {
    const def = SPELLS[id];
    // Monstros com 20× a vida: a magia anterior não mata o alvo e o dano aparece. O herói começa no nível em que o
    // slot da magia abre (o slot 3, das magias supremas, só no 12).
    const a = arena({ classId, monsterHp: 20, startLevel: Math.max(8, SPELL_SLOT_LEVELS[def.slot]) });
    a.hunt.chooseSpell(HERO, { slot: def.slot, spellId: id });
    a.place("lizardfolk", 1, 0);
    const casts = () => a.spells.filter((s) => s.from === HERO && s.spellId === id).length;
    a.cast(def.slot);
    a.until(() => casts() > 0, 1500, `${id} não saiu (avisos: ${a.notices.slice(-3).join(" | ") || "nenhum"})`);
    if (def.damage || def.field?.damage) a.until(() => a.hitsFrom(0) > 0, 3000, `${id} não feriu o monstro`);
    console.log(`${classId}: ${def.name} ok`);
  }
}
