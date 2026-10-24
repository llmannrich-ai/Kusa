import { Sheet, hash, makeCanvas } from "./pixels.ts";
import {
  CLIP_ORDER, CLIPS, FRAME_COUNT, add, blitMirrored, capsule, dir, drawArm, drawHead, drawLeg, drawTorso, ellipse, joints, lerpPt, poly,
  posed, shade, stroke, type Build, type Clip, type Joints, type Pal, type Pose, type Pt,
} from "./rig.ts";

/**
 * Grumak, o Rei-Ogro (boss do Pântano), em arte própria e animada: quadros de 80 px (2,5 tiles no jogo), no mesmo
 * esqueleto dos orcs e ogros (`rig.ts`), com muito mais detalhe. Pele oliva cheia de cicatrizes e pintura azul de
 * guerra, barriga enorme, coroa de ferro torta com pontas douradas e uma pedra vermelha, argola no nariz, barba rala,
 * manto de pele de urso preso por um crânio no ombro, cinto com fivela de caveira e correntes, braçadeiras de ferro
 * com cravos, joelheiras, e um tronco inteiro de porrete com cintas de ferro, cravos e musgo.
 *
 * Movimento de corpo: o passo é pesado (corpo baixa e balança para os lados), a barriga quica atrasada em relação ao
 * corpo, o manto e as correntes balançam no passo e no golpe; o golpe ergue o tronco por cima da cabeça com o corpo
 * jogado para trás e desce agachando; o rugido estufa o peito, joga a cabeça para trás e escancara a boca.
 */

/** Quadro de 112 px com o corpo na escala de um quadro de 80 (2,5 px por unidade): sobra lugar para o tronco no golpe. */
export const KING_SIZE = 112;
const KING_UNIT = 2.5;
export const KING_OUTLINE = "#120a05";

const SKIN: Pal = ["#d6cf94", "#b5ad72", "#928a55", "#6c653b", "#433e22"];
const BELLY: Pal = ["#f4eec6", "#ddd4a2", "#bcb07e", "#8f8559", "#5a5335"];
const FUR: Pal = ["#8c6f4e", "#6c5236", "#503b25", "#382818", "#22180d"];
const FUR_TIP = "#a88a62";
const HIDE: Pal = ["#b4654a", "#904c35", "#6e3826", "#4f271a", "#30170f"];
const LEATHER: Pal = ["#8f6a44", "#6e4f2f", "#523920", "#3a2715", "#22160b"];
const IRON: Pal = ["#d9dde2", "#a8afb8", "#7c848e", "#545a63", "#30343a"];
const GOLD: Pal = ["#fff1a6", "#f2c94c", "#c9962a", "#94651a", "#5c3c0d"];
const BONE: Pal = ["#fffbe8", "#ece2c4", "#cbbd96", "#9f906a", "#6c6046"];
const BARK: Pal = ["#a88358", "#84633e", "#634729", "#463119", "#2a1c0e"];
const MOSS: Pal = ["#9cc35a", "#7aa244", "#5b8132", "#405f24", "#283c16"];
const WOAD = "#3e6fa8";
const WOAD_DARK = "#2b4f7c";
const SCAR = "#e8c4a0";
const HAIR = "#1c140c";
const GEM: Pal = ["#ffb0a0", "#ff4a3a", "#c41e1e", "#8a1010", "#4a0606"];

const KING: Build = {
  skin: SKIN, thigh: 5, shin: 4.6, thighR: 3, shinR: 2.6, foot: 3, torso: 8, chestRx: 5.2, chestRy: 4.9,
  belly: { rx: 6.1, ry: 5.6, dx: 3.3, dy: 3.7, pal: BELLY },
  upperArm: 5.2, foreArm: 4.9, armR: 2.6, foreR: 2.4, handR: 2.3, head: { rx: 3.9, ry: 3.6, neck: 0.9, dx: 2 }, hunch: 0.9,
};

/** Movimento secundário de um quadro: quique da barriga, balanço do manto e das correntes. */
interface Swing { belly: number; cape: number; chain: number }

