import type { MonsterKind } from "@kusa/shared";
import { CREATURE_GROWTH, grownArt, stepOf, type CreatureArt, type Dir } from "./creature.ts";
import { eyes, headRx, humanoid, placed, type Joints, type Look, type Point } from "./humanoid.ts";
import { ramp, solid, type Painter, type Ramp } from "./paint.ts";

/**
 * Arte própria dos monstros, no mesmo traço dos heróis: humanoides usam o esqueleto de
 * `humanoid.ts` com outras proporções; os bichos têm corpo próprio. Tudo é desenhado na escala
 * do esqueleto padrão e ampliado (`grownArt`) para ficar do tamanho dos heróis. Mini-boss e boss
 * passam de um tile, como as criaturas grandes do Tibia.
 */

export const WOOD = ramp("#8a5e32");
export const DARK_WOOD = ramp("#5e3c1c");
const IRON = ramp("#8d939e", 1.1);
const RUST = ramp("#9a8676");
const BONE = ramp("#ddd6bf");
export const WHITE = solid("#f4efe2");
export const HOLE = solid("#1a1210");
export const YELLOW_EYE = solid("#ffd23a");

// --- Ratazana -------------------------------------------------------------------

const FUR = ramp("#8a7562");
const BELLY = ramp("#b8a28a");
const PINK = ramp("#e09a9a");
const RED_EYE = solid("#ff4040");

function rat(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const step = stepOf(frame);
  const bob = step ? 1 : 0;
  if (dir === "side") {
    s.chain([cx + 9, g - 6, 1.6, cx + 16, g - 3, 1.2, cx + 22, g - 6 - step, 0.9, cx + 26, g - 4, 0.6], PINK);
    s.sphere(cx + 8 + step * 2, g - 2, 2.2, 1.6, PINK);
    s.sphere(cx - 5 - step * 2, g - 2, 2, 1.5, PINK);
    s.sphere(cx + 2, g - 8 - bob, 10, 6.5, FUR);
    s.sphere(cx + 1, g - 5 - bob, 7, 3, BELLY, { join: true });
    s.sphere(cx + 9 - step * 2, g - 2, 2.4, 1.7, PINK);
    s.sphere(cx - 7 + step * 2, g - 2, 2.2, 1.6, PINK);
    s.sphere(cx - 8, g - 10 - bob, 6, 5, FUR);
    s.sphere(cx - 13, g - 8 - bob, 3.5, 2.8, FUR, { join: true });
    s.sphere(cx - 5, g - 15 - bob, 2.6, 3, FUR);
    s.sphere(cx - 5, g - 15 - bob, 1.3, 1.8, PINK, { edge: false });
    s.dots([cx - 16.5, g - 9 - bob], PINK, 3);
    s.dots([cx - 10, g - 12 - bob, cx - 10, g - 11 - bob], RED_EYE);
    s.dots([cx - 15, g - 6 - bob, cx - 18, g - 5 - bob, cx - 14, g - 6 - bob, cx - 19, g - 8 - bob], solid("#d8d0c4"));
    return;
  }
  const fy = (side: number) => g - 2 + (step === 0 ? 0 : step === side ? -1.5 : 0.5);
  if (dir === "down") {
    s.chain([cx + 7, g - 8, 1.4, cx + 11, g - 11, 1, cx + 12, g - 14, 0.7], PINK);
    s.sphere(cx, g - 10 - bob, 8.5, 7, FUR);
    s.sphere(cx - 5, fy(1), 2.2, 1.6, PINK);
    s.sphere(cx + 5, fy(-1), 2.2, 1.6, PINK);
    for (const sign of [-1, 1]) {
      s.sphere(cx + sign * 5.5, g - 15 - bob, 2.8, 3, FUR);
      s.sphere(cx + sign * 5.5, g - 15 - bob, 1.4, 1.8, PINK, { edge: false });
    }
    s.sphere(cx, g - 9 - bob, 6.5, 5.5, FUR);
    s.sphere(cx, g - 5.5 - bob, 3.4, 2.6, BELLY, { join: true });
    s.dots([cx - 0.5, g - 4 - bob, cx + 0.5, g - 4 - bob], PINK, 3);
    s.dots([cx - 3, g - 10 - bob, cx - 3, g - 9 - bob, cx + 3, g - 10 - bob, cx + 3, g - 9 - bob], RED_EYE);
    return;
  }
  s.sphere(cx, g - 16 - bob, 5, 4.5, FUR);
  s.sphere(cx - 4.5, g - 19 - bob, 2.6, 2.8, FUR);
  s.sphere(cx + 4.5, g - 19 - bob, 2.6, 2.8, FUR);
  s.sphere(cx - 6, fy(1), 2.3, 1.7, PINK);
  s.sphere(cx + 6, fy(-1), 2.3, 1.7, PINK);
  s.sphere(cx, g - 9 - bob, 8.5, 7.5, FUR);
  s.chain([cx + 1, g - 4, 1.6, cx + 5, g - 1.5, 1.2, cx + 11, g - 2, 0.9, cx + 15, g - 5 - step, 0.6], PINK);
}

// --- Sapo gigante ---------------------------------------------------------------

const FROG = ramp("#4caf50");
const FROG_DARK = ramp("#2f7a34");
const FROG_BELLY = ramp("#d8e0a0");

