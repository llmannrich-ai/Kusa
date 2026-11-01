import { makeCanvas } from "../pixels.ts";
import { SCORPION_POSES, SHELLS, shootScorpion, type Shell } from "./scorpion.ts";
import { SCULPT_FEET, SCULPT_SIZE, type Frame, type View } from "./sculpt.ts";
export { tween } from "./sculpt.ts";
import { VULTURE_POSES, shootVulture } from "./vulture.ts";
import { ELEMENTAL_FEET, ELEMENTAL_POSES, shootElemental } from "./elemental.ts";
import { WORM_FEET, WORM_POSES, WORM_SIZE, shootWorm } from "./sandWorm.ts";
import { MUMMY_FEET, MUMMY_POSES, PRIEST_POSES, shootMummy } from "./mummy.ts";

export { SHELLS };

/**
 * Monstros da arte nova esculpidos por código (`sculpt.ts`, `docs/ARTE_ESCULTURA.md`): nada é baixado, cada figura é
 * fotografada no aparelho quando o jogo pede (`hdStep` em `textures.ts` desenha uma por vez, sem travar a hunt). Mesma
 * ordem de quadros das folhas da Cripta (`criptaArt.ts`): parado, andar, golpe, especial, morte, e frente e costas; o
 * número de quadros de cada clipe é o de poses (as intermediárias saem de `tween`).
 */

/** Poses de perfil de cada clipe. */
export interface ClipPoses<P> {
  idle: readonly P[]; walk: readonly P[]; attack: readonly P[]; special: readonly P[]; death: readonly P[];
  /** 2ª habilidade desenhada (o clipe a mais `skill`, no ritmo do especial). */
  skill?: readonly P[];
}

/** Quadros dos clipes a mais, na ordem de `EXTRA_CLIPS` (`bestiary.ts`). */
export interface SculptExtra { death: number; idleDown: number; walkDown: number; idleUp: number; walkUp: number; skill?: number }

export interface SculptArt {
  size: number;
  fill: number;
  /** Ponto de apoio no quadro (`MonsterAnim.origin`): o chão fica 10 px acima da base do tile, como na Cripta. */
  origin: number;
  /** Quadros de cada clipe (`MonsterAnim.frames`) e dos clipes a mais (`MonsterAnim.extra`). */
  clips: { idle: number; walk: number; attack: number; cast: number };
  extra: SculptExtra;
  /** Quadros por segundo de cada clipe: o golpe e o especial duram o mesmo com mais ou menos quadros. */
  fps: { idle: number; walk: number; attack: number; cast: number };
  /** Quadros do andar por tile (o ciclo cobre 2 tiles). */
  stride: number;
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

export interface SculptOptions {
  /** Linha do chão no quadro (padrão `SCULPT_FEET`, com espaço para as partes de cá; humanoide usa o quadro quase todo). */
  feet?: number;
  /** Lado do quadro (padrão `SCULPT_SIZE`; o chefe usa um maior). */
  size?: number;
  /** Duração (s) do golpe e do especial. */
  attackS?: number;
  castS?: number;
}

/**
 * Folha de um monstro esculpido: `shoot` fotografa uma pose numa vista. De frente e de costas, parado alterna duas
 * poses do parado (cada figura distinta é memória do celular) e andando usa o mesmo ciclo do perfil.
 */
export function sculptArt<P>(poses: ClipPoses<P>, shoot: (pose: P, view: View) => Frame, o: SculptOptions = {}): SculptArt {
  const S = o.size ?? SCULPT_SIZE, feet = o.feet ?? SCULPT_FEET;
  // Cada pose é uma função só (o jogo guarda cada figura uma vez na memória do celular).
  const made = new Map<string, () => HTMLCanvasElement>();
  const at = (pose: P, view: View = "side") => {
    const key = `${view}:${JSON.stringify(pose)}`;
    let job = made.get(key);
    if (!job) made.set(key, job = () => toCanvas(shoot(pose, view)));
    return job;
  };
  const still = poses.idle[0], breath = poses.idle[Math.floor(poses.idle.length / 2)];
  // De frente e de costas o passo aparece menos: cada pose fica 2 quadros (metade das figuras na memória do celular).
  const walk = (view: View) => poses.walk.map((p, i) => at(view === "side" ? p : poses.walk[i - (i % 2)], view));
  const calm = (view: View) => [at(still, view), at(still, view), at(breath, view), at(breath, view)];
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
    origin: Math.min(1, (feet + 10) / S),
    clips: { idle: poses.idle.length, walk: poses.walk.length, attack: poses.attack.length, cast: poses.special.length },
    extra: {
      death: poses.death.length, idleDown: 4, walkDown: poses.walk.length, idleUp: 4, walkUp: poses.walk.length,
      ...(poses.skill ? { skill: poses.skill.length } : {}),
    },
    fps: {
      idle: poses.idle.length / 1.6,
      walk: poses.walk.length * 1.3,
      attack: poses.attack.length / (o.attackS ?? 0.42),
      cast: poses.special.length / (o.castS ?? 0.62),
    },
    stride: poses.walk.length / 2,
    frames: () => [
      ...poses.idle.map((p) => at(p)),
      ...walk("side"),
      ...poses.attack.map((p) => at(p)),
      ...poses.special.map((p) => at(p)),
      ...poses.death.map((p) => at(p)),
      ...calm("front"),
      ...walk("front"),
      ...calm("back"),
      ...walk("back"),
      ...(poses.skill ?? []).map((p) => at(p)),
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
export const mummyArt = () => sculptArt(MUMMY_POSES, shootMummy, { feet: MUMMY_FEET });
export const priestArt = () => sculptArt(PRIEST_POSES, (p, v) => shootMummy(p, v, true), { feet: MUMMY_FEET, castS: 0.8 });
export const elementalArt = () => sculptArt(ELEMENTAL_POSES, shootElemental, { feet: ELEMENTAL_FEET, castS: 0.75 });
export const wormArt = () => sculptArt(WORM_POSES, shootWorm, { feet: WORM_FEET, size: WORM_SIZE, attackS: 0.55, castS: 0.8 });
