import { stepOf, type Dir } from "./creature.ts";
import type { Painter, Ramp } from "./paint.ts";

/**
 * Esqueleto de criatura humanoide (heróis, goblin, esqueleto, orc, ogro): calcula as juntas
 * para a direção e o quadro da caminhada e desenha pernas, tronco e braços na ordem certa.
 * Cabeça, roupas e armas vêm do `Look` de cada criatura.
 *
 * "W" é a mão da arma e "O" a outra: de frente a arma fica à direita da tela, de costas à
 * esquerda, e de lado (olhando para a esquerda) na mão de perto da câmera.
 */

export interface Point { x: number; y: number }

export interface Build {
  headR: number;
  shoulder: number;
  chestRx: number;
  chestRy: number;
  waistRx: number;
  hip: number;
  legR: number;
  armR: number;
  handR: number;
  legLen: number;
  torsoLen: number;
}

const HERO_BUILD: Build = {
  headR: 9, shoulder: 8.5, chestRx: 8, chestRy: 6.5, waistRx: 6.5, hip: 3.6,
  legR: 3, armR: 2.5, handR: 2.4, legLen: 14, torsoLen: 13,
};

export interface Joints {
  dir: Dir;
  step: number;
  /** Escala da criatura (1 = herói). */
  k: number;
  b: Build;
  cx: number;
  /** Linha do chão (base dos pés). */
  g: number;
  head: Point;
  chest: Point;
  hipY: number;
  shoulderW: Point;
  shoulderO: Point;
  handW: Point;
  handO: Point;
  hipW: Point;
  hipO: Point;
  footW: Point;
  footO: Point;
  /** +1 se a mão da arma está à direita da tela; no lado, −1 (a frente é a esquerda). */
  sideW: number;
}

type Part = (s: Painter, j: Joints) => void;

export interface Look {
  k?: number;
  build?: Partial<Build>;
  skin: Ramp;
  /** Tronco (camisa, armadura ou pele). */
  shirt: Ramp;
  sleeves?: Ramp;
  pants?: Ramp;
  /** Botas; sem botas, pés na cor da pele. */
  boots?: Ramp;
  /** Saia longa (túnica de mago) no lugar das pernas. */
  robe?: Ramp;
  /** Ombreiras. */
  shoulders?: Ramp;
  /** Detalhe sobre cada ombreira (espigão da armadura do dragão). */
  pauldron?: (s: Painter, j: Joints, at: Point) => void;
  head: Part;
  /** Substitui o tronco padrão (costelas do esqueleto). */
  torsoShape?: Part;
  /** Detalhes sobre o tronco: cinto, emblema, tanga. */
  torso?: Part;
  weapon?: Part;
  offhand?: Part;
  /** Costas: aljava, capa. */
  back?: Part;
  /** Substitui as pernas (cauda de cobra da naga). */
  legs?: Part;
  /** De lado, segura a arma na mão de trás (cajados), para ela não cobrir o rosto. */
  farGrip?: boolean;
}

