import { TILE_SIZE } from "@kusa/shared";
import { Sheet, blob, hash, line, makeCanvas, px, strip, type Ctx } from "./pixels.ts";
import { ragged, sideBand } from "./desertDecor.ts";

/**
 * Arte própria do Pântano, pixel a pixel. Luz baça vindo de cima à esquerda (sombras para baixo e para a direita),
 * tons fechados de verde, lama e água escura cor de chá. Os ladrilhos do chão (capim, musgo, lama, água, a copa da
 * mata fechada e as tábuas das passarelas) fecham nas bordas, então se repetem sem emenda; as bordas (margem com
 * lodo, capim invadindo a lama, a beira da copa com os troncos aparecendo) são quadros que o `marshMap.ts` combina
 * por tile. As árvores soltas são sprites maiores que o tile: tronco e copa (que balança e fica transparente com
 * alguém embaixo), em 4 espécies do brejo: cipreste-calvo com barba-de-velho, salgueiro-chorão, mangue com raízes
 * em arco e árvore morta.
 */

const T = TILE_SIZE;

/** Capim do brejo: verde fechado, do pé ao brilho da ponta. */
const GRASS = { deep: "#25401f", shade: "#2f4f26", mid: "#3a5d2c", light: "#4a7034", glow: "#5f8840", tip: "#7da34f" };
/** Musgo fofo (perto das árvores): almofadas com luz em cima. */
const MOSS = { crev: "#22381a", dark: "#355a24", mid: "#46712d", light: "#5c8a36", glow: "#7aa645" };
/** Lama da beira d'água. */
const MUD = { deep: "#2a2216", shade: "#352b1c", mid: "#433724", light: "#544630", wet: "#2b3125", glint: "#6a6f58" };
/** Água escura do pântano: cor de chá esverdeado. */
const WATER = { deep: "#14231c", mid: "#1b2e24", shallow: "#25392b", murk: "#2f3a26", light: "#3b5540", glint: "#8fae94" };
/** Lodo e lentilha-d'água boiando na margem. */
const SCUM = { dark: "#3d5a24", mid: "#55782c", light: "#739a38" };
/** Copa da mata fechada. */
const CANOPY = { o: "#0a170c", crev: "#132816", dark: "#1b3a1d", mid: "#264d24", light: "#34632e", glow: "#4b7e3a" };
/** Copa mais clara e amarelada (cipreste) e mais azulada, para a mata não ser de um tom só. */
const CANOPY_OLIVE = { dark: "#2b3d1a", mid: "#3d5523", light: "#516e2c", glow: "#6b8a36" };
const CANOPY_BLUE = { dark: "#173326", mid: "#1f4431", light: "#2b583c", glow: "#3d7048" };
/** Barba-de-velho (musgo-espanhol) pendurada nos galhos. */
const SPANISH = { dark: "#5d6b52", mid: "#7f8e70", light: "#a3b092" };
/** Casca do cipreste: cinza avermelhado, fibrosa. */
const BARK = { o: "#1b130d", dark: "#3d2f25", mid: "#5c4838", light: "#7d6650", glow: "#9c8468" };
/** Madeira morta, cinza e lavada. */
const DEADWOOD = { o: "#1f1d1a", dark: "#4a463e", mid: "#6e6a60", light: "#8f8a7e", glow: "#aca697" };
/** Tábuas das passarelas. */
const PLANK = { gap: "#120d07", dark: "#4a3620", mid: "#6b4f30", light: "#86653e", glow: "#a07d4e", nail: "#8d8f86" };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const mod = (v: number, n: number) => ((v % n) + n) % n;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Pontilhado ordenado (0..1) que fecha a cada 4 px: troca de tom sem faixa reta. */
const bayer = (x: number, y: number) => (BAYER[mod(y, 4) * 4 + mod(x, 4)] + 0.5) / 16;

/** Ruído suave em grade de `cell` px que fecha a cada `period` px (o ladrilho não marca emenda). */
function wrapNoise(x: number, y: number, cell: number, period: number, seed: number) {
  const n = period / cell;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = smooth(x / cell - gx);
  const fy = smooth(y / cell - gy);
  const h = (i: number, j: number) => hash(mod(i, n), mod(j, n), seed);
  return lerp(lerp(h(gx, gy), h(gx + 1, gy), fx), lerp(h(gx, gy + 1), h(gx + 1, gy + 1), fx), fy);
}

/**
 * Células (ruído de Worley) que fecham a cada `period` px: para o pixel, o centro mais perto (deslocamento com sinal),
 * a distância até ele e até o segundo mais perto. `cell` é o lado da grade de centros (um centro por casa).
 */
function worley(x: number, y: number, cell: number, period: number, seed: number) {
  const n = period / cell;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  let d1 = Infinity;
  let d2 = Infinity;
  let dx = 0;
  let dy = 0;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = mod(gx + i, n);
      const cy = mod(gy + j, n);
      const sx = (gx + i) * cell + hash(cx, cy, seed) * cell;
      const sy = (gy + j) * cell + hash(cx, cy, seed + 1) * cell;
      const d = Math.hypot(x - sx, y - sy);
      if (d < d1) { d2 = d1; d1 = d; dx = x - sx; dy = y - sy; id = cy * n + cx; }
      else if (d < d2) d2 = d;
    }
  return { d1, d2, dx, dy, id };
}

// --- Ladrilhos do chão -----------------------------------------------------------

/**
 * Capim do brejo: manchas suaves de tom e folhinhas de capim (risquinhos de pé, escuros no pé e claros na ponta),
 * que embrulham na borda do tile. 4: touceira alta; 5: trevos.
 */
function grassTile(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        // Só ruído miúdo: as manchas grandes vêm do tint do mapa (contínuo de um tile para o outro).
        const n = wrapNoise(x, y, 4, T, 510 + variant) + (bayer(x, y) - 0.5) * 0.3;
        let c = n < 0.22 ? GRASS.deep : n < 0.42 ? GRASS.shade : n < 0.78 ? GRASS.mid : GRASS.light;
        const g = hash(x, y, 520 + variant);
        if (g < 0.035) c = GRASS.light;
        else if (g < 0.06) c = GRASS.deep;
        px(ctx, x, y, c);
      }
    const blade = (bx: number, by: number, h: number, lean: number) => {
      for (let k = 0; k < h; k++) {
        const x = mod(bx + (k === h - 1 ? lean : 0), T);
        const y = mod(by - k, T);
        px(ctx, x, y, k === h - 1 ? GRASS.tip : k === 0 ? GRASS.deep : k === h - 2 ? GRASS.glow : GRASS.light);
      }
    };
    for (let i = 0; i < 30; i++) {
      const l = hash(i, variant, 532);
      blade(Math.floor(hash(i, variant, 530) * T), Math.floor(hash(i, variant, 531) * T), 2 + Math.floor(hash(i, variant, 533) * 3), l < 0.3 ? -1 : l > 0.7 ? 1 : 0);
    }
    if (variant === 4) {
      blob(ctx, 16, 21, 7, 3, { o: GRASS.deep, m: GRASS.deep, l: GRASS.shade, d: GRASS.deep });
      for (let i = 0; i < 16; i++) blade(10 + Math.floor(hash(i, 534) * 13), 21 + Math.floor(hash(i, 535) * 3), 5 + Math.floor(hash(i, 536) * 4), i % 3 - 1);
    }
    if (variant === 5) {
      for (const [x, y] of [[8, 9], [21, 14], [13, 24], [25, 26]]) {
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0]]) px(ctx, x + dx, y + dy, GRASS.glow);
        px(ctx, x, y, GRASS.tip);
        px(ctx, x, y + 1, GRASS.deep);
      }
    }
  };
}

export const GRASS_VARIANTS = 6;

export function grassStrip() {
  return strip(Array.from({ length: GRASS_VARIANTS }, (_, v) => grassTile(v)));
}

/**
 * Lama: grão fino pontilhado (as manchas grandes vêm do tint do mapa), torrões com luz em cima e um reflexo
 * molhado aqui e ali. 2: pedrinhas; 3: capim ralo.
 */
function mudTile(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const g = hash(x, y, 550 + variant);
        let c = g < 0.12 ? MUD.deep : g < 0.32 ? MUD.shade : g < 0.9 ? MUD.mid : MUD.light;
        if (hash(x, y, 556 + variant) < 0.012) c = MUD.glint;
        px(ctx, x, y, c);
      }
    // Torrões: manchinhas achatadas, claras em cima e com sombra embaixo (embrulham na borda).
    for (let i = 0; i < 7; i++) {
      const cx = Math.floor(hash(i, variant, 551) * T);
      const cy = Math.floor(hash(i, variant, 552) * T);
      const rx = 2 + Math.floor(hash(i, variant, 553) * 3);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -rx; dx <= rx; dx++) {
          if (Math.abs(dx) === rx && dy !== 0) continue;
          px(ctx, mod(cx + dx, T), mod(cy + dy, T), dy < 0 ? MUD.light : dy > 0 ? MUD.deep : MUD.mid);
        }
    }
    if (variant === 2) {
      for (const [x, y, r] of [[9, 12, 1.6], [22, 20, 2], [14, 25, 1.2]]) {
        px(ctx, x - r + 1, y + r, "rgba(0,0,0,0.3)", r * 2, 1);
        blob(ctx, x, y, r + 0.5, r * 0.8, { o: "#1d1912", m: "#5d584a", l: "#7d7766", d: "#46423a" });
      }
    }
    if (variant === 3) {
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(hash(i, 558) * 28) + 2;
        const y = Math.floor(hash(i, 559) * 26) + 4;
        line(ctx, x, y, x + (i % 3) - 1, y - 3, GRASS.light);
        px(ctx, x, y, GRASS.shade);
      }
    }
  };
}

