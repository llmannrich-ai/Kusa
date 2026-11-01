import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, tileDistance, type Dungeon, type Rect } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { TileAtlas, toCanvas } from "./art/duneArt.ts";
import {
  HD, OPEN, bushTile, cryptFloorTile, flatDecor, quarter, shadeEdge,
  type FlatDecor,
} from "./art/empireArt.ts";
import {
  ARCH, BLOCK, CITY_HEIGHTS, COLUMN, CYPRESS, FLAME, PINE, TOWER, WALL_LINK, WALL_SPRITE, archSprite, columnSprite,
  cypressSprite, flameFrame, pineCrown, pineTrunk, rubbleSprite, towerSprite, wallSprite, type ColumnKind,
} from "./art/empireMonuments.ts";
import {
  DROP, HANG, KEEP_RISE, ROOM_WALL, STAKE, THRONE, bridgeTile,
  cliffTile, dirtTile, grassMask, sideCliffTile, hangingBanner, keepFaceTile, ledgeEdge, parapetTile, roofHoleTile, roofRow, roofTile, ropeBridgeTile,
  stakeSprite, terraceTile, throneSprite,
} from "./art/fortressArt.ts";
import { canopyTile, waterTile } from "./art/forestArt.ts";
import { ACAMPAMENTO, CHAO_BASALTO, CHAO_CAPIM, type AcampamentoFrame, type GroundTexture } from "./art/proto/fortalezaArt.ts";
import { GLOW, MIST, SpriteSheet, createGlowArt, single } from "./gatesMap.ts";
import { ChunkCuller, focusTile, patchTint, type MapAmbience } from "./mapShared.ts";

/** Fundo além das bordas: o vale na sombra, lá embaixo. */
export const FORTRESS_VOID = 0x222b33;

const ZOOM = HD / TILE_SIZE;
const ATLAS = "fortress-atlas";
/** Atlas do que fica longe da entrada (o vale, o terraço da torre de menagem, os telhados): montado depois. */
const FAR_ATLAS = "fortress-atlas-longe";
/** Resolução da máscara da borda do capim em relação à tela. */
const MASK_SCALE = 0.5;
const FLAME_KEY = "fortress-flame";
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
/**
 * O vale anda mais devagar que o castelo quando a câmera anda (está mais longe): a camada de baixo é deslocada à mão a
 * cada quadro, e não por `scrollFactor`, que desligaria o recorte dos tiles fora da tela.
 */
const PARALLAX = 0.9;

/** O que some quando o herói entra embaixo (o andar de cima): os objetos e a área do chão coberta por eles. */
interface Upper { objs: (Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.GameObject)[]; area: Rect; alpha: number; hidden: number }

/**
 * Desenha a Fortaleza Orc (`generateFortress`) em três andares, como o Tibia desenha os seus (cada andar é uma camada,
 * desenhada do mais fundo para o mais alto, deslocada pela altura; o de cima some quando o herói entra embaixo dele),
 * na projeção do Kusa (de frente, com a altura subindo na tela):
 *
 * 1. **O vale, um andar abaixo** (`DROP` tiles): capim, rios e mata escurecidos e com névoa, numa camada só, deslocada
 *    para o sul e com paralaxe. Aparece pelo abismo (a `Tile.Water` deste mapa), onde o chão do castelo não tem tile.
 * 2. **O castelo**, o andar de jogo: o chão (capim, a estrada de basalto, a terra batida dos acampamentos, as lajes do
 *    pátio e do salão, as pontes), a beirada do abismo e o paredão de rocha que desce até o vale; de pé, ordenados pela
 *    linha de baixo como nos Portões: muralhas, torres e os arcos dos portões, muros, colunas, tendas, paliçadas,
 *    totens, o trono, árvores e enfeites.
 * 3. **Os andares de cima**: o terraço da torre de menagem (lajes, parapeito com ameias, o buraco do telhado caído, a
 *    fogueira e o estandarte dos orcs) com a fachada sul, e os telhados das casernas. Cada um fica deslocado para o norte
 *    pela altura do que está embaixo e some quando o herói entra.
 *
 * Tudo vem de `hash(x, y)`: todos veem o mesmo.
 */