/** Sapo: pula (quadro 1 no ar, quadro 2 agachado). */
function frog(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const step = stepOf(frame);
  const up = step === 1 ? 3 : 0;
  const squash = step === -1 ? 1 : 0;
  const eye = (x: number, y: number) => {
    s.sphere(x, y, 2.7, 2.5, FROG);
    s.dots([x - 0.5, y - 0.5, x + 0.5, y - 0.5], YELLOW_EYE).dots([x, y], HOLE);
  };
  if (dir === "side") {
    s.sphere(cx + 5, g - 1.5, 4.5, 1.6, FROG_DARK);
    s.sphere(cx + 2, g - 7 - up + squash, 10 + squash, 6.5 - squash, FROG);
    s.sphere(cx - 1, g - 4 - up + squash, 7, 3, FROG_BELLY, { join: true });
    s.dots([cx + 4, g - 11 - up, cx + 7, g - 9 - up, cx + 1, g - 12 - up], FROG_DARK, 1);
    s.sphere(cx - 7, g - 10 - up + squash, 6.5, 5, FROG);
    s.line(cx - 13, g - 8 - up + squash, cx - 5, g - 7 - up + squash, HOLE);
    eye(cx - 6, g - 15 - up + squash);
    s.sphere(cx + 7, g - 6 - up + squash, 5, 4.5, FROG);
    if (up) s.limb(cx + 9, g - 4 - up, cx + 14, g - 1.5, 2, 1.4, FROG);
    else s.sphere(cx + 4, g - 1.5, 5.5, 1.8, FROG);
    s.limb(cx - 5, g - 6 - up, cx - 8, g - 1.5, 1.6, 1.3, FROG);
    s.sphere(cx - 9, g - 1.2, 2.6, 1.2, FROG);
    return;
  }
  const front = dir === "down";
  for (const sign of [-1, 1]) {
    s.sphere(cx + sign * 10, g - 4 - up * 0.5, 4.5, 3.5, FROG);
    s.sphere(cx + sign * 12, g - 1.5, 3.5, 1.5, FROG_DARK);
  }
  if (!front) for (const sign of [-1, 1]) eye(cx + sign * 5, g - 15 - up);
  s.sphere(cx, g - 9 - up + squash, 10 + squash, 7 - squash, FROG);
  if (front) {
    s.sphere(cx, g - 7 - up + squash, 8.5, 5.5, FROG);
    for (const sign of [-1, 1]) eye(cx + sign * 5, g - 13 - up + squash);
    s.line(cx - 6, g - 5 - up + squash, cx + 6, g - 5 - up + squash, HOLE);
    for (const sign of [-1, 1]) s.sphere(cx + sign * 4, g - 1.3, 2.5, 1.3, FROG);
  } else {
    s.dots([cx - 4, g - 10 - up, cx + 3, g - 12 - up, cx + 1, g - 7 - up, cx - 1, g - 13 - up], FROG_DARK, 1);
  }
}

// --- Cobra-d'água ---------------------------------------------------------------

const SNAKE = ramp("#8d5a3b");
const SNAKE_BAND = ramp("#4e2e1c");
const TONGUE = ramp("#d8384a");

function moccasin(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const w = stepOf(frame);
  if (dir === "side") {
    const body = [cx + 20, g - 2, 1, cx + 14, g - 3.5 - w, 2.4, cx + 7, g - 3 + w, 3.2, cx, g - 3.5 - w, 3.6, cx - 5, g - 6, 3.4, cx - 7, g - 11, 3];
    s.chain(body, SNAKE);
    for (let i = 3; i < body.length - 3; i += 3) s.line(body[i], body[i + 1] - body[i + 2] + 1, body[i], body[i + 1] + body[i + 2] - 1, SNAKE_BAND, 1);
    s.sphere(cx - 10, g - 13, 4.6, 3.3, SNAKE);
    s.sphere(cx - 11, g - 11.5, 3.4, 1.5, ramp("#c8a070"), { edge: false });
    s.dots([cx - 11, g - 14.5], YELLOW_EYE).dots([cx - 10.5, g - 14.5], HOLE);
    if (frame !== 2) s.line(cx - 15, g - 12, cx - 18, g - 12, TONGUE, 2).dots([cx - 19, g - 13, cx - 19, g - 11], TONGUE, 2);
    return;
  }
  const sign = dir === "down" ? 1 : -1;
  const coil = [cx + 8 * sign, g - 12, 1, cx + 10 * sign, g - 8 + w, 2.4, cx + 4 * sign, g - 4.5, 3.4, cx - 6 * sign, g - 4 - w, 3.6, cx - 9 * sign, g - 8, 3.2, cx - 3 * sign, g - 10, 3];
  if (dir === "up") s.limb(cx - 3 * sign, g - 10, cx, g - 15, 3, 2.8, SNAKE);
  s.chain(coil, SNAKE);
  for (let i = 3; i < coil.length - 3; i += 3) s.dots([coil[i], coil[i + 1] - 1, coil[i] + 1, coil[i + 1] - 1], SNAKE_BAND, 1);
  if (dir === "up") {
    s.sphere(cx, g - 17, 4.2, 3, SNAKE);
    return;
  }
  s.limb(cx - 3, g - 10, cx, g - 14, 3, 2.8, SNAKE);
  s.sphere(cx, g - 15.5, 4.8, 3.6, SNAKE);
  for (const sx of [-2.5, 2.5]) s.dots([cx + sx, g - 16.5], YELLOW_EYE).dots([cx + sx, g - 16], HOLE);
  if (frame !== 2) s.line(cx, g - 12.5, cx, g - 10.5, TONGUE, 2).dots([cx - 1, g - 10, cx + 1, g - 10], TONGUE, 2);
}

// --- Humanoides -------------------------------------------------------------------

