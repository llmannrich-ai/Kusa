import { Sculpt, applySkin, basis, lerp3, render, rot, turn, v3, type Frame, type Look, type Material, type Mat3, type Paint, type Skin, type V3, type View } from "./sculpt.ts";

/**
 * Vorgak, o Senhor da Brasa: o boss da Fortaleza Orc, esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`).
 *
 * Um orc enorme de pele cinza-musgo, numa armadura de ferro enegrecido com friso de latão: elmo de chifres curvos com a
 * viseira em fenda (os olhos acesos lá dentro), ombreiras de espigões, peitoral marcado por três garras em brasa, saiote
 * de placas, grevas e o manto de pele de lobo sobre os ombros. Nas costas, o estandarte do clã (a caveira chifruda em
 * pano vermelho, com uma caveira de verdade na ponta da haste). Na mão de cá, o Cutelo de Brasa: a lâmina de cutelo com
 * o fio em brasa viva, que pulsa; na de lá, a corrente de ferro enrolada no antebraço, com o gancho solto.
 *
 * Esqueleto em hierarquia como o do Orc batedor (`orc.ts`): pelve → tronco → cabeça e braços (ombro → cotovelo →
 * punho → cutelo ou corrente); pernas por cinemática inversa. Olha para a esquerda (x negativo é a frente), y para cima,
 * z para o lado de quem olha no perfil; chão em y = 0.
 *
 * O que se mexe com atraso (follow-through): o manto, o estandarte (haste e pano, que ondula), o rabo de cabelo do
 * elmo, as placas do saiote e a corrente. A brasa do cutelo e das garras pulsa (`flicker`) e se apaga na morte (`glow`).
 */

// --- Materiais -----------------------------------------------------------------------------------------------------

const M = {
  skin: 0, skinDark: 1, iron: 2, ironDark: 3, brass: 4, leather: 5, fur: 6, furDark: 7, cloth: 8, bone: 9, eye: 10,
  mouth: 11, ember: 12, emberHot: 13, ash: 14, wood: 15, chain: 16, hair: 17, cooled: 18, eyeOff: 19,
} as const;

/** Pele cinza-musgo (mais escura e fria que a do clã do brejo): o senhor nunca sai do castelo. */
const SKIN = ["#0e0f10", "#17191a", "#21261f", "#2c3426", "#38432d", "#465334", "#55643c", "#667546", "#7a8752", "#929d63", "#adb57e"];
const IRON = ["#09090c", "#111216", "#191b21", "#22252c", "#2d3139", "#393e47", "#484e58", "#5c636e", "#757c87", "#979ea8", "#c4c9cf"];
const EMBER = ["#3a0c02", "#6a1803", "#9c2a05", "#cf4a0a", "#f07818", "#ffa83a", "#ffd27a", "#fff2c8"];

function look(): Look {
  const m: Material[] = [];
  m[M.skin] = { ramp: SKIN, gloss: 0.16, shine: 10, grain: 0.12, grainSize: 3.2, bump: 0.24, bumpSize: 1.8, speck: 0.03 };
  m[M.skinDark] = { ramp: SKIN, gloss: 0.1, grain: 0.14, grainSize: 2, bump: 0.3, bumpSize: 1.2, bias: -0.14 };
  m[M.iron] = { ramp: IRON, gloss: 1.1, shine: 26, grain: 0.14, grainSize: 1.1, bump: 0.12, bumpSize: 2.4, speck: 0.07, bias: 0.08 };
  m[M.ironDark] = { ramp: IRON, gloss: 0.8, shine: 22, grain: 0.18, grainSize: 0.9, speck: 0.1, bias: -0.16 };
  m[M.brass] = { ramp: ["#1f1405", "#3e2a0a", "#6a4a14", "#97701f", "#c19a35", "#e2c264", "#fbeaa8"], gloss: 1.5, shine: 28, grain: 0.1, grainSize: 0.8 };
  m[M.leather] = { ramp: ["#120a07", "#1f120c", "#2e1b11", "#402617", "#55331e", "#6c4227", "#855533"], gloss: 0.2, shine: 12, grain: 0.2, grainSize: 1.2, speck: 0.05 };
  m[M.fur] = { ramp: ["#0f0c0b", "#1b1613", "#29211b", "#382d24", "#4a3c30", "#5f4d3d", "#77624d", "#927b62"], grain: 0.55, grainSize: 0.7, bump: 0.5, bumpSize: 0.9, speck: 0.12 };
  m[M.furDark] = { ...m[M.fur], bias: -0.18 };
  m[M.cloth] = { ramp: ["#140405", "#250708", "#3b0b0b", "#550f0e", "#701612", "#8c1f17", "#a92d1f", "#c4432c"], grain: 0.26, grainSize: 1.6, speck: 0.07 };
  m[M.bone] = { ramp: ["#231a13", "#3d3125", "#5c4d3a", "#7d6c53", "#9f8d6f", "#bfae8d", "#dccfae", "#f3ead0"], gloss: 0.3, shine: 14, grain: 0.16, grainSize: 1, speck: 0.05 };
  m[M.eye] = { ramp: EMBER, glow: 0.7, gloss: 2, shine: 50 };
  m[M.eyeOff] = { ramp: ["#0b0606", "#170b09", "#24100c", "#331610"], bias: -0.2 };
  m[M.mouth] = { ramp: ["#0c0405", "#1b0708", "#2e0c0c", "#481411", "#631d16"], bias: -0.1 };
  m[M.ember] = { ramp: EMBER, emit: 0.62 };
  m[M.emberHot] = { ramp: EMBER, emit: 0.86 };
  m[M.cooled] = { ramp: ["#0d0b0b", "#1a1514", "#2a211d", "#3b2c24", "#4d382b"], gloss: 0.5, shine: 18, grain: 0.3, grainSize: 0.7 };
  m[M.ash] = { ramp: ["#2a2622", "#48423b", "#6a635a", "#8f877c", "#b3ab9e", "#d6cfc2"], grain: 0.22, grainSize: 0.8, gloss: 0.05 };
  m[M.wood] = { ramp: ["#100906", "#1d110b", "#2c1a10", "#3d2516", "#51321d", "#684226"], grain: 0.3, grainSize: 0.6 };
  m[M.chain] = { ramp: IRON, gloss: 1.4, shine: 30, grain: 0.1, grainSize: 0.5, bias: 0.05 };
  m[M.hair] = { ramp: ["#050506", "#0b0b0e", "#141419", "#1e1f26", "#2b2d36", "#3f4250"], gloss: 0.6, shine: 16, grain: 0.4, grainSize: 0.5, bias: -0.1 };
  for (const mat of m) mat.lineDepth = 1.4;
  return {
    materials: m, outline: "#08080a", occlusion: 0.62, shadow: 0.62,
    // Fim de tarde no castelo: o fogo das fogueiras rebate por baixo, quente; a borda de trás pega o céu frio.
    bounce: { color: "#b8642e", power: 0.34 },
    rim: { color: "#c8dcf0", power: 0.5 },
  };
}

// --- Pose ------------------------------------------------------------------------------------------------------------

export interface Foot { at: V3; toe?: number }
export interface Arm { swing: number; out: number; elbow: number; wrist?: number }

