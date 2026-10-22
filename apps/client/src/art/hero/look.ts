import type { ClassId } from "@kusa/shared";
import { M } from "./materials.ts";
import {
  and, band, cols, edge, ellipse, limb, minus, or, poly, rect, spans, sym, type Mask,
} from "./raster.ts";
import type { Arm, Leg, Pose } from "./rig.ts";
import type { Ctx, Wear } from "./compose.ts";

/**
 * Corpo de cada classe: pele, rosto, cabelo, barba e a roupa da classe (o que aparece sem equipamento
 * ou onde ele não cobre). Também ficam aqui as formas de roupa que os itens reaproveitam
 * (túnica, saia, manga, calça, sapato).
 */

// --- Formas reaproveitadas pelos itens -------------------------------------------------

/** Saia da cintura até `bottom` (linha), abrindo `flare` px de cada lado; acompanha o passo. */
export function skirt(p: Pose, bottom: number, flare = 1, top = p.waist): Mask {
  if (p.dir === "side") {
    const [back, front] = p.legs[0].knee[0] > p.legs[1].knee[0] ? [p.legs[0], p.legs[1]] : [p.legs[1], p.legs[0]];
    const reach = (l: Leg) => l.hip[0] + (l.knee[0] - l.hip[0]) * ((bottom - l.hip[1]) / (l.knee[1] - l.hip[1]));
    const fx = Math.min(19 - flare, reach(front) - 2.5 - flare * 0.5);
    const bx = Math.max(28 + flare, reach(back) + 2.5 + flare * 0.5);
    return poly([[19, top], [28.99, top], [bx + 0.99, bottom + 0.99], [fx, bottom + 0.99]]);
  }
  // De frente e de costas: a barra balança 1 px para o lado da perna que vai à frente.
  const sway = p.frame === 1 ? -1 : p.frame === 2 ? 1 : 0;
  const rows = bottom - top + 1;
  const halves = Array.from({ length: rows }, (_, i) => 5.5 + (flare * i) / Math.max(1, rows - 1));
  const m = sym(top, halves);
  if (!sway) return m;
  const out = band(m, 0, top + Math.floor(rows / 2));
  const low = band(m, top + Math.floor(rows / 2) + 1, 47);
  return or(out, shiftX(low, sway));
}

function shiftX(m: Mask, dx: number): Mask {
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) if (m[i]) {
    const x = i % 48 + dx;
    if (x >= 0 && x < 48) out[i + dx] = 1;
  }
  return out;
}

/** Barra de baixo de uma forma (as `n` últimas linhas de cada coluna). */
export function hem(m: Mask, n = 1): Mask {
  let e = edge(m, "bottom");
  for (let k = 1; k < n; k++) e = or(e, and(m, shiftY(e, -1)));
  return e;
}

function shiftY(m: Mask, dy: number): Mask {
  const out = new Uint8Array(m.length);
  for (let i = 0; i < m.length; i++) if (m[i]) {
    const j = i + dy * 48;
    if (j >= 0 && j < m.length) out[j] = 1;
  }
  return out;
}

/** Faixa de cintura (cinto) sobre o tronco. */
export const beltMask = (p: Pose, h = 2) => band(or(p.torso, p.pelvis), p.waist, p.waist + h - 1);

/** Pintura de membro: o de lá fica 1 tom mais escuro. */
export const limbDark = (far: boolean) => (far ? -1 : 0);

export function paintHand(c: Ctx, arm: Arm, skin: number) {
  c.cv.paint(arm.handMask, skin, { light: "sphere", dark: limbDark(arm.far) });
}

/** Manga até o cotovelo (`short`) ou até o punho. */
export function sleeve(c: Ctx, arm: Arm, mat: number, short = false, o: { spec?: boolean; tex?: (x: number, y: number) => number } = {}) {
  const m = short ? arm.upper : or(arm.upper, arm.fore);
  return c.cv.paint(m, mat, { dark: limbDark(arm.far), ...o });
}

