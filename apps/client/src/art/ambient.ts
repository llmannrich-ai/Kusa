import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas, px, strip, type Ctx } from "./pixels.ts";

/**
 * Ambiente que os mapas dividem, pixel a pixel: a sombra que paredes e árvores jogam no chão (Cripta e pântanos),
 * a ondinha na água, o vaga-lume e a névoa dos pântanos. Tudo é enfeite: não bloqueia passo nem visão.
 */

// --- Sombras, ondinhas, vaga-lume e névoa -------------------------------------------

/**
 * Sombra que árvores e paredes jogam no chão ao sul (quadro 0), a leste (quadro 1) e nos dois (quadro 2),
 * em faixas de pixel. `rgb` é a cor da sombra ("r,g,b"); `strength` multiplica a opacidade.
 */
export function shadeStrip(rgb = "8,14,6", strength = 1) {
  const bands = [0.34, 0.26, 0.2, 0.14, 0.09, 0.05].map((a) => (a * strength).toFixed(3));
  const north = (ctx: Ctx) => bands.forEach((a, i) => px(ctx, 0, i * 2, `rgba(${rgb},${a})`, TILE_SIZE, 2));
  const west = (ctx: Ctx) => bands.forEach((a, i) => px(ctx, i * 2, 0, `rgba(${rgb},${a})`, 2, TILE_SIZE));
  return strip([north, west, (ctx) => { north(ctx); west(ctx); }]);
}

export const RIPPLE_FRAMES = 4;

/** Ondinha que se abre na água (quadros 32×32). */
export function rippleStrip() {
  return strip(Array.from({ length: RIPPLE_FRAMES }, (_, f) => (ctx: Ctx) => {
    const rx = 2 + f * 2.5;
    const ry = rx * 0.45;
    const alpha = 0.75 - f * 0.17;
    for (let a = 0; a < Math.PI * 2; a += 0.08) {
      px(ctx, 16 + Math.cos(a) * rx, 16 + Math.sin(a) * ry, `rgba(214,236,222,${alpha})`);
    }
  }));
}

/** Vaga-lume: miolo claro e brilho em cruz (7×7). */
export function fireflyCanvas() {
  const { canvas, ctx } = makeCanvas(7, 7);
  px(ctx, 3, 0, "rgba(200,240,90,0.25)", 1, 7);
  px(ctx, 0, 3, "rgba(200,240,90,0.25)", 7, 1);
  px(ctx, 2, 2, "rgba(214,245,110,0.55)", 3, 3);
  px(ctx, 3, 3, "#fffbd0");
  return canvas;
}

/** Névoa: nuvem baixa e larga, de borda pixelada, quase transparente. */
export function mistCanvas() {
  const w = 96;
  const h = 40;
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
      const edge = 0.75 + hash(x, y, 21) * 0.3;
      if (d > edge) continue;
      const a = (1 - d / edge) * 0.22 + 0.04;
      px(ctx, x, y, `rgba(214,230,214,${a.toFixed(3)})`, 2, 2);
    }
  }
  return canvas;
}
