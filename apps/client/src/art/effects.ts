import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas, paintGrid, type Grid } from "./pixels.ts";

/**
 * Arte própria dos efeitos de combate corpo a corpo (corte, mordida, pancada) e da folha do druida.
 * Cada efeito animado é uma faixa de quadros 32×32. Projéteis e impactos mágicos vêm do pack CC0.
 */

export const SLASH_FRAMES = 3;
export const BITE_FRAMES = 2;
export const SMASH_FRAMES = 3;

type Rgba = [number, number, number, number];

/** Desenha uma faixa de quadros pixel a pixel: `pixel(f, x, y)` devolve a cor ou nada. */
function strip(frames: number, pixel: (f: number, x: number, y: number) => Rgba | null) {
  const { canvas, ctx } = makeCanvas(TILE_SIZE * frames, TILE_SIZE);
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const c = pixel(f, x, y);
        if (!c) continue;
        const i = (y * canvas.width + f * TILE_SIZE + x) * 4;
        image.data.set(c, i);
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Corte em arco, da esquerda para a direita por cima; o fim do arco some primeiro. */
export function slashStrip() {
  // Trecho do arco (em graus, 0 = direita, -90 = cima) visível em cada quadro.
  const spans = [[-170, -110], [-165, -30], [-90, 20]];
  return strip(SLASH_FRAMES, (f, x, y) => {
    const dx = x - 15.5;
    const dy = y - 17.5;
    const r = Math.hypot(dx, dy);
    if (r < 8.5 || r > 13.5) return null;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const [a0, a1] = spans[f];
    if (angle < a0 || angle > a1) return null;
    // A ponta (a1) é mais forte; o rastro (a0) desbota.
    const t = (angle - a0) / (a1 - a0);
    const alpha = Math.round(90 + 165 * t);
    if (r > 12) return [255, 255, 255, alpha];
    if (r > 10.5) return [220, 228, 240, Math.round(alpha * 0.85)];
    return [150, 165, 190, Math.round(alpha * 0.55)];
  });
}

/** Mordida: duas arcadas de dentes triangulares que se fecham, com gotas vermelhas no segundo quadro. */
export function biteStrip() {
  // Dente de 5 px: 5, 3 e 1 px de largura da gengiva para a ponta.
  const tooth = (x: number, row: number) => {
    const col = (x - 5) % 6;
    if (x < 5 || x > 27 || col > 4 || row < 0 || row > 2) return false;
    return Math.abs(col - 2) <= 2 - row;
  };
  return strip(BITE_FRAMES, (f, x, y) => {
    const gap = f === 0 ? 6 : 1;
    const upperGum = 16 - gap - 4;
    const lowerGum = 16 + gap + 3;
    if ((y === upperGum || y === lowerGum) && x >= 4 && x <= 28) return [120, 24, 28, 255];
    if (tooth(x, y - upperGum - 1) || tooth(x, lowerGum - 1 - y)) return [244, 240, 228, 255];
    if (f === 1 && hash(x, y, 31) < 0.08 && Math.abs(y - 16) < 9 && x > 4 && x < 28) return [176, 20, 24, 230];
    return null;
  });
}

/** Pancada: anel de poeira e raios que se abre e some. */
export function smashStrip() {
  return strip(SMASH_FRAMES, (f, x, y) => {
    const dx = x - 15.5;
    const dy = y - 16.5;
    const r = Math.hypot(dx, dy);
    const ring = 4 + f * 4;
    const n = hash(x, y, f, 17);
    const alpha = 255 - f * 70;
    if (Math.abs(r - ring) < 1.6 && n < 0.75) return n < 0.3 ? [240, 226, 196, alpha] : [168, 138, 98, alpha];
    // Raios em X e em cruz no primeiro quadro.
    if (f === 0 && r < 9 && (Math.abs(dx) < 0.8 || Math.abs(dy) < 0.8 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.8)) {
      return [255, 250, 220, 255];
    }
    return null;
  });
}

const LEAF: Grid = [
  "....ooo...",
  "..oogggo..",
  "wwgggGGGo.",
  "..ooggGo..",
  "....ooo...",
];

/** Folha do druida, apontando para a direita (o jogo gira na direção do voo). */
export function leafCanvas() {
  const { canvas, ctx } = makeCanvas(LEAF[0].length, LEAF.length);
  paintGrid(ctx, LEAF, { o: "#1d3a12", g: "#6fbf3a", G: "#c8f08a", w: "#7a4a22" }, 0, 0);
  return canvas;
}
