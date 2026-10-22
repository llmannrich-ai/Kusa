/**
 * Teste das magias ativas do Grimório, sem servidor: a simulação (`Hunt`) roda sozinha, como na hunt solo.
 * - Regras: até 3 magias num slot ficam todas ativas; com mais, valem as ativadas (até 3); sem nenhuma ativada, as 3
 *   de maior nível; ligar e desligar respeitam o limite e deixam pelo menos uma.
 * - Na hunt, um cavaleiro com o Grimório inteiro só vê na escolha as magias ativas, e o servidor recusa uma inativa.
 * Uso: npx tsx apps/server/scripts/ativas.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  ACTIVE_SPELLS_PER_SLOT, SPELLS, SPELL_LEVEL_XP, activeSlotSpells, activeSpells, knownSpells, spellTalentId, talentTree,
  toggleActiveSpell, type SpellId, type SpellXp, type TalentRanks,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState } from "../src/state.ts";

const check = (ok: boolean, what: string) => { if (!ok) throw new Error(what); };
const id = (spell: SpellId) => spellTalentId("knight", spell);

// Cavaleiro só com as iniciais: uma magia por slot, ativa sozinha.
check(activeSpells("knight", {}, {}, []).join() === "blade_spin,war_cry", "as iniciais deviam estar ativas sozinhas");

// Cavaleiro com o Grimório inteiro (magias compradas; o Golpe de Égide e o Corte Duplo no nível 2).
const ranks: TalentRanks = Object.fromEntries(talentTree("knight").map((t) => [t.id, t.maxRank]));
const xp: SpellXp = { [id("aegis_strike")]: SPELL_LEVEL_XP[1], [id("twin_slash")]: SPELL_LEVEL_XP[1] };
const slot1 = knownSpells("knight", ranks).filter((s) => SPELLS[s].slot === 0);
check(slot1.length > ACTIVE_SPELLS_PER_SLOT, "o teste precisa de mais de 3 magias no slot 1");

// Nenhuma ativada: as 3 de maior nível (as duas no nível 2 e a inicial, que já vem no 1).
const auto = activeSlotSpells("knight", 0, ranks, xp, []);
check(auto.length === 3 && auto.includes("aegis_strike") && auto.includes("twin_slash") && auto.includes("blade_spin"),
  `escolha automática: ${auto}`);

// Ativadas: valem só elas (e só as da classe e do slot).
const chosen = [id("cross_cut"), id("crushing_blow"), "paladin_double_shot"];
check(activeSlotSpells("knight", 0, ranks, xp, chosen).join() === "crushing_blow,cross_cut", "as ativadas deviam valer");

// Ligar uma terceira, e a quarta é recusada.
const third = toggleActiveSpell("knight", "twin_slash", ranks, xp, chosen);
check("chosen" in third, "ligar a terceira devia funcionar");
const three = (third as { chosen: string[] }).chosen;
check(three.includes("paladin_double_shot"), "ligar no cavaleiro não pode apagar a escolha das outras classes");
check(activeSlotSpells("knight", 0, ranks, xp, three).length === 3, "deviam ser 3 ativas");
check("error" in toggleActiveSpell("knight", "aegis_strike", ranks, xp, three), "a quarta devia ser recusada");

// Desligar até sobrar uma; a última não sai.
let left = three;
for (const spell of ["twin_slash", "cross_cut"] as SpellId[]) {
  const r = toggleActiveSpell("knight", spell, ranks, xp, left);
  check("chosen" in r, `desligar ${spell} devia funcionar`);
  left = (r as { chosen: string[] }).chosen;
}
check(activeSlotSpells("knight", 0, ranks, xp, left).join() === "crushing_blow", `sobrou ${activeSlotSpells("knight", 0, ranks, xp, left)}`);
check("error" in toggleActiveSpell("knight", "crushing_blow", ranks, xp, left), "a última ativa não pode sair");

// Slot com até 3 magias: não há o que ligar ou desligar.
check("error" in toggleActiveSpell("knight", "blade_spin", {}, {}, []), "com uma magia no slot, o botão devia recusar");
console.log("regras das magias ativas OK");

// Na hunt: só as ativas aparecem e o servidor recusa uma inativa.
const host: HuntHost = { now: () => 0, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} };
const state = new DungeonState();
const hunt = new Hunt(state, host, { mapId: "crypt", seed: 7, startLevel: 8 });
hunt.join("a", { name: "Ativas", classId: "knight", talents: ranks, spellXp: xp, activeSpells: three });
const p = state.players.get("a")!;
const expected = activeSpells("knight", ranks, xp, three);
check([...p.knownSpells].join() === expected.join(), `na hunt: ${[...p.knownSpells]}, esperado ${expected}`);
check([...p.knownSpells].filter((s) => SPELLS[s as SpellId].slot === 0).length === 3, "o slot 1 devia levar 3 magias");
if (!hunt.start("a")) throw new Error("a hunt não começou");
hunt.chooseSpell("a", { slot: 0, spellId: "aegis_strike" });
check(p.spell1 === "", `uma magia inativa não pode entrar no slot (entrou ${p.spell1})`);
hunt.chooseSpell("a", { slot: 0, spellId: "twin_slash" });
check(p.spell1 === "twin_slash", `a magia ativa devia entrar no slot (${p.spell1})`);
console.log(`na hunt: ${[...p.knownSpells].map((s) => SPELLS[s as SpellId].name).join(", ")}`);
console.log("ATIVAS OK");
