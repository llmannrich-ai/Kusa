import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas } from "./pixels.ts";

/**
 * Arte própria dos detalhes do Pântano das Ruínas, pixel a pixel (32×32 por quadro, como os tiles):
 * enfeites do chão, da água e altos (juncos, samambaias, tocos), sombras, ondinhas, vaga-lume e névoa.
 * Tudo é enfeite: não bloqueia passo nem visão.
 */

type Ctx = CanvasRenderingContext2D;

/** Um pixel (ou um bloco w×h) numa cor; alpha opcional. */
function px(ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/**
 * Elipse cheia com contorno escuro, luz em cima à esquerda e sombra embaixo à direita.
 * `skip` recorta pixels (ex.: o corte da vitória-régia).
 */
function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: { o: string; m: string; l: string; d: string }, skip?: (x: number, y: number) => boolean) {
  const inside = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && !skip?.(x, y);
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const u = (x - cx) / rx + (y - cy) / ry;
      px(ctx, x, y, edge ? c.o : u < -0.7 ? c.l : u > 0.6 ? c.d : c.m);
    }
  }
}

/** Linha de pixels (Bresenham). */
function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    px(ctx, x0, y0, color);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Faixa horizontal de quadros 32×32, cada um desenhado por uma função. */
function strip(frames: ((ctx: Ctx) => void)[]) {
  const { canvas, ctx } = makeCanvas(TILE_SIZE * frames.length, TILE_SIZE);
  frames.forEach((draw, i) => {
    ctx.save();
    ctx.translate(i * TILE_SIZE, 0);
    draw(ctx);
    ctx.restore();
  });
  return canvas;
}

const STONE = { o: "#2b2823", m: "#7d776b", l: "#a6a091", d: "#5a554b" };
const RUIN_STONE = { o: "#3a3326", m: "#a29a83", l: "#c9c0a5", d: "#77705d" };
const PAD = { o: "#1d3a17", m: "#4f8f3a", l: "#7cb35a", d: "#356b28" };
const CAP_RED = { o: "#4a1410", m: "#c0392b", l: "#e8604c", d: "#8e2318" };
const CAP_BROWN = { o: "#3a2412", m: "#8d5a2b", l: "#b77d45", d: "#653e1c" };

// --- Chão (capim, lama e pedra das ruínas) ---------------------------------------

function pebbles(seed: number) {
  return (ctx: Ctx) => {
    const n = 2 + Math.floor(hash(seed, 1) * 3);
    for (let i = 0; i < n; i++) {
      const x = Math.round(8 + hash(seed, i, 2) * 16);
      const y = Math.round(9 + hash(seed, i, 3) * 15);
      const r = 2 + hash(seed, i, 4) * 1.5;
      px(ctx, x - r + 1, y + r * 0.8 + 1, "#00000040", r * 2, 1);
      blob(ctx, x, y, r + 0.6, r * 0.8, STONE);
    }
  };
}

function mushrooms(cap: typeof CAP_RED, dots: boolean) {
  return (ctx: Ctx) => {
    const shrooms = [[13, 20, 3.2], [19, 22, 2.4], [16, 25, 1.8]] as const;
    for (const [x, y, r] of shrooms) {
      px(ctx, x - r + 1, y + r + 2, "#00000045", r * 2, 1);
      px(ctx, x - 0.5, y, "#2d2418", 2, r + 2);
      px(ctx, x, y, "#e8dcc0", 1, r + 1);
      blob(ctx, x, y - 0.5, r + 0.5, r * 0.7, cap, (_, yy) => yy > y);
      if (dots) { px(ctx, x - 1, y - 1, "#f4efe0"); px(ctx, x + 1, y - 2, "#f4efe0"); }
    }
  };
}

function leaves(ctx: Ctx) {
  const colors = ["#c46a1e", "#d9a03a", "#8a4b1e", "#a8642a"];
  for (let i = 0; i < 7; i++) {
    const x = 4 + hash(7, i) * 24;
    const y = 5 + hash(8, i) * 22;
    const c = colors[i % colors.length];
    px(ctx, x, y, c, 2, 1);
    px(ctx, x + 1, y + 1, c, 2, 1);
    px(ctx, x + 2, y + 1, "#3a2412");
  }
}

function flowerTuft(petal: string, center: string) {
  return (ctx: Ctx) => {
    for (const [x, y] of [[12, 14], [18, 12], [15, 19], [21, 18], [9, 20]]) {
      line(ctx, x, y + 1, x - 1 + (x % 3), y + 5, "#3f6e2a");
      px(ctx, x - 1, y, petal); px(ctx, x + 1, y, petal); px(ctx, x, y - 1, petal); px(ctx, x, y + 1, petal);
      px(ctx, x, y, center);
    }
  };
}

