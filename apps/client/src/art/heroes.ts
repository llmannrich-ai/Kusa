import type { ClassId, ItemTier } from "@kusa/shared";
import { DIRS, FRAMES, creatureSheet, type Dir } from "./creature.ts";
import { eyes, headRx, humanoid, type Joints, type Look, type Point } from "./humanoid.ts";
import {
  NO_OUTFIT, armorDetails, helmet, knightWeapon, metal, pauldronSpike, shield, tierOf, weaponTrim, weaponWood, type Outfit,
} from "./outfit.ts";
import { makeCanvas } from "./pixels.ts";
import { ramp, solid, type Painter, type Ramp } from "./paint.ts";

/**
 * Arte própria das 4 classes, no espírito dos outfits do Tibia, no traço de `paint.ts`:
 * vista de cima levemente inclinada, 3 direções (a direita é a esquerda espelhada) e 3 quadros
 * de caminhada por direção (a animação toca `1, 0, 2, 0`). A folha segue `creature.ts`.
 *
 * Cada classe tem a roupa e a arma dela; o equipamento vestido (`outfit.ts`) troca a cabeça pelo
 * capacete, recobre o tronco com a armadura, põe o escudo na outra mão e muda a arma: o cavaleiro
 * empunha a arma do item, as outras classes mantêm arco ou cajado no material da arma.
 */

export type HeroDir = Dir;
export const HERO_DIRS = DIRS;
export const HERO_FRAMES = FRAMES;
/** Quadro da folha, em pixels de arte (o herói passa um pouco do tile, como no Tibia). */
export const HERO_SIZE = 88;
/** Escala do esqueleto humanoide nos heróis. */
const K = 1.55;

const SKIN = ramp("#e0ae84");
const EYE = solid("#24140c");
const GOLD = ramp("#e0b040");
const LEATHER = ramp("#7a5232");
const DARK_LEATHER = ramp("#4e3320");
const LEAF = ramp("#6cbf3c");
const FLOWER = solid("#f2d14a");

// --- Cabeças -----------------------------------------------------------------------

/** Rosto em pele sobre a cabeça (cabelo, capuz). */
function face(s: Painter, j: Joints, rx: number, ry: number, dy: number) {
  const { head: h, k } = j;
  if (j.dir === "up") return;
  const dx = j.dir === "side" ? -headRx(j) * 0.45 : 0;
  s.sphere(h.x + dx, h.y + dy * k, (j.dir === "side" ? rx * 0.75 : rx) * k, ry * k, SKIN, { edge: false });
}

/** Cabeça de cabelo curto: base de quem não tem chapéu e o que fica sob o capacete. */
function hairHead(hair: Ramp) {
  return (s: Painter, j: Joints) => {
    const { head: h, k, dir } = j;
    const r = headRx(j);
    s.sphere(h.x, h.y, r, r * 0.95, hair);
    face(s, j, 7.4, 6.2, 1.5);
    if (dir === "up") {
      s.limb(h.x - 2 * k, h.y + r - 2 * k, h.x - k, h.y + r + k, 1.6 * k, 1.2 * k, hair);
      return;
    }
    const dx = dir === "side" ? k : 0;
    s.sphere(h.x + dx, h.y - 5 * k, r * (dir === "side" ? 0.85 : 0.9), 2.8 * k, hair, { join: true });
    eyes(s, j, EYE, 1.5);
  };
}

const BROWN_HAIR = ramp("#7a4a24");
const DARK_HAIR = ramp("#4a2e1a");
const HEADBAND = ramp("#3f7a3a");

function paladinHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  hairHead(BROWN_HAIR)(s, j);
  s.limb(h.x - r + 0.5, h.y - 3 * k, h.x + r - 0.5, h.y - 3 * k, 1.1 * k, 1.1 * k, HEADBAND);
  if (dir !== "down") s.chain([h.x + (dir === "side" ? r - 1 : 1), h.y - 3 * k, k, h.x + 3 * k, h.y + 3 * k, k, h.x + 4 * k, h.y + 6 * k, 0.8 * k], HEADBAND);
}

const SORC_PURPLE = ramp("#6a35a0");
const BEARD = ramp("#e8e4ee");

function beard(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  if (dir === "up") {
    s.sphere(h.x, h.y + 2 * k, r * 0.9, r * 0.75, BEARD);
    return;
  }
  const dx = dir === "side" ? -3.5 * k : 0;
  s.sphere(h.x + dx, h.y + 5 * k, (dir === "side" ? 4 : 5.5) * k, 5.5 * k, BEARD);
  s.limb(h.x + dx - 3 * k, h.y + 2.5 * k, h.x + dx + (dir === "side" ? 1 : 3) * k, h.y + 2.5 * k, 1.3 * k, 1.3 * k, BEARD, { join: true });
}

function sorcererHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j);
  s.sphere(h.x, h.y, r * 0.92, r * 0.9, SKIN);
  beard(s, j);
  if (dir !== "up") eyes(s, j, EYE, 0.5);
  // Chapéu pontudo: aba larga, cone dobrado para trás e faixa dourada.
  const tipX = h.x + (dir === "side" ? 7 : 3) * k;
  const u = (dx: number, dy: number) => [h.x + dx * k, h.y + dy * k];
  s.poly([...u(-7, -3), ...u(7, -3), ...u(3, -13), tipX, h.y - 18 * k, ...u(-1, -13)], SORC_PURPLE);
  s.sphere(tipX + k, h.y - 18 * k, 1.6 * k, 1.6 * k, GOLD);
  s.poly([...u(-6.5, -4.5), ...u(6.5, -4.5), ...u(6, -6.5), ...u(-6, -6.5)], GOLD, { edge: false, shade: 3 });
  s.sphere(h.x, h.y - 3 * k, r + 3 * k, 3 * k, SORC_PURPLE);
}

const DRUID_GREEN = ramp("#3f8a3c");
const DRUID_DARK = ramp("#2a5e2a");

function druidHead(s: Painter, j: Joints) {
  const { head: h, k, dir } = j;
  const r = headRx(j) + k;
  if (dir === "up") s.limb(h.x, h.y + 2 * k, h.x + k, h.y + r + 2 * k, 3 * k, 1.5 * k, DRUID_GREEN);
  if (dir === "side") s.limb(h.x + 3 * k, h.y, h.x + r + 2 * k, h.y + 4 * k, 3 * k, 1.5 * k, DRUID_GREEN);
  s.sphere(h.x, h.y - 0.5 * k, r, r * 0.95, DRUID_GREEN);
  if (dir !== "up") {
    // Borda escura do capuz em volta do rosto.
    s.sphere(h.x + (dir === "side" ? -r * 0.45 : 0), h.y + 1.5 * k, (dir === "side" ? 5.6 : 7.5) * k, 6.5 * k, DRUID_DARK, { edge: false, shade: 1 });
    face(s, j, 6, 5.2, 2);
    eyes(s, j, EYE, 1.5);
    if (dir === "down") s.dots([h.x - 4.5 * k, h.y + 4 * k, h.x + 3.5 * k, h.y + 4 * k], ramp("#e88a7a"), 2);
  }
  // Folhas presas no capuz.
  s.sphere(h.x - 4 * k, h.y - r + 1.5 * k, 2.2 * k, 1.5 * k, LEAF);
  s.sphere(h.x + k, h.y - r + 0.5 * k, 2.2 * k, 1.5 * k, LEAF);
  s.dots([h.x + 4 * k, h.y - r + 2 * k], FLOWER);
}

// --- Armas da classe -----------------------------------------------------------------

/** Arco de pé ao lado da mão: `bulge` diz para que lado a curva abre (+1 direita, −1 esquerda). */
function bow(s: Painter, j: Joints, at: Point, bulge: number, wood: Ramp, tips: Ramp) {
  const { k } = j;
  const x = at.x, y = at.y;
  const top = { x: x - bulge * k, y: y - 12 * k }, bottom = { x: x - bulge * k, y: y + 9 * k };
  s.line(top.x, top.y, bottom.x, bottom.y, solid("#e8e0c8"), 2);
  s.chain([top.x, top.y, k, x + bulge * 3 * k, y - 6 * k, 1.3 * k, x + bulge * 3.5 * k, y - k, 1.4 * k, x + bulge * 3 * k, y + 4 * k, 1.3 * k, bottom.x, bottom.y, k], wood);
  s.dots([top.x, top.y, bottom.x, bottom.y], tips, 3);
}

/** Cajado em pé: haste no material da arma (com uma luva entre dois anéis) e o topo da classe. */
function staff(s: Painter, j: Joints, at: Point, lean: number, tier: ItemTier | 0, top: (tip: Point) => void) {
  const { k } = j;
  const tip = { x: at.x + lean * k, y: at.y - 21 * k };
  const base = { x: at.x - lean * 0.3 * k, y: at.y + 8 * k };
  s.limb(base.x, base.y, tip.x, tip.y + 2 * k, 1.4 * k, 1.2 * k, weaponWood(0));
  if (tier) {
    const p = (t: number) => ({ x: base.x + (tip.x - base.x) * t, y: base.y + (tip.y - base.y) * t });
    const a = p(0.45), b = p(0.85);
    s.limb(a.x, a.y, b.x, b.y, 1.5 * k, 1.4 * k, weaponWood(tier));
    for (const q of [a, b]) s.limb(q.x - 1.8 * k, q.y, q.x + 1.8 * k, q.y, 0.8 * k, 0.8 * k, weaponTrim(tier));
  }
  top(tip);
}