function poseOf(clip: Clip, i: number): { pose: Pose; swing: Swing } {
  const pose = posed(clip, i, "club", 1, "roar");
  let swing: Swing = { belly: 0, cape: 0, chain: 0 };
  if (clip === "idle") {
    const t = (i / CLIPS.idle) * Math.PI * 2;
    swing = { belly: Math.sin(t - 0.6) * 0.35, cape: Math.sin(t) * 0.3, chain: Math.sin(t + 1) * 0.4 };
    // Tronco descansando no ombro; a outra mão pendurada, fechada.
    pose.nearArm = { a: -0.25 + Math.sin(t) * 0.04, b: 3.05 };
    pose.lean = 0.02;
    pose.farArm = { a: 0.05 - Math.sin(t) * 0.04, b: 0.35 };
  } else if (clip === "walk") {
    const t = (i / CLIPS.walk) * Math.PI * 2;
    // O braço do tronco sobe e desce com o passo; o livre balança largo, com o cotovelo solto.
    pose.nearArm = { a: -0.25 + Math.sin(t) * 0.22 + Math.sin(t * 2) * 0.06, b: 3.05 - Math.sin(t) * 0.15 };
    pose.lean = 0.04 + Math.sin(t * 2) * 0.02;
    pose.farArm = { a: 0.15 + Math.sin(t) * 0.8, b: 0.45 + Math.max(0, Math.sin(t)) * 0.6 };
    // A barriga quica duas vezes por passada, atrasada em relação ao corpo; o manto fica para trás.
    swing = { belly: Math.sin(t * 2 - 1.1) * 0.7, cape: -1.4 - Math.sin(t * 2) * 0.6, chain: Math.sin(t * 2 + 0.5) * 1.2 };
    pose.tilt += Math.sin(t) * 0.05;
  } else if (clip === "attack") {
    // Golpe de rei: agacha no impacto, o corpo vai inteiro para baixo junto com o tronco.
    pose.near.b += [0.05, 0.5, 0.55, 0.2][i];
    pose.far.b += [0.15, 0.4, 0.45, 0.15][i];
    pose.lean += [-0.12, 0.12, 0.1, 0][i];
    // Ergue o tronco bem alto atrás da cabeça e desce com os dois braços.
    pose.nearArm = [{ a: 3.55, b: 0.35 }, { a: 1.2, b: 0.1 }, { a: 0.85, b: 0.1 }, { a: 1.0, b: 0.35 }][i];
    pose.farArm = [{ a: 3.3, b: 0.5 }, { a: 1.1, b: 0.25 }, { a: 0.8, b: 0.25 }, { a: 0.85, b: 0.45 }][i];
    pose.jaw = [0.5, 0.9, 0.4, 0.1][i];
    pose.tilt += [-0.15, 0.1, 0.05, 0][i];
    swing = { belly: [-0.4, 1.1, 0.6, 0][i], cape: [0.6, -2.2, -1.6, -0.6][i], chain: [-1, 1.6, 1, 0.3][i] };
  } else {
    // Rugido: o tronco erguido bem alto atrás da cabeça, o punho de trás cerrado à frente, a cabeça para trás e a boca
    // escancarada (à mostra, sem braço na frente).
    swing = { belly: [0, -0.4, -0.5, -0.2][i], cape: [0, 0.8, 1, 0.4][i], chain: [0, -0.8, -1, -0.3][i] };
    pose.nearArm = [{ a: 2.4, b: 0.5 }, { a: 3.45, b: 0.3 }, { a: 3.5, b: 0.3 }, { a: 2.8, b: 0.45 }][i];
    pose.farArm = [{ a: 0.5, b: 1.0 }, { a: 0.95, b: 1.55 }, { a: 1.0, b: 1.6 }, { a: 0.65, b: 1.15 }][i];
    pose.jaw = [0.5, 1, 1, 0.6][i];
    pose.tilt = [-0.15, -0.35, -0.38, -0.2][i];
  }
  return { pose, swing };
}

// --- Peças ---------------------------------------------------------------------------

