import { ramp, rgb, type Rgb } from "./hero/color.ts";
import { FLAT, HD, OPEN, Paper, ellipse, limb, line, lit, noise, poly, smoothNoise, sn, sphere, type Pt } from "./duneArt.ts";
import { worley as worleyAt } from "./marshDecor.ts";

/**
 * Arte dos Portões do Império (Ruínas do Império), no padrão novo (`docs/ARTE_TIBIA.md`), como a das Dunas: **128 px por
 * tile**, luz de cima à esquerda, rampas de 6 tons por material, contorno quase preto nos objetos de pé e nenhum no chão.
 * Pintada por código, pixel a pixel, sem `Math.random` (o mesmo desenho em todo aparelho), com o papel (`Paper`) das
 * Dunas e uma paleta própria: o verde-oliva do campo mediterrâneo, o basalto azulado das vias, o travertino creme das
 * praças, o mármore do templo, o tufo dourado e o tijolo dos muros, o bronze esverdeado das estátuas. Embaixo, a pedra
 * escura das catacumbas, a luz das tochas e o mosaico do santuário.
 *
 * Os calçamentos (via, praça, mármore e as lajes de baixo) fecham a cada 2×2 tiles: o tile (x, y) usa o pedaço
 * (x mod 2, y mod 2), então emendam sem costura. Os enfeites de pé e os monumentos ficam em `empireMonuments.ts`.
 */

/** Materiais da paleta do império (cada um vira uma rampa de 6 tons). */
export enum E {
  Grass, Dry, Dirt, Clover, Poppy, Daisy,
  Basalt, Travertine, Marble, Vein, Porphyry, Mortar,
  Tuff, Brick, Plaster, Moss, Ivy, Leaf, Pine, Bark, Bush,
  Water, Deep, Foam,
  Bronze, Patina, Gold, Fire, Iron, Void, Glow,
  Slab, Wall, Bone, Lapis, Terracotta, Cloth, Line,
}

/** Cor base, contraste, desvio de matiz por tom e brilho no tom de cima. */
const BASES: Record<E, [string, number, number?, boolean?]> = {
  [E.Grass]: ["#78913f", 0.62, 3], [E.Dry]: ["#a39a58", 0.6, 4], [E.Dirt]: ["#8f7350", 0.75, 6],
  [E.Clover]: ["#628a3a", 0.7, 4], [E.Poppy]: ["#c8402a", 0.9, 6], [E.Daisy]: ["#ece6c8", 0.5, 4],
  [E.Basalt]: ["#727982", 0.8, 5], [E.Travertine]: ["#d2c09a", 0.62, 5], [E.Marble]: ["#e2dccb", 0.55, 4],
  [E.Vein]: ["#a8a49c", 0.7, 4], [E.Porphyry]: ["#8a3a36", 0.85, 6], [E.Mortar]: ["#5e5444", 0.6, 4],
  [E.Tuff]: ["#c4a876", 0.8, 6], [E.Brick]: ["#a85a3a", 0.85, 6], [E.Plaster]: ["#b04a34", 0.8, 6],
  [E.Moss]: ["#6c8a34", 0.85, 8], [E.Ivy]: ["#3f6e2c", 0.95, 9], [E.Leaf]: ["#3a5e3a", 0.95, 9],
  [E.Pine]: ["#4e7038", 0.95, 9], [E.Bark]: ["#7a5a40", 0.9, 6], [E.Bush]: ["#55783a", 0.95, 9],
  [E.Water]: ["#3f97a0", 0.85, 8], [E.Deep]: ["#24607a", 0.85, 8], [E.Foam]: ["#e8f2ea", 0.35, 4],
  [E.Bronze]: ["#5e9a84", 0.95, 8], [E.Patina]: ["#7cc0a4", 0.7, 6], [E.Gold]: ["#d8a838", 1.05, 8, true],
  [E.Fire]: ["#f08a26", 1.1, 10, true], [E.Iron]: ["#4a4644", 0.9, 4], [E.Void]: ["#1c1614", 0.35, 3],
  [E.Glow]: ["#9a6ae0", 1.1, 10, true],
  [E.Slab]: ["#6e665c", 0.8, 5], [E.Wall]: ["#7a6e5e", 0.85, 5], [E.Bone]: ["#ddd2b4", 0.75, 5],
  [E.Lapis]: ["#3a5a9a", 0.9, 7], [E.Terracotta]: ["#b8683c", 0.85, 6], [E.Cloth]: ["#9a2a2a", 0.9, 6],
  [E.Line]: ["#2a2018", 0.4, 0],
};

let tones: Rgb[][] | null = null;
/** As rampas de todos os materiais, montadas uma vez. */
export function empireRamps(): Rgb[][] {
  if (!tones) {
    tones = Object.values(E).filter((v): v is E => typeof v === "number")
      .map((m) => { const [hex, contrast, shift = 6, shine = false] = BASES[m]; return ramp(hex, { contrast, shift, shine }).map(rgb); });
  }
  return tones;
}

/** Paleta trocada durante `inPalette` (o Pântano das Ruínas pinta as ruínas do império na paleta dele). */
let override: Rgb[][] | null = null;

/** Papel na paleta do império (ou na de `inPalette`). */
export const paper = (w = HD, h = HD) => new Paper(override ?? empireRamps(), w, h);

/**
 * Pinta `draw` com outra paleta (rampas na ordem de `E`): as mesmas peças do império em outro mapa. Não use com peça
 * guardada em cache (o capim e a moita dos Portões), que voltaria com a paleta de quando foi guardada.
 */
export function inPalette<T>(ramps: Rgb[][], draw: () => T): T {
  const outer = override;
  override = ramps;
  try { return draw(); } finally { override = outer; }
}

/** Rampas na ordem de `E` a partir das cores base do império com algumas trocadas. */
export function empireRampsWith(changes: Partial<Record<E, [string, number, number?, boolean?]>>): Rgb[][] {
  return Object.values(E).filter((v): v is E => typeof v === "number")
    .map((m) => { const [hex, contrast, shift = 6, shine = false] = changes[m] ?? BASES[m]; return ramp(hex, { contrast, shift, shine }).map(rgb); });
}

const mod = (v: number, n: number) => ((v % n) + n) % n;
const BAYER = [0, 0.5, 0.75, 0.25];
/** Período dos calçamentos (2×2 tiles). */
const PP = HD * 2;
/** Quarto do calçamento usado pelo tile (x, y). */
export const quarter = (x: number, y: number) => mod(x, 2) + 2 * mod(y, 2);
const wide = new Map<number, Float32Array>();
/** Ruído suave periódico no calçamento de 2×2 tiles (tabela por célula e semente). */
function pn(x: number, y: number, cell: number, seed: number) {
  const key = cell * 1_000_003 + seed;
  let t = wide.get(key);
  if (!t) {
    t = new Float32Array(PP * PP);
    for (let j = 0; j < PP; j++) for (let i = 0; i < PP; i++) t[j * PP + i] = smoothNoise(i, j, cell, seed, PP);
    wide.set(key, t);
  }
  return t[mod(Math.floor(y), PP) * PP + mod(Math.floor(x), PP)];
}