function bones(ctx: Ctx) {
  const o = "#3a3326";
  const b = "#e6dcc3";
  const s = "#b5aa8e";
  // Caveira
  blob(ctx, 14, 16, 4, 3.5, { o, m: b, l: "#f6efdc", d: s });
  px(ctx, 12, 16, "#2a241b", 2, 2); px(ctx, 15, 16, "#2a241b", 2, 2);
  px(ctx, 13, 19, s, 3, 2); px(ctx, 13, 20, o); px(ctx, 15, 20, o);
  // Ossos cruzados ao lado
  line(ctx, 19, 21, 26, 25, b); line(ctx, 19, 22, 26, 26, s);
  px(ctx, 18, 20, b, 2, 2); px(ctx, 26, 25, b, 2, 2);
  line(ctx, 20, 26, 25, 20, b);
  px(ctx, 19, 26, b, 2, 2); px(ctx, 25, 19, b, 2, 2);
}

function rubble(seed: number) {
  return (ctx: Ctx) => {
    for (let i = 0; i < 5; i++) {
      const x = 7 + hash(seed, i, 5) * 18;
      const y = 10 + hash(seed, i, 6) * 15;
      const w = 2 + Math.floor(hash(seed, i, 7) * 3);
      const h = 2 + Math.floor(hash(seed, i, 8) * 2);
      px(ctx, x, y + h, "#00000040", w + 1, 1);
      px(ctx, x - 1, y - 1, RUIN_STONE.o, w + 2, h + 2);
      px(ctx, x, y, RUIN_STONE.m, w, h);
      px(ctx, x, y, RUIN_STONE.l, w, 1);
      px(ctx, x + w - 1, y + 1, RUIN_STONE.d, 1, h - 1);
    }
  };
}

function moss(ctx: Ctx) {
  for (let y = 4; y < 28; y++) {
    for (let x = 4; x < 28; x++) {
      const d = Math.hypot(x - 16, (y - 16) * 1.2);
      if (d > 11 - hash(x, y, 13) * 5) continue;
      const n = hash(x, y, 14);
      if (n < 0.45) px(ctx, x, y, n < 0.15 ? "#7a9a3a" : "#4f7228");
    }
  }
}

function puddle(ctx: Ctx) {
  blob(ctx, 16, 18, 8, 4, { o: "#2d2418", m: "#3c5446", l: "#5f7f6a", d: "#2f4237" });
  line(ctx, 12, 16, 15, 16, "#9fbfa8");
  px(ctx, 19, 19, "#9fbfa8");
}

function twig(ctx: Ctx) {
  line(ctx, 7, 22, 25, 14, "#5e3c1c");
  line(ctx, 7, 23, 25, 15, "#3a2412");
  line(ctx, 14, 19, 12, 13, "#5e3c1c");
  line(ctx, 20, 17, 23, 22, "#5e3c1c");
  px(ctx, 12, 12, "#5c8a2e"); px(ctx, 11, 13, "#5c8a2e"); px(ctx, 24, 23, "#5c8a2e");
}

/** Enfeites do chão (tilemap, sem ordem de profundidade): índice = quadro. */
export const DECOR_FLOOR = {
  pebblesA: 0, pebblesB: 1, mushroomsRed: 2, mushroomsBrown: 3, leaves: 4, flowersWhite: 5,
  flowersPurple: 6, bones: 7, rubbleA: 8, rubbleB: 9, moss: 10, puddle: 11, twig: 12,
} as const;

export function decorFloorStrip() {
  return strip([
    pebbles(1), pebbles(2), mushrooms(CAP_RED, true), mushrooms(CAP_BROWN, false), leaves,
    flowerTuft("#eef0e6", "#e8c84a"), flowerTuft("#a678d8", "#f2e27a"), bones, rubble(3), rubble(4), moss, puddle, twig,
  ]);
}

// --- Água --------------------------------------------------------------------------

function lilyPad(cx: number, cy: number, r: number, notch: number) {
  return (ctx: Ctx) => {
    // Corte em cunha a partir do centro, numa direção.
    const skip = (x: number, y: number) => {
      const a = Math.atan2(y - cy, x - cx) - notch;
      const wrapped = Math.atan2(Math.sin(a), Math.cos(a));
      return Math.abs(wrapped) < 0.32 && Math.hypot(x - cx, y - cy) > 0.8;
    };
    blob(ctx, cx, cy + 1, r + 0.5, r * 0.7 + 0.5, { o: "#00000030", m: "#00000030", l: "#00000030", d: "#00000030" }, skip);
    blob(ctx, cx, cy, r, r * 0.7, PAD, skip);
    line(ctx, cx, cy, cx + Math.cos(notch + Math.PI) * r * 0.6, cy + Math.sin(notch + Math.PI) * r * 0.4, PAD.d);
  };
}

