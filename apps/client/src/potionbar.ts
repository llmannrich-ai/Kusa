import {
  CAMP_VENDOR_POTIONS, CAMP_VENDOR_PRICES, CAMP_VENDOR_RADIUS, MSG, POTIONS, POTIONS_BY_STAT, POTION_FIELD, POTION_MAX,
  pickPotion, tileDistance, type PotionId, type PotionStat,
} from "@kusa/shared";
import { itemIcon } from "./art/items.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";

interface PotionView {
  button: HTMLButtonElement;
  icon: HTMLImageElement;
  count: HTMLElement;
  tier: HTMLElement;
  key: string;
}

/** Qual nível cada botão bebe: "auto" escolhe sozinho (`pickPotion`); um id trava aquele nível. Vale a sessão toda. */
const modes: Record<PotionStat, "auto" | PotionId> = { hp: "auto", mana: "auto" };
const ROMAN = ["", "I", "II", "III"];
/** Quanto tempo segurando o botão troca o nível em vez de beber. */
const HOLD_MS = 420;

const icons = new Map<PotionId, string>();
function iconSrc(id: PotionId) {
  if (!icons.has(id)) icons.set(id, itemIcon(id).toDataURL());
  return icons.get(id)!;
}

/**
 * Botões das poções na coluna ao lado das magias: um de vida e um de mana, cada um com os três níveis (pequena, média e
 * grande). Tocar bebe; no automático vai a menor que cobre o que falta (ou a maior que houver). Segurar troca o nível:
 * automático → cada nível que você tem → automático. O número é o total daquele recurso; o selo, o nível que vai agora.
 * A recarga é compartilhada. O servidor valida tudo; aqui só mandamos a intenção.
 */
export class PotionBar {
  private views: Record<PotionStat, PotionView>;
  private tip: HTMLElement;
  private tipTimer = 0;
  /** Fim da recarga em `performance.now()`. */
  private readyAt = 0;
  private cooldownMs = 1;

  constructor(private room: DungeonRoom, private container: HTMLElement) {
    this.views = { hp: this.makeButton("hp"), mana: this.makeButton("mana") };
    this.tip = document.createElement("span");
    this.tip.className = "potion-tip";
    this.tip.hidden = true;
    container.append(this.views.hp.button, this.views.mana.button, this.tip);
  }

  /** Bebe pelo teclado (Q e E) ou pelo botão. */
  press(stat: PotionStat) {
    const p = this.me();
    if (!p || p.status !== "playing") return;
    const potion = this.next(p, stat);
    if (potion) this.room.send(MSG.drink, { potion });
  }

  /** Troca o nível do botão: automático → cada nível que o herói tem → automático. */
  cycle(stat: PotionStat) {
    const p = this.me();
    if (!p) return;
    const owned = POTIONS_BY_STAT[stat].filter((id) => p[POTION_FIELD[id]] > 0);
    const order: ("auto" | PotionId)[] = ["auto", ...owned];
    const at = order.indexOf(modes[stat]);
    modes[stat] = order[(at + 1) % order.length];
    const mode = modes[stat];
    const what = stat === "hp" ? "Vida" : "Mana";
    this.showTip(stat, mode === "auto" ? `${what}: automática` : `${what}: ${POTIONS[mode].size.toLowerCase()} (${p[POTION_FIELD[mode]]})`);
    this.views[stat].key = "";
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
    for (const stat of ["hp", "mana"] as const) {
      const view = this.views[stat];
      const ids = POTIONS_BY_STAT[stat];
      const total = ids.reduce((n, id) => n + p[POTION_FIELD[id]], 0);
      const next = this.next(p, stat);
      const state = !next ? "empty" : left > 0 ? "cooldown" : "ready";
      view.button.style.setProperty("--cd", state === "cooldown" ? String(left / this.cooldownMs) : "0");
      const mode = modes[stat];
      const key = `${state}|${total}|${next}|${mode}`;
      if (key === view.key) continue;
      view.key = key;
      view.button.dataset.state = state;
      view.button.dataset.locked = String(mode !== "auto");
      const shown = next ?? (mode !== "auto" ? mode : ids[0]);
      view.icon.src = iconSrc(shown);
      view.count.textContent = String(total);
      view.tier.textContent = ROMAN[POTIONS[shown].tier];
      const counts = ids.map((id) => `${POTIONS[id].size.toLowerCase()} ${p[POTION_FIELD[id]]}`).join(", ");
      const label = `${stat === "hp" ? "Vida" : "Mana"} (${mode === "auto" ? "automática" : POTIONS[mode].size.toLowerCase()}): ${counts}. Segure para trocar o nível.`;
      view.button.setAttribute("aria-label", label);
      view.button.title = label;
    }
  }

