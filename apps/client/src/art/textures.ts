import type * as Phaser from "phaser";
import { CLASS_IDS, TILE_SIZE, type ClassId, type SummonKind } from "@kusa/shared";
import { MONSTER_ANIMS, OWN_MONSTER_ART, OWN_MONSTER_DRAW, monsterAnimKey, monsterTextures, type MonsterAnim } from "./bestiary.ts";
import { CLIP_ORDER, CLIPS, clipStart } from "./rig.ts";
import { makeCanvas } from "./pixels.ts";
import { SAND_WORM_OUTLINE } from "./sandWorm.ts";
import { HERO_DIRS, HERO_FRAMES, heroSheet, type HeroDir } from "./heroes.ts";
import { itemIcon } from "./items.ts";
import { NO_OUTFIT, outfitKey, type Outfit } from "./outfit.ts";
import { wallCap, wallFace } from "./walls.ts";
import { protoBeasts, protoCrypt } from "./newArt.ts";
import { SUMMON_ART, SUMMON_FRAMES, SUMMON_OUTLINE, summonPortrait, summonSheet } from "./summonCreatures.ts";
import { refineArt } from "./refine.ts";
import { BITE_FRAMES, SLASH_FRAMES, SMASH_FRAMES, biteStrip, leafCanvas, slashStrip, smashStrip } from "./effects.ts";
import { TORCH_FRAMES, cryptFloorStrip, cryptTallStrip, cryptWallStrip, dustCanvas, lightCanvas, torchStrip } from "./cryptDecor.ts";
import {
  GLINT_FRAMES, PALM_CROWN, PALM_TRUNK, PALM_VARIANTS, desertFloorStrip, desertTallStrip, desertWaterStrip, dryFringeStrip, duneLipStrip,
  duneShadeStrip, duneStrip, dustCloudCanvas, glintStrip, palmCrownSheet, palmShadowCanvas, palmTrunkSheet, sandGrainCanvas, sandStrip,
  pavingStrip, ruinStrip, shoreStrip, waterStrip, wetStrip,
} from "./desertDecor.ts";
import {
  caveDecorStrip, caveFloorStrip, caveGlowCanvas, caveMouthCanvas, caveShadeStrip, caveShaftCanvas, caveTallStrip, hallFloorStrip,
  rockFaceStrip, rockRimStrip, rockTopStrip,
} from "./caveDecor.ts";
import {
  BUBBLE_FRAMES, TREE_CROWN, TREE_TRUNK, TREE_VARIANTS, bubbleStrip, canopyStrip, dragonflyCanvas, grassStrip, leafCanvas as marshLeafCanvas,
  logStrip, marshFloorStrip, marshFringeStrip, marshShadeStrip, marshShoreStrip, marshTallStrip, marshWaterStrip, mudStrip, plankStrip,
  treeCrownSheet, treeShadowCanvas, treeTrunkSheet, waterStrip as marshWaterTiles,
} from "./marshDecor.ts";
import { RIPPLE_FRAMES, fireflyCanvas, mistCanvas, rippleStrip, shadeStrip } from "./ambient.ts";
import {
  COLUMN_SPRITE, COLUMN_VARIANTS, columnSheet, mosaicCanvas, pavingStrip as ruinPavingStrip, ruinFloorStrip, ruinTallStrip, ruinWallCanvas,
  ruinWaterStrip, toSwampTone,
} from "./ruinsDecor.ts";

/**
 * Ponte entre a arte e o Phaser: carrega os PNGs do pack Dungeon Crawl (CC0, ver
 * public/assets/dcss/CREDITS.md) e transforma a arte própria (grades de pixels) em texturas.
 */

const DCSS_PATH = "assets/dcss/";

/** Criaturas invocadas pelo Druida: arte própria e animada (`summonCreatures.ts`). */
export const SUMMON_TEXTURE: Record<SummonKind, string> = {
  wolf: "summon-wolf",
  hornet: "summon-hornet",
  moth: "summon-moth",
  bear: "summon-bear",
  wisp: "summon-wisp",
  treant: "summon-treant",
  skeleton: "summon-skeleton",
  eagle: "summon-eagle",
};

