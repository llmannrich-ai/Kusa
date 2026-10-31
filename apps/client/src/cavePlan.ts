import { TILE_SIZE, Tile, lairsOf, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { TileAtlas } from "./art/paint.ts";
import { shadeEdge } from "./art/empireArt.ts";
import { OPEN, TALL_DECOR, blockPiece, flatDecor, floorTile, poolTile, rockTile, type CaveVariant, type FlatDecor, type TallDecor } from "./art/caveArt.ts";

// O plano de uma caverna no padrão novo (128 px por tile), sem o Phaser: o quadro de cada tile em cada camada, os
// enfeites de pé e as luzes. Serve à Caverna da Travessia (o mapa inteiro) e, depois, ao subterrâneo do Mar de Areia
// (`area`). `cavernMap.ts` desenha no jogo; o teste `cenarios` usa o plano para conferir o tamanho do atlas.

const RING = [[0, -1, OPEN.n], [1, 0, OPEN.e], [0, 1, OPEN.s], [-1, 0, OPEN.w], [1, -1, OPEN.ne], [-1, -1, OPEN.nw], [1, 1, OPEN.se], [-1, 1, OPEN.sw]] as const;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const ROCK_VARIANTS = 3;

export const CAVE_LAYERS = ["chao", "sombra", "enfeites"] as const;
export type CaveLayer = (typeof CAVE_LAYERS)[number];

/** Enfeite de pé: quadro `kind` da folha de enfeites, base no tile (x, y). */
export interface CaveStanding { kind: TallDecor; v: number; x: number; y: number; flip: boolean; scale: number }
/** Brilho (cristal, covil, poço de luz): centro em px de jogo, tamanho em múltiplos do brilho antigo (96 px). */
export interface CaveLight { x: number; y: number; scale: number; alpha: number; tint: number }

/** Cores dos brilhos de cada caverna: cristais, os dois covis e a luz do poço de entrada. */
const GLOW: Record<CaveVariant, { crystal: number; lairs: number[]; entry: number }> = {
  cavern: { crystal: 0x8fe3ff, lairs: [0xb7e39a, 0xd7a6ff], entry: 0xcfe8ff },
  desert: { crystal: 0xffc070, lairs: [0xffd27a], entry: 0xfff0c8 },
};

export function planCave(d: Dungeon, variant: CaveVariant, area: Rect = { x: 0, y: 0, w: d.width, h: d.height }) {
  const W = d.width;
  const inArea = (x: number, y: number) => x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;
  const at = (x: number, y: number) => tileAt(d, x, y);
  /** Rocha: parede que não é pilar solto; fora da área também conta como rocha. */
  const rock = (x: number, y: number) => !inArea(x, y) || (at(x, y) === Tile.Wall && !pillar(d, x, y));
  const water = (x: number, y: number) => inArea(x, y) && at(x, y) === Tile.Water;
  const ring = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = 0;
    for (const [dx, dy, bit] of RING) if (test(x + dx, y + dy)) m |= bit;
    return m;
  };
  const pick = (x: number, y: number, count: number, seed: number) => {
    const n = hash(x, y, seed);
    return n < 0.5 ? 0 : 1 + Math.floor((n - 0.5) * 2 * (count - 1));
  };
  const lairs = d.lairs ? lairsOf(d) : [];
  const lairOf = (x: number, y: number) => lairs.findIndex((l) => inRect(l.room, x, y));
  const portals = new Set(lairs.map((l) => l.portal.y * W + l.portal.x));
  const glow = GLOW[variant];

  const atlas = new TileAtlas();
  const layers = Object.fromEntries(CAVE_LAYERS.map((l) => [l, new Int32Array(W * d.height).fill(-1)])) as Record<CaveLayer, Int32Array>;
  const put = (layer: CaveLayer, x: number, y: number, key: string, paint: () => Uint8ClampedArray) => { layers[layer][y * W + x] = atlas.frame(key, paint); };
  const standing: CaveStanding[] = [];
  const lights: CaveLight[] = [];
  const tall = (kind: TallDecor, x: number, y: number, scale = 1) =>
    standing.push({ kind, v: Math.floor(hash(x, y, 198) * 3), x, y, flip: hash(x, y, 191) < 0.5, scale });

  for (let y = area.y; y < area.y + area.h; y++)
    for (let x = area.x; x < area.x + area.w; x++) {
      const i = y * W + x;
      const t = at(x, y);
      if (rock(x, y)) {
        const open = ring(x, y, (a, b) => !rock(a, b));
        // A massa funda é um pedaço do bloco contínuo; a beira (com paredão) tem as variações dela.
        const v = open ? pick(x, y, ROCK_VARIANTS, 192) : blockPiece(x, y);
        put("chao", x, y, `rock${open}-${v}`, () => rockTile(variant, open, v));
        continue;
      }
      if (t === Tile.Water) {
        let land = 0;
        for (const [dx, dy, bit] of RING) if (!water(x + dx, y + dy)) land |= bit;
        if (land & (OPEN.n | OPEN.e)) land &= ~OPEN.ne;
        if (land & (OPEN.n | OPEN.w)) land &= ~OPEN.nw;
        if (land & (OPEN.s | OPEN.e)) land &= ~OPEN.se;
        if (land & (OPEN.s | OPEN.w)) land &= ~OPEN.sw;
        const v = pick(x, y, 2, 194);
        put("chao", x, y, `pool${land}-${v}`, () => poolTile(variant, land, v));
        continue;
      }
      const lair = lairOf(x, y);
      const v = blockPiece(x, y);
      const hall = lair >= 0;
      put("chao", x, y, `floor${hall ? "h" : ""}${v}`, () => floorTile(variant, v, hall));
      const shade = ring(x, y, rock) & (OPEN.n | OPEN.w | OPEN.nw);
      if (shade) put("sombra", x, y, `shade${shade}`, () => shadeEdge(shade, 44, [0, 0, 0]));

      if (pillar(d, x, y)) { tall("stalagmite", x, y, 1.1); continue; }
      if (t === Tile.Portal || portals.has(i)) continue;
      const decor = (kind: FlatDecor) => { const dv = Math.floor(hash(x, y, 199) * 3); put("enfeites", x, y, `flat-${kind}-${dv}`, () => flatDecor(variant, kind, dv)); };
      const n = hash(x, y, 196);
      const m = hash(x, y, 197);
      const byRock = DIRS.some(([dx, dy]) => rock(x + dx, y + dy));
      if (lair === 0) {
        // Covil do Basilisco: pele trocada, sulcos das patas e ossos de quem virou pedra.
        if (n < 0.08) decor("skin");
        else if (n < 0.16) decor("bones");
        else if (n < 0.2) decor("furrow");
      } else if (lair === 1) {
        // Covil do Observador: chão limpo e liso (ele flutua), com ossos espalhados.
        if (n < 0.08) decor("bones");
        else if (n < 0.12) decor("pebbles");
      } else if (byRock && n < 0.15) {
        if (m < 0.35) tall(m < 0.17 ? "stalagmite" : "stalagmites", x, y, 0.8 + hash(x, y, 190) * 0.3);
        else if (m < 0.55) {
          tall("crystals", x, y, 0.8 + hash(x, y, 190) * 0.3);
          lights.push({ x: x * TILE_SIZE + 16, y: y * TILE_SIZE + 24, scale: 1.1, alpha: 0.5, tint: glow.crystal });
        } else decor(m < 0.75 ? "pebbles" : "sand");
      } else if (n < 0.05) decor(m < 0.5 ? "pebbles" : "bones");
    }

  // Covis: um brilho fraco na cor do dono, para o boss não sumir no escuro.
  lairs.forEach((l, k) => {
    lights.push({ x: (l.room.x + l.room.w / 2) * TILE_SIZE, y: (l.room.y + l.room.h / 2) * TILE_SIZE, scale: 3.4, alpha: 0.32, tint: glow.lairs[k] ?? glow.crystal });
  });
  return { atlas, layers, standing, lights };
}

export { TALL_DECOR };

/** Pilar solto do covil: rocha sem rocha nos 4 lados (o gerador os põe soltos); conta como chão com estalagmite. */
export function pillar(d: Dungeon, x: number, y: number) {
  if (tileAt(d, x, y) !== Tile.Wall) return false;
  return DIRS.every(([dx, dy]) => tileAt(d, x + dx, y + dy) !== Tile.Wall);
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