export interface WarlordPose {
  hip?: V3;
  lean?: number;
  twist?: number;
  hipTwist?: number;
  sway?: number;
  breath?: number;
  pitch?: number;
  yaw?: number;
  tilt?: number;
  jaw?: number;
  /** Atrasos (graus): manto, haste do estandarte, rabo de cabelo do elmo, saiote de placas e corrente. */
  cape?: number;
  pole?: number;
  hair?: number;
  tasset?: number;
  chain?: number;
  /** Pano do estandarte: fase da onda (0..1) e força. */
  wave?: number;
  flap?: number;
  footL?: Foot;
  footR?: Foot;
  /** Braço de cá (o cutelo) e o de lá (a corrente). */
  armL?: Arm;
  armR?: Arm;
  /** Giro do cutelo na mão (graus). Fora da mão: `axeAt` o crava no chão (morte). */
  axe?: number;
  axeAt?: { at: V3; spin: number };
  /** Brasa: 1 acesa, 0 apagada (morte); `flicker` é a fase do pulsar (0..1). */
  glow?: number;
  flicker?: number;
  /** Morte: o corpo tomba (graus, para a frente) em volta dos joelhos. */
  fall?: number;
}

type Full = Required<Omit<WarlordPose, "axeAt">> & Pick<WarlordPose, "axeAt">;

const D2R = Math.PI / 180;
const mulM = (a: Mat3, b: Mat3): Mat3 => {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as Mat3;
};

/** Pose parada: base larga, tronco para a frente, o cutelo atravessado à frente do corpo e o punho de lá cerrado. */
export const REST: Full = {
  hip: [0, 0, 0], lean: 14, twist: 0, hipTwist: 0, sway: 0, breath: 0, pitch: -8, yaw: 0, tilt: 0, jaw: 0.1,
  cape: 0, pole: 0, hair: 0, tasset: 0, chain: 0, wave: 0, flap: 1,
  footL: { at: [-12, 0, 9], toe: 0 }, footR: { at: [11, 0, -9], toe: 0 },
  armL: { swing: 14, out: 14, elbow: 50, wrist: 0 }, armR: { swing: 6, out: 16, elbow: 40, wrist: 6 },
  axe: 60, axeAt: undefined, glow: 1, flicker: 0, fall: 0,
};

const PELVIS_Y = 40;

/**
 * Variante gigante (Kragmor, o Gigante da Cratera, nos Ermos Rubros): o mesmo esqueleto e a mesma armadura, sem o
 * estandarte, sem o elmo (a cabeça nua de pedra, com a testa pesada, as placas de rocha no crânio e a barba) e com o
 * martelo de forja no lugar do cutelo. Vale durante um `shootWarlord(..., "giant")` (o desenho é síncrono).
 */
export type WarlordVariant = "warlord" | "giant";
let variant: WarlordVariant = "warlord";

// --- Escultura -------------------------------------------------------------------------------------------------------

export function warlord(pose: WarlordPose = {}): Sculpt {
  const p: Full = { ...REST, ...pose };
  const sc = new Sculpt();
  const hot = p.glow > 0.5;
  /** Brasa: o fio alterna entre o tom vivo e o mais quente em manchas que correm com `flicker`; apagada, é ferro frio. */
  const ember = (k: number) => {
    if (!hot) return M.cooled;
    const n = Math.sin(k * 2.7 + p.flicker * Math.PI * 2) + Math.sin(k * 1.3 - p.flicker * Math.PI * 4) * 0.6;
    return n > 0.35 ? M.emberHot : M.ember;
  };

  // Morte: o tronco tomba para a frente em volta dos joelhos (ajoelhado).
  sc.push(rot("z", p.fall), [-6, 10, 0]);

  const pelvis: V3 = [1 + p.hip[0], PELVIS_Y + p.hip[1], p.hip[2]];
  const pelvisM = rot("y", -p.hipTwist);
  const hipJoint = (s: number): V3 => v3.add(turn(pelvisM, [0.5, -3, s * 6.8]), pelvis);
  leg(sc, hipJoint(1), p.footL, 1);
  leg(sc, hipJoint(-1), p.footR, -1);

  sc.push(pelvisM, [0, 0, 0], pelvis);
  belt(sc, p);
  sc.pop();

  // --- Tronco ---
  const waist: V3 = v3.add(pelvis, [0, 5, 0]);
  const chestM = mulM(mulM(rot("y", -p.twist), rot("x", -p.sway)), rot("z", p.lean));
  sc.push(chestM, [0, 0, 0], waist);
  torso(sc, p, ember);
  if (variant !== "giant") banner(sc, p, ember);
  cape(sc, p);
  const neckTop: V3 = [-3.5, 33 + p.breath * 0.5, 0];
  sc.cone([0, 25, 0], neckTop, 6.4, 5.6, M.skin);
  sc.push(mulM(mulM(rot("y", p.yaw), rot("x", -p.tilt)), rot("z", p.pitch)), neckTop);
  head(sc, neckTop, p);
  sc.pop();
  const shY = 26 + p.breath * 0.9;
  arm(sc, [0.5, shY, 13.5], p.armL, 1, p, ember);
  arm(sc, [0.5, shY, -13.5], p.armR, -1, p, ember);
  sc.pop();

  sc.pop();
  if (p.axeAt) {
    sc.push(rot("z", p.axeAt.spin), p.axeAt.at);
    (variant === "giant" ? hammer : cleaver)(sc, p.axeAt.at, ember);
    sc.pop();
  }
  return sc;
}

/** Cinto largo com a fivela de caveira de latão e o saiote de placas de ferro (balança com atraso). */
function belt(sc: Sculpt, p: Full) {
  const part = sc.part();
  sc.ell([0.5, -1, 0], [9.6, 7.6, 11.2], M.skin, { part });
  sc.ell([0.4, 3, 0], [10.4, 3, 11.9], M.leather, { part, band: { n: 3, depth: 0.22 } });
  // Fivela: a caveira de latão com os chifres.
  const buckle: V3 = [-10.6, 3, 0];
  const bp = sc.part();
  sc.ell(buckle, [1.6, 2.6, 2.8], M.brass, { part: bp });
  for (const s of [1, -1]) {
    sc.ball(v3.add(buckle, [-1.2, 0.6, s * 1.1]), 0.7, M.mouth, bp);
    sc.cone(v3.add(buckle, [-0.4, 1.6, s * 2.2]), v3.add(buckle, [-0.6, 3.6, s * 3.6]), 0.8, 0.25, M.brass, { part: bp });
  }
  // Saiote: placas de ferro com o friso de latão embaixo, em volta do quadril; as da frente balançam mais.
  const plate = (ang: number, len: number, lag: number) => {
    const a = ang * D2R;
    const top: V3 = [-Math.cos(a) * 10.6, 1.6, Math.sin(a) * 12.2];
    const out: V3 = v3.norm([-Math.cos(a) * 0.32, -1, Math.sin(a) * 0.32]);
    const swing = (p.tasset + lag) * D2R * (Math.cos(a) > 0 ? 1 : -1);
    const dir = v3.norm(v3.add(out, [-Math.sin(swing) * Math.sign(Math.cos(a) || 1), 0, 0]));
    const end = v3.add(top, v3.mul(dir, len));
    const pp = sc.part();
    const face = v3.norm([-Math.cos(a), 0, Math.sin(a)]);
    sc.seg(top, end, 0.9, 3.6, M.iron, { part: pp, up: face, over: 0.6, paint: (x) => (x > len / 2 - 1.6 ? M.brass : -1) });
  };
  plate(0, 12, 0);
  plate(28, 11.5, 3);
  plate(-28, 11.5, -3);
  plate(60, 11, 2);
  plate(-60, 10.5, -2);
  plate(180, 10, 0);
  plate(150, 10, 2);
  plate(-150, 10, -2);
}