export function joints(dir: Dir, frame: number, cx: number, g: number, k: number, build: Partial<Build> = {}): Joints {
  const b = { ...HERO_BUILD, ...build };
  const step = stepOf(frame);
  // O corpo sobe 1 pixel no meio do passo; os pés continuam no chão.
  const body = g - (step ? 1 : 0);
  const footY = g - 2.5 * k;
  const hipY = body - (2.5 + b.legLen) * k;
  const shoulderY = hipY - (b.torsoLen - 2) * k;
  const headY = hipY - b.torsoLen * k - b.headR * 0.85 * k;
  const chest = { x: cx, y: hipY - b.torsoLen * 0.55 * k };
  const handY = hipY - 0.5 * k;

  if (dir === "side") {
    // Perna de perto (W) à frente no passo 1, atrás no passo −1; o braço balança ao contrário.
    const fwd = -5 * k, back = 4.5 * k;
    const footW = { x: cx + (step === 0 ? -1.5 * k : step > 0 ? fwd : back), y: footY - (step < 0 ? 1 : 0) };
    const footO = { x: cx + (step === 0 ? 1.5 * k : step > 0 ? back : fwd), y: footY - (step > 0 ? 1 : 0) };
    return {
      dir, step, k, b, cx, g, chest, hipY, sideW: -1, footW, footO,
      head: { x: cx - 1 * k, y: headY },
      shoulderW: { x: cx - 0.5 * k, y: shoulderY + 1 },
      shoulderO: { x: cx + 1.5 * k, y: shoulderY },
      // A mão da arma fica à frente do corpo e balança pouco.
      handW: { x: cx - 3 * k + 1.5 * k * step, y: handY - 1 },
      handO: { x: cx + 1.5 * k - 3 * k * step, y: handY - 1 },
      hipW: { x: cx - 0.5 * k, y: hipY },
      hipO: { x: cx + 1 * k, y: hipY },
    };
  }

  const sideW = dir === "down" ? 1 : -1;
  const w = (dx: number) => cx + sideW * dx * k;
  // Pé de trás levanta, o da frente desce um pouco (perspectiva de cima).
  const lift = (forward: boolean) => (step === 0 ? 0 : forward ? 1.5 : -2.5);
  const forwardW = step < 0;
  return {
    dir, step, k, b, cx, g, chest, hipY, sideW,
    head: { x: cx, y: headY },
    shoulderW: { x: w(b.shoulder), y: shoulderY + 1 },
    shoulderO: { x: w(-b.shoulder), y: shoulderY + 1 },
    handW: { x: w(b.shoulder + 1.5), y: handY + (step === 0 ? 0 : forwardW ? -1 : 1.5) },
    handO: { x: w(-b.shoulder - 1.5), y: handY + (step === 0 ? 0 : forwardW ? 1.5 : -1) },
    hipW: { x: w(b.hip), y: hipY },
    hipO: { x: w(-b.hip), y: hipY },
    footW: { x: w(4), y: footY + lift(forwardW) },
    footO: { x: w(-4), y: footY + lift(step > 0) },
  };
}

function leg(s: Painter, look: Look, j: Joints, hip: Point, foot: Point) {
  const { k, b } = j;
  if (!look.robe) s.limb(hip.x, hip.y, foot.x, foot.y - 1.5 * k, b.legR * k, b.legR * 0.85 * k, look.pants ?? look.shirt);
  const side = j.dir === "side";
  s.sphere(foot.x - (side ? 1.2 * k : 0), foot.y, (side ? 4 : 3.4) * k, 2.5 * k, look.boots ?? look.skin);
}

function robe(s: Painter, look: Look, j: Joints) {
  if (!look.robe) return;
  const { cx, k, b, chest, g, step } = j;
  const top = chest.y + 1;
  const bottom = g - 2.2 * k;
  const half = (j.dir === "side" ? 7.5 : 9.5) * k;
  const sway = j.dir === "side" ? step * 1.5 : 0;
  const tw = b.chestRx * (j.dir === "side" ? 0.65 : 0.85) * k;
  s.poly([cx - tw, top, cx + tw, top, cx + half + sway, bottom, cx - half + sway, bottom], look.robe);
}

function torso(s: Painter, look: Look, j: Joints) {
  if (look.torsoShape) return look.torsoShape(s, j);
  const { cx, k, b, chest, hipY } = j;
  const narrow = j.dir === "side" ? 0.75 : 1;
  const pants = look.robe ?? look.pants ?? look.shirt;
  s.sphere(cx, hipY, b.waistRx * narrow * k, 3.5 * k, pants);
  s.sphere(cx, hipY - 2 * k, b.waistRx * narrow * k, 4 * k, look.shirt);
  s.sphere(chest.x, chest.y, b.chestRx * narrow * k, b.chestRy * k, look.shirt, { join: true });
}