/** Calça numa perna (coxa e canela, mais a bacia na perna da frente). */
export function trouser(c: Ctx, leg: Leg, mat: number, o: { tex?: (x: number, y: number) => number; withPelvis?: boolean } = {}) {
  const m = or(leg.thigh, leg.shin, o.withPelvis === false ? new Uint8Array(48 * 48) : and(c.p.pelvis, cols(c.p.pelvis, 0, 47)));
  return c.cv.paint(m, mat, { dark: limbDark(leg.far), tex: o.tex });
}

/** Sapato simples (pé e tornozelo). */
export function shoe(c: Ctx, leg: Leg, mat: number, height = 1) {
  const ankle = band(leg.shin, Math.round(leg.ankle[1]) - height, 47);
  c.cv.paint(or(leg.foot, ankle), mat, { dark: limbDark(leg.far), light: c.p.dir === "side" ? "row" : "cyl" });
}

// --- Cabeça ----------------------------------------------------------------------------

type HairStyle = "short" | "medium" | "long" | "wild";

interface Look {
  skin: number;
  hair: number;
  style: HairStyle;
  brow: number;
  beard?: boolean;
  paint?: boolean;
}

function headBase(c: Ctx, look: Look) {
  const { cv, p } = c;
  const [hx, hy] = p.head;
  cv.paint(p.headMask, look.skin, { light: "sphere" });
  // Orelhas.
  if (p.dir === "side") cv.paint(ellipse(hx + 2.5, hy + 1.5, 1.4, 1.8), look.skin, { light: "sphere", line: "soft" });
  else {
    cv.paint(or(ellipse(hx - 8.2, hy + 1.2, 1.3, 1.6), ellipse(hx + 8.2, hy + 1.2, 1.3, 1.6)), look.skin, { light: "sphere", line: "soft" });
  }
}

function face(c: Ctx, look: Look) {
  const { cv, p } = c;
  const b = p.bob;
  if (p.dir === "down") {
    for (const x of [19, 27]) {
      cv.dot(x, 17 + b, M.eye, 1); cv.dot(x + 1, 17 + b, M.eye, 0);
      cv.dot(x, 18 + b, M.eye, 0); cv.dot(x + 1, 18 + b, M.eye, 1);
      cv.dot(x, 17 + b, M.eyeWhite, 5);
      cv.dot(x - (x === 19 ? 0 : -1), 15 + b, look.brow, 1);
      cv.dot(x + (x === 19 ? 1 : 0), 15 + b, look.brow, 1);
    }
    cv.dot(24, 19 + b, look.skin, 2);
    cv.dot(23, 20 + b, M.mouth, 3); cv.dot(24, 20 + b, M.mouth, 2);
    cv.dot(18, 19 + b, look.skin, 4); cv.dot(29, 19 + b, look.skin, 2);
    if (look.paint) {
      for (const x of [18, 19, 28, 29]) cv.dot(x, 19 + b + (x === 19 || x === 28 ? 1 : 0), M.facePaint, x < 24 ? 3 : 2);
    }
  } else if (p.dir === "side") {
    cv.dot(18, 17 + b, M.eye, 0); cv.dot(18, 18 + b, M.eye, 1); cv.dot(19, 17 + b, M.eyeWhite, 4);
    cv.dot(18, 15 + b, look.brow, 1); cv.dot(19, 15 + b, look.brow, 1);
    // Nariz para fora do contorno da cabeça.
    cv.paint(rect(15, 18 + b, 15, 19 + b), look.skin, { light: "flat", line: "none", group: "keep" });
    cv.dot(16, 19 + b, look.skin, 2);
    cv.dot(17, 21 + b, M.mouth, 2);
    if (look.paint) { cv.dot(19, 20 + b, M.facePaint, 3); cv.dot(20, 20 + b, M.facePaint, 2); }
  }
}

