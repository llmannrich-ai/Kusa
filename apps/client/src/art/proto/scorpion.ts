import { SCULPT_FEET, SCULPT_SIZE, Sculpt, basis, lerp3, render, rot, turn, v3, type Frame, type Look, type Material, type Mat3, type V3, type View } from "./sculpt.ts";

/**
 * Escorpião da Areia esculpido por código (`sculpt.ts`), piloto do padrão de arte por escultura (`docs/ARTE_ESCULTURA.md`).
 * Anatomia de escorpião de verdade: carapaça com o par de olhos do meio e os dos lados, quelíceras, pedipalpos com a
 * pinça (o dedo móvel abre), 4 pares de patas, o mesossoma em 7 placas, a cauda (metassoma) em 5 gomos e o télson com
 * a vesícula de veneno e o ferrão. Olha para a esquerda (x negativo), chão em y = 0.
 *
 * O mesmo modelo, com outra casca (`SHELLS`), serve ao Escorpião Negro Gigante.
 */

// --- Materiais -----------------------------------------------------------------------------------------------------

/** Casca: as rampas (do escuro ao claro, com o matiz deslocado: sombra puxa para o vinho, luz para o amarelo). */
export interface Shell {
  chitin: readonly string[];
  legs: readonly string[];
  claw: readonly string[];
  tips: readonly string[];
  belly: readonly string[];
  vesicle: readonly string[];
  outline: string;
}

export const SHELLS = {
  amber: {
    chitin: ["#14070c", "#260c10", "#3d1412", "#592013", "#773015", "#964519", "#b25f22", "#cc8236", "#e6b062"],
    legs: ["#2a1610", "#4a2a16", "#704420", "#96632c", "#b8853c", "#d3a653", "#e8c776", "#f7e4a8"],
    claw: ["#1a0910", "#331012", "#521c13", "#772c15", "#9c431a", "#bd6122", "#d78533", "#ebb35c", "#fbe3a6"],
    tips: ["#0d0709", "#1d0f0d", "#331a12", "#4c2716", "#68371c", "#8a4d27"],
    belly: ["#3a2116", "#5f3e27", "#86613d", "#ab8556", "#cba872", "#e4c895"],
    vesicle: ["#2a0e10", "#4a1913", "#702a16", "#94401b", "#b55c24", "#d17f36", "#e9ab5c"],
    outline: "#1a0c08",
  },
  black: {
    chitin: ["#050408", "#0c0a12", "#16121e", "#211b2c", "#2e263d", "#3e3452", "#54476c", "#73648f", "#a495c0"],
    legs: ["#07060a", "#110e17", "#1c1724", "#2a2335", "#3a3149", "#4f4462", "#6c5f83"],
    claw: ["#050408", "#0e0b14", "#1a1522", "#272033", "#362d47", "#493e5f", "#62567d", "#8678a3", "#bfb2dc"],
    tips: ["#040305", "#0b080d", "#140f17", "#1f1823", "#2c2331", "#3d3243"],
    belly: ["#1a1414", "#2c2324", "#3f3436", "#56494a", "#6e6061"],
    vesicle: ["#1a0708", "#360d0e", "#581514", "#7e221b", "#a43625", "#c85536"],
    outline: "#030205",
  },
} satisfies Record<string, Shell>;

const M = { chitin: 0, legs: 1, claw: 2, tips: 3, eye: 4, belly: 5, vesicle: 6, venom: 7, sting: 8 } as const;

