import { DEFAULT_MAP, type MapId } from "./maps.ts";
import { createRng } from "./rng.ts";

export const Tile = {
  /** Parede da cripta, mata do pântano, duna e coqueiro do deserto: bloqueia passo e visão. */
  Wall: 0,
  Floor: 1,
  Portal: 2,
  /** Lagoa do pântano ou do oásis: bloqueia o passo, mas não a visão (flechas e magias passam por cima). */
  Water: 3,
  /** Muro ou coluna em ruínas, ou rocha do deserto: bloqueia passo e visão. */
  Ruin: 4,
  /** Boca da caverna do deserto (e a saída dela no subterrâneo): andável; pisar leva à outra ponta. */
  Cave: 5,
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
  /** Sala do boss (no centro; no deserto, o covil no subterrâneo). */
  boss: Rect;
  /** Onde abre o portal do boss, a saída com bônus: o centro da sala do boss, ou a sala dos baús da caverna. */
  bossPortal: { x: number; y: number };
  /** Salas do caminho principal entre a entrada e o boss, em ordem de profundidade. */
  path: Rect[];
  /** Salas laterais (baús, mini-bosses). */
  side: Rect[];
  /** Pontos de monstros extras fora das zonas do caminho (só nos mapas abertos). */
  meadows: Rect[];
  /** Passarelas de madeira por cima da água (Pântano): chão comum, o cliente desenha as tábuas. */
  planks?: Rect[];
  portal: { x: number; y: number };
  /** Caverna do deserto: a boca na superfície leva ao subterrâneo (e a saída de lá traz de volta). */
  cave?: CaveLink;
  /**
   * Covis da Caverna da Travessia, um boss em cada (na ordem de `MapDef.lairs`), cada um com o próprio portal. O
   * primeiro também é `boss` e `bossPortal`, para quem só conhece um.
   */
  lairs?: LairRoom[];
}

export interface LairRoom {
  room: Rect;
  /** Onde abre o portal quando o boss deste covil morre. */
  portal: { x: number; y: number };
}

/** Covis do mapa: os da Caverna da Travessia ou, nos outros, a sala do boss com o portal dela. */
export function lairsOf(d: Dungeon): LairRoom[] {
  return d.lairs ?? [{ room: d.boss, portal: d.bossPortal }];
}

/** Índice do covil cujo portal fica neste tile (-1 se nenhum). */
export function lairPortalAt(d: Dungeon, x: number, y: number) {
  return lairsOf(d).findIndex((l) => l.portal.x === x && l.portal.y === y);
}

export interface CaveLink {
  /** Boca da caverna na superfície (tile `Cave`). */
  entrance: { x: number; y: number };
  /** Saída no subterrâneo (tile `Cave`), na câmara de chegada. */
  exit: { x: number; y: number };
  /** O subterrâneo: o escavado e um pouco de rocha em volta (o minimapa aberto mostra isto), à direita da superfície. */
  under: Rect;
  /** Sala dos baús, depois do covil do boss. */
  reward: Rect;
  /** Os baús de runa da sala, da esquerda para a direita. */
  chests: { x: number; y: number }[];
}

/** Ponta oposta da caverna: quem pisa na boca vai para a saída, e vice-versa. */
export function caveDestination(d: Dungeon, x: number, y: number) {
  if (!d.cave) return null;
  if (x === d.cave.entrance.x && y === d.cave.entrance.y) return d.cave.exit;
  if (x === d.cave.exit.x && y === d.cave.exit.y) return d.cave.entrance;
  return null;
}

/**
 * O tile está no subterrâneo: a faixa inteira à direita da superfície (para desenhar rocha em vez de duna e
 * mostrar só aquela área no minimapa).
 */
export function isUnderground(d: Dungeon, x: number) {
  const u = d.cave?.under;
  return !!u && x >= u.x && x < u.x + u.w;
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
  if (mapId === "swamp") return generateSwamp(seed);
  if (mapId === "desert") return generateDesert(seed);
  if (mapId === "marsh") return generateMarsh(seed);
  if (mapId === "cavern") return generateCavern(seed);
  return generateCrypt(seed);
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

  return { mapId: "crypt", width, height, tiles, spawn, boss, bossPortal: centerOf(boss), path: path.slice(1, -1), side, meadows: [], portal };
}

const SWAMP_SIZE = 112;
/** Zonas de monstros entre a entrada e as ruínas do boss (cada uma mais forte que a anterior). */
const SWAMP_STEPS = 7;
/** Lado da arena do boss (quadrado de ruínas no centro). */
const SWAMP_ARENA = 16;
/** Quantos bosques e lagoas o gerador tenta pôr no campo aberto. */
const SWAMP_GROVES = 70;
const SWAMP_LAKES = 30;
/** Restos de construção (muros, cantos, colunatas, alicerces) pelo campo. */
const SWAMP_RUINS = 13;

