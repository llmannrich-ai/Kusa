import { SCULPT_SIZE, Sculpt, basis, lerp3, render, rot, turn, v3, tween, type Frame, type Look, type Mat3, type Material, type V3, type View, applySkin, type Skin } from "./sculpt.ts";

/**
 * Quadrúpedes do Bosque Velho esculpidos por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): o Lobo Atroz, a Pantera
 * das Sombras e o Centauro Renegado (o corpo de cavalo do mesmo modelo, com o tronco de homem por cima). Um modelo só,
 * com as medidas de cada bicho (`SPECS`): peito, barriga e anca em elipsoides, pescoço, cabeça com focinho e mandíbula
 * que abre, orelhas, cauda em gomos e 4 pernas por cinemática inversa (o pé fica no chão e o joelho dobra para o lado
 * certo: o da frente para trás, o jarrete de trás para trás). Andar em trote (as diagonais juntas), como o passo do
 * escorpião sai da fase. Olha para a esquerda (x negativo), chão em y = 0.
 */

export type BeastKind = "wolf" | "panther" | "centaur" | "boar" | "stag";

// --- Materiais -----------------------------------------------------------------------------------------------------

const M = {
  coat: 0, coatDark: 1, belly: 2, muzzle: 3, nose: 4, eye: 5, mouth: 6, tooth: 7, claw: 8, smoke: 9,
  skin: 10, leather: 11, pelt: 12, wood: 13, string: 14, hair: 15, paint: 16, hoof: 17, feather: 18, arrow: 19, steel: 20,
  antler: 21, moss: 22, thorn: 23, rot: 24,
} as const;

interface Palette { coat: readonly string[]; coatDark: readonly string[]; belly: readonly string[]; muzzle: readonly string[]; eye: readonly string[]; outline: string }

const PALETTES: Record<BeastKind, Palette> = {
  // Cinza-ferro, o dorso mais escuro, o focinho claro e o olho âmbar.
  wolf: {
    coat: ["#0f1114", "#1b1e22", "#2a2e33", "#3c4146", "#50565b", "#666c70", "#7f8486", "#9a9d9c", "#b6b7b2"],
    coatDark: ["#08090b", "#111316", "#1b1e22", "#262a2f", "#33383d", "#43484d", "#565b5f"],
    belly: ["#2b2a27", "#46443e", "#625f56", "#807b6f", "#9e988a", "#bcb5a5", "#d6d0c0"],
    muzzle: ["#2e2c28", "#4a4740", "#68645a", "#888274", "#a8a191", "#c6c0b0", "#e0dccf"],
    eye: ["#4a2004", "#8a4408", "#cf7a10", "#ffb42a", "#ffe9a0"],
    outline: "#0b0a0a",
  },
  // Preto-azulado com o brilho azul no pelo e os olhos verdes frios.
  panther: {
    coat: ["#05060a", "#0a0c13", "#10141e", "#171c2a", "#1f2638", "#2a3348", "#37425c", "#4a5874", "#66789a"],
    coatDark: ["#030407", "#06080d", "#0b0e16", "#11151f", "#181d2a", "#212839"],
    belly: ["#07080c", "#0e1017", "#161a24", "#1f2431", "#292f3f", "#353d50"],
    muzzle: ["#0a0c12", "#141822", "#1e2431", "#2a3242", "#384256", "#4a566e"],
    eye: ["#0a3a10", "#1f7a24", "#4ad04a", "#9aff7a", "#e8ffe0"],
    outline: "#020205",
  },
  // Cavalo malhado cinza e preto.
  centaur: {
    coat: ["#141516", "#232527", "#36393b", "#4b4e50", "#626567", "#7c7f80", "#979999", "#b3b4b2", "#d0d0cc"],
    coatDark: ["#060607", "#0c0d0e", "#141516", "#1d1f20", "#28292b", "#343638"],
    belly: ["#2a2a28", "#444440", "#605f5a", "#7e7c76", "#9c9a92", "#bab7ae"],
    muzzle: ["#1c1c1c", "#2e2e2e", "#444444", "#5c5c5c", "#767676"],
    eye: ["#2a1606", "#5a320e", "#8a5a20", "#c08a40", "#f0d090"],
    outline: "#0a0909",
  },
  // Javali-Espinho: pardo-escuro de cerdas grossas, o olho vermelho.
  boar: {
    coat: ["#0c0705", "#170e09", "#24160d", "#331f12", "#442a18", "#57361f", "#6b4428", "#805434"],
    coatDark: ["#050302", "#0b0705", "#130c08", "#1c120b", "#26190f", "#312114"],
    belly: ["#1e140c", "#322216", "#483222", "#5e422e", "#74543a"],
    muzzle: ["#2a1a14", "#44302a", "#5e463e", "#7a5e54", "#96786c", "#b2948a"],
    eye: ["#3a0404", "#7a0a08", "#c01810", "#ff4a30", "#ffc0a0"],
    outline: "#070403",
  },
  // Cervo Corrompido: cinza-pardo pálido, manchas de podridão escura, o olho verde doente.
  stag: {
    coat: ["#16120e", "#262019", "#3a3126", "#4f4434", "#665844", "#7e6e56", "#968568", "#ae9c7e", "#c6b496"],
    coatDark: ["#08070a", "#100e12", "#1a161c", "#242026", "#2e2a32", "#3a3540"],
    belly: ["#3a342a", "#5a5242", "#7a705c", "#9a8e76", "#b8ac92", "#d4caae"],
    muzzle: ["#1c1814", "#302a22", "#463e32", "#5e5444", "#786c58"],
    eye: ["#1a4a08", "#3a8a10", "#7ad030", "#c4ff70", "#f4ffd0"],
    outline: "#0a0806",
  },
};

