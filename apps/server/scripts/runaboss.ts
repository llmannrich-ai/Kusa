/**
 * Runa de boss uma vez por personagem, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - o boss morto larga uma runa sem dono por herói que ainda não levou a dele;
 *   - quem pega a runa anota o boss em `stats.bossRunes`; quem já levou a daquele boss passa por cima sem pegar;
 *   - na equipe, qualquer herói pega qualquer runa do boss (uma por herói), e um aliado que já levou não pega;
 *   - o mesmo boss de novo, na mesma hunt ou depois (`knownBossRunes`, vindo do banco), não dá outra runa;
 *   - outro boss ainda dá;
 *   - no deserto, o baú de runa recusa quem já levou a runa do Verme da Areia.
 * Uso: npx tsx scripts/runaboss.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MAPS, isRune, type MonsterKind } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

/** Mata um boss ao lado do herói e devolve as runas que caíram. */
function killBoss(a: Arena, kind: MonsterKind) {
  const before = new Set(a.state.items.keys());
  const boss = a.spawn(kind, 2);
  a.any.killMonster(boss, a.brain(boss), HERO);
  return [...a.state.items.values()].filter((it) => !before.has(it.id) && isRune(it.itemId));
}

// --- Primeira vez: a runa cai sem dono e conta quando é pega ------------------------------
const a = arena({ mapId: "crypt" });
const [rune, ...extra] = killBoss(a, "dragon");
check(!!rune && extra.length === 0, `o Dragão devia largar 1 runa, largou ${extra.length + (rune ? 1 : 0)}`);
check(!("owner" in rune) || !(rune as any).owner, "a runa no chão não tem dono");
check(a.seat().stats.bossRunes.length === 0, "a runa só conta quando alguém pega");
a.p.x = rune.x;
a.p.y = rune.y;
a.advance(200);
check(a.p.bag.includes(rune.itemId) && !a.state.items.has(rune.id), "o herói pega a runa");
check(a.seat().stats.bossRunes.join() === "dragon", `stats.bossRunes devia anotar o Dragão: ${a.seat().stats.bossRunes}`);
console.log("primeiro Dragão: runa sem dono, na bag OK");

// --- Runa de um boss que o herói já levou fica no chão -------------------------------------
const other = a.any.dropItem("rune-fury", a.p.x, a.p.y);
a.any.runeBoss.set(other.id, "dragon");
a.advance(200);
check(a.state.items.has(other.id), "quem já levou a runa do Dragão passa por cima de outra runa dele");
a.any.removeGroundItem(other.id);
console.log("runa de boss já levado não sai do chão OK");

// --- Equipe: qualquer um pega qualquer runa, uma por herói ---------------------------------
const t = arena({ mapId: "crypt", allies: [{ classId: "sorcerer" }, { classId: "druid" }] });
t.hunt.knownBossRunes("h3", ["dragon"]);
const runes = killBoss(t, "dragon");
check(runes.length === 2, `o Dragão devia largar 2 runas (2 heróis sem a dele), largou ${runes.length}`);
const ally = t.state.players.get("h2")!;
const veteran = t.state.players.get("h3")!;
for (const hero of [t.p, ally, veteran]) {
  hero.x = runes[0].x;
  hero.y = runes[0].y;
}
// Os três no mesmo tile: o veterano passa por cima, o herói pega uma e o aliado a outra.
t.advance(200);
check(veteran.bag.length === 0, "o aliado que já levou a runa do Dragão não pega nenhuma");
check(t.state.items.size === 0 || [...t.state.items.values()].every((it) => !runes.some((r) => r.id === it.id)), "as duas runas saem do chão");
check(t.p.bag.filter((id) => id.startsWith("rune-")).length === 1 && ally.bag.filter((id) => id.startsWith("rune-")).length === 1,
  `cada herói sem a runa pega uma (herói ${t.p.bag}, aliado ${ally.bag})`);
check(t.seat().stats.bossRunes.join() === "dragon" && t.seat("h2").stats.bossRunes.join() === "dragon", "os dois anotam o Dragão");
check(t.seat("h3").stats.bossRunes.length === 0, "o veterano não anota nada");
console.log("equipe: runas sem dono, uma por herói OK");

// --- Mesmo boss de novo -------------------------------------------------------------------
const again = killBoss(a, "dragon");
check(again.length === 0, `o segundo Dragão não devia dar runa (deu ${again.map((it) => it.itemId)})`);
check(a.notices.includes("Runa deste boss já levada"), "avisa que a runa do boss já foi levada");
check(a.seat().stats.bossRunes.join() === "dragon", "o Dragão é anotado uma vez só");
console.log("segundo Dragão na mesma hunt: sem runa OK");

// --- Outra hunt, com o que o banco já anotou -----------------------------------------------
const b = arena({ mapId: "crypt" });
b.hunt.knownBossRunes(HERO, ["dragon"]);
check(killBoss(b, "dragon").length === 0, "o Dragão que o personagem já matou não dá runa em outra hunt");
check(b.seat().stats.bossRunes.length === 0, "nada novo para anotar");
const [black, ...more] = killBoss(b, "blackDragon");
check(!!black && more.length === 0, "outro boss ainda dá a runa dele");
b.p.x = black.x;
b.p.y = black.y;
b.advance(200);
check(b.seat().stats.bossRunes.join() === "blackDragon", "anota só o boss novo");
console.log("hunt seguinte: Dragão sem runa, Dragão negro com runa OK");

// --- Baús de runa do deserto -------------------------------------------------------------
const c = arena({ mapId: "desert", openRoom: false });
c.hunt.knownBossRunes(HERO, [MAPS.desert.bosses[0][0]]);
const chest = [...c.state.chests.values()].find((x) => x.rune)!;
const worm = c.spawn("sandWorm", 2);
c.any.killMonster(worm, c.brain(worm), HERO);
check(!chest.locked, "o Verme morto destranca os baús");
c.p.x = chest.x;
c.p.y = chest.y + 1;
c.hunt.chooseRune(HERO, { chest: chest.id });
check(c.p.chosenRune === "" && !c.p.bag.includes(chest.rune), "quem já levou a runa do Verme não escolhe outra");

const e = arena({ mapId: "desert", openRoom: false });
const chest2 = [...e.state.chests.values()].find((x) => x.rune)!;
const worm2 = e.spawn("sandWorm", 2);
e.any.killMonster(worm2, e.brain(worm2), HERO);
e.p.x = chest2.x;
e.p.y = chest2.y + 1;
e.hunt.chooseRune(HERO, { chest: chest2.id });
check(e.p.chosenRune === chest2.rune, "a primeira vez o baú dá a runa");
check(e.seat().stats.bossRunes.join() === "sandWorm", "e anota o Verme");
console.log("baús do deserto: uma runa do Verme por personagem OK");

console.log("RUNA DE BOSS OK");
process.exit(0);