function lilyFlower(ctx: Ctx) {
  lilyPad(15, 17, 7, 0.6)(ctx);
  const [x, y] = [13, 14];
  px(ctx, x - 2, y, "#f2a7c3", 5, 2);
  px(ctx, x - 1, y - 2, "#f7c9da", 3, 3);
  px(ctx, x - 3, y + 1, "#d9799e"); px(ctx, x + 3, y + 1, "#d9799e");
  px(ctx, x, y - 1, "#f4d35e");
}

function duckweed(seed: number) {
  return (ctx: Ctx) => {
    for (let i = 0; i < 26; i++) {
      const x = 3 + hash(seed, i, 9) * 26;
      const y = 3 + hash(seed, i, 10) * 26;
      if (Math.hypot(x - 16, y - 16) > 13) continue;
      px(ctx, x, y, hash(seed, i, 11) < 0.3 ? "#b6d86a" : "#7fae45");
    }
  };
}

/** Enfeites da água (só no meio da lagoa, longe da margem). */
export const DECOR_WATER = { pad: 0, pads: 1, flower: 2, duckweedA: 3, duckweedB: 4 } as const;

export function decorWaterStrip() {
  return strip([
    lilyPad(16, 16, 8, 0.4),
    (ctx) => { lilyPad(11, 12, 5, 2.4)(ctx); lilyPad(21, 21, 6, 5.2)(ctx); },
    lilyFlower,
    duckweed(1),
    duckweed(2),
  ]);
}

// --- Enfeites altos (sprites ordenados como os personagens) --------------------------

function cattails(seed: number) {
  return (ctx: Ctx) => {
    const base = 30;
    // Folhas finas e compridas, depois as hastes com a "salsicha" marrom na ponta.
    for (let i = 0; i < 6; i++) {
      const x = 8 + hash(seed, i, 1) * 16;
      const lean = (hash(seed, i, 2) - 0.5) * 10;
      const top = 8 + hash(seed, i, 3) * 10;
      line(ctx, x, base, x + lean, top, i % 2 ? "#5c8a2e" : "#3f6e2a");
      px(ctx, x + lean, top, "#8fbf55");
    }
    for (let i = 0; i < 3; i++) {
      const x = 11 + i * 5 + hash(seed, i, 4) * 2;
      const top = 4 + hash(seed, i, 5) * 6;
      line(ctx, x, base, x, top + 6, "#6b8f3a");
      px(ctx, x - 1, top, "#2a1608", 3, 7);
      px(ctx, x - 1, top + 1, "#6b3f1f", 2, 5);
      px(ctx, x, top + 1, "#8d5a2b", 1, 3);
      px(ctx, x, top - 2, "#6b8f3a", 1, 2);
    }
    px(ctx, 7, 30, "#00000035", 18, 1);
  };
}

function fern(ctx: Ctx) {
  const base = { x: 16, y: 29 };
  const fronds = [-2.75, -2.25, -1.85, -1.55, -1.25, -0.85, -0.4];
  for (const a of fronds) {
    const len = 19 - Math.abs(a + 1.55) * 4;
    for (let t = 0; t <= len; t++) {
      const x = base.x + Math.cos(a) * t;
      const y = base.y + Math.sin(a) * t + (t * t) / 30;
      px(ctx, x, y, "#2f5f25");
      if (t > 2 && t % 2 === 0) {
        const leaf = Math.max(1, Math.round((len - t) / 3));
        px(ctx, x - leaf, y - 1, "#4f8f3a", leaf, 1);
        px(ctx, x + 1, y - 1, "#5ea044", leaf, 1);
        px(ctx, x + 1, y - 2, "#7cb35a");
      }
    }
  }
  px(ctx, 9, 29, "#00000035", 15, 1);
}

function grassTuft(ctx: Ctx) {
  for (let i = 0; i < 11; i++) {
    const x = 9 + hash(31, i) * 14;
    const h = 7 + hash(32, i) * 9;
    const lean = (hash(33, i) - 0.5) * 6;
    line(ctx, x, 29, x + lean, 29 - h, i % 3 ? "#4f8f3a" : "#3a6b2a");
    px(ctx, x + lean, 29 - h, "#a7c96a");
  }
  px(ctx, 8, 30, "#00000030", 16, 1);
}

function stump(ctx: Ctx) {
  const o = "#24160b";
  px(ctx, 9, 29, "#00000045", 15, 2);
  // Raízes e corpo
  px(ctx, 8, 26, o, 17, 3); px(ctx, 9, 26, "#5e3c1c", 15, 2);
  px(ctx, 10, 15, o, 13, 12); px(ctx, 11, 15, "#6b4526", 11, 11);
  for (const x of [12, 15, 18, 20]) px(ctx, x, 17, "#4a2f17", 1, 8);
  px(ctx, 11, 16, "#8a5a32", 1, 9);
  // Tampo com anéis
  blob(ctx, 16, 15, 6, 3, { o, m: "#c49a62", l: "#dcb27a", d: "#a87c48" });
  blob(ctx, 16, 15, 3, 1.5, { o: "#8a6038", m: "#b88c58", l: "#c49a62", d: "#a87c48" });
  px(ctx, 16, 15, "#8a6038");
  px(ctx, 21, 20, "#5c8a2e", 2, 2); px(ctx, 10, 22, "#5c8a2e", 2, 1);
}