/**
 * Pântano das Ruínas: campo aberto. O mapa nasce todo andável, cercado de mata na borda, e recebe
 * por cima bosques, lagoas alongadas (bloqueiam o passo, não a visão) e os restos do império (trechos e
 * cantos de muro, colunatas, alicerces de casa), sempre deixando espaço para contornar: a equipe vai
 * para onde quiser. A dificuldade segue um arco de zonas da entrada até as ruínas do centro, onde está
 * o boss; salas laterais em ruínas guardam mini-boss e baú.
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

  /** Mancha de borda irregular (`stretch` > 1 estica na horizontal); `only` limita a troca a um tipo de tile. */
  const blob = (cx: number, cy: number, r: number, t: number, only?: number, stretch = 1) => {
    const reach = Math.ceil(r * Math.max(stretch, 1 / stretch) + 1);
    for (let y = cy - reach; y <= cy + reach; y++)
      for (let x = cx - reach; x <= cx + reach; x++) {
        const edge = r - 0.6 + rng.next() * 1.2;
        if (Math.hypot((x - cx) / stretch, (y - cy) * stretch) > edge) continue;
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

  // Mata fechada só na borda do mapa, com a espessura ondulando devagar (sem dente de tile em tile).
  for (let side = 0; side < 4; side++) {
    let depth = rng.int(2, 4);
    let goal = depth;
    for (let i = 0; i < size; i++) {
      if (i % 5 === 0) goal = rng.int(2, 6);
      if (rng.next() < 0.5) depth += Math.sign(goal - depth);
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

  // Lagoas e brejos: alongados, às vezes com uma poça colada (a margem fica recortada).
  for (let i = 0; i < SWAMP_LAKES; i++) {
    const x = rng.int(8, size - 9);
    const y = rng.int(8, size - 9);
    const r = 2 + rng.next() * 3.5;
    const stretch = 0.75 + rng.next() * 0.6;
    obstacle(() => {
      blob(x, y, r, Tile.Water, Tile.Floor, stretch);
      if (r > 3 && rng.next() < 0.6) {
        const a = rng.next() * Math.PI * 2;
        blob(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1.3 + rng.next() * 1.5, Tile.Water, Tile.Floor);
      }
    });
  }

  // Restos do império pelo campo: trecho de muro, canto de muro, colunata e alicerce de casa (com a porta aberta).
  for (let i = 0; i < SWAMP_RUINS; i++) {
    const x = rng.int(9, size - 15);
    const y = rng.int(9, size - 15);
    const kind = rng.next();
    const [dx, dy] = rng.next() < 0.5 ? [1, 0] : [0, 1];
    obstacle(() => {
      if (kind < 0.35) {
        const len = rng.int(3, 6);
        for (let k = 0; k < len; k++) set(x + dx * k, y + dy * k, Tile.Ruin);
      } else if (kind < 0.6) {
        const a = rng.int(3, 5);
        const b = rng.int(2, 4);
        const sx = rng.next() < 0.5 ? 1 : -1;
        for (let k = 0; k < a; k++) set(x + k, y, Tile.Ruin);
        for (let k = 1; k <= b; k++) set(x + (sx > 0 ? 0 : a - 1), y + k, Tile.Ruin);
      } else if (kind < 0.8) {
        // Colunas soltas em fila, a cada 2 tiles (umas já caíram).
        const n = rng.int(3, 5);
        for (let k = 0; k < n; k++) if (k === 0 || rng.next() < 0.8) set(x + dx * k * 2, y + dy * k * 2, Tile.Ruin);
      } else {
        const w = rng.int(4, 6);
        const h = rng.int(4, 5);
        const door = rng.int(0, 3);
        for (let yy = 0; yy < h; yy++)
          for (let xx = 0; xx < w; xx++) {
            const border = xx === 0 || yy === 0 || xx === w - 1 || yy === h - 1;
            if (!border || rng.next() < 0.35) continue;
            // Porta de 2 tiles no meio de um lado: o miolo nunca fecha.
            const mx = Math.floor((w - 1) / 2);
            const my = Math.floor((h - 1) / 2);
            const isDoor = (door === 0 && yy === 0 && (xx === mx || xx === mx + 1)) || (door === 1 && xx === w - 1 && (yy === my || yy === my + 1))
              || (door === 2 && yy === h - 1 && (xx === mx || xx === mx + 1)) || (door === 3 && xx === 0 && (yy === my || yy === my + 1));
            if (!isDoor) set(x + xx, y + yy, Tile.Ruin);
          }
      }
    });
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

  return { mapId: "swamp", width: size, height: size, tiles, spawn, boss, bossPortal: centerOf(boss), path, side, meadows, portal };
}

const DESERT_SIZE = 104;
/** Zonas do caminho entre a entrada e o centro (ainda sem monstros: guardam a profundidade para os encontros). */
const DESERT_STEPS = 6;
/** Largura do subterrâneo (rocha em volta incluída), colado à direita da superfície. */
const DESERT_UNDER_W = 40;
/** Campinas (pontos de monstros extras fora das zonas) no deserto. */
const DESERT_MEADOWS = 4;
/** Distância mínima (tiles) da boca da caverna até a entrada do mapa. */
const CAVE_MIN_DISTANCE = 40;

/**
 * Mar de Areia: campo aberto de areia cercado por dunas altas. Por cima vão oásis (lagoas rodeadas de
 * coqueiros), bosques de coqueiros, coqueiros soltos e cristas de duna, sempre deixando passagem, como no
 * pântano. Coqueiro é um tile de mata (`Tile.Wall`) sem vizinho de mata nos 4 lados; mata encostada em mata
 * é duna. O cliente usa essa regra para desenhar cada um (na superfície; no subterrâneo, mata é rocha).
 *
 * Num lugar sorteado longe da entrada fica a boca de uma caverna, num monte de rocha. Ela leva ao subterrâneo,
 * pequeno, na mesma grade à direita da superfície (separado por rocha, sem passagem a pé): câmara de chegada,
 * túnel, o covil do boss e, depois dele, a sala dos 4 baús de runa, onde abre o portal do boss.
 */
function generateDesert(seed: number): Dungeon {
  for (let attempt = 0; ; attempt++) {
    const d = buildDesert(seed + attempt);
    if (attempt >= 20 || desertConnected(d)) return d;
  }
}

/** Superfície ligada a pé do portal até as zonas e a boca; subterrâneo, da saída até o boss, o portal e os baús. */
function desertConnected(d: Dungeon) {
  const cave = d.cave!;
  const surface = [
    d.portal, ...d.path.map(centerOf), ...d.meadows.map(centerOf), cave.entrance,
    ...d.side.flatMap((r) => [centerOf(r), { x: r.x + 1, y: r.y + 1 }]),
  ];
  const below = [cave.exit, centerOf(d.boss), d.bossPortal, ...cave.chests.map((c) => ({ x: c.x, y: c.y + 1 }))];
  return connected(d.tiles, d.width, surface) && connected(d.tiles, d.width, below);
}

function buildDesert(seed: number): Dungeon {
  const rng = createRng(seed);
  const size = DESERT_SIZE;
  const tiles = new Uint8Array(size * size).fill(Tile.Floor);
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < size - 1 && y < size - 1;
  const get = (x: number, y: number) => (inside(x, y) ? tiles[y * size + x] : Tile.Wall);
  const set = (x: number, y: number, t: number) => { if (inside(x, y)) tiles[y * size + x] = t; };
  /** Coqueiros postos de propósito: a limpeza final não os confunde com sobra de duna. */
  const palms = new Set<number>();

  // Dunas altas na borda, com a espessura ondulando devagar (o vento as empurra para dentro aos poucos).
  for (let side = 0; side < 4; side++) {
    let depth = rng.int(3, 5);
    let goal = depth;
    for (let i = 0; i < size; i++) {
      if (i % 6 === 0) goal = rng.int(3, 7);
      if (rng.next() < 0.5) depth += Math.sign(goal - depth);
      for (let d = 0; d < depth; d++) {
        const [x, y] = side === 0 ? [i, d] : side === 1 ? [size - 1 - d, i] : side === 2 ? [i, size - 1 - d] : [d, i];
        tiles[y * size + x] = Tile.Wall;
      }
    }
  }

  const center = { x: size / 2, y: size / 2 };

  // Entrada perto de uma das 4 bordas.
  const along = rng.int(18, size - 28);
  const spawnPos = rng.pick([
    { x: along, y: 9 },
    { x: size - 19, y: along },
    { x: along, y: size - 19 },
    { x: 9, y: along },
  ]);
  const spawn: Rect = { ...spawnPos, w: 10, h: 10 };
  const s = centerOf(spawn);
  for (let y = spawn.y; y < spawn.y + spawn.h; y++) for (let x = spawn.x; x < spawn.x + spawn.w; x++) set(x, y, Tile.Floor);

  // Zonas em arco da entrada até perto do centro, como no pântano.
  const r0 = Math.hypot(s.x - center.x, s.y - center.y);
  const a0 = Math.atan2(s.y - center.y, s.x - center.x);
  const turn = (rng.next() < 0.5 ? -1 : 1) * Math.PI * (1 + rng.next() * 0.4);
  const anchors: { x: number; y: number }[] = [];
  const path: Rect[] = [];
  for (let i = 1; i <= DESERT_STEPS; i++) {
    const t = i / DESERT_STEPS;
    const r = r0 + (20 - r0) * t;
    const a = a0 + turn * t;
    const half = rng.int(5, 7);
    const cx = clamp(center.x + Math.cos(a) * r + rng.int(-3, 3), half + 9, size - half - 10);
    const cy = clamp(center.y + Math.sin(a) * r + rng.int(-3, 3), half + 9, size - half - 10);
    anchors.push({ x: cx, y: cy });
    path.push({ x: cx - half, y: cy - half, w: half * 2 + 1, h: half * 2 + 1 });
  }

  // Boca da caverna: num lugar sorteado longe da entrada e fora das zonas, virada para o sul.
  let entrance = { x: Math.round(center.x), y: Math.round(center.y) };
  for (let tries = 0; tries < 200; tries++) {
    const p = { x: rng.int(14, size - 15), y: rng.int(14, size - 15) };
    if (Math.hypot(p.x - s.x, p.y - s.y) < CAVE_MIN_DISTANCE) continue;
    if (anchors.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < 9)) continue;
    entrance = p;
    break;
  }
  const mouth: Rect = { x: entrance.x - 3, y: entrance.y - 2, w: 7, h: 6 };

  // Campinas: pontos de monstros extras pelo campo, longe da entrada, das zonas e da caverna (como no pântano).
  const meadows: Rect[] = [];
  for (let tries = 0; tries < 60 && meadows.length < DESERT_MEADOWS; tries++) {
    const p = { x: rng.int(14, size - 15), y: rng.int(14, size - 15) };
    const far = (q: { x: number; y: number }, d: number) => Math.hypot(p.x - q.x, p.y - q.y) >= d;
    if (!far(s, 24) || !far(entrance, 10) || !anchors.every((a) => far(a, 13)) || !meadows.every((m) => far(centerOf(m), 14))) continue;
    meadows.push({ x: p.x - 4, y: p.y - 4, w: 9, h: 9 });
  }

  // Ruínas soterradas: salas laterais perto das zonas, com muro de arenito caído e 2 portões (mini-boss e baú),
  // longe da entrada, da caverna, das campinas e umas das outras.
  const side: Rect[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (rng.next() < 0.4) continue;
    const anchor = anchors[i];
    const w = rng.int(7, 9);
    const h = rng.int(7, 9);
    const room = shuffled(rng, SWAMP_SIDE_DIRS)
      .map(([dx, dy]): Rect => ({
        x: clamp(anchor.x + dx * 12 - w / 2, 7, size - w - 8),
        y: clamp(anchor.y + dy * 12 - h / 2, 7, size - h - 8),
        w, h,
      }))
      .find((r) => gapBetween(r, spawn) >= SIDE_ROOM_MIN_GAP && gapBetween(r, mouth) >= 4
        && side.every((o) => gapBetween(r, o) >= 4)
        && [...anchors, ...meadows.map(centerOf)].every((p) => gapBetween(r, { x: p.x, y: p.y, w: 1, h: 1 }) >= 3));
    if (!room) continue;
    for (let y = room.y; y < room.y + room.h; y++)
      for (let x = room.x; x < room.x + room.w; x++) {
        const border = x === room.x || y === room.y || x === room.x + room.w - 1 || y === room.y + room.h - 1;
        if (border && rng.next() >= 0.25) set(x, y, Tile.Ruin);
      }
    // Dois portões de 3 tiles, em lados sorteados.
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    for (const gate of shuffled(rng, [0, 1, 2, 3]).slice(0, 2))
      for (let k = -1; k <= 1; k++) {
        if (gate === 0) set(cx + k, room.y, Tile.Floor);
        if (gate === 1) set(room.x + room.w - 1, cy + k, Tile.Floor);
        if (gate === 2) set(cx + k, room.y + room.h - 1, Tile.Floor);
        if (gate === 3) set(room.x, cy + k, Tile.Floor);
      }
    side.push(room);
  }

  const keep = [
    grow(spawn, 3), mouth, ...side.map((r) => grow(r, 2)),
    ...[...anchors, ...meadows.map(centerOf)].map((p) => ({ x: p.x - 3, y: p.y - 3, w: 7, h: 7 })),
  ];
  const kept = (x: number, y: number) => keep.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
  const goals = [
    s, ...path.map(centerOf), ...anchors, ...meadows.map(centerOf), entrance,
    ...side.flatMap((r) => [centerOf(r), { x: r.x + 1, y: r.y + 1 }]),
  ];

  /** Põe um obstáculo; desfaz se ele invadir uma área livre ou separar algum ponto importante do resto. */
  const obstacle = (place: () => void) => {
    const before = tiles.slice();
    const palmsBefore = new Set(palms);
    place();
    let undo = false;
    for (let i = 0; i < tiles.length && !undo; i++) {
      if (tiles[i] !== before[i] && kept(i % size, Math.floor(i / size))) undo = true;
    }
    if (undo || !connected(tiles, size, goals)) {
      tiles.set(before);
      palms.clear();
      palmsBefore.forEach((i) => palms.add(i));
    }
  };
  const orthoWall = (x: number, y: number) =>
    get(x - 1, y) === Tile.Wall || get(x + 1, y) === Tile.Wall || get(x, y - 1) === Tile.Wall || get(x, y + 1) === Tile.Wall;
  /** Coqueiro só em areia e sem mata nos 4 lados (senão vira pedaço de duna). */
  const palm = (x: number, y: number) => {
    if (!inside(x, y) || get(x, y) !== Tile.Floor || orthoWall(x, y)) return;
    set(x, y, Tile.Wall);
    palms.add(y * size + x);
  };

  // Cristas de duna no campo: manchas compridas na direção do vento (leste-oeste), com a ponta afinando.
  for (let i = 0; i < 16; i++) {
    const x = rng.int(10, size - 11);
    const y = rng.int(10, size - 11);
    const rx = 3 + rng.next() * 5;
    const ry = 1.2 + rng.next() * 1.4;
    const slant = (rng.next() - 0.5) * 0.6;
    obstacle(() => {
      for (let yy = Math.floor(y - ry - 3); yy <= y + ry + 3; yy++)
        for (let xx = Math.floor(x - rx - 1); xx <= x + rx + 1; xx++) {
          const u = (xx - x) / rx;
          const v = (yy - y - u * rx * slant) / (ry * (1 - 0.5 * u * u));
          if (u * u + v * v <= 1 - rng.next() * 0.15 && get(xx, yy) === Tile.Floor) set(xx, yy, Tile.Wall);
        }
    });
  }

  // Oásis: lagoa de borda irregular com coqueiros na margem.
  const oases: { x: number; y: number; r: number }[] = [];
  for (let tries = 0; tries < 40 && oases.length < 6; tries++) {
    const o = { x: rng.int(14, size - 15), y: rng.int(14, size - 15), r: 2.2 + rng.next() * 2.8 };
    if (oases.some((p) => Math.hypot(p.x - o.x, p.y - o.y) < p.r + o.r + 12)) continue;
    const before = oases.length;
    obstacle(() => {
      const reach = Math.ceil(o.r + 4);
      for (let y = o.y - reach; y <= o.y + reach; y++)
        for (let x = o.x - reach; x <= o.x + reach; x++) {
          const edge = o.r - 0.25 + rng.next() * 0.5;
          if (Math.hypot(x - o.x, (y - o.y) * 1.15) <= edge && get(x, y) === Tile.Floor) set(x, y, Tile.Water);
        }
      // Pontas de água de 1 tile (com água em 1 lado só) voltam a ser areia: a margem fica redonda.
      for (let y = o.y - reach; y <= o.y + reach; y++)
        for (let x = o.x - reach; x <= o.x + reach; x++) {
          const wet = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].filter((t) => t === Tile.Water).length;
          if (get(x, y) === Tile.Water && wet <= 1) set(x, y, Tile.Floor);
        }
      // Margem: coqueiros a 2 tiles da água, espaçados.
      for (let k = 0; k < 22; k++) {
        const a = rng.next() * Math.PI * 2;
        const d = o.r + 1.8 + rng.next() * 1.6;
        palm(Math.round(o.x + Math.cos(a) * d), Math.round(o.y + Math.sin(a) * d));
      }
      oases.push(o);
    });
    // Oásis desfeito (fechava passagem): não conta.
    if (oases.length > before && get(o.x, o.y) !== Tile.Water) oases.pop();
  }

  // Bosques de coqueiros: 3 a 8 coqueiros juntos, com espaço entre eles.
  for (let i = 0; i < 30; i++) {
    const x = rng.int(9, size - 10);
    const y = rng.int(9, size - 10);
    const count = rng.int(3, 8);
    obstacle(() => {
      for (let k = 0; k < count * 2; k++) palm(x + rng.int(-3, 3), y + rng.int(-3, 3));
    });
  }

  // Coqueiros soltos: só com areia em volta, para nunca fechar passagem.
  for (let y = 4; y < size - 4; y++)
    for (let x = 4; x < size - 4; x++) {
      if (kept(x, y) || !openAround(get, x, y, 2)) continue;
      if (rng.next() < 0.012) palm(x, y);
    }

  // Mata solta que não é coqueiro (ponta de duna) volta a ser areia.
  for (let y = 1; y < size - 1; y++)
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      if (tiles[i] === Tile.Wall && !palms.has(i) && !orthoWall(x, y)) tiles[i] = Tile.Floor;
    }

  // Monte de rocha em volta da boca (atrás e dos lados): a caverna se abre para o sul.
  for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-2, 0], [2, 0], [-1, -2], [0, -2], [1, -2]]) {
    set(entrance.x + dx, entrance.y + dy, Tile.Ruin);
  }
  set(entrance.x, entrance.y, Tile.Floor);

  // Bolsões de areia que ficaram sem acesso viram duna.
  const reach = reachableFrom(tiles, size, s);
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === Tile.Floor && !reach[i]) tiles[i] = Tile.Wall;

  const portal = s;
  set(portal.x, portal.y, Tile.Portal);
  set(entrance.x, entrance.y, Tile.Cave);

  // A grade cresce para a direita: o subterrâneo fica ao lado, todo de rocha, e é escavado por cima.
  const width = size + DESERT_UNDER_W;
  const grid = new Uint8Array(width * size).fill(Tile.Wall);
  for (let y = 0; y < size; y++) grid.set(tiles.subarray(y * size, (y + 1) * size), y * width);
  const under = carveUnderground(createRng(seed ^ 0x5eed_ca7e), grid, width, size, { x: size, y: 0, w: DESERT_UNDER_W, h: size });

  return {
    mapId: "desert", width, height: size, tiles: grid, spawn, boss: under.lair, bossPortal: under.portal,
    path, side, meadows, portal,
    cave: { entrance, exit: under.exit, under: under.area, reward: under.reward, chests: under.chests },
  };
}

