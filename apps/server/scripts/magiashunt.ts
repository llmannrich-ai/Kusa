/**
 * Teste da página Magias da hunt (`apps/client/src/spellPlan.ts`), sem servidor: a leitura que ajuda o jogador a
 * escolher as até 3 magias de cada slot.
 * - Toda magia de toda classe tem pelo menos um papel (nenhum cartão fica sem etiqueta).
 * - A sugestão escolhe até 3 magias conhecidas do slot, sem repetir, e com 3 ou menos sugere todas.
 * - Com força igual, a sugestão prefere a magia que traz um papel novo ao slot (opções diferentes na hunt).
 * - A cobertura aponta a falta certa e o slot 3 segue "em breve" enquanto o jogo tiver 2 slots.
 * Uso: npx tsx apps/server/scripts/magiashunt.ts
 */
import {
  ACTIVE_SPELLS_PER_SLOT, CLASS_IDS, SPELLS, SPELL_SLOT_LEVELS, talentTree, type SpellId, type TalentRanks,
} from "@kusa/shared";
import { PLAN_SLOTS, coverage, slotExists, slotSpells, spellRoles, suggestSlot, type PlanSpell } from "../../client/src/spellPlan.ts";

const check = (ok: boolean, what: string) => { if (!ok) throw new Error(what); };

for (const s of Object.values(SPELLS)) check(spellRoles(s).length > 0, `${s.id} sem papel na página Magias da hunt`);

check(PLAN_SLOTS === 3, "a página mostra 3 slots");
for (let slot = 0; slot < PLAN_SLOTS; slot++) check(slotExists(slot) === slot < SPELL_SLOT_LEVELS.length, `slot ${slot + 1} existe?`);

// Grimório inteiro de cada classe: a sugestão de cada slot vem das conhecidas, sem repetir, até 3.
for (const classId of CLASS_IDS) {
  const ranks: TalentRanks = Object.fromEntries(talentTree(classId).map((t) => [t.id, t.maxRank]));
  for (let slot = 0; slot < SPELL_SLOT_LEVELS.length; slot++) {
    const spells = slotSpells(classId, slot, ranks, {});
    const { picks, reasons } = suggestSlot(spells, []);
    check(picks.length === Math.min(ACTIVE_SPELLS_PER_SLOT, spells.length), `${classId} slot ${slot + 1}: ${picks.length} sugeridas`);
    check(new Set(picks).size === picks.length, `${classId} slot ${slot + 1}: sugestão repetida`);
    check(picks.every((id) => spells.some((s) => s.id === id) && reasons[id]), `${classId} slot ${slot + 1}: sugestão fora do slot ou sem motivo`);
    for (let i = 1; i < spells.length; i++) check(spells[i - 1].power >= spells[i].power, `${classId}: lista fora da ordem de força`);
  }
}

// Só as iniciais: 1 magia no slot, sugerida sozinha.
const starter = slotSpells("knight", 0, {}, {});
check(starter.length === 1 && suggestSlot(starter, []).picks.join() === starter[0].id, "só a inicial devia ser sugerida");

// Força igual: depois da primeira, entra quem traz papel novo, não outra igual.
const fake = (id: SpellId, power: number): PlanSpell => ({ id, level: 0, bonus: 0, power, roles: spellRoles(SPELLS[id]) });
const pool = [fake("blade_spin", 1.2), fake("cross_cut", 1.2), fake("holy_shield", 1.2), fake("crushing_blow", 1.2)];
const area = (id: SpellId) => spellRoles(SPELLS[id]).includes("area");
check(area("blade_spin") && area("cross_cut") && !area("holy_shield"), "papéis do cenário de teste mudaram");
const picks = suggestSlot(pool, []).picks;
check(picks.includes("holy_shield"), `com força igual, a defesa devia entrar no lugar de outra área: ${picks}`);

// Muito mais forte vence a variedade (+10% por nível pesa mais que um papel novo).
const strong = suggestSlot([fake("blade_spin", 1.6), fake("cross_cut", 1.55), fake("holy_shield", 1.0), fake("crushing_blow", 1.5)], []).picks;
check(!strong.includes("holy_shield"), `a magia fraca não devia entrar só pela variedade: ${strong}`);

// Cobertura: um conjunto só de área não tem sobrevivência nem controle.
const cov = coverage(["blade_spin", "cross_cut"]);
check(cov.area.length === 2 && cov.vida.length === 0, `cobertura de área: ${JSON.stringify(cov)}`);
check(coverage(["holy_shield"]).vida.includes("holy_shield"), "Escudo da Fé devia contar como sobrevivência");

console.log("magiashunt OK");
