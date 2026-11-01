import { SCULPT_FEET, SCULPT_SIZE, Sculpt, basis, lerp3, render, rot, turn, v3, tween, type Frame, type Look, type Material, type V3, type View } from "./sculpt.ts";

/**
 * Abutre Gigante esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): corpo de penas escuras, colarinho de
 * penugem clara, pescoço pelado e enrugado, cabeça vermelha, bico de gancho e as asas montadas pena a pena (cobertas
 * claras por cima, secundárias e as primárias abertas em "dedos" na ponta), cauda em leque e garras. Voa: o corpo
 * paira acima do chão (y = 0), que é onde fica a sombra no jogo. Olha para a esquerda (x negativo).
 */

const M = { plumage: 0, coverts: 1, flight: 2, ruff: 3, skin: 4, beak: 5, hook: 6, leg: 7, talon: 8, eye: 9 } as const;

function look(): Look {
  const materials: Material[] = [];
  materials[M.plumage] = { ramp: ["#0c090b", "#181215", "#261c1d", "#352824", "#47362c", "#5d4835", "#785f43", "#957a56"], grain: 0.2, grainSize: 1.1, bump: 0.45, bumpSize: 0.7, lineDepth: 1.2 };
  materials[M.coverts] = { ramp: ["#1e140f", "#352416", "#4e351e", "#6a4a28", "#876136", "#a47b47", "#bf975e", "#d8b57c"], grain: 0.16, grainSize: 0.9, bump: 0.3, bumpSize: 0.6, lineDepth: 0.9 };
  materials[M.flight] = { ramp: ["#070506", "#110d0f", "#1c1618", "#2a2223", "#3a3030", "#4e4240", "#685954"], gloss: 0.25, shine: 10, grain: 0.1, lineDepth: 0.7 };
  materials[M.ruff] = { ramp: ["#4a3b2f", "#6e5b48", "#958166", "#b8a487", "#d6c6a8", "#ece2cb", "#faf5e8"], grain: 0.3, grainSize: 0.7, bump: 0.6, bumpSize: 0.55, lineDepth: 0.8 };
  materials[M.skin] = { ramp: ["#2e0b10", "#521518", "#7a2420", "#a2392b", "#c45a3c", "#de8159", "#efab82", "#f9d2b0"], gloss: 0.35, shine: 16, bump: 0.5, bumpSize: 0.55, grain: 0.1 };
  materials[M.beak] = { ramp: ["#2a2218", "#4a3f2c", "#6e6246", "#958865", "#b9ae88", "#d9d1ad", "#f2ecd4"], gloss: 0.6, shine: 24 };
  materials[M.hook] = { ramp: ["#0b0908", "#1a1512", "#2c241d", "#40352b", "#574a3b"], gloss: 0.8, shine: 30 };
  materials[M.leg] = { ramp: ["#1a1819", "#2f2b2d", "#494345", "#655d5e", "#857b7a", "#a69b96", "#c6bcb4"], bump: 0.4, bumpSize: 0.5, grain: 0.1 };
  materials[M.talon] = { ramp: ["#050405", "#0f0c0d", "#1d1819", "#2f2829", "#463c3c"], gloss: 0.9, shine: 30 };
  materials[M.eye] = { ramp: ["#140802", "#4a2206", "#8f520c", "#d08a1c", "#ffe9a8"], gloss: 2, shine: 50 };
  return { materials, outline: "#120a08", bounce: { color: "#f0b46a", power: 0.5 }, occlusion: 0.55 };
}

// --- Pose ----------------------------------------------------------------------------------------------------------

export interface VPose {
  /** Altura do corpo (unidades acima do chão). */
  y?: number;
  /** Corpo para a frente (negativo = para a esquerda, para onde olha). */
  x?: number;
  /** Inclinação (graus; positivo = a frente sobe). */
  lean?: number;
  /** Asas: batida (graus acima do horizonte), quanto dobram (0..1) e quanto varrem para trás (graus). */
  flap?: number;
  fold?: number;
  sweep?: number;
  /** Cauda: abertura do leque (0..1). */
  tail?: number;
  /** Cabeça: avança (+) ou recolhe (−) e baixa (graus). */
  reach?: number;
  dip?: number;
  /** Bico aberto (0..1). */
  gape?: number;
  /** Patas: 0 encolhidas, 1 penduradas, 2 garras para a frente (bote). */
  legs?: number;
  /** Rolar o corpo (graus; morte). */
  roll?: number;
}