function look(shell: Shell): Look {
  const materials: Material[] = [];
  materials[M.chitin] = { ramp: shell.chitin, gloss: 0.55, shine: 18, grain: 0.16, grainSize: 2.4, belly: M.belly, bump: 0.5, bumpSize: 0.9, speck: 0.05 };
  materials[M.legs] = { ramp: shell.legs, gloss: 0.35, shine: 14, grain: 0.08, bias: -0.04, speck: 0.08 };
  materials[M.claw] = { ramp: shell.claw, gloss: 0.8, shine: 22, grain: 0.12, grainSize: 1.8, belly: M.belly, bump: 0.35, bumpSize: 0.8, speck: 0.06 };
  materials[M.tips] = { ramp: shell.tips, gloss: 0.6, shine: 30 };
  materials[M.eye] = { ramp: ["#020102", "#0a0607", "#160d0e", "#2a1d1d", "#fff4d8"], gloss: 2.5, shine: 60, bias: -0.25 };
  materials[M.belly] = { ramp: shell.belly, grain: 0.1, bias: 0.05 };
  materials[M.vesicle] = { ramp: shell.vesicle, gloss: 0.9, shine: 26, grain: 0.06 };
  materials[M.venom] = { ramp: ["#173009", "#2f5c12", "#4f8f1c", "#79c22b", "#b0ec58", "#e6ffb0"], gloss: 1.4, shine: 40, bias: 0.1 };
  materials[M.sting] = { ramp: ["#080405", "#170a0a", "#2a110e", "#421a12", "#5e2716", "#8a4422"], gloss: 0.9, shine: 40 };
  return { materials, outline: shell.outline, bounce: { color: "#f0b46a", power: 0.55 }, occlusion: 0.6 };
}

// --- Pose ------------------------------------------------------------------------------------------------------------

export interface Pose {
  /** Fase do passo (0..1) e quanto anda (0 = parado). */
  phase?: number;
  stride?: number;
  /** Fôlego: o corpo sobe e desce um pouco (unidades). */
  lift?: number;
  /** Corpo para a frente (negativo = para a esquerda, para onde olha). */
  shift?: number;
  /** Inclinação do corpo (graus; positivo = a frente sobe). */
  lean?: number;
  /** Ângulo da base da cauda (graus a partir de trás, subindo) e a curva de cada junta. */
  tail?: number;
  curl?: readonly number[];
  /** Ferrão: quanto avança o télson (graus a mais na ponta). */
  sting?: number;
  /** Pinças: abertura (0..1), quanto esticam para a frente e quanto sobem. */
  open?: number;
  reach?: number;
  raise?: number;
  /** Morte: rolar o corpo (graus em volta do comprimento) e encolher as patas (0..1). */
  roll?: number;
  curlLegs?: number;
  /** Gota de veneno na ponta do ferrão. */
  venom?: boolean;
}

const D2R = Math.PI / 180;
const dir2 = (deg: number): V3 => [Math.cos(deg * D2R), Math.sin(deg * D2R), 0];

