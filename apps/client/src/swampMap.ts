import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { DECOR_FLOOR, DECOR_TALL, DECOR_WATER } from "./art/swampDecor.ts";
import { SWAMP_DECOR, SWAMP_TEXTURE, createSwampArt, floorVariants } from "./art/textures.ts";

/** Fundo além da mata: verde quase preto, como a copa fechada da floresta. */
export const SWAMP_VOID = 0x0b140a;

/** Tipo de chão de cada tile andável, para escolher ladrilho, transição e enfeites. */
const enum Ground { Grass, Mud, Stone }

/** Bits da camada de bordas: franja de capim, espuma da margem, cantos da margem e sombra. */
const EDGE = {
  fringe: [1, 2, 4, 8], // N, L, S, O
  shore: [16, 32, 64, 128], // N, L, S, O
  corner: [256, 512, 1024, 2048], // NE, NO, SE, SO
  shadeN: 4096,
  shadeW: 8192,
} as const;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const CORNERS = [[1, -1], [-1, -1], [1, 1], [-1, 1]] as const;

/** Tons das árvores: a mesma árvore do pack com variação de cor, para a mata não parecer carimbada. */
const TREE_TINTS = [0xffffff, 0xffffff, 0xe6f0d6, 0xd2e2c0, 0xfff2d6, 0xc8d8c0];

/** O que a cena precisa chamar a cada quadro para o ambiente (vaga-lumes, ondinhas e névoa) acompanhar a câmera. */
export interface SwampAmbience {
  update(time: number): void;
}

/**
 * Desenha o Pântano das Ruínas. Em tilemaps (o Phaser só desenha o que está na tela): o chão (capim,
 * lama perto da água, pedra nas ruínas), a água, as bordas (capim invadindo lama e pedra, espuma na
 * margem, sombra das árvores e muros), os enfeites rasteiros e a mata fechada. Em sprites ordenados
 * pela linha de baixo, como os personagens: árvores da beira da mata, muros, colunas e enfeites altos
 * (taboas na margem, samambaias, arbustos, tocos). Tudo vem de `hash(x, y)`: todos os jogadores veem
 * o mesmo mapa, e nada disso muda a jogabilidade.
 */
