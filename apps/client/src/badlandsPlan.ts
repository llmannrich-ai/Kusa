import { TILE_SIZE, Tile, tileAt, tileDistance, type Dungeon } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { HD, TileAtlas } from "./art/paint.ts";
import {
  ADOBE, CAMPFIRE, CART, HOODOO, MINE, OPEN, PATCHES, RIB, SKULL, TALL, TALL_DECOR, adobeWall, blockPiece, bridgeTile, campfire,
  chasmTile, flatDecor, giantSkull, groundTile, hoodoo, mineMouth, oreCart, pairPiece, patchTile, railTile, rib, rockTile, tallDecor,
  trackTile, type FlatDecor, type TallDecor,
} from "./art/badlandsArt.ts";

// O plano dos Ermos Rubros, sem o Phaser: que quadro vai em cada tile de cada camada e que objeto fica de pé onde.
// `badlandsMap.ts` desenha no jogo; o plano também serve ao teste `cenarios`.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const RING = [[0, -1, OPEN.n], [1, 0, OPEN.e], [0, 1, OPEN.s], [-1, 0, OPEN.w], [1, -1, OPEN.ne], [-1, -1, OPEN.nw], [1, 1, OPEN.se], [-1, 1, OPEN.sw]] as const;

/** Camadas de chão, na ordem em que são desenhadas. */
export const BADLANDS_LAYERS = ["chao", "manchas", "ravina", "rastro", "trilhos", "pontes", "enfeites", "rocha"] as const;
export type Layer = (typeof BADLANDS_LAYERS)[number];
/** Atlas de cada camada (um só passaria de 4096 px): o chão e o miúdo, as manchas, a rocha das cristas. */
export const LAYER_ATLAS: Record<Layer, 0 | 1 | 2> = { chao: 0, manchas: 1, ravina: 0, rastro: 0, trilhos: 0, pontes: 0, enfeites: 0, rocha: 2 };

export type Sheet = "hoodoo" | "rib" | "skull" | "adobe" | "mine" | "cart" | "fire" | "tall";
export interface SheetSpec { w: number; h: number; frames: (() => Uint8ClampedArray)[] }
export interface Standing { sheet: Sheet; frame: number; x: number; y: number; span: number; flip: boolean; depth: number; lift?: number }

const HOODOO_VARIANTS = 4;
const ADOBE_VARIANTS = 3;

export const SHEETS: Record<Sheet, SheetSpec> = {
  hoodoo: { ...HOODOO, frames: Array.from({ length: HOODOO_VARIANTS }, (_, v) => () => hoodoo(v)) },
  rib: { ...RIB, frames: [0, 1, 2, 3].map((v) => () => rib(v)) },
  skull: { ...SKULL, frames: [giantSkull] },
  adobe: { ...ADOBE, frames: Array.from({ length: ADOBE_VARIANTS }, (_, v) => () => adobeWall(v)) },
  mine: { ...MINE, frames: [mineMouth] },
  cart: { ...CART, frames: [oreCart] },
  fire: { ...CAMPFIRE, frames: [campfire] },
  tall: { ...TALL, frames: TALL_DECOR.map((k) => () => tallDecor(k, 1)) },
};

