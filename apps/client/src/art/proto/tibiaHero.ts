import type { ClassId } from "@kusa/shared";
import { makeCanvas } from "../pixels.ts";
import { ramp, rgb, type Rgb } from "../hero/color.ts";

/**
 * Protótipo da Fase 0 de `docs/ARTE_TIBIA.md`, em **128 px de arte por tile** (4× a densidade do Tibia).
 *
 * Um **corpo base** único (só de tanga na cintura, careca, sem arma) é vestido pelo **kit** de cada classe:
 * cabelo e rosto, roupa de cima, mangas, calça, calçado, cintura, barra, gola, arma e acessório das costas.
 * Cada parte do corpo é desenhada e logo coberta pelo que o kit veste ali (perna → calça → bota), então o
 * mesmo esqueleto e a mesma caminhada servem às 4 classes e ao corpo nu.
 *
 * O desenho é feito em "unidades de projeto" (quadro de 96, pés na linha 91) e cada unidade vira `K` × `K`
 * pixels: as formas (esfera, cilindro, membro, polígono) são amostradas na resolução final, e as texturas e os
 * detalhes (`px`, desvios de tom) são desenhados pixel a pixel nela. Quadro final 192×192, corpo de 128 px
 * (1 tile). Luz de cima à esquerda em 4 faixas com pontilhado só na fronteira; a peça da frente risca linha
 * escura na de trás; contorno quase preto na sombra e suave na luz.
 *
 * Cada material de roupa é de uma **zona** (cabeça, primária, secundária, detalhe, debrum): a classe ou um
 * cosmético escolhe a cor de cada zona, como o outfit do Tibia. Só galeria por enquanto: o jogo continua com
 * `heroes.ts`.
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
/** O corpo base e as 4 classes. */
export type ProtoClass = "base" | ClassId;
export const PROTO_CLASSES: ProtoClass[] = ["base", "knight", "paladin", "sorcerer", "druid"];

/** Cor base de cada zona e da pele; a rampa de tons sai dela com desvio de matiz (`hero/color.ts`). */
export interface ProtoLook {
  skin: string;
  head: string;
  primary: string;
  secondary: string;
  detail: string;
  trim: string;
}

// --- Kits das classes -----------------------------------------------------------------

interface Kit {
  look: ProtoLook;
  hair: "none" | "short" | "medium" | "long" | "flowing";
  beard: "none" | "stubble" | "long";
  scar?: boolean;
  headband?: boolean;
  /** Pintura verde no rosto e folhas no cabelo (druida). */
  wild?: boolean;
  top: "none" | "gambeson" | "tunic" | "robe" | "leaf";
  sleeves: "none" | "quilt" | "short" | "bell";
  /** Calça inteira, só até o joelho (bermuda) ou nenhuma. */
  pants: "none" | "full" | "knee";
  feet: "bare" | "boots" | "tall" | "shoes" | "wraps";
  waist: "loincloth" | "belt" | "strap" | "sash" | "rope";
  weapon: "none" | "sword" | "bow" | "staff" | "branch" | "greatsword";
  quiver?: boolean;
  /** Capacete vestido por cima da cabeça (itens do piloto). */
  helmet?: "wolf" | "demon";
}

/** Itens do piloto vestidos sobre o kit: trocam o capacete e a arma da classe. */
export interface ProtoGear {
  helmet?: "wolf" | "demon";
  weapon?: "greatsword";
}
export const PROTO_GEAR_NAMES = { wolf: "Capuz do Lobo", demon: "Elmo do Demônio", greatsword: "Lâmina do dragão" } as const;

const KITS: Record<ProtoClass, Kit> = {
  base: {
    look: { skin: "#e6b48e", head: "#5a3a22", primary: "#8a7a62", secondary: "#8a7a62", detail: "#6a5040", trim: "#a08a60" },
    hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth", weapon: "none",
  },
  knight: {
    look: { skin: "#ecbc96", head: "#7a4a24", primary: "#a8302a", secondary: "#6c7078", detail: "#5e3e26", trim: "#c09030" },
    hair: "short", beard: "stubble", scar: true, top: "gambeson", sleeves: "quilt", pants: "full", feet: "boots", waist: "belt", weapon: "sword",
  },
  paladin: {
    look: { skin: "#dca47c", head: "#d8ac48", primary: "#c08c34", secondary: "#5e5838", detail: "#8a6038", trim: "#8a3a26" },
    hair: "medium", beard: "none", headband: true, top: "tunic", sleeves: "short", pants: "full", feet: "tall", waist: "strap", weapon: "bow", quiver: true,
  },
  sorcerer: {
    look: { skin: "#e8c0a4", head: "#d2cdc4", primary: "#4a2c6e", secondary: "#4e566a", detail: "#5a4434", trim: "#c8a040" },
    hair: "long", beard: "long", top: "robe", sleeves: "bell", pants: "full", feet: "shoes", waist: "sash", weapon: "staff",
  },
  druid: {
    look: { skin: "#c88d62", head: "#6a4426", primary: "#4e6a34", secondary: "#6a5034", detail: "#5a3e26", trim: "#b06a3a" },
    hair: "flowing", beard: "none", wild: true, top: "leaf", sleeves: "none", pants: "knee", feet: "wraps", waist: "rope", weapon: "branch",
  },
};

export const KNIGHT_LOOK: ProtoLook = KITS.knight.look;

/** Variações de cor (o que um cosmético trocaria): mesmo desenho, outras cores nas zonas. */
export const KNIGHT_COSMETICS: Record<string, Partial<ProtoLook>> = {
  "azul real": { primary: "#2e4f9a", trim: "#d0d4da" },
  "verde-floresta": { head: "#c8963c", primary: "#4a7432", secondary: "#6a5a44" },
  "negro": { head: "#2c2a30", primary: "#3a3440", secondary: "#5a2420", trim: "#9a2a22" },
};

export const mergeLook = (extra: Partial<ProtoLook>): ProtoLook => ({ ...KNIGHT_LOOK, ...extra });

// --- Materiais ----------------------------------------------------------------------

const enum Mat { Skin, Hair, Primary, Secondary, Detail, Trim, Steel, Eye, White, Lip, Iris, Linen, Wood, Leaf, Gem, Fur, FurLight, Ember, Iron, Horn, Amber }

const OUTLINE: Rgb = rgb("#1a1210");

function ramps(look: ProtoLook): Rgb[][] {
  const r = (base: string, contrast = 1, shift = 6, shine = false) => ramp(base, { contrast, shift, shine }).map(rgb);
  return [
    r(look.skin, 0.75, 4),
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
    r("#cbb68c", 0.8, 5), // linho cru (tanga, faixas, penas)
    r("#7a5534", 1.05, 6), // madeira
    r("#5f9a3c", 1, 8), // folha
    r("#9a52d8", 1.3, 10, true), // gema do cajado
    r("#6e665c", 1.1, 6), // pelo do lobo
    r("#b4a894", 0.9, 5), // focinho e peito do lobo
    r("#e0402a", 1.2, 12, true), // brasa (olhos do demônio, runas da lâmina)
    r("#4a4652", 1.45, 8, true), // ferro negro
    r("#5a3a30", 1.15, 8), // chifre
    r("#d8962a", 1.1, 8, true), // olho âmbar do lobo
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
type Box = readonly [number, number, number, number];

class Canvas {
  mat = new Int8Array(N).fill(-1);
  shade = new Float32Array(N);
  off = new Int8Array(N);
  fixed = new Int8Array(N).fill(-1);
  order = new Int16Array(N);
  part = new Int16Array(N);
  private seq = 0;
  private group = 0;

  /** Tudo o que `draw` pintar vira uma peça só (sem linha entre os pedaços: braço e antebraço, mechas). */
  /** Começa e termina uma peça só (como `together`, para blocos longos). */
  begin() { this.group = ++this.seq; }
  end() { this.group = 0; }

  together<T>(draw: () => T): T {
    const outer = this.group;
    this.group = ++this.seq;
    try { return draw(); } finally { this.group = outer; }
  }

  /** Pinta a forma `test` (no retângulo dado, em unidades) com o material, a luz e o desvio de tom. */
  fill(box: Box, test: Test, mat: Mat, shade: Shade, offset?: Offset) {
    const id = this.group || ++this.seq;
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

  /** Pixel fixo só onde já estão pintadas as peças `ids` (cinto e barra não saem do tronco). */
  on(ids: number | readonly number[], X: number, Y: number, mat: Mat, tone: number) {
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= S || Y >= S || this.mat[Y * S + X] < 0) return;
    const p = this.part[Y * S + X];
    if (typeof ids === "number" ? p !== ids : !ids.includes(p)) return;
    this.px(X, Y, mat, tone);
  }

  /** Muda o tom de quem já está pintado, sem mudar a peça (dobra, costura). */
  nudge(X: number, Y: number, delta: number) {
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= S || Y >= S) return;
    const i = Y * S + X;
    if (this.mat[i] >= 0) this.off[i] += delta;
  }

  /** O pixel é da peça (ou de uma das peças). */
  is(X: number, Y: number, ids: readonly number[]) {
    if (X < 0 || Y < 0 || X >= S || Y >= S) return false;
    const i = Y * S + X;
    return this.mat[i] >= 0 && ids.includes(this.part[i]);
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
          const t0 = tones[this.mat[n]][0];
          const c = lit ? [(t0[0] + OUTLINE[0]) / 2, (t0[1] + OUTLINE[1]) / 2, (t0[2] + OUTLINE[2]) / 2] : OUTLINE;
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
        let c = tones[m][Math.max(0, Math.min(5, tone))];
        // Linha interna puxada para o contorno: pele e cabelo claro não ficam com risco laranja.
        if (tone <= 0 && this.fixed[i] < 0) c = [(c[0] + OUTLINE[0]) / 2, (c[1] + OUTLINE[1]) / 2, (c[2] + OUTLINE[2]) / 2];
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
const ebox = (cx: number, cy: number, rx: number, ry: number): Box => [cx - rx, cy - ry, cx + rx, cy + ry];

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
  const box: Box = [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r];
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

/** Vários membros seguidos (galho, arco): uma linha de cápsulas do mesmo material. */
function chain(c: Canvas, pts: readonly Pt[], r: number, mat: Mat, offset?: Offset, rEnd = r) {
  return c.together(() => {
    const ids: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const t0 = (i - 1) / (pts.length - 1), t1 = i / (pts.length - 1);
      ids.push(limb(c, pts[i - 1], pts[i], r + (rEnd - r) * t0, r + (rEnd - r) * t1, mat, offset));
    }
    return ids;
  });
}

const inPoly = (pts: readonly Pt[]) => (x: number, y: number) => {
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
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

/** Polígono (par-ímpar) com volume de cilindro em pé entre `x0` e `x1`; `cut` recorta (barra em zigue-zague). */
function poly(c: Canvas, pts: readonly Pt[], mat: Mat, x0: number, x1: number, offset?: Offset, cut?: (x: number, y: number) => boolean) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const inside = inPoly(pts);
  return c.fill(pbox(pts), (x, y) => inside(x, y) && !(cut && cut(x, y)), mat, (x) => {
    const u = Math.max(-0.95, Math.min(0.95, (x + 0.5 - mid) / half));
    return lit(u, -0.25, Math.sqrt(1 - u * u));
  }, offset);
}

/** Linha de 1 px (em pixels finais) entre dois pontos em unidades. */
function thread(c: Canvas, a: Pt, b: Pt, mat: Mat, tone: number | ((k: number) => number), clip?: readonly number[]) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * K));
  for (let k = 0; k <= n; k++) {
    const X = Math.round((a[0] + (b[0] - a[0]) * (k / n)) * K), Y = Math.round((a[1] + (b[1] - a[1]) * (k / n)) * K);
    const t = typeof tone === "number" ? tone : tone(k);
    if (t < 0) continue;
    if (clip) c.on(clip, X, Y, mat, t);
    else c.px(X, Y, mat, t);
  }
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
const sleeveQuilt: Offset = (X, Y) => (Y % 7 === 0 ? (X % 3 === 0 ? -2 : -1) : Y % 7 === 3 && noise(X, Y) < 0.2 ? 1 : 0);

/** Linho: trama miúda em xadrez com fios soltos. */
const linen: Offset = (X, Y) => ((X + Y * 3) % 5 === 0 ? -1 : noise(X, Y) < 0.04 ? 1 : 0);

/** Veludo da túnica: dobras compridas que descem e um brilho suave aqui e ali. */
const velvet = (cx: number): Offset => (X, Y) => {
  const k = ((X - F(cx)) % 11 + 11) % 11;
  if (k === 0 && Y % 2 === 0) return -1;
  if (k === 5) return -1;
  return noise(X >> 1, Y >> 2) < 0.08 ? 1 : 0;
};

/** Túnica de folhas: escamas em fileiras desencontradas, cada uma com a borda de baixo escura. */
const leafScales: Offset = (X, Y) => {
  const row = Math.floor(Y / 6);
  const x = (X + (row % 2) * 4) % 8;
  const y = Y % 6;
  const r = (x - 3.5) ** 2 / 16 + (y - 1) ** 2 / 25;
  if (r > 0.9 && r < 1.35 && y > 1) return -1;
  return y === 0 && x === 3 ? 1 : 0;
};

/** Cabelo: mechas finas claras e escuras, que mudam devagar ao descer. */
const strands: Offset = (X, Y) => {
  const s = noise(X, 7) * 0.7 + noise(X, Math.floor(Y / 6)) * 0.5;
  return s > 0.98 ? 1 : s < 0.22 ? -1 : 0;
};

/** Sarja da calça: diagonal leve. */
const twill: Offset = (X, Y) => ((X + Y) % 3 === 0 && noise(X, Y) < 0.55 ? -1 : 0);

/** Couro: pontinhos de poro e arranhões claros. */
const leather: Offset = (X, Y) => (noise(X, Y) < 0.07 ? -1 : noise(X + 31, Y) < 0.04 ? 1 : 0);

/** Madeira: veios compridos na direção do galho. */
const grain: Offset = (X, Y) => (noise(X, Y >> 2) < 0.18 ? -1 : noise(X + 5, Y >> 3) < 0.06 ? 1 : 0);

const darker = (o: Offset | undefined, far: boolean): Offset | undefined =>
  far ? (X, Y) => -1 + (o ? o(X, Y) : 0) : o;

// --- Pernas e pés -----------------------------------------------------------------------

/** Sola de 2 px embaixo de cada coluna das peças, com costura clara logo acima. */
function sole(c: Canvas, ids: readonly number[], x0: number, x1: number, mat: Mat, far: boolean, stitch = true) {
  for (let X = F(x0); X <= F(x1); X++) {
    for (let Y = S - 1; Y > 0; Y--) {
      if (!c.is(X, Y, ids)) continue;
      c.px(X, Y, mat, 0); c.px(X, Y - 1, mat, 1);
      if (stitch && X % 3 === 0) c.px(X, Y - 2, mat, far ? 2 : 4);
      break;
    }
  }
}

