import { Sculpt, basis, lerp3, render, rot, turn, v3, tween, type Frame, type Look, type Mat3, type Material, type V3, type View } from "./sculpt.ts";

/**
 * Dragão Verde Jovem, boss do Bosque Velho, esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): escamas
 * esmeralda escurecendo nas costas, o ventre de placas verde-amareladas, a fileira de espinhos do pescoço à cauda, a
 * cabeça comprida de mandíbula que abre, os chifres de marfim com hera presa, o olho amarelo de veneno, as asas de
 * morcego (o braço, três dedos e a membrana em leque) e o gás verde do sopro. Pescoço e cauda em gomos que curvam; as
 * 4 pernas por cinemática inversa, como os quadrúpedes. Olha para a esquerda, chão em y = 0. Quadro maior (boss).
 */

const M = { scale: 0, back: 1, belly: 2, horn: 3, eye: 4, mouth: 5, tooth: 6, claw: 7, wing: 8, bone: 9, gas: 10, ivy: 11, spike: 12 } as const;

function look(): Look {
  const m: Material[] = [];
  m[M.scale] = {
    ramp: ["#03140b", "#062413", "#0b361c", "#104a26", "#176032", "#1f7a40", "#2a944e", "#3cb060", "#5ccb78", "#8ae29c"],
    gloss: 0.55, shine: 18, grain: 0.14, grainSize: 1.2, bump: 0.55, bumpSize: 0.55, belly: M.belly, lineDepth: 1.6,
  };
  m[M.back] = { ramp: ["#020a06", "#04140b", "#082012", "#0d2e1a", "#133d23", "#1a4e2d", "#226038"], gloss: 0.45, shine: 18, grain: 0.14, grainSize: 1.2, bump: 0.6, bumpSize: 0.55, lineDepth: 1.4 };
  m[M.belly] = { ramp: ["#2a3008", "#46500e", "#647016", "#849020", "#a4ae34", "#c2c850", "#dade78", "#eef0a8"], gloss: 0.3, shine: 14, grain: 0.1, bias: 0.04, lineDepth: 1 };
  m[M.horn] = { ramp: ["#2a2414", "#4a4228", "#6e6440", "#968a60", "#bcb086", "#ddd2ae", "#f4eed6"], gloss: 0.6, shine: 22, bump: 0.25, bumpSize: 0.4, lineDepth: 0.6 };
  m[M.eye] = { ramp: ["#4a4002", "#8a7a06", "#cfb810", "#ffe840", "#fffbc0"], emit: 0.82 };
  m[M.mouth] = { ramp: ["#140406", "#2a080c", "#461014", "#64181c", "#8a2a2a"], lineDepth: 0.6 };
  m[M.tooth] = { ramp: ["#5c5440", "#8a8064", "#b6ad8c", "#dcd4b6", "#f6f0dc"], gloss: 0.6, shine: 20, lineDepth: 0.4 };
  m[M.claw] = { ramp: ["#060505", "#121010", "#221e1c", "#36302c", "#5a524a"], gloss: 0.8, shine: 26, lineDepth: 0.5 };
  m[M.wing] = { ramp: ["#03100a", "#061a0e", "#0b2814", "#12381c", "#1a4a25", "#235c30"], grain: 0.25, grainSize: 0.6, lineDepth: 0.5 };
  m[M.bone] = { ramp: ["#0b361c", "#104a26", "#176032", "#1f7a40", "#2a944e", "#3cb060", "#5ccb78", "#8ae29c"], gloss: 0.5, shine: 18, lineDepth: 0.6 };
  m[M.gas] = { ramp: ["#1e4a08", "#3a7a10", "#5aa81c", "#8ad02e", "#bcf060", "#eaffb0"], emit: 0.62, grain: 0.3, grainSize: 1 };
  m[M.ivy] = { ramp: ["#0a1a08", "#14300e", "#1e4614", "#2a5e1c", "#387826", "#4c9232"], grain: 0.25, grainSize: 0.35, lineDepth: 0.4 };
  m[M.spike] = { ramp: ["#04100a", "#0a1e12", "#123020", "#1e4630", "#2e5e42", "#467a58"], gloss: 0.6, shine: 22, lineDepth: 0.5 };
  return { materials: m, outline: "#020805", bounce: { color: "#9ab860", power: 0.35 }, occlusion: 0.6, rim: { color: "#e8f8c0", power: 0.5 } };
}