/** Manto de pele de urso caindo das costas até a canela, com a ponta balançando (`sway`, em unidades). */
function cape(s: Sheet, j: Joints, sway: number) {
  const u = j.u;
  const top = add(j.shoulder, { x: -1.6 * u, y: -1.2 * u });
  const pts: Pt[] = [
    add(j.shoulder, { x: 1 * u, y: -1.4 * u }),
    top,
    add(j.shoulder, { x: -5.2 * u, y: 1 * u }),
    add(j.hip, { x: (-6.6 + sway) * u, y: 4 * u }),
    add(j.hip, { x: (-6 + sway * 1.4) * u, y: 9.4 * u }),
    add(j.hip, { x: (-2.4 + sway * 1.1) * u, y: 9 * u }),
    add(j.hip, { x: -1.4 * u, y: 2 * u }),
  ];
  poly(s, pts, (x, y) => {
    // Pelagem: fios verticais em tons, mais escura embaixo e na beira de trás.
    const strand = hash(Math.floor(x / 1.5), 901) * 4;
    const v = (y - top.y) / (10 * u);
    const k = Math.min(4, Math.max(1, Math.floor(1 + strand * 0.5 + v * 1.8)));
    return hash(x, y, 902) < 0.05 ? FUR_TIP : FUR[k];
  });
  // Barra de baixo esfiapada.
  const a = pts[4];
  const b = pts[5];
  for (let k = 0; k <= 12; k++) {
    const p = lerpPt(a, b, k / 12);
    stroke(s, p, add(p, { x: (hash(k, 903) - 0.5) * u, y: (0.6 + hash(k, 904) * 1.2) * u }), k % 2 ? FUR[3] : FUR[2]);
  }
}

/** Gola de pele sobre os ombros, por cima do tronco e atrás da cabeça. */
function furCollar(s: Sheet, j: Joints) {
  const u = j.u;
  const c = add(j.shoulder, { x: -1.8 * u, y: -0.2 * u });
  ellipse(s, c, 3.4 * u, 1.7 * u, j.lean - 0.3, FUR);
  for (let k = 0; k < 10; k++) {
    const p = add(c, { x: (k - 4.5) * 0.62 * u, y: (0.9 + hash(k, 905) * 0.6) * u });
    stroke(s, p, add(p, { x: -0.3 * u, y: (1 + hash(k, 906) * 1.4) * u }), k % 3 === 0 ? FUR_TIP : FUR[2 + (k % 2)]);
  }
}

/** Ombreira de pele com uma placa de ferro rebitada e uma presa de javali pendurada. */
function furPauldron(s: Sheet, j: Joints) {
  const u = j.u;
  const at = add(j.arms[0].shoulder, { x: -0.4 * u, y: -0.3 * u });
  ellipse(s, add(at, { x: -0.4 * u, y: 0.5 * u }), 2.3 * u, 1.6 * u, -0.3, FUR);
  for (let k = 0; k < 6; k++) {
    const p = add(at, { x: (k - 3) * 0.7 * u, y: 1.6 * u });
    stroke(s, p, add(p, { x: -0.2 * u, y: (0.8 + hash(k, 907) * 0.9) * u }), k % 2 ? FUR[3] : FUR_TIP);
  }
  // Faixa de ferro rebitada atravessando a pele.
  stroke(s, add(at, { x: -2.2 * u, y: 0.6 * u }), add(at, { x: 2 * u, y: -0.4 * u }), IRON[2]);
  stroke(s, add(at, { x: -2.2 * u, y: 0.6 * u + 1 }), add(at, { x: 2 * u, y: -0.4 * u + 1 }), IRON[4]);
  for (const t of [0.2, 0.5, 0.8]) {
    const p = lerpPt(add(at, { x: -2.2 * u, y: 0.6 * u }), add(at, { x: 2 * u, y: -0.4 * u }), t);
    s.set(p.x, p.y, IRON[0]);
  }
  const tooth = add(at, { x: 1.6 * u, y: 1.4 * u });
  stroke(s, tooth, add(tooth, { x: 0.3 * u, y: 1.6 * u }), BONE[1]);
  s.set(tooth.x + 1, tooth.y + 1.6 * u, BONE[3]);
}