export const MUD_VARIANTS = 4;

export function mudStrip() {
  return strip(Array.from({ length: MUD_VARIANTS }, (_, v) => mudTile(v)));
}

/**
 * Água do pântano. 0 e 1: rasa (beira, o fundo de lama aparece em manchas); 2: funda e parada, quase preta, com
 * reflexos compridos e lentos.
 */
function waterTile(kind: number) {
  return (ctx: Ctx) => {
    const deep = kind === 2;
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const w = Math.sin((2 * Math.PI * (x + 3 * Math.sin((2 * Math.PI * y) / T + kind))) / 32 + (y * 2 * Math.PI) / 16 + kind * 2);
        const murk = wrapNoise(x, y, 8, T, 560 + kind);
        // Rasa e funda dividem o tom do meio: a troca de uma para a outra não marca emenda.
        let c = deep ? (w > 0.1 ? WATER.mid : WATER.deep) : murk > 0.8 && bayer(x, y) < 0.25 ? WATER.murk : w < 0.3 ? WATER.mid : WATER.shallow;
        if (w > 0.95) c = deep ? WATER.shallow : WATER.light;
        if (hash(x, y, 565 + kind) < (deep ? 0.003 : 0.006)) c = WATER.glint;
        px(ctx, x, y, c);
      }
  };
}

export function waterStrip() {
  return strip([waterTile(0), waterTile(1), waterTile(2)]);
}

/**
 * Tábuas das passarelas por cima da água escura. 0 e 1: passarela de leste a oeste (tábuas atravessadas, de pé);
 * 2 e 3: de norte a sul (tábuas deitadas). Uma ou outra tábua torta ou faltando; pregos nas pontas.
 */
function plankTile(vertical: boolean, variant: number) {
  return (ctx: Ctx) => {
    waterTile(2)(ctx);
    const across = (i: number, d: number) => (vertical ? [d, i] : [i, d]) as [number, number];
    // Vigas por baixo, nas duas beiradas.
    for (let i = 0; i < T; i++) {
      for (const d of [4, 27]) {
        const [x, y] = across(i, d);
        px(ctx, x, y, PLANK.dark);
      }
    }
    // Tábuas de 5 px com fresta de 1.
    for (let b = 0; b < T / 6 + 1; b++) {
      const from = b * 6 - (variant ? 3 : 0);
      if (hash(b, variant, 570) < 0.06) continue; // tábua que caiu
      const jag0 = 3 + Math.floor(hash(b, variant, 571) * 2);
      const jag1 = 28 - Math.floor(hash(b, variant, 572) * 2);
      const tone = hash(b, variant, 573);
      for (let k = 0; k < 5; k++) {
        const i = from + k;
        if (i < 0 || i >= T) continue;
        for (let d = jag0; d <= jag1; d++) {
          const [x, y] = across(i, d);
          let c = k === 0 ? PLANK.glow : k === 4 ? PLANK.dark : tone < 0.3 ? PLANK.light : PLANK.mid;
          if (d === jag0 || d === jag1) c = PLANK.dark;
          else if (k > 0 && k < 4 && hash(i, d, 574 + variant) < 0.08) c = PLANK.dark; // veios
          px(ctx, x, y, c);
        }
        for (const d of [jag0 + 2, jag1 - 2]) if (k === 2) { const [x, y] = across(i, d); px(ctx, x, y, PLANK.nail); }
      }
      // Fresta escura entre as tábuas.
      const gap = from + 5;
      if (gap >= 0 && gap < T) for (let d = jag0; d <= jag1; d++) { const [x, y] = across(gap, d); px(ctx, x, y, PLANK.gap); }
    }
    // Lodo grudado na beira das tábuas.
    for (let i = 0; i < T; i++) {
      if (hash(i, variant, 575) < 0.3) { const [x, y] = across(i, 2); px(ctx, x, y, SCUM.dark); }
      if (hash(i, variant, 576) < 0.3) { const [x, y] = across(i, 29); px(ctx, x, y, SCUM.mid); }
    }
  };
}

export const PLANK_FRAMES = { horizontal: [0, 1], vertical: [2, 3] } as const;

export function plankStrip() {
  return strip([plankTile(false, 0), plankTile(false, 1), plankTile(true, 0), plankTile(true, 1)]);
}

// --- Copa da mata fechada -------------------------------------------------------------

/** A copa fecha a cada 3×3 tiles: o tile (x, y) usa o pedaço (x mod 3, y mod 3) e a mata não tem emenda. */
export const CANOPY_PERIOD = 3;
export const CANOPY_VARIANTS = CANOPY_PERIOD * CANOPY_PERIOD;
const CP = T * CANOPY_PERIOD;

/** Variação da copa para o tile (x, y). */
export const canopyVariant = (x: number, y: number) => mod(x, CANOPY_PERIOD) + CANOPY_PERIOD * mod(y, CANOPY_PERIOD);

/**
 * Cor da copa no pixel (x, y) da textura de 96×96: tufos redondos de folhas (células), com luz em cima à esquerda,
 * frestas escuras entre eles e pontinhos de folha. Alguns tufos são mais amarelados (ciprestes) ou mais azulados.
 */
function canopyPixel(x: number, y: number) {
  // Tufos grandes (copas vizinhas), cada um em cúpula; dentro deles, tufinhos de folhas que dão a textura.
  // Coordenadas entortadas: a borda das copas sai ondulada e recortada, não em polígono.
  const wx = x + (wrapNoise(x, y, 8, CP, 584) - 0.5) * 9 + (wrapNoise(x, y, 3, CP, 586) - 0.5) * 3;
  const wy = y + (wrapNoise(x, y, 8, CP, 585) - 0.5) * 9 + (wrapNoise(x, y, 3, CP, 587) - 0.5) * 3;
  const big = worley(mod(wx, CP), mod(wy, CP), 16, CP, 580);
  const leaf = worley(x, y, 4, CP, 590);
  const kind = hash(big.id, 582);
  const pal = kind < 0.16 ? CANOPY_OLIVE : kind < 0.3 ? CANOPY_BLUE : CANOPY;
  // Cada copa é uma cúpula: clara em cima à esquerda, escura embaixo à direita (a troca de uma para a outra já
  // marca a divisa). Os tufinhos de folhas dão a textura por cima.
  let t = (big.dx * 0.8 + big.dy) / 12 + ((leaf.dx + leaf.dy) / 4) * 0.4;
  if (big.d2 - big.d1 < 1.2 && big.dx + big.dy > 0) t += 0.5;
  t += (bayer(x, y) - 0.5) * 0.45;
  const g = hash(x, y, 583);
  if (g < 0.05) t -= 0.7;
  const tones = [pal.glow, pal.light, pal.mid, pal.dark, CANOPY.crev, CANOPY.o];
  return tones[Math.max(0, Math.min(5, Math.floor((t + 1.15) * 1.9)))];
}

/** Copa inteira (tiles de dentro da mata): 9 pedaços da textura de 96×96, na ordem de `canopyVariant`. */
export function canopyStrip() {
  return strip(Array.from({ length: CANOPY_VARIANTS }, (_, v) => (ctx: Ctx) => {
    const ox = (v % CANOPY_PERIOD) * T;
    const oy = Math.floor(v / CANOPY_PERIOD) * T;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(ctx, x, y, canopyPixel(ox + x, oy + y));
  }));
}

/** Bits da beira da copa: lados abertos (N, L, S, O) e quinas abertas (NE, NO, SE, SO). */
export const RIM = { side: [1, 2, 4, 8], corner: [16, 32, 64, 128] } as const;

/**
 * Beira da copa num tile de mata (32×32, por cima do chão): a copa recua dos lados abertos com borda recortada e
 * arredonda as pontas. Do lado sul ela sobe e deixa ver o que está embaixo: a sombra, os troncos (cinza-avermelhados,
 * com o pé alargado) e a barba-de-velho pendurada na beira. Contorno escuro embaixo e à direita, luz em cima.
 */
