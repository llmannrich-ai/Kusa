/**
 * Runa de boss uma vez por personagem, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - o boss morto põe a runa direto na bag de cada herói que ainda não levou a dele (nada cai no chão) e anota o
 *     boss em `stats.bossRunes`; quem já levou não recebe;
 *   - com a bag cheia, o item de menor valor cai no chão e a runa entra no lugar;
 *   - a runa passa de mão em mão: largada da bag, outro herói pega;
 *   - o mesmo boss de novo, na mesma hunt ou depois (`knownBossRunes`, vindo do banco), não dá outra runa;
 *   - outro boss ainda dá;
 *   - no deserto, o baú de runa recusa quem já levou a runa do Verme da Areia.
 * Uso: npx tsx scripts/runaboss.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { BAG_SIZE, MAPS, isRune, itemId, lootSellPrice, type MonsterKind } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

const runesIn = (bag: readonly string[]) => bag.filter((id) => isRune(id));

/** Mata um boss ao lado do herói e devolve as runas que entraram na bag de cada um (e se alguma caiu no chão). */
function killBoss(a: Arena, kind: MonsterKind) {
  const before = new Map([...a.state.players].map(([id, p]) => [id, runesIn(p.bag).length]));
  const ground = a.state.items.size;
  const boss = a.spawn(kind, 2);
  a.any.killMonster(boss, a.brain(boss), HERO);
  const gained = (id = HERO) => runesIn(a.state.players.get(id)!.bag).slice(before.get(id));
  const onGround = [...a.state.items.values()].slice(ground).filter((it) => isRune(it.itemId));
  return { gained, onGround };
}

// --- Primeira vez: a runa vai direto para a bag -------------------------------------------
const a = arena({ mapId: "crypt" });
const first = killBoss(a, "dragon");
check(first.gained().length === 1, `o Dragão devia pôr 1 runa na bag, pôs ${first.gained().length}`);
check(first.onGround.length === 0, "a runa do boss não cai no chão");
check(a.seat().stats.bossRunes.join() === "dragon", `stats.bossRunes devia anotar o Dragão: ${a.seat().stats.bossRunes}`);
console.log("primeiro Dragão: runa direto na bag OK");

// --- Mesmo boss de novo -------------------------------------------------------------------
const again = killBoss(a, "dragon");
check(again.gained().length === 0, `o segundo Dragão não devia dar runa (deu ${again.gained()})`);
check(a.notices.includes("Runa deste boss já levada"), "avisa que a runa do boss já foi levada");
check(a.seat().stats.bossRunes.join() === "dragon", "o Dragão é anotado uma vez só");
console.log("segundo Dragão na mesma hunt: sem runa OK");

// --- Outra hunt, com o que o banco já anotou -----------------------------------------------
const b = arena({ mapId: "crypt" });
b.hunt.knownBossRunes(HERO, ["dragon"]);
check(killBoss(b, "dragon").gained().length === 0, "o Dragão que o personagem já matou não dá runa em outra hunt");
check(b.seat().stats.bossRunes.length === 0, "nada novo para anotar");
check(killBoss(b, "blackDragon").gained().length === 1, "outro boss ainda dá a runa dele");
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

// --- Equipe: cada herói sem a runa recebe a sua, onde estiver -----------------------------------
const t = arena({ mapId: "crypt", allies: [{ classId: "sorcerer" }, { classId: "druid" }, { classId: "paladin", bot: true }] });
t.hunt.knownBossRunes("h3", ["dragon"]);
const ally = t.state.players.get("h2")!;
ally.x += 20; // longe da luta, recebe do mesmo jeito
const party = killBoss(t, "dragon");
check(party.gained(HERO).length === 1 && party.gained("h2").length === 1, "os dois heróis sem a runa recebem uma cada");
check(party.gained("h3").length === 0, "o aliado que já levou a runa do Dragão não recebe");
check(party.gained("h4").length === 0, "o bot não recebe runa");
check(party.onGround.length === 0, "nenhuma runa no chão");
console.log("equipe: runa na bag de cada herói sem a dele OK");

// --- Bag cheia: o item de menor valor cai no chão ------------------------------------------------
const f = arena({ mapId: "crypt" });
const cheap = itemId("weapon", "sword", 1);
const bag = [itemId("armor", "war", 3), itemId("boots", "boots", 2), cheap, itemId("legs", "war", 4)];
while (bag.length < BAG_SIZE) bag.push(itemId("armor", "war", 3));
f.p.bag.splice(0, f.p.bag.length, ...bag);
check(bag.every((id) => id === cheap || lootSellPrice(id) > lootSellPrice(cheap)), "o teste precisa de um item mais barato que os outros");
const full = killBoss(f, "dragon");
check(f.p.bag.length === BAG_SIZE && full.gained().length === 1, `com a bag cheia, a runa entra (bag ${f.p.bag.length}/${BAG_SIZE})`);
check(!f.p.bag.includes(cheap), "o item de menor valor sai da bag");
const dropped = [...f.state.items.values()].find((it) => it.itemId === cheap);
check(!!dropped && dropped.x === f.p.x && dropped.y === f.p.y, "e cai no chão aos pés do herói");
f.advance(200);
check(!f.p.bag.includes(cheap), "o herói não pega de volta o que caiu enquanto está em cima");
console.log("bag cheia: o item mais barato cai e a runa entra OK");

// --- A runa passa de mão em mão ------------------------------------------------------------------
const g = arena({ mapId: "crypt", allies: [{ classId: "sorcerer" }] });
const giver = killBoss(g, "dragon").gained()[0];
const friend = g.state.players.get("h2")!;
friend.x += 10;
g.hunt.bagDrop(HERO, { index: g.p.bag.indexOf(giver) });
check(!g.p.bag.includes(giver), "o herói larga a runa");
friend.x = g.p.x;
friend.y = g.p.y;
g.advance(200);
check(friend.bag.includes(giver) && !g.p.bag.includes(giver), "o colega pega a runa largada");
console.log("runa passada de mão em mão OK");

console.log("RUNA DE BOSS OK");
process.exit(0);