export function drawSwamp(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): SwampAmbience {
  createSwampArt(scene);
  const at = (x: number, y: number) => tileAt(d, x, y);
  const ruins = [d.boss, ...d.side];
  const inRuins = (x: number, y: number) => ruins.some((r) => inside(r, x, y));
  const around = (x: number, y: number, test: (t: number) => boolean) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && test(at(x + dx, y + dy))) return true;
    return false;
  };
  const walk = (t: number) => t === Tile.Floor || t === Tile.Portal || t === Tile.Ruin;
  const blocks = (t: number) => t === Tile.Wall || t === Tile.Ruin;

  // Tipo de chão de cada tile (vale também para o chão por baixo de muros e colunas).
  const ground = new Uint8Array(d.width * d.height);
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++)
      ground[y * d.width + x] = inRuins(x, y) ? Ground.Stone : around(x, y, (n) => n === Tile.Water) ? Ground.Mud : Ground.Grass;
  const groundAt = (x: number, y: number) => (walk(at(x, y)) ? ground[y * d.width + x] : -1);

  /** Metade dos tiles usa a primeira variação; o resto se espalha pelas outras. */
  const pick = (x: number, y: number, count: number) => {
    const n = hash(x, y);
    return n < 0.5 ? 0 : 1 + Math.floor((n - 0.5) * 2 * (count - 1));
  };

  const map = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  let firstGid = 0;
  const tileset = (key: string) => {
    const count = floorVariants(scene, key);
    const set = map.addTilesetImage(key, key, TILE_SIZE, TILE_SIZE, 0, 0, firstGid)!;
    const gid = firstGid;
    firstGid += count;
    return { set, gid, count };
  };
  const grass = tileset(SWAMP_TEXTURE.grass);
  const mud = tileset(SWAMP_TEXTURE.mud);
  const stone = tileset(SWAMP_TEXTURE.ruins);
  const forest = tileset(SWAMP_TEXTURE.forest);
  const water = tileset(SWAMP_TEXTURE.water);
  const canopy = tileset(SWAMP_TEXTURE.tree);
  const decorFloor = tileset(SWAMP_DECOR.floor);
  const decorWater = tileset(SWAMP_DECOR.water);

  // Bordas: cada combinação usada de franja, margem e sombra vira um quadro de uma textura montada aqui.
  const edgeMasks = new Uint16Array(d.width * d.height);
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const t = at(x, y);
      let mask = 0;
      const g = groundAt(x, y);
      if (g === Ground.Mud || g === Ground.Stone) {
        DIRS.forEach(([dx, dy], i) => { if (groundAt(x + dx, y + dy) === Ground.Grass) mask |= EDGE.fringe[i]; });
      }
      if (t === Tile.Water) {
        DIRS.forEach(([dx, dy], i) => { if (at(x + dx, y + dy) !== Tile.Water) mask |= EDGE.shore[i]; });
        CORNERS.forEach(([dx, dy], i) => {
          if (at(x + dx, y + dy) !== Tile.Water && at(x + dx, y) === Tile.Water && at(x, y + dy) === Tile.Water) mask |= EDGE.corner[i];
        });
      }
      if (t !== Tile.Wall && t !== Tile.Ruin) {
        if (blocks(at(x, y - 1))) mask |= EDGE.shadeN;
        if (blocks(at(x - 1, y))) mask |= EDGE.shadeW;
      }
      edgeMasks[y * d.width + x] = mask;
    }
  }
  const edgeFrames = buildEdgeTexture(scene, edgeMasks);
  const edges = tileset(EDGE_TEXTURE);

  const sets = [grass, mud, stone, forest, water, canopy, decorFloor, decorWater, edges].map((t) => t.set);
  const groundLayer = map.createBlankLayer("chao", sets)!.setDepth(floorDepth);
  const edgeLayer = map.createBlankLayer("bordas", sets)!.setDepth(floorDepth);
  const decorLayer = map.createBlankLayer("enfeites", sets)!.setDepth(floorDepth);
  // Copa da mata longe do chão: árvores achatadas no tilemap, porque ninguém anda atrás delas.
  const deepLayer = map.createBlankLayer("copa", sets)!.setDepth(floorDepth);

  const treeFrames = floorVariants(scene, SWAMP_TEXTURE.tree);
  const wallFrames = floorVariants(scene, SWAMP_TEXTURE.ruinWall);
  const columnFrames = floorVariants(scene, SWAMP_TEXTURE.column);
  // Sprites parados (árvores, muros, enfeites altos) ficam em blocos; só os blocos perto da câmera são desenhados.
  const chunks = new Map<number, Phaser.GameObjects.Image[]>();
  const sprite = (key: string, frame: number, x: number, y: number, depth = (y + 1) * TILE_SIZE) => {
    const img = scene.add.image(x * TILE_SIZE, y * TILE_SIZE, key, frame).setOrigin(0).setDepth(depth).setVisible(false);
    const chunk = chunkOf(x, y);
    if (!chunks.has(chunk)) chunks.set(chunk, []);
    chunks.get(chunk)!.push(img);
    return img;
  };
  // Enfeite alto fica logo atrás de quem pisa no mesmo tile (personagens ficam em (y+1)·32 + 0,5).
  const tall = (frame: number, x: number, y: number) => {
    const img = sprite(SWAMP_DECOR.tall, frame, x, y, (y + 1) * TILE_SIZE - 0.25);
    if (hash(x, y, 41) < 0.5) img.setFlipX(true);
  };
  const special = new Set([d.portal.y * d.width + d.portal.x]);
  const boss = { x: Math.floor(d.boss.x + d.boss.w / 2), y: Math.floor(d.boss.y + d.boss.h / 2) };
  special.add(boss.y * d.width + boss.x);

  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const t = at(x, y);
      const i = y * d.width + x;
      if (edgeMasks[i]) edgeLayer.putTileAt(edges.gid + edgeFrames.get(edgeMasks[i])!, x, y);

      if (t === Tile.Water) {
        // Água funda no meio da lagoa; na beira, rasa (às vezes mexida). No meio, vitórias-régias e lentilha-d'água.
        const deepWater = DIRS.every(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
        groundLayer.putTileAt(water.gid + (deepWater ? 2 : hash(x, y, 3) < 0.25 ? 1 : 0), x, y);
        const n = hash(x, y, 17);
        if (deepWater && n < 0.16) {
          const frames = [DECOR_WATER.pad, DECOR_WATER.pads, DECOR_WATER.flower, DECOR_WATER.duckweedA, DECOR_WATER.duckweedB];
          decorLayer.putTileAt(decorWater.gid + frames[Math.floor((n / 0.16) * frames.length)], x, y);
        }
        continue;
      }
      if (t === Tile.Wall) {
        groundLayer.putTileAt(forest.gid + pick(x, y, forest.count), x, y);
        const tree = Math.floor(hash(x, y, 5) * treeFrames);
        const tint = TREE_TINTS[Math.floor(hash(x, y, 6) * TREE_TINTS.length)];
        if (around(x, y, (n) => n !== Tile.Wall)) sprite(SWAMP_TEXTURE.tree, tree, x, y).setTint(tint);
        else deepLayer.putTileAt(canopy.gid + tree, x, y).tint = tint;
        continue;
      }

      const g = ground[i];
      const floor = g === Ground.Stone ? stone : g === Ground.Mud ? mud : grass;
      groundLayer.putTileAt(floor.gid + pick(x, y, floor.count), x, y).tint = patchTint(x, y);
      if (t === Tile.Ruin) {
        // Pedra ligada a outra vira trecho de muro; pedra sozinha, coluna caída.
        const joined = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes(Tile.Ruin);
        if (joined) sprite(SWAMP_TEXTURE.ruinWall, Math.floor(hash(x, y, 9) * wallFrames), x, y);
        else sprite(SWAMP_TEXTURE.column, Math.floor(hash(x, y, 11) * columnFrames), x, y);
        continue;
      }
      if (special.has(i)) continue;

      const decor = (frame: number) => decorLayer.putTileAt(decorFloor.gid + frame, x, y);
      const n = hash(x, y, 23);
      const byWater = DIRS.some(([dx, dy]) => at(x + dx, y + dy) === Tile.Water);
      const byTrees = around(x, y, (v) => v === Tile.Wall);
      const byRuins = around(x, y, (v) => v === Tile.Ruin);

      if (g === Ground.Stone) {
        // Ruínas: entulho, musgo e, de vez em quando, ossos de quem não saiu.
        if (n < 0.05) decor(DECOR_FLOOR.moss);
        else if (n < 0.085) decor(hash(x, y, 24) < 0.5 ? DECOR_FLOOR.rubbleA : DECOR_FLOOR.rubbleB);
        else if (n < 0.095) decor(DECOR_FLOOR.bones);
      } else if (g === Ground.Mud) {
        // Margem: taboas de pé junto da água; no resto, poças, gravetos e pedrinhas.
        if (byWater && n < 0.4) tall(hash(x, y, 25) < 0.5 ? DECOR_TALL.cattailsA : DECOR_TALL.cattailsB, x, y);
        else if (n < 0.5) decor(DECOR_FLOOR.puddle);
        else if (n < 0.56) decor(DECOR_FLOOR.twig);
        else if (n < 0.6) decor(DECOR_FLOOR.pebblesB);
      } else if (byRuins && n < 0.2) {
        decor(hash(x, y, 26) < 0.5 ? DECOR_FLOOR.rubbleA : DECOR_FLOOR.rubbleB);
      } else if (byTrees && n < 0.16) {
        // Pé das árvores: samambaias, arbustos e cogumelos.
        const m = hash(x, y, 27);
        if (m < 0.35) tall(DECOR_TALL.fern, x, y);
        else if (m < 0.55) tall(DECOR_TALL.bush, x, y);
        else if (m < 0.75) decor(m < 0.65 ? DECOR_FLOOR.mushroomsBrown : DECOR_FLOOR.mushroomsRed);
        else decor(DECOR_FLOOR.leaves);
      } else if (n < 0.075) {
        // Campo aberto: um pouco de tudo, sem poluir.
        const m = hash(x, y, 28);
        if (m < 0.22) tall(DECOR_TALL.grass, x, y);
        else if (m < 0.42) decor(m < 0.32 ? DECOR_FLOOR.flowersWhite : DECOR_FLOOR.flowersPurple);
        else if (m < 0.6) decor(m < 0.51 ? DECOR_FLOOR.pebblesA : DECOR_FLOOR.pebblesB);
        else if (m < 0.72) decor(DECOR_FLOOR.leaves);
        else if (m < 0.82) decor(DECOR_FLOOR.twig);
        else if (m < 0.9) tall(DECOR_TALL.stump, x, y);
        else if (m < 0.95) tall(DECOR_TALL.log, x, y);
        else decor(DECOR_FLOOR.mushroomsBrown);
      }
    }
  }

  return createAmbience(scene, d, uiDepth, chunks);
}

