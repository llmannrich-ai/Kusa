import { TILE_SIZE } from "@kusa/shared";
import { wrapNoise, worley } from "./marshDecor.ts";
import { blob, hash, line, makeCanvas, px, strip, type Ctx } from "./pixels.ts";

/**
 * Arte própria do Pântano das Ruínas, pixel a pixel: o que resta do império afundado na Baía. Luz de cima à esquerda,
 * pedra calcária cinza-esverdeada tomada de musgo e hera, com a marca escura da água no pé de tudo (a baía já cobriu
 * as ruínas mais de uma vez). Lajes do piso (fecham a cada 2×2 tiles, sem emenda), trechos de muro com volume (tampo,
 * face de blocos e as pontas desmoronadas, montados por tile conforme os vizinhos), colunas de pé, quebradas ou
 * tocos, entulho, cacos e o mosaico da Hidra no chão da arena. A natureza (capim, lama, água, mata e árvores) é a do
 * Pântano do Kosaradius em outra paleta (`swampTone`): verde-oliva mais aberto e água verde-azulada.
 */

const T = TILE_SIZE;

/** Calcário das ruínas: do vão quase preto ao brilho do topo. */
const STONE = { o: "#1a1812", crev: "#2a2a21", dark: "#45463a", mid: "#626251", light: "#7f7d68", glow: "#9d9a80", hi: "#b8b497" };
/** Tons das lajes (cada laje puxa um), entre o cinza, o esverdeado e o quente. */
const SLAB_TONES = [
  { d: "#55574a", m: "#66685a", l: "#7a7b6a" },
  { d: "#52584a", m: "#62695a", l: "#767d6a" },
  { d: "#58554a", m: "#6a665a", l: "#7e796a" },
  { d: "#4f5248", m: "#5f6358", l: "#737768" },
];
const MORTAR = { dark: "#30322a", mid: "#3a3b30" };
/** Musgo em cima da pedra e nas juntas. */
const MOSS = { o: "#1d2f12", dark: "#2f4a1c", mid: "#46682a", light: "#5f8636", glow: "#7fa444" };
/** Hera pendurada nos muros. */
const IVY = { o: "#0f1f0c", dark: "#1f3d17", mid: "#2f5a22", light: "#467a2e", glow: "#62983a" };
/** Marca da água no pé das pedras: lodo escuro e a linha onde a baía parou. */
const STAIN = { deep: "#262d22", mid: "#34402c", line: "#4c5a3a" };
const OUTLINE = "#1a1812";

const mod = (v: number, n: number) => ((v % n) + n) % n;

// --- Paleta do pântano ----------------------------------------------------------------------

const toneCache = new Map<number, number>();

/**
 * Leva uma cor do Pântano do Kosaradius para a paleta do Pântano das Ruínas (HSL). Na folhagem e no chão, os verdes
 * puxam para o oliva e clareiam (floresta aberta, mais sol), e a lama esquenta de leve. Na água (`water`), os tons
 * verde-escuros cor de chá puxam para o verde-azulado da baía e clareiam um pouco. Cinzas não mudam.
 */
export function swampTone(r: number, g: number, b: number, water = false): [number, number, number] {
  const key = ((r << 16) | (g << 8) | b) * 2 + (water ? 1 : 0);
  const cached = toneCache.get(key);
  if (cached !== undefined) return [cached >> 16, (cached >> 8) & 255, cached & 255];
  let [h, s, l] = rgbToHsl(r, g, b);
  if (s > 0.08) {
    if (water && h >= 120 && h < 210) {
      h += 26;
      s = Math.min(1, s * 1.25);
      l = Math.min(1, l * 1.2 + 0.02);
    } else if (h >= 65 && h < 175) {
      // O verde-azulado da copa vai junto com o resto (a mata não fica ciano).
      h = h > 138 ? h - 22 : h - 9;
      s = Math.min(1, s * 1.04);
      l = Math.min(1, l * 1.13 + 0.01);
    } else if (h >= 15 && h < 65) {
      l = Math.min(1, l * 1.06);
    }
  }
  const out = hslToRgb(mod(h, 360), s, l);
  toneCache.set(key, (out[0] << 16) | (out[1] << 8) | out[2]);
  return out;
}

/** Repinta um pedaço do canvas na paleta do pântano (a transparência fica); `water` para as texturas de água. */
export function toSwampTone(canvas: HTMLCanvasElement, water = false, x = 0, y = 0, w = canvas.width, h = canvas.height) {
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(x, y, w, h);
  const p = img.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] === 0) continue;
    const [r, g, b] = swampTone(p[i], p[i + 1], p[i + 2], water);
    p[i] = r; p[i + 1] = g; p[i + 2] = b;
  }
  ctx.putImageData(img, x, y);
  return canvas;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// --- Piso de lajes --------------------------------------------------------------------------

/** O piso fecha a cada 2×2 tiles: o tile (x, y) usa o pedaço (x mod 2, y mod 2). */
export const PAVING_PERIOD = 2;
export const PAVING_VARIANTS = PAVING_PERIOD * PAVING_PERIOD;
export const pavingVariant = (x: number, y: number) => mod(x, PAVING_PERIOD) + PAVING_PERIOD * mod(y, PAVING_PERIOD);
const PP = T * PAVING_PERIOD;

/**
 * Cor do piso no pixel (x, y): lajes irregulares de calcário (células de ~16 px, cada uma com o seu tom), com bisel
 * pela forma (luz na beira de cima à esquerda, sombra na de baixo à direita) e manchas de desgaste. As juntas são
 * frestas de terra tomadas de musgo, mais largas onde o musgo cresceu.
 */
