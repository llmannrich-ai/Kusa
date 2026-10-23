import * as Phaser from "phaser";
import { TILE_SIZE, Tile, isUnderground, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import {
  DESERT_FLOOR, DESERT_TALL, DESERT_WATER, DUNE_VARIANTS, PALM_CROWN, PALM_CROWN_ANCHOR, PALM_TRUNK, PALM_VARIANTS, PAVING_VARIANTS,
  RUIN_COLUMN_VARIANTS, RUIN_WALL_VARIANTS, SAND_VARIANTS, WET_VARIANTS, palmTop,
} from "./art/desertDecor.ts";
import { DESERT_TEXTURE, createDesertArt } from "./art/textures.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";
import { CAVE_VOID, caveTilesets, drawCave, drawCaveMouth } from "./caveMap.ts";

/** Fundo além das dunas: areia na sombra, para a borda do mapa não parecer um buraco. */
export const DESERT_VOID = 0xb98a4f;

/** Bits da camada de bordas: areia seca na molhada, margem do oásis, lábio das dunas e sombra delas. */
const EDGE = {
  fringe: [1, 2, 4, 8], // N, L, S, O
  shore: [16, 32, 64, 128], // N, L, S, O
  corner: [256, 512, 1024, 2048], // NE, NO, SE, SO
  outer: [262144, 524288, 1048576, 2097152], // NE, NO, SE, SO
  lip: [4096, 8192, 16384, 32768], // N, L, S, O
  shadeN: 65536,
  shadeW: 131072,
} as const;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const CORNERS = [[1, -1], [-1, -1], [1, 1], [-1, 1]] as const;

/** Tons dos coqueiros: o mesmo desenho com variação de cor (mais verde, mais amarelado, mais seco). */
const PALM_TINTS = [0xffffff, 0xffffff, 0xf2ffe0, 0xfff0d0, 0xe6f2d8, 0xfff8e8];
/** Sombra das manchas da areia: puxa para o ocre, como a areia fofa entre as dunas. */
const SAND_SHADE = [1, 0.86, 0.68] as const;

/**
 * Desenha o Mar de Areia. Em tilemaps: o chão (areia com ondulações fortes, suaves ou lisa, em manchas;
 * areia molhada na beira dos oásis), a água, o topo das dunas, as bordas (lábio das dunas, sombra delas na
 * areia, margem com espuma, areia seca entrando na molhada) e os enfeites rasteiros. Em sprites ordenados pela
 * linha de baixo, como os personagens: coqueiros (tronco e copa, com sombra no chão) e enfeites altos (papiro na
 * margem, capim seco, arbustos, arenito). Coqueiro é mata sem vizinho de mata nos 4 lados; o resto da mata é
 * duna (a regra do gerador). Tudo vem de `hash(x, y)`: todos veem o mesmo deserto, e nada muda a jogabilidade.
 */
export function drawDesert(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  createDesertArt(scene);
  const at = (x: number, y: number) => tileAt(d, x, y);
  const isWall = (x: number, y: number) => at(x, y) === Tile.Wall;
  const isPalm = (x: number, y: number) => isWall(x, y) && DIRS.every(([dx, dy]) => !isWall(x + dx, y + dy));
  const isDune = (x: number, y: number) => isWall(x, y) && !isPalm(x, y);
  const near = (x: number, y: number, reach: number, test: (t: number) => boolean) => {
    for (let dy = -reach; dy <= reach; dy++)
      for (let dx = -reach; dx <= reach; dx++)
        if ((dx || dy) && test(at(x + dx, y + dy))) return true;
    return false;
  };
  const water = (t: number) => t === Tile.Water;
  // Ruínas soterradas (salas dos mini-bosses): muro de arenito; a rocha do monte da caverna é desenhada à parte.
  const mouth = d.cave?.entrance;
  const isRuin = (x: number, y: number) => at(x, y) === Tile.Ruin && !(mouth && tileDistance(x, y, mouth.x, mouth.y) <= 2);
  const inRuins = (x: number, y: number) => d.side.some((r) => inRect(r, x, y));

  // Areia molhada: o anel em volta da água (inclusive debaixo dos coqueiros da margem).
  const wet = new Uint8Array(d.width * d.height);
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++)
      if (at(x, y) !== Tile.Water && !isDune(x, y) && near(x, y, 1, water)) wet[y * d.width + x] = 1;
  const isWet = (x: number, y: number) => x >= 0 && y >= 0 && x < d.width && y < d.height && wet[y * d.width + x] === 1;
  const isDry = (x: number, y: number) => at(x, y) !== Tile.Water && !isDune(x, y) && !isWet(x, y);

  const map = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  let firstGid = 0;
  const tileset = (key: string, count: number) => {
    const set = map.addTilesetImage(key, key, TILE_SIZE, TILE_SIZE, 0, 0, firstGid)!;
    const gid = firstGid;
    firstGid += count;
    return { set, gid };
  };
  const frames = (key: string) => Math.floor(scene.textures.get(key).getSourceImage().width / TILE_SIZE);
  const sand = tileset(DESERT_TEXTURE.sand, frames(DESERT_TEXTURE.sand));
  const wetSand = tileset(DESERT_TEXTURE.wet, WET_VARIANTS);
  const waterSet = tileset(DESERT_TEXTURE.water, 3);
  const dune = tileset(DESERT_TEXTURE.dune, DUNE_VARIANTS);
  const decorFloor = tileset(DESERT_TEXTURE.floor, frames(DESERT_TEXTURE.floor));
  const decorWater = tileset(DESERT_TEXTURE.waterDecor, frames(DESERT_TEXTURE.waterDecor));
  const paving = tileset(DESERT_TEXTURE.paving, PAVING_VARIANTS);
  const cave = d.cave ? caveTilesets(scene, d, tileset) : null;
  const under = (x: number) => isUnderground(d, x);

  // Bordas: cada combinação usada vira um quadro de uma textura montada aqui.
  const edgeMasks = new Uint32Array(d.width * d.height);
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (under(x)) continue;
      const t = at(x, y);
      let mask = 0;
      if (isDune(x, y)) {
        DIRS.forEach(([dx, dy], i) => { if (!isDune(x + dx, y + dy)) mask |= EDGE.lip[i]; });
      } else if (t === Tile.Water) {
        DIRS.forEach(([dx, dy], i) => { if (at(x + dx, y + dy) !== Tile.Water) mask |= EDGE.shore[i]; });
        CORNERS.forEach(([dx, dy], i) => {
          if (at(x + dx, y + dy) !== Tile.Water && at(x + dx, y) === Tile.Water && at(x, y + dy) === Tile.Water) mask |= EDGE.corner[i];
          if (at(x + dx, y) !== Tile.Water && at(x, y + dy) !== Tile.Water) mask |= EDGE.outer[i];
        });
      } else {
        if (isWet(x, y)) DIRS.forEach(([dx, dy], i) => { if (isDry(x + dx, y + dy)) mask |= EDGE.fringe[i]; });
        if (isDune(x, y - 1) || isRuin(x, y - 1)) mask |= EDGE.shadeN;
        if (isDune(x - 1, y) || isRuin(x - 1, y)) mask |= EDGE.shadeW;
      }
      edgeMasks[y * d.width + x] = mask;
    }
  }
  const edgeFrames = buildEdgeTexture(scene, edgeMasks);
  const edges = tileset(EDGE_TEXTURE, Math.max(1, edgeFrames.size));

  const caveSets = cave ? [cave.floor, cave.hall, cave.rockTop, cave.rockFace, cave.decor, cave.edges] : [];
  const sets = [sand, wetSand, waterSet, dune, decorFloor, decorWater, paving, edges, ...caveSets].map((t) => t.set);
  const groundLayer = map.createBlankLayer("chao", sets)!.setDepth(floorDepth);
  const edgeLayer = map.createBlankLayer("bordas", sets)!.setDepth(floorDepth);
  const decorLayer = map.createBlankLayer("enfeites", sets)!.setDepth(floorDepth);

  const culler = new ChunkCuller();
  const crowns: Phaser.GameObjects.Image[] = [];
  const tall = (frame: number, x: number, y: number) => {
    const img = culler.add(
      scene.add.image(x * TILE_SIZE, y * TILE_SIZE, DESERT_TEXTURE.tall, frame).setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.25), x, y);
    if (hash(x, y, 41) < 0.5) img.setFlipX(true);
  };
  const special = new Set([d.portal.y * d.width + d.portal.x]);

  /** Coqueiro no tile: sombra no chão, tronco e copa (que balança e fica transparente com alguém embaixo). */
  const palm = (x: number, y: number) => {
    const variant = Math.floor(hash(x, y, 50) * PALM_VARIANTS);
    const flip = hash(x, y, 51) < 0.5;
    const tint = PALM_TINTS[Math.floor(hash(x, y, 52) * PALM_TINTS.length)];
    const scale = 0.92 + hash(x, y, 53) * 0.16;
    const base = { x: x * TILE_SIZE + 16, y: y * TILE_SIZE + 28 };
    const foot = { x: PALM_TRUNK.w / 2, y: PALM_TRUNK.h - 4 };
    const top = palmTop(variant);
    const topX = (flip ? PALM_TRUNK.w - top.x : top.x) - foot.x;
    const depth = (y + 1) * TILE_SIZE;
    culler.add(scene.add.image(base.x - 18 * scale, base.y - 10 * scale, DESERT_TEXTURE.palmShadow)
      .setOrigin(0).setScale(scale).setDepth(floorDepth + 0.5), x, y);
    culler.add(scene.add.image(base.x, base.y, DESERT_TEXTURE.trunk, variant)
      .setOrigin(foot.x / PALM_TRUNK.w, foot.y / PALM_TRUNK.h).setFlipX(flip).setScale(scale).setTint(tint).setDepth(depth - 0.3), x, y);
    const crown = scene.add.image(base.x + topX * scale, base.y + (top.y - foot.y) * scale, DESERT_TEXTURE.crown, variant)
      .setOrigin(PALM_CROWN_ANCHOR.x / PALM_CROWN.w, PALM_CROWN_ANCHOR.y / PALM_CROWN.h)
      .setFlipX(flip).setScale(scale).setTint(tint).setDepth(depth - 0.2)
      .setData("phase", hash(x, y, 54) * Math.PI * 2);
    crowns.push(culler.add(crown, x, y));
  };

  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      if (under(x)) continue;
      const t = at(x, y);
      const i = y * d.width + x;
      if (edgeMasks[i]) edgeLayer.putTileAt(edges.gid + edgeFrames.get(edgeMasks[i])!, x, y);

      if (t === Tile.Water) {
        // Funda no meio do oásis, rasa na beira. No fundo, lótus e folhas boiando.
        const deep = DIRS.every(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
        groundLayer.putTileAt(waterSet.gid + (deep ? 2 : hash(x, y, 3) < 0.3 ? 1 : 0), x, y);
        const n = hash(x, y, 17);
        if (deep && n < 0.14) {
          const options = [DESERT_WATER.pad, DESERT_WATER.lotus, DESERT_WATER.pad, DESERT_WATER.leaves];
          decorLayer.putTileAt(decorWater.gid + options[Math.floor((n / 0.14) * options.length)], x, y);
        }
        continue;
      }
      if (isDune(x, y)) {
        groundLayer.putTileAt(dune.gid + Math.floor(hash(x, y, 5) * DUNE_VARIANTS), x, y).tint = patchTint(x, y, 0.9, SAND_SHADE, 9, 63);
        continue;
      }

      // Chão (também debaixo dos coqueiros): molhado na beira da água; seco em manchas de vento forte, fraco ou parado.
      const variant = hash(x, y, 7);
      const damp = near(x, y, 2, water) ? 0.9 : 1;
      if (inRuins(x, y)) {
        // Piso das ruínas: lajes meio cobertas de areia.
        groundLayer.putTileAt(paving.gid + Math.floor(variant * PAVING_VARIANTS), x, y).tint = patchTint(x, y, 0.88, SAND_SHADE);
      } else if (isWet(x, y)) {
        groundLayer.putTileAt(wetSand.gid + Math.floor(variant * WET_VARIANTS), x, y);
      } else {
        const wind = windField(x, y);
        const strength = wind > 0.6 ? 0 : wind > 0.36 ? 1 : 2;
        const pick = variant < 0.55 ? 0 : 1 + Math.floor(((variant - 0.55) / 0.45) * (SAND_VARIANTS - 1));
        const tile = groundLayer.putTileAt(sand.gid + strength * SAND_VARIANTS + pick, x, y);
        tile.tint = shadeTint(patchTint(x, y, 0.84, SAND_SHADE), damp);
      }
      if (isPalm(x, y)) { palm(x, y); continue; }
      if (isRuin(x, y)) {
        // Pedra ligada a outra vira trecho de muro; pedra sozinha, coluna caída (como nas ruínas do pântano).
        const joined = DIRS.some(([dx, dy]) => isRuin(x + dx, y + dy));
        const frame = joined ? Math.floor(hash(x, y, 60) * RUIN_WALL_VARIANTS) : RUIN_WALL_VARIANTS + Math.floor(hash(x, y, 61) * RUIN_COLUMN_VARIANTS);
        culler.add(scene.add.image(x * TILE_SIZE, y * TILE_SIZE, DESERT_TEXTURE.ruins, frame).setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.3), x, y);
        continue;
      }
      // Monte de rocha e boca da caverna: só a areia por baixo (o desenho do monte vem depois, inteiro).
      if (special.has(i) || t === Tile.Ruin || t === Tile.Cave) continue;

      const decor = (frame: number) => decorLayer.putTileAt(decorFloor.gid + frame, x, y);
      const n = hash(x, y, 23);
      const m = hash(x, y, 24);
      const byWater = DIRS.some(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
      const byPalm = near(x, y, 1, (v) => v === Tile.Wall) && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => isPalm(x + dx, y + dy)));
      const byDune = near(x, y, 1, (v) => v === Tile.Wall) && !byPalm;

      if (inRuins(x, y)) {
        // Dentro das ruínas: entulho, ossos de quem não saiu e uma pedra caída de vez em quando.
        if (n < 0.08) decor(m < 0.5 ? DESERT_FLOOR.pebblesB : m < 0.8 ? DESERT_FLOOR.stone : DESERT_FLOOR.skull);
        continue;
      }

      if (byWater) {
        // Margem: papiro de pé junto da água; no resto, conchas e pegadas na areia molhada.
        if (n < 0.38) tall(m < 0.5 ? DESERT_TALL.papyrusA : DESERT_TALL.papyrusB, x, y);
        else if (n < 0.44) decor(DESERT_FLOOR.shells);
      } else if (byPalm && n < 0.22) {
        // Pé dos coqueiros: cocos e folhas secas caídas, capim e coqueiros novos.
        if (m < 0.35) decor(DESERT_FLOOR.coconuts);
        else if (m < 0.62) decor(DESERT_FLOOR.frond);
        else if (m < 0.85) tall(DESERT_TALL.grass, x, y);
        else tall(DESERT_TALL.sapling, x, y);
      } else if (byDune && n < 0.06) {
        decor(m < 0.6 ? DESERT_FLOOR.pebblesA : DESERT_FLOOR.stone);
      } else if (n < 0.05) {
        // Campo aberto: pouca coisa, para o vazio do deserto continuar vazio.
        if (m < 0.18) decor(m < 0.09 ? DESERT_FLOOR.pebblesA : DESERT_FLOOR.pebblesB);
        else if (m < 0.3) decor(DESERT_FLOOR.snake);
        else if (m < 0.4) decor(DESERT_FLOOR.tracks);
        else if (m < 0.5) tall(DESERT_TALL.bush, x, y);
        else if (m < 0.6) tall(DESERT_TALL.grass, x, y);
        else if (m < 0.68) decor(DESERT_FLOOR.cracked);
        else if (m < 0.76) decor(DESERT_FLOOR.flowers);
        else if (m < 0.84) decor(DESERT_FLOOR.stone);
        else if (m < 0.9) tall(DESERT_TALL.sandstone, x, y);
        else if (m < 0.95) decor(DESERT_FLOOR.shells);
        else decor(DESERT_FLOOR.skull);
      }
    }
  }

  // Caverna: a boca na superfície e o subterrâneo inteiro.
  let lights: Phaser.GameObjects.Image[] = [];
  if (cave) {
    drawCaveMouth(scene, d, culler);
    lights = drawCave(scene, d, cave, { ground: groundLayer, edges: edgeLayer, decor: decorLayer }, culler, floorDepth);
  }

  return createAmbience(scene, d, uiDepth, culler, crowns, lights);
}