const cells = new Map<string, { d1: Float32Array; d2: Float32Array; dx: Float32Array; dy: Float32Array; id: Int32Array }>();
/**
 * Ruído celular (`worley` do Pântano) num período inteiro, calculado uma vez por (célula, período, semente) e lido por
 * pixel: as pedras da via e os tufos das moitas usam o mesmo desenho em vários quadros, e o cálculo é o que mais pesa.
 */
export function worley(x: number, y: number, cell: number, period: number, seed: number) {
  const key = `${cell}:${period}:${seed}`;
  let t = cells.get(key);
  if (!t) {
    const n = period * period;
    t = { d1: new Float32Array(n), d2: new Float32Array(n), dx: new Float32Array(n), dy: new Float32Array(n), id: new Int32Array(n) };
    for (let j = 0; j < period; j++)
      for (let i = 0; i < period; i++) {
        const c = worleyAt(i + 0.5, j + 0.5, cell, period, seed);
        const k = j * period + i;
        t.d1[k] = c.d1; t.d2[k] = c.d2; t.dx[k] = c.dx; t.dy[k] = c.dy; t.id[k] = c.id;
      }
    cells.set(key, t);
  }
  const k = mod(Math.floor(y), period) * period + mod(Math.floor(x), period);
  return { d1: t.d1[k], d2: t.d2[k], dx: t.dx[k], dy: t.dy[k], id: t.id[k] };
}

/** Pinta um pixel do papel com quebra na borda (para texturas que emendam). */
function wrapOn(p: Paper, x: number, y: number, mat: number | null, tone: number) {
  p.on(mod(Math.round(x), HD), mod(Math.round(y), HD), mat, tone);
}

// --- Capim ------------------------------------------------------------------------------------

/**
 * Campo mediterrâneo: capim verde-oliva com tom variando em manchas, tufos de folhinhas (abertos em leque, escuros no
 * pé e claros na ponta), manchinhas de capim seco e de trevo e, em algumas variações, papoulas e margaridas em grupos.
 * Tudo embrulha na borda do tile. Guardado por variação (as moitas pintam por cima de uma cópia).
 */
export function grassTile(v: number): Paper {
  const cached = grassCache.get(v);
  if (cached) return clonePaper(cached);
  const p = paper();
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Grass, (x, y) => FLAT - 0.02 + (sn(x, y, 32, 200 + (v % 2)) - 0.5) * 0.2 + (sn(x, y, 8, 201 + v) - 0.5) * 0.12,
    (x, y) => (noise(x, y, 202 + v) < 0.04 ? -1 : 0));
  // Manchinhas de capim seco e de trevo, pequenas e de beira pontilhada.
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      const dry = sn(x, y, 16, 203 + v) + (noise(x, y, 204) - 0.5) * 0.12;
      if (v % 3 !== 0 && dry > 0.74) { p.mat[i] = E.Dry; p.off[i] = noise(x, y, 205) < 0.25 ? -1 : 0; }
      else if (sn(x, y, 16, 206 + v) < 0.2 - (noise(x, y, 207) * 0.08)) p.mat[i] = E.Clover;
    }
  // Tufos de capim: 5 a 9 folhinhas abertas em leque a partir do pé.
  const tufts = 46 + (v % 3) * 8;
  for (let k = 0; k < tufts; k++) {
    const bx = noise(k, v, 208) * HD, by = noise(v, k, 209) * HD;
    const i0 = mod(Math.round(by), HD) * HD + mod(Math.round(bx), HD);
    const mat = noise(k, v, 210) < 0.05 ? E.Dry : p.mat[i0];
    const n = 5 + Math.floor(noise(k, k + v, 211) * 5);
    for (let b = 0; b < n; b++) {
      const lean = (b - (n - 1) / 2) * 0.45 + (noise(k, b, 212) - 0.5) * 0.4;
      const len = 4 + Math.floor(noise(b, k, 213) * 5);
      for (let s = 0; s < len; s++) {
        const tone = s === 0 ? 1 : s === 1 ? 2 : s < len - 1 ? 3 : 4;
        wrapOn(p, bx + lean * s * 0.8, by - s, mat, tone);
      }
    }
  }
  // Pedrinhas e terra à mostra.
  for (let k = 0; k < 5; k++) {
    const x = noise(k, v, 215) * HD, y = noise(v, k, 216) * HD;
    if (k >= 2) { wrapOn(p, x, y, E.Vein, 4); wrapOn(p, x + 1, y, E.Vein, 3); wrapOn(p, x, y + 1, E.Vein, 1); wrapOn(p, x + 1, y + 1, E.Vein, 2); }
  }
  // Flores em grupos (variações 3 e 5: papoulas; 4: margaridas).
  if (v === 3 || v === 4 || v === 5) {
    const cx = 30 + noise(v, 1, 217) * 68, cy = 30 + noise(v, 2, 218) * 68;
    for (let k = 0; k < 16; k++) {
      const a = noise(k, v, 219) * Math.PI * 2, r = noise(v, k, 220) * 28;
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.8);
      const mat = v === 4 ? E.Daisy : E.Poppy;
      wrapOn(p, x, y + 2, E.Clover, 1); wrapOn(p, x, y + 1, E.Clover, 2);
      wrapOn(p, x, y, mat, 4); wrapOn(p, x - 1, y, mat, 3); wrapOn(p, x + 1, y, mat, 3); wrapOn(p, x, y - 1, mat, 5);
      wrapOn(p, x, y, v === 4 ? E.Gold : E.Line, v === 4 ? 4 : 1);
    }
  }
  grassCache.set(v, p);
  return clonePaper(p);
}

const grassCache = new Map<number, Paper>();

/** Cópia do papel (para pintar por cima de um quadro guardado). */
function clonePaper(src: Paper): Paper {
  const p = new Paper(empireRamps(), src.w, src.h);
  p.mat.set(src.mat); p.shade.set(src.shade); p.off.set(src.off); p.fixed.set(src.fixed); p.part.set(src.part);
  return p;
}

// --- Calçamentos (período de 2×2 tiles) ------------------------------------------------------

/**
 * Via romana de basalto: pedras poligonais grandes e abauladas (cada uma com o seu tom), lisas de tanto uso, com terra
 * e capim nas juntas, mais capim onde a via está largada, e lascas claras de casco de cavalo.
 */
