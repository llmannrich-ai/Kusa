import type { ClassId } from "@kusa/shared";
import { makeCanvas, paintGrid, type Grid, type Palette } from "./pixels.ts";
import {
  KNIGHT_WEAPONS, NO_OUTFIT, armorBody, helmetHead, outfitPalette, pauldrons, shieldGrid, tierOf, tintClassWeapon,
  type Outfit, type Piece,
} from "./outfit.ts";

/**
 * Arte própria das 4 classes, no espírito do Tibia: 32×32, vista de cima levemente inclinada,
 * 3 direções (a direita é a esquerda espelhada) e 3 quadros de caminhada por direção.
 *
 * Cada quadro é montado em camadas: pernas (ou a barra da túnica), tronco com os braços, cabeça
 * da classe e a arma na mão. O tronco é o que a armadura recobre (`outfit.ts`); o capacete troca a
 * cabeça, o escudo vai na outra mão e a arma muda de forma ou de material.
 *
 * Caminhada: no quadro 0 as pernas estão juntas; nos quadros 1 e 2 uma perna vai à frente e a outra
 * fica para trás (de lado, a passada abre de verdade), os braços balançam ao contrário das pernas e o
 * corpo desce 1 px. A animação toca `1, 0, 2, 0`.
 * A folha final tem 9 quadros em linha: `direção * 3 + quadro`.
 */

export type HeroDir = "down" | "up" | "side";
export const HERO_DIRS: HeroDir[] = ["down", "up", "side"];
export const HERO_FRAMES = 3;
export const HERO_SIZE = 32;

/** Caixa de 16 colunas centralizada no quadro; o corpo termina na linha 30 (pés). */
const BOX_X = 8;
const FEET_ROW = 30;
/** Topo do tronco: o corpo tem 16 linhas (tronco 0–7, pernas 8–15). */
const BODY_TOP = FEET_ROW - 15;
/** Linha do corpo onde começam as pernas (ou a saia). */
const LEGS_ROW = 8;

const BASE: Palette = {
  o: "#140d0a", // contorno
  s: "#ecc29a", // pele
  S: "#bf8a62",
  e: "#2a160c", // olhos
  b: "#5a3822", // botas
  t: "#8a5c3a", // brilho da bota
  d: "#33200f", // sola e bota na sombra
  m: "#d2d6de", // metal
  M: "#7d8593",
  w: "#9a6a36", // madeira
  W: "#5e3c1c",
};

// --- Ferramentas de grade --------------------------------------------------------

const blank = (width: number) => ".".repeat(width);

/** Desloca na vertical as colunas [x0, x1] a partir da linha `fromRow` (dy > 0 desce, dy < 0 sobe). */
function shiftCols(grid: Grid, x0: number, x1: number, fromRow: number, dy: number): Grid {
  if (!dy) return grid;
  return grid.map((row, y) => {
    if (y < fromRow) return row;
    const src = y - dy;
    const from = src >= fromRow && src < grid.length ? grid[src] : blank(row.length);
    return row.slice(0, x0) + from.slice(x0, x1 + 1) + row.slice(x1 + 1);
  });
}

/** Desloca na horizontal as linhas [y0, y1] (dx < 0 vai para a esquerda). */
function shiftRows(grid: Grid, y0: number, y1: number, dx: number): Grid {
  if (!dx) return grid;
  return grid.map((row, y) => {
    if (y < y0 || y > y1) return row;
    return dx > 0 ? blank(dx) + row.slice(0, row.length - dx) : row.slice(-dx) + blank(-dx);
  });
}

/** Apaga o retângulo [x0, x1] × [y0, y1]. */
function clear(grid: Grid, x0: number, x1: number, y0: number, y1: number): Grid {
  return grid.map((row, y) => (y < y0 || y > y1 ? row : row.slice(0, x0) + blank(x1 - x0 + 1) + row.slice(x1 + 1)));
}

