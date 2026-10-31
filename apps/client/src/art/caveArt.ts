import type { Rgb } from "./hero/color.ts";
import { HD, palette, type MaterialBase } from "./paint.ts";
import { FLAT, M, OPEN, Paper, ellipse, limb, line, lit, mesaTile, noise, smoothNoise, sn, waterTile, type Pt } from "./duneArt.ts";

/**
 * Cavernas no padrão novo (128 px por tile, por código; `docs/CENARIOS_PLANO.md`, fase 2): a Caverna da Travessia e,
 * na fase 3, os trechos subterrâneos do Mar de Areia. O paredão e a água são os das Mesas de Solária e das Dunas
 * (`mesaTile`, `waterTile` em `duneArt.ts`) numa paleta de rocha; o chão de pedra, as estalagmites, os cristais e os
 * enfeites são daqui. Só arrays: o teste `cenarios` pinta tudo sem navegador.
 */

export type CaveVariant = "cavern" | "desert";

/** Cores base, na ordem de `M` (os materiais das Dunas): a Travessia em rocha fria e molhada, cristais azuis. */
const BASES: Record<CaveVariant, Record<M, MaterialBase>> = {
  cavern: {
    [M.Sand]: ["#56606c", 0.55, 4], [M.Soft]: ["#626c78", 0.5, 4], [M.Dune]: ["#56606c", 0.7, 4],
    [M.Rock]: ["#4a5462", 0.9, 5], [M.Cap]: ["#2a313c", 0.6, 4], [M.Band]: ["#5e6876", 0.85, 5], [M.Dark]: ["#343c48", 0.85, 5],
    [M.Water]: ["#2e5c6c", 0.85, 8], [M.Deep]: ["#1a3646", 0.85, 8], [M.Foam]: ["#9ab8c4", 0.35, 4], [M.Wet]: ["#3c4652", 0.55, 4],
    [M.Trunk]: ["#5a4a3c", 0.9, 5], [M.Leaf]: ["#3e6a5a", 0.9, 8], [M.Dry]: ["#8a8a7a", 0.8, 5],
    [M.Stone]: ["#6c7682", 1, 5], [M.Glow]: ["#7ae0ff", 1.2, 10, true], [M.Bone]: ["#d6d0c0", 0.8, 5],
    [M.Shrub]: ["#3e6a52", 0.9, 7], [M.Ruin]: ["#7a8290", 0.9, 5], [M.Clay]: ["#8a6a8a", 0.9, 7], [M.Line]: ["#0c1016", 0.4, 0],
  },
  desert: {
    [M.Sand]: ["#7a6a54", 0.55, 4], [M.Soft]: ["#8a7860", 0.5, 4], [M.Dune]: ["#7a6a54", 0.7, 4],
    [M.Rock]: ["#6a5644", 0.9, 5], [M.Cap]: ["#3a2e26", 0.6, 4], [M.Band]: ["#86705a", 0.85, 5], [M.Dark]: ["#4a3a2e", 0.85, 5],
    [M.Water]: ["#3e7a7a", 0.85, 8], [M.Deep]: ["#1e4650", 0.85, 8], [M.Foam]: ["#c4d0c0", 0.35, 4], [M.Wet]: ["#5a4a3a", 0.55, 4],
    [M.Trunk]: ["#5a4a3c", 0.9, 5], [M.Leaf]: ["#5a7a3a", 0.9, 8], [M.Dry]: ["#a08a5a", 0.8, 5],
    [M.Stone]: ["#8a7a66", 1, 5], [M.Glow]: ["#ffb347", 1.2, 10, true], [M.Bone]: ["#e2d8bc", 0.8, 5],
    [M.Shrub]: ["#6a7a3e", 0.9, 7], [M.Ruin]: ["#a08a6a", 0.9, 5], [M.Clay]: ["#a0603c", 0.9, 7], [M.Line]: ["#160e0a", 0.4, 0],
  },
};

