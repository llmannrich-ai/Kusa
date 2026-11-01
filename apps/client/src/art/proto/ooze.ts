import { SCULPT_SIZE, Sculpt, applySkin, render, tween, v3, type Frame, type Look, type Material, type Skin, type V3, type View } from "./sculpt.ts";

/**
 * Lodo de Cinza (Charco Cinzento) esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): a cinza do incêndio que
 * a chuva virou lama. Um monte mole de lombos que sobem e descem (o lombo da frente puxa o corpo quando anda), a crosta
 * de cinza seca por cima com rachaduras de brasa, dois carvões acesos no lugar dos olhos, gotas pingando e restos da
 * turfeira presos na lama (ossos, galhos queimados). O golpe ergue a massa e bate; o Engolir abre a boca de lama e se
 * debruça para a frente; na morte desmancha numa poça. Olha para a esquerda (x negativo).
 */

const M = { mud: 0, ash: 1, crust: 2, ember: 3, mouth: 4, bone: 5, char: 6 } as const;

function look(): Look {
  const m: Material[] = [];
  m[M.mud] = { ramp: ["#0e0d0c", "#1a1816", "#282522", "#38342f", "#4a453e", "#5e584f", "#736c61"], gloss: 0.9, shine: 22, grain: 0.15, grainSize: 0.5, bump: 0.35, bumpSize: 0.45, lineDepth: 0.9 };
  m[M.ash] = { ramp: ["#2a2926", "#43413c", "#5e5c55", "#7a7770", "#97948b", "#b2afa6", "#cbc8bf", "#e2dfd6"], grain: 0.3, grainSize: 0.35, bump: 0.5, bumpSize: 0.3, speck: 0.05, lineDepth: 0.7 };
  m[M.crust] = { ramp: ["#1e1d1b", "#33312d", "#4a4842", "#64615a", "#7e7b72", "#99968c"], grain: 0.35, grainSize: 0.4, bump: 0.6, bumpSize: 0.35, lineDepth: 0.8 };
  m[M.ember] = { ramp: ["#5a1804", "#a03a08", "#e06a12", "#ffa030", "#ffe08a"], emit: 0.85 };
  m[M.mouth] = { ramp: ["#020202", "#080706", "#110f0d", "#1c1a16"], bias: -0.2, lineDepth: 0.4 };
  m[M.bone] = { ramp: ["#5a5440", "#8a8264", "#b6ae8c", "#dcd4b6", "#f6f0dc"], gloss: 0.3, shine: 16, lineDepth: 0.4 };
  m[M.char] = { ramp: ["#050403", "#0e0b08", "#1a1410", "#281e17", "#38291f"], gloss: 0.4, shine: 18, grain: 0.3, grainSize: 0.3, lineDepth: 0.4 };
  return { materials: m, outline: "#0a0908", bounce: { color: "#8a9a8a", power: 0.3 }, occlusion: 0.6, rim: { color: "#d8dcd0", power: 0.4 } };
}

// --- Pose ----------------------------------------------------------------------------------------------------------

export interface OPose {
  /** Fase da ondulação dos lombos (graus). */
  wave?: number;
  /** Altura e largura do monte (1 = normal): o golpe ergue, o andar achata. */
  rise?: number;
  wide?: number;
  /** Inclinação para a frente (graus) e deslocamento para a frente (negativo = para onde olha). */
  lean?: number;
  x?: number;
  /** Boca de lama aberta (0..1): o Engolir. */
  maw?: number;
  /** Morte: o quanto desmanchou (0..1). */
  melt?: number;
  /** Brasas acesas (0..1). */
  glow?: number;
  /** Gota que cai (0..1, a posição dela na queda). */
  drip?: number;
}

