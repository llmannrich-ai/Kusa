import { makeCanvas } from "../pixels.ts";
import { ramp, rgb, type Rgb } from "../hero/color.ts";

/**
 * Protótipo da Fase 0 de `docs/ARTE_TIBIA.md`: o cavaleiro sem equipamento no padrão inspirado no Tibia,
 * em **128 px de arte por tile** (4× a densidade do Tibia), para caber detalhe fino: íris e brilho no olho,
 * barba por fazer, mechas de cabelo, costura do gibão, furos e fivela do cinto, trama da calça, cadarço e sola
 * da bota, cabo trançado e sulco da espada.
 *
 * O desenho é feito em "unidades de projeto" (o quadro de 96 da versão anterior, pés na linha 91) e cada
 * unidade vira `K` × `K` pixels: as formas (esfera, cilindro, membro) são amostradas na resolução final, e as
 * texturas e os detalhes (`px`, deslocamentos de tom) já são desenhados pixel a pixel nela. Quadro final
 * 192×192, corpo de 128 px (1 tile). Luz de cima à esquerda em 4 faixas com pontilhado só na fronteira; a peça
 * da frente risca linha escura na de trás; contorno quase preto na sombra e suave na luz.
 *
 * Cada material é de uma **zona** (cabeça, primária, secundária, detalhe, debrum): a classe ou um cosmético
 * escolhe a cor de cada zona, como o outfit do Tibia. Só galeria por enquanto: o jogo continua com `heroes.ts`.
 */

/** Pixels finais por unidade de projeto. */
const K = 2;
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
    r("#a8584a", 0.6, 3),
    r("#7a5430", 1.1, 5), // íris
  ];
}

// --- Pintura ------------------------------------------------------------------------

const S = PROTO_SIZE;
const N = S * S;
/** Luz de cima à esquerda, um pouco de frente. */
const L = (() => { const v = [-0.55, -0.62, 0.56]; const n = Math.hypot(...v); return v.map((c) => c / n); })();
const BAYER = [0, 0.5, 0.75, 0.25];

/** Teste e luz recebem o ponto em unidades de projeto e o pixel final (X, Y). */
type Test = (x: number, y: number, X: number, Y: number) => boolean;
type Shade = (x: number, y: number) => number;
/** Desvio de tom por pixel final (texturas). */
type Offset = (X: number, Y: number) => number;

class Canvas {
  mat = new Int8Array(N).fill(-1);
  shade = new Float32Array(N);
  off = new Int8Array(N);
  fixed = new Int8Array(N).fill(-1);
  order = new Int16Array(N);
  part = new Int16Array(N);
  private seq = 0;

  /** Pinta a forma `test` (no retângulo dado, em unidades) com o material, a luz e o desvio de tom. */
  fill(box: readonly [number, number, number, number], test: Test, mat: Mat, shade: Shade, offset?: Offset) {
    const id = ++this.seq;
    const [x0, y0, x1, y1] = box;
    for (let Y = Math.max(0, Math.floor(y0 * K)); Y <= Math.min(S - 1, Math.ceil((y1 + 1) * K)); Y++) {
      for (let X = Math.max(0, Math.floor(x0 * K)); X <= Math.min(S - 1, Math.ceil((x1 + 1) * K)); X++) {
        const x = (X + 0.5) / K - 0.5, y = (Y + 0.5) / K - 0.5;
        if (!test(x, y, X, Y)) continue;
        const i = Y * S + X;
        this.mat[i] = mat;
        this.shade[i] = shade(x, y);
        this.off[i] = offset ? offset(X, Y) : 0;
        this.fixed[i] = -1;
        this.order[i] = id;
        this.part[i] = id;
      }
    }
    return id;
  }