function pavingPixel(x: number, y: number) {
  const cell = worley(x, y, 16, PP, 900);
  const moss = wrapNoise(x, y, 8, PP, 901);
  const gap = cell.d2 - cell.d1;
  const joint = 1.1 + (moss > 0.6 ? 1.1 : 0) + (hash(Math.floor(x / 3), Math.floor(y / 3), 902) < 0.2 ? 0.6 : 0);
  if (gap < joint) {
    if (moss > 0.5) return hash(x, y, 903) < 0.45 ? MOSS.mid : MOSS.dark;
    return hash(x, y, 904) < 0.4 ? MOSS.o : MORTAR.dark;
  }
  const tone = SLAB_TONES[Math.floor(hash(cell.id, 905) * SLAB_TONES.length)];
  // Bisel pela forma: perto da junta, o lado de cima à esquerda da laje pega luz e o de baixo à direita escurece.
  if (gap < joint + 2.2) {
    const facing = cell.dx + cell.dy;
    if (facing < -2) return tone.l;
    if (facing > 2) return tone.d;
  }
  // Musgo que transborda da junta e cobre a beira de algumas lajes.
  if (moss > 0.66 && gap < joint + 5 && hash(x, y, 906) < 0.7) return hash(x, y, 907) < 0.35 ? MOSS.light : MOSS.mid;
  const wear = wrapNoise(x, y, 4, PP, 908) + (hash(x, y, 909) - 0.5) * 0.3 + (hash(cell.id, 910) - 0.5) * 0.25;
  if (wear < 0.22) return tone.d;
  if (wear > 0.8) return tone.l;
  const g = hash(x, y, 911);
  if (g < 0.02) return STONE.dark;
  if (g > 0.99) return STONE.glow;
  return tone.m;
}

export function pavingStrip() {
  return strip(Array.from({ length: PAVING_VARIANTS }, (_, v) => (ctx: Ctx) => {
    const ox = (v % PAVING_PERIOD) * T;
    const oy = Math.floor(v / PAVING_PERIOD) * T;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(ctx, x, y, pavingPixel(ox + x, oy + y));
  }));
}

// --- Muros ----------------------------------------------------------------------------------

/** Altura máxima de um muro (px acima do chão): o sprite do muro sobe isso para o tile de cima. */
export const WALL_RISE = 24;
export const WALL_SPRITE = { w: T, h: T + WALL_RISE };
/** Bits dos vizinhos que também são pedra: N, L, S, O. */
export const WALL_LINK = { n: 1, e: 2, s: 4, w: 8 } as const;
/** Alturas possíveis do muro (o mapa escolhe por um ruído suave, para trechos vizinhos ficarem parecidos). */
export const WALL_HEIGHTS = [14, 16, 18, 20, 22] as const;
export const WALL_VARIANTS = 3;

/**
 * Trecho de muro em ruínas num tile (32×56, o pé no fundo do quadro). `links` diz para que lados o muro continua
 * (bits de `WALL_LINK`): o miolo tem 18 px de espessura e cada lado ligado vai até a beira do tile, para casar com o
 * vizinho. Desenhado como volume: cada ponto do chão do muro sobe até a altura dele (face de blocos com rejunte,
 * tampo de pedra coberto de musgo), de norte a sul, então o que está na frente cobre o de trás. A ponta solta
 * desmorona (a altura cai em degraus), falta um bloco aqui e ali no alto, e embaixo fica a marca da água.
 * Variação 0: rachado; 1: com musgo escorrendo e um bloco faltando; 2: com hera pendurada.
 */
