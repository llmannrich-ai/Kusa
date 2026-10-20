import { MSG, POTIONS, POTION_FIELD, POTION_IDS, POTION_MAX, type PotionId } from "@kusa/shared";
import { itemIcon } from "./art/items.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";

interface PotionView {
  button: HTMLButtonElement;
  count: HTMLElement;
  key: string;
}

/**
 * Botões das poções (vida e mana), na coluna ao lado das magias. Mostram quantas restam e a
 * recarga, que é compartilhada entre os dois tipos. O servidor valida tudo; aqui só mandamos a intenção.
 */
export class PotionBar {
  private views: Record<PotionId, PotionView>;
  /** Fim da recarga em `performance.now()`. */
  private readyAt = 0;
  private cooldownMs = 1;

  constructor(private room: DungeonRoom, private container: HTMLElement) {
    this.views = Object.fromEntries(POTION_IDS.map((id) => [id, this.makeButton(id)])) as Record<PotionId, PotionView>;
    container.append(...POTION_IDS.map((id) => this.views[id].button));
  }

  /** Bebe pelo teclado (Q e E) ou pelo botão. */
  press(potion: PotionId) {
    const p = this.me();
    if (!p || p.status !== "playing" || p[POTION_FIELD[potion]] <= 0) return;
    this.room.send(MSG.drink, { potion });
  }

  /** O servidor confirmou que bebemos: começa a recarga dos dois botões. */
  onDrank(cooldownMs: number) {
    this.cooldownMs = cooldownMs;
    this.readyAt = performance.now() + cooldownMs;
  }

  update() {
    const p = this.me();
    if (!p) return;
    const left = Math.max(0, this.readyAt - performance.now());
    for (const id of POTION_IDS) {
      const view = this.views[id];
      const count = p[POTION_FIELD[id]];
      const state = count <= 0 ? "empty" : left > 0 ? "cooldown" : "ready";
      view.button.style.setProperty("--cd", state === "cooldown" ? String(left / this.cooldownMs) : "0");
      const key = `${state}|${count}`;
      if (key === view.key) continue;
      view.key = key;
      view.button.dataset.state = state;
      view.count.textContent = String(count);
      const label = `${POTIONS[id].name}: ${count} de ${POTION_MAX}`;
      view.button.setAttribute("aria-label", label);
      view.button.title = label;
    }
  }

  destroy() {
    this.container.replaceChildren();
  }

  private me(): PlayerView | undefined {
    return this.room.state.players.get(this.room.sessionId);
  }

  private makeButton(id: PotionId): PotionView {
    const button = document.createElement("button");
    button.className = "action potion";
    const icon = document.createElement("img");
    icon.className = "potion-icon";
    icon.src = itemIcon(id).toDataURL();
    icon.alt = "";
    const count = document.createElement("small");
    count.className = "potion-count";
    button.append(icon, count);
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); this.press(id); });
    return { button, count, key: "" };
  }
}