  /** Um pixel final num tom fixo (detalhe desenhado à mão: olho, brilho, costura). */
  px(X: number, Y: number, mat: Mat, tone: number) {
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= S || Y >= S) return;
    const i = Y * S + X;
    if (this.mat[i] < 0) this.order[i] = this.part[i] = ++this.seq;
    this.mat[i] = mat;
    this.fixed[i] = tone;
  }

  /** Pixel fixo só onde já está pintada a peça `id` (cinto e barra não saem do tronco). */
  on(id: number, X: number, Y: number, mat: Mat, tone: number) {
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= S || Y >= S || this.part[Y * S + X] !== id || this.mat[Y * S + X] < 0) return;
    this.px(X, Y, mat, tone);
  }

  /** Muda o tom de quem já está pintado, sem mudar a peça (dobra, costura). */
  nudge(X: number, Y: number, delta: number) {
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= S || Y >= S) return;
    const i = Y * S + X;
    if (this.mat[i] >= 0) this.off[i] += delta;
  }

  render(look: ProtoLook): Uint8ClampedArray {
    const tones = ramps(look);
    const out = new Uint8ClampedArray(N * 4);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= S || y >= S ? -1 : y * S + x);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        const m = this.mat[i];
        if (m < 0) {
          // Contorno de fora: quase preto na sombra, a cor mais escura do vizinho do lado da luz.
          const n = [at(x + 1, y), at(x, y + 1), at(x - 1, y), at(x, y - 1)].find((j) => j >= 0 && this.mat[j] >= 0);
          if (n === undefined) continue;
          const lit = (at(x + 1, y) === n || at(x, y + 1) === n) && this.shade[n] > 0.62;
          const c = lit ? tones[this.mat[n]][0] : OUTLINE;
          out.set([c[0], c[1], c[2], 255], i * 4);
          continue;
        }
        let tone: number;
        if (this.fixed[i] >= 0) tone = this.fixed[i];
        else {
          const v = this.shade[i] * 4 + (BAYER[(y & 1) * 2 + (x & 1)] - 0.5) * 0.55;
          tone = Math.max(1, Math.min(4, Math.floor(v) + 1)) + this.off[i];
          // Linha interna: a peça da frente risca a de trás com o tom 0.
          const front = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)]
            .some((j) => j >= 0 && this.mat[j] >= 0 && this.part[j] !== this.part[i] && this.order[j] > this.order[i] && this.fixed[j] < 0);
          if (front) tone = 0;
        }
        const c = tones[m][Math.max(0, Math.min(5, tone))];
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

/** Esfera achatada. */
function ellipse(c: Canvas, cx: number, cy: number, rx: number, ry: number, mat: Mat, offset?: Offset) {
  return c.fill([cx - rx, cy - ry, cx + rx, cy + ry], inEllipse(cx, cy, rx, ry), mat, sphere(cx, cy, rx, ry), offset);
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
  const box = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r] as const;
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

/** Polígono (par-ímpar) com volume de cilindro em pé entre `x0` e `x1`. */
function poly(c: Canvas, pts: readonly Pt[], mat: Mat, x0: number, x1: number, offset?: Offset) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  return c.fill([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], (x, y) => {
    let on = false;
    const px = x + 0.5, py = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) on = !on;
    }
    return on;
  }, mat, (x) => {
    const u = Math.max(-0.95, Math.min(0.95, (x + 0.5 - mid) / half));
    return lit(u, -0.25, Math.sqrt(1 - u * u));
  }, offset);
}

