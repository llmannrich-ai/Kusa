import { SCULPT_SIZE, Sculpt, render, tween, v3, type Frame, type Look, type Material, type V3, type View } from "./sculpt.ts";

/**
 * Elemental de Areia esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): um redemoinho que pensa. Da areia
 * sobe um funil de faixas de vento em espiral (girar a espiral é o próprio movimento), que vira o peito e a cabeça de
 * areia empelotada, com olhos âmbar acesos e coroa de lascas de arenito; os braços são areia grossa com punhos de
 * pedra, e pedras e grãos orbitam em volta. Na morte desmorona num monte de areia. Olha para a esquerda (x negativo).
 */

const M = { sand: 0, dark: 1, stone: 2, eye: 3, mouth: 4, dust: 5 } as const;

function look(): Look {
  const materials: Material[] = [];
  materials[M.sand] = { ramp: ["#1f0e08", "#36190c", "#522612", "#703518", "#8f4a20", "#ad632b", "#c88340", "#dfa865", "#f2d29a"], grain: 0.3, grainSize: 0.6, bump: 0.45, bumpSize: 0.5, lineDepth: 0.9 };
  materials[M.dark] = { ramp: ["#1c0d07", "#33180b", "#4f2610", "#6e3815", "#8d4d1c", "#a96526"], grain: 0.35, grainSize: 0.5, bump: 0.4, bumpSize: 0.45 };
  materials[M.stone] = { ramp: ["#1c1410", "#33261d", "#4f3c2d", "#6d5440", "#8c6e54", "#ab8a6a", "#c7a784", "#dfc5a3"], grain: 0.2, grainSize: 0.5, bump: 0.5, bumpSize: 0.6, gloss: 0.2, shine: 8 };
  materials[M.eye] = { ramp: ["#7a3a06", "#c46a10", "#f2a52a", "#ffd970", "#fff6d0"], emit: 0.85 };
  materials[M.mouth] = { ramp: ["#070302", "#140904", "#22100a", "#331a10"], bias: -0.25 };
  materials[M.dust] = { ramp: ["#6b4a30", "#9a7650", "#c4a27a", "#e2c9a4", "#f4e6cc", "#fff8ec"], grain: 0.15, grainSize: 0.4, bias: 0.12, lineDepth: 0.5 };
  return { materials, outline: "#1a0c05", bounce: { color: "#f0b46a", power: 0.55 }, occlusion: 0.55 };
}

// --- Pose ----------------------------------------------------------------------------------------------------------

export interface EPose {
  /** Giro do redemoinho (graus; a espiral tem 3 braços, então a cada 120° ela se repete). */
  spin?: number;
  /** Inclinação (graus; positivo = a frente desce) e deslocamento para a frente (negativo = para onde olha). */
  lean?: number;
  x?: number;
  /** Altura do corpo acima do funil (subir e descer) e largura do funil (o Redemoinho abre). */
  rise?: number;
  width?: number;
  /** Braços: ombro (0 = caído, 90 = para a frente, 180 = para cima) e cotovelo, de cá e de lá; `spread` abre. */
  arm?: readonly [number, number];
  elbow?: readonly [number, number];
  spread?: number;
  /** Rajada de Areia saindo dos punhos (0..1). */
  blast?: number;
  /** Morte: o quanto desmoronou (0..1). */
  fall?: number;
  /** Olhos acesos (0..1). */
  glow?: number;
}

const D2R = Math.PI / 180;
const H = 20;
const swing = (o: V3, deg: number, len: number, z = 0): V3 => v3.add(o, [-Math.sin(deg * D2R) * len, -Math.cos(deg * D2R) * len, z]);

