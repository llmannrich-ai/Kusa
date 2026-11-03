// "Voltar" do aparelho no app instalado (tela de início). Sem a barra do navegador não há histórico de páginas: no
// Android, o gesto ou o botão de voltar fechava o jogo de qualquer tela (uma folha aberta, as configurações, o mapa).
// Aqui o jogo guarda uma entrada no histórico e, a cada "voltar", desfaz a tela de cima, como num app. No menu
// principal, o primeiro "voltar" só avisa; o segundo, logo em seguida, fecha o app. No iPhone o mesmo vale para o
// gesto de deslizar da borda esquerda.
//
// Só no app instalado: no navegador, o voltar continua sendo o do navegador.

/** Já aberto pelo ícone da tela de início. */
export function instalado(): boolean {
  return matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * O que fazer a cada "voltar". `true`: o voltar foi usado (fechou algo, ou foi ignorado de propósito, como na hunt).
 * `false`: não há nada a desfazer, está no menu principal.
 */
export type Voltar = () => boolean;

/** Quanto tempo o segundo "voltar" no menu principal ainda fecha o app. */
const JANELA_SAIR = 2000;

export function ligarVoltar(voltar: Voltar, avisarSaida: () => void): void {
  if (!instalado()) return;
  const marca = { kusa: "voltar" };
  const guardar = () => { if (history.state?.kusa !== "voltar") history.pushState(marca, ""); };
  guardar();
  let sair = 0;
  addEventListener("popstate", () => {
    if (voltar()) { guardar(); return; }
    // Menu principal: avisa e deixa o próximo "voltar" fechar o app; passado o prazo, guarda de novo.
    avisarSaida();
    window.clearTimeout(sair);
    sair = window.setTimeout(guardar, JANELA_SAIR);
  });
  // Mexeu no jogo depois do aviso: não quer sair, então o "voltar" volta a desfazer telas.
  addEventListener("pointerdown", () => { window.clearTimeout(sair); guardar(); }, { capture: true });
}
