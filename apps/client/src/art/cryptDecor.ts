import { TILE_SIZE } from "@kusa/shared";
import { blob, hash, line, makeCanvas, px, strip, type Ctx } from "./pixels.ts";

/**
 * Arte própria dos detalhes da Cripta, pixel a pixel (quadros 32×32): enfeites do chão, das paredes
 * (desenhados sobre a face de tijolos), tocha animada, móveis e restos de pé, luz das chamas e poeira.
 * Tudo é enfeite: não bloqueia passo nem visão.
 */

const STONE = { o: "#241e18", m: "#7a6e5e", l: "#a3967f", d: "#564c40" };
const BONE = { o: "#3a3326", m: "#e2d8bf", l: "#f4ecd8", d: "#b0a487" };
const WOOD = { o: "#24160b", m: "#7a4e2a", l: "#9c6a3c", d: "#55341a" };
const CLAY = { o: "#2e160a", m: "#a5603a", l: "#c98456", d: "#7a4226" };
const IRON = { o: "#16161a", m: "#55555e", l: "#85858f", d: "#3a3a42" };

// --- Chão --------------------------------------------------------------------------

function boneAt(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  line(ctx, x0, y0 + 1, x1, y1 + 1, BONE.d);
  line(ctx, x0, y0, x1, y1, BONE.m);
  for (const [x, y] of [[x0, y0], [x1, y1]]) {
    px(ctx, x - 1, y - 1, BONE.o, 3, 3);
    px(ctx, x - 1, y - 1, BONE.l, 2, 2);
  }
}

function skullAt(ctx: Ctx, x: number, y: number) {
  px(ctx, x - 3, y + 4, "#00000040", 8, 1);
  blob(ctx, x, y, 3.6, 3.2, BONE);
  px(ctx, x - 2, y, "#1e1912", 2, 2);
  px(ctx, x + 1, y, "#1e1912", 2, 2);
  px(ctx, x - 1, y + 3, BONE.d, 3, 2);
  px(ctx, x - 1, y + 4, BONE.o); px(ctx, x + 1, y + 4, BONE.o);
}

function bones(ctx: Ctx) {
  boneAt(ctx, 8, 20, 17, 24);
  boneAt(ctx, 14, 12, 22, 17);
  boneAt(ctx, 21, 22, 25, 14);
}

function skull(ctx: Ctx) {
  skullAt(ctx, 15, 16);
  boneAt(ctx, 19, 22, 25, 25);
}

function rubble(ctx: Ctx) {
  for (let i = 0; i < 4; i++) {
    const x = Math.round(8 + hash(i, 71) * 16);
    const y = Math.round(10 + hash(i, 72) * 14);
    const r = 2.2 + hash(i, 73) * 1.6;
    px(ctx, x - r, y + r * 0.8 + 1, "#00000045", r * 2 + 1, 1);
    blob(ctx, x, y, r + 0.5, r * 0.8, STONE);
  }
}

function crack(ctx: Ctx) {
  const pts = [[5, 9], [11, 13], [14, 12], [18, 18], [24, 20], [28, 26]];
  for (let i = 0; i < pts.length - 1; i++) {
    line(ctx, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, "rgba(160,140,110,0.35)");
    line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "#1d1712");
  }
  line(ctx, 14, 12, 15, 6, "#1d1712");
  line(ctx, 18, 18, 14, 24, "#1d1712");
}

function stain(ctx: Ctx) {
  for (let y = 4; y < 28; y++) {
    for (let x = 4; x < 28; x++) {
      const d = Math.hypot(x - 16, (y - 16) * 1.3);
      if (d > 10 - hash(x, y, 74) * 4) continue;
      px(ctx, x, y, d < 5 ? "rgba(20,14,8,0.34)" : "rgba(20,14,8,0.2)");
    }
  }
}

function puddle(ctx: Ctx) {
  blob(ctx, 16, 18, 9, 4.5, { o: "#1d1712", m: "#2e3a40", l: "#4f6068", d: "#232c31" });
  line(ctx, 11, 16, 15, 16, "#8ea4ac");
  px(ctx, 20, 19, "#8ea4ac");
}

function shards(ctx: Ctx) {
  const pieces = [[9, 14, 4, 3], [17, 11, 3, 3], [20, 19, 5, 3], [12, 22, 3, 2], [24, 13, 2, 2]];
  for (const [x, y, w, h] of pieces) {
    px(ctx, x, y + h, "#00000040", w, 1);
    px(ctx, x - 1, y - 1, CLAY.o, w + 2, h + 2);
    px(ctx, x, y, CLAY.m, w, h);
    px(ctx, x, y, CLAY.l, w, 1);
  }
}

