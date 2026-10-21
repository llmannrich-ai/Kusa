import type * as Phaser from "phaser";
import { CLASS_IDS, TILE_SIZE, type ClassId, type MonsterKind, type SummonKind } from "@kusa/shared";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroSheet, type HeroDir } from "./heroes.ts";
import { itemIcon } from "./items.ts";
import { NO_OUTFIT, outfitKey, type Outfit } from "./outfit.ts";
import { wallCap, wallFace } from "./walls.ts";
import { MONSTER_ART } from "./monsters.ts";
import { SUMMON_ART } from "./summons.ts";
import { creatureSheet, type CreatureArt } from "./creature.ts";
import { BITE_FRAMES, SLASH_FRAMES, SMASH_FRAMES, biteStrip, leafCanvas, slashStrip, smashStrip } from "./effects.ts";
import { TORCH_FRAMES, cryptFloorStrip, cryptTallStrip, cryptWallStrip, dustCanvas, lightCanvas, torchStrip } from "./cryptDecor.ts";
import { RIPPLE_FRAMES, decorFloorStrip, decorTallStrip, decorWaterStrip, fireflyCanvas, mistCanvas, rippleStrip, shadeStrip } from "./swampDecor.ts";

/**
 * Ponte entre a arte e o Phaser: carrega os PNGs do pack Dungeon Crawl (CC0, ver
 * public/assets/dcss/CREDITS.md) e transforma a arte própria (heróis, monstros, invocações,
 * paredes, efeitos e detalhes dos mapas) em texturas.
 */

const DCSS_PATH = "assets/dcss/";

export const MONSTER_TEXTURE: Record<MonsterKind, string> = {
  rat: "monster-rat",
  goblin: "monster-goblin",
  skeleton: "monster-skeleton",
  orc: "monster-orc",
  ogre: "monster-ogre",
  dragon: "monster-dragon",
  frog: "monster-frog",
  moccasin: "monster-moccasin",
  bogBody: "monster-bog-body",
  naga: "monster-naga",
  troll: "monster-troll",
  hydra: "monster-hydra",
};

/** Criaturas invocadas (arte própria, `summons.ts`). */
export const SUMMON_TEXTURE: Record<SummonKind, string> = {
  wolf: "summon-wolf",
  hornet: "summon-hornet",
  moth: "summon-moth",
  bear: "summon-bear",
  wisp: "summon-wisp",
  treant: "summon-treant",
  // O Esqueleto Erguido usa a folha do Esqueleto monstro (o brilho de aliado nos pés diferencia).
  skeleton: "monster-skeleton",
  eagle: "summon-eagle",
};

