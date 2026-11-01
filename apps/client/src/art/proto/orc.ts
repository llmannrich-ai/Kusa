import { Sculpt, basis, lerp3, render, rot, turn, v3, type Frame, type Look, type Material, type Mat3, type Paint, type V3 } from "./sculpt.ts";

/**
 * Orc batedor (o "moleque do clã" do Pântano do Kosaradius) esculpido por código (`sculpt.ts`,
 * `docs/ARTE_ESCULTURA.md`), a partir do desenho da folha de referência (`docs/arte/pantano-do-kosaradius/orcScout-A.png`):
 * magro e curvado, cabeça grande, orelhas compridas, moicano, pintura de guerra vermelha, tanga rasgada com a caveira no
 * cinto, faixas nos antebraços e nas canelas, e a faca curva na mão esquerda.
 *
 * Esqueleto em hierarquia (cada `push` é uma junta): pelve → tronco → cabeça (mandíbula, orelhas, moicano) e braços
 * (ombro → cotovelo → punho → faca). As pernas são por cinemática inversa (o pé fica onde a pose manda, o joelho dobra
 * para a frente). Olha para a esquerda (x negativo é a frente), y para cima, z para o lado esquerdo do orc (o lado de
 * quem olha no perfil); chão em y = 0. Uma unidade ≈ um pixel antes da escala da câmera.
 */

// --- Materiais -----------------------------------------------------------------------------------------------------

const M = {
  skin: 0, skinDark: 1, hair: 2, leather: 3, cloth: 4, bone: 5, steel: 6, eye: 7, mouth: 8, warpaint: 9, claw: 10,
  wood: 11, gold: 12, blood: 13, earIn: 14, lid: 15,
} as const;

/** Rampas do escuro ao claro, com o matiz deslocado (sombra puxa para o frio, luz para o amarelo). */
const SKIN = ["#120f14", "#1d1a1a", "#2a281d", "#3a3a20", "#4d4c24", "#625f29", "#7a752f", "#938c38", "#ada444", "#c6bb5a", "#ddd385"];

function look(): Look {
  const m: Material[] = [];
  m[M.skin] = { ramp: SKIN, gloss: 0.18, shine: 10, grain: 0.1, grainSize: 3, bump: 0.22, bumpSize: 1.6, speck: 0.025 };
  m[M.skinDark] = { ramp: SKIN, gloss: 0.12, shine: 10, grain: 0.12, grainSize: 2, bump: 0.3, bumpSize: 1.1, bias: -0.12 };
  m[M.hair] = { ramp: ["#050506", "#0b0b0e", "#131318", "#1c1d24", "#282a33", "#3a3d4a", "#555a68"], gloss: 0.6, shine: 16, grain: 0.35, grainSize: 0.6, bias: -0.12 };
  m[M.leather] = { ramp: ["#170e0a", "#271810", "#382215", "#4c2e1b", "#623c22", "#7a4d2c", "#946238", "#ad7a4a"], gloss: 0.2, shine: 12, grain: 0.18, grainSize: 1.2, speck: 0.05 };
  m[M.cloth] = { ramp: ["#170b0b", "#261110", "#391812", "#4d2015", "#622a19", "#78371f", "#8e4728", "#a65d37"], grain: 0.24, grainSize: 1.5, speck: 0.08, bias: -0.02 };
  m[M.bone] = { ramp: ["#251c15", "#3f3226", "#5e4e3b", "#7f6d54", "#a08e70", "#bfae8e", "#dccfb0", "#f2ead2"], gloss: 0.25, shine: 14, grain: 0.14, grainSize: 1.1, speck: 0.04 };
  m[M.steel] = { ramp: ["#121318", "#20232a", "#31353d", "#454a53", "#5d636c", "#7a8089", "#9aa0a8", "#c0c5cb", "#eef0f2"], gloss: 1.3, shine: 34, grain: 0.12, grainSize: 0.8, speck: 0.08 };
  m[M.eye] = { ramp: ["#3a0a04", "#6e1606", "#a8300a", "#d9561a", "#f58f2a", "#ffd166"], glow: 0.62, gloss: 2, shine: 50 };
  m[M.mouth] = { ramp: ["#0d0405", "#1d0809", "#300d0d", "#4a1512", "#651f18"], bias: -0.1 };
  m[M.warpaint] = { ramp: ["#220707", "#3d0d09", "#5c160d", "#7c2212", "#9a3117", "#b5441f", "#cc5b2c"], grain: 0.16, grainSize: 0.9, gloss: 0.1 };
  m[M.claw] = { ramp: ["#0e0b09", "#211a14", "#3a2f23", "#574a37", "#7d6e54", "#a49577"], gloss: 0.5, shine: 20 };
  m[M.wood] = { ramp: ["#120b07", "#21140c", "#331f12", "#472b18", "#5d3a20", "#76502e"], grain: 0.25, grainSize: 0.6 };
  m[M.gold] = { ramp: ["#2a1a05", "#553609", "#8a5d12", "#bb8a24", "#e3bd52", "#fff0b0"], gloss: 1.6, shine: 30 };
  m[M.blood] = { ramp: ["#170304", "#2e0606", "#4a0c0a", "#68130e", "#861d14"], gloss: 0.9, shine: 30 };
  m[M.earIn] = { ramp: ["#1d1214", "#30201f", "#463126", "#5d442f", "#76583a", "#8f6d47"], grain: 0.08, bias: -0.04 };
  m[M.lid] = { ramp: SKIN, bias: -0.18 };
  // Linhas internas mais fortes que o padrão: o braço na frente do tronco, a orelha na frente da cabeça.
  for (const mat of m) mat.lineDepth = 1.3;
  return {
    materials: m, outline: "#0b0c08", occlusion: 0.6,
    // O chão do brejo rebate uma luz verde-oliva por baixo; a borda de trás pega um recorte frio (separa do chão).
    bounce: { color: "#7d8a45", power: 0.35 },
    rim: { color: "#b9d6c8", power: 0.42 },
  };
}

