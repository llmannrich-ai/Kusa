import type * as Phaser from "phaser";
import { CLASS_IDS, TILE_SIZE, type ClassId, type MonsterKind } from "@kusa/shared";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroSheet, type HeroDir } from "./heroes.ts";
import { wallCap, wallFace } from "./walls.ts";

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

export function preloadArt(scene: Phaser.Scene) {
  scene.load.setPath(DCSS_PATH);
  for (const key of [
    ...Object.values(MONSTER_TEXTURE),
    ...Object.values(CHEST_TEXTURE),
    ...Object.values(PORTAL_TEXTURE),
    ...Object.values(FLOOR_TEXTURE),
  ]) {
    scene.load.image(key, `${key}.png`);
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

/** Textura de tampa de parede, criada na primeira vez que é pedida. */
export function wallCapTexture(scene: Phaser.Scene, variant: number, rim: number) {
  return lazyCanvas(scene, `wall-cap-${variant}-${rim}`, () => wallCap(variant, rim));
}

export function wallFaceTexture(scene: Phaser.Scene, variant: number) {
  return lazyCanvas(scene, `wall-face-${variant}`, () => wallFace(variant));
}

function lazyCanvas(scene: Phaser.Scene, key: string, draw: () => HTMLCanvasElement) {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  return key;
}

/** Quantas variações de chão cabem numa faixa carregada. */
export function floorVariants(scene: Phaser.Scene, key: string) {
  return Math.floor(scene.textures.get(key).getSourceImage().width / TILE_SIZE);
}
