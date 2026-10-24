import { makeCanvas } from "../pixels.ts";
import { ramp, rgb, type Rgb } from "../hero/color.ts";

/**
 * Protótipo da Fase 0 de `docs/ARTE_TIBIA.md`: o cavaleiro sem equipamento, em **384 px de arte por tile**
 * (12× a densidade do Tibia). Nessa resolução o detalhe não é mais posto pixel a pixel: tudo é forma ou traço
 * em "unidades de projeto" (o quadro de 96 das versões anteriores, pés na linha 91) amostrado na resolução
 * final, `K` pixels por unidade. Assim os traços finos (mecha de cabelo, pálpebra, costura) têm 1 a 3 px.
 *
 * Camadas:
 * - **Volumes** (`fill`): cabeça, membros e tronco com luz de cima à esquerda em 4 tons e pontilhado ordenado
 *   4×4 na passagem de um tom para o outro (de longe vira degradê).
 * - **Texturas** (desvio de tom por pixel, também pontilhado): canais acolchoados do gibão, sarja da calça,
 *   poros do couro, mechas do cabelo.
 * - **Tinta** (`ink`): detalhe com tom fixo ou com a própria luz (olho, lábio, fivela, cadarço, gravação),
 *   presa à peça de baixo quando é enfeite dela.
 * - **Linhas e sombras de contato**: onde uma peça passa na frente de outra, a de trás ganha linha escura de
 *   1 px e uma sombra suave de alguns px; contorno de fora com 2 px no lado da sombra.
 *
 * Cada material é de uma **zona** (cabeça, primária, secundária, detalhe, debrum): a classe ou um cosmético
 * escolhe a cor de cada zona, como o outfit do Tibia. Só galeria por enquanto: o jogo continua com `heroes.ts`.
 */

/** Pixels finais por unidade de projeto. */
const K = 6;
/** Quadro em unidades de projeto. */
const D = 96;
export const PROTO_SIZE = D * K;
/** Pixels de arte por tile. */
export const PROTO_TILE = 64 * K;
/** Linha logo abaixo dos pés, em pixels do quadro (para apoiar o herói na base do tile). */
export const PROTO_FEET = 92 * K;
export const PROTO_FRAMES = 4;
export type ProtoDir = "down" | "up" | "side";

/** Cor base de cada zona; a rampa de tons sai dela com desvio de matiz (`hero/color.ts`). */
export interface ProtoLook {
  head: string;
  primary: string;
  secondary: string;
  detail: string;
  trim: string;
}

export const KNIGHT_LOOK: ProtoLook = {
  head: "#7a4a24",
  primary: "#a8302a",
  secondary: "#6c7078",
  detail: "#5e3e26",
  trim: "#c09030",
};

/** Variações de cor (o que um cosmético trocaria): mesmo desenho, outras cores nas zonas. */
export const KNIGHT_COSMETICS: Record<string, Partial<ProtoLook>> = {
  "azul real": { primary: "#2e4f9a", trim: "#d0d4da" },
  "verde-floresta": { head: "#c8963c", primary: "#4a7432", secondary: "#6a5a44" },
  "negro": { head: "#2c2a30", primary: "#3a3440", secondary: "#5a2420", trim: "#9a2a22" },
};

export const mergeLook = (extra: Partial<ProtoLook>): ProtoLook => ({ ...KNIGHT_LOOK, ...extra });

// --- Materiais ----------------------------------------------------------------------

const enum Mat { Skin, Hair, Primary, Secondary, Detail, Trim, Steel, Eye, White, Lip, Iris }

/** Materiais polidos: a luz forte vira o tom 5 (brilho). */
const SHINY = new Set<number>([Mat.Trim, Mat.Steel]);
const OUTLINE: Rgb = rgb("#1a1210");

function ramps(look: ProtoLook): Rgb[][] {
  const r = (base: string, contrast = 1, shift = 6, shine = false) => ramp(base, { contrast, shift, shine }).map(rgb);
  return [
    r("#ecbc96", 0.75, 4), // pele
    r(look.head, 1.1, 8),
    r(look.primary, 0.95, 7),
    r(look.secondary, 0.95, 6),
    r(look.detail, 1, 6),
    r(look.trim, 1.25, 8, true),
    r("#8e959e", 1.4, 6, true), // aço
    r("#2a1a12", 0.5, 0),
    r("#f2ece2", 0.3, 0),
    r("#b0604e", 0.6, 3),
    r("#7a5430", 1.1, 5), // íris
  ];
}

// --- Pintura ------------------------------------------------------------------------

const S = PROTO_SIZE;
const N = S * S;
/** Luz de cima à esquerda, um pouco de frente. */
const L = (() => { const v = [-0.55, -0.62, 0.56]; const n = Math.hypot(...v); return v.map((c) => c / n); })();
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (X: number, Y: number) => BAYER[(Y & 3) * 4 + (X & 3)];
/** Inteiro com pontilhado ordenado: 0,3 vira 1 em 30% dos pixels, espalhados. */
const dith = (v: number, X: number, Y: number) => Math.floor(v + bayer(X, Y));
/** Luz (0–1) → tom 1–4 com pontilhado na fronteira. */
const quant = (v: number, X: number, Y: number) => Math.max(1, Math.min(4, Math.floor(v * 4 + (bayer(X, Y) - 0.5) * 0.9) + 1));

/** Teste e luz recebem o ponto em unidades de projeto e o pixel final (X, Y). */
type Test = (x: number, y: number, X: number, Y: number) => boolean;
type Shade = (x: number, y: number) => number;
/** Desvio de tom por pixel final (texturas). */
type Offset = (X: number, Y: number, x: number, y: number) => number;
type Tone = number | ((x: number, y: number, X: number, Y: number) => number);
type Box = readonly [number, number, number, number];

class Canvas {
  mat = new Int8Array(N).fill(-1);
  shade = new Float32Array(N);
  off = new Int8Array(N);
  fixed = new Int8Array(N).fill(-1);
  order = new Int16Array(N);
  part = new Int16Array(N);
  /** Último `fill`/`ink` que pintou o pixel (para prender um detalhe em outro detalhe, como a íris no branco). */
  tag = new Int16Array(N);
  private seq = 0;

  private each(box: Box, fn: (x: number, y: number, X: number, Y: number) => void) {
    const [x0, y0, x1, y1] = box;
    for (let Y = Math.max(0, Math.floor(y0 * K)); Y <= Math.min(S - 1, Math.ceil((y1 + 1) * K)); Y++) {
      for (let X = Math.max(0, Math.floor(x0 * K)); X <= Math.min(S - 1, Math.ceil((x1 + 1) * K)); X++) {
        fn((X + 0.5) / K - 0.5, (Y + 0.5) / K - 0.5, X, Y);
      }
    }
  }

  /** Peça com volume: a forma `test` com o material, a luz e o desvio de tom. Devolve o número da peça. */
  fill(box: Box, test: Test, mat: Mat, shade: Shade, offset?: Offset) {
    const id = ++this.seq;
    this.each(box, (x, y, X, Y) => {
      if (!test(x, y, X, Y)) return;
      const i = Y * S + X;
      this.mat[i] = mat;
      this.shade[i] = shade(x, y);
      this.off[i] = offset ? offset(X, Y, x, y) : 0;
      this.fixed[i] = -1;
      this.order[i] = id;
      this.part[i] = id;
      this.tag[i] = id;
    });
    return id;
  }

  /**
   * Tinta: detalhe com tom fixo (ou calculado; tom < 0 pula o pixel). Com `clip`, só pinta sobre essas peças e
   * continua sendo parte delas (não risca linha); sem `clip`, o que cai fora de tudo vira peça nova.
   */
  ink(box: Box, test: Test, mat: Mat, tone: Tone, clip?: readonly number[]) {
    const id = ++this.seq;
    this.each(box, (x, y, X, Y) => {
      if (!test(x, y, X, Y)) return;
      const i = Y * S + X;
      if (clip && (this.mat[i] < 0 || !(clip.includes(this.part[i]) || clip.includes(this.tag[i])))) return;
      const t = typeof tone === "number" ? tone : tone(x, y, X, Y);
      if (t < 0) return;
      if (!clip && this.mat[i] < 0) { this.order[i] = id; this.part[i] = id; this.shade[i] = 0.5; }
      this.mat[i] = mat;
      this.fixed[i] = t;
      this.tag[i] = id;
    });
    return id;
  }

