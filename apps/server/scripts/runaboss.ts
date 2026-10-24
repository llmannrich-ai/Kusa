/**
 * Runa de boss uma vez por personagem, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - o boss morto larga uma runa só do herói (`owner`) e anota o boss em `stats.bossRunes`;
 *   - o herói pega a runa dele; runa reservada a outro jogador fica no chão;
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

// --- Primeira vez: a runa é do herói ---------------------------------------------------
const a = arena({ mapId: "crypt" });
const [rune, ...extra] = killBoss(a, "dragon");
check(!!rune && extra.length === 0, `o Dragão devia largar 1 runa, largou ${extra.length + (rune ? 1 : 0)}`);
check(rune.owner === HERO, `a runa devia ser só do herói (owner "${rune.owner}")`);
check(a.seat().stats.bossRunes.join() === "dragon", `stats.bossRunes devia anotar o Dragão: ${a.seat().stats.bossRunes}`);
a.p.x = rune.x;
a.p.y = rune.y;
a.advance(200);
check(a.p.bag.includes(rune.itemId) && !a.state.items.has(rune.id), "o herói pega a runa dele");
console.log("primeiro Dragão: runa do herói, na bag OK");

// --- Runa reservada a outro jogador ------------------------------------------------------
const other = a.any.dropItem("rune-fury", a.p.x, a.p.y);
other.owner = "outro";
a.advance(200);
check(a.state.items.has(other.id) && a.p.bag.filter((id) => id === "rune-fury").length <= 1, "runa de outro jogador fica no chão");
a.state.items.delete(other.id);
console.log("runa de outro jogador não sai do chão OK");

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
check(killBoss(b, "blackDragon").length === 1, "outro boss ainda dá a runa dele");
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