/** Ruído fixo por pixel (sem `Math.random`, o desenho é sempre igual). */
const noise = (x: number, y: number) => {
  let h = Math.imul(Math.floor(x) * 374761393 + Math.floor(y) * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};

/** Unidade de projeto (contínua) → pixel final. */
const F = (u: number) => Math.round(u * K);

// --- Texturas (pixel final) ---------------------------------------------------------

/** Gibão acolchoado: canais verticais de 8 px, costura com pontos e um brilho de tecido no meio do canal. */
const quilt = (cx: number): Offset => (X, Y) => {
  const k = ((X - F(cx)) % 8 + 8) % 8;
  if (k === 0) return Y % 4 === 0 ? -2 : -1;
  if (k === 1) return Y % 4 === 2 ? -1 : 0;
  return k === 4 && noise(X, Y) < 0.18 ? 1 : 0;
};

/** Manga acolchoada: canais na horizontal. */
const sleeve: Offset = (X, Y) => (Y % 7 === 0 ? (X % 3 === 0 ? -2 : -1) : Y % 7 === 3 && noise(X, Y) < 0.2 ? 1 : 0);

/** Cabelo: mechas finas claras e escuras, que mudam devagar ao descer. */
const strands: Offset = (X, Y) => {
  const s = noise(X, 7) * 0.7 + noise(X, Math.floor(Y / 6)) * 0.5;
  return s > 0.98 ? 1 : s < 0.22 ? -1 : 0;
};

/** Sarja da calça: diagonal leve. */
const twill: Offset = (X, Y) => ((X + Y) % 3 === 0 && noise(X, Y) < 0.55 ? -1 : 0);

/** Couro: pontinhos de poro e arranhões claros. */
const leather: Offset = (X, Y) => (noise(X, Y) < 0.07 ? -1 : noise(X + 31, Y) < 0.04 ? 1 : 0);

const darker = (o: Offset | undefined, far: boolean): Offset | undefined =>
  far ? (X, Y) => -1 + (o ? o(X, Y) : 0) : o;

// --- Peças --------------------------------------------------------------------------

function boot(c: Canvas, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const shaft = limb(c, [ankle[0], ankle[1] - 5], ankle, 3.7, 3.7, Mat.Detail, darker(leather, far));
  const foot = limb(c, ankle, toe, 3.5, 2.9, Mat.Detail, darker(leather, far));
  // Dobra do cano: 2 px claros e 1 escuro no alto da bota.
  const top = F(ankle[1] - 8.4);
  for (let X = F(ankle[0] - 4); X <= F(ankle[0] + 4); X++) {
    c.on(shaft, X, top, Mat.Detail, far ? 3 : 4);
    c.on(shaft, X, top + 1, Mat.Detail, far ? 2 : 3);
    c.on(shaft, X, top + 2, Mat.Detail, 1);
  }
  // Cadarço cruzado na frente da bota (só de frente).
  if (front && !far) {
    const cx = F(ankle[0]);
    for (let k = 0; k < 4; k++) {
      const Y = top + 4 + k * 3;
      c.on(shaft, cx - 1, Y, Mat.Detail, 0); c.on(shaft, cx, Y, Mat.Detail, 0);
      c.on(shaft, cx - 2, Y + 1, Mat.Trim, 2); c.on(shaft, cx + 1, Y + 1, Mat.Trim, 2);
    }
  }
  // Sola: as duas últimas linhas de cada coluna da bota, com costura clara logo acima.
  for (let X = F(Math.min(ankle[0], toe[0]) - 4); X <= F(Math.max(ankle[0], toe[0]) + 4); X++) {
    for (let Y = S - 1; Y > 0; Y--) {
      const p = c.part[Y * S + X];
      if (c.mat[Y * S + X] === Mat.Detail && (p === foot || p === shaft)) {
        c.px(X, Y, Mat.Detail, 0); c.px(X, Y - 1, Mat.Detail, 1);
        if (X % 3 === 0) c.px(X, Y - 2, Mat.Detail, far ? 2 : 4);
        break;
      }
    }
  }
  if (!far) { c.px(F(ankle[0] - 2), F(ankle[1] - 3), Mat.Detail, 5); c.px(F(toe[0] - 1), F(toe[1] - 2), Mat.Detail, 5); }
}

function leg(c: Canvas, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const thigh = limb(c, hip, knee, 4.4, 3.8, Mat.Secondary, darker(twill, far));
  limb(c, knee, ankle, 3.8, 3.3, Mat.Secondary, darker(twill, far));
  // Dobras do tecido no joelho: dois risquinhos em diagonal.
  const kx = F(knee[0]), ky = F(knee[1]);
  for (const [dx, dy] of [[-2, -1], [-1, 0], [0, 0], [1, 1], [-1, 3], [0, 3], [1, 4]]) c.nudge(kx + dx, ky + dy, -1);
  c.on(thigh, kx - 3, ky - 3, Mat.Secondary, far ? 3 : 4);
  boot(c, ankle, toe, far, front);
}

function hand(c: Canvas, at: Pt, far: boolean) {
  const id = ellipse(c, at[0], at[1], 3.1, 3.3, Mat.Skin, darker(undefined, far));
  // Dedos: três vincos embaixo e o nó do polegar claro.
  const X = F(at[0]), Y = F(at[1]);
  for (const dx of [-3, -1, 1, 3]) { c.on(id, X + dx, Y + 4, Mat.Skin, 1); c.on(id, X + dx, Y + 5, Mat.Skin, 1); }
  c.on(id, X - 3, Y - 3, Mat.Skin, far ? 3 : 4);
  c.on(id, X - 2, Y - 4, Mat.Skin, far ? 3 : 4);
}

function arm(c: Canvas, shoulder: Pt, elbow: Pt, at: Pt, far: boolean) {
  limb(c, shoulder, elbow, 3.9, 3.5, Mat.Primary, darker(sleeve, far));
  const cuff: Pt = [elbow[0] + (at[0] - elbow[0]) * 0.72, elbow[1] + (at[1] - elbow[1]) * 0.72];
  limb(c, elbow, cuff, 3.5, 3.3, Mat.Primary, darker(sleeve, far));
  const band = limb(c, cuff, [cuff[0] + (at[0] - cuff[0]) * 0.4, cuff[1] + (at[1] - cuff[1]) * 0.4], 3.5, 3.5, Mat.Trim, darker(undefined, far));
  // Bordado do punho: pontinhos escuros espaçados.
  for (let X = F(cuff[0] - 4); X <= F(cuff[0] + 4); X += 3) c.on(band, X, F(cuff[1] + 1), Mat.Trim, 1);
  hand(c, at, far);
}

/** Espada de treino: lâmina com gume claro e sulco central, guarda gravada, cabo trançado e pomo. */
function sword(c: Canvas, at: Pt, tip: Pt) {
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const guard: Pt = [at[0] + ux * 4.5, at[1] + uy * 4.5];
  const across = (x: number, y: number) => { const s = seg(x + 0.5, y + 0.5, guard, tip); return { s, side: s.sx * -uy + s.sy * ux }; };
  const blade = c.fill([Math.min(guard[0], tip[0]) - 3, Math.min(guard[1], tip[1]) - 3, Math.max(guard[0], tip[0]) + 3, Math.max(guard[1], tip[1]) + 3],
    (x, y) => {
      const { s } = across(x, y);
      return s.d <= (s.t > 0.85 ? 1.9 * (1 - s.t) / 0.15 + 0.3 : 1.9);
    }, Mat.Steel, (x, y) => {
      const { side } = across(x, y);
      return side > 1.2 ? 1 : side > 0.4 ? 0.8 : side < -1.2 ? 0.25 : side < -0.4 ? 0.4 : 0.6;
    }, (X, Y) => {
      const { s, side } = across((X + 0.5) / K - 0.5, (Y + 0.5) / K - 0.5);
      // Sulco no meio até 3/4 da lâmina e riscos de uso aqui e ali.
      if (Math.abs(side) < 0.3 && s.t < 0.72) return -2;
      return noise(X, Y) < 0.05 ? -1 : 0;
    });
  void blade;
  // Guarda perpendicular, com um ponto gravado em cada braço, e cabo trançado.
  const gx = -uy, gy = ux;
  const g = limb(c, [guard[0] - gx * 5, guard[1] - gy * 5], [guard[0] + gx * 5, guard[1] + gy * 5], 1.4, 1.4, Mat.Trim);
  for (const k of [-3, 3]) c.on(g, F(guard[0] + gx * k), F(guard[1] + gy * k), Mat.Trim, 1);
  limb(c, [at[0] - ux * 3, at[1] - uy * 3], guard, 1.3, 1.3, Mat.Detail, (X, Y) => ((X + Y) % 3 === 0 ? -1 : (X + Y) % 3 === 1 ? 1 : 0));
  const pommel = ellipse(c, at[0] - ux * 4.5, at[1] - uy * 4.5, 1.8, 1.8, Mat.Trim);
  c.on(pommel, F(at[0] - ux * 4.5 - 0.6), F(at[1] - uy * 4.5 - 0.6), Mat.Trim, 5);
}

/** Cinto com fivela, furos e costura, e barra dourada com losangos na saia, só sobre o tronco `id`. */
function belt(c: Canvas, id: number, cx: number, half: number, top: number, buckle: boolean) {
  const Y0 = F(top + 13);
  for (let X = F(cx - half); X <= F(cx + half); X++) {
    c.on(id, X, Y0, Mat.Detail, 4);
    for (let k = 1; k <= 4; k++) c.on(id, X, Y0 + k, Mat.Detail, X < F(cx) ? 3 : 2);
    c.on(id, X, Y0 + 5, Mat.Detail, 0);
    if (X % 3 === 0) { c.on(id, X, Y0 + 1, Mat.Detail, 1); c.on(id, X, Y0 + 4, Mat.Detail, 1); }
  }
  if (buckle) {
    // Furos à direita da fivela.
    for (const k of [8, 12, 16]) c.on(id, F(cx) + k, Y0 + 2, Mat.Detail, 0);
    const bx = F(cx) - 5, by = Y0 - 2;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const ring = x < 2 || x > 7 || y < 2 || y > 7;
      if (!ring) continue;
      c.px(bx + x, by + y, Mat.Trim, x < 2 || y < 2 ? (x + y < 3 ? 5 : 4) : y > 7 || x > 7 ? 1 : 3);
    }
    for (let y = 2; y < 8; y++) c.px(bx + 5, by + y, Mat.Steel, 4);
  }
  // Barra da saia.
  const H0 = F(top + 19);
  for (let X = F(cx - half - 1.5); X <= F(cx + half + 1.5); X++) {
    c.on(id, X, H0, Mat.Trim, X < F(cx) - 8 ? 5 : 4);
    const d = ((X % 6) + 6) % 6;
    c.on(id, X, H0 + 1, Mat.Trim, d === 0 || d === 1 ? 1 : 3);
    c.on(id, X, H0 + 2, Mat.Trim, d === 3 ? 1 : 2);
    c.on(id, X, H0 + 3, Mat.Trim, 1);
  }
}

