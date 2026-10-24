import { makeCanvas, paintGrid, type Grid, type Palette } from "../pixels.ts";

/**
 * Protótipo da Fase 0 de `docs/ARTE_TIBIA.md`: o cavaleiro sem equipamento pintado à mão no padrão
 * inspirado no Tibia (32 px de arte por tile, sem Scale2x nem luz automática, contorno quase preto,
 * 4 tons por material, cabeça ≈27% do corpo e ombros mais largos que ela).
 *
 * Quadro 48×48 com os pés na linha 45 e o corpo com 32 px de altura (1 tile): a sobra é para arma e chapéu.
 * As grades usam letras de **zona**, não de cor: a classe (ou um cosmético) escolhe a rampa de cada zona,
 * como o outfit do Tibia. Só galeria por enquanto: o jogo continua com `heroes.ts`.
 */

export const PROTO_SIZE = 48;
export const PROTO_FRAMES = 4;
export type ProtoDir = "down" | "up" | "side";
export const PROTO_DIRS: ProtoDir[] = ["down", "up", "side"];

/** Rampa de 4 tons (luz, base, sombra, fundo). */
type Ramp = readonly [string, string, string, string];

/** As 4 zonas do outfit + pele e metal. */
export interface ProtoLook {
  head: Ramp;
  primary: Ramp;
  secondary: Ramp;
  detail: Ramp;
  skin: readonly [string, string, string];
  metal: Ramp;
}

const OUTLINE = "#1a1210";
const EYE = "#2a1810";

export const KNIGHT_LOOK: ProtoLook = {
  head: ["#9a6a3e", "#7a4c28", "#5a3418", "#3e2210"],
  primary: ["#c4553e", "#a23a2c", "#7e2a22", "#561a16"],
  secondary: ["#9aa0a6", "#7a8088", "#5a5f68", "#3e424a"],
  detail: ["#8a6440", "#6a4a2e", "#4e3420", "#34221a"],
  skin: ["#f0c8a0", "#d9a67c", "#b07656"],
  metal: ["#f2f4f6", "#c8ccd2", "#8e949c", "#5e646c"],
};

/** Variações de cor (o que um cosmético trocaria): mesmo desenho, outras rampas nas zonas. */
export const KNIGHT_COSMETICS: Record<string, Partial<ProtoLook>> = {
  "azul real": {
    primary: ["#5a7ec4", "#3a5aa2", "#2a3f7e", "#1a2856"],
    detail: ["#c8a24a", "#a2802e", "#7a5c1e", "#4e3a14"],
  },
  "verde-floresta": {
    head: ["#c8a24a", "#a2802e", "#7a5c1e", "#4e3a14"],
    primary: ["#6a9a4a", "#4a7a32", "#345a22", "#223c16"],
    secondary: ["#8a7a62", "#6a5c48", "#4e4234", "#342c22"],
  },
  "negro": {
    head: ["#4a4a52", "#36363e", "#26262c", "#18181c"],
    primary: ["#5a5262", "#423c4a", "#2e2a34", "#1e1a22"],
    secondary: ["#6a3a34", "#522a26", "#3a1e1a", "#261210"],
  },
};

function palette(look: ProtoLook, swapLegs = false): Palette {
  const [c, C, d, D] = look.secondary;
  const [f, F, g, G] = look.detail;
  return {
    o: OUTLINE,
    e: EYE,
    q: look.skin[0], w: look.skin[1], r: look.skin[2],
    h: look.head[0], H: look.head[1], j: look.head[2], J: look.head[3],
    a: look.primary[0], A: look.primary[1], b: look.primary[2], B: look.primary[3],
    m: look.metal[0], M: look.metal[1], n: look.metal[2], N: look.metal[3],
    // Perna de cá (c C d, botas f F g) e perna de lá (x X y, botas u U v), mais escura.
    // No passo seguinte de lado as duas trocam de tom: a perna da frente vira a de trás.
    ...(swapLegs
      ? { c: d, C: D, d: D, x: c, X: C, y: d, f: g, F: G, g: G, u: f, U: F, v: g }
      : { c, C, d, x: d, X: D, y: D, f, F, g, u: g, U: G, v: G }),
    D, G,
  };
}

