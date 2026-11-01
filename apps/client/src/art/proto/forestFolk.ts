import { SCULPT_SIZE, Sculpt, basis, lerp3, render, rot, turn, v3, tween, type Frame, type Look, type Material, type Paint, type V3, type View } from "./sculpt.ts";

/**
 * Bípedes do Bosque Velho esculpidos por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): o Sátiro Flautista, a Dríade
 * Corrompida, o Galhudo, o Espinheiro, o Guardião do Menir e o Urso-coruja. O mesmo esqueleto por ângulos da múmia
 * (quadril, joelho, ombro e cotovelo; o pé mais baixo encosta sozinho no chão), com o corpo de cada um por cima:
 * pernas de bode e cascos, casca de bétula com rachaduras e cabelo de folhas, feixe de gravetos, moita de amora com
 * espinhos, pedras de menir empilhadas com a espiral acesa, e o urso com cabeça de coruja. Olha para a esquerda.
 */

export type FolkKind = "satyr" | "dryad" | "twigling" | "thorn" | "menhir" | "owlbear" | "myconid" | "shade" | "vine" | "tree" | "warden" | "erlking";

// --- Materiais -----------------------------------------------------------------------------------------------------

const M = {
  skin: 0, fur: 1, hoof: 2, horn: 3, eye: 4, dark: 5, leaf: 6, leaf2: 7, wood: 8, pipe: 9, steel: 10,
  bark: 11, crack: 12, rot: 13, hair: 14, hair2: 15, moss: 16, root: 17,
  twig: 18, twigDark: 19, bone: 20,
  bramble: 21, bramble2: 22, thorn: 23, fungus: 24,
  stone: 25, stone2: 26, rune: 27, lichen: 28, ivy: 29,
  bear: 30, bearDark: 31, feather: 32, disc: 33, beak: 34, claw: 35, owlEye: 36, berry: 37, mouth: 38,
  cap: 39, capSpot: 40, gill: 41, stalk: 42, spore: 43, ghost: 44, ghostCloth: 45, vine: 46, vineDark: 47, leafDark: 48,
  plate: 49, plateDark: 50, blade: 51, cloak: 52, barkDark: 53, beard: 54, kingEye: 55, ghostEye: 56, antler: 57,
} as const;

const R = {
  skin: ["#1e0f08", "#3a1e10", "#5a3018", "#7c4624", "#9c6034", "#ba7c48", "#d29c66", "#e8bc8c"],
  fur: ["#0a0503", "#160a05", "#24110a", "#341a0e", "#462412", "#5a3018", "#6e3e20", "#84502a"],
} as const;

function look(kind: FolkKind): Look {
  const m: Material[] = [];
  m[M.skin] = { ramp: R.skin, grain: 0.12, grainSize: 0.7, bump: 0.25, bumpSize: 0.45, lineDepth: 1.1 };
  m[M.fur] = { ramp: R.fur, grain: 0.3, grainSize: 0.45, bump: 0.6, bumpSize: 0.35, speck: 0.06, lineDepth: 1 };
  m[M.hoof] = { ramp: ["#050403", "#0e0b08", "#1c1610", "#2c2218", "#3e3022"], gloss: 0.6, shine: 22, lineDepth: 0.6 };
  m[M.horn] = { ramp: ["#2a2214", "#4a3e28", "#6e6040", "#968660", "#bcae86", "#ddd2ae", "#f4eed6"], gloss: 0.5, shine: 18, bump: 0.3, bumpSize: 0.35, lineDepth: 0.6 };
  m[M.eye] = { ramp: ["#4a1804", "#8a3408", "#d06010", "#ffa020", "#ffe08a"], emit: 0.8 };
  m[M.dark] = { ramp: ["#020101", "#080504", "#100a07", "#1a110c"], bias: -0.2, lineDepth: 0.5 };
  m[M.leaf] = { ramp: ["#1a2a08", "#2c4410", "#40601a", "#567e24", "#6e9a30", "#8cb442", "#acce5e"], grain: 0.2, grainSize: 0.5, lineDepth: 0.5 };
  m[M.leaf2] = { ramp: ["#2a0806", "#4a0e08", "#70180c", "#962a10", "#b8401a", "#d45e26", "#ea8a3a", "#f8b85a"], grain: 0.2, grainSize: 0.5, lineDepth: 0.5 };
  m[M.wood] = { ramp: ["#1a0e06", "#2e1a0c", "#472912", "#623a1a", "#7e4e24", "#9c6632", "#b98244"], gloss: 0.25, shine: 16, grain: 0.18, grainSize: 0.5, lineDepth: 0.5 };
  m[M.pipe] = { ramp: ["#2a1a08", "#4a3010", "#6e4a1a", "#946628", "#b8863a", "#d4a654", "#ecc878"], gloss: 0.4, shine: 18, lineDepth: 0.4 };
  m[M.steel] = { ramp: ["#1c1f24", "#343940", "#525962", "#767e88", "#a0a8b2", "#d0d6dc", "#f4f8fc"], gloss: 1.2, shine: 30, lineDepth: 0.4 };
  m[M.bark] = { ramp: ["#2a2824", "#46433d", "#66625a", "#87827a", "#a8a39a", "#c6c2b8", "#e0ddd4", "#f2f0ea"], grain: 0.14, grainSize: 0.6, bump: 0.3, bumpSize: 0.4, lineDepth: 1 };
  m[M.crack] = { ramp: ["#020202", "#0a0908", "#141210", "#201d1a"], lineDepth: 0.3 };
  m[M.rot] = { ramp: ["#05020a", "#0e0614", "#1a0c22", "#2a1434", "#3c1e48"], gloss: 0.6, shine: 20, bump: 0.6, bumpSize: 0.3, lineDepth: 0.4 };
  m[M.hair] = m[M.leaf2];
  m[M.hair2] = { ramp: ["#3a1004", "#601c06", "#8c300a", "#b84c12", "#dc7020", "#f49c38", "#ffc860"], grain: 0.25, grainSize: 0.4, lineDepth: 0.4 };
  m[M.moss] = { ramp: ["#0e1406", "#1a240a", "#283810", "#364c16", "#46621e", "#5a7a28", "#729436"], grain: 0.3, grainSize: 0.4, bump: 0.5, bumpSize: 0.3, lineDepth: 0.8 };
  m[M.root] = { ramp: ["#120a06", "#24160c", "#382212", "#4e3018", "#664020", "#80542c"], grain: 0.2, grainSize: 0.4, bump: 0.4, bumpSize: 0.3, lineDepth: 0.5 };
  m[M.twig] = { ramp: ["#2a1e10", "#4a3820", "#6e5632", "#927648", "#b49660", "#d0b47c", "#e6d09c", "#f4e6be"], grain: 0.22, grainSize: 0.35, bump: 0.35, bumpSize: 0.3, lineDepth: 0.5 };
  m[M.twigDark] = { ramp: ["#140c06", "#26180c", "#3a2614", "#50361c", "#684826", "#825c32"], grain: 0.2, grainSize: 0.35, bump: 0.35, bumpSize: 0.3, lineDepth: 0.5 };
  m[M.bone] = { ramp: ["#5a5440", "#8a8264", "#b6ae8c", "#dcd4b6", "#f6f0dc"], gloss: 0.3, shine: 16, lineDepth: 0.4 };
  m[M.bramble] = { ramp: ["#141c06", "#24300a", "#3a4a10", "#526618", "#6c8222", "#889e30", "#a8b844", "#c8d460"], grain: 0.3, grainSize: 0.45, bump: 0.7, bumpSize: 0.35, speck: 0.05, lineDepth: 0.7 };
  m[M.bramble2] = { ramp: ["#0c1004", "#182008", "#26320c", "#364612", "#485a1a", "#5c7024"], grain: 0.3, grainSize: 0.45, bump: 0.6, bumpSize: 0.35, lineDepth: 0.7 };
  m[M.thorn] = { ramp: ["#4a4430", "#7a7250", "#a8a074", "#d0ca9e", "#eeeacc", "#fffef0"], gloss: 0.5, shine: 20, lineDepth: 0.3 };
  m[M.fungus] = { ramp: ["#6a6050", "#988e7a", "#c2b9a4", "#e2dac8", "#f6f2e6"], grain: 0.15, grainSize: 0.3, bump: 0.4, bumpSize: 0.25, lineDepth: 0.4 };
  m[M.stone] = { ramp: ["#16181a", "#26292b", "#383c3c", "#4c5050", "#626664", "#7a7e7a", "#949892", "#b0b2aa", "#cccdc4"], grain: 0.22, grainSize: 1.1, bump: 0.55, bumpSize: 0.6, speck: 0.05, lineDepth: 1.3 };
  m[M.stone2] = { ramp: ["#121416", "#202426", "#303436", "#424646", "#565a58", "#6c706c", "#848882"], grain: 0.22, grainSize: 1.1, bump: 0.55, bumpSize: 0.6, speck: 0.05, lineDepth: 1.3 };
  m[M.rune] = { ramp: ["#0a3a36", "#147068", "#24a89a", "#4ad0c0", "#9af0e4", "#e8fffc"], emit: 0.78 };
  m[M.lichen] = { ramp: ["#4a4a18", "#6e6e24", "#949432", "#b8b848", "#d4d468"], grain: 0.3, grainSize: 0.3, bump: 0.5, bumpSize: 0.25, lineDepth: 0.4 };
  m[M.ivy] = { ramp: ["#0a1a08", "#14300e", "#1e4614", "#2a5e1c", "#387826", "#4c9232"], grain: 0.25, grainSize: 0.35, lineDepth: 0.4 };
  m[M.bear] = { ramp: ["#140a04", "#261408", "#3c200e", "#542e14", "#6e3e1a", "#8a5224", "#a66a32", "#c08646"], grain: 0.3, grainSize: 0.45, bump: 0.6, bumpSize: 0.35, speck: 0.06, lineDepth: 1.2 };
  m[M.bearDark] = { ramp: ["#0a0502", "#160c06", "#24140a", "#341e10", "#462a16", "#5a381e"], grain: 0.3, grainSize: 0.45, bump: 0.6, bumpSize: 0.35, lineDepth: 1 };
  m[M.feather] = {
    ramp: ["#2a1c10", "#4a341e", "#6e5232", "#94744a", "#b89664", "#d4b682", "#eacfa2", "#f8e8c8"], grain: 0.15, grainSize: 0.4, lineDepth: 0.8,
    wrap: { width: 1.1, tilt: 0, crease: 0.35, vary: 0.12 },
  };
  m[M.disc] = { ramp: ["#5a4a34", "#86704e", "#ae966c", "#d0b88c", "#e8d4ae", "#f8ecd4", "#fffaf0"], grain: 0.15, grainSize: 0.35, bump: 0.3, bumpSize: 0.3, lineDepth: 0.7 };
  m[M.beak] = { ramp: ["#3a2a04", "#6a4c08", "#9a7010", "#c8961c", "#eabe34", "#fae070", "#fff4b8"], gloss: 0.9, shine: 26, lineDepth: 0.4 };
  m[M.claw] = { ramp: ["#060505", "#121010", "#221e1c", "#36302c", "#5a524a", "#8a8274"], gloss: 0.8, shine: 26, lineDepth: 0.4 };
  m[M.owlEye] = { ramp: ["#3a1402", "#7a3006", "#c05a0a", "#f08a14", "#ffc040", "#fff0b0"], gloss: 1.6, shine: 40, glow: 0.4, lineDepth: 0.4 };
  m[M.berry] = { ramp: ["#140208", "#2a0610", "#460c1a", "#661426", "#8a2036"], gloss: 1, shine: 30, lineDepth: 0.3 };
  m[M.mouth] = { ramp: ["#140406", "#2a080c", "#461014", "#64181c", "#8a2a2a"], lineDepth: 0.4 };
  m[M.cap] = { ramp: ["#1e0604", "#3a0c08", "#5a160c", "#7a2412", "#9a361a", "#b84e26", "#d06a36"], gloss: 0.5, shine: 18, grain: 0.15, grainSize: 0.8, bump: 0.25, bumpSize: 0.6, lineDepth: 0.8 };
  m[M.capSpot] = { ramp: ["#8a8070", "#b0a690", "#d2caae", "#ece6cc", "#fbf8ea"], lineDepth: 0.3 };
  m[M.gill] = { ramp: ["#3a3020", "#5a4c34", "#7a6a4c", "#9a8a68", "#b8a884"], grain: 0.3, grainSize: 0.25, lineDepth: 0.4 };
  m[M.stalk] = { ramp: ["#4a4232", "#6e6450", "#94886e", "#b6aa8e", "#d2c8ac", "#e8e0c8"], grain: 0.18, grainSize: 0.5, bump: 0.3, bumpSize: 0.4, lineDepth: 0.8 };
  m[M.spore] = { ramp: ["#6a7a2a", "#94a83a", "#c0d454", "#e2f080", "#f8ffc0"], emit: 0.62 };
  m[M.ghost] = { ramp: ["#0a2a2c", "#124446", "#1e6264", "#2e8484", "#46a8a2", "#6ecac0", "#a4ead8", "#dcfff2"], gloss: 0.6, shine: 18, glow: 0.22, lineDepth: 0.8 };
  m[M.ghostCloth] = { ramp: ["#06181c", "#0c2a30", "#143e44", "#1e555a", "#2c6e70", "#3e8a88"], glow: 0.14, grain: 0.15, grainSize: 0.7, lineDepth: 0.6 };
  m[M.ghostEye] = { ramp: ["#2a8a80", "#4ad0c0", "#9af0e4", "#e8fffc"], emit: 0.85 };
  m[M.vine] = { ramp: ["#0a1206", "#14200a", "#1e300e", "#2a4214", "#38561a", "#486c22", "#5c842e"], gloss: 0.3, shine: 14, grain: 0.2, grainSize: 0.5, bump: 0.35, bumpSize: 0.35, lineDepth: 0.7 };
  m[M.vineDark] = { ramp: ["#060a04", "#0c1408", "#141e0c", "#1c2a12", "#263818"], grain: 0.2, grainSize: 0.5, lineDepth: 0.6 };
  m[M.leafDark] = { ramp: ["#061008", "#0c1c0e", "#122a14", "#1a3a1c", "#244c24", "#30602e", "#3e7438"], grain: 0.25, grainSize: 0.5, bump: 0.3, bumpSize: 0.4, lineDepth: 0.5 };
  m[M.plate] = { ramp: ["#141a1e", "#242e34", "#36444c", "#4c5e66", "#647a80", "#80989a", "#a2b8b6", "#cadcd6"], gloss: 1, shine: 26, grain: 0.08, lineDepth: 0.7 };
  m[M.plateDark] = { ramp: ["#080a0c", "#10161a", "#1a2228", "#243038", "#30404a"], gloss: 0.8, shine: 24, lineDepth: 0.6 };
  m[M.blade] = { ramp: ["#2a8a80", "#4ad0c0", "#7ae6d8", "#b4f6ec", "#eafffa"], emit: 0.72, lineDepth: 0.3 };
  m[M.cloak] = { ramp: ["#0a0c06", "#141a0c", "#1e2812", "#2a3618", "#36461e", "#445624"], grain: 0.2, grainSize: 0.6, lineDepth: 0.7 };
  m[M.barkDark] = { ramp: ["#0c0806", "#18100a", "#26180e", "#362214", "#482e1a", "#5c3c22", "#704c2c"], grain: 0.22, grainSize: 0.5, bump: 0.55, bumpSize: 0.4, speck: 0.05, lineDepth: 1 };
  m[M.beard] = { ramp: ["#0e1406", "#1a240a", "#283810", "#364c16", "#46621e", "#5a7a28", "#729436"], grain: 0.35, grainSize: 0.3, bump: 0.6, bumpSize: 0.25, lineDepth: 0.6 };
  m[M.antler] = { ramp: ["#2a2216", "#463a28", "#665640", "#88765a", "#a89676", "#c6b694", "#e0d2b2"], gloss: 0.3, shine: 16, bump: 0.35, bumpSize: 0.35, lineDepth: 0.5 };
  m[M.kingEye] = { ramp: ["#1a4a08", "#3a8a10", "#7ad030", "#c4ff70", "#f4ffd0"], emit: 0.85 };
  const outline = kind === "menhir" ? "#0c0d0e" : kind === "owlbear" ? "#0e0804" : "#0e0a06";
  return { materials: m, outline, bounce: { color: "#9ab860", power: 0.35 }, occlusion: 0.6, rim: { color: "#e8f0c0", power: 0.45 } };
}

