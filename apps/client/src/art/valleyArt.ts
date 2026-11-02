/**
 * O vale lá embaixo da Fortaleza Orc, visto do alto do castelo pelo abismo: uma textura só, pintada por código e que
 * emenda nos quatro lados (repete a cada `VALLEY_W` × `VALLEY_H` px), no lugar dos tiles de capim, água e mata (que, vistos de
 * longe, mostravam a grade dos tiles). Fim de tarde: o sol baixo vem do oeste, as copas jogam sombra comprida para o
 * leste, e a distância puxa tudo para o azul.
 *
 * O que tem: campina com manchas de capim seco, matas (copas redondas, uma a uma, com luz e sombra), um rio
 * serpenteando com as margens de lama, trilhas de terra, pedras e as ruínas do império (alicerces de casas quebrados,
 * tocos de coluna). `VALLEY_TEXEL` px valem um tile do vale.
 */
export const VALLEY_W = 2048;
export const VALLEY_H = 1024;
/**
 * Pixels da textura por tile do vale (o vale é desenhado em meia escala: um tile do castelo vale 2 dele). Com isso a
 * textura só repete a cada ~27 tiles do castelo na largura (mais que a tela deitada) e ~13 na altura.
 */
export const VALLEY_TEXEL = 38;

type RGB = [number, number, number];

const SW = VALLEY_W, SH = VALLEY_H;
const wrapX = (v: number) => ((v % SW) + SW) % SW;
const wrapY = (v: number) => ((v % SH) + SH) % SH;
/** Índice do pixel (x, y), dando a volta nas bordas. */
const at = (x: number, y: number) => wrapY(y) * SW + wrapX(x);
const smooth = (t: number) => t * t * (3 - 2 * t);
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)];

/** Hash rápido de 2 inteiros (0 a 1): a pintura chama isto milhões de vezes. */
function h2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Os valores sorteados da grade de cada ruído (`cell`, `seed`), guardados: o ruído só interpola. */
const lattices = new Map<number, Float32Array>();
function lattice(cell: number, seed: number) {
  const key = seed * 4096 + cell;
  let l = lattices.get(key);
  if (!l) {
    const nx = SW / cell, ny = SH / cell;
    l = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) l[j * nx + i] = h2(i, j, seed);
    lattices.set(key, l);
  }
  return l;
}

/** Ruído suave que repete com a textura (a grade de `cell` px dá a volta). */
function pnoise(x: number, y: number, cell: number, seed: number) {
  const nx = SW / cell, ny = SH / cell;
  const l = lattice(cell, seed);
  const fx = x / cell, fy = y / cell;
  const gx = Math.floor(fx), gy = Math.floor(fy);
  const sx = smooth(fx - gx), sy = smooth(fy - gy);
  const i0 = ((gx % nx) + nx) % nx, j0 = ((gy % ny) + ny) % ny, i1 = (i0 + 1) % nx, j1 = (j0 + 1) % ny;
  const a = l[j0 * nx + i0], b = l[j0 * nx + i1], c = l[j1 * nx + i0], d = l[j1 * nx + i1];
  const top = a + (b - a) * sx;
  return top + (c + (d - c) * sx - top) * sy;
}

/** Soma de oitavas (0 a 1). */
function fbm(x: number, y: number, cells: number[], seed: number) {
  let sum = 0, weight = 0, w = 1;
  for (const [k, cell] of cells.entries()) {
    sum += pnoise(x, y, cell, seed + k * 17) * w;
    weight += w;
    w *= 0.5;
  }
  return sum / weight;
}