/** Braçadeira de couro grosso no antebraço, com cravos de ferro. */
function bracer(s: Sheet, j: Joints, i: 0 | 1, pal: Pal) {
  const u = j.u;
  const arm = j.arms[i];
  const a = lerpPt(arm.elbow, arm.hand, 0.45);
  const b = lerpPt(arm.elbow, arm.hand, 0.78);
  capsule(s, a, b, KING.foreR * 1.02 * u, KING.foreR * 0.96 * u, pal, { edge: 0.8 });
  const d = dir(arm.foreAngle);
  const n = { x: d.y, y: -d.x };
  for (const t of [0.5, 0.9]) {
    const p = lerpPt(a, b, t);
    stroke(s, add(p, n, KING.foreR * 1.05 * u), add(p, n, (KING.foreR * 1.05 + 1) * u), IRON[0]);
    s.set(p.x, p.y, IRON[1]);
  }
  stroke(s, add(a, n, -KING.foreR * u), add(a, n, KING.foreR * u), IRON[3]);
  stroke(s, add(b, n, -KING.foreR * u), add(b, n, KING.foreR * u), IRON[3]);
}

/** Joelheira de ferro amassada. */
function kneeGuard(s: Sheet, j: Joints, i: 0 | 1, pal: Pal) {
  const u = j.u;
  const k = j.legs[i].knee;
  ellipse(s, add(k, { x: 0.7 * u, y: 0 }), 1.9 * u, 1.6 * u, 0.3, pal);
  s.set(k.x + 1.2 * u, k.y - 0.2 * u, IRON[0]);
}

/** Faixas de pano no pé e no tornozelo. */
function footWraps(s: Sheet, j: Joints, i: 0 | 1) {
  const u = j.u;
  const l = j.legs[i];
  for (let k = 0; k < 3; k++) {
    const p = lerpPt(l.knee, l.ankle, 0.55 + k * 0.15);
    stroke(s, add(p, { x: -KING.shinR * u, y: 0.3 * u }), add(p, { x: KING.shinR * u, y: -0.3 * u }), k % 2 ? LEATHER[3] : LEATHER[2]);
  }
}

/** Unhas grossas e amareladas na ponta do pé. */
function toes(s: Sheet, j: Joints, i: 0 | 1) {
  const u = j.u;
  const t = j.legs[i].toe;
  for (const dy of [-0.6, 0.3]) {
    const p = add(t, { x: 0.4 * u, y: dy * u });
    s.set(p.x, p.y, "#e8d8a0");
    s.set(p.x - 1, p.y, "#b8a670");
  }
}

/** Detalhes da pele: pelos do peito, cicatrizes na barriga e pintura azul de guerra. */
function skinDetails(s: Sheet, j: Joints) {
  const u = j.u;
  for (let k = 0; k < 18; k++) {
    const p = add(j.chestC, { x: (hash(k, 910) - 0.3) * 4.5 * u, y: (hash(k, 911) - 0.6) * 4 * u });
    if (s.get(p.x, p.y)) s.set(p.x, p.y, SKIN[4]);
  }
  if (j.bellyC) {
    // Duas cicatrizes cruzadas e os pontos da costura.
    const c = j.bellyC;
    stroke(s, add(c, { x: -1 * u, y: -3.2 * u }), add(c, { x: 2.6 * u, y: 1.4 * u }), SCAR);
    stroke(s, add(c, { x: 3 * u, y: -2.4 * u }), add(c, { x: 0.4 * u, y: 2.6 * u }), SCAR);
    for (let k = 1; k < 5; k++) {
      const p = lerpPt(add(c, { x: -1 * u, y: -3.2 * u }), add(c, { x: 2.6 * u, y: 1.4 * u }), k / 5);
      s.set(p.x - 1, p.y + 1, BELLY[4]);
      s.set(p.x + 1, p.y - 1, BELLY[4]);
    }
  }
  // Espiral de pintura no peito.
  const sp = add(j.chestC, { x: 1.4 * u, y: -1.2 * u });
  for (let a = 0; a < Math.PI * 3; a += 0.25) {
    const r = 0.25 * u + a * 0.22 * u;
    s.set(sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r * 0.8, a > Math.PI * 2 ? WOAD_DARK : WOAD);
  }
}