// --- Pose ------------------------------------------------------------------------------------------------------------

export interface FPose {
  /** Tronco inclina para a frente (graus), corpo para a frente (negativo = esquerda) e para cima. */
  lean?: number;
  x?: number;
  lift?: number;
  /** Pernas: coxa (graus da vertical, positivo = para a frente) e joelho (dobra), de cá e de lá. */
  thigh?: readonly [number, number];
  knee?: readonly [number, number];
  /** Braços: ombro (0 = caído, 90 = para a frente, 180 = para cima) e cotovelo, de cá e de lá; `spread` abre. */
  arm?: readonly [number, number];
  elbow?: readonly [number, number];
  spread?: number;
  /** Cabeça baixa (+) ou erguida (−). */
  nod?: number;
  /** Balanço do que pende (cabelo, folhas, raízes). */
  sway?: number;
  /** Brilho (olhos, runas) de 0 a 1. */
  glow?: number;
  /** Morte: cai para a frente (graus em volta dos pés). */
  fall?: number;
  /** Encolhe (Galhudo disfarçado, Espinheiro enrolado, Guardião parado como menir): 0..1. */
  curl?: number;
  /** Espinhos voando / raízes saindo do chão / anel do pisão: 0..1. */
  burst?: number;
  /** Sátiro: flauta na boca (0..1). */
  pipe?: number;
}

const D2R = Math.PI / 180;
/** Ponto do membro: `len` na direção do ângulo (0 = para baixo, positivo = para a frente, −x). */
const swing = (o: V3, deg: number, len: number, z = 0): V3 => v3.add(o, [-Math.sin(deg * D2R) * len, -Math.cos(deg * D2R) * len, z]);

interface Body {
  /** Coxa, canela, (pé de bode: a 3ª parte), raio das pernas e meia largura do quadril. */
  thigh: number; shin: number; cannon?: number; legR: number; hipW: number;
  /** Tronco: altura até o ombro, raios, ombro (meia largura) e braço (comprimento das duas partes). */
  chest: number; torsoR: V3; shoulder: number; upper: number; fore: number; armR: number;
  /** Altura do pé (o tornozelo fica acima do chão). */
  footH: number;
}

const BODIES: Record<FolkKind, Body> = {
  satyr: { thigh: 9, shin: 8, cannon: 7, legR: 2.6, hipW: 3.6, chest: 15, torsoR: [4, 6.4, 5.6], shoulder: 6.4, upper: 9.5, fore: 9, armR: 1.7, footH: 1.4 },
  dryad: { thigh: 14, shin: 14, legR: 2, hipW: 3, chest: 17, torsoR: [3.4, 6.4, 4.8], shoulder: 5.4, upper: 11, fore: 10.5, armR: 1.3, footH: 1.4 },
  twigling: { thigh: 7.5, shin: 7.5, legR: 1, hipW: 2.8, chest: 11, torsoR: [4, 5.4, 4.6], shoulder: 5, upper: 8, fore: 8.5, armR: 0.9, footH: 1 },
  thorn: { thigh: 9, shin: 9, legR: 2.4, hipW: 4.4, chest: 15, torsoR: [7, 8.6, 7.8], shoulder: 7.6, upper: 10, fore: 10, armR: 2, footH: 1.6 },
  menhir: { thigh: 11, shin: 11, legR: 4.6, hipW: 6.4, chest: 19, torsoR: [7.4, 10.5, 11], shoulder: 12.6, upper: 12, fore: 12, armR: 4.6, footH: 2.6 },
  owlbear: { thigh: 10, shin: 9.5, legR: 5, hipW: 6, chest: 17, torsoR: [10, 11, 10.5], shoulder: 10, upper: 10.5, fore: 10, armR: 4, footH: 2 },
  myconid: { thigh: 5.5, shin: 5.5, legR: 2.4, hipW: 3.2, chest: 11, torsoR: [4.6, 6, 5], shoulder: 5.2, upper: 6.5, fore: 6, armR: 1.6, footH: 1.6 },
  shade: { thigh: 12, shin: 12, legR: 1.6, hipW: 2.6, chest: 15, torsoR: [3, 5.6, 4.2], shoulder: 4.8, upper: 9.5, fore: 9, armR: 1.1, footH: 2.4 },
  vine: { thigh: 6, shin: 6, legR: 3.4, hipW: 3, chest: 14, torsoR: [5, 7.6, 5.6], shoulder: 5.2, upper: 10, fore: 11, armR: 1.4, footH: 1 },
  tree: { thigh: 9, shin: 9, legR: 5.2, hipW: 6, chest: 20, torsoR: [10, 11, 10.5], shoulder: 11, upper: 13, fore: 13, armR: 3.4, footH: 2 },
  warden: { thigh: 12.5, shin: 12.5, legR: 2.1, hipW: 3.2, chest: 16, torsoR: [3.6, 6.4, 5], shoulder: 5.8, upper: 10, fore: 9.5, armR: 1.6, footH: 1.6 },
  erlking: { thigh: 12, shin: 11, cannon: 9, legR: 3.2, hipW: 4.2, chest: 20, torsoR: [5.4, 8.4, 7], shoulder: 8, upper: 13, fore: 12.5, armR: 2.2, footH: 1.6 },
};

/** Pontos de uma perna: quadril, joelho, tornozelo (e o boleto do bode) e o pé. */
function legPts(b: Body, hip: V3, th: number, kn: number, goat: boolean) {
  const knee = swing(hip, th, b.thigh);
  if (!goat) {
    const ankle = swing(knee, th - kn, b.shin);
    return { pts: [hip, knee, ankle], low: ankle[1] };
  }
  // Bode: a canela volta para trás e a quartela desce para a frente até o casco.
  const hock = swing(knee, th - kn - 38, b.shin);
  const fet = swing(hock, th * 0.3 + 14, b.cannon ?? 6);
  return { pts: [hip, knee, hock, fet], low: fet[1] };
}

