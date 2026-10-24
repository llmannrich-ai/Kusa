import { Sheet, makeCanvas } from "./pixels.ts";
import {
  CLIP_ORDER, CLIPS, FRAME_COUNT, add, blitMirrored, capsule, dir, drawArm, drawHead, drawLeg, drawTorso, ellipse, joints, poly, posed, shade,
  stroke, weaponAngle, type Build, type Clip, type Grip, type HeadStyle, type Joints, type Pal, type Pose, type Pt,
} from "./rig.ts";

/**
 * O clã do brejo (Pântano) em arte própria e animada: orcs (32 px) e ogros (40 e 48 px), montados no esqueleto de
 * `rig.ts`. Cada monstro é uma folha com os quadros de `CLIP_ORDER` (parado, andando, golpe, especial), olhando para
 * a esquerda. As classes se distinguem de longe pela silhueta: lança comprida, arco, cajado com caveira, dois
 * machados, estandarte, barriga de ogro.
 */

export const MARSH_MONSTER_OUTLINE = "#140d07";

// --- Paletas ------------------------------------------------------------------------

const ORC: Pal = ["#a9c968", "#86a84c", "#668838", "#4a6829", "#2d4319"];
const ORC_OLIVE: Pal = ["#b3b67e", "#929863", "#73794b", "#565b37", "#363a23"];
const OGRE: Pal = ["#e8c896", "#cba873", "#a98653", "#81633b", "#523d24"];
const OGRE_GRAY: Pal = ["#c4b9a2", "#a39882", "#827763", "#625947", "#3d372c"];
const LEATHER: Pal = ["#b98a54", "#94693b", "#714e2a", "#53381b", "#33210f"];
const DARK_LEATHER: Pal = ["#8a6a48", "#6a4f33", "#4e3923", "#372716", "#21170c"];
const RED_CLOTH: Pal = ["#d8604f", "#b4402f", "#8c2e22", "#661f17", "#3e120d"];
const METAL: Pal = ["#eef0f2", "#c0c5cc", "#8f969f", "#626870", "#373b40"];
const RUSTY: Pal = ["#c8a27c", "#a17a5a", "#7c5b43", "#5a4030", "#37271c"];
const WOOD: Pal = ["#c99f66", "#a07848", "#7b5833", "#5a3f23", "#3a2814"];
const BONE: Pal = ["#fff7e2", "#eadfbf", "#c9ba90", "#9d8d67", "#6a5e42"];
const FUR: Pal = ["#a58f6c", "#836e50", "#655239", "#493a27", "#2d2418"];
const DARK_FUR: Pal = ["#7a6a52", "#5d4f3b", "#45392a", "#30271c", "#1d1710"];
const STONE: Pal = ["#b6b2a6", "#928e83", "#706c63", "#524f48", "#33312d"];
const HAIR = "#1d1812";

const ORC_HEAD: HeadStyle = { eye: "#ffd23a", tusk: "#fff4d6", brow: "#22301a", ear: "pointed" };
const OGRE_HEAD: HeadStyle = { eye: "#ffef9a", tusk: "#fff4d6", brow: "#4a3420", ear: "round", bigTusk: true };

const ORC_BUILD: Build = {
  skin: ORC, thigh: 5, shin: 5, thighR: 2.1, shinR: 1.7, foot: 2.2, torso: 7, chestRx: 4.4, chestRy: 4.3,
  upperArm: 4.6, foreArm: 4.2, armR: 1.8, foreR: 1.6, handR: 1.45, head: { rx: 3.2, ry: 3.1, neck: 2.2, dx: 1.3 }, hunch: 0.9,
};
const OGRE_BUILD: Build = {
  skin: OGRE, thigh: 4.8, shin: 4.2, thighR: 2.7, shinR: 2.3, foot: 2.6, torso: 7.2, chestRx: 5.2, chestRy: 4.8,
  belly: { rx: 5.1, ry: 4.6, dx: 2.4, dy: 3.4, pal: ["#f2d6aa", "#dbb889", "#bc9767", "#93714a", "#5e472c"] },
  upperArm: 5, foreArm: 4.6, armR: 2.3, foreR: 2.1, handR: 1.9, head: { rx: 3.3, ry: 3.1, neck: 1.1, dx: 3.4 }, hunch: 1.6,
};

// --- Armas --------------------------------------------------------------------------

