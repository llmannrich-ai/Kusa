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
 * Cada classe = cabeça própria + corpo (calça ou túnica) + arma da classe na mão, todos com a mesma
 * paleta de letras. Por cima entra o equipamento vestido (`outfit.ts`): a armadura recobre o tronco,
 * o capacete troca a cabeça, o escudo vai na outra mão e a arma muda de forma ou de material.
 * A folha final tem 9 quadros em linha: `direção * 3 + quadro`.
 */

export type HeroDir = "down" | "up" | "side";
export const HERO_DIRS: HeroDir[] = ["down", "up", "side"];
export const HERO_FRAMES = 3;
export const HERO_SIZE = 32;

/** Caixa de 16 colunas centralizada no quadro; o corpo termina na linha 30 (pés). */
const BOX_X = 8;
const FEET_ROW = 30;

const BASE: Palette = {
  o: "#140d0a", // contorno
  s: "#e3b48a", // pele
  S: "#b9835c",
  e: "#2a160c", // olhos
  b: "#4a2e1c", // botas
  m: "#d2d6de", // metal
  M: "#7d8593",
  w: "#9a6a36", // madeira
  W: "#5e3c1c",
};

// --- Corpos ----------------------------------------------------------------
// Desenhados compactos e depois esticados (tronco e pernas) para ficarem na altura dos monstros do pack.

/** Repete as linhas indicadas (índices da grade original). */
function stretch(grid: Grid, rows: number[]): Grid {
  return grid.flatMap((row, i) => [row, ...rows.filter((r) => r === i).map(() => row)]);
}

const PANTS_DOWN_BASE: Grid = [
  "....oopqqpoo....",
  "...oPppppppPo...",
  "..oPPppppppPPo..",
  "..oPoppppppoPo..",
  "..oPoppppppoPo..",
  "..osoqqqqqqoso..",
  "...ooppppppoo...",
  "....olLoolLo....",
  "....olLoolLo....",
  "....olLoolLo....",
  "....obboobbo....",
  "....obboobbo....",
  "....oooooooo....",
];

const PANTS_SIDE_BASE: Grid = [
  ".....oppqo......",
  "....oPpppPo.....",
  "....oPpppPPo....",
  "....opPPpppo....",
  "....opPPpppo....",
  "....oqsqqqqo....",
  ".....oppppo.....",
  ".....olLLlo.....",
  ".....olLLlo.....",
  ".....olLLlo.....",
  ".....obbbbo.....",
  "....obbbbbo.....",
  "....oooooo......",
];

/** Lado, passo largo: uma perna à frente e outra atrás. */
const PANTS_SIDE_STRIDE_BASE: Grid = [
  ...PANTS_SIDE_BASE.slice(0, 7),
  "....olLoLlo.....",
  "...olLo.oLlo....",
  "...olLo.oLlo....",
  "..obbo...obbo...",
  ".obbbo...obbo...",
  ".ooooo...oooo...",
];

const ROBE_DOWN_BASE: Grid = [
  "....oopqqpoo....",
  "...oPppppppPo...",
  "..oPPpppqppPPo..",
  "..oPopppqppoPo..",
  "..oPopppqppoPo..",
  "..osoqqqqqqoso..",
  "...opppqpppPo...",
  "...opppqpppPo...",
  "...oppppqppPPo..",
  "..opppppqppPPo..",
  "..opppppqppPPo..",
  "..oqqqqqqqqqqo..",
  "...obbo..obbo...",
];

const ROBE_SIDE_BASE: Grid = [
  ".....oppqo......",
  "....oPpppPo.....",
  "....oPpppPPo....",
  "....opPPpppo....",
  "....opPPpppo....",
  "....oqsqqqqo....",
  ".....opppPo.....",
  ".....opppPo.....",
  "....oppppPPo....",
  "....oppppPPo....",
  "...opppppPPo....",
  "...oqqqqqqqo....",
  "...obbbbo.......",
];

const ROBE_SIDE_STRIDE_BASE: Grid = [...ROBE_SIDE_BASE.slice(0, 12), "..obbo..obbo...."];

