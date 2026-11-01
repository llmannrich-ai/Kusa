// Trava o zoom da página no celular. O Safari do iPhone ignora o `user-scalable=no` da meta viewport
// desde o iOS 10: pinça (dois dedos, ex.: um no joystick e outro numa magia) e duplo toque em área
// sem `touch-action` ainda davam zoom no meio da hunt, e a tela ficava ampliada.

/** Campo de texto continua livre (selecionar, mover o cursor). */
function editavel(alvo: EventTarget | null): boolean {
  return alvo instanceof HTMLInputElement || alvo instanceof HTMLTextAreaElement;
}

export function travarZoom(): void {
  // Gestos de pinça do WebKit (só existem no Safari): cancelar impede o zoom.
  for (const tipo of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(tipo, (e) => e.preventDefault(), { passive: false });
  }
  // Dois ou mais dedos se mexendo: o navegador trataria como pinça. Os toques continuam chegando ao jogo.
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  // Duplo clique (vem do duplo toque) nunca amplia.
  document.addEventListener("dblclick", (e) => {
    if (!editavel(e.target)) e.preventDefault();
  });
}