/** Machadinha: cabo de madeira e lâmina em meia-lua na ponta. */
function axe(s: Sheet, hand: Pt, a: number, u: number, size = 1) {
  const d = dir(a);
  const base = add(hand, d, -1.4 * u);
  const tip = add(hand, d, 6.2 * u * size);
  capsule(s, base, tip, 0.6 * u, 0.55 * u, WOOD, { edge: 0.4 });
  const n = { x: d.y, y: -d.x }; // lado de fora da lâmina
  const b0 = add(tip, d, -2.6 * u * size);
  poly(s, [add(b0, n, 0.4 * u), add(add(b0, n, 2.8 * u * size), d, -0.6 * u), add(add(tip, n, 3.1 * u * size), d, 0.8 * u), add(tip, n, 0.4 * u)],
    (x, y) => ((x + y) % 4 === 0 ? METAL[0] : METAL[2]));
  stroke(s, add(add(b0, n, 2.9 * u * size), d, -0.5 * u), add(add(tip, n, 3.2 * u * size), d, 0.8 * u), METAL[0]);
}

/** Faca curta de osso. */
function knife(s: Sheet, hand: Pt, a: number, u: number) {
  const d = dir(a);
  stroke(s, add(hand, d, -0.8 * u), add(hand, d, 1 * u), DARK_LEATHER[2]);
  poly(s, [add(hand, { x: d.y, y: -d.x }, 0.6 * u), add(hand, d, 4.2 * u), add(hand, { x: -d.y, y: d.x }, 0.4 * u)], () => BONE[1]);
}

/** Lança de pau de mangue com ponta de pedra lascada e um tufo de penas. */
function spear(s: Sheet, hand: Pt, a: number, u: number) {
  const d = dir(a);
  const back = add(hand, d, -7 * u);
  const tip = add(hand, d, 10 * u);
  capsule(s, back, tip, 0.5 * u, 0.5 * u, WOOD, { edge: 0.3 });
  const n = { x: d.y, y: -d.x };
  poly(s, [add(tip, n, 1 * u), add(tip, d, 3.4 * u), add(tip, n, -1 * u)], (x, y) => ((x * 3 + y) % 5 ? STONE[2] : STONE[0]));
  stroke(s, add(tip, n, 0.3 * u), add(add(tip, d, -1.4 * u), n, 1.6 * u), RED_CLOTH[1]);
}

/** Porrete: tronco que engrossa na ponta, com pregos (`spikes`) ou cintas de ferro. */
function club(s: Sheet, hand: Pt, a: number, u: number, len: number, r0: number, r1: number, spikes = 0, pal: Pal = WOOD) {
  const d = dir(a);
  const base = add(hand, d, -1.6 * u);
  const tip = add(hand, d, len * u);
  capsule(s, base, tip, r0 * u, r1 * u, pal);
  const n = { x: d.y, y: -d.x };
  for (let k = 0; k < spikes; k++) {
    const t = 0.55 + (k / Math.max(1, spikes)) * 0.45;
    const at = add(base, d, (len + 1.6) * u * t);
    const side = k % 2 ? 1 : -1;
    const r = (r0 + (r1 - r0) * t) * u;
    stroke(s, add(at, n, side * r * 0.8), add(at, n, side * (r + 1.3 * u)), METAL[k % 3 === 0 ? 0 : 2]);
  }
}

/** Arco curto de osso, preso pela mão de trás; a corda vai até a mão de perto quando ela puxa. */
function bow(s: Sheet, grip: Pt, a: number, u: number, draw: Pt | null) {
  const d = dir(a);
  const n = { x: d.y, y: -d.x };
  const top = add(add(grip, n, 5.6 * u), d, -1.4 * u);
  const bottom = add(add(grip, n, -5.6 * u), d, -1.4 * u);
  for (let k = 0; k <= 20; k++) {
    const t = k / 20 - 0.5;
    const p = add(add(grip, n, t * 11 * u), d, (1 - 4 * t * t) * 1.2 * u);
    s.set(p.x, p.y, k % 5 === 0 ? BONE[3] : BONE[1]);
    s.set(p.x + d.x, p.y + d.y, BONE[2]);
  }
  const string = draw ?? add(grip, d, -1.4 * u);
  stroke(s, top, string, "#e8e0c8");
  stroke(s, string, bottom, "#e8e0c8");
  if (draw) stroke(s, add(draw, d, -1 * u), add(grip, d, 2.5 * u), WOOD[1]);
}

