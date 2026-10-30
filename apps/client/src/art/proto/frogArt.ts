import sheetUrl from "./frog.png";
import { makeCanvas } from "../pixels.ts";

/**
 * Sapo gigante da arte nova, a partir das folhas geradas por IA (`docs/arte/pantano-das-ruinas/frog-A.png` e
 * `frog-B.png`, recortadas e alinhadas por `apps/client/scripts/frogSprites.py`). A folha tem 27 figuras de 352 px
 * (o quadro é largo para a língua esticada caber), pés na mesma linha: as 12 da folha A (parado em 6 ângulos, depois
 * andando nos mesmos 6) e as 15 da B (andar, bote, língua e morte), todas de perfil para a esquerda.
 */
const S = 352;
const FEET = 342;
/** Figuras da folha. */
const A = { front: 0, side: 2, back: 4, frontWalk: 6, backWalk: 10 } as const;
const B = { walk: 12, attack: 16, tongue: 20, death: 24 } as const;

export interface FrogArt {
  size: number;
  fill: number;
  /** Quadros dos clipes a mais (`MonsterAnim.extra`). */
  extra: typeof FROG_EXTRA;
  /** Quadros do jogo: parado, andar, golpe e magia (4 cada) e depois os clipes a mais, na ordem de `FROG_EXTRA`. */
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
}

/** Clipes a mais do sapo (quadros), depois dos 4 de sempre, na ordem de `EXTRA_CLIPS` (`bestiary.ts`). */
const FROG_EXTRA = { death: 3, idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;

/** Uma figura da folha, espelhada (`flip`), deslocada (`dy` negativo = para cima) e com o fôlego (encolhe na vertical). */
function figure(img: HTMLImageElement, i: number, o: { flip?: boolean; dy?: number; breathe?: number } = {}) {
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (o.flip) { ctx.translate(S, 0); ctx.scale(-1, 1); }
  const h = S * (1 - (o.breathe ?? 0));
  ctx.drawImage(img, i * S, 0, S, S, 0, FEET - FEET * (h / S) + (o.dy ?? 0), S, h);
  ctx.restore();
  return canvas;
}

export async function loadFrog(): Promise<FrogArt> {
  const img = new Image();
  img.src = sheetUrl;
  await img.decode();
  const at = (i: number, o: Parameters<typeof figure>[2] = {}) => () => figure(img, i, o);
  const run = (first: number, n: number) => Array.from({ length: n }, (_, k) => at(first + k));
  // O papo do sapo sobe e desce: o fôlego é mais fundo que o dos humanoides.
  const breath = [0, 0.02, 0.04, 0.02];
  const breathing = (i: number) => breath.map((b) => at(i, { breathe: b }));
  // De frente e de costas a folha só tem um passo: o outro é o mesmo espelhado, com o corpo parado entre eles.
  const steps = (still: number, walk: number) => [at(walk), at(still, { dy: -2 }), at(walk, { flip: true }), at(still, { dy: -2 })];
  const art: FrogArt = {
    size: S,
    fill: 0.3,
    extra: FROG_EXTRA,
    frames: () => [
      ...breathing(A.side),
      ...run(B.walk, 4),
      ...run(B.attack, 4),
      ...run(B.tongue, 4),
      ...run(B.death, FROG_EXTRA.death),
      ...breathing(A.front),
      ...steps(A.front, A.frontWalk),
      ...breathing(A.back),
      ...steps(A.back, A.backWalk),
    ],
    portrait: () => figure(img, A.side),
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(S * all.length, S);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
      return canvas;
    },
  };
  return art;
}
