import { TILE_SIZE, Tile, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { TileAtlas } from "./art/paint.ts";
import {
  GIANT, HEART, OPEN, SPECIES, TALL, TALL_DECOR, TREE, boardTile, bogTile, bridgeTile, canopyTile, dirtTile, draw, flatDecor, giant,
  heartTree, litterEdge, logTile, mudEdge, shadowEdge, stone, tallDecor, tree, wallTile, waterTile,
  type FlatDecor, type ForestVariant, type TallDecor,
} from "./art/forestArt.ts";

// O plano do Bosque Velho, do Coração da Mata e do Pântano do Kosaradius, sem o Phaser: que quadro vai em cada tile de
// cada camada e que objeto fica de pé onde. `forestMap.ts` desenha no jogo; o plano também serve para prévias fora do
// navegador. O pântano é a mesma mata, alagada: passarelas em vez de pontes, lamaçais no capim, árvores dentro d'água.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const RING = [[0, -1, OPEN.n], [1, 0, OPEN.e], [0, 1, OPEN.s], [-1, 0, OPEN.w], [1, -1, OPEN.ne], [-1, -1, OPEN.nw], [1, 1, OPEN.se], [-1, 1, OPEN.sw]] as const;

/** Variações de cada chão: metade dos tiles usa a primeira, o resto se espalha. */
const GRASS_VARIANTS = 6;
const ARENA_VARIANTS = 3;
const WATER_VARIANTS = 2;
const MARSH_WATER_VARIANTS = 6;
const TREE_VARIANTS = 3;
const GIANT_VARIANTS = 2;
const CANOPY_VARIANTS = 4;

/** Camadas de chão, na ordem em que são desenhadas. */
export const LAYERS = ["chao", "trilha", "barro", "folhas", "sombra", "relevo", "enfeites"] as const;
export type Layer = (typeof LAYERS)[number];

/** Objeto de pé: `sheet` é a folha de quadros, `x` e `y` o tile da base (o pé do quadro fica no meio da base). */
export interface Standing {
  sheet: "trunk" | "crown" | "giantTrunk" | "giantCrown" | "heartTrunk" | "heartCrown" | "heartGlow" | "stone" | "stoneGlow" | "tall";
  frame: number;
  x: number;
  y: number;
  /** Largura da base em tiles (a árvore anciã tem 2; a do coração, 3). */
  span: number;
  scale: number;
  flip: boolean;
  depth: number;
}

/**
 * O que o mapa desenha, sem o Phaser (para o jogo e para prévias): o atlas com os quadros que o mapa usa, o quadro de
 * cada tile em cada camada e os objetos de pé.
 */
export function planForest(d: Dungeon) {
  const variant: ForestVariant = d.mapId === "heartwood" ? "heartwood" : d.mapId === "marsh" ? "marsh" : "oldwood";
  const heart = variant === "heartwood";
  const marsh = variant === "marsh";
  const W = d.width;
  const H = d.height;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const wall = (x: number, y: number) => at(x, y) === Tile.Wall;
  const ruin = (x: number, y: number) => inMap(x, y) && at(x, y) === Tile.Ruin;
  const lone = (x: number, y: number, test: (x: number, y: number) => boolean) => test(x, y) && DIRS.every(([dx, dy]) => !test(x + dx, y + dy));
  const arenaCenter = { x: d.boss.x + Math.floor(d.boss.w / 2), y: d.boss.y + Math.floor(d.boss.h / 2) };
  // No pântano a arena é a clareira do boss (o retângulo do gerador, com o anel de ciprestes em volta).
  const inArena = marsh
    ? (x: number, y: number) => inRect(d.boss, x, y)
    : (x: number, y: number) => Math.hypot((x - arenaCenter.x) / 1.1, y - arenaCenter.y) <= 8.6;
  const inRooms = (x: number, y: number) => d.side.some((r) => inRect(r, x, y));

  // Pontes (tábuas por cima do riacho) e trilhas. No pântano, as passarelas: uma fila de tiles de leste a oeste ou de
  // norte a sul, com as pontas (onde ficam os postes).
  const bridge = new Map<number, -1 | 0 | 1>();
  const boards = new Map<number, { across: boolean; ends: number }>();
  for (const p of d.planks ?? []) {
    const across = p.w > 1;
    for (let y = p.y; y < p.y + p.h; y++)
      for (let x = p.x; x < p.x + p.w; x++) {
        bridge.set(y * W + x, x === p.x ? -1 : x === p.x + p.w - 1 ? 1 : 0);
        const ends = across ? (x === p.x ? OPEN.w : 0) | (x === p.x + p.w - 1 ? OPEN.e : 0) : (y === p.y ? OPEN.n : 0) | (y === p.y + p.h - 1 ? OPEN.s : 0);
        boards.set(y * W + x, { across, ends });
      }
  }
  const onBridge = (x: number, y: number) => inMap(x, y) && bridge.has(y * W + x);
  const trailSet = new Set(d.trails ?? []);
  const trail = (x: number, y: number) => inMap(x, y) && trailSet.has(y * W + x) && !onBridge(x, y);
  /** Árvore solta do pântano com água em 2 lados ou mais: nasce dentro d'água (marcadas depois de saber as árvores). */
  const wetTree = new Uint8Array(W * H);
  const water = (x: number, y: number) => at(x, y) === Tile.Water || onBridge(x, y) || (inMap(x, y) && wetTree[y * W + x] === 1);

  // Mata: árvore solta (1 tile), anciã (bloco isolado de 2×2), a árvore do coração (na arena) ou mata fechada.
  const kind = new Uint8Array(W * H); // 0 nada, 1 mata fechada, 2 solta, 3 anciã, 4 coração
  const giants: { x: number; y: number }[] = [];
  let heartBlock: { x0: number; x1: number; y1: number } | null = null;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!wall(x, y)) continue;
      const i = y * W + x;
      if (heart && inArena(x, y)) {
        kind[i] = 4;
        heartBlock = heartBlock ? { x0: Math.min(heartBlock.x0, x), x1: Math.max(heartBlock.x1, x), y1: Math.max(heartBlock.y1, y) } : { x0: x, x1: x, y1: y };
      } else if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && lone(x, y, wall)) kind[i] = 2;
      else kind[i] = 1;
    }
  /** Bloco de 2×2 de mata sem mata encostada nos lados: a árvore anciã que o gerador põe. */
  const isBlock = (x: number, y: number) => {
    if (x < 1 || y < 1 || x > W - 3 || y > H - 3) return false;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (kind[(y + dy) * W + x + dx] !== 1) return false;
    for (let k = 0; k < 2; k++) if (wall(x + k, y - 1) || wall(x + k, y + 2) || wall(x - 1, y + k) || wall(x + 2, y + k)) return false;
    return true;
  };
  for (let y = 1; y < H - 2; y++)
    for (let x = 1; x < W - 2; x++) {
      if (!isBlock(x, y)) continue;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) kind[(y + dy) * W + x + dx] = 3;
      giants.push({ x, y });
    }
  /** Mata fechada (fora do mapa também é mata). */
  const forest = (x: number, y: number) => !inMap(x, y) || kind[y * W + x] === 1;
  if (marsh)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (kind[y * W + x] === 2 && DIRS.filter(([dx, dy]) => at(x + dx, y + dy) === Tile.Water).length >= 2) wetTree[y * W + x] = 1;
  /**
   * Lamaçais do pântano: manchas de lama no capim aberto, por um ruído suave sobre a grade de tiles (fora das clareiras,
   * da arena e das passarelas).
   */
  const bogSet = new Uint8Array(W * H);
  if (marsh) {
    const cellNoise = (x: number, y: number) => {
      const C = 7, gx = Math.floor(x / C), gy = Math.floor(y / C), fx = x / C - gx, fy = y / C - gy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const v = (i: number, j: number) => hash(i, j, 71);
      const top = v(gx, gy) + (v(gx + 1, gy) - v(gx, gy)) * sx, bottom = v(gx, gy + 1) + (v(gx + 1, gy + 1) - v(gx, gy + 1)) * sx;
      return top + (bottom - top) * sy;
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (at(x, y) === Tile.Floor && cellNoise(x, y) > 0.7 && !inRooms(x, y) && !inArena(x, y) && !onBridge(x, y)) bogSet[y * W + x] = 1;
  }
  const bog = (x: number, y: number) => inMap(x, y) && bogSet[y * W + x] === 1;
  /** Vizinhos (8 bits) que passam no teste. */
  const ring = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = 0;
    for (const [dx, dy, bit] of RING) if (test(x + dx, y + dy)) m |= bit;
    return m;
  };
  /**
   * O mesmo, sem a quina que já tem um dos lados dela marcado: dentro do tile, a distância até ela nunca é menor que
   * até o lado. Serve para o que só pinta dentro do tile (menos quadros no atlas); a copa usa o anel inteiro.
   */
  const edges = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = ring(x, y, test);
    if (m & (OPEN.n | OPEN.e)) m &= ~OPEN.ne;
    if (m & (OPEN.n | OPEN.w)) m &= ~OPEN.nw;
    if (m & (OPEN.s | OPEN.e)) m &= ~OPEN.se;
    if (m & (OPEN.s | OPEN.w)) m &= ~OPEN.sw;
    return m;
  };
  const near = (x: number, y: number, reach: number, test: (x: number, y: number) => boolean) => {
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (test(x + dx, y + dy)) return true;
    return false;
  };
  const pick = (x: number, y: number, count: number, seed = 0) => {
    const n = hash(x, y, seed);
    return n < 0.5 ? 0 : 1 + Math.floor((n - 0.5) * 2 * (count - 1));
  };
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1 || d.side.some((r) => x === r.x + 1 && y === r.y + 1)
    || tileDistance(x, y, d.bossPortal.x, d.bossPortal.y) <= 1;

  // --- Quadros do atlas -----------------------------------------------------------------
  const atlas = new TileAtlas();
  const layers = Object.fromEntries(LAYERS.map((l) => [l, new Int32Array(W * H).fill(-1)])) as Record<Layer, Int32Array>;
  const put = (layer: Layer, x: number, y: number, key: string, paint: () => Uint8ClampedArray) => { layers[layer][y * W + x] = atlas.frame(key, paint); };

  // Círculo de cogumelos (Bosque Velho) em volta do meio da arena.
  const fairy = new Set<number>();
  if (!heart)
    for (let a = 0; a < Math.PI * 2; a += 0.3) fairy.add(Math.round(arenaCenter.y + 1 + Math.sin(a) * 2.6) * W + Math.round(arenaCenter.x + Math.cos(a) * 3));

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = at(x, y);
      // Chão (debaixo de tudo, até da mata: a beira recortada da copa mostra o capim).
      if (marsh && (t === Tile.Water || onBridge(x, y) || wetTree[i])) {
        // Pântano: a água larga tem mais variações (o miolo de cada uma é diferente). Passarela e árvore dentro d'água:
        // a água corre por baixo.
        // As variações só no miolo da lagoa (sem terra em volta): na margem, o contorno já muda de tile para tile, e o
        // atlas não passa do limite de textura do celular.
        const land = edges(x, y, (a, b) => !water(a, b));
        const v = land ? pick(x, y, 2, 5) : pick(x, y, MARSH_WATER_VARIANTS, 5);
        put("chao", x, y, `water${land}-${v}`, () => waterTile(variant, land, v).render(false));
      } else if (t === Tile.Water && !onBridge(x, y)) {
        const land = edges(x, y, (a, b) => !water(a, b));
        const v = pick(x, y, WATER_VARIANTS, 5);
        put("chao", x, y, `water${land}-${v}`, () => waterTile(variant, land, v).render(false));
      } else if (inArena(x, y)) {
        const v = pick(x, y, ARENA_VARIANTS, 2);
        put("chao", x, y, `arena${v}`, draw.arena(variant, v));
      } else {
        const v = pick(x, y, GRASS_VARIANTS, 1);
        put("chao", x, y, `grass${v}`, draw.grass(variant, v));
      }
      if (marsh && onBridge(x, y)) {
        const b = boards.get(i)!;
        const v = pick(x, y, 3, 6);
        put("relevo", x, y, `board${b.across ? 1 : 0}-${b.ends}-${v}`, () => boardTile(variant, b.across, b.ends, v).render(true));
        continue;
      }
      if (onBridge(x, y)) {
        const side = bridge.get(i)!;
        const v = pick(x, y, 2, 6);
        put("relevo", x, y, `bridge${side}-${v}`, () => bridgeTile(variant, side, v).render(false));
        continue;
      }
      if (kind[i] === 1) {
        const open = ring(x, y, (a, b) => !forest(a, b));
        // O miolo da mata (sem chão por perto) tem variações; a beira, uma só (são muitas combinações de vizinhos).
        const v = open === 0 ? pick(x, y, CANOPY_VARIANTS, 3) : 0;
        put("relevo", x, y, `canopy${open}-${v}`, () => canopyTile(variant, open, v).render(true));
        continue;
      }
      if (t === Tile.Ruin && !lone(x, y, ruin)) {
        const joins = ring(x, y, ruin) & (OPEN.n | OPEN.e | OPEN.s | OPEN.w);
        const v = pick(x, y, 3, 7);
        if (heart) {
          const south = !ruin(x, y + 1) && !forest(x, y + 1);
          put("relevo", x, y, `wall${joins}-${south ? 1 : 0}-${v}`, () => wallTile(variant, joins, south, v).render(true));
        } else put("relevo", x, y, `log${joins}-${v}`, () => logTile(variant, joins, v).render(true));
      }
      if (t === Tile.Water || t === Tile.Ruin || kind[i] === 4 || wetTree[i]) continue;

      // Bordas no chão: trilha de terra, barro perto da água, folhas secas e sombra perto da mata.
      if (trail(x, y)) {
        const out = edges(x, y, (a, b) => !trail(a, b));
        put("trilha", x, y, `dirt${out}`, () => dirtTile(variant, out).render(false));
      }
      if (bog(x, y)) {
        const out = edges(x, y, (a, b) => !bog(a, b));
        const v = out ? 0 : pick(x, y, 3, 8);
        put("trilha", x, y, `bog${out}-${v}`, () => bogTile(variant, out, v).render(false));
      }
      const wet = edges(x, y, (a, b) => at(a, b) === Tile.Water && !onBridge(a, b));
      if (wet) put("barro", x, y, `mud${wet}`, () => mudEdge(variant, wet).render(false));
      const woods = edges(x, y, forest);
      if (woods && !inArena(x, y)) put("folhas", x, y, `litter${woods}`, () => litterEdge(variant, woods).render(true));
      const shade = woods & (OPEN.n | OPEN.w | OPEN.nw);
      if (shade) put("sombra", x, y, `shade${shade}`, () => shadowEdge(variant, shade));

      // Enfeites rasteiros: poucos, em grupos perto da mata, dos troncos e das salas.
      if (kind[i] || reserved(x, y) || t === Tile.Portal) continue;
      if (fairy.has(i)) {
        put("enfeites", x, y, `flat-shrooms-${i % 3}`, () => flatDecor(variant, "shrooms", i % 3).render(true));
        continue;
      }
      const n = hash(x, y, 91);
      const byWoods = near(x, y, 1, forest);
      const chance = inRooms(x, y) ? (marsh ? 0.4 : 0.14) : trail(x, y) ? 0.03 : byWoods ? 0.14 : marsh ? 0.13 : 0.09;
      if (n >= chance || bog(x, y)) continue;
      const k = flatKind(hash(x, y, 92), { heart, marsh, trail: trail(x, y), woods: byWoods, wet: wet !== 0, arena: inArena(x, y), room: inRooms(x, y) });
      const v = Math.floor(hash(x, y, 93) * 3);
      put("enfeites", x, y, `flat-${k}-${v}`, () => flatDecor(variant, k, v).render(true));
    }

  // --- De pé ------------------------------------------------------------------------------
  const standing: Standing[] = [];
  const depthOf = (y: number) => (y + 1) * TILE_SIZE - 0.25;
  const species = SPECIES[variant];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const flip = hash(x, y, 95) < 0.5;
      if (kind[i] === 2) {
        const sp = marsh ? marshSpecies(hash(x, y, 96), { inWater: wetTree[i] === 1, byWater: near(x, y, 1, (a, b) => at(a, b) === Tile.Water), byBoss: Math.hypot(x - arenaCenter.x, y - arenaCenter.y) < d.boss.w / 2 + 3 })
          : Math.floor(hash(x, y, 96) * species.length);
        const frame = sp * TREE_VARIANTS + Math.floor(hash(x, y, 97) * TREE_VARIANTS);
        const scale = 0.85 + hash(x, y, 98) * 0.3;
        standing.push({ sheet: "trunk", frame, x, y, span: 1, scale, flip, depth: depthOf(y) });
        standing.push({ sheet: "crown", frame, x, y, span: 1, scale, flip, depth: depthOf(y) + 0.1 });
        continue;
      }
      if (marsh && at(x, y) === Tile.Ruin && lone(x, y, ruin)) {
        // Pedra solta do pântano: um toco grande.
        standing.push({ sheet: "tall", frame: TALL_DECOR.indexOf("stump"), x, y, span: 1, scale: 1.15, flip, depth: depthOf(y) });
        continue;
      }
      if (at(x, y) === Tile.Ruin && lone(x, y, ruin)) {
        const menhir = inArena(x, y);
        const frame = (menhir ? 3 : 0) + Math.floor(hash(x, y, 99) * 3);
        standing.push({ sheet: "stone", frame, x, y, span: 1, scale: 1, flip, depth: depthOf(y) });
        if (menhir) standing.push({ sheet: "stoneGlow", frame, x, y, span: 1, scale: 1, flip, depth: depthOf(y) + 0.05 });
        continue;
      }
      const t = at(x, y);
      if (t !== Tile.Floor || kind[i] || reserved(x, y) || layers.enfeites[i] >= 0 || trail(x, y) || onBridge(x, y) || bog(x, y)) continue;
      if (inArena(x, y) && Math.hypot(x - arenaCenter.x, y - arenaCenter.y) < 7) continue;
      const n = hash(x, y, 101);
      const byWater = near(x, y, 1, (a, b) => at(a, b) === Tile.Water);
      const byWoods = near(x, y, 1, forest);
      const chance = byWater ? (marsh ? 0.3 : 0.16) : byWoods ? 0.22 : inRooms(x, y) ? 0.05 : marsh ? 0.08 : 0.055;
      if (n >= chance) continue;
      const k = tallKind(hash(x, y, 102), { heart, marsh, water: byWater, woods: byWoods });
      standing.push({ sheet: "tall", frame: TALL_DECOR.indexOf(k), x, y, span: 1, scale: 0.9 + hash(x, y, 103) * 0.2, flip, depth: depthOf(y) });
    }
  for (const g of giants) {
    const v = Math.floor(hash(g.x, g.y, 104) * GIANT_VARIANTS);
    const flip = hash(g.x, g.y, 105) < 0.5;
    standing.push({ sheet: "giantTrunk", frame: v, x: g.x, y: g.y + 1, span: 2, scale: 1, flip, depth: depthOf(g.y + 1) });
    standing.push({ sheet: "giantCrown", frame: v, x: g.x, y: g.y + 1, span: 2, scale: 1, flip, depth: depthOf(g.y + 1) + 0.1 });
  }
  if (heartBlock) {
    const hb = { x: heartBlock.x0, y: heartBlock.y1, span: heartBlock.x1 - heartBlock.x0 + 1 };
    standing.push({ sheet: "heartTrunk", frame: 0, ...hb, scale: 1, flip: false, depth: depthOf(hb.y) });
    standing.push({ sheet: "heartGlow", frame: 0, ...hb, scale: 1, flip: false, depth: depthOf(hb.y) + 0.05 });
    standing.push({ sheet: "heartCrown", frame: 0, ...hb, scale: 1, flip: false, depth: depthOf(hb.y) + 0.1 });
  }
  return { variant, atlas, layers, standing };
}