  /** Muda o tom de quem já está pintado, sem mudar a peça (dobra, sombra). */
  nudge(box: Box, test: Test, delta: number | ((x: number, y: number, X: number, Y: number) => number), clip?: readonly number[]) {
    this.each(box, (x, y, X, Y) => {
      if (!test(x, y, X, Y)) return;
      const i = Y * S + X;
      if (this.mat[i] < 0 || (clip && !clip.includes(this.part[i]))) return;
      const d = typeof delta === "number" ? delta : delta(x, y, X, Y);
      if (this.fixed[i] >= 0) this.fixed[i] = Math.max(0, Math.min(5, this.fixed[i] + d));
      else this.off[i] += d;
    });
  }

  render(look: ProtoLook): Uint8ClampedArray {
    const tones = ramps(look);
    const out = new Uint8ClampedArray(N * 4);
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S && this.mat[y * S + x] >= 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        const m = this.mat[i];
        if (m < 0) {
          // Contorno de fora: 1 px em volta (suave do lado da luz) e o 2º px só do lado da sombra.
          const near = [[1, 0], [0, 1], [-1, 0], [0, -1]].find(([dx, dy]) => opaque(x + dx, y + dy));
          if (near) {
            const n = (y + near[1]) * S + x + near[0];
            const litSide = (near[0] === 1 || near[1] === 1) && this.shade[n] > 0.6;
            const c = litSide ? tones[this.mat[n]][0] : OUTLINE;
            out.set([c[0], c[1], c[2], 255], i * 4);
          } else if (opaque(x - 2, y) || opaque(x, y - 2) || opaque(x - 1, y - 1)) {
            out.set([OUTLINE[0], OUTLINE[1], OUTLINE[2], 255], i * 4);
          }
          continue;
        }
        let tone: number;
        if (this.fixed[i] >= 0) tone = this.fixed[i];
        else {
          const v = this.shade[i];
          tone = quant(v, x, y);
          if (SHINY.has(m) && v * 4 + (bayer(x, y) - 0.5) * 0.9 > 3.85) tone = 5;
          tone += this.off[i];
          // Peça da frente perto: linha de 1 px colada nela e sombra de contato até 4 px.
          let d = 9;
          for (let dy = -4; dy <= 4 && d > 1; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue;
              const j = yy * S + xx;
              if (this.mat[j] < 0 || this.part[j] === this.part[i] || this.order[j] <= this.order[i]) continue;
              d = Math.min(d, Math.max(Math.abs(dx), Math.abs(dy)));
            }
          }
          if (d === 1) tone = 0;
          else if (d <= 4) tone -= d <= 2 || bayer(x, y) > (d - 2) / 3 ? 1 : 0;
        }
        let c = tones[m][Math.max(0, Math.min(5, tone))];
        // Linha (tom 0) puxada para o contorno: a pele não fica com risco laranja.
        if (tone <= 0 && this.fixed[i] < 0) c = [(c[0] + OUTLINE[0] * 1.2) / 2.2, (c[1] + OUTLINE[1] * 1.2) / 2.2, (c[2] + OUTLINE[2] * 1.2) / 2.2];
        out.set([c[0], c[1], c[2], 255], i * 4);
      }
    }
    return out;
  }
}

// --- Formas e volumes (em unidades de projeto) ---------------------------------------

type Pt = readonly [number, number];

const lambert = (nx: number, ny: number, nz: number) => Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
const lit = (nx: number, ny: number, nz: number) => 0.12 + 0.88 * lambert(nx, ny, nz);
const sphere = (cx: number, cy: number, rx: number, ry: number): Shade => (x, y) => {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
  return lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
};
const inEllipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
  ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const ebox = (cx: number, cy: number, rx: number, ry: number): Box => [cx - rx - 1, cy - ry - 1, cx + rx, cy + ry];

/** Esfera achatada. */
function ellipse(c: Canvas, cx: number, cy: number, rx: number, ry: number, mat: Mat, offset?: Offset) {
  return c.fill(ebox(cx, cy, rx, ry), inEllipse(cx, cy, rx, ry), mat, sphere(cx, cy, rx, ry), offset);
}

/** Distância do ponto ao segmento e a posição ao longo dele (0–1). */
function seg(px: number, py: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const qx = a[0] + dx * t, qy = a[1] + dy * t;
  return { d: Math.hypot(px - qx, py - qy), t, sx: px - qx, sy: py - qy };
}

/** Membro (cápsula afinando de `ra` para `rb`) com volume de cilindro. */
function limb(c: Canvas, a: Pt, b: Pt, ra: number, rb: number, mat: Mat, offset?: Offset) {
  const r = Math.max(ra, rb);
  const box: Box = [Math.min(a[0], b[0]) - r - 1, Math.min(a[1], b[1]) - r - 1, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r];
  return c.fill(box, (x, y) => {
    const s = seg(x + 0.5, y + 0.5, a, b);
    return s.d <= ra + (rb - ra) * s.t;
  }, mat, (x, y) => {
    const s = seg(x + 0.5, y + 0.5, a, b);
    const rad = ra + (rb - ra) * s.t;
    const nx = s.sx / rad, ny = s.sy / rad;
    return lit(nx, ny * 0.6 - 0.15, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
  }, offset);
}

const inPoly = (pts: readonly Pt[]): Test => (x, y) => {
  let on = false;
  const px = x + 0.5, py = y + 0.5;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) on = !on;
  }
  return on;
};
const pbox = (pts: readonly Pt[]): Box => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs), Math.max(...ys)];
};

/** Polígono com volume de cilindro em pé entre `x0` e `x1` (o peito sai um pouco para a frente em cima). */
function poly(c: Canvas, pts: readonly Pt[], mat: Mat, x0: number, x1: number, offset?: Offset) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const ys = pts.map((p) => p[1]);
  const top = Math.min(...ys), h = Math.max(...ys) - top;
  return c.fill(pbox(pts), inPoly(pts), mat, (x, y) => {
    const u = Math.max(-0.95, Math.min(0.95, (x + 0.5 - mid) / half));
    const v = (y + 0.5 - top) / h;
    return lit(u, -0.35 + v * 0.3, Math.sqrt(1 - u * u));
  }, offset);
}

/** Traço por uma linha de pontos, com raio indo de `r0` a `r1` (ponta fina). */
function stroke(pts: readonly Pt[], r0: number, r1 = r0) {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1] || 1;
  const r = Math.max(r0, r1);
  const box: Box = [Math.min(...pts.map((p) => p[0])) - r - 1, Math.min(...pts.map((p) => p[1])) - r - 1, Math.max(...pts.map((p) => p[0])) + r, Math.max(...pts.map((p) => p[1])) + r];
  /** Distância até o traço menos o raio naquele ponto, e a posição (0–1) ao longo dele. */
  const near = (x: number, y: number) => {
    let best = Infinity, at = 0;
    for (let i = 1; i < pts.length; i++) {
      const s = seg(x + 0.5, y + 0.5, pts[i - 1], pts[i]);
      const t = (lens[i - 1] + s.t * (lens[i] - lens[i - 1])) / total;
      const d = s.d - (r0 + (r1 - r0) * t);
      if (d < best) { best = d; at = t; }
    }
    return { d: best, t: at };
  };
  const test: Test = (x, y) => near(x, y).d <= 0;
  return { box, test, near };
}

/** Curva de Bézier quadrática em `n` pontos. */
function bez(a: Pt, ctrl: Pt, b: Pt, n = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]]);
  }
  return out;
}

/** Ruído fixo (sem `Math.random`, o desenho é sempre igual). */
const noise = (x: number, y: number) => {
  let h = Math.imul(Math.floor(x) * 374761393 + Math.floor(y) * 668265263, 1274126177);
  h ^= h >>> 13;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 16;
  return ((h >>> 0) % 10000) / 10000;
};

