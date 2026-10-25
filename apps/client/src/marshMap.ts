import type * as Phaser from "phaser";
import { TILE_SIZE, Tile, centerOf, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { LOG_FRAMES, MARSH_FLOOR, MARSH_TALL } from "./art/marshDecor.ts";
import { MARSH_TEXTURE, createMarshArt } from "./art/textures.ts";
import type { MapAmbience } from "./mapShared.ts";
import { drawWetland, type WetlandTheme } from "./wetlandMap.ts";

/** Fundo além da mata: verde quase preto, a floresta fechada. */
export const MARSH_VOID = 0x07110a;

/**
 * Pântano do Kosaradius: a floresta alagada (`wetlandMap.ts`) nos tons fechados do brejo. A pedra do gerador são os
 * troncos caídos das clareiras dos baús; a clareira do boss tem o anel de ciprestes e um círculo de cogumelos brancos.
 */
const MARSH_THEME: WetlandTheme = {
  tex: MARSH_TEXTURE,
  edges: "marsh-edges",
  shade: [0.78, 0.95, 0.74],
  mist: 0xd8f0d0,
  cypressRing: true,
  painter: ({ scene, d, culler, decor, tall }) => {
    const at = (x: number, y: number) => tileAt(d, x, y);
    const bossCenter = centerOf(d.boss);
    const inClearing = (x: number, y: number) => d.side.some((r) => inRect(r, x, y));
    return {
      /** Tronco caído (pedra das clareiras): deitado, em pé ou, sozinho, toco grande. */
      ruin(x, y) {
        const ruin = (xx: number, yy: number) => at(xx, yy) === Tile.Ruin;
        const h = ruin(x - 1, y) || ruin(x + 1, y);
        const v = ruin(x, y - 1) || ruin(x, y + 1);
        const pick = (options: readonly number[]) => options[Math.floor(hash(x, y, 62) * options.length)];
        let frame: number;
        if (h) frame = !ruin(x - 1, y) ? LOG_FRAMES.hWest : !ruin(x + 1, y) ? LOG_FRAMES.hEast : pick(LOG_FRAMES.h);
        else if (v) frame = !ruin(x, y - 1) ? LOG_FRAMES.vNorth : !ruin(x, y + 1) ? LOG_FRAMES.vSouth : pick(LOG_FRAMES.v);
        else frame = pick(LOG_FRAMES.stump);
        culler.add(scene.add.image(x * TILE_SIZE, y * TILE_SIZE, MARSH_TEXTURE.logs, frame).setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.3), x, y);
      },
      decor(x, y) {
        const n = hash(x, y, 23);
        const m = hash(x, y, 24);
        if (inRect(d.boss, x, y)) {
          // Clareira do boss: um círculo de cogumelos brancos em volta do centro; perto das árvores, musgo e folhas.
          const r = Math.hypot(x - bossCenter.x, y - bossCenter.y);
          if (Math.abs(r - 3.2) < 0.55) decor(MARSH_FLOOR.fairy, x, y);
          else if (r > 5.5 && n < 0.3) {
            if (m < 0.4) decor(m < 0.13 ? MARSH_FLOOR.mossA : m < 0.26 ? MARSH_FLOOR.mossB : MARSH_FLOOR.mossC, x, y);
            else if (m < 0.6) decor(m < 0.5 ? MARSH_FLOOR.leavesA : MARSH_FLOOR.leavesB, x, y);
            else if (m < 0.8) tall(m < 0.7 ? MARSH_TALL.sedgeA : MARSH_TALL.fern, x, y);
            else decor(m < 0.9 ? MARSH_FLOOR.mushroomsBrown : MARSH_FLOOR.roots, x, y);
          }
          return true;
        }
        if (inClearing(x, y)) {
          // Clareiras dos baús: chão forrado de musgo, folhas, cogumelos e ossos de quem chegou antes.
          if (n < 0.3) decor(m < 0.33 ? MARSH_FLOOR.mossA : m < 0.66 ? MARSH_FLOOR.mossB : MARSH_FLOOR.mossC, x, y);
          else if (n < 0.42) decor(m < 0.35 ? MARSH_FLOOR.leavesB : m < 0.6 ? MARSH_FLOOR.mushroomsBrown : m < 0.85 ? MARSH_FLOOR.twigs : MARSH_FLOOR.bones, x, y);
          return true;
        }
        return false;
      },
    };
  },
};

export function drawMarsh(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  createMarshArt(scene);
  return drawWetland(scene, d, floorDepth, uiDepth, MARSH_THEME);
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