function look(kind: BeastKind): Look {
  const pal = PALETTES[kind];
  const fur = kind === "panther" ? { grain: 0.1, grainSize: 1.6, bump: 0.18, bumpSize: 0.8, gloss: 0.45, shine: 14 } : { grain: 0.2, grainSize: 0.7, bump: 0.32, bumpSize: 0.32, speck: 0.07 };
  const materials: Material[] = [];
  materials[M.coat] = { ramp: pal.coat, ...fur, belly: M.belly, lineDepth: 1.6 };
  materials[M.coatDark] = { ramp: pal.coatDark, ...fur, lineDepth: 1.4 };
  materials[M.belly] = { ramp: pal.belly, ...fur, bias: 0.04 };
  materials[M.muzzle] = { ramp: pal.muzzle, grain: 0.14, grainSize: 0.7, bump: 0.25, bumpSize: 0.4, lineDepth: 1 };
  materials[M.nose] = { ramp: ["#020202", "#0a0909", "#151313", "#24201f", "#3a3432"], gloss: 1.4, shine: 30 };
  materials[M.eye] = { ramp: pal.eye, emit: 0.78 };
  materials[M.mouth] = { ramp: ["#140406", "#2a080c", "#461014", "#64181c", "#8a2a2a"], lineDepth: 0.6 };
  materials[M.tooth] = { ramp: ["#5c5440", "#8a8064", "#b6ad8c", "#dcd4b6", "#f6f0dc"], gloss: 0.6, shine: 20, lineDepth: 0.5 };
  materials[M.claw] = { ramp: ["#060505", "#121010", "#221e1c", "#36302c", "#4e4640"], gloss: 0.8, shine: 26, lineDepth: 0.5 };
  materials[M.smoke] = { ramp: ["#05060b", "#0c0f1a", "#161b2c", "#222a42", "#32405e", "#4a5c82"], grain: 0.35, grainSize: 1.2, lineDepth: 0.8, glow: 0.12 };
  materials[M.skin] = { ramp: ["#2a140c", "#472416", "#683822", "#8c5232", "#ae6e46", "#cc8e60", "#e4b088", "#f4d2b0"], grain: 0.1, grainSize: 0.8, bump: 0.2, bumpSize: 0.5, lineDepth: 1.1 };
  materials[M.leather] = { ramp: ["#120a06", "#24140a", "#3a2210", "#543418", "#704922", "#8e622f", "#ab7e44"], gloss: 0.35, shine: 14, grain: 0.18, grainSize: 0.7, bump: 0.3, bumpSize: 0.5, lineDepth: 0.9 };
  materials[M.pelt] = { ramp: ["#121416", "#22262a", "#363b40", "#4d5358", "#686e72", "#868b8c", "#a6a8a6"], grain: 0.3, grainSize: 0.6, bump: 0.7, bumpSize: 0.45, lineDepth: 0.9 };
  materials[M.wood] = { ramp: ["#1a0e06", "#2e1a0c", "#472912", "#623a1a", "#7e4e24", "#9c6632", "#b98244"], gloss: 0.3, shine: 16, grain: 0.15, grainSize: 0.6, lineDepth: 0.5 };
  materials[M.string] = { ramp: ["#6a6458", "#958e7e", "#bdb6a4", "#e0dbcc"], lineDepth: 0.3 };
  materials[M.hair] = { ramp: ["#0a0706", "#16100c", "#241a12", "#36261a", "#4a3624", "#62482f"], grain: 0.3, grainSize: 0.4, bump: 0.4, bumpSize: 0.35, lineDepth: 0.9 };
  materials[M.paint] = { ramp: ["#3a0606", "#5e0c0a", "#861810", "#ac2a1a", "#cc4428"], grain: 0.12, lineDepth: 0.3 };
  materials[M.hoof] = { ramp: ["#060505", "#0f0d0c", "#1c1816", "#2c2622", "#403832"], gloss: 0.5, shine: 20, lineDepth: 0.6 };
  materials[M.feather] = { ramp: ["#030303", "#0a0a0b", "#141416", "#202024", "#303036"], lineDepth: 0.4 };
  materials[M.arrow] = { ramp: ["#3a2614", "#5a3c1e", "#7c5530", "#9e7044", "#c09060"], lineDepth: 0.4 };
  materials[M.antler] = { ramp: ["#2a2216", "#463a28", "#665640", "#88765a", "#a89676", "#c6b694", "#e0d2b2"], gloss: 0.3, shine: 16, bump: 0.35, bumpSize: 0.35, lineDepth: 0.5 };
  materials[M.moss] = { ramp: ["#0e1406", "#1a240a", "#283810", "#364c16", "#46621e", "#5a7a28"], grain: 0.3, grainSize: 0.4, bump: 0.5, bumpSize: 0.3, lineDepth: 0.5 };
  materials[M.thorn] = { ramp: ["#4a4430", "#7a7250", "#a8a074", "#d0ca9e", "#eeeacc"], gloss: 0.5, shine: 20, lineDepth: 0.3 };
  materials[M.rot] = { ramp: ["#05020a", "#0e0614", "#1a0c22", "#2a1434", "#3c1e48"], gloss: 0.5, shine: 20, bump: 0.5, bumpSize: 0.3, lineDepth: 0.4 };
  materials[M.steel] = { ramp: ["#1c1f24", "#343940", "#525962", "#767e88", "#a0a8b2", "#d0d6dc", "#f4f8fc"], gloss: 1.2, shine: 30, lineDepth: 0.5 };
  // Mata: a luz que vem de cima é verde, e a rebatida do chão também.
  return { materials, outline: pal.outline, bounce: { color: "#9ab860", power: 0.35 }, occlusion: 0.6, rim: { color: "#e8f0c0", power: 0.45 } };
}

// --- Medidas ---------------------------------------------------------------------------------------------------------

interface Spec {
  /** Altura do ombro e da anca (unidades), meio comprimento do tronco. */
  shoulderY: number; hipY: number; half: number;
  /** Raios do peito, da barriga e da anca (x, y, z). */
  chest: V3; waist: V3; rump: V3;
  /** Coxa e canela da frente e de trás. */
  fore: [number, number, number]; hind: [number, number, number];
  /** Grossura das pernas (em cima e no pé). */
  legR: [number, number];
  /** Pescoço (comprimento, raio), cabeça (raios), focinho (comprimento, raio). */
  neck: [number, number]; head: V3; snout: [number, number];
  /** Cauda: gomos, comprimento de cada um, raio na base e na ponta. */
  tail: [number, number, number, number];
  /** Meia distância entre as pernas de cá e de lá. */
  gauge: number;
}

