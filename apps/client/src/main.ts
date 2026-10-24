import * as Phaser from "phaser";
import { Callbacks, CloseCode } from "@colyseus/sdk";
import {
  lootColor,
  lootName,
  MAPS,
  MAX_LEVEL,
  MSG,
  SPELLS,
  VERSION_MISMATCH_CODE,
  MONSTERS,
  difficultyStars,
  itemColor,
  mainBoss,
  mapIdOf,
  partySize,
  xpForLevel,
  type JoinOptions,
  type MapId,
  type RunEndedMessage,
} from "@kusa/shared";
import { RULES_VERSION } from "virtual:rules-version";
import { ArtLoader, artReady } from "./ArtLoader.ts";
import { itemIcon } from "./art/items.ts";
import { DungeonScene } from "./DungeonScene.ts";
import { AuthError, accessToken, currentAccount, signIn, signOut, signUp, type Account } from "./auth.ts";
import { createHostedRoom, joinHostedRoom, myRecruit, type HostedRoom } from "./hosted.ts";
import { heroSheet } from "./art/heroes.ts";
import { MAP_ART, SERVER_CHOICES, chooseMap, createMapId, createServer, mapLine, renderServerPicker, renderWaitingRoom } from "./lobby.ts";
import { renderCatalog } from "./catalog.ts";
import { renderHistory } from "./history.ts";
import { Hub } from "./menu.ts";
import { createHunt, joinHunt, watchHunts, type DungeonRoom, type HuntListing } from "./net.ts";
import { watchHostedRooms, type HostedListing } from "./p2p.ts";
import { renderRules } from "./rules.ts";
import { SETTING_DEFS, loadSettings, saveSetting } from "./settings.ts";
import { createSoloHunt, flushPendingSolo } from "./solo.ts";
import { renderTelemetry } from "./telemetry.ts";
import { WORLD_POINTS, createWorldMap, type WorldMapView } from "./worldMap.ts";
import "./style.css";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (id: string, visible: boolean) => { $(id).hidden = !visible; };

// --- Menu ---------------------------------------------------------------

const hub = new Hub(() => void openRooms());
let account: Account | null = null;

/** O nome vale só no servidor em modo convidado; com Supabase, o servidor usa o do perfil (pelo token). */
async function joinOptions(): Promise<JoinOptions> {
  return {
    name: account?.username ?? "Aventureiro", classId: hub.classId, mapId: createMapId(),
    rulesVersion: RULES_VERSION, accessToken: await accessToken(),
  };
}

// --- Login ----------------------------------------------------------------

const loginName = $<HTMLInputElement>("login-name");
const loginPassword = $<HTMLInputElement>("login-password");
loginName.value = localStorageGet("kusa:login") ?? "";

function showMenu(acc: Account) {
  account = acc;
  show("login", false);
  show("menu", true);
  // Resultado de hunt solo que ficou no aparelho (a rede caiu no fim) é gravado antes de mostrar a conta.
  void flushPendingSolo().finally(() => hub.open(acc.username, acc.gold));
}

function showLogin() {
  account = null;
  loginPassword.value = "";
  show("login-error", false);
  show("menu", false);
  show("login", true);
  (loginName.value ? loginPassword : loginName).focus();
}

async function submitLogin(action: typeof signIn) {
  const buttons = [$<HTMLButtonElement>("sign-in"), $<HTMLButtonElement>("sign-up")];
  buttons.forEach((b) => { b.disabled = true; });
  show("login-error", false);
  try {
    const acc = await action(loginName.value, loginPassword.value);
    localStorageSet("kusa:login", loginName.value.trim());
    loginPassword.value = "";
    showMenu(acc);
  } catch (err) {
    $("login-error").textContent = err instanceof AuthError ? err.message : "Sem conexão. Tente de novo.";
    show("login-error", true);
  } finally {
    buttons.forEach((b) => { b.disabled = false; });
  }
}

