import { defineConfig } from "vite";

const gameServer = process.env.GAME_SERVER_URL ?? "http://localhost:2567";

export default defineConfig({
  server: {
    port: 5173,
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