/** Pé descalço: peito do pé, dedos marcados na ponta e unha clara. */
function bareFoot(c: Canvas, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const foot = limb(c, [ankle[0], ankle[1] - 1], toe, 2.9, 2.5, Mat.Skin, darker(undefined, far));
  if (front) {
    // Dedos: 4 vincos na ponta, vista de frente.
    const Y = F(toe[1] + 1.4);
    for (const dx of [-2.6, -1.2, 0.2, 1.6]) { c.on(foot, F(toe[0] + dx), Y, Mat.Skin, 1); c.on(foot, F(toe[0] + dx), Y + 1, Mat.Skin, 1); }
    for (const dx of [-1.9, -0.5, 0.9]) c.on(foot, F(toe[0] + dx), Y + 1, Mat.Skin, far ? 3 : 4);
  } else {
    // De lado: arco do pé, calcanhar e dedos.
    c.on(foot, F(toe[0] - 1), F(toe[1] + 0.8), Mat.Skin, 1);
    c.on(foot, F(toe[0] - 0.5), F(toe[1] + 0.8), Mat.Skin, 1);
    c.on(foot, F(ankle[0] - 1), F(ankle[1] + 1.5), Mat.Skin, 2);
  }
  // Tornozelo.
  c.on(foot, F(ankle[0] + 1), F(ankle[1] - 0.5), Mat.Skin, far ? 1 : 2);
  return foot;
}

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
  sole(c, [foot, shaft], Math.min(ankle[0], toe[0]) - 4, Math.max(ankle[0], toe[0]) + 4, Mat.Detail, far);
  if (!far) { c.px(F(ankle[0] - 2), F(ankle[1] - 3), Mat.Detail, 5); c.px(F(toe[0] - 1), F(toe[1] - 2), Mat.Detail, 5); }
}

/** Bota de montaria do paladino: cano até o joelho com a borda virada e tira de fivela no tornozelo. */
function tallBoot(c: Canvas, knee: Pt, ankle: Pt, toe: Pt, far: boolean) {
  const topY = knee[1] + 1.2;
  const shaftTop: Pt = [knee[0] + (ankle[0] - knee[0]) * 0.12, topY];
  const shaft = limb(c, shaftTop, ankle, 3.9, 3.6, Mat.Detail, darker(leather, far));
  const foot = limb(c, ankle, toe, 3.5, 2.9, Mat.Detail, darker(leather, far));
  // Borda virada do cano: faixa mais clara com costura.
  const T = F(topY - 3.9);
  for (let X = F(shaftTop[0] - 4.2); X <= F(shaftTop[0] + 4.2); X++) {
    for (let k = 0; k < 3; k++) c.on(shaft, X, T + k, Mat.Detail, k === 0 ? (far ? 3 : 5) : k === 1 ? (far ? 2 : 4) : 1);
    if (X % 3 === 0) c.on(shaft, X, T + 4, Mat.Detail, far ? 2 : 3);
  }
  // Tira com fivela no tornozelo.
  const by = F(ankle[1] - 2.2);
  for (let X = F(ankle[0] - 4); X <= F(ankle[0] + 4); X++) { c.on(shaft, X, by, Mat.Detail, 0); c.on(shaft, X, by + 1, Mat.Detail, far ? 2 : 3); }
  const bx = F(ankle[0] + (far ? 1.5 : -1.5));
  for (const [dx, dy, t] of [[0, -1, 5], [1, -1, 4], [0, 0, 3], [1, 0, 1], [0, 1, 4], [1, 1, 2]] as const) c.on(shaft, bx + dx, by + dy, Mat.Trim, far ? t - 1 : t);
  sole(c, [foot, shaft], Math.min(ankle[0], toe[0]) - 4, Math.max(ankle[0], toe[0]) + 4, Mat.Detail, far);
  if (!far) for (let Y = F(topY); Y < F(ankle[1] - 3); Y++) if (Y % 5 !== 0) c.on(shaft, F(shaftTop[0] - 2.2), Y, Mat.Detail, 4);
}

/** Sapatilha do feiticeiro: pano macio com a ponta virada para cima. */
function slipper(c: Canvas, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const foot = limb(c, [ankle[0], ankle[1] - 1.5], toe, 3.2, 2.4, Mat.Secondary, darker(linen, far));
  if (front) {
    // De frente: biqueira pontuda clara no meio.
    c.on(foot, F(toe[0]), F(toe[1] + 1.2), Mat.Trim, far ? 3 : 4);
    c.on(foot, F(toe[0]) - 1, F(toe[1] + 1.2), Mat.Trim, far ? 2 : 3);
  } else {
    // De lado: ponta curvada para cima, em dourado.
    const tip = limb(c, toe, [toe[0] - 2, toe[1] - 1.4], 1.2, 0.5, Mat.Secondary, darker(undefined, far));
    c.on(tip, F(toe[0] - 2), F(toe[1] - 1.4), Mat.Trim, 4);
  }
  sole(c, [foot], Math.min(ankle[0], toe[0]) - 4, Math.max(ankle[0], toe[0]) + 4, Mat.Detail, far, false);
}

/** Faixas de linho do druida: enroladas do pé até o meio da canela, em diagonal. */
function wraps(c: Canvas, knee: Pt, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const foot = bareFoot(c, ankle, toe, far, front);
  const shin = limb(c, [knee[0] + (ankle[0] - knee[0]) * 0.45, knee[1] + (ankle[1] - knee[1]) * 0.45], ankle, 3.5, 3.2, Mat.Linen, darker(undefined, far));
  const mid = limb(c, ankle, [ankle[0] + (toe[0] - ankle[0]) * 0.6, ankle[1] + (toe[1] - ankle[1]) * 0.6], 3.1, 2.8, Mat.Linen, darker(undefined, far));
  const ids = [shin, mid];
  // Voltas da faixa: diagonais escuras com a borda de cima clara.
  const y0 = F(knee[1] + (ankle[1] - knee[1]) * 0.45 - 3), y1 = F(ankle[1] + 3);
  for (let Y = y0; Y <= y1; Y++) {
    for (let X = F(ankle[0] - 5); X <= F(ankle[0] + 5); X++) {
      if (!c.is(X, Y, ids)) continue;
      const k = ((X + Y * 2) % 7 + 7) % 7;
      if (k === 0) c.px(X, Y, Mat.Linen, far ? 0 : 1);
      else if (k === 1) c.px(X, Y, Mat.Linen, far ? 2 : 4);
    }
  }
  // Cordinha amarrada embaixo do joelho.
  thread(c, [ankle[0] - 3.6, knee[1] + (ankle[1] - knee[1]) * 0.45 - 2.4], [ankle[0] + 3.6, knee[1] + (ankle[1] - knee[1]) * 0.45 - 1.6], Mat.Detail, far ? 0 : 1, ids);
  void foot;
}

function leg(c: Canvas, kit: Kit, hip: Pt, knee: Pt, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  // Perna nua: coxa, joelho com luz, canela (e o pé descalço, tudo uma peça só).
  const bare = kit.feet === "bare";
  const skinT = c.together(() => {
    const id = limb(c, hip, knee, 4, 3.4, Mat.Skin, darker(undefined, far));
    limb(c, knee, ankle, 3.4, 2.7, Mat.Skin, darker(undefined, far));
    if (bare) bareFoot(c, ankle, toe, far, front);
    return id;
  });
  const skinS = skinT;
  const kx = F(knee[0]), ky = F(knee[1]);
  if (kit.pants === "none" || kit.pants === "knee") {
    // Patela e músculo da panturrilha.
    c.on([skinT, skinS], kx - 2, ky - 1, Mat.Skin, far ? 3 : 4); c.on([skinT, skinS], kx - 1, ky - 2, Mat.Skin, far ? 3 : 4);
    c.on([skinT, skinS], kx + 1, ky + 2, Mat.Skin, 2); c.on([skinT, skinS], kx, ky + 3, Mat.Skin, 2);
  }
  if (kit.pants !== "none") {
    const thigh = c.together(() => {
      const id = limb(c, hip, knee, 4.4, 3.8, Mat.Secondary, darker(twill, far));
      if (kit.pants === "full") limb(c, knee, ankle, 3.8, 3.3, Mat.Secondary, darker(twill, far));
      return id;
    });
    if (kit.pants === "full") {
      // Dobras do tecido no joelho: dois risquinhos em diagonal.
      for (const [dx, dy] of [[-2, -1], [-1, 0], [0, 0], [1, 1], [-1, 3], [0, 3], [1, 4]]) c.nudge(kx + dx, ky + dy, -1);
    } else {
      // Bermuda: termina logo abaixo do joelho com a barra dobrada.
      const end: Pt = [knee[0] + (ankle[0] - knee[0]) * 0.18, knee[1] + (ankle[1] - knee[1]) * 0.18];
      const cuff = limb(c, knee, end, 4.1, 4, Mat.Secondary, darker(twill, far));
      for (let X = F(end[0] - 4.5); X <= F(end[0] + 4.5); X++) { c.on(cuff, X, F(end[1] + 3.2), Mat.Secondary, far ? 2 : 4); c.on(cuff, X, F(end[1] + 3.8), Mat.Secondary, 0); }
    }
    c.on(thigh, kx - 3, ky - 3, Mat.Secondary, far ? 3 : 4);
  }
  switch (kit.feet) {
    case "bare": break;
    case "boots": boot(c, ankle, toe, far, front); break;
    case "tall": tallBoot(c, knee, ankle, toe, far); break;
    case "shoes": slipper(c, ankle, toe, far, front); break;
    case "wraps": wraps(c, knee, ankle, toe, far, front); break;
  }
}

// --- Braços e mãos -------------------------------------------------------------------

