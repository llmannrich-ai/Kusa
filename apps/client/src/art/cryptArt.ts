import { makeCanvas } from "./pixels.ts";
import {
  Canvas, F, K, KNIGHT_LOOK, Mat, chain, ebox, ellipse, fang, flame, gem, inEllipse, leaf, limb, lit, noise, plate, poly, rivet,
  sphere, stone, thread, grain, linen, type Offset, type Pt,
} from "./proto/tibiaHero.ts";

/**
 * Cripta no padrão novo (`docs/ARTE_TIBIA.md`): o mesmo pincel dos heróis (luz de cima à esquerda em faixas,
 * contorno escuro, peça da frente riscando a de trás), em **128 px por tile**. Cada faixa tem os mesmos quadros,
 * na mesma ordem, da arte antiga (`cryptDecor.ts`, `walls.ts`), só que 4× maiores: o mapa (`cryptMap.ts`) troca a
 * textura e desenha em ¼ de escala.
 *
 * Unidades de projeto como nos heróis (`K` px cada): o tile tem 64 unidades.
 */

/** Pixels de arte por tile. */
export const CRYPT_TILE = 128;
const T = 64;

type Draw = (c: Canvas) => void;

/** Um quadro de tile desenhado no papel novo. */
function frame(draw: Draw, outline = true, h = CRYPT_TILE): Uint8ClampedArray {
  const c = new Canvas(CRYPT_TILE, h);
  draw(c);
  return c.render(KNIGHT_LOOK, outline);
}

/** Quadros lado a lado numa faixa (a mesma ordem dos índices da arte antiga). */
function strip(frames: Uint8ClampedArray[], h = CRYPT_TILE) {
  const { canvas, ctx } = makeCanvas(CRYPT_TILE * frames.length, h);
  frames.forEach((data, i) => {
    const image = ctx.createImageData(CRYPT_TILE, h);
    image.data.set(data);
    ctx.putImageData(image, i * CRYPT_TILE, 0);
  });
  return canvas;
}

// --- Chão --------------------------------------------------------------------------------

type Rect = readonly [number, number, number, number];

/** Jeitos de assentar as lajes num tile: a junta da borda é sempre a mesma, então os tiles emendam. */
const LAYOUTS: Rect[][] = [
  [[0, 0, 32, 32], [32, 0, 64, 32], [0, 32, 32, 64], [32, 32, 64, 64]],
  [[0, 0, 64, 30], [0, 30, 26, 64], [26, 30, 64, 64]],
  [[0, 0, 38, 34], [38, 0, 64, 34], [0, 34, 64, 64]],
  [[0, 0, 28, 64], [28, 0, 64, 24], [28, 24, 64, 64]],
  [[0, 0, 64, 64]],
  [[0, 0, 22, 22], [22, 0, 64, 22], [0, 22, 40, 64], [40, 22, 64, 64]],
];

/** Laje de pedra com bisel: borda de cima e da esquerda pegam luz, a de baixo e a da direita ficam na sombra. */
function slab(c: Canvas, r: Rect, mat: Mat, seed: number, wear: Offset) {
  const gap = 0.7;
  const [x0, y0, x1, y1] = [r[0] + gap, r[1] + gap, r[2] - gap, r[3] - gap];
  const tone = noise(seed, 3) < 0.25 ? -1 : 0;
  const tilt = (noise(seed, 5) - 0.5) * 0.08;
  const corner = 1.4;
  return c.fill([x0, y0, x1, y1], (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (px < x0 || py < y0 || px > x1 || py > y1) return false;
    const dx = Math.min(px - x0, x1 - px), dy = Math.min(py - y0, y1 - py);
    return !(dx < corner && dy < corner && Math.hypot(corner - dx, corner - dy) > corner);
  }, mat, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    const l = px - x0, t = py - y0, rr = x1 - px, b = y1 - py;
    const e = Math.min(l, t, rr, b);
    if (e < 1.3) return t === e || l === e ? (t === e ? 0.95 : 0.82) : b === e ? 0.2 : 0.3;
    return 0.5 + tilt * ((px - x0) / (x1 - x0) - 0.5) * 4;
  }, (X, Y) => tone + wear(X, Y));
}

