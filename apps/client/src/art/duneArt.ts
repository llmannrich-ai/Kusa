import { ramp, rgb, type Rgb } from "./hero/color.ts";
import { makeCanvas } from "./pixels.ts";

/**
 * Arte de Dunas Cantantes e Mesas de Solária, no padrão novo (`docs/ARTE_TIBIA.md`): **128 px por tile**, luz de cima
 * à esquerda em 4 faixas com pontilhado só na fronteira, 4 tons por material (6 na rampa: linha, sombra, meia-sombra,
 * base, luz, brilho), contorno quase preto nos objetos de pé e nenhum no chão. Só estes dois mapas usam este arquivo,
 * e sempre (com ou sem a opção Arte nova): não há arte antiga deles.
 *
 * Tudo é pintado por código, pixel a pixel, sem `Math.random`: o mesmo desenho em todo aparelho. O chão emenda de um
 * tile para o outro porque toda textura que encosta na borda é periódica em 128 px (ou some na borda).
 */

/** Pixels de arte por tile. */
export const HD = 128;

export type DuneVariant = "dunes" | "mesas";

/** Materiais (cada um é uma rampa de 6 tons por variante). */
export enum M { Sand, Soft, Dune, Rock, Cap, Band, Dark, Water, Deep, Foam, Wet, Trunk, Leaf, Dry, Stone, Glow, Bone, Shrub, Ruin, Clay, Line }

/** Cores base dos materiais nas duas variantes: Dunas em ocre claro, Mesas em arenito vermelho. */
const BASES: Record<DuneVariant, Record<M, [string, number, number?, boolean?]>> = {
  dunes: {
    [M.Sand]: ["#d6ad74", 0.62, 5], [M.Soft]: ["#e6c995", 0.5, 5], [M.Dune]: ["#d4ad78", 0.85, 4],
    [M.Rock]: ["#b78a5c", 0.95, 6], [M.Cap]: ["#c99a64", 0.85, 5], [M.Band]: ["#ddb47c", 0.8, 5], [M.Dark]: ["#8e6444", 0.9, 6],
    [M.Water]: ["#3ea6a4", 0.9, 8], [M.Deep]: ["#1f6c8a", 0.9, 8], [M.Foam]: ["#eef4ea", 0.35, 4], [M.Wet]: ["#a9865a", 0.6, 5],
    [M.Trunk]: ["#8a6642", 1, 6], [M.Leaf]: ["#6d9c3a", 1, 9], [M.Dry]: ["#b8a056", 0.9, 6],
    [M.Stone]: ["#9a8a76", 1.1, 5], [M.Glow]: ["#5ad2e6", 1.2, 10, true], [M.Bone]: ["#e2d8bc", 0.8, 5],
    [M.Shrub]: ["#8a8a48", 0.95, 7], [M.Ruin]: ["#cfa36c", 1, 6], [M.Clay]: ["#b0703f", 1, 7], [M.Line]: ["#3a2618", 0.4, 0],
  },
  mesas: {
    [M.Sand]: ["#cf9564", 0.62, 5], [M.Soft]: ["#e2b384", 0.5, 5], [M.Dune]: ["#d29a62", 0.95, 6],
    [M.Rock]: ["#b0603c", 1.05, 7], [M.Cap]: ["#9c7058", 0.8, 5], [M.Band]: ["#d9a070", 0.85, 6], [M.Dark]: ["#7e3e2a", 0.95, 7],
    [M.Water]: ["#4a9e90", 0.9, 8], [M.Deep]: ["#2a6870", 0.9, 8], [M.Foam]: ["#eef0e2", 0.35, 4], [M.Wet]: ["#9a6a48", 0.6, 5],
    [M.Trunk]: ["#86603e", 1, 6], [M.Leaf]: ["#6a9640", 1, 9], [M.Dry]: ["#b08e50", 0.9, 6],
    [M.Stone]: ["#a86a46", 1.1, 6], [M.Glow]: ["#ffb347", 1.2, 10, true], [M.Bone]: ["#e2d6ba", 0.8, 5],
    [M.Shrub]: ["#7e8a4c", 0.95, 7], [M.Ruin]: ["#c08a5c", 1, 6], [M.Clay]: ["#a8643c", 1, 7], [M.Line]: ["#341c14", 0.4, 0],
  },
};

const OUTLINE: Rgb = rgb("#1a1210");
const BAYER = [0, 0.5, 0.75, 0.25];
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