function hand(c: Canvas, at: Pt, far: boolean) {
  const id = ellipse(c, at[0], at[1], 3.1, 3.3, Mat.Skin, darker(undefined, far));
  // Dedos: três vincos embaixo e o nó do polegar claro.
  const X = F(at[0]), Y = F(at[1]);
  for (const dx of [-3, -1, 1, 3]) { c.on(id, X + dx, Y + 4, Mat.Skin, 1); c.on(id, X + dx, Y + 5, Mat.Skin, 1); }
  c.on(id, X - 3, Y - 3, Mat.Skin, far ? 3 : 4);
  c.on(id, X - 2, Y - 4, Mat.Skin, far ? 3 : 4);
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Braço do kit: pele, manga, acessórios do antebraço; `grip` desenha o que a mão segura antes dos dedos. */
function arm(c: Canvas, kit: Kit, shoulder: Pt, elbow: Pt, at: Pt, far: boolean, grip?: () => void) {
  // Braço nu: ombro (deltoide), bíceps e antebraço.
  const up = c.together(() => {
    const id = limb(c, shoulder, elbow, 3.5, 3, Mat.Skin, darker(undefined, far));
    limb(c, elbow, at, 3, 2.6, Mat.Skin, darker(undefined, far));
    return id;
  });
  const fore = up;
  if (kit.sleeves === "none") {
    // Linha do músculo e cotovelo.
    c.on(up, F(shoulder[0]) + 1, F(shoulder[1] + 3.5), Mat.Skin, far ? 1 : 2);
    c.on(up, F(shoulder[0]) + 2, F(shoulder[1] + 4), Mat.Skin, far ? 1 : 2);
    c.on([up, fore], F(elbow[0]) + 2, F(elbow[1]), Mat.Skin, 1);
  }
  const cuffAt = lerp(elbow, at, 0.72);
  switch (kit.sleeves) {
    case "quilt": {
      c.together(() => {
        limb(c, shoulder, elbow, 3.9, 3.5, Mat.Primary, darker(sleeveQuilt, far));
        limb(c, elbow, cuffAt, 3.5, 3.3, Mat.Primary, darker(sleeveQuilt, far));
      });
      const band = limb(c, cuffAt, lerp(cuffAt, at, 0.4), 3.5, 3.5, Mat.Trim, darker(undefined, far));
      for (let X = F(cuffAt[0] - 4); X <= F(cuffAt[0] + 4); X += 3) c.on(band, X, F(cuffAt[1] + 1), Mat.Trim, 1);
      break;
    }
    case "short": {
      // Manga curta até o meio do braço, com barra costurada; braçadeira de couro no antebraço.
      const end = lerp(shoulder, elbow, 0.7);
      const sl = limb(c, shoulder, end, 4, 3.8, Mat.Primary, darker(linen, far));
      for (let X = F(end[0] - 4.5); X <= F(end[0] + 4.5); X++) { c.on(sl, X, F(end[1] + 2.6), Mat.Trim, far ? 1 : 2); if (X % 3 === 0) c.on(sl, X, F(end[1] + 1.8), Mat.Primary, 1); }
      const a = lerp(elbow, at, 0.3), b = lerp(elbow, at, 0.82);
      const br = limb(c, a, b, 3.3, 3.2, Mat.Detail, darker(leather, far));
      // Laço cruzado da braçadeira.
      for (let k = 0; k < 3; k++) {
        const p = lerp(a, b, 0.2 + k * 0.28);
        c.on(br, F(p[0]) - 1, F(p[1]), Mat.Linen, far ? 2 : 4); c.on(br, F(p[0]), F(p[1]) + 1, Mat.Linen, far ? 2 : 4);
        c.on(br, F(p[0]), F(p[1]), Mat.Detail, 0); c.on(br, F(p[0]) - 1, F(p[1]) + 1, Mat.Detail, 0);
      }
      break;
    }
    case "bell": {
      // Manga de sino: alarga até o punho e passa um pouco da mão, com barra dourada larga.
      const mouth = lerp(elbow, at, 0.82);
      const low = c.together(() => {
        limb(c, shoulder, elbow, 3.9, 3.8, Mat.Primary, darker(velvet(shoulder[0]), far));
        return limb(c, elbow, mouth, 3.9, 5, Mat.Primary, darker(velvet(elbow[0]), far));
      });
      const rim = limb(c, lerp(elbow, mouth, 0.8), mouth, 5, 5.2, Mat.Trim, darker(undefined, far));
      for (let X = F(mouth[0] - 5); X <= F(mouth[0] + 5); X += 2) c.on(rim, X, F(mouth[1] - 0.6), Mat.Trim, (X >> 1) % 2 ? 1 : 4);
      // Forro escuro na boca da manga.
      ellipse(c, mouth[0], mouth[1] + 2.6, 3.6, 1.6, Mat.Secondary, () => -2);
      void low;
      break;
    }
    case "none":
      if (kit.wild) {
        // Cipó enrolado no antebraço, com duas folhinhas.
        const a = lerp(elbow, at, 0.25), b = lerp(elbow, at, 0.8);
        for (let k = 0; k <= 12; k++) {
          const p = lerp(a, b, k / 12);
          const off = Math.sin(k * 1.3) * 2.6;
          c.on([fore], F(p[0] + off), F(p[1]), Mat.Leaf, far ? 1 : Math.cos(k * 1.3) > 0 ? 3 : 1);
          c.on([fore], F(p[0] + off) + 1, F(p[1]), Mat.Leaf, far ? 1 : 2);
        }
        if (!far) { leaf(c, lerp(a, b, 0.3), -0.6, 2.2, 1); leaf(c, lerp(a, b, 0.75), 2.4, 2, 0.9); }
      }
      break;
  }
  grip?.();
  hand(c, at, far);
}

// --- Armas ----------------------------------------------------------------------------

/** Espada de treino: lâmina com gume claro e sulco central, guarda gravada, cabo trançado e pomo. */
function sword(c: Canvas, at: Pt, tip: Pt) {
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const guard: Pt = [at[0] + ux * 4.5, at[1] + uy * 4.5];
  const across = (x: number, y: number) => { const s = seg(x + 0.5, y + 0.5, guard, tip); return { s, side: s.sx * -uy + s.sy * ux }; };
  c.fill([Math.min(guard[0], tip[0]) - 3, Math.min(guard[1], tip[1]) - 3, Math.max(guard[0], tip[0]) + 3, Math.max(guard[1], tip[1]) + 3],
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
  // Guarda perpendicular, com um ponto gravado em cada braço, e cabo trançado.
  const gx = -uy, gy = ux;
  const g = limb(c, [guard[0] - gx * 5, guard[1] - gy * 5], [guard[0] + gx * 5, guard[1] + gy * 5], 1.4, 1.4, Mat.Trim);
  for (const k of [-3, 3]) c.on(g, F(guard[0] + gx * k), F(guard[1] + gy * k), Mat.Trim, 1);
  limb(c, [at[0] - ux * 3, at[1] - uy * 3], guard, 1.3, 1.3, Mat.Detail, (X, Y) => ((X + Y) % 3 === 0 ? -1 : (X + Y) % 3 === 1 ? 1 : 0));
  const pommel = ellipse(c, at[0] - ux * 4.5, at[1] - uy * 4.5, 1.8, 1.8, Mat.Trim);
  c.on(pommel, F(at[0] - ux * 4.5 - 0.6), F(at[1] - uy * 4.5 - 0.6), Mat.Trim, 5);
}

/** Arco simples: madeira curvada com a empunhadura na mão, pontas de chifre e corda reta. `out` = lado da barriga. */
function bow(c: Canvas, at: Pt, out: number, vertical = true) {
  const pts: Pt[] = [];
  for (let k = -6; k <= 6; k++) {
    const t = k / 6;
    // Recurvo leve: a barriga sai para `out` e as pontas voltam um pouco.
    const bend = (1 - t * t) * 3.2 - (Math.abs(t) > 0.85 ? (Math.abs(t) - 0.85) * 6 : 0);
    pts.push(vertical ? [at[0] + out * (bend - 3.2), at[1] + t * 15] : [at[0] + t * 15, at[1] + out * (bend - 3.2)]);
  }
  chain(c, pts, 1.15, Mat.Wood, grain, 0.7);
  // Empunhadura enrolada em couro e pontas de chifre.
  limb(c, [at[0], at[1] - 2.4], [at[0], at[1] + 2.4], 1.45, 1.45, Mat.Detail, (X, Y) => ((Y + X) % 3 === 0 ? -1 : 0));
  for (const p of [pts[0], pts[pts.length - 1]]) ellipse(c, p[0], p[1], 0.9, 0.9, Mat.Linen);
  // Corda: linha de 1 px entre as pontas, do lado de dentro.
  thread(c, pts[0], pts[pts.length - 1], Mat.Linen, (k) => (k % 7 === 0 ? 2 : 4));
}

/** Cajado do feiticeiro: haste reta de madeira escura com anéis dourados e garras segurando a gema. */
function staff(c: Canvas, at: Pt, top: number, bottom: number) {
  const x = at[0];
  limb(c, [x, top + 2], [x, bottom], 1.15, 1.15, Mat.Wood, (X, Y) => -1 + grain(X, Y));
  for (const y of [top + 4.4, at[1] - 3.6, bottom - 1.6]) limb(c, [x - 0.1, y], [x + 0.1, y + 0.7], 1.45, 1.45, Mat.Trim);
  // Garras douradas e a gema com brilho e um redemoinho de luz dentro.
  for (const sx of [-1, 1]) {
    const pts: Pt[] = [[x + sx * 0.6, top + 3.4], [x + sx * 2.6, top + 1.2], [x + sx * 2.6, top - 1.6], [x + sx * 1.4, top - 3.2]];
    chain(c, pts, 0.55, Mat.Trim);
  }
  const g = ellipse(c, x, top - 0.6, 2.3, 2.5, Mat.Gem);
  const X = F(x), Y = F(top - 0.6);
  for (const [dx, dy, t] of [[-2, -2, 5], [-1, -2, 5], [-2, -1, 5], [1, 1, 4], [2, 0, 4], [1, -1, 3], [0, 2, 3], [-1, 1, 2]] as const) c.on(g, X + dx, Y + dy, Mat.Gem, t);
}

/** Galho do druida: madeira torta com nós, um broto bifurcado em cima e folhas. */
function branch(c: Canvas, at: Pt, top: number, bottom: number) {
  const x = at[0];
  const pts: Pt[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    pts.push([x + Math.sin(t * 7.3) * 0.7 + (t - 0.5) * 0.8, bottom + (top - bottom) * t]);
  }
  chain(c, pts, 1.25, Mat.Wood, grain, 1);
  // Nós na madeira.
  for (const t of [0.3, 0.62]) { const p = pts[Math.round(t * 8)]; ellipse(c, p[0] + 0.6, p[1], 1, 0.7, Mat.Wood, () => -1); }
  // Forquilha com folhas.
  const tip = pts[pts.length - 1];
  const fork: Pt[] = [[tip[0], tip[1]], [tip[0] - 1.6, tip[1] - 2.6], [tip[0] - 2.4, tip[1] - 4.6]];
  const fork2: Pt[] = [[tip[0], tip[1]], [tip[0] + 1.4, tip[1] - 2.2], [tip[0] + 2.8, tip[1] - 3.4]];
  chain(c, fork, 0.75, Mat.Wood, undefined, 0.4);
  chain(c, fork2, 0.7, Mat.Wood, undefined, 0.35);
  leaf(c, [tip[0] - 3.4, tip[1] - 5.4], -2.2, 2.6, 1.3);
  leaf(c, [tip[0] - 0.2, tip[1] - 4.6], -1.5, 2.2, 1.1);
  leaf(c, [tip[0] + 3.8, tip[1] - 3.8], -0.5, 2.4, 1.2);
  leaf(c, [tip[0] + 1.8, tip[1] - 1], 0.4, 2, 1);
  leaf(c, [tip[0] - 2.2, tip[1] - 1], 2.7, 1.8, 0.9);
}

/** Folha: elipse girada com nervura central escura e luz de cima. */
function leaf(c: Canvas, at: Pt, ang: number, len: number, wid: number) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const r = Math.max(len, wid) + 0.5;
  const local = (x: number, y: number) => {
    const dx = x + 0.5 - at[0], dy = y + 0.5 - at[1];
    return [(dx * ca + dy * sa) / len, (-dx * sa + dy * ca) / wid] as const;
  };
  const id = c.fill([at[0] - r, at[1] - r, at[0] + r, at[1] + r], (x, y) => {
    const [u, v] = local(x, y);
    // Ponta fina: a largura cai perto das pontas.
    return u * u + (v / (1 - Math.abs(u) * 0.35)) ** 2 <= 1;
  }, Mat.Leaf, (x, y) => {
    const [u, v] = local(x, y);
    return lit(u * ca * 0.4 - v * sa * 0.8, u * sa * 0.4 + v * ca * 0.8, Math.sqrt(Math.max(0.05, 1 - u * u - v * v)));
  });
  thread(c, [at[0] - ca * len * 0.8, at[1] - sa * len * 0.8], [at[0] + ca * len * 0.8, at[1] + sa * len * 0.8], Mat.Leaf, 1, [id]);
  return id;
}

/** Aljava de couro com borda dourada e flechas de penas brancas e vermelhas. */
function quiver(c: Canvas, top: Pt, bottom: Pt, arrowsUp: number) {
  const tube = limb(c, top, bottom, 2.4, 2.1, Mat.Detail, leather);
  // Costuras e tira de reforço.
  const mid = lerp(top, bottom, 0.5);
  for (const t of [0.4, 0.46]) {
    const p = lerp(top, bottom, t), dx0 = bottom[0] - top[0], dy0 = bottom[1] - top[1], l0 = Math.hypot(dx0, dy0);
    thread(c, [p[0] + (dy0 / l0) * 2.3, p[1] - (dx0 / l0) * 2.3], [p[0] - (dy0 / l0) * 2.3, p[1] + (dx0 / l0) * 2.3], Mat.Trim, t < 0.43 ? 4 : 1, [tube]);
  }
  thread(c, [top[0] + 1.2, top[1] + 1.5], [bottom[0] + 1, bottom[1] - 1], Mat.Detail, (k) => (k % 3 === 0 ? 1 : -1), [tube]);
  void mid;
  // Flechas: hastes saindo da boca da aljava, penas em V nas pontas.
  const dx = top[0] - bottom[0], dy = top[1] - bottom[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const fx = -uy, fy = ux;
  for (let k = 0; k < 4; k++) {
    const o = (k - 1.5) * 1.1;
    const base: Pt = [top[0] + fx * o, top[1] + fy * o];
    const end: Pt = [base[0] + ux * arrowsUp + fx * (k - 1.5) * 0.3, base[1] + uy * arrowsUp];
    limb(c, base, end, 0.3, 0.3, Mat.Wood);
    // Penas: duas aletas, cores alternadas.
    const feather = k % 2 ? Mat.Linen : Mat.Trim;
    for (let j = 0; j < 4; j++) {
      const p = lerp(end, base, 0.08 + j * 0.09);
      limb(c, p, [p[0] + fx * 0.9 - ux * 0.6, p[1] + fy * 0.9 - uy * 0.6], 0.35, 0.25, feather);
      limb(c, p, [p[0] - fx * 0.9 - ux * 0.6, p[1] - fy * 0.9 - uy * 0.6], 0.35, 0.25, feather);
    }
  }
  // Boca da aljava (borda dourada) por cima das hastes.
  ellipse(c, top[0], top[1], 2.6, 1.1, Mat.Trim);
  ellipse(c, top[0], top[1] + 0.2, 1.8, 0.6, Mat.Detail, () => -2);
  return tube;
}

// --- Tronco: roupa, cintura, barra, gola ------------------------------------------------

/** Cinto com fivela, furos e costura, só sobre as peças `ids`. */
function belt(c: Canvas, ids: readonly number[], cx: number, half: number, top: number, buckle: boolean, pouch = false) {
  const Y0 = F(top + 13);
  for (let X = F(cx - half - 1); X <= F(cx + half + 1); X++) {
    c.on(ids, X, Y0, Mat.Detail, 4);
    for (let k = 1; k <= 4; k++) c.on(ids, X, Y0 + k, Mat.Detail, X < F(cx) ? 3 : 2);
    c.on(ids, X, Y0 + 5, Mat.Detail, 0);
    if (X % 3 === 0) { c.on(ids, X, Y0 + 1, Mat.Detail, 1); c.on(ids, X, Y0 + 4, Mat.Detail, 1); }
  }
  if (buckle) {
    // Furos à direita da fivela.
    for (const k of [8, 12, 16]) c.on(ids, F(cx) + k, Y0 + 2, Mat.Detail, 0);
    const bx = F(cx) - 5, by = Y0 - 2;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const ring = x < 2 || x > 7 || y < 2 || y > 7;
      if (!ring) continue;
      c.px(bx + x, by + y, Mat.Trim, x < 2 || y < 2 ? (x + y < 3 ? 5 : 4) : y > 7 || x > 7 ? 1 : 3);
    }
    for (let y = 2; y < 8; y++) c.px(bx + 5, by + y, Mat.Steel, 4);
  }
  if (pouch) {
    // Bolsinha de couro pendurada no quadril, com aba e botão.
    const px = cx + half - 3.2, py = top + 17.2;
    const bag = c.fill([px - 2.6, py - 2.2, px + 2.6, py + 2.8], (x, y) => Math.abs(x + 0.5 - px) <= 2.4 - Math.max(0, y + 0.5 - py - 1.6) * 0.6 && y + 0.5 >= py - 2.2 && y + 0.5 <= py + 2.8, Mat.Detail, sphere(px, py, 3, 3), leather);
    for (let X = F(px - 2.4); X <= F(px + 2.4); X++) { c.on(bag, X, F(py - 0.4), Mat.Detail, 0); c.on(bag, X, F(py - 1), Mat.Detail, 4); }
    c.on(bag, F(px), F(py), Mat.Trim, 5); c.on(bag, F(px) + 1, F(py), Mat.Trim, 2);
  }
}

/** Barra dourada com losangos (cavaleiro). */
function hemDiamonds(c: Canvas, ids: readonly number[], cx: number, half: number, y: number) {
  const H0 = F(y);
  for (let X = F(cx - half - 1.5); X <= F(cx + half + 1.5); X++) {
    c.on(ids, X, H0, Mat.Trim, X < F(cx) - 8 ? 5 : 4);
    const d = ((X % 6) + 6) % 6;
    c.on(ids, X, H0 + 1, Mat.Trim, d === 0 || d === 1 ? 1 : 3);
    c.on(ids, X, H0 + 2, Mat.Trim, d === 3 ? 1 : 2);
    c.on(ids, X, H0 + 3, Mat.Trim, 1);
  }
}

/** Barra de dois filetes (paladino). */
function hemLines(c: Canvas, ids: readonly number[], cx: number, half: number, y: number) {
  for (let X = F(cx - half - 2); X <= F(cx + half + 2); X++) {
    c.on(ids, X, F(y) + 0, Mat.Trim, X < F(cx) ? 3 : 2);
    c.on(ids, X, F(y) + 2, Mat.Trim, X < F(cx) ? 3 : 2);
    if (X % 4 === 0) c.on(ids, X, F(y) + 1, Mat.Trim, 1);
  }
}

/** Barra larga do manto com runas (feiticeiro). */
function hemRunes(c: Canvas, ids: readonly number[], cx: number, half: number, y: number) {
  const H0 = F(y);
  for (let X = F(cx - half - 3); X <= F(cx + half + 3); X++) {
    c.on(ids, X, H0, Mat.Trim, 4);
    for (let k = 1; k <= 5; k++) c.on(ids, X, H0 + k, Mat.Trim, X < F(cx) ? 3 : 2);
    c.on(ids, X, H0 + 6, Mat.Trim, 1);
    // Runas: a cada 9 px, um sinal de traços escuros.
    const r = ((X - F(cx)) % 9 + 9) % 9;
    const g = Math.floor((X - F(cx)) / 9) & 3;
    const glyph = [[1, 2, 3, 4], [2, 4], [1, 3, 5], [1, 5]][g];
    if (r === 2) for (const k of [1, 2, 3, 4, 5]) c.on(ids, X, H0 + k, Mat.Trim, glyph.includes(k) ? 1 : X < F(cx) ? 3 : 2);
    if (r === 3 && g % 2 === 0) c.on(ids, X, H0 + 3, Mat.Trim, 1);
    if (r === 4) c.on(ids, X, H0 + (g + 1), Mat.Trim, 1);
  }
}

/** Corda trançada (druida): dois fios que se cruzam, nó e pontas penduradas com franja. */
function rope(c: Canvas, ids: readonly number[], cx: number, half: number, y: number, knot: boolean) {
  const Y0 = F(y);
  for (let X = F(cx - half - 1); X <= F(cx + half + 1); X++) {
    for (let k = 0; k < 4; k++) {
      const twist = ((X + k * 2) % 6 + 6) % 6;
      c.on(ids, X, Y0 + k, Mat.Linen, twist < 2 ? 4 : twist < 4 ? 2 : k === 3 ? 0 : 3);
    }
  }
  if (!knot) return;
  const kx = cx - 3.5, ky = y + 1;
  const k = ellipse(c, kx, ky, 1.5, 1.3, Mat.Linen);
  c.on(k, F(kx), F(ky), Mat.Linen, 1);
  for (const [dx, len] of [[-0.8, 5.5], [0.8, 4.4]] as const) {
    const end = limb(c, [kx + dx, ky + 0.8], [kx + dx * 1.6, ky + len], 0.55, 0.5, Mat.Linen);
    for (let j = 0; j < 3; j++) c.px(F(kx + dx * 1.6) - 1 + j, F(ky + len) + 1 + (j % 2), Mat.Linen, 2);
    void end;
  }
}

/** Faixa de pano (feiticeiro): nó do lado e duas pontas compridas. */
function sash(c: Canvas, ids: readonly number[], cx: number, half: number, y: number, knot: boolean) {
  for (let X = F(cx - half - 1); X <= F(cx + half + 1); X++) {
    for (let k = 0; k < 5; k++) c.on(ids, X, F(y) + k, Mat.Secondary, k === 0 ? 4 : k === 4 ? 0 : ((X + k) % 7 === 0 ? 1 : X < F(cx) ? 3 : 2));
  }
  if (!knot) return;
  const kx = cx - half + 2.6, ky = y + 1.2;
  ellipse(c, kx, ky, 1.8, 1.5, Mat.Secondary);
  limb(c, [kx - 0.6, ky + 1], [kx - 1.6, ky + 8.5], 1.2, 1.4, Mat.Secondary, (X, Y) => (Y % 5 === 0 ? -1 : 0));
  const e2 = limb(c, [kx + 0.6, ky + 1], [kx + 0.9, ky + 7], 1.1, 1.3, Mat.Secondary, (X, Y) => (Y % 5 === 0 ? -1 : 0));
  // Franja dourada nas pontas.
  for (let j = -2; j <= 2; j++) { c.px(F(kx - 1.6) + j, F(ky + 9.6), Mat.Trim, j % 2 ? 2 : 4); c.px(F(kx + 0.9) + j, F(ky + 8.1), Mat.Trim, j % 2 ? 2 : 4); }
  void e2;
}

/** Tronco nu: peito, clavícula, abdome e umbigo marcados com luz. */
function bareTorso(c: Canvas, top: number, cx: number, half: number, side: boolean) {
  const pts: Pt[] = side
    ? [[cx - 8, top + 3], [cx - 5, top], [cx + 7, top], [cx + 9, top + 3], [cx + 7.5, top + 12], [cx + 8, top + 17], [cx - 8, top + 17], [cx - 7.5, top + 12]]
    : [[cx - half, top + 2], [cx - 8.5, top], [cx + 8.5, top], [cx + half, top + 2], [cx + 10, top + 12], [cx + 9.5, top + 17], [cx - 9.5, top + 17], [cx - 10, top + 12]];
  const id = poly(c, pts, Mat.Skin, cx - (side ? 9 : half), cx + (side ? 9 : half));
  if (side) {
    // Peito saindo para a frente e barriga.
    thread(c, [cx - 6.5, top + 6.5], [cx - 3, top + 7.2], Mat.Skin, 2, [id]);
    thread(c, [cx - 6.6, top + 11], [cx - 5.4, top + 12], Mat.Skin, 2, [id]);
    return id;
  }
  // Clavículas, linha do peitoral, abdome em gomos e umbigo.
  for (const sx of [-1, 1]) {
    thread(c, [cx + sx * 1.5, top + 1.6], [cx + sx * 6.5, top + 1], Mat.Skin, sx < 0 ? 4 : 2, [id]);
    const pec: Pt[] = [[cx + sx * 0.6, top + 4], [cx + sx * 3, top + 7.2], [cx + sx * 6.8, top + 6.6], [cx + sx * 8.4, top + 4.6]];
    for (let i = 1; i < pec.length; i++) thread(c, pec[i - 1], pec[i], Mat.Skin, sx < 0 ? 2 : 1, [id]);
    thread(c, [cx + sx * 0.6, top + 4.2], [cx + sx * 6.2, top + 6], Mat.Skin, -1, [id]);
    c.on(id, F(cx + sx * 4.6), F(top + 6), Mat.Lip, 2);
  }
  thread(c, [cx, top + 7.4], [cx, top + 14], Mat.Skin, 2, [id]);
  for (const y of [top + 9.4, top + 11.6]) for (const sx of [-1, 1]) thread(c, [cx + sx * 0.8, y], [cx + sx * 3.6, y - 0.3], Mat.Skin, sx < 0 ? 2 : 1, [id]);
  c.on(id, F(cx), F(top + 14.6), Mat.Skin, 1); c.on(id, F(cx) - 1, F(top + 14.6), Mat.Skin, 1);
  return id;
}

/** Tanga do corpo base: faixa de linho na cintura, peça que cobre o quadril e aba caindo na frente e atrás. */
function loincloth(c: Canvas, top: number, cx: number, half: number, side: boolean, back: boolean) {
  const y0 = top + 13.6;
  const hip: Pt[] = side
    ? [[cx - 8, y0], [cx + 8, y0], [cx + 7.5, y0 + 5.5], [cx + 2, y0 + 7], [cx - 7, y0 + 5.5]]
    : [[cx - half, y0], [cx + half, y0], [cx + half - 0.6, y0 + 4], [cx + 4, y0 + 6.5], [cx, y0 + 7.6], [cx - 4, y0 + 6.5], [cx - half + 0.6, y0 + 4]];
  const wrap = poly(c, hip, Mat.Linen, cx - half, cx + half, linen);
  // Aba: pano mais comprido caindo do meio da faixa (na frente, ou atrás de costas; de lado, as duas).
  const flaps: [number, number][] = side ? [[cx - 6.5, 2.6], [cx + 6.8, 2.4]] : [[cx, 3.6]];
  for (const [fx, w] of flaps) {
    const pts: Pt[] = [[fx - w, y0 + 1], [fx + w, y0 + 1], [fx + w * 0.8, y0 + 10.5], [fx, y0 + 11.2], [fx - w * 0.8, y0 + 10.5]];
    const flap = poly(c, pts, Mat.Linen, fx - w, fx + w, linen);
    // Dobras verticais e barra desfiada.
    thread(c, [fx - w * 0.3, y0 + 2], [fx - w * 0.25, y0 + 10], Mat.Linen, 2, [flap]);
    thread(c, [fx + w * 0.4, y0 + 2.5], [fx + w * 0.35, y0 + 9.8], Mat.Linen, 1, [flap]);
    for (let X = F(fx - w * 0.8); X <= F(fx + w * 0.8); X += 2) c.px(X, F(y0 + 10.8) + (X % 4 ? 1 : 0), Mat.Linen, 2);
  }
  // Faixa da cintura enrolada, com nó do lado.
  const band: Pt[] = side
    ? [[cx - 8.2, y0 - 1], [cx + 8.2, y0 - 1], [cx + 8.2, y0 + 1.6], [cx - 8.2, y0 + 1.6]]
    : [[cx - half - 0.3, y0 - 1], [cx + half + 0.3, y0 - 1], [cx + half + 0.3, y0 + 1.6], [cx - half - 0.3, y0 + 1.6]];
  const b = poly(c, band, Mat.Linen, cx - half, cx + half, (X) => (X % 5 === 0 ? -1 : 0));
  if (!side && !back) {
    const k = ellipse(c, cx + half - 2.4, y0 + 0.4, 1.4, 1.2, Mat.Linen);
    c.on(k, F(cx + half - 2.4), F(y0 + 0.4), Mat.Linen, 1);
  }
  void wrap; void b;
}

const TORSO_FRONT = (top: number, bottom: number, flare: number): Pt[] =>
  [[CX - 13, top + 2], [CX - 9, top], [CX + 9, top], [CX + 13, top + 2], [CX + 11, top + 13], [CX + 11 + flare, bottom], [CX - 11 - flare, bottom], [CX - 11, top + 13]];
const TORSO_SIDE = (top: number, bottom: number, flare: number, sway = 0): Pt[] =>
  [[CX - 9, top + 3], [CX - 6, top], [CX + 8, top], [CX + 10, top + 3], [CX + 9, top + 13], [CX + 9 + flare + sway, bottom], [CX - 9 - flare + sway, bottom], [CX - 9, top + 13]];

/** Barra em zigue-zague de folhas recortadas (druida). */
const leafCut = (bottom: number) => (x: number, y: number) => {
  const p = ((x + 0.5) / 2.6) % 1;
  return y + 0.5 > bottom - 2.2 + Math.abs(p - 0.5) * 4.4;
};

/** Roupa de cima do kit (ou o tronco nu com a tanga). Devolve as peças do tronco, para cinto e enfeites. */
function torsoFront(c: Canvas, kit: Kit, top: number, back: boolean, sway: number): number[] {
  switch (kit.top) {
    case "none": {
      const id = bareTorso(c, top, CX, 12, false);
      loincloth(c, top, CX, 9.6, false, back);
      return [id];
    }
    case "gambeson": return [poly(c, TORSO_FRONT(top, top + 21, 1), Mat.Primary, CX - 13, CX + 13, quilt(CX))];
    case "tunic": return [poly(c, TORSO_FRONT(top, top + 21, 1.5), Mat.Primary, CX - 13, CX + 13, linen)];
    case "leaf": return [poly(c, TORSO_FRONT(top, top + 27.5, 2.5), Mat.Primary, CX - 13, CX + 13, leafScales, leafCut(top + 27.5))];
    case "robe": {
      const pts: Pt[] = [[CX - 12.5, top + 2], [CX - 9, top], [CX + 9, top], [CX + 12.5, top + 2], [CX + 11, top + 13], [CX + 14.5 + sway, FEET - 3.5], [CX - 14.5 + sway, FEET - 3.5], [CX - 11, top + 13]];
      return [poly(c, pts, Mat.Primary, CX - 13, CX + 13, velvet(CX))];
    }
  }
}

function torsoSide(c: Canvas, kit: Kit, top: number, sway: number): number[] {
  switch (kit.top) {
    case "none": {
      const id = bareTorso(c, top, CX, 9, true);
      loincloth(c, top, CX, 8, true, false);
      return [id];
    }
    case "gambeson": return [poly(c, TORSO_SIDE(top, top + 21, 1), Mat.Primary, CX - 10, CX + 10, quilt(CX))];
    case "tunic": return [poly(c, TORSO_SIDE(top, top + 21, 1.5), Mat.Primary, CX - 10, CX + 10, linen)];
    case "leaf": return [poly(c, TORSO_SIDE(top, top + 27.5, 2.5, sway * 0.5), Mat.Primary, CX - 10, CX + 10, leafScales, leafCut(top + 27.5))];
    case "robe": return [poly(c, TORSO_SIDE(top, FEET - 3.5, 3.5, sway), Mat.Primary, CX - 10, CX + 10, velvet(CX))];
  }
}

/** Cintura, barra e gola do kit sobre o tronco, de frente ou de costas. */
function dressFront(c: Canvas, kit: Kit, ids: number[], top: number, back: boolean) {
  switch (kit.waist) {
    case "belt": belt(c, ids, CX, 10.5, top, !back); break;
    case "strap": belt(c, ids, CX, 10.5, top, !back, !back); break;
    case "sash": sash(c, ids, CX, 10.5, top + 12.6, !back); break;
    case "rope": rope(c, ids, CX, 10.5, top + 13.2, !back); break;
    case "loincloth": break;
  }
  if (kit.top === "gambeson") hemDiamonds(c, ids, CX, 10.5, top + 19);
  if (kit.top === "tunic") hemLines(c, ids, CX, 10.5, top + 19.4);
  if (kit.top === "robe") {
    hemRunes(c, ids, CX, 13, FEET - 10.6);
    // Abertura da frente do manto: debrum dourado da cintura até a barra.
    if (!back) for (let Y = F(top + 17.6); Y < F(FEET - 10.6); Y++) { c.on(ids, F(CX) - 1, Y, Mat.Trim, 4); c.on(ids, F(CX), Y, Mat.Trim, 2); c.on(ids, F(CX) + 1, Y, Mat.Primary, 0); }
  }
  if (kit.top === "leaf") {
    // Nervuras nas pontas de folha da barra.
    for (let x = CX - 13; x <= CX + 13; x += 2.6) thread(c, [x + 1.3, top + 22.8], [x + 1.3, top + 26.4], Mat.Primary, 1, ids);
  }
  if (back) {
    if (kit.top === "gambeson" || kit.top === "tunic") {
      for (let Y = F(top + 2); Y < F(top + 12); Y++) c.nudge(F(CX), Y, -1);
      for (let X = F(CX - 5); X <= F(CX + 5); X++) { c.on(ids, X, F(top), Mat.Trim, 3); c.on(ids, X, F(top) + 1, Mat.Trim, 1); }
    }
    return;
  }
  const X0 = F(CX), T = F(top);
  switch (kit.top) {
    case "gambeson":
      // Gola em V: pele com sombra do pescoço, debrum dourado de 2 px dos dois lados.
      for (let k = 0; k < 12; k++) {
        const w = Math.max(0, 6 - Math.floor(k / 2));
        for (let x = -w; x < w; x++) c.px(X0 + x, T + k, Mat.Skin, k < 3 ? 1 : x < 0 ? 3 : 2);
        c.on(ids, X0 - w - 1, T + k, Mat.Trim, 4); c.on(ids, X0 - w - 2, T + k, Mat.Trim, 3);
        c.on(ids, X0 + w, T + k, Mat.Trim, 2); c.on(ids, X0 + w + 1, T + k, Mat.Trim, 1);
      }
      break;
    case "tunic":
      // Gola redonda com abertura amarrada por um cordão cruzado.
      for (let k = 0; k < 9; k++) {
        const w = k < 3 ? 4 - k : 1;
        for (let x = -w; x < w; x++) c.px(X0 + x, T + k, Mat.Skin, k < 2 ? 1 : x < 0 ? 3 : 2);
        if (k > 1 && k % 2 === 0) { c.px(X0 - 2, T + k, Mat.Linen, 4); c.px(X0 + 1, T + k, Mat.Linen, 3); c.px(X0 - 1, T + k + 1, Mat.Linen, 4); c.px(X0, T + k + 1, Mat.Linen, 3); }
      }
      for (let X = X0 - 9; X <= X0 + 8; X++) c.on(ids, X, T, Mat.Trim, X < X0 ? 3 : 2);
      break;
    case "leaf": {
      // Gola redonda e broche de folha no ombro.
      for (let X = X0 - 7; X <= X0 + 6; X++) { c.on(ids, X, T, Mat.Primary, 0); c.on(ids, X, T + 1, Mat.Primary, 4); }
      const bx = CX + 6.6, by = top + 3.4;
      const brooch = ellipse(c, bx, by, 1.6, 1.6, Mat.Trim);
      c.on(brooch, F(bx) - 1, F(by) - 1, Mat.Trim, 5);
      leaf(c, [bx - 1.8, by + 1.6], 2.3, 2.2, 1.1);
      leaf(c, [bx + 1.8, by + 1.4], 0.9, 2, 1);
      break;
    }
    case "robe":
      // A gola alta é desenhada junto com a cabeça (fica atrás dela).
      break;
    case "none":
      break;
  }
}

function dressSide(c: Canvas, kit: Kit, ids: number[], top: number) {
  switch (kit.waist) {
    case "belt": case "strap": belt(c, ids, CX, 8.5, top, false); break;
    case "sash": sash(c, ids, CX, 8.5, top + 12.6, false); break;
    case "rope": rope(c, ids, CX, 8.5, top + 13.2, false); break;
    case "loincloth": break;
  }
  if (kit.top === "gambeson") hemDiamonds(c, ids, CX, 8.5, top + 19);
  if (kit.top === "tunic") hemLines(c, ids, CX, 8.5, top + 19.4);
  if (kit.top === "robe") hemRunes(c, ids, CX + 1, 13, FEET - 10.6);
  if (kit.top === "leaf") for (let x = CX - 12; x <= CX + 12; x += 2.6) thread(c, [x + 1.3, top + 22.8], [x + 1.3, top + 26.4], Mat.Primary, 1, ids);
  // Gola de lado: pele do pescoço na frente.
  if (kit.top === "gambeson" || kit.top === "tunic") {
    for (let k = 0; k < 8; k++) {
      c.px(F(CX - 6) + k, F(top) + k, Mat.Trim, 4); c.px(F(CX - 6) + k + 1, F(top) + k, Mat.Trim, 2);
      for (let x = 0; x < 5 - Math.floor(k / 2); x++) c.px(F(CX - 6) + k + 2 + x, F(top) + k, Mat.Skin, 1);
    }
  }
}

/** Tira da aljava cruzando o peito (de frente) ou as costas, por cima da roupa. */
function quiverStrap(c: Canvas, ids: readonly number[], a: Pt, b: Pt) {
  const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * K);
  for (let k = 0; k <= n; k++) {
    const p = lerp(a, b, k / n);
    for (let w = -2; w <= 2; w++) c.on(ids, F(p[0]), F(p[1]) + w, Mat.Detail, w === -2 ? 4 : w === 2 ? 0 : k % 4 === 0 && w === 0 ? 1 : 3);
  }
  // Fivela no meio.
  const m = lerp(a, b, 0.55);
  for (const [dx, dy, t] of [[-1, -2, 5], [0, -2, 4], [1, -2, 4], [-1, -1, 4], [1, -1, 2], [-1, 0, 4], [1, 0, 2], [-1, 1, 3], [0, 1, 2], [1, 1, 1]] as const) c.px(F(m[0]) + dx, F(m[1]) + dy, Mat.Trim, t);
}

