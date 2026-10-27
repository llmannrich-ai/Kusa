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
export const K = 2;
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
  /** Contraste da rampa da pele (padrão 0,75, macio; os monstros sombrios pedem mais). */
  skinContrast?: number;
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
  weapon: "none" | "sword" | "bow" | "staff" | "branch" | ProtoWeapon;
  quiver?: boolean;
  /** Itens vestidos por cima do kit (protótipo dos itens). */
  helmet?: ProtoHelmet;
  armor?: ProtoArmor;
  legs?: ProtoLegs;
  boots?: ProtoBoots;
  shield?: ProtoShield;
  /** Monstro humanoide (só de lado): a cabeça da espécie, o tamanho, a grossura dos membros e a cauda. */
  species?: Species;
  size?: number;
  thin?: number;
  tail?: boolean;
  /** Luz dura: expoente da curva de luz (> 1 afunda as sombras, padrão 1). */
  grim?: number;
  /** Corcunda: o tronco, os braços e a cabeça vão para a frente e para baixo (unidades). */
  hunch?: number;
  /** Garras escuras nas mãos. */
  claws?: boolean;
  /** Roupa em farrapos: barra rasgada e manchas de sangue e sujeira. */
  ragged?: boolean;
}

type Tier = 1 | 2 | 3 | 4 | 5;
type WeaponFamily = "sword" | "axe" | "bow" | "xbow" | "wand" | "staff";
export type ProtoWeapon = `${WeaponFamily}-${Tier}` | `${WeaponFamily}-${Tier}-magic`;
export type ProtoHelmet = `war-${Tier}` | `war-${Tier}-magic` | `arc-${Tier}` | `arc-${Tier}-magic` | "wolf" | "demon";
export type ProtoArmor = `armor-${Tier}` | `armor-${Tier}-magic` | `robe-${Tier}` | `robe-${Tier}-magic`;
export type ProtoLegs = `pants-${Tier}` | `pants-${Tier}-magic` | `greave-${Tier}` | `greave-${Tier}-magic`;
export type ProtoBoots = `boots-${Tier}` | `boots-${Tier}-magic`;
export type ProtoShield = `shield-${Tier}` | `shield-${Tier}-magic`;
export const PROTO_SWORDS: ProtoWeapon[] = ["sword-1", "sword-2", "sword-3", "sword-4", "sword-5"];
export const PROTO_WAR_HELMETS: ProtoHelmet[] = ["war-1", "war-2", "war-3", "war-4", "war-5"];
export const PROTO_WAR_ARMORS: ProtoArmor[] = ["armor-1", "armor-2", "armor-3", "armor-4", "armor-5"];
export const PROTO_MAGIC_SWORDS: ProtoWeapon[] = ["sword-1-magic", "sword-2-magic", "sword-3-magic", "sword-4-magic", "sword-5-magic"];
export const PROTO_MAGIC_HELMETS: ProtoHelmet[] = ["war-1-magic", "war-2-magic", "war-3-magic", "war-4-magic", "war-5-magic"];
export const PROTO_MAGIC_ARMORS: ProtoArmor[] = ["armor-1-magic", "armor-2-magic", "armor-3-magic", "armor-4-magic", "armor-5-magic"];
export const PROTO_AXES: ProtoWeapon[] = ["axe-1", "axe-2", "axe-3", "axe-4", "axe-5"];
export const PROTO_MAGIC_AXES: ProtoWeapon[] = ["axe-1-magic", "axe-2-magic", "axe-3-magic", "axe-4-magic", "axe-5-magic"];
export const PROTO_BOWS: ProtoWeapon[] = ["bow-1", "bow-2", "bow-3", "bow-4", "bow-5"];
export const PROTO_MAGIC_BOWS: ProtoWeapon[] = ["bow-1-magic", "bow-2-magic", "bow-3-magic", "bow-4-magic", "bow-5-magic"];
export const PROTO_XBOWS: ProtoWeapon[] = ["xbow-1", "xbow-2", "xbow-3", "xbow-4", "xbow-5"];
export const PROTO_MAGIC_XBOWS: ProtoWeapon[] = ["xbow-1-magic", "xbow-2-magic", "xbow-3-magic", "xbow-4-magic", "xbow-5-magic"];
export const PROTO_WANDS: ProtoWeapon[] = ["wand-1", "wand-2", "wand-3", "wand-4", "wand-5"];
export const PROTO_MAGIC_WANDS: ProtoWeapon[] = ["wand-1-magic", "wand-2-magic", "wand-3-magic", "wand-4-magic", "wand-5-magic"];
export const PROTO_STAFFS: ProtoWeapon[] = ["staff-1", "staff-2", "staff-3", "staff-4", "staff-5"];
export const PROTO_MAGIC_STAFFS: ProtoWeapon[] = ["staff-1-magic", "staff-2-magic", "staff-3-magic", "staff-4-magic", "staff-5-magic"];
export const PROTO_ARC_HATS: ProtoHelmet[] = ["arc-1", "arc-2", "arc-3", "arc-4", "arc-5"];
export const PROTO_MAGIC_ARC_HATS: ProtoHelmet[] = ["arc-1-magic", "arc-2-magic", "arc-3-magic", "arc-4-magic", "arc-5-magic"];
export const PROTO_ROBES: ProtoArmor[] = ["robe-1", "robe-2", "robe-3", "robe-4", "robe-5"];
export const PROTO_MAGIC_ROBES: ProtoArmor[] = ["robe-1-magic", "robe-2-magic", "robe-3-magic", "robe-4-magic", "robe-5-magic"];
export const PROTO_PANTS: ProtoLegs[] = ["pants-1", "pants-2", "pants-3", "pants-4", "pants-5"];
export const PROTO_MAGIC_PANTS: ProtoLegs[] = ["pants-1-magic", "pants-2-magic", "pants-3-magic", "pants-4-magic", "pants-5-magic"];
export const PROTO_GREAVES: ProtoLegs[] = ["greave-1", "greave-2", "greave-3", "greave-4", "greave-5"];
export const PROTO_MAGIC_GREAVES: ProtoLegs[] = ["greave-1-magic", "greave-2-magic", "greave-3-magic", "greave-4-magic", "greave-5-magic"];
export const PROTO_BOOTS: ProtoBoots[] = ["boots-1", "boots-2", "boots-3", "boots-4", "boots-5"];
export const PROTO_MAGIC_BOOTS: ProtoBoots[] = ["boots-1-magic", "boots-2-magic", "boots-3-magic", "boots-4-magic", "boots-5-magic"];
export const PROTO_SHIELDS: ProtoShield[] = ["shield-1", "shield-2", "shield-3", "shield-4", "shield-5"];
export const PROTO_MAGIC_SHIELDS: ProtoShield[] = ["shield-1-magic", "shield-2-magic", "shield-3-magic", "shield-4-magic", "shield-5-magic"];

/** Itens vestidos sobre o kit: trocam o capacete, a armadura, a calça, as botas, a arma e o escudo da classe. */
export interface ProtoGear {
  helmet?: ProtoHelmet;
  armor?: ProtoArmor;
  legs?: ProtoLegs;
  boots?: ProtoBoots;
  shield?: ProtoShield;
  weapon?: ProtoWeapon;
}

const tierOf = (id: string) => Number(/(\d)(?:-magic)?$/.exec(id)?.[1] ?? 0);

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

export enum Mat { Skin, Hair, Primary, Secondary, Detail, Trim, Steel, Eye, White, Lip, Iris, Linen, Wood, Leaf, Gem, Fur, FurLight, Ember, Iron, Horn, Amber, Leather, Bronze, Mithral, Dragon, Crest, Patina, Sapphire, Mane, RedDragon, Stone, Wool, Felt, Night, Indigo, Silk, Arcane, Violet, Bone, Moss, Clay, Blood, Slate, Soot, GreenDragon, DragonBelly, Membrane, Venom }

const OUTLINE: Rgb = rgb("#1a1210");

function ramps(look: ProtoLook): Rgb[][] {
  const r = (base: string, contrast = 1, shift = 6, shine = false) => ramp(base, { contrast, shift, shine }).map(rgb);
  return [
    r(look.skin, look.skinContrast ?? 0.75, 4),
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
    r("#7a5232", 1, 6), // couro dos itens
    r("#d09a48", 1.25, 8, true), // bronze
    r("#a8c0dc", 1.35, 6, true), // mithral
    r("#9e2a22", 1.1, 8), // escama de dragão
    r("#b42a24", 1, 8), // crina vermelha
    r("#4a9a86", 0.9, 4), // azinhavre
    r("#3a72d0", 1.3, 8, true), // safira
    r("#c48a3c", 1.1, 8), // juba do leão
    r("#d2382a", 1.1, 10, true), // escama de dragão vermelho
    r("#8a8478", 1.05, 4), // pedra
    r("#8c7e66", 0.9, 5), // lã
    r("#5e5a3a", 1, 6), // feltro
    r("#262c5e", 1.2, 8), // azul-noite
    r("#3c4c8c", 1.1, 8), // anil
    r("#b0282e", 1.1, 10, true), // seda vermelha
    r("#5ad2e6", 1.2, 10, true), // brilho arcano (runas acesas)
    r("#5a2e8a", 1.15, 10), // violeta
    r("#d6caa8", 0.85, 5), // osso
    r("#4f6b34", 1, 8), // musgo
    r("#a5603a", 1.05, 7), // barro
    r("#6e1610", 1.1, 8), // sangue
    r("#4c4237", 0.9, 6), // laje do chão
    r("#2c2622", 0.8, 3), // fuligem
    r("#4f8a34", 1.15, 10), // escama de dragão verde
    r("#c9bc7a", 0.95, 7), // placas da barriga do dragão
    r("#4e5c2c", 1.05, 8), // membrana da asa
    r("#9ad23a", 1.2, 12, true), // gás venenoso
  ];
}

// --- Pintura ------------------------------------------------------------------------

const S = PROTO_SIZE;
/** Luz de cima à esquerda, um pouco de frente. */
const L = (() => { const v = [-0.55, -0.62, 0.56]; const n = Math.hypot(...v); return v.map((c) => c / n); })();
const BAYER = [0, 0.5, 0.75, 0.25];

/** Teste e luz recebem o ponto em unidades de projeto e o pixel final (X, Y). */
export type Test = (x: number, y: number, X: number, Y: number) => boolean;
export type Shade = (x: number, y: number) => number;
/** Desvio de tom por pixel final (texturas). */
export type Offset = (X: number, Y: number) => number;
export type Box = readonly [number, number, number, number];

/** Escala local: em volta de um ponto (`ox`, `oy`) ou afim (`p × k + t`), com a de fora em `parent`. */
interface Xf { k: number; ox?: number; oy?: number; tx: number; ty: number; parent: Xf | null }

export class Canvas {
  readonly n: number;
  mat: Int8Array;
  shade: Float32Array;
  off: Int8Array;
  fixed: Int8Array;
  order: Int16Array;
  part: Int16Array;

  /** Papel de `w` × `h` pixels finais (padrão: o quadro do herói). */
  constructor(readonly w = S, readonly h = S) {
    const n = (this.n = w * h);
    this.mat = new Int8Array(n).fill(-1);
    this.shade = new Float32Array(n);
    this.off = new Int8Array(n);
    this.fixed = new Int8Array(n).fill(-1);
    this.order = new Int16Array(n);
    this.part = new Int16Array(n);
  }
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
  private xf: Xf | null = null;

  /** Escala local: o que `draw` pintar cresce `k` vezes em volta de `o` (a textura continua fina). */
  scaled<T>(o: Pt, k: number, draw: () => T): T {
    const outer = this.xf;
    this.xf = outer
      ? { k: outer.k * k, tx: outer.tx + o[0] * (1 - k) * outer.k, ty: outer.ty + o[1] * (1 - k) * outer.k, parent: outer }
      : { k, ox: o[0], oy: o[1], tx: o[0] * (1 - k), ty: o[1] * (1 - k), parent: null };
    try { return draw(); } finally { this.xf = outer; }
  }

  /** Enquadra: o que `draw` pintar vai para `p × k + t` (em unidades), por cima da escala que já houver (ícones). */
  placed<T>(k: number, t: Pt, draw: () => T): T {
    const outer = this.xf;
    this.xf = outer
      ? { k: outer.k * k, tx: outer.tx + t[0] * outer.k, ty: outer.ty + t[1] * outer.k, parent: outer }
      : { k, tx: t[0], ty: t[1], parent: null };
    try { return draw(); } finally { this.xf = outer; }
  }

  /** Volta à escala de fora dentro de um `scaled` (a haste do cajado não cresce com a cabeça). */
  unscaled<T>(draw: () => T): T {
    const outer = this.xf;
    this.xf = outer?.parent ?? null;
    try { return draw(); } finally { this.xf = outer; }
  }

  get scale() { return this.xf?.k ?? 1; }

  /** Unidade levada pela escala local (a forma simples, em volta de um ponto, segue a conta de sempre). */
  private fwd(u: number, axis: 0 | 1) {
    const f = this.xf!;
    const o = axis ? f.oy : f.ox;
    return o !== undefined ? o + (u - o) * f.k : u * f.k + (axis ? f.ty : f.tx);
  }

  /** Pixel final levado pela escala local. */
  private tx(X: number, Y: number): [number, number] {
    if (!this.xf) return [X, Y];
    return [this.fwd(X / K, 0) * K, this.fwd(Y / K, 1) * K];
  }

  fill(box: Box, test: Test, mat: Mat, shade: Shade, offset?: Offset) {
    const id = this.group || ++this.seq;
    const f = this.xf;
    const [x0, y0, x1, y1] = f ? [this.fwd(box[0], 0) - 1, this.fwd(box[1], 1) - 1, this.fwd(box[2], 0) + 1, this.fwd(box[3], 1) + 1] : box;
    for (let Y = Math.max(0, Math.floor(y0 * K)); Y <= Math.min(this.h - 1, Math.ceil((y1 + 1) * K)); Y++) {
      for (let X = Math.max(0, Math.floor(x0 * K)); X <= Math.min(this.w - 1, Math.ceil((x1 + 1) * K)); X++) {
        let x = (X + 0.5) / K - 0.5, y = (Y + 0.5) / K - 0.5;
        if (f) {
          if (f.ox !== undefined && f.oy !== undefined) { x = f.ox + (x + 0.5 - f.ox) / f.k - 0.5; y = f.oy + (y + 0.5 - f.oy) / f.k - 0.5; }
          else { x = (x + 0.5 - f.tx) / f.k - 0.5; y = (y + 0.5 - f.ty) / f.k - 0.5; }
        }
        if (!test(x, y, X, Y)) continue;
        const i = Y * this.w + X;
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
    [X, Y] = this.tx(X, Y);
    this.rawPx(Math.round(X), Math.round(Y), mat, tone);
  }

  private rawPx(X: number, Y: number, mat: Mat, tone: number) {
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    const i = Y * this.w + X;
    if (this.mat[i] < 0) this.order[i] = this.part[i] = ++this.seq;
    this.mat[i] = mat;
    this.fixed[i] = tone;
  }

  /** Pixel fixo só onde já estão pintadas as peças `ids` (cinto e barra não saem do tronco). */
  on(ids: number | readonly number[], X: number, Y: number, mat: Mat, tone: number): void {
    [X, Y] = this.tx(X, Y);
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h || this.mat[Y * this.w + X] < 0) return;
    const p = this.part[Y * this.w + X];
    if (typeof ids === "number" ? p !== ids : !ids.includes(p)) return;
    this.rawPx(X, Y, mat, tone);
  }

  /** Material já pintado no ponto (em unidades, levado pela escala local); −1 se vazio. */
  matAt(x: number, y: number): number {
    let [X, Y] = this.tx(F(x), F(y));
    X = Math.round(X); Y = Math.round(Y);
    return X < 0 || Y < 0 || X >= this.w || Y >= this.h ? -1 : this.mat[Y * this.w + X];
  }

  /** `is` com o pixel levado pela escala local (varreduras de coluna: sola, fita do chapéu, sombra da aba). */
  isAt(X: number, Y: number, ids: readonly number[]) {
    [X, Y] = this.tx(X, Y);
    return this.is(Math.round(X), Math.round(Y), ids);
  }

  /** Muda o tom de quem já está pintado, sem mudar a peça (dobra, costura). */
  nudge(X: number, Y: number, delta: number) {
    [X, Y] = this.tx(X, Y);
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    const i = Y * this.w + X;
    if (this.mat[i] >= 0) this.off[i] += delta;
  }

  /** Apaga um pixel (furo de lâmina, recorte). */
  clear(X: number, Y: number) {
    [X, Y] = this.tx(X, Y);
    X = Math.round(X); Y = Math.round(Y);
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return;
    this.mat[Y * this.w + X] = -1;
  }

  /** Troca o material das peças `ids` (mesma forma, outro metal). */
  recolor(ids: readonly number[], to: Mat) {
    for (let i = 0; i < this.n; i++) if (this.mat[i] >= 0 && ids.includes(this.part[i]) && this.fixed[i] < 0) this.mat[i] = to;
  }

  /** O pixel é da peça (ou de uma das peças). */
  is(X: number, Y: number, ids: readonly number[]) {
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return false;
    const i = Y * this.w + X;
    return this.mat[i] >= 0 && ids.includes(this.part[i]);
  }

  /** Pixels RGBA; `outline` falso deixa a peça sem o contorno de fora (manchas, rachaduras e teias no chão). */
  render(look: ProtoLook, outline = true, grim = 1): Uint8ClampedArray {
    const tones = ramps(look);
    const out = new Uint8ClampedArray(this.n * 4);
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : y * this.w + x);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        const m = this.mat[i];
        if (m < 0) {
          if (!outline) continue;
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
          // Luz dura (`grim`): a curva afunda o lado da sombra, que chega ao tom 0 no fundo.
          const v = (grim === 1 ? this.shade[i] : this.shade[i] ** grim) * 4 + (BAYER[(y & 1) * 2 + (x & 1)] - 0.5) * 0.55;
          tone = Math.max(grim > 1 && this.shade[i] < 0.3 ? 0 : 1, Math.min(4, Math.floor(v) + 1)) + this.off[i];
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

export type Pt = readonly [number, number];

const lambert = (nx: number, ny: number, nz: number) => Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
export const lit = (nx: number, ny: number, nz: number) => 0.12 + 0.88 * lambert(nx, ny, nz);
export const sphere = (cx: number, cy: number, rx: number, ry: number): Shade => (x, y) => {
  const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
  return lit(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
};
export const inEllipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
  ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
export const ebox = (cx: number, cy: number, rx: number, ry: number): Box => [cx - rx, cy - ry, cx + rx, cy + ry];

/** Esfera achatada. */
export function ellipse(c: Canvas, cx: number, cy: number, rx: number, ry: number, mat: Mat, offset?: Offset) {
  return c.fill(ebox(cx, cy, rx, ry), inEllipse(cx, cy, rx, ry), mat, sphere(cx, cy, rx, ry), offset);
}

/** Distância do ponto ao segmento e a posição ao longo dele (0–1). */
export function seg(px: number, py: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  const qx = a[0] + dx * t, qy = a[1] + dy * t;
  return { d: Math.hypot(px - qx, py - qy), t, sx: px - qx, sy: py - qy };
}

/** Membro (cápsula afinando de `ra` para `rb`) com volume de cilindro. */
export function limb(c: Canvas, a: Pt, b: Pt, ra: number, rb: number, mat: Mat, offset?: Offset) {
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
export function chain(c: Canvas, pts: readonly Pt[], r: number, mat: Mat, offset?: Offset, rEnd = r) {
  return c.together(() => {
    const ids: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const t0 = (i - 1) / (pts.length - 1), t1 = i / (pts.length - 1);
      ids.push(limb(c, pts[i - 1], pts[i], r + (rEnd - r) * t0, r + (rEnd - r) * t1, mat, offset));
    }
    return ids;
  });
}

export const inPoly = (pts: readonly Pt[]) => (x: number, y: number) => {
  let on = false;
  const px = x + 0.5, py = y + 0.5;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) on = !on;
  }
  return on;
};
export const pbox = (pts: readonly Pt[]): Box => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

/** Polígono (par-ímpar) com volume de cilindro em pé entre `x0` e `x1`; `cut` recorta (barra em zigue-zague). */
export function poly(c: Canvas, pts: readonly Pt[], mat: Mat, x0: number, x1: number, offset?: Offset, cut?: (x: number, y: number) => boolean) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const inside = inPoly(pts);
  return c.fill(pbox(pts), (x, y) => inside(x, y) && !(cut && cut(x, y)), mat, (x) => {
    const u = Math.max(-0.95, Math.min(0.95, (x + 0.5 - mid) / half));
    return lit(u, -0.25, Math.sqrt(1 - u * u));
  }, offset);
}

/** Linha de 1 px (em pixels finais) entre dois pontos em unidades. */
export function thread(c: Canvas, a: Pt, b: Pt, mat: Mat, tone: number | ((k: number) => number), clip?: readonly number[]) {
  const n = Math.max(1, Math.round(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) * K * c.scale));
  for (let k = 0; k <= n; k++) {
    const X = Math.round((a[0] + (b[0] - a[0]) * (k / n)) * K), Y = Math.round((a[1] + (b[1] - a[1]) * (k / n)) * K);
    const t = typeof tone === "number" ? tone : tone(k);
    if (t < 0) continue;
    if (clip) c.on(clip, X, Y, mat, t);
    else c.px(X, Y, mat, t);
  }
}

/** Ruído fixo por pixel (sem `Math.random`, o desenho é sempre igual). */
export const noise = (x: number, y: number) => {
  let h = Math.imul(Math.floor(x) * 374761393 + Math.floor(y) * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
};

/** Unidade de projeto (contínua) → pixel final. */
export const F = (u: number) => Math.round(u * K);

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
export const linen: Offset = (X, Y) => ((X + Y * 3) % 5 === 0 ? -1 : noise(X, Y) < 0.04 ? 1 : 0);

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
export const leather: Offset = (X, Y) => (noise(X, Y) < 0.07 ? -1 : noise(X + 31, Y) < 0.04 ? 1 : 0);

/** Madeira: veios compridos na direção do galho. */
export const grain: Offset = (X, Y) => (noise(X, Y >> 2) < 0.18 ? -1 : noise(X + 5, Y >> 3) < 0.06 ? 1 : 0);

const darker = (o: Offset | undefined, far: boolean): Offset | undefined =>
  far ? (X, Y) => -1 + (o ? o(X, Y) : 0) : o;

/** Faixas de linho da múmia: listras em diagonal com a fresta escura e uma mancha de resina aqui e ali. */
const bandage: Offset = (X, Y) => {
  const k = (((X + Y * 2) % 9) + 9) % 9;
  return k === 0 ? (noise(X >> 2, Y) < 0.3 ? -2 : -1) : k === 1 ? 1 : noise(X >> 1, Y >> 1) < 0.05 ? -1 : 0;
};
/** Textura da pele da espécie (a múmia é toda enfaixada). */
/** Pele do goblin: manchas doentias, poros e verrugas (claras em cima, com a sombra embaixo). */
const blotchy: Offset = (X, Y) => {
  const m = noise(X >> 3, Y >> 3) * 0.6 + noise(X >> 2, (Y >> 2) + 9) * 0.4;
  if (noise(X >> 1, Y >> 1) < 0.025) return 1;
  if (noise(X >> 1, (Y >> 1) - 1) < 0.025) return -1;
  return m < 0.3 ? -1 : noise(X, Y) < 0.05 ? -1 : 0;
};
const skinTex = (kit: Kit): Offset | undefined => (kit.species === "mummy" ? bandage : kit.species === "goblin" ? blotchy : undefined);

/** Barra rasgada em dentes desiguais (farrapos). */
const raggedCut = (bottom: number) => (x: number, y: number) => y + 0.5 > bottom - 3.4 + noise(Math.floor(x / 1.6), 3) * 3.6 + (noise(Math.floor(x / 4), 5) < 0.3 ? -2 : 0);

/** Manchas de sangue seco e de sujeira por cima da roupa. */
function stains(c: Canvas, ids: readonly number[], x0: number, x1: number, y0: number, y1: number) {
  for (let Y = F(y0); Y <= F(y1); Y++) for (let X = F(x0); X <= F(x1); X++) {
    const blood = noise(X >> 2, (Y >> 2) + 40) < 0.1 && noise(X, Y) < 0.75;
    const dirt = noise((X >> 2) + 17, Y >> 2) < 0.14;
    if (blood) c.on(ids, X, Y, Mat.Blood, noise(Y, X) < 0.5 ? 1 : 2);
    else if (dirt) c.nudge(X, Y, -1);
  }
}

// --- Pernas e pés -----------------------------------------------------------------------

/** Sola de 2 px embaixo de cada coluna das peças, com costura clara logo acima. */
function sole(c: Canvas, ids: readonly number[], x0: number, x1: number, mat: Mat, far: boolean, stitch = true) {
  for (let X = F(x0); X <= F(x1); X++) {
    for (let Y = c.h - 1; Y > 0; Y--) {
      if (!c.isAt(X, Y, ids)) continue;
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
    const th = kit.thin ?? 1;
    const id = limb(c, hip, knee, 4 * th, 3.4 * th, Mat.Skin, darker(skinTex(kit), far));
    limb(c, knee, ankle, 3.4 * th, 2.7 * th, Mat.Skin, darker(skinTex(kit), far));
    if (th < 1) ellipse(c, knee[0], knee[1], 1.8, 1.8, Mat.Skin, darker(undefined, far));
    if (bare) bareFoot(c, ankle, toe, far, front);
    return id;
  });
  const skinS = skinT;
  const kx = F(knee[0]), ky = F(knee[1]);
  if (kit.legs?.startsWith("greave-")) warLegs(c, kit.legs, hip, knee, ankle, far, front);
  else if (kit.legs) pantsArt(c, kit.legs, hip, knee, ankle, far, front);
  else if (kit.pants === "none" || kit.pants === "knee") {
    // Patela e músculo da panturrilha.
    c.on([skinT, skinS], kx - 2, ky - 1, Mat.Skin, far ? 3 : 4); c.on([skinT, skinS], kx - 1, ky - 2, Mat.Skin, far ? 3 : 4);
    c.on([skinT, skinS], kx + 1, ky + 2, Mat.Skin, 2); c.on([skinT, skinS], kx, ky + 3, Mat.Skin, 2);
  }
  if (!kit.legs && kit.pants !== "none") {
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
  if (kit.boots) { bootsArt(c, kit.boots, knee, ankle, toe, far, front); return; }
  switch (kit.feet) {
    case "bare": break;
    case "boots": boot(c, ankle, toe, far, front); break;
    case "tall": if (kit.legs?.startsWith("greave-")) boot(c, ankle, toe, far, front); else tallBoot(c, knee, ankle, toe, far); break;
    case "shoes": slipper(c, ankle, toe, far, front); break;
    case "wraps": if (kit.legs) bareFoot(c, ankle, toe, far, front); else wraps(c, knee, ankle, toe, far, front); break;
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

export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Braço do kit: pele, manga, acessórios do antebraço; `grip` desenha o que a mão segura antes dos dedos. */
function arm(c: Canvas, kit: Kit, shoulder: Pt, elbow: Pt, at: Pt, far: boolean, grip?: () => void) {
  // Braço nu: ombro (deltoide), bíceps e antebraço.
  const up = c.together(() => {
    const th = kit.thin ?? 1;
    const id = limb(c, shoulder, elbow, 3.5 * th, 3 * th, Mat.Skin, darker(skinTex(kit), far));
    limb(c, elbow, at, 3 * th, 2.6 * th, Mat.Skin, darker(skinTex(kit), far));
    if (th < 1) ellipse(c, elbow[0], elbow[1], 1.6, 1.6, Mat.Skin, darker(undefined, far));
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
  if (kit.armor) armorArm(c, kit.armor, shoulder, elbow, at, far);
  grip?.();
  hand(c, at, far);
  if (kit.claws) {
    // Unhas compridas e escuras, curvas para baixo, saindo dos nós dos dedos.
    const X = F(at[0]), Y = F(at[1]);
    for (const dx of [-3, -1, 1, 3]) for (let k = 0; k < 4; k++) c.px(X + dx - (k > 1 ? 1 : 0), Y + 5 + k, Mat.Horn, k === 0 ? 3 : k < 3 ? 1 : 0);
  }
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
function branch(c: Canvas, at: Pt, top: number, bottom: number, turn = 0) {
  const x = at[0];
  const pts: Pt[] = [];
  // Giro em volta da mão (golpe dos monstros): os pontos e as folhas giram juntos.
  const ca = Math.cos(turn), sa = Math.sin(turn);
  const r = (p: Pt): Pt => (turn ? [at[0] + (p[0] - at[0]) * ca - (p[1] - at[1]) * sa, at[1] + (p[0] - at[0]) * sa + (p[1] - at[1]) * ca] : p);
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    pts.push(r([x + Math.sin(t * 7.3) * 0.7 + (t - 0.5) * 0.8, bottom + (top - bottom) * t]));
  }
  chain(c, pts, 1.25, Mat.Wood, grain, 1);
  // Nós na madeira.
  for (const t of [0.3, 0.62]) { const p = pts[Math.round(t * 8)]; ellipse(c, p[0] + 0.6, p[1], 1, 0.7, Mat.Wood, () => -1); }
  // Forquilha com folhas.
  const tip = pts[pts.length - 1];
  const o = (dx: number, dy: number): Pt => (turn ? [tip[0] + dx * ca - dy * sa, tip[1] + dx * sa + dy * ca] : [tip[0] + dx, tip[1] + dy]);
  const fork: Pt[] = [[tip[0], tip[1]], o(-1.6, -2.6), o(-2.4, -4.6)];
  const fork2: Pt[] = [[tip[0], tip[1]], o(1.4, -2.2), o(2.8, -3.4)];
  chain(c, fork, 0.75, Mat.Wood, undefined, 0.4);
  chain(c, fork2, 0.7, Mat.Wood, undefined, 0.35);
  leaf(c, o(-3.4, -5.4), -2.2 + turn, 2.6, 1.3);
  leaf(c, o(-0.2, -4.6), -1.5 + turn, 2.2, 1.1);
  leaf(c, o(3.8, -3.8), -0.5 + turn, 2.4, 1.2);
  leaf(c, o(1.8, -1), 0.4 + turn, 2, 1);
  leaf(c, o(-2.2, -1), 2.7 + turn, 1.8, 0.9);
}

/** Folha: elipse girada com nervura central escura e luz de cima. */
export function leaf(c: Canvas, at: Pt, ang: number, len: number, wid: number, mat: Mat = Mat.Leaf) {
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
  }, mat, (x, y) => {
    const [u, v] = local(x, y);
    return lit(u * ca * 0.4 - v * sa * 0.8, u * sa * 0.4 + v * ca * 0.8, Math.sqrt(Math.max(0.05, 1 - u * u - v * v)));
  });
  thread(c, [at[0] - ca * len * 0.8, at[1] - sa * len * 0.8], [at[0] + ca * len * 0.8, at[1] + sa * len * 0.8], mat, 1, [id]);
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
function hemRunes(c: Canvas, ids: readonly number[], cx: number, half: number, y: number, band: Mat = Mat.Trim, ink?: Mat) {
  const H0 = F(y);
  for (let X = F(cx - half - 3); X <= F(cx + half + 3); X++) {
    c.on(ids, X, H0, band, 4);
    for (let k = 1; k <= 5; k++) c.on(ids, X, H0 + k, band, X < F(cx) ? 3 : 2);
    c.on(ids, X, H0 + 6, band, 1);
    // Runas: a cada 9 px, um sinal de traços escuros.
    const r = ((X - F(cx)) % 9 + 9) % 9;
    const g = Math.floor((X - F(cx)) / 9) & 3;
    const glyph = [[1, 2, 3, 4], [2, 4], [1, 3, 5], [1, 5]][g];
    if (r === 2) for (const k of [1, 2, 3, 4, 5]) c.on(ids, X, H0 + k, glyph.includes(k) ? (ink ?? band) : band, glyph.includes(k) ? (ink ? 5 : 1) : X < F(cx) ? 3 : 2);
    if (r === 3 && g % 2 === 0) c.on(ids, X, H0 + 3, ink ?? band, ink ? 4 : 1);
    if (r === 4) c.on(ids, X, H0 + (g + 1), ink ?? band, ink ? 4 : 1);
  }
}

/** Corda trançada (druida): dois fios que se cruzam, nó e pontas penduradas com franja. */
function rope(c: Canvas, ids: readonly number[], cx: number, half: number, y: number, knot: boolean, mat: Mat = Mat.Linen) {
  const Y0 = F(y);
  for (let X = F(cx - half - 1); X <= F(cx + half + 1); X++) {
    for (let k = 0; k < 4; k++) {
      const twist = ((X + k * 2) % 6 + 6) % 6;
      c.on(ids, X, Y0 + k, mat, twist < 2 ? 4 : twist < 4 ? 2 : k === 3 ? 0 : 3);
    }
  }
  if (!knot) return;
  const kx = cx - 3.5, ky = y + 1;
  const k = ellipse(c, kx, ky, 1.5, 1.3, mat);
  c.on(k, F(kx), F(ky), mat, 1);
  for (const [dx, len] of [[-0.8, 5.5], [0.8, 4.4]] as const) {
    const end = limb(c, [kx + dx, ky + 0.8], [kx + dx * 1.6, ky + len], 0.55, 0.5, mat);
    for (let j = 0; j < 3; j++) c.px(F(kx + dx * 1.6) - 1 + j, F(ky + len) + 1 + (j % 2), mat, 2);
    void end;
  }
}

/** Faixa de pano (feiticeiro): nó do lado e duas pontas compridas. */
function sash(c: Canvas, ids: readonly number[], cx: number, half: number, y: number, knot: boolean, mat: Mat = Mat.Secondary, fringe: Mat = Mat.Trim) {
  for (let X = F(cx - half - 1); X <= F(cx + half + 1); X++) {
    for (let k = 0; k < 5; k++) c.on(ids, X, F(y) + k, mat, k === 0 ? 4 : k === 4 ? 0 : ((X + k) % 7 === 0 ? 1 : X < F(cx) ? 3 : 2));
  }
  if (!knot) return;
  const kx = cx - half + 2.6, ky = y + 1.2;
  ellipse(c, kx, ky, 1.8, 1.5, mat);
  limb(c, [kx - 0.6, ky + 1], [kx - 1.6, ky + 8.5], 1.2, 1.4, mat, (X, Y) => (Y % 5 === 0 ? -1 : 0));
  const e2 = limb(c, [kx + 0.6, ky + 1], [kx + 0.9, ky + 7], 1.1, 1.3, mat, (X, Y) => (Y % 5 === 0 ? -1 : 0));
  // Franja dourada nas pontas.
  for (let j = -2; j <= 2; j++) { c.px(F(kx - 1.6) + j, F(ky + 9.6), fringe, j % 2 ? 2 : 4); c.px(F(kx + 0.9) + j, F(ky + 8.1), fringe, j % 2 ? 2 : 4); }
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
  if (kit.armor) return armorTorso(c, kit.armor, top, back ? "up" : "down", sway);
  switch (kit.top) {
    case "none": {
      const id = kit.species === "skeleton" ? ribcageFront(c, top, back) : bareTorso(c, top, CX, 12, false);
      loincloth(c, top, CX, 9.6, false, back);
      return [id];
    }
    case "gambeson": return [poly(c, TORSO_FRONT(top, top + 21, 1), Mat.Primary, CX - 13, CX + 13, quilt(CX))];
    case "tunic": {
      const id = poly(c, TORSO_FRONT(top, top + 21, 1.5), Mat.Primary, CX - 13, CX + 13, linen, kit.ragged ? raggedCut(top + 21) : undefined);
      if (kit.ragged) stains(c, [id], CX - 13, CX + 13, top, top + 21);
      return [id];
    }
    case "leaf": return [poly(c, TORSO_FRONT(top, top + 27.5, 2.5), Mat.Primary, CX - 13, CX + 13, leafScales, leafCut(top + 27.5))];
    case "robe": {
      const pts: Pt[] = [[CX - 12.5, top + 2], [CX - 9, top], [CX + 9, top], [CX + 12.5, top + 2], [CX + 11, top + 13], [CX + 14.5 + sway, FEET - 3.5], [CX - 14.5 + sway, FEET - 3.5], [CX - 11, top + 13]];
      return [poly(c, pts, Mat.Primary, CX - 13, CX + 13, velvet(CX))];
    }
  }
}

function torsoSide(c: Canvas, kit: Kit, top: number, sway: number): number[] {
  if (kit.armor) return armorTorso(c, kit.armor, top, "side", sway);
  switch (kit.top) {
    case "none": {
      const id = kit.species === "skeleton" ? ribcageSide(c, top) : bareTorso(c, top, CX, 9, true);
      // Múmia: o tronco também é enfaixado.
      if (kit.species === "mummy") for (let Y = F(top); Y <= F(top + 18); Y++) for (let X = F(CX - 10); X <= F(CX + 10); X++) if (c.is(X, Y, [id])) c.nudge(X, Y, bandage(X, Y));
      loincloth(c, top, CX, 8, true, false);
      return [id];
    }
    case "gambeson": return [poly(c, TORSO_SIDE(top, top + 21, 1), Mat.Primary, CX - 10, CX + 10, quilt(CX))];
    case "tunic": {
      const id = poly(c, TORSO_SIDE(top, top + 21, 1.5), Mat.Primary, CX - 10, CX + 10, linen, kit.ragged ? raggedCut(top + 21) : undefined);
      if (kit.ragged) stains(c, [id], CX - 10, CX + 10, top, top + 21);
      return [id];
    }
    case "leaf": return [poly(c, TORSO_SIDE(top, top + 27.5, 2.5, sway * 0.5), Mat.Primary, CX - 10, CX + 10, leafScales, leafCut(top + 27.5))];
    case "robe": return [poly(c, TORSO_SIDE(top, FEET - 3.5, 3.5, sway), Mat.Primary, CX - 10, CX + 10, velvet(CX))];
  }
}

/** Cintura, barra e gola do kit sobre o tronco, de frente ou de costas. */
function dressFront(c: Canvas, kit: Kit, ids: number[], top: number, back: boolean) {
  if (kit.armor) {
    if (keepsBelt(kit.armor)) belt(c, ids, CX, 10.5, top, !back, kit.waist === "strap" && !back);
    return;
  }
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
  if (kit.armor) {
    if (keepsBelt(kit.armor)) belt(c, ids, CX, 8.5, top, false);
    return;
  }
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
/** Comprimento da espada de cada nível, da mão à ponta (o 5 é o montante de duas mãos, em pé). */
const SWORD_LEN = [0, 15, 18, 21, 22, 0];
const SWING = [1, 0, -1, 0];
const BOB = [0, -1, 0, -1];

/** A arma do kit na mão `at` (`out` = lado de fora, para onde a lâmina e a barriga do arco apontam). */
function weaponFront(c: Canvas, kit: Kit, at: Pt, out: number, top: number): (() => void) | undefined {
  switch (kit.weapon) {
    case "bow": return () => bow(c, at, out);
    case "staff": return () => staff(c, at, top - 19, FEET - 0.5);
    case "branch": return () => branch(c, at, top + 2, FEET - 1);
    default:
      if (kit.weapon.startsWith("wand-")) { const id = kit.weapon; return () => c.scaled(at, 1.5, () => wandArt(c, id, at, [at[0] + out * 4.2, at[1] - 7.4 - tierOf(id) * 0.4])); }
      if (kit.weapon.startsWith("staff-")) { const id = kit.weapon; return () => staffArt(c, id, at, top - 19, FEET - 0.5); }
      if (kit.weapon.startsWith("bow-")) { const id = kit.weapon; return () => bowArt(c, id, at, out); }
      if (kit.weapon.startsWith("xbow-")) { const id = kit.weapon; return () => crossbowArt(c, id, at, [0, 1], false); }
      if (kit.weapon.startsWith("axe-")) {
        const id = kit.weapon;
        return axeTwoHanded(id)
          ? () => axeArt(c, id, [at[0], FEET - 0.6], [at[0] + out * 1.6, top - 20], out)
          : () => axeArt(c, id, [at[0], at[1] + 3], [at[0] + out * 1.2, at[1] - AXE_LEN[tierOf(id)]], out);
      }
      if (kit.weapon.startsWith("sword-") && kit.weapon !== "sword-4-magic") {
        const t = tierOf(kit.weapon), id = kit.weapon;
        return () => swordById(c, id, at, t === 5 ? [at[0] + out * 3, top - 30] : [at[0] + out * 4, at[1] + SWORD_LEN[t]]);
      }
      return undefined;
  }
}

function front(c: Canvas, kit: Kit, frame: number, back: boolean, mp?: { s: number; b: number }) {
  const s = mp ? mp.s : SWING[frame], b = mp ? mp.b : BOB[frame];
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
    if (!holds && kit.shield) shieldArt(c, kit.shield, ha, back ? "up" : "down", side);
    if (holds && kit.weapon === "sword") sword(c, ha, [ha[0] + side * 4, ha[1] + 21]);
    if (holds && kit.weapon === "sword-4-magic") dancingSword(c, [ha[0] + side * 6, ha[1] - 10], [ha[0] + side * 8.4, ha[1] + 12]);
  }
  if (kit.armor) armorShoulders(c, kit.armor, top, back ? "up" : "down", [[CX - 12.8, top + 2], [CX + 12.8, top + 2]]);
  if (back) headBack(c, kit, b, top);
  else headFront(c, kit, b, top);
}

function side(c: Canvas, kit: Kit, frame: number, mp?: MonsterPose) {
  const s = mp ? mp.s : SWING[frame], b = mp ? mp.b : BOB[frame];
  const hip: Pt = [CX + 1, 66 + b];
  const top = 47 + b;
  // Monstro: o tronco inclina para a frente (golpe) ou para trás (preparo); as pernas ficam onde estão.
  const hx = (mp?.lean ?? 0) + (kit.hunch ?? 0), hy = (kit.hunch ?? 0) * 0.55;
  const up = <T>(draw: () => T): T => (hx || hy ? c.placed(1, [-hx, hy], draw) : draw());
  const at = (o: Pt | undefined, fallback: Pt): Pt => (o ? [CX + o[0], top + o[1]] : fallback);
  if (kit.tail) chain(c, [[CX + 6, top + 15], [CX + 13, top + 21 + s], [CX + 19, top + 22 - s], [CX + 23, top + 19]], 2.4, Mat.Skin, scales(4, 3), 0.4);
  // Passo: perna da frente à esquerda, a outra atrás com o calcanhar no ar. Passagem: juntas (os monstros param
  // com as pernas um pouco abertas, entre um e outro).
  const pose = (fwd: number): [Pt, Pt, Pt] => {
    const pass: [Pt, Pt, Pt] = [[hip[0] - 1, 77 + b], [hip[0], FEET - 3], [hip[0] - 5, FEET - 2]];
    if (fwd === 0) return pass;
    const step: [Pt, Pt, Pt] = fwd > 0 ? [[hip[0] - 4, 77 + b], [hip[0] - 7, FEET - 3], [hip[0] - 12, FEET - 2]]
      : [[hip[0] + 3, 77 + b], [hip[0] + 7, FEET - 5], [hip[0] + 2.5, FEET - 3]];
    const t = Math.abs(fwd);
    return t >= 1 ? step : [lerp(pass[0], step[0], t), lerp(pass[1], step[1], t), lerp(pass[2], step[2], t)];
  };
  const [fk, fa, ft] = pose(-s);
  leg(c, kit, hip, fk, fa, ft, true, false);
  // Braço de lá, atrás do tronco, balançando ao contrário da perna.
  up(() => {
    arm(c, kit, [CX + 2, top + 3], at(mp?.backElbow, [CX + 3 + s * 2, top + 10]), at(mp?.back, [CX + 3 + s * 4, top + 18]), true);
    if (kit.armor) armorShoulders(c, kit.armor, top, "side", [[CX + 3, top + 2]], true);
  });
  const [nk, na, nt] = pose(s);
  leg(c, kit, hip, nk, na, nt, false, false);
  up(() => sideUpper(c, kit, s, b, top, mp));
}

/**
 * Pose de um quadro de monstro: passo (`s`) e altura (`b`) como no andar dos heróis, inclinação do tronco, mãos
 * (em unidades a partir do ombro: `[CX, top]`) e a direção para onde a arma aponta, em graus (0 = para a direita,
 * 90 = para baixo), ou só quanto ela gira a partir da pose de sempre (`tilt`).
 */
export interface MonsterPose { s: number; b: number; lean?: number; hand?: Pt; elbow?: Pt; back?: Pt; backElbow?: Pt; point?: number; tilt?: number }

/** Direção (graus) para onde a arma aponta na pose de sempre, para girar até a da pose. */
function weaponAngle(kit: Kit, ha: Pt, top: number): number {
  const deg = (v: Pt) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  const w = kit.weapon;
  if (w === "branch") return deg([0, top + 2 - FEET]);
  if (w.startsWith("axe-")) return axeTwoHanded(w) ? deg([-10, top - 18 - FEET + 1]) : deg([-6.6, -AXE_LEN[tierOf(w)] - 3]);
  if (w.startsWith("sword-")) return tierOf(w) === 5 ? deg([-22, top - 22 - ha[1]]) : deg([-0.74, 0.68]);
  return 0;
}

/** Tronco, cabeça e o braço da arma de perfil (o que inclina junto no golpe dos monstros). */
function sideUpper(c: Canvas, kit: Kit, s: number, b: number, top: number, mp?: MonsterPose) {
  const at = (o: Pt | undefined, fallback: Pt): Pt => (o ? [CX + o[0], top + o[1]] : fallback);
  // Cabelo comprido e aljava nas costas (atrás do tronco).
  hairBehindSide(c, kit, b, top);
  if (kit.quiver) quiver(c, [CX + 9.5, top - 4], [CX + 6, top + 14], 6.5);
  const ids = torsoSide(c, kit, top, -s * 1.2);
  dressSide(c, kit, ids, top);
  if (kit.quiver) quiverStrap(c, ids, [CX + 4, top + 0.5], [CX - 6, top + 12]);

  // O escudo vai no braço de lá, na frente do tronco (visto quase de perfil).
  if (kit.shield) shieldArt(c, kit.shield, [CX - 10.4, top + 13], "side", -1);
  // Braço de cá na frente do tronco, com a arma (girada em volta da mão quando a pose aponta para outro lado).
  const ha: Pt = at(mp?.hand, [CX - 4 - s * 3, top + 18]);
  const a = (mp?.point === undefined ? mp?.tilt ?? 0 : mp.point - weaponAngle(kit, ha, top)) * Math.PI / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const turn = (p: Pt): Pt => (a ? [ha[0] + (p[0] - ha[0]) * ca - (p[1] - ha[1]) * sa, ha[1] + (p[0] - ha[0]) * sa + (p[1] - ha[1]) * ca] : p);
  const grip = kit.weapon === "bow" ? () => bow(c, ha, -1)
    : kit.weapon === "staff" ? () => staff(c, ha, top - 19, FEET - 0.5)
    : kit.weapon === "branch" ? () => branch(c, ha, top + 2, FEET - 1, a)
    : kit.weapon.startsWith("wand-") ? () => c.scaled(ha, 1.5, () => wandArt(c, kit.weapon, ha, [ha[0] - 7.4 - tierOf(kit.weapon) * 0.3, ha[1] - 4.4]))
    : kit.weapon.startsWith("staff-") ? () => staffArt(c, kit.weapon, ha, top - 19, FEET - 0.5)
    : kit.weapon.startsWith("bow-") ? () => bowArt(c, kit.weapon, ha, -1)
    : kit.weapon.startsWith("xbow-") ? () => crossbowArt(c, kit.weapon, ha, [-0.97, 0.24], true)
    : kit.weapon.startsWith("axe-") ? () => (axeTwoHanded(kit.weapon)
      ? axeArt(c, kit.weapon, turn([ha[0] + 3, FEET - 1]), turn([ha[0] - 7, top - 18]), -1)
      : axeArt(c, kit.weapon, turn([ha[0] + 1.6, ha[1] + 3]), turn([ha[0] - 5, ha[1] - AXE_LEN[tierOf(kit.weapon)]]), -1))
    : kit.weapon.startsWith("sword-") && kit.weapon !== "sword-4-magic" ? () => {
      const t = tierOf(kit.weapon);
      swordById(c, kit.weapon, ha, turn(t === 5 ? [ha[0] - 22, top - 22] : [ha[0] - SWORD_LEN[t] * 0.74, ha[1] + SWORD_LEN[t] * 0.68]));
    }
    : undefined;
  arm(c, kit, [CX - 1, top + 3], at(mp?.elbow, [CX - 2 - s * 1.5, top + 10]), ha, false, grip);
  if (kit.armor) armorShoulders(c, kit.armor, top, "side", [[CX - 0.6, top + 2]]);
  if (kit.weapon === "sword") sword(c, ha, [ha[0] - 16, ha[1] + 15]);
  if (kit.weapon === "sword-4-magic") dancingSword(c, [ha[0] - 7, ha[1] - 9], [ha[0] - 19, ha[1] + 4]);
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
function highCollar(c: Canvas, cy: number, side: boolean, mat: Mat = Mat.Primary, trim: Mat = Mat.Trim, offset?: Offset) {
  const cx = side ? CX + 2.5 : CX;
  const pts: Pt[] = side
    ? [[cx - 2, cy + 7], [cx + 6.5, cy + 2.5], [cx + 7.5, cy + 11], [cx - 3, cy + 11.5]]
    : [[cx - 8.6, cy + 3], [cx - 5, cy + 9.6], [cx + 5, cy + 9.6], [cx + 8.6, cy + 3], [cx + 10, cy + 11.6], [cx - 10, cy + 11.6]];
  const id = poly(c, pts, mat, cx - 10, cx + 10, offset ?? velvet(cx));
  // Debrum na borda de cima.
  const edge = side ? [[cx - 2, cy + 7], [cx + 6.5, cy + 2.5]] as Pt[] : [[cx - 8.6, cy + 3], [cx - 5, cy + 9.6], [cx + 5, cy + 9.6], [cx + 8.6, cy + 3]] as Pt[];
  for (let i = 1; i < edge.length; i++) thread(c, edge[i - 1], edge[i], trim, (k) => (k % 2 ? 4 : 3), [id]);
  return id;
}

/** Gola atrás da cabeça: a do manto vestido ou, sem ele, a do manto do feiticeiro. */
function collar(c: Canvas, kit: Kit, cy: number, view: ProtoDir) {
  if (kit.armor?.startsWith("robe-")) robeCollar(c, kit, cy, view);
  else if (kit.top === "robe") highCollar(c, cy, view === "side");
}

function headFront(c: Canvas, kit: Kit, b: number, top: number) {
  if (kit.species) { monsterHeadFront(c, kit, b, false); return; }
  const cy = 37 + b;
  collar(c, kit, cy, "down");
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
    headwear(c, kit, "down", CX, cy, top);
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
  headwear(c, kit, "down", CX, cy, top);
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
  if (kit.species) { monsterHeadFront(c, kit, b, true); return; }
  const cy = 37 + b;
  collar(c, kit, cy - 0.5, "up");
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
  headwear(c, kit, "up", CX, cy, top);
}

function headSide(c: Canvas, kit: Kit, b: number, top: number) {
  if (kit.species) { monsterHead(c, kit, b, top); return; }
  const cy = 37 + b;
  const cx = CX + 1;
  collar(c, kit, cy, "side");
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
  headwear(c, kit, "side", cx, cy, top);
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
export const fur: Offset = (X, Y) => {
  const n = noise(X, (Y + (X >> 1)) >> 1);
  return n < 0.16 ? -1 : n > 0.9 ? 1 : (X + (Y >> 1)) % 5 === 0 ? -1 : 0;
};

/** Ferro batido: marcas de martelo e arranhões. */
export const hammered: Offset = (X, Y) => (noise(X >> 1, Y >> 1) < 0.08 ? -1 : noise(X, Y) < 0.03 ? 1 : 0);

/** Barra de pelo desfiada: recorta embaixo de `y`, em tufos de 1 a 2 unidades. */
const furHem = (y: number) => (x: number, yy: number) => yy + 0.5 > y + noise(Math.floor((x + 0.5) * 1.6), 3) * 2.2;

/** Dente: triângulo de osso com luz. */
export function fang(c: Canvas, base: Pt, half: number, len: number, dir = 1) {
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
export function horn(c: Canvas, pts: readonly Pt[], r0: number, dark = 0) {
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

/** O que vai na cabeça: o capacete vestido ou, sem ele, o capuz levantado do Manto Élfico. */
function headwear(c: Canvas, kit: Kit, view: ProtoDir, cx: number, cy: number, top: number) {
  const id = kit.helmet ?? (kit.armor === "robe-2-magic" ? "elf-hood" : undefined);
  if (!id) return;
  if (id === "wolf" || id === "arc-1-magic") {
    if (view === "down") wolfFront(c, cy, top); else if (view === "up") wolfBack(c, cy, top); else wolfSide(c, cx, cy, top);
  } else if (id === "demon") {
    if (view === "down") demonFront(c, cy); else if (view === "up") demonBack(c, cy); else demonSide(c, cx, cy);
  } else if (id === "elf-hood") elvenHood(c, view, cx, cy, top);
  else helmetArt(c, id, view, cx, cy, top);
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

// --- Lote 1: espadas, elmos e armaduras de guerra (docs/ARTE_ITENS.md) -----------------

/** Malha: anéis em fileiras desencontradas, com o furo escuro e o brilho em cima. */
export const mail: Offset = (X, Y) => {
  const row = Math.floor(Y / 3), r = Y % 3;
  const k = (X + (row % 2) * 2) % 4;
  if (k === 0 || (r === 2 && k !== 2)) return -1;
  return k === 2 && r === 0 ? 1 : 0;
};

/** Escamas sobrepostas: borda de baixo escura e um brilho no alto de cada uma. */
export const scales = (w: number, h: number): Offset => (X, Y) => {
  const row = Math.floor(Y / h);
  const x = (((X + (row % 2) * (w / 2)) % w) + w) % w, y = Y % h;
  const r = (x - (w - 1) / 2) ** 2 / (w / 2) ** 2 + (y - 1) ** 2 / (h * h * 0.8);
  if (r > 0.7 && y >= 1) return -1;
  return y === 1 && Math.abs(x - (w - 1) / 2) < 1 ? 1 : 0;
};

/** Tom pela luz de uma forma, para tinta com volume. */
const shaded = (shade: Shade, bias = 0) => (x: number, y: number, X: number, Y: number) =>
  Math.max(1, Math.min(4, Math.floor(shade(x, y) * 4 + (BAYER[(Y & 1) * 2 + (X & 1)] - 0.5) * 0.55) + 1)) + bias;

/** Peça com volume feita de um polígono qualquer, presa (ou não) às peças `clip`. */
export function plate(c: Canvas, pts: readonly Pt[], mat: Mat, offset?: Offset) {
  const xs = pts.map((p) => p[0]);
  return poly(c, pts, mat, Math.min(...xs), Math.max(...xs), offset);
}

/** Pontinho de rebite com brilho. */
export function rivet(c: Canvas, ids: readonly number[], x: number, y: number, mat: Mat = Mat.Steel) {
  c.on(ids, F(x), F(y), mat, 5);
  c.on(ids, F(x) + 1, F(y) + 1, mat, 1);
}

// --- Espadas -------------------------------------------------------------------------

/**
 * Lâmina genérica: largura por posição (`width(t)`, t de 0 na guarda a 1 na ponta), curva para o lado
 * (`curve`), duas faces (a da luz clara), gume claro e sulco escuro até `fuller`.
 */
function blade(c: Canvas, guard: Pt, tip: Pt, width: (t: number) => number, mat: Mat, curve = 0, fuller = 0.7, extra?: Offset) {
  const dx = tip[0] - guard[0], dy = tip[1] - guard[1];
  const bl = Math.hypot(dx, dy), ux = dx / bl, uy = dy / bl, gx = -uy, gy = ux;
  const local = (x: number, y: number) => {
    const px = x + 0.5 - guard[0], py = y + 0.5 - guard[1];
    const t = (px * ux + py * uy) / bl;
    return { t, side: px * gx + py * gy - curve * bl * t * t };
  };
  const r = 4 + Math.abs(curve) * bl;
  return c.fill([Math.min(guard[0], tip[0]) - r, Math.min(guard[1], tip[1]) - r, Math.max(guard[0], tip[0]) + r, Math.max(guard[1], tip[1]) + r],
    (x, y) => { const { t, side } = local(x, y); return t >= 0 && t <= 1 && Math.abs(side) <= width(t); }, mat, (x, y) => {
      const { t, side } = local(x, y);
      const u = side / Math.max(0.2, width(t));
      if (Math.abs(u) > 0.74) return 0.95;
      return u < 0 ? 0.78 : 0.4;
    }, (X, Y) => {
      const { t, side } = local((X + 0.5) / K - 0.5, (Y + 0.5) / K - 0.5);
      if (fuller > 0 && Math.abs(side) < Math.max(0.3, width(t) * 0.18) && t > 0.04 && t < fuller) return -2;
      return (extra ? extra(X, Y) : 0) + (noise(X, Y) < 0.035 ? -1 : 0);
    });
}

const taper = (w0: number, w1: number, tipAt = 0.86) => (t: number) => (t > tipAt ? (w0 + (w1 - w0) * tipAt) * (1 - t) / (1 - tipAt) + 0.12 : w0 + (w1 - w0) * t);

/** Cabo: couro ou madeira com voltas de cordão em diagonal. */
function grip(c: Canvas, a: Pt, b: Pt, r: number, mat: Mat, wrap: Mat | null) {
  const id = limb(c, a, b, r, r, mat, wrap ? undefined : grain);
  if (!wrap) return id;
  const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.7);
  for (let k = 1; k < n; k++) {
    const p = lerp(a, b, k / n);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    thread(c, [p[0] - (dy / l) * r, p[1] + (dx / l) * r - 0.3], [p[0] + (dy / l) * r, p[1] - (dx / l) * r + 0.3], wrap, k % 2 ? 4 : 2, [id]);
  }
  return id;
}

function swordArt(c: Canvas, at: Pt, tip: Pt, tier: number) {
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, gx = -uy, gy = ux;
  const P = (a: number, g: number): Pt => [at[0] + ux * a + gx * g, at[1] + uy * a + gy * g];
  switch (tier) {
    case 1: {
      // Gládio de treino: lâmina larga e curta, guarda de madeira, cabo com cordão, pomo redondo.
      blade(c, P(3.4, 0), tip, taper(2, 1.8, 0.8), Mat.Steel, 0, 0.55);
      limb(c, P(3, -2.8), P(3, 2.8), 0.75, 0.75, Mat.Wood, grain);
      grip(c, P(-3, 0), P(2.4, 0), 1.05, Mat.Wood, Mat.Linen);
      ellipse(c, ...P(-3.8, 0), 1.3, 1.3, Mat.Wood);
      return;
    }
    case 2: {
      // Xiphos de bronze: lâmina em folha, guarda em crescente, pomo em cabeça de touro.
      blade(c, P(3.4, 0), tip, (t) => (t > 0.86 ? 2.1 * (1 - t) / 0.14 + 0.12 : 1.25 + Math.sin(Math.PI * Math.min(1, t / 0.8)) * 1.05), Mat.Bronze, 0, 0.75);
      chain(c, [P(4.2, -3.2), P(3, -1.4), P(2.8, 0), P(3, 1.4), P(4.2, 3.2)], 0.75, Mat.Bronze, undefined, 0.75);
      grip(c, P(-2.8, 0), P(2.4, 0), 1.05, Mat.Leather, Mat.Bronze);
      const head = P(-4, 0);
      const h = ellipse(c, head[0], head[1], 1.5, 1.4, Mat.Bronze);
      for (const s of [-1, 1]) chain(c, [P(-4.4, s * 1.2), P(-5, s * 2.4), P(-6.2, s * 2.4)], 0.45, Mat.Bronze, undefined, 0.2);
      for (const s of [-1, 1]) rivet(c, [h], ...P(-4.2, s * 0.6), Mat.Eye);
      return;
    }
    case 3: {
      // Espada longa: lâmina reta com sulco, guarda reta com pontas, cabo negro, pomo de disco.
      blade(c, P(3.4, 0), tip, taper(1.8, 1.4, 0.88), Mat.Steel, 0, 0.72);
      const g = limb(c, P(3, -5.6), P(3, 5.6), 0.7, 0.7, Mat.Steel);
      for (const s of [-1, 1]) ellipse(c, ...P(3, s * 5.8), 0.95, 0.95, Mat.Steel);
      rivet(c, [g], ...P(3, 0));
      grip(c, P(-3.4, 0), P(2.4, 0), 1, Mat.Iron, Mat.Leather);
      const disc = ellipse(c, ...P(-4.4, 0), 1.6, 1.6, Mat.Steel);
      c.on(disc, ...([F(P(-4.4, 0)[0]), F(P(-4.4, 0)[1])] as [number, number]), Mat.Steel, 1);
      return;
    }
    case 4: {
      // Lâmina élfica de mithral: levemente curva, folhas gravadas, guarda em galhos, gema azul.
      const b = blade(c, P(3.4, 0), tip, (t) => (t > 0.84 ? 1.9 * (1 - t) / 0.16 + 0.1 : 1.55 + Math.sin(Math.PI * t) * 0.35), Mat.Mithral, -0.05, 0, (X, Y) => ((X + Y * 2) % 11 === 0 ? -1 : 0));
      // Gravura: folhinhas ao longo da lâmina.
      for (let t = 0.15; t < 0.8; t += 0.16) {
        const p = lerp(P(3.4, 0), tip, t);
        thread(c, [p[0] - gx * 0.7, p[1] - gy * 0.7], [p[0] + ux * 1.2, p[1] + uy * 1.2], Mat.Mithral, 1, [b]);
        thread(c, [p[0] + gx * 0.7, p[1] + gy * 0.7], [p[0] + ux * 1.2, p[1] + uy * 1.2], Mat.Mithral, 1, [b]);
      }
      for (const s of [-1, 1]) {
        chain(c, [P(3.2, 0), P(3.8, s * 2.4), P(6, s * 3.4), P(7.6, s * 2.8)], 0.6, Mat.Mithral, undefined, 0.25);
        leaf(c, P(5, s * 4.2), Math.atan2(uy, ux) + s * 0.6, 1.4, 0.7, Mat.Mithral);
      }
      grip(c, P(-3.2, 0), P(2.6, 0), 0.95, Mat.Linen, Mat.Mithral);
      const gem = ellipse(c, ...P(-4.2, 0), 1.3, 1.5, Mat.Sapphire);
      c.on(gem, F(P(-4.6, -0.4)[0]), F(P(-4.6, -0.4)[1]), Mat.Sapphire, 5);
      return;
    }
    default:
      greatsword(c, at, tip);
  }
}

// --- Elmos de guerra -----------------------------------------------------------------

/** Gorro de couro: calota acolchoada em gomos, borda virada, abas nas orelhas amarradas embaixo do queixo. */
function cap1(c: Canvas, view: ProtoDir, cx: number, cy: number) {
  const test = view === "side"
    ? (x: number, y: number) => inEllipse(cx + 0.6, cy - 1.2, 9.6, 9.8)(x, y) && (y + 0.5 < cy - 2.4 || (x > cx - 1.6 && x < cx + 4.4 && y < cy + 6.8) || (x > cx + 3 && y < cy + 4))
    : view === "up"
      ? (x: number, y: number) => inEllipse(cx, cy - 1.2, 9.8, 9.8)(x, y) && y < cy + 5
      : (x: number, y: number) => inEllipse(cx, cy - 1.2, 9.8, 9.8)(x, y) && (y + 0.5 < cy - 2.4 || (Math.abs(x + 0.5 - cx) > 7.2 && y < cy + 6.8));
  const id = c.fill(ebox(cx, cy - 1.2, 10.4, 10.4), test, Mat.Leather, sphere(cx, cy - 1.2, 9.8, 9.8), (X, Y) => leather(X, Y) + (((X - F(cx)) % 9 + 9) % 9 === 0 ? -1 : 0));
  // Gomos costurados que descem do alto.
  for (const k of [-6, -3, 0, 3, 6]) thread(c, [cx + k * 0.25, cy - 10.6], [cx + k, cy - 3], Mat.Leather, (j) => (j % 3 === 0 ? 4 : 1), [id]);
  // Borda virada na testa.
  if (view !== "up") {
    const x0 = view === "side" ? cx - 8.6 : cx - 8.8, x1 = view === "side" ? cx + 3 : cx + 8.8;
    for (let X = F(x0); X <= F(x1); X++) { c.on(id, X, F(cy - 3.2), Mat.Leather, 5); c.on(id, X, F(cy - 2.8), Mat.Leather, 3); c.on(id, X, F(cy - 2.4), Mat.Leather, 0); }
  }
  // Cordões das abas.
  if (view === "down") for (const s of [-1, 1]) chain(c, [[cx + s * 8.2, cy + 6.6], [cx + s * 7.4, cy + 8.4], [cx + s * 6, cy + 9.4]], 0.35, Mat.Linen);
  if (view === "side") chain(c, [[cx + 1.4, cy + 6.6], [cx - 0.6, cy + 8.6], [cx - 2.6, cy + 9.4]], 0.35, Mat.Linen);
  // Pena e brasão (o mágico) ficam para o lote 2.
}

/** Elmo coríntio de bronze: cobre o rosto com aberturas em amêndoa, protetor de nariz e crista de crina vermelha. */
function cap2(c: Canvas, view: ProtoDir, cx: number, cy: number) {
  const patina: Offset = (X, Y) => (noise(X >> 1, Y >> 1) < 0.06 ? 0 : noise(X, Y) < 0.02 ? 1 : 0);
  if (view === "side") {
    // Crista em arco, da testa até a nuca.
    c.fill([cx - 9, cy - 17, cx + 12, cy], (x, y) => inEllipse(cx + 0.8, cy - 0.6, 13, 15.6)(x, y) && !inEllipse(cx + 0.8, cy - 0.6, 9.6, 10.6)(x, y) && y < cy - 3.4 && x > cx - 7 && x < cx + 10.4,
      Mat.Crest, sphere(cx + 0.8, cy - 2, 13, 15), (X, Y) => ((X * 3 + Y) % 5 === 0 ? -1 : (X + Y * 2) % 7 === 0 ? 1 : 0));
    const shell = c.fill(ebox(cx + 0.6, cy + 0.2, 10, 11), (x, y) => {
      if (!inEllipse(cx + 0.6, cy + 0.2, 9.6, 10.8)(x, y)) return false;
      if (inEllipse(cx - 6, cy + 2.2, 2.6, 1.2)(x, y)) return false;
      return !(x + 0.5 < cx - 6.6 && y > cy + 5);
    }, Mat.Bronze, sphere(cx + 0.6, cy - 0.6, 10, 11), patina);
    thread(c, [cx - 8.8, cy + 0.4], [cx - 3.6, cy + 0.6], Mat.Bronze, 5, [shell]);
    thread(c, [cx - 3, cy + 3], [cx + 1.6, cy + 9.6], Mat.Bronze, 1, [shell]);
    return;
  }
  if (view === "down") {
    // Crista de frente: estreita e alta, presa num suporte.
    plate(c, [[cx - 2.4, cy - 8.6], [cx - 3, cy - 18.6], [cx - 1.4, cy - 20.6], [cx + 1.4, cy - 20.6], [cx + 3, cy - 18.6], [cx + 2.4, cy - 8.6]], Mat.Crest, (X, Y) => ((X * 3 + Y) % 5 === 0 ? -1 : (X + Y) % 7 === 0 ? 1 : 0));
  }
  const shell = c.fill(ebox(cx, cy + 0.4, 10.4, 11.2), (x, y) => {
    if (!inEllipse(cx, cy + 0.4, 9.8, 10.8)(x, y)) return false;
    if (view === "up") return true;
    const d = Math.abs(x + 0.5 - cx);
    if (inEllipse(cx - 3.8, cy + 2.2, 3, 1.6)(x, y) || inEllipse(cx + 3.8, cy + 2.2, 3, 1.6)(x, y)) return false;
    return !(d < 2.1 + (y - cy - 5) * 0.2 && y > cy + 5);
  }, Mat.Bronze, sphere(cx, cy - 0.6, 10.4, 11.4), patina);
  if (view === "down") {
    // Sobrancelhas gravadas, protetor de nariz, azinhavre nas bordas e o suporte da crista.
    for (const s of [-1, 1]) {
      thread(c, [cx + s * 0.8, cy + 0.4], [cx + s * 6.6, cy + 0.9], Mat.Bronze, 1, [shell]);
      thread(c, [cx + s * 0.8, cy - 0.1], [cx + s * 6.6, cy + 0.4], Mat.Bronze, 5, [shell]);
      for (let k = 0; k < 6; k++) c.on([shell], F(cx + s * (6 + noise(k, s) * 3)), F(cy + 6 + noise(s, k) * 4), Mat.Patina, 3);
    }
    thread(c, [cx, cy + 1], [cx, cy + 5.2], Mat.Bronze, 5, [shell]);
    limb(c, [cx - 1.4, cy - 9.8], [cx + 1.4, cy - 9.8], 0.8, 0.8, Mat.Bronze);
  } else {
    plate(c, [[cx - 2.2, cy - 9.4], [cx - 2, cy - 16], [cx + 2, cy - 16], [cx + 2.2, cy - 9.4]], Mat.Crest, (X, Y) => ((X * 3 + Y) % 5 === 0 ? -1 : 0));
    thread(c, [cx, cy - 9], [cx, cy + 10], Mat.Bronze, 1, [shell]);
  }
}

/** Elmo nórdico de ferro: calota em ponta com tiras e rebites, nasal, e malha caindo na nuca e nos lados. */
function cap3(c: Canvas, view: ProtoDir, cx: number, cy: number, top: number) {
  // Malha (camal) atrás da cabeça, até os ombros.
  if (view === "down") {
    for (const s of [-1, 1]) plate(c, [[cx + s * 7.2, cy - 1.6], [cx + s * 9.8, cy - 2], [cx + s * 12.2, top + 4.6], [cx + s * 8.6, top + 5.4], [cx + s * 7, cy + 8]], Mat.Steel, (X, Y) => mail(X, Y) - 1);
  } else if (view === "up") {
    plate(c, [[cx - 9.8, cy - 2], [cx - 12.4, top + 4.6], [cx + 12.4, top + 4.6], [cx + 9.8, cy - 2]], Mat.Steel, (X, Y) => mail(X, Y) - 1);
  } else {
    plate(c, [[cx - 1.6, cy - 2], [cx + 9.8, cy - 2.4], [cx + 11.4, top + 4.8], [cx + 1, top + 5.2], [cx - 1.6, cy + 7]], Mat.Steel, (X, Y) => mail(X, Y) - 1);
  }
  const ox = view === "side" ? cx + 0.6 : cx;
  const dome = c.fill([ox - 10.4, cy - 15, ox + 10.4, cy - 1], (x, y) => {
    const d = Math.abs(x + 0.5 - ox);
    return y < cy - 1.6 && (inEllipse(ox, cy - 0.6, 9.8, 10.2)(x, y) || (y < cy - 6 && d < (y + 0.5 - (cy - 14.6)) * 0.95));
  }, Mat.Steel, sphere(ox, cy - 2.6, 10.4, 11.4), hammered);
  // Tiras verticais (spangen) com rebites e a faixa da testa.
  const bands = view === "side" ? [-3.6, 2.4] : [-5, 0, 5];
  for (const k of bands) {
    thread(c, [ox + k * 0.2, cy - 13.8], [ox + k, cy - 2.6], Mat.Steel, 5, [dome]);
    thread(c, [ox + k * 0.2 + 0.4, cy - 13.6], [ox + k + 0.4, cy - 2.6], Mat.Steel, 1, [dome]);
    for (const t of [0.35, 0.7]) rivet(c, [dome], ox + k * (0.2 + 0.8 * t), cy - 13.8 + 11.2 * t);
  }
  const band = limb(c, [ox - 9.8, cy - 2.2], [ox + 9.8, cy - 2.2], 0.9, 0.9, Mat.Steel);
  for (const k of [-7.4, -3.7, 3.7, 7.4]) rivet(c, [band], ox + k, cy - 2.4);
  if (view === "down") limb(c, [cx, cy - 2.6], [cx, cy + 5.4], 0.75, 0.6, Mat.Steel);
  if (view === "side") limb(c, [cx - 8.6, cy - 2.6], [cx - 9.4, cy + 5], 0.75, 0.6, Mat.Steel);
}

/** Elmo de mithral fechado: barril com fenda em cruz, respiros, coroa de folhas e penacho na cor da classe. */
function cap4(c: Canvas, view: ProtoDir, cx: number, cy: number) {
  const ox = view === "side" ? cx + 0.4 : cx;
  // Penacho: plumas curvas subindo e caindo para trás.
  const plumeTop: Pt = [ox + (view === "side" ? 2 : 0.6), cy - 18];
  for (let k = 0; k < 7; k++) {
    const sx = view === "side" ? 0.6 + k * 0.25 : (k - 3) * 0.45;
    chain(c, [[ox, cy - 10], [ox + sx * 1.4, cy - 14.4 - (k % 3) * 0.5], [plumeTop[0] + sx * 3.4, plumeTop[1] + Math.abs(k - 3) * 0.6], [plumeTop[0] + sx * 5.6 + (view === "side" ? 3 : 0), plumeTop[1] + 4.4 + Math.abs(k - 3) * 0.8]],
      1.9 - Math.abs(k - 3) * 0.2, Mat.Primary, (X, Y) => ((X + Y) % 4 === 0 ? -1 : (X + Y * 3) % 9 === 0 ? 1 : 0), 0.4);
  }
  limb(c, [ox - 0.8, cy - 10.4], [ox + 0.8, cy - 10.4], 0.9, 0.9, Mat.Trim);
  const shell = c.fill([ox - 10, cy - 11, ox + 10, cy + 11], (x, y) => {
    const d = Math.abs(x + 0.5 - ox);
    if (view === "side" && x + 0.5 < ox - 9.4) return false;
    return (inEllipse(ox, cy - 4, 9.4, 6.8)(x, y) || (d <= 9.4 && y > cy - 4)) && y < cy + 10.2 - Math.max(0, d - 6.4) * 0.9;
  }, Mat.Mithral, (x) => lit(Math.max(-0.95, Math.min(0.95, (x + 0.5 - ox) / 9.6)), -0.2, 0.8), (X, Y) => (noise(X, Y) < 0.02 ? 1 : 0));
  if (view === "up") {
    thread(c, [ox, cy - 10], [ox, cy + 10], Mat.Mithral, 5, [shell]);
    for (const k of [-6, 6]) for (const y of [-2, 4]) rivet(c, [shell], ox + k, cy + y, Mat.Mithral);
  } else if (view === "down") {
    // Crista central, fenda dos olhos e respiros.
    limb(c, [ox, cy - 10], [ox, cy + 9.6], 0.55, 0.6, Mat.Mithral);
    for (const s of [-1, 1]) {
      c.fill([ox + Math.min(s * 1, s * 8) - 0.5, cy + 0.6, ox + Math.max(s * 1, s * 8) + 0.5, cy + 2], (x, y) => {
        const d = (x + 0.5 - ox) * s;
        return d > 1 && d < 8 - (y - cy - 0.8) * 0.8 && y + 0.5 > cy + 0.8 && y + 0.5 < cy + 1.9;
      }, Mat.Eye, () => 0.1);
    }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - r; k++) c.on(shell, F(ox + 3 + k * 1.3 + r * 0.6), F(cy + 4.6 + r * 1.4), Mat.Eye, 0);
    for (const s of [-1, 1]) thread(c, [ox + s * 1, cy + 0.2], [ox + s * 8, cy + 0.2], Mat.Mithral, 5, [shell]);
  } else {
    // De lado: frente do barril com a fenda e os respiros, dobradiça.
    c.fill([ox - 9.6, cy + 0.6, ox - 2, cy + 2], (x, y) => x + 0.5 > ox - 9.6 && x + 0.5 < ox - 3 && y + 0.5 > cy + 0.8 && y + 0.5 < cy + 1.9, Mat.Eye, () => 0.1);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) c.on(shell, F(ox - 8 + k * 1.4), F(cy + 4.6 + r * 1.4), Mat.Eye, 0);
    const hinge = ellipse(c, ox + 1.6, cy + 1.4, 1.2, 1.2, Mat.Mithral);
    void hinge;
  }
  // Coroa de folhas de mithral na altura da testa.
  if (view !== "up") {
    const xs = view === "side" ? [-7, -4.4, -1.8, 0.8, 3.4, 6] : [-7.6, -5, -2.4, 0, 2.4, 5, 7.6];
    for (const k of xs) leaf(c, [ox + k, cy - 5.4 + Math.abs(k) * 0.04], -Math.PI / 2 + k * 0.05, 1.5, 0.75, Mat.Mithral);
    const band = limb(c, [ox + xs[0] - 0.6, cy - 4.4], [ox + xs[xs.length - 1] + 0.6, cy - 4.4], 0.45, 0.45, Mat.Trim);
    c.on(band, F(ox), F(cy - 4.6), Mat.Sapphire, 5);
  }
}

/** Elmo do dragão: a cabeça de dragão de boca aberta emoldura o rosto; olhos acesos, dentes e chifres para trás. */
function cap5(c: Canvas, view: ProtoDir, cx: number, cy: number) {
  const sc = scales(5, 4);
  if (view === "side") {
    horn(c, [[cx + 2, cy - 7], [cx + 7, cy - 10], [cx + 11.6, cy - 11.4], [cx + 14.4, cy - 10]], 1.7, -1);
    const skull = c.fill([cx - 8, cy - 12, cx + 11, cy + 2], (x, y) => inEllipse(cx + 1, cy - 1.8, 9.8, 9.6)(x, y) && (y + 0.5 < cy - 1.4 || x > cx + 1),
      Mat.Dragon, sphere(cx + 1, cy - 3, 10, 10), sc);
    const snout = plate(c, [[cx - 6, cy - 9], [cx - 13, cy - 5.6], [cx - 13.4, cy - 3], [cx - 6, cy - 1.6]], Mat.Dragon, sc);
    ellipse(c, cx - 12.4, cy - 5, 0.7, 0.5, Mat.Eye);
    for (const x of [-12.4, -11, -9.6, -8.2, -6.8]) fang(c, [cx + x, cy - 1.8], 0.42, x === -11 ? 1.8 : 0.9);
    // Maxilar de baixo pela bochecha, com dentes para cima.
    plate(c, [[cx + 0.6, cy + 2], [cx - 6.6, cy + 7.6], [cx - 7.2, cy + 9.2], [cx + 2.4, cy + 6]], Mat.Dragon, sc);
    for (const x of [-6, -4.6]) fang(c, [cx + x, cy + 7.6], 0.4, 1.2, -1);
    spotEye(c, [cx - 4, cy - 6.4], 0.9);
    thread(c, [cx - 6.4, cy - 7.8], [cx - 1.6, cy - 7.6], Mat.Dragon, 0, [skull, snout]);
    for (const k of [0, 3, 6]) plate(c, [[cx + k - 1, cy - 10.6 + k * 0.3], [cx + k + 1, cy - 10.4 + k * 0.3], [cx + k + 0.8, cy - 13.4 + k * 0.6]], Mat.Horn);
    horn(c, [[cx + 0.6, cy - 8], [cx + 5.4, cy - 11], [cx + 10.6, cy - 13.4], [cx + 14, cy - 12.6]], 2);
    return;
  }
  for (const s of [-1, 1]) horn(c, [[cx + s * 6.4, cy - 8], [cx + s * 9.6, cy - 11.6], [cx + s * 11.6, cy - 15.6], [cx + s * 11.4, cy - 19]], 1.9, view === "up" ? -1 : 0);
  if (view === "up") {
    const back = c.fill(ebox(cx, cy - 0.4, 10.2, 10.6), inEllipse(cx, cy - 0.4, 10, 10.4), Mat.Dragon, sphere(cx, cy - 1, 10.2, 10.6), sc);
    for (const y of [-9.6, -6, -2.4, 1.2, 4.8]) plate(c, [[cx - 1, cy + y + 1], [cx + 1, cy + y + 1], [cx, cy + y - 2]], Mat.Horn);
    void back;
    return;
  }
  // Calota (crânio do dragão) até a testa, maxilar de cima com dentes sobre a testa, olhos, narinas.
  const skull = c.fill(ebox(cx, cy - 2.2, 10.4, 9.6), (x, y) => inEllipse(cx, cy - 2.2, 10.2, 9.4)(x, y) && (y + 0.5 < cy - 1.6 || Math.abs(x + 0.5 - cx) > 7.6),
    Mat.Dragon, sphere(cx, cy - 3, 10.4, 10), sc);
  const muzzle = plate(c, [[cx - 4.6, cy - 6], [cx + 4.6, cy - 6], [cx + 3.8, cy - 1.6], [cx - 3.8, cy - 1.6]], Mat.Dragon, sc);
  for (const s of [-1, 1]) {
    ellipse(c, cx + s * 1.6, cy - 3.6, 0.6, 0.45, Mat.Eye);
    spotEye(c, [cx + s * 5, cy - 6.6], 1);
    thread(c, [cx + s * 2.4, cy - 8.2], [cx + s * 7.2, cy - 7.4], Mat.Dragon, 0, [skull]);
    // Maxilar de baixo descendo pelas bochechas, dentes apontando para cima.
    plate(c, [[cx + s * 7.6, cy - 1], [cx + s * 9.6, cy], [cx + s * 7.6, cy + 9.4], [cx + s * 5.6, cy + 9]], Mat.Dragon, sc);
    fang(c, [cx + s * 6.2, cy + 8.6], 0.5, 1.6, -1);
    fang(c, [cx + s * 7, cy + 5], 0.4, 1, -1);
  }
  for (const k of [-3, -1.8, -0.6, 0.6, 1.8, 3]) fang(c, [cx + k, cy - 1.8], 0.4, Math.abs(k) > 2.5 ? 1.8 : 0.8);
  for (const k of [-2.4, 0, 2.4]) plate(c, [[cx + k - 0.9, cy - 10.6], [cx + k + 0.9, cy - 10.6], [cx + k * 1.3, cy - 13.6]], Mat.Horn);
  void muzzle;
}

function warHelmet(c: Canvas, tier: number, view: ProtoDir, cx: number, cy: number, top: number) {
  switch (tier) {
    case 1: return cap1(c, view, cx, cy);
    case 2: return cap2(c, view, cx, cy);
    case 3: return cap3(c, view, cx, cy, top);
    case 4: return cap4(c, view, cx, cy);
    default: return cap5(c, view, cx, cy);
  }
}

// --- Armaduras de guerra -------------------------------------------------------------


/** Tronco da armadura de guerra de nível `tier` (de frente, de costas ou de lado). */
function armorTorsoCommon(c: Canvas, tier: number, top: number, view: ProtoDir, sway: number): number[] {
  const side = view === "side";
  const T = (bottom: number, flare: number) => (side ? TORSO_SIDE(top, bottom, flare, sway * 0.4) : TORSO_FRONT(top, bottom, flare));
  const x0 = side ? CX - 10 : CX - 13, x1 = side ? CX + 10 : CX + 13;
  switch (tier) {
    case 1: {
      const id = poly(c, T(top + 21, 1), Mat.Leather, x0, x1, leather);
      // Tachas em quincunce, laço na frente, gola e barra costuradas.
      for (let y = top + 3, r = 0; y < top + 19.5; y += 2.6, r++) {
        for (let x = -10.4 + (r % 2) * 1.3; x <= 10.4; x += 2.6) {
          if (!side && view === "down" && Math.abs(x) < 1.8 && y < top + 12.5) continue;
          rivet(c, [id], CX + x, y);
        }
      }
      if (view === "down") {
        thread(c, [CX, top + 0.6], [CX, top + 12.4], Mat.Leather, 0, [id]);
        for (let y = top + 1.6; y < top + 12; y += 1.6) { thread(c, [CX - 1, y], [CX + 1, y + 0.8], Mat.Linen, 4, [id]); thread(c, [CX + 1, y], [CX - 1, y + 0.8], Mat.Linen, 3, [id]); }
      }
      for (let X = F(x0); X <= F(x1); X++) { c.on(id, X, F(top), Mat.Leather, 5); c.on(id, X, F(top) + 1, Mat.Leather, 1); if (X % 3 === 0) c.on(id, X, F(top + 20.2), Mat.Leather, 4); }
      return [id];
    }
    case 2: {
      // Saiote de tiras de couro (pteruges) com rebite na ponta, e por cima a couraça musculada de bronze.
      const shape = inPoly(T(top + 23, 1.8));
      const strip = (x: number) => Math.floor((x + 0.5 - CX + 40) / 2.2);
      const skirt = c.fill(pbox(T(top + 23, 1.8)), (x, y) => shape(x, y) && y > top + 12.4 && y + 0.5 < top + 20.6 + (strip(x) % 2 ? 1.8 : 0), Mat.Leather,
        (x) => { const u = (((x + 0.5 - CX + 40) % 2.2) / 1.1) - 1; return lit(u * 0.85, 0, Math.sqrt(1 - u * u * 0.7)); },
        (X) => ((((X + 0.5) / K - CX + 40) % 2.2) > 2 ? -1 : 0));
      for (let x = CX - 13; x <= CX + 13; x += 2.2) {
        const sx = Math.floor(x - CX + 40) ;
        const y = top + 20 + (Math.floor((x + 0.6 - CX + 40) / 2.2) % 2 ? 1.8 : 0);
        rivet(c, [skirt], x + 1.1, y, Mat.Bronze);
        void sx;
      }
      const id = poly(c, T(top + 13.8, 0), Mat.Bronze, x0, x1, (X, Y) => (noise(X >> 1, Y >> 1) < 0.04 ? -1 : 0));
      if (view === "down") {
        for (const s of [-1, 1]) {
          const pec: Pt[] = [[CX + s * 0.6, top + 3.6], [CX + s * 3.2, top + 7], [CX + s * 7, top + 6.4], [CX + s * 9, top + 4]];
          for (let i = 1; i < pec.length; i++) { thread(c, pec[i - 1], pec[i], Mat.Bronze, 1, [id]); thread(c, [pec[i - 1][0], pec[i - 1][1] - 0.5], [pec[i][0], pec[i][1] - 0.5], Mat.Bronze, 5, [id]); }
          for (const y of [top + 9, top + 11.2]) thread(c, [CX + s * 0.8, y], [CX + s * 3.8, y - 0.3], Mat.Bronze, s < 0 ? 5 : 1, [id]);
        }
        thread(c, [CX, top + 7.4], [CX, top + 13], Mat.Bronze, 1, [id]);
        c.on(id, F(CX), F(top + 12.4), Mat.Bronze, 0);
      } else if (view === "up") {
        for (const s of [-1, 1]) for (let i = 0; i < 8; i++) c.on(id, F(CX + s * (3 + Math.sin(i / 2.5) * 2.4)), F(top + 3 + i * 0.7), Mat.Bronze, 1);
        thread(c, [CX, top + 1], [CX, top + 13], Mat.Bronze, 1, [id]);
      } else {
        thread(c, [CX - 8.4, top + 6.6], [CX - 4, top + 7.4], Mat.Bronze, 1, [id]);
        thread(c, [CX - 8.4, top + 6], [CX - 4, top + 6.8], Mat.Bronze, 5, [id]);
      }
      // Bordas viradas no pescoço e na cintura.
      for (let X = F(x0); X <= F(x1); X++) { c.on(id, X, F(top), Mat.Bronze, 5); c.on(id, X, F(top + 13.4), Mat.Bronze, 5); c.on(id, X, F(top + 13.4) + 1, Mat.Bronze, 1); }
      return [id, skirt];
    }
    case 3: {
      // Cota de malha até o meio da coxa e o tabardo na cor da classe por cima, com debrum e brasão em asna.
      const m = poly(c, T(top + 22.6, 1.6), Mat.Steel, x0, x1, (X, Y) => mail(X, Y) - 1);
      const panel: Pt[] = side
        ? [[CX - 9.6, top + 1.4], [CX - 6.4, top + 1], [CX - 6.6, top + 23.6], [CX - 10.8 + sway * 0.4, top + 23.6]]
        : [[CX - 7, top + 0.4], [CX + 7, top + 0.4], [CX + 7.8, top + 23.6], [CX - 7.8, top + 23.6]];
      const tab = plate(c, panel, Mat.Primary, linen);
      for (let i = 0; i < panel.length; i++) {
        const a = panel[i], b2 = panel[(i + 1) % panel.length];
        if (i === 0 && !side) continue;
        thread(c, a, b2, Mat.Trim, (k) => (k % 2 ? 4 : 2), [tab]);
      }
      if (!side) {
        // Brasão: asna dourada com três besantes.
        const yy = view === "down" ? top + 8 : top + 8;
        for (let w = 0; w < 3; w++) { thread(c, [CX - 4.6, yy + 3.4 + w * 0.5], [CX, yy + w * 0.5], Mat.Trim, w === 0 ? 5 : 3, [tab]); thread(c, [CX + 4.6, yy + 3.4 + w * 0.5], [CX, yy + w * 0.5], Mat.Trim, w === 0 ? 4 : 2, [tab]); }
        for (const [bx, by] of [[-3.4, -2.4], [3.4, -2.4], [0, 6.6]] as const) { const b = ellipse(c, CX + bx, yy + by, 0.9, 0.9, Mat.Trim); void b; }
        // Cinto de couro com fivela simples sobre o tabardo.
        belt(c, [tab, m], CX, 10, top, view === "down");
      } else belt(c, [tab, m], CX, 8.5, top, false);
      // Gola de malha.
      plate(c, side ? [[CX - 6.4, top - 0.8], [CX + 6, top - 0.8], [CX + 7, top + 1.6], [CX - 6.8, top + 1.6]] : [[CX - 6.6, top - 0.8], [CX + 6.6, top - 0.8], [CX + 8, top + 1.6], [CX - 8, top + 1.6]], Mat.Steel, mail);
      return [m, tab];
    }
    case 4: {
      // Peitoral de mithral com quilha e filigrana dourada, gorjal, lâminas da cintura e coxotes.
      const tassets: number[] = [];
      for (const s of side ? [-1] : [-1, 1]) {
        const tx = side ? [CX - 9.6, CX + 2] : [CX + s * 1.2, CX + s * 11.8];
        const pts: Pt[] = [[tx[0], top + 19.4], [tx[1], top + 19.4], [tx[1] + s * -0.6, top + 25], [tx[0] + s * 1.2, top + 25.6]];
        const t = plate(c, pts, Mat.Mithral);
        for (const y of [top + 21.2, top + 23]) thread(c, [Math.min(...pts.map((p) => p[0])), y], [Math.max(...pts.map((p) => p[0])), y + 0.2], Mat.Mithral, 1, [t]);
        rivet(c, [t], (tx[0] + tx[1]) / 2, top + 20.2, Mat.Mithral);
        tassets.push(t);
      }
      const lames: number[] = [];
      for (let k = 0; k < 3; k++) {
        const y0 = top + 13.6 + k * 1.95;
        const w0 = (side ? 9 : 11) + k * 0.5;
        lames.push(plate(c, [[CX - w0, y0], [CX + w0, y0], [CX + w0 + 0.4, y0 + 2], [CX - w0 - 0.4, y0 + 2]], Mat.Mithral));
        for (const s of [-1, 1]) rivet(c, [lames[k]], CX + s * (w0 - 1), y0 + 1, Mat.Mithral);
      }
      const id = poly(c, T(top + 14.2, 0), Mat.Mithral, x0, x1, (X, Y) => (noise(X, Y) < 0.015 ? 1 : 0));
      if (view === "down") {
        thread(c, [CX, top + 1], [CX, top + 13.8], Mat.Mithral, 5, [id]);
        thread(c, [CX + 0.6, top + 1], [CX + 0.6, top + 13.8], Mat.Mithral, 1, [id]);
        // Filigrana: volutas douradas nos cantos do peito.
        for (const s of [-1, 1]) {
          const pts: Pt[] = [];
          for (let a = 0; a < 7; a++) { const r = 2.6 - a * 0.32; pts.push([CX + s * (5.4 + Math.cos(a * 0.9) * r), top + 4.4 + Math.sin(a * 0.9) * r]); }
          for (let i = 1; i < pts.length; i++) thread(c, pts[i - 1], pts[i], Mat.Trim, 4, [id]);
          thread(c, [CX + s * 1.4, top + 9.4], [CX + s * 8.6, top + 11], Mat.Trim, 3, [id]);
        }
      } else if (view === "up") {
        thread(c, [CX, top + 1], [CX, top + 13.8], Mat.Mithral, 1, [id]);
      } else {
        thread(c, [CX - 8.8, top + 5], [CX - 6.4, top + 13.6], Mat.Mithral, 5, [id]);
      }
      // Gorjal: duas lâminas no pescoço.
      for (const k of [0, 1]) plate(c, [[CX - 6 + k, top - 1.4 + k * 1.2], [CX + 6 - k, top - 1.4 + k * 1.2], [CX + 7 - k, top + 0.4 + k * 1.2], [CX - 7 + k, top + 0.4 + k * 1.2]], Mat.Mithral);
      return [id, ...lames, ...tassets];
    }
    default: {
      // Escamas de dragão em fileiras, barra em escamas pontudas, gola de espinhos.
      const hem = (x: number, y: number) => y + 0.5 > top + 21.6 + Math.abs(((x + 0.5) / 1.8) % 1 - 0.5) * 2.4;
      const id = poly(c, T(top + 24, 2), Mat.Dragon, x0, x1, scales(6, 5), hem);
      if (view === "up") {
        for (let k = 0; k < 6; k++) { const y = top + 1 + k * 3.2; plate(c, [[CX - 1, y + 1.6], [CX + 1, y + 1.6], [CX, y - 1.2]], Mat.Horn); }
      } else if (view === "down") {
        // Placa de peito em escama grande, com a borda de chifre.
        const chest = plate(c, [[CX - 6, top + 2], [CX + 6, top + 2], [CX + 4.4, top + 10.4], [CX, top + 12.4], [CX - 4.4, top + 10.4]], Mat.Dragon, scales(9, 7));
        thread(c, [CX - 6, top + 2], [CX, top + 12.4], Mat.Horn, 3, [chest]); thread(c, [CX + 6, top + 2], [CX, top + 12.4], Mat.Horn, 2, [chest]);
      }
      for (const s of side ? [1] : [-1, 1]) for (const k of [3, 5.6]) plate(c, [[CX + s * k - 0.8, top + 0.6], [CX + s * k + 0.8, top + 0.6], [CX + s * (k + 0.6), top - 2.4]], Mat.Horn);
      belt(c, [id], CX, side ? 8.5 : 10.5, top, false);
      return [id];
    }
  }
}

/** Ombros da armadura (depois dos braços). `sides`: −1/1 de frente e de costas; de lado, só o ombro pedido. */
function shouldersCommon(c: Canvas, tier: number, top: number, view: ProtoDir, at: readonly Pt[], far = false) {
  const dk = far ? () => -1 : undefined;
  at.forEach((p, i) => {
    const s = view === "side" ? -1 : i === 0 ? -1 : 1;
    switch (tier) {
      case 1: {
        // Pele de lobo só no ombro esquerdo do herói (direita da tela de frente).
        const leftShoulder = view === "down" ? s > 0 : view === "up" ? s < 0 : !far;
        if (!leftShoulder) return;
        const pelt = c.fill(ebox(p[0], p[1] - 1, 5, 3.8), (x, y) => inEllipse(p[0], p[1] - 1.2, 4.8, 3.4)(x, y) && !furHem(p[1] + 1.2)(x, y), Mat.Fur, sphere(p[0], p[1] - 1.6, 5, 4), fur);
        const paw = ellipse(c, p[0] + (view === "side" ? -1 : s * 1.4), p[1] + 3.6, 1.3, 1.1, Mat.Fur, fur);
        for (const k of [-0.6, 0, 0.6]) c.on(paw, F(p[0] + (view === "side" ? -1 : s * 1.4) + k), F(p[1] + 4.6), Mat.White, 4);
        void pelt;
        return;
      }
      case 2: {
        const id = c.fill(ebox(p[0], p[1], 4, 3), (x, y) => inEllipse(p[0], p[1] - 0.4, 3.8, 2.8)(x, y) && y < p[1] + 1.4, Mat.Bronze, sphere(p[0], p[1] - 1, 4, 3.2), dk);
        for (let X = F(p[0] - 3.6); X <= F(p[0] + 3.6); X++) c.on(id, X, F(p[1] + 1), Mat.Bronze, 5);
        return;
      }
      case 4: {
        // Três conchas sobrepostas com borda dourada.
        for (let k = 2; k >= 0; k--) {
          const cy = p[1] - 1.2 + k * 1.8;
          const id = c.fill(ebox(p[0], cy, 5.6, 3.6), (x, y) => inEllipse(p[0], cy, 5.4 - k * 0.5, 3.4 - k * 0.3)(x, y) && y < cy + 1.6, Mat.Mithral, sphere(p[0], cy - 1, 5.6, 3.8), dk);
          for (let X = F(p[0] - 5); X <= F(p[0] + 5); X++) c.on(id, X, F(cy + 1.4), Mat.Trim, 4);
        }
        return;
      }
      case 5: {
        // Ombreira em crânio de dragão: órbita escura, dentes e um chifre.
        horn(c, [[p[0] + s * 1, p[1] - 2], [p[0] + s * 3.6, p[1] - 5.6], [p[0] + s * 4.4, p[1] - 8.4]], 1.2, far ? -1 : 0);
        const skull = c.fill(ebox(p[0], p[1], 4.8, 3.8), inEllipse(p[0], p[1] - 0.2, 4.6, 3.4), Mat.Dragon, sphere(p[0], p[1] - 1, 4.8, 4), (X, Y) => scales(5, 4)(X, Y) + (far ? -1 : 0));
        const eye = ellipse(c, p[0] + s * 1.2, p[1] - 0.6, 1.2, 0.8, Mat.Eye);
        c.on(eye, F(p[0] + s * 1.2), F(p[1] - 0.6), Mat.Ember, 4);
        for (const k of [-2.4, -1, 0.4, 1.8]) fang(c, [p[0] + k, p[1] + 2.6], 0.35, 1);
        void skull;
        return;
      }
      default:
        return;
    }
  });
}

/** O que a armadura põe nos braços (por cima da manga da classe). */
function armorArmCommon(c: Canvas, tier: number, shoulder: Pt, elbow: Pt, at: Pt, far: boolean) {
  const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
  switch (tier) {
    case 2: {
      const a = lerp(elbow, at, 0.3), b = lerp(elbow, at, 0.82);
      limb(c, a, b, 3.3, 3.2, Mat.Leather, dk(leather));
      return;
    }
    case 3:
      limb(c, shoulder, lerp(elbow, at, 0.18), 4.1, 3.7, Mat.Steel, dk((X, Y) => mail(X, Y) - 1));
      return;
    case 4: {
      const a = lerp(elbow, at, 0.22), b = lerp(elbow, at, 0.84);
      const v = limb(c, a, b, 3.4, 3.2, Mat.Mithral, dk());
      for (let X = F(b[0] - 3.4); X <= F(b[0] + 3.4); X++) c.on(v, X, F(b[1] - 1.4), Mat.Trim, far ? 2 : 4);
      ellipse(c, elbow[0], elbow[1], 2.5, 2.2, Mat.Mithral, dk());
      return;
    }
    case 5:
      limb(c, shoulder, elbow, 4.1, 3.8, Mat.Dragon, dk(scales(5, 4)));
      return;
    default:
      return;
  }
}

/** Nome mostrado no provador para cada arte de item do protótipo. */
export const PROTO_ITEM_NAMES: Record<string, string> = {
  "sword-1": "Espada curta", "sword-2": "Espada de bronze", "sword-3": "Espada longa", "sword-4": "Espada de mithral", "sword-5": "Lâmina do dragão",
  "war-1": "Gorro de couro", "war-2": "Elmo de bronze", "war-3": "Elmo de ferro", "war-4": "Elmo de mithral", "war-5": "Elmo do dragão",
  "armor-1": "Gibão de couro", "armor-2": "Couraça de bronze", "armor-3": "Cota de malha", "armor-4": "Placas de mithral", "armor-5": "Escamas de dragão",
  wolf: "Capuz do Lobo", demon: "Elmo do Demônio",
  "sword-1-magic": "Espada do Juramento", "sword-2-magic": "Lâmina Flamejante", "sword-3-magic": "Vingadora Sagrada", "sword-4-magic": "Espada Dançarina", "sword-5-magic": "Espada Vorpal",
  "war-1-magic": "Gorro do Escudeiro", "war-2-magic": "Elmo do Vigia", "war-3-magic": "Elmo do Brilho", "war-4-magic": "Elmo do Cavaleiro Grifo", "war-5-magic": "Elmo do Demônio",
  "axe-1": "Machadinha", "axe-2": "Machado de bronze", "axe-3": "Machado de batalha", "axe-4": "Machado de mithral", "axe-5": "Grande machado do dragão",
  "axe-1-magic": "Machado do Berserker", "axe-2-magic": "Machado Uivante", "axe-3-magic": "Machado dos Reis Anões", "axe-4-magic": "Machado da Tempestade", "axe-5-magic": "Ruína dos Gigantes",
  "bow-1": "Arco curto", "bow-2": "Arco de caça", "bow-3": "Arco longo", "bow-4": "Arco de mithral", "bow-5": "Arco de osso de dragão",
  "bow-1-magic": "Arco do Caçador Élfico", "bow-2-magic": "Arco do Vento Sul", "bow-3-magic": "Arco Solar", "bow-4-magic": "Arco do Juramento", "bow-5-magic": "Arco de Corda Celestial",
  "xbow-1": "Besta leve", "xbow-2": "Besta de bronze", "xbow-3": "Besta de ferro", "xbow-4": "Besta pesada de mithral", "xbow-5": "Balestra de osso de dragão",
  "xbow-1-magic": "Besta do Sentinela", "xbow-2-magic": "Besta do Caça-Vampiros", "xbow-3-magic": "Besta de Repetição Gnoma", "xbow-4-magic": "Besta Trovejante", "xbow-5-magic": "Balestra do Dragão Rubro",
  "wand-1": "Varinha de salgueiro", "wand-2": "Varinha de bronze", "wand-3": "Varinha rúnica", "wand-4": "Varinha de mithral", "wand-5": "Varinha de dente de dragão",
  "wand-1-magic": "Varinha de Mísseis Mágicos", "wand-2-magic": "Varinha da Bola de Fogo", "wand-3-magic": "Varinha do Mago de Guerra", "wand-4-magic": "Varinha dos Segredos", "wand-5-magic": "Varinha das Maravilhas",
  "staff-1": "Cajado de carvalho", "staff-2": "Cajado de bronze", "staff-3": "Cajado rúnico", "staff-4": "Cajado de mithral", "staff-5": "Cajado de presa de dragão",
  "staff-1-magic": "Cajado da Floresta", "staff-2-magic": "Cajado da Víbora", "staff-3-magic": "Cajado do Poder", "staff-4-magic": "Cajado do Arquimago", "staff-5-magic": "Cajado do Dragão Ancião",
  "arc-1": "Capuz de lã", "arc-2": "Chapéu pontudo", "arc-3": "Capuz rúnico", "arc-4": "Chapéu do mago", "arc-5": "Coroa de chifres de dragão",
  "arc-1-magic": "Capuz do Lobo", "arc-2-magic": "Chapéu do Ilusionista", "arc-3-magic": "Capuz da Clarividência", "arc-4-magic": "Chapéu do Arquimago", "arc-5-magic": "Diadema do Dragão Ancião",
  "robe-1": "Túnica de linho", "robe-2": "Manto de viagem", "robe-3": "Manto rúnico", "robe-4": "Vestes de mithral", "robe-5": "Manto de seda de dragão",
  "robe-1-magic": "Túnica do Aprendiz", "robe-2-magic": "Manto Élfico", "robe-3-magic": "Manto da Proteção", "robe-4-magic": "Manto do Arquimago", "robe-5-magic": "Manto das Estrelas",
  "pants-1": "Calças de linho", "pants-2": "Calças de lã", "pants-3": "Calças rúnicas", "pants-4": "Calças de mithral", "pants-5": "Calças de couro de dragão",
  "pants-1-magic": "Calças do Novato", "pants-2-magic": "Calças de Seda Encantada", "pants-3-magic": "Calças do Vidente", "pants-4-magic": "Calças do Conjurador", "pants-5-magic": "Calças da Asa do Dragão",
  "greave-1": "Calças de couro", "greave-2": "Perneiras de bronze", "greave-3": "Perneiras de malha", "greave-4": "Coxotes de mithral", "greave-5": "Perneiras de escamas de dragão",
  "greave-1-magic": "Calças do Viajante", "greave-2-magic": "Perneiras do Gladiador", "greave-3-magic": "Perneiras de Malha Élfica", "greave-4-magic": "Coxotes do Guardião", "greave-5-magic": "Perneiras do Dragão",
  "boots-1": "Botas de couro", "boots-2": "Botas de bronze", "boots-3": "Grevas de ferro", "boots-4": "Botas de mithral", "boots-5": "Botas de escamas de dragão",
  "boots-1-magic": "Botas Élficas", "boots-2-magic": "Botas do Andarilho", "boots-3-magic": "Botas da Rapidez", "boots-4-magic": "Botas Aladas", "boots-5-magic": "Botas do Dragão Alado",
  "shield-1": "Broquel de madeira", "shield-2": "Escudo de bronze", "shield-3": "Escudo de ferro", "shield-4": "Escudo de mithral", "shield-5": "Escudo do dragão",
  "shield-1-magic": "Broquel do Escudeiro", "shield-2-magic": "Escudo Sentinela", "shield-3-magic": "Escudo Animado", "shield-4-magic": "Escudo da Guarda Arcana", "shield-5-magic": "Escudo do Dragão Ancião",
  "armor-1-magic": "Gibão do Aventureiro", "armor-2-magic": "Couraça do Leão", "armor-3-magic": "Cota Élfica", "armor-4-magic": "Armadura de Placas Anã", "armor-5-magic": "Escamas do Dragão Vermelho",
};

// --- Lote 2: os mágicos de espada, elmo e armadura de guerra (docs/ARTE_ITENS.md) -------

/** Gema lapidada: elipse do material com faceta clara e borda escura. */
export function gem(c: Canvas, at: Pt, r: number, mat: Mat) {
  const id = ellipse(c, at[0], at[1], r, r * 0.9, mat);
  c.on(id, F(at[0] - r * 0.4), F(at[1] - r * 0.4), mat, 5);
  c.on(id, F(at[0] + r * 0.3), F(at[1] + r * 0.3), mat, 1);
  return id;
}

/** Chama em gota subindo de `at`: borda em brasa e miolo âmbar. `lean` entorta a ponta. */
export function flame(c: Canvas, at: Pt, h: number, w: number, lean = 0) {
  const test = (scale: number) => (x: number, y: number) => {
    const v = (at[1] - (y + 0.5)) / (h * scale);
    if (v < -0.15 || v > 1) return false;
    const width = w * scale * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, v * 0.85 + 0.15))), 0.8) * (1 - v * 0.55);
    return Math.abs(x + 0.5 - at[0] - lean * v * v * h) <= width;
  };
  const box: Box = [at[0] - w - Math.abs(lean) * h - 1, at[1] - h - 1, at[0] + w + Math.abs(lean) * h + 1, at[1] + 1];
  c.fill(box, test(1), Mat.Ember, () => 0.72);
  c.fill(box, test(0.55), Mat.Amber, () => 0.95);
}

/** Pena: haste com barbas, do material, ponta clara. */
function feather(c: Canvas, a: Pt, b: Pt, w: number, mat: Mat, stripes?: Mat) {
  const id = limb(c, a, b, w * 0.5, w, mat, stripes ? undefined : (X, Y) => ((X + Y) % 3 === 0 ? -1 : 0));
  thread(c, a, b, mat, 4, [id]);
  if (stripes) {
    const n = 5;
    for (let k = 1; k < n; k++) {
      const p = lerp(a, b, k / n), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      thread(c, [p[0] - (dy / l) * w * 1.2, p[1] + (dx / l) * w * 1.2], [p[0] + (dy / l) * w * 1.2, p[1] - (dx / l) * w * 1.2], stripes, 1, [id]);
    }
  }
  return id;
}

// --- Espadas mágicas -----------------------------------------------------------------

function swordMagic(c: Canvas, at: Pt, tip: Pt, tier: number) {
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, gx = -uy, gy = ux;
  const P = (a: number, g: number): Pt => [at[0] + ux * a + gx * g, at[1] + uy * a + gy * g];
  switch (tier) {
    case 1: {
      // Espada do Juramento (Sword of Life Stealing): aço escuro com um sulco vermelho que corre até a gema da guarda,
      // gota de sangue gravada e a fita do juramento amarrada no pomo.
      const b = blade(c, P(3.4, 0), tip, taper(2, 1.8, 0.8), Mat.Iron, 0, 0);
      for (let t = 0.04; t < 0.74; t += 0.01) { const p = lerp(P(3.4, 0), tip, t); c.on(b, F(p[0]), F(p[1]), Mat.Ember, t < 0.2 ? 4 : 2); c.on(b, F(p[0]) + 1, F(p[1]), Mat.Ember, 1); }
      const drop = lerp(P(3.4, 0), tip, 0.3);
      plate(c, [[drop[0] - 0.8, drop[1] + 0.3], [drop[0], drop[1] - 1.4], [drop[0] + 0.8, drop[1] + 0.3], [drop[0], drop[1] + 1.1]], Mat.Ember);
      limb(c, P(3, -3.2), P(3, 3.2), 0.8, 0.8, Mat.Iron);
      gem(c, P(3, 0), 1, Mat.Ember);
      grip(c, P(-3, 0), P(2.4, 0), 1.05, Mat.Leather, Mat.Ember);
      const pm = ellipse(c, ...P(-3.8, 0), 1.2, 1.2, Mat.Iron);
      void pm;
      for (const s of [-1, 1]) chain(c, [P(-4.2, s * 0.4), P(-5.6, s * 1.4 + 1), P(-6.4, s * 0.8 + 2.8), P(-7.6, s * 1.6 + 3.6)], 0.5, Mat.Crest, undefined, 0.35);
      return;
    }
    case 2: {
      // Lâmina Flamejante (Flame Tongue): lâmina ondulada de bronze escurecido com chamas subindo do gume.
      const w = (t: number) => (t > 0.86 ? 2.2 * (1 - t) / 0.14 + 0.12 : 1.7 + Math.sin(t * Math.PI * 7) * 0.45);
      blade(c, P(3.4, 0), tip, w, Mat.Steel, 0, 0.75, (X, Y) => (noise(X, Y) < 0.08 ? -1 : 0));
      const g = chain(c, [P(4.2, -3.4), P(3, -1.4), P(2.8, 0), P(3, 1.4), P(4.2, 3.4)], 0.8, Mat.Bronze, undefined, 0.8);
      void g;
      grip(c, P(-2.8, 0), P(2.4, 0), 1.05, Mat.Leather, Mat.Bronze);
      gem(c, P(-3.8, 0), 1.2, Mat.Ember);
      for (let t = 0.12; t < 0.9; t += 0.13) {
        const p = lerp(P(3.4, 0), tip, t);
        for (const s of [-1, 1]) flame(c, [p[0] + gx * s * 2.2, p[1] + gy * s * 2.2], 3.6 + noise(t * 10, s) * 2.2, 1.25, s * 0.18);
      }
      return;
    }
    case 3: {
      // Vingadora Sagrada (Holy Avenger): lâmina larga de prata com sulco dourado, guarda em asas de anjo,
      // sol no centro e brilhos de luz em volta.
      const b = blade(c, P(3.6, 0), tip, taper(2.2, 1.7, 0.88), Mat.Mithral, 0, 0);
      for (let t = 0.04; t < 0.78; t += 0.008) { const p = lerp(P(3.6, 0), tip, t); c.on(b, F(p[0]), F(p[1]), Mat.Trim, 4); c.on(b, F(p[0]) + 1, F(p[1]), Mat.Trim, 2); }
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) feather(c, P(3.2, s * 1.4), P(2.2 - k * 1.2, s * (6.4 - k * 0.6)), 0.8, Mat.White, undefined);
      const sun = gem(c, P(3, 0), 1.6, Mat.Trim);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; thread(c, [P(3, 0)[0] + Math.cos(a) * 1.8, P(3, 0)[1] + Math.sin(a) * 1.8], [P(3, 0)[0] + Math.cos(a) * 2.8, P(3, 0)[1] + Math.sin(a) * 2.8], Mat.Trim, 5); }
      void sun;
      grip(c, P(-3.4, 0), P(2.2, 0), 1, Mat.White, Mat.Trim);
      gem(c, P(-4.4, 0), 1.3, Mat.Sapphire);
      // Brilhos em cruz ao longo da lâmina.
      for (const t of [0.25, 0.55, 0.85]) {
        const p = lerp(P(3.6, 0), tip, t), q: Pt = [p[0] + gx * 3.4 * (t > 0.5 ? -1 : 1), p[1] + gy * 3.4];
        for (let k = -2; k <= 2; k++) { c.px(F(q[0]) + k, F(q[1]), Mat.White, Math.abs(k) === 2 ? 3 : 5); c.px(F(q[0]), F(q[1]) + k, Mat.White, Math.abs(k) === 2 ? 3 : 5); }
      }
      return;
    }
    case 5: {
      // Espada Vorpal: obsidiana negra com o gume em violeta e um crânio na guarda; o rastro roxo acompanha o fio.
      const guard: Pt = P(3, 0);
      const b = blade(c, guard, tip, (t) => (t > 0.88 ? 2.4 * (1 - t) / 0.12 + 0.1 : 2.4 - t * 0.6), Mat.Iron, -0.03, 0.8);
      const bl = Math.hypot(tip[0] - guard[0], tip[1] - guard[1]);
      for (let t = 0.02; t < 0.95; t += 0.004) {
        const p = lerp(guard, tip, t), w = t > 0.88 ? 2.4 * (1 - t) / 0.12 : 2.4 - t * 0.6, bend = -0.03 * bl * t * t;
        c.on(b, F(p[0] + gx * (w - 0.2 + bend)), F(p[1] + gy * (w - 0.2 + bend)), Mat.Gem, 5);
        c.on(b, F(p[0] + gx * (w - 0.6 + bend)), F(p[1] + gy * (w - 0.6 + bend)), Mat.Gem, 3);
        if (noise(t * 300, 1) < 0.35) c.px(F(p[0] + gx * (w + 1.2 + bend + noise(t * 200, 2) * 1.6)), F(p[1] + gy * (w + 1.2 + bend)), Mat.Gem, 2);
      }
      for (const s of [-1, 1]) chain(c, [P(3, s * 0.8), P(2.4, s * 3.4), P(0.6, s * 5.2)], 0.75, Mat.Iron, undefined, 0.3);
      const skull = ellipse(c, guard[0], guard[1], 1.9, 1.7, Mat.White);
      for (const s of [-1, 1]) { c.on(skull, F(guard[0] + s * 0.7), F(guard[1] - 0.2), Mat.Eye, 0); c.on(skull, F(guard[0] + s * 0.7), F(guard[1]), Mat.Gem, 4); }
      c.on(skull, F(guard[0]), F(guard[1] + 1), Mat.Eye, 0);
      grip(c, P(-6.4, 0), P(1.6, 0), 1.1, Mat.Iron, Mat.Gem);
      gem(c, P(-7.2, 0), 1.3, Mat.Gem);
      return;
    }
    default:
      return;
  }
}

/** Espada Dançarina (Dancing Sword): rapieira de guarda em fita espiral flutuando sozinha ao lado do herói, com rastro. */
function dancingSword(c: Canvas, hilt: Pt, tip: Pt) {
  const dx = tip[0] - hilt[0], dy = tip[1] - hilt[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, gx = -uy, gy = ux;
  // Rastro: duas cópias apagadas atrás, em pontilhado.
  for (const k of [2.4, 1.2]) {
    const off: Pt = [-gx * k * 1.4 - ux * k * 0.4, -gy * k * 1.4 - uy * k * 0.4];
    c.fill([Math.min(hilt[0], tip[0]) - 6, Math.min(hilt[1], tip[1]) - 6, Math.max(hilt[0], tip[0]) + 6, Math.max(hilt[1], tip[1]) + 6], (x, y, X, Y) => {
      const s = seg(x + 0.5, y + 0.5, [hilt[0] + off[0] + ux * 3, hilt[1] + off[1] + uy * 3], [tip[0] + off[0], tip[1] + off[1]]);
      return s.d < 0.8 && BAYER[(Y & 1) * 2 + (X & 1)] < (k > 2 ? 0.3 : 0.55);
    }, Mat.Mithral, () => 0.9);
  }
  blade(c, [hilt[0] + ux * 3, hilt[1] + uy * 3], tip, taper(0.95, 0.7, 0.9), Mat.Mithral, 0, 0.6);
  // Guarda em fita espiral dourada.
  const pts: Pt[] = [];
  for (let k = 0; k <= 14; k++) { const a = (k / 14) * Math.PI * 2.2; pts.push([hilt[0] + ux * (1 + k * 0.18) + gx * Math.cos(a) * 2.6, hilt[1] + uy * (1 + k * 0.18) + gy * Math.cos(a) * 2.6 - Math.sin(a) * 0.6]); }
  chain(c, pts, 0.38, Mat.Trim);
  grip(c, [hilt[0] - ux * 3.6, hilt[1] - uy * 3.6], [hilt[0] + ux * 1.6, hilt[1] + uy * 1.6], 0.8, Mat.Iron, Mat.Trim);
  gem(c, [hilt[0] - ux * 4.4, hilt[1] - uy * 4.4], 1, Mat.Sapphire);
  // Riscos de movimento.
  for (const k of [-1, 1]) thread(c, [hilt[0] + gx * k * 4 + ux * 6, hilt[1] + gy * k * 4 + uy * 6], [hilt[0] + gx * k * 4.6 + ux * 11, hilt[1] + gy * k * 4.6 + uy * 11], Mat.White, (j) => (j % 4 < 2 ? 4 : -1));
}

// --- Elmos mágicos -------------------------------------------------------------------

function warHelmetMagic(c: Canvas, tier: number, view: ProtoDir, cx: number, cy: number, top: number) {
  switch (tier) {
    case 1: {
      // Gorro do Escudeiro: o gorro de couro com pena de faisão listrada e o brasão costurado na testa.
      cap1(c, view, cx, cy);
      const base: Pt = view === "side" ? [cx + 4, cy - 6] : view === "up" ? [cx - 6, cy - 6] : [cx + 6, cy - 6];
      const dir = view === "up" ? -1 : 1;
      feather(c, base, [base[0] + dir * 5, base[1] - 8], 0.9, Mat.Bronze, Mat.Leather);
      feather(c, [base[0], base[1] + 0.6], [base[0] + dir * 7, base[1] - 5], 0.75, Mat.Crest, Mat.Leather);
      if (view !== "up") {
        const ox = view === "side" ? cx - 4 : cx;
        const crest = plate(c, [[ox - 1.8, cy - 8], [ox + 1.8, cy - 8], [ox + 1.6, cy - 5.6], [ox, cy - 4.4], [ox - 1.6, cy - 5.6]], Mat.Primary);
        thread(c, [ox - 1.8, cy - 8], [ox + 1.8, cy - 8], Mat.Trim, 4, [crest]);
        thread(c, [ox, cy - 7.6], [ox, cy - 4.8], Mat.Trim, 4, [crest]);
      }
      return;
    }
    case 2: {
      // Elmo do Vigia: cara de corujurso — disco de penas em volta de dois olhos enormes, bico de chifre, tufos de orelha
      // e pelo de urso na nuca.
      const ox = view === "side" ? cx + 0.6 : cx;
      if (view !== "side") for (const s of [-1, 1]) plate(c, [[ox + s * 4, cy - 8], [ox + s * 8.6, cy - 15.6], [ox + s * 8.2, cy - 7.4]], Mat.Fur, fur);
      else plate(c, [[ox + 1, cy - 8], [ox + 4.6, cy - 16], [ox + 5.6, cy - 7]], Mat.Fur, fur);
      const shell = c.fill(ebox(ox, cy, 10.2, 11), (x, y) => inEllipse(ox, cy - 0.2, 9.8, 10.6)(x, y) && (view !== "down" || !(Math.abs(x + 0.5 - ox) < 3.4 && y > cy + 6)),
        Mat.Fur, sphere(ox, cy - 1, 10.2, 11), fur);
      void shell;
      if (view === "up") return;
      if (view === "down") {
        for (const s of [-1, 1]) {
          const disk = c.fill(ebox(ox + s * 4, cy + 0.6, 4.6, 4.6), inEllipse(ox + s * 4, cy + 0.6, 4.4, 4.4), Mat.FurLight, sphere(ox + s * 4, cy, 4.6, 4.6),
            (X, Y) => { const a = Math.atan2(Y - F(cy + 0.6), X - F(ox + s * 4)); return Math.round(a * 6) % 2 ? -1 : 0; });
          void disk;
          const eye = ellipse(c, ox + s * 4, cy + 0.6, 2.2, 2.2, Mat.Amber);
          ellipse(c, ox + s * 4, cy + 0.8, 1, 1.2, Mat.Eye);
          c.on(eye, F(ox + s * 4 - 1), F(cy - 0.4), Mat.White, 5);
          thread(c, [ox + s * 1.2, cy - 3], [ox + s * 7.6, cy - 4.4], Mat.Fur, 0);
        }
        plate(c, [[ox - 1.6, cy + 1.6], [ox + 1.6, cy + 1.6], [ox + 0.6, cy + 6.4], [ox, cy + 7.4], [ox - 0.6, cy + 6.4]], Mat.Horn);
      } else {
        const disk = c.fill(ebox(ox - 4.6, cy + 0.6, 4, 4.4), inEllipse(ox - 4.6, cy + 0.6, 3.6, 4.4), Mat.FurLight, sphere(ox - 4.6, cy, 4, 4.6));
        void disk;
        ellipse(c, ox - 5.6, cy + 0.6, 1.6, 2, Mat.Amber);
        ellipse(c, ox - 6, cy + 0.8, 0.8, 1.2, Mat.Eye);
        plate(c, [[ox - 8.4, cy + 2], [ox - 12.2, cy + 3.6], [ox - 11.4, cy + 6.4], [ox - 8.2, cy + 5]], Mat.Horn);
      }
      return;
    }
    case 3: {
      // Elmo do Brilho (Helm of Brilliance): o elmo de ferro cravejado de diamantes, rubis, opalas de fogo e opalas,
      // com chamas leves na coroa.
      cap3(c, view, cx, cy, top);
      const ox = view === "side" ? cx + 0.6 : cx;
      const mats = [Mat.White, Mat.Ember, Mat.Amber, Mat.Sapphire];
      const band = view === "side" ? [-8, -4.6, -1.2, 2.2, 5.6, 8.6] : [-8, -5.4, -2.7, 0, 2.7, 5.4, 8];
      band.forEach((k, i) => gem(c, [ox + k, cy - 2.2], 1.05, mats[i % 4]));
      for (const [k, y] of [[0, -12], [-2.6, -9], [2.6, -9]] as const) if (view !== "side" || k <= 0) gem(c, [ox + k, cy + y], 1.15, mats[(Math.round(Math.abs(k)) + 1) % 4]);
      for (const k of view === "side" ? [-5, 0, 5] : [-6.4, -3.2, 0, 3.2, 6.4]) flame(c, [ox + k, cy - 6.6 - Math.max(0, 6 - Math.abs(k)) * 1.1], 3.6, 1, 0.12);
      return;
    }
    case 4: {
      // Elmo do Cavaleiro Grifo: viseira em bico de grifo, sobrancelhas de pena e asas abrindo nas laterais.
      const ox = view === "side" ? cx + 0.4 : cx;
      const wing = (s: number, far: boolean) => {
        for (let k = 0; k < 6; k++) {
          const base: Pt = [ox + s * 7.6, cy - 4 + k * 0.6];
          const tip: Pt = [ox + s * (14 - k * 0.4), cy - 15 + k * 2.4];
          feather(c, base, tip, 1.05 - k * 0.06, k % 2 ? Mat.White : Mat.Linen);
          if (far) void 0;
        }
      };
      if (view === "side") wing(1, true);
      else for (const s of [-1, 1]) wing(s, false);
      const shell = c.fill(ebox(ox, cy, 10, 11), (x, y) => inEllipse(ox, cy - 0.4, 9.6, 10.6)(x, y), Mat.Mithral, sphere(ox, cy - 1, 10, 11), (X, Y) => (noise(X, Y) < 0.02 ? 1 : 0));
      if (view === "up") { thread(c, [ox, cy - 10], [ox, cy + 10], Mat.Trim, 4, [shell]); return; }
      if (view === "down") {
        for (const s of [-1, 1]) {
          c.fill([ox + Math.min(s, s * 7) - 0.5, cy + 0.4, ox + Math.max(s, s * 7) + 0.5, cy + 2.6], (x, y) => { const d = (x + 0.5 - ox) * s; return d > 1.6 && d < 7 && Math.abs(y + 0.5 - (cy + 1.4 + (d - 4) * 0.12)) < 0.8; }, Mat.Eye, () => 0.1);
          for (let k = 0; k < 5; k++) feather(c, [ox + s * (1.4 + k * 1.3), cy - 1.6], [ox + s * (2.6 + k * 1.4), cy - 3.4 - (k % 2) * 0.6], 0.55, Mat.Trim);
        }
        // Bico de grifo descendo sobre o rosto.
        plate(c, [[ox - 2.4, cy - 1.4], [ox + 2.4, cy - 1.4], [ox + 1.6, cy + 6.4], [ox, cy + 9.4], [ox - 1.6, cy + 6.4]], Mat.Trim);
        thread(c, [ox - 1.4, cy + 4], [ox + 1.4, cy + 4], Mat.Trim, 1);
      } else {
        c.fill([ox - 9.6, cy + 0.4, ox - 3, cy + 2.6], (x, y) => x + 0.5 > ox - 8.6 && x + 0.5 < ox - 3.6 && Math.abs(y + 0.5 - (cy + 1.4)) < 0.8, Mat.Eye, () => 0.1);
        for (let k = 0; k < 4; k++) feather(c, [ox - 8.6 + k * 1.4, cy - 1.6], [ox - 7.4 + k * 1.6, cy - 3.6], 0.55, Mat.Trim);
        plate(c, [[ox - 8.8, cy - 1.4], [ox - 13.6, cy + 2.6], [ox - 12.4, cy + 6], [ox - 8.6, cy + 4.6]], Mat.Trim);
        wing(-1, false);
      }
      return;
    }
    default:
      if (view === "down") demonFront(c, cy);
      else if (view === "up") demonBack(c, cy);
      else demonSide(c, cx, cy);
  }
}

// --- Armaduras mágicas ---------------------------------------------------------------

function armorMagicTorso(c: Canvas, tier: number, top: number, view: ProtoDir, sway: number): number[] {
  const side = view === "side";
  const T = (bottom: number, flare: number) => (side ? TORSO_SIDE(top, bottom, flare, sway * 0.4) : TORSO_FRONT(top, bottom, flare));
  const x0 = side ? CX - 10 : CX - 13, x1 = side ? CX + 10 : CX + 13;
  switch (tier) {
    case 1: {
      // Gibão do Aventureiro: couro com camisa de linho na gola, bandoleira de bolsinhos, mapa enrolado e a bolsa de
      // carga (Bag of Holding) com o brilho roxo saindo da boca.
      const id = poly(c, T(top + 21, 1.2), Mat.Leather, x0, x1, leather);
      if (!side && view === "down") plate(c, [[CX - 3, top - 0.4], [CX + 3, top - 0.4], [CX, top + 4]], Mat.Linen);
      const a: Pt = side ? [CX + 4, top + 0.6] : view === "down" ? [CX - 9.6, top + 1] : [CX + 9.6, top + 1];
      const b: Pt = side ? [CX - 6.4, top + 13] : view === "down" ? [CX + 10, top + 14] : [CX - 10, top + 14];
      quiverStrap(c, [id], a, b);
      if (view !== "up") for (const t of [0.2, 0.45, 0.7]) {
        const p = lerp(a, b, t);
        const bag = plate(c, [[p[0] - 1.3, p[1] - 0.2], [p[0] + 1.3, p[1] - 0.2], [p[0] + 1.1, p[1] + 2.2], [p[0] - 1.1, p[1] + 2.2]], Mat.Leather, leather);
        thread(c, [p[0] - 1.3, p[1] + 0.6], [p[0] + 1.3, p[1] + 0.6], Mat.Leather, 0, [bag]);
        rivet(c, [bag], p[0], p[1] + 1, Mat.Bronze);
      }
      if (view === "down") {
        // Mapa enrolado e bolsa de carga no quadril.
        const map = limb(c, [CX + 5.6, top + 11], [CX + 9.6, top + 8.6], 0.9, 0.9, Mat.Linen);
        thread(c, [CX + 7, top + 10.6], [CX + 7.4, top + 9], Mat.Crest, 2, [map]);
        const bx = CX - 7.6, by = top + 17.6;
        const bag = c.fill(ebox(bx, by, 3, 3), inEllipse(bx, by, 2.6, 2.8), Mat.Primary, sphere(bx, by - 0.6, 3, 3), linen);
        thread(c, [bx - 1.6, by - 2.2], [bx + 1.6, by - 2.2], Mat.Trim, 4, [bag]);
        for (let k = 0; k < 6; k++) c.px(F(bx - 1 + k * 0.4), F(by - 3 - (k % 3) * 0.6), Mat.Gem, k % 2 ? 5 : 3);
      }
      return [id];
    }
    case 2: {
      // Couraça do Leão: couraça dourada com a cabeça do leão no peito; a juba vira as ombreiras.
      const skirt = armorTorsoCommon(c, 2, top, view, sway)[1];
      const id = poly(c, T(top + 13.8, 0), Mat.Trim, x0, x1, (X, Y) => (noise(X >> 1, Y >> 1) < 0.04 ? -1 : 0));
      for (let X = F(x0); X <= F(x1); X++) { c.on(id, X, F(top), Mat.Trim, 5); c.on(id, X, F(top + 13.4), Mat.Trim, 1); }
      if (view === "down") {
        const fx = CX, fy = top + 6.6;
        const mane = c.fill(ebox(fx, fy, 5, 5), (x, y, X, Y) => {
          const d = Math.hypot(x + 0.5 - fx, (y + 0.5 - fy) * 1.05);
          return d < 4.4 + (Math.round(Math.atan2(Y - F(fy), X - F(fx)) * 4) % 2 ? 0.6 : 0);
        }, Mat.Mane, sphere(fx, fy - 1, 5, 5), (X, Y) => (Math.round(Math.atan2(Y - F(fy), X - F(fx)) * 8) % 2 ? -1 : 0));
        const face = c.fill(ebox(fx, fy + 0.4, 2.8, 3.2), inEllipse(fx, fy + 0.4, 2.6, 3), Mat.Trim, sphere(fx, fy - 0.4, 3, 3.2));
        for (const s of [-1, 1]) { c.on(face, F(fx + s * 1.1), F(fy - 0.6), Mat.Eye, 0); c.on(face, F(fx + s * 1.1) + (s < 0 ? -1 : 1), F(fy - 0.6), Mat.Eye, 0); }
        plate(c, [[fx - 0.9, fy + 0.8], [fx + 0.9, fy + 0.8], [fx, fy + 1.8]], Mat.Horn);
        thread(c, [fx - 1.2, fy + 2.6], [fx + 1.2, fy + 2.6], Mat.Eye, 0, [face]);
        void mane;
      } else if (view === "up") {
        thread(c, [CX, top + 1], [CX, top + 13], Mat.Trim, 1, [id]);
      }
      return [id, skirt];
    }
    case 3: {
      // Cota Élfica (Elven Chain): malha fina prateada até o meio da coxa, barra em pontas de folha, faixa verde.
      const hem = (x: number, y: number) => y + 0.5 > top + 21 + Math.abs(((x + 0.5) / 2.2) % 1 - 0.5) * 3.6;
      const id = poly(c, T(top + 23, 1.6), Mat.Mithral, x0, x1, (X, Y) => mail(X, Y) - 1, hem);
      if (view !== "up" && !side) for (let y = top + 1.6; y < top + 12; y += 2.4) { leaf(c, [CX - 1.2, y], 2.6, 1.3, 0.6); leaf(c, [CX + 1.2, y + 1.2], 0.5, 1.3, 0.6); }
      if (!side) thread(c, [CX, top + 0.6], [CX, top + 12.6], Mat.Leaf, 1, [id]);
      for (let x = CX - 12; x <= CX + 12; x += 2.2) thread(c, [x + 1.1, top + 21.2], [x + 1.1, top + 22.6], Mat.Mithral, 5, [id]);
      for (let X = F(x0); X <= F(x1); X++) for (let k = 0; k < 4; k++) c.on([id], X, F(top + 13) + k, Mat.Leaf, k === 0 ? 4 : k === 3 ? 1 : 3);
      if (!side) for (const k of [-4, 4]) leaf(c, [CX + k, top + 3.4], k < 0 ? 2.4 : 0.7, 1.6, 0.8, Mat.Mithral);
      return [id];
    }
    case 4: {
      // Armadura de Placas Anã: placas grossas de ferro com faixas douradas, rosto de rei anão em relevo no peito
      // (a barba trançada desce até a cintura) e runas acesas.
      const ids = armorTorsoCommon(c, 4, top, view, sway);
      c.recolor(ids, Mat.Iron);
      const plateId = poly(c, T(top + 14.2, 0), Mat.Iron, x0, x1, hammered);
      for (let X = F(x0); X <= F(x1); X++) { for (const y of [top + 0.4, top + 13.6]) { c.on(plateId, X, F(y), Mat.Trim, 4); c.on(plateId, X, F(y) + 1, Mat.Trim, 2); } }
      if (view === "down") {
        const fy = top + 4.2;
        const face = c.fill(ebox(CX, fy, 3.4, 3), inEllipse(CX, fy, 3.2, 2.8), Mat.Trim, sphere(CX, fy - 0.8, 3.4, 3));
        thread(c, [CX - 2.6, fy - 1], [CX - 0.6, fy - 0.4], Mat.Trim, 1, [face]); thread(c, [CX + 2.6, fy - 1], [CX + 0.6, fy - 0.4], Mat.Trim, 1, [face]);
        for (const s of [-1, 1]) c.on(face, F(CX + s * 1.3), F(fy), Mat.Sapphire, 5);
        plate(c, [[CX - 0.7, fy - 0.2], [CX + 0.7, fy - 0.2], [CX + 0.9, fy + 1.6], [CX - 0.9, fy + 1.6]], Mat.Trim);
        // Bigode e barba em duas tranças com anéis.
        for (const s of [-1, 1]) chain(c, [[CX + s * 0.4, fy + 1.8], [CX + s * 2.4, fy + 2.4], [CX + s * 3.2, fy + 3.6]], 0.6, Mat.Trim, undefined, 0.3);
        for (const s of [-1, 1]) {
          const br = chain(c, [[CX + s * 0.8, fy + 2.4], [CX + s * 1.2, fy + 6], [CX + s * 0.9, top + 13.2]], 0.85, Mat.Trim, (X, Y) => ((Y + X * s) % 3 === 0 ? -1 : 0), 0.6);
          void br;
          limb(c, [CX + s * 1.1, top + 11], [CX + s * 1.1, top + 11.8], 0.95, 0.95, Mat.Iron);
        }
        for (const [rx, ry] of [[-6.6, 3.4], [6.6, 3.4], [-7, 9], [7, 9]] as const) {
          const g = [[0, -1], [0, 0], [0, 1], [1, -1], [-1, 1]];
          for (const [ddx, ddy] of g) c.on(plateId, F(CX + rx) + ddx, F(top + ry) + ddy, Mat.Sapphire, 5);
        }
      } else if (view === "up") {
        for (const y of [3, 7, 11]) thread(c, [CX - 9, top + y], [CX + 9, top + y], Mat.Iron, 1, [plateId]);
      }
      return [plateId, ...ids.slice(1)];
    }
    default: {
      // Escamas do Dragão Vermelho (Dragon Scale Mail): escamas vermelhas vivas com brasa entre elas, placa de peito
      // com chama e asinhas nas costas.
      if (view !== "down") {
        for (const s of side ? [1] : [-1, 1]) {
          const base: Pt = [CX + (side ? 6 : s * 4), top + 3];
          const tipW: Pt = [CX + (side ? 16 : s * 15), top - 8];
          chain(c, [base, [base[0] + (tipW[0] - base[0]) * 0.5, base[1] - 7], tipW], 0.8, Mat.Horn, undefined, 0.4);
          plate(c, [base, tipW, [CX + (side ? 15 : s * 14.4), top - 2], [CX + (side ? 12.6 : s * 11.4), top + 1.6], [CX + (side ? 11 : s * 10), top + 6], [CX + (side ? 8 : s * 6.4), top + 7]], Mat.RedDragon, (X, Y) => ((X + Y) % 5 === 0 ? -1 : 0));
        }
      }
      const hem = (x: number, y: number) => y + 0.5 > top + 21.6 + Math.abs(((x + 0.5) / 1.8) % 1 - 0.5) * 2.4;
      const id = poly(c, T(top + 24, 2), Mat.RedDragon, x0, x1, (X, Y) => { const v = scales(6, 5)(X, Y); return v < 0 && noise(X >> 1, Y) < 0.25 ? 0 : v; }, hem);
      // Brasa entre as escamas.
      for (let Y = F(top + 2); Y < F(top + 22); Y++) for (let X = F(x0); X <= F(x1); X++) if (Y % 5 === 4 && noise(X >> 1, Y) < 0.18) c.on([id], X, Y, Mat.Ember, 4);
      if (view === "down") {
        const chest = plate(c, [[CX - 6, top + 2], [CX + 6, top + 2], [CX + 4.4, top + 10.4], [CX, top + 12.4], [CX - 4.4, top + 10.4]], Mat.Dragon, scales(9, 7));
        thread(c, [CX - 6, top + 2], [CX, top + 12.4], Mat.Horn, 3, [chest]); thread(c, [CX + 6, top + 2], [CX, top + 12.4], Mat.Horn, 2, [chest]);
        flame(c, [CX, top + 9.6], 5, 1.6, 0);
      }
      for (const s of side ? [1] : [-1, 1]) for (const k of [2.6, 4.6, 6.6]) plate(c, [[CX + s * k - 0.8, top + 0.6], [CX + s * k + 0.8, top + 0.6], [CX + s * (k + 0.6), top - 3]], Mat.Horn);
      belt(c, [id], CX, side ? 8.5 : 10.5, top, false);
      return [id];
    }
  }
}

function shouldersMagic(c: Canvas, tier: number, top: number, view: ProtoDir, at: readonly Pt[], far: boolean) {
  at.forEach((p, i) => {
    const s = view === "side" ? -1 : i === 0 ? -1 : 1;
    const dk: Offset = (X, Y) => (far ? -1 : 0) + fur(X, Y);
    switch (tier) {
      case 1: {
        // Rolo de corda num ombro.
        if (view === "side" ? far : s < 0) return;
        for (let k = 0; k < 3; k++) {
          const ring = c.fill(ebox(p[0], p[1] - 0.6 + k * 0.6, 4, 2.4), (x, y) => { const d = Math.hypot((x + 0.5 - p[0]) / 3.6, (y + 0.5 - (p[1] - 0.6 + k * 0.6)) / 2.2); return d < 1 && d > 0.62; },
            Mat.Linen, (x) => lit((x + 0.5 - p[0]) / 4, -0.3, 0.8), (X, Y) => ((X + Y) % 3 === 0 ? -1 : 0));
          void ring;
        }
        return;
      }
      case 2: {
        // Juba do leão caindo sobre os ombros.
        c.fill(ebox(p[0], p[1] + 1, 5.2, 4.6), (x, y) => inEllipse(p[0], p[1] + 0.6, 4.8, 4)(x, y) && !furHem(p[1] + 2.6)(x, y), Mat.Mane, sphere(p[0], p[1] - 0.6, 5, 4.4), dk);
        return;
      }
      case 3: {
        leaf(c, [p[0], p[1] - 0.4], s < 0 ? 2.6 : 0.5, 2.4, 1.2, Mat.Mithral);
        return;
      }
      case 4: {
        // Ombreiras redondas de ferro com aro dourado e rebites.
        const id = c.fill(ebox(p[0], p[1], 5.2, 4.2), (x, y) => inEllipse(p[0], p[1] - 0.2, 5, 3.8)(x, y) && y < p[1] + 2.2, Mat.Iron, sphere(p[0], p[1] - 1.2, 5.2, 4.2), (X, Y) => (far ? -1 : 0) + hammered(X, Y));
        for (let X = F(p[0] - 4.6); X <= F(p[0] + 4.6); X++) c.on(id, X, F(p[1] + 1.8), Mat.Trim, far ? 2 : 4);
        for (const k of [-3, 0, 3]) rivet(c, [id], p[0] + k, p[1] - 0.6, Mat.Trim);
        return;
      }
      default: {
        shouldersCommon(c, 5, top, view, [p], far);
        horn(c, [[p[0] + s * 0.4, p[1] - 1.6], [p[0] + s * 2, p[1] - 6.6], [p[0] + s * 1, p[1] - 10.4]], 1.3, far ? -1 : 0);
        return;
      }
    }
  });
}

function armMagic(c: Canvas, tier: number, shoulder: Pt, elbow: Pt, at: Pt, far: boolean) {
  const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
  switch (tier) {
    case 1: {
      const a = lerp(elbow, at, 0.3), b = lerp(elbow, at, 0.82);
      limb(c, a, b, 3.3, 3.2, Mat.Leather, dk(leather));
      return;
    }
    case 2: armorArmCommon(c, 2, shoulder, elbow, at, far); return;
    case 3: limb(c, shoulder, lerp(elbow, at, 0.5), 3.9, 3.4, Mat.Mithral, dk((X, Y) => ((X + (Y % 2)) % 2 === 0 ? -1 : 0))); return;
    case 4: {
      const a = lerp(elbow, at, 0.2), b = lerp(elbow, at, 0.86);
      const v = limb(c, a, b, 3.6, 3.4, Mat.Iron, dk(hammered));
      for (const t of [0.2, 0.8]) { const p = lerp(a, b, t); for (let X = F(p[0] - 3.6); X <= F(p[0] + 3.6); X++) c.on(v, X, F(p[1]), Mat.Trim, far ? 2 : 4); }
      return;
    }
    default: {
      limb(c, shoulder, elbow, 4.1, 3.8, Mat.RedDragon, dk(scales(5, 4)));
      for (const t of [0.3, 0.7]) { const p = lerp(elbow, at, t); plate(c, [[p[0] + 2.4, p[1] - 0.8], [p[0] + 2.4, p[1] + 0.8], [p[0] + 4.8, p[1] - 0.6]], Mat.Horn); }
      return;
    }
  }
}

// --- Despacho por id -----------------------------------------------------------------

const isMagic = (id: string) => id.endsWith("-magic");

function armorTorso(c: Canvas, id: string, top: number, view: ProtoDir, sway: number): number[] {
  if (id.startsWith("robe-")) return robeTorso(c, id, top, view, sway);
  return isMagic(id) ? armorMagicTorso(c, tierOf(id), top, view, sway) : armorTorsoCommon(c, tierOf(id), top, view, sway);
}
function armorShoulders(c: Canvas, id: string, top: number, view: ProtoDir, at: readonly Pt[], far = false) {
  if (id.startsWith("robe-")) robeShoulders(c, id, top, view, at, far);
  else if (isMagic(id)) shouldersMagic(c, tierOf(id), top, view, at, far);
  else shouldersCommon(c, tierOf(id), top, view, at, far);
}
function armorArm(c: Canvas, id: string, shoulder: Pt, elbow: Pt, at: Pt, far: boolean) {
  if (id.startsWith("robe-")) robeArm(c, id, shoulder, elbow, at, far);
  else if (isMagic(id)) armMagic(c, tierOf(id), shoulder, elbow, at, far);
  else armorArmCommon(c, tierOf(id), shoulder, elbow, at, far);
}
/** A armadura deixa o cinto da classe por cima? */
const keepsBelt = (id: string) => !id.startsWith("robe-") && (isMagic(id) ? [false, true, false, false, false, false] : [false, true, false, true, false, true])[tierOf(id)];

function helmetArt(c: Canvas, id: string, view: ProtoDir, cx: number, cy: number, top: number) {
  if (id.startsWith("arc-")) arcaneHat(c, id, view, cx, cy, top);
  else if (isMagic(id)) warHelmetMagic(c, tierOf(id), view, cx, cy, top);
  else warHelmet(c, tierOf(id), view, cx, cy, top);
}

/** A espada do id na mão `at` apontando para `tip` (a Dançarina não vai na mão: ver `dancingSword`). */
function swordById(c: Canvas, id: string, at: Pt, tip: Pt) {
  if (isMagic(id)) swordMagic(c, at, tip, tierOf(id));
  else swordArt(c, at, tip, tierOf(id));
}

// --- Lote 3: machados (docs/ARTE_ITENS.md) ---------------------------------------------

/** Pedra lascada: manchas e lascas claras. */
export const stone: Offset = (X, Y) => (noise(X >> 1, Y >> 1) < 0.2 ? -1 : noise(X, Y) < 0.05 ? 1 : 0);

/** Machado de uma mão: tamanho do cabo da mão até a cabeça. Os de duas mãos (5 e Ruína) vão do chão até acima da cabeça. */
const AXE_LEN = [0, 14, 16, 18, 19];
/** Escala da cabeça do machado por nível (comum, mágico). */
const AXE_SCALE = [[0, 0], [1.5, 1.55], [1.55, 1.55], [1.6, 1.6], [1.65, 1.65], [1.3, 1.5]];
const axeTwoHanded = (id: string) => tierOf(id) === 5;

/**
 * Machado do id. `bottom` e `topEnd` são as pontas do cabo; `out` (−1/1) é o lado da lâmina, para fora do corpo.
 * A cabeça é desenhada no referencial do cabo: `a` para fora (lâmina), `b` ao longo do cabo (para cima).
 */
function axeArt(c: Canvas, id: string, bottom: Pt, topEnd: Pt, out: number) {
  const tier = tierOf(id), magic = isMagic(id);
  const dx = topEnd[0] - bottom[0], dy = topEnd[1] - bottom[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  // Lado de fora: perpendicular ao cabo, apontando para `out`.
  let ox = -uy, oy = ux;
  if (Math.sign(ox) !== Math.sign(out)) { ox = -ox; oy = -oy; }
  const H: Pt = [topEnd[0] - ux * 2.6, topEnd[1] - uy * 2.6];
  const k = AXE_SCALE[tier][magic ? 1 : 0];
  const W = (a: number, b: number): Pt => [H[0] + (ox * a + ux * b) * k, H[1] + (oy * a + uy * b) * k];
  const head = (pts: readonly (readonly [number, number])[], mat: Mat, offset?: Offset) => plate(c, pts.map(([a, b]) => W(a, b)), mat, offset);
  const edge = (pts: readonly (readonly [number, number])[], ids: number[], tone = 5) => {
    for (let i = 1; i < pts.length; i++) thread(c, W(...pts[i - 1]), W(...pts[i]), Mat.Steel, tone, ids);
  };
  const hole = (a: number, b: number, r: number) => {
    const p = W(a, b);
    for (let Y = F(p[1] - r); Y <= F(p[1] + r); Y++) for (let X = F(p[0] - r); X <= F(p[0] + r); X++) {
      if (Math.hypot(X / K - p[0], Y / K - p[1]) <= r * k) c.clear(X, Y);
    }
  };
  // Cabo.
  const haftMat = tier === 4 && !magic ? Mat.White : tier === 1 && !magic ? Mat.Wood : Mat.Wood;
  const haftR = axeTwoHanded(id) ? 1.15 : 0.85;
  const haft = limb(c, bottom, topEnd, haftR, haftR * 0.9, haftMat, haftMat === Mat.White ? undefined : grain);
  if (tier === 1 && !magic) for (let t = 0.15; t < 0.9; t += 0.22) { const p = lerp(bottom, topEnd, t); c.on(haft, F(p[0] + ox * 0.5), F(p[1]), Mat.Wood, 0); }
  if (tier === 4 && !magic) for (const t of [0.15, 0.5, 0.85]) { const p = lerp(bottom, topEnd, t); limb(c, [p[0] - ux * 0.3, p[1] - uy * 0.3], [p[0] + ux * 0.3, p[1] + uy * 0.3], haftR + 0.25, haftR + 0.25, Mat.Mithral); }
  // Pomo no pé do cabo.
  ellipse(c, bottom[0], bottom[1], haftR + 0.3, haftR + 0.3, tier >= 3 ? Mat.Iron : Mat.Bronze);

  if (!magic) switch (tier) {
    case 1: {
      // Machadinha: pedra lascada amarrada com tiras de couro.
      const s = head([[-1, -1.8], [3.6, -1.6], [4.8, 0], [3.8, 1.8], [-1, 2], [-1.8, 0]], Mat.Stone, stone);
      edge([[3.6, -1.6], [4.8, 0], [3.8, 1.8]], [s], 4);
      for (const b of [-1, 0, 1]) thread(c, W(-1.4, b - 0.6), W(1, b + 0.6), Mat.Leather, 3);
      limb(c, W(-0.2, 2.6), W(-0.6, 4.8), 0.3, 0.3, Mat.Leather);
      return;
    }
    case 2: {
      // Meia-lua de bronze com dois furos e bocal.
      const pts = [[0, -1.4], [1.2, -3.8], [4.2, -3.4], [5.6, 0], [4.2, 3.4], [1.2, 3.8], [0, 1.4]] as const;
      const s = head(pts, Mat.Bronze);
      edge([[4.2, -3.4], [5.6, 0], [4.2, 3.4]], [s]);
      hole(2.4, -1.5, 0.6); hole(2.4, 1.5, 0.6);
      limb(c, W(-1, -1.6), W(-1, 1.6), 1.3, 1.3, Mat.Bronze);
      return;
    }
    case 3: {
      // Machado de batalha nórdico, de lâmina dupla, com o corvo gravado.
      const blade = [[0, -1.2], [1.6, -2.6], [5, -4.2], [5.8, 0], [5, 4.2], [1.6, 2.6], [0, 1.2]] as const;
      const r = head(blade, Mat.Steel, hammered);
      const l = head(blade.map(([a, b]) => [-a * 0.8, b * 0.8] as const), Mat.Steel, hammered);
      edge([[5, -4.2], [5.8, 0], [5, 4.2]], [r]);
      // Corvo: corpo, asa e bico gravados.
      thread(c, W(2.2, -0.8), W(3.8, 0.4), Mat.Steel, 1, [r]); thread(c, W(3.8, 0.4), W(4.4, 1.4), Mat.Steel, 1, [r]);
      thread(c, W(2.6, 0), W(3, -1.6), Mat.Steel, 1, [r]); thread(c, W(1.8, -1), W(1.4, -1.8), Mat.Steel, 1, [r]);
      limb(c, W(0, -1.8), W(0, 2.2), 1.2, 1.2, Mat.Iron);
      void l;
      return;
    }
    case 4: {
      // Lâmina em asa de grifo, penas gravadas, cabo branco com anéis de mithral.
      const pts = [[0, -1.4], [2, -4.6], [5.4, -5.6], [6.2, -1.6], [5.6, 2.4], [3.4, 3.8], [0, 1.6]] as const;
      const s = head(pts, Mat.Mithral);
      edge([[5.4, -5.6], [6.2, -1.6], [5.6, 2.4]], [s]);
      for (let k = 0; k < 4; k++) thread(c, W(0.8 + k * 0.4, -0.8 + k * 0.6), W(4.4 + k * 0.4, -4.6 + k * 1.8), Mat.Mithral, 1, [s]);
      gem(c, W(0, 0), 0.9, Mat.Sapphire);
      return;
    }
    default: {
      // Grande machado do dragão: duas lâminas em asa de dragão (osso e membrana), crânio no meio.
      for (const sgn of [-1, 1]) {
        const mem = head([[sgn * 1, -2], [sgn * 4, -6.4], [sgn * 8.6, -7.4], [sgn * 7.6, -3.6], [sgn * 9, 0], [sgn * 7.6, 3.6], [sgn * 8.6, 7.4], [sgn * 4, 6.4], [sgn * 1, 2]], Mat.RedDragon, scales(5, 4));
        for (const [a, b] of [[8.6, -7.4], [9, 0], [8.6, 7.4]] as const) chain(c, [W(sgn * 1, 0), W(sgn * a * 0.6, b * 0.6), W(sgn * a, b)], 0.45, Mat.Horn, undefined, 0.25);
        edge([[sgn * 8.6, -7.4], [sgn * 7.6, -3.6], [sgn * 9, 0], [sgn * 7.6, 3.6], [sgn * 8.6, 7.4]], [mem]);
      }
      const sk = ellipse(c, ...H, 2.2, 2.4, Mat.White);
      for (const s2 of [-1, 1]) c.on(sk, F(H[0] + s2 * 0.8), F(H[1] - 0.2), Mat.Ember, 4);
      horn(c, [W(-1, 2), W(-2.6, 4.4), W(-2, 6.4)], 0.8);
      horn(c, [W(1, 2), W(2.6, 4.4), W(2, 6.4)], 0.8);
      return;
    }
  }
  switch (tier) {
    case 1: {
      // Machado do Berserker (Berserker Axe): o gume é a mandíbula de um urso, pelo no cabo e olhos de fúria.
      const s = head([[-0.6, -2.4], [3.6, -2.6], [5.4, -0.4], [4.4, 2.6], [-0.6, 2.4]], Mat.Iron, hammered);
      for (let b = -2.2; b <= 2.2; b += 0.9) fang(c, W(4.6 - Math.abs(b) * 0.25, b), 0.35, 1.2);
      for (const b of [-1.2, 0.6]) c.on(s, F(W(1.6, b)[0]), F(W(1.6, b)[1]), Mat.Ember, 5);
      c.fill(ebox(...lerp(bottom, topEnd, 0.62), 2, 2.4), (x, y) => seg(x + 0.5, y + 0.5, lerp(bottom, topEnd, 0.5), lerp(bottom, topEnd, 0.78)).d < 1.7, Mat.Fur, (x) => 0.6 + (x % 2) * 0.1, fur);
      return;
    }
    case 2: {
      // Machado Uivante: a lâmina é a cabeça de um lobo uivando; vento saindo da boca.
      const s = head([[-0.4, -2], [2, -3.6], [3.6, -5.4], [4.2, -3.4], [6.4, -2.6], [6.2, -1.2], [4.6, -0.8], [5.4, 1.6], [3.4, 3.6], [-0.4, 2.2]], Mat.Steel, hammered);
      ellipse(c, ...W(3.2, -1.8), 0.6, 0.45, Mat.Amber);
      thread(c, W(4.6, -0.8), W(6.2, -1.2), Mat.Steel, 0, [s]);
      for (let k = 0; k < 3; k++) thread(c, W(6.8 + k * 0.6, -1.6 + k * 0.6), W(8.6 + k * 0.6, -2.4 + k * 0.4), Mat.White, (j) => (j % 3 === 2 ? -1 : 4));
      edge([[6.4, -2.6], [6.2, -1.2], [4.6, -0.8], [5.4, 1.6]], [s], 5);
      return;
    }
    case 3: {
      // Machado dos Reis Anões: lâmina dupla de ferro com rosto de rei anão em ouro, runas e anéis no cabo.
      const blade = [[0, -1.4], [1.6, -3], [5.4, -4.6], [6.2, 0], [5.4, 4.6], [1.6, 3], [0, 1.4]] as const;
      const r = head(blade, Mat.Iron, hammered);
      head(blade.map(([a, b]) => [-a * 0.85, b * 0.85] as const), Mat.Iron, hammered);
      edge([[5.4, -4.6], [6.2, 0], [5.4, 4.6]], [r]);
      const f = ellipse(c, ...H, 1.8, 2.1, Mat.Trim);
      for (const s2 of [-1, 1]) c.on(f, F(H[0] + s2 * 0.7), F(H[1] - 0.4), Mat.Eye, 0);
      chain(c, [[H[0], H[1] + 0.8], [H[0], H[1] + 3.4]], 0.7, Mat.Trim, (X, Y) => (Y % 2 ? -1 : 0), 0.3);
      for (const [a, b] of [[3.4, -1.6], [3.4, 1.6]] as const) { const p = W(a, b); for (const [ddx, ddy] of [[0, -1], [0, 0], [0, 1], [1, 0]]) c.px(F(p[0]) + ddx, F(p[1]) + ddy, Mat.Sapphire, 5); }
      for (const t of [0.3, 0.55, 0.8]) { const p = lerp(bottom, topEnd, t); limb(c, [p[0] - ux * 0.3, p[1] - uy * 0.3], [p[0] + ux * 0.3, p[1] + uy * 0.3], haftR + 0.3, haftR + 0.3, Mat.Trim); }
      return;
    }
    case 4: {
      // Machado da Tempestade: lâmina de aço-azul com um raio encravado e faíscas soltas.
      const pts = [[0, -1.6], [1.6, -4.6], [5.6, -5.4], [6.4, 0], [5.6, 5.4], [1.6, 4.6], [0, 1.6]] as const;
      const s = head(pts, Mat.Mithral, hammered);
      edge([[5.6, -5.4], [6.4, 0], [5.6, 5.4]], [s]);
      const bolt: Pt[] = [W(1.2, -3.6), W(3.4, -1.2), W(2.4, -0.6), W(4.8, 2.4), W(3.2, 0.8), W(4.2, 0.4), W(2, -2.2)];
      for (let i = 1; i < 5; i++) { thread(c, bolt[i - 1], bolt[i], Mat.Sapphire, 5, [s]); thread(c, [bolt[i - 1][0] + 0.4, bolt[i - 1][1]], [bolt[i][0] + 0.4, bolt[i][1]], Mat.White, 5, [s]); }
      for (let k = 0; k < 7; k++) { const p = W(6.8 + noise(k, 1) * 3, -4 + k * 1.3); c.px(F(p[0]), F(p[1]), Mat.Sapphire, 5); c.px(F(p[0]) + 1, F(p[1]) - 1, Mat.White, 5); }
      return;
    }
    default: {
      // Ruína dos Gigantes (Giant Slayer): machadão de pedra e ferro maior que o herói, com dentes de gigante amarrados.
      const s = head([[-1.6, -4.4], [4, -6.4], [9.6, -8.2], [11, 0], [9.6, 8.2], [4, 6.4], [-1.6, 4.4]], Mat.Stone, stone);
      const iron = head([[6.6, -8.4], [9.8, -8.4], [11.4, 0], [9.8, 8.4], [6.6, 8.4], [8.4, 0]], Mat.Iron, hammered);
      edge([[9.8, -8.4], [11.4, 0], [9.8, 8.4]], [iron]);
      for (const b of [-3, 0, 3]) thread(c, W(-1.4, b - 0.8), W(1.4, b + 0.8), Mat.Leather, 2, [s]);
      for (const [a, b] of [[-0.4, 5.2], [0.8, 6.2], [2, 5.4]] as const) { thread(c, W(a, 4), W(a, b + 0.4), Mat.Leather, 2); fang(c, W(a, b), 0.55, 1.8); }
      return;
    }
  }
}

// --- Lote 4: arcos e bestas (docs/ARTE_ITENS.md) ---------------------------------------

/** Perfil de um arco: meia-altura, quanto a barriga sai e quanto as pontas voltam (recurvo). */
const BOW_SHAPE: Record<string, [number, number, number]> = {
  "bow-1": [12, 2.4, 0], "bow-2": [14, 3, 1.4], "bow-3": [19, 2.6, 0], "bow-4": [16, 3.2, 1.8], "bow-5": [17, 3.4, 1.2],
  "bow-1-magic": [14, 3, 0.6], "bow-2-magic": [15, 3.2, 1.2], "bow-3-magic": [16, 3.2, 1], "bow-4-magic": [17, 3, 1.6], "bow-5-magic": [17, 3.6, 0.8],
};

/** Pontos ao longo do arco, de cima para baixo; a barriga sai para `out` e a empunhadura fica na mão. */
function bowPoints(at: Pt, out: number, half: number, belly: number, recurve: number, n = 12): Pt[] {
  const pts: Pt[] = [];
  for (let k = -n / 2; k <= n / 2; k++) {
    const t = k / (n / 2);
    const back = Math.abs(t) > 0.8 ? (Math.abs(t) - 0.8) * 5 * recurve : 0;
    pts.push([at[0] + out * (belly * (1 - t * t) - belly - back), at[1] + t * half]);
  }
  return pts;
}

/** Corda reta entre as pontas, com o tom dado (ou função do passo, para pontilhar). */
function bowString(c: Canvas, a: Pt, b: Pt, mat: Mat, tone: number | ((k: number) => number)) {
  thread(c, a, b, mat, tone);
}

function bowArt(c: Canvas, id: string, at: Pt, out: number) {
  const [half, belly, recurve] = BOW_SHAPE[id];
  const pts = bowPoints(at, out, half, belly, recurve);
  const top = pts[0], bot = pts[pts.length - 1];
  const tip = (i: number) => pts[i < 0 ? pts.length + i : i];
  const grip = (mat: Mat, wrap: Mat) => {
    const g = limb(c, [at[0], at[1] - 2.4], [at[0], at[1] + 2.4], 1.45, 1.45, mat, (X, Y) => ((X + Y) % 3 === 0 ? -1 : 0));
    thread(c, [at[0] - 1.4, at[1] - 2.2], [at[0] + 1.4, at[1] - 2.2], wrap, 4, [g]);
    thread(c, [at[0] - 1.4, at[1] + 2.2], [at[0] + 1.4, at[1] + 2.2], wrap, 4, [g]);
  };
  switch (id) {
    case "bow-1": {
      // Arco curto de galho: casca com nós, corda de cânhamo.
      chain(c, pts, 1, Mat.Wood, (X, Y) => grain(X, Y) - (noise(X >> 2, Y >> 2) < 0.2 ? 1 : 0), 0.65);
      for (const i of [3, 8]) ellipse(c, ...tip(i), 1.1, 0.8, Mat.Wood, () => -1);
      bowString(c, top, bot, Mat.Linen, 2);
      grip(Mat.Leather, Mat.Linen);
      return;
    }
    case "bow-2": {
      // Arco de caça recurvo: madeira clara, couro na empunhadura e penas penduradas nas pontas.
      chain(c, pts, 1.15, Mat.Wood, grain, 0.7);
      for (const p of [top, bot]) ellipse(c, p[0], p[1], 0.85, 0.85, Mat.Horn);
      for (const [p, d] of [[top, 1], [bot, -1]] as const) for (const k of [0, 1]) feather(c, [p[0] - out * 0.4, p[1] + d * 0.6], [p[0] - out * (0.8 + k), p[1] + d * (3.6 + k * 0.8)], 0.55, k ? Mat.Crest : Mat.Linen);
      bowString(c, top, bot, Mat.Linen, 4);
      grip(Mat.Leather, Mat.Bronze);
      return;
    }
    case "bow-3": {
      // Arco longo de teixo: quase da altura do herói, cerne claro e alburno escuro, pontas de chifre.
      chain(c, pts, 1.2, Mat.Wood, (X, Y) => (X % 3 === 0 ? 1 : 0) + grain(X, Y), 0.75);
      for (const p of [top, bot]) limb(c, p, [p[0], p[1] + (p === top ? -1.2 : 1.2)], 0.8, 0.5, Mat.Horn);
      bowString(c, top, bot, Mat.Linen, 4);
      grip(Mat.Leather, Mat.Leather);
      return;
    }
    case "bow-4": {
      // Arco de mithral em folha dupla: lâminas prateadas finas, folhas nas pontas e safira na empunhadura.
      chain(c, pts, 1, Mat.Mithral, undefined, 0.5);
      for (const [i, a] of [[1, -1.2], [pts.length - 2, 1.2]] as const) leaf(c, [tip(i)[0] + out * 1.2, tip(i)[1]], a * out, 2, 1, Mat.Mithral);
      for (const i of [3, 9]) leaf(c, [tip(i)[0] + out * 1.4, tip(i)[1]], out * (i < 6 ? -0.6 : 0.6), 1.5, 0.7, Mat.Mithral);
      bowString(c, top, bot, Mat.White, 5);
      grip(Mat.Linen, Mat.Mithral);
      gem(c, [at[0] + out * 1.4, at[1]], 0.8, Mat.Sapphire);
      return;
    }
    case "bow-5": {
      // Arco de osso de dragão: costelas emendadas por anéis, espinhos nas costas e corda de tendão vermelho.
      chain(c, pts, 1.25, Mat.White, (X, Y) => ((Y >> 1) % 5 === 0 ? -2 : 0), 0.7);
      for (const i of [2, 4, 8, 10]) { const p = tip(i); limb(c, [p[0] - 1.2, p[1]], [p[0] + 1.2, p[1]], 0.55, 0.55, Mat.RedDragon); }
      for (const i of [1, 3, 9, 11]) { const p = tip(i); plate(c, [[p[0] + out * 0.8, p[1] - 0.8], [p[0] + out * 0.8, p[1] + 0.8], [p[0] + out * 3, p[1] + (i < 6 ? -1 : 1)]], Mat.Horn); }
      bowString(c, top, bot, Mat.Ember, (k) => (k % 4 === 0 ? 2 : 4));
      grip(Mat.RedDragon, Mat.Horn);
      return;
    }
    case "bow-1-magic": {
      // Arco do Caçador Élfico: pontas em galhada de cervo, escrita élfica acesa no braço.
      chain(c, pts, 1.1, Mat.Wood, grain, 0.7);
      for (const [p, d] of [[top, -1], [bot, 1]] as const) {
        chain(c, [p, [p[0] - out * 1, p[1] + d * 2.4], [p[0] - out * 0.4, p[1] + d * 4.6]], 0.55, Mat.Horn, undefined, 0.3);
        chain(c, [[p[0] - out * 0.7, p[1] + d * 1.6], [p[0] + out * 1.6, p[1] + d * 3]], 0.45, Mat.Horn, undefined, 0.25);
        chain(c, [[p[0] - out * 0.9, p[1] + d * 3.4], [p[0] - out * 2.6, p[1] + d * 4.4]], 0.4, Mat.Horn, undefined, 0.2);
      }
      for (const i of [2, 3, 9, 10]) { const p = tip(i); c.px(F(p[0]), F(p[1]), Mat.Leaf, 5); c.px(F(p[0]), F(p[1]) + 1, Mat.Leaf, 4); }
      bowString(c, top, bot, Mat.Linen, 4);
      grip(Mat.Leather, Mat.Leaf);
      return;
    }
    case "bow-2-magic": {
      // Arco do Vento Sul: pontas em asas de gaivota e fitas azuis ao vento.
      chain(c, pts, 1.1, Mat.Linen, undefined, 0.7);
      for (const [p, d] of [[top, -1], [bot, 1]] as const) for (let k = 0; k < 4; k++) feather(c, p, [p[0] + out * (2.4 + k * 0.8), p[1] + d * (1.6 + k * 1.1)], 0.6, k % 2 ? Mat.White : Mat.Linen);
      for (const [p, d] of [[tip(4), 1], [tip(8), -1]] as const) chain(c, [p, [p[0] + out * 2, p[1] + d * 1], [p[0] + out * 3.4, p[1] - d * 0.4], [p[0] + out * 5, p[1] + d * 0.6]], 0.45, Mat.Sapphire, undefined, 0.3);
      bowString(c, top, bot, Mat.White, 5);
      grip(Mat.Sapphire, Mat.White);
      return;
    }
    case "bow-3-magic": {
      // Arco Solar: arco dourado com o disco do sol na empunhadura, raios e corda de luz.
      chain(c, pts, 1.15, Mat.Trim, undefined, 0.7);
      const sun: Pt = [at[0] + out * 1.6, at[1]];
      gem(c, sun, 2, Mat.Trim);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; thread(c, [sun[0] + Math.cos(a) * 2.3, sun[1] + Math.sin(a) * 2.3], [sun[0] + Math.cos(a) * (3.4 + (k % 2)), sun[1] + Math.sin(a) * (3.4 + (k % 2))], Mat.Amber, 5); }
      bowString(c, top, bot, Mat.Amber, (k) => (k % 3 === 0 ? 5 : 4));
      return;
    }
    case "bow-4-magic": {
      // Arco do Juramento (Oathbow): arco élfico de madeira escura com a inscrição do juramento acesa em verde e ouro.
      chain(c, pts, 1.1, Mat.Wood, () => -1, 0.6);
      for (let i = 1; i < pts.length - 1; i++) if (i !== 6) { const p = tip(i); c.px(F(p[0]), F(p[1]), i % 2 ? Mat.Leaf : Mat.Trim, 5); c.px(F(p[0]), F(p[1]) + 1, Mat.Leaf, 4); }
      for (const p of [top, bot]) leaf(c, [p[0] - out * 0.6, p[1]], -Math.PI / 2, 1.6, 0.7);
      bowString(c, top, bot, Mat.Trim, 4);
      grip(Mat.Leaf, Mat.Trim);
      return;
    }
    default: {
      // Arco de Corda Celestial: arco de nuvem com estrelas, corda de luz estelar pontilhada.
      for (let i = 0; i < pts.length; i++) ellipse(c, pts[i][0], pts[i][1], 1.6 - Math.abs(i - 6) * 0.08, 1.5, Mat.White, () => (i % 2 ? -1 : 0));
      for (const i of [1, 4, 8, 11]) { const p = tip(i); for (let k = -1; k <= 1; k++) { c.px(F(p[0] + out * 2.2) + k, F(p[1]), Mat.Sapphire, 5); c.px(F(p[0] + out * 2.2), F(p[1]) + k, Mat.Sapphire, 5); } }
      bowString(c, top, bot, Mat.Sapphire, (k) => (k % 3 === 0 ? 5 : k % 3 === 1 ? 3 : -1));
      grip(Mat.Sapphire, Mat.White);
      return;
    }
  }
}

/**
 * Besta do id. `s` aponta da coronha para a frente (para onde atira), `p` ao longo do arco. De frente ela pende
 * da mão com a frente para baixo (um T de cabeça para baixo); de lado vai na horizontal, para a frente.
 */
function crossbowArt(c: Canvas, id: string, at: Pt, s: Pt, side: boolean) {
  const tier = tierOf(id), magic = isMagic(id);
  const len = 9 + tier * 1.2;
  // Tudo em unidades da besta, ampliadas para ela ter o porte de uma arma de nível no corpo de 128 px.
  const XK = 1.55;
  const S0 = (a: number, b = 0): Pt => [at[0] + (s[0] * a - s[1] * b) * XK, at[1] + (s[1] * a + s[0] * b) * XK];
  const front = S0(len), butt = S0(-4);
  const stockMat = tier === 5 ? Mat.White : tier >= 3 && !magic ? Mat.Wood : Mat.Wood;
  // Coronha e o virote carregado em cima.
  const stock = limb(c, butt, front, 1.6, 1.25, stockMat, tier === 5 ? (X, Y) => ((Y >> 1) % 4 === 0 ? -1 : 0) : grain);
  void stock;
  const prodMat = [Mat.Wood, Mat.Wood, Mat.Bronze, Mat.Iron, Mat.Mithral, Mat.White][tier];
  const prodHalf = side ? 3 : 6 + tier * 0.6;
  const prodAt = S0(len - 1.6);
  const prodPts = (half: number, bend: number, back = 0): Pt[] => {
    const pts: Pt[] = [];
    for (let k = -4; k <= 4; k++) { const t = k / 4; pts.push(S0(len - 1.6 - back - bend * t * t, t * half)); }
    return pts;
  };
  const drawProd = (mat: Mat, back = 0, r = 0.85) => {
    const pts = side ? [S0(len - 1.6 - back, -prodHalf), S0(len - 1.6 - back, prodHalf)] : prodPts(prodHalf, 2.2, back);
    chain(c, pts, r, mat, mat === Mat.Wood ? grain : undefined, r * 0.6);
    // Corda das pontas até a noz, perto da mão.
    if (!side) { bowString(c, pts[0], S0(1.6), Mat.Linen, 4); bowString(c, pts[pts.length - 1], S0(1.6), Mat.Linen, 4); }
    return pts;
  };
  // Virote: haste com ponta de metal e penas perto da noz.
  const bolt = (mat: Mat = Mat.Steel) => {
    limb(c, S0(1.4), S0(len + 1.2), 0.32, 0.32, Mat.Wood);
    plate(c, [S0(len + 0.6, -0.7), S0(len + 0.6, 0.7), S0(len + 2.4)], mat);
    for (const sg of [-1, 1]) plate(c, [S0(1.2, 0), S0(3, 0), S0(1.4, sg * 1)], Mat.Linen);
  };
  // Gatilho (embaixo da coronha) e a noz de bronze.
  limb(c, S0(0.6, side ? 1.2 : 0), S0(-0.6, side ? 2.6 : 0), 0.35, 0.3, Mat.Iron);
  if (!magic) switch (tier) {
    case 1: drawProd(Mat.Wood); bolt(); return;
    case 2: {
      const pts = drawProd(Mat.Bronze);
      for (const p of [pts[0], pts[pts.length - 1]]) ellipse(c, p[0], p[1], 0.8, 0.8, Mat.Bronze);
      const bull = ellipse(c, ...S0(2.6), 1, 0.9, Mat.Bronze);
      for (const sg of [-1, 1]) chain(c, [S0(2.2, sg * 0.7), S0(1.8, sg * 1.6)], 0.3, Mat.Bronze, undefined, 0.15);
      void bull;
      bolt(Mat.Bronze);
      return;
    }
    case 3: {
      drawProd(Mat.Iron, 0, 0.95);
      // Estribo na frente e a manivela (cranequim) atrás.
      const st = S0(len + 1.4);
      c.fill(ebox(st[0], st[1], 1.8, 1.8), (x, y) => { const d = Math.hypot(x + 0.5 - st[0], y + 0.5 - st[1]); return d < 1.6 && d > 0.9; }, Mat.Iron, () => 0.6);
      const crank = ellipse(c, ...S0(-3.6), 1.4, 1.4, Mat.Iron);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.on(crank, F(S0(-3.6)[0] + Math.cos(a) * 1.2), F(S0(-3.6)[1] + Math.sin(a) * 1.2), Mat.Iron, k % 2 ? 1 : 4); }
      limb(c, S0(-3.6), S0(-3.6, 3), 0.3, 0.3, Mat.Iron);
      ellipse(c, ...S0(-3.6, 3.2), 0.6, 0.6, Mat.Wood);
      bolt();
      return;
    }
    case 4: {
      // Besta pesada élfica de mithral: arco duplo e folhas nas pontas.
      const a = drawProd(Mat.Mithral, 0, 0.8);
      drawProd(Mat.Mithral, 1.6, 0.7);
      if (!side) for (const p of [a[0], a[a.length - 1]]) leaf(c, p, Math.atan2(s[1], s[0]) + Math.PI, 1.6, 0.8, Mat.Mithral);
      bolt(Mat.Mithral);
      return;
    }
    default: {
      // Balestra de osso de dragão: o crânio é a frente, os braços do arco são asas de osso.
      const pts = drawProd(Mat.White, 0, 1);
      if (!side) for (const sg of [-1, 1]) plate(c, [S0(len - 2, sg * 1.4), S0(len - 1.4, sg * prodHalf), S0(len - 5, sg * prodHalf * 0.7), S0(len - 4.4, sg * 1.4)], Mat.RedDragon, scales(5, 4));
      void pts;
      bolt(Mat.Ember);
      const sk = ellipse(c, ...S0(len + 0.6), 2.2, 2, Mat.White);
      for (const sg of [-1, 1]) c.on(sk, F(S0(len + 0.2, sg * 0.9)[0]), F(S0(len + 0.2, sg * 0.9)[1]), Mat.Ember, 4);
      for (const sg of [-1, 1]) horn(c, [S0(len - 0.4, sg * 1.4), S0(len - 2.4, sg * 2.8), S0(len - 3.8, sg * 2.4)], 0.6);
      return;
    }
  }
  switch (tier) {
    case 1: {
      // Besta do Sentinela: pavês preso na frente, com o olho do sentinela pintado.
      drawProd(Mat.Wood);
      bolt();
      const sh = side ? plate(c, [S0(len - 0.6, -3.6), S0(len + 0.6, -3.6), S0(len + 0.6, 3.6), S0(len - 0.6, 3.6)], Mat.Wood, grain)
        : plate(c, [S0(len - 3.4, -3.2), S0(len - 3.4, 3.2), S0(len + 1.2, 3), S0(len + 1.2, -3)], Mat.Primary, linen);
      if (!side) { const e = S0(len - 1.2); ellipse(c, e[0], e[1], 1.3, 0.8, Mat.White); ellipse(c, e[0], e[1], 0.5, 0.6, Mat.Sapphire); }
      void sh;
      return;
    }
    case 2: {
      // Besta do Caça-Vampiros: prata, estaca de madeira no lugar do virote, símbolo sagrado e réstia de alho.
      drawProd(Mat.Mithral, 0, 0.8);
      limb(c, S0(1.4), S0(len + 1.6), 0.45, 0.3, Mat.Wood);
      const cross = S0(3.4, side ? -1.6 : 0);
      limb(c, [cross[0] - 0.9, cross[1]], [cross[0] + 0.9, cross[1]], 0.3, 0.3, Mat.Trim);
      limb(c, [cross[0], cross[1] - 1.3], [cross[0], cross[1] + 0.9], 0.3, 0.3, Mat.Trim);
      for (let k = 0; k < 3; k++) { const g = S0(-1.4 + k * 1.2, side ? 2.2 : 2.4); ellipse(c, g[0], g[1], 0.75, 0.85, Mat.White); }
      thread(c, S0(-2.2, 1.6), S0(1.4, 1.6), Mat.Linen, 3);
      return;
    }
    case 3: {
      // Besta de Repetição Gnoma: caixa de virotes em cima, engrenagens de bronze e alavanca.
      drawProd(Mat.Iron, 0, 0.9);
      bolt();
      const box = plate(c, [S0(0, -1.8), S0(5, -1.8), S0(5, -4.4), S0(0, -4.4)].map((p) => (side ? p : [p[0] + 0.01, p[1]] as Pt)), Mat.Bronze, hammered);
      void box;
      for (const [a, r] of [[1.4, 1.3], [3.8, 1]] as const) {
        const g = S0(a, 2.4);
        const id2 = ellipse(c, g[0], g[1], r, r, Mat.Bronze);
        for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; c.px(F(g[0] + Math.cos(an) * (r + 0.4)), F(g[1] + Math.sin(an) * (r + 0.4)), Mat.Bronze, 3); }
        c.on(id2, F(g[0]), F(g[1]), Mat.Iron, 0);
      }
      limb(c, S0(4.4, -4.4), S0(2, -7), 0.3, 0.3, Mat.Iron);
      ellipse(c, ...S0(1.8, -7.2), 0.6, 0.6, Mat.Crest);
      return;
    }
    case 4: {
      // Besta Trovejante: arco de cobre envolto em bobinas, faíscas saltando das pontas.
      const pts = drawProd(Mat.Bronze, 0, 0.9);
      for (let i = 1; i < pts.length - 1; i++) if (i !== 4) { const p = pts[i]; limb(c, [p[0] - s[0] * 0.6, p[1] - s[1] * 0.6], [p[0] + s[0] * 0.6, p[1] + s[1] * 0.6], 1.1, 1.1, Mat.Bronze, (X) => (X % 2 ? -1 : 1)); }
      bolt(Mat.Sapphire);
      for (const p of [pts[0], pts[pts.length - 1]]) for (let k = 0; k < 5; k++) { const q: Pt = [p[0] + (noise(k, 3) - 0.5) * 4, p[1] + (noise(3, k) - 0.5) * 4]; c.px(F(q[0]), F(q[1]), Mat.Sapphire, 5); c.px(F(q[0]) + 1, F(q[1]), Mat.White, 5); }
      return;
    }
    default: {
      // Balestra do Dragão Rubro: cabeça de dragão vermelho de boca aberta na frente; o virote sai em chamas.
      drawProd(Mat.RedDragon, 0, 1.1);
      const hd = S0(len + 0.4);
      const head2 = ellipse(c, hd[0], hd[1], 2.4, 2.2, Mat.RedDragon, scales(5, 4));
      for (const sg of [-1, 1]) { fang(c, S0(len + 2.2, sg * 0.8), 0.35, 1.2, side ? 1 : -1); horn(c, [S0(len - 0.6, sg * 1.6), S0(len - 2.6, sg * 3), S0(len - 4.4, sg * 2.6)], 0.6); }
      c.on(head2, F(S0(len, -1)[0]), F(S0(len, -1)[1]), Mat.Amber, 5);
      flame(c, S0(len + 4.6), 4, 1.6, side ? -1 : 0);
      return;
    }
  }
}

// --- Lote 5: varinhas e cajados (docs/ARTE_ITENS.md) -----------------------------------

/** Varinha do id, do cabo (`at`, na mão) até a ponta `tip`. */
function wandArt(c: Canvas, id: string, at: Pt, tip: Pt) {
  const tier = tierOf(id), magic = isMagic(id);
  const dx = tip[0] - at[0], dy = tip[1] - at[1];
  const len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, gx = -uy, gy = ux;
  const P = (a: number, g = 0): Pt => [at[0] + ux * a + gx * g, at[1] + uy * a + gy * g];
  const butt = P(-2.6);
  const rod = (mat: Mat, r0 = 0.65, r1 = 0.45, offset?: Offset) => limb(c, butt, tip, r0, r1, mat, offset);
  if (!magic) switch (tier) {
    case 1: {
      // Raminho de salgueiro: casca, um nó e duas folhas perto da ponta.
      rod(Mat.Wood, 0.6, 0.35, grain);
      leaf(c, P(len - 2, 1.2), Math.atan2(uy, ux) + 0.8, 1.6, 0.7);
      leaf(c, P(len - 3.6, -1.1), Math.atan2(uy, ux) - 0.8, 1.4, 0.65);
      ellipse(c, ...P(len * 0.4), 0.8, 0.7, Mat.Wood, () => -1);
      return;
    }
    case 2: {
      // Varinha de bronze: a ponta é uma mãozinha segurando uma esfera de âmbar.
      rod(Mat.Bronze, 0.6, 0.5);
      for (const g of [-1, 0, 1]) chain(c, [P(len - 1.6, g * 0.5), P(len - 0.4, g * 1.2), P(len + 0.6, g * 0.9)], 0.3, Mat.Bronze, undefined, 0.2);
      gem(c, P(len + 0.9), 1.1, Mat.Amber);
      limb(c, P(-0.4), P(0.4), 0.85, 0.85, Mat.Bronze);
      return;
    }
    case 3: {
      // Varinha rúnica de osso: runas acesas ao longo e ponta afiada.
      const r = rod(Mat.White, 0.7, 0.3, (X, Y) => ((Y >> 1) % 6 === 0 ? -1 : 0));
      for (let t = 0.2; t < 0.85; t += 0.16) { const p = P(len * t); c.on(r, F(p[0]), F(p[1]), Mat.Sapphire, 5); c.on(r, F(p[0]) + 1, F(p[1]) + 1, Mat.Sapphire, 3); }
      ellipse(c, ...P(-2.6), 0.9, 0.9, Mat.White);
      return;
    }
    case 4: {
      // Varinha de mithral com cristal azul lapidado na ponta.
      rod(Mat.Mithral, 0.55, 0.45);
      plate(c, [P(len - 1, -0.9), P(len + 1.2, -1), P(len + 3.4, 0), P(len + 1.2, 1), P(len - 1, 0.9)], Mat.Sapphire);
      thread(c, P(len - 0.8), P(len + 3), Mat.Sapphire, 5);
      for (const g of [-1, 1]) chain(c, [P(len - 1.6, g * 0.4), P(len - 0.6, g * 1.4)], 0.25, Mat.Mithral);
      return;
    }
    default: {
      // Varinha de dente de dragão: presa curva com gema vermelha no encaixe.
      limb(c, butt, P(len * 0.35), 0.75, 0.75, Mat.RedDragon, scales(4, 3));
      chain(c, [P(len * 0.35), P(len * 0.6, 0.5), P(len * 0.85, 0.6), P(len + 0.6, 0)], 0.8, Mat.White, undefined, 0.15);
      gem(c, P(len * 0.35), 0.9, Mat.Ember);
      return;
    }
  }
  switch (tier) {
    case 1: {
      // Varinha de Mísseis Mágicos: três dardos de luz girando em volta da ponta.
      rod(Mat.Wood, 0.6, 0.45, grain);
      gem(c, P(len), 0.8, Mat.Gem);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.4, q = P(len + Math.cos(a) * 2.6, Math.sin(a) * 2.6);
        const d: Pt = [Math.cos(a + 1.6), Math.sin(a + 1.6)];
        plate(c, [[q[0] - d[0] * 1.2 - d[1] * 0.4, q[1] - d[1] * 1.2 + d[0] * 0.4], [q[0] - d[0] * 1.2 + d[1] * 0.4, q[1] - d[1] * 1.2 - d[0] * 0.4], [q[0] + d[0] * 1.2, q[1] + d[1] * 1.2]], Mat.Gem);
      }
      return;
    }
    case 2: {
      // Varinha da Bola de Fogo: salamandra enrolada na ponta segurando uma conta de fogo.
      rod(Mat.Iron, 0.6, 0.5);
      const body: Pt[] = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10; body.push(P(len - 4 + t * 4.4, Math.sin(t * Math.PI * 2.4) * 1.2)); }
      chain(c, body, 0.55, Mat.Ember, (X, Y) => ((X + Y) % 4 === 0 ? -1 : 0), 0.3);
      ellipse(c, ...P(len + 0.6, 0.3), 0.8, 0.7, Mat.Ember);
      gem(c, P(len + 1.8), 1, Mat.Amber);
      flame(c, P(len + 2.4), 2.6, 0.9, 0);
      return;
    }
    case 3: {
      // Varinha do Mago de Guerra: varinha de combate com guarda de metal e ponta de aço.
      rod(Mat.Iron, 0.65, 0.5);
      limb(c, P(0.6, -1.8), P(0.6, 1.8), 0.4, 0.4, Mat.Steel);
      plate(c, [P(len - 0.6, -0.7), P(len - 0.6, 0.7), P(len + 2)], Mat.Steel);
      gem(c, P(len - 1.4), 0.6, Mat.Gem);
      return;
    }
    case 4: {
      // Varinha dos Segredos: a ponta é uma chave e um olho que se abre perto de portas secretas.
      rod(Mat.Wood, 0.55, 0.45, grain);
      const bit = plate(c, [P(len - 2.2, 0.4), P(len - 2.2, 1.6), P(len - 1.2, 1.6), P(len - 1.2, 0.4)], Mat.Trim);
      void bit;
      const eye = c.fill(ebox(...P(len + 0.6), 1.8, 1.8), inEllipse(...P(len + 0.6), 1.6, 1.1), Mat.White, () => 0.7);
      void eye;
      ellipse(c, ...P(len + 0.6), 0.7, 0.7, Mat.Iris);
      ellipse(c, ...P(len + 0.6), 0.3, 0.45, Mat.Eye);
      thread(c, P(len - 1, -0.9), P(len + 2.2, -0.9), Mat.Trim, 4);
      return;
    }
    default: {
      // Varinha das Maravilhas: espiral de arco-íris e uma estrela na ponta.
      const r = rod(Mat.White, 0.65, 0.5);
      const cols = [Mat.Ember, Mat.Amber, Mat.Leaf, Mat.Sapphire, Mat.Gem];
      for (let t = 0; t < 1; t += 0.02) { const p = lerp(butt, tip, t); c.on(r, F(p[0] + gx * Math.sin(t * 30) * 0.4), F(p[1] + gy * Math.sin(t * 30) * 0.4), cols[Math.floor(t * 15) % 5], 4); }
      const st = P(len + 1.2);
      const pts: Pt[] = [];
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 0.8 : 2; pts.push([st[0] + Math.cos(a) * rr, st[1] + Math.sin(a) * rr]); }
      plate(c, pts, Mat.Trim);
      return;
    }
  }
}

/** Corpo enrolado num cajado (víbora, dragão): segmentos de trás antes da haste, os da frente depois. */
function coil(c: Canvas, x: number, y0: number, y1: number, turns: number, r: number, mat: Mat, offset: Offset | undefined, haft: () => void) {
  const n = 40;
  const pts = Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n, a = t * turns * Math.PI * 2;
    return { p: [x + Math.sin(a) * 2.2, y0 + (y1 - y0) * t] as Pt, front: Math.cos(a) > 0, rad: r * (0.6 + 0.4 * Math.min(1, t * 4)) };
  });
  for (let k = 1; k <= n; k++) if (!pts[k].front) limb(c, pts[k - 1].p, pts[k].p, pts[k - 1].rad, pts[k].rad, mat, (X, Y) => (offset ? offset(X, Y) : 0) - 1);
  haft();
  for (let k = 1; k <= n; k++) if (pts[k].front) limb(c, pts[k - 1].p, pts[k].p, pts[k - 1].rad, pts[k].rad, mat, offset);
  return pts[n].p;
}

/** Cajado do id, em pé do chão (`bottom`) até `top`, passando pela mão `at`. */
function staffArt(c: Canvas, id: string, at: Pt, top: number, bottom: number) {
  c.scaled([at[0], top + 2], 1.45, () => staffHead(c, id, at, top, bottom));
}

/** Cajado com a cabeça desenhada na escala local (`staffArt`); a haste e o que fica nela não crescem. */
function staffHead(c: Canvas, id: string, at: Pt, top: number, bottom: number) {
  const tier = tierOf(id), magic = isMagic(id);
  const x = at[0];
  const shaft = (mat: Mat, r = 1.1, offset: Offset | undefined = grain) => c.unscaled(() => limb(c, [x, top + 2], [x, bottom], r, r, mat, offset));
  const ferrule = (mat: Mat) => c.unscaled(() => limb(c, [x, bottom - 1.6], [x, bottom], 1.35, 1.2, mat));
  if (!magic) switch (tier) {
    case 1: {
      // Cajado de carvalho: torto, com raízes no topo segurando uma pedra.
      const pts: Pt[] = Array.from({ length: 9 }, (_, k) => [x + Math.sin(k * 0.9) * 0.6, bottom + (top + 2 - bottom) * (k / 8)] as Pt);
      c.unscaled(() => chain(c, pts, 1.25, Mat.Wood, grain, 1));
      const st: Pt = [x, top - 1];
      gem(c, st, 2.2, Mat.Stone);
      for (const s of [-1, 1]) for (const k of [0, 1]) chain(c, [[x + s * 0.4, top + 2], [x + s * (1.6 + k), top - 0.4 + k], [x + s * (1.4 + k * 0.6), top - 2.6 + k * 0.4]], 0.5, Mat.Wood, undefined, 0.25);
      return;
    }
    case 2: {
      // Cajado de bronze: haste de madeira com anéis e a lua crescente no topo.
      shaft(Mat.Wood); ferrule(Mat.Bronze);
      c.unscaled(() => { for (const y of [top + 4, at[1] - 3.6]) limb(c, [x, y], [x, y + 0.8], 1.4, 1.4, Mat.Bronze); });
      const cx = x, cy = top - 1.4;
      c.fill(ebox(cx, cy, 3.6, 3.6), (xx, yy) => inEllipse(cx, cy, 3.4, 3.4)(xx, yy) && !inEllipse(cx + 1.6, cy - 0.8, 2.8, 2.8)(xx, yy), Mat.Bronze, sphere(cx, cy, 3.6, 3.6));
      return;
    }
    case 3: {
      // Cajado rúnico: madeira escura com um pequeno obelisco no topo e runas flutuando em volta.
      shaft(Mat.Wood, 1.1, (X, Y) => grain(X, Y) - 1); ferrule(Mat.Iron);
      const ob = plate(c, [[x - 1.6, top + 2], [x + 1.6, top + 2], [x + 1.1, top - 3], [x, top - 4.6], [x - 1.1, top - 3]], Mat.Stone, stone);
      for (const y of [top - 2, top, top + 1.2]) c.on(ob, F(x), F(y), Mat.Sapphire, 5);
      for (const [ddx, ddy] of [[-3.6, -2], [3.4, -0.4], [-2.8, 2.6], [3, 3.4]] as const) { c.px(F(x + ddx), F(top + ddy), Mat.Sapphire, 5); c.px(F(x + ddx) + 1, F(top + ddy), Mat.Sapphire, 3); c.px(F(x + ddx), F(top + ddy) + 1, Mat.Sapphire, 3); }
      return;
    }
    case 4: {
      // Cajado de mithral: aro élfico no topo com o cristal suspenso no meio.
      shaft(Mat.Mithral, 0.95, undefined); ferrule(Mat.Mithral);
      const cy = top - 1.6;
      c.fill(ebox(x, cy, 3.8, 4.2), (xx, yy) => { const d = Math.hypot((xx + 0.5 - x) / 3.4, (yy + 0.5 - cy) / 3.9); return d < 1 && d > 0.78; }, Mat.Mithral, sphere(x, cy - 1, 4, 4.4));
      plate(c, [[x, cy - 2.2], [x + 1.2, cy], [x, cy + 2.2], [x - 1.2, cy]], Mat.Sapphire);
      for (const s of [-1, 1]) leaf(c, [x + s * 2.6, top + 2.4], s < 0 ? 2.4 : 0.7, 1.4, 0.7, Mat.Mithral);
      return;
    }
    default: {
      // Cajado de presa de dragão: crânio de dragão no topo com olhos acesos e chifres.
      shaft(Mat.Wood, 1.15, (X, Y) => grain(X, Y) - 1); ferrule(Mat.Iron);
      const sk = ellipse(c, x, top - 1, 2.8, 2.4, Mat.White);
      plate(c, [[x - 1.8, top + 0.4], [x + 1.8, top + 0.4], [x + 1.2, top + 3], [x - 1.2, top + 3]], Mat.White);
      for (const s of [-1, 1]) { c.on(sk, F(x + s * 1.1), F(top - 1), Mat.Ember, 5); horn(c, [[x + s * 1.8, top - 2.4], [x + s * 3.6, top - 4.6], [x + s * 3.4, top - 7]], 0.8); }
      for (const k of [-0.9, 0, 0.9]) fang(c, [x + k, top + 2.8], 0.3, 1);
      return;
    }
  }
  switch (tier) {
    case 1: {
      // Cajado da Floresta (Staff of the Woodlands): galho vivo com folhas e um ninho com ovos no topo.
      const pts: Pt[] = Array.from({ length: 9 }, (_, k) => [x + Math.sin(k * 1.1) * 0.7, bottom + (top + 2 - bottom) * (k / 8)] as Pt);
      c.unscaled(() => {
        chain(c, pts, 1.2, Mat.Wood, grain, 0.9);
        for (let k = 1; k < 8; k++) leaf(c, [pts[k][0] + (k % 2 ? 1.8 : -1.8), pts[k][1]], k % 2 ? 0.4 : 2.7, 1.5, 0.7);
      });
      const nest = c.fill(ebox(x, top, 3.4, 1.8), (xx, yy) => inEllipse(x, top + 0.2, 3.2, 1.6)(xx, yy) && yy + 0.5 > top - 0.4, Mat.Wood, () => 0.5, (X, Y) => ((X + Y * 2) % 3 === 0 ? -1 : 1));
      void nest;
      for (const k of [-1.2, 0.2, 1.4]) gem(c, [x + k, top - 0.6], 0.8, Mat.Sapphire);
      return;
    }
    case 2: {
      // Cajado da Víbora (Staff of the Adder): uma serpente viva enrolada; a cabeça é a ponta, com veneno nas presas.
      const head = coil(c, x, at[1] + 2, top + 1, 2.5, 0.9, Mat.Leaf, scales(4, 3), () => { shaft(Mat.Wood, 0.95); ferrule(Mat.Bronze); });
      const h = ellipse(c, x, top - 0.6, 1.8, 1.5, Mat.Leaf, scales(4, 3));
      for (const s of [-1, 1]) { c.on(h, F(x + s * 0.8), F(top - 1.1), Mat.Amber, 5); fang(c, [x + s * 0.6, top + 0.6], 0.25, 1); }
      c.px(F(x + 0.6), F(top + 2), Mat.Leaf, 5); c.px(F(x + 0.6), F(top + 2.4), Mat.Leaf, 4);
      void head;
      return;
    }
    case 3: {
      // Cajado do Poder (Staff of Power): esfera de energia no topo cercada por dois anéis em órbita.
      shaft(Mat.Iron, 1.1, hammered); ferrule(Mat.Trim);
      const cy = top - 1.4;
      const orb = ellipse(c, x, cy, 2.4, 2.4, Mat.Gem);
      for (const [ddx, ddy] of [[-1, -1], [-0.6, -1.2]] as const) c.on(orb, F(x + ddx), F(cy + ddy), Mat.White, 5);
      for (const [rx, ry, tilt] of [[4.4, 1.2, 0.3], [4, 1.1, -0.5]] as const) {
        for (let k = 0; k < 60; k++) {
          const a = (k / 60) * Math.PI * 2, px0 = Math.cos(a) * rx, py0 = Math.sin(a) * ry;
          const qx = x + px0 * Math.cos(tilt) - py0 * Math.sin(tilt), qy = cy + px0 * Math.sin(tilt) + py0 * Math.cos(tilt);
          if (Math.sin(a) < 0 && Math.hypot(qx - x, qy - cy) < 2.4) continue;
          c.px(F(qx), F(qy), Mat.Trim, Math.sin(a) > 0 ? 5 : 3);
        }
      }
      c.unscaled(() => { for (const y of [top + 3, at[1] - 3.6]) limb(c, [x, y], [x, y + 0.8], 1.4, 1.4, Mat.Trim); });
      return;
    }
    case 4: {
      // Cajado do Arquimago (Staff of the Magi): estrela de 8 pontas no topo com pequenos astros em órbita.
      shaft(Mat.White, 1, (X, Y) => ((Y >> 2) % 4 === 0 ? -1 : 0)); ferrule(Mat.Trim);
      const cy = top - 2;
      const pts: Pt[] = [];
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? 1.5 : 3.4; pts.push([x + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      plate(c, pts, Mat.Trim);
      gem(c, [x, cy], 1, Mat.Sapphire);
      for (const [a, rr, m] of [[0.6, 5, Mat.Ember], [2.6, 4.6, Mat.Leaf], [4.4, 5.2, Mat.White]] as const) gem(c, [x + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6], 0.6, m);
      return;
    }
    default: {
      // Cajado do Dragão Ancião: um dragão vermelho enrolado na haste segura a gema na garra, lá em cima.
      coil(c, x, at[1] + 4, top + 2.6, 2, 1.1, Mat.RedDragon, scales(5, 4), () => { shaft(Mat.Wood, 1.05, (X, Y) => grain(X, Y) - 1); ferrule(Mat.Iron); });
      const h = ellipse(c, x - 1.4, top + 1.4, 1.9, 1.5, Mat.RedDragon, scales(4, 3));
      c.on(h, F(x - 2), F(top + 1), Mat.Amber, 5);
      horn(c, [[x - 0.4, top + 0.4], [x + 1, top - 1], [x + 0.8, top - 2.6]], 0.6);
      chain(c, [[x + 1.2, top + 1.6], [x + 2, top - 0.6], [x + 1.4, top - 2]], 0.55, Mat.RedDragon);
      gem(c, [x + 1.2, top - 3.2], 1.7, Mat.Ember);
      for (const k of [-1, 1]) chain(c, [[x + 1.2 + k * 1.4, top - 1.6], [x + 1.2 + k * 1.6, top - 3.4]], 0.3, Mat.Horn);
      return;
    }
  }
}

// --- Lote 6: chapéus, mantos e calças arcanos (docs/ARTE_ITENS.md) ----------------------

/** Lã: ponto de tricô em fileiras e um fio solto aqui e ali. */
export const wool: Offset = (X, Y) => ((X + (Y >> 1)) % 4 === 0 && noise(X, Y) < 0.6 ? -1 : noise(X, Y) < 0.04 ? 1 : 0);
/** Feltro: manchas largas e macias. */
export const felt: Offset = (X, Y) => (noise(X >> 2, Y >> 2) < 0.15 ? -1 : noise(X, Y) < 0.03 ? 1 : 0);
/** Seda: faixas de brilho compridas que descem. */
const silk = (cx: number): Offset => (X, Y) => {
  const k = ((X - F(cx)) % 9 + 9) % 9;
  return k === 0 ? -1 : k === 4 && noise(X, Y >> 3) < 0.7 ? 1 : 0;
};

/** Pano em pé: cilindro com a luz à esquerda. */
export const cloth = (cx: number, half: number): Shade => (x) => {
  const u = Math.max(-0.95, Math.min(0.95, (x + 0.5 - cx) / half));
  return lit(u, -0.25, Math.sqrt(1 - u * u));
};

/** Estrelinha de 1 px (com a cruz de brilho em `big`), só sobre as peças `ids` quando dadas. */
export function star(c: Canvas, ids: readonly number[] | null, X: number, Y: number, mat: Mat, big = false) {
  const put = (x: number, y: number, t: number) => (ids ? c.on(ids, x, y, mat, t) : c.px(x, y, mat, t));
  put(X, Y, 5);
  if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(X + dx, Y + dy, 3);
}

/** Sombra que a aba (ou o capuz) joga embaixo: escurece `rows` px logo abaixo da peça, coluna a coluna. */
function shadowBelow(c: Canvas, ids: readonly number[], x0: number, x1: number, rows: number) {
  for (let X = F(x0); X <= F(x1); X++) {
    for (let Y = c.h - 1; Y > 0; Y--) {
      if (!c.isAt(X, Y, ids)) continue;
      for (let k = 1; k <= rows; k++) c.nudge(X, Y + k, -1);
      break;
    }
  }
}

/** Faixa na base de uma peça (fita do chapéu): `rows` px acima do pixel mais baixo de cada coluna. */
function bandOver(c: Canvas, ids: readonly number[], x0: number, x1: number, from: number, rows: number, mat: Mat, tone: (k: number, X: number) => number) {
  for (let X = F(x0); X <= F(x1); X++) {
    for (let Y = c.h - 1; Y > 0; Y--) {
      if (!c.isAt(X, Y, ids)) continue;
      for (let k = 0; k < rows; k++) c.on(ids, X, Y - from - k, mat, tone(k, X));
      break;
    }
  }
}

/** Remendo costurado (retângulo de pano só sobre as peças `ids`), com os pontos da costura em volta. */
function patch(c: Canvas, ids: readonly number[], x: number, y: number, w: number, h: number, mat: Mat, offset?: Offset) {
  const id = c.fill([x - 0.5, y - 0.5, x + w + 0.5, y + h + 0.5], (xx, yy, X, Y) =>
    xx + 0.5 >= x && xx + 0.5 <= x + w && yy + 0.5 >= y && yy + 0.5 <= y + h && c.is(X, Y, ids), mat, cloth(x + w / 2, w), offset);
  for (let X = F(x); X <= F(x + w); X += 2) { c.on(id, X, F(y), Mat.Linen, 4); c.on(id, X + 1, F(y + h), Mat.Linen, 3); }
  for (let Y = F(y) + 1; Y <= F(y + h); Y += 2) { c.on(id, F(x), Y, Mat.Linen, 4); c.on(id, F(x + w), Y + 1, Mat.Linen, 3); }
  return id;
}

/** Pingente de borla: gota listrada pendurada em `at`. */
function tassel(c: Canvas, at: Pt, mat: Mat) {
  const id = limb(c, at, [at[0], at[1] + 2.2], 0.55, 1.05, mat, (X) => (X % 2 ? -1 : 0));
  ellipse(c, at[0], at[1], 0.7, 0.6, Mat.Bronze);
  return id;
}

// --- Capuz e chapéu genéricos ------------------------------------------------------------

/** Abertura do rosto no capuz (de frente e de lado). */
const hoodOpening = (view: ProtoDir, cx: number, cy: number): [number, number, number, number] | null =>
  view === "down" ? [cx, cy + 2.6, 7.3, 9.4] : view === "side" ? [cx - 4.4, cy + 2.8, 6.2, 9.6] : null;

/**
 * Capuz: cobre a cabeça e cai nos ombros, com a abertura do rosto e a barra virada em volta dela.
 * `peak` puxa uma ponta para cima (de frente) ou para trás (de lado).
 */
function hood(c: Canvas, view: ProtoDir, cx: number, cy: number, top: number, mat: Mat, offset?: Offset, peak = 0): number {
  const ox = view === "side" ? cx + 1 : cx;
  const head = inEllipse(ox, cy - 1.4, 10.6, 11);
  const drape = inPoly(view === "side"
    ? [[ox - 3, cy + 3], [ox + 9.4, cy], [ox + 12.2, top + 3.4], [ox + 9.6, top + 7], [ox - 1, top + 5.6], [ox - 5.4, cy + 10.4]]
    : [[ox - 9.6, cy + 1], [ox - 13.6, top + 3.2], [ox - 12, top + 6.6], [ox, top + 7.8], [ox + 12, top + 6.6], [ox + 13.6, top + 3.2], [ox + 9.6, cy + 1]]);
  const tip = !peak ? () => false : inPoly(view === "side"
    ? [[ox + 1, cy - 11.2], [ox + 9.8, cy - 5], [ox + 9.6 + peak, cy - 12 - peak * 0.4]]
    : [[ox - 4.6, cy - 10.4], [ox + 4.6, cy - 10.4], [ox + (view === "up" ? -1 : 1) * peak * 0.4, cy - 12.6 - peak]]);
  const o = hoodOpening(view, cx, cy);
  const open = o ? inEllipse(o[0], o[1], o[2], o[3]) : () => false;
  const sh = sphere(ox, cy - 2, 11, 12), drapeSh = cloth(ox, 14);
  const id = c.fill([ox - 14, cy - 14 - peak, ox + 14 + peak, top + 8], (x, y) => (head(x, y) || drape(x, y) || tip(x, y)) && !open(x, y), mat,
    (x, y) => (y < cy + 4 ? sh(x, y) : drapeSh(x, y)), offset);
  if (o) {
    // Barra virada em volta do rosto (clara do lado da luz), dobra escura por dentro e a sombra do capuz na testa.
    for (let a = 0; a < Math.PI * 2; a += 0.015) {
      const ca = Math.cos(a), sa = Math.sin(a);
      c.on(id, F(o[0] + ca * (o[2] + 0.5)), F(o[1] + sa * (o[3] + 0.5)), mat, 1);
      c.on(id, F(o[0] + ca * (o[2] + 1.3)), F(o[1] + sa * (o[3] + 1.3)), mat, ca < 0.3 && sa < 0.4 ? 4 : 3);
      if (sa < -0.25) { c.nudge(F(o[0] + ca * (o[2] - 0.5)), F(o[1] + sa * (o[3] - 0.5)), -1); c.nudge(F(o[0] + ca * (o[2] - 1.1)), F(o[1] + sa * (o[3] - 1.1)), -1); }
    }
  } else thread(c, [ox, cy - 11.6 - peak * 0.8], [ox, top + 6], mat, 1, [id]);
  return id;
}

interface Cone { ids: number[]; at: (t: number) => Pt; w: (t: number) => number }

/**
 * Copa do chapéu pontudo: sai da aba (`by`) e sobe `h`, a ponta indo `bend` para o lado (para trás de lado) e caindo
 * `droop`. `keep` recorta (listras); a luz segue a curva.
 */
function hatCone(c: Canvas, view: ProtoDir, cx: number, cy: number, h: number, bend: number, droop: number, base: number, mat: Mat, offset?: Offset, keep?: (x: number, y: number) => boolean): Cone {
  const ox = view === "side" ? cx + 1.2 : cx;
  const by = cy - 4.4;
  const dir = view === "up" ? -1 : 1;
  const B: Pt = [ox, by], C: Pt = [ox, by - h * 0.62], T: Pt = [ox + bend * dir, by - h + droop];
  const at = (t: number): Pt => [(1 - t) ** 2 * B[0] + 2 * t * (1 - t) * C[0] + t * t * T[0], (1 - t) ** 2 * B[1] + 2 * t * (1 - t) * C[1] + t * t * T[1]];
  const w = (t: number) => base * Math.pow(1 - t, 1.55) + 0.4;
  const n = 40;
  const pts = [...Array(n + 1).keys()].map((i) => at(i / n));
  const near = (x: number, y: number) => {
    let best = { d: 1e9, t: 0, side: 0 };
    for (let i = 0; i < n; i++) {
      const s = seg(x + 0.5, y + 0.5, pts[i], pts[i + 1]);
      const tt = (i + s.t) / n;
      const r = s.d - w(tt);
      if (r < best.d) {
        const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
        best = { d: r, t: tt, side: (s.sx * -dy + s.sy * dx) / l };
      }
    }
    return best;
  };
  const floor = (x: number) => by + 0.9 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - ox) / base) ** 2));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const box: Box = [Math.min(...xs) - base - 1, Math.min(...ys) - base, Math.max(...xs) + base + 1, by + 2];
  const ids: number[] = [];
  const test = (x: number, y: number) => near(x, y).d <= 0 && y + 0.5 <= floor(x) && (!keep || keep(x, y));
  const shade: Shade = (x, y) => { const b = near(x, y); const u = Math.max(-0.95, Math.min(0.95, -b.side / w(b.t))); return lit(u, -0.35, Math.sqrt(1 - u * u)); };
  ids.push(c.fill(box, test, mat, shade, offset));
  return { ids, at, w };
}

/** Aba do chapéu: elipse vista de cima, mole (`wave`) e com a borda da frente mais escura; joga sombra no rosto. */
function hatBrim(c: Canvas, view: ProtoDir, cx: number, cy: number, rx: number, ry: number, mat: Mat, offset?: Offset, wave = 0) {
  const ox = view === "side" ? cx + 0.6 : cx, by = cy - 4.4;
  const rr = view === "side" ? rx * 0.9 : rx;
  const r = (x: number) => ry + wave * Math.sin((x + 0.5) * 0.9);
  const id = c.fill([ox - rr - 1, by - ry - wave - 1, ox + rr + 1, by + ry + wave + 1], (x, y) => ((x + 0.5 - ox) / rr) ** 2 + ((y + 0.5 - by) / r(x)) ** 2 <= 1, mat,
    (x, y) => lit((x + 0.5 - ox) / rr * 0.5, -0.75 + (y + 0.5 - by) / ry * 0.25, 0.65),
    (X, Y) => (offset ? offset(X, Y) : 0) + ((((X + 0.5) / K - 0.5 - ox) / rr) ** 2 + (((Y + 0.5) / K - 0.5 - by) / r((X + 0.5) / K - 0.5)) ** 2 > 0.62 && (Y + 0.5) / K - 0.5 > by ? -1 : 0));
  if (view !== "up") shadowBelow(c, [id], ox - rr * 0.7, ox + rr * 0.7, 3);
  return id;
}

/** Chapéu pontudo inteiro: aba, copa e fita. Devolve a copa (para remendos e enfeites). */
function pointedHat(c: Canvas, view: ProtoDir, cx: number, cy: number, o: { brim: number; brimH?: number; wave?: number; h: number; bend: number; droop: number; base?: number; mat: Mat; brimMat?: Mat; offset?: Offset; band?: Mat }) {
  hatBrim(c, view, cx, cy, o.brim, o.brimH ?? 2.6, o.brimMat ?? o.mat, o.offset, o.wave ?? 0);
  const cone = hatCone(c, view, cx, cy, o.h, o.bend, o.droop, o.base ?? 9.4, o.mat, o.offset);
  if (o.band !== undefined) { const band = o.band; bandOver(c, cone.ids, cx - 12, cx + 12, 0, 4, band, (k, X) => (k === 0 ? 1 : k === 3 ? 4 : X < F(cx) ? 3 : 2)); }
  return cone;
}

// --- Chapéus arcanos -------------------------------------------------------------------

function arcaneHat(c: Canvas, id: string, view: ProtoDir, cx: number, cy: number, top: number) {
  const ox = view === "side" ? cx + 1 : cx;
  const o = hoodOpening(view, cx, cy);
  switch (`${tierOf(id)}${isMagic(id) ? "m" : ""}`) {
    case "1": {
      // Capuz de lã: lã crua, cordão saindo da gola com borlas.
      hood(c, view, cx, cy, top, Mat.Wool, wool);
      if (view === "down") for (const s of [-1, 1]) { chain(c, [[ox + s * 3, cy + 11.4], [ox + s * 3.8, cy + 14.2], [ox + s * 3.4, top + 5.6]], 0.42, Mat.Linen); tassel(c, [ox + s * 3.4, top + 6], Mat.Linen); }
      if (view === "side") { chain(c, [[cx - 2.6, cy + 11.4], [cx - 3.6, top + 5.4]], 0.42, Mat.Linen); tassel(c, [cx - 3.6, top + 5.8], Mat.Linen); }
      return;
    }
    case "2": {
      // Chapéu pontudo: feltro surrado, aba mole, ponta caída e dois remendos.
      const cone = pointedHat(c, view, cx, cy, { brim: 13, brimH: 2.8, wave: 0.5, h: 18, bend: 7.4, droop: 7, mat: Mat.Felt, offset: felt, band: Mat.Leather });
      const p1 = cone.at(0.28), p2 = cone.at(0.55);
      patch(c, cone.ids, p1[0] - (view === "up" ? -1.6 : 3.6), p1[1] - 1.2, 3, 2.6, Mat.Wool, wool);
      patch(c, cone.ids, p2[0] + (view === "up" ? -2.4 : 0.6), p2[1] - 0.6, 2.2, 2, Mat.Linen, linen);
      // Vinco onde a ponta dobra.
      const k = cone.at(0.72);
      thread(c, [k[0] - cone.w(0.72), k[1] + 0.6], [k[0] + cone.w(0.72), k[1] - 0.4], Mat.Felt, 1, cone.ids);
      return;
    }
    case "2m": {
      // Chapéu do Ilusionista (Hat of Disguise): listras em diagonal de cinco cores, ponta torta com uma estrela.
      hatBrim(c, view, cx, cy, 12.4, 2.6, Mat.Violet, felt, 0.3);
      const mats = [Mat.Crest, Mat.Amber, Mat.Sapphire, Mat.Leaf, Mat.Gem];
      const stripe = (x: number, y: number) => ((Math.floor((x * 0.7 + y) / 2.6) % 5) + 5) % 5;
      let cone: Cone | undefined;
      const ids: number[] = [];
      mats.forEach((m, k) => { cone = hatCone(c, view, cx, cy, 19, -6.4, 2.4, 9.4, m, felt, (x, y) => stripe(x, y) === k); ids.push(...cone.ids); });
      bandOver(c, ids, cx - 12, cx + 12, 0, 4, Mat.Violet, (k) => (k === 0 ? 1 : k === 3 ? 4 : 3));
      const tip = cone!.at(1);
      star(c, null, F(tip[0]), F(tip[1]) - 2, Mat.Amber, true);
      for (const [dx, dy] of [[-4, -3], [3, -6], [5, 1]]) star(c, null, F(tip[0]) + dx, F(tip[1]) + dy, Mat.White);
      return;
    }
    case "3": {
      // Capuz rúnico: anil com ponta, runas acesas em volta do rosto.
      const h = hood(c, view, cx, cy, top, Mat.Indigo, velvet(ox), 2.4);
      if (o) {
        for (let a = 0, g = 0; a < Math.PI * 2; a += 0.34, g++) {
          const X = F(o[0] + Math.cos(a) * (o[2] + 2.3)), Y = F(o[1] + Math.sin(a) * (o[3] + 2.3));
          const glyph = [[0, 0], [0, 1], [1, 1]] as const, glyph2 = [[0, 0], [1, 0], [0, 1], [-1, 1]] as const;
          for (const [dx, dy] of g % 2 ? glyph : glyph2) c.on(h, X + dx, Y + dy, Mat.Arcane, dx === 0 && dy === 0 ? 5 : 4);
        }
      } else for (let Y = F(cy - 6); Y < F(top + 4); Y += 5) for (const [dx, dy] of [[0, 0], [0, 1], [1, 2], [-1, 2], [0, 3]] as const) c.on(h, F(ox) + 2 + dx, Y + dy, Mat.Arcane, 4);
      return;
    }
    case "3m": {
      // Capuz da Clarividência: prata, com o terceiro olho aberto na testa.
      const h = hood(c, view, cx, cy, top, Mat.Mithral, felt);
      if (view === "down") {
        const eye = plate(c, [[ox - 2.8, cy - 9.2], [ox, cy - 10.8], [ox + 2.8, cy - 9.2], [ox, cy - 7.6]], Mat.White);
        const iris = ellipse(c, ox, cy - 9.2, 1.05, 1.05, Mat.Sapphire);
        c.on(iris, F(ox), F(cy - 9.2), Mat.Eye, 0); c.on(iris, F(ox) - 1, F(cy - 9.6), Mat.White, 5);
        thread(c, [ox - 2.8, cy - 9.2], [ox, cy - 10.8], Mat.Eye, 0); thread(c, [ox, cy - 10.8], [ox + 2.8, cy - 9.2], Mat.Eye, 0);
        for (const [dx, dy] of [[-3, -3], [0, -4], [3, -3], [-5, -1], [5, -1]] as const) c.on(h, F(ox) + dx * 2, F(cy - 10.6) + dy, Mat.Amber, 5);
        void eye;
      } else if (view === "side") {
        plate(c, [[cx - 7.4, cy - 9.6], [cx - 6, cy - 10.8], [cx - 5.4, cy - 8], [cx - 7, cy - 8.2]], Mat.White);
        ellipse(c, cx - 6.6, cy - 9.2, 0.6, 0.8, Mat.Sapphire);
        for (const [dx, dy] of [[-2, -3], [1, -4], [3, -2]] as const) c.on(h, F(cx - 6.4) + dx * 2, F(cy - 11) + dy, Mat.Amber, 5);
      } else for (let Y = F(cy - 8); Y < F(top + 5); Y += 4) c.on(h, F(ox), Y, Mat.Sapphire, 4);
      return;
    }
    case "4": {
      // Chapéu do mago: azul-noite de aba larga, fita dourada, lua e estrelas.
      const cone = pointedHat(c, view, cx, cy, { brim: 15, brimH: 3, h: 20, bend: 3.6, droop: 2, base: 9.8, mat: Mat.Night, offset: felt, band: Mat.Bronze });
      const m = cone.at(0.36);
      const mx0 = m[0] + (view === "up" ? 2 : -2.2), my0 = m[1];
      c.fill(ebox(mx0, my0, 2.2, 2.2), (x, y) => inEllipse(mx0, my0, 2, 2)(x, y) && !inEllipse(mx0 + 1.1, my0 - 0.5, 1.7, 1.7)(x, y), Mat.Amber, sphere(mx0, my0, 2, 2));
      for (const [t, dx, big] of [[0.18, 3.6, true], [0.52, 2.2, false], [0.66, -1.2, true], [0.84, 0.6, false], [0.3, -5.6, false]] as const) {
        const p = cone.at(t);
        star(c, cone.ids, F(p[0] + dx * (view === "up" ? -1 : 1)), F(p[1]), t > 0.6 ? Mat.Amber : Mat.White, big);
      }
      return;
    }
    case "4m": {
      // Chapéu do Arquimago (Hat of Wizardry): altíssimo, violeta, com dois anéis de luz orbitando e estrelas.
      const cone = pointedHat(c, view, cx, cy, { brim: 13.6, brimH: 2.8, h: 27, bend: 6, droop: 3, base: 9.6, mat: Mat.Violet, offset: felt, band: Mat.Bronze });
      for (const t of [0.12, 0.3, 0.5, 0.7, 0.86]) { const p = cone.at(t); star(c, cone.ids, F(p[0] + (t * 13 % 2 - 1) * cone.w(t) * 0.6), F(p[1]), Mat.White, t < 0.4); }
      for (const [t, mat, orb] of [[0.28, Mat.Arcane, Mat.Bronze], [0.58, Mat.Bronze, Mat.Arcane]] as const) {
        const p = cone.at(t), rx = cone.w(t) + 4.4, ry = 1.5;
        for (let a = 0; a < Math.PI * 2; a += 0.02) {
          const X = F(p[0] + Math.cos(a) * rx), Y = F(p[1] + Math.sin(a) * ry);
          if (Math.sin(a) < 0 && c.is(X, Y, cone.ids)) continue;
          c.px(X, Y, mat, Math.sin(a) < 0 ? 3 : 5);
        }
        gem(c, [p[0] - rx * 0.86, p[1] + ry * 0.5], 0.9, orb);
      }
      return;
    }
    case "5": {
      // Coroa de chifres de dragão: aro de ouro, chifres subindo e virando para trás, rubi na testa.
      if (view === "side") {
        for (const [x, s] of [[-4.6, 0.8], [1.4, 1]] as const) horn(c, [[cx + x, cy - 5.4], [cx + x + 1.6 * s, cy - 9.6 * s], [cx + x + 4.6 * s, cy - 12.6 * s], [cx + x + 8 * s, cy - 13]], 1.9 * s);
        horn(c, [[cx + 6, cy - 4.6], [cx + 9.4, cy - 7.6], [cx + 13.2, cy - 8.4]], 1.1, -1);
        const band = c.fill([cx - 9.4, cy - 7, cx + 10.4, cy - 2], (x, y) => x + 0.5 > cx - 9 && x + 0.5 < cx + 10 && Math.abs(y + 0.5 - (cy - 4.6 + (x + 0.5 - cx) * 0.06)) < 1.2, Mat.Bronze, (x, y) => lit(0, (y + 0.5 - (cy - 4.6)) / 1.4, 0.8));
        gem(c, [cx - 8.4, cy - 4.8], 0.9, Mat.RedDragon);
        void band;
        return;
      }
      const s0 = view === "up" ? -1 : 1;
      for (const s of [-1, 1]) {
        horn(c, [[ox + s * 8.4, cy - 4.6], [ox + s * 11.4, cy - 8.6], [ox + s * 12, cy - 13], [ox + s * 10, cy - 17]], 2.1, view === "up" ? -1 : 0);
        horn(c, [[ox + s * 4.6, cy - 5.6], [ox + s * 6.2, cy - 9.4], [ox + s * 5.6, cy - 12.8]], 1.5, view === "up" ? -1 : 0);
        horn(c, [[ox + s * 1.6, cy - 5.8], [ox + s * 1.9, cy - 9]], 1.05, view === "up" ? -1 : 0);
      }
      const curve = (x: number) => cy - 4.6 + (1 - ((x + 0.5 - ox) / 9.8) ** 2) * 0.9 * s0;
      const band = c.fill([ox - 10.4, cy - 7, ox + 10.4, cy - 1.6], (x, y) => Math.abs(x + 0.5 - ox) < 9.8 && Math.abs(y + 0.5 - curve(x)) < 1.25, Mat.Bronze,
        (x, y) => lit((x + 0.5 - ox) / 10, (y + 0.5 - curve(x)) / 1.6, 0.8));
      for (let X = F(ox - 9.6); X <= F(ox + 9.6); X += 3) c.on(band, X, F(curve((X + 0.5) / K - 0.5)), Mat.Bronze, 1);
      if (view === "down") { ellipse(c, ox, cy - 4.2, 1.8, 1.6, Mat.Bronze); gem(c, [ox, cy - 4.2], 1.2, Mat.RedDragon); }
      return;
    }
    default: {
      // Diadema do Dragão Ancião: dragão de ouro mordendo a própria cauda em volta da testa, gema viva por cima.
      const sc = scales(4, 3);
      if (view === "side") {
        c.fill([cx - 9.4, cy - 6.6, cx + 10.4, cy - 2.6], (x, y) => x + 0.5 > cx - 8.6 && x + 0.5 < cx + 10 && Math.abs(y + 0.5 - (cy - 4.6 + (x + 0.5 - cx) * 0.06)) < 0.9, Mat.Bronze, (x, y) => lit(0, (y + 0.5 - (cy - 4.6)) / 1.2, 0.8), sc);
        const head = plate(c, [[cx - 6.4, cy - 6.4], [cx - 10.6, cy - 5.2], [cx - 10.4, cy - 3.6], [cx - 6.4, cy - 3.4]], Mat.Bronze, sc);
        c.on(head, F(cx - 7.6), F(cy - 5.6), Mat.Ember, 5);
        gem(c, [cx - 8, cy - 8.4], 1.3, Mat.Gem);
        for (const k of [2, 5, 8]) plate(c, [[cx + k - 0.6, cy - 5], [cx + k + 0.6, cy - 5], [cx + k + 0.4, cy - 6.8]], Mat.Horn);
        return;
      }
      const s0 = view === "up" ? -1 : 1;
      const curve = (x: number) => cy - 4.6 + (1 - ((x + 0.5 - ox) / 9.8) ** 2) * 0.9 * s0;
      c.fill([ox - 10.4, cy - 7, ox + 10.4, cy - 2], (x, y) => Math.abs(x + 0.5 - ox) < 9.8 && Math.abs(y + 0.5 - curve(x)) < 0.95, Mat.Bronze,
        (x, y) => lit((x + 0.5 - ox) / 10, (y + 0.5 - curve(x)) / 1.4, 0.8), sc);
      if (view === "up") { for (const k of [-6, -3, 0, 3, 6]) plate(c, [[ox + k - 0.6, curve(ox + k) - 0.6], [ox + k + 0.6, curve(ox + k) - 0.6], [ox + k, curve(ox + k) - 2.4]], Mat.Horn); return; }
      // Cabeça do dragão na testa, de boca aberta, e a ponta da cauda entrando nela.
      limb(c, [ox + 4.6, cy - 3.6], [ox + 1.8, cy - 3.8], 0.9, 0.35, Mat.Bronze, sc);
      const head = plate(c, [[ox - 3.4, cy - 6.4], [ox + 0.6, cy - 5.4], [ox + 1.6, cy - 4.6], [ox + 0.4, cy - 3.6], [ox + 1.4, cy - 2.4], [ox - 3.4, cy - 2.4], [ox - 4.4, cy - 4.4]], Mat.Bronze, sc);
      c.on(head, F(ox - 1.6), F(cy - 5), Mat.Ember, 5); c.on(head, F(ox - 1.6) + 1, F(cy - 5), Mat.Ember, 3);
      fang(c, [ox + 0.8, cy - 4.6], 0.3, 0.6); fang(c, [ox + 0.6, cy - 3.2], 0.3, 0.6, -1);
      for (const k of [-2.6, -1.2]) plate(c, [[ox + k - 0.5, cy - 6], [ox + k + 0.5, cy - 6], [ox + k + 0.6, cy - 7.6]], Mat.Horn);
      // Gema por cima, presa em garras, com brilho em volta.
      for (const s of [-1, 1]) chain(c, [[ox + s * 0.6, cy - 6.6], [ox + s * 1.8, cy - 8.4], [ox + s * 1.2, cy - 10]], 0.35, Mat.Bronze);
      gem(c, [ox, cy - 8.6], 1.6, Mat.Gem);
      for (const [dx, dy] of [[-4, -6], [4, -5], [0, -9], [-6, -1], [6, 0]] as const) star(c, null, F(ox) + dx, F(cy - 8.6) + dy, Mat.Arcane);
    }
  }
}

/** Capuz levantado do Manto Élfico: folhas sobrepostas e o rosto na sombra (só os olhos aparecem). */
function elvenHood(c: Canvas, view: ProtoDir, cx: number, cy: number, top: number) {
  const o = hoodOpening(view, cx, cy);
  if (o) for (let Y = F(o[1] - o[3]); Y < F(cy + 3.6); Y++) for (let X = F(o[0] - o[2]); X <= F(o[0] + o[2]); X++) if (inEllipse(o[0], o[1], o[2], o[3])((X + 0.5) / K - 0.5, (Y + 0.5) / K - 0.5)) c.nudge(X, Y, -1);
  const h = hood(c, view, cx, cy, top, Mat.Leaf, leafScales, 2.6);
  const ox = view === "side" ? cx + 1 : cx;
  if (view === "down") for (const s of [-1, 1]) leaf(c, [ox + s * 7.6, cy + 11.6], s < 0 ? 2.2 : 0.9, 2.2, 1.1, Mat.Mithral);
  else if (view === "up") thread(c, [ox, cy - 10], [ox, top + 6], Mat.Leaf, 1, [h]);
}

// --- Mantos arcanos --------------------------------------------------------------------

/** Gola em V com o pescoço e laço cruzado (túnica de cima). */
function laceNeck(c: Canvas, ids: readonly number[], top: number, lace: Mat, trim?: Mat) {
  const X0 = F(CX), T = F(top);
  for (let k = 0; k < 9; k++) {
    const w = k < 3 ? 4 - k : 1;
    for (let x = -w; x < w; x++) c.px(X0 + x, T + k, Mat.Skin, k < 2 ? 1 : x < 0 ? 3 : 2);
    if (k > 1 && k % 2 === 0) { c.px(X0 - 2, T + k, lace, 4); c.px(X0 + 1, T + k, lace, 3); c.px(X0 - 1, T + k + 1, lace, 4); c.px(X0, T + k + 1, lace, 3); }
  }
  if (trim !== undefined) for (let X = X0 - 9; X <= X0 + 8; X++) c.on(ids, X, T, trim, X < X0 ? 3 : 2);
}

/** Abertura da frente do manto longo: debrum da cintura à barra. */
function robeOpening(c: Canvas, ids: readonly number[], top: number, a: Mat, b: Mat, glow?: Mat) {
  for (let Y = F(top + 14); Y < F(FEET - 3.5); Y++) {
    c.on(ids, F(CX) - 1, Y, a, 4); c.on(ids, F(CX), Y, a, 2); c.on(ids, F(CX) + 1, Y, b, 0);
    if (glow !== undefined && Y % 6 === 0) c.on(ids, F(CX) - 1, Y, glow, 5);
  }
}

/** Capa atrás do corpo (de frente e de lado; de costas ela vem por cima, em `robeShoulders`). */
function capeBehind(c: Canvas, view: ProtoDir, top: number, sway: number, mat: Mat, offset?: Offset, cut?: (x: number, y: number) => boolean) {
  const pts: Pt[] = view === "side"
    ? [[CX + 1, top], [CX + 9.4, top + 1], [CX + 14 + sway, top + 29], [CX + 2 + sway, top + 29]]
    : [[CX - 12, top + 1], [CX + 12, top + 1], [CX + 17.4 + sway * 0.5, top + 29], [CX - 17.4 + sway * 0.5, top + 29]];
  return poly(c, pts, mat, CX - 16, CX + 16, (X, Y) => -1 + (offset ? offset(X, Y) : 0), cut);
}

function robeTorso(c: Canvas, id: string, top: number, view: ProtoDir, sway: number): number[] {
  const side = view === "side", down = view === "down";
  const x0 = side ? CX - 10 : CX - 13, x1 = side ? CX + 10 : CX + 13;
  const half = side ? 8.5 : 10.5, hx = side ? CX + 1 : CX;
  const long = (mat: Mat, offset?: Offset) => poly(c, side ? TORSO_SIDE(top, FEET - 3.5, 3.5, sway)
    : [[CX - 12.5, top + 2], [CX - 9, top], [CX + 9, top], [CX + 12.5, top + 2], [CX + 11, top + 13], [CX + 14.5 + sway, FEET - 3.5], [CX - 14.5 + sway, FEET - 3.5], [CX - 11, top + 13]], mat, x0, x1, offset);
  const fray = (x: number, y: number) => y + 0.5 > top + 23.4 - noise(Math.floor((x + 0.5) * 1.4), 9) * 1.4;
  const short = (mat: Mat, offset?: Offset) => poly(c, side ? TORSO_SIDE(top, top + 24, 2, sway * 0.5) : TORSO_FRONT(top, top + 24, 2), mat, x0, x1, offset, fray);
  switch (`${tierOf(id)}${isMagic(id) ? "m" : ""}`) {
    case "1": {
      // Túnica de linho: até o quadril, barra desfiada, dois remendos e cordão de couro.
      const t = short(Mat.Linen, linen);
      if (down) { patch(c, [t], CX + 4.4, top + 16, 3.4, 3, Mat.Wool, wool); patch(c, [t], CX - 9, top + 5.6, 2.8, 3.2, Mat.Felt, felt); laceNeck(c, [t], top, Mat.Leather); }
      else if (view === "up") patch(c, [t], CX - 5, top + 7, 3.6, 3, Mat.Wool, wool);
      else patch(c, [t], CX - 3.6, top + 16, 3, 3, Mat.Wool, wool);
      rope(c, [t], hx, half, top + 13.2, down, Mat.Leather);
      return [t];
    }
    case "1m": {
      // Túnica do Aprendiz (Robe of Useful Items): remendos que são objetos costurados e o livro no cinto.
      const t = short(Mat.Wool, wool);
      const glyphs: [number, number, Mat, Mat, readonly (readonly [number, number, number])[]][] = [
        [-9.4, 4.6, Mat.Indigo, Mat.Amber, [[2, 1, 2], [3, 1, 2], [2, 2, 5], [3, 2, 4], [2, 3, 4], [3, 3, 3], [2, 4, 2], [3, 4, 2]]], // lanterna
        [5.2, 4.2, Mat.Linen, Mat.Steel, [[1, 4, 4], [2, 3, 5], [3, 2, 4], [4, 1, 5], [1, 2, 2], [2, 4, 2]]], // adaga
        [4.6, 15.6, Mat.Felt, Mat.Linen, [[1, 1, 4], [2, 0, 4], [3, 0, 4], [4, 1, 3], [4, 2, 3], [3, 3, 2], [2, 3, 2], [1, 2, 4], [2, 1, 1], [3, 1, 1]]], // rolo de corda
        [-6.4, 16.4, Mat.Silk, Mat.Bronze, [[1, 1, 5], [2, 1, 4], [1, 2, 4], [2, 2, 2], [3, 2, 4], [4, 2, 4], [4, 3, 3]]], // chave
      ];
      for (const [gx, gy, m, ink, px] of down ? glyphs : side ? glyphs.slice(1, 2) : glyphs.slice(2, 4)) {
        const ax = side ? CX - 4.4 : CX + gx, p = patch(c, [t], ax, top + gy, 2.8, 2.8, m, wool);
        for (const [dx, dy, tt] of px) c.on(p, F(ax) + dx, F(top + gy) + dy, ink, tt);
      }
      sash(c, [t], hx, half, top + 12.6, down, Mat.Indigo, Mat.Bronze);
      if (view !== "up") {
        // Livro no cinto: capa de couro, páginas, fecho e uma runa.
        const bx = side ? CX - 3 : CX + 7.4, by = top + 15.2;
        const book = plate(c, [[bx - 1.8, by], [bx + 1.8, by], [bx + 1.8, by + 4.2], [bx - 1.8, by + 4.2]], Mat.Leather, leather);
        thread(c, [bx + 1.8, by + 0.4], [bx + 1.8, by + 3.8], Mat.Linen, 4);
        thread(c, [bx - 1.8, by + 2], [bx - 0.6, by + 2], Mat.Bronze, 5);
        for (const [dx, dy] of [[0, 1], [1, 1], [0, 2], [1, 3], [0, 3]] as const) c.on(book, F(bx) + dx, F(by + 1) + dy, Mat.Arcane, 4);
      }
      return [t];
    }
    case "2": case "2m": {
      // Manto de viagem: túnica de lã, capa de feltro com o capuz abaixado e broche (o Élfico: capa de folhas e capuz levantado).
      const elf = id === "robe-2-magic";
      if (view !== "up") capeBehind(c, view, top, sway, elf ? Mat.Leaf : Mat.Felt, elf ? leafScales : felt, elf ? leafCut(top + 29) : undefined);
      const t = short(elf ? Mat.Linen : Mat.Wool, elf ? linen : wool);
      belt(c, [t], hx, half, top, down);
      if (down) laceNeck(c, [t], top, elf ? Mat.Leaf : Mat.Leather);
      return [t];
    }
    case "3": {
      // Manto rúnico: anil até os pés, barra com runas acesas, abertura e faixa escuras.
      const r = long(Mat.Indigo, velvet(CX));
      hemRunes(c, [r], hx, 13, FEET - 10.6, Mat.Night, Mat.Arcane);
      if (down) robeOpening(c, [r], top, Mat.Night, Mat.Indigo, Mat.Arcane);
      sash(c, [r], hx, half, top + 12.6, down, Mat.Night, Mat.Arcane);
      return [r];
    }
    case "3m": {
      // Manto da Proteção (Cloak of Protection): verde-azinhavre, barra de prata, escudo com runa no peito.
      const r = long(Mat.Patina, velvet(CX));
      for (let X = F(x0 - 2); X <= F(x1 + 2); X++) for (let k = 0; k < 3; k++) c.on([r], X, F(FEET - 9) + k, Mat.Mithral, k === 0 ? 4 : k === 2 ? 1 : 3);
      if (down) {
        robeOpening(c, [r], top, Mat.Mithral, Mat.Patina);
        const sh = plate(c, [[CX - 3.4, top + 3], [CX + 3.4, top + 3], [CX + 3.2, top + 7], [CX, top + 10.4], [CX - 3.2, top + 7]], Mat.Mithral);
        for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [0, 3], [-1, 1], [1, 1], [-2, 2], [2, 2]] as const) c.on(sh, F(CX) + dx, F(top + 5) + dy, Mat.Arcane, 5);
        thread(c, [CX - 3.4, top + 3], [CX + 3.4, top + 3], Mat.Bronze, 4, [sh]);
      }
      sash(c, [r], hx, half, top + 12.6, down, Mat.Night, Mat.Mithral);
      return [r];
    }
    case "4": {
      // Vestes de mithral: pano prateado com brilho, constelação bordada em safira, faixa azul.
      const r = long(Mat.Mithral, velvet(CX));
      hemLines(c, [r], hx, 13, FEET - 9.4);
      if (down) {
        robeOpening(c, [r], top, Mat.Sapphire, Mat.Mithral);
        const stars: Pt[] = [[CX - 7.4, top + 4], [CX - 4.6, top + 7.6], [CX - 7.8, top + 10], [CX - 3, top + 11.2], [CX + 6.4, top + 18], [CX + 4, top + 22.4], [CX + 7.6, top + 26], [CX + 5, top + 30]];
        for (let i = 1; i < 4; i++) thread(c, stars[i - 1], stars[i], Mat.Sapphire, (k) => (k % 2 ? 3 : -1), [r]);
        for (let i = 5; i < 8; i++) thread(c, stars[i - 1], stars[i], Mat.Sapphire, (k) => (k % 2 ? 3 : -1), [r]);
        stars.forEach((p, i) => star(c, [r], F(p[0]), F(p[1]), i % 3 ? Mat.White : Mat.Sapphire, i % 3 === 0));
      } else for (let i = 0; i < 8; i++) star(c, [r], F(CX - 6 + noise(i, 3) * 12), F(top + 3 + noise(3, i) * 34), Mat.Sapphire, i % 3 === 0);
      sash(c, [r], hx, half, top + 12.6, down, Mat.Sapphire, Mat.Mithral);
      return [r];
    }
    case "4m": {
      // Manto do Arquimago (Robe of the Archmagi): violeta, colunas de runas acesas na frente, barra de ouro rúnica.
      const r = long(Mat.Violet, velvet(CX));
      hemRunes(c, [r], hx, 13, FEET - 10.6, Mat.Bronze, Mat.Arcane);
      if (down) {
        robeOpening(c, [r], top, Mat.Bronze, Mat.Violet);
        for (const s of [-1, 1]) for (let y = top + 15, g = 0; y < FEET - 12; y += 3.4, g++) {
          const glyph = [[0, 0], [0, 1], [0, 2], [1, g % 2 ? 0 : 2]] as const;
          for (const [dx, dy] of glyph) c.on([r], F(CX + s * 3.4) + dx * s, F(y) + dy, Mat.Arcane, dy === 1 ? 5 : 4);
        }
        for (const s of [-1, 1]) thread(c, [CX + s * 5, top + 15], [CX + s * 7.4, FEET - 11], Mat.Bronze, (k) => (k % 3 ? 4 : -1), [r]);
      } else if (view === "up") {
        for (let y = top + 3, g = 0; y < FEET - 12; y += 3.4, g++) for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [1, g % 2 ? 0 : 2], [-1, 1]] as const) c.on([r], F(CX) + dx, F(y) + dy, Mat.Arcane, 4);
      }
      sash(c, [r], hx, half, top + 12.6, down, Mat.Night, Mat.Bronze);
      return [r];
    }
    case "5": {
      // Manto de seda de dragão: seda vermelha até os pés, capa em asa atrás, mantelete de escamas no peito.
      if (view !== "up") dragonWings(c, view, top, false);
      const r = long(Mat.Silk, silk(CX));
      hemLines(c, [r], hx, 13, FEET - 9.4);
      const mant = plate(c, side ? [[CX - 9, top + 1], [CX + 9.6, top + 1], [CX + 9, top + 8], [CX - 9.6, top + 8.6]] : [[CX - 12.6, top + 1], [CX + 12.6, top + 1], [CX + 11.6, top + 7], [CX, top + 10.4], [CX - 11.6, top + 7]], Mat.RedDragon, scales(5, 4));
      if (down) for (const s of [-1, 1]) thread(c, [CX + s * 11.6, top + 7], [CX, top + 10.4], Mat.Horn, 3, [mant]);
      if (down) robeOpening(c, [r], top, Mat.Bronze, Mat.Silk);
      sash(c, [r], hx, half, top + 12.6, down, Mat.Dragon, Mat.Bronze);
      return [r, mant];
    }
    default: {
      // Manto das Estrelas (Robe of Stars): o céu da noite dentro do manto, lua crescente no peito e barra de prata.
      const r = long(Mat.Night, velvet(CX));
      for (let Y = F(top + 1); Y < F(FEET - 4); Y++) for (let X = F(x0 - 2); X <= F(x1 + 2); X++) {
        const n = noise(X * 3, Y * 5);
        if (n < 0.014) star(c, [r], X, Y, n < 0.004 ? Mat.Amber : Mat.White, n < 0.003);
        else if (n > 0.994) c.on([r], X, Y, Mat.Sapphire, 4);
      }
      if (down) {
        const mx0 = CX - 6, my0 = top + 6;
        c.fill(ebox(mx0, my0, 2.6, 2.6), (x, y) => inEllipse(mx0, my0, 2.4, 2.4)(x, y) && !inEllipse(mx0 + 1.2, my0 - 0.6, 2, 2)(x, y), Mat.Amber, sphere(mx0, my0, 2.4, 2.4));
        robeOpening(c, [r], top, Mat.Mithral, Mat.Night);
      }
      for (let X = F(x0 - 2); X <= F(x1 + 2); X++) for (let k = 0; k < 3; k++) c.on([r], X, F(FEET - 7) + k, Mat.Mithral, k === 0 ? 4 : k === 2 ? 1 : 3);
      sash(c, [r], hx, half, top + 12.6, down, Mat.Mithral, Mat.Sapphire);
      return [r];
    }
  }
}

/** Asas de seda do manto de dragão: atrás dos ombros (de frente e de lado) ou dobradas pelas costas (`back`). */
function dragonWings(c: Canvas, view: ProtoDir, top: number, back: boolean) {
  const sides = view === "side" ? [1] : [-1, 1];
  for (const s of sides) {
    const root: Pt = [CX + (view === "side" ? 5 : s * 6), top + 2];
    const tips: Pt[] = back
      ? [[CX + s * 11, top - 3], [CX + s * 15, top + 12], [CX + s * 13.4, top + 26], [CX + s * 5, top + 30]]
      : view === "side"
        ? [[CX + 13, top - 6], [CX + 18, top + 6], [CX + 16, top + 19], [CX + 9, top + 27]]
        : [[CX + s * 16, top - 11], [CX + s * 21, top + 3], [CX + s * 19.4, top + 17], [CX + s * 11, top + 26]];
    // Membrana recortada entre as varetas e as varetas de chifre por cima.
    const pts: Pt[] = [root, tips[0]];
    for (let i = 1; i < tips.length; i++) { const m = lerp(tips[i - 1], tips[i], 0.5); pts.push([m[0] - s * 1.6 * (back ? 0.4 : 1), m[1] + 0.6], tips[i]); }
    pts.push([root[0], top + (back ? 26 : 20)]);
    plate(c, pts, Mat.Silk, (X, Y) => (back ? 0 : -1) + ((X + Y) % 6 === 0 ? -1 : 0));
    for (const tp of tips) chain(c, [root, lerp(root, tp, 0.5), tp], 0.55, Mat.Horn, undefined, 0.3);
    horn(c, [root, [root[0] + s * 1.6, root[1] - 2.4], tips[0]], 0.8);
  }
}

/** Gola atrás da cabeça que o manto vestido traz (capuz abaixado, gola alta ou a gola enorme do Arquimago). */
function robeCollar(c: Canvas, kit: Kit, cy: number, view: ProtoDir) {
  const id = kit.armor!, side = view === "side";
  switch (id) {
    case "robe-2": case "robe-2-magic": {
      if (id === "robe-2-magic" && !kit.helmet) return;
      const [mat, off] = id === "robe-2" ? [Mat.Felt, felt] : [Mat.Leaf, leafScales];
      if (view === "up") {
        const h = plate(c, [[CX - 8.4, cy + 7.4], [CX + 8.4, cy + 7.4], [CX + 7.4, cy + 16], [CX, cy + 21.6], [CX - 7.4, cy + 16]], mat, off);
        thread(c, [CX - 5, cy + 9.6], [CX, cy + 19.6], mat, 1, [h]); thread(c, [CX + 5, cy + 9.6], [CX, cy + 19.6], mat, 1, [h]);
      } else if (side) ellipse(c, CX + 5.4, cy + 9.4, 5.2, 3.6, mat, off);
      else ellipse(c, CX, cy + 10.8, 10, 3.4, mat, off);
      return;
    }
    case "robe-3": highCollar(c, cy, side, Mat.Indigo, Mat.Arcane); return;
    case "robe-4": highCollar(c, cy, side, Mat.Mithral, Mat.Sapphire); return;
    case "robe-5-magic": { const h = highCollar(c, cy, side, Mat.Night, Mat.Mithral); for (const [dx, dy] of [[-7, 7], [6, 5], [-3, 9], [8, 9]] as const) star(c, [h], F(CX + (side ? 3 + dx * 0.4 : dx)), F(cy + dy), Mat.White); return; }
    case "robe-4-magic": {
      // Gola enorme em leque, com debrum de ouro e runas acesas.
      const cx = side ? CX + 2.5 : CX;
      const pts: Pt[] = side
        ? [[cx - 2, cy + 7], [cx + 8.6, cy - 6], [cx + 11, cy + 11], [cx - 3, cy + 11.5]]
        : [[cx - 12.4, cy - 5], [cx - 5, cy + 9.6], [cx + 5, cy + 9.6], [cx + 12.4, cy - 5], [cx + 13.4, cy + 11.6], [cx - 13.4, cy + 11.6]];
      const h = poly(c, pts, Mat.Violet, cx - 13, cx + 13, velvet(cx));
      const edge: Pt[] = side ? [pts[0], pts[1]] : pts.slice(0, 4);
      for (let i = 1; i < edge.length; i++) {
        thread(c, edge[i - 1], edge[i], Mat.Bronze, (k) => (k % 2 ? 4 : 3), [h]);
        for (let t = 0.15; t < 0.95; t += 0.2) { const p = lerp(edge[i - 1], edge[i], t); c.on(h, F(p[0]) + (p[0] < cx ? 2 : -2), F(p[1]) + 2, Mat.Arcane, 5); c.on(h, F(p[0]) + (p[0] < cx ? 2 : -2), F(p[1]) + 3, Mat.Arcane, 4); }
      }
      return;
    }
    default: return;
  }
}

/** O que o manto põe por cima dos ombros, depois dos braços (capa de costas, ombreiras em escudo, escamas, asas). */
function robeShoulders(c: Canvas, id: string, top: number, view: ProtoDir, at: readonly Pt[], far: boolean) {
  const key = `${tierOf(id)}${isMagic(id) ? "m" : ""}`;
  if (key === "2" || key === "2m") {
    const elf = key === "2m";
    const [mat, off] = elf ? [Mat.Leaf, leafScales] : [Mat.Felt, felt];
    if (view === "up") {
      const cape = poly(c, [[CX - 11.8, top - 0.6], [CX + 11.8, top - 0.6], [CX + 14.2, top + 29], [CX - 14.2, top + 29]], mat, CX - 14, CX + 14, off, elf ? leafCut(top + 29) : undefined);
      for (const x of [-6, 0, 6]) thread(c, [CX + x * 0.7, top + 3], [CX + x, top + 27], mat, 1, [cape]);
    }
    // Capinha sobre os ombros, com a barra ondulada (de lado, só o ombro de cá).
    if (view === "side") {
      if (!far) c.fill(ebox(at[0][0] + 1, at[0][1] + 1.4, 6, 5), (x, y) => inEllipse(at[0][0] + 1.4, at[0][1] + 0.4, 5.6, 4.6)(x, y) && y + 0.5 < at[0][1] + 4.2 + Math.sin((x + 0.5) * 1.6) * 0.5, mat, sphere(at[0][0], at[0][1] - 1, 6, 5), off);
    } else for (const s of [-1, 1]) {
      const pts: Pt[] = [[CX + s * 5.4, top - 0.8], [CX + s * 11.4, top + 0.2], [CX + s * 15, top + 5], [CX + s * 13.8, top + 8.4], [CX + s * 10, top + 7.2], [CX + s * 6.6, top + 5.4]];
      const m = poly(c, pts, mat, CX + Math.min(s * 5.4, s * 15), CX + Math.max(s * 5.4, s * 15), off, (x, y) => y + 0.5 > top + 7.6 - Math.abs(Math.sin((x + 0.5) * 1.3)) * 1.2 + (Math.abs(x + 0.5 - CX) - 10) * 0.3);
      thread(c, [CX + s * 8, top + 0.4], [CX + s * 10.4, top + 6.4], mat, 1, [m]);
    }
    if (view === "down") {
      // Cordão do peito e o broche (folha de prata no Élfico).
      thread(c, [CX - 6.2, top + 3.6], [CX + 6.2, top + 3.6], elf ? Mat.Leaf : Mat.Leather, 2);
      if (elf) leaf(c, [CX - 6.4, top + 3.4], -0.6, 2, 1.1, Mat.Mithral);
      else { const b = ellipse(c, CX - 6.4, top + 3.4, 1.5, 1.5, Mat.Bronze); c.on(b, F(CX - 6.4), F(top + 3.4), Mat.Sapphire, 5); }
    }
    return;
  }
  if (key === "5" && view === "up") dragonWings(c, view, top, true);
  at.forEach((p, i) => {
    const s = view === "side" ? -1 : i === 0 ? -1 : 1;
    const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
    if (key === "3m") {
      // Ombreira em escudo de prata, aro de ouro e runa acesa.
      const pts: Pt[] = [[p[0] - 4.6, p[1] - 3], [p[0] + 4.6, p[1] - 3], [p[0] + 4.4, p[1] + 1.8], [p[0], p[1] + 6.2], [p[0] - 4.4, p[1] + 1.8]];
      const sh = poly(c, pts, Mat.Steel, p[0] - 4.6, p[0] + 4.6, dk(hammered));
      for (let j = 0; j < pts.length; j++) thread(c, pts[j], pts[(j + 1) % pts.length], Mat.Bronze, far ? 2 : 4, [sh]);
      for (const [dx, dy] of [[0, 0], [0, 1], [0, 2], [-1, 1], [1, 1], [0, 3]] as const) c.on(sh, F(p[0]) + dx, F(p[1]) + dy, Mat.Arcane, far ? 4 : 5);
      void s;
    } else if (key === "5") {
      c.fill(ebox(p[0], p[1], 5, 4), (x, y) => inEllipse(p[0], p[1] - 0.2, 4.8, 3.8)(x, y) && y < p[1] + 2.4, Mat.RedDragon, sphere(p[0], p[1] - 1, 5, 4), dk(scales(5, 4)));
      plate(c, [[p[0] + s * 0.4 - 0.8, p[1] - 2.6], [p[0] + s * 0.4 + 0.8, p[1] - 2.6], [p[0] + s * 1.6, p[1] - 5.6]], Mat.Horn);
    }
  });
}

/** A manga do manto (por cima da manga da classe). */
function robeArm(c: Canvas, id: string, shoulder: Pt, elbow: Pt, at: Pt, far: boolean) {
  const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
  const bell = (mat: Mat, offset: Offset | undefined, rim: Mat, mouthR = 5, ink?: Mat, rimOffset?: Offset) => {
    const mouth = lerp(elbow, at, 0.82);
    const ids = c.together(() => [limb(c, shoulder, elbow, 3.9, 3.8, mat, dk(offset)), limb(c, elbow, mouth, 3.9, mouthR, mat, dk(offset))]);
    const r = limb(c, lerp(elbow, mouth, 0.8), mouth, mouthR, mouthR + 0.2, rim, dk(rimOffset));
    for (let X = F(mouth[0] - mouthR); X <= F(mouth[0] + mouthR); X += 2) c.on(r, X, F(mouth[1] - 0.6), ink ?? rim, ink ? 5 : (X >> 1) % 2 ? 1 : 4);
    ellipse(c, mouth[0], mouth[1] + 2.6, mouthR - 1.4, 1.6, mat, () => -2);
    return ids;
  };
  const straight = (mat: Mat, offset: Offset | undefined, cuffMat: Mat) => {
    const cuffAt = lerp(elbow, at, 0.7);
    c.together(() => { limb(c, shoulder, elbow, 3.9, 3.6, mat, dk(offset)); limb(c, elbow, cuffAt, 3.6, 3.3, mat, dk(offset)); });
    limb(c, cuffAt, lerp(cuffAt, at, 0.35), 3.5, 3.5, cuffMat, dk(cuffMat === Mat.Leaf ? leafScales : leather));
  };
  const shortSleeve = (mat: Mat, offset: Offset | undefined) => {
    const end = lerp(shoulder, elbow, 0.95);
    const sl = limb(c, shoulder, end, 4.2, 4.2, mat, dk(offset));
    for (let X = F(end[0] - 4.6); X <= F(end[0] + 4.6); X++) if (noise(X, 4) < 0.5) c.on(sl, X, F(end[1] + 3.4), mat, 0);
    return sl;
  };
  switch (`${tierOf(id)}${isMagic(id) ? "m" : ""}`) {
    case "1": shortSleeve(Mat.Linen, linen); return;
    case "1m": shortSleeve(Mat.Wool, wool); return;
    case "2": straight(Mat.Wool, wool, Mat.Leather); return;
    case "2m": straight(Mat.Linen, linen, Mat.Leaf); return;
    case "3": bell(Mat.Indigo, velvet(shoulder[0]), Mat.Night, 5, Mat.Arcane); return;
    case "3m": bell(Mat.Patina, velvet(shoulder[0]), Mat.Mithral); return;
    case "4": bell(Mat.Mithral, velvet(shoulder[0]), Mat.Sapphire); return;
    case "4m": bell(Mat.Violet, velvet(shoulder[0]), Mat.Bronze, 5.2, Mat.Arcane); return;
    case "5": bell(Mat.Silk, silk(shoulder[0]), Mat.RedDragon, 5, undefined, scales(4, 3)); return;
    default: {
      const ids = bell(Mat.Night, velvet(shoulder[0]), Mat.Mithral);
      for (let k = 0; k < 7; k++) { const p = lerp(shoulder, at, noise(k, 7) * 0.8); star(c, ids, F(p[0] + (noise(7, k) - 0.5) * 5), F(p[1]), k % 3 ? Mat.White : Mat.Amber); }
    }
  }
}

// --- Calças arcanas --------------------------------------------------------------------

function pantsArt(c: Canvas, id: string, hip: Pt, knee: Pt, ankle: Pt, far: boolean, front: boolean) {
  const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
  // Lado de fora da perna (de lado, a costura fica no meio).
  const outer = hip[0] < CX - 1 ? -1 : hip[0] > CX + 2 ? 1 : 0;
  const along = (u: number): Pt => (u < 0.5 ? lerp(hip, knee, u * 2) : lerp(knee, ankle, (u - 0.5) * 2));
  const seamX = (u: number) => along(u)[0] + outer * (u < 0.5 ? 3.2 : 2.6);
  const body = (mat: Mat, offset?: Offset) => c.together(() => [limb(c, hip, knee, 4.5, 3.9, mat, dk(offset)), limb(c, knee, ankle, 3.9, 3.4, mat, dk(offset))]);
  const hem = (ids: readonly number[], mat: Mat, rows = 3) => {
    for (let X = F(ankle[0] - 4); X <= F(ankle[0] + 4); X++) for (let k = 0; k < rows; k++) c.on(ids, X, F(ankle[1] - 3.2) + k, mat, k === 0 ? (far ? 3 : 4) : k === rows - 1 ? 0 : far ? 1 : 2);
  };
  const kx = F(knee[0]), ky = F(knee[1]);
  const crease = () => { for (const [dx, dy] of [[-2, -1], [-1, 0], [0, 0], [1, 1], [-1, 3], [0, 3], [1, 4]]) c.nudge(kx + dx, ky + dy, -1); };
  switch (`${tierOf(id)}${isMagic(id) ? "m" : ""}`) {
    case "1": { const ids = body(Mat.Linen, linen); hem(ids, Mat.Linen); crease(); return; }
    case "2": {
      const ids = body(Mat.Wool, (X, Y) => wool(X, Y) + (Y % 9 < 2 ? -1 : 0));
      hem(ids, Mat.Wool);
      if (front || outer === 0) patch(c, ids, knee[0] - 1.8, knee[1] - 1.6, 3.4, 3, Mat.Felt, felt);
      return;
    }
    case "3": {
      const ids = body(Mat.Indigo, twill);
      hem(ids, Mat.Night);
      for (let u = 0.08, g = 0; u < 0.9; u += 0.11, g++) {
        const X = F(seamX(u)), Y = F(along(u)[1]);
        for (const [dx, dy] of (g % 2 ? [[0, 0], [0, 1], [0, 2], [1, 1]] : [[0, 0], [1, 0], [0, 1], [0, 2], [1, 2]]) as [number, number][]) c.on(ids, X + dx, Y + dy, Mat.Arcane, far ? 3 : 5);
      }
      return;
    }
    case "4": {
      const ids = body(Mat.Violet, twill);
      hem(ids, Mat.Mithral);
      // Bordado de prata: ramo em zigue-zague descendo pela costura, com folhinhas.
      for (let u = 0.04; u < 0.92; u += 0.012) {
        const X = F(seamX(u) + Math.sin(u * 40) * 0.8), Y = F(along(u)[1]);
        c.on(ids, X, Y, Mat.Mithral, far ? 3 : 5);
        if (Math.abs(Math.sin(u * 40)) > 0.97) c.on(ids, X - outer, Y - 1, Mat.Mithral, far ? 2 : 4);
      }
      return;
    }
    case "5": {
      const thigh = limb(c, hip, knee, 4.5, 3.9, Mat.Leather, dk(leather));
      const shin = limb(c, knee, ankle, 4.1, 3.6, Mat.RedDragon, dk(scales(5, 4)));
      ellipse(c, knee[0], knee[1] + 0.4, 2.6, 2.2, Mat.Dragon, dk(scales(4, 3)));
      if (front || outer === 0) plate(c, [[knee[0] - 0.9, knee[1] - 0.6], [knee[0] + 0.9, knee[1] - 0.6], [knee[0] + (outer || -1) * 0.4, knee[1] - 3]], Mat.Horn);
      hem([shin], Mat.Dragon);
      void thigh;
      return;
    }
    case "1m": {
      const ids = body(Mat.Linen, linen);
      hem(ids, Mat.Linen);
      const spots: [number, Mat][] = [[0.18, Mat.Crest], [0.42, Mat.Sapphire], [0.66, Mat.Leaf], [0.86, Mat.Amber]];
      spots.forEach(([u, m], k) => { const p = along(u); patch(c, ids, p[0] - 1.4 + (k % 2 ? 1 : -1) * 0.8, p[1] - 1, 2.4, 2.2, m); });
      return;
    }
    case "2m": {
      const ids = body(Mat.Gem, silk(hip[0]));
      hem(ids, Mat.Sapphire);
      for (let Y = F(hip[1]); Y < F(ankle[1]); Y++) for (let X = F(hip[0] - 5); X <= F(hip[0] + 5); X++) {
        if ((X * 2 + Y) % 11 === 0 && noise(X >> 1, Y >> 2) < 0.6) c.on(ids, X, Y, (Y >> 3) % 2 ? Mat.Arcane : Mat.Sapphire, far ? 3 : 4);
      }
      return;
    }
    case "3m": {
      const ids = body(Mat.Night, twill);
      hem(ids, Mat.Mithral);
      for (const u of [0.22, 0.7]) {
        const p = along(u), X = F(outer === 0 ? p[0] - 1.6 : p[0]), Y = F(p[1]);
        for (const [dx, dy, m, t] of [[-2, 0, Mat.White, 3], [-1, -1, Mat.White, 4], [0, -1, Mat.White, 4], [1, -1, Mat.White, 3], [2, 0, Mat.White, 2], [-1, 1, Mat.White, 2], [0, 1, Mat.White, 2], [1, 1, Mat.White, 2], [-1, 0, Mat.Sapphire, 4], [0, 0, Mat.Eye, 0], [1, 0, Mat.Sapphire, 3]] as const) c.on(ids, X + dx, Y + dy, m, far ? Math.max(0, t - 1) : t);
        for (const dx of [-2, 0, 2]) c.on(ids, X + dx, Y - 3, Mat.Mithral, far ? 2 : 4);
      }
      return;
    }
    case "4m": {
      const ids = body(Mat.Felt, felt);
      hem(ids, Mat.Leather);
      // Bolsinhos de componentes na coxa e um frasco aceso na canela.
      for (const u of [0.16, 0.34]) {
        const p = along(u), bx = outer === 0 ? p[0] - 0.6 : p[0] + outer * 1.4;
        const bag = plate(c, [[bx - 1.5, p[1] - 1], [bx + 1.5, p[1] - 1], [bx + 1.3, p[1] + 1.8], [bx - 1.3, p[1] + 1.8]], Mat.Leather, dk(leather));
        thread(c, [bx - 1.5, p[1] - 0.2], [bx + 1.5, p[1] - 0.2], Mat.Leather, 0, [bag]);
        c.on(bag, F(bx), F(p[1] + 0.4), Mat.Bronze, far ? 3 : 5);
      }
      const v = along(0.68), vx = outer === 0 ? v[0] - 0.4 : v[0] + outer * 1.2;
      limb(c, [vx, v[1] - 1.2], [vx, v[1] + 1.2], 0.8, 1, Mat.Arcane, dk());
      ellipse(c, vx, v[1] - 1.6, 0.6, 0.4, Mat.Wood);
      thread(c, [vx - 1.6, v[1] - 0.4], [vx + 1.6, v[1] - 0.4], Mat.Leather, 1);
      return;
    }
    default: {
      const ids = body(Mat.Silk, silk(hip[0]));
      hem(ids, Mat.Dragon);
      // Membrana de asa saindo da lateral da canela, com as varetas de chifre.
      const s = outer === 0 ? 1 : outer;
      const a = along(0.56), b = along(0.86);
      const tipA: Pt = [a[0] + s * 7, a[1] - 3], tipB: Pt = [b[0] + s * 6, b[1] - 0.6];
      plate(c, [[a[0] + s * 2.4, a[1] - 0.6], tipA, [lerp(tipA, tipB, 0.5)[0] - s * 1.4, lerp(tipA, tipB, 0.5)[1] + 0.4], tipB, [b[0] + s * 2.4, b[1] + 0.6]], Mat.RedDragon, dk((X, Y) => ((X + Y) % 5 === 0 ? -1 : 0)));
      for (const tp of [tipA, tipB]) chain(c, [[a[0] + s * 2.2, (a[1] + b[1]) / 2], tp], 0.4, Mat.Horn, dk(), 0.25);
      void ids;
    }
  }
}

// --- Lote 7: perneiras de guerra, botas e escudos (docs/ARTE_ITENS.md) -------------------

/** Perneiras de guerra (cavaleiro e paladino): trocam a calça do kit; a bota continua por cima. */
function warLegs(c: Canvas, id: string, hip: Pt, knee: Pt, ankle: Pt, far: boolean, front: boolean) {
  const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
  const outer = hip[0] < CX - 1 ? -1 : hip[0] > CX + 2 ? 1 : 0;
  const along = (u: number): Pt => (u < 0.5 ? lerp(hip, knee, u * 2) : lerp(knee, ankle, (u - 0.5) * 2));
  const body = (mat: Mat, offset?: Offset) => c.together(() => [limb(c, hip, knee, 4.5, 3.9, mat, dk(offset)), limb(c, knee, ankle, 3.9, 3.4, mat, dk(offset))]);
  const shin = (mat: Mat, offset?: Offset, from = 0.08) => limb(c, lerp(knee, ankle, from), lerp(knee, ankle, 0.95), 4.1, 3.7, mat, dk(offset));
  const cop = (mat: Mat, r = 2.6, offset?: Offset) => ellipse(c, knee[0], knee[1] + 0.2, r, r * 0.9, mat, dk(offset));
  const showFace = front || outer === 0;
  switch (`${tierOf(id)}${isMagic(id) ? "m" : ""}`) {
    case "1": {
      // Calças de couro: joelheira de couro grosso costurada.
      const ids = body(Mat.Leather, leather);
      const k = cop(Mat.Leather, 2.7, (X, Y) => leather(X, Y) - 1);
      for (let a = 0; a < Math.PI * 2; a += 0.5) c.on(k, F(knee[0] + Math.cos(a) * 2), F(knee[1] + 0.2 + Math.sin(a) * 1.7), Mat.Linen, far ? 2 : 4);
      thread(c, [hip[0] + outer * 3.6, hip[1] + 1], [ankle[0] + outer * 2.8, ankle[1] - 2], Mat.Leather, (j) => (j % 3 === 0 ? 0 : -1), ids);
      return;
    }
    case "1m": {
      // Calças do Viajante: bolsos com aba nas coxas e o cantil pendurado do lado.
      const ids = body(Mat.Leather, leather);
      cop(Mat.Leather, 2.4, (X, Y) => leather(X, Y) - 1);
      const p = along(0.24), bx = outer === 0 ? p[0] - 0.6 : p[0] + outer * 0.6;
      const pocket = plate(c, [[bx - 2, p[1] - 1.4], [bx + 2, p[1] - 1.4], [bx + 1.8, p[1] + 2.2], [bx - 1.8, p[1] + 2.2]], Mat.Leather, dk(leather));
      thread(c, [bx - 2, p[1] - 0.4], [bx + 2, p[1] - 0.4], Mat.Leather, 0, [pocket]);
      c.on(pocket, F(bx), F(p[1]), Mat.Bronze, far ? 3 : 5);
      if (!far && outer !== 0) {
        const v: Pt = [hip[0] + outer * 4.6, hip[1] + 3.4];
        thread(c, [hip[0] + outer * 3, hip[1] - 1], [v[0], v[1] - 2], Mat.Leather, 1);
        const flask = ellipse(c, v[0], v[1], 1.9, 2.3, Mat.Wood, grain);
        for (const y of [-0.8, 0.8]) thread(c, [v[0] - 1.9, v[1] + y], [v[0] + 1.9, v[1] + y], Mat.Leather, 1, [flask]);
        ellipse(c, v[0], v[1] - 2.6, 0.7, 0.6, Mat.Linen);
      }
      void ids;
      return;
    }
    case "2": {
      // Perneiras de bronze: calça de couro, greva de bronze e joelheira em cabeça de touro.
      body(Mat.Leather, leather);
      const g = shin(Mat.Bronze);
      thread(c, lerp(knee, ankle, 0.2), lerp(knee, ankle, 0.9), Mat.Bronze, far ? 3 : 5, [g]);
      const k = cop(Mat.Bronze, 2.5);
      if (showFace) {
        for (const s of [-1, 1]) horn(c, [[knee[0] + s * 1.8, knee[1] - 0.8], [knee[0] + s * 3.4, knee[1] - 1.8], [knee[0] + s * 3.2, knee[1] - 3.4]], 0.6, far ? -1 : 0);
        for (const s of [-1, 1]) c.on(k, F(knee[0] + s * 0.9), F(knee[1] - 0.2), Mat.Eye, 0);
        c.on(k, F(knee[0]), F(knee[1] + 1.4), Mat.Bronze, 1); c.on(k, F(knee[0]) - 1, F(knee[1] + 1.4), Mat.Bronze, 1);
      }
      return;
    }
    case "2m": {
      // Perneiras do Gladiador: tiras de couro na coxa e uma greva só, na perna da frente.
      const strips = limb(c, hip, lerp(hip, knee, 0.7), 4.7, 4.4, Mat.Leather, dk((X) => ((X + 0.5) % 5 < 1 ? -1 : 0)));
      for (let X = F(hip[0] - 5); X <= F(hip[0] + 5); X += 4) c.on(strips, X, F(lerp(hip, knee, 0.7)[1] + 3.6), Mat.Bronze, far ? 3 : 5);
      if (outer > 0 || (outer === 0 && !far)) {
        const g = shin(Mat.Bronze, undefined, 0);
        thread(c, lerp(knee, ankle, 0.1), lerp(knee, ankle, 0.9), Mat.Bronze, 5, [g]);
        cop(Mat.Bronze, 2.6);
        for (const t of [0.35, 0.7]) { const p = lerp(knee, ankle, t); thread(c, [p[0] - 4, p[1]], [p[0] + 4, p[1]], Mat.Leather, 1, [g]); }
      } else {
        // A outra perna fica com a faixa de linho enrolada no joelho.
        const w = limb(c, lerp(knee, ankle, -0.05), lerp(knee, ankle, 0.2), 3.7, 3.6, Mat.Linen, dk(linen));
        for (let Y = F(knee[1] - 1); Y < F(knee[1] + 3); Y += 2) c.on(w, F(knee[0]) + (Y % 4 ? 2 : -2), Y, Mat.Linen, 1);
      }
      return;
    }
    case "3": {
      // Perneiras de malha: malha inteira e joelheira de ferro rebitada.
      body(Mat.Steel, (X, Y) => mail(X, Y) - 1);
      const k = cop(Mat.Steel, 2.8, hammered);
      for (const a of [0.3, 1.3, 2.3, 3.3, 4.3, 5.3]) rivet(c, [k], knee[0] + Math.cos(a) * 2, knee[1] + 0.2 + Math.sin(a) * 1.6);
      return;
    }
    case "3m": {
      // Perneiras de Malha Élfica: malha fina prateada com folhas na barra e uma folha no joelho.
      body(Mat.Mithral, (X, Y) => ((X + (Y % 2)) % 2 === 0 ? -1 : 0));
      for (let x = -3; x <= 3; x += 2) leaf(c, [ankle[0] + x, ankle[1] - 2.2], Math.PI / 2 + x * 0.12, 1.4, 0.7, Mat.Leaf);
      if (showFace) leaf(c, [knee[0], knee[1]], -Math.PI / 2, 2, 1, Mat.Mithral);
      return;
    }
    case "4": {
      // Coxotes de mithral: placas na coxa e na canela, joelheira em cara de leão.
      body(Mat.Leather, leather);
      const th = limb(c, lerp(hip, knee, 0.1), lerp(hip, knee, 0.85), 4.7, 4.2, Mat.Mithral, dk());
      for (const t of [0.4, 0.62]) { const p = lerp(hip, knee, t); thread(c, [p[0] - 4.4, p[1]], [p[0] + 4.4, p[1]], Mat.Mithral, 1, [th]); }
      const g = shin(Mat.Mithral);
      thread(c, lerp(knee, ankle, 0.2), lerp(knee, ankle, 0.9), Mat.Mithral, 5, [g]);
      if (showFace) {
        c.fill(ebox(knee[0], knee[1], 3.4, 3.2), (x, y, X, Y) => Math.hypot(x + 0.5 - knee[0], y + 0.5 - knee[1]) < 2.9 + (Math.round(Math.atan2(Y - F(knee[1]), X - F(knee[0])) * 3) % 2 ? 0.5 : 0), Mat.Mane, sphere(knee[0], knee[1] - 1, 3.4, 3.2), dk());
        const f = ellipse(c, knee[0], knee[1] + 0.3, 1.7, 1.9, Mat.Trim, dk());
        for (const s of [-1, 1]) c.on(f, F(knee[0] + s * 0.7), F(knee[1] - 0.2), Mat.Eye, 0);
        c.on(f, F(knee[0]), F(knee[1] + 1.2), Mat.Horn, 1);
      } else cop(Mat.Mithral, 2.6);
      return;
    }
    case "4m": {
      // Coxotes do Guardião: aço com um escudinho de borda dourada em cada coxa.
      body(Mat.Leather, leather);
      shin(Mat.Steel, hammered);
      cop(Mat.Steel, 2.6, hammered);
      const p = along(0.24), sx = outer === 0 ? p[0] - 0.4 : p[0];
      const pts: Pt[] = [[sx - 2.8, p[1] - 2.6], [sx + 2.8, p[1] - 2.6], [sx + 2.7, p[1] + 0.6], [sx, p[1] + 3.4], [sx - 2.7, p[1] + 0.6]];
      const sh = plate(c, pts, Mat.Steel, dk(hammered));
      for (let j = 0; j < pts.length; j++) thread(c, pts[j], pts[(j + 1) % pts.length], Mat.Bronze, far ? 2 : 4, [sh]);
      c.on(sh, F(sx), F(p[1] - 0.4), Mat.Sapphire, far ? 3 : 5); c.on(sh, F(sx), F(p[1] + 0.4), Mat.Sapphire, far ? 2 : 4);
      return;
    }
    case "5": {
      // Perneiras de escamas de dragão: escamas da coxa à canela e três garras no joelho.
      body(Mat.Dragon, scales(5, 4));
      cop(Mat.Dragon, 2.6, scales(4, 3));
      if (showFace) for (const k of [-1.4, 0, 1.4]) plate(c, [[knee[0] + k - 0.5, knee[1] + 1.4], [knee[0] + k + 0.5, knee[1] + 1.4], [knee[0] + k * 1.3, knee[1] + 3.6]], Mat.Horn);
      return;
    }
    default: {
      // Perneiras do Dragão: escamas vermelhas com espinhos de chifre descendo pela canela.
      body(Mat.RedDragon, scales(5, 4));
      cop(Mat.Dragon, 2.7, scales(4, 3));
      const s = outer === 0 ? -1 : outer;
      for (const t of [0.25, 0.5, 0.75]) {
        const p = lerp(knee, ankle, t);
        plate(c, [[p[0] + s * 2.6, p[1] - 0.9], [p[0] + s * 2.6, p[1] + 0.9], [p[0] + s * 5.4, p[1] - 1.6]], Mat.Horn, dk());
      }
    }
  }
}

/** Bota básica: cano de `topY` até o tornozelo, pé e sola. Devolve [cano, pé]. */
function bootBase(c: Canvas, ankle: Pt, toe: Pt, far: boolean, topY: number, mat: Mat, offset?: Offset, r = 3.8): [number, number] {
  const shaft = limb(c, [ankle[0], topY + r], ankle, r, r - 0.1, mat, darker(offset, far));
  const foot = limb(c, ankle, toe, 3.5, 2.9, mat, darker(offset, far));
  sole(c, [foot, shaft], Math.min(ankle[0], toe[0]) - 4, Math.max(ankle[0], toe[0]) + 4, Mat.Detail, far);
  return [shaft, foot];
}

/** Botas (todos): trocam o calçado do kit. */
function bootsArt(c: Canvas, id: string, knee: Pt, ankle: Pt, toe: Pt, far: boolean, front: boolean) {
  const dk = (o?: Offset): Offset => (X, Y) => (o ? o(X, Y) : 0) + (far ? -1 : 0);
  const sideView = Math.abs(toe[0] - ankle[0]) > 1;
  const fwd = sideView ? Math.sign(toe[0] - ankle[0]) : 0;
  // Lado de fora do tornozelo (de lado: para trás).
  const out = sideView ? -fwd : ankle[0] < CX ? -1 : 1;
  const midShin = knee[1] + (ankle[1] - knee[1]) * 0.45;
  const fold = (ids: readonly number[], y: number, mat: Mat) => {
    for (let X = F(ankle[0] - 4.4); X <= F(ankle[0] + 4.4); X++) { c.on(ids, X, F(y), mat, far ? 3 : 5); c.on(ids, X, F(y) + 1, mat, far ? 2 : 4); c.on(ids, X, F(y) + 2, mat, 1); }
  };
  const claws = (mat: Mat) => {
    if (sideView) for (const k of [0, 1.2]) plate(c, [[toe[0], toe[1] - 1.6 + k], [toe[0], toe[1] - 0.4 + k], [toe[0] + fwd * 3, toe[1] + 0.6 + k * 0.4]], mat);
    else for (const k of [-1.8, 0, 1.8]) plate(c, [[toe[0] + k - 0.6, toe[1] + 1.4], [toe[0] + k + 0.6, toe[1] + 1.4], [toe[0] + k * 1.15, toe[1] + 3.6]], mat);
  };
  const wing = (mat: Mat, membrane: boolean) => {
    const base: Pt = [ankle[0] + out * 2.6, ankle[1] - 3.4];
    if (membrane) {
      const tips: Pt[] = [[base[0] + out * 6.6, base[1] - 6.6], [base[0] + out * 8.4, base[1] - 2], [base[0] + out * 7, base[1] + 1.8]];
      plate(c, [base, tips[0], [base[0] + out * 5.6, base[1] - 3.4], tips[1], [base[0] + out * 5.4, base[1] + 0.2], tips[2], [base[0] + out, base[1] + 1.6]], mat, dk((X, Y) => ((X + Y) % 5 === 0 ? -1 : 0)));
      for (const tp of tips) chain(c, [base, tp], 0.35, Mat.Horn, dk(), 0.2);
    } else for (let k = 0; k < 4; k++) feather(c, [base[0], base[1] + k * 0.7], [base[0] + out * (8 - k * 1.1), base[1] - 6.4 + k * 2.4], 1 - k * 0.1, k % 2 ? Mat.White : Mat.Linen);
  };
  switch (`${tierOf(id)}${isMagic(id) ? "m" : ""}`) {
    case "1": {
      // Botas de couro: cano até o meio da canela com a dobra virada e cadarço cruzado.
      const ids = bootBase(c, ankle, toe, far, ankle[1] - 10.4, Mat.Leather, leather);
      fold(ids, ankle[1] - 10.4, Mat.Leather);
      if (front && !far) for (let k = 0; k < 3; k++) { const Y = F(ankle[1] - 5.4) + k * 3; c.on(ids, F(ankle[0]) - 2, Y, Mat.Linen, 4); c.on(ids, F(ankle[0]) + 1, Y, Mat.Linen, 3); c.on(ids, F(ankle[0]) - 1, Y + 1, Mat.Linen, 4); c.on(ids, F(ankle[0]), Y + 1, Mat.Linen, 3); }
      return;
    }
    case "1m": {
      // Botas Élficas: feltro verde macio, ponta curva para cima com folha e folhas no cano.
      const ids = bootBase(c, ankle, toe, far, ankle[1] - 10.6, Mat.Leaf, felt);
      if (sideView) chain(c, [toe, [toe[0] + fwd * 2.4, toe[1] - 1], [toe[0] + fwd * 2.6, toe[1] - 2.8]], 1, Mat.Leaf, dk(), 0.4);
      for (let x = -3; x <= 3; x += 2) leaf(c, [ankle[0] + x, ankle[1] - 10.4], -Math.PI / 2 + x * 0.15, 1.6, 0.8, x % 4 ? Mat.Leaf : Mat.Mithral);
      thread(c, [ankle[0] - 3.6, ankle[1] - 3], [ankle[0] + 3.6, ankle[1] - 3.4], Mat.Mithral, far ? 2 : 4, ids);
      return;
    }
    case "2": {
      // Botas de bronze: sandália de tiras e greva de bronze na canela.
      const foot = bareFoot(c, ankle, toe, far, front);
      sole(c, [foot], Math.min(ankle[0], toe[0]) - 4, Math.max(ankle[0], toe[0]) + 4, Mat.Leather, far, false);
      for (const y of [ankle[1] - 1.2, ankle[1] + 0.8]) thread(c, [ankle[0] - 3, y], [ankle[0] + 3, y + 0.4], Mat.Leather, far ? 1 : 2, [foot]);
      if (front) thread(c, [toe[0], ankle[1] + 0.8], [toe[0], toe[1] + 1.4], Mat.Leather, 2, [foot]);
      const g = limb(c, [ankle[0], midShin - 2], [ankle[0], ankle[1] - 3.4], 3.9, 3.6, Mat.Bronze, dk());
      thread(c, [ankle[0], midShin - 1], [ankle[0], ankle[1] - 3.6], Mat.Bronze, far ? 3 : 5, [g]);
      return;
    }
    case "2m": {
      // Botas do Andarilho: couro gasto com remendo, polainas de linho e mola no salto.
      const ids = bootBase(c, ankle, toe, far, ankle[1] - 6, Mat.Leather, (X, Y) => leather(X, Y) + (noise(X >> 2, Y >> 2) < 0.2 ? 1 : 0));
      const gaiter = limb(c, [ankle[0], midShin - 1], [ankle[0], ankle[1] - 4], 4, 3.9, Mat.Linen, dk(linen));
      for (let Y = F(midShin); Y < F(ankle[1] - 4); Y += 3) c.on(gaiter, F(ankle[0]) + out * 3, Y, Mat.Bronze, far ? 3 : 5);
      if (!far) patch(c, ids, toe[0] - 1.2, toe[1] - 2.4, 2.2, 1.8, Mat.Felt);
      const heel: Pt = sideView ? [ankle[0] - fwd * 2.4, ankle[1] + 3] : [ankle[0] + out * 2.6, ankle[1] + 3];
      if (sideView) for (let k = 0; k < 3; k++) thread(c, [heel[0] - 1.1, heel[1] + k * 0.7], [heel[0] + 1.1, heel[1] + k * 0.7 + 0.35], Mat.Steel, k % 2 ? 2 : 5);
      return;
    }
    case "3": {
      // Grevas de ferro: placa até o joelho com joelheira e sabatão em lâminas.
      const ids = bootBase(c, ankle, toe, far, knee[1] + 0.6, Mat.Steel, hammered, 4.1);
      thread(c, [ankle[0], knee[1] + 2], [ankle[0], ankle[1] - 1], Mat.Steel, far ? 3 : 5, ids);
      ellipse(c, knee[0], knee[1] + 0.2, 2.8, 2.5, Mat.Steel, dk(hammered));
      for (const t of [0.35, 0.7]) { const p = lerp(ankle, toe, t); thread(c, [p[0] - 3, p[1] - 1.6], [p[0] + 3, p[1] - 1.4], Mat.Steel, 1, ids); }
      rivet(c, ids, ankle[0] + out * 3, knee[1] + 4);
      return;
    }
    case "3m": {
      // Botas da Rapidez: couro vermelho com raios dourados nas laterais e espora.
      const ids = bootBase(c, ankle, toe, far, ankle[1] - 10.4, Mat.Crest, leather);
      fold(ids, ankle[1] - 10.4, Mat.Bronze);
      const zig: Pt[] = [[ankle[0] + out * 2.4, ankle[1] - 7], [ankle[0] + out * 0.6, ankle[1] - 4.6], [ankle[0] + out * 2.2, ankle[1] - 4.4], [ankle[0] + out * 0.2, ankle[1] - 1.4]];
      for (let i = 1; i < zig.length; i++) thread(c, zig[i - 1], zig[i], Mat.Amber, far ? 3 : 5, ids);
      const spur: Pt = sideView ? [ankle[0] - fwd * 4.6, ankle[1]] : [ankle[0] + out * 4.4, ankle[1] + 0.4];
      thread(c, [ankle[0] - (sideView ? fwd * 3 : -out * 3), ankle[1]], spur, Mat.Bronze, 4);
      const X = F(spur[0]), Y = F(spur[1]);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) c.px(X + dx * 2, Y + dy * 2, Mat.Bronze, dx === 0 && dy === 0 ? 2 : 5);
      return;
    }
    case "4": {
      // Botas de mithral: sabatão em lâminas, cano de placas com bordas douradas e ponta afilada.
      const ids = bootBase(c, ankle, toe, far, midShin, Mat.Mithral, undefined, 4);
      for (let y = midShin + 1.6; y < ankle[1] + 2; y += 1.8) thread(c, [ankle[0] - 4, y], [ankle[0] + 4, y + 0.2], Mat.Mithral, 1, ids);
      for (let X = F(ankle[0] - 4); X <= F(ankle[0] + 4); X++) c.on(ids, X, F(midShin), Mat.Trim, far ? 2 : 4);
      if (sideView) plate(c, [[toe[0], toe[1] - 2], [toe[0], toe[1] + 1.4], [toe[0] + fwd * 2.4, toe[1] + 0.6]], Mat.Mithral);
      return;
    }
    case "4m": {
      // Botas Aladas: couro claro com asinhas de pena no tornozelo.
      const ids = bootBase(c, ankle, toe, far, ankle[1] - 9.6, Mat.Linen, leather);
      fold(ids, ankle[1] - 9.6, Mat.Bronze);
      if (!far || sideView) wing(Mat.White, false);
      return;
    }
    case "5": {
      // Botas de escamas de dragão: escamas até o meio da canela e garras no lugar dos dedos.
      bootBase(c, ankle, toe, far, midShin, Mat.Dragon, scales(5, 4));
      claws(Mat.Horn);
      return;
    }
    default: {
      // Botas do Dragão Alado: escamas vermelhas, garras e asas de membrana no tornozelo.
      bootBase(c, ankle, toe, far, midShin, Mat.RedDragon, scales(5, 4));
      claws(Mat.Horn);
      if (!far || sideView) wing(Mat.RedDragon, true);
    }
  }
}

// --- Escudos -------------------------------------------------------------------------

/**
 * Escudo na mão livre `hand` (lado `side` da tela): de frente mostra a face, de costas o verso de madeira com as alças,
 * de lado a face quase de perfil. O Escudo Animado flutua ao lado, sem a mão.
 */
function shieldArt(c: Canvas, id: string, hand: Pt, view: ProtoDir, side: number) {
  const floating = id === "shield-3-magic";
  const at: Pt = floating
    ? (view === "side" ? [hand[0] - 8, hand[1] - 8] : [hand[0] + side * 9.4, hand[1] - 10])
    : (view === "side" ? hand : [hand[0] + side * 0.8, hand[1] - 2.6]);
  // Desenhado em escala de projeto e ampliado: o escudo precisa ser lido de longe.
  c.scaled(at, floating ? 1.3 : 1.45, () => shieldFace(c, id, at, view, side));
}

function shieldFace(c: Canvas, id: string, at: Pt, view: ProtoDir, side: number) {
  const t = tierOf(id), magic = isMagic(id), key = `${t}${magic ? "m" : ""}`;
  const sx = view === "side" ? 0.5 : 1;
  const floating = key === "3m";
  const P = (u: number, v: number): Pt => [at[0] + u * sx, at[1] + v];
  type Shape = { kind: "round"; r: number } | { kind: "poly"; pts: Pt[] };
  const shape: Shape = key === "1" || key === "1m" ? { kind: "round", r: 6 }
    : key === "2" || key === "2m" || key === "4m" ? { kind: "round", r: 7.2 }
    : key === "3" || key === "3m" ? { kind: "poly", pts: [P(-5.6, -7.2), P(5.6, -7.2), P(5.8, -1.6), P(0, 9.6), P(-5.8, -1.6)] }
    : key === "4" ? { kind: "poly", pts: [P(-6, -9), P(0, -10.4), P(6, -9), P(6, 7.6), P(0, 9.6), P(-6, 7.6)] }
    : { kind: "poly", pts: [P(-6.6, -7.4), P(0, -8.2), P(6.6, -7.4), P(6.6, 0.4), P(0, 9.8), P(-6.6, 0.4)] };
  const inside = shape.kind === "round" ? inEllipse(at[0], at[1], shape.r * sx, shape.r) : inPoly(shape.pts);
  const halfW = (shape.kind === "round" ? shape.r : 6.4) * sx;
  const box: Box = [at[0] - halfW - 1, at[1] - 11, at[0] + halfW + 1, at[1] + 11];
  const shade: Shade = (x, y) => lit(((x + 0.5 - at[0]) / (halfW + 1)) * 0.75 - (view === "side" ? 0.35 : 0), (y + 0.5 - at[1]) / 12 * 0.6 - 0.1, 0.75);
  const face = (mat: Mat, offset?: Offset, keep?: (x: number, y: number) => boolean) => c.fill(box, (x, y) => inside(x, y) && (!keep || keep(x, y)), mat, shade, offset);
  // Aro: faixa por dentro da borda, peça própria (fica com o risco do relevo); entra na lista `ids`.
  const rim = (ids: number[], mat: Mat, w = 0.9) => {
    const shrink = (p: Pt): Pt => { const d = Math.hypot((p[0] - at[0]) / sx, p[1] - at[1]); const k = (d - w) / d; return [at[0] + (p[0] - at[0]) * k, at[1] + (p[1] - at[1]) * k]; };
    const inner = shape.kind === "round" ? inEllipse(at[0], at[1], (shape.r - w) * sx, shape.r - w) : inPoly(shape.pts.map(shrink));
    ids.push(face(mat, (X, Y) => (noise(X, Y) < 0.04 ? -1 : 0), (x, y) => !inner(x, y)));
  };
  if (floating) {
    // Riscos de movimento e a sombra mágica embaixo: ele voa sozinho.
    for (const k of [-1, 1]) thread(c, [at[0] + side * 7 * sx, at[1] + k * 3], [at[0] + side * 10 * sx, at[1] + k * 3.6], Mat.White, (j) => (j % 3 < 2 ? 4 : -1));
    ellipse(c, at[0], at[1] + 12.6, 4 * Math.max(sx, 0.6), 0.8, Mat.Arcane, () => -1);
  }
  if (view === "up") {
    // Verso: tábuas, alças de couro e o aro do material da frente.
    const back = face(Mat.Wood, (X, Y) => grain(X, Y) - 1 + (X % 6 === 0 ? -1 : 0));
    const rimMat = [Mat.Leather, Mat.Leather, Mat.Bronze, Mat.Steel, Mat.Mithral, Mat.Dragon][t];
    rim([back], rimMat, 1.1);
    for (const y of [-2.4, 2]) { const s = limb(c, [at[0] - 3.4, at[1] + y], [at[0] + 3.4, at[1] + y], 0.75, 0.75, Mat.Leather, leather); void s; }
    return;
  }
  switch (key) {
    case "1": case "1m": {
      // Broquel de madeira (o do Escudeiro com o brasão de família pintado): tábuas, aro de couro, umbo de ferro.
      const ids = [face(Mat.Wood, (X, Y) => grain(X, Y) + ((X - F(at[0])) % 6 === 0 ? -1 : 0))];
      if (key === "1m") {
        ids.push(face(Mat.Crest, linen, (x, y) => inEllipse(at[0], at[1], 4.6 * sx, 4.6)(x, y) && x + 0.5 < at[0]));
        ids.push(face(Mat.White, linen, (x, y) => inEllipse(at[0], at[1], 4.6 * sx, 4.6)(x, y) && x + 0.5 >= at[0]));
        for (let w = 0; w < 3; w++) { thread(c, [at[0] - 4 * sx, at[1] + 2.4 + w * 0.5], [at[0], at[1] - 1.2 + w * 0.5], Mat.Bronze, w ? 3 : 5, ids); thread(c, [at[0] + 4 * sx, at[1] + 2.4 + w * 0.5], [at[0], at[1] - 1.2 + w * 0.5], Mat.Bronze, w ? 2 : 4, ids); }
      }
      rim(ids, Mat.Leather, 1.1);
      for (let a = 0.4; a < Math.PI * 2; a += Math.PI / 4) rivet(c, ids, at[0] + Math.cos(a) * 5.3 * sx, at[1] + Math.sin(a) * 5.3);
      if (key === "1") { const b = ellipse(c, at[0], at[1], 1.7 * sx, 1.7, Mat.Iron); c.on(b, F(at[0] - 0.6 * sx), F(at[1] - 0.6), Mat.Iron, 5); }
      return;
    }
    case "2": {
      // Escudo de bronze hoplita: aro alto e a cabeça de touro no centro.
      const ids = [face(Mat.Bronze, (X, Y) => (noise(X >> 1, Y >> 1) < 0.05 ? -1 : 0))];
      rim(ids, Mat.Bronze, 1.3);
      const head = plate(c, [P(-2, -2.4), P(2, -2.4), P(1.6, 1.4), P(0.9, 3.6), P(-0.9, 3.6), P(-1.6, 1.4)], Mat.Leather);
      for (const s of [-1, 1]) horn(c, [P(s * 1.8, -2), P(s * 3.6, -2.8), P(s * 4.2, -4.6)], 0.7);
      for (const s of [-1, 1]) c.on(head, F(at[0] + s * 0.9 * sx), F(at[1] - 0.6), Mat.Ember, 4);
      c.on(head, F(at[0]), F(at[1] + 3), Mat.Bronze, 5);
      return;
    }
    case "2m": {
      // Escudo Sentinela (Sentinel Shield): ferro com um olho aberto que vigia no centro.
      const ids = [face(Mat.Iron, hammered)];
      rim(ids, Mat.Bronze, 1.1);
      const eye = c.fill(box, (x, y) => inEllipse(at[0], at[1], 4 * sx, 2.4)(x, y), Mat.White, sphere(at[0], at[1], 4 * sx, 2.4));
      const iris = ellipse(c, at[0] - 0.4 * sx, at[1], 1.6 * sx, 1.6, Mat.Amber);
      c.on(iris, F(at[0] - 0.4 * sx), F(at[1] - 0.6), Mat.Eye, 0); c.on(iris, F(at[0] - 0.4 * sx), F(at[1] + 0.4), Mat.Eye, 0);
      c.on(iris, F(at[0] - 1 * sx), F(at[1] - 0.8), Mat.White, 5);
      for (let a = Math.PI * 1.1; a < Math.PI * 1.95; a += 0.17) thread(c, [at[0] + Math.cos(a) * 4.2 * sx, at[1] + Math.sin(a) * 2.6], [at[0] + Math.cos(a) * 5.6 * sx, at[1] + Math.sin(a) * 4], Mat.Iron, 0, ids);
      void eye;
      return;
    }
    case "3": {
      // Escudo de ferro em pipa: cruz de faixas rebitadas.
      const ids = [face(Mat.Steel, hammered)];
      rim(ids, Mat.Iron, 1);
      ids.push(face(Mat.Iron, hammered, (x, y) => Math.abs(x + 0.5 - at[0]) < 1.1 * sx || Math.abs(y + 0.5 - (at[1] - 2.6)) < 1.1));
      for (const v of [-5, -0.6, 3.4, 6.8]) rivet(c, ids, at[0], at[1] + v, Mat.Iron);
      for (const u of [-3.8, 3.8]) rivet(c, ids, at[0] + u * sx, at[1] - 2.6, Mat.Iron);
      return;
    }
    case "3m": {
      // Escudo Animado (Animated Shield): pipa de madeira e ferro com a cara viva de um mímico — olhos e bocarra.
      const ids = [face(Mat.Wood, (X, Y) => grain(X, Y) + ((X - F(at[0])) % 6 === 0 ? -1 : 0))];
      rim(ids, Mat.Iron, 1.1);
      for (const s of [-1, 1]) { const e = ellipse(c, at[0] + s * 2.4 * sx, at[1] - 3.4, 1.2 * sx, 1.1, Mat.Amber); c.on(e, F(at[0] + s * 2.4 * sx), F(at[1] - 3.4), Mat.Eye, 0); }
      const mouth = c.fill(box, (x, y) => inEllipse(at[0], at[1] + 1.6, 4.2 * sx, 2.6)(x, y) && y + 0.5 > at[1] + 0.4, Mat.Lip, () => 0.2);
      for (let k = -3; k <= 3; k += 1.5) fang(c, [at[0] + k * sx, at[1] + 0.6], 0.45 * Math.max(sx, 0.6), 1.1);
      for (let k = -2.2; k <= 2.2; k += 1.5) fang(c, [at[0] + k * sx, at[1] + 4], 0.4 * Math.max(sx, 0.6), 1, -1);
      ellipse(c, at[0] + 0.8 * sx, at[1] + 3.2, 1.4 * sx, 0.6, Mat.Crest);
      void mouth;
      return;
    }
    case "4": {
      // Escudo de mithral: torre élfica com uma árvore de ouro gravada.
      const ids = [face(Mat.Mithral, (X, Y) => (noise(X, Y) < 0.02 ? 1 : 0))];
      rim(ids, Mat.Bronze, 0.9);
      thread(c, P(0, 6.6), P(0, -2), Mat.Bronze, 4, ids);
      thread(c, P(0.4, 6.6), P(0.4, -2), Mat.Bronze, 2, ids);
      for (const [u, v, a] of [[-3.4, -4.6, 1], [3.4, -4.6, 1], [-2, -6.6, 1], [2, -6.6, 1], [-4, -1.6, 0], [4, -1.6, 0]] as const) thread(c, P(0, -1 - Math.abs(u) * 0.3), P(u, v), Mat.Bronze, a ? 4 : 3, ids);
      for (const [u, v] of [[-3.6, -5], [3.6, -5], [-2.2, -7.2], [2.2, -7.2], [0, -8], [-4.4, -2], [4.4, -2], [-1.4, -4], [1.4, -4]] as const) c.on(ids, F(at[0] + u * sx), F(at[1] + v), Mat.Leaf, 5);
      for (const u of [-2.4, 2.4]) thread(c, P(0, 6.4), P(u, 7.4), Mat.Bronze, 3, ids);
      return;
    }
    case "4m": {
      // Escudo da Guarda Arcana (Spellguard Shield): mithral com runas e um círculo mágico girando na frente.
      const ids = [face(Mat.Mithral, (X, Y) => (noise(X, Y) < 0.02 ? 1 : 0))];
      rim(ids, Mat.Sapphire, 1);
      const ring = (r: number, tone: number, ticks: number) => {
        for (let a = 0; a < Math.PI * 2; a += 0.01) c.px(F(at[0] + Math.cos(a) * r * sx), F(at[1] + Math.sin(a) * r * 0.96), Mat.Arcane, tone);
        for (let k = 0; k < ticks; k++) { const a = (k / ticks) * Math.PI * 2; thread(c, [at[0] + Math.cos(a) * (r - 1) * sx, at[1] + Math.sin(a) * (r - 1)], [at[0] + Math.cos(a) * (r + 0.6) * sx, at[1] + Math.sin(a) * (r + 0.6)], Mat.Arcane, 5); }
      };
      ring(8.6, 4, 12);
      ring(3.6, 5, 6);
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.5; thread(c, [at[0] + Math.cos(a) * 3.6 * sx, at[1] + Math.sin(a) * 3.6], [at[0] + Math.cos(a + 2.1) * 3.6 * sx, at[1] + Math.sin(a + 2.1) * 3.6], Mat.Arcane, 4); }
      return;
    }
    case "5": {
      // Escudo do dragão: escamas com aro de chifre e a cabeça do dragão pintada em escama escura.
      const ids = [face(Mat.Dragon, scales(5, 4))];
      rim(ids, Mat.Horn, 1);
      const head = plate(c, [P(-2.6, -4), P(2.6, -4), P(2.2, 0), P(1, 3.6), P(-1, 3.6), P(-2.2, 0)], Mat.RedDragon, scales(4, 3));
      for (const s of [-1, 1]) { horn(c, [P(s * 2.2, -3.6), P(s * 3.8, -5.4), P(s * 4.2, -7)], 0.6); c.on(head, F(at[0] + s * 1.2 * sx), F(at[1] - 1.6), Mat.Amber, 5); }
      return;
    }
    default: {
      // Escudo do Dragão Ancião: escamas vermelhas, aro de ouro e a cabeça do dragão saindo em relevo, de boca aberta.
      const ids = [face(Mat.RedDragon, scales(6, 5))];
      rim(ids, Mat.Bronze, 1.1);
      for (const s of [-1, 1]) horn(c, [P(s * 2.6, -4.4), P(s * 5.4, -7), P(s * 7.6, -10.6)], 1, 0);
      const skull = c.fill(box, (x, y) => inEllipse(at[0], at[1] - 1.4, 3.6 * sx, 3.6)(x, y), Mat.Dragon, sphere(at[0], at[1] - 2.4, 3.6 * sx, 3.6), scales(4, 3));
      const jaw = plate(c, [P(-2.8, 0.6), P(2.8, 0.6), P(2, 5.4), P(0, 6.4), P(-2, 5.4)], Mat.Dragon, scales(4, 3));
      c.fill(box, (x, y) => inEllipse(at[0], at[1] + 2.6, 1.8 * sx, 1.6)(x, y), Mat.Ember, () => 0.9);
      for (const k of [-1.4, 0, 1.4]) fang(c, [at[0] + k * sx, at[1] + 1], 0.35, 1);
      for (const s of [-1, 1]) spotEye(c, [at[0] + s * 1.6 * sx, at[1] - 2.2], 0.75);
      void skull; void jaw;
    }
  }
}

// --- Monstros humanoides (piloto da Cripta, docs/ARTE_TIBIA.md) ----------------------------

export type Species = "goblin" | "kobold" | "hobgoblin" | "orc" | "gnoll" | "skeleton" | "zombie" | "bugbear" | "ogre" | "mummy";

/** Olho de perfil (olhando para a esquerda): pálpebra escura, íris da cor `mat` e um brilho. */
function eyeSide(c: Canvas, x: number, y: number, mat: Mat, big = false) {
  const X = F(x), Y = F(y);
  for (const dx of [-2, -1, 0, 1]) c.px(X + dx, Y - 1, Mat.Eye, 0);
  c.px(X - 2, Y, Mat.Eye, 0); c.px(X - 1, Y, mat, 5); c.px(X, Y, mat, 3); c.px(X + 1, Y, Mat.Eye, 1);
  if (big) { c.px(X - 1, Y + 1, mat, 2); c.px(X, Y + 1, mat, 2); }
}

/** Orelha pontuda virada para trás, com o miolo escuro. */
function pointedEar(c: Canvas, cx: number, cy: number, len: number) {
  poly(c, [[cx + 2, cy - 1.6], [cx + 2 + len, cy - 4 - len * 0.3], [cx + len * 0.8, cy - 1], [cx + 3, cy + 3]], Mat.Skin, cx + 2, cx + 2 + len);
  poly(c, [[cx + 4, cy - 0.6], [cx + len * 0.95, cy - 3.2 - len * 0.25], [cx + len * 0.7, cy - 1], [cx + 4.2, cy + 1.6]], Mat.Lip, cx + 4, cx + len, () => -1);
}

/**
 * Orelha comprida de goblin, para trás (`sx` = 1, de perfil) ou aberta para o lado `sx` (de frente), com veias, o
 * miolo escuro e dois rasgos na borda.
 */
function goblinEar(c: Canvas, x: number, y: number, sx: number, front = false, back = false) {
  const len = front ? 12 : 14, tipX = x + sx * len, tipY = y - (front ? 4.6 : 5.6);
  const pts: Pt[] = [[x, y - 1.8], [tipX, tipY], [x + sx * len * 0.45, y + 2], [x + sx * 1.4, y + 4]];
  const ear = poly(c, pts, Mat.Skin, Math.min(x, tipX), Math.max(x, tipX), blotchy);
  if (!back) {
    const a = x + sx * 2, b = x + sx * len * 0.82;
    poly(c, [[a, y - 0.4], [b, tipY + 1.4], [a + sx * len * 0.36, y + 1.8]], Mat.Lip, Math.min(a, b), Math.max(a, b), () => -2);
  }
  thread(c, [x + sx * 3, y + 0.6], [x + sx * len * 0.7, tipY + 2.4], Mat.Lip, 2, [ear]);
  // Rasgos: dois cortes em V na borda de cima.
  for (const t of [0.42, 0.7]) {
    const px = x + (tipX - x) * t, py = y - 1.8 + (tipY - y + 1.8) * t;
    for (const [dx, dy] of [[0, 0], [sx, 0], [0, 1], [sx, 1], [0, 2]]) c.clear(F(px) + dx, F(py) + dy);
  }
}

/** Fileira de dentes amarelos e tortos, de tamanhos desiguais, saindo da linha `y` para baixo (`dir` 1) ou para cima. */
function jaggedTeeth(c: Canvas, x0: number, x1: number, y: number, dir: number, len: number) {
  for (let x = x0, k = 0; x <= x1; x += 1.3 + noise(k, 3) * 0.6, k++) {
    if (noise(k, dir + 7) < 0.18) continue; // dente que caiu
    const l = len * (0.5 + noise(k, dir) * 0.9), lean = (noise(k, 11) - 0.5) * 0.8;
    poly(c, [[x - 0.5, y], [x + 0.5, y], [x + lean, y + l * dir]], Mat.Bone, x - 0.5, x + 0.5, (X, Y) => (noise(X, Y) < 0.25 ? -1 : 0));
  }
}

/** Verruga: bolinha clara em cima com a sombra embaixo. */
function wart(c: Canvas, x: number, y: number) {
  const X = F(x), Y = F(y);
  c.px(X, Y, Mat.Skin, 4); c.px(X + 1, Y, Mat.Skin, 3); c.px(X, Y + 1, Mat.Skin, 2); c.px(X + 1, Y + 1, Mat.Skin, 1);
}

/** Cabeça da espécie, de perfil, olhando para a esquerda. */
function monsterHead(c: Canvas, kit: Kit, b: number, top: number) {
  const cy = 37 + b, cx = CX + 1;
  ellipse(c, CX - 0.5, cy + 9, 3, 2.5, Mat.Skin);
  switch (kit.species) {
    case "goblin": {
      // Goblin sombrio: crânio comprido e baixo, testa pesada que joga sombra no olho (só a brasa aparece no fundo da
      // órbita), nariz em gancho, bocarra aberta de dentes amarelos e tortos, orelha rasgada e cabelo ralo e oleoso.
      const skull = ellipse(c, cx + 1, cy - 1.6, 7, 6.2, Mat.Skin, blotchy);
      goblinEar(c, cx + 4, cy - 2.6, 1);
      const jaw = ellipse(c, cx - 3, cy + 4.2, 6.2, 3.4, Mat.Skin, blotchy);
      // Bochecha funda embaixo da maçã do rosto.
      for (let Y = F(cy + 0.6); Y <= F(cy + 2.6); Y++) for (let X = F(cx - 4.6); X <= F(cx + 0.4); X++) if (noise(X, Y) < 0.7) c.on([skull, jaw], X, Y, Mat.Skin, 1);
      thread(c, [cx - 5.6, cy + 0.2], [cx + 0.6, cy - 0.4], Mat.Skin, 4, [skull]);
      // Órbita funda na sombra da testa, a pupila acesa no fundo.
      c.fill(ebox(cx - 4.2, cy - 2, 2.4, 1.8), inEllipse(cx - 4.2, cy - 2, 2.4, 1.7), Mat.Eye, () => 0.1);
      c.px(F(cx - 5), F(cy - 2), Mat.Ember, 5); c.px(F(cx - 4.4), F(cy - 2), Mat.Amber, 5); c.px(F(cx - 5), F(cy - 1.4), Mat.Ember, 4); c.px(F(cx - 4.4), F(cy - 1.4), Mat.Ember, 2);
      limb(c, [cx - 6, cy - 3.6], [cx - 0.6, cy - 5.2], 1.6, 1.2, Mat.Skin, blotchy);
      thread(c, [cx - 6, cy - 2.6], [cx - 1, cy - 3.6], Mat.Eye, 0, [skull]);
      // Rugas da testa e uma cicatriz atravessando o olho.
      for (const y of [-6.6, -5.2]) thread(c, [cx - 3, cy + y], [cx + 3.6, cy + y - 0.6], Mat.Skin, 1, [skull]);
      thread(c, [cx - 6.4, cy - 5.6], [cx - 2.6, cy + 1.2], Mat.Lip, 1, [skull, jaw]);
      // Nariz comprido em gancho caindo sobre a boca.
      chain(c, [[cx - 6, cy - 1.2], [cx - 8.8, cy - 0.6], [cx - 10.4, cy + 1.2], [cx - 10, cy + 3.2]], 1.5, Mat.Skin, blotchy, 0.6);
      c.px(F(cx - 8), F(cy + 1.6), Mat.Eye, 0); c.px(F(cx - 7.6), F(cy + 1.6), Mat.Eye, 1);
      // Bocarra aberta: gengiva escura, dentes tortos de tamanhos diferentes em cima e embaixo.
      const mouth = poly(c, [[cx - 10.4, cy + 3.4], [cx - 1, cy + 3.6], [cx - 1.6, cy + 5.2], [cx - 9.6, cy + 6.4]], Mat.Eye, cx - 10.4, cx - 1, () => -2);
      thread(c, [cx - 10, cy + 3.6], [cx - 1.4, cy + 3.8], Mat.Lip, 1, [mouth]);
      jaggedTeeth(c, cx - 9.6, cx - 2, cy + 3.8, 1, 1.6);
      jaggedTeeth(c, cx - 9, cx - 2.4, cy + 6.2, -1, 1.3);
      // Verrugas e o cabelo ralo e oleoso caindo da nuca.
      for (const [x, y] of [[-1.6, -3.2], [3.6, 1.2], [-6, 5.4]] as const) wart(c, cx + x, cy + y);
      for (let k = 0; k < 5; k++) chain(c, [[cx + 1 + k * 1.4, cy - 7.4 + k * 0.5], [cx + 5 + k * 1.4, cy - 6 + k], [cx + 7.6 + k * 0.8, cy - 1 + k * 1.6]], 0.55, Mat.Hair, strands, 0.25);
      thread(c, [cx + 2, cy + 6.6], [cx + 0.6, cy + 9.4], Mat.Skin, 1);
      return;
    }
    case "kobold": {
      // Cabeça de lagarto: focinho comprido, chifrinhos para trás e escamas.
      for (const k of [0, 1]) horn(c, [[cx + 3 + k * 2, cy - 5], [cx + 8 + k * 2, cy - 8.6], [cx + 12 + k * 1.6, cy - 9]], 1.2 - k * 0.3);
      ellipse(c, cx + 1, cy - 1, 7, 6.6, Mat.Skin, scales(4, 3));
      poly(c, [[cx - 3, cy - 4.4], [cx - 13.6, cy - 1.4], [cx - 14.4, cy + 1.4], [cx - 3, cy + 2.4]], Mat.Skin, cx - 14, cx - 3, scales(4, 3));
      poly(c, [[cx - 3, cy + 2.2], [cx - 12.4, cy + 2], [cx - 11.6, cy + 4], [cx - 2, cy + 5.4]], Mat.Skin, cx - 12, cx - 2, (X, Y) => scales(4, 3)(X, Y) - 1);
      for (const x of [-11, -9.2, -7.4, -5.6]) fang(c, [cx + x, cy + 2], 0.35, 0.8);
      c.px(F(cx - 13.4), F(cy - 1), Mat.Eye, 0);
      eyeSide(c, cx - 3.4, cy - 2.4, Mat.Amber, true);
      thread(c, [cx - 5.6, cy - 4.6], [cx - 1, cy - 5], Mat.Skin, 0);
      return;
    }
    case "gnoll": {
      // Hiena: focinho comprido e escuro na ponta, orelhas redondas em pé e a crina descendo pela nuca.
      chain(c, [[cx + 4, cy - 7], [cx + 8, cy + 2], [cx + 6, top + 6]], 2.2, Mat.Hair, strands, 1.2);
      for (const dx of [1.6, 5]) {
        poly(c, [[cx + dx - 2.4, cy - 5], [cx + dx + 0.6, cy - 13.4], [cx + dx + 2.6, cy - 5]], Mat.Skin, cx + dx - 2.4, cx + dx + 2.6);
        poly(c, [[cx + dx - 1, cy - 6], [cx + dx + 0.5, cy - 11], [cx + dx + 1.4, cy - 6]], Mat.Eye, cx + dx - 1, cx + dx + 1.4, () => -1);
      }
      const spots: Offset = (X, Y) => (noise(X >> 2, Y >> 2) < 0.2 ? -1 : 0);
      ellipse(c, cx + 1, cy - 1, 7.6, 7.2, Mat.Skin, spots);
      poly(c, [[cx - 3, cy - 3.6], [cx - 15, cy + 0.4], [cx - 15.4, cy + 3.6], [cx - 3, cy + 5]], Mat.Skin, cx - 15, cx - 3, spots);
      poly(c, [[cx - 9, cy - 1.4], [cx - 15, cy + 0.4], [cx - 15.4, cy + 3.6], [cx - 9, cy + 4.6]], Mat.Hair, cx - 15, cx - 9);
      ellipse(c, cx - 14.4, cy + 1.6, 1.8, 1.6, Mat.Eye);
      thread(c, [cx - 13.6, cy + 3.6], [cx - 4, cy + 4.4], Mat.Eye, 0);
      for (const x of [-12, -10, -8]) fang(c, [cx + x, cy + 3.6], 0.4, 1);
      eyeSide(c, cx - 3.6, cy - 2, Mat.Amber, true);
      return;
    }
    case "skeleton": {
      // Crânio de osso: órbita funda com a brasa no fundo, nariz vazado, dentes e mandíbula solta.
      const skull = ellipse(c, cx, cy - 1, 8, 8, Mat.Skin);
      const jaw = ellipse(c, cx - 2.4, cy + 5.6, 5.4, 2.8, Mat.Skin);
      c.fill(ebox(cx - 4.4, cy, 2.6, 2.6), inEllipse(cx - 4.4, cy, 2.4, 2.6), Mat.Eye, () => 0.1);
      c.px(F(cx - 4.6), F(cy), Mat.Ember, 5);
      c.on(skull, F(cx - 7.6), F(cy + 3), Mat.Eye, 0); c.on(skull, F(cx - 7.2), F(cy + 3.6), Mat.Eye, 0);
      for (const x of [-7, -5.6, -4.2, -2.8]) { c.on([skull, jaw], F(cx + x), F(cy + 4.4), Mat.Eye, 0); c.on([skull, jaw], F(cx + x), F(cy + 6), Mat.Eye, 0); }
      thread(c, [cx - 7.6, cy + 5.2], [cx + 2, cy + 5.2], Mat.Eye, 0, [skull, jaw]);
      thread(c, [cx + 2, cy - 8], [cx + 5, cy + 1], Mat.Skin, 1, [skull]);
      thread(c, [cx - 1, cy + 1.6], [cx + 3, cy + 2.6], Mat.Skin, 1, [skull]);
      return;
    }
    case "zombie": {
      // Rosto humano apodrecido: olho fundo e leitoso, boca aberta, pontos de costura e cabelo ralo.
      const face = ellipse(c, cx, cy, 8.2, 9, Mat.Skin, (X, Y) => (noise(X >> 1, Y >> 1) < 0.12 ? -1 : 0));
      ellipse(c, cx + 1.8, cy + 2.2, 1.4, 2.2, Mat.Skin);
      c.fill(ebox(cx - 4.4, cy + 1, 2.4, 2), inEllipse(cx - 4.4, cy + 1, 2.2, 1.8), Mat.Eye, () => 0.1);
      c.px(F(cx - 4.8), F(cy + 1), Mat.White, 4);
      limb(c, [cx - 7.4, cy + 1.6], [cx - 9.6, cy + 4.6], 1.2, 0.8, Mat.Skin);
      c.fill(ebox(cx - 5.6, cy + 7, 2.6, 1.8), inEllipse(cx - 5.6, cy + 7, 2.4, 1.6), Mat.Eye, () => 0.1);
      thread(c, [cx - 1, cy - 6], [cx + 4, cy + 4], Mat.Lip, 1, [face]);
      for (let k = 0; k < 5; k++) thread(c, [cx - 0.2 + k * 1, cy - 4.6 + k * 2], [cx + 1.4 + k * 1, cy - 5 + k * 2], Mat.Eye, 1, [face]);
      for (let k = 0; k < 5; k++) chain(c, [[cx - 2 + k * 2.4, cy - 8], [cx + k * 2.6, cy - 6 + k], [cx + 1 + k * 2.2, cy - 2 + k * 1.6]], 0.6, Mat.Hair, strands, 0.3);
      return;
    }
    case "mummy": {
      // Cabeça toda enfaixada: as voltas do linho em diagonal, a fresta dos olhos com a luz verde e uma ponta solta.
      const head = ellipse(c, cx, cy - 0.4, 7.8, 8.4, Mat.Skin, bandage);
      ellipse(c, cx - 3.6, cy + 4.4, 4.4, 3, Mat.Skin, bandage);
      for (let X = F(cx - 8); X <= F(cx - 1); X++) { c.on(head, X, F(cy - 1.4), Mat.Eye, 0); c.on(head, X, F(cy - 0.6), Mat.Eye, 0); }
      c.px(F(cx - 5), F(cy - 1), Mat.Leaf, 5); c.px(F(cx - 4.4), F(cy - 1), Mat.Leaf, 4);
      chain(c, [[cx + 6, cy - 2], [cx + 10, cy + 3], [cx + 9, cy + 9]], 1.1, Mat.Skin, bandage, 0.7);
      return;
    }
    case "bugbear": {
      // Goblinoide grandalhão e peludo: focinho de urso, orelhas redondas e presas.
      for (const dx of [1, 5]) ellipse(c, cx + dx, cy - 8, 2.4, 2.2, Mat.Skin, fur);
      ellipse(c, cx, cy - 0.6, 9, 8.6, Mat.Skin, fur);
      ellipse(c, cx - 8, cy + 2.4, 4.6, 3.4, Mat.FurLight, fur);
      ellipse(c, cx - 12, cy + 1.4, 1.4, 1.2, Mat.Eye);
      thread(c, [cx - 11, cy + 4.6], [cx - 5, cy + 5], Mat.Eye, 0);
      fang(c, [cx - 9, cy + 4.4], 0.5, 1.6, -1);
      eyeSide(c, cx - 4.4, cy - 2.4, Mat.Amber);
      thread(c, [cx - 7, cy - 4.4], [cx - 1.6, cy - 4], Mat.Eye, 0);
      return;
    }
    default: {
      // Hobgoblin, orc e ogro: cabeça humana com orelha pontuda, testa pesada e o que cada um tem a mais.
      const ogre = kit.species === "ogre", orc = kit.species === "orc";
      if (!ogre) pointedEar(c, cx, cy, orc ? 6 : 7);
      else ellipse(c, cx + 2, cy + 1.6, 1.8, 2.8, Mat.Skin);
      const face = ellipse(c, cx, cy, ogre ? 9 : 8.2, ogre ? 9.4 : 8.8, Mat.Skin, (X, Y) => (noise(X >> 1, Y >> 1) < 0.06 ? -1 : 0));
      // Testa saltada e o nariz: largo e chato no orc e no hobgoblin, uma batata no ogro.
      limb(c, [cx - 8, cy - 2], [cx - 2, cy - 3.4], 1.2, 1, Mat.Skin);
      if (ogre) ellipse(c, cx - 9, cy + 1.6, 2.6, 2.4, Mat.Skin);
      else poly(c, [[cx - 7.6, cy - 1], [cx - 10.4, cy + 2.4], [cx - 7.4, cy + 3.2]], Mat.Skin, cx - 10.4, cx - 7.4);
      eyeSide(c, cx - 5, cy - 0.4, orc ? Mat.Ember : Mat.Amber);
      // Queixo para a frente com as presas subindo (no orc e no ogro).
      ellipse(c, cx - 4.4, cy + 6.4, ogre ? 5.4 : 4.6, 2.8, Mat.Skin);
      thread(c, [cx - 9, cy + 5.2], [cx - 2, cy + 5.6], Mat.Eye, 0, [face]);
      if (orc || ogre) fang(c, [cx - (ogre ? 8.2 : 7.6), cy + 5.4], 0.6, ogre ? 2.4 : 2, -1);
      if (kit.species === "hobgoblin") {
        // Coque preto preso no alto.
        ellipse(c, cx + 1, cy - 6.6, 7.6, 3.6, Mat.Hair, strands);
        ellipse(c, cx + 4, cy - 10, 2.4, 2.2, Mat.Hair, strands);
        limb(c, [cx + 4.4, cy - 9], [cx + 8, cy - 4], 0.9, 0.5, Mat.Hair, strands);
      } else if (orc) {
        // Crista de cabelo preto do meio da cabeça até a nuca.
        chain(c, [[cx - 3, cy - 8.4], [cx + 2, cy - 9.6], [cx + 6.6, cy - 6], [cx + 8, cy - 1]], 1.6, Mat.Hair, strands, 1);
      } else {
        thread(c, [cx - 2, cy - 7.6], [cx + 4, cy - 6], Mat.Skin, 4, [face]);
        c.px(F(cx - 7), F(cy + 8.4), Mat.Sapphire, 4);
      }
      return;
    }
  }
}

/** Olho de frente: pálpebra escura em cima, íris da cor `mat` com a pupila no meio e um brilho. */
function eyeFront(c: Canvas, x: number, y: number, mat: Mat, big = false) {
  const X = F(x), Y = F(y);
  for (let dx = -2; dx <= 2; dx++) c.px(X + dx, Y - 1, Mat.Eye, 0);
  c.px(X - 2, Y, Mat.Eye, 1); c.px(X - 1, Y, mat, 5); c.px(X, Y, Mat.Eye, 0); c.px(X + 1, Y, mat, 3); c.px(X + 2, Y, Mat.Eye, 1);
  if (big) { c.px(X - 1, Y + 1, mat, 3); c.px(X, Y + 1, mat, 2); c.px(X + 1, Y + 1, mat, 2); }
}

/** Orelha pontuda de frente, saindo para o lado `sx` e um pouco para cima, com o miolo escuro (só de frente). */
function pointedEarFront(c: Canvas, cy: number, sx: number, len: number, inner: boolean) {
  const x0 = CX + sx * 5.6, tip = CX + sx * (5.6 + len);
  poly(c, [[x0, cy - 2.6], [tip, cy - 4 - len * 0.25], [x0 + sx * len * 0.35, cy + 1.2], [x0, cy + 2.6]], Mat.Skin, Math.min(x0, tip), Math.max(x0, tip));
  if (inner) {
    const a = CX + sx * 7, b = CX + sx * (4.6 + len * 0.85);
    poly(c, [[a, cy - 1.6], [b, cy - 3.2 - len * 0.2], [a + sx * len * 0.3, cy + 0.6]], Mat.Lip, Math.min(a, b), Math.max(a, b), () => -1);
  }
}

/**
 * Cabeça da espécie de frente (`back` = de costas), para os monstros andando para baixo e para cima. Protótipo das
 * 3 vistas dos monstros (`docs/ARTE_TIBIA.md`): goblin, esqueleto e orc; as outras espécies ainda só de lado.
 */
function monsterHeadFront(c: Canvas, kit: Kit, b: number, back: boolean) {
  const cy = 37 + b;
  if (!kit.hunch) ellipse(c, CX, cy + 9, 3, 2.5, Mat.Skin); // pescoço (o corcunda enfia a cabeça entre os ombros)
  switch (kit.species) {
    case "goblin": {
      // De frente: orelhas rasgadas abertas, testa pesada em V, órbitas no escuro com a brasa no fundo, nariz em gancho
      // e a bocarra de dentes tortos. A corcunda baixa a cabeça entre os ombros.
      const hy = cy + (kit.hunch ?? 0) * 0.7;
      for (const sx of [-1, 1]) goblinEar(c, CX + sx * 5.6, hy - 2.4, sx, true, back);
      if (back) {
        // Nuca: crânio comprido, pescoço fino com as vértebras saltadas, cicatriz e o cabelo ralo em mechas oleosas.
        limb(c, [CX, hy + 2], [CX, hy + 7], 2.6, 2.8, Mat.Skin, blotchy);
        const skull = ellipse(c, CX, hy - 1.2, 7, 6.8, Mat.Skin, blotchy);
        for (const y of [5.4, 7.4]) ellipse(c, CX, hy + y, 1, 0.7, Mat.Skin);
        thread(c, [CX - 4, hy - 3], [CX + 1, hy + 1.6], Mat.Lip, 1, [skull]);
        for (let k = -2; k <= 2; k++) chain(c, [[CX + k * 1.4, hy - 7.6], [CX + k * 2.4, hy - 4], [CX + k * 3.2, hy + 1.4]], 0.55, Mat.Hair, strands, 0.25);
        wart(c, CX + 3.6, hy - 1);
        return;
      }
      const skull = ellipse(c, CX, hy - 1.8, 7, 6.4, Mat.Skin, blotchy);
      const jaw = ellipse(c, CX, hy + 4, 6.6, 3.6, Mat.Skin, blotchy);
      for (const sx of [-1, 1]) {
        // Bochecha funda e maçã do rosto.
        for (let Y = F(hy + 0.6); Y <= F(hy + 2.6); Y++) for (let dx = 7; dx <= 11; dx++) if (noise(dx, Y) < 0.7) c.on([skull, jaw], mx(sx, dx), Y, Mat.Skin, 1);
        c.fill(ebox(CX + sx * 3.2, hy - 1.6, 2.2, 1.6), inEllipse(CX + sx * 3.2, hy - 1.6, 2.1, 1.5), Mat.Eye, () => 0.1);
        c.px(F(CX + sx * 3.2) - (sx < 0 ? 0 : 1), F(hy - 1.6), Mat.Ember, 5);
        c.px(F(CX + sx * 3.2) - (sx < 0 ? 0 : 1) + sx, F(hy - 1.6), Mat.Amber, 5);
        c.px(F(CX + sx * 3.2) - (sx < 0 ? 0 : 1), F(hy - 1.6) + 1, Mat.Ember, 3);
        limb(c, [CX + sx * 0.8, hy - 2.6], [CX + sx * 6.6, hy - 5], 1.5, 1.1, Mat.Skin, blotchy);
        thread(c, [CX + sx * 0.8, hy - 1.8], [CX + sx * 6, hy - 3.8], Mat.Eye, 0, [skull]);
      }
      thread(c, [CX + 1.4, hy - 6], [CX + 4.4, hy + 1], Mat.Lip, 1, [skull, jaw]);
      // Nariz em gancho: ponte fina, ponta caída sobre a boca, narinas.
      limb(c, [CX, hy - 2.2], [CX, hy + 2.4], 1.1, 1.6, Mat.Skin, blotchy);
      c.px(F(CX) - 2, F(hy + 2.8), Mat.Eye, 0); c.px(F(CX) + 1, F(hy + 2.8), Mat.Eye, 0);
      const mouth = c.fill(ebox(CX, hy + 5, 5.4, 1.8), inEllipse(CX, hy + 5, 5.2, 1.6), Mat.Eye, () => 0.1);
      thread(c, [CX - 5, hy + 4], [CX + 5, hy + 4], Mat.Lip, 1, [mouth]);
      jaggedTeeth(c, CX - 4.6, CX + 4.6, hy + 3.8, 1, 1.5);
      jaggedTeeth(c, CX - 4, CX + 4, hy + 6.4, -1, 1.2);
      for (const [x, y] of [[-4.6, -4.6], [5.2, 2.4], [-2.6, 7.4]] as const) wart(c, CX + x, hy + y);
      for (const k of [-2, -1, 1, 2]) chain(c, [[CX + k * 1.2, hy - 7.8], [CX + k * 2.8, hy - 7], [CX + k * 4.4, hy - 3.6]], 0.55, Mat.Hair, strands, 0.25);
      return;
    }
    case "skeleton": {
      // Crânio de frente: órbitas fundas com a brasa no fundo, buraco do nariz, maçãs saltadas e a fileira de dentes.
      const skull = ellipse(c, CX, cy - 1, 8, 8, Mat.Skin);
      if (back) {
        // De costas: a sutura do crânio, a base da nuca e as vértebras do pescoço.
        thread(c, [CX - 5, cy - 4], [CX + 5, cy - 4.6], Mat.Skin, 1, [skull]);
        thread(c, [CX + 0.4, cy - 8], [CX, cy - 4.4], Mat.Skin, 1, [skull]);
        thread(c, [CX - 4, cy + 4.6], [CX + 4, cy + 4.6], Mat.Skin, 1, [skull]);
        for (const y of [cy + 7.4, cy + 9.4]) ellipse(c, CX, y, 1.6, 0.9, Mat.Skin);
        return;
      }
      const jaw = ellipse(c, CX, cy + 5.4, 5, 2.8, Mat.Skin);
      for (const sx of [-1, 1]) {
        c.fill(ebox(CX + sx * 3.4, cy, 2.6, 2.6), inEllipse(CX + sx * 3.4, cy, 2.4, 2.6), Mat.Eye, () => 0.1);
        c.px(F(CX + sx * 3.4) - (sx < 0 ? 0 : 1), F(cy), Mat.Ember, 5);
        thread(c, [CX + sx * 6, cy + 2], [CX + sx * 7.2, cy + 3.6], Mat.Skin, 1, [skull]);
      }
      for (const [dx, dy] of [[0, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2]]) c.on(skull, F(CX) + dx, F(cy + 3) + dy, Mat.Eye, 0);
      thread(c, [CX - 4, cy + 5.2], [CX + 4, cy + 5.2], Mat.Eye, 0, [skull, jaw]);
      for (const x of [-3.2, -1.6, 0, 1.6, 3.2]) { c.on([skull, jaw], F(CX + x), F(cy + 4.4), Mat.Eye, 0); c.on([skull, jaw], F(CX + x), F(cy + 6), Mat.Eye, 0); }
      return;
    }
    default: {
      // Orc (e o que ainda não tem cabeça de frente): orelha pontuda curta, testa pesada, nariz chato, presas subindo
      // do queixo e a crista de cabelo preto do alto da cabeça até a nuca.
      for (const sx of [-1, 1]) pointedEarFront(c, cy, sx, 6, !back);
      const face = ellipse(c, CX, cy, 8.2, 8.8, Mat.Skin, (X, Y) => (noise(X >> 1, Y >> 1) < 0.06 ? -1 : 0));
      if (back) {
        thread(c, [CX - 5, cy + 5.6], [CX + 5, cy + 5.6], Mat.Skin, 2, [face]);
        chain(c, [[CX, cy - 9.4], [CX, cy - 4], [CX, cy + 3]], 1.8, Mat.Hair, strands, 1.2);
        return;
      }
      ellipse(c, CX, cy + 6, 5.2, 2.8, Mat.Skin);
      // Testa saltada: sobrancelha grossa e escura fazendo o V de raiva.
      for (const sx of [-1, 1]) {
        limb(c, [CX + sx * 1, cy - 2.6], [CX + sx * 6.6, cy - 3.6], 1.2, 1, Mat.Skin);
        thread(c, [CX + sx * 1, cy - 2], [CX + sx * 6, cy - 3.4], Mat.Eye, 0, [face]);
        eyeFront(c, CX + sx * 3.6, cy - 0.6, Mat.Ember);
      }
      poly(c, [[CX - 1.4, cy - 1], [CX + 1.4, cy - 1], [CX + 2.8, cy + 2.8], [CX - 2.8, cy + 2.8]], Mat.Skin, CX - 2.8, CX + 2.8);
      c.px(F(CX - 1.4), F(cy + 2.6), Mat.Eye, 0); c.px(F(CX + 1.4) - 1, F(cy + 2.6), Mat.Eye, 0);
      thread(c, [CX - 4.6, cy + 5], [CX + 4.6, cy + 5], Mat.Eye, 0, [face]);
      for (const sx of [-1, 1]) fang(c, [CX + sx * 3.2, cy + 5.4], 0.7, 2.4, -1);
      chain(c, [[CX, cy - 9.6], [CX, cy - 7]], 1.8, Mat.Hair, strands, 1.4);
      return;
    }
  }
}

/** Costelas, espinha, esterno e bacia de frente ou de costas (esqueleto). */
function ribcageFront(c: Canvas, top: number, back: boolean) {
  const spine = chain(c, [[CX, top], [CX, top + 8], [CX, top + 17]], back ? 1.4 : 1, Mat.Skin);
  for (let k = 0; k < 5; k++) {
    const y = top + 2.4 + k * 2.6, w = 8.4 - k * 0.5;
    for (const sx of [-1, 1]) chain(c, [[CX + sx * 0.8, y], [CX + sx * w * 0.7, y - 0.4], [CX + sx * w, y + 1.6], [CX + sx * (w - 1.4), y + 3]], 0.75, Mat.Skin, undefined, 0.6);
  }
  if (!back) limb(c, [CX, top + 1.6], [CX, top + 10], 1, 0.8, Mat.Skin);
  // Clavículas e a bacia.
  for (const sx of [-1, 1]) limb(c, [CX + sx * 1, top + 0.6], [CX + sx * 9.6, top + 1.6], 0.8, 0.7, Mat.Skin);
  ellipse(c, CX, top + 17.4, 6.6, 2.8, Mat.Skin);
  return spine[0];
}

/** Costelas, espinha e bacia de perfil (esqueleto). */
function ribcageSide(c: Canvas, top: number) {
  const spine = chain(c, [[CX + 4, top], [CX + 5, top + 8], [CX + 4, top + 16]], 1.3, Mat.Skin);
  for (let k = 0; k < 5; k++) {
    const y = top + 2.4 + k * 2.6;
    chain(c, [[CX + 4.4, y], [CX - 1, y + 1], [CX - 5.4 + k * 0.4, y + 3.6]], 0.75, Mat.Skin, undefined, 0.6);
  }
  limb(c, [CX - 4.6, top + 3], [CX - 4, top + 12], 0.8, 0.7, Mat.Skin);
  ellipse(c, CX + 1, top + 17.4, 5.4, 2.8, Mat.Skin);
  return spine[0];
}

/** Kit de cada monstro humanoide da Cripta: espécie, cores, tamanho e o que veste e carrega. */
const MONSTER_KITS: Record<string, Kit> = {
  goblin: {
    look: { skin: "#6b7a3c", skinContrast: 1.2, head: "#16120e", primary: "#4a3a28", secondary: "#3a3026", detail: "#2e2218", trim: "#5a4630" },
    species: "goblin", size: 0.8, thin: 0.72, hunch: 2.6, grim: 1.7, claws: true, ragged: true,
    hair: "none", beard: "none", top: "tunic", sleeves: "none", pants: "knee", feet: "bare", waist: "strap", weapon: "sword-1",
  },
  goblinArcher: {
    look: { skin: "#6b7a3c", skinContrast: 1.2, head: "#16120e", primary: "#3e4630", secondary: "#3a3026", detail: "#2e2218", trim: "#5a4630" },
    species: "goblin", size: 0.8, thin: 0.72, hunch: 2.6, grim: 1.7, claws: true, ragged: true,
    hair: "none", beard: "none", top: "tunic", sleeves: "none", pants: "knee", feet: "bare", waist: "strap", weapon: "bow", quiver: true,
  },
  kobold: {
    look: { skin: "#a0522c", head: "#2a2018", primary: "#7a6a4a", secondary: "#6a5034", detail: "#4a3624", trim: "#c09030" },
    species: "kobold", size: 0.7, tail: true, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth", weapon: "sword-1",
  },
  hobgoblin: {
    look: { skin: "#b4602e", head: "#1e1814", primary: "#7a2420", secondary: "#4a4038", detail: "#3e2a1c", trim: "#a08030" },
    species: "hobgoblin", size: 1, hair: "none", beard: "none", top: "gambeson", sleeves: "quilt", pants: "full", feet: "boots", waist: "belt", weapon: "sword-2", armor: "armor-3", shield: "shield-1",
  },
  orc: {
    look: { skin: "#7b8a4c", head: "#1a1614", primary: "#5a3a24", secondary: "#4a4038", detail: "#3e2a1c", trim: "#8a6a3a" },
    species: "orc", size: 1, hair: "none", beard: "none", top: "gambeson", sleeves: "none", pants: "full", feet: "boots", waist: "belt", weapon: "axe-2", armor: "armor-1",
  },
  gnoll: {
    look: { skin: "#b08a52", head: "#3a2a1c", primary: "#6a5a3a", secondary: "#5a4a34", detail: "#4a3624", trim: "#a0803a" },
    species: "gnoll", size: 1.05, hair: "none", beard: "none", top: "tunic", sleeves: "none", pants: "knee", feet: "bare", waist: "strap", weapon: "axe-1",
  },
  skeleton: {
    look: { skin: "#d8cfb2", head: "#3a3028", primary: "#5a5040", secondary: "#4a4038", detail: "#4a3a2a", trim: "#7a6a4a" },
    species: "skeleton", size: 0.95, thin: 0.5, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth", weapon: "sword-1", shield: "shield-1",
  },
  skeletonArcher: {
    look: { skin: "#d8cfb2", head: "#3a3028", primary: "#5a5040", secondary: "#4a4038", detail: "#4a3a2a", trim: "#7a6a4a" },
    species: "skeleton", size: 0.95, thin: 0.5, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth", weapon: "bow", quiver: true,
  },
  zombie: {
    look: { skin: "#7d8f6a", head: "#2e2a22", primary: "#5a5040", secondary: "#4a4a44", detail: "#3a3024", trim: "#6a5a40" },
    species: "zombie", size: 0.97, hair: "none", beard: "none", top: "tunic", sleeves: "short", pants: "full", feet: "bare", waist: "rope", weapon: "none",
  },
  bugbear: {
    look: { skin: "#7a5530", head: "#3a2818", primary: "#5a3a24", secondary: "#4a4038", detail: "#3e2a1c", trim: "#8a6a3a" },
    species: "bugbear", size: 1.22, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "knee", feet: "bare", waist: "belt", weapon: "axe-3", armor: "armor-1",
  },
  ogre: {
    look: { skin: "#c08a5a", head: "#3a2818", primary: "#6a5a3a", secondary: "#5a4a34", detail: "#4a3624", trim: "#8a6a3a" },
    species: "ogre", size: 1.45, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth", weapon: "branch",
  },
  // Necrópole de Solária: a legião de ossos do Império de Kusa e as múmias da corte.
  boneLegionary: {
    look: { skin: "#ddd2b2", head: "#3a3028", primary: "#7a2018", secondary: "#4a4038", detail: "#5a3a1c", trim: "#c8903a" },
    species: "skeleton", size: 0.97, thin: 0.5, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "belt",
    weapon: "sword-2", helmet: "war-2", shield: "shield-3",
  },
  boneArcher: {
    look: { skin: "#ddd2b2", head: "#3a3028", primary: "#cdb88a", secondary: "#4a4038", detail: "#5a3a1c", trim: "#a08a5c" },
    species: "skeleton", size: 0.95, thin: 0.5, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "strap",
    weapon: "bow-2", quiver: true,
  },
  buriedDead: {
    look: { skin: "#c8aa7a", head: "#3a3028", primary: "#5a5040", secondary: "#4a4038", detail: "#5a3a1c", trim: "#7a6a4a" },
    species: "skeleton", size: 0.95, thin: 0.5, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth",
    weapon: "axe-1",
  },
  boneCenturion: {
    look: { skin: "#e2d8bc", head: "#3a3028", primary: "#9a2018", secondary: "#4a4038", detail: "#5a3a1c", trim: "#d8a040" },
    species: "skeleton", size: 1.2, thin: 0.55, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "belt",
    weapon: "sword-4", helmet: "war-4", armor: "armor-3", shield: "shield-4",
  },
  sandScribe: {
    look: { skin: "#ddd2b2", head: "#3a3028", primary: "#2e4a8a", secondary: "#24365a", detail: "#e0b23a", trim: "#e0b23a" },
    species: "skeleton", size: 1.05, thin: 0.5, hair: "none", beard: "none", top: "robe", sleeves: "bell", pants: "none", feet: "shoes", waist: "sash",
    weapon: "staff-3",
  },
  wrappedMummy: {
    look: { skin: "#cdbe96", head: "#3a2e22", primary: "#5a5040", secondary: "#4a4038", detail: "#7a6a4a", trim: "#9c8d68" },
    species: "mummy", size: 1, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "loincloth", weapon: "none",
  },
  mourner: {
    look: { skin: "#cdbe96", head: "#3a2e22", primary: "#363a4e", secondary: "#24263a", detail: "#5a6078", trim: "#8a90a8" },
    species: "mummy", size: 0.95, hair: "none", beard: "none", top: "robe", sleeves: "bell", pants: "none", feet: "bare", waist: "sash", weapon: "none",
  },
  royalMummy: {
    look: { skin: "#d8c8a0", head: "#3a2e22", primary: "#26468a", secondary: "#24365a", detail: "#e0b23a", trim: "#e8b830" },
    species: "mummy", size: 1.15, hair: "none", beard: "none", top: "none", sleeves: "none", pants: "none", feet: "bare", waist: "sash",
    weapon: "wand-4", helmet: "arc-4",
  },
};

export const PROTO_MONSTERS = Object.keys(MONSTER_KITS);
/** Tamanho do monstro em relação ao herói (1 = da altura do herói). */
export const monsterSize = (kind: string) => MONSTER_KITS[kind].size ?? 1;

/** Quadros de cada clipe do monstro humanoide: parado (respirando), andar, golpe e magia. */
export const MONSTER_CLIP_FRAMES = { idle: 4, walk: 4, attack: 4, cast: 4 } as const;
type MonsterClip = keyof typeof MONSTER_CLIP_FRAMES;
const MONSTER_CLIPS: readonly MonsterClip[] = ["idle", "walk", "attack", "cast"];

/**
 * Pose de cada quadro. Parado: pernas um pouco abertas e o peito subindo e descendo, com a arma balançando junto.
 * Andar: o passo dos heróis. Golpe: preparo com a arma lá atrás, o golpe com o corpo todo para a frente, o fim do
 * movimento e a volta. Arqueiro puxa a corda e solta; zumbi avança com os dois braços. Magia: os braços sobem.
 */
function monsterPose(kit: Kit, clip: MonsterClip, k: number): MonsterPose {
  const w = kit.weapon;
  switch (clip) {
    case "idle": {
      const b = [0, 0.8, 1.6, 0.8][k], t = [0, 1, 2, 1][k];
      if (kit.species === "goblin" && w !== "bow") {
        // Goblin à espreita: agachado, a lâmina apontada para a frente e a garra de lá aberta, tremendo no ritmo.
        return { s: 0.6, b: b * 0.6 + 1, lean: 1.2 + t * 0.35, hand: [-9 - t * 0.4, 12 - t * 0.6], elbow: [-4.4, 7.6], back: [-6.4 + t * 0.3, 14], backElbow: [-1.6, 9.4], point: 192 - t * 4 };
      }
      return { s: 0.35, b, lean: t * 0.3, back: [3.4 - t * 0.3, 18 - t * 0.6], hand: [-5 + t * 0.4, 18 - t * 0.8], tilt: -t * 5 };
    }
    case "walk":
      return { s: SWING[k], b: BOB[k] * 1.4 };
    case "attack": {
      if (w === "bow") {
        // Arco: ergue, puxa a corda até o rosto, solta (a mão de trás pula para trás) e volta.
        return ([
          { s: 0.4, b: 0, lean: 0, hand: [-9, 12], elbow: [-5, 8], back: [-2, 12], backElbow: [2, 10] },
          { s: 0.6, b: 0.5, lean: -0.6, hand: [-13, 7], elbow: [-7, 5], back: [3, 6], backElbow: [6, 6] },
          { s: 0.6, b: 0.5, lean: -0.3, hand: [-13, 7], elbow: [-7, 5], back: [7, 4], backElbow: [6, 7] },
          { s: 0.4, b: 0, lean: 0, hand: [-8, 14], elbow: [-4, 10] },
        ] as MonsterPose[])[k];
      }
      if (w === "none") {
        // Zumbi: ergue os braços e cai por cima, as duas mãos à frente.
        return ([
          { s: 0.3, b: -0.5, lean: -1, hand: [-9, 2], elbow: [-5, 4], back: [-6, 1], backElbow: [-2, 4] },
          { s: 1, b: 1, lean: 3, hand: [-16, 9], elbow: [-9, 7], back: [-13, 8], backElbow: [-6, 7] },
          { s: 1, b: 1.2, lean: 2.4, hand: [-14, 15], elbow: [-8, 10], back: [-11, 14], backElbow: [-5, 10] },
          { s: 0.5, b: 0.4, lean: 0.6, hand: [-8, 16], elbow: [-4, 10], back: [-2, 16] },
        ] as MonsterPose[])[k];
      }
      // Arma de golpe: preparo (arma para cima e para trás), golpe (deitada à frente), fim (para baixo) e volta.
      return ([
        { s: 0.3, b: -0.6, lean: -1.4, hand: [4, -4], elbow: [5, 3], back: [-5, 13], backElbow: [-1, 10], point: -70 },
        { s: 1, b: 0.8, lean: 2.6, hand: [-14, 8], elbow: [-8, 7], back: [8, 13], backElbow: [5, 10], point: 185 },
        { s: 1, b: 1, lean: 2, hand: [-11, 17], elbow: [-6, 11], back: [7, 15], backElbow: [4, 11], point: 115 },
        { s: 0.6, b: 0.4, lean: 0.6, hand: [-6, 17], elbow: [-3, 10] },
      ] as MonsterPose[])[k];
    }
    case "cast": {
      // Braços para o alto (a arma aponta para cima), o corpo sobe e desce no ritmo.
      const lift = [0, 1, 1, 0][k], b = [0, -0.6, -1, -0.4][k];
      return {
        s: 0.35, b, lean: -0.5 * lift,
        hand: lerp([-6, 16], [-7, -5], lift), elbow: lerp([-3, 10], [-6, 4], lift),
        back: lerp([3, 17], [1, -6], lift), backElbow: lerp([4, 10], [4, 3], lift),
        point: lift && w !== "bow" && w !== "none" ? -100 : undefined,
      };
    }
  }
}

/** Um quadro do monstro (192 px, olhando para a esquerda, pés na mesma linha dos heróis). */
export function protoMonsterFrame(kind: string, clip: MonsterClip = "idle", k = 0): Uint8ClampedArray {
  const kit = MONSTER_KITS[kind];
  const c = new Canvas();
  c.scaled([CX, FEET], kit.size ?? 1, () => side(c, kit, 0, monsterPose(kit, clip, k)));
  return c.render(kit.look, true, kit.grim);
}

const toFrameCanvas = (data: Uint8ClampedArray) => {
  const { canvas, ctx } = makeCanvas(S, S);
  const image = ctx.createImageData(S, S);
  image.data.set(data);
  ctx.putImageData(image, 0, 0);
  return canvas;
};

/** Primeiro quadro do monstro (parado), para quem não anima e para a galeria. */
export function protoMonsterPortrait(kind: string): HTMLCanvasElement {
  return toFrameCanvas(protoMonsterFrame(kind));
}

/**
 * Protótipo das 3 vistas dos monstros humanoides (só galeria, o jogo ainda usa só o perfil): parado (respirando) e
 * andar de frente (`down`), de costas (`up`) e de lado, 4 quadros cada. Golpe e magia continuam só de lado.
 */
export const PROTO_MONSTER_DIRS = ["goblin", "skeleton", "orc"];
export function protoMonsterDirFrame(kind: string, dir: ProtoDir, clip: "idle" | "walk", k: number): HTMLCanvasElement {
  if (dir === "side") return toFrameCanvas(protoMonsterFrame(kind, clip, k));
  const kit = MONSTER_KITS[kind];
  const c = new Canvas();
  const pose = clip === "idle" ? { s: 0, b: [0, 0.8, 1.6, 0.8][k] } : undefined;
  c.scaled([CX, FEET], kit.size ?? 1, () => front(c, kit, k, dir === "up", pose));
  return toFrameCanvas(c.render(kit.look, true, kit.grim));
}

/** Os 16 quadros da folha do monstro (parado, andar, golpe e magia), um por chamada, para desenhar aos poucos. */
export function protoMonsterFrames(kind: string): (() => HTMLCanvasElement)[] {
  return MONSTER_CLIPS.flatMap((clip) => Array.from({ length: MONSTER_CLIP_FRAMES[clip] }, (_, k) => () => toFrameCanvas(protoMonsterFrame(kind, clip, k))));
}

/** Folha do monstro: os clipes em ordem (parado, andar, golpe, magia), quadros de `PROTO_SIZE`. */
export function protoMonsterSheet(kind: string): HTMLCanvasElement {
  const frames = protoMonsterFrames(kind);
  const { canvas, ctx } = makeCanvas(S * frames.length, S);
  frames.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
  return canvas;
}

// --- Ícones dos itens (mochila, cofre, mercado, equipamento e chão) ------------------------

/** Lado do ícone em pixels e em unidades de projeto. */
export const PROTO_ICON = 64;
const ICON_U = PROTO_ICON / K;

/**
 * O item sozinho, sem o corpo, na pose em que é vestido (o mesmo desenho do herói): arma em diagonal, elmo e
 * armadura de frente, calça com as duas pernas, botas de lado, escudo de frente.
 */
function iconPose(c: Canvas, id: string) {
  const fam = id.replace(/-\d(-magic)?$/, "");
  const kit: Kit = { ...KITS.knight, top: "none", waist: "belt" };
  switch (fam) {
    case "sword": {
      const t = tierOf(id), hilt: Pt = [CX - 9, 66], len = t === 5 ? 30 : SWORD_LEN[t] + 4;
      const tip: Pt = [hilt[0] + len * 0.7, hilt[1] - len * 0.7];
      if (id === "sword-4-magic") dancingSword(c, hilt, tip);
      else swordById(c, id, hilt, tip);
      return;
    }
    case "axe": axeArt(c, id, [CX - 6, 72], [CX + 4, 50], 1); return;
    case "bow": bowArt(c, id, [CX, 55], 1); return;
    case "xbow": crossbowArt(c, id, [CX, 55], [-0.97, 0.24], true); return;
    case "wand": wandArt(c, id, [CX - 4, 62], [CX + 5, 52]); return;
    // Haste mais curta que a vestida: a cabeça do cajado é o que se reconhece no quadradinho.
    case "staff": staffArt(c, id, [CX, 52], 34, 60); return;
    case "war": case "arc":
      if (id === "arc-1-magic") wolfFront(c, 37, 47);
      else helmetArt(c, id, "down", CX, 37, 47);
      return;
    case "armor": case "robe": {
      kit.armor = id as ProtoArmor;
      collar(c, kit, 37, "down");
      const ids = armorTorso(c, id, 47, "down", 0);
      dressFront(c, kit, ids, 47, false);
      for (const s of [-1, 1]) armorArm(c, id, [CX + s * 12.5, 50], [CX + s * 14, 57], [CX + s * 13.5, 65], false);
      armorShoulders(c, id, 47, "down", [[CX - 12.8, 49], [CX + 12.8, 49]]);
      return;
    }
    case "pants": case "greave":
      for (const s of [-1, 1]) {
        const x = CX + s * 3.8;
        (fam === "pants" ? pantsArt : warLegs)(c, id, [x, 66], [x + s * 0.8, 77], [x + s * 1.2, 88], false, true);
      }
      pantsTop(c, c.matAt(CX - 3.8, 70));
      return;
    case "boots":
      bootsArt(c, id, [CX + 4, 76], [CX + 4, 87], [CX - 1, 88.4], true, false);
      bootsArt(c, id, [CX - 2, 77], [CX - 2, 88.4], [CX - 7, 89.6], false, false);
      return;
    case "shield": shieldArt(c, id, [CX, 60], "down", 1); return;
  }
}

/** Quadril e cinto do ícone da calça: o tecido da calça ligando as pernas e um cinto de couro com fivela. */
function pantsTop(c: Canvas, cloth: number) {
  const mat: Mat = cloth >= 0 ? cloth : Mat.Leather;
  // Quadril numa peça só, com a costura do meio e o gancho entre as pernas.
  const hip = poly(c, [[CX - 8.6, 63.4], [CX + 8.6, 63.4], [CX + 8.4, 70.6], [CX + 1.6, 73], [CX - 1.6, 73], [CX - 8.4, 70.6]], mat, CX - 8.6, CX + 8.6, twill);
  thread(c, [CX, 65.6], [CX, 72.6], mat, 1, [hip]);
  thread(c, [CX + 0.5, 65.6], [CX + 0.5, 72], mat, 4, [hip]);
  for (const s of [-1, 1]) thread(c, [CX + s * 7.8, 66], [CX + s * 5, 69.4], mat, 1, [hip]);
  // Cinto largo de couro com borda clara, pesponto, furos e a ponta sobrando.
  const belt = poly(c, [[CX - 9, 62], [CX + 9, 62], [CX + 9, 65.4], [CX - 9, 65.4]], Mat.Leather, CX - 9, CX + 9, leather);
  thread(c, [CX - 9, 62.2], [CX + 9, 62.2], Mat.Leather, 5, [belt]);
  thread(c, [CX - 9, 65.1], [CX + 9, 65.1], Mat.Leather, 0, [belt]);
  for (const y of [62.9, 64.5]) thread(c, [CX - 8.6, y], [CX + 8.6, y], Mat.Leather, (k) => (k % 3 === 0 ? 4 : -1), [belt]);
  for (const x of [3.8, 5.4, 7]) rivet(c, [belt], CX + x, 63.7, Mat.Soot);
  limb(c, [CX + 2.2, 64.6], [CX + 3.4, 69], 0.9, 0.8, Mat.Leather, leather);
  // Passadores no tecido da calça.
  for (const x of [-6.6, 6.2]) plate(c, [[CX + x - 0.7, 61.6], [CX + x + 0.7, 61.6], [CX + x + 0.7, 65.8], [CX + x - 0.7, 65.8]], mat, twill);
  // Fivela de bronze com o pino de aço.
  const buckle = c.fill([CX - 2.6, 61, CX + 2.6, 66.4], (x, y) => {
    const dx = Math.abs(x + 0.5 - CX), dy = Math.abs(y + 0.5 - 63.7);
    return dx <= 2.4 && dy <= 2.5 && (dx >= 1.3 || dy >= 1.4);
  }, Mat.Bronze, sphere(CX - 0.6, 62.8, 2.8, 2.8));
  limb(c, [CX - 1.3, 63.7], [CX + 1.4, 63.7], 0.35, 0.35, Mat.Steel);
  c.on(buckle, F(CX - 2), F(61.6), Mat.Bronze, 5);
}

/** Desenho do item no ícone, sem a gema (o raro e o comum usam o mesmo), feito uma vez. */
const iconArt = new Map<string, HTMLCanvasElement>();

function iconDrawing(id: string): HTMLCanvasElement {
  const cached = iconArt.get(id);
  if (cached) return cached;
  // 1ª passada: onde o item cai no quadro do herói.
  const probe = new Canvas();
  iconPose(probe, id);
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let i = 0; i < probe.n; i++) {
    if (probe.mat[i] < 0) continue;
    const X = i % S, Y = (i / S) | 0;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  const c = new Canvas(PROTO_ICON, PROTO_ICON);
  if (x1 >= 0) {
    const w = (x1 + 1 - x0) / K, h = (y1 + 1 - y0) / K;
    const k = Math.min((ICON_U - 3) / w, (ICON_U - 3) / h, 1.6);
    const mx = (x0 + x1 + 1) / 2 / K, my = (y0 + y1 + 1) / 2 / K;
    c.placed(k, [ICON_U / 2 - mx * k, ICON_U / 2 - my * k], () => iconPose(c, id));
  }
  const canvas = toCanvas(c);
  iconArt.set(id, canvas);
  return canvas;
}

/** Gema da raridade no canto (azul no raro, roxa no mágico), desenhada uma vez por raridade. */
const rarityGems = new Map<string, HTMLCanvasElement>();
function rarityGem(rarity: "rare" | "magic") {
  if (!rarityGems.has(rarity)) {
    const c = new Canvas(PROTO_ICON, PROTO_ICON);
    gem(c, [ICON_U - 3, 2.6], 1.5, rarity === "magic" ? Mat.Gem : Mat.Sapphire);
    rarityGems.set(rarity, toCanvas(c));
  }
  return rarityGems.get(rarity)!;
}

function toCanvas(c: Canvas) {
  const { canvas, ctx } = makeCanvas(c.w, c.h);
  const image = ctx.createImageData(c.w, c.h);
  image.data.set(c.render(KNIGHT_LOOK));
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Ícone do item no padrão novo (`PROTO_ICON` px): enquadrado e ampliado até caber, com a gema da raridade no canto. */
export function protoItemIcon(id: string, rarity: "common" | "rare" | "magic"): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PROTO_ICON, PROTO_ICON);
  ctx.drawImage(iconDrawing(id), 0, 0);
  if (rarity !== "common") ctx.drawImage(rarityGem(rarity), 0, 0);
  return canvas;
}

/** Pixels de cada quadro, calculados uma vez (a galeria pede o mesmo quadro várias vezes). */
const cache = new Map<string, Uint8ClampedArray>();

/**
 * Quadro 192×192 do protótipo, virado para a esquerda no lado. Caminhada: passo, passagem, outro passo,
 * passagem. `look` troca as cores das zonas (cosmético) sem mudar o desenho.
 */
export function protoFrame(dir: ProtoDir, frame: number, cls: ProtoClass = "knight", look?: Partial<ProtoLook>, gear: ProtoGear = {}): HTMLCanvasElement {
  const kit: Kit = { ...KITS[cls], ...(gear.helmet ? { helmet: gear.helmet } : {}), ...(gear.armor ? { armor: gear.armor } : {}), ...(gear.legs ? { legs: gear.legs } : {}), ...(gear.boots ? { boots: gear.boots } : {}), ...(gear.shield ? { shield: gear.shield } : {}), ...(gear.weapon ? { weapon: gear.weapon, quiver: /^x?bow-/.test(gear.weapon) && KITS[cls].quiver } : {}) };
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