// --- Poses --------------------------------------------------------------------------

const FEET = 91;
const CX = 47.5;

/** Balanço da caminhada: passo, passagem, outro passo, passagem. */
const SWING = [1, 0, -1, 0];
const BOB = [0, -1, 0, -1];

function front(c: Canvas, frame: number, back: boolean) {
  const s = SWING[frame], b = BOB[frame];
  const hipY = 66 + b;
  // Pernas: no passo, a de trás tira o calcanhar do chão (pé 2 unidades acima).
  const legs: [number, number][] = [[CX - 4.5, s < 0 ? -2 : 0], [CX + 4.5, s > 0 ? -2 : 0]];
  legs.forEach(([x, lift], i) => {
    const far = back ? i === 0 : i === 1;
    const knee: Pt = [x + (i ? 0.5 : -0.5), 77 + b + lift / 2];
    const ankle: Pt = [x + (i ? 0.5 : -0.5), FEET - 3 + lift];
    leg(c, [x, hipY], knee, ankle, [ankle[0], ankle[1] + 1.5], far, true);
  });

  // Tronco: ombros largos, cintura, saia do gibão abrindo até a barra.
  const top = 47 + b;
  const torso: Pt[] = [[CX - 13, top + 2], [CX - 9, top], [CX + 9, top], [CX + 13, top + 2], [CX + 11, top + 13], [CX + 12, top + 21], [CX - 12, top + 21], [CX - 11, top + 13]];
  const id = poly(c, torso, Mat.Primary, CX - 13, CX + 13, quilt(CX));
  belt(c, id, CX, 10.5, top, !back);
  if (!back) {
    // Gola em V: pele com sombra do pescoço, debrum dourado de 2 px dos dois lados.
    const X0 = F(CX), T = F(top);
    for (let k = 0; k < 12; k++) {
      const w = Math.max(0, 6 - Math.floor(k / 2));
      for (let x = -w; x < w; x++) c.px(X0 + x, T + k, Mat.Skin, k < 3 ? 1 : x < 0 ? 3 : 2);
      c.on(id, X0 - w - 1, T + k, Mat.Trim, 4); c.on(id, X0 - w - 2, T + k, Mat.Trim, 3);
      c.on(id, X0 + w, T + k, Mat.Trim, 2); c.on(id, X0 + w + 1, T + k, Mat.Trim, 1);
    }
  } else {
    // Costura das costas e gola.
    for (let Y = F(top + 2); Y < F(top + 12); Y++) c.nudge(F(CX), Y, -1);
    for (let X = F(CX - 5); X <= F(CX + 5); X++) { c.on(id, X, F(top), Mat.Trim, 3); c.on(id, X, F(top) + 1, Mat.Trim, 1); }
  }

  // Braços. De frente a espada fica na mão da esquerda da tela; de costas, na da direita.
  const armY = (side: number) => s * side * (back ? -1 : 1);
  for (const side of [-1, 1]) {
    const sh: Pt = [CX + side * 12.5, top + 3];
    const el: Pt = [CX + side * 14, top + 10 + armY(side) * 0.5];
    const ha: Pt = [CX + side * 13.5, top + 18 + armY(side)];
    arm(c, sh, el, ha, false);
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
  arm(c, [CX + 2, top + 3], [CX + 3 + s * 2, top + 10], [CX + 3 + s * 4, top + 18], true);
  const [nk, na, nt] = pose(s);
  leg(c, hip, nk, na, nt, false, false);

  const torso: Pt[] = [[CX - 9, top + 3], [CX - 6, top], [CX + 8, top], [CX + 10, top + 3], [CX + 9, top + 13], [CX + 10, top + 21], [CX - 10, top + 21], [CX - 9, top + 13]];
  const id = poly(c, torso, Mat.Primary, CX - 10, CX + 10, quilt(CX));
  belt(c, id, CX, 8.5, top, false);
  // Gola de lado: debrum em diagonal com a pele do pescoço na frente.
  for (let k = 0; k < 8; k++) {
    c.px(F(CX - 6) + k, F(top) + k, Mat.Trim, 4); c.px(F(CX - 6) + k + 1, F(top) + k, Mat.Trim, 2);
    for (let x = 0; x < 5 - Math.floor(k / 2); x++) c.px(F(CX - 6) + k + 2 + x, F(top) + k, Mat.Skin, 1);
  }

  // Braço de cá na frente do tronco, com a espada apontando para a frente e para baixo.
  const ha: Pt = [CX - 4 - s * 3, top + 18];
  arm(c, [CX - 1, top + 3], [CX - 2 - s * 1.5, top + 10], ha, false);
  sword(c, ha, [ha[0] - 16, ha[1] + 15]);
  headSide(c, b);
}

// --- Cabeça (detalhes em pixel final) -------------------------------------------------

/** Pixel espelhado em torno do centro do rosto: `sx` = −1 (esquerda da tela) ou 1, `dx` = 0 encostado no meio. */
const mx = (sx: number, dx: number) => (sx < 0 ? F(CX) - 1 - dx : F(CX) + dx);

/** Barba por fazer: pontinhos esparsos no queixo e na mandíbula. */
function stubble(c: Canvas, id: number, X0: number, X1: number, Y0: number, Y1: number, keep: (X: number, Y: number) => boolean) {
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) if (keep(X, Y) && noise(X, Y) < 0.2) c.on(id, X, Y, Mat.Hair, noise(Y, X) < 0.5 ? 2 : 3);
}