/** Cabelo como forma, conforme o estilo, a direção e o que o capacete cobre. */
function hairMask(p: Pose, style: HairStyle, cover: { hair: boolean; sides: boolean }): Mask {
  const [hx, hy] = p.head;
  const y = (v: number) => hy - 15.5 + v;
  const cap = ellipse(hx, hy - 0.8, 8.6, 7.6);
  const long = style === "long" || style === "medium";
  let m: Mask;
  if (p.dir === "up") {
    const nape = style === "long" ? y(21) : style === "medium" ? y(22) : y(20.5);
    m = or(and(cap, rect(0, 0, 47, nape)), and(ellipse(hx, hy + 1, 8.6, 7.4), rect(0, 0, 47, nape)));
    // Cabelo comprido desce pelas costas em ponta.
    if (style === "long") m = or(m, sym(Math.round(y(21)), [7, 6.5, 6, 5, 4, 3, 2]));
  } else if (p.dir === "down") {
    const top = and(cap, rect(0, 0, 47, y(12.5)));
    // Franja em mechas e laterais até a altura das orelhas (ou mais, no cabelo comprido).
    const fringe = style === "wild"
      ? spans(Math.round(y(13)), [[16, 31], [16, 19], [16, 17]]).map((v, i) => (v && ((i % 48) % 3 !== 1 || Math.floor(i / 48) === Math.round(y(13))) ? 1 : 0)) as Mask
      : or(
        spans(Math.round(y(13)), [[16, 31]]),
        spans(Math.round(y(14)), [[16, 18]]), spans(Math.round(y(14)), [[20, 22]]), spans(Math.round(y(14)), [[27, 31]]),
        spans(Math.round(y(15)), [[16, 17]]), spans(Math.round(y(15)), [[30, 31]]),
      );
    const sideLen = long ? (style === "long" ? y(25) : y(20.5)) : y(17);
    const sides = or(rect(15, Math.round(y(12)), 17, sideLen), rect(30, Math.round(y(12)), 32, sideLen));
    m = or(top, fringe, and(sides, ellipse(hx, hy + 3, 9.2, 12)));
  } else {
    const back = style === "long"
      ? poly([[21, y(9)], [33, y(10)], [32.5, y(20)], [30.5, y(25)], [27.5, y(27.5)], [25, y(22)], [22.5, y(14)]])
      : style === "medium"
        ? poly([[21, y(9)], [33, y(10)], [32.5, y(21.5)], [26, y(21.5)], [22.5, y(14)]])
        : poly([[21, y(9)], [33, y(10)], [33, y(19.5)], [24, y(20)], [22.5, y(14)]]);
    const top = and(cap, rect(0, 0, 47, y(12.5)));
    const fringe = or(spans(Math.round(y(13)), [[16, 24]]), spans(Math.round(y(14)), [[17, 19]]), spans(Math.round(y(14)), [[21, 23]]));
    m = or(top, and(back, ellipse(hx + 1, hy + (long ? 4 : 0.5), 9.5, long ? 13 : 8)), fringe);
  }
  if (cover.hair) {
    // Sob capacete ou capuz só sobra o que passa das bordas: as mechas compridas dos lados e da nuca.
    m = cover.sides ? new Uint8Array(m.length) : and(m, rect(0, Math.round(y(18)), 47, 47));
  }
  return m;
}

function hair(c: Ctx, look: Look) {
  const cover = { hair: !!c.helmet?.hair, sides: !!c.helmet?.sides };
  const m = hairMask(c.p, look.style, cover);
  // Mechas: fios escuros que descem inclinados para fora a partir do topo, e alguns reflexos.
  const [hx, hy] = c.p.head;
  const strands = (x: number, y: number) => {
    const lean = Math.round((x - hx) * (y - (hy - 8)) / 14);
    const k = (x - lean + 64) % 4;
    return k === 0 ? -1 : k === 2 && (y + x) % 3 === 0 ? 1 : 0;
  };
  c.cv.paint(m, look.hair, { light: "sphere", tex: strands });
}