export function club(s: Painter, at: Point, angle: number, scale = 1, studs = true, wood = WOOD) {
  const [x0, y0, x1, y1] = placed([0, 4 * scale, 0, -14 * scale], at, angle);
  s.limb(x0, y0, x1, y1, 1.3 * scale, 3 * scale, wood);
  if (!studs) return;
  const d = placed([-2 * scale, -9 * scale, 1.5 * scale, -12 * scale, -1 * scale, -14.5 * scale, 2 * scale, -7 * scale], at, angle);
  s.dots(d, IRON, 4);
}

function blade(s: Painter, at: Point, angle: number, metal: Ramp, length: number) {
  s.poly(placed([-1.4, -2.5, 1.4, -2.5, 1.2, -length, 0, -length - 2.5, -1.2, -length], at, angle), metal);
  s.limb(...(placed([-3, -2, 3, -2], at, angle) as [number, number, number, number]), 1, 1, DARK_WOOD);
}

function axe(s: Painter, at: Point, angle: number) {
  const [x0, y0, x1, y1] = placed([0, 5, 0, -16], at, angle);
  s.limb(x0, y0, x1, y1, 1.2, 1.2, DARK_WOOD);
  s.poly(placed([0, -15, -7, -18, -8.5, -12, -7, -6, 0, -9], at, angle), IRON);
  const [ex0, ey0, ex1, ey1] = placed([-8, -17, -8, -7], at, angle);
  s.line(ex0, ey0, ex1, ey1, IRON, 4);
}

function spear(s: Painter, at: Point, angle: number) {
  const [x0, y0, x1, y1] = placed([0, 8, 0, -22], at, angle);
  s.limb(x0, y0, x1, y1, 0.9, 0.9, WOOD);
  s.poly(placed([-1.8, -21, 1.8, -21, 0, -28], at, angle), IRON);
  s.dots(placed([-1, -20, 1, -20], at, angle), ramp("#c0392b"), 3);
}

/** Orelhas pontudas para os lados (goblin, ogro, troll). */
function ears(s: Painter, j: Joints, skin: Ramp, length: number) {
  const { head: h, dir } = j;
  const r = headRx(j);
  if (dir === "side") {
    s.poly([h.x + 1, h.y - 1, h.x + 4, h.y + 3, h.x + 3 + length, h.y - 4], skin);
    return;
  }
  for (const sign of [-1, 1]) s.poly([h.x + sign * (r - 2), h.y - 2, h.x + sign * (r - 2), h.y + 3, h.x + sign * (r + length), h.y - 4], skin);
}

const GOBLIN_SKIN = ramp("#6aa04a");
const RAG = ramp("#7a6040");

function goblinHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  if (dir !== "side") ears(s, j, GOBLIN_SKIN, 6);
  s.sphere(h.x, h.y, r, r * 0.9, GOBLIN_SKIN);
  if (dir === "side") ears(s, j, GOBLIN_SKIN, 6);
  if (dir === "up") return;
  const dx = dir === "side" ? -r + 1 : 0;
  eyes(s, j, solid("#f2d14a"), 0, 3.5);
  eyes(s, j, HOLE, 1, 3.5);
  s.sphere(h.x + dx, h.y + 3 * k, 2.4, 2, GOBLIN_SKIN, { light: 0.1 });
  if (dir === "down") s.line(h.x - 3, h.y + 6 * k, h.x + 3, h.y + 6 * k, HOLE).dots([h.x + 2, h.y + 6 * k], WHITE);
  else s.line(h.x - r + 3, h.y + 6 * k, h.x - 3, h.y + 6 * k, HOLE);
}

const SKULL_EYE = solid("#ff5a3a");

function skull(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j) * 0.92;
  s.sphere(h.x, h.y, r, r * 0.95, BONE);
  if (dir === "up") return;
  if (dir === "side") {
    s.sphere(h.x - r + 4, h.y + 6.5 * k, 3.5, 2.2, BONE);
    s.sphere(h.x - r + 3.5, h.y, 2, 2.2, HOLE, { edge: false });
    s.dots([h.x - r + 3.5, h.y], SKULL_EYE);
    s.dots([h.x - r + 1, h.y + 3], HOLE);
    s.line(h.x - r + 1, h.y + 6 * k, h.x - r + 6, h.y + 6 * k, HOLE);
    return;
  }
  s.sphere(h.x, h.y + 6.5 * k, 4.5, 2.4, BONE);
  for (const sign of [-1, 1]) {
    s.sphere(h.x + sign * 3.5, h.y, 2.2, 2.4, HOLE, { edge: false });
    s.dots([h.x + sign * 3.5 - 0.5, h.y], SKULL_EYE);
  }
  s.dots([h.x - 0.5, h.y + 3.5, h.x + 0.5, h.y + 3.5], HOLE);
  s.line(h.x - 3, h.y + 6 * k, h.x + 3, h.y + 6 * k, HOLE);
  s.dots([h.x - 2, h.y + 6 * k, h.x, h.y + 6 * k, h.x + 2, h.y + 6 * k], BONE, 3);
}

/** Costelas, coluna e bacia no lugar do tronco. */
function ribcage(s: Painter, j: Joints) {
  const { cx, k, b, chest, hipY, dir } = j;
  const narrow = dir === "side" ? 0.6 : 1;
  s.limb(cx, chest.y, cx, hipY, 1.5, 1.5, BONE);
  s.sphere(cx, hipY + 0.5, 4.5 * narrow * k, 2.6 * k, BONE);
  s.sphere(chest.x, chest.y, b.chestRx * narrow * k, b.chestRy * k, BONE);
  const w = b.chestRx * narrow * k;
  for (let i = -1; i <= 1; i++) {
    const y = chest.y + i * 2.6 * k;
    const half = w * Math.sqrt(1 - ((i * 2.6) / b.chestRy) ** 2) - 1.5;
    s.line(cx - half, y, cx + half, y, HOLE, 2);
  }
  s.line(cx, chest.y - b.chestRy * k + 1, cx, chest.y + b.chestRy * k - 1, BONE, dir === "up" ? 3 : 2);
}

