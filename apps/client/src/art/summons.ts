import type { SummonKind } from "@kusa/shared";
import { CREATURE_GROWTH, grownArt, stepOf, type CreatureArt, type Dir } from "./creature.ts";
import { eyes, headRx, type Joints, type Look } from "./humanoid.ts";
import { HOLE, MONSTER_ART, humanoidArt } from "./monsters.ts";
import { ramp, solid, type Painter, type Ramp } from "./paint.ts";

/**
 * Criaturas invocadas, no traço dos monstros: lobo e urso de quatro patas, vespa, mariposa e
 * fogo-fátuo voando (batem as asas o tempo todo), o Guardião do Bosque (uma árvore viva) e o
 * Esqueleto Erguido do Necromante, que é o mesmo esqueleto dos monstros.
 */

// --- Quadrúpedes ----------------------------------------------------------------

interface Beast {
  fur: Ramp;
  belly: Ramp;
  eye: Ramp;
  /** Meio comprimento do corpo e raio vertical. */
  len: number;
  bodyRy: number;
  legLen: number;
  legR: number;
  headR: number;
  snout: number;
  pointyEars: boolean;
  /** Raio da cauda (peluda e comprida no lobo, um toco no urso). */
  tail: number;
  /** Marcas brilhantes no pelo (os espíritos do Druida). */
  marks?: Ramp;
}

function beast(s: Painter, q: Beast, dir: Dir, frame: number, cx: number, g: number) {
  const step = stepOf(frame);
  const bob = step ? 1 : 0;
  const bodyY = g - q.legLen - q.bodyRy * 0.6 - bob;
  const paw = (x: number, light = 0) => s.sphere(x, g - 1.4, q.legR * 1.2, q.legR * 0.7, q.fur, { light });
  const leg = (x0: number, x1: number, light = 0) => {
    s.limb(x0, bodyY + 1, x1, g - 2, q.legR, q.legR * 0.8, q.fur, { light });
    paw(x1 - 0.5, light);
  };
  const ear = (x: number, y: number, sign: number) => {
    if (q.pointyEars) s.poly([x - 2, y + 1, x + 2, y + 1, x + sign, y - 4], q.fur);
    else s.sphere(x, y, 2, 2, q.fur);
  };
  if (dir === "side") {
    const front = cx - q.len, rear = cx + q.len;
    leg(front + 2, front + 2 + step * 2, -0.25);
    leg(rear - 2, rear - 2 - step * 2, -0.25);
    if (q.tail > 1.5) s.chain([rear + 2, bodyY - 2, q.tail * 0.8, rear + 7, bodyY - 4 + step, q.tail, rear + 11, bodyY - 1, q.tail * 0.5], q.fur);
    else s.sphere(rear + 2, bodyY - 2, q.tail * 1.5, q.tail * 1.5, q.fur);
    s.sphere(cx, bodyY, q.len + 3, q.bodyRy, q.fur);
    s.sphere(cx - 1, bodyY + q.bodyRy * 0.45, q.len, q.bodyRy * 0.45, q.belly, { join: true });
    if (q.marks) s.line(cx - 3, bodyY - q.bodyRy * 0.5, cx + 4, bodyY - q.bodyRy * 0.3, q.marks, 3);
    leg(front, front - step * 2.5);
    leg(rear, rear + step * 2.5);
    const head = { x: front - 3, y: bodyY - q.bodyRy * 0.7 };
    ear(head.x + 2, head.y - q.headR * 0.8, 1);
    s.sphere(head.x, head.y, q.headR, q.headR * 0.85, q.fur);
    s.sphere(head.x - q.headR - q.snout * 0.3, head.y + q.headR * 0.3, q.snout, q.snout * 0.7, q.fur, { join: true });
    s.dots([head.x - q.headR - q.snout * 1.2, head.y + q.headR * 0.2], HOLE);
    s.dots([head.x - q.headR * 0.4, head.y - q.headR * 0.2], q.eye);
    return;
  }
  const front = dir === "down";
  const side = (sign: number) => cx + sign * q.bodyRy * 0.9;
  for (const sign of [-1, 1]) leg(side(sign), side(sign) + (step === sign ? sign : 0), -0.2);
  if (!front) {
    const head = { x: cx, y: bodyY - q.bodyRy - 1 };
    for (const sign of [-1, 1]) ear(head.x + sign * q.headR * 0.6, head.y - q.headR * 0.7, sign);
    s.sphere(head.x, head.y, q.headR, q.headR * 0.85, q.fur);
  }
  s.sphere(cx, bodyY - 1, q.bodyRy * (front ? 1.1 : 1.25), q.bodyRy * (front ? 0.95 : 1.1), q.fur);
  if (q.marks) s.line(cx - 2, bodyY - q.bodyRy * 0.6, cx + 2, bodyY - q.bodyRy * 0.6, q.marks, 3);
  if (!front) {
    if (q.tail > 1.5) s.chain([cx, bodyY + 2, q.tail, cx + 3, bodyY + 6 + step, q.tail * 0.8, cx + 6, bodyY + 7, q.tail * 0.4], q.fur);
    return;
  }
  for (const sign of [-1, 1]) leg(cx + sign * 3, cx + sign * 3, 0);
  // De frente a cabeça vem para a frente do corpo, um pouco maior (mais perto da câmera).
  const hr = q.headR * 1.15;
  const head = { x: cx, y: bodyY - q.bodyRy * 0.3 };
  for (const sign of [-1, 1]) ear(head.x + sign * hr * 0.65, head.y - hr * 0.75, sign);
  s.sphere(head.x, head.y, hr, hr * 0.9, q.fur);
  s.sphere(head.x, head.y + hr * 0.55, q.snout, q.snout * 0.75, q.belly, { join: true });
  s.dots([head.x - 0.5, head.y + hr * 0.4, head.x + 0.5, head.y + hr * 0.4], HOLE);
  for (const sign of [-1, 1]) s.dots([head.x + sign * hr * 0.45, head.y - hr * 0.15], q.eye);
}

