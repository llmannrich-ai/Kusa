import { and, ellipse, limb, minus, or, rect, shift, sym, type Mask } from "./raster.ts";

/**
 * Esqueleto do herói (o "manequim"): onde ficam cabeça, tronco, braços e pernas em cada direção e quadro
 * de caminhada, e as formas de cada parte. Os corpos das 4 classes e todos os itens são desenhados sobre
 * estas formas, por isso um item encaixa igual em qualquer classe e em qualquer quadro.
 *
 * Quadro 48×48, centro em x = 23.5, pés na linha 45. Cabeça 9–22, tronco 22–34, pernas 34–45.
 * De lado o herói olha para a esquerda (a direita é a mesma folha espelhada).
 */

export type HeroDir = "down" | "up" | "side";
export const HERO_DIRS: HeroDir[] = ["down", "up", "side"];
export const HERO_FRAMES = 3;
export const CX = 23.5;
export const FEET = 45;

export type Pt = readonly [number, number];

export interface Arm {
  shoulder: Pt;
  elbow: Pt;
  hand: Pt;
  upper: Mask;
  fore: Mask;
  handMask: Mask;
  /** Braço do lado de lá (de lado): fica atrás do tronco. */
  far: boolean;
}

export interface Leg {
  hip: Pt;
  knee: Pt;
  ankle: Pt;
  thigh: Mask;
  shin: Mask;
  foot: Mask;
  /** Ponta do pé (de lado, para onde o pé aponta). */
  toe: Pt;
  far: boolean;
  /** O calcanhar está no ar (perna de trás no passo). */
  lifted: boolean;
}

export interface Pose {
  dir: HeroDir;
  frame: number;
  bob: number;
  head: Pt;
  headMask: Mask;
  /** Linhas do tronco (já com o balanço do passo). */
  neck: number;
  shoulder: number;
  waist: number;
  hip: number;
  torso: Mask;
  /** Bacia: da cintura ao começo das pernas (a calça cobre). */
  pelvis: Mask;
  /**
   * De frente, o braço da esquerda e o da direita da tela (a arma vai na direita de frente e na esquerda
   * de costas). De lado, `left` é o braço de cá e `right` o de lá.
   */
  arms: { left: Arm; right: Arm };
  /** Pernas em ordem de desenho (a de trás primeiro). */
  legs: [Leg, Leg];
}

const ARM_R = 1.9;
const LEG_R = 2.4;

function arm(shoulder: Pt, elbow: Pt, hand: Pt, far: boolean): Arm {
  const handMask = ellipse(hand[0], hand[1] + 0.3, 2.3, 2.2);
  return {
    shoulder, elbow, hand, far,
    upper: limb([shoulder, elbow], ARM_R),
    fore: minus(limb([elbow, hand], ARM_R - 0.1), handMask),
    handMask,
  };
}

function leg(hip: Pt, knee: Pt, ankle: Pt, toe: Pt, far: boolean, lifted: boolean, side: boolean): Leg {
  const foot = side
    ? or(limb([ankle, toe], 1.9), ellipse(ankle[0] + 0.5, ankle[1] + 0.5, 2.3, 1.8))
    : ellipse(ankle[0], ankle[1] + 0.8, 2.9, 2.1);
  return {
    hip, knee, ankle, toe, far, lifted,
    thigh: limb([hip, knee], LEG_R + 0.2),
    shin: minus(limb([knee, ankle], LEG_R - 0.1), foot),
    foot,
  };
}

/**
 * Como a mão da arma se comporta. De frente e de costas ela balança com o passo, menos no "staff" (fica
 * parada segurando o cajado fincado no chão). De lado: "staff", "bow" e "blade" levam a arma à frente no
 * braço de cá; "guard" (arma corpo a corpo com escudo) leva a arma à frente no braço de lá, e o de cá
 * segura o escudo; "swing" deixa os dois braços balançando.
 */
export type Hold = "swing" | "staff" | "bow" | "blade" | "guard";