function arm(s: Painter, look: Look, j: Joints, shoulder: Point, hand: Point) {
  const { k, b } = j;
  s.limb(shoulder.x, shoulder.y, hand.x, hand.y - b.handR * 0.6 * k, b.armR * k, b.armR * 0.85 * k, look.sleeves ?? look.shirt);
  if (look.shoulders) {
    s.sphere(shoulder.x, shoulder.y, 3.8 * k, 3.4 * k, look.shoulders);
    look.pauldron?.(s, j, shoulder);
  }
}

const hand = (s: Painter, look: Look, j: Joints, p: Point) => s.sphere(p.x, p.y, j.b.handR * j.k, j.b.handR * j.k, look.skin);

/** Desenha o humanoide inteiro com os pés em `g` e centrado em `cx`. */
export function humanoid(s: Painter, look: Look, dir: Dir, frame: number, cx: number, g: number) {
  const j = joints(dir, frame, cx, g, look.k ?? 1, look.build);
  const call = (part?: Part) => part?.(s, j);
  const legs = () => {
    if (look.legs) return look.legs(s, j);
    leg(s, look, j, j.hipO, j.footO);
    leg(s, look, j, j.hipW, j.footW);
  };
  if (dir === "down") {
    call(look.back);
    legs();
    robe(s, look, j);
    torso(s, look, j);
    call(look.torso);
    arm(s, look, j, j.shoulderO, j.handO);
    arm(s, look, j, j.shoulderW, j.handW);
    hand(s, look, j, j.handO);
    call(look.head);
    call(look.offhand);
    call(look.weapon);
    hand(s, look, j, j.handW);
  } else if (dir === "up") {
    call(look.weapon);
    call(look.offhand);
    legs();
    robe(s, look, j);
    torso(s, look, j);
    call(look.torso);
    arm(s, look, j, j.shoulderO, j.handO);
    arm(s, look, j, j.shoulderW, j.handW);
    hand(s, look, j, j.handO);
    hand(s, look, j, j.handW);
    call(look.head);
    call(look.back);
  } else {
    // A mão de trás vem para a frente do corpo: a arma aparece acima e abaixo da cabeça.
    if (look.farGrip) j.handO = { x: j.cx - 5 * j.k + j.step * j.k, y: j.hipY - 1.5 * j.k };
    const far = look.farGrip ? { ...j, handW: j.handO } : undefined;
    arm(s, look, j, j.shoulderO, j.handO);
    if (far) look.weapon?.(s, far);
    hand(s, look, j, j.handO);
    call(look.offhand);
    legs();
    robe(s, look, j);
    call(look.back);
    torso(s, look, j);
    call(look.torso);
    call(look.head);
    arm(s, look, j, j.shoulderW, j.handW);
    if (!far) call(look.weapon);
    hand(s, look, j, j.handW);
  }
}

// --- Peças comuns das cabeças ------------------------------------------------

export const headRx = (j: Joints) => j.b.headR * j.k;

/** Olhos de 1×2 pixels (de frente: dois; de lado: um; de costas: nenhum). */
export function eyes(s: Painter, j: Joints, color: Ramp, dy = 1, spread = 3) {
  const { head: h, k } = j;
  if (j.dir === "up") return;
  if (j.dir === "side") {
    s.dots([h.x - 5 * k, h.y + dy * k, h.x - 5 * k, h.y + dy * k + 1], color);
    return;
  }
  const lx = h.x - spread * k - 0.5, rx = h.x + (spread - 1) * k + 0.5;
  s.dots([lx, h.y + dy * k, lx, h.y + dy * k + 1, rx, h.y + dy * k, rx, h.y + dy * k + 1], color);
}

/** Gira os pontos relativos [x, y, ...] por `angle` e soma a origem. */
export function placed(points: number[], origin: Point, angle = 0) {
  const c = Math.cos(angle), sn = Math.sin(angle);
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    out.push(origin.x + points[i] * c - points[i + 1] * sn, origin.y + points[i] * sn + points[i + 1] * c);
  }
  return out;
}
