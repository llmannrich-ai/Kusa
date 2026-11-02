// Aviso "Instale no iPhone": o jogo vira um app na tela de início (PWA), sem App Store.
// O iOS não tem botão de instalar nem evento `beforeinstallprompt`: o jogador precisa usar
// Compartilhar > Adicionar à Tela de Início no Safari, então o aviso ensina o caminho.

/** iPhone ou iPad (o iPad recente se apresenta como Mac, mas tem toque). */
function ehIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/** Já aberto pelo ícone da tela de início. */
function instalado(): boolean {
  return matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Só o Safari instala no iOS; Chrome, Firefox e navegadores dentro de apps (Instagram, WhatsApp) não. */
function ehSafari(): boolean {
  return !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Line\//.test(navigator.userAgent);
}

/** Ícone de Compartilhar do Safari (quadrado com seta para cima). */
const COMPARTILHAR = `<svg class="instalar-icone" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/>
  <path d="M8 11H6v10h12V11h-2"/></svg>`;

const PASSOS = `<b>Instale o Kusa no iPhone</b>
  Toque em ${COMPARTILHAR} <b>Compartilhar</b> e depois em
  <b>Adicionar à Tela de Início</b>. O jogo passa a abrir como um app, sem a barra do Safari.`;
const SO_SAFARI = `<b>Instale o Kusa no iPhone</b>
  Abra este endereço no <b>Safari</b> e use Compartilhar &gt; <b>Adicionar à Tela de Início</b>.`;

/** Mostra o aviso nos elementos `.instalar` quando faz sentido (iOS, ainda no navegador). */
export function mostrarAvisoInstalar(): void {
  if (!ehIos() || instalado()) return;
  const texto = ehSafari() ? PASSOS : SO_SAFARI;
  for (const el of document.querySelectorAll<HTMLElement>(".instalar")) {
    el.innerHTML = texto;
    el.hidden = false;
  }
}