/** Desenha um traço de tinta. */
function line(c: Canvas, pts: readonly Pt[], r0: number, r1: number, mat: Mat, tone: Tone, clip?: readonly number[]) {
  const s = stroke(pts, r0, r1);
  return c.ink(s.box, s.test, mat, tone, clip);
}
/** Elipse de tinta. */
function spot(c: Canvas, cx: number, cy: number, rx: number, ry: number, mat: Mat, tone: Tone, clip?: readonly number[]) {
  return c.ink(ebox(cx, cy, rx, ry), inEllipse(cx, cy, rx, ry), mat, tone, clip);
}
/** Tom com a luz de uma esfera (detalhe redondo com volume: íris, rebite, pomo). */
const ball = (cx: number, cy: number, r: number, bias = 0): Tone => (x, y, X, Y) => quant(sphere(cx, cy, r, r)(x, y), X, Y) + bias;

// --- Texturas -----------------------------------------------------------------------

/**
 * Gibão acolchoado: canais verticais de 3,5 unidades, cada um estufado (claro no meio, escuro nas bordas),
 * costura funda entre eles com pontos tracejados e um fio de luz do lado esquerdo da costura.
 */
const quilt = (cx: number): Offset => (X, Y, x) => {
  const w = 3.5 * K;
  const local = (((X - cx * K) % w) + w) % w;
  if (local < 1) return (Y % 8) < 4 ? -2 : -1;
  if (local < 2) return 1;
  const u = (local - w / 2) / (w / 2);
  const tex = noise(X, Y) < 0.04 ? -1 : 0;
  void x;
  return dith(0.35 - 0.9 * u * u, X, Y) + tex;
};

/** Manga acolchoada: canais na horizontal. */
const sleeve: Offset = (X, Y) => {
  const w = 2.6 * K;
  const local = Y % w;
  if (local < 1) return X % 6 < 3 ? -2 : -1;
  const u = (local - w / 2) / (w / 2);
  return dith(0.3 - 0.8 * u * u, X, Y);
};

/** Sarja da calça: diagonais finas e alguns fios soltos. */
const twill: Offset = (X, Y) => ((X + Y) % 4 === 0 ? (noise(X, Y) < 0.7 ? -1 : 0) : noise(X, Y) < 0.02 ? 1 : 0);

/** Couro: poros escuros e arranhões claros. */
const leather: Offset = (X, Y) => (noise(X, Y) < 0.06 ? -1 : noise(X + 31, Y >> 1) < 0.015 ? 1 : 0);

const darker = (o: Offset | undefined, far: boolean): Offset | undefined =>
  far ? (X, Y, x, y) => -1 + (o ? o(X, Y, x, y) : 0) : o;

// --- Peças --------------------------------------------------------------------------

function boot(c: Canvas, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const top = ankle[1] - 5;
  const shaft = limb(c, [ankle[0], top], ankle, 3.7, 3.7, Mat.Detail, darker(leather, far));
  const foot = limb(c, ankle, toe, 3.5, 2.9, Mat.Detail, darker(leather, far));
  const both = [shaft, foot];
  const dk = far ? -1 : 0;
  // Dobra do cano: faixa virada com costura tracejada embaixo.
  const cuff = top - 3.6;
  c.ink([ankle[0] - 5, cuff - 1, ankle[0] + 5, cuff + 2], (_x, y) => y >= cuff - 0.2 && y <= cuff + 1.4, Mat.Detail,
    (x, y, X, Y) => quant(sphere(ankle[0], cuff - 2, 5, 5)(x, y), X, Y) + 1 + dk, both);
  c.ink([ankle[0] - 5, cuff + 1, ankle[0] + 5, cuff + 2], (_x, y) => Math.abs(y - (cuff + 1.6)) < 0.17, Mat.Detail, 0, both);
  c.ink([ankle[0] - 5, cuff + 1, ankle[0] + 5, cuff + 3], (_x, y, X) => Math.abs(y - (cuff + 2.1)) < 0.17 && X % 5 < 3, Mat.Trim, 2 + dk, both);
  // Cadarço cruzado com ilhoses de metal (de frente, na perna de cá).
  if (front && !far) {
    for (let k = 0; k < 4; k++) {
      const y = cuff + 3 + k * 1.3;
      for (const sx of [-1, 1]) spot(c, ankle[0] + sx * 1.2, y, 0.32, 0.32, Mat.Steel, ball(ankle[0] + sx * 1.2, y, 0.32), both);
      line(c, [[ankle[0] - 1.2, y], [ankle[0] + 1.2, y + 1.3]], 0.2, 0.2, Mat.Trim, 3, both);
      line(c, [[ankle[0] + 1.2, y], [ankle[0] - 1.2, y + 1.3]], 0.2, 0.2, Mat.Trim, 2, both);
    }
  }
  // Biqueira: costura em arco no peito do pé.
  line(c, bez([toe[0] - 2.6, toe[1] - 1], [toe[0], toe[1] - 3.2], [toe[0] + 2.6, toe[1] - 1]), 0.15, 0.15, Mat.Detail, 1 + dk, both);
  // Sola: 2 unidades de baixo de cada coluna da bota, escura, com costura clara logo acima.
  const box: Box = [Math.min(ankle[0], toe[0]) - 5, top, Math.max(ankle[0], toe[0]) + 5, toe[1] + 4];
  const bottom = new Map<number, number>();
  c.ink(box, (_x, _y, X, Y) => {
    const i = Y * S + X;
    if (c.mat[i] === Mat.Detail && both.includes(c.part[i])) bottom.set(X, Math.max(bottom.get(X) ?? 0, Y));
    return false;
  }, Mat.Detail, 0);
  c.ink(box, (_x, _y, X, Y) => {
    const b = bottom.get(X);
    return b !== undefined && Y > b - 6 && Y <= b;
  }, Mat.Detail, (_x, _y, X, Y) => {
    const b = bottom.get(X)!;
    if (Y > b - 3) return 0;
    if (Y === b - 3) return 1;
    return X % 4 < 2 ? (far ? 2 : 4) : 1;
  }, both);
  // Brilho do couro.
  if (!far) {
    line(c, bez([ankle[0] - 2.2, top - 1], [ankle[0] - 2.6, ankle[1] - 2], [ankle[0] - 1.8, ankle[1]]), 0.25, 0.1, Mat.Detail, 5, both);
    spot(c, toe[0] - 0.8, toe[1] - 1.6, 0.6, 0.35, Mat.Detail, 5, both);
  }
}

function leg(c: Canvas, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const thigh = limb(c, hip, knee, 4.4, 3.8, Mat.Secondary, darker(twill, far));
  const shin = limb(c, knee, ankle, 3.8, 3.3, Mat.Secondary, darker(twill, far));
  const pants = [thigh, shin];
  // Costura de fora da perna (tracejada) e dobras em leque no joelho.
  const sx = front ? (hip[0] < CX ? -1 : 1) : 1;
  line(c, [[hip[0] + sx * 3.4, hip[1]], [knee[0] + sx * 3, knee[1]], [ankle[0] + sx * 2.6, ankle[1]]], 0.14, 0.14, Mat.Secondary,
    (_x, _y, _X, Y) => (Y % 6 < 3 ? 1 : -1), pants);
  for (const [a, b, ctrl] of [
    [[knee[0] - 2.4, knee[1] - 1.2], [knee[0] + 0.6, knee[1] + 0.2], [knee[0] - 0.8, knee[1] - 0.2]],
    [[knee[0] - 2, knee[1] + 1.2], [knee[0] + 1.6, knee[1] + 1.8], [knee[0], knee[1] + 2]],
    [[knee[0] + 0.4, knee[1] - 2.4], [knee[0] + 2.2, knee[1] - 0.6], [knee[0] + 1.6, knee[1] - 1.8]],
  ] as [Pt, Pt, Pt][]) {
    line(c, bez(a, ctrl, b), 0.3, 0.08, Mat.Secondary, far ? 0 : 1, pants);
    line(c, bez([a[0], a[1] - 0.45], [ctrl[0], ctrl[1] - 0.45], [b[0], b[1] - 0.45]), 0.2, 0.06, Mat.Secondary, far ? 2 : 4, pants);
  }
  boot(c, ankle, toe, far, front);
}

