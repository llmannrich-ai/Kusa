/**
 * Divisão da XP na equipe, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - sozinho, o herói leva a XP inteira do monstro;
 *   - com 4 na equipe (um deles bot), cada um leva 1/4, mesmo quem não bateu;
 *   - quem morreu fica de fora e a XP se divide pelos que estão jogando.
 * Uso: npx tsx scripts/xpequipe.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { HERO, arena, check, type Arena } from "./arena.ts";

/** Mata um orc pelo herói e devolve a XP que o monstro valia e quanto cada um ganhou. */
function killOrc(a: Arena, ids: string[]) {
  const before = ids.map((id) => a.state.players.get(id)!.xp);
  const orc = a.spawn("orc", 2);
  const xp = a.brain(orc).xp as number;
  a.any.killMonster(orc, a.brain(orc), HERO);
  return { xp, gains: ids.map((id, i) => a.state.players.get(id)!.xp - before[i]) };
}

// --- Sozinho ------------------------------------------------------------------------------
const solo = arena({ mapId: "crypt" });
const one = killOrc(solo, [HERO]);
check(one.gains[0] === one.xp, `sozinho, o herói devia levar ${one.xp} XP, levou ${one.gains[0]}`);
console.log(`sozinho: ${one.gains[0]} de ${one.xp} XP OK`);

// --- Equipe de 4, com um bot: partes iguais, mesmo quem não bateu --------------------------
const team = arena({ mapId: "crypt", allies: [{ classId: "sorcerer" }, { classId: "druid" }, { classId: "paladin", bot: true }] });
const ids = [HERO, "h2", "h3", "h4"];
const four = killOrc(team, ids);
const quarter = Math.max(1, Math.round(four.xp / 4));
check(four.gains.every((g) => g === quarter), `com 4, cada um devia levar ${quarter} de ${four.xp} XP: ${four.gains}`);
console.log(`equipe de 4: ${four.gains.join(" / ")} de ${four.xp} XP OK`);

// --- Quem morreu fica de fora ------------------------------------------------------------------
team.state.players.get("h4")!.status = "dead";
const three = killOrc(team, ids);
const third = Math.max(1, Math.round(three.xp / 3));
check(three.gains.slice(0, 3).every((g) => g === third) && three.gains[3] === 0, `com 1 morto, 3 levam ${third} de ${three.xp} XP: ${three.gains}`);
console.log(`1 morto: ${three.gains.join(" / ")} de ${three.xp} XP OK`);

console.log("XP DA EQUIPE OK");
process.exit(0);
