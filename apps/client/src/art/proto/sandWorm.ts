import { Sculpt, render, tween, v3, type Frame, type Look, type Material, type V3, type View } from "./sculpt.ts";

/**
 * Verme da Areia (chefe) esculpido por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): o pescoço gigante sai da areia
 * em arco, em anéis com placas de couraça por cima e a barriga clara por baixo, e acaba na boca redonda de três lábios
 * que abrem mostrando dois anéis de dentes e a goela. Atrás, a corcova das costas entra e sai da areia. O chão corta
 * o corpo (`Shot.ground`): o que está abaixo da areia some, e montes de areia marcam onde ele entra. Olha para a
 * esquerda (x negativo).
 */

const M = { hide: 0, plate: 1, belly: 2, lip: 3, tooth: 4, throat: 5, sand: 6, dust: 7 } as const;

function look(): Look {
  const materials: Material[] = [];
  materials[M.hide] = { ramp: ["#1a0d0a", "#301810", "#4a2616", "#66361d", "#844a27", "#a26134", "#bd7c47", "#d39b62"], grain: 0.18, grainSize: 0.9, bump: 0.35, bumpSize: 0.7, belly: M.belly };
  materials[M.plate] = { ramp: ["#120a08", "#22140f", "#372217", "#4e3221", "#67442d", "#82593b", "#9c714d", "#b98f68"], grain: 0.2, grainSize: 0.7, bump: 0.55, bumpSize: 0.6, gloss: 0.35, shine: 14, lineDepth: 1 };
  materials[M.belly] = { ramp: ["#3a2418", "#5c3c27", "#80583a", "#a3774f", "#c09468", "#d8b285", "#ead0a8"], grain: 0.12, grainSize: 0.8 };
  materials[M.lip] = { ramp: ["#1e0b0b", "#3a1513", "#5a211b", "#7c3124", "#9c4530", "#b85e40", "#cf7c56"], grain: 0.15, bump: 0.4, bumpSize: 0.5, gloss: 0.4, shine: 16 };
  materials[M.tooth] = { ramp: ["#4a3f30", "#73654c", "#9d8e6c", "#c4b791", "#e3d8b8", "#f8f2de"], gloss: 0.8, shine: 26, lineDepth: 0.4 };
  materials[M.throat] = { ramp: ["#050102", "#120406", "#22080a", "#3a0f10", "#581917"], gloss: 0.8, shine: 20, bias: -0.15 };
  materials[M.sand] = { ramp: ["#3a1f0e", "#5c3216", "#82491f", "#a6622a", "#c27e3a", "#d99c52", "#ebbb72", "#f6d899"], grain: 0.3, grainSize: 0.5, bump: 0.4, bumpSize: 0.45, lineDepth: 0.8 };
  materials[M.dust] = { ramp: ["#6b4a30", "#9a7650", "#c4a27a", "#e2c9a4", "#f4e6cc"], grain: 0.15, bias: 0.1 };
  return { materials, outline: "#140906", bounce: { color: "#f0b46a", power: 0.5 }, occlusion: 0.6, shadow: 0.65, rim: { color: "#ffe0a0", power: 0.45 } };
}

// --- Pose ----------------------------------------------------------------------------------------------------------

export interface WPose {
  /** Quanto o pescoço sobe (0 = enterrado, 1 = de pé) e quanto avança a cabeça. */
  rise?: number;
  reach?: number;
  /** Balanço do pescoço para os lados (graus) e a onda que corre pelo corpo (fase, 0..1). */
  sway?: number;
  wave?: number;
  /** Cabeça: inclinação para baixo (graus) e a boca aberta (0..1). */
  dip?: number;
  gape?: number;
  /** Engolir: o caroço descendo pelo pescoço (0..1; 0 = sem caroço). */
  gulp?: number;
  /** Morte: tomba (0..1) para a frente, esticado no chão. */
  fall?: number;
  /** Corcova das costas: altura (0..1). */
  hump?: number;
}

const D2R = Math.PI / 180;
const N = 15;

/** Ponto da curva de Bézier cúbica. */
function bez(a: V3, b: V3, c: V3, d: V3, t: number): V3 {
  const u = 1 - t;
  return v3.add(v3.add(v3.mul(a, u * u * u), v3.mul(b, 3 * u * u * t)), v3.add(v3.mul(c, 3 * u * t * t), v3.mul(d, t * t * t)));
}

