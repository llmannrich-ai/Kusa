import { TILE_SIZE, Tile, tileAt, tileDistance, type Dungeon } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { HD, TileAtlas } from "./art/paint.ts";
import {
  BRAZIER, HUT, OPEN, PATCHES, SIGIL_TILES, STAKE, STONE, TALL, TALL_DECOR, TREE, arenaSigil, blockPiece, boardTile, brazier,
  deadTree, deadwoodTile, snagPiece, flatDecor, groundTile, monolith, mudTile, patchTile, pavingTile, stakeTile, stiltHut, tallDecor, waterTile,
  type FlatDecor, type TallDecor,
} from "./art/bogArt.ts";

// O plano do Charco Cinzento, sem o Phaser: que quadro vai em cada tile de cada camada e que objeto fica de pé onde.
// `bogMap.ts` desenha no jogo; o plano também serve ao teste `cenarios` (conta os quadros e pinta tudo sem navegador).

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const RING = [[0, -1, OPEN.n], [1, 0, OPEN.e], [0, 1, OPEN.s], [-1, 0, OPEN.w], [1, -1, OPEN.ne], [-1, -1, OPEN.nw], [1, 1, OPEN.se], [-1, 1, OPEN.sw]] as const;

/** Camadas de chão, na ordem em que são desenhadas. */
export const BOG_LAYERS = ["chao", "agua", "mata", "manchas", "lama", "pedra", "tabuas", "enfeites"] as const;
export type Layer = (typeof BOG_LAYERS)[number];
/** Atlas de cada camada: as manchas e as lajes vão num segundo atlas (um só passaria de 4096 px). */
export const LAYER_ATLAS: Record<Layer, 0 | 1 | 2> = { chao: 0, agua: 0, mata: 2, manchas: 1, lama: 0, pedra: 1, tabuas: 0, enfeites: 0 };

/** Folhas dos objetos de pé. */
export type Sheet = "tree" | "stone" | "stoneGlow" | "hut" | "stake" | "brazier" | "tall" | "sigil" | "sigilGlow";
export interface SheetSpec { w: number; h: number; frames: (() => Uint8ClampedArray)[] }
export interface Standing { sheet: Sheet; frame: number; x: number; y: number; span: number; flip: boolean; depth: number; floor?: boolean; lift?: number }

const TREE_VARIANTS = 5;
const STONE_VARIANTS = 4;
const HUT_VARIANTS = 2;
const STAKE_VARIANTS = 4;

let sigilCache: ReturnType<typeof arenaSigil> | null = null;
const sigil = () => (sigilCache ??= arenaSigil());
const stoneCache = new Map<number, ReturnType<typeof monolith>>();
const stoneArt = (v: number) => { let s = stoneCache.get(v); if (!s) { s = monolith(v); stoneCache.set(v, s); } return s; };

export const SHEETS: Record<Sheet, SheetSpec> = {
  tree: { ...TREE, frames: Array.from({ length: TREE_VARIANTS }, (_, v) => () => deadTree(v)) },
  stone: { ...STONE, frames: Array.from({ length: STONE_VARIANTS }, (_, v) => () => stoneArt(v).image) },
  stoneGlow: { ...STONE, frames: Array.from({ length: STONE_VARIANTS }, (_, v) => () => stoneArt(v).glow) },
  hut: { ...HUT, frames: Array.from({ length: HUT_VARIANTS }, (_, v) => () => stiltHut(v)) },
  stake: { ...STAKE, frames: Array.from({ length: STAKE_VARIANTS }, (_, v) => () => stakeTile(v)) },
  brazier: { ...BRAZIER, frames: [brazier] },
  tall: { ...TALL, frames: TALL_DECOR.map((k) => () => tallDecor(k, 0)) },
  sigil: { w: HD * SIGIL_TILES, h: HD * SIGIL_TILES, frames: [() => sigil().image] },
  sigilGlow: { w: HD * SIGIL_TILES, h: HD * SIGIL_TILES, frames: [() => sigil().glow] },
};

/**
 * O plano do Charco Cinzento, sem o Phaser: o atlas com os quadros que o mapa usa, o quadro de cada tile em cada camada e
 * os objetos de pé.
 */
