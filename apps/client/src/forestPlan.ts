import { TILE_SIZE, Tile, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { TileAtlas } from "./art/paint.ts";
import {
  GIANT, HEART, OPEN, SPECIES, TALL, TALL_DECOR, TREE, boardTile, bridgeTile, canopyTile, dirtTile, draw, flatDecor, giant,
  heartTree, logTile, mudEdge, stone, tallDecor, tree, wallTile, waterTile, wetPiece,
  type FlatDecor, type ForestVariant, type TallDecor,
} from "./art/forestArt.ts";
import {
  BLOCK, COLUMN, MOSAIC_TILES, SMALL, WALL_HEIGHTS, WALL_LINK, WALL_SPRITE, pavingFringe, pavingTile, ruinColumn, ruinFlat,
  ruinMosaic, ruinRubble, ruinSmall, ruinWall, type ColumnKind, type FlatDecor as RuinFlat, type SmallDecor,
} from "./art/swampArt.ts";

// O plano do Bosque Velho, do Coração da Mata e dos dois pântanos, sem o Phaser: que quadro vai em cada tile de cada
// camada e que objeto fica de pé onde. `forestMap.ts` desenha no jogo; o plano também serve para prévias fora do
// navegador. O pântano é a mesma mata, alagada: passarelas em vez de pontes, árvores dentro d'água.
// O Pântano das Ruínas tem, no lugar dos troncos, o que resta do império afundado (`art/swampArt.ts`): lajes, muros,
// colunas, entulho e o mosaico da arena.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const RING = [[0, -1, OPEN.n], [1, 0, OPEN.e], [0, 1, OPEN.s], [-1, 0, OPEN.w], [1, -1, OPEN.ne], [-1, -1, OPEN.nw], [1, 1, OPEN.se], [-1, 1, OPEN.sw]] as const;

/** Variações de cada chão: metade dos tiles usa a primeira, o resto se espalha. */
const WATER_VARIANTS = 2;
const TREE_VARIANTS = 3;
const GIANT_VARIANTS = 2;
const CANOPY_VARIANTS = 4;

/** Camadas de chão, na ordem em que são desenhadas. */
export const LAYERS = ["chao", "trilha", "barro", "folhas", "sombra", "relevo", "enfeites"] as const;
export type Layer = (typeof LAYERS)[number];

/** Folhas fixas de cada variante (`standingSheets`); as ruínas do pântano vêm em folhas montadas pelo plano. */
export type FixedSheet = "trunk" | "crown" | "giantTrunk" | "giantCrown" | "heartTrunk" | "heartCrown" | "heartGlow" | "stone" | "stoneGlow" | "tall";
/** Folha de quadros: tamanho do quadro e a pintura de cada um. */
export interface SheetSpec { w: number; h: number; frames: (() => Uint8ClampedArray)[] }

/** Objeto de pé: `sheet` é a folha de quadros, `x` e `y` o tile da base (o pé do quadro fica no meio da base). */
export interface Standing {
  sheet: FixedSheet | RuinSheet;
  frame: number;
  x: number;
  y: number;
  /** Largura da base em tiles (a árvore anciã tem 2; a do coração, 3). */
  span: number;
  scale: number;
  flip: boolean;
  depth: number;
  /** Deitado no chão (o mosaico): fica logo acima das camadas de chão, abaixo de todo o resto. */
  floor?: boolean;
  /** Quantos px (de jogo) o pé sobe acima da linha de baixo do tile; 2 se não disser (as árvores). */
  lift?: number;
}

type RuinSheet = "ruinWall" | "ruinColumn" | "ruinBlock" | "ruinSmall" | "ruinMosaic";

/**
 * O que o mapa desenha, sem o Phaser (para o jogo e para prévias): o atlas com os quadros que o mapa usa, o quadro de
 * cada tile em cada camada e os objetos de pé.
 */
export function planForest(d: Dungeon) {
  const variant: ForestVariant = d.mapId === "heartwood" ? "heartwood" : d.mapId === "marsh" ? "marsh" : d.mapId === "swamp" ? "swamp" : "oldwood";
  const heart = variant === "heartwood";
  /** As duas matas alagadas (o Kosaradius e o Pântano das Ruínas) seguem as mesmas regras de água e de árvore. */
  const marsh = variant === "marsh" || variant === "swamp";
  const ruins = variant === "swamp";
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

  // Lajes (Pântano das Ruínas): as salas inteiras, uma beirada irregular em volta delas e o chão em volta dos restos de
  // muro pelo campo. Laje solta no capim (sem duas vizinhas de laje) não fica.
  const pavedSet = new Uint8Array(W * H);
  if (ruins) {
    const rooms = [d.boss, ...d.side];
    const inRoom = (x: number, y: number) => rooms.some((r) => inRect(r, x, y));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = at(x, y);
        if (t !== Tile.Floor && t !== Tile.Ruin && t !== Tile.Portal) continue;
        if (inRoom(x, y)) { pavedSet[y * W + x] = 1; continue; }
        const spill = rooms.some((r) => inRect({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }, x, y)) && hash(x, y, 80) < 0.45;
        let ruinNear = 3;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) if (ruin(x + dx, y + dy) && !inRoom(x + dx, y + dy)) ruinNear = Math.min(ruinNear, Math.max(Math.abs(dx), Math.abs(dy)));
        const byWater = DIRS.some(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
        if (spill || ruinNear === 0 || (ruinNear === 1 && hash(x, y, 81) < 0.8) || (ruinNear === 2 && !byWater && hash(x, y, 82) < 0.35)) pavedSet[y * W + x] = 1;
      }
    const spare = pavedSet.slice();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!spare[i] || ruin(x, y) || inRoom(x, y)) continue;
        if (DIRS.filter(([dx, dy]) => inMap(x + dx, y + dy) && spare[(y + dy) * W + x + dx]).length < 2) pavedSet[i] = 0;
      }
  }
  const paved = (x: number, y: number) => inMap(x, y) && pavedSet[y * W + x] === 1;
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
  /** Tiles cobertos pelo mosaico da arena (Pântano das Ruínas). */
  const onMosaic = (x: number, y: number) => ruins && Math.abs(x - arenaCenter.x) <= (MOSAIC_TILES.w >> 1) && y - arenaCenter.y >= -(MOSAIC_TILES.h >> 1) && y - arenaCenter.y <= MOSAIC_TILES.h >> 1;
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
        if (!land) {
          const q = wetPiece(x, y);
          put("chao", x, y, `pool${q}`, () => waterTile(variant, 0, q, q).render(false));
        } else {
          const v = pick(x, y, 2, 5);
          put("chao", x, y, `water${land}-${v}`, () => waterTile(variant, land, v).render(false));
        }
      } else if (t === Tile.Water && !onBridge(x, y)) {
        const land = edges(x, y, (a, b) => !water(a, b));
        const v = pick(x, y, WATER_VARIANTS, 5);
        put("chao", x, y, `water${land}-${v}`, () => waterTile(variant, land, v).render(false));
      } else if (marsh) {
        // Pântanos: o capim contínuo em blocos de 4×4 tiles (também na clareira do boss), sem tinta por tile.
        const q = wetPiece(x, y);
        put("chao", x, y, `wgrass${q}`, draw.wetGrass(variant, q));
      } else {
        // Bosque Velho e Coração da Mata: o mesmo capim em blocos contínuos de 4×4 tiles, também na arena.
        const q = wetPiece(x, y);
        if (inArena(x, y)) put("chao", x, y, `barena${q}`, draw.blockArena(variant, q));
        else put("chao", x, y, `wgrass${q}`, draw.wetGrass(variant, q));
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
      if (paved(x, y)) {
        // Lajes do império (calçamento de 2×2 tiles) e o capim invadindo a beira.
        const q = (x & 1) + 2 * (y & 1);
        put("trilha", x, y, `paving${q}`, () => pavingTile(q));
        const grass = edges(x, y, (a, b) => inMap(a, b) && !paved(a, b) && at(a, b) !== Tile.Water && !forest(a, b) && !wetTree[b * W + a]);
        if (grass) put("folhas", x, y, `fringe${grass}`, () => pavingFringe(grass));
      }
      if (t === Tile.Ruin && !lone(x, y, ruin) && !ruins) {
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
      const wet = edges(x, y, (a, b) => at(a, b) === Tile.Water && !onBridge(a, b));
      if (wet) put("barro", x, y, `mud${wet}`, () => mudEdge(variant, wet).render(false));
      // Sem folhas secas nem sombra na beira da mata: as duas seguiam a linha do tile, e a copa termina antes dela;
      // ficavam uma faixa reta e uma fileira de folhas no capim. A copa já tem a sombra dela (o sub-bosque).

      // Enfeites rasteiros: poucos, em grupos perto da mata, dos troncos e das salas.
      if (kind[i] || reserved(x, y) || t === Tile.Portal) continue;
      if (fairy.has(i)) {
        put("enfeites", x, y, `flat-shrooms-${i % 3}`, () => flatDecor(variant, "shrooms", i % 3).render(true));
        continue;
      }
      if (paved(x, y)) {
        // Lajes: rachaduras, cacos, tesselas, inscrições, poças e ervas nas juntas; mais no pé dos muros.
        if (onMosaic(x, y)) continue;
        const byRuin = DIRS.some(([dx, dy]) => ruin(x + dx, y + dy));
        if (hash(x, y, 91) >= (byRuin ? 0.32 : 0.16)) continue;
        const k = ruinFlatKind(hash(x, y, 92), byRuin);
        const v = Math.floor(hash(x, y, 93) * 3);
        put("enfeites", x, y, `ruin-${k}-${v}`, () => ruinFlat(k, v));
        continue;
      }
      const n = hash(x, y, 91);
      const byWoods = near(x, y, 1, forest);
      // Nos pântanos, poucos enfeites rasteiros (muitos viravam um confete pelo chão), mais nas clareiras dos baús.
      // Poucos enfeites rasteiros (muitos viravam um confete pelo chão), mais nas clareiras e salas.
      const chance = inRooms(x, y) ? (marsh ? 0.22 : 0.14) : trail(x, y) ? 0.03 : byWoods ? 0.06 : 0.035;
      if (n >= chance) continue;
      const k = flatKind(hash(x, y, 92), { heart, marsh, trail: trail(x, y), woods: byWoods, wet: wet !== 0, arena: inArena(x, y), room: inRooms(x, y) });
      const v = Math.floor(hash(x, y, 93) * 3);
      put("enfeites", x, y, `flat-${k}-${v}`, () => flatDecor(variant, k, v).render(true));
    }

  // --- De pé ------------------------------------------------------------------------------
  const standing: Standing[] = [];
  // Folhas das ruínas, montadas com os quadros que o mapa usa (as combinações de muro são muitas).
  const ruinSheets: Record<RuinSheet, SheetSpec & { keys: Map<string, number> }> = {
    ruinWall: { ...WALL_SPRITE, frames: [], keys: new Map() },
    ruinColumn: { ...COLUMN, frames: [], keys: new Map() },
    ruinBlock: { ...BLOCK, frames: [], keys: new Map() },
    ruinSmall: { ...SMALL, frames: [], keys: new Map() },
    ruinMosaic: { w: MOSAIC_TILES.w * 128, h: MOSAIC_TILES.h * 128, frames: [], keys: new Map() },
  };
  const ruinFrame = (sheet: RuinSheet, key: string, paint: () => Uint8ClampedArray) => {
    const s = ruinSheets[sheet];
    let i = s.keys.get(key);
    if (i === undefined) { i = s.frames.length; s.keys.set(key, i); s.frames.push(paint); }
    return i;
  };
  const putRuin = (sheet: RuinSheet, key: string, paint: () => Uint8ClampedArray, x: number, y: number, flip = false) =>
    standing.push({ sheet, frame: ruinFrame(sheet, key, paint), x, y, span: 1, scale: 1, flip, depth: depthOf(y), lift: 0 });
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
      if (ruins && at(x, y) === Tile.Ruin) {
        if (!lone(x, y, ruin)) {
          // Muro: liga nos vizinhos que também são muro; a altura muda por trecho (3 tiles), com degrau aqui e ali.
          const links = (ruin(x, y - 1) ? WALL_LINK.n : 0) | (ruin(x + 1, y) ? WALL_LINK.e : 0) | (ruin(x, y + 1) ? WALL_LINK.s : 0) | (ruin(x - 1, y) ? WALL_LINK.w : 0);
          const height = (a: number, b: number) => WALL_HEIGHTS[Math.floor(hash(Math.floor(a / 3), Math.floor(b / 3), 41) * WALL_HEIGHTS.length)];
          const h = height(x, y);
          const step = links & WALL_LINK.s ? Math.max(0, h - height(x, y + 1)) : 0;
          const vn = hash(Math.floor(x / 3), Math.floor(y / 3), 60);
          const v = vn < 0.45 ? 0 : vn < 0.85 ? 1 : 2;
          putRuin("ruinWall", `${links}-${h}-${step}-${v}`, () => ruinWall(links, h, step, v), x, y);
          continue;
        }
        // Pedra solta: coluna inteira na arena, quebrada nas salas e, pelo campo, quebrada, toco ou entulho.
        const m = hash(x, y, 55);
        const v = Math.floor(hash(x, y, 56) * 3);
        if (inArena(x, y) || inRooms(x, y) || m < 0.6) {
          const kind: ColumnKind = inArena(x, y) ? (m < 0.5 ? "ionic" : "corinthian") : inRooms(x, y) ? (m < 0.7 ? "broken" : "ionic") : m < 0.35 ? "broken" : "stump";
          putRuin("ruinColumn", `${kind}${v}`, () => ruinColumn(kind, v), x, y);
        } else putRuin("ruinBlock", `b${v}`, () => ruinRubble(v), x, y, flip);
        continue;
      }
      if (ruins && at(x, y) === Tile.Water && !wetTree[i] && hash(x, y, 19) < (near(x, y, 3, paved) ? 0.08 : 0.02)) {
        // Ruínas dentro d'água: blocos meio afundados e tocos de coluna.
        const v = Math.floor(hash(x, y, 20) * 3);
        if (hash(x, y, 21) < 0.5) putRuin("ruinBlock", `u${v}`, () => ruinRubble(v, true), x, y, flip);
        else putRuin("ruinColumn", `stump${v}`, () => ruinColumn("stump", v), x, y);
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
      if (t !== Tile.Floor || kind[i] || reserved(x, y) || layers.enfeites[i] >= 0 || trail(x, y) || onBridge(x, y)) continue;
      if (paved(x, y)) {
        // De pé nas lajes: tambor de coluna, cabeça de estátua, urnas, ânfora ou acanto na fresta; nunca no mosaico nem
        // perto dos baús.
        if (onMosaic(x, y) || d.side.some((r) => tileDistance(x, y, r.x + 1, r.y + 1) <= 1) || hash(x, y, 101) >= (inRooms(x, y) ? 0.06 : 0.1)) continue;
        const m = hash(x, y, 102);
        const kind: SmallDecor = m < 0.3 ? "head" : m < 0.55 ? "urns" : m < 0.75 ? "amphora" : "acanthus";
        const v = Math.floor(hash(x, y, 103) * 2);
        putRuin("ruinSmall", `${kind}${v}`, () => ruinSmall(kind, v), x, y, flip);
        continue;
      }
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
  if (ruins) {
    // O mosaico do chão da arena, no meio dela.
    const frame = ruinFrame("ruinMosaic", "m", ruinMosaic);
    standing.push({ sheet: "ruinMosaic", frame, x: arenaCenter.x - (MOSAIC_TILES.w >> 1), y: arenaCenter.y + (MOSAIC_TILES.h >> 1), span: MOSAIC_TILES.w, scale: 1, flip: false, depth: 0, floor: true, lift: 0 });
  }
  if (heartBlock) {
    const hb = { x: heartBlock.x0, y: heartBlock.y1, span: heartBlock.x1 - heartBlock.x0 + 1 };
    standing.push({ sheet: "heartTrunk", frame: 0, ...hb, scale: 1, flip: false, depth: depthOf(hb.y) });
    standing.push({ sheet: "heartGlow", frame: 0, ...hb, scale: 1, flip: false, depth: depthOf(hb.y) + 0.05 });
    standing.push({ sheet: "heartCrown", frame: 0, ...hb, scale: 1, flip: false, depth: depthOf(hb.y) + 0.1 });
  }
  const extraSheets = Object.fromEntries(Object.entries(ruinSheets).map(([k, s]) => [k, { w: s.w, h: s.h, frames: s.frames }])) as Record<RuinSheet, SheetSpec>;
  return { variant, atlas, layers, standing, extraSheets };
}

/** Enfeite rasteiro das lajes; no pé dos muros, mais entulho e erva. */
function ruinFlatKind(m: number, byRuin: boolean): RuinFlat {
  const table: [number, RuinFlat][] = byRuin
    ? [[0.35, "stones"], [0.6, "shards"], [0.8, "weeds"], [0.9, "leaves"], [1, "dust"]]
    : [[0.16, "shards"], [0.3, "tesserae"], [0.42, "weeds"], [0.54, "puddle"], [0.64, "inscription"], [0.74, "leaves"], [0.82, "drum"], [0.9, "bones"], [0.96, "skull"], [1, "stones"]];
  return table.find(([limit]) => m < limit)![1];
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
  } satisfies Record<FixedSheet, { w: number; h: number; frames: (() => Uint8ClampedArray)[] }>;
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