export function folk(kind: FolkKind, p: FPose = {}): Sculpt {
  const b = BODIES[kind];
  const sc = new Sculpt();
  const goat = kind === "satyr" || kind === "erlking";
  const thigh = p.thigh ?? [4, -4], knee = p.knee ?? [8, 8];
  const curl = p.curl ?? 0, sway = p.sway ?? 0, glow = p.glow ?? 0, burst = p.burst ?? 0;
  // O tornozelo mais baixo fica na altura do pé.
  const probe = [0, 1].map((k) => legPts(b, [0, 0, 0], thigh[k], knee[k], goat).low);
  const hipY = b.footH - Math.min(...probe) + (p.lift ?? 0);
  const fall = p.fall ?? 0;
  sc.push(rot("z", fall), [0, 0, 0], [p.x ?? 0, (fall / 90) * (b.torsoR[2] * 0.8), 0]);
  const hip: V3 = [0, hipY, 0];

  // --- Pernas ---
  [1, -1].forEach((s, k) => {
    const h = v3.add(hip, [0, 0, s * b.hipW]);
    const { pts } = legPts(b, h, thigh[k], knee[k], goat);
    const part = sc.part();
    const end = pts[pts.length - 1];
    if (goat) {
      const legMat = kind === "erlking" ? M.barkDark : M.fur;
      sc.seg(pts[0], pts[1], b.legR + 0.9, b.legR + 0.7, legMat, { part, over: 1 });
      sc.seg(pts[1], pts[2], b.legR * 0.8, b.legR * 0.85, legMat, { part, over: 0.8 });
      sc.cone(pts[2], pts[3], b.legR * 0.55, b.legR * 0.5, legMat, { part });
      // Casco fendido.
      for (const t of [-1, 1]) sc.ell(v3.add(end, [-0.8, -0.6, t * 0.6]), [1.5, 0.9, 0.8], M.hoof, { part });
    } else if (kind === "twigling") {
      // Raízes finas, retorcidas, com dedos de raiz no chão.
      sc.cone(pts[0], pts[1], 1.1, 0.9, M.twig, { part });
      sc.cone(pts[1], pts[2], 0.9, 0.7, M.twig, { part });
      for (const t of [-1, 0, 1]) sc.cone(pts[2], v3.add(pts[2], [-2 + Math.abs(t), -1, t * 1.6]), 0.6, 0.2, M.root, { part });
    } else if (kind === "dryad") {
      sc.seg(pts[0], pts[1], b.legR, b.legR * 1.05, M.bark, { part, over: 0.8 });
      sc.seg(pts[1], pts[2], b.legR * 0.8, b.legR * 0.85, M.bark, { part, over: 0.6 });
      // Pés descalços que viram raiz.
      sc.ell(v3.add(end, [-1.6, -0.8, 0]), [2.6, 1, 1.4], M.bark, { part });
      for (const t of [-1, 0, 1]) sc.cone(v3.add(end, [-2.5, -1, t * 0.8]), v3.add(end, [-5 - t, -1.3, t * 2.4]), 0.5, 0.15, M.root, { part });
      sc.cone(v3.add(end, [1, -1, 0]), v3.add(end, [4.2, -1.3, s * 1.4]), 0.6, 0.15, M.root, { part });
    } else if (kind === "thorn") {
      // Pernas de raiz grossa.
      sc.cone(pts[0], pts[1], b.legR + 0.8, b.legR, M.root, { part });
      sc.cone(pts[1], pts[2], b.legR, b.legR * 0.8, M.root, { part });
      for (const t of [-1, 0, 1]) sc.cone(pts[2], v3.add(pts[2], [-3 + Math.abs(t) * 2, -1.4, t * 2.2]), 1, 0.3, M.root, { part });
    } else if (kind === "menhir") {
      // Blocos de pedra empilhados, com hera.
      sc.ell(lerp3(pts[0], pts[1], 0.5), [b.legR, b.thigh * 0.55, b.legR], M.stone2, { part: sc.part(), axes: basis(v3.sub(pts[0], pts[1]), [1, 0, 0]) });
      sc.ell(lerp3(pts[1], pts[2], 0.5), [b.legR * 0.95, b.shin * 0.55, b.legR * 0.95], M.stone, { part: sc.part(), axes: basis(v3.sub(pts[1], pts[2]), [1, 0, 0]) });
      sc.ell(v3.add(end, [-1, -1.2, 0]), [5, 2, 4.4], M.stone2, { part: sc.part() });
      for (let q = 0; q < 4; q++) sc.ball(v3.add(lerp3(pts[1], pts[2], q / 4), [-b.legR * 0.7, 0, s * b.legR * 0.7 * (q % 2 ? 1 : -1)]), 0.9, M.ivy);
    } else if (kind === "myconid") {
      // Pés de talo, curtos e grossos, com fiapos de micélio no chão.
      sc.cone(pts[0], pts[1], b.legR + 0.4, b.legR, M.stalk, { part });
      sc.cone(pts[1], pts[2], b.legR, b.legR * 1.1, M.stalk, { part });
      for (const t of [-1, 0, 1]) sc.cone(pts[2], v3.add(pts[2], [-1.8 + Math.abs(t), -1.4, t * 1.8]), 0.5, 0.12, M.gill, { part });
    } else if (kind === "shade") {
      // A Sombra Élfica flutua: as pernas somem no manto (só as botas, sem tocar o chão).
      sc.cone(pts[0], pts[1], b.legR + 0.3, b.legR, M.ghostCloth, { part });
      sc.cone(pts[1], pts[2], b.legR, b.legR * 0.7, M.ghost, { part });
    } else if (kind === "vine") {
      // Base de raízes e cipós enroscados (não tem pernas: arrasta-se).
      sc.cone(pts[0], pts[1], b.legR + 0.6, b.legR, M.vine, { part });
      sc.cone(pts[1], pts[2], b.legR, b.legR * 1.2, M.vineDark, { part });
      for (const t of [-1, 0, 1]) sc.limb([pts[2], v3.add(pts[2], [-2 + t, -0.6, t * 2]), v3.add(pts[2], [-4.5 + t * 2, -1, t * 4])], 1, 0.2, M.vine, { part });
    } else if (kind === "tree") {
      // Pernas de tronco grosso que viram raiz no chão.
      sc.cone(pts[0], pts[1], b.legR + 1, b.legR, M.barkDark, { part });
      sc.cone(pts[1], pts[2], b.legR, b.legR * 1.15, M.barkDark, { part });
      for (const t of [-1, 0, 1, 2]) sc.limb([pts[2], v3.add(pts[2], [-2 + t * 1.6, -1.2, (t - 0.5) * 2]), v3.add(pts[2], [-5 + t * 3.4, -1.9, (t - 0.5) * 4.4])], 1.6, 0.3, M.root, { part });
    } else if (kind === "warden") {
      // Grevas de placa élfica e botas escuras.
      sc.seg(pts[0], pts[1], b.legR + 0.4, b.legR + 0.5, M.cloak, { part, over: 0.8 });
      sc.seg(pts[1], pts[2], b.legR, b.legR * 1.05, M.plate, { part, over: 0.6 });
      sc.ball(pts[1], b.legR * 1.1, M.plate, part);
      sc.ell(v3.add(end, [-1.2, -0.8, 0]), [2.4, 1, 1.4], M.plateDark, { part });
    } else {
      // Urso: coxa enorme e o pé de urso com as garras.
      sc.seg(pts[0], pts[1], b.legR + 1.2, b.legR + 1.4, M.bear, { part, over: 1.5 });
      sc.seg(pts[1], pts[2], b.legR, b.legR * 1.05, M.bear, { part, over: 1 });
      sc.ell(v3.add(end, [-2.4, -1, 0]), [4.6, 1.8, 3.2], M.bearDark, { part });
      for (const t of [-1, 0, 1]) sc.cone(v3.add(end, [-6.2, -1.4, t * 1.6]), v3.add(end, [-7.8, -2.3, t * 1.8]), 0.6, 0.15, M.claw, { part });
    }
  });

  // --- Tronco ---
  const lean = (p.lean ?? 8) + curl * (kind === "menhir" ? 0 : 50);
  sc.push(rot("z", lean), hip);
  const at = (x: number, y: number, z = 0): V3 => [hip[0] + x, hip[1] + y, z];
  const tr = b.torsoR;
  const torso = sc.part();
  const neckTop = at(-0.8, b.chest + 4);
  const headAt = (dx: number, dy: number) => v3.add(neckTop, [dx, dy, 0]);

  switch (kind) {
    case "satyr": {
      // Quadril de pelo, tronco nu com a faixa de folhas, a bolsa de quinquilharias.
      sc.ell(at(0.4, 1), [tr[0] + 0.4, 4, tr[2] - 0.6], M.fur, { part: torso });
      const sash: Paint = (x, y, z) => (Math.abs(y + z * 0.75 + x * 0.1) < 1.1 ? M.leaf : -1);
      sc.seg(at(0, 2.5), at(-0.6, b.chest + 2), tr[0], tr[2] - 0.2, M.skin, { part: torso, over: 1.4, up: [0, 0, 1], paint: sash });
      sc.ell(at(-0.6, b.chest - 1.5), [tr[0] + 0.2, 3.6, tr[2]], M.skin, { part: torso, paint: sash });
      sc.ell(at(3.6, 2, -3.6), [1.8, 2.2, 1.4], M.wood, { part: sc.part() });
      for (let k = 0; k < 4; k++) sc.ball(at(-3.6 + k * 0.6, 7 + k * 2.4, 2.8 - k * 1.6), 0.9, k % 2 ? M.leaf : M.leaf2);
      break;
    }
    case "dryad": {
      // Corpo de bétula: casca clara com rachaduras pretas e a podridão saindo do peito.
      const cracks: Paint = (x, y, z) => (Math.abs(Math.sin(y * 1.6 + Math.sin(z * 1.3) * 1.8 + x * 0.4)) < 0.12 ? M.crack : -1);
      sc.seg(at(0, 1), at(-0.4, b.chest), tr[0], tr[2], M.bark, { part: torso, over: 1.6, up: [0, 0, 1], paint: cracks });
      sc.ell(at(-0.6, b.chest - 2), [tr[0] + 0.3, 3.6, tr[2] + 0.4], M.bark, { part: torso, paint: cracks });
      sc.ell(at(-3.4, b.chest - 3.2), [1.4, 2.4, 2.2], M.rot, { part: torso });
      for (const [dx, dy, dz] of [[-3.6, -2, 1.2], [-3.2, -4.6, -0.8], [-3.4, 0.6, -1.6]]) sc.ell(at(dx, b.chest - 3 + dy, dz), [0.6, 1.4, 0.4], M.rot, { part: torso });
      // Vestido de musgo e folhas mortas, solto até o joelho, com a barra esfarrapada de folhas.
      const hem = -b.thigh * 0.85;
      sc.cone(at(0, 3), at(0.8 + sway * 0.03, hem), tr[2] - 0.8, tr[2] + 1.2, M.moss);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        sc.ell(at(Math.cos(a) * (tr[2] + 0.8) + 0.8, hem - 0.6 - (k % 3) * 0.8, Math.sin(a) * (tr[2] + 1.2)), [1.2, 2, 0.5], k % 3 ? M.moss : M.leaf2, { axes: basis([Math.cos(a), 0.2, Math.sin(a)], [0, 1, 0]) });
      }
      break;
    }
    case "twigling": {
      // Feixe de gravetos secos cruzados, amarrados por raízes, com um crânio de passarinho preso.
      const sticks: [V3, V3, number][] = [
        [[-2, -1, -2.4], [1.5, 13, 2], M.twig], [[2, -1, 2.4], [-2.4, 12.5, -2], M.twig], [[-3, 0, 1.6], [2.6, 12, 1.2], M.twigDark],
        [[3, 1, -1], [-1.4, 13.5, -2.8], M.twigDark], [[0, -1.5, 3], [0.5, 13, -3], M.twig], [[-1, 0, -3.2], [-0.5, 12, 3.4], M.twig],
        [[3.4, 3, 0], [-3.6, 9, 0], M.twigDark], [[-3.4, 5, 2.4], [3.4, 8, -2.4], M.twig],
      ];
      for (const [a, c, mat] of sticks) sc.cone(at(...(a as [number, number, number])), at(...(c as [number, number, number])), 0.75, 0.55, mat, { part: torso });
      for (const y of [3.5, 8.5]) for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        sc.ball(at(Math.cos(a) * 2.6, y + Math.sin(a * 2) * 0.4, Math.sin(a) * 2.8), 0.55, M.root, torso);
      }
      sc.ell(at(-2.6, 6.5, 1.8), [1.4, 1.1, 1], M.bone);
      sc.ell(at(-3.6, 6.2, 1.8), [1, 0.4, 0.5], M.bone);
      sc.ball(at(-2.8, 6.8, 2.7), 0.35, M.dark);
      // Folhas mortas presas.
      for (const [x, y, z] of [[1.5, 10, 3], [-1, 3, -3.2], [2.5, 5, -2]]) sc.ell(at(x, y, z), [1.4, 0.8, 0.3], M.leaf2, { axes: basis([1, 0.6, 0.3]) });
      break;
    }
    case "thorn": {
      // Moita de amora curvada: tufos de ramos emaranhados.
      const tufts: [number, number, number, number][] = [];
      for (let k = 0; k < 16; k++) {
        const a = k * 2.399, y = 1 + (k / 16) * (b.chest + 2);
        const r = tr[2] * (0.7 + 0.35 * Math.sin((k / 16) * Math.PI));
        tufts.push([Math.cos(a) * r * 0.55, y, Math.sin(a) * r * 0.75, 3.4 + (k % 3) * 0.8]);
      }
      sc.ell(at(0.6, b.chest * 0.55), [tr[0], tr[1], tr[2]], M.bramble2, { part: torso });
      tufts.forEach(([x, y, z, r], k) => sc.ball(at(x, y, z), r, k % 3 ? M.bramble : M.bramble2, torso));
      // Ramos soltos enroscados por fora.
      for (let k = 0; k < 7; k++) {
        const a = k * 1.7, y = 3 + k * 2.2;
        sc.cone(at(Math.cos(a) * 6, y, Math.sin(a) * 7), at(Math.cos(a + 1.4) * 7, y + 3, Math.sin(a + 1.4) * 7.6), 0.45, 0.35, M.root, { part: torso });
      }
      // Espinhos longos nas costas, prontos para sair (e que voam na explosão).
      for (let k = 0; k < 13; k++) {
        const a = -1.2 + (k / 12) * 2.4, y = 4 + (k % 5) * 3;
        const dir = v3.norm([Math.cos(a) * 0.9 + 0.5, 0.45 + (k % 3) * 0.2, Math.sin(a)]);
        const base = at(dir[0] * 6, y, dir[2] * 7);
        const len = 4.5 + (k % 4) * 0.8 + burst * 6;
        const out = v3.add(base, v3.mul(dir, burst * 3));
        sc.cone(out, v3.add(out, v3.mul(dir, len)), 0.75, 0.08, M.thorn);
      }
      // Fungo claro nos ombros e frutos escuros.
      sc.ell(at(-1, b.chest + 1.6, 4), [2.4, 1, 1.8], M.fungus);
      sc.ell(at(0.5, b.chest + 0.6, -4.6), [1.8, 0.8, 1.4], M.fungus);
      for (const [x, y, z] of [[-6, 9, 3], [-5, 13, -3], [-6.5, 5, -1]]) sc.ball(at(x, y, z), 0.8, M.berry);
      // Raízes arrastando atrás, como um manto.
      break;
    }
    case "menhir": {
      // Laje larga de pé (o tronco), com musgo e líquen nas frestas e a espiral acesa no peito.
      const spiral: Paint = (x, y, z) => {
        if (x > -tr[0] * 0.4) return -1;
        const r = Math.hypot(y - 1, z), a = Math.atan2(y - 1, z) / (Math.PI * 2);
        return r < 8.6 && ((r / 2.4 - a + 10) % 1) < 0.3 ? M.rune : -1;
      };
      sc.ell(at(0, 4), [tr[0] * 0.85, 5, tr[2] * 0.75], M.stone2, { part: sc.part() });
      sc.ell(at(-0.4, b.chest * 0.62), [tr[0], tr[1], tr[2]], M.stone, { part: sc.part(), paint: spiral });
      for (const [x, y, z] of [[-6, 14, 7], [-5, 8, -8], [-6.4, 18, -3], [-2, 20, 8]]) sc.ell(at(x, y, z), [1.4, 1, 1.6], M.lichen);
      for (const [x, y, z] of [[-4.5, 4, 6], [-5, 5, -4], [3, 22, -6]]) sc.ell(at(x, y, z), [2, 1, 2.6], M.moss);
      break;
    }
    case "myconid": {
      // Talo grosso e pálido, com anéis de pele (o véu) caindo.
      sc.seg(at(0, 0), at(-0.4, b.chest + 1), tr[0], tr[2], M.stalk, { part: torso, over: 1.6, up: [0, 0, 1] });
      for (const y of [4, 9]) sc.ell(at(-0.2, y), [tr[0] + 0.8, 0.8, tr[2] + 0.8], M.gill, { part: torso });
      for (const [x, y, z] of [[-4.4, 6, 2], [-4, 11, -2.4], [3.6, 7, 3]]) sc.ell(at(x, y, z), [0.9, 1.2, 0.8], M.capSpot);
      break;
    }
    case "shade": {
      // Manto élfico rasgado que flutua, a túnica e o capuz caído nas costas.
      sc.seg(at(0, 1), at(-0.3, b.chest), tr[0], tr[2], M.ghost, { part: torso, over: 1.4, up: [0, 0, 1] });
      sc.cone(at(0.5, 4), at(1.4 + sway * 0.04, -hipY + 3), tr[2] - 0.4, tr[2] + 2.2, M.ghostCloth);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        sc.ell(at(Math.cos(a) * (tr[2] + 1.6) + 1.4, -hipY + 2.6 - (k % 3) * 0.8, Math.sin(a) * (tr[2] + 1.8)), [1, 2, 0.4], M.ghostCloth, { axes: basis([Math.cos(a), 0.2, Math.sin(a)], [0, 1, 0]) });
      }
      // Aljava de luz nas costas.
      sc.cone(at(3.2, 7, -2), at(4.6, 16, -2.6), 1.2, 1.3, M.ghostCloth, { part: sc.part() });
      for (const dz of [-0.6, 0.6]) sc.cone(at(4.6, 16, -2.6 + dz), at(5.2, 19, -2.6 + dz), 0.2, 0.2, M.blade);
      break;
    }
    case "vine": {
      // Feixe de cipós torcidos em espiral, com folhas escuras e espinhos.
      for (let k = 0; k < 7; k++) {
        const a0 = (k / 7) * Math.PI * 2;
        const pts: V3[] = [];
        for (let q = 0; q <= 6; q++) {
          const a = a0 + q * 0.6, y = q * (b.chest + 2) / 6;
          pts.push(at(Math.cos(a) * (tr[0] - 1 - q * 0.2), y, Math.sin(a) * (tr[2] - 1.2 - q * 0.2)));
        }
        sc.limb(pts, 1.8, 1.1, k % 2 ? M.vine : M.vineDark, { part: torso });
      }
      for (let k = 0; k < 10; k++) {
        const a = k * 2.4, y = 2 + k * 1.5;
        sc.ell(at(Math.cos(a) * tr[0], y, Math.sin(a) * tr[2]), [1.8, 0.5, 1.1], M.leafDark, { axes: basis([Math.cos(a), 0.5, Math.sin(a)]) });
      }
      break;
    }
    case "tree": {
      // Tronco largo de casca funda, com o musgo e a copa de folhas por cima (e um ninho de passarinho).
      const bark: Paint = (x, y, z) => (Math.abs(Math.sin(z * 1.4 + y * 0.12)) < 0.2 ? M.root : -1);
      sc.seg(at(0, -1), at(-0.2, b.chest + 2), tr[0], tr[2], M.barkDark, { part: torso, over: 2, up: [0, 0, 1], paint: bark });
      sc.ell(at(0, 2), [tr[0] + 1.4, 4, tr[2] + 1.4], M.barkDark, { part: torso });
      for (const [x, y, z] of [[-6, 10, 4], [-5.6, 15, -5], [5, 6, 6]]) sc.ell(at(x, y, z), [1.6, 2.4, 1.6], M.moss);
      const crown = sc.part();
      for (let k = 0; k < 26; k++) {
        const a = k * 2.399, r = 4 + (k % 5) * 2.4;
        sc.ball(at(Math.cos(a) * r + 2, b.chest + 9 + Math.sin(k * 1.3) * 4 - (k % 5) * 0.8, Math.sin(a) * r * 1.1), 5.4 - (k % 3) * 0.7, k % 4 ? M.leafDark : M.leaf, crown);
      }
      break;
    }
    case "warden": {
      // Couraça élfica de placas finas, a capa escura e o cinto.
      sc.ell(at(0.4, 1.4), [tr[0] + 0.6, 3.4, tr[2] + 0.2], M.cloak, { part: torso });
      sc.seg(at(0, 2.5), at(-0.4, b.chest + 1), tr[0], tr[2], M.plate, { part: torso, over: 1.4, up: [0, 0, 1] });
      for (const y of [6, 9, 12]) sc.ell(at(-0.4, y), [tr[0] + 0.4, 0.6, tr[2] + 0.3], M.plateDark, { part: torso });
      sc.cone(at(2.6, b.chest + 1), at(5 + sway * 0.05, -hipY + 5), 2.6, 5.4, M.cloak);
      // Ombreiras em folha.
      for (const s of [1, -1]) sc.ell(at(0, b.chest + 0.8, s * (tr[2] + 0.6)), [3.4, 1.6, 2.6], M.plate, { axes: basis([1, 0.3, 0]) });
      break;
    }
    case "erlking": {
      // Peito de casca escura com o musgo descendo, o manto de folhas mortas caindo das costas.
      sc.ell(at(0.4, 1.4), [tr[0] + 0.8, 4, tr[2] + 0.4], M.fur, { part: torso });
      sc.seg(at(0, 2), at(-0.5, b.chest + 1), tr[0], tr[2], M.barkDark, { part: torso, over: 1.6, up: [0, 0, 1] });
      for (const [x, y, z] of [[-5, 13, 2.4], [-4.6, 9, -2.8], [-5.2, 16, -1]]) sc.ell(at(x, y, z), [1, 2, 1.6], M.moss);
      const cloak = sc.part();
      for (let k = 0; k < 26; k++) {
        const t = k / 26, a = -1.2 + (k % 7) * 0.4;
        sc.ell(at(4 + t * 2 + sway * 0.05 * t * 10, b.chest + 1 - t * (b.chest + hipY - 3), Math.sin(a) * (tr[2] + 1)), [1.8, 2.6, 0.6], k % 3 ? M.leaf2 : M.cloak, { part: cloak, axes: basis([0.4, 1, Math.sin(a)]) });
      }
      break;
    }
    case "owlbear": {
      // Barriga e peito de urso, o peito de penas barradas (claro, em faixas).
      sc.ell(at(0.5, 3.5), [tr[0], 7, tr[2]], M.bear, { part: torso });
      sc.seg(at(0.4, 4), at(-0.5, b.chest), tr[0], tr[2], M.bear, { part: torso, over: 3, up: [0, 0, 1] });
      sc.ell(at(-5.6, b.chest * 0.6), [4.2, 9, 7.6], M.feather, { part: torso, axes: [[0, 1, 0], [-1, 0, 0], [0, 0, 1]] });
      // Corcova de pelo escuro atrás dos ombros.
      sc.ell(at(4, b.chest + 1), [6, 5, 8.6], M.bearDark, { part: torso });
      break;
    }
  }

  // --- Cabeça ---
  sc.push(rot("z", -(p.nod ?? 0)), neckTop);
  head(sc, kind, neckTop, headAt, p, glow, sway, curl);
  sc.pop();

  // --- Braços ---
  const arm = p.arm ?? [20, 14], elbow = p.elbow ?? [20, 24], spread = p.spread ?? 0;
  [1, -1].forEach((s, k) => {
    const sh = at(0.4, b.chest - (kind === "menhir" ? 2 : 0.8), s * b.shoulder);
    const out = s * (0.1 + spread);
    const el = swing(sh, arm[k], b.upper, out * b.upper);
    const wr = swing(el, arm[k] + elbow[k], b.fore, out * b.fore * 0.5);
    const fd = v3.norm(v3.sub(wr, el));
    const part = sc.part();
    armBody(sc, kind, sh, el, wr, fd, part, s, k, p);
  });
  sc.pop();

  // Efeitos no chão (fora do tronco): o anel de rachaduras do pisão rúnico e as raízes que prendem.
  if (burst > 0.05 && kind === "menhir") {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2, r = 8 + burst * 14;
      sc.ell([Math.cos(a) * r - 4, 0.2, Math.sin(a) * r], [2.4, 0.4, 0.8], M.rune, { axes: basis([-Math.sin(a), 0, Math.cos(a)]) });
    }
  }
  if (burst > 0.05 && kind === "erlking") {
    // Fúria da Mata: raízes e espinhos levantam do chão num anel em volta dele.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, r = 10 + burst * 6, h = burst * (7 + (k % 3) * 3);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      sc.limb([[x, -1, z], [x * 0.95, h * 0.5, z * 0.95], [x * 0.85, h, z * 0.85]], 1.4, 0.2, k % 2 ? M.root : M.vine);
    }
  }
  if (burst > 0.05 && kind === "dryad") {
    for (let k = 0; k < 6; k++) {
      const z = -6 + k * 2.4, x = -18 - (k % 2) * 3;
      const h = burst * (6 + (k % 3) * 2.5);
      sc.limb([[x, -1, z], [x - 1.2, h * 0.5, z + 0.8], [x + 0.8, h, z - 0.6], [x + 2.2, h * 0.8, z]], 1.3, 0.25, M.root);
    }
  }
  sc.pop();
  return sc;
}

