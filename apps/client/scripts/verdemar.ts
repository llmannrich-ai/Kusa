// Gera a arte da carta de Verdemar: `npm run mapa -w @kusa/client`. Precisa do Playwright com o Chromium instalado
// (não é dependência do projeto: vem do ambiente, como no Claude Code na nuvem, ou de `npm i -g playwright`).
// Empacota scripts/verdemarArt.ts, roda num navegador sem tela e grava public/mapa/verdemar.svg (vai para o git).
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// require (e não import) para achar o Playwright instalado fora do projeto (NODE_PATH).
const { chromium } = createRequire(import.meta.url)("playwright") as typeof import("playwright");

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const bundle = await build({ entryPoints: [here("./verdemarArt.ts")], bundle: true, write: false, format: "iife", globalName: "Verdemar", platform: "browser" });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><meta charset='utf-8'><body></body>");
await page.addScriptTag({ content: bundle.outputFiles[0].text });
const svg = await page.evaluate(() => (window as unknown as { Verdemar: { drawVerdemar(): string } }).Verdemar.drawVerdemar());
await browser.close();
mkdirSync(here("../public/mapa"), { recursive: true });
writeFileSync(here("../public/mapa/verdemar.svg"), svg);
console.log(`public/mapa/verdemar.svg: ${(svg.length / 1024).toFixed(0)} KB`);
