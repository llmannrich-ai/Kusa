import { makeCanvas } from "../pixels.ts";
import { CLIP_POSES, ORC_FEET, ORC_SIZE, shoot, type OrcPose, type View } from "./orc.ts";
import type { Frame } from "./sculpt.ts";

/**
 * Orc batedor na arte nova, esculpido por código (`orc.ts`): nada é baixado, cada figura é fotografada no aparelho
 * quando a hunt pede (`hdStep` em `textures.ts` desenha uma por vez). Quadros: parado (6), andar (8), golpe (6; o
 * especial repete o golpe, sem figura a mais: o batedor não tem habilidade), e depois a morte (5), frente e costas
 * (parado em ida e volta com 3 figuras, andar com 6). São 43 figuras de 136 px (≈ 3 MB de textura).
 */

/** Quadros dos clipes de sempre (`MonsterAnim.frames`). */
export const ORC_CLIP_FRAMES = { idle: 6, walk: 8, attack: 6, cast: 6 } as const;
/** Clipes a mais (quadros), na ordem de `EXTRA_CLIPS` (`bestiary.ts`). */
const EXTRA = { death: 5, idleDown: 4, walkDown: 6, idleUp: 4, walkUp: 6 } as const;

function toCanvas(f: Frame) {
  const { canvas, ctx } = makeCanvas(f.width, f.height);
  const img = ctx.createImageData(f.width, f.height);
  img.data.set(f.data);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function orcScoutArt() {
  const S = ORC_SIZE;
  // Cada pose é uma função só: quadros repetidos apontam para a mesma figura (uma vez na memória do celular).
  const made = new Map<string, () => HTMLCanvasElement>();
  const at = (pose: OrcPose, view: View = "side") => {
    const key = `${view}:${JSON.stringify(pose)}`;
    let job = made.get(key);
    if (!job) made.set(key, job = () => toCanvas(shoot(pose, view)));
    return job;
  };
  const turn = (view: View) => {
    const [a, b, c] = CLIP_POSES.idleTurn.map((p) => at(p, view));
    return [a, b, c, b];
  };
  const attack = CLIP_POSES.attack.map((p) => at(p));
  const art = {
    size: S,
    /** Ponto de apoio no quadro (`MonsterAnim.origin`): 10 px abaixo da linha dos pés, como as folhas do clã. */
    origin: (ORC_FEET + 10) / S,
    extra: EXTRA,
    // Parte de cima do quadro ocupada pelo perfil parado (a barra de vida fica logo acima). Calculada na primeira vez
    // que o jogo pede, não ao abrir o jogo.
    get fill(): number {
      const f = shoot(CLIP_POSES.idle[0], "side");
      let top = 0;
      while (top < S && !Array.from({ length: S }, (_, x) => f.data[(top * S + x) * 4 + 3]).some((a) => a > 0)) top++;
      Object.defineProperty(art, "fill", { value: (S - top) / S });
      return art.fill;
    },
    frames: () => [
      ...CLIP_POSES.idle.map((p) => at(p)),
      ...CLIP_POSES.walk.map((p) => at(p)),
      ...attack,
      ...attack,
      ...CLIP_POSES.death.map((p) => at(p)),
      ...turn("front"),
      ...CLIP_POSES.walkTurn.map((p) => at(p, "front")),
      ...turn("back"),
      ...CLIP_POSES.walkTurn.map((p) => at(p, "back")),
    ],
    portrait: () => at(CLIP_POSES.idle[0])(),
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(S * all.length, S);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
      return canvas;
    },
  };
  return art;
}
