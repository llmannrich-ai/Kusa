import {
  BAG_SIZE, CLASSES, ITEMS, ITEM_SLOTS, MSG, RUNES, RUNE_SLOTS, SLOT_NAMES, canUse, lootColor, lootName, runeEffect, type ClassId, type ItemSlot,
} from "@kusa/shared";
import { itemIcon } from "./art/items.ts";
import { itemEffect, itemLabel, statList } from "./menu.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";

/** Item escolhido no menu: uma posição da bag, um slot do corpo ou uma runa equipada. */
type Selection = { bag: number } | { slot: ItemSlot } | { rune: number } | null;

/** Ícones gerados uma vez por item. */
const iconUrls = new Map<string, string>();
function iconUrl(id: string) {
  if (!iconUrls.has(id)) iconUrls.set(id, itemIcon(id).toDataURL());
  return iconUrls.get(id)!;
}

function rarityColor(id: string) {
  return ITEMS[id] || RUNES[id] ? `#${lootColor(id).toString(16).padStart(6, "0")}` : "";
}

/**
 * Bag da hunt (até `BAG_SIZE` itens). No HUD aparecem só os itens da bag; tocar nela abre o menu,
 * o único lugar onde aparece o equipamento vestido. No menu, tocar num item mostra o que ele faz e
 * as ações (equipar, guardar, largar). O servidor valida tudo; aqui só mandamos a intenção.
 */
export class BagBar {
  private selected: Selection = null;
  /** null até o primeiro desenho: a bag vazia também precisa aparecer. */
  private hudKey: string | null = null;
  private menuKey = "";

  constructor(private room: DungeonRoom, private hud: HTMLElement, private menu: HTMLElement) {
    hud.hidden = false;
    hud.addEventListener("click", this.toggle);
    menu.addEventListener("click", this.onMenuClick);
  }

  get isOpen() {
    return !this.menu.hidden;
  }

  /** Abre ou fecha o menu (toque na bag do HUD ou B no desktop). */
  toggle = () => {
    this.menu.hidden = !this.menu.hidden;
    this.selected = null;
    this.menuKey = "";
    this.update();
  };

  close() {
    if (!this.isOpen) return;
    this.toggle();
  }

  update() {
    const p = this.me();
    if (!p) return;
    const bag = [...p.bag];
    const hudKey = bag.join(",");
    if (hudKey !== this.hudKey) {
      this.hudKey = hudKey;
      this.renderHud(bag);
    }
    if (p.status !== "playing") {
      this.close();
      return;
    }
    if (!this.isOpen) return;
    // A posição selecionada pode ter mudado (pegou, largou, trocou): some se não existe mais.
    const sel = this.selected;
    if (sel && "bag" in sel && sel.bag >= bag.length) this.selected = null;
    if (sel && "slot" in sel && !p[sel.slot]) this.selected = null;
    const menuKey = `${hudKey}|${ITEM_SLOTS.map((s) => p[s]).join(",")}|${[...p.runes].join(",")}|${JSON.stringify(this.selected)}`;
    if (menuKey === this.menuKey) return;
    this.menuKey = menuKey;
    this.renderMenu(p, bag);
  }

  destroy() {
    this.hud.removeEventListener("click", this.toggle);
    this.menu.removeEventListener("click", this.onMenuClick);
    this.hud.replaceChildren();
    this.hud.hidden = true;
    this.menu.replaceChildren();
    this.menu.hidden = true;
  }

  private me(): PlayerView | undefined {
    return this.room.state.players.get(this.room.sessionId);
  }

  /** Fileira compacta do HUD: uma casa por espaço da bag. */
  private renderHud(bag: string[]) {
    // A bag vinda do cofre pode passar de BAG_SIZE (raro): mostra tudo, e cheia fica vermelha (nada sai do chão).
    const cells = Math.max(BAG_SIZE, bag.length);
    this.hud.style.gridTemplateColumns = `repeat(${cells}, minmax(0, 1fr))`;
    this.hud.replaceChildren(...Array.from({ length: cells }, (_, i) => this.cell(bag[i], "bag-hud-cell", "", "span")));
    this.hud.classList.toggle("cheia", bag.length >= BAG_SIZE);
    const label = `Bag: ${bag.length} de ${BAG_SIZE} (toque para abrir)`;
    this.hud.setAttribute("aria-label", label);
    this.hud.title = label;
  }

  private renderMenu(p: PlayerView, bag: string[]) {
    const head = el("div", "bag-head");
    head.append(el("strong", "", `🎒 Bag ${bag.length}/${BAG_SIZE}`));
    const close = el("button", "icon-button", "✕");
    close.dataset.action = "close";
    close.setAttribute("aria-label", "Fechar");
    head.append(close);

    const gear = el("div", "bag-gear");
    for (const slot of ITEM_SLOTS) {
      const cell = this.cell(p[slot], "bag-cell", SLOT_NAMES[slot]);
      cell.dataset.slot = slot;
      if (this.isSelected({ slot })) cell.classList.add("selected");
      gear.append(cell);
    }

    // Runas equipadas no menu: valem a hunt inteira e não se trocam aqui.
    const runes = el("div", "bag-gear bag-runes");
    for (let i = 0; i < RUNE_SLOTS; i++) {
      const cell = this.cell(p.runes[i], "bag-cell", "Runa");
      if (p.runes[i]) cell.dataset.rune = String(i);
      if (this.isSelected({ rune: i })) cell.classList.add("selected");
      runes.append(cell);
    }

    const grid = el("div", "bag-grid");
    for (let i = 0; i < Math.max(BAG_SIZE, bag.length); i++) {
      const cell = this.cell(bag[i], "bag-cell");
      // A classe não usa (arma de outra classe, armadura de guerra num feiticeiro): só serve para vender.
      if (bag[i] && !canUse(bag[i], p.classId as ClassId)) cell.classList.add("unusable");
      if (bag[i]) cell.dataset.bag = String(i);
      if (this.isSelected({ bag: i })) cell.classList.add("selected");
      grid.append(cell);
    }

    this.menu.replaceChildren(head, el("h3", "", "Equipado"), gear, el("h3", "", "Runas"), runes, el("h3", "", "Bag"), grid, this.details(p, bag));
  }