// --- Pose ------------------------------------------------------------------------------------------------------------

/** Pé: onde o tornozelo fica no chão (x, altura, z) e a ponta (graus; positivo = calcanhar no ar, ponta no chão). */
export interface Foot { at: V3; toe?: number }

/** Braço: balanço (graus; positivo = para a frente), abertura para o lado, dobra do cotovelo e do punho. */
export interface Arm { swing: number; out: number; elbow: number; wrist?: number; /** Mão livre: dedos fechando (0..1). */ grip?: number }

export interface OrcPose {
  /** Deslocamento da pelve (x negativo = para a frente, y = sobe, z = para o lado esquerdo). */
  hip?: V3;
  /** Tronco para a frente (graus) e o giro dos ombros (positivo = ombro esquerdo para a frente) e da pelve. */
  lean?: number;
  twist?: number;
  hipTwist?: number;
  /** Tronco tomba para o lado (graus; positivo = para a esquerda). */
  sway?: number;
  /** Fôlego (0..1): o peito enche e os ombros sobem. */
  breath?: number;
  /** Cabeça: para baixo (graus; negativo = olha para cima), giro (positivo = para a esquerda) e tombo. */
  pitch?: number;
  yaw?: number;
  tilt?: number;
  /** Boca aberta (0..1) e olhos fechados. */
  jaw?: number;
  blink?: boolean;
  /** Orelhas (graus; positivo = sobem, negativo = deitam para trás): esquerda e direita. */
  ears?: readonly [number, number];
  /** Moicano e rabo de cabelo: atraso (graus; positivo = jogado para trás). */
  hair?: number;
  /** Tanga: balanço (graus; positivo = a ponta vai para trás) e a aba de trás. */
  cloth?: number;
  footL?: Foot;
  footR?: Foot;
  /** Braço esquerdo (o da faca, do lado de quem olha) e o direito (a garra). */
  armL?: Arm;
  armR?: Arm;
  /** Faca: giro na mão (graus; positivo = a ponta vai para trás do punho). Sem faca na mão: `knifeAt` a põe no chão (ou no ar). */
  knife?: number;
  knifeAt?: { at: V3; spin: number };
  /** Morte: o corpo todo cai para trás (graus) em volta dos calcanhares e desliza (x). */
  fall?: number;
  slide?: number;
}

const D2R = Math.PI / 180;
const mulM = (a: Mat3, b: Mat3): Mat3 => {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as Mat3;
};

/** Pose parada (base de todos os clipes): agachado, curvado para a frente, faca à frente e a garra pronta. */
export const REST: Required<Omit<OrcPose, "knifeAt">> & Pick<OrcPose, "knifeAt"> = {
  hip: [0, 0, 0], lean: 22, twist: 0, hipTwist: 0, sway: 0, breath: 0, pitch: -16, yaw: 0, tilt: 0, jaw: 0.08, blink: false,
  ears: [0, 0], hair: 2, cloth: 0,
  footL: { at: [-9, 0, 6.5], toe: 0 }, footR: { at: [8, 0, -6.5], toe: 0 },
  armL: { swing: 28, out: 12, elbow: 62, wrist: -6 }, armR: { swing: 4, out: 14, elbow: 38, wrist: 10, grip: 0.35 },
  knife: 0, knifeAt: undefined, fall: 0, slide: 0,
};

/** Altura da pelve parado. */
const PELVIS_Y = 33;

// --- Escultura -------------------------------------------------------------------------------------------------------