/** Manchas de vento (0..1): onde a areia tem ondulação forte, suave ou nenhuma. Ruído suave em grade de 6 tiles. */
function windField(x: number, y: number) {
  const cell = 6;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = smooth(x / cell - gx);
  const fy = smooth(y / cell - gy);
  const top = lerp(hash(gx, gy, 71), hash(gx + 1, gy, 71), fx);
  const bottom = lerp(hash(gx, gy + 1, 71), hash(gx + 1, gy + 1, 71), fx);
  return lerp(top, bottom, fy);
}

/** Escurece um tint (multiplica os 3 canais). */
function shadeTint(tint: number, k: number) {
  if (k === 1) return tint;
  const c = (shift: number) => Math.round(((tint >> shift) & 255) * k) << shift;
  return c(16) | c(8) | c(0);
}

const EDGE_TEXTURE = "desert-edges";

/**
 * Monta a textura das bordas: um quadro 32×32 por combinação que aparece no mapa (dezenas, não milhares).
 * Devolve máscara → índice do quadro.
 */
function buildEdgeTexture(scene: Phaser.Scene, masks: Uint32Array) {
  const used = [...new Set(masks)].filter(Boolean).sort((a, b) => a - b);
  const frames = new Map(used.map((mask, i) => [mask, i]));
  if (scene.textures.exists(EDGE_TEXTURE)) scene.textures.remove(EDGE_TEXTURE);
  const source = (key: string) => scene.textures.get(key).getSourceImage() as CanvasImageSource;
  const fringe = source(DESERT_TEXTURE.fringe);
  const shore = source(DESERT_TEXTURE.shore);
  const lip = source(DESERT_TEXTURE.lip);
  const shade = source(DESERT_TEXTURE.shade);
  const { canvas, ctx } = makeCanvas(TILE_SIZE * Math.max(1, used.length), TILE_SIZE);
  const draw = (img: CanvasImageSource, frame: number, at: number) =>
    ctx.drawImage(img, frame * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, at * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  used.forEach((mask, i) => {
    // Ordem: sombra embaixo; lábio da duna com a encosta da frente por último (ela cobre as quinas).
    if (mask & EDGE.shadeN) draw(shade, 0, i);
    if (mask & EDGE.shadeW) draw(shade, 1, i);
    EDGE.shore.forEach((bit, k) => { if (mask & bit) draw(shore, k, i); });
    EDGE.corner.forEach((bit, k) => { if (mask & bit) draw(shore, 4 + k, i); });
    EDGE.outer.forEach((bit, k) => { if (mask & bit) draw(shore, 8 + k, i); });
    EDGE.fringe.forEach((bit, k) => { if (mask & bit) draw(fringe, k, i); });
    for (const k of [0, 1, 3, 2]) if (mask & EDGE.lip[k]) draw(lip, k, i);
  });
  scene.textures.addCanvas(EDGE_TEXTURE, canvas);
  return frames;
}

/** Nuvens de poeira em volta da câmera. */
const DUST_COUNT = 5;
/** Intervalo entre brilhos do sol na água à vista (ms). */
const GLINT_EVERY_MS = 160;

/**
 * Ambiente que acompanha a câmera: grãos de areia levados pelo vento, nuvens de poeira baixas passando, o sol
 * brilhando na água dos oásis e as copas dos coqueiros balançando (a copa fica transparente com alguém embaixo).
 */
function createAmbience(
  scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller, crowns: Phaser.GameObjects.Image[], lights: Phaser.GameObjects.Image[],
): MapAmbience {
  const cam = scene.cameras.main;
  const game = document.getElementById("game");
  let below: boolean | null = null;

  const grains = scene.add.particles(0, 0, DESERT_TEXTURE.grain, {
    lifespan: { min: 1400, max: 2600 },
    speedX: { min: 70, max: 140 },
    speedY: { min: -6, max: 10 },
    alpha: { values: [0, 0.8, 0.6, 0], interpolation: "linear" },
    frequency: 70,
    quantity: 1,
    maxAliveParticles: 36,
    emitZone: {
      type: "random",
      source: new Phaser.Geom.Rectangle(0, 0, 1, 1),
      quantity: 1,
    } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (grains.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;

  const dust = Array.from({ length: DUST_COUNT }, (_, i) =>
    scene.add.image(0, 0, DESERT_TEXTURE.dust)
      .setScale(2 + hash(i, 61) * 1.5)
      .setAlpha(0.35 + hash(i, 62) * 0.3)
      .setDepth(uiDepth - 5)
      .setData("speed", 14 + hash(i, 63) * 14));
  let dustPlaced = false;

  const visible = new Set<Phaser.GameObjects.GameObject>();
  let nextGlint = 0;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);

      // Na caverna: sem vento nem poeira, fundo quase preto e cantos bem escuros; as luzes dos cristais respiram.
      const inCave = isUnderground(d, Math.floor(v.centerX / TILE_SIZE));
      if (inCave !== below) {
        below = inCave;
        grains.setVisible(!inCave);
        grains.emitting = !inCave;
        dust.forEach((m) => m.setVisible(!inCave));
        cam.setBackgroundColor(inCave ? CAVE_VOID : DESERT_VOID);
        game?.classList.toggle("cave", inCave);
      }
      if (inCave) {
        for (const l of lights) {
          if (l.visible) l.setAlpha(l.getData("alpha") * (0.85 + 0.15 * Math.sin(time / 700 + l.getData("phase"))));
        }
        return;
      }
      zone.setTo(v.x - 40, v.y, v.width + 40, v.height);

      // Poeira: espalha na primeira vez; depois anda com o vento e reaparece do outro lado da tela.
      const dt = scene.game.loop.delta / 1000;
      dust.forEach((m, i) => {
        if (!dustPlaced) m.setPosition(v.x + hash(i, 64) * v.width, v.y + hash(i, 65) * v.height);
        m.x += m.getData("speed") * dt;
        const margin = m.displayWidth / 2;
        if (m.x - margin > v.right) m.x = v.x - margin;
        else if (m.x + margin < v.x) m.x = v.right + margin;
        if (m.y - m.displayHeight / 2 > v.bottom) m.y = v.y - m.displayHeight / 2;
        else if (m.y + m.displayHeight / 2 < v.y) m.y = v.bottom + m.displayHeight / 2;
      });
      dustPlaced = true;

      // Copas à vista: balançam com o vento; a que cobre o meio da tela (o jogador) fica transparente.
      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const mx = v.centerX;
      const my = v.centerY;
      for (const crown of crowns) {
        if (!visible.has(crown)) continue;
        crown.rotation = Math.sin(time / 1100 + crown.getData("phase")) * 0.035;
        const over = Math.abs(mx - crown.x) < 44 * crown.scaleX && my > crown.y - 30 && my < crown.y + 40 * crown.scaleY;
        crown.setAlpha(over ? 0.5 : 1);
      }

      // Brilho do sol num tile de água qualquer à vista.
      if (time < nextGlint) return;
      nextGlint = time + GLINT_EVERY_MS;
      const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
      const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
      if (tileAt(d, x, y) !== Tile.Water) return;
      const glint = scene.add.sprite(x * TILE_SIZE + Math.random() * 24 - 4, y * TILE_SIZE + Math.random() * 24 - 4, DESERT_TEXTURE.glint)
        .setDepth((y + 1) * TILE_SIZE - 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      glint.play(DESERT_TEXTURE.glint);
      glint.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => glint.destroy());
    },
  };
}


const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