export function ruinWallCanvas(links: number, height: number, variant: number) {
  const { canvas, ctx } = makeCanvas(WALL_SPRITE.w, WALL_SPRITE.h);
  const n = (links & WALL_LINK.n) !== 0;
  const e = (links & WALL_LINK.e) !== 0;
  const s = (links & WALL_LINK.s) !== 0;
  const w = (links & WALL_LINK.w) !== 0;
  const seed = links * 31 + height * 7 + variant * 131;
  const edge = (i: number, k: number) => Math.round((hash(i, k, seed) - 0.5) * 1.6);
  const foot = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= T || y >= T) return false;
    const core = (a: number, b: number, k: number, i: number) => a + (edge(i, k) > 0 ? 1 : 0) <= b;
    const inCoreX = core(7, x, 1, y) && x <= 24 - (edge(y, 2) > 0 ? 1 : 0);
    const inCoreY = core(7, y, 3, x) && y <= 25 - (edge(x, 4) > 0 ? 1 : 0);
    if (inCoreX && inCoreY) return true;
    if (n && inCoreX && y < 8) return true;
    if (s && inCoreX && y > 24) return true;
    if (e && inCoreY && x > 23) return true;
    if (w && inCoreY && x < 8) return true;
    return false;
  };
  // Ponta solta (o muro só continua para um lado): a altura cai em degraus em direção a ela.
  const degree = [n, e, s, w].filter(Boolean).length;
  const drop = (x: number, y: number) => {
    if (degree !== 1) return 0;
    const free = n ? 31 - y : s ? y : e ? x : 31 - x;
    const k = Math.max(0, 15 - free);
    return Math.min(height - 4, Math.floor(k * 0.6 + hash(Math.floor(x / 4), Math.floor(y / 4), seed + 1) * 3));
  };
  // Blocos faltando no alto (por pedaços de 5 px ao longo do muro), só nos trechos deitados: no muro em pé (norte-sul)
  // o degrau viraria uma listra por tile.
  const notch = (x: number) => {
    if (n || s) return 0;
    const along = Math.floor(x / 5);
    return hash(along, seed + 2) < 0.28 ? 3 + Math.floor(hash(along, seed + 3) * 3) : 0;
  };
  const heightAt = (x: number, y: number) => Math.max(2, height - drop(x, y) - notch(x));

  // Buffer: cor e se é tampo (para o contorno e a hera).
  const color: (string | null)[] = new Array(WALL_SPRITE.w * WALL_SPRITE.h).fill(null);
  const top = new Uint8Array(WALL_SPRITE.w * WALL_SPRITE.h);
  const put = (sx: number, sy: number, c: string, isTop: boolean) => {
    if (sx < 0 || sy < 0 || sx >= WALL_SPRITE.w || sy >= WALL_SPRITE.h) return;
    color[sy * WALL_SPRITE.w + sx] = c;
    top[sy * WALL_SPRITE.w + sx] = isTop ? 1 : 0;
  };
  const westEnd = w ? 0 : 7;
  const eastEnd = e ? T - 1 : 24;
  const missing = variant === 1 ? { x: 9 + Math.floor(hash(seed, 4) * 10), z: 4 + Math.floor(hash(seed, 5) * 6) } : null;

  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      if (!foot(x, y)) continue;
      const ht = heightAt(x, y);
      const sy0 = y + WALL_RISE;
      // Face de blocos (o que sobra dela é a face sul: as fiadas de trás ficam cobertas pelas da frente).
      for (let z = 0; z < ht; z++) {
        const course = Math.floor(z / 6);
        const off = course % 2 ? 5 : 0;
        const joint = z % 6 === 5 || mod(x + off, 10) === 0;
        const block = hash(Math.floor((x + off) / 10), course, seed + 6);
        let c = block < 0.3 ? STONE.dark : block > 0.8 ? STONE.light : STONE.mid;
        if (x <= westEnd + 1) c = STONE.light;
        else if (x >= eastEnd - 1) c = STONE.dark;
        if (joint) c = MORTAR.dark;
        if (z === ht - 1) c = STONE.glow;
        else if (hash(x, z, seed + 7) < 0.05) c = STONE.crev;
        // Marca da água: lodo escuro no pé e a linha irregular onde a baía parou.
        const water = 3 + (hash(Math.floor(x / 3), seed + 8) < 0.5 ? 1 : 0);
        if (z < water - 1) c = z === 0 ? STAIN.deep : STAIN.mid;
        else if (z === water - 1) c = STAIN.line;
        if (missing && Math.abs(x - missing.x) <= 3 && z >= missing.z && z < missing.z + 5) {
          c = z === missing.z + 4 || x === missing.x - 3 ? STONE.o : STONE.crev;
        }
        put(x, sy0 - z, c, false);
      }
      // Tampo: pedra clara coberta de musgo em almofadas, com a beira de cima pegando luz.
      const m = wrapNoise(x, y, 6, T, seed + 9) + (hash(x, y, seed + 10) - 0.5) * 0.3;
      let c = m > 0.68 ? MOSS.light : m > 0.55 ? MOSS.mid : m > 0.5 ? MOSS.dark : hash(x, y, seed + 11) < 0.15 ? STONE.light : STONE.glow;
      // Juntas dos blocos do tampo e a espessura: a beira oeste pega luz, a leste fica na sombra.
      if (c === STONE.glow && (mod(y + (Math.floor(x / 9) % 2) * 4, 8) === 0 || mod(x, 9) === 0)) c = STONE.mid;
      if (!foot(x - 1, y) && !(w && x === 0)) c = STONE.hi;
      else if (!foot(x + 1, y) && !(e && x === T - 1)) c = STONE.dark;
      else if (!foot(x + 2, y) && !(e && x >= T - 2)) c = c === STONE.glow ? STONE.light : c;
      if (!foot(x, y - 1) && !(n && y === 0)) c = m > 0.55 ? MOSS.glow : STONE.hi;
      put(x, sy0 - ht, c, true);
    }

  // Rachadura descendo a face.
  if (variant === 0) {
    let cx = 9 + Math.floor(hash(seed, 12) * 14);
    for (let sy = WALL_RISE + 26 - height + 4; sy < WALL_RISE + 28; sy++) {
      if (hash(sy, seed, 13) < 0.45) cx += hash(sy, seed, 14) < 0.5 ? -1 : 1;
      const i = sy * WALL_SPRITE.w + cx;
      if (color[i] && !top[i]) { color[i] = STONE.o; if (color[i + 1] && !top[i + 1]) color[i + 1] = STONE.light; }
    }
  }
  // Musgo escorrendo do tampo pela face (fios curtos verdes).
  const drips = variant === 1 ? 9 : 4;
  for (let k = 0; k < drips; k++) {
    const x = Math.floor(hash(k, seed, 15) * T);
    let sy = 0;
    while (sy < WALL_SPRITE.h && !(color[sy * WALL_SPRITE.w + x] && !top[sy * WALL_SPRITE.w + x])) sy++;
    const len = 2 + Math.floor(hash(k, seed, 16) * (variant === 1 ? 8 : 4));
    for (let d = 0; d < len && sy + d < WALL_SPRITE.h; d++) {
      const i = (sy + d) * WALL_SPRITE.w + x;
      if (!color[i] || top[i]) break;
      color[i] = d === len - 1 ? MOSS.dark : d % 2 ? MOSS.mid : MOSS.light;
    }
  }

  // Contorno escuro em volta do volume (menos na emenda com o muro do tile de cima).
  for (let sy = 0; sy < WALL_SPRITE.h; sy++)
    for (let sx = 0; sx < WALL_SPRITE.w; sx++) {
      const c = color[sy * WALL_SPRITE.w + sx];
      if (c) { px(ctx, sx, sy, c); continue; }
      const at = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < WALL_SPRITE.w && yy < WALL_SPRITE.h && color[yy * WALL_SPRITE.w + xx];
      const below = at(sx, sy + 1);
      if (below && n && sy + 1 <= WALL_RISE - height + 3 + 4) continue;
      if (at(sx - 1, sy) || at(sx + 1, sy) || below || at(sx, sy - 1)) px(ctx, sx, sy, OUTLINE);
    }

  // Hera: ramos descendo do tampo pela face, com folhas de 3 tons.
  if (variant === 2) {
    for (let k = 0; k < 3; k++) {
      let x = 5 + Math.floor(hash(k, seed, 17) * 22);
      let sy = 0;
      while (sy < WALL_SPRITE.h - 1 && !(color[sy * WALL_SPRITE.w + x])) sy++;
      const len = 6 + Math.floor(hash(k, seed, 18) * 12);
      for (let d = 0; d < len; d++) {
        const yy = sy + d;
        if (yy >= WALL_SPRITE.h - 3 || !color[yy * WALL_SPRITE.w + x]) break;
        px(ctx, x, yy, IVY.dark);
        if (d % 3 === 1) {
          const side = hash(k, d, seed + 19) < 0.5 ? -1 : 1;
          px(ctx, x + side, yy, IVY.light);
          px(ctx, x + side * 2, yy, IVY.mid);
          px(ctx, x + side, yy + 1, IVY.mid);
          px(ctx, x + side, yy - 1, IVY.glow);
        }
        if (hash(k, d, seed + 20) < 0.3) x += hash(k, d, seed + 21) < 0.5 ? -1 : 1;
      }
    }
  }
  return canvas;
}