/** Cabeça de cada um (já no espaço do pescoço inclinado). */
function head(sc: Sculpt, kind: FolkKind, neck: V3, at: (dx: number, dy: number) => V3, p: FPose, glow: number, sway: number, curl: number) {
  const eyes = (c: V3, dx: number, dy: number, dz: number, r: number) => { for (const s of [1, -1]) sc.ball(v3.add(c, [dx, dy, s * dz]), r + glow * 0.3, M.eye); };
  switch (kind) {
    case "satyr": {
      sc.cone(v3.add(neck, [0.6, -3.4, 0]), v3.add(neck, [0, 0.4, 0]), 2.1, 1.9, M.skin);
      const hc = at(-0.8, 2.6), hp = sc.part();
      sc.ell(hc, [3.2, 3.4, 3], M.skin, { part: hp });
      // Focinho estreito, nariz, barba pontuda de bode e o sorriso.
      sc.cone(v3.add(hc, [-2, -0.6, 0]), v3.add(hc, [-3.8, -1.2, 0]), 1.6, 1.1, M.skin, { part: hp });
      sc.ball(v3.add(hc, [-4, -0.9, 0]), 0.7, M.dark, hp);
      sc.cone(v3.add(hc, [-2.2, -2.6, 0]), v3.add(hc, [-1.6, -6.4, 0]), 1.6, 0.4, M.fur, { part: hp });
      sc.ell(v3.add(hc, [-3, -1.9, 0]), [0.9, 0.3, 1.2], M.mouth, { part: hp });
      eyes(hc, -2.2, 0.7, 1.4, 0.55);
      sc.ell(v3.add(hc, [0.8, 2.2, 0]), [3, 1.8, 3.2], M.fur, { part: hp });
      // Orelhas de bode e os chifres de carneiro em espiral.
      for (const s of [1, -1]) {
        sc.ell(v3.add(hc, [1.4, 0.4, s * 3.4]), [1.8, 0.6, 1], M.skin, { axes: basis([0.4, -0.2, s]) });
        const horn = sc.part();
        let q = v3.add(hc, [0, 2.4, s * 1.8]);
        for (let k = 0; k < 9; k++) {
          const a = k * 0.62, r = 2.6 - k * 0.12;
          const next = v3.add(v3.add(hc, [1.2, 2.2, s * (2.8 + k * 0.18)]), [Math.cos(a + 2.4) * r * 1.2, Math.sin(a + 2.4) * r * 1.3 + 0.5, 0]);
          sc.cone(q, next, 1.15 - k * 0.07, 1.08 - k * 0.07, M.horn, { part: horn, band: { n: 1, depth: 0.25 } });
          q = next;
        }
      }
      break;
    }
    case "dryad": {
      sc.cone(v3.add(neck, [0.4, -3.6, 0]), v3.add(neck, [0, 0.6, 0]), 1.3, 1.1, M.bark);
      const hc = at(-0.6, 3.2), hp = sc.part();
      sc.ell(hc, [2.8, 3.6, 2.6], M.bark, { part: hp, axes: basis([0.15, 1, 0], [-1, 0, 0]) });
      sc.ell(v3.add(hc, [-1.6, -2.2, 0]), [1.4, 1.3, 1.6], M.bark, { part: hp });
      // Olhos vazios de âmbar e a boca escura.
      sc.ell(v3.add(hc, [-2.3, 0.3, 0]), [0.8, 0.8, 2.3], M.dark, { part: hp });
      eyes(hc, -2.8, 0.3, 1.1, 0.5);
      sc.ell(v3.add(hc, [-2.6, -2, 0]), [0.4, 0.3, 0.8], M.dark, { part: hp });
      // Cabelo de folhas de outono, comprido, caindo nas costas, com galhinhos.
      const hair = sc.part();
      for (let k = 0; k < 34; k++) {
        const t = k / 34, a = k * 2.399;
        const y = 4 - t * 16, back = 1.8 + t * 3.8 + Math.sin(a) * 1.2 + sway * 0.04 * t * 10;
        const z = Math.cos(a) * (2.6 + t * 1.6);
        sc.ell(v3.add(hc, [back, y, z]), [1.5, 1.1, 0.5], k % 4 === 0 ? M.leaf2 : M.hair2, { part: hair, axes: basis([Math.cos(a) * 0.5, 1, Math.sin(a)]) });
      }
      sc.ell(v3.add(hc, [0.8, 1.6, 0]), [3.4, 3, 3.2], M.hair2, { part: hair });
      for (const s of [1, -1]) sc.limb([v3.add(hc, [0, 3.2, s * 1.4]), v3.add(hc, [0.8, 6, s * 2.6]), v3.add(hc, [2.6, 7.4, s * 3.8])], 0.45, 0.15, M.root);
      break;
    }
    case "twigling": {
      sc.cone(v3.add(neck, [0.4, -3.6, 0]), v3.add(neck, [0, 0.4, 0]), 0.9, 0.8, M.twig);
      const hc = at(-1.2, 2.4 - curl * 3), hp = sc.part();
      // Nó de casca com a cara afundada e os dois olhos de brasa no fundo.
      sc.ell(hc, [3.2, 3, 3], M.twig, { part: hp });
      sc.ell(v3.add(hc, [-2.2, 0, 0]), [1, 1.2, 2.2], M.dark, { part: hp });
      eyes(hc, -2.6, 0.2, 1, 0.55);
      sc.ell(v3.add(hc, [-2.4, -1.8, 0]), [0.6, 0.5, 1.2], M.dark, { part: hp });
      // Gravetos espetados para cima e para trás, e uma folha seca.
      for (const [dx, dy, dz, l] of [[0, 1, 0, 5], [1, 1, 1.4, 4], [1, 0.6, -1.5, 4.4], [1.5, 0.3, 0, 5]] as const) {
        const d = v3.norm([dx, dy, dz]);
        sc.cone(v3.add(hc, v3.mul(d, 2.4)), v3.add(hc, v3.mul(d, 2.4 + l)), 0.5, 0.2, M.twig);
      }
      sc.ell(v3.add(hc, [3, 5, 1]), [1.6, 0.9, 0.3], M.leaf2, { axes: basis([1, 0.4, 0.2]) });
      break;
    }
    case "thorn": {
      // Cabeça curvada para a frente: um tufo mais escuro, o oco da boca e os olhos verde-amarelos.
      const hc = at(-3.6, -0.8), hp = sc.part();
      sc.ell(hc, [4.4, 3.8, 4.2], M.bramble2, { part: hp });
      sc.ell(v3.add(hc, [-3.4, -1.4, 0]), [1, 1.2, 1.6], M.dark, { part: hp });
      for (const s of [1, -1]) sc.ball(v3.add(hc, [-3.6, 0.9, s * 1.6]), 0.75 + glow * 0.3, M.rune);
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3;
        sc.cone(v3.add(hc, [Math.cos(a) * 2, 3, Math.sin(a) * 3]), v3.add(hc, [Math.cos(a) * 3 + 1.5, 5.6, Math.sin(a) * 4]), 0.5, 0.06, M.thorn);
      }
      break;
    }
    case "menhir": {
      // Bloco sem rosto, só a espiral acesa.
      const hc = at(-0.6, 4.6), hp = sc.part();
      const spiral: Paint = (x, y, z) => {
        if (x > -2.6) return -1;
        const r = Math.hypot(y, z), a = Math.atan2(y, z) / (Math.PI * 2);
        return r < 3.4 && ((r / 1.3 - a + 10) % 1) < 0.28 ? M.rune : -1;
      };
      sc.ell(hc, [4.4, 5.2, 5.4], M.stone, { part: hp, paint: spiral });
      sc.ell(v3.add(hc, [0.6, 4.6, 0.6]), [1.6, 0.8, 2.2], M.moss, { part: hp });
      sc.ell(v3.add(hc, [-2, 3.8, -3]), [1, 0.6, 1], M.lichen, { part: hp });
      break;
    }
    case "myconid": {
      // O chapéu: largo, vermelho-ferrugem com pintas claras, as lamelas por baixo e os olhinhos escuros no talo.
      const hc = at(0, 1), hp = sc.part();
      sc.ell(v3.add(hc, [0.2, -1, 0]), [3.6, 3.4, 3.6], M.stalk, { part: hp });
      for (const s of [1, -1]) sc.ball(v3.add(hc, [-3.2, -0.6, s * 1.4]), 0.6 + glow * 0.3, M.spore);
      sc.ell(v3.add(hc, [-3.2, -2.2, 0]), [0.4, 0.4, 1], M.dark, { part: hp });
      const cap = sc.part();
      sc.ell(v3.add(hc, [0.4, 3.6, 0]), [9, 3.6, 9], M.cap, { part: cap, paint: (x, y, z) => (y > 0.4 && Math.sin(x * 1.1) * Math.sin(z * 1.1 + 0.7) > 0.72 ? M.capSpot : -1) });
      sc.ell(v3.add(hc, [0.4, 2.2, 0]), [8.2, 1.2, 8.2], M.gill, { part: cap });
      break;
    }
    case "shade": {
      // Rosto élfico vazio e pálido de luz, o capuz e as orelhas compridas; os olhos acesos.
      sc.cone(v3.add(neck, [0.4, -3.6, 0]), v3.add(neck, [0, 0.4, 0]), 1.2, 1.1, M.ghost);
      const hc = at(-0.6, 2.6), hp = sc.part();
      sc.ell(hc, [2.6, 3.2, 2.4], M.ghost, { part: hp, axes: basis([0.1, 1, 0], [-1, 0, 0]) });
      for (const s of [1, -1]) {
        sc.ball(v3.add(hc, [-2.2, 0.4, s * 0.9]), 0.45 + glow * 0.2, M.ghostEye);
        sc.cone(v3.add(hc, [0.6, 0.6, s * 2]), v3.add(hc, [3, 3, s * 3.2]), 0.7, 0.1, M.ghost);
      }
      sc.ell(v3.add(hc, [1.2, 1.2, 0]), [3.2, 3.4, 3], M.ghostCloth, { part: hp });
      for (let k = 0; k < 5; k++) sc.ell(v3.add(hc, [2.6 + k * 0.4, -1 - k * 2, (k % 2 ? 1 : -1) * 0.8]), [0.8, 2, 1.6], M.ghost);
      break;
    }
    case "vine": {
      // Botão fechado de pétalas escuras com espinhos e um olho verde lá dentro.
      const hc = at(-1.4, 1.6 - curl * 2), hp = sc.part();
      sc.ell(hc, [3.6, 4, 3.4], M.vineDark, { part: hp, axes: basis([0.3, 1, 0]) });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        sc.ell(v3.add(hc, [Math.cos(a) * 1.6, 1.4, Math.sin(a) * 1.6]), [1.4, 3.6, 0.6], M.leafDark, { part: hp, axes: basis([Math.cos(a) * 0.4, 1, Math.sin(a) * 0.4]) });
      }
      sc.ball(v3.add(hc, [-3.2, 0, 0]), 0.9 + glow * 0.3, M.kingEye);
      for (let k = 0; k < 5; k++) sc.cone(v3.add(hc, [Math.cos(k) * 2, -1 + k, Math.sin(k * 2) * 2.4]), v3.add(hc, [Math.cos(k) * 4, -0.4 + k, Math.sin(k * 2) * 4]), 0.4, 0.06, M.thorn);
      break;
    }
    case "tree": {
      // A cara cavada na casca: dois buracos com brasa âmbar no fundo e a boca torta.
      const hc = at(-2.4, -6), hp = sc.part();
      for (const s of [1, -1]) {
        sc.ell(v3.add(hc, [-4.8, 0, s * 2.6]), [1, 1.4, 1.3], M.dark, { part: hp });
        sc.ball(v3.add(hc, [-5.2, 0, s * 2.6]), 0.55 + glow * 0.3, M.eye);
      }
      sc.ell(v3.add(hc, [-5, -4, 0]), [1, 0.9, 2.6], M.dark, { part: hp });
      break;
    }
    case "warden": {
      // Elmo élfico de crista alta e viseira, com os olhos frios acesos lá dentro.
      sc.cone(v3.add(neck, [0.4, -3.6, 0]), v3.add(neck, [0, 0.4, 0]), 1.4, 1.3, M.plateDark);
      const hc = at(-0.6, 2.8), hp = sc.part();
      sc.ell(hc, [3, 3.4, 2.8], M.plate, { part: hp });
      sc.ell(v3.add(hc, [-2.2, 0.2, 0]), [0.8, 0.7, 2.2], M.dark, { part: hp });
      for (const s of [1, -1]) sc.ball(v3.add(hc, [-2.6, 0.2, s * 1]), 0.5 + glow * 0.2, M.ghostEye);
      sc.limb([v3.add(hc, [-1.4, 2.6, 0]), v3.add(hc, [1.6, 5, 0]), v3.add(hc, [5, 4.6 + sway * 0.04, 0]), v3.add(hc, [7.4, 2.4, 0])], 1, 0.3, M.plate);
      for (const s of [1, -1]) sc.cone(v3.add(hc, [0.6, 1.6, s * 2.4]), v3.add(hc, [3.6, 4.6, s * 3.6]), 0.7, 0.1, M.plate);
      break;
    }
    case "erlking": {
      // Cabeça comprida de casca, barba de musgo, olhos verdes e a galhada enorme de cervo.
      sc.cone(v3.add(neck, [0.4, -3.6, 0]), v3.add(neck, [0, 0.4, 0]), 2.2, 2, M.barkDark);
      const hc = at(-0.8, 3.4), hp = sc.part();
      sc.ell(hc, [3.6, 4.2, 3.2], M.barkDark, { part: hp, axes: basis([0.15, 1, 0], [-1, 0, 0]) });
      sc.cone(v3.add(hc, [-2.4, -0.6, 0]), v3.add(hc, [-4.2, -2.4, 0]), 1.4, 0.8, M.barkDark, { part: hp });
      for (const s of [1, -1]) sc.ball(v3.add(hc, [-3, 1, s * 1.3]), 0.6 + glow * 0.3, M.kingEye);
      sc.ell(v3.add(hc, [-3.2, 1.8, 0]), [1, 0.5, 2.6], M.dark, { part: hp });
      const beard = sc.part();
      for (let k = 0; k < 7; k++) sc.ell(v3.add(hc, [-2.6 + k * 0.3, -3.4 - k * 1.1, (k % 3 - 1) * 1.2]), [1.4, 1.8, 1.6], M.beard, { part: beard });
      for (const s of [1, -1]) {
        const ant = sc.part();
        const a0 = v3.add(hc, [0.6, 3.4, s * 1.8]);
        const main = [a0, v3.add(a0, [2, 4, s * 4]), v3.add(a0, [3, 9, s * 7]), v3.add(a0, [2.2, 14, s * 8.6]), v3.add(a0, [0, 18, s * 8.4])];
        sc.limb(main, 1.3, 0.45, M.antler, { part: ant });
        for (const [i, dx, dy, dz] of [[1, -3.6, 3.2, 1], [2, -4, 3.6, 0.8], [2, 2.6, 3, 2.4], [3, -3.2, 3, 0.4], [3, 2.4, 2.6, 1.4]] as const)
          sc.limb([main[i], v3.add(main[i], [dx * 0.6, dy * 0.6, s * dz * 0.6]), v3.add(main[i], [dx, dy, s * dz])], 0.75, 0.2, M.antler, { part: ant });
        sc.ell(v3.add(main[2], [0, -0.6, 0]), [1.6, 0.9, 1.2], M.moss);
        sc.ell(v3.add(main[3], [0.4, -2, 0]), [0.6, 2.2, 0.6], M.moss);
      }
      break;
    }
    case "owlbear": {
      // Cabeça de coruja: o disco facial claro, os olhões laranja, o bico em gancho e os tufos das "orelhas".
      const hc = at(-1.6, 3.6), hp = sc.part();
      sc.ell(hc, [6, 6, 6.6], M.feather, { part: hp, axes: [[0, 1, 0], [-1, 0, 0], [0, 0, 1]] });
      sc.ell(v3.add(hc, [-3.6, -0.4, 0]), [2.6, 5, 6.4], M.disc, { part: hp });
      for (const s of [1, -1]) {
        sc.ell(v3.add(hc, [-5.6, 1, s * 2.6]), [0.8, 2.1, 2.1], M.bearDark, { part: hp });
        sc.ball(v3.add(hc, [-6, 1, s * 2.6]), 1.7 + glow * 0.2, M.owlEye, hp);
        sc.ball(v3.add(hc, [-7.4, 1.1, s * 2.6]), 0.75, M.dark, hp);
        sc.cone(v3.add(hc, [-0.4, 5, s * 3.6]), v3.add(hc, [1.6, 9.6, s * 5]), 2, 0.3, M.bear, { part: hp });
      }
      const gape = (p.burst ?? 0) * 0.8;
      sc.cone(v3.add(hc, [-6, -1.2, 0]), v3.add(hc, [-9, -3, 0]), 1.6, 0.6, M.beak, { part: hp });
      sc.cone(v3.add(hc, [-9, -3, 0]), v3.add(hc, [-8.6, -4.6, 0]), 0.6, 0.15, M.beak, { part: hp });
      sc.cone(v3.add(hc, [-6, -2.6 - gape, 0]), v3.add(hc, [-8, -3.4 - gape * 2, 0]), 1, 0.4, M.beak, { part: hp });
      break;
    }
  }
}