/** Tronco: barriga, peito, o peitoral de ferro com as três garras em brasa, as costas e a corcunda. */
function torso(sc: Sculpt, p: Full, ember: (k: number) => number) {
  const b = p.breath;
  const part = sc.part();
  sc.ell([0.5, 7, 0], [8.6, 9, 10.8], M.skin, { part });
  sc.ell([1, 18 + b * 0.5, 0], [10.6 + b * 0.4, 11.4 + b * 0.3, 13 + b * 0.3], M.skin, { part });
  // Costas: os dois lados da corcunda e os trapézios (sobem com o fôlego).
  for (const s of [1, -1]) {
    sc.ell([5, 19 + b * 0.5, s * 5.6], [6.2, 9, 6.4], M.skin, { part, axes: basis([0.2, 1, 0]) });
    sc.ell([2, 27 + b * 0.8, s * 6.4], [5.4, 3.8, 6.6], M.skin, { part });
  }
  // Peitoral: cobre a frente, com o friso de latão na borda de cima e no vinco do meio e as garras em brasa.
  const plateC: V3 = [-2.2, 18 + b * 0.5, 0];
  const R: V3 = [9.8 + b * 0.4, 11 + b * 0.3, 12.6 + b * 0.3];
  const platePaint: Paint = (x, y, z) => {
    if (y > R[1] - 2.2) return M.brass;
    if (Math.abs(z) < 0.7 && x < -4) return M.brass;
    // Três garras em diagonal no peito, do ombro de lá ao quadril de cá (vistas no perfil).
    if (x < -2) {
      const d = y + z * 0.75;
      for (const [k, off] of [[0, -4.5], [1, 0], [2, 4.5]] as const)
        if (Math.abs(d - off) < 0.85 && Math.abs(z - 2.5) < 7.5 && y > -8 && y < 8) return ember(k * 3 + Math.round(y / 3));
    }
    return -1;
  };
  sc.ell(plateC, R, M.iron, { part: sc.part(), paint: platePaint });
  // Placas da barriga (lâminas sobrepostas).
  for (let k = 0; k < 2; k++) sc.ell([-3.6, 6.5 - k * 3.8, 0], [7.8 - k * 0.6, 2.4, 10.4 - k * 0.6], M.ironDark, { band: { n: 1, depth: 0.2 } });
}

/** Manto de pele de lobo: a gola grossa nos ombros e as abas caindo pelas costas, com atraso. */
function cape(sc: Sculpt, p: Full) {
  // Gola: tufos de pelo em volta dos ombros e da nuca.
  const collar = sc.part();
  for (let k = 0; k < 9; k++) {
    const a = (-80 + k * 20) * D2R;
    sc.ell([2.5 + Math.cos(a) * 6, 29.5 + Math.sin(k * 1.7) * 0.6 + p.breath * 0.8, Math.sin(a) * 12], [5.2, 4.2, 4.8], k % 2 ? M.fur : M.furDark, { part: collar });
  }
  // Abas do manto, das costas até a altura dos joelhos (o rabo do lobo na do meio).
  const lag = p.cape * D2R;
  for (const [z, len, w, d] of [[-8, 34, 6.2, 0], [0, 38, 6.8, 4], [8, 33, 6.2, -3]] as const) {
    const top: V3 = [8.5, 28, z];
    const a = lag + d * D2R * 0.6;
    const end: V3 = v3.add(top, [Math.sin(a) * len * 0.55 + 4, -Math.cos(a) * len, z * 0.25]);
    const pp = sc.part();
    sc.seg(top, end, w, 2.2, M.fur, { part: pp, up: [1, 0, 0], over: 1 });
    // Pontas desfiadas.
    for (const s of [-1, 1]) sc.cone(v3.add(end, [0, 1, s * 2.6]), v3.add(end, [1.2, -3.4, s * 3.2]), 1.6, 0.3, M.furDark, { part: pp });
  }
}

/** Estandarte nas costas: haste de madeira com braço, pano vermelho que ondula, a caveira chifruda pintada e a de verdade na ponta. */
function banner(sc: Sculpt, p: Full, ember: (k: number) => number) {
  const base: V3 = [9.5, 14, -3];
  sc.push(rot("z", -p.pole), base);
  const top: V3 = [12, 78, -3];
  const pole = sc.part();
  sc.cone(base, top, 1.3, 1.05, M.wood, { part: pole, band: { n: 6, depth: 0.2 } });
  // Presilhas de couro no ombro.
  sc.cone([8.8, 24, -3], [9.4, 26, -3], 1.9, 1.9, M.leather, { part: pole });
  // Braço do estandarte, para trás, e o pano pendurado nele (o pano ondula de lado, em gomos).
  const armA: V3 = [12, 74, -3], armB: V3 = [31, 74, -3];
  sc.cone(armA, armB, 0.9, 0.8, M.wood, { part: pole });
  const n = 6, h = 30;
  const cloth = sc.part();
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    const x0 = 12.5 + t0 * 18.5, x1 = 12.5 + t1 * 18.5;
    // A onda corre do mastro para a ponta; o pano também cai um pouco para trás com o atraso.
    const wz = (t: number) => Math.sin((t * 1.6 - p.wave) * Math.PI * 2) * 2.6 * t * p.flap;
    const sag = (t: number) => -t * t * 4 - Math.max(0, p.pole) * 0.08 * t;
    const zA = -3 + wz((t0 + t1) / 2);
    const len = h - Math.abs(k - 2.5) * 0.6 - (k === n - 1 ? 5 : 0);
    const mid: V3 = [(x0 + x1) / 2, 73 + sag((t0 + t1) / 2) - len / 2, zA];
    const flagPaint: Paint = (x, y) => {
      // Faixa preta na barra de baixo e no alto, e a caveira chifruda em osso no meio do pano.
      if (y < -len / 2 + 2.4 || y > len / 2 - 1.6) return M.ironDark;
      const gx = mid[0] + x - 21.5, gy = mid[1] + y - 58;
      const skullD = (gx / 5.2) ** 2 + ((gy - 0.5) / 4.6) ** 2;
      if (skullD < 1) {
        if (((gx + 1.8) / 1.3) ** 2 + ((gy - 0.6) / 1.4) ** 2 < 1 || ((gx - 1.8) / 1.3) ** 2 + ((gy - 0.6) / 1.4) ** 2 < 1) return ember(9);
        if (gy < -2.6 && Math.abs(gx) < 2.4 && Math.round(gx * 1.2) % 2 === 0) return M.mouth;
        return M.bone;
      }
      // Chifres pintados, saindo da caveira em arco.
      for (const s of [1, -1]) {
        const hx = gx - s * 5.6, hy = gy - 4.8;
        if (Math.abs(Math.hypot(hx * 1.1, hy) - 3.4) < 0.9 && hy > -1 && s * hx > -1) return M.bone;
      }
      return -1;
    };
    sc.ell(mid, [(x1 - x0) / 2 + 0.6, len / 2, 0.7], M.cloth, { part: cloth, paint: flagPaint });
    // Franjas rasgadas embaixo.
    sc.cone(v3.add(mid, [0, -len / 2, 0]), v3.add(mid, [0.6, -len / 2 - 2.5 - (k % 2) * 1.5, wz(t1) * 0.3]), 1.3, 0.3, M.cloth, { part: cloth });
  }
  // A caveira de verdade na ponta da haste, com chifres e os olhos em brasa.
  const sk = v3.add(top, [0, 3.2, 0]);
  const skp = sc.part();
  sc.ell(sk, [3, 3.2, 2.8], M.bone, { part: skp });
  sc.ell(v3.add(sk, [-2, -2.2, 0]), [2.1, 1.7, 2], M.bone, { part: skp });
  for (const s of [1, -1]) {
    sc.ball(v3.add(sk, [-2.4, 0.3, s * 1.2]), 0.75, ember(4 + s), skp);
    let hp = v3.add(sk, [0.5, 1.8, s * 2.2]);
    for (let k = 0; k < 3; k++) {
      const nx = v3.add(hp, [1.6 - k * 1.6, 2.2 - k * 0.6, s * (1.6 - k * 0.5)]);
      sc.cone(hp, nx, 1.1 - k * 0.3, 0.8 - k * 0.3, M.bone, { part: skp });
      hp = nx;
    }
  }
  // Fitas de couro penduradas da ponta, que voam com o atraso.
  for (const s of [1, -1]) sc.cone(v3.add(top, [0.4, -1, s * 1]), v3.add(top, [4 + p.pole * 0.15, -9, s * 1.6]), 0.6, 0.35, M.leather);
  sc.pop();
}