const rampCache = new Map<CaveVariant, Rgb[][]>();
function ramps(variant: CaveVariant): Rgb[][] {
  let r = rampCache.get(variant);
  if (!r) {
    r = palette(Object.values(M).filter((v): v is M => typeof v === "number").map((m) => BASES[variant][m]));
    rampCache.set(variant, r);
  }
  return r;
}
const paper = (variant: CaveVariant, w = HD, h = HD) => new Paper(ramps(variant), w, h);

/** O chão e a rocha funda são uma textura contínua de `BLOCK`×`BLOCK` tiles: cada tile pinta o pedaço `q` dela. */
export const BLOCK = 4;
const PERIOD = HD * BLOCK;
/** Pedaço do bloco que o tile (x, y) usa. */
export const blockPiece = (x: number, y: number) => (((x % BLOCK) + BLOCK) % BLOCK) + BLOCK * (((y % BLOCK) + BLOCK) % BLOCK);
/** Ruído suave no pixel (x, y) do pedaço `q`, periódico no bloco inteiro. */
const blockNoise = (q: number, x: number, y: number, cell: number, seed: number) =>
  smoothNoise(x + (q % BLOCK) * HD, y + Math.floor(q / BLOCK) * HD, cell, seed, PERIOD);

export { OPEN };

/**
 * Rocha pelos vizinhos que são chão (8 bits de `OPEN`): a massa escura por cima e, com chão ao sul, o paredão (o das
 * Mesas). Rocha sem chão em volta é a massa funda: escura, de manchas suaves que mudam com a variação e emendam.
 */
export function rockTile(variant: CaveVariant, open: number, v: number): Uint8ClampedArray {
  if (open) return mesaTile(ramps(variant), open, v).render(false);
  // Massa funda: `v` é o pedaço do bloco (`blockPiece`).
  const p = paper(variant);
  p.fill([0, 0, HD - 1, HD - 1], () => true, M.Cap, (x, y) => 0.42 + (blockNoise(v, x, y, 64, 150) - 0.5) * 0.18, (x, y) => (noise(x, y, 151 + v) < 0.03 ? -1 : 0));
  for (let k = 0; k < 2; k++) {
    let x = 24 + noise(k, v, 152) * 80, y = 20 + noise(v, k, 153) * 60;
    for (let s2 = 0; s2 < 14; s2++) {
      const nx = x + (noise(s2, k + v, 154) - 0.5) * 7, ny = y + 2.5;
      if (ny > HD - 12) break;
      line(p, [x, y], [nx, ny], null, 0);
      x = nx; y = ny;
    }
  }
  return p.render(false);
}

/** Poça pelos vizinhos que são terra. */
export const poolTile = (variant: CaveVariant, land: number, v: number) => waterTile(ramps(variant), land, v).render(false);

/**
 * Chão de pedra da caverna: rocha lisa de manchas grandes e suaves, rachaduras que não chegam na borda, pedrinhas
 * soltas; no salão (`hall`), a pedra mais clara e gasta. `v` é o pedaço do bloco (`blockPiece`): as manchas correm pelo
 * bloco de 4×4 tiles sem emenda e só se repetem de bloco em bloco.
 */
export function floorTile(variant: CaveVariant, v: number, hall = false): Uint8ClampedArray {
  const p = paper(variant);
  const mixed = (x: number, y: number, cell: number, seed: number) => blockNoise(v, x, y, cell, seed);
  p.fill([0, 0, HD - 1, HD - 1], () => true, hall ? M.Soft : M.Sand, (x, y) => FLAT - 0.06 + (mixed(x, y, 64, 140) - 0.5) * 0.24,
    (x, y) => {
      const n = noise(x, y, 141 + v);
      return n < 0.04 ? -1 : n > 0.985 ? 1 : 0;
    });
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) if (mixed(x, y, 32, 142) < 0.32) p.nudge(x, y, -1);
  // Rachaduras (por dentro do tile) e, no salão, juntas de lajes naturais.
  for (let k = 0; k < (hall ? 3 : 2); k++) {
    let x = 18 + noise(k, v, 143) * 92, y = 14 + noise(v, k, 144) * 60;
    const dx = noise(k, v, 145) < 0.5 ? 2.2 : -2.2;
    for (let s = 0; s < 18; s++) {
      const nx = x + dx * (0.5 + noise(s, k + v, 146)), ny = y + 2 + (noise(k, s, 147) - 0.5) * 3;
      if (nx < 8 || nx > HD - 8 || ny > HD - 8) break;
      line(p, [x, y], [nx, ny], null, 1);
      line(p, [x, y + 1], [nx, ny + 1], null, 4);
      x = nx; y = ny;
    }
  }
  for (let k = 0; k < 7; k++) {
    const x = 10 + noise(k, v, 148) * 108, y = 10 + noise(v, k, 149) * 108, r = 1.6 + noise(k, k + v, 150) * 2.2;
    ellipse(p, x, y, r * 1.3, r, M.Stone);
  }
  return p.render(false);
}

