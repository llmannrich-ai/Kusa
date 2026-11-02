import type { ClassId } from "@kusa/shared";

/**
 * Símbolo de cada ramo do Grimório (na ordem de `TREE_BRANCHES`), desenhado em SVG 24×24 com `currentColor`:
 * vai no botão da aba do ramo.
 */
const BRANCH_ICONS: Record<ClassId, [string, string, string]> = {
  knight: [
    // Lâmina: espada na diagonal.
    `<path d="M21.5 2.5V5L11 15.5 8.5 13Z"/><path d="M5.5 11.5 12.5 18.5 11 20 4 13Z"/><path d="M7.2 15.3 8.7 16.8 4.5 21 3 19.5Z"/><circle cx="3.3" cy="20.7" r="1.4"/>`,
    // Bastião: escudo com cruz.
    `<path d="M12 2 20 5V11C20 16.5 16.6 20.4 12 22 7.4 20.4 4 16.5 4 11V5Z"/><path d="M12 5.5V18.5M7.5 10H16.5" stroke="#0008" stroke-width="2.2" fill="none"/>`,
    // Comando: estandarte no mastro.
    `<path d="M4.5 2h2v20h-2z"/><path d="M6.5 3.5H20L16.5 8 20 12.5H6.5Z"/><circle cx="5.5" cy="2" r="1.6"/>`,
  ],
  paladin: [
    // Mira: alvo com a cruz da mira.
    `<g fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5V6M12 18V22.5M1.5 12H6M18 12H22.5"/></g><circle cx="12" cy="12" r="1.8"/>`,
    // Luz: sol de oito raios.
    `<circle cx="12" cy="12" r="4.6"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 1.8V4.6M12 19.4V22.2M1.8 12H4.6M19.4 12H22.2M4.8 4.8 6.8 6.8M17.2 17.2 19.2 19.2M4.8 19.2 6.8 17.2M17.2 6.8 19.2 4.8"/></g>`,
    // Batedor: olho atento.
    `<path d="M1.5 12C5.5 5 18.5 5 22.5 12 18.5 19 5.5 19 1.5 12Z"/><circle cx="12" cy="12" r="4" fill="#000a"/><circle cx="12" cy="12" r="1.8"/>`,
  ],
  sorcerer: [
    // Raio.
    `<path d="M14 1.5 4 14H11L9 22.5 20 9.5H13L15.5 1.5Z"/>`,
    // Gelo: floco de neve.
    `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2V22M3.3 7 20.7 17M3.3 17 20.7 7"/><path d="M9.5 3.5 12 6 14.5 3.5M9.5 20.5 12 18 14.5 20.5M3.6 10.2 7 9.5 6.1 6.1M20.4 13.8 17 14.5 17.9 17.9M3.6 13.8 7 14.5 6.1 17.9M20.4 10.2 17 9.5 17.9 6.1"/></g>`,
    // Trevas: lua crescente e estrela.
    `<path d="M14 2.5A9.5 9.5 0 1 0 21.5 16 7.5 7.5 0 0 1 14 2.5Z"/><path d="M18.5 3 19.3 5.2 21.5 6 19.3 6.8 18.5 9 17.7 6.8 15.5 6 17.7 5.2Z"/>`,
  ],
  druid: [
    // Matilha: pegada de lobo.
    `<path d="M12 11.5C8.5 11.5 6 15.5 6.5 18.3 7 21 10 20.2 12 20.2S17 21 17.5 18.3C18 15.5 15.5 11.5 12 11.5Z"/><ellipse cx="5" cy="10.5" rx="2" ry="2.6"/><ellipse cx="9.2" cy="6.2" rx="2" ry="2.7"/><ellipse cx="14.8" cy="6.2" rx="2" ry="2.7"/><ellipse cx="19" cy="10.5" rx="2" ry="2.6"/>`,
    // Bosque: pinheiro.
    `<path d="M12 1.5 18 9.5H15L19.5 16H13.2V22.5H10.8V16H4.5L9 9.5H6Z"/>`,
    // Espinhos: haste com espinhos e um botão no alto.
    `<path d="M12 22.5V8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 9 3.5 6.5 12 13.5ZM12 13 20.5 10.5 12 17.5ZM12 17 4 14.5 12 21.5Z"/><path d="M12 1C15.5 2.8 15.8 6.5 12 9 8.2 6.5 8.5 2.8 12 1Z"/>`,
  ],
  shaman: [
    // Horda: machado de guerra orc.
    `<path d="M11 3h2v19h-2z"/><path d="M13 3.5C18.5 3.5 21.5 7 21.5 11 18.5 9.5 16 9.5 13 10.5Z"/><path d="M11 3.5C5.5 3.5 2.5 7 2.5 11 5.5 9.5 8 9.5 11 10.5Z"/>`,
    // Totens: poste entalhado com crânio e chama.
    `<path d="M9.5 9h5v13.5h-5z"/><path d="M7.5 12.5h9v2h-9zM7.5 17h9v2h-9z"/><path d="M8 8.5C8 5.5 9.8 4 12 4S16 5.5 16 8.5Z"/><path d="M12 0.5C13.8 1.8 13.8 3 12 4 10.2 3 10.2 1.8 12 0.5Z"/>`,
    // Brasa: chama.
    `<path d="M12 1.5C14 5.5 19 8 19 14A7 7 0 0 1 5 14C5 10.5 7 8.5 8.5 7 8.5 9.5 9.5 11 11 11.5 10.5 8 11 4.5 12 1.5Z"/>`,
  ],
};

/** O símbolo do ramo `col` da classe, pronto para ir dentro de um botão. */
export function branchIcon(classId: ClassId, col: number) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = BRANCH_ICONS[classId][col];
  return svg;
}