const ORB = ["#1d5f8a", "#2f9fd6", "#5fd3ff", "#b4ecff", "#ffffff"] as const;

function orb(s: Painter, j: Joints, tip: Point) {
  const { k } = j;
  s.limb(tip.x - 2.5 * k, tip.y + 2 * k, tip.x + 2.5 * k, tip.y + 2 * k, k, k, GOLD);
  s.sphere(tip.x, tip.y - 2 * k, 3.4 * k, 3.4 * k, ORB, { light: 0.2 });
  s.dots([tip.x - 1.5 * k, tip.y - 3.5 * k], solid("#ffffff"));
}

function leafyTop(s: Painter, j: Joints, tip: Point) {
  const { k } = j;
  s.chain([tip.x, tip.y + 2 * k, 1.3 * k, tip.x - 2 * k, tip.y - 2 * k, 1.2 * k, tip.x + k, tip.y - 5 * k, k], weaponWood(0));
  s.sphere(tip.x + 3 * k, tip.y - k, 2.3 * k, 1.6 * k, LEAF);
  s.sphere(tip.x - 4 * k, tip.y - 4 * k, 2.3 * k, 1.6 * k, LEAF);
  s.sphere(tip.x + 2 * k, tip.y - 6 * k, 2 * k, 1.5 * k, LEAF);
  s.dots([tip.x - k, tip.y - 7 * k], FLOWER);
}

// --- Detalhes do tronco ------------------------------------------------------------

function belt(s: Painter, j: Joints, r: Ramp, buckle?: Ramp) {
  const w = j.b.waistRx * (j.dir === "side" ? 0.75 : 1) * j.k;
  s.limb(j.cx - w, j.hipY - 2 * j.k, j.cx + w, j.hipY - 2 * j.k, 1.2 * j.k, 1.2 * j.k, r);
  if (buckle && j.dir === "down") s.rect(j.cx - j.k, j.hipY - 3 * j.k, 3 * j.k, 2 * j.k, buckle, 3);
}

function quiver(s: Painter, j: Joints) {
  const { chest: c, dir, k } = j;
  const x = dir === "side" ? c.x + 6 * k : c.x - 4 * k * j.sideW;
  if (dir === "down") {
    s.dots([x - k, c.y - 11 * k, x + k, c.y - 12 * k, x + 3 * k, c.y - 11 * k], solid("#e8e0c8"));
    s.dots([x, c.y - 12 * k, x + 2 * k, c.y - 13 * k], ramp("#c0392b"), 3);
    return;
  }
  s.limb(x - 2 * k, c.y - 6 * k, x + 2 * k, c.y + 5 * k, 2.6 * k, 2.4 * k, LEATHER);
  for (const dx of [-3, -1, 1]) s.limb(x + (dx - 2) * k, c.y - 7 * k, x + (dx - 3) * k, c.y - 11 * k, 0.8 * k, 0.8 * k, solid("#c0392b"));
}

function robeTrim(s: Painter, j: Joints, color: Ramp) {
  const bottom = j.g - 2.2 * j.k;
  const half = (j.dir === "side" ? 7.5 : 9.5) * j.k;
  const sway = j.dir === "side" ? j.step * 1.5 : 0;
  s.line(j.cx - half + sway + 1, bottom - 1, j.cx + half + sway - 1, bottom - 1, color, 3);
  if (j.dir === "down") s.line(j.cx, j.hipY, j.cx, bottom - 1, color, 3);
}

// --- Classes ------------------------------------------------------------------------

interface HeroDef {
  look: Look;
  /** Cabeça que fica sob o capacete (cabelo, barba). */
  bare: (s: Painter, j: Joints) => void;
  /** Detalhes da roupa da classe sobre o tronco (cinto, aljava, barra da túnica). */
  details: (s: Painter, j: Joints, armored: boolean) => void;
  /** Arma na mão, com o nível da arma equipada (0 = a da classe). */
  weapon: (s: Painter, j: Joints, tier: ItemTier | 0) => void;
}

const KNIGHT_RED = ramp("#b8352c");