/** Cajado com caveira de bicho no alto, penas e contas. */
function staff(s: Sheet, hand: Pt, a: number, u: number, big = 1) {
  const d = dir(a);
  const foot = add(hand, d, -7 * u * big);
  const top = add(hand, d, 9 * u * big);
  capsule(s, foot, top, 0.55 * u * big, 0.7 * u * big, DARK_LEATHER, { edge: 0.3 });
  const skull = add(top, d, 1.4 * u * big);
  ellipse(s, skull, 2.1 * u * big, 1.8 * u * big, 0.3, BONE);
  s.set(skull.x + 0.6 * u * big, skull.y - 0.2 * u, "#1a120a");
  s.set(skull.x - 0.8 * u * big, skull.y - 0.2 * u, "#1a120a");
  stroke(s, add(skull, { x: -1.4 * u * big, y: 1.4 * u * big }), add(skull, { x: 1.2 * u * big, y: 1.6 * u * big }), BONE[3]);
  // Chifres pequenos e penas penduradas.
  stroke(s, add(skull, { x: -1.6 * u * big, y: -1 * u * big }), add(skull, { x: -2.8 * u * big, y: -2.6 * u * big }), BONE[2]);
  stroke(s, add(skull, { x: 1.4 * u * big, y: -1 * u * big }), add(skull, { x: 2.6 * u * big, y: -2.6 * u * big }), BONE[2]);
  for (const [dx, c] of [[-1.2, RED_CLOTH[1]], [1.2, "#2f5c7a"], [0, "#e0c040"]] as const) {
    stroke(s, add(top, { x: dx * u * big, y: -0.5 * u }), add(top, { x: dx * u * big * 1.3, y: 3 * u * big }), c);
  }
}

/** Cutelo de duas mãos (Chefe de Guerra): lâmina larga e reta, ponta cortada, com rebites. */
function cleaver(s: Sheet, hand: Pt, a: number, u: number) {
  const d = dir(a);
  const n = { x: d.y, y: -d.x };
  const base = add(hand, d, -2.2 * u);
  const guard = add(hand, d, 1.2 * u);
  capsule(s, base, guard, 0.7 * u, 0.7 * u, DARK_LEATHER, { edge: 0.3 });
  stroke(s, add(guard, n, -1.6 * u), add(guard, n, 1.8 * u), METAL[3]);
  const end = add(guard, d, 9 * u);
  poly(s, [add(guard, n, -0.6 * u), add(guard, n, 2.6 * u), add(end, n, 3.4 * u), add(add(end, d, 0.8 * u), n, 0.6 * u), add(end, n, -0.6 * u)],
    (x, y) => {
      const e = ((x - guard.x) * n.x + (y - guard.y) * n.y) / u;
      return e > 2.6 ? METAL[0] : e > 1.8 ? METAL[1] : e < 0 ? METAL[4] : (x + y) % 7 === 0 ? METAL[3] : METAL[2];
    });
  for (const t of [2, 5, 8]) s.set(add(add(guard, d, t * u), n, 0.6 * u).x, add(add(guard, d, t * u), n, 0.6 * u).y, METAL[0]);
}

/** Escudo redondo de tábuas com cravo de ferro no meio. */
function shield(s: Sheet, hand: Pt, u: number) {
  const c = add(hand, { x: 0.6 * u, y: 0.6 * u });
  ellipse(s, c, 2 * u, 3.3 * u, 0, WOOD);
  for (let y = Math.floor(c.y - 3.3 * u); y <= c.y + 3.3 * u; y++) if ((y + 1) % 3 === 0) for (let x = Math.floor(c.x - 1.6 * u); x <= c.x + 1.6 * u; x++) {
    if (s.get(x, y)) s.set(x, y, WOOD[3]);
  }
  ellipse(s, c, 1 * u, 1.2 * u, 0, METAL);
}

// --- Roupas e enfeites ------------------------------------------------------------------

/** Cinto no quadril com tanga caindo na frente. */
function loincloth(s: Sheet, j: Joints, pal: Pal, belt: Pal = DARK_LEATHER, long = 1) {
  const u = j.u;
  const h = j.hip;
  capsule(s, add(h, { x: -3.6 * u, y: -0.8 * u }), add(h, { x: 3.4 * u, y: -1.2 * u }), 1 * u, 1 * u, belt, { flat: 0.4 });
  const front = add(h, { x: 1.4 * u, y: 0 });
  poly(s, [add(front, { x: -1.6 * u, y: -0.6 * u }), add(front, { x: 2.1 * u, y: -0.8 * u }), add(front, { x: 2.6 * u, y: 4.6 * u * long }), add(front, { x: -1 * u, y: 4.2 * u * long })],
    (x, y) => (y > front.y + 4 * u * long ? pal[3] : (x + y) % 5 === 0 ? pal[3] : x > front.x + 1.2 * u ? pal[1] : pal[2]));
}

