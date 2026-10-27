import { ramp, rgb, type Rgb } from "./hero/color.ts";
import { makeCanvas } from "./pixels.ts";

/**
 * Pintor da arte de mapa no padrão novo (`docs/ARTE_TIBIA.md`): **128 px por tile**, luz de cima à esquerda em 4
 * faixas com pontilhado só na fronteira, 4 tons por material (6 na rampa: linha, sombra, meia-sombra, base, luz,
 * brilho), contorno quase preto nos objetos de pé e nenhum no chão. Cada mapa traz a sua paleta (`palette`) e os seus
 * materiais (um enum, índice na paleta); a pintura em si (papel, luz, ruído, formas, atlas) é esta, igual para todos.
 *
 * Tudo é pintado por código, pixel a pixel, sem `Math.random`: o mesmo desenho em todo aparelho. O chão emenda de um
 * tile para o outro porque toda textura que encosta na borda é periódica em 128 px (ou some na borda).
 */

/** Pixels de arte por tile. */
export const HD = 128;

/** Cor de um material: [base, contraste, desvio de matiz da rampa, brilho de metal]. */
export type MaterialBase = [string, number, number?, boolean?];

/** Rampas de 6 tons de cada material, na ordem do enum de materiais do mapa. */
export function palette(bases: readonly MaterialBase[]): Rgb[][] {
  return bases.map(([hex, contrast, shift = 6, shine = false]) => ramp(hex, { contrast, shift, shine }).map(rgb));
}

const OUTLINE: Rgb = rgb("#1a1210");
export const BAYER = [0, 0.5, 0.75, 0.25];
/** Luz de cima à esquerda, um pouco de frente (a mesma dos heróis). */
const L = (() => { const v = [-0.55, -0.62, 0.56]; const n = Math.hypot(...v); return v.map((c) => c / n); })();

/** Luz de uma normal (0.12 na sombra total, 1 de frente para o sol). */
export const lit = (nx: number, ny: number, nz: number) => {
  const n = Math.hypot(nx, ny, nz) || 1;
  return 0.12 + 0.88 * Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / n);
};
/** Luz do chão plano: a mesma do topo das dunas e dos platôs, para emendarem. */
export const FLAT = lit(0, 0, 1);

/** Ruído fixo por pixel. */
export const noise = (x: number, y: number, seed = 0) => {
  let h = Math.imul(Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + seed * 2246822519, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};
/** Ruído suave (grade de `cell` px) e periódico em `period` px: textura que emenda nas bordas. */
export function smoothNoise(x: number, y: number, cell: number, seed: number, period = HD) {
  const n = period / cell;
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number) => noise(((i % n) + n) % n, ((j % n) + n) % n, seed);
  const top = v(gx, gy) + (v(gx + 1, gy) - v(gx, gy)) * sx;
  const bottom = v(gx, gy + 1) + (v(gx + 1, gy + 1) - v(gx, gy + 1)) * sx;
  return top + (bottom - top) * sy;
}

const tables = new Map<number, Float32Array>();
/** `smoothNoise` de um tile inteiro, calculado uma vez e guardado (o ruído suave é o que mais pesa). */
function noiseTable(cell: number, seed: number) {
  const key = cell * 1_000_003 + seed;
  let t = tables.get(key);
  if (!t) {
    t = new Float32Array(HD * HD);
    for (let y = 0; y < HD; y++) for (let x = 0; x < HD; x++) t[y * HD + x] = smoothNoise(x, y, cell, seed);
    tables.set(key, t);
  }
  return t;
}
/** Ruído suave periódico no pixel (x, y) do tile, pela tabela. */
export const sn = (x: number, y: number, cell: number, seed: number) => noiseTable(cell, seed)[((Math.floor(y) & (HD - 1)) * HD) + (Math.floor(x) & (HD - 1))];

export type Shade = (x: number, y: number) => number;
export type Offset = (x: number, y: number) => number;

/**
 * Papel de pintura: cada pixel guarda material, luz (0–1), desvio de tom e a peça; `render` transforma em cor com os
 * 4 tons e o pontilhado. A peça pintada depois risca uma linha escura na de antes (folha da frente sobre o tronco).
 */
export class Paper {
  readonly mat: Int8Array;
  readonly shade: Float32Array;
  readonly off: Int8Array;
  readonly fixed: Int8Array;
  readonly part: Int16Array;
  private seq = 0;
  private group = 0;

  constructor(readonly tones: Rgb[][], readonly w = HD, readonly h = HD) {
    const n = w * h;
    this.mat = new Int8Array(n).fill(-1);
    this.shade = new Float32Array(n);
    this.off = new Int8Array(n);
    this.fixed = new Int8Array(n).fill(-1);
    this.part = new Int16Array(n);
  }