const SPECS: Record<BeastKind, Spec> = {
  wolf: {
    shoulderY: 21, hipY: 19.5, half: 13, chest: [10, 8.6, 7.4], waist: [9, 6.4, 6], rump: [7, 7, 6.4],
    fore: [9, 8.5, 3.6], hind: [9.5, 9, 4], legR: [2.6, 1.6], neck: [8, 5.4], head: [5.4, 4.6, 4.4], snout: [7.6, 2.4],
    tail: [6, 3.2, 2.6, 1.6], gauge: 4.4,
  },
  panther: {
    shoulderY: 16.5, hipY: 16.5, half: 14, chest: [9.6, 6.6, 6], waist: [14, 5.9, 5.5], rump: [7.6, 6.4, 5.8],
    fore: [7.6, 7.2, 3], hind: [8, 7.6, 3.6], legR: [2.4, 1.6], neck: [6, 4.6], head: [5.8, 5, 5], snout: [3.8, 2.9],
    tail: [9, 3, 1.6, 1.1], gauge: 3.8,
  },
  centaur: {
    shoulderY: 30, hipY: 30, half: 13, chest: [9.5, 8.4, 7.4], waist: [12, 8, 7.2], rump: [8.4, 8.6, 7.8],
    fore: [14, 14, 3.2], hind: [14.5, 14, 3.8], legR: [2.8, 1.7], neck: [0, 0], head: [0, 0, 0], snout: [0, 0],
    tail: [6, 3, 1.6, 2.6], gauge: 4.6,
  },
  boar: {
    shoulderY: 19, hipY: 16, half: 10, chest: [9, 8.6, 7], waist: [9.6, 6.8, 6.4], rump: [6.4, 6.6, 6],
    fore: [8, 8, 2.4], hind: [8.5, 8, 3], legR: [2.4, 1.4], neck: [5, 5], head: [5, 4.4, 3.8], snout: [7, 2.6],
    tail: [3, 2, 0.8, 0.5], gauge: 4.4,
  },
  stag: {
    shoulderY: 24, hipY: 24, half: 11, chest: [8, 7.4, 6], waist: [10, 6.6, 5.6], rump: [6.4, 7, 6],
    fore: [11, 11, 2.6], hind: [11.5, 11, 3.2], legR: [2.2, 1.2], neck: [11, 3.4], head: [4.4, 3.4, 3], snout: [5.6, 1.9],
    tail: [2, 2, 1.4, 1], gauge: 3.8,
  },
};

// --- Pose ------------------------------------------------------------------------------------------------------------

export interface BPose {
  /** Fase do passo (0..1) e quanto anda (0 = parado). */
  phase?: number;
  stride?: number;
  /** Corpo para a frente (negativo = para a esquerda) e para cima. */
  x?: number;
  lift?: number;
  /** Inclinação (graus; positivo = a frente sobe) e agachar (abaixa o corpo, dobrando as pernas). */
  lean?: number;
  crouch?: number;
  /** Cabeça: abaixa (+) ou levanta (−) e quanto o pescoço estica para a frente. */
  nod?: number;
  reach?: number;
  /** Boca aberta (0..1). */
  gape?: number;
  /** Cauda: ângulo (graus acima da horizontal) e balanço de lado. */
  tail?: number;
  wag?: number;
  /** Pernas da frente: esticam para a frente (bote, 0..1) e para cima (patada, 0..1). */
  pounce?: number;
  /** Morte: tomba de lado (graus) e encolhe as pernas (0..1). */
  roll?: number;
  curl?: number;
  /** Fumaça da pantera: quanto do corpo se desfaz (0..1). */
  smoke?: number;
  /** Centauro: arco (puxar a corda, 0..1; mirar para cima, graus), tronco (inclina), braço do arco e respirar. */
  draw?: number;
  aim?: number;
  torso?: number;
  breath?: number;
  /** Centauro: empina (graus) e dá o coice (pernas de trás para trás, 0..1). */
  rear?: number;
  kick?: number;
}

const D2R = Math.PI / 180;

function mulM(a: Mat3, b: Mat3): Mat3 {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [v3.dot(a[i], col(0)), v3.dot(a[i], col(1)), v3.dot(a[i], col(2))] as V3) as unknown as Mat3;
}

/** Junta de duas partes por cinemática inversa: o joelho sai para o lado de `bend`. */
function ik(a: V3, foot: V3, l1: number, l2: number, bend: V3): V3 {
  const af = v3.sub(foot, a);
  const d = Math.min(v3.len(af), l1 + l2 - 0.05);
  const dir = v3.norm(af);
  const perp = v3.norm(v3.sub(bend, v3.mul(dir, v3.dot(bend, dir))));
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return v3.add(a, v3.add(v3.mul(dir, x), v3.mul(perp, h)));
}

