import acampamentoUrl from "./fortaleza/acampamento.png";
import acampamentoFrames from "./fortaleza/acampamento.json";
import basaltoUrl from "./fortaleza/chao-basalto.webp";
import capimUrl from "./fortaleza/chao-capim.webp";
import { HD } from "../paint.ts";

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

/**
 * Textura de chão do ChatGPT: N×N tiles de 128 px que emendam nos 4 lados (o capim tem 8). O tile (x, y) do mapa usa
 * o pedaço (x mod N, y mod N), então o chão continua sem costura e só repete a cada N tiles.
 */
export interface GroundTexture {
  /** A textura inteira (a camada de capim da borda repete ela no mundo). */
  readonly image: HTMLImageElement;
  /** Período em tiles. */
  readonly period: number;
  /** Pixels RGBA do pedaço (tx, ty), 128×128. */
  tile(tx: number, ty: number): Uint8ClampedArray;
}

async function loadGround(url: string): Promise<GroundTexture> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const period = Math.round(image.width / HD);
  let data: Uint8ClampedArray | null = null;
  const pixels = () => {
    if (!data) {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(image, 0, 0);
      data = ctx.getImageData(0, 0, image.width, image.height).data;
    }
    return data;
  };
  return {
    image,
    period,
    tile(tx, ty) {
      const src = pixels(), out = new Uint8ClampedArray(HD * HD * 4), stride = image.width * 4;
      for (let y = 0; y < HD; y++) out.set(src.subarray((ty * HD + y) * stride + tx * HD * 4, (ty * HD + y) * stride + (tx + 1) * HD * 4), y * HD * 4);
      return out;
    },
  };
}

/** Capim mediterrâneo (a vila baixa e as bordas dos pátios). */
export const CHAO_CAPIM = await loadGround(capimUrl);

/** Calçamento romano de basalto (a estrada, as ruas e o calçamento quebrado dos pátios). */
export const CHAO_BASALTO = await loadGround(basaltoUrl);
