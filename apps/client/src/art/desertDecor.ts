import { TILE_SIZE } from "@kusa/shared";
import { blob, hash, line, makeCanvas, px, strip, type Ctx } from "./pixels.ts";

/**
 * Arte própria do Mar de Areia, pixel a pixel. Luz do sol vindo de cima à esquerda em tudo: sombras caem para
 * baixo e para a direita. Ladrilhos do chão (areia com ondulações do vento, areia molhada, água do oásis, topo
 * das dunas) fecham nas bordas, então se repetem sem emenda; as bordas (margem, lábio das dunas) são quadros
 * à parte que o `desertMap.ts` combina por tile. Coqueiros são sprites maiores que o tile: tronco, copa (que
 * balança) e sombra no chão.
 */

const T = TILE_SIZE;

/** Areia seca: do fundo das ondulações ao brilho da crista. */
export const SAND = { deep: "#b78a4f", shade: "#cba166", mid: "#ddb77a", light: "#e9c88e", glow: "#f4dca8", grain: "#a97c45" };
/** Areia molhada da beira do oásis. */
const WET = { deep: "#8a6a3f", mid: "#a28050", light: "#b5925f", glint: "#c9aa78" };
/** Topo e encostas das dunas altas. */
const DUNE = { deep: "#a3733d", shade: "#c08b52", mid: "#ebc68a", light: "#f3d6a0", glow: "#fbe9bf" };
/** Água do oásis: do fundo ao reflexo. */
const WATER = { deep: "#1d6a80", mid: "#2a8597", shallow: "#3fa3a3", light: "#6cc9bb", glint: "#d9fff2" };
const FOAM = "#e8f4dc";

// --- Ladrilhos do chão -----------------------------------------------------------

/**
 * Fase das ondulações do vento no pixel (x, y): 5 ondas por tile na vertical, serpenteando na horizontal.
 * Periódica em 32 px nos dois eixos: o padrão continua de um tile para o outro.
 */
function ripplePhase(x: number, y: number) {
  const p = (y * 5) / T + 0.32 * Math.sin((2 * Math.PI * x) / T + 0.4) + 0.12 * Math.sin((4 * Math.PI * x) / T + 1.7);
  return p - Math.floor(p);
}

/**
 * Areia seca. `strength` 2 = ondulações fortes, 1 = suaves, 0 = lisa. A crista é estreita e clara do lado do
 * vento e cai numa sombra curta, como as marcas reais de vento na areia. `variant` só muda os grãos.
 */
function sandTile(strength: 0 | 1 | 2, variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const f = ripplePhase(x, y);
        let c = SAND.mid;
        if (strength === 2) c = f > 0.56 && f < 0.7 ? SAND.light : f >= 0.7 && f < 0.84 ? SAND.shade : f >= 0.84 && f < 0.9 ? SAND.deep : SAND.mid;
        else if (strength === 1) c = f > 0.6 && f < 0.7 ? SAND.light : f >= 0.7 && f < 0.8 ? SAND.shade : SAND.mid;
        // Grãos: claros na crista, escuros no resto (pontinhos soltos, sem formar emenda).
        const g = hash(x, y, 300 + variant);
        if (g < 0.035) c = f > 0.5 && f < 0.75 ? SAND.glow : SAND.light;
        else if (g < 0.06) c = SAND.shade;
        else if (g < 0.068) c = SAND.grain;
        px(ctx, x, y, c);
      }
    // Uma variação com pedrinha e outra com grãos grossos, para quebrar a repetição.
    if (variant === 4) {
      px(ctx, 9, 21, "#00000030", 3, 1);
      px(ctx, 9, 19, "#9d7a52", 3, 2); px(ctx, 9, 19, "#c9a77c");
    }
    if (variant === 5) {
      for (let i = 0; i < 6; i++) px(ctx, 18 + hash(i, 1, 301) * 8, 8 + hash(i, 2, 301) * 8, i % 2 ? SAND.grain : SAND.deep);
    }
  };
}

/** Variações de areia por força de ondulação (forte, suave, lisa), na ordem da faixa. */
export const SAND_VARIANTS = 6;
export const SAND_STRENGTHS = 3;

export function sandStrip() {
  const frames: ((ctx: Ctx) => void)[] = [];
  for (const strength of [2, 1, 0] as const) for (let v = 0; v < SAND_VARIANTS; v++) frames.push(sandTile(strength, v));
  return strip(frames);
}

/** Areia molhada: lisa, mais escura, com manchas de umidade e reflexos miúdos. */
function wetTile(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        // Manchas suaves periódicas (fecham na borda do tile).
        const m = Math.sin((2 * Math.PI * x) / T + variant) * Math.sin((2 * Math.PI * y) / T + variant * 0.7);
        let c = m > 0.8 ? WET.deep : m < -0.85 ? WET.light : WET.mid;
        const g = hash(x, y, 320 + variant);
        if (g < 0.03) c = WET.glint;
        else if (g < 0.07) c = WET.deep;
        px(ctx, x, y, c);
      }
  };
}