  /** Tudo que `draw` pintar vira uma peça só (sem linha entre os pedaços). */
  together<T>(draw: () => T): T {
    const outer = this.group;
    this.group = ++this.seq;
    try { return draw(); } finally { this.group = outer; }
  }

  /** Pinta a forma `test` dentro da caixa [x0, y0, x1, y1] (pixels). */
  fill(box: readonly [number, number, number, number], test: (x: number, y: number) => boolean, mat: number, shade: Shade, offset?: Offset) {
    const id = this.group || ++this.seq;
    for (let y = Math.max(0, Math.floor(box[1])); y <= Math.min(this.h - 1, Math.ceil(box[3])); y++)
      for (let x = Math.max(0, Math.floor(box[0])); x <= Math.min(this.w - 1, Math.ceil(box[2])); x++) {
        if (!test(x + 0.5, y + 0.5)) continue;
        const i = y * this.w + x;
        this.mat[i] = mat;
        this.shade[i] = shade(x + 0.5, y + 0.5);
        this.off[i] = offset ? offset(x, y) : 0;
        this.fixed[i] = -1;
        this.part[i] = id;
      }
    return id;
  }

  /** Um pixel num tom fixo. */
  px(x: number, y: number, mat: number, tone: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i] < 0) this.part[i] = ++this.seq;
    this.mat[i] = mat;
    this.fixed[i] = tone;
  }

  /** Pixel fixo só por cima do que já está pintado (risco, rachadura, brilho). */
  on(x: number, y: number, mat: number | null, tone: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i] < 0) return;
    if (mat !== null) this.mat[i] = mat;
    this.fixed[i] = tone;
  }

  /** Muda o tom de quem já está pintado. */
  nudge(x: number, y: number, delta: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (this.mat[i] >= 0) this.off[i] += delta;
  }

  has(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.mat[y * this.w + x] >= 0;
  }

  /** Pixels RGBA. `outline`: contorno escuro em volta das peças (objetos de pé; o chão vai sem). */
  render(outline: boolean, alpha = 255): Uint8ClampedArray {
    const tones = this.tones;
    const out = new Uint8ClampedArray(this.w * this.h * 4);
    const { w, h, mat, shade, off, fixed, part } = this;
    const put = (o: number, r: number, g: number, b: number, a: number) => { out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a; };
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const m = mat[i];
        if (m < 0) {
          if (!outline) continue;
          // Primeiro vizinho pintado (direita, baixo, esquerda, cima), sem alocar nada: é o laço mais quente da arte.
          const r = x + 1 < w && mat[i + 1] >= 0 ? i + 1 : -1;
          const d = y + 1 < h && mat[i + w] >= 0 ? i + w : -1;
          const n = r >= 0 ? r : d >= 0 ? d : x > 0 && mat[i - 1] >= 0 ? i - 1 : y > 0 && mat[i - w] >= 0 ? i - w : -1;
          if (n < 0) continue;
          // Do lado da luz o contorno puxa a cor do vizinho; na sombra é quase preto.
          const litSide = (n === r || n === d) && shade[n] > 0.62;
          const t0 = tones[mat[n]][0];
          if (litSide) put(i * 4, (t0[0] + OUTLINE[0]) / 2, (t0[1] + OUTLINE[1]) / 2, (t0[2] + OUTLINE[2]) / 2, 255);
          else put(i * 4, OUTLINE[0], OUTLINE[1], OUTLINE[2], 255);
          continue;
        }
        let tone: number;
        if (fixed[i] >= 0) tone = fixed[i];
        else {
          const v = shade[i] * 4 + (BAYER[(y & 1) * 2 + (x & 1)] - 0.5) * 0.55;
          tone = Math.max(1, Math.min(4, Math.floor(v) + 1)) + off[i];
          // A peça da frente risca a de trás.
          if (outline) {
            const pi = part[i];
            const front = (j: number) => mat[j] >= 0 && part[j] > pi && fixed[j] < 0;
            if ((x + 1 < w && front(i + 1)) || (x > 0 && front(i - 1)) || (y + 1 < h && front(i + w)) || (y > 0 && front(i - w))) tone = 0;
          }
        }
        const c = tones[m][tone < 0 ? 0 : tone > 5 ? 5 : tone];
        if (tone <= 0 && fixed[i] < 0) put(i * 4, (c[0] + OUTLINE[0]) / 2, (c[1] + OUTLINE[1]) / 2, (c[2] + OUTLINE[2]) / 2, alpha);
        else put(i * 4, c[0], c[1], c[2], alpha);
      }
    return out;
  }
}

