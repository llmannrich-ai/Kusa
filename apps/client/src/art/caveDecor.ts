import { TILE_SIZE } from "@kusa/shared";
import { SAND, ragged, sideBand } from "./desertDecor.ts";
import { blob, hash, line, makeCanvas, px, strip, type Ctx } from "./pixels.ts";

/**
 * Arte própria da caverna do deserto (o subterrâneo do Mar de Areia), pixel a pixel: chão de areia batida e pedra,
 * rocha (topo e paredão de frente, com camadas de sedimento), o salão antigo dos baús em blocos de arenito, enfeites
 * (ossos, sulcos que o verme deixa, pele trocada, estalagmites, cristais que brilham) e a boca da caverna na
 * superfície. Lá embaixo a luz vem dos cristais e do buraco por onde se desce: tudo é mais escuro e mais quente
 * que em cima.
 */

const T = TILE_SIZE;

const FLOOR = { deep: "#4a3a29", shade: "#5c4932", mid: "#6e583e", light: "#83694a", grain: "#987c58" };
const ROCK = { o: "#0c0806", deep: "#140e0a", dark: "#1c140e", mid: "#2e2218", light: "#5a4430", glow: "#8a6c4a" };
const STRATA = ["#4a3524", "#5c432c", "#6e5236", "#3f2d1f"];
const HALL = { grout: "#3b2f22", deep: "#6a5640", mid: "#7f6a4f", light: "#97805f", glyph: "#c9a35a" };
const BONE = { o: "#3a3024", m: "#d8ccb0", l: "#f0e7d2", d: "#a99a7c" };

// --- Chão ------------------------------------------------------------------------------

/** Chão da caverna: areia batida escura, manchada, com grãos e pedrinhas soltas (só grãos: fecha na borda). */
function floorTile(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const m = Math.sin((2 * Math.PI * x) / T + variant * 1.7) * Math.sin((2 * Math.PI * y) / T + variant);
        let c = m > 0.75 ? FLOOR.shade : m < -0.8 ? FLOOR.light : FLOOR.mid;
        const g = hash(x, y, 500 + variant);
        if (g < 0.04) c = FLOOR.grain;
        else if (g < 0.09) c = FLOOR.deep;
        px(ctx, x, y, c);
      }
    if (variant === 4) {
      px(ctx, 11, 20, "#00000040", 4, 1);
      blob(ctx, 12, 18, 2.2, 1.6, { o: ROCK.o, m: ROCK.light, l: ROCK.glow, d: ROCK.mid });
    }
  };
}

export const CAVE_FLOOR_VARIANTS = 6;

export function caveFloorStrip() {
  return strip(Array.from({ length: CAVE_FLOOR_VARIANTS }, (_, v) => floorTile(v)));
}

/**
 * Salão dos baús: lajes de arenito antigas, uma por tile, com rejunte em cima e à esquerda (o rejunte do vizinho
 * fecha os outros lados) e desgaste nas quinas. Quadros 2 e 3 têm um glifo gravado, que brilha fraco.
 */
function hallTile(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        let c = (x + y) % 9 === 0 && hash(x, y, 520 + variant) < 0.5 ? HALL.deep : HALL.mid;
        if (hash(x, y, 521 + variant) < 0.06) c = HALL.light;
        if (x === 1 || y === 1) c = HALL.light; // quina iluminada da laje
        if (x === T - 1 || y === T - 1) c = HALL.deep; // borda na sombra
        if (x === 0 || y === 0) c = HALL.grout;
        px(ctx, x, y, c);
      }
    // Lascas nas quinas.
    px(ctx, 1, 1, HALL.grout, 2, 1);
    if (variant % 2) px(ctx, T - 4, T - 2, HALL.grout, 3, 1);
    if (variant >= 2) {
      // Glifo: anel com um traço, como as runas.
      for (let a = 0; a < Math.PI * 2; a += 0.12) px(ctx, 16 + Math.cos(a) * 7, 16 + Math.sin(a) * 7, HALL.glyph);
      line(ctx, 16, 10, 16, 22, HALL.glyph);
      line(ctx, variant === 2 ? 12 : 20, 14, variant === 2 ? 20 : 12, 18, HALL.glyph);
    }
  };
}

export function hallFloorStrip() {
  return strip([hallTile(0), hallTile(1), hallTile(2), hallTile(3)]);
}

// --- Rocha -----------------------------------------------------------------------------

/** Topo da rocha (por cima, longe da beira): escuro, com rachaduras e veios. */
function rockTop(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const g = hash(x, y, 530 + variant);
        px(ctx, x, y, g < 0.08 ? ROCK.mid : g < 0.16 ? ROCK.deep : ROCK.dark);
      }
    // Rachadura.
    let x = 6 + variant * 5;
    for (let y = 4; y < 28; y++) {
      if (hash(y, variant, 531) < 0.35) x += hash(y, variant, 532) < 0.5 ? -1 : 1;
      px(ctx, x, y, ROCK.o);
      px(ctx, x + 1, y, ROCK.mid);
    }
  };
}