/** Braço de cada um: pele, galho, pedra, pata de urso... e o que leva nas mãos. */
function armBody(sc: Sculpt, kind: FolkKind, sh: V3, el: V3, wr: V3, fd: V3, part: number, s: number, k: number, p: FPose) {
  const b = BODIES[kind];
  const side = v3.norm(v3.cross([0, 0, 1], fd));
  const fingers = (base: V3, mat: number, len: number, r: number, spread = 0.9) => {
    for (const f of [-1, 0, 1]) {
      const f0 = v3.add(base, [0, 0, f * spread]);
      const f1 = v3.add(f0, v3.add(v3.mul(fd, len), [0, -len * 0.3, f * spread * 0.4]));
      sc.cone(f0, f1, r, r * 0.4, mat, { part });
    }
  };
  switch (kind) {
    case "satyr": {
      sc.ball(sh, 2.1, M.skin, part);
      sc.cone(sh, el, b.armR + 0.3, b.armR, M.skin, { part });
      sc.cone(el, wr, b.armR, b.armR * 0.85, M.skin, { part });
      const hand = v3.add(wr, v3.mul(fd, 1.2));
      sc.ell(hand, [1.5, 1, 1.2], M.skin, { part, axes: basis(fd) });
      if (k === 1) {
        // Faca curva na mão de lá.
        const blade = v3.add(hand, v3.mul(fd, 1));
        const bd = v3.norm(v3.add(fd, [0, 0.9, 0]));
        sc.cone(hand, blade, 0.6, 0.6, M.wood, { part });
        sc.limb([blade, v3.add(blade, v3.mul(bd, 2.8)), v3.add(blade, v3.add(v3.mul(bd, 5), v3.mul(fd, 1.4)))], 0.7, 0.15, M.steel);
      } else {
        // Flauta de juncos: 5 canos lado a lado, de tamanhos diferentes.
        const pipe = p.pipe ?? 0;
        const c = v3.add(hand, [-1.2, 0.6 + pipe * 0.8, 1.2]);
        const pp = sc.part();
        for (let q = 0; q < 5; q++) sc.cone(v3.add(c, [0, 1.5, (q - 2) * 0.85]), v3.add(c, [0.2, -2.5 + q * 0.8, (q - 2) * 0.85]), 0.48, 0.48, M.pipe, { part: pp, band: { n: 2, depth: 0.15 } });
        sc.cone(v3.add(c, [-0.4, -0.3, -2.4]), v3.add(c, [-0.4, -0.3, 2.4]), 0.35, 0.35, M.root, { part: pp });
      }
      break;
    }
    case "dryad": {
      sc.ball(sh, 1.6, M.bark, part);
      sc.cone(sh, el, b.armR, b.armR * 0.9, M.bark, { part });
      sc.cone(el, wr, b.armR * 0.9, b.armR * 0.7, M.bark, { part });
      // Dedos compridos que viram raiz.
      for (const f of [-1, 0, 1]) {
        const f0 = v3.add(wr, [0, 0, f * 0.6]);
        sc.limb([f0, v3.add(f0, v3.add(v3.mul(fd, 2.6), [0, 0, f * 0.6])), v3.add(f0, v3.add(v3.mul(fd, 4.6), v3.add(v3.mul(side, -1.2), [0, 0, f * 1.4])))], 0.45, 0.12, M.root, { part });
      }
      break;
    }
    case "twigling": {
      sc.cone(sh, el, 0.8, 0.7, M.twig, { part });
      sc.cone(el, wr, 0.7, 0.55, M.twig, { part });
      // Garras de lasca, compridas.
      for (const f of [-1, 0, 1]) sc.cone(wr, v3.add(wr, v3.add(v3.mul(fd, 3.6 - Math.abs(f) * 0.8), [0, -0.6, f * 1.2])), 0.45, 0.06, M.twig, { part });
      break;
    }
    case "thorn": {
      sc.ball(sh, 2.6, M.bramble, part);
      sc.cone(sh, el, b.armR + 0.4, b.armR, M.bramble2, { part });
      sc.cone(el, wr, b.armR, b.armR * 0.7, M.bramble, { part });
      for (let q = 0; q < 4; q++) {
        const at = lerp3(sh, wr, 0.2 + q * 0.22);
        sc.cone(at, v3.add(at, v3.add(v3.mul(side, 2.6), [0, 0, s * 0.8])), 0.4, 0.06, M.thorn);
      }
      fingers(wr, M.root, 3, 0.55, 1);
      break;
    }
    case "menhir": {
      // Menires deitados como braços, punhos de pedra com runas.
      sc.ell(lerp3(sh, el, 0.5), [b.upper * 0.62, b.armR, b.armR], M.stone2, { part: sc.part(), axes: basis(v3.sub(el, sh), [1, 0, 0]) });
      const fist = sc.part();
      sc.ell(lerp3(el, wr, 0.5), [b.fore * 0.6, b.armR * 1.05, b.armR * 1.05], M.stone, { part: fist, axes: basis(v3.sub(wr, el), [1, 0, 0]) });
      sc.ell(v3.add(wr, v3.mul(fd, 2.4)), [3.8, 3.6, 3.6], M.stone, { part: fist, axes: basis(fd), paint: (x, y, z) => (Math.abs(z) < 0.6 && x > -1 && Math.abs(y) < 2.4 ? M.rune : -1) });
      for (const q of [0.3, 0.6]) sc.ball(v3.add(lerp3(sh, el, q), [-b.armR * 0.6, b.armR * 0.6, 0]), 0.8, M.lichen);
      break;
    }
    case "myconid": {
      sc.ball(sh, 1.8, M.stalk, part);
      sc.cone(sh, el, b.armR + 0.2, b.armR, M.stalk, { part });
      sc.cone(el, wr, b.armR, b.armR * 1.3, M.stalk, { part });
      sc.ell(v3.add(wr, v3.mul(fd, 1)), [1.8, 1.4, 1.6], M.stalk, { part, axes: basis(fd) });
      if ((p.burst ?? 0) > 0.05 && k === 0) {
        // Nuvem de esporos em volta.
        for (let q = 0; q < 14; q++) {
          const a = q * 2.399, r = 4 + (q % 4) * 2.4 * (p.burst ?? 0);
          sc.ball(v3.add(sh, [Math.cos(a) * r - 2, -6 + (q % 5) * 2.6, Math.sin(a) * r]), 0.8 + (q % 3) * 0.5 * (p.burst ?? 0), M.spore);
        }
      }
      break;
    }
    case "shade": {
      sc.ball(sh, 1.4, M.ghost, part);
      sc.cone(sh, el, b.armR, b.armR * 0.9, M.ghost, { part });
      sc.cone(el, wr, b.armR * 0.9, b.armR * 0.7, M.ghost, { part });
      if (k === 1) {
        // Arco élfico de luz na mão de lá: duas lâminas curvas e a corda.
        const up: V3 = [0, 1, 0];
        const bow = sc.part();
        const lim = (sg: number) => [0, 1, 2, 3, 4, 5].map((q) => v3.add(wr, v3.add(v3.mul(up, sg * q * 2.2), v3.mul(fd, -Math.sin((q / 5) * Math.PI * 0.85) * 2.4 + 0.6))));
        const top = lim(1), bot = lim(-1);
        sc.limb(top, 0.6, 0.3, M.blade, { part: bow });
        sc.limb(bot, 0.6, 0.3, M.blade, { part: bow });
        const pull = v3.add(wr, v3.mul(fd, -1 - (p.pipe ?? 0) * 5));
        sc.cone(top[5], pull, 0.15, 0.15, M.capSpot);
        sc.cone(bot[5], pull, 0.15, 0.15, M.capSpot);
        if ((p.pipe ?? 0) > 0.2) sc.cone(pull, v3.add(wr, v3.mul(fd, 3)), 0.3, 0.1, M.blade);
      }
      break;
    }
    case "vine": {
      // Braços de cipó compridos, que laçam (a ponta enrola).
      const pts = [sh, el, wr, v3.add(wr, v3.add(v3.mul(fd, 3), v3.mul(side, -2))), v3.add(wr, v3.add(v3.mul(fd, 4), v3.mul(side, -4.6)))];
      sc.limb(pts, b.armR + 0.4, 0.4, M.vine, { part });
      for (let q = 1; q < 4; q++) sc.ell(v3.add(pts[q], [0, 0.8, 0]), [1.4, 0.4, 0.9], M.leafDark, { axes: basis([1, 0.5, 0.3]) });
      break;
    }
    case "tree": {
      // Galhos grossos com raminhos e folhas na ponta.
      sc.cone(sh, el, b.armR + 0.8, b.armR, M.barkDark, { part });
      sc.cone(el, wr, b.armR, b.armR * 0.6, M.barkDark, { part });
      for (const f of [-1, 0, 1]) {
        const tip = v3.add(wr, v3.add(v3.mul(fd, 4.4), [0, f * 1.8, f * 2]));
        sc.cone(wr, tip, 1, 0.3, M.barkDark, { part });
        sc.ball(tip, 1.8, M.leafDark);
      }
      sc.cone(lerp3(sh, el, 0.6), v3.add(lerp3(sh, el, 0.6), [0, 4, s * 2]), 0.8, 0.25, M.barkDark, { part });
      sc.ball(v3.add(lerp3(sh, el, 0.6), [0, 4.6, s * 2.2]), 2, M.leafDark);
      break;
    }
    case "warden": {
      sc.ball(sh, 1.9, M.plate, part);
      sc.cone(sh, el, b.armR + 0.2, b.armR, M.cloak, { part });
      sc.cone(el, wr, b.armR + 0.3, b.armR, M.plate, { part });
      // Lâmina curva de luz fria em cada mão.
      const hilt = v3.add(wr, v3.mul(fd, 0.8));
      sc.ball(hilt, 0.9, M.plateDark, part);
      const bd = v3.norm(v3.add(fd, v3.mul(side, -0.5)));
      sc.limb([hilt, v3.add(hilt, v3.mul(bd, 4)), v3.add(hilt, v3.add(v3.mul(bd, 7.6), v3.mul(side, 1.2))), v3.add(hilt, v3.add(v3.mul(bd, 10), v3.mul(side, 2.6)))], 0.75, 0.12, M.blade);
      break;
    }
    case "erlking": {
      sc.ball(sh, 2.6, M.barkDark, part);
      sc.cone(sh, el, b.armR + 0.6, b.armR, M.barkDark, { part });
      sc.cone(el, wr, b.armR, b.armR * 0.8, M.barkDark, { part });
      // Dedos de raiz compridos; na mão de cá, a lança de galho com a ponta de espinho.
      fingers(wr, M.root, 3.2, 0.6, 0.9);
      if (k === 0) {
        const grip = v3.add(wr, v3.mul(fd, 0.6));
        const dir = v3.norm(v3.add(side, [0, 0, 0]));
        const s0 = v3.add(grip, v3.mul(dir, -15)), s1 = v3.add(grip, v3.mul(dir, 17));
        sc.cone(s0, s1, 0.7, 0.6, M.barkDark, { part: sc.part() });
        sc.cone(s1, v3.add(s1, v3.mul(dir, 4.6)), 1.1, 0.1, M.thorn);
        sc.ell(v3.add(s1, v3.mul(dir, -1.6)), [1.2, 0.6, 0.6], M.leaf2, { axes: basis(dir) });
      }
      break;
    }
    case "owlbear": {
      sc.ball(sh, b.armR + 1.6, M.bear, part);
      sc.cone(sh, el, b.armR + 1, b.armR, M.bear, { part });
      sc.cone(el, wr, b.armR, b.armR * 0.95, M.bear, { part });
      const paw = v3.add(wr, v3.mul(fd, 1.8));
      sc.ell(paw, [3, 2.2, 2.8], M.bearDark, { part, axes: basis(fd) });
      // Garras grossas e claras.
      for (const f of [-1, 0, 1]) {
        const f0 = v3.add(paw, v3.add(v3.mul(fd, 2.2), [0, 0, f * 1.4]));
        sc.limb([f0, v3.add(f0, v3.add(v3.mul(fd, 1.8), [0, -0.2, f * 0.3])), v3.add(f0, v3.add(v3.mul(fd, 2.8), v3.add(v3.mul(side, -1.4), [0, 0, f * 0.4])))], 0.75, 0.12, M.claw, { part });
      }
      break;
    }
  }
}