/** Pinta `top` por cima de `grid` em (x, y), pulando os pixels transparentes. */
function overlay(grid: Grid, top: Grid, x: number, y: number): Grid {
  return grid.map((row, gy) => {
    const src = top[gy - y];
    if (!src) return row;
    return [...row].map((ch, gx) => {
      const c = src[gx - x];
      return c && c !== "." ? c : ch;
    }).join("");
  });
}

// --- Troncos ---------------------------------------------------------------------
// 9 linhas: ombros na 0, cinto e mãos na 6, barra da roupa na 7 (a 8 sobra para a mão que desce).
// "r" é o brilho da roupa (luz vindo de cima à esquerda), "p" a cor e "P" a sombra; "q" é o detalhe.

const TORSO_DOWN: Grid = [
  "....ooqsSqoo....",
  "..oorrpqqpPPoo..",
  ".orrorppppPoPPo.",
  ".orporppppPoPPo.",
  ".orporppppPoPPo.",
  ".oppoppppPPoPPo.",
  ".ossoqqmqqqoSSo.",
  "..ooPpppppPPoo..",
  "................",
];

const TORSO_UP: Grid = [
  "....oorppPoo....",
  "..oorrppppPPoo..",
  ".orrorppppPoPPo.",
  ".orporppppPoPPo.",
  ".orporpppPPoPPo.",
  ".oppoppppPPoPPo.",
  ".ossoqqqqqqoSSo.",
  "..ooPpppppPPoo..",
  "................",
];

/** Túnica longa: o tronco segue sem barra, com a costura no meio. */
const robeTop = (grid: Grid): Grid => [...grid.slice(0, 7), "..oorppqppPPoo..", grid[8]];

/** De lado (virado para a esquerda), sem o braço: ele entra por cima com o balanço do quadro. */
const TORSO_SIDE: Grid = [
  ".....ooqqo......",
  "....orrppPPo....",
  "....orpppPPo....",
  "....orpppPPo....",
  "....orpppPPo....",
  "....orppPPPo....",
  "....oqqqqqqo....",
  "....oPPPPPPo....",
  "................",
];
const ROBE_TORSO_SIDE: Grid = [...TORSO_SIDE.slice(0, 7), "....orppPPPo....", TORSO_SIDE[8]];

/** Braço de quem está de lado: ombro fixo e antebraço que balança (linhas 3 em diante). */
const SIDE_ARM: Grid = [
  "rrP.",
  "rpP.",
  "rpP.",
  "rpP.",
  "pPP.",
  "osSo",
  ".oo.",
];
const SIDE_ARM_X = 6;
const SIDE_ARM_Y = 1;

/** Braços de frente e de costas: colunas de cada braço (esquerda e direita da tela). */
const ARM_COLS: [number, number][] = [[1, 3], [12, 14]];
const ARM_FROM = 3;

/** Balanço dos braços: `dy` de cada mão (> 0 vem à frente e desce, < 0 vai para trás e sobe). */
function swingArms(torso: Grid, [left, right]: [number, number]): Grid {
  const [[l0, l1], [r0, r1]] = ARM_COLS;
  return shiftCols(shiftCols(torso, l0, l1, ARM_FROM, left), r0, r1, ARM_FROM, right);
}

/** Braço de lado: o antebraço vai `dx` para a frente (< 0) ou para trás (> 0). */
function sideArm(torso: Grid, dx: number): Grid {
  const upper = SIDE_ARM.map((row, y) => (y < 3 ? row : blank(row.length)));
  const lower = SIDE_ARM.map((row, y) => (y < 3 ? blank(row.length) : row));
  return overlay(overlay(torso, upper, SIDE_ARM_X, SIDE_ARM_Y), lower, SIDE_ARM_X + dx, SIDE_ARM_Y);
}

// --- Pernas ----------------------------------------------------------------------
// 9 linhas a partir da linha 8 do corpo (a 16 só é usada pelo pé que vem à frente, mais perto da câmera).
// "l" é a calça na luz e "L" na sombra; de lado, a perna de trás é toda "L" com bota "d".

