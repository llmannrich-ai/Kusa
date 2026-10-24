import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { CRYPT_FLOOR, CRYPT_TALL, CRYPT_WALL } from "./art/cryptDecor.ts";
import { hash } from "./art/pixels.ts";
import { CRYPT_DECOR, FLOOR_TEXTURE, createCryptArt, floorVariants, wallCapTexture, wallFaceTexture } from "./art/textures.ts";
import { RIM, WALL_RISE, WALL_VARIANTS } from "./art/walls.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";
import { ART_ZOOM } from "./art/newArt.ts";

/** Paredes desenhadas até esta distância (em tiles) do chão; além disso é só o fundo escuro. */
const WALL_REACH = 1;
/** Sombra das manchas do chão: puxa para o marrom quente, como pedra velha à luz de tocha. */
const CRYPT_SHADE = [1, 0.82, 0.62] as const;

/**
 * Desenha a Cripta. Em tilemaps: o chão (com manchas de luz e sujeira), a sombra das paredes e os
 * enfeites rasteiros (ossos, entulho, rachaduras, teias nos cantos, poças). Em sprites ordenados pela
 * linha de baixo: as paredes oblíquas, o que fica pendurado nelas (tochas, estandartes, correntes,
 * nichos) e os móveis das salas (barris, caixotes, urnas, candelabros, caixões). A luz das chamas
 * tremula. Tudo vem de `hash(x, y)`: todos veem o mesmo, e nada disso muda a jogabilidade.
 */