export function canopyRim(ctx: Ctx, mask: number, variant: number) {
  const open = RIM.side.map((bit) => (mask & bit) !== 0);
  const corner = RIM.corner.map((bit) => (mask & bit) !== 0);
  const ox = (variant % CANOPY_PERIOD) * T;
  const oy = Math.floor(variant / CANOPY_PERIOD) * T;
  const seed = 600 + variant * 13;
  // Quanto a copa recua de cada lado aberto, pixel a pixel (sem emenda com o tile vizinho).
  const inset = [
    (i: number) => ragged(i, 3, 3, seed),
    (i: number) => ragged(i, 3, 3, seed + 3),
    (i: number) => ragged(i, 12, 4, seed + 5),
    (i: number) => ragged(i, 3, 3, seed + 7),
  ];
  const R = 7;
  const covered = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= T || y >= T) {
      // Fora do tile: coberto se o vizinho daquele lado é mata (para o contorno não aparecer na emenda).
      if (y < 0) return !open[0];
      if (x >= T) return !open[1];
      if (y >= T) return !open[2];
      return !open[3];
    }
    const top = open[0] ? inset[0](x) : -99;
    const right = open[1] ? T - 1 - inset[1](y) : 99;
    const bottom = open[2] ? T - 1 - inset[2](x) : 99;
    const left = open[3] ? inset[3](y) : -99;
    if (y < top || x > right || y > bottom || x < left) return false;
    // Pontas arredondadas onde dois lados abertos se encontram.
    const round = (cx: number, cy: number, sx: number, sy: number) =>
      (x - cx) * sx > 0 && (y - cy) * sy > 0 && Math.hypot(x - cx, y - cy) > R;
    if (open[0] && open[3] && round(left + R, top + R, -1, -1)) return false;
    if (open[0] && open[1] && round(right - R, top + R, 1, -1)) return false;
    if (open[2] && open[3] && round(left + R, bottom - R, -1, 1)) return false;
    if (open[2] && open[1] && round(right - R, bottom - R, 1, 1)) return false;
    // Quina aberta (os dois lados fechados): mordida pequena.
    const bite = (cx: number, cy: number) => Math.hypot(x - cx, y - cy) < 4 + hash(x, y, seed + 9) * 1.5;
    if (corner[0] && !open[0] && !open[1] && bite(T - 1, 0)) return false;
    if (corner[1] && !open[0] && !open[3] && bite(0, 0)) return false;
    if (corner[2] && !open[2] && !open[1] && bite(T - 1, T - 1 + 8)) return false;
    if (corner[3] && !open[2] && !open[3] && bite(0, T - 1 + 8)) return false;
    return true;
  };

  // Embaixo da copa, do lado sul: sombra no chão, troncos e raízes.
  if (open[2]) {
    const lowest = Math.min(...Array.from({ length: T }, (_, i) => T - 1 - inset[2](i)));
    for (let y = lowest - 2; y < T; y++)
      for (let x = 0; x < T; x++) {
        if (covered(x, y)) continue;
        const fade = (y - lowest) / (T - lowest);
        px(ctx, x, y, `rgba(4,12,6,${(0.62 - fade * 0.4).toFixed(2)})`);
      }
    const trunks = 1 + Math.floor(hash(variant, 610) * 2.4);
    for (let k = 0; k < trunks; k++) {
      const cx = 5 + Math.floor(((k + hash(variant, k, 611)) / trunks) * 22);
      const half = 1.5 + hash(variant, k, 612) * 1.5;
      const footY = T - 2 - Math.floor(hash(variant, k, 613) * 4);
      for (let y = lowest - 4; y <= footY; y++) {
        const t = (footY - y) / 6;
        const w = half + (t < 1 ? (1 - t) * 2.5 : 0); // pé alargado
        for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
          const u = (x - cx) / w;
          if (Math.abs(u) > 1) continue;
          let c = u < -0.4 ? BARK.light : u > 0.45 ? BARK.dark : BARK.mid;
          if (hash(x, y, 614) < 0.15) c = BARK.dark; // fibras
          if (Math.abs(u) > 0.85) c = BARK.o;
          px(ctx, x, y, c);
        }
      }
      // Raízes e o pé no chão escuro.
      px(ctx, cx - half - 4, footY, BARK.dark, 3, 1);
      px(ctx, cx + half + 2, footY, BARK.o, 3, 1);
    }
  }

  // A copa: pixels cobertos, com contorno e luz na borda.
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      if (!covered(x, y)) continue;
      const n = !covered(x, y - 1);
      const s = !covered(x, y + 1);
      const e = !covered(x + 1, y);
      const w = !covered(x - 1, y);
      let c = canopyPixel(ox + x, oy + y);
      if (s || e) c = CANOPY.o;
      else if (n || w) c = CANOPY.glow;
      else if (!covered(x, y - 2) || !covered(x - 2, y)) c = CANOPY.light;
      else if (!covered(x, y + 2) || !covered(x + 2, y)) c = CANOPY.crev;
      px(ctx, x, y, c);
    }

  // Barba-de-velho pendurada na beira sul (por cima da sombra e dos troncos).
  if (open[2]) {
    for (let k = 0; k < 7; k++) {
      const x = 2 + Math.floor(hash(variant, k, 620) * 28);
      let y = T - 1 - inset[2](x);
      while (y > 0 && !covered(x, y)) y--;
      const len = 3 + Math.floor(hash(variant, k, 621) * 8);
      for (let d = 1; d <= len; d++) {
        const sway = d > len * 0.6 && hash(variant, k, 622) < 0.5 ? 1 : 0;
        px(ctx, x + sway, y + d, d === len ? SPANISH.dark : d % 3 === 0 ? SPANISH.light : SPANISH.mid);
      }
    }
  }
}

// --- Bordas no chão ------------------------------------------------------------------

/**
 * Margem, desenhada no tile de água: lama da beira, a linha escura molhada e uma faixa de lodo verde boiando.
 * Quadros 0-3: lados N, L, S, O; 4-7: cantos de dentro NE, NO, SE, SO; 8-11: cantos de fora (arredondam a ponta).
 */
export function marshShoreStrip() {
  const band = (d: number, edge: number, i: number, s: number) => {
    if (d < edge) return hash(i, d, 630 + s) < 0.2 ? MUD.wet : MUD.shade;
    if (d === edge) return MUD.deep;
    const scum = hash(i, d, 631 + s);
    if (d <= edge + 2) return scum < 0.55 ? SCUM.mid : scum < 0.8 ? SCUM.light : null;
    if (d <= edge + 4) return scum < 0.3 ? SCUM.dark : null;
    return null;
  };
  const side = (s: number) => (ctx: Ctx) => {
    sideBand(ctx, s, (i) => ragged(i, 8, 3, s * 7 + 31), (d, i) => band(d, ragged(i, 3, 2, s * 7 + 32), i, s));
  };
  const corner = (cx: number, cy: number) => (ctx: Ctx) => {
    const ox = cx > 0 ? T - 1 : 0;
    const oy = cy < 0 ? 0 : T - 1;
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const d = Math.round(Math.hypot(x - ox, y - oy) + (hash(x, y, 633) - 0.5) * 1.5);
        const c = band(d, 3, x + y, 9);
        if (c) px(ctx, x, y, c);
      }
  };
  const outer = (cx: number, cy: number) => (ctx: Ctx) => {
    const ox = cx > 0 ? 6 : T - 7;
    const oy = cy < 0 ? T - 7 : 6;
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const inQuarter = (cx > 0 ? x > ox : x < ox) && (cy < 0 ? y < oy : y > oy);
        if (!inQuarter) continue;
        const d = Math.round(25 - Math.hypot(x - ox, y - oy) + (hash(x, y, 634) - 0.5) * 1.5);
        const c = band(d, 3, x * 3 + y, 10);
        if (c) px(ctx, x, y, c);
      }
  };
  return strip([
    side(0), side(1), side(2), side(3), corner(1, -1), corner(-1, -1), corner(1, 1), corner(-1, 1),
    outer(1, -1), outer(-1, -1), outer(1, 1), outer(-1, 1),
  ]);
}

/**
 * Capim invadindo a lama (no tile de lama). Quadros 0-3: lados N, L, S, O, com borda recortada e folhinhas soltas;
 * 4-7: quina de dentro NE, NO, SE, SO (tufo de capim só na quina); 8-11: quina de fora (capim nos dois lados, a
 * lama fica arredondada).
 */
export function marshFringeStrip() {
  const grassAt = (x: number, y: number) => {
    const g = hash(x, y, 644);
    return g < 0.1 ? GRASS.light : g < 0.2 ? GRASS.shade : GRASS.mid;
  };
  const corner = (cx: number, cy: number, outer: boolean) => (ctx: Ctx) => {
    const ox = cx > 0 ? T - 1 : 0;
    const oy = cy < 0 ? 0 : T - 1;
    // De fora: centro do arco 12 px para dentro da quina; o que fica além do arco, no quadrante da quina, é capim.
    const ax = ox - cx * 12;
    const ay = oy + (cy < 0 ? 12 : -12);
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const noise = (hash(x, y, 645) - 0.5) * 2;
        let grass: boolean;
        let rim: boolean;
        if (outer) {
          const inQuad = (cx > 0 ? x >= ax : x <= ax) && (cy < 0 ? y <= ay : y >= ay);
          const r = Math.hypot(x - ax, y - ay) + noise;
          grass = inQuad && r > 7;
          rim = r < 8.2;
        } else {
          const r = Math.hypot(x - ox, y - oy) + noise;
          grass = r < 7;
          rim = r > 5.8;
        }
        if (grass) px(ctx, x, y, rim ? (hash(x, y, 646) < 0.5 ? GRASS.deep : GRASS.shade) : grassAt(x, y));
      }
  };
  const sides = [0, 1, 2, 3].map((s) => (ctx: Ctx) => {
    sideBand(ctx, s, (i) => ragged(i, 5, 4, s * 5 + 41), (d, i) => {
      const n = ragged(i, 5, 4, s * 5 + 41);
      if (d === n - 1) return hash(i, d, 640 + s) < 0.5 ? GRASS.deep : null;
      const g = hash(i, d, 641 + s);
      return g < 0.1 ? GRASS.light : g < 0.2 ? GRASS.shade : GRASS.mid;
    });
    for (let k = 0; k < 8; k++) {
      const i = 2 + Math.floor(hash(k, s, 642) * 28);
      const d = 5 + Math.floor(hash(k, s, 643) * 5);
      const [x, y] = s === 0 ? [i, d] : s === 1 ? [T - 1 - d, i] : s === 2 ? [i, T - 1 - d] : [d, i];
      px(ctx, x, y, GRASS.tip);
      px(ctx, x, y + 1, GRASS.shade);
    }
  });
  return strip([
    ...sides, corner(1, -1, false), corner(-1, -1, false), corner(1, 1, false), corner(-1, 1, false),
    corner(1, -1, true), corner(-1, -1, true), corner(1, 1, true), corner(-1, 1, true),
  ]);
}