/** Monta a escultura do escorpião na pose. */
export function scorpion(pose: Pose = {}): Sculpt {
  const sc = new Sculpt();
  const lift = pose.lift ?? 0, shift = pose.shift ?? 0, lean = pose.lean ?? 0, roll = pose.roll ?? 0, curlLegs = pose.curlLegs ?? 0;
  // Corpo: inclina em volta do meio, rola (morte) em volta do comprimento e cai até encostar no chão de costas.
  const pivot: V3 = [-8, 11, 0];
  const lay = Math.sin(Math.min(180, Math.abs(roll)) * D2R / 2) ** 2;
  const bodyM: Mat3 = mulM(rot("x", roll), rot("z", -lean));
  const B = (p: V3): V3 => v3.add(turn(bodyM, p, pivot), [shift, lift - lay * 3.5, 0]);

  // --- Patas: o quadril vai com o corpo e o pé fica no chão (fora do `push`, para o chão não rolar junto) ---
  const stride = pose.stride ?? 0, phase = pose.phase ?? 0;
  const hips = [-23, -17.5, -12, -6.5];
  const reachX = [-17, -7, 8, 18];
  const spread = [26, 30, 30, 27];
  for (const s of [1, -1])
    for (let i = 0; i < 4; i++) {
      const hip: V3 = [hips[i], 8.5, s * 6.5];
      // Tetrápode: 1ª e 3ª de um lado andam junto com a 2ª e a 4ª do outro.
      const p = (phase + ((i % 2 === 0) === (s > 0) ? 0 : 0.5)) % 1;
      const sw = p < 0.5 ? p / 0.5 - 0.5 : 0.5 - (p - 0.5) / 0.5;
      const up = p >= 0.5 ? Math.sin(((p - 0.5) / 0.5) * Math.PI) * 4 : 0;
      let foot: V3 = [hips[i] + reachX[i] + sw * stride, up, s * spread[i]];
      // O joelho sobe e dobra para o lado em que a pata abre (as da frente para a frente, as de trás para trás): de
      // cima, a dobra aparece como um arco.
      let kneeDir: V3 = [Math.sign(reachX[i]) * (i === 1 || i === 2 ? 0.8 : 1.2), 0.75, s * 0.55];
      // Morto: os pés encolhem para a barriga (que fica para cima) e vão junto com o corpo.
      if (curlLegs) {
        const tucked: V3 = [hips[i] + reachX[i] * 0.4, 9.5 - 9 * curlLegs, s * (spread[i] * 0.5)];
        foot = B(lerp3(foot, tucked, curlLegs));
        kneeDir = [0, 1 - 1.6 * curlLegs, s];
      }
      leg(sc, B(hip), foot, i, v3.norm(turn(bodyM, kneeDir)));
    }
  sc.push(bodyM, pivot, [shift, lift - lay * 3.5, 0]);

  // --- Mesossoma: corpo em 7 placas, com a quilha no meio ---
  const bodyPart = sc.part();
  sc.ell([2, 10.5, 0], [17, 5.6, 11.5], M.chitin, { part: bodyPart, band: { n: 7, depth: 0.2 } });
  for (let k = 0; k < 7; k++) {
    const x = -11.5 + k * 4.9;
    const w = 11.6 - Math.abs(k - 2.5) * 0.55 - (k > 4 ? (k - 4) * 1.2 : 0);
    sc.ell([x + 1.2, 12.6 + Math.sin((k / 6) * Math.PI) * 1.2, 0], [3.3, 3.6, w], M.chitin, { part: bodyPart });
  }
  // --- Prossoma (carapaça), olhos e quelíceras ---
  const headPart = sc.part();
  sc.ell([-20, 11.6, 0], [10.5, 5.8, 10.4], M.chitin, { part: headPart, axes: basis([1, 0.12, 0]) });
  sc.ell([-21, 15, 0], [6.5, 2.4, 5.2], M.chitin, { part: headPart });
  sc.ell([-22.5, 16.6, 0], [2.6, 1.6, 2.6], M.chitin, { part: headPart });
  for (const s of [1, -1]) {
    sc.ball([-23.6, 17.6, s * 1.35], 1.25, M.eye);
    for (let k = 0; k < 3; k++) sc.ball([-28.6 - k * 0.9, 14.3 - k * 0.35, s * (6.4 - k * 0.6)], 0.75, M.eye);
    sc.ell([-30.5, 9, s * 2.4], [3.2, 2.2, 2], M.claw, { axes: basis([-1, -0.3, 0]) });
    sc.cone([-33, 8.4, s * 2.2], [-34.6, 7.2, s * 1.4], 1, 0.5, M.tips);
  }

  // --- Pinças (pedipalpos) ---
  const open = pose.open ?? 0.2, reach = pose.reach ?? 0, raise = pose.raise ?? 0;
  for (const s of [1, -1]) {
    const part = sc.part();
    const sh: V3 = [-27, 10, s * 6];
    const elbow: V3 = [-31 - reach * 2, 13 + raise * 3, s * 15.5];
    const wrist: V3 = [-42 - reach * 7, 13 + raise * 7, s * (17 - reach * 1.5)];
    sc.limb([sh, elbow, wrist], 2.6, 2.4, M.claw, { part, joint: M.claw });
    const fwd = v3.norm([-1, -0.06 + raise * 0.25, -s * 0.32]);
    const hand = v3.add(wrist, v3.mul(fwd, 7.4));
    sc.ell(hand, [8.2, 4.9, 5.4], M.claw, { part, axes: basis(fwd, [0, 1, s * 0.25]) });
    // Dedos: o fixo por baixo, o móvel por cima, abrindo num plano meio de pé (lê de perfil e de frente).
    const tip = v3.add(hand, v3.mul(fwd, 6.8));
    const [u, vv] = basis(fwd, [0, 1, s * 0.5]);
    const finger = (deg: number, side: number) => {
      const a = deg * D2R;
      const d = v3.norm(v3.add(v3.mul(u, Math.cos(a)), v3.mul(vv, Math.sin(a))));
      const base = v3.add(tip, v3.mul(vv, side * 1.7));
      const mid = v3.add(base, v3.mul(d, 6));
      // A ponta curva para dentro (para o outro dedo).
      const end = v3.add(mid, v3.add(v3.mul(d, 4.6), v3.mul(vv, -side * 1.8)));
      sc.cone(base, mid, 2.3, 1.5, M.claw, { part });
      sc.cone(mid, end, 1.5, 0.45, M.tips, { part });
    };
    const ang = 4 + open * 42;
    finger(-6, -1);
    finger(ang, 1);
  }

  // --- Cauda: 5 gomos em arco por cima das costas, a vesícula e o ferrão ---
  const tailPart = sc.part();
  const curl = pose.curl ?? [27, 25, 24, 22];
  const lens = [8.6, 8.6, 9, 9.6, 10.4];
  const ry = [4.7, 4.4, 4.2, 4.1, 4.3];
  let at: V3 = [17, 11.5, 0];
  let ang = pose.tail ?? 52;
  for (let k = 0; k < 5; k++) {
    if (k > 0) ang += curl[k - 1] ?? 0;
    const next = v3.add(at, v3.mul(dir2(ang), lens[k]));
    sc.seg(at, next, ry[k], ry[k] * 1.12, M.chitin, { part: tailPart, over: 1.6, band: { n: 1, depth: 0.22 }, up: [0, 0, 1] });
    sc.ball(next, ry[k] * 0.72, M.legs, tailPart);
    at = next;
  }
  const tAng = ang + 34 + (pose.sting ?? 0);
  const vesEnd = v3.add(at, v3.mul(dir2(tAng), 9.5));
  sc.seg(at, vesEnd, 4.6, 4.4, M.vesicle, { part: tailPart, over: 0.6, up: [0, 0, 1] });
  const bend = tAng + 48;
  const s1 = v3.add(vesEnd, v3.mul(dir2(tAng + 12), 4));
  const s2 = v3.add(s1, v3.mul(dir2(bend - 10), 4.2));
  const s3 = v3.add(s2, v3.mul(dir2(bend + 25), 3.2));
  sc.cone(v3.add(vesEnd, v3.mul(dir2(tAng), -2)), s1, 2.6, 1.7, M.sting, { part: tailPart });
  sc.cone(s1, s2, 1.7, 0.9, M.sting, { part: tailPart });
  sc.cone(s2, s3, 0.9, 0.25, M.sting, { part: tailPart });
  if (pose.venom) sc.ball(v3.add(s3, v3.mul(dir2(bend + 25), 1.4)), 1.5, M.venom);

  sc.pop();
  return sc;
}