/** Hash 0..1 fixo por número (posições "soltas" que não mudam de um quadro para outro). */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function elemental(p: EPose = {}): Sculpt {
  const sc = new Sculpt();
  const spin = p.spin ?? 0, fall = p.fall ?? 0, width = (p.width ?? 1) * (1 + fall * 0.3);
  const top = H * (1 - fall * 0.85) + (p.rise ?? 0);
  const radius = (y: number) => 2.4 + (8.6 * width - 2.4) * Math.pow(Math.max(0, y) / H, 1.4);

  // --- Monte de areia no chão (cresce quando desmorona) ---
  sc.ell([0, 0, 0], [4.5 + fall * 11, 1.2 + fall * 5.5, 4.5 + fall * 11], M.sand);

  sc.push(rotZ(p.lean ?? 0), [0, 0, 0], [p.x ?? 0, 0, 0]);
  // --- Funil: miolo escuro e as faixas de vento em espiral por cima ---
  if (top > 2) {
    sc.cone([0, 0, 0], [0, top, 0], 1.8, radius(H) * 0.82 * (top / H), M.dark);
    for (let a = 0; a < 3; a++)
      for (let i = 0; i < 13; i++) {
        const t = i / 12, y = t * top;
        const ang = (spin + a * 120 + t * 420) * D2R, r = radius(t * H) * (top / H + (1 - top / H) * 0.6);
        const c: V3 = [Math.cos(ang) * r, y, Math.sin(ang) * r];
        const tan = v3.norm([-Math.sin(ang), 0.18, Math.cos(ang)]);
        const len = 2 + r * 0.55;
        sc.seg(v3.sub(c, v3.mul(tan, len)), v3.add(c, v3.mul(tan, len)), 1.3, 0.7, a === 0 ? M.dust : a === 1 ? M.sand : M.dark, { up: [0, 1, 0] });
      }
  }

  // --- Peito e cabeça de areia empelotada ---
  const chest: V3 = [0.5, top + 5, 0];
  const body = sc.part();
  sc.ell(chest, [7.2, 6.6, 8.2], M.sand, { part: body });
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05 + 0.4;
    sc.ell(v3.add(chest, [Math.cos(a) * 4.5, 1 + Math.sin(k * 2.1) * 3, Math.sin(a) * 5.5]), [3.4, 3, 3.4], M.sand, { part: body });
  }
  const head: V3 = v3.add(chest, [-3.2, 9 - fall * 3, 0]);
  sc.ell(head, [5, 4.4, 4.8], M.sand, { part: body });
  sc.ell(v3.add(head, [-2.6, 2.4, 0]), [3, 1.4, 4.4], M.dark, { part: body });
  const glow = (p.glow ?? 1) * (1 - fall);
  for (const s of [1, -1]) {
    sc.ell(v3.add(head, [-4.2, 0.9, s * 1.9]), [0.9, 0.9, 1.3], M.mouth, { part: body });
    if (glow > 0.05) sc.ball(v3.add(head, [-4.9, 0.9, s * 1.9]), 0.55 + glow * 0.55, M.eye);
  }
  sc.ell(v3.add(head, [-4.3, -2.2, 0]), [1.2, 1.1, 2.3], M.mouth, { part: body });
  // Coroa de lascas de arenito.
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 1.6 - 0.2;
    const base = v3.add(head, [Math.cos(a) * 2.6 + 1, 3.4, Math.sin(a) * 3.4]);
    sc.cone(base, v3.add(base, [0.6 + k * 0.3, 3 + (k % 2) * 1.6, Math.sin(a) * 1.2]), 1.2, 0.3, M.stone);
  }

  // --- Braços de areia grossa e punhos de pedra ---
  const arm = p.arm ?? [40, 40], elbow = p.elbow ?? [40, 40], spread = p.spread ?? 0;
  [1, -1].forEach((s, k) => {
    const sh = v3.add(chest, [0.5, 3, s * 8.4]);
    const out = s * (0.25 + spread);
    const el = swing(sh, arm[k], 8.5 * (1 - fall * 0.4), out * 8.5);
    const wr = swing(el, arm[k] + elbow[k], 8.5 * (1 - fall * 0.4), out * 4);
    const part = sc.part();
    for (let q = 0; q <= 4; q++) sc.ball(v3.lerp(sh, el, q / 4), 3.3 - q * 0.2, M.sand, part);
    for (let q = 1; q <= 4; q++) sc.ball(v3.lerp(el, wr, q / 4), 2.6 - q * 0.1, M.sand, part);
    sc.ell(v3.add(wr, v3.mul(v3.norm(v3.sub(wr, el)), 2)), [3.4, 3, 3.2], M.stone, { part });
    // Rajada de Areia: um jato de faixas e grãos saindo do punho para a frente.
    const blast = p.blast ?? 0;
    if (blast > 0)
      for (let j = 0; j < 9; j++) {
        const d = (j + 1) * 3.2 * blast;
        const c = v3.add(wr, [-d - 2, (rnd(j + k * 9) - 0.5) * (2 + j * 0.8), (rnd(j * 3 + k) - 0.5) * (2 + j * 0.8)]);
        sc.seg(v3.add(c, [1.6, 0, 0]), v3.add(c, [-1.6, 0, 0]), 0.5 + j * 0.06, 0.9 + j * 0.12, j % 2 ? M.dust : M.sand, { up: [0, 1, 0] });
      }
  });

  // --- Pedras e grãos orbitando ---
  const orbit = spin * 1.5 * D2R;
  for (let i = 0; i < 7; i++) {
    const a = orbit + i * 0.9, y = 3 + i * 4.2 * (1 - fall * 0.8);
    const r = radius(Math.min(H, y)) * (1 - fall * 0.5) + 4 + (i % 3);
    sc.ell([Math.cos(a) * r, y, Math.sin(a) * r], [0.8 + rnd(i) * 0.9, 0.7 + rnd(i + 3) * 0.6, 0.8 + rnd(i + 5) * 0.7], M.stone);
  }
  for (let i = 0; i < 16; i++) {
    const a = orbit * 1.3 + i * 0.8, y = 1 + rnd(i * 7) * (top + 10);
    const r = radius(Math.min(H, y)) + 2 + rnd(i * 5) * 4;
    sc.ball([Math.cos(a) * r, y, Math.sin(a) * r], 0.45, M.dust);
  }
  sc.pop();
  return sc;
}