const WOLF: Beast = {
  fur: ramp("#a8bcd8"), belly: ramp("#dce6f2"), eye: solid("#7ff3ff"), marks: ramp("#7ff3ff"),
  len: 8, bodyRy: 5.5, legLen: 7, legR: 1.7, headR: 4.5, snout: 3, pointyEars: true, tail: 2.2,
};

const BEAR: Beast = {
  fur: ramp("#6b4a2e"), belly: ramp("#8a6a48"), eye: HOLE, marks: ramp("#9cff7a"),
  len: 11, bodyRy: 9, legLen: 7, legR: 3, headR: 6, snout: 3.5, pointyEars: false, tail: 1.2,
};

// --- Voadores -------------------------------------------------------------------

const WING = ramp("#d8ecf8");
const HORNET_BODY = ramp("#e8b52a");
const HORNET_DARK = ramp("#2a2018");

/** Altura do corpo de quem voa: a cena ainda faz a criatura flutuar sobre a sombra. */
const FLY = 14;

function hornet(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const flap = frame === 1 ? -4 : frame === 2 ? 2 : 0;
  const y = g - FLY;
  const wingPair = (x: number) => {
    for (const sign of [-1, 1]) s.poly([x, y - 2, x + sign * 7, y - 6 + flap, x + sign * 8, y - 2 + flap * 0.5, x + sign * 2, y], WING, { edge: false, light: 0.2 });
  };
  if (dir === "side") {
    s.poly([cx, y - 2, cx + 5, y - 9 + flap, cx + 8, y - 6 + flap, cx + 3, y], WING, { light: -0.1 });
    s.sphere(cx + 5, y + 1, 5, 3.6, HORNET_BODY);
    for (const x of [3, 6]) s.line(cx + x, y - 2, cx + x, y + 4, HORNET_DARK, 2);
    s.poly([cx + 9, y + 1, cx + 13, y + 3, cx + 9, y + 3], HORNET_DARK);
    s.sphere(cx - 1, y - 1, 3.2, 3, HORNET_DARK);
    s.sphere(cx - 5, y - 1, 2.6, 2.5, HORNET_DARK);
    s.dots([cx - 6, y - 2], solid("#ff6a3a"));
    s.line(cx - 1, y + 2, cx - 2, y + 5, HORNET_DARK, 1).line(cx + 1, y + 2, cx + 2, y + 5, HORNET_DARK, 1);
    s.poly([cx - 1, y - 2, cx + 3, y - 10 + flap, cx + 6, y - 8 + flap, cx + 2, y], WING, { light: 0.2 });
    return;
  }
  if (dir === "down") {
    wingPair(cx);
    s.sphere(cx, y - 3, 4, 3.5, HORNET_BODY);
    s.line(cx - 3, y - 3, cx + 3, y - 3, HORNET_DARK, 2);
    s.sphere(cx, y, 3, 2.8, HORNET_DARK);
    s.sphere(cx, y + 3, 2.6, 2.4, HORNET_DARK);
    s.dots([cx - 1.5, y + 2.5, cx + 1.5, y + 2.5], solid("#ff6a3a"));
    return;
  }
  s.sphere(cx, y - 4, 2.6, 2.4, HORNET_DARK);
  s.sphere(cx, y - 1, 3, 2.8, HORNET_DARK);
  wingPair(cx);
  s.sphere(cx, y + 3, 4, 3.8, HORNET_BODY);
  for (const dy of [2, 5]) s.line(cx - 3, y + dy, cx + 3, y + dy, HORNET_DARK, 2);
}