const PANTS_DOWN = stretch(PANTS_DOWN_BASE, [3, 7, 7]);
const PANTS_SIDE = stretch(PANTS_SIDE_BASE, [3, 7, 7]);
const PANTS_SIDE_STRIDE = stretch(PANTS_SIDE_STRIDE_BASE, [3, 8, 8]);
const ROBE_DOWN = stretch(ROBE_DOWN_BASE, [3, 7, 9]);
const ROBE_SIDE = stretch(ROBE_SIDE_BASE, [3, 7, 9]);
const ROBE_SIDE_STRIDE = stretch(ROBE_SIDE_STRIDE_BASE, [3, 7, 9]);
/** Primeira linha das pernas depois de esticar (onde começa o passo). */
const LEG_ROW = 8;

/** Costas: a mesma silhueta da frente, sem a fivela/gola. */
const backOf = (grid: Grid): Grid => [grid[0].replace("pqqp", "pppP"), ...grid.slice(1)];

/** Ergue um pixel as colunas [x0, x1] da linha `fromRow` para baixo (perna levantada). */
function lift(grid: Grid, x0: number, x1: number, fromRow: number): Grid {
  return grid.map((row, y) => {
    if (y < fromRow) return row;
    const below = grid[y + 1] ?? ".".repeat(row.length);
    return row.slice(0, x0) + below.slice(x0, x1 + 1) + row.slice(x1 + 1);
  });
}

/** Apaga as colunas [x0, x1] da última linha (pé escondido sob a túnica). */
function hideFoot(grid: Grid, x0: number, x1: number): Grid {
  const last = grid.length - 1;
  return grid.map((row, y) => (y === last ? row.slice(0, x0) + ".".repeat(x1 - x0 + 1) + row.slice(x1 + 1) : row));
}

type BodyKind = "pants" | "robe";

/** Quadros [parado, passo 1, passo 2] de cada direção. */
const BODIES: Record<BodyKind, Record<HeroDir, Grid[]>> = {
  pants: {
    down: [PANTS_DOWN, lift(PANTS_DOWN, 4, 7, LEG_ROW), lift(PANTS_DOWN, 8, 11, LEG_ROW)],
    up: [backOf(PANTS_DOWN), lift(backOf(PANTS_DOWN), 8, 11, LEG_ROW), lift(backOf(PANTS_DOWN), 4, 7, LEG_ROW)],
    side: [PANTS_SIDE, PANTS_SIDE_STRIDE, PANTS_SIDE_STRIDE],
  },
  robe: {
    down: [ROBE_DOWN, hideFoot(ROBE_DOWN, 8, 12), hideFoot(ROBE_DOWN, 3, 7)],
    up: [backOf(ROBE_DOWN), hideFoot(backOf(ROBE_DOWN), 3, 7), hideFoot(backOf(ROBE_DOWN), 8, 12)],
    side: [ROBE_SIDE, ROBE_SIDE_STRIDE, ROBE_SIDE_STRIDE],
  },
};

// --- Arma da classe -----------------------------------------------------------

interface Item {
  grid: Grid;
  /** Posição dentro da caixa de 16 colunas; `y` relativo ao topo do corpo. */
  x: number;
  y: number;
  behind?: boolean;
}

const SWORD: Grid = [".o.", "omo", "omo", "omo", "omo", "oMo", "qqq", ".W."];
/** Coluna do cabo da espada (onde a mão segura). */
const SWORD_GRIP = 1;
const BOW: Grid = ["wo.", "mwo", "m.w", "m.w", "m.w", "m.w", "m.w", "m.w", "mwo", "wo."];
const BOW_FLIPPED: Grid = BOW.map((row) => [...row].reverse().join(""));

/** Cajado de 23 linhas: topo próprio + haste de madeira até o chão. */
const staff = (top: Grid): Grid => [...top, ...Array(22 - top.length).fill("owWo"), ".oo."];
const ORB_STAFF = staff([".oo.", "oggo", "oGgo", ".oo."]);
const LEAF_STAFF = staff(["g..g", ".gg.", "gwWg", ".wW."]);

/** Onde vai o escudo: coluna e linha do centro (no corpo) e se fica atrás dele. */
interface ShieldHand { cx: number; cy: number; behind?: boolean }

