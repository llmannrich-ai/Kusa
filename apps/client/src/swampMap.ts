import type * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, type Dungeon, type Rect } from "@kusa/shared";
import { hash } from "./art/pixels.ts";
import { SWAMP_TEXTURE, floorVariants } from "./art/textures.ts";

/** Fundo além da mata: verde quase preto, como a copa fechada da floresta. */
export const SWAMP_VOID = 0x0b140a;

/**
 * Desenha o Pântano das Ruínas. O chão (capim, lama perto da água, pedra nas ruínas), a água e a
 * mata fechada ficam em tilemaps (o Phaser só desenha o que está na tela). As árvores da beira da
 * mata, os muros e as colunas são sprites ordenados pela linha de baixo, como os personagens.
 */
export function drawSwamp(scene: Phaser.Scene, d: Dungeon, floorDepth: number) {
  const at = (x: number, y: number) => tileAt(d, x, y);
  const ruins = [d.boss, ...d.side];
  const inRuins = (x: number, y: number) => ruins.some((r) => inside(r, x, y));
  const around = (x: number, y: number, test: (t: number) => boolean) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && test(at(x + dx, y + dy))) return true;
    return false;
  };
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
  const sets = [grass, mud, stone, forest, water, canopy].map((t) => t.set);
  const ground = map.createBlankLayer("chao", sets)!.setDepth(floorDepth);
  // Copa da mata longe do chão: árvores achatadas no tilemap, porque ninguém anda atrás delas.
  const deep = map.createBlankLayer("copa", sets)!.setDepth(floorDepth);

  const treeFrames = floorVariants(scene, SWAMP_TEXTURE.tree);
  const wallFrames = floorVariants(scene, SWAMP_TEXTURE.ruinWall);
  const columnFrames = floorVariants(scene, SWAMP_TEXTURE.column);
  const sprite = (key: string, frame: number, x: number, y: number) =>
    scene.add.image(x * TILE_SIZE, y * TILE_SIZE, key, frame).setOrigin(0).setDepth((y + 1) * TILE_SIZE);

  for (let y = 0; y < d.height; y++) {
    for (let x = 0; x < d.width; x++) {
      const t = at(x, y);
      if (t === Tile.Water) {
        // Água funda no meio da lagoa; na beira, rasa (às vezes mexida).
        const deepWater = at(x - 1, y) === Tile.Water && at(x + 1, y) === Tile.Water
          && at(x, y - 1) === Tile.Water && at(x, y + 1) === Tile.Water;
        ground.putTileAt(water.gid + (deepWater ? 2 : hash(x, y, 3) < 0.25 ? 1 : 0), x, y);
        continue;
      }
      if (t === Tile.Wall) {
        ground.putTileAt(forest.gid + pick(x, y, forest.count), x, y);
        const tree = Math.floor(hash(x, y, 5) * treeFrames);
        if (around(x, y, (n) => n !== Tile.Wall)) sprite(SWAMP_TEXTURE.tree, tree, x, y);
        else deep.putTileAt(canopy.gid + tree, x, y);
        continue;
      }
      const floor = inRuins(x, y) ? stone : around(x, y, (n) => n === Tile.Water) ? mud : grass;
      ground.putTileAt(floor.gid + pick(x, y, floor.count), x, y);
      if (t === Tile.Ruin) {
        // Pedra ligada a outra vira trecho de muro; pedra sozinha, coluna caída.
        const joined = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].includes(Tile.Ruin);
        if (joined) sprite(SWAMP_TEXTURE.ruinWall, Math.floor(hash(x, y, 9) * wallFrames), x, y);
        else sprite(SWAMP_TEXTURE.column, Math.floor(hash(x, y, 11) * columnFrames), x, y);
      }
    }
  }
}

function inside(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}