const LEGS_DOWN: Grid = [
  "....ollllLLo....",
  "....olLoolLo....",
  "....olLoolLo....",
  "....olLoolLo....",
  "....otboobdo....",
  "....obdoobdo....",
  "...otbdootbdo...",
  "...oooo..oooo...",
  "................",
];

const LEGS_UP: Grid = [
  "....ollllLLo....",
  "....olLoolLo....",
  "....olLoolLo....",
  "....olLoolLo....",
  "....otboobdo....",
  "....obdoobdo....",
  "....oddooddo....",
  "....oooooooo....",
  "................",
];

const LEGS_SIDE: Grid[] = [
  [
    ".....ollLLo.....",
    ".....ollLLo.....",
    ".....ollLLo.....",
    ".....ollLLo.....",
    ".....otbbdo.....",
    "....otbbbdo.....",
    "...obbbbbdo.....",
    "...oooooooo.....",
    "................",
  ],
  // Perna da frente (clara) à frente, a de trás com o calcanhar no ar.
  [
    ".....ollLLo.....",
    "....ollloLLo....",
    "....ollo.oLLo...",
    "...ollo...oLLo..",
    "...otbo...oLdo..",
    "..otbbo....odo..",
    ".obbbbo...oddo..",
    ".oooooo...oooo..",
    "................",
  ],
  // Perna de trás (escura) à frente, a da frente esticada para trás.
  [
    ".....ollLLo.....",
    "....oLLollo.....",
    "...oLLo.ollo....",
    "...oLLo..ollo...",
    "..oLdo...otbo...",
    "..oddo....otbo..",
    ".odddo....obbbo.",
    ".ooooo....ooooo.",
    "................",
  ],
];

// --- Túnicas -----------------------------------------------------------------------

const ROBE_DOWN: Grid = [
  "...orppqpppPo...",
  "...orppqpppPo...",
  "..orpppqpppPPo..",
  "..orpppqpppPPo..",
  ".orppppqpppPPPo.",
  ".oqqqqqqqqqqqqo.",
  "...otbo..otdo...",
  "...oooo..oooo...",
  "................",
];

const ROBE_UP: Grid = [
  "...orppqpppPo...",
  "...orppqpppPo...",
  "..orpppqpppPPo..",
  "..orpppqppPPPo..",
  ".orppppqppPPPPo.",
  ".oqqqqqqqqqqqqo.",
  "...obdo..obdo...",
  "...oooo..oooo...",
  "................",
];

const ROBE_SIDE: Grid[] = [
  [
    ".....orppPo.....",
    ".....orppPo.....",
    "....orpppPPo....",
    "....orpppPPo....",
    "...orppppPPo....",
    "...oqqqqqqqo....",
    "...otbbdo.......",
    "...oooooo.......",
    "................",
  ],
  // Passo com a perna da frente: a barra abre para a frente e o pé aparece.
  [
    ".....orppPo.....",
    ".....orppPo.....",
    "....orpppPPo....",
    "...orppppPPo....",
    "..orpppppPPPo...",
    "..oqqqqqqqqqo...",
    ".otbbo....odo...",
    ".ooooo....ooo...",
    "................",
  ],
  // Passo com a perna de trás: a barra arrasta para trás.
  [
    ".....orppPo.....",
    ".....orppPo.....",
    "....orpppPPo....",
    "....orppppPPo...",
    "...orppppPPPPo..",
    "...oqqqqqqqqqo..",
    "..oddo....otbo..",
    "..oooo....oooo..",
    "................",
  ],
];

// --- Poses -------------------------------------------------------------------------

type BodyKind = "pants" | "robe";

interface Pose {
  torso: Grid;
  legs: Grid;
  /** Quanto o tronco (e tudo que vai nele) desce no quadro. */
  bob: number;
  /** Deslocamento vertical das mãos [esquerda, direita da tela], para a arma e o escudo acompanharem. */
  hands: [number, number];
}

