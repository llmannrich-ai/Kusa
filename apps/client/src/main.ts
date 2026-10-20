import * as Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import { CLASSES, CLASS_IDS, MAX_LEVEL, MSG, xpForLevel, type ClassId, type JoinOptions, type RunEndedMessage } from "@kusa/shared";
import { DungeonScene } from "./DungeonScene.ts";
import { createHunt, joinHunt, type DungeonRoom } from "./net.ts";
import "./style.css";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const show = (id: string, visible: boolean) => { $(id).hidden = !visible; };

// --- Menu ---------------------------------------------------------------

const classFieldset = $("classes");
for (const id of CLASS_IDS) {
  const c = CLASSES[id];
  const option = document.createElement("label");
  option.className = "class-option";
  option.innerHTML = `<input type="radio" name="class" value="${id}" ${id === "knight" ? "checked" : ""} />
    <span class="swatch" style="background:#${c.color.toString(16).padStart(6, "0")}"></span>${c.name}`;
  classFieldset.append(option);
}

const nameInput = $<HTMLInputElement>("name");
nameInput.value = localStorageGet("kusa:name") ?? "";

function joinOptions(): JoinOptions {
  const name = nameInput.value.trim() || "Aventureiro";
  localStorageSet("kusa:name", name);
  const classId = (document.querySelector<HTMLInputElement>('input[name="class"]:checked')?.value ?? "knight") as ClassId;
  return { name, classId };
}

async function enter(connect: () => Promise<DungeonRoom>) {
  show("menu-error", false);
  void goFullscreenPortrait();
  try {
    bindRoom(await connect());
  } catch (err) {
    $("menu-error").textContent = `Não foi possível entrar: ${(err as Error).message}`;
    show("menu-error", true);
  }
}

$("create").onclick = () => enter(() => createHunt(joinOptions()));
$("join").onclick = () => enter(() => joinHunt($<HTMLInputElement>("code").value, joinOptions()));
$("back").onclick = () => location.reload();

// --- Sala ---------------------------------------------------------------

let game: Phaser.Game | null = null;

function bindRoom(room: DungeonRoom) {
  show("menu", false);
  show("lobby", true);
  $("lobby-code").textContent = room.roomId;
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

  callbacks.listen("phase", (phase) => {
    if (phase === "running" && !game) startGame(room);
  });

  callbacks.listen("timeLeft", (t: number) => {
    const timer = $("timer");
    timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    timer.classList.toggle("low", t <= 30);
  });

  room.onMessage(MSG.runEnded, (msg: RunEndedMessage) => showResult(msg));
}

function startGame(room: DungeonRoom) {
  show("lobby", false);
  show("hud", true);
  show("actions", true);
  show("help", true);
  // O canvas tem a resolução real da tela (pixels do aparelho) e o CSS o reduz de volta:
  // com o zoom alto da câmera, cada pixel da arte vira um bloco quase uniforme, sem borrão.
  const parent = $("game");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    // Joystick com um polegar enquanto o outro toca em alvos e botões.
    input: { activePointers: 3 },
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    scene: [],
  });
  const g = game;
  window.addEventListener("resize", () => g.scale.resize(parent.clientWidth * dpr, parent.clientHeight * dpr));
  game.scene.add("dungeon", DungeonScene, true, { room });

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
  show("help", false);
  $("result-title").textContent = OUTCOME_TEXT[msg.outcome];
  $("result-detail").textContent = msg.loot > 0
    ? `Saiu com ${msg.loot} de loot no nível ${msg.level}.`
    : `Todo o loot ficou para trás. Nível alcançado: ${msg.level}.`;
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
