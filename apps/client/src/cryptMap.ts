import * as Phaser from "phaser";
import { CAMP_RADIUS, MAPS, TILE_SIZE, Tile, lairsOf, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { CRYPT_DECOR, createCryptArt, floorVariants, wallCapTexture, wallFaceTexture } from "./art/textures.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";
import { CRYPT_FLOOR, CRYPT_TALL, CRYPT_TILE, CRYPT_WALL, RIM, WALL_RISE, WALL_VARIANTS } from "./art/cryptArt.ts";
import { CAMPFIRE, VENDOR, campfire, vendorStall } from "./art/badlandsArt.ts";
import { FLAME, flameFrame } from "./art/bogArt.ts";
import { toCanvas } from "./art/paint.ts";
import { makeCanvas } from "./art/pixels.ts";
import { addCanvasTexture } from "./art/canvasTexture.ts";
import { SPECIES, TALL as FOREST_TALL, TREE, draw as forestDraw, flatDecor as forestFlat, tallDecor as forestTall, tree } from "./art/forestArt.ts";
import { PALM, TALL as DUNE_TALL, draw as duneDraw, flatDecor as duneFlat, palmCrown, palmTrunk, tallDecor as duneTall } from "./art/duneArt.ts";
import { CAVE, HOLE, caveExit, floorHole } from "./art/exitArt.ts";

/** A Cripta é desenhada em 128 px por tile e entra no mapa em ¼ (`docs/CENARIOS_PLANO.md`, fase 4). */
const ART_ZOOM = CRYPT_TILE / TILE_SIZE;

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

  // Chão, sombra das paredes e enfeites em 128 px por tile, num tilemap desenhado em 1/`ART_ZOOM`.
  const art = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE * ART_ZOOM, tileHeight: TILE_SIZE * ART_ZOOM });
  let firstGid = 0;
  const tileset = (key: string) => {
    const size = art.tileWidth;
    const count = floorVariants(scene, key, size);
    const set = art.addTilesetImage(key, key, size, size, 0, 0, firstGid)!;
    const gid = firstGid;
    firstGid += count;
    return { set, gid, count };
  };
  const normal = tileset(CRYPT_DECOR.floorHd);
  const bossFloor = tileset(CRYPT_DECOR.bossHd);
  const shade = tileset(CRYPT_DECOR.shade);
  const decor = tileset(CRYPT_DECOR.floor);
  const sets = [normal, bossFloor, shade, decor].map((t) => t.set);
  const groundLayer = art.createBlankLayer("chao", sets)!.setDepth(floorDepth).setScale(1 / ART_ZOOM);
  const shadeLayer = art.createBlankLayer("sombra", sets)!.setDepth(floorDepth).setScale(1 / ART_ZOOM);
  const decorLayer = art.createBlankLayer("enfeites", sets)!.setDepth(floorDepth).setScale(1 / ART_ZOOM);

  const culler = new ChunkCuller();
  const lights: Phaser.GameObjects.Image[] = [];
  const image = (key: string, frame: number | string | undefined, px: number, py: number, depth: number, tx: number, ty: number) =>
    culler.add(scene.add.image(px, py, key, frame).setOrigin(0).setDepth(depth).setScale(1 / ART_ZOOM), tx, ty);
  /** Poça de luz quente no chão, que tremula no `update`. */
  const light = (cx: number, cy: number, scale: number, tx: number, ty: number) => {
    const img = culler.add(scene.add.image(cx, cy, CRYPT_DECOR.light).setScale(scale / ART_ZOOM).setDepth(floorDepth + 0.5)
      .setBlendMode(Phaser.BlendModes.ADD), tx, ty);
    img.setData("base", 0.85 + hash(tx, ty, 99) * 0.15).setData("seed", hash(tx, ty, 98) * 1000);
    lights.push(img);
  };

  // Tiles onde nada de pé pode ficar: portal e em volta (a equipe nasce ali), baús e o centro da sala do boss.
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1
    || (!!d.camp && tileDistance(x, y, d.camp.x, d.camp.y) <= 1)
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

  drawLairThemes(scene, d, floorDepth);
  if (d.camp) drawCampfire(scene, d.camp, light);
  if (d.vendor) drawVendor(scene, d.vendor);
  return createAmbience(scene, culler, lights, uiDepth);
}