function hand(c: Canvas, at: Pt, far: boolean, side: number) {
  const id = ellipse(c, at[0], at[1], 3.1, 3.3, Mat.Skin, darker(undefined, far));
  const dk = far ? -1 : 0;
  // Polegar por dentro, dedos com vincos, nós claros e unhas.
  const th = ellipse(c, at[0] - side * 2, at[1] - 0.6, 1.3, 1.9, Mat.Skin, darker(undefined, far));
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    line(c, [[at[0] + k, at[1] + 1], [at[0] + k * 1.05, at[1] + 3.1]], 0.12, 0.12, Mat.Skin, 1 + dk, [id]);
    spot(c, at[0] + k + 0.5, at[1] + 0.2, 0.3, 0.22, Mat.Skin, 4 + dk, [id]);
    spot(c, at[0] + k + 0.5, at[1] + 2.6, 0.28, 0.3, Mat.Lip, 4 + dk, [id]);
  }
  spot(c, at[0] - side * 2.2, at[1] - 1.6, 0.4, 0.4, Mat.Skin, 4 + dk, [th]);
}

function arm(c: Canvas, shoulder: Pt, elbow: Pt, at: Pt, far: boolean, side: number) {
  const up = limb(c, shoulder, elbow, 3.9, 3.5, Mat.Primary, darker(sleeve, far));
  const cuff: Pt = [elbow[0] + (at[0] - elbow[0]) * 0.72, elbow[1] + (at[1] - elbow[1]) * 0.72];
  const low = limb(c, elbow, cuff, 3.5, 3.3, Mat.Primary, darker(sleeve, far));
  // Dobra do cotovelo.
  line(c, bez([elbow[0] - 2.4, elbow[1] - 0.4], [elbow[0], elbow[1] + 0.9], [elbow[0] + 2.4, elbow[1] - 0.4]), 0.3, 0.1, Mat.Primary, far ? 0 : 1, [up, low]);
  const end: Pt = [cuff[0] + (at[0] - cuff[0]) * 0.4, cuff[1] + (at[1] - cuff[1]) * 0.4];
  const band = limb(c, cuff, end, 3.5, 3.5, Mat.Trim, darker(undefined, far));
  // Bordado do punho: zigue-zague escuro com pontinhos claros.
  const my = (cuff[1] + end[1]) / 2;
  const zig: Pt[] = [];
  for (let k = 0; k <= 12; k++) zig.push([cuff[0] - 3.6 + k * 0.6, my + (k % 2 ? 0.45 : -0.45)]);
  line(c, zig, 0.13, 0.13, Mat.Trim, 1, [band]);
  for (let k = 0; k < 6; k++) spot(c, cuff[0] - 3 + k * 1.2, my - 1.1, 0.18, 0.18, Mat.Trim, 5, [band]);
  hand(c, at, far, side);
}

/** Espada de treino: gume chanfrado, sulco com brilho, marcas de uso, guarda gravada, cabo de couro trançado. */
function sword(c: Canvas, at: Pt, tip: Pt) {
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const gx = -uy, gy = ux;
  const guard: Pt = [at[0] + ux * 4.5, at[1] + uy * 4.5];
  const local = (x: number, y: number) => { const s = seg(x + 0.5, y + 0.5, guard, tip); return { s, side: s.sx * gx + s.sy * gy }; };
  const width = (t: number) => (t > 0.84 ? 1.9 * (1 - t) / 0.16 + 0.15 : 1.9 - t * 0.25);
  const box: Box = [Math.min(guard[0], tip[0]) - 3, Math.min(guard[1], tip[1]) - 3, Math.max(guard[0], tip[0]) + 3, Math.max(guard[1], tip[1]) + 3];
  c.fill(box, (x, y) => { const { s } = local(x, y); return s.d <= width(s.t); }, Mat.Steel, (x, y) => {
    const { s, side } = local(x, y);
    const u = side / width(s.t);
    // Duas faces planas que se encontram no sulco, e o gume (borda) mais claro.
    if (Math.abs(u) > 0.78) return 0.95;
    return u < 0 ? 0.8 : 0.42;
  }, (X, Y, x, y) => {
    const { s, side } = local(x, y);
    if (Math.abs(side) < 0.17 && s.t < 0.7) return -2;
    if (side > 0.17 && side < 0.34 && s.t < 0.7) return 2;
    return noise(X, Y) < 0.012 ? -2 : 0;
  });
  // Dentinhos no gume.
  for (const t of [0.3, 0.52, 0.66]) {
    const p: Pt = [guard[0] + dx * t * 0.78 + gx * 1.8, guard[1] + dy * t * 0.78 + gy * 1.8];
    spot(c, p[0], p[1], 0.3, 0.3, Mat.Steel, 1);
  }
  // Guarda com pontas em bola e linhas gravadas.
  const gl: Pt = [guard[0] - gx * 5, guard[1] - gy * 5], gr: Pt = [guard[0] + gx * 5, guard[1] + gy * 5];
  const g = limb(c, gl, gr, 1.1, 1.1, Mat.Trim);
  const k1 = ellipse(c, gl[0], gl[1], 1.25, 1.25, Mat.Trim), k2 = ellipse(c, gr[0], gr[1], 1.25, 1.25, Mat.Trim);
  line(c, [[guard[0] - gx * 3.8 + ux * 0.2, guard[1] - gy * 3.8 + uy * 0.2], [guard[0] + gx * 3.8 + ux * 0.2, guard[1] + gy * 3.8 + uy * 0.2]], 0.1, 0.1, Mat.Trim, 1, [g]);
  spot(c, guard[0], guard[1], 0.7, 0.7, Mat.Iris, ball(guard[0], guard[1], 0.7, 1), [g]);
  void k1; void k2;
  // Cabo trançado: faixas em diagonal, cada uma com volume.
  const a: Pt = [at[0] - ux * 3, at[1] - uy * 3];
  c.fill([Math.min(a[0], guard[0]) - 2, Math.min(a[1], guard[1]) - 2, Math.max(a[0], guard[0]) + 2, Math.max(a[1], guard[1]) + 2],
    (x, y) => seg(x + 0.5, y + 0.5, a, guard).d <= 1.1, Mat.Detail, (x, y) => {
      const s = seg(x + 0.5, y + 0.5, a, guard);
      return lit((s.sx * gx + s.sy * gy) / 1.1, 0, 0.8);
    }, (X, Y, x, y) => {
      const s = seg(x + 0.5, y + 0.5, a, guard);
      const p = (s.t * 4.5 * 2 + (s.sx * gx + s.sy * gy) * 0.8) % 1;
      return p < 0.18 ? -2 : p < 0.5 ? 1 : 0;
    });
  const pc: Pt = [at[0] - ux * 4.6, at[1] - uy * 4.6];
  const pommel = ellipse(c, pc[0], pc[1], 1.7, 1.7, Mat.Trim);
  line(c, bez([pc[0] - 1.2, pc[1] + 0.3], [pc[0], pc[1] + 1.3], [pc[0] + 1.2, pc[1] + 0.3]), 0.1, 0.1, Mat.Trim, 1, [pommel]);
}