// Enter no teclado (ou "ir" no celular) envia o formulário = Entrar.
$<HTMLFormElement>("login").onsubmit = (e) => { e.preventDefault(); void submitLogin(signIn); };
$("sign-up").onclick = () => void submitLogin(signUp);
$("sign-out").onclick = async () => {
  await signOut();
  show("settings", false);
  showLogin();
};

currentAccount().then((acc) => (acc ? showMenu(acc) : showLogin()), showLogin);

function showError(message: string) {
  $("rooms-error").textContent = message;
  show("rooms-error", true);
}

/**
 * Conectando ou já dentro de uma sala. Com o servidor acordando (até 1 min no Render free), cada toque
 * repetido em "Criar sala" abria outra hunt: o celular ficava com várias partidas ao mesmo tempo e travava.
 */
let entering = false;
let joined = false;

async function enter(connect: () => Promise<DungeonRoom>) {
  if (entering || joined) return;
  setEntering(true);
  show("rooms-error", false);
  void goFullscreenPortrait();
  try {
    const room = await connect();
    joined = true;
    stopWatching();
    bindRoom(room);
  } catch (err) {
    if ((err as { code?: number }).code === VERSION_MISMATCH_CODE) return onVersionMismatch((err as Error).message);
    showError(`Não foi possível entrar: ${(err as Error).message}`);
  } finally {
    setEntering(false);
  }
}

/** Trava os botões da lista de salas enquanto a conexão não termina. */
function setEntering(on: boolean) {
  entering = on;
  const create = $<HTMLButtonElement>("create");
  const server = SERVER_CHOICES[createServer()];
  create.textContent = on ? "Conectando…" : "Criar sala";
  create.setAttribute("aria-label", on ? "Conectando" : `Criar sala, ${server.name}`);
  // Mapa só para 1 jogador: não tem sala para amigos, só o "Jogar sozinho".
  const soloOnly = partySize(MAPS[createMapId()]) === 1;
  show("sheet-create", !soloOnly);
  show("create", !soloOnly);
  show("sheet-wait", on && !soloOnly && createServer() === "cloud");
  create.disabled = on || soloOnly;
  const solo = $<HTMLButtonElement>("solo");
  solo.textContent = on && !soloOnly ? "Conectando…" : "Jogar sozinho";
  solo.disabled = on;
  $<HTMLButtonElement>("rooms-back").disabled = on;
  document.querySelectorAll<HTMLButtonElement>(".room-list button").forEach((b) => { b.disabled = on; });
}

/**
 * Cliente e servidor em versões diferentes gerariam mapas diferentes. A versão é um hash (`rulesVersion.ts`), sem
 * "mais nova": recarrega a página uma vez com `?v=` (fura o cache do index.html). Se depois disso continua diferente,
 * o servidor ainda está terminando o deploy (ou a hospedagem ainda entrega o cliente velho): basta esperar.
 */
function onVersionMismatch(message: string) {
  const server = /regras ([0-9a-f]+)/.exec(message)?.[1] ?? "";
  if (!server || new URLSearchParams(location.search).get("v") === server) {
    showError("O jogo está sendo atualizado. Aguarde 1 ou 2 minutos e recarregue a página.");
    return;
  }
  showError("Versão nova do jogo: atualizando…");
  location.replace(`${location.pathname}?v=${server}`);
}

// --- Lista de salas -------------------------------------------------------

let unwatch: (() => void) | null = null;
let unwatchHosted: (() => void) | null = null;
/** Salas abertas: as da nuvem (lobby do Colyseus) e as hospedadas por jogadores (Realtime do Supabase). */
let cloudHunts: HuntListing[] = [];
let hostedHunts: HostedListing[] = [];

function stopWatching() {
  unwatch?.();
  unwatch = null;
  unwatchHosted?.();
  unwatchHosted = null;
}

let world: WorldMapView | null = null;
let toastTimer = 0;

/** Aviso curto sobre o mapa (toque numa terra em névoa). */
function toast(message: string) {
  $("world-toast").textContent = message;
  show("world-toast", true);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => show("world-toast", false), 3500);
}