/** De frente: perna esquerda à frente (pé desce 1) e direita para trás (calcanhar sobe 2), ou o contrário. */
function stepDown(legs: Grid, leftAhead: boolean): Grid {
  const [ahead, behind] = leftAhead ? [[3, 7], [8, 12]] : [[8, 12], [3, 7]];
  return shiftCols(shiftCols(legs, ahead[0], ahead[1], 1, 1), behind[0], behind[1], 2, -2);
}

/** De costas: a perna que sai do chão mostra a sola; a outra fica. */
const stepUp = (legs: Grid, left: boolean): Grid => (left ? shiftCols(legs, 3, 7, 2, -2) : shiftCols(legs, 8, 12, 2, -2));

/** Túnica de frente: um pé aparece mais à frente, o outro some sob a barra, que balança para o lado. */
function robeStep(robe: Grid, leftAhead: boolean, front: boolean): Grid {
  const [ahead, behind] = leftAhead ? [[3, 6], [9, 12]] : [[9, 12], [3, 6]];
  const feet = clear(front ? shiftCols(robe, ahead[0], ahead[1], 6, 1) : robe, behind[0], behind[1], 6, 7);
  return shiftRows(feet, 4, 5, leftAhead ? -1 : 1);
}

/** Quadros [parado, passo 1, passo 2]; a mão `steady` não balança (segura o cajado fincado no chão). */
function poses(kind: BodyKind, dir: HeroDir, steady?: 0 | 1): Pose[] {
  const robe = kind === "robe";
  if (dir === "side") {
    const torso = robe ? ROBE_TORSO_SIDE : TORSO_SIDE;
    const legs = robe ? ROBE_SIDE : LEGS_SIDE;
    // O braço balança ao contrário da perna da frente.
    return [0, 1, -1].map((arm, f) => ({ torso: sideArm(torso, arm), legs: legs[f], bob: f ? 1 : 0, hands: [0, 0] }));
  }
  const front = dir === "down";
  const base = front ? TORSO_DOWN : TORSO_UP;
  const torso = robe ? robeTop(base) : base;
  const legs = robe ? (front ? ROBE_DOWN : ROBE_UP) : front ? LEGS_DOWN : LEGS_UP;
  const step = (leftAhead: boolean) => robe ? robeStep(legs, leftAhead, front) : front ? stepDown(legs, leftAhead) : stepUp(legs, leftAhead);
  // Perna esquerda à frente → mão direita à frente (desce) e esquerda para trás (sobe).
  const pose = (leftAhead: boolean): Pose => {
    const hands: [number, number] = leftAhead ? [-1, 1] : [1, -1];
    if (steady !== undefined) hands[steady] = 0;
    return { torso: swingArms(torso, hands), legs: step(leftAhead), bob: 1, hands };
  };
  return [{ torso, legs, bob: 0, hands: [0, 0] }, pose(true), pose(false)];
}


// --- Arma da classe -----------------------------------------------------------

/** Detalhe da classe; o que é da cabeça (`ofHead`, como a barba) some sob o capacete. */
interface Extra extends Piece {
  ofHead?: boolean;
}

interface Item extends Piece {
  /** Mão que segura (balança junto); sem ela, a peça só acompanha o corpo. */
  hand?: 0 | 1;
}

const SWORD: Grid = [".o.", "omo", "omo", "omo", "omo", "oMo", "qqq", ".W."];
/** Coluna do cabo da espada (onde a mão segura). */
const SWORD_GRIP = 1;
const BOW: Grid = ["wo.", "mwo", "m.w", "m.w", "m.w", "m.w", "m.w", "m.w", "mwo", "wo."];
const BOW_FLIPPED: Grid = BOW.map((row) => [...row].reverse().join(""));