function mulM(a: Mat3, b: Mat3): Mat3 {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as Mat3;
}

/** Pata em 3 partes (fêmur, tíbia e tarso) por cinemática inversa: o joelho sobe e abre para fora (`knee`, no corpo). */
function leg(sc: Sculpt, hip: V3, foot: V3, i: number, kneeDir: V3) {
  const l1 = 14 + i * 0.6, l2 = 17.5 + i * 0.8;
  const hf = v3.sub(foot, hip);
  const d = Math.min(v3.len(hf), l1 + l2 - 0.2);
  const dirHF = v3.norm(hf);
  const perp = v3.norm(v3.sub(kneeDir, v3.mul(dirHF, v3.dot(kneeDir, dirHF))));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const knee = v3.add(hip, v3.add(v3.mul(dirHF, a), v3.mul(perp, h)));
  const end = v3.add(hip, v3.mul(dirHF, d));
  const ankle = v3.add(lerp3(knee, end, 0.68), v3.mul(perp, 1.4));
  const part = sc.part();
  sc.cone(hip, knee, 2.6, 2.1, M.legs, { part });
  sc.ball(knee, 2.25, M.legs, part);
  sc.cone(knee, ankle, 2.1, 1.5, M.legs, { part, band: { n: 1, depth: -0.08 } });
  sc.ball(ankle, 1.5, M.tips, part);
  sc.cone(ankle, end, 1.4, 0.6, M.tips, { part });
}

