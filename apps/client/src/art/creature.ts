import { makeCanvas } from "./pixels.ts";
import { Sprite, scaled, type Painter } from "./paint.ts";

/**
 * Folha de sprites de uma criatura (heróis e monstros): 3 direções (a direita é a esquerda
 * espelhada) e 3 quadros por direção ([parado, passo 1, passo 2]), lado a lado numa linha:
 * quadro `direção * 3 + quadro`. Os pés ficam perto da base do quadro.
 */

export type Dir = "down" | "up" | "side";
export const DIRS: Dir[] = ["down", "up", "side"];
export const FRAMES = 3;

export interface CreatureArt {
  /** Tamanho de cada quadro, em pixels de arte (ART_SCALE por unidade do jogo). */
  w: number;
  h: number;
  /** Desenha um quadro; no lado, a criatura olha para a esquerda. */
  draw(s: Sprite, dir: Dir, frame: number): void;
}

/** Passo do quadro: 0 parado, 1 e −1 para cada perna à frente. */
export const stepOf = (frame: number) => (frame === 0 ? 0 : frame === 1 ? 1 : -1);

export function creatureSheet(art: CreatureArt): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(art.w * DIRS.length * FRAMES, art.h);
  DIRS.forEach((dir, d) => {
    for (let f = 0; f < FRAMES; f++) {
      const s = new Sprite(art.w, art.h);
      art.draw(s, dir, f);
      s.paint(ctx, (d * FRAMES + f) * art.w, 0);
    }
  });
  return canvas;
}

/** Quanto as criaturas desenhadas na escala do esqueleto padrão crescem para ficar do tamanho dos heróis. */
export const CREATURE_GROWTH = 1.38;

/**
 * Criatura desenhada num quadro "pequeno" (`w`×`h`, pés em `h - 4`) e ampliada `f` vezes na folha:
 * as formas crescem e os detalhes de 1 pixel continuam finos.
 */
export function grownArt(w: number, h: number, f: number, draw: (p: Painter, dir: Dir, frame: number, cx: number, g: number) => void): CreatureArt {
  const W = Math.ceil((w * f) / 2) * 2;
  const H = Math.ceil(h * f);
  return {
    w: W, h: H,
    draw: (s, dir, frame) => draw(scaled(s, f, { x: w / 2, y: h - 4 }, { x: W / 2, y: H - 5 }), dir, frame, w / 2, h - 4),
  };
}
