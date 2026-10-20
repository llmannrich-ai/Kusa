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

  // Salas laterais penduradas no caminho.
  const side: Rect[] = [];
  for (let i = 1; i < path.length - 1; i++) {
    if (rng.next() < 0.35) continue;
    const anchor = centerOf(path[i]);
    const w = rng.int(5, 7);
    const h = rng.int(5, 7);
    const room: Rect = {
      x: clamp(anchor.x + rng.pick([-14, 10]), 2, SIZE - w - 2),
      y: clamp(anchor.y + rng.pick([-14, 10]), 2, SIZE - h - 2),
      w, h,
    };
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

export function centerOf(r: Rect) {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v)));
}