/** Chão da cripta: lajes gastas, rachaduras, lascas e musgo nas juntas. `boss`: lajes queimadas do covil. */
function floorTile(variant: number, boss: boolean): Draw {
  return (c) => {
    c.fill([0, 0, T, T], () => true, Mat.Soot, () => 0.35, (X, Y) => (noise(X, Y) < 0.2 ? -1 : 0));
    const layout = LAYOUTS[(variant * 5 + (boss ? 2 : 0)) % LAYOUTS.length];
    const wear: Offset = (X, Y) => stone(X, Y) + (noise(X >> 2, Y >> 2) < 0.06 ? -1 : 0);
    layout.forEach((r, i) => {
      const seed = variant * 31 + i * 7 + (boss ? 500 : 0);
      const id = slab(c, r, boss ? (noise(seed, 9) < 0.5 ? Mat.Slate : Mat.Stone) : Mat.Slate, seed, wear);
      const [x0, y0, x1, y1] = r;
      // Rachadura em zigue-zague numa laje sim, outra não.
      if (noise(seed, 1) < 0.45) {
        let p: Pt = [x0 + 3 + noise(seed, 2) * (x1 - x0 - 6), y0 + 2];
        const steps = 3 + Math.floor(noise(seed, 6) * 3);
        for (let k = 0; k < steps; k++) {
          const q: Pt = [p[0] + (noise(seed, 10 + k) - 0.5) * 7, p[1] + (y1 - y0) / (steps + 1)];
          thread(c, p, q, Mat.Slate, 0, [id]);
          thread(c, [p[0] + 0.5, p[1]], [q[0] + 0.5, q[1]], Mat.Slate, 4, [id]);
          p = q;
        }
      }
      // Lascas no canto e pó claro.
      if (noise(seed, 7) < 0.4) for (let k = 0; k < 4; k++) c.on(id, F(x1 - 2) - k, F(y1 - 2) - (k % 2), Mat.Soot, 1);
      if (boss) {
        // Fuligem do fogo do dragão e, às vezes, uma brasa na junta.
        for (let Y = F(y0); Y < F(y1); Y++) for (let X = F(x0); X < F(x1); X++) {
          const n = noise(X >> 2, (Y >> 2) + seed);
          if (n < 0.22 && (X + Y) % 2 === 0) c.on(id, X, Y, Mat.Soot, 1);
        }
      }
    });
    // Musgo e terra nas juntas.
    for (let Y = 0; Y < CRYPT_TILE; Y++) for (let X = 0; X < CRYPT_TILE; X++) {
      if (c.mat[Y * CRYPT_TILE + X] !== Mat.Soot) continue;
      const n = noise(X + variant * 97, Y);
      if (!boss && n < 0.05) c.px(X, Y, Mat.Moss, noise(Y, X) < 0.5 ? 1 : 2);
      else if (boss && n < 0.015) c.px(X, Y, Mat.Ember, 3);
    }
  };
}

/** Variações do chão comum e do covil (a primeira é a base, que cobre metade dos tiles). */
export const CRYPT_FLOOR_VARIANTS = 8;
export const CRYPT_BOSS_VARIANTS = 4;
export const cryptFloorTiles = () => strip(Array.from({ length: CRYPT_FLOOR_VARIANTS }, (_, v) => frame(floorTile(v, false), false)));
export const cryptBossTiles = () => strip(Array.from({ length: CRYPT_BOSS_VARIANTS }, (_, v) => frame(floorTile(v, true), false)));

// --- Enfeites do chão (mesma ordem de `CRYPT_FLOOR`) -----------------------------------------

/** Osso comprido com as duas cabeças. */
function bone(c: Canvas, a: Pt, b: Pt, r = 0.85) {
  return c.together(() => {
    limb(c, a, b, r, r, Mat.Bone, linen);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    for (const p of [a, b]) for (const s of [-1, 1]) ellipse(c, p[0] + nx * s * r * 0.9, p[1] + ny * s * r * 0.9, r * 1.05, r * 1.05, Mat.Bone);
  });
}

/** Caveira caída: crânio, órbitas, nariz e dentes. `look` = −1 olhando para a esquerda, 1 para a direita. */
function skull(c: Canvas, at: Pt, r: number, look = 0) {
  const id = ellipse(c, at[0], at[1], r, r * 0.9, Mat.Bone);
  const jaw = ellipse(c, at[0] + look * r * 0.15, at[1] + r * 0.75, r * 0.62, r * 0.42, Mat.Bone);
  for (const s of [-1, 1]) {
    const ex = at[0] + s * r * 0.38 + look * r * 0.18, ey = at[1] + r * 0.1;
    c.fill(ebox(ex, ey, r * 0.3, r * 0.3), inEllipse(ex, ey, r * 0.28, r * 0.3), Mat.Soot, () => 0.1);
  }
  c.on(id, F(at[0] + look * r * 0.2), F(at[1] + r * 0.45), Mat.Soot, 0);
  for (let k = -2; k <= 2; k++) c.on(jaw, F(at[0] + look * r * 0.15 + k * r * 0.18), F(at[1] + r * 0.82), Mat.Soot, 0);
  c.on(id, F(at[0] - r * 0.45), F(at[1] - r * 0.5), Mat.Bone, 5);
  return id;
}