/** Cinto (costura, furos, passador, fivela com pino) e barra bordada da saia, só sobre o tronco `id`. */
function belt(c: Canvas, id: number, cx: number, half: number, top: number, buckle: boolean) {
  const y0 = top + 12.8, y1 = top + 15.6;
  const band: Box = [cx - half - 2, y0 - 1, cx + half + 2, y1 + 1];
  const inBand: Test = (_x, y) => y >= y0 && y < y1;
  const b = c.ink(band, inBand, Mat.Detail, (x, y, X, Y) => {
    const v = (y - y0) / (y1 - y0);
    let t = v < 0.12 ? 4 : v > 0.86 ? 1 : x < cx ? 3 : 2;
    if (noise(X, Y) < 0.05) t -= 1;
    return t;
  }, [id]);
  void b;
  // Costura em cima e embaixo.
  c.ink(band, (_x, y, X) => (Math.abs(y - (y0 + 0.5)) < 0.09 || Math.abs(y - (y1 - 0.55)) < 0.09) && X % 6 < 3, Mat.Trim, 2, [id]);
  if (buckle) {
    // Furos com borda funda e o passador de couro.
    for (const k of [5.5, 7, 8.5]) {
      spot(c, cx + k, (y0 + y1) / 2, 0.36, 0.36, Mat.Detail, 0, [id]);
      spot(c, cx + k + 0.18, (y0 + y1) / 2 + 0.25, 0.2, 0.12, Mat.Detail, 4, [id]);
    }
    c.ink([cx + 3.2, y0 - 0.4, cx + 4.6, y1 + 0.4], (x, y) => x >= cx + 3.2 && x < cx + 4.4 && y >= y0 - 0.3 && y < y1 + 0.3, Mat.Detail, (x) => (x < cx + 3.6 ? 4 : x > cx + 4.1 ? 1 : 3), [id]);
    // Fivela: aro dourado com volume, pino de aço, sombra no couro por dentro.
    const bx = cx, by = (y0 + y1) / 2, rx = 2, ry = 2.1;
    const ring: Test = (x, y) => {
      const ox = Math.abs(x + 0.5 - bx), oy = Math.abs(y + 0.5 - by);
      const outer = ox <= rx && oy <= ry && !(ox > rx - 0.4 && oy > ry - 0.4);
      const inner = ox < rx - 0.7 && oy < ry - 0.7;
      return outer && !inner;
    };
    c.ink([bx - rx - 1, by - ry - 1, bx + rx, by + ry], ring, Mat.Trim, (x, y, X, Y) => {
      const ox = x + 0.5 - bx, oy = y + 0.5 - by;
      const edge = Math.abs(ox) > rx - 0.35 ? Math.sign(ox) : Math.abs(oy) > ry - 0.35 ? Math.sign(oy) : 0;
      return edge < 0 ? 5 : edge > 0 ? 1 : quant(0.55 - (ox + oy) * 0.08, X, Y);
    });
    c.ink([bx - rx, by - ry, bx + rx, by + ry], (x, y) => Math.abs(x + 0.5 - bx) < rx - 0.7 && Math.abs(y + 0.5 - by) < ry - 0.7, Mat.Detail, (_x, y) => (y + 0.5 < by - ry + 1.3 ? 0 : 2));
    line(c, [[bx + 0.1, by - ry + 0.5], [bx + 0.1, by + 0.4]], 0.22, 0.22, Mat.Steel, (x) => (x < bx ? 5 : 3));
    // Ponta do cinto pendurada com ponteira de metal.
    const tip = c.ink([cx + 4.5, y1 - 0.5, cx + 7, y1 + 4], (x, y) => x >= cx + 4.8 && x < cx + 6.2 && y >= y1 - 0.2 && y < y1 + 3.2 - (x > cx + 5.7 ? 0.4 : 0), Mat.Detail,
      (x, y) => (y > y1 + 2.2 ? (x < cx + 5.3 ? 5 : 3) : x < cx + 5.2 ? 3 : 1));
    void tip;
    c.ink([cx + 4.5, y1 + 2, cx + 7, y1 + 4], (x, y) => x >= cx + 4.8 && x < cx + 6.2 && y >= y1 + 2.2 && y < y1 + 3.2, Mat.Steel, (x) => (x < cx + 5.3 ? 5 : 3));
  }
  // Barra da saia: faixa dourada com losangos e pontos, filetes em cima e embaixo.
  const h0 = top + 18.6, h1 = top + 21;
  c.ink([cx - half - 3, h0 - 1, cx + half + 3, h1 + 1], (_x, y) => y >= h0 && y < h1, Mat.Trim, (x, y, X, Y) => {
    const v = (y - h0) / (h1 - h0);
    if (v < 0.1) return 5;
    if (v > 0.88) return 1;
    const p = ((x - cx) / 1.6) % 1, q = Math.abs((p + 1) % 1 - 0.5) * 2;
    const diamond = Math.abs(v - 0.5) * 2 + q < 0.75;
    if (diamond) return Math.abs(v - 0.5) * 2 + q > 0.55 ? 1 : 4;
    return quant(0.55 - (x - cx) * 0.02, X, Y);
  }, [id]);
}

// --- Poses --------------------------------------------------------------------------

const FEET = 91;
const CX = 47.5;

/** Balanço da caminhada: passo, passagem, outro passo, passagem. */
const SWING = [1, 0, -1, 0];
const BOB = [0, -1, 0, -1];

/** Dobras da saia do gibão abaixo do cinto. */
function skirtFolds(c: Canvas, id: number, cx: number, half: number, top: number) {
  for (const k of [-0.7, -0.25, 0.3, 0.75]) {
    const x = cx + k * half;
    line(c, bez([x, top + 16], [x + k * 0.8, top + 17.5], [x + k * 1.4, top + 18.6]), 0.3, 0.12, Mat.Primary, 1, [id]);
    line(c, bez([x - 0.5, top + 16.2], [x - 0.5 + k * 0.8, top + 17.6], [x - 0.5 + k * 1.4, top + 18.6]), 0.18, 0.08, Mat.Primary, 4, [id]);
  }
}

function front(c: Canvas, frame: number, back: boolean) {
  const s = SWING[frame], b = BOB[frame];
  const hipY = 66 + b;
  // Pernas: no passo, a de trás tira o calcanhar do chão (pé 2 unidades acima).
  const legs: [number, number][] = [[CX - 4.5, s < 0 ? -2 : 0], [CX + 4.5, s > 0 ? -2 : 0]];
  legs.forEach(([x, lift], i) => {
    const far = back ? i === 0 : i === 1;
    const knee: Pt = [x + (i ? 0.5 : -0.5), 77 + b + lift / 2];
    const ankle: Pt = [x + (i ? 0.5 : -0.5), FEET - 3 + lift];
    leg(c, [x, hipY], knee, ankle, [ankle[0], ankle[1] + 1.5], far, !back);
  });

  // Tronco: ombros largos, cintura, saia do gibão abrindo até a barra.
  const top = 47 + b;
  const torso: Pt[] = [[CX - 13, top + 2], [CX - 9, top], [CX + 9, top], [CX + 13, top + 2], [CX + 11, top + 13], [CX + 12, top + 21], [CX - 12, top + 21], [CX - 11, top + 13]];
  const id = poly(c, torso, Mat.Primary, CX - 13, CX + 13, quilt(CX));
  skirtFolds(c, id, CX, 11, top);
  belt(c, id, CX, 10.5, top, !back);
  if (!back) {
    // Gola em V: pele com sombra do pescoço e clavícula; debrum dourado trançado dos dois lados.
    const v: Pt[] = [[CX - 5, top - 0.5], [CX + 5, top - 0.5], [CX, top + 6.5]];
    c.ink(pbox(v), inPoly(v), Mat.Skin, (x, y, X, Y) => (y < top + 1.4 ? 1 : quant(0.62 - (x - CX) * 0.05 - (y - top) * 0.01, X, Y)), [id]);
    line(c, bez([CX - 3.4, top + 1.6], [CX - 1.6, top + 2.6], [CX - 0.5, top + 2.2]), 0.14, 0.06, Mat.Skin, 2, [id]);
    line(c, bez([CX + 3.4, top + 1.6], [CX + 1.6, top + 2.6], [CX + 0.5, top + 2.2]), 0.14, 0.06, Mat.Skin, 2, [id]);
    for (const sx of [-1, 1]) {
      const edge: Pt[] = [[CX + sx * 5.6, top - 0.6], [CX, top + 7.4]];
      line(c, edge, 0.7, 0.55, Mat.Trim, (x, y, X, Y) => (((X + Y * sx) % 6) < 2 ? 1 : quant(0.6 - sx * 0.25 - (y - top) * 0.01, X, Y)), [id]);
    }
  } else {
    // Costura das costas e gola.
    line(c, [[CX, top + 1.5], [CX, top + 12.5]], 0.15, 0.15, Mat.Primary, (_x, _y, _X, Y) => (Y % 8 < 4 ? 0 : 1), [id]);
    line(c, bez([CX - 5.5, top], [CX, top + 1.6], [CX + 5.5, top]), 0.55, 0.55, Mat.Trim, (x, _y, X, Y) => quant(0.6 - (x - CX) * 0.04, X, Y), [id]);
  }

  // Braços. De frente a espada fica na mão da esquerda da tela; de costas, na da direita.
  const armY = (side: number) => s * side * (back ? -1 : 1);
  for (const side of [-1, 1]) {
    const sh: Pt = [CX + side * 12.5, top + 3];
    const el: Pt = [CX + side * 14, top + 10 + armY(side) * 0.5];
    const ha: Pt = [CX + side * 13.5, top + 18 + armY(side)];
    arm(c, sh, el, ha, false, back ? -side : side);
    if ((side < 0) === !back) sword(c, ha, [ha[0] + side * 4, ha[1] + 21]);
  }
  if (back) headBack(c, b);
  else headFront(c, b);
}

