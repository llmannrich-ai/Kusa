import type * as Phaser from "phaser";
import type { Dungeon } from "@kusa/shared";
import { drawForest } from "./forestMap.ts";
import type { MapAmbience } from "./mapShared.ts";

export { MARSH_VOID } from "./forestMap.ts";

/**
 * Pântano do Kosaradius: a mata alagada, no padrão novo de 128 px por tile (`docs/CENARIOS_PLANO.md`, fase 1a). É a
 * variante `marsh` do desenho da mata (`forestPlan.ts`, `art/forestArt.ts`): copa fechada, árvores soltas (cipreste,
 * mangue, salgueiro e morta, algumas dentro d'água), água turva com lentilha-d'água e nenúfares, passarelas, lamaçais,
 * troncos caídos nas clareiras dos baús e o anel de ciprestes com o círculo de cogumelos na clareira do boss.
 */
export function drawMarsh(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  return drawForest(scene, d, floorDepth, uiDepth);
}