const ORC_SKIN = ramp("#6f8a4e");
const ORC_LEATHER = ramp("#5b4030");

function orcHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  s.sphere(h.x, h.y, r, r * 0.92, ORC_SKIN);
  // Elmo de ferro com chifres.
  for (const sign of dir === "side" ? [1] : [-1, 1]) {
    const bx = h.x + sign * (r - 2);
    s.chain([bx, h.y - 5, 1.8, bx + sign * 4, h.y - 9, 1.3, bx + sign * 4, h.y - 14, 0.6], BONE);
  }
  s.sphere(h.x, h.y - 3.5 * k, r + 0.6, 6 * k, IRON);
  if (dir === "up") return;
  s.limb(h.x - r + 1, h.y - 1, h.x + r - 1 - (dir === "side" ? 8 : 0), h.y - 1, 1, 1, IRON, { join: true });
  eyes(s, j, solid("#ffcf3a"), 1.5, 3.5);
  if (dir === "down") {
    s.line(h.x - 3, h.y + 6, h.x + 3, h.y + 6, HOLE);
    s.dots([h.x - 3, h.y + 5, h.x - 3, h.y + 4, h.x + 3, h.y + 5, h.x + 3, h.y + 4], WHITE);
  } else {
    s.line(h.x - r + 2, h.y + 6, h.x - 3, h.y + 6, HOLE);
    s.dots([h.x - r + 3, h.y + 5, h.x - r + 3, h.y + 4], WHITE);
  }
}

const OGRE_SKIN = ramp("#a3784c");
const FUR_CLOTH = ramp("#6a4a2e");

/** Cabeça de brutamontes (ogro, troll): testa pesada, olhos pequenos, queixo saltado com dentes. */
function bruteHead(skin: Ramp, eye: Ramp, nose = 2.6, hair?: Ramp) {
  return (s: Painter, j: Joints) => {
    const { head: h, k, dir } = j;
    const r = headRx(j);
    if (dir !== "side") ears(s, j, skin, 2.5);
    s.sphere(h.x, h.y, r, r * 0.95, skin);
    if (dir === "side") ears(s, j, skin, 2.5);
    if (hair) for (const [dx, dy] of [[-3, -1], [1, -1.6], [4, -0.6]]) s.sphere(h.x + dx * k, h.y - r + dy * k + 1, 2.6 * k, 1.8 * k, hair);
    if (dir === "up") return;
    const dx = dir === "side" ? -r * 0.55 : 0;
    s.sphere(h.x + dx, h.y + 5 * k, (dir === "side" ? 6 : 9) * k, 4.5 * k, skin);
    eyes(s, j, eye, -0.5, 3.5);
    s.sphere(h.x + dx * 1.4, h.y + 1.5 * k, nose, nose * 0.85, skin, { light: 0.1 });
    if (dir === "down") s.dots([h.x - 4, h.y + 4 * k, h.x - 4, h.y + 4 * k - 1, h.x + 4, h.y + 4 * k, h.x + 4, h.y + 4 * k - 1], WHITE);
    else s.dots([h.x - r + 2, h.y + 4 * k, h.x - r + 2, h.y + 4 * k - 1], WHITE);
  };
}

function loincloth(cloth: Ramp, belt: Ramp) {
  return (s: Painter, j: Joints) => {
    const { cx, hipY, k, b, dir } = j;
    const w = b.waistRx * (dir === "side" ? 0.75 : 1) * k;
    s.poly([cx - w + 1, hipY - 1, cx + w - 1, hipY - 1, cx + w * 0.6, hipY + 5 * k, cx, hipY + 4 * k, cx - w * 0.6, hipY + 5 * k], cloth);
    s.limb(cx - w, hipY - 1.5, cx + w, hipY - 1.5, 1.2 * k, 1.2 * k, belt);
  };
}

/** Barriga saliente sobre o tronco (ogro, troll). */
function belly(skin: Ramp) {
  return (s: Painter, j: Joints) => {
    if (j.dir !== "up") s.sphere(j.cx + (j.dir === "side" ? -3 : 0), j.hipY - 5, j.b.waistRx * (j.dir === "side" ? 0.85 : 1), 7, skin, { join: true });
  };
}

function weaponAngle(j: Joints, down: number, side: number) {
  return j.dir === "side" ? side : down * j.sideW;
}

const BOG_SKIN = ramp("#7d8c6a");
const MOSS = ramp("#5a7a2a");
const GHOST_EYE = solid("#d8ffb0");

function bogHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  s.sphere(h.x, h.y, r, r * 0.95, BOG_SKIN);
  // Cabelo ralo e musgo pendurado.
  s.chain([h.x - r * 0.6, h.y - r * 0.6, 1.6, h.x - r - 1, h.y + 2, 1.2, h.x - r, h.y + 7, 0.8], MOSS);
  s.sphere(h.x + 2, h.y - r + 2, 3.5, 2, MOSS);
  if (dir === "up") {
    s.chain([h.x + 2, h.y - 2, 1.2, h.x + 3, h.y + 5, 0.8], MOSS);
    return;
  }
  const sockets = dir === "side" ? [h.x - 5 * k] : [h.x - 3.2 * k, h.x + 3.2 * k];
  for (const x of sockets) {
    s.sphere(x, h.y + 0.5 * k, 1.9, 2, HOLE, { edge: false });
    s.dots([x, h.y + 0.5 * k], GHOST_EYE);
  }
  const mx = dir === "side" ? h.x - 5 * k : h.x;
  s.sphere(mx, h.y + 5 * k, 1.8, 1.4, HOLE, { edge: false });
}

