import * as Phaser from "phaser";
import { TILE_SIZE, Tile, isUnderground, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import {
  HD, OPEN, PALM, TALL, TALL_DECOR, TileAtlas, draw, duneTile, flatDecor, mesaTile, palmCrown, palmTrunk, pillar,
  ruinTile, shadowEdge, softEdge, tallDecor, toCanvas, waterTile, wetEdge, type DuneVariant, type FlatDecor, type TallDecor,
} from "./art/duneArt.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";
import { MOUTH, SHAFT, caveMouth, caveShaft } from "./art/caveArt.ts";
import { drawCaveHd, flickerLights } from "./cavernMap.ts";
import { addCanvasTexture } from "./art/canvasTexture.ts";

/** Fundo além das bordas: areia na sombra de cada variante. */
export const DUNES_VOID = 0xa8784a;
export const MESAS_VOID = 0x8a4a30;
export const DESERT_VOID = 0xb98a4f;
/** Fundo do subterrâneo do Mar de Areia: quase preto, puxado para o marrom. */
export const CAVE_VOID = 0x0d0806;

/** Arte de 128 px por tile, desenhada em ¼ (sempre a arte nova: estes mapas não têm a antiga). */
const ZOOM = HD / TILE_SIZE;
const ATLAS = "dunes-atlas";
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

/** Variações de cada chão: metade dos tiles usa a primeira, o resto se espalha. */
const SAND_VARIANTS = 6;
const SOFT_VARIANTS = 4;
const ARENA_VARIANTS = 2;
const DUNE_VARIANTS = 1;
const MESA_VARIANTS = 2;
const WATER_VARIANTS = 2;
const PALM_VARIANTS = 4;
const PILLAR_VARIANTS = 3;
/** Distância (tiles) até onde a altura da duna sobe: 4 tiles dentro da cordilheira já é o alto. */
const DUNE_TOP = 4;

/**
 * Desenha Dunas Cantantes e Mesas de Solária (o mesmo gerador, `generateDunes`). Em tilemaps de 128 px (um atlas só,
 * com os quadros que o mapa usa): o chão (areia firme com ondulações, areia fofa, sal ou laje da arena), o relevo
 * (dunas pela altura nos cantos de cada tile; nas Mesas, platôs com o paredão em camadas na face sul), os muros das
 * ruínas, a água do oásis, as bordas (areia fofa entrando na firme, areia molhada, sombra do relevo) e os enfeites
 * rasteiros. Em sprites ordenados pela linha de baixo: coqueiros (tronco e copa), pedras cantantes ou pilares e os
 * enfeites de pé. Mata sem mata nos 4 lados é coqueiro (perto da água, nas Mesas; sempre, nas Dunas) ou pilar; ruína
 * sem ruína nos 4 lados é pedra cantante. Tudo vem de `hash(x, y)`: todos veem o mesmo, e nada muda a jogabilidade.
 */
export function drawDunes(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const variant: DuneVariant = d.mapId === "mesas" ? "mesas" : d.mapId === "desert" ? "desert" : "dunes";
  const mesas = variant === "mesas";
  /** Mar de Areia: as dunas são blocos soltos, sem arena; as ruínas soterradas e a caverna com o subterrâneo. */
  const desert = variant === "desert";
  /** Colunas do subterrâneo (desenhadas pela caverna, `drawCaveHd`). */
  const under = (x: number) => !!d.cave && isUnderground(d, x);
  /** Monte de rocha da boca da caverna: as pedras em volta da entrada (o desenho do monte vem inteiro, por cima). */
  const mouth = d.cave?.entrance;
  const mound = (x: number, y: number) => !!mouth && tileAt(d, x, y) === Tile.Ruin && Math.max(Math.abs(x - mouth.x), Math.abs(y - mouth.y)) <= 2;
  const W = d.width;
  const H = d.height;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const wall = (x: number, y: number) => at(x, y) === Tile.Wall;
  const ruin = (x: number, y: number) => at(x, y) === Tile.Ruin && x >= 0 && y >= 0 && x < W && y < H && !mound(x, y);
  const lone = (x: number, y: number, test: (x: number, y: number) => boolean) => test(x, y) && DIRS.every(([dx, dy]) => !test(x + dx, y + dy));
  /** Mata de 1 tile: coqueiro ou pilar (o chão em volta aparece). */
  const prop = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && lone(x, y, wall);
  /** Relevo: duna ou platô (mata que não é de 1 tile). */
  const solid = (x: number, y: number) => wall(x, y) && !prop(x, y);
  const stone = (x: number, y: number) => lone(x, y, ruin);
  const water = (x: number, y: number) => at(x, y) === Tile.Water;
  const soft = (x: number, y: number) => at(x, y) === Tile.Sand;
  const near = (x: number, y: number, reach: number, test: (x: number, y: number) => boolean) => {
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (test(x + dx, y + dy)) return true;
    return false;
  };
  const arenaCenter = { x: d.boss.x + Math.floor(d.boss.w / 2), y: d.boss.y + Math.floor(d.boss.h / 2) };
  const inArena = (x: number, y: number) => !desert && Math.hypot((x - arenaCenter.x) / 1.1, y - arenaCenter.y) <= 8.6;
  const inRuins = (x: number, y: number) => d.side.some((r) => inRect(r, x, y));

  // Altura das dunas: distância (contando diagonais) até o que não é relevo, no máximo `DUNE_TOP`.
  const dist = new Uint8Array(W * H);
  if (!mesas) {
    const queue: number[] = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (solid(x, y)) dist[y * W + x] = 255;
        else queue.push(y * W + x);
      }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head];
      const x = i % W, y = Math.floor(i / W);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const k = ny * W + nx;
          if (dist[k] > dist[i] + 1) { dist[k] = dist[i] + 1; queue.push(k); }
        }
    }
  }
  const height = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? DUNE_TOP : Math.min(DUNE_TOP, dist[y * W + x]));
  /** Altura num canto (o de cima à esquerda do tile x, y): o mais baixo dos 4 tiles que o tocam. */
  const corner = (x: number, y: number) => Math.min(height(x - 1, y - 1), height(x, y - 1), height(x - 1, y), height(x, y));

  /** Bits de `OPEN` dos vizinhos que passam no teste; as quinas só contam com os dois lados do outro jeito. */
  const mask = (x: number, y: number, test: (x: number, y: number) => boolean) => {
    let m = 0;
    if (test(x, y - 1)) m |= OPEN.n;
    if (test(x + 1, y)) m |= OPEN.e;
    if (test(x, y + 1)) m |= OPEN.s;
    if (test(x - 1, y)) m |= OPEN.w;
    if (test(x + 1, y - 1) && !(m & (OPEN.n | OPEN.e))) m |= OPEN.ne;
    if (test(x - 1, y - 1) && !(m & (OPEN.n | OPEN.w))) m |= OPEN.nw;
    if (test(x + 1, y + 1) && !(m & (OPEN.s | OPEN.e))) m |= OPEN.se;
    if (test(x - 1, y + 1) && !(m & (OPEN.s | OPEN.w))) m |= OPEN.sw;
    return m;
  };
  const pick = (x: number, y: number, count: number, seed = 0) => {
    const n = hash(x, y, seed);
    return n < 0.5 ? 0 : 1 + Math.floor((n - 0.5) * 2 * (count - 1));
  };

  // --- Quadros do atlas: um por combinação que aparece no mapa ----------------------------
  const atlas = new TileAtlas();
  const ground = new Int32Array(W * H).fill(-1);
  const edgeSoft = new Int32Array(W * H).fill(-1);
  const edgeWet = new Int32Array(W * H).fill(-1);
  const edgeShade = new Int32Array(W * H).fill(-1);
  const decor = new Int32Array(W * H).fill(-1);
  const sandFrame = (x: number, y: number) => {
    const v = pick(x, y, SAND_VARIANTS);
    return atlas.frame(`sand${v}`, draw.sand(variant, v));
  };
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1 || d.side.some((r) => x === r.x + 1 && y === r.y + 1)
    || tileDistance(x, y, d.bossPortal.x, d.bossPortal.y) <= 1;

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = at(x, y);
      if (under(x)) continue;
      if (t === Tile.Wall && solid(x, y)) {
        if (mesas) {
          const open = mask(x, y, (a, b) => !solid(a, b) && a >= 0 && b >= 0 && a < W && b < H);
          const v = pick(x, y, MESA_VARIANTS, 3);
          ground[i] = atlas.frame(`mesa${open}-${v}`, () => mesaTile(variant, open, v).render(false));
          // Tampo de dentro: tufos de capim, pedras e a areia que o vento deixou lá em cima.
          if (open === 0 && hash(x, y, 94) < 0.08) {
            const kind = (["grass", "stones", "pebbles", "crack"] as const)[Math.floor(hash(x, y, 92) * 4)];
            const dv = Math.floor(hash(x, y, 93) * 3);
            decor[i] = atlas.frame(`flat-${kind}-${dv}`, () => flatDecor(variant, kind, dv).render(true));
          }
        } else {
          const h = [corner(x, y), corner(x + 1, y), corner(x, y + 1), corner(x + 1, y + 1)] as const;
          const v = pick(x, y, DUNE_VARIANTS, 4);
          ground[i] = atlas.frame(`dune${h.join("")}-${v}`, () => duneTile(variant, h, v).render(false));
        }
        continue;
      }
      if (t === Tile.Water) {
        const land = mask(x, y, (a, b) => !water(a, b));
        // Mar de Areia: o miolo dos oásis largos tem mais variações (o desenho do miolo muda com a variação).
        const v = desert && !land ? pick(x, y, 6, 5) : pick(x, y, WATER_VARIANTS, 5);
        ground[i] = atlas.frame(`water${land}-${v}`, () => waterTile(variant, land, v).render(false));
        continue;
      }
      if (ruin(x, y) && !stone(x, y)) {
        const joins = mask(x, y, ruin) & (OPEN.n | OPEN.e | OPEN.s | OPEN.w);
        const south = !ruin(x, y + 1) && !solid(x, y + 1);
        const v = pick(x, y, 2, 6);
        ground[i] = atlas.frame(`ruin${joins}-${south ? 1 : 0}-${v}`, () => ruinTile(variant, joins, south, v).render(false));
        continue;
      }
      // Chão (e o pé dos coqueiros, pilares e pedras cantantes).
      if (t === Tile.Sand) {
        const v = pick(x, y, SOFT_VARIANTS, 1);
        ground[i] = atlas.frame(`soft${v}`, draw.soft(variant, v));
      } else if (inArena(x, y)) {
        const v = pick(x, y, ARENA_VARIANTS, 2);
        ground[i] = atlas.frame(`arena${v}`, draw.arena(variant, v));
      } else ground[i] = sandFrame(x, y);

      // Bordas: areia fofa entrando na firme, areia molhada perto da água, sombra do relevo (sol do noroeste).
      if (t !== Tile.Sand && !inArena(x, y)) {
        const m = mask(x, y, soft);
        if (m) edgeSoft[i] = atlas.frame(`softEdge${m}`, () => softEdge(variant, m).render(false));
      }
      const wet = mask(x, y, water);
      if (wet) edgeWet[i] = atlas.frame(`wet${wet}`, () => wetEdge(variant, wet).render(false));
      const high = (a: number, b: number) => solid(a, b) || (ruin(a, b) && !stone(a, b));
      const shade = mask(x, y, high) & (OPEN.n | OPEN.w | OPEN.nw);
      if (shade) edgeShade[i] = atlas.frame(`shade${shade}`, () => shadowEdge(variant, shade, mesas));

      // Enfeites rasteiros: poucos (60% do chão limpo), em grupos perto do relevo e das ruínas.
      if (reserved(x, y) || t === Tile.Portal || wall(x, y) || ruin(x, y)) continue;
      const n = hash(x, y, 91);
      const byHigh = near(x, y, 1, high);
      const chance = inRuins(x, y) ? 0.16 : byHigh ? 0.09 : 0.04;
      if (n >= chance) continue;
      const kind = flatKind(hash(x, y, 92), { mesas, ruins: inRuins(x, y) || near(x, y, 2, ruin), arena: inArena(x, y), soft: t === Tile.Sand });
      const v = Math.floor(hash(x, y, 93) * 3);
      decor[i] = atlas.frame(`flat-${kind}-${v}`, () => flatDecor(variant, kind, v).render(kind !== "snake" && kind !== "tracks"));
    }

  // --- Tilemap -----------------------------------------------------------------------------
  if (scene.textures.exists(ATLAS)) scene.textures.remove(ATLAS);
  addCanvasTexture(scene.textures, ATLAS, atlas.build());
  const map = scene.make.tilemap({ width: W, height: H, tileWidth: HD, tileHeight: HD });
  const set = map.addTilesetImage(ATLAS, ATLAS, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)!;
  const layer = (name: string, data: Int32Array, tint = false) => {
    const l = map.createBlankLayer(name, set)!.setDepth(floorDepth).setScale(1 / ZOOM);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const f = data[y * W + x];
        if (f < 0) continue;
        const tile = l.putTileAt(f, x, y);
        // Manchas grandes de luz e sombra: o chão deixa de parecer chapado.
        if (tint) tile.tint = patchTint(x, y, 0.82, mesas ? [1, 0.8, 0.7] : [1, 0.88, 0.72], 7, 67);
      }
    return l;
  };
  layer("chao", ground, true);
  (window as unknown as { duneFrames?: number }).duneFrames = atlas.count;
  layer("fofa", edgeSoft, true);
  layer("molhada", edgeWet);
  layer("sombra", edgeShade);
  layer("enfeites", decor);

  // --- De pé: coqueiros, pilares e pedras cantantes, enfeites ---------------------------------
  const culler = new ChunkCuller();
  const crowns: Phaser.GameObjects.Image[] = [];
  const glows: Phaser.GameObjects.Image[] = [];
  const art = createStandingArt(scene, variant);
  const sprite = (key: string, frame: number, x: number, y: number, depth: number, flip = false) =>
    culler.add(scene.add.image(x * TILE_SIZE + TILE_SIZE / 2, (y + 1) * TILE_SIZE - 2, key, frame)
      .setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth(depth).setFlipX(flip), x, y);

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const depth = (y + 1) * TILE_SIZE - 0.25;
      const flip = hash(x, y, 95) < 0.5;
      if (under(x)) continue;
      if (prop(x, y)) {
        if (!mesas || near(x, y, 3, water)) {
          const v = Math.floor(hash(x, y, 96) * PALM_VARIANTS);
          const size = 0.85 + hash(x, y, 97) * 0.3;
          sprite(art.trunk, v, x, y, depth, flip).setScale(size / ZOOM);
          const crown = sprite(art.crown, v, x, y, depth + 0.1, flip).setScale(size / ZOOM);
          crown.setData("phase", hash(x, y, 98) * Math.PI * 2).setData("x0", crown.x);
          crowns.push(crown);
        } else sprite(art.pillar, Math.floor(hash(x, y, 99) * PILLAR_VARIANTS), x, y, depth, flip);
        continue;
      }
      if (ruin(x, y) && stone(x, y) && desert) {
        // Mar de Areia: a pedra solta das ruínas é um toco de coluna.
        sprite(art.tall, TALL_DECOR.indexOf("column"), x, y, depth, flip);
        continue;
      }
      if (ruin(x, y) && stone(x, y)) {
        const v = Math.floor(hash(x, y, 99) * PILLAR_VARIANTS);
        sprite(art.pillar, v, x, y, depth, flip);
        if (!mesas) {
          const glow = sprite(art.glow, v, x, y, depth + 0.05, flip).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
          glow.setData("phase", hash(x, y, 100) * Math.PI * 2);
          glows.push(glow);
        }
        continue;
      }
      const t = at(x, y);
      if (t !== Tile.Floor && t !== Tile.Sand) continue;
      if (reserved(x, y) || decor[y * W + x] >= 0 || inArena(x, y)) continue;
      const n = hash(x, y, 101);
      const byWater = near(x, y, 1, water);
      const byHigh = near(x, y, 1, solid);
      const chance = byWater ? 0.22 : inRuins(x, y) ? 0.08 : byHigh ? 0.035 : 0.012;
      if (n >= chance) continue;
      const kind = tallKind(hash(x, y, 102), { mesas, water: byWater, ruins: inRuins(x, y) || near(x, y, 2, ruin) });
      sprite(art.tall, TALL_DECOR.indexOf(kind), x, y, depth, flip);
    }

  // Caverna (Mar de Areia): o monte com a boca na superfície, o subterrâneo inteiro e a corda da saída.
  let caveLights: Phaser.GameObjects.Image[] = [];
  if (d.cave) {
    const c = d.cave;
    const moundKey = single(scene, "desert-cave-mouth", MOUTH.w, MOUTH.h, caveMouth);
    culler.add(scene.add.image(c.entrance.x * TILE_SIZE + TILE_SIZE / 2, (c.entrance.y + 1) * TILE_SIZE, moundKey)
      .setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth((c.entrance.y + 1) * TILE_SIZE - 0.3), c.entrance.x, c.entrance.y);
    caveLights = drawCaveHd(scene, d, "desert", floorDepth, culler, c.under);
    const shaftKey = single(scene, "desert-cave-shaft", SHAFT.w, SHAFT.h, () => caveShaft("desert"));
    culler.add(scene.add.image(c.exit.x * TILE_SIZE + TILE_SIZE / 2, (c.exit.y + 1) * TILE_SIZE, shaftKey)
      .setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth((c.exit.y + 1) * TILE_SIZE - 0.2), c.exit.x, c.exit.y);
  }

  return createAmbience(scene, d, uiDepth, culler, crowns, glows, variant, caveLights);
}