/** Animação de cada invocação, no formato dos monstros animados (textura → clipes). */
export const SUMMON_ANIMS: Record<SummonKind, MonsterAnim> = Object.fromEntries(
  (Object.keys(SUMMON_TEXTURE) as SummonKind[]).map((kind) => {
    const art = SUMMON_ART[kind];
    return [kind, {
      size: art.size, sheet: () => summonSheet(art), portrait: () => summonPortrait(art), outline: SUMMON_OUTLINE,
      fps: art.fps, frames: SUMMON_FRAMES, stride: art.stride,
    }];
  }),
) as Record<SummonKind, MonsterAnim>;

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
    ...monsterTextures().filter((key) => !OWN_MONSTER_ART.includes(key)),
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
  const sheet = heroSheet(classId, outfit);
  const size = sheet.height;
  const texture = scene.textures.addCanvas(key, sheet)!;
  for (let i = 0; i < HERO_DIRS.length * HERO_FRAMES; i++) {
    texture.add(i, 0, i * size, 0, size, size);
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

/**
 * Monstros e invocações com a arte refinada (`refine.ts`): os PNGs do pack são trocados pela versão em dobro de
 * resolução, e os animados (monstros do Pântano e todas as invocações) viram folhas refinadas com um clipe por
 * animação (uma vez por jogo).
 */
export function createCreatureArt(scene: Phaser.Scene) {
  if (protoBeasts && !scene.textures.exists("monster-mimic-disguise")) scene.textures.addCanvas("monster-mimic-disguise", protoBeasts.protoMimicDisguise());
  const packed = monsterTextures().filter((key) => !OWN_MONSTER_ART.includes(key));
  for (const key of packed) {
    const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    if (source.width !== TILE_SIZE) continue;
    const refined = refineArt(source);
    scene.textures.remove(key);
    scene.textures.addCanvas(key, refined);
  }
  for (const [key, anim] of Object.entries(MONSTER_ANIMS)) if (!anim.hd) addAnimatedArt(scene, key, anim);
  warmMonsterArt(scene);
  for (const kind of Object.keys(SUMMON_ANIMS) as SummonKind[]) addAnimatedArt(scene, SUMMON_TEXTURE[kind], SUMMON_ANIMS[kind]);
  for (const [key, draw] of Object.entries(OWN_MONSTER_DRAW)) {
    // A arte nova é desenhada aos poucos (`warmMonsterArt`): o retrato não pode ocupar a chave da folha animada.
    if (MONSTER_ANIMS[key]?.hd) continue;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, refineArt(draw(), { outline: SAND_WORM_OUTLINE }));
  }
}

/** Folha animada: cada quadro é refinado à parte (o contorno não vaza para o vizinho) e vira um quadro da textura. */
/** Folha da arte nova sendo montada: os quadros já desenhados e o próximo. */
const hdBuilds = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; jobs: (() => HTMLCanvasElement)[]; next: number }>();

/** Desenha o próximo quadro de um monstro da arte nova; com a folha completa, vira textura. Devolve se está pronta. */
function hdStep(scene: Phaser.Scene, key: string, anim: MonsterAnim): boolean {
  if (scene.textures.exists(key)) return true;
  let b = hdBuilds.get(key);
  if (!b) {
    const jobs = anim.hd!();
    b = { ...makeCanvas(anim.size * jobs.length, anim.size), jobs, next: 0 };
    hdBuilds.set(key, b);
  }
  b.ctx.drawImage(b.jobs[b.next](), b.next * anim.size, 0);
  if (++b.next < b.jobs.length) return false;
  const texture = scene.textures.addCanvas(key, b.canvas)!;
  for (let i = 0; i < b.jobs.length; i++) texture.add(i, 0, i * anim.size, 0, anim.size, anim.size);
  addClips(scene, key, anim);
  hdBuilds.delete(key);
  return true;
}