const rampCache = new Map<DuneVariant, Rgb[][]>();
/** Rampas de 6 tons por material: as das duas variantes daqui ou uma tabela pronta (os Portões do Império). */
function ramps(variant: DuneVariant | Rgb[][]): Rgb[][] {
  if (typeof variant !== "string") return variant;
  let r = rampCache.get(variant);
  if (!r) {
    const bases = BASES[variant];
    r = Object.values(M).filter((v): v is M => typeof v === "number")
      .map((m) => { const [hex, contrast, shift = 6, shine = false] = bases[m]; return ramp(hex, { contrast, shift, shine }).map(rgb); });
    rampCache.set(variant, r);
  }
  return r;
}

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

  constructor(readonly variant: DuneVariant | Rgb[][], readonly w = HD, readonly h = HD) {
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
    const tones = ramps(this.variant);
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

// --- Chão ---------------------------------------------------------------------------------

/** Ondulação do vento: linhas leste-oeste a cada `period` px, com onda periódica (some na borda esquerda e direita). */
function ripple(x: number, y: number, amp: number, amp2: number, period: number) {
  const wob = amp * Math.sin((2 * Math.PI * x) / HD) + amp2 * Math.sin((4 * Math.PI * x) / HD);
  return ((Math.floor(y + wob) % period) + period) % period;
}

/** Areia firme: ondulações do vento (mais fortes ou mais suaves por variação), grãos e pedrinhas soltas. */
function sandTile(variant: DuneVariant, v: number): Paper {
  const p = new Paper(variant);
  const amp = [3, 5, 2, 6, 4, 1.5, 5.5, 3.5][v % 8];
  const amp2 = [1.5, -2, 1, 2.5, -1, 0.5, -2.5, 2][v % 8];
  const strong = v % 3 !== 2;
  p.fill([0, 0, HD - 1, HD - 1], () => true, M.Sand, () => FLAT, (x, y) => {
    const r = ripple(x, y, amp, amp2, 16);
    // O sulco da ondulação escurece; logo acima dele, a crista pega luz.
    if (r === 0 && (strong || noise(x >> 3, y, 4) < 0.6)) return -1;
    if (r === 15 && strong && noise(x, y, 5) < 0.7) return 1;
    if (r === 1 && noise(x, y, 6) < 0.3) return -1;
    const n = noise(x, y, v + 11);
    return n < 0.025 ? -1 : n > 0.985 ? 1 : 0;
  });
  return p;
}

/** Areia fofa: sem ondulação, em montinhos macios (ruído suave periódico) e cheia de covas de pisada. */
function softTile(variant: DuneVariant, v: number): Paper {
  const p = new Paper(variant);
  p.fill([0, 0, HD - 1, HD - 1], () => true, M.Soft, (x, y) => {
    const n = sn(x, y, 32, 40) - 0.5;
    const m = sn(x, y, 16, 60) - 0.5;
    return FLAT + n * 0.2 + m * 0.08;
  }, (x, y) => (noise(x, y, v + 70) < 0.02 ? -1 : noise(x, y, v + 71) > 0.988 ? 1 : 0));
  // Covas: a areia afunda e a borda de baixo à direita pega luz (o sol vem do outro lado).
  for (let k = 0; k < 3 + (v % 3); k++) {
    const cx = 18 + noise(k, v, 72) * 92, cy = 18 + noise(v, k, 73) * 92;
    const rx = 4 + noise(k, v, 74) * 4, ry = rx * (0.6 + noise(k, v, 75) * 0.3);
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1.15) continue;
        const side = (x - cx) / rx + (y - cy) / ry;
        if (d <= 1) p.on(x, y, null, side < 0 ? 1 : 2);
        else if (side > 0.4) p.on(x, y, null, 4);
      }
  }
  return p;
}

/**
 * Arena: nas Dunas, a bacia de sal endurecido (areia clara e lisa com rachaduras finas e falhadas); nas Mesas, laje de
 * arenito em placas grandes. As rachaduras andam em ondas periódicas, então seguem de um tile para o outro.
 */
function arenaTile(variant: DuneVariant, v: number): Paper {
  const p = new Paper(variant);
  const mesas = variant === "mesas";
  p.fill([0, 0, HD - 1, HD - 1], () => true, mesas ? M.Cap : M.Soft, (x, y) => FLAT + (sn(x, y, 32, 85) - 0.5) * 0.12, (x, y) => {
    const n = noise(x, y, v + 90);
    return n < 0.02 ? -1 : n > 0.99 ? 1 : 0;
  });
  // Rachaduras que se ramificam, só por dentro (não encostam na borda, então não desenham a grade).
  for (let k = 0; k < 2 + v; k++) {
    let x = 24 + noise(k, v, 87) * 80, y = 24 + noise(v, k, 88) * 80, a = noise(k, k + v, 89) * Math.PI * 2;
    for (let s = 0; s < 16; s++) {
      a += (noise(s, k + v * 7, 91) - 0.5) * 1.1;
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3;
      if (nx < 10 || ny < 10 || nx > HD - 10 || ny > HD - 10) break;
      line(p, [x, y], [nx, ny], null, mesas ? 1 : 2);
      line(p, [x + 1, y + 1], [nx + 1, ny + 1], null, 4);
      x = nx; y = ny;
    }
  }
  return p;
}

// --- Dunas (relevo) ---------------------------------------------------------------------

/**
 * Tile de duna pela altura nos 4 cantos (0 = pé, no nível da areia; até 4 no alto da cordilheira). A altura dentro do
 * tile é a mistura dos cantos com um perfil que arredonda o topo; a luz vem da inclinação. A encosta leste (a de
 * sotavento) é mais íngreme e fica na sombra; a crista, onde a luz vira, ganha um fio claro. Ondulações no topo e
 * areia escorrendo na encosta íngreme. Como a altura na borda depende só dos 2 cantos dela, os tiles emendam.
 */
export function duneTile(variant: DuneVariant, h: readonly [number, number, number, number], v: number): Paper {
  const p = new Paper(variant);
  const [a, b, c, d] = h;
  const N = HD + 2;
  // Altura em cada pixel (com 1 de folga em volta, para a inclinação). A crista serpenteia dentro do tile: o ponto
  // amostrado anda para os lados com uma onda que some nas bordas esquerda e direita (onde o vizinho emenda).
  const hgt = new Float32Array(N * N);
  for (let y = -1; y <= HD; y++)
    for (let x = -1; x <= HD; x++) {
      const wob = 7 * Math.sin((Math.PI * x) / HD) * Math.sin((2 * Math.PI * y) / 64 + 0.8);
      const u = Math.min(1, Math.max(0, (x + 0.5 + wob) / HD)), w = Math.min(1, Math.max(0, (y + 0.5) / HD));
      const t = a * (1 - u) * (1 - w) + b * u * (1 - w) + c * (1 - u) * w + d * u * w;
      hgt[(y + 1) * N + x + 1] = 4 * (1 - Math.max(0, 1 - t / 4) ** 1.7);
    }
  const H = (x: number, y: number) => hgt[(y + 1) * N + x + 1];
  const gx = new Float32Array(HD * HD);
  const gy = new Float32Array(HD * HD);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      let dx = ((H(x + 1, y) - H(x - 1, y)) / 2) * HD * 0.34;
      // Sotavento (descendo para o leste): mais íngreme.
      if (dx < 0) dx *= 1.6;
      gx[y * HD + x] = dx;
      gy[y * HD + x] = ((H(x, y + 1) - H(x, y - 1)) / 2) * HD * 0.34;
    }
  p.fill([0, 0, HD - 1, HD - 1], () => true, M.Dune, (x, y) => {
    const i = Math.floor(y) * HD + Math.floor(x);
    // Luz da inclinação, apertada perto da luz do chão: a duna sobe macia, sem faixas fortes.
    return FLAT + (lit(-gx[i], -gy[i], 1) - FLAT) * 0.95;
  }, (x, y) => {
    const i = y * HD + x;
    const slope = Math.hypot(gx[i], gy[i]);
    if (slope < 0.18) {
      // Topo e pé: ondulação do vento, como no chão.
      const r = ripple(x, y, 3 + (v % 2) * 2, 1.5, 16);
      if (r === 0) return -1;
      if (r === 15 && noise(x, y, 7) < 0.6) return 1;
    } else {
      // Encosta: as ondulações dão a volta na duna, seguindo a curva de nível (a altura emenda, então elas também).
      const k = H(x, y) * 1.4 + sn(x, y, 32, 30) * 0.4;
      const f = k - Math.floor(k);
      if (gx[i] > 0 && f < 0.05 && noise(x >> 2, y, 32) < 0.75) return -1;
      if (gx[i] > 0 && f > 0.95 && noise(x, y, 33) < 0.5) return 1;
      // Areia escorrendo na encosta íngreme de sotavento: riscos finos descendo.
      if (gx[i] < -0.5 && (x + Math.floor(sn(x, y, 16, 34) * 6)) % 13 === 0 && noise(x >> 2, y >> 4, 31) < 0.3) return -1;
    }
    const n = noise(x, y, v + 21);
    return n < 0.02 ? -1 : n > 0.99 ? 1 : 0;
  });
  // Crista: onde a encosta passa de iluminada (oeste) para a sombra (leste), um fio de luz.
  for (let y = 0; y < HD; y++)
    for (let x = 1; x < HD - 1; x++) {
      if (gx[y * HD + x - 1] > 0.06 && gx[y * HD + x + 1] < -0.06) { p.on(x, y, null, 5); p.on(x + 1, y, null, 4); }
    }
  return p;
}