export const WET_VARIANTS = 4;

export function wetStrip() {
  return strip(Array.from({ length: WET_VARIANTS }, (_, v) => wetTile(v)));
}

/**
 * Água do oásis. Quadro 0 e 1: rasa (beira, com o fundo de areia aparecendo); 2: funda. Riscos de reflexo em
 * ondas periódicas e um ou outro brilho.
 */
function waterTile(kind: number) {
  return (ctx: Ctx) => {
    const deep = kind === 2;
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const w = Math.sin((2 * Math.PI * (x + 2 * Math.sin((2 * Math.PI * y) / T))) / 16 + (y * 2 * Math.PI) / 8 + kind);
        // Funda e rasa dividem o tom do meio: a troca de um tile para o outro não marca uma emenda.
        let c = deep ? (w > -0.2 ? WATER.mid : WATER.deep) : w < -0.3 ? WATER.mid : WATER.shallow;
        if (w > 0.93) c = deep ? WATER.shallow : WATER.light;
        if (hash(x, y, 330 + kind) < (deep ? 0.004 : 0.008)) c = WATER.glint;
        px(ctx, x, y, c);
      }
  };
}

export function waterStrip() {
  return strip([waterTile(0), waterTile(1), waterTile(2)]);
}

/** Topo da duna: areia mais clara e lisa, com grãos soltos. */
function duneTile(variant: number) {
  return (ctx: Ctx) => {
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        // Topo liso, só grãos: o volume vem das encostas (lábios) e da sombra no chão.
        let c = DUNE.mid;
        const g = hash(x, y, 340 + variant);
        if (g < 0.05) c = DUNE.light;
        else if (g < 0.065) c = DUNE.glow;
        else if (g < 0.08) c = DUNE.shade;
        px(ctx, x, y, c);
      }
  };
}

export const DUNE_VARIANTS = 4;

export function duneStrip() {
  return strip(Array.from({ length: DUNE_VARIANTS }, (_, v) => duneTile(v)));
}

// --- Bordas -----------------------------------------------------------------------

/** Borda irregular: quantos pixels a faixa avança no ponto `i` (0..31) do lado, sem emenda com o vizinho. */
export function ragged(i: number, base: number, amp: number, seed: number) {
  const k = Math.min(i, T - 1 - i) < 2 ? 0 : 1; // nas pontas a faixa fica na base, para casar com o tile do lado
  return Math.round(base + k * (Math.sin(i * 0.9 + seed) * amp * 0.6 + (hash(i, seed) - 0.5) * amp));
}

/** Pinta uma faixa colada num lado (0 N, 1 L, 2 S, 3 O), `depth(i)` pixels para dentro, cor por distância. */
export function sideBand(ctx: Ctx, side: number, depth: (i: number) => number, color: (d: number, i: number) => string | null) {
  for (let i = 0; i < T; i++) {
    const n = depth(i);
    for (let d = 0; d < n; d++) {
      const c = color(d, i);
      if (!c) continue;
      const [x, y] = side === 0 ? [i, d] : side === 1 ? [T - 1 - d, i] : side === 2 ? [i, T - 1 - d] : [d, i];
      px(ctx, x, y, c);
    }
  }
}

/**
 * Margem do oásis, desenhada no tile de água: faixa de água rasa e clara, espuma recortada e a areia molhada
 * entrando. Quadros 0-3: lados N, L, S, O; 4-7: cantos de dentro NE, NO, SE, SO (a terra só na quina);
 * 8-11: cantos de fora NE, NO, SE, SO (terra nos dois lados), que arredondam a ponta da lagoa.
 */
export function shoreStrip() {
  const side = (s: number) => (ctx: Ctx) => {
    sideBand(ctx, s, (i) => ragged(i, 8, 3, s * 7 + 1), (d, i) => {
      const edge = ragged(i, 3, 2, s * 7 + 2);
      if (d < edge) return WET.mid;
      if (d === edge) return FOAM;
      if (d === edge + 1) return hash(i, s, 350) < 0.5 ? FOAM : WATER.light;
      return WATER.light;
    });
  };
  const corner = (cx: number, cy: number) => (ctx: Ctx) => {
    const ox = cx > 0 ? T - 1 : 0;
    const oy = cy < 0 ? 0 : T - 1;
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const d = Math.hypot(x - ox, y - oy) + (hash(x, y, 351) - 0.5) * 1.5;
        if (d < 4) px(ctx, x, y, WET.mid);
        else if (d < 5.2) px(ctx, x, y, FOAM);
        else if (d < 8.5) px(ctx, x, y, WATER.light);
      }
  };
  const outer = (cx: number, cy: number) => (ctx: Ctx) => {
    // Centro do arco do lado da água: tudo além do raio (na quina) vira terra.
    const ox = cx > 0 ? 6 : T - 7;
    const oy = cy < 0 ? T - 7 : 6;
    for (let y = 0; y < T; y++)
      for (let x = 0; x < T; x++) {
        const inQuarter = (cx > 0 ? x > ox : x < ox) && (cy < 0 ? y < oy : y > oy);
        if (!inQuarter) continue;
        const d = Math.hypot(x - ox, y - oy) + (hash(x, y, 352) - 0.5) * 1.5;
        if (d > 22) px(ctx, x, y, WET.mid);
        else if (d > 20.8) px(ctx, x, y, FOAM);
        else if (d > 17.5) px(ctx, x, y, WATER.light);
      }
  };
  return strip([
    side(0), side(1), side(2), side(3), corner(1, -1), corner(-1, -1), corner(1, 1), corner(-1, 1),
    outer(1, -1), outer(-1, -1), outer(1, 1), outer(-1, 1),
  ]);
}