function beard(c: Ctx, look: Look) {
  const { cv, p } = c;
  if (!look.beard || c.helmet?.face || p.dir === "up") return;
  const b = p.bob;
  const strands = (x: number) => (x % 3 === 0 ? -1 : 0);
  if (p.dir === "down") {
    const m = or(
      sym(18 + b, [0, 0, 0, 6.5, 6.5, 6, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 1.5]),
      spans(17 + b, [[17, 18], [17, 18], [17, 18]]), spans(17 + b, [[29, 30], [29, 30], [29, 30]]),
    );
    cv.paint(minus(m, rect(21, 20 + b, 26, 20 + b)), look.hair, { light: "cyl", tex: strands });
    // Bigode por cima da boca.
    cv.paint(spans(20 + b, [[20, 27]]), look.hair, { light: "row", line: "soft" });
    cv.dot(23, 21 + b, M.mouth, 1); cv.dot(24, 21 + b, M.mouth, 1);
  } else {
    const m = poly([[16, 19 + b], [23, 18 + b], [23.5, 23 + b], [21, 30 + b], [18, 27 + b], [16, 22 + b]]);
    cv.paint(m, look.hair, { light: "cyl", tex: strands });
    cv.paint(spans(20 + b, [[15, 19]]), look.hair, { light: "row", line: "soft" });
  }
}

// --- Chapéus e capuzes das classes ------------------------------------------------------

function sorcererHat(c: Ctx) {
  const { cv, p } = c;
  const [hx, hy] = p.head;
  const y = (v: number) => hy - 15.5 + v;
  const brim = p.dir === "side"
    ? ellipse(hx - 0.5, y(12), 11, 2.2)
    : ellipse(hx, y(12), 11.5, 2.4);
  const cone = p.dir === "side"
    ? poly([[16, y(12)], [31, y(12)], [27, y(5.5)], [24, y(3)], [21, y(2.5)], [22, y(4.5)], [20, y(7.5)]])
    : poly([[16, y(12)], [31.99, y(12)], [27, y(6)], [24.5, y(3)], [22, y(2.5)], [21.5, y(4)], [19.5, y(7)]]);
  cv.paint(cone, M.sorcPurple, { light: "cyl" });
  cv.paint(band(cone, Math.round(y(9)), Math.round(y(10))), M.gold, { light: "cyl", spec: true, line: "soft" });
  cv.paint(brim, M.sorcPurple, { light: "row" });
  if (p.dir !== "up") cv.paint(ellipse(p.dir === "side" ? 20 : 26, y(6.5), 0.8, 0.8), M.star, {});
}

function druidHood(c: Ctx) {
  const { cv, p } = c;
  const [hx, hy] = p.head;
  const y = (v: number) => hy - 15.5 + v;
  const outer = ellipse(hx + (p.dir === "side" ? 1 : 0), hy - 0.2, 9.2, 8.6);
  let hood: Mask;
  if (p.dir === "down") {
    hood = minus(or(outer, sym(Math.round(y(20)), [8, 8.5, 8.5])), ellipse(hx, hy + 2.6, 6.4, 6.2));
  } else if (p.dir === "up") {
    hood = or(outer, sym(Math.round(y(20)), [8, 8.5, 8.5]), poly([[22, y(23)], [25.99, y(23)], [24, y(28)]]));
  } else {
    hood = minus(or(outer, poly([[25, y(18)], [33, y(16)], [31, y(25)], [24, y(24)]])), ellipse(hx - 3.2, hy + 2.5, 5.4, 6));
  }
  cv.paint(hood, M.druidGreen, { light: "sphere", tex: (x, yy) => ((x + yy * 2) % 9 === 0 ? -1 : 0) });
  // Folhas presas na borda.
  const leaves: [number, number][] = p.dir === "down" ? [[17, 9], [19, 7], [29, 8]] : p.dir === "up" ? [[18, 8], [28, 7], [24, 6]] : [[19, 8], [27, 7]];
  for (const [lx, ly] of leaves) {
    cv.paint(ellipse(lx, y(ly), 1.6, 1.1), M.leaf, { light: "sphere", line: "soft" });
  }
}