function side(c: Canvas, frame: number) {
  const s = SWING[frame], b = BOB[frame];
  const hip: Pt = [CX + 1, 66 + b];
  // Passo: perna da frente à esquerda, a outra atrás com o calcanhar no ar. Passagem: juntas.
  const pose = (fwd: number): [Pt, Pt, Pt] => {
    if (fwd > 0) return [[hip[0] - 4, 77 + b], [hip[0] - 7, FEET - 3], [hip[0] - 12, FEET - 2]];
    if (fwd < 0) return [[hip[0] + 3, 77 + b], [hip[0] + 7, FEET - 5], [hip[0] + 2.5, FEET - 3]];
    return [[hip[0] - 1, 77 + b], [hip[0], FEET - 3], [hip[0] - 5, FEET - 2]];
  };
  const [fk, fa, ft] = pose(-s);
  leg(c, hip, fk, fa, ft, true, false);
  // Braço de lá, atrás do tronco, balançando ao contrário da perna.
  const top = 47 + b;
  arm(c, [CX + 2, top + 3], [CX + 3 + s * 2, top + 10], [CX + 3 + s * 4, top + 18], true, 1);
  const [nk, na, nt] = pose(s);
  leg(c, hip, nk, na, nt, false, false);

  const torso: Pt[] = [[CX - 9, top + 3], [CX - 6, top], [CX + 8, top], [CX + 10, top + 3], [CX + 9, top + 13], [CX + 10, top + 21], [CX - 10, top + 21], [CX - 9, top + 13]];
  const id = poly(c, torso, Mat.Primary, CX - 10, CX + 10, quilt(CX));
  skirtFolds(c, id, CX, 9, top);
  belt(c, id, CX, 8.5, top, false);
  // Gola de lado: debrum em diagonal com a pele do pescoço na frente.
  const v: Pt[] = [[CX - 6.2, top - 0.5], [CX - 1.5, top - 0.5], [CX - 3.2, top + 4]];
  c.ink(pbox(v), inPoly(v), Mat.Skin, (_x, y) => (y < top + 1 ? 1 : 2), [id]);
  line(c, [[CX - 6.6, top - 0.3], [CX - 3.2, top + 4.6]], 0.6, 0.5, Mat.Trim, (x, _y, X, Y) => (((X + Y) % 6) < 2 ? 1 : quant(0.75 - (x - CX) * 0.03, X, Y)), [id]);

  // Braço de cá na frente do tronco, com a espada apontando para a frente e para baixo.
  const ha: Pt = [CX - 4 - s * 3, top + 18];
  arm(c, [CX - 1, top + 3], [CX - 2 - s * 1.5, top + 10], ha, false, -1);
  sword(c, ha, [ha[0] - 16, ha[1] + 15]);
  headSide(c, b);
}

// --- Cabeça -------------------------------------------------------------------------

/** Cabelo em mechas: cada uma é um traço curvo que afina na ponta, com a luz da calota e um tom próprio. */
function strands(c: Canvas, list: [Pt, Pt, Pt, number][], light: Shade, gloss: (x: number, y: number) => boolean, clip?: readonly number[]) {
  list.forEach(([a, ctrl, b, r], i) => {
    const bias = noise(i, 77) < 0.25 ? -1 : noise(i, 78) < 0.2 ? 1 : 0;
    const st = stroke(bez(a, ctrl, b, 12), r, r * 0.25);
    c.ink(st.box, st.test, Mat.Hair, (x, y, X, Y) => {
      const n = st.near(x, y);
      // Borda da mecha um tom abaixo: separa uma da outra.
      const edge = n.d > -0.12 ? -1 : 0;
      return Math.max(0, quant(light(x, y), X, Y) + bias + edge + (gloss(x, y) ? 1 : 0));
    }, clip);
  });
}

/** Barba por fazer: pontinhos de 1 px na mandíbula, mais densos embaixo, sumindo para as bochechas. */
function stubble(c: Canvas, face: number, box: Box, density: (x: number, y: number) => number) {
  c.ink(box, (x, y, X, Y) => noise(X, Y) < density(x, y), Mat.Hair, (_x, _y, X, Y) => (noise(Y, X) < 0.5 ? 2 : 1), [face]);
}

function ear(c: Canvas, cx: number, cy: number, sx: number, size = 1) {
  const e = ellipse(c, cx, cy, 1.6 * size, 2.4 * size, Mat.Skin, () => (size < 1 ? -1 : 0));
  // Hélice (borda), concha funda e lóbulo claro.
  line(c, bez([cx + sx * 0.3, cy - 1.8], [cx + sx * 1.3, cy - 0.4], [cx + sx * 0.5, cy + 1.4]), 0.18, 0.12, Mat.Skin, 1, [e]);
  spot(c, cx + sx * 0.1, cy + 0.2, 0.5, 0.8, Mat.Skin, 2, [e]);
  spot(c, cx - sx * 0.3, cy + 1.8, 0.45, 0.4, Mat.Skin, 4, [e]);
  return e;
}

/** Olho de frente: cavidade, branco, íris com anel e pupila, dois brilhos, pálpebras e cílio. */
function eyeFront(c: Canvas, ex: number, ey: number, sx: number) {
  spot(c, ex, ey - 0.9, 1.9, 0.9, Mat.Skin, 2); // sombra da cavidade
  const w = spot(c, ex, ey, 1.55, 0.72, Mat.White, (x) => (x * sx > ex * sx + 0.6 ? 1 : 3));
  const ix = ex + sx * -0.15;
  spot(c, ix, ey + 0.05, 0.66, 0.66, Mat.Iris, ball(ix, ey, 0.66, 0), [w]);
  c.ink(ebox(ix, ey, 0.66, 0.66), (x, y) => { const d = Math.hypot(x + 0.5 - ix, y + 0.55 - ey); return d > 0.5 && d <= 0.66; }, Mat.Eye, 1, [w]);
  spot(c, ix, ey + 0.05, 0.3, 0.3, Mat.Eye, 0, [w]);
  spot(c, ix - 0.25, ey - 0.25, 0.15, 0.15, Mat.White, 5, [w]);
  spot(c, ix + 0.3, ey + 0.3, 0.08, 0.08, Mat.White, 4, [w]);
  // Pálpebra de cima (grossa, cai para fora), de baixo (fina) e cílio no canto de fora.
  line(c, bez([ex - sx * 1.7, ey + 0.1], [ex, ey - 1.15], [ex + sx * 1.8, ey + 0.05]), 0.24, 0.3, Mat.Eye, 0);
  line(c, bez([ex - sx * 1.5, ey - 0.6], [ex, ey - 1.55], [ex + sx * 1.6, ey - 0.6]), 0.12, 0.12, Mat.Skin, 2);
  line(c, bez([ex - sx * 1.3, ey + 0.6], [ex, ey + 1.05], [ex + sx * 1.5, ey + 0.4]), 0.1, 0.1, Mat.Skin, 1);
  line(c, [[ex + sx * 1.7, ey], [ex + sx * 2.2, ey - 0.35]], 0.12, 0.05, Mat.Eye, 0);
}