// --- Árvores soltas -------------------------------------------------------------------

/** Quadro do tronco e da copa (px). O pé do tronco fica em `TREE_FOOT` dentro do quadro do tronco. */
export const TREE_TRUNK = { w: 64, h: 96 };
export const TREE_CROWN = { w: 120, h: 112 };
export const TREE_FOOT = { x: 32, y: 92 };
/** Ponto da copa que encaixa no topo do tronco. */
export const TREE_CROWN_ANCHOR = { x: 60, y: 76 };

export type TreeSpecies = "cypress" | "willow" | "mangrove" | "dead";
/** As variações, na ordem das folhas (cada espécie com 2 ou 3). */
export const TREES: readonly { species: TreeSpecies; height: number; lean: number }[] = [
  { species: "cypress", height: 46, lean: 2 },
  { species: "cypress", height: 54, lean: -3 },
  { species: "cypress", height: 40, lean: 5 },
  { species: "willow", height: 30, lean: 4 },
  { species: "willow", height: 34, lean: -5 },
  { species: "willow", height: 28, lean: 1 },
  { species: "mangrove", height: 28, lean: 1 },
  { species: "mangrove", height: 32, lean: -2 },
  { species: "dead", height: 44, lean: 5 },
  { species: "dead", height: 40, lean: -4 },
];
export const TREE_VARIANTS = TREES.length;

/** Topo do tronco de uma variação (onde a copa encaixa), em px dentro do quadro do tronco. */
export function treeTop(variant: number) {
  const t = TREES[variant];
  return { x: TREE_FOOT.x + t.lean, y: TREE_FOOT.y - t.height };
}

/** Tronco que afina do pé ao topo, inclinado; `flare` alarga o pé (raízes tabulares do cipreste). */
function paintTrunk(sheet: Sheet, variant: number, pal: typeof BARK, base: number, flare: number) {
  const top = treeTop(variant);
  const foot = TREE_FOOT;
  for (let y = top.y; y <= foot.y; y++) {
    const t = (foot.y - y) / (foot.y - top.y);
    const cx = lerp(foot.x, top.x, t * t);
    const half = base * (1 - t * 0.45) + (t < 0.3 ? ((0.3 - t) / 0.3) ** 1.6 * flare : 0);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x - cx) / half;
      if (Math.abs(u) > 1) continue;
      let c = u < -0.5 ? pal.light : u < -0.15 ? pal.mid : u > 0.5 ? pal.dark : pal.mid;
      if (u < -0.7 && hash(x, y, 650) < 0.4) c = pal.glow;
      // Fibras e sulcos verticais (no pé, as costelas das raízes).
      const groove = Math.sin(x * 1.7 + variant) > 0.82;
      if (groove || hash(x, y, 651 + variant) < 0.1) c = pal.dark;
      sheet.set(x, y, c);
    }
  }
}

/** Tufo de folhas: disco com luz em cima à esquerda e borda recortada. */
function clump(sheet: Sheet, cx: number, cy: number, rx: number, ry: number, pal: { dark: string; mid: string; light: string; glow: string }, seed: number) {
  for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
    for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1 - hash(x, y, seed) * 0.22) continue;
      const u = (x - cx) / rx + (y - cy) / ry;
      let c = u < -0.8 ? pal.glow : u < -0.25 ? pal.light : u > 0.65 ? pal.dark : pal.mid;
      if (hash(x, y, seed + 1) < 0.08) c = u < 0 ? pal.glow : pal.dark;
      sheet.set(x, y, c);
    }
}

/** Fio de barba-de-velho caindo de (x, y), com um balanço leve. */
function spanishMoss(sheet: Sheet, x: number, y: number, len: number, seed: number) {
  for (let d = 0; d < len; d++) {
    const sway = Math.round(Math.sin(d / 3 + seed) * 0.8);
    sheet.set(x + sway, y + d, d === len - 1 ? SPANISH.dark : hash(d, seed, 655) < 0.3 ? SPANISH.light : SPANISH.mid);
    if (d > 1 && d < len - 2 && hash(d, seed, 656) < 0.25) sheet.set(x + sway + (hash(d, seed, 657) < 0.5 ? -1 : 1), y + d, SPANISH.mid);
  }
}

const CYPRESS = { dark: "#2e421f", mid: "#435c29", light: "#5c7832", glow: "#7b973f" };
const WILLOW = { dark: "#34521f", mid: "#4a6e2a", light: "#638c34", glow: "#80a843" };
const WILLOW_BACK = { dark: "#1f3514", mid: "#29421a", light: "#365520", glow: "#466a28" };
const MANGROVE = { dark: "#173a20", mid: "#22502a", light: "#326a35", glow: "#4c8a46" };
const ROOT = { o: "#1d140c", dark: "#3f2f20", mid: "#5d4630", light: "#7a603f", glow: "#957a52" };

function treeTrunk(variant: number) {
  const { species } = TREES[variant];
  const sheet = new Sheet(TREE_TRUNK.w, TREE_TRUNK.h);
  const foot = TREE_FOOT;
  if (species === "cypress") {
    paintTrunk(sheet, variant, BARK, 3.2, 9);
  } else if (species === "willow") {
    paintTrunk(sheet, variant, BARK, 4.4, 4);
    // Galhos grossos abrindo no alto, para dentro da copa.
    const top = treeTop(variant);
    for (const [dx, dy] of [[-10, -8], [9, -9], [1, -12]]) {
      for (let k = 0; k <= 10; k++) {
        const x = top.x + (dx * k) / 10;
        const y = top.y + 4 + (dy * k) / 10;
        sheet.set(x, y, k < 5 ? BARK.mid : BARK.dark);
        sheet.set(x + 1, y, BARK.dark);
        if (k < 6) sheet.set(x - 1, y, BARK.light);
      }
    }
  } else if (species === "mangrove") {
    paintTrunk(sheet, variant, ROOT, 3, 1);
    // Raízes em arco saindo do tronco e entrando no chão (ou na água), as de trás mais escuras.
    const top = treeTop(variant);
    const roots = 7;
    for (let k = 0; k < roots; k++) {
      const side = k % 2 ? 1 : -1;
      const startY = foot.y - 8 - hash(variant, k, 660) * 14;
      const startX = lerp(foot.x, top.x, (foot.y - startY) / (foot.y - top.y) * 0.3);
      const endX = foot.x + side * (6 + hash(variant, k, 661) * 18);
      const endY = foot.y + 1 - Math.floor(hash(variant, k, 662) * 3);
      const peak = { x: (startX + endX) / 2 + side * 3, y: Math.min(startY, endY) - 6 - hash(variant, k, 663) * 6 };
      const back = k < 3;
      for (let s = 0; s <= 1.0001; s += 0.04) {
        const x = (1 - s) ** 2 * startX + 2 * (1 - s) * s * peak.x + s * s * endX;
        const y = (1 - s) ** 2 * startY + 2 * (1 - s) * s * peak.y + s * s * endY;
        sheet.set(x, y, back ? ROOT.dark : ROOT.light);
        sheet.set(x, y + 1, back ? ROOT.o : ROOT.mid);
      }
    }
  } else {
    paintTrunk(sheet, variant, DEADWOOD, 3, 5);
    // Oco escuro no tronco e uma lasca arrancada.
    sheet.set(foot.x - 1, foot.y - 18, DEADWOOD.o);
    sheet.set(foot.x, foot.y - 18, DEADWOOD.o);
    sheet.set(foot.x - 1, foot.y - 17, DEADWOOD.o);
    sheet.set(foot.x, foot.y - 17, "#000000");
  }
  const { canvas, ctx } = makeCanvas(TREE_TRUNK.w, TREE_TRUNK.h);
  sheet.paint(ctx, species === "dead" ? DEADWOOD.o : BARK.o);
  return canvas;
}

