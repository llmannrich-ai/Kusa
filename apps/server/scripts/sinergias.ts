/**
 * Teste de fumaça das sinergias e dos Tomos do Grimório contra um servidor com KUSA_START_LEVEL=8 e KUSA_ALL_SPELLS=1
 * (todas as magias no nível máximo e todos os Tomos comprados):
 *   - regras: um Tomo por ramo, preso ao primeiro nó do tronco; a raiz não tem Tomo; as vizinhas são recíprocas e
 *     cada nível delas soma `SYNERGY_PER_LEVEL`; a força extra multiplica dano, cura, escudo e dano contínuo;
 *   - na hunt, o servidor manda ao cliente a mesma força extra que `spellBonuses` calcula, para cada magia de cada classe
 *     (o protocolo manda o número em 32 bits, então a conta bate com folga de 1e-6).
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 PORT=2602 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/sinergias.ts http://localhost:2602
 */
import { Client } from "@colyseus/sdk";
import {
  CLASS_IDS, MSG, SPELLS, SPELL_LEVEL_XP, SPELL_MAX_LEVEL, SYNERGY_PER_LEVEL, spellAtRank, spellBonus, spellBonuses,
  spellNeighbors, spellRanks, talentTree, type ClassId, type SpellId, type SpellXp, type TalentRanks,
} from "@kusa/shared";
import { enter, wait } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

rules();
for (const classId of CLASS_IDS) await synced(classId);
console.log("SINERGIAS OK");
process.exit(0);

/** O Grimório inteiro, como o servidor com KUSA_ALL_SPELLS=1 monta. */
function everything(classId: ClassId): { ranks: TalentRanks; xp: SpellXp } {
  const tree = talentTree(classId);
  return {
    ranks: Object.fromEntries(tree.map((t) => [t.id, t.maxRank])),
    xp: Object.fromEntries(tree.filter((t) => t.spellId).map((t) => [t.id, SPELL_LEVEL_XP[SPELL_LEVEL_XP.length - 1]])),
  };
}

function rules() {
  const check = (ok: boolean, what: string) => { if (!ok) throw new Error(what); };
  for (const classId of CLASS_IDS) {
    const tree = talentTree(classId);
    const tomes = tree.filter((t) => t.kind === "tome");
    // Um Tomo por ramo que tem magia (o Xamã Orc da Fase 1 ainda tem ramos só com áureas, que não ganham Tomo).
    const withSpell = [0, 1, 2].filter((col) => tree.some((t) => t.col === col && t.row > 0 && t.kind === "spell"));
    check(tomes.map((t) => t.col).sort().join() === withSpell.join(), `${classId}: devia ter um Tomo por ramo com magia`);
    if (classId !== "shaman") check(withSpell.length === 3, `${classId}: todo ramo devia ter magia`);
    for (const tome of tomes) {
      const parent = tree.find((t) => t.id === tome.requires?.id);
      check(!!parent && parent.col === tome.col && parent.row === 1 && parent.lane === 0, `${tome.id}: pai fora do tronco do ramo`);
    }
    for (const t of tree.filter((n) => n.spellId)) {
      for (const n of spellNeighbors(classId, t.spellId!)) {
        check(spellNeighbors(classId, n).includes(t.spellId!), `${t.spellId} e ${n}: vizinhança não é recíproca`);
      }
    }
  }
  const { ranks, xp } = everything("knight");
  const levels = spellRanks("knight", ranks, xp);
  // Fenda Sísmica: Terremoto e Ferida Aberta no nível máximo e o Tomo da Lâmina no 3.
  const rift = spellBonus("knight", "seismic_rift", ranks, levels);
  check(spellNeighbors("knight", "seismic_rift").sort().join() === "earthquake,open_wound", "vizinhas da Fenda Sísmica");
  check(Math.abs(rift.synergy - 2 * SPELL_MAX_LEVEL * SYNERGY_PER_LEVEL) < 1e-9, `sinergia da Fenda: ${rift.synergy}`);
  check(Math.abs(rift.tome - 0.15) < 1e-9, `Tomo da Fenda: ${rift.tome}`);
  // A raiz (Giro da Lâmina) não tem ramo, então não tem Tomo.
  check(spellBonus("knight", "blade_spin", ranks, levels).tome === 0, "a raiz não devia ganhar Tomo");
  // Sem as vizinhas aprendidas, não há sinergia.
  check(spellBonus("knight", "seismic_rift", { knight_seismic_rift: 1 }, { seismic_rift: 0 }).total === 0, "sinergia sem vizinhas");
  // A força extra multiplica a força do nível: dano, dano contínuo e escudo.
  const plain = spellAtRank(SPELLS.open_wound, 2);
  const strong = spellAtRank(SPELLS.open_wound, 2, 0.5);
  check(Math.abs(strong.damage! - plain.damage! * 1.5) < 1e-9, "dano com força extra");
  check(Math.abs(strong.dot!.perSec - plain.dot!.perSec * 1.5) < 1e-9, "dano contínuo com força extra");
  check(spellAtRank(SPELLS.aegis_strike, 0, 0.2).barrier! > SPELLS.aegis_strike.barrier!, "escudo com força extra");
  console.log("regras das sinergias e dos Tomos OK");
}

/** O servidor manda a força extra de cada magia conhecida, igual à conta do `packages/shared`. */
async function synced(classId: ClassId) {
  const { room, me } = await enter(client, classId, `sinergias ${classId}`);
  await wait(200);
  const { ranks, xp } = everything(classId);
  const expected = spellBonuses(classId, ranks, xp);
  const got = Object.fromEntries([...me().spellBonus.entries()]) as Record<string, number>;
  for (const id of Object.keys(expected) as SpellId[]) {
    if (Math.abs((got[id] ?? 0) - expected[id]!) > 1e-6) throw new Error(`${classId} ${id}: servidor ${got[id]}, esperado ${expected[id]}`);
  }
  if (Object.keys(got).length !== Object.keys(expected).length) throw new Error(`${classId}: magias a mais no servidor`);
  const best = Object.entries(expected).sort((a, b) => b[1]! - a[1]!)[0];
  console.log(`${classId}: ${Object.keys(got).length} magias com força extra (a maior: ${SPELLS[best[0] as SpellId].name} +${Math.round(best[1]! * 100)}%)`);
  await room.leave();
}
