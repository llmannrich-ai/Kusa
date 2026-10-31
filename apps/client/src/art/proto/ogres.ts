import type { MonsterKind } from "@kusa/shared";
import { makeCanvas } from "../pixels.ts";
import {
  Canvas, F, Mat, chain, lit, ebox, ellipse, fang, fur, grain, inEllipse, inPoly, leather, limb, noise, pbox, poly, sphere, thread,
  type Offset, type ProtoLook, type Pt,
} from "./tibiaHero.ts";

/**
 * Ogros do brejo **desenhados por código** (padrão da arte nova, 128 px por tile), imitando as folhas geradas por IA do
 * Pântano do Kosaradius (`docs/arte/pantano-do-kosaradius/ogre*-A.png`): o Ogro jovem (clava de galho, tranças e
 * pintura de guerra), o Ogro do Brejo (barrigudo, verruguento, maça cravejada, ombreira de chifres e mão vermelha na
 * barriga) e o Ogro Xamã (manto de musgo, barba grisalha, olhos verdes e cajado de caveiras).
 *
 * São a arte desses ogros no Pântano das Ruínas (`MAP_ART` em `bestiary.ts`); no Kosaradius continuam as folhas da IA.
 * Mesmo pincel dos heróis e dos bichos (`tibiaHero.ts`): o desenho é em unidades (1 unidade = `K` px), olhando para a
 * esquerda (o jogo espelha), com os pés a 10 px do fundo do quadro, como as folhas da IA, e o quadro do mesmo tamanho
 * delas: no jogo os dois ficam do mesmo tamanho.
 *
 * Um esqueleto só (quadril, joelho, pé; ombro, cotovelo, mão; cabeça e arma) é posto em pose por clipe; cada ogro troca
 * a pele, o corpo, a cabeça, a roupa e a arma.
 */

export const CODE_OGRES = ["ogreYoung", "ogreBruiser", "ogreShaman"] as const satisfies readonly MonsterKind[];
export type CodeOgre = (typeof CODE_OGRES)[number];

type Clip = "idle" | "walk" | "attack" | "cast";

interface Variant {
  /** Quadro em px (o mesmo da folha da IA). */
  size: number;
  /** Escala do corpo em volta do ponto do chão. */
  scale: number;
  look: ProtoLook;
  /** Barriga (1 = normal). */
  belly: number;
  skin: Offset;
}

/** Músculo: sombras largas e poros claros. */
const muscle: Offset = (X, Y) => (noise(X >> 1, Y >> 1) < 0.04 ? -1 : noise(X, Y) < 0.03 ? 1 : 0);
/** Verrugas: bolinha clara com a sombra embaixo, e manchas escuras. */
const warts: Offset = (X, Y) => {
  if (noise(X >> 1, Y >> 1) < 0.035) return 1;
  if (noise(X >> 1, (Y - 2) >> 1) < 0.035) return -1;
  return noise(X >> 1, Y >> 1) < 0.05 ? -1 : 0;
};

const VARIANTS: Record<CodeOgre, Variant> = {
  ogreYoung: {
    size: 272, scale: 1, belly: 1, skin: muscle,
    look: { skin: "#94703f", skinContrast: 1.35, head: "#4a3222", primary: "#8c3a24", secondary: "#6a3c28", detail: "#a8382a", trim: "#c4924a" },
  },
  ogreBruiser: {
    size: 304, scale: 1.24, belly: 1.3, skin: warts,
    look: { skin: "#80764a", skinContrast: 1.35, head: "#3a2a1e", primary: "#a4561e", secondary: "#5c3424", detail: "#9a2a22", trim: "#b8864a" },
  },
  ogreShaman: {
    size: 288, scale: 1.12, belly: 1.15, skin: warts,
    look: { skin: "#6a7240", skinContrast: 1.35, head: "#a4a094", primary: "#8a2c22", secondary: "#5e3a26", detail: "#a83a2c", trim: "#c8a060" },
  },
};

// --- Pose ----------------------------------------------------------------------------------

/** Pose em unidades, relativa ao ponto do chão (`cx`, `g`); x negativo é para a frente (esquerda). */
interface Pose {
  bob: number;
  lean: number;
  /** Pé de cá e de lá: deslocamento em x e quanto sobe. */
  near: [number, number];
  far: [number, number];
  hand: Pt;
  elbow: Pt;
  farHand: Pt;
  farElbow: Pt;
  /** Ângulo da arma a partir da mão (−π/2 = para cima). */
  aim: number;
  /** Cabeça erguida (rugido) e boca aberta (0–1). */
  tilt: number;
  mouth: number;
  /** Brilho da magia (xamã). */
  glow: number;
}

const UP = -Math.PI / 2;