export function drawFortress(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const f = d.fortress!;
  const W = d.width;
  const H = d.height;
  const at = (x: number, y: number) => tileAt(d, x, y);
  const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const inR = (r: Rect, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  const abyss = (x: number, y: number) => inGrid(x, y) && at(x, y) === Tile.Water;
  const solid = (x: number, y: number) => inGrid(x, y) && at(x, y) !== Tile.Water;
  const wall = (x: number, y: number) => inGrid(x, y) && at(x, y) === Tile.Wall;
  const ruin = (x: number, y: number) => inGrid(x, y) && at(x, y) === Tile.Ruin;
  const lone = (x: number, y: number, test: (x: number, y: number) => boolean) => test(x, y) && DIRS.every(([dx, dy]) => !test(x + dx, y + dy));
  const tree = (x: number, y: number) => x > 0 && y > 0 && lone(x, y, wall);
  const bush = (x: number, y: number) => wall(x, y) && !tree(x, y);
  const bridge = (x: number, y: number) => f.bridges.some((r) => inR(r, x, y));
  const rope = (x: number, y: number) => (d.planks ?? []).some((r) => inR(r, x, y));
  const inKeep = (x: number, y: number) => inR(f.keep, x, y);
  const inTower = (x: number, y: number) => f.towers.some((t) => inR(t, x, y));
  const inTent = (x: number, y: number) => f.tents.some((t) => inR(t, x, y));
  const palisade = (x: number, y: number) => ruin(x, y) && f.palisades.some((r) => inR(r, x, y));
  const totems = new Set(f.totems.map((t) => t.y * W + t.x));
  const columns = new Set(f.columns.map((c) => c.y * W + c.x));
  const fires = new Set(f.fires.map((c) => c.y * W + c.x));
  const throne = (x: number, y: number) => x === f.throne.x && y === f.throne.y;
  const curtain = (y: number) => f.walls.some((w) => y === w.y || y === w.y + 1);
  const rampart = (x: number, y: number) => f.ramparts.some((r) => inR(r, x, y));
  /** Muro alto, com ameias: as muralhas, as dos lados e a da beira do precipício. */
  const battlement = (x: number, y: number) => curtain(y) || rampart(x, y);
  const roomInside = (x: number, y: number) => d.side.some((r) => x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1);
  const special = (x: number, y: number) => inTower(x, y) || inTent(x, y) || totems.has(y * W + x) || throne(x, y) || palisade(x, y);
  /** Ruína desenhada como muro (o resto: colunas, blocos, totens e as peças grandes). */
  const masonry = (x: number, y: number) => ruin(x, y) && !special(x, y) && !lone(x, y, ruin);
  const camp = (x: number, y: number) => f.camps.some((r) => inR(r, x, y));
  const road = (x: number, y: number) => f.roads.some((r) => inR(r, x, y));
  const plaza = (x: number, y: number) => f.plazas.some((r) => inR(r, x, y));
  const hall = (x: number, y: number) => inR(d.boss, x, y);
  /** O calçamento antigo dos pátios, quebrado: o capim tomou as falhas (manchas de um ruído suave). */
  const yard = (x: number, y: number) => {
    const k = f.yards.findIndex((r) => inR(r, x, y));
    if (k < 0 || camp(x, y) || plaza(x, y)) return false;
    return field(x, y, 4, 301) + (hash(x, y, 302) - 0.5) * 0.12 > (k === f.yards.length - 1 ? 0.56 : 0.46);
  };
  const paved = (x: number, y: number) => road(x, y) || plaza(x, y) || bridge(x, y) || yard(x, y);
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
  const reserved = (x: number, y: number) =>
    tileDistance(x, y, d.portal.x, d.portal.y) <= 1 || d.side.some((r) => x === r.x + 1 && y === r.y + 1)
    || tileDistance(x, y, d.bossPortal.x, d.bossPortal.y) <= 1 || fires.has(y * W + x);

  // --- Andar de baixo: o vale --------------------------------------------------------------------
  const atlas = new TileAtlas();
  // O que não aparece nos primeiros segundos da hunt vai noutro atlas, pintado logo depois de o mapa aparecer (como a
  // fachada e o mosaico dos Portões): o vale (a entrada fica longe do desfiladeiro), o terraço e os telhados.
  const far = new TileAtlas();
  // O capim é a textura do ChatGPT, cortada em tiles: o tile (x, y) usa o pedaço (x mod 8, y mod 8).
  const groundFrame = (name: string, tex: GroundTexture, x: number, y: number, into = atlas) => {
    const p = tex.period, tx = ((x % p) + p) % p, ty = ((y % p) + p) % p;
    return into.frame(`${name}${tx}-${ty}`, () => tex.tile(tx, ty));
  };
  const grassFrame = (x: number, y: number, into = atlas) => groundFrame("capim", CHAO_CAPIM, x, y, into);

  /** O vale: capim, rios serpenteando (as curvas de nível de um ruído suave) e manchas de mata. */
  const valleyWater = (x: number, y: number) => Math.abs(field(x, y, 8, 201) - 0.5) < 0.05 || field(x, y, 13, 203) < 0.07;
  const valleyWood = (x: number, y: number) => !valleyWater(x, y) && field(x, y, 6, 202) > 0.56;
  const lower = new Int32Array(W * H).fill(-1);
  const lowerDecor = new Int32Array(W * H).fill(-1);
  // Só o pedaço do vale que pode aparecer pelo abismo (com a paralaxe, ele anda um décimo do que a câmera anda): o
  // resto ficaria desenhado embaixo do chão do castelo à toa. A câmera fica a até ~10 tiles do abismo que aparece.
  const needed = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!abyss(x, y)) continue;
      const ox0 = Math.floor((1 - PARALLAX) * (x - 14)) - 1, ox1 = Math.ceil((1 - PARALLAX) * (x + 14)) + 1;
      const oy0 = Math.floor((1 - PARALLAX) * (y - 20)) - 1, oy1 = Math.ceil((1 - PARALLAX) * (y + 20)) + 1;
      for (let ly = y - DROP - oy1; ly <= y - DROP - oy0; ly++)
        for (let lx = x - ox1; lx <= x - ox0; lx++) if (inGrid(lx, ly)) needed[ly * W + lx] = 1;
    }
  // O vale é escuro e coberto de névoa: as bordas só pelos 4 lados (sem os cantos) e uma variação só bastam.
  const side4 = (x: number, y: number, test: (x: number, y: number) => boolean) => mask(x, y, test) & (OPEN.n | OPEN.e | OPEN.s | OPEN.w);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!needed[i]) continue;
      if (valleyWater(x, y)) {
        const land = side4(x, y, (a, b) => !valleyWater(a, b));
        lower[i] = far.frame(`river${land}`, () => waterTile("oldwood", land, 0).render(false));
      } else if (valleyWood(x, y)) {
        const open = side4(x, y, (a, b) => !valleyWood(a, b));
        lower[i] = far.frame(`wood${open}`, () => canopyTile("oldwood", open, 0).render(false));
      } else {
        lower[i] = grassFrame(x + 3, y + 5, far);
        if (hash(x, y, 90) < 0.05) {
          const kind: FlatDecor = hash(x, y, 91) < 0.5 ? "stones" : hash(x, y, 92) < 0.5 ? "shards" : "weeds";
          lowerDecor[i] = far.frame(`flat-${kind}-0`, () => flatDecor(kind, 0).render(true));
        }
      }
    }

  // --- Andar do castelo: chão, beiradas, paredão e enfeites rasteiros ------------------------------
  const ground = new Int32Array(W * H).fill(-1);
  const fringe = new Int32Array(W * H).fill(-1);
  /** Onde o capim do ChatGPT cobre a beira do calçamento (a máscara da camada de capim de cima): o índice do formato. */
  const grassEdge = new Int32Array(W * H).fill(-1);
  /** Os formatos de borda usados (bits de `OPEN`), na ordem do atlas da máscara. */
  const maskFrames: number[] = [];
  const shade = new Int32Array(W * H).fill(-1);
  const decor = new Int32Array(W * H).fill(-1);
  const voidShade = new Int32Array(W * H).fill(-1);
  const high = (x: number, y: number) => bush(x, y) || inTower(x, y) || inTent(x, y) || masonry(x, y);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const t = at(x, y);
      if (t === Tile.Water) {
        // O paredão: as 2 linhas de abismo logo ao sul do chão. Abaixo dele, o vale (nada aqui).
        if (solid(x, y - 1)) ground[i] = atlas.frame(`cliff0-${x % 3}`, () => cliffTile(0, x % 3));
        else if (abyss(x, y - 1) && solid(x, y - 2)) ground[i] = atlas.frame(`cliff1-${x % 3}`, () => cliffTile(1, x % 3));
        else if (solid(x - 1, y) !== solid(x + 1, y)) {
          // Beirada de leste ou oeste: a faixa de rocha descendo (as pontes não têm paredão).
          const side = solid(x - 1, y) ? -1 : 1;
          if (!bridge(x - side, y) && !rope(x - side, y)) {
            const v = y % 3;
            ground[i] = atlas.frame(`side${side}-${v}`, () => sideCliffTile(side, v));
          }
        }
        // Sombra do castelo no vale, junto das beiradas de leste e oeste e logo abaixo do paredão.
        let s = 0;
        if (solid(x - 1, y)) s |= OPEN.w;
        if (solid(x + 1, y)) s |= OPEN.e;
        if (abyss(x, y - 1) && abyss(x, y - 2) && solid(x, y - 3)) s |= OPEN.n;
        if (s) voidShade[i] = atlas.frame(`void${s}`, () => valleyShade(s));
        continue;
      }
      if (t === Tile.Wall && bush(x, y)) {
        const open = mask(x, y, (a, b) => !bush(a, b) && inGrid(a, b));
        const v = hash(x, y, 2) < 0.6 ? 0 : 1;
        ground[i] = atlas.frame(`bush${open}-${v}`, () => bushTile(open, v).render(false));
      } else if (bridge(x, y)) {
        const r = f.bridges.find((b) => inR(b, x, y))!;
        const side = x === r.x ? -1 : x === r.x + r.w - 1 ? 1 : 0;
        const q = quarter(x, y);
        ground[i] = atlas.frame(`bridge${side}-${q}`, () => bridgeTile(side, q).render(false));
      } else if (rope(x, y)) {
        const r = d.planks!.find((b) => inR(b, x, y))!;
        const side = x === r.x ? -1 : 1;
        const v = Math.floor(hash(x, y, 7) * 3);
        ground[i] = atlas.frame(`rope${side}-${v}`, () => ropeBridgeTile(side, v).render(false));
        continue;
      } else if (hall(x, y) || inKeep(x, y)) {
        const q = quarter(x, y);
        ground[i] = atlas.frame(`hall${q}`, () => cryptFloorTile(q, 1).render(false));
      } else if (roomInside(x, y)) {
        const q = quarter(x, y);
        ground[i] = atlas.frame(`room${q}`, () => cryptFloorTile(q, 0).render(false));
      } else if (plaza(x, y)) {
        const q = quarter(x, y);
        const v = Math.floor(hash(x, y, 9) * 4);
        ground[i] = atlas.frame(`yard${q}-${v}`, () => terraceTile(q, v).render(false));
      } else if (road(x, y)) {
        ground[i] = groundFrame("basalto", CHAO_BASALTO, x, y);
      } else if (yard(x, y)) {
        ground[i] = groundFrame("basalto", CHAO_BASALTO, x, y);
      } else if (camp(x, y)) {
        const v = pick(x, y, 4, 8);
        ground[i] = atlas.frame(`dirt${v}`, () => dirtTile(v).render(false));
      } else ground[i] = grassFrame(x, y);

      // Beirada do abismo (menos nas pontes, que seguem por cima dele).
      const edge = bridge(x, y) ? 0 : mask(x, y, abyss);
      if (edge) fringe[i] = atlas.frame(`ledge${edge}`, () => ledgeEdge(edge));
      else if ((road(x, y) || plaza(x, y) || yard(x, y)) && !hall(x, y)) {
        const g = mask(x, y, (a, b) => solid(a, b) && !paved(a, b) && !camp(a, b) && !inKeep(a, b) && !inTower(a, b) && !(battlement(a, b) && ruin(a, b)) && !roomInside(a, b));
        if (g) {
          let k = maskFrames.indexOf(g);
          if (k < 0) k = maskFrames.push(g) - 1;
          grassEdge[i] = k;
        }
      }
      const s = mask(x, y, high) & (OPEN.n | OPEN.w | OPEN.nw);
      if (s && !high(x, y)) shade[i] = atlas.frame(`shade${s}`, () => shadeEdge(s, 40));

      if (fires.has(i)) continue;
      if (reserved(x, y) || t !== Tile.Floor || bridge(x, y)) continue;
      const byRuin = near(x, y, 1, ruin);
      const n = hash(x, y, 4);
      const chance = camp(x, y) ? 0.1 : paved(x, y) || hall(x, y) ? (byRuin ? 0.08 : 0.03) : byRuin ? 0.12 : 0.03;
      if (n >= chance) continue;
      const kind = flatKind(hash(x, y, 5), { camp: camp(x, y), paved: paved(x, y) || hall(x, y) || roomInside(x, y), ruins: byRuin });
      const v = Math.floor(hash(x, y, 6) * 3);
      decor[i] = atlas.frame(`flat-${kind}-${v}`, () => flatDecor(kind, v).render(kind !== "puddle" && kind !== "dust"));
    }

  // O andar de cima da torre de menagem: o terraço (com o parapeito e o buraco do telhado) e a fachada sul.
  const K = f.keep;
  const KW = K.w, KH = K.h + KEEP_RISE;
  const roof = new Int32Array(KW * KH).fill(-1);
  const parapet = new Int32Array(KW * KH).fill(-1);
  const holeAt = { x: Math.floor(KW * (hash(K.x, K.y, 70) < 0.5 ? 0.28 : 0.62)), y: 3 + Math.floor(hash(K.x, K.y, 71) * 4) };
  const hole = (x: number, y: number) => Math.hypot(x - holeAt.x - 1, (y - holeAt.y - 1) * 1.2) < 1.9 + hash(x, y, 72) * 0.9;
  const terrace = (x: number, y: number) => x >= 0 && y >= 0 && x < KW && y < K.h;
  for (let y = 0; y < KH; y++)
    for (let x = 0; x < KW; x++) {
      const i = y * KW + x;
      if (y >= K.h) {
        // Fachada: as 2 linhas de baixo (os 2 andares vistos de frente), com a porta em cima da do salão.
        const row = (y - K.h) as 0 | 1;
        const gx = K.x + x;
        const doorPart = gx >= f.door.x && gx < f.door.x + f.door.w ? ((gx - f.door.x - 1) as -1 | 0 | 1) : null;
        const kind: 0 | 1 | 2 = doorPart !== null ? 2 : x % 4 === 2 && x > 1 && x < KW - 2 ? 1 : 0;
        const end: -1 | 0 | 1 = x === 0 ? -1 : x === KW - 1 ? 1 : 0;
        const v = Math.floor(hash(gx, row, 73) * 3);
        roof[i] = far.frame(`face${row}-${kind}-${doorPart ?? 0}-${end}-${v}`, () => keepFaceTile(row, kind, doorPart ?? 0, end, v));
        continue;
      }
      if (hole(x, y) && x > 1 && y > 1 && x < KW - 2 && y < K.h - 2) {
        const rim = mask(x, y, (a, b) => terrace(a, b) && !(hole(a, b) && a > 1 && b > 1 && a < KW - 2 && b < K.h - 2));
        const v = Math.floor(hash(x, y, 74) * 2);
        roof[i] = far.frame(`hole${rim}-${v}`, () => roofHoleTile(rim, v).render(false));
      } else {
        const q = quarter(x, y);
        roof[i] = far.frame(`terrace${q}`, () => terraceTile(q).render(false));
      }
      let out = 0;
      if (y === 0) out |= OPEN.n;
      if (y === K.h - 1) out |= OPEN.s;
      if (x === 0) out |= OPEN.w;
      if (x === KW - 1) out |= OPEN.e;
      if (out) {
        const v = Math.floor(hash(x, y, 75) * 2);
        parapet[i] = far.frame(`parapet${out}-${v}`, () => parapetTile(out, v));
      }
    }

  // Os tiles dos telhados das casernas (entram no atlas antes de ele ser montado).
  const roofFrames = new Int32Array(W * H).fill(-1);
  for (const r of d.side) {
    const holeX = 1 + Math.floor(hash(r.x, r.y, 76) * (r.w - 2)), skullX = 1 + Math.floor(hash(r.x, r.y, 77) * (r.w - 2));
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const row = roofRow(y, r.h);
        const col: -1 | 0 | 1 = x === 0 ? -1 : x === r.w - 1 ? 1 : 0;
        const v = row === "south" && x === holeX && y === r.h - 2 ? 2 : row === "ridge" && x === skullX ? 3 : hash(r.x + x, r.y + y, 78) < 0.2 && row !== "ridge" ? 1 : 0;
        roofFrames[(r.y + y) * W + r.x + x] = far.frame(`roof-${row}${col}-${v}`, () => roofTile(row, col, v).render(false));
      }
  }
  if (scene.textures.exists(ATLAS)) scene.textures.remove(ATLAS);
  scene.textures.addCanvas(ATLAS, atlas.build());
  const map = scene.make.tilemap({ width: W, height: H, tileWidth: HD, tileHeight: HD });
  const set = map.addTilesetImage(ATLAS, ATLAS, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)!;
  const layer = (name: string, data: Int32Array, depth: number, tint?: (x: number, y: number) => number) => {
    const l = map.createBlankLayer(name, set)!.setDepth(depth).setScale(1 / ZOOM);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const fr = data[y * W + x];
        if (fr < 0) continue;
        const tile = l.putTileAt(fr, x, y);
        if (tint) tile.tint = tint(x, y);
      }
    return l;
  };
  const valley: Phaser.Tilemaps.TilemapLayer[] = [];
  // Névoa do vale: uma faixa por trecho de linhas com abismo (e não o mapa todo, que pesaria no celular).
  for (let y = 0; y < H; ) {
    if (![...Array(W).keys()].some((x) => abyss(x, y))) { y++; continue; }
    let y1 = y;
    while (y1 + 1 < H && [...Array(W).keys()].some((x) => abyss(x, y1 + 1))) y1++;
    const top = y === 0 ? -H : y;
    scene.add.rectangle(-W * TILE_SIZE, top * TILE_SIZE, W * TILE_SIZE * 3, (y1 + 1 - top) * TILE_SIZE, 0x7f96ad, 0.34).setOrigin(0).setDepth(floorDepth - 2);
    y = y1 + 1;
  }
  layer("sombra-vale", voidShade, floorDepth - 1);
  // As texturas do ChatGPT (capim, basalto) já variam sozinhas: vão sem as manchas de luz, para a camada de capim da
  // borda casar pixel a pixel com o capim de baixo.
  const plainTexture = (x: number, y: number) => abyss(x, y) || road(x, y) || yard(x, y) || (!paved(x, y) && !camp(x, y) && !hall(x, y) && !inKeep(x, y) && !roomInside(x, y) && !bush(x, y));
  layer("chao", ground, floorDepth, (x, y) => (plainTexture(x, y) ? 0xffffff : patchTint(x, y, 0.84, [0.9, 0.92, 0.7], 7, 67)));
  // Por cima do chão vem a camada de capim das bordas (`floorDepth + 0.001`), e por cima dela as beiradas, sombras e
  // enfeites (que ela não pode esconder).
  layer("beiradas", fringe, floorDepth + 0.002, (x, y) => patchTint(x, y, 0.84, [0.9, 0.92, 0.7], 7, 67));
  layer("sombra", shade, floorDepth + 0.002);
  layer("enfeites", decor, floorDepth + 0.002);
  // A borda do capim: a textura do capim repetida no mundo inteiro (alinhada com os tiles de capim: 8 tiles por volta),
  // vista só pela máscara das bordas. O capim de verdade cobre a beira da pedra, sem degrau de tile.
  const GRASS_KEY = "fortress-capim";
  if (!scene.textures.exists(GRASS_KEY)) scene.textures.addImage(GRASS_KEY, CHAO_CAPIM.image);
  // A máscara fica embaixo de tudo (só existe nos tiles de calçamento, que são opacos): na tela não aparece; o filtro a
  // desenha à parte.
  // A máscara é uma camada desenhada de uma vez na placa de vídeo (`TilemapGPULayer`): em meia resolução, uma camada
  // de tiles comum deixava frestas de 1 px entre os tiles.
  // Os tiles de capim em volta da borda levam a máscara cheia (o formato 0xff): a fresta de 1 px que a meia resolução
  // pode deixar entre dois tiles mostra o capim de baixo, igual, e não a pedra.
  const FULL = 0xff;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (grassEdge[i] >= 0 || at(x, y) !== Tile.Floor || paved(x, y) || camp(x, y) || !near(x, y, 1, (a, b) => inGrid(a, b) && grassEdge[b * W + a] >= 0 && maskFrames[grassEdge[b * W + a]] !== FULL)) continue;
      let k = maskFrames.indexOf(FULL);
      if (k < 0) k = maskFrames.push(FULL) - 1;
      grassEdge[i] = k;
    }
  // O quadro 0 é vazio (a camada da placa de vídeo desenha a célula sem tile como o quadro 0).
  const maskData = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => grassEdge[y * W + x] + 1));
  const MASK_ATLAS = "fortress-mascara";
  if (scene.textures.exists(MASK_ATLAS)) scene.textures.remove(MASK_ATLAS);
  // O atlas da máscara vai sem margem entre os quadros (a camada da placa de vídeo não aceita margem).
  // Os formatos ficam em 64 px por tile: a máscara é desenhada em meia resolução, então é o mesmo na tela, com um quarto
  // da memória do atlas.
  const MT = HD / 2;
  const maskCols = 16, maskRows = Math.max(1, Math.ceil((maskFrames.length + 1) / maskCols));
  const maskCanvas = makeCanvas(maskCols * MT, maskRows * MT);
  maskCanvas.ctx.imageSmoothingEnabled = false;
  maskFrames.forEach((g, i) => {
    const k = i + 1;
    if (g === FULL) { maskCanvas.ctx.fillStyle = "#fff"; maskCanvas.ctx.fillRect((k % maskCols) * MT, Math.floor(k / maskCols) * MT, MT, MT); }
    else maskCanvas.ctx.drawImage(toCanvas(grassMask(g), HD, HD), (k % maskCols) * MT, Math.floor(k / maskCols) * MT, MT, MT);
  });
  scene.textures.addCanvas(MASK_ATLAS, maskCanvas.canvas);
  const maskMap = scene.make.tilemap({ data: maskData, tileWidth: MT, tileHeight: MT });
  const maskSet = maskMap.addTilesetImage(MASK_ATLAS, MASK_ATLAS, MT, MT, 0, 0, 0)!;
  const edgeMask = maskMap.createLayer(0, maskSet, 0, 0, true)!.setScale(TILE_SIZE / MT).setDepth(floorDepth - 10);
  const grassOver = scene.add.tileSprite(0, 0, W * TILE_SIZE, H * TILE_SIZE, GRASS_KEY).setOrigin(0).setTileScale(1 / ZOOM).setDepth(floorDepth + 0.001);
  // A máscara é desenhada em meia resolução (um quarto da memória: no iPhone, a tela inteira em 3x pesava ~19 MB), vista
  // por uma câmera invisível de meio tamanho que acompanha a principal a cada quadro.
  const maskCam = scene.cameras.add(0, 0, 1, 1, false, "mascara-capim").setVisible(false);
  grassOver.enableFilters();
  grassOver.filters!.external.addMask(edgeMask, false, maskCam, "world", MASK_SCALE);

  // --- De pé -------------------------------------------------------------------------------------
  const culler = new ChunkCuller();
  const walls = new SpriteSheet("fortress-walls", WALL_SPRITE.w, WALL_SPRITE.h);
  const cols = new SpriteSheet("fortress-columns", COLUMN.w, COLUMN.h);
  const blocks = new SpriteSheet("fortress-blocks", BLOCK.w, BLOCK.h);
  const cypress = new SpriteSheet("fortress-cypress", CYPRESS.w, CYPRESS.h);
  const pines = new SpriteSheet("fortress-pines", PINE.w, PINE.h);
  const stakes = new SpriteSheet("fortress-stakes", STAKE.w, STAKE.h);
  type Placed = { sheet: SpriteSheet; frame: number; x: number; y: number; px: number; py: number; depth: number; flip?: boolean; crown?: boolean };
  const placed: Placed[] = [];
  const put = (sheet: SpriteSheet, frame: number, x: number, y: number, flip = false, px = x * TILE_SIZE + TILE_SIZE / 2, py = (y + 1) * TILE_SIZE) =>
    placed.push({ sheet, frame, x, y, px, py, depth: (y + 1) * TILE_SIZE - 0.25, flip });
  const height = (x: number, y: number) => {
    if (battlement(x, y) || inKeep(x, y)) return CITY_HEIGHTS[0];
    // O resto (casernas, casas caídas, restos de muro) numa altura só: menos quadros de muro na memória.
    return ROOM_WALL;
  };
  const pineTops = Array.from({ length: 3 }, (_, v) => pineTrunk(v));
  const campSpots: { x: number; y: number }[] = [];
  // Os objetos do acampamento vêm da folha do ChatGPT (`ACAMPAMENTO`): cada um na largura do jogo, pelo pé.
  const CAMP_KEY = "fortress-acampamento";
  if (!scene.textures.exists(CAMP_KEY)) {
    const tex = scene.textures.addImage(CAMP_KEY, ACAMPAMENTO.image)!;
    for (const [name, r] of Object.entries(ACAMPAMENTO.frames)) tex.add(name, 0, r.x, r.y, r.w, r.h);
  }
  type CampPlaced = { frame: AcampamentoFrame; x: number; y: number; px: number; py: number; flip: boolean };
  const campPlaced: CampPlaced[] = [];
  const putCamp = (frame: AcampamentoFrame, x: number, y: number, flip = false, px = x * TILE_SIZE + TILE_SIZE / 2, py = (y + 1) * TILE_SIZE) =>
    campPlaced.push({ frame, x, y, px, py, flip });
  const CAMP_ITEMS: AcampamentoFrame[] = ["armas", "caldeirao", "lenha", "ossos", "barris"];

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const flip = hash(x, y, 42) < 0.5;
      if (tree(x, y)) {
        if (hash(x, y, 49) < 0.72) {
          const v = Math.floor(hash(x, y, 50) * 3);
          put(cypress, cypress.frame(`c${v}`, () => cypressSprite(v)), x, y, flip);
        } else {
          const v = Math.floor(hash(x, y, 51) * 3);
          put(pines, pines.frame(`t${v}`, () => pineTops[v].image), x, y, flip);
          put(pines, pines.frame(`k${v}`, () => pineCrown(v, pineTops[v].top)), x, y, flip);
          placed[placed.length - 1].depth += 0.1;
          placed[placed.length - 1].crown = true;
        }
        continue;
      }
      if (!ruin(x, y)) {
        if (at(x, y) !== Tile.Floor || reserved(x, y) || decor[y * W + x] >= 0 || road(x, y) || bridge(x, y) || rope(x, y)) continue;
        if (camp(x, y) && hash(x, y, 52) < 0.07) {
          putCamp(CAMP_ITEMS[Math.floor(hash(x, y, 53) * CAMP_ITEMS.length)], x, y, flip);
          campSpots.push({ x, y });
        }
        continue;
      }
      if (totems.has(y * W + x)) {
        putCamp("totem", x, y, flip);
        continue;
      }
      if (palisade(x, y)) {
        const across = f.palisades.find((r) => inR(r, x, y))!.h === 1;
        // A folha traz a paliçada de frente (a cerca de leste a oeste); a de norte a sul continua por código.
        if (across) putCamp("palicada", x, y, flip);
        else {
          const v = Math.floor(hash(x, y, 56) * 3);
          put(stakes, stakes.frame(`${across}${v}`, () => stakeSprite(across, v)), x, y, flip);
        }
        continue;
      }
      if (special(x, y)) continue;
      if (lone(x, y, ruin)) {
        const m = hash(x, y, 57);
        if (columns.has(y * W + x)) {
          // Colunatas do pátio e pilares do salão: inteiras quase todas.
          const kind: ColumnKind = hall(x, y) ? (m < 0.8 ? "corinthian" : "broken") : m < 0.65 ? "corinthian" : m < 0.9 ? "broken" : "stump";
          const v = Math.floor(hash(x, y, 58) * 3);
          put(cols, cols.frame(`${kind}${v}`, () => columnSprite(kind, v)), x, y);
        } else if (m < 0.3) {
          const kind: ColumnKind = m < 0.15 ? "stump" : "broken";
          const v = Math.floor(hash(x, y, 59) * 3);
          put(cols, cols.frame(`${kind}${v}`, () => columnSprite(kind, v)), x, y);
        } else {
          const v = Math.floor(hash(x, y, 60) * 4);
          put(blocks, blocks.frame(`b${v}`, () => rubbleSprite(v)), x, y, flip);
        }
        continue;
      }
      // Muro: liga nos vizinhos que também são muro desenhado assim.
      const L = WALL_LINK;
      let links = 0;
      if (masonry(x, y - 1)) links |= L.n;
      if (masonry(x + 1, y) || (battlement(x, y) && inTower(x + 1, y))) links |= L.e;
      if (masonry(x, y + 1) || (battlement(x, y) && inTower(x, y + 1))) links |= L.s;
      if (masonry(x - 1, y) || (battlement(x, y) && inTower(x - 1, y))) links |= L.w;
      const h = height(x, y);
      const step = links & L.s ? Math.max(0, h - height(x, y + 1)) : 0;
      const city = battlement(x, y);
      const vn = hash(Math.floor(x / 3), Math.floor(y / 3), 61);
      const v = vn < 0.5 ? 0 : 1;
      put(walls, walls.frame(`w${links}-${h}-${step}-${v}-${city}`, () => wallSprite(links, h, step, v, city)), x, y);
    }

  // Tendas (2×2), pela linha de baixo.
  for (const t of f.tents) {
    // A tenda do chefe é a da guarda, no pátio do esporão (acima da muralha interna).
    putCamp(t.y < f.walls[1].y ? "tendaChefe" : "tenda", t.x, t.y + 1, hash(t.x, t.y, 63) < 0.5, (t.x + 1) * TILE_SIZE, (t.y + 2) * TILE_SIZE);
  }
  // Estandartes de guerra ao lado das fogueiras.
  for (const fire of f.fires) {
    const x = fire.x + (hash(fire.x, fire.y, 64) < 0.5 ? -2 : 2), y = fire.y - 1;
    if (at(x, y) !== Tile.Floor || road(x, y) || campSpots.some((c) => c.x === x && c.y === y)) continue;
    putCamp("estandarte", x, y);
  }

  for (const sheet of [walls, cols, blocks, cypress, pines, stakes]) sheet.build(scene);
  const crowns: Phaser.GameObjects.Image[] = [];
  for (const c of campPlaced)
    culler.add(scene.add.image(c.px, c.py, CAMP_KEY, c.frame).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth((c.y + 1) * TILE_SIZE - 0.25).setFlipX(c.flip), c.x, c.y);
  for (const s of placed) {
    const img = culler.add(scene.add.image(s.px, s.py, s.sheet.key, s.frame).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth(s.depth).setFlipX(!!s.flip), s.x, s.y);
    if (s.crown) crowns.push(img);
  }
  const throneKey = single(scene, "fortress-throne", THRONE.w, THRONE.h, throneSprite);
  culler.add(scene.add.image((f.throne.x + 0.5) * TILE_SIZE, (f.throne.y + 1) * TILE_SIZE, throneKey).setOrigin(0.5, 1).setScale(1 / ZOOM)
    .setDepth((f.throne.y + 1) * TILE_SIZE - 0.25), f.throne.x, f.throne.y);

  // Torres e arcos dos portões (as peças dos Portões do Império), com os panos de guerra dos orcs pendurados.
  const big: { img: Phaser.GameObjects.Image; hide: Rect }[] = [];
  const hangKey = (v: number) => single(scene, `fortress-hang${v}`, HANG.w, HANG.h, () => hangingBanner(v));
  for (const [k, t] of f.towers.entries()) {
    const key = single(scene, "fortress-tower", TOWER.w, TOWER.h, () => towerSprite(-1));
    const depth = (t.y + t.h) * TILE_SIZE - 0.25;
    const img = scene.add.image((t.x + t.w / 2) * TILE_SIZE, (t.y + t.h) * TILE_SIZE, key).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth(depth).setFlipX(k % 2 === 1);
    const hide = { x: t.x - 1, y: t.y - 6, w: t.w + 2, h: 6 };
    big.push({ img: culler.add(img, t.x + 1, t.y + t.h - 1), hide });
    const hang = scene.add.image((t.x + (k % 2 ? 0.7 : t.w - 0.7)) * TILE_SIZE, (t.y + t.h) * TILE_SIZE - 300 / ZOOM, hangKey(k % 2)).setOrigin(0.5, 0)
      .setScale(1 / ZOOM).setDepth(depth + 0.01);
    big.push({ img: culler.add(hang, t.x + 1, t.y + t.h - 1), hide });
  }
  const archKey = single(scene, "fortress-arch", ARCH.w, ARCH.h, archSprite);
  for (const g of f.gates) {
    const arch = scene.add.image((g.x + g.w / 2) * TILE_SIZE, (g.y + 2) * TILE_SIZE, archKey).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth((g.y + 2) * TILE_SIZE + 0.75);
    big.push({ img: culler.add(arch, g.x + 2, g.y + 1), hide: { x: g.x - 1, y: g.y - 3, w: g.w + 2, h: 5 } });
  }

  // --- Andares de cima -----------------------------------------------------------------------------
  const uppers: Upper[] = [];
  // Torre de menagem: o terraço e a fachada numa camada só, deslocada `KEEP_RISE` tiles para o norte, por cima de
  // quem está atrás dela (a profundidade é a da linha de baixo, como um sprite).
  const keepDepth = (K.y + K.h) * TILE_SIZE - 0.2;
  const keepObjs: Upper["objs"] = [];
  // No terraço: a fogueira dos orcs, o estandarte e os panos de guerra na fachada.
  const top = (x: number, y: number) => ({ px: (K.x + x + 0.5) * TILE_SIZE, py: (K.y - KEEP_RISE + y + 1) * TILE_SIZE });
  const flag = top(KW - holeAt.x - 2, 2);
  keepObjs.push(scene.add.image(flag.px, flag.py, CAMP_KEY, "estandarte").setOrigin(0.5, 1).setScale(1.2 / ZOOM).setDepth(keepDepth + 0.02));
  for (const k of [0, 1]) {
    const x = Math.floor(KW * (k ? 0.75 : 0.25));
    keepObjs.push(scene.add.image((K.x + x + 0.5) * TILE_SIZE, (K.y + K.h - KEEP_RISE) * TILE_SIZE + 5, hangKey(k)).setOrigin(0.5, 0).setScale(0.75 / ZOOM)
      .setDepth(keepDepth + 0.02));
  }
  // Torreões nos 4 cantos do terraço (as torres dos portões), mais altos que tudo: a torre de menagem se vê de longe.
  const turretKey = single(scene, "fortress-tower", TOWER.w, TOWER.h, () => towerSprite(-1));
  for (const [k, [tx, ty]] of ([[1.5, 3], [KW - 1.5, 3], [1.5, K.h], [KW - 1.5, K.h]] as const).entries()) {
    const p = { px: (K.x + tx) * TILE_SIZE, py: (K.y - KEEP_RISE + ty) * TILE_SIZE };
    keepObjs.push(scene.add.image(p.px, p.py, turretKey).setOrigin(0.5, 1).setScale(0.8 / ZOOM).setFlipX(k % 2 === 1).setDepth(keepDepth + (ty > 3 ? 0.04 : 0.015)));
  }
  const keepUpper: Upper = { objs: keepObjs, area: K, alpha: 1, hidden: 0 };
  uppers.push(keepUpper);

  /** Monta o atlas de longe e as camadas dele: o vale, o terraço da torre de menagem e os telhados das casernas. */
  const buildFar = () => {
    if (scene.textures.exists(FAR_ATLAS)) scene.textures.remove(FAR_ATLAS);
    scene.textures.addCanvas(FAR_ATLAS, far.build());
    const farLayer = (w: number, h: number, data: Int32Array, x: number, y: number, depth: number, tint?: (x: number, y: number) => number) => {
      const m = scene.make.tilemap({ width: w, height: h, tileWidth: HD, tileHeight: HD });
      const ts = m.addTilesetImage(FAR_ATLAS, FAR_ATLAS, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)!;
      const l = m.createBlankLayer("camada", ts, x, y)!.setDepth(depth).setScale(1 / ZOOM);
      for (let ty = 0; ty < h; ty++)
        for (let tx = 0; tx < w; tx++) {
          const fr = data[ty * w + tx];
          if (fr < 0) continue;
          const tile = l.putTileAt(fr, tx, ty);
          if (tint) tile.tint = tint(tx, ty);
        }
      return l;
    };
    // O vale fica atrás de tudo, escurecido e azulado pela distância; a névoa e a sombra do castelo vêm por cima dele.
    const valleyTint = (x: number, y: number) => patchTint(x, y, 0.3, [0.55, 0.68, 0.92], 5, 97);
    valley.push(farLayer(W, H, lower, 0, 0, floorDepth - 3, valleyTint), farLayer(W, H, lowerDecor, 0, 0, floorDepth - 3, valleyTint));
    // Torre de menagem: o terraço e a fachada, deslocados `KEEP_RISE` tiles para o norte, por cima de quem está atrás
    // dela (a profundidade é a da linha de baixo, como um sprite).
    const kx = K.x * TILE_SIZE, ky = (K.y - KEEP_RISE) * TILE_SIZE;
    for (const l of [farLayer(KW, KH, roof, kx, ky, keepDepth), farLayer(KW, KH, parapet, kx, ky, keepDepth + 0.01)]) {
      l.setAlpha(keepUpper.alpha);
      keepObjs.push(l);
    }
    // Telhados das casernas: tiles do atlas (os mesmos para todas), cada telhado numa camada própria deslocada a
    // altura dos muros para o norte (em cima deles), que some quando o herói entra.
    for (const r of d.side) {
      const data = new Int32Array(r.w * r.h);
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) data[y * r.w + x] = roofFrames[(r.y + y) * W + r.x + x];
      const l = farLayer(r.w, r.h, data, r.x * TILE_SIZE, r.y * TILE_SIZE - ROOM_WALL / ZOOM, (r.y + r.h) * TILE_SIZE - 0.2);
      uppers.push({ objs: [l], area: r, alpha: 1, hidden: 0.08 });
    }
  };

  // --- Fogo e luz ----------------------------------------------------------------------------------
  if (!scene.textures.exists(FLAME_KEY)) {
    const { canvas, ctx } = makeCanvas(FLAME.w * 4, FLAME.h);
    for (let k = 0; k < 4; k++) ctx.drawImage(toCanvas(flameFrame(k), FLAME.w, FLAME.h), k * FLAME.w, 0);
    const tex = scene.textures.addCanvas(FLAME_KEY, canvas)!;
    for (let k = 0; k < 4; k++) tex.add(k, 0, k * FLAME.w, 0, FLAME.w, FLAME.h);
  }
  createGlowArt(scene);
  const flames: Phaser.GameObjects.Image[] = [];
  const glows: Phaser.GameObjects.Image[] = [];
  const fire = (px: number, py: number, depth: number, scale: number, tx: number, ty: number, glowScale = 1, cull = true) => {
    const fl = scene.add.image(px, py, FLAME_KEY, 0).setOrigin(0.5, 1).setScale(scale / ZOOM).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    fl.setData("phase", hash(tx, ty, 67) * 10);
    const gl = scene.add.image(px, py - 6 * scale, GLOW).setScale(glowScale).setAlpha(0.5).setTint(0xff9a40).setDepth(uiDepth - 6).setBlendMode(Phaser.BlendModes.ADD);
    gl.setData("phase", hash(tx, ty, 68) * 10).setData("alpha", 0.55);
    if (cull) { culler.add(fl, tx, ty); culler.add(gl, tx, ty); }
    flames.push(fl);
    glows.push(gl);
    return [fl, gl];
  };
  // Fogueiras do acampamento: a da folha (com as chamas desenhadas) e a luz tremendo em volta.
  for (const c of f.fires) {
    const px = (c.x + 0.5) * TILE_SIZE, py = (c.y + 1) * TILE_SIZE;
    culler.add(scene.add.image(px, py, CAMP_KEY, "fogueira").setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth(py - 0.3), c.x, c.y);
    const gl = scene.add.image(px, py - 10, GLOW).setScale(1.5).setAlpha(0.5).setTint(0xff9a40).setDepth(uiDepth - 6).setBlendMode(Phaser.BlendModes.ADD);
    gl.setData("phase", hash(c.x, c.y, 68) * 10).setData("alpha", 0.55);
    culler.add(gl, c.x, c.y);
    glows.push(gl);
  }
  // A fogueira do terraço some junto com o andar de cima.
  const roofFire = top(holeAt.x < KW / 2 ? KW - 5 : 4, K.h - 5);
  for (const o of fire(roofFire.px, roofFire.py - 6, keepDepth + 0.03, 1.6, K.x, K.y, 1.8, false)) keepObjs.push(o);

  return createAmbience(scene, d, uiDepth, culler, { crowns, flames, glows, big, uppers, valley, floorDepth, later: [buildFar], maskCam });
}

