import { DEFAULT_MAP, type MapId } from "./maps.ts";
import { createRng } from "./rng.ts";

export const Tile = {
  /** Parede da cripta ou mata fechada do pântano: bloqueia passo e visão. */
  Wall: 0,
  Floor: 1,
  Portal: 2,
  /** Lagoa do pântano: bloqueia o passo, mas não a visão (flechas e magias passam por cima). */
  Water: 3,
  /** Muro ou coluna em ruínas: bloqueia passo e visão. */
  Ruin: 4,
} as const;

export interface Rect { x: number; y: number; w: number; h: number }

export interface Dungeon {
  mapId: MapId;
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
  /** Pontos de monstros extras fora das zonas do caminho (só no pântano). */
  meadows: Rect[];
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

/** Gera o mapa da hunt a partir da seed (cliente e servidor chegam ao mesmo resultado). */
export function generateDungeon(seed: number, mapId: MapId = DEFAULT_MAP): Dungeon {
  return mapId === "swamp" ? generateSwamp(seed) : generateCrypt(seed);
}

/**
 * Cripta: dungeon semi-linear. A equipe nasce numa borda aleatória e o caminho
 * serpenteia por salas até o boss no centro, com salas laterais pelo caminho.
 */
function generateCrypt(seed: number): Dungeon {
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

  return { mapId: "crypt", width, height, tiles, spawn, boss, path: path.slice(1, -1), side, meadows: [], portal };
}

const SWAMP_SIZE = 112;
/** Zonas de monstros entre a entrada e as ruínas do boss (cada uma mais forte que a anterior). */
const SWAMP_STEPS = 7;
/** Lado da arena do boss (quadrado de ruínas no centro). */
const SWAMP_ARENA = 16;
/** Quantos bosques e lagoas o gerador tenta pôr no campo aberto. */
const SWAMP_GROVES = 70;
const SWAMP_LAKES = 30;

/**
 * Pântano das Ruínas: campo aberto. O mapa nasce todo andável, cercado de mata na borda, e recebe
 * por cima bosques, lagoas (bloqueiam o passo, não a visão) e ruínas, sempre deixando espaço para
 * contornar: a equipe vai para onde quiser. A dificuldade segue um arco de zonas da entrada até
 * as ruínas do centro, onde está o boss; salas laterais em ruínas guardam mini-boss e baú.
 */
function generateSwamp(seed: number): Dungeon {
  // Rede de segurança: se algum ponto importante ficou isolado, tenta a seed seguinte (continua determinístico).
  for (let attempt = 0; ; attempt++) {
    const d = buildSwamp(seed + attempt);
    if (attempt >= 20 || connected(d.tiles, d.width, swampGoals(d))) return d;
  }
}

/** Pontos que precisam ser alcançáveis a pé a partir do portal: zonas, baús e o boss. */
function swampGoals(d: Pick<Dungeon, "portal" | "boss" | "path" | "side" | "meadows">) {
  return [
    d.portal, centerOf(d.boss), ...d.path.map(centerOf), ...d.meadows.map(centerOf),
    ...d.side.flatMap((r) => [centerOf(r), { x: r.x + 1, y: r.y + 1 }]),
  ];
}

function buildSwamp(seed: number): Dungeon {
  const rng = createRng(seed);
  const size = SWAMP_SIZE;
  const tiles = new Uint8Array(size * size).fill(Tile.Floor);
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < size - 1 && y < size - 1;
  const get = (x: number, y: number) => (inside(x, y) ? tiles[y * size + x] : Tile.Wall);
  const set = (x: number, y: number, t: number) => { if (inside(x, y)) tiles[y * size + x] = t; };

  /** Círculo de borda irregular; `only` limita a troca a um tipo de tile. */
  const blob = (cx: number, cy: number, r: number, t: number, only?: number) => {
    const reach = Math.ceil(r + 1);
    for (let y = cy - reach; y <= cy + reach; y++)
      for (let x = cx - reach; x <= cx + reach; x++) {
        const edge = r - 0.6 + rng.next() * 1.2;
        if (Math.hypot(x - cx, y - cy) > edge) continue;
        if (only === undefined || get(x, y) === only) set(x, y, t);
      }
  };
  /** Contorno de um retângulo em ruínas: muros com falhas (`crumble` = chance de faltar pedra). */
  const ruinRing = (r: Rect, crumble: number) => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const border = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
        if (border && rng.next() >= crumble) set(x, y, Tile.Ruin);
      }
  };
  /** Abre um portão de 3 tiles no meio de cada lado pedido de um contorno. */
  const gates = (r: Rect, sides: readonly number[]) => {
    const cx = r.x + Math.floor(r.w / 2);
    const cy = r.y + Math.floor(r.h / 2);
    for (let k = -1; k <= 1; k++) {
      if (sides.includes(0)) set(cx + k, r.y, Tile.Floor);
      if (sides.includes(1)) set(r.x + r.w - 1, cy + k, Tile.Floor);
      if (sides.includes(2)) set(cx + k, r.y + r.h - 1, Tile.Floor);
      if (sides.includes(3)) set(r.x, cy + k, Tile.Floor);
    }
  };

  // Mata fechada só na borda do mapa, com espessura que varia aos poucos.
  for (let side = 0; side < 4; side++) {
    let depth = rng.int(2, 4);
    for (let i = 0; i < size; i++) {
      depth = Math.max(2, Math.min(6, depth + rng.int(-1, 1)));
      for (let d = 0; d < depth; d++) {
        const [x, y] = side === 0 ? [i, d] : side === 1 ? [size - 1 - d, i] : side === 2 ? [i, size - 1 - d] : [d, i];
        tiles[y * size + x] = Tile.Wall;
      }
    }
  }

  const center = { x: size / 2, y: size / 2 };
  const boss: Rect = { x: center.x - SWAMP_ARENA / 2, y: center.y - SWAMP_ARENA / 2, w: SWAMP_ARENA, h: SWAMP_ARENA };

  // Entrada perto de uma das 4 bordas.
  const along = rng.int(16, size - 26);
  const spawnPos = rng.pick([
    { x: along, y: 7 },
    { x: size - 17, y: along },
    { x: along, y: size - 17 },
    { x: 7, y: along },
  ]);
  const spawn: Rect = { ...spawnPos, w: 10, h: 10 };
  const s = centerOf(spawn);
  for (let y = spawn.y; y < spawn.y + spawn.h; y++) for (let x = spawn.x; x < spawn.x + spawn.w; x++) set(x, y, Tile.Floor);

  // Zonas de dificuldade em arco, da entrada até perto das ruínas, girando em volta do centro.
  // Não são salas: é só onde cada grupo de monstros nasce no campo aberto.
  const r0 = Math.hypot(s.x - center.x, s.y - center.y);
  const a0 = Math.atan2(s.y - center.y, s.x - center.x);
  const turn = (rng.next() < 0.5 ? -1 : 1) * Math.PI * (1.2 + rng.next() * 0.4);
  const anchors: { x: number; y: number }[] = [];
  const path: Rect[] = [];
  for (let i = 1; i <= SWAMP_STEPS; i++) {
    const t = i / SWAMP_STEPS;
    const r = r0 + (24 - r0) * t;
    const a = a0 + turn * t;
    const half = rng.int(6, 8);
    const cx = clamp(center.x + Math.cos(a) * r + rng.int(-3, 3), half + 7, size - half - 8);
    const cy = clamp(center.y + Math.sin(a) * r + rng.int(-3, 3), half + 7, size - half - 8);
    anchors.push({ x: cx, y: cy });
    path.push({ x: cx - half, y: cy - half, w: half * 2 + 1, h: half * 2 + 1 });
  }

  // Arena do boss: quadrado de muros caídos com 4 portões e 4 colunas.
  ruinRing(boss, 0.3);
  gates(boss, [0, 1, 2, 3]);
  for (const [dx, dy] of [[4, 4], [SWAMP_ARENA - 5, 4], [4, SWAMP_ARENA - 5], [SWAMP_ARENA - 5, SWAMP_ARENA - 5]]) {
    set(boss.x + dx, boss.y + dy, Tile.Ruin);
  }

  // Salas laterais em ruínas perto das zonas, longe da entrada e da arena, com 2 portões.
  const side: Rect[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (rng.next() < 0.35) continue;
    const anchor = anchors[i];
    const w = rng.int(7, 9);
    const h = rng.int(7, 9);
    const room = shuffled(rng, SWAMP_SIDE_DIRS)
      .map(([dx, dy]): Rect => ({
        x: clamp(anchor.x + dx * 13 - w / 2, 6, size - w - 7),
        y: clamp(anchor.y + dy * 13 - h / 2, 6, size - h - 7),
        w, h,
      }))
      .find((r) => gapBetween(r, spawn) >= SIDE_ROOM_MIN_GAP && gapBetween(r, boss) >= 3
        && side.every((o) => gapBetween(r, o) >= 3)
        && anchors.every((p) => gapBetween(r, { x: p.x, y: p.y, w: 1, h: 1 }) >= 3));
    if (!room) continue;
    ruinRing(room, 0.2);
    gates(room, shuffled(rng, [0, 1, 2, 3]).slice(0, 2));
    side.push(room);
  }

  // Campinas: pontos de monstros extras espalhados pelo campo, longe da entrada, das zonas e da arena.
  const meadows: Rect[] = [];
  for (let tries = 0; tries < 60 && meadows.length < 5; tries++) {
    const p = { x: rng.int(14, size - 15), y: rng.int(14, size - 15) };
    const far = (q: { x: number; y: number }, d: number) => Math.hypot(p.x - q.x, p.y - q.y) >= d;
    if (!far(s, 24) || !far(center, SWAMP_ARENA + 6) || !anchors.every((a) => far(a, 14))
      || !meadows.every((m) => far(centerOf(m), 14)) || side.some((r) => gapBetween(r, { ...p, w: 1, h: 1 }) < 4)) continue;
    meadows.push({ x: p.x - 4, y: p.y - 4, w: 9, h: 9 });
  }

  // Áreas que ficam livres: entrada, arena, salas laterais e o miolo de cada zona e campina.
  const keep = [
    grow(spawn, 3), grow(boss, 2), ...side.map((r) => grow(r, 2)),
    ...[...anchors, ...meadows.map(centerOf)].map((p) => ({ x: p.x - 3, y: p.y - 3, w: 7, h: 7 })),
  ];
  const kept = (x: number, y: number) => keep.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
  const goals = [...swampGoals({ portal: s, boss, path, side, meadows }), ...anchors];

  /** Põe um obstáculo; desfaz se ele invadir uma área livre ou separar algum ponto importante do resto. */
  const obstacle = (place: () => void) => {
    const before = tiles.slice();
    place();
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] !== before[i] && kept(i % size, Math.floor(i / size))) { tiles.set(before); return; }
    }
    if (!connected(tiles, size, goals)) tiles.set(before);
  };

  // Bosques: manchas de árvores de tamanhos variados, às vezes com uma árvore-satélite ao lado.
  for (let i = 0; i < SWAMP_GROVES; i++) {
    const x = rng.int(6, size - 7);
    const y = rng.int(6, size - 7);
    const r = 1.2 + rng.next() * 3.3;
    obstacle(() => {
      blob(x, y, r, Tile.Wall, Tile.Floor);
      if (rng.next() < 0.5) blob(x + rng.int(-4, 4), y + rng.int(-4, 4), 1 + rng.next() * 1.5, Tile.Wall, Tile.Floor);
    });
  }

  // Lagoas e brejos.
  for (let i = 0; i < SWAMP_LAKES; i++) {
    const x = rng.int(8, size - 9);
    const y = rng.int(8, size - 9);
    const r = 2 + rng.next() * 3.5;
    obstacle(() => blob(x, y, r, Tile.Water, Tile.Floor));
  }

  // Restos de muro pelo campo: trechos curtos, retos.
  for (let i = 0; i < 9; i++) {
    const x = rng.int(8, size - 9);
    const y = rng.int(8, size - 9);
    const len = rng.int(3, 6);
    const horizontal = rng.next() < 0.5;
    obstacle(() => { for (let k = 0; k < len; k++) set(horizontal ? x + k : x, horizontal ? y : y + k, Tile.Ruin); });
  }

  // Árvores e colunas soltas: só com chão em volta, para nunca fechar passagem.
  for (let y = 3; y < size - 3; y++)
    for (let x = 3; x < size - 3; x++) {
      if (kept(x, y) || !openAround(get, x, y, 2)) continue;
      const roll = rng.next();
      if (roll < 0.045) set(x, y, Tile.Wall);
      else if (roll < 0.051) set(x, y, Tile.Ruin);
    }

  // Bolsões de chão que ficaram sem acesso viram mata (ninguém nasce ou cai lá).
  const reach = reachableFrom(tiles, size, s);
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === Tile.Floor && !reach[i]) tiles[i] = Tile.Wall;

  const portal = s;
  set(portal.x, portal.y, Tile.Portal);

  return { mapId: "swamp", width: size, height: size, tiles, spawn, boss, path, side, meadows, portal };
}