function pose(kind: CodeOgre, clip: Clip, k: number): Pose {
  const shaman = kind === "ogreShaman";
  const base: Pose = {
    bob: [0, -0.5, -1, -0.5][k], lean: 0, near: [-18, 0], far: [19, 0],
    hand: shaman ? [-30, -46] : [-32, -42], elbow: shaman ? [-22, -56] : [-21, -54],
    farHand: [13, -31], farElbow: [18, -46],
    aim: shaman ? UP - 0.04 : UP - 0.3, tilt: 0, mouth: kind === "ogreBruiser" ? 0.8 : shaman ? 0.6 : 0, glow: 0,
  };
  if (clip === "walk") {
    const p = [1, 0, -1, 0][k];
    return {
      ...base, bob: k % 2 ? -1.6 : 0, near: [-9 - 10 * p, k === 3 ? 4 : 0], far: [12 + 10 * p, k === 1 ? 4 : 0],
      hand: [base.hand[0] + p * 2, base.hand[1]], elbow: [base.elbow[0] + p * 1.5, base.elbow[1]],
      farHand: [13 - p * 4, -31], farElbow: [18 - p * 2, -46],
    };
  }
  if (clip === "attack") {
    const wide: Pick<Pose, "near" | "far"> = { near: [-22, 0], far: [21, 0] };
    if (shaman) {
      // Estocada com o cajado: puxa e enfia a ponta para a frente.
      return ([
        { ...base, ...wide, lean: 2, hand: [-22, -52], elbow: [-12, -58], aim: UP + 0.2 },
        { ...base, ...wide, lean: -2, hand: [-32, -52], elbow: [-22, -58], aim: UP - 0.7, mouth: 0.9 },
        { ...base, ...wide, lean: -6, hand: [-36, -44], elbow: [-24, -52], aim: Math.PI - 0.7, mouth: 1 },
        { ...base, ...wide, lean: -2, hand: [-32, -46], elbow: [-22, -54], aim: UP - 0.4 },
      ] satisfies Pose[])[k];
    }
    // Clava ou maça: ergue por cima da cabeça e desce no chão à frente.
    return ([
      { ...base, ...wide, lean: 3, hand: [-6, -82], elbow: [-14, -70], aim: UP + 0.95, tilt: 1, mouth: 1 },
      { ...base, ...wide, lean: 1, bob: -1, hand: [-18, -82], elbow: [-20, -68], aim: UP - 0.15, tilt: 1, mouth: 1 },
      { ...base, ...wide, lean: -6, bob: 2, hand: [-30, -34], elbow: [-24, -50], aim: Math.PI - 0.95, mouth: 1 },
      { ...base, ...wide, lean: -3, bob: 1, hand: [-32, -38], elbow: [-23, -52], aim: UP - 1.2, mouth: 0.5 },
    ] satisfies Pose[])[k];
  }
  if (clip === "cast") {
    if (kind === "ogreBruiser") {
      // Pisão: ergue a perna de cá e bate no chão.
      return ([
        { ...base, near: [-15, 3], lean: 1, mouth: 1 },
        { ...base, near: [-16, 16], lean: 3, bob: -2, tilt: 1, mouth: 1, farHand: [20, -54], farElbow: [24, -58] },
        { ...base, near: [-20, 0], lean: -4, bob: 2, mouth: 1, farHand: [8, -26], farElbow: [18, -40] },
        { ...base, near: [-18, 0], lean: -1, bob: 1, mouth: 0.9 },
      ] satisfies Pose[])[k];
    }
    if (shaman) {
      // Ergue o cajado e as caveiras acendem.
      return ([
        { ...base, hand: [-30, -56], elbow: [-22, -62], glow: 0.4, mouth: 0.8 },
        { ...base, hand: [-32, -68], elbow: [-22, -70], glow: 1, tilt: 1, mouth: 1, farHand: [2, -62], farElbow: [16, -62] },
        { ...base, hand: [-32, -68], elbow: [-22, -70], glow: 1.3, tilt: 1, mouth: 1, farHand: [0, -64], farElbow: [14, -64] },
        { ...base, hand: [-30, -56], elbow: [-22, -62], glow: 0.5, mouth: 0.8 },
      ] satisfies Pose[])[k];
    }
    // Pancada do jovem: urra, ergue a clava de lado e empurra.
    return ([
      { ...base, tilt: 1, mouth: 1, hand: [-24, -64], elbow: [-14, -66], aim: UP + 0.3 },
      { ...base, tilt: 1, mouth: 1, lean: 2, hand: [-16, -76], elbow: [-10, -70], aim: UP + 0.7, farHand: [6, -58], farElbow: [18, -60] },
      { ...base, near: [-18, 0], far: [18, 0], lean: -6, mouth: 1, hand: [-38, -48], elbow: [-26, -56], aim: Math.PI + 0.2 },
      { ...base, lean: -2, mouth: 0.6, hand: [-32, -42], elbow: [-22, -54], aim: UP - 0.8 },
    ] satisfies Pose[])[k];
  }
  return base;
}

// --- Peças ---------------------------------------------------------------------------------

/** Joelho entre o quadril e o pé (dois ossos), dobrando para a frente. */
function knee(hip: Pt, foot: Pt, a: number, b: number): Pt {
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), a + b - 0.01);
  const ux = dx / d, uy = dy / d;
  const t = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - t * t));
  // Perpendicular (−uy, ux): com a perna para baixo, aponta para a frente (esquerda).
  return [hip[0] + ux * t - uy * h, hip[1] + uy * t + ux * h];
}