/** Textura de uma peça só, pintada na primeira vez. */
function single(scene: Phaser.Scene, key: string, w: number, h: number, paint: () => Uint8ClampedArray) {
  if (!scene.textures.exists(key)) addCanvasTexture(scene.textures, key, toCanvas(paint(), w, h));
  return key;
}

/** Enfeite rasteiro conforme o lugar: cacos e ossos nas ruínas, sal ou barro rachado e pedrinhas no campo. */
function flatKind(m: number, at: { mesas: boolean; ruins: boolean; arena: boolean; soft: boolean }): FlatDecor {
  if (at.arena) return m < 0.5 ? "bones" : m < 0.8 ? "skull" : "stones";
  if (at.ruins) return m < 0.45 ? "shards" : m < 0.7 ? "stones" : m < 0.85 ? "bones" : "pebbles";
  if (at.soft) return m < 0.55 ? "tracks" : m < 0.8 ? "snake" : "shells";
  const table: [number, FlatDecor][] = at.mesas
    ? [[0.25, "pebbles"], [0.45, "stones"], [0.62, "crack"], [0.74, "grass"], [0.84, "bones"], [0.92, "snake"], [1, "skull"]]
    : [[0.22, "pebbles"], [0.4, "grass"], [0.54, "shells"], [0.68, "snake"], [0.8, "tracks"], [0.88, "bones"], [0.95, "skull"], [1, "stones"]];
  return table.find(([limit]) => m < limit)![1];
}