export function basaltTile(q: number): Paper {
  const p = paper();
  const ox = (q % 2) * HD, oy = (q >> 1) * HD;
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Basalt, (x, y) => {
    const c = worley(x + ox, y + oy, 32, PP, 300);
    const r = 14;
    const nx = Math.max(-1, Math.min(1, c.dx / r)), ny = Math.max(-1, Math.min(1, c.dy / r));
    return FLAT + (lit(nx * 0.55, ny * 0.55, 1) - FLAT) * 0.9 + (hash01(c.id, 301) - 0.5) * 0.2;
  }, (x, y) => {
    const gx = x + ox, gy = y + oy;
    const c = worley(gx, gy, 32, PP, 300);
    const gap = c.d2 - c.d1;
    if (gap < 2.4) return -2;
    if (gap < 3.6) return -1;
    const n = noise(gx, gy, 302);
    return n < 0.02 ? -1 : n > 0.988 ? 1 : 0;
  });
  // Juntas: terra e capim (mais capim onde o ruído grande diz que a via está largada).
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const gx = x + ox, gy = y + oy;
      const c = worley(gx, gy, 32, PP, 300);
      const wild = pn(gx, gy, 64, 303);
      const gap = c.d2 - c.d1;
      const joint = 2.2 + (wild > 0.6 ? 1.6 : 0);
      if (gap >= joint) continue;
      const i = y * HD + x;
      const grassy = wild > 0.5 && noise(gx >> 1, gy >> 1, 304) < 0.75;
      p.mat[i] = grassy ? (noise(gx, gy, 305) < 0.4 ? E.Clover : E.Grass) : E.Dirt;
      p.fixed[i] = grassy ? (noise(gx, gy, 306) < 0.5 ? 2 : 3) : noise(gx, gy, 307) < 0.5 ? 1 : 2;
    }
  // Lascas e brilho do polimento no alto das pedras.
  for (let k = 0; k < 20; k++) {
    const x = noise(k, q, 308) * HD, y = noise(q, k, 309) * HD;
    const c = worley(x + ox, y + oy, 32, PP, 300);
    if (c.d2 - c.d1 < 5) continue;
    p.on(x, y, null, 5); p.on(x + 1, y, null, 4);
  }
  return p;
}

/**
 * Praça de travertino: lajes retangulares em fiadas desencontradas (cada laje com o seu tom), com os furinhos do
 * travertino deitados, bisel claro em cima e escuro embaixo, rachaduras e algumas lajes faltando (terra e capim).
 */
export function travertineTile(q: number): Paper {
  const p = paper();
  const ox = (q % 2) * HD, oy = (q >> 1) * HD;
  const ROW = 42;
  /** Laje do pixel (global): fiada, índice, começo e fim. */
  const slab = (gx: number, gy: number) => {
    const row = Math.floor(gy / ROW);
    const start = hash01(row, 320) * PP;
    let x = start, k = 0;
    const rel = mod(gx - start, PP);
    let at = 0;
    while (at + slabW(row, k) <= rel && k < 40) { at += slabW(row, k); k++; }
    const w = Math.min(slabW(row, k), PP - at);
    x = start + at;
    return { row, k, x0: x, x1: x + w, y0: row * ROW, y1: row * ROW + ROW };
  };
  const slabW = (row: number, k: number) => 52 + Math.floor(hash01(row * 41 + k, 321) * 5) * 16;
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Travertine, () => FLAT, () => 0);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const gx = x + ox, gy = y + oy;
      const s = slab(gx, gy);
      const i = y * HD + x;
      const lx = mod(gx - s.x0, PP), ly = gy - s.y0, w = s.x1 - s.x0;
      const id = s.row * 97 + s.k;
      const missing = hash01(id * 3 + 1, 322) < 0.035;
      if (lx < 2 || ly < 2) { p.mat[i] = E.Mortar; p.fixed[i] = noise(gx, gy, 323) < 0.4 ? 1 : 2; continue; }
      if (missing) {
        p.mat[i] = pn(gx, gy, 16, 324) > 0.5 ? E.Grass : E.Dirt;
        p.shade[i] = FLAT - 0.08 + (noise(gx, gy, 325) - 0.5) * 0.15;
        if (ly < 5 || lx < 5) p.fixed[i] = 1;
        continue;
      }
      p.shade[i] = FLAT + (hash01(id, 326) - 0.5) * 0.12 + (pn(gx, gy, 64, 327) - 0.5) * 0.12 + (pn(gx, gy, 16, 328) - 0.5) * 0.05;
      if (ly === 2 || lx === 2) p.off[i] = 1;
      else if (ly === ROW - 1 || lx === w - 1) p.off[i] = -1;
      // Furinhos do travertino: tracinhos deitados escuros, com a beira de baixo clara.
      const h = noise(gx >> 2, gy, 328);
      if (h < 0.02 && noise(gx, gy, 329) < 0.8) { p.fixed[i] = 2; if (y + 1 < HD) p.off[i + HD] = 1; }
    }
  // Rachaduras dentro das lajes.
  for (let k = 0; k < 3; k++) {
    let x = 10 + noise(k, q, 330) * 108, y = 10 + noise(q, k, 331) * 108, a = noise(k, k + q, 332) * Math.PI * 2;
    for (let s = 0; s < 12; s++) {
      a += (noise(s, k + q * 5, 333) - 0.5) * 1.2;
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3;
      if (nx < 4 || ny < 4 || nx > HD - 4 || ny > HD - 4) break;
      line(p, [x, y], [nx, ny], null, 1);
      x = nx; y = ny;
    }
  }
  // Capim brotando nas juntas, em alguns lugares.
  for (let k = 0; k < 40; k++) {
    const x = noise(k, q, 334) * HD, y = noise(q, k, 335) * HD;
    const i = Math.floor(y) * HD + Math.floor(x);
    if (p.mat[i] !== E.Mortar || pn(x + ox, y + oy, 64, 336) < 0.45) continue;
    for (let s = 0; s < 4; s++) wrapOn(p, x + (s > 2 ? 1 : 0), y - s, E.Grass, s === 0 ? 1 : s === 3 ? 4 : 3);
  }
  return p;
}

/**
 * Pátio do templo: mármore em quadros de 64 px, branco veiado e cinza alternados, com um losango de pórfiro vermelho em
 * alguns (opus sectile), juntas finas, rachaduras e musgo nas juntas.
 */