/** Ruído suave em grade de `cell` tiles (0 a 1), para o desenho do vale. */
function field(x: number, y: number, cell: number, seed: number) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const sx = smooth(x / cell - gx), sy = smooth(y / cell - gy);
  const top = hash(gx, gy, seed) + (hash(gx + 1, gy, seed) - hash(gx, gy, seed)) * sx;
  const bottom = hash(gx, gy + 1, seed) + (hash(gx + 1, gy + 1, seed) - hash(gx, gy + 1, seed)) * sx;
  return top + (bottom - top) * sy;
}
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Sombra do castelo no vale: escura junto das beiradas (bits de `OPEN`: os lados com chão), em faixas pontilhadas. */
function valleyShade(from: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(HD * HD * 4);
  const bayer = [0, 0.5, 0.75, 0.25];
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      let d = 1e9;
      if (from & OPEN.w) d = Math.min(d, x / 70);
      if (from & OPEN.e) d = Math.min(d, (HD - 1 - x) / 70);
      if (from & OPEN.n) d = Math.min(d, y / 90);
      if (d >= 1) continue;
      const v = (1 - d) * 3 + (bayer[(y & 1) * 2 + (x & 1)] - 0.5) * 0.7;
      const a = v > 2.2 ? 0.55 : v > 1.2 ? 0.36 : v > 0.4 ? 0.18 : 0;
      if (a) out.set([10, 14, 22, Math.round(a * 255)], (y * HD + x) * 4);
    }
  return out;
}