/** Enfeite de pé conforme o lugar: juncos na água, colunas e ânforas nas ruínas, arbustos e pedras no campo. */
function tallKind(m: number, at: { mesas: boolean; water: boolean; ruins: boolean }): TallDecor {
  if (at.water) return m < 0.7 ? "reeds" : "shrub";
  if (at.ruins) return m < 0.4 ? "column" : m < 0.75 ? "amphora" : "rocks";
  const table: [number, TallDecor][] = at.mesas
    ? [[0.3, "rocks"], [0.55, "aloe"], [0.75, "shrub"], [0.9, "cairn"], [1, "ribs"]]
    : [[0.45, "shrub"], [0.65, "rocks"], [0.82, "ribs"], [0.92, "aloe"], [1, "cairn"]];
  return table.find(([limit]) => m < limit)![1];
}

interface StandingArt { trunk: string; crown: string; pillar: string; glow: string; tall: string }

/** Texturas dos objetos de pé de cada variante, desenhadas uma vez por jogo. */
function createStandingArt(scene: Phaser.Scene, variant: DuneVariant): StandingArt {
  const keys: StandingArt = {
    trunk: `${variant}-palm-trunk`, crown: `${variant}-palm-crown`, pillar: `${variant}-pillar`, glow: `${variant}-pillar-glow`, tall: `${variant}-tall`,
  };
  const sheet = (key: string, count: number, w: number, h: number, frame: (i: number) => Uint8ClampedArray) => {
    if (scene.textures.exists(key)) return;
    const { canvas, ctx } = makeCanvas(w * count, h);
    for (let i = 0; i < count; i++) ctx.drawImage(toCanvas(frame(i), w, h), i * w, 0);
    const texture = addCanvasTexture(scene.textures, key, canvas)!;
    for (let i = 0; i < count; i++) texture.add(i, 0, i * w, 0, w, h);
  };
  const palms = Array.from({ length: PALM_VARIANTS }, (_, v) => palmTrunk(variant, v));
  sheet(keys.trunk, PALM_VARIANTS, PALM.w, PALM.h, (i) => palms[i].image);
  sheet(keys.crown, PALM_VARIANTS, PALM.w, PALM.h, (i) => palmCrown(variant, i, palms[i].top));
  const pillars = Array.from({ length: PILLAR_VARIANTS }, (_, v) => pillar(variant, v));
  sheet(keys.pillar, PILLAR_VARIANTS, TALL.w, TALL.h, (i) => pillars[i].image);
  sheet(keys.glow, PILLAR_VARIANTS, TALL.w, TALL.h, (i) => pillars[i].glow);
  sheet(keys.tall, TALL_DECOR.length, TALL.w, TALL.h, (i) => tallDecor(variant, TALL_DECOR[i], i));
  return keys;
}