function treeCrown(variant: number) {
  const { species } = TREES[variant];
  const sheet = new Sheet(TREE_CROWN.w, TREE_CROWN.h);
  const a = TREE_CROWN_ANCHOR;
  const r = (k: number) => hash(variant, k, 670);
  const moss: [number, number, number][] = [];

  if (species === "cypress") {
    // Camadas achatadas de folhagem fina, cada vez menores para cima, com a barba-de-velho caindo de cada uma.
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const y = a.y + 2 - i * 12 - r(i) * 3;
      const rx = 30 - i * 4.5 + r(i + 10) * 6;
      const shift = (r(i + 20) - 0.5) * 10;
      const pal = i % 2 ? CYPRESS : { ...CYPRESS, dark: "#26391a" };
      // Galho que segura a camada.
      for (let k = -rx * 0.7; k <= rx * 0.7; k++) sheet.set(a.x + shift + k, y + 3, BARK.dark);
      const lumps = 5 + Math.round(rx / 7);
      for (let k = 0; k < lumps; k++) {
        const t = lumps === 1 ? 0 : k / (lumps - 1) - 0.5;
        clump(sheet, a.x + shift + t * rx * 1.7, y - Math.abs(t) * -2 + r(k + 30 + i) * 2, 7 + r(k + 40) * 3, 4 + r(k + 50) * 1.5, pal, 680 + i * 7 + k);
      }
      for (let k = 0; k < 4 + (tiers - i); k++) moss.push([a.x + shift + (r(k + 60 + i * 9) - 0.5) * rx * 1.6, y + 4, 6 + Math.floor(r(k + 70 + i * 9) * (14 - i * 2))]);
    }
    clump(sheet, a.x + (r(90) - 0.5) * 6, a.y - tiers * 12 + 4, 6, 5, CYPRESS, 699);
  } else if (species === "willow") {
    // Salgueiro-chorão: copa larga e baixa, quase toda feita de ramos compridos que caem até perto do chão.
    const cx = a.x;
    const cy = a.y - 20;
    for (let k = 0; k < 7; k++) clump(sheet, cx + (k - 3) * 10, cy - 8 + Math.abs(k - 3) * 3, 10, 7, WILLOW_BACK, 700 + k);
    clump(sheet, cx - 4, cy - 14, 12, 7, WILLOW, 710);
    // Ramos de trás (escuros e mais curtos) e da frente (com luz), saindo do arco de cima e abrindo para fora.
    for (const front of [false, true]) {
      const count = front ? 44 : 34;
      for (let k = 0; k < count; k++) {
        const u = -1 + (2 * (k + r(k + (front ? 300 : 200)) * 0.8)) / count;
        const x0 = cx + u * (front ? 40 : 34);
        const y0 = cy - 18 * (1 - u * u) + (front ? 4 : -2) + r(k + 400) * 3;
        const len = (front ? 34 : 24) + r(k + (front ? 500 : 600)) * 24 - Math.abs(u) * 10;
        for (let d2 = 0; d2 < len; d2++) {
          const xx = x0 + u * d2 * 0.16 + Math.sin(d2 / 7 + k) * 0.8;
          const yy = y0 + d2;
          if (yy >= TREE_CROWN.h - 1) break;
          const pal = front ? WILLOW : WILLOW_BACK;
          const c = (d2 + k) % 5 === 0 ? pal.glow : (d2 + k) % 3 === 0 ? pal.light : k % 2 ? pal.mid : pal.dark;
          sheet.set(xx, yy, c);
          // Folhinhas compridas dos lados do ramo.
          if (d2 % 3 === 1) sheet.set(xx + (k % 2 ? 1 : -1), yy + 1, front ? pal.light : pal.mid);
        }
      }
    }
  } else if (species === "mangrove") {
    // Copa redonda e densa, folhas escuras e lustrosas, com raízes aéreas finas pendendo.
    const cx = a.x;
    const cy = a.y - 20;
    for (let k = 0; k < 11; k++) {
      const ang = (k / 11) * Math.PI * 2 + r(k);
      const d = 13 + r(k + 5) * 8;
      clump(sheet, cx + Math.cos(ang) * d * 1.25, cy + Math.sin(ang) * d * 0.8, 10, 8, MANGROVE, 730 + k);
    }
    clump(sheet, cx - 3, cy - 3, 16, 12, MANGROVE, 745);
    clump(sheet, cx - 9, cy - 9, 8, 6, { ...MANGROVE, mid: MANGROVE.light }, 746);
    for (let k = 0; k < 6; k++) {
      const x = cx - 20 + r(k + 120) * 40;
      const y0 = cy + 12 + r(k + 130) * 4;
      for (let d = 0; d < 10 + r(k + 140) * 10; d++) sheet.set(x, y0 + d, d % 5 === 4 ? ROOT.light : ROOT.mid);
    }
  } else {
    // Árvore morta: galhos retorcidos e pelados, com barba-de-velho pendurada.
    const branch = (x0: number, y0: number, ang: number, len: number, depth: number, k: number) => {
      const x1 = x0 + Math.cos(ang) * len;
      const y1 = y0 + Math.sin(ang) * len;
      const steps = Math.ceil(len);
      for (let s = 0; s <= steps; s++) {
        const x = lerp(x0, x1, s / steps);
        const y = lerp(y0, y1, s / steps);
        sheet.set(x, y, depth === 0 ? DEADWOOD.mid : DEADWOOD.light);
        if (depth === 0) { sheet.set(x + 1, y, DEADWOOD.dark); sheet.set(x - 1, y, DEADWOOD.light); }
        else if (depth === 1) sheet.set(x + 1, y, DEADWOOD.dark);
      }
      if (depth >= 1 && hash(variant, k, 750) < 0.7) moss.push([x1, y1 + 1, 4 + Math.floor(hash(variant, k, 751) * 9)]);
      if (depth >= 3) return;
      branch(x1, y1, ang - 0.45 - hash(variant, k, 752) * 0.3, len * 0.66, depth + 1, k * 3 + 1);
      branch(x1, y1, ang + 0.4 + hash(variant, k, 753) * 0.3, len * 0.6, depth + 1, k * 3 + 2);
    };
    branch(a.x, a.y + 2, -Math.PI / 2 - 0.15 + (r(1) - 0.5) * 0.3, 16, 0, 1);
    branch(a.x, a.y + 10, -Math.PI / 2 - 1.0, 14, 1, 7);
    branch(a.x, a.y + 6, -Math.PI / 2 + 0.95, 15, 1, 11);
  }

  for (const [x, y, len] of moss) spanishMoss(sheet, Math.round(x), Math.round(y), Math.min(len, TREE_CROWN.h - 1 - Math.round(y)), x * 7 + y);

  const { canvas, ctx } = makeCanvas(TREE_CROWN.w, TREE_CROWN.h);
  sheet.paint(ctx, species === "dead" ? DEADWOOD.o : "#0d1a0c");
  return canvas;
}

function sheetOf(size: { w: number; h: number }, draw: (variant: number) => HTMLCanvasElement) {
  const { canvas, ctx } = makeCanvas(size.w * TREE_VARIANTS, size.h);
  for (let v = 0; v < TREE_VARIANTS; v++) ctx.drawImage(draw(v), v * size.w, 0);
  return canvas;
}

export function treeTrunkSheet() {
  return sheetOf(TREE_TRUNK, treeTrunk);
}

export function treeCrownSheet() {
  return sheetOf(TREE_CROWN, treeCrown);
}

/** Sombra da árvore no chão: mancha recortada para baixo e à direita do pé. */
export const TREE_SHADOW = { w: 112, h: 48 };

export function treeShadowCanvas() {
  const { canvas, ctx } = makeCanvas(TREE_SHADOW.w, TREE_SHADOW.h);
  const cx = 58;
  const cy = 22;
  for (let y = 0; y < TREE_SHADOW.h; y++)
    for (let x = 0; x < TREE_SHADOW.w; x++) {
      const d = Math.hypot((x - cx) / 50, (y - cy) / 18);
      const edge = 1 - wrapNoise(x, y, 8, 112 * 4, 760) * 0.35;
      if (d > edge) continue;
      px(ctx, x, y, d > edge - 0.12 ? "rgba(4,14,6,0.2)" : "rgba(4,14,6,0.32)");
    }
  return canvas;
}

// --- Troncos caídos e tocos (muros das clareiras dos baús) ---------------------------------

const LOG = { o: "#1a110a", dark: "#3e2c1c", mid: "#5a4129", light: "#755636", glow: "#8f6c45", ring: "#b08c5a", core: "#c9a874" };
const LOG_MOSS = { dark: "#3a5a22", mid: "#4f7a2c", light: "#6a9a38" };
const FUNGUS = { o: "#3a2412", mid: "#c08a4a", light: "#e0b070", dark: "#8a5a2a" };

/**
 * Tronco caído (sprite 32×32, sorteado por cima do chão): `dir` "h" deitado de leste a oeste, "v" de norte a sul.
 * `end` -1/1 põe a ponta serrada com os anéis de um lado; 0 é o meio. Musgo em cima, orelhas-de-pau de lado.
 */