/**
 * Subterrâneo do deserto, de baixo para cima (o celular fica na vertical): câmara de chegada com a saída, túnel
 * sinuoso, o covil do boss (caverna larga com alguns pilares de rocha), passagem estreita e a sala dos baús, um
 * salão antigo e retangular com os 4 baús de runa encostados no fundo e o lugar do portal no meio.
 */
function carveUnderground(rng: ReturnType<typeof createRng>, tiles: Uint8Array, width: number, height: number, area: Rect) {
  const set = (x: number, y: number, t: number) => {
    if (x > area.x + 1 && y > area.y + 1 && x < area.x + area.w - 2 && y < area.y + area.h - 2) tiles[y * width + x] = t;
  };
  const get = (x: number, y: number) => tiles[y * width + x];
  /** Mancha de borda irregular. */
  const blob = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1 - rng.next() * 0.18) set(x, y, Tile.Floor);
      }
  };
  /** Túnel de `w` tiles de largura entre dois pontos, desviando um pouco para os lados. */
  const tunnel = (from: { x: number; y: number }, to: { x: number; y: number }, w: number) => {
    let x = from.x;
    for (let y = from.y; y >= to.y; y--) {
      const left = to.y === from.y ? 1 : (y - to.y) / (from.y - to.y);
      // Perto do fim, puxa para o x de chegada.
      if (left < 0.35) x += Math.sign(to.x - x);
      else if (rng.next() < 0.4) x += rng.int(-1, 1);
      for (let k = 0; k < w; k++) set(x + k - Math.floor(w / 2), y, Tile.Floor);
    }
  };

  const cx = area.x + Math.floor(area.w / 2);
  const height0 = Math.min(area.h, 64);
  const top = area.y + Math.floor((height - height0) / 2) + 4;

  // Sala dos baús: 14×6, os baús a cada 3 tiles na linha de cima.
  const reward: Rect = { x: cx - 7, y: top, w: 14, h: 6 };
  for (let y = reward.y; y < reward.y + reward.h; y++) for (let x = reward.x; x < reward.x + reward.w; x++) set(x, y, Tile.Floor);
  const chests = [2, 5, 8, 11].map((dx) => ({ x: reward.x + dx, y: reward.y + 1 }));
  const portal = { x: reward.x + 7, y: reward.y + 4 };

  // Covil do boss, mais abaixo; passagem estreita até os baús.
  const lairC = { x: cx + rng.int(-2, 2), y: reward.y + reward.h + 12 };
  const lairR = { x: 8 + rng.int(0, 1), y: 6.5 };
  blob(lairC.x, lairC.y, lairR.x, lairR.y);
  tunnel({ x: lairC.x, y: lairC.y - 4 }, { x: portal.x, y: reward.y + reward.h }, 2);
  const lair: Rect = { x: Math.round(lairC.x - lairR.x), y: Math.round(lairC.y - lairR.y), w: Math.round(lairR.x * 2) + 1, h: Math.round(lairR.y * 2) + 1 };
  // Pilares de rocha soltos no covil, longe do centro (onde o boss nasce).
  for (let i = 0; i < 4; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = 3.5 + rng.next() * 2;
    const px = Math.round(lairC.x + Math.cos(a) * r * 1.15);
    const py = Math.round(lairC.y + Math.sin(a) * r * 0.8);
    if (get(px, py) === Tile.Floor && openAround((x, y) => get(x, y), px, py, 1)) set(px, py, Tile.Wall);
  }

  // Câmara de chegada embaixo, com a saída no meio, e o túnel até o covil.
  const exit = { x: cx + rng.int(-3, 3), y: lairC.y + 17 };
  blob(exit.x, exit.y, 3.4, 2.8);
  tunnel({ x: exit.x, y: exit.y - 2 }, { x: lairC.x, y: lairC.y + 5 }, 3);
  set(exit.x, exit.y, Tile.Cave);

  // A área do subterrâneo vai só um pouco além do que foi escavado: é o que o minimapa mostra aberto.
  const under: Rect = { x: area.x, y: reward.y - 8, w: area.w, h: exit.y + 8 - (reward.y - 8) };
  return { area: under, lair, portal, reward, chests, exit };
}

