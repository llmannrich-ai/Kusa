import {
  BAG_SIZE, CLASSES, ITEMS, ITEM_SLOTS, MSG, RUNES, RUNE_SLOTS, SLOT_NAMES, canUse, describeStats, isUpgrade, itemScore, lootColor, lootName,
  runeEffect, type ClassId, type ItemSlot,
} from "@kusa/shared";
import { itemIcon, slotGhost } from "./art/items.ts";
import { itemEffect, itemLabel } from "./menu.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";

/** Item escolhido no menu: uma posição da bag, um slot do corpo ou uma runa equipada. */
type Selection = { bag: number } | { slot: ItemSlot } | { rune: number } | null;

/** Ícones gerados uma vez por item. */
const iconUrls = new Map<string, string>();
function iconUrl(id: string) {
  if (!iconUrls.has(id)) iconUrls.set(id, itemIcon(id).toDataURL());
  return iconUrls.get(id)!;
}

/** Silhueta apagada de cada slot vazio do corpo (mostra o que vai ali sem ocupar espaço com texto). */
const ghostUrls = new Map<ItemSlot, string>();
function ghostUrl(slot: ItemSlot) {
  if (!ghostUrls.has(slot)) ghostUrls.set(slot, slotGhost(slot).toDataURL());
  return ghostUrls.get(slot)!;
}

function rarityColor(id: string) {
  return ITEMS[id] || RUNES[id] ? `#${lootColor(id).toString(16).padStart(6, "0")}` : "";
}

/**
 * Bag da hunt (até `BAG_SIZE` itens). No HUD fica só um botão de bag (vermelho quando cheia); tocar nele abre
 * o menu com os itens da bag e o equipamento vestido (o único lugar onde ele aparece). O menu é compacto para não
 * cobrir a hunt: título com as runas, uma fileira com o vestido, uma com a bag (as melhorias marcadas com ▲) e,
 * logo embaixo, o item tocado comparado com o vestido e as ações (equipar, guardar, largar), sem rolagem.
 * Fecha com um toque fora dela (o toque segue para o jogo: andar, atacar, travar alvo), no botão da bag ou com B/Esc.
 * O servidor valida tudo; aqui só mandamos a intenção.
 */
export class BagBar {
  private selected: Selection = null;
  /** null até o primeiro desenho: a bag vazia também precisa aparecer. */
  private hudKey: string | null = null;
  private menuKey = "";
  /** Equipamento vestido no último desenho (null até o primeiro): vestir do chão não muda a fileira da bag. */
  private gearKey: string | null = null;
  private gearFlash = 0;

  constructor(private room: DungeonRoom, private hud: HTMLElement, private menu: HTMLElement) {
    hud.hidden = false;
    hud.addEventListener("click", this.onHudClick);
    menu.addEventListener("click", this.onMenuClick);
    // Captura: chega antes do joystick e do Phaser, que não impedem nada (o toque continua valendo para o jogo).
    document.addEventListener("pointerdown", this.onOutside, true);
  }

  /** Toque fora da bag fecha. O botão da bag do HUD fica de fora: o clique dele já abre e fecha. */
  private onOutside = (e: PointerEvent) => {
    if (!this.isOpen) return;
    const target = e.target as Node | null;
    if (target && (this.menu.contains(target) || this.hud.contains(target))) return;
    this.close();
  };

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

  /** Solta o foco do botão: senão o Espaço (ataque) também "clica" nele e abre/fecha a bag. */
  private onHudClick = () => {
    this.hud.blur();
    this.toggle();
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
      this.renderHud(bag.length);
    }
    // Vestiu um item (pegou do chão ou trocou): a bag do HUD pisca, para lembrar que o vestido fica no menu.
    const gearKey = ITEM_SLOTS.map((s) => p[s]).join(",");
    if (this.gearKey !== null && gearKey !== this.gearKey && p.status === "playing") this.flash();
    this.gearKey = gearKey;
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

  private flash() {
    this.hud.classList.remove("vestiu");
    void this.hud.offsetWidth; // reinicia a animação se vestir de novo antes de ela acabar
    this.hud.classList.add("vestiu");
    clearTimeout(this.gearFlash);
    this.gearFlash = window.setTimeout(() => this.hud.classList.remove("vestiu"), 1200);
  }

  destroy() {
    clearTimeout(this.gearFlash);
    this.hud.removeEventListener("click", this.onHudClick);
    this.menu.removeEventListener("click", this.onMenuClick);
    document.removeEventListener("pointerdown", this.onOutside, true);
    this.hud.replaceChildren();
    this.hud.hidden = true;
    this.menu.replaceChildren();
    this.menu.hidden = true;
  }

  private me(): PlayerView | undefined {
    return this.room.state.players.get(this.room.sessionId);
  }

  /** Botão do HUD: só o ícone. Cheia fica vermelho (nada mais sai do chão); a lotação aparece no menu. */
  private renderHud(count: number) {
    this.hud.replaceChildren(el("span", "bag-button-icon", "🎒"));
    this.hud.classList.toggle("cheia", count >= BAG_SIZE);
    const label = `Bag: ${count} de ${BAG_SIZE} (toque para abrir)`;
    this.hud.setAttribute("aria-label", label);
    this.hud.title = label;
  }