/** Escudo na mão esquerda; de lado, nas costas (a mão da frente segura arco ou cajado). */
const SHIELD_HANDS: Record<HeroDir, ShieldHand> = {
  down: { cx: 3, cy: 4 },
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
  shieldHands?: Partial<Record<HeroDir, ShieldHand>>;
}

const HEROES: Record<ClassId, HeroDef> = {
  knight: {
    palette: { p: "#b0332b", P: "#701c17", q: "#e0b040", l: "#7a7f8a", L: "#50545e", h: "#6b4226", H: "#432814" },
    heads: {
      down: [
        "......oooo......",
        "....oohhhhoo....",
        "...ohhhhhhhho...",
        "...ohHhhhhHho...",
        "...ohssssssho...",
        "...oseSssSeso...",
        "...osssssssso...",
        "....oSssssSo....",
        ".....oooooo.....",
      ],
      up: [
        "......oooo......",
        "....oohhhhoo....",
        "...ohhhhhhhho...",
        "...ohhhhhhhho...",
        "...ohhHhhHhho...",
        "...ohhhhhhhho...",
        "...oHhhhhhhHo...",
        "....oHssssHo....",
        ".....oooooo.....",
      ],
      side: [
        ".....oooo.......",
        "...oohhhhoo.....",
        "..ohhhhhhhho....",
        "..ohHhhhhhho....",
        "..osshhhhhho....",
        "..oseShhhhho....",
        "..osssshhhho....",
        "...oSsshhHo.....",
        "....ooooooo.....",
      ],
    },
    body: "pants",
    weapon: "sword",
    items: {
      down: [{ grid: SWORD, x: 12, y: -1 }],
      up: [{ grid: SWORD, x: 1, y: -1, behind: true }],
      side: [{ grid: SWORD, x: 9, y: -1, behind: true }],
    },
    // O cavaleiro segura o escudo à frente também de lado.
    shieldHands: { side: { cx: 4, cy: 4 } },
  },
  paladin: {
    palette: { p: "#d9ad2c", P: "#8f6d12", q: "#6b3f1f", l: "#6a4d2f", L: "#4a3420", h: "#8a6435", H: "#5e4222" },
    heads: {
      down: [
        "......oooo......",
        "....oohhhhoo....",
        "...ohhhhhhhho...",
        "...ohHHHHHHho...",
        "...ohssssssho...",
        "...ohesSSseho...",
        "...ohssssssho...",
        "...ohhssssHho...",
        "....ohhhhhho....",
      ],
      up: [
        "......oooo......",
        "....oohhhhoo....",
        "...ohhhhhhhho...",
        "...ohhhhhhhho...",
        "...ohhHhhHhho...",
        "...ohhhhhhhho...",
        "...oHhhhhhhHo...",
        "...oHHhhhhHHo...",
        "....oHHHHHHo....",
      ],
      side: [
        ".....oooo.......",
        "...oohhhhoo.....",
        "..ohhhhhhhho....",
        "..oHHHhhhhho....",
        "..ossshhhhho....",
        "..oesShhHhho....",
        "..osssshhhho....",
        "...oSsshhHo.....",
        "....ohhhhhho....",
      ],
    },
    body: "pants",
    weapon: "bow",
    items: {
      down: [{ grid: BOW, x: 12, y: -3 }],
      up: [{ grid: BOW_FLIPPED, x: 1, y: -3, behind: true }],
      side: [{ grid: BOW_FLIPPED, x: 1, y: -3 }],
    },
  },
  sorcerer: {
    palette: { p: "#6a35a0", P: "#40206a", q: "#e0b040", h: "#e6e2ea", H: "#a8a2b4", g: "#5fd3ff", G: "#d8f6ff" },
    heads: {
      down: [
        ".......oo.......",
        "......opPo......",
        "......oppo......",
        ".....opppPo.....",
        ".....oppppo.....",
        "....oppppPPo....",
        "..ooqqqqqqqqoo..",
        "...oossssssoo...",
        "....oesSSseo....",
        "....oshhhhso....",
        ".....ohhhho.....",
      ],
      up: [
        ".......oo.......",
        "......opPo......",
        "......oppo......",
        ".....opppPo.....",
        ".....oppppo.....",
        "....oppppPPo....",
        "..ooqqqqqqqqoo..",
        "...oohhhhhhoo...",
        "....ohhhhhho....",
        "....oHhhhhHo....",
        ".....oHHHHo.....",
      ],
      side: [
        "........oo......",
        ".......oPpo.....",
        "......oppo......",
        ".....opppPo.....",
        ".....oppppo.....",
        "....opppppPo....",
        "..ooqqqqqqqqoo..",
        "...osssshhoo....",
        "...oessShhho....",
        "...ohhhshhho....",
        "....ohhhhho.....",
      ],
    },
    body: "robe",
    weapon: "staff",
    items: {
      down: [{ grid: ORB_STAFF, x: 12, y: -7 }],
      up: [{ grid: ORB_STAFF, x: 0, y: -7, behind: true }],
      side: [{ grid: ORB_STAFF, x: 1, y: -7 }],
    },
  },
  druid: {
    palette: { p: "#3f8a3c", P: "#24562a", q: "#8a5a2a", h: "#7a4a22", H: "#4e2e14", g: "#8fd64a", G: "#c8f08a" },
    heads: {
      down: [
        "......oooo......",
        "....oogpgpoo....",
        "...opgpppgpPo...",
        "...oppPPPPppo...",
        "...opssssssPo...",
        "...opesSSesPo...",
        "...opssssssPo...",
        "...oppshhsPPo...",
        "....oPPhhPPo....",
      ],
      up: [
        "......oooo......",
        "....oogpgpoo....",
        "...opgpppgpPo...",
        "...opppppppPo...",
        "...oppPpppPPo...",
        "...opppppppPo...",
        "...oPpppppPPo...",
        "...oPPppppPPo...",
        "....oPPPPPPo....",
      ],
      side: [
        ".....oooo.......",
        "...oogpgpoo.....",
        "..opgpppgpPo....",
        "..oPPPpppppo....",
        "..osssPppppo....",
        "..oesSPpppPo....",
        "..osssPpppPo....",
        "...ohhsPpPo.....",
        "....oPPPPPo.....",
      ],
    },
    body: "robe",
    weapon: "staff",
    items: {
      down: [{ grid: LEAF_STAFF, x: 12, y: -7 }],
      up: [{ grid: LEAF_STAFF, x: 0, y: -7, behind: true }],
      side: [{ grid: LEAF_STAFF, x: 1, y: -7 }],
    },
  },
};

