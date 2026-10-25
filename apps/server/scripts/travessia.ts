/**
 * Teste da Caverna da Travessia, sem servidor (`arena.ts`: relógio falso, sorteios de seed fixa):
 *   - o gerador faz a chegada embaixo, o tronco de 2 zonas e dois covis em cima, um de cada lado, com 3 zonas, um nicho
 *     e uma câmara lateral por túnel;
 *   - a hunt põe o Basilisco no covil oeste e o Observador no leste, cada um na profundidade do covil (sem sorteio);
 *   - morto o Basilisco, só o portal do covil oeste abre, com o crédito do boss (runa e `bossKills`) para o herói;
 *   - sair pelo portal oeste dá o bônus dele (50%); morto o Observador, o portal leste dá o bônus maior (100%);
 *   - a troca de anfitrião reabre só os portais dos covis vencidos.
 * Uso: npx tsx scripts/travessia.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MAPS, MONSTERS, PORTAL_HOLD_MS, Tile, centerOf, generateDungeon, lairPortalAt, monsterStats, tileAt } from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { stateFromJSON } from "../src/snapshot.ts";
import { DungeonState } from "../src/state.ts";
import { HERO, arena, check } from "./arena.ts";

const map = MAPS.cavern;
const lairs = map.lairs!;
const seed = Number(process.env.KUSA_SEED) || 4242;

// --- Gerador ------------------------------------------------------------------------
const d = generateDungeon(seed, "cavern");
check(d.lairs?.length === 2, `2 covis, veio ${d.lairs?.length}`);
const [west, east] = d.lairs!;
check(centerOf(west.room).x < d.width / 2 && centerOf(east.room).x > d.width / 2, "covil oeste à esquerda e leste à direita");
check(d.portal.y > centerOf(west.room).y + 40 && d.portal.y > centerOf(east.room).y + 40, "a chegada fica embaixo, longe dos covis");
check(d.path.length === 8 && d.side.length === 2 && d.meadows.length === 2,
  `2 zonas no tronco, 3 por túnel, 1 câmara e 1 nicho por túnel; veio ${d.path.length}, ${d.side.length} e ${d.meadows.length}`);
check(d.path.slice(0, 2).every((z) => Math.abs(centerOf(z).x - d.width / 2) <= 3), "o tronco sobe pelo meio, antes da bifurcação");
check(d.path.slice(2, 5).every((z) => centerOf(z).x < d.width / 2) && d.path.slice(5).every((z) => centerOf(z).x > d.width / 2), "zonas 2-4 a oeste, 5-7 a leste");
check(d.lairs!.every((l) => tileAt(d, l.portal.x, l.portal.y) === Tile.Floor), "os portais dos covis nascem fechados (chão)");
check(lairPortalAt(d, east.portal.x, east.portal.y) === 1 && lairPortalAt(d, d.portal.x, d.portal.y) === -1, "lairPortalAt acha o covil");
console.log(`covis em ${JSON.stringify(centerOf(west.room))} e ${JSON.stringify(centerOf(east.room))}; chegada em ${JSON.stringify(d.portal)}`);

// --- Bosses no lugar ----------------------------------------------------------------
{
  const host: HuntHost = { now: () => 0, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} };
  const hunt = new Hunt(new DungeonState(), host, { mapId: "cavern", seed });
  hunt.join("x", { name: "X", classId: "knight", talents: {}, spellXp: {} });
  check(hunt.start("x"), "a hunt na Travessia começou");
  const bosses = [...hunt.state.monsters.values()].filter((m) => MONSTERS[m.kind as keyof typeof MONSTERS].rank === "boss");
  check(bosses.length === 2, `2 bosses, veio ${bosses.map((m) => m.kind).join()}`);
  lairs.forEach((lair, i) => {
    const boss = bosses.find((m) => m.kind === lair.boss);
    const c = centerOf(d.lairs![i].room);
    check(!!boss && boss.x === c.x && boss.y === c.y, `${lair.boss} no centro do covil ${lair.side}`);
    check(boss!.maxHp === monsterStats(lair.boss, lair.depth).maxHp, `${lair.boss} na profundidade ${lair.depth}`);
  });
  const [basilisk, beholder] = lairs.map((l) => monsterStats(l.boss, l.depth));
  check(beholder.maxHp > basilisk.maxHp * 2, `o Observador bem mais forte que o Basilisco (${beholder.maxHp} × ${basilisk.maxHp})`);
  console.log(`Basilisco ${basilisk.maxHp} de vida, Observador ${beholder.maxHp}: OK`);
}

// --- Basilisco: abre só o portal oeste ----------------------------------------------
{
  const a = arena({ mapId: "cavern", seed, openRoom: true });
  const { state, any, p } = a;
  const boss = a.spawn("basilisk", 2);
  any.brains.get(boss.id).lair = 0;
  any.killMonster(boss, any.brains.get(boss.id), HERO);
  check(state.lairsDown === 1 && state.bossDefeated, `covil oeste vencido (lairsDown ${state.lairsDown})`);
  check(tileAt(any.dungeon, west.portal.x, west.portal.y) === Tile.Portal, "o portal oeste abriu");
  check(tileAt(any.dungeon, east.portal.x, east.portal.y) !== Tile.Portal, "o portal leste continua fechado");
  check(a.notices.some((n) => n.includes("covil oeste")), `aviso do covil oeste (${a.notices.join(" | ")})`);
  check(a.seat().stats.bossKills.join() === "basilisk", `crédito do Basilisco: ${a.seat().stats.bossKills}`);
  check(a.seat().bossRunes.has("basilisk"), "o Basilisco dá a runa dele (o mapa mundi lê a runa para liberar o caminho)");

  // Troca de anfitrião: só o portal oeste reabre na hunt restaurada.
  const snapshot = JSON.parse(JSON.stringify({ state: state.toJSON(), hunt: a.hunt.exportInternals() }));
  const restored = new Hunt(stateFromJSON(snapshot.state), { now: () => 0, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} },
    { mapId: "cavern", seed, restore: snapshot.hunt });
  const rd = (restored as any).dungeon;
  check(tileAt(rd, west.portal.x, west.portal.y) === Tile.Portal && tileAt(rd, east.portal.x, east.portal.y) !== Tile.Portal, "o retrato reabre só o portal oeste");

  // Sair pelo portal oeste: bônus de 50%.
  p.loot = 200;
  p.x = west.portal.x;
  p.y = west.portal.y;
  any.seats.get(HERO).portalSince = a.now();
  any.usePortals(a.now() + PORTAL_HOLD_MS);
  check(p.status === "completed" && p.loot === 200 + 200 * lairs[0].portalBonus, `portal oeste: ${p.status}, loot ${p.loot}`);
  console.log(`Basilisco: portal oeste aberto, loot 200 → ${p.loot}: OK`);
}

// --- Observador: portal leste com o bônus maior -------------------------------------
{
  const a = arena({ mapId: "cavern", seed, openRoom: true });
  const { state, any, p } = a;
  const boss = a.spawn("beholder", 3);
  any.brains.get(boss.id).lair = 1;
  any.killMonster(boss, any.brains.get(boss.id), HERO);
  check(state.lairsDown === 2, `só o covil leste vencido (lairsDown ${state.lairsDown})`);
  check(tileAt(any.dungeon, east.portal.x, east.portal.y) === Tile.Portal, "o portal leste abriu");
  check(tileAt(any.dungeon, west.portal.x, west.portal.y) !== Tile.Portal, "o portal oeste continua fechado");
  p.loot = 200;
  p.x = east.portal.x;
  p.y = east.portal.y;
  any.seats.get(HERO).portalSince = a.now();
  any.usePortals(a.now() + PORTAL_HOLD_MS);
  check(p.status === "completed" && p.loot === 200 + 200 * lairs[1].portalBonus, `portal leste: ${p.status}, loot ${p.loot}`);
  console.log(`Observador: portal leste aberto, loot 200 → ${p.loot}: OK`);
}

console.log("TRAVESSIA OK");
process.exit(0);