// --- Platôs das Mesas (e o muro das ruínas) -------------------------------------------------

/** Bits de vizinho aberto (chão) de um tile de rocha. */
export const OPEN = { n: 1, e: 2, s: 4, w: 8, ne: 16, nw: 32, se: 64, sw: 128 } as const;

/** Altura da face de um paredão (px) no tile de baixo do platô. */
const FACE = 96;

/**
 * Platô de arenito pelos vizinhos abertos: tampo plano com rachaduras e pedrinhas; borda clara no norte e no oeste
 * (pegam sol), borda escura no leste; com chão ao sul, a **face do paredão** ocupa a parte de baixo do tile, em
 * camadas de sedimento (claras, vermelhas e escuras, com a linha ondulada), fendas verticais e entulho no pé.
 */
export function mesaTile(variant: DuneVariant, open: number, v: number): Paper {
  const p = new Paper(variant);
  const south = (open & OPEN.s) !== 0;
  const top = south ? HD - FACE : HD;
  // Tampo.
  p.fill([0, 0, HD - 1, top - 1], () => true, M.Cap, (x, y) => {
    const n = sn(x, y, 32, 100) - 0.5;
    return FLAT + n * 0.18;
  }, (x, y) => {
    const n = noise(x, y, v + 101);
    return n < 0.03 ? -1 : n > 0.985 ? 1 : 0;
  });
  // Manchas de rocha mais escura e pedrinhas soltas no tampo.
  for (let y = 0; y < top; y++)
    for (let x = 0; x < HD; x++) {
      if (sn(x, y, 16, 99) < 0.3) p.nudge(x, y, -1);
      else if (noise(x, y, 98 + v) < 0.006) { p.on(x, y, null, 5); p.on(x + 1, y + 1, null, 1); }
    }
  // Rachaduras do tampo (só por dentro: não chegam na borda).
  for (let k = 0; k < 2; k++) {
    let x = 20 + noise(k, v, 102) * 88, y = 14 + noise(v, k, 103) * Math.max(10, top - 40);
    for (let s = 0; s < 22; s++) {
      const nx = x + (noise(s, k + v, 104) - 0.5) * 6, ny = y + 2.2;
      if (ny > top - 8) break;
      line(p, [x, y], [nx, ny], null, 1);
      line(p, [x + 1, y], [nx + 1, ny], null, 4);
      x = nx; y = ny;
    }
  }
  // Bordas do tampo: luz no norte e no oeste (duas faixas, a de fora mais clara), sombra no leste; beira lascada.
  const rim = 16;
  for (let y = 0; y < top; y++)
    for (let x = 0; x < HD; x++) {
      const jag = Math.floor(noise(x >> 2, y >> 2, 105) * 4);
      if (open & OPEN.n && y < rim - jag) p.on(x, y, null, y < 4 - (jag >> 1) ? 5 : 4);
      if (open & OPEN.w && x < rim - jag) p.on(x, y, null, x < 4 - (jag >> 1) ? 5 : 4);
      if (open & OPEN.e && x > HD - rim - 1 + jag) p.on(x, y, null, x > HD - 5 + (jag >> 1) ? 1 : 2);
      if (open & OPEN.nw && !(open & (OPEN.n | OPEN.w)) && x + y < 9) p.on(x, y, null, 5);
      if (open & OPEN.ne && !(open & (OPEN.n | OPEN.e)) && HD - 1 - x + y < 9) p.on(x, y, null, 2);
    }
  if (!south) return p;
  // Face do paredão: camadas horizontais onduladas, mais escuras para baixo; a ponta leste fica na sombra.
  const layers: [number, M][] = [[0, M.Band], [14, M.Rock], [30, M.Band], [40, M.Dark], [50, M.Rock], [68, M.Band], [76, M.Rock]];
  const layerAt = (x: number, y: number) => {
    const wob = 2 * Math.sin((2 * Math.PI * x) / HD + 1) + 1.2 * Math.sin((6 * Math.PI * x) / HD);
    const d = y - top + wob * (y - top > 6 ? 1 : 0);
    let mat = layers[0][1];
    for (const [from, m] of layers) if (d >= from) mat = m;
    return mat;
  };
  for (let y = top; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const t = (y - top) / FACE;
      const east = open & OPEN.e ? Math.max(0, (x - (HD - 28)) / 28) : 0;
      const west = open & OPEN.w ? Math.max(0, (24 - x) / 24) : 0;
      const shade = 0.58 - t * 0.28 - east * 0.3 + west * 0.12;
      p.fill([x, y, x, y], () => true, layerAt(x, y), () => shade, () => 0);
    }
  // Lábio do tampo (luz) e a sombra logo abaixo dele.
  for (let x = 0; x < HD; x++) {
    p.on(x, top, null, 5);
    p.on(x, top + 1, null, 4);
    p.on(x, top + 2 + (noise(x >> 2, 1, 106) < 0.5 ? 1 : 0), null, 0);
    p.on(x, top + 3, null, 1);
  }
  // Fendas verticais e blocos soltos na face.
  for (let k = 0; k < 3; k++) {
    let x = 12 + noise(k, v, 107) * 104;
    for (let y = top + 5; y < HD - 6; y++) {
      if (noise(k, y >> 3, 108 + v) < 0.25) x += noise(y, k, 109) < 0.5 ? -1 : 1;
      p.on(x, y, null, 0);
      p.on(x - 1, y, null, 4);
    }
  }
  // Entulho no pé da face.
  for (let k = 0; k < 6; k++) {
    const cx = 6 + noise(k, v, 110) * 116, cy = HD - 4 - noise(v, k, 111) * 6, r = 2 + noise(k, k + v, 112) * 3;
    ellipse(p, cx, cy, r * 1.3, r, M.Rock);
  }
  return p;
}