/** Areia seca invadindo a molhada, no tile molhado: lados N, L, S, O, com borda recortada e grãos soltos. */
export function dryFringeStrip() {
  return strip([0, 1, 2, 3].map((s) => (ctx: Ctx) => {
    sideBand(ctx, s, (i) => ragged(i, 5, 4, s * 5 + 11), (d, i) => {
      const n = ragged(i, 5, 4, s * 5 + 11);
      if (d === n - 1) return hash(i, d, 360 + s) < 0.6 ? SAND.shade : null;
      return hash(i, d, 361 + s) < 0.08 ? SAND.light : SAND.mid;
    });
    for (let k = 0; k < 6; k++) {
      const i = 3 + Math.floor(hash(k, s, 362) * 26);
      const d = 6 + Math.floor(hash(k, s, 363) * 5);
      const [x, y] = s === 0 ? [i, d] : s === 1 ? [T - 1 - d, i] : s === 2 ? [i, T - 1 - d] : [d, i];
      px(ctx, x, y, SAND.mid);
    }
  }));
}

/**
 * Lábio da duna, no tile de duna que encosta na areia baixa. 0 N: a crista vista de trás (filete de luz e a areia
 * baixa aparecendo); 1 L: encosta na sombra; 2 S: a encosta de frente, que dá altura (crista clara, rampa
 * sombreada com riscos de areia escorrendo e o pé esparramado); 3 O: encosta no sol.
 */
export function duneLipStrip() {
  const north = (ctx: Ctx) => {
    sideBand(ctx, 0, (i) => ragged(i, 5, 3, 21), (d, i) => {
      const n = ragged(i, 5, 3, 21);
      if (d < n - 2) return SAND.mid;
      return d === n - 2 ? DUNE.light : DUNE.glow;
    });
  };
  const east = (ctx: Ctx) => {
    sideBand(ctx, 1, (i) => ragged(i, 9, 3, 23), (d, i) => {
      const n = ragged(i, 9, 3, 23);
      if (d < 2) return SAND.shade;
      if (d >= n - 1) return DUNE.light;
      return hash(i, d, 370) < 0.15 ? DUNE.deep : DUNE.shade;
    });
  };
  const south = (ctx: Ctx) => {
    sideBand(ctx, 2, (i) => ragged(i, 16, 3, 25), (d, i) => {
      const n = ragged(i, 16, 3, 25);
      if (d < 2) return hash(i, d, 371) < 0.5 ? SAND.shade : SAND.mid; // pé esparramado na areia baixa
      if (d === n - 1) return DUNE.glow; // crista
      if (d === n - 2) return DUNE.light;
      // Rampa: escurece para baixo, com um ou outro risco de areia escorrendo.
      const streak = hash(i, 372) < 0.12 && d > 3 && d < n - 4;
      if (streak) return DUNE.mid;
      const dither = hash(i, d, 374) < 0.25;
      if (d < n * 0.35) return dither ? DUNE.shade : DUNE.deep;
      if (d < n * 0.7) return dither ? DUNE.mid : DUNE.shade;
      return dither ? DUNE.light : DUNE.mid;
    });
  };
  const west = (ctx: Ctx) => {
    sideBand(ctx, 3, (i) => ragged(i, 8, 3, 27), (d, i) => {
      const n = ragged(i, 8, 3, 27);
      if (d < 2) return SAND.light;
      if (d >= n - 1) return DUNE.mid;
      return hash(i, d, 373) < 0.2 ? DUNE.light : DUNE.glow;
    });
  };
  return strip([north, east, south, west]);
}

// --- Coqueiros ------------------------------------------------------------------------

/** Tamanho do quadro do tronco e da copa (px). */
export const PALM_TRUNK = { w: 48, h: 80 };
export const PALM_CROWN = { w: 112, h: 92 };
/** Ponto da copa que encaixa no topo do tronco (px dentro do quadro da copa). */
export const PALM_CROWN_ANCHOR = { x: 56, y: 40 };
export const PALM_VARIANTS = 4;

interface PalmShape { lean: number; height: number; bend: number }
/** Inclinação (px no topo), altura do tronco (px) e curvatura de cada variação. */
const PALMS: PalmShape[] = [
  { lean: 9, height: 60, bend: -5 },
  { lean: -8, height: 54, bend: 4 },
  { lean: 4, height: 66, bend: -3 },
  { lean: -12, height: 58, bend: 6 },
];