/** Colete de couro sobre o peito (deixa os ombros de fora). */
function vest(s: Sheet, j: Joints, pal: Pal) {
  const u = j.u;
  ellipse(s, add(j.chestC, { x: 0.3 * u, y: 0.8 * u }), 3.9 * u, 3.4 * u, j.lean, pal, { clip: (_, y) => y > j.shoulder.y + 0.8 * u });
  stroke(s, add(j.chestC, { x: 1.2 * u, y: -1.4 * u }), add(j.chestC, { x: 1.7 * u, y: 3 * u }), pal[4]);
}

/** Ombreira de placa (de perto). */
function pauldron(s: Sheet, j: Joints, pal: Pal, big = 1) {
  const u = j.u;
  ellipse(s, add(j.arms[0].shoulder, { x: 0, y: -0.2 * u }), 2.4 * u * big, 1.9 * u * big, -0.3, pal);
  stroke(s, add(j.arms[0].shoulder, { x: -1.8 * u * big, y: 0.6 * u }), add(j.arms[0].shoulder, { x: 1.8 * u * big, y: 0.2 * u }), pal[4]);
}

/** Elmo: calota de ferro sobre o alto da cabeça, com aba; `horns` põe chifres curvos. */
function helmet(s: Sheet, j: Joints, b: Build, pal: Pal, horns = false) {
  const u = j.u;
  const c = j.headC;
  ellipse(s, add(c, { x: -0.1 * u, y: -0.35 * b.head.ry * u }), b.head.rx * 1.08 * u, b.head.ry * 0.8 * u, 0.1, pal, { clip: (_, y) => y < c.y - 0.05 * b.head.ry * u });
  stroke(s, add(c, { x: -b.head.rx * 1.1 * u, y: -0.1 * b.head.ry * u }), add(c, { x: b.head.rx * 1.05 * u, y: -0.15 * b.head.ry * u }), pal[3]);
  if (horns) {
    for (const side of [-1, 1]) {
      let p = add(c, { x: side * 1.6 * u, y: -b.head.ry * 0.8 * u });
      for (let k = 0; k < 6; k++) {
        const q = add(p, { x: side * 0.6 * u, y: (-0.7 + k * 0.16) * u });
        capsule(s, p, q, (0.75 - k * 0.1) * u, (0.65 - k * 0.1) * u, BONE, { edge: 0.3 });
        p = q;
      }
    }
  }
}

/** Faixa na testa. */
function headband(s: Sheet, j: Joints, b: Build, color: string) {
  const u = j.u;
  const c = j.headC;
  stroke(s, add(c, { x: -b.head.rx * 0.95 * u, y: -0.45 * b.head.ry * u }), add(c, { x: b.head.rx * 0.9 * u, y: -0.5 * b.head.ry * u }), color);
  stroke(s, add(c, { x: -b.head.rx * 0.95 * u, y: -0.45 * b.head.ry * u }), add(c, { x: -b.head.rx * 1.6 * u, y: 0.4 * b.head.ry * u }), color);
}

/** Crista de cabelo (moicano) ou coque. */
function mohawk(s: Sheet, j: Joints, b: Build, color: string, tall = 1) {
  const u = j.u;
  const c = j.headC;
  for (let k = -2; k <= 3; k++) {
    const base = add(c, { x: k * 0.55 * u, y: -b.head.ry * 0.85 * u });
    stroke(s, base, add(base, { x: -0.7 * u, y: -(1.8 - Math.abs(k - 0.5) * 0.25) * u * tall }), color);
  }
}

function topknot(s: Sheet, j: Joints, b: Build) {
  const u = j.u;
  const c = add(j.headC, { x: -0.6 * u, y: -b.head.ry * 1.05 * u });
  ellipse(s, c, 1.1 * u, 1 * u, 0, ["#3a3024", "#2a2219", HAIR, HAIR, "#0e0b08"]);
  stroke(s, c, add(c, { x: -1.6 * u, y: 1.8 * u }), HAIR);
}

/** Capuz de pano escuro (arqueiro). */
function hood(s: Sheet, j: Joints, b: Build, pal: Pal) {
  const u = j.u;
  const c = j.headC;
  ellipse(s, add(c, { x: -0.5 * u, y: -0.3 * u }), b.head.rx * 1.15 * u, b.head.ry * 1.05 * u, 0.15, pal, { clip: (x, y) => y < c.y + 0.2 * b.head.ry * u || x < c.x - 0.4 * b.head.rx * u });
  // Rosto à mostra na frente.
  ellipse(s, add(c, { x: 0.55 * u, y: 0.2 * u }), b.head.rx * 0.62 * u, b.head.ry * 0.7 * u, 0, b.skin);
}