export function beast(kind: BeastKind, p: BPose = {}): Sculpt {
  const sp = SPECS[kind];
  const sc = new Sculpt();
  const crouch = p.crouch ?? 0, lean = p.lean ?? 0, roll = p.roll ?? 0, curl = p.curl ?? 0;
  const lay = Math.sin(Math.min(90, Math.abs(roll)) * D2R) ;
  // Corpo: inclina em volta do meio e tomba de lado na morte (e desce até deitar no chão).
  const midY = (sp.shoulderY + sp.hipY) / 2;
  const pivot: V3 = [0, midY, 0];
  const bodyM: Mat3 = mulM(rot("x", -roll), rot("z", -lean - (p.rear ?? 0)));
  const drop = crouch * 5 + lay * (midY - sp.chest[2] - 0.5);
  const move: V3 = [p.x ?? 0, (p.lift ?? 0) - drop, 0];
  const B = (q: V3): V3 => v3.add(turn(bodyM, q, pivot), move);

  // --- Pernas: o ombro e a anca vão com o corpo; o pé fica no chão (fora do `push`) ---
  const stride = p.stride ?? 0, phase = p.phase ?? 0, pounce = p.pounce ?? 0, kick = p.kick ?? 0;
  const legs: { front: boolean; s: number }[] = [{ front: true, s: 1 }, { front: true, s: -1 }, { front: false, s: 1 }, { front: false, s: -1 }];
  for (const { front, s } of legs) {
    const [l1, l2, paw] = front ? sp.fore : sp.hind;
    const top: V3 = front ? [-sp.half + 2, sp.shoulderY - 2, s * sp.gauge] : [sp.half - 1, sp.hipY - 1.5, s * sp.gauge];
    const root = B(top);
    // Trote: a frente de cá anda com a de trás de lá.
    const ph = (phase + (front === (s > 0) ? 0 : 0.5)) % 1;
    const sw = ph < 0.5 ? 0.5 - ph / 0.5 : (ph - 0.5) / 0.5 - 0.5;
    const up = ph >= 0.5 ? Math.sin(((ph - 0.5) / 0.5) * Math.PI) * 3.2 : 0;
    let foot: V3 = [top[0] + (front ? -1 : 1.5) + sw * stride, up, s * (sp.gauge + 0.6)];
    // Bote: as da frente esticam para a frente e para cima; coice: as de trás para trás e para cima.
    if (front && pounce) foot = lerp3(foot, v3.add(root, [-(l1 + l2) * 0.85, -(l1 + l2) * 0.25 + pounce * 3, s * 0.5]), pounce);
    if (!front && kick) foot = lerp3(foot, v3.add(root, [(l1 + l2) * 0.85, -(l1 + l2) * 0.35, s * 0.5]), kick);
    // Morto: as pernas encolhem e vão com o corpo.
    if (curl) foot = lerp3(foot, B([top[0] + (front ? -4 : 4), top[1] - (l1 + l2) * 0.55, s * (sp.gauge + 2)]), curl);
    if (lay) foot = lerp3(foot, B([top[0] + (front ? -6 : 6), top[1] - (l1 + l2) * 0.9, s * sp.gauge]), lay * (1 - curl));
    const ankle: V3 = v3.add(foot, [front ? 0.4 : 1.6, paw, 0]);
    // A frente dobra o cotovelo para trás; a de trás, o joelho para a frente (o jarrete é o tornozelo alto).
    const knee = ik(root, ankle, l1, l2, turn(bodyM, front ? [1, -0.2, 0] : [-1, -0.2, 0]));
    const part = sc.part();
    const [r0, r1] = sp.legR;
    const coat = front ? M.coat : M.coat;
    if (kind === "centaur" || kind === "boar" || kind === "stag") {
      sc.cone(root, knee, r0 + 1.6, r0, coat, { part });
      sc.cone(knee, ankle, r0 * 0.75, r1, coat, { part });
      sc.ball(knee, r0 * 0.85, coat, part);
      // Canela, quartela e casco.
      sc.cone(ankle, v3.add(foot, [-0.6, 1.2, 0]), r1, r1 * 0.9, M.coatDark, { part });
      sc.cone(v3.add(foot, [-0.4, 1.2, 0]), v3.add(foot, [-0.9, 0.3, 0]), r1 * 1.25, r1 * 1.45, M.hoof, { part });
    } else {
      sc.cone(root, knee, r0 + (front ? 1.2 : 2.2), r0, coat, { part });
      sc.cone(knee, ankle, r0, r1, coat, { part });
      sc.ball(knee, r0 * 0.95, coat, part);
      // Pata: almofada e três dedos com unhas.
      const pawC = v3.add(foot, [-1.2, 1.1, 0]);
      sc.cone(ankle, pawC, r1, r1 * 1.15, coat, { part });
      sc.ell(pawC, [2.6, 1.4, 2], M.coat, { part });
      for (const t of [-1, 0, 1]) sc.cone(v3.add(pawC, [-2, -0.2, t * 1.1]), v3.add(pawC, [-3.4, -1, t * 1.2]), 0.45, 0.2, M.claw, { part });
    }
  }

  sc.push(bodyM, pivot, move);

  // --- Tronco: peito, barriga e anca numa peça só (as linhas internas só aparecem entre partes) ---
  const body = sc.part();
  sc.ell([-sp.half + 2, sp.shoulderY, 0], sp.chest, M.coat, { part: body, axes: basis([1, -0.15, 0]) });
  sc.ell([0, midY + 0.5, 0], sp.waist, M.coat, { part: body, axes: basis([1, (sp.hipY - sp.shoulderY) / 40, 0]) });
  sc.ell([sp.half - 1, sp.hipY + 0.5, 0], sp.rump, M.coat, { part: body });
  // Dorso mais escuro (a crina do lobo, a malha do cavalo).
  if (kind === "wolf") {
    for (let k = 0; k < 7; k++) {
      const x = -sp.half - 3 + k * 4.2;
      sc.ell([x, sp.shoulderY + sp.chest[1] * 0.72 - k * 0.35, 0], [3.4, 2.4, 3.4], M.coatDark, { part: body });
    }
  }
  if (kind === "boar") {
    // Crina de cerdas escuras e espinhos de amora nascendo do lombo.
    for (let k = 0; k < 8; k++) {
      const x = -sp.half - 2 + k * 3.2, y = sp.shoulderY + sp.chest[1] * 0.8 - k * 0.5;
      sc.ell([x, y, 0], [2.6, 2.2, 2.8], M.coatDark, { part: body });
      sc.cone([x, y + 1, 0], [x + 2 + (k % 2), y + 4.4 - (k % 3) * 0.6, (k % 2 ? 1 : -1) * 1.2], 0.7, 0.08, M.thorn);
    }
  }
  if (kind === "stag") {
    // Manchas de podridão e musgo nas costas.
    const spots: V3[] = [[-6, 29.5, 5], [3, 30, -4.6], [9, 30, 4.6], [-1, 31, 0], [12, 26, -5.6]];
    spots.forEach((q, k) => sc.ell(q, [2.2, 1.6, 1.2], k % 2 ? M.rot : M.moss, { part: body, axes: basis([1, 0.2, 0]) }));
  }
  if (kind === "centaur") {
    // Malhas escuras soltas pelo corpo.
    const spots: V3[] = [[-6, 35, 6], [2, 36, -5], [9, 34, 7], [14, 37, 3], [-2, 32, 7.4], [12, 29, -7.8], [5, 28, 7.4], [-10, 28, -7]];
    for (const q of spots) sc.ell(q, [2.6, 2, 1.4], M.coatDark, { part: body, axes: basis([1, 0.2, 0]) });
  }

  // --- Cauda: gomos em arco, balançando ---
  const [nT, lenT, rT0, rT1] = sp.tail;
  let at: V3 = [sp.half + sp.rump[0] - 2, sp.hipY + 2.5, 0];
  let ang = p.tail ?? (kind === "panther" ? -20 : kind === "centaur" ? -60 : kind === "stag" ? 30 : kind === "boar" ? -50 : -35);
  const tailPart = sc.part();
  for (let k = 0; k < nT; k++) {
    const a = (ang + (kind === "panther" ? (k < 3 ? -k * 6 : (k - 3) * 11 - 18) : -k * 3)) * D2R;
    const wag = (p.wag ?? 0) * (k + 1) * 0.35;
    const next = v3.add(at, [Math.cos(a) * lenT, Math.sin(a) * lenT, wag]);
    const r0 = rT0 + ((rT1 - rT0) * k) / nT, r1 = rT0 + ((rT1 - rT0) * (k + 1)) / nT;
    if (kind === "centaur") sc.cone(at, next, r0, r1 + 0.6, M.hair, { part: tailPart });
    else sc.cone(at, next, r0 * (kind === "wolf" && k > 1 ? 1.25 : 1), r1 * (kind === "wolf" ? 1.2 : 1), k > 3 && kind === "wolf" ? M.coatDark : M.coat, { part: tailPart });
    at = next;
  }
  ang += 0;

  if (kind === "centaur") centaurTop(sc, p, sp);
  else head(sc, kind, p, sp);

  // Pantera: a fumaça escura sobe da ponta da cauda e, no bote das sombras, o corpo inteiro se desfaz nela.
  if (kind === "panther") {
    const smoke = p.smoke ?? 0;
    [[0, 0, 0, 1.2], [1.2, 2.4, 0.6, 0.9], [2.6, 4.4, -0.4, 0.6]].forEach(([dx, dy, dz, r]) => sc.ball(v3.add(at, [dx, dy, dz]), r * (1 + smoke), M.smoke));
    if (smoke > 0.2) for (let k = 0; k < 11; k++) {
      const a = k * 2.3;
      sc.ball([-16 + k * 3.4, 15 + Math.sin(a) * 4 + smoke * 3, Math.cos(a) * 6.5], (1.4 + (k % 3) * 0.6) * smoke + 0.5, M.smoke);
    }
  }

  sc.pop();
  return sc;
}

