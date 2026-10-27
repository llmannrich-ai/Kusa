import * as Phaser from "phaser";
import { TILE_SIZE, Tile, centerOf, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import {
  CANOPY_VARIANTS, GRASS_VARIANTS, MARSH_FLOOR, MARSH_TALL, MARSH_WATER, MUD_VARIANTS, PLANK_FRAMES, RIM, TREES,
  TREE_CROWN, TREE_CROWN_ANCHOR, TREE_FOOT, TREE_TRUNK, canopyRim, canopyVariant, treeTop, type TreeSpecies,
} from "./art/marshDecor.ts";
import type { WetlandTexture } from "./art/textures.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";

/** Tipo de chão de cada tile de terra, para escolher ladrilho, transição e enfeites. */
export const enum Ground { Grass, Mud, Stone }

/** Bits da camada de bordas no chão: capim na lama (lados e quinas), margem (lados e quinas) e sombra. */
const EDGE = {
  fringe: [1, 2, 4, 8], // N, L, S, O
  fringeIn: [1 << 18, 1 << 19, 1 << 20, 1 << 21], // NE, NO, SE, SO
  fringeOut: [1 << 22, 1 << 23, 1 << 25, 1 << 26], // NE, NO, SE, SO
  shore: [16, 32, 64, 128], // N, L, S, O
  corner: [256, 512, 1024, 2048], // NE, NO, SE, SO
  outer: [4096, 8192, 16384, 32768], // NE, NO, SE, SO
  shadeN: 65536,
  shadeW: 131072,
} as const;
/** Quadro de beira da copa (tile de mata): marcado à parte, com os lados abertos e a variação da copa. */
const CANOPY_EDGE = 1 << 24;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const CORNERS = [[1, -1], [-1, -1], [1, 1], [-1, 1]] as const;
/** Quadros por linha nas texturas montadas aqui (o celular não aceita textura larga demais). */
const GRID_COLUMNS = 32;

/** Tons das árvores soltas: o mesmo desenho com variação de cor. */
const TREE_TINTS = [0xffffff, 0xffffff, 0xeaf2dc, 0xdfe8d0, 0xfff4dc, 0xd6e2d0];

/** Pedra no chão (lajes) ou em pé (`Tile.Ruin`), desenhada pelo tema: os troncos do Kosaradius, as ruínas da Baía. */
export interface WetlandPainter {
  /** Põe o sprite do tile `Tile.Ruin` (x, y). */
  ruin(x: number, y: number): void;
  /**
   * Enfeite de um tile de terra que é do tema (salas, arena, ruínas); devolve true se cuidou do tile (o resto das
   * regras de enfeite não roda). `decor` põe um quadro de `tex.floor`; `tall`, de `tex.tall`.
   */
  decor?(x: number, y: number, g: Ground): boolean;
  /** Enfeite de um tile de água do tema; devolve true se cuidou dele. */
  water?(x: number, y: number, deep: boolean): boolean;
}

/** O que muda de um pântano para o outro. */
export interface WetlandTheme {
  tex: WetlandTexture;
  /** Chave da textura das bordas montada no mapa. */
  edges: string;
  /** Sombra das manchas do chão (multiplicadores R, G, B do tint). */
  shade: readonly [number, number, number];
  /** Tint da névoa. */
  mist: number;
  /** Pinta as bordas (franja de capim, beira da copa) com as manchas de tom do chão. */
  tintEdges?: boolean;
  /** Manchas de brejo (lama) pelo campo, além da beira d'água. Sem isto, sim. */
  bogs?: boolean;
  /** Anel de ciprestes em volta da clareira do boss (o gerador do Kosaradius põe as árvores lá). */
  cypressRing: boolean;
  /** Chão de lajes (Pântano das Ruínas): o tile de terra (x, y) é pedra; `paving` dá o quadro dela. */
  paved?: (x: number, y: number) => boolean;
  paving?: { key: string; count: number; frame: (x: number, y: number) => number };
  /** Faixas extras de enfeites do tema (quadros 32×32), para `WetlandContext.layerDecor`. */
  extras?: string[];
  /** Repinta na paleta do mapa um pedaço do canvas (a beira da copa é desenhada aqui, não numa textura pronta). */
  tone?: (canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number) => void;
  /** Liga o desenho da pedra ao mapa já montado (camadas, culler), na hora de desenhar. */
  painter(ctx: WetlandContext): WetlandPainter;
}

/** O que o tema recebe para desenhar a parte dele. */
export interface WetlandContext {
  scene: Phaser.Scene;
  d: Dungeon;
  culler: ChunkCuller;
  floorDepth: number;
  decor: (frame: number, x: number, y: number) => void;
  tall: (frame: number, x: number, y: number) => void;
  /** Põe um quadro de uma textura extra do tema na camada de enfeites (chão ou água). */
  layerDecor: (key: string, frame: number, x: number, y: number) => void;
  groundAt: (x: number, y: number) => number;
}

/**
 * Desenha um pântano (floresta alagada). Em tilemaps (o Phaser só desenha o que está na tela): o chão (capim, musgo perto da mata, lama
 * na beira da água, tábuas das passarelas), a água, a copa da mata fechada, as bordas (beira da copa com os troncos
 * aparecendo do lado sul, margem com lodo, capim invadindo a lama, sombra da mata e dos troncos) e os enfeites
 * rasteiros. Em sprites ordenados pela linha de baixo, como os personagens: as árvores soltas (tronco e copa, com
 * sombra no chão, algumas de pé dentro da água), os troncos caídos e tocos (muros das clareiras), e os enfeites altos
 * (taboas e juncos na margem, samambaias, íris, plantas-jarro, cogumelos). Árvore solta é mata sem mata nos 4 lados;
 * o resto da mata é mata fechada (a regra do gerador). Tudo vem de `hash(x, y)`: todos veem o mesmo pântano, e nada
 * muda a jogabilidade.
 */
export function drawWetland(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number, theme: WetlandTheme): MapAmbience {
  const tex = theme.tex;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const isWall = (x: number, y: number) => at(x, y) === Tile.Wall;
  const isTree = (x: number, y: number) => isWall(x, y) && DIRS.every(([dx, dy]) => !isWall(x + dx, y + dy));
  const isForest = (x: number, y: number) => isWall(x, y) && !isTree(x, y);
  const isWater = (x: number, y: number) => at(x, y) === Tile.Water;
  const waterAround = (x: number, y: number) => DIRS.filter(([dx, dy]) => isWater(x + dx, y + dy)).length;
  const near = (x: number, y: number, reach: number, test: (x: number, y: number) => boolean) => {
    for (let dy = -reach; dy <= reach; dy++)
      for (let dx = -reach; dx <= reach; dx++)
        if ((dx || dy) && test(x + dx, y + dy)) return true;
    return false;
  };

  // Passarelas: tile → deitada (leste-oeste) ou em pé (norte-sul).
  const planks = new Map<number, boolean>();
  for (const p of d.planks ?? []) {
    for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) planks.set(y * d.width + x, p.w > 1);
  }
  const isPlank = (x: number, y: number) => planks.has(y * d.width + x);
  /** Árvore solta que nasce na água (a água fica por baixo dela). */
  const treeInWater = (x: number, y: number) => isTree(x, y) && waterAround(x, y) >= 2;
  /** Tile "molhado": água, passarela, árvore na água e mata cuja beira dá na água. A margem só aparece contra a terra. */
  const wetGround = new Uint8Array(d.width * d.height);
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const wet = isWater(x, y) || isPlank(x, y) || treeInWater(x, y) || (isForest(x, y) && waterAround(x, y) > 0);
      if (wet) wetGround[y * d.width + x] = 1;
    }
  const isWet = (x: number, y: number) => x < 0 || y < 0 || x >= d.width || y >= d.height ? false : wetGround[y * d.width + x] === 1;

  const inClearing = (x: number, y: number) => d.side.some((r) => inRect(r, x, y));
  const bossCenter = centerOf(d.boss);

  // Tipo de chão de cada tile de terra (também debaixo das árvores, dos troncos e na beira da copa).
  const ground = new Uint8Array(d.width * d.height);
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++) {
      const bog = field(x, y, 9, 71);
      let g = Ground.Grass;
      if (theme.paved?.(x, y)) g = Ground.Stone;
      else if (near(x, y, 1, isWater) || (theme.bogs !== false && bog > 0.74 && !inClearing(x, y))) g = Ground.Mud;
      ground[y * d.width + x] = g;
    }
  const groundAt = (x: number, y: number) =>
    x < 0 || y < 0 || x >= d.width || y >= d.height || isWater(x, y) || isPlank(x, y) || isForest(x, y) ? -1 : ground[y * d.width + x];

  const map = scene.make.tilemap({ width: d.width, height: d.height, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  let firstGid = 0;
  const tileset = (key: string, count: number) => {
    const set = map.addTilesetImage(key, key, TILE_SIZE, TILE_SIZE, 0, 0, firstGid)!;
    const gid = firstGid;
    firstGid += count;
    return { set, gid };
  };
  const frames = (key: string) => Math.floor(scene.textures.get(key).getSourceImage().width / TILE_SIZE);
  const grass = tileset(tex.grass, GRASS_VARIANTS);
  const mud = tileset(tex.mud, MUD_VARIANTS);
  const water = tileset(tex.water, 3);
  const plankSet = tileset(tex.planks, 4);
  const canopy = tileset(tex.canopy, CANOPY_VARIANTS);
  const decorFloor = tileset(tex.floor, frames(tex.floor));
  const decorWater = tileset(tex.waterDecor, frames(tex.waterDecor));
  const stone = theme.paving ? tileset(theme.paving.key, theme.paving.count) : null;
  // Faixas extras do tema (enfeites das ruínas), na camada de enfeites.
  const extra = new Map<string, { set: Phaser.Tilemaps.Tileset; gid: number }>();
  const extraSet = (key: string) => {
    if (!extra.has(key)) extra.set(key, tileset(key, frames(key)));
    return extra.get(key)!;
  };

  // Bordas: cada combinação usada vira um quadro de uma textura montada aqui.
  const edgeMasks = new Uint32Array(d.width * d.height);
  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      let mask = 0;
      if (isForest(x, y)) {
        // Beira da copa: os lados e quinas que não são mata fechada.
        let rim = 0;
        DIRS.forEach(([dx, dy], i) => { if (!isForest(x + dx, y + dy)) rim |= RIM.side[i]; });
        CORNERS.forEach(([dx, dy], i) => { if (!isForest(x + dx, y + dy)) rim |= RIM.corner[i]; });
        if (rim) mask = CANOPY_EDGE | rim | (canopyVariant(x, y) << 8);
      } else if (isWet(x, y) && !isPlank(x, y)) {
        DIRS.forEach(([dx, dy], i) => { if (!isWet(x + dx, y + dy)) mask |= EDGE.shore[i]; });
        CORNERS.forEach(([dx, dy], i) => {
          if (!isWet(x + dx, y + dy) && isWet(x + dx, y) && isWet(x, y + dy)) mask |= EDGE.corner[i];
          if (!isWet(x + dx, y) && !isWet(x, y + dy)) mask |= EDGE.outer[i];
        });
      } else if (!isWet(x, y)) {
        if (groundAt(x, y) === Ground.Mud || groundAt(x, y) === Ground.Stone) {
          const grassy = (xx: number, yy: number) => groundAt(xx, yy) === Ground.Grass;
          DIRS.forEach(([dx, dy], i) => { if (grassy(x + dx, y + dy)) mask |= EDGE.fringe[i]; });
          CORNERS.forEach(([dx, dy], i) => {
            if (grassy(x + dx, y) && grassy(x, y + dy)) mask |= EDGE.fringeOut[i];
            else if (grassy(x + dx, y + dy) && !grassy(x + dx, y) && !grassy(x, y + dy)) mask |= EDGE.fringeIn[i];
          });
        }
      }
      if (!isForest(x, y) && at(x, y) !== Tile.Ruin) {
        if (isForest(x, y - 1) || at(x, y - 1) === Tile.Ruin) mask |= EDGE.shadeN;
        if (isForest(x - 1, y) || at(x - 1, y) === Tile.Ruin) mask |= EDGE.shadeW;
      }
      edgeMasks[y * d.width + x] = mask;
    }
  }
  const edgeFrames = buildEdgeTexture(scene, edgeMasks, theme);
  const edges = tileset(theme.edges, Math.ceil(Math.max(1, edgeFrames.size) / GRID_COLUMNS) * GRID_COLUMNS);
  // As faixas extras do tema entram antes de as camadas nascerem (a camada só aceita os tilesets que recebeu).
  for (const key of theme.extras ?? []) extraSet(key);

  const sets = [grass, mud, water, plankSet, canopy, decorFloor, decorWater, edges, ...(stone ? [stone] : []), ...[...extra.values()]].map((t) => t.set);
  const groundLayer = map.createBlankLayer("chao", sets)!.setDepth(floorDepth);
  const edgeLayer = map.createBlankLayer("bordas", sets)!.setDepth(floorDepth);
  const decorLayer = map.createBlankLayer("enfeites", sets)!.setDepth(floorDepth);

  const culler = new ChunkCuller();
  const crowns: Phaser.GameObjects.Image[] = [];
  const canopyCrowns: Phaser.GameObjects.Image[] = [];
  const tall = (frame: number, x: number, y: number) => {
    const img = culler.add(
      scene.add.image(x * TILE_SIZE, y * TILE_SIZE, tex.tall, frame).setOrigin(0).setDepth((y + 1) * TILE_SIZE - 0.25), x, y);
    if (hash(x, y, 41) < 0.5) img.setFlipX(true);
  };
  const special = new Set([d.portal.y * d.width + d.portal.x, bossCenter.y * d.width + bossCenter.x]);

  /** Espécie da árvore solta: na água, cipreste e mangue; na margem, salgueiro; no seco, de tudo, com poucas mortas. */
  const species = (x: number, y: number): TreeSpecies => {
    const n = hash(x, y, 55);
    if (treeInWater(x, y)) return n < 0.55 ? "cypress" : n < 0.88 ? "mangrove" : "dead";
    if (near(x, y, 1, isWater)) return n < 0.5 ? "willow" : n < 0.8 ? "cypress" : "mangrove";
    // Em volta da clareira do boss, só ciprestes (o anel).
    if (theme.cypressRing && Math.hypot(x - bossCenter.x, y - bossCenter.y) < d.boss.w / 2 + 3) return n < 0.85 ? "cypress" : "dead";
    return n < 0.4 ? "cypress" : n < 0.68 ? "willow" : n < 0.86 ? "mangrove" : "dead";
  };
  const variantOf = (s: TreeSpecies, x: number, y: number) => {
    const options = TREES.map((t, i) => (t.species === s ? i : -1)).filter((i) => i >= 0);
    return options[Math.floor(hash(x, y, 50) * options.length)];
  };

  /** Árvore solta no tile: sombra no chão, tronco e copa (que balança e fica transparente com alguém embaixo). */
  const tree = (x: number, y: number) => {
    const variant = variantOf(species(x, y), x, y);
    const flip = hash(x, y, 51) < 0.5;
    const tint = TREE_TINTS[Math.floor(hash(x, y, 52) * TREE_TINTS.length)];
    const scale = 0.9 + hash(x, y, 53) * 0.22;
    const base = { x: x * TILE_SIZE + 16, y: y * TILE_SIZE + 27 };
    const top = treeTop(variant);
    const topX = (flip ? TREE_TRUNK.w - top.x : top.x) - TREE_FOOT.x;
    const depth = (y + 1) * TILE_SIZE;
    culler.add(scene.add.image(base.x - 44 * scale, base.y - 14 * scale, tex.treeShadow)
      .setOrigin(0).setScale(scale).setDepth(floorDepth + 0.5), x, y);
    culler.add(scene.add.image(base.x, base.y, tex.trunk, variant)
      .setOrigin(TREE_FOOT.x / TREE_TRUNK.w, TREE_FOOT.y / TREE_TRUNK.h).setFlipX(flip).setScale(scale).setTint(tint).setDepth(depth - 0.3), x, y);
    const crown = scene.add.image(base.x + topX * scale, base.y + (top.y - TREE_FOOT.y) * scale, tex.crown, variant)
      .setOrigin(TREE_CROWN_ANCHOR.x / TREE_CROWN.w, TREE_CROWN_ANCHOR.y / TREE_CROWN.h)
      .setFlipX(flip).setScale(scale).setTint(tint).setDepth(depth - 0.2)
      .setData("phase", hash(x, y, 54) * Math.PI * 2);
    crowns.push(culler.add(crown, x, y));
  };

  /** Copa mais alta saindo do meio da mata fechada (dá volume; ninguém passa embaixo). */
  const emergent = (x: number, y: number) => {
    const living = TREES.map((t, i) => (t.species === "dead" ? -1 : i)).filter((i) => i >= 0);
    const variant = living[Math.floor(hash(x, y, 56) * living.length)];
    const scale = 0.75 + hash(x, y, 57) * 0.25;
    const crown = scene.add.image(x * TILE_SIZE + 16, y * TILE_SIZE + 22, tex.crown, variant)
      .setOrigin(TREE_CROWN_ANCHOR.x / TREE_CROWN.w, TREE_CROWN_ANCHOR.y / TREE_CROWN.h)
      .setFlipX(hash(x, y, 58) < 0.5).setScale(scale).setTint(0x9fb49a).setDepth(floorDepth + 0.8)
      .setData("phase", hash(x, y, 59) * Math.PI * 2);
    canopyCrowns.push(culler.add(crown, x, y));
  };

  const putGround = (x: number, y: number, g: number) => {
    if (g === Ground.Stone && stone) {
      groundLayer.putTileAt(stone.gid + theme.paving!.frame(x, y), x, y).tint = patchTint(x, y, 0.84, theme.shade);
      return;
    }
    const set = g === Ground.Mud ? mud : grass;
    const count = g === Ground.Mud ? MUD_VARIANTS : GRASS_VARIANTS;
    const v = hash(x, y, 7);
    // Metade dos tiles na primeira variação; as especiais (touceira, trevos) são raras.
    const frame = g === Ground.Grass ? (v < 0.88 ? Math.floor((v / 0.88) * 4) : v < 0.94 ? 4 : 5) : v < 0.5 ? 0 : 1 + Math.floor(((v - 0.5) / 0.5) * (count - 1));
    groundLayer.putTileAt(set.gid + frame, x, y).tint = patchTint(x, y, 0.8, theme.shade);
  };
  const putWater = (x: number, y: number) => {
    const deep = DIRS.every(([dx, dy]) => isWet(x + dx, y + dy));
    groundLayer.putTileAt(water.gid + (deep ? 2 : hash(x, y, 3) < 0.4 ? 1 : 0), x, y);
    return deep;
  };

  const decorAt = (frame: number, x: number, y: number) => decorLayer.putTileAt(decorFloor.gid + frame, x, y);
  const painter = theme.painter({
    scene, d, culler, floorDepth, decor: decorAt, tall, groundAt,
    layerDecor: (key, frame, x, y) => decorLayer.putTileAt(extraSet(key).gid + frame, x, y),
  });

  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const t = at(x, y);
      const i = y * d.width + x;
      if (edgeMasks[i]) {
        const frame = edgeFrames.get(edgeMasks[i])!;
        const edge = edgeLayer.putTileAt(edges.gid + frame, x, y);
        // O capim da franja e a beira da copa com o mesmo tom de mancha do chão e da copa vizinhos (sem marcar o tile).
        if (theme.tintEdges) edge.tint = edgeMasks[i] & CANOPY_EDGE ? patchTint(x, y, 0.82, theme.shade, 5, 67) : patchTint(x, y, 0.8, theme.shade);
      }

      if (isForest(x, y)) {
        if (edgeMasks[i] & CANOPY_EDGE) {
          // Beira da mata: o chão de baixo (água se a mata dá na água) e a copa por cima, na camada das bordas.
          if (waterAround(x, y) > 0) putWater(x, y);
          else putGround(x, y, ground[i]);
        } else {
          groundLayer.putTileAt(canopy.gid + canopyVariant(x, y), x, y).tint = patchTint(x, y, 0.82, theme.shade, 5, 67);
          // Copa mais alta, só no miolo da mata (longe de onde se anda).
          if (hash(x, y, 60) < 0.09 && !near(x, y, 2, (xx, yy) => !isForest(xx, yy))) emergent(x, y);
        }
        continue;
      }
      if (isPlank(x, y)) {
        const options = planks.get(i) ? PLANK_FRAMES.horizontal : PLANK_FRAMES.vertical;
        groundLayer.putTileAt(plankSet.gid + options[Math.floor(hash(x, y, 8) * options.length)], x, y);
        continue;
      }
      if (t === Tile.Water || treeInWater(x, y)) {
        const deep = putWater(x, y);
        const n = hash(x, y, 17);
        const m = hash(x, y, 18);
        if (treeInWater(x, y)) {
          decorLayer.putTileAt(decorWater.gid + MARSH_WATER.ring, x, y);
          tree(x, y);
        } else if (painter.water?.(x, y, deep)) {
          // Enfeite do tema (ruínas dentro da água).
        } else if (near(x, y, 1, (xx, yy) => treeInWater(xx, yy) && species(xx, yy) === "cypress") && n < 0.45) {
          decorLayer.putTileAt(decorWater.gid + MARSH_WATER.knees, x, y);
        } else if (deep && n < 0.3) {
          const options = [MARSH_WATER.pads, MARSH_WATER.padA, MARSH_WATER.flower, MARSH_WATER.duckweedA, MARSH_WATER.duckweedB, MARSH_WATER.duckweedB, MARSH_WATER.log];
          decorLayer.putTileAt(decorWater.gid + options[Math.floor(m * options.length)], x, y);
        } else if (!deep && n < 0.35) {
          decorLayer.putTileAt(decorWater.gid + (m < 0.6 ? MARSH_WATER.duckweedA : MARSH_WATER.padA), x, y);
        }
        continue;
      }

      const g = ground[i];
      putGround(x, y, g);
      if (isTree(x, y)) { tree(x, y); continue; }
      if (t === Tile.Ruin) { painter.ruin(x, y); continue; }
      if (special.has(i)) continue;
      if (painter.decor?.(x, y, g)) continue;

      const decor = (frame: number) => decorAt(frame, x, y);
      const n = hash(x, y, 23);
      const m = hash(x, y, 24);
      const byWater = DIRS.some(([dx, dy]) => isWater(x + dx, y + dy));
      const byForest = near(x, y, 1, isForest);
      const byTree = near(x, y, 1, isTree);

      if (byWater) {
        // Margem: taboas e juncos de pé junto da água, íris de vez em quando; no resto, poças e pegadas.
        if (n < 0.34) tall(m < 0.5 ? MARSH_TALL.cattailsA : MARSH_TALL.cattailsB, x, y);
        else if (n < 0.44) tall(m < 0.7 ? MARSH_TALL.reeds : MARSH_TALL.iris, x, y);
        else if (n < 0.5) decor(m < 0.5 ? MARSH_FLOOR.tracks : MARSH_FLOOR.puddle);
      } else if (g === Ground.Mud) {
        if (n < 0.14) decor(m < 0.4 ? MARSH_FLOOR.puddle : m < 0.7 ? MARSH_FLOOR.tracks : MARSH_FLOOR.twigs);
        else if (n < 0.2) tall(m < 0.6 ? MARSH_TALL.reeds : MARSH_TALL.pitcher, x, y);
      } else if ((byForest || byTree) && n < 0.34) {
        // Pé da mata e das árvores: musgo, samambaias, cogumelos, raízes e folhas caídas.
        if (n < 0.1) decor(m < 0.33 ? MARSH_FLOOR.mossA : m < 0.66 ? MARSH_FLOOR.mossB : MARSH_FLOOR.mossC);
        else if (m < 0.3) tall(MARSH_TALL.fern, x, y);
        else if (m < 0.42) decor(MARSH_FLOOR.roots);
        else if (m < 0.58) decor(m < 0.5 ? MARSH_FLOOR.mushroomsBrown : MARSH_FLOOR.mushroomsRed);
        else if (m < 0.75) decor(m < 0.66 ? MARSH_FLOOR.leavesA : MARSH_FLOOR.leavesB);
        else if (m < 0.83) tall(MARSH_TALL.toadstool, x, y);
        else if (m < 0.92) tall(MARSH_TALL.bush, x, y);
        else tall(MARSH_TALL.stump, x, y);
      } else if (field(x, y, 5, 75) > 0.6 && n < 0.3) {
        // Manchas de capim alto do brejo no campo aberto.
        tall(m < 0.4 ? MARSH_TALL.sedgeA : m < 0.8 ? MARSH_TALL.sedgeB : MARSH_TALL.reeds, x, y);
      } else if (n < 0.1) {
        // Campo aberto: um pouco de tudo, sem poluir.
        if (m < 0.16) tall(m < 0.08 ? MARSH_TALL.sedgeA : MARSH_TALL.reeds, x, y);
        else if (m < 0.28) tall(MARSH_TALL.bush, x, y);
        else if (m < 0.36) tall(MARSH_TALL.iris, x, y);
        else if (m < 0.42) tall(MARSH_TALL.pitcher, x, y);
        else if (m < 0.52) decor(m < 0.47 ? MARSH_FLOOR.leavesA : MARSH_FLOOR.leavesB);
        else if (m < 0.6) decor(MARSH_FLOOR.twigs);
        else if (m < 0.68) decor(MARSH_FLOOR.stone);
        else if (m < 0.76) tall(MARSH_TALL.fern, x, y);
        else if (m < 0.82) tall(MARSH_TALL.snag, x, y);
        else if (m < 0.88) decor(MARSH_FLOOR.mushroomsBrown);
        else if (m < 0.94) tall(MARSH_TALL.stump, x, y);
        else decor(MARSH_FLOOR.bones);
      }
    }
  }

  return createAmbience(scene, d, uiDepth, culler, crowns, canopyCrowns, theme);
}