const CAMPFIRE_KEY = "fibula-campfire";
const CAMPFIRE_FLAME = "fibula-flame";

/**
 * Fogueira do acampamento do terreno de caça (Fíbula): o anel de pedras e as achas (a dos Ermos), a chama animada (a do
 * Charco) e uma poça de luz larga. Marca onde a vida e a mana voltam mais rápido.
 */
function drawCampfire(scene: Phaser.Scene, at: { x: number; y: number }, light: (cx: number, cy: number, scale: number, tx: number, ty: number) => void) {
  if (!scene.textures.exists(CAMPFIRE_KEY)) addCanvasTexture(scene.textures, CAMPFIRE_KEY, toCanvas(campfire(), CAMPFIRE.w, CAMPFIRE.h));
  if (!scene.textures.exists(CAMPFIRE_FLAME)) {
    const { canvas, ctx } = makeCanvas(FLAME.w * 4, FLAME.h);
    for (let k = 0; k < 4; k++) ctx.drawImage(toCanvas(flameFrame(k), FLAME.w, FLAME.h), k * FLAME.w, 0);
    const texture = addCanvasTexture(scene.textures, CAMPFIRE_FLAME, canvas)!;
    for (let k = 0; k < 4; k++) texture.add(k, 0, k * FLAME.w, 0, FLAME.w, FLAME.h);
  }
  const px = (at.x + 0.5) * TILE_SIZE, py = (at.y + 1) * TILE_SIZE;
  // A área onde a regen vale `CAMP_REGEN` vezes (`CAMP_RADIUS` tiles para cada lado: um quadrado): chão aquecido com a borda marcada.
  const r = CAMP_RADIUS;
  scene.add.graphics().setDepth(1.5)
    .fillStyle(0xff9a40, 0.1).fillRoundedRect((at.x - r) * TILE_SIZE, (at.y - r) * TILE_SIZE, (2 * r + 1) * TILE_SIZE, (2 * r + 1) * TILE_SIZE, 10)
    .lineStyle(2, 0xffb347, 0.45).strokeRoundedRect((at.x - r) * TILE_SIZE, (at.y - r) * TILE_SIZE, (2 * r + 1) * TILE_SIZE, (2 * r + 1) * TILE_SIZE, 10);
  scene.add.image(px, py, CAMPFIRE_KEY).setOrigin(0.5, 1).setScale(1.7 / ART_ZOOM).setDepth(py - 1);
  const flame = scene.add.image(px, py - 52 / ART_ZOOM, CAMPFIRE_FLAME, 0).setOrigin(0.5, 1).setScale(2 / ART_ZOOM).setDepth(py)
    .setBlendMode(Phaser.BlendModes.ADD);
  let frame = 0;
  scene.time.addEvent({ delay: 110, loop: true, callback: () => { frame = (frame + 1) % 4; flame.setFrame(frame); } });
  light(px, py - TILE_SIZE / 2, 3.2, at.x, at.y);
}

/** Pixels por tile no chão temático dos covis (metade da arte de 128 px: o covil inteiro cabe numa textura). */
const LAIR_TILE = 64;

/**
 * Fíbula Profunda: a sala de cada covil tem o tema do cenário que abre (`Lair.theme`). A da Cripta já é cripta; a do
 * Mar de Areia ganha o chão de areia das Dunas, colunas, costelas e ânforas; a do Bosque Velho, o capim da mata, folhas,
 * samambaias, arbustos e tocos. Os enfeites de pé ficam encostados nas paredes, longe da boca e da saída.
 */