/** Troca o material dos pixels das peças `ids` onde `test` (em pixels) aceita, mantendo luz e textura (pintura, tatuagem). */
function tint(c: Canvas, ids: readonly number[], test: (X: number, Y: number) => boolean, to: Mat) {
  for (let Y = 0; Y < c.h; Y++) {
    for (let X = 0; X < c.w; X++) {
      const i = Y * c.w + X;
      if (c.mat[i] >= 0 && c.fixed[i] < 0 && ids.includes(c.part[i]) && test(X, Y)) c.mat[i] = to;
    }
  }
}

/**
 * Faixa (aro, bracelete, atadura): um anel de largura `half` × 2 em volta do eixo `dir` no ponto `at`, com raio `r`.
 * Sem as pontas redondas do `limb`, que fariam o aro virar uma bola.
 */
function band(c: Canvas, at: Pt, dir: Pt, half: number, r: number, mat: Mat, offset?: Offset) {
  const n = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / n, uy = dir[1] / n;
  const e = Math.max(half, r) + 1;
  return c.fill([at[0] - e, at[1] - e, at[0] + e, at[1] + e], (x, y) => {
    const dx = x + 0.5 - at[0], dy = y + 0.5 - at[1];
    return Math.abs(dx * ux + dy * uy) <= half && Math.abs(-dx * uy + dy * ux) <= r;
  }, mat, (x, y) => {
    const dx = x + 0.5 - at[0], dy = y + 0.5 - at[1];
    const d = (-dx * uy + dy * ux) / r;
    const nx = -uy * d, ny = ux * d;
    return lit(nx, ny * 0.6 - 0.15, Math.sqrt(Math.max(0, 1 - d * d)));
  }, offset);
}

/** Caveirinha de enfeite (cinto, cajado), olhando para a esquerda. */
function skull(c: Canvas, at: Pt, r: number, mat = Mat.Bone) {
  const head = ellipse(c, at[0], at[1], r, r * 0.92, mat);
  const jaw = ellipse(c, at[0] - r * 0.15, at[1] + r * 0.85, r * 0.62, r * 0.4, mat, () => -1);
  for (const dx of [-0.45, 0.25]) {
    for (const [ox, oy] of r > 2.6 ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0], [1, 0]]) c.on(head, F(at[0] + dx * r) + ox, F(at[1] + 0.05 * r) + oy, Mat.Soot, 0);
  }
  c.on(head, F(at[0] - 0.1 * r), F(at[1] + 0.5 * r), mat, 0);
  for (let d = -1; d <= 1; d++) c.on(jaw, F(at[0] - r * 0.15) + d * 2, F(at[1] + r * 0.85), mat, 0);
}

/** Espinho de ferro (cravo da maça, chifre da ombreira). */
function spike(c: Canvas, base: Pt, dir: Pt, len: number, half: number, mat = Mat.Iron) {
  const n = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / n, uy = dir[1] / n;
  const pts: Pt[] = [[base[0] - uy * half, base[1] + ux * half], [base[0] + uy * half, base[1] - ux * half], [base[0] + ux * len, base[1] + uy * len]];
  const box = pbox(pts);
  const id = poly(c, pts, mat, box[0], box[2]);
  c.px(F(base[0] + ux * len), F(base[1] + uy * len), mat, 5);
  return id;
}

/** Ponto a `d` unidades da mão na direção da arma. */
const along = (hand: Pt, aim: number, d: number): Pt => [hand[0] + Math.cos(aim) * d, hand[1] + Math.sin(aim) * d];

/** Clava de galho nodoso (jovem): fina no cabo, grossa e cheia de nós na ponta. */
function club(c: Canvas, hand: Pt, aim: number) {
  const pts = [-7, 6, 18, 28, 36].map((d) => along(hand, aim, d));
  chain(c, pts, 2.6, Mat.Wood, grain, 5.8);
  for (const [d, side, r] of [[22, 1, 2.6], [28, -1, 3], [33, 1, 2.8], [38, 0, 3.4], [36, -0.8, 2.6]] as const) {
    const p = along(hand, aim, d);
    const q: Pt = [p[0] - Math.sin(aim) * side * 4.6, p[1] + Math.cos(aim) * side * 4.6];
    ellipse(c, q[0], q[1], r, r, Mat.Wood, grain);
  }
}

/** Maça cravejada (do brejo): cabo de madeira, cabeça com aros de ferro e cravos. */
function mace(c: Canvas, hand: Pt, aim: number) {
  chain(c, [along(hand, aim, -7), along(hand, aim, 16)], 2.4, Mat.Wood, grain, 3.4);
  const a = along(hand, aim, 15), b = along(hand, aim, 34);
  limb(c, a, b, 5, 6.6, Mat.Wood, grain);
  for (const d of [17, 25, 32]) {
    const r = 5.4 + (d - 15) * 0.075;
    band(c, along(hand, aim, d), [Math.cos(aim), Math.sin(aim)], 1, r + 0.4, Mat.Iron, (X, Y) => (noise(X, Y) < 0.2 ? -1 : 0));
  }
  const nx = -Math.sin(aim), ny = Math.cos(aim);
  for (const [d, side] of [[21, 1], [21, -1], [28.5, 1], [28.5, -1], [25, 0.3]] as const) {
    const p = along(hand, aim, d);
    const r = 5.4 + (d - 15) * 0.075;
    spike(c, [p[0] + nx * side * r * 0.9, p[1] + ny * side * r * 0.9], [nx * side + Math.cos(aim) * 0.25, ny * side + Math.sin(aim) * 0.25], 5, 1.5);
  }
  spike(c, along(hand, aim, 34.5), [Math.cos(aim), Math.sin(aim)], 5.4, 1.7);
}