/** Pescoço, cabeça, focinho e mandíbula, orelhas e olhos (lobo e pantera). */
function head(sc: Sculpt, kind: BeastKind, p: BPose, sp: Spec) {
  const nod = p.nod ?? 0, reach = p.reach ?? 0, gape = p.gape ?? 0;
  const wolf = kind === "wolf", boar = kind === "boar", stag = kind === "stag";
  const neck0: V3 = [-sp.half - 3, sp.shoulderY + 2, 0];
  const neckDir = turn(rot("z", -nod * 0.6), v3.norm(wolf ? [-0.62, 0.55, 0] : stag ? [-0.42, 0.9, 0] : boar ? [-1, -0.15, 0] : [-0.75, 0.42, 0]));
  const neck1 = v3.add(neck0, v3.mul(neckDir, sp.neck[0] + reach));
  const part = sc.part();
  sc.cone(neck0, neck1, sp.neck[1] + 1, sp.neck[1], M.coat, { part });
  // Juba do lobo: tufos em volta do pescoço.
  if (wolf) for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    sc.ball(v3.add(lerp3(neck0, neck1, 0.45), [Math.cos(a) * 1.5 + 1, Math.sin(a) * 4 + 1, Math.cos(a + 1) * 4.6]), 3, k % 3 ? M.coat : M.coatDark, part);
  }
  sc.push(rot("z", -nod), neck1);
  const hc: V3 = v3.add(neck1, [-2.6, 1.2, 0]);
  const hp = sc.part();
  sc.ell(hc, sp.head, M.coat, { part: hp, axes: basis([1, -0.1, 0]) });
  // Focinho (o de cima) e a mandíbula (abre com `gape`).
  const sDir = v3.norm([-1, wolf ? -0.22 : stag ? -0.5 : boar ? -0.35 : -0.15, 0]);
  const s0 = v3.add(hc, [-sp.head[0] * 0.55, -0.6, 0]);
  const s1 = v3.add(s0, v3.mul(sDir, sp.snout[0]));
  sc.cone(s0, s1, sp.snout[1] + 0.7, sp.snout[1] * 0.85, M.muzzle, { part: hp });
  sc.ball(v3.add(s1, [-0.5, 0.5, 0]), sp.snout[1] * 0.6, M.nose, hp);
  const jawDir = turn(rot("z", gape * 48), sDir);
  const j0 = v3.add(s0, [0.8, -sp.snout[1] * 0.85, 0]);
  const j1 = v3.add(j0, v3.mul(jawDir, sp.snout[0] * 0.9));
  const jaw = sc.part();
  sc.cone(j0, j1, sp.snout[1] * 0.75, sp.snout[1] * 0.5, M.muzzle, { part: jaw });
  if (gape > 0.05) {
    // Boca por dentro e as presas.
    sc.cone(v3.add(s0, [0, -sp.snout[1] * 0.5, 0]), v3.add(lerp3(s1, j1, 0.5), [0.8, 0, 0]), sp.snout[1] * 0.55, 0.6, M.mouth);
  }
  if (boar) {
    // Disco do focinho e as presas curvas para cima.
    sc.ell(v3.add(s1, [-0.4, 0, 0]), [0.8, sp.snout[1] * 0.9, sp.snout[1] * 1.05], M.muzzle, { part: hp });
    for (const s of [1, -1]) {
      sc.ball(v3.add(s1, [-1.1, 0.3, s * 1.1]), 0.55, M.nose, hp);
      sc.limb([v3.add(s1, [2.6, -1.6, s * 2.2]), v3.add(s1, [0.4, -0.2, s * 3.2]), v3.add(s1, [0.2, 2.8, s * 3.6]), v3.add(s1, [1.6, 4, s * 3.4])], 1.1, 0.2, M.tooth);
    }
  } else if (!stag) for (const s of [1, -1]) {
    sc.cone(v3.add(s1, [1.2, -sp.snout[1] * 0.6, s * 1.1]), v3.add(s1, [1.4, -sp.snout[1] * 0.6 - 1.8, s * 1]), 0.55, 0.15, M.tooth);
    sc.cone(v3.add(j1, [1.4, sp.snout[1] * 0.45, s * 0.9]), v3.add(j1, [1.6, sp.snout[1] * 0.45 + 1.3, s * 0.8]), 0.45, 0.12, M.tooth);
  }
  // Olhos e orelhas.
  for (const s of [1, -1]) {
    sc.ball(v3.add(hc, [-sp.head[0] * 0.62, sp.head[1] * 0.28, s * sp.head[2] * 0.58]), wolf ? 0.85 : 0.95, M.eye);
    const e0 = v3.add(hc, [wolf ? 0.6 : 1.2, sp.head[1] * 0.75, s * sp.head[2] * 0.55]);
    if (wolf) {
      // Orelhas em pé, a de lá rasgada (mais curta).
      const tip = v3.add(e0, [1.6, s > 0 ? 6 : 4.2, s * 1.2]);
      sc.cone(e0, tip, 2.1, 0.35, M.coatDark, { part: sc.part() });
    } else if (stag) {
      // Orelhas de cervo para o lado e a galhada: o galho principal para trás e para cima, com as pontas e musgo.
      sc.ell(v3.add(e0, [1, -0.4, s * 1.8]), [1.2, 0.6, 2.2], M.coat, { part: sc.part(), axes: basis([0.3, 0.2, s]) });
      const ant = sc.part();
      const a0 = v3.add(hc, [0.4, sp.head[1] * 0.8, s * 1.4]);
      const main = [a0, v3.add(a0, [1.4, 4, s * 2.4]), v3.add(a0, [3.6, 8.4, s * 3.6]), v3.add(a0, [4.6, 12.6, s * 3.4]), v3.add(a0, [3.6, 16, s * 2.6])];
      sc.limb(main, 0.9, 0.35, M.antler, { part: ant });
      for (const [i, dx, dy, dz] of [[1, -3.4, 2.6, 0.6], [2, -3, 3.2, 1.2], [3, 0.6, 3, 1.6], [3, -2.2, 2.2, 0]] as const)
        sc.cone(main[i], v3.add(main[i], [dx, dy, s * dz]), 0.55, 0.15, M.antler, { part: ant });
      sc.ell(v3.add(main[2], [0, -0.4, 0]), [1.2, 0.7, 1], M.moss);
      sc.ell(lerp3(main[3], main[4], 0.5), [0.6, 1.6, 0.5], M.moss);
    } else if (boar) {
      sc.ell(v3.add(e0, [0.6, 0.8, s * 0.6]), [1.2, 2, 0.8], M.coatDark, { part: sc.part(), axes: basis([0.4, 1, s * 0.3]) });
    } else {
      sc.ell(v3.add(e0, [0, 0.6, 0]), [1.5, 1.8, 0.9], M.coatDark, { part: sc.part() });
    }
  }
  sc.pop();
  // Flecha velha cravada no ombro do lobo.
  if (wolf) {
    const base: V3 = [-sp.half + 3, sp.shoulderY + sp.chest[1] * 0.75, 3.5];
    const tip = v3.add(base, [5, 7, 2]);
    sc.cone(base, tip, 0.45, 0.4, M.arrow);
    sc.seg(v3.add(tip, [-0.6, -0.8, 0]), v3.add(tip, [0.8, 1.2, 0.4]), 0.25, 1.2, M.paint, { up: [0, 0, 1] });
  }
}

