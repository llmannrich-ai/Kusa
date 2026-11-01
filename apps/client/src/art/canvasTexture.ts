import type * as Phaser from "phaser";

/**
 * Registra um canvas já pintado como textura estática. O `addCanvas` do Phaser cria uma `CanvasTexture`, que lê o
 * canvas inteiro de volta (`getImageData`) e guarda essa cópia para sempre: no celular a leitura espera a GPU e trava o
 * quadro (um item caindo no chão no meio da luta dava engasgo), e as cópias somavam mais de 100 MB na Fortaleza Orc.
 * O canvas vai direto para a GPU, como uma imagem. Canvas que muda depois de registrado usa `textures.createCanvas`.
 */
export function addCanvasTexture(textures: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement) {
  return textures.addImage(key, canvas as unknown as HTMLImageElement);
}