/** Folhas de quadros dos objetos de pé: tamanho do quadro e a pintura de cada um. */
export function standingSheets(variant: ForestVariant) {
  const species = SPECIES[variant];
  const trees = species.flatMap((s) => Array.from({ length: TREE_VARIANTS }, (_, v) => () => tree(variant, s, v + species.indexOf(s) * 5)));
  const memo = <T>(f: () => T) => { let r: T | undefined; return () => (r ??= f()); };
  const treeArt = trees.map(memo);
  const giants = Array.from({ length: GIANT_VARIANTS }, (_, v) => memo(() => giant(variant, v)));
  const heartArt = memo(() => heartTree(variant));
  const stones = Array.from({ length: 6 }, (_, k) => memo(() => stone(variant, k >= 3, k % 3)));
  return {
    trunk: { w: TREE.w, h: TREE.h, frames: treeArt.map((f) => () => f().trunk) },
    crown: { w: TREE.w, h: TREE.h, frames: treeArt.map((f) => () => f().crown) },
    giantTrunk: { w: GIANT.w, h: GIANT.h, frames: giants.map((f) => () => f().trunk) },
    giantCrown: { w: GIANT.w, h: GIANT.h, frames: giants.map((f) => () => f().crown) },
    heartTrunk: { w: HEART.w, h: HEART.h, frames: [() => heartArt().trunk] },
    heartCrown: { w: HEART.w, h: HEART.h, frames: [() => heartArt().crown] },
    heartGlow: { w: HEART.w, h: HEART.h, frames: [() => heartArt().glow] },
    stone: { w: TALL.w, h: TALL.h, frames: stones.map((f) => () => f().image) },
    stoneGlow: { w: TALL.w, h: TALL.h, frames: stones.map((f) => () => f().glow) },
    tall: { w: TALL.w, h: TALL.h, frames: TALL_DECOR.map((k, i) => () => tallDecor(variant, k, i)) },
  } satisfies Record<Standing["sheet"], { w: number; h: number; frames: (() => Uint8ClampedArray)[] }>;
}