/** Tocar num ponto do mapa: o herói anda até ele pela trilha e a ficha do cenário sobe. Tocar de novo pula a caminhada. */
function pickPoint(id: MapId) {
  if (entering) return;
  if (world?.walkingTo() === id) return world.skip();
  chooseMap(id);
  // A ficha cobre a parte de baixo: o mapa rola com o herói e o ponto para à vista acima dela.
  world?.select(id, { anchor: 0.4 });
  openSheet();
}

/** Ficha do cenário escolhido: dados do mapa, jogar sozinho, criar sala e as salas abertas dele. */
function openSheet() {
  const map = MAPS[createMapId()];
  $("sheet-icon").innerHTML = MAP_ART[map.id];
  $("sheet-name").textContent = map.name;
  $("sheet-region").textContent = WORLD_POINTS[map.id].region;
  const boss = mainBoss(map);
  // Só o básico, em etiquetas curtas: a ficha fica baixa e o mapa continua à vista.
  const chips = [
    difficultyStars(map.difficulty),
    `⏱ ${map.durationSeconds / 60} min`,
    partySize(map) === 1 ? "👤 só 1" : `👥 até ${partySize(map)}`,
    ...(boss ? [`☠ ${MONSTERS[boss].name}`] : []),
  ];
  $("sheet-chips").replaceChildren(...chips.map((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  }));
  show("rooms-sheet", false);
  show("map-sheet", true);
  $("map-sheet").scrollTop = 0;
  setEntering(entering);
  renderHunts();
}

/**
 * Batalhas abre o mapa com a barra de abas do menu embaixo (`body.on-map`): o menu continua aberto, mas só a barra
 * aparece, e tocar numa aba fecha o mapa e abre a aba.
 */
function setMapOpen(open: boolean) {
  document.body.classList.toggle("on-map", open);
  show("rooms", open);
  if (!open) return;
  show("menu", true);
  const tabs = document.querySelector<HTMLElement>(".hub-tabs");
  if (tabs) document.body.style.setProperty("--tabs-h", `${tabs.offsetHeight}px`);
}

async function openRooms() {
  setMapOpen(true);
  show("rooms-error", false);
  show("map-sheet", false);
  show("rooms-sheet", false);
  world ??= createWorldMap($("world-view"), MAP_ART, pickPoint, toast);
  world.setHero(heroSheet(hub.classId).toDataURL());
  world.select(createMapId(), { instant: true });
  // O ponto um pouco abaixo do meio: em cima ficam o título e o botão das salas.
  world.focus(createMapId());
  setEntering(false);
  renderServerPicker(() => setEntering(entering));
  cloudHunts = [];
  hostedHunts = [];
  renderHunts();
  // As salas hospedadas aparecem mesmo com o servidor de jogo dormindo.
  unwatchHosted = watchHostedRooms((rooms) => { hostedHunts = rooms; renderHunts(); });
  try {
    const stop = await watchHunts((hunts) => { cloudHunts = hunts; renderHunts(); });
    // Saiu da tela (voltou ou entrou numa sala) antes de a lista conectar.
    if ($("rooms").hidden) stop();
    else unwatch = stop;
  } catch (err) {
    showError(`Servidor indisponível: ${(err as Error).message}`);
  }
}

interface OpenRoom {
  leader: string;
  mapId: MapId;
  clients: number;
  maxClients: number;
  server: (typeof SERVER_CHOICES)[keyof typeof SERVER_CHOICES];
  join: () => Promise<DungeonRoom>;
}

