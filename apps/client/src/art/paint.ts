/**
 * Pintura de criaturas em pixel art "fino" (2 pixels de arte por unidade do jogo, como os
 * outfits do Tibia): formas simples (esferas, membros, polígonos) com sombreamento em degraus
 * de uma rampa de cores, luz vindo de cima à esquerda, contorno escuro por fora e linhas
 * internas onde uma parte passa na frente de outra. Tudo determinístico, sem Math.random().
 */

/** Pixels de arte por unidade do jogo: o sprite é desenhado em 64×64 por tile e exibido na metade. */
export const ART_SCALE = 2;

/** 5 tons do mais escuro (contornos internos) ao brilho; o índice 2 é a cor base. */
export type Ramp = readonly [string, string, string, string, string];

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: Rgb): Rgb {
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

function hslToHex([h, s, l]: Rgb) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

/** Aproxima o matiz `h` de `target` (graus) em até `amount` graus, pelo caminho mais curto. */
function shiftHue(h: number, target: number, amount: number) {
  const diff = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(diff) * Math.min(Math.abs(diff), amount) + 360) % 360;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Rampa a partir da cor base: sombras puxam para o azul/roxo e ficam mais saturadas,
 * luzes puxam para o amarelo e perdem saturação (o "hue shifting" clássico do pixel art).
 */
export function ramp(base: string, contrast = 1): Ramp {
  const [h, s, l] = rgbToHsl(hexToRgb(base));
  const tone = (dl: number, hue: number, ds: number) => {
    const target = dl < 0 ? 250 : 50;
    return hslToHex([shiftHue(h, target, hue * s), clamp01(s + ds), clamp01(l + dl * contrast)]);
  };
  return [tone(-0.3, 24, 0.06), tone(-0.15, 12, 0.04), base, tone(0.11, 8, -0.04), tone(0.21, 14, -0.1)];
}

/** Rampa de uma cor só (olhos, brilhos, cordas). */
export const solid = (color: string): Ramp => [color, color, color, color, color];

/** Escurece uma cor (contorno externo). */
function darken(hex: string, f: number): Rgb {
  const [r, g, b] = hexToRgb(hex);
  return [r * f, g * f, b * f];
}

// Luz de cima, à esquerda e da frente (vetor normalizado).
const LIGHT = (() => {
  const v = [-0.5, -0.62, 0.6];
  const n = Math.hypot(...v);
  return v.map((c) => c / n);
})();

// Matriz de Bayer 4×4: desloca de leve os limiares, para os degraus de sombra não ficarem retos.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export interface Style {
  /** Faz parte da forma anterior: sem linha interna entre as duas. */
  join?: boolean;
  /** Linha escura onde esta forma cobre outra (padrão: sim nas formas, não em linhas e pontos). */
  edge?: boolean;
  /** Clareia (+) ou escurece (−) o sombreamento. */
  light?: number;
  /** Tom fixo da rampa (0 a 4), sem sombreamento. */
  shade?: number;
  /** Só pinta as linhas de `top` até `bottom` (exclusivo): elmos que cobrem metade da cabeça. */
  clip?: { top?: number; bottom?: number };
}

/** Folha de desenho de uma criatura: guarda rampa, tom e parte de cada pixel até `paint`. */
export class Sprite {
  private readonly ramps: Ramp[] = [];
  private readonly rampOf: Int16Array;
  private readonly shadeOf: Int8Array;
  private readonly partOf: Int32Array;
  private readonly edged: boolean[] = [false];
  private part = 0;
  private clipTop = -Infinity;
  private clipBottom = Infinity;

  constructor(readonly w: number, readonly h: number) {
    this.rampOf = new Int16Array(w * h);
    this.shadeOf = new Int8Array(w * h);
    this.partOf = new Int32Array(w * h);
  }

  private begin(style: Style, edgeDefault: boolean) {
    this.clipTop = style.clip?.top ?? -Infinity;
    this.clipBottom = style.clip?.bottom ?? Infinity;
    if (!style.join || this.part === 0) {
      this.part++;
      this.edged[this.part] = style.edge ?? edgeDefault;
    }
  }