const NAGA_SKIN = ramp("#8ab0a0");
const NAGA_TAIL = ramp("#5f8f7a");
const NAGA_SCALE = ramp("#9aa0a6");
const NAGA_HAIR = ramp("#2a4a4a");

function nagaHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  if (dir !== "down") s.limb(h.x + (dir === "side" ? 3 : 0), h.y, h.x + (dir === "side" ? 6 : 0), h.y + 11 * k, 3.5, 2, NAGA_HAIR);
  s.sphere(h.x, h.y, r, r * 0.95, NAGA_HAIR);
  if (dir !== "up") {
    const dx = dir === "side" ? -r * 0.45 : 0;
    s.sphere(h.x + dx, h.y + 1.5 * k, (dir === "side" ? 5 : 6.6) * k, 5.6 * k, NAGA_SKIN, { edge: false });
    eyes(s, j, YELLOW_EYE, 1, 3);
    s.sphere(h.x + (dir === "side" ? -r + 2 : 0), h.y - r + 2, 1.6, 1.6, ramp("#e0b040"));
  }
}

function nagaTail(s: Painter, j: Joints) {
  const { cx, hipY, g, step, dir } = j;
  const w = step * 1.5;
  const tail = dir === "side"
    ? [cx + 1, hipY, 5.5, cx + 3, g - 6, 5.5, cx + 12, g - 3.5, 4, cx + 20, g - 5 + w, 2.2, cx + 25, g - 9 - w, 1]
    : dir === "down"
      ? [cx, hipY, 6, cx - 1, g - 6, 6.5, cx + 8, g - 3.5, 4.5, cx + 15, g - 6 + w, 2.5, cx + 17, g - 11 - w, 1.2]
      : [cx, hipY, 6, cx, g - 6, 6.5, cx - 9, g - 3.5, 4.5, cx - 15, g - 5 + w, 2.5, cx - 16, g - 10 - w, 1.2];
  s.chain(tail, NAGA_TAIL);
  for (let i = 3; i < tail.length - 3; i += 3) s.dots([tail[i] - 1, tail[i + 1] - 1, tail[i] + 1, tail[i + 1] + 1], ramp("#3c6a56"), 1);
}

const TROLL_SKIN = ramp("#4f7090");

const LOOKS = {
  goblin: {
    k: 0.9, build: { headR: 11, chestRx: 7, waistRx: 5.5, legR: 2.6, armR: 2.2 },
    skin: GOBLIN_SKIN, shirt: RAG, pants: GOBLIN_SKIN,
    head: goblinHead, farGrip: true,
    torso: loincloth(RAG, DARK_WOOD),
    weapon: (s, j) => club(s, j.handW, weaponAngle(j, 0.35, -0.6), 0.85, false),
  },
  skeleton: {
    k: 1.08, build: { headR: 8.5, armR: 1.5, legR: 1.7, handR: 1.8, chestRx: 7, chestRy: 6 },
    skin: BONE, shirt: BONE,
    head: skull,
    torsoShape: ribcage,
    weapon: (s, j) => blade(s, j.handW, weaponAngle(j, 0.15, -0.4), RUST, 15),
  },
  orc: {
    k: 1.15, build: { chestRx: 9.5, shoulder: 9.5, waistRx: 7.5, armR: 3, legR: 3.3, handR: 2.7 },
    skin: ORC_SKIN, shirt: ORC_LEATHER, sleeves: ORC_SKIN, pants: ramp("#4a3a2e"), boots: ramp("#3a2a20"), shoulders: IRON,
    head: orcHead,
    torso: (s, j) => {
      s.limb(j.cx - j.b.waistRx, j.hipY - 2, j.cx + j.b.waistRx, j.hipY - 2, 1.4, 1.4, DARK_WOOD);
      if (j.dir === "down") s.dots([j.cx - 3, j.chest.y - 2, j.cx + 3, j.chest.y - 2, j.cx, j.chest.y + 1], IRON, 4);
    },
    weapon: (s, j) => axe(s, j.handW, j.dir === "side" ? -0.5 : 0.25 * j.sideW),
  },
  ogre: {
    k: 1.55, build: { headR: 7.5, chestRx: 11.5, chestRy: 8, waistRx: 10.5, shoulder: 11, armR: 3.7, legR: 3.6, handR: 3.2, legLen: 11, torsoLen: 13.5 },
    skin: OGRE_SKIN, shirt: OGRE_SKIN, pants: OGRE_SKIN,
    head: bruteHead(OGRE_SKIN, HOLE),
    torso: (s, j) => {
      belly(OGRE_SKIN)(s, j);
      loincloth(FUR_CLOTH, DARK_WOOD)(s, j);
      if (j.dir === "down") s.line(j.cx - 9, j.chest.y - 7, j.cx + 9, j.chest.y + 4, DARK_WOOD, 1);
    },
    weapon: (s, j) => club(s, j.handW, weaponAngle(j, 0.5, -0.7), 1.6),
  },
  bogBody: {
    k: 1.05, build: { headR: 8.5, armR: 2.2, legR: 2.6, chestRx: 7, waistRx: 5.5 },
    skin: BOG_SKIN, shirt: ramp("#4a4f3a"), sleeves: BOG_SKIN, pants: ramp("#3e4232"),
    head: bogHead,
    torso: (s, j) => {
      // Rasgos na roupa e musgo escorrendo.
      s.dots([j.chest.x - 3, j.chest.y + 1, j.chest.x + 2, j.chest.y - 2, j.chest.x + 4, j.chest.y + 3], BOG_SKIN, 2);
      s.chain([j.chest.x + (j.dir === "side" ? 0 : 5), j.chest.y - 5, 1.4, j.chest.x + (j.dir === "side" ? 1 : 6), j.chest.y + 3, 0.9], MOSS);
    },
  },
  naga: {
    k: 1.1, build: { headR: 8.5, chestRx: 7.5, waistRx: 6, armR: 2.3 },
    skin: NAGA_SKIN, shirt: NAGA_SCALE, sleeves: NAGA_SKIN, pants: NAGA_TAIL,
    head: nagaHead,
    legs: nagaTail,
    torso: (s, j) => {
      for (const dy of [-3, 0, 3]) s.line(j.chest.x - 5, j.chest.y + dy, j.chest.x + 5, j.chest.y + dy, ramp("#6a7078"), 2);
    },
    weapon: (s, j) => spear(s, j.handW, j.dir === "side" ? -0.35 : 0.08 * j.sideW),
  },
  troll: {
    k: 1.5, build: { headR: 8, chestRx: 10.5, chestRy: 7.5, waistRx: 9, shoulder: 10.5, armR: 3.6, legR: 3.4, handR: 3.2, legLen: 10.5, torsoLen: 13 },
    skin: TROLL_SKIN, shirt: TROLL_SKIN, pants: TROLL_SKIN,
    head: bruteHead(TROLL_SKIN, YELLOW_EYE, 3.4, MOSS),
    torso: (s, j) => {
      belly(TROLL_SKIN)(s, j);
      loincloth(MOSS, DARK_WOOD)(s, j);
    },
    weapon: (s, j) => {
      club(s, j.handW, weaponAngle(j, 0.45, -0.7), 1.7, false, DARK_WOOD);
      const [lx, ly] = placed([1, -22], j.handW, weaponAngle(j, 0.45, -0.7));
      s.sphere(lx, ly, 3, 2.2, MOSS);
    },
  },
} satisfies Partial<Record<MonsterKind, Look>>;