/** Garante a folha do monstro antes do sprite (se ainda não ficou pronta aos poucos, termina agora). */
export function ensureMonsterArt(scene: Phaser.Scene, key: string) {
  const anim = MONSTER_ANIMS[key];
  if (anim?.hd) while (!hdStep(scene, key, anim));
}

/**
 * Arte nova: os monstros são desenhados aos poucos, um quadro a cada intervalo, para não travar o menu nem a hunt
 * (todos os da Cripta somam mais de 1 s; o dragão sozinho, meio). Os maiores ficam por último.
 */
function warmMonsterArt(scene: Phaser.Scene) {
  const keys = Object.entries(MONSTER_ANIMS).filter(([, a]) => a.hd).sort(([, a], [, b]) => a.size - b.size).map(([k]) => k);
  const tick = () => {
    const key = keys.find((k) => !scene.textures.exists(k));
    if (!key) return;
    hdStep(scene, key, MONSTER_ANIMS[key]);
    window.setTimeout(tick, 30);
  };
  window.setTimeout(tick, 500);
}

function addAnimatedArt(scene: Phaser.Scene, key: string, anim: MonsterAnim) {
  if (scene.textures.exists(key)) return;
  const sheet = anim.sheet();
  const n = sheet.width / anim.size;
  const big = anim.size * 2;
  const { canvas, ctx } = makeCanvas(big * n, big);
  const frame = makeCanvas(anim.size, anim.size);
  for (let i = 0; i < n; i++) {
    frame.ctx.clearRect(0, 0, anim.size, anim.size);
    frame.ctx.drawImage(sheet, i * anim.size, 0, anim.size, anim.size, 0, 0, anim.size, anim.size);
    ctx.drawImage(refineArt(frame.canvas, { outline: anim.outline }), i * big, 0);
  }
  const texture = scene.textures.addCanvas(key, canvas)!;
  for (let i = 0; i < n; i++) texture.add(i, 0, i * big, 0, big, big);
  addClips(scene, key, anim);
}