/** Esfera achatada (luz de volume). */
export const sphere = (cx: number, cy: number, rx: number, ry: number): Shade => (x, y) => {
  const nx = (x - cx) / rx, ny = (y - cy) / ry;
  return lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
};
export const inEllipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
export const ebox = (cx: number, cy: number, rx: number, ry: number) => [cx - rx, cy - ry, cx + rx, cy + ry] as const;

export function ellipse(p: Paper, cx: number, cy: number, rx: number, ry: number, mat: number, offset?: Offset) {
  return p.fill(ebox(cx, cy, rx, ry), inEllipse(cx, cy, rx, ry), mat, sphere(cx, cy, rx, ry), offset);
}

export type Pt = readonly [number, number];

function seg(px: number, py: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const qx = a[0] + dx * t, qy = a[1] + dy * t;
  return { d: Math.hypot(px - qx, py - qy), t, sx: px - qx, sy: py - qy };
}

/** Cápsula afinando de `ra` para `rb`, com volume de cilindro. */
export function limb(p: Paper, a: Pt, b: Pt, ra: number, rb: number, mat: number, offset?: Offset) {
  const r = Math.max(ra, rb);
  return p.fill([Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r], (x, y) => {
    const s = seg(x, y, a, b);
    return s.d <= ra + (rb - ra) * s.t;
  }, mat, (x, y) => {
    const s = seg(x, y, a, b);
    const rad = ra + (rb - ra) * s.t;
    const nx = s.sx / rad, ny = s.sy / rad;
    return lit(nx, ny * 0.6 - 0.15, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
  }, offset);
}

const inPoly = (pts: readonly Pt[]) => (x: number, y: number) => {
  let on = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) on = !on;
  }
  return on;
};

/** Polígono com luz própria. */
export function poly(p: Paper, pts: readonly Pt[], mat: number, shade: Shade, offset?: Offset) {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return p.fill([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], inPoly(pts), mat, shade, offset);
}

/** Linha de 1 px num tom fixo, só por cima do que já está pintado (`over`) ou em qualquer lugar. */
export function line(p: Paper, a: Pt, b: Pt, mat: number | null, tone: number, over = true) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
  for (let k = 0; k <= n; k++) {
    const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
    if (over) p.on(x, y, mat, tone);
    else if (mat !== null) p.px(x, y, mat, tone);
  }
}
// --- Montagem -----------------------------------------------------------------------------

/** Pinta pixels RGBA num canvas (`w` × `h`). */
export function toCanvas(pixels: Uint8ClampedArray, w = HD, h = HD) {
  const { canvas, ctx } = makeCanvas(w, h);
  const image = ctx.createImageData(w, h);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * Atlas de tiles de 128 px numa grade de 16 colunas (cabe no limite de textura dos celulares): cada quadro é pintado
 * só se o mapa usar. Devolve o canvas e o índice de cada chave.
 */
export class TileAtlas {
  private frames: (() => Uint8ClampedArray)[] = [];
  private keys = new Map<string, number>();
  static readonly COLUMNS = 16;
  /** Margem de cada quadro, com a borda repetida: desenhado em ¼, o tile não puxa pixel do vizinho do atlas. */
  static readonly PAD = 2;

  /** Índice do quadro desta chave (pinta depois, em `build`). */
  frame(key: string, draw: () => Uint8ClampedArray) {
    let i = this.keys.get(key);
    if (i === undefined) {
      i = this.frames.length;
      this.keys.set(key, i);
      this.frames.push(draw);
    }
    return i;
  }

  get count() { return this.frames.length; }

  /** Pixels do quadro `i` (pinta na hora; para prévias fora do jogo). */
  pixels(i: number) { return this.frames[i](); }

  build() {
    const cols = TileAtlas.COLUMNS;
    const pad = TileAtlas.PAD;
    const cell = HD + pad * 2;
    const rows = Math.max(1, Math.ceil(this.frames.length / cols));
    const { canvas, ctx } = makeCanvas(cols * cell, rows * cell);
    const image = ctx.createImageData(cell, cell);
    const px = image.data;
    this.frames.forEach((draw, i) => {
      const src = draw();
      for (let y = 0; y < cell; y++) {
        const sy = Math.min(HD - 1, Math.max(0, y - pad));
        for (let x = 0; x < cell; x++) {
          const sx = Math.min(HD - 1, Math.max(0, x - pad));
          const s = (sy * HD + sx) * 4, o = (y * cell + x) * 4;
          px[o] = src[s]; px[o + 1] = src[s + 1]; px[o + 2] = src[s + 2]; px[o + 3] = src[s + 3];
        }
      }
      ctx.putImageData(image, (i % cols) * cell, Math.floor(i / cols) * cell);
    });
    return canvas;
  }
}