// --- Poses --------------------------------------------------------------------------

const FEET = 91;
const CX = 47.5;

/** Balanço da caminhada: passo, passagem, outro passo, passagem. */
const SWING = [1, 0, -1, 0];
const BOB = [0, -1, 0, -1];

/** A arma do kit na mão `at` (`out` = lado de fora, para onde a lâmina e a barriga do arco apontam). */
function weaponFront(c: Canvas, kit: Kit, at: Pt, out: number, top: number): (() => void) | undefined {
  switch (kit.weapon) {
    case "bow": return () => bow(c, at, out);
    case "staff": return () => staff(c, at, top - 19, FEET - 0.5);
    case "branch": return () => branch(c, at, top + 2, FEET - 1);
    case "greatsword": return () => greatsword(c, at, [at[0] + out * 3, top - 30]);
    default: return undefined;
  }
}

function front(c: Canvas, kit: Kit, frame: number, back: boolean) {
  const s = SWING[frame], b = BOB[frame];
  const hipY = 66 + b;
  const top = 47 + b;
  // Pernas: no passo, a de trás tira o calcanhar do chão (pé 2 unidades acima).
  const legs: [number, number][] = [[CX - 4.5, s < 0 ? -2 : 0], [CX + 4.5, s > 0 ? -2 : 0]];
  legs.forEach(([x, lift], i) => {
    const far = back ? i === 0 : i === 1;
    const knee: Pt = [x + (i ? 0.5 : -0.5), 77 + b + lift / 2];
    const ankle: Pt = [x + (i ? 0.5 : -0.5), FEET - 3 + lift];
    leg(c, kit, [x, hipY], knee, ankle, [ankle[0], ankle[1] + 1.5], far, !back);
  });

  // Atrás do corpo: cabelo comprido (de frente) e a aljava (de frente só aparece acima do ombro).
  if (!back) hairBehind(c, kit, b, top);
  if (kit.quiver && !back) quiver(c, [CX + 9.5, top - 3], [CX + 2, top + 14], 6.5);

  const ids = torsoFront(c, kit, top, back, s * 0.8);
  dressFront(c, kit, ids, top, back);
  if (kit.quiver) {
    if (back) {
      quiverStrap(c, ids, [CX - 9, top + 1], [CX + 10, top + 13]);
      ids.push(quiver(c, [CX - 8.5, top - 3], [CX + 1.5, top + 15], 6.5));
    } else quiverStrap(c, ids, [CX + 9, top + 1], [CX - 10, top + 13]);
  }

  // Braços. De frente a arma fica na mão da esquerda da tela; de costas, na da direita.
  const armY = (side: number) => s * side * (back ? -1 : 1);
  for (const side of [-1, 1]) {
    const sh: Pt = [CX + side * 12.5, top + 3];
    const el: Pt = [CX + side * 14, top + 10 + armY(side) * 0.5];
    const ha: Pt = [CX + side * 13.5, top + 18 + armY(side)];
    const holds = (side < 0) === !back;
    arm(c, kit, sh, el, ha, false, holds ? weaponFront(c, kit, ha, side, top) : undefined);
    if (holds && kit.weapon === "sword") sword(c, ha, [ha[0] + side * 4, ha[1] + 21]);
  }
  if (back) headBack(c, kit, b, top);
  else headFront(c, kit, b, top);
}

