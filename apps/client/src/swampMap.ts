import type * as Phaser from "phaser";
import { TILE_SIZE, Tile, centerOf, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { MARSH_FLOOR, MARSH_TALL } from "./art/marshDecor.ts";
import {
  COLUMN_RISE, MOSAIC_RADIUS, PAVING_VARIANTS, RUIN_FLOOR, RUIN_TALL, RUIN_WATER, WALL_HEIGHTS, WALL_LINK, WALL_RISE, WALL_VARIANTS,
  pavingVariant, toSwampTone,
} from "./art/ruinsDecor.ts";
import { SWAMP_TEXTURE, createSwampArt, swampWallTexture } from "./art/textures.ts";
import type { MapAmbience } from "./mapShared.ts";
import { Ground, drawWetland, field, type WetlandTheme } from "./wetlandMap.ts";

/** Fundo além da mata: verde-azulado quase preto, a copa fechada da floresta da baía. */
export const SWAMP_VOID = 0x081410;

/**
 * Pântano das Ruínas: a floresta alagada (`wetlandMap.ts`) com a natureza na paleta da baía, mais aberta e clara que a
 * do Kosaradius, e o que resta do império afundado. A pedra do gerador vira ruína: pedra ligada a outra é trecho de
 * muro (montado pelos vizinhos, com a altura variando aos poucos), pedra sozinha é coluna (inteira com capitel na arena
 * da Hidra; quebrada ou toco no resto). O chão das salas laterais, da arena e em volta dos restos de muro pelo campo é de
 * lajes, com o capim invadindo pela beira; no meio da arena, o mosaico da Hidra. Entulho, rachaduras, glifos, cacos,
 * tambores caídos, cabeças de estátua e urnas pelas ruínas; tocos de coluna e lajes afundadas dentro das lagoas.
 */
function swampTheme(d: Dungeon): WetlandTheme {
  const at = (x: number, y: number) => tileAt(d, x, y);
  const rooms = [d.boss, ...d.side];
  const inRoom = (x: number, y: number) => rooms.some((r) => inRect(r, x, y));
  const bossCenter = centerOf(d.boss);

  // Lajes: as salas inteiras (e uma beirada irregular em volta) e o chão em volta dos restos de muro pelo campo.
  const paved = new Uint8Array(d.width * d.height);
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const t = at(x, y);
      if (t !== Tile.Floor && t !== Tile.Ruin && t !== Tile.Portal) continue;
      if (inRoom(x, y)) { paved[y * d.width + x] = 1; continue; }
      const spill = rooms.some((r) => inRect(grow(r, 1), x, y)) && hash(x, y, 80) < 0.45;
      let ruinNear = 3;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          if (at(x + dx, y + dy) === Tile.Ruin && !inRoom(x + dx, y + dy)) ruinNear = Math.min(ruinNear, Math.max(Math.abs(dx), Math.abs(dy)));
      const byWater = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
      if (spill || ruinNear === 0 || (ruinNear === 1 && hash(x, y, 81) < 0.8) || (ruinNear === 2 && !byWater && hash(x, y, 82) < 0.35)) {
        paved[y * d.width + x] = 1;
      }
    }
  // Laje solta no capim (sem duas vizinhas de laje) sai: vira só uma pedra caída, não um tile de pedra.
  const spare = paved.slice();
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const i = y * d.width + x;
      if (!spare[i] || at(x, y) === Tile.Ruin || inRoom(x, y)) continue;
      const around = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => spare[(y + dy) * d.width + x + dx]).length;
      if (around < 2) paved[i] = 0;
    }
  const isPaved = (x: number, y: number) => x >= 0 && y >= 0 && x < d.width && y < d.height && paved[y * d.width + x] === 1;

  return {
    tex: SWAMP_TEXTURE,
    edges: "swamp-edges",
    shade: [0.84, 1, 0.8],
    mist: 0xe4f2e8,
    cypressRing: false,
    tone: (canvas, x, y, w, h) => { toSwampTone(canvas, false, x, y, w, h); },
    bogs: false,
    tintEdges: true,
    paved: isPaved,
    paving: { key: SWAMP_TEXTURE.paving, count: PAVING_VARIANTS, frame: pavingVariant },
    extras: [SWAMP_TEXTURE.ruinFloor, SWAMP_TEXTURE.ruinWater, SWAMP_TEXTURE.ruinTall],
    painter: ({ scene, culler, floorDepth, decor, tall, layerDecor }) => {
      const ruin = (x: number, y: number) => at(x, y) === Tile.Ruin;
      /**
       * Altura do trecho de muro: segue um ruído suave ao longo dos trechos deitados (vizinhos ficam parecidos) e é a
       * mesma em todo o trecho em pé (a do tile de cima), para o muro norte-sul não virar degraus.
       */
      const wallHeight = (x: number, y: number): number => {
        let top = y;
        while (ruin(x, top - 1)) top--;
        return WALL_HEIGHTS[Math.min(WALL_HEIGHTS.length - 1, Math.floor(field(x, top, 4, 84) * WALL_HEIGHTS.length))];
      };
      const ruinFloor = (frame: number, x: number, y: number) => layerDecor(SWAMP_TEXTURE.ruinFloor, frame, x, y);
      const ruinTall = (frame: number, x: number, y: number) => {
        const img = culler.add(scene.add.image(x * TILE_SIZE, y * TILE_SIZE, SWAMP_TEXTURE.ruinTall, frame)
          .setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.25), x, y);
        if (hash(x, y, 83) < 0.5) img.setFlipX(true);
      };

      // Mosaico da Hidra no meio da arena, por cima das lajes e abaixo de tudo o que fica de pé.
      culler.add(scene.add.image(bossCenter.x * TILE_SIZE + 16, bossCenter.y * TILE_SIZE + 16, SWAMP_TEXTURE.mosaic)
        .setDepth(floorDepth + 0.4), bossCenter.x, bossCenter.y);
      const onMosaic = (x: number, y: number) => Math.hypot(x - bossCenter.x, y - bossCenter.y) * TILE_SIZE < MOSAIC_RADIUS + 20;
      const chests = new Set(d.side.map((r) => (r.y + 1) * d.width + r.x + 1));
      const nearChestOrBoss = (x: number, y: number) =>
        d.side.some((r) => tileDistance(x, y, r.x + 1, r.y + 1) <= 1 || tileDistance(x, y, ...xy(centerOf(r))) <= 1);

      return {
        ruin(x, y) {
          const links = (ruin(x, y - 1) ? WALL_LINK.n : 0) | (ruin(x + 1, y) ? WALL_LINK.e : 0)
            | (ruin(x, y + 1) ? WALL_LINK.s : 0) | (ruin(x - 1, y) ? WALL_LINK.w : 0);
          if (links) {
            const key = swampWallTexture(scene, links, wallHeight(x, y), Math.floor(hash(x, y, 85) * WALL_VARIANTS));
            culler.add(scene.add.image(x * TILE_SIZE, y * TILE_SIZE - WALL_RISE, key).setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.3), x, y);
            return;
          }
          // Coluna sozinha: inteira na arena; no resto, quebrada alta, média ou toco.
          const n = hash(x, y, 86);
          const variant = inRect(d.boss, x, y) ? 0 : n < 0.4 ? 1 : n < 0.75 ? 2 : 3;
          const img = scene.add.image(x * TILE_SIZE, y * TILE_SIZE - COLUMN_RISE, SWAMP_TEXTURE.columns, variant)
            .setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.3);
          if (variant > 0 && hash(x, y, 87) < 0.5) img.setFlipX(true);
          culler.add(img, x, y);
        },
        decor(x, y, g) {
          const n = hash(x, y, 23);
          const m = hash(x, y, 24);
          if (g !== Ground.Stone) {
            // Capim perto das ruínas: uma pedra caída de vez em quando.
            if (n < 0.06 && [-2, -1, 0, 1, 2].some((dy) => [-2, -1, 0, 1, 2].some((dx) => ruin(x + dx, y + dy)))) {
              ruinFloor(m < 0.5 ? RUIN_FLOOR.rubbleA : RUIN_FLOOR.rubbleB, x, y);
              return true;
            }
            return false;
          }
          if (onMosaic(x, y) || chests.has(y * d.width + x)) return true;
          const inside = inRoom(x, y);
          const byRuin = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => ruin(x + dx, y + dy));
          if (byRuin && n < 0.28) {
            // Pé dos muros: entulho e capim nas juntas.
            ruinFloor(m < 0.35 ? RUIN_FLOOR.rubbleA : m < 0.65 ? RUIN_FLOOR.rubbleB : m < 0.85 ? RUIN_FLOOR.weeds : RUIN_FLOOR.mossA, x, y);
          } else if (n < 0.16) {
            if (m < 0.16) ruinFloor(RUIN_FLOOR.crackA, x, y);
            else if (m < 0.28) ruinFloor(RUIN_FLOOR.crackB, x, y);
            else if (m < 0.42) ruinFloor(m < 0.35 ? RUIN_FLOOR.mossA : RUIN_FLOOR.mossB, x, y);
            else if (m < 0.54) ruinFloor(RUIN_FLOOR.weeds, x, y);
            else if (m < 0.64) ruinFloor(RUIN_FLOOR.puddle, x, y);
            else if (m < 0.72) ruinFloor(RUIN_FLOOR.shards, x, y);
            else if (m < 0.8) ruinFloor(RUIN_FLOOR.glyph, x, y);
            else if (m < 0.88) ruinFloor(RUIN_FLOOR.hole, x, y);
            else if (m < 0.94) ruinFloor(RUIN_FLOOR.skull, x, y);
            else decor(MARSH_FLOOR.leavesA, x, y);
          } else if (n < 0.21 && !(inside && nearChestOrBoss(x, y))) {
            // De pé: tambor de coluna, cabeça de estátua, urna, pedestal ou uma samambaia na fresta.
            if (m < 0.3) ruinTall(RUIN_TALL.drum, x, y);
            else if (m < 0.48) ruinTall(RUIN_TALL.head, x, y);
            else if (m < 0.66) ruinTall(RUIN_TALL.urn, x, y);
            else if (m < 0.78) ruinTall(RUIN_TALL.pedestal, x, y);
            else tall(MARSH_TALL.fern, x, y);
          }
          return true;
        },
        water(x, y, deep) {
          // Ruínas dentro da água: lajes afundadas, tocos de coluna e pedras de passagem.
          const n = hash(x, y, 19);
          const m = hash(x, y, 20);
          const nearRuins = [-3, -2, -1, 0, 1, 2, 3].some((dy) => [-3, -2, -1, 0, 1, 2, 3].some((dx) => isPaved(x + dx, y + dy)));
          if (n >= (nearRuins ? 0.1 : 0.03)) return false;
          if (!deep) { layerDecor(SWAMP_TEXTURE.ruinWater, RUIN_WATER.stone, x, y); return true; }
          layerDecor(SWAMP_TEXTURE.ruinWater, m < 0.45 ? RUIN_WATER.slab : m < 0.75 ? RUIN_WATER.stub : RUIN_WATER.stone, x, y);
          return true;
        },
      };
    },
  };
}

export function drawSwamp(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  createSwampArt(scene);
  return drawWetland(scene, d, floorDepth, uiDepth, swampTheme(d));
}

const xy = (p: { x: number; y: number }) => [p.x, p.y] as const;

function grow(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 };
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