function fallenLog(dir: "h" | "v", end: -1 | 0 | 1, variant: number) {
  return (ctx: Ctx) => {
    const H = dir === "h";
    const r = 9; // raio do tronco
    const c0 = H ? 19 : 16; // eixo (y no deitado, x no em pé)
    const from = end === -1 ? 5 : 0;
    const to = end === 1 ? T - 6 : T;
    if (H) px(ctx, from + 2, c0 + r - 1, "rgba(4,12,6,0.35)", to - from, 4);
    else px(ctx, c0 - r + 3, from + 3, "rgba(4,12,6,0.35)", r * 2, to - from);
    for (let a = from; a < to; a++)
      for (let b = -r; b <= r; b++) {
        const [x, y] = H ? [a, c0 + b] : [c0 + b, a];
        const u = b / r; // -1 em cima/à esquerda (luz)
        if (Math.abs(u) > 1) continue;
        let c = Math.abs(u) > 0.88 ? LOG.o : u < -0.5 ? LOG.glow : u < -0.1 ? LOG.light : u > 0.5 ? LOG.dark : LOG.mid;
        // Casca em placas: sulcos ao longo do tronco.
        if (Math.sin(b * 1.4 + a * 0.15 + variant) > 0.85 && Math.abs(u) < 0.85) c = LOG.dark;
        // Musgo cobrindo o lado de cima.
        const mossLine = -0.95 + wrapNoise(a, variant * 5, 6, T, 770) * 0.9;
        if (u < mossLine) c = hash(a, b, 771) < 0.3 ? LOG_MOSS.light : u < mossLine - 0.2 ? LOG_MOSS.mid : LOG_MOSS.dark;
        px(ctx, x, y, c);
      }
    // Ponta serrada: os anéis.
    if (end !== 0) {
      const ex = end === -1 ? from : to - 1;
      for (let b = -r; b <= r; b++)
        for (let k = 0; k < 4; k++) {
          const d = Math.abs(b) / r;
          if (d > 1) continue;
          const [x, y] = H ? [ex + (end === -1 ? k - 2 : 2 - k), c0 + b] : [c0 + b, ex + (end === -1 ? k - 2 : 2 - k)];
          const ring = Math.round(d * 4) % 2 === 0;
          px(ctx, x, y, d > 0.85 ? LOG.o : ring ? LOG.ring : LOG.core);
        }
    }
    // Orelhas-de-pau na lateral.
    if (variant === 1) {
      for (const k of [9, 21]) {
        const [x, y] = H ? [k, c0 + r - 2] : [c0 + r - 2, k];
        blob(ctx, x, y, 3.5, 2.2, { o: FUNGUS.o, m: FUNGUS.mid, l: FUNGUS.light, d: FUNGUS.dark }, (_, yy) => yy < y - 1);
        px(ctx, x - 2, y - 1, FUNGUS.dark, 5, 1);
      }
    }
  };
}

/** Toco podre com raízes, musgo em cima e cogumelos, ou pedra grande coberta de musgo. */
function bigStump(variant: number) {
  return (ctx: Ctx) => {
    px(ctx, 9, 27, "rgba(4,12,6,0.35)", 20, 3);
    if (variant === 1) {
      blob(ctx, 16, 20, 11, 9, { o: "#16180f", m: "#5c6050", l: "#7c8068", d: "#3e4236" });
      blob(ctx, 14, 15, 9, 5, { o: "#1f3412", m: LOG_MOSS.mid, l: LOG_MOSS.light, d: LOG_MOSS.dark });
      return;
    }
    // Raízes abrindo.
    for (const [dx, len] of [[-1, 8], [1, 7], [-0.4, 6], [0.5, 6]] as const) line(ctx, 16 + dx * 6, 24, 16 + dx * (6 + len), 28, LOG.dark);
    for (let y = 10; y <= 26; y++)
      for (let x = 7; x <= 25; x++) {
        const u = (x - 16) / 9;
        if (Math.abs(u) > 1) continue;
        let c = Math.abs(u) > 0.88 ? LOG.o : u < -0.45 ? LOG.light : u > 0.5 ? LOG.dark : LOG.mid;
        if (Math.sin(x * 1.5) > 0.8) c = LOG.dark;
        px(ctx, x, y, c);
      }
    // Tampo: anéis podres, com musgo numa metade.
    blob(ctx, 16, 10, 9, 4, { o: LOG.o, m: LOG.ring, l: LOG.core, d: LOG.dark });
    for (let x = 9; x < 23; x++) if (hash(x, 780) < 0.6) px(ctx, x, 10 + (x % 3 ? 0 : 1), LOG.dark);
    blob(ctx, 12, 9, 4, 2.5, { o: "#1f3412", m: LOG_MOSS.mid, l: LOG_MOSS.light, d: LOG_MOSS.dark });
    blob(ctx, 22, 20, 2.5, 1.5, { o: FUNGUS.o, m: FUNGUS.mid, l: FUNGUS.light, d: FUNGUS.dark });
    blob(ctx, 23, 16, 2, 1.2, { o: FUNGUS.o, m: FUNGUS.mid, l: FUNGUS.light, d: FUNGUS.dark });
  };
}

/** Quadros dos troncos caídos: deitado (meio, meio, ponta oeste, ponta leste), em pé (meio, meio, ponta norte, ponta sul), tocos. */
export const LOG_FRAMES = { h: [0, 1], hWest: 2, hEast: 3, v: [4, 5], vNorth: 6, vSouth: 7, stump: [8, 9] } as const;

export function logStrip() {
  return strip([
    fallenLog("h", 0, 0), fallenLog("h", 0, 1), fallenLog("h", -1, 0), fallenLog("h", 1, 1),
    fallenLog("v", 0, 0), fallenLog("v", 0, 1), fallenLog("v", -1, 0), fallenLog("v", 1, 1),
    bigStump(0), bigStump(1),
  ]);
}

// --- Enfeites rasteiros -------------------------------------------------------------------

const SHADOW = "rgba(4,12,6,0.35)";

/** Folhas caídas, amarelas e marrons. */
function fallenLeaves(seed: number) {
  return (ctx: Ctx) => {
    const colors = ["#8a6a2a", "#a07a30", "#6a5a28", "#7a8a34", "#5a4020"];
    for (let i = 0; i < 7; i++) {
      const x = 5 + hash(seed, i, 800) * 22;
      const y = 6 + hash(seed, i, 801) * 20;
      const c = colors[Math.floor(hash(seed, i, 802) * colors.length)];
      px(ctx, x, y, c, 2, 1);
      px(ctx, x + 1, y + 1, c, 2, 1);
      px(ctx, x + 2, y + 1, "#3a2a14");
    }
  };
}

/** Cogumelos: marrons em tufo, ou o vermelho de pintas brancas. */
function mushrooms(red: boolean) {
  return (ctx: Ctx) => {
    const caps = red ? { o: "#3a0c08", m: "#b8322a", l: "#e0554a", d: "#7a1c16" } : { o: "#2a1a0c", m: "#8a6438", l: "#b08850", d: "#5a3e20" };
    for (const [x, y, s] of [[12, 20, 1], [19, 23, 0.8], [16, 15, 0.7]] as const) {
      px(ctx, x - 3 * s, y + 2, SHADOW, 7 * s + 2, 1);
      px(ctx, x, y - 1, "#e8dcc0", 2, 4 * s);
      blob(ctx, x + 1, y - 2, 4 * s, 2.4 * s, caps);
      if (red) { px(ctx, x - 1, y - 3, "#fff6e8"); px(ctx, x + 2, y - 2, "#fff6e8"); }
    }
  };
}

/** Graveto e galhos secos no chão. */
function twigs(ctx: Ctx) {
  line(ctx, 6, 22, 25, 14, "#4a3420");
  line(ctx, 6, 23, 25, 15, "#2a1a0c");
  line(ctx, 14, 19, 12, 13, "#5a4028");
  line(ctx, 20, 16, 23, 20, "#4a3420");
}

/** Pocinha d'água parada na lama: borda molhada, água escura e o reflexo do céu. */
function puddle(ctx: Ctx) {
  const inside = (x: number, y: number) => Math.hypot((x - 14) / 8, (y - 16) / 4) < 1 || Math.hypot((x - 20) / 6, (y - 19) / 3.5) < 1;
  for (let y = 8; y < 26; y++)
    for (let x = 2; x < 30; x++) {
      if (inside(x, y)) px(ctx, x, y, !inside(x, y - 1) ? MUD.deep : !inside(x, y + 1) ? WATER.light : WATER.mid);
      else if (inside(x, y - 1) || inside(x - 1, y) || inside(x + 1, y)) px(ctx, x, y, MUD.wet);
    }
  line(ctx, 10, 15, 15, 15, WATER.light);
  px(ctx, 19, 18, WATER.glint, 3, 1);
}

/** Pegadas de garça na lama. */
function birdTracks(ctx: Ctx) {
  for (let i = 0; i < 4; i++) {
    const x = 7 + i * 6;
    const y = 23 - i * 4 + (i % 2) * 2;
    line(ctx, x, y, x, y - 3, MUD.deep);
    line(ctx, x, y - 3, x - 2, y - 5, MUD.deep);
    line(ctx, x, y - 3, x + 2, y - 5, MUD.deep);
  }
}

/** Raízes expostas atravessando o chão. */
function roots(ctx: Ctx) {
  for (const [x0, y0, x1, y1] of [[0, 12, 18, 18], [18, 18, 31, 15], [10, 15, 14, 27], [18, 18, 24, 29]]) {
    line(ctx, x0, y0 + 1, x1, y1 + 1, "#1a120a");
    line(ctx, x0, y0, x1, y1, ROOT.mid);
  }
  px(ctx, 6, 13, ROOT.light, 4, 1);
}