function paper(ctx: Ctx) {
  px(ctx, 11, 22, "#00000040", 11, 1);
  px(ctx, 10, 11, "#5a4c36", 12, 11);
  px(ctx, 11, 12, "#e2d4ad", 10, 9);
  for (const y of [14, 16, 18]) px(ctx, 12, y, "#8a7a5a", 6 + (y % 3), 1);
  px(ctx, 20, 12, "#c4b58c", 1, 9);
  px(ctx, 11, 20, "#c4b58c", 10, 1);
}

/** Teia no canto do chão: raios saindo do canto e fios em arco. `flip` = canto direito. */
function cobweb(flip: boolean) {
  return (ctx: Ctx) => {
    const c = "rgba(225,225,230,0.55)";
    const ox = flip ? TILE_SIZE - 1 : 0;
    const sx = flip ? -1 : 1;
    for (const a of [0.05, 0.4, 0.8, 1.15, 1.5]) line(ctx, ox, 0, ox + sx * Math.cos(a) * 20, Math.sin(a) * 20, c);
    for (const r of [6, 11, 16]) {
      for (let a = 0.05; a < 1.5; a += 0.06) px(ctx, ox + sx * Math.cos(a) * r, Math.sin(a) * r * 0.95 + Math.sin(a * 7) * 0.6, c);
    }
  };
}

function chain(ctx: Ctx) {
  for (let i = 0; i < 6; i++) {
    const x = 6 + i * 3.6;
    const y = 12 + i * 2.2;
    const vertical = i % 2 === 0;
    px(ctx, x, y, IRON.o, vertical ? 3 : 4, vertical ? 4 : 3);
    px(ctx, x + 1, y + 1, vertical ? IRON.l : IRON.m, vertical ? 1 : 2, vertical ? 2 : 1);
  }
}

function candleStub(ctx: Ctx) {
  blob(ctx, 16, 22, 5, 2, { o: "#8a7f68", m: "#d9cfb4", l: "#ece4cc", d: "#bdb196" });
  px(ctx, 14, 15, "#5e5444", 5, 8);
  px(ctx, 15, 15, "#e8e0c8", 3, 7);
  px(ctx, 15, 15, "#f8f2e0", 1, 6);
  px(ctx, 16, 13, "#2a2018", 1, 2);
}

function scorch(ctx: Ctx) {
  for (let y = 1; y < 31; y++) {
    for (let x = 1; x < 31; x++) {
      const d = Math.hypot(x - 16, y - 16);
      if (d > 14 - hash(x, y, 75) * 5) continue;
      px(ctx, x, y, d < 6 ? "rgba(10,6,4,0.55)" : d < 10 ? "rgba(20,10,4,0.38)" : "rgba(40,18,6,0.2)");
    }
  }
  for (let i = 0; i < 6; i++) px(ctx, 6 + hash(i, 76) * 20, 6 + hash(i, 77) * 20, "#e8742a");
}

function blood(ctx: Ctx) {
  blob(ctx, 14, 17, 6, 4, { o: "#4a0d0b", m: "#7a1512", l: "#9e2219", d: "#5e100d" });
  for (let i = 0; i < 7; i++) {
    const a = hash(i, 78) * Math.PI * 2;
    const r = 8 + hash(i, 79) * 6;
    px(ctx, 14 + Math.cos(a) * r, 17 + Math.sin(a) * r * 0.7, "#7a1512", 2, 2);
  }
}

function dragonBones(ctx: Ctx) {
  // Coluna e costelas de uma criatura grande.
  line(ctx, 4, 17, 28, 15, BONE.d);
  line(ctx, 4, 16, 28, 14, BONE.m);
  for (let x = 7; x <= 25; x += 4) {
    const top = 15 - (x % 8 === 3 ? 1 : 0);
    for (const dir of [-1, 1]) {
      line(ctx, x, top, x + 2, top + dir * 8, BONE.m);
      px(ctx, x + 2, top + dir * 8, BONE.l);
    }
  }
}

/** Enfeites do chão (tilemap): índice = quadro. */
export const CRYPT_FLOOR = {
  bones: 0, skull: 1, rubble: 2, crack: 3, stain: 4, puddle: 5, shards: 6, paper: 7,
  cobwebNW: 8, cobwebNE: 9, chain: 10, candle: 11, scorch: 12, blood: 13, dragonBones: 14,
} as const;