export function drawCrypt(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  createCryptArt(scene);
  const isFloor = (x: number, y: number) => x >= 0 && y >= 0 && x < d.width && y < d.height && tileAt(d, x, y) !== Tile.Wall;
  const isWall = (x: number, y: number) => !isFloor(x, y);
  const rooms = [d.spawn, ...d.path, ...d.side, d.boss];
  const roomOf = (x: number, y: number) => rooms.find((r) => inside(r, x, y));
  const inBoss = (x: number, y: number) => inside(d.boss, x, y);

  // Na arte nova, chão e enfeites vêm em 128 px por tile: um tilemap à parte, desenhado em 1/`ART_ZOOM`. A sombra das
  // paredes (um degradê) continua a mesma nos dois.
  const hd = ART_ZOOM > 1;
  const map = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const art = hd ? scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE * ART_ZOOM, tileHeight: TILE_SIZE * ART_ZOOM }) : map;
  let firstGid = 0;
  const tileset = (key: string, on = map) => {
    const size = on.tileWidth;
    const count = floorVariants(scene, key, size);
    const set = on.addTilesetImage(key, key, size, size, 0, 0, firstGid)!;
    const gid = firstGid;
    firstGid += count;
    return { set, gid, count };
  };
  const normal = tileset(hd ? CRYPT_DECOR.floorHd : FLOOR_TEXTURE.normal, art);
  const bossFloor = tileset(hd ? CRYPT_DECOR.bossHd : FLOOR_TEXTURE.boss, art);
  const shade = tileset(CRYPT_DECOR.shade);
  const decor = tileset(CRYPT_DECOR.floor, art);
  const artSets = [normal, bossFloor, decor].map((t) => t.set);
  const sets = hd ? [shade.set] : [...artSets, shade.set];
  const groundLayer = art.createBlankLayer("chao", hd ? artSets : sets)!.setDepth(floorDepth).setScale(1 / ART_ZOOM);
  const shadeLayer = map.createBlankLayer("sombra", sets)!.setDepth(floorDepth);
  const decorLayer = art.createBlankLayer("enfeites", hd ? artSets : sets)!.setDepth(floorDepth).setScale(1 / ART_ZOOM);

  const culler = new ChunkCuller();
  const lights: Phaser.GameObjects.Image[] = [];
  const image = (key: string, frame: number | string | undefined, px: number, py: number, depth: number, tx: number, ty: number) =>
    culler.add(scene.add.image(px, py, key, frame).setOrigin(0).setDepth(depth).setScale(1 / ART_ZOOM), tx, ty);
  /** Poça de luz quente no chão, que tremula no `update`. */
  const light = (cx: number, cy: number, scale: number, tx: number, ty: number) => {
    const img = culler.add(scene.add.image(cx, cy, CRYPT_DECOR.light).setScale(scale).setDepth(floorDepth + 0.5)
      .setBlendMode(Phaser.BlendModes.ADD), tx, ty);
    img.setData("base", 0.85 + hash(tx, ty, 99) * 0.15).setData("seed", hash(tx, ty, 98) * 1000);
    lights.push(img);
  };

  // Tiles onde nada de pé pode ficar: portal e em volta (a equipe nasce ali), baús e o centro da sala do boss.
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1
    || d.side.some((r) => x === r.x + 1 && y === r.y + 1)
    || tileDistance(x, y, Math.floor(d.boss.x + d.boss.w / 2), Math.floor(d.boss.y + d.boss.h / 2)) <= 1;

  /** Metade dos tiles usa o ladrilho base; o resto se espalha pelas variações. */
  const pick = (x: number, y: number, count: number) => {
    const n = hash(x, y);
    return n < 0.5 ? 0 : 1 + Math.floor((n - 0.5) * 2 * (count - 1));
  };

  // --- Chão, sombras e enfeites rasteiros -------------------------------------------
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (isWall(x, y)) continue;
      const floor = inBoss(x, y) ? bossFloor : normal;
      groundLayer.putTileAt(floor.gid + pick(x, y, floor.count), x, y).tint = patchTint(x, y, 0.72, CRYPT_SHADE, 6, 63);

      const wallN = isWall(x, y - 1);
      const wallW = isWall(x - 1, y);
      if (wallN || wallW) shadeLayer.putTileAt(shade.gid + (wallN && wallW ? 2 : wallN ? 0 : 1), x, y);
      if (tileAt(d, x, y) === Tile.Portal) continue;

      const flat = (frame: number) => decorLayer.putTileAt(decor.gid + frame, x, y);
      const n = hash(x, y, 91);
      const m = hash(x, y, 92);
      const room = roomOf(x, y);
      const byWall = wallN || wallW || isWall(x + 1, y) || isWall(x, y + 1);

      if (wallN && wallW && n < 0.45) flat(CRYPT_FLOOR.cobwebNW);
      else if (wallN && isWall(x + 1, y) && n < 0.45) flat(CRYPT_FLOOR.cobwebNE);
      else if (room === d.boss) {
        // Covil do dragão: chão queimado, sangue e ossadas.
        if (n < 0.08) flat(CRYPT_FLOOR.scorch);
        else if (n < 0.11) flat(CRYPT_FLOOR.blood);
        else if (n < 0.115) flat(CRYPT_FLOOR.dragonBones);
        else if (n < 0.14) flat(m < 0.6 ? CRYPT_FLOOR.bones : CRYPT_FLOOR.skull);
        else if (byWall && n < 0.2 && !reserved(x, y)) tall(CRYPT_TALL.bonePile, x, y);
      } else if (room && byWall && n < 0.17 && !reserved(x, y)) {
        tall(furniture(room === d.spawn, d.side.includes(room), m), x, y);
      } else if (n < (room ? 0.11 : 0.06)) {
        flat(floorDetail(m, Boolean(room)));
      }
    }
  }

  function tall(frame: number, x: number, y: number) {
    const img = image(CRYPT_DECOR.tall, frame, x * TILE_SIZE, y * TILE_SIZE, (y + 1) * TILE_SIZE - 0.25, x, y);
    if (frame !== CRYPT_TALL.coffin && hash(x, y, 93) < 0.5) img.setFlipX(true);
    if (frame === CRYPT_TALL.candelabra) light(x * TILE_SIZE + 16, y * TILE_SIZE + 14, 0.75, x, y);
  }

  // --- Paredes, o que fica pendurado nelas e tochas ----------------------------------
  const nearFloor = (x: number, y: number) => {
    for (let dy = -WALL_REACH; dy <= WALL_REACH; dy++)
      for (let dx = -WALL_REACH; dx <= WALL_REACH; dx++)
        if (isFloor(x + dx, y + dy)) return true;
    return false;
  };
  for (let y = 0; y < d.height; y++) {
    let lastTorch = -99;
    for (let x = 0; x < d.width; x++) {
      if (isFloor(x, y) || !nearFloor(x, y)) continue;
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const depth = (y + 1) * TILE_SIZE;
      const variant = Math.floor(hash(x, y, 7) * WALL_VARIANTS);
      const rim = (isFloor(x, y - 1) ? RIM.north : 0) | (isFloor(x - 1, y) ? RIM.west : 0) | (isFloor(x + 1, y) ? RIM.east : 0);
      // Mesmas manchas de luz do chão nas paredes: os tampos deixam de ser faixas lisas.
      const tint = patchTint(x, y, 0.74, CRYPT_SHADE, 5, 64);
      image(wallCapTexture(scene, variant, rim), undefined, px, py - WALL_RISE, depth, x, y).setTint(tint);
      if (!isFloor(x, y + 1)) continue;
      image(wallFaceTexture(scene, variant), undefined, px, py + TILE_SIZE - WALL_RISE, depth, x, y).setTint(tint);

      // Face visível: tocha (espaçadas, mais nas salas) ou um enfeite pendurado.
      const n = hash(x, y, 94);
      const room = roomOf(x, y + 1);
      if (n < (room ? 0.34 : 0.14) && x - lastTorch >= 3) {
        lastTorch = x;
        const torch = culler.add(scene.add.sprite(px, py, CRYPT_DECOR.torch).setOrigin(0).setDepth(depth + 0.1).setScale(1 / ART_ZOOM), x, y);
        torch.play({ key: CRYPT_DECOR.torch, startFrame: Math.floor(hash(x, y, 95) * 4) });
        light(px + 16, py + TILE_SIZE + 10, 1, x, y);
      } else if (hash(x, y, 96) < 0.2) {
        const m = hash(x, y, 97);
        const frame = m < 0.22 ? CRYPT_WALL.bannerRed : m < 0.36 ? CRYPT_WALL.bannerBlue : m < 0.52 ? CRYPT_WALL.chains
          : m < 0.64 ? CRYPT_WALL.niche : m < 0.8 ? CRYPT_WALL.crack : m < 0.9 ? CRYPT_WALL.web : CRYPT_WALL.moss;
        image(CRYPT_DECOR.wall, frame, px, py, depth + 0.1, x, y);
      }
    }
  }

  return createAmbience(scene, culler, lights, uiDepth);
}

