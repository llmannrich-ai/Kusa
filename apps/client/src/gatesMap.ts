import * as Phaser from "phaser";
import { TILE_SIZE, Tile, isUnderground, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { TileAtlas, toCanvas } from "./art/duneArt.ts";
import {
  HD, OPEN, basaltTile, bushTile, cryptFloorTile, cryptWallTile, flatDecor, fringeEdge, grassTile, marbleTile, poolTile,
  quarter, shadeEdge, stairUpTile, travertineTile, type FlatDecor,
} from "./art/empireArt.ts";
import {
  ARCH, BLOCK, CITY_HEIGHTS, COLUMN, CYPRESS, FACADE, FACADE_DOOR, FACADE_FIRES, FLAME, MOSAIC_TILES, PILLAR, PILLAR_TORCH,
  PINE, SARCOPHAGUS, SMALL, STATUE, TOMB, TOWER, WALL_HEIGHTS, WALL_LINK, WALL_SPRITE, archSprite, columnSprite, cypressSprite,
  facadeSprite, flameFrame, mosaicImage, pillarSprite, pineCrown, pineTrunk, rubbleSprite, sarcophagusSprite, smallDecor, statueSprite,
  tombSprite, towerSprite, wallSprite, type ColumnKind, type SmallDecor,
} from "./art/empireMonuments.ts";
import { ChunkCuller, patchTint, type MapAmbience } from "./mapShared.ts";
import { addCanvasTexture } from "./art/canvasTexture.ts";

/** Fundo além das bordas: a mata na sombra. */
export const GATES_VOID = 0x2c3a1e;
/** Fundo da ruína subterrânea. */
const UNDER_VOID = 0x0c0a09;

const ZOOM = HD / TILE_SIZE;
const ATLAS = "gates-atlas";
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

/**
 * Folha de sprites de um tamanho só: cada quadro é pintado só se o mapa usar (como o atlas dos tiles), em linhas que
 * cabem no limite de textura dos celulares.
 */
export class SpriteSheet {
  private frames: (() => Uint8ClampedArray)[] = [];
  private keys = new Map<string, number>();
  constructor(readonly key: string, readonly w: number, readonly h: number) {}

  frame(key: string, draw: () => Uint8ClampedArray) {
    let i = this.keys.get(key);
    if (i === undefined) {
      i = this.frames.length;
      this.keys.set(key, i);
      this.frames.push(draw);
    }
    return i;
  }

  build(scene: Phaser.Scene) {
    if (scene.textures.exists(this.key)) scene.textures.remove(this.key);
    const cols = Math.max(1, Math.min(this.frames.length, Math.floor(4096 / this.w)));
    const rows = Math.max(1, Math.ceil(this.frames.length / cols));
    const { canvas, ctx } = makeCanvas(cols * this.w, rows * this.h);
    this.frames.forEach((draw, i) => ctx.drawImage(toCanvas(draw(), this.w, this.h), (i % cols) * this.w, Math.floor(i / cols) * this.h));
    const texture = addCanvasTexture(scene.textures, this.key, canvas)!;
    this.frames.forEach((_, i) => texture.add(i, 0, (i % cols) * this.w, Math.floor(i / cols) * this.h, this.w, this.h));
  }
}

/** Textura de uma imagem só (fachada, arco, torres, mosaico), feita uma vez por jogo. */
export function single(scene: Phaser.Scene, key: string, w: number, h: number, draw: () => Uint8ClampedArray) {
  if (!scene.textures.exists(key)) addCanvasTexture(scene.textures, key, toCanvas(draw(), w, h));
  return key;
}

/**
 * Desenha os Portões do Império (`generateGates`). Superfície em tilemaps de 128 px (um atlas só, com os quadros que o
 * mapa usa): capim, via de basalto, praça de travertino, pátio de mármore, tanques de fonte, moitas, as bordas (capim
 * entrando no calçamento, sombra do que é alto) e os enfeites rasteiros. Em sprites ordenados pela linha de baixo: os
 * muros (montados pelos vizinhos, cada tile na sua altura), a muralha com ameias, as torres e o arco do portão, colunas,
 * blocos caídos, estátuas, mausoléus, ciprestes e pinheiros-mansos e a fachada do templo com a escadaria e os
 * braseiros. Embaixo (a ruína subterrânea, à direita): lajes, muros de cantaria com nichos, tochas, pilares,
 * sarcófagos, entulho, o mosaico do santuário e a escada de volta. Tudo vem de `hash(x, y)`: todos veem o mesmo.
 */
export function drawGates(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const emp = d.empire!;
  const W = d.width;
  const H = d.height;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const under = (x: number) => isUnderground(d, x);
  const inR = (r: Rect, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  const wall = (x: number, y: number) => at(x, y) === Tile.Wall;
  const ruin = (x: number, y: number) => at(x, y) === Tile.Ruin && x >= 0 && y >= 0 && x < W && y < H;
  const water = (x: number, y: number) => at(x, y) === Tile.Water;
  const lone = (x: number, y: number, test: (x: number, y: number) => boolean) => test(x, y) && DIRS.every(([dx, dy]) => !test(x + dx, y + dy));
  const tree = (x: number, y: number) => !under(x) && x > 0 && y > 0 && lone(x, y, wall);
  const bush = (x: number, y: number) => wall(x, y) && !under(x) && !tree(x, y);
  const pillarAt = (x: number, y: number) => under(x) && lone(x, y, wall);
  const rock = (x: number, y: number) => wall(x, y) && (under(x) ? !pillarAt(x, y) : true);
  const statues = new Set(emp.statues.map((s) => s.y * W + s.x));
  const columns = new Set(emp.columns.map((s) => s.y * W + s.x));
  const inTemple = (x: number, y: number) => inR(emp.temple, x, y);
  const inTower = (x: number, y: number) => emp.towers.some((t) => inR(t, x, y));
  const inTomb = (x: number, y: number) => emp.tombs.some((t) => inR(t, x, y));
  const cityRow = (y: number) => y === emp.wallY || y === emp.wallY + 1;
  const special = (x: number, y: number) => inTemple(x, y) || inTower(x, y) || inTomb(x, y) || statues.has(y * W + x);
  /** Ruína desenhada como muro (o resto: colunas, blocos, estátuas e monumentos). */
  const masonry = (x: number, y: number) => ruin(x, y) && !under(x) && !special(x, y) && !lone(x, y, ruin);
  const forum = emp.plazas[0], court = emp.plazas[1];
  const paved = (x: number, y: number) => !under(x) && (emp.roads.some((r) => inR(r, x, y)) || emp.plazas.some((r) => inR(r, x, y)));
  const near = (x: number, y: number, reach: number, test: (x: number, y: number) => boolean) => {
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (test(x + dx, y + dy)) return true;
    return false;
  };
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
    return n < 0.45 ? 0 : 1 + Math.floor((n - 0.45) / 0.55 * (count - 1));
  };
  const cave = d.cave!;
  /** Tochas de baixo (nos muros com suporte e nos pilares): chama e luz, postas depois dos sprites. */
  const torches: { x: number; y: number; depth: number }[] = [];
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1 || d.side.some((r) => x === r.x + 1 && y === r.y + 1)
    || tileDistance(x, y, d.bossPortal.x, d.bossPortal.y) <= 1 || tileDistance(x, y, cave.exit.x, cave.exit.y) <= 1
    || tileDistance(x, y, cave.entrance.x, cave.entrance.y) <= 1 || cave.chests.some((c) => tileDistance(x, y, c.x, c.y) <= 1);

  // --- Chão, bordas e enfeites rasteiros (tilemap) ----------------------------------------
  const atlas = new TileAtlas();
  const ground = new Int32Array(W * H).fill(-1);
  const fringe = new Int32Array(W * H).fill(-1);
  const shade = new Int32Array(W * H).fill(-1);
  const decor = new Int32Array(W * H).fill(-1);
  const grassFrame = (x: number, y: number) => {
    const v = pick(x, y, 6, 1);
    return atlas.frame(`grass${v}`, () => grassTile(v).render(false));
  };
  const pavedFrame = (x: number, y: number) => {
    const q = quarter(x, y);
    if (inR(court, x, y)) return atlas.frame(`marble${q}`, () => marbleTile(q).render(false));
    if (inR(forum, x, y)) return atlas.frame(`trav${q}`, () => travertineTile(q).render(false));
    return atlas.frame(`basalt${q}`, () => basaltTile(q).render(false));
  };
  const hallKind = (x: number, y: number): 0 | 1 | 2 => (inR(d.boss, x, y) ? 1 : inR(cave.reward, x, y) ? 2 : 0);
  const chamber = (x: number, y: number) => emp.chambers.some((r) => inR(r, x, y));
  const high = (x: number, y: number) => bush(x, y) || inTower(x, y) || inTemple(x, y) || inTomb(x, y);

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = at(x, y);
      if (under(x)) {
        if (t === Tile.Wall && rock(x, y)) {
          const open = mask(x, y, (a, b) => !rock(a, b) && under(a) && a < W && b >= 0 && b < H);
          const south = (open & OPEN.s) !== 0;
          const kn = hash(x, y, 30);
          const kind = !south ? 0 : chamber(x, y + 1) || near(x, y, 1, chamber) ? (kn < 0.55 ? 1 : 0) : kn < 0.14 ? 2 : kn < 0.26 ? 1 : kn < 0.34 ? 3 : kn < 0.4 ? 4 : 0;
          const v = Math.floor(hash(x, y, 31) * 3);
          const bits = open & (OPEN.n | OPEN.e | OPEN.s | OPEN.w);
          ground[i] = atlas.frame(`cw${bits}-${kind}-${south ? v : 0}`, () => cryptWallTile(bits, kind, south ? v : 0).render(false));
          if (kind === 2) torches.push({ x: x * TILE_SIZE + 16, y: y * TILE_SIZE + 16, depth: (y + 1) * TILE_SIZE - 0.1 });
          continue;
        }
        if (t === Tile.Cave) { ground[i] = atlas.frame("stairUp", () => stairUpTile().render(false)); continue; }
        const q = quarter(x, y), k = hallKind(x, y);
        ground[i] = atlas.frame(`crypt${k}-${q}`, () => cryptFloorTile(q, k).render(false));
        const s = mask(x, y, rock) & (OPEN.n | OPEN.w | OPEN.nw);
        if (s) shade[i] = atlas.frame(`ushade${s}`, () => shadeEdge(s, 44, [0, 0, 0]));
        if (reserved(x, y) || t !== Tile.Floor || inR(d.boss, x, y) && Math.abs(x - (d.boss.x + d.boss.w / 2)) < 6) continue;
        const n = hash(x, y, 32);
        const byWall = near(x, y, 1, rock);
        if (n < (chamber(x, y) ? 0.3 : byWall ? 0.12 : 0.05)) {
          const nw = rock(x - 1, y) && rock(x, y - 1);
          const m = hash(x, y, 33);
          const kind: FlatDecor = nw && m < 0.5 ? "web" : inR(cave.reward, x, y) ? "coins" : m < 0.35 ? "dust" : m < 0.6 ? "bones" : m < 0.75 ? "skull" : m < 0.9 ? "shards" : "stones";
          const v = Math.floor(hash(x, y, 34) * 3);
          decor[i] = atlas.frame(`flat-${kind}-${v}`, () => flatDecor(kind, v).render(kind !== "dust" && kind !== "web"));
        }
        continue;
      }
      if (t === Tile.Wall && bush(x, y)) {
        const open = mask(x, y, (a, b) => !bush(a, b) && a >= 0 && b >= 0 && a < W && b < H && !under(a));
        const v = hash(x, y, 2) < 0.6 ? 0 : 1;
        ground[i] = atlas.frame(`bush${open}-${v}`, () => bushTile(open, v).render(false));
        continue;
      }
      if (t === Tile.Water) {
        const land = mask(x, y, (a, b) => !water(a, b));
        const v = Math.floor(hash(x, y, 3) * 2);
        ground[i] = atlas.frame(`pool${land}-${v}`, () => poolTile(land, v).render(false));
        continue;
      }
      ground[i] = paved(x, y) || inTemple(x, y) ? pavedFrame(x, y) : grassFrame(x, y);
      if (paved(x, y)) {
        const g = mask(x, y, (a, b) => !paved(a, b) && !water(a, b) && !under(a) && !inTemple(a, b) && !inTower(a, b) && !(cityRow(b) && ruin(a, b)));
        if (g) fringe[i] = atlas.frame(`fringe${g}`, () => fringeEdge(g).render(false));
      }
      const s = mask(x, y, high) & (OPEN.n | OPEN.w | OPEN.nw);
      if (s && !high(x, y)) shade[i] = atlas.frame(`shade${s}`, () => shadeEdge(s, 40));

      if (reserved(x, y) || t !== Tile.Floor || ruin(x, y)) continue;
      const byRuin = near(x, y, 1, (a, b) => ruin(a, b) && !under(a));
      const n = hash(x, y, 4);
      const chance = paved(x, y) ? (byRuin ? 0.08 : 0.025) : byRuin ? 0.14 : near(x, y, 1, tree) ? 0.1 : 0.03;
      if (n >= chance) continue;
      const kind = flatKind(hash(x, y, 5), { paved: paved(x, y), ruins: byRuin, trees: near(x, y, 1, tree) });
      const v = Math.floor(hash(x, y, 6) * 3);
      decor[i] = atlas.frame(`flat-${kind}-${v}`, () => flatDecor(kind, v).render(kind !== "puddle"));
    }

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
        // Manchas grandes de luz e sombra: o chão deixa de parecer chapado (embaixo, mais fortes).
        if (tint) tile.tint = under(x) ? patchTint(x, y, 0.7, [0.9, 0.8, 0.7], 5, 71) : patchTint(x, y, 0.84, [0.9, 0.92, 0.7], 7, 67);
      }
    return l;
  };
  layer("chao", ground, true);
  layer("capim", fringe, true);
  layer("sombra", shade);
  layer("enfeites", decor);

  // --- De pé ---------------------------------------------------------------------------------
  const culler = new ChunkCuller();
  const walls = new SpriteSheet("gates-walls", WALL_SPRITE.w, WALL_SPRITE.h);
  const cols = new SpriteSheet("gates-columns", COLUMN.w, COLUMN.h);
  const blocks = new SpriteSheet("gates-blocks", BLOCK.w, BLOCK.h);
  const statueSheet = new SpriteSheet("gates-statues", STATUE.w, STATUE.h);
  const tombs = new SpriteSheet("gates-tombs", TOMB.w, TOMB.h);
  const cypress = new SpriteSheet("gates-cypress", CYPRESS.w, CYPRESS.h);
  const pines = new SpriteSheet("gates-pines", PINE.w, PINE.h);
  const pillars = new SpriteSheet("gates-pillars", PILLAR.w, PILLAR.h);
  const sarcs = new SpriteSheet("gates-sarcophagi", SARCOPHAGUS.w, SARCOPHAGUS.h);
  const smalls = new SpriteSheet("gates-small", SMALL.w, SMALL.h);
  type Placed = { sheet: SpriteSheet; frame: number; x: number; y: number; px: number; py: number; depth: number; flip?: boolean };
  const placed: Placed[] = [];
  const crowns: Phaser.GameObjects.Image[] = [];
  const put = (sheet: SpriteSheet, frame: number, x: number, y: number, flip = false, px = x * TILE_SIZE + TILE_SIZE / 2, py = (y + 1) * TILE_SIZE) =>
    placed.push({ sheet, frame, x, y, px, py, depth: (y + 1) * TILE_SIZE - 0.25, flip });
  const height = (x: number, y: number) => {
    if (!masonry(x, y)) return 0;
    // A altura muda por trecho (3 tiles), não por tile: o muro fica contínuo, com um degrau aqui e ali.
    if (cityRow(y)) return CITY_HEIGHTS[Math.floor(hash(Math.floor(x / 4), 0, 40) * CITY_HEIGHTS.length)];
    return WALL_HEIGHTS[Math.floor(hash(Math.floor(x / 3), Math.floor(y / 3), 41) * WALL_HEIGHTS.length)];
  };
  const pineTops = Array.from({ length: 3 }, (_, v) => pineTrunk(v));

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const flip = hash(x, y, 42) < 0.5;
      if (under(x)) {
        if (pillarAt(x, y)) {
          const torch = hash(x, y, 43) < 0.4;
          const v = Math.floor(hash(x, y, 44) * 2);
          put(pillars, pillars.frame(`p${v}-${torch}`, () => pillarSprite(v, torch)), x, y);
          if (torch) torches.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: (y + 1) * TILE_SIZE - (PILLAR.h - PILLAR_TORCH[1]) / ZOOM, depth: (y + 1) * TILE_SIZE - 0.1 });
        } else if (ruin(x, y)) {
          if (chamber(x, y) && lone(x, y, ruin)) {
            const v = Math.floor(hash(x, y, 45) * 2);
            put(sarcs, sarcs.frame(`s${v}`, () => sarcophagusSprite(v)), x, y, flip);
          } else {
            const v = Math.floor(hash(x, y, 46) * 3);
            put(blocks, blocks.frame(`u${v}`, () => rubbleSprite(v, true)), x, y, flip);
          }
        } else if (at(x, y) === Tile.Floor && !reserved(x, y) && decor[y * W + x] < 0 && (chamber(x, y) || near(x, y, 1, rock)) && hash(x, y, 47) < (chamber(x, y) ? 0.12 : 0.03)) {
          const kind: SmallDecor = hash(x, y, 48) < 0.5 ? "urns" : "skulls";
          put(smalls, smalls.frame(kind, () => smallDecor(kind, 0)), x, y, flip);
        }
        continue;
      }
      if (tree(x, y)) {
        if (hash(x, y, 49) < 0.72) {
          const v = Math.floor(hash(x, y, 50) * 3);
          put(cypress, cypress.frame(`c${v}`, () => cypressSprite(v)), x, y, flip);
        } else {
          const v = Math.floor(hash(x, y, 51) * 3);
          put(pines, pines.frame(`t${v}`, () => pineTops[v].image), x, y, flip);
          put(pines, pines.frame(`k${v}`, () => pineCrown(v, pineTops[v].top)), x, y, flip);
          placed[placed.length - 1].depth += 0.1;
          (placed[placed.length - 1] as Placed & { crown?: boolean }).crown = true;
        }
        continue;
      }
      if (!ruin(x, y)) {
        const t = at(x, y);
        if (t !== Tile.Floor || reserved(x, y) || decor[y * W + x] >= 0 || paved(x, y)) continue;
        const byRuin = near(x, y, 1, (a, b) => ruin(a, b) && !under(a));
        if (hash(x, y, 52) >= (byRuin ? 0.06 : 0.025)) continue;
        const m = hash(x, y, 53);
        const kind: SmallDecor = byRuin ? (m < 0.35 ? "acanthus" : m < 0.6 ? "amphora" : m < 0.75 ? "head" : "grass") : m < 0.4 ? "grass" : m < 0.75 ? "shrub" : "acanthus";
        const v = Math.floor(hash(x, y, 54) * 2);
        put(smalls, smalls.frame(`${kind}${v}`, () => smallDecor(kind, v)), x, y, flip);
        continue;
      }
      if (statues.has(y * W + x)) {
        const guard = inR(court, x, y);
        const v = guard && x > cave.entrance.x ? 1 : 0;
        put(statueSheet, statueSheet.frame(`${guard}${v}`, () => statueSprite(guard ? "guard" : "emperor", v)), x, y, guard && x > cave.entrance.x);
        continue;
      }
      if (special(x, y)) continue;
      if (lone(x, y, ruin)) {
        if (columns.has(y * W + x)) {
          // Colunatas: inteiras quase todas; as de fora das praças às vezes quebradas.
          const m = hash(x, y, 55);
          const kind: ColumnKind = inR(court, x, y) || inR(forum, x, y)
            ? (m < 0.75 ? (inR(court, x, y) ? "corinthian" : "ionic") : "broken")
            : m < 0.5 ? "ionic" : m < 0.8 ? "broken" : "stump";
          const v = Math.floor(hash(x, y, 56) * 3);
          put(cols, cols.frame(`${kind}${v}`, () => columnSprite(kind, v)), x, y);
        } else {
          const m = hash(x, y, 57);
          if (m < 0.3) {
            const kind: ColumnKind = m < 0.15 ? "stump" : "broken";
            const v = Math.floor(hash(x, y, 58) * 3);
            put(cols, cols.frame(`${kind}${v}`, () => columnSprite(kind, v)), x, y);
          } else {
            const v = Math.floor(hash(x, y, 59) * 4);
            put(blocks, blocks.frame(`b${v}`, () => rubbleSprite(v)), x, y, flip);
          }
        }
        continue;
      }
      // Muro: liga nos vizinhos que também são muro desenhado assim.
      const L = WALL_LINK;
      let links = 0;
      if (masonry(x, y - 1)) links |= L.n;
      if (masonry(x + 1, y) || (cityRow(y) && inTower(x + 1, y))) links |= L.e;
      if (masonry(x, y + 1)) links |= L.s;
      if (masonry(x - 1, y) || (cityRow(y) && inTower(x - 1, y))) links |= L.w;
      const h = height(x, y);
      const step = links & L.s ? Math.max(0, h - height(x, y + 1)) : 0;
      const vn = hash(Math.floor(x / 3), Math.floor(y / 3), 60);
      const city = cityRow(y);
      const v = city ? (vn < 0.5 ? 0 : 1) : vn < 0.45 ? 0 : vn < 0.85 ? 1 : 2;
      put(walls, walls.frame(`w${links}-${h}-${step}-${v}-${city}`, () => wallSprite(links, h, step, v, city)), x, y);
    }

  // Mausoléus (2×2), pela linha de baixo.
  for (const t of emp.tombs) {
    const v = Math.floor(hash(t.x, t.y, 61) * 3);
    put(tombs, tombs.frame(`m${v}`, () => tombSprite(v)), t.x, t.y + 1, false, (t.x + 1) * TILE_SIZE, (t.y + 2) * TILE_SIZE);
  }

  for (const sheet of [walls, cols, blocks, statueSheet, tombs, cypress, pines, pillars, sarcs, smalls]) sheet.build(scene);
  for (const s of placed) {
    const img = culler.add(scene.add.image(s.px, s.py, s.sheet.key, s.frame).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth(s.depth).setFlipX(!!s.flip), s.x, s.y);
    if ((s as Placed & { crown?: boolean }).crown) crowns.push(img);
  }

  // Monumentos grandes: torres, arco do portão, fachada do templo, mosaico do santuário.
  const big: { img: Phaser.GameObjects.Image; hide: Rect }[] = [];
  for (const [k, t] of emp.towers.entries()) {
    const key = single(scene, "gates-tower", TOWER.w, TOWER.h, () => towerSprite(-1));
    const img = scene.add.image((t.x + t.w / 2) * TILE_SIZE, (t.y + t.h) * TILE_SIZE, key).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth((t.y + t.h) * TILE_SIZE - 0.25).setFlipX(k === 1);
    big.push({ img: culler.add(img, t.x + 1, t.y + t.h - 1), hide: { x: t.x - 1, y: t.y - 6, w: t.w + 2, h: 6 } });
  }
  const g = emp.gate;
  const archKey = single(scene, "gates-arch", ARCH.w, ARCH.h, archSprite);
  const arch = scene.add.image((g.x + g.w / 2) * TILE_SIZE, (g.y + 2) * TILE_SIZE, archKey).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth((g.y + 2) * TILE_SIZE + 0.75);
  big.push({ img: culler.add(arch, g.x + 2, g.y + 1), hide: { x: g.x - 1, y: g.y - 3, w: g.w + 2, h: 5 } });
  // A fachada do templo e o mosaico do santuário são as maiores pinturas e ficam longe da entrada: saem nos primeiros
  // quadros da hunt, uma por quadro, e não atrasam o mapa aparecer.
  const later: (() => void)[] = [];
  const tp = emp.temple;
  const facadeX = tp.x * TILE_SIZE, facadeY = (tp.y + tp.h) * TILE_SIZE;
  later.push(() => {
    const key = single(scene, "gates-facade", FACADE.w, FACADE.h, facadeSprite);
    culler.add(scene.add.image(facadeX, facadeY, key).setOrigin(0, 1).setScale(1 / ZOOM).setDepth(facadeY - 0.25), tp.x + 4, tp.y + 3);
  });
  const bc = { x: d.boss.x + d.boss.w / 2, y: d.boss.y + d.boss.h / 2 };
  later.push(() => {
    const key = single(scene, "gates-mosaic", MOSAIC_TILES.w * HD, MOSAIC_TILES.h * HD, mosaicImage);
    culler.add(scene.add.image(bc.x * TILE_SIZE, bc.y * TILE_SIZE, key).setScale(1 / ZOOM).setDepth(floorDepth + 0.5), Math.floor(bc.x), Math.floor(bc.y));
  });

  // Chamas: braseiros da fachada e tochas de baixo.
  const flameKey = "gates-flame";
  if (!scene.textures.exists(flameKey)) {
    const { canvas, ctx } = makeCanvas(FLAME.w * 4, FLAME.h);
    for (let k = 0; k < 4; k++) ctx.drawImage(toCanvas(flameFrame(k), FLAME.w, FLAME.h), k * FLAME.w, 0);
    const tex = addCanvasTexture(scene.textures, flameKey, canvas)!;
    for (let k = 0; k < 4; k++) tex.add(k, 0, k * FLAME.w, 0, FLAME.w, FLAME.h);
  }
  createGlowArt(scene);
  const flames: Phaser.GameObjects.Image[] = [];
  const glows: Phaser.GameObjects.Image[] = [];
  const fire = (px: number, py: number, depth: number, scale: number, tx: number, ty: number, tint = 0xffa040, glowScale = 1) => {
    const f = culler.add(scene.add.image(px, py, flameKey, 0).setOrigin(0.5, 1).setScale(scale / ZOOM).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD), tx, ty);
    f.setData("phase", hash(tx, ty, 62) * 10);
    flames.push(f);
    const l = culler.add(scene.add.image(px, py - 6 * scale, GLOW).setScale(glowScale).setAlpha(0.5).setTint(tint).setDepth(uiDepth - 6)
      .setBlendMode(Phaser.BlendModes.ADD), tx, ty);
    l.setData("phase", hash(tx, ty, 63) * 10).setData("alpha", 0.5);
    glows.push(l);
  };
  for (const [fx, fy] of FACADE_FIRES) fire(facadeX + fx / ZOOM, facadeY - (FACADE.h - fy) / ZOOM, facadeY + 0.1, 1.1, tp.x + 4, tp.y + 3, 0xffa040, 1.3);
  for (const t of torches) fire(t.x, t.y + 2, t.depth, 0.6, Math.floor(t.x / TILE_SIZE), Math.floor(t.y / TILE_SIZE), 0xff9a40, 0.9);
  // A luz da escadaria: violeta, respirando devagar.
  const door = { x: facadeX + FACADE_DOOR[0] / ZOOM, y: facadeY - (FACADE.h - FACADE_DOOR[1]) / ZOOM };
  const doorGlow = culler.add(scene.add.image(door.x, door.y, GLOW).setScale(1.1, 0.8).setTint(0x9a6ae0).setAlpha(0.4).setDepth(facadeY)
    .setBlendMode(Phaser.BlendModes.ADD), tp.x + 4, tp.y + 3);
  // Luz do dia descendo pela escada de volta.
  culler.add(scene.add.image(cave.exit.x * TILE_SIZE + 16, (cave.exit.y + 1) * TILE_SIZE, BEAM).setOrigin(0.5, 1).setAlpha(0.55).setDepth(uiDepth - 6)
    .setBlendMode(Phaser.BlendModes.ADD), cave.exit.x, cave.exit.y);

  return createAmbience(scene, d, uiDepth, culler, { crowns, flames, glows, big, door, doorGlow, later });
}