// --- Colunas --------------------------------------------------------------------------------

/** Quadro das colunas (32×80, o pé no fundo). */
export const COLUMN_RISE = 48;
export const COLUMN_SPRITE = { w: T, h: T + COLUMN_RISE };
/** 0: inteira com capitel (a arena da Hidra); 1: quebrada alta; 2: quebrada média; 3: toco com o tambor caído ao lado. */
export const COLUMN_VARIANTS = 4;

/**
 * Coluna das ruínas: plinto quadrado, fuste de tambores com caneluras (luz à esquerda, sombra à direita), quebrada em
 * ângulo com a ponta recortada, ou inteira com o capitel. Musgo no topo, hera subindo em algumas e a marca da água no pé.
 */
export function columnCanvas(variant: number) {
  const { canvas, ctx } = makeCanvas(COLUMN_SPRITE.w, COLUMN_SPRITE.h);
  const groundY = COLUMN_SPRITE.h - 6; // linha do chão no centro do pé
  const cx = 16;
  const r = 6;
  const shaftTop = [44, 36, 24, 9][variant];
  // Sombra do pé no chão.
  for (let y = -3; y <= 3; y++)
    for (let x = -11; x <= 12; x++)
      if ((x / 12) ** 2 + (y / 3.5) ** 2 <= 1) px(ctx, cx + x + 2, groundY + y + 1, "rgba(6,12,6,0.35)");
  // Plinto: caixa baixa de 18 px.
  const plinth = 5;
  for (let z = 0; z < plinth; z++)
    for (let x = cx - 9; x <= cx + 8; x++) {
      let c = x <= cx - 8 ? STONE.light : x >= cx + 7 ? STONE.dark : STONE.mid;
      if (z < 2) c = z === 0 ? STAIN.deep : STAIN.mid;
      if (z === plinth - 1) c = STONE.glow;
      px(ctx, x, groundY + 2 - z, c);
    }
  for (let y = 0; y < 5; y++) for (let x = cx - 9; x <= cx + 8; x++) px(ctx, x, groundY - plinth + 2 - y, y === 4 ? STONE.hi : hash(x, y, 930) < 0.4 ? MOSS.mid : STONE.light);
  // Fuste.
  const base = groundY - plinth - 2;
  for (let z = 0; z < shaftTop; z++) {
    for (let x = cx - r; x <= cx + r - 1; x++) {
      // Ponta quebrada: corte inclinado (mais alto à esquerda) e recortado.
      if (variant > 0) {
        const slope = shaftTop - (x - (cx - r)) * 0.55 - (hash(x, variant, 931) < 0.35 ? 2 : 0);
        if (z > slope) continue;
      }
      const u = (x - (cx - r) + 0.5) / (2 * r);
      let c = u < 0.2 ? STONE.glow : u < 0.45 ? STONE.light : u < 0.78 ? STONE.mid : STONE.dark;
      if ((x === cx - 3 || x === cx || x === cx + 3) && hash(x, z, 932) < 0.8) c = u < 0.45 ? STONE.mid : STONE.dark; // caneluras
      if (z % 12 === 11) c = MORTAR.dark; // junta dos tambores
      if (z < 3) c = z === 0 ? STAIN.deep : STAIN.mid;
      else if (z === 3 && hash(x, 933) < 0.7) c = STAIN.line;
      if (x === cx - r) c = OUTLINE;
      if (x === cx + r - 1) c = OUTLINE;
      px(ctx, x, base - z, c);
    }
  }
  if (variant === 0) {
    // Capitel: colarinho, equino e ábaco quadrado, com musgo em cima.
    const at = base - shaftTop;
    for (let x = cx - 7; x <= cx + 6; x++) for (let k = 0; k < 2; k++) px(ctx, x, at - k, k ? STONE.light : STONE.dark);
    for (let x = cx - 9; x <= cx + 8; x++) for (let k = 2; k < 6; k++) px(ctx, x, at - k, k === 5 ? STONE.hi : x <= cx - 8 ? STONE.glow : x >= cx + 7 ? STONE.dark : STONE.light);
    for (let x = cx - 9; x <= cx + 8; x++) for (let k = 6; k < 9; k++) px(ctx, x, at - k, hash(x, k, 934) < 0.55 ? (k === 8 ? MOSS.glow : MOSS.light) : STONE.hi);
    for (let x = cx - 10; x <= cx + 9; x++) px(ctx, x, at - 9, OUTLINE);
    for (let x = cx - 7; x <= cx + 6; x++) px(ctx, x, at + 1, STONE.o);
  } else {
    // Superfície da quebra: clara, com musgo, e o contorno em cima.
    for (let x = cx - r; x <= cx + r - 1; x++) {
      const slope = Math.floor(shaftTop - (x - (cx - r)) * 0.55 - (hash(x, variant, 931) < 0.35 ? 2 : 0));
      const y = base - slope;
      px(ctx, x, y, hash(x, 935) < 0.45 ? MOSS.light : STONE.hi);
      px(ctx, x, y - 1, OUTLINE);
    }
  }
  if (variant === 3) {
    // Tambor caído ao lado do toco.
    blob(ctx, 25, groundY - 1, 5, 3.5, { o: OUTLINE, m: STONE.mid, l: STONE.glow, d: STONE.dark });
    blob(ctx, 23, groundY - 2, 2.5, 3, { o: STONE.dark, m: STONE.light, l: STONE.hi, d: STONE.mid });
    px(ctx, 22, groundY - 4, MOSS.light, 2, 1);
  }
  // Hera subindo pelo fuste (nas quebradas altas).
  if (variant === 1 || variant === 0) {
    let x = cx - 2;
    for (let z = 2; z < shaftTop - 6; z++) {
      if (z % 4 === 0) x = cx - 4 + Math.floor(hash(z, variant, 936) * 8);
      px(ctx, x, base - z, IVY.dark);
      if (z % 3 === 0) { px(ctx, x - 1, base - z, IVY.light); px(ctx, x + 1, base - z - 1, IVY.mid); }
    }
  }
  return canvas;
}

