import capimUrl from "./pantano/tex-capim.png";
import musgoUrl from "./pantano/tex-musgo.png";
import lamaUrl from "./pantano/tex-lama.png";
import aguaUrl from "./pantano/tex-agua.png";
import copaUrl from "./pantano/tex-copa.png";
import margemUrl from "./pantano/borda-margem.png";
import capimLamaUrl from "./pantano/borda-capim-lama.png";
import bordaCopaUrl from "./pantano/borda-copa.png";

/**
 * Chão do Pântano das Ruínas na arte nova (beta), a partir das imagens do agente de arte processadas por
 * `apps/client/scripts/pantanoTexturas.py` (`docs/arte/pantano-das-ruinas/`): texturas de 3×3 tiles e bordas de 6×2
 * tiles, em 128 px por tile. A água ainda é provisória (a versão recusada; a nova volta do agente).
 */
export interface SwampHd {
  grass: HTMLImageElement;
  moss: HTMLImageElement;
  mud: HTMLImageElement;
  water: HTMLImageElement;
  canopy: HTMLImageElement;
  /** Bordas: capim (em cima) → água, capim → lama e copa com os troncos → capim. */
  shore: HTMLImageElement;
  grassMud: HTMLImageElement;
  canopyEdge: HTMLImageElement;
}

const load = async (url: string) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
};

export async function loadSwampHd(): Promise<SwampHd> {
  const [grass, moss, mud, water, canopy, shore, grassMud, canopyEdge] = await Promise.all(
    [capimUrl, musgoUrl, lamaUrl, aguaUrl, copaUrl, margemUrl, capimLamaUrl, bordaCopaUrl].map(load));
  return { grass, moss, mud, water, canopy, shore, grassMud, canopyEdge };
}