/** Topo do tronco de uma variação, em px a partir do canto de cima do quadro do tronco. */
export function palmTop(variant: number) {
  const s = PALMS[variant % PALMS.length];
  return { x: PALM_TRUNK.w / 2 + s.lean, y: PALM_TRUNK.h - 4 - s.height };
}

/** Desenho em camadas: cada pixel guarda uma cor; depois ganha contorno escuro onde encosta no vazio. */
class Sheet {
  readonly cells: (string | null)[];
  constructor(readonly w: number, readonly h: number) {
    this.cells = new Array(w * h).fill(null);
  }
  set(x: number, y: number, c: string) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = c;
  }
  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y * this.w + x] : null;
  }
  /** Pinta no canvas, com contorno `outline` nos pixels vazios vizinhos (4 lados) de um pixel cheio. */
  paint(ctx: Ctx, outline: string, ox = 0, oy = 0) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c) { px(ctx, ox + x, oy + y, c); continue; }
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) px(ctx, ox + x, oy + y, outline);
      }
  }
}

const BARK = { o: "#3b2614", dark: "#6e4a28", mid: "#93683a", ring: "#5a3b1e", lit: "#c4975e" };

/**
 * Tronco do coqueiro: curva suave do pé até a copa, afinando, com os anéis das folhas que caíram. Luz à
 * esquerda (lado claro), sombra à direita. O pé alarga um pouco, como as raízes na areia.
 */
function palmTrunk(variant: number) {
  const s = PALMS[variant % PALMS.length];
  const sheet = new Sheet(PALM_TRUNK.w, PALM_TRUNK.h);
  const base = { x: PALM_TRUNK.w / 2, y: PALM_TRUNK.h - 4 };
  const top = palmTop(variant);
  const at = (t: number) => ({
    // Bézier quadrática: o meio do tronco curva para o lado de `bend`.
    x: (1 - t) ** 2 * base.x + 2 * (1 - t) * t * (base.x + s.bend) + t * t * top.x,
    y: base.y + (top.y - base.y) * t,
  });
  for (let yy = Math.ceil(top.y); yy <= base.y; yy++) {
    const t = (base.y - yy) / (base.y - top.y);
    const c = at(t);
    const half = 3.4 - 1.3 * t + (t < 0.08 ? (0.08 - t) * 22 : 0);
    // Anéis: a cada 4 px, com leve inclinação.
    const ring = Math.floor((yy + Math.round(c.x / 6)) / 4) % 2 === 0;
    for (let x = Math.floor(c.x - half); x <= Math.ceil(c.x + half); x++) {
      const u = (x - c.x) / half; // -1 esquerda (sol) .. 1 direita (sombra)
      if (Math.abs(u) > 1) continue;
      let color = u < -0.45 ? BARK.lit : u > 0.4 ? BARK.dark : BARK.mid;
      if (ring && (yy % 4 === 0)) color = u < -0.45 ? BARK.mid : BARK.ring;
      if ((yy + 1) % 4 === 0 && u > -0.2 && u < 0.3 && hash(x, yy, 400 + variant) < 0.4) color = BARK.dark;
      sheet.set(x, yy, color);
    }
  }
  const { canvas, ctx } = makeCanvas(PALM_TRUNK.w, PALM_TRUNK.h);
  sheet.paint(ctx, BARK.o);
  return canvas;
}

const FROND = { o: "#1b3412", back: "#2f5c22", dark: "#3d7429", mid: "#55943a", light: "#78b54c", glow: "#a2d26a", rib: "#c9d78a" };
const DRY = { mid: "#a07838", dark: "#7a5726", light: "#c49a52" };

/**
 * Copa: folhas compridas e penadas saindo do centro, as de trás mais escuras e as da frente caídas e com
 * luz em cima. Cada folha é uma nervura (curva que cai com o peso) com folíolos dos dois lados, curtos na
 * ponta. No meio, um cacho de cocos. Uma folha seca pendurada em algumas variações.
 */