export function marbleTile(q: number): Paper {
  const p = paper();
  const ox = (q % 2) * HD, oy = (q >> 1) * HD;
  const S = 64;
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Marble, () => FLAT, () => 0);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const gx = x + ox, gy = y + oy;
      const cx = Math.floor(gx / S), cy = Math.floor(gy / S);
      const lx = gx - cx * S, ly = gy - cy * S;
      const i = y * HD + x;
      const dark = (cx + cy) % 2 === 1;
      const id = mod(cy, 4) * 4 + mod(cx, 4);
      if (lx < 2 || ly < 2) {
        const mossy = pn(gx, gy, 32, 340) > 0.6;
        p.mat[i] = mossy ? E.Moss : E.Mortar;
        p.fixed[i] = mossy ? 2 : 1;
        continue;
      }
      p.mat[i] = E.Marble;
      p.shade[i] = FLAT + (dark ? -0.12 : 0.02) + (hash01(id, 341) - 0.5) * 0.08 + (pn(gx, gy, 32, 342) - 0.5) * 0.1;
      if (lx === 2 || ly === 2) p.off[i] = 1;
      if (lx === S - 1 || ly === S - 1) p.off[i] = -1;
      // Veios: linhas onduladas finas.
      const vein = Math.sin((gx + gy * 0.6) / 9 + pn(gx, gy, 32, 343) * 7);
      if (Math.abs(vein) < 0.05 && noise(gx >> 1, gy >> 1, 344) < 0.7) p.off[i] = dark ? 1 : -1;
      // Losango de pórfiro no quadro branco (um sim, um não).
      if (!dark && hash01(id, 345) < 0.25) {
        const d = Math.abs(lx - S / 2) + Math.abs(ly - S / 2);
        if (d < 14) {
          p.mat[i] = d < 11 ? E.Porphyry : E.Vein;
          p.off[i] = d < 11 ? (lx + ly < S ? 0 : -1) : 0;
          if (d >= 11) p.fixed[i] = 2;
          if (d < 11 && noise(gx, gy, 346) < 0.06) p.off[i] = 1;
        }
      }
    }
  for (let k = 0; k < 2; k++) {
    let x = 12 + noise(k, q, 347) * 104, y = 12 + noise(q, k, 348) * 104, a = noise(k + 1, q, 349) * Math.PI * 2;
    for (let s = 0; s < 14; s++) {
      a += (noise(s, k + q * 3, 350) - 0.5) * 1.1;
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3;
      if (nx < 4 || ny < 4 || nx > HD - 4 || ny > HD - 4) break;
      line(p, [x, y], [nx, ny], null, 1);
      line(p, [x + 1, y], [nx + 1, ny], null, 4);
      x = nx; y = ny;
    }
  }
  return p;
}

/**
 * Chão das catacumbas: lajes de pedra escura em fiadas de 64 px desencontradas, gastas no meio, com pó claro, rachaduras
 * e cascalho. `kind` 1: o santuário (lajes mais largas e avermelhadas); 2: o tesouro (pó dourado nas juntas).
 */
export function cryptFloorTile(q: number, kind: 0 | 1 | 2): Paper {
  const p = paper();
  const ox = (q % 2) * HD, oy = (q >> 1) * HD;
  const ROW = kind === 1 ? 64 : 64;
  const COL = kind === 1 ? 64 : 85;
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Slab, () => FLAT, () => 0);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const gx = x + ox, gy = y + oy;
      const row = Math.floor(gy / ROW);
      const shift = (row % 2) * (COL / 2);
      const col = Math.floor(mod(gx + shift, PP) / COL);
      const lx = mod(gx + shift, PP) - col * COL, ly = gy - row * ROW;
      const i = y * HD + x;
      const id = row * 13 + col;
      if (lx < 2 || ly < 2) {
        p.mat[i] = kind === 2 && noise(gx, gy, 360) < 0.5 ? E.Gold : E.Void;
        p.fixed[i] = kind === 2 ? 2 : 3;
        continue;
      }
      p.mat[i] = E.Slab;
      const wear = pn(gx, gy, 32, 362);
      p.shade[i] = (kind === 1 ? 0.44 : 0.5) + (hash01(id * 3 + 1, 363) - 0.5) * 0.2 + (wear - 0.5) * 0.16;
      if (kind === 1 && hash01(id, 361) < 0.35) p.off[i] = -1;
      // Laje afundada: mais escura, com a beira de cima em sombra.
      if (hash01(id * 5 + 2, 371) < 0.08) { p.off[i] -= 1; if (ly < 5) p.off[i] -= 1; }
      if (lx === 2 || ly === 2) p.off[i] = 1;
      if (lx === COL - 1 || ly === ROW - 1) p.off[i] = -1;
      const n = noise(gx, gy, 364);
      if (n < 0.03) p.off[i] = -1;
      else if (n > 0.985) p.off[i] = 1;
    }
  // Pó claro acumulado e cascalho.
  for (let k = 0; k < 14; k++) {
    const x = noise(k, q, 365) * HD, y = noise(q, k, 366) * HD;
    wrapOn(p, x, y, E.Bone, 2); wrapOn(p, x + 1, y, E.Slab, 4); wrapOn(p, x, y + 1, E.Void, 2);
  }
  for (let k = 0; k < 3; k++) {
    let x = 12 + noise(k, q, 367) * 104, y = 12 + noise(q, k, 368) * 104, a = noise(k + 2, q, 369) * Math.PI * 2;
    for (let s = 0; s < 10; s++) {
      a += (noise(s, k + q * 7, 370) - 0.5) * 1.3;
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3;
      if (nx < 4 || ny < 4 || nx > HD - 4 || ny > HD - 4) break;
      line(p, [x, y], [nx, ny], E.Void, 2);
      x = nx; y = ny;
    }
  }
  return p;
}

// --- Água (fontes e cisternas) ----------------------------------------------------------------

/**
 * Tanque de fonte ou cisterna pelos vizinhos que são terra (bits de `OPEN`): borda de mármore larga onde encosta na
 * terra (a pedra pega luz em cima e faz um degrau escuro para dentro), água clara no raso e mais funda no meio, com
 * a sombra da borda, marolas e o reflexo do céu.
 */