/** Salas abertas nas duas listas (todas e as do cenário da ficha) e o selo de cada ponto do mapa. */
function renderHunts() {
  const rooms: OpenRoom[] = [
    ...cloudHunts.map((h) => ({
      leader: h.metadata?.leader ?? "?", mapId: mapIdOf(h.metadata?.mapId), clients: h.clients, maxClients: h.maxClients,
      server: SERVER_CHOICES.cloud, join: async () => joinHunt(h.roomId, await joinOptions()),
    })),
    ...hostedHunts.map((h) => ({
      leader: h.leader, mapId: mapIdOf(h.mapId), clients: h.clients, maxClients: h.maxClients, server: SERVER_CHOICES.device,
      join: async () => {
        stopWatching();
        return joinHostedRoom(h.roomId, h.hostPeer, mapIdOf(h.mapId), await myRecruit(account?.username ?? "Aventureiro", hub.classId));
      },
    })),
  ];
  $("room-list").replaceChildren(...rooms.map(roomItem));
  show("rooms-empty", rooms.length === 0);
  const here = rooms.filter((r) => r.mapId === createMapId());
  $("sheet-rooms").replaceChildren(...here.map(roomItem));
  show("sheet-rooms-box", here.length > 0);
  $("open-room-list").textContent = `Salas abertas · ${rooms.length}`;
  const counts: Partial<Record<MapId, number>> = {};
  for (const r of rooms) counts[r.mapId] = (counts[r.mapId] ?? 0) + 1;
  world?.setRoomCounts(counts);
}

function roomItem(room: OpenRoom) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.className = "room";
  button.disabled = entering;
  const map = MAPS[room.mapId];
  const title = document.createElement("span");
  title.textContent = `Hunt de ${room.leader}`;
  const badge = document.createElement("span");
  badge.className = "room-badge";
  badge.textContent = room.server.icon;
  badge.title = room.server.name;
  title.append(badge);
  const where = document.createElement("small");
  where.className = "muted";
  where.textContent = `${map.icon} ${map.name} ${difficultyStars(map.difficulty)}`;
  title.append(where);
  // Sem um "Entrar" visível, o card parecia só informação e ninguém tocava nele.
  const join = document.createElement("span");
  join.className = "room-join";
  const count = document.createElement("small");
  count.className = "muted";
  count.textContent = `${room.clients}/${room.maxClients} jogadores`;
  join.append("Entrar ›", count);
  button.append(title, join);
  button.onclick = () => enter(room.join);
  li.append(button);
  return li;
}

// --- Configurações --------------------------------------------------------

function renderSettings() {
  const list = $("settings-list");
  list.innerHTML = "";
  const settings = loadSettings();
  for (const def of SETTING_DEFS) {
    const row = document.createElement("label");
    row.className = "setting";
    const text = document.createElement("span");
    text.textContent = def.label;
    const hint = document.createElement("small");
    hint.textContent = def.hint;
    text.append(hint);
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.role = "switch";
    toggle.checked = settings[def.key];
    toggle.onchange = () => {
      saveSetting(def.key, toggle.checked);
      paintRotate();
      // A arte dos heróis é gerada uma vez e guardada (texturas e retratos): trocar o desenho pede recarregar.
      if (def.key === "newArt") location.reload();
    };
    row.append(text, toggle);
    list.append(row);
  }
}

$("open-settings").onclick = () => {
  renderSettings();
  show("menu", false);
  show("settings", true);
};
$("settings-back").onclick = () => {
  show("settings", false);
  show("menu", true);
};

// Subpáginas das configurações: Telemetria, Histórico, Regras e Catálogo, para qualquer jogador logado.
const SETTINGS_PAGES: Record<string, (root: HTMLElement) => void> = {
  telemetry: (root) => renderTelemetry(root),
  history: (root) => renderHistory(root),
  rules: (root) => renderRules(root),
  catalog: (root) => renderCatalog(root),
};
document.querySelectorAll<HTMLButtonElement>("#settings-pages [data-page]").forEach((button) => {
  const page = button.dataset.page!;
  button.onclick = () => {
    SETTINGS_PAGES[page]($(`${page}-body`));
    show("settings", false);
    show(page, true);
    $(page).scrollTop = 0;
  };
  $(page).querySelector<HTMLButtonElement>(".page-back")!.onclick = () => {
    show(page, false);
    show("settings", true);
  };
});