/** Uma animação por clipe da folha (parado e andar em laço). */
function addClips(scene: Phaser.Scene, key: string, anim: MonsterAnim) {
  const frames = anim.frames ?? CLIPS;
  for (const clip of CLIP_ORDER) {
    const start = clipStart(clip, frames);
    scene.anims.create({
      key: monsterAnimKey(key, clip),
      frames: Array.from({ length: frames[clip] }, (_, k) => ({ key, frame: start + k })),
      frameRate: anim.fps[clip],
      repeat: clip === "idle" || clip === "walk" ? -1 : 0,
    });
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
  /** Chão da arte nova (o antigo é `FLOOR_TEXTURE`, do pack). */
  floorHd: "crypt-floor-hd",
  bossHd: "crypt-boss-hd",
};

/** Gera as texturas e a animação da tocha da cripta (uma vez por jogo). */
export function createCryptArt(scene: Phaser.Scene) {
  if (protoCrypt) {
    const hd = protoCrypt.CRYPT_TILE;
    addStrips(scene, [
      [CRYPT_DECOR.floorHd, protoCrypt.cryptFloorTiles],
      [CRYPT_DECOR.bossHd, protoCrypt.cryptBossTiles],
      [CRYPT_DECOR.floor, protoCrypt.cryptFloorDecor],
      [CRYPT_DECOR.wall, protoCrypt.cryptWallDecor],
      [CRYPT_DECOR.tall, protoCrypt.cryptTall],
      [CRYPT_DECOR.torch, protoCrypt.cryptTorch],
    ], hd);
  }
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

/** Faixas de quadros 32×32 (ou `size`, na arte nova) viram texturas com um quadro por tile. */
function addStrips(scene: Phaser.Scene, strips: [string, () => HTMLCanvasElement][], size = TILE_SIZE) {
  for (const [key, draw] of strips) {
    if (scene.textures.exists(key)) continue;
    const canvas = draw();
    const texture = scene.textures.addCanvas(key, canvas)!;
    for (let i = 0; i < canvas.width / size; i++) texture.add(i, 0, i * size, 0, size, canvas.height);
  }
}

/** Mar de Areia: tudo em arte própria (`desertDecor.ts`), gerado na primeira hunt no deserto. */
export const DESERT_TEXTURE = {
  sand: "desert-sand",
  wet: "desert-wet",
  water: "desert-water",
  dune: "desert-dune",
  shore: "desert-shore",
  fringe: "desert-fringe",
  lip: "desert-dune-lip",
  shade: "desert-shade",
  floor: "desert-decor-floor",
  waterDecor: "desert-decor-water",
  tall: "desert-decor-tall",
  trunk: "desert-palm-trunk",
  crown: "desert-palm-crown",
  palmShadow: "desert-palm-shadow",
  glint: "desert-glint",
  grain: "desert-grain",
  dust: "desert-dust",
  ruins: "desert-ruins",
  paving: "desert-paving",
  // Caverna (`caveDecor.ts`)
  caveFloor: "cave-floor",
  hall: "cave-hall",
  rockTop: "cave-rock-top",
  rockFace: "cave-rock-face",
  rockRim: "cave-rock-rim",
  caveShade: "cave-shade",
  caveDecor: "cave-decor-floor",
  caveTall: "cave-decor-tall",
  caveGlow: "cave-glow",
  caveShaft: "cave-shaft",
  caveMouth: "cave-mouth",
};

/** Gera as texturas do deserto (uma vez por jogo): faixas 32×32, folhas dos coqueiros e o brilho na água. */
export function createDesertArt(scene: Phaser.Scene) {
  addStrips(scene, [
    [DESERT_TEXTURE.sand, sandStrip],
    [DESERT_TEXTURE.wet, wetStrip],
    [DESERT_TEXTURE.water, waterStrip],
    [DESERT_TEXTURE.dune, duneStrip],
    [DESERT_TEXTURE.shore, shoreStrip],
    [DESERT_TEXTURE.fringe, dryFringeStrip],
    [DESERT_TEXTURE.lip, duneLipStrip],
    [DESERT_TEXTURE.shade, duneShadeStrip],
    [DESERT_TEXTURE.floor, desertFloorStrip],
    [DESERT_TEXTURE.waterDecor, desertWaterStrip],
    [DESERT_TEXTURE.tall, desertTallStrip],
    [DESERT_TEXTURE.glint, glintStrip],
    [DESERT_TEXTURE.caveFloor, caveFloorStrip],
    [DESERT_TEXTURE.hall, hallFloorStrip],
    [DESERT_TEXTURE.rockTop, rockTopStrip],
    [DESERT_TEXTURE.rockFace, rockFaceStrip],
    [DESERT_TEXTURE.rockRim, rockRimStrip],
    [DESERT_TEXTURE.caveShade, caveShadeStrip],
    [DESERT_TEXTURE.caveDecor, caveDecorStrip],
    [DESERT_TEXTURE.caveTall, caveTallStrip],
    [DESERT_TEXTURE.ruins, ruinStrip],
    [DESERT_TEXTURE.paving, pavingStrip],
  ]);
  for (const [key, draw] of [
    [DESERT_TEXTURE.caveGlow, caveGlowCanvas], [DESERT_TEXTURE.caveShaft, caveShaftCanvas], [DESERT_TEXTURE.caveMouth, caveMouthCanvas],
  ] as const) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  }
  for (const [key, draw, size] of [[DESERT_TEXTURE.trunk, palmTrunkSheet, PALM_TRUNK], [DESERT_TEXTURE.crown, palmCrownSheet, PALM_CROWN]] as const) {
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.addCanvas(key, draw())!;
    for (let i = 0; i < PALM_VARIANTS; i++) texture.add(i, 0, i * size.w, 0, size.w, size.h);
  }
  if (!scene.textures.exists(DESERT_TEXTURE.palmShadow)) scene.textures.addCanvas(DESERT_TEXTURE.palmShadow, palmShadowCanvas());
  if (!scene.textures.exists(DESERT_TEXTURE.grain)) scene.textures.addCanvas(DESERT_TEXTURE.grain, sandGrainCanvas());
  if (!scene.textures.exists(DESERT_TEXTURE.dust)) scene.textures.addCanvas(DESERT_TEXTURE.dust, dustCloudCanvas());
  if (!scene.anims.exists(DESERT_TEXTURE.glint)) {
    scene.anims.create({
      key: DESERT_TEXTURE.glint,
      frames: Array.from({ length: GLINT_FRAMES }, (_, frame) => ({ key: DESERT_TEXTURE.glint, frame })),
      frameRate: 8,
      hideOnComplete: true,
    });
  }
}

/** Pântano do Kosaradius: tudo em arte própria (`marshDecor.ts`), gerado na primeira hunt no Pântano do Kosaradius. */
export const MARSH_TEXTURE = {
  grass: "marsh-grass",
  mud: "marsh-mud",
  water: "marsh-water",
  planks: "marsh-planks",
  canopy: "marsh-canopy",
  shore: "marsh-shore",
  fringe: "marsh-fringe",
  shade: "marsh-shade",
  floor: "marsh-decor-floor",
  waterDecor: "marsh-decor-water",
  tall: "marsh-decor-tall",
  logs: "marsh-logs",
  trunk: "marsh-tree-trunk",
  crown: "marsh-tree-crown",
  treeShadow: "marsh-tree-shadow",
  ripple: "marsh-ripple",
  bubble: "marsh-bubble",
  firefly: "marsh-firefly",
  mist: "marsh-mist",
  leaf: "marsh-leaf",
  dragonfly: "marsh-dragonfly",
};
/** Texturas que os dois pântanos (floresta alagada) usam, cada um com as suas chaves (`wetlandMap.ts`). */
export type WetlandTexture = typeof MARSH_TEXTURE;

/**
 * Pântano das Ruínas: a natureza do Pântano do Kosaradius na paleta da baía (`swampTone`) e as ruínas em arte própria
 * (`ruinsDecor.ts`), geradas na primeira hunt no Pântano das Ruínas.
 */
export const SWAMP_TEXTURE = {
  ...(Object.fromEntries(Object.entries(MARSH_TEXTURE).map(([k, v]) => [k, v.replace("marsh-", "swamp-")])) as WetlandTexture),
  paving: "swamp-paving",
  ruinFloor: "swamp-ruin-floor",
  ruinTall: "swamp-ruin-tall",
  ruinWater: "swamp-ruin-water",
  columns: "swamp-columns",
  mosaic: "swamp-mosaic",
};

/**
 * Gera as texturas de um pântano (uma vez por jogo): faixas 32×32, as árvores, as bolhas e as marolas. `tone`
 * repinta tudo na paleta do mapa (o Pântano das Ruínas usa os desenhos do Kosaradius em outra paleta).
 */
function createWetlandArt(scene: Phaser.Scene, tex: WetlandTexture, tone: (c: HTMLCanvasElement, water: boolean) => HTMLCanvasElement = (c) => c) {
  const wet = [tex.water, tex.shore, tex.waterDecor, tex.planks, tex.ripple];
  const toned = (key: string, draw: () => HTMLCanvasElement) => () => tone(draw(), wet.includes(key));
  addStrips(scene, ([
    [tex.grass, grassStrip],
    [tex.mud, mudStrip],
    [tex.water, marshWaterTiles],
    [tex.planks, plankStrip],
    [tex.canopy, canopyStrip],
    [tex.shore, marshShoreStrip],
    [tex.fringe, marshFringeStrip],
    [tex.shade, marshShadeStrip],
    [tex.floor, marshFloorStrip],
    [tex.waterDecor, marshWaterStrip],
    [tex.tall, marshTallStrip],
    [tex.logs, logStrip],
    [tex.ripple, rippleStrip],
  ] as [string, () => HTMLCanvasElement][]).map(([key, draw]) => [key, toned(key, draw)]));
  for (const [key, draw, size] of [[tex.trunk, treeTrunkSheet, TREE_TRUNK], [tex.crown, treeCrownSheet, TREE_CROWN]] as const) {
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.addCanvas(key, tone(draw(), false))!;
    for (let i = 0; i < TREE_VARIANTS; i++) texture.add(i, 0, i * size.w, 0, size.w, size.h);
  }
  if (!scene.textures.exists(tex.bubble)) {
    const texture = scene.textures.addCanvas(tex.bubble, bubbleStrip())!;
    for (let i = 0; i < BUBBLE_FRAMES; i++) texture.add(i, 0, i * 16, 0, 16, 16);
  }
  for (const [key, draw] of [
    [tex.treeShadow, treeShadowCanvas], [tex.firefly, fireflyCanvas], [tex.mist, mistCanvas],
    [tex.leaf, () => tone(marshLeafCanvas(), false)], [tex.dragonfly, dragonflyCanvas],
  ] as const) {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  }
  for (const [key, frames, frameRate] of [[tex.ripple, RIPPLE_FRAMES, 6], [tex.bubble, BUBBLE_FRAMES, 7]] as const) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({ key, frames: Array.from({ length: frames }, (_, frame) => ({ key, frame })), frameRate, hideOnComplete: true });
  }
}

