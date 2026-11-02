/**
 * Gera os ícones PNG do app a partir de `public/icon.svg` (npm run icones -w @kusa/client).
 * O iOS não aceita SVG no `apple-touch-icon` e arredonda os cantos sozinho: por isso o fundo
 * vai até a borda (sem o `rx` do SVG), senão sobram cantos pretos.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Playwright não é dependência do projeto: vem do ambiente (Claude Code na nuvem) ou de `npm i -g playwright`.
const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");

const pub = new URL("../public/", import.meta.url);
const svg = readFileSync(new URL("icon.svg", pub), "utf8").replace('rx="12" fill="#1c1714"', 'fill="#1c1714"');
const sizes: Record<string, number> = { "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512 };

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of Object.entries(sizes)) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: fileURLToPath(new URL(name, pub)), omitBackground: false });
  console.log(`${name} (${size}×${size})`);
}
await browser.close();