// --- Quadros ---------------------------------------------------------------------------------------------------------

const PITCH = 28;
/** Escala (px por unidade) de cada um: o Galhudo é pequeno, o Guardião e o Urso-coruja enchem o quadro. */
const SCALE: Record<FolkKind, number> = { satyr: 2.35, dryad: 2.05, twigling: 2.7, thorn: 2.2, menhir: 1.9, owlbear: 1.95, myconid: 2.6, shade: 2.2, vine: 2.3, tree: 1.55, warden: 2.15, erlking: 1.5 };
const YAW: Record<View, number> = { side: 18, front: 90, back: -90 };
export const FOLK_FEET = SCULPT_SIZE - 14;

export function shootFolk(kind: FolkKind, pose: FPose, view: View): Frame {
  const cx = view === "side" ? SCULPT_SIZE / 2 + 6 : SCULPT_SIZE / 2;
  return render(folk(kind, pose), { size: SCULPT_SIZE, feet: FOLK_FEET, cx, yaw: YAW[view], pitch: PITCH, scale: SCALE[kind] }, look(kind));
}

// --- Poses -----------------------------------------------------------------------------------------------------------

const DEF: FPose = {
  lean: 8, x: 0, lift: 0, thigh: [4, -4], knee: [8, 8], arm: [20, 14], elbow: [20, 24], spread: 0, nod: 0, sway: 0, glow: 0, fall: 0, curl: 0, burst: 0, pipe: 0,
};
const K = (p: FPose): FPose => ({ ...DEF, ...p });