/** Lado (em tiles) dos blocos de sprites que ligam e desligam conforme a câmera anda. */
const CHUNK = 8;
const chunkOf = (x: number, y: number) => Math.floor(y / CHUNK) * 1024 + Math.floor(x / CHUNK);

/**
 * Manchas grandes de luz e sombra no chão (ruído suave em grade de 7 tiles): o campo deixa de parecer
 * chapado. O tint só escurece, então o tom vai de 82% a 100% do ladrilho.
 */
function patchTint(x: number, y: number) {
  const cell = 7;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = smooth(x / cell - gx);
  const fy = smooth(y / cell - gy);
  const top = lerp(hash(gx, gy, 61), hash(gx + 1, gy, 61), fx);
  const bottom = lerp(hash(gx, gy + 1, 61), hash(gx + 1, gy + 1, 61), fx);
  const light = 0.82 + 0.18 * lerp(top, bottom, fy);
  // Sombra puxa levemente para o verde-azulado, como luz filtrada pelas copas.
  const r = Math.round(255 * light * 0.97);
  const g = Math.round(255 * light);
  const b = Math.round(255 * light * 0.95);
  return (r << 16) | (g << 8) | b;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

const EDGE_TEXTURE = "swamp-edges";

/**
 * Monta a textura das bordas: um quadro 32×32 por combinação de franja, margem e sombra que aparece no
 * mapa (dezenas, não milhares). Devolve máscara → índice do quadro.
 */
function buildEdgeTexture(scene: Phaser.Scene, masks: Uint16Array) {
  const used = [...new Set(masks)].filter(Boolean).sort((a, b) => a - b);
  const frames = new Map(used.map((mask, i) => [mask, i]));
  if (scene.textures.exists(EDGE_TEXTURE)) scene.textures.remove(EDGE_TEXTURE);
  const fringe = scene.textures.get(SWAMP_TEXTURE.fringe).getSourceImage() as CanvasImageSource;
  const shore = scene.textures.get(SWAMP_TEXTURE.shore).getSourceImage() as CanvasImageSource;
  const shade = scene.textures.get(SWAMP_DECOR.shade).getSourceImage() as CanvasImageSource;
  const { canvas, ctx } = makeCanvas(TILE_SIZE * Math.max(1, used.length), TILE_SIZE);
  const draw = (source: CanvasImageSource, frame: number, at: number) =>
    ctx.drawImage(source, frame * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, at * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  used.forEach((mask, i) => {
    // Ordem: sombra embaixo, depois espuma e franja de capim por cima.
    if (mask & EDGE.shadeN) draw(shade, 0, i);
    if (mask & EDGE.shadeW) draw(shade, 1, i);
    EDGE.shore.forEach((bit, k) => { if (mask & bit) draw(shore, k, i); });
    EDGE.corner.forEach((bit, k) => { if (mask & bit) draw(shore, 4 + k, i); });
    EDGE.fringe.forEach((bit, k) => { if (mask & bit) draw(fringe, k, i); });
  });
  scene.textures.addCanvas(EDGE_TEXTURE, canvas);
  return frames;
}

/** Quantas névoas flutuam em volta da câmera. */
const MIST_COUNT = 7;
/** Intervalo entre ondinhas na água à vista (ms). */
const RIPPLE_EVERY_MS = 280;

/**
 * Ambiente que acompanha a câmera: vaga-lumes piscando, ondinhas que se abrem nas lagoas à vista e
 * névoa baixa passando devagar. Tudo por cima do mapa e abaixo das barras de vida.
 */
function createAmbience(scene: Phaser.Scene, d: Dungeon, uiDepth: number, chunks: Map<number, Phaser.GameObjects.Image[]>): SwampAmbience {
  const cam = scene.cameras.main;
  const view = () => cam.worldView;

  // Blocos visíveis: os que tocam a tela, com um bloco de folga em volta (nada aparece "do nada" na borda).
  let shown = new Set<number>();
  const cull = (v: Phaser.Geom.Rectangle) => {
    const span = CHUNK * TILE_SIZE;
    const x0 = Math.floor(v.x / span) - 1;
    const y0 = Math.floor(v.y / span) - 1;
    const x1 = Math.floor(v.right / span) + 1;
    const y1 = Math.floor(v.bottom / span) + 1;
    const next = new Set<number>();
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) next.add(cy * 1024 + cx);
    for (const c of shown) if (!next.has(c)) chunks.get(c)?.forEach((img) => img.setVisible(false));
    for (const c of next) if (!shown.has(c)) chunks.get(c)?.forEach((img) => img.setVisible(true));
    shown = next;
  };

  const fireflies = scene.add.particles(0, 0, SWAMP_DECOR.firefly, {
    lifespan: { min: 3500, max: 7000 },
    speed: { min: 3, max: 12 },
    angle: { min: 0, max: 360 },
    alpha: { values: [0, 1, 0.25, 0.9, 0.15, 1, 0], interpolation: "linear" },
    scale: { min: 0.7, max: 1.1 },
    frequency: 260,
    quantity: 1,
    maxAliveParticles: 22,
    blendMode: Phaser.BlendModes.ADD,
    emitZone: {
      type: "random",
      source: new Phaser.Geom.Rectangle(0, 0, 1, 1),
      quantity: 1,
    } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (fireflies.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;

  const mists = Array.from({ length: MIST_COUNT }, (_, i) =>
    scene.add.image(0, 0, SWAMP_DECOR.mist)
      .setScale(2 + hash(i, 51) * 1.5)
      .setAlpha(0.3 + hash(i, 52) * 0.25)
      .setDepth(uiDepth - 5)
      .setData("speed", 4 + hash(i, 53) * 6));
  let mistPlaced = false;

  let nextRipple = 0;
  return {
    update(time: number) {
      const v = view();
      if (v.width === 0) return;
      zone.setTo(v.x, v.y, v.width, v.height);
      cull(v);

      // Névoa: espalha na primeira vez; depois anda para a direita e reaparece do outro lado da tela.
      const dt = scene.game.loop.delta / 1000;
      mists.forEach((m, i) => {
        if (!mistPlaced) m.setPosition(v.x + hash(i, 54) * v.width, v.y + hash(i, 55) * v.height);
        m.x += m.getData("speed") * dt;
        const margin = m.displayWidth / 2;
        if (m.x - margin > v.right) m.x = v.x - margin;
        else if (m.x + margin < v.x) m.x = v.right + margin;
        if (m.y - m.displayHeight / 2 > v.bottom) m.y = v.y - m.displayHeight / 2;
        else if (m.y + m.displayHeight / 2 < v.y) m.y = v.bottom + m.displayHeight / 2;
      });
      mistPlaced = true;

      // Ondinha num tile de água qualquer à vista.
      if (time < nextRipple) return;
      nextRipple = time + RIPPLE_EVERY_MS;
      const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
      const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
      if (tileAt(d, x, y) !== Tile.Water) return;
      const ripple = scene.add.sprite(x * TILE_SIZE + Math.random() * 16 + 8, y * TILE_SIZE + Math.random() * 16 + 8, SWAMP_DECOR.ripple)
        .setDepth((y + 1) * TILE_SIZE - 0.5);
      ripple.play(SWAMP_DECOR.ripple);
      ripple.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => ripple.destroy());
    },
  };
}

function inside(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