// --- Dragão ------------------------------------------------------------------------

const SCALES = ramp("#b8352f");
const DRAGON_BELLY = ramp("#e0a050");
const MEMBRANE = ramp("#7a2438");
const HORN = ramp("#e8dcc0");

function wing(s: Painter, shoulder: Point, sign: number, flap: number, size = 1) {
  const p = (dx: number, dy: number) => [shoulder.x + sign * dx * size, shoulder.y + dy * size];
  const tip = p(30, -40 - flap);
  const mid = p(44, -16 - flap * 0.6);
  const low = p(34, -4 - flap * 0.2);
  s.poly([...p(0, 0), ...p(8, -34 - flap), ...tip, ...mid, ...low, ...p(12, -2)], MEMBRANE);
  s.chain([...p(0, 0), 2.6 * size, ...p(8, -34 - flap), 2 * size, ...tip, 1.2 * size], SCALES);
  s.limb(...(p(8, -34 - flap) as [number, number]), ...(mid as [number, number]), 1.2 * size, 0.8 * size, SCALES);
  s.limb(...(p(8, -34 - flap) as [number, number]), ...(low as [number, number]), 1.2 * size, 0.8 * size, SCALES);
}

/** Cabeça de réptil (dragão, hidra): de lado olha para a esquerda, de frente mostra os dois olhos. */
function reptileHead(s: Painter, h: Point, dir: Dir, skin: Ramp, belly: Ramp, horns: boolean, size = 1) {
  const u = (v: number) => v * size;
  if (dir === "side") {
    if (horns) s.chain([h.x + u(4), h.y - u(5), u(2.2), h.x + u(10), h.y - u(11), u(1.4), h.x + u(15), h.y - u(13), 0.6], HORN);
    s.sphere(h.x, h.y, u(9), u(7.5), skin);
    s.sphere(h.x - u(10), h.y + u(3), u(7.5), u(4.5), skin, { join: true });
    s.sphere(h.x - u(8), h.y + u(7.5), u(6.5), u(2.4), belly);
    if (horns) s.chain([h.x + u(1), h.y - u(6), u(2), h.x + u(8), h.y - u(10), u(1.3), h.x + u(12), h.y - u(10), 0.6], HORN);
    s.dots([h.x - u(4), h.y - u(2), h.x - u(3), h.y - u(2)], YELLOW_EYE).dots([h.x - u(3), h.y - u(2)], HOLE);
    s.dots([h.x - u(16), h.y + u(1)], HOLE);
    s.dots([h.x - u(15), h.y + u(6), h.x - u(12), h.y + u(6), h.x - u(9), h.y + u(6)], WHITE);
    return;
  }
  if (horns) for (const sign of [-1, 1]) s.chain([h.x + sign * u(6), h.y - u(5), u(2.2), h.x + sign * u(11), h.y - u(11), u(1.4), h.x + sign * u(13), h.y - u(17), 0.6], HORN);
  s.sphere(h.x, h.y, u(10), u(8.5), skin);
  if (dir === "up") return;
  s.sphere(h.x, h.y + u(6), u(7), u(5), skin, { join: true });
  s.sphere(h.x, h.y + u(10), u(5.5), u(2), belly);
  for (const sign of [-1, 1]) {
    s.dots([h.x + sign * u(5) - 0.5, h.y - u(1), h.x + sign * u(5) + 0.5, h.y - u(1)], YELLOW_EYE).dots([h.x + sign * u(5) + (sign > 0 ? -0.5 : 0.5), h.y - u(1)], HOLE);
    s.dots([h.x + sign * u(2), h.y + u(6)], HOLE);
  }
  s.dots([h.x - u(4), h.y + u(11), h.x + u(4), h.y + u(11)], WHITE);
}

