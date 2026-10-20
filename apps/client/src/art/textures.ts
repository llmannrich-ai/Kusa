import type * as Phaser from "phaser";
import { CLASS_IDS, TILE_SIZE, type ClassId, type MonsterKind } from "@kusa/shared";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroSheet, type HeroDir } from "./heroes.ts";
import { itemIcon } from "./items.ts";
import { NO_OUTFIT, outfitKey, type Outfit } from "./outfit.ts";
import { wallCap, wallFace } from "./walls.ts";
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

/** Textura de uma classe vestindo uma combinação de equipamento. */
export const heroTexture = (classId: ClassId, outfit: Outfit = NO_OUTFIT) => `hero-${classId}-${outfitKey(outfit)}`;
export const heroWalkAnim = (texture: string, dir: HeroDir) => `${texture}-walk-${dir}`;
export const heroIdleFrame = (dir: HeroDir) => HERO_DIRS.indexOf(dir) * HERO_FRAMES;

/**
 * Folha e animações de caminhada da classe com o equipamento vestido. Cada combinação é
 * gerada na primeira vez que aparece (são poucas por hunt) e fica no jogo. Devolve a chave da textura.
 */
export function heroArt(scene: Phaser.Scene, classId: ClassId, outfit: Outfit = NO_OUTFIT) {
  const key = heroTexture(classId, outfit);
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.addCanvas(key, heroSheet(classId, outfit))!;
  for (let i = 0; i < HERO_DIRS.length * HERO_FRAMES; i++) {
    texture.add(i, 0, i * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE);
  }
  HERO_DIRS.forEach((dir) => {
    const first = heroIdleFrame(dir);
    scene.anims.create({
      key: heroWalkAnim(key, dir),
      frames: [1, 0, 2, 0].map((f) => ({ key, frame: first + f })),
      frameRate: 8,
      repeat: -1,
    });
  });
  return key;
}

/** Gera as texturas das classes sem equipamento (uma vez por jogo). */
export function createHeroArt(scene: Phaser.Scene) {
  for (const classId of CLASS_IDS) heroArt(scene, classId);
}

/** Gera as texturas próprias dos efeitos e as animações de impacto (uma vez por jogo). */
export function createEffectArt(scene: Phaser.Scene) {
  if (!scene.textures.exists(FX_TEXTURE.leaf)) scene.textures.addCanvas(FX_TEXTURE.leaf, leafCanvas());
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