/** Mancha sem contorno, em pontilhado (sujeira, fuligem, sangue). */
function blot(c: Canvas, at: Pt, rx: number, ry: number, mat: Mat, tones: [number, number], density = 1) {
  for (let Y = F(at[1] - ry); Y <= F(at[1] + ry); Y++) for (let X = F(at[0] - rx); X <= F(at[0] + rx); X++) {
    const d = Math.hypot((X / K - at[0]) / rx, (Y / K - at[1]) / ry) + (noise(X >> 1, Y >> 1) - 0.5) * 0.5;
    if (d > 1) continue;
    if (d > 0.7 && (X + Y) % 2 === 0) continue;
    if (noise(X, Y) > density) continue;
    c.px(X, Y, mat, d < 0.45 ? tones[0] : tones[1]);
  }
}

/** Teia no canto de cima (à esquerda, ou à direita com `flip`): fios do canto e voltas em arco, sem contorno. */
function cobweb(c: Canvas, flip: boolean) {
  const o: Pt = [flip ? T : 0, 0];
  const dir = flip ? -1 : 1;
  for (let a = 0.1; a < Math.PI / 2; a += Math.PI / 10) {
    const end: Pt = [o[0] + dir * Math.cos(a) * 30, o[1] + Math.sin(a) * 30];
    thread(c, o, end, Mat.White, (k) => (k % 5 === 0 ? -1 : 2));
  }
  for (const r of [8, 14, 20, 26]) {
    let prev: Pt | null = null;
    for (let a = 0.1; a <= Math.PI / 2 - 0.1; a += Math.PI / 10) {
      const sag = r + Math.sin(a * 10) * 0.8;
      const p: Pt = [o[0] + dir * Math.cos(a) * sag, o[1] + Math.sin(a) * sag];
      if (prev) thread(c, prev, p, Mat.White, r > 20 ? 1 : 2);
      prev = p;
    }
  }
}