/** Monta a escultura do orc na pose. */
export function orc(pose: OrcPose = {}): Sculpt {
  const p = { ...REST, ...pose };
  const sc = new Sculpt();
  // Morte: o corpo todo gira para trás em volta dos calcanhares (e desliza um pouco para caber no quadro).
  const fall = p.fall;
  sc.push(rot("z", -fall), [11, 0, 0], [p.slide, 0, 0]);

  // --- Pelve (com o giro da passada) ---
  const pelvis: V3 = [1 + p.hip[0], PELVIS_Y + p.hip[1], p.hip[2]];
  const pelvisM = rot("y", -p.hipTwist);
  const hipJoint = (s: number): V3 => v3.add(turn(pelvisM, [0.5, -2.5, s * 5.6]), pelvis);

  // --- Pernas por cinemática inversa (fora do giro da pelve: o pé fica no chão) ---
  leg(sc, hipJoint(1), p.footL, 1);
  leg(sc, hipJoint(-1), p.footR, -1);

  sc.push(pelvisM, [0, 0, 0], pelvis);
  // Quadril e cinto (o cinto passa por cima da cintura, com as voltas de couro).
  const hipPart = sc.part();
  sc.ell([0.5, -1, 0], [7.6, 6.2, 8.6], M.skin, { part: hipPart });
  sc.ell([0.4, 2.4, 0], [8.1, 2.4, 9.2], M.leather, { part: hipPart, band: { n: 3, depth: 0.25 } });
  // Tanga: a aba da frente e a de trás, rasgadas em tiras de comprimentos diferentes, balançando com atraso.
  const sw = p.cloth;
  const flap = (side: number, x: number, z: number, len: number, wid: number, lag: number) => {
    const part = sc.part();
    sc.push(rot("z", -side * (sw + lag)), [x, 1.5, z]);
    sc.seg([x, 1.5, z], [x - side * 1.2, 1.5 - len, z], wid, 1.1, M.cloth, { part, up: [0, 0, 1], over: 1 });
    sc.pop();
  };
  // Frente (x negativo): 3 tiras; atrás: 2. `lag` faz as pontas balançarem fora de fase.
  flap(1, -6.8, 2.2, 13, 2.6, 0);
  flap(1, -6.6, -2.2, 10.5, 2.6, 3);
  flap(1, -6, 4.6, 8.5, 1.9, -4);
  flap(-1, 7.2, 1.8, 11, 3, 2);
  flap(-1, 7, -3, 9, 2.6, -2);
  // Bolsa no quadril direito e a caveira de bicho pendurada no cinto (à esquerda, para quem olha no perfil).
  sc.ell([2.5, -1.2, -9], [3, 3.4, 2], M.leather, { band: { n: 2, depth: 0.15 } });
  skull(sc, [-6.6, -2.2, 6.4]);
  sc.pop();

  // --- Tronco: gira em volta da cintura ---
  const waist: V3 = v3.add(pelvis, [0, 4, 0]);
  const chestM = mulM(mulM(rot("y", -p.twist), rot("x", -p.sway)), rot("z", p.lean));
  sc.push(chestM, [0, 0, 0], waist);
  torso(sc, p.breath);
  // Pescoço e cabeça (a cabeça compensa a inclinação do tronco para olhar à frente).
  const neckTop: V3 = [-3.8, 25.5 + p.breath * 0.4, 0];
  sc.cone([0.2, 19, 0], neckTop, 4.6, 4, M.skin);
  sc.push(mulM(mulM(rot("y", p.yaw), rot("x", -p.tilt)), rot("z", p.pitch)), neckTop);
  head(sc, neckTop, p);
  sc.pop();
  // Braços: o esquerdo (faca) do lado de quem olha, o direito (garra) do outro.
  const shY = 19.5 + p.breath * 0.8;
  arm(sc, [0.6, shY, 11.2], p.armL, 1, p);
  arm(sc, [0.6, shY, -11.2], p.armR, -1, p);
  sc.pop();

  sc.pop();
  // A faca solta (morte): no ar, girando, ou no chão (fora da queda do corpo).
  if (p.knifeAt) {
    sc.push(rot("z", p.knifeAt.spin), p.knifeAt.at);
    knife(sc, p.knifeAt.at);
    sc.pop();
  }
  return sc;
}

/** Tronco (no espaço da cintura, em pé): barriga, costelas, peitorais, as costas curvadas, os ombros e a alça. */
function torso(sc: Sculpt, breath: number) {
  const part = sc.part();
  const b = breath;
  // Pintura: 3 riscos de garra no peito esquerdo e a alça de couro do ombro direito ao quadril esquerdo.
  const strap = (x: number, y: number, z: number) => Math.abs(y - (z * 0.95 + 6)) < 1.5 && x < 6;
  const chestPaint = (cx: number, cy: number, cz: number): Paint => (x, y, z) => {
    const X = x + cx, Y = y + cy, Z = z + cz;
    if (strap(X, Y, Z)) return M.leather;
    // Riscos de garra (diagonais) no peito esquerdo, na frente.
    if (X < -3 && Z > 2 && Z < 9) {
      const d = (Y - 10) + (Z - 5) * 0.8;
      for (const k of [-3.2, 0, 3.2]) if (Math.abs(d - k) < 0.75 && Y > 5 && Y < 17) return M.warpaint;
    }
    return -1;
  };
  sc.ell([0, 5, 0], [6.6, 7, 8.2], M.skin, { part, paint: chestPaint(0, 5, 0) });
  sc.ell([0.4, 13.5 + b * 0.4, 0], [8.2 + b * 0.35, 9 + b * 0.3, 10 + b * 0.25], M.skin, { part, paint: chestPaint(0.4, 13.5 + b * 0.4, 0) });
  // Barriga marcada (gomos do abdome) e os peitorais.
  for (const s of [1, -1]) {
    sc.ell([-4.6, 15.2 + b * 0.5, s * 4.4], [3.6, 4.2, 4.8], M.skin, { part, paint: chestPaint(-4.6, 15.2 + b * 0.5, s * 4.4) });
    sc.ell([-5.2, 6.5, s * 2.1], [2.2, 2.4, 2.4], M.skin, { part });
    sc.ell([-5.4, 2.4, s * 2], [2, 2, 2.2], M.skin, { part });
  }
  // Costas curvadas (a corcunda do magricela): as escápulas e os trapézios, que sobem com o fôlego.
  for (const s of [1, -1]) {
    sc.ell([3.8, 15.5 + b * 0.5, s * 4.6], [5, 7.4, 5.2], M.skin, { part, axes: basis([0.2, 1, 0]) });
    sc.ell([1.4, 21.2 + b * 0.8, s * 5.2], [4.2, 3, 5.4], M.skin, { part });
  }
}

