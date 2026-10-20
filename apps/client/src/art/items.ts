import { ITEMS, isPotion, type ItemSlot, type ItemTier, type PotionId } from "@kusa/shared";
import { makeCanvas, paintGrid, type Grid, type Palette } from "./pixels.ts";

/**
 * Arte própria dos itens: um ícone 16×16 por item (chão, HUD, inventário e mercado), pintado com
 * a paleta do material (nível 1 = couro/madeira … 5 = dragão). "m"/"M" = material claro/escuro,
 * "a" = detalhe. Como cada item fica vestido no herói está em `outfit.ts`.
 */

export const ITEM_ICON_SIZE = 16;

export const MATERIALS: Record<ItemTier, { m: string; M: string; a: string }> = {
  1: { m: "#a9794a", M: "#6b4526", a: "#d8b27a" }, // couro e madeira
  2: { m: "#d9994f", M: "#8a5527", a: "#f3cf86" }, // bronze
  3: { m: "#b9c0ca", M: "#666e7a", a: "#8b5a2b" }, // ferro
  4: { m: "#e4ecf7", M: "#7b93b6", a: "#4c7bd9" }, // aço
  5: { m: "#d9483a", M: "#7e1d1d", a: "#f2c14e" }, // dragão
};

const BASE: Palette = { o: "#140d0a", w: "#9a6a36", W: "#5e3c1c", i: "#efe3c8" };

/** Completa a grade com linhas vazias até 16. */
const icon = (rows: string[]): Grid => [...rows, ...Array(ITEM_ICON_SIZE - rows.length).fill(".".repeat(ITEM_ICON_SIZE))];

/** Troca as letras de uma grade pixel a pixel. */
const remap = (grid: Grid, fn: (ch: string, x: number, y: number) => string): Grid =>
  grid.map((row, y) => [...row].map((ch, x) => fn(ch, x, y)).join(""));

const LONG_SWORD = icon([
  "............ooo.",
  "...........omMo.",
  "..........ommo..",
  ".........omMo...",
  "........ommo....",
  ".......omMo.....",
  "......ommo......",
  "..oo.omMo.......",
  "..oaoMmo........",
  "...oaMo.........",
  "...owao.........",
  "..owWoao........",
  ".owWo.oao.......",
  ".oWo...oo.......",
  "..o.............",
]);

const BRONZE_HELMET = icon([
  "................",
  ".......aa.......",
  "......oaao......",
  ".....ooaaoo.....",
  "....ommmmmMo....",
  "...ommmmmmmMo...",
  "..omMmmmmmmmMo..",
  "..ommmmmmmmmMo..",
  "..oaaaaaaaaaao..",
  "..oMmo....omMo..",
  "..oMmo....omMo..",
  "..oMMo....oMMo..",
  "...oo......oo...",
]);

const BRONZE_CUIRASS = icon([
  "................",
  "...ooo....ooo...",
  "..ommMo..oMmmo..",
  ".ommmmMooMmmmmo.",
  ".ommmmmmmmmmmmo.",
  ".oMommmmmmmmoMo.",
  "..o.ommaammo.o..",
  "....ommaammo....",
  "....ommmmmmo....",
  "....oMmmmmMo....",
  "....oMMmmMMo....",
  "....oaaaaaao....",
  ".....oooooo.....",
]);

const PLATE_ARMOR = icon([
  "................",
  ".oooo......oooo.",
  "oMmmmo....ommmMo",
  "oMmmmMooooMmmmMo",
  ".oMMommmmmmoMMo.",
  "..oommmmmmmmoo..",
  "...oMMMMMMMMo...",
  "...ommmaammmo...",
  "...oMMMMMMMMo...",
  "....ommmmmmo....",
  "....oMMMMMMo....",
  "....oaaaaaao....",
  ".....oooooo.....",
]);

