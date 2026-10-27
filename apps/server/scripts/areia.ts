/**
 * Teste da areia fofa (Dunas Cantantes e Mesas de Solária), sem servidor: a simulação (`Hunt`) roda sozinha, com
 * relógio falso e o cenário montado (`arena.ts`):
 *   - o gerador põe areia fofa nos dois mapas (mais nas Dunas), e ela é andável e não tapa a visão;
 *   - o herói anda mais devagar na areia fofa: o passo que entra nela demora 1/`SAND_SPEED` do passo no chão firme;
 *   - o monstro também (o mesmo monstro, perseguindo o herói, anda mais devagar na areia fofa);
 *   - flechas e magias passam por cima (a linha de visão atravessa a areia fofa).
 * Uso: npx tsx apps/server/scripts/areia.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { SAND_SPEED, Tile, blocksSight, generateDungeon, hasLineOfSight, isWalkable } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

// Gerador: os dois mapas têm areia fofa; as Dunas, bem mais que as Mesas.
const sandIn = (mapId: "dunes" | "mesas") => {
  let total = 0;
  for (let i = 1; i <= 10; i++) total += generateDungeon(i * 7919, mapId).tiles.filter((t) => t === Tile.Sand).length;
  return total / 10;
};
const dunes = sandIn("dunes");
const mesas = sandIn("mesas");
check(dunes > 1000 && mesas > 200, `areia fofa de menos no gerador: Dunas ${dunes}, Mesas ${mesas} tiles por mapa`);
check(dunes > mesas * 1.5, `as Dunas deveriam ter bem mais areia fofa que as Mesas (${dunes} × ${mesas})`);
console.log(`gerador: ${Math.round(dunes)} tiles de areia fofa nas Dunas, ${Math.round(mesas)} nas Mesas`);

/** Corredor de 12 tiles a leste do herói, todo de chão firme ou de areia fofa (o resto da sala fica como está). */
function corridor(a: ReturnType<typeof arena>, tile: number) {
  const d = a.any.dungeon;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -1; dx <= 12; dx++) d.tiles[(a.p.y + dy) * d.width + a.p.x + dx] = Tile.Floor;
  for (let dx = 1; dx <= 12; dx++) d.tiles[a.p.y * d.width + a.p.x + dx] = tile;
}

// Herói: anda segurando para o leste por 3 s, primeiro no chão firme, depois na areia fofa.
function heroSteps(tile: number) {
  const a = arena({ mapId: "dunes", openRoom: true });
  corridor(a, tile);
  const x0 = a.p.x;
  a.advance(1000);
  a.hunt.move(HERO, { dx: 1, dy: 0, hold: true });
  for (let t = 0; t < 3000; t += 100) {
    a.hunt.move(HERO, { dx: 1, dy: 0, hold: true });
    a.advance(100);
  }
  check(isWalkable(a.any.dungeon, a.p.x, a.p.y), "o herói saiu do corredor");
  return { steps: a.p.x - x0, stepMs: a.p.stepMs };
}
const firm = heroSteps(Tile.Floor);
const soft = heroSteps(Tile.Sand);
const heroRatio = soft.steps / firm.steps;
check(firm.steps >= 5, `o herói quase não andou no chão firme (${firm.steps} tiles em 3 s)`);
check(Math.abs(heroRatio - SAND_SPEED) < 0.12, `na areia fofa o herói deveria andar ~${SAND_SPEED} do chão firme; andou ${soft.steps} × ${firm.steps} tiles`);
check(Math.abs(firm.stepMs / soft.stepMs - SAND_SPEED) < 0.05, `passo na areia fofa ${soft.stepMs} ms, no firme ${firm.stepMs} ms`);
console.log(`herói: ${firm.steps} tiles no firme e ${soft.steps} na areia fofa em 3 s (passo ${firm.stepMs} → ${soft.stepMs} ms)`);

// Monstro: o mesmo zumbi persegue o herói pelo corredor; na areia fofa, cada passo demora mais.
function monsterStepMs(tile: number) {
  const a = arena({ mapId: "dunes", openRoom: true });
  corridor(a, tile);
  const m = a.place("zombie", 5, 0);
  // O herói fica parado; o zumbi vem pelo corredor (todo do mesmo chão) até ele.
  a.until(() => m.x < a.p.x + 3, 8000, "o zumbi não veio atrás do herói");
  check(a.any.dungeon.tiles[m.y * a.any.dungeon.width + m.x] === tile, "o zumbi saiu do corredor");
  return m.stepMs;
}
const monsterFirm = monsterStepMs(Tile.Floor);
const monsterSoft = monsterStepMs(Tile.Sand);
check(Math.abs(monsterFirm / monsterSoft - SAND_SPEED) < 0.05, `passo do zumbi na areia fofa ${monsterSoft} ms, no firme ${monsterFirm} ms`);
console.log(`zumbi: passo de ${monsterFirm} ms no firme e ${monsterSoft} ms na areia fofa`);

// Visão: a areia fofa não tapa nada (flechas e magias passam por cima).
{
  const a = arena({ mapId: "dunes", openRoom: true });
  corridor(a, Tile.Sand);
  const d = a.any.dungeon;
  check(!blocksSight(d, a.p.x + 3, a.p.y), "areia fofa não pode tapar a visão");
  check(hasLineOfSight(d, a.p.x, a.p.y, a.p.x + 10, a.p.y), "a linha de visão deveria atravessar a areia fofa");
}

console.log("areia fofa: OK");