// --- Classes --------------------------------------------------------------------------

interface ClassLook extends Look {
  shirt: number;
  pants: number;
  trim: number;
  /** Comprimento da túnica: "short" (até o quadril) ou "knee". */
  tunic: "short" | "knee";
  hat?: (c: Ctx) => void;
  extras?: Wear;
}

const BELT_GOLD = (c: Ctx) => {
  const { cv, p } = c;
  cv.paint(beltMask(p), M.darkLeather, { light: "row" });
  if (p.dir === "down") cv.paint(rect(23, p.waist, 24, p.waist + 1), M.gold, { light: "flat", spec: true });
};

/** Aljava do paladino: nas costas, com as penas aparecendo sobre o ombro. */
const QUIVER: Wear = {
  back(c) {
    const { cv, p } = c;
    const b = p.bob;
    if (p.dir === "up") return;
    const body = p.dir === "down" ? limb([[29.5, 20 + b], [26, 33 + b]], 2.3) : limb([[30, 22 + b], [29, 34 + b]], 2.4);
    cv.paint(body, M.leather, { tex: (_x, y) => ((y - b) % 5 === 0 ? -1 : 0) });
    const fx = p.dir === "down" ? 30 : 30.5;
    for (let k = 0; k < 3; k++) cv.paint(ellipse(fx - 1 + k * 1.2, 18.5 + b - (k % 2), 0.9, 1.6), M.plumeRed, { light: "flat", line: "soft" });
  },
  over(c) {
    const { cv, p } = c;
    const b = p.bob;
    // Correia atravessando o peito.
    if (p.dir === "down") cv.paint(limb([[28.5, 22.5 + b], [19.5, 31.5 + b]], 0.8), M.darkLeather, { light: "flat", line: "soft" });
    if (p.dir === "side") cv.paint(limb([[23, 22.5 + b], [21, 31 + b]], 0.7), M.darkLeather, { light: "flat", line: "soft" });
  },
  cape(c) {
    const { cv, p } = c;
    const b = p.bob;
    const body = limb([[20, 19 + b], [27, 32 + b]], 2.5);
    cv.paint(body, M.leather, { tex: (x, y) => ((x + y) % 6 === 0 ? -1 : 0) });
    cv.paint(band(body, 21 + b, 21 + b), M.darkLeather, { line: "soft", group: "keep" });
    cv.paint(band(body, 28 + b, 28 + b), M.darkLeather, { line: "soft", group: "keep" });
    for (let k = 0; k < 3; k++) cv.paint(ellipse(18.5 + k * 1.3, 17 + b - (k % 2), 0.9, 1.7), M.plumeRed, { light: "flat", line: "soft" });
    // Pontas das flechas (penas) e a correia.
    cv.paint(limb([[19, 23 + b], [28, 30 + b]], 0.6), M.darkLeather, { light: "flat", line: "soft" });
  },
};

/** Faixa de couro na testa do paladino. */
const HEADBAND: Wear = {
  head(c) {
    if (c.helmet?.hair) return;
    const { cv, p } = c;
    const [hx, hy] = p.head;
    const band1 = and(ellipse(hx, hy, 8.4, 7.6), rect(0, hy - 3.5, 47, hy - 2.5));
    const m = p.dir === "side" ? minus(band1, rect(0, 0, 16, 47)) : band1;
    cv.paint(m, M.leather, { light: p.dir === "up" ? "cyl" : "cyl", line: "soft" });
    if (p.dir !== "down") cv.paint(limb([[hx + (p.dir === "side" ? 7 : 1), hy - 3], [hx + (p.dir === "side" ? 9 : 2), hy + 2]], 0.7), M.leather, { light: "flat", line: "soft" });
  },
};

