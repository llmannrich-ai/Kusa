import { CLASSES, CLASS_IDS, MAPS, MSG, difficultyStars, mapIdOf, partySize, type AddBotMessage, type ClassId, type MapId, type RemoveBotMessage } from "@kusa/shared";
import { heroPoses } from "./art/heroes.ts";
import type { DungeonRoom } from "./net.ts";

// Telas antes da hunt: o cenário e o servidor da sala criada e a sala de espera com as vagas da equipe.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Cria um elemento com classe e texto (sem innerHTML: o nome do jogador vem de fora). */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export const mapLine = (id: MapId) => {
  const map = MAPS[id];
  return `${map.icon} ${map.name} · dificuldade ${map.difficulty} ${difficultyStars(map.difficulty)} · ${map.durationSeconds / 60} min`;
};

// --- Servidor da sala criada ----------------------------------------------

/** Onde a hunt da sala criada roda: no servidor da nuvem ou no aparelho de quem cria (sala hospedada). */
export type ServerChoice = "cloud" | "device";

export const SERVER_CHOICES: Record<ServerChoice, { icon: string; name: string; hint: string }> = {
  cloud: { icon: "☁️", name: "Nuvem", hint: "Servidor do jogo. Pode levar 1 min para acordar." },
  device: { icon: "📱", name: "Meu aparelho", hint: "Abre na hora; os amigos se conectam direto a você." },
};

let chosenServer: ServerChoice = storageGet("kusa:server") === "device" ? "device" : "cloud";

/** Servidor das salas que este jogador criar (fica salvo no aparelho). */
export const createServer = () => chosenServer;

/** Os dois botões de servidor na ficha do cenário; tocar escolhe. `onPick` atualiza o botão de criar. */
export function renderServerPicker(onPick: () => void) {
  const list = $("server-list");
  list.replaceChildren();
  for (const id of Object.keys(SERVER_CHOICES) as ServerChoice[]) {
    const choice = SERVER_CHOICES[id];
    const card = el("button", "server-card");
    card.type = "button";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", String(id === chosenServer));
    card.classList.toggle("selected", id === chosenServer);
    card.title = choice.hint;
    card.append(el("strong", "", `${choice.icon} ${choice.name}`), el("small", "muted", choice.hint));
    card.onclick = () => {
      chosenServer = id;
      storageSet("kusa:server", id);
      renderServerPicker(onPick);
      onPick();
    };
    list.append(card);
  }
}

// --- Cenário da sala criada -----------------------------------------------

/**
 * Cenário das salas que este jogador criar: o ponto tocado no mapa mundi (fica salvo no aparelho). Na primeira vez,
 * o começo da trilha (Pântano do Kosaradius).
 */
const savedMap = storageGet("kusa:map");
let chosenMap: MapId = savedMap ? mapIdOf(savedMap) : "marsh";

export const createMapId = () => chosenMap;

export function chooseMap(id: MapId) {
  chosenMap = id;
  storageSet("kusa:map", id);
}

/**
 * Símbolo desenhado de cada cenário (SVG 48×48), no lugar do emoji: uma cena com o que marca o mapa.
 * O texto é fixo (não vem de fora), então pode ir por innerHTML.
 */