/** Faixas de pintura azul no braço de perto. */
function armPaint(s: Sheet, j: Joints) {
  const u = j.u;
  const arm = j.arms[0];
  for (const t of [0.35, 0.55, 0.75]) {
    const p = lerpPt(arm.shoulder, arm.elbow, t);
    const d = dir(Math.atan2(arm.elbow.x - arm.shoulder.x, arm.elbow.y - arm.shoulder.y));
    const n = { x: d.y, y: -d.x };
    stroke(s, add(p, n, -KING.armR * 0.8 * u), add(p, n, KING.armR * 0.8 * u), t === 0.55 ? WOAD_DARK : WOAD);
  }
}

/** Cinto largo sob a barriga, fivela de caveira e correntes penduradas balançando. */
function belt(s: Sheet, j: Joints, chain: number) {
  const u = j.u;
  const h = j.hip;
  const front = add(h, { x: 5.6 * u, y: 0.9 * u });
  const back = add(h, { x: -4.2 * u, y: -0.6 * u });
  capsule(s, back, front, 1.4 * u, 1.4 * u, LEATHER, { flat: 0.35 });
  for (let k = 0; k < 6; k++) {
    const p = lerpPt(back, front, 0.1 + k * 0.16);
    s.set(p.x, p.y - 0.6 * u, IRON[1]);
  }
  // Correntes em arco entre dois pontos do cinto, caindo e balançando.
  const chainArc = (a: Pt, b: Pt, drop: number) => {
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      const p = add(lerpPt(a, b, t), { x: chain * (1 - (2 * t - 1) ** 2) * 0.8 * u, y: (1 - (2 * t - 1) ** 2) * drop * u });
      s.set(p.x, p.y, k % 2 ? IRON[3] : IRON[1]);
      if (k % 2 === 0) s.set(p.x + 1, p.y, IRON[4]);
    }
  };
  chainArc(lerpPt(back, front, 0.15), lerpPt(back, front, 0.55), 3.4);
  chainArc(lerpPt(back, front, 0.35), lerpPt(back, front, 0.8), 2.4);
  // Fivela: caveira de orc com presas, em osso.
  const sk = add(front, { x: -1.6 * u, y: 0.1 * u });
  ellipse(s, sk, 1.9 * u, 1.7 * u, 0, BONE);
  for (const dx of [-0.7, 0.6]) {
    const e = add(sk, { x: dx * u, y: -0.2 * u });
    s.set(e.x, e.y, "#120a05");
    s.set(e.x + 1, e.y, "#120a05");
    s.set(e.x, e.y + 1, "#120a05");
  }
  stroke(s, add(sk, { x: -0.9 * u, y: 1 * u }), add(sk, { x: 0.9 * u, y: 1 * u }), BONE[3]);
  s.set(sk.x - 0.7 * u, sk.y + 1.4 * u, BONE[0]);
  s.set(sk.x + 0.7 * u, sk.y + 1.4 * u, BONE[0]);
}

/** Tanga de couro cru com costura e ossinhos pendurados (na frente das pernas). */
function loincloth(s: Sheet, j: Joints, swing: number) {
  const u = j.u;
  const top = add(j.hip, { x: 3 * u, y: 1.6 * u });
  const pts = [
    add(top, { x: -1.8 * u, y: 0 }), add(top, { x: 1.9 * u, y: -0.2 * u }),
    add(top, { x: (2.1 + swing * 0.3) * u, y: 4.4 * u }), add(top, { x: (0.2 + swing * 0.3) * u, y: 5 * u }), add(top, { x: (-1.5 + swing * 0.3) * u, y: 4.2 * u }),
  ];
  poly(s, pts, (x, y) => {
    const v = (x - top.x) / u;
    return hash(x, y, 920) < 0.04 ? HIDE[4] : v > 1.4 ? HIDE[1] : v < -1.2 ? HIDE[3] : HIDE[2];
  });
  // Costura no meio.
  for (let k = 1; k < 6; k++) s.set(top.x + 0.3 * u + swing * 0.05 * k * u, top.y + k * u, k % 2 ? HIDE[4] : HIDE[0]);
  for (const t of [0.25, 0.75]) {
    const p = lerpPt(pts[4], pts[2], t);
    stroke(s, p, add(p, { x: 0, y: 1.6 * u }), LEATHER[3]);
    ellipse(s, add(p, { x: 0, y: 2.1 * u }), 0.6 * u, 0.7 * u, 0, BONE, { edge: 0.3 });
  }
}

