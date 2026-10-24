import { makeCanvas } from "../pixels.ts";
import { ramp, rgb, type Rgb } from "../hero/color.ts";

/**
 * Protótipo da Fase 0 de `docs/ARTE_TIBIA.md`: o cavaleiro sem equipamento no padrão inspirado no Tibia,
 * em **64 px de arte por tile** (o dobro da arte atual) para caber detalhe fino: mechas de cabelo, sobrancelha
 * e olho com brilho, costura do gibão, fivela, couro da bota, gume e sulco da espada.
 *
 * Quadro 96×96 com os pés na linha 91 e o corpo com 64 px de altura (1 tile); a sobra é para arma e chapéu.
 * Cada peça é uma forma com volume (esfera, cilindro, membro) e luz de cima à esquerda; o tom sai em 4 faixas
 * com pontilhado só na fronteira entre elas. A peça da frente risca uma linha escura na de trás, e a figura
 * ganha contorno quase preto do lado da sombra e mais suave do lado da luz.
 *
 * Cada material é de uma **zona** (cabeça, primária, secundária, detalhe): a classe ou um cosmético escolhe
 * a cor de cada zona, como o outfit do Tibia. Só galeria por enquanto: o jogo continua com `heroes.ts`.
 */

export const PROTO_SIZE = 96;
/** Pixels de arte por tile (o protótipo é desenhado com o dobro da densidade da arte atual). */
export const PROTO_TILE = 64;
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

const enum Mat { Skin, Hair, Primary, Secondary, Detail, Trim, Steel, Eye, White, Lip }

const OUTLINE: Rgb = rgb("#1a1210");

function ramps(look: ProtoLook): Rgb[][] {
  const r = (base: string, contrast = 1, shift = 6, shine = false) => ramp(base, { contrast, shift, shine }).map(rgb);
  return [
    r("#e2ac86", 0.8, 4), // pele
    r(look.head, 1.1, 8),
    r(look.primary, 0.95, 7),
    r(look.secondary, 0.95, 6),
    r(look.detail, 1, 6),
    r(look.trim, 1.25, 8, true),
    r("#8e959e", 1.4, 6, true), // aço
    r("#2a1a12", 0.5, 0),
    r("#f2ece2", 0.3, 0),
    r("#a8584a", 0.6, 3),
  ];
}

// --- Pintura ------------------------------------------------------------------------

const S = PROTO_SIZE;
const N = S * S;
/** Luz de cima à esquerda, um pouco de frente. */
const L = (() => { const v = [-0.55, -0.62, 0.56]; const n = Math.hypot(...v); return v.map((c) => c / n); })();
const BAYER = [0, 0.5, 0.75, 0.25];

type Test = (x: number, y: number) => boolean;
type Shade = (x: number, y: number) => number;
type Offset = (x: number, y: number) => number;

class Canvas {
  mat = new Int8Array(N).fill(-1);
  shade = new Float32Array(N);
  off = new Int8Array(N);
  fixed = new Int8Array(N).fill(-1);
  order = new Int16Array(N);
  part = new Int16Array(N);
  private seq = 0;

  /** Pinta a forma `test` (no retângulo dado) com o material, a luz `shade` e o desvio de tom `offset`. */
  fill(box: readonly [number, number, number, number], test: Test, mat: Mat, shade: Shade, offset?: Offset) {
    const id = ++this.seq;
    const [x0, y0, x1, y1] = box.map(Math.round);
    for (let y = Math.max(0, y0); y <= Math.min(S - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(S - 1, x1); x++) {
        if (!test(x, y)) continue;
        const i = y * S + x;
        this.mat[i] = mat;
        this.shade[i] = shade(x, y);
        this.off[i] = offset ? offset(x, y) : 0;
        this.fixed[i] = -1;
        this.order[i] = id;
        this.part[i] = id;
      }
    }
    return id;
  }

  /** Um pixel num tom fixo (detalhe desenhado à mão: olho, brilho, costura). */
  dot(x: number, y: number, mat: Mat, tone: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = y * S + x;
    if (this.mat[i] < 0) this.order[i] = this.part[i] = ++this.seq;
    this.mat[i] = mat;
    this.fixed[i] = tone;
  }