/** Manchas grandes e suaves (0..1) em grade de `cell` tiles: onde o chão vira brejo ou musgo. */
export function field(x: number, y: number, cell: number, seed: number) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = smooth(x / cell - gx);
  const fy = smooth(y / cell - gy);
  const top = lerp(hash(gx, gy, seed), hash(gx + 1, gy, seed), fx);
  const bottom = lerp(hash(gx, gy + 1, seed), hash(gx + 1, gy + 1, seed), fx);
  return lerp(top, bottom, fy);
}

/**
 * Monta a textura das bordas: um quadro 32×32 por combinação que aparece no mapa (algumas centenas, em grade de
 * `GRID_COLUMNS` colunas). Devolve máscara → índice do quadro.
 */
function buildEdgeTexture(scene: Phaser.Scene, masks: Uint32Array, theme: WetlandTheme) {
  const EDGE_TEXTURE = theme.edges;
  const tex = theme.tex;
  const used = [...new Set(masks)].filter(Boolean).sort((a, b) => a - b);
  const frames = new Map(used.map((mask, i) => [mask, i]));
  if (scene.textures.exists(EDGE_TEXTURE)) scene.textures.remove(EDGE_TEXTURE);
  const source = (key: string) => scene.textures.get(key).getSourceImage() as CanvasImageSource;
  const fringe = source(tex.fringe);
  const shore = source(tex.shore);
  const shade = source(tex.shade);
  const rows = Math.ceil(Math.max(1, used.length) / GRID_COLUMNS);
  const { canvas, ctx } = makeCanvas(TILE_SIZE * GRID_COLUMNS, TILE_SIZE * rows);
  used.forEach((mask, i) => {
    const ox = (i % GRID_COLUMNS) * TILE_SIZE;
    const oy = Math.floor(i / GRID_COLUMNS) * TILE_SIZE;
    const draw = (img: CanvasImageSource, frame: number) =>
      ctx.drawImage(img, frame * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, ox, oy, TILE_SIZE, TILE_SIZE);
    if (mask & CANOPY_EDGE) {
      ctx.save();
      ctx.translate(ox, oy);
      canopyRim(ctx, mask & 0xff, (mask >> 8) & 0xff);
      ctx.restore();
      theme.tone?.(canvas, ox, oy, TILE_SIZE, TILE_SIZE);
      return;
    }
    // Ordem: sombra embaixo, depois a margem e o capim por cima.
    if (mask & EDGE.shadeN) draw(shade, 0);
    if (mask & EDGE.shadeW) draw(shade, 1);
    EDGE.shore.forEach((bit, k) => { if (mask & bit) draw(shore, k); });
    EDGE.corner.forEach((bit, k) => { if (mask & bit) draw(shore, 4 + k); });
    EDGE.outer.forEach((bit, k) => { if (mask & bit) draw(shore, 8 + k); });
    EDGE.fringe.forEach((bit, k) => { if (mask & bit) draw(fringe, k); });
    EDGE.fringeIn.forEach((bit, k) => { if (mask & bit) draw(fringe, 4 + k); });
    EDGE.fringeOut.forEach((bit, k) => { if (mask & bit) draw(fringe, 8 + k); });
  });
  scene.textures.addCanvas(EDGE_TEXTURE, canvas);
  return frames;
}