/** Enfeite rasteiro conforme o lugar: cacos, tesselas e tambores perto das ruínas, folhas sob as árvores, poças na via. */
function flatKind(m: number, at: { paved: boolean; ruins: boolean; trees: boolean }): FlatDecor {
  if (at.paved) return m < 0.3 ? "puddle" : m < 0.55 ? "shards" : m < 0.75 ? "leaves" : m < 0.9 ? "stones" : "coins";
  if (at.ruins) {
    const table: [number, FlatDecor][] = [[0.2, "shards"], [0.36, "tesserae"], [0.5, "drum"], [0.62, "inscription"], [0.74, "stones"], [0.84, "weeds"], [0.92, "bones"], [0.97, "helmet"], [1, "coins"]];
    return table.find(([limit]) => m < limit)![1];
  }
  if (at.trees) return m < 0.7 ? "leaves" : "weeds";
  return m < 0.45 ? "weeds" : m < 0.7 ? "stones" : m < 0.85 ? "leaves" : m < 0.95 ? "shards" : "bones";
}

export const GLOW = "gates-glow";
const BEAM = "gates-beam";
export const MOTE = "gates-mote";
export const MIST = "gates-mist";
const GLINT = "gates-glint";

/** Texturas do ambiente: luz redonda, facho de luz, cisco dourado, névoa e brilho na água. */
export function createGlowArt(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const { canvas, ctx } = makeCanvas(w, h);
    paint(ctx);
    addCanvasTexture(scene.textures, key, canvas);
  };
  add(GLOW, 96, 96, (ctx) => {
    // Luz em anéis (pixel art: 4 faixas, sem degradê liso).
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        const d = Math.hypot(x - 48, y - 48) / 48;
        if (d >= 1) continue;
        const a = d < 0.3 ? 0.55 : d < 0.55 ? 0.34 : d < 0.8 ? 0.18 : 0.07;
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
  });
  add(BEAM, 40, 96, (ctx) => {
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 40; x++) {
        const w = 8 + (y / 96) * 12;
        const d = Math.abs(x - 20) / w;
        if (d >= 1) continue;
        ctx.fillStyle = `rgba(255, 236, 190, ${(d < 0.5 ? 0.3 : 0.15) * (y / 96)})`;
        ctx.fillRect(x, y, 1, 1);
      }
  });
  add(MOTE, 2, 2, (ctx) => { ctx.fillStyle = "#fff4c8"; ctx.fillRect(0, 0, 2, 2); });
  add(MIST, 24, 12, (ctx) => {
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 24; x++) {
        const d = Math.hypot((x - 12) / 12, (y - 6) / 6);
        if (d < 1) { ctx.fillStyle = `rgba(200, 180, 240, ${d < 0.5 ? 0.5 : 0.25})`; ctx.fillRect(x, y, 1, 1); }
      }
  });
  add(GLINT, 9, 9, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 0, 1, 9);
    ctx.fillRect(0, 4, 9, 1);
    ctx.fillRect(3, 3, 3, 3);
  });
}