export function columnSheet() {
  const { canvas, ctx } = makeCanvas(COLUMN_SPRITE.w * COLUMN_VARIANTS, COLUMN_SPRITE.h);
  for (let v = 0; v < COLUMN_VARIANTS; v++) ctx.drawImage(columnCanvas(v), v * COLUMN_SPRITE.w, 0);
  return canvas;
}

// --- Enfeites do chão das ruínas -------------------------------------------------------------

const STONE_BLOB = { o: OUTLINE, m: STONE.mid, l: STONE.glow, d: STONE.dark };
const MOSS_BLOB = { o: MOSS.o, m: MOSS.mid, l: MOSS.light, d: MOSS.dark };
const SHADOW = "rgba(6,12,6,0.35)";

/** Montinho de entulho: pedras de tamanhos diferentes, a sombra embaixo à direita e musgo em cima de uma. */
function rubble(seed: number) {
  return (ctx: Ctx) => {
    const stones = 4 + Math.floor(hash(seed, 940) * 3);
    for (let k = 0; k < stones; k++) {
      const x = 8 + hash(seed, k, 941) * 16;
      const y = 14 + hash(seed, k, 942) * 12;
      const r = 1.8 + hash(seed, k, 943) * 2.6;
      px(ctx, x - r + 2, y + r * 0.7, SHADOW, r * 2, 2);
      blob(ctx, x, y, r, r * 0.75, STONE_BLOB);
    }
    blob(ctx, 14 + seed * 3, 17, 2, 1.2, MOSS_BLOB);
  };
}

/** Rachadura atravessando a laje (fresta escura com a beira clara). */
function crack(seed: number) {
  return (ctx: Ctx) => {
    let x = 4 + hash(seed, 944) * 6;
    let y = 6 + hash(seed, 945) * 20;
    for (let k = 0; k < 26; k++) {
      px(ctx, x, y, STONE.o);
      px(ctx, x + 1, y + 1, STONE.light);
      if (k === 12) { let bx = x; let by = y; for (let j = 0; j < 6; j++) { bx += 1; by += hash(j, seed, 946) < 0.5 ? -1 : 0; px(ctx, bx, by, STONE.crev); } }
      x += 1;
      y = Math.max(4, Math.min(27, y + (hash(k, seed, 947) < 0.33 ? -1 : hash(k, seed, 947) > 0.66 ? 1 : 0)));
    }
  };
}

/** Laje afundada com água parada em cima: borda escura, água verde-azulada e o reflexo do céu. */
function slabPuddle(ctx: Ctx) {
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = Math.hypot((x - 16) / 10, (y - 17) / 6);
      if (d > 1) continue;
      px(ctx, x, y, d > 0.85 ? STAIN.deep : d > 0.7 ? "#2c4a44" : (x + y) % 9 === 0 && d < 0.5 ? "#8fb8aa" : "#35574f");
    }
}

