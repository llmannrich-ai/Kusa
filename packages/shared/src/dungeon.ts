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
  /** Campinas fora do caminho, com poucos monstros (só no pântano). */
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
/** Clareiras do caminho entre a entrada e as ruínas do boss. */
const SWAMP_STEPS = 7;
/** Lado da arena do boss (quadrado de ruínas no centro). */
const SWAMP_ARENA = 16;

/**
 * Pântano das Ruínas: floresta aberta. O caminho faz um arco da borda até as ruínas do centro,
 * passando por clareiras grandes ligadas por trilhas largas (às vezes com atalhos). Lagoas
 * espalhadas bloqueiam o passo mas não a visão; salas laterais são ruínas com mini-boss e baú.
 */
function generateSwamp(seed: number): Dungeon {
  // Rede de segurança: se algum ponto importante ficou isolado, tenta a seed seguinte (continua determinístico).
  for (let attempt = 0; ; attempt++) {
    const d = buildSwamp(seed + attempt);
    if (attempt >= 20 || connected(d.tiles, d.width, swampGoals(d))) return d;
  }
}

/** Pontos que precisam ser alcançáveis a pé a partir do portal: salas, baús e o boss. */
function swampGoals(d: Pick<Dungeon, "portal" | "boss" | "path" | "side" | "meadows">) {
  return [
    d.portal, centerOf(d.boss), ...d.path.map(centerOf), ...d.meadows.map(centerOf),
    ...d.side.flatMap((r) => [centerOf(r), { x: r.x + 1, y: r.y + 1 }]),
  ];
}

