import acampamentoUrl from "./fortaleza/acampamento.png";
import acampamentoFrames from "./fortaleza/acampamento.json";

/**
 * Folhas de sprites de cenário da Fortaleza Orc, geradas no ChatGPT (`docs/arte/agente/FORTALEZA_ORC.md`) e
 * processadas por `apps/client/scripts/fortalezaSprites.py`: cada objeto já está na largura do jogo, em px de arte
 * (128 por tile, como o resto do cenário), com o pé no meio da linha de baixo. A imagem é carregada quando o jogo
 * abre (é pequena), para o mapa poder desenhar na hora.
 */
export interface SceneSheet {
  image: HTMLImageElement;
  frames: Record<string, { x: number; y: number; w: number; h: number }>;
}

async function load(url: string, frames: SceneSheet["frames"]): Promise<SceneSheet> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return { image, frames };
}

/** Acampamento orc: tendas, fogueira, totem, estandarte, paliçada, armas, caldeirão, lenha, ossos, jaula e barris. */
export const ACAMPAMENTO = await load(acampamentoUrl, acampamentoFrames);
export type AcampamentoFrame = keyof typeof acampamentoFrames;
