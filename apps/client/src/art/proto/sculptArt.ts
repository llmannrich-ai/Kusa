import { makeCanvas } from "../pixels.ts";
import { SCORPION_POSES, SHELLS, shootScorpion, type Shell } from "./scorpion.ts";
import { SCULPT_FEET, SCULPT_SIZE, type Frame, type View } from "./sculpt.ts";
import { VULTURE_POSES, shootVulture } from "./vulture.ts";

export { SHELLS };

/**
 * Monstros da arte nova esculpidos por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): nada é baixado, cada figura é
 * fotografada no aparelho quando o jogo pede (`hdStep` em `textures.ts` desenha uma por vez, sem travar a hunt). Mesma
 * ordem de quadros das folhas da Cripta (`criptaArt.ts`): parado, andar, golpe e especial (4 cada), morte (3), e
 * frente e costas.
 */


/** Clipes a mais (quadros), na ordem de `EXTRA_CLIPS` (`bestiary.ts`). */
const EXTRA = { death: 3, idleDown: 4, walkDown: 4, idleUp: 4, walkUp: 4 } as const;

/** Poses de perfil de cada clipe (4 em cada; a morte com 3). */
export interface ClipPoses<P> { idle: readonly P[]; walk: readonly P[]; attack: readonly P[]; special: readonly P[]; death: readonly P[] }

export interface SculptArt {
  size: number;
  fill: number;
  /** Ponto de apoio no quadro (`MonsterAnim.origin`): o chão fica 10 px acima da base do tile, como na Cripta. */
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

/**
 * Folha de um monstro esculpido: `shoot` fotografa uma pose numa vista. De frente e de costas, parado usa o 1º e o
 * 3º quadro do parado (o fôlego) e andando o mesmo ciclo do perfil.
 */
export function sculptArt<P>(poses: ClipPoses<P>, shoot: (pose: P, view: View) => Frame): SculptArt {
  const S = SCULPT_SIZE;
  // Cada pose é uma função só (o jogo guarda cada figura uma vez na memória do celular).
  const made = new Map<string, () => HTMLCanvasElement>();
  const at = (pose: P, view: View = "side") => {
    const key = `${view}:${JSON.stringify(pose)}`;
    let job = made.get(key);
    if (!job) made.set(key, job = () => toCanvas(shoot(pose, view)));
    return job;
  };
  const [still, breath] = [poses.idle[0], poses.idle[2]];
  const walk = (view: View) => poses.walk.map((p) => at(p, view));
  const art: SculptArt = {
    size: S,
    // Parte de cima do quadro ocupada pelo perfil parado (a barra de vida fica logo acima). Calculada na primeira vez
    // que o jogo pede (no começo da hunt), não ao abrir o jogo.
    get fill() {
      const f = shoot(still, "side");
      let top = 0;
      while (top < S && !Array.from({ length: S }, (_, x) => f.data[(top * S + x) * 4 + 3]).some((a) => a > 0)) top++;
      Object.defineProperty(art, "fill", { value: (S - top) / S });
      return art.fill;
    },
    origin: (SCULPT_FEET + 10) / S,
    extra: EXTRA,
    frames: () => [
      ...poses.idle.map((p) => at(p)),
      ...walk("side"),
      ...poses.attack.map((p) => at(p)),
      ...poses.special.map((p) => at(p)),
      ...poses.death.map((p) => at(p)),
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

export const scorpionArt = (shell: Shell = SHELLS.amber) => sculptArt(SCORPION_POSES, (p, v) => shootScorpion(p, v, shell));
export const vultureArt = () => sculptArt(VULTURE_POSES, shootVulture);