function buildSwamp(seed: number): Dungeon {
  const rng = createRng(seed);
  const size = SWAMP_SIZE;
  const tiles = new Uint8Array(size * size);
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
  /** Clareira: vários círculos sobrepostos; devolve o retângulo onde os monstros nascem. */
  const clearing = (cx: number, cy: number, r: number): Rect => {
    blob(cx, cy, r * 0.75, Tile.Floor);
    const extra = rng.int(2, 4);
    for (let i = 0; i < extra; i++) {
      const a = rng.next() * Math.PI * 2;
      const d = r * (0.3 + rng.next() * 0.35);
      blob(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), r * (0.5 + rng.next() * 0.25), Tile.Floor);
    }
    const half = Math.round(r * 0.7);
    return { x: cx - half, y: cy - half, w: half * 2 + 1, h: half * 2 + 1 };
  };
  /** Trilha sinuosa de `a` até `b`: duas retas por um ponto do meio deslocado para o lado. */
  const trail = (a: { x: number; y: number }, b: { x: number; y: number }, width: number) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const bend = (rng.next() - 0.5) * 0.5 * len;
    const mid = { x: (a.x + b.x) / 2 - ((b.y - a.y) / len) * bend, y: (a.y + b.y) / 2 + ((b.x - a.x) / len) * bend };
    const brush = width / 2;
    for (const [p, q] of [[a, mid], [mid, b]] as const) {
      const steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * 2);
      for (let i = 0; i <= steps; i++) {
        const x = p.x + ((q.x - p.x) * i) / steps;
        const y = p.y + ((q.y - p.y) * i) / steps;
        for (let yy = Math.floor(y - brush); yy <= Math.ceil(y + brush); yy++)
          for (let xx = Math.floor(x - brush); xx <= Math.ceil(x + brush); xx++)
            if (Math.hypot(xx - x, yy - y) <= brush) set(xx, yy, Tile.Floor);
      }
    }
  };
  /**
   * Contorno de um retângulo em ruínas: muros com falhas (`crumble` = chance de faltar pedra).
   * Com `only`, só vira muro o que era desse tipo (uma trilha que já passava ali vira brecha no muro).
   */
  const ruinRing = (r: Rect, crumble: number, only?: number) => {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const border = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
        if (border && rng.next() >= crumble && (only === undefined || get(x, y) === only)) set(x, y, Tile.Ruin);
      }
  };

  const center = { x: size / 2, y: size / 2 };
  const boss: Rect = { x: center.x - SWAMP_ARENA / 2, y: center.y - SWAMP_ARENA / 2, w: SWAMP_ARENA, h: SWAMP_ARENA };

  // Entrada numa das 4 bordas.
  const along = rng.int(16, size - 26);
  const spawnPos = rng.pick([
    { x: along, y: 3 },
    { x: size - 13, y: along },
    { x: along, y: size - 13 },
    { x: 3, y: along },
  ]);
  const spawn: Rect = { ...spawnPos, w: 10, h: 10 };
  const s = centerOf(spawn);

  // Caminho em arco: da entrada até perto das ruínas, girando em volta do centro.
  const r0 = Math.hypot(s.x - center.x, s.y - center.y);
  const a0 = Math.atan2(s.y - center.y, s.x - center.x);
  const turn = (rng.next() < 0.5 ? -1 : 1) * Math.PI * (1.2 + rng.next() * 0.4);
  const anchors: { x: number; y: number }[] = [s];
  const path: Rect[] = [];
  for (let i = 1; i <= SWAMP_STEPS; i++) {
    const t = i / SWAMP_STEPS;
    const r = r0 + (24 - r0) * t;
    const a = a0 + turn * t;
    const radius = rng.int(7, 10);
    const cx = clamp(center.x + Math.cos(a) * r + rng.int(-3, 3), radius + 3, size - radius - 4);
    const cy = clamp(center.y + Math.sin(a) * r + rng.int(-3, 3), radius + 3, size - radius - 4);
    anchors.push({ x: cx, y: cy });
    path.push(clearing(cx, cy, radius));
  }

  // Clareira da entrada e arena do boss (aberta, com o quadrado de ruínas e 4 colunas).
  blob(s.x, s.y, 6, Tile.Floor);
  for (let y = spawn.y; y < spawn.y + spawn.h; y++) for (let x = spawn.x; x < spawn.x + spawn.w; x++) set(x, y, Tile.Floor);
  blob(center.x, center.y, SWAMP_ARENA / 2 + 3, Tile.Floor);
  ruinRing(boss, 0.3);
  for (const [dx, dy] of [[4, 4], [SWAMP_ARENA - 5, 4], [4, SWAMP_ARENA - 5], [SWAMP_ARENA - 5, SWAMP_ARENA - 5]]) {
    set(boss.x + dx, boss.y + dy, Tile.Ruin);
  }
  // Portões no meio de cada lado do quadrado.
  for (let k = -1; k <= 1; k++) {
    set(center.x + k, boss.y, Tile.Floor);
    set(center.x + k, boss.y + boss.h - 1, Tile.Floor);
    set(boss.x, center.y + k, Tile.Floor);
    set(boss.x + boss.w - 1, center.y + k, Tile.Floor);
  }

  // Trilhas do caminho principal, e alguns atalhos pulando uma clareira (campo aberto, mais de uma rota).
  const route = [...anchors, center];
  for (let i = 0; i < route.length - 1; i++) trail(route[i], route[i + 1], 3);
  for (let i = 1; i < anchors.length - 2; i++) if (rng.next() < 0.3) trail(anchors[i], anchors[i + 2], 2);

  // Campinas fora do caminho, para fora do arco: mais campo aberto para explorar.
  const meadows: Rect[] = [];
  for (let i = 1; i < anchors.length - 1; i++) {
    if (rng.next() < 0.45) continue;
    const out = Math.atan2(anchors[i].y - center.y, anchors[i].x - center.x) + (rng.next() - 0.5) * 1.6;
    const radius = rng.int(5, 8);
    const d = rng.int(14, 18);
    const mx = clamp(anchors[i].x + Math.cos(out) * d, radius + 3, size - radius - 4);
    const my = clamp(anchors[i].y + Math.sin(out) * d, radius + 3, size - radius - 4);
    if (Math.hypot(mx - center.x, my - center.y) < SWAMP_ARENA + radius || Math.hypot(mx - s.x, my - s.y) < 14) continue;
    meadows.push(clearing(mx, my, radius));
    trail(anchors[i], { x: mx, y: my }, 3);
  }

  // Salas laterais em ruínas, penduradas nas clareiras, longe da entrada e das ruínas do boss.
  const side: Rect[] = [];
  for (let i = 1; i < anchors.length - 1; i++) {
    if (rng.next() < 0.35) continue;
    const anchor = anchors[i];
    const w = rng.int(7, 9);
    const h = rng.int(7, 9);
    const room = shuffled(rng, SWAMP_SIDE_DIRS)
      .map(([dx, dy]): Rect => ({
        x: clamp(anchor.x + dx * 13 - w / 2, 2, size - w - 2),
        y: clamp(anchor.y + dy * 13 - h / 2, 2, size - h - 2),
        w, h,
      }))
      .find((r) => gapBetween(r, spawn) >= SIDE_ROOM_MIN_GAP && gapBetween(r, boss) >= 3
        && side.every((o) => gapBetween(r, o) >= 2)
        && [...anchors, ...meadows.map(centerOf)].every((p) => !(p.x >= r.x - 1 && p.y >= r.y - 1 && p.x <= r.x + r.w && p.y <= r.y + r.h)));
    if (!room) continue;
    ruinRing(room, 0.2, Tile.Wall);
    for (let y = room.y + 1; y < room.y + room.h - 1; y++) for (let x = room.x + 1; x < room.x + room.w - 1; x++) set(x, y, Tile.Floor);
    trail(centerOf(room), anchor, 2);
    side.push(room);
  }

  // Áreas que precisam ficar livres: entrada, arena e salas laterais (baú no canto de dentro).
  const keep = [grow(spawn, 2), grow(boss, 1), ...side.map((r) => grow(r, 1))];
  const kept = (x: number, y: number) => keep.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);

  // Lagoas grandes na mata, perto das clareiras (só trocam mata por água: não fecham caminho nenhum).
  for (const a of anchors.slice(1)) {
    for (let k = rng.int(1, 2); k > 0; k--) {
      const angle = rng.next() * Math.PI * 2;
      const d = 10 + rng.next() * 6;
      blob(Math.round(a.x + Math.cos(angle) * d), Math.round(a.y + Math.sin(angle) * d), 3 + rng.next() * 3, Tile.Water, Tile.Wall);
    }
  }

  // Poças dentro das clareiras: desfeitas se separarem algum ponto importante do resto.
  const goals = [...swampGoals({ portal: s, boss, path, side, meadows }), ...anchors];
  for (const c of [...anchors.slice(1), ...meadows.map(centerOf)]) {
    const pools = rng.int(1, 3);
    for (let k = 0; k < pools; k++) {
      const a = rng.next() * Math.PI * 2;
      const d = 3 + rng.next() * 4;
      const px = Math.round(c.x + Math.cos(a) * d);
      const py = Math.round(c.y + Math.sin(a) * d);
      const r = 1.2 + rng.next() * 1.8;
      const before = tiles.slice();
      blob(px, py, r, Tile.Water, Tile.Floor);
      for (let y = py - 5; y <= py + 5; y++)
        for (let x = px - 5; x <= px + 5; x++)
          if (inside(x, y) && (kept(x, y) || Math.hypot(x - c.x, y - c.y) < 2)) tiles[y * size + x] = before[y * size + x];
      if (!connected(tiles, size, goals)) tiles.set(before);
    }
  }

  // Árvores e colunas soltas no meio do campo: só com chão em volta (2 tiles), para nunca fechar passagem.
  for (let y = 3; y < size - 3; y++)
    for (let x = 3; x < size - 3; x++) {
      if (kept(x, y) || !openAround(get, x, y, 2)) continue;
      const roll = rng.next();
      if (roll < 0.025) set(x, y, Tile.Wall);
      else if (roll < 0.033) set(x, y, Tile.Ruin);
    }

  const portal = centerOf(spawn);
  set(portal.x, portal.y, Tile.Portal);

  return { mapId: "swamp", width: size, height: size, tiles, spawn, boss, path, side, meadows, portal };
}

/** Direções (8) em que uma sala lateral do pântano pode ficar em relação à clareira. */
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

/** Todos os pontos alcançáveis a pé a partir do primeiro (busca em largura, 4 direções). */
function connected(tiles: Uint8Array, size: number, goals: readonly { x: number; y: number }[]) {
  const walk = (i: number) => tiles[i] === Tile.Floor || tiles[i] === Tile.Portal;
  const seen = new Uint8Array(tiles.length);
  const start = goals[0].y * size + goals[0].x;
  if (!walk(start)) return false;
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
  return goals.every((g) => seen[g.y * size + g.x] === 1);
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