/** Cajado de 23 linhas: topo próprio + haste de madeira até o chão. */
const staff = (top: Grid): Grid => [...top, ...Array(22 - top.length).fill("owWo"), ".oo."];
const ORB_STAFF = staff([".oo.", "oGgo", "ogGo", ".oo."]);
const LEAF_STAFF = staff(["g..g", ".gg.", "gwWg", ".wW."]);

/** Mão fechada por cima da haste (cajado e arco). */
const FIST: Grid = ["sS"];

/** Onde vai o escudo: coluna e linha do centro (no corpo) e se fica atrás dele. */
interface ShieldHand { cx: number; cy: number; behind?: boolean; hand?: 0 | 1 }

/** Escudo na mão esquerda; de lado, nas costas (a mão da frente segura arco ou cajado). */
const SHIELD_HANDS: Record<HeroDir, ShieldHand> = {
  down: { cx: 3, cy: 5, hand: 0 },
  up: { cx: 12, cy: 4, behind: true },
  side: { cx: 10, cy: 4, behind: true },
};

// --- Classes -----------------------------------------------------------------

interface HeroDef {
  palette: Palette;
  /** Cabeça sem capacete (com o chapéu ou capuz da classe). */
  heads: Record<HeroDir, Grid>;
  body: BodyKind;
  /** Arma da classe (ataque básico). */
  weapon: "sword" | "bow" | "staff";
  items: Record<HeroDir, Item[]>;
  /** Detalhes da classe por cima do tronco (ou atrás, com `behind`): capa, aljava, barba. */
  extras?: Partial<Record<HeroDir, Extra[]>>;
  shieldHands?: Partial<Record<HeroDir, ShieldHand>>;
}

/** Capa do cavaleiro, vista de costas (vai por cima da armadura). */
const KNIGHT_CAPE: Grid = [
  "oqqqqqqo",
  "oKKKKKQo",
  "oKKKKQQo",
  "oKKQKKQo",
  "oKKQKKQo",
  "oKKQKQQo",
  "oKQKKQQo",
  "oKQKKQQo",
  "oKQKQQQo",
  "oKQKQKQo",
  ".oooooo.",
];
/** Barra da capa aparecendo atrás do cavaleiro de lado. */
const KNIGHT_CAPE_SIDE: Grid = [
  "oqo.",
  "oKQo",
  "oKQo",
  "oKQo",
  "oKQo",
  "oKKQo",
  "oKKQo",
  "oKKQo",
  "oKQQo",
  ".ooo.",
].map((row) => row.padEnd(5, "."));

/** Aljava do paladino (penas vermelhas para fora). */
const QUIVER: Grid = [
  "f.f.",
  "mfmf",
  "owWo",
  "owWo",
  "owqo",
  "owWo",
  "owWo",
  "owqo",
  ".oo.",
];
/** Correia da aljava atravessando o peito. */
const STRAP: Grid = ["....W", "...W.", "..W..", ".W...", "W...."];