/**
 * Muro das ruínas pelos vizinhos que também são muro (bits de `OPEN`, aqui "tem muro") e se há chão ao sul. Nas Dunas,
 * blocos de arenito meio cobertos de areia; nas Mesas, taipa (barro com palha) de topo arredondado. A ponta solta do
 * muro fica quebrada.
 */
export function ruinTile(variant: DuneVariant, joins: number, south: boolean, v: number): Paper {
  const p = new Paper(variant);
  const mesas = variant === "mesas";
  const mat = mesas ? M.Clay : M.Ruin;
  // Areia por baixo (o tile de muro também mostra o chão em volta do muro).
  const ground = sandTile(variant, v + 3);
  p.mat.set(ground.mat); p.shade.set(ground.shade); p.off.set(ground.off);
  // O muro: faixa no meio, ligando-se aos vizinhos de muro; o tampo em cima e a face ao sul.
  const half = 30;
  const x0 = joins & OPEN.w ? 0 : 64 - half - (noise(v, 1, 120) * 8);
  const x1 = joins & OPEN.e ? HD - 1 : 64 + half + (noise(v, 2, 121) * 8);
  const y0 = joins & OPEN.n ? 0 : 24;
  const y1 = joins & OPEN.s ? HD - 1 : HD - 26;
  const capBottom = south ? Math.min(y1, HD - 46) : y1;
  const broken = (x: number, y: number) => {
    // Ponta solta: borda irregular de blocos caídos.
    const jag = noise(x >> 3, y >> 3, 122 + v) * 14;
    if (!(joins & OPEN.w) && x < x0 + jag) return true;
    if (!(joins & OPEN.e) && x > x1 - jag) return true;
    if (!(joins & OPEN.n) && y < y0 + jag * 0.6) return true;
    return false;
  };
  const block = (x: number, y: number) => {
    // Fiadas de blocos: juntas horizontais a cada 16 px e verticais desencontradas.
    const row = Math.floor(y / 16);
    const jx = ((x + (row % 2) * 12) % 24 + 24) % 24;
    return (y % 16 === 0 || jx === 0) ? -1 : 0;
  };
  p.fill([x0, y0, x1, capBottom], (x, y) => !broken(x, y), mat, (x, y) => {
    if (mesas) {
      const u = Math.min(1, Math.min(x - x0, x1 - x) / 10);
      return lit(0, 0, 1) - (1 - u) * 0.15;
    }
    return FLAT;
  }, (x, y) => (mesas ? (noise(x, y, 123) < 0.06 ? -1 : noise(x, y, 124) < 0.03 ? 1 : 0) : block(x, y)));
  if (south) {
    p.fill([x0, capBottom, x1, HD - 1], (x, y) => !broken(x, y), mat, (x, y) => 0.5 - ((y - capBottom) / 46) * 0.25,
      (x, y) => (mesas ? (noise(x >> 1, y, 125) < 0.1 ? -1 : 0) : block(x, y + 8)));
    for (let x = Math.ceil(x0); x <= x1; x++) { p.on(x, capBottom, null, 5); p.on(x, capBottom + 1, null, 1); }
  }
  // Areia empilhada no lado norte do muro (o vento vem do norte).
  for (let y = Math.max(0, y0 - 2); y < y0 + 26; y++)
    for (let x = Math.floor(x0); x <= x1; x++) {
      const drift = 10 + sn(x, 0, 32, 126) * 14;
      if (y - y0 < drift && p.has(x, y) && p.mat[y * HD + x] === mat && noise(x >> 2, y >> 2, 127) < 0.8) {
        p.mat[y * HD + x] = M.Soft; p.fixed[y * HD + x] = -1; p.shade[y * HD + x] = FLAT + 0.08; p.off[y * HD + x] = 0;
      }
    }
  return p;
}

// --- Água ---------------------------------------------------------------------------------

/**
 * Água do oásis pelos vizinhos que são terra (bits de `OPEN`): funda no meio, rasa e mais clara perto da margem, com a
 * espuma na beira e a margem arredondada nas quinas; o fundo de areia aparece no raso.
 */
