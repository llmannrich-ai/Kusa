import { CLIENT_BUILD } from "virtual:client-build";

/**
 * Jogo aberto antes de um deploy continua com o código velho até recarregar (o celular deixa o app aberto por horas):
 * uma correção publicada não chegava em quem já estava com o jogo aberto. O jogo consulta o `version.json` do deploy
 * (`vite.config.ts`) ao voltar para a tela e a cada poucos minutos e, com um build novo, recarrega a página, mas só
 * quando `canReload()` diz que não está em hunt nem entrando ou esperando numa sala.
 */
const CHECK_MS = 3 * 60 * 1000;
/** Build para o qual já recarregou nesta aba: se a hospedagem ainda entrega o index.html velho, não recarrega em laço. */
const TRIED_KEY = "kusa:build-recarregado";

export function watchNewBuild(canReload: () => boolean) {
  if (CLIENT_BUILD === "dev") return;
  let checking = false;
  const check = async () => {
    if (checking || document.visibilityState !== "visible" || !canReload()) return;
    checking = true;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" });
      const build = res.ok ? ((await res.json()) as { build?: string }).build : undefined;
      if (!build || build === CLIENT_BUILD || sessionStorage.getItem(TRIED_KEY) === build || !canReload()) return;
      sessionStorage.setItem(TRIED_KEY, build);
      // `?v=` fura o cache do index.html na hospedagem (como em `onVersionMismatch`).
      location.replace(`${location.pathname}?v=${build}`);
    } catch {
      // Sem rede: tenta na próxima.
    } finally {
      checking = false;
    }
  };
  document.addEventListener("visibilitychange", () => void check());
  window.setInterval(() => void check(), CHECK_MS);
}