const ICONS: Record<ItemSlot, Record<ItemTier, Grid>> = {
  weapon: {
    // Porrete
    1: icon([
      "................",
      "..........ooo...",
      ".........oMmmo..",
      "........omMmmmo.",
      "........ommammo.",
      ".......ommmmMo..",
      "......ommmMoo...",
      ".....ommMo......",
      "....ommMo.......",
      "...ommMo........",
      "..ommMo.........",
      ".oMmMo..........",
      ".oMMo...........",
      "..oo............",
    ]),
    // Espada de bronze: lâmina curta.
    2: icon([
      "................",
      "................",
      "................",
      "................",
      "........ooo.....",
      ".......omMo.....",
      "......ommo......",
      ...LONG_SWORD.slice(7, 15),
    ]),
    // Machado de ferro
    3: icon([
      "................",
      "........oo......",
      "...ooooowWo.....",
      "..ommmmMwWo.....",
      ".ommmmmMwWo.....",
      ".ommmmMMwWo.....",
      ".ommmmMMwWo.....",
      "..oMMMMMwWo.....",
      "...ooooowWo.....",
      ".......owWo.....",
      ".......owWo.....",
      ".......owWo.....",
      ".......owWo.....",
      ".......oaao.....",
      ".......oaao.....",
      "........oo......",
    ]),
    // Espada longa de aço
    4: LONG_SWORD,
    // Lâmina do dragão: fio serrilhado de ouro.
    5: icon([
      "............ooo.",
      "..........oomMo.",
      ".........oammo..",
      "........oomMo...",
      ".......oammo....",
      "......oomMo.....",
      ".....oammo......",
      ...LONG_SWORD.slice(7, 15),
    ]),
  },
  helmet: {
    // Gorro de couro
    1: icon([
      "................",
      "................",
      "................",
      "......oooo......",
      "....oommmMoo....",
      "...ommmmmmmMo...",
      "..ommmmmmmmmMo..",
      "..oMmmmmmmmmMo..",
      "..oaaaaaaaaaao..",
      "..oaaaaaaaaaao..",
      "...oooooooooo...",
    ]),
    2: BRONZE_HELMET,
    // Elmo de ferro: rebites e protetor de nariz.
    3: icon([
      "................",
      "................",
      "......oooo......",
      "....oommmMoo....",
      "...ommmmmmmMo...",
      "..omMmmmmmmmMo..",
      "..ommmmmmmmmMo..",
      "..oMmMMMMMMmMo..",
      "..oMmoomMoomMo..",
      "..oMmo.oo.omMo..",
      "..oMMo....oMMo..",
      "...oo......oo...",
    ]),
    // Elmo de aço: viseira e penacho.
    4: icon([
      "................",
      "......oaao......",
      ".....oaaaao.....",
      "....oooooooo....",
      "...ommmmmmmMo...",
      "..ommmmmmmmmMo..",
      "..ommmmmmmmmMo..",
      "..oMooooooooMo..",
      "..ommmmmmmmmMo..",
      "..omMmMmMmMmMo..",
      "..oMmmmmmmmmMo..",
      "..oMMMMMMMMMMo..",
      "...oooooooooo...",
    ]),
    // Elmo do dragão: chifres de marfim.
    5: icon([
      "................",
      ".o............o.",
      ".oio........oio.",
      "..oio.oooo.oio..",
      "..oiooammaooio..",
      "...ommmmmmmMo...",
      "..oammmmmmmmao..",
      "..oMaaaaaaaaMo..",
      "..oMmooaaoomMo..",
      "..oMmo.oo.omMo..",
      "..oMMo....oMMo..",
      "...oo......oo...",
    ]),
  },
  armor: {
    // Gibão de couro: amarração no peito.
    1: icon([
      "................",
      "...ooo....ooo...",
      "..ommMo..oMmmo..",
      ".ommmmMooMmmmmo.",
      ".ommmmmaMmmmmmo.",
      ".oMommmMammmoMo.",
      "..o.ommaMmmo.o..",
      "....ommMammo....",
      "....ommaMmmo....",
      "....oMmMamMo....",
      "....oMMmmMMo....",
      "....oMMaaMMo....",
      ".....oooooo.....",
    ]),
    2: BRONZE_CUIRASS,
    // Cota de malha: anéis alternados, cinto de couro.
    3: remap(BRONZE_CUIRASS, (ch, x, y) => (ch === "m" || ch === "M" || (ch === "a" && y < 11) ? ((x + y) % 2 ? "M" : "m") : ch)),
    4: PLATE_ARMOR,
    // Escamas de dragão: escamas desencontradas e faixas de ouro.
    5: remap(PLATE_ARMOR, (ch, x, y) => {
      if (y === 0 && (x === 2 || x === 13)) return "o";
      if (ch === "M" && (y === 6 || y === 8)) return "a";
      if (ch === "m") return (x + (y % 2) * 2) % 4 === 0 ? "M" : "m";
      return ch;
    }),
  },
  shield: {
    // Broquel de madeira: tábuas e cravo.
    1: icon([
      "................",
      "................",
      ".....oooooo.....",
      "...omMmmmmMmo...",
      "..ommMmmmmMmmo..",
      ".ommmMmaamMmmmo.",
      ".ommmMmaamMmmmo.",
      ".ommmMmmmmMmmmo.",
      ".oMmmMmmmmMmmMo.",
      "..oMmMmmmmMmMo..",
      "...oMMMmmMMMo...",
      ".....oooooo.....",
    ]),
    // Escudo de bronze: redondo, aro e bossa.
    2: icon([
      "................",
      "................",
      ".....oooooo.....",
      "...ooaaaaaaoo...",
      "..oammmmmmmMao..",
      ".oammmmmmmmmMao.",
      ".oammmmaaMmmMao.",
      ".oammmmaaMmmMao.",
      ".oammmmmmmmMMao.",
      "..oaMmmmmmMMao..",
      "...ooaaaaaaoo...",
      ".....oooooo.....",
    ]),
    // Escudo de ferro: rebites e tiras de couro.
    3: icon([
      "................",
      "...oooooooooo...",
      "..ommmmmmmmmMo..",
      "..omMmmaammMMo..",
      "..ommmmaammmMo..",
      "..oaaaaaaaaaao..",
      "..ommmmaammmMo..",
      "..ommmmaammmMo..",
      "...ommmaammMo...",
      "...oMmmaamMMo...",
      "....oMmaaMMo....",
      ".....oMaaMo.....",
      "......oMMo......",
      ".......oo.......",
    ]),
    // Escudo de aço: moldura e cruz azuis.
    4: icon([
      "................",
      "...oooooooooo...",
      "..ommmmmmmmmMo..",
      "..omaaaaaaaaMo..",
      "..omammmmmmaMo..",
      "..omamMaaMmaMo..",
      "..omamaaaamaMo..",
      "..omammaammaMo..",
      "...omammmmaMo...",
      "...omMammaMMo...",
      "....omMaaMMo....",
      ".....omMMMo.....",
      "......oMMo......",
      ".......oo.......",
    ]),
    // Escudo do dragão: aro de ouro e olho de dragão.
    5: icon([
      "................",
      "...oooooooooo...",
      "..oaaaaaaaaaao..",
      "..oammmmmmmMao..",
      "..oammmaammMao..",
      "..oammaaaaMMao..",
      "..oamaaooaaMao..",
      "..oammaaaaMMao..",
      "...oammaammao...",
      "...oamMmmMMao...",
      "....oamMMMao....",
      ".....oaMMao.....",
      "......oaao......",
      ".......oo.......",
    ]),
  },
};