export function waterTile(variant: DuneVariant, land: number, v: number): Paper {
  const p = new Paper(variant);
  const dist = (x: number, y: number) => {
    let d = 1e9;
    if (land & OPEN.n) d = Math.min(d, y);
    if (land & OPEN.s) d = Math.min(d, HD - 1 - y);
    if (land & OPEN.w) d = Math.min(d, x);
    if (land & OPEN.e) d = Math.min(d, HD - 1 - x);
    if (land & OPEN.nw) d = Math.min(d, Math.hypot(x, y));
    if (land & OPEN.ne) d = Math.min(d, Math.hypot(HD - 1 - x, y));
    if (land & OPEN.sw) d = Math.min(d, Math.hypot(x, HD - 1 - y));
    if (land & OPEN.se) d = Math.min(d, Math.hypot(HD - 1 - x, HD - 1 - y));
    return d;
  };
  // Quinas de fora (terra dos dois lados): a água recua num arco.
  const corner = (x: number, y: number) =>
    (land & OPEN.n && land & OPEN.w && Math.hypot(Math.max(0, 22 - x), Math.max(0, 22 - y)) > 22)
    || (land & OPEN.n && land & OPEN.e && Math.hypot(Math.max(0, x - (HD - 23)), Math.max(0, 22 - y)) > 22)
    || (land & OPEN.s && land & OPEN.w && Math.hypot(Math.max(0, 22 - x), Math.max(0, y - (HD - 23))) > 22)
    || (land & OPEN.s && land & OPEN.e && Math.hypot(Math.max(0, x - (HD - 23)), Math.max(0, y - (HD - 23))) > 22);
  const ground = sandTile(variant, v + 5);
  p.mat.set(ground.mat); p.shade.set(ground.shade); p.off.set(ground.off);
  for (let i = 0; i < p.mat.length; i++) p.mat[i] = M.Wet;
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (corner(x, y)) continue;
      const d = dist(x, y) + sn(x, y, 16, 130) * 6 - 3;
      const i = y * HD + x;
      if (d < 3) { p.mat[i] = M.Foam; p.shade[i] = 0.75; p.off[i] = noise(x, y, 131) < 0.3 ? -1 : 0; continue; }
      const deep = d > 34;
      p.mat[i] = deep ? M.Deep : M.Water;
      p.shade[i] = deep ? 0.5 + (sn(x, y, 32, 132) - 0.5) * 0.1 : 0.72 - Math.min(1, d / 34) * 0.25;
      // Marolas: riscos claros curtos, na diagonal do vento.
      const wave = ((x + y * 2 + Math.floor(sn(x, y, 32, 133) * 20)) % 23 + 23) % 23;
      p.off[i] = wave === 0 && noise(x >> 2, y, 134) < 0.5 ? 1 : 0;
      p.fixed[i] = -1;
    }
  return p;
}

// --- Bordas (por cima do chão, com transparência) ------------------------------------------

/**
 * Areia fofa entrando na firme, pelos vizinhos fofos (bits de `OPEN`: lados e quinas soltas). A beira é ondulada e a
 * onda vale o mesmo nas duas pontas de cada lado, então a borda segue de um tile para o outro.
 */
export function softEdge(variant: DuneVariant, soft: number): Paper {
  const p = new Paper(variant);
  const depth = (t: number, seed: number) => 16 + 7 * Math.sin((2 * Math.PI * t) / HD * 2) * (seed % 2 ? 1 : -1) + 3 * Math.sin((6 * Math.PI * t) / HD);
  const inside = (x: number, y: number): boolean => Boolean(
    (soft & OPEN.n && y < depth(x, 1)) || (soft & OPEN.s && HD - 1 - y < depth(x, 2))
    || (soft & OPEN.w && x < depth(y, 3)) || (soft & OPEN.e && HD - 1 - x < depth(y, 4))
    || (soft & OPEN.nw && Math.hypot(x, y) < 18) || (soft & OPEN.ne && Math.hypot(HD - 1 - x, y) < 18)
    || (soft & OPEN.sw && Math.hypot(x, HD - 1 - y) < 18) || (soft & OPEN.se && Math.hypot(HD - 1 - x, HD - 1 - y) < 18));
  p.fill([0, 0, HD - 1, HD - 1], inside, M.Soft, (x, y) => FLAT + (sn(x, y, 32, 41) - 0.5) * 0.3,
    (x, y) => (noise(x, y, 70) < 0.02 ? -1 : 0));
  // Beira: a areia fofa faz um degrau macio (sombra do lado de baixo à direita, luz do de cima à esquerda).
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!p.has(x, y)) continue;
      const out = (dx: number, dy: number) => !p.has(x + dx, y + dy) && x + dx >= 0 && y + dy >= 0 && x + dx < HD && y + dy < HD;
      if (out(1, 0) || out(0, 1)) p.on(x, y, null, 2);
      else if (out(-1, 0) || out(0, -1)) p.on(x, y, null, 4);
    }
  return p;
}

/** Areia molhada em volta da água (no chão vizinho do oásis), mais escura perto da margem. */
export function wetEdge(variant: DuneVariant, water: number): Paper {
  const p = new Paper(variant);
  const dist = (x: number, y: number) => Math.min(
    water & OPEN.n ? y : 1e9, water & OPEN.s ? HD - 1 - y : 1e9, water & OPEN.w ? x : 1e9, water & OPEN.e ? HD - 1 - x : 1e9,
    water & OPEN.nw ? Math.hypot(x, y) : 1e9, water & OPEN.ne ? Math.hypot(HD - 1 - x, y) : 1e9,
    water & OPEN.sw ? Math.hypot(x, HD - 1 - y) : 1e9, water & OPEN.se ? Math.hypot(HD - 1 - x, HD - 1 - y) : 1e9,
  );
  const reach = (x: number, y: number) => 34 + (sn(x, y, 32, 140) - 0.5) * 20;
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => dist(x, y) < reach(x, y), M.Wet, (x, y) => 0.5 + Math.min(1, dist(x, y) / reach(x, y)) * 0.15,
    (x, y) => (dist(x, y) > reach(x, y) - 6 && noise(x, y, 141) < 0.5 ? 1 : noise(x, y, 142) < 0.03 ? -1 : 0));
  return p;
}

/** Sombra das dunas e dos platôs no chão (o sol vem do noroeste): faixa a leste e ao sul do que é alto. */
export function shadowEdge(variant: DuneVariant, from: number, long: boolean): Uint8ClampedArray {
  const out = new Uint8ClampedArray(HD * HD * 4);
  const reach = long ? 46 : 30;
  const color = variant === "mesas" ? [70, 26, 30] : [92, 52, 40];
  const wob = Float32Array.from({ length: HD }, (_, t) => reach + 6 * Math.sin((2 * Math.PI * t) / HD * 2));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      let d = 1e9;
      if (from & OPEN.n) d = Math.min(d, y / wob[x]);
      if (from & OPEN.w) d = Math.min(d, x / wob[y]);
      if (from & OPEN.nw && !(from & (OPEN.n | OPEN.w))) d = Math.min(d, Math.hypot(x, y) / reach);
      if (d >= 1) continue;
      // Duas faixas, a de perto mais escura; pontilhado na fronteira.
      const v = (1 - d) * 2 + (BAYER[(y & 1) * 2 + (x & 1)] - 0.5) * 0.6;
      const a = v > 1.2 ? 0.34 : v > 0.35 ? 0.2 : 0;
      if (!a) continue;
      out.set([color[0], color[1], color[2], Math.round(a * 255)], (y * HD + x) * 4);
    }
  return out;
}