  /** O que o item selecionado faz, comparado com o vestido, e as ações. */
  private details(p: PlayerView, bag: string[]) {
    const box = el("div", "bag-details");
    const sel = this.selected;
    const id = sel ? ("bag" in sel ? bag[sel.bag] : "rune" in sel ? p.runes[sel.rune] ?? "" : p[sel.slot]) : "";
    const rune = RUNES[id];
    if (sel && rune) {
      const name = el("strong", "", rune.name);
      name.style.color = rarityColor(id);
      box.append(name, el("small", "muted", `${rune.icon} ${rune.master ? "Runa Mestra" : "Runa"} · ${runeEffect(rune)}`));
      if ("bag" in sel) {
        box.append(el("small", "muted", "Runas se equipam no menu Itens, fora da hunt."));
        const actions = el("div", "bag-actions");
        actions.append(button("Largar", "drop"));
        box.append(actions);
      } else {
        box.append(el("small", "muted", "Equipada: vale até o fim da hunt e volta com você, mesmo se morrer."));
      }
      return box;
    }
    const def = ITEMS[id];
    if (!sel || !def) {
      box.append(el("p", "muted", bag.length > 0 || ITEM_SLOTS.some((s) => p[s])
        ? "Toque num item para ver e trocar."
        : "Itens pegos na dungeon aparecem aqui. Quem sai vivo leva tudo para o inventário."));
      return box;
    }
    const name = el("strong", "", def.name);
    name.style.color = rarityColor(id);
    box.append(name, el("small", "muted", itemLabel(def)), statList(def));
    const actions = el("div", "bag-actions");
    if ("bag" in sel) {
      const worn = ITEMS[p[def.slot]];
      if (worn) box.append(el("small", "muted", `Vestido: ${worn.name} (${itemEffect(worn)})`));
      const usable = canUse(def.id, p.classId as ClassId);
      if (!usable) box.append(el("small", "warn", `${CLASSES[p.classId as ClassId].name} não usa: leve para vender ou para outra classe.`));
      actions.append(button("Equipar", "equip", true, !usable), button("Largar", "drop"));
    } else {
      const full = bag.length >= BAG_SIZE;
      actions.append(button(full ? "Bag cheia" : "Guardar na bag", "unequip", !full, full));
      if (full) box.append(el("small", "muted", "Largue um item da bag para abrir espaço."));
    }
    box.append(actions);
    return box;
  }

  private isSelected(s: NonNullable<Selection>) {
    return JSON.stringify(s) === JSON.stringify(this.selected);
  }

  private cell(id: string | undefined, className: string, emptyLabel = "", tag: "button" | "span" = "button") {
    const cell = el(tag, className);
    if (id && (ITEMS[id] || RUNES[id])) {
      const img = el("img", "item-img");
      img.src = iconUrl(id);
      img.alt = lootName(id);
      cell.append(img);
      cell.style.borderColor = rarityColor(id);
      cell.title = lootName(id);
    } else {
      cell.classList.add("vazio");
      if (emptyLabel) cell.append(el("small", "muted", emptyLabel));
    }
    return cell;
  }

  private onMenuClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!target) return;
    const action = target.dataset.action;
    const sel = this.selected;
    if (action === "close") return this.close();
    if (action === "equip" && sel && "bag" in sel) this.room.send(MSG.bagEquip, { index: sel.bag });
    else if (action === "drop" && sel && "bag" in sel) this.room.send(MSG.bagDrop, { index: sel.bag });
    else if (action === "unequip" && sel && "slot" in sel) this.room.send(MSG.unequip, { slot: sel.slot });
    else if (target.dataset.bag !== undefined) this.select({ bag: Number(target.dataset.bag) });
    else if (target.dataset.rune !== undefined) this.select({ rune: Number(target.dataset.rune) });
    else if (target.dataset.slot && this.me()?.[target.dataset.slot as ItemSlot]) this.select({ slot: target.dataset.slot as ItemSlot });
    else return;
    // Depois de uma ação o item muda de lugar: limpa a seleção.
    if (action) this.selected = null;
    this.menuKey = "";
    this.update();
  };

  private select(s: NonNullable<Selection>) {
    this.selected = this.isSelected(s) ? null : s;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(text: string, action: string, primary = false, disabled = false) {
  const b = el("button", primary ? "primary" : "", text);
  b.dataset.action = action;
  b.disabled = disabled;
  return b;
}