/** Enfeite rasteiro conforme o lugar: ossos e cinza nos acampamentos, cacos e tesselas perto das ruínas, poças no calçamento. */
function flatKind(m: number, at: { camp: boolean; paved: boolean; ruins: boolean }): FlatDecor {
  if (at.camp) return m < 0.3 ? "bones" : m < 0.45 ? "skull" : m < 0.65 ? "stones" : m < 0.8 ? "shards" : m < 0.92 ? "helmet" : "coins";
  if (at.paved) return m < 0.25 ? "puddle" : m < 0.5 ? "shards" : m < 0.65 ? "bones" : m < 0.8 ? "stones" : m < 0.92 ? "dust" : "skull";
  if (at.ruins) {
    const table: [number, FlatDecor][] = [[0.2, "shards"], [0.36, "tesserae"], [0.5, "drum"], [0.62, "inscription"], [0.74, "stones"], [0.84, "weeds"], [0.92, "bones"], [0.97, "helmet"], [1, "coins"]];
    return table.find(([limit]) => m < limit)![1];
  }
  return m < 0.45 ? "weeds" : m < 0.7 ? "stones" : m < 0.85 ? "leaves" : m < 0.95 ? "shards" : "bones";
}

/**
 * Ambiente: o vale andando mais devagar que o castelo (paralaxe), a névoa subindo do abismo, os andares de cima e os
 * telhados sumindo com o herói embaixo (como no Tibia), as torres e os arcos transparentes com o herói atrás, as copas
 * dos pinheiros e as fogueiras tremendo com a luz.
 */
