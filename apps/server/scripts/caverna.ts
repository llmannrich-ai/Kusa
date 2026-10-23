/**
 * Teste da caverna do deserto, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - o gerador põe a boca da caverna na superfície e o subterrâneo (covil e sala dos 4 baús) separado por rocha;
 *   - pisar na boca leva para perto da saída no subterrâneo, e pisar na saída traz de volta;
 *   - os 4 baús de runa nascem trancados, com as runas do mapa, e ninguém escolhe antes do boss morrer;
 *   - morto o Verme da Areia: os baús destrancam, o portal do boss abre na sala dos baús e o boss não dropa runa;
 *   - o herói colado num baú leva a runa para a bag; uma por jogador, e o baú continua cheio para os outros;
 *   - baú longe demais não abre.
 * Uso: npx tsx scripts/caverna.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MAPS, RUNES, Tile, caveDestination, isUnderground, isWalkable, tileAt, tileDistance } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const a = arena({ mapId: "desert", openRoom: false, startLevel: 8 });
const { hunt, state, any, p, d } = a;
const cave = d.cave;
check(!!cave, "o deserto devia ter caverna");
if (!cave) process.exit(1);

// --- Gerador ------------------------------------------------------------------------
check(tileAt(d, cave.entrance.x, cave.entrance.y) === Tile.Cave, "a boca da caverna devia ser um tile de caverna");
check(tileAt(d, cave.exit.x, cave.exit.y) === Tile.Cave, "a saída do subterrâneo devia ser um tile de caverna");
check(!isUnderground(d, cave.entrance.x) && isUnderground(d, cave.exit.x), "boca na superfície, saída embaixo");
check(isUnderground(d, d.bossPortal.x) && isUnderground(d, d.boss.x + 1), "covil e portal no subterrâneo");
check(cave.chests.length === 4, `a sala devia ter 4 baús, tem ${cave.chests.length}`);
check(caveDestination(d, cave.entrance.x, cave.entrance.y) === cave.exit, "a boca leva à saída");
check(isWalkable(d, cave.entrance.x, cave.entrance.y + 1), "a boca abre para o sul");
console.log(`caverna em ${cave.entrance.x},${cave.entrance.y}; saída em ${cave.exit.x},${cave.exit.y}`);

// --- Descer -------------------------------------------------------------------------
a.advance(600);
p.x = cave.entrance.x;
p.y = cave.entrance.y + 1;
any.seats.get(HERO).nextMoveAt = 0;
hunt.move(HERO, { dx: 0, dy: -1 });
a.advance(100);
check(isUnderground(d, p.x) && tileDistance(p.x, p.y, cave.exit.x, cave.exit.y) <= 3, `pisar na boca devia descer (${a.where()})`);
check(tileAt(d, p.x, p.y) !== Tile.Cave, "chega ao lado da saída, não em cima dela");
console.log("descer pela caverna OK");

// --- Baús trancados -----------------------------------------------------------------
const chests = [...state.chests.values()].filter((c) => c.rune);
check(chests.length === 4, `4 baús de runa, veio ${chests.length}`);
check(chests.map((c) => c.rune).join() === MAPS.desert.rewardRunes!.join(), "os baús guardam as runas do mapa, na ordem");
check(chests.every((c) => c.locked), "os baús nascem trancados");
const [first, second] = chests;
p.x = second.x;
p.y = second.y + 1;
hunt.chooseRune(HERO, { chest: second.id });
check(p.chosenRune === "", "ninguém escolhe runa antes do boss morrer");

// --- Boss ---------------------------------------------------------------------------
const worm = a.place("sandWorm", -2, 1);
const items = state.items.size;
any.killMonster(worm, any.brains.get(worm.id), HERO);
check(state.bossDefeated, "o Verme morto conta como boss derrotado");
check(chests.every((c) => !c.locked), "o boss morto destranca os baús de runa");
check(tileAt(any.dungeon, d.bossPortal.x, d.bossPortal.y) === Tile.Portal, "o portal do boss abre na sala dos baús");
const dropped = [...state.items.values()].slice(items).map((it) => it.itemId);
check(!dropped.some((id) => id in RUNES), `o boss da caverna não dropa runa (dropou ${dropped.join()})`);
console.log("boss morto: baús destrancados e portal na sala OK");

// --- Escolha ------------------------------------------------------------------------
p.x = first.x + 6;
p.y = first.y + 2;
hunt.chooseRune(HERO, { chest: first.id });
check(p.chosenRune === "", "baú longe demais não abre");

p.x = second.x;
p.y = second.y + 1;
const bag = p.bag.length;
hunt.chooseRune(HERO, { chest: second.id });
check(p.chosenRune === second.rune, `devia levar ${second.rune}, levou "${p.chosenRune}"`);
check(p.bag.length === bag + 1 && p.bag.includes(second.rune), "a runa vai para a bag");
check(!second.opened, "o baú continua cheio para os outros jogadores");

p.x = first.x;
p.y = first.y + 1;
hunt.chooseRune(HERO, { chest: first.id });
check(p.chosenRune === second.rune && p.bag.length === bag + 1, "uma runa por jogador");
console.log(`escolha: ${RUNES[second.rune].name} na bag, segunda escolha recusada OK`);

// --- Subir --------------------------------------------------------------------------
p.x = cave.exit.x;
p.y = cave.exit.y - 1;
any.seats.get(HERO).nextMoveAt = 0;
hunt.move(HERO, { dx: 0, dy: 1 });
a.advance(100);
check(!isUnderground(d, p.x) && tileDistance(p.x, p.y, cave.entrance.x, cave.entrance.y) <= 3, `pisar na saída devia subir (${a.where()})`);
console.log("subir pela caverna OK");

console.log("CAVERNA OK");
process.exit(0);