export const ROCK_TOP_VARIANTS = 3;

export function rockTopStrip() {
  return strip(Array.from({ length: ROCK_TOP_VARIANTS }, (_, v) => rockTop(v)));
}

/**
 * Paredão de frente (rocha com o chão ao sul): a beira de cima pega a luz, e o resto desce em camadas de sedimento
 * onduladas, mais escuras embaixo, até o pé, onde a areia se acumula.
 */
function rockFace(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const band = Math.floor((y + 2 * Math.sin((2 * Math.PI * x) / T + variant)) / 5);
        let c = STRATA[(band + variant) % STRATA.length];
        if (y > 22) c = y > 27 ? ROCK.deep : ROCK.dark;
        if (hash(x, y, 540 + variant) < 0.07) c = ROCK.light;
        if (y < 3) c = y === 0 ? ROCK.dark : ROCK.glow; // beira iluminada
        px(ctx, x, y, c);
      }
    // Areia acumulada no pé do paredão.
    for (let x = 0; x < T; x++) {
      const h = 2 + Math.round(1.5 + Math.sin(x * 0.7 + variant) * 1.5);
      for (let y = T - h; y < T; y++) px(ctx, x, y, y === T - h ? FLOOR.light : FLOOR.mid);
    }
  };
}

export const ROCK_FACE_VARIANTS = 3;

export function rockFaceStrip() {
  return strip(Array.from({ length: ROCK_FACE_VARIANTS }, (_, v) => rockFace(v)));
}

/**
 * Beiras da rocha (no tile de rocha que encosta no chão): 0 N, a beira vista de cima, com um filete de luz;
 * 1 L e 3 O, as laterais (a da direita na sombra, a da esquerda pegando a luz dos cristais).
 */
export function rockRimStrip() {
  const north = (ctx: Ctx) => sideBand(ctx, 0, (i) => ragged(i, 4, 2, 41), (d, i) => (d >= ragged(i, 4, 2, 41) - 1 ? ROCK.glow : FLOOR.shade));
  const east = (ctx: Ctx) => sideBand(ctx, 1, (i) => ragged(i, 5, 2, 43), (d) => (d < 2 ? FLOOR.deep : ROCK.deep));
  const west = (ctx: Ctx) => sideBand(ctx, 3, (i) => ragged(i, 5, 2, 47), (d) => (d < 2 ? FLOOR.shade : ROCK.light));
  return strip([north, east, () => {}, west]);
}

/** Sombra da rocha no chão ao sul (0), a leste (1) e nos dois (2): mais forte que a das dunas. */
export function caveShadeStrip() {
  const bands = [0.5, 0.36, 0.24, 0.14, 0.07];
  const north = (ctx: Ctx) => bands.forEach((a, i) => px(ctx, 0, i * 2, `rgba(10,6,3,${a})`, T, 2));
  const west = (ctx: Ctx) => bands.forEach((a, i) => px(ctx, i * 2, 0, `rgba(10,6,3,${a})`, 2, T));
  return strip([north, west, (ctx) => { north(ctx); west(ctx); }]);
}

// --- Enfeites ---------------------------------------------------------------------------

function bones(ctx: Ctx) {
  blob(ctx, 12, 17, 3.5, 3, BONE);
  px(ctx, 10, 17, "#2a2219", 2, 2); px(ctx, 13, 17, "#2a2219", 2, 2);
  line(ctx, 17, 22, 26, 18, BONE.m); line(ctx, 17, 23, 26, 19, BONE.d);
  px(ctx, 16, 21, BONE.l, 2, 2); px(ctx, 26, 17, BONE.l, 2, 2);
  line(ctx, 8, 24, 14, 26, BONE.m);
}

/** Sulco que o verme deixa ao passar: vala curva com a areia empurrada para as bordas. */
function furrow(ctx: Ctx) {
  for (let x = 0; x < T; x++) {
    const y = 16 + Math.sin(x / 5) * 5;
    px(ctx, x, y - 3, FLOOR.light);
    px(ctx, x, y - 2, FLOOR.shade, 1, 4);
    px(ctx, x, y - 1, FLOOR.deep, 1, 2);
    px(ctx, x, y + 2, FLOOR.light);
  }
}

/** Pedaço de pele trocada do verme: placas secas, translúcidas. */
function shedSkin(ctx: Ctx) {
  for (let i = 0; i < 4; i++) {
    const x = 7 + i * 5;
    const y = 15 + (i % 2) * 3;
    blob(ctx, x, y, 3, 2.4, { o: "#5a4430", m: "#a88d68", l: "#c9ad85", d: "#8a7052" });
    line(ctx, x - 2, y + 1, x + 2, y + 1, "#6e5638");
  }
}