function createAmbience(
  scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller,
  art: {
    crowns: Phaser.GameObjects.Image[]; flames: Phaser.GameObjects.Image[]; glows: Phaser.GameObjects.Image[];
    big: { img: Phaser.GameObjects.Image; hide: Rect }[]; uppers: Upper[]; valley: Phaser.Tilemaps.TilemapLayer[]; floorDepth: number;
    /** Pinturas adiadas (o atlas de longe): uma por quadro, depois do primeiro. */
    later: (() => void)[];
    /** A câmera da máscara da borda do capim, que acompanha a principal em meia resolução. */
    maskCam: Phaser.Cameras.Scene2D.Camera;
  },
): MapAmbience {
  const cam = scene.cameras.main;
  // Névoa do abismo: entre o vale e o chão do castelo, então só aparece pelos buracos.
  const mist = scene.add.particles(0, 0, MIST, {
    lifespan: { min: 5000, max: 8000 },
    speedX: { min: 6, max: 16 },
    speedY: { min: -3, max: 3 },
    alpha: { values: [0, 0.5, 0.35, 0], interpolation: "linear" },
    scale: { start: 2, end: 4 },
    tint: 0xe4ecf4,
    frequency: 160,
    maxAliveParticles: 40,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(art.floorDepth - 1.5);
  const zone = (mist.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;
  const visible = new Set<Phaser.GameObjects.GameObject>();
  const drop = DROP * TILE_SIZE;
  let started = false;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      const mc = art.maskCam;
      mc.setSize(cam.width * MASK_SCALE, cam.height * MASK_SCALE).setZoom(cam.zoom * MASK_SCALE);
      mc.centerOn(v.centerX, v.centerY);
      // Câmera invisível: o Phaser não recalcula a matriz dela no desenho, então ela é recalculada aqui.
      mc.preRender();
      // O atlas de longe sai no segundo quadro (o mapa já apareceu; o vale e a torre estão fora da tela na entrada).
      if (art.later.length && started) {
        const t = performance.now();
        art.later.shift()!();
        (window as unknown as { desenhoLongeMs?: number }).desenhoLongeMs = Math.round(performance.now() - t);
      }
      started = true;
      // O vale: um andar abaixo (deslocado para o sul) e mais longe (anda devagar).
      for (const l of art.valley) l.setPosition(cam.scrollX * (1 - PARALLAX), drop + cam.scrollY * (1 - PARALLAX));
      zone.setTo(v.x - v.width * 0.3, v.y, v.width * 1.1, v.height);
      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const hero = focusTile(cam);
      const mx = v.centerX, my = v.centerY;
      // Os andares de cima somem com o herói embaixo deles (devagar, para não piscar).
      for (const u of art.uppers) {
        const a = u.area;
        const under = hero.x >= a.x && hero.y >= a.y && hero.x < a.x + a.w && hero.y < a.y + a.h;
        const goal = under ? u.hidden : 1;
        if (u.alpha === goal) continue;
        u.alpha = Math.abs(u.alpha - goal) < 0.01 ? goal : u.alpha + (goal - u.alpha) * 0.18;
        // A luz das fogueiras treme sozinha: o andar de cima só manda o quanto dela aparece.
        for (const o of u.objs) if (o.getData("alpha") !== undefined) o.setData("fade", u.alpha); else o.setAlpha(u.alpha);
      }
      for (const crown of art.crowns) {
        if (!visible.has(crown)) continue;
        const over = Math.abs(mx - crown.x) < 26 && my > crown.y - 80 && my < crown.y - 34;
        crown.setAlpha(over ? 0.45 : 1);
      }
      for (const b of art.big) {
        if (!visible.has(b.img)) continue;
        const h = b.hide;
        b.img.setAlpha(hero.x >= h.x && hero.y >= h.y && hero.x < h.x + h.w && hero.y < h.y + h.h ? 0.55 : 1);
      }
      // Fogueiras: troca de quadro em ritmo próprio; a luz treme junto.
      for (const f of art.flames) if (f.visible) f.setFrame(Math.floor(time / 110 + f.getData("phase")) % 4);
      for (const l of art.glows) {
        if (!l.visible) continue;
        const ph = l.getData("phase");
        const base = l.getData("alpha") * (0.78 + 0.14 * Math.sin(time / 90 + ph) + 0.08 * Math.sin(time / 37 + ph * 3));
        l.setAlpha(base * (l.getData("fade") ?? 1));
      }
      void d;
      void uiDepth;
    },
  };
}
