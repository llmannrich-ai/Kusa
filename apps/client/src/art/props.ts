import type * as Phaser from "phaser";
import { HD, toCanvas } from "./paint.ts";
import { BLOOD_VARIANTS, blood, chest, portal } from "./propsArt.ts";
import { BLOOD_TEXTURE, CHEST_TEXTURE, PORTAL_TEXTURE } from "./textures.ts";

/** Os objetos comuns são desenhados em 128 px por tile e entram no mapa em ¼ (`docs/CENARIOS_PLANO.md`, fase 0). */
export const PROP_SCALE = 1 / 4;

/** Gera as texturas do baú, dos portais e do sangue (uma vez por jogo, ≈0,1 s). */
export function createPropsArt(scene: Phaser.Scene) {
  for (const state of ["locked", "unlocked", "open"] as const) {
    if (!scene.textures.exists(CHEST_TEXTURE[state])) scene.textures.addCanvas(CHEST_TEXTURE[state], toCanvas(chest(state)));
  }
  for (const kind of ["escape", "boss"] as const) {
    if (!scene.textures.exists(PORTAL_TEXTURE[kind])) scene.textures.addCanvas(PORTAL_TEXTURE[kind], toCanvas(portal(kind)));
  }
  // Sangue: uma faixa com as variações lado a lado, um quadro por variação (o jogo sorteia o quadro).
  for (const kind of ["splat", "puddle"] as const) {
    const key = BLOOD_TEXTURE[kind];
    if (scene.textures.exists(key)) continue;
    const strip = new Uint8ClampedArray(HD * BLOOD_VARIANTS * HD * 4);
    for (let v = 0; v < BLOOD_VARIANTS; v++) {
      const px = blood(kind, v);
      for (let y = 0; y < HD; y++) strip.set(px.subarray(y * HD * 4, (y + 1) * HD * 4), (y * HD * BLOOD_VARIANTS + v * HD) * 4);
    }
    const texture = scene.textures.addCanvas(key, toCanvas(strip, HD * BLOOD_VARIANTS, HD))!;
    for (let v = 0; v < BLOOD_VARIANTS; v++) texture.add(v, 0, v * HD, 0, HD, HD);
  }
}