export function cryptFloorStrip() {
  return strip([
    bones, skull, rubble, crack, stain, puddle, shards, paper,
    cobweb(false), cobweb(true), chain, candleStub, scorch, blood, dragonBones,
  ]);
}

// --- Paredes (por cima da face de tijolos: linhas 16 a 31 do quadro; podem subir até a linha 4) ----

function banner(cloth: string, dark: string, emblem: string) {
  return (ctx: Ctx) => {
    px(ctx, 8, 5, WOOD.o, 16, 3); px(ctx, 9, 6, WOOD.l, 14, 1);
    px(ctx, 7, 5, "#c9a24a", 2, 3); px(ctx, 23, 5, "#c9a24a", 2, 3);
    for (let y = 8; y < 29; y++) {
      // Barra rasgada embaixo.
      const torn = y > 24 && hash(y, 81) < (y - 24) / 6;
      for (let x = 10; x < 22; x++) {
        if (y > 25 && hash(x, y, 82) < (y - 25) / 4) continue;
        if (torn && (x === 10 || x === 21)) continue;
        const edge = x === 10 || x === 21;
        px(ctx, x, y, edge ? dark : x < 13 ? cloth : x > 18 ? dark : cloth);
      }
    }
    px(ctx, 10, 8, "#c9a24a", 12, 1);
    // Emblema: losango dourado.
    for (let k = 0; k < 4; k++) px(ctx, 16 - k, 12 + k, emblem, k * 2 || 1, 1);
    for (let k = 0; k < 3; k++) px(ctx, 14 + k, 16 + k, emblem, 4 - k * 2 || 1, 1);
  };
}

function hangingChains(ctx: Ctx) {
  for (const [x, len] of [[11, 12], [20, 9]] as const) {
    px(ctx, x - 1, 16, IRON.o, 3, 2);
    for (let i = 0; i < len; i++) px(ctx, x, 18 + i, i % 2 ? IRON.l : IRON.d);
    px(ctx, x - 2, 18 + len, IRON.o, 5, 3);
    px(ctx, x - 1, 18 + len, IRON.m, 3, 1);
  }
}

function skullNiche(ctx: Ctx) {
  px(ctx, 10, 18, "#1a1410", 12, 12);
  px(ctx, 11, 17, "#1a1410", 10, 1);
  px(ctx, 12, 16, "#1a1410", 8, 1);
  px(ctx, 9, 18, "#8a7c69", 1, 12);
  px(ctx, 22, 18, "#3a3027", 1, 12);
  skullAt(ctx, 16, 23);
}

function wallCrack(ctx: Ctx) {
  const pts = [[9, 16], [12, 20], [11, 23], [15, 27], [14, 31]];
  for (let i = 0; i < pts.length - 1; i++) line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "#1a1410");
  line(ctx, 12, 20, 17, 21, "#1a1410");
}

function wallWeb(ctx: Ctx) {
  const c = "rgba(225,225,230,0.5)";
  for (const a of [0.1, 0.6, 1.1, 1.5]) line(ctx, 31, 16, 31 - Math.cos(a) * 12, 16 + Math.sin(a) * 12, c);
  for (const r of [5, 9]) for (let a = 0.1; a < 1.5; a += 0.08) px(ctx, 31 - Math.cos(a) * r, 16 + Math.sin(a) * r, c);
}

function mossDrip(ctx: Ctx) {
  for (let i = 0; i < 6; i++) {
    const x = 6 + hash(i, 83) * 20;
    const len = 3 + hash(i, 84) * 10;
    px(ctx, x, 16, "#3f5a2a", 2, len);
    px(ctx, x, 16 + len, "#5c7a38");
  }
}

/** Enfeites de parede: ficam sobre a face de tijolos da parede que tem chão ao sul. */
export const CRYPT_WALL = { bannerRed: 0, bannerBlue: 1, chains: 2, niche: 3, crack: 4, web: 5, moss: 6 } as const;

export function cryptWallStrip() {
  return strip([
    banner("#8e2318", "#5e130e", "#e2b84a"), banner("#2f4a6f", "#1c2f47", "#d8dde6"),
    hangingChains, skullNiche, wallCrack, wallWeb, mossDrip,
  ]);
}

// --- Tocha (animada) ------------------------------------------------------------------

