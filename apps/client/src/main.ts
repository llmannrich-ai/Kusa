import * as Phaser from "phaser";
import { Callbacks, CloseCode } from "@colyseus/sdk";
import {
  ITEMS,
  MAPS,
  MAX_LEVEL,
  MSG,
  RULES_VERSION,
  SPELLS,
  VERSION_MISMATCH_CODE,
  difficultyStars,
  itemColor,
  mapIdOf,
  xpForLevel,
  type JoinOptions,
  type RunEndedMessage,
} from "@kusa/shared";
import { ArtLoader, artReady } from "./ArtLoader.ts";
import { itemIcon } from "./art/items.ts";
import { DungeonScene } from "./DungeonScene.ts";
import { AuthError, accessToken, currentAccount, signIn, signOut, signUp, type Account } from "./auth.ts";
import { createMapId, mapLine, renderMapPicker, renderWaitingRoom } from "./lobby.ts";
import { Hub } from "./menu.ts";
import { createHunt, joinHunt, watchHunts, type DungeonRoom, type HuntListing } from "./net.ts";
import { renderRules } from "./rules.ts";
import { SETTING_DEFS, loadSettings, saveSetting } from "./settings.ts";
import { createSoloHunt } from "./solo.ts";
import { renderTelemetry } from "./telemetry.ts";
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
  void hub.open(acc.username, acc.gold);
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
  create.textContent = on ? "Conectando… (o servidor pode levar 1 min para acordar)" : `Criar sala · ${MAPS[createMapId()].name}`;
  create.disabled = on;
  const solo = $<HTMLButtonElement>("solo");
  solo.textContent = `Jogar sozinho · ${MAPS[createMapId()].name}`;
  solo.disabled = on;
  $<HTMLButtonElement>("rooms-back").disabled = on;
  document.querySelectorAll<HTMLButtonElement>("#room-list button").forEach((b) => { b.disabled = on; });
}

/**
 * Cliente e servidor em versões diferentes gerariam mapas diferentes. Se o servidor é mais novo, recarrega a
 * página com `?v=` na URL (fura o cache do index.html); se o cliente é que está na frente, o servidor ainda
 * está terminando o deploy e basta esperar.
 */
function onVersionMismatch(message: string) {
  const server = Number(/servidor v(\d+)/.exec(message)?.[1] ?? 0);
  if (server <= RULES_VERSION) {
    showError("O servidor está sendo atualizado. Tente de novo em 1 ou 2 minutos.");
    return;
  }
  // Já recarregou para esta versão e ela ainda não chegou (cache da hospedagem): não entra em loop.
  if (new URLSearchParams(location.search).get("v") === String(server)) {
    showError("Versão nova do jogo ainda chegando. Aguarde um minuto e recarregue a página.");
    return;
  }
  showError("Versão nova do jogo: atualizando…");
  location.replace(`${location.pathname}?v=${server}`);
}

// --- Lista de salas -------------------------------------------------------

let unwatch: (() => void) | null = null;

function stopWatching() {
  unwatch?.();
  unwatch = null;
}

async function openRooms() {
  show("menu", false);
  show("rooms", true);
  show("rooms-error", false);
  setEntering(false);
  renderMapPicker(() => setEntering(entering));
  renderHunts([]);
  try {
    unwatch = await watchHunts(renderHunts);
    // Saiu da tela (voltou ou entrou numa sala) antes de a lista conectar.
    if ($("rooms").hidden) stopWatching();
  } catch (err) {
    showError(`Servidor indisponível: ${(err as Error).message}`);
  }
}

function renderHunts(hunts: HuntListing[]) {
  const list = $("room-list");
  list.innerHTML = "";
  for (const hunt of hunts) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "room";
    button.disabled = entering;
    const map = MAPS[mapIdOf(hunt.metadata?.mapId)];
    const title = document.createElement("span");
    title.textContent = `Hunt de ${hunt.metadata?.leader ?? "?"}`;
    const where = document.createElement("small");
    where.className = "muted";
    where.textContent = `${map.icon} ${map.name} ${difficultyStars(map.difficulty)}`;
    title.append(where);
    // Sem um "Entrar" visível, o card parecia só informação e ninguém tocava nele.
    const join = document.createElement("span");
    join.className = "room-join";
    const count = document.createElement("small");
    count.className = "muted";
    count.textContent = `${hunt.clients}/${hunt.maxClients} jogadores`;
    join.append("Entrar ›", count);
    button.append(title, join);
    button.onclick = () => enter(async () => joinHunt(hunt.roomId, await joinOptions()));
    li.append(button);
    list.append(li);
  }
  show("rooms-empty", hunts.length === 0);
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
    toggle.onchange = () => saveSetting(def.key, toggle.checked);
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

// Subpáginas das configurações: Telemetria e Regras, para qualquer jogador logado.
const SETTINGS_PAGES: Record<string, (root: HTMLElement) => void> = {
  telemetry: (root) => renderTelemetry(root),
  rules: (root) => renderRules(root),
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
  show("rooms", false);
  show("menu", true);
};
$("create").onclick = () => enter(async () => createHunt(await joinOptions()));
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
  show("rooms", false);
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
    $("result-detail").textContent += ` Equipamento guardado: ${msg.items.map((id) => ITEMS[id]?.name ?? id).join(", ")}.`;
  }
  if (account && msg.bag.length > 0) {
    $("result-detail").textContent += ` Bag para o cofre: ${msg.bag.map((id) => ITEMS[id]?.name ?? id).join(", ")}`
      + ` (com o cofre cheio, o resto fica na bag).`;
  }
  if (msg.note) $("result-detail").textContent += ` ${msg.note}`;
  showLost(msg);
  renderSpellProgress(msg);
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
    name.textContent = ITEMS[id]?.name ?? id;
    if (ITEMS[id]) name.style.color = `#${itemColor(id).toString(16).padStart(6, "0")}`;
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
  if (!matchMedia("(pointer: coarse)").matches) return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("portrait");
  } catch {
    // Navegador não permite: segue normal.
  }
}

function localStorageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function localStorageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