export function planBog(d: Dungeon) {
  const b = d.bog!;
  const W = d.width, H = d.height;
  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const set = (list: number[]) => { const s = new Uint8Array(W * H); for (const i of list) s[i] = 1; return s; };
  const boards = set(b.boards), causeway = set(b.causeway), trailSet = set(d.trails ?? []);
  const hutCell = new Uint8Array(W * H);
  for (const h of b.huts) for (let y = h.y; y < h.y + h.h; y++) for (let x = h.x; x < h.x + h.w; x++) hutCell[y * W + x] = 1;
  const stones = new Set(b.stones.map((p) => p.y * W + p.x));
  const fires = new Set(b.fires.map((p) => p.y * W + p.x));
  const has = (s: Uint8Array, x: number, y: number) => inMap(x, y) && s[y * W + x] === 1;
  const wall = (x: number, y: number) => !inMap(x, y) || at(x, y) === Tile.Wall;
  const lone = (x: number, y: number) => inMap(x, y) && at(x, y) === Tile.Wall && x > 0 && y > 0 && x < W - 1 && y < H - 1 && DIRS.every(([dx, dy]) => !wall(x + dx, y + dy));
  /** Mata fechada (fora do mapa também). */
  const wood = (x: number, y: number) => wall(x, y) && !lone(x, y);
  /** Água por baixo: a poça, a passarela e as palafitas. */
  const wet = (x: number, y: number) => inMap(x, y) && (at(x, y) === Tile.Water || boards[y * W + x] === 1 || hutCell[y * W + x] === 1);
  /** A praça de lajes no meio da ilha da arena (em volta, a turfa da ilha). */
  const inArena = (x: number, y: number) => Math.hypot((x - b.arena.x) / 1.08, y - b.arena.y) <= 3.9 + hash(x, y, 4) * 0.7;
  const paved = (x: number, y: number) => inMap(x, y) && !wet(x, y) && at(x, y) !== Tile.Wall && (causeway[y * W + x] === 1 || inArena(x, y));
  const ring = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = 0;
    for (const [dx, dy, bit] of RING) if (test(x + dx, y + dy)) m |= bit;
    return m;
  };
  /** O anel sem a quina que já tem um dos lados marcado (para o que só pinta dentro do tile: menos quadros). */
  const edges = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = ring(x, y, test);
    if (m & (OPEN.n | OPEN.e)) m &= ~OPEN.ne;
    if (m & (OPEN.n | OPEN.w)) m &= ~OPEN.nw;
    if (m & (OPEN.s | OPEN.e)) m &= ~OPEN.se;
    if (m & (OPEN.s | OPEN.w)) m &= ~OPEN.sw;
    return m;
  };
  // Manchas pelo mapa inteiro (ruído suave em coordenada de mundo, não em bloco: não repetem).
  const smooth = (x: number, y: number, cell: number, seed: number) => {
    const gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x / cell - gx, fy = y / cell - gy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = hash(gx, gy, seed) + (hash(gx + 1, gy, seed) - hash(gx, gy, seed)) * sx;
    const bottom = hash(gx, gy + 1, seed) + (hash(gx + 1, gy + 1, seed) - hash(gx, gy + 1, seed)) * sx;
    return top + (bottom - top) * sy;
  };
  const patchOf = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const scores = PATCHES.map((_, k) => smooth(x, y, 8, 30 + k) * 0.55 + smooth(x, y, 3, 40 + k) * 0.3 + hash(x, y, 50 + k) * 0.15);
      const k = scores.indexOf(Math.max(...scores));
      if (scores[k] > (k === 2 ? 0.66 : 0.6)) patchOf[y * W + x] = k;
    }
  const patch = (x: number, y: number, k: number) => inMap(x, y) && patchOf[y * W + x] === k;
  const four = (x: number, y: number, test: (x: number, y: number) => boolean) => ring(x, y, test) & (OPEN.n | OPEN.e | OPEN.s | OPEN.w);

  const atlases = [new TileAtlas(), new TileAtlas(), new TileAtlas()] as const;
  const layers = Object.fromEntries(BOG_LAYERS.map((l) => [l, new Int32Array(W * H).fill(-1)])) as Record<Layer, Int32Array>;
  const put = (layer: Layer, x: number, y: number, key: string, paint: () => Uint8ClampedArray) => { layers[layer][y * W + x] = atlases[LAYER_ATLAS[layer]].frame(key, paint); };
  const standing: Standing[] = [];
  const depthOf = (y: number) => (y + 1) * TILE_SIZE - 0.25;
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1 || d.side.some((r) => x >= r.x + 1 && y >= r.y + 1 && x <= r.x + 3 && y <= r.y + 2)
    || tileDistance(x, y, d.bossPortal.x, d.bossPortal.y) <= 2 || fires.has(y * W + x);
  const inRoom = (x: number, y: number) => d.side.some((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = at(x, y);
      const i = y * W + x;
      // Chão de baixo: mata, água ou turfa.
      if (wood(x, y)) {
        const open = ring(x, y, (a, c) => !wood(a, c));
        const piece = snagPiece(x, y);
        put("mata", x, y, `wood${open}-${piece}`, () => deadwoodTile(open, 0, piece));
      }
      const gq = blockPiece(x, y);
      if (wet(x, y)) {
        const land = edges(x, y, (a, c) => inMap(a, c) && !wet(a, c));
        const q = land ? 0 : gq;
        // A água recua da beira do tile: a turfa de baixo aparece na margem.
        if (land) put("chao", x, y, `ground${gq}`, () => groundTile(gq));
        put(land ? "agua" : "chao", x, y, `water${land}-${q}`, () => waterTile(land, q));
      } else put("chao", x, y, `ground${gq}`, () => groundTile(gq));
      if (patchOf[i] >= 0 && !wood(x, y) && !wet(x, y)) {
        const k = patchOf[i];
        const out = edges(x, y, (a, c) => !patch(a, c, k) || wood(a, c) || wet(a, c));
        // Mancha de um tile só (aberta em 3 lados ou mais) não fica: sumiria quase toda na beira.
        const sides = [OPEN.n, OPEN.e, OPEN.s, OPEN.w].filter((b) => out & b).length;
        if (sides < 3) put("manchas", x, y, `patch${k}-${out}`, () => patchTile(PATCHES[k], out));
      }
      // Estrada e ilha da arena.
      if (paved(x, y)) {
        const open = edges(x, y, (a, c) => !paved(a, c));
        const arena = inArena(x, y);
        // A praça da arena num bloco de 4×4 tiles; a estrada (muito mais tiles de beira) num de 2×2.
        const v = arena ? blockPiece(x, y) : (x & 1) + (y & 1) * 2;
        put("pedra", x, y, `pave${arena ? "a" : "c"}${open}-${v}`, () => pavingTile(open, v, arena, arena ? 4 : 2));
      }
      // Lama da trilha, ligada às vizinhas e à estrada e passarelas.
      if (trailSet[i] && !paved(x, y)) {
        const joins = (a: number, c: number) => has(trailSet, a, c) && !paved(a, c);
        const links = ~edges(x, y, (a, c) => !joins(a, c)) & 255;
        put("lama", x, y, `mud${links}`, () => mudTile(links));
      }
      // Passarela.
      if (boards[i]) {
        const walk = (a: number, c: number) => inMap(a, c) && (boards[c * W + a] === 1 || (!wet(a, c) && at(a, c) !== Tile.Wall && at(a, c) !== Tile.Ruin));
        const links = four(x, y, walk);
        const ends = four(x, y, (a, c) => walk(a, c) && !has(boards, a, c));
        put("tabuas", x, y, `board${links}-${ends}`, () => boardTile(links, ends, 0));
      }

      // De pé.
      const flip = hash(x, y, 8) < 0.5;
      if (lone(x, y)) {
        const v = hash(x, y, 9) < 0.08 ? 4 : hash(x, y, 9) < 0.18 ? 3 : Math.floor(hash(x, y, 10) * 3);
        standing.push({ sheet: "tree", frame: v, x, y, span: 1, flip, depth: depthOf(y) });
        continue;
      }
      if (t === Tile.Ruin && !hutCell[i]) {
        if (stones.has(i)) {
          const v = Math.floor(hash(x, y, 11) * STONE_VARIANTS);
          standing.push({ sheet: "stone", frame: v, x, y, span: 1, flip: false, depth: depthOf(y), lift: 4 });
          standing.push({ sheet: "stoneGlow", frame: v, x, y, span: 1, flip: false, depth: depthOf(y) + 0.05, lift: 4 });
        } else if (inRoom(x, y)) {
          standing.push({ sheet: "stake", frame: Math.floor(hash(x, y, 12) * STAKE_VARIANTS), x, y, span: 1, flip, depth: depthOf(y), lift: 2 });
        } else standing.push({ sheet: "tall", frame: TALL_DECOR.indexOf("cairn"), x, y, span: 1, flip, depth: depthOf(y) });
        continue;
      }
      if (fires.has(i)) { standing.push({ sheet: "brazier", frame: 0, x, y, span: 1, flip: false, depth: depthOf(y) - 6, lift: 8 }); continue; }
      if (t === Tile.Floor && trailSet[i] && !reserved(x, y) && !paved(x, y) && hash(x, y, 25) < 0.07) {
        const v = Math.floor(hash(x, y, 26) * 3);
        put("enfeites", x, y, `flat-puddle-${v}`, () => flatDecor("puddle", v));
      }
      if (t !== Tile.Floor || reserved(x, y) || trailSet[i] || boards[i] || paved(x, y)) continue;
      // Enfeites: de pé na beira d'água e da mata, deitados no meio da turfa.
      const byWater = DIRS.some(([dx, dy]) => inMap(x + dx, y + dy) && at(x + dx, y + dy) === Tile.Water);
      const byWood = DIRS.some(([dx, dy]) => wood(x + dx, y + dy));
      const roll = hash(x, y, 13);
      let tall: TallDecor | null = null;
      if (byWater && roll < 0.22) tall = hash(x, y, 14) < 0.7 ? "reeds" : "cotton";
      else if (byWood && roll < 0.08) tall = hash(x, y, 14) < 0.6 ? "bush" : "stump";
      else if (roll < 0.018) tall = (["cotton", "bush", "stump", "peat", "post"] as const)[Math.floor(hash(x, y, 15) * 5)];
      if (tall) {
        standing.push({ sheet: "tall", frame: TALL_DECOR.indexOf(tall), x, y, span: 1, flip, depth: depthOf(y) });
        continue;
      }
      const flatRoll = hash(x, y, 16);
      if (flatRoll < 0.06) {
        const m = hash(x, y, 17);
        const table: [number, FlatDecor][] = [[0.24, "puddle"], [0.42, "bones"], [0.56, "shrooms"], [0.72, "char"], [0.84, "feathers"], [0.94, "skull"], [1, "rib"]];
        const kind = table.find(([limit]) => m < limit)![1];
        const v = Math.floor(hash(x, y, 18) * 3);
        put("enfeites", x, y, `flat-${kind}-${v}`, () => flatDecor(kind, v));
      }
    }
  // Palafitas (2×2): o pé no meio das duas colunas de baixo.
  for (const h of b.huts) standing.push({ sheet: "hut", frame: Math.floor(hash(h.x, h.y, 19) * HUT_VARIANTS), x: h.x, y: h.y + 1, span: 2, flip: hash(h.x, h.y, 20) < 0.5, depth: depthOf(h.y + 1), lift: 6 });
  // O círculo entalhado da ilha da arena, deitado.
  const half = SIGIL_TILES >> 1;
  standing.push({ sheet: "sigil", frame: 0, x: b.arena.x - half, y: b.arena.y + half, span: SIGIL_TILES, flip: false, depth: 0, floor: true, lift: 0 });
  standing.push({ sheet: "sigilGlow", frame: 0, x: b.arena.x - half, y: b.arena.y + half, span: SIGIL_TILES, flip: false, depth: 0, floor: true, lift: 0 });
  return { atlases, layers, standing };
}

