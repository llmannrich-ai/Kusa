import { ITEMS, type ItemSlot, type ItemTier } from "@kusa/shared";
import { MATERIALS } from "./items.ts";
import type { Grid, Palette } from "./pixels.ts";
import type { HeroDir } from "./heroes.ts";

/**
 * Como cada item aparece vestido no herói (32×32). Cada camada tem letras próprias para não
 * brigar com as cores da classe:
 * armadura x/X/y, capacete c/C/k, escudo u/U/v e arma n/N/j (claro, escuro e detalhe do material).
 */

/** Ids dos itens vestidos por slot ("" = vazio). */
export type Outfit = Record<ItemSlot, string>;
export const NO_OUTFIT: Outfit = { weapon: "", helmet: "", armor: "", shield: "" };

/** Roupa de quem tem os slots como campos (o jogador sincronizado pelo servidor). */
export function outfitOf(p: Readonly<Outfit>): Outfit {
  return { weapon: p.weapon, helmet: p.helmet, armor: p.armor, shield: p.shield };
}

const LAYER_LETTERS: Record<ItemSlot, [string, string, string]> = {
  armor: ["x", "X", "y"],
  helmet: ["c", "C", "k"],
  shield: ["u", "U", "v"],
  weapon: ["n", "N", "j"],
};

/** Paleta das camadas vestidas: o material de cada item nas letras do seu slot. */
export function outfitPalette(outfit: Outfit): Palette {
  const palette: Record<string, string> = { i: "#efe3c8" }; // marfim (chifres)
  for (const slot of Object.keys(LAYER_LETTERS) as ItemSlot[]) {
    const tier = tierOf(outfit, slot);
    if (!tier) continue;
    const { m, M, a } = MATERIALS[tier];
    const [light, dark, accent] = LAYER_LETTERS[slot];
    Object.assign(palette, { [light]: m, [dark]: M, [accent]: a });
  }
  return palette;
}

export function tierOf(outfit: Outfit, slot: ItemSlot): ItemTier | 0 {
  const item = ITEMS[outfit[slot]];
  return item?.slot === slot ? item.tier : 0;
}

/** Chave estável de uma roupa (texturas e cache de retratos). */
export function outfitKey(outfit: Outfit) {
  return [outfit.weapon, outfit.helmet, outfit.armor, outfit.shield].map((id) => id || "-").join(".");
}

// --- Capacetes -----------------------------------------------------------------
// Substituem a cabeça inteira da classe (chapéu, capuz ou cabelo): 16×9, como as cabeças de `heroes.ts`.
// "h"/"H" = cabelo da classe, que aparece onde o capacete não cobre.