/** Centauro: tronco de homem na frente do corpo de cavalo, couraça, pele de lobo, cabeça barbada e o arco recurvo. */
function centaurTop(sc: Sculpt, p: BPose, sp: Spec) {
  const torsoLean = p.torso ?? 0, breath = p.breath ?? 0, draw = p.draw ?? 0, aim = p.aim ?? 0;
  /** O tronco de homem é desenhado nesta escala (o corpo de cavalo é grande: a 1 o homem ficava pequeno). */
  const Z = 1.32;
  const base: V3 = [-sp.half - 3, sp.shoulderY + 4, 0];
  sc.push(rot("z", -torsoLean), base);
  const at = (x: number, y: number, z = 0): V3 => [base[0] + x * Z, base[1] + y * Z, z * Z];
  const r3 = (x: number, y: number, z: number): V3 => [x * Z, y * Z, z * Z];
  const torso = sc.part();
  // Cintura de couro (a emenda com o cavalo), barriga e peito.
  sc.ell(at(0.5, 0.5), r3(6.2, 4, 6.6), M.leather, { part: torso });
  sc.seg(at(0, 1), at(-0.6, 9), 5 * Z, 5.8 * Z, M.skin, { part: torso, up: [0, 0, 1], over: 1 });
  sc.seg(at(-0.6, 7.5), at(-1, 15 + breath * 0.4), (5.8 + breath * 0.2) * Z, 7 * Z, M.leather, { part: torso, up: [0, 0, 1], over: 1 });
  // Couraça: placas atravessadas.
  for (let k = 0; k < 3; k++) sc.seg(at(-5.4, 8.5 + k * 2.4, -4), at(-5.4, 8.5 + k * 2.4, 4), 0.6 * Z, 1 * Z, M.leather, { up: [1, 0, 0] });
  // Pele de lobo nos ombros.
  const pelt = sc.part();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    sc.ball(at(Math.cos(a) * 3.6 + 0.5, 15.6 + Math.sin(a * 2) * 0.6, Math.sin(a) * 6.2), 2.6 * Z, M.pelt, pelt);
  }
  sc.ell(at(3.5, 12, 0), r3(3, 6, 5.5), M.pelt, { part: pelt });
  // Aljava nas costas, de flechas de pena preta.
  const q0 = at(4.5, 7, -3), q1 = at(6.5, 19, -3.6);
  sc.cone(q0, q1, 1.9 * Z, 2.1 * Z, M.leather, { part: sc.part() });
  for (const dz of [-0.9, 0, 0.9]) sc.seg(v3.add(q1, [0, 0.4, dz * Z]), v3.add(q1, [1.2 * Z, 3.6 * Z, dz * Z]), 0.25 * Z, 0.8 * Z, M.feather, { up: [0, 0, 1] });

  // Cabeça: pescoço, rosto, barba, cabelo preso e a pintura de guerra.
  const neck = at(-1.2, 17), hc = at(-1.8, 21.6 + breath * 0.3);
  sc.cone(neck, v3.add(hc, r3(0.5, -2, 0)), 1.9 * Z, 1.8 * Z, M.skin);
  const hp = sc.part();
  sc.ell(hc, r3(3.2, 3.8, 3.1), M.skin, { part: hp, paint: (x, y) => (x < -1.2 * Z && y > -0.2 * Z && y < 1.2 * Z ? M.paint : -1) });
  sc.ell(v3.add(hc, r3(-1.6, -2.6, 0)), r3(2.2, 2.4, 2.6), M.hair, { part: hp });
  sc.ell(v3.add(hc, r3(0.9, 1.4, 0)), r3(3.1, 3.1, 3.3), M.hair, { part: hp });
  sc.cone(v3.add(hc, r3(3, 1, 0)), v3.add(hc, r3(5.5, -3, 0)), 1.3 * Z, 0.8 * Z, M.hair, { part: hp });
  sc.cone(v3.add(hc, r3(-3.3, 0.2, 0)), v3.add(hc, r3(-4, -0.6, 0)), 0.7 * Z, 0.4 * Z, M.skin, { part: hp });
  for (const s of [1, -1]) sc.ball(v3.add(hc, r3(-2.8, 0.7, s * 1.3)), 0.45 * Z, M.nose);

  // Braços e o arco: o de lá segura o arco esticado para a frente; o de cá puxa a corda até o queixo.
  const aimM = rot("z", aim);
  const chest = at(-1, 15);
  const bowHand = v3.add(chest, v3.mul(turn(aimM, [-12.5, 0.5, 2.5]), Z));
  const drawHand = v3.add(chest, v3.mul(turn(aimM, [-12 + 10 * draw, 0.8, 4.5]), Z));
  const shoulder = (s: number) => at(-0.5, 14.5, s * 6);
  const arm = (sh: V3, hand: V3, s: number) => {
    const el = ik(sh, hand, 6.4 * Z, 6.4 * Z, [0.4, -1, s * 0.3]);
    const part = sc.part();
    sc.ball(sh, 2.4 * Z, M.skin, part);
    sc.cone(sh, el, 2 * Z, 1.7 * Z, M.skin, { part });
    sc.cone(el, hand, 1.7 * Z, 1.3 * Z, M.skin, { part });
    sc.ball(hand, 1.4 * Z, M.skin, part);
  };
  arm(shoulder(-1), bowHand, -1);
  // Arco: duas lâminas recurvas a partir da mão, a corda reta até a mão que puxa.
  const up = turn(aimM, [0, 1, 0]), fwd = turn(aimM, [-1, 0, 0]);
  const limb = (s: number) => {
    const pts: V3[] = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      const bend = Math.sin(t * Math.PI * 0.85) * (3.4 + draw * 1.6) - (t > 0.8 ? (t - 0.8) * 9 : 0);
      pts.push(v3.add(bowHand, v3.add(v3.mul(up, s * t * 13 * Z), v3.mul(fwd, (-bend + 0.6) * Z))));
    }
    return pts;
  };
  const bow = sc.part();
  const top = limb(1), bottom = limb(-1);
  sc.limb(top, 1, 0.55, M.wood, { part: bow });
  sc.limb(bottom, 1, 0.55, M.wood, { part: bow });
  const nock = v3.add(drawHand, v3.mul(fwd, -0.4));
  sc.cone(top[5], nock, 0.22, 0.22, M.string);
  sc.cone(bottom[5], nock, 0.22, 0.22, M.string);
  if (draw > 0.15) {
    // Flecha na corda, apontando para a frente.
    const tip = v3.add(bowHand, v3.mul(fwd, 4.5));
    sc.cone(nock, tip, 0.35, 0.35, M.arrow);
    sc.cone(tip, v3.add(tip, v3.mul(fwd, 2)), 0.7, 0.1, M.steel);
  }
  arm(shoulder(1), drawHand, 1);
  sc.pop();
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