const CAVERN_W = 76;
const CAVERN_H = 108;

/**
 * Caverna da Travessia: toda subterrânea, com o celular na vertical. A câmara de chegada (com o portal de fuga)
 * fica embaixo, no meio; acima dela, o **tronco**: 2 zonas de aquecimento em linha (todo mundo começa no nível 1).
 * Dali a caverna se bifurca em dois túneis separados por uma espinha de rocha: o oeste sobe por 3 zonas até o covil
 * do primeiro boss, e o leste, mais fundo e mais forte, por outras 3 até o covil do segundo. Cada túnel tem uma
 * câmara lateral (mini-boss e baú) e um nicho com monstros extras (campina). Poças de água escura (bloqueiam o passo,
 * não a visão) e pilares soltos nos covis. `path` guarda o tronco, as zonas do oeste e as do leste, nessa ordem
 * (profundidade 0 a 7).
 */
function generateCavern(seed: number): Dungeon {
  for (let attempt = 0; ; attempt++) {
    const d = buildCavern(seed + attempt);
    if (attempt >= 20 || cavernConnected(d)) return d;
  }
}

/** Tudo alcançável a pé da chegada: zonas, nichos, câmaras laterais (centro e baú), covis e portais. */
function cavernConnected(d: Dungeon) {
  const goals = [
    d.portal, ...d.path.map(centerOf), ...d.meadows.map(centerOf), ...d.side.flatMap((r) => [centerOf(r), { x: r.x + 1, y: r.y + 1 }]),
    ...d.lairs!.flatMap((l) => [centerOf(l.room), l.portal]),
  ];
  return connected(d.tiles, d.width, goals);
}

