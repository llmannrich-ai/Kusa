import sheetUrl from "./bullywugKing.png";
import { makeCanvas } from "../pixels.ts";
import { SheetSource } from "./sheetSource.ts";

/**
 * Rei Bullywug (boss do Pântano das Ruínas) da arte nova, a partir das folhas geradas no Runway
 * (`docs/arte/pantano-das-ruinas/bullywug-A.png` e `bullywug-B.png`, recortadas e alinhadas por
 * `apps/client/scripts/bullywugKingSprites.py`). A folha tem 28 figuras de 448 px, pés na mesma linha, todas olhando
 * para a esquerda: as 12 da folha A (frente, 3/4, perfil, 3/4 de costas e costas; depois frente, três perfis andando e
 * costas) e as 16 da B (andar sem a lança, golpe de lança, bote saindo da lama e morte).
 */
const S = 448;
const FEET = 438;
/** Figuras da folha. */
const A = { front: 0, side: 2, back: 4, frontStep: 6, sideWalk: 7, backWalk: 10 } as const;
const B = { attack: 16, ambush: 20, death: 24 } as const;

export interface BullywugKingArt {
  size: number;
  fill: number;
  /** Quadros dos clipes a mais (`MonsterAnim.extra`). */
  extra: typeof KING_EXTRA;
  /** Quadros do jogo: parado, andar, golpe e magia (4 cada) e depois os clipes a mais, na ordem de `KING_EXTRA`. */
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
  /** A folha em PNG: `frames`, `portrait` e `sheet` só desenham com ela carregada. */
  source: SheetSource;
}

/** Clipes a mais do Rei (quadros), depois dos 4 de sempre, na ordem de `EXTRA_CLIPS` (`bestiary.ts`). */
const KING_EXTRA = { death: 4, idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;

/** Uma figura da folha, deslocada (`dy` negativo = para cima) e com o fôlego (encolhe na vertical). */
function figure(img: CanvasImageSource, i: number, o: { dy?: number; breathe?: number } = {}) {
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.imageSmoothingEnabled = false;
  const h = S * (1 - (o.breathe ?? 0));
  ctx.drawImage(img, i * S, 0, S, S, 0, FEET - FEET * (h / S) + (o.dy ?? 0), S, h);
  return canvas;
}

export async function loadBullywugKing(): Promise<BullywugKingArt> {
  const source = new SheetSource(sheetUrl);
  const at = (i: number, o: Parameters<typeof figure>[2] = {}) => () => figure(source.img, i, o);
  const run = (first: number, n: number) => Array.from({ length: n }, (_, k) => at(first + k));
  const breathing = (i: number) => [0, 0.012, 0.024, 0.012].map((b) => at(i, { breathe: b }));
  const art: BullywugKingArt = {
    size: S,
    fill: 0.46,
    extra: KING_EXTRA,
    frames: () => [
      ...breathing(A.side),
      // O andar da folha B larga a lança: anda com os três perfis da A, que a carregam.
      at(A.sideWalk), at(A.sideWalk + 1), at(A.sideWalk + 2), at(A.sideWalk + 1),
      ...run(B.attack, 4),
      // A habilidade (Bote da Lama): agachado na lama, sai dela, salta e cai.
      ...run(B.ambush, 4),
      ...run(B.death, KING_EXTRA.death),
      ...breathing(A.front),
      // De frente não dá para espelhar o passo (a lança troca de mão): o corpo sobe e desce.
      at(A.front), at(A.front, { dy: -3 }), at(A.frontStep), at(A.frontStep, { dy: -3 }),
      ...breathing(A.back),
      at(A.backWalk), at(A.back, { dy: -3 }), at(A.backWalk + 1), at(A.back + 1, { dy: -3 }),
    ],
    portrait: () => figure(source.img, A.side),
    source,
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(S * all.length, S);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
      return canvas;
    },
  };
  return art;
}