const FLOOR_DECOR: [Draw, boolean][] = [
  // ossos
  [(c) => { bone(c, [18, 30], [42, 40]); bone(c, [24, 44], [40, 26], 0.75); bone(c, [44, 46], [52, 40], 0.6); }, true],
  // caveira
  [(c) => { skull(c, [32, 32], 6.5, -1); bone(c, [40, 42], [50, 38], 0.6); }, true],
  // entulho
  [(c) => {
    for (const [x, y, r] of [[22, 34, 4.6], [32, 38, 3.4], [40, 32, 5], [28, 26, 2.6], [46, 40, 2.4], [18, 42, 2]] as const) {
      plate(c, [[x - r, y], [x - r * 0.4, y - r * 0.8], [x + r * 0.7, y - r * 0.6], [x + r, y + r * 0.3], [x + r * 0.2, y + r * 0.7], [x - r * 0.6, y + r * 0.6]], Mat.Stone, stone);
    }
  }, true],
  // rachadura
  [(c) => {
    const pts: Pt[] = [[10, 18], [20, 26], [26, 24], [34, 34], [42, 36], [52, 46]];
    for (let i = 1; i < pts.length; i++) { thread(c, pts[i - 1], pts[i], Mat.Soot, 0); thread(c, [pts[i - 1][0], pts[i - 1][1] + 0.5], [pts[i][0], pts[i][1] + 0.5], Mat.Soot, 1); }
    thread(c, [26, 24], [28, 14], Mat.Soot, 0); thread(c, [34, 34], [30, 44], Mat.Soot, 0);
  }, false],
  // mancha
  [(c) => blot(c, [32, 34], 14, 9, Mat.Soot, [1, 2], 0.9), false],
  // poça
  [(c) => {
    const id = c.fill(ebox(32, 36, 15, 8), (x, y) => inEllipse(32, 36, 14, 7)(x, y) && !inEllipse(44, 32, 5, 3)(x, y), Mat.Night, () => 0.35, (X, Y) => (noise(X >> 2, Y) < 0.1 ? 1 : 0));
    for (let X = F(22); X < F(34); X++) c.on(id, X, F(32), Mat.Sapphire, 4);
    c.on(id, F(26), F(33), Mat.White, 5); c.on(id, F(27), F(33), Mat.White, 4);
  }, true],
  // cacos de barro
  [(c) => {
    for (const [x, y, a] of [[24, 32, 0.4], [36, 38, -0.6], [40, 28, 1.2], [28, 42, 2]] as const) {
      const ca = Math.cos(a), sa = Math.sin(a);
      const pts: Pt[] = [[-4, -2], [3, -3], [5, 1], [-2, 3]].map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]);
      const id = plate(c, pts, Mat.Clay);
      thread(c, pts[0], pts[1], Mat.Clay, 5, [id]);
    }
  }, true],
  // pergaminho
  [(c) => {
    const id = plate(c, [[20, 28], [42, 24], [46, 40], [24, 44]], Mat.Linen, linen);
    for (let k = 0; k < 4; k++) thread(c, [24 + k * 0.8, 31 + k * 3], [40 + k * 0.8, 28 + k * 3], Mat.Linen, (j) => (j % 4 === 3 ? -1 : 1), [id]);
    limb(c, [19, 27], [24, 45], 1.4, 1.4, Mat.Linen);
    gem(c, [36, 39], 1.2, Mat.Crest);
  }, true],
  [(c) => cobweb(c, false), false],
  [(c) => cobweb(c, true), false],
  // corrente
  [(c) => {
    for (let k = 0; k < 7; k++) {
      const x = 14 + k * 5.2, y = 30 + Math.sin(k * 0.9) * 4, hor = k % 2 === 0;
      c.fill(ebox(x, y, 3, 3), (xx, yy) => { const d = ((xx + 0.5 - x) / (hor ? 2.8 : 1.4)) ** 2 + ((yy + 0.5 - y) / (hor ? 1.6 : 2.6)) ** 2; return d <= 1 && d > 0.3; }, Mat.Iron, sphere(x, y, 3, 3));
    }
    limb(c, [48, 34], [52, 40], 1.2, 1.6, Mat.Iron);
  }, true],
  // toco de vela
  [(c) => {
    const id = limb(c, [32, 30], [32, 40], 2.6, 2.8, Mat.Linen);
    ellipse(c, 32, 41, 4.4, 1.6, Mat.Linen);
    for (const [x, y] of [[30, 33], [34.6, 35]] as const) limb(c, [x, y - 2], [x, y + 3], 0.6, 0.8, Mat.Linen);
    thread(c, [32, 29], [32, 27], Mat.Soot, 0);
    flame(c, [32, 27.6], 5, 1.5, 0.1);
    c.on(id, F(30.4), F(31), Mat.Linen, 5);
  }, true],
  // fuligem
  [(c) => blot(c, [32, 34], 20, 14, Mat.Soot, [0, 1], 0.95), false],
  // sangue
  [(c) => { blot(c, [30, 34], 11, 7, Mat.Blood, [2, 1]); blot(c, [44, 42], 3, 2, Mat.Blood, [2, 1]); blot(c, [20, 42], 2, 1.6, Mat.Blood, [2, 1]); }, false],
  // ossada de dragão: costelas em arco e o crânio comprido
  [(c) => {
    limb(c, [8, 36], [52, 36], 1.6, 1.2, Mat.Bone, linen);
    for (let k = 0; k < 5; k++) {
      const x = 14 + k * 7;
      for (const s of [-1, 1]) chain(c, [[x, 36], [x + 2, 36 + s * 7], [x - 1, 36 + s * 12]], 0.9, Mat.Bone, linen, 0.5);
    }
    const head = plate(c, [[50, 32], [62, 34], [63, 38], [50, 40]], Mat.Bone, linen);
    c.fill(ebox(54, 35, 1.4, 1.2), inEllipse(54, 35, 1.3, 1.1), Mat.Soot, () => 0.1);
    for (const x of [56, 58, 60]) fang(c, [x, 38], 0.4, 1.4);
    void head;
  }, true],
];

export const cryptFloorDecor = () => strip(FLOOR_DECOR.map(([draw, outline]) => frame(draw, outline)));

// --- Paredes -------------------------------------------------------------------------------

/** A parede sobe 1/2 tile (`WALL_RISE` × 4). */
export const CRYPT_WALL_RISE = 64;
const RISE = CRYPT_WALL_RISE / K;

/** Tampa da parede vista de cima: pedras grandes assentadas, mais escuras que o chão; borda clara onde encosta no chão. */
export function cryptWallCap(variant: number, rim: number) {
  const data = frame((c) => {
    // Pedra escura e lisa, sem lajes: o topo da parede não pode parecer chão.
    c.fill([0, 0, T, T], () => true, Mat.Soot, () => 0.55, (X, Y) => (noise(X + variant * 41, Y) < 0.08 ? 1 : noise(X >> 1, (Y >> 1) + variant) < 0.06 ? -1 : 0));
    const band = (x0: number, y0: number, x1: number, y1: number, tone: number) => {
      for (let Y = F(y0); Y < F(y1); Y++) for (let X = F(x0); X < F(x1); X++) c.px(X, Y, Mat.Stone, tone);
    };
    if (rim & 1) { band(0, 0, T, 1, 5); band(0, 1, T, 2, 3); }
    if (rim & 2) { band(0, 0, 1, T, 5); band(1, 0, 2, T, 3); }
    if (rim & 4) { band(T - 1, 0, T, T, 2); }
  }, false);
  return strip([data]);
}

