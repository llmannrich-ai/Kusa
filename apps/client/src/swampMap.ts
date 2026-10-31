import type * as Phaser from "phaser";
import type { Dungeon } from "@kusa/shared";
import { drawForest } from "./forestMap.ts";
import type { MapAmbience } from "./mapShared.ts";

export { SWAMP_VOID } from "./forestMap.ts";

/**
 * Pântano das Ruínas no padrão novo de 128 px por tile (`docs/CENARIOS_PLANO.md`, fase 1b): a mata alagada do
 * Kosaradius na paleta da baía (variante `swamp` de `forestPlan.ts` e `art/forestArt.ts`) e, no lugar dos troncos, o
 * que resta do império afundado (`art/swampArt.ts`): lajes nas salas e em volta dos muros, com o capim invadindo a
 * beira; muros arruinados de altura variada; colunas inteiras na arena, quebradas e tocos pelo resto; entulho, cabeças
 * de estátua, urnas e ânforas; blocos e tocos de coluna dentro d'água; e o mosaico no chão da arena.
 */
export function drawSwamp(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  return drawForest(scene, d, floorDepth, uiDepth);
}