$("rooms-back").onclick = () => {
  stopWatching();
  setMapOpen(false);
};
// Uma aba do menu tocada com o mapa aberto: sai do mapa (o Hub troca a aba).
document.querySelectorAll<HTMLButtonElement>(".hub-tabs button[data-tab]").forEach((b) => b.addEventListener("click", () => {
  if (!document.body.classList.contains("on-map")) return;
  stopWatching();
  setMapOpen(false);
}));
$("map-sheet-close").onclick = () => show("map-sheet", false);
// Tocar na ficha pula a caminhada do herói.
$("map-sheet").addEventListener("pointerdown", () => world?.skip());
$("rooms-sheet-close").onclick = () => show("rooms-sheet", false);
$("open-room-list").onclick = () => {
  show("map-sheet", false);
  show("rooms-sheet", true);
};
$("create").onclick = () => enter(async () => {
  if (createServer() === "cloud") return createHunt(await joinOptions());
  // Sala hospedada: a hunt roda neste aparelho e os amigos se conectam direto.
  stopWatching();
  return createHostedRoom(await myRecruit(account?.username ?? "Aventureiro", hub.classId), createMapId());
});
// Solo roda no aparelho, sem sala de espera: a hunt começa na hora.
$("solo").onclick = () => enter(async () => {
  const room = await createSoloHunt(account?.username ?? "Aventureiro", hub.classId, createMapId());
  window.setTimeout(() => room.send(MSG.start));
  return room;
});
$("back").onclick = () => location.reload();

// --- Sala ---------------------------------------------------------------

let game: Phaser.Game | null = null;

function bindRoom(room: DungeonRoom) {
  setMapOpen(false);
  show("menu", false);
  show("lobby", true);
  // A arte começa a carregar já na sala de espera, enquanto a equipe se junta.
  createGame();
  $("start").onclick = () => room.send(MSG.start);

  let started = false;
  let left = false;
  // Sair na sala de espera devolve à lista de salas; durante a hunt, sair conta como morte (servidor).
  const backToRooms = async (error?: string) => {
    if (started || left) return;
    left = true;
    joined = false;
    show("lobby", false);
    await openRooms();
    if (error) showError(error);
  };
  // Volta na hora, sem esperar o servidor confirmar: com a conexão ruim do celular a resposta
  // demorava ou nunca vinha, e o botão parecia não funcionar.
  $("lobby-leave").onclick = () => {
    void backToRooms();
    void room.leave();
  };
  room.onLeave((code) => {
    const clean = code === 1000 || code === CloseCode.CONSENTED;
    void backToRooms(clean ? undefined : "A conexão com a sala caiu. Entre de novo.");
  });

  const callbacks = Callbacks.get(room);
  const renderLobby = () => renderWaitingRoom(room);
  callbacks.onAdd("players", renderLobby);
  callbacks.onRemove("players", renderLobby);
  callbacks.listen("leaderId", renderLobby);
  callbacks.listen("mapId", (id: string) => {
    $("lobby-map").textContent = mapLine(mapIdOf(id));
  });

  callbacks.listen("phase", (phase) => {
    if (phase === "running" && !started) {
      started = true;
      startGame(room);
    }
  });

  callbacks.listen("timeLeft", (t: number) => {
    const timer = $("timer");
    timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    timer.classList.toggle("low", t <= 30);
  });

  room.onMessage(MSG.runEnded, (msg: RunEndedMessage) => showResult(msg));
  (room as Partial<HostedRoom>).onReplaced?.((next, hostName) => switchRoom(next, hostName));
}

/**
 * Sala hospedada: o anfitrião saiu e outro jogador assumiu. O estado antigo para de mudar, então a sala de espera
 * ou a dungeon são montadas de novo sobre a sala nova. Quem já saiu da hunt fica no resultado.
 */
function switchRoom(next: HostedRoom, hostName: string) {
  const me = next.state.players.get(next.sessionId);
  if (next.state.phase !== "lobby" && me?.status !== "playing") return;
  game?.scene.remove("dungeon");
  bindRoom(next);
  showToast(`${hostName} agora hospeda a sala`);
}

/** Aviso rápido no topo da tela. */
function showToast(text: string) {
  const toast = $("game-toast");
  toast.textContent = text;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 3000);
}