/** Face de tijolos (128 × 64): fiadas desencontradas com bisel, a de cima com luz e o pé na sombra. */
export function cryptWallFace(variant: number) {
  const data = frame((c) => {
    c.fill([0, 0, T, RISE], () => true, Mat.Soot, () => 0.3);
    const courses = 4, h = RISE / courses;
    for (let k = 0; k < courses; k++) {
      const off = k % 2 ? 8 : 0;
      for (let x = -off; x < T; x += 16) {
        const seed = variant * 53 + k * 9 + x;
        slab(c, [Math.max(0, x), k * h, Math.min(T, x + 16), (k + 1) * h], noise(seed, 1) < 0.15 ? Mat.Slate : Mat.Stone, seed, (X, Y) => stone(X, Y) + (k === courses - 1 ? -1 : 0));
      }
    }
    for (let X = 0; X < CRYPT_TILE; X++) { c.px(X, 0, Mat.Stone, 5); c.px(X, 1, Mat.Stone, 4); c.px(X, F(RISE) - 1, Mat.Soot, 0); c.px(X, F(RISE) - 2, Mat.Soot, 1); }
  }, false, CRYPT_WALL_RISE);
  return strip([data], CRYPT_WALL_RISE);
}

// --- Enfeites de parede (mesma ordem de `CRYPT_WALL`): na face, linhas 32 a 64 do quadro ------------

/** Estandarte pendurado numa vara: pano com barra pontuda, franja e o emblema. */
function banner(c: Canvas, cloth: Mat, emblem: Mat) {
  limb(c, [18, 34], [46, 34], 0.8, 0.8, Mat.Iron);
  for (const x of [18, 46]) ellipse(c, x, 34, 1.2, 1.2, Mat.Bronze);
  const id = poly(c, [[20, 34.6], [44, 34.6], [44, 58], [32, 63], [20, 58]], cloth, 20, 44, (X, Y) => ((X >> 2) % 3 === 0 ? -1 : 0) + linen(X, Y) * 0);
  for (const x of [20.6, 43.4]) thread(c, [x, 35], [x, 58], Mat.Bronze, 4, [id]);
  thread(c, [20.6, 58], [32, 62.6], Mat.Bronze, 4, [id]); thread(c, [43.4, 58], [32, 62.6], Mat.Bronze, 3, [id]);
  // Emblema: escudo com uma estrela de quatro pontas.
  const e = plate(c, [[27, 41], [37, 41], [37, 48], [32, 52], [27, 48]], emblem);
  for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]] as const) thread(c, [32, 46], [32 + dx, 46 + dy], cloth, 1, [e]);
}

const WALL_DECOR: [Draw, boolean][] = [
  [(c) => banner(c, Mat.Crest, Mat.Bronze), true],
  [(c) => banner(c, Mat.Indigo, Mat.Mithral), true],
  // correntes
  [(c) => {
    for (const x of [22, 40]) {
      ellipse(c, x, 34, 1.6, 1.6, Mat.Iron);
      for (let k = 0; k < 6; k++) {
        const y = 37 + k * 3.6, hor = k % 2 === 0;
        c.fill(ebox(x, y, 2.4, 2.4), (xx, yy) => { const d = ((xx + 0.5 - x) / (hor ? 2 : 1.2)) ** 2 + ((yy + 0.5 - y) / (hor ? 1.3 : 2.1)) ** 2; return d <= 1 && d > 0.3; }, Mat.Iron, sphere(x, y, 2.4, 2.4));
      }
    }
    const cuff = limb(c, [36, 60], [44, 60], 1.6, 1.6, Mat.Iron);
    rivet(c, [cuff], 40, 59.6, Mat.Iron);
  }, true],
  // nicho com caveira
  [(c) => {
    c.fill([20, 36, 44, 62], (x, y) => x + 0.5 > 21 && x + 0.5 < 43 && y + 0.5 < 61 && (y + 0.5 > 46 || inEllipse(32, 46, 11, 10)(x, y)), Mat.Soot, () => 0.05);
    poly(c, [[19, 61], [45, 61], [46, 64], [18, 64]], Mat.Stone, 18, 46);
    skull(c, [32, 52], 5.4);
    limb(c, [24, 59], [30, 59.6], 0.7, 0.7, Mat.Bone);
    flame(c, [40.6, 57.4], 3, 1, 0);
    limb(c, [40.6, 58], [40.6, 61], 0.9, 1, Mat.Linen);
  }, true],
  // rachadura
  [(c) => {
    const pts: Pt[] = [[30, 32], [27, 40], [33, 46], [29, 54], [34, 63]];
    for (let i = 1; i < pts.length; i++) { thread(c, pts[i - 1], pts[i], Mat.Soot, 0); thread(c, [pts[i - 1][0] + 0.5, pts[i - 1][1]], [pts[i][0] + 0.5, pts[i][1]], Mat.Soot, 0); }
    thread(c, [33, 46], [40, 50], Mat.Soot, 0);
  }, false],
  // teia
  [(c) => {
    const o: Pt = [8, 32];
    for (let a = 0.15; a < Math.PI / 2; a += Math.PI / 9) thread(c, o, [o[0] + Math.cos(a) * 26, o[1] + Math.sin(a) * 28], Mat.White, (k) => (k % 6 === 0 ? -1 : 2));
    for (const r of [9, 16, 23]) for (let a = 0.15; a < Math.PI / 2 - 0.2; a += Math.PI / 9) thread(c, [o[0] + Math.cos(a) * r, o[1] + Math.sin(a) * r], [o[0] + Math.cos(a + Math.PI / 9) * r, o[1] + Math.sin(a + Math.PI / 9) * r], Mat.White, 2);
    const spider = ellipse(c, 21, 48, 1.4, 1.6, Mat.Soot);
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) thread(c, [21, 48 + k], [21 + s * 3, 47 + k * 2], Mat.Soot, 0);
    void spider;
  }, false],
  // musgo escorrendo
  [(c) => {
    for (let k = 0; k < 9; k++) {
      const x = 14 + k * 4.4 + noise(k, 1) * 2, len = 6 + noise(k, 2) * 18;
      limb(c, [x, 32], [x + (noise(k, 3) - 0.5) * 2, 32 + len], 1.6, 0.6, Mat.Moss, (X, Y) => (noise(X, Y) < 0.2 ? 1 : 0));
      if (noise(k, 4) < 0.4) ellipse(c, x, 34 + len, 0.7, 0.9, Mat.Sapphire);
    }
  }, true],
];