// --- Pose ------------------------------------------------------------------------------------------------------------

export interface DPose {
  phase?: number;
  stride?: number;
  x?: number;
  lift?: number;
  lean?: number;
  crouch?: number;
  /** Pescoço: ergue (graus, + = mais em pé) e avança; cabeça abaixa (+). */
  neck?: number;
  reach?: number;
  nod?: number;
  gape?: number;
  /** Cauda: ângulo (graus) e varrida de lado (graus). */
  tail?: number;
  sweep?: number;
  /** Asas: batida (graus acima do horizonte) e dobradas (0..1). */
  flap?: number;
  fold?: number;
  /** Gás do sopro (0..1) e morte (tomba de lado, encolhe as pernas). */
  gas?: number;
  roll?: number;
  curl?: number;
}

const D2R = Math.PI / 180;

function mulM(a: Mat3, b: Mat3): Mat3 {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as Mat3;
}

function ik(a: V3, foot: V3, l1: number, l2: number, bend: V3): V3 {
  const af = v3.sub(foot, a);
  const d = Math.min(v3.len(af), l1 + l2 - 0.05);
  const dir = v3.norm(af);
  const perp = v3.norm(v3.sub(bend, v3.mul(dir, v3.dot(bend, dir))));
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return v3.add(a, v3.add(v3.mul(dir, x), v3.mul(perp, h)));
}

const SHOULDER_Y = 17, HIP_Y = 16, HALF = 12, GAUGE = 7;