function buildCavern(seed: number): Dungeon {
  const rng = createRng(seed);
  const width = CAVERN_W;
  const height = CAVERN_H;
  const tiles = new Uint8Array(width * height).fill(Tile.Wall);
  const inside = (x: number, y: number) => x > 1 && y > 1 && x < width - 2 && y < height - 2;
  const set = (x: number, y: number, t: number) => { if (inside(x, y)) tiles[y * width + x] = t; };
  const get = (x: number, y: number) => (inside(x, y) ? tiles[y * width + x] : Tile.Wall);
  /** Mancha de borda irregular. */
  const blob = (cx: number, cy: number, rx: number, ry: number) => {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d <= 1 - rng.next() * 0.18) set(x, y, Tile.Floor);
      }
  };
  /** Túnel de `w` tiles de largura de um ponto a outro, desviando um pouco para os lados. */
  const tunnel = (from: { x: number; y: number }, to: { x: number; y: number }, w: number) => {
    let x = from.x;
    let y = from.y;
    for (let guard = 0; guard < 400 && (x !== to.x || y !== to.y); guard++) {
      const dx = to.x - x;
      const dy = to.y - y;
      // Anda no eixo mais longe, às vezes no outro (a curva do túnel).
      if (Math.abs(dx) > Math.abs(dy) ? rng.next() < 0.8 : rng.next() < 0.25) x += Math.sign(dx);
      else y += Math.sign(dy);
      for (let oy = 0; oy < w; oy++) for (let ox = 0; ox < w; ox++) set(x + ox - Math.floor(w / 2), y + oy - Math.floor(w / 2), Tile.Floor);
    }
  };
  const jitter = (p: { x: number; y: number }, by: number) => ({ x: p.x + rng.int(-by, by), y: p.y + rng.int(-by, by) });
  const path: Rect[] = [];
  /** Zona de monstros: mancha larga ligada à anterior por um túnel de 3 tiles. */
  const zone = (z: { x: number; y: number }, from: { x: number; y: number }) => {
    const half = rng.int(4, 5);
    blob(z.x, z.y, half + 0.5, half - 0.5);
    tunnel(from, z, 3);
    path.push({ x: z.x - half, y: z.y - half + 1, w: half * 2 + 1, h: half * 2 - 1 });
  };

  // Câmara de chegada embaixo, no meio, e o tronco subindo dela.
  const arrival = { x: width / 2, y: height - 13 };
  blob(arrival.x, arrival.y, 6, 4.5);
  const spawn: Rect = { x: arrival.x - 4, y: arrival.y - 3, w: 8, h: 7 };
  const trunk = [jitter({ x: width / 2, y: height - 27 }, 2), jitter({ x: width / 2, y: height - 41 }, 1)];
  zone(trunk[0], { x: arrival.x, y: arrival.y - 3 });
  zone(trunk[1], trunk[0]);
  const fork = trunk[1];

  // As duas pontas da bifurcação: zonas (centros) e covil, do oeste e do leste, espelhadas.
  const branch = (side: -1 | 1) => {
    const mx = (x: number) => Math.round(width / 2 + side * x);
    const zones = [jitter({ x: mx(16), y: 56 }, 2), jitter({ x: mx(24), y: 42 }, 2), jitter({ x: mx(18), y: 29 }, 1)];
    const lair = { x: mx(20) + rng.int(-1, 1), y: 13 };
    const alcove = { x: mx(29), y: 64 + rng.int(-1, 1) };
    return { zones, lair, alcove };
  };
  const west = branch(-1);
  const east = branch(1);

  const side: Rect[] = [];
  const meadows: Rect[] = [];
  const lairs: LairRoom[] = [];
  for (const [i, b] of [west, east].entries()) {
    let prev = fork;
    for (const z of b.zones) {
      zone(z, prev);
      prev = z;
    }
    // Covil: caverna larga com pilares soltos longe do centro (onde o boss nasce) e o portal no fundo.
    const lairR = { x: 8, y: 6.5 };
    blob(b.lair.x, b.lair.y, lairR.x, lairR.y);
    tunnel(prev, { x: b.lair.x, y: b.lair.y + 4 }, 3);
    const room: Rect = {
      x: Math.round(b.lair.x - lairR.x), y: Math.round(b.lair.y - lairR.y), w: lairR.x * 2 + 1, h: Math.round(lairR.y * 2) + 1,
    };
    for (let k = 0; k < 4; k++) {
      const a = rng.next() * Math.PI * 2;
      const r = 3.5 + rng.next() * 2;
      const px = Math.round(b.lair.x + Math.cos(a) * r * 1.15);
      const py = Math.round(b.lair.y + Math.sin(a) * r * 0.8);
      if (get(px, py) === Tile.Floor && openAround(get, px, py, 1)) set(px, py, Tile.Wall);
    }
    const portal = { x: b.lair.x, y: b.lair.y - 4 };
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) set(portal.x + ox, portal.y + oy, Tile.Floor);
    lairs.push({ room, portal });

    // Câmara lateral, pendurada na zona do meio, do lado da espinha (mini-boss e baú no canto).
    const mid = b.zones[1];
    const dir = i === 0 ? 1 : -1;
    const sr: Rect = { x: mid.x + (dir > 0 ? 7 : -13), y: mid.y - 3 + rng.int(-1, 1), w: 7, h: 6 };
    for (let y = sr.y; y < sr.y + sr.h; y++) for (let x = sr.x; x < sr.x + sr.w; x++) set(x, y, Tile.Floor);
    tunnel(mid, centerOf(sr), 2);
    side.push(sr);

    // Nicho para fora, na primeira zona do túnel: monstros extras (como as campinas dos mapas abertos).
    blob(b.alcove.x, b.alcove.y, 3.5, 3);
    tunnel(b.zones[0], b.alcove, 2);
    meadows.push({ x: b.alcove.x - 3, y: b.alcove.y - 2, w: 7, h: 5 });
  }

  // Poças de água escura nas zonas, fora do centro (a conferência a pé descarta a caverna se fecharem passagem).
  for (const z of path) {
    if (rng.next() < 0.45) continue;
    const c = centerOf(z);
    const px = c.x + rng.pick([-3, 3]);
    const py = c.y + rng.int(-2, 2);
    for (let y = py - 1; y <= py + 1; y++)
      for (let x = px - 1; x <= px + 1; x++)
        if (get(x, y) === Tile.Floor && rng.next() < 0.75) set(x, y, Tile.Water);
  }

  const portal = { x: arrival.x, y: arrival.y };
  set(portal.x, portal.y, Tile.Portal);

  return {
    mapId: "cavern", width, height, tiles, spawn, boss: lairs[0].room, bossPortal: lairs[0].portal,
    path, side, meadows, portal, lairs,
  };
}