/** Coroa de ferro torta: aro com rebites, pontas com as pontas douradas e uma pedra vermelha na frente. */
function crown(s: Sheet, j: Joints, pose: Pose) {
  const u = j.u;
  const c = j.headC;
  const tilt = -0.28 + pose.tilt * 0.5;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const at = (dx: number, dy: number): Pt => ({ x: c.x + (dx * cos - dy * sin) * u, y: c.y + (dx * sin + dy * cos) * u });
  // Aro: faixa de 1,2 un. de altura sobre o alto da cabeça.
  for (let k = -3.4; k <= 3.2; k += 0.25) {
    const yy = -2.4 - Math.cos((k / 3.4) * 1.2) * 0.5;
    stroke(s, at(k, yy), at(k, yy - 1.2), k < -2.4 ? IRON[4] : k > 1.6 ? IRON[1] : IRON[2]);
  }
  for (const k of [-2.4, -0.8, 0.8, 2.4]) s.set(at(k, -3.1).x, at(k, -3.1).y, IRON[0]);
  // Pontas (uma entortada), ponta dourada.
  for (const [k, h, bend] of [[-3, 2.2, 0], [-1.4, 2.8, -0.4], [0.2, 3.3, 0], [1.8, 2.6, 0.7], [3, 1.8, 0]] as const) {
    const base = at(k, -3.6);
    const tip = at(k + bend, -3.6 - h);
    poly(s, [at(k - 0.6, -3.5), at(k + 0.6, -3.5), tip], (x) => (x < tip.x ? IRON[1] : IRON[3]));
    ellipse(s, tip, 0.55 * u, 0.55 * u, 0, GOLD, { edge: 0.2 });
    void base;
  }
  // Pedra vermelha no meio do aro, na frente.
  ellipse(s, at(1.6, -3), 0.85 * u, 0.7 * u, 0, GEM, { edge: 0.3 });
  s.set(at(1.4, -3.3).x, at(1.4, -3.3).y, GEM[0]);
}

/** Barba rala, argola no nariz, brinco e, com a boca aberta, os dentes. */
function faceDetails(s: Sheet, j: Joints, pose: Pose) {
  const u = j.u;
  const c = j.headC;
  const rx = KING.head.rx;
  const ry = KING.head.ry;
  // Cavanhaque ralo sob o queixo, balançando com a cabeça.
  for (let k = 0; k < 4; k++) {
    const p = add(c, { x: (0.05 + k * 0.12) * rx * u, y: (0.82 + pose.jaw * 0.25) * ry * u });
    stroke(s, p, add(p, { x: (-0.3 - pose.tilt) * u, y: (0.8 + hash(k, 930) * 0.8) * u }), k % 2 ? HAIR : "#3a2a18");
  }
  // Dentes de cima (boca aberta) entre o lábio e a mandíbula.
  if (pose.jaw > 0.3) {
    for (let k = 0; k < 4; k++) {
      const p = add(c, { x: (0.2 + k * 0.17) * rx * u, y: 0.38 * ry * u });
      s.set(p.x, p.y, BONE[1]);
      s.set(p.x, p.y + 1, BONE[2]);
    }
    // Língua no fundo da boca.
    const t = add(c, { x: 0.4 * rx * u, y: (0.48 + pose.jaw * 0.12) * ry * u });
    s.set(t.x, t.y, "#a83a3a");
    s.set(t.x + 1, t.y, "#c24a4a");
  }
  // Argola de ouro no nariz e brinco na orelha.
  const nose = add(c, { x: 0.95 * rx * u, y: 0.2 * ry * u });
  for (let a = 0; a < Math.PI * 1.6; a += 0.35) s.set(nose.x + Math.cos(a + 1.6) * 0.8 * u, nose.y + 0.6 * u + Math.sin(a + 1.6) * 0.8 * u, a < 1 ? GOLD[0] : GOLD[2]);
  const ear = add(c, { x: -0.62 * rx * u, y: 0.35 * ry * u });
  for (let a = 0; a < Math.PI * 2; a += 0.5) s.set(ear.x + Math.cos(a) * 0.6 * u, ear.y + 0.8 * u + Math.sin(a) * 0.6 * u, GOLD[1]);
}