export function poolTile(land: number, v: number): Paper {
  const p = paper();
  const RIM = 16;
  const rim = (x: number, y: number) =>
    (land & OPEN.n && y < RIM) || (land & OPEN.s && y > HD - 1 - RIM) || (land & OPEN.w && x < RIM) || (land & OPEN.e && x > HD - 1 - RIM)
    || (land & OPEN.nw && x < RIM && y < RIM) || (land & OPEN.ne && x > HD - 1 - RIM && y < RIM)
    || (land & OPEN.sw && x < RIM && y > HD - 1 - RIM) || (land & OPEN.se && x > HD - 1 - RIM && y > HD - 1 - RIM);
  const wallDist = (x: number, y: number) => Math.min(
    land & OPEN.n ? y - RIM : 1e9, land & OPEN.s ? HD - 1 - RIM - y : 1e9, land & OPEN.w ? x - RIM : 1e9, land & OPEN.e ? HD - 1 - RIM - x : 1e9,
  );
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Water, (x, y) => {
    const d = Math.min(wallDist(x, y), 40);
    return 0.5 + (d / 40) * 0.12 + (sn(x, y, 32, 380 + v) - 0.5) * 0.06;
  }, (x, y) => {
    const wave = mod(x + Math.floor(y * 1.6) + Math.floor(sn(x, y, 32, 381) * 18), 21);
    return wave === 0 && noise(x >> 2, y, 382) < 0.45 ? 1 : 0;
  });
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      const d = wallDist(x, y);
      if (rim(x, y)) {
        // Borda de mármore: blocos de 32 px com junta, luz em cima, beira escura do lado da água.
        p.mat[i] = E.Marble;
        const along = land & (OPEN.n | OPEN.s) && (y < RIM || y > HD - 1 - RIM) ? x : y;
        p.shade[i] = FLAT + 0.05 + (hash01(Math.floor(along / 32) + v * 7, 383) - 0.5) * 0.1;
        p.off[i] = mod(along, 32) === 0 ? -2 : 0;
        p.fixed[i] = -1;
        const inner = (land & OPEN.n && y === RIM - 1) || (land & OPEN.w && x === RIM - 1);
        const innerLit = (land & OPEN.s && y === HD - RIM) || (land & OPEN.e && x === HD - RIM);
        if (inner) p.fixed[i] = 1;
        if (innerLit) p.fixed[i] = 4;
        if ((land & OPEN.n && y === 0) || (land & OPEN.w && x === 0)) p.fixed[i] = 5;
        if (noise(x, y, 384) < 0.02) p.off[i] = -1;
        continue;
      }
      // Sombra da borda na água (sol do noroeste) e o fundo claro no raso.
      if ((land & OPEN.n && y - RIM < 10) || (land & OPEN.w && x - RIM < 10)) { p.mat[i] = E.Deep; p.shade[i] = 0.45; }
      else if (d > 30) { p.mat[i] = E.Deep; p.shade[i] = 0.55 + (sn(x, y, 32, 385) - 0.5) * 0.1; }
    }
  // Reflexo do céu: riscos de espuma claros.
  for (let k = 0; k < 6; k++) {
    const x = 24 + noise(k, v, 386) * 80, y = 24 + noise(v, k, 387) * 80;
    if (rim(x, y) || rim(x + 8, y)) continue;
    for (let s = 0; s < 6 + (k % 3) * 2; s++) p.on(x + s, y, E.Foam, s % 4 === 3 ? 3 : 4);
  }
  return p;
}

// --- Mata (moitas, na superfície) ----------------------------------------------------------

/** Copa de moita de um tile inteiro (sem beira), guardada por variação. */
function canopy(v: number): Paper {
  let c = canopyCache.get(v);
  if (c) return c;
  c = paper();
  const seed = 390 + v;
  const mats = [E.Bush, E.Leaf, E.Bush, E.Pine];
  c.fill([0, 0, HD - 1, HD - 1], () => true, E.Bush, (x, y) => {
    const w = worley(x, y, 22, HD, seed);
    const r = 13;
    const nx = Math.max(-1, Math.min(1, w.dx / r)), ny = Math.max(-1, Math.min(1, w.dy / r));
    return lit(nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny))) * 0.95 + (hash01(w.id, 391) - 0.5) * 0.12 + (sn(x, y, 8, seed) - 0.5) * 0.18;
  }, () => 0);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      const w = worley(x, y, 22, HD, seed);
      const gap = w.d2 - w.d1;
      c.mat[i] = mats[Math.floor(hash01(w.id, 393) * mats.length)];
      if (gap < 1.8) c.off[i] = -2;
      else if (gap < 3.2 && w.dx + w.dy > 0) c.off[i] = -1;
      // Folhinhas: pontos claros do lado do sol de cada tufo e furinhos escuros.
      const n = noise(x, y, 394 + v);
      if (n < 0.05 && w.dx + w.dy < -4) c.off[i] = 1;
      else if (n > 0.96) c.off[i] = -1;
    }
  canopyCache.set(v, c);
  return c;
}
const canopyCache = new Map<number, Paper>();

/**
 * Moita fechada pelos vizinhos abertos: tufos de folha grandes e abaulados (cada um com luz de esfera e o seu verde),
 * a beira irregular onde encosta no chão (o capim aparece embaixo, com a sombra da moita no lado sul) e o contorno
 * escuro por dentro da beira.
 */
export function bushTile(open: number, v: number): Paper {
  const p = grassTile(v % 3);
  const [wn, ws, ww, we] = BUSH_WOB;
  const inMask = new Uint8Array(HD * HD);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const cut = (open & OPEN.n && y < wn[x]) || (open & OPEN.s && HD - 1 - y < ws[x] + 6) || (open & OPEN.w && x < ww[y]) || (open & OPEN.e && HD - 1 - x < we[y])
        || (open & OPEN.nw && x * x + y * y < 324) || (open & OPEN.ne && (HD - 1 - x) ** 2 + y * y < 324)
        || (open & OPEN.sw && x * x + (HD - 1 - y) ** 2 < 484) || (open & OPEN.se && (HD - 1 - x) ** 2 + (HD - 1 - y) ** 2 < 484);
      inMask[y * HD + x] = cut ? 0 : 1;
    }
  const c = canopy(v % 2);
  for (let i = 0; i < HD * HD; i++) {
    if (inMask[i]) {
      p.mat[i] = c.mat[i]; p.shade[i] = c.shade[i]; p.off[i] = c.off[i]; p.fixed[i] = -1;
      continue;
    }
    // Sombra da moita no capim, na beira sul e na leste.
    const x = i % HD, y = (i - x) / HD;
    if ((open & OPEN.s && HD - 1 - y < ws[x] + 6 && HD - 1 - y > ws[x] - 8) || (open & OPEN.e && HD - 1 - x < we[y] && HD - 1 - x > we[y] - 9)) p.off[i] -= 1;
  }
  // Beira das folhas: contorno escuro por dentro, onde encosta no chão; luz logo atrás da beira de cima à esquerda.
  const outAt = (x: number, y: number) => x >= 0 && y >= 0 && x < HD && y < HD && !inMask[y * HD + x];
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!inMask[y * HD + x]) continue;
      if (outAt(x + 1, y) || outAt(x, y + 1) || outAt(x - 1, y) || outAt(x, y - 1)) p.on(x, y, null, 0);
      else if (outAt(x - 2, y) || outAt(x, y - 2)) p.on(x, y, null, 4);
    }
  return p;
}

/** Ondulação da beira das moitas nos 4 lados (norte, sul, oeste, leste), por coordenada ao longo do lado. */
const BUSH_WOB = [1, 2, 3, 4].map((seed) => Float32Array.from({ length: HD }, (_, t) =>
  12 + 7 * Math.sin((2 * Math.PI * t) / HD * 2 + seed) + 4 * Math.sin((6 * Math.PI * t) / HD + seed * 2)));

// --- Bordas (por cima do chão, com transparência) --------------------------------------------