function palmCrown(variant: number) {
  const sheet = new Sheet(PALM_CROWN.w, PALM_CROWN.h);
  const c = PALM_CROWN_ANCHOR;
  const r = (k: number) => hash(variant, k, 410);

  const frond = (angle: number, length: number, droop: number, shade: "back" | "side" | "front", dry = false) => {
    const pal = dry
      ? { base: DRY.dark, top: DRY.mid, edge: DRY.light }
      : shade === "back" ? { base: FROND.back, top: FROND.dark, edge: FROND.mid }
      : shade === "side" ? { base: FROND.dark, top: FROND.mid, edge: FROND.light }
      : { base: FROND.mid, top: FROND.light, edge: FROND.glow };
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const steps = Math.ceil(length * 1.4);
    let prev = { x: c.x, y: c.y };
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // A nervura sai na direção da folha e cai com o peso (mais na ponta).
      // Folha de trás sobe mais (está em pé, de frente para quem olha); as outras achatam pela perspectiva.
      const p = { x: c.x + dx * length * t, y: c.y + dy * length * t * (shade === "back" ? 0.9 : 0.62) + droop * t * t };
      const tx = p.x - prev.x;
      const ty = p.y - prev.y;
      const tl = Math.hypot(tx, ty) || 1;
      // Normal da nervura; os folíolos apontam para trás e para baixo.
      const nx = -ty / tl;
      const ny = tx / tl;
      const leaflet = (1 - t * 0.75) * (shade === "back" ? 6 : 7.5) * (t < 0.12 ? t / 0.12 : 1);
      if (i % 2 === 0) {
        for (const side of [-1, 1]) {
          const lx = nx * side * 0.85 - (tx / tl) * 0.45;
          const ly = ny * side * 0.85 - (ty / tl) * 0.45 + 0.55;
          for (let k = 1; k <= leaflet; k++) {
            const upper = ny * side < 0; // folíolo do lado de cima pega luz
            const col = k > leaflet - 1.2 ? pal.edge : upper ? pal.top : pal.base;
            sheet.set(p.x + lx * k, p.y + ly * k, col);
          }
        }
      }
      sheet.set(p.x, p.y, dry ? DRY.light : shade === "front" ? FROND.rib : pal.top);
      prev = p;
    }
  };

  // Atrás: folhas para cima, curtas por causa do ângulo.
  const backs = 4;
  for (let i = 0; i < backs; i++) {
    const a = -Math.PI / 2 + (i - (backs - 1) / 2) * 0.62 + (r(i) - 0.5) * 0.25;
    frond(a, 26 + r(i + 10) * 8, 6 + r(i + 20) * 4, "back");
  }
  // Folha seca pendurada, atrás das outras.
  if (variant % 2 === 0) frond(Math.PI / 2 + (r(30) - 0.5) * 0.6, 20, 10, "side", true);
  // Lados: abertas, quase na horizontal, caindo na ponta.
  for (const [a, k] of [[-0.25, 1], [Math.PI + 0.25, 2], [0.2, 3], [Math.PI - 0.2, 4]] as const) {
    frond(a + (r(k + 40) - 0.5) * 0.25, 40 + r(k + 50) * 10, 14 + r(k + 60) * 6, "side");
  }

  // Cocos: cacho no centro, entre as folhas de trás e as da frente.
  const nuts = [[-4, 2], [3, 3], [-1, 5], [5, -1], [-6, -1]].slice(0, 3 + (variant % 3));
  for (const [nx, ny] of nuts) {
    for (let y = -3; y <= 3; y++)
      for (let x = -3; x <= 3; x++) {
        const d = Math.hypot(x, y);
        if (d > 2.9) continue;
        const u = x + y;
        sheet.set(c.x + nx + x, c.y + ny + y, u < -2.5 ? "#a8743c" : u > 1.8 ? "#4d2f15" : "#6f4721");
      }
  }

  // Frente: folhas caídas para os lados e para baixo, com luz.
  for (const [a, k] of [[0.75, 5], [Math.PI - 0.75, 6], [Math.PI / 2 + 0.25 * (variant % 2 ? 1 : -1), 7]] as const) {
    frond(a + (r(k + 70) - 0.5) * 0.3, 30 + r(k + 80) * 8, 16 + r(k + 90) * 6, "front");
  }

  const { canvas, ctx } = makeCanvas(PALM_CROWN.w, PALM_CROWN.h);
  sheet.paint(ctx, FROND.o);
  return canvas;
}

/** Faixa dos troncos e faixa das copas, um quadro por variação. */
export function palmTrunkSheet() {
  return sheetOf(PALM_TRUNK, palmTrunk);
}

export function palmCrownSheet() {
  return sheetOf(PALM_CROWN, palmCrown);
}

function sheetOf(size: { w: number; h: number }, draw: (variant: number) => HTMLCanvasElement) {
  const { canvas, ctx } = makeCanvas(size.w * PALM_VARIANTS, size.h);
  for (let v = 0; v < PALM_VARIANTS; v++) ctx.drawImage(draw(v), v * size.w, 0);
  return canvas;
}

/** Sombra do coqueiro no chão (para baixo e à direita): o risco do tronco e a mancha recortada da copa. */
export const PALM_SHADOW = { w: 128, h: 72 };

export function palmShadowCanvas() {
  const { canvas, ctx } = makeCanvas(PALM_SHADOW.w, PALM_SHADOW.h);
  const color = "rgba(92,52,18,0.26)";
  // Tronco: do pé (canto de cima à esquerda) até a copa.
  for (let t = 0; t <= 1; t += 0.02) {
    const x = 18 + t * 46;
    const y = 10 + t * 22;
    px(ctx, x, y, color, 3 - t, 2);
  }
  // Copa: estrela de folhas recortadas.
  const cx = 66;
  const cy = 36;
  for (let y = 0; y < PALM_SHADOW.h; y++)
    for (let x = 0; x < PALM_SHADOW.w; x++) {
      const a = Math.atan2((y - cy) * 1.8, x - cx);
      const lobes = 0.55 + 0.45 * Math.abs(Math.cos(a * 3.5 + 0.4));
      const d = Math.hypot(x - cx, (y - cy) * 1.8);
      if (d < 36 * lobes && hash(x, y, 420) > 0.12) px(ctx, x, y, color);
    }
  return canvas;
}

