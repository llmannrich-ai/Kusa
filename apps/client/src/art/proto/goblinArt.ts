import sheetUrl from "./goblin.png";
import { makeCanvas } from "../pixels.ts";
import type { ProtoDir } from "./tibiaHero.ts";

/**
 * Goblin da arte nova a partir da arte de referência (`docs/arte/goblin-referencia.png`, reduzida e alinhada por
 * `apps/client/scripts/goblinSprites.py`). A folha tem 12 quadros de 192 px (a mesma escala dos monstros desenhados
 * por código, pés na mesma linha), na ordem da referência: parado em 6 ângulos e andando nos mesmos 6.
 */
const S = 192;
/** Quadros da folha: parado (0–5) e andando (6–11) em cada ângulo. */
const F = {
  front: 0, frontQuarter: 1, side: 2, sideBack: 3, back: 4, backQuarter: 5,
  frontWalk: 6, sideWalkA: 7, sideWalkB: 8, sideWalkC: 9, backWalk: 10, backQuarterWalk: 11,
} as const;

export interface GoblinArt {
  /** Parte de cima do quadro que o corpo ocupa (a barra de vida fica logo acima da cabeça). */
  fill: number;
  /** Os 16 quadros do jogo (parado, andar, golpe e magia; 4 cada), olhando para a esquerda como os outros monstros. */
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
  /** Parado e andar de frente, de costas e de lado (protótipo das 3 vistas). */
  dirFrame(dir: ProtoDir, clip: "idle" | "walk", k: number): HTMLCanvasElement;
}

/** Um quadro da folha, espelhado (`flip`), deslocado (`dx` negativo = para a frente, à esquerda) e com o fôlego. */
function frame(img: HTMLImageElement, i: number, o: { flip?: boolean; dx?: number; dy?: number; breathe?: number } = {}) {
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (o.flip) { ctx.translate(S, 0); ctx.scale(-1, 1); }
  // Fôlego: o corpo encolhe um pouco na vertical em volta da linha dos pés.
  const h = S * (1 - (o.breathe ?? 0)), feet = 184;
  ctx.drawImage(img, i * S, 0, S, S, (o.dx ?? 0) * (o.flip ? -1 : 1), feet - feet * (h / S) + (o.dy ?? 0), S, h);
  ctx.restore();
  return canvas;
}

export async function loadGoblin(): Promise<GoblinArt> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  // O jogo quer o perfil olhando para a esquerda: o perfil parado da referência já olha; as passadas e o ¾ de costas
  // olham para a direita e são espelhados.
  const left = (i: number, o: Parameters<typeof frame>[2] = {}) => frame(img, i, { flip: i !== F.side, ...o });
  const side = (i: number, o: Parameters<typeof frame>[2] = {}) => () => left(i, o);
  const breath = [0, 0.012, 0.024, 0.012];
  const art: GoblinArt = {
    fill: 0.6,
    frames: () => [
      // Parado: o perfil respirando.
      ...breath.map((b) => side(F.side, { breathe: b })),
      // Andar: as três passadas da referência e a do meio de novo.
      side(F.sideWalkA), side(F.sideWalkB), side(F.sideWalkC), side(F.sideWalkB),
      // Golpe: recua agachado (¾ de costas, a lâmina baixa), dá o bote para a frente com a passada e volta.
      side(F.sideBack, { dx: 4, dy: 2 }), side(F.sideWalkB, { dx: -10 }), side(F.sideWalkC, { dx: -7 }), side(F.side, { dx: -2 }),
      // Magia (o goblin não tem): o mesmo fôlego do parado, mais fundo.
      ...breath.map((b) => side(F.side, { breathe: b * 1.6 })),
    ],
    portrait: () => left(F.side),
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(S * all.length, S);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
      return canvas;
    },
    dirFrame(dir, clip, k) {
      if (dir === "side") return clip === "idle" ? left(F.side, { breathe: breath[k] }) : left([F.sideWalkA, F.sideWalkB, F.sideWalkC, F.sideWalkB][k]);
      const [still, walk] = dir === "down" ? [F.front, F.frontWalk] : [F.back, F.backWalk];
      return clip === "idle" ? frame(img, still, { breathe: breath[k] }) : frame(img, k % 2 ? still : walk);
    },
  };
  return art;
}