const HEROES: Record<ClassId, HeroDef> = {
  knight: {
    look: {
      skin: SKIN, shirt: KNIGHT_RED, pants: ramp("#3c4a78"), boots: DARK_LEATHER,
      head: hairHead(DARK_HAIR),
    },
    bare: hairHead(DARK_HAIR),
    details: (s, j, armored) => { if (!armored) belt(s, j, DARK_LEATHER, GOLD); },
    weapon: (s, j, tier) => knightWeapon(s, j.handW, j.dir === "side" ? -0.75 : 0.12 * j.sideW, j.k, tier),
  },
  paladin: {
    look: {
      skin: SKIN, shirt: ramp("#d9a52c"), sleeves: ramp("#c8902a"), pants: ramp("#4f6a34"), boots: LEATHER,
      head: paladinHead, back: quiver,
    },
    bare: hairHead(BROWN_HAIR),
    details: (s, j) => {
      belt(s, j, DARK_LEATHER, GOLD);
      // Correia da aljava atravessando o peito.
      if (j.dir !== "side") s.line(j.cx - 6 * j.k * j.sideW, j.chest.y - 5 * j.k, j.cx + 6 * j.k * j.sideW, j.chest.y + 4 * j.k, DARK_LEATHER, 2);
    },
    weapon: (s, j, tier) => bow(s, j, { x: j.handW.x - (j.dir === "side" ? 2 * j.k : 0), y: j.handW.y }, j.dir === "side" ? -1 : j.sideW, weaponWood(tier), weaponTrim(tier)),
  },
  sorcerer: {
    look: {
      skin: SKIN, shirt: SORC_PURPLE, robe: SORC_PURPLE, boots: DARK_LEATHER,
      build: { armR: 2.9 }, head: sorcererHead, farGrip: true,
    },
    bare: (s, j) => { hairHead(ramp("#dcd8e4"))(s, j); },
    details: (s, j) => { belt(s, j, GOLD); robeTrim(s, j, GOLD); },
    weapon: (s, j, tier) => staff(s, j, j.handW, j.dir === "side" ? -8 : 0, tier, (tip) => orb(s, j, tip)),
  },
  druid: {
    look: {
      skin: SKIN, shirt: DRUID_GREEN, robe: DRUID_GREEN, boots: LEATHER,
      build: { armR: 2.8 }, head: druidHead, farGrip: true,
    },
    bare: hairHead(BROWN_HAIR),
    details: (s, j) => { belt(s, j, ramp("#a07a44")); robeTrim(s, j, DRUID_DARK); },
    weapon: (s, j, tier) => staff(s, j, j.handW, j.dir === "side" ? -8 : 0, tier, (tip) => leafyTop(s, j, tip)),
  },
};

/** O visual da classe vestindo `outfit`. */
function heroLook(classId: ClassId, outfit: Outfit): Look {
  const hero = HEROES[classId];
  const armor = tierOf(outfit, "armor");
  const helm = tierOf(outfit, "helmet");
  const shieldTier = tierOf(outfit, "shield");
  const weaponTier = tierOf(outfit, "weapon");
  const look: Look = { ...hero.look, k: K };
  if (armor) {
    look.shirt = metal(armor);
    look.sleeves = metal(armor);
    if (armor >= 4) look.shoulders = metal(armor);
    if (armor === 5) look.pauldron = (s, j, at) => pauldronSpike(s, at, j.k);
  }
  look.torso = (s, j) => {
    if (armor) armorDetails(s, j, armor);
    hero.details(s, j, !!armor);
  };
  if (helm) {
    look.head = (s, j) => {
      hero.bare(s, j);
      helmet(s, j, helm, headRx(j), SKIN, () => eyes(s, j, EYE, 1.5));
      // A barba do feiticeiro aparece por baixo dos elmos que deixam o rosto à mostra.
      if (classId === "sorcerer" && helm !== 4 && j.dir !== "up") beard(s, j);
    };
  }
  look.weapon = (s, j) => hero.weapon(s, j, weaponTier);
  if (shieldTier) look.offhand = (s, j) => shield(s, j, j.dir === "down" ? { x: j.handO.x + 1.5 * j.k, y: j.handO.y } : j.handO, shieldTier);
  return look;
}

/**
 * Folha de sprites da classe vestindo `outfit`: 9 quadros de `HERO_SIZE` em linha
 * (`direção * 3 + quadro`), virados para a esquerda no lado.
 */
export function heroSheet(classId: ClassId, outfit: Outfit = NO_OUTFIT): HTMLCanvasElement {
  const look = heroLook(classId, outfit);
  return creatureSheet({
    w: HERO_SIZE, h: HERO_SIZE,
    draw: (s, dir, frame) => humanoid(s, look, dir, frame, HERO_SIZE / 2, HERO_SIZE - 5),
  });
}

/** Quadro parado de cada direção pedida, lado a lado (retratos e prévia do equipamento). */
export function heroPoses(classId: ClassId, outfit: Outfit = NO_OUTFIT, dirs: HeroDir[] = ["down", "side", "up"]) {
  const sheet = heroSheet(classId, outfit);
  const { canvas, ctx } = makeCanvas(HERO_SIZE * dirs.length, HERO_SIZE);
  dirs.forEach((dir, i) => {
    const frame = HERO_DIRS.indexOf(dir) * HERO_FRAMES;
    ctx.drawImage(sheet, frame * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, i * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE);
  });
  return canvas;
}
