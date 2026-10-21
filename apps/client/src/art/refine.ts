import { makeCanvas } from "./pixels.ts";

/**
 * Refinamento da arte dos personagens: a arte de 32×32 vira uma textura de 64×64 com mais
 * detalhe, desenhada no jogo em escala menor (ver `CHAR_SCALE`). Passos, em ordem:
 *
 * 1. Scale2x (EPX): dobra cada pixel e arredonda as diagonais em escada, sem inventar cores.
 * 2. Contorno seletivo: as linhas de contorno internas (entre duas cores) ficam com 1 px escuro e
 *    1 px de meio-tom; o contorno de fora fica fino no lado da luz e grosso no da sombra.
 * 3. Volume: luz vindo de cima à esquerda clareia a borda daquele lado e escurece a oposta,
 *    em faixas (sem degradê), para continuar parecendo pixel art. Com o contorno conhecido, cada
 *    parte da roupa também ganha 1 px de luz junto da linha de cima e da esquerda.
 * 4. Brilho nos olhos (quem tem a cor dos olhos na paleta).
 */

/** Quantas vezes a textura refinada é maior que a arte original. */
export const ART_SCALE = 2;
/** Tamanho dos personagens no jogo em relação ao tile (heróis, monstros e invocações). */
export const CHAR_SCALE = 1.2;
/** Escala do sprite com textura refinada para ficar do tamanho `CHAR_SCALE`. */
export const CHAR_SPRITE_SCALE = CHAR_SCALE / ART_SCALE;

export interface RefineOptions {
  /** Cor do contorno da arte (as linhas internas dela são afinadas). Sem ela, tons muito escuros não recebem luz. */
  outline?: string;
  /** Cor dos olhos: cada olho ganha um pontinho de brilho. */
  eye?: string;
}

const LIGHT = 1.16;
const SHADE = 0.8;
/** Meio-tom da linha interna: quanto da cor vizinha entra no contorno. */
const SOFT_LINE = 0.45;
const GLINT = 0xffeee4ff;

const rgba = (hex: string) => (parseInt(hex.slice(1), 16) << 8 | 0xff) >>> 0;

/** Devolve um canvas `ART_SCALE` vezes maior com a arte refinada. */
export function refineArt(source: HTMLCanvasElement | HTMLImageElement, options: RefineOptions = {}): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const src = makeCanvas(w, h);
  src.ctx.drawImage(source, 0, 0);
  const input = readPixels(src.ctx, w, h);

  const W = w * 2;
  const H = h * 2;
  const px = scale2x(input, w, h);
  const outline = options.outline ? rgba(options.outline) : undefined;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : px[y * W + x]);
  const opaque = (c: number) => (c & 0xff) > 0;

  // Volume: gradiente da silhueta borrada; a normal aponta para fora da figura.
  const mask = blurAlpha(px, W, H, 3);
  const m = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x]);
  const out = new Uint32Array(px);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = px[y * W + x];
      if (!opaque(c)) continue;
      const touchesAir = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => !opaque(at(x + dx, y + dy))));
      if (c === outline) {
        if (touchesAir) continue;
        // Contorno interno: o lado de baixo/direita da linha dupla vira meio-tom da cor vizinha.
        const next = [at(x + 1, y), at(x, y + 1)].find((n) => opaque(n) && n !== outline);
        if (next !== undefined) out[y * W + x] = mix(c, next, SOFT_LINE);
        continue;
      }
      if (outline === undefined && luminance(c) < 34) continue;
      const light = ((m(x + 1, y) - m(x - 1, y)) + (m(x, y + 1) - m(x, y - 1))) * Math.SQRT1_2;
      // Chanfro: logo abaixo ou à direita de uma linha de contorno, cada parte (braço, cinto, bota) pega luz.
      const bevel = outline !== undefined && (at(x, y - 1) === outline || at(x - 1, y) === outline);
      if (light < -0.12) out[y * W + x] = brighten(c, SHADE);
      else if (light > 0.12 || bevel) out[y * W + x] = brighten(c, LIGHT);
    }
  }

  if (options.eye) {
    const eye = rgba(options.eye);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (input[y * w + x] === eye) out[y * 2 * W + x * 2] = GLINT;
      }
    }
  }

  const { canvas, ctx } = makeCanvas(W, H);
  const image = ctx.createImageData(W, H);
  const view = new DataView(image.data.buffer);
  out.forEach((c, i) => view.setUint32(i * 4, c));
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Pixels como RGBA em 32 bits (0 = transparente). */
function readPixels(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const data = ctx.getImageData(0, 0, w, h).data;
  const view = new DataView(data.buffer);
  const pixels = new Uint32Array(w * h);
  for (let i = 0; i < pixels.length; i++) {
    const c = view.getUint32(i * 4);
    pixels[i] = c & 0xff ? c : 0;
  }
  return pixels;
}

function scale2x(p: Uint32Array, w: number, h: number) {
  const W = w * 2;
  const out = new Uint32Array(W * h * 2);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : p[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const e = at(x, y);
      const a = at(x, y - 1);
      const b = at(x + 1, y);
      const c = at(x - 1, y);
      const d = at(x, y + 1);
      const i = y * 2 * W + x * 2;
      out[i] = c === a && c !== d && a !== b ? a : e;
      out[i + 1] = a === b && a !== c && b !== d ? b : e;
      out[i + W] = d === c && d !== b && c !== a ? c : e;
      out[i + W + 1] = b === d && b !== a && d !== c ? d : e;
    }
  }
  return out;
}

/** Alfa (0 ou 1) borrado por uma caixa de lado `2r + 1`. */
function blurAlpha(p: Uint32Array, w: number, h: number, r: number) {
  const pass = (from: Float32Array, horizontal: boolean) => {
    const to = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let k = -r; k <= r; k++) {
          const sx = horizontal ? x + k : x;
          const sy = horizontal ? y : y + k;
          if (sx >= 0 && sy >= 0 && sx < w && sy < h) sum += from[sy * w + sx];
        }
        to[y * w + x] = sum / (2 * r + 1);
      }
    }
    return to;
  };
  const alpha = Float32Array.from(p, (c) => ((c & 0xff) > 0 ? 1 : 0));
  return pass(pass(alpha, true), false);
}

const channels = (c: number) => [c >>> 24, (c >>> 16) & 0xff, (c >>> 8) & 0xff];
/** Junta r, g, b com o alfa de `like`. */
const pack = ([r, g, b]: number[], like: number) => ((r << 24) | (g << 16) | (b << 8) | (like & 0xff)) >>> 0;
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function mix(a: number, b: number, t: number) {
  const ca = channels(a);
  const cb = channels(b);
  return pack(ca.map((v, i) => clamp(v + (cb[i] - v) * t)), a);
}

/** Clareia (> 1) puxando para um tom quente, ou escurece (< 1) puxando para o roxo, como na pixel art. */
function brighten(c: number, k: number) {
  const [r, g, b] = channels(c);
  return k > 1
    ? pack([clamp(r * k + 10), clamp(g * k + 6), clamp(b * k)], c)
    : pack([clamp(r * k), clamp(g * k - 2), clamp(b * k + 10)], c);
}

function luminance(c: number) {
  const [r, g, b] = channels(c);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
