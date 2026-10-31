import type * as Phaser from "phaser";
import { CLASS_IDS, MAPS, TILE_SIZE, mapMonsters, type ClassId, type MapId, type SummonKind } from "@kusa/shared";
import { BESTIARY_ART, EXTRA_CLIPS, MONSTER_ANIMS, OWN_MONSTER_ART, OWN_MONSTER_DRAW, monsterAnimKey, monsterTextures, type MonsterAnim } from "./bestiary.ts";
import { CLIP_ORDER, CLIPS, clipStart } from "./rig.ts";
import { makeCanvas } from "./pixels.ts";
import { SAND_WORM_OUTLINE } from "./sandWorm.ts";
import { HERO_DIRS, HERO_FRAMES, heroSheet, type HeroDir } from "./heroes.ts";
import { itemIcon } from "./items.ts";
import { NO_OUTFIT, outfitKey, type Outfit } from "./outfit.ts";
import { cryptArt, protoBeasts } from "./newArt.ts";
import { SUMMON_ART, SUMMON_FRAMES, SUMMON_OUTLINE, summonPortrait, summonSheet } from "./summonCreatures.ts";
import { refineArt } from "./refine.ts";
import { BITE_FRAMES, SLASH_FRAMES, SMASH_FRAMES, biteStrip, leafCanvas, slashStrip, smashStrip } from "./effects.ts";

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

/** Baú, portais e sangue: desenhados por código em 128 px (`art/propsArt.ts`, gerados em `art/props.ts`). */
export const CHEST_TEXTURE = { locked: "chest-locked", unlocked: "chest-unlocked", open: "chest-open" };
export const PORTAL_TEXTURE = { escape: "portal-escape", boss: "portal-boss" };
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
/** Manchas de sangue no chão (faixas de variações de 128 px, `art/propsArt.ts`). */
export const BLOOD_TEXTURE = { splat: "blood-splat", puddle: "blood-puddle" };

export function preloadArt(scene: Phaser.Scene) {
  scene.load.setPath(DCSS_PATH);
  for (const key of [
    ...monsterTextures().filter((key) => !OWN_MONSTER_ART.includes(key)),
    FX_TEXTURE.arrow,
    FX_TEXTURE.fireball,
    FX_TEXTURE.energyBolt,
    FX_TEXTURE.energyHit,
    FX_TEXTURE.natureHit,
  ]) {
    scene.load.image(key, `${key}.png`);
  }
  for (const key of [FX_ANIM.fireBurst]) {
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
  // A arte nova dos monstros não é feita aqui: só a do mapa da hunt, quando ela começa (`warmMapMonsters`).
  for (const [key, anim] of Object.entries(MONSTER_ANIMS)) if (!anim.hd) addAnimatedArt(scene, key, anim);
  for (const kind of Object.keys(SUMMON_ANIMS) as SummonKind[]) addAnimatedArt(scene, SUMMON_TEXTURE[kind], SUMMON_ANIMS[kind]);
  for (const [key, draw] of Object.entries(OWN_MONSTER_DRAW)) {
    // A arte nova é desenhada na hunt (`warmMapMonsters`): o retrato não pode ocupar a chave da folha animada.
    if (MONSTER_ANIMS[key]?.hd) continue;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, refineArt(draw(), { outline: SAND_WORM_OUTLINE }));
  }
}

/** Folha animada: cada quadro é refinado à parte (o contorno não vaza para o vizinho) e vira um quadro da textura. */
/**
 * Folha da arte nova sendo montada: as figuras distintas (`jobs`, cada função uma vez), a figura de cada quadro do clipe
 * (`slot`) e a próxima a desenhar. Quadros repetidos apontam para a mesma figura: a memória da textura é a das figuras,
 * não a dos quadros (no celular, folha grande demais fecha o jogo).
 */
const hdBuilds = new Map<string, {
  canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; jobs: (() => HTMLCanvasElement)[]; slot: number[]; next: number;
}>();

/** Quadros por linha da folha da arte nova (no máximo 4096 px de largura). */
const hdColumns = (size: number, frames: number) => Math.max(1, Math.min(frames, Math.floor(4096 / size)));