  destroy() {
    window.clearTimeout(this.tipTimer);
    this.container.replaceChildren();
  }

  /** A poção que o botão bebe agora (null = nenhuma). Nível travado que acabou volta para o automático. */
  private next(p: PlayerView, stat: PotionStat): PotionId | null {
    const mode = modes[stat];
    if (mode !== "auto") {
      if (p[POTION_FIELD[mode]] > 0) return mode;
      modes[stat] = "auto";
    }
    const missing = stat === "hp" ? p.maxHp - p.hp : p.maxMana - p.mana;
    return pickPotion(stat, missing, (id) => p[POTION_FIELD[id]]);
  }

  private showTip(stat: PotionStat, text: string) {
    this.tip.textContent = text;
    this.tip.dataset.stat = stat;
    this.tip.hidden = false;
    window.clearTimeout(this.tipTimer);
    this.tipTimer = window.setTimeout(() => { this.tip.hidden = true; }, 1400);
  }

  private me(): PlayerView | undefined {
    return this.room.state.players.get(this.room.sessionId);
  }

  private makeButton(stat: PotionStat): PotionView {
    const button = document.createElement("button");
    button.className = `action potion potion-${stat}`;
    const icon = document.createElement("img");
    icon.className = "potion-icon";
    icon.src = iconSrc(POTIONS_BY_STAT[stat][0]);
    icon.alt = "";
    const count = document.createElement("small");
    count.className = "potion-count";
    const tier = document.createElement("small");
    tier.className = "potion-tier";
    button.append(icon, count, tier);
    // Toque curto bebe (ao soltar); segurar troca o nível e não bebe.
    let timer = 0;
    let down = false;
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture?.(e.pointerId);
      down = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { down = false; this.cycle(stat); }, HOLD_MS);
    });
    button.addEventListener("pointerup", () => {
      window.clearTimeout(timer);
      if (down) this.press(stat);
      down = false;
    });
    button.addEventListener("pointercancel", () => { window.clearTimeout(timer); down = false; });
    button.addEventListener("contextmenu", (e) => e.preventDefault());
    return { button, icon, count, tier, key: "" };
  }
}

/**
 * Painel do vendedor do acampamento (terreno de caça): aparece quando o herói encosta na banca (`Dungeon.vendor`) e
 * mostra o preço de cada poção em loot e quanto loot ele carrega. O servidor valida a compra (`Hunt.buyPotion`).
 */
export class VendorPanel {
  private buttons: Partial<Record<PotionId, HTMLButtonElement>>;
  private loot: HTMLElement;
  private key = "";

  constructor(private room: DungeonRoom, private container: HTMLElement, private vendor: { x: number; y: number } | undefined) {
    const title = document.createElement("span");
    title.className = "vendor-title";
    title.textContent = "Vendedor";
    this.loot = document.createElement("span");
    this.loot.className = "vendor-loot";
    this.buttons = Object.fromEntries(CAMP_VENDOR_POTIONS.map((id) => [id, this.makeButton(id)])) as Partial<Record<PotionId, HTMLButtonElement>>;
    container.replaceChildren(title, ...CAMP_VENDOR_POTIONS.map((id) => this.buttons[id]!), this.loot);
  }

  update() {
    const p = this.me();
    const near = !!p && !!this.vendor && p.status === "playing" && tileDistance(p.x, p.y, this.vendor.x, this.vendor.y) <= CAMP_VENDOR_RADIUS;
    const key = near ? `${p!.loot}|${CAMP_VENDOR_POTIONS.map((id) => p![POTION_FIELD[id]]).join("|")}` : "";
    if (key === this.key) return;
    this.key = key;
    this.container.hidden = !near;
    if (!near) return;
    this.loot.textContent = `💰 ${p!.loot}`;
    for (const id of CAMP_VENDOR_POTIONS) {
      this.buttons[id]!.disabled = p!.loot < (CAMP_VENDOR_PRICES[id] ?? Infinity) || p![POTION_FIELD[id]] >= POTION_MAX;
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
    icon.src = iconSrc(id);
    icon.alt = POTIONS[id].name;
    const price = document.createElement("span");
    price.textContent = String(CAMP_VENDOR_PRICES[id]);
    button.append(icon, price);
    button.title = `${POTIONS[id].name}: ${CAMP_VENDOR_PRICES[id]} de loot`;
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); this.room.send(MSG.buyPotion, { potion: id }); });
    return button;
  }
}
