import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { RULES_FILES, rulesHash } from "../../packages/shared/src/rulesVersion.ts";

const gameServer = process.env.GAME_SERVER_URL ?? "http://localhost:2567";

/**
 * `virtual:rules-version`: a versão das regras (hash dos arquivos de `RULES_FILES`), calculada como o servidor calcula.
 * Em desenvolvimento, mudar um desses arquivos recarrega a página com a versão nova.
 */
function rulesVersion(): Plugin {
  const id = "virtual:rules-version";
  const shared = new URL("../../packages/shared/src/", import.meta.url);
  return {
    name: "kusa-rules-version",
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return;
      const files = RULES_FILES.map((name) => ({ name, path: fileURLToPath(new URL(name, shared)) }));
      for (const f of files) this.addWatchFile(f.path);
      const version = rulesHash(files.map((f) => ({ name: f.name, text: readFileSync(f.path, "utf8") })));
      return `export const RULES_VERSION = ${JSON.stringify(version)};`;
    },
  };
}

/**
 * `virtual:client-build`: o commit do cliente (`GITHUB_SHA` no deploy do Pages; `dev` fora dele). O build grava o mesmo
 * em `version.json`, que o jogo aberto consulta para se recarregar quando sai um deploy novo (`update.ts`), e a hunt
 * solo manda para a telemetria (`start_solo_run`).
 */
function clientBuild(): Plugin {
  const id = "virtual:client-build";
  const build = process.env.GITHUB_SHA?.slice(0, 7) ?? "dev";
  return {
    name: "kusa-client-build",
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load: (resolved) => (resolved === `\0${id}` ? `export const CLIENT_BUILD = ${JSON.stringify(build)};` : undefined),
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build }) });
    },
  };
}

export default defineConfig({
  plugins: [rulesVersion(), clientBuild()],
  // No GitHub Pages o jogo fica em /Kusa/ (definido pelo workflow de deploy).
  base: process.env.BASE_PATH ?? "/",
  server: {
    port: 5173,
    // Falha em vez de pular para outra porta: o Codespace e o README apontam para a 5173.
    strictPort: true,
    host: true,
    // Codespaces expõe a porta em *.app.github.dev.
    allowedHosts: [".app.github.dev"],
    // Cliente e servidor de jogo no mesmo endereço: só a porta 5173 precisa ser exposta.
    proxy: {
      "/colyseus": {
        target: gameServer,
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/colyseus/, ""),
      },
    },
  },
});