const GRAIN = "dunes-grain";
const RIBBON = "dunes-ribbon";
const RING = "dunes-ring";
const GLINT = "dunes-glint";

/** Texturas do ambiente (grão, fita de areia, onda do canto, brilho na água). */
function createAmbienceArt(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const { canvas, ctx } = makeCanvas(w, h);
    paint(ctx);
    addCanvasTexture(scene.textures, key, canvas);
  };
  add(GRAIN, 2, 2, (ctx) => { ctx.fillStyle = "#fff1d0"; ctx.fillRect(0, 0, 2, 2); });
  add(RIBBON, 64, 4, (ctx) => {
    for (let x = 0; x < 64; x++) {
      const a = Math.sin((x / 63) * Math.PI) * 0.8;
      ctx.fillStyle = `rgba(255, 236, 200, ${a.toFixed(2)})`;
      ctx.fillRect(x, 1 + Math.round(Math.sin(x / 6)), 1, 1);
      if (x % 3 === 0) ctx.fillRect(x, 2 + Math.round(Math.sin(x / 6)), 1, 1);
    }
  });
  add(RING, 128, 128, (ctx) => {
    // Anel em pixels (sem suavização), com falhas: a onda do canto das pedras.
    for (let a = 0; a < 360; a += 1) {
      if (Math.floor(a / 15) % 3 === 2) continue;
      const r = 60;
      const x = Math.round(64 + Math.cos((a * Math.PI) / 180) * r), y = Math.round(64 + Math.sin((a * Math.PI) / 180) * r * 0.55);
      ctx.fillStyle = "rgba(160, 240, 255, 0.9)";
      ctx.fillRect(x, y, 2, 2);
    }
  });
  add(GLINT, 9, 9, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 0, 1, 9);
    ctx.fillRect(0, 4, 9, 1);
    ctx.fillRect(3, 3, 3, 3);
  });
}