function headFront(c: Canvas, b: number) {
  const cy = 37 + b;
  ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin); // pescoço
  const face = ellipse(c, CX, cy, 8.6, 9, Mat.Skin);
  // Orelhas com a curva de dentro.
  for (const sx of [-1, 1]) {
    const ear = ellipse(c, CX + sx * 8.6, cy + 2, 1.6, 2.4, Mat.Skin);
    for (const [dx, dy] of [[0, -2], [1, -1], [1, 0], [1, 1], [0, 2]]) c.on(ear, F(CX + sx * 8.6) + sx * dx, F(cy + 2) + dy, Mat.Skin, 1);
  }
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const inHair = inEllipse(hx, hy, rx, ry);
  // Calota com franja em pontas finas acima da sobrancelha e costeletas até a orelha.
  const hair = c.fill([hx - rx, hy - ry, hx + rx, hy + ry], (x, y, X, Y) => {
    if (!inHair(x, y)) return false;
    const fringe = F(cy - 3) + Math.floor(noise(Math.floor(X / 2), 9) * 4) - (Math.abs(X - F(CX)) < 3 ? 1 : 0);
    return Y < fringe || (Math.abs(x + 0.5 - CX) > 7 && y < cy + 3);
  }, Mat.Hair, sphere(hx, hy, rx, ry), strands);
  // Brilho do cabelo em arco no alto à esquerda.
  for (let X = F(CX - 7); X <= F(CX + 1); X++) {
    const Y = F(hy - 6) + Math.round(((X - F(CX - 3)) / 8) ** 2 * 3);
    if (noise(X, 2) < 0.7) { c.on(hair, X, Y, Mat.Hair, 5); c.on(hair, X, Y + 1, Mat.Hair, 4); }
  }

  const Yc = F(cy);
  for (const sx of [-1, 1]) {
    // Sobrancelha: grossa perto do nariz, afinando para fora.
    for (let dx = 3; dx <= 10; dx++) c.px(mx(sx, dx), Yc + 1 + (dx < 5 ? 1 : 0), Mat.Hair, dx > 8 ? 2 : 1);
    for (let dx = 4; dx <= 7; dx++) c.px(mx(sx, dx), Yc + 2 + (dx < 5 ? 1 : 0), Mat.Hair, 1);
    // Olho de 5 × 3: pálpebra escura, branco, íris com pupila e brilho, pálpebra de baixo.
    for (let dx = 4; dx <= 9; dx++) c.px(mx(sx, dx), Yc + 4, Mat.Eye, dx === 9 ? 1 : 0);
    const row = [[4, Mat.White, 3], [5, Mat.Iris, 3], [6, Mat.Eye, 0], [7, Mat.Iris, 2], [8, Mat.White, 2], [9, Mat.Eye, 1]] as const;
    for (const [dx, m, t] of row) c.px(mx(sx, dx), Yc + 5, m, t);
    for (const [dx, m, t] of [[4, Mat.White, 2], [5, Mat.Iris, 2], [6, Mat.Iris, 1], [7, Mat.Iris, 1], [8, Mat.White, 1]] as const) c.px(mx(sx, dx), Yc + 6, m, t);
    c.px(mx(sx, sx < 0 ? 7 : 5), Yc + 5, Mat.White, 5);
    for (let dx = 5; dx <= 8; dx++) c.px(mx(sx, dx), Yc + 7, Mat.Skin, 2);
    // Maçã do rosto: um toque de cor quente.
    for (const [dx, dy] of [[10, 9], [10, 10]]) c.px(mx(sx, dx), Yc + dy, Mat.Lip, 4);
  }
  // Nariz: sombra do lado direito, ponta clara, narinas.
  for (let dy = 6; dy <= 10; dy++) c.px(mx(1, 1), Yc + dy, Mat.Skin, 2);
  c.px(mx(-1, 0), Yc + 10, Mat.Skin, 4); c.px(mx(1, 0), Yc + 11, Mat.Skin, 2);
  c.px(mx(-1, 1), Yc + 12, Mat.Skin, 1); c.px(mx(1, 1), Yc + 12, Mat.Skin, 1); c.px(mx(1, 0), Yc + 12, Mat.Skin, 2);
  // Boca: linha dos lábios, cantinhos e lábio de baixo claro.
  for (let dx = 0; dx <= 3; dx++) for (const sx of [-1, 1]) c.px(mx(sx, dx), Yc + 15, Mat.Lip, dx === 3 ? 2 : 0);
  for (let dx = 0; dx <= 2; dx++) for (const sx of [-1, 1]) c.px(mx(sx, dx), Yc + 16, Mat.Lip, sx < 0 && dx < 2 ? 4 : 3);
  c.px(mx(-1, 0), Yc + 13, Mat.Skin, 2);
  stubble(c, face, mx(-1, 13), mx(1, 13), Yc + 11, Yc + 19, (X, Y) => {
    const d = Math.abs(X - F(CX) + 0.5);
    return (d > 8 || Y > Yc + 16) && !(Y >= Yc + 14 && Y <= Yc + 16 && d < 5);
  });
  // Cicatriz do cavaleiro na bochecha direita.
  for (let k = 0; k < 5; k++) { c.px(mx(1, 9 + k), Yc + 6 + k, Mat.Lip, 1); c.px(mx(1, 8 + k), Yc + 6 + k, Mat.Skin, 4); }
  void hair;
}

