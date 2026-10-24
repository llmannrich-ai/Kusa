import { TILE_SIZE } from "@kusa/shared";

/** Grade de pixels em texto: cada caractere é uma cor da paleta e "." é transparente. */
export type Grid = readonly string[];
export type Palette = Readonly<Record<string, string>>;

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Pinta uma grade em (x, y); com `flip`, espelha na horizontal dentro da largura da grade. */
export function paintGrid(ctx: CanvasRenderingContext2D, grid: Grid, palette: Palette, x: number, y: number, flip = false) {
  const width = grid[0]?.length ?? 0;
  grid.forEach((row, gy) => {
    if (row.length !== width) throw new Error(`Grade com linhas de tamanhos diferentes: "${row}"`);
    for (let gx = 0; gx < row.length; gx++) {
      const ch = row[gx];
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color) throw new Error(`Cor "${ch}" fora da paleta`);
      ctx.fillStyle = color;
      ctx.fillRect(x + (flip ? width - 1 - gx : gx), y + gy, 1, 1);
    }
  });
}

/** Hash inteiro determinístico, para variar a arte por tile sem depender de Math.random(). */
export function hash(...values: number[]) {
  let h = 2166136261;
  for (const v of values) {
    h = Math.imul(h ^ (v | 0), 16777619);
  }
  // Finalizador do murmur3: espalha os bits para vizinhos não parecerem listrados.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// --- Desenho pixel a pixel (enfeites dos mapas) ------------------------------------

export type Ctx = CanvasRenderingContext2D;

/** Um pixel (ou um bloco w×h) numa cor; alpha opcional. */
export function px(ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/**
 * Elipse cheia com contorno escuro, luz em cima à esquerda e sombra embaixo à direita.
 * `skip` recorta pixels (ex.: o corte da vitória-régia).
 */
export function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: { o: string; m: string; l: string; d: string }, skip?: (x: number, y: number) => boolean) {
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
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string) {
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

/** Desenho em camadas: cada pixel guarda uma cor; depois ganha contorno escuro onde encosta no vazio. */
export class Sheet {
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

/** Faixa horizontal de quadros 32×32, cada um desenhado por uma função. */
export function strip(frames: ((ctx: Ctx) => void)[]) {
  const { canvas, ctx } = makeCanvas(TILE_SIZE * frames.length, TILE_SIZE);
  frames.forEach((draw, i) => {
    ctx.save();
    ctx.translate(i * TILE_SIZE, 0);
    draw(ctx);
    ctx.restore();
  });
  return canvas;
}