// --- Enfeites rasteiros (contorno; de pé, mas baixos) ---------------------------------------

export const FLAT_DECOR = ["pebbles", "skull", "shells", "snake", "tracks", "grass", "shards", "crack", "bones", "stones"] as const;
export type FlatDecor = (typeof FLAT_DECOR)[number];

export function flatDecor(variant: DuneVariant, kind: FlatDecor, v: number): Paper {
  const p = new Paper(variant);
  const r = (k: number) => noise(k, v, 150 + FLAT_DECOR.indexOf(kind));
  switch (kind) {
    case "pebbles":
      for (let k = 0; k < 6; k++) ellipse(p, 30 + r(k) * 68, 34 + r(k + 9) * 60, 3 + r(k + 3) * 4, 2.4 + r(k + 5) * 3, k % 3 ? M.Stone : M.Rock);
      break;
    case "stones":
      p.together(() => {
        ellipse(p, 58, 70, 15, 10, M.Stone);
        ellipse(p, 76, 76, 10, 7, M.Stone);
      });
      ellipse(p, 46, 80, 6, 4, M.Rock);
      break;
    case "skull": {
      // Crânio de boi: chifres para os lados, órbitas e focinho comprido.
      limb(p, [44, 52], [26, 40], 3.2, 1.6, M.Bone);
      limb(p, [84, 52], [102, 40], 3.2, 1.6, M.Bone);
      p.together(() => {
        ellipse(p, 64, 56, 18, 13, M.Bone);
        ellipse(p, 64, 76, 10, 14, M.Bone);
      });
      for (const s of [-1, 1]) ellipse(p, 64 + s * 8, 56, 4.2, 3.6, M.Line);
      ellipse(p, 61, 86, 1.6, 1.4, M.Line);
      ellipse(p, 67, 86, 1.6, 1.4, M.Line);
      break;
    }
    case "shells":
      for (let k = 0; k < 4; k++) {
        const cx = 34 + r(k) * 60, cy = 40 + r(k + 4) * 50;
        const id = ellipse(p, cx, cy, 6, 5, M.Bone);
        for (let s = -2; s <= 2; s++) line(p, [cx, cy + 4], [cx + s * 2.6, cy - 4], null, 2);
        void id;
      }
      break;
    case "snake":
      // Rastro de cobra: ondas de covinhas na areia, sem contorno.
      for (let t = 0; t < 110; t += 1) {
        const x = 9 + t, y = 64 + Math.sin(t / 9) * 12;
        p.px(x, y, M.Sand, 1);
        p.px(x, y + 1, M.Sand, 4);
      }
      break;
    case "tracks":
      for (let k = 0; k < 5; k++) {
        const x = 30 + k * 16 + (k % 2) * 6, y = 100 - k * 18;
        for (const [dx, dy] of [[0, 0], [5, -2]]) ellipse(p, x + dx, y + dy, 3.5, 4.5, M.Sand);
      }
      break;
    case "grass":
      // Capim seco: talos finos saindo de um tufo.
      for (let k = 0; k < 11; k++) {
        const a = -Math.PI / 2 + (k - 5) * 0.16 + (r(k) - 0.5) * 0.2;
        const len = 18 + r(k + 11) * 18;
        limb(p, [64 + (k - 5) * 1.6, 86], [64 + Math.cos(a) * len + (k - 5) * 2, 86 + Math.sin(a) * len], 1.4, 0.6, k % 3 ? M.Dry : M.Shrub);
      }
      break;
    case "shards":
      for (let k = 0; k < 5; k++) {
        const cx = 32 + r(k) * 64, cy = 40 + r(k + 7) * 50, s = 4 + r(k + 2) * 5;
        poly(p, [[cx - s, cy], [cx, cy - s * 0.8], [cx + s, cy + s * 0.2], [cx + s * 0.2, cy + s * 0.8]], M.Clay, () => 0.6 + r(k + 3) * 0.3);
      }
      break;
    case "crack": {
      // Chão de barro rachado (Mesas) ou sal (Dunas): placas com bordas que levantam.
      const cx = 64, cy = 66;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + r(k) * 0.5;
        const pts: Pt[] = [[cx, cy], [cx + Math.cos(a) * 30, cy + Math.sin(a) * 22], [cx + Math.cos(a + 0.8) * 30, cy + Math.sin(a + 0.8) * 22]];
        poly(p, pts, variant === "mesas" ? M.Clay : M.Bone, () => 0.58 + r(k + 1) * 0.12);
      }
      break;
    }
    case "bones":
      limb(p, [36, 70], [70, 60], 2.4, 2.4, M.Bone);
      for (const e of [[36, 70], [70, 60]] as const) for (const s of [-1, 1]) ellipse(p, e[0], e[1] + s * 2.2, 3, 3, M.Bone);
      limb(p, [62, 84], [92, 90], 2, 2, M.Bone);
      break;
  }
  return p;
}

// --- Objetos de pé (sprites; a base fica no pé do quadro) ----------------------------------

/** Tamanho dos quadros de pé. */
export const PALM = { w: 256, h: 352 } as const;
export const TALL = { w: 128, h: 224 } as const;