/** Cabeça (no espaço do topo do pescoço, olhando para a esquerda). */
function head(sc: Sculpt, o: V3, p: Required<Pick<OrcPose, "jaw" | "blink" | "ears" | "hair">>) {
  const at = (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
  const part = sc.part();
  // Pintura de guerra: duas faixas descendo da testa por cima dos olhos até as bochechas, e uma no queixo.
  const facePaint = (cx: number, cy: number, cz: number): Paint => (x, y, z) => {
    const X = x + cx, Y = y + cy, Z = Math.abs(z + cz);
    if (X > -3.5) return -1;
    const lane = Z - (3.1 + (Y - 8) * -0.18);
    if (Math.abs(lane) < 0.8 && Y > 1 && Y < 15) return M.warpaint;
    return -1;
  };
  // Crânio (grande: é jovem), a nuca e as maçãs do rosto.
  sc.ell(at(-3.6, 8, 0), [8.4, 8, 7.6], M.skin, { part, paint: facePaint(-3.6, 8, 0) });
  sc.ell(at(-0.6, 8.6, 0), [6.8, 7, 7], M.skin, { part });
  for (const s of [1, -1]) sc.ell(at(-8.4, 4.8, s * 4.6), [3, 2.6, 2.6], M.skin, { part, paint: facePaint(-8.4, 4.8, s * 4.6) });
  // Testa pesada (sobrancelha), o nariz achatado e o focinho.
  sc.ell(at(-10.2, 9.4, 0), [2.8, 2, 6.6], M.skinDark, { part, axes: basis([1, -0.35, 0]) });
  sc.ell(at(-12.6, 5.4, 0), [2.2, 2.6, 2.4], M.skin, { part });
  for (const s of [1, -1]) sc.ball(at(-14.3, 4.4, s * 1), 0.7, M.mouth, part);
  sc.ell(at(-9.6, 3, 0), [4.8, 3.2, 5.4], M.skin, { part });
  // Olhos fundos, debaixo da testa, brilhando (fechados: a pálpebra).
  for (const s of [1, -1]) {
    sc.ell(at(-10.4, 7.6, s * 3.2), [1.5, 1.4, 1.9], M.skinDark, { part });
    sc.ell(at(-11.4, 7.7, s * 3.3), [0.9, p.blink ? 0.45 : 1.15, 1.25], p.blink ? M.lid : M.eye);
  }
  // Mandíbula (abre em volta da junta) com as presas para cima e a boca escura por dentro.
  sc.ell(at(-9.8, 1.9, 0), [3.6, 1.4, 4], M.mouth, { part });
  const jawPart = sc.part();
  sc.push(rot("z", -p.jaw * 20), at(-3, 2.2, 0));
  sc.ell(at(-8.8, 0.4, 0), [5, 2.5, 4.9], M.skin, { part: jawPart });
  sc.ell(at(-11.6, -0.2, 0), [2.4, 2.2, 3], M.skin, { part: jawPart });
  for (const s of [1, -1]) sc.cone(at(-12.3, 0.8, s * 2.7), at(-13.4, 5.4, s * 3.3), 1.3, 0.4, M.bone, { part: jawPart });
  sc.pop();
  // Orelhas compridas, para os lados e para trás, com o lado de dentro mais escuro; brinco de ouro na esquerda.
  for (const s of [1, -1]) {
    const lift = (s > 0 ? p.ears[0] : p.ears[1]) * D2R;
    const base = at(-1.4, 9.4, s * 6.6);
    const dir = v3.norm([0.5 - Math.sin(lift) * 0.2, 0.16 + Math.sin(lift) * 0.7, s * 0.86]);
    const tip = v3.add(base, v3.mul(dir, 13));
    const ear = sc.part();
    sc.seg(base, tip, 4.4, 1.1, M.skin, { part: ear, up: [-0.35, 1, 0], over: 0.5 });
    sc.seg(v3.add(base, [-0.9, 0, 0]), v3.add(tip, v3.mul(dir, -3.5)), 2.6, 0.7, M.earIn, { part: ear, up: [-0.35, 1, 0] });
    sc.cone(v3.add(tip, v3.mul(dir, -2)), v3.add(tip, v3.mul(dir, 2.2)), 1.2, 0.2, M.skin, { part: ear });
    if (s > 0) sc.ball(v3.add(lerp3(base, tip, 0.45), [0.4, -3.4, 0]), 0.95, M.gold);
  }
  // Moicano: espetos do alto da testa até a nuca (os de trás atrasam mais) e o rabo de cabelo caindo nas costas.
  const hair = p.hair;
  const spikes = 8;
  for (let k = 0; k < spikes; k++) {
    const t = k / (spikes - 1);
    const a = (-115 + t * 160) * D2R;
    const root = at(-2.4 + Math.cos(a) * 8.4, 8.6 + Math.sin(-a) * 8.2 * 0.95 + 1.2, 0);
    const lag = (8 + t * 30 + hair * (0.4 + t)) * D2R;
    const out = v3.norm([Math.cos(a) * 0.4 + Math.sin(lag) * 0.9, 0.75 - t * 0.35, 0]);
    const len = 5.5 + Math.sin(t * Math.PI) * 3.5 + (k % 2) * 1.2;
    const tip = v3.add(root, v3.mul(out, len));
    sc.cone(root, tip, 2 - t * 0.4, 0.3, M.hair);
    // Fios dos lados, mais curtos e abertos, alternando (o topo fica espetado, não um bloco).
    const s = k % 2 ? 1 : -1;
    sc.cone(v3.add(root, [0, -0.8, s * 1.1]), v3.add(tip, [1, -2.2, s * 1.5]), 1.2, 0.25, M.hair);
  }
  const tailPart = sc.part();
  let tp = at(5.4, 7, 0);
  let ta = (-55 - hair * 0.8) * D2R;
  for (let k = 0; k < 3; k++) {
    const next = v3.add(tp, [Math.cos(ta) * 5.4, Math.sin(ta) * 5.4, 0]);
    sc.cone(tp, next, 2.2 - k * 0.5, 1.7 - k * 0.5, M.hair, { part: tailPart });
    tp = next;
    ta -= (14 + hair * 0.5) * D2R;
  }
}

/** Braço (no espaço do tronco): ombro, braço, antebraço com a faixa de couro, punho e a mão (faca ou garra). */
function arm(sc: Sculpt, sh: V3, a: Arm, side: number, p: OrcPose) {
  const part = sc.part();
  sc.push(mulM(rot("z", -a.swing), rot("x", -side * a.out)), sh);
  // Deltoide e o braço (bíceps marcado na frente, riscos de pintura no deltoide da esquerda).
  const armPaint: Paint | undefined = side > 0 ? (x, y) => Math.abs(y + 0.6 - x * 0.5) < 0.7 || Math.abs(y - 2.4 - x * 0.5) < 0.7 ? M.warpaint : -1 : undefined;
  sc.ell(v3.add(sh, [0, -1, 0]), [4.6, 4.8, 4.4], M.skin, { part, paint: armPaint });
  const elbow = v3.add(sh, [0, -13.5, 0]);
  sc.cone(sh, elbow, 3.5, 2.8, M.skin, { part });
  sc.ell(v3.add(sh, [-1.2, -7, 0]), [2.7, 5, 2.8], M.skin, { part });
  sc.push(rot("z", -a.elbow), elbow);
  const forePart = sc.part();
  const wrist = v3.add(elbow, [0, -12.5, 0]);
  sc.ball(elbow, 2.9, M.skin, forePart);
  sc.ell(v3.add(elbow, [-0.4, -3.6, 0]), [3, 4.4, 3.1], M.skin, { part: forePart });
  sc.cone(elbow, wrist, 2.9, 2.3, M.skin, { part: forePart });
  // Faixa de couro enrolada no antebraço.
  sc.cone(v3.add(elbow, [0, -5.5, 0]), v3.add(wrist, [0, 0.6, 0]), 3.15, 2.75, M.leather, { part: forePart, band: { n: 4, depth: 0.32 } });
  sc.push(rot("z", -(a.wrist ?? 0)), wrist);
  if (side > 0 && !p.knifeAt) {
    // Punho fechado no cabo; a faca sai para a frente e para cima, curva.
    const fist = v3.add(wrist, [-0.4, -3.2, 0]);
    sc.ell(fist, [3.4, 3.6, 3.2], M.skin, { part: forePart });
    for (let k = 0; k < 3; k++) sc.ball(v3.add(fist, [-2.6, 1.2 - k * 1.5, 1.6]), 1.1, M.skin, forePart);
    // A lâmina segue o antebraço, um pouco para a frente (pega de estocada); `knife` gira a partir daí.
    sc.push(rot("z", 72 + (p.knife ?? 0)), fist);
    knife(sc, fist);
    sc.pop();
  } else {
    // Garra: a palma e 3 dedos compridos dobrando (mais fechados com `grip`), com as unhas escuras.
    const palm = v3.add(wrist, [-0.3, -2.8, 0]);
    sc.ell(palm, [2.8, 3.4, 3], M.skin, { part: forePart });
    const grip = a.grip ?? 0.3;
    for (let k = 0; k < 3; k++) {
      const z = (k - 1) * 1.7;
      const b0 = v3.add(palm, [-0.8, -2.2, z]);
      const ang = (-20 - grip * 70) * D2R;
      const b1 = v3.add(b0, [Math.sin(ang) * 3.6, -Math.cos(ang) * 3.6, z * 0.1]);
      const ang2 = ang - (30 + grip * 50) * D2R;
      const b2 = v3.add(b1, [Math.sin(ang2) * 2.8, -Math.cos(ang2) * 2.8, 0]);
      sc.cone(b0, b1, 1.15, 0.95, M.skin, { part: forePart });
      sc.cone(b1, b2, 0.9, 0.3, M.claw, { part: forePart });
    }
    const th = v3.add(palm, [-2.2, 0.2, side * -2]);
    sc.cone(th, v3.add(th, [-2.4, -1.8, side * -0.8]), 1, 0.35, M.claw, { part: forePart });
  }
  sc.pop();
  sc.pop();
  sc.pop();
}

/** Faca curva: cabo de madeira enrolado, guarda de osso e a lâmina larga e curva, com sangue perto da ponta. */
function knife(sc: Sculpt, fist: V3) {
  const part = sc.part();
  // O cabo atravessa o punho; o pomo fica atrás.
  sc.cone(v3.add(fist, [3.6, -0.2, 0]), v3.add(fist, [-3, 0.2, 0]), 1.25, 1.1, M.wood, { part, band: { n: 3, depth: 0.25 } });
  sc.ball(v3.add(fist, [4.4, -0.3, 0]), 1.5, M.bone, part);
  sc.ell(v3.add(fist, [-3.6, 0.2, 0]), [0.9, 2.2, 1.6], M.bone, { part });
  // Lâmina em 3 gomos que viram para cima (curva), fina de lado, larga no meio.
  const pts: V3[] = [v3.add(fist, [-4, 0.6, 0])];
  const angs = [8, 22, 42];
  const lens = [6.5, 6, 5];
  for (let k = 0; k < 3; k++) {
    const a = angs[k] * D2R;
    pts.push(v3.add(pts[k], [-Math.cos(a) * lens[k], Math.sin(a) * lens[k], 0]));
  }
  const blood: Paint = (x, y) => (x > 0.5 && y < 0.6 ? M.blood : -1);
  const widths = [1.9, 2.1, 1.5];
  for (let k = 0; k < 3; k++)
    sc.seg(pts[k], pts[k + 1], 0.55, widths[k], M.steel, { part, up: [0, 0, 1], over: 0.8, paint: k > 0 ? blood : undefined });
}

/** Caveira de bicho pendurada no cinto (osso com os buracos dos olhos e o focinho). */
function skull(sc: Sculpt, c: V3) {
  const part = sc.part();
  sc.cone(v3.add(c, [0.6, 3.6, 0]), v3.add(c, [0.2, 1.6, 0]), 0.45, 0.45, M.leather, { part });
  sc.ell(c, [2.2, 2.2, 2.1], M.bone, { part });
  sc.ell(v3.add(c, [-1.4, -1.6, 0]), [1.4, 1.3, 1.5], M.bone, { part });
  for (const s of [1, -1]) sc.ball(v3.add(c, [-1.6, 0.2, s * 0.9]), 0.65, M.mouth, part);
}

/** Perna por cinemática inversa: coxa, joelho, canela com a faixa, e o pé grande com as unhas (o pé gira na ponta). */
function leg(sc: Sculpt, hip: V3, foot: Foot, side: number) {
  const L1 = 15.5, L2 = 15.5;
  const toe = (foot.toe ?? 0) * D2R;
  // Calcanhar no ar: o tornozelo sobe (o pé gira em volta da ponta).
  const ankle: V3 = [foot.at[0] + (1 - Math.cos(toe)) * 6, foot.at[1] + 3.4 + Math.max(0, Math.sin(toe)) * 7, foot.at[2]];
  const hf = v3.sub(ankle, hip);
  const d = Math.min(v3.len(hf), L1 + L2 - 0.3);
  const dir = v3.norm(hf);
  // O joelho aponta para a frente e um pouco para fora.
  const want = v3.norm([-1, 0.15, side * 0.35]);
  const perp = v3.norm(v3.sub(want, v3.mul(dir, v3.dot(want, dir))));
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const knee = v3.add(hip, v3.add(v3.mul(dir, a), v3.mul(perp, h)));
  const end = v3.add(hip, v3.mul(dir, d));
  const part = sc.part();
  // Coxa com o músculo, joelho ossudo, canela com a panturrilha atrás e a faixa de couro.
  sc.cone(hip, knee, 4.6, 3.4, M.skin, { part });
  sc.seg(lerp3(hip, knee, 0.15), lerp3(hip, knee, 0.85), 3.4, 4.4, M.skin, { part, up: [0, 0, 1] });
  sc.ball(knee, 3.3, M.skin, part);
  const calfDir = v3.norm(v3.sub(end, knee));
  sc.cone(knee, end, 3.1, 2.3, M.skin, { part });
  sc.ell(v3.add(lerp3(knee, end, 0.35), v3.mul(v3.norm([1, 0, 0]), 1.4)), [2.8, 4.6, 2.9], M.skin, { part, axes: basis([0, 1, 0]) });
  sc.cone(lerp3(knee, end, 0.42), lerp3(knee, end, 0.98), 3.15, 2.6, M.leather, { part, band: { n: 4, depth: 0.3 } });
  void calfDir;
  // Pé: para a frente, girado pela ponta; dedos com unhas.
  const fd: V3 = [-Math.cos(toe), -Math.sin(toe), 0];
  const heel = v3.add(end, [1.6, -1.4, 0]);
  sc.ell(v3.add(end, v3.add(v3.mul(fd, 3.2), [0, -1.6, 0])), [5.6, 2.2, 3.2], M.skin, { part, axes: basis(fd) });
  sc.ball(heel, 2.1, M.skin, part);
  for (let k = 0; k < 3; k++) {
    const z = (k - 1) * 1.6;
    const b0 = v3.add(end, v3.add(v3.mul(fd, 7.4), [0, -2.1, z]));
    sc.cone(b0, v3.add(b0, v3.add(v3.mul(fd, 2.2), [0, -0.4, z * 0.2])), 1, 0.4, M.claw, { part });
  }
}

// --- Quadros -------------------------------------------------------------------------------------------------------

/**
 * Lado do quadro e a linha dos pés: 14 px do fundo, porque a câmera é de cima e o pé da frente desce abaixo da linha
 * (de frente, até 9 px). O apoio no jogo fica 10 px abaixo dela (`orcArt.ts`), como nas folhas do clã.
 */
export const ORC_SIZE = 136;
export const ORC_FEET = ORC_SIZE - 14;
const PITCH = 22;
/** Px por unidade do modelo. */
const SCALE = 1.38;

export type View = "side" | "front" | "back";
/** Perfil meio de três-quartos (mostra o rosto e os dois braços). */
const YAW: Record<View, number> = { side: 24, front: 90, back: -90 };

export function shoot(pose: OrcPose, view: View): Frame {
  const cx = view === "side" ? ORC_SIZE / 2 + 16 : ORC_SIZE / 2;
  return render(orc(pose), { size: ORC_SIZE, feet: ORC_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE }, look());
}

// --- Clipes ----------------------------------------------------------------------------------------------------------

const TAU = Math.PI * 2;
const sin = (t: number) => Math.sin(t * TAU);
const cos = (t: number) => Math.cos(t * TAU);
const armWith = (base: Arm, d: Partial<Arm>): Arm => ({ ...base, ...d });

/**
 * Parado (laço de 6): respira (o peito enche e os ombros sobem), o peso passa de um pé para o outro, a cabeça acompanha
 * com atraso, a faca gira um pouco na mão, o moicano e a tanga balançam fora de fase, pisca uma vez e a orelha
 * esquerda dá um tique.
 */
function idlePose(k: number, n: number): OrcPose {
  const t = k / n;
  const breath = 0.5 - 0.5 * cos(t);
  return {
    breath,
    hip: [0, breath * 0.5 - 0.25, sin(t) * 0.7],
    lean: 22 - breath * 1.5,
    sway: sin(t) * 1.2,
    pitch: -16 + sin(t - 0.15) * 2,
    tilt: sin(t - 0.2) * 2,
    hair: 2 + sin(t - 0.25) * 4,
    cloth: sin(t - 0.3) * 3,
    ears: [k === 4 ? 16 : k === 5 ? 6 : 0, sin(t - 0.4) * 2],
    blink: k === 2,
    knife: sin(t) * 7,
    armL: armWith(REST.armL, { swing: 28 + breath * 2, elbow: 62 - breath * 3, wrist: -6 + sin(t - 0.1) * 6 }),
    armR: armWith(REST.armR, { swing: 4 - breath * 2, elbow: 38 + breath * 4, grip: 0.35 + sin(t - 0.2) * 0.12 }),
  };
}

/**
 * Andar (8 quadros = um ciclo, 2 passos): contato, descida, passagem e subida de cada pé. A pelve quica duas vezes por
 * ciclo e gira para o pé da frente; os ombros giram ao contrário, o braço livre balança contra a perna e o da faca
 * fica pronto. A cabeça segura o olhar (amortece o quique), e o moicano, as orelhas e a tanga seguem com atraso.
 */
function walkPose(t: number): OrcPose {
  const A = 8.5, H = 5.5;
  const foot = (q: number, z: number, x0: number): Foot => {
    q = ((q % 1) + 1) % 1;
    if (q < 0.5) {
      const s = q / 0.5;
      // Apoio: o pé vai de frente para trás; bate de calcanhar e sai pela ponta.
      const toe = s < 0.12 ? -14 * (1 - s / 0.12) : s > 0.7 ? 30 * ((s - 0.7) / 0.3) : 0;
      return { at: [x0 - A + 2 * A * s, 0, z], toe };
    }
    const s = (q - 0.5) / 0.5;
    const e = s * s * (3 - 2 * s);
    return { at: [x0 + A - 2 * A * e, Math.sin(s * Math.PI) * H, z], toe: 28 * (1 - s) * (1 - s) - 10 * s * s };
  };
  const bob = -cos(2 * (t - 0.12));
  return {
    hip: [0, bob * 1.3 - 0.6, sin(t) * 1.1],
    hipTwist: cos(t) * 9,
    twist: -cos(t) * 11,
    lean: 25 + sin(2 * t) * 1.5,
    sway: sin(t) * 2,
    pitch: -18 - bob * 1.6,
    yaw: cos(t) * 3,
    tilt: -sin(t) * 2.5,
    breath: 0.4 + bob * 0.15,
    hair: 6 + cos(2 * (t - 0.28)) * 5,
    ears: [-4 + cos(2 * (t - 0.32)) * 6, -4 + cos(2 * (t - 0.36)) * 6],
    cloth: cos(t - 0.15) * 7 + sin(2 * (t - 0.2)) * 2,
    jaw: 0.12,
    footL: foot(t, 6.2, -1),
    footR: foot(t + 0.5, -6.2, -1),
    armL: { swing: 30 - cos(t) * 9, out: 13, elbow: 64 + cos(t - 0.08) * 6, wrist: -6 + sin(t) * 5 },
    armR: { swing: 4 + cos(t) * 26, out: 13, elbow: 34 + cos(t - 0.12) * 16, wrist: 10 + cos(t - 0.2) * 10, grip: 0.3 },
    knife: sin(t - 0.1) * 6,
  };
}

/**
 * Golpe (6): antecipação (agacha e puxa a faca para trás, girando o ombro), a estocada (avança o pé da frente, estica o
 * braço, ruge), o exagero depois do golpe, a volta e o assentar. O cabelo, as orelhas e a tanga atrasam e passam do
 * ponto na volta.
 */
const ATTACK: OrcPose[] = [
  {
    hip: [3, -2.5, 0], lean: 30, twist: -18, hipTwist: -6, pitch: -22, jaw: 0.3, ears: [-12, -12], hair: 0, cloth: -3,
    armL: { swing: -30, out: 16, elbow: 96, wrist: 22 }, knife: -18,
    armR: { swing: 34, out: 24, elbow: 46, wrist: 0, grip: 0.15 },
  },
  {
    hip: [4.5, -4.2, 0], lean: 34, twist: -28, hipTwist: -9, pitch: -24, jaw: 0.5, ears: [-20, -20], hair: -5, cloth: -6, breath: 1,
    armL: { swing: -48, out: 18, elbow: 112, wrist: 28 }, knife: -24,
    armR: { swing: 42, out: 26, elbow: 40, wrist: -6, grip: 0.1 },
    footL: { at: [-11, 0, 6.5], toe: 0 },
  },
  {
    hip: [-4.5, -1.6, 0], lean: 39, twist: 30, hipTwist: 12, pitch: -30, jaw: 1, ears: [-26, -26], hair: 20, cloth: 15,
    armL: { swing: 80, out: 6, elbow: 8, wrist: -12 }, knife: -6,
    armR: { swing: -42, out: 22, elbow: 22, wrist: 14, grip: 0.6 },
    footL: { at: [-18, 0, 6.5], toe: -8 }, footR: { at: [8, 0, -6.5], toe: 32 },
  },
  {
    hip: [-8.5, -2.4, 0], lean: 43, twist: 36, hipTwist: 14, pitch: -26, jaw: 0.85, ears: [-10, -14], hair: 11, cloth: 7,
    armL: { swing: 84, out: 4, elbow: 4, wrist: -28 }, knife: 12,
    armR: { swing: -52, out: 24, elbow: 16, wrist: 20, grip: 0.6 },
    footL: { at: [-18, 0, 6.5], toe: 0 }, footR: { at: [7, 0, -6.5], toe: 26 },
  },
  {
    hip: [-6, -1.6, 0], lean: 32, twist: 10, hipTwist: 5, pitch: -19, jaw: 0.35, ears: [6, 4], hair: -6, cloth: -5,
    armL: { swing: 52, out: 10, elbow: 48, wrist: -10 }, knife: -4,
    armR: { swing: -6, out: 16, elbow: 34, wrist: 10, grip: 0.4 },
    footL: { at: [-14, 0, 6.5], toe: 0 }, footR: { at: [8, 0, -6.5], toe: 6 },
  },
  {
    hip: [-1.5, -0.5, 0], lean: 23, twist: 2, pitch: -16, jaw: 0.12, ears: [-2, 0], hair: 4, cloth: 1,
    armL: { swing: 32, out: 12, elbow: 60, wrist: -6 }, knife: 2,
    armR: { swing: 4, out: 14, elbow: 38, wrist: 10, grip: 0.35 },
    footL: { at: [-10, 0, 6.5], toe: 0 },
  },
];

/**
 * Morte (5): o tranco (a cabeça vai para trás e os braços abrem), os joelhos cedem e a faca escapa, cai de costas e
 * fica estirado com a boca aberta e os olhos fechados; a faca gira no ar e para no chão ao lado.
 */
const DEATH: OrcPose[] = [
  {
    hip: [3, 0.5, 0], lean: 2, twist: 12, pitch: -38, jaw: 0.9, ears: [-22, -18], hair: -12, cloth: -6, breath: 1,
    armL: { swing: -18, out: 44, elbow: 30, wrist: 20 }, knife: -30,
    armR: { swing: 24, out: 48, elbow: 26, wrist: -10, grip: 0.1 },
  },
  {
    hip: [5, -7, 0], lean: -14, twist: 6, pitch: -24, jaw: 0.7, ears: [-10, -6], hair: 12, cloth: 8, fall: 10, slide: -8,
    armL: { swing: 40, out: 56, elbow: 40, wrist: 10 }, knifeAt: { at: [-14, 30, 12], spin: 120 },
    armR: { swing: 60, out: 50, elbow: 30, wrist: -10, grip: 0.2 },
    footL: { at: [-10, 0, 6.5], toe: 10 },
  },
  {
    hip: [5, -9, 0], lean: -12, twist: 0, pitch: -10, jaw: 0.6, ears: [6, 8], hair: 18, cloth: 12, fall: 42, slide: -36,
    armL: { swing: 120, out: 50, elbow: 30, wrist: 0 }, knifeAt: { at: [-20, 10, 13], spin: 250 },
    armR: { swing: 130, out: 46, elbow: 40, wrist: 0, grip: 0.3 },
    footL: { at: [-12, 2, 6.5], toe: 0 },
  },
  {
    hip: [5, -9, 0], lean: -6, pitch: 8, jaw: 0.4, ears: [14, 10], hair: 4, cloth: -4, fall: 84, slide: -62,
    armL: { swing: 150, out: 40, elbow: 40, wrist: 10 }, knifeAt: { at: [-34, 1.2, 2], spin: 345 },
    armR: { swing: 156, out: 40, elbow: 50, wrist: 10, grip: 0.4 },
    footL: { at: [-11, 4, 6.5], toe: 0 }, footR: { at: [6, 1, -6.5], toe: 0 },
  },
  {
    hip: [5, -9.5, 0], lean: -2, pitch: 2, yaw: 20, tilt: -10, jaw: 0.5, blink: true, ears: [20, 18], hair: 0, cloth: 2, fall: 90, slide: -64,
    armL: { swing: 160, out: 18, elbow: 40, wrist: 20 }, knifeAt: { at: [-34, 1.2, 2], spin: 360 },
    armR: { swing: 150, out: 46, elbow: 60, wrist: 20, grip: 0.7 },
    footL: { at: [-12, 3, 6.5], toe: 0 }, footR: { at: [5, 0, -6.5], toe: 0 },
  },
];

/** Poses de cada clipe (na ordem da folha). */
export const CLIP_POSES = {
  idle: Array.from({ length: 6 }, (_, k) => idlePose(k, 6)),
  walk: Array.from({ length: 8 }, (_, k) => walkPose(k / 8)),
  attack: ATTACK,
  death: DEATH,
  /** Frente e costas: 3 do parado (ida e volta) e 6 do andar. */
  idleTurn: [0, 2, 3].map((k) => idlePose(k, 6)),
  walkTurn: Array.from({ length: 6 }, (_, k) => walkPose(k / 6)),
};