/** Intervalo entre brilhos do sol na água e entre fitas de areia saindo das cristas (ms). */
const GLINT_EVERY_MS = 220;
const RIBBON_EVERY_MS = 650;

/**
 * Ambiente: grãos de areia levados pelo vento norte, fitas de areia soprando das cristas à vista, as copas dos
 * coqueiros balançando (a de cima do jogador fica transparente), o sol brilhando na água e, nas Dunas, as pedras
 * cantantes: os glifos acendem devagar e, no auge, uma onda sai da pedra.
 */
function createAmbience(
  scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller,
  crowns: Phaser.GameObjects.Image[], glows: Phaser.GameObjects.Image[], variant: DuneVariant, caveLights: Phaser.GameObjects.Image[] = [],
): MapAmbience {
  createAmbienceArt(scene);
  const cam = scene.cameras.main;
  const game = document.getElementById("game");
  let below: boolean | null = null;
  const grains = scene.add.particles(0, 0, GRAIN, {
    lifespan: { min: 1200, max: 2200 },
    speedY: { min: 80, max: 150 },
    speedX: { min: -20, max: 25 },
    alpha: { values: [0, 0.85, 0.6, 0], interpolation: "linear" },
    frequency: 60,
    quantity: 1,
    maxAliveParticles: 40,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (grains.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;

  const visible = new Set<Phaser.GameObjects.GameObject>();
  let nextGlint = 0;
  let nextRibbon = 0;
  const highAt = (x: number, y: number) => tileAt(d, x, y) === Tile.Wall;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      // Mar de Areia, na caverna: sem vento, fundo quase preto e cantos bem escuros; as luzes dos cristais respiram.
      if (d.cave) {
        const inCave = isUnderground(d, Math.floor(v.centerX / TILE_SIZE));
        if (inCave !== below) {
          below = inCave;
          grains.setVisible(!inCave);
          grains.emitting = !inCave;
          cam.setBackgroundColor(inCave ? CAVE_VOID : DESERT_VOID);
          game?.classList.toggle("cave", inCave);
        }
        if (inCave) { flickerLights(caveLights, time); return; }
      }
      zone.setTo(v.x, v.y - 30, v.width, v.height);

      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const mx = v.centerX;
      const my = v.centerY;
      for (const crown of crowns) {
        if (!visible.has(crown)) continue;
        // Balanço sem girar (girar a arte de 128 px abre um risco no meio da copa): a copa anda um pixel de lado.
        crown.x = crown.getData("x0") + Math.round(Math.sin(time / 1200 + crown.getData("phase")) * 1.5) * 0.5;
        const over = Math.abs(mx - crown.x) < 34 * crown.scaleX * ZOOM && my > crown.y - 80 * crown.scaleY * ZOOM && my < crown.y - 20 * crown.scaleY * ZOOM;
        crown.setAlpha(over ? 0.45 : 1);
      }
      for (const glow of glows) {
        if (!visible.has(glow)) continue;
        // O canto: os glifos sobem devagar e, perto do auge, a pedra solta uma onda.
        const s = Math.max(0, Math.sin(time / 1400 + glow.getData("phase")));
        glow.setAlpha(s ** 3);
        const peak = s > 0.985;
        if (peak && !glow.getData("sang")) {
          glow.setData("sang", true);
          const ring = scene.add.image(glow.x, glow.y - 4, RING).setScale(0.08).setAlpha(0.8).setDepth(glow.depth + 0.01)
            .setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({ targets: ring, scale: 0.6, alpha: 0, duration: 1600, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
        } else if (!peak) glow.setData("sang", false);
      }

      // Fita de areia soprando de uma crista à vista (vento norte, para o sul).
      if (time >= nextRibbon && variant === "dunes") {
        nextRibbon = time + RIBBON_EVERY_MS;
        const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
        const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
        if (highAt(x, y) && !highAt(x, y + 1)) {
          const ribbon = scene.add.image(x * TILE_SIZE + 16, (y + 1) * TILE_SIZE, RIBBON).setAngle(80 + Math.random() * 20)
            .setAlpha(0).setDepth(uiDepth - 5).setScale(0.5);
          scene.tweens.add({
            targets: ribbon, y: ribbon.y + 70, alpha: { from: 0.7, to: 0 }, duration: 1800, ease: "Sine.easeIn",
            onComplete: () => ribbon.destroy(),
          });
        }
      }

      // Brilho do sol num tile de água à vista.
      if (time < nextGlint) return;
      nextGlint = time + GLINT_EVERY_MS;
      const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
      const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
      if (tileAt(d, x, y) !== Tile.Water) return;
      const glint = scene.add.image(x * TILE_SIZE + 4 + Math.random() * 24, y * TILE_SIZE + 4 + Math.random() * 24, GLINT)
        .setDepth((y + 1) * TILE_SIZE - 0.5).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
      scene.tweens.add({ targets: glint, alpha: { from: 1, to: 0 }, scale: 0.9, duration: 500, onComplete: () => glint.destroy() });
    },
  };
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