function drawLairThemes(scene: Phaser.Scene, d: Dungeon, floorDepth: number) {
  const defs = MAPS[d.mapId].lairs;
  if (!defs) return;
  const zoom = CRYPT_TILE / TILE_SIZE;
  const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < d.width && y < d.height && tileAt(d, x, y) !== Tile.Wall;
  lairsOf(d).forEach((lair, i) => {
    const theme = defs[i]?.theme;
    if (theme !== "desert" && theme !== "forest") return;
    const r = lair.room;
    const forest = theme === "forest";
    const key = `lair-floor-${d.mapId}-${i}`;
    if (!scene.textures.exists(key)) {
      const ground = [0, 1, 2, 3].map((v) => toCanvas(forest ? forestDraw.grass("oldwood", v)() : duneDraw.sand("desert", v)()));
      const flats = forest ? (["leaves", "clover", "flowers", "twigs", "moss"] as const).map((k, v) => toCanvas(forestFlat("oldwood", k, v).render(false)))
        : (["pebbles", "shells", "tracks", "bones", "stones"] as const).map((k, v) => toCanvas(duneFlat("desert", k, v).render(false)));
      const { canvas, ctx } = makeCanvas(r.w * LAIR_TILE, r.h * LAIR_TILE);
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (!floor(x, y)) continue;
          const px = (x - r.x) * LAIR_TILE, py = (y - r.y) * LAIR_TILE;
          ctx.drawImage(ground[Math.floor(hash(x, y, 41) * 4)], px, py, LAIR_TILE, LAIR_TILE);
          if (hash(x, y, 42) < 0.22) ctx.drawImage(flats[Math.floor(hash(x, y, 43) * flats.length)], px, py, LAIR_TILE, LAIR_TILE);
        }
      }
      addCanvasTexture(scene.textures, key, canvas);
    }
    scene.add.image(r.x * TILE_SIZE, r.y * TILE_SIZE, key).setOrigin(0).setDepth(floorDepth + 0.1).setScale(TILE_SIZE / LAIR_TILE);

    // Enfeites de pé encostados nas paredes (a sala fica livre para a luta), fora da boca e da saída.
    const kinds = forest ? (["fern", "bush", "foxglove", "stump", "grass", "bramble"] as const) : (["column", "ribs", "amphora", "cairn", "rocks", "shrub"] as const);
    const size = forest ? FOREST_TALL : DUNE_TALL;
    const center = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    const inRoom = (x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    /** Encostado na parede (a até `reach` tiles dela), longe da saída, do meio e da boca do covil. */
    const byWall = (x: number, y: number, reach: number) => {
      let near = false;
      for (let dy = -reach; dy <= reach && !near; dy++) for (let dx = -reach; dx <= reach && !near; dx++) near = !floor(x + dx, y + dy);
      if (!near || tileDistance(x, y, lair.portal.x, lair.portal.y) < 3 || tileDistance(x, y, center.x, center.y) < 5) return false;
      // A boca do covil (o lado que dá para o acampamento) fica livre: chão fora da sala logo ao lado.
      return ![[-3, 0], [3, 0], [0, 3], [0, -3]].some(([dx, dy]) => floor(x + dx, y + dy) && !inRoom(x + dx, y + dy));
    };
    // As árvores da mata (ou as palmeiras do oásis) nos cantos, espaçadas; o resto do enfeite em volta delas.
    const big: { x: number; y: number }[] = [];
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!floor(x, y) || hash(x, y, 47) > 0.16 || !byWall(x, y, 1) || big.some((b) => tileDistance(b.x, b.y, x, y) < 4)) continue;
        big.push({ x, y });
        const v = Math.floor(hash(x, y, 48) * 3);
        const tex = forest ? `lair-tree-${v}` : `lair-palm-${v}`;
        if (!scene.textures.exists(tex)) {
          const w = forest ? TREE.w : PALM.w, h = forest ? TREE.h : PALM.h;
          const { canvas, ctx } = makeCanvas(w, h);
          if (forest) {
            const species = SPECIES.oldwood[v % SPECIES.oldwood.length];
            const t = tree("oldwood", species, v);
            ctx.drawImage(toCanvas(t.trunk, w, h), 0, 0);
            ctx.drawImage(toCanvas(t.crown, w, h), 0, 0);
          } else {
            const trunk = palmTrunk("desert", v);
            ctx.drawImage(toCanvas(trunk.image, w, h), 0, 0);
            ctx.drawImage(toCanvas(palmCrown("desert", v, trunk.top), w, h), 0, 0);
          }
          addCanvasTexture(scene.textures, tex, canvas);
        }
        const px = (x + 0.5) * TILE_SIZE, py = (y + 1) * TILE_SIZE;
        scene.add.image(px, py, tex).setOrigin(0.5, 1).setDepth(py - 1).setScale(1 / zoom);
      }
    }
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (!floor(x, y) || hash(x, y, 44) > 0.5 || !byWall(x, y, 2) || big.some((b) => tileDistance(b.x, b.y, x, y) < 2)) continue;
        const kind = kinds[Math.floor(hash(x, y, 45) * kinds.length)];
        const v = Math.floor(hash(x, y, 46) * 3);
        const tex = `lair-${theme}-${kind}-${v}`;
        if (!scene.textures.exists(tex)) addCanvasTexture(scene.textures, tex, toCanvas(forest ? forestTall("oldwood", kind as never, v) : duneTall("desert", kind as never, v), size.w, size.h));
        const px = (x + 0.5) * TILE_SIZE, py = (y + 1) * TILE_SIZE;
        scene.add.image(px, py, tex).setOrigin(0.5, 1).setDepth(py - 1).setScale(1 / zoom);
      }
    }
  });
}