/** Cabeça: mandíbula pesada com presas enormes, o elmo de chifres com viseira em fenda e o rabo de cabelo saindo do topo. */
function head(sc: Sculpt, o: V3, p: Full) {
  const at = (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
  const hot = p.glow > 0.5;
  const part = sc.part();
  // Crânio e rosto (o elmo cobre o alto).
  sc.ell(at(-4, 7.5, 0), [8.6, 7.8, 7.8], M.skin, { part });
  sc.ell(at(-10.4, 4, 0), [3.6, 3.4, 5.6], M.skin, { part });
  sc.ell(at(-12.6, 5.2, 0), [2.4, 2.6, 2.6], M.skinDark, { part });
  for (const s of [1, -1]) sc.ball(at(-14.6, 4.6, s * 1.1), 0.75, M.mouth, part);
  // Pintura de cinza: listra branca descendo da viseira pela bochecha.
  const ashPaint: Paint = (x, y) => (Math.abs(x + 0.4 * y) < 0.9 ? M.ash : -1);
  for (const s of [1, -1]) sc.ell(at(-8.6, 3.6, s * 5), [3.2, 3, 2.6], M.skin, { part, paint: ashPaint });
  // Boca e mandíbula (abre em volta da junta), com as presas grandes subindo pelo lado da cara.
  sc.ell(at(-10, 1.4, 0), [4, 1.6, 4.8], M.mouth, { part });
  const jp = sc.part();
  sc.push(rot("z", -p.jaw * 22), at(-3, 1.8, 0));
  sc.ell(at(-9, -0.4, 0), [6, 3, 6.2], M.skin, { part: jp });
  sc.ell(at(-12.4, -1, 0), [2.8, 2.6, 3.6], M.skin, { part: jp });
  for (const s of [1, -1]) {
    sc.cone(at(-12.6, 0.4, s * 3.4), at(-13.4, 5, s * 4.4), 1.5, 0.9, M.bone, { part: jp });
    sc.cone(at(-13.4, 5, s * 4.4), at(-12.4, 8.4, s * 4.8), 0.9, 0.3, M.bone, { part: jp });
  }
  // Barbicha trançada com argola de latão.
  sc.cone(at(-11.4, -3, 0), at(-10.4, -8.5, 0), 1.6, 0.8, M.hair, { part: jp });
  sc.ball(at(-10.8, -6, 0), 1.3, M.brass, jp);
  sc.pop();
  // Olhos na fenda da viseira.
  for (const s of [1, -1]) sc.ell(at(-11.8, 8.2, s * 3.2), [1.2, 1.1, 1.8], hot ? M.eye : M.eyeOff);
  if (variant === "giant") {
    giantHead(sc, at, part);
    return;
  }
  // Elmo: a cúpula, a viseira com a fenda dos olhos, o nasal, as faces e o friso de latão.
  const hp = sc.part();
  const domePaint: Paint = (x, y, z) => (Math.abs(z) < 0.8 && y > 0 ? M.brass : y < -3.2 && y > -4.6 ? M.brass : -1);
  sc.ell(at(-3.2, 10.6, 0), [9.4, 7.6, 8.8], M.iron, { part: hp, paint: domePaint });
  // Testa da viseira (acima dos olhos) e a crista.
  sc.ell(at(-10.6, 10.6, 0), [2.8, 1.8, 6.6], M.iron, { part: hp, axes: basis([1, -0.25, 0]) });
  sc.cone(at(-12.6, 9.6, 0), at(-14.6, 4.4, 0), 1.3, 0.6, M.iron, { part: hp });
  for (const s of [1, -1]) sc.ell(at(-6.5, 4.8, s * 6.8), [5, 4.4, 1.4], M.ironDark, { part: hp, axes: basis([1, 0.15, 0]) });
  // Rebites na cúpula.
  for (let k = 0; k < 4; k++) sc.ball(at(-9.4 + k * 3.4, 13.4 - Math.abs(k - 1.5) * 0.8, 6.2), 0.55, M.brass, hp);
  // Chifres: saem dos lados do elmo, abrem, sobem e voltam para a frente na ponta.
  for (const s of [1, -1]) {
    let hpnt = at(-3, 12.6, s * 7.4);
    const steps: V3[] = [[0.6, 2.2, 3.4], [-0.4, 4.4, 2.4], [-2.4, 4.4, 0.6], [-3.6, 2.4, -0.6], [-3.2, 0.2, -0.8]];
    const radii = [3, 2.5, 2, 1.45, 0.9, 0.25];
    steps.forEach((st, k) => {
      const nx = v3.add(hpnt, [st[0], st[1], s * st[2]]);
      sc.cone(hpnt, nx, radii[k], radii[k + 1], M.bone, { band: { n: 2, depth: 0.12 } });
      hpnt = nx;
    });
    // Anel de latão na base do chifre.
    sc.cone(at(-2.8, 12.6, s * 7.6), at(-2.6, 13.4, s * 8.6), 3.3, 3.1, M.brass);
  }
  // Rabo de cabelo saindo do topo do elmo por uma argola, caindo pelas costas com atraso.
  sc.cone(at(1.5, 17.2, 0), at(2.2, 18.6, 0), 1.9, 1.9, M.brass);
  let tp = at(2.2, 18.8, 0);
  let ta = (-10 - p.hair * 0.8) * D2R;
  for (let k = 0; k < 4; k++) {
    const next = v3.add(tp, [Math.cos(ta) * 5, Math.sin(ta) * 5, 0]);
    sc.cone(tp, next, 2.4 - k * 0.45, 2 - k * 0.45, M.hair);
    tp = next;
    ta -= (24 + p.hair * 0.4) * D2R;
  }
}

/** Cabeça nua do gigante: o alto do crânio, a testa pesada por cima dos olhos, placas de rocha e a barba grossa. */
function giantHead(sc: Sculpt, at: (x: number, y: number, z: number) => V3, part: number) {
  sc.ell(at(-3, 11, 0), [8.8, 7, 8.2], M.skin, { part });
  // Testa: o osso saltado que deixa os olhos no fundo.
  sc.ell(at(-10.4, 10, 0), [3, 2.2, 6.8], M.skinDark, { part, axes: basis([1, -0.2, 0]) });
  // Placas de rocha no crânio (a pele virou pedra da cratera), com as frestas entre elas.
  const plates: [number, number, number, number][] = [[-5, 16.4, 2.6, 3.6], [0.5, 16.6, -2.4, 3.4], [3.6, 13.6, 5.2, 3], [-7.6, 14, -4.6, 2.8], [1.4, 12, -6.6, 2.6], [-2, 17.6, -0.2, 2.4]];
  for (const [x, y, z, r] of plates) sc.ell(at(x, y, z), [r, r * 0.55, r * 0.9], M.skinDark, { axes: basis([1, 0.2, z * 0.1]) });
  // Orelhas pequenas e rasgadas, coladas no crânio.
  for (const s of [1, -1]) sc.ell(at(1.5, 8.6, s * 8), [2, 2.6, 1], M.skin, { part: sc.part(), axes: basis([1, 0.4, s * 0.3]) });
  // Barba: mechas grossas do queixo e dos lados, caindo no peito.
  for (const [z, x, l] of [[0, -9.6, 9], [3.2, -8.4, 8], [-3.2, -8.4, 8], [5.6, -5.6, 6], [-5.6, -5.6, 6]] as const) {
    const top = at(x, 0.4, z);
    sc.cone(top, v3.add(top, [1.2, -l, z * 0.15]), 2.2, 0.6, M.hair);
  }
}

/** Martelo de forja do gigante: cabo longo de madeira com tiras de couro, cabeça de ferro maciça com a face em brasa. */
function hammer(sc: Sculpt, fist: V3, ember: (k: number) => number) {
  const part = sc.part();
  const butt = v3.add(fist, [9, 0, 0]);
  const neck = v3.add(fist, [-24, 0, 0]);
  sc.cone(butt, neck, 1.7, 1.5, M.wood, { part, band: { n: 8, depth: 0.25 } });
  sc.cone(v3.add(fist, [4.5, 0, 0]), v3.add(fist, [-4.5, 0, 0]), 1.9, 1.9, M.leather, { part, band: { n: 4, depth: 0.3 } });
  sc.ball(v3.add(butt, [1, 0, 0]), 2.2, M.iron, part);
  // Cabeça: o bloco atravessado no fim do cabo, as bordas chanfradas e as cintas de ferro.
  const hp = sc.part();
  const head = v3.add(neck, [-2, -3, 0]);
  sc.ell(head, [7.6, 13, 8.4], M.iron, { part: hp, band: { n: 3, depth: 0.12 } });
  for (const dy of [-8.6, 8.6]) sc.ell(v3.add(head, [0, dy, 0]), [8.1, 1.6, 8.9], M.ironDark, { part: hp });
  // As duas faces: a de baixo em brasa (acabou de sair da forja), a de cima rachada.
  sc.ell(v3.add(head, [0, -12.6, 0]), [6.4, 1.6, 7.2], ember(3));
  sc.ell(v3.add(head, [0, 12.6, 0]), [6.4, 1.3, 7.2], M.ironDark);
  for (const z of [-3, 3]) sc.cone(v3.add(head, [-7.4, -6, z]), v3.add(head, [-7.6, 4, z * 0.6]), 0.6, 0.6, ember(5 + z));
}

/** Braço: ombreira de espigões, braço, cotovelo, braçal de ferro e a mão (o cutelo, ou a corrente no de lá). */
function arm(sc: Sculpt, sh: V3, a: Arm, side: number, p: Full, ember: (k: number) => number) {
  const part = sc.part();
  // Ombreira: duas lâminas de ferro e três espigões, presa ao ombro (gira só metade com o braço).
  sc.push(mulM(rot("z", -a.swing * 0.35), rot("x", -side * a.out * 0.4)), sh);
  const pp = sc.part();
  const rim: Paint = (_x, y) => (y < -3.6 ? M.brass : -1);
  sc.ell(v3.add(sh, [0, 2.6, side * 1.4]), [7.6, 5.8, 7.2], M.iron, { part: pp, paint: rim });
  sc.ell(v3.add(sh, [0.4, -1.2, side * 2.4]), [6.6, 3.6, 6.4], M.ironDark, { part: sc.part(), paint: rim });
  for (const [dx, dz] of [[-3.2, 1.4], [0.6, 3.4], [4, 1]] as const) {
    const base = v3.add(sh, [dx, 6.6, side * (dz + 1)]);
    sc.cone(base, v3.add(base, [dx * 0.25, 5.6, side * dz * 0.6]), 1.6, 0.2, M.iron, { part: pp });
  }
  sc.pop();
  sc.push(mulM(rot("z", -a.swing), rot("x", -side * a.out)), sh);
  const elbow = v3.add(sh, [0, -16, 0]);
  sc.cone(sh, elbow, 5, 4, M.skin, { part });
  sc.ell(v3.add(sh, [-1.6, -8, 0]), [3.8, 6, 3.9], M.skin, { part });
  sc.push(rot("z", -a.elbow), elbow);
  const fp = sc.part();
  const wrist = v3.add(elbow, [0, -14.5, 0]);
  sc.ball(elbow, 4, M.skin, fp);
  sc.cone(elbow, wrist, 4, 3.3, M.skin, { part: fp });
  // Braçal de ferro com tiras de latão e três rebites.
  sc.cone(v3.add(elbow, [0, -4, 0]), v3.add(wrist, [0, 0.8, 0]), 4.4, 3.8, M.iron, { part: sc.part(), band: { n: 3, depth: 0.18 } });
  sc.cone(v3.add(wrist, [0, 1.6, 0]), v3.add(wrist, [0, 0.4, 0]), 4.1, 4.1, M.brass);
  sc.push(rot("z", -(a.wrist ?? 0)), wrist);
  const fist = v3.add(wrist, [-0.4, -3.6, 0]);
  sc.ell(fist, [4.2, 4.2, 4], M.skin, { part: fp });
  for (let k = 0; k < 4; k++) sc.ball(v3.add(fist, [-3.2, 2 - k * 1.5, side * 2]), 1.3, M.skin, fp);
  if (side > 0 && !p.axeAt) {
    sc.push(rot("z", p.axe), fist);
    (variant === "giant" ? hammer : cleaver)(sc, fist, ember);
    sc.pop();
  } else if (side < 0) {
    // Soco-inglês de espigões e a corrente: voltas no antebraço e o pedaço solto com o gancho, com atraso.
    for (let k = 0; k < 3; k++) sc.cone(v3.add(fist, [-4.2, 2 - k * 1.8, side * 2.4]), v3.add(fist, [-6.4, 2.2 - k * 1.8, side * 2.6]), 0.9, 0.2, M.iron);
    chainLoop(sc, elbow, wrist);
    let cp = v3.add(fist, [1.6, -2.6, 0]);
    let ca = (8 + p.chain) * D2R;
    for (let k = 0; k < 7; k++) {
      const nx = v3.add(cp, [Math.sin(ca) * 2.6, -Math.cos(ca) * 2.6, (k % 2) * 0.5]);
      if (k % 2) sc.ell(lerp3(cp, nx, 0.5), [1.6, 0.7, 1.1], M.chain, { axes: basis(v3.sub(nx, cp)) });
      else sc.ell(lerp3(cp, nx, 0.5), [1.6, 1.1, 0.6], M.chain, { axes: basis(v3.sub(nx, cp)) });
      cp = nx;
      ca += (p.chain * 0.12 + 3) * D2R;
    }
    // Gancho.
    const hook = sc.part();
    sc.cone(cp, v3.add(cp, [0, -3, 0]), 0.9, 0.9, M.iron, { part: hook });
    sc.cone(v3.add(cp, [0, -3, 0]), v3.add(cp, [-2.2, -4.6, 0]), 0.9, 0.7, M.iron, { part: hook });
    sc.cone(v3.add(cp, [-2.2, -4.6, 0]), v3.add(cp, [-3, -2.4, 0]), 0.7, 0.15, M.iron, { part: hook });
  }
  sc.pop();
  sc.pop();
  sc.pop();
}

/** Voltas de corrente em volta do antebraço (elos alternados). */
function chainLoop(sc: Sculpt, elbow: V3, wrist: V3) {
  for (let k = 0; k < 9; k++) {
    const t = 0.25 + (k / 9) * 0.6;
    const c = lerp3(elbow, wrist, t);
    const a = k * 1.9;
    sc.ell(v3.add(c, [Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6]), [1.4, 0.8, 1.1], M.chain, { axes: basis([Math.sin(a), 0.4, -Math.cos(a)]) });
  }
}

/**
 * O Cutelo de Brasa: cabo comprido enrolado em couro com o pomo de latão, a lâmina larga de cutelo (ferro escuro, com
 * a lombada de espigões) e o fio em brasa viva que pulsa, mais as runas acesas no meio da lâmina.
 */
function cleaver(sc: Sculpt, fist: V3, ember: (k: number) => number) {
  const part = sc.part();
  // Cabo: atravessa o punho ao longo de x; o pomo atrás, a lâmina na frente.
  const butt = v3.add(fist, [9, 0, 0]);
  const neck = v3.add(fist, [-22, 0, 0]);
  sc.cone(butt, neck, 1.5, 1.35, M.wood, { part, band: { n: 9, depth: 0.25 } });
  sc.cone(v3.add(fist, [4.5, 0, 0]), v3.add(fist, [-4.5, 0, 0]), 1.75, 1.75, M.leather, { part, band: { n: 4, depth: 0.3 } });
  sc.ball(v3.add(butt, [1.2, 0, 0]), 2.1, M.brass, part);
  sc.cone(v3.add(butt, [1.2, 0, 0]), v3.add(butt, [4, -0.4, 0]), 1.2, 0.1, M.iron, { part });
  // Lâmina: do fim do cabo para baixo (−y local), larga e curva, feita de gomos chatos sobrepostos, mais largos
  // embaixo; a frente (−x) é o fio em brasa, a borda de trás (lombada) mais escura e com espigões.
  const bp = sc.part();
  const top = v3.add(neck, [4, 1, 0]);
  const L = 19;
  const blade = (t: number): V3 => v3.add(top, [-t * 3 - t * t * 3, -t * L, 0]);
  const width = (t: number) => 8 + t * 5;
  const n = 6;
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n, tm = (t0 + t1) / 2;
    const w = width(tm);
    const c = v3.add(blade(tm), [-w / 2 + 1, 0, 0]);
    const runes: Paint = (x, y) => (k >= 1 && k <= 4 && Math.abs(x + 0.8) < 0.55 && Math.abs(y) < 1 ? ember(k + 20) : x > w / 2 - 1.4 ? M.ironDark : -1);
    sc.ell(c, [w / 2 + 0.3, L / n / 2 + 1.4, 1], M.iron, { part: bp, paint: runes });
  }
  // Fio em brasa: a frente inteira da lâmina, numa linha contínua.
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    sc.cone(v3.add(blade(t0), [-width(t0) + 0.6, 0, 0]), v3.add(blade(t1), [-width(t1) + 0.6, 0, 0]), 1.25, 1.25, ember(k));
  }
  // Ponta de baixo, em gancho para a frente, e a de cima, que sobe junto do cabo.
  const tip = blade(1);
  sc.cone(v3.add(tip, [-width(1) + 0.6, 0, 0]), v3.add(tip, [-width(1) - 2.6, 2.2, 0]), 1.25, 0.3, ember(7));
  sc.cone(v3.add(top, [-width(0) + 0.6, 0, 0]), v3.add(top, [-width(0) - 0.6, 3, 0]), 1.25, 0.3, ember(8));
  // Lombada: espigões para trás.
  for (let k = 0; k < 3; k++) {
    const b = v3.add(blade(0.25 + k * 0.28), [1.4, 0, 0]);
    sc.cone(b, v3.add(b, [3.4, -0.8, 0]), 1.3, 0.15, M.iron, { part: bp });
  }
  // Colar de latão onde a lâmina encontra o cabo.
  sc.cone(v3.add(neck, [1.6, 0, 0]), v3.add(neck, [4.8, 0, 0]), 2.1, 2.1, M.brass, { part, band: { n: 2, depth: 0.3 } });
}