/** Tronco do coqueiro: curvo, de anéis, alargando no pé. `v` muda a curva e a altura. */
export function palmTrunk(variant: DuneVariant, v: number): { image: Uint8ClampedArray; top: Pt } {
  const p = new Paper(variant, PALM.w, PALM.h);
  const lean = [1, -0.7, 0.5, -1.1][v % 4];
  const height = 230 + (v % 3) * 22;
  const base: Pt = [PALM.w / 2, PALM.h - 6];
  const at = (t: number): Pt => [base[0] + lean * 34 * t * t, base[1] - height * t];
  const steps = 18;
  p.together(() => {
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps, t1 = (k + 1) / steps;
      limb(p, at(t0), at(t1), 8.5 - t0 * 3 + (k === 0 ? 3 : 0), 8.5 - t1 * 3, M.Trunk);
    }
  });
  // Anéis do tronco: linhas escuras curvas e a borda de cada anel pegando luz.
  for (let k = 1; k < 26; k++) {
    const t = k / 26;
    const [cx, cy] = at(t);
    const r = 8.5 - t * 3;
    for (let dx = -r; dx <= r; dx++) {
      const y = cy + (dx * dx) / (r * 3);
      p.on(cx + dx, y, null, 1);
      if (dx < 0) p.on(cx + dx, y - 1, null, 4);
    }
  }
  return { image: p.render(true), top: at(1) };
}

/** Copa do coqueiro: folhas penadas em arco (folíolos dos dois lados da nervura), cocos e uma folha seca. */
export function palmCrown(variant: DuneVariant, v: number, top: Pt): Uint8ClampedArray {
  const p = new Paper(variant, PALM.w, PALM.h);
  const [tx, ty] = top;
  const fronds = 9;
  const order = Array.from({ length: fronds }, (_, k) => k).sort((a, b) => Math.sin((a / fronds) * Math.PI * 2) - Math.sin((b / fronds) * Math.PI * 2));
  // As de trás (para cima) primeiro, as da frente por cima.
  for (const k of order) {
    const a = (k / fronds) * Math.PI * 2 + v * 0.4;
    const dry = (k + v) % 7 === 3;
    const len = 78 + noise(k, v, 160) * 26;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.55;
    const pt = (t: number): Pt => [tx + dx * len * t, ty + dy * len * t - 34 * t + 60 * t * t];
    p.together(() => {
      for (let s = 0; s < 14; s++) {
        const t0 = s / 14, t1 = (s + 1) / 14;
        limb(p, pt(t0), pt(t1), 2.2 - t0 * 1.3, 2.2 - t1 * 1.3, dry ? M.Dry : M.Leaf);
      }
      // Folíolos: lâminas finas caindo dos dois lados da nervura.
      for (let s = 2; s < 26; s++) {
        const t = s / 26;
        const [px, py] = pt(t);
        const leafLen = 20 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 4;
        for (const side of [-1, 1]) {
          const ang = Math.atan2(dy, dx) + side * 1.25 + 0.35;
          limb(p, [px, py], [px + Math.cos(ang) * leafLen, py + Math.abs(Math.sin(ang)) * leafLen * 0.9 + 4], 1.6, 0.5, dry ? M.Dry : M.Leaf);
        }
      }
    });
  }
  // Cocos no miolo.
  for (let k = 0; k < 4; k++) ellipse(p, tx - 9 + k * 6, ty + 6 + (k % 2) * 4, 6.2, 6.6, M.Trunk);
  ellipse(p, tx, ty - 2, 9, 7, M.Leaf);
  return p.render(true);
}

export const TALL_DECOR = ["shrub", "rocks", "ribs", "amphora", "column", "reeds", "aloe", "cairn"] as const;
export type TallDecor = (typeof TALL_DECOR)[number];

/** Enfeite de pé de 1 tile (sobe até 0,75 tile acima): arbusto seco, pedras, costelas, ânfora, coluna, juncos... */
export function tallDecor(variant: DuneVariant, kind: TallDecor, v: number): Uint8ClampedArray {
  const p = new Paper(variant, TALL.w, TALL.h);
  const B = TALL.h - 10;
  const r = (k: number) => noise(k, v, 170 + TALL_DECOR.indexOf(kind));
  switch (kind) {
    case "shrub":
      // Arbusto seco: galhos tortos e tufos de folhinhas cinza-oliva.
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.32;
        const tip: Pt = [64 + Math.cos(a) * (34 + r(k) * 14), B + Math.sin(a) * (40 + r(k + 7) * 18)];
        limb(p, [64, B], tip, 2.6, 1.1, M.Trunk);
        ellipse(p, tip[0], tip[1], 9 + r(k + 3) * 5, 7 + r(k + 4) * 4, k % 2 ? M.Shrub : M.Dry);
      }
      break;
    case "rocks":
      ellipse(p, 50, B - 16, 26, 20, M.Stone);
      ellipse(p, 82, B - 10, 18, 13, M.Rock);
      ellipse(p, 66, B - 4, 12, 7, M.Stone);
      break;
    case "ribs":
      // Costelas de um bicho grande saindo da areia.
      for (let k = 0; k < 5; k++) {
        const x = 30 + k * 16;
        const hgt = 40 + Math.sin((k / 4) * Math.PI) * 30;
        const pts: Pt[] = [[x, B], [x - 6, B - hgt * 0.6], [x + 4, B - hgt]];
        limb(p, pts[0], pts[1], 3.2, 2.6, M.Bone);
        limb(p, pts[1], pts[2], 2.6, 1.4, M.Bone);
      }
      limb(p, [22, B - 4], [104, B - 8], 4, 3.4, M.Bone);
      break;
    case "amphora":
      // Ânfora quebrada caída de lado, meio enterrada, e outra de pé.
      p.together(() => {
        ellipse(p, 50, B - 34, 18, 24, M.Clay);
        ellipse(p, 50, B - 62, 7, 6, M.Clay);
        limb(p, [44, B - 64], [36, B - 50], 2.4, 2.4, M.Clay);
        limb(p, [56, B - 64], [64, B - 50], 2.4, 2.4, M.Clay);
      });
      for (let x = 36; x <= 64; x++) p.on(x, B - 40 + Math.sin(x / 3) * 2, M.Clay, 5);
      ellipse(p, 88, B - 12, 22, 12, M.Clay);
      ellipse(p, 104, B - 12, 6, 8, M.Line);
      break;
    case "column":
      // Toco de coluna de arenito, com caneluras e o topo quebrado.
      p.fill([42, B - 92, 86, B], (x, y) => y > B - 80 - Math.sin(x / 5) * 8 - (x > 66 ? 10 : 0), M.Ruin, (x) => {
        const u = (x - 64) / 22;
        return lit(u, -0.2, Math.sqrt(Math.max(0, 1 - u * u)));
      }, (x) => ((x - 42) % 7 === 0 ? -1 : 0));
      ellipse(p, 64, B - 2, 28, 7, M.Ruin);
      ellipse(p, 96, B - 6, 10, 6, M.Ruin);
      break;
    case "reeds":
      // Juncos e papiro na margem.
      for (let k = 0; k < 9; k++) {
        const x = 30 + k * 8 + r(k) * 4;
        const hgt = 70 + r(k + 9) * 60;
        const bend = (r(k + 3) - 0.5) * 14;
        limb(p, [x, B], [x + bend, B - hgt], 1.8, 1, M.Leaf);
        if (k % 3 === 0) ellipse(p, x + bend, B - hgt - 6, 8, 6, M.Dry);
      }
      break;
    case "aloe":
      // Babosa: folhas grossas e pontudas num leque.
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.3;
        const len = 34 + (4 - Math.abs(k - 4)) * 8;
        limb(p, [64, B - 4], [64 + Math.cos(a) * len, B - 4 + Math.sin(a) * len], 6, 0.8, M.Shrub);
      }
      break;
    case "cairn":
      // Marco de pedras empilhadas.
      ellipse(p, 64, B - 12, 26, 14, M.Stone);
      ellipse(p, 62, B - 36, 20, 12, M.Rock);
      ellipse(p, 66, B - 56, 15, 10, M.Stone);
      ellipse(p, 63, B - 72, 9, 7, M.Rock);
      break;
  }
  return p.render(true);
}