/** Cajado do xamã: galho torto até o chão, com duas caveiras e gravetos no alto e o brilho verde. */
function staff(c: Canvas, hand: Pt, aim: number, glow: number) {
  const pts = [-44, -28, -12, 4, 20, 36, 46].map((d, i) => {
    const p = along(hand, aim, d);
    return [p[0] + (i % 2 ? 0.6 : -0.5), p[1]] as Pt;
  });
  chain(c, pts, 2.2, Mat.Wood, grain, 2.8);
  const top = along(hand, aim, 46);
  for (const [dx, dy, ex, ey] of [[0.5, -1, 3, -6], [0, 0, -4, -4], [1, -2, 5, -2]] as const) {
    thread(c, [top[0] + dx, top[1] + dy], [top[0] + ex, top[1] + ey], Mat.Wood, 1);
  }
  skull(c, [top[0] + 3, top[1] - 1], 4.2);
  skull(c, [top[0] - 3.4, top[1] + 2.4], 3.8);
  // Penduricalhos de musgo caindo das caveiras.
  for (const dx of [-4, -1.6, 3.4]) thread(c, [top[0] + dx, top[1] + 4], [top[0] + dx - 0.4, top[1] + 9], Mat.Moss, (k) => (k % 3 ? 2 : 1));
  if (glow > 0) {
    // Olhos das caveiras acesos e o brilho em volta.
    for (const [dx, dy] of [[1.2, -1], [3, -1], [-3.8, 1.6], [-2, 1.6]] as const) {
      c.px(F(top[0] + dx), F(top[1] + dy), Mat.Venom, 5);
      c.px(F(top[0] + dx) + 1, F(top[1] + dy), Mat.Venom, 5);
    }
    const n = Math.round(6 + glow * 6);
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, r = 5 + glow * 4 + (i % 3) * 1.5;
      const p: Pt = [top[0] + Math.cos(a) * r, top[1] - 1 + Math.sin(a) * r * 0.9];
      const s = 0.5 + (i % 2) * 0.35 * glow;
      const id = ellipse(c, p[0], p[1], s, s, Mat.Venom);
      c.on(id, F(p[0]), F(p[1]), Mat.Venom, 5);
    }
  }
}

/** Pé grande e descalço, com os dedos à frente e uma faixa no tornozelo. */
function foot(c: Canvas, at: Pt, dark: number) {
  const id = c.fill(ebox(at[0] - 2.6, at[1] - 2.2, 6.4, 2.8), (x, y) => inEllipse(at[0] - 2.6, at[1] - 2.2, 6.4, 2.8)(x, y) && y + 0.5 < at[1] + 0.2,
    Mat.Skin, sphere(at[0] - 2, at[1] - 3.4, 7, 4), (X, Y) => dark + (noise(X, Y) < 0.05 ? -1 : 0));
  for (const dx of [-7.4, -5.6, -3.8]) c.on(id, F(at[0] + dx), F(at[1]) - 1, Mat.Skin, 1);
  for (const dx of [-8.2, -6.4, -4.6]) c.on(id, F(at[0] + dx), F(at[1] - 1.4), Mat.Skin, 1);
  return id;
}

// --- Ogro ----------------------------------------------------------------------------------