  /** Muda o tom de quem já está pintado, sem mudar a peça (dobra, sombra de contato). */
  nudge(x: number, y: number, delta: number) {
    const i = Math.round(y) * S + Math.round(x);
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

// --- Formas e volumes ---------------------------------------------------------------

type Pt = readonly [number, number];

const lambert = (nx: number, ny: number, nz: number) => Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
const lit = (nx: number, ny: number, nz: number) => 0.12 + 0.88 * lambert(nx, ny, nz);

/** Esfera achatada. */
function ellipse(c: Canvas, cx: number, cy: number, rx: number, ry: number, mat: Mat, offset?: Offset) {
  return c.fill([cx - rx, cy - ry, cx + rx, cy + ry],
    (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1, mat,
    (x, y) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      return lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
    }, offset);
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
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};

// --- Peças --------------------------------------------------------------------------

/** Gibão acolchoado: canais verticais costurados, um tom mais escuros, com pontos da costura. */
const quilt = (cx: number) => (x: number, y: number) => {
  const k = ((x - Math.round(cx)) % 5 + 5) % 5;
  if (k === 0) return y % 3 === 0 ? -2 : -1;
  return k === 1 && noise(x, y) < 0.25 ? 1 : 0;
};

/** Cabelo: mechas verticais claras e escuras. */
const strands = (x: number, y: number) => {
  const s = noise(x, 7) + noise(x, Math.floor(y / 4)) * 0.4;
  return s > 1.05 ? 1 : s < 0.32 ? -1 : 0;
};

/** Tecido grosso: trama leve. */
const weave = (x: number, y: number) => ((x + y) % 4 === 0 && noise(x, y) < 0.5 ? -1 : 0);

function boot(c: Canvas, ankle: Pt, toe: Pt, far: boolean) {
  limb(c, [ankle[0], ankle[1] - 5], ankle, 3.7, 3.7, Mat.Detail, (x, y) => (far ? -1 : 0) + (y <= Math.round(ankle[1] - 7) ? 1 : 0));
  limb(c, ankle, toe, 3.5, 2.9, Mat.Detail, () => (far ? -1 : 0));
  // Sola e brilho do couro.
  for (let x = Math.round(Math.min(ankle[0], toe[0]) - 4); x <= Math.round(Math.max(ankle[0], toe[0]) + 4); x++) {
    for (let y = S - 1; y > 0; y--) {
      const i = y * S + x;
      if (c.mat[i] === Mat.Detail) { c.dot(x, y, Mat.Detail, 0); break; }
    }
  }
  if (!far) c.dot(ankle[0] - 1.5, ankle[1] - 3, Mat.Detail, 5);
}

function leg(c: Canvas, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, far: boolean) {
  const dark = far ? () => -1 : undefined;
  limb(c, hip, knee, 4.4, 3.8, Mat.Secondary, dark ? (x, y) => -1 + weave(x, y) : weave);
  limb(c, knee, ankle, 3.8, 3.3, Mat.Secondary, dark ? (x, y) => -1 + weave(x, y) : weave);
  // Dobra do tecido no joelho.
  c.nudge(knee[0] + 1, knee[1], -1);
  c.nudge(knee[0] + 2, knee[1] + 1, -1);
  boot(c, ankle, toe, far);
}

function arm(c: Canvas, shoulder: Pt, elbow: Pt, hand: Pt, far: boolean) {
  const dark = (o?: Offset): Offset | undefined => (far ? (x, y) => -1 + (o ? o(x, y) : 0) : o);
  limb(c, shoulder, elbow, 4.4, 4, Mat.Primary, dark(quilt(shoulder[0])));
  const cuff: Pt = [elbow[0] + (hand[0] - elbow[0]) * 0.72, elbow[1] + (hand[1] - elbow[1]) * 0.72];
  limb(c, elbow, cuff, 4.2, 3.8, Mat.Primary, dark());
  limb(c, cuff, [cuff[0] + (hand[0] - cuff[0]) * 0.4, cuff[1] + (hand[1] - cuff[1]) * 0.4], 3.9, 3.9, Mat.Trim, dark());
  ellipse(c, hand[0], hand[1], 3.4, 3.6, Mat.Skin, dark());
}

/** Espada de treino: lâmina com gume claro e sulco central, guarda e pomo dourados, cabo de couro. */
function sword(c: Canvas, hand: Pt, tip: Pt) {
  const dx = tip[0] - hand[0], dy = tip[1] - hand[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const guard: Pt = [hand[0] + ux * 4.5, hand[1] + uy * 4.5];
  // Lâmina: 3 px, a metade de cima clara, sulco escuro no meio, ponta afinando.
  c.fill([Math.min(guard[0], tip[0]) - 3, Math.min(guard[1], tip[1]) - 3, Math.max(guard[0], tip[0]) + 3, Math.max(guard[1], tip[1]) + 3],
    (x, y) => {
      const s = seg(x + 0.5, y + 0.5, guard, tip);
      return s.d <= (s.t > 0.85 ? 1.9 * (1 - s.t) / 0.15 + 0.3 : 1.9);
    }, Mat.Steel, (x, y) => {
      const s = seg(x + 0.5, y + 0.5, guard, tip);
      const side = s.sx * -uy + s.sy * ux;
      return side > 0.6 ? 0.95 : side < -0.6 ? 0.35 : 0.62;
    }, (x, y) => {
      const s = seg(x + 0.5, y + 0.5, guard, tip);
      return Math.abs(s.sx * -uy + s.sy * ux) < 0.5 && s.t < 0.7 ? -2 : 0;
    });
  // Guarda perpendicular e pomo.
  const gx = -uy, gy = ux;
  limb(c, [guard[0] - gx * 5, guard[1] - gy * 5], [guard[0] + gx * 5, guard[1] + gy * 5], 1.4, 1.4, Mat.Trim);
  limb(c, [hand[0] - ux * 3, hand[1] - uy * 3], guard, 1.3, 1.3, Mat.Detail);
  ellipse(c, hand[0] - ux * 4.5, hand[1] - uy * 4.5, 1.8, 1.8, Mat.Trim);
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
  // Pernas: no passo, a de trás tira o calcanhar do chão (pé 2 px acima).
  const legs: [number, number][] = [[CX - 4.5, s < 0 ? -2 : 0], [CX + 4.5, s > 0 ? -2 : 0]];
  legs.forEach(([x, lift], i) => {
    const far = back ? i === 0 : i === 1;
    const knee: Pt = [x + (i ? 0.5 : -0.5), 77 + b + lift / 2];
    const ankle: Pt = [x + (i ? 0.5 : -0.5), FEET - 3 + lift];
    leg(c, [x, hipY], knee, ankle, [ankle[0], ankle[1] + 1.5], far);
  });

  // Tronco: ombros largos, cintura, saia do gibão abrindo até a barra.
  const top = 47 + b;
  const torso: Pt[] = [[CX - 13, top + 2], [CX - 9, top], [CX + 9, top], [CX + 13, top + 2], [CX + 11, top + 13], [CX + 12, top + 21], [CX - 12, top + 21], [CX - 11, top + 13]];
  poly(c, torso, Mat.Primary, CX - 13, CX + 13, quilt(CX));
  // Barra dourada da saia e cinto com fivela.
  for (let x = CX - 11.5; x <= CX + 11.5; x++) { c.dot(x, top + 20, Mat.Trim, x < CX ? 3 : 2); c.dot(x, top + 19, Mat.Trim, x < CX - 4 ? 4 : 3); }
  for (let x = CX - 10.5; x <= CX + 10.5; x++) { c.dot(x, top + 13, Mat.Detail, 2); c.dot(x, top + 14, Mat.Detail, x < CX ? 3 : 2); c.dot(x, top + 15, Mat.Detail, 1); }
  if (!back) {
    for (let y = top + 12; y <= top + 16; y++) for (let x = CX - 2.5; x <= CX + 2.5; x++) c.dot(x, y, Mat.Trim, y === top + 12 || x < CX - 2 ? 4 : y === top + 16 || x > CX + 2 ? 1 : 3);
    c.dot(CX - 0.5, top + 14, Mat.Trim, 0); c.dot(CX + 0.5, top + 14, Mat.Trim, 0);
    c.dot(CX - 1.5, top + 13, Mat.Trim, 5);
    // Gola em V com debrum.
    for (let k = 0; k < 6; k++) {
      c.dot(CX - 3.5 + k * 0.5, top + k, Mat.Skin, k < 3 ? 2 : 1);
      c.dot(CX + 3.5 - k * 0.5, top + k, Mat.Skin, 1);
      c.dot(CX - 4.5 + k * 0.5, top + k, Mat.Trim, 4);
      c.dot(CX + 4.5 - k * 0.5, top + k, Mat.Trim, 2);
    }
    for (let x = CX - 2.5; x <= CX + 2.5; x++) for (let y = top; y < top + 6 - Math.abs(x - CX) * 2; y++) c.dot(x, y, Mat.Skin, x < CX ? 3 : 2);
  } else {
    // Costura das costas.
    for (let y = top + 2; y < top + 12; y++) c.nudge(CX, y, -1);
  }

  // Braços. De frente a espada fica na mão da esquerda da tela; de costas, na da direita.
  const swordLeft = !back;
  const armY = (side: number) => s * side * (back ? -1 : 1);
  for (const side of [-1, 1]) {
    const sh: Pt = [CX + side * 13, top + 3];
    const el: Pt = [CX + side * 14.5, top + 10 + armY(side) * 0.5];
    const ha: Pt = [CX + side * 14, top + 18 + armY(side)];
    arm(c, sh, el, ha, false);
    if ((side < 0) === swordLeft) sword(c, ha, [ha[0] + side * 4, ha[1] + 21]);
  }
  head(c, back ? "up" : "down", b);
}

function side(c: Canvas, frame: number) {
  const s = SWING[frame], b = BOB[frame];
  const hip: Pt = [CX + 1, 66 + b];
  // Passo: perna da frente (s) à esquerda, a outra atrás com o calcanhar no ar. Passagem: juntas.
  const pose = (fwd: number): [Pt, Pt, Pt] => {
    if (fwd > 0) return [[hip[0] - 4, 77 + b], [hip[0] - 7, FEET - 3], [hip[0] - 12, FEET - 2]];
    if (fwd < 0) return [[hip[0] + 3, 77 + b], [hip[0] + 7, FEET - 5], [hip[0] + 2.5, FEET - 3]];
    return [[hip[0] - 1, 77 + b], [hip[0], FEET - 3], [hip[0] - 5, FEET - 2]];
  };
  const [fk, fa, ft] = pose(-s);
  leg(c, hip, fk, fa, ft, true);
  // Braço de lá, atrás do tronco, balançando ao contrário da perna.
  const top = 47 + b;
  arm(c, [CX + 2, top + 3], [CX + 3 + s * 2, top + 10], [CX + 3 + s * 4, top + 18], true);
  const [nk, na, nt] = pose(s);
  leg(c, hip, nk, na, nt, false);

  const torso: Pt[] = [[CX - 9, top + 3], [CX - 6, top], [CX + 8, top], [CX + 10, top + 3], [CX + 9, top + 13], [CX + 10, top + 21], [CX - 10, top + 21], [CX - 9, top + 13]];
  poly(c, torso, Mat.Primary, CX - 10, CX + 10, quilt(CX));
  for (let x = CX - 9.5; x <= CX + 9.5; x++) { c.dot(x, top + 20, Mat.Trim, x < CX ? 3 : 2); c.dot(x, top + 19, Mat.Trim, x < CX - 4 ? 4 : 3); }
  for (let x = CX - 8.5; x <= CX + 8.5; x++) { c.dot(x, top + 13, Mat.Detail, 2); c.dot(x, top + 14, Mat.Detail, x < CX ? 3 : 2); c.dot(x, top + 15, Mat.Detail, 1); }
  // Gola de lado.
  for (let k = 0; k < 4; k++) { c.dot(CX - 6 + k, top + k, Mat.Trim, 4); c.dot(CX - 5 + k, top + k, Mat.Skin, 2); }

  // Braço de cá na frente do tronco, com a espada apontando para a frente e para baixo.
  const ha: Pt = [CX - 4 - s * 3, top + 18];
  arm(c, [CX - 1, top + 3], [CX - 2 - s * 1.5, top + 10], ha, false);
  sword(c, ha, [ha[0] - 16, ha[1] + 15]);
  head(c, "side", b);
}

function head(c: Canvas, dir: ProtoDir, b: number) {
  const cy = 37 + b;
  if (dir === "side") {
    const cx = CX + 1;
    ellipse(c, CX - 0.5, cy + 9, 3, 2.5, Mat.Skin); // pescoço
    ellipse(c, cx, cy, 8.2, 9, Mat.Skin);
    // Nariz, queixo e boca do perfil (olhando para a esquerda).
    c.dot(cx - 8.5, cy + 2, Mat.Skin, 3); c.dot(cx - 9.5, cy + 3, Mat.Skin, 3); c.dot(cx - 8.5, cy + 3, Mat.Skin, 2);
    c.dot(cx - 8.5, cy + 4, Mat.Skin, 1);
    c.dot(cx - 7.5, cy + 6, Mat.Lip, 1); c.dot(cx - 6.5, cy + 6, Mat.Skin, 1);
    // Cabelo: calota de trás e de cima, com a franja em pontas na testa.
    const hx = cx + 0.8, hy = cy - 0.8, rx = 9, ry = 9.4;
    c.fill([hx - rx, hy - ry, hx + rx, hy + ry], (x, y) => {
      const inside = ((x + 0.5 - hx) / rx) ** 2 + ((y + 0.5 - hy) / ry) ** 2 <= 1;
      const fringe = cy - 3 + (noise(x, 5) < 0.5 ? 1 : 0);
      return inside && (x >= cx || y < fringe || (x >= cx - 2 && y < cy + 4));
    }, Mat.Hair, (x, y) => {
      const nx = (x + 0.5 - hx) / rx, ny = (y + 0.5 - hy) / ry;
      return lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
    }, strands);
    // Orelha.
    for (const [dx, dy, t] of [[1, 1, 3], [2, 1, 2], [1, 2, 2], [2, 2, 1], [1, 3, 2], [2, 3, 1], [1.5, 4, 1]] as const) c.dot(cx + dx, cy + dy, Mat.Skin, t);
    // Sobrancelha, olho com brilho e sombra da maçã do rosto.
    c.dot(cx - 6, cy, Mat.Hair, 1); c.dot(cx - 5, cy, Mat.Hair, 1); c.dot(cx - 4, cy - 0.2, Mat.Hair, 2);
    c.dot(cx - 5, cy + 2, Mat.Eye, 1); c.dot(cx - 5, cy + 1.6, Mat.White, 4);
    c.dot(cx - 2, cy + 5, Mat.Skin, 2);
    return;
  }
  ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin);
  ellipse(c, CX, cy, 8.6, 9, Mat.Skin);
  // Orelhas.
  for (const sx of [-1, 1]) { ellipse(c, CX + sx * 8.6, cy + 2, 1.6, 2.4, Mat.Skin); c.dot(CX + sx * 8.6, cy + 2, Mat.Skin, 1); }
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const hairShade: Shade = (x, y) => {
    const nx = (x + 0.5 - hx) / rx, ny = (y + 0.5 - hy) / ry;
    return lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
  };
  const inHair = (x: number, y: number) => ((x + 0.5 - hx) / rx) ** 2 + ((y + 0.5 - hy) / ry) ** 2 <= 1;
  if (dir === "up") {
    c.fill([hx - rx, hy - ry, hx + rx, hy + ry], inHair, Mat.Hair, hairShade, strands);
    // Nuca: o cabelo termina em pontas sobre o pescoço.
    for (let x = CX - 6.5; x <= CX + 6.5; x++) if (noise(Math.round(x), 3) < 0.5) c.dot(x, hy + ry, Mat.Hair, 1);
    return;
  }
  // Cabelo de frente: calota, franja em pontas acima da sobrancelha e costeletas até a orelha.
  c.fill([hx - rx, hy - ry, hx + rx, hy + ry], (x, y) => {
    if (!inHair(x, y)) return false;
    const fringe = cy - 3 + (noise(x, 9) < 0.45 ? 1 : 0) + (noise(x, 4) < 0.15 ? 1 : 0);
    return y < fringe || (Math.abs(x + 0.5 - CX) > 7 && y < cy + 3);
  }, Mat.Hair, hairShade, strands);
  // Sobrancelhas, olhos (2×2 com brilho), nariz, boca e a cicatriz do cavaleiro.
  for (const sx of [-1, 1]) {
    const ex = CX + sx * 3.5;
    c.dot(ex - 1, cy, Mat.Hair, 1); c.dot(ex, cy, Mat.Hair, 1); c.dot(ex + sx, cy + 0.2, Mat.Hair, 2);
    c.dot(ex - 0.5, cy + 2, Mat.Eye, 2); c.dot(ex + 0.5, cy + 2, Mat.Eye, 1);
    c.dot(ex - 0.5, cy + 3, Mat.Eye, 1); c.dot(ex + 0.5, cy + 3, Mat.Eye, 1);
    c.dot(ex - 0.5, cy + 2, Mat.White, 4);
    c.dot(ex + sx * 1.5, cy + 3, Mat.Skin, 2);
  }
  c.dot(CX + 0.5, cy + 4, Mat.Skin, 2); c.dot(CX + 0.5, cy + 5, Mat.Skin, 1); c.dot(CX - 0.5, cy + 5, Mat.Skin, 2);
  c.dot(CX - 1.5, cy + 7, Mat.Lip, 2); c.dot(CX - 0.5, cy + 7, Mat.Lip, 1); c.dot(CX + 0.5, cy + 7, Mat.Lip, 1); c.dot(CX + 1.5, cy + 7, Mat.Lip, 2);
  c.dot(CX + 5.5, cy + 4, Mat.Lip, 2); c.dot(CX + 6.5, cy + 5, Mat.Lip, 2);
}

/** Quadro 96×96 do protótipo, virado para a esquerda no lado. Caminhada: passo, passagem, outro passo, passagem. */
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
