import {
  CLASSES,
  CLASS_IDS,
  ITEMS,
  ITEM_BUY_PRICES,
  ITEM_SELL_PRICES,
  ITEM_SLOTS,
  MAPS,
  MAP_IDS,
  SLOT_NAMES,
  SPELLS,
  STARTER_SPELLS,
  TIER_COLORS,
  TIER_NAMES,
  auraBonuses,
  auraText,
  difficultyStars,
  knownSpells,
  mapIdOf,
  statsFor,
  talentBlocker,
  talentCost,
  talentTree,
  type ClassId,
  type ItemDef,
  type MapId,
  type TalentDef,
} from "@kusa/shared";
import { heroSheet } from "./art/heroes.ts";
import { itemIcon } from "./art/items.ts";
import {
  ProfileError,
  buyItem,
  buyTalent,
  equipItem,
  loadProfile,
  sellItem,
  type OwnedItem,
  type Profile,
} from "./profile.ts";

// Menu do jogador depois do login: classes, árvore de magias, inventário e mercado.
// Abas embaixo (zona do polegar), "Jogar" logo acima delas; tudo funciona só com toque.

type Tab = "classes" | "spells" | "items" | "market";

const ROLES: Record<ClassId, string> = {
  knight: "Corpo a corpo. Aguenta a pancada e segura os monstros.",
  paladin: "Ataca de longe com flechas fortes.",
  sorcerer: "Dano em área enorme, mas frágil.",
  druid: "Cura a equipe e prende os monstros.",
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Cria um elemento com classe e texto (sem innerHTML: nada de HTML vindo de dados). */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
const gold = (n: number) => `${n.toLocaleString("pt-BR")} 💰`;

const iconCache = new Map<string, string>();
function itemImg(itemId: string) {
  if (!iconCache.has(itemId)) iconCache.set(itemId, itemIcon(itemId).toDataURL());
  const img = el("img", "item-img");
  img.src = iconCache.get(itemId)!;
  img.alt = ITEMS[itemId]?.name ?? "";
  return img;
}

/** Retrato da classe: primeiro quadro (parado, de frente) da folha de sprites. */
function portrait(classId: ClassId) {
  const key = `hero:${classId}`;
  if (!iconCache.has(key)) {
    const sheet = heroSheet(classId);
    const frame = document.createElement("canvas");
    frame.width = frame.height = sheet.height;
    frame.getContext("2d")!.drawImage(sheet, 0, 0, sheet.height, sheet.height, 0, 0, sheet.height, sheet.height);
    iconCache.set(key, frame.toDataURL());
  }
  const img = el("img", "hero-img");
  img.src = iconCache.get(key)!;
  img.alt = CLASSES[classId].name;
  return img;
}

export class Hub {
  private profile: Profile = { gold: 0, talents: {}, items: [] };
  private tab: Tab = "classes";
  private marketMode: "buy" | "sell" = "buy";
  private busy = false;
  private toastTimer = 0;
  /** Classe escolhida para a próxima hunt (e a árvore aberta na aba de magias). */
  classId: ClassId;
  /** Mapa das hunts que este jogador criar (quem entra numa sala aberta joga o mapa dela). */
  mapId: MapId;
  private treeClass: ClassId;

  constructor(private onPlay: () => void) {
    const saved = storageGet("kusa:class") as ClassId | null;
    this.classId = saved && saved in CLASSES ? saved : "knight";
    this.treeClass = this.classId;
    this.mapId = mapIdOf(storageGet("kusa:map"));
    document.querySelectorAll<HTMLButtonElement>(".hub-tabs button").forEach((b) => {
      b.onclick = () => this.setTab(b.dataset.tab as Tab);
    });
    $("play").onclick = () => this.onPlay();
    $("map-pick").onclick = () => this.openMapSheet();
    $("sheet-backdrop").onclick = () => this.closeSheet();
  }

  /** Abre o menu da conta e busca árvore, inventário e gold. */
  async open(username: string, initialGold: number) {
    $("account-name").textContent = username;
    this.profile = { gold: initialGold, talents: {}, items: [] };
    this.render();
    try {
      this.profile = await loadProfile();
      this.render();
    } catch (err) {
      this.toast(err instanceof ProfileError ? err.message : "Sem conexão. Tente de novo.", true);
    }
  }

  private setTab(tab: Tab) {
    this.tab = tab;
    this.closeSheet();
    this.render();
    $("hub-body").scrollTop = 0;
  }

  private render() {
    $("account-gold").textContent = gold(this.profile.gold);
    $("play").textContent = `Jogar · ${CLASSES[this.classId].name}`;
    const map = MAPS[this.mapId];
    $("map-pick").textContent = `${map.icon} ${map.name} ${difficultyStars(map.difficulty)} · ${map.durationSeconds / 60} min ▾`;
    document.querySelectorAll<HTMLButtonElement>(".hub-tabs button").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.tab === this.tab));
    });
    const body = $("hub-body");
    body.replaceChildren(
      this.tab === "classes" ? this.renderClasses()
        : this.tab === "spells" ? this.renderTree()
          : this.tab === "items" ? this.renderInventory()
            : this.renderMarket(),
    );
  }

  // --- Classes --------------------------------------------------------------

  private renderClasses() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Classes"), el("p", "muted hub-hint", "Toque numa classe para entrar com ela na próxima hunt."));
    const list = el("div", "class-list");
    for (const id of CLASS_IDS) {
      const c = CLASSES[id];
      const bonus = auraBonuses(id, this.profile.talents);
      const base = statsFor(id, 1);
      const boosted = statsFor(id, 1, bonus);
      const card = el("button", "class-card");
      card.classList.toggle("selected", id === this.classId);
      card.style.setProperty("--class-color", hex(c.color));
      card.setAttribute("aria-pressed", String(id === this.classId));

      const head = el("div", "class-head");
      const title = el("div");
      title.append(el("strong", "", c.name), el("small", "muted", ROLES[id]));
      head.append(portrait(id), title);
      if (id === this.classId) head.append(el("span", "badge", "Escolhida"));

      const stats = el("dl", "class-stats");
      const stat = (label: string, value: string, up: boolean) => {
        const dd = el("dd", up ? "up" : "", value);
        stats.append(el("dt", "", label), dd);
      };
      stat("Vida", String(boosted.maxHp), boosted.maxHp > base.maxHp);
      stat("Mana", String(boosted.maxMana), boosted.maxMana > base.maxMana);
      stat("Dano", String(Math.round(boosted.damage)), boosted.damage > base.damage);
      stat("Alcance", c.attackRange === 1 ? "Corpo a corpo" : `${c.attackRange} tiles`, false);

      const known = knownSpells(id, this.profile.talents).length;
      const total = Object.values(SPELLS).filter((s) => s.classId === id).length;
      const foot = el("div", "class-foot");
      foot.append(el("span", "muted", `Magias ${known}/${total}`));
      const tree = el("span", "link", "Árvore de magias ›");
      tree.onclick = (e) => {
        e.stopPropagation();
        this.treeClass = id;
        this.setTab("spells");
      };
      foot.append(tree);

      card.append(head, stats, foot);
      card.onclick = () => {
        this.classId = id;
        this.treeClass = id;
        storageSet("kusa:class", id);
        this.render();
      };
      list.append(card);
    }
    page.append(list);
    return page;
  }

  // --- Árvore de magias -----------------------------------------------------

  private renderTree() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Árvore de magias"));

    const chips = el("div", "chips");
    for (const id of CLASS_IDS) {
      const chip = el("button", "chip", CLASSES[id].name);
      chip.setAttribute("aria-pressed", String(id === this.treeClass));
      chip.onclick = () => { this.treeClass = id; this.render(); };
      chips.append(chip);
    }
    page.append(chips);

    page.append(el("p", "muted hub-hint",
      "Magias de ataque viram opção quando o slot abre na hunt (nível 3 e 8). Áureas valem sempre: mais dano, vida, mana ou velocidade."));

    // As iniciais já vêm de graça; a árvore acrescenta opções e bônus.
    const starters = el("div", "tree-tier");
    starters.append(el("h3", "", "Iniciais"));
    const startGrid = el("div", "tree-grid");
    for (const id of STARTER_SPELLS.filter((s) => SPELLS[s].classId === this.treeClass)) {
      const s = SPELLS[id];
      const node = el("div", "tree-node owned");
      node.append(
        this.nodeHead(s.icon, s.name, `Magia · slot ${s.slot + 1}`),
        el("p", "node-text", s.description),
        el("div", "node-state", "Sempre disponível"),
      );
      startGrid.append(node);
    }
    starters.append(startGrid);
    page.append(starters);

    const tree = talentTree(this.treeClass);
    for (const tier of [1, 2, 3] as const) {
      const section = el("div", "tree-tier");
      section.append(el("h3", "", `Círculo ${tier}`));
      const grid = el("div", "tree-grid");
      for (const def of tree.filter((t) => t.tier === tier)) grid.append(this.renderNode(def));
      section.append(grid);
      page.append(section);
    }
    return page;
  }

  private nodeHead(icon: string, name: string, kind: string) {
    const head = el("div", "node-head");
    const text = el("div");
    text.append(el("strong", "", name), el("small", "muted", kind));
    head.append(el("span", "node-icon", icon), text);
    return head;
  }

  private renderNode(def: TalentDef) {
    const rank = this.profile.talents[def.id] ?? 0;
    const blocker = talentBlocker(def, this.profile.talents);
    const maxed = rank >= def.maxRank;
    const locked = !!blocker && !maxed;
    const node = el("div", "tree-node");
    node.classList.toggle("owned", rank > 0);
    node.classList.toggle("locked", locked);

    const spell = def.spellId ? SPELLS[def.spellId] : null;
    node.append(this.nodeHead(def.icon, def.name, spell ? `Magia · slot ${spell.slot + 1}` : "Áurea"));

    if (def.maxRank > 1) {
      const pips = el("div", "pips");
      pips.setAttribute("aria-label", `Nível ${rank} de ${def.maxRank}`);
      for (let i = 0; i < def.maxRank; i++) pips.append(el("i", i < rank ? "on" : ""));
      node.append(pips);
    }

    let text: string;
    if (spell) text = spell.description;
    else if (maxed) text = auraText(def, rank);
    else text = rank > 0 ? `${auraText(def, rank)} → ${auraText(def, rank + 1)}` : auraText(def, 1);
    node.append(el("p", "node-text", text));
    if (spell) node.append(el("p", "node-meta", `${spell.manaCost} de mana · recarga ${spell.cooldownMs / 1000}s`));

    if (maxed) {
      node.append(el("div", "node-state", spell ? "Aprendida" : "Nível máximo"));
    } else if (locked) {
      node.append(el("div", "node-state", `🔒 ${blocker}`));
    } else {
      const cost = talentCost(def, rank);
      const buy = el("button", "buy", `${rank > 0 ? "Melhorar" : spell ? "Aprender" : "Comprar"} · ${gold(cost)}`);
      buy.disabled = this.profile.gold < cost;
      buy.onclick = () => this.run(async () => {
        this.profile.gold = await buyTalent(def.id);
        this.profile.talents[def.id] = rank + 1;
        this.toast(spell ? `${def.name} aprendida!` : `${def.name} nível ${rank + 1}!`);
      });
      node.append(buy);
    }
    return node;
  }

  // --- Inventário -----------------------------------------------------------

  private renderInventory() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Itens"));
    page.append(el("p", "muted hub-hint",
      "O equipamento escolhido entra com você na hunt. Quem foge traz tudo de volta; quem morre perde o que levou."));

    const loadout = el("div", "loadout");
    for (const slot of ITEM_SLOTS) {
      const owned = this.profile.items.find((i) => i.equipped && ITEMS[i.itemId]?.slot === slot);
      const cell = el("button", "loadout-slot");
      if (owned) {
        cell.append(itemImg(owned.itemId), el("small", "", ITEMS[owned.itemId].name));
        cell.style.borderColor = hex(TIER_COLORS[ITEMS[owned.itemId].tier]);
        cell.onclick = () => this.openItemSheet(owned);
      } else {
        cell.append(el("span", "slot-empty", "＋"), el("small", "muted", SLOT_NAMES[slot]));
        cell.onclick = () => this.toast(`Toque num item do inventário para equipar ${SLOT_NAMES[slot].toLowerCase()}.`);
      }
      loadout.append(cell);
    }
    page.append(el("h3", "", "Para a próxima hunt"), loadout);

    page.append(el("h3", "", `Inventário (${this.profile.items.length})`));
    if (this.profile.items.length === 0) {
      page.append(el("p", "muted empty", "Vazio. Traga itens das hunts (fugindo vivo) ou compre no mercado."));
      return page;
    }
    const grid = el("div", "item-grid");
    for (const owned of sortItems(this.profile.items)) grid.append(this.itemCell(owned, () => this.openItemSheet(owned)));
    page.append(grid);
    return page;
  }

  private itemCell(owned: OwnedItem, onclick: () => void) {
    const def = ITEMS[owned.itemId];
    const cell = el("button", "item-cell");
    cell.style.borderColor = hex(TIER_COLORS[def.tier]);
    cell.append(itemImg(owned.itemId));
    if (owned.equipped) cell.append(el("span", "item-flag", "E"));
    cell.setAttribute("aria-label", `${def.name}${owned.equipped ? " (equipado)" : ""}`);
    cell.onclick = onclick;
    return cell;
  }

  private openItemSheet(owned: OwnedItem) {
    const def = ITEMS[owned.itemId];
    const sheet = $("sheet");
    sheet.replaceChildren();
    const head = el("div", "sheet-head");
    const title = el("div");
    const name = el("strong", "", def.name);
    name.style.color = hex(TIER_COLORS[def.tier]);
    title.append(name, el("small", "muted", `${SLOT_NAMES[def.slot]} · ${TIER_NAMES[def.tier]}`));
    head.append(itemImg(def.id), title);
    sheet.append(head, el("p", "", itemEffect(def)));
    sheet.append(el("p", "muted", owned.source === "hunt" ? "Trazido de uma hunt." : "Comprado no mercado."));

    const actions = el("div", "actions");
    const equip = el("button", "primary", owned.equipped ? "Tirar do equipamento" : "Equipar para a hunt");
    equip.onclick = () => this.run(async () => {
      await equipItem(owned.id, !owned.equipped);
      for (const other of this.profile.items) {
        if (other.id === owned.id) other.equipped = !owned.equipped;
        else if (!owned.equipped && other.equipped && ITEMS[other.itemId]?.slot === def.slot) other.equipped = false;
      }
      this.closeSheet();
    });
    const sell = el("button", "", `Vender por ${gold(ITEM_SELL_PRICES[def.tier])}`);
    sell.onclick = () => this.run(async () => {
      this.profile.gold = await sellItem(owned.id);
      this.profile.items = this.profile.items.filter((i) => i.id !== owned.id);
      this.toast(`${def.name} vendido.`);
      this.closeSheet();
    });
    const close = el("button", "", "Fechar");
    close.onclick = () => this.closeSheet();
    actions.append(equip, sell, close);
    sheet.append(actions);
    $("sheet").hidden = false;
    $("sheet-backdrop").hidden = false;
  }

  // --- Mapa -----------------------------------------------------------------

  /** Escolha do mapa (folha embaixo, no alcance do polegar). */
  private openMapSheet() {
    const sheet = $("sheet");
    sheet.replaceChildren(el("h2", "", "Mapa"), el("p", "muted hub-hint", "Vale para as salas que você criar."));
    const list = el("div", "map-list");
    for (const id of MAP_IDS) {
      const map = MAPS[id];
      const card = el("button", "map-card");
      card.classList.toggle("selected", id === this.mapId);
      card.setAttribute("aria-pressed", String(id === this.mapId));
      const head = el("div", "map-head");
      head.append(el("span", "map-icon", map.icon));
      const title = el("div");
      title.append(el("strong", "", map.name), el("small", "muted", `Dificuldade ${map.difficulty} ${difficultyStars(map.difficulty)} · ${map.durationSeconds / 60} min`));
      head.append(title);
      card.append(head, el("p", "", map.description));
      card.onclick = () => {
        this.mapId = id;
        storageSet("kusa:map", id);
        this.closeSheet();
        this.render();
      };
      list.append(card);
    }
    sheet.append(list);
    sheet.hidden = false;
    $("sheet-backdrop").hidden = false;
  }

  private closeSheet() {
    $("sheet").hidden = true;
    $("sheet-backdrop").hidden = true;
  }

  // --- Mercado --------------------------------------------------------------

  private renderMarket() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Mercado"));
    const chips = el("div", "chips");
    for (const [mode, label] of [["buy", "Comprar"], ["sell", "Vender"]] as const) {
      const chip = el("button", "chip", label);
      chip.setAttribute("aria-pressed", String(mode === this.marketMode));
      chip.onclick = () => { this.marketMode = mode; this.render(); };
      chips.append(chip);
    }
    page.append(chips);

    const list = el("div", "market-list");
    if (this.marketMode === "buy") {
      page.append(el("p", "muted hub-hint", "Equipamento até Aço. Itens de Dragão só saem das hunts."));
      for (const slot of ITEM_SLOTS) {
        list.append(el("h3", "", SLOT_NAMES[slot]));
        for (const def of Object.values(ITEMS).filter((i) => i.slot === slot)) {
          const price = ITEM_BUY_PRICES[def.tier];
          if (price === null) continue;
          const buy = el("button", "buy", gold(price));
          buy.disabled = this.profile.gold < price;
          buy.onclick = () => this.run(async () => {
            this.profile.gold = await buyItem(def.id);
            this.toast(`${def.name} foi para o inventário.`);
            // O id da linha nova vem do banco: recarrega o inventário.
            this.profile = await loadProfile();
          });
          list.append(this.marketRow(def, buy));
        }
      }
    } else {
      page.append(el("p", "muted hub-hint", "O mercado compra qualquer item do seu inventário."));
      if (this.profile.items.length === 0) list.append(el("p", "muted empty", "Nada para vender."));
      for (const owned of sortItems(this.profile.items)) {
        const def = ITEMS[owned.itemId];
        const sell = el("button", "buy", gold(ITEM_SELL_PRICES[def.tier]));
        sell.onclick = () => this.run(async () => {
          this.profile.gold = await sellItem(owned.id);
          this.profile.items = this.profile.items.filter((i) => i.id !== owned.id);
          this.toast(`${def.name} vendido.`);
        });
        list.append(this.marketRow(def, sell, owned.equipped ? "Equipado" : ""));
      }
    }
    page.append(list);
    return page;
  }

  private marketRow(def: ItemDef, action: HTMLButtonElement, note = "") {
    const row = el("div", "market-row");
    const text = el("div");
    const name = el("strong", "", def.name);
    name.style.color = hex(TIER_COLORS[def.tier]);
    text.append(name, el("small", "muted", `${TIER_NAMES[def.tier]} · ${itemEffect(def)}${note ? ` · ${note}` : ""}`));
    row.append(itemImg(def.id), text, action);
    return row;
  }

  // --- Ações ----------------------------------------------------------------

  /** Roda uma compra/venda: trava os botões, mostra erro e redesenha. */
  private async run(action: () => Promise<void>) {
    if (this.busy) return;
    this.busy = true;
    document.body.classList.add("busy");
    try {
      await action();
    } catch (err) {
      this.toast(err instanceof ProfileError ? err.message : "Sem conexão. Tente de novo.", true);
    } finally {
      this.busy = false;
      document.body.classList.remove("busy");
      this.render();
    }
  }

  private toast(message: string, error = false) {
    const toast = $("hub-toast");
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
  }
}

function itemEffect(def: ItemDef) {
  return def.slot === "weapon" ? `+${def.power}% de dano` : `+${def.power} de armadura`;
}

/** Melhores primeiro; dentro do nível, na ordem dos slots. */
function sortItems(items: OwnedItem[]) {
  return [...items].sort((a, b) => {
    const x = ITEMS[a.itemId], y = ITEMS[b.itemId];
    return y.tier - x.tier || ITEM_SLOTS.indexOf(x.slot) - ITEM_SLOTS.indexOf(y.slot);
  });
}

function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