const D2R = Math.PI / 180;
/** Hash 0..1 fixo por número. */
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function ooze(p: OPose = {}): Sculpt {
  const sc = new Sculpt();
  const melt = p.melt ?? 0, wave = (p.wave ?? 0) * D2R;
  const rise = (p.rise ?? 1) * (1 - melt * 0.8), wide = (p.wide ?? 1) * (1 + melt * 0.35);
  const lean = (p.lean ?? 0) * D2R, x0 = p.x ?? 0;
  const H = 15 * rise;
  /** Ponto do corpo (u: para a frente/trás, h: altura 0..1) com a inclinação. */
  const at = (u: number, h: number, z: number): V3 => [x0 + u - Math.sin(lean) * h * H, h * H * Math.cos(lean), z];

  // --- Poça debaixo (cresce quando desmancha) ---
  sc.ell([x0, 0.2, 0], [11 * wide, 1 + melt * 0.8, 10 * wide], M.mud);

  // --- O monte: massa central e os lombos em volta, subindo e descendo com a onda ---
  const body = sc.part();
  sc.ell(at(0, 0.42, 0), [10 * wide, 7.5 * rise, 9.5 * wide], M.mud, { part: body });
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.4;
    const bob = Math.sin(wave + k * 1.3) * 0.12;
    const r = 4.5 + rnd(k) * 2.2;
    sc.ell(at(Math.cos(a) * 7.5 * wide, 0.3 + bob + rnd(k + 9) * 0.15, Math.sin(a) * 7 * wide), [r, r * 0.85 * rise, r], M.mud, { part: body });
  }
  // O alto: a "cabeça" de lama, um pouco para a frente.
  const head = at(-2.5, 0.85 + Math.sin(wave) * 0.04, 0);
  if (melt < 0.9) sc.ell(head, [6.8 * wide, 5.4 * rise, 6.8 * wide], M.mud, { part: body });

  // --- Crosta de cinza seca por cima, em placas, com as rachaduras de brasa entre elas ---
  if (melt < 0.7)
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.2;
      const r = 3 + rnd(k * 3) * 2.6;
      const c = v3.add(head, [Math.cos(a) * 4.4 * wide, 3.6 * rise - Math.abs(Math.sin(a)) * 1.2, Math.sin(a) * 4.4 * wide]);
      sc.ell(c, [r * 1.15, 1 + rnd(k) * 0.6, r], k % 3 ? M.ash : M.crust, { part: body });
    }
  const glow = (p.glow ?? 1) * (1 - melt);
  if (glow > 0.1)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.7;
      const c = v3.add(head, [Math.cos(a) * 3.2 * wide, 4.5 * rise, Math.sin(a) * 3.2 * wide]);
      sc.seg(c, v3.add(c, [Math.cos(a + 0.6) * 2.4, -0.4, Math.sin(a + 0.6) * 2.4]), 0.35, 0.25, M.ember);
    }

  // --- Boca de lama e as brasas dos olhos ---
  const maw = p.maw ?? 0;
  const face = v3.add(head, [-6.2 * wide, -0.6, 0]);
  sc.ell(v3.add(face, [0.4, -1.6 - maw * 2.2, 0]), [1.6 + maw * 2.6, 0.9 + maw * 3.4, 2.6 + maw * 3.2], M.mouth, { part: body });
  if (maw > 0.2)
    for (const s of [1, -1]) sc.seg(v3.add(face, [-0.4, 1.2 - maw * 1, s * (2 + maw * 2.4)]), v3.add(face, [-0.8, -4 - maw * 3, s * (2.4 + maw * 2)]), 0.7, 0.4, M.mud);
  for (const s of [1, -1]) {
    sc.ell(v3.add(face, [0.6, 1.8, s * 2.6]), [1.1, 1, 1.3], M.char, { part: body });
    if (glow > 0.05) sc.ball(v3.add(face, [-0.1, 1.9, s * 2.6]), 0.55 + glow * 0.45, M.ember);
  }

  // --- Restos presos na lama: uma costela, um galho queimado, uma caveira de rato ---
  if (melt < 0.85) {
    sc.seg(at(4, 0.55, 7.5 * wide), at(7, 0.95, 5.5 * wide), 0.55, 0.4, M.bone);
    sc.seg(at(-5, 0.35, -8 * wide), at(-1, 0.85, -9.5 * wide), 0.7, 0.45, M.char);
    sc.ell(at(6.5, 0.3, -6 * wide), [1.4, 1.1, 1.2], M.bone);
  }
  // --- Gotas pingando da beira da cabeça ---
  const drip = p.drip ?? 0;
  for (let k = 0; k < 3; k++) {
    const a = 2.2 + k * 0.9;
    const top = v3.add(head, [Math.cos(a) * 6 * wide, -2.6 * rise, Math.sin(a) * 6 * wide]);
    const fall = ((drip + k * 0.33) % 1) * 4;
    sc.ball(v3.add(top, [0, -fall, 0]), 0.7 - fall * 0.08, M.mud);
  }
  return sc;
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

export const OOZE_FEET = SCULPT_SIZE - 18;
const PITCH = 32;
const SCALE = 2.25;
const YAW: Record<View, number> = { side: 18, front: 90, back: -90 };

export function shootOoze(pose: OPose, view: View, skin?: Skin): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 4 : SCULPT_SIZE / 2;
  return render(ooze(pose), { size: SCULPT_SIZE, feet: OOZE_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, applySkin(look(), skin));
}

const DEF: OPose = { wave: 0, rise: 1, wide: 1, lean: 0, x: 0, maw: 0, melt: 0, glow: 1, drip: 0 };
const K = (p: OPose): OPose => ({ ...DEF, ...p });

/**
 * Poses de perfil: o parado ondula e pinga; o andar achata e estica (o lombo da frente puxa); o golpe ergue a massa e
 * bate para a frente; o especial (Engolir) abre a boca de lama e se debruça; a morte desmancha numa poça.
 */
export const OOZE_POSES = {
  idle: Array.from({ length: 6 }, (_, k): OPose => K({ wave: k * 60, rise: 1 + Math.sin((k / 6) * Math.PI * 2) * 0.04, drip: k / 6 })),
  walk: Array.from({ length: 8 }, (_, k): OPose => {
    const t = (k / 8) * Math.PI * 2;
    return K({ wave: k * 45, rise: 0.92 + Math.sin(t) * 0.06, wide: 1.04 - Math.sin(t) * 0.05, lean: 8 + Math.sin(t) * 4, x: -Math.max(0, Math.sin(t)) * 1.2, drip: k / 8 });
  }),
  attack: tween(([
    { wave: 0 },
    { wave: 30, rise: 1.25, wide: 0.88, lean: -10, x: 1.5 },
    { wave: 60, rise: 0.8, wide: 1.18, lean: 22, x: -4 },
    { wave: 90, rise: 0.95, wide: 1.04, lean: 6, x: -1 },
  ] satisfies OPose[]).map(K), 6),
  special: tween(([
    { wave: 0 },
    { wave: 40, rise: 1.15, lean: -6, maw: 0.5 },
    { wave: 80, rise: 1.3, wide: 0.92, lean: 26, x: -5, maw: 1 },
    { wave: 120, rise: 1, lean: 8, x: -2, maw: 0.3 },
  ] satisfies OPose[]).map(K), 6),
  death: tween(([
    { wave: 0, rise: 1.1, lean: -8 },
    { wave: 40, rise: 0.75, wide: 1.2, melt: 0.4, glow: 0.5 },
    { wave: 70, rise: 0.4, wide: 1.4, melt: 1, glow: 0 },
  ] satisfies OPose[]).map(K), 5),
};