function side(c: Canvas, kit: Kit, frame: number) {
  const s = SWING[frame], b = BOB[frame];
  const hip: Pt = [CX + 1, 66 + b];
  const top = 47 + b;
  // Passo: perna da frente à esquerda, a outra atrás com o calcanhar no ar. Passagem: juntas.
  const pose = (fwd: number): [Pt, Pt, Pt] => {
    if (fwd > 0) return [[hip[0] - 4, 77 + b], [hip[0] - 7, FEET - 3], [hip[0] - 12, FEET - 2]];
    if (fwd < 0) return [[hip[0] + 3, 77 + b], [hip[0] + 7, FEET - 5], [hip[0] + 2.5, FEET - 3]];
    return [[hip[0] - 1, 77 + b], [hip[0], FEET - 3], [hip[0] - 5, FEET - 2]];
  };
  const [fk, fa, ft] = pose(-s);
  leg(c, kit, hip, fk, fa, ft, true, false);
  // Braço de lá, atrás do tronco, balançando ao contrário da perna.
  arm(c, kit, [CX + 2, top + 3], [CX + 3 + s * 2, top + 10], [CX + 3 + s * 4, top + 18], true);
  const [nk, na, nt] = pose(s);
  leg(c, kit, hip, nk, na, nt, false, false);

  // Cabelo comprido e aljava nas costas (atrás do tronco).
  hairBehindSide(c, kit, b, top);
  if (kit.quiver) quiver(c, [CX + 9.5, top - 4], [CX + 6, top + 14], 6.5);
  const ids = torsoSide(c, kit, top, -s * 1.2);
  dressSide(c, kit, ids, top);
  if (kit.quiver) quiverStrap(c, ids, [CX + 4, top + 0.5], [CX - 6, top + 12]);

  // Braço de cá na frente do tronco, com a arma.
  const ha: Pt = [CX - 4 - s * 3, top + 18];
  const grip = kit.weapon === "bow" ? () => bow(c, ha, -1)
    : kit.weapon === "staff" ? () => staff(c, ha, top - 19, FEET - 0.5)
    : kit.weapon === "branch" ? () => branch(c, ha, top + 2, FEET - 1)
    : kit.weapon === "greatsword" ? () => greatsword(c, ha, [ha[0] - 22, top - 22])
    : undefined;
  arm(c, kit, [CX - 1, top + 3], [CX - 2 - s * 1.5, top + 10], ha, false, grip);
  if (kit.weapon === "sword") sword(c, ha, [ha[0] - 16, ha[1] + 15]);
  headSide(c, kit, b, top);
}

// --- Cabeça (detalhes em pixel final) -------------------------------------------------

/** Pixel espelhado em torno do centro do rosto: `sx` = −1 (esquerda da tela) ou 1, `dx` = 0 encostado no meio. */
const mx = (sx: number, dx: number) => (sx < 0 ? F(CX) - 1 - dx : F(CX) + dx);

/** Barba por fazer: pontinhos esparsos no queixo e na mandíbula. */
function stubble(c: Canvas, id: number, X0: number, X1: number, Y0: number, Y1: number, keep: (X: number, Y: number) => boolean) {
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) if (keep(X, Y) && noise(X, Y) < 0.2) c.on(id, X, Y, Mat.Hair, noise(Y, X) < 0.5 ? 2 : 3);
}

/** Brilho do cabelo em arco no alto à esquerda. */
function gloss(c: Canvas, ids: readonly number[], x0: number, x1: number, y: number, cxArc: number) {
  for (let X = F(x0); X <= F(x1); X++) {
    const Y = F(y) + Math.round(((X - F(cxArc)) / 8) ** 2 * 3);
    if (noise(X, 2) < 0.7) { c.on(ids, X, Y, Mat.Hair, 5); c.on(ids, X, Y + 1, Mat.Hair, 4); }
  }
}

/** Folhinhas presas no cabelo (druida). */
function hairLeaves(c: Canvas, spots: readonly [number, number, number][]) {
  for (const [x, y, a] of spots) leaf(c, [x, y], a, 1.7, 0.9);
}

/** Cabelo comprido que cai atrás dos ombros (de frente fica atrás do tronco). */
function hairBehind(c: Canvas, kit: Kit, b: number, top: number) {
  if (kit.hair !== "long" && kit.hair !== "flowing") return;
  const cy = 37 + b;
  const low = kit.hair === "long" ? top + 9 : top + 4;
  const pts: Pt[] = [[CX - 9.4, cy - 2], [CX - 11.2, low - 3], [CX - 9, low], [CX + 9, low], [CX + 11.2, low - 3], [CX + 9.4, cy - 2]];
  poly(c, pts, Mat.Hair, CX - 11, CX + 11, (X, Y) => -1 + strands(X, Y));
}

function hairBehindSide(c: Canvas, kit: Kit, b: number, top: number) {
  if (kit.hair !== "long" && kit.hair !== "flowing") return;
  const cy = 37 + b, cx = CX + 1;
  const low = kit.hair === "long" ? top + 12 : top + 5;
  const pts: Pt[] = [[cx + 1, cy - 4], [cx + 9.6, cy - 1], [cx + 10.5, low - 4], [cx + 8, low], [cx + 2, low - 1], [cx + 1, cy + 6]];
  poly(c, pts, Mat.Hair, cx, cx + 11, (X, Y) => -1 + strands(X, Y));
}

/** Gola alta do manto: um aro de pano em pé atrás do pescoço, com debrum dourado. */
function highCollar(c: Canvas, cy: number, side: boolean) {
  const cx = side ? CX + 2.5 : CX;
  const pts: Pt[] = side
    ? [[cx - 2, cy + 7], [cx + 6.5, cy + 2.5], [cx + 7.5, cy + 11], [cx - 3, cy + 11.5]]
    : [[cx - 8.6, cy + 3], [cx - 5, cy + 9.6], [cx + 5, cy + 9.6], [cx + 8.6, cy + 3], [cx + 10, cy + 11.6], [cx - 10, cy + 11.6]];
  const id = poly(c, pts, Mat.Primary, cx - 10, cx + 10, velvet(cx));
  // Debrum na borda de cima.
  const edge = side ? [[cx - 2, cy + 7], [cx + 6.5, cy + 2.5]] as Pt[] : [[cx - 8.6, cy + 3], [cx - 5, cy + 9.6], [cx + 5, cy + 9.6], [cx + 8.6, cy + 3]] as Pt[];
  for (let i = 1; i < edge.length; i++) thread(c, edge[i - 1], edge[i], Mat.Trim, (k) => (k % 2 ? 4 : 3), [id]);
}

