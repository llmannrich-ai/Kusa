import { CLASSES, MAPS, MAP_IDS, MAX_PARTY_SIZE, difficultyStars, mapIdOf, type ClassId, type MapId } from "@kusa/shared";
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
    const head = el("div", "map-head");
    const title = el("div");
    title.append(el("strong", "", map.name), el("small", "muted", `Dificuldade ${map.difficulty} ${difficultyStars(map.difficulty)} · ${map.durationSeconds / 60} min`));
    head.append(el("span", "map-icon", map.icon), title);
    card.append(head, el("p", "", map.description));
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

/** Desenha as `MAX_PARTY_SIZE` vagas: quem já entrou (o líder primeiro) e as vagas livres. */
export function renderWaitingRoom(room: DungeonRoom) {
  const { players, leaderId } = room.state;
  const ids = [...players.keys()].sort((a, b) => Number(b === leaderId) - Number(a === leaderId));
  const list = $("lobby-slots");
  list.replaceChildren();
  for (let i = 0; i < MAX_PARTY_SIZE; i++) {
    const id = ids[i];
    const p = id ? players.get(id) : undefined;
    const slot = el("li", p ? "slot filled" : "slot open");
    if (p) {
      const classId = (p.classId in CLASSES ? p.classId : "knight") as ClassId;
      const info = el("div", "slot-info");
      info.append(el("strong", "", p.name), el("small", "muted", CLASSES[classId].name));
      slot.append(portrait(classId), info);
      if (id === leaderId) slot.append(el("span", "slot-tag", "👑 Líder"));
      else if (id === room.sessionId) slot.append(el("span", "slot-tag", "Você"));
      if (id === room.sessionId) slot.classList.add("me");
    } else {
      slot.append(el("span", "slot-portrait empty", "+"), el("span", "muted", "Vaga livre · aguardando jogador…"));
    }
    list.append(slot);
  }

  const isLeader = leaderId === room.sessionId;
  const count = players.size;
  const start = $<HTMLButtonElement>("start");
  start.hidden = !isLeader;
  start.textContent = count === 1 ? "Começar sozinho" : `Começar hunt · ${count} jogadores`;
  $("lobby-wait").hidden = isLeader;
  $("lobby-hint").textContent = count >= MAX_PARTY_SIZE
    ? "Equipe completa."
    : isLeader
      ? "Seus amigos acham esta sala em Jogar → Salas abertas. Você pode começar agora ou esperar."
      : "O líder decide quando a hunt começa.";
}

function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