export const MAP_ART: Record<MapId, string> = {
  // Cripta: o arco de pedra com a caveira na chave, tochas dos lados e os olhos do Dragão jovem no escuro.
  crypt: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <radialGradient id="cr-fundo" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="#3d3046"/><stop offset="1" stop-color="#110c14"/></radialGradient>
      <radialGradient id="cr-brilho"><stop offset="0" stop-color="#ff7a24" stop-opacity="0.55"/><stop offset="1" stop-color="#ff7a24" stop-opacity="0"/></radialGradient>
      <radialGradient id="cr-tocha"><stop offset="0" stop-color="#ffb347" stop-opacity="0.6"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <clipPath id="cr-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#cr-roda)">
      <rect width="48" height="48" fill="url(#cr-fundo)"/>
      <rect y="39" width="48" height="9" fill="#231d1b"/>
      <path d="M9 41V22A15 15 0 0 1 39 22V41Z" fill="#6f665c"/>
      <path d="M9 30H15M33 30H39M9 36H15M33 36H39M12 24V30M36 24V30M10.5 18 15.5 20.5M37.5 18 32.5 20.5M16 11.5 18.8 15.5M32 11.5 29.2 15.5" stroke="#4b443e" stroke-width="0.9"/>
      <path d="M15 41V24A9 9 0 0 1 33 24V41Z" fill="#060407"/>
      <circle cx="24" cy="30" r="8" fill="url(#cr-brilho)"/>
      <path d="M18.3 30Q20.5 27.3 23 30Q20.5 31.4 18.3 30Z M25 30Q27.5 27.3 29.7 30Q27.5 31.4 25 30Z" fill="#ff8a2a"/>
      <path d="M20.6 28.4V31.2M27.4 28.4V31.2" stroke="#250800" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M13 41H35V43H13ZM11 43H37V45H11Z" fill="#544c45"/>
      <path d="M20.2 6.5H27.8L26.5 14H21.5Z" fill="#7d746a"/>
      <circle cx="24" cy="9.6" r="3.1" fill="#e9ddc2"/>
      <rect x="22.1" y="11.4" width="3.8" height="2.4" rx="0.6" fill="#e9ddc2"/>
      <circle cx="22.8" cy="9.6" r="0.95" fill="#1a1214"/><circle cx="25.2" cy="9.6" r="0.95" fill="#1a1214"/>
      <path d="M23.2 12.6V13.8M24 12.6V13.8M24.8 12.6V13.8" stroke="#6f665c" stroke-width="0.4"/>
      <circle cx="5.5" cy="23" r="6" fill="url(#cr-tocha)"/><circle cx="42.5" cy="23" r="6" fill="url(#cr-tocha)"/>
      <path d="M5 26H6.5L6 33H5.5Z M41.5 26H43L42.5 33H42Z" fill="#5a3a22"/>
      <path d="M5.75 19.5Q3.6 23 5 26H6.5Q8 23 5.75 19.5Z M42.25 19.5Q40.1 23 41.5 26H43Q44.5 23 42.25 19.5Z" fill="#ff9a2e"/>
      <path d="M5.75 22.3Q4.9 24.2 5.4 26H6.1Q6.6 24.2 5.75 22.3Z M42.25 22.3Q41.4 24.2 41.9 26H42.6Q43.1 24.2 42.25 22.3Z" fill="#ffe08a"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#b49a6c" stroke-width="1.5"/>
  </svg>`,
  // Pântano das Ruínas: colunas quebradas na água e as três cabeças da Hidra subindo do centro.
  swamp: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <radialGradient id="sw-ceu" cx="0.5" cy="0.3" r="0.85"><stop offset="0" stop-color="#4b7466"/><stop offset="1" stop-color="#0f1f1e"/></radialGradient>
      <linearGradient id="sw-agua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c5c58"/><stop offset="1" stop-color="#112826"/></linearGradient>
      <clipPath id="sw-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#sw-roda)">
      <rect width="48" height="48" fill="url(#sw-ceu)"/>
      <path d="M0 30Q4 22 8 27Q11 20 15 26Q19 21 24 27Q29 21 33 26Q37 20 41 27Q45 22 48 29V34H0Z" fill="#183229"/>
      <path d="M5 37V15L7 13.5 9 16 11 14.5V37Z" fill="#a8a28c"/>
      <path d="M4 15H12V13H4Z M7 18V35M9.3 18V35" stroke="#7d7866" stroke-width="0.8" fill="none"/>
      <path d="M4 13.6H12" stroke="#c9c2a8" stroke-width="1.6"/>
      <path d="M37 37V23L39 21.5 40.5 24 42 22.5V37Z" fill="#a8a28c"/>
      <path d="M39 26V35M40.6 26V35" stroke="#7d7866" stroke-width="0.8"/>
      <path d="M2 18Q4 22 3 26M11 16Q12.5 20 11.5 23" stroke="#5f8a4c" stroke-width="1" fill="none" stroke-linecap="round"/>
      <rect y="34" width="48" height="14" fill="url(#sw-agua)"/>
      <g fill="none" stroke-linecap="round">
        <path d="M20 39Q14 31 15.5 21M24 39Q24.5 27 24 13.5M28 39Q34 31 32.5 21" stroke="#24563a" stroke-width="4.6"/>
        <path d="M20 39Q14 31 15.5 21M24 39Q24.5 27 24 13.5M28 39Q34 31 32.5 21" stroke="#4f9356" stroke-width="2"/>
        <path d="M21.2 38Q16.6 31 17 23M25.3 38Q25.7 28 25.3 16M26.8 38Q31.4 31 31 23" stroke="#a6cf7a" stroke-width="0.7" opacity="0.7"/>
      </g>
      <g transform="translate(15.4 20) rotate(-12) scale(1.35)"><path d="M-3.6 0.6Q-3.4-2.8 0-2.9Q3.4-2.8 3.6 0.6Q0 2.8-3.6 0.6Z" fill="#3d8148"/><path d="M-3.3 0.8-2.6 2.6-1.6 1.6ZM3.3 0.8 2.6 2.6 1.6 1.6Z" fill="#e8e2c8"/><circle cx="-1.5" cy="-0.9" r="0.85" fill="#ffd23a"/><circle cx="1.5" cy="-0.9" r="0.85" fill="#ffd23a"/></g>
      <g transform="translate(24 12.6) rotate(0) scale(1.35)"><path d="M-3.6 0.6Q-3.4-2.8 0-2.9Q3.4-2.8 3.6 0.6Q0 2.8-3.6 0.6Z" fill="#3d8148"/><path d="M-3.3 0.8-2.6 2.6-1.6 1.6ZM3.3 0.8 2.6 2.6 1.6 1.6Z" fill="#e8e2c8"/><circle cx="-1.5" cy="-0.9" r="0.85" fill="#ffd23a"/><circle cx="1.5" cy="-0.9" r="0.85" fill="#ffd23a"/></g>
      <g transform="translate(32.6 20) rotate(12) scale(1.35)"><path d="M-3.6 0.6Q-3.4-2.8 0-2.9Q3.4-2.8 3.6 0.6Q0 2.8-3.6 0.6Z" fill="#3d8148"/><path d="M-3.3 0.8-2.6 2.6-1.6 1.6ZM3.3 0.8 2.6 2.6 1.6 1.6Z" fill="#e8e2c8"/><circle cx="-1.5" cy="-0.9" r="0.85" fill="#ffd23a"/><circle cx="1.5" cy="-0.9" r="0.85" fill="#ffd23a"/></g>
      <path d="M14 39.5Q24 36 34 39.5" stroke="#8cc3ae" stroke-width="0.9" fill="none" opacity="0.7"/>
      <path d="M10 43H18M27 44H38M3 40H8" stroke="#8cc3ae" stroke-width="0.8" stroke-linecap="round" opacity="0.45"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#4fae9a" stroke-width="1.5"/>
  </svg>`,
  // Mar de Areia: o Verme da Areia rompendo a duna ao pôr do sol, com o coqueiro do oásis.
  desert: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="de-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2c4e"/><stop offset="0.55" stop-color="#d9714a"/><stop offset="1" stop-color="#f4b866"/></linearGradient>
      <linearGradient id="de-duna" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0bd6a"/><stop offset="1" stop-color="#c98a45"/></linearGradient>
      <clipPath id="de-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#de-roda)">
      <rect width="48" height="48" fill="url(#de-ceu)"/>
      <circle cx="31" cy="25" r="9" fill="#ffd98a"/><circle cx="31" cy="25" r="11.5" fill="#ffd98a" opacity="0.25"/>
      <path d="M0 31Q12 25 24 30T48 28V48H0Z" fill="#b8733d"/>
      <path d="M0 36Q10 31 20 34Q32 38 48 33V48H0Z" fill="url(#de-duna)"/>
      <path d="M20 34Q32 38 48 33V48H30Q34 41 20 34Z" fill="#b47a3d" opacity="0.45"/>
      <g fill="none" stroke-linecap="round">
        <path d="M11 38C10 28 13 20 20 16" stroke="#6d4329" stroke-width="7.5"/>
        <path d="M11 38C10 28 13 20 20 16" stroke="#a87048" stroke-width="5.6"/>
        <path d="M9 35H13.4M8.6 31H13M9.4 27H13.6M11 23 15 24.6M13.6 19.6 17 21.8" stroke="#6d4329" stroke-width="0.9"/>
      </g>
      <path d="M16 15.4A5.4 5.4 0 1 1 24 22Z" fill="#8a5636"/>
      <circle cx="21.4" cy="16.6" r="4.4" fill="#3a1410"/>
      <circle cx="21.4" cy="16.6" r="3.6" fill="none" stroke="#f6ead0" stroke-width="1.5" stroke-dasharray="0.9 0.85"/>
      <circle cx="21.4" cy="16.6" r="2" fill="#a52b20"/>
      <path d="M6 39Q11 36.5 16 39" stroke="#e8b46a" stroke-width="1.4" fill="none"/>
      <circle cx="17" cy="35.5" r="0.6" fill="#e8b46a"/><circle cx="7" cy="34.5" r="0.5" fill="#e8b46a"/><circle cx="15" cy="32" r="0.45" fill="#e8b46a"/>
      <path d="M38 36Q37.5 27 40 20" stroke="#5a3a22" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M40 20Q35 18 32.5 21.5Q36 19.8 40 20.4Z M40 20Q45 17.5 47.5 21Q44 19.6 40 20.6Z M40 20Q37 15 33.5 15.5Q37.5 16.5 39.8 20.3Z M40 20Q43 15 46.5 15.8Q42.5 16.6 40.2 20.3Z M40 20Q40.5 15.5 39 13Q41.2 15.5 40.4 20.2Z" fill="#2f6a35"/>
      <ellipse cx="38.5" cy="37.5" rx="6" ry="1.4" fill="#4fa2b0" opacity="0.8"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#e39a4a" stroke-width="1.5"/>
  </svg>`,
  // Pântano do Kosaradius: lua sobre os ciprestes com barba-de-velho, água parada e o sapo na vitória-régia.
  marsh: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <radialGradient id="mk-ceu" cx="0.7" cy="0.25" r="0.9"><stop offset="0" stop-color="#3f6b4f"/><stop offset="1" stop-color="#0e1d17"/></radialGradient>
      <linearGradient id="mk-agua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f5d55"/><stop offset="1" stop-color="#15302b"/></linearGradient>
      <clipPath id="mk-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#mk-roda)">
      <rect width="48" height="48" fill="url(#mk-ceu)"/>
      <circle cx="33" cy="13" r="6.5" fill="#e6efb4"/><circle cx="35.5" cy="11.5" r="5.6" fill="#3a6449" opacity="0.55"/>
      <path d="M0 26Q12 22 24 25T48 24V30H0Z" fill="#a9c9a0" opacity="0.18"/>
      <path d="M9 31V9L6 14 8 13 4 20 7.5 19 3 26 9 25Z M9 9 12 14 10 13.5 14 20 10.5 19 15 26 9 25Z" fill="#0a1611"/>
      <path d="M8.5 31H10V12H8.5Z" fill="#0a1611"/>
      <path d="M5 16V21M7 19V25M12 15V20M13.5 21V26" stroke="#6f8f4a" stroke-width="1" stroke-linecap="round"/>
      <path d="M41 31V14L38.5 18 40 17.5 37 23 39.5 22.5 36 28 41 27.5Z M41 14 43.5 18 42 17.5 45 23 42.5 22.5 46 28 41 27.5Z" fill="#0c1a14"/>
      <path d="M38 20V24M44 21V26" stroke="#6f8f4a" stroke-width="1" stroke-linecap="round"/>
      <rect y="30" width="48" height="18" fill="url(#mk-agua)"/>
      <path d="M4 34H14M30 33H38M20 44H30M36 42H44" stroke="#8cc3ae" stroke-width="0.9" stroke-linecap="round" opacity="0.55"/>
      <path d="M27 35.5H39" stroke="#e6efb4" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <g transform="translate(24 37.5) scale(1.25) translate(-24 -39)">
        <path d="M24 40.5m-11 0a11 4 0 1 0 22 0a11 4 0 1 0-22 0Z" fill="#3f8a3a"/>
        <path d="M24 40.5L35 39.6" stroke="#0e1d17" stroke-width="1.3"/>
        <path d="M15.5 40.5Q24 38 32 40" stroke="#5fae4c" stroke-width="0.8" fill="none"/>
        <ellipse cx="22.5" cy="36.5" rx="7" ry="4.2" fill="#7cc243"/>
        <path d="M15.5 38.5Q13.5 41 16.5 41.5M29.5 38.5Q31.5 41 28.5 41.5" stroke="#5c9a2f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <ellipse cx="22.5" cy="38" rx="4.2" ry="2" fill="#d6e89a"/>
        <circle cx="19" cy="32.6" r="2.6" fill="#7cc243"/><circle cx="26" cy="32.6" r="2.6" fill="#7cc243"/>
        <circle cx="19" cy="32.4" r="1.6" fill="#f2d24a"/><circle cx="26" cy="32.4" r="1.6" fill="#f2d24a"/>
        <rect x="18.6" y="31.4" width="0.8" height="2" rx="0.4" fill="#111"/><rect x="25.6" y="31.4" width="0.8" height="2" rx="0.4" fill="#111"/>
        <path d="M19.5 36.4Q22.5 37.8 25.5 36.4" stroke="#2f5a1c" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      </g>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#7cc243" stroke-width="1.5"/>
  </svg>`,
  // Caverna da Travessia: a rocha que se abre em dois túneis, com os olhos dos dois bosses no escuro (o verde do
  // Basilisco à esquerda, o roxo do Observador à direita) e gotas pingando sobre a poça da chegada.
  cavern: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <radialGradient id="cv-fundo" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#2a3a4c"/><stop offset="1" stop-color="#070b12"/></radialGradient>
      <radialGradient id="cv-verde"><stop offset="0" stop-color="#9bff5a" stop-opacity="0.6"/><stop offset="1" stop-color="#9bff5a" stop-opacity="0"/></radialGradient>
      <radialGradient id="cv-roxo"><stop offset="0" stop-color="#c46bff" stop-opacity="0.65"/><stop offset="1" stop-color="#c46bff" stop-opacity="0"/></radialGradient>
      <clipPath id="cv-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#cv-roda)">
      <rect width="48" height="48" fill="url(#cv-fundo)"/>
      <path d="M0 0H48V48H0Z M8 44Q6 30 12 18Q15 12 20 16Q22 22 24 30Q26 22 28 16Q33 12 36 18Q42 30 40 44Z" fill="#3b4656" fill-rule="evenodd"/>
      <path d="M10 44Q9 32 13.5 21Q16 16 19 18.5Q21 26 22.5 34L24 38L25.5 34Q27 26 29 18.5Q32 16 34.5 21Q39 32 38 44Z" fill="#05070b"/>
      <path d="M24 30Q22.5 22 20 16M24 30Q25.5 22 28 16" stroke="#56657a" stroke-width="1.6" fill="none"/>
      <path d="M2 10L6 16L8 9ZM13 3L15 9L17 3ZM31 3L33 9L35 3ZM40 9L42 16L46 10Z" fill="#56657a"/>
      <circle cx="15.5" cy="25" r="5" fill="url(#cv-verde)"/><circle cx="32.5" cy="25" r="5.5" fill="url(#cv-roxo)"/>
      <path d="M13.4 25Q14.4 23.8 15.4 25Q14.4 25.8 13.4 25ZM16 24.6Q17 23.4 18 24.6Q17 25.4 16 24.6Z" fill="#b6ff6a"/>
      <circle cx="32.5" cy="25" r="2.4" fill="#f4ecd8"/><circle cx="32.2" cy="25" r="1.2" fill="#2f9a43"/><rect x="32" y="23.9" width="0.5" height="2.2" fill="#0b0b0b"/>
      <ellipse cx="24" cy="42.5" rx="9" ry="2.2" fill="#24506a" opacity="0.85"/>
      <path d="M19 42.4Q24 41.2 29 42.4" stroke="#8fd3f0" stroke-width="0.7" fill="none" opacity="0.7"/>
      <path d="M24 34.5V36.5M21 37.5V38.6M27.4 37V38.2" stroke="#8fd3f0" stroke-width="0.8" stroke-linecap="round"/>
      <path d="M9 40L10.5 34L12 40ZM36 40L37.5 33L39 40Z" fill="#7fe3ff" opacity="0.8"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#6fa8d6" stroke-width="1.5"/>
  </svg>`,
  // Dunas Cantantes: cordilheiras de duna com a crista clara e a encosta na sombra, a pedra cantante furada pelo vento
  // com os glifos acesos e as ondas do canto, e fitas de areia soprando.
  dunes: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="du-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cb6d8"/><stop offset="1" stop-color="#f2dcae"/></linearGradient>
      <clipPath id="du-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#du-roda)">
      <rect width="48" height="48" fill="url(#du-ceu)"/>
      <circle cx="12" cy="11" r="5" fill="#fff6d8"/>
      <path d="M0 27Q9 17 17 24Q26 15 36 23Q42 19 48 22V48H0Z" fill="#e2b47a"/>
      <path d="M17 24Q26 15 36 23Q31 28 26 34Q24 27 17 24Z M0 27Q9 17 17 24Q11 30 8 36Q5 29 0 27Z" fill="#b6814a"/>
      <path d="M0 27Q9 17 17 24M17 24Q26 15 36 23" stroke="#fff0c8" stroke-width="1" fill="none"/>
      <path d="M0 38Q14 31 30 37T48 34V48H0Z" fill="#d9a865"/>
      <path d="M4 42Q10 40 16 42M22 44Q28 42 34 44M8 46Q14 44 20 46" stroke="#b6814a" stroke-width="0.8" fill="none" stroke-linecap="round"/>
      <path d="M31 40L32.5 21Q35 18.5 37.5 21L39 40Z" fill="#9a8a76"/>
      <path d="M35.2 22L37.5 21L39 40H36.5Z" fill="#6e604f"/>
      <ellipse cx="34.6" cy="27" rx="1" ry="1.3" fill="#2a2018"/><ellipse cx="35.4" cy="33" rx="0.9" ry="1.2" fill="#2a2018"/>
      <path d="M33.6 24.5a1.2 1.2 0 1 1 1.5 1.3M33.4 30a1 1 0 1 0 1.6 0.4M33.8 36.5h2" stroke="#5ad2e6" stroke-width="0.7" fill="none" stroke-linecap="round"/>
      <path d="M41 24Q44 28 41 32M43 22Q47.5 28 43 34" stroke="#a0f0ff" stroke-width="0.8" fill="none" stroke-linecap="round" opacity="0.8"/>
      <path d="M6 20Q12 21 15 19M20 15Q26 16 30 14" stroke="#fff3d6" stroke-width="0.7" fill="none" stroke-linecap="round" opacity="0.8"/>
      <ellipse cx="35" cy="40.5" rx="6" ry="1.4" fill="#e6c995"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#e2b47a" stroke-width="1.5"/>
  </svg>`,
  // Portões do Império: o arco do portão quebrado entre as torres, com a inscrição dourada no ático, a via de basalto
  // passando por baixo, um cipreste e, lá dentro, o brilho violeta da escadaria do templo.
  gates: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="ga-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa0c8"/><stop offset="1" stop-color="#f0dcae"/></linearGradient>
      <radialGradient id="ga-luz" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#c9a2ff"/><stop offset="1" stop-color="#9a6ae0" stop-opacity="0"/></radialGradient>
      <clipPath id="ga-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#ga-roda)">
      <rect width="48" height="48" fill="url(#ga-ceu)"/>
      <path d="M0 36Q12 33 24 35T48 34V48H0Z" fill="#7d9442"/>
      <path d="M8 46L21 33H27L40 46Z" fill="#5f6670"/>
      <path d="M12 45h24M15 42h18M18 39h12" stroke="#454b54" stroke-width="0.6"/>
      <circle cx="24" cy="31" r="6" fill="url(#ga-luz)"/>
      <path d="M5 36V14H15V36Z" fill="#c4a876"/>
      <path d="M33 36V14H43V36Z" fill="#b39566"/>
      <path d="M5 14V11.5H7V14M9 14V11.5H11V14M13 14V11.5H15V14M33 14V11.5H35V14M37 14V11.5H39V14M41 14V11.5H43V14" fill="#c4a876"/>
      <path d="M15 36V24Q24 13 33 24V36H30V25Q24 18 18 25V36Z" fill="#d2c09a"/>
      <path d="M15 16H30L31.5 19H15Z" fill="#e2dccb"/>
      <path d="M31.5 19L30 16L33 14.5L32 18Z" fill="#d2c09a"/>
      <path d="M17 17.5h2M20 17.5h1.5M22.5 17.5h2M25.5 17.5h1.5M28 17.5h1.5" stroke="#d8a838" stroke-width="0.9"/>
      <path d="M5 22h10M33 22h10M5 29h10M33 29h10" stroke="#a85a3a" stroke-width="0.8"/>
      <path d="M8 26v4M12 26v4M36 26v4M40 26v4" stroke="#3a2c20" stroke-width="0.9"/>
      <path d="M44.5 36Q42 26 44.5 15Q47 26 44.5 36Z" fill="#3a5e3a"/>
      <path d="M5 36Q6 28 9 24M7 36Q9 30 12 28" stroke="#3f6e2c" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#c4a876" stroke-width="1.5"/>
  </svg>`,
  // Mesas de Solária: platôs de arenito em camadas ao entardecer, um cânion estreito entre eles, o pilar de pedra
  // com a pedra-chapéu e a casa escavada na rocha com a porta escura.
  mesas: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="me-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a62"/><stop offset="0.6" stop-color="#e0805a"/><stop offset="1" stop-color="#f6c07a"/></linearGradient>
      <clipPath id="me-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#me-roda)">
      <rect width="48" height="48" fill="url(#me-ceu)"/>
      <circle cx="36" cy="14" r="4.5" fill="#ffd9a0"/>
      <path d="M0 18H17V48H0Z" fill="#b0603c"/>
      <path d="M0 18H17V20.5H0Z" fill="#e2a070"/>
      <path d="M0 25H17V27.5H0ZM0 32H17V33.5H0Z" fill="#d9a070"/>
      <path d="M0 29H17V30.5H0ZM0 37H17V39H0Z" fill="#7e3e2a"/>
      <path d="M13 18H17V48H13Z" fill="#7e3e2a" opacity="0.55"/>
      <path d="M6 33.5h4v5.5h-4Z" fill="#2a120c"/><path d="M6 33.5q2-2 4 0" fill="#2a120c"/>
      <path d="M27 22H48V48H27Z" fill="#a8583a"/>
      <path d="M27 22H48V24.5H27Z" fill="#e2a070"/>
      <path d="M27 29H48V31H27ZM27 38H48V40H27Z" fill="#7e3e2a"/>
      <path d="M27 33H48V35H27Z" fill="#d9a070"/>
      <path d="M17 48V30L20 28L24 30L27 28V48Z" fill="#5e2a1e" opacity="0.6"/>
      <path d="M19.5 40V31Q21.5 29 23.5 31V40Z" fill="#b0603c"/>
      <ellipse cx="21.5" cy="30" rx="3.6" ry="1.4" fill="#c98858"/>
      <path d="M0 42Q12 40 24 43T48 42V48H0Z" fill="#cf9564"/>
      <path d="M8 45Q14 44 20 45.5M28 46Q34 45 40 46" stroke="#a8643c" stroke-width="0.8" fill="none" stroke-linecap="round"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#e0805a" stroke-width="1.5"/>
  </svg>`,
  // Bosque Velho: a mata fechada em copas redondas, um carvalho velho na frente com o tronco grosso e as raízes, a
  // trilha de terra entrando na clareira e o sol passando pela copa.
  oldwood: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="ow-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8d07a"/><stop offset="1" stop-color="#5e8a36"/></linearGradient>
      <clipPath id="ow-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#ow-roda)">
      <rect width="48" height="48" fill="url(#ow-ceu)"/>
      <circle cx="6" cy="14" r="7" fill="#2e5a26"/><circle cx="15" cy="10" r="7" fill="#3e6e2a"/><circle cx="40" cy="12" r="8" fill="#2e5a26"/>
      <circle cx="47" cy="20" r="7" fill="#3e6e2a"/><circle cx="2" cy="24" r="6" fill="#3e6e2a"/>
      <path d="M0 36Q24 32 48 36V48H0Z" fill="#6c9a3c"/>
      <path d="M18 48Q22 40 30 37Q34 36 36 34" stroke="#9a7650" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M22.5 38V26h4V38Q28 40 31 40.5H18Q21 40 22.5 38Z" fill="#6a4e36"/>
      <path d="M25 26h1.5V38Q27 39.5 29 40H26Z" fill="#4a3424"/>
      <circle cx="17" cy="20" r="7" fill="#3e6e2a"/><circle cx="31" cy="19" r="7.5" fill="#3e6e2a"/>
      <circle cx="24" cy="14" r="8.5" fill="#5c8e30"/><circle cx="21" cy="11.5" r="3" fill="#8ab84a"/>
      <circle cx="29" cy="22" r="4" fill="#2e5a26"/>
      <path d="M8 2L16 30M34 0L40 26" stroke="#fff6c8" stroke-width="2.5" opacity="0.25"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#7aa84a" stroke-width="1.5"/>
  </svg>`,
  // Fortaleza Orc: o castelo no alto do esporão de rocha, com a torre de menagem e o estandarte preto da mão vermelha,
  // a ponte de pedra cruzando o desfiladeiro e o vale azul de névoa lá embaixo, com o brilho de uma fogueira.
  fortress: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="fo-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e9cb8"/><stop offset="1" stop-color="#d9d2c0"/></linearGradient>
      <linearGradient id="fo-vale" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d7488"/><stop offset="1" stop-color="#2a3644"/></linearGradient>
      <radialGradient id="fo-fogo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#f08a26" stop-opacity="0"/></radialGradient>
      <clipPath id="fo-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#fo-roda)">
      <rect width="48" height="48" fill="url(#fo-ceu)"/>
      <rect y="30" width="48" height="18" fill="url(#fo-vale)"/>
      <path d="M0 40Q10 37 20 41T48 39" stroke="#8fb4c8" stroke-width="1.2" fill="none" opacity="0.7"/>
      <path d="M11 48L14 30L12 24H36L34 30L38 48Z" fill="#6e665c"/>
      <path d="M14 30L12 24H24V48H11Z" fill="#8a8074"/>
      <path d="M13 27h22M14 31h20M15 36h18M16 41h16" stroke="#4e473f" stroke-width="0.6"/>
      <path d="M12 24h24" stroke="#7d9442" stroke-width="1.6"/>
      <path d="M14 24V17H34V24Z" fill="#c4a876"/>
      <path d="M14 17V15H16V17M18 17V15H20V17M22 17V15H24V17M26 17V15H28V17M30 17V15H32V17" fill="#c4a876"/>
      <path d="M19 24V9H29V24Z" fill="#b39566"/>
      <path d="M19 9V7H21V9M23 9V7H25V9M27 9V7H29V9" fill="#b39566"/>
      <path d="M22 24V20Q24 18 26 20V24Z" fill="#1c1614"/>
      <path d="M21.5 13h1.2v3h-1.2zM25.3 13h1.2v3h-1.2z" fill="#1c1614"/>
      <path d="M31 17V3" stroke="#5a4030" stroke-width="0.9"/>
      <path d="M31 3.5H38.5L37 6.5L38.5 9.5H31Z" fill="#2a2420"/>
      <circle cx="34.6" cy="6.5" r="1.3" fill="#c8402a"/>
      <circle cx="36" cy="22" r="3" fill="url(#fo-fogo)"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#b7c4cf" stroke-width="1.5"/>
  </svg>`,
  // Coração da Mata: escuro, a árvore do coração com o oco que brilha, cogumelos frios e vaga-lumes.
  heartwood: `<svg viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <radialGradient id="hw-luz" cx="0.5" cy="0.55" r="0.6"><stop offset="0" stop-color="#2f5e48"/><stop offset="1" stop-color="#0c1a14"/></radialGradient>
      <clipPath id="hw-roda"><circle cx="24" cy="24" r="22"/></clipPath>
    </defs>
    <g clip-path="url(#hw-roda)">
      <rect width="48" height="48" fill="url(#hw-luz)"/>
      <path d="M0 38Q24 34 48 38V48H0Z" fill="#24463a"/>
      <path d="M19 40Q21 30 20 22H28Q27 30 29 40Q33 42 38 42H10Q15 42 19 40Z" fill="#4a3c32"/>
      <path d="M25 22H28Q27 30 29 40Q31 41 33 41.5H27Z" fill="#33281f"/>
      <ellipse cx="23.5" cy="31" rx="2.2" ry="3.2" fill="#62f0d2"/>
      <ellipse cx="23.5" cy="31" rx="4" ry="5.5" fill="#62f0d2" opacity="0.25"/>
      <circle cx="14" cy="16" r="8" fill="#22463a"/><circle cx="34" cy="15" r="8.5" fill="#22463a"/>
      <circle cx="24" cy="11" r="9" fill="#2f5e48"/><circle cx="20" cy="8.5" r="3" fill="#3a5e6a"/>
      <path d="M9 41v-3M12 41v-2.5" stroke="#d6e0f2" stroke-width="1.2"/>
      <ellipse cx="9" cy="37.6" rx="2.2" ry="1.2" fill="#7a4aa6"/><ellipse cx="12" cy="38.4" rx="1.8" ry="1" fill="#62f0d2"/>
      <circle cx="38" cy="28" r="0.9" fill="#9affea"/><circle cx="8" cy="26" r="0.8" fill="#9affea"/><circle cx="33" cy="34" r="0.7" fill="#9affea"/>
    </g>
    <circle cx="24" cy="24" r="22" fill="none" stroke="#3a8a74" stroke-width="1.5"/>
  </svg>`,
};