export const TORCH_FRAMES = 4;

/** Tocha presa na parede: suporte de ferro e chama que balança (4 quadros). */
export function torchStrip() {
  return strip(Array.from({ length: TORCH_FRAMES }, (_, f) => (ctx: Ctx) => {
    // Suporte e cabo.
    px(ctx, 15, 22, IRON.o, 3, 6); px(ctx, 16, 22, IRON.m, 1, 5);
    px(ctx, 13, 19, IRON.o, 7, 4); px(ctx, 14, 20, IRON.l, 5, 1);
    px(ctx, 15, 14, WOOD.o, 3, 6); px(ctx, 16, 14, WOOD.l, 1, 5);
    // Chama em gota, balançando de lado a lado.
    const sway = [0, 1, 0, -1][f];
    const tall = [9, 10, 8, 10][f];
    for (let i = 0; i < tall; i++) {
      const y = 13 - i;
      const w = Math.max(1, Math.round(3.4 * Math.sin(((i + 1) / (tall + 1)) * Math.PI) + (i < 2 ? 1 : 0)));
      const x = 16 + Math.round(sway * (i / tall)) - Math.floor(w / 2);
      px(ctx, x - 1, y, "#b8320f", w + 2, 1);
      px(ctx, x, y, i > tall - 3 ? "#ff8a1c" : "#ffb02e", w, 1);
      if (i < tall - 3 && w > 1) px(ctx, x + Math.floor(w / 2), y, "#fff2a8");
    }
    px(ctx, 15 + sway, 3 + (f % 2), "#ffcf5a");
  }));
}

// --- Móveis e restos de pé (sprites ordenados como os personagens) ---------------------

function barrelAt(ctx: Ctx, cx: number, top: number, w: number, h: number) {
  const x0 = cx - w / 2;
  px(ctx, x0, top + h, "#00000045", w + 2, 2);
  px(ctx, x0 - 1, top + 2, WOOD.o, w + 2, h - 2);
  for (let x = 0; x < w; x++) {
    const bulge = Math.round(Math.sin((x / (w - 1)) * Math.PI) * 1);
    px(ctx, x0 + x, top + 2 - bulge, x < 3 ? WOOD.l : x > w - 4 ? WOOD.d : WOOD.m, 1, h - 3 + bulge * 2);
    if (x % 4 === 3) px(ctx, x0 + x, top + 3, WOOD.d, 1, h - 5);
  }
  for (const y of [top + 4, top + h - 4]) { px(ctx, x0, y, IRON.d, w, 2); px(ctx, x0, y, IRON.l, w, 1); }
  blob(ctx, cx, top + 1.5, w / 2, 2, { o: WOOD.o, m: "#8a5a32", l: "#a87444", d: "#5e3c1c" });
}

function barrel(ctx: Ctx) { barrelAt(ctx, 16, 10, 14, 19); }

function barrels(ctx: Ctx) {
  barrelAt(ctx, 11, 14, 11, 15);
  barrelAt(ctx, 22, 12, 11, 17);
}

function crate(ctx: Ctx) {
  px(ctx, 7, 29, "#00000045", 20, 2);
  px(ctx, 7, 11, WOOD.o, 19, 19);
  px(ctx, 8, 12, "#a87444", 17, 4);
  px(ctx, 8, 16, WOOD.m, 17, 13);
  for (const y of [20, 24]) px(ctx, 8, y, WOOD.d, 17, 1);
  line(ctx, 9, 17, 23, 27, WOOD.l);
  line(ctx, 9, 18, 23, 28, WOOD.d);
  px(ctx, 8, 16, WOOD.d, 17, 1);
  for (const [x, y] of [[9, 17], [23, 17], [9, 27], [23, 27]]) px(ctx, x, y, IRON.l);
}

function urnAt(ctx: Ctx, broken: boolean) {
  px(ctx, 9, 29, "#00000045", 15, 2);
  if (!broken) {
    px(ctx, 13, 6, CLAY.o, 7, 3); px(ctx, 14, 7, CLAY.l, 5, 1);
    px(ctx, 14, 9, CLAY.o, 5, 4); px(ctx, 15, 9, CLAY.m, 3, 4);
  }
  blob(ctx, 16, 20, 7, 8, CLAY, broken ? (_, y) => y < 18 + Math.abs(Math.sin(_ * 1.7)) * 3 : undefined);
  px(ctx, 11, 22, CLAY.o, 11, 1);
  for (let x = 12; x < 21; x += 3) px(ctx, x, 23, "#e0b07a");
  px(ctx, 13, 28, CLAY.o, 7, 2); px(ctx, 14, 28, CLAY.d, 5, 1);
  if (broken) shards(ctx);
}

