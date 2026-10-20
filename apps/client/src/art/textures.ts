import type * as Phaser from "phaser";
import { CLASS_IDS, TILE_SIZE, type ClassId, type MonsterKind, type SummonKind } from "@kusa/shared";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroSheet, type HeroDir } from "./heroes.ts";
import { itemIcon } from "./items.ts";
import { wallCap, wallFace } from "./walls.ts";
import { treantCanvas } from "./summons.ts";
import { BITE_FRAMES, SLASH_FRAMES, SMASH_FRAMES, biteStrip, leafCanvas, slashStrip, smashStrip } from "./effects.ts";

/**
 * Ponte entre a arte e o Phaser: carrega os PNGs do pack Dungeon Crawl (CC0, ver
 * public/assets/dcss/CREDITS.md) e transforma a arte própria (grades de pixels) em texturas.
 */

const DCSS_PATH = "assets/dcss/";

export const MONSTER_TEXTURE: Record<MonsterKind, string> = {
  rat: "monster-rat",
  goblin: "monster-goblin",
  skeleton: "monster-skeleton",
  orc: "monster-orc",
  ogre: "monster-ogre",
  dragon: "monster-dragon",
};

/** Criaturas invocadas pelo Druida: as do pack e o Guardião do Bosque (arte própria). */
export const SUMMON_TEXTURE: Record<SummonKind, string> = {
  wolf: "summon-wolf",
  hornet: "summon-hornet",
  moth: "summon-moth",
  bear: "summon-bear",
  wisp: "summon-wisp",
  treant: "summon-treant",
};

export const CHEST_TEXTURE = { locked: "chest-locked", unlocked: "chest-unlocked", open: "chest-open" };
export const PORTAL_TEXTURE = { escape: "portal-escape", boss: "portal-boss" };
/** Faixas de variações de chão (32×32 cada). */
export const FLOOR_TEXTURE = { normal: "floor", boss: "floor-boss" };

/** Efeitos de combate: projéteis e impactos do pack, e os de corpo a corpo desenhados em `effects.ts`. */
export const FX_TEXTURE = {
  arrow: "fx-arrow",
  fireball: "fx-fireball",
  energyBolt: "fx-energy-bolt",
  energyHit: "fx-energy-hit",
  natureHit: "fx-nature-hit",
  leaf: "fx-leaf",
};
/** Faixas animadas (quadros 32×32): as do pack e as próprias. */
export const FX_ANIM = { fireBurst: "fx-fire-burst", slash: "fx-slash", bite: "fx-bite", smash: "fx-smash" };
/** Manchas de sangue no chão (faixas de variações 32×32). */
export const BLOOD_TEXTURE = { splat: "blood-splat", puddle: "blood-puddle" };

export function preloadArt(scene: Phaser.Scene) {
  scene.load.setPath(DCSS_PATH);
  for (const key of [
    ...Object.values(MONSTER_TEXTURE),
    ...Object.values(SUMMON_TEXTURE).filter((key) => key !== SUMMON_TEXTURE.treant),
    ...Object.values(CHEST_TEXTURE),
    ...Object.values(PORTAL_TEXTURE),
    ...Object.values(FLOOR_TEXTURE),
    FX_TEXTURE.arrow,
    FX_TEXTURE.fireball,
    FX_TEXTURE.energyBolt,
    FX_TEXTURE.energyHit,
    FX_TEXTURE.natureHit,
  ]) {
    scene.load.image(key, `${key}.png`);
  }
  for (const key of [FX_ANIM.fireBurst, ...Object.values(BLOOD_TEXTURE)]) {
    scene.load.spritesheet(key, `${key}.png`, { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
  }
  scene.load.setPath();
}

export const heroTexture = (classId: ClassId) => `hero-${classId}`;
export const heroWalkAnim = (classId: ClassId, dir: HeroDir) => `hero-${classId}-walk-${dir}`;
export const heroIdleFrame = (dir: HeroDir) => HERO_DIRS.indexOf(dir) * HERO_FRAMES;

/** Gera as texturas e animações das classes (uma vez por jogo). */
export function createHeroArt(scene: Phaser.Scene) {
  for (const classId of CLASS_IDS) {
    const key = heroTexture(classId);
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.addCanvas(key, heroSheet(classId))!;
    for (let i = 0; i < HERO_DIRS.length * HERO_FRAMES; i++) {
      texture.add(i, 0, i * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE);
    }
    HERO_DIRS.forEach((dir) => {
      const first = heroIdleFrame(dir);
      scene.anims.create({
        key: heroWalkAnim(classId, dir),
        frames: [1, 0, 2, 0].map((f) => ({ key, frame: first + f })),
        frameRate: 8,
        repeat: -1,
      });
    });
  }
}

/** Gera as texturas próprias dos efeitos e as animações de impacto (uma vez por jogo). */
export function createEffectArt(scene: Phaser.Scene) {
  if (!scene.textures.exists(FX_TEXTURE.leaf)) scene.textures.addCanvas(FX_TEXTURE.leaf, leafCanvas());
  if (!scene.textures.exists(SUMMON_TEXTURE.treant)) scene.textures.addCanvas(SUMMON_TEXTURE.treant, treantCanvas());
  const strips: [string, () => HTMLCanvasElement, number][] = [
    [FX_ANIM.slash, slashStrip, SLASH_FRAMES],
    [FX_ANIM.bite, biteStrip, BITE_FRAMES],
    [FX_ANIM.smash, smashStrip, SMASH_FRAMES],
  ];
  for (const [key, draw, frames] of strips) {
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.addCanvas(key, draw())!;
    for (let i = 0; i < frames; i++) texture.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  }
  for (const key of Object.values(FX_ANIM)) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key), frameRate: 14, hideOnComplete: true });
  }
}

/** Textura de tampa de parede, criada na primeira vez que é pedida. */
export function wallCapTexture(scene: Phaser.Scene, variant: number, rim: number) {
  return lazyCanvas(scene, `wall-cap-${variant}-${rim}`, () => wallCap(variant, rim));
}

export function wallFaceTexture(scene: Phaser.Scene, variant: number) {
  return lazyCanvas(scene, `wall-face-${variant}`, () => wallFace(variant));
}

/** Ícone 16×16 de um item (chão e HUD). */
export function itemTexture(scene: Phaser.Scene, itemId: string) {
  return lazyCanvas(scene, `item-${itemId}`, () => itemIcon(itemId));
}

function lazyCanvas(scene: Phaser.Scene, key: string, draw: () => HTMLCanvasElement) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  return key;
}

/** Quantas variações de chão cabem numa faixa carregada. */
export function floorVariants(scene: Phaser.Scene, key: string) {
  return Math.floor(scene.textures.get(key).getSourceImage().width / TILE_SIZE);
}