  private put(x: number, y: number, r: Ramp, shade: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || y < this.clipTop || y >= this.clipBottom) return;
    let id = this.ramps.indexOf(r);
    if (id < 0) id = this.ramps.push(r) - 1;
    const i = y * this.w + x;
    this.rampOf[i] = id;
    this.shadeOf[i] = shade;
    this.partOf[i] = this.part;
  }

  /** Tom da rampa para a normal (nx, ny, nz) no pixel (x, y). */
  private tone(x: number, y: number, nx: number, ny: number, nz: number, style: Style) {
    if (style.shade !== undefined) return style.shade;
    const dither = (BAYER[(y & 3) * 4 + (x & 3)] / 15 - 0.5) * 0.14;
    const v = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + (style.light ?? 0) + dither;
    return v < 0.12 ? 1 : v < 0.6 ? 2 : v < 0.9 ? 3 : 4;
  }

  /** Elipse sombreada como uma esfera. */
  sphere(cx: number, cy: number, rx: number, ry: number, r: Ramp, style: Style = {}) {
    this.begin(style, true);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        this.put(x, y, r, this.tone(x, y, nx, ny, Math.sqrt(1 - d), style));
      }
    }
    return this;
  }

  /** Membro: cápsula de (x0, y0) a (x1, y1) com raio variando de r0 a r1, sombreada como um cilindro. */
  limb(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, r: Ramp, style: Style = {}) {
    this.begin(style, true);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    const rm = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - rm); y <= Math.ceil(Math.max(y0, y1) + rm); y++) {
      for (let x = Math.floor(Math.min(x0, x1) - rm); x <= Math.ceil(Math.max(x0, x1) + rm); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
        const rad = r0 + (r1 - r0) * t;
        const nx = (px - (x0 + dx * t)) / rad;
        const ny = (py - (y0 + dy * t)) / rad;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        this.put(x, y, r, this.tone(x, y, nx, ny, Math.sqrt(1 - d), style));
      }
    }
    return this;
  }

  /** Cadeia de membros por vários pontos [x, y, raio, ...] (caudas, pescoços, arcos). */
  chain(points: number[], r: Ramp, style: Style = {}) {
    for (let i = 0; i + 5 < points.length; i += 3) {
      this.limb(points[i], points[i + 1], points[i + 3], points[i + 4], points[i + 2], points[i + 5], r, i ? { ...style, join: true } : style);
    }
    return this;
  }

  /**
   * Polígono [x, y, ...]. Sem `shade`, é sombreado como um cilindro de pé (túnicas, saias,
   * lâminas), mais claro do lado esquerdo da sua largura.
   */
  poly(points: number[], r: Ramp, style: Style = {}) {
    this.begin(style, true);
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const cx = (minX + maxX) / 2;
    const hw = Math.max(1, (maxX - minX) / 2);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        if (!inside(points, x + 0.5, y + 0.5)) continue;
        const nx = Math.max(-0.95, Math.min(0.95, (x + 0.5 - cx) / hw));
        this.put(x, y, r, this.tone(x, y, nx, -0.15, Math.sqrt(1 - nx * nx), style));
      }
    }
    return this;
  }

  /** Linha de 1 pixel (Bresenham), num tom fixo. */
  line(x0: number, y0: number, x1: number, y1: number, r: Ramp, shade = 2, style: Style = {}) {
    this.begin(style, false);
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.put(x0, y0, r, shade);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Pixels soltos [x, y, ...] num tom fixo (olhos, rebites, brilhos). */
  dots(points: number[], r: Ramp, shade = 2, style: Style = {}) {
    this.begin(style, false);
    for (let i = 0; i + 1 < points.length; i += 2) this.put(Math.round(points[i]), Math.round(points[i + 1]), r, shade);
    return this;
  }

  /** Retângulo num tom fixo. */
  rect(x: number, y: number, w: number, h: number, r: Ramp, shade = 2, style: Style = {}) {
    this.begin(style, false);
    for (let yy = Math.round(y); yy < Math.round(y + h); yy++) {
      for (let xx = Math.round(x); xx < Math.round(x + w); xx++) this.put(xx, yy, r, shade);
    }
    return this;
  }

  /** Aplica as linhas internas e o contorno externo e pinta em `ctx` na posição (ox, oy). */
  paint(ctx: CanvasRenderingContext2D, ox = 0, oy = 0) {
    const { w, h, partOf, shadeOf, rampOf } = this;
    const img = ctx.createImageData(w, h);
    const data = img.data;
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : partOf[y * w + x]);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const part = partOf[i];
        let rgb: Rgb | undefined;
        if (part) {
          let shade = shadeOf[i];
          if (this.edged[part] && near.some(([dx, dy]) => { const p = at(x + dx, y + dy); return p !== 0 && p < part; })) shade = 0;
          rgb = hexToRgb(this.ramps[rampOf[i]][shade]);
        } else {
          // Contorno: pixel vazio colado numa forma ganha o tom mais escuro dela, bem escurecido.
          for (const [dx, dy] of near) {
            const p = at(x + dx, y + dy);
            if (p) { rgb = darken(this.ramps[rampOf[(y + dy) * w + x + dx]][0], 0.42); break; }
          }
        }
        if (!rgb) continue;
        data.set([rgb[0], rgb[1], rgb[2], 255], i * 4);
      }
    }
    ctx.putImageData(img, ox, oy);
  }
}