/** Máscara de caveira de sapo com penas (xamã). */
function skullMask(s: Sheet, j: Joints, b: Build) {
  const u = j.u;
  const c = add(j.headC, { x: 0.1 * u, y: -b.head.ry * 0.85 * u });
  ellipse(s, c, b.head.rx * 0.95 * u, b.head.ry * 0.55 * u, 0.1, BONE);
  s.set(c.x + 0.8 * u, c.y + 0.1 * u, "#1a120a");
  s.set(c.x - 0.6 * u, c.y + 0.1 * u, "#1a120a");
  for (const [dx, col] of [[-1.6, RED_CLOTH[1]], [-0.6, "#e0c040"], [0.5, "#2f5c7a"]] as const) {
    stroke(s, add(c, { x: dx * u, y: -0.8 * u }), add(c, { x: (dx - 1.2) * u, y: -4 * u }), col);
  }
}

/** Colar de dentes e ossinhos. */
function necklace(s: Sheet, j: Joints, n = 5) {
  const u = j.u;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1) - 0.5;
    const p = add(j.neck, { x: t * 3.6 * u + 0.6 * u, y: (1.2 + (1 - 4 * t * t) * 0.9) * u });
    s.set(p.x, p.y, k % 2 ? BONE[0] : BONE[2]);
    s.set(p.x, p.y + 1, BONE[3]);
  }
}

/** Listras de pintura de guerra no peito e no braço. */
function warPaint(s: Sheet, j: Joints, color: string) {
  const u = j.u;
  for (const k of [-1.2, 0.2, 1.6]) stroke(s, add(j.chestC, { x: (k - 0.5) * u, y: -1.8 * u }), add(j.chestC, { x: (k + 1.1) * u, y: 1.4 * u }), color);
}

/** Aljava nas costas com as penas das flechas para fora. */
function quiver(s: Sheet, j: Joints) {
  const u = j.u;
  const top = add(j.shoulder, { x: -2.4 * u, y: -1.6 * u });
  const bottom = add(j.hip, { x: -3 * u, y: -1.4 * u });
  capsule(s, top, bottom, 1.2 * u, 1.1 * u, LEATHER, { flat: 0.3 });
  for (let k = 0; k < 3; k++) stroke(s, add(top, { x: (k - 1) * 0.8 * u, y: 0 }), add(top, { x: (k - 1.5) * 0.9 * u, y: -2.2 * u }), k % 2 ? "#e8e0c8" : RED_CLOTH[1]);
}

/** Estandarte do capitão: mastro nas costas com um pano de caveira. */
function banner(s: Sheet, j: Joints) {
  const u = j.u;
  const foot = add(j.hip, { x: -2.6 * u, y: 1 * u });
  const top = add(foot, { x: -1.4 * u, y: -18 * u });
  stroke(s, foot, top, WOOD[3]);
  stroke(s, add(foot, { x: 1, y: 0 }), add(top, { x: 1, y: 0 }), WOOD[2]);
  const cloth = [add(top, { x: 0, y: 0.6 * u }), add(top, { x: -5.4 * u, y: 0.2 * u }), add(top, { x: -5 * u, y: 6.8 * u }), add(top, { x: -2.6 * u, y: 5.6 * u }), add(top, { x: 0.2 * u, y: 6.4 * u })];
  poly(s, cloth, (x, y) => ((x + 2 * y) % 9 === 0 ? RED_CLOTH[3] : x < top.x - 4 * u ? RED_CLOTH[3] : RED_CLOTH[1]));
  const sk = add(top, { x: -2.6 * u, y: 2.8 * u });
  ellipse(s, sk, 1.2 * u, 1.1 * u, 0, BONE, { edge: 0.3 });
  s.set(sk.x - 0.4 * u, sk.y, "#1a120a");
  s.set(sk.x + 0.4 * u, sk.y, "#1a120a");
}

/** Manto de pele sobre os ombros (ogros). */
function furMantle(s: Sheet, j: Joints, pal: Pal, big = 1) {
  const u = j.u;
  const c = add(j.shoulder, { x: -1.2 * u, y: 0.6 * u });
  ellipse(s, c, 4.6 * u * big, 2.6 * u * big, j.lean - 0.15, pal);
  for (let k = 0; k < 9; k++) {
    const p = add(c, { x: (k - 4) * 1 * u * big, y: 2 * u * big });
    stroke(s, p, add(p, { x: -0.4 * u, y: (1 + (k % 3)) * 0.8 * u * big }), pal[k % 2 ? 3 : 2]);
  }
}

// --- Espécies -------------------------------------------------------------------------

