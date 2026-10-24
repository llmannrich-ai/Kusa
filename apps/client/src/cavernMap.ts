import * as Phaser from "phaser";
import { TILE_SIZE, Tile, lairsOf, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { CAVE_FLOOR_DECOR, CAVE_FLOOR_VARIANTS, CAVE_TALL, ROCK_FACE_VARIANTS, ROCK_TOP_VARIANTS } from "./art/caveDecor.ts";
import { DESERT_TEXTURE, createDesertArt } from "./art/textures.ts";
import { caveTilesets, forEachUnder, pillar } from "./caveMap.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";

/** Fundo além da rocha: quase preto, puxado para o azul do mar lá em cima. */
export const CAVERN_VOID = 0x05080d;

/** Tom frio da Caverna da Travessia por cima da arte da caverna do deserto (rocha molhada, debaixo do mar). */
const COLD = 0x9cb0c8;
const ROCK_TINT = 0x7a8ca4;
/** Água parada das poças: escura e esverdeada. */
const POOL_TINT = 0x3f6a78;
/** Cristais e luzes: azul-esverdeado (os do deserto são âmbar). */
const CRYSTAL_TINT = 0x8fe3ff;
const LAIR_TINT = [0xb7e39a, 0xd7a6ff];
const SHADE = [0.86, 0.92, 1] as const;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

/** Gotas pingando do teto em volta da câmera. */
const DRIPS = 6;

/**
 * Desenha a Caverna da Travessia com a arte da caverna do deserto em tons frios: rocha molhada com paredão onde o
 * chão fica ao sul, chão de pedra com manchas, poças de água escura, estalagmites e cristais azuis que brilham nos
 * túneis, e os dois covis (o do Basilisco com ossos e pele trocada, o do Observador com brilho roxo). Gotas pingam do
 * teto perto da câmera. Tudo vem de `hash(x, y)`: não muda a jogabilidade.
 */
export function drawCavern(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  createDesertArt(scene);
  const map = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  let firstGid = 0;
  const tileset = (key: string, count: number) => {
    const set = map.addTilesetImage(key, key, TILE_SIZE, TILE_SIZE, 0, 0, firstGid)!;
    const gid = firstGid;
    firstGid += count;
    return { set, gid };
  };
  const sets = caveTilesets(scene, d, tileset);
  const water = tileset(DESERT_TEXTURE.water, 3);
  const all = [sets.floor, sets.hall, sets.rockTop, sets.rockFace, sets.decor, sets.edges, water].map((t) => t.set);
  const ground = map.createBlankLayer("chao", all)!.setDepth(floorDepth);
  const edges = map.createBlankLayer("bordas", all)!.setDepth(floorDepth);
  const decorLayer = map.createBlankLayer("enfeites", all)!.setDepth(floorDepth);

  const at = (x: number, y: number) => tileAt(d, x, y);
  const walk = (x: number, y: number) => at(x, y) !== Tile.Wall || pillar(d, x, y);
  const lairs = lairsOf(d);
  const lairOf = (x: number, y: number) => lairs.findIndex((l) => inRect(l.room, x, y));
  const portals = new Set(lairs.map((l) => l.portal.y * d.width + l.portal.x));
  const culler = new ChunkCuller();
  const lights: Phaser.GameObjects.Image[] = [];
  const light = (px: number, py: number, scale: number, alpha: number, tint = CRYSTAL_TINT) => {
    const img = scene.add.image(px, py, DESERT_TEXTURE.caveGlow).setScale(scale).setAlpha(alpha).setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(floorDepth + 0.6).setData("alpha", alpha).setData("phase", hash(px, py, 190) * 6);
    lights.push(culler.add(img, Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE)));
  };
  const tall = (frame: number, x: number, y: number, tint = COLD) => {
    const img = culler.add(scene.add.image(x * TILE_SIZE, y * TILE_SIZE, DESERT_TEXTURE.caveTall, frame)
      .setOrigin(0).setTint(tint).setDepth((y + 1) * TILE_SIZE - 0.25), x, y);
    if (hash(x, y, 191) < 0.5) img.setFlipX(true);
  };

  forEachUnder(d, (x, y) => {
    const i = y * d.width + x;
    const mask = sets.edgeMasks[i];
    if (mask) edges.putTileAt(sets.edges.gid + sets.edgeFrames.get(mask)!, x, y).tint = COLD;
    const t = at(x, y);

    if (t === Tile.Wall && !pillar(d, x, y)) {
      const frame = walk(x, y + 1)
        ? sets.rockFace.gid + Math.floor(hash(x, y, 192) * ROCK_FACE_VARIANTS)
        : sets.rockTop.gid + Math.floor(hash(x, y, 193) * ROCK_TOP_VARIANTS);
      ground.putTileAt(frame, x, y).tint = ROCK_TINT;
      return;
    }
    if (t === Tile.Water) {
      const deep = DIRS.every(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
      ground.putTileAt(water.gid + (deep ? 2 : hash(x, y, 194) < 0.3 ? 1 : 0), x, y).tint = POOL_TINT;
      return;
    }

    const v = hash(x, y, 195);
    const tile = ground.putTileAt(sets.floor.gid + (v < 0.5 ? 0 : 1 + Math.floor((v - 0.5) * 2 * (CAVE_FLOOR_VARIANTS - 1))), x, y);
    tile.tint = multiply(patchTint(x, y, 0.7, SHADE, 5, 164), COLD);

    if (pillar(d, x, y)) { tall(CAVE_TALL.stalagmiteB, x, y); return; }
    if (t === Tile.Portal || portals.has(i)) return;

    const decor = (frame: number) => { decorLayer.putTileAt(sets.decor.gid + frame, x, y).tint = COLD; };
    const n = hash(x, y, 196);
    const m = hash(x, y, 197);
    const byRock = DIRS.some(([dx, dy]) => !walk(x + dx, y + dy));
    const lair = lairOf(x, y);
    if (lair === 0) {
      // Covil do Basilisco: pele trocada, sulcos das patas e ossos de quem virou pedra.
      if (n < 0.08) decor(CAVE_FLOOR_DECOR.skin);
      else if (n < 0.16) decor(CAVE_FLOOR_DECOR.bones);
      else if (n < 0.2) decor(CAVE_FLOOR_DECOR.furrow);
    } else if (lair === 1) {
      // Covil do Observador: chão limpo e liso (ele flutua), com ossos espalhados.
      if (n < 0.08) decor(CAVE_FLOOR_DECOR.bones);
      else if (n < 0.12) decor(CAVE_FLOOR_DECOR.pebbles);
    } else if (byRock && n < 0.15) {
      if (m < 0.35) tall(m < 0.17 ? CAVE_TALL.stalagmiteA : CAVE_TALL.stalagmiteB, x, y);
      else if (m < 0.55) {
        tall(CAVE_TALL.crystals, x, y, CRYSTAL_TINT);
        light(x * TILE_SIZE + 16, y * TILE_SIZE + 24, 1.1, 0.5);
      } else decor(CAVE_FLOOR_DECOR.pebbles);
    } else if (n < 0.05) {
      decor(m < 0.5 ? CAVE_FLOOR_DECOR.pebbles : CAVE_FLOOR_DECOR.bones);
    }
  });

  // Covis: um brilho fraco na cor do dono, para o boss não sumir no escuro, e cristais no fundo.
  lairs.forEach((l, k) => {
    light((l.room.x + l.room.w / 2) * TILE_SIZE, (l.room.y + l.room.h / 2) * TILE_SIZE, 3.4, 0.32, LAIR_TINT[k] ?? CRYSTAL_TINT);
  });
  // Chegada: a luz fraca que desce do poço por onde a equipe entrou.
  light(d.portal.x * TILE_SIZE + 16, d.portal.y * TILE_SIZE, 2.4, 0.4, 0xcfe8ff);

  return createAmbience(scene, uiDepth, culler, lights);
}

function createAmbience(scene: Phaser.Scene, uiDepth: number, culler: ChunkCuller, lights: Phaser.GameObjects.Image[]): MapAmbience {
  const cam = scene.cameras.main;
  const drips = Array.from({ length: DRIPS }, () =>
    scene.add.rectangle(0, 0, 2, 5, 0xbfe6ff, 0.7).setDepth(uiDepth - 5).setVisible(false).setData("until", 0));
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      for (const l of lights) {
        if (l.visible) l.setAlpha(l.getData("alpha") * (0.85 + 0.15 * Math.sin(time / 700 + l.getData("phase"))));
      }
      // Gotas: caem do alto da tela por um instante e somem; recomeçam em outro lugar.
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

/** Multiplica duas cores (canal a canal). */
function multiply(a: number, b: number) {
  const c = (shift: number) => Math.round((((a >> shift) & 255) * ((b >> shift) & 255)) / 255) << shift;
  return c(16) | c(8) | c(0);
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