const PITCH = 36;
const SCALE: Record<BeastKind, number> = { wolf: 1.85, panther: 1.8, centaur: 1.3, boar: 1.8, stag: 1.5 };
const YAW: Record<View, number> = { side: 14, front: 90, back: -90 };
/** Linha do chão: os quadrúpedes ocupam a largura do quadro; o centauro é alto. */
export const BEAST_FEET: Record<BeastKind, number> = { wolf: SCULPT_SIZE - 30, panther: SCULPT_SIZE - 34, centaur: SCULPT_SIZE - 8, boar: SCULPT_SIZE - 26, stag: SCULPT_SIZE - 14 };

export function shootBeast(kind: BeastKind, pose: BPose, view: View, skin?: Skin): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + (kind === "panther" ? 4 : 2) : SCULPT_SIZE / 2;
  return render(beast(kind, pose), { size: SCULPT_SIZE, feet: BEAST_FEET[kind], cx, yaw: YAW[view], pitch: PITCH, scale: SCALE[kind] }, applySkin(look(kind), skin));
}

// --- Poses -----------------------------------------------------------------------------------------------------------

const DEF: BPose = {
  phase: 0, stride: 0, x: 0, lift: 0, lean: 0, crouch: 0, nod: 0, reach: 0, gape: 0, wag: 0, pounce: 0, roll: 0, curl: 0, smoke: 0,
  draw: 0, aim: 0, torso: 0, breath: 0, rear: 0, kick: 0,
};
const K = (p: BPose): BPose => ({ ...DEF, ...p });

/** Andar: 8 quadros do trote, o corpo quica duas vezes por ciclo e a cabeça amortece. */
function trot(stride: number, extra: (w: number, k: number) => BPose = () => ({})): BPose[] {
  return Array.from({ length: 8 }, (_, k) => {
    const w = Math.sin((k / 8) * Math.PI * 4);
    return K({ phase: k / 8, stride, lift: 0.5 + w * 0.5, lean: w * 0.8, nod: -w * 2, ...extra(w, k) });
  });
}