// --- Sala de espera -------------------------------------------------------

const portraits = new Map<string, string>();

function portrait(classId: ClassId) {
  if (!portraits.has(classId)) portraits.set(classId, heroPoses(classId, undefined, ["down"]).toDataURL());
  const img = el("img", "slot-portrait");
  img.src = portraits.get(classId)!;
  img.alt = "";
  return img;
}

/**
 * Desenha as vagas do mapa (`partySize`): quem já entrou (o líder primeiro, os bots por último) e as vagas livres.
 * O líder põe um bot numa vaga livre tocando na classe, e tira no ✕.
 */
/**
 * Sala de espera. `classOpen`: a classe está aberta na conta de quem vê (o bot de uma classe trancada não aparece; o
 * servidor também recusa).
 */
export function renderWaitingRoom(room: DungeonRoom, classOpen: (id: ClassId) => boolean = () => true) {
  const { players, leaderId } = room.state;
  const isLeader = leaderId === room.sessionId;
  const rank = (id: string) => (id === leaderId ? 0 : players.get(id)?.bot ? 2 : 1);
  const ids = [...players.keys()].sort((a, b) => rank(a) - rank(b));
  const size = partySize(MAPS[mapIdOf(room.state.mapId)]);
  const list = $("lobby-slots");
  list.replaceChildren();
  for (let i = 0; i < size; i++) {
    const id = ids[i];
    const p = id ? players.get(id) : undefined;
    const slot = el("li", p ? "slot filled" : "slot open");
    if (p) {
      const classId = (p.classId in CLASSES ? p.classId : "knight") as ClassId;
      const info = el("div", "slot-info");
      info.append(el("strong", "", p.name), el("small", "muted", CLASSES[classId].name));
      slot.append(portrait(classId), info);
      if (id === leaderId) slot.append(el("span", "slot-tag", "👑 Líder"));
      else if (p.bot) slot.append(el("span", "slot-tag", "🤖 Bot"));
      else if (id === room.sessionId) slot.append(el("span", "slot-tag", "Você"));
      if (id === room.sessionId) slot.classList.add("me");
      if (p.bot && isLeader) {
        const remove = el("button", "slot-remove", "✕");
        remove.type = "button";
        remove.setAttribute("aria-label", `Tirar ${p.name}`);
        remove.onclick = () => room.send(MSG.removeBot, { id } satisfies RemoveBotMessage);
        slot.append(remove);
      }
    } else if (isLeader) {
      slot.classList.add("bot-slot");
      const picks = el("div", "bot-picks");
      for (const classId of CLASS_IDS.filter(classOpen)) {
        const pick = el("button", "bot-pick");
        pick.type = "button";
        pick.setAttribute("aria-label", `Pôr um bot ${CLASSES[classId].name}`);
        pick.append(portrait(classId), el("small", "", CLASSES[classId].name));
        pick.onclick = () => room.send(MSG.addBot, { classId } satisfies AddBotMessage);
        picks.append(pick);
      }
      slot.append(el("span", "muted", "Vaga livre · espere um amigo ou ponha um bot 🤖"), picks);
    } else {
      slot.append(el("span", "slot-portrait empty", "+"), el("span", "muted", "Vaga livre · aguardando jogador…"));
    }
    list.append(slot);
  }

  const count = players.size;
  const bots = [...players.values()].filter((p) => p.bot).length;
  const humans = count - bots;
  const start = $<HTMLButtonElement>("start");
  start.hidden = !isLeader;
  start.textContent = count === 1
    ? "Começar sozinho"
    : `Começar hunt · ${humans} ${humans === 1 ? "jogador" : "jogadores"}${bots > 0 ? ` + ${bots} ${bots === 1 ? "bot" : "bots"}` : ""}`;
  $("lobby-wait").hidden = isLeader;
  $("lobby-hint").textContent = size === 1
    ? "Este mapa é só para jogar sozinho."
    : count >= size
      ? bots > 0 ? "Equipe completa. Bots não levam loot nem gold: o que eles matam não rende nada." : "Equipe completa."
      : isLeader
        ? "Seus amigos acham esta sala em Batalhas, no cenário dela ou em Salas abertas. Bots seguem você e lutam, mas não levam loot nem gold."
        : "O líder decide quando a hunt começa.";
}

function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