function headFront(c: Canvas, b: number) {
  const cy = 37 + b;
  const neck = ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin);
  // Rosto: oval com o queixo afinando.
  const faceTest: Test = (x, y) => {
    const ny = (y + 0.5 - cy) / 9;
    const rx = 8.6 * (ny > 0.3 ? 1 - 0.32 * ((ny - 0.3) / 0.7) ** 2 : 1);
    return Math.abs(x + 0.5 - CX) <= rx * Math.sqrt(Math.max(0, 1 - ny * ny)) * (ny > 0 ? 1 : 1);
  };
  const face = c.fill(ebox(CX, cy, 8.6, 9), faceTest, Mat.Skin, sphere(CX, cy, 8.6, 9));
  // Sombra do queixo no pescoço.
  spot(c, CX, cy + 8.6, 3.6, 1, Mat.Skin, 1, [neck]);
  for (const sx of [-1, 1]) ear(c, CX + sx * 8.4, cy + 2, sx);
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const inHair = inEllipse(hx, hy, rx, ry);
  const light = sphere(hx, hy, rx, ry);
  const fringe = (x: number) => cy - 2.6 + noise(Math.floor(x * 2.2), 9) * 0.9 - (Math.abs(x - CX) < 1 ? 0.4 : 0);
  // Calota de base (fica por baixo das mechas e tapa os vãos).
  const cap = c.fill(ebox(hx, hy, rx, ry), (x, y) => inHair(x, y) && (y + 0.5 < fringe(x) - 0.3 || (Math.abs(x + 0.5 - CX) > 7.2 && y < cy + 2.6)), Mat.Hair, light, () => -1);
  // Mechas: do redemoinho no alto até a franja (em pontas sobre a testa) e as costeletas.
  const list: [Pt, Pt, Pt, number][] = [];
  for (let i = 0; i <= 46; i++) {
    const u = -1 + (2 * i) / 46 + (noise(i, 3) - 0.5) * 0.03;
    const start: Pt = [CX - 1 + u * 2.5, cy - 9.6];
    const sideEnd = Math.abs(u) > 0.84;
    const end: Pt = sideEnd ? [CX + u * 8.9, cy + 2.4 - noise(i, 4) * 1.6] : [CX + u * 8.3, fringe(CX + u * 8.3) + 0.2];
    const ctrl: Pt = [CX + u * 10.8, cy - 7.2 + Math.abs(u) * 2.6];
    list.push([start, ctrl, end, 0.5 + noise(i, 5) * 0.2]);
  }
  const gloss = (x: number, y: number) => { const d = Math.hypot(x + 0.5 - (CX - 2.5), (y + 0.5 - (cy - 4.2)) * 1.2); return d > 3.4 && d < 4.6; };
  strands(c, list, light, gloss);
  void cap;

  const Yc = cy;
  for (const sx of [-1, 1]) {
    const ex = CX + sx * 3.6;
    // Sobrancelha: três traços, grossa perto do nariz e afinando para fora.
    for (const [dy, r] of [[0, 0.42], [0.25, 0.32], [-0.2, 0.25]] as const) {
      line(c, bez([CX + sx * 1.4, Yc + 1.1 + dy], [CX + sx * 3.6, Yc + 0.1 + dy], [CX + sx * 6.2, Yc + 0.7 + dy]), r, r * 0.3, Mat.Hair, dy < 0 ? 2 : 1);
    }
    eyeFront(c, ex, Yc + 2.7, sx);
    // Maçã do rosto: luz em cima, cor quente pontilhada embaixo.
    c.ink(ebox(CX + sx * 5.6, Yc + 5.2, 1.7, 1.1), inEllipse(CX + sx * 5.6, Yc + 5.2, 1.7, 1.1), Mat.Lip, (_x, _y, X, Y) => (bayer(X, Y) < 0.35 ? 4 : -1), [face]);
    spot(c, CX + sx * 5.2, Yc + 3.9, 1, 0.35, Mat.Skin, sx < 0 ? 4 : 3, [face]);
  }
  // Nariz: dorso claro, lateral na sombra, ponta, asas e narinas.
  line(c, bez([CX - 0.4, Yc + 2], [CX - 0.6, Yc + 3.8], [CX - 0.4, Yc + 5]), 0.22, 0.3, Mat.Skin, 4, [face]);
  const ns: Pt[] = [[CX + 0.3, Yc + 2.2], [CX + 1.3, Yc + 4.6], [CX + 1.4, Yc + 5.8], [CX + 0.2, Yc + 5.6]];
  c.ink(pbox(ns), inPoly(ns), Mat.Skin, 2, [face]);
  spot(c, CX - 0.3, Yc + 5.3, 0.7, 0.55, Mat.Skin, 4, [face]);
  for (const sx of [-1, 1]) {
    line(c, bez([CX + sx * 0.7, Yc + 5.5], [CX + sx * 1.6, Yc + 5.4], [CX + sx * 1.3, Yc + 6.1]), 0.14, 0.1, Mat.Skin, 1, [face]);
    spot(c, CX + sx * 0.75, Yc + 6.05, 0.32, 0.18, Mat.Lip, 0, [face]);
  }
  // Filtro do lábio, boca (lábio de cima escuro, linha, lábio de baixo cheio com brilho), sombra do queixo.
  spot(c, CX, Yc + 6.8, 0.35, 0.4, Mat.Skin, 2, [face]);
  const upper: Pt[] = [[CX - 2.1, Yc + 7.6], [CX - 0.6, Yc + 7.1], [CX, Yc + 7.3], [CX + 0.6, Yc + 7.1], [CX + 2.1, Yc + 7.6], [CX, Yc + 7.75]];
  c.ink(pbox(upper), inPoly(upper), Mat.Lip, 1, [face]);
  line(c, bez([CX - 2.2, Yc + 7.7], [CX, Yc + 7.95], [CX + 2.2, Yc + 7.7]), 0.12, 0.12, Mat.Lip, 0, [face]);
  const lower: Pt[] = [[CX - 1.7, Yc + 7.9], [CX + 1.7, Yc + 7.9], [CX + 1, Yc + 8.6], [CX - 1, Yc + 8.6]];
  c.ink(pbox(lower), inPoly(lower), Mat.Lip, (x, _y, X, Y) => quant(0.62 - (x - CX) * 0.08, X, Y), [face]);
  spot(c, CX - 0.6, Yc + 8.15, 0.5, 0.14, Mat.Lip, 5, [face]);
  line(c, bez([CX - 1.2, Yc + 9.3], [CX, Yc + 9.0], [CX + 1.2, Yc + 9.3]), 0.12, 0.12, Mat.Skin, 2, [face]);
  spot(c, CX - 0.3, Yc + 10.1, 0.9, 0.35, Mat.Skin, 4, [face]);
  // Barba por fazer, cicatriz com relevo claro.
  stubble(c, face, [CX - 9, Yc + 4, CX + 9, Yc + 12], (x, y) => {
    const d = Math.abs(x + 0.5 - CX);
    const jaw = y + 0.5 > Yc + 9 - 0.1 * (8 - d) ** 1.2 * 0.7;
    const mouth = y > Yc + 6.6 && y < Yc + 9.2 && d < 2.6;
    const lip = y > Yc + 6.4 && y < Yc + 7.2 && d < 2.6;
    return mouth && !lip ? 0 : lip ? 0.1 : jaw ? 0.3 : d > 6.2 && y > Yc + 5 ? 0.12 : 0;
  });
  line(c, [[CX + 4.6, Yc + 3.4], [CX + 5.6, Yc + 5], [CX + 6.4, Yc + 6.4]], 0.18, 0.1, Mat.Lip, 1, [face]);
  line(c, [[CX + 4.5, Yc + 3.8], [CX + 5.3, Yc + 5.1]], 0.08, 0.04, Mat.Skin, 4, [face]);
}