/** Perna por cinemática inversa: coxa, joelheira, greva de ferro e a bota pesada. */
function leg(sc: Sculpt, hip: V3, foot: Foot, side: number) {
  const L1 = 19, L2 = 19;
  const toe = (foot.toe ?? 0) * D2R;
  const ankle: V3 = [foot.at[0] + (1 - Math.cos(toe)) * 7, foot.at[1] + 4.4 + Math.max(0, Math.sin(toe)) * 8, foot.at[2]];
  const hf = v3.sub(ankle, hip);
  const d = Math.min(v3.len(hf), L1 + L2 - 0.3);
  const dir = v3.norm(hf);
  const want = v3.norm([-1, 0.15, side * 0.3]);
  const perp = v3.norm(v3.sub(want, v3.mul(dir, v3.dot(want, dir))));
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const knee = v3.add(hip, v3.add(v3.mul(dir, a), v3.mul(perp, h)));
  const end = v3.add(hip, v3.mul(dir, d));
  const part = sc.part();
  sc.cone(hip, knee, 6, 4.5, M.skin, { part });
  sc.seg(lerp3(hip, knee, 0.15), lerp3(hip, knee, 0.85), 4.6, 5.6, M.skin, { part, up: [0, 0, 1] });
  // Joelheira com espigão.
  const kp = sc.part();
  sc.ell(v3.add(knee, [-1.6, 0, 0]), [3.6, 4.4, 4.4], M.iron, { part: kp });
  sc.cone(v3.add(knee, [-4.4, 0.6, 0]), v3.add(knee, [-7.4, 1.8, 0]), 1.3, 0.15, M.iron, { part: kp });
  // Greva: a canela de ferro com o friso de latão em cima.
  const gp = sc.part();
  sc.cone(lerp3(knee, end, 0.12), lerp3(knee, end, 0.98), 4.6, 4, M.iron, { part: gp, band: { n: 2, depth: 0.14 } });
  sc.cone(lerp3(knee, end, 0.12), lerp3(knee, end, 0.2), 4.8, 4.8, M.brass, { part: gp });
  // Bota: pé largo de couro com a biqueira de ferro.
  const fd: V3 = [-Math.cos(toe), -Math.sin(toe), 0];
  const bootP = sc.part();
  sc.ell(v3.add(end, v3.add(v3.mul(fd, 3.8), [0, -2.2, 0])), [7, 2.8, 4.2], M.leather, { part: bootP, axes: basis(fd) });
  sc.ball(v3.add(end, [2, -1.8, 0]), 2.8, M.leather, bootP);
  sc.ell(v3.add(end, v3.add(v3.mul(fd, 8.4), [0, -2.4, 0])), [2.6, 2.4, 3.8], M.iron, { part: bootP, axes: basis(fd) });
}