const HEROES: Record<ClassId, HeroDef> = {
  knight: {
    palette: {
      p: "#b8362d", P: "#76201a", r: "#dc5a45", q: "#e0b040",
      l: "#7d828d", L: "#50545e", h: "#6b4226", H: "#432814", a: "#94643a",
      K: "#2f4f8c", Q: "#1d3260",
    },
    heads: {
      down: [
        ".....oooooo.....",
        "...ooahhhhHoo...",
        "..oahhhhhhhHHo..",
        "..ohahhhhhhhHo..",
        "..ohhsshhsshHo..",
        "..ohsesssseSHo..",
        "...ossssssSSo...",
        "....ossSSsSo....",
        ".....oooooo.....",
      ],
      up: [
        ".....oooooo.....",
        "...ooahhhhHoo...",
        "..oahhhhhhhHHo..",
        "..ohahhhhhhhHo..",
        "..ohhhhhhhhhHo..",
        "..ohhhhhhhhHHo..",
        "...oHhhhhhHHo...",
        "....oSssssSo....",
        ".....oooooo.....",
      ],
      side: [
        "......ooooo.....",
        "....ooahhhHoo...",
        "...oahhhhhhhHo..",
        "..oahhhhhhhhHo..",
        "..osshhhhhhHHo..",
        "..oesShhShHHo...",
        "..osssShhhHHo...",
        "...oSssShHHo....",
        "....ooooooo.....",
      ],
    },
    body: "pants",
    weapon: "sword",
    items: {
      down: [{ grid: SWORD, x: 12, y: -1, hand: 1 }],
      up: [{ grid: SWORD, x: 1, y: -1, behind: true, hand: 0 }],
      side: [{ grid: SWORD, x: 9, y: -1, behind: true }],
    },
    extras: {
      up: [{ grid: KNIGHT_CAPE, x: 4, y: 0 }],
      side: [{ grid: KNIGHT_CAPE_SIDE, x: 9, y: 0, behind: true }],
    },
    // O cavaleiro segura o escudo à frente também de lado.
    shieldHands: { side: { cx: 4, cy: 4 } },
  },
  paladin: {
    palette: {
      p: "#d4a62a", P: "#8f6d12", r: "#f0cd5a", q: "#6b3f1f",
      l: "#6a4d2f", L: "#4a3420", h: "#e0c068", H: "#a8842e", a: "#f6e3a0", f: "#c8402f",
    },
    heads: {
      down: [
        ".....oooooo.....",
        "...ooahhhhHoo...",
        "..oahhhhhhhHHo..",
        "..oqqqqqqqqqqo..",
        "..ohssssssssHo..",
        "..ohsesssseSHo..",
        "..ohssssssSSHo..",
        "...oHsSSSsSHo...",
        "....oo....oo....",
      ],
      up: [
        ".....oooooo.....",
        "...ooahhhhHoo...",
        "..oahhhhhhhHHo..",
        "..oqqqqqqqqqqo..",
        "..ohahhhhhhhHo..",
        "..ohhhhhhhhHHo..",
        "..oHhhhhhhhHHo..",
        "...oHHhhhhHHo...",
        "....oooooooo....",
      ],
      side: [
        "......ooooo.....",
        "....ooahhhHoo...",
        "...oahhhhhhhHo..",
        "..oqqqqqqqqqqo..",
        "..osshhhhhhHHoq.",
        "..oesShhShHHoq..",
        "..osssShhhHHo...",
        "...oSssShHHHo...",
        "....oooooooo....",
      ],
    },
    body: "pants",
    weapon: "bow",
    items: {
      down: [{ grid: BOW, x: 12, y: -3, hand: 1 }],
      up: [{ grid: BOW_FLIPPED, x: 1, y: -3, behind: true, hand: 0 }],
      side: [{ grid: BOW_FLIPPED, x: 1, y: -3 }, { grid: FIST, x: 2, y: 2 }],
    },
    extras: {
      down: [{ grid: STRAP, x: 5, y: 1 }],
      up: [{ grid: QUIVER, x: 7, y: -3 }],
      side: [{ grid: QUIVER, x: 9, y: -3, behind: true }],
    },
  },
  sorcerer: {
    palette: {
      p: "#6a35a0", P: "#40206a", r: "#9460c8", q: "#e0b040",
      h: "#e6e2ea", H: "#a8a2b4", a: "#ffffff", g: "#5fd3ff", G: "#d8f6ff",
    },
    heads: {
      down: [
        "........oo......",
        ".......orPo.....",
        "......orpo......",
        "......orppo.....",
        ".....orpppPo....",
        ".....orpqpPo....",
        "....orrpppPPo...",
        "..ooqqqqqqqqqoo.",
        "...ossssssssSo..",
        "...osesssseSSo..",
        "...ohhhSShhhHo..",
        "....ohahhhhHo...",
        ".....ohhhhHo....",
      ],
      up: [
        "........oo......",
        ".......orPo.....",
        "......orpo......",
        "......orppo.....",
        ".....orpppPo....",
        ".....orpppPo....",
        "....orrpppPPo...",
        "..ooqqqqqqqqqoo.",
        "...oahhhhhhhHo..",
        "...ohhhhhhhhHo..",
        "...oHhhhhhhHHo..",
        "....oHhhhhHHo...",
        ".....oHHHHHo....",
      ],
      side: [
        ".........oo.....",
        "........oPro....",
        ".......orpo.....",
        "......orppo.....",
        ".....orpppPo....",
        ".....orpqpPo....",
        "....orrpppPPo...",
        "..ooqqqqqqqqqoo.",
        "..osssshahHHo...",
        "..oesShhhhHHo...",
        "..ohhhShhhHHo...",
        "..ohahhhhHHo....",
        "...ohhhhHo......",
      ],
    },
    body: "robe",
    weapon: "staff",
    items: {
      down: [{ grid: ORB_STAFF, x: 12, y: -7, hand: 1 }, { grid: FIST, x: 13, y: 6, hand: 1 }],
      up: [{ grid: ORB_STAFF, x: 0, y: -7, behind: true, hand: 0 }],
      side: [{ grid: ORB_STAFF, x: 2, y: -7 }, { grid: FIST, x: 3, y: 5 }],
    },
    extras: {
      // Ponta da barba sobre o peito.
      down: [{ grid: [".ohhHo.", "..ohHo.", "...oo.."], x: 5, y: 0, ofHead: true }],
      side: [{ grid: ["ohHo", ".oo."], x: 3, y: 0, ofHead: true }],
    },
  },
  druid: {
    palette: {
      p: "#3f8a3c", P: "#24562a", r: "#62b052", q: "#8a5a2a",
      h: "#7a4a22", H: "#4e2e14", a: "#a06a38", g: "#8fd64a", G: "#c8f08a",
    },
    heads: {
      down: [
        ".....oooooo.....",
        "...oogGpgGoo....",
        "..orgpppppgPo...",
        "..orppPPPPpPPo..",
        "..orPssssssPPo..",
        "..opsesssseSPo..",
        "..oPsssSssSSPo..",
        "...oPhhSShhPo...",
        "....oPhhhhPo....",
      ],
      up: [
        ".....oooooo.....",
        "...oogGpgGoo....",
        "..orgpppppgPo...",
        "..orpppppppPPo..",
        "..orppppppPPPo..",
        "..oppppppPPPPo..",
        "..oPppppppPPPo..",
        "...oPPppppPPo...",
        "....oPPPPPPo....",
      ],
      side: [
        "......ooooo.....",
        "....oogGpgGo....",
        "...orgppppgPo...",
        "..oPPPpppppPPo..",
        "..ossPpppppPPo..",
        "..oesPppppPPPo..",
        "..ossPpppPPPo...",
        "..ohhsPppPPo....",
        "...ohhoooooo....",
      ],
    },
    body: "robe",
    weapon: "staff",
    items: {
      down: [{ grid: LEAF_STAFF, x: 12, y: -7, hand: 1 }, { grid: FIST, x: 13, y: 6, hand: 1 }],
      up: [{ grid: LEAF_STAFF, x: 0, y: -7, behind: true, hand: 0 }],
      side: [{ grid: LEAF_STAFF, x: 2, y: -7 }, { grid: FIST, x: 3, y: 5 }],
    },
    extras: {
      // Broche de folha prendendo o manto.
      down: [{ grid: [".g.", "gGg"], x: 6, y: 0 }],
    },
  },
};

