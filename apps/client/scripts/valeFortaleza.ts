/**
 * Pinta o vale da Fortaleza Orc (`src/art/valleyArt.ts`, arte por código) e grava a textura pronta em
 * `src/art/proto/fortaleza/vale.webp`, que o jogo carrega como os chãos: pintar no aparelho levaria quase um segundo
 * no começo da hunt. Rode de novo depois de mudar a pintura:
 *
 *   npm run vale -w @kusa/client
 *
 * Precisa do Python 3 com o Pillow (o mesmo de `fortalezaSprites.py`) para gravar o WebP.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VALLEY_H, VALLEY_W, valleyTexture } from "../src/art/valleyArt.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../src/art/proto/fortaleza/vale.webp");
const t = performance.now();
const pixels = valleyTexture();
const dir = mkdtempSync(join(tmpdir(), "vale-"));
const raw = join(dir, "vale.raw");
writeFileSync(raw, pixels);
execFileSync("python3", ["-c", [
  "import sys",
  "from PIL import Image",
  `im = Image.frombytes('RGBA', (${VALLEY_W}, ${VALLEY_H}), open(sys.argv[1], 'rb').read()).convert('RGB')`,
  "im.save(sys.argv[2], 'WEBP', quality=80, method=6)",
].join("\n"), raw, out]);
rmSync(dir, { recursive: true });
console.log(`vale pintado em ${Math.round(performance.now() - t)} ms: ${out}`);
