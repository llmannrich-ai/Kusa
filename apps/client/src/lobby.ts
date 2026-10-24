import { CLASSES, CLASS_IDS, MAPS, MAP_IDS, MSG, difficultyStars, mapIdOf, partySize, type AddBotMessage, type ClassId, type MapId, type RemoveBotMessage } from "@kusa/shared";
import { heroPoses } from "./art/heroes.ts";
import type { DungeonRoom } from "./net.ts";

// Telas antes da hunt: a escolha do cenário na criação da sala e a sala de espera com as vagas da equipe.

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

/** Os dois botões de servidor na tela de criar sala; tocar escolhe. `onPick` atualiza o botão de criar. */
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

let chosenMap: MapId = mapIdOf(storageGet("kusa:map"));

/** Cenário das salas que este jogador criar (fica salvo no aparelho). */
export const createMapId = () => chosenMap;

/**
 * Símbolo desenhado (SVG 48×48) no lugar do emoji, para o cenário que tem um. O texto é fixo (não vem de fora),
 * então pode ir por innerHTML.
 */
const MAP_ART: Partial<Record<MapId, string>> = {
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
};

/** Cartões dos cenários na tela de criar sala; tocar escolhe. `onPick` atualiza o botão de criar. */
export function renderMapPicker(onPick: () => void) {
  const list = $("map-list");
  list.replaceChildren();
  for (const id of MAP_IDS) {
    const map = MAPS[id];
    const card = el("button", "map-card");
    card.type = "button";
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", String(id === chosenMap));
    card.classList.toggle("selected", id === chosenMap);
    const solo = partySize(map) === 1;
    card.classList.toggle("solo", solo);
    const icon = el("span", "map-icon");
    const art = MAP_ART[id];
    if (art) icon.innerHTML = art;
    else icon.textContent = map.icon;
    card.append(icon, el("strong", "map-name", map.name));
    if (solo) card.append(el("span", "map-solo", "Single player"));
    card.onclick = () => {
      chosenMap = id;
      storageSet("kusa:map", id);
      renderMapPicker(onPick);
      onPick();
    };
    list.append(card);
  }
}

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
export function renderWaitingRoom(room: DungeonRoom) {
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
      for (const classId of CLASS_IDS) {
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
        ? "Seus amigos acham esta sala em Jogar → Salas abertas. Bots seguem você e lutam, mas não levam loot nem gold."
        : "O líder decide quando a hunt começa.";
}

function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