/** Arma na mão: a da classe, trocada (cavaleiro) ou tingida (as outras) pela arma equipada. */
function weaponPieces(hero: HeroDef, dir: HeroDir, outfit: Outfit): Item[] {
  const tier = tierOf(outfit, "weapon");
  return hero.items[dir].map((item) => {
    if (!tier || item.grid === FIST) return item;
    if (hero.weapon !== "sword") return { ...item, grid: tintClassWeapon(item.grid, hero.weapon) };
    // Mesmo cabo e mesma altura da mão da espada; de costas e de lado a lâmina aponta para fora.
    const art = KNIGHT_WEAPONS[tier];
    const flip = dir !== "down";
    const width = art.grid[0].length;
    const grip = flip ? width - 1 - art.grip : art.grip;
    const bottom = item.y + item.grid.length - 1;
    return { ...item, grid: art.grid, x: item.x + SWORD_GRIP - grip, y: bottom - art.grid.length + 1, flip };
  });
}

function shieldPiece(hero: HeroDef, dir: HeroDir, outfit: Outfit): Item[] {
  const tier = tierOf(outfit, "shield");
  if (!tier) return [];
  const grid = shieldGrid(tier, dir);
  const hand = hero.shieldHands?.[dir] ?? SHIELD_HANDS[dir];
  const x = hand.cx - Math.floor(grid[0].length / 2);
  const y = hand.cy - Math.floor(grid.length / 2);
  return [{ grid, x, y, behind: hand.behind, hand: hand.hand }];
}