export function sandWorm(p: WPose = {}): Sculpt {
  const sc = new Sculpt();
  const rise = p.rise ?? 1, reach = p.reach ?? 0, fall = p.fall ?? 0, wave = (p.wave ?? 0) * Math.PI * 2;
  const sway = (p.sway ?? 0) * D2R;
  // Espinha do pescoço: sai da areia em E e faz o arco até a cabeça (que tomba no chão quando morre).
  const E: V3 = [9, -4, 0];
  const headUp: V3 = [-13 - reach * 8, 6 + rise * 28, Math.sin(sway) * 8];
  const headDown: V3 = [-30, 6, 2];
  const head = v3.lerp(headUp, headDown, fall);
  const c1: V3 = [9, 6 + rise * 20 * (1 - fall), 0];
  const c2: V3 = v3.lerp([-2 + reach * 2, 4 + rise * 34, Math.sin(sway) * 5], [-12, 7, 1], fall);
  const spine = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N;
    const q = bez(E, c1, c2, head, t);
    // A onda: o pescoço ondula de leve para os lados.
    return v3.add(q, [0, 0, Math.sin(wave + t * 5) * 1.2 * t]);
  });
  const gulp = p.gulp ?? 0;
  // --- Pescoço em anéis, com as placas por cima ---
  for (let i = 0; i < N; i++) {
    const t = i / N, a = spine[i], b = spine[i + 1];
    const bulge = gulp > 0 ? Math.exp(-(((1 - t) - gulp) ** 2) / 0.01) * 2.4 : 0;
    const r = 7.4 + t * 1.2 + bulge;
    const part = sc.part();
    sc.seg(a, b, r, r * 1.04, M.hide, { part, over: 0.9, up: [0, 1, 0], band: { n: 1, depth: 0.22 } });
    const dir = v3.norm(v3.sub(b, a));
    const back = v3.norm(v3.sub([1, 0.4, 0], v3.mul(dir, v3.dot([1, 0.4, 0], dir))));
    sc.seg(v3.add(a, v3.mul(back, r * 0.55)), v3.add(b, v3.mul(back, r * 0.55)), r * 0.5, r * 0.8, M.plate, { part, over: -0.2, up: back });
  }
  // --- Cabeça: anel da boca, três lábios que abrem, dentes e goela ---
  const hd = v3.norm(v3.sub(spine[N], spine[N - 1]));
  // A boca vira para quem olha (três-quartos): a goela redonda é a marca do verme.
  const dipDir = v3.norm(v3.add(hd, [0, -Math.sin((p.dip ?? 0) * D2R), 0.75 * (1 - fall * 0.7)]));
  const tip = v3.add(spine[N], v3.mul(dipDir, 2.4));
  const headPart = sc.part();
  sc.seg(spine[N], tip, 8.6, 8.8, M.hide, { part: headPart, up: [0, 1, 0], band: { n: 2, depth: 0.15 } });
  const gape = p.gape ?? 0.15;
  const u0 = v3.norm(v3.cross(dipDir, [0, 1, 0])), v0 = v3.norm(v3.cross(u0, dipDir));
  const ring = (a: number): V3 => v3.add(v3.mul(u0, Math.cos(a)), v3.mul(v0, Math.sin(a)));
  // Goela escura no fundo.
  sc.ell(v3.add(tip, v3.mul(dipDir, 0.4)), [1.2, 6.4, 6.4], M.throat, { axes: [dipDir, u0, v0] });
  // Dois anéis de dentes apontando para dentro.
  for (const [rr, n, len] of [[6.6, 16, 3.4], [4.3, 11, 2.6]] as const)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rr;
      const base = v3.add(tip, v3.add(v3.mul(ring(a), rr), v3.mul(dipDir, 0.6)));
      const end = v3.add(base, v3.add(v3.mul(ring(a), -len * (0.6 + gape * 0.3)), v3.mul(dipDir, len * 0.5)));
      sc.cone(base, end, 0.9, 0.15, M.tooth);
    }
  // Três lábios em pétala: fechados cobrem a boca, abertos viram para trás.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
    const out = ring(a);
    const open = (12 + gape * 78) * D2R;
    const along = v3.norm(v3.add(v3.mul(dipDir, Math.cos(open)), v3.mul(out, Math.sin(open))));
    const base = v3.add(tip, v3.mul(out, 5.6));
    const end = v3.add(base, v3.add(v3.mul(along, 9), v3.mul(out, -4 * (1 - gape))));
    const lp = sc.part();
    sc.seg(base, end, 1.3, 5.6, M.lip, { part: lp, up: out, over: 0.8 });
    sc.cone(end, v3.add(end, v3.mul(along, 1.8)), 0.8, 0.2, M.tooth, { part: lp });
  }

  // --- Corcova das costas, entrando e saindo da areia atrás ---
  const hump = (p.hump ?? 1) * (1 - fall * 0.6);
  const h0: V3 = [17 + Math.sin(wave) * 1.5, -3, -2], h3: V3 = [38 + Math.sin(wave) * 1.5, -3, -4];
  const h1: V3 = [21, 4 + hump * 13 + Math.sin(wave) * 2, -2.5], h2: V3 = [33, 4 + hump * 13 - Math.sin(wave) * 2, -3.5];
  for (let i = 0; i < 9; i++) {
    const a = bez(h0, h1, h2, h3, i / 9), b = bez(h0, h1, h2, h3, (i + 1) / 9);
    const part = sc.part();
    sc.seg(a, b, 6, 6.2, M.hide, { part, over: 0.8, up: [0, 1, 0], band: { n: 1, depth: 0.2 } });
    sc.seg(v3.add(a, [0, 3, 0]), v3.add(b, [0, 3, 0]), 3, 4.8, M.plate, { part, over: -0.2, up: [0, 1, 0] });
  }

  // --- Montes de areia onde o corpo entra no chão, e a poeira que ele levanta ---
  for (const [c, r] of [[E, 9.5], [h0, 7], [h3, 7]] as const) {
    sc.ell(v3.add(c, [0, 3, 0]), [r + 4, 2.4, r + 4], M.sand);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + c[0];
      sc.ell(v3.add(c, [Math.cos(a) * r, 4.6, Math.sin(a) * r]), [4.6, 2.4, 4], M.sand, { axes: [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]] });
    }
  }
  if (fall > 0) for (let k = 0; k < 7; k++) sc.ell(v3.add(head, [6 + k * 3.5, -4, (k % 2) * 3 - 1.5]), [3.4, 2, 3], M.sand);
  for (let k = 0; k < 12; k++) {
    const a = k * 2.4 + wave;
    sc.ball(v3.add(E, [Math.cos(a) * (12 + (k % 3) * 2), 2 + ((k * 7) % 5), Math.sin(a) * 12]), 0.55, M.dust);
  }
  return sc;
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