/** Laje que falta: o buraco de borda comida, com terra e capim nascendo. */
function slabHole(ctx: Ctx) {
  const inHole = (x: number, y: number) => Math.hypot((x - 16) / 8, (y - 17) / 6) + (hash(x, y, 947) - 0.5) * 0.3 < 1;
  for (let y = 9; y < 25; y++)
    for (let x = 6; x < 26; x++) {
      if (!inHole(x, y)) continue;
      const lit = !inHole(x, y + 1) || !inHole(x + 1, y);
      const dark = !inHole(x, y - 1) || !inHole(x - 1, y);
      px(ctx, x, y, dark ? STONE.o : lit ? STONE.light : hash(x, y, 948) < 0.3 ? "#3a3020" : "#45392a");
    }
  for (let k = 0; k < 7; k++) {
    const x = 9 + Math.floor(hash(k, 949) * 14);
    const y = 21 - Math.floor(hash(k, 950) * 4);
    line(ctx, x, y, x + (k % 3) - 1, y - 4, MOSS.light);
    px(ctx, x + (k % 3) - 1, y - 4, MOSS.glow);
  }
}

/** Tufo de capim nascendo na junta das lajes. */
function weeds(ctx: Ctx) {
  for (let k = 0; k < 12; k++) {
    const x = 10 + hash(k, 951) * 12;
    const h = 3 + hash(k, 952) * 6;
    const lean = (hash(k, 953) - 0.5) * 5;
    line(ctx, x, 24, x + lean, 24 - h, k % 3 ? MOSS.mid : MOSS.light);
    px(ctx, x + lean, 24 - h, MOSS.glow);
  }
}

/** Glifo do culto da Hidra entalhado na laje: três pescoços de serpente saindo de um círculo. */
function glyph(ctx: Ctx) {
  const cut = (x: number, y: number) => { px(ctx, x, y, STONE.o); px(ctx, x + 1, y + 1, STONE.light); };
  for (let a = 0; a < Math.PI * 2; a += 0.3) cut(16 + Math.cos(a) * 4, 18 + Math.sin(a) * 4);
  for (const base of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) {
    for (let k = 5; k < 12; k++) {
      const a = base + Math.sin(k * 0.9) * 0.25;
      cut(16 + Math.cos(a) * k, 18 + Math.sin(a) * k * 0.8);
    }
  }
}

/** Cacos de uma urna de barro. */
function shards(ctx: Ctx) {
  const CLAY = { o: "#2a160c", m: "#8a5236", l: "#b07050", d: "#5e3422" };
  for (const [x, y, rx, ry] of [[11, 19, 3, 1.6], [19, 15, 2.2, 1.4], [21, 23, 2.8, 1.5], [14, 25, 1.6, 1]]) {
    px(ctx, x - rx + 1, y + ry, SHADOW, rx * 2, 1);
    blob(ctx, x, y, rx, ry, CLAY);
  }
  px(ctx, 18, 14, "#c08860", 2, 1);
}

/** Tapete de musgo crescendo por cima da laje. */
function slabMoss(seed: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const d = Math.hypot((x - 16) / 12, (y - 16) / 9) + (hash(x, y, 954 + seed) - 0.5) * 0.35;
        if (d > 1) continue;
        const n = hash(Math.floor(x / 2), Math.floor(y / 2), 955 + seed);
        px(ctx, x, y, d > 0.85 ? MOSS.o : n < 0.3 ? MOSS.dark : n < 0.8 ? MOSS.mid : MOSS.light);
      }
  };
}

/** Caveira e ossos de quem veio antes. */
function skull(ctx: Ctx) {
  const BONE = { o: "#2a261c", m: "#c8c0a4", l: "#e8e2cc", d: "#9a927a" };
  line(ctx, 6, 24, 14, 21, BONE.d);
  line(ctx, 6, 25, 14, 22, BONE.m);
  blob(ctx, 20, 19, 4.5, 4, BONE);
  px(ctx, 18, 19, BONE.o, 2, 2);
  px(ctx, 21, 19, BONE.o, 2, 2);
  px(ctx, 19, 23, BONE.d, 3, 1);
  blob(ctx, 25, 17, 1.6, 1.1, MOSS_BLOB);
}

/** Enfeites rasteiros das ruínas (camada do chão, não bloqueiam nada). */
export const RUIN_FLOOR = {
  rubbleA: 0, rubbleB: 1, crackA: 2, crackB: 3, puddle: 4, hole: 5, weeds: 6, glyph: 7, shards: 8, mossA: 9, mossB: 10, skull: 11,
} as const;

export function ruinFloorStrip() {
  return strip([rubble(0), rubble(1), crack(0), crack(1), slabPuddle, slabHole, weeds, glyph, shards, slabMoss(0), slabMoss(1), skull]);
}

// --- Enfeites altos das ruínas (de pé, encobrem o pé de quem passa atrás) --------------------

/** Tambor de coluna caído, deitado de lado, com as caneluras e musgo em cima. */
function drum(ctx: Ctx) {
  px(ctx, 6, 27, SHADOW, 22, 2);
  for (let y = 16; y < 28; y++)
    for (let x = 6; x < 24; x++) {
      const v = (y - 16) / 12;
      let c = v < 0.2 ? STONE.glow : v < 0.5 ? STONE.light : v < 0.85 ? STONE.mid : STONE.dark;
      if ((y === 19 || y === 23) && x % 3) c = STONE.dark;
      if (y === 16 || y === 27) c = OUTLINE;
      px(ctx, x, y, c);
    }
  blob(ctx, 24, 22, 3.5, 6, { o: OUTLINE, m: STONE.light, l: STONE.hi, d: STONE.mid });
  for (let x = 8; x < 20; x++) if (hash(x, 956) < 0.6) px(ctx, x, 16 + (hash(x, 957) < 0.5 ? 0 : 1), MOSS.light);
}

