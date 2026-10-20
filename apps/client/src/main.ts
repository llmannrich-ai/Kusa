import * as Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import {
  CLASSES,
  ITEMS,
  ITEM_SLOTS,
  MAX_LEVEL,
  MSG,
  SLOT_NAMES,
  TIER_COLORS,
  xpForLevel,
  type ClassId,
  type JoinOptions,
  type RunEndedMessage,
} from "@kusa/shared";
import { itemIcon } from "./art/items.ts";
import { ArtLoader, artReady } from "./ArtLoader.ts";
import { DungeonScene } from "./DungeonScene.ts";
import { AuthError, accessToken, currentAccount, signIn, signOut, signUp, type Account } from "./auth.ts";
import { Hub } from "./menu.ts";
import { createHunt, joinHunt, watchHunts, type DungeonRoom, type HuntListing } from "./net.ts";
import { SETTING_DEFS, loadSettings, saveSetting } from "./settings.ts";
import "./style.css";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (id: string, visible: boolean) => { $(id).hidden = !visible; };

// --- Menu ---------------------------------------------------------------

const hub = new Hub(() => void openRooms());
let account: Account | null = null;

/** O nome vale só no servidor em modo convidado; com Supabase, o servidor usa o do perfil (pelo token). */
async function joinOptions(): Promise<JoinOptions> {
  return { name: account?.username ?? "Aventureiro", classId: hub.classId, accessToken: await accessToken() };
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

async function enter(connect: () => Promise<DungeonRoom>) {
  show("rooms-error", false);
  void goFullscreenPortrait();
  try {
    const room = await connect();
    stopWatching();
    bindRoom(room);
  } catch (err) {
    showError(`Não foi possível entrar: ${(err as Error).message}`);
  }
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
    const title = document.createElement("span");
    title.textContent = `Hunt de ${hunt.metadata?.leader ?? "?"}`;
    const count = document.createElement("span");
    count.className = "muted";
    count.textContent = `${hunt.clients}/${hunt.maxClients}`;
    button.append(title, count);
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

$("rooms-back").onclick = () => {
  stopWatching();
  show("rooms", false);
  show("menu", true);
};
$("create").onclick = () => enter(async () => createHunt(await joinOptions()));
$("back").onclick = () => location.reload();

// --- Sala ---------------------------------------------------------------

let game: Phaser.Game | null = null;

function bindRoom(room: DungeonRoom) {
  show("rooms", false);
  show("lobby", true);
  // A arte começa a carregar já no lobby, enquanto a equipe se junta.
  createGame();
  $("start").onclick = () => room.send(MSG.start);

  const callbacks = Callbacks.get(room);
  const renderLobby = () => {
    const list = $("lobby-players");
    list.innerHTML = "";
    room.state.players.forEach((p, id) => {
      const li = document.createElement("li");
      li.textContent = `${p.name} — ${CLASSES[p.classId as ClassId]?.name ?? p.classId}${id === room.state.leaderId ? " (líder)" : ""}`;
      list.append(li);
    });
    const isLeader = room.state.leaderId === room.sessionId;
    show("start", isLeader);
    show("lobby-wait", !isLeader);
  };
  callbacks.onAdd("players", renderLobby);
  callbacks.onRemove("players", renderLobby);
  callbacks.listen("leaderId", renderLobby);

  let started = false;
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
    $("meta").textContent = `Loot ${p.loot}`;
    renderGear(p);
  };
  renderStats();
  const p = me();
  if (p) Callbacks.get(room).onChange(p, renderStats);
}

/** Ícones do equipamento no HUD (as imagens são geradas uma vez por item). */
const iconUrls = new Map<string, string>();
function renderGear(p: { weapon: string; helmet: string; armor: string; shield: string }) {
  const gear = $("gear");
  const key = ITEM_SLOTS.map((slot) => p[slot]).join(",");
  if (gear.dataset.key === key) return;
  gear.dataset.key = key;
  gear.innerHTML = "";
  for (const slot of ITEM_SLOTS) {
    const item = ITEMS[p[slot]];
    const cell = document.createElement("span");
    cell.className = "slot";
    cell.title = item ? item.name : `${SLOT_NAMES[slot]} (vazio)`;
    if (item) {
      if (!iconUrls.has(item.id)) iconUrls.set(item.id, itemIcon(item.id).toDataURL());
      const img = document.createElement("img");
      img.src = iconUrls.get(item.id)!;
      img.alt = item.name;
      cell.append(img);
      cell.style.borderColor = `#${TIER_COLORS[item.tier].toString(16).padStart(6, "0")}`;
    }
    gear.append(cell);
  }
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
  show("help", false);
  $("result-title").textContent = OUTCOME_TEXT[msg.outcome];
  $("result-detail").textContent = msg.loot > 0
    ? `Saiu com ${msg.loot} de loot no nível ${msg.level}.`
    : `Todo o loot ficou para trás. Nível alcançado: ${msg.level}.`;
  // Só com conta o equipamento volta para o inventário (convidado não salva nada).
  if (account && msg.items.length > 0) {
    $("result-detail").textContent += ` Guardado no inventário: ${msg.items.map((id) => ITEMS[id]?.name ?? id).join(", ")}.`;
  }
  show("result", true);
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