interface Gear {
  /** Atrás de tudo (estandarte, aljava, manto). */
  back?: (s: Sheet, j: Joints) => void;
  /** Na mão de trás, depois do braço de trás (escudo, arco, segundo machado). */
  far?: (s: Sheet, j: Joints, clip: Clip, frame: number) => void;
  /** Sobre o tronco (roupa, pintura, colar). */
  body?: (s: Sheet, j: Joints) => void;
  /** Sobre a cabeça. */
  head?: (s: Sheet, j: Joints, b: Build) => void;
  /** Sobre as pernas (tanga). */
  legs?: (s: Sheet, j: Joints) => void;
  /** Arma da mão de perto (antes do braço, para a mão ficar por cima do cabo). */
  weapon?: (s: Sheet, j: Joints, a: number, clip: Clip, frame: number) => void;
  /** Por cima de tudo (ombreira). */
  front?: (s: Sheet, j: Joints) => void;
}

export interface Species {
  /** Lado do quadro (px da arte). */
  size: number;
  build: Build;
  grip: Grip;
  /** 0 = ágil, 1 = pesado (o andar dos ogros). */
  weight: number;
  castStyle: "roar" | "raise";
  head: HeadStyle;
  feet: Pal;
  gear: Gear;
  /** Velocidade dos clipes (quadros por segundo). */
  fps?: Partial<Record<Clip, number>>;
}

const withSkin = (b: Build, skin: Pal): Build => ({ ...b, skin });