/** Névoas baixas em volta da câmera. */
const MIST_COUNT = 9;
/** Libélulas à vista. */
const DRAGONFLIES = 3;
/** Intervalo entre marolas e entre bolhas de gás na água à vista (ms). */
const RIPPLE_EVERY_MS = 300;
const BUBBLE_EVERY_MS = 520;

/**
 * Ambiente que acompanha a câmera: vaga-lumes, névoa baixa e esverdeada passando devagar, folhas caindo das copas,
 * libélulas zanzando, marolas e bolhas de gás subindo da água à vista, e as copas balançando (a que cobre o
 * jogador fica transparente).
 */
function createAmbience(
  scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller, crowns: Phaser.GameObjects.Image[], canopyCrowns: Phaser.GameObjects.Image[],
  theme: WetlandTheme,
): MapAmbience {
  const tex = theme.tex;
  const cam = scene.cameras.main;
  const randomZone = () => ({
    type: "random",
    source: new Phaser.Geom.Rectangle(0, 0, 1, 1),
    quantity: 1,
  }) as Phaser.Types.GameObjects.Particles.EmitZoneData;

  const fireflies = scene.add.particles(0, 0, tex.firefly, {
    lifespan: { min: 3500, max: 7000 },
    speed: { min: 3, max: 12 },
    angle: { min: 0, max: 360 },
    alpha: { values: [0, 1, 0.25, 0.9, 0.15, 1, 0], interpolation: "linear" },
    scale: { min: 0.7, max: 1.1 },
    frequency: 200,
    quantity: 1,
    maxAliveParticles: 28,
    blendMode: Phaser.BlendModes.ADD,
    emitZone: randomZone(),
  }).setDepth(uiDepth - 4);
  const leaves = scene.add.particles(0, 0, tex.leaf, {
    lifespan: { min: 4000, max: 7000 },
    speedX: { min: 4, max: 16 },
    speedY: { min: 10, max: 22 },
    rotate: { min: 0, max: 360 },
    alpha: { values: [0, 0.9, 0.9, 0], interpolation: "linear" },
    scale: { min: 1, max: 1.6 },
    frequency: 650,
    quantity: 1,
    maxAliveParticles: 10,
    emitZone: randomZone(),
  }).setDepth(uiDepth - 4);
  const zones = [fireflies, leaves].map((p) => (p.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source);

  const mists = Array.from({ length: MIST_COUNT }, (_, i) =>
    scene.add.image(0, 0, tex.mist)
      .setScale(2.2 + hash(i, 51) * 1.8)
      .setAlpha(0.22 + hash(i, 52) * 0.22)
      .setTint(theme.mist)
      .setDepth(uiDepth - 5)
      .setData("speed", 3 + hash(i, 53) * 5));
  let mistPlaced = false;

  // Libélulas: vão de ponto em ponto perto da câmera, paradas no ar um tempo, e disparam de novo.
  const flies = Array.from({ length: DRAGONFLIES }, () =>
    scene.add.image(0, 0, tex.dragonfly).setDepth(uiDepth - 4).setScale(1.4).setData({ tx: 0, ty: 0, wait: 0 }));
  let fliesPlaced = false;

  const visible = new Set<Phaser.GameObjects.GameObject>();
  let nextRipple = 0;
  let nextBubble = 0;
  /** Um tile de água qualquer à vista (ou nenhum). */
  const waterInView = (v: Phaser.Geom.Rectangle) => {
    const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
    const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
    return tileAt(d, x, y) === Tile.Water ? { x, y } : null;
  };
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      for (const z of zones) z.setTo(v.x, v.y, v.width, v.height);
      culler.update(v);
      const dt = scene.game.loop.delta / 1000;

      // Névoa: espalha na primeira vez; depois anda para a direita e reaparece do outro lado da tela.
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

      flies.forEach((f, i) => {
        if (!fliesPlaced) f.setPosition(v.x + hash(i, 56) * v.width, v.y + hash(i, 57) * v.height);
        const tx = f.getData("tx") as number;
        const ty = f.getData("ty") as number;
        const off = f.x < v.x - 40 || f.x > v.right + 40 || f.y < v.y - 40 || f.y > v.bottom + 40;
        if (off || (time > (f.getData("wait") as number) && Math.hypot(tx - f.x, ty - f.y) < 3)) {
          f.setData({ tx: v.x + Math.random() * v.width, ty: v.y + Math.random() * v.height, wait: time + 600 + Math.random() * 2000 });
          if (off) f.setPosition(v.x + Math.random() * v.width, v.y + Math.random() * v.height);
        }
        const dx = (f.getData("tx") as number) - f.x;
        const dy = (f.getData("ty") as number) - f.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const step = Math.min(dist, 140 * dt);
          f.x += (dx / dist) * step;
          f.y += (dy / dist) * step + Math.sin(time / 60 + i) * 0.3;
          f.setFlipX(dx < 0);
        }
      });
      fliesPlaced = true;

      // Copas à vista: balançam devagar; a que cobre o meio da tela (o jogador) fica transparente.
      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const mx = v.centerX;
      const my = v.centerY;
      for (const crown of crowns) {
        if (!visible.has(crown)) continue;
        crown.rotation = Math.sin(time / 1500 + crown.getData("phase")) * 0.025;
        const over = Math.abs(mx - crown.x) < 40 * crown.scaleX && my > crown.y - 66 * crown.scaleY && my < crown.y + 30 * crown.scaleY;
        crown.setAlpha(over ? 0.45 : 1);
      }
      for (const crown of canopyCrowns) {
        if (visible.has(crown)) crown.rotation = Math.sin(time / 1700 + crown.getData("phase")) * 0.02;
      }

      // Marola e bolha de gás em tiles de água quaisquer à vista.
      if (time >= nextRipple) {
        nextRipple = time + RIPPLE_EVERY_MS;
        const w = waterInView(v);
        if (w) {
          const ripple = scene.add.sprite(w.x * TILE_SIZE + Math.random() * 16 + 8, w.y * TILE_SIZE + Math.random() * 16 + 8, tex.ripple)
            .setDepth((w.y + 1) * TILE_SIZE - 0.5).setAlpha(0.7);
          ripple.play(tex.ripple);
          ripple.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => ripple.destroy());
        }
      }
      if (time >= nextBubble) {
        nextBubble = time + BUBBLE_EVERY_MS;
        const w = waterInView(v);
        if (w) {
          const bubble = scene.add.sprite(w.x * TILE_SIZE + 4 + Math.random() * 24, w.y * TILE_SIZE + 4 + Math.random() * 24, tex.bubble)
            .setDepth((w.y + 1) * TILE_SIZE - 0.5);
          bubble.play(tex.bubble);
          bubble.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => bubble.destroy());
        }
      }
    },
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
