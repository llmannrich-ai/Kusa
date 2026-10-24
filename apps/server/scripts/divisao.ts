/**
 * Divisão da XP e do gold na equipe, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - sozinho, o herói leva a XP inteira do monstro;
 *   - com 4 na equipe (um deles bot), cada um leva 1/4 da XP, mesmo quem não bateu; o gold também se divide em 4
 *     partes iguais (a do bot se perde);
 *   - o gold do baú se divide do mesmo jeito;
 *   - quem morreu fica de fora e a XP se divide pelos que estão jogando;
 *   - com bots, os itens de equipamento caem com a chance de humanos ÷ equipe (o bot não pega item do chão).
 * Uso: npx tsx scripts/divisao.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { ITEMS } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

/** Mata um orc pelo herói e devolve a XP que o monstro valia e quanto de XP e de gold cada um ganhou. */
function killOrc(a: Arena, ids: string[]) {
  const before = ids.map((id) => a.state.players.get(id)!.xp);
  const loot = ids.map((id) => a.state.players.get(id)!.loot);
  const orc = a.spawn("orc", 2);
  const xp = a.brain(orc).xp as number;
  a.any.killMonster(orc, a.brain(orc), HERO);
  return {
    xp,
    gains: ids.map((id, i) => a.state.players.get(id)!.xp - before[i]),
    gold: ids.map((id, i) => a.state.players.get(id)!.loot - loot[i]),
  };
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
const [g1, g2, g3, bot] = four.gold;
check(g1 > 0 && g1 === g2 && g2 === g3, `o gold devia sair igual para os 3 humanos: ${four.gold}`);
check(bot === 0, `o bot não guarda gold: ${bot}`);
console.log(`gold do orc: ${four.gold.join(" / ")} OK`);
const chest = ids.map((id) => team.state.players.get(id)!.loot);
team.any.chestReward("h2", team.p.x, team.p.y, 0);
const fromChest = ids.map((id, i) => team.state.players.get(id)!.loot - chest[i]);
check(fromChest[0] > 0 && fromChest[0] === fromChest[1] && fromChest[1] === fromChest[2] && fromChest[3] === 0,
  `o gold do baú devia sair igual para os 3 humanos: ${fromChest}`);
console.log(`gold do baú: ${fromChest.join(" / ")} OK`);

// --- Quem morreu fica de fora ------------------------------------------------------------------
team.state.players.get("h4")!.status = "dead";
const three = killOrc(team, ids);
const third = Math.max(1, Math.round(three.xp / 3));
check(three.gains.slice(0, 3).every((g) => g === third) && three.gains[3] === 0, `com 1 morto, 3 levam ${third} de ${three.xp} XP: ${three.gains}`);
console.log(`1 morto: ${three.gains.join(" / ")} de ${three.xp} XP OK`);

// --- Itens com bots: humanos ÷ equipe ---------------------------------------------------------
/** Itens de equipamento que 40 Dragões largam (2 garantidos cada) e o corte anotado na telemetria. */
function dragonItems(a: Arena) {
  let items = 0;
  for (let i = 0; i < 40; i++) {
    const before = a.state.items.size;
    const boss = a.spawn("dragon", 2);
    a.any.killMonster(boss, a.brain(boss), HERO);
    items += [...a.state.items.values()].slice(before).filter((it) => ITEMS[it.itemId]).length;
    a.state.items.clear();
    a.state.players.forEach((p) => { p.bag.splice(0, p.bag.length); });
  }
  return { items, cut: a.seat().stats.items.botCut as number };
}
const humans = dragonItems(arena({ mapId: "crypt", allies: [{ classId: "sorcerer" }, { classId: "druid" }, { classId: "paladin" }] }));
check(humans.items === 80 && humans.cut === 0, `sem bots, os 40 Dragões deviam largar 80 itens: ${humans.items} (corte ${humans.cut})`);
const bots = dragonItems(arena({ mapId: "crypt", allies: [{ classId: "sorcerer", bot: true }, { classId: "druid", bot: true }, { classId: "paladin", bot: true }] }));
check(bots.items >= 8 && bots.items <= 34, `com 3 bots, devia cair ~25% de 80 itens: ${bots.items}`);
check(bots.items + bots.cut === 80, `o corte anotado devia fechar a conta: ${bots.items} + ${bots.cut}`);
console.log(`itens com 3 bots: ${bots.items} de 80 (sem bots: ${humans.items}) OK`);

console.log("DIVISAO DA EQUIPE OK");
process.exit(0);
