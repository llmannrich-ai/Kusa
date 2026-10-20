import { createRng } from "./rng.ts";

export const Tile = {
  Wall: 0,
  Floor: 1,
  Portal: 2,
} as const;

export interface Rect { x: number; y: number; w: number; h: number }

export interface Dungeon {
  width: number;
  height: number;
  /** tiles[y * width + x], valores de `Tile`. */
  tiles: Uint8Array;
  /** Sala inicial (com o portal de fuga), numa borda aleatória. */
  spawn: Rect;
  /** Sala do boss, no centro. */
  boss: Rect;
  /** Salas do caminho principal entre a entrada e o boss, em ordem de profundidade. */
  path: Rect[];
  /** Salas laterais (baús, mini-bosses). */
  side: Rect[];
  portal: { x: number; y: number };
}

const SIZE = 72;
/**
 * Folga mínima (tiles) entre uma sala lateral e a sala inicial: o mini-boss nasce no centro da
 * lateral e não pode enxergar a equipe ao começar (aggro do ogro = 6).
 */
const SIDE_ROOM_MIN_GAP = 6;
/** Deslocamentos possíveis de uma sala lateral em relação à sala do caminho em que ela pendura. */
const SIDE_OFFSETS: readonly (readonly [number, number])[] = [[-14, -14], [-14, 10], [10, -14], [10, 10]];

/**
 * Gera uma dungeon semi-linear: a equipe nasce numa borda aleatória e o caminho
 * serpenteia por salas até o boss no centro, com salas laterais pelo caminho.
 */
export function generateDungeon(seed: number): Dungeon {
  const rng = createRng(seed);
  const width = SIZE;
  const height = SIZE;
  const tiles = new Uint8Array(width * height);

  const carve = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        if (x > 0 && y > 0 && x < width - 1 && y < height - 1) tiles[y * width + x] = Tile.Floor;
  };
  const corridor = (a: Rect, b: Rect) => {
    const p = centerOf(a);
    const q = centerOf(b);
    const hx = (y: number) => { for (let x = Math.min(p.x, q.x); x <= Math.max(p.x, q.x); x++) carve({ x, y, w: 2, h: 2 }); };
    const vy = (x: number) => { for (let y = Math.min(p.y, q.y); y <= Math.max(p.y, q.y); y++) carve({ x, y, w: 2, h: 2 }); };
    if (rng.next() < 0.5) { hx(p.y); vy(q.x); } else { vy(p.x); hx(q.y); }
  };

  const boss: Rect = { x: SIZE / 2 - 6, y: SIZE / 2 - 6, w: 12, h: 12 };

  // Sala inicial numa das 4 bordas.
  const along = rng.int(8, SIZE - 16);
  const spawnPos = rng.pick([
    { x: along, y: 2 },
    { x: SIZE - 10, y: along },
    { x: along, y: SIZE - 10 },
    { x: 2, y: along },
  ]);
  const spawn: Rect = { ...spawnPos, w: 8, h: 8 };

  // Caminho principal: salas intermediárias entre a entrada e o boss, com desvio lateral.
  const steps = 4;
  const s = centerOf(spawn);
  const b = centerOf(boss);
  const path: Rect[] = [spawn];
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const jitter = Math.round(12 * (1 - t));
    const cx = Math.round(s.x + (b.x - s.x) * t + rng.int(-jitter, jitter));
    const cy = Math.round(s.y + (b.y - s.y) * t + rng.int(-jitter, jitter));
    const w = rng.int(6, 9);
    const h = rng.int(6, 9);
    path.push({ x: clamp(cx - w / 2, 2, SIZE - w - 2), y: clamp(cy - h / 2, 2, SIZE - h - 2), w, h });
  }
  path.push(boss);

  for (const r of path) carve(r);
  for (let i = 0; i < path.length - 1; i++) corridor(path[i], path[i + 1]);

  // Salas laterais penduradas no caminho, longe da entrada: tenta os 4 lados em ordem sorteada
  // e desiste da sala se todos caírem perto demais da sala inicial.
  const side: Rect[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    if (rng.next() < 0.35) continue;
    const anchor = centerOf(path[i]);
    const w = rng.int(5, 7);
    const h = rng.int(5, 7);
    const room = shuffled(rng, SIDE_OFFSETS)
      .map(([dx, dy]): Rect => ({
        x: clamp(anchor.x + dx, 2, SIZE - w - 2),
        y: clamp(anchor.y + dy, 2, SIZE - h - 2),
        w, h,
      }))
      .find((r) => gapBetween(r, spawn) >= SIDE_ROOM_MIN_GAP);
    if (!room) continue;
    carve(room);
    corridor(path[i], room);
    side.push(room);
  }

  const portal = centerOf(spawn);
  tiles[portal.y * width + portal.x] = Tile.Portal;

  return { width, height, tiles, spawn, boss, path: path.slice(1, -1), side, portal };
}

export function tileAt(d: Dungeon, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= d.width || y >= d.height) return Tile.Wall;
  return d.tiles[y * d.width + x];
}

export function isWalkable(d: Dungeon, x: number, y: number): boolean {
  return tileAt(d, x, y) !== Tile.Wall;
}

/** Distância em tiles contando diagonais como 1 (alcance de ataque e aggro). */
export function tileDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

/** Linha de visão entre dois tiles (Bresenham): falsa se alguma parede estiver no caminho. */
export function hasLineOfSight(d: Dungeon, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    if ((x !== x0 || y !== y0) && !isWalkable(d, x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}

/** Último tile livre na linha (Bresenham) de (x0, y0) até (x1, y1): onde um tiro para ao bater numa parede. */
export function lineEnd(d: Dungeon, x0: number, y0: number, x1: number, y1: number) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    const e2 = 2 * err;
    let nx = x;
    let ny = y;
    if (e2 >= dy) { err += dy; nx += sx; }
    if (e2 <= dx) { err += dx; ny += sy; }
    if (!isWalkable(d, nx, ny)) break;
    x = nx;
    y = ny;
  }
  return { x, y };
}

export function centerOf(r: Rect) {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

/** Tiles livres entre dois retângulos (0 quando se encostam ou se sobrepõem), contando diagonais como 1. */
function gapBetween(a: Rect, b: Rect) {
  const gx = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), 0);
  const gy = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h), 0);
  return Math.max(gx, gy);
}

/** Cópia embaralhada (Fisher–Yates) com o RNG da seed, para continuar determinístico. */
function shuffled<T>(rng: ReturnType<typeof createRng>, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)));
}