// --- Enfeites ------------------------------------------------------------------------

const ROCK = { o: "#4a3520", m: "#a7825a", l: "#cfa97a", d: "#7d5e3d" };
const BONE = { o: "#5a4a34", m: "#efe4c8", l: "#fffaf0", d: "#c7b796" };

function pebbles(seed: number) {
  return (ctx: Ctx) => {
    const n = 2 + Math.floor(hash(seed, 1) * 3);
    for (let i = 0; i < n; i++) {
      const x = Math.round(8 + hash(seed, i, 2) * 16);
      const y = Math.round(9 + hash(seed, i, 3) * 15);
      const r = 1.4 + hash(seed, i, 4) * 1.6;
      px(ctx, x - r + 2, y + r * 0.7 + 1, "rgba(92,52,18,0.3)", r * 2, 1);
      blob(ctx, x, y, r + 0.6, r * 0.75, ROCK);
    }
  };
}

/** Pedra meio enterrada, com a areia acumulada do lado do vento. */
function buriedStone(ctx: Ctx) {
  px(ctx, 11, 22, "rgba(92,52,18,0.3)", 14, 2);
  blob(ctx, 16, 18, 7, 4.5, ROCK, (_, y) => y > 21);
  for (let x = 8; x < 25; x++) px(ctx, x, 21 + (hash(x, 430) < 0.4 ? 1 : 0), SAND.light);
  px(ctx, 9, 20, SAND.mid, 4, 2);
}

/** Cocos caídos ao pé do coqueiro: um inteiro, um com a casca rachada. */
function fallenCoconuts(ctx: Ctx) {
  for (const [x, y] of [[12, 18], [19, 21], [15, 24]]) {
    px(ctx, x - 2, y + 3, "rgba(92,52,18,0.3)", 6, 1);
    blob(ctx, x, y, 3, 2.6, { o: "#2e1b0b", m: "#6f4721", l: "#9b6a35", d: "#4d2f15" });
  }
  px(ctx, 14, 23, "#efe4c8", 2, 1);
  px(ctx, 11, 17, "#2e1b0b"); px(ctx, 12, 17, "#2e1b0b");
}

/** Folha de coqueiro seca caída na areia. */
function fallenFrond(ctx: Ctx) {
  line(ctx, 4, 24, 28, 12, DRY.dark);
  for (let i = 0; i < 12; i++) {
    const x = 6 + i * 2;
    const y = 23 - i;
    line(ctx, x, y, x - 2, y - 4 + (i % 2), DRY.mid);
    line(ctx, x, y, x + 1, y + 4, i % 3 ? DRY.mid : DRY.light);
  }
  line(ctx, 4, 25, 28, 13, "rgba(92,52,18,0.25)");
}

/** Crânio de boi esbranquiçado pelo sol, com os chifres. */
function skull(ctx: Ctx) {
  px(ctx, 9, 24, "rgba(92,52,18,0.3)", 16, 2);
  blob(ctx, 16, 17, 5, 4, BONE);
  blob(ctx, 16, 22, 3, 2.5, BONE);
  px(ctx, 13, 16, "#3a2c1c", 2, 2); px(ctx, 18, 16, "#3a2c1c", 2, 2);
  px(ctx, 15, 22, "#5a4a34"); px(ctx, 17, 22, "#5a4a34");
  // Chifres curvos.
  line(ctx, 11, 15, 6, 13, BONE.d); line(ctx, 6, 13, 5, 9, BONE.m); px(ctx, 5, 8, BONE.o);
  line(ctx, 21, 15, 26, 13, BONE.d); line(ctx, 26, 13, 27, 9, BONE.m); px(ctx, 27, 8, BONE.o);
}

/** Rastro de cobra: S comprido na areia, sombra de um lado e areia empurrada do outro. */
function snakeTrack(ctx: Ctx) {
  for (let x = 2; x < 30; x++) {
    const y = 16 + Math.sin(x / 3.2) * 4;
    px(ctx, x, y, SAND.deep);
    px(ctx, x, y + 1, SAND.shade);
    px(ctx, x, y - 1, SAND.glow);
  }
}

/** Pegadas de lagarto atravessando. */
function lizardTracks(ctx: Ctx) {
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 4;
    const y = 20 - i * 2 + (i % 2 ? 3 : 0);
    px(ctx, x, y, SAND.deep); px(ctx, x - 1, y - 1, SAND.shade); px(ctx, x + 1, y - 1, SAND.shade);
  }
  line(ctx, 4, 20, 27, 10, "rgba(169,124,69,0.45)");
}

/** Chão rachado (lama seca de uma poça antiga). */
function cracked(ctx: Ctx) {
  blob(ctx, 16, 17, 11, 7, { o: "#b8935e", m: "#c9a46d", l: "#d6b37c", d: "#b8935e" });
  for (const [x0, y0, x1, y1] of [[8, 15, 15, 18], [15, 18, 22, 14], [15, 18, 17, 23], [22, 14, 25, 19], [11, 20, 15, 18], [19, 12, 22, 14]]) {
    line(ctx, x0, y0, x1, y1, "#8a6a3f");
  }
}