/** Direções (8) em que uma sala lateral do pântano pode ficar em relação à zona. */
const SWAMP_SIDE_DIRS: readonly (readonly [number, number])[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [0.75, 0.75], [-0.75, 0.75], [0.75, -0.75], [-0.75, -0.75],
];

/** Todos os tiles a até `reach` (contando diagonais como 1) são chão. */
function openAround(get: (x: number, y: number) => number, x: number, y: number, reach: number) {
  for (let dy = -reach; dy <= reach; dy++)
    for (let dx = -reach; dx <= reach; dx++)
      if (get(x + dx, y + dy) !== Tile.Floor) return false;
  return true;
}

/** Todos os pontos alcançáveis a pé a partir do primeiro (4 direções: mais rígido que o passo do jogo). */
function connected(tiles: Uint8Array, size: number, goals: readonly { x: number; y: number }[]) {
  const seen = reachableFrom(tiles, size, goals[0]);
  return goals.every((g) => seen[g.y * size + g.x] === 1);
}

/** Tiles andáveis alcançáveis a partir de um ponto (busca em largura, 4 direções). */
function reachableFrom(tiles: Uint8Array, size: number, from: { x: number; y: number }) {
  const walk = (i: number) => tiles[i] === Tile.Floor || tiles[i] === Tile.Portal;
  const seen = new Uint8Array(tiles.length);
  const start = from.y * size + from.x;
  if (!walk(start)) return seen;
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    for (const n of [i - 1, i + 1, i - size, i + size]) {
      if (n < 0 || n >= tiles.length || seen[n] || !walk(n)) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  return seen;
}

function grow(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

export function tileAt(d: Dungeon, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= d.width || y >= d.height) return Tile.Wall;
  return d.tiles[y * d.width + x];
}

export function isWalkable(d: Dungeon, x: number, y: number): boolean {
  const t = tileAt(d, x, y);
  return t === Tile.Floor || t === Tile.Portal;
}

/** Paredes, mata e ruínas tapam a visão; chão e água, não. */
export function blocksSight(d: Dungeon, x: number, y: number): boolean {
  const t = tileAt(d, x, y);
  return t === Tile.Wall || t === Tile.Ruin;
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
    if ((x !== x0 || y !== y0) && blocksSight(d, x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}

/**
 * Último tile livre na linha (Bresenham) de (x0, y0) até (x1, y1): onde um tiro para ao bater numa parede.
 * Como na linha de visão, água não para o tiro (flechas e magias passam por cima das lagoas).
 */
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
    if (blocksSight(d, nx, ny)) break;
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