/** Cabeça de estátua caída de lado, gasta e coberta de musgo (olhos fechados, nariz quebrado). */
function statueHead(ctx: Ctx) {
  px(ctx, 7, 27, SHADOW, 20, 2);
  blob(ctx, 16, 19, 9, 8, { o: OUTLINE, m: STONE.mid, l: STONE.glow, d: STONE.dark });
  for (const [x, y] of [[12, 17], [18, 17]]) { px(ctx, x, y, STONE.o, 3, 1); px(ctx, x, y + 1, STONE.dark, 3, 1); }
  px(ctx, 15, 19, STONE.light, 2, 3);
  px(ctx, 16, 22, STONE.crev, 2, 1);
  px(ctx, 13, 24, STONE.dark, 6, 1);
  for (let x = 8; x < 25; x++) for (let y = 11; y < 15; y++) if (Math.hypot((x - 16) / 9, (y - 19) / 8) < 1 && hash(x, y, 958) < 0.65) px(ctx, x, y, hash(x, y, 959) < 0.4 ? MOSS.light : MOSS.mid);
  // Coroa de louro gasta.
  for (let x = 9; x < 24; x += 2) px(ctx, x, 13 + Math.round(Math.abs(x - 16) * 0.2), MOSS.glow);
}

/** Urna de pedra rachada, com a boca quebrada e musgo. */
function urn(ctx: Ctx) {
  px(ctx, 9, 28, SHADOW, 16, 2);
  for (let y = 9; y < 28; y++) {
    const t = (y - 9) / 19;
    const w = 3 + Math.sin(t * Math.PI) * 6 - (t > 0.85 ? (t - 0.85) * 12 : 0);
    for (let x = Math.round(16 - w); x <= Math.round(16 + w); x++) {
      const u = (x - 16) / w;
      let c = u < -0.5 ? STONE.glow : u < 0 ? STONE.light : u < 0.6 ? STONE.mid : STONE.dark;
      if (Math.abs(u) > 0.9) c = OUTLINE;
      if (y === 15 && Math.abs(u) < 0.9) c = STONE.dark;
      px(ctx, x, y, c);
    }
  }
  for (let x = 12; x <= 20; x++) px(ctx, x, 9 + (x > 17 ? 2 : 0), x > 17 ? STONE.o : STONE.hi);
  line(ctx, 18, 16, 15, 24, STONE.o);
  blob(ctx, 12, 20, 2, 3, MOSS_BLOB);
}

/** Pedaço de pedestal com os pés de uma estátua que já caiu. */
function pedestal(ctx: Ctx) {
  px(ctx, 6, 28, SHADOW, 22, 2);
  for (let y = 18; y < 28; y++)
    for (let x = 7; x < 25; x++) {
      let c = x < 9 ? STONE.light : x > 22 ? STONE.dark : STONE.mid;
      if (y === 18) c = STONE.hi;
      if (y > 25) c = STAIN.mid;
      if (x === 7 || x === 24 || y === 27) c = OUTLINE;
      px(ctx, x, y, c);
    }
  for (const fx of [10, 17]) {
    for (let y = 11; y < 18; y++) for (let x = fx; x < fx + 5; x++) px(ctx, x, y, x === fx ? STONE.glow : x === fx + 4 ? STONE.dark : STONE.light);
    px(ctx, fx, 10, STONE.o, 5, 1);
  }
  for (let x = 8; x < 24; x++) if (hash(x, 960) < 0.4) px(ctx, x, 19, MOSS.mid);
}

export const RUIN_TALL = { drum: 0, head: 1, urn: 2, pedestal: 3 } as const;

export function ruinTallStrip() {
  return strip([drum, statueHead, urn, pedestal]);
}

// --- Ruínas dentro da água -------------------------------------------------------------------

/** Laje afundada vista por baixo da água: mancha clara e verde-azulada de borda gasta, com uma rachadura. */
function sunkenSlab(ctx: Ctx) {
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = Math.max(Math.abs(x - 16) / 9, Math.abs(y - 16) / 7) + (hash(x, y, 961) - 0.5) * 0.25;
      if (d > 1) continue;
      px(ctx, x, y, d > 0.86 ? "rgba(20,40,36,0.3)" : hash(x, y, 962) < 0.06 ? "rgba(140,190,170,0.35)" : "rgba(80,124,110,0.3)");
    }
  line(ctx, 11, 12, 18, 20, "rgba(20,40,36,0.35)");
}

/** Toco de coluna saindo da água: topo quebrado com musgo, a linha de lodo e a marola em volta. */
function stubInWater(ctx: Ctx) {
  for (let a = 0; a < Math.PI * 2; a += 0.12) px(ctx, 16 + Math.cos(a) * 9, 22 + Math.sin(a) * 3.5, "rgba(170,210,196,0.55)");
  for (let y = 12; y < 23; y++)
    for (let x = 10; x <= 21; x++) {
      const u = (x - 10) / 11;
      let c = u < 0.25 ? STONE.glow : u < 0.55 ? STONE.light : u < 0.85 ? STONE.mid : STONE.dark;
      if (y > 19) c = STAIN.mid;
      if (x === 10 || x === 21) c = OUTLINE;
      px(ctx, x, y, c);
    }
  blob(ctx, 15.5, 12, 6, 2.6, { o: OUTLINE, m: STONE.light, l: STONE.hi, d: STONE.mid });
  blob(ctx, 14, 11.5, 2.5, 1.2, MOSS_BLOB);
}