/**
 * Capim entrando no calçamento pelos vizinhos de capim (bits de `OPEN`): beira ondulada com folhinhas saindo dela. A
 * onda vale o mesmo nas duas pontas de cada lado, então a borda segue de um tile para o outro.
 */
export function fringeEdge(grass: number): Paper {
  const p = paper();
  const depth = (t: number, seed: number) => 10 + 6 * Math.sin((2 * Math.PI * t) / HD * 2 + seed) + 3 * Math.sin((6 * Math.PI * t) / HD + seed);
  const inside = (x: number, y: number): boolean => Boolean(
    (grass & OPEN.n && y < depth(x, 1)) || (grass & OPEN.s && HD - 1 - y < depth(x, 2))
    || (grass & OPEN.w && x < depth(y, 3)) || (grass & OPEN.e && HD - 1 - x < depth(y, 4))
    || (grass & OPEN.nw && Math.hypot(x, y) < 14) || (grass & OPEN.ne && Math.hypot(HD - 1 - x, y) < 14)
    || (grass & OPEN.sw && Math.hypot(x, HD - 1 - y) < 14) || (grass & OPEN.se && Math.hypot(HD - 1 - x, HD - 1 - y) < 14));
  p.fill([0, 0, HD - 1, HD - 1], inside, E.Grass, (x, y) => FLAT + (sn(x, y, 32, 200) - 0.5) * 0.22,
    (x, y) => (noise(x, y, 400) < 0.05 ? -1 : 0));
  // Folhinhas saindo da beira para dentro do calçamento.
  for (let k = 0; k < 90; k++) {
    const x = Math.floor(noise(k, 1, 401) * HD), y = Math.floor(noise(1, k, 402) * HD);
    if (!inside(x, y)) continue;
    for (let s = 0; s < 5; s++) {
      if (y - s < 0) break;
      p.px(x + (s > 3 ? 1 : 0), y - s, E.Grass, s === 0 ? 2 : s === 4 ? 4 : 3);
    }
  }
  return p;
}

/** Sombra do que é alto (muros, moitas, monumentos) no chão: faixa a leste e ao sul (o sol vem do noroeste). */
export function shadeEdge(from: number, reach: number, color: readonly [number, number, number] = [36, 40, 18]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(HD * HD * 4);
  const wob = Float32Array.from({ length: HD }, (_, t) => reach + 5 * Math.sin((2 * Math.PI * t) / HD * 2));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      let d = 1e9;
      if (from & OPEN.n) d = Math.min(d, y / wob[x]);
      if (from & OPEN.w) d = Math.min(d, x / wob[y]);
      if (from & OPEN.nw && !(from & (OPEN.n | OPEN.w))) d = Math.min(d, Math.hypot(x, y) / reach);
      if (d >= 1) continue;
      const v = (1 - d) * 2 + (BAYER[(y & 1) * 2 + (x & 1)] - 0.5) * 0.6;
      const a = v > 1.2 ? 0.36 : v > 0.35 ? 0.2 : 0;
      if (!a) continue;
      out.set([color[0], color[1], color[2], Math.round(a * 255)], (y * HD + x) * 4);
    }
  return out;
}

// --- Muros das catacumbas (no chão, como os da Cripta) ------------------------------------

/** Altura (px) da face do muro no tile de muro com chão ao sul. */
const FACE_TOP = 26;

/**
 * Muro das catacumbas pelos vizinhos abertos (chão). Sem chão ao sul: o topo, quase preto, com o contorno dos blocos e a
 * beira clara onde encosta no chão. Com chão ao sul: a **face** ocupa o tile (o topo fica numa faixa em cima): blocos de
 * pedra lavrada em fiadas, rodapé saliente e, por `kind`, um nicho de ossário com caveira (1), o suporte de tocha (2),
 * uma rachadura com raízes descendo (3) ou uma placa com inscrição (4).
 */