export const MARSH_SPECIES = {
  orcScout: {
    size: 32, build: { ...ORC_BUILD, chestRx: 3.9, chestRy: 3.8, thighR: 1.8, shinR: 1.5, armR: 1.5, foreR: 1.35 }, grip: "oneHand", weight: 0,
    castStyle: "roar", head: ORC_HEAD, feet: ORC,
    gear: {
      legs: (s, j) => loincloth(s, j, LEATHER, DARK_LEATHER, 0.8),
      head: (s, j, b) => { headband(s, j, b, RED_CLOTH[1]); topknot(s, j, b); },
      weapon: (s, j, a) => knife(s, j.arms[0].hand, a, j.u),
    },
  },
  orcGrunt: {
    size: 32, build: ORC_BUILD, grip: "oneHand", weight: 0.15, castStyle: "roar", head: ORC_HEAD, feet: DARK_LEATHER,
    gear: {
      far: (s, j) => shield(s, j.arms[1].hand, j.u),
      body: (s, j) => vest(s, j, LEATHER),
      legs: (s, j) => loincloth(s, j, DARK_LEATHER),
      head: (s, j, b) => topknot(s, j, b),
      weapon: (s, j, a) => axe(s, j.arms[0].hand, a, j.u),
    },
  },
  orcSpearman: {
    size: 32, build: withSkin(ORC_BUILD, ORC_OLIVE), grip: "spear", weight: 0.1, castStyle: "roar", head: ORC_HEAD, feet: DARK_LEATHER,
    gear: {
      body: (s, j) => vest(s, j, DARK_LEATHER),
      legs: (s, j) => loincloth(s, j, LEATHER),
      head: (s, j, b) => helmet(s, j, b, RUSTY),
      weapon: (s, j, a) => spear(s, j.arms[0].hand, a, j.u),
    },
  },
  orcArcher: {
    size: 32, build: { ...ORC_BUILD, chestRx: 4, chestRy: 4 }, grip: "bow", weight: 0, castStyle: "roar", head: ORC_HEAD, feet: DARK_LEATHER,
    gear: {
      back: (s, j) => quiver(s, j),
      far: (s, j, clip, frame) => {
        const pulling = clip === "attack" ? frame === 0 : clip === "idle" || clip === "walk";
        bow(s, j.arms[1].hand, j.arms[1].foreAngle, j.u, pulling && clip === "attack" ? j.arms[0].hand : null);
      },
      body: (s, j) => vest(s, j, LEATHER),
      legs: (s, j) => loincloth(s, j, DARK_LEATHER),
      head: (s, j, b) => hood(s, j, b, ["#6d7a52", "#55603f", "#3f482e", "#2c3220", "#1a1e13"]),
    },
  },
  orcShaman: {
    size: 32, build: withSkin({ ...ORC_BUILD, chestRx: 4.1, hunch: 1.4 }, ORC_OLIVE), grip: "staff", weight: 0.1, castStyle: "raise",
    head: { ...ORC_HEAD, eye: "#9dff6a" }, feet: ORC_OLIVE,
    gear: {
      body: (s, j) => { warPaint(s, j, "#d8d0b0"); necklace(s, j); },
      legs: (s, j) => loincloth(s, j, ["#8a8a5a", "#6e6e44", "#555532", "#3d3d22", "#262614"], DARK_LEATHER, 1.3),
      head: (s, j, b) => skullMask(s, j, b),
      weapon: (s, j, a) => staff(s, j.arms[0].hand, a, j.u),
    },
  },
  orcBerserker: {
    size: 32, build: { ...ORC_BUILD, chestRx: 4.7, chestRy: 4.5, armR: 2, foreR: 1.8 }, grip: "dual", weight: 0.1, castStyle: "roar",
    head: { ...ORC_HEAD, eye: "#ff5a3a" }, feet: DARK_LEATHER,
    gear: {
      far: (s, j, clip, frame) => axe(s, j.arms[1].hand, j.arms[1].foreAngle + (clip === "attack" ? [1.2, 1.1, 0.3, 0.8][frame] : 1.25), j.u, 0.9),
      body: (s, j) => warPaint(s, j, RED_CLOTH[1]),
      legs: (s, j) => loincloth(s, j, RED_CLOTH, DARK_LEATHER),
      head: (s, j, b) => mohawk(s, j, b, RED_CLOTH[2]),
      weapon: (s, j, a) => axe(s, j.arms[0].hand, a, j.u),
    },
  },
  orcCaptain: {
    size: 32, build: { ...ORC_BUILD, chestRx: 4.6, chestRy: 4.5 }, grip: "oneHand", weight: 0.15, castStyle: "roar", head: ORC_HEAD, feet: DARK_LEATHER,
    gear: {
      back: (s, j) => banner(s, j),
      body: (s, j) => vest(s, j, RUSTY),
      legs: (s, j) => loincloth(s, j, RED_CLOTH),
      head: (s, j, b) => helmet(s, j, b, METAL),
      weapon: (s, j, a) => axe(s, j.arms[0].hand, a, j.u, 1.1),
      front: (s, j) => pauldron(s, j, METAL, 0.8),
    },
  },
  ogreYoung: {
    size: 40, build: OGRE_BUILD, grip: "club", weight: 0.75, castStyle: "roar", head: OGRE_HEAD, feet: OGRE,
    gear: {
      legs: (s, j) => loincloth(s, j, FUR, DARK_LEATHER),
      head: (s, j, b) => topknot(s, j, b),
      weapon: (s, j, a) => club(s, j.arms[0].hand, a, j.u, 7.5, 0.8, 1.7),
    },
  },
  ogreBruiser: {
    size: 48, build: { ...OGRE_BUILD, belly: { rx: 5.5, ry: 5, dx: 2.6, dy: 3.3, pal: OGRE_BUILD.belly!.pal }, chestRx: 5.7 }, grip: "club", weight: 0.9, castStyle: "roar",
    head: OGRE_HEAD, feet: OGRE,
    gear: {
      back: (s, j) => furMantle(s, j, DARK_FUR),
      body: (s, j) => {
        // Correia de couro atravessada no peito, com fivela e um crânio pendurado.
        const u = j.u;
        const from = add(j.shoulder, { x: -2.5 * u, y: -0.5 * u });
        const to = add(j.hip, { x: 3.5 * u, y: -1.5 * u });
        capsule(s, from, to, 0.8 * u, 0.8 * u, DARK_LEATHER, { flat: 0.4 });
        const mid = add(from, { x: (to.x - from.x) * 0.55, y: (to.y - from.y) * 0.55 });
        ellipse(s, mid, 1.3 * u, 1.2 * u, 0, BONE, { edge: 0.4 });
        s.set(mid.x - 0.4 * u, mid.y, "#1a120a");
        s.set(mid.x + 0.4 * u, mid.y, "#1a120a");
        necklace(s, j, 7);
      },
      legs: (s, j) => loincloth(s, j, FUR, LEATHER, 1.1),
      head: (s, j, b) => topknot(s, j, b),
      weapon: (s, j, a) => club(s, j.arms[0].hand, a, j.u, 9, 0.9, 2.1, 6),
    },
  },
  ogreShaman: {
    size: 48, build: withSkin({ ...OGRE_BUILD, hunch: 2.6, belly: { rx: 4.6, ry: 4.4, dx: 2.2, dy: 3.2, pal: ["#d2c8b2", "#b3a892", "#928773", "#6f6656", "#463f34"] } }, OGRE_GRAY), grip: "staff", weight: 0.8,
    castStyle: "raise", head: { ...OGRE_HEAD, eye: "#9dff6a" }, feet: OGRE_GRAY,
    gear: {
      back: (s, j) => furMantle(s, j, ["#7a8a6a", "#5f6d50", "#475239", "#323a28", "#1e2418"]),
      body: (s, j) => { warPaint(s, j, "#9dd06a"); necklace(s, j, 7); },
      legs: (s, j) => loincloth(s, j, ["#7a8a6a", "#5f6d50", "#475239", "#323a28", "#1e2418"], DARK_LEATHER, 1.4),
      head: (s, j, b) => skullMask(s, j, b),
      weapon: (s, j, a) => staff(s, j.arms[0].hand, a, j.u, 1.1),
    },
  },
  orcWarlord: {
    size: 40, build: { ...ORC_BUILD, chestRx: 5.2, chestRy: 4.9, thighR: 2.4, shinR: 2, armR: 2.2, foreR: 2, handR: 1.7, torso: 7.4 }, grip: "twoHand",
    weight: 0.35, castStyle: "roar", head: { ...ORC_HEAD, eye: "#ff4a2a" }, feet: METAL,
    gear: {
      back: (s, j) => {
        // Capa vermelha caindo das costas.
        const u = j.u;
        poly(s, [add(j.shoulder, { x: -1 * u, y: -0.8 * u }), add(j.shoulder, { x: -4.2 * u, y: 0 }), add(j.hip, { x: -6 * u, y: 7 * u }), add(j.hip, { x: -1.6 * u, y: 6 * u })],
          (x, y) => ((x + y) % 6 === 0 ? RED_CLOTH[3] : RED_CLOTH[2]));
      },
      body: (s, j) => {
        vest(s, j, METAL);
        const u = j.u;
        stroke(s, add(j.chestC, { x: -2.6 * u, y: 0.4 * u }), add(j.chestC, { x: 2.8 * u, y: 0.2 * u }), METAL[3]);
      },
      legs: (s, j) => loincloth(s, j, RED_CLOTH, METAL),
      head: (s, j, b) => helmet(s, j, b, METAL, true),
      weapon: (s, j, a) => cleaver(s, j.arms[0].hand, a, j.u),
      front: (s, j) => pauldron(s, j, METAL, 1.1),
    },
  },
} satisfies Record<string, Species>;

