import type * as Phaser from "phaser";
import { makeCanvas, paintGrid, type Grid, type Palette } from "./pixels.ts";

/**
 * Arte de combate: projéteis dos ataques básicos e peças dos efeitos das magias.
 * Projéteis apontam para a direita (o Phaser gira na direção do alvo).
 */

export const FX = {
  arrow: "fx-arrow",
  holyArrow: "fx-holy-arrow",
  greenLight: "fx-green-light",
  darkLight: "fx-dark-light",
  shadowOrb: "fx-shadow-orb",
  slash: "fx-slash",
  spark: "fx-spark",
  leaf: "fx-leaf",
  thorns: "fx-thorns",
} as const;

const ARROW: Grid = [
  "ff..........o...",
  ".ff.........omo.",
  "..WWWWWWWWWWommo",
  ".ff.........omo.",
  "ff..........o...",
];

const LEAF: Grid = [
  "..oo.",
  ".oLlo",
  "oLlo.",
  "olo..",
  "o....",
];

/** Espinhos que brotam do chão em volta dos pés de um monstro preso. */
const THORNS: Grid = [
  "..o.........o.....o...",
  ".oto.......oto...oto..",
  ".oTo..o....oTo...oTo..",
  "oTvTooto..oTvTo.oTvTo.",
  "oVvVoTvTooVvvVo.oVvVo.",
  "oVvvVVvVVoVvvVVoVvvVo.",
  ".oVvvvvvvVvvvvvVvvVo..",
  "..ooooooooooooooooo...",
];

const PALETTE: Palette = {
  o: "#140d0a",
  W: "#8a5a2b", // haste
  m: "#d2d6de", // ponta
  f: "#e8dcc8", // penas
  L: "#2f8f3a", // folha
  l: "#7bd36a",
  t: "#c9b07a", // ponta do espinho
  T: "#6b7a2a",
  v: "#3f6b22", // cipó
  V: "#2a4a17",
};

const HOLY_PALETTE: Palette = { ...PALETTE, W: "#f7d774", m: "#fff6c8", f: "#ffe9a3" };

export function createCombatArt(scene: Phaser.Scene) {
  const add = (key: string, draw: () => HTMLCanvasElement) => {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, draw());
  };
  add(FX.arrow, () => grid(ARROW, PALETTE));
  add(FX.holyArrow, () => grid(ARROW, HOLY_PALETTE));
  add(FX.leaf, () => grid(LEAF, PALETTE));
  add(FX.thorns, () => grid(THORNS, PALETTE));
  // Luz verde do druida: núcleo claro, halo de folha.
  add(FX.greenLight, () => orb(10, ["#f4ffe8", "#9cff7a", "#3fbf3a", "#1d6b22"]));
  // Luz negra do feiticeiro: centro preto com borda roxa, para aparecer no chão escuro.
  add(FX.darkLight, () => orb(10, ["#000000", "#120018", "#5a1c7a", "#b04ae0"]));
  add(FX.shadowOrb, () => orb(16, ["#000000", "#0a0010", "#2d0a40", "#6b2a9a", "#c77dff"]));
  add(FX.slash, slash);
  add(FX.spark, () => orb(4, ["#ffffff", "#ffffffaa"]));
}

function grid(g: Grid, palette: Palette) {
  const { canvas, ctx } = makeCanvas(g[0].length, g.length);
  paintGrid(ctx, g, palette, 0, 0);
  return canvas;
}

/** Bolinha em anéis de pixel: `rings[0]` é o centro, o último é a borda. */
function orb(size: number, rings: string[]) {
  const { canvas, ctx } = makeCanvas(size, size);
  const c = (size - 1) / 2;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c) / r;
      if (d > 1) continue;
      ctx.fillStyle = rings[Math.min(rings.length - 1, Math.floor(d * rings.length))];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Meia-lua do golpe de espada (abre para a direita), mais grossa no meio. */
function slash() {
  const size = 28;
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const angle = Math.atan2(y - c + 0.5, x - c + 0.5);
      if (Math.abs(angle) > 1.25) continue;
      const thickness = 3.5 * Math.cos(angle * 1.2);
      const d = Math.hypot(x - c + 0.5, y - c + 0.5);
      const edge = 12 - d;
      if (edge < 0 || edge > thickness) continue;
      ctx.fillStyle = edge < 1.2 ? "#ffffff" : edge < 2.4 ? "#d2d6de" : "#7d859388";
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}