/** Frasco das poções: "c" = rolha, "g" = brilho do vidro, "l"/"L" = líquido claro/escuro. */
const POTION_GRID: Grid = [
  "................",
  "......oooo......",
  "......occo......",
  "......occo......",
  ".....oooooo.....",
  "......ogLo......",
  "......ogLo......",
  ".....oglllo.....",
  "....ogllllLo....",
  "...ogllllllLo...",
  "...olllllllLo...",
  "...olllllllLo...",
  "...oLllllllLo...",
  "....oLLLLLLo....",
  ".....oooooo.....",
  "................",
];

const LIQUIDS: Record<PotionId, Palette> = {
  "potion-health": { l: "#e74c3c", L: "#8e1f16" },
  "potion-mana": { l: "#4aa3df", L: "#1f4f8e" },
};

const GLASS: Palette = { o: "#140d0a", c: "#a9794a", g: "#f4f7fb" };

/** Ícone 16×16 de um item do equipamento ou de uma poção. */
export function itemIcon(itemId: string) {
  const { canvas, ctx } = makeCanvas(ITEM_ICON_SIZE, ITEM_ICON_SIZE);
  if (isPotion(itemId)) {
    paintGrid(ctx, POTION_GRID, { ...GLASS, ...LIQUIDS[itemId] }, 0, 0);
    return canvas;
  }
  const item = ITEMS[itemId];
  if (item) paintGrid(ctx, ICONS[item.slot][item.tier], { ...BASE, ...MATERIALS[item.tier] }, 0, 0);
  return canvas;
}
