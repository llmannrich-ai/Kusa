import type * as Phaser from "phaser";
import { TILE_SIZE, type Dungeon } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import type { SwampHd } from "./art/proto/swampHd.ts";

/** Lado do tile na arte nova (128 px por tile; o mapa desenha em 1/4). */
const HD = 128;
/** Quadros por linha e linhas por textura das bordas montadas aqui (4096 px no máximo, o limite do celular). */
const COLS = 16;
const ROWS = 32;

/**
 * Terreno do chão na arte nova; a ordem é a prioridade: o terreno mais alto invade a beira do mais baixo. As lajes
 * (`Stone`) continuam no desenho antigo, por baixo: aqui só recebem a beira dos vizinhos.
 */
export const enum HdGround { Stone, Water, Mud, Grass, Moss, Canopy }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const; // N, L, S, O
const CORNERS = [[1, -1], [-1, -1], [1, 1], [-1, 1]] as const; // NE, NO, SE, SO

/** Faixas de borda (6×2 tiles): a linha de cima fica no tile de cima, a de baixo no tile de baixo. */
const enum Strip { Shore, GrassMud, Canopy }

/** Ruído suave de uma dimensão (0..1), determinístico. */
function noise1(x: number, seed: number) {
  const i = Math.floor(x), f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash(i, seed, 91) * (1 - s) + hash(i + 1, seed, 91) * s;
}

/**
 * Máscara da beira (alfa 0/255, 128×128): o terreno vizinho invade o tile por um lado (0–3) ou por uma quina (4–7),
 * com o contorno irregular em blocos de 2 px (pixel duro, sem transparência pela metade). O contorno muda com o quadro
 * da textura (0–8), então tiles vizinhos não repetem a mesma beira.
 */