export function greenDragon(p: DPose = {}): Sculpt {
  const sc = new Sculpt();
  const roll = p.roll ?? 0, curl = p.curl ?? 0, crouch = p.crouch ?? 0;
  const lay = Math.sin(Math.min(90, Math.abs(roll)) * D2R);
  const pivot: V3 = [0, (SHOULDER_Y + HIP_Y) / 2, 0];
  const bodyM: Mat3 = mulM(rot("x", -roll), rot("z", -(p.lean ?? 0)));
  const move: V3 = [p.x ?? 0, (p.lift ?? 0) - crouch * 4 - lay * 7, 0];
  const B = (q: V3): V3 => v3.add(turn(bodyM, q, pivot), move);

  // --- Pernas grossas com garras ---
  const stride = p.stride ?? 0, phase = p.phase ?? 0;
  for (const front of [true, false])
    for (const s of [1, -1]) {
      const top: V3 = front ? [-HALF + 1, SHOULDER_Y - 3, s * GAUGE] : [HALF + 2, HIP_Y - 2, s * GAUGE];
      const root = B(top);
      const ph = (phase + (front === (s > 0) ? 0 : 0.5)) % 1;
      const sw = ph < 0.5 ? 0.5 - ph / 0.5 : (ph - 0.5) / 0.5 - 0.5;
      const up = ph >= 0.5 ? Math.sin(((ph - 0.5) / 0.5) * Math.PI) * 3.4 : 0;
      let foot: V3 = [top[0] - 1 + sw * stride, up, s * (GAUGE + 2)];
      if (curl || lay) foot = lerp3(foot, B([top[0] + (front ? -5 : 5), top[1] - 10, s * (GAUGE + 3)]), Math.max(curl, lay * 0.8));
      const [l1, l2] = front ? [8, 8.5] : [9, 8.5];
      const ankle = v3.add(foot, [0.5, 3, 0]);
      const knee = ik(root, ankle, l1, l2, turn(bodyM, front ? [1, -0.3, 0] : [-1, -0.2, 0]));
      const part = sc.part();
      sc.cone(root, knee, front ? 4.6 : 5.6, 3.4, M.scale, { part });
      sc.ball(knee, 3.3, M.scale, part);
      sc.cone(knee, ankle, 3.2, 2.4, M.scale, { part });
      const paw = v3.add(foot, [-1.6, 1.4, 0]);
      sc.cone(ankle, paw, 2.4, 2.4, M.scale, { part });
      sc.ell(paw, [3.6, 1.6, 2.8], M.scale, { part });
      for (const t of [-1, 0, 1]) sc.cone(v3.add(paw, [-3, -0.3, t * 1.5]), v3.add(paw, [-5, -1.4, t * 1.7]), 0.7, 0.15, M.claw, { part });
    }

  sc.push(bodyM, pivot, move);
  // --- Tronco com o ventre de placas ---
  const body = sc.part();
  sc.ell([-HALF + 3, SHOULDER_Y + 1, 0], [11, 9, 8.6], M.scale, { part: body, axes: basis([1, -0.1, 0]) });
  sc.ell([2, (SHOULDER_Y + HIP_Y) / 2, 0], [13, 8, 8], M.scale, { part: body });
  sc.ell([HALF + 2, HIP_Y + 1, 0], [8, 8, 7.8], M.scale, { part: body });
  for (let k = 0; k < 6; k++) sc.ell([-14 + k * 5.4, 9.4 - Math.sin((k / 5) * Math.PI) * 0.8, 0], [2.6, 1.3, 5.6], M.belly, { part: body });
  // Dorso escuro e a fileira de espinhos.
  for (let k = 0; k < 7; k++) {
    const x = -16 + k * 5.6, y = SHOULDER_Y + 8 - Math.abs(k - 3) * 0.3;
    sc.ell([x, y - 1.2, 0], [3.4, 2, 4.6], M.back, { part: body });
    sc.cone([x, y, 0], [x + 2, y + 3.6 - (k % 2) * 0.8, 0], 1.3, 0.1, M.spike);
  }

  // --- Cauda: gomos que afinam, com espinhos e a ponta em lâmina ---
  let at: V3 = [HALF + 8, HIP_Y + 2, 0];
  let ang = p.tail ?? -14;
  const sweep = p.sweep ?? 0;
  const tailPart = sc.part();
  for (let k = 0; k < 9; k++) {
    const a = (ang + k * 3 + Math.sin(k * 0.7) * 3) * D2R, b = (sweep * (k + 1)) / 9 * D2R;
    const len = 4.3 - k * 0.16;
    const next = v3.add(at, [Math.cos(a) * Math.cos(b) * len, Math.sin(a) * len, Math.sin(b) * len * 1.4]);
    sc.cone(at, next, 5 - k * 0.5, 4.5 - k * 0.5, M.scale, { part: tailPart });
    if (k % 2 === 0 && k < 8) sc.cone(v3.add(lerp3(at, next, 0.5), [0, 4.6 - k * 0.45, 0]), v3.add(lerp3(at, next, 0.5), [1.6, 6.4 - k * 0.5, 0]), 0.9 - k * 0.06, 0.1, M.spike);
    at = next;
  }
  ang += 0;
  sc.seg(at, v3.add(at, [4, 0.6, 0]), 0.5, 2.6, M.spike, { up: [0, 0, 1] });

  // --- Asas (a de lá primeiro: o z decide) ---
  for (const s of [-1, 1]) wing(sc, s, p);

  // --- Pescoço em gomos e cabeça ---
  const raise = (p.neck ?? 40) + 20, reach = p.reach ?? 0;
  const neckPart = sc.part();
  let n: V3 = [-HALF - 4, SHOULDER_Y + 4, 0];
  const segs = 6;
  for (let k = 0; k < segs; k++) {
    const t = k / (segs - 1);
    const a = (180 - raise - 22 + t * (raise * 0.95 + 10) - (p.nod ?? 0) * t * 0.4) * D2R;
    const len = 4 + reach * 0.35;
    const next = v3.add(n, [Math.cos(a) * len, Math.sin(a) * len, 0]);
    const r = 5.2 - t * 1.6;
    sc.cone(n, next, r, r - 0.3, M.scale, { part: neckPart });
    sc.ell(v3.add(lerp3(n, next, 0.5), [0, -r * 0.6, 0]), [1.8, 1, r * 0.75], M.belly, { part: neckPart });
    // Babados da crista atrás do pescoço.
    sc.seg(v3.add(next, [0.6, r * 0.8, 0]), v3.add(next, [2.6, r + 2.2, 0]), 1.6, 0.35, M.back, { up: [0, 0, 1] });
    n = next;
  }
  const nod = (p.nod ?? 0) * D2R;
  const hd = v3.norm([-Math.cos(nod), -Math.sin(nod), 0]);
  const hc = v3.add(n, v3.mul(hd, 3));
  const hp = sc.part();
  sc.ell(hc, [4.6, 3.8, 3.8], M.scale, { part: hp, axes: basis(hd) });
  const snout0 = v3.add(hc, v3.mul(hd, 2.6));
  const snout1 = v3.add(snout0, v3.add(v3.mul(hd, 6.6), [0, -0.6, 0]));
  sc.cone(snout0, snout1, 2.9, 1.8, M.scale, { part: hp });
  for (const s of [1, -1]) sc.ball(v3.add(snout1, [0.2, 0.9, s * 1]), 0.5, M.mouth);
  // Mandíbula (abre com `gape`).
  const jawDir = turn(rot("z", (p.gape ?? 0) * 40), hd);
  const j0 = v3.add(hc, v3.add(v3.mul(hd, 1.6), [0, -2.4, 0]));
  const j1 = v3.add(j0, v3.mul(jawDir, 8));
  sc.cone(j0, j1, 2.2, 1.2, M.scale, { part: sc.part() });
  if ((p.gape ?? 0) > 0.05) sc.cone(v3.add(hc, [0, -1.6, 0]), lerp3(snout1, j1, 0.5), 1.8, 0.6, M.mouth);
  for (let k = 0; k < 4; k++) {
    for (const s of [1, -1]) {
      const q = lerp3(snout0, snout1, 0.2 + k * 0.22);
      sc.cone(v3.add(q, [0, -1.8, s * 1.4]), v3.add(q, [0.2, -3, s * 1.3]), 0.4, 0.1, M.tooth);
    }
  }
  // Olho amarelo, a sobrancelha pesada e os chifres de marfim para trás, com hera presa.
  for (const s of [1, -1]) {
    sc.ball(v3.add(hc, v3.add(v3.mul(hd, 1.6), [0, 1.4, s * 2.6])), 0.95, M.eye);
    sc.ell(v3.add(hc, v3.add(v3.mul(hd, 1.2), [0, 2.6, s * 2.4])), [2.2, 0.8, 1.2], M.back, { axes: basis(hd) });
    const h0 = v3.add(hc, [1.6, 2.6, s * 2.2]);
    sc.limb([h0, v3.add(h0, [4, 2.4, s * 1]), v3.add(h0, [7.6, 2.8, s * 1.6]), v3.add(h0, [9.6, 1.6, s * 1.8])], 1.3, 0.2, M.horn);
    sc.ell(v3.add(h0, [3, 2.2, s * 1.2]), [1.4, 0.7, 0.4], M.ivy, { axes: basis([1, 0.4, 0.3]) });
  }
  // Vapor venenoso pingando da boca e o sopro (`gas`): leque de nuvens verdes para a frente.
  const gas = p.gas ?? 0;
  sc.ball(v3.add(snout1, [0.6, -2.8, 0]), 0.7 + gas * 0.6, M.gas);
  if (gas > 0.05) {
    for (let k = 0; k < 16; k++) {
      const t = (k % 8) / 7, row = Math.floor(k / 8);
      const d = v3.add(v3.mul(hd, 4 + t * 17 * gas), [0, -t * 9 * gas - row * 2, ((k * 7) % 5 - 2) * t * 3]);
      sc.ball(v3.add(snout1, d), (1.2 + t * 3.4) * (0.6 + gas * 0.4), M.gas);
    }
  }
  sc.pop();
  return sc;
}

