import type { MonsterKind } from "@kusa/shared";
import { makeCanvas } from "../pixels.ts";

/**
 * Clã do Pântano do Kosaradius (orcs e ogros) da arte nova, a partir das folhas de giro geradas por IA
 * (`docs/arte/pantano-do-kosaradius/<kind>-A.png`, recortadas e alinhadas por
 * `apps/client/scripts/kosaradiusSprites.py`). Cada folha tem 12 figuras em quadros quadrados, pés a 10 px do fundo,
 * na ordem da folha de giro: parado (0–5) e andando (6–11), cada linha com frente, 3/4 de frente, perfil (para a
 * esquerda), 3/4 de costas, costas e 3/4 de costas para o outro lado.
 *
 * Só a folha de giro chegou (a de ação, com golpe, especial e morte, ainda não): o golpe e o especial saem do perfil
 * (o jogo já dá o bote do sprite no golpe), e a morte é o tombo de sempre. Monstro sem folha fica na arte por código.
 */
const SHEETS = import.meta.glob<string>("./kosaradius/*.png", { eager: true, import: "default", query: "?url" });

/** Figuras da folha. */
const F = { front: 0, side: 2, back: 4, frontWalk: 6, sideWalk: 8, backWalk: 10 } as const;

/**
 * Quem carrega a arma de outro jeito andando (o Rei: tronco em pé parado, no ombro andando) anda só com a figura de
 * andar, subindo e descendo; os outros alternam a passada com a figura parada.
 */
const WALK_POSE_ONLY = new Set<MonsterKind>(["ogreKing"]);

/** Clipes a mais (quadros), depois dos 4 de sempre, na ordem de `EXTRA_CLIPS` (`bestiary.ts`): frente e costas. */
const CLAN_EXTRA = { idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;

export interface ClanArt {
  size: number;
  fill: number;
  extra: typeof CLAN_EXTRA;
  /** Quadros do jogo: parado, andar, golpe e magia (4 cada) e depois os clipes a mais, na ordem de `CLAN_EXTRA`. */
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
}

/** Uma figura da folha, espelhada (`flip`), deslocada (`dx` negativo = para a frente, à esquerda) e com o fôlego. */
function figure(img: HTMLImageElement, s: number, i: number, o: { flip?: boolean; dx?: number; dy?: number; breathe?: number } = {}) {
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (o.flip) { ctx.translate(s, 0); ctx.scale(-1, 1); }
  const feet = s - 10;
  const h = s * (1 - (o.breathe ?? 0));
  ctx.drawImage(img, i * s, 0, s, s, (o.dx ?? 0) * (o.flip ? -1 : 1), feet - feet * (h / s) + (o.dy ?? 0), s, h);
  ctx.restore();
  return canvas;
}

async function loadOne(kind: MonsterKind, url: string): Promise<ClanArt> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const s = img.height;
  const at = (i: number, o: Parameters<typeof figure>[3] = {}) => () => figure(img, s, i, o);
  const breath = [0, 0.012, 0.024, 0.012];
  const breathing = (i: number) => breath.map((b) => at(i, { breathe: b }));
  // A folha tem um passo por vista: entre um e outro, o corpo parado um pouco acima. Não espelha (a arma trocaria de mão).
  const walkOnly = WALK_POSE_ONLY.has(kind);
  const steps = (still: number, walk: number) => {
    const mid = walkOnly ? walk : still;
    return [at(walk), at(mid, { dy: -3 }), at(walk, { dy: -1 }), at(mid, { dy: -3 })];
  };
  // Parte de cima do quadro ocupada pelo perfil parado (a barra de vida fica logo acima).
  const { ctx } = makeCanvas(s, s);
  ctx.drawImage(img, F.side * s, 0, s, s, 0, 0, s, s);
  const alpha = ctx.getImageData(0, 0, s, s).data;
  let top = 0;
  while (top < s && !Array.from({ length: s }, (_, x) => alpha[(top * s + x) * 4 + 3]).some((a) => a > 0)) top++;
  const art: ClanArt = {
    size: s,
    fill: (s - top) / s,
    extra: CLAN_EXTRA,
    frames: () => [
      ...breathing(F.side),
      ...steps(F.side, F.sideWalk),
      // Golpe: recua um pouco, avança com a passada e volta (o bote do sprite vem do jogo).
      at(F.side, { dx: 4, dy: 1 }), at(F.sideWalk, { dx: -6 }), at(F.sideWalk, { dx: -8 }), at(F.side, { dx: -2 }),
      // Especial: o corpo se ergue e volta, com o fôlego fundo.
      at(F.side, { breathe: -0.02 }), at(F.side, { breathe: -0.035, dy: -2 }), at(F.side, { breathe: -0.035, dy: -2 }), at(F.side, { breathe: 0.02 }),
      ...breathing(F.front),
      ...steps(F.front, F.frontWalk),
      ...breathing(F.back),
      ...steps(F.back, F.backWalk),
    ],
    portrait: () => figure(img, s, F.side),
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(s * all.length, s);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * s, 0));
      return canvas;
    },
  };
  return art;
}

/** Os monstros do clã que já têm folha (`kosaradius/<kind>.png`), carregados. */
export async function loadClan(): Promise<Partial<Record<MonsterKind, ClanArt>>> {
  const entries = await Promise.all(Object.entries(SHEETS).map(async ([path, url]) => {
    const kind = path.slice(path.lastIndexOf("/") + 1, -".png".length) as MonsterKind;
    return [kind, await loadOne(kind, url)] as const;
  }));
  return Object.fromEntries(entries);
}