function edgeMask(shape: number, frame: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(HD, HD);
  const img = ctx.createImageData(HD, HD);
  const seed = shape * 7 + frame * 31;
  for (let Y = 0; Y < HD; Y += 2) {
    for (let X = 0; X < HD; X += 2) {
      let inside: boolean;
      if (shape < 4) {
        // Distância até o lado de onde vem o vizinho, e a profundidade irregular ao longo dele.
        const [along, depth] = shape === 0 ? [X, Y] : shape === 1 ? [Y, HD - 1 - X] : shape === 2 ? [X, HD - 1 - Y] : [Y, X];
        const reach = 14 + 30 * noise1(along / 18, seed) + 8 * noise1(along / 5, seed + 3);
        inside = depth < reach;
      } else {
        const [cx, cy] = CORNERS[shape - 4];
        const dx = cx > 0 ? HD - 1 - X : X, dy = cy < 0 ? Y : HD - 1 - Y;
        const ang = Math.atan2(dy, dx);
        inside = Math.hypot(dx, dy) < 26 + 22 * noise1(ang * 4, seed);
      }
      if (!inside) continue;
      for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) img.data[((Y + oy) * HD + X + ox) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export interface HdTerrain {
  /** Terreno do tile (x, y) na arte nova, ou -1 fora do mapa. */
  at(x: number, y: number): number;
  /** Tile sem chão novo (lajes e passarelas do desenho antigo, que fica por baixo e aparece pelo buraco). */
  hole(x: number, y: number): boolean;
}

/**
 * Chão do Pântano das Ruínas na arte nova: as texturas do agente de arte (3×3 tiles, cada tile pega o pedaço da sua
 * posição, então a textura corre sem emenda) e, nas beiras, as faixas desenhadas (margem com a terra em cima, capim
 * sobre lama e a copa com os troncos do lado sul); nos outros lados e quinas, o terreno mais alto invade o mais baixo
 * com um contorno irregular. Tudo num tilemap à parte em 128 px por tile, desenhado em 1/4, por baixo das camadas
 * antigas (lajes, passarelas, enfeites, árvores e ruínas continuam as de antes).
 */
export function drawWetlandHd(scene: Phaser.Scene, d: Dungeon, floorDepth: number, art: SwampHd, terrain: HdTerrain) {
  const W = d.width, H = d.height;
  const t = (x: number, y: number) => terrain.at(x, y);
  const hole = (x: number, y: number) => terrain.hole(x, y);
  const textures: Record<number, HTMLImageElement> = {
    [HdGround.Water]: art.water, [HdGround.Mud]: art.mud, [HdGround.Grass]: art.grass, [HdGround.Moss]: art.moss, [HdGround.Canopy]: art.canopy,
  };
  const strips = [art.shore, art.grassMud, art.canopyEdge];
  const key = (name: string) => `swamp-hd-${name}`;
  const addImage = (name: string, img: HTMLImageElement) => { if (!scene.textures.exists(key(name))) scene.textures.addImage(key(name), img); };
  for (const [g, img] of Object.entries(textures)) addImage(`t${g}`, img);
  strips.forEach((img, i) => addImage(`s${i}`, img));

  // Faixa de cima: o tile tem o terreno de cima e o de baixo é o outro terreno da faixa.
  const stripTop = (x: number, y: number): number => {
    if (hole(x, y + 1)) return -1;
    const a = t(x, y), b = t(x, y + 1);
    if (a === HdGround.Canopy && b !== HdGround.Canopy && b >= 0) return Strip.Canopy;
    if ((a === HdGround.Grass || a === HdGround.Moss || a === HdGround.Mud) && b === HdGround.Water) return Strip.Shore;
    if ((a === HdGround.Grass || a === HdGround.Moss) && b === HdGround.Mud) return Strip.GrassMud;
    return -1;
  };
  // Base de cada tile: textura, linha de cima de uma faixa (0..2) ou de baixo (3..5). De cima para baixo: quem fica
  // embaixo de uma linha de cima vira a linha de baixo da mesma faixa.
  const base = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (t(x, y) < 0 || hole(x, y)) continue;
      const above = y > 0 ? base[(y - 1) * W + x] : -1;
      if (above >= 0 && above < 3) base[y * W + x] = above + 3;
      else base[y * W + x] = stripTop(x, y) >= 0 ? stripTop(x, y) : -1;
    }

  const map = scene.make.tilemap({ width: W, height: H, tileWidth: HD, tileHeight: HD });
  let gid = 0;
  const tileset = (name: string, count: number) => {
    const set = map.addTilesetImage(key(name), key(name), HD, HD, 0, 0, gid)!;
    const first = gid;
    gid += count;
    return { set, first };
  };
  const texSets: Record<number, ReturnType<typeof tileset>> = {};
  for (const g of Object.keys(textures)) texSets[+g] = tileset(`t${g}`, 9);
  const stripSets = strips.map((_, i) => tileset(`s${i}`, 12));

  // Beiras: cada combinação usada (terreno vizinho, quadro da textura, forma) vira um quadro.
  type Overlay = { layer: number; x: number; y: number; combo: number };
  const overlays: Overlay[] = [];
  const frameAt = (x: number, y: number) => (x % 3) + 3 * (y % 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const g = t(x, y);
      if (g < 0 || (hole(x, y) && g !== HdGround.Stone)) continue; // a passarela não recebe beira
      const b = base[y * W + x];
      const higher = (n: number) => n > g;
      DIRS.forEach(([dx, dy], side) => {
        if ((side === 0 && b >= 3) || (side === 2 && b >= 0 && b < 3)) return; // a faixa já cuida desse lado
        const n = t(x + dx, y + dy);
        if (higher(n)) overlays.push({ layer: side, x, y, combo: (n * 9 + frameAt(x, y)) * 8 + side });
      });
      for (let c = 0; c < 4; c++) {
        const [dx, dy] = CORNERS[c];
        const n = t(x + dx, y + dy);
        if (higher(n) && !higher(t(x + dx, y)) && !higher(t(x, y + dy))) {
          overlays.push({ layer: 4, x, y, combo: (n * 9 + frameAt(x, y)) * 8 + 4 + c });
          break;
        }
      }
    }
  const combos = [...new Set(overlays.map((o) => o.combo))];
  const index = new Map(combos.map((c, i) => [c, i]));
  const masks = new Map<number, HTMLCanvasElement>();
  const perSheet = COLS * ROWS;
  const sheetSets: ReturnType<typeof tileset>[] = [];
  for (let s = 0; s * perSheet < combos.length; s++) {
    const part = combos.slice(s * perSheet, (s + 1) * perSheet);
    const { canvas, ctx } = makeCanvas(HD * COLS, HD * Math.ceil(part.length / COLS));
    part.forEach((combo, i) => {
      const shape = combo % 8, frame = Math.floor(combo / 8) % 9, n = Math.floor(combo / 72);
      const mk = combo % 72;
      if (!masks.has(mk)) masks.set(mk, edgeMask(shape, frame));
      const tile = makeCanvas(HD, HD);
      tile.ctx.drawImage(textures[n], (frame % 3) * HD, Math.floor(frame / 3) * HD, HD, HD, 0, 0, HD, HD);
      tile.ctx.globalCompositeOperation = "destination-in";
      tile.ctx.drawImage(masks.get(mk)!, 0, 0);
      ctx.drawImage(tile.canvas, (i % COLS) * HD, Math.floor(i / COLS) * HD);
    });
    const name = `edges-${s}`;
    if (scene.textures.exists(key(name))) scene.textures.remove(key(name));
    scene.textures.addCanvas(key(name), canvas);
    sheetSets.push(tileset(name, Math.ceil(part.length / COLS) * COLS));
  }

  const sets = [...Object.values(texSets), ...stripSets, ...sheetSets].map((s) => s.set);
  const layer = (name: string) => map.createBlankLayer(name, sets)!.setScale(TILE_SIZE / HD).setDepth(floorDepth - 0.01);
  const ground = layer("chao-hd");
  const edgeLayers = ["n", "l", "s", "o", "quina"].map((n) => layer(`beira-hd-${n}`));

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const g = t(x, y);
      if (g < 0 || hole(x, y)) continue;
      const b = base[y * W + x];
      if (b >= 0) ground.putTileAt(stripSets[b % 3].first + (x % 6) + (b >= 3 ? 6 : 0), x, y);
      else ground.putTileAt(texSets[g].first + frameAt(x, y), x, y);
    }
  for (const o of overlays) {
    const i = index.get(o.combo)!;
    edgeLayers[o.layer].putTileAt(sheetSets[Math.floor(i / perSheet)].first + (i % perSheet), o.x, o.y);
  }
}