/** O plano dos Ermos Rubros: os atlas, o quadro de cada tile em cada camada e os objetos de pé. */
export function planBadlands(d: Dungeon) {
  const b = d.badlands!;
  const W = d.width, H = d.height;
  const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const set = (list: number[]) => { const s = new Uint8Array(W * H); for (const i of list) s[i] = 1; return s; };
  const boards = set(b.boards), rails = set(b.rails), trackSet = set(d.trails ?? []);
  const hoodoos = new Set(b.hoodoos.map((p) => p.y * W + p.x));
  const bones = new Set(b.bones.map((p) => p.y * W + p.x));
  const fires = new Set(b.fires.map((p) => p.y * W + p.x));
  const inSkull = (x: number, y: number) => x >= b.skull.x && y >= b.skull.y && x < b.skull.x + b.skull.w && y < b.skull.y + b.skull.h;
  const has = (s: Uint8Array, x: number, y: number) => inMap(x, y) && s[y * W + x] === 1;
  const rock = (x: number, y: number) => !inMap(x, y) || at(x, y) === Tile.Wall;
  const chasm = (x: number, y: number) => inMap(x, y) && (at(x, y) === Tile.Water || boards[y * W + x] === 1);
  const inCrater = (x: number, y: number) => Math.hypot((x - b.crater.x) / 1.08, y - b.crater.y) <= b.crater.r - 1.5 + hash(x, y, 3) * 1.2;
  const ring = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = 0;
    for (const [dx, dy, bit] of RING) if (test(x + dx, y + dy)) m |= bit;
    return m;
  };
  const edges = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = ring(x, y, test);
    if (m & (OPEN.n | OPEN.e)) m &= ~OPEN.ne;
    if (m & (OPEN.n | OPEN.w)) m &= ~OPEN.nw;
    if (m & (OPEN.s | OPEN.e)) m &= ~OPEN.se;
    if (m & (OPEN.s | OPEN.w)) m &= ~OPEN.sw;
    return m;
  };
  const four = (x: number, y: number, test: (x: number, y: number) => boolean) => ring(x, y, test) & (OPEN.n | OPEN.e | OPEN.s | OPEN.w);
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
      if (inCrater(x, y)) continue;
      const scores = PATCHES.map((_, k) => smooth(x, y, 8, 130 + k) * 0.55 + smooth(x, y, 3, 140 + k) * 0.3 + hash(x, y, 150 + k) * 0.15);
      const k = scores.indexOf(Math.max(...scores));
      if (scores[k] > (k === 1 ? 0.66 : 0.6)) patchOf[y * W + x] = k;
    }
  const patch = (x: number, y: number, k: number) => inMap(x, y) && patchOf[y * W + x] === k;

  const atlases = [new TileAtlas(), new TileAtlas(), new TileAtlas()] as const;
  const layers = Object.fromEntries(BADLANDS_LAYERS.map((l) => [l, new Int32Array(W * H).fill(-1)])) as Record<Layer, Int32Array>;
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
      const q = blockPiece(x, y);
      const scorched = inCrater(x, y);
      put("chao", x, y, `ground${scorched ? "s" : ""}${q}`, () => groundTile(q, scorched));
      if (rock(x, y)) {
        const open = ring(x, y, (a, c) => !rock(a, c));
        const piece = pairPiece(x, y);
        put("rocha", x, y, `rock${open}-${piece}`, () => rockTile(open, piece));
        continue;
      }
      if (chasm(x, y)) {
        const land = edges(x, y, (a, c) => inMap(a, c) && !chasm(a, c));
        const v = land ? 0 : Math.floor(hash(x, y, 4) * 3);
        put("ravina", x, y, `chasm${land}-${v}`, () => chasmTile(land, v));
      }
      if (patchOf[i] >= 0 && !chasm(x, y)) {
        const k = patchOf[i];
        const out = edges(x, y, (a, c) => !patch(a, c, k) || rock(a, c) || chasm(a, c));
        const sides = [OPEN.n, OPEN.e, OPEN.s, OPEN.w].filter((bit) => out & bit).length;
        if (sides < 3) put("manchas", x, y, `patch${k}-${out}`, () => patchTile(PATCHES[k], out));
      }
      if (trackSet[i]) {
        const links = ~edges(x, y, (a, c) => !has(trackSet, a, c)) & 255;
        put("rastro", x, y, `track${links}`, () => trackTile(links));
      }
      if (rails[i]) {
        const links = four(x, y, (a, c) => has(rails, a, c) || (b.mine !== null && a === b.mine.x && c === b.mine.y));
        put("trilhos", x, y, `rail${links}`, () => railTile(links));
      }
      if (boards[i]) {
        const walk = (a: number, c: number) => inMap(a, c) && (boards[c * W + a] === 1 || (!chasm(a, c) && !rock(a, c) && at(a, c) !== Tile.Ruin));
        const links = four(x, y, (a, c) => has(boards, a, c)), ends = four(x, y, (a, c) => walk(a, c) && !has(boards, a, c));
        // A ravina corre de leste a oeste: a ponte quase sempre vai de norte a sul (terra ao norte ou ao sul, ou a ravina dos lados).
        const ns = (ends & (OPEN.n | OPEN.s)) !== 0 || (ends & (OPEN.e | OPEN.w)) === 0;
        put("pontes", x, y, `bridge${links}-${ends}-${ns ? 1 : 0}`, () => bridgeTile(links, ends, ns));
      }

      const flip = hash(x, y, 8) < 0.5;
      if (t === Tile.Ruin) {
        if (inSkull(x, y)) continue;
        if (hoodoos.has(i)) standing.push({ sheet: "hoodoo", frame: Math.floor(hash(x, y, 9) * HOODOO_VARIANTS), x, y, span: 1, flip, depth: depthOf(y), lift: 4 });
        else if (bones.has(i)) {
          let k = 0;
          while (k < 3 && bones.has(i - k - 1)) k++;
          standing.push({ sheet: "rib", frame: k, x, y, span: 1, flip: false, depth: depthOf(y), lift: 2 });
        } else if (inRoom(x, y)) standing.push({ sheet: "adobe", frame: Math.floor(hash(x, y, 10) * ADOBE_VARIANTS), x, y, span: 1, flip, depth: depthOf(y), lift: 2 });
        else standing.push({ sheet: "tall", frame: TALL_DECOR.indexOf("rocks"), x, y, span: 1, flip, depth: depthOf(y) });
        continue;
      }
      if (fires.has(i)) { standing.push({ sheet: "fire", frame: 0, x, y, span: 1, flip: false, depth: depthOf(y) - 6, lift: 4 }); continue; }
      if (t !== Tile.Floor || reserved(x, y) || trackSet[i] || boards[i] || rails[i] || chasm(x, y)) continue;
      const byRock = DIRS.some(([dx, dy]) => rock(x + dx, y + dy));
      const roll = hash(x, y, 13);
      let tall: TallDecor | null = null;
      if (scorched) { if (roll < 0.03) tall = "snag"; }
      else if (byRock && roll < 0.07) tall = (["rocks", "sage", "thorn"] as const)[Math.floor(hash(x, y, 14) * 3)];
      else if (roll < 0.035) tall = (["sage", "sage", "thorn", "agave", "snag", "totem", "flag"] as const)[Math.floor(hash(x, y, 15) * 7)];
      if (tall) { standing.push({ sheet: "tall", frame: TALL_DECOR.indexOf(tall), x, y, span: 1, flip, depth: depthOf(y) }); continue; }
      if (hash(x, y, 16) < 0.05) {
        const m = hash(x, y, 17);
        const table: [number, FlatDecor][] = [[0.3, "pebbles"], [0.48, "bones"], [0.62, "rust"], [0.76, "skull"], [0.88, "wheel"], [1, "pick"]];
        const kind = table.find(([limit]) => m < limit)![1];
        const v = Math.floor(hash(x, y, 18) * 3);
        put("enfeites", x, y, `flat-${kind}-${v}`, () => flatDecor(kind, v));
      }
    }
  standing.push({ sheet: "skull", frame: 0, x: b.skull.x, y: b.skull.y + b.skull.h - 1, span: b.skull.w, flip: false, depth: depthOf(b.skull.y + b.skull.h - 1), lift: 0 });
  if (b.mine) standing.push({ sheet: "mine", frame: 0, x: b.mine.x, y: b.mine.y, span: 1, flip: false, depth: depthOf(b.mine.y), lift: 0 });
  if (b.rails.length) {
    const last = b.rails[b.rails.length - 1];
    standing.push({ sheet: "cart", frame: 0, x: last % W, y: Math.floor(last / W), span: 1, flip: false, depth: depthOf(Math.floor(last / W)) + 0.1, lift: 6 });
  }
  void HD;
  return { atlases, layers, standing };
}