/** Pedra de passagem (o topo de um bloco afundado), lisa e molhada. */
function steppingStone(ctx: Ctx) {
  for (let a = 0; a < Math.PI * 2; a += 0.14) px(ctx, 16 + Math.cos(a) * 9, 18 + Math.sin(a) * 4, "rgba(170,210,196,0.45)");
  blob(ctx, 16, 16, 8, 4.5, { o: OUTLINE, m: STONE.mid, l: STONE.light, d: STAIN.mid });
  px(ctx, 12, 14, STONE.glow, 4, 1);
  blob(ctx, 20, 15, 2, 1.2, MOSS_BLOB);
}

export const RUIN_WATER = { slab: 0, stub: 1, stone: 2 } as const;

export function ruinWaterStrip() {
  return strip([sunkenSlab, stubInWater, steppingStone]);
}

// --- Mosaico da arena -------------------------------------------------------------------------

/** Raio do mosaico (px) e lado do quadro (o centro do quadro vai no centro da arena). */
export const MOSAIC_RADIUS = 104;
export const MOSAIC_SIZE = MOSAIC_RADIUS * 2 + 8;

/**
 * Mosaico do culto da Hidra no chão da arena, em tesselas de 4 px: borda de pedra escura com pontos claros, faixa de
 * ondas verde-serpente e, no miolo creme, as três cabeças da Hidra saindo de um disco. Gasto pelo tempo: tesselas
 * faltando (aparece a argamassa), manchas que já se foram (aparece a laje de baixo) e musgo entrando pela borda.
 */
export function mosaicCanvas() {
  const { canvas, ctx } = makeCanvas(MOSAIC_SIZE, MOSAIC_SIZE);
  const c0 = MOSAIC_SIZE / 2;
  const CREAM = ["#a49c7e", "#aea688", "#998f72"];
  const SERP = ["#3a5e50", "#42685a", "#335446"];
  const DARK = ["#45453a", "#4c4c40", "#3f3f35"];
  const RED = ["#7a4634", "#84503c", "#6e3e2e"];
  const GROUT = "#57574a";
  const neck = (px0: number, py0: number) => {
    // Distância até a linha de um dos três pescoços (ondulados), e até as cabeças.
    let best = Infinity;
    let head = Infinity;
    for (let k = 0; k < 3; k++) {
      const base = -Math.PI / 2 + (k * Math.PI * 2) / 3;
      for (let t = 18; t <= 76; t += 2) {
        const a = base + Math.sin(t / 11 + k) * 0.22;
        const nx = Math.cos(a) * t;
        const ny = Math.sin(a) * t;
        best = Math.min(best, Math.hypot(px0 - nx, py0 - ny));
      }
      const a = base + Math.sin(78 / 11 + k) * 0.22;
      head = Math.min(head, Math.hypot(px0 - Math.cos(a) * 80, py0 - Math.sin(a) * 80));
    }
    return { best, head };
  };
  for (let ty = 0; ty < MOSAIC_SIZE; ty += 3)
    for (let tx = 0; tx < MOSAIC_SIZE; tx += 3) {
      const mx = tx + 1.5 - c0;
      const my = ty + 1.5 - c0;
      const r = Math.hypot(mx, my);
      if (r > MOSAIC_RADIUS) continue;
      // Manchas gastas: some a tessela (fica a laje) ou só a cor (fica a argamassa).
      const wear = wrapNoise(tx, ty, 24, 1024, 970) + (hash(tx, ty, 971) - 0.5) * 0.25;
      if (wear < 0.2 || (r > MOSAIC_RADIUS - 6 && hash(tx, ty, 972) < 0.5)) continue;
      let pal: string[];
      if (r > MOSAIC_RADIUS - 10) pal = (Math.round(Math.atan2(my, mx) * 14) % 3 === 0) ? CREAM : DARK;
      else if (r > MOSAIC_RADIUS - 26) {
        const wave = Math.sin(Math.atan2(my, mx) * 12) * 5;
        pal = Math.abs(r - (MOSAIC_RADIUS - 18) - wave) < 3.5 ? SERP : DARK;
      } else if (r > MOSAIC_RADIUS - 30) pal = RED;
      else {
        const { best, head } = neck(mx, my);
        if (r < 16) pal = r < 10 ? RED : DARK;
        else if (head < 10) pal = head < 4 ? RED : head < 7 ? SERP : DARK;
        else if (best < 5) pal = SERP;
        else if (best < 7.5) pal = DARK;
        else pal = CREAM;
      }
      let color = pal[Math.floor(hash(tx, ty, 973) * pal.length)];
      if (wear < 0.27) color = hash(tx, ty, 978) < 0.5 ? GROUT : STONE.mid;
      // Musgo entrando pela borda.
      if (r > MOSAIC_RADIUS - 16 && wrapNoise(tx, ty, 16, 1024, 974) > 0.66) color = hash(tx, ty, 975) < 0.5 ? MOSS.mid : MOSS.dark;
      // Tessela de 3 px com a argamassa clara (o desenho lê inteiro, sem virar grade).
      ctx.fillStyle = GROUT;
      ctx.fillRect(tx, ty, 3, 3);
      ctx.fillStyle = color;
      ctx.fillRect(tx, ty, 3 - (hash(tx, ty, 976) < 0.5 ? 1 : 0), 3 - (hash(tx, ty, 977) < 0.5 ? 1 : 0));
    }
  return canvas;
}