/** Campo inteiro calculado de 2 em 2 px e interpolado (a pintura sai 4 vezes mais rápida e ninguém vê a diferença). */
function grid(fn: (x: number, y: number) => number): Float32Array {
  const hw = SW / 2, hh = SH / 2;
  const coarse = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) coarse[y * hw + x] = fn(x * 2, y * 2);
  const out = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++) {
    const y0 = y >> 1, y1 = (y0 + 1) % hh, ty = (y & 1) * 0.5;
    for (let x = 0; x < SW; x++) {
      const x0 = x >> 1, x1 = (x0 + 1) % hw, tx = (x & 1) * 0.5;
      const top = coarse[y0 * hw + x0] * (1 - tx) + coarse[y0 * hw + x1] * tx;
      const bottom = coarse[y1 * hw + x0] * (1 - tx) + coarse[y1 * hw + x1] * tx;
      out[y * SW + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

/** Distância (em px) até a curva de nível `level` de um campo: |valor − nível| / |gradiente|. */
function contour(f: Float32Array, level: number): Float32Array {
  const out = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const gx = (f[at(x + 1, y)] - f[at(x - 1, y)]) / 2;
      const gy = (f[at(x, y + 1)] - f[at(x, y - 1)]) / 2;
      out[y * SW + x] = Math.abs(f[y * SW + x] - level) / Math.max(1e-5, Math.hypot(gx, gy));
    }
  return out;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Paleta do fim de tarde (antes da névoa da distância, que vem no fim).
const MEADOW: RGB = [92, 118, 60];
const MEADOW_LUSH: RGB = [70, 104, 54];
const MEADOW_DRY: RGB = [138, 134, 76];
const MUD: RGB = [92, 82, 58];
const PATH: RGB = [146, 124, 86];
const WATER_DEEP: RGB = [40, 70, 86];
const WATER: RGB = [62, 100, 112];
const WATER_SHINE: RGB = [196, 178, 132];
const FOREST_FLOOR: RGB = [38, 54, 36];
/** Copas: da sombra ao brilho do sol baixo (folhosas e pinheiros). */
const LEAF: RGB[] = [[30, 48, 34], [46, 72, 44], [70, 98, 54], [112, 128, 66]];
const PINE: RGB[] = [[24, 42, 38], [36, 60, 50], [54, 82, 62], [86, 108, 70]];
const STONE: RGB[] = [[86, 84, 82], [138, 130, 116], [176, 166, 144], [204, 194, 168]];
const HAZE: RGB = [104, 122, 142];

export function valleyTexture(): Uint8ClampedArray {
  const rgb = new Float32Array(SW * SH * 3);
  const set = (x: number, y: number, c: RGB) => {
    const i = at(x, y) * 3;
    rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
  };
  const get = (x: number, y: number): RGB => {
    const i = at(x, y) * 3;
    return [rgb[i], rgb[i + 1], rgb[i + 2]];
  };
  const shadeAt = (x: number, y: number, k: number) => {
    const i = at(x, y) * 3;
    rgb[i] *= k; rgb[i + 1] *= k; rgb[i + 2] *= k;
  };

  // Campos de base: umidade (capim verde x seco), mata, o rio e as trilhas.
  const wet = grid((x, y) => fbm(x, y, [512, 256, 128], 11));
  const wood = grid((x, y) => fbm(x, y, [256, 128, 64], 23));
  const pathField = grid((x, y) => fbm(x, y, [512, 256], 53));
  const path = contour(pathField, 0.47);
  // O rio atravessa a textura de oeste a leste serpenteando (a linha do meio é uma soma de senos que dá a volta) e dois
  // córregos descem de norte a sul até ele. Guarda a distância até a linha do meio e a meia largura de cada ponto.
  const river = new Float32Array(SW * SH).fill(1e9);
  const halfAt = new Float32Array(SW * SH);
  const fold = (v: number, n: number) => { const m = ((v % n) + n) % n; return m > n / 2 ? n - m : m; };
  // [ao longo de x?, fase, base, amplitude, meia largura, variação da largura, semente]
  const courses = [[true, 1.1, 300, 120, 8, 6, 37], [false, 2.4, 620, 90, 3.5, 2.5, 38], [false, 0.3, 1500, 70, 3, 2, 39]] as const;
  for (const [alongX, phase, base, amp, half, vary, seed] of courses) {
    const len = alongX ? SW : SH, across = alongX ? SH : SW;
    // O ruído da linha corre no mesmo eixo dela (para dar a volta junto com a textura).
    const wobble = (t: number) => (alongX ? pnoise(t, 0, 128, seed) : pnoise(0, t, 128, seed));
    const course = (t: number) =>
      base + amp * Math.sin((2 * Math.PI * t) / len + phase) + amp * 0.4 * Math.sin((6 * Math.PI * t) / len + phase * 2) + (wobble(t) - 0.5) * 80;
    for (let t = 0; t < len; t++) {
      const m = course(t);
      const cos = 1 / Math.hypot(1, (course(t + 1) - course(t - 1)) / 2);
      const hw = half + (alongX ? pnoise(t, 0, 128, seed + 24) : pnoise(0, t, 128, seed + 24)) * vary;
      for (let o = 0; o < across; o++) {
        const i = alongX ? o * SW + t : t * SW + o;
        const d = fold(o - m, across) * cos;
        if (d - hw < river[i] - halfAt[i]) { river[i] = d; halfAt[i] = hw; }
      }
    }
  }
  const riverHalf = (x: number, y: number) => halfAt[at(x, y)];
  const inRiver = (x: number, y: number) => river[at(x, y)] < riverHalf(x, y);
  const nearRiver = (x: number, y: number, extra: number) => river[at(x, y)] < riverHalf(x, y) + extra;

  // 1. Campina: verde onde é úmido, seco no alto; o capim granulado em tufos.
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x;
      const w = wet[i];
      let c = w > 0.5 ? mix(MEADOW, MEADOW_LUSH, Math.min(1, (w - 0.5) * 4)) : mix(MEADOW, MEADOW_DRY, Math.min(1, (0.5 - w) * 3.2));
      // Tufos: manchas pequenas mais claras e mais escuras, em 3 degraus com pontilhado (pixel art, sem degradê liso).
      const tuft = pnoise(x, y, 16, 71) + (h2(x, y, 72) - 0.5) * 0.35;
      const step = tuft > 0.68 ? 1.1 : tuft < 0.32 ? 0.88 : 1;
      // Pintas soltas: flores secas claras e touceiras escuras.
      const dot = h2(x, y, 73);
      const speck = dot < 0.025 ? 1.22 : dot > 0.965 ? 0.8 : 1;
      c = [c[0] * step * speck, c[1] * step * speck, c[2] * step * speck];
      // Floresta: o chão escuro entre as copas.
      if (wood[i] > 0.59) c = mix(c, FOREST_FLOOR, Math.min(1, (wood[i] - 0.59) * 12));
      set(x, y, c);
    }

  // 2. Trilhas de terra (fora da mata e do rio), com a beira pontilhada.
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x;
      if (wood[i] > 0.56 || nearRiver(x, y, 6)) continue;
      const d = path[i] - 2.6;
      if (d < 0) set(x, y, mix(get(x, y), PATH, 0.85));
      else if (d < 2 && h2(x, y, 81) > d / 2) set(x, y, mix(get(x, y), PATH, 0.45));
    }

  // 3. O rio: margem de lama, a água mais funda no meio e o brilho do sol baixo em riscos.
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x;
      const half = riverHalf(x, y);
      const d = river[i];
      if (d < half) {
        const t = d / half;
        let c = mix(WATER_DEEP, WATER, Math.min(1, t * 1.3));
        if (t > 0.78) c = mix(c, MUD, 0.35);
        const shine = pnoise(x, y, 8, 91) * pnoise(x, y, 64, 92);
        if (t < 0.7 && shine > 0.5 + bayer(x, y) * 0.12) c = mix(c, WATER_SHINE, 0.35);
        set(x, y, c);
      } else if (d < half + 4 && h2(x, y, 93) < 1 - (d - half) / 4) {
        set(x, y, mix(get(x, y), MUD, 0.7));
      }
    }

  // 4. Árvores: uma copa por célula de uma grade com sorteio de posição; mata fechada onde `wood` é alto e algumas
  // soltas na campina. Primeiro as sombras (compridas para o leste, sol baixo do oeste), depois as copas de cima para
  // baixo (a de baixo cobre a de cima).
  interface Tree { x: number; y: number; r: number; pine: boolean }
  const trees: Tree[] = [];
  const CELL = 17;
  for (let gy = 0; gy < Math.floor(SH / CELL); gy++)
    for (let gx = 0; gx < Math.floor(SW / CELL); gx++) {
      const x = Math.round(gx * CELL + h2(gx, gy, 101) * CELL);
      const y = Math.round(gy * CELL + h2(gx, gy, 102) * CELL);
      const w = wood[at(x, y)];
      const dense = w + (h2(gx, gy, 103) - 0.5) * 0.12 > 0.58;
      const lone = !dense && h2(gx, gy, 104) < 0.012 + Math.max(0, w - 0.45) * 0.4;
      if ((!dense && !lone) || nearRiver(x, y, 10)) continue;
      if (path[at(x, y)] < 9 && !dense) continue;
      const pine = pnoise(x, y, 256, 105) > 0.6;
      trees.push({ x, y, r: (lone ? 9 : 8) + h2(gx, gy, 106) * 5, pine });
    }
  const crown = (t: Tree, x: number, y: number) => {
    const dx = x - t.x, dy = y - t.y;
    const bump = 1 + (pnoise(Math.atan2(dy, dx) * 40 + 512, t.x + t.y, 8, 107) - 0.5) * 0.3;
    return Math.hypot(dx, dy * 1.08) / (t.r * bump);
  };
  for (const t of trees) {
    // Sombra: a copa repetida mais para o leste e um pouco para baixo, alongada.
    const len = t.r * 1.6;
    for (let y = Math.floor(t.y - t.r); y <= t.y + t.r + 4; y++)
      for (let x = Math.floor(t.x - t.r); x <= t.x + t.r + len; x++) {
        const along = Math.max(0, Math.min(len, x - t.x));
        const dx = x - t.x - along, dy = y - t.y - 4 - along * 0.15;
        if (Math.hypot(dx, dy) < t.r * 0.95) shadeAt(x, y, 0.62);
      }
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) {
    const ramp = t.pine ? PINE : LEAF;
    for (let y = Math.floor(t.y - t.r - 2); y <= t.y + t.r + 2; y++)
      for (let x = Math.floor(t.x - t.r - 2); x <= t.x + t.r + 2; x++) {
        const d = crown(t, x, y);
        if (d > 1) continue;
        // Luz de cima e do oeste: a borda de baixo e do leste na sombra; folhagem em tufos (ruído fino).
        const nx = (x - t.x) / t.r, ny = (y - t.y) / t.r;
        let l = 0.55 - nx * 0.45 - ny * 0.4 - d * d * 0.25 + (pnoise(x, y, 4, 108) - 0.5) * 0.35 + (pnoise(x, y, 8, 109) - 0.5) * 0.35;
        if (d > 0.9) l -= 0.3;
        const k = Math.max(0, Math.min(3, Math.floor(l * 3 + bayer(x, y) * 0.9)));
        set(x, y, ramp[k]);
      }
  }

  // 5. Pedras soltas na campina.
  for (let gy = 0; gy < SH / 32; gy++)
    for (let gx = 0; gx < SW / 32; gx++) {
      if (h2(gx, gy, 121) > 0.1) continue;
      const x = gx * 32 + Math.floor(h2(gx, gy, 122) * 32), y = gy * 32 + Math.floor(h2(gx, gy, 123) * 32);
      if (wood[at(x, y)] > 0.53 || nearRiver(x, y, 4)) continue;
      const r = 2 + Math.floor(h2(gx, gy, 124) * 3);
      for (let k = 0; k <= r + 2; k++) for (let j = 0; j < 2; j++) shadeAt(x + k + 1, y + 1 + j, 0.7);
      for (let dy = -r; dy <= 0; dy++)
        for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) set(x + dx, y + dy, STONE[dy === -r || dx === -r ? 2 : 1]);
    }

  // 6. Ruínas do império: alicerces de casas (retângulos de muro quebrado, a luz no lado oeste e a sombra no leste)
  // e tocos de coluna em fila, no capim aberto.
  for (let gy = 0; gy < SH / 256; gy++)
    for (let gx = 0; gx < SW / 256; gx++) {
      if (h2(gx, gy, 131) > 0.85) continue;
      const x0 = gx * 256 + 40 + Math.floor(h2(gx, gy, 132) * 150);
      const y0 = gy * 256 + 40 + Math.floor(h2(gx, gy, 133) * 150);
      const w = 30 + Math.floor(h2(gx, gy, 134) * 36), h = 22 + Math.floor(h2(gx, gy, 135) * 26);
      let clear = true;
      for (let y = y0 - 8; y < y0 + h + 8 && clear; y += 3)
        for (let x = x0 - 8; x < x0 + w + 8 && clear; x += 3) if (wood[at(x, y)] > 0.53 || nearRiver(x, y, 8)) clear = false;
      if (!clear) continue;
      if (h2(gx, gy, 136) < 0.35) {
        // Fila de colunas caídas: tocos de 5x5 com sombra.
        for (let k = 0; k < 5; k++) {
          if (h2(gx, gy, 137 + k) < 0.25) continue;
          const cx = x0 + k * 14, cy = y0 + 8;
          for (let s = 1; s <= 8; s++) for (let j = -1; j <= 2; j++) shadeAt(cx + 2 + s, cy + j, 0.65);
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) < 4) set(cx + dx, cy + dy, STONE[dx + dy < -1 ? 3 : dx + dy > 1 ? 1 : 2]);
        }
        continue;
      }
      // O chão de dentro, de terra e pedra solta, e as paredes de 4 px com falhas.
      for (let y = y0 + 4; y < y0 + h - 3; y++)
        for (let x = x0 + 4; x < x0 + w - 3; x++) if (h2(x, y, 138) < 0.6) set(x, y, mix(get(x, y), PATH, 0.4));
      const wallAt = (x: number, y: number) => (x - x0 < 4 || x0 + w - x <= 4 || y - y0 < 4 || y0 + h - y <= 4);
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          if (!wallAt(x, y)) continue;
          if (pnoise(x, y, 16, 139 + gx * 3 + gy) < 0.32) continue;
          for (let s = 1; s <= 4; s++) shadeAt(x + s, y + 2, 0.75);
        }
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++) {
          if (!wallAt(x, y) || pnoise(x, y, 16, 139 + gx * 3 + gy) < 0.32) continue;
          const lit = x - x0 < 2 || y - y0 < 2;
          set(x, y, STONE[lit ? 3 : h2(x, y, 140) < 0.3 ? 1 : 2]);
        }
    }

  // 7. Sombra das nuvens (manchas grandes e suaves) e a distância: tudo puxado para o azul e escurecido.
  const out = new Uint8ClampedArray(SW * SH * 4);
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x;
      const cloud = pnoise(x, y, 512, 151) * 0.6 + pnoise(x, y, 256, 152) * 0.4;
      const k = 0.8 + 0.2 * smooth(Math.max(0, Math.min(1, (cloud - 0.3) * 4)));
      const c = mix([rgb[i * 3] * k, rgb[i * 3 + 1] * k, rgb[i * 3 + 2] * k], HAZE, 0.12);
      out[i * 4] = c[0];
      out[i * 4 + 1] = c[1];
      out[i * 4 + 2] = c[2];
      out[i * 4 + 3] = 255;
    }
  return out;
}