/** Espécie da árvore solta do pântano (índice em `SPECIES.marsh`): cipreste, mangue, salgueiro ou morta. */
function marshSpecies(m: number, at: { inWater: boolean; byWater: boolean; byBoss: boolean }) {
  const [cypress, mangrove, willow, dead] = [0, 1, 2, 3];
  if (at.inWater) return m < 0.55 ? cypress : m < 0.88 ? mangrove : dead;
  if (at.byBoss) return m < 0.85 ? cypress : dead;
  if (at.byWater) return m < 0.5 ? willow : m < 0.8 ? cypress : mangrove;
  return m < 0.4 ? cypress : m < 0.68 ? willow : m < 0.86 ? mangrove : dead;
}

/** Enfeite rasteiro conforme o lugar. */
function flatKind(m: number, at: { heart: boolean; marsh: boolean; trail: boolean; woods: boolean; wet: boolean; arena: boolean; room: boolean }): FlatDecor {
  if (at.marsh) {
    // Clareiras dos baús forradas de musgo, folhas, cogumelos e ossos; no resto, o brejo.
    if (at.room) return m < 0.25 ? "moss" : m < 0.5 ? "leaves" : m < 0.68 ? "shrooms" : m < 0.84 ? "twigs" : "bones";
    if (at.arena) return m < 0.5 ? "moss" : m < 0.75 ? "leaves" : "roots";
    if (at.wet) return m < 0.5 ? "moss" : m < 0.8 ? "tracks" : "pebbles";
    const table: [number, FlatDecor][] = at.woods
      ? [[0.3, "leaves"], [0.5, "roots"], [0.65, "moss"], [0.8, "twigs"], [0.92, "shrooms"], [1, "bones"]]
      : [[0.14, "moss"], [0.38, "clover"], [0.58, "leaves"], [0.74, "twigs"], [0.9, "flowers"], [1, "pebbles"]];
    return table.find(([limit]) => m < limit)![1];
  }
  if (at.trail) return m < 0.4 ? "pebbles" : m < 0.75 ? "tracks" : "twigs";
  if (at.wet) return m < 0.5 ? "pebbles" : m < 0.8 ? "moss" : "tracks";
  if (at.arena) return at.heart ? (m < 0.5 ? "shrooms" : "moss") : m < 0.6 ? "flowers" : "clover";
  const table: [number, FlatDecor][] = at.woods
    ? [[0.28, "leaves"], [0.46, "twigs"], [0.6, "roots"], [0.72, "shrooms"], [0.82, at.heart ? "moss" : "cones"], [0.92, "moss"], [1, "pebbles"]]
    : at.heart
      ? [[0.25, "moss"], [0.45, "shrooms"], [0.6, "leaves"], [0.75, "clover"], [0.88, "roots"], [1, "flowers"]]
      : [[0.25, "clover"], [0.5, "flowers"], [0.65, "leaves"], [0.78, "pebbles"], [0.9, "twigs"], [1, "moss"]];
  return table.find(([limit]) => m < limit)![1];
}