/** Ossada meio afundada (ninguém sai do brejo sem pagar). */
function bones(ctx: Ctx) {
  const bone = { o: "#4a4434", m: "#d8d0b4", l: "#f2ecd8", d: "#a8a088" };
  blob(ctx, 13, 15, 4, 3.5, bone);
  px(ctx, 11, 14, "#2a2418", 2, 2); px(ctx, 14, 14, "#2a2418", 2, 2);
  line(ctx, 17, 19, 26, 24, bone.m); line(ctx, 17, 20, 26, 25, bone.d);
  for (const y of [19, 21, 23]) line(ctx, 8, y, 13, y + 1, bone.l);
}

/** Pedra coberta de musgo. */
function mossStone(ctx: Ctx) {
  px(ctx, 9, 23, SHADOW, 15, 2);
  blob(ctx, 16, 18, 7, 5, { o: "#16180f", m: "#5c6050", l: "#7c8068", d: "#3e4236" });
  blob(ctx, 14, 16, 5, 2.5, { o: "#1f3412", m: LOG_MOSS.mid, l: LOG_MOSS.light, d: LOG_MOSS.dark });
}

/** Dois ou três cogumelinhos brancos (a clareira do boss tem um círculo grande deles). */
function fairyMushrooms(ctx: Ctx) {
  for (const [x, y] of [[13, 15], [19, 17], [15, 21]]) {
    px(ctx, x - 1, y + 2, SHADOW, 4, 1);
    px(ctx, x, y, "#cfc8b0", 1, 2);
    px(ctx, x - 1, y - 2, "#e6dfc8", 3, 2);
    px(ctx, x - 1, y - 2, "#fffbe8");
    px(ctx, x + 1, y - 1, "#b8b096");
  }
}

/** Tapete de musgo fofo: almofadinhas com luz em cima, numa mancha de borda recortada. */
function mossPatch(seed: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const [cx, cy, rx, ry] = [[16, 16, 12, 9], [11, 19, 9, 8], [20, 12, 10, 7]][seed];
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + (wrapNoise(x, y, 4, T, 790 + seed) - 0.5) * 0.8;
        if (d > 1) continue;
        const w = worley(x, y, 4, T, 792 + seed);
        let t = (w.dx + w.dy) / 4 + (w.d2 - w.d1 < 0.8 ? 0.6 : 0) + (bayer(x, y) - 0.5) * 0.5 + (d > 0.85 ? 0.8 : 0);
        if (hash(x, y, 794 + seed) < 0.05) t -= 0.8;
        const tones = [MOSS.glow, MOSS.light, MOSS.mid, MOSS.dark, MOSS.crev];
        px(ctx, x, y, tones[Math.max(0, Math.min(4, Math.floor((t + 1.2) * 1.9)))]);
      }
  };
}

/** Enfeites rasteiros (camada do chão, não bloqueiam nada). */
export const MARSH_FLOOR = {
  leavesA: 0, leavesB: 1, mushroomsBrown: 2, mushroomsRed: 3, twigs: 4, puddle: 5, tracks: 6, roots: 7, bones: 8, stone: 9, fairy: 10,
  mossA: 11, mossB: 12, mossC: 13,
} as const;

export function marshFloorStrip() {
  return strip([
    fallenLeaves(1), fallenLeaves(2), mushrooms(false), mushrooms(true), twigs, puddle, birdTracks, roots, bones, mossStone, fairyMushrooms,
    mossPatch(0), mossPatch(1), mossPatch(2),
  ]);
}

// --- Enfeites na água -----------------------------------------------------------------------

const PAD = { o: "#13280f", m: "#3f6e2a", l: "#5e8f38", d: "#2c5220" };

/** Vitória-régia (folha com o corte). */
function lilyPad(x: number, y: number, r: number) {
  return (ctx: Ctx) => blob(ctx, x, y, r, r * 0.7, PAD, (px2, py) => py < y && px2 > x && px2 < x + r * 0.6);
}

function lilyPads(ctx: Ctx) {
  lilyPad(10, 11, 5)(ctx);
  lilyPad(22, 19, 4)(ctx);
  lilyPad(12, 24, 3)(ctx);
}

/** Flor de lírio-d'água branca sobre a folha. */
function lilyFlower(ctx: Ctx) {
  lilyPad(15, 18, 6)(ctx);
  for (const [dx, dy] of [[0, -3], [-3, -1], [3, -1], [-2, 1], [2, 1]]) px(ctx, 15 + dx, 15 + dy, "#f4f0e4", 2, 2);
  px(ctx, 15, 15, "#f2d04a", 2, 2);
}

/** Tapete de lentilha-d'água: pontinhos verdes juntos. */
function duckweed(dense: boolean) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const n = wrapNoise(x, y, 8, T, dense ? 810 : 811);
        if (n < (dense ? 0.45 : 0.62)) continue;
        const g = hash(x, y, 812);
        if (g < (dense ? 0.55 : 0.35)) px(ctx, x, y, g < 0.12 ? SCUM.light : g < 0.3 ? SCUM.mid : SCUM.dark);
      }
  };
}

/** Joelhos do cipreste: pontas de raiz saindo da água, com o anel de lodo em volta. */
function knees(ctx: Ctx) {
  for (const [x, y, h] of [[9, 20, 7], [17, 14, 5], [22, 23, 8], [13, 27, 4]]) {
    blob(ctx, x, y + 1, 3.5, 1.5, { o: SCUM.dark, m: SCUM.dark, l: SCUM.mid, d: SCUM.dark });
    for (let k = 0; k < h; k++) {
      const w = Math.max(1, Math.round(2.2 - k * 0.3));
      px(ctx, x - w + 1, y - k, BARK.mid, w * 2 - 1, 1);
      px(ctx, x - w + 1, y - k, BARK.light);
      px(ctx, x + w - 1, y - k, BARK.dark);
    }
    px(ctx, x, y - h, BARK.glow);
  }
}

/** Galho podre boiando. */
function floatingLog(ctx: Ctx) {
  for (let x = 5; x < 27; x++) {
    const y = 16 + Math.round((x - 16) * 0.25);
    px(ctx, x, y + 2, "rgba(0,0,0,0.3)");
    px(ctx, x, y - 1, LOG.light);
    px(ctx, x, y, LOG.mid);
    px(ctx, x, y + 1, LOG.dark);
  }
  px(ctx, 12, 13, LOG_MOSS.light, 4, 1);
}

/** Anel de lodo e marola no pé de uma árvore que nasce na água. */
function treeRing(ctx: Ctx) {
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = Math.hypot((x - 16) / 1.4, y - 27);
      if (d > 7 && d < 8.4 && hash(x, y, 815) < 0.8) px(ctx, x, y, WATER.light);
      else if (d < 6.5) px(ctx, x, y, d < 5 ? "rgba(10,20,10,0.55)" : SCUM.dark);
    }
}

export const MARSH_WATER = { pads: 0, padA: 1, flower: 2, duckweedA: 3, duckweedB: 4, knees: 5, log: 6, ring: 7 } as const;

export function marshWaterStrip() {
  return strip([lilyPads, lilyPad(15, 16, 6), lilyFlower, duckweed(false), duckweed(true), knees, floatingLog, treeRing]);
}

// --- Enfeites altos (de pé, encobrem o pé de quem passa atrás) -------------------------------

/** Taboas: folhas compridas e as espigas marrons. */
function cattails(seed: number) {
  return (ctx: Ctx) => {
    px(ctx, 7, 30, SHADOW, 19, 1);
    for (let i = 0; i < 7; i++) {
      const x = 8 + hash(seed, i, 820) * 16;
      const h = 12 + hash(seed, i, 821) * 14;
      const lean = (hash(seed, i, 822) - 0.5) * 7;
      line(ctx, x, 30, x + lean, 30 - h, i % 2 ? "#4e7a2c" : "#3a6224");
      if (i % 3 === 0) {
        const tx = Math.round(x + lean * 0.8);
        const ty = Math.round(30 - h * 0.85);
        px(ctx, tx - 1, ty, "#5a3418", 3, 5);
        px(ctx, tx - 1, ty, "#7a4a24", 1, 4);
        px(ctx, tx, ty - 2, "#8a9a4a", 1, 2);
      }
    }
  };
}

/** Samambaia: folhas recortadas abrindo em leque. */
function fern(ctx: Ctx) {
  px(ctx, 6, 29, SHADOW, 21, 2);
  for (const [a, len] of [[-2.7, 12], [-2.2, 14], [-1.6, 13], [-1.0, 14], [-0.45, 12]] as const) {
    let x = 16;
    let y = 29;
    for (let i = 0; i < len; i++) {
      x += Math.cos(a);
      y += Math.sin(a) * 0.85 + i * 0.07;
      px(ctx, x, y, i > len - 3 ? GRASS.tip : "#3d6a2a");
      if (i > 1 && i % 2 === 0) {
        px(ctx, x - Math.sin(a) * 2, y + Math.cos(a) * 1.4, "#4f8034");
        px(ctx, x + Math.sin(a) * 2, y - Math.cos(a) * 1.4, "#5f9a3a");
      }
    }
  }
}

/** Juncos finos e altos, em tufo. */
function reeds(ctx: Ctx) {
  px(ctx, 9, 30, SHADOW, 15, 1);
  for (let i = 0; i < 14; i++) {
    const x = 10 + hash(830, i) * 12;
    const h = 10 + hash(831, i) * 16;
    const lean = (hash(832, i) - 0.5) * 6;
    line(ctx, x, 30, x + lean, 30 - h, i % 3 ? "#5f8a3a" : "#7a9a44");
    px(ctx, x + lean, 30 - h, "#a8b86a");
  }
}