/** O porrete: tronco inteiro, engrossando na ponta, com cintas de ferro, cravos, nós, raízes e musgo. */
function trunkClub(s: Sheet, hand: Pt, a: number, u: number) {
  const d = dir(a);
  const n = { x: d.y, y: -d.x };
  const len = 10.5;
  const base = add(hand, d, -2.4 * u);
  const tip = add(hand, d, len * u);
  const r0 = 1.1 * u;
  const r1 = 2.5 * u;
  capsule(s, base, tip, r0, r1, BARK);
  const total = len + 2.4;
  // Sulcos da casca ao longo do tronco.
  for (let k = -2; k <= 2; k++) {
    for (let t = 0.05; t < 0.98; t += 0.02) {
      const r = (r0 + (r1 - r0) * t) * (k / 2.6);
      const p = add(add(base, d, total * u * t), n, r + Math.sin(t * 20 + k) * 0.3);
      if (hash(Math.round(p.x), Math.round(p.y), 940) < 0.75 && s.get(p.x, p.y)) s.set(p.x, p.y, BARK[4]);
    }
  }
  // Toco de galho e nó.
  const knot = add(base, d, total * u * 0.55);
  capsule(s, add(knot, n, (r0 + (r1 - r0) * 0.55) * 0.7), add(add(knot, n, (r0 + (r1 - r0) * 0.55) + 1.6 * u), d, 0.8 * u), 0.7 * u, 0.45 * u, BARK, { edge: 0.4 });
  ellipse(s, add(knot, n, -0.4 * u), 0.7 * u, 0.5 * u, 0, ["#5a4024", "#463119", "#342310", "#22170a", "#140d05"], { edge: 0.2 });
  // Cintas de ferro com rebites e cravos para fora.
  for (const t of [0.62, 0.86]) {
    const at = add(base, d, total * u * t);
    const r = r0 + (r1 - r0) * t + 0.35 * u;
    for (let k = -1; k <= 1; k++) stroke(s, add(add(at, d, k * 0.4), n, -r), add(add(at, d, k * 0.4), n, r), k === 1 ? IRON[3] : IRON[1]);
    for (const side of [-1, 1]) {
      const root = add(at, n, side * r);
      poly(s, [add(root, d, -0.45 * u), add(root, d, 0.45 * u), add(root, n, side * 1.4 * u)], (x) => (x % 2 ? IRON[0] : IRON[2]));
    }
  }
  // Ponta: cravos de ferro espetados e musgo no lado de cima.
  for (let k = 0; k < 5; k++) {
    const ang = -1 + k * 0.5;
    const root = add(tip, { x: Math.cos(ang) * d.x - Math.sin(ang) * d.y, y: Math.sin(ang) * d.x + Math.cos(ang) * d.y }, r1 * 0.85);
    const out = add(root, { x: Math.cos(ang) * d.x - Math.sin(ang) * d.y, y: Math.sin(ang) * d.x + Math.cos(ang) * d.y }, 1.3 * u);
    stroke(s, root, out, k % 2 ? IRON[0] : IRON[2]);
  }
  for (let k = 0; k < 26; k++) {
    const t = 0.35 + hash(k, 941) * 0.6;
    const r = (r0 + (r1 - r0) * t) * (0.55 + hash(k, 942) * 0.5);
    const p = add(add(base, d, total * u * t), n, r);
    if (s.get(p.x, p.y)) s.set(p.x, p.y, MOSS[hash(k, 943) < 0.4 ? 1 : 2]);
    if (s.get(p.x, p.y + 1)) s.set(p.x, p.y + 1, MOSS[3]);
  }
}