const LEAF_BROOCH: Wear = {
  over(c) {
    const { cv, p } = c;
    if (p.dir === "up") return;
    const x = p.dir === "down" ? 23.5 : 20.5;
    cv.paint(ellipse(x, 23.5 + p.bob, 1.6, 1.2), M.leaf, { light: "sphere" });
    cv.dot(Math.floor(x), 23 + p.bob, M.emerald, 4);
  },
};

const CLASS_LOOKS: Record<ClassId, ClassLook> = {
  knight: {
    skin: M.skinFair, hair: M.hairBrown, brow: M.hairBrown, style: "short",
    shirt: M.knightRed, pants: M.knightGray, trim: M.gold, tunic: "short",
  },
  paladin: {
    skin: M.skinRose, hair: M.hairBlond, brow: M.hairBrown, style: "medium",
    shirt: M.paladinGold, pants: M.paladinBrown, trim: M.darkLeather, tunic: "short",
    extras: { ...QUIVER, head: HEADBAND.head },
  },
  sorcerer: {
    skin: M.skinFair, hair: M.hairWhite, brow: M.hairWhite, style: "long", beard: true,
    shirt: M.sorcPurple, pants: M.sorcDeep, trim: M.gold, tunic: "knee",
    hat: sorcererHat,
  },
  druid: {
    skin: M.skinTan, hair: M.hairAuburn, brow: M.hairAuburn, style: "wild", paint: true,
    shirt: M.druidGreen, pants: M.druidBrown, trim: M.leather, tunic: "knee",
    hat: druidHood, extras: LEAF_BROOCH,
  },
};

/** O que o chapéu ou capuz da classe cobre (quando não há capacete). */
const CLASS_HAT_COVER = { hair: true, face: false, sides: false };

/**
 * Corpo e roupa da classe: `base` vai por baixo de todos os itens; `extras` (aljava, faixa, broche) vai por
 * cima deles, porque é o que identifica a classe.
 */
export function classWear(classId: ClassId): { base: Wear; extras?: Wear } {
  const look = CLASS_LOOKS[classId];
  const base: Wear = {
    leg(c, leg) {
      trouser(c, leg, look.pants, { withPelvis: true });
      shoe(c, leg, M.shoe);
    },
    torso(c) {
      const { cv, p } = c;
      const bottom = look.tunic === "knee" ? 39 + p.bob : p.hip + 1;
      const body = or(p.torso, skirt(p, bottom, look.tunic === "knee" ? 1.5 : 0.5));
      cv.paint(body, look.shirt, { tex: (x) => (look.tunic === "knee" && p.dir !== "side" && x === 24 ? -1 : 0) });
      cv.paint(hem(skirt(p, bottom, look.tunic === "knee" ? 1.5 : 0.5)), look.trim, { line: "none", group: "keep", light: "row", spec: look.trim === M.gold });
      if (p.dir === "down") {
        // Gola em V.
        cv.paint(poly([[21.5, 22 + p.bob], [26, 22 + p.bob], [23.75, 25.5 + p.bob]]), look.skin, { light: "flat", line: "soft" });
      }
      BELT_GOLD(c);
    },
    arm(c, arm) {
      sleeve(c, arm, look.shirt);
      c.cv.paint(hem(arm.fore), look.trim === M.gold ? look.shirt : look.trim, { group: "keep", dark: arm.far ? -2 : -1 });
      paintHand(c, arm, look.skin);
    },
    head(c) {
      headBase(c, look);
      face(c, look);
      const hatCover = !c.helmet && look.hat ? CLASS_HAT_COVER : null;
      const saved = c.helmet;
      if (hatCover) c.helmet = { ...hatCover, sides: classId === "druid" };
      hair(c, look);
      c.helmet = saved;
      beard(c, look);
      if (!c.helmet) look.hat?.(c);
    },
  };
  return { base, extras: look.extras };
}

/** Pele da classe (mãos que aparecem por cima do cabo da arma). */
export const classSkin = (classId: ClassId) => CLASS_LOOKS[classId].skin;
