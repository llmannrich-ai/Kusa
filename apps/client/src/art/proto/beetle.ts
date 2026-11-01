import { SCULPT_SIZE, Sculpt, applySkin, basis, lerp3, render, rot, turn, tween, v3, type Frame, type Look, type Mat3, type Material, type Skin, type V3, type View } from "./sculpt.ts";

/**
 * Escaravelho de Ferrugem (Ermos Rubros) esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): o besouro que
 * come o ferro largado na mina. Élitros em domo de ferro escuro com brilho de metal e placas de ferrugem lascando por
 * cima, o pronoto com um chifre curto, a cabeça baixa com as mandíbulas em gancho e as antenas de clava, e 6 patas por
 * cinemática inversa (o passo em tripé: a 1ª e a 3ª de um lado com a 2ª do outro). No golpe, os élitros abrem e as asas
 * de membrana aparecem por baixo enquanto ele avança fechando as mandíbulas; na morte, vira de costas. Olha para a
 * esquerda (x negativo), chão em y = 0.
 */

const M = { shell: 0, rust: 1, legs: 2, jaw: 3, eye: 4, belly: 5, wing: 6, tip: 7 } as const;

function look(): Look {
  const m: Material[] = [];
  // Ferro escuro azulado com reflexo de metal; a sombra puxa para o vinho do barro.
  m[M.shell] = { ramp: ["#0a0708", "#141012", "#201a1c", "#2e2628", "#3e3536", "#504646", "#655a58", "#7e726c", "#9c9088"], gloss: 1.1, shine: 34, grain: 0.1, grainSize: 1.6, bump: 0.25, bumpSize: 0.7, belly: M.belly };
  m[M.rust] = { ramp: ["#2a0e06", "#4a1a08", "#6e2a0c", "#923e12", "#b0561a", "#c87028", "#dc8c3c", "#eaa85a"], grain: 0.4, grainSize: 0.35, bump: 0.7, bumpSize: 0.3, speck: 0.12, lineDepth: 0.8 };
  m[M.legs] = { ramp: ["#060405", "#100b0b", "#1c1514", "#2a201e", "#3a2c28", "#4e3c34", "#664e42"], gloss: 0.6, shine: 22, grain: 0.08, speck: 0.06 };
  m[M.jaw] = { ramp: ["#0c0606", "#1e0e0a", "#341a10", "#4e2a16", "#6c3e1e", "#8c5628", "#b07838"], gloss: 0.9, shine: 30, lineDepth: 0.6 };
  m[M.eye] = { ramp: ["#1a0402", "#4a0e04", "#8a2a08", "#d05a14", "#ffb040"], emit: 0.7 };
  m[M.belly] = { ramp: ["#160c0a", "#2a1a14", "#40281e", "#5a3a2a", "#744e38"], grain: 0.1, bias: 0.04 };
  m[M.wing] = { ramp: ["#1a0e08", "#3a2212", "#5e3a1e", "#86582e", "#b07e44", "#d4a666"], gloss: 1.2, shine: 40, bias: 0.05, lineDepth: 0.3 };
  m[M.tip] = { ramp: ["#040303", "#0c0807", "#18100c", "#261a12", "#382618"], gloss: 0.8, shine: 30 };
  return { materials: m, outline: "#0c0606", bounce: { color: "#c87040", power: 0.5 }, occlusion: 0.6, rim: { color: "#f0b080", power: 0.35 } };
}

// --- Pose ------------------------------------------------------------------------------------------------------------

export interface BtPose {
  /** Fase do passo (0..1) e quanto anda (0 = parado). */
  phase?: number;
  stride?: number;
  /** Corpo para a frente (negativo = para onde olha), para cima, e inclinação (graus; positivo = a frente sobe). */
  x?: number;
  lift?: number;
  lean?: number;
  /** Élitros abertos (0..1): as asas aparecem por baixo. */
  open?: number;
  /** Mandíbulas abertas (0..1) e antenas (graus para cima). */
  jaw?: number;
  antenna?: number;
  /** Morte: rola o corpo (graus) e encolhe as patas (0..1). */
  roll?: number;
  curl?: number;
}