  private renderMenu(p: PlayerView, bag: string[]) {
    const classId = p.classId as ClassId;
    // Título: lotação e as runas equipadas (pequenas: valem a hunt inteira e não se trocam aqui).
    const head = el("div", "bag-head");
    const title = el("strong", "bag-title", `🎒 ${bag.length}/${BAG_SIZE}`);
    title.classList.toggle("cheia", bag.length >= BAG_SIZE);
    const runes = el("div", "bag-runes");
    runes.setAttribute("aria-label", "Runas equipadas");
    for (let i = 0; i < RUNE_SLOTS; i++) {
      const cell = this.cell(p.runes[i], "bag-cell bag-rune");
      if (p.runes[i]) cell.dataset.rune = String(i);
      else cell.disabled = true;
      cell.setAttribute("aria-label", p.runes[i] ? lootName(p.runes[i]) : "Runa vazia");
      if (this.isSelected({ rune: i })) cell.classList.add("selected");
      runes.append(cell);
    }
    head.append(title, runes);

    const gear = el("div", "bag-row bag-gear");
    gear.setAttribute("aria-label", "Vestido");
    for (const slot of ITEM_SLOTS) {
      const cell = this.cell(p[slot], "bag-cell");
      cell.dataset.slot = slot;
      if (!p[slot]) {
        const ghost = el("img", "item-img ghost");
        ghost.src = ghostUrl(slot);
        ghost.alt = "";
        cell.append(ghost);
      }
      cell.setAttribute("aria-label", p[slot] ? `${SLOT_NAMES[slot]}: ${lootName(p[slot])}` : `${SLOT_NAMES[slot]}: vazio`);
      if (this.isSelected({ slot })) cell.classList.add("selected");
      gear.append(cell);
    }

    const grid = el("div", "bag-row bag-grid");
    grid.setAttribute("aria-label", "Bag");
    for (let i = 0; i < Math.max(BAG_SIZE, bag.length); i++) {
      const id = bag[i];
      const cell = this.cell(id, "bag-cell");
      if (id) {
        cell.dataset.bag = String(i);
        // A classe não usa (arma de outra classe, armadura de guerra num feiticeiro): só serve para vender.
        if (ITEMS[id] && !canUse(id, classId)) cell.classList.add("unusable");
        // Melhor que o vestido no mesmo slot: a setinha verde mostra o que vale equipar sem abrir item por item.
        else if (ITEMS[id] && isUpgrade(id, p[ITEMS[id].slot], classId)) {
          cell.classList.add("upgrade");
          cell.append(el("span", "bag-badge", "▲"));
        }
        cell.setAttribute("aria-label", lootName(id));
      } else cell.disabled = true;
      if (this.isSelected({ bag: i })) cell.classList.add("selected");
      grid.append(cell);
    }

    this.menu.replaceChildren(head, el("span", "bag-label", "Vestido"), gear, el("span", "bag-label", "Bag"), grid, this.details(p, bag));
  }

  /** O que o item selecionado faz, comparado com o vestido, e as ações. Fica logo abaixo das fileiras, sempre à vista. */
  private details(p: PlayerView, bag: string[]) {
    const box = el("div", "bag-details");
    const sel = this.selected;
    const id = sel ? ("bag" in sel ? bag[sel.bag] : "rune" in sel ? p.runes[sel.rune] ?? "" : p[sel.slot]) : "";
    const rune = RUNES[id];
    if (sel && rune) {
      box.append(nameLine(id, rune.name), el("small", "muted", `${rune.icon} ${rune.master ? "Runa Mestra" : "Runa"} · ${runeEffect(rune)}`));
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
      box.classList.add("vazio");
      box.append(el("p", "muted", bag.length > 0 || ITEM_SLOTS.some((s) => p[s])
        ? "Toque num item para comparar e trocar."
        : "Itens pegos na dungeon aparecem aqui. Quem sai vivo leva tudo para o inventário."));
      return box;
    }
    const classId = p.classId as ClassId;
    const head = nameLine(id, def.name);
    box.append(head, el("small", "muted", itemLabel(def)), el("small", "bag-stats", describeStats(def.stats).join(" · ") || "Sem atributos"));
    const actions = el("div", "bag-actions");
    if ("bag" in sel) {
      const usable = canUse(def.id, classId);
      const worn = ITEMS[p[def.slot]];
      if (!usable) head.append(el("span", "bag-verdict pior", "Não usa"));
      else if (!worn || isUpgrade(def.id, worn.id, classId)) head.append(el("span", "bag-verdict melhor", "▲ Melhor"));
      else if (itemScore(def.id) < itemScore(worn.id)) head.append(el("span", "bag-verdict pior", "▼ Pior"));
      else head.append(el("span", "bag-verdict", "= Igual"));
      box.append(el("small", "muted", worn ? `Vestido: ${worn.name} (${itemEffect(worn) || "sem atributos"})` : `${SLOT_NAMES[def.slot]} vazio: equipe para usar.`));
      if (!usable) box.append(el("small", "warn", `${CLASSES[classId].name} não usa: leve para vender ou para outra classe.`));
      actions.append(button(worn ? "Trocar" : "Equipar", "equip", true, !usable), button("Largar", "drop"));
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

  private cell(id: string | undefined, className: string) {
    const cell = el("button", className);
    if (id && (ITEMS[id] || RUNES[id])) {
      const img = el("img", "item-img");
      img.src = iconUrl(id);
      img.alt = lootName(id);
      cell.append(img);
      cell.style.borderColor = rarityColor(id);
      cell.title = lootName(id);
    } else {
      cell.classList.add("vazio");
    }
    return cell;
  }

  private onMenuClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!target) return;
    const action = target.dataset.action;
    const sel = this.selected;
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

/** Nome na cor da raridade, com espaço à direita para o veredito (melhor/pior que o vestido). */
function nameLine(id: string, name: string) {
  const line = el("div", "bag-name");
  const strong = el("strong", "", name);
  strong.style.color = rarityColor(id);
  line.append(strong);
  return line;
}

function button(text: string, action: string, primary = false, disabled = false) {
  const b = el("button", primary ? "primary" : "", text);
  b.dataset.action = action;
  b.disabled = disabled;
  return b;
}