const MOTH_WING = ramp("#c8a8e0");
const MOTH_BODY = ramp("#efe3c8");
const MOTH_SPOT = ramp("#7a4aa0");

function moth(s: Painter, dir: Dir, frame: number, cx: number, g: number) {
  const flap = frame === 1 ? -3 : frame === 2 ? 2 : 0;
  const y = g - FLY - 2;
  const wings = () => {
    for (const sign of [-1, 1]) {
      s.poly([cx, y - 3, cx + sign * 9, y - 9 + flap, cx + sign * 11, y - 3 + flap, cx + sign * 3, y], MOTH_WING);
      s.poly([cx, y, cx + sign * 8, y + 2 + flap * 0.5, cx + sign * 6, y + 6, cx + sign * 1, y + 3], MOTH_WING);
      s.sphere(cx + sign * 7, y - 4 + flap * 0.7, 1.4, 1.4, MOTH_SPOT, { edge: false });
    }
  };
  const antennae = (x: number, top: number) => s.line(x - 1, top, x - 3, top - 4, MOTH_SPOT, 1).line(x + 1, top, x + 3, top - 4, MOTH_SPOT, 1);
  if (dir === "side") {
    s.poly([cx, y - 2, cx + 4, y - 11 + flap, cx + 9, y - 7 + flap, cx + 3, y], MOTH_WING, { light: -0.1 });
    s.sphere(cx + 3, y + 1, 4.5, 2.6, MOTH_BODY);
    s.sphere(cx - 2, y - 1, 2.6, 2.4, MOTH_BODY);
    s.line(cx - 3, y - 3, cx - 6, y - 7, MOTH_SPOT, 1);
    s.dots([cx - 3, y - 1.5], HOLE);
    s.poly([cx - 1, y - 2, cx + 2, y - 12 + flap, cx + 8, y - 9 + flap, cx + 3, y], MOTH_WING);
    s.sphere(cx + 4, y - 8 + flap, 1.4, 1.4, MOTH_SPOT, { edge: false });
    return;
  }
  wings();
  s.sphere(cx, y + 1, 2.6, 5, MOTH_BODY);
  s.sphere(cx, y - 4, 2.5, 2.3, MOTH_BODY);
  antennae(cx, y - 6);
  if (dir === "down") s.dots([cx - 1, y - 4, cx + 1, y - 4], HOLE);
}

const WISP_GLOW = ["#2a8a7a", "#4fd0b0", "#9cffd8", "#d8fff0", "#ffffff"] as const;