export const cryptWallDecor = () => strip(WALL_DECOR.map(([draw, outline]) => frame(draw, outline)));

// --- Tocha (4 quadros) ---------------------------------------------------------------------

/** Tocha presa na parede: suporte de ferro com aro, cabo enrolado em pano e a chama balançando. */
export const cryptTorch = () => strip([0, 1, 2, 3].map((f) => frame((c) => {
  const sway = [0, 0.8, 0, -0.8][f], tall = [11, 12.4, 10.4, 12.4][f];
  limb(c, [32, 60], [32, 52], 1.6, 1.2, Mat.Iron);
  const plateId = plate(c, [[28.4, 56], [35.6, 56], [35, 62], [29, 62]], Mat.Iron);
  rivet(c, [plateId], 32, 59, Mat.Iron);
  const cup = c.fill(ebox(32, 50, 4.4, 2.4), inEllipse(32, 50, 4, 2.2), Mat.Iron, sphere(32, 49, 4.4, 2.4));
  limb(c, [32, 50], [32, 40], 1.5, 1.7, Mat.Wood, grain);
  for (const y of [42, 44.6, 47]) thread(c, [30.4, y], [33.6, y + 0.8], Mat.Linen, 3);
  flame(c, [32, 40.4], tall, 3.4, sway * 0.08);
  for (const [dx, dy] of [[-2, -tall - 3], [2.4, -tall - 6], [0.4, -tall - 9]] as const) if ((f + dx) % 2 >= 0) c.px(F(32 + dx + sway), F(40 + dy), Mat.Amber, 5 - (f % 2));
  void cup;
})));

// --- Móveis e restos de pé (mesma ordem de `CRYPT_TALL`) ------------------------------------------

/** Barril de aduelas com dois aros de ferro e a tampa vista de cima. */
function barrelAt(c: Canvas, cx: number, bottom: number, w: number, h: number) {
  const top = bottom - h;
  const body = c.fill([cx - w / 2 - 1, top, cx + w / 2 + 1, bottom], (x, y) => {
    const t = (y + 0.5 - top) / h, half = w / 2 * (0.88 + Math.sin(t * Math.PI) * 0.12);
    return Math.abs(x + 0.5 - cx) <= half && y + 0.5 >= top + 1.6 && y + 0.5 <= bottom;
  }, Mat.Wood, (x) => lit(Math.max(-0.95, Math.min(0.95, (x + 0.5 - cx) / (w / 2))), -0.2, 0.8), (X) => (((X - F(cx)) % 7 + 7) % 7 === 0 ? -1 : 0) + grain(X, 0));
  for (const t of [0.2, 0.78]) {
    const y = top + h * t;
    for (let X = F(cx - w / 2); X <= F(cx + w / 2); X++) { c.on(body, X, F(y), Mat.Iron, X < F(cx) ? 4 : 2); c.on(body, X, F(y) + 1, Mat.Iron, 1); }
  }
  const lid = c.fill(ebox(cx, top + 1.6, w / 2 * 0.9, 1.8), inEllipse(cx, top + 1.6, w / 2 * 0.88, 1.7), Mat.Wood, () => 0.75, grain);
  thread(c, [cx - w / 2 * 0.7, top + 1.4], [cx + w / 2 * 0.7, top + 1.8], Mat.Wood, 1, [lid]);
  return body;
}

