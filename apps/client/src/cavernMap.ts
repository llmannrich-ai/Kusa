import * as Phaser from "phaser";
import { TILE_SIZE, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { HD, TileAtlas, toCanvas } from "./art/paint.ts";
import { TALL, tallDecor, type CaveVariant } from "./art/caveArt.ts";
import { CAVE_LAYERS, TALL_DECOR, planCave, type CaveLight } from "./cavePlan.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";

/** Fundo além da rocha: quase preto, puxado para o azul do mar lá em cima. */
export const CAVERN_VOID = 0x05080d;

/** Arte de 128 px por tile, desenhada em ¼ (`docs/CENARIOS_PLANO.md`). */
const ZOOM = HD / TILE_SIZE;
const LIGHT = "cave-light";
/** Tamanho do brilho antigo (px de jogo) a que a escala das luzes se refere. */
const LIGHT_BASE = 96;
/** Gotas pingando do teto em volta da câmera. */
const DRIPS = 6;

/**
 * Desenha uma caverna no padrão novo (o plano em `cavePlan.ts`, a arte em `art/caveArt.ts`): tilemap de 128 px com a
 * rocha (massa escura e o paredão onde o chão fica ao sul), o chão de pedra, as poças, as sombras ao pé da rocha e os
 * enfeites rasteiros; estalagmites e cristais em sprites ordenados pela linha de baixo; e as luzes (cristais, covis),
 * que tremulam devagar. Serve à Caverna da Travessia e ao subterrâneo do Mar de Areia (`area`). Devolve as luzes.
 */
export function drawCaveHd(scene: Phaser.Scene, d: Dungeon, variant: CaveVariant, floorDepth: number, culler: ChunkCuller, area?: Rect) {
  const { atlas, layers, standing, lights } = planCave(d, variant, area);
  const key = `cave-atlas-${variant}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, atlas.build());
  const map = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: HD, tileHeight: HD });
  const set = map.addTilesetImage(key, key, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)!;
  const shade = variant === "cavern" ? ([0.86, 0.92, 1] as const) : ([1, 0.92, 0.82] as const);
  for (const name of CAVE_LAYERS) {
    const l = map.createBlankLayer(`${key}-${name}`, set)!.setDepth(floorDepth).setScale(1 / ZOOM);
    const data = layers[name];
    for (let y = 0; y < d.height; y++)
      for (let x = 0; x < d.width; x++) {
        const f = data[y * d.width + x];
        if (f < 0) continue;
        const tile = l.putTileAt(f, x, y);
        if (name === "chao") tile.tint = patchTint(x, y, 0.72, shade, 5, 164);
      }
  }

  // Enfeites de pé: uma folha com os quadros que a caverna usa.
  const sheetKey = `cave-tall-${variant}`;
  const frames = new Map<string, { i: number; kind: (typeof TALL_DECOR)[number]; v: number }>();
  for (const s of standing) if (!frames.has(`${s.kind}${s.v}`)) frames.set(`${s.kind}${s.v}`, { i: frames.size, kind: s.kind, v: s.v });
  if (scene.textures.exists(sheetKey)) scene.textures.remove(sheetKey);
  const { canvas, ctx } = makeCanvas(TALL.w * Math.max(1, frames.size), TALL.h);
  for (const f of frames.values()) ctx.drawImage(toCanvas(tallDecor(variant, f.kind, f.v), TALL.w, TALL.h), f.i * TALL.w, 0);
  const texture = scene.textures.addCanvas(sheetKey, canvas)!;
  for (const f of frames.values()) texture.add(f.i, 0, f.i * TALL.w, 0, TALL.w, TALL.h);
  for (const s of standing) {
    culler.add(scene.add.image(s.x * TILE_SIZE + TILE_SIZE / 2, (s.y + 1) * TILE_SIZE, sheetKey, frames.get(`${s.kind}${s.v}`)!.i)
      .setOrigin(0.5, 1).setScale(s.scale / ZOOM).setFlipX(s.flip).setDepth((s.y + 1) * TILE_SIZE - 0.25), s.x, s.y);
  }
  return lights.map((l) => addLight(scene, culler, l, floorDepth));
}

/** Brilho que tremula: mancha clara em 3 degraus de transparência (sem degradê), somada à cena. */
export function addLight(scene: Phaser.Scene, culler: ChunkCuller, l: CaveLight, floorDepth: number) {
  if (!scene.textures.exists(LIGHT)) {
    const size = 128;
    const { canvas, ctx } = makeCanvas(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dd = Math.hypot(x + 0.5 - size / 2, (y + 0.5 - size / 2) * 1.3) / (size / 2);
        if (dd >= 1) continue;
        ctx.fillStyle = `rgba(255, 255, 255, ${dd < 0.35 ? 0.42 : dd < 0.65 ? 0.24 : 0.1})`;
        ctx.fillRect(x, y, 1, 1);
      }
    scene.textures.addCanvas(LIGHT, canvas);
  }
  const img = scene.add.image(l.x, l.y, LIGHT).setScale((l.scale * LIGHT_BASE) / 128).setAlpha(l.alpha).setTint(l.tint)
    .setBlendMode(Phaser.BlendModes.ADD).setDepth(floorDepth + 0.6).setData("alpha", l.alpha).setData("phase", hash(l.x, l.y, 190) * 6);
  return culler.add(img, Math.floor(l.x / TILE_SIZE), Math.floor(l.y / TILE_SIZE));
}

/** Tremulação das luzes de uma caverna (chamar a cada quadro). */
export function flickerLights(lights: Phaser.GameObjects.Image[], time: number) {
  for (const l of lights) if (l.visible) l.setAlpha(l.getData("alpha") * (0.85 + 0.15 * Math.sin(time / 700 + l.getData("phase"))));
}

/**
 * Caverna da Travessia no padrão novo de 128 px por tile (`docs/CENARIOS_PLANO.md`, fase 2): rocha fria e molhada com
 * paredão onde o chão fica ao sul, chão de pedra, poças de água escura, estalagmites e cristais azuis que brilham nos
 * túneis, e os dois covis (o do Basilisco com ossos e pele trocada, o do Observador com brilho roxo). Gotas pingam do
 * teto perto da câmera. Tudo vem de `hash(x, y)`: não muda a jogabilidade.
 */
export function drawCavern(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const culler = new ChunkCuller();
  const lights = drawCaveHd(scene, d, "cavern", floorDepth, culler);
  // Chegada: a luz fraca que desce do poço por onde a equipe entrou.
  lights.push(addLight(scene, culler, { x: d.portal.x * TILE_SIZE + 16, y: d.portal.y * TILE_SIZE, scale: 2.4, alpha: 0.4, tint: 0xcfe8ff }, floorDepth));
  const cam = scene.cameras.main;
  // Gotas: riscos finos (2×6 px de arte) caindo do alto da tela e sumindo.
  const drips = Array.from({ length: DRIPS }, () =>
    scene.add.rectangle(0, 0, 0.5, 1.5, 0xbfe6ff, 0.7).setDepth(uiDepth - 5).setVisible(false).setData("until", 0));
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      flickerLights(lights, time);
      for (const drop of drips) {
        if (time > drop.getData("until")) {
          drop.setPosition(v.x + Math.random() * v.width, v.y + Math.random() * v.height * 0.6).setVisible(true).setAlpha(0.7);
          drop.setData("until", time + 500 + Math.random() * 1400);
        }
        drop.y += 2.2;
        drop.alpha = Math.max(0, drop.alpha - 0.012);
      }
    },
  };
}