/**
 * Pedra cantante (Dunas): menir alto de pedra gasta, furado pelo vento (os furos assobiam), com glifos que acendem.
 * Nas Mesas, o pilar é um morro-testemunho: colunas de arenito em camadas com a pedra-chapéu em cima.
 */
export function pillar(variant: DuneVariant, v: number): { image: Uint8ClampedArray; glow: Uint8ClampedArray } {
  const p = new Paper(variant, TALL.w, TALL.h);
  const g = new Paper(variant, TALL.w, TALL.h);
  const B = TALL.h - 8;
  if (variant === "dunes") {
    const lean = (noise(v, 1, 180) - 0.5) * 10;
    const hgt = 150 + noise(v, 2, 181) * 40;
    const width = (t: number) => 26 - t * 8 + Math.sin(t * 9 + v) * 2;
    const shape = (x: number, y: number) => {
      const t = (B - y) / hgt;
      if (t < 0 || t > 1) return false;
      const cx = 64 + lean * t;
      const w = width(t) * (t > 0.88 ? Math.sqrt(Math.max(0, 1 - ((t - 0.88) / 0.12) ** 2)) : 1);
      return Math.abs(x - cx) < w;
    };
    p.fill([20, B - hgt - 2, 108, B], shape, M.Stone, (x, y) => {
      const t = (B - y) / hgt;
      const u = (x - (64 + lean * t)) / width(t);
      return lit(u, -0.3, Math.sqrt(Math.max(0, 1 - u * u)));
    }, (x, y) => (noise(x >> 1, y >> 1, 182) < 0.12 ? -1 : noise(x, y, 183) < 0.04 ? 1 : 0));
    // Furos do vento: escuros por dentro, com a borda de baixo pegando luz.
    for (let k = 0; k < 3; k++) {
      const t = 0.35 + k * 0.2 + noise(k, v, 184) * 0.06;
      const cx = 64 + lean * t + (noise(v, k, 185) - 0.5) * 16, cy = B - hgt * t;
      const rx = 4 + noise(k, v, 186) * 3, ry = rx * 1.2;
      for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
        for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
          if (d <= 1) p.on(x, y, null, y < cy ? 0 : 1);
          else if (d < 1.5 && y > cy) p.on(x, y, null, 4);
        }
    }
    // Glifos: espirais e traços gravados, que acendem na camada de brilho.
    for (let k = 0; k < 4; k++) {
      const t = 0.18 + k * 0.17;
      const cx = 64 + lean * t - 4, cy = B - hgt * t;
      for (let s = 0; s < 22; s++) {
        const a = s * 0.55, rr = s * 0.32;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8;
        p.on(x, y, null, 1);
        g.px(x, y, M.Glow, 4);
        g.px(x + 1, y, M.Glow, 2);
      }
    }
  } else {
    // Morro-testemunho: tambores de rocha empilhados, mais estreitos no meio, e a pedra-chapéu larga em cima.
    const hgt = 140 + noise(v, 3, 187) * 50;
    const width = (t: number) => 20 + Math.sin(t * Math.PI * 3 + v) * 5 - t * 4;
    const layer = (y: number) => Math.floor((B - y) / 16) % 3;
    p.fill([20, B - hgt, 108, B], (x, y) => {
      const t = (B - y) / hgt;
      return t >= 0 && t <= 1 && Math.abs(x - 64) < width(t);
    }, M.Rock, (x, y) => {
      const u = (x - 64) / width((B - y) / hgt);
      return lit(u, -0.2, Math.sqrt(Math.max(0, 1 - u * u)));
    });
    // Camadas: uma faixa clara a cada três (mantém a luz do volume) e a junta escura entre os tambores.
    for (let y = B - hgt; y <= B; y++) for (let x = 20; x <= 108; x++) {
      if (layer(y) === 1) p.on(x, y, M.Band, -1);
      if (p.has(x, y) && (B - y) % 16 === 0) p.on(x, y, null, 1);
    }
    const capY = B - hgt;
    p.together(() => ellipse(p, 64, capY, 30, 12, M.Cap));
    for (let x = 34; x < 94; x++) p.on(x, capY + 10 + Math.sin(x / 4) * 1.5, null, 1);
  }
  return { image: p.render(true), glow: g.render(false) };
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

/** Atalhos dos quadros de chão. */
export const draw = {
  sand: (variant: DuneVariant, v: number) => () => sandTile(variant, v).render(false),
  soft: (variant: DuneVariant, v: number) => () => softTile(variant, v).render(false),
  arena: (variant: DuneVariant, v: number) => () => arenaTile(variant, v).render(false),
};