/** Enfeites rasteiros: ossos, cascalho, pele de serpente trocada (o Basilisco), sulcos de garras, areia que escorreu. */
export const FLAT_DECOR = ["bones", "pebbles", "skin", "furrow", "sand"] as const;
export type FlatDecor = (typeof FLAT_DECOR)[number];

export function flatDecor(variant: CaveVariant, kind: FlatDecor, v: number): Uint8ClampedArray {
  const p = paper(variant);
  const r = (k: number) => noise(k, v, 160 + FLAT_DECOR.indexOf(kind));
  switch (kind) {
    case "bones": {
      const cx = 44 + r(1) * 36, cy = 50 + r(2) * 30;
      p.together(() => { ellipse(p, cx, cy, 10, 8, M.Bone); ellipse(p, cx + 7, cy + 4, 6, 4, M.Bone); });
      ellipse(p, cx - 3, cy - 1, 2.4, 2.2, M.Line);
      ellipse(p, cx + 3, cy - 1, 2.2, 2, M.Line);
      for (let k = 0; k < 4; k++) {
        const x = 26 + r(k + 3) * 72, y = 30 + r(k + 7) * 66, a = r(k + 11) * Math.PI, len = 9 + r(k + 15) * 9;
        const b: Pt = [x + Math.cos(a) * len, y + Math.sin(a) * len];
        p.together(() => { limb(p, [x, y], b, 1.7, 1.7, M.Bone); ellipse(p, x, y, 2.8, 2.4, M.Bone); ellipse(p, b[0], b[1], 2.8, 2.4, M.Bone); });
      }
      break;
    }
    case "pebbles":
      for (let k = 0; k < 9; k++) ellipse(p, 24 + r(k) * 80, 26 + r(k + 9) * 76, 2.4 + r(k + 18) * 4, 2 + r(k + 27) * 3, k % 3 ? M.Stone : M.Rock);
      break;
    case "skin": {
      // Pele trocada: uma fita escamosa e clara em curva.
      const pts: Pt[] = Array.from({ length: 14 }, (_, k) => [20 + k * 6.5, 64 + Math.sin(k * 0.7 + r(1) * 6) * 18]);
      for (let k = 0; k < pts.length - 1; k++) limb(p, pts[k], pts[k + 1], 5 - k * 0.25, 5 - (k + 1) * 0.25, M.Dry);
      for (const [x, y] of pts) { p.on(x, y - 2, null, 2); p.on(x + 2, y + 1, null, 2); p.on(x - 2, y + 1, null, 5); }
      break;
    }
    case "furrow":
      // Sulcos de garras: três riscos fundos paralelos.
      for (let k = 0; k < 3; k++) {
        const x0 = 34 + k * 12 + r(k) * 4, y0 = 30 + r(k + 3) * 10;
        for (let s = 0; s < 50; s++) {
          const x = x0 + s * 0.5, y = y0 + s;
          p.px(x, y, M.Line, 1);
          p.px(x + 1, y, M.Sand, 4);
        }
      }
      break;
    case "sand":
      // Areia que escorreu de uma fresta do teto: um montinho claro.
      p.fill([24, 40, 104, 96], (x, y) => ((x - 64) / 38) ** 2 + ((y - 70) / 22) ** 2 + (sn(x, y, 16, 170) - 0.5) * 0.5 <= 1, M.Dune,
        (x, y) => lit((x - 64) / 50, (y - 70) / 30, 0.8));
      break;
  }
  return p.render(kind !== "sand" && kind !== "furrow");
}

