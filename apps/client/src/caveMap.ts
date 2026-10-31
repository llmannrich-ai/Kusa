import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { CAVE_FLOOR_DECOR, CAVE_FLOOR_VARIANTS, CAVE_TALL, ROCK_FACE_VARIANTS, ROCK_TOP_VARIANTS } from "./art/caveDecor.ts";
import { DESERT_TEXTURE } from "./art/textures.ts";
import { patchTint, type ChunkCuller } from "./mapShared.ts";
import { pillar } from "./cavePlan.ts";

/** Fundo do subterrâneo (além da rocha): quase preto, puxado para o marrom. */
export const CAVE_VOID = 0x0d0806;

type Tileset = { set: Phaser.Tilemaps.Tileset; gid: number };
type AddTileset = (key: string, count: number) => Tileset;

/** Bits das bordas da rocha: beira (N, L, O) no tile de rocha e sombra no chão ao sul e a leste dela. */
export const RIM = [1, 2, 0, 8]; // N, L, (S é o paredão, outro ladrilho), O
const SHADE_N = 16;
const SHADE_W = 32;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const EDGE_TEXTURE = "cave-edges";

/** Sombra quente das manchas do chão da caverna. */
const CAVE_SHADE = [1, 0.8, 0.62] as const;

export interface CaveTilesets {
  floor: Tileset;
  hall: Tileset;
  rockTop: Tileset;
  rockFace: Tileset;
  decor: Tileset;
  edges: Tileset;
  edgeFrames: Map<number, number>;
  edgeMasks: Uint8Array;
}

/**
 * Prepara os ladrilhos do subterrâneo no tilemap do deserto (os tilesets precisam existir antes das camadas):
 * chão, salão, rocha (topo e paredão), enfeites e as bordas montadas para as combinações que aparecem.
 */
export function caveTilesets(scene: Phaser.Scene, d: Dungeon, tileset: AddTileset): CaveTilesets {
  const at = (x: number, y: number) => tileAt(d, x, y);
  const rock = (x: number, y: number) => at(x, y) === Tile.Wall && !pillar(d, x, y);
  const edgeMasks = new Uint8Array(d.width * d.height);
  forEachUnder(d, (x, y) => {
    let mask = 0;
    if (rock(x, y)) {
      DIRS.forEach(([dx, dy], i) => { if (RIM[i] && !rock(x + dx, y + dy)) mask |= RIM[i]; });
    } else {
      if (rock(x, y - 1)) mask |= SHADE_N;
      if (rock(x - 1, y)) mask |= SHADE_W;
    }
    edgeMasks[y * d.width + x] = mask;
  });
  const edgeFrames = buildEdgeTexture(scene, edgeMasks);
  return {
    floor: tileset(DESERT_TEXTURE.caveFloor, CAVE_FLOOR_VARIANTS),
    hall: tileset(DESERT_TEXTURE.hall, 4),
    rockTop: tileset(DESERT_TEXTURE.rockTop, ROCK_TOP_VARIANTS),
    rockFace: tileset(DESERT_TEXTURE.rockFace, ROCK_FACE_VARIANTS),
    decor: tileset(DESERT_TEXTURE.caveDecor, 5),
    edges: tileset(EDGE_TEXTURE, Math.max(1, edgeFrames.size)),
    edgeFrames,
    edgeMasks,
  };
}

/**
 * Desenha o subterrâneo: chão de areia batida (o salão dos baús em lajes de arenito com glifos), rocha com
 * paredão de frente onde o chão fica ao sul, sombras, sulcos e pele trocada no covil do verme, ossos e areia
 * nos túneis, pilares soltos como estalagmites grandes, cristais que brilham e o facho de luz da saída.
 * Devolve as luzes, que piscam devagar no ambiente.
 */