const HELMETS: Record<ItemTier, Record<HeroDir, Grid>> = {
  // Gorro de couro: touca macia com faixa.
  1: {
    down: [
      "................",
      "......oooo......",
      "....oocccCoo....",
      "...occcccccCo...",
      "...okkkkkkkko...",
      "...ohssssssho...",
      "...oseSssSeso...",
      "....osssssso....",
      ".....oooooo.....",
    ],
    up: [
      "................",
      "......oooo......",
      "....oocccCoo....",
      "...occcccccCo...",
      "...okkkkkkkko...",
      "...ohhhhhhhho...",
      "...oHhhhhhhHo...",
      "....oHssssHo....",
      ".....oooooo.....",
    ],
    side: [
      "................",
      ".....oooo.......",
      "...oocccCoo.....",
      "..occcccccCo....",
      "..okkkkkkkko....",
      "..osshhhhhho....",
      "..oseShhhhho....",
      "...osssshHo.....",
      "....ooooooo.....",
    ],
  },
  // Elmo de bronze: aberto, com crista e protetores de bochecha.
  2: {
    down: [
      ".......kk.......",
      "......okko......",
      "....oockkcoo....",
      "...occckkccCo...",
      "..oCCCCCCCCCCo..",
      "...oCssssssCo...",
      "...oCeSssSeCo...",
      "....oCssssCo....",
      ".....oooooo.....",
    ],
    up: [
      ".......kk.......",
      "......okko......",
      "....oockkcoo....",
      "...occckkccCo...",
      "..oCCCCCCCCCCo..",
      "...ohhhhhhhho...",
      "...oHhhhhhhHo...",
      "....oHssssHo....",
      ".....oooooo.....",
    ],
    side: [
      "......kkkk......",
      ".....okkkko.....",
      "...oocccccCo....",
      "..occcccccCCo...",
      ".oCCCCCCCCCCCo..",
      "..osCChhhhho....",
      "..oeSChhhhho....",
      "...osCshhHo.....",
      "....ooooooo.....",
    ],
  },
  // Elmo de ferro: redondo, com rebites e protetor de nariz.
  3: {
    down: [
      "......oooo......",
      "....oocccCoo....",
      "...occcccccCo...",
      "...ocCcccccCo...",
      "...oCkCCCCkCo...",
      "...oCsCccsCCo...",
      "...oCeSccSeCo...",
      "....oCsccsCo....",
      ".....oooooo.....",
    ],
    up: [
      "......oooo......",
      "....oocccCoo....",
      "...occcccccCo...",
      "...occcccccCo...",
      "...oCkCCCCkCo...",
      "...oCccccccCo...",
      "...oCccccccCo...",
      "....oCCCCCCo....",
      ".....oooooo.....",
    ],
    side: [
      ".....oooo.......",
      "...oocccCoo.....",
      "..occcccccCo....",
      "..ocCcccccCo....",
      "..oCkCCCkCCo....",
      ".occsCccccCo....",
      ".oCeSCccccCo....",
      "..oosCCcCCo.....",
      "....ooooooo.....",
    ],
  },
  // Elmo de aço: fechado, com viseira e penacho azul.
  4: {
    down: [
      "......okko......",
      ".....okkkko.....",
      "....oocckCoo....",
      "...occcccccCo...",
      "...occcccccCo...",
      "...ooeooooeoo...",
      "...oCcCccCcCo...",
      "....oCcCCcCo....",
      ".....oooooo.....",
    ],
    up: [
      "......okko......",
      ".....okkkko.....",
      "....oockkkoo....",
      "...occckkkcCo...",
      "...occcccccCo...",
      "...oCcccccCCo...",
      "...oCcccccCCo...",
      "....oCCCCCCo....",
      ".....oooooo.....",
    ],
    side: [
      "........okk.....",
      "......okkkko....",
      "...ooockkkkko...",
      "..occcccccCo....",
      "..occcccccCo....",
      "..oeooccccCo....",
      "..oCCccccCCo....",
      "...oCcCcCCo.....",
      "....ooooooo.....",
    ],
  },
  // Elmo do dragão: vermelho, com chifres de marfim e guarnição dourada.
  5: {
    down: [
      ".oi..........io.",
      ".oio..oooo..oio.",
      "..oiooccCCooio..",
      "...okcccccCko...",
      "...oCkkkkkkCo...",
      "...oCssssssCo...",
      "...oCeSkkSeCo...",
      "....oCskksCo....",
      ".....oooooo.....",
    ],
    up: [
      ".oi..........io.",
      ".oio..oooo..oio.",
      "..oiooccCCooio..",
      "...okcccccCko...",
      "...oCkkkkkkCo...",
      "...oCcccccCCo...",
      "...oCccCccCCo...",
      "....oCCkkCCo....",
      ".....oooooo.....",
    ],
    side: [
      ".........oi.....",
      ".....oooooio....",
      "...ooccCCoio....",
      "..okcccccCko....",
      "..oCkkkkkkCo....",
      "..okssCcccCo....",
      "..oeSkCcCcCo....",
      "...oksCCkCo.....",
      "....ooooooo.....",
    ],
  },
};

export function helmetHead(tier: ItemTier, dir: HeroDir): Grid {
  return HELMETS[tier][dir];
}

