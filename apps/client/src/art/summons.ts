import { makeCanvas, paintGrid, type Grid, type Palette } from "./pixels.ts";

/**
 * Guardião do Bosque (árvore viva do Druida): arte própria, já que o pack não tem um ent.
 * As outras criaturas invocadas vêm do pack Dungeon Crawl (ver `textures.ts`).
 */
const TREANT: Grid = [
  "........oooooooo........",
  ".....oooGGgGGGgGooo.....",
  "...ooGGggggGggggGGGoo...",
  "..oGgggLLgggggLLggggGo..",
  ".oGggLLggggGGgggLLgggGo.",
  ".oggLLgggGGGGGgggLLgggo.",
  "oGgLLggLLgggggLLggLLgGgo",
  "oggLggLLgggLggggLLggLLgo",
  "oLggLLggooooooooggLLggLo",
  ".oLLLLoobbbbbbbbooLLLLo.",
  "..oooobblbbbbbbbbboooo..",
  "oo...oblbbbbbbbbbbo...oo",
  "olo..oblbeeobbeebbo..olo",
  ".olo.oblbeeobbeebbo.olo.",
  "..oloobllbbbbbbbbboolo..",
  "...olbbllbbooooobbblo...",
  "....obbllbobbbbobbbo....",
  ".....obllbbbbbbbbbbo....",
  "......obllbbmbbbbbo.....",
  "......obllbmmbbbbbo.....",
  "......oblllbbbbmbbo.....",
  "......oblllbbbbmmbo.....",
  ".....obbllbbbbbbbbbo....",
  "....obbobllbbbbbobbbo...",
  "...obbo.obllbbbbo.obbo..",
  "..oooo..oooooooooo.oooo.",
];

export const TREANT_OUTLINE = "#140d0a";

const TREANT_PALETTE: Palette = {
  o: TREANT_OUTLINE,
  G: "#9cd65a", // copa clara
  g: "#4f9a2f",
  L: "#2c6a1e",
  b: "#6b4426", // casca
  l: "#9a6a3e",
  e: "#ffe066", // olhos acesos
  m: "#5f8a2a", // musgo
};

/** Árvore viva num quadro 32×32, com os pés na base (como os monstros do pack). */
export function treantCanvas() {
  const { canvas, ctx } = makeCanvas(32, 32);
  paintGrid(ctx, TREANT, TREANT_PALETTE, 4, 32 - TREANT.length);
  return canvas;
}

/** Águia Gigante (Mestre das Feras): arte própria, de asas abertas, vista de frente. */
const EAGLE: Grid = [
  "...........oooooo...........",
  "..........owwwwwwo..........",
  "..........owewwewo..........",
  "..........owwwwwwo..........",
  "...........oyyyyo...........",
  "ooo.......obbwwbbo.......ooo",
  "oBBooo...obbbbbbbbo...oooBBo",
  ".oBBBBoooobbbbbbbbooooBBBBo.",
  "..oBlBBBBbbbbbbbbbbBBBBlBo..",
  "...oBlBlBBbbbbbbbbBBlBlBo...",
  "....oBlBlBbbbbbbbbBlBlBo....",
  ".....ooBlBbbbbbbbbBlBoo.....",
  ".......oooBbbbbbbBooo.......",
  "..........obbbbbbo..........",
  "..........oBlBBlBo..........",
  ".........oBBoBBoBBo.........",
  ".........ooyooooyoo.........",
  "..........yy.oo.yy..........",
];

const EAGLE_PALETTE: Palette = {
  o: TREANT_OUTLINE,
  w: "#f4efe2", // cabeça branca
  e: "#1b1410",
  y: "#f2b134", // bico e garras
  b: "#7a4a24", // corpo
  B: "#4e2f17", // penas das asas
  l: "#b07a45",
};

/** Águia num quadro 32×32, com a ponta das garras na base. */
export function eagleCanvas() {
  const { canvas, ctx } = makeCanvas(32, 32);
  paintGrid(ctx, EAGLE, EAGLE_PALETTE, 2, 32 - EAGLE.length - 2);
  return canvas;
}
