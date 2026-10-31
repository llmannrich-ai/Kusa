import sheetUrl from "./bugbear.png";
import { makeCanvas } from "../pixels.ts";

/**
 * Bugbear chefe da arte nova a partir da arte de referência (`docs/arte/bugbear-referencia.webp`, reduzida e alinhada
 * por `apps/client/scripts/bugbearSprites.py`). A folha tem 12 quadros de 192 px (a escala do goblin e dos monstros
 * desenhados por código, pés na mesma linha), na ordem da referência: parado em 6 ângulos e andando nos mesmos 6. O
 * perfil da referência olha para a direita: aqui ele é espelhado para a esquerda, o lado dos outros monstros.
 */
const S = 192;
const FEET = 183;
/** Quadros da folha: parado (0–5) e andando (6–11), de frente, ¾ de frente, perfil, ¾ de costas, costas, costas. */
const F = { front: 0, side: 2, sideBack: 3, sideWalk: 8 } as const;

export interface BugbearArt {
  /** Parte de cima do quadro que o corpo ocupa (a barra de vida fica logo acima da coroa). */
  fill: number;
  /** Os 16 quadros do jogo (parado, andar, golpe e magia; 4 cada), olhando para a esquerda como os outros monstros. */
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
}

/** Um quadro da folha espelhado, deslocado (`dx` negativo = para a frente, à esquerda) e com o fôlego. */
function frame(img: HTMLImageElement, i: number, o: { dx?: number; dy?: number; breathe?: number } = {}) {
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(S, 0);
  ctx.scale(-1, 1);
  // Fôlego: o corpo encolhe um pouco na vertical em volta da linha dos pés.
  const h = S * (1 - (o.breathe ?? 0));
  ctx.drawImage(img, i * S, 0, S, S, -(o.dx ?? 0), FEET - FEET * (h / S) + (o.dy ?? 0), S, h);
  return canvas;
}

export async function loadBugbear(): Promise<BugbearArt> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const at = (i: number, o: Parameters<typeof frame>[2] = {}) => () => frame(img, i, o);
  const breath = [0, 0.01, 0.02, 0.01];
  const art: BugbearArt = {
    fill: 0.88,
    frames: () => [
      // Parado: o perfil respirando.
      ...breath.map((b) => at(F.side, { breathe: b })),
      // Andar: a referência tem uma passada de perfil; ela alterna com o parado (o corpo sobe um pouco no meio).
      at(F.sideWalk), at(F.side, { dy: -2 }), at(F.sideWalk, { dx: -1, dy: -1 }), at(F.side, { dy: -1 }),
      // Golpe: gira o tronco para trás (¾ de costas, a maça lá atrás), avança com a passada e volta.
      at(F.sideBack, { dx: 4, dy: 1 }), at(F.sideWalk, { dx: -12 }), at(F.sideWalk, { dx: -9, dy: 1 }), at(F.side, { dx: -3 }),
      // Golpe Brutal: o mesmo bote, mais fundo, depois de encolher para tomar impulso.
      at(F.sideBack, { dx: 6, breathe: 0.04 }), at(F.sideBack, { dx: 7, dy: -3 }), at(F.sideWalk, { dx: -16 }), at(F.side, { dx: -6 }),
    ],
    portrait: () => frame(img, F.side),
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(S * all.length, S);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
      return canvas;
    },
  };
  return art;
}
