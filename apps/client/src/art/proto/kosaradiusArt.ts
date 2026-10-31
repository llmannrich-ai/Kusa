import type { MonsterKind } from "@kusa/shared";
import { makeCanvas } from "../pixels.ts";

/**
 * Clã do Pântano do Kosaradius (orcs e ogros) da arte nova, a partir das folhas de giro geradas por IA
 * (`docs/arte/pantano-do-kosaradius/<kind>-A.png`, recortadas e alinhadas por
 * `apps/client/scripts/kosaradiusSprites.py`). Cada folha tem as 6 figuras da folha de giro que o jogo usa, em
 * quadros quadrados com os pés a 10 px do fundo: frente, perfil (para a esquerda) e costas, parado e depois andando.
 *
 * Com a folha B (golpe e morte, 8 figuras depois das 6), o golpe e a morte são os desenhados; sem ela, o golpe sai do
 * perfil (o jogo já dá o bote do sprite) e a morte é o tombo de sempre. O especial sai do perfil nos dois casos.
 * Monstro sem folha nenhuma fica na arte por código.
 */
const SHEETS = import.meta.glob<string>("./kosaradius/*.png", { eager: true, import: "default", query: "?url" });

/** Figuras da folha. */
const F = { front: 0, side: 1, back: 2, frontWalk: 3, sideWalk: 4, backWalk: 5 } as const;

/**
 * Quem carrega a arma de outro jeito andando (o Rei: tronco em pé parado, no ombro andando) anda só com a figura de
 * andar, subindo e descendo; os outros alternam a passada com a figura parada.
 */
const WALK_POSE_ONLY = new Set<MonsterKind>(["ogreKing"]);

/** Clipes a mais (quadros), depois dos 4 de sempre, na ordem de `EXTRA_CLIPS` (`bestiary.ts`): frente e costas. */
const CLAN_EXTRA = { idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;
/** Com a folha B: a morte desenhada (o corpo fica no chão em vez de tombar), antes da frente e das costas. */
const CLAN_EXTRA_B = { death: 4, ...CLAN_EXTRA } as const;
/** Figuras da folha B, depois das 6 da A: 4 do golpe e 4 da morte (`kosaradiusSprites.py`). */
const B = { attack: 6, death: 10, end: 14 } as const;

export interface ClanArt {
  size: number;
  fill: number;
  extra: typeof CLAN_EXTRA | typeof CLAN_EXTRA_B;
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
  // Tem a folha B (golpe e morte desenhados)?
  const withB = img.width / s >= B.end;
  // Cada figura (com o deslocamento) é uma função só, reaproveitada nos clipes: o jogo guarda cada uma uma vez na
  // memória (`hdStep` em `textures.ts`). Com uma figura por quadro, os 12 do clã passavam de 150 MB e o celular fechava
  // o jogo. Por isso os clipes usam poucas variações.
  const made = new Map<string, () => HTMLCanvasElement>();
  const at = (i: number, o: Parameters<typeof figure>[3] = {}) => {
    const key = `${i}:${o.dx ?? 0}:${o.dy ?? 0}:${o.breathe ?? 0}`;
    let job = made.get(key);
    if (!job) made.set(key, job = () => figure(img, s, i, o));
    return job;
  };
  const run = (first: number) => [0, 1, 2, 3].map((k) => at(first + k));
  // Fôlego: o corpo encolhe um pouco e volta.
  const breathing = (i: number) => [at(i), at(i, { breathe: 0.02 }), at(i, { breathe: 0.02 }), at(i)];
  // A folha tem um passo por vista: entre um e outro, o corpo parado um pouco acima. Não espelha (a arma trocaria de mão).
  // Quem anda só com a figura de andar (o Rei) sobe e desce com ela.
  const walkOnly = WALK_POSE_ONLY.has(kind);
  const steps = (still: number, walk: number) => {
    const mid = walkOnly ? at(walk, { dy: -3 }) : at(still);
    return [at(walk), mid, at(walk), mid];
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
    extra: withB ? CLAN_EXTRA_B : CLAN_EXTRA,
    frames: () => [
      ...breathing(F.side),
      ...steps(F.side, F.sideWalk),
      // Golpe: o da folha B; sem ela, avança com a passada e volta (o bote do sprite vem do jogo).
      ...(withB ? run(B.attack) : [at(F.side), at(F.sideWalk, { dx: -8 }), at(F.sideWalk, { dx: -8 }), at(F.side)]),
      // Especial: o corpo se ergue e volta.
      at(F.side), at(F.side, { breathe: -0.035, dy: -2 }), at(F.side, { breathe: -0.035, dy: -2 }), at(F.side),
      // A morte desenhada (só com a folha B; sem ela, o jogo tomba o sprite).
      ...(withB ? run(B.death) : []),
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