/** Cria o Phaser (uma vez) com a cena que carrega a arte; a dungeon entra depois, em `startGame`. */
function createGame() {
  if (game) return game;
  // O canvas tem a resolução real da tela (pixels do aparelho) e o CSS o reduz de volta:
  // com o zoom alto da câmera, cada pixel da arte vira um bloco quase uniforme, sem borrão.
  const parent = $("game");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const g = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    // Joystick com um polegar enquanto o outro toca em alvos e botões.
    input: { activePointers: 3 },
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    scene: [ArtLoader],
  });
  window.addEventListener("resize", () => g.scale.resize(parent.clientWidth * dpr, parent.clientHeight * dpr));
  game = g;
  return g;
}

function startGame(room: DungeonRoom) {
  inHunt = true;
  enterHuntLayout();
  show("lobby", false);
  show("hud", true);
  show("actions", true);
  show("potions", true);
  show("help", true);
  const g = createGame();
  // Se a hunt começou antes de a arte terminar de chegar, a dungeon entra assim que ela chegar.
  void artReady.then(() => g.scene.add("dungeon", DungeonScene, true, { room }));

  const me = () => room.state.players.get(room.sessionId);
  const renderStats = () => {
    const p = me();
    if (!p) return;
    const xpFrom = xpForLevel(p.level);
    const xpTo = p.level >= MAX_LEVEL ? p.xp : xpForLevel(p.level + 1);
    setBar("hp", p.hp, p.maxHp, `${p.hp}/${p.maxHp}`);
    setBar("mana", p.mana, p.maxMana, `${p.mana}/${p.maxMana}`);
    setBar("xp", p.xp - xpFrom, xpTo - xpFrom, `Nv ${p.level}`);
    // A bag e o equipamento ficam com a BagBar (fileira no HUD e menu da bag).
    $("meta").textContent = `Loot ${p.loot}`;
  };
  renderStats();
  const p = me();
  if (p) Callbacks.get(room).onChange(p, renderStats);
}

const OUTCOME_TEXT: Record<RunEndedMessage["outcome"], string> = {
  escaped: "Você fugiu da dungeon!",
  completed: "Dungeon concluída!",
  died: "Você morreu.",
  buried: "A dungeon desabou sobre você.",
};

/** Preenche uma barra do HUD (`.bar.<name>`). */
function setBar(name: "hp" | "mana" | "xp", value: number, max: number, text: string) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 1;
  document.querySelector<HTMLElement>(`.bar.${name} i`)!.style.width = `${ratio * 100}%`;
  $(`${name}-text`).textContent = text;
}

function showResult(msg: RunEndedMessage) {
  show("hud", false);
  show("actions", false);
  show("potions", false);
  show("help", false);
  $("result-title").textContent = OUTCOME_TEXT[msg.outcome];
  $("result-detail").textContent = msg.loot > 0
    ? `Saiu com ${msg.loot} de loot no nível ${msg.level}.`
    : `Todo o loot ficou para trás. Nível alcançado: ${msg.level}.`;
  // Só com conta o equipamento e a bag voltam (convidado não salva nada).
  if (account && msg.items.length > 0) {
    $("result-detail").textContent += ` Equipamento guardado: ${msg.items.map(lootName).join(", ")}.`;
  }
  if (account && msg.bag.length > 0) {
    $("result-detail").textContent += ` Bag para o cofre: ${msg.bag.map(lootName).join(", ")}`
      + ` (com o cofre cheio, o resto fica na bag).`;
  }
  if (msg.note) $("result-detail").textContent += ` ${msg.note}`;
  showLost(msg);
  renderSpellProgress(msg);
  // "Voltar ao menu" recarrega a página: espera o banco gravar para não cortar a gravação.
  ($("back") as HTMLButtonElement).disabled = !!msg.saving;
  show("result", true);
}