/** Andar de 8 quadros a partir de 4 poses-chave (contato e passagem de cada perna), com o corpo quicando. */
function walk(lean: number, step: number, armSwing: number, base: FPose = {}): FPose[] {
  return tween(([
    { lean, thigh: [step, -step * 0.8], knee: [6, 18], arm: [(base.arm?.[0] ?? 20) - armSwing, (base.arm?.[1] ?? 14) + armSwing], sway: -6, lift: 0 },
    { lean: lean + 1, thigh: [4, 2], knee: [6, 34], arm: base.arm ?? [20, 14], sway: 0, lift: 0.8 },
    { lean, thigh: [-step * 0.8, step], knee: [18, 6], arm: [(base.arm?.[0] ?? 20) + armSwing, (base.arm?.[1] ?? 14) - armSwing], sway: 6, lift: 0 },
    { lean: lean + 1, thigh: [2, 4], knee: [34, 6], arm: base.arm ?? [20, 14], sway: 0, lift: 0.8 },
  ] satisfies FPose[]).map((q) => K({ ...base, ...q })), 8, true);
}

const fallDeath = (base: FPose = {}) => tween(([
  { lean: -16, arm: [130, 120], elbow: [30, 40], spread: 0.3, nod: -16, sway: -12 },
  { lean: 34, thigh: [46, 42], knee: [90, 86], arm: [40, 34], elbow: [20, 24], nod: 20, sway: 10, glow: 0.2 },
  { fall: 84, x: 26, lean: 0, thigh: [4, 0], knee: [10, 6], arm: [170, 165], elbow: [6, 6], spread: 0.15, nod: 8, sway: 20 },
] satisfies FPose[]).map((q) => K({ ...base, ...q })), 5);