function pebbles(ctx: Ctx) {
  for (let i = 0; i < 4; i++) {
    const x = 8 + hash(i, 550) * 16;
    const y = 10 + hash(i, 551) * 14;
    px(ctx, x - 1, y + 2, "#00000040", 4, 1);
    blob(ctx, x, y, 1.6, 1.2, { o: ROCK.o, m: ROCK.light, l: ROCK.glow, d: ROCK.mid });
  }
}

/** Monte de areia que escorreu de uma fresta no teto. */
function sandPile(ctx: Ctx) {
  blob(ctx, 16, 19, 9, 4.5, { o: "#6d5235", m: SAND.shade, l: SAND.mid, d: "#9c7444" });
  for (let i = 0; i < 6; i++) px(ctx, 10 + hash(i, 552) * 12, 15 + hash(i, 553) * 6, SAND.light);
}

export const CAVE_FLOOR_DECOR = { bones: 0, furrow: 1, skin: 2, pebbles: 3, sand: 4 } as const;

export function caveDecorStrip() {
  return strip([bones, furrow, shedSkin, pebbles, sandPile]);
}

/** Estalagmite: cone de rocha com camadas, luz do lado esquerdo. */
function stalagmite(tall: number) {
  return (ctx: Ctx) => {
    px(ctx, 9, 29, "#00000055", 15, 2);
    for (let y = 30 - tall; y < 30; y++) {
      const t = (y - (30 - tall)) / tall;
      const half = 1 + t * 6;
      for (let x = Math.round(16 - half); x <= 16 + half; x++) {
        const u = (x - 16) / half;
        let c = u < -0.4 ? ROCK.glow : u > 0.45 ? ROCK.deep : ROCK.light;
        if (y % 4 === 0 && u > -0.4) c = ROCK.mid;
        px(ctx, x, y, c);
      }
      px(ctx, Math.round(16 - half) - 1, y, ROCK.o);
      px(ctx, Math.round(16 + half) + 1, y, ROCK.o);
    }
    px(ctx, 16, 29 - tall, ROCK.o);
  };
}

/** Cristais âmbar crescendo da rocha (brilham: o mapa põe a luz por baixo). */
function crystals(ctx: Ctx) {
  px(ctx, 8, 29, "#00000055", 17, 2);
  const shard = (x: number, h: number, lean: number) => {
    for (let y = 0; y < h; y++) {
      const cx = x + lean * (y / h);
      const w = y > h - 3 ? 1 : 2;
      px(ctx, cx - w, 29 - y, "#a85a12", 1, 1);
      px(ctx, cx - w + 1, 29 - y, y > h - 4 ? "#fff1c4" : "#f2a83a", w * 2 - 1, 1);
      px(ctx, cx + w, 29 - y, "#6e3608", 1, 1);
    }
  };
  shard(12, 11, -3);
  shard(17, 16, 1);
  shard(21, 9, 3);
}

export const CAVE_TALL = { stalagmiteA: 0, stalagmiteB: 1, crystals: 2 } as const;

export function caveTallStrip() {
  return strip([stalagmite(14), stalagmite(20), crystals]);
}

// --- Luz e passagens ---------------------------------------------------------------------

/** Mancha de luz redonda e suave (para os cristais e o buraco da saída), em degraus de pixel. */
export function caveGlowCanvas() {
  const size = 96;
  const { canvas, ctx } = makeCanvas(size, size);
  for (let y = 0; y < size; y += 2)
    for (let x = 0; x < size; x += 2) {
      const d = Math.hypot(x - size / 2, (y - size / 2) * 1.3) / (size / 2);
      if (d >= 1) continue;
      const a = Math.round((1 - d) ** 1.6 * 6) / 6 * 0.55;
      if (a > 0) px(ctx, x, y, `rgba(255,190,110,${a.toFixed(3)})`, 2, 2);
    }
  return canvas;
}

/**
 * Saída do subterrâneo: facho de luz do dia caindo do buraco no teto, com a corda de nós que leva de volta para
 * cima (64×128; a base fica no tile da saída).
 */
export const CAVE_SHAFT = { w: 64, h: 128 };

