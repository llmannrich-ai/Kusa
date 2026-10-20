import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas } from "./pixels.ts";

/**
 * Paredes oblíquas à moda do Tibia: cada parede "sobe" WALL_RISE pixels. O topo (tampa) é desenhado
 * deslocado para cima e, quando há chão ao sul, aparece a face de tijolos entre a tampa e o chão.
 * Assim a tampa cobre parte do tile ao norte e quem anda atrás da parede fica escondido.
 */
export const WALL_RISE = 16;
export const WALL_VARIANTS = 4;

/** Bordas da tampa iluminadas onde a parede encosta no chão. */
export const RIM = { north: 1, west: 2, east: 4 } as const;

const CAP = { base: "#3b342d", light: "#4a4239", dark: "#2e2823", rim: "#7a6b59", rimSoft: "#5a4e41" };
const FACE = { mortar: "#2f2822", top: "#8a7c69", shadow: "#1e1915", bricks: ["#6e6253", "#675b4c", "#625646", "#706455"] };

/** Tampa 32×32 da parede; `rim` é uma combinação de bits de `RIM`. */
export function wallCap(variant: number, rim: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = CAP.base;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const n = hash(variant, x, y);
      if (n < 0.07) ctx.fillStyle = CAP.light;
      else if (n < 0.13) ctx.fillStyle = CAP.dark;
      else continue;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  if (rim & RIM.north) {
    ctx.fillStyle = CAP.rim; ctx.fillRect(0, 0, TILE_SIZE, 1);
    ctx.fillStyle = CAP.rimSoft; ctx.fillRect(0, 1, TILE_SIZE, 1);
  }
  if (rim & RIM.west) {
    ctx.fillStyle = CAP.rim; ctx.fillRect(0, 0, 1, TILE_SIZE);
    ctx.fillStyle = CAP.rimSoft; ctx.fillRect(1, 0, 1, TILE_SIZE);
  }
  if (rim & RIM.east) {
    ctx.fillStyle = CAP.rimSoft; ctx.fillRect(TILE_SIZE - 1, 0, 1, TILE_SIZE);
  }
  return canvas;
}

/** Face de tijolos 32×WALL_RISE, visível quando há chão ao sul da parede. */
export function wallFace(variant: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE_SIZE, WALL_RISE);
  ctx.fillStyle = FACE.mortar;
  ctx.fillRect(0, 0, TILE_SIZE, WALL_RISE);
  // Fiadas de tijolos de 5 px com 1 px de argamassa, desencontradas.
  for (let course = 0; course < Math.floor((WALL_RISE - 2) / 6); course++) {
    const y0 = 3 + course * 6;
    const offset = course % 2 ? -6 : 0;
    for (let x0 = offset; x0 < TILE_SIZE; x0 += 12) {
      const left = Math.max(0, x0);
      const right = Math.min(TILE_SIZE, x0 + 11);
      if (right <= left) continue;
      const shade = FACE.bricks[Math.floor(hash(variant, course, x0) * FACE.bricks.length)];
      ctx.fillStyle = shade;
      ctx.fillRect(left, y0, right - left, 5);
      ctx.fillStyle = "#ffffff18";
      ctx.fillRect(left, y0, right - left, 1);
      ctx.fillStyle = "#00000030";
      ctx.fillRect(left, y0 + 4, right - left, 1);
    }
  }
  ctx.fillStyle = FACE.top;
  ctx.fillRect(0, 0, TILE_SIZE, 1);
  ctx.fillStyle = FACE.shadow;
  ctx.fillRect(0, WALL_RISE - 1, TILE_SIZE, 1);
  return canvas;
}