// --- Armaduras -----------------------------------------------------------------
// Recobrem o tronco dos corpos de `heroes.ts` (linhas 0 a 6; a 6 é o cinto com as mãos):
// a roupa da classe (p/P/q) vira o material com o padrão de cada nível. Calça e saia continuam da classe.

export const ARMOR_ROWS = 7;
const BELT_ROW = ARMOR_ROWS - 1;

/** Letra do pixel `ch` em (x, y) do tronco coberto pela armadura de nível `tier`. */
export function armorPixel(tier: ItemTier, front: boolean, x: number, y: number, ch: string): string {
  if (ch === "P") return "X";
  if (ch === "q") return y === BELT_ROW && tier === 1 && !(front && (x === 7 || x === 8)) ? "X" : "y";
  if (ch !== "p") return ch;
  const center = x === 7 || x === 8;
  switch (tier) {
    case 1: // Gibão de couro: amarração cruzada no peito.
      return front && center && y >= 1 && y <= 5 ? ((x + y) % 2 ? "y" : "X") : "x";
    case 2: // Couraça de bronze: peitoral polido e a borda das placas.
      if (front && y === 2 && (x === 5 || x === 10)) return "y";
      return y === 5 ? "X" : "x";
    case 3: // Cota de malha: anéis alternados.
      return (x + y) % 2 ? "X" : "x";
    case 4: // Armadura de placas: faixas horizontais e gema azul no peito.
      if (front && center && y === 2) return "y";
      return y === 3 || y === 5 ? "X" : "x";
    case 5: // Escamas de dragão: escamas em fileiras desencontradas e amuleto de ouro.
      if (front && center && y === 1) return "y";
      return (x + (y % 2) * 2) % 4 === 0 ? "X" : "x";
  }
}

/** Aplica a armadura no tronco de um corpo. */
export function armorBody(body: Grid, tier: ItemTier, front: boolean): Grid {
  return body.map((row, y) => (y >= ARMOR_ROWS ? row : [...row].map((ch, x) => armorPixel(tier, front, x, y, ch)).join("")));
}

/** Ombreiras das armaduras pesadas: [frente/costas, lado], posição dentro da caixa de 16 colunas. */
const PAULDRONS: Partial<Record<ItemTier, { pair: Grid; side: Grid }>> = {
  4: {
    pair: [".ooo", "oxxX", "oXXo", ".oo."],
    side: [".oo.", "oxxo", "oXXo", ".oo."],
  },
  5: {
    pair: ["o...", "yoo.", "oxxX", "oXXo", ".oo."],
    side: ["..o.", ".oyo", "oxxo", "oXXo", ".oo."],
  },
};

export interface Piece {
  grid: Grid;
  x: number;
  y: number;
  flip?: boolean;
  behind?: boolean;
}

export function pauldrons(tier: ItemTier, dir: HeroDir): Piece[] {
  const p = PAULDRONS[tier];
  if (!p) return [];
  // A base da ombreira fica na linha 3 do tronco.
  if (dir === "side") return [{ grid: p.side, x: 6, y: 4 - p.side.length }];
  const y = 4 - p.pair.length;
  return [{ grid: p.pair, x: 1, y }, { grid: p.pair, x: 11, y, flip: true }];
}

// --- Escudos -------------------------------------------------------------------