// --- Quadros -------------------------------------------------------------------------------------------------------

/** Quadro grande (o boss é o maior humanoide do jogo) e a linha dos pés. */
export const WARLORD_SIZE = 200;
export const WARLORD_FEET = WARLORD_SIZE - 18;
const PITCH = 22;
const SCALE = 1.3;
const YAW: Record<View, number> = { side: 24, front: 90, back: -90 };

export function shootWarlord(pose: WarlordPose, view: View, skin?: Skin, as: WarlordVariant = "warlord"): Frame {
  const cx = view === "side" ? WARLORD_SIZE / 2 + 6 : WARLORD_SIZE / 2;
  variant = as;
  try {
    return render(warlord(pose), { size: WARLORD_SIZE, feet: WARLORD_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, applySkin(look(), skin));
  } finally {
    variant = "warlord";
  }
}

// --- Clipes ----------------------------------------------------------------------------------------------------------

const TAU = Math.PI * 2;
const sin = (t: number) => Math.sin(t * TAU);
const cos = (t: number) => Math.cos(t * TAU);

/**
 * Parado (8): respira fundo e devagar (o peito e as ombreiras sobem), o peso troca de pé, o cutelo balança na mão, o
 * estandarte ondula sem parar, o manto e o rabo de cabelo seguem com atraso e a brasa pulsa.
 */
function idlePose(k: number, n: number): WarlordPose {
  const t = k / n;
  const breath = 0.5 - 0.5 * cos(t);
  return {
    breath, flicker: t,
    hip: [0, breath * 0.6 - 0.3, sin(t) * 0.8],
    lean: 14 - breath * 2,
    sway: sin(t) * 1.2,
    pitch: -8 + sin(t - 0.15) * 2.4,
    tilt: sin(t - 0.2) * 1.6,
    jaw: 0.1 + breath * 0.12,
    hair: 4 + sin(t - 0.25) * 6,
    cape: sin(t - 0.3) * 3,
    pole: sin(t - 0.2) * 2.5,
    wave: t, flap: 0.8,
    tasset: sin(t - 0.3) * 2,
    chain: sin(t - 0.35) * 8,
    axe: 60 + sin(t) * 4,
    armL: { swing: 14 + breath * 2, out: 14, elbow: 50 - breath * 4, wrist: sin(t - 0.1) * 4 },
    armR: { swing: 6 - breath * 2, out: 16 + breath, elbow: 40 + breath * 4, wrist: 6 },
  };
}

/**
 * Andar (8): passada pesada e larga; a pelve quica fundo, o tronco balança para o lado do pé de apoio, os ombros
 * giram contra os quadris e o cutelo vai e volta à frente. Tudo o que é solto (manto, estandarte, corrente) atrasa.
 */
function walkPose(t: number): WarlordPose {
  const A = 10, H = 5;
  const foot = (q: number, z: number, x0: number): Foot => {
    q = ((q % 1) + 1) % 1;
    if (q < 0.5) {
      const s = q / 0.5;
      const toe = s < 0.12 ? -10 * (1 - s / 0.12) : s > 0.72 ? 24 * ((s - 0.72) / 0.28) : 0;
      return { at: [x0 - A + 2 * A * s, 0, z], toe };
    }
    const s = (q - 0.5) / 0.5;
    const e = s * s * (3 - 2 * s);
    return { at: [x0 + A - 2 * A * e, Math.sin(s * Math.PI) * H, z], toe: 22 * (1 - s) * (1 - s) - 8 * s * s };
  };
  const bob = -cos(2 * (t - 0.1));
  return {
    flicker: t * 2,
    hip: [0, bob * 1.8 - 1, sin(t) * 1.6],
    hipTwist: cos(t) * 8,
    twist: -cos(t) * 10,
    lean: 17 + sin(2 * t) * 1.5,
    sway: sin(t) * 3,
    pitch: -9 - bob * 1.8,
    yaw: cos(t) * 3,
    tilt: -sin(t) * 2,
    breath: 0.45 + bob * 0.15,
    jaw: 0.14,
    hair: 12 + cos(2 * (t - 0.28)) * 7,
    cape: 10 + cos(2 * (t - 0.2)) * 5,
    pole: 5 + cos(2 * (t - 0.25)) * 4,
    wave: t * 2, flap: 1.2,
    tasset: cos(t - 0.15) * 8,
    chain: 14 + cos(t - 0.3) * 18,
    axe: 56 + sin(t - 0.1) * 6,
    footL: foot(t, 8.6, -1),
    footR: foot(t + 0.5, -8.6, -1),
    armL: { swing: 16 - cos(t) * 8, out: 14, elbow: 54 + cos(t - 0.08) * 6, wrist: sin(t) * 4 },
    armR: { swing: 6 + cos(t) * 22, out: 15, elbow: 36 + cos(t - 0.12) * 14, wrist: 6 },
  };
}

/** Pose-chave completa: o que não foi dito é o da pose parada (o fim de cada clipe volta à guarda). */
const K = (p: WarlordPose): WarlordPose => ({ ...REST, ...p });

/** Mistura profunda (pés e braços são objetos): números e listas se misturam; o resto troca no meio. */
function mixDeep(a: unknown, b: unknown, t: number): unknown {
  if (typeof a === "number" && typeof b === "number") return +(a + (b - a) * t).toFixed(3);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mixDeep(v, b[i], t));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = mixDeep((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], t);
    return out;
  }
  return t < 0.5 ? a ?? b : b ?? a;
}