/** Fogo-fátuo: chama flutuante; a ponta tremula a cada quadro e faíscas giram em volta. */
function wisp(s: Painter, _dir: Dir, frame: number, cx: number, g: number) {
  const y = g - FLY - 2;
  const sway = [0, 1.5, -1.5][frame];
  s.poly([cx - 4, y - 1, cx + 4, y - 1, cx + 1 + sway, y - 12, cx + sway * 0.5, y - 8], WISP_GLOW, { light: 0.3 });
  s.sphere(cx, y + 1, 5, 5, WISP_GLOW, { light: 0.25 });
  s.sphere(cx - 0.5, y + 1, 2.2, 2.2, solid("#ffffff"), { edge: false });
  const a = (frame * Math.PI * 2) / 3;
  for (let i = 0; i < 3; i++) {
    const t = a + (i * Math.PI * 2) / 3;
    s.dots([cx + Math.cos(t) * 8, y + Math.sin(t) * 4], solid("#d8fff0"));
  }
}

// --- Guardião do Bosque ---------------------------------------------------------

const BARK = ramp("#6b4426");
const ROOT = ramp("#4a2e18");
const CANOPY = ramp("#4f9a2f");
const CANOPY_LIGHT = ramp("#9cd65a");
const GLOW = solid("#ffe066");

/** Copa no lugar da cabeça; o rosto fica no tronco (olhos acesos e boca). */
function canopy(s: Painter, j: Joints) {
  const { head: h, k } = j;
  const r = headRx(j);
  for (const [dx, dy, rr] of [[-6, 2, 0.75], [6, 2, 0.75], [0, -3, 0.95], [-3, 4, 0.7], [4, 5, 0.65]]) {
    s.sphere(h.x + dx * k, h.y + dy * k, r * rr, r * rr * 0.85, CANOPY);
  }
  s.dots([h.x - 3 * k, h.y - 4 * k, h.x + 2 * k, h.y - 6 * k, h.x + 5 * k, h.y, h.x - 6 * k, h.y + 1 * k], CANOPY_LIGHT, 3);
}

const TREANT: Look = {
  k: 1.3, build: { headR: 10, chestRx: 8.5, chestRy: 7.5, waistRx: 7, armR: 2.8, legR: 3.4, legLen: 11 },
  skin: BARK, shirt: BARK, pants: BARK, boots: ROOT,
  head: canopy,
  torso: (s, j) => {
    const { chest: c, k, dir } = j;
    s.line(c.x - 2 * k, c.y - 5 * k, c.x - 1 * k, c.y + 6 * k, ROOT, 1);
    if (dir === "up") return;
    const fx = dir === "side" ? c.x - 3.5 * k : c.x;
    eyes(s, { ...j, head: { x: fx, y: c.y - 3 * k } }, GLOW, 0, 2.5);
    s.line(fx - (dir === "side" ? 1 : 2) * k, c.y + 2 * k, fx + 2 * k, c.y + 2 * k, HOLE);
  },
  weapon: (s, j) => s.sphere(j.handW.x, j.handW.y + 1, 2.6 * j.k, 2 * j.k, CANOPY),
  offhand: (s, j) => s.sphere(j.handO.x, j.handO.y + 1, 2.4 * j.k, 1.8 * j.k, CANOPY),
};

export const SUMMON_ART: Record<SummonKind, CreatureArt> = {
  wolf: grownArt(64, 48, CREATURE_GROWTH, (p, dir, frame, cx, g) => beast(p, WOLF, dir, frame, cx, g)),
  bear: grownArt(80, 60, CREATURE_GROWTH, (p, dir, frame, cx, g) => beast(p, BEAR, dir, frame, cx, g)),
  hornet: grownArt(40, 40, CREATURE_GROWTH, hornet),
  moth: grownArt(44, 40, CREATURE_GROWTH, moth),
  wisp: grownArt(40, 44, CREATURE_GROWTH, wisp),
  treant: humanoidArt(TREANT, 72, 80),
  skeleton: MONSTER_ART.skeleton,
};