/** Na morte, destaca o que ficou no chão: o equipamento sorteado do corpo e a bag inteira. */
function showLost(msg: RunEndedMessage) {
  const lost = [
    ...(msg.lost ? [{ id: msg.lost, from: "do corpo" }] : []),
    ...(msg.lostBag ?? []).map((id) => ({ id, from: "da bag" })),
  ];
  const list = $("result-lost-list");
  list.replaceChildren(...lost.map(({ id, from }) => {
    const li = document.createElement("li");
    const icon = document.createElement("img");
    icon.src = itemIcon(id).toDataURL();
    icon.alt = "";
    const name = document.createElement("span");
    // Runas da bag também se perdem (as equipadas não).
    name.textContent = lootName(id);
    name.style.color = `#${lootColor(id).toString(16).padStart(6, "0")}`;
    const where = document.createElement("small");
    where.textContent = from;
    li.append(icon, name, where);
    return li;
  }));
  show("result-lost", lost.length > 0);
}

/** Quanto cada magia escolhida evoluiu com o uso (só a conta guarda; o nível novo vale na próxima hunt). */
function renderSpellProgress(msg: RunEndedMessage) {
  const list = $("result-spells");
  list.replaceChildren();
  for (const s of msg.spells) {
    const spell = SPELLS[s.id as keyof typeof SPELLS];
    if (!spell) continue;
    const parts = [`${spell.icon} ${spell.name}: +${s.gained} XP`];
    if (s.lost > 0) parts.push(`−${s.lost} pela morte`);
    parts.push(s.level > s.levelBefore ? `subiu para o nível ${s.level}!` : s.level < s.levelBefore ? `caiu para o nível ${s.level}` : `nível ${s.level}`);
    const li = document.createElement("li");
    li.textContent = parts.join(" · ");
    if (s.level !== s.levelBefore) li.className = s.level > s.levelBefore ? "up" : "down";
    list.append(li);
  }
  if (!account && msg.spells.length > 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "Convidado: entre na conta para suas magias subirem de nível.";
    list.append(li);
  }
  list.hidden = list.childElementCount === 0;
}

/** No celular, tela cheia e trava na vertical (Android; o iOS ignora e mostra o aviso de girar). */
async function goFullscreenPortrait() {
  await lockOrientation("portrait");
}

/**
 * Tela cheia e trava a orientação no celular (Android). O iOS não trava: o jogador gira o aparelho, e o aviso
 * de girar (`#rotate`) só some na orientação certa.
 */
async function lockOrientation(orientation: "portrait" | "landscape") {
  if (!matchMedia("(pointer: coarse)").matches) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.(orientation);
  } catch {
    // Navegador não permite: segue normal.
  }
}

/**
 * Jogar deitado (beta, nas configurações): da largada da hunt até o resultado, o jogo ocupa a tela deitada
 * (`body.deitado` em style.css) e o Android vira sozinho. Em pé, o mesmo jogo continua valendo.
 */
let inHunt = false;

/**
 * Aviso de celular deitado (`#rotate`): antes só pedia para voltar à vertical, e quem testava deitado achava que o
 * jogo não tinha esse modo. Agora oferece ligar o Jogar deitado ali mesmo e explica que os menus ficam em pé.
 */
function paintRotate() {
  const on = loadSettings().landscape;
  $("rotate-text").textContent = on
    ? "Jogar deitado está ligado. Os menus ficam na vertical: gire o celular para escolher a hunt e, ao começar, ela vira deitada sozinha."
    : "O Kusa é feito para a vertical, mas a hunt também pode ser jogada com o celular deitado.";
  $("rotate-landscape").textContent = on ? "Desligar jogar deitado" : "Jogar deitado (beta)";
}

$("rotate-landscape").onclick = () => {
  const on = !loadSettings().landscape;
  saveSetting("landscape", on);
  paintRotate();
  // No meio da hunt, vale na hora (o toque permite a tela cheia e a trava deitada no Android).
  if (on && inHunt) enterHuntLayout();
};
paintRotate();

function enterHuntLayout() {
  if (!loadSettings().landscape) return;
  document.body.classList.add("deitado");
  // O Phaser nasceu na sala de espera, na coluna em pé: mede a tela de novo com o layout deitado.
  window.dispatchEvent(new Event("resize"));
  void lockOrientation("landscape");
}

function localStorageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function localStorageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