const MARSH_SIZE = 128;
/** Zonas do caminho entre a entrada e a clareira do boss (mais que nos outros mapas: mais monstros e mais níveis). */
const MARSH_STEPS = 9;
/** Raio da clareira do boss, no centro. */
const MARSH_CLEARING = 8;
/** Campinas (pontos de monstros extras fora das zonas). */
const MARSH_MEADOWS = 14;
/** Clareiras de mini-boss com baú por zona do caminho, no máximo. */
const MARSH_SIDE_PER_ZONE = 2;
/** Passarelas de madeira no máximo (atravessam lagoas). */
const MARSH_PLANKS = 9;

/**
 * Pântano do Kosaradius: floresta alagada, o maior mapa. Nasce todo andável, cercado de mata fechada, e recebe por cima lagoas
 * grandes e poças, ilhas de mata, troncos caídos e muitas árvores soltas (ciprestes, salgueiros, mangues e
 * árvores mortas, algumas de pé dentro da água), sempre deixando passagem. Passarelas de madeira cruzam algumas
 * lagoas (atalho; às vezes levam a uma ilha). Zonas em arco da entrada até a clareira do centro, cercada de
 * ciprestes, onde fica o boss; clareiras cercadas de troncos caídos guardam mini-boss e baú.
 * Árvore solta é mata (`Tile.Wall`) sem mata nos 4 lados; mata encostada em mata é mata fechada (o cliente
 * desenha cada uma por essa regra, como os coqueiros do deserto).
 */
function generateMarsh(seed: number): Dungeon {
  for (let attempt = 0; ; attempt++) {
    const d = buildMarsh(seed + attempt);
    if (attempt >= 20 || connected(d.tiles, d.width, swampGoals(d))) return d;
  }
}