/** Pose de frente ("down") ou de costas ("up"). */
function frontal(dir: HeroDir, frame: number, hold: Hold): Pose {
  const bob = frame ? 1 : 0;
  // Passo: no quadro 1 a perna da esquerda (da tela) vai à frente; no 2, a da direita.
  const leftAhead = frame === 1, rightAhead = frame === 2;
  const back = dir === "up";
  const shoulder = 24 + bob;
  // A mão do lado da perna que vai à frente vai para trás (sobe) e a outra vem (desce).
  const handY = (ahead: boolean, other: boolean) => 32.5 + bob + (ahead ? -1 : other ? 1 : 0);
  // A mão da arma é a da direita da tela de frente e a da esquerda de costas; com cajado ela não balança.
  const steadyLeft = hold === "staff" && back, steadyRight = hold === "staff" && !back;
  const left = arm([15.5, shoulder + 0.5], [15.5, shoulder + 4.5], [15.5, steadyLeft ? 32.5 + bob : handY(leftAhead, rightAhead)], false);
  const right = arm([31.5, shoulder + 0.5], [31.5, shoulder + 4.5], [31.5, steadyRight ? 32.5 + bob : handY(rightAhead, leftAhead)], false);
  const hip = 34 + bob;
  const legAt = (x: number, ahead: boolean, behind: boolean) => {
    // Pé que vai à frente desce 1 (mais perto da câmera); o de trás sobe com o calcanhar no ar.
    const ankle = 42 + (ahead && !back ? 1 : 0) - (behind ? 2 : 0);
    return leg([x, hip], [x, (hip + ankle) / 2], [x, ankle], [x, ankle + 2], false, behind, false);
  };
  const legL = legAt(20, leftAhead, rightAhead);
  const legR = legAt(27, rightAhead, leftAhead);
  const head: Pt = [CX, 15.5 + bob];
  return {
    dir, frame, bob, head,
    headMask: ellipse(head[0], head[1], 8, 7.2),
    neck: 22 + bob, shoulder, waist: 31 + bob, hip,
    torso: shift(sym(22, [4.5, 6, 6, 6, 6, 6, 6, 5.5, 5, 5, 5, 6, 6]), 0, bob),
    pelvis: shift(sym(31, [5, 5.5, 6, 6, 6]), 0, bob),
    arms: { left, right },
    legs: [legL, legR],
  };
}

/** Pose de lado, olhando para a esquerda. */
function profile(frame: number, hold: Hold): Pose {
  const bob = frame ? 1 : 0;
  const shoulder = 24 + bob;
  const hip = 34 + bob;
  // Quadro 1: a perna de cá vai à frente; quadro 2: vai para trás. O braço de cá balança ao contrário.
  const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const forward = (x: number, far: boolean) => arm([x, shoulder + 0.5], [x - 2, shoulder + 4], [x - 5.5, shoulder + 6.5], far);
  const near = hold === "swing" || hold === "guard"
    ? arm([24, shoulder + 0.5], [24 + swing * 0.8, shoulder + 4.5], [24 + swing * 3.5, 32.5 + bob - Math.abs(swing) * 0.5], false)
    : forward(23.5, false);
  const far = hold === "guard"
    ? forward(24.5, true)
    : arm([23, shoulder + 0.5], [23 - swing * 0.8, shoulder + 4.5], [23 - swing * 3.5, 32 + bob - Math.abs(swing) * 0.5], true);
  const step = (dir: number, isFar: boolean) => {
    // dir < 0: pé à frente (esquerda); dir > 0: pé atrás com o calcanhar no ar.
    const x = (isFar ? 24.5 : 23.5);
    if (dir === 0) return leg([x, hip], [x - 0.5, hip + 4.5], [x, 42.5], [x - 4, 43.5], isFar, false, true);
    if (dir < 0) return leg([x - 1, hip], [x - 3, hip + 4.2], [x - 4.5, 42.5], [x - 8.5, 43.5], isFar, false, true);
    return leg([x + 1, hip], [x + 2, hip + 4.5], [x + 5, 41.2], [x + 2.5, 43], isFar, true, true);
  };
  const legs: [Leg, Leg] = frame === 0
    ? [step(0, true), step(0, false)]
    : [step(frame === 1 ? 1 : -1, true), step(frame === 1 ? -1 : 1, false)];
  const head: Pt = [CX, 15.5 + bob];
  return {
    dir: "side", frame, bob, head,
    headMask: ellipse(head[0], head[1], 7.6, 7.2),
    neck: 22 + bob, shoulder, waist: 31 + bob, hip,
    torso: shift(and(sym(22, [3, 4.5, 5, 5, 5, 5, 5, 4.5, 4.5, 4.5, 4.5, 5, 5]), rect(0, 0, 47, 47)), 0, bob),
    pelvis: shift(sym(31, [4.5, 5, 5, 5, 4.5]), 0, bob),
    arms: { left: near, right: far },
    legs,
  };
}

const POSES = new Map<string, Pose>();

/** Pose de uma direção e quadro (0 parado, 1 e 2 passos). */
export function pose(dir: HeroDir, frame: number, hold: Hold = "swing"): Pose {
  const key = `${dir}${frame}${hold}`;
  let p = POSES.get(key);
  if (!p) POSES.set(key, (p = dir === "side" ? profile(frame, hold) : frontal(dir, frame, hold)));
  return p;
}