const D2R = Math.PI / 180;

export function vulture(p: VPose = {}): Sculpt {
  const sc = new Sculpt();
  const y = p.y ?? 26, lean = p.lean ?? 0, roll = p.roll ?? 0;
  const pivot: V3 = [0, 24, 0];
  sc.push(mulM(rot("x", roll), rot("z", -lean)), pivot, [p.x ?? 0, y - 24, 0]);

  // --- Corpo, peito e cauda em leque ---
  const body = sc.part();
  sc.ell([2, 24, 0], [11.5, 7.2, 8], M.plumage, { part: body, axes: basis([1, -0.12, 0]) });
  sc.ell([-5.5, 22.5, 0], [7, 6.8, 7], M.plumage, { part: body });
  const spread = p.tail ?? 0.4;
  for (let k = -3; k <= 3; k++) {
    const a: V3 = [11, 24.5, k * 1.1];
    const b: V3 = [24, 23 - Math.abs(k) * 0.3, k * (2.6 + spread * 2.4)];
    sc.seg(a, b, 0.8, 2.3, M.flight, { up: [0, 1, 0], over: 0.6 });
  }
  // --- Patas: coxas emplumadas, canela cinza e três dedos com garras ---
  const legs = p.legs ?? 1;
  for (const s of [1, -1]) {
    const part = sc.part();
    const hip: V3 = [1, 19.5, s * 3.6];
    sc.ball(hip, 3, M.plumage, part);
    const knee: V3 = legs >= 2 ? [-6, 16, s * 3.8] : [1.5 - legs * 0.5, 17 - legs * 2.5, s * 3.8];
    const foot: V3 = legs >= 2 ? [-13, 13, s * 3.6] : [knee[0] - 1 - legs, knee[1] - 5 - legs * 2, s * 3.6];
    sc.cone(knee, foot, 1.3, 1, M.leg, { part });
    sc.ball(knee, 2.2, M.plumage, part);
    const fwd: V3 = legs >= 2 ? [-1, -0.2, 0] : [-0.5, -1, 0];
    for (const t of [-1, 0, 1]) {
      const d = v3.norm(v3.add(fwd, [0, 0, t * 0.6]));
      const mid = v3.add(foot, v3.mul(d, 2.6));
      sc.cone(foot, mid, 0.8, 0.6, M.leg, { part });
      sc.cone(mid, v3.add(mid, v3.add(v3.mul(d, 1.4), [0, -1.2, 0])), 0.55, 0.15, M.talon, { part });
    }
  }

  // --- Asas: a de lá primeiro (o z decide), pena a pena ---
  for (const s of [1, -1]) wing(sc, s, p);

  // --- Colarinho, pescoço pelado, cabeça e bico ---
  const reach = p.reach ?? 0, dip = p.dip ?? 0;
  const ruffPart = sc.part();
  const collar: V3 = [-9.5, 26, 0];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    sc.ball(v3.add(collar, [Math.cos(a) * 1.2, Math.sin(a) * 3.8, Math.cos(a + 0.6) * 4.2]), 2.6, M.ruff, ruffPart);
  }
  sc.ball(collar, 3.8, M.ruff, ruffPart);
  const neckDir = turn(rot("z", -dip), v3.norm([-0.55, 0.8, 0]));
  const n1 = v3.add(collar, v3.mul(neckDir, 5 + reach * 0.5));
  const headDir = turn(rot("z", -dip), v3.norm([-1, 0.15, 0]));
  const n2 = v3.add(n1, v3.mul(headDir, 2.5 + reach));
  const skin = sc.part();
  sc.cone(collar, n1, 2.4, 2, M.skin, { part: skin, band: { n: 4, depth: 0.14 } });
  sc.cone(n1, n2, 2, 1.9, M.skin, { part: skin, band: { n: 2, depth: 0.12 } });
  const head = v3.add(n2, v3.mul(headDir, 2.6));
  sc.ell(head, [4.2, 3.2, 3], M.skin, { part: skin, axes: basis(headDir) });
  // Sobrancelha (mais escura) e os olhos âmbar logo abaixo.
  sc.ell(v3.add(head, v3.add(v3.mul(headDir, -0.6), [0, 1.9, 0])), [2.8, 1, 2.6], M.skin, { part: skin, axes: basis(headDir) });
  for (const s of [1, -1]) sc.ball(v3.add(head, v3.add(v3.mul(headDir, 1.2), [0, 0.8, s * 2.2])), 0.85, M.eye, skin);
  // Bico: base clara, ponta em gancho escura; abre com `gape`.
  const gape = (p.gape ?? 0) * 20;
  const b0 = v3.add(head, v3.mul(headDir, 3.4));
  const upDir = turn(rot("z", gape * 0.4), headDir), loDir = turn(rot("z", -gape), headDir);
  const b1 = v3.add(b0, v3.mul(upDir, 3.6));
  const beak = sc.part();
  sc.cone(b0, b1, 1.75, 1.35, M.beak, { part: beak });
  sc.cone(b1, v3.add(b1, v3.add(v3.mul(upDir, 1.2), [0, -1.6, 0])), 1.25, 0.35, M.hook, { part: beak });
  sc.cone(v3.add(b0, [0, -0.7, 0]), v3.add(b0, v3.add(v3.mul(loDir, 3.2), [0, -0.6, 0])), 1.1, 0.6, M.beak, { part: beak });

  sc.pop();
  return sc;
}