function headFront(c: Canvas, kit: Kit, b: number, top: number) {
  const cy = 37 + b;
  if (kit.top === "robe") highCollar(c, cy, false);
  ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin); // pescoço
  const face = ellipse(c, CX, cy, 8.6, 9, Mat.Skin);
  // Orelhas com a curva de dentro.
  for (const sx of [-1, 1]) {
    const ear = ellipse(c, CX + sx * 8.4, cy + 2, 1.3, 2.1, Mat.Skin);
    for (const [dx, dy] of [[0, -2], [1, -1], [1, 0], [1, 1], [0, 2]]) c.on(ear, F(CX + sx * 8.4) + sx * dx, F(cy + 2) + dy, Mat.Skin, 1);
  }
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const inHair = inEllipse(hx, hy, rx, ry);
  const hairIds: number[] = [];
  c.begin();
  switch (kit.hair) {
    case "none": {
      // Careca: brilho na cabeça e a sombra do cabelo raspado nas têmporas.
      gloss(c, [face], CX - 6, CX + 1, cy - 7.4, CX - 3);
      for (let Y = F(cy - 3); Y < F(cy + 2); Y++) for (const sx of [-1, 1]) for (let dx = 13; dx <= 16; dx++) if (noise(dx, Y) < 0.25) c.on(face, mx(sx, dx), Y, Mat.Hair, 3);
      break;
    }
    case "short":
      // Calota com franja em pontas finas acima da sobrancelha e costeletas até a orelha.
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), (x, y, X, Y) => {
        if (!inHair(x, y)) return false;
        const fringe = F(cy - 3) + Math.floor(noise(Math.floor(X / 2), 9) * 4) - (Math.abs(X - F(CX)) < 3 ? 1 : 0);
        return Y < fringe || (Math.abs(x + 0.5 - CX) > 7 && y < cy + 3);
      }, Mat.Hair, sphere(hx, hy, rx, ry), strands));
      break;
    case "medium":
      // Franja jogada para o lado e laterais até o queixo.
      hairIds.push(c.fill([hx - rx - 0.6, hy - ry, hx + rx + 0.6, cy + 8], (x, y, X, Y) => {
        const d = Math.abs(x + 0.5 - CX);
        const cap = inHair(x, y) || (d < rx + 0.4 && d > 7.4 && y > cy - 2 && y < cy + 6.5 - (d - 7.4) * 1.5);
        if (!cap) return false;
        const fringe = F(cy - 3.6 + (x - CX) * 0.16) + Math.floor(noise(Math.floor(X / 2), 4) * 3);
        return Y < fringe || (d > 7.2 && y < cy + 7);
      }, Mat.Hair, sphere(hx, hy, rx + 0.6, ry + 1), strands));
      break;
    case "long":
      // Testa alta (entradas), cabelo branco puxado para trás e mechas caindo nos ombros.
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), (x, y) => inHair(x, y) && (y + 0.5 < cy - 5.4 + Math.abs(x + 0.5 - CX) * 0.15 || (!inEllipse(CX, cy + 2.4, 7.4, 9.4)(x, y) && y < cy + 6)), Mat.Hair, sphere(hx, hy, rx, ry), strands));
      for (const sx of [-1, 1]) {
        const lock: Pt[] = [[CX + sx * 7.6, cy], [CX + sx * 9.6, cy - 1], [CX + sx * 11.4, top + 6], [CX + sx * 9.6, top + 7.5], [CX + sx * 8.2, cy + 6]];
        hairIds.push(poly(c, lock, Mat.Hair, CX + sx * 7.6, CX + sx * 11.4, strands));
      }
      break;
    case "flowing":
      // Repartido no meio, caindo dos lados do rosto até os ombros.
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), (x, y, X, Y) => {
        if (!inHair(x, y)) return false;
        const d = Math.abs(x + 0.5 - CX);
        return Y < F(cy - 3.8 + d * 0.32) + Math.floor(noise(Math.floor(X / 2), 6) * 3) || (d > 7.2 && y < cy + 6);
      }, Mat.Hair, sphere(hx, hy, rx, ry), strands));
      // Risca do meio.
      for (let Y = F(cy - 9.4); Y < F(cy - 3.6); Y++) c.on(hairIds, F(CX) - (Y % 3 === 0 ? 1 : 0), Y, Mat.Hair, 0);
      for (const sx of [-1, 1]) {
        const lock: Pt[] = [[CX + sx * 7, cy - 1], [CX + sx * 9.8, cy - 2], [CX + sx * 11, top + 3], [CX + sx * 8.4, top + 4], [CX + sx * 7.2, cy + 7]];
        hairIds.push(poly(c, lock, Mat.Hair, CX + sx * 7, CX + sx * 11, strands));
      }
      break;
  }
  c.end();
  if (hairIds.length) gloss(c, hairIds, CX - 7, CX + 1, hy - 6, CX - 3);
  if (kit.headband) {
    // Faixa de couro na testa, com costura e um rebite de cada lado.
    const Y0 = F(cy - 3.6);
    for (let X = F(CX - 9.6); X <= F(CX + 9.6); X++) {
      const dy = Math.round(((X - F(CX)) / F(9.6)) ** 2 * 2);
      for (let k = 0; k < 4; k++) c.on([face, ...hairIds], X, Y0 + k - dy, Mat.Detail, k === 0 ? 4 : k === 3 ? 0 : X < F(CX) ? 3 : 2);
      if (X % 3 === 0) c.on([face, ...hairIds], X, Y0 + 1 - dy, Mat.Detail, 1);
    }
    for (const sx of [-1, 1]) { c.px(mx(sx, 12), Y0 + 1, Mat.Trim, 5); c.px(mx(sx, 12), Y0 + 2, Mat.Trim, 2); }
  }
  if (kit.wild) hairLeaves(c, [[CX - 8.6, cy - 4.4, -0.8], [CX + 9, cy - 2.6, 0.9], [CX - 2.6, cy - 8.2, -0.3], [CX - 10.6, top + 1.6, 2]]);

  const Yc = F(cy);
  const old = kit.beard === "long";
  for (const sx of [-1, 1]) {
    // Sobrancelha: grossa perto do nariz, afinando para fora (mais cheia e caída no velho).
    for (let dx = 3; dx <= 10; dx++) c.px(mx(sx, dx), Yc + 1 + (dx < 5 ? 1 : 0) + (old && dx > 8 ? 1 : 0), Mat.Hair, dx > 8 ? 2 : 1);
    for (let dx = 4; dx <= 7; dx++) c.px(mx(sx, dx), Yc + 2 + (dx < 5 ? 1 : 0), Mat.Hair, 1);
    if (old) for (let dx = 4; dx <= 9; dx++) c.px(mx(sx, dx), Yc, Mat.Hair, noise(dx, sx) < 0.5 ? 3 : 2);
    // Olho de 5 × 3: pálpebra escura, branco, íris com pupila e brilho, pálpebra de baixo.
    for (let dx = 4; dx <= 9; dx++) c.px(mx(sx, dx), Yc + 4, Mat.Eye, dx === 9 ? 1 : 0);
    const row = [[4, Mat.White, 3], [5, Mat.Iris, 3], [6, Mat.Eye, 0], [7, Mat.Iris, 2], [8, Mat.White, 2], [9, Mat.Eye, 1]] as const;
    for (const [dx, m, t] of row) c.px(mx(sx, dx), Yc + 5, m, t);
    for (const [dx, m, t] of [[4, Mat.White, 2], [5, Mat.Iris, 2], [6, Mat.Iris, 1], [7, Mat.Iris, 1], [8, Mat.White, 1]] as const) c.px(mx(sx, dx), Yc + 6, m, t);
    c.px(mx(sx, sx < 0 ? 7 : 5), Yc + 5, Mat.White, 5);
    for (let dx = 5; dx <= 8; dx++) c.px(mx(sx, dx), Yc + 7, Mat.Skin, 2);
    if (old) {
      // Pés de galinha e bolsa embaixo do olho.
      for (const [dx, dy] of [[10, 3], [11, 4], [10, 5], [11, 6]]) c.px(mx(sx, dx), Yc + dy, Mat.Skin, 2);
      for (let dx = 5; dx <= 8; dx++) c.px(mx(sx, dx), Yc + 8, Mat.Skin, 2);
    }
    if (kit.wild) {
      // Pintura verde: duas listras descendo pela bochecha.
      for (let k = 0; k < 5; k++) { c.px(mx(sx, 7 + Math.floor(k / 2)), Yc + 9 + k, Mat.Leaf, 2); c.px(mx(sx, 10 + Math.floor(k / 2)), Yc + 8 + k, Mat.Leaf, 3); }
    } else {
      // Maçã do rosto: um toque de cor quente.
      for (const [dx, dy] of [[10, 9], [10, 10]]) c.px(mx(sx, dx), Yc + dy, Mat.Lip, 4);
    }
  }
  if (old) {
    // Rugas da testa.
    for (const y of [-5, -3]) for (let dx = 0; dx <= 6; dx++) if (noise(dx, y) < 0.8) for (const sx of [-1, 1]) c.on(face, mx(sx, dx), Yc + y + (dx > 4 ? 1 : 0), Mat.Skin, 2);
  }
  // Nariz: sombra do lado direito, ponta clara, narinas.
  for (let dy = 6; dy <= 10; dy++) c.px(mx(1, 1), Yc + dy, Mat.Skin, 2);
  c.px(mx(-1, 0), Yc + 10, Mat.Skin, 4); c.px(mx(1, 0), Yc + 11, Mat.Skin, 2);
  c.px(mx(-1, 1), Yc + 12, Mat.Skin, 1); c.px(mx(1, 1), Yc + 12, Mat.Skin, 1); c.px(mx(1, 0), Yc + 12, Mat.Skin, 2);
  if (kit.beard === "long") {
    if (kit.helmet) helmetFront(c, kit, cy, top);
    beardFront(c, cy, top);
    return;
  }
  // Boca: linha dos lábios, cantinhos e lábio de baixo claro.
  for (let dx = 0; dx <= 3; dx++) for (const sx of [-1, 1]) c.px(mx(sx, dx), Yc + 15, Mat.Lip, dx === 3 ? 2 : 0);
  for (let dx = 0; dx <= 2; dx++) for (const sx of [-1, 1]) c.px(mx(sx, dx), Yc + 16, Mat.Lip, sx < 0 && dx < 2 ? 4 : 3);
  c.px(mx(-1, 0), Yc + 13, Mat.Skin, 2);
  if (kit.beard === "stubble") {
    stubble(c, face, mx(-1, 13), mx(1, 13), Yc + 11, Yc + 19, (X, Y) => {
      const d = Math.abs(X - F(CX) + 0.5);
      return (d > 8 || Y > Yc + 16) && !(Y >= Yc + 14 && Y <= Yc + 16 && d < 5);
    });
  }
  // Cicatriz do cavaleiro na bochecha direita.
  if (kit.scar) for (let k = 0; k < 5; k++) { c.px(mx(1, 9 + k), Yc + 6 + k, Mat.Lip, 1); c.px(mx(1, 8 + k), Yc + 6 + k, Mat.Skin, 4); }
  if (kit.helmet) helmetFront(c, kit, cy, top);
}

/** Barba longa branca: bigode caindo nos cantos, barba em ponta até o peito, mechas e brilho. */
function beardFront(c: Canvas, cy: number, top: number) {
  const pts: Pt[] = [[CX - 7.6, cy + 2.6], [CX - 7.2, cy + 7.5], [CX - 4.6, top + 6], [CX - 1.4, top + 12], [CX, top + 13.4], [CX + 1.4, top + 12], [CX + 4.6, top + 6], [CX + 7.2, cy + 7.5], [CX + 7.6, cy + 2.6], [CX + 4, cy + 6], [CX - 4, cy + 6]];
  const beard = poly(c, pts, Mat.Hair, CX - 8, CX + 8, (X, Y) => strands(X, Y) + (X % 4 === 0 ? -1 : 0));
  // Bigode: dois arcos grossos saindo debaixo do nariz.
  for (const sx of [-1, 1]) {
    const m: Pt[] = [[CX + sx * 0.4, cy + 6.4], [CX + sx * 3.4, cy + 6.6], [CX + sx * 5.4, cy + 8.6]];
    chain(c, m, 1.15, Mat.Hair, strands, 0.7);
  }
  // Boca escondida: só uma sombra no meio do bigode.
  c.px(F(CX) - 1, F(cy + 7.6), Mat.Lip, 1); c.px(F(CX), F(cy + 7.6), Mat.Lip, 1);
  // Mechas escuras descendo e brilho do lado da luz.
  for (const x of [-3.2, -1.2, 1, 3]) thread(c, [CX + x, cy + 9], [CX + x * 0.4, top + 11], Mat.Hair, 2, [beard]);
  for (let Y = F(cy + 9); Y < F(top + 6); Y++) if (noise(Y, 1) < 0.6) c.on(beard, F(CX - 4.6) + Math.floor((Y - F(cy + 9)) / 6), Y, Mat.Hair, 5);
}

function headBack(c: Canvas, kit: Kit, b: number, top: number) {
  const cy = 37 + b;
  if (kit.top === "robe") highCollar(c, cy - 0.5, false);
  ellipse(c, CX, cy + 9, 3.5, 2.5, Mat.Skin);
  const skull = ellipse(c, CX, cy, 8.6, 9, Mat.Skin);
  for (const sx of [-1, 1]) ellipse(c, CX + sx * 8.4, cy + 2, 1.3, 2.1, Mat.Skin);
  const hx = CX, hy = cy - 0.8, rx = 9.4, ry = 9.4;
  const hairIds: number[] = [];
  c.begin();
  switch (kit.hair) {
    case "none":
      gloss(c, [skull], CX - 6, CX + 1, cy - 7.4, CX - 3);
      // Nuca com a linha do cabelo raspado.
      for (let X = F(CX - 6); X <= F(CX + 6); X++) for (let Y = F(cy + 2); Y < F(cy + 6); Y++) if (noise(X, Y) < 0.22) c.on(skull, X, Y, Mat.Hair, 3);
      break;
    case "short": {
      const hair = c.fill([hx - rx, hy - ry, hx + rx, hy + ry + 1], (x, y, X, Y) =>
        inEllipse(hx, hy, rx, ry)(x, y) || (Y <= F(hy + ry) + 1 && Math.abs(x + 0.5 - CX) < 6.5 && y > hy && noise(Math.floor(X / 2), 3) < 0.6),
      Mat.Hair, sphere(hx, hy, rx, ry), strands);
      hairIds.push(hair);
      break;
    }
    case "medium":
      hairIds.push(c.fill([hx - rx - 0.6, hy - ry, hx + rx + 0.6, cy + 9], (x, y, X, Y) =>
        inEllipse(hx, hy, rx + 0.4, ry)(x, y) || (y > hy && y < cy + 7 + noise(Math.floor(X / 2), 8) * 1.6 && Math.abs(x + 0.5 - CX) < 9.2 - (y - cy) * 0.2) && Y >= 0,
      Mat.Hair, sphere(hx, hy, rx + 0.6, ry + 1), strands));
      break;
    case "long":
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), inEllipse(hx, hy, rx, ry), Mat.Hair, sphere(hx, hy, rx, ry), strands));
      // Cabelão descendo pelas costas até o meio do tronco, com pontas recortadas.
      hairIds.push(c.fill([CX - 10, cy, CX + 10, top + 13], (x, y, X) => {
        const d = Math.abs(x + 0.5 - CX);
        return y + 0.5 > cy && d < 9.4 - Math.max(0, y - top) * 0.25 && y + 0.5 < top + 10.5 + noise(Math.floor(X / 3), 4) * 2.4;
      }, Mat.Hair, (x, y) => lit((x + 0.5 - CX) / 10, -0.2 + (y - cy) * 0.04, 0.8), (X, Y) => strands(X, Y) + (X % 5 === 0 ? -1 : 0)));
      // Mechas grossas: sulcos escuros curvos e o brilho entre eles.
      for (const x of [-6, -3.6, -1.2, 1.2, 3.6, 6]) {
        thread(c, [CX + x * 0.85, cy + 2], [CX + x, top + 10], Mat.Hair, (k) => (k % 9 === 4 ? -1 : 1), hairIds);
        thread(c, [CX + x * 0.85 - 0.6, cy + 3], [CX + x - 0.6, top + 9], Mat.Hair, (k) => (k % 5 === 0 ? 4 : -1), hairIds);
      }
      break;
    case "flowing":
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), inEllipse(hx, hy, rx, ry), Mat.Hair, sphere(hx, hy, rx, ry), strands));
      hairIds.push(c.fill([CX - 10.5, cy, CX + 10.5, top + 6], (x, y, X) => {
        const d = Math.abs(x + 0.5 - CX);
        return y + 0.5 > cy && d < 10 - Math.max(0, y - cy - 4) * 0.35 && y + 0.5 < top + 3.6 + noise(Math.floor(X / 3), 2) * 2;
      }, Mat.Hair, (x, y) => lit((x + 0.5 - CX) / 11, -0.2 + (y - cy) * 0.01, 0.8), strands));
      break;
  }
  c.end();
  if (hairIds.length) {
    // Redemoinho no alto da cabeça e brilho.
    const Xc = F(CX), Yt = F(hy - 5);
    for (const [dx, dy] of [[0, 0], [1, 0], [2, 1], [2, 2], [1, 3], [-1, 2], [-1, 1]]) c.on(hairIds, Xc + dx, Yt + dy, Mat.Hair, 1);
    gloss(c, hairIds, CX - 7, CX - 1, hy - 6, CX - 4);
  }
  if (kit.headband) {
    // Faixa dando a volta, nó atrás e duas pontas caindo.
    const Y0 = F(cy - 3.2);
    for (let X = F(CX - 9.6); X <= F(CX + 9.6); X++) {
      const dy = -Math.round(((X - F(CX)) / F(9.6)) ** 2 * 2);
      for (let k = 0; k < 4; k++) c.on([skull, ...hairIds], X, Y0 + k - dy, Mat.Detail, k === 0 ? 4 : k === 3 ? 0 : X < F(CX) ? 3 : 2);
    }
    ellipse(c, CX + 0.5, cy - 2, 1.5, 1.3, Mat.Detail, leather);
    limb(c, [CX, cy - 1], [CX - 1.4, cy + 6], 0.8, 0.9, Mat.Detail, leather);
    limb(c, [CX + 1, cy - 1], [CX + 2.2, cy + 5], 0.8, 0.9, Mat.Detail, leather);
  }
  if (kit.wild) hairLeaves(c, [[CX - 6.4, cy - 4.6, -0.4], [CX + 5.4, cy - 1.4, 0.7], [CX - 2, top + 1.6, 1.6], [CX + 7.6, top + 2, 2.2]]);
  if (kit.helmet === "wolf") wolfBack(c, cy, top);
  if (kit.helmet === "demon") demonBack(c, cy);
}