/**
 * A saída de um covil da Fíbula Profunda (`Lair.exit`), no tile `c`: abre devagar quando o boss cai. O buraco fica no
 * chão (abaixo do herói que pisa nele); a boca da caverna encosta na parede do fundo, com a base no pé do tile, e a luz
 * do dia pulsa no chão em frente.
 */
export function drawLairExit(scene: Phaser.Scene, c: { x: number; y: number }, exit: "hole" | "cave", theme: "desert" | "forest") {
  const key = exit === "hole" ? "lair-exit-hole" : `lair-exit-cave-${theme}`;
  if (!scene.textures.exists(key)) {
    addCanvasTexture(scene.textures, key, exit === "hole" ? toCanvas(floorHole(), HOLE.w, HOLE.h) : toCanvas(caveExit(theme), CAVE.w, CAVE.h));
  }
  const zoom = CRYPT_TILE / TILE_SIZE;
  const x = (c.x + 0.5) * TILE_SIZE;
  // Abaixo do herói que pisa nela (o corpo fica em y + meio tile) e acima das paredes da linha de cima.
  const depth = c.y * TILE_SIZE + 1;
  if (exit === "hole") {
    const hole = scene.add.image(x, (c.y + 0.5) * TILE_SIZE, key).setDepth(depth).setScale(0.2 / zoom);
    scene.tweens.add({ targets: hole, scale: 1.9 / zoom, duration: 700, ease: "Back.Out" });
    return;
  }
  const base = (c.y + 1) * TILE_SIZE;
  const glow = scene.add.ellipse(x, base - 6, 110, 38, theme === "forest" ? 0xd8f0a0 : 0xffe0a0, 0.3).setDepth(depth - 0.5)
    .setBlendMode(Phaser.BlendModes.ADD);
  const mouth = scene.add.image(x, base, key).setOrigin(0.5, 1).setDepth(depth).setScale(1.7 / zoom).setAlpha(0);
  scene.tweens.add({ targets: mouth, alpha: 1, duration: 900 });
  scene.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.4 }, duration: 1400, yoyo: true, repeat: -1 });
}

const VENDOR_KEY = "fibula-vendor";

/** Banca do vendedor do acampamento (terreno de caça): perto dela o painel de compra aparece (`VendorPanel`). */
function drawVendor(scene: Phaser.Scene, at: { x: number; y: number }) {
  if (!scene.textures.exists(VENDOR_KEY)) addCanvasTexture(scene.textures, VENDOR_KEY, toCanvas(vendorStall(), VENDOR.w, VENDOR.h));
  const px = (at.x + 0.5) * TILE_SIZE, py = (at.y + 1) * TILE_SIZE;
  scene.add.image(px, py, VENDOR_KEY).setOrigin(0.5, 1).setScale(1.5 / ART_ZOOM).setDepth(py - 1);
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