/** Flores miúdas do deserto (as que abrem depois da chuva). */
function desertFlowers(ctx: Ctx) {
  for (const [x, y, c] of [[11, 14, "#e86a8a"], [18, 12, "#f2d04a"], [15, 19, "#e86a8a"], [22, 18, "#f6f0e0"], [9, 21, "#f2d04a"]] as const) {
    line(ctx, x, y + 1, x, y + 4, "#6f8a3a");
    px(ctx, x - 1, y, c); px(ctx, x + 1, y, c); px(ctx, x, y - 1, c);
    px(ctx, x, y, "#7a4a1e");
  }
}

/** Conchas e caramujos secos (o deserto já foi mar). */
function shells(ctx: Ctx) {
  blob(ctx, 12, 18, 3, 2.5, { o: "#7a5a42", m: "#f0dcc4", l: "#fff6ea", d: "#d4b89a" });
  line(ctx, 10, 18, 14, 18, "#d4b89a"); line(ctx, 12, 16, 12, 20, "#d4b89a");
  blob(ctx, 21, 22, 2.5, 2.5, { o: "#6a4a32", m: "#e2c09a", l: "#f4dcc0", d: "#b8946c" });
  px(ctx, 21, 22, "#8a6448"); px(ctx, 22, 21, "#8a6448");
}

/** Enfeites rasteiros (camada do chão, não bloqueiam nada). */
export const DESERT_FLOOR = {
  pebblesA: 0, pebblesB: 1, stone: 2, coconuts: 3, frond: 4, skull: 5, snake: 6, tracks: 7, cracked: 8, flowers: 9, shells: 10,
} as const;

export function desertFloorStrip() {
  return strip([pebbles(1), pebbles(2), buriedStone, fallenCoconuts, fallenFrond, skull, snakeTrack, lizardTracks, cracked, desertFlowers, shells]);
}

/** Lótus e folhas boiando no oásis. */
function lotusPad(flower: boolean) {
  return (ctx: Ctx) => {
    blob(ctx, 15, 17, 6, 4, { o: "#1d3a17", m: "#4f8f3a", l: "#7cb35a", d: "#356b28" }, (x, y) => y < 17 && x > 15 && x < 19);
    if (!flower) return;
    for (const [dx, dy] of [[0, -3], [-2, -2], [2, -2], [-3, 0], [3, 0]]) px(ctx, 15 + dx, 15 + dy, "#f4a6c0", 2, 2);
    px(ctx, 15, 14, "#fff1f6", 2, 2);
    px(ctx, 15, 15, "#f2d04a");
  };
}

function floatingLeaves(ctx: Ctx) {
  for (const [x, y] of [[9, 12], [20, 18], [13, 22]]) {
    px(ctx, x, y, "#a07838", 3, 1); px(ctx, x + 1, y + 1, "#7a5726", 2, 1);
  }
}

export const DESERT_WATER = { pad: 0, lotus: 1, leaves: 2 } as const;

export function desertWaterStrip() {
  return strip([lotusPad(false), lotusPad(true), floatingLeaves]);
}

/** Papiro e juncos da margem: talos finos com tufo em leque no alto. */
function papyrus(seed: number) {
  return (ctx: Ctx) => {
    px(ctx, 8, 30, "rgba(92,52,18,0.3)", 17, 1);
    for (let i = 0; i < 5; i++) {
      const x = 9 + hash(seed, i, 440) * 14;
      const h = 14 + hash(seed, i, 441) * 10;
      const lean = (hash(seed, i, 442) - 0.5) * 5;
      const tx = x + lean;
      const ty = 30 - h;
      line(ctx, x, 30, tx, ty, i % 2 ? "#4f7a2c" : "#3d6624");
      // Tufo em leque.
      for (let k = -3; k <= 3; k++) line(ctx, tx, ty, tx + k * 1.2, ty - 3 + Math.abs(k) * 0.6, k % 2 ? "#8fb24a" : "#6f9a3a");
    }
  };
}

/** Capim seco do deserto, em tufo. */
function dryGrass(ctx: Ctx) {
  px(ctx, 9, 30, "rgba(92,52,18,0.28)", 15, 1);
  for (let i = 0; i < 12; i++) {
    const x = 10 + hash(450, i) * 12;
    const h = 5 + hash(451, i) * 8;
    const lean = (hash(452, i) - 0.5) * 9;
    line(ctx, x, 29, x + lean, 29 - h, i % 3 ? "#c4a050" : "#9a7a34");
    px(ctx, x + lean, 29 - h, "#e2c878");
  }
}