function headSide(c: Canvas, kit: Kit, b: number, top: number) {
  const cy = 37 + b;
  const cx = CX + 1;
  if (kit.top === "robe") highCollar(c, cy, true);
  ellipse(c, CX - 0.5, cy + 9, 3, 2.5, Mat.Skin); // pescoço
  const face = ellipse(c, cx, cy, 8.2, 9, Mat.Skin);
  const X0 = F(cx), Yc = F(cy);
  // Perfil: testa, nariz que sai do rosto, lábios e queixo, pixel a pixel (olhando para a esquerda).
  const nose = [[-17, 3, 3], [-18, 4, 3], [-18, 5, 4], [-19, 6, 3], [-19, 7, 3], [-19, 8, 2], [-18, 9, 2], [-17, 9, 1], [-18, 8, 3]] as const;
  for (const [dx, dy, t] of nose) c.px(X0 + dx, Yc + dy, Mat.Skin, t);
  c.px(X0 - 16, Yc + 10, Mat.Skin, 1);
  if (kit.beard !== "long") for (const [dx, dy, m, t] of [[-16, 13, Mat.Lip, 1], [-15, 13, Mat.Lip, 0], [-14, 13, Mat.Lip, 0], [-16, 14, Mat.Lip, 3], [-15, 14, Mat.Lip, 2]] as const) c.px(X0 + dx, Yc + dy, m, t);
  const hx = cx + 0.8, hy = cy - 0.8, rx = 9, ry = 9.4;
  const inHair = inEllipse(hx, hy, rx, ry);
  const hairIds: number[] = [];
  c.begin();
  switch (kit.hair) {
    case "none":
      gloss(c, [face], cx - 5, cx + 3, hy - 6, cx - 1);
      for (let Y = F(cy - 4); Y < F(cy + 4); Y++) for (let X = X0; X < X0 + 12; X++) if (noise(X, Y) < 0.18) c.on(face, X, Y, Mat.Hair, 3);
      break;
    case "short":
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), (x, y, X, Y) => {
        if (!inHair(x, y)) return false;
        const fringe = F(cy - 3) + Math.floor(noise(Math.floor(X / 2), 5) * 4);
        return x >= cx || Y < fringe || (x >= cx - 2.5 && y < cy + 4);
      }, Mat.Hair, sphere(hx, hy, rx, ry), strands));
      break;
    case "medium":
      hairIds.push(c.fill([hx - rx, hy - ry, hx + rx + 0.6, cy + 8], (x, y, X, Y) => {
        const cap = inHair(x, y) || (x > cx - 1 && inEllipse(hx + 0.2, cy + 1.2, rx + 0.4, ry + 2.2)(x, y) && y < cy + 7 + noise(Math.floor(X / 2), 3) * 1.4);
        if (!cap) return false;
        const fringe = F(cy - 3.4) + Math.floor(noise(Math.floor(X / 2), 7) * 3);
        return x >= cx - 1.5 || Y < fringe;
      }, Mat.Hair, sphere(hx, hy, rx + 0.6, ry + 1), strands));
      break;
    case "long":
      hairIds.push(c.fill(ebox(hx, hy, rx, ry), (x, y) => inHair(x, y) && (x >= cx - 1 || y + 0.5 < cy - 5.6), Mat.Hair, sphere(hx, hy, rx, ry), strands));
      break;
    case "flowing":
      hairIds.push(c.fill([hx - rx, hy - ry, hx + rx + 1, top + 4], (x, y, X, Y) => {
        const cap = inHair(x, y) || (x > cx - 2 && inEllipse(hx + 0.4, cy + 2.6, rx + 0.8, ry + 4.2)(x, y) && y < top + 2 + noise(Math.floor(X / 2), 3) * 2);
        if (!cap) return false;
        return x >= cx - 2 || Y < F(cy - 3.6) + Math.floor(noise(Math.floor(X / 2), 2) * 3);
      }, Mat.Hair, sphere(hx, hy, rx + 1, ry + 2), strands));
      break;
  }
  c.end();
  if (hairIds.length) gloss(c, hairIds, cx - 5, cx + 3, hy - 6, cx - 1);
  // Orelha com a curva de dentro (o cabelo comprido passa por trás dela).
  if (kit.hair !== "medium" && kit.hair !== "flowing") {
    const ear = c.fill([cx + 0.5, cy, cx + 3, cy + 4.5], inEllipse(cx + 1.8, cy + 2.2, 1.3, 2), Mat.Skin, sphere(cx + 1.8, cy + 2.2, 1.3, 2));
    for (const [dx, dy] of [[3, 2], [4, 3], [4, 4], [4, 5], [3, 6], [2, 4]]) c.on(ear, X0 + dx, Yc + dy, Mat.Skin, 1);
  }
  if (kit.headband) {
    // Faixa dando a volta e o nó atrás com as pontas.
    for (let X = F(cx - 8.4); X <= F(cx + 9.4); X++) {
      const dy = Math.round((X - F(cx)) * 0.12);
      for (let k = 0; k < 4; k++) c.on([face, ...hairIds], X, F(cy - 3.8) + k + dy, Mat.Detail, k === 0 ? 4 : k === 3 ? 0 : 3);
    }
    ellipse(c, cx + 9.4, cy - 2.2, 1.3, 1.2, Mat.Detail, leather);
    limb(c, [cx + 9.8, cy - 1.4], [cx + 11.4, cy + 4.4], 0.75, 0.85, Mat.Detail, leather);
    limb(c, [cx + 9.2, cy - 1.2], [cx + 9.8, cy + 5.6], 0.75, 0.85, Mat.Detail, leather);
  }
  if (kit.wild) hairLeaves(c, [[cx + 4.4, cy - 6.4, -0.5], [cx + 8.6, cy + 1.6, 1.2], [cx - 2.4, cy - 7.8, -0.2]]);
  // Sobrancelha, olho de perfil com íris e brilho, cílio.
  const old = kit.beard === "long";
  for (let dx = -13; dx <= -8; dx++) c.px(X0 + dx, Yc + 1 + (dx > -10 ? 0 : 1) + (old && dx < -11 ? 1 : 0), Mat.Hair, 1);
  if (old) for (let dx = -12; dx <= -8; dx++) c.px(X0 + dx, Yc, Mat.Hair, 3);
  for (const [dx, m, t] of [[-13, Mat.Eye, 0], [-12, Mat.Eye, 0], [-11, Mat.Eye, 0], [-10, Mat.Eye, 1]] as const) c.px(X0 + dx, Yc + 4, m, t);
  for (const [dx, m, t] of [[-13, Mat.Iris, 2], [-12, Mat.Eye, 0], [-11, Mat.White, 3], [-10, Mat.White, 2]] as const) c.px(X0 + dx, Yc + 5, m, t);
  for (const [dx, m, t] of [[-13, Mat.Iris, 1], [-12, Mat.Iris, 1], [-11, Mat.White, 1]] as const) c.px(X0 + dx, Yc + 6, m, t);
  c.px(X0 - 13, Yc + 5, Mat.White, 5);
  c.px(X0 - 14, Yc + 4, Mat.Eye, 0);
  if (kit.wild) for (let k = 0; k < 4; k++) { c.px(X0 - 11 + k, Yc + 9 + k, Mat.Leaf, 2); c.px(X0 - 8 + k, Yc + 8 + k, Mat.Leaf, 3); }
  else c.px(X0 - 8, Yc + 9, Mat.Lip, 4);
  if (old) for (const [dx, dy] of [[-8, 3], [-7, 4], [-8, 5]]) c.px(X0 + dx, Yc + dy, Mat.Skin, 2);
  if (kit.beard === "stubble") stubble(c, face, X0 - 14, X0 - 2, Yc + 11, Yc + 18, (X, Y) => X > X0 - 12 || Y > Yc + 15);
  if (kit.helmet === "wolf") wolfSide(c, cx, cy, top);
  if (kit.helmet === "demon") demonSide(c, cx, cy);
  if (kit.beard === "long") {
    // Barba de perfil: do queixo e da mandíbula, apontando para baixo e para a frente; bigode caído.
    const pts: Pt[] = [[cx - 8.6, cy + 5.6], [cx - 1, cy + 3.6], [cx + 0.4, cy + 8], [cx - 3, top + 7], [cx - 6.8, top + 12.6], [cx - 8.8, top + 6], [cx - 9.6, cy + 8.6]];
    const beard = poly(c, pts, Mat.Hair, cx - 10, cx + 1, (X, Y) => strands(X, Y) + (Y % 4 === 0 ? -1 : 0));
    chain(c, [[cx - 8.4, cy + 5.4], [cx - 9.8, cy + 7], [cx - 9.6, cy + 9.4]], 1, Mat.Hair, strands, 0.6);
    for (const k of [0, 1, 2]) thread(c, [cx - 3 - k * 1.6, cy + 8.6], [cx - 5 - k * 0.8, top + 10], Mat.Hair, 2, [beard]);
  }
}

// --- Itens do piloto -----------------------------------------------------------------

/** Pelo: tufos curtos que descem, com pontas claras e fundo escuro. */
const fur: Offset = (X, Y) => {
  const n = noise(X, (Y + (X >> 1)) >> 1);
  return n < 0.16 ? -1 : n > 0.9 ? 1 : (X + (Y >> 1)) % 5 === 0 ? -1 : 0;
};

/** Ferro batido: marcas de martelo e arranhões. */
const hammered: Offset = (X, Y) => (noise(X >> 1, Y >> 1) < 0.08 ? -1 : noise(X, Y) < 0.03 ? 1 : 0);

/** Barra de pelo desfiada: recorta embaixo de `y`, em tufos de 1 a 2 unidades. */
const furHem = (y: number) => (x: number, yy: number) => yy + 0.5 > y + noise(Math.floor((x + 0.5) * 1.6), 3) * 2.2;

/** Dente: triângulo de osso com luz. */
function fang(c: Canvas, base: Pt, half: number, len: number, dir = 1) {
  const pts: Pt[] = [[base[0] - half, base[1]], [base[0] + half, base[1]], [base[0] + half * 0.2, base[1] + len * dir]];
  return poly(c, pts, Mat.White, base[0] - half, base[0] + half);
}

/** Capuz do Lobo, de frente: a cabeça do lobo por cima da testa, a pele cobrindo o cabelo e caindo nos ombros. */
function wolfFront(c: Canvas, cy: number, top: number) {
  // Pele sobre os ombros: duas abas com a barra desfiada.
  for (const sx of [-1, 1]) {
    const pts: Pt[] = [[CX + sx * 7.8, cy - 1], [CX + sx * 10.4, cy + 2], [CX + sx * 15, top + 3], [CX + sx * 14.6, top + 11], [CX + sx * 10.6, top + 9.5], [CX + sx * 7.8, cy + 8.6]];
    poly(c, pts, Mat.Fur, CX + sx * 7.8, CX + sx * 15, fur, furHem(top + 7.4));
  }
  // Calota de pele: cobre o alto da cabeça e desce pelos lados do rosto.
  c.fill(ebox(CX, cy - 1.4, 10.6, 10.8), (x, y) => inEllipse(CX, cy - 1.4, 10.6, 10.8)(x, y) && (y + 0.5 < cy - 2.2 || Math.abs(x + 0.5 - CX) > 7.4) && y < cy + 8.4,
    Mat.Fur, sphere(CX, cy - 1.4, 10.6, 10.8), fur);
  // Orelhas em pé, com o miolo rosado.
  for (const sx of [-1, 1]) {
    poly(c, [[CX + sx * 8.4, cy - 8.6], [CX + sx * 7.2, cy - 16.4], [CX + sx * 3.2, cy - 10.6]], Mat.Fur, CX + sx * 3, CX + sx * 8.4, fur);
    poly(c, [[CX + sx * 7.4, cy - 9.6], [CX + sx * 6.9, cy - 14.4], [CX + sx * 4.6, cy - 10.6]], Mat.Lip, CX + sx * 4.6, CX + sx * 7.4, () => -1);
  }
  // Testa do lobo, focinho claro, nariz e olhos âmbar com a pupila em fenda.
  ellipse(c, CX, cy - 8, 6.6, 4.8, Mat.Fur, fur);
  thread(c, [CX, cy - 12.4], [CX, cy - 6], Mat.Fur, 1);
  ellipse(c, CX, cy - 3.8, 3.6, 2.6, Mat.FurLight, fur);
  const nose = ellipse(c, CX, cy - 5.2, 1.4, 1, Mat.Eye);
  c.on(nose, F(CX - 0.6), F(cy - 5.6), Mat.White, 3);
  thread(c, [CX, cy - 4.2], [CX, cy - 2.6], Mat.Eye, 1);
  for (const sx of [-1, 1]) {
    const eye = ellipse(c, CX + sx * 3.4, cy - 7.8, 1.3, 0.75, Mat.Amber);
    c.on(eye, F(CX + sx * 3.4), F(cy - 7.8), Mat.Eye, 0); c.on(eye, F(CX + sx * 3.4), F(cy - 8.2), Mat.Eye, 0);
    c.on(eye, F(CX + sx * 3.4 - 0.6), F(cy - 8.2), Mat.Amber, 5);
    thread(c, [CX + sx * 1.8, cy - 9.2], [CX + sx * 5.2, cy - 8.8], Mat.Fur, 0);
  }
  // Maxilar de cima apoiado na testa: linha da boca e os dentes caindo, dois caninos grandes.
  thread(c, [CX - 3.6, cy - 1.6], [CX + 3.6, cy - 1.6], Mat.Lip, 0);
  for (const k of [-1.6, -0.6, 0.4, 1.4]) fang(c, [CX + k + 0.1, cy - 1.4], 0.4, 0.7);
  for (const sx of [-1, 1]) fang(c, [CX + sx * 2.7, cy - 1.5], 0.6, 2);
}

function wolfBack(c: Canvas, cy: number, top: number) {
  // Pele caindo pelas costas como capa, com a barra desfiada e listra escura no meio.
  const cape: Pt[] = [[CX - 8.6, cy - 1], [CX - 13, top + 2], [CX - 12.4, top + 13], [CX + 12.4, top + 13], [CX + 13, top + 2], [CX + 8.6, cy - 1]];
  const id = poly(c, cape, Mat.Fur, CX - 13, CX + 13, fur, furHem(top + 10.4));
  for (let Y = F(cy); Y < F(top + 11); Y++) for (let d = -2; d <= 1; d++) c.on(id, F(CX) + d, Y, Mat.Fur, noise(d, Y) < 0.5 ? 1 : 2);
  c.fill(ebox(CX, cy - 1.4, 10.6, 10.8), inEllipse(CX, cy - 1.4, 10.6, 10.8), Mat.Fur, sphere(CX, cy - 1.4, 10.6, 10.8), fur);
  for (const sx of [-1, 1]) poly(c, [[CX + sx * 8.4, cy - 8.6], [CX + sx * 7.2, cy - 16.4], [CX + sx * 3.2, cy - 10.6]], Mat.Fur, CX + sx * 3, CX + sx * 8.4, (X, Y) => fur(X, Y) - 1);
  thread(c, [CX, cy - 12], [CX, cy + 8], Mat.Fur, 1);
}

function wolfSide(c: Canvas, cx: number, cy: number, top: number) {
  // Capa de pele pelas costas, calota com a janela do rosto, cabeça do lobo de perfil com o focinho para a frente.
  poly(c, [[cx + 1, cy - 2], [cx + 10.6, cy + 1], [cx + 11.6, top + 13], [cx + 3, top + 13], [cx + 1, cy + 8]], Mat.Fur, cx, cx + 12, fur, furHem(top + 10.4));
  c.fill(ebox(cx + 0.8, cy - 1.4, 10, 10.8), (x, y) => inEllipse(cx + 0.8, cy - 1.4, 10, 10.8)(x, y) && (x + 0.5 > cx - 1.6 || y + 0.5 < cy - 2.4) && y < cy + 8.4,
    Mat.Fur, sphere(cx + 0.8, cy - 1.4, 10, 10.8), fur);
  poly(c, [[cx - 1.6, cy - 10], [cx + 0.8, cy - 17], [cx + 3.6, cy - 10.4]], Mat.Fur, cx - 1.6, cx + 3.6, fur);
  poly(c, [[cx - 0.6, cy - 10.6], [cx + 0.8, cy - 15], [cx + 2.4, cy - 10.6]], Mat.Lip, cx - 0.6, cx + 2.4, () => -1);
  ellipse(c, cx - 1.6, cy - 7.6, 6, 4.4, Mat.Fur, fur);
  // Focinho comprido: em cima pelo, embaixo o claro, nariz na ponta.
  poly(c, [[cx - 4.6, cy - 10], [cx - 11.8, cy - 6], [cx - 12.2, cy - 4.4], [cx - 4.4, cy - 3.6]], Mat.Fur, cx - 12, cx - 4, fur);
  poly(c, [[cx - 4.4, cy - 5.4], [cx - 12, cy - 5], [cx - 11.6, cy - 3.6], [cx - 4.4, cy - 3]], Mat.FurLight, cx - 12, cx - 4, fur);
  const nose = ellipse(c, cx - 12, cy - 5.4, 1.1, 0.9, Mat.Eye);
  c.on(nose, F(cx - 12.4), F(cy - 5.8), Mat.White, 3);
  thread(c, [cx - 11.6, cy - 3.6], [cx - 4.6, cy - 2.9], Mat.Lip, 0);
  for (const x of [-11, -9.8, -8.6, -7.2, -5.8]) fang(c, [cx + x, cy - 3.3], 0.4, x === -9.8 ? 1.9 : 0.7);
  const eye = ellipse(c, cx - 5.4, cy - 7.8, 1.1, 0.7, Mat.Amber);
  c.on(eye, F(cx - 5.6), F(cy - 7.8), Mat.Eye, 0);
  c.on(eye, F(cx - 5.8), F(cy - 8.2), Mat.Amber, 5);
  thread(c, [cx - 7, cy - 9], [cx - 3.8, cy - 9.2], Mat.Fur, 0);
}