/** Asa de morcego do lado `s`: braço até o pulso, três dedos compridos e a membrana em leque entre eles. */
function wing(sc: Sculpt, s: number, p: DPose) {
  const flap = (p.flap ?? 30) * D2R, fold = p.fold ?? 0.6;
  // Envergadura `d` (sobe com a batida e dobra para trás), `c` para a cauda, `n` normal da asa.
  const back = fold * 1.1;
  const d = v3.norm([Math.sin(back) * 0.9, Math.sin(flap), s * Math.cos(flap) * Math.cos(back)]);
  const c = v3.norm(v3.sub([1, -0.15, 0], v3.mul(d, d[0])));
  const n = v3.norm(v3.cross(d, c));
  const sh: V3 = [-HALF + 1, SHOULDER_Y + 7, s * 6];
  const elbow = v3.add(sh, v3.add(v3.mul(d, 11 * (1 - fold * 0.3)), v3.mul(c, -2 + fold * 3)));
  const wrist = v3.add(elbow, v3.add(v3.mul(d, 10 * (1 - fold * 0.45)), v3.mul(c, -3 + fold * 7)));
  const part = sc.part();
  sc.cone(sh, elbow, 2.4, 1.8, M.bone, { part });
  sc.cone(elbow, wrist, 1.8, 1.3, M.bone, { part });
  sc.cone(wrist, v3.add(wrist, v3.add(v3.mul(d, 2), v3.mul(c, -1.6))), 0.9, 0.15, M.claw, { part });
  // Dedos em leque e a membrana entre eles (lâminas finas, uma sobre a outra).
  const tips: V3[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (12 + k * 32 + fold * 30) * D2R;
    const dir = v3.norm(v3.add(v3.mul(d, Math.cos(a)), v3.mul(c, Math.sin(a))));
    const len = (19 - k * 3.5) * (1 - fold * 0.4);
    const tip = v3.add(wrist, v3.mul(dir, len));
    tips.push(tip);
    sc.cone(wrist, v3.add(tip, v3.mul(n, 0.6)), 1.1, 0.4, M.bone, { part: sc.part() });
  }
  const panel = (a: V3, b: V3, cc: V3) => {
    const mid = v3.mul(v3.add(v3.add(a, b), cc), 1 / 3);
    const ax = v3.norm(v3.sub(b, a));
    const span = v3.len(v3.sub(b, a)) / 2 + 1;
    const across = v3.len(v3.sub(cc, lerp3(a, b, 0.5)));
    sc.ell(mid, [span, 0.35, across * 0.62], M.wing, { axes: [ax, n, v3.norm(v3.cross(ax, n))], part: sc.part() });
  };
  panel(wrist, tips[0], tips[1]);
  panel(wrist, tips[1], tips[2]);
  // A última parte da membrana vai do último dedo até o flanco.
  const flank: V3 = [4, SHOULDER_Y + 5, s * 6];
  panel(wrist, tips[2], flank);
  panel(sh, wrist, flank);
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

export const DRAGON_SIZE = 192;
export const DRAGON_FEET = DRAGON_SIZE - 40;
const PITCH = 36;
const SCALE = 1.5;
const YAW: Record<View, number> = { side: 16, front: 90, back: -90 };

export function shootDragon(pose: DPose, view: View): Frame {
  const cx = view === "side" ? DRAGON_SIZE / 2 + 18 : DRAGON_SIZE / 2;
  return render(greenDragon(pose), { size: DRAGON_SIZE, feet: DRAGON_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, look());
}

// --- Poses -----------------------------------------------------------------------------------------------------------

const DEF: DPose = { phase: 0, stride: 0, x: 0, lift: 0, lean: 0, crouch: 0, neck: 40, reach: 0, nod: 0, gape: 0, tail: -14, sweep: 0, flap: 30, fold: 0.6, gas: 0, roll: 0, curl: 0 };
const K = (p: DPose): DPose => ({ ...DEF, ...p });

/**
 * Golpe: a mordida (o pescoço avança e a mandíbula fecha). Especial: o Sopro Venenoso (recolhe o pescoço, enche o
 * peito, abre a boca e solta o leque de gás) e o Gás dos Menires. 2ª habilidade (`skill`): o Voo (abre as asas e bate
 * forte, o corpo sobe). A Rabada sai do golpe, com a cauda varrendo.
 */
export const DRAGON_POSES = {
  idle: tween([0, 1, 2].map((k) => K({ lift: k * 0.3, neck: 40 + k * 2, nod: 4 - k * 2, gape: k * 0.08, tail: -14 + k, sweep: k * 3 - 3, flap: 26 + k * 3, fold: 0.62 - k * 0.03 })), 6, true),
  walk: Array.from({ length: 8 }, (_, k) => {
    const w = Math.sin((k / 8) * Math.PI * 4);
    return K({ phase: k / 8, stride: 10, lift: 0.6 + w * 0.6, lean: w * 0.8, neck: 36 - w * 2, nod: 4 + w * 2, tail: -12 + w * 2, sweep: Math.sin((k / 8) * Math.PI * 2) * 8, flap: 28 + w * 4, fold: 0.6 });
  }),
  attack: tween([
    K({ neck: 50, nod: -10, gape: 0.3, reach: -2, sweep: -8 }),
    K({ neck: 56, nod: -18, gape: 1, reach: -3, crouch: 0.3, sweep: -14, flap: 40 }),
    K({ neck: 18, nod: 14, gape: 1, reach: 6, x: -4, lean: -4, sweep: 10 }),
    K({ neck: 22, nod: 10, gape: 0.1, reach: 5, x: -4, lean: -3, sweep: 24 }),
    K({ neck: 38, nod: 4, gape: 0.1, sweep: 6 }),
  ], 6),
  special: tween([
    K({ neck: 60, nod: -20, gape: 0.2, reach: -3, lean: 6, flap: 46, fold: 0.4 }),
    K({ neck: 62, nod: -24, gape: 0.6, reach: -3, lean: 8, lift: 1, flap: 56, fold: 0.3 }),
    K({ neck: 26, nod: 10, gape: 1, reach: 4, lean: -4, x: -2, gas: 0.6, flap: 34, fold: 0.4 }),
    K({ neck: 24, nod: 12, gape: 1, reach: 5, lean: -4, x: -2, gas: 1, flap: 30, fold: 0.45 }),
    K({ neck: 36, nod: 6, gape: 0.3, gas: 0.3 }),
  ], 6),
  skill: tween([
    K({ crouch: 0.6, neck: 50, nod: -6, flap: 70, fold: 0.1, gape: 0.4 }),
    K({ lift: 6, lean: 10, neck: 54, nod: -12, flap: -20, fold: 0, gape: 0.6, tail: -30 }),
    K({ lift: 12, lean: 14, neck: 48, nod: -8, flap: 60, fold: 0.15, gape: 0.3, tail: -36, curl: 0.4 }),
    K({ lift: 16, lean: 10, neck: 44, flap: -10, fold: 0, gape: 0.5, tail: -30, curl: 0.5 }),
  ], 6),
  death: tween([
    K({ lean: 14, lift: 2, neck: 70, nod: -30, gape: 1, flap: 70, fold: 0.1, tail: -4 }),
    K({ roll: 45, crouch: 0.5, neck: 20, nod: 20, gape: 0.6, flap: 10, fold: 0.5, curl: 0.4, tail: -20 }),
    K({ roll: 90, neck: 4, nod: 30, gape: 0.4, flap: -10, fold: 0.3, curl: 0.2, tail: -24, sweep: 20 }),
  ], 5),
};