/** `n` poses entre as poses-chave, suavizadas (entra e sai devagar de cada uma), da primeira à última. */
function tween(keys: readonly WarlordPose[], n: number): WarlordPose[] {
  const segs = keys.length - 1;
  return Array.from({ length: n }, (_, i) => {
    const u = (i / Math.max(1, n - 1)) * segs;
    const k = Math.min(segs - 1, Math.floor(u));
    const e = u - k;
    return mixDeep(keys[k], keys[k + 1], e * e * (3 - 2 * e)) as WarlordPose;
  });
}

/**
 * Golpe (8): o Cutelo de Brasa de cima para baixo. Ergue o cutelo por cima da cabeça (antecipação longa: o peso vai
 * para trás e a boca abre), desce com o corpo inteiro avançando o pé da frente, a lâmina vai até o chão (exagero), e
 * volta a guarda devagar.
 */
const ATTACK = tween(([
  { breath: 0.4, flicker: 0 },
  {
    hip: [4, -1.5, 0], lean: -4, twist: -16, pitch: -18, jaw: 0.4, breath: 1, hair: -6, cape: -6, pole: -6, tasset: -4, chain: -10,
    armL: { swing: 150, out: 20, elbow: 40, wrist: 20 }, armR: { swing: 120, out: 26, elbow: 50, wrist: 0 }, axe: 30, flicker: 0.2,
    footL: { at: [-10, 0, 9], toe: 0 }, footR: { at: [13, 0, -9], toe: 0 },
  },
  {
    hip: [5, -2.4, 0], lean: -8, twist: -20, pitch: -24, jaw: 0.6, breath: 1, hair: -10, cape: -10, pole: -10, tasset: -6, chain: -14,
    armL: { swing: 168, out: 18, elbow: 52, wrist: 30 }, armR: { swing: 138, out: 24, elbow: 60, wrist: 10 }, axe: 40, flicker: 0.35,
    footL: { at: [-9, 0, 9], toe: 0 }, footR: { at: [13, 0, -9], toe: 0 },
  },
  {
    hip: [-6, -5, 0], lean: 34, twist: 14, pitch: -2, jaw: 1, breath: 0.6, hair: 18, cape: 16, pole: 14, tasset: 10, chain: 30,
    armL: { swing: 70, out: 8, elbow: 6, wrist: -10 }, armR: { swing: 50, out: 14, elbow: 20, wrist: 0 }, axe: -10, flicker: 0.55,
    footL: { at: [-22, 0, 9], toe: -6 }, footR: { at: [12, 0, -9], toe: 26 },
  },
  {
    hip: [-9, -7, 0], lean: 42, twist: 20, pitch: 6, jaw: 0.8, breath: 0.5, hair: 24, cape: 20, pole: 18, tasset: 12, chain: 34,
    armL: { swing: 36, out: 6, elbow: 2, wrist: -24 }, armR: { swing: 28, out: 12, elbow: 14, wrist: 0 }, axe: -26, flicker: 0.7,
    footL: { at: [-23, 0, 9], toe: 0 }, footR: { at: [11, 0, -9], toe: 28 },
  },
  {
    hip: [-6, -4, 0], lean: 30, twist: 8, pitch: -4, jaw: 0.4, breath: 0.4, hair: 6, cape: 6, pole: 4, tasset: 2, chain: 10,
    armL: { swing: 40, out: 10, elbow: 40, wrist: -8 }, armR: { swing: 12, out: 15, elbow: 34, wrist: 4 }, axe: -10, flicker: 0.85,
    footL: { at: [-18, 0, 9], toe: 0 }, footR: { at: [11, 0, -9], toe: 8 },
  },
  { breath: 0.4, lean: 15, flicker: 1, hair: 2 },
] satisfies WarlordPose[]).map(K), 8);