function candelabra(ctx: Ctx) {
  px(ctx, 11, 29, "#00000045", 11, 2);
  px(ctx, 12, 27, IRON.o, 9, 3); px(ctx, 13, 27, IRON.l, 7, 1);
  px(ctx, 15, 14, IRON.o, 3, 14); px(ctx, 16, 14, IRON.l, 1, 13);
  line(ctx, 9, 13, 23, 13, IRON.o); line(ctx, 9, 14, 23, 14, IRON.m);
  for (const x of [9, 16, 23]) {
    px(ctx, x - 1, 8, "#8a7f68", 3, 6);
    px(ctx, x - 1, 8, "#ece4cc", 2, 5);
    px(ctx, x, 4, "#b8320f", 1, 4);
    px(ctx, x, 5, "#ffb02e", 1, 2);
    px(ctx, x, 6, "#fff2a8");
  }
}

function bonePile(ctx: Ctx) {
  px(ctx, 6, 28, "#00000045", 21, 2);
  boneAt(ctx, 6, 26, 16, 22);
  boneAt(ctx, 13, 27, 25, 24);
  boneAt(ctx, 9, 21, 22, 25);
  boneAt(ctx, 18, 19, 25, 27);
  skullAt(ctx, 15, 18);
}

function coffin(ctx: Ctx) {
  const shape = (y: number) => (y < 11 ? 4 + (y - 4) : y < 13 ? 11 : 11 - Math.floor((y - 12) / 3));
  px(ctx, 9, 30, "#00000045", 15, 2);
  for (let y = 4; y < 30; y++) {
    const half = Math.min(8, shape(y));
    px(ctx, 16 - half, y, WOOD.o, half * 2, 1);
    if (y > 4 && y < 29) {
      px(ctx, 17 - half, y, y < 8 ? "#9c6a3c" : WOOD.m, half * 2 - 2, 1);
      px(ctx, 17 - half, y, WOOD.l);
    }
  }
  px(ctx, 15, 9, "#c9b07a", 2, 13);
  px(ctx, 12, 13, "#c9b07a", 8, 2);
}

function sack(ctx: Ctx) {
  px(ctx, 9, 29, "#00000045", 15, 2);
  blob(ctx, 16, 21, 7.5, 8, { o: "#3a2c18", m: "#b89a6a", l: "#d4b886", d: "#8a7048" });
  px(ctx, 14, 11, "#3a2c18", 5, 3); px(ctx, 15, 11, "#d4b886", 3, 1);
  px(ctx, 13, 14, "#6b4526", 7, 1);
}

/** Móveis e restos de pé: perto das paredes das salas. */
export const CRYPT_TALL = {
  barrel: 0, barrels: 1, crate: 2, urn: 3, brokenUrn: 4, candelabra: 5, bonePile: 6, coffin: 7, sack: 8,
} as const;

export function cryptTallStrip() {
  return strip([barrel, barrels, crate, (ctx) => urnAt(ctx, false), (ctx) => urnAt(ctx, true), candelabra, bonePile, coffin, sack]);
}

// --- Luz e poeira ---------------------------------------------------------------------

/** Poça de luz quente das chamas: círculo em degraus de 4 px (luz em pixel art, sem degradê liso). */
export function lightCanvas() {
  const w = 128;
  const h = 96;
  const { canvas, ctx } = makeCanvas(w, h);
  const levels = [0.36, 0.26, 0.18, 0.11, 0.05];
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const d = Math.hypot((x + 2 - w / 2) / (w / 2), (y + 2 - h / 2) / (h / 2));
      const level = Math.floor(d * levels.length);
      if (level >= levels.length) continue;
      px(ctx, x, y, `rgba(255,164,72,${levels[level]})`, 4, 4);
    }
  }
  return canvas;
}

/** Grão de poeira flutuando na luz (3×3). */
export function dustCanvas() {
  const { canvas, ctx } = makeCanvas(3, 3);
  px(ctx, 1, 0, "rgba(255,228,180,0.35)", 1, 3);
  px(ctx, 0, 1, "rgba(255,228,180,0.35)", 3, 1);
  px(ctx, 1, 1, "#fff0d0");
  return canvas;
}
