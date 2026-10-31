/**
 * Folha de arte em PNG (arte nova desenhada por IA) carregada só quando precisa: a imagem aberta ocupa largura × altura
 * × 4 bytes na memória do celular (o Rei Bullywug sozinho, 22 MB), e todas juntas, abertas o jogo inteiro, ajudavam a
 * fechar o jogo sozinho. O jogo abre as folhas dos monstros do mapa quando a hunt começa (`loadMapSheets` em
 * `textures.ts`) e fecha cada uma assim que a textura do monstro fica pronta.
 */
export class SheetSource {
  private image: ImageBitmap | HTMLImageElement | null = null;
  private loading: Promise<void> | null = null;

  constructor(readonly url: string) {}

  get ready() {
    return this.image !== null;
  }

  /** A folha aberta (só depois de `load`). */
  get img(): CanvasImageSource {
    if (!this.image) throw new Error(`folha não carregada: ${this.url}`);
    return this.image;
  }

  load(): Promise<void> {
    if (this.image) return Promise.resolve();
    return this.loading ??= open(this.url).then((image) => { this.image = image; }).finally(() => { this.loading = null; });
  }

  /** Solta a imagem da memória (pode carregar de novo depois; o PNG fica no cache do navegador). */
  release() {
    if (this.image && "close" in this.image) this.image.close();
    this.image = null;
  }
}

async function open(url: string): Promise<ImageBitmap | HTMLImageElement> {
  // O ImageBitmap solta a memória na hora (`close`); a imagem comum fica até o navegador decidir.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(await (await fetch(url)).blob());
    } catch { /* cai na imagem comum */ }
  }
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
