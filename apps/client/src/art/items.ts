import { ITEMS, type ItemSlot, type ItemTier } from "@kusa/shared";
import { makeCanvas, paintGrid, type Grid, type Palette } from "./pixels.ts";

/**
 * Arte própria dos itens: um desenho 16×16 por slot, pintado com a paleta do material
 * (nível 1 = couro/madeira … 5 = dragão). "m"/"M" = material claro/escuro, "a" = detalhe.
 */

export const ITEM_ICON_SIZE = 16;

const GRIDS: Record<ItemSlot, Grid> = {
  weapon: [
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
    "................",
  ],
  helmet: [
    "................",
    "................",
    "................",
    ".....oooooo.....",
    "....ommmmmMo....",
    "...ommmmmmmMo...",
    "..omMmmmmmmmMo..",
    "..ommmmmmmmmMo..",
    "..oaaaaaaaaaao..",
    "..oMmo....omMo..",
    "..oMmo....omMo..",
    "..oMMo....oMMo..",
    "...oo......oo...",
    "................",
    "................",
    "................",
  ],
  armor: [
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
    "................",
    "................",
    "................",
  ],
  shield: [
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
    "................",
    "................",
  ],
};

const MATERIALS: Record<ItemTier, Palette> = {
  1: { m: "#a9794a", M: "#6b4526", a: "#d8b27a" }, // couro e madeira
  2: { m: "#d9994f", M: "#8a5527", a: "#f3cf86" }, // bronze
  3: { m: "#b9c0ca", M: "#666e7a", a: "#8b5a2b" }, // ferro
  4: { m: "#e4ecf7", M: "#7b93b6", a: "#4c7bd9" }, // aço
  5: { m: "#d9483a", M: "#7e1d1d", a: "#f2c14e" }, // dragão
};

const BASE: Palette = { o: "#140d0a", w: "#9a6a36", W: "#5e3c1c" };

export function itemIcon(itemId: string) {
  const item = ITEMS[itemId];
  const { canvas, ctx } = makeCanvas(ITEM_ICON_SIZE, ITEM_ICON_SIZE);
  if (item) paintGrid(ctx, GRIDS[item.slot], { ...BASE, ...MATERIALS[item.tier] }, 0, 0);
  return canvas;
}
