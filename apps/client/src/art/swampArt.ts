import { E, basaltTile, empireRampsWith, flatDecor, fringeEdge, inPalette, type FlatDecor } from "./empireArt.ts";
import {
  BLOCK, COLUMN, MOSAIC_TILES, SMALL, WALL_SPRITE, columnSprite, mosaicImage, rubbleSprite, smallDecor, wallSprite,
  type ColumnKind, type SmallDecor,
} from "./empireMonuments.ts";

/**
 * Ruínas do Pântano das Ruínas no padrão novo (128 px por tile, por código; `docs/CENARIOS_PLANO.md`, fase 1b): o que
 * resta do império afundado na Baía. São as peças dos Portões do Império (`empireArt.ts`, `empireMonuments.ts`: lajes,
 * muros, colunas, entulho, enfeites e o mosaico) pintadas noutra paleta: calcário cinza-esverdeado, musgo e hera mais
 * fortes, mármore manchado pela água. A natureza do mapa é a da mata alagada (`forestArt.ts`, variante `swamp`).
 */

/** Paleta das ruínas: as cores do império com a pedra lavada pela baía e a vegetação do pântano. */
const RAMPS = empireRampsWith({
  [E.Grass]: ["#7d8c42", 0.6, 3], [E.Dry]: ["#8e8a52", 0.6, 4], [E.Dirt]: ["#755f40", 0.7, 6], [E.Clover]: ["#6e8342", 0.7, 4],
  [E.Basalt]: ["#878873", 0.8, 5], [E.Travertine]: ["#9c9b82", 0.62, 5], [E.Marble]: ["#b8b7a0", 0.55, 4], [E.Vein]: ["#8a8c7a", 0.7, 4],
  [E.Mortar]: ["#3e4234", 0.6, 4], [E.Tuff]: ["#8c8a68", 0.8, 6], [E.Moss]: ["#5f8636", 0.85, 8], [E.Ivy]: ["#2f5a22", 0.95, 9],
  [E.Leaf]: ["#436130", 0.95, 9], [E.Bush]: ["#55783a", 0.95, 9], [E.Water]: ["#629484", 0.85, 8], [E.Deep]: ["#3e6b61", 0.85, 8],
  [E.Slab]: ["#5e6252", 0.8, 5], [E.Wall]: ["#6c6c5a", 0.85, 5], [E.Bone]: ["#d1ccb9", 0.75, 5], [E.Line]: ["#171f0f", 0.4, 0],
  // O tijolo, o reboco e o pórfiro vermelhos da cidade, lavados pela água até quase o tom da pedra.
  [E.Brick]: ["#7c6a52", 0.8, 6], [E.Plaster]: ["#76705a", 0.75, 6], [E.Porphyry]: ["#6e5448", 0.8, 6],
  [E.Terracotta]: ["#9a6a48", 0.8, 6], [E.Cloth]: ["#6e4a3a", 0.8, 6],
});

export const inSwamp = <T>(draw: () => T) => inPalette(RAMPS, draw);
const swamp = inSwamp;

export { BLOCK, COLUMN, MOSAIC_TILES, SMALL, WALL_SPRITE, type ColumnKind, type FlatDecor, type SmallDecor };
export { WALL_HEIGHTS, WALL_LINK } from "./empireMonuments.ts";

/**
 * Piso de pedras irregulares (o calçamento de basalto da via dos Portões, aqui em calcário; fecha a cada 2×2 tiles: `q`
 * é o quarto do tile). O travertino tinha lajes faltando em grade regular, que apareciam a cada 2 tiles.
 */
export const pavingTile = (q: number) => swamp(() => basaltTile(q).render(false));
/** Capim invadindo a beira das lajes pelos vizinhos que são capim (bits de `OPEN`). */
export const pavingFringe = (grass: number) => swamp(() => fringeEdge(grass).render(false));
/** Trecho de muro arruinado (`wallSprite` do império, sem as ameias da muralha). */
export const ruinWall = (links: number, h: number, step: number, v: number) => swamp(() => wallSprite(links, h, step, v, false));
export const ruinColumn = (kind: ColumnKind, v: number) => swamp(() => columnSprite(kind, v));
/** Entulho de blocos (`under`: os blocos meio afundados, para dentro d'água). */
export const ruinRubble = (v: number, under = false) => swamp(() => rubbleSprite(v, under));
export const ruinSmall = (kind: SmallDecor, v: number) => swamp(() => smallDecor(kind, v));
/** Enfeite rasteiro das lajes (cacos, tesselas, inscrição, ossos...); pó e poça vão sem contorno. */
export const ruinFlat = (kind: FlatDecor, v: number) => swamp(() => flatDecor(kind, v).render(kind !== "dust" && kind !== "puddle"));
/** O mosaico do chão da arena (11×9 tiles). */
export const ruinMosaic = () => swamp(mosaicImage);
