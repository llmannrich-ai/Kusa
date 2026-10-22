/**
 * Teste de fumaça das costelas do Grimório (galhos laterais do tronco) contra um servidor com KUSA_START_LEVEL=8 e
 * KUSA_ALL_SPELLS=1 (todas as magias no nível 5, com a Maestria):
 *   - regras: as costelas ficam no ramo do pai e acima da bifurcação das especializações, e o nó de dois pais só
 *     abre com os dois no nível 1;
 *   - na hunt, cada magia das costelas sai (uma de cada slot por hunt) e, se tem dano, fere algum monstro.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 PORT=2602 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/costelas.ts http://localhost:2602
 */
import { Client } from "@colyseus/sdk";
import { CLASS_IDS, MSG, SPELL_LEVEL_XP, SPELLS, TALENTS, talentBlocker, talentTree, type ClassId, type SpellId } from "@kusa/shared";
import { approach, enter, inSight, until, wait } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

rules();
for (const classId of CLASS_IDS) await castRibs(classId);
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

/** Uma hunt por par (uma magia de cada slot); a classe com mais magias num slot repete a última do outro. */
async function castRibs(classId: ClassId) {
  const bySlot = [0, 1].map((slot) => ribs(classId).map((t) => t.spellId!).filter((id) => SPELLS[id].slot === slot));
  const hunts = Math.max(bySlot[0].length, bySlot[1].length);
  for (let i = 0; i < hunts; i++) {
    const pair = bySlot.map((list) => list[Math.min(i, list.length - 1)]) as [SpellId, SpellId];
    const { room, me, spells, damage, notices } = await enter(client, classId, `costelas ${pair.join("+")}`);
    room.send(MSG.chooseSpell, { slot: 0, spellId: pair[0] });
    room.send(MSG.chooseSpell, { slot: 1, spellId: pair[1] });
    await wait(200);
    for (const slot of [0, 1] as const) {
      const id = pair[slot];
      const def = SPELLS[id];
      const hits = () => damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer).length;
      const casts = () => spells.filter((s) => s.from === room.sessionId && s.spellId === id).length;
      const harms = Boolean(def.damage || def.field?.damage);
      // A magia em volta de si sai mesmo sem ninguém perto: se o monstro morreu ou se afastou entre o herói chegar
      // e a magia sair, ela não fere ninguém. Espera a recarga e tenta de novo (falhou no CI assim, à toa).
      let hit = false;
      for (let round = 0; round < 3 && !hit; round++) {
        if (round > 0) await wait(def.cooldownMs);
        const castsBefore = casts();
        const hitsBefore = hits();
        // Colado num monstro à vista, toda forma de magia acerta: em volta de si, corpo a corpo, linha, leque e área.
        // O servidor recusa sem alvo (o monstro da magia anterior pode ter morrido): chega de novo e tenta outra vez.
        for (let tries = 0; tries < 3 && casts() === castsBefore; tries++) {
          await approach(room, me, 1, () => inSight(room, me(), 1).length > 0 && me().mana >= def.manaCost);
          room.send(MSG.cast, { slot });
          await until(() => casts() > castsBefore, 1500, "").catch(() => {});
        }
        if (casts() === castsBefore) throw new Error(`${id} não saiu (avisos: ${notices.slice(-3).join(" | ") || "nenhum"})`);
        hit = !harms || await until(() => hits() > hitsBefore, 3000, "").then(() => true, () => false);
      }
      if (!hit) throw new Error(`${id} não feriu nenhum monstro em 3 tentativas`);
      console.log(`${classId}: ${def.name} ok`);
    }
    await room.leave();
  }
}