function headBack(c: Canvas, b: number) {
  const cy = 37 + b;
  ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin);
  ellipse(c, CX, cy, 8.6, 9, Mat.Skin);
  for (const sx of [-1, 1]) ear(c, CX + sx * 8.4, cy + 2, -sx);
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const light = sphere(hx, hy, rx, ry);
  c.fill(ebox(hx, hy, rx, ry), inEllipse(hx, hy, rx, ry), Mat.Hair, light, () => -1);
  // Mechas saindo do redemoinho (atrás, no alto) para a nuca, os lados e a frente.
  const wx = CX + 1.2, wy = cy - 5.6;
  const list: [Pt, Pt, Pt, number][] = [];
  for (let i = 0; i < 52; i++) {
    const ang = (i / 52) * Math.PI * 2 + 0.4;
    const ex = Math.cos(ang), ey = Math.sin(ang);
    const end: Pt = [CX + ex * 9, Math.min(cy + 9.6 - noise(i, 2) * 0.8, cy - 0.8 + ey * 10)];
    const ctrl: Pt = [wx + ex * 3.8 + ey * 3.6, wy + ey * 3.8 - ex * 3.6];
    list.push([[wx + ex * 0.6, wy + ey * 0.6], ctrl, end, 0.55 + noise(i, 6) * 0.2]);
  }
  const gloss = (x: number, y: number) => { const d = Math.hypot(x + 0.5 - (CX - 2.5), (y + 0.5 - (cy - 3.6)) * 1.2); return d > 3.6 && d < 4.8; };
  strands(c, list, light, gloss);
}

function headSide(c: Canvas, b: number) {
  const cy = 37 + b;
  const cx = CX + 1;
  ellipse(c, CX - 0.5, cy + 9, 3, 2.5, Mat.Skin); // pescoço
  // Crânio, mandíbula e o perfil (testa, nariz, lábios e queixo saindo para a esquerda).
  const prof: Pt[] = [[cx - 7.6, cy - 2], [cx - 8.3, cy + 1.4], [cx - 9.9, cy + 4.6], [cx - 8.4, cy + 5.4], [cx - 8.6, cy + 6.6], [cx - 8.1, cy + 7.6], [cx - 8.4, cy + 8.2], [cx - 7.4, cy + 9.4], [cx - 3, cy + 9.6], [cx - 1, cy + 3]];
  const skull = ellipse(c, cx, cy, 8.2, 9, Mat.Skin);
  const face = c.fill(pbox(prof), inPoly(prof), Mat.Skin, sphere(cx, cy, 9.6, 9.6));
  void skull;
  const ids = [skull, face];
  // Narina, asa do nariz, boca, queixo.
  line(c, bez([cx - 8.6, cy + 5.1], [cx - 7.6, cy + 4.6], [cx - 7.8, cy + 5.4]), 0.16, 0.1, Mat.Skin, 1, ids);
  spot(c, cx - 9.2, cy + 4.3, 0.5, 0.35, Mat.Skin, 4, ids);
  line(c, [[cx - 8.5, cy + 6.75], [cx - 7.4, cy + 6.9]], 0.12, 0.08, Mat.Lip, 0, ids);
  spot(c, cx - 8.3, cy + 6.3, 0.4, 0.3, Mat.Lip, 1, ids);
  spot(c, cx - 8.2, cy + 7.2, 0.45, 0.32, Mat.Lip, 3, ids);
  line(c, bez([cx - 8.3, cy + 7.9], [cx - 7.6, cy + 7.8], [cx - 7.8, cy + 8.3]), 0.1, 0.08, Mat.Skin, 2, ids);
  // Cabelo: calota de trás e de cima, mechas indo para a nuca e para a franja.
  const hx = cx + 0.8, hy = cy - 0.8, rx = 9, ry = 9.4;
  const inHair = inEllipse(hx, hy, rx, ry);
  const light = sphere(hx, hy, rx, ry);
  const fringeY = (x: number) => cy - 2.6 + noise(Math.floor(x * 2.2), 5) * 0.9;
  c.fill(ebox(hx, hy, rx, ry), (x, y) => inHair(x, y) && (x >= cx - 0.5 || y + 0.5 < fringeY(x) - 0.3 || (x >= cx - 2.6 && y < cy + 3.6)), Mat.Hair, light);
  const list: [Pt, Pt, Pt, number][] = [];
  for (let i = 0; i < 40; i++) {
    const u = i / 39;
    const start: Pt = [cx + 1, cy - 9.4];
    // De trás para a frente: nuca, alto da cabeça, franja.
    const end: Pt = u < 0.45 ? [cx + 8.6 - u * 5, cy + 1 + (0.45 - u) * 9 - noise(i, 2)] : u < 0.62 ? [cx - 2.4, cy + 3.6 - (u - 0.45) * 8] : [cx - 2.4 - (u - 0.62) * 15, fringeY(cx - 2.4 - (u - 0.62) * 15) + 0.2];
    const ctrl: Pt = [cx + 9 * Math.cos((u - 0.1) * Math.PI) * 0.9, cy - 8 + u * 2];
    list.push([start, ctrl, end, 0.5 + noise(i, 5) * 0.2]);
  }
  // Nuca: mechas descendo por trás da orelha até a gola.
  for (let i = 0; i < 26; i++) {
    const u = i / 25;
    list.push([[cx + 1.5 + u * 3, cy - 7.5 + u * 2], [cx + 6 + u * 3.4, cy - 3 + u], [cx + 1.6 + u * 6.4, cy + 6.6 - u * 2.4 - noise(i, 9) * 0.8], 0.5 + noise(i, 11) * 0.2]);
  }
  const gloss = (x: number, y: number) => { const d = Math.hypot(x + 0.5 - (cx - 0.5), (y + 0.5 - (cy - 4.6)) * 1.2); return d > 3.4 && d < 4.6; };
  ear(c, cx + 1.2, cy + 2.6, 1, 0.8);
  strands(c, list, light, gloss);
  // Sobrancelha, olho de perfil (branco em cunha, íris de lado, brilho, pálpebra) e maçã do rosto.
  line(c, bez([cx - 4.4, cy + 1.2], [cx - 6, cy + 0.2], [cx - 7.8, cy + 0.9]), 0.4, 0.15, Mat.Hair, 1);
  const ex = cx - 6.3, ey = cy + 2.7;
  const wedge: Pt[] = [[ex - 1.3, ey], [ex + 0.9, ey - 0.6], [ex + 0.9, ey + 0.6]];
  const w = c.ink(pbox(wedge), inPoly(wedge), Mat.White, 3, ids);
  spot(c, ex - 0.55, ey, 0.5, 0.62, Mat.Iris, ball(ex - 0.55, ey, 0.6), [w, ...ids]);
  spot(c, ex - 0.8, ey, 0.2, 0.32, Mat.Eye, 0, [w, ...ids]);
  spot(c, ex - 0.55, ey - 0.3, 0.12, 0.12, Mat.White, 5);
  line(c, bez([ex - 1.5, ey - 0.1], [ex - 0.2, ey - 1.1], [ex + 1, ey - 0.5]), 0.24, 0.18, Mat.Eye, 0);
  line(c, [[ex - 1.3, ey + 0.5], [ex + 0.8, ey + 0.7]], 0.08, 0.08, Mat.Skin, 1, ids);
  c.ink(ebox(cx - 5, cy + 5.4, 1.4, 0.9), inEllipse(cx - 5, cy + 5.4, 1.4, 0.9), Mat.Lip, (_x, _y, X, Y) => (bayer(X, Y) < 0.35 ? 4 : -1), ids);
  stubble(c, face, [cx - 9, cy + 4, cx, cy + 11], (x, y) => (y > cy + 7.6 ? 0.3 : x > cx - 6 && y > cy + 5.5 ? 0.18 : 0));
  stubble(c, skull, [cx - 7, cy + 4, cx + 1, cy + 11], (x, y) => (y > cy + 7 && x < cx - 0.5 ? 0.25 : 0));
}

/** Pixels de cada quadro, calculados uma vez (a galeria pede o mesmo quadro várias vezes). */
const cache = new Map<string, Uint8ClampedArray>();

/** Quadro 576×576 do protótipo, virado para a esquerda no lado. Caminhada: passo, passagem, outro passo, passagem. */
export function protoFrame(dir: ProtoDir, frame: number, look: ProtoLook = KNIGHT_LOOK): HTMLCanvasElement {
  const key = `${dir}${frame}${JSON.stringify(look)}`;
  let data = cache.get(key);
  if (!data) {
    const c = new Canvas();
    if (dir === "side") side(c, frame);
    else front(c, frame, dir === "up");
    data = c.render(look);
    cache.set(key, data);
  }
  const { canvas, ctx } = makeCanvas(S, S);
  const image = ctx.createImageData(S, S);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