export function caveShaftCanvas() {
  const { canvas, ctx } = makeCanvas(CAVE_SHAFT.w, CAVE_SHAFT.h);
  const { w, h } = CAVE_SHAFT;
  // Facho: trapézio que abre para baixo, em faixas de transparência.
  for (let y = 0; y < h; y++) {
    const half = 10 + (y / h) * 16;
    for (let x = Math.round(w / 2 - half); x <= w / 2 + half; x++) {
      const edge = Math.abs(x - w / 2) / half;
      const a = (0.22 - edge * 0.16) * (0.5 + 0.5 * (y / h));
      if (a > 0.02 && (x + y) % 2 === 0) px(ctx, x, y, `rgba(255,236,190,${a.toFixed(3)})`);
    }
  }
  // Areia caindo no facho.
  for (let i = 0; i < 14; i++) px(ctx, w / 2 - 12 + hash(i, 560) * 24, hash(i, 561) * h, "rgba(255,240,205,0.7)");
  // Corda com nós, do alto até o chão.
  for (let y = 0; y < h - 6; y++) {
    const x = w / 2 + 4 + Math.round(Math.sin(y / 9));
    px(ctx, x, y, "#8a6a3c");
    px(ctx, x + 1, y, "#5c4424");
    if (y % 12 === 0 && y > 4) px(ctx, x - 1, y, "#a9844c", 4, 2);
  }
  // Pé da corda enrolado no chão.
  blob(ctx, w / 2 + 5, h - 5, 4, 2, { o: "#3a2a14", m: "#8a6a3c", l: "#a9844c", d: "#5c4424" });
  return canvas;
}

/**
 * Boca da caverna na superfície: monte de arenito (5 tiles de largura, 3,5 de altura) com a abertura escura
 * virada para o sul, sobre o tile da caverna. A base do desenho encosta na base desse tile.
 */
export const CAVE_MOUTH = { w: 160, h: 112 };

export function caveMouthCanvas() {
  const { w, h } = CAVE_MOUTH;
  const { canvas, ctx } = makeCanvas(w, h);
  const stone = { o: "#3c2614", deep: "#7a5232", dark: "#9a6a40", mid: "#bf8c55", light: "#dcac70", glow: "#f0cc92" };
  // Sombra no chão, para baixo e à direita.
  for (let y = h - 14; y < h; y++) for (let x = 20; x < w; x++) {
    if (((x - 96) / 64) ** 2 + ((y - h + 4) / 10) ** 2 < 1 && (x + y) % 2 === 0) px(ctx, x, y, "rgba(92,52,18,0.35)");
  }
  // Monte: três rochedos arredondados que se encostam, o do meio mais alto.
  const rocks = [
    { cx: 46, cy: 78, rx: 34, ry: 30 },
    { cx: 114, cy: 80, rx: 34, ry: 28 },
    { cx: 80, cy: 58, rx: 40, ry: 42 },
  ];
  const insideRock = (x: number, y: number) => rocks.some((r) => ((x - r.cx) / r.rx) ** 2 + ((y - r.cy) / r.ry) ** 2 <= 1) && y < h - 4;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!insideRock(x, y)) continue;
      const edge = !insideRock(x - 1, y) || !insideRock(x + 1, y) || !insideRock(x, y - 1) || !insideRock(x, y + 1);
      if (edge) { px(ctx, x, y, stone.o); continue; }
      // Luz de cima à esquerda pelo rochedo mais perto; camadas de sedimento horizontais.
      const r = rocks.reduce((best, k) => (((x - k.cx) / k.rx) ** 2 + ((y - k.cy) / k.ry) ** 2 < ((x - best.cx) / best.rx) ** 2 + ((y - best.cy) / best.ry) ** 2 ? k : best));
      const u = (x - r.cx) / r.rx + (y - r.cy) / r.ry;
      let c = u < -0.9 ? stone.glow : u < -0.3 ? stone.light : u < 0.5 ? stone.mid : u < 1 ? stone.dark : stone.deep;
      if ((y + Math.round(Math.sin(x / 11) * 2)) % 9 === 0) c = u < 0 ? stone.mid : stone.deep;
      if (hash(x, y, 570) < 0.05) c = stone.dark;
      px(ctx, x, y, c);
    }
  // Abertura: arco escuro no pé do rochedo do meio, com degraus de escuridão e a areia entrando.
  const mouth = { cx: 80, cy: h - 6, rx: 19, ry: 26 };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = ((x - mouth.cx) / mouth.rx) ** 2 + ((y - mouth.cy) / mouth.ry) ** 2;
      if (d > 1 || y > h - 4) continue;
      const c = d > 0.85 ? stone.o : d > 0.6 ? "#1a0f08" : "#0b0604";
      px(ctx, x, y, c);
    }
  // Areia escorrendo para dentro da boca.
  for (let x = mouth.cx - 16; x <= mouth.cx + 16; x++) {
    const top = h - 6 - Math.round(3 + Math.sin(x / 4) * 2);
    for (let y = top; y < h - 3; y++) px(ctx, x, y, y === top ? SAND.light : SAND.mid);
  }
  // Ossos na entrada: aviso de quem mora lá.
  blob(ctx, 58, h - 7, 3, 2.5, BONE);
  px(ctx, 57, h - 7, "#2a2219");
  line(ctx, 100, h - 6, 108, h - 9, BONE.m);
  return canvas;
}