export function cryptWallTile(open: number, kind: number, v: number): Paper {
  const p = paper();
  const south = (open & OPEN.s) !== 0;
  const top = south ? FACE_TOP : HD;
  // Topo.
  p.fill([0, 0, HD - 1, top - 1], () => true, E.Void, (x, y) => 0.45 + (sn(x, y, 32, 410) - 0.5) * 0.15,
    (x, y) => (mod(y + (Math.floor(x / 32) % 2) * 16, 32) === 0 || mod(x + (Math.floor(y / 32) % 2) * 16, 32) === 0 ? -1 : 0));
  for (let y = 0; y < top; y++)
    for (let x = 0; x < HD; x++) {
      if (open & OPEN.n && y < 3) p.on(x, y, E.Wall, y === 0 ? 4 : 2);
      if (open & OPEN.w && x < 3) p.on(x, y, E.Wall, x === 0 ? 4 : 2);
      if (open & OPEN.e && x > HD - 4) p.on(x, y, E.Wall, 1);
    }
  if (!south) return p;
  // Face de blocos: fiadas de 24 px, juntas desencontradas, cada bloco com o seu tom e bisel.
  const ROW = 24;
  p.fill([0, top, HD - 1, HD - 1], () => true, E.Wall, (x, y) => {
    const row = Math.floor((y - top) / ROW);
    const shift = (row % 2) * 20 + v * 8;
    const col = Math.floor(mod(x + shift, HD) / 40);
    const lx = mod(x + shift, HD) - col * 40, ly = (y - top) - row * ROW;
    const t = (y - top) / (HD - top);
    let s = 0.52 - t * 0.12 + (hash01(row * 7 + col + v * 31, 411) - 0.5) * 0.12;
    if (ly < 3 || lx < 3) s += 0.1;
    if (ly > ROW - 3 || lx > 37) s -= 0.1;
    return s;
  }, (x, y) => {
    const row = Math.floor((y - top) / ROW);
    const shift = (row % 2) * 20 + v * 8;
    const lx = mod(x + shift, HD) % 40, ly = (y - top) - row * ROW;
    if (ly === 0 || lx === 0) return -2;
    return noise(x, y, 412 + v) < 0.04 ? -1 : 0;
  });
  // Beira de cima da face (a quina do topo pega luz) e o rodapé.
  for (let x = 0; x < HD; x++) {
    p.on(x, top, E.Wall, 5); p.on(x, top + 1, E.Wall, 4); p.on(x, top + 2, E.Void, 2);
    for (let y = HD - 10; y < HD; y++) p.on(x, y, E.Wall, y === HD - 10 ? 4 : y > HD - 3 ? 1 : 2);
  }
  // Pontas abertas a leste e oeste: a quina do bloco.
  for (let y = top; y < HD; y++) {
    if (open & OPEN.w) { p.on(0, y, E.Wall, 4); p.on(1, y, E.Wall, 3); }
    if (open & OPEN.e) { p.on(HD - 1, y, E.Void, 1); p.on(HD - 2, y, E.Wall, 1); }
  }
  // Manchas de umidade descendo.
  for (let k = 0; k < 3; k++) {
    const x0 = 10 + noise(k, v, 413) * 108;
    for (let y = top + 3; y < HD - 12; y++) if (noise(Math.floor(x0) + Math.floor(y / 9), k, 414) < 0.7) p.nudge(x0 + Math.sin(y / 7) * 2, y, -1);
  }
  if (kind === 1) {
    // Nicho de ossário (lóculo): buraco escuro com a caveira e ossos.
    p.fill([30, 44, 98, 92], () => true, E.Void, (x, y) => 0.18 + ((y - 44) / 48) * 0.1, () => 0);
    for (let x = 30; x <= 98; x++) { p.on(x, 43, E.Wall, 5); p.on(x, 93, E.Wall, 4); }
    for (let y = 44; y < 93; y++) { p.on(29, y, E.Wall, 4); p.on(99, y, E.Wall, 1); }
    ellipse(p, 54, 80, 11, 10, E.Bone);
    p.on(50, 79, E.Void, 1); p.on(51, 79, E.Void, 1); p.on(57, 79, E.Void, 1); p.on(58, 79, E.Void, 1);
    p.on(54, 84, E.Void, 1);
    limb(p, [66, 88], [90, 86], 2.5, 2.5, E.Bone);
    limb(p, [70, 84], [92, 90], 2.2, 2.2, E.Bone);
    ellipse(p, 40, 89, 5, 3, E.Bone);
  } else if (kind === 2) {
    // Suporte de tocha: argola de ferro presa na pedra (a chama é desenhada por cima, com luz).
    limb(p, [64, 70], [64, 86], 3, 3, E.Iron);
    limb(p, [56, 66], [72, 66], 3, 3, E.Iron);
    ellipse(p, 64, 62, 7, 6, E.Bark);
    for (let y = 50; y < 70; y++) for (let x = 44; x < 84; x++) if (Math.hypot(x - 64, (y - 66) * 1.4) < 20) p.nudge(x, y, -1);
  } else if (kind === 3) {
    // Rachadura com raízes descendo da terra de cima.
    let x = 40 + v * 18;
    for (let y = top; y < HD - 14; y++) {
      if (noise(y >> 2, v, 415) < 0.35) x += noise(y, v, 416) < 0.5 ? -1 : 1;
      p.on(x, y, E.Void, 1); p.on(x + 1, y, E.Wall, 1);
    }
    for (let k = 0; k < 4; k++) {
      const rx = 30 + k * 18 + v * 4;
      for (let y = top; y < top + 30 + k * 9; y++) p.on(rx + Math.round(Math.sin(y / 5 + k) * 2), y, E.Bark, y % 5 === 0 ? 3 : 2);
    }
  } else if (kind === 4) {
    // Placa com inscrição gasta.
    p.fill([26, 46, 102, 84], () => true, E.Marble, (x, y) => 0.55 + (sn(x, y, 16, 417) - 0.5) * 0.1, () => 0);
    for (let x = 26; x <= 102; x++) { p.on(x, 46, E.Marble, 5); p.on(x, 84, E.Marble, 1); }
    for (let r = 0; r < 3; r++)
      for (let x = 32; x < 96; x += 4) if (noise(x, r + v * 3, 418) < 0.7) { p.on(x, 54 + r * 10, E.Vein, 1); p.on(x + 1, 54 + r * 10, E.Vein, 1); p.on(x, 55 + r * 10, E.Vein, 2); }
  }
  return p;
}

/** Escada da saída (no vestíbulo): degraus subindo para o sul, para a luz. */
export function stairUpTile(): Paper {
  const p = paper();
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Slab, (x, y) => 0.45 + (y / HD) * 0.3, () => 0);
  for (let k = 0; k < 7; k++) {
    const y0 = 8 + k * 17;
    for (let x = 10; x < HD - 10; x++) {
      p.on(x, y0, E.Slab, 5); p.on(x, y0 + 1, E.Slab, 4);
      p.on(x, y0 + 13, E.Void, 1); p.on(x, y0 + 14, E.Slab, 1);
    }
  }
  for (let y = 0; y < HD; y++) for (const x of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, HD - 10, HD - 9, HD - 8, HD - 7, HD - 6, HD - 5, HD - 4, HD - 3, HD - 2, HD - 1]) p.on(x, y, E.Wall, x < 9 ? 3 : 1);
  return p;
}

// --- Enfeites rasteiros ----------------------------------------------------------------------

export const FLAT_DECOR = ["shards", "tesserae", "drum", "inscription", "leaves", "weeds", "bones", "coins", "helmet", "skull", "dust", "web", "stones", "puddle"] as const;
export type FlatDecor = (typeof FLAT_DECOR)[number];