/**
 * Especial (8): o grito de guerra. Crava o cutelo no chão à frente, enche o peito, ergue o punho da corrente para o alto e
 * ruge com a cabeça para trás; o estandarte estala com o rugido e a brasa fica no auge. É o chamado da guarda e a fúria.
 */
const SPECIAL = tween(([
  { breath: 0.3, flicker: 0 },
  {
    hip: [1, -2, 0], lean: 26, pitch: 4, jaw: 0.2, breath: 0.2, armL: { swing: 30, out: 12, elbow: 26, wrist: 0 }, axe: 85,
    armR: { swing: 20, out: 18, elbow: 70, wrist: 10 }, cape: 4, pole: 4, flicker: 0.25,
  },
  {
    hip: [3, 1.5, 0], lean: -10, pitch: -34, jaw: 1, breath: 1, twist: -8, armL: { swing: 22, out: 12, elbow: 20, wrist: 0 }, axe: 95,
    armR: { swing: 172, out: 26, elbow: 18, wrist: -10 }, hair: -16, cape: -14, pole: -16, wave: 0.5, flap: 2.2, chain: -30, tasset: -6, flicker: 0.5,
  },
  {
    hip: [3, 1.8, 0], lean: -12, pitch: -38, jaw: 1, breath: 1, twist: -10, armL: { swing: 22, out: 12, elbow: 20, wrist: 0 }, axe: 95,
    armR: { swing: 176, out: 30, elbow: 10, wrist: -16 }, hair: -10, cape: -8, pole: 10, wave: 1, flap: 2.4, chain: 24, tasset: 4, flicker: 0.75,
  },
  { breath: 0.4, lean: 14, pitch: -8, jaw: 0.2, cape: 4, pole: -4, wave: 1.4, flap: 1.2, chain: -6, flicker: 1 },
] satisfies WarlordPose[]).map(K), 8);

/**
 * 2ª habilidade (8): o Salto do Senhor da Guerra. Agacha fundo, salta com o cutelo erguido nas duas mãos (o corpo
 * sobe no quadro, as pernas encolhem), e cai com a lâmina cravada no chão, ajoelhado sobre um joelho.
 */
const SKILL = tween(([
  { flicker: 0 },
  {
    hip: [3, -9, 0], lean: 32, pitch: -2, jaw: 0.3, breath: 0.8, armL: { swing: -20, out: 18, elbow: 80, wrist: 10 }, axe: 30,
    armR: { swing: -10, out: 24, elbow: 60 }, cape: -4, pole: -4, tasset: -6, flicker: 0.2,
    footL: { at: [-13, 0, 9], toe: 0 }, footR: { at: [12, 0, -9], toe: 10 },
  },
  {
    hip: [-2, 20, 0], lean: 2, pitch: -22, jaw: 0.9, breath: 1, armL: { swing: 160, out: 16, elbow: 50, wrist: 24 }, axe: 36,
    armR: { swing: 140, out: 22, elbow: 50 }, cape: -24, pole: -22, hair: -20, tasset: -16, chain: -40, flap: 2, flicker: 0.4,
    footL: { at: [-8, 15, 9], toe: 30 }, footR: { at: [8, 19, -9], toe: 34 },
  },
  {
    hip: [-6, -10, 0], lean: 40, pitch: 4, jaw: 1, breath: 0.6, armL: { swing: 40, out: 6, elbow: 0, wrist: -26 }, axe: -26,
    armR: { swing: 30, out: 14, elbow: 20 }, cape: 24, pole: 22, hair: 24, tasset: 14, chain: 40, flap: 1.6, flicker: 0.7,
    footL: { at: [-17, 0, 9], toe: 0 }, footR: { at: [11, 0, -9], toe: 40 },
  },
  {
    hip: [-4, -8, 0], lean: 32, pitch: -4, jaw: 0.4, breath: 0.5, armL: { swing: 40, out: 8, elbow: 20, wrist: -16 }, axe: -20,
    armR: { swing: 16, out: 14, elbow: 30 }, cape: 8, pole: 6, hair: 6, tasset: 4, chain: 12, flicker: 0.9,
    footL: { at: [-16, 0, 9], toe: 0 }, footR: { at: [11, 0, -9], toe: 30 },
  },
  { flicker: 1, cape: 2, pole: -2 },
] satisfies WarlordPose[]).map(K), 8);

/**
 * Morte (6): o tranco (o cutelo escapa e crava no chão à frente), cai de joelhos, e o tronco tomba sobre o cabo do
 * cutelo, a cabeça baixa; a brasa do cutelo, das garras e dos olhos se apaga. O estandarte tomba junto, o pano caído.
 */
const DEATH: WarlordPose[] = [
  {
    hip: [3, 0, 0], lean: 2, pitch: -32, jaw: 1, breath: 1, twist: 10, armL: { swing: -10, out: 40, elbow: 30 }, armR: { swing: 30, out: 44, elbow: 20 },
    hair: -14, cape: -10, pole: -10, flap: 1.6, flicker: 0.3, axeAt: { at: [-20, 24, 10], spin: 20 },
  },
  {
    hip: [0, -12, 0], lean: 10, pitch: -10, jaw: 0.8, breath: 0.7, armL: { swing: 30, out: 30, elbow: 40 }, armR: { swing: 20, out: 36, elbow: 30 },
    hair: 10, cape: 12, pole: 8, flap: 1, flicker: 0.6, axeAt: { at: [-19, 11, 10], spin: 6 },
    footL: { at: [-12, 0, 9], toe: 40 }, footR: { at: [12, 0, -9], toe: 50 },
  },
  {
    hip: [3, -22, 0], lean: 22, pitch: 10, jaw: 0.6, breath: 0.4, armL: { swing: 58, out: 18, elbow: 30 }, armR: { swing: 40, out: 30, elbow: 40 },
    hair: 16, cape: 8, pole: 14, flap: 0.6, flicker: 0.9, glow: 0.8, axeAt: { at: [-19, 10.5, 10], spin: 4 },
    footL: { at: [-6, 0, 9], toe: 70 }, footR: { at: [14, 0, -9], toe: 70 },
  },
  {
    hip: [3, -22, 0], lean: 34, pitch: 24, jaw: 0.5, breath: 0.2, armL: { swing: 70, out: 14, elbow: 20 }, armR: { swing: 20, out: 30, elbow: 50 },
    hair: 10, cape: 4, pole: 20, flap: 0.3, glow: 0, fall: 8, axeAt: { at: [-19, 10.5, 10], spin: 4 },
    footL: { at: [-6, 0, 9], toe: 70 }, footR: { at: [14, 0, -9], toe: 70 },
  },
  {
    hip: [3, -23, 0], lean: 40, pitch: 34, yaw: 10, tilt: -8, jaw: 0.6, breath: 0, armL: { swing: 74, out: 12, elbow: 16 }, armR: { swing: 6, out: 24, elbow: 60 },
    hair: 4, cape: 2, pole: 26, flap: 0.1, glow: 0, fall: 14, axeAt: { at: [-19, 10.5, 10], spin: 4 },
    footL: { at: [-6, 0, 9], toe: 70 }, footR: { at: [14, 0, -9], toe: 70 },
  },
];

/** Poses de cada clipe, no formato de `sculptArt` (`ClipPoses`). */
export const WARLORD_POSES = {
  idle: Array.from({ length: 8 }, (_, k) => idlePose(k, 8)),
  walk: Array.from({ length: 8 }, (_, k) => walkPose(k / 8)),
  attack: ATTACK,
  special: SPECIAL,
  skill: SKILL,
  death: DEATH,
};