export const BEAST_POSES: Record<BeastKind, { idle: BPose[]; walk: BPose[]; attack: BPose[]; special: BPose[]; death: BPose[]; skill?: BPose[] }> = {
  // Javali: fuça o chão parado; o golpe é a presa de baixo para cima, o especial a investida de cabeça baixa.
  boar: {
    idle: tween([0, 1, 2].map((k) => K({ lift: k * 0.2, nod: 10 + k * 3, tail: -50 + k * 4, wag: k * 2 - 2 })), 6, true),
    walk: trot(8, (w) => ({ nod: 8 - w * 3, tail: -45 + w * 6, wag: w * 3 })),
    attack: tween([
      K({ crouch: 0.3, nod: 22, tail: -50 }),
      K({ crouch: 0.5, x: 1, nod: 30, tail: -55 }),
      K({ x: -5, lean: 6, nod: -18, gape: 0.4, lift: 1.5, tail: -30 }),
      K({ x: -3, lean: 2, nod: 0, tail: -40 }),
    ], 6),
    special: tween([
      K({ crouch: 0.7, x: 4, nod: 26, tail: -60 }),
      K({ crouch: 0.5, x: 2, nod: 30, lean: -4, tail: -60 }),
      K({ x: -6, lean: -6, nod: 28, phase: 0.25, stride: 12, lift: 1, tail: -20 }),
      K({ x: -9, lean: 4, nod: -10, gape: 0.4, lift: 1.5, tail: -30 }),
      K({ x: -8, nod: 6, tail: -45 }),
    ], 6),
    death: tween([
      K({ lean: 10, lift: 1.5, nod: -16, gape: 0.6, tail: -20 }),
      K({ roll: 45, crouch: 0.6, nod: 10, curl: 0.4, tail: -50 }),
      K({ roll: 90, nod: 12, curl: 0.25, tail: -60 }),
    ], 5),
  },
  // Cervo: altivo, a galhada erguida; o golpe é a cabeçada, o especial a galhada baixa em disparada.
  stag: {
    idle: tween([0, 1, 2].map((k) => K({ lift: k * 0.2, nod: -4 + k * 4, tail: 30 + k * 4, wag: k - 1 })), 6, true),
    walk: trot(11, (w) => ({ nod: -2 - w * 2, tail: 26 + w * 4, wag: w * 2 })),
    attack: tween([
      K({ nod: -14, lean: 6, lift: 1, tail: 40 }),
      K({ nod: -20, lean: 10, lift: 2, tail: 44 }),
      K({ x: -5, nod: 34, lean: -6, tail: 20 }),
      K({ x: -3, nod: 10, tail: 30 }),
    ], 6),
    special: tween([
      K({ crouch: 0.4, x: 3, nod: 30, tail: 40 }),
      K({ x: -8, nod: 40, lean: -4, phase: 0.25, stride: 14, tail: 10 }),
      K({ x: -16, nod: 42, lean: -6, phase: 0.75, stride: 14, tail: 10 }),
      K({ x: -18, nod: 0, lean: 8, lift: 1, tail: 30 }),
    ], 6),
    death: tween([
      K({ lean: 16, lift: 2, nod: -30, tail: 50 }),
      K({ roll: 45, crouch: 0.6, nod: 20, curl: 0.5, tail: 10 }),
      K({ roll: 90, nod: 30, curl: 0.3, tail: 0 }),
    ], 5),
  },
  // Lobo: cabeça baixa, rosnando; morde avançando e, no especial (Derrubar), salta e prende a presa no chão.
  wolf: {
    idle: tween([0, 1, 2].map((k) => K({ lift: k * 0.25, nod: 8 - k * 2, gape: 0.1 + k * 0.08, tail: -38 + k * 2, wag: k - 1 })), 6, true),
    walk: trot(9, (w) => ({ nod: 6 - w * 2, tail: -30 + w * 3, wag: w * 2 })),
    attack: tween([
      K({ crouch: 0.4, nod: 4, gape: 0.2, tail: -40 }),
      K({ crouch: 0.6, lean: -4, x: 2, nod: 10, gape: 0.6, tail: -32 }),
      K({ x: -6, lean: 4, nod: -6, reach: 3, gape: 1, tail: -20, lift: 1 }),
      K({ x: -5, lean: 2, nod: 6, reach: 2, gape: 0.05, tail: -26 }),
      K({ crouch: 0.2, nod: 6, gape: 0.15, tail: -36 }),
    ], 6),
    special: tween([
      K({ crouch: 0.8, x: 3, nod: 8, gape: 0.4, tail: -45 }),
      K({ lift: 8, x: -6, lean: 22, pounce: 0.8, nod: -10, gape: 0.9, reach: 2, tail: -10 }),
      K({ lift: 2, x: -11, lean: -12, pounce: 0.6, nod: 18, gape: 0.6, reach: 3, tail: -18 }),
      K({ crouch: 0.3, x: -10, lean: -6, nod: 14, gape: 1, reach: 2, tail: -26 }),
    ], 6),
    death: tween([
      K({ lean: 14, lift: 2, nod: -16, gape: 0.8, tail: -15 }),
      K({ roll: 45, crouch: 0.6, nod: 10, gape: 0.4, curl: 0.4, tail: -40 }),
      K({ roll: 90, nod: 12, gape: 0.3, curl: 0.25, tail: -70 }),
    ], 5),
  },
  // Pantera: rente ao chão, a cauda em S; o golpe é uma patada com mordida e o especial, o bote saindo da fumaça.
  panther: {
    idle: tween([0, 1, 2].map((k) => K({ crouch: 0.2, lift: k * 0.2, nod: 4 - k, tail: -14 + k * 4, wag: k * 1.5 - 1.5, smoke: 0.05 * k })), 6, true),
    walk: trot(10, (w) => ({ crouch: 0.3, nod: 4 - w * 2, tail: -12 + w * 4, wag: w * 2.5 })),
    attack: tween([
      K({ crouch: 0.5, nod: 6, gape: 0.3, tail: -10 }),
      K({ crouch: 0.2, lean: 10, lift: 2, pounce: 0.55, nod: -4, gape: 0.8, tail: -4 }),
      K({ x: -5, lean: -6, pounce: 0.3, nod: 12, reach: 2, gape: 1, tail: -18 }),
      K({ crouch: 0.4, x: -3, nod: 6, gape: 0.15, tail: -12 }),
    ], 6),
    special: tween([
      K({ crouch: 0.9, smoke: 1, nod: 8, tail: -20 }),
      K({ crouch: 0.6, smoke: 0.7, x: 2, nod: 4, gape: 0.5, tail: -16 }),
      K({ lift: 9, x: -9, lean: 16, pounce: 0.95, nod: -6, gape: 1, smoke: 0.35, tail: 0 }),
      K({ x: -15, lean: -10, pounce: 0.4, crouch: 0.4, nod: 12, gape: 0.7, smoke: 0.1, tail: -14 }),
    ], 6),
    death: tween([
      K({ lean: 12, lift: 2, nod: -14, gape: 0.9, smoke: 0.3, tail: 4 }),
      K({ roll: 45, crouch: 0.6, nod: 8, curl: 0.4, smoke: 0.6, tail: -30 }),
      K({ roll: 90, nod: 10, curl: 0.2, smoke: 0.9, tail: -50 }),
    ], 5),
  },
  // Centauro: o arco sempre na mão; o golpe é atirar (puxa e solta), o especial a chuva de flechas (mira alto) e a
  // 2ª habilidade, o coice (empina a frente e chuta para trás).
  centaur: {
    idle: tween([0, 1, 2].map((k) => K({ breath: k, torso: -2 + k, tail: -62 + k * 3, wag: k - 1, draw: 0.05, nod: 0 })), 6, true),
    walk: trot(11, (w) => ({ torso: w * 1.5, tail: -55 + w * 4, wag: w * 2, draw: 0.05 })),
    attack: tween([
      K({ draw: 0.2, aim: 0, torso: 2 }),
      K({ draw: 1, aim: 4, torso: -6, breath: 2 }),
      K({ draw: 1, aim: 3, torso: -6, breath: 2 }),
      K({ draw: 0, aim: 2, torso: 4, x: 1 }),
      K({ draw: 0.1, aim: 0, torso: 0 }),
    ], 6),
    special: tween([
      K({ draw: 0.3, aim: 20, torso: -6 }),
      K({ draw: 1, aim: 42, torso: -14, breath: 2, rear: 4 }),
      K({ draw: 0, aim: 46, torso: -10, rear: 2 }),
      K({ draw: 0.2, aim: 10, torso: 0 }),
    ], 6),
    skill: tween([
      K({ draw: 0.05, torso: 4, lean: -4, crouch: 0.2 }),
      K({ draw: 0.05, torso: 14, lean: -14, kick: 1, tail: -10 }),
      K({ draw: 0.05, torso: 8, lean: -10, kick: 0.6, tail: -30 }),
      K({ draw: 0.05, torso: 0, lean: 0, kick: 0, tail: -60 }),
    ], 6),
    death: tween([
      K({ rear: 18, lift: 2, torso: -18, draw: 0, aim: 30, tail: -20 }),
      K({ roll: 50, crouch: 0.6, torso: 20, curl: 0.4, aim: -20, tail: -50 }),
      K({ roll: 90, torso: 30, curl: 0.2, aim: -40, tail: -80 }),
    ], 5),
  },
};
