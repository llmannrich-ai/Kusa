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