/** Urna de barro com alças e faixa pintada; quebrada, com a boca lascada e cacos no chão. */
function urn(c: Canvas, broken: boolean) {
  const cx = 32, bottom = 58;
  const body = c.fill([20, 30, 44, 59], (x, y) => {
    const t = (y + 0.5 - 32) / 26;
    const half = t < 0.15 ? 5 : 5 + Math.sin(Math.min(1, (t - 0.15) / 0.85) * Math.PI) * 6.4 - (t > 0.9 ? (t - 0.9) * 20 : 0);
    if (broken && y + 0.5 < 38 + Math.abs(Math.sin((x + 0.5) * 1.3)) * 4) return false;
    return Math.abs(x + 0.5 - cx) <= half && y + 0.5 >= 32 && y + 0.5 <= bottom;
  }, Mat.Clay, sphere(cx, 44, 12, 16), (X, Y) => (noise(X, Y) < 0.05 ? -1 : 0));
  for (let X = F(22); X <= F(42); X++) { c.on(body, X, F(44), Mat.Soot, 1); c.on(body, X, F(45), Mat.Bronze, X % 6 < 3 ? 4 : 2); c.on(body, X, F(46), Mat.Soot, 1); }
  if (!broken) {
    ellipse(c, cx, 32.4, 5.4, 1.6, Mat.Clay);
    ellipse(c, cx, 32.6, 3.6, 0.9, Mat.Soot, () => -2);
    for (const s of [-1, 1]) chain(c, [[cx + s * 5, 34], [cx + s * 8.4, 36], [cx + s * 7.6, 40]], 0.7, Mat.Clay);
  } else {
    for (const [x, y, a] of [[18, 58, 0.5], [46, 57, -0.8], [41, 60, 1.6]] as const) {
      const ca = Math.cos(a), sa = Math.sin(a);
      plate(c, ([[-3, -1.6], [2.4, -2], [3, 1.4], [-2, 1.8]] as Pt[]).map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]), Mat.Clay);
    }
  }
}

const TALL: Draw[] = [
  // barril
  (c) => barrelAt(c, 32, 59, 22, 30),
  // dois barris
  (c) => { barrelAt(c, 24, 54, 18, 24); barrelAt(c, 42, 60, 20, 26); },
  // caixote de tábuas pregadas
  (c) => {
    const front = poly(c, [[16, 36], [46, 36], [46, 60], [16, 60]], Mat.Wood, 16, 46, grain);
    const top = poly(c, [[16, 36], [46, 36], [50, 30], [20, 30]], Mat.Wood, 16, 50, (X, Y) => 1 + grain(X, Y));
    const side = poly(c, [[46, 36], [50, 30], [50, 54], [46, 60]], Mat.Wood, 46, 50, (X, Y) => -1 + grain(X, Y));
    for (const y of [44, 52]) thread(c, [16, y], [46, y], Mat.Wood, 0, [front]);
    thread(c, [17, 37], [45, 59], Mat.Wood, 1, [front]); thread(c, [17.6, 37], [45.6, 59], Mat.Wood, 4, [front]);
    for (const [x, y] of [[18, 38], [44, 38], [18, 58], [44, 58]] as const) rivet(c, [front], x, y, Mat.Iron);
    void top; void side;
  },
  (c) => urn(c, false),
  (c) => urn(c, true),
  // candelabro de ferro com três velas acesas
  (c) => {
    limb(c, [32, 58], [32, 34], 1.1, 0.9, Mat.Iron);
    for (const s of [-1, 1]) { limb(c, [32, 59], [32 + s * 6, 61], 0.9, 0.7, Mat.Iron); chain(c, [[32, 40], [32 + s * 6, 40], [32 + s * 8, 35]], 0.8, Mat.Iron); }
    ellipse(c, 32, 40, 1.8, 1.2, Mat.Iron);
    for (const x of [24, 32, 40]) {
      const y = x === 32 ? 30 : 33;
      ellipse(c, x, y + 1.6, 2.4, 1, Mat.Iron);
      limb(c, [x, y + 1], [x, y - 4], 1.2, 1.2, Mat.Linen);
      flame(c, [x, y - 4.4], 4.6, 1.3, 0.05);
    }
  },
  // monte de ossos com caveira por cima
  (c) => {
    for (const [a, b, r] of [[[16, 58], [34, 54], 0.9], [[30, 60], [48, 52], 0.9], [[22, 52], [40, 58], 0.8], [[20, 56], [26, 46], 0.7], [[38, 50], [46, 58], 0.8], [[26, 50], [40, 46], 0.8]] as const) bone(c, a as Pt, b as Pt, r);
    skull(c, [30, 44], 5.4, 1);
    skull(c, [42, 49], 3.8, -1);
  },
  // caixão de madeira escura, tampa com cruz e alças
  (c) => {
    const lid = poly(c, [[24, 26], [40, 26], [44, 34], [40, 62], [24, 62], [20, 34]], Mat.Wood, 20, 44, (X, Y) => -1 + grain(X, Y));
    poly(c, [[24, 62], [40, 62], [40, 64], [24, 64]], Mat.Wood, 24, 40, () => -2);
    thread(c, [32, 32], [32, 52], Mat.Bronze, 4, [lid]); thread(c, [26, 38], [38, 38], Mat.Bronze, 4, [lid]);
    thread(c, [32.6, 32], [32.6, 52], Mat.Bronze, 2, [lid]);
    for (const [x, y] of [[21, 36], [43, 36], [24, 56], [40, 56]] as const) rivet(c, [lid], x, y, Mat.Iron);
    for (let k = 0; k < 18; k++) c.on(lid, F(22 + noise(k, 1) * 20), F(28 + noise(1, k) * 32), Mat.Soot, 1);
  },
  // saco de grãos amarrado
  (c) => {
    const sack = c.fill(ebox(32, 50, 13, 13), (x, y) => inEllipse(32, 51, 12, 10)(x, y) || (Math.abs(x + 0.5 - 32) < 4.6 - (y + 0.5 - 36) * 0.2 && y + 0.5 > 36 && y < 44), Mat.Linen, sphere(32, 48, 13, 13), linen);
    limb(c, [27, 40], [37, 40.6], 1, 1, Mat.Leather);
    for (const s of [-1, 1]) limb(c, [32 + s * 1, 36], [32 + s * 3, 32], 1.4, 0.6, Mat.Linen);
    thread(c, [26, 48], [30, 58], Mat.Linen, 1, [sack]); thread(c, [38, 46], [36, 58], Mat.Linen, 1, [sack]);
    for (let k = 0; k < 6; k++) c.px(F(40 + k * 1.4), F(60 + (k % 2)), Mat.Amber, 3);
  },
];