function rotZ(deg: number) {
  const a = deg * D2R, c = Math.cos(a), s = Math.sin(a);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]] as const;
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

export const ELEMENTAL_FEET = SCULPT_SIZE - 16;
const PITCH = 30;
const SCALE = 1.9;
const YAW: Record<View, number> = { side: 18, front: 90, back: -90 };

export function shootElemental(pose: EPose, view: View): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 4 : SCULPT_SIZE / 2;
  return render(elemental(pose), { size: SCULPT_SIZE, feet: ELEMENTAL_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, look());
}

const DEF: EPose = { spin: 0, lean: 0, x: 0, rise: 0, width: 1, arm: [40, 40], elbow: [40, 40], spread: 0, blast: 0, fall: 0, glow: 1 };
const K = (p: EPose): EPose => ({ ...DEF, ...p });

/**
 * Poses de perfil. O giro anda sempre (a espiral se repete a cada 120°: o parado gira 120° em 6 quadros, o andar em 8,
 * mais rápido); golpe com os dois punhos, Redemoinho (especial) abrindo o funil e os braços, Rajada (2ª habilidade)
 * jogando areia para a frente, e a morte desmoronando.
 */
export const ELEMENTAL_POSES = {
  idle: Array.from({ length: 6 }, (_, k): EPose => K({ spin: k * 20, rise: Math.sin((k / 6) * Math.PI * 2) * 0.8, arm: [40 + Math.sin((k / 6) * Math.PI * 2) * 6, 44], elbow: [42, 38] })),
  walk: Array.from({ length: 8 }, (_, k): EPose => K({ spin: k * 15, lean: 9, rise: Math.sin((k / 8) * Math.PI * 4) * 0.6, arm: [55, 50], elbow: [35, 40], width: 0.95 })),
  // Golpe: ergue os dois punhos de pedra e bate para a frente e para baixo.
  attack: tween(([
    { spin: 0, arm: [40, 40], elbow: [42, 38] },
    { spin: 20, lean: -8, arm: [160, 150], elbow: [30, 30], rise: 1.5 },
    { spin: 45, lean: 16, x: -3, arm: [70, 66], elbow: [5, 8], rise: -1 },
    { spin: 60, lean: 4, arm: [45, 45], elbow: [35, 35] },
  ] satisfies EPose[]).map(K), 6),
  // Especial (Redemoinho): o funil abre e gira rápido, os braços abrem e giram junto.
  special: tween(([
    { spin: 0, width: 1, arm: [40, 40], elbow: [42, 38] },
    { spin: 60, width: 1.35, arm: [100, 100], elbow: [10, 10], spread: 0.6, rise: 1.5 },
    { spin: 150, width: 1.55, arm: [110, 105], elbow: [5, 5], spread: 0.8, rise: 2.5 },
    { spin: 240, width: 1.1, arm: [50, 50], elbow: [35, 35] },
  ] satisfies EPose[]).map(K), 6),
  // Rajada de Areia: recua e empurra os dois punhos para a frente, cuspindo areia.
  skill: tween(([
    { spin: 0, arm: [40, 40], elbow: [42, 38] },
    { spin: 20, lean: -10, arm: [70, 64], elbow: [80, 80] },
    { spin: 45, lean: 12, x: -2, arm: [90, 86], elbow: [0, 0], blast: 0.7 },
    { spin: 70, lean: 8, x: -2, arm: [88, 84], elbow: [4, 4], blast: 1 },
    { spin: 100, lean: 0, arm: [50, 48], elbow: [35, 35], blast: 0 },
  ] satisfies EPose[]).map(K), 6),
  // Morte: os olhos apagam e o redemoinho perde a forma, desabando num monte de areia.
  death: tween(([
    { spin: 0, lean: -12, arm: [150, 140], elbow: [20, 30], spread: 0.4, rise: 2 },
    { spin: 30, lean: 6, arm: [60, 50], elbow: [40, 40], fall: 0.35, glow: 0.6 },
    { spin: 50, lean: 0, arm: [20, 20], elbow: [60, 60], fall: 1, glow: 0 },
  ] satisfies EPose[]).map(K), 5),
};