/** Íris amarela do brejo. */
function iris(ctx: Ctx) {
  px(ctx, 9, 30, SHADOW, 14, 1);
  for (const [x, h, lean] of [[12, 14, -3], [15, 18, -1], [18, 16, 2], [21, 12, 4]]) line(ctx, x, 30, x + lean, 30 - h, "#3f6e2a");
  for (const [x, y] of [[13, 13], [19, 15]]) {
    px(ctx, x - 1, y, "#e8c22a", 3, 2);
    px(ctx, x - 2, y + 2, "#d8a81a");
    px(ctx, x + 2, y + 2, "#d8a81a");
    px(ctx, x, y + 1, "#7a4a12");
  }
}

/** Planta-jarro (carnívora): jarros listrados de boca aberta. */
function pitcher(ctx: Ctx) {
  px(ctx, 8, 30, SHADOW, 16, 1);
  for (const [x, h] of [[11, 14], [16, 18], [21, 12]]) {
    for (let y = 30 - h; y < 30; y++) {
      const w = y < 30 - h + 3 ? 2 : 1.6;
      for (let dx = -w; dx <= w; dx++) {
        const vein = dx > -1 && (y + Math.round(dx) * 2) % 5 === 0;
        px(ctx, x + dx, y, vein ? "#6a3a2a" : dx < 0 ? "#7f9a44" : "#55702c");
      }
    }
    px(ctx, x - 2, 30 - h - 1, "#8a3a2a", 5, 1);
    px(ctx, x - 1, 30 - h, "#1a0a08", 3, 1);
  }
}

/** Cogumelo grande de chapéu largo. */
function toadstool(ctx: Ctx) {
  px(ctx, 9, 29, SHADOW, 16, 2);
  for (let y = 18; y < 29; y++) px(ctx, 14, y, y < 22 ? "#e8e0c8" : "#d4ccb0", 5, 1);
  px(ctx, 14, 18, "#fff8e8", 1, 10);
  blob(ctx, 16, 15, 10, 5, { o: "#2a1a0c", m: "#9a6a3a", l: "#c49058", d: "#6a4422" }, (_, y) => y > 17);
  for (let x = 8; x < 25; x++) px(ctx, x, 17, "#d8ccb0");
}

/** Toco baixo de árvore cortada. */
function stump(ctx: Ctx) {
  px(ctx, 8, 28, SHADOW, 18, 2);
  for (let y = 18; y < 28; y++)
    for (let x = 10; x <= 22; x++) {
      const u = (x - 16) / 6;
      if (Math.abs(u) > 1) continue;
      px(ctx, x, y, Math.abs(u) > 0.85 ? LOG.o : u < -0.4 ? LOG.light : u > 0.5 ? LOG.dark : LOG.mid);
    }
  blob(ctx, 16, 18, 6.5, 2.5, { o: LOG.o, m: LOG.ring, l: LOG.core, d: LOG.dark });
  px(ctx, 13, 26, LOG.dark, 2, 3); px(ctx, 20, 26, LOG.dark, 2, 3);
  blob(ctx, 14, 17, 2.5, 1.2, { o: "#1f3412", m: LOG_MOSS.mid, l: LOG_MOSS.light, d: LOG_MOSS.dark });
}

const GRASS_BUSH = { dark: "#2a4a20", mid: "#3a6228", light: "#4f7c32", glow: "#6a9a40" };

/** Arbusto baixo do brejo, folhas miúdas e umas florzinhas. */
function bush(ctx: Ctx) {
  px(ctx, 6, 28, SHADOW, 21, 2);
  const sheet = new Sheet(T, T);
  clump(sheet, 11, 22, 6, 5, GRASS_BUSH, 840);
  clump(sheet, 21, 22, 6, 5, GRASS_BUSH, 841);
  clump(sheet, 16, 17, 8, 6, GRASS_BUSH, 842);
  sheet.paint(ctx, "#0d1a0c");
  for (const [x, y] of [[13, 15], [19, 20], [10, 21]]) px(ctx, x, y, "#c8d0e8");
}

/** Galho seco espetado no chão, com um fio de barba-de-velho. */
function snag(ctx: Ctx) {
  px(ctx, 12, 29, SHADOW, 10, 1);
  line(ctx, 15, 29, 17, 8, DEADWOOD.mid);
  line(ctx, 16, 29, 18, 8, DEADWOOD.dark);
  line(ctx, 16, 16, 22, 10, DEADWOOD.light);
  line(ctx, 16, 20, 11, 14, DEADWOOD.mid);
  for (let d = 0; d < 7; d++) px(ctx, 21, 11 + d, d % 2 ? SPANISH.mid : SPANISH.light);
}

/** Tufo de capim do brejo (tiririca), folhas arqueadas, mais escuro que o capim baixo. */
function sedge(seed: number) {
  return (ctx: Ctx) => {
    px(ctx, 8, 29, SHADOW, 17, 2);
    for (let i = 0; i < 16; i++) {
      const x0 = 12 + hash(seed, i, 860) * 9;
      const h = 7 + hash(seed, i, 861) * 9;
      const bend = (hash(seed, i, 862) - 0.5) * 14;
      let px0 = x0;
      let py0 = 29;
      for (let k = 1; k <= h; k++) {
        const t = k / h;
        const x = x0 + bend * t * t;
        const y = 29 - k;
        line(ctx, px0, py0, x, y, t > 0.8 ? GRASS.tip : t > 0.45 ? (i % 2 ? GRASS.glow : GRASS.light) : GRASS.shade);
        px0 = x;
        py0 = y;
      }
    }
  };
}

export const MARSH_TALL = {
  cattailsA: 0, cattailsB: 1, fern: 2, reeds: 3, iris: 4, pitcher: 5, toadstool: 6, stump: 7, bush: 8, snag: 9, sedgeA: 10, sedgeB: 11,
} as const;

export function marshTallStrip() {
  return strip([cattails(1), cattails(2), fern, reeds, iris, pitcher, toadstool, stump, bush, snag, sedge(1), sedge(2)]);
}

// --- Ambiente -----------------------------------------------------------------------------

export const BUBBLE_FRAMES = 6;

/** Bolha de gás do brejo: sobe, cresce e estoura (quadros 16×16). */
export function bubbleStrip() {
  const { canvas, ctx } = makeCanvas(16 * BUBBLE_FRAMES, 16);
  for (let f = 0; f < BUBBLE_FRAMES; f++) {
    const ox = f * 16;
    if (f < 4) {
      const r = 1 + f * 0.8;
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 8, y - 10 + f * 0.5);
          if (d < r - 0.6) px(ctx, ox + x, y, "rgba(60,80,50,0.55)");
          else if (d < r + 0.4) px(ctx, ox + x, y, "rgba(150,180,140,0.8)");
        }
      px(ctx, ox + 7, Math.round(9 - f * 1.3), "rgba(230,255,230,0.9)");
    } else {
      // Estouro: respingos e anel.
      const r = f === 4 ? 4 : 6;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        px(ctx, ox + 8 + Math.cos(a) * r, 9 + Math.sin(a) * r * 0.5, `rgba(150,180,140,${f === 4 ? 0.7 : 0.35})`);
      }
    }
  }
  return canvas;
}

/** Folha caindo das copas (3×2). */
export function leafCanvas() {
  const { canvas, ctx } = makeCanvas(3, 2);
  px(ctx, 0, 0, "#8a8a30", 2, 1);
  px(ctx, 1, 1, "#6a6a24", 2, 1);
  return canvas;
}

/** Libélula: corpo azul e asas transparentes (7×5). */
export function dragonflyCanvas() {
  const { canvas, ctx } = makeCanvas(7, 5);
  px(ctx, 1, 2, "#3a8ab8", 6, 1);
  px(ctx, 5, 2, "#1a4a6a");
  px(ctx, 2, 0, "rgba(220,240,255,0.55)", 2, 2);
  px(ctx, 2, 3, "rgba(220,240,255,0.55)", 2, 2);
  px(ctx, 4, 0, "rgba(220,240,255,0.4)", 1, 2);
  px(ctx, 4, 3, "rgba(220,240,255,0.4)", 1, 2);
  return canvas;
}

/** Sombra que a mata e os troncos jogam no chão ao sul (0), a leste (1) e nos dois (2). */
export function marshShadeStrip() {
  const rgb = "4,14,6";
  const bands = [0.42, 0.3, 0.2, 0.12, 0.06];
  const north = (ctx: Ctx) => bands.forEach((a, i) => sideBand(ctx, 0, (k) => (i + 1) * 2 + (hash(k, i, 850) < 0.3 ? 1 : 0), (d) => (d >= i * 2 ? `rgba(${rgb},${a})` : null)));
  const west = (ctx: Ctx) => bands.forEach((a, i) => sideBand(ctx, 3, (k) => (i + 1) * 2 + (hash(k, i, 851) < 0.3 ? 1 : 0), (d) => (d >= i * 2 ? `rgba(${rgb},${a})` : null)));
  return strip([north, west, (ctx) => { north(ctx); west(ctx); }]);
}
