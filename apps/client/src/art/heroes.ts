import type { ClassId } from "@kusa/shared";
import { makeCanvas } from "./pixels.ts";
import { ART_SCALE, scale2x } from "./refine.ts";
import { NO_OUTFIT, type Outfit } from "./outfit.ts";
import { heroFrame } from "./hero/hero.ts";
import { HERO_DIRS, HERO_FRAMES, type HeroDir } from "./hero/rig.ts";
import { S as CELL } from "./hero/raster.ts";

/**
 * Folhas de sprites dos heróis. A arte é pintada em 48×48 por `hero/` (corpo da classe + um desenho por
 * item vestido, com luz e contorno calculados) e ampliada 2× com Scale2x, que arredonda as diagonais.
 *
 * 3 direções (a direita é a esquerda espelhada) × 3 quadros de caminhada (parado e dois passos; a
 * animação toca `1, 0, 2, 0`). A folha tem 9 quadros em linha: `direção * 3 + quadro`.
 */

export { HERO_DIRS, HERO_FRAMES, type HeroDir };
/** Quadro da textura final. */
export const HERO_SIZE = CELL * ART_SCALE;

/** Folha da classe vestindo `outfit`: 9 quadros em linha, virados para a esquerda no lado. */
export function heroSheet(classId: ClassId, outfit: Outfit = NO_OUTFIT): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(CELL * HERO_DIRS.length * HERO_FRAMES, CELL);
  HERO_DIRS.forEach((dir, d) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      const image = ctx.createImageData(CELL, CELL);
      image.data.set(heroFrame(classId, outfit, dir, f));
      ctx.putImageData(image, (d * HERO_FRAMES + f) * CELL, 0);
    }
  });
  return scale2x(canvas);
}

/** Quadro parado de cada direção pedida, lado a lado (retratos e prévia do equipamento). */
export function heroPoses(classId: ClassId, outfit: Outfit = NO_OUTFIT, dirs: HeroDir[] = ["down", "side", "up"]) {
  const sheet = heroSheet(classId, outfit);
  const { canvas, ctx } = makeCanvas(HERO_SIZE * dirs.length, HERO_SIZE);
  dirs.forEach((dir, i) => {
    const frame = HERO_DIRS.indexOf(dir) * HERO_FRAMES;
    ctx.drawImage(sheet, frame * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, i * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE);
  });
  return canvas;
}
