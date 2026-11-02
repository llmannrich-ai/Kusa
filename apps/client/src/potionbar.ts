import { CAMP_VENDOR_PRICES, CAMP_VENDOR_RADIUS, MSG, POTIONS, POTION_FIELD, POTION_IDS, POTION_MAX, tileDistance, type PotionId } from "@kusa/shared";
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

/**
 * Painel do vendedor do acampamento (terreno de caça): aparece quando o herói encosta na banca (`Dungeon.vendor`) e
 * mostra o preço de cada poção em loot e quanto loot ele carrega. O servidor valida a compra (`Hunt.buyPotion`).
 */
export class VendorPanel {
  private buttons: Record<PotionId, HTMLButtonElement>;
  private loot: HTMLElement;
  private key = "";

  constructor(private room: DungeonRoom, private container: HTMLElement, private vendor: { x: number; y: number } | undefined) {
    const title = document.createElement("span");
    title.className = "vendor-title";
    title.textContent = "Vendedor";
    this.loot = document.createElement("span");
    this.loot.className = "vendor-loot";
    this.buttons = Object.fromEntries(POTION_IDS.map((id) => [id, this.makeButton(id)])) as Record<PotionId, HTMLButtonElement>;
    container.replaceChildren(title, ...POTION_IDS.map((id) => this.buttons[id]), this.loot);
  }

  update() {
    const p = this.me();
    const near = !!p && !!this.vendor && p.status === "playing" && tileDistance(p.x, p.y, this.vendor.x, this.vendor.y) <= CAMP_VENDOR_RADIUS;
    const key = near ? `${p!.loot}|${p![POTION_FIELD["potion-health"]]}|${p![POTION_FIELD["potion-mana"]]}` : "";
    if (key === this.key) return;
    this.key = key;
    this.container.hidden = !near;
    if (!near) return;
    this.loot.textContent = `💰 ${p!.loot}`;
    for (const id of POTION_IDS) {
      this.buttons[id].disabled = p!.loot < CAMP_VENDOR_PRICES[id] || p![POTION_FIELD[id]] >= POTION_MAX;
    }
  }

  destroy() {
    this.container.replaceChildren();
    this.container.hidden = true;
  }

  private me(): PlayerView | undefined {
    return this.room.state.players.get(this.room.sessionId);
  }

  private makeButton(id: PotionId): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = "vendor-buy";
    button.type = "button";
    const icon = document.createElement("img");
    icon.src = itemIcon(id).toDataURL();
    icon.alt = POTIONS[id].name;
    const price = document.createElement("span");
    price.textContent = String(CAMP_VENDOR_PRICES[id]);
    button.append(icon, price);
    button.title = `${POTIONS[id].name}: ${CAMP_VENDOR_PRICES[id]} de loot`;
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); this.room.send(MSG.buyPotion, { potion: id }); });
    return button;
  }
}