function ogre(c: Canvas, kind: CodeOgre, p: Pose, cx: number, g: number) {
  const v = VARIANTS[kind];
  const young = kind === "ogreYoung", bruiser = kind === "ogreBruiser", shaman = kind === "ogreShaman";
  const b = p.bob, L = p.lean;
  /** Ponto do corpo: o tronco inclina (`lean`) e respira (`bob`) mais em cima que embaixo. */
  const at = (dx: number, dy: number): Pt => {
    const up = Math.max(0, Math.min(1, (-dy - 30) / 40));
    return [cx + dx + L * up, g + dy + b * up];
  };
  const rel = (q: Pt): Pt => [cx + q[0] + L, g + q[1] + b];
  const skinIds: number[] = [];
  const skin = (dark = 0): Offset => (X, Y) => dark + v.skin(X, Y);
  const W = v.belly;

  // Perna: coxa grossa, joelho para a frente, canela com faixas de couro e o pé.
  const leg = (hipDx: number, f: [number, number], dark: number) => {
    const hip = at(hipDx, -39);
    const ft: Pt = [cx + f[0], g - f[1]];
    const ankle: Pt = [ft[0] + 1, ft[1] - 4];
    const kn = knee(hip, ankle, 21, 19);
    const ids = c.together(() => [
      limb(c, hip, kn, 7.8 * Math.min(W, 1.15), 6.2, Mat.Skin, skin(dark)),
      limb(c, kn, ankle, 6.4, 5, Mat.Skin, skin(dark)),
      ellipse(c, kn[0] - 0.6, kn[1], 5.4, 5, Mat.Skin, skin(dark)),
      ellipse(c, kn[0] + (ankle[0] - kn[0]) * 0.3 + 1.6, kn[1] + (ankle[1] - kn[1]) * 0.3, 5.6, 6, Mat.Skin, skin(dark)),
    ]);
    skinIds.push(...ids);
    c.together(() => [0.5, 0.68, 0.86].map((t) => {
      const q: Pt = [kn[0] + (ankle[0] - kn[0]) * t, kn[1] + (ankle[1] - kn[1]) * t];
      const r = 6.4 + (5 - 6.4) * t + 0.5;
      return band(c, q, [ankle[0] - kn[0] + 2, ankle[1] - kn[1]], 1.1, r, Mat.Secondary, (X, Y) => dark + leather(X, Y));
    }));
    skinIds.push(foot(c, ft, dark));
  };
  // Braço: ombro, cotovelo e mão (o punho vem depois da arma, por cima do cabo), com bracelete.
  const arm = (shoulder: Pt, elbow: Pt, hand: Pt, dark: number) => {
    const ids = c.together(() => [
      limb(c, shoulder, elbow, 7.4, 6, Mat.Skin, skin(dark)),
      limb(c, elbow, hand, 6, 5, Mat.Skin, skin(dark)),
      ellipse(c, shoulder[0], shoulder[1] + 1, 7.8, 7.4, Mat.Skin, skin(dark)),
    ]);
    skinIds.push(...ids);
    const u: Pt = [hand[0] - elbow[0], hand[1] - elbow[1]];
    const n = Math.hypot(u[0], u[1]) || 1;
    const w: Pt = [elbow[0] + u[0] * 0.55, elbow[1] + u[1] * 0.55];
    void n;
    c.together(() => [-1.5, 1.5].map((s) => band(c, [w[0] + (u[0] / n) * s, w[1] + (u[1] / n) * s], u, 1.2, 6.1, Mat.Secondary, (X, Y) => dark + leather(X, Y))));
  };
  const fist = (hand: Pt, dark: number) => {
    const id = ellipse(c, hand[0], hand[1], 5.4, 5, Mat.Skin, skin(dark));
    skinIds.push(id);
    for (const dy of [-2.2, -0.4, 1.4]) thread(c, [hand[0] - 4.6, hand[1] + dy], [hand[0] - 1.6, hand[1] + dy + 0.3], Mat.Skin, 1);
  };

  const sh: Pt = at(-7, -66), farSh: Pt = at(14, -66);

  const beltY = g - 42;
  const rag = (top: number) => (x: number, y: number) => y + 0.5 > top + noise(Math.floor(x * 1.2), 5) * 5;
  // Aba de trás da tanga, por trás das pernas.
  const back: Pt[] = [at(8, -44), at(22, -44), at(24, -22), at(12, -24)];
  poly(c, back, Mat.Primary, back[0][0], back[1][0], (X, Y) => -1 + leather(X, Y), rag(g - 28));

  // De lá: braço e perna, mais escuros.
  arm(farSh, rel(p.farElbow), rel(p.farHand), -1);
  fist(rel(p.farHand), -1);
  leg(12, p.far, -1);

  // Manto de musgo do xamã por trás do corpo.
  if (shaman) {
    const cloak: Pt[] = [at(-10, -76), at(4, -82), at(20, -76), at(27, -56), at(28, -28), at(14, -26), at(4, -38), at(-4, -58)];
    const box = pbox(cloak);
    // Barra e borda de fora em franja: tiras de musgo de comprimentos diferentes.
    const hem = (x: number, y: number) => y + 0.5 > g - 32 + noise(Math.floor(x * 1.6), 7) * 8 || x + 0.5 > box[2] - 3 + noise(9, Math.floor(y * 1.4)) * 4;
    const id = poly(c, cloak, Mat.Moss, box[0], box[2], (X, Y) => ((X >> 1) % 3 === 0 ? -1 : 0) + (noise(X >> 1, Y >> 3) < 0.25 ? -1 : noise(X >> 1, Y >> 3) > 0.85 ? 1 : 0), hem);
    // Tiras de pano vermelho e couro seco no meio do musgo.
    tint(c, [id], (X, Y) => ((X >> 2) % 6 === 0 && noise(X >> 2, 3) < 0.5) || noise(X >> 3, Y >> 3) < 0.07, Mat.Primary);
    for (let i = 0; i < 9; i++) {
      const x = box[0] + 6 + i * 3;
      thread(c, [x, g - 26 + noise(i, 2) * 3], [x - 0.5, g - 20 + noise(i, 5) * 4], Mat.Moss, (k) => (k % 3 ? 1 : 2));
    }
  }

  // Tronco: peito largo, corcunda e barriga numa peça só.
  const chest = at(1, -58), hump = at(8, -67), belly = at(-3, -48);
  const torsoTest = (x: number, y: number) =>
    inEllipse(chest[0], chest[1], 16, 14)(x, y) || inEllipse(hump[0], hump[1], 11, 8)(x, y) || inEllipse(belly[0], belly[1], 12 * W, 10.5 * (0.85 + W * 0.15))(x, y);
  const torso = c.fill([cx - 40, g - 82, cx + 40, g - 30], torsoTest, Mat.Skin, sphere(chest[0] - 4, chest[1] - 2, 19, 18), skin());
  skinIds.push(torso);
  // Peitoral e barriga: linha embaixo do peito e o umbigo; músculos do jovem.
  if (!shaman) thread(c, [chest[0] - 15, chest[1] + 2], [chest[0] - 4, chest[1] + 4.5], Mat.Skin, 1);
  c.on(torso, F(belly[0] - 14 * W * 0.7), F(belly[1] + 3), Mat.Skin, 0);
  // Sombra do peitoral e a linha do flanco.
  thread(c, [chest[0] - 14, chest[1] + 5], [chest[0] - 2, chest[1] + 7.5], Mat.Skin, 0);
  thread(c, [chest[0] + 4, chest[1] - 4], [chest[0] + 6, chest[1] + 9], Mat.Skin, 1);
  if (young) for (const dy of [-3, 1, 5]) thread(c, [belly[0] - 12, belly[1] + dy], [belly[0] - 8, belly[1] + dy + 0.4], Mat.Skin, 1);

  if (bruiser) {
    // Mão vermelha na barriga.
    const hp = at(-9, -50);
    tint(c, [torso], (X, Y) => {
      const x = X / 2 - 0.25, y = Y / 2 - 0.25;
      const palm = inEllipse(hp[0], hp[1], 4.2, 3.8)(x, y);
      const fingers = ([[-3.6, -7.6], [-1, -8.8], [2, -8.4], [4.6, -6.4]] as const).some(([fx, fy]) => {
        const t = Math.max(0, Math.min(1, ((x - hp[0]) * fx + (y - hp[1]) * fy) / (fx * fx + fy * fy)));
        return t > 0.3 && Math.hypot(x - hp[0] - fx * t, y - hp[1] - fy * t) < 1.2;
      });
      const thumb = Math.hypot(x - hp[0] - 5.4, y - hp[1] - 1.4) < 1.5;
      return (palm || fingers || thumb) && noise(X, Y) > 0.15;
    }, Mat.Detail);
  }
  if (young) {
    // Pintura de guerra: listras vermelhas em diagonal pelo peito e pelas costas.
    tint(c, [torso], (X, Y) => {
      const k = ((X * 0.6 + Y) % 34 + 34) % 34;
      return k < 3.2 && noise(X >> 2, Y >> 1) > 0.12;
    }, Mat.Detail);
  }

  // Tanga: aba de trás, perna de cá, aba da frente, cinto de corda com a caveira.

  leg(-8, p.near, 0);

  const front: Pt[] = [[cx - 12 * W, beltY - 1], [cx - 1, beltY - 1], [cx - 3, g - 20], [cx - 11, g - 21]];
  poly(c, front, Mat.Primary, front[0][0], front[1][0], (X, Y) => leather(X, Y) + ((X >> 1) % 5 === 0 ? -1 : 0), rag(g - 26));
  for (let i = 0; i < 6; i++) {
    const x = cx - 10.5 + i * 1.5;
    thread(c, [x, g - 25], [x - 0.6, g - 20 - (i % 3)], bruiser ? Mat.Amber : Mat.Moss, (k) => (k % 2 ? 2 : 3));
  }
  c.fill([cx - 40, beltY - 3, cx + 40, beltY + 3], (x, y) => torsoTest(x, y + 3) && Math.abs(y + 0.5 - beltY) < 2.2, Mat.Linen,
    () => 0.62, (X, Y) => ((X + Y) % 4 === 0 ? -1 : (X + Y) % 4 === 1 ? 1 : 0));
  if (bruiser) {
    skull(c, [cx - 8, beltY + 4], 4.2);
    skull(c, [cx + 2, beltY + 3], 3.4);
    skull(c, [cx - 17, beltY + 3], 3);
  } else {
    // Fivela redonda e a caveira de bicho pendurada.
    const ring = ellipse(c, cx - 8, beltY, 2.6, 2.6, Mat.Trim);
    c.on(ring, F(cx - 8), F(beltY), Mat.Trim, 0);
    skull(c, [cx - 8, beltY + 5.6], young ? 3.4 : 3);
  }
  if (shaman) {
    // Chifre pendurado na cintura.
    chain(c, [[cx + 4, beltY + 1], [cx + 3, beltY + 7], [cx - 1, beltY + 11], [cx - 6, beltY + 11]], 2.4, Mat.Bone, (X, Y) => ((X + Y * 2) % 7 === 0 ? -1 : 0), 0.6);
  }

  // Ombreira (por cima do ombro) de couro (jovem) ou de ferro com chifres (do brejo); a do xamã é o próprio manto.
  if (!shaman) {
    const ps = at(5, -67);
    const pad = c.fill(ebox(ps[0] + 2, ps[1] - 1, 10, 8), (x, y) => inEllipse(ps[0] + 2, ps[1] - 1, 8.6, 6.8)(x, y) && y + 0.5 < ps[1] + 4,
      bruiser ? Mat.Iron : Mat.Secondary, sphere(ps[0], ps[1] - 4, 10, 9), bruiser ? (X, Y) => (noise(X >> 1, Y >> 1) < 0.1 ? -1 : 0) : leather);
    for (const dx of [-5, -1, 3, 7]) c.on(pad, F(ps[0] + 2 + dx), F(ps[1] + 2.6), Mat.Trim, 4);
    thread(c, [ps[0] - 6, ps[1] + 1], [ps[0] + 10, ps[1] + 1], Mat.Secondary, 0);
    if (bruiser) {
      tint(c, [pad], (X, Y) => noise(X >> 2, Y >> 2) < 0.3, Mat.Clay);
      for (const [dx, dy, ex, ey] of [[-5, -5, -1, -1.2], [0, -7.4, 0.2, -1], [5, -6.4, 1, -0.8]] as const) spike(c, [ps[0] + 2 + dx, ps[1] - 1 + dy], [ex, ey], 6, 1.7, Mat.Bone);
    }
  }

  // Cabeça: crânio, testa pesada, queixo largo para a frente com presas, orelha pontuda para trás.
  const hx = cx - 17 + L * 1.2 + p.tilt * 1.5, hy = g - 72 + b - p.tilt * 2.5;
  const head = c.together(() => {
    const cran = ellipse(c, hx, hy, 9.4, 9, Mat.Skin, skin());
    poly(c, [[hx + 5, hy - 1.6], [hx + 14.6, hy - 8], [hx + 8.4, hy + 3]], Mat.Skin, hx + 5, hx + 14.6, skin(-1));
    ellipse(c, hx - 3.4, hy + 5 + p.mouth * 1.6, 7.4, 4.8, Mat.Skin, skin());
    ellipse(c, hx - 7.6, hy + 0.4, 2.6, 2.2, Mat.Skin, skin());
    ellipse(c, hx - 4.6, hy - 3, 5.8, 2.4, Mat.Skin, skin());
    // Pescoço grosso ligando a cabeça ao tronco.
    limb(c, [hx + 2, hy + 4], at(-2, -64), 6.4, 8, Mat.Skin, skin());
    return cran;
  });
  skinIds.push(head);
  // Sombra da testa sobre o olho.
  thread(c, [hx - 9.6, hy - 1.4], [hx - 1.4, hy - 1.8], Mat.Skin, 0);
  if (p.mouth > 0.3) {
    const mo = c.fill(ebox(hx - 6, hy + 4, 4, 2 * p.mouth + 0.8), inEllipse(hx - 6, hy + 4, 4, 2 * p.mouth + 0.8), Mat.Blood, () => 0.15);
    for (const dx of [-8.6, -7, -5.4, -3.8]) c.on(mo, F(hx + dx), F(hy + 4 - 2 * p.mouth), Mat.White, 4);
  } else {
    thread(c, [hx - 10, hy + 4], [hx - 2, hy + 4.8], Mat.Skin, 0);
  }
  fang(c, [hx - 8.6, hy + 4.6 + p.mouth * 1.6], 0.9, 3, -1);
  fang(c, [hx - 4, hy + 4.9 + p.mouth * 1.6], 0.7, 2.2, -1);
  // Olho fundo debaixo da testa.
  const eyeMat = shaman ? Mat.Venom : young ? Mat.Ember : Mat.Amber;
  for (const d of [0, 1]) c.on(head, F(hx - 6.2) + d, F(hy), eyeMat, shaman ? 5 : 4);
  c.on(head, F(hx - 6.2) + 2, F(hy), Mat.Eye, 0);
  if (young) {
    // Listra de pintura no rosto e tranças caindo para trás.
    tint(c, [head], (X, Y) => Math.abs(Y / 2 - (hy + 0.6) + (X / 2 - hx) * 0.25) < 1 && X / 2 < hx + 3, Mat.Detail);
    // Tranças: do alto e da nuca, caindo pelas costas até o ombro.
    for (let i = 0; i < 10; i++) {
      const a = -1.75 + i * 0.22;
      const s0: Pt = [hx + 1.6 + Math.cos(a) * 8, hy - 0.6 + Math.sin(a) * 8];
      const len = 10 + (i % 3) * 3 + i * 0.6;
      chain(c, [s0, [s0[0] + 3 + i * 0.2, s0[1] + 1.4], [s0[0] + 4.4 + i * 0.3, s0[1] + len * 0.6], [s0[0] + 5 + i * 0.3, s0[1] + len]],
        1.3, Mat.Hair, (X, Y) => ((Y >> 1) % 3 === 0 ? -1 : (Y >> 1) % 3 === 1 ? 1 : 0), 0.9);
    }
  }
  if (bruiser) {
    // Testa franzida e verrugas grandes.
    for (const [dx, dy] of [[-1, -5], [2, -6], [4, 0], [-2, 7]] as const) c.on(head, F(hx + dx), F(hy + dy), Mat.Skin, 4);
  }
  if (shaman) {
    // Cabelo grisalho comprido caindo pelas costas e a barba no queixo.
    for (let i = 0; i < 12; i++) {
      const a = -1.9 + i * 0.2;
      const s0: Pt = [hx + 1 + Math.cos(a) * 8.4, hy - 0.8 + Math.sin(a) * 8.4];
      const len = 14 + (i % 3) * 3 + i * 0.5;
      chain(c, [s0, [s0[0] + 3 + i * 0.2, s0[1] + 1.4], [s0[0] + 4.6 + i * 0.25, s0[1] + len * 0.6], [s0[0] + 5 + i * 0.3, s0[1] + len]],
        1.4, Mat.Hair, (X, Y) => ((X >> 1) % 3 === 0 ? -1 : noise(X, Y >> 2) < 0.15 ? 1 : 0), 0.8);
    }
    c.together(() => [-1, 0.6, 2.2].map((dx, i) => chain(c, [[hx - 6 + dx, hy + 6], [hx - 6.6 + dx, hy + 12], [hx - 5.4 + dx, hy + 18 - i]], 1.8, Mat.Hair,
      (X, Y) => ((X >> 1) % 2 === 0 ? -1 : noise(X, Y >> 2) < 0.2 ? 1 : 0), 0.9)));
    // Colar de ossos.
    for (let i = 0; i < 7; i++) {
      const q = at(-16 + i * 3, -60 + Math.abs(i - 3) * 1.1);
      limb(c, q, [q[0] - 0.3, q[1] + 3], 1, 0.7, Mat.Bone);
    }
  }

  // Correia atravessada no peito.
  if (!shaman) {
    const strap: Pt[] = [[sh[0] + 6, sh[1] - 4], [sh[0] + 10, sh[1] - 1], [cx - 10, beltY - 1], [cx - 15, beltY - 4]];
    c.fill(pbox(strap), (x, y) => inPoly(strap)(x, y) && torsoTest(x, y), bruiser ? Mat.Iron : Mat.Secondary, sphere(chest[0] - 3, chest[1] - 3, 24, 22),
      bruiser ? (X, Y) => (((X + Y) >> 1) % 2 === 0 ? -1 : 1) : leather);
  }

  // De cá: braço, arma e punho por cima do cabo.
  const hand = rel(p.hand);
  arm(sh, rel(p.elbow), hand, 0);
  if (young) club(c, hand, p.aim);
  else if (bruiser) mace(c, hand, p.aim);
  else staff(c, hand, p.aim, p.glow);
  fist(hand, 0);

  // Pintura de guerra nos braços e pernas do jovem.
  if (young) {
    tint(c, skinIds.filter((id) => id !== head && id !== torso), (X, Y) => {
      const k = ((X * 0.5 + Y) % 26 + 26) % 26;
      return k < 2.6 && noise(X >> 2, Y >> 1) > 0.2;
    }, Mat.Detail);
  }
}