export function createMarshArt(scene: Phaser.Scene) {
  createWetlandArt(scene, MARSH_TEXTURE);
}

export function createSwampArt(scene: Phaser.Scene) {
  createWetlandArt(scene, SWAMP_TEXTURE, (c, water) => toSwampTone(c, water));
  addStrips(scene, [
    [SWAMP_TEXTURE.paving, ruinPavingStrip],
    [SWAMP_TEXTURE.ruinFloor, ruinFloorStrip],
    [SWAMP_TEXTURE.ruinTall, ruinTallStrip],
    [SWAMP_TEXTURE.ruinWater, ruinWaterStrip],
  ]);
  if (!scene.textures.exists(SWAMP_TEXTURE.columns)) {
    const texture = scene.textures.addCanvas(SWAMP_TEXTURE.columns, columnSheet())!;
    for (let i = 0; i < COLUMN_VARIANTS; i++) texture.add(i, 0, i * COLUMN_SPRITE.w, 0, COLUMN_SPRITE.w, COLUMN_SPRITE.h);
  }
  if (!scene.textures.exists(SWAMP_TEXTURE.mosaic)) scene.textures.addCanvas(SWAMP_TEXTURE.mosaic, mosaicCanvas());
}

/** Trecho de muro das ruínas do pântano (`ruinWallCanvas`), criado na primeira vez que é pedido. */
export function swampWallTexture(scene: Phaser.Scene, links: number, height: number, variant: number) {
  return lazyCanvas(scene, `swamp-wall-${links}-${height}-${variant}`, () => ruinWallCanvas(links, height, variant));
}

/** Textura de tampa de parede, criada na primeira vez que é pedida. */
export function wallCapTexture(scene: Phaser.Scene, variant: number, rim: number) {
  if (protoCrypt) return lazyCanvas(scene, `wall-cap-hd-${variant}-${rim}`, () => protoCrypt!.cryptWallCap(variant, rim));
  return lazyCanvas(scene, `wall-cap-${variant}-${rim}`, () => wallCap(variant, rim));
}

export function wallFaceTexture(scene: Phaser.Scene, variant: number) {
  if (protoCrypt) return lazyCanvas(scene, `wall-face-hd-${variant}`, () => protoCrypt!.cryptWallFace(variant));
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
export function floorVariants(scene: Phaser.Scene, key: string, size = TILE_SIZE) {
  return Math.floor(scene.textures.get(key).getSourceImage().width / size);
}