function headBack(c: Canvas, b: number) {
  const cy = 37 + b;
  ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin);
  ellipse(c, CX, cy, 8.6, 9, Mat.Skin);
  for (const sx of [-1, 1]) ellipse(c, CX + sx * 8.6, cy + 2, 1.6, 2.4, Mat.Skin);
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const hair = c.fill([hx - rx, hy - ry, hx + rx, hy + ry + 1], (x, y, X, Y) =>
    inHairBack(x, y, hx, hy, rx, ry) || (Y <= F(hy + ry) + 1 && Math.abs(x + 0.5 - CX) < 6.5 && y > hy && noise(Math.floor(X / 2), 3) < 0.6),
  Mat.Hair, sphere(hx, hy, rx, ry), strands);
  // Redemoinho no alto da cabeça e brilho.
  const Xc = F(CX), Yt = F(hy - 5);
  for (const [dx, dy] of [[0, 0], [1, 0], [2, 1], [2, 2], [1, 3], [-1, 2], [-1, 1]]) c.on(hair, Xc + dx, Yt + dy, Mat.Hair, 1);
  for (let X = F(CX - 7); X <= F(CX - 1); X++) if (noise(X, 4) < 0.7) c.on(hair, X, F(hy - 6) + Math.round(((X - F(CX - 4)) / 6) ** 2 * 3), Mat.Hair, 5);
}
const inHairBack = (x: number, y: number, hx: number, hy: number, rx: number, ry: number) => inEllipse(hx, hy, rx, ry)(x, y);