function inside(points: number[], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const xi = points[i], yi = points[i + 1], xj = points[j], yj = points[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Escala dos sprites de criatura no jogo: o quadro tem `ART_SCALE` pixels de arte por unidade. */
export const CREATURE_SPRITE_SCALE = 1 / ART_SCALE;
/** Heróis usam a mesma densidade de pixels dos monstros (o tamanho vem do desenho). */
export const HERO_SPRITE_SCALE = CREATURE_SPRITE_SCALE;

/** O que se pode pintar: uma `Sprite` ou uma vista ampliada dela (`scaled`). */
export interface Painter {
  sphere(cx: number, cy: number, rx: number, ry: number, r: Ramp, style?: Style): Painter;
  limb(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, r: Ramp, style?: Style): Painter;
  chain(points: number[], r: Ramp, style?: Style): Painter;
  poly(points: number[], r: Ramp, style?: Style): Painter;
  line(x0: number, y0: number, x1: number, y1: number, r: Ramp, shade?: number, style?: Style): Painter;
  dots(points: number[], r: Ramp, shade?: number, style?: Style): Painter;
  rect(x: number, y: number, w: number, h: number, r: Ramp, shade?: number, style?: Style): Painter;
}

/**
 * Vista de `s` ampliada `f` vezes: o ponto `from` do desenho vai para `to` na folha. Formas e
 * raios crescem; linhas e pontos continuam com 1 pixel (o detalhe fica mais fino, não mais grosso).
 */
export function scaled(s: Painter, f: number, from: { x: number; y: number }, to: { x: number; y: number }): Painter {
  const X = (x: number) => to.x + (x - from.x) * f;
  const Y = (y: number) => to.y + (y - from.y) * f;
  const pts = (p: number[]) => p.map((v, i) => (i % 2 ? Y(v) : X(v)));
  const clip = (style?: Style): Style | undefined => style?.clip
    ? { ...style, clip: { top: style.clip.top === undefined ? undefined : Y(style.clip.top), bottom: style.clip.bottom === undefined ? undefined : Y(style.clip.bottom) } }
    : style;
  const view: Painter = {
    sphere: (cx, cy, rx, ry, r, st) => (s.sphere(X(cx), Y(cy), rx * f, ry * f, r, clip(st)), view),
    limb: (x0, y0, x1, y1, r0, r1, r, st) => (s.limb(X(x0), Y(y0), X(x1), Y(y1), r0 * f, r1 * f, r, clip(st)), view),
    chain: (p, r, st) => (s.chain(p.map((v, i) => (i % 3 === 0 ? X(v) : i % 3 === 1 ? Y(v) : v * f)), r, clip(st)), view),
    poly: (p, r, st) => (s.poly(pts(p), r, clip(st)), view),
    line: (x0, y0, x1, y1, r, shade, st) => (s.line(X(x0), Y(y0), X(x1), Y(y1), r, shade, clip(st)), view),
    dots: (p, r, shade, st) => (s.dots(pts(p), r, shade, clip(st)), view),
    rect: (x, y, w, h, r, shade, st) => (s.rect(X(x), Y(y), w * f, h * f, r, shade, clip(st)), view),
  };
  return view;
}