const SHIELDS: Record<ItemTier, Grid> = {
  // Broquel de madeira: tábuas com um cravo no meio.
  1: [
    ".ooo.",
    "ouUuo",
    "oUvUo",
    "ouUuo",
    ".ooo.",
  ],
  // Escudo de bronze: redondo, com aro e bossa.
  2: [
    ".oooo.",
    "ovuuvo",
    "ouvvUo",
    "ouvvUo",
    "ovUUvo",
    ".oooo.",
  ],
  // Escudo de ferro: formato de ferro de engomar, faixa de couro.
  3: [
    "ooooo",
    "ouuUo",
    "ovvvo",
    "ouuUo",
    "ouuUo",
    ".oUo.",
    "..o..",
  ],
  // Escudo de aço: alto, com cruz azul.
  4: [
    "oooooo",
    "ouvvUo",
    "ouvvUo",
    "ovvvvo",
    "ouvvUo",
    "ouvvUo",
    ".ouUo.",
    "..oo..",
  ],
  // Escudo do dragão: aro e olho de dragão dourados.
  5: [
    "ooooooo",
    "ovuuuvo",
    "ouuvuUo",
    "ouvovUo",
    "ouuvuUo",
    ".ovuUo.",
    "..ovo..",
    "...o...",
  ],
};

/** Costas do escudo: madeira lisa com a alça no meio. */
const shieldBack = (grid: Grid): Grid => grid.map((row) => {
  const mid = Math.floor(row.length / 2);
  return [...row].map((ch, x) => (ch === "o" || ch === "." ? ch : x === mid ? "W" : "U")).join("");
});

export function shieldGrid(tier: ItemTier, dir: HeroDir): Grid {
  return dir === "up" ? shieldBack(SHIELDS[tier]) : SHIELDS[tier];
}

// --- Armas ---------------------------------------------------------------------
// O cavaleiro empunha a arma do item. As outras classes mantêm a arma da classe (arco ou cajado,
// que é o ataque básico delas) com o material da arma equipada.

export interface WeaponArt {
  grid: Grid;
  /** Coluna do cabo (onde a mão segura); a última linha da grade fica na altura da mão. */
  grip: number;
}

export const KNIGHT_WEAPONS: Record<ItemTier, WeaponArt> = {
  // Porrete: madeira grossa com um nó.
  1: {
    grip: 1,
    grid: [
      ".oo.",
      "onno",
      "onjo",
      "onNo",
      "onNo",
      ".oNo",
      ".oNo",
      ".oNo",
    ],
  },
  // Espada de bronze.
  2: {
    grip: 2,
    grid: [
      "..o..",
      ".ono.",
      ".ono.",
      ".ono.",
      ".ono.",
      ".oNo.",
      "ojjjo",
      "..W..",
    ],
  },
  // Machado de ferro: lâmina para fora, cabo de madeira.
  3: {
    grip: 1,
    grid: [
      ".o...",
      "oWoo.",
      "oWnno",
      "oWnNo",
      "oWnno",
      "oWoo.",
      "oWo..",
      "oWo..",
      "ojo..",
      ".W...",
    ],
  },
  // Espada longa de aço: lâmina comprida e guarda azul.
  4: {
    grip: 2,
    grid: [
      "..o..",
      ".ono.",
      ".ono.",
      ".ono.",
      ".ono.",
      ".ono.",
      ".ono.",
      ".oNo.",
      "ojjjo",
      "..W..",
      "..j..",
    ],
  },
  // Lâmina do dragão: rubra, curva, com guarda de asas douradas.
  5: {
    grip: 2,
    grid: [
      "...o.",
      "..ono",
      "..ono",
      ".onNo",
      ".onNo",
      ".onNo",
      ".onNo",
      ".onNo",
      "jojoj",
      "ojjjo",
      "..N..",
      "..j..",
    ],
  },
};

/** Arma da classe com o material da arma equipada: madeira do arco ou da haste vira o material, com anéis no detalhe. */
export function tintClassWeapon(grid: Grid, kind: "bow" | "staff"): Grid {
  if (kind === "bow") {
    const last = grid.length - 1;
    return grid.map((row, y) => row.replace(/w/g, y === 0 || y === last ? "j" : "n"));
  }
  // Cajado: a parte de cima da haste ganha uma luva do material entre dois anéis.
  return grid.map((row, y) => {
    if (row !== "owWo") return row;
    if (y === 4 || y === 9) return "ojjo";
    return y < 9 ? "onNo" : row;
  });
}