/** Asa do lado `s`: ossos no plano da asa, cobertas, secundárias e primárias em leque com as pontas separadas. */
function wing(sc: Sculpt, s: number, p: VPose) {
  const flap = (p.flap ?? 10) * D2R, fold = p.fold ?? 0, sweep = (p.sweep ?? 0) * D2R;
  // Envergadura (`d`) sobe com a batida e varre para trás; corda (`c`) aponta para a cauda; `n` é a normal da asa.
  let d: V3 = [Math.sin(sweep), Math.sin(flap) * Math.cos(sweep), s * Math.cos(flap) * Math.cos(sweep)];
  d = v3.norm(d);
  const c = v3.norm(v3.sub([1, 0, 0], v3.mul(d, d[0])));
  const n = v3.norm(v3.cross(d, c));
  const at = (o: V3, along: number, back: number): V3 => v3.add(o, v3.add(v3.mul(d, along), v3.mul(c, back)));
  const sh: V3 = [-3, 27, s * 5.5];
  const elbow = at(sh, 13 * (1 - 0.35 * fold), 2.5 + 5 * fold);
  const wrist = at(elbow, 12 * (1 - 0.55 * fold), -1.5 + 3 * fold);
  const part = sc.part();
  // Borda da frente (o braço coberto de penas).
  sc.cone(sh, elbow, 3.2, 2.5, M.plumage, { part });
  sc.cone(elbow, wrist, 2.5, 1.8, M.coverts, { part });
  const feather = (base: V3, dir: V3, length: number, width: number, mat: number, thick = 0.75) => {
    const tip = v3.add(base, v3.mul(v3.norm(dir), length));
    sc.seg(base, tip, thick, width, mat, { up: n, part: sc.part(), over: 0.3 });
  };
  // Secundárias: do ombro ao pulso, para trás.
  for (let k = 0; k < 8; k++) {
    const t = k / 7;
    const base = lerp3(lerp3(sh, elbow, Math.min(1, t * 2)), wrist, Math.max(0, t * 2 - 1));
    feather(at(base, 0, 1.2), v3.add(c, v3.mul(d, 0.12 + t * 0.15)), 12 + t * 2 - fold * 4, 2.5, M.flight);
  }
  // Primárias: do pulso, em leque da envergadura até para trás; as pontas separadas ("dedos").
  for (let k = 0; k < 6; k++) {
    const t = k / 5;
    const a = (-6 + t * 60 + fold * 50) * D2R;
    const dir = v3.add(v3.mul(d, Math.cos(a)), v3.mul(c, Math.sin(a)));
    feather(at(wrist, -t * 1.5, t * 1.4), dir, (19 - t * 4) * (1 - fold * 0.35), 2.1 - t * 0.2, M.flight, 0.7);
  }
  // Cobertas: duas fileiras claras por cima, na frente das penas de voo.
  for (let k = 0; k < 6; k++) {
    const t = k / 5;
    const base = lerp3(sh, wrist, t * 0.95);
    feather(v3.add(at(base, 0, 0.6), v3.mul(n, 0.9)), v3.add(c, v3.mul(d, 0.25)), 6.5 - t * 1.5, 3.2, M.coverts, 1.1);
    feather(v3.add(at(base, 0, -0.4), v3.mul(n, 1.6)), v3.add(c, v3.mul(d, 0.3)), 3.8, 3, M.plumage, 1.2);
  }
}