function log(ctx: Ctx) {
  const o = "#24160b";
  px(ctx, 4, 25, "#00000045", 25, 2);
  px(ctx, 4, 16, o, 22, 10); px(ctx, 5, 17, "#5e3c1c", 20, 8);
  px(ctx, 5, 17, "#7a5030", 20, 2);
  for (let x = 7; x < 24; x += 4) px(ctx, x, 19 + (x % 3), "#3a2412", 3, 1);
  blob(ctx, 25, 21, 3.5, 5, { o, m: "#c49a62", l: "#dcb27a", d: "#a87c48" });
  px(ctx, 25, 21, "#8a6038");
  // Musgo por cima
  for (let x = 6; x < 22; x++) if (hash(x, 4) < 0.45) px(ctx, x, 16 - (hash(x, 5) < 0.4 ? 1 : 0), hash(x, 6) < 0.3 ? "#8fbf55" : "#4f8f3a");
}

function berryBush(ctx: Ctx) {
  px(ctx, 7, 29, "#00000040", 19, 2);
  const greens = { o: "#16300f", m: "#3f7a2c", l: "#68a548", d: "#2a5420" };
  blob(ctx, 11, 22, 6, 6, greens);
  blob(ctx, 21, 22, 6, 6, greens);
  blob(ctx, 16, 17, 7, 6.5, greens);
  for (const [x, y] of [[12, 19], [19, 15], [22, 22], [15, 23], [9, 24], [17, 20]]) {
    px(ctx, x, y, "#c0392b", 2, 2); px(ctx, x, y, "#ef6a5a");
  }
}

/** Enfeites altos: ficam de pé (juncos na margem, samambaia e arbusto perto das árvores). */
export const DECOR_TALL = { cattailsA: 0, cattailsB: 1, fern: 2, grass: 3, stump: 4, log: 5, bush: 6 } as const;

export function decorTallStrip() {
  return strip([cattails(1), cattails(2), fern, grassTuft, stump, log, berryBush]);
}

// --- Sombras, ondinhas, vaga-lume e névoa -------------------------------------------

/** Sombra que árvores e muros jogam no chão ao sul (quadro 0) e a leste (quadro 1), em faixas de pixel. */
export function shadeStrip() {
  const bands = [0.34, 0.26, 0.2, 0.14, 0.09, 0.05];
  return strip([
    (ctx) => bands.forEach((a, i) => px(ctx, 0, i * 2, `rgba(8,14,6,${a})`, TILE_SIZE, 2)),
    (ctx) => bands.forEach((a, i) => px(ctx, i * 2, 0, `rgba(8,14,6,${a})`, 2, TILE_SIZE)),
  ]);
}

export const RIPPLE_FRAMES = 4;

/** Ondinha que se abre na água (quadros 32×32). */
export function rippleStrip() {
  return strip(Array.from({ length: RIPPLE_FRAMES }, (_, f) => (ctx: Ctx) => {
    const rx = 2 + f * 2.5;
    const ry = rx * 0.45;
    const alpha = 0.75 - f * 0.17;
    for (let a = 0; a < Math.PI * 2; a += 0.08) {
      px(ctx, 16 + Math.cos(a) * rx, 16 + Math.sin(a) * ry, `rgba(214,236,222,${alpha})`);
    }
  }));
}

/** Vaga-lume: miolo claro e brilho em cruz (7×7). */
export function fireflyCanvas() {
  const { canvas, ctx } = makeCanvas(7, 7);
  px(ctx, 3, 0, "rgba(200,240,90,0.25)", 1, 7);
  px(ctx, 0, 3, "rgba(200,240,90,0.25)", 7, 1);
  px(ctx, 2, 2, "rgba(214,245,110,0.55)", 3, 3);
  px(ctx, 3, 3, "#fffbd0");
  return canvas;
}

/** Névoa: nuvem baixa e larga, de borda pixelada, quase transparente. */
export function mistCanvas() {
  const w = 96;
  const h = 40;
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
      const edge = 0.75 + hash(x, y, 21) * 0.3;
      if (d > edge) continue;
      const a = (1 - d / edge) * 0.22 + 0.04;
      px(ctx, x, y, `rgba(214,230,214,${a.toFixed(3)})`, 2, 2);
    }
  }
  return canvas;
}