// --- Frente ---------------------------------------------------------------------------
// Grade de 24 colunas colocada em x = 12, y = 14 (cabeça 14–22, tronco 23–35, pernas até 45).

const FRONT: Grid = [
  ".........oooooo.........",
  "........ohhhHHjo........",
  ".......ohhhHHHHjo.......",
  ".......ohHHjHHjJo.......",
  ".......oHjHjjHjJo.......",
  ".......oHqwwwwrJo.......",
  ".......oHwewwerJo.......",
  ".......oHwwwwrrJo.......",
  "........owwwwrro........",
  ".....ooooorrrrooooo.....",
  "....oaABaAfrrfAbBAbo....",
  "...oaAABaAAffAAbBAbbo...",
  "...oaAAoaAAbAAbboAbbo...",
  "...oaAAoaAbAAbbbobbBo...",
  "...oaAboAAAbAAbbobbBo...",
  "...oAAboaAAbAbbBobBBo...",
  "...oABboAAAbAbbBobBBo...",
  "...ofFgoAAAbAbbBofgGo...",
  "...oqwwGffFnnFggGwrro...",
  "...owwroAAAbAbbBowrro...",
  "..oMnnNoAAbAAbbBoooo....",
  "..ooMnooooooooooo.......",
  "...omNo.................",
  "...oMno.................",
  "...oMno.................",
  "...omNo.................",
  "...oMno.................",
  "...oMno.................",
  "...oMno.................",
  "...omNo.................",
  "...oMNo.................",
  "....oo..................",
];

// --- Costas: mesma silhueta, cabelo no lugar do rosto, espada na outra mão.

const BACK: Grid = [
  ".........oooooo.........",
  "........ohhhHHjo........",
  ".......ohhhHHHHjo.......",
  ".......ohHHjHHjJo.......",
  ".......oHHjHHjjJo.......",
  ".......oHjHHjHjJo.......",
  ".......oHHjHjjjJo.......",
  ".......ojHHjHjJJo.......",
  "........oHjjjJJo........",
  ".....ooooorrrrooooo.....",
  "....oaABaAAAAAbbBAbo....",
  "...oaAABaAAAbAAbBAbbo...",
  "...oaAAoaAAAbAbboAbbo...",
  "...oaAAoaAAAbAbbobbBo...",
  "...oaAboAAAAbAbbobbBo...",
  "...oAAboaAAAbAbBobBBo...",
  "...oABboAAAAbAbBobBBo...",
  "...ofFgoAAAAbAbBofgGo...",
  "...oqwwGffFFFFggGwrro...",
  "...owwroAAAAbAbBowrro...",
  "....ooooAAAAbAbBoMnnNo..",
  ".......oooooooooooMnoo..",
  ".................omNo...",
  ".................oMno...",
  ".................oMno...",
  ".................omNo...",
  ".................oMno...",
  ".................oMno...",
  ".................oMno...",
  ".................omNo...",
  ".................oMNo...",
  "..................oo....",
];

/** Perna de frente (5 de largura): a de cá clara, a de lá escura. Começa embaixo da barra da túnica. */
const LEG_NEAR: Grid = [
  "ocCdo", "ocCdo", "ocCdo", "ocCdo", "oCCdo", "ocCdo", "oCddo",
  "oFFgo", "ofFgo", "ofFgo", "ofFgo", "oFFgo", "ooooo",
];
const LEG_FAR: Grid = [
  "oxXyo", "oxXyo", "oxXyo", "oxXyo", "oXXyo", "oxXyo", "oXyyo",
  "oUUvo", "ouUvo", "ouUvo", "ouUvo", "oUUvo", "ooooo",
];