/** Enfeite rasteiro de 1 tile, com contorno (exceto pó e poça). */
export function flatDecor(kind: FlatDecor, v: number): Paper {
  const p = paper();
  const r = (k: number) => noise(k, v, 420 + FLAT_DECOR.indexOf(kind));
  switch (kind) {
    case "shards":
      // Cacos de ânfora (terracota) e um gargalo.
      for (let k = 0; k < 6; k++) {
        const cx = 30 + r(k) * 68, cy = 36 + r(k + 9) * 56, s = 4 + r(k + 3) * 5, a = r(k + 5) * Math.PI;
        poly(p, [[cx + Math.cos(a) * s, cy + Math.sin(a) * s], [cx + Math.cos(a + 2.1) * s, cy + Math.sin(a + 2.1) * s * 0.7], [cx + Math.cos(a + 4) * s * 0.8, cy + Math.sin(a + 4) * s]],
          E.Terracotta, () => 0.55 + r(k + 2) * 0.2);
      }
      p.together(() => { ellipse(p, 72, 66, 7, 5, E.Terracotta); limb(p, [66, 64], [58, 58], 2, 2, E.Terracotta); });
      break;
    case "tesserae":
      // Pedaço de mosaico solto: quadradinhos coloridos ainda presos na argamassa.
      p.fill([36, 44, 92, 84], (x, y) => noise(x >> 3, y >> 3, 430 + v) < 0.75, E.Mortar, () => 0.6);
      for (let y = 46; y < 84; y += 5)
        for (let x = 38; x < 92; x += 5) {
          if (!p.has(x, y) || noise(x, y, 431) < 0.25) continue;
          const mat = [E.Marble, E.Terracotta, E.Lapis, E.Gold, E.Void][Math.floor(noise(x, y, 432 + v) * 5)];
          for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) p.on(x + dx, y + dy, mat, dx === 0 || dy === 0 ? 4 : 3);
        }
      break;
    case "drum":
      // Tambor de coluna caído, deitado de lado: cilindro com caneluras e a face cortada.
      p.together(() => {
        limb(p, [34, 70], [86, 64], 17, 17, E.Marble);
        ellipse(p, 88, 64, 9, 17, E.Marble);
      });
      for (let k = -14; k <= 14; k += 4) line(p, [36, 70 + k], [84, 64 + k], null, 2);
      for (let y = 50; y < 80; y++) for (let x = 82; x < 98; x++) if (((x - 88) / 9) ** 2 + ((y - 64) / 17) ** 2 < 0.8) p.on(x, y, null, noise(x, y, 433) < 0.2 ? 3 : 4);
      break;
    case "inscription":
      // Lápide quebrada com letras: pedra clara, beira lascada.
      poly(p, [[30, 52], [96, 46], [102, 80], [78, 88], [36, 86]], E.Marble, () => 0.62);
      for (let row = 0; row < 3; row++)
        for (let x = 40; x < 92; x += 5) {
          if (noise(x, row + v, 434) < 0.25) continue;
          const y = 58 + row * 9;
          p.on(x, y, E.Vein, 1); p.on(x, y + 1, E.Vein, 1); p.on(x + 1, y, E.Vein, 1); p.on(x + 2, y + 2, E.Vein, 1);
        }
      break;
    case "leaves":
      // Folhas secas e agulhas de pinheiro espalhadas.
      for (let k = 0; k < 22; k++) {
        const x = 18 + r(k) * 92, y = 18 + r(k + 30) * 92, a = r(k + 60) * Math.PI;
        line(p, [x, y], [x + Math.cos(a) * 5, y + Math.sin(a) * 5], k % 3 ? E.Dry : E.Bark, k % 2 ? 3 : 2, false);
      }
      break;
    case "weeds":
      // Tufos baixos de capim alto e uma folha larga de acanto.
      for (let k = 0; k < 9; k++) {
        const bx = 40 + r(k) * 48, by = 86 - r(k + 1) * 10;
        limb(p, [bx, by], [bx + (r(k + 2) - 0.5) * 20, by - 18 - r(k + 3) * 14], 2, 0.6, k % 3 ? E.Grass : E.Dry);
      }
      break;
    case "bones":
      limb(p, [40, 70], [76, 62], 3, 3, E.Bone); ellipse(p, 38, 70, 4, 4, E.Bone); ellipse(p, 78, 62, 4, 4, E.Bone);
      limb(p, [56, 82], [84, 86], 2.5, 2.5, E.Bone);
      for (let k = 0; k < 4; k++) limb(p, [50 + k * 6, 50], [54 + k * 6, 60], 1.6, 1.6, E.Bone);
      break;
    case "coins":
      for (let k = 0; k < 7; k++) {
        const x = 44 + r(k) * 40, y = 54 + r(k + 7) * 30;
        ellipse(p, x, y, 4, 3, E.Gold);
        p.on(x - 1, y - 1, E.Gold, 5);
      }
      break;
    case "helmet":
      // Elmo de legionário enferrujado, caído de lado, com a proteção de nuca.
      p.together(() => {
        ellipse(p, 62, 66, 18, 14, E.Iron);
        poly(p, [[44, 70], [82, 70], [88, 80], [40, 80]], E.Iron, () => 0.4);
      });
      ellipse(p, 56, 60, 6, 4, E.Bronze);
      for (let k = 0; k < 18; k++) p.on(48 + r(k) * 30, 58 + r(k + 18) * 20, E.Terracotta, 2);
      break;
    case "skull":
      ellipse(p, 62, 64, 12, 11, E.Bone);
      p.fill([52, 70, 72, 78], () => true, E.Bone, () => 0.5);
      p.on(57, 64, E.Void, 1); p.on(58, 64, E.Void, 1); p.on(57, 65, E.Void, 1);
      p.on(66, 64, E.Void, 1); p.on(67, 64, E.Void, 1); p.on(67, 65, E.Void, 1);
      for (let x = 55; x < 70; x += 2) p.on(x, 75, E.Void, 1);
      limb(p, [76, 78], [96, 72], 2.4, 2.4, E.Bone);
      break;
    case "dust":
      // Pó e cascalho no canto (sem contorno).
      for (let y = 0; y < HD; y++)
        for (let x = 0; x < HD; x++) {
          const d = Math.hypot(x - 64 - r(1) * 20, y - 64 - r(2) * 20);
          if (d < 34 + sn(x, y, 16, 435) * 14 && noise(x, y, 436) < 0.3) p.px(x, y, E.Bone, noise(x, y, 437) < 0.5 ? 1 : 2);
        }
      for (let k = 0; k < 8; k++) ellipse(p, 40 + r(k + 3) * 48, 44 + r(k + 11) * 48, 2 + r(k) * 3, 1.5 + r(k + 1) * 2, E.Slab);
      break;
    case "web":
      // Teia no canto de cima à esquerda.
      for (let k = 0; k < 6; k++) {
        const a = (k / 5) * (Math.PI / 2);
        line(p, [2, 2], [2 + Math.cos(a) * 70, 2 + Math.sin(a) * 70], E.Bone, 3, false);
      }
      for (let ring = 1; ring < 6; ring++)
        for (let k = 0; k < 5; k++) {
          const a0 = (k / 5) * (Math.PI / 2), a1 = ((k + 1) / 5) * (Math.PI / 2), rr = ring * 12;
          line(p, [2 + Math.cos(a0) * rr, 2 + Math.sin(a0) * rr], [2 + Math.cos(a1) * rr * 0.92, 2 + Math.sin(a1) * rr * 0.92], E.Bone, 2, false);
        }
      break;
    case "stones":
      p.together(() => { ellipse(p, 56, 70, 12, 8, E.Tuff); ellipse(p, 72, 74, 9, 6, E.Tuff); });
      ellipse(p, 84, 64, 5, 4, E.Vein);
      break;
    case "puddle":
      // Poça da chuva entre as pedras, com o reflexo (sem contorno).
      p.fill(ebox4(64, 66, 26 + r(1) * 10, 12 + r(2) * 6), (x, y) => ((x - 64) / (26 + r(1) * 10)) ** 2 + ((y - 66) / (12 + r(2) * 6)) ** 2 + (sn(x, y, 16, 438) - 0.5) * 0.5 <= 1,
        E.Water, () => 0.5, (x, y) => (mod(x + y, 9) === 0 && noise(x, y, 439) < 0.5 ? 1 : 0));
      break;
  }
  return p;
}

const ebox4 = (cx: number, cy: number, rx: number, ry: number) => [cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + ry + 4] as const;

/** Ruído fixo por inteiro (0–1). */
export function hash01(a: number, seed: number) {
  return noise(a, a * 7 + 3, seed);
}

export { FLAT, HD, OPEN, ellipse, limb, line, lit, noise, poly, sn, sphere, type Pt };