export function drawCave(
  scene: Phaser.Scene, d: Dungeon, sets: CaveTilesets,
  layers: { ground: Phaser.Tilemaps.TilemapLayer; edges: Phaser.Tilemaps.TilemapLayer; decor: Phaser.Tilemaps.TilemapLayer },
  culler: ChunkCuller, floorDepth: number,
) {
  const cave = d.cave!;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const walk = (x: number, y: number) => at(x, y) !== Tile.Wall || pillar(d, x, y);
  const lights: Phaser.GameObjects.Image[] = [];
  const light = (px: number, py: number, scale: number, alpha: number) => {
    const img = scene.add.image(px, py, DESERT_TEXTURE.caveGlow).setScale(scale).setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(floorDepth + 0.6).setData("alpha", alpha).setData("phase", hash(px, py, 90) * 6);
    lights.push(culler.add(img, Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE)));
  };
  const tall = (frame: number, x: number, y: number) => {
    const img = culler.add(scene.add.image(x * TILE_SIZE, y * TILE_SIZE, DESERT_TEXTURE.caveTall, frame)
      .setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.25), x, y);
    if (hash(x, y, 91) < 0.5) img.setFlipX(true);
    return img;
  };

  forEachUnder(d, (x, y) => {
    const i = y * d.width + x;
    const mask = sets.edgeMasks[i];
    if (mask) layers.edges.putTileAt(sets.edges.gid + sets.edgeFrames.get(mask)!, x, y);

    if (at(x, y) === Tile.Wall && !pillar(d, x, y)) {
      // Rocha: paredão onde o chão fica logo ao sul (é o que se vê de frente), topo escuro no resto.
      if (walk(x, y + 1)) layers.ground.putTileAt(sets.rockFace.gid + Math.floor(hash(x, y, 92) * ROCK_FACE_VARIANTS), x, y);
      else layers.ground.putTileAt(sets.rockTop.gid + Math.floor(hash(x, y, 93) * ROCK_TOP_VARIANTS), x, y);
      return;
    }

    if (inRect(cave.reward, x, y)) {
      // Salão antigo: lajes, e um glifo de vez em quando (nunca embaixo dos baús).
      const glyph = hash(x, y, 94) < 0.06 && !cave.chests.some((c) => c.x === x && c.y === y) ? 2 + Math.floor(hash(x, y, 95) * 2) : Math.floor(hash(x, y, 96) * 2);
      layers.ground.putTileAt(sets.hall.gid + glyph, x, y);
      return;
    }

    const v = hash(x, y, 97);
    const tile = layers.ground.putTileAt(sets.floor.gid + (v < 0.5 ? 0 : 1 + Math.floor((v - 0.5) * 2 * (CAVE_FLOOR_VARIANTS - 1))), x, y);
    tile.tint = patchTint(x, y, 0.72, CAVE_SHADE, 5, 64);

    if (pillar(d, x, y)) {
      // Pilar solto no covil: uma estalagmite grande que ocupa o tile (bloqueia passo e visão).
      tall(CAVE_TALL.stalagmiteB, x, y);
      return;
    }
    if (at(x, y) === Tile.Cave || (x === d.bossPortal.x && y === d.bossPortal.y)) return;

    const decor = (frame: number) => layers.decor.putTileAt(sets.decor.gid + frame, x, y);
    const n = hash(x, y, 98);
    const m = hash(x, y, 99);
    const byRock = DIRS.some(([dx, dy]) => !walk(x + dx, y + dy));
    if (inRect(d.boss, x, y)) {
      // Covil: sulcos do verme, pele trocada e ossos de quem desceu antes.
      if (n < 0.1) decor(CAVE_FLOOR_DECOR.furrow);
      else if (n < 0.14) decor(CAVE_FLOOR_DECOR.skin);
      else if (n < 0.19) decor(CAVE_FLOOR_DECOR.bones);
    } else if (byRock && n < 0.14) {
      if (m < 0.3) tall(m < 0.15 ? CAVE_TALL.stalagmiteA : CAVE_TALL.stalagmiteB, x, y);
      else if (m < 0.5) {
        tall(CAVE_TALL.crystals, x, y);
        light(x * TILE_SIZE + 16, y * TILE_SIZE + 24, 1.1, 0.55);
      } else if (m < 0.75) decor(CAVE_FLOOR_DECOR.sand);
      else decor(CAVE_FLOOR_DECOR.pebbles);
    } else if (n < 0.06) {
      decor(m < 0.4 ? CAVE_FLOOR_DECOR.pebbles : m < 0.7 ? CAVE_FLOOR_DECOR.bones : CAVE_FLOOR_DECOR.sand);
    }
  });

  // Saída: facho de luz do buraco no teto, com a corda.
  const ex = cave.exit.x * TILE_SIZE + 16;
  const ey = (cave.exit.y + 1) * TILE_SIZE;
  culler.add(scene.add.image(ex, ey, DESERT_TEXTURE.caveShaft).setOrigin(0.5, 1).setDepth((cave.exit.y + 1) * TILE_SIZE - 0.2), cave.exit.x, cave.exit.y);
  light(ex, ey - 12, 2, 0.75);
  // Salão dos baús: cristais nos dois cantos do fundo, que iluminam a escolha.
  for (const x of [cave.reward.x, cave.reward.x + cave.reward.w - 1]) {
    tall(CAVE_TALL.crystals, x, cave.reward.y);
    light(x * TILE_SIZE + 16, cave.reward.y * TILE_SIZE + 24, 1.6, 0.6);
  }
  // Covil: um brilho fraco no meio, para o verme não sumir no escuro.
  light((d.boss.x + d.boss.w / 2) * TILE_SIZE, (d.boss.y + d.boss.h / 2) * TILE_SIZE, 3.2, 0.3);
  return lights;
}