export type MarshSpecies = keyof typeof MARSH_SPECIES;

/** Desenha um quadro de uma espécie (olhando para a direita, numa `Sheet` do tamanho do quadro). */
export function drawSpecies(sp: Species, clip: Clip, frame: number): Sheet {
  const s = new Sheet(sp.size, sp.size);
  const pose: Pose = posed(clip, frame, sp.grip, sp.weight, sp.castStyle);
  const b = sp.build;
  const j = joints(b, pose, sp.size);
  const skin = b.skin;
  const g = sp.gear;
  g.back?.(s, j);
  drawArm(s, b, j, 1, shade(skin));
  g.far?.(s, j, clip, frame);
  drawLeg(s, b, j, 1, shade(skin), shade(sp.feet));
  drawTorso(s, b, j, pose, skin);
  g.body?.(s, j);
  drawHead(s, b, j, pose, skin, sp.head);
  g.head?.(s, j, b);
  drawLeg(s, b, j, 0, skin, sp.feet);
  g.legs?.(s, j);
  // Braço, arma por cima e a mão de novo por cima do cabo (a arma aparece em qualquer ângulo, empunhada).
  drawArm(s, b, j, 0, skin);
  if (g.weapon) {
    g.weapon(s, j, weaponAngle(j, 0, sp.grip, clip, frame), clip, frame);
    ellipse(s, j.arms[0].hand, b.handR * j.u, b.handR * j.u, 0, skin);
  }
  g.front?.(s, j);
  return s;
}

/** Folha com todos os quadros (`CLIP_ORDER`), lado a lado, olhando para a esquerda. */
export function speciesSheet(sp: Species) {
  const { canvas, ctx } = makeCanvas(sp.size * FRAME_COUNT, sp.size);
  let n = 0;
  for (const clip of CLIP_ORDER) for (let i = 0; i < CLIPS[clip]; i++) blitMirrored(ctx, drawSpecies(sp, clip, i), (n++) * sp.size, 0, MARSH_MONSTER_OUTLINE);
  return canvas;
}

/** Primeiro quadro (parado), para a galeria e o Bestiário. */
export function speciesPortrait(sp: Species) {
  const { canvas, ctx } = makeCanvas(sp.size, sp.size);
  blitMirrored(ctx, drawSpecies(sp, "idle", 0), 0, 0, MARSH_MONSTER_OUTLINE);
  return canvas;
}