export const CHEST_TEXTURE = { locked: "chest-locked", unlocked: "chest-unlocked", open: "chest-open" };
export const PORTAL_TEXTURE = { escape: "portal-escape", boss: "portal-boss" };
/** Faixas de variações de chão (32×32 cada). */
export const FLOOR_TEXTURE = { normal: "floor", boss: "floor-boss" };
/** Pântano das Ruínas: faixas de chão e água (tilemap) e de árvores, muros e colunas (sprites 32×32). */
export const SWAMP_TEXTURE = {
  grass: "floor-grass",
  mud: "floor-mud",
  ruins: "floor-ruins",
  forest: "floor-forest",
  water: "water-swamp",
  tree: "tree-swamp",
  ruinWall: "ruin-wall",
  column: "ruin-column",
  /** Franja de capim (N, L, S, O) e espuma da margem (N, L, S, O, cantos NE, NO, SE, SO). */
  fringe: "grass-fringe",
  shore: "water-shore",
};
/** Detalhes do pântano em arte própria (`swampDecor.ts`), gerados na primeira hunt no pântano. */
export const SWAMP_DECOR = {
  floor: "swamp-decor-floor",
  water: "swamp-decor-water",
  tall: "swamp-decor-tall",
  shade: "swamp-shade",
  ripple: "swamp-ripple",
  firefly: "swamp-firefly",
  mist: "swamp-mist",
};
const SWAMP_SHEETS = [SWAMP_TEXTURE.tree, SWAMP_TEXTURE.ruinWall, SWAMP_TEXTURE.column];

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
    ...Object.values(CHEST_TEXTURE),
    ...Object.values(PORTAL_TEXTURE),
    ...Object.values(FLOOR_TEXTURE),
    ...Object.values(SWAMP_TEXTURE).filter((key) => !SWAMP_SHEETS.includes(key)),
    FX_TEXTURE.arrow,
    FX_TEXTURE.fireball,
    FX_TEXTURE.energyBolt,
    FX_TEXTURE.energyHit,
    FX_TEXTURE.natureHit,
  ]) {
    scene.load.image(key, `${key}.png`);
  }
  for (const key of [FX_ANIM.fireBurst, ...Object.values(BLOOD_TEXTURE), ...SWAMP_SHEETS]) {
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
  texture.setFilter(creatureFilter);
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

/** Filtro das folhas de criatura (ver `setCreatureFiltering`); vale também para roupas geradas depois. */
let creatureFilter = 1;

/** Folhas e animações de caminhada dos monstros e das invocações (uma vez por jogo). */
export function createCreatureArt(scene: Phaser.Scene) {
  const arts: [string, CreatureArt][] = [
    ...Object.entries(MONSTER_ART).map(([kind, art]) => [MONSTER_TEXTURE[kind as MonsterKind], art] as [string, CreatureArt]),
    ...Object.entries(SUMMON_ART).map(([kind, art]) => [SUMMON_TEXTURE[kind as SummonKind], art] as [string, CreatureArt]),
  ];
  for (const [key, art] of arts) {
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.addCanvas(key, creatureSheet(art))!;
    for (let i = 0; i < HERO_DIRS.length * HERO_FRAMES; i++) texture.add(i, 0, i * art.w, 0, art.w, art.h);
    HERO_DIRS.forEach((dir) => {
      const first = heroIdleFrame(dir);
      scene.anims.create({
        key: heroWalkAnim(key, dir),
        frames: [1, 0, 2, 0].map((f) => ({ key, frame: first + f })),
        frameRate: 8,
        repeat: -1,
      });
    });
  }
}

/**
 * As criaturas têm 2 pixels de arte por unidade: com zoom alto (celular) o pixel fica nítido;
 * com zoom baixo (desktop sem DPR) cada pixel de arte ficaria menor que um da tela, e o filtro
 * linear evita que linhas finas sumam ou cintilem.
 */
export function setCreatureFiltering(scene: Phaser.Scene, artPixelOnScreen: number) {
  const mode = artPixelOnScreen < 1.5 ? 0 : 1; // Phaser.Textures.FilterMode: LINEAR = 0, NEAREST = 1
  creatureFilter = mode;
  const keys = [...Object.values(MONSTER_TEXTURE), ...Object.values(SUMMON_TEXTURE)];
  for (const key of scene.textures.getTextureKeys()) {
    if (key.startsWith("hero-") || keys.includes(key)) scene.textures.get(key).setFilter(mode);
  }
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

/** Detalhes da cripta em arte própria (`cryptDecor.ts`), gerados na primeira hunt na cripta. */
export const CRYPT_DECOR = {
  floor: "crypt-decor-floor",
  wall: "crypt-decor-wall",
  tall: "crypt-decor-tall",
  torch: "crypt-torch",
  shade: "crypt-shade",
  light: "crypt-light",
  dust: "crypt-dust",
};

/** Gera as texturas e a animação da tocha da cripta (uma vez por jogo). */
export function createCryptArt(scene: Phaser.Scene) {
  addStrips(scene, [
    [CRYPT_DECOR.floor, cryptFloorStrip],
    [CRYPT_DECOR.wall, cryptWallStrip],
    [CRYPT_DECOR.tall, cryptTallStrip],
    [CRYPT_DECOR.torch, torchStrip],
    [CRYPT_DECOR.shade, () => shadeStrip("12,8,4", 1.5)],
  ]);
  if (!scene.textures.exists(CRYPT_DECOR.light)) scene.textures.addCanvas(CRYPT_DECOR.light, lightCanvas());
  if (!scene.textures.exists(CRYPT_DECOR.dust)) scene.textures.addCanvas(CRYPT_DECOR.dust, dustCanvas());
  if (!scene.anims.exists(CRYPT_DECOR.torch)) {
    scene.anims.create({
      key: CRYPT_DECOR.torch,
      frames: Array.from({ length: TORCH_FRAMES }, (_, frame) => ({ key: CRYPT_DECOR.torch, frame })),
      frameRate: 7,
      repeat: -1,
    });
  }
}

/** Faixas de quadros 32×32 viram texturas com um quadro por tile. */
function addStrips(scene: Phaser.Scene, strips: [string, () => HTMLCanvasElement][]) {
  for (const [key, draw] of strips) {
    if (scene.textures.exists(key)) continue;
    const canvas = draw();
    const texture = scene.textures.addCanvas(key, canvas)!;
    for (let i = 0; i < canvas.width / TILE_SIZE; i++) texture.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  }
}

/** Gera as texturas dos detalhes do pântano (uma vez por jogo), com quadros 32×32 nas faixas. */
export function createSwampArt(scene: Phaser.Scene) {
  addStrips(scene, [
    [SWAMP_DECOR.floor, decorFloorStrip],
    [SWAMP_DECOR.water, decorWaterStrip],
    [SWAMP_DECOR.tall, decorTallStrip],
    [SWAMP_DECOR.shade, () => shadeStrip()],
    [SWAMP_DECOR.ripple, rippleStrip],
  ]);
  if (!scene.textures.exists(SWAMP_DECOR.firefly)) scene.textures.addCanvas(SWAMP_DECOR.firefly, fireflyCanvas());
  if (!scene.textures.exists(SWAMP_DECOR.mist)) scene.textures.addCanvas(SWAMP_DECOR.mist, mistCanvas());
  if (!scene.anims.exists(SWAMP_DECOR.ripple)) {
    scene.anims.create({
      key: SWAMP_DECOR.ripple,
      frames: Array.from({ length: RIPPLE_FRAMES }, (_, frame) => ({ key: SWAMP_DECOR.ripple, frame })),
      frameRate: 6,
      hideOnComplete: true,
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