/** Boca da caverna na superfície: o monte de arenito com a abertura escura sobre o tile da caverna. */
export function drawCaveMouth(scene: Phaser.Scene, d: Dungeon, culler: ChunkCuller) {
  const { x, y } = d.cave!.entrance;
  const img = scene.add.image(x * TILE_SIZE + 16, (y + 1) * TILE_SIZE, DESERT_TEXTURE.caveMouth)
    .setOrigin(0.5, 1).setDepth((y + 1) * TILE_SIZE - 0.3);
  return culler.add(img, x, y);
}

export { pillar } from "./cavePlan.ts";

/** Área subterrânea do mapa: a caverna do deserto ou a Caverna da Travessia inteira. */
export function undergroundArea(d: Dungeon): Rect | null {
  if (d.cave) return d.cave.under;
  return d.lairs ? { x: 0, y: 0, w: d.width, h: d.height } : null;
}

export function forEachUnder(d: Dungeon, fn: (x: number, y: number) => void) {
  const u = undergroundArea(d);
  if (!u) return;
  for (let y = 0; y < d.height; y++) for (let x = u.x; x < u.x + u.w; x++) fn(x, y);
}

function buildEdgeTexture(scene: Phaser.Scene, masks: Uint8Array) {
  const used = [...new Set(masks)].filter(Boolean).sort((a, b) => a - b);
  const frames = new Map(used.map((mask, i) => [mask, i]));
  if (scene.textures.exists(EDGE_TEXTURE)) scene.textures.remove(EDGE_TEXTURE);
  const rim = scene.textures.get(DESERT_TEXTURE.rockRim).getSourceImage() as CanvasImageSource;
  const shade = scene.textures.get(DESERT_TEXTURE.caveShade).getSourceImage() as CanvasImageSource;
  const { canvas, ctx } = makeCanvas(TILE_SIZE * Math.max(1, used.length), TILE_SIZE);
  const draw = (img: CanvasImageSource, frame: number, at: number) =>
    ctx.drawImage(img, frame * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, at * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  used.forEach((mask, i) => {
    if (mask & SHADE_N) draw(shade, 0, i);
    if (mask & SHADE_W) draw(shade, 1, i);
    RIM.forEach((bit, k) => { if (bit && mask & bit) draw(rim, k, i); });
  });
  scene.textures.addCanvas(EDGE_TEXTURE, canvas);
  return frames;
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
