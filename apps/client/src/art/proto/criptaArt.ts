import type { MonsterKind } from "@kusa/shared";
import { makeCanvas } from "../pixels.ts";

/**
 * Inimigos da Cripta da arte nova, a partir das folhas geradas por IA (`docs/arte/cripta/<kind>-A.webp` e `-B.webp`,
 * recortadas e alinhadas por `apps/client/scripts/criptaSprites.py`). Cada folha tem 21 figuras em quadros quadrados
 * com os pés a 10 px do fundo: as 6 da folha de giro (frente, perfil para a esquerda e costas, parado e depois
 * andando) e as 15 da folha de ação, todas de perfil: andar (4), golpe (4), especial (4) e morte (3).
 *
 * Diferente do clã do Kosaradius (`kosaradiusArt.ts`), aqui o andar, o golpe, o especial e a morte são todos desenhados.
 * Monstro sem folha fica na arte de antes (por código).
 */
const SHEETS = import.meta.glob<string>("./cripta/*.png", { eager: true, import: "default", query: "?url" });

/** Figuras da folha (`criptaSprites.py`). */
const F = { front: 0, side: 1, back: 2, frontWalk: 3, sideWalk: 4, backWalk: 5, walk: 6, attack: 10, special: 14, death: 18 } as const;

/** Clipes a mais (quadros), na ordem de `EXTRA_CLIPS` (`bestiary.ts`): a morte desenhada, frente e costas. */
const CRYPT_EXTRA = { death: 3, idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;

export interface CryptArt {
  size: number;
  fill: number;
  extra: typeof CRYPT_EXTRA;
  /** Quadros do jogo: parado, andar, golpe e especial (4 cada) e depois os clipes a mais, na ordem de `CRYPT_EXTRA`. */
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
}

/** Uma figura da folha com o fôlego (o corpo encolhe na vertical em volta da linha dos pés) e deslocada (`dy`). */
function figure(img: HTMLImageElement, s: number, i: number, o: { dy?: number; breathe?: number } = {}) {
  const { canvas, ctx } = makeCanvas(s, s);
  ctx.imageSmoothingEnabled = false;
  const feet = s - 10;
  const h = s * (1 - (o.breathe ?? 0));
  ctx.drawImage(img, i * s, 0, s, s, 0, feet - feet * (h / s) + (o.dy ?? 0), s, h);
  return canvas;
}

async function loadOne(url: string): Promise<CryptArt> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const s = img.height;
  // Cada figura (com o deslocamento) é uma função só, reaproveitada nos clipes: o jogo guarda cada uma uma vez na
  // memória do celular (`hdStep` em `textures.ts`).
  const made = new Map<string, () => HTMLCanvasElement>();
  const at = (i: number, o: Parameters<typeof figure>[3] = {}) => {
    const key = `${i}:${o.dy ?? 0}:${o.breathe ?? 0}`;
    let job = made.get(key);
    if (!job) made.set(key, job = () => figure(img, s, i, o));
    return job;
  };
  const run = (first: number, n = 4) => Array.from({ length: n }, (_, k) => at(first + k));
  const breathing = (i: number) => [at(i), at(i, { breathe: 0.02 }), at(i, { breathe: 0.02 }), at(i)];
  const still = (i: number) => [at(i), at(i), at(i), at(i)];
  // De frente e de costas a folha só tem um passo: alterna com a figura parada.
  const steps = (rest: number, walk: number) => [at(walk), at(rest), at(walk), at(rest)];
  // Parte de cima do quadro ocupada pelo perfil parado (a barra de vida fica logo acima).
  const { ctx } = makeCanvas(s, s);
  ctx.drawImage(img, F.side * s, 0, s, s, 0, 0, s, s);
  const alpha = ctx.getImageData(0, 0, s, s).data;
  let top = 0;
  while (top < s && !Array.from({ length: s }, (_, x) => alpha[(top * s + x) * 4 + 3]).some((a) => a > 0)) top++;
  const art: CryptArt = {
    size: s,
    fill: (s - top) / s,
    extra: CRYPT_EXTRA,
    frames: () => [
      ...breathing(F.side),
      ...run(F.walk),
      ...run(F.attack),
      ...run(F.special),
      ...run(F.death, 3),
      // Frente e costas paradas sem o fôlego: cada fôlego é uma figura a mais na memória do celular, e a Cripta carrega
      // os 17 de uma vez (~50 MB com 21 figuras por monstro).
      ...still(F.front),
      ...steps(F.front, F.frontWalk),
      ...still(F.back),
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

/** Os inimigos da Cripta que já têm folha (`cripta/<kind>.png`), carregados. */
export async function loadCrypt(): Promise<Partial<Record<MonsterKind, CryptArt>>> {
  const entries = await Promise.all(Object.entries(SHEETS).map(async ([path, url]) => {
    const kind = path.slice(path.lastIndexOf("/") + 1, -".png".length) as MonsterKind;
    return [kind, await loadOne(url)] as const;
  }));
  return Object.fromEntries(entries);
}