/** Móvel de pé encostado na parede de uma sala. Na entrada, só suprimentos; nas laterais, mais caixões. */
function furniture(spawn: boolean, side: boolean, m: number) {
  if (spawn) return m < 0.35 ? CRYPT_TALL.barrel : m < 0.6 ? CRYPT_TALL.crate : m < 0.8 ? CRYPT_TALL.sack : CRYPT_TALL.barrels;
  if (side && m < 0.3) return CRYPT_TALL.coffin;
  const options = [
    CRYPT_TALL.barrel, CRYPT_TALL.barrels, CRYPT_TALL.crate, CRYPT_TALL.urn, CRYPT_TALL.urn, CRYPT_TALL.brokenUrn,
    CRYPT_TALL.candelabra, CRYPT_TALL.bonePile, CRYPT_TALL.bonePile, CRYPT_TALL.coffin, CRYPT_TALL.sack,
  ];
  return options[Math.floor(m * options.length)];
}

/** Enfeite rasteiro: nas salas um pouco de tudo; nos corredores, só desgaste. */
function floorDetail(m: number, room: boolean) {
  if (!room) return m < 0.3 ? CRYPT_FLOOR.crack : m < 0.55 ? CRYPT_FLOOR.rubble : m < 0.8 ? CRYPT_FLOOR.stain : CRYPT_FLOOR.bones;
  const table: [number, number][] = [
    [0.18, CRYPT_FLOOR.bones], [0.25, CRYPT_FLOOR.skull], [0.43, CRYPT_FLOOR.rubble], [0.58, CRYPT_FLOOR.crack],
    [0.72, CRYPT_FLOOR.stain], [0.8, CRYPT_FLOOR.puddle], [0.88, CRYPT_FLOOR.shards], [0.92, CRYPT_FLOOR.paper],
    [0.96, CRYPT_FLOOR.chain], [1, CRYPT_FLOOR.candle],
  ];
  return table.find(([limit]) => m < limit)![1];
}

/** Tempo entre um passo e outro da tremulação das chamas (luz em degraus, como pixel art). */
const FLICKER_MS = 90;

/** Ambiente: luz das chamas tremulando (só as à vista) e poeira subindo devagar na tela. */
function createAmbience(scene: Phaser.Scene, culler: ChunkCuller, lights: Phaser.GameObjects.Image[], uiDepth: number): MapAmbience {
  const cam = scene.cameras.main;
  const dust = scene.add.particles(0, 0, CRYPT_DECOR.dust, {
    lifespan: { min: 5000, max: 9000 },
    speedY: { min: -9, max: -3 },
    speedX: { min: -4, max: 4 },
    alpha: { values: [0, 0.7, 0.5, 0], interpolation: "linear" },
    frequency: 380,
    quantity: 1,
    maxAliveParticles: 16,
    blendMode: Phaser.BlendModes.ADD,
    emitZone: {
      type: "random",
      source: new Phaser.Geom.Rectangle(0, 0, 1, 1),
      quantity: 1,
    } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (dust.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;

  let nextFlicker = 0;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      zone.setTo(v.x, v.y, v.width, v.height);
      culler.update(v);
      if (time < nextFlicker) return;
      nextFlicker = time + FLICKER_MS;
      const step = Math.floor(time / FLICKER_MS);
      for (const img of lights) {
        if (!img.visible) continue;
        const k = hash(step, img.getData("seed"));
        img.setAlpha(img.getData("base") * (0.78 + 0.22 * k));
      }
    },
  };
}

function inside(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