/** Desenha a próxima figura de um monstro da arte nova; com a folha completa, vira textura. Devolve se está pronta. */
function hdStep(scene: Phaser.Scene, key: string, anim: MonsterAnim): boolean {
  if (scene.textures.exists(key)) return true;
  let b = hdBuilds.get(key);
  if (!b) {
    const frames = anim.hd!();
    const jobs = [...new Set(frames)];
    const slot = frames.map((job) => jobs.indexOf(job));
    const cols = hdColumns(anim.size, jobs.length);
    b = { ...makeCanvas(anim.size * cols, anim.size * Math.ceil(jobs.length / cols)), jobs, slot, next: 0 };
    hdBuilds.set(key, b);
  }
  // Em grade: textura mais larga que 4096 px fica preta no celular.
  const cols = hdColumns(anim.size, b.jobs.length);
  const cell = (i: number) => [(i % cols) * anim.size, Math.floor(i / cols) * anim.size] as const;
  b.ctx.drawImage(b.jobs[b.next](), ...cell(b.next));
  if (++b.next < b.jobs.length) return false;
  const texture = scene.textures.addCanvas(key, b.canvas)!;
  b.slot.forEach((slot, i) => texture.add(i, 0, ...cell(slot), anim.size, anim.size));
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
 * Arte nova: os monstros do mapa da hunt são desenhados aos poucos, uma figura a cada intervalo, para não travar a
 * hunt (os maiores ficam por último; o que aparecer antes de ficar pronto termina na hora, `ensureMonsterArt`). Só os
 * do mapa: a folha de cada monstro fica na memória do celular, e a de todos os mapas juntos passava do que o celular
 * aguenta (o jogo fechava sozinho). Folha pronta fica para as próximas hunts.
 */
export function warmMapMonsters(scene: Phaser.Scene, mapId: MapId) {
  const keys = [...new Set(mapMonsters(MAPS[mapId]).flatMap((kind) => {
    const art = BESTIARY_ART[kind];
    return [art.texture, ...Object.values(art.variants ?? {})];
  }))].filter((k) => MONSTER_ANIMS[k]?.hd).sort((a, b) => MONSTER_ANIMS[a].size - MONSTER_ANIMS[b].size);
  const tick = () => {
    const key = keys.find((k) => !scene.textures.exists(k));
    if (!key) return;
    hdStep(scene, key, MONSTER_ANIMS[key]);
    window.setTimeout(tick, 30);
  };
  window.setTimeout(tick, 200);
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
  // Clipes a mais (arte nova): depois dos de sempre, na ordem de `EXTRA_CLIPS`; a morte no ritmo do golpe e não repete.
  let start = CLIP_ORDER.reduce((n, c) => n + frames[c], 0);
  for (const clip of EXTRA_CLIPS) {
    const n = anim.extra?.[clip];
    if (!n) continue;
    const base = clip === "death" ? "attack" : clip.startsWith("walk") ? "walk" : "idle";
    scene.anims.create({
      key: monsterAnimKey(key, clip),
      frames: Array.from({ length: n }, (_, k) => ({ key, frame: start + k })),
      frameRate: clip === "death" ? anim.fps.attack * 0.7 : anim.fps[base],
      repeat: clip === "death" ? 0 : -1,
    });
    start += n;
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

/** Detalhes da cripta (`cryptArt.ts`), gerados na primeira hunt na cripta. */
export const CRYPT_DECOR = {
  floor: "crypt-decor-floor",
  wall: "crypt-decor-wall",
  tall: "crypt-decor-tall",
  torch: "crypt-torch",
  shade: "crypt-shade",
  light: "crypt-light",
  dust: "crypt-dust",
  floorHd: "crypt-floor-hd",
  bossHd: "crypt-boss-hd",
};

/** Gera as texturas e a animação da tocha da cripta (uma vez por jogo), tudo em 128 px por tile (`cryptArt.ts`). */
export function createCryptArt(scene: Phaser.Scene) {
  addStrips(scene, [
    [CRYPT_DECOR.floorHd, cryptArt.cryptFloorTiles],
    [CRYPT_DECOR.bossHd, cryptArt.cryptBossTiles],
    [CRYPT_DECOR.floor, cryptArt.cryptFloorDecor],
    [CRYPT_DECOR.wall, cryptArt.cryptWallDecor],
    [CRYPT_DECOR.tall, cryptArt.cryptTall],
    [CRYPT_DECOR.torch, cryptArt.cryptTorch],
    [CRYPT_DECOR.shade, cryptArt.cryptShade],
  ], cryptArt.CRYPT_TILE);
  if (!scene.textures.exists(CRYPT_DECOR.light)) scene.textures.addCanvas(CRYPT_DECOR.light, cryptArt.cryptLight());
  if (!scene.textures.exists(CRYPT_DECOR.dust)) scene.textures.addCanvas(CRYPT_DECOR.dust, cryptArt.dustCanvas());
  if (!scene.anims.exists(CRYPT_DECOR.torch)) {
    scene.anims.create({
      key: CRYPT_DECOR.torch,
      frames: Array.from({ length: cryptArt.TORCH_FRAMES }, (_, frame) => ({ key: CRYPT_DECOR.torch, frame })),
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

/** Textura de tampa de parede, criada na primeira vez que é pedida. */
export function wallCapTexture(scene: Phaser.Scene, variant: number, rim: number) {
  return lazyCanvas(scene, `wall-cap-hd-${variant}-${rim}`, () => cryptArt.cryptWallCap(variant, rim));
}

export function wallFaceTexture(scene: Phaser.Scene, variant: number) {
  return lazyCanvas(scene, `wall-face-hd-${variant}`, () => cryptArt.cryptWallFace(variant));
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
