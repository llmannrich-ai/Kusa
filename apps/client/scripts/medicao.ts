// Empacota a página de medição dos cenários (src/medicao.ts) num HTML só, para abrir no celular:
// `npm run medicao -w @kusa/client -- <arquivo.html>` (padrão: medicao.html na pasta atual). Não vai para o git.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const out = process.argv[2] ?? "medicao.html";
const bundle = await build({
  entryPoints: [here("../src/medicao.ts")], bundle: true, write: false, format: "iife", platform: "browser", minify: true,
  loader: { ".png": "dataurl" }, define: { "import.meta.env": "{}" },
});
const js = bundle.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kusa · medição dos cenários</title>
<style>
  html, body { margin: 0; height: 100%; background: #111; color: #eee; font: 15px/1.45 system-ui, sans-serif; }
  #mapa { position: fixed; inset: 0; }
  #painel { position: fixed; left: 10px; right: 10px; top: 10px; z-index: 2; background: rgba(0,0,0,.82); padding: 12px 14px; border-radius: 8px; }
  #painel h1 { font-size: 17px; margin: 0 0 6px; }
  #resultado { white-space: pre-wrap; font: 13px/1.5 ui-monospace, monospace; margin: 8px 0 0; }
  button { font: inherit; font-weight: 600; margin-top: 10px; padding: 12px 18px; border: 0; border-radius: 8px; background: #d8a838; color: #1a1210; }
</style>
</head>
<body>
<div id="mapa"></div>
<div id="painel">
  <h1>Medição dos cenários do Kusa</h1>
  <div id="status">Segure o celular em pé, feche os outros apps e toque em Começar. Leva cerca de 1 minuto: Fortaleza Orc, Portões do Império e Dunas Cantantes, um de cada vez.</div>
  <pre id="resultado"></pre>
  <button id="comecar">Começar</button>
</div>
<script>${js}</script>
</body>
</html>`;
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1048576).toFixed(1)} MB`);