// --- Quadros -------------------------------------------------------------------------------

function render(kind: CodeOgre, clip: Clip, k: number) {
  const v = VARIANTS[kind];
  const s = v.size, u = s / 2;
  const cx = Math.round(u * 0.48), g = u - 5;
  const c = new Canvas(s, s);
  c.scaled([cx, g], v.scale, () => ogre(c, kind, pose(kind, clip, k), cx, g));
  const { canvas, ctx } = makeCanvas(s, s);
  const image = ctx.createImageData(s, s);
  image.data.set(c.render(v.look, true, 1.35));
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export const codeOgreSize = (kind: CodeOgre) => VARIANTS[kind].size;

/** Parte de cima do quadro que o corpo ocupa (a barra de vida fica logo acima da cabeça). */
export function codeOgreFill(kind: CodeOgre) {
  const v = VARIANTS[kind];
  // Alto da cabeça: ~68 unidades acima do chão, na escala do ogro.
  const top = v.size / 2 - 5 - 68 * v.scale;
  return 1 - (top * 2) / v.size;
}

/** Os 16 quadros (parado, andar, golpe e magia, 4 cada), um por chamada; o parado repete o 2º no 4º. */
export function codeOgreFrames(kind: CodeOgre): (() => HTMLCanvasElement)[] {
  const memo = new Map<string, HTMLCanvasElement>();
  return (["idle", "walk", "attack", "cast"] as const).flatMap((clip) => [0, 1, 2, 3].map((k) => () => {
    const kk = clip === "idle" && k === 3 ? 1 : k;
    const key = `${clip}${kk}`;
    if (!memo.has(key)) memo.set(key, render(kind, clip, kk));
    return memo.get(key)!;
  }));
}

/** Folha inteira de uma vez (galeria). */
export function codeOgreSheet(kind: CodeOgre) {
  const s = VARIANTS[kind].size;
  const { canvas, ctx } = makeCanvas(s * 16, s);
  codeOgreFrames(kind).forEach((draw, i) => ctx.drawImage(draw(), i * s, 0));
  return canvas;
}

export const codeOgrePortrait = (kind: CodeOgre) => render(kind, "idle", 0);
