import { makeCanvas } from "../pixels.ts";
export { SHELLS } from "./scorpion.ts";
import { CLIP_POSES, SCORPION_FEET, SCORPION_SIZE, SHELLS, shoot, type Pose, type Shell, type View } from "./scorpion.ts";
import type { Frame } from "./sculpt.ts";

/**
 * Escorpião da Areia na arte nova, esculpido por código (`scorpion.ts`): nada é baixado, cada figura é fotografada no
 * aparelho quando o jogo pede (`hdStep` em `textures.ts` desenha uma por vez, sem travar a hunt). Mesma ordem de
 * quadros das folhas da Cripta (`criptaArt.ts`): parado, andar, golpe e especial (4 cada), morte (3), e frente e costas.
 */

/** Clipes a mais (quadros), na ordem de `EXTRA_CLIPS` (`bestiary.ts`). */
const EXTRA = { death: 3, idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;

export interface SculptArt {
  size: number;
  fill: number;
  /** Ponto de apoio no quadro (`MonsterAnim.origin`): os pés ficam 10 px acima da base do tile, como na Cripta. */
  origin: number;
  extra: typeof EXTRA;
  frames(): (() => HTMLCanvasElement)[];
  portrait(): HTMLCanvasElement;
  sheet(): HTMLCanvasElement;
}

function toCanvas(f: Frame) {
  const { canvas, ctx } = makeCanvas(f.width, f.height);
  const img = ctx.createImageData(f.width, f.height);
  img.data.set(f.data);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function scorpionArt(shell: Shell = SHELLS.amber): SculptArt {
  const S = SCORPION_SIZE;
  // Cada pose é uma função só (o jogo guarda cada figura uma vez na memória do celular).
  const made = new Map<string, () => HTMLCanvasElement>();
  const at = (pose: Pose, view: View = "side") => {
    const key = `${view}:${JSON.stringify(pose)}`;
    let job = made.get(key);
    if (!job) made.set(key, job = () => toCanvas(shoot(pose, view, shell)));
    return job;
  };
  const [still, breath] = [CLIP_POSES.idle[0], CLIP_POSES.idle[2]];
  const walk = (view: View) => CLIP_POSES.walk.map((p) => at(p, view));
  const art: SculptArt = {
    size: S,
    // Parte de cima do quadro ocupada pelo perfil parado (a barra de vida fica logo acima). Calculada na primeira vez
    // que o jogo pede (no começo da hunt), não ao abrir o jogo.
    get fill() {
      const f = shoot(still, "side", shell);
      let top = 0;
      while (top < S && !Array.from({ length: S }, (_, x) => f.data[(top * S + x) * 4 + 3]).some((a) => a > 0)) top++;
      Object.defineProperty(art, "fill", { value: (S - top) / S });
      return art.fill;
    },
    origin: (SCORPION_FEET + 10) / S,
    extra: EXTRA,
    frames: () => [
      ...CLIP_POSES.idle.map((p) => at(p)),
      ...walk("side"),
      ...CLIP_POSES.attack.map((p) => at(p)),
      ...CLIP_POSES.special.map((p) => at(p)),
      ...CLIP_POSES.death.map((p) => at(p)),
      at(still, "front"), at(still, "front"), at(breath, "front"), at(breath, "front"),
      ...walk("front"),
      at(still, "back"), at(still, "back"), at(breath, "back"), at(breath, "back"),
      ...walk("back"),
    ],
    portrait: () => at(still)(),
    sheet() {
      const all = art.frames();
      const { canvas, ctx } = makeCanvas(S * all.length, S);
      all.forEach((draw, i) => ctx.drawImage(draw(), i * S, 0));
      return canvas;
    },
  };
  return art;
}