/**
 * Folha de sprites da classe vestindo `outfit`: 9 quadros de 32×32 em linha
 * (`direção * 3 + quadro`), virados para a esquerda no lado.
 */
export function heroSheet(classId: ClassId, outfit: Outfit = NO_OUTFIT): HTMLCanvasElement {
  const hero = HEROES[classId];
  const palette = { ...BASE, ...hero.palette, ...outfitPalette(outfit) };
  const armor = tierOf(outfit, "armor");
  const helmet = tierOf(outfit, "helmet");
  const { canvas, ctx } = makeCanvas(HERO_SIZE * HERO_DIRS.length * HERO_FRAMES, HERO_SIZE);
  HERO_DIRS.forEach((dir, d) => {
    const head = helmet ? helmetHead(helmet, dir) : hero.heads[dir];
    const items = [...weaponPieces(hero, dir, outfit), ...shieldPiece(hero, dir, outfit)];
    const extras = (hero.extras?.[dir] ?? []).filter((p) => !(helmet && p.ofHead));
    const shoulders = armor ? pauldrons(armor, dir) : [];
    // Quem usa cajado não balança a mão que o segura.
    const steady = hero.weapon === "staff" && dir !== "side" ? hero.items[dir][0].hand : undefined;
    poses(hero.body, dir, steady).forEach((pose, f) => {
      const ox = (d * HERO_FRAMES + f) * HERO_SIZE + BOX_X;
      const top = BODY_TOP + pose.bob;
      const torso = armor ? armorBody(pose.torso, armor, dir === "down") : pose.torso;
      const paint = (list: Item[]) => list.forEach((p) => {
        const dy = p.hand === undefined ? 0 : pose.hands[p.hand];
        paintGrid(ctx, p.grid, palette, ox + p.x, top + p.y + dy, p.flip);
      });
      const behind = [...items, ...extras].filter((p) => p.behind);
      paint(behind);
      paintGrid(ctx, pose.legs, palette, ox, BODY_TOP + LEGS_ROW);
      paintGrid(ctx, torso, palette, ox, top);
      paint(shoulders);
      paint(extras.filter((p) => !p.behind));
      paintGrid(ctx, head, palette, ox, top - head.length);
      paint(items.filter((p) => !p.behind));
    });
  });
  return canvas;
}

/** Quadro parado de cada direção pedida, lado a lado (retratos e prévia do equipamento). */
export function heroPoses(classId: ClassId, outfit: Outfit = NO_OUTFIT, dirs: HeroDir[] = ["down", "side", "up"]) {
  const sheet = heroSheet(classId, outfit);
  const { canvas, ctx } = makeCanvas(HERO_SIZE * dirs.length, HERO_SIZE);
  dirs.forEach((dir, i) => {
    const frame = HERO_DIRS.indexOf(dir) * HERO_FRAMES;
    ctx.drawImage(sheet, frame * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, i * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE);
  });
  return canvas;
}