const D2R = Math.PI / 180;
/** Hash 0..1 fixo por número. */
const rnd = (n: number) => {
  const x = Math.sin(n * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
};

function mulM(a: Mat3, b: Mat3): Mat3 {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as Mat3;
}

export function beetle(p: BtPose = {}): Sculpt {
  const sc = new Sculpt();
  const x0 = p.x ?? 0, lift = p.lift ?? 0, lean = p.lean ?? 0, roll = p.roll ?? 0, curl = p.curl ?? 0;
  const pivot: V3 = [0, 10, 0];
  const lay = Math.sin(Math.min(180, Math.abs(roll)) * D2R / 2) ** 2;
  const bodyM = mulM(rot("x", roll), rot("z", -lean));
  const move: V3 = [x0, lift - lay * 2.5, 0];
  const B = (q: V3): V3 => v3.add(turn(bodyM, q, pivot), move);

  // --- Patas: o quadril vai com o corpo, o pé fica no chão ---
  const stride = p.stride ?? 0, phase = p.phase ?? 0;
  const hips = [-11, -4, 3.5];
  const reach = [-11, -1, 12];
  const spread = [17, 19, 18];
  for (const s of [1, -1])
    for (let i = 0; i < 3; i++) {
      const hip: V3 = [hips[i], 7, s * 6];
      // Tripé: a 1ª e a 3ª de um lado andam com a 2ª do outro.
      const ph = (phase + ((i % 2 === 0) === (s > 0) ? 0 : 0.5)) % 1;
      const sw = ph < 0.5 ? ph / 0.5 - 0.5 : 0.5 - (ph - 0.5) / 0.5;
      const up = ph >= 0.5 ? Math.sin(((ph - 0.5) / 0.5) * Math.PI) * 3 : 0;
      let foot: V3 = [hips[i] + reach[i] + sw * stride, up, s * spread[i]];
      let kneeDir: V3 = [Math.sign(reach[i] || 1) * 0.6, 1, s * 0.7];
      if (curl) {
        const tucked: V3 = [hips[i] + reach[i] * 0.3, 8 - 7 * curl, s * spread[i] * 0.45];
        foot = B(lerp3(foot, tucked, curl));
        kneeDir = [0, 1 - 1.6 * curl, s];
      }
      leg(sc, B(hip), foot, i, v3.norm(turn(bodyM, kneeDir)));
    }
  sc.push(bodyM, pivot, move);

  // --- Barriga e élitros: o domo em duas metades com a costura no meio ---
  sc.ell([4, 7.5, 0], [14, 4.2, 10.5], M.belly);
  const open = p.open ?? 0;
  if (open > 0.05)
    for (const s of [1, -1]) {
      // Asas de membrana: saem de baixo dos élitros e abrem para trás e para o lado.
      const root: V3 = [-2, 13, s * 3];
      const a = (20 + open * 50) * D2R;
      const tip = v3.add(root, [16 + open * 4, 4 + open * 8, s * Math.sin(a) * 16]);
      sc.ell(lerp3(root, tip, 0.5), [11 * (0.6 + open * 0.4), 0.5, 5], M.wing, { axes: basis(v3.sub(tip, root), [0, Math.cos(a), -s * Math.sin(a)]) });
    }
  const shell = sc.part();
  for (const s of [1, -1]) {
    const a = open * 55 * D2R;
    const c: V3 = [5 + open * 2, 12 + open * 2.5, s * (4 + open * 3.4)];
    const axes = basis([1, open * 0.25, 0], [0, Math.cos(a), s * Math.sin(a)]);
    sc.ell(c, [14.5, 8.2, 7.2], M.shell, { part: shell, axes });
    // Os sulcos dos élitros, em faixas ao comprido.
    sc.ell(v3.add(c, v3.mul(axes[1], 0.6)), [13.6, 7.8, 6.2], M.shell, { part: shell, axes, band: { n: 4, depth: 0.12 } });
    // Placas de ferrugem lascando por cima do ferro.
    for (let k = 0; k < 6; k++) {
      const u = (rnd(k * 7 + (s > 0 ? 1 : 2)) - 0.5) * 22, w = 0.2 + rnd(k * 5 + (s > 0 ? 3 : 4)) * 0.7;
      const at = v3.add(c, v3.add(v3.mul(axes[0], u), v3.add(v3.mul(axes[1], 7.9 - (u / 14.5) ** 2 * 3.4), v3.mul(axes[2], (w - 0.5) * 5))));
      const r = 1.6 + rnd(k * 13 + (s > 0 ? 5 : 6)) * 2.2;
      sc.ell(at, [r * 1.3, 0.7, r], M.rust, { part: shell, axes });
    }
  }

  // --- Pronoto com o chifre curto, cabeça, olhos e antenas ---
  const front = sc.part();
  sc.ell([-11.5, 11, 0], [6.5, 6.2, 9.4], M.shell, { part: front, axes: basis([1, -0.15, 0]) });
  sc.ell([-12, 15.6, 0], [3.4, 1.2, 5], M.rust, { part: front });
  sc.cone([-14, 15, 0], [-19, 20.5, 0], 2.3, 0.6, M.shell, { part: front });
  sc.ell([-19.5, 8, 0], [4.6, 3.8, 5.6], M.shell, { part: front, axes: basis([1, 0.35, 0]) });
  for (const s of [1, -1]) {
    sc.ball([-21.4, 9.6, s * 3.8], 1.2, M.eye);
    // Antena: o cabo fino e a clava em lâminas na ponta.
    const ant = (p.antenna ?? 20) * D2R;
    const base: V3 = [-22.5, 10, s * 2.6];
    const mid = v3.add(base, [-4 * Math.cos(ant), 4 * Math.sin(ant), s * 2.5]);
    sc.cone(base, mid, 0.5, 0.4, M.legs);
    sc.ell(v3.add(mid, [-1, 0.4, s * 0.4]), [1.5, 0.9, 1.1], M.jaw);
    // Mandíbula em gancho: abre para o lado e fecha cruzando na frente.
    const j = (p.jaw ?? 0.2) * 34 * D2R;
    const root: V3 = [-23, 6.8, s * 2.6];
    const m1 = v3.add(root, [-4.4 * Math.cos(j), -0.6, s * (1 + 4.4 * Math.sin(j))]);
    const m2 = v3.add(m1, [-2.6 * Math.cos(j + 0.9), -0.4, -s * 2.8 * Math.cos(j)]);
    sc.cone(root, m1, 1.6, 1.1, M.jaw);
    sc.cone(m1, m2, 1.1, 0.3, M.tip);
  }
  sc.pop();
  return sc;
}

/** Pata em 2 partes por cinemática inversa, com o espinho da tíbia e o tarso. */
function leg(sc: Sculpt, hip: V3, foot: V3, i: number, kneeDir: V3) {
  const l1 = 9 + i * 0.6, l2 = 11 + i * 0.8;
  const hf = v3.sub(foot, hip);
  const d = Math.min(v3.len(hf), l1 + l2 - 0.2);
  const dirHF = v3.norm(hf);
  const perp = v3.norm(v3.sub(kneeDir, v3.mul(dirHF, v3.dot(kneeDir, dirHF))));
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const knee = v3.add(hip, v3.add(v3.mul(dirHF, a), v3.mul(perp, h)));
  const end = v3.add(hip, v3.mul(dirHF, d));
  const ankle = lerp3(knee, end, 0.75);
  const part = sc.part();
  sc.cone(hip, knee, 1.9, 1.6, M.legs, { part });
  sc.ball(knee, 1.6, M.legs, part);
  sc.cone(knee, ankle, 1.6, 1.2, M.legs, { part, band: { n: 2, depth: 0.1 } });
  sc.cone(ankle, v3.add(ankle, v3.mul(perp, 1.6)), 0.6, 0.15, M.tip, { part });
  sc.cone(ankle, end, 1, 0.45, M.tip, { part });
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

export const BEETLE_FEET = SCULPT_SIZE - 40;
const PITCH = 40;
const SCALE = 1.6;
const YAW: Record<View, number> = { side: 14, front: 90, back: -90 };

export function shootBeetle(pose: BtPose, view: View, skin?: Skin): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 2 : SCULPT_SIZE / 2;
  return render(beetle(pose), { size: SCULPT_SIZE, feet: BEETLE_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, applySkin(look(), skin));
}

const STRIDE = 6;
/**
 * Poses de perfil: o parado mexe as antenas e as mandíbulas; o andar é o tripé; o golpe abre os élitros e avança
 * fechando as mandíbulas (o especial repete o golpe: o escaravelho não tem habilidade); a morte vira de costas.
 */
export const BEETLE_POSES = {
  idle: tween([0, 1, 2].map((k): BtPose => ({ lift: k * 0.25, antenna: 18 + k * 6, jaw: 0.15 + k * 0.12 })), 6, true),
  walk: Array.from({ length: 8 }, (_, k): BtPose => {
    const w = Math.sin((k / 8) * Math.PI * 4);
    return { phase: k / 8, stride: STRIDE, lift: 0.3 + w * 0.3, lean: w * 1, antenna: 22 + w * 5, jaw: 0.2 };
  }),
  attack: tween([
    { x: 0, lean: 0, open: 0, jaw: 0.3, antenna: 20 },
    { x: 2, lean: 6, open: 0.7, jaw: 1, antenna: 40, lift: 1 },
    { x: -6, lean: -6, open: 0.9, jaw: 0, antenna: 10 },
    { x: -2, lean: -1, open: 0.2, jaw: 0.3, antenna: 18 },
  ] satisfies BtPose[], 6),
  get special() { return BEETLE_POSES.attack; },
  death: tween([
    { lean: 10, lift: 2, open: 0.5, jaw: 1, roll: 0, curl: 0 },
    { lean: 0, lift: 3, roll: 100, curl: 0.5, open: 0.2, jaw: 0.6, x: -4 },
    { lean: 0, lift: 0, roll: 180, curl: 1, open: 0, jaw: 0.3, x: -6 },
  ] satisfies BtPose[], 5),
};