export const FOLK_POSES: Record<FolkKind, { idle: FPose[]; walk: FPose[]; attack: FPose[]; special: FPose[]; death: FPose[]; skill?: FPose[] }> = {
  // Sátiro: anda saltitando com a flauta na mão; golpe de faca; o especial toca a melodia (flauta na boca).
  satyr: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 4 + k, arm: [22 + k * 3, 14 - k * 2], elbow: [70, 30 + k * 4], nod: -2 + k, sway: k * 3 - 3 })), 6, true),
    walk: walk(10, 26, 14, { arm: [24, 14], elbow: [70, 30] }),
    attack: tween(([
      { lean: 0, arm: [40, 110], elbow: [70, 60], nod: -4 },
      { lean: -6, arm: [44, 150], elbow: [60, 40], nod: -8, thigh: [10, -8] },
      { lean: 22, x: -3, arm: [36, 70], elbow: [70, 0], nod: 8, thigh: [26, -14], knee: [22, 10] },
      { lean: 6, arm: [24, 14], elbow: [70, 30] },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 0, arm: [90, 30], elbow: [90, 40], nod: -6, pipe: 0.5 },
      { lean: -8, arm: [104, 34], elbow: [96, 44], nod: -14, pipe: 1, sway: -10, thigh: [6, -10] },
      { lean: -4, arm: [100, 34], elbow: [94, 44], nod: -8, pipe: 1, sway: 10, thigh: [-6, 8] },
      { lean: 4, arm: [24, 14], elbow: [70, 30], pipe: 0 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath(),
  },
  // Dríade: flutua de leve, os braços erguidos como galhos; o golpe arranha com os dedos-raiz e o especial (Enraizar)
  // ajoelha com as mãos no chão e as raízes saem na frente.
  dryad: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 2, arm: [50 + k * 5, 30 + k * 4], elbow: [30 - k * 3, 40], spread: 0.15, nod: -2 + k, sway: k * 5 - 5, glow: 0.2 })), 6, true),
    walk: walk(4, 18, 10, { arm: [50, 32], elbow: [28, 40], spread: 0.15 }),
    attack: tween(([
      { lean: -4, arm: [150, 40], elbow: [20, 30], nod: -6, sway: -8 },
      { lean: 18, x: -3, arm: [70, 30], elbow: [0, 30], nod: 6, sway: 6, thigh: [18, -10] },
      { lean: 4, arm: [50, 32], elbow: [28, 40], spread: 0.15 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 10, arm: [110, 100], elbow: [10, 10], spread: 0.3, nod: -10, glow: 0.6 },
      { lean: 46, thigh: [60, 20], knee: [110, 80], arm: [80, 76], elbow: [10, 10], nod: 10, glow: 1, burst: 0.4 },
      { lean: 48, thigh: [60, 20], knee: [110, 80], arm: [76, 72], elbow: [8, 8], nod: 8, glow: 1, burst: 1 },
      { lean: 6, arm: [50, 32], elbow: [28, 40], spread: 0.15, glow: 0.3, burst: 0.2 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ spread: 0.15 }),
  },
  // Galhudo: curvado, braços compridos pendendo; o especial é o disfarce (encolhe e vira um monte de gravetos).
  twigling: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 22 + k, arm: [16 + k * 3, 10], elbow: [10, 14], nod: 4 - k * 2, sway: k * 4 - 4, glow: 0.3 })), 6, true),
    walk: walk(26, 30, 18, { arm: [20, 12], elbow: [10, 16], glow: 0.3 }),
    attack: tween(([
      { lean: 14, arm: [120, 20], elbow: [30, 10], nod: -6, glow: 0.5 },
      { lean: 36, x: -3, arm: [50, 30], elbow: [0, 10], nod: 10, thigh: [24, -12], knee: [20, 10], glow: 0.7 },
      { lean: 24, arm: [20, 12], elbow: [10, 16], glow: 0.3 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 30, arm: [20, 12], elbow: [10, 16] },
      { lean: 40, curl: 0.6, thigh: [60, 50], knee: [120, 120], arm: [40, 40], elbow: [100, 100], nod: 20, glow: 0.2 },
      { lean: 44, curl: 1, thigh: [80, 70], knee: [150, 150], arm: [60, 60], elbow: [130, 130], nod: 30, glow: 0.6 },
      { lean: 44, curl: 1, thigh: [80, 70], knee: [150, 150], arm: [60, 60], elbow: [130, 130], nod: 30, glow: 1 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ lean: 24 }),
  },
  // Espinheiro: curvado e lento; o golpe atira os espinhos do braço; o especial (Explosão de Espinhos) encolhe e explode.
  thorn: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 20 + k, arm: [24 + k * 2, 18], elbow: [30, 26], nod: 6 - k * 2, sway: k * 3 - 3, glow: 0.3 })), 6, true),
    walk: walk(24, 18, 10, { arm: [26, 18], elbow: [30, 26], glow: 0.3 }),
    attack: tween(([
      { lean: 10, arm: [140, 20], elbow: [40, 26], nod: -8, glow: 0.5 },
      { lean: 30, x: -2, arm: [80, 20], elbow: [0, 26], nod: 6, glow: 1, thigh: [18, -10] },
      { lean: 22, arm: [26, 18], elbow: [30, 26], glow: 0.3 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 30, curl: 0.4, arm: [60, 60], elbow: [90, 90], nod: 16, thigh: [30, 26], knee: [50, 50], glow: 0.4 },
      { lean: 34, curl: 0.7, arm: [80, 80], elbow: [110, 110], nod: 24, thigh: [40, 34], knee: [70, 70], glow: 0.8 },
      { lean: -4, curl: 0, arm: [120, 120], elbow: [10, 10], spread: 0.5, nod: -10, glow: 1, burst: 1 },
      { lean: 20, arm: [26, 18], elbow: [30, 26], glow: 0.3, burst: 0 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ lean: 20 }),
  },
  // Guardião do Menir: pesado e lento; parado com os braços colados (parece um menir), soco de cima e o pisão rúnico.
  menhir: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 2, arm: [8 + k, 6 + k], elbow: [6, 6], nod: 0, glow: 0.3 + k * 0.15, lift: k * 0.2 })), 6, true),
    walk: walk(4, 14, 8, { arm: [12, 10], elbow: [10, 10], glow: 0.4 }),
    attack: tween(([
      { lean: -6, arm: [160, 10], elbow: [20, 10], nod: -4, glow: 0.7 },
      { lean: 16, x: -3, arm: [70, 10], elbow: [0, 10], nod: 6, glow: 1, thigh: [16, -8], knee: [14, 8] },
      { lean: 4, arm: [14, 10], elbow: [10, 10], glow: 0.4 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: -4, arm: [40, 40], elbow: [60, 60], spread: 0.3, thigh: [50, -2], knee: [60, 6], glow: 0.8 },
      { lean: -6, arm: [60, 60], elbow: [70, 70], spread: 0.4, thigh: [64, -2], knee: [70, 6], glow: 1, lift: 1 },
      { lean: 10, arm: [20, 20], elbow: [20, 20], spread: 0.3, thigh: [8, -6], knee: [20, 20], glow: 1, burst: 0.5, lift: -1.4 },
      { lean: 6, arm: [14, 10], elbow: [10, 10], glow: 0.6, burst: 1 },
    ] satisfies FPose[]).map(K), 6),
    death: tween(([
      { lean: -10, arm: [60, 50], elbow: [20, 20], glow: 1 },
      { lean: 20, thigh: [40, 36], knee: [80, 76], arm: [30, 24], elbow: [10, 10], glow: 0.4 },
      { fall: 86, x: 30, lean: 0, thigh: [4, 0], knee: [6, 6], arm: [170, 165], elbow: [4, 4], glow: 0 },
    ] satisfies FPose[]).map(K), 5),
  },
  // Fungóide: balança o chapéu; o golpe é uma cabeçada de chapéu, o especial solta a nuvem de esporos.
  myconid: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 4 + k, arm: [10 + k * 2, 8], elbow: [20, 18], nod: -2 + k * 2, sway: k * 3 - 3, glow: 0.3 })), 6, true),
    walk: walk(6, 22, 12, { arm: [12, 10], elbow: [20, 18], glow: 0.3 }),
    attack: tween(([
      { lean: -10, nod: -14, arm: [30, 30], elbow: [30, 30] },
      { lean: 26, x: -2, nod: 20, arm: [10, 10], elbow: [10, 10], thigh: [16, -8] },
      { lean: 6, arm: [12, 10], elbow: [20, 18] },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 10, curl: 0.2, nod: 10, arm: [40, 40], elbow: [60, 60], glow: 0.6 },
      { lean: -6, nod: -10, arm: [90, 90], elbow: [10, 10], spread: 0.5, glow: 1, burst: 0.6, lift: 1 },
      { lean: -4, nod: -6, arm: [80, 80], elbow: [10, 10], spread: 0.5, glow: 1, burst: 1 },
      { lean: 6, arm: [12, 10], elbow: [20, 18], glow: 0.4, burst: 0.3 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ lean: 4 }),
  },
  // Sombra Élfica: flutua, o arco na mão de lá; o golpe é atirar (puxa e solta), o especial a Flecha da Lua Morta.
  shade: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 2, lift: 1.4 + k * 0.4, thigh: [6, -4], knee: [20, 26], arm: [16, 50 + k * 2], elbow: [20, 30], sway: k * 4 - 4, glow: 0.5 })), 6, true),
    walk: tween([0, 1, 2, 3].map((k) => K({ lean: 6, lift: 1.6 + Math.sin(k * 1.6) * 0.6, thigh: [10, -2], knee: [26, 30], arm: [16, 50], elbow: [20, 30], sway: k % 2 ? 8 : -8, glow: 0.5 })), 8, true),
    attack: tween(([
      { lean: 0, lift: 1.6, thigh: [6, -4], knee: [20, 26], arm: [86, 88], elbow: [0, 4], glow: 0.6, pipe: 0.3 },
      { lean: -4, lift: 1.6, thigh: [6, -4], knee: [20, 26], arm: [88, 90], elbow: [40, 2], glow: 0.8, pipe: 1 },
      { lean: 2, lift: 1.6, thigh: [6, -4], knee: [20, 26], arm: [86, 88], elbow: [0, 4], glow: 1, pipe: 0 },
      { lean: 2, lift: 1.6, arm: [16, 50], elbow: [20, 30], glow: 0.5 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: -6, lift: 2, arm: [100, 104], elbow: [40, 0], glow: 1, pipe: 1, nod: -8 },
      { lean: -8, lift: 2.6, arm: [100, 104], elbow: [46, 0], glow: 1, pipe: 1, nod: -10, sway: -8 },
      { lean: 4, lift: 2, arm: [90, 96], elbow: [0, 0], glow: 1, pipe: 0, sway: 8 },
      { lean: 2, lift: 1.6, arm: [16, 50], elbow: [20, 30], glow: 0.5 },
    ] satisfies FPose[]).map(K), 6),
    death: tween(([
      { lean: -16, lift: 2, arm: [130, 120], elbow: [30, 40], spread: 0.3, nod: -16, glow: 1 },
      { lean: 20, lift: 0.6, thigh: [40, 30], knee: [80, 80], arm: [40, 34], elbow: [20, 24], nod: 20, glow: 0.4 },
      { fall: 84, x: 24, lean: 0, arm: [170, 165], elbow: [6, 6], glow: 0 },
    ] satisfies FPose[]).map(K), 5),
  },
  // Cipó Estrangulador: ondula curvado; o golpe é uma chicotada, o especial laça e puxa.
  vine: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 14 + k * 2, arm: [30 + k * 6, 20 - k * 4], elbow: [40, 50], nod: 6 - k * 2, sway: k * 6 - 6, glow: 0.4 })), 6, true),
    walk: walk(18, 12, 18, { arm: [34, 20], elbow: [40, 50], glow: 0.4 }),
    attack: tween(([
      { lean: 4, arm: [150, 20], elbow: [40, 50], nod: -6, glow: 0.6 },
      { lean: 28, x: -2, arm: [70, 20], elbow: [0, 50], nod: 10, glow: 1 },
      { lean: 16, arm: [34, 20], elbow: [40, 50], glow: 0.4 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 8, arm: [120, 110], elbow: [20, 20], nod: -8, glow: 0.8 },
      { lean: 20, x: -2, arm: [96, 92], elbow: [0, 0], nod: 6, glow: 1 },
      { lean: -4, arm: [60, 56], elbow: [100, 100], nod: -4, glow: 1, sway: -10 },
      { lean: 14, arm: [34, 20], elbow: [40, 50], glow: 0.5 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ lean: 14 }),
  },
  // Árvore Desperta: lenta e pesada; parada, os galhos para cima como árvore; varre com os galhos e prende com raízes.
  tree: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 0, arm: [64 - k * 3, 56 + k * 3], elbow: [40, 44], spread: 0.35, nod: 0, sway: k * 3 - 3, glow: 0.2 + k * 0.1 })), 6, true),
    walk: walk(4, 12, 6, { arm: [60, 54], elbow: [30, 30], spread: 0.2, glow: 0.4 }),
    attack: tween(([
      { lean: -6, arm: [160, 60], elbow: [20, 30], spread: 0.2, glow: 0.6 },
      { lean: 16, x: -2, arm: [70, 60], elbow: [0, 30], spread: 0.1, glow: 1, thigh: [12, -6] },
      { lean: 2, arm: [60, 54], elbow: [30, 30], spread: 0.2, glow: 0.4 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: -4, arm: [120, 120], elbow: [20, 20], spread: 0.5, glow: 0.7 },
      { lean: 4, arm: [90, 90], elbow: [10, 10], spread: 0.8, glow: 1, sway: 10 },
      { lean: 10, arm: [60, 60], elbow: [10, 10], spread: 0.9, glow: 1, sway: -10 },
      { lean: 2, arm: [60, 54], elbow: [30, 30], spread: 0.2, glow: 0.5 },
    ] satisfies FPose[]).map(K), 6),
    death: tween(([
      { lean: -10, arm: [120, 110], elbow: [20, 20], spread: 0.4, glow: 1 },
      { lean: 30, thigh: [20, 16], knee: [40, 36], arm: [60, 50], elbow: [10, 10], glow: 0.4, sway: 10 },
      { fall: 84, x: 30, lean: 0, arm: [170, 160], elbow: [10, 10], spread: 0.3, glow: 0 },
    ] satisfies FPose[]).map(K), 5),
  },
  // Guardião Élfico Caído: as duas lâminas abertas; golpe em X e a Dança das Lâminas (gira com os braços abertos).
  warden: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 6, arm: [40 + k * 2, 30 - k * 2], elbow: [50, 40], spread: 0.15, thigh: [10, -8], knee: [14, 10], nod: 2, sway: k * 3 - 3, glow: 0.6 })), 6, true),
    walk: walk(10, 24, 16, { arm: [40, 30], elbow: [50, 40], spread: 0.15, glow: 0.6 }),
    attack: tween(([
      { lean: -4, arm: [150, 140], elbow: [30, 30], spread: 0.2, glow: 0.8, nod: -6 },
      { lean: 22, x: -3, arm: [70, 80], elbow: [0, 0], spread: -0.05, glow: 1, nod: 8, thigh: [24, -12], knee: [22, 10] },
      { lean: 8, arm: [40, 30], elbow: [50, 40], spread: 0.15, glow: 0.6 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: 4, arm: [90, 90], elbow: [0, 0], spread: 0.9, glow: 1, sway: -14, thigh: [14, -10], knee: [20, 14] },
      { lean: 2, arm: [92, 88], elbow: [0, 0], spread: 1, glow: 1, sway: 14, lift: 0.6 },
      { lean: 6, arm: [88, 92], elbow: [0, 0], spread: 0.9, glow: 1, sway: -14 },
      { lean: 6, arm: [40, 30], elbow: [50, 40], spread: 0.15, glow: 0.6 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ glow: 0.6 }),
  },
  // Rei Galhado: alto e lento, a lança de galho na mão; o golpe é a estocada, o especial ergue os braços (espinhos e
  // a caçada) e a 2ª habilidade (Fúria da Mata) abre os braços com a mata levantando em volta.
  erlking: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 4 + k, arm: [30 + k * 2, 18], elbow: [40, 24], nod: -2 + k, sway: k * 4 - 4, glow: 0.5 + k * 0.1 })), 6, true),
    walk: walk(8, 22, 10, { arm: [32, 18], elbow: [40, 24], glow: 0.5 }),
    attack: tween(([
      { lean: -6, arm: [60, 30], elbow: [90, 30], nod: -6, glow: 0.7 },
      { lean: -8, arm: [40, 40], elbow: [110, 30], nod: -10, glow: 0.8, thigh: [-8, 10] },
      { lean: 22, x: -4, arm: [96, 20], elbow: [0, 20], nod: 10, glow: 1, thigh: [26, -14], knee: [24, 10] },
      { lean: 6, arm: [32, 18], elbow: [40, 24], glow: 0.5 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: -2, arm: [100, 120], elbow: [30, 20], spread: 0.3, nod: -10, glow: 0.8 },
      { lean: -10, arm: [150, 160], elbow: [10, 10], spread: 0.4, nod: -18, glow: 1, sway: -10, lift: 0.6 },
      { lean: 10, arm: [90, 100], elbow: [10, 10], spread: 0.3, nod: 4, glow: 1, sway: 10 },
      { lean: 6, arm: [32, 18], elbow: [40, 24], glow: 0.5 },
    ] satisfies FPose[]).map(K), 6),
    skill: tween(([
      { lean: 10, curl: 0.3, arm: [30, 30], elbow: [80, 80], nod: 14, glow: 0.8 },
      { lean: -12, arm: [120, 120], elbow: [0, 0], spread: 0.9, nod: -16, glow: 1, lift: 1 },
      { lean: -8, arm: [110, 110], elbow: [0, 0], spread: 1, nod: -10, glow: 1, burst: 1 },
      { lean: 6, arm: [32, 18], elbow: [40, 24], glow: 0.6 },
    ] satisfies FPose[]).map(K), 6),
    death: tween(([
      { lean: -18, arm: [140, 150], elbow: [20, 20], spread: 0.4, nod: -20, glow: 1, sway: -12 },
      { lean: 30, thigh: [50, 44], knee: [80, 76], arm: [40, 34], elbow: [20, 24], nod: 20, glow: 0.5, sway: 10 },
      { fall: 84, x: 30, lean: 0, thigh: [4, 0], knee: [10, 6], arm: [170, 165], elbow: [6, 6], spread: 0.2, nod: 8, glow: 0 },
    ] satisfies FPose[]).map(K), 5),
  },
  // Urso-coruja: de pé, pesado; golpe com as duas garras (bica junto) e o Abraço Esmagador (abre os braços e fecha).
  owlbear: {
    idle: tween([0, 1, 2].map((k) => K({ lean: 10 + k, arm: [30 + k * 3, 24 + k * 2], elbow: [40, 44], spread: 0.1, nod: 4 - k * 2, lift: k * 0.3 })), 6, true),
    walk: walk(14, 18, 14, { arm: [34, 26], elbow: [40, 44], spread: 0.1 }),
    attack: tween(([
      { lean: 0, arm: [150, 120], elbow: [40, 40], spread: 0.2, nod: -10, burst: 0.6 },
      { lean: 26, x: -3, arm: [70, 54], elbow: [10, 10], spread: 0.1, nod: 14, thigh: [20, -10], knee: [20, 10], burst: 1 },
      { lean: 14, arm: [34, 26], elbow: [40, 44], spread: 0.1 },
    ] satisfies FPose[]).map(K), 6),
    special: tween(([
      { lean: -10, arm: [110, 110], elbow: [10, 10], spread: 0.8, nod: -14, burst: 1, lift: 1 },
      { lean: -6, arm: [100, 100], elbow: [20, 20], spread: 0.9, nod: -10, burst: 1, lift: 1.4 },
      { lean: 16, x: -3, arm: [90, 90], elbow: [80, 80], spread: 0, nod: 6, burst: 0.3 },
      { lean: 18, x: -3, arm: [86, 86], elbow: [90, 90], spread: -0.1, nod: 8, burst: 0.1 },
    ] satisfies FPose[]).map(K), 6),
    death: fallDeath({ spread: 0.1 }),
  },
};