function mulM(a: ReturnType<typeof rot>, b: ReturnType<typeof rot>) {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as ReturnType<typeof rot>;
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

const PITCH = 42;
const SCALE = 1.28;
/** O perfil de um voador fica em três-quartos: de lado, as asas abertas viram uma faixa vertical. */
const YAW: Record<View, number> = { side: 40, front: 90, back: -90 };

export function shootVulture(pose: VPose, view: View): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 4 : SCULPT_SIZE / 2;
  return render(vulture(pose), { size: SCULPT_SIZE, feet: SCULPT_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, look());
}

/** Poses de perfil de cada clipe: plana no parado, bate as asas para andar, mergulha com as garras e foge subindo. */
/** Pose completa (a interpolação só mistura o que as duas poses têm). */
const DEF: VPose = { y: 26, x: 0, lean: 0, flap: 10, fold: 0, sweep: 0, tail: 0.4, reach: 0, dip: 0, gape: 0, legs: 1, roll: 0 };
const K = (p: VPose): VPose => ({ ...DEF, ...p });

export const VULTURE_POSES = {
  // Parado: plana (asas abertas, quase sem bater), a cabeça mexe.
  idle: tween([0, 1, 2].map((k): VPose => K({ y: 26 + k * 0.7, flap: 12 - k * 5, sweep: k * 2, tail: 0.5 + k * 0.1, dip: k * 4, reach: k * 0.3, legs: 0.6 })), 6, true),
  // Andar: o bater de asas completo (sobe dobrando, desce aberta).
  walk: tween(([
    { y: 25, flap: 58, fold: 0.35, sweep: 8, lean: -4, legs: 0.5 },
    { y: 26.5, flap: 18, fold: 0, lean: -6, legs: 0.5 },
    { y: 28, flap: -28, fold: 0.05, sweep: -6, lean: -6, legs: 0.6 },
    { y: 26.5, flap: 20, fold: 0.4, sweep: 12, lean: -5, legs: 0.5 },
  ] satisfies VPose[]).map(K), 8, true),
  // Golpe: arma as asas no alto, mergulha com as garras para a frente e bica.
  attack: tween(([
    { y: 28, flap: 62, fold: 0.25, lean: 10, legs: 1.2, reach: -1, tail: 0.9 },
    { y: 20, x: -5, flap: 30, fold: 0.5, sweep: 25, lean: -14, legs: 2, reach: 2, gape: 0.6 },
    { y: 18, x: -7, flap: -10, fold: 0.3, sweep: 10, lean: -18, legs: 2, reach: 3, dip: 25, gape: 1 },
    { y: 24, x: -2, flap: 40, fold: 0.3, lean: 0, legs: 1, reach: 0 },
  ] satisfies VPose[]).map(K), 6),
  // Especial (Fuga Ágil): bate forte para baixo e sobe, depois plana de volta.
  special: tween(([
    { y: 24, flap: 70, fold: 0.2, lean: 8, legs: 1, tail: 1 },
    { y: 31, x: 3, flap: -35, fold: 0, sweep: -4, lean: 12, legs: 0.6, tail: 1 },
    { y: 35, x: 4, flap: 45, fold: 0.45, sweep: 15, lean: 6, legs: 0.3 },
    { y: 30, x: 2, flap: 6, lean: 0, legs: 0.5, tail: 0.6 },
  ] satisfies VPose[]).map(K), 6),
  // Morte: tranco com a cabeça para trás, cai rodando e fica no chão de asas abertas, o pescoço mole.
  death: tween(([
    { y: 27, flap: 50, fold: 0.1, lean: 18, legs: 1.3, reach: -2, dip: -25, gape: 1, tail: 1 },
    { y: 16, x: 2, flap: 25, fold: 0.4, lean: -25, roll: 35, legs: 1.5, dip: 30 },
    { y: 7, x: 3, flap: -14, fold: 0.1, sweep: 10, lean: -14, roll: 18, legs: 0.2, reach: 1, dip: 60, tail: 0.8 },
  ] satisfies VPose[]).map(K), 5),
};