function headSide(c: Canvas, b: number) {
  const cy = 37 + b;
  const cx = CX + 1;
  ellipse(c, CX - 0.5, cy + 9, 3, 2.5, Mat.Skin); // pescoço
  const face = ellipse(c, cx, cy, 8.2, 9, Mat.Skin);
  const X0 = F(cx), Yc = F(cy);
  // Perfil: testa, nariz que sai do rosto, lábios e queixo, pixel a pixel (olhando para a esquerda).
  const nose = [[-17, 3, 3], [-18, 4, 3], [-18, 5, 4], [-19, 6, 3], [-19, 7, 3], [-19, 8, 2], [-18, 9, 2], [-17, 9, 1], [-18, 8, 3]] as const;
  for (const [dx, dy, t] of nose) c.px(X0 + dx, Yc + dy, Mat.Skin, t);
  c.px(X0 - 16, Yc + 10, Mat.Skin, 1);
  for (const [dx, dy, m, t] of [[-16, 13, Mat.Lip, 1], [-15, 13, Mat.Lip, 0], [-14, 13, Mat.Lip, 0], [-16, 14, Mat.Lip, 3], [-15, 14, Mat.Lip, 2]] as const) c.px(X0 + dx, Yc + dy, m, t);
  // Cabelo: calota de trás e de cima, franja em pontas na testa, costeleta na frente da orelha.
  const hx = cx + 0.8, hy = cy - 0.8, rx = 9, ry = 9.4;
  const inHair = inEllipse(hx, hy, rx, ry);
  const hair = c.fill([hx - rx, hy - ry, hx + rx, hy + ry], (x, y, X, Y) => {
    if (!inHair(x, y)) return false;
    const fringe = F(cy - 3) + Math.floor(noise(Math.floor(X / 2), 5) * 4);
    return x >= cx || Y < fringe || (x >= cx - 2.5 && y < cy + 4);
  }, Mat.Hair, sphere(hx, hy, rx, ry), strands);
  for (let X = F(cx - 5); X <= F(cx + 3); X++) if (noise(X, 2) < 0.7) c.on(hair, X, F(hy - 6) + Math.round(((X - F(cx - 1)) / 8) ** 2 * 3), Mat.Hair, 5);
  // Orelha com a curva de dentro.
  const ear = c.fill([cx + 0.5, cy, cx + 3, cy + 4.5], inEllipse(cx + 1.8, cy + 2.2, 1.6, 2.3), Mat.Skin, sphere(cx + 1.8, cy + 2.2, 1.6, 2.3));
  for (const [dx, dy] of [[3, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 4]]) c.on(ear, X0 + dx, Yc + dy, Mat.Skin, 1);
  // Sobrancelha, olho de perfil com íris e brilho, cílio.
  for (let dx = -13; dx <= -8; dx++) c.px(X0 + dx, Yc + 1 + (dx > -10 ? 0 : 1), Mat.Hair, 1);
  for (const [dx, m, t] of [[-13, Mat.Eye, 0], [-12, Mat.Eye, 0], [-11, Mat.Eye, 0], [-10, Mat.Eye, 1]] as const) c.px(X0 + dx, Yc + 4, m, t);
  for (const [dx, m, t] of [[-13, Mat.Iris, 2], [-12, Mat.Eye, 0], [-11, Mat.White, 3], [-10, Mat.White, 2]] as const) c.px(X0 + dx, Yc + 5, m, t);
  for (const [dx, m, t] of [[-13, Mat.Iris, 1], [-12, Mat.Iris, 1], [-11, Mat.White, 1]] as const) c.px(X0 + dx, Yc + 6, m, t);
  c.px(X0 - 13, Yc + 5, Mat.White, 5);
  c.px(X0 - 14, Yc + 4, Mat.Eye, 0);
  c.px(X0 - 8, Yc + 9, Mat.Lip, 4);
  stubble(c, face, X0 - 14, X0 - 2, Yc + 11, Yc + 18, (X, Y) => X > X0 - 12 || Y > Yc + 15);
  void hair;
}

/** Quadro 192×192 do protótipo, virado para a esquerda no lado. Caminhada: passo, passagem, outro passo, passagem. */
export function protoFrame(dir: ProtoDir, frame: number, look: ProtoLook = KNIGHT_LOOK): HTMLCanvasElement {
  const c = new Canvas();
  if (dir === "side") side(c, frame);
  else front(c, frame, dir === "up");
  const { canvas, ctx } = makeCanvas(S, S);
  const image = ctx.createImageData(S, S);
  image.data.set(c.render(look));
  ctx.putImageData(image, 0, 0);
  return canvas;
}