/** O chefe usa um quadro maior. */
export const WORM_SIZE = 176;
export const WORM_FEET = WORM_SIZE - 44;
const PITCH = 34;
const SCALE = 1.8;
const YAW: Record<View, number> = { side: 22, front: 90, back: -90 };

export function shootWorm(pose: WPose, view: View): Frame {
  const cx = view === "side" ? WORM_SIZE / 2 - 4 : WORM_SIZE / 2;
  return render(sandWorm(pose), { size: WORM_SIZE, feet: WORM_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE, ground: true }, look());
}

const DEF: WPose = { rise: 1, reach: 0, sway: 0, wave: 0, dip: 0, gape: 0.15, gulp: 0, fall: 0, hump: 1 };
const K = (p: WPose): WPose => ({ ...DEF, ...p });

/**
 * Poses de perfil: o pescoço balança e a boca respira no parado; no andar a onda corre pelo corpo e a corcova sobe e
 * desce; morde de cima (golpe), mergulha na areia (Emboscada, o especial), engole com o caroço descendo pelo pescoço
 * (Engolir, a 2ª habilidade) e tomba esticado na areia.
 */
export const WORM_POSES = {
  idle: Array.from({ length: 6 }, (_, k): WPose => {
    const w = Math.sin((k / 6) * Math.PI * 2);
    return K({ sway: w * 8, wave: k / 6, gape: 0.18 + Math.max(0, w) * 0.15, dip: 6 + w * 3, hump: 0.95 + w * 0.05 });
  }),
  walk: Array.from({ length: 6 }, (_, k): WPose => {
    const w = Math.sin((k / 6) * Math.PI * 2);
    return K({ sway: w * 12, wave: k / 6, reach: 0.25 + w * 0.15, rise: 0.92 + Math.cos((k / 6) * Math.PI * 2) * 0.05, dip: 10, hump: 0.75 + w * 0.25 });
  }),
  // Golpe: recua no alto com a boca abrindo e desce mordendo.
  attack: tween(([
    { dip: 6 },
    { rise: 1.12, reach: -0.5, dip: -10, gape: 0.8 },
    { rise: 0.7, reach: 1, dip: 40, gape: 1 },
    { rise: 0.75, reach: 0.9, dip: 36, gape: 0.1 },
    { rise: 1, reach: 0.1, dip: 8, gape: 0.2 },
  ] satisfies WPose[]).map(K), 6),
  // Especial (Emboscada da Areia): arqueia e mergulha de cabeça, sumindo na areia.
  special: tween(([
    { dip: 6 },
    { rise: 1.15, reach: -0.3, dip: -15, gape: 0.1 },
    { rise: 0.6, reach: 0.8, dip: 70, gape: 0 },
    { rise: 0.1, reach: 0.6, dip: 85, gape: 0, hump: 0.4 },
  ] satisfies WPose[]).map(K), 6),
  // Engolir: escancara a boca, avança, fecha e o caroço desce pelo pescoço.
  skill: tween(([
    { dip: 6 },
    { rise: 1.05, reach: 0.4, dip: 20, gape: 1 },
    { rise: 0.85, reach: 1, dip: 30, gape: 0.05, gulp: 0.1 },
    { rise: 1, reach: 0.3, dip: 4, gape: 0.1, gulp: 0.55 },
    { rise: 1, reach: 0, dip: 6, gape: 0.15, gulp: 0.95 },
  ] satisfies WPose[]).map(K), 6),
  // Morte: ergue-se com a boca aberta e tomba para a frente, esticado na areia.
  death: tween(([
    { rise: 1.2, reach: -0.6, dip: -25, gape: 1, sway: -8 },
    { rise: 1, reach: 0.4, dip: 20, gape: 0.8, fall: 0.35, sway: 6 },
    { rise: 1, reach: 0.4, dip: 0, gape: 0.6, fall: 1, sway: 0, hump: 0.5 },
  ] satisfies WPose[]).map(K), 5),
};