/** Enfeite de pé conforme o lugar: capim alto na água, samambaias e arbustos na beira da mata. */
function tallKind(m: number, at: { heart: boolean; marsh: boolean; water: boolean; woods: boolean }): TallDecor {
  if (at.marsh) {
    // Taboa, junco e íris na margem; samambaia, planta-jarro e cogumelos na beira da mata.
    const table: [number, TallDecor][] = at.water
      ? [[0.4, "cattail"], [0.72, "reeds"], [0.9, "iris"], [1, "grass"]]
      : at.woods
        ? [[0.35, "fern"], [0.55, "pitcher"], [0.7, "mushrooms"], [0.82, "stump"], [1, "reeds"]]
        : [[0.3, "grass"], [0.5, "reeds"], [0.65, "iris"], [0.8, "fern"], [0.9, "pitcher"], [1, "bush"]];
    return table.find(([limit]) => m < limit)![1];
  }
  if (at.water) return m < 0.6 ? "grass" : m < 0.85 ? "fern" : "rocks";
  const table: [number, TallDecor][] = at.woods
    ? [[0.38, "fern"], [0.56, "bush"], [0.68, "mushrooms"], [0.78, "stump"], [0.88, "bramble"], [1, at.heart ? "mushrooms" : "foxglove"]]
    : at.heart
      ? [[0.3, "mushrooms"], [0.55, "fern"], [0.72, "grass"], [0.86, "foxglove"], [1, "rocks"]]
      : [[0.3, "grass"], [0.5, "foxglove"], [0.68, "fern"], [0.82, "bush"], [0.92, "rocks"], [1, "stump"]];
  return table.find(([limit]) => m < limit)![1];
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