/** Arma na mão: a da classe, trocada (cavaleiro) ou tingida (as outras) pela arma equipada. */
function weaponPieces(hero: HeroDef, dir: HeroDir, outfit: Outfit): Piece[] {
  const tier = tierOf(outfit, "weapon");
  return hero.items[dir].map((item) => {
    if (!tier) return item;
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

function shieldPiece(hero: HeroDef, dir: HeroDir, outfit: Outfit): Piece[] {
  const tier = tierOf(outfit, "shield");
  if (!tier) return [];
  const grid = shieldGrid(tier, dir);
  const hand = hero.shieldHands?.[dir] ?? SHIELD_HANDS[dir];
  const x = hand.cx - Math.floor(grid[0].length / 2);
  const y = hand.cy - Math.floor(grid.length / 2);
  return [{ grid, x, y, behind: hand.behind }];
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
    const pieces = [...weaponPieces(hero, dir, outfit), ...shieldPiece(hero, dir, outfit)];
    const shoulders = armor ? pauldrons(armor, dir) : [];
    BODIES[hero.body][dir].forEach((frame, f) => {
      const ox = (d * HERO_FRAMES + f) * HERO_SIZE + BOX_X;
      const body = armor ? armorBody(frame, armor, dir === "down") : frame;
      const top = FEET_ROW + 1 - body.length;
      const paint = (list: Piece[]) => list.forEach((p) => paintGrid(ctx, p.grid, palette, ox + p.x, top + p.y, p.flip));
      paint(pieces.filter((p) => p.behind));
      paintGrid(ctx, body, palette, ox, top);
      paint(shoulders);
      paintGrid(ctx, head, palette, ox, top - head.length);
      paint(pieces.filter((p) => !p.behind));
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
