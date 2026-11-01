import { SCULPT_SIZE, Sculpt, render as renderSculpt, rot, v3, type Frame, type Look, type Material, type V3, type View } from "./sculpt.ts";

/**
 * Múmia esculpida por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): humanoide grande e curvado, todo em ataduras de
 * linho sujo enroladas em espiral (cada faixa num tom, com rasgos que mostram a carne seca), gola egípcia de ouro e
 * lápis-lazúli, faixas soltas penduradas dos braços, da cintura e da cabeça, e os olhos verdes que acendem no Olhar
 * Pavoroso. Esqueleto por ângulos (quadril, joelho, ombro e cotovelo): cada pose é só um conjunto de ângulos, e o pé
 * mais baixo encosta sozinho no chão. Olha para a esquerda (x negativo).
 */

const M = { linen: 0, flesh: 1, gold: 2, lapis: 3, eye: 4, socket: 5, strip: 6 } as const;

function look(): Look {
  const materials: Material[] = [];
  materials[M.linen] = {
    ramp: ["#17120f", "#2a231e", "#41372e", "#5c5043", "#7a6d5a", "#988b73", "#b5a98e", "#d0c6ab", "#e8e1cb"],
    grain: 0.12, grainSize: 0.7, lineDepth: 1.2,
    wrap: { width: 2.3, tilt: 1.4, crease: 0.55, vary: 0.3, gap: 0.09, gapMat: M.flesh },
  };
  materials[M.flesh] = { ramp: ["#0f0806", "#1e110b", "#311d12", "#462b1a", "#5d3c25", "#774f31"], grain: 0.25, grainSize: 0.5, bump: 0.6, bumpSize: 0.4 };
  materials[M.gold] = { ramp: ["#2e1c05", "#5a390b", "#8a5d14", "#b98a24", "#dcb444", "#f3dc84", "#fff6cc"], gloss: 1.4, shine: 26, lineDepth: 0.6 };
  materials[M.lapis] = { ramp: ["#070b22", "#0f1a4a", "#1c3080", "#2f4fae", "#5577d6", "#93b0f2"], gloss: 1, shine: 30, lineDepth: 0.6 };
  materials[M.eye] = { ramp: ["#1d4a16", "#3f8a2c", "#7fd36b", "#c4f7a6", "#f4fff0"], emit: 0.8 };
  materials[M.socket] = { ramp: ["#050302", "#0d0705", "#170d08", "#24150d"], bias: -0.2 };
  materials[M.strip] = { ramp: ["#211b16", "#3a322a", "#574c3f", "#776a57", "#978a71", "#b4a98d", "#cfc6aa", "#e2dbc4"], grain: 0.15, grainSize: 0.6, lineDepth: 0.5, bias: 0.12 };
  return {
    materials, outline: "#140c07", bounce: { color: "#f0b46a", power: 0.5 }, occlusion: 0.6,
    shadow: 0.7, rim: { color: "#ffe3a8", power: 0.45 },
  };
}

// --- Pose ----------------------------------------------------------------------------------------------------------

export interface MPose {
  /** Corcunda: o tronco inclina para a frente (graus). */
  lean?: number;
  /** Corpo para a frente (negativo = para a esquerda, para onde olha). */
  x?: number;
  /** Pernas: coxa (graus da vertical, positivo = para a frente) e joelho (dobra) de cá e de lá. */
  thigh?: readonly [number, number];
  knee?: readonly [number, number];
  /** Braços: ombro (0 = caído, 90 = esticado para a frente, 180 = para cima) e cotovelo, de cá e de lá; `spread` abre. */
  arm?: readonly [number, number];
  elbow?: readonly [number, number];
  spread?: number;
  /** Cabeça: baixa (+) ou levanta (−). */
  nod?: number;
  /** Faixas soltas: balanço (graus). */
  sway?: number;
  /** Olhos acesos (0..1): o Olhar Pavoroso. */
  glare?: number;
  /** Morte: cai para a frente (graus em volta dos pés). */
  fall?: number;
}

const D2R = Math.PI / 180;
const HIP_Y = 0;
const THIGH = 13, SHIN = 13;