// --- Quadros -------------------------------------------------------------------------------------------------------

const PITCH = 42;
/** Px por unidade do modelo. */
const SCALE = 1.22;
const YAW: Record<View, number> = { side: 10, front: 90, back: -90 };

export function shootScorpion(pose: Pose, view: View, shell: Shell = SHELLS.amber): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 20 : SCULPT_SIZE / 2;
  return render(scorpion(pose), { size: SCULPT_SIZE, feet: SCULPT_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, look(shell));
}

const WALK_STRIDE = 7;
/** Poses de cada clipe (perfil), na ordem da folha. */
export const SCORPION_POSES = {
  idle: [0, 1, 2, 1].map((k): Pose => ({ lift: k * 0.35, curl: [27, 25 + k * 0.6, 24 + k * 0.6, 22], open: 0.2 + k * 0.06 })),
  walk: [0, 0.25, 0.5, 0.75].map((phase, k): Pose => ({
    phase, stride: WALK_STRIDE, lift: k % 2 ? 0.8 : 0, curl: [27, 25 + (k % 2 ? 1.5 : -1), 24, 22], tail: 52 + (k % 2 ? 2 : 0), open: 0.15, reach: k % 2 ? 0.1 : 0,
  })),
  // Golpe: arma as pinças abertas, avança fechando, o ferrão espeta por cima e volta.
  attack: [
    { shift: 2, lean: 4, open: 1, reach: -0.3, raise: 0.5, curl: [30, 28, 26, 24], tail: 56 },
    { shift: -5, lean: -3, open: 0.05, reach: 1.1, raise: 0.2, curl: [26, 24, 22, 20], tail: 50 },
    { shift: -4, lean: -5, open: 0.1, reach: 0.8, curl: [16, 18, 14, 12], tail: 46, sting: 18, venom: true },
    { shift: -1, lean: 0, open: 0.4, reach: 0.2, curl: [25, 24, 23, 21], tail: 52 },
  ] satisfies Pose[],
  // Especial: ergue a frente com as pinças abertas para cima, arma a cauda para trás e crava o ferrão na frente.
  special: [
    { lean: 12, lift: 2, open: 1, raise: 1, reach: 0.2, curl: [30, 30, 28, 26], tail: 62 },
    { lean: 14, lift: 2.5, open: 1, raise: 1.1, reach: 0.1, curl: [22, 20, 16, 12], tail: 70, venom: true },
    { lean: -6, shift: -4, open: 0.6, raise: 0.3, reach: 0.6, curl: [14, 14, 12, 10], tail: 42, sting: 30, venom: true },
    { lean: 2, open: 0.5, raise: 0.2, curl: [26, 25, 23, 21], tail: 54 },
  ] satisfies Pose[],
  // Morte: tranco para trás, rola de lado e fica de costas, patas encolhidas e a cauda mole.
  death: [
    { lean: 16, lift: 3, open: 1, raise: 0.9, curl: [32, 30, 28, 26], tail: 64, stride: 0 },
    { roll: 95, lift: 4, shift: -8, curlLegs: 0.5, open: 0.6, curl: [24, 22, 18, 16], tail: 46 },
    { roll: 180, shift: -12, curlLegs: 1, open: 0.3, curl: [14, 12, 10, 10], tail: 20 },
  ] satisfies Pose[],
};