function buildMarsh(seed: number): Dungeon {
  const rng = createRng(seed);
  const size = MARSH_SIZE;
  const tiles = new Uint8Array(size * size).fill(Tile.Floor);
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < size - 1 && y < size - 1;
  const get = (x: number, y: number) => (inside(x, y) ? tiles[y * size + x] : Tile.Wall);
  const set = (x: number, y: number, t: number) => { if (inside(x, y)) tiles[y * size + x] = t; };
  const orthoWall = (x: number, y: number) =>
    get(x - 1, y) === Tile.Wall || get(x + 1, y) === Tile.Wall || get(x, y - 1) === Tile.Wall || get(x, y + 1) === Tile.Wall;

  /** Mancha de borda irregular, alongada (`stretch` > 1 estica na horizontal); `only` limita a troca a um tipo. */
  const blob = (cx: number, cy: number, r: number, t: number, only: number, stretch = 1) => {
    const reach = Math.ceil(r * Math.max(stretch, 1 / stretch) + 1);
    for (let y = cy - reach; y <= cy + reach; y++)
      for (let x = cx - reach; x <= cx + reach; x++) {
        const edge = r - 0.6 + rng.next() * 1.2;
        if (Math.hypot((x - cx) / stretch, (y - cy) * stretch) > edge) continue;
        if (get(x, y) === only) set(x, y, t);
      }
  };

  // Mata fechada na borda, com a espessura ondulando devagar.
  for (let side = 0; side < 4; side++) {
    let depth = rng.int(3, 5);
    let goal = depth;
    for (let i = 0; i < size; i++) {
      if (i % 5 === 0) goal = rng.int(3, 8);
      if (rng.next() < 0.5) depth += Math.sign(goal - depth);
      for (let d = 0; d < depth; d++) {
        const [x, y] = side === 0 ? [i, d] : side === 1 ? [size - 1 - d, i] : side === 2 ? [i, size - 1 - d] : [d, i];
        tiles[y * size + x] = Tile.Wall;
      }
    }
  }

  const center = { x: size / 2, y: size / 2 };
  const boss: Rect = { x: center.x - MARSH_CLEARING - 1, y: center.y - MARSH_CLEARING - 1, w: MARSH_CLEARING * 2 + 2, h: MARSH_CLEARING * 2 + 2 };

  // Entrada perto de uma das 4 bordas.
  const along = rng.int(20, size - 30);
  const spawnPos = rng.pick([
    { x: along, y: 10 },
    { x: size - 20, y: along },
    { x: along, y: size - 20 },
    { x: 10, y: along },
  ]);
  const spawn: Rect = { ...spawnPos, w: 10, h: 10 };
  const s = centerOf(spawn);

  // Zonas em arco da entrada até perto da clareira, girando em volta do centro (como no Pântano das Ruínas).
  const r0 = Math.hypot(s.x - center.x, s.y - center.y);
  const a0 = Math.atan2(s.y - center.y, s.x - center.x);
  const turn = (rng.next() < 0.5 ? -1 : 1) * Math.PI * (1.3 + rng.next() * 0.4);
  const anchors: { x: number; y: number }[] = [];
  const path: Rect[] = [];
  for (let i = 1; i <= MARSH_STEPS; i++) {
    const t = i / MARSH_STEPS;
    const r = r0 + (MARSH_CLEARING + 16 - r0) * t;
    const a = a0 + turn * t;
    const half = rng.int(6, 8);
    const cx = clamp(center.x + Math.cos(a) * r + rng.int(-3, 3), half + 9, size - half - 10);
    const cy = clamp(center.y + Math.sin(a) * r + rng.int(-3, 3), half + 9, size - half - 10);
    anchors.push({ x: cx, y: cy });
    path.push({ x: cx - half, y: cy - half, w: half * 2 + 1, h: half * 2 + 1 });
  }

  // Clareiras cercadas de troncos caídos perto das zonas (mini-boss e baú), com 2 passagens: até
  // `MARSH_SIDE_PER_ZONE` por zona, a 13 ou 21 tiles dela.
  const side: Rect[] = [];
  for (let i = 0; i < anchors.length * MARSH_SIDE_PER_ZONE; i++) {
    const anchor = anchors[i % anchors.length];
    const reach = i < anchors.length ? 13 : 21;
    // A segunda volta (mais longe da zona) só em parte das zonas: sobra campo para as lagoas.
    if (i >= anchors.length && rng.next() < 0.5) continue;
    const w = rng.int(7, 9);
    const h = rng.int(7, 9);
    const room = shuffled(rng, SWAMP_SIDE_DIRS)
      .map(([dx, dy]): Rect => ({
        x: clamp(anchor.x + dx * reach - w / 2, 8, size - w - 9),
        y: clamp(anchor.y + dy * reach - h / 2, 8, size - h - 9),
        w, h,
      }))
      .find((r) => gapBetween(r, spawn) >= SIDE_ROOM_MIN_GAP + 4 && gapBetween(r, boss) >= 4
        && side.every((o) => gapBetween(r, o) >= 4)
        && anchors.every((p) => gapBetween(r, { x: p.x, y: p.y, w: 1, h: 1 }) >= 3));
    if (!room) continue;
    for (let y = room.y; y < room.y + room.h; y++)
      for (let x = room.x; x < room.x + room.w; x++) {
        const border = x === room.x || y === room.y || x === room.x + room.w - 1 || y === room.y + room.h - 1;
        if (border && rng.next() >= 0.2) set(x, y, Tile.Ruin);
      }
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    for (const gate of shuffled(rng, [0, 1, 2, 3]).slice(0, 2))
      for (let k = -1; k <= 1; k++) {
        if (gate === 0) set(cx + k, room.y, Tile.Floor);
        if (gate === 1) set(room.x + room.w - 1, cy + k, Tile.Floor);
        if (gate === 2) set(cx + k, room.y + room.h - 1, Tile.Floor);
        if (gate === 3) set(room.x, cy + k, Tile.Floor);
      }
    side.push(room);
  }

  // Campinas: pontos de monstros extras pelo campo, longe da entrada, das zonas, das clareiras e do centro.
  const meadows: Rect[] = [];
  for (let tries = 0; tries < 300 && meadows.length < MARSH_MEADOWS; tries++) {
    const p = { x: rng.int(15, size - 16), y: rng.int(15, size - 16) };
    const far = (q: { x: number; y: number }, d: number) => Math.hypot(p.x - q.x, p.y - q.y) >= d;
    if (!far(s, 26) || !far(center, MARSH_CLEARING + 10) || !anchors.every((a) => far(a, 12))
      || !meadows.every((m) => far(centerOf(m), 12)) || side.some((r) => gapBetween(r, { ...p, w: 1, h: 1 }) < 4)) continue;
    meadows.push({ x: p.x - 4, y: p.y - 4, w: 9, h: 9 });
  }

  // Clareira do boss: círculo aberto com um anel de ciprestes soltos em volta (com folgas para entrar).
  const ring = MARSH_CLEARING + 1.5;
  const trees = Math.round(ring * 3.4);
  const gapAt = rng.next() * Math.PI * 2;
  for (let k = 0; k < trees; k++) {
    const a = (k / trees) * Math.PI * 2 + gapAt;
    // 4 entradas largas, em cruz.
    if (Math.abs(Math.sin(2 * (a - gapAt))) < 0.3) continue;
    const x = Math.round(center.x + Math.cos(a) * ring);
    const y = Math.round(center.y + Math.sin(a) * ring);
    if (!orthoWall(x, y)) set(x, y, Tile.Wall);
  }

  // Áreas que ficam livres: entrada, clareira, clareiras dos baús e o miolo de cada zona e campina.
  const clearing = { x: center.x - MARSH_CLEARING, y: center.y - MARSH_CLEARING, w: MARSH_CLEARING * 2 + 1, h: MARSH_CLEARING * 2 + 1 };
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

  // Lagoas grandes, alongadas, com uma ou duas poças coladas (a margem fica recortada).
  const lakes: { x: number; y: number; r: number }[] = [];
  for (let tries = 0; tries < 80 && lakes.length < 16; tries++) {
    const l = { x: rng.int(12, size - 13), y: rng.int(12, size - 13), r: 3.5 + rng.next() * 4 };
    if (lakes.some((o) => Math.hypot(o.x - l.x, o.y - l.y) < o.r + l.r + 5)) continue;
    const stretch = 0.75 + rng.next() * 0.6;
    obstacle(() => {
      blob(l.x, l.y, l.r, Tile.Water, Tile.Floor, stretch);
      for (let k = rng.int(1, 2); k > 0; k--) {
        const a = rng.next() * Math.PI * 2;
        blob(Math.round(l.x + Math.cos(a) * l.r), Math.round(l.y + Math.sin(a) * l.r), 1.5 + rng.next() * 2, Tile.Water, Tile.Floor);
      }
    });
    if (get(l.x, l.y) === Tile.Water) lakes.push(l);
  }

  // Poças e brejos menores.
  for (let i = 0; i < 60; i++) {
    const x = rng.int(8, size - 9);
    const y = rng.int(8, size - 9);
    obstacle(() => blob(x, y, 1.2 + rng.next() * 2.4, Tile.Water, Tile.Floor, 0.8 + rng.next() * 0.5));
  }

  // Ilhas de mata fechada, de tamanhos variados, às vezes com uma moita ao lado.
  for (let i = 0; i < 170; i++) {
    const x = rng.int(7, size - 8);
    const y = rng.int(7, size - 8);
    const r = 1.4 + rng.next() * 3.8;
    obstacle(() => {
      blob(x, y, r, Tile.Wall, Tile.Floor, 0.8 + rng.next() * 0.5);
      if (rng.next() < 0.5) blob(x + rng.int(-4, 4), y + rng.int(-4, 4), 1 + rng.next() * 1.5, Tile.Wall, Tile.Floor);
    });
  }

  // Troncos caídos pelo campo: trechos curtos e retos.
  for (let i = 0; i < 18; i++) {
    const x = rng.int(8, size - 9);
    const y = rng.int(8, size - 9);
    const len = rng.int(2, 4);
    const horizontal = rng.next() < 0.6;
    obstacle(() => { for (let k = 0; k < len; k++) set(horizontal ? x + k : x, horizontal ? y : y + k, Tile.Ruin); });
  }

  // Árvores dentro da água: na beira e no meio das lagoas, sem encostar em outra mata (são árvores soltas).
  for (let y = 2; y < size - 2; y++)
    for (let x = 2; x < size - 2; x++) {
      if (get(x, y) !== Tile.Water || orthoWall(x, y)) continue;
      const wet = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].filter((t) => t === Tile.Water).length;
      if (rng.next() < (wet === 4 ? 0.05 : 0.09)) set(x, y, Tile.Wall);
    }

  // Passarelas de madeira: retas por cima da água, de terra a terra (um atalho; nunca fecham passagem).
  const planks: Rect[] = [];
  for (let tries = 0; tries < 400 && planks.length < MARSH_PLANKS; tries++) {
    const x = rng.int(6, size - 7);
    const y = rng.int(6, size - 7);
    if (get(x, y) !== Tile.Water) continue;
    const horizontal = rng.next() < 0.5;
    const [dx, dy] = horizontal ? [1, 0] : [0, 1];
    // Anda para os dois lados até sair da água.
    let a = 0;
    let b = 0;
    while (a < 16 && get(x - dx * (a + 1), y - dy * (a + 1)) === Tile.Water) a++;
    while (b < 16 && get(x + dx * (b + 1), y + dy * (b + 1)) === Tile.Water) b++;
    const len = a + b + 1;
    const start = { x: x - dx * a, y: y - dy * a };
    const end = { x: x + dx * b, y: y + dy * b };
    if (len < 3 || len > 16) continue;
    if (get(start.x - dx, start.y - dy) !== Tile.Floor || get(end.x + dx, end.y + dy) !== Tile.Floor) continue;
    // Água dos dois lados da passarela (fora as pontas, na margem), senão é só uma beirada.
    let ok = true;
    for (let k = 1; k < len - 1 && ok; k++) {
      const px = start.x + dx * k;
      const py = start.y + dy * k;
      if (get(px - dy, py - dx) === Tile.Floor || get(px + dy, py + dx) === Tile.Floor) ok = false;
    }
    if (!ok || planks.some((p) => gapBetween(p, { x: start.x, y: start.y, w: dx * len + dy, h: dy * len + dx }) < 3)) continue;
    for (let k = 0; k < len; k++) set(start.x + dx * k, start.y + dy * k, Tile.Floor);
    planks.push({ x: start.x, y: start.y, w: horizontal ? len : 1, h: horizontal ? 1 : len });
  }
  const onPlanks = (x: number, y: number) => planks.some((p) => x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h);

  // Árvores soltas: só com chão em volta, para nunca fechar passagem (mais que nos outros mapas: é uma floresta).
  for (let y = 4; y < size - 4; y++)
    for (let x = 4; x < size - 4; x++) {
      if (kept(x, y) || (x >= clearing.x && y >= clearing.y && x < clearing.x + clearing.w && y < clearing.y + clearing.h) || !openAround(get, x, y, 1) || onPlanks(x, y)) continue;
      const open = openAround(get, x, y, 2);
      if (rng.next() < (open ? 0.09 : 0.04) && !orthoWall(x, y)) set(x, y, Tile.Wall);
    }

  // Bolsões de chão que ficaram sem acesso viram mata (ninguém nasce ou cai lá).
  const reach = reachableFrom(tiles, size, s);
  for (let i = 0; i < tiles.length; i++) if (tiles[i] === Tile.Floor && !reach[i]) tiles[i] = Tile.Wall;

  const portal = s;
  set(portal.x, portal.y, Tile.Portal);

  return { mapId: "marsh", width: size, height: size, tiles, spawn, boss, bossPortal: centerOf(boss), path, side, meadows, portal, planks };
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
  const walk = (i: number) => tiles[i] === Tile.Floor || tiles[i] === Tile.Portal || tiles[i] === Tile.Cave;
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
  return t === Tile.Floor || t === Tile.Portal || t === Tile.Cave;
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