export const cryptTall = () => strip(TALL.map((draw) => frame(draw)));

/** Galeria: os quadros do cenário lado a lado, por faixa. */
export function cryptGallery() {
  return { floor: cryptFloorTiles(), boss: cryptBossTiles(), decor: cryptFloorDecor(), wall: cryptWallDecor(), torch: cryptTorch(), tall: cryptTall(), caps: [0, 1, 2, 3].map((v) => cryptWallCap(v, v === 0 ? 0 : v === 1 ? 1 : v === 2 ? 3 : 7)), faces: [0, 1, 2, 3].map(cryptWallFace) };
}

void leaf;

/**
 * Sombra das paredes no chão (128 px por tile): faixas de transparência em degraus ao pé da parede do norte, da do oeste
 * ou das duas (quadros 0, 1 e 2), com a beira levemente ondulada.
 */
export function cryptShade() {
  const levels = [0.34, 0.26, 0.2, 0.14, 0.09, 0.05].map((a) => a * 1.5);
  const { canvas, ctx } = makeCanvas(CRYPT_TILE * 3, CRYPT_TILE);
  for (let f = 0; f < 3; f++)
    for (let y = 0; y < CRYPT_TILE; y++)
      for (let x = 0; x < CRYPT_TILE; x++) {
        const wob = (t: number) => Math.round(Math.sin(t / 9) * 1.5);
        const dn = f !== 1 ? y + wob(x) : 99, dw = f !== 0 ? x + wob(y) : 99;
        const band = Math.floor(Math.min(dn, dw) / 8);
        if (band < 0 || band >= levels.length) continue;
        ctx.fillStyle = `rgba(12, 8, 4, ${levels[band].toFixed(3)})`;
        ctx.fillRect(f * CRYPT_TILE + x, y, 1, 1);
      }
  return canvas;
}

/** Poça de luz quente das chamas (4×3 tiles, desenhada em ¼): elipse em 5 degraus de transparência, sem degradê. */
export function cryptLight() {
  const w = 512, h = 384;
  const levels = [0.36, 0.26, 0.18, 0.11, 0.05];
  const { canvas, ctx } = makeCanvas(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x + 0.5 - w / 2) / (w / 2), (y + 0.5 - h / 2) / (h / 2));
      const band = Math.floor(d * levels.length);
      if (band >= levels.length) continue;
      ctx.fillStyle = `rgba(255, 164, 72, ${levels[band]})`;
      ctx.fillRect(x, y, 1, 1);
    }
  return canvas;
}
