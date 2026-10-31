import type * as Phaser from "phaser";
import type { Dungeon } from "@kusa/shared";
import { drawDunes } from "./dunesMap.ts";
import type { MapAmbience } from "./mapShared.ts";

export { DESERT_VOID } from "./dunesMap.ts";

/**
 * Mar de Areia no padrão novo de 128 px por tile (`docs/CENARIOS_PLANO.md`, fase 3): a variante `desert` do desenho das
 * Dunas (`dunesMap.ts`, `art/duneArt.ts`), em areia dourada mais quente, com o oásis turquesa: dunas soltas, coqueiros,
 * ruínas soterradas com tocos de coluna, e a caverna: o monte com a boca na superfície e o subterrâneo inteiro na arte
 * das cavernas (`cavernMap.ts`, `cavePlan.ts`, paleta `desert`), com o salão dos baús, o covil do verme e a corda da
 * saída.
 */
export function drawDesert(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  return drawDunes(scene, d, floorDepth, uiDepth);
}