/** Arbusto seco, galhos retorcidos (vira bola de feno quando solta). */
function dryBush(ctx: Ctx) {
  px(ctx, 6, 28, "rgba(92,52,18,0.3)", 21, 2);
  const branch = (x0: number, y0: number, a: number, len: number, depth: number) => {
    const x1 = x0 + Math.cos(a) * len;
    const y1 = y0 + Math.sin(a) * len;
    line(ctx, x0, y0, x1, y1, depth > 1 ? "#5e4022" : "#8a6638");
    if (depth >= 3) return;
    branch(x1, y1, a - 0.5, len * 0.62, depth + 1);
    branch(x1, y1, a + 0.45, len * 0.6, depth + 1);
  };
  for (const a of [-2.4, -1.9, -1.4, -1.0, -0.6]) branch(16, 28, a, 6, 1);
  for (let i = 0; i < 8; i++) px(ctx, 8 + hash(460, i) * 16, 12 + hash(461, i) * 12, "#9aa04a");
}

/** Pedra de arenito em pé, gasta pelo vento. */
function sandstone(ctx: Ctx) {
  px(ctx, 9, 29, "rgba(92,52,18,0.32)", 18, 2);
  blob(ctx, 16, 21, 7, 7.5, { o: "#4a2e18", m: "#c08a52", l: "#dcaa70", d: "#93643a" });
  // Camadas de sedimento.
  for (const y of [18, 22, 25]) for (let x = 10; x < 23; x++) if (hash(x, y, 462) < 0.7) px(ctx, x, y, "#a8743f");
  px(ctx, 11, 15, "#f0c890", 3, 1);
}

/** Coqueiro novo, ainda baixinho. */
function sapling(ctx: Ctx) {
  px(ctx, 10, 29, "rgba(92,52,18,0.3)", 13, 1);
  line(ctx, 16, 29, 16, 20, "#6e4a28");
  for (const [a, len] of [[-2.6, 9], [-0.5, 9], [-1.6, 7], [-2.1, 8], [-1.0, 8]] as const) {
    let x = 16;
    let y = 20;
    for (let i = 0; i < len; i++) {
      x += Math.cos(a);
      y += Math.sin(a) * 0.7 + i * 0.12;
      px(ctx, x, y, i > len - 3 ? FROND.light : FROND.mid);
      px(ctx, x, y + 1, FROND.dark);
    }
  }
}

/** Enfeites altos: ficam de pé e encobrem o pé de quem passa atrás. */
export const DESERT_TALL = { papyrusA: 0, papyrusB: 1, grass: 2, bush: 3, sandstone: 4, sapling: 5 } as const;

export function desertTallStrip() {
  return strip([papyrus(1), papyrus(2), dryGrass, dryBush, sandstone, sapling]);
}

// --- Ambiente -----------------------------------------------------------------------

/** Grão de areia levado pelo vento: risco curto e claro (4×1). */
export function sandGrainCanvas() {
  const { canvas, ctx } = makeCanvas(4, 1);
  px(ctx, 0, 0, "rgba(255,240,205,0.25)");
  px(ctx, 1, 0, "rgba(255,240,205,0.6)");
  px(ctx, 2, 0, "rgba(255,246,220,0.9)", 2, 1);
  return canvas;
}

/** Nuvem de poeira baixa, cor de areia, quase transparente. */
export function dustCloudCanvas() {
  const w = 128;
  const h = 36;
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2) {
      const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
      const edge = 0.72 + hash(x, y, 470) * 0.3;
      if (d > edge) continue;
      const a = (1 - d / edge) * 0.2 + 0.03;
      px(ctx, x, y, `rgba(240,214,160,${a.toFixed(3)})`, 2, 2);
    }
  return canvas;
}

export const GLINT_FRAMES = 4;

/** Brilho do sol na água: estrelinha que acende e apaga (quadros 32×32). */
export function glintStrip() {
  return strip(Array.from({ length: GLINT_FRAMES }, (_, f) => (ctx: Ctx) => {
    const r = [1, 3, 2, 1][f];
    const a = [0.6, 1, 0.8, 0.35][f];
    const c = `rgba(240,255,250,${a})`;
    px(ctx, 16 - r, 16, c, r * 2 + 1, 1);
    px(ctx, 16, 16 - r, c, 1, r * 2 + 1);
    px(ctx, 16, 16, "#ffffff");
  }));
}

/** Sombra que as dunas jogam na areia baixa ao sul (0), a leste (1) e nos dois (2), em faixas. */
export function duneShadeStrip() {
  const rgb = "120,70,24";
  const bands = [0.3, 0.22, 0.15, 0.09, 0.05];
  const north = (ctx: Ctx) => bands.forEach((a, i) => sideBand(ctx, 0, (k) => (i + 1) * 2 + (hash(k, i, 480) < 0.3 ? 1 : 0), (d) => (d >= i * 2 ? `rgba(${rgb},${a})` : null)));
  const west = (ctx: Ctx) => bands.forEach((a, i) => sideBand(ctx, 3, (k) => (i + 1) * 2 + (hash(k, i, 481) < 0.3 ? 1 : 0), (d) => (d >= i * 2 ? `rgba(${rgb},${a})` : null)));
  return strip([north, west, (ctx) => { north(ctx); west(ctx); }]);
}