const GLINT_EVERY_MS = 260;

/**
 * Ambiente: ciscos dourados flutuando na luz (na superfície), as copas dos pinheiros e os monumentos ficando
 * transparentes com o herói atrás, as chamas dos braseiros e das tochas tremendo com a luz, a escadaria soltando uma
 * névoa violeta que respira, o sol brilhando nos tanques e, embaixo, o escuro (fundo e cantos da tela).
 */
function createAmbience(
  scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller,
  art: {
    crowns: Phaser.GameObjects.Image[]; flames: Phaser.GameObjects.Image[]; glows: Phaser.GameObjects.Image[];
    big: { img: Phaser.GameObjects.Image; hide: Rect }[]; door: { x: number; y: number }; doorGlow: Phaser.GameObjects.Image;
    later: (() => void)[];
  },
): MapAmbience {
  const cam = scene.cameras.main;
  const game = document.getElementById("game");
  const motes = scene.add.particles(0, 0, MOTE, {
    lifespan: { min: 2400, max: 4200 },
    speedY: { min: -8, max: 10 },
    speedX: { min: 6, max: 18 },
    alpha: { values: [0, 0.7, 0.5, 0], interpolation: "linear" },
    scale: { min: 0.5, max: 1 },
    frequency: 140,
    maxAliveParticles: 26,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (motes.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;
  const mist = scene.add.particles(art.door.x, art.door.y + 4, MIST, {
    lifespan: { min: 1800, max: 2800 },
    speedY: { min: 4, max: 12 },
    speedX: { min: -6, max: 6 },
    alpha: { values: [0, 0.35, 0.2, 0], interpolation: "linear" },
    scale: { start: 0.4, end: 1.1 },
    frequency: 260,
    maxAliveParticles: 12,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(-12, -4, 24, 6), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(art.doorGlow.depth + 0.05).setBlendMode(Phaser.BlendModes.ADD);

  const visible = new Set<Phaser.GameObjects.GameObject>();
  let below: boolean | null = null;
  let nextGlint = 0;
  let startedAt = -1;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      if (startedAt < 0) startedAt = time;
      if (art.later.length && time - startedAt > 250) art.later.shift()!();
      const inside = isUnderground(d, Math.floor(v.centerX / TILE_SIZE));
      if (inside !== below) {
        below = inside;
        motes.emitting = !inside;
        motes.setVisible(!inside);
        mist.emitting = !inside;
        cam.setBackgroundColor(inside ? UNDER_VOID : GATES_VOID);
        game?.classList.toggle("cave", inside);
      }
      zone.setTo(v.x, v.y, v.width, v.height);
      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const mx = v.centerX, my = v.centerY;
      const tx = Math.floor(mx / TILE_SIZE), ty = Math.floor(my / TILE_SIZE);
      for (const crown of art.crowns) {
        if (!visible.has(crown)) continue;
        const over = Math.abs(mx - crown.x) < 26 && my > crown.y - 80 && my < crown.y - 34;
        crown.setAlpha(over ? 0.45 : 1);
      }
      for (const b of art.big) {
        if (!visible.has(b.img)) continue;
        const h = b.hide;
        b.img.setAlpha(tx >= h.x && ty >= h.y && tx < h.x + h.w && ty < h.y + h.h ? 0.55 : 1);
      }
      // Chamas: troca de quadro em ritmo próprio; a luz treme junto.
      for (const f of art.flames) if (visible.has(f)) f.setFrame(Math.floor(time / 110 + f.getData("phase")) % 4);
      for (const l of art.glows) {
        if (!visible.has(l)) continue;
        const ph = l.getData("phase");
        l.setAlpha(l.getData("alpha") * (0.78 + 0.14 * Math.sin(time / 90 + ph) + 0.08 * Math.sin(time / 37 + ph * 3)));
      }
      if (visible.has(art.doorGlow)) art.doorGlow.setAlpha(0.28 + 0.2 * (0.5 + 0.5 * Math.sin(time / 1300)));

      if (inside || time < nextGlint) return;
      nextGlint = time + GLINT_EVERY_MS;
      const gx = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
      const gy = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
      if (tileAt(d, gx, gy) !== Tile.Water) return;
      const glint = scene.add.image(gx * TILE_SIZE + 6 + Math.random() * 20, gy * TILE_SIZE + 6 + Math.random() * 20, GLINT)
        .setDepth((gy + 1) * TILE_SIZE - 0.5).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
      scene.tweens.add({ targets: glint, alpha: { from: 1, to: 0 }, scale: 0.9, duration: 500, onComplete: () => glint.destroy() });
    },
  };
}