/** Chifre curvo: cápsulas afinando, com anéis escuros e a ponta clara. */
function horn(c: Canvas, pts: readonly Pt[], r0: number, dark = 0) {
  chain(c, pts, r0, Mat.Horn, (X, Y) => dark + ((X + Y * 2) % 7 === 0 ? -1 : 0), 0.35);
  const tip = pts[pts.length - 1];
  c.px(F(tip[0]), F(tip[1]), Mat.Horn, 5);
}

/** Elmo do Demônio, de frente: viseira de cara de demônio com olhos em brasa, presas e chifres de carneiro. */
function demonFront(c: Canvas, cy: number) {
  for (const sx of [-1, 1]) horn(c, [[CX + sx * 8, cy - 3.2], [CX + sx * 12.4, cy - 5.4], [CX + sx * 15.2, cy - 9.8], [CX + sx * 14.6, cy - 14.8], [CX + sx * 12.4, cy - 17.6]], 2.4);
  const shell = c.fill(ebox(CX, cy, 10.4, 11), (x, y) => inEllipse(CX, cy - 0.6, 9.8, 10.2)(x, y) || (y > cy + 2 && y < cy + 9.8 && Math.abs(x + 0.5 - CX) < 8.6 - (y - cy - 2) * 0.75),
    Mat.Iron, sphere(CX, cy - 0.4, 10.2, 10.8), hammered);
  // Crista de espinhos no alto.
  for (const k of [-2.4, 0, 2.4]) poly(c, [[CX + k - 1, cy - 9.4], [CX + k + 1, cy - 9.4], [CX + k * 1.2, cy - 13.4 + Math.abs(k) * 0.5]], Mat.Iron, CX + k - 1, CX + k + 1);
  // Sobrancelha em V saltada, nariz em quilha, rebites.
  for (const sx of [-1, 1]) {
    limb(c, [CX + sx * 7.4, cy - 2.6], [CX + sx * 0.8, cy + 0.2], 0.75, 0.6, Mat.Iron);
    for (const p of [[7.6, 2.4], [6.8, 6.4], [4.6, -6.4]] as const) { c.on(shell, F(CX + sx * p[0]), F(cy + p[1]), Mat.Steel, 5); c.on(shell, F(CX + sx * p[0]) + 1, F(cy + p[1]) + 1, Mat.Iron, 0); }
  }
  limb(c, [CX, cy - 7], [CX, cy + 4], 0.6, 0.75, Mat.Iron);
  // Olhos em fenda acesos, com o brilho vazando para o metal em volta.
  for (const sx of [-1, 1]) {
    const slit: Pt[] = [[CX + sx * 1.4, cy + 1.2], [CX + sx * 6.8, cy - 0.6], [CX + sx * 6.4, cy + 0.9], [CX + sx * 1.8, cy + 2.4]];
    const glow = poly(c, slit, Mat.Ember, CX + sx * 1.4, CX + sx * 6.8, (X) => (Math.abs(X - F(CX)) < F(3.4) ? 2 : 1));
    void glow;
    for (let X = F(CX + sx * 1.4); sx < 0 ? X >= F(CX + sx * 6.8) : X <= F(CX + sx * 6.8); X += sx) if (noise(X, 1) < 0.6) c.on(shell, X, F(cy + 2.8), Mat.Ember, 1);
  }
  // Grade da boca e presas.
  for (let k = -3; k <= 3; k++) {
    thread(c, [CX + k * 1.15, cy + 5], [CX + k * 1.15, cy + 7.6], Mat.Eye, 0, [shell]);
    thread(c, [CX + k * 1.15 + 0.5, cy + 5], [CX + k * 1.15 + 0.5, cy + 7.6], Mat.Iron, 4, [shell]);
  }
  for (const sx of [-1, 1]) {
    const f: Pt[] = [[CX + sx * 1.8, cy + 4.6], [CX + sx * 3.4, cy + 4.6], [CX + sx * 2.4, cy + 10.8]];
    poly(c, f, Mat.Horn, CX + sx * 1.8, CX + sx * 3.4);
  }
}

function demonBack(c: Canvas, cy: number) {
  for (const sx of [-1, 1]) horn(c, [[CX + sx * 8, cy - 3.2], [CX + sx * 12.4, cy - 5.4], [CX + sx * 15.2, cy - 9.8], [CX + sx * 14.6, cy - 14.8], [CX + sx * 12.4, cy - 17.6]], 2.4, -1);
  const shell = c.fill(ebox(CX, cy, 10.4, 11), inEllipse(CX, cy - 0.6, 9.8, 10.2), Mat.Iron, sphere(CX, cy - 0.4, 10.2, 10.8), hammered);
  // Espinhos descendo pela nuca e lâminas articuladas protegendo o pescoço.
  for (const [y, h] of [[-9.4, 3.6], [-5.6, 2.8], [-1.8, 2.2]] as const) poly(c, [[CX - 1, cy + y + 1], [CX + 1, cy + y + 1], [CX, cy + y - h]], Mat.Iron, CX - 1, CX + 1);
  for (const k of [0, 1, 2]) {
    const y = cy + 6 + k * 1.6;
    const lame = c.fill([CX - 9, y, CX + 9, y + 2], (x, yy) => yy + 0.5 >= y && yy + 0.5 < y + 1.8 && Math.abs(x + 0.5 - CX) < 8.4 - k * 0.8, Mat.Iron, (x) => lit((x + 0.5 - CX) / 9, -0.6, 0.6));
    void lame;
  }
  void shell;
}

function demonSide(c: Canvas, cx: number, cy: number) {
  // Chifre de lá (mais escuro) atrás, casco, viseira saindo para a frente, chifre de cá por cima.
  horn(c, [[cx + 2.4, cy - 5.6], [cx + 6.2, cy - 9.4], [cx + 7.4, cy - 14.4], [cx + 5.6, cy - 18.2]], 2, -1);
  const shell = c.fill(ebox(cx + 0.6, cy - 0.6, 9.6, 10.4), inEllipse(cx + 0.6, cy - 0.6, 9.4, 10.2), Mat.Iron, sphere(cx + 0.6, cy - 0.6, 9.6, 10.4), hammered);
  const visor: Pt[] = [[cx - 8.6, cy - 2.4], [cx - 10.6, cy + 2.6], [cx - 9.6, cy + 7.6], [cx - 6.6, cy + 9.8], [cx - 1.6, cy + 9.6], [cx - 1.6, cy - 2.6]];
  const v = poly(c, visor, Mat.Iron, cx - 10.6, cx - 1.6, hammered);
  for (const k of [-2.4, 0, 2.4]) poly(c, [[cx + k * 0.8 + 0.6, cy - 9.8], [cx + k * 0.8 + 2.6, cy - 9.4], [cx + k * 1.2 + 2.4, cy - 13.2 + Math.abs(k) * 0.4]], Mat.Iron, cx, cx + 4);
  limb(c, [cx - 9.2, cy - 2.6], [cx - 3.4, cy - 1.2], 0.75, 0.6, Mat.Iron);
  poly(c, [[cx - 9.4, cy + 0.2], [cx - 5, cy - 0.4], [cx - 5.2, cy + 1.2], [cx - 9.2, cy + 1.6]], Mat.Ember, cx - 9.4, cx - 5, () => 2);
  for (let k = 0; k < 4; k++) thread(c, [cx - 8.8 + k * 1.2, cy + 5], [cx - 8.6 + k * 1.2, cy + 7.6], Mat.Eye, 0, [v]);
  poly(c, [[cx - 9.6, cy + 4.6], [cx - 8, cy + 4.6], [cx - 9, cy + 10.6]], Mat.Horn, cx - 9.6, cx - 8);
  for (const p of [[3.6, 2], [5.6, -4], [-3.6, 6]] as const) c.on([shell, v], F(cx + p[0]), F(cy + p[1]), Mat.Steel, 5);
  horn(c, [[cx + 0.4, cy - 4.4], [cx + 4.6, cy - 8.6], [cx + 5.6, cy - 14], [cx + 3.6, cy - 18.6]], 2.4);
}

function helmetFront(c: Canvas, kit: Kit, cy: number, top: number) {
  if (kit.helmet === "wolf") wolfFront(c, cy, top);
  if (kit.helmet === "demon") demonFront(c, cy);
}

/**
 * Lâmina do dragão (espada grande): lâmina larga com dentes de dragão perto da guarda e runas em brasa no sulco,
 * guarda em asas de dragão com uma gema no meio, cabo longo de duas mãos e pomo em garra.
 */
function greatsword(c: Canvas, at: Pt, tip: Pt) {
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const gx = -uy, gy = ux;
  const guard: Pt = [at[0] + ux * 3, at[1] + uy * 3];
  const bl = Math.hypot(tip[0] - guard[0], tip[1] - guard[1]);
  const width = (t: number) => (t > 0.88 ? 3.3 * (1 - t) / 0.12 + 0.1 : 3.3 - t * 0.9);
  const local = (x: number, y: number) => { const s = seg(x + 0.5, y + 0.5, guard, tip); return { s, side: s.sx * gx + s.sy * gy }; };
  // Dentes de dragão nas duas bordas, do primeiro terço da lâmina.
  const teeth = (t: number) => { if (t > 0.3) return 0; const f = (t * bl / 2) % 1; return f < 0.6 ? f * 1.8 : 0; };
  c.fill([Math.min(guard[0], tip[0]) - 5, Math.min(guard[1], tip[1]) - 5, Math.max(guard[0], tip[0]) + 5, Math.max(guard[1], tip[1]) + 5],
    (x, y) => { const { s } = local(x, y); return s.d <= width(s.t) + teeth(s.t); }, Mat.Steel, (x, y) => {
      const { s, side } = local(x, y);
      const u = side / width(s.t);
      if (Math.abs(u) > 1) return 0.5;
      if (Math.abs(u) > 0.74) return 0.95;
      return u < 0 ? 0.78 : 0.4;
    }, (X, Y) => {
      const { s, side } = local((X + 0.5) / K - 0.5, (Y + 0.5) / K - 0.5);
      if (Math.abs(side) > width(s.t)) return -1;
      if (Math.abs(side) < 0.55 && s.t > 0.04 && s.t < 0.76) return -3;
      return noise(X, Y) < 0.04 ? -1 : 0;
    });
  // Runas em brasa dentro do sulco.
  for (let t = 0.1; t < 0.72; t += 0.09) {
    const p: Pt = [guard[0] + (tip[0] - guard[0]) * t, guard[1] + (tip[1] - guard[1]) * t];
    const g = Math.floor(t * 31) % 3;
    const marks = [[[0, -1], [0, 0], [0, 1], [1, 0]], [[0, -1], [-1, 0], [1, 0], [0, 1]], [[-1, -1], [0, 0], [1, 1], [0, 1]]][g];
    for (const [mx2, my] of marks) c.px(F(p[0]) + mx2, F(p[1]) + my, Mat.Ember, my < 0 ? 5 : 4);
  }
  // Guarda em asas: osso (chifre) com membrana de ferro negro, abrindo para cima.
  for (const sx of [-1, 1]) {
    const w = (a: number, b: number): Pt => [guard[0] + gx * sx * a * 1.3 - ux * b * 1.3, guard[1] + gy * sx * a * 1.3 - uy * b * 1.3];
    const membrane: Pt[] = [w(0.6, -0.8), w(7.8, 4.6), w(6.6, 2.2), w(5.6, 2.8), w(4.4, 1.2), w(3.2, 1.6), w(1.8, 0)];
    poly(c, membrane, Mat.Iron, Math.min(...membrane.map((p) => p[0])), Math.max(...membrane.map((p) => p[0])), hammered);
    chain(c, [w(0.6, 0), w(4.4, 2.4), w(7.8, 4.6)], 0.6, Mat.Horn, undefined, 0.3);
    chain(c, [w(2.2, 0.4), w(5.6, 2.8)], 0.4, Mat.Horn);
  }
  ellipse(c, guard[0], guard[1], 2.2, 2.2, Mat.Iron);
  spotEye(c, guard, 1.3);
  // Cabo de duas mãos (couro vermelho trançado) e pomo em garra com outra gema.
  const pommel: Pt = [at[0] - ux * 6.4, at[1] - uy * 6.4];
  c.fill([Math.min(pommel[0], guard[0]) - 2, Math.min(pommel[1], guard[1]) - 2, Math.max(pommel[0], guard[0]) + 2, Math.max(pommel[1], guard[1]) + 2],
    (x, y) => seg(x + 0.5, y + 0.5, pommel, guard).d <= 1.15, Mat.Primary, (x, y) => {
      const s = seg(x + 0.5, y + 0.5, pommel, guard);
      return lit((s.sx * gx + s.sy * gy) / 1.15, 0, 0.8);
    }, (X, Y) => {
      const x = (X + 0.5) / K - 0.5, y = (Y + 0.5) / K - 0.5;
      const s = seg(x + 0.5, y + 0.5, pommel, guard);
      const p = (s.t * 6 + (s.sx * gx + s.sy * gy) * 0.5) % 1;
      return p < 0.2 ? -2 : p < 0.5 ? 1 : 0;
    });
  for (const sx of [-1, 1]) chain(c, [[pommel[0] + gx * sx * 0.8 + ux * 0.6, pommel[1] + gy * sx * 0.8 + uy * 0.6], [pommel[0] + gx * sx * 1.8 - ux * 0.8, pommel[1] + gy * sx * 1.8 - uy * 0.8], [pommel[0] + gx * sx * 0.9 - ux * 2.2, pommel[1] + gy * sx * 0.9 - uy * 2.2]], 0.5, Mat.Iron, undefined, 0.25);
  spotEye(c, [pommel[0] - ux * 0.8, pommel[1] - uy * 0.8], 1.1);
}

/** Gema de brasa redonda, com pupila de réptil e brilho. */
function spotEye(c: Canvas, at: Pt, r: number) {
  const g = ellipse(c, at[0], at[1], r, r, Mat.Ember);
  c.on(g, F(at[0]), F(at[1]), Mat.Eye, 0); c.on(g, F(at[0]), F(at[1]) + 1, Mat.Eye, 0);
  c.on(g, F(at[0] - r * 0.5), F(at[1] - r * 0.5), Mat.Ember, 5);
}

/** Pixels de cada quadro, calculados uma vez (a galeria pede o mesmo quadro várias vezes). */
const cache = new Map<string, Uint8ClampedArray>();

/**
 * Quadro 192×192 do protótipo, virado para a esquerda no lado. Caminhada: passo, passagem, outro passo,
 * passagem. `look` troca as cores das zonas (cosmético) sem mudar o desenho.
 */
export function protoFrame(dir: ProtoDir, frame: number, cls: ProtoClass = "knight", look?: Partial<ProtoLook>, gear: ProtoGear = {}): HTMLCanvasElement {
  const kit: Kit = { ...KITS[cls], ...(gear.helmet ? { helmet: gear.helmet } : {}), ...(gear.weapon ? { weapon: gear.weapon, quiver: false } : {}) };
  const colors = { ...kit.look, ...look };
  const key = `${cls}${dir}${frame}${JSON.stringify(colors)}${JSON.stringify(gear)}`;
  let data = cache.get(key);
  if (!data) {
    const c = new Canvas();
    if (dir === "side") side(c, kit, frame);
    else front(c, kit, frame, dir === "up");
    data = c.render(colors);
    cache.set(key, data);
  }
  const { canvas, ctx } = makeCanvas(S, S);
  const image = ctx.createImageData(S, S);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