/** Ponto do membro: `len` na direção do ângulo (0 = para baixo, positivo = para a frente, −x). */
const swing = (o: V3, deg: number, len: number, z = 0): V3 => v3.add(o, [-Math.sin(deg * D2R) * len, -Math.cos(deg * D2R) * len, z]);

export function mummy(p: MPose = {}): Sculpt {
  const sc = new Sculpt();
  const thigh = p.thigh ?? [4, -4], knee = p.knee ?? [8, 8];
  // Altura do quadril: o tornozelo mais baixo fica a 2.4 do chão.
  const ankleY = (k: number) => -Math.cos(thigh[k] * D2R) * THIGH - Math.cos((thigh[k] - knee[k]) * D2R) * SHIN;
  const hipY = 2.4 - Math.min(ankleY(0), ankleY(1));
  const fall = p.fall ?? 0;
  sc.push(rot("z", fall), [0, 0, 0], [p.x ?? 0, (fall / 90) * 4.5, 0]);
  const hip: V3 = [0, hipY + HIP_Y, 0];

  // --- Pernas ---
  [1, -1].forEach((s, k) => {
    const h = v3.add(hip, [0, 0, s * 4.2]);
    const kn = swing(h, thigh[k], THIGH, s * 0.4);
    const an = swing(kn, thigh[k] - knee[k], SHIN, 0);
    sc.seg(h, kn, 3.1, 3.2, M.linen, { over: 1.2 });
    sc.seg(kn, an, 2.5, 2.6, M.linen, { over: 1 });
    sc.ell(v3.add(an, [-2.4, -1.3, 0]), [3.6, 1.6, 2.1], M.linen, { axes: [[1, 0.1, 0], [-0.1, 1, 0], [0, 0, 1]] });
  });

  // --- Tronco (inclina em volta do quadril) ---
  const lean = p.lean ?? 10;
  sc.push(rot("z", lean), hip);
  const at = (x: number, y: number, z = 0): V3 => [hip[0] + x, hip[1] + y, z];
  const torso = sc.part();
  sc.ell(at(0, 1.5), [4.2, 4, 6.4], M.linen, { part: torso });
  sc.seg(at(0.2, 3), at(0.4, 10.5), 4.2, 5.4, M.linen, { part: torso, over: 1, up: [0, 0, 1] });
  sc.seg(at(0.4, 9), at(-0.4, 17.5), 5.4, 7.6, M.linen, { part: torso, over: 1, up: [0, 0, 1] });
  // Trapos rasgados pendurados em volta da cintura.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    strip(sc, at(Math.cos(a) * 4, 1.2, Math.sin(a) * 6.2), (p.sway ?? 0) * (k % 2 ? 1 : -0.6) + (k - 2.5) * 3, 2 + (k % 3 === 0 ? 1 : 0));
  }
  // Cinto de ouro e o avental listrado de lápis e ouro na frente.
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    sc.ell(at(Math.cos(a) * 4.5, 3.6, Math.sin(a) * 6.5), [1.5, 0.9, 1.3], M.gold, { axes: [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]] });
  }
  for (let k = -2; k <= 2; k++) {
    const top = at(-4.6 - Math.abs(k) * 0.1, 2.8, k * 0.95), bottom = at(-5.2 - (p.sway ?? 0) * 0.05, -4.2 + Math.abs(k) * 0.5, k * 1.05);
    sc.seg(top, bottom, 0.35, 0.55, k % 2 ? M.gold : M.lapis, { up: [1, 0, 0], over: 0.2 });
  }
  // Escaravelho de lápis com asas de ouro no peito.
  sc.ell(at(-5, 12.5, 0), [0.8, 1.6, 1.3], M.lapis);
  for (const s of [1, -1]) sc.seg(at(-4.8, 12.8, s * 0.8), at(-4.5, 13.6, s * 3.2), 0.45, 0.9, M.gold, { up: [1, 0, 0] });

  // Gola egípcia: contas de ouro e lápis em volta do pescoço.
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const c = at(Math.cos(a) * 4.4, 16.4 - Math.abs(Math.sin(a)) * 0.6, Math.sin(a) * 6.6);
    sc.ell(c, [1.9, 1, 1.5], k % 2 ? M.lapis : M.gold, { axes: [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]] });
  }

  // --- Cabeça ---
  const neck0 = at(-0.4, 17), neckTop = at(-1.2, 21.5);
  sc.seg(neck0, neckTop, 2.5, 2.7, M.linen, { over: 0.6, up: [0, 0, 1] });
  sc.push(rot("z", -(p.nod ?? 0)), neckTop);
  const head = v3.add(neckTop, [-1, 3.6, 0]);
  const skull = sc.part();
  // Eixo da cabeça na vertical: as faixas dão a volta nela.
  sc.ell(head, [5.6, 4.5, 4.3], M.linen, { part: skull, axes: [[0.15, 1, 0], [-1, 0.15, 0], [0, 0, 1]] });
  // Queixo saliente, vão escuro dos olhos (com os olhos verdes dentro) e a boca.
  sc.ell(v3.add(head, [-2.2, -3.2, 0]), [2.2, 2.6, 3], M.linen, { part: skull, axes: [[0, 1, 0], [-1, 0, 0], [0, 0, 1]] });
  sc.ell(v3.add(head, [-3.6, 0.6, 0]), [1.6, 1.35, 3.6], M.socket, { part: skull });
  const glare = p.glare ?? 0;
  for (const s of [1, -1]) sc.ball(v3.add(head, [-4.7, 0.6, s * 1.65]), 0.75 + glare * 0.5, M.eye);
  sc.ell(v3.add(head, [-4.4, -3.4, 0]), [0.9, 0.6, 1.6], M.socket, { part: skull });
  strip(sc, v3.add(head, [3.5, 1.5, -1.5]), (p.sway ?? 0) * 1.2, 3);
  sc.pop();

  // --- Braços (o de lá primeiro não importa: o z decide) ---
  const arm = p.arm ?? [70, 60], elbow = p.elbow ?? [10, 14], spread = p.spread ?? 0;
  [1, -1].forEach((s, k) => {
    const sh = at(0.5, 15.5, s * 7.6);
    const out = s * (0.12 + spread);
    const el = swing(sh, arm[k], 11.5, out * 11.5);
    const wr = swing(el, arm[k] + elbow[k], 11, out * 6);
    const part = sc.part();
    sc.ball(sh, 3, M.linen, part);
    sc.seg(sh, el, 2.3, 2.4, M.linen, { part, over: 1 });
    sc.seg(el, wr, 1.95, 2.05, M.linen, { part, over: 0.8 });
    // Mão de carne seca e três dedos compridos, meio dobrados.
    const fd = v3.norm(v3.sub(wr, el));
    const hand = v3.add(wr, v3.mul(fd, 1.6));
    sc.ell(hand, [2.2, 1.4, 1.9], M.flesh, { part, axes: [fd, v3.norm(v3.cross([0, 0, 1], fd)), [0, 0, 1]] });
    for (const f of [-1, 0, 1]) {
      const f0 = v3.add(hand, v3.add(v3.mul(fd, 1.6), [0, 0, f * 0.9]));
      const f1 = v3.add(f0, v3.add(v3.mul(fd, 2.2), [0, -0.9, 0]));
      sc.cone(f0, f1, 0.6, 0.45, M.flesh, { part });
      sc.cone(f1, v3.add(f1, [-0.4, -1.5, 0]), 0.45, 0.25, M.flesh, { part });
    }
    // Faixa solta pendurada do antebraço.
    strip(sc, v3.add(lerp(el, wr, 0.55), [0, -1.5, s * 1.5]), (p.sway ?? 0) + k * 8, 3 + k);
  });
  sc.pop();
  sc.pop();
  return sc;
}