/** Quadro dos enfeites de pé (base no pé do quadro, no meio). */
export const TALL = { w: HD, h: HD + 96 } as const;
export const TALL_DECOR = ["stalagmite", "stalagmites", "crystals"] as const;
export type TallDecor = (typeof TALL_DECOR)[number];

/** Estalagmite (uma grande ou um grupo de três) ou um tufo de cristais que brilham. */
export function tallDecor(variant: CaveVariant, kind: TallDecor, v: number): Uint8ClampedArray {
  const p = paper(variant, TALL.w, TALL.h);
  const B = TALL.h - 10;
  const r = (k: number) => noise(k, v, 180 + TALL_DECOR.indexOf(kind));
  // Cone de rocha com anéis de escorrido e luz de cilindro.
  const cone = (x: number, base: number, hgt: number, rad: number) =>
    p.fill([x - rad - 2, base - hgt, x + rad + 2, base + 2], (px, py) => {
      const t = (base - py) / hgt;
      return t >= 0 && t <= 1 && Math.abs(px - x) <= rad * (1 - t) ** 0.8 + 1;
    }, M.Rock, (px, py) => {
      const t = (base - py) / hgt, w = rad * (1 - t) ** 0.8 + 1;
      const u = (px - x) / w;
      return lit(u, -0.3, Math.sqrt(Math.max(0, 1 - u * u)));
    }, (px, py) => (((py + Math.floor(px / 7)) % 9 === 0) ? -1 : noise(px >> 1, py >> 2, 181) < 0.1 ? 1 : 0));
  switch (kind) {
    case "stalagmite":
      p.together(() => { cone(64, B, 150 + r(1) * 40, 26); ellipse(p, 64, B - 2, 32, 9, M.Rock); });
      for (let k = 0; k < 3; k++) ellipse(p, 36 + k * 26, B - 2 + (k % 2) * 3, 6, 4, M.Stone);
      break;
    case "stalagmites":
      cone(40, B - 4, 80 + r(1) * 30, 15);
      cone(88, B - 2, 100 + r(2) * 30, 18);
      cone(62, B + 2, 120 + r(3) * 40, 20);
      break;
    case "crystals":
      // Prismas pontudos saindo de uma rocha, a luz por dentro (o mapa ainda põe um brilho por cima).
      ellipse(p, 64, B - 10, 34, 14, M.Rock);
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.32 + (r(k) - 0.5) * 0.2, len = 50 + r(k + 6) * 60, w = 6 + r(k + 12) * 5;
        const foot: Pt = [64 + (k - 2.5) * 7, B - 12];
        const tip: Pt = [foot[0] + Math.cos(a) * len, foot[1] + Math.sin(a) * len];
        const nx = -Math.sin(a), ny = Math.cos(a);
        p.together(() => {
          p.fill([Math.min(foot[0], tip[0]) - w - 2, tip[1] - 2, Math.max(foot[0], tip[0]) + w + 2, foot[1] + 2], (x, y) => {
            const ux = x - foot[0], uy = y - foot[1];
            const along = (ux * Math.cos(a) + uy * Math.sin(a)) / len, side = ux * nx + uy * ny;
            const half = along < 0.8 ? w : w * (1 - along) / 0.2;
            return along >= 0 && along <= 1 && Math.abs(side) <= half;
          }, M.Glow, (x, y) => {
            const side = ((x - foot[0]) * nx + (y - foot[1]) * ny) / w;
            return side < 0 ? 0.85 : 0.45;
          });
        });
        line(p, foot, tip, null, 5);
      }
      break;
  }
  return p.render(true);
}
