import { Canvas } from "./raster.ts";
import type { Arm, Leg, Pose } from "./rig.ts";

/**
 * Montagem de um quadro: o corpo da classe e cada item vestido são "roupas" (`Wear`) com ganchos
 * chamados na ordem de pintura, de trás para a frente. Um item só sabe pintar a si mesmo sobre as
 * formas do esqueleto; quem decide a ordem e o lado de cada coisa é esta função.
 *
 * Ordem: costas → (de costas: arma e escudo) → braço de lá → pernas (calça, botas) → tronco (roupa,
 * armadura, saia) → braços → por cima (cinto, ombreiras, gola) → (de costas: capa) → cabeça (rosto,
 * cabelo, chapéu ou capacete) → arma e escudo na frente.
 */

export interface HeadCover {
  /** Esconde o cabelo de cima (capacete, capuz, chapéu). */
  hair: boolean;
  /** Esconde o rosto e a barba (elmo fechado). */
  face: boolean;
  /** Esconde o cabelo dos lados e da nuca (capuz, elmo fechado). */
  sides: boolean;
}

export interface Ctx {
  cv: Canvas;
  p: Pose;
  /** O que o capacete vestido cobre (sem capacete: nada; aí vale o chapéu da classe). */
  helmet: HeadCover | null;
  /** Veste um manto (a túnica da classe não aparece). */
  robe: boolean;
  /** Pele da classe (a mão fechada por cima do cabo). */
  skin: number;
}

export interface Wear {
  back?(c: Ctx): void;
  leg?(c: Ctx, leg: Leg): void;
  torso?(c: Ctx): void;
  arm?(c: Ctx, arm: Arm): void;
  over?(c: Ctx): void;
  /** Capa e capuz vistos de costas (por cima do tronco e dos braços). */
  cape?(c: Ctx): void;
  head?(c: Ctx): void;
}

/** Algo na mão: arma ou escudo. */
export interface Held {
  draw(c: Ctx, arm: Arm, behind: boolean): void;
  /** Nas costas (escudo de quem usa arco ou cajado, visto de lado). */
  back?(c: Ctx): void;
}

export interface Figure {
  wears: Wear[];
  weapon: Held;
  shield?: Held;
  /** Arma corpo a corpo: com escudo, de lado ela vai no braço de lá e o escudo no de cá. */
  melee: boolean;
  helmet: HeadCover | null;
  robe: boolean;
  skin: number;
}

export function drawFigure(p: Pose, f: Figure): Canvas {
  const cv = new Canvas();
  const c: Ctx = { cv, p, helmet: f.helmet, robe: f.robe, skin: f.skin };
  const call = <K extends keyof Wear>(k: K, ...args: unknown[]) => {
    for (const w of f.wears) (w[k] as ((...a: unknown[]) => void) | undefined)?.call(w, c, ...args);
  };
  const { left, right } = p.arms;
  // De lado: arma corpo a corpo com escudo vai no braço de lá (estendido à frente) e o escudo no de cá;
  // sem escudo, ou com arco e cajado, a arma vai no braço de cá e o escudo (se houver) nas costas.
  const meleeSide = p.dir === "side" && f.melee && !!f.shield;

  call("back");
  if (p.dir === "side" && f.shield && !meleeSide) f.shield.back?.(c);
  if (p.dir === "up") {
    f.weapon.draw(c, left, true);
    f.shield?.draw(c, right, true);
  }
  if (p.dir === "side") {
    if (meleeSide) f.weapon.draw(c, right, true);
    call("arm", right);
  }
  for (const leg of p.legs) call("leg", leg);
  call("torso");
  if (p.dir === "side") call("arm", left);
  else { call("arm", left); call("arm", right); }
  call("over");
  if (p.dir === "up") call("cape");
  call("head");
  if (p.dir === "down") {
    f.shield?.draw(c, left, false);
    f.weapon.draw(c, right, false);
  } else if (p.dir === "side") {
    if (meleeSide) f.shield?.draw(c, left, false);
    else f.weapon.draw(c, left, false);
  }
  return cv;
}
