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
  show("help", true);
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [],
  });
  game.scene.add("dungeon", DungeonScene, true, { room });

  const me = () => room.state.players.get(room.sessionId);
  const renderStats = () => {
    const p = me();
    if (!p) return;
    const xp = p.level >= MAX_LEVEL ? `${p.xp}` : `${p.xp}/${xpForLevel(p.level + 1)}`;
    $("stats").textContent = `Nv ${p.level} · XP ${xp} · HP ${p.hp}/${p.maxHp} · Mana ${p.mana}/${p.maxMana} · Loot ${p.loot}`;
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

function showResult(msg: RunEndedMessage) {
  show("hud", false);
  show("help", false);
  $("result-title").textContent = OUTCOME_TEXT[msg.outcome];
  $("result-detail").textContent = msg.loot > 0
    ? `Saiu com ${msg.loot} de loot no nível ${msg.level}.`
    : `Todo o loot ficou para trás. Nível alcançado: ${msg.level}.`;
  show("result", true);
}

function localStorageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function localStorageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