// --- Quadro e folha -------------------------------------------------------------------

/** Um quadro do Rei-Ogro (olhando para a direita, numa `Sheet` de 80×80). */
export function drawKing(clip: Clip, frame: number): Sheet {
  const s = new Sheet(KING_SIZE, KING_SIZE);
  const { pose, swing } = poseOf(clip, frame);
  const j = joints(KING, pose, KING_SIZE, KING_UNIT);
  const u = j.u;
  if (j.bellyC) j.bellyC = add(j.bellyC, { x: swing.belly * 0.3 * u, y: swing.belly * u });

  cape(s, j, swing.cape);
  // Braço e perna de trás, na sombra do corpo.
  drawArm(s, KING, j, 1, shade(SKIN));
  bracer(s, j, 1, shade(LEATHER));
  drawLeg(s, KING, j, 1, shade(SKIN), shade(SKIN));
  kneeGuard(s, j, 1, shade(IRON));
  footWraps(s, j, 1);
  // Corpo.
  drawTorso(s, KING, j, pose, SKIN);
  skinDetails(s, j);
  furCollar(s, j);
  // Parado e andando, o tronco fica deitado no ombro (para trás e para cima, atrás da cabeça), balançando com o passo.
  const rest = clip === "idle" || clip === "walk";
  const phase = (frame / CLIPS.walk) * Math.PI * 2;
  if (rest) trunkClub(s, j.arms[0].hand, 3.75 + (clip === "walk" ? Math.sin(phase) * 0.18 + Math.sin(phase * 2) * 0.06 : 0), u);
  // No rugido o braço erguido fica atrás da cabeça (a boca aberta aparece inteira).
  const roar = clip === "cast";
  if (roar) nearArm(s, j, j.arms[0].foreAngle + 0.35);
  drawHead(s, KING, j, pose, SKIN, { eye: "#ffe14a", tusk: "#fff6dc", brow: "#2c2214", ear: "round", bigTusk: true });
  faceDetails(s, j, pose);
  crown(s, j, pose);
  // Perna de perto, cinto e tanga por cima.
  drawLeg(s, KING, j, 0, SKIN, SKIN);
  toes(s, j, 0);
  kneeGuard(s, j, 0, IRON);
  footWraps(s, j, 0);
  belt(s, j, swing.chain);
  loincloth(s, j, swing.chain);
  // Golpe: ergue (para cima e para trás), esmaga (para a frente), bate no chão e volta.
  if (!roar) nearArm(s, j, rest ? null : [3.75, 1.05, 0.62, 1.3][frame]);
  return s;
}

/** Ombreira, braço de perto, o tronco no ângulo `club` (null = já desenhado no ombro) e a mão por cima do cabo. */
function nearArm(s: Sheet, j: Joints, club: number | null) {
  const u = j.u;
  furPauldron(s, j);
  drawArm(s, KING, j, 0, SKIN);
  armPaint(s, j);
  if (club !== null) trunkClub(s, j.arms[0].hand, club, u);
  ellipse(s, j.arms[0].hand, KING.handR * u, KING.handR * u, 0, SKIN);
  bracer(s, j, 0, LEATHER);
}

/** Folha com todos os quadros (`CLIP_ORDER`), olhando para a esquerda. */
export function ogreKingSheet() {
  const { canvas, ctx } = makeCanvas(KING_SIZE * FRAME_COUNT, KING_SIZE);
  let n = 0;
  for (const clip of CLIP_ORDER) for (let i = 0; i < CLIPS[clip]; i++) blitMirrored(ctx, drawKing(clip, i), (n++) * KING_SIZE, 0, KING_OUTLINE);
  return canvas;
}

export function ogreKingPortrait() {
  const { canvas, ctx } = makeCanvas(KING_SIZE, KING_SIZE);
  blitMirrored(ctx, drawKing("idle", 0), 0, 0, KING_OUTLINE);
  return canvas;
}