const lerp = (a: V3, b: V3, t: number): V3 => v3.lerp(a, b, t);

/** Faixa solta pendurada: pedaços finos de linho caindo, balançando `sway` graus. */
function strip(sc: Sculpt, from: V3, sway: number, n: number) {
  let at = from;
  const part = sc.part();
  for (let k = 0; k < n; k++) {
    const a = (sway * (1 + k * 0.5) + (k % 2 ? 6 : -4)) * D2R;
    const next = v3.add(at, [Math.sin(a) * 3.4, -Math.cos(a) * 3.4, 0]);
    sc.seg(at, next, 0.3, 1.8 - k * 0.2, M.strip, { part, over: 0.5, up: [0.6, 0, 0.8] });
    at = next;
  }
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

/** Linha do chão da múmia no quadro: humanoide, quase nada desce abaixo dela. */
export const MUMMY_FEET = SCULPT_SIZE - 14;
const PITCH = 28;
const SCALE = 1.75;
const YAW: Record<View, number> = { side: 18, front: 90, back: -90 };

export function shootMummy(pose: MPose, view: View): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 8 : SCULPT_SIZE / 2;
  return renderSculpt(mummy(pose), { size: SCULPT_SIZE, feet: MUMMY_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, look());
}

/** Poses de perfil: arrasta os pés com os braços esticados, esmaga com os dois braços, encara (olhos acesos) e desaba. */
export const MUMMY_POSES = {
  idle: [0, 1, 2, 1].map((k): MPose => ({ lean: 12 + k * 0.6, arm: [62 + k * 3, 54 + k * 2], elbow: [16, 20], nod: 6 - k, sway: k * 3 })),
  // Andar arrastado: uma perna dura, a outra puxa; braços esticados para a frente.
  walk: [
    { lean: 15, thigh: [22, -12], knee: [6, 22], arm: [84, 76], elbow: [4, 10], sway: -6, nod: 4 },
    { lean: 13, thigh: [6, 2], knee: [4, 30], arm: [80, 82], elbow: [6, 6], sway: 0, nod: 6 },
    { lean: 15, thigh: [-12, 20], knee: [22, 6], arm: [76, 84], elbow: [10, 4], sway: 6, nod: 4 },
    { lean: 13, thigh: [2, 6], knee: [30, 4], arm: [82, 80], elbow: [6, 6], sway: 0, nod: 6 },
  ] satisfies MPose[],
  // Golpe: ergue os dois braços e desce esmagando.
  attack: [
    { lean: -6, arm: [165, 158], elbow: [20, 26], nod: -10, sway: -8, thigh: [8, -6], knee: [6, 6] },
    { lean: 8, arm: [120, 114], elbow: [6, 10], nod: -2, sway: -4, thigh: [14, -8], knee: [10, 8] },
    { lean: 30, x: -2, arm: [48, 42], elbow: [0, 4], nod: 12, sway: 10, thigh: [24, -14], knee: [26, 12] },
    { lean: 16, arm: [72, 66], elbow: [12, 16], nod: 6, sway: 4 },
  ] satisfies MPose[],
  // Especial (Olhar Pavoroso): levanta a cabeça, abre os braços e os olhos acendem.
  special: [
    { lean: 2, arm: [100, 96], elbow: [10, 10], spread: 0.35, nod: -12, glare: 0.4 },
    { lean: -4, arm: [118, 112], elbow: [6, 6], spread: 0.6, nod: -8, glare: 1, sway: -6 },
    { lean: 4, arm: [112, 108], elbow: [6, 6], spread: 0.55, nod: -2, glare: 1, sway: 6 },
    { lean: 10, arm: [80, 72], elbow: [12, 14], spread: 0.15, nod: 4, glare: 0.35 },
  ] satisfies MPose[],
  // Morte: tranco para trás, os joelhos dobram e desaba de cara no chão.
  death: [
    { lean: -18, arm: [140, 120], elbow: [30, 40], spread: 0.3, nod: -18, glare: 0.2, sway: -12 },
    { lean: 38, thigh: [50, 46], knee: [95, 90], arm: [40, 34], elbow: [20, 24], nod: 22, sway: 10 },
    { fall: 84, x: 30, lean: 0, thigh: [4, 0], knee: [10, 6], arm: [170, 165], elbow: [6, 6], spread: 0.15, nod: 8, sway: 20 },
  ] satisfies MPose[],
};