// --- Lado (olhando para a esquerda; a direita é a mesma folha espelhada) ----------------

const SIDE: Grid = [
  ".........oooooo.........",
  "........ohhhHHjo........",
  ".......ohhHHHHjjo.......",
  ".......ohHHjHHjJo.......",
  ".......ojHjHHjjJo.......",
  ".......oqwwHjHjJo.......",
  "......owwewrHjJJo.......",
  ".......owwwrHHjJo.......",
  "........owwrjJJo........",
  ".......oorrroooooo......",
  ".......oaBaAABbbBo......",
  ".......oaBaAABbbBo......",
  ".......oaoaAAobbBo......",
  ".......oAoaAbobbBo......",
  ".......oaoaAbobBBo......",
  ".......oAoaAbobBBo......",
  ".......oAoAAbobBBo......",
  ".......oAofFgobBBo......",
  ".......ofGqwrGgGGo......",
  ".......oAowwroBbBo......",
  "......oMnnNAAbbbBo......",
  ".....oMnoooooooooo......",
  "....oMno................",
  "...omNo.................",
  "..oMno..................",
  ".oMno...................",
  "oMNo....................",
  "ooo.....................",
];

/** Pernas de lado por quadro (11 de largura, em x = 18): passo aberto e pernas juntas. */
const SIDE_STEP: Grid = [
  "..ocCdxXyo.",
  "..ocCdxXyo.",
  "..ocCdxXyo.",
  ".ocCdooXyo.",
  ".ocCdo.oXyo",
  "ocCdo..oXyo",
  "ocCdo..oXyo",
  "ofFgo..oUvo",
  "ofFgo..oUvo",
  "ofFgo..oUvo",
  "oFFggo.oUUvo",
  "oooooo.ooooo",
].map((row) => row.slice(0, 11).padEnd(11, "."));
const SIDE_PASS: Grid = [
  "...ocCdXyo.",
  "...ocCdXyo.",
  "...ocCdXyo.",
  "...ocCdXyo.",
  "...ocCdXyo.",
  "...ocCdXyo.",
  "...ocCdXyo.",
  "...ofFgUvo.",
  "...ofFgUvo.",
  "..oofFgUvo.",
  "..oFFFggvo.",
  "..oooooooo.",
];

/** Quadro 48×48 do protótipo. Caminhada em 4 quadros: passo, passagem, outro passo, passagem. */
export function protoFrame(dir: ProtoDir, frame: number, look: ProtoLook = KNIGHT_LOOK): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PROTO_SIZE, PROTO_SIZE);
  const pass = frame % 2 === 1;
  const bob = pass ? -1 : 0;
  if (dir === "side") {
    const pal = palette(look, frame === 2);
    // Pernas primeiro: a barra da túnica cobre o começo delas.
    paintGrid(ctx, pass ? SIDE_PASS : SIDE_STEP, pal, 16, 34);
    paintGrid(ctx, SIDE, pal, 12, 14 + bob);
    return canvas;
  }
  const pal = palette(look);
  // De frente e de costas, no passo uma perna sobe 2 px (o pé sai do chão) e a outra fica plantada.
  const liftLeft = frame === 0 ? 2 : 0;
  const liftRight = frame === 2 ? 2 : 0;
  const [left, right] = dir === "down" ? [LEG_NEAR, LEG_FAR] : [LEG_FAR, LEG_NEAR];
  paintGrid(ctx, left, pal, 18, 33 - liftLeft);
  paintGrid(ctx, right, pal, 25, 33 - liftRight);
  paintGrid(ctx, dir === "down" ? FRONT : BACK, pal, 12, 14 + bob);
  return canvas;
}

export const mergeLook = (extra: Partial<ProtoLook>): ProtoLook => ({ ...KNIGHT_LOOK, ...extra });
