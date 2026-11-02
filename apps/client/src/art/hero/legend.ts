import { M } from "./materials.ts";
import type { Ctx, Held, Wear } from "./compose.ts";

/**
 * Lendários na arte antiga: o desenho do mágico de Dragão da família repintado com os materiais da peça (metal,
 * tecido/madeira e brilho), como na arte nova (`proto/tibiaHero.ts`, seção "Lendários"). Pele, olhos e cabelo não mudam.
 */

const METAL = [M.bronze, M.iron, M.darkIron, M.steel, M.mithral, M.dragon, M.dragonDark, M.gold, M.frostSteel, M.silverWhite, M.elfSilver, M.stormSteel, M.bloodSteel, M.obsidian];
const CLOTH = [M.leather, M.darkLeather, M.wood, M.darkWood, M.rope, M.fur, M.leaf, M.feather, M.plumeRed, M.plumeBlue, M.string, M.greenLeather, M.greenCloth, M.ash, M.linen, M.wool, M.woolBrown, M.runeCloth, M.silk, M.dragonSilk, M.night, M.ivory, M.bone];
const GLOW = [M.ember, M.ruby, M.sapphire, M.emerald, M.amber, M.amethyst, M.rune, M.holy, M.fire, M.poison, M.frost, M.blood, M.star];

/** [metal, tecido, brilho] de cada lendário. */
const LOOKS: Record<string, [number, number, number]> = {
  eclipse: [M.obsidian, M.night, M.fire],
  lastwinter: [M.frostSteel, M.bone, M.frost],
  ironheart: [M.darkIron, M.darkLeather, M.fire],
  vigil: [M.gold, M.plumeBlue, M.amber],
  stonegiant: [M.ash, M.greenCloth, M.emerald],
  dawn: [M.gold, M.plumeRed, M.holy],
  clockwork: [M.bronze, M.darkWood, M.amber],
  phoenix: [M.ash, M.ash, M.fire],
  frost: [M.silverWhite, M.silverWhite, M.frost],
  stormeye: [M.stormSteel, M.runeCloth, M.sapphire],
  dreamoak: [M.greenLeather, M.wood, M.emerald],
  thousandwings: [M.elfSilver, M.greenCloth, M.amethyst],
  redtotem: [M.bone, M.bloodSteel, M.fire],
  warchief: [M.bone, M.darkLeather, M.blood],
  nobody: [M.obsidian, M.shadow, M.amethyst],
  moonmirror: [M.silverWhite, M.silk, M.sapphire],
  astral: [M.night, M.night, M.star],
  doombell: [M.bronze, M.darkIron, M.amber],
  lastray: [M.silverWhite, M.plumeBlue, M.frost],
  voidmaw: [M.obsidian, M.night, M.amethyst],
  venomharvest: [M.greenLeather, M.darkWood, M.poison],
  motherbeast: [M.bone, M.fur, M.amber],
};

/** Chaves com desenho na arte antiga. */
export const LEGEND_KEYS = Object.keys(LOOKS);

/** Troca de materiais do lendário `key` (vazia se não houver). */
export function legendMap(key: string): ReadonlyMap<number, number> {
  const look = LOOKS[key];
  const map = new Map<number, number>();
  if (!look) return map;
  for (const m of METAL) map.set(m, look[0]);
  for (const m of CLOTH) map.set(m, look[1]);
  for (const m of GLOW) map.set(m, look[2]);
  return map;
}

/** A peça (roupa, escudo ou arma) com os materiais do lendário: os mesmos ganchos, com a segunda troca ativa. */
export function legendWear<T extends Wear | Held>(key: string, base: T): T {
  const map = legendMap(key);
  const out: Record<string, unknown> = { ...base };
  for (const [k, fn] of Object.entries(base)) {
    if (typeof fn !== "function") continue;
    out[k] = (c: Ctx, ...a: unknown[]) => {
      const prev = c.cv.legend;
      c.cv.legend = map;
      try { (fn as (c: Ctx, ...a: unknown[]) => void)(c, ...a); } finally { c.cv.legend = prev; }
    };
  }
  return out as T;
}