/** Corpo de réptil de quatro patas (dragão e hidra), sem cabeça nem asas. */
function reptileBody(s: Painter, dir: Dir, step: number, cx: number, g: number, skin: Ramp, belly: Ramp, bob: number) {
  if (dir === "side") {
    s.chain([cx + 14, g - 22, 7, cx + 30, g - 14, 5, cx + 44, g - 10, 3, cx + 54, g - 16 + step, 1.5], skin);
    s.limb(cx + 12, g - 22, cx + 14 + step * 3, g - 5, 4, 3, skin, { light: -0.15 });
    s.limb(cx - 10, g - 24, cx - 8 - step * 3, g - 5, 3.5, 2.6, skin, { light: -0.15 });
    s.sphere(cx + 2, g - 26 - bob, 20, 14, skin);
    s.sphere(cx - 2, g - 18 - bob, 15, 6.5, belly);
    for (let x = -12; x <= 8; x += 5) s.line(cx + x, g - 22 - bob, cx + x - 1, g - 13 - bob, ramp("#8a7a3a"), 1);
    s.sphere(cx + 15, g - 24 - bob, 8, 9, skin);
    s.limb(cx + 15, g - 20, cx + 12 - step * 3, g - 5, 4, 3, skin);
    s.sphere(cx + 10 - step * 3, g - 3, 5, 2.6, skin);
    s.dots([cx + 6 - step * 3, g - 2, cx + 8 - step * 3, g - 1], HORN);
    s.limb(cx - 12, g - 26, cx - 14 + step * 3, g - 5, 3.8, 2.8, skin);
    s.sphere(cx - 16 + step * 3, g - 3, 4.5, 2.4, skin);
    s.dots([cx - 20 + step * 3, g - 2, cx - 18 + step * 3, g - 1], HORN);
    return;
  }
  const front = dir === "down";
  if (front) s.chain([cx + 10, g - 18, 6, cx + 26, g - 12, 4, cx + 38, g - 14, 2.5, cx + 46, g - 22 + step, 1.4], skin);
  for (const sign of [-1, 1]) {
    s.limb(cx + sign * 16, g - 20, cx + sign * 17, g - 5 + (step === sign ? -2 : 0), 4.5, 3.4, skin);
    s.sphere(cx + sign * 17, g - 3 + (step === sign ? -2 : 0), 4.5, 2.6, skin);
  }
  s.sphere(cx, g - 28 - bob, 18, 16, skin);
  if (front) {
    s.sphere(cx, g - 24 - bob, 11, 12, belly);
    for (let y = -32; y <= -16; y += 5) s.line(cx - 8, g + y - bob, cx + 8, g + y - bob, ramp("#8a7a3a"), 1);
    for (const sign of [-1, 1]) {
      const lift = step === -sign ? -2 : 0;
      s.limb(cx + sign * 9, g - 22 - bob, cx + sign * 9, g - 6 + lift, 3.6, 2.8, skin);
      s.sphere(cx + sign * 9, g - 4 + lift, 4, 2.4, skin);
      s.dots([cx + sign * 9 - 2, g - 2 + lift, cx + sign * 9 + 1, g - 2 + lift], HORN);
    }
  }
}

function dragon(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const step = stepOf(frame);
  const flap = step * 8;
  const bob = step ? 1 : 0;
  if (dir === "side") {
    wing(s, { x: cx + 2, y: g - 42 - bob }, 1, flap + 6, 0.85);
    s.poly([cx + 52, g - 18 + step, cx + 60, g - 22 + step, cx + 58, g - 13 + step], SCALES);
    reptileBody(s, dir, step, cx, g, SCALES, DRAGON_BELLY, bob);
    s.chain([cx - 12, g - 32 - bob, 8, cx - 20, g - 46 - bob, 6.5, cx - 22, g - 58 - bob, 6], SCALES);
    for (const [x, y] of [[-6, -40], [4, -41], [14, -38], [-16, -48]]) s.poly([cx + x - 2, g + y + 2 - bob, cx + x + 2, g + y + 2 - bob, cx + x + 1, g + y - 3 - bob], HORN);
    reptileHead(s, { x: cx - 26, y: g - 64 - bob }, dir, SCALES, DRAGON_BELLY, true);
    wing(s, { x: cx - 2, y: g - 38 - bob }, 1, flap);
    return;
  }
  if (dir === "down") {
    for (const sign of [-1, 1]) wing(s, { x: cx + sign * 10, y: g - 40 - bob }, sign, flap);
    reptileBody(s, dir, step, cx, g, SCALES, DRAGON_BELLY, bob);
    s.limb(cx, g - 40 - bob, cx, g - 50 - bob, 7, 6, SCALES);
    reptileHead(s, { x: cx, y: g - 56 - bob }, dir, SCALES, DRAGON_BELLY, true);
    return;
  }
  reptileBody(s, dir, step, cx, g, SCALES, DRAGON_BELLY, bob);
  s.limb(cx, g - 40 - bob, cx, g - 52 - bob, 7, 6, SCALES);
  reptileHead(s, { x: cx, y: g - 58 - bob }, dir, SCALES, DRAGON_BELLY, true);
  for (let y = -40; y <= -16; y += 6) s.poly([cx - 2.5, g + y + 2 - bob, cx + 2.5, g + y + 2 - bob, cx, g + y - 3 - bob], HORN);
  for (const sign of [-1, 1]) wing(s, { x: cx + sign * 10, y: g - 40 - bob }, sign, flap);
  s.chain([cx, g - 14, 6, cx + 8, g - 6, 4.5, cx + 22, g - 5, 3, cx + 34, g - 10 + step, 1.4], SCALES);
}

