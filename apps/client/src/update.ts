// Versão nova publicada: o app instalado na tela de início (PWA do iPhone) fica com a página antiga na memória e não
// busca o index.html de novo ao voltar para a tela. Aqui, ao voltar ao app (e a cada `CHECK_MS` com ele aberto), o
// cliente baixa o index.html publicado sem cache e compara o script principal (o nome tem o hash do build) com o que
// está rodando. Mudou e o jogador não está numa hunt: recarrega. Na hunt, espera: confere de novo na próxima volta.

const CHECK_MS = 10 * 60_000;

/** Script principal de um index.html (o do build tem o hash no nome: `assets/index-XXXX.js`). */
function mainScript(html: string): string | null {
  const src = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];
  return src ? new URL(src, location.href).href : null;
}

/** O script que está rodando agora. */
function runningScript(): string | null {
  return document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? null;
}

/**
 * Liga a conferência. `canReload` diz se dá para recarregar agora (fora da hunt); `onReload` avisa o jogador logo antes.
 * No `vite dev` não faz nada (o script é o `/src/main.ts`, e o próprio Vite recarrega).
 */
export function watchUpdates(canReload: () => boolean, onReload: () => void): void {
  if (import.meta.env.DEV) return;
  const running = runningScript();
  if (!running) return;
  let busy = false;
  let lastCheck = Date.now();

  const check = async () => {
    if (busy || document.visibilityState !== "visible" || !canReload()) return;
    busy = true;
    lastCheck = Date.now();
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}?u=${Date.now().toString(36)}`, { cache: "no-store" });
      if (!res.ok) return;
      const published = mainScript(await res.text());
      // Sem script no html (página de erro da hospedagem, portal de wi-fi): não é versão nova.
      if (!published || published === running || !canReload()) return;
      onReload();
      location.replace(`${location.pathname}?m=${Date.now().toString(36)}`);
    } catch {
      // Sem internet: confere de novo na próxima volta ao app.
    } finally {
      busy = false;
    }
  };

  document.addEventListener("visibilitychange", () => void check());
  window.setInterval(() => { if (Date.now() - lastCheck >= CHECK_MS) void check(); }, 60_000);
}