// --- Hidra do pântano ---------------------------------------------------------------

const HYDRA = ramp("#2e8b57");
const HYDRA_BELLY = ramp("#c8d870");
const HYDRA_FIN = ramp("#a3e635");

/** Três pescoços saindo do peito, cada um com cabeça; balançam fora de fase na caminhada. */
function hydra(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const step = stepOf(frame);
  const bob = step ? 1 : 0;
  const neck = (from: Point, to: Point, sway: number) => {
    const mid = { x: (from.x + to.x) / 2 + sway * 3, y: (from.y + to.y) / 2 };
    s.chain([from.x, from.y, 6, mid.x, mid.y, 5, to.x, to.y + 4, 4.2], HYDRA);
    s.dots([mid.x + 2, mid.y - 2, mid.x + 1, mid.y + 3], HYDRA_FIN, 3);
  };
  if (dir === "side") {
    const base = { x: cx - 10, y: g - 30 - bob };
    const heads: [Point, number][] = [[{ x: cx - 18, y: g - 72 }, 1], [{ x: cx - 32, y: g - 62 }, -1], [{ x: cx - 38, y: g - 46 }, 1]];
    neck(base, { x: heads[0][0].x + 4, y: heads[0][0].y }, step);
    reptileHead(s, { x: heads[0][0].x, y: heads[0][0].y + step - bob }, dir, HYDRA, HYDRA_BELLY, false, 0.8);
    reptileBody(s, dir, step, cx, g, HYDRA, HYDRA_BELLY, bob);
    for (const [x, y] of [[-6, -40], [4, -41], [14, -38]]) s.poly([cx + x - 2, g + y + 2 - bob, cx + x + 2, g + y + 2 - bob, cx + x + 1, g + y - 3 - bob], HYDRA_FIN);
    for (const [h, phase] of heads.slice(1)) {
      neck(base, { x: h.x + 4, y: h.y }, -step * phase);
      reptileHead(s, { x: h.x, y: h.y - step * phase - bob }, dir, HYDRA, HYDRA_BELLY, false, 0.8);
    }
    return;
  }
  const front = dir === "down";
  const base = { x: cx, y: g - 36 - bob };
  const heads: Point[] = [{ x: cx - 20, y: g - 54 }, { x: cx + 20, y: g - 54 }, { x: cx, y: g - 64 }];
  if (!front) {
    heads.forEach((h, i) => {
      neck(base, h, i === 1 ? -step : step);
      reptileHead(s, { x: h.x, y: h.y - bob + (i === 1 ? -step : step) }, dir, HYDRA, HYDRA_BELLY, false, 0.75);
    });
    reptileBody(s, dir, step, cx, g, HYDRA, HYDRA_BELLY, bob);
    for (let y = -40; y <= -18; y += 6) s.poly([cx - 2.5, g + y + 2 - bob, cx + 2.5, g + y + 2 - bob, cx, g + y - 3 - bob], HYDRA_FIN);
    s.chain([cx, g - 14, 6, cx + 8, g - 6, 4.5, cx + 22, g - 5, 3, cx + 34, g - 10 + step, 1.4], HYDRA);
    return;
  }
  reptileBody(s, dir, step, cx, g, HYDRA, HYDRA_BELLY, bob);
  // A do meio fica atrás das outras duas.
  for (const i of [2, 0, 1]) {
    const h = heads[i];
    neck(base, h, i === 1 ? -step : step);
    reptileHead(s, { x: h.x, y: h.y - bob + (i === 1 ? -step : step) }, dir, HYDRA, HYDRA_BELLY, false, 0.75);
  }
}

// --- Folhas -------------------------------------------------------------------------

const BOSS_GROWTH = 1.12;

/** Humanoide num quadro pequeno `w`×`h`, ampliado para o tamanho dos heróis. */
export const humanoidArt = (look: Look, w: number, h: number, f = CREATURE_GROWTH): CreatureArt =>
  grownArt(w, h, f, (p, dir, frame, cx, g) => humanoid(p, look, dir, frame, cx, g));

export const MONSTER_ART: Record<MonsterKind, CreatureArt> = {
  rat: grownArt(64, 44, CREATURE_GROWTH, (p, dir, frame, cx, g) => rat(p, dir, frame, cx - 2, g)),
  goblin: humanoidArt(LOOKS.goblin, 64, 60),
  skeleton: humanoidArt(LOOKS.skeleton, 64, 68),
  orc: humanoidArt(LOOKS.orc, 64, 72),
  ogre: humanoidArt(LOOKS.ogre, 96, 96),
  dragon: grownArt(128, 128, BOSS_GROWTH, (p, dir, frame, cx, g) => dragon(p, dir, frame, cx - 2, g)),
  frog: grownArt(56, 40, CREATURE_GROWTH, frog),
  moccasin: grownArt(56, 40, CREATURE_GROWTH, moccasin),
  bogBody: humanoidArt(LOOKS.bogBody, 64, 64),
  naga: humanoidArt(LOOKS.naga, 72, 68),
  troll: humanoidArt(LOOKS.troll, 96, 96),
  hydra: grownArt(128, 128, BOSS_GROWTH, hydra),
};
