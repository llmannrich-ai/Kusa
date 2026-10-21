import {
  BAG_SIZE,
  CLASSES,
  CLASS_IDS,
  ITEMS,
  ITEM_BUY_PRICES,
  ITEM_SELL_PRICES,
  ITEM_SLOTS,
  SLOT_NAMES,
  SPELLS,
  TIER_COLORS,
  TREE_BRANCHES,
  TIER_NAMES,
  VAULT_SIZE,
  auraBonuses,
  auraText,
  knownSpells,
  MASTERIES,
  MASTERY_RANK,
  spellFacts,
  statsFor,
  talentBlocker,
  talentCost,
  talentRank,
  talentTree,
  TALENTS,
  TRAITS,
  chosenSide,
  type ClassId,
  type ItemDef,
  type TalentDef,
} from "@kusa/shared";
import { heroPoses } from "./art/heroes.ts";
import { itemIcon } from "./art/items.ts";
import { NO_OUTFIT, outfitKey, type Outfit } from "./art/outfit.ts";
import {
  ProfileError,
  buyItem,
  buyTalent,
  equipItem,
  loadProfile,
  sellItem,
  storeItem,
  type OwnedItem,
  type Profile,
} from "./profile.ts";

// Menu do jogador depois do login: classes, Grimório (árvore de magias), itens (equipamento, cofre e bag) e mercado.
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

/** Altura de cada linha do Grimório, diâmetro do nó e altura do nó com bolinhas e nome, em px (CSS de `.grimoire`). */
const GRIM_ROW = 116;
const GRIM_ORB = 56;
const GRIM_NODE = 98;

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

/** Retrato da classe vestindo `outfit`: quadro parado, de frente. */
function portrait(classId: ClassId, outfit: Outfit = NO_OUTFIT) {
  const img = el("img", "hero-img");
  img.src = heroUrl(classId, outfit, "down");
  img.alt = CLASSES[classId].name;
  return img;
}

/** O personagem vestido de frente, de lado e de costas, para ver como o equipamento fica. */
function outfitPreview(classId: ClassId, outfit: Outfit) {
  const img = el("img", "doll-img");
  img.src = heroUrl(classId, outfit, "all");
  img.alt = `${CLASSES[classId].name} com o equipamento`;
  return img;
}

function heroUrl(classId: ClassId, outfit: Outfit, view: "down" | "all") {
  const key = `hero:${classId}:${outfitKey(outfit)}:${view}`;
  if (!iconCache.has(key)) {
    const canvas = view === "down" ? heroPoses(classId, outfit, ["down"]) : heroPoses(classId, outfit);
    iconCache.set(key, canvas.toDataURL());
  }
  return iconCache.get(key)!;
}

export class Hub {
  private profile: Profile = { gold: 0, talents: {}, items: [] };
  private tab: Tab = "classes";
  private marketMode: "buy" | "sell" = "buy";
  private busy = false;
  private toastTimer = 0;
  /** Classe escolhida para a próxima hunt (e o Grimório aberto na aba). */
  classId: ClassId;
  private treeClass: ClassId;
  /** Ramo do Grimório aberto em foco (com os dois lados da especialização); vale só para a classe dele. */
  private treeFocus: { classId: ClassId; col: number } | null = null;

  constructor(private onPlay: () => void) {
    const saved = storageGet("kusa:class") as ClassId | null;
    this.classId = saved && saved in CLASSES ? saved : "knight";
    this.treeClass = this.classId;
    document.querySelectorAll<HTMLButtonElement>(".hub-tabs button").forEach((b) => {
      b.onclick = () => this.setTab(b.dataset.tab as Tab);
    });
    $("play").onclick = () => this.onPlay();
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
      head.append(portrait(id, this.loadout()), title);
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
      const tree = el("span", "link", "Grimório ›");
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

  // --- Grimório ---------------------------------------------------------------

  /**
   * O Grimório desenhado como uma árvore de verdade: a raiz (magia inicial do slot 1) no alto e
   * 3 ramos descendo, ligados por galhos. Cada nó pede o anterior do ramo; tocar abre os detalhes.
   */
  private renderTree() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Grimório"));

    const chips = el("div", "chips");
    for (const id of CLASS_IDS) {
      const chip = el("button", "chip", CLASSES[id].name);
      chip.setAttribute("aria-pressed", String(id === this.treeClass));
      chip.onclick = () => { this.treeClass = id; this.render(); };
      chips.append(chip);
    }
    page.append(chips);

    const tree = talentTree(this.treeClass);
    const ranks = this.profile.talents;
    const spells = tree.filter((t) => t.kind === "spell");
    const learned = spells.filter((t) => talentRank(t, ranks) > 0).length;
    page.append(el("p", "muted hub-hint",
      `${learned}/${spells.length} magias. Toque num nó para ver e comprar; os da ponta pedem os anteriores do ramo. ` +
      "Magias viram opção quando o slot abre na hunt (nível 3 e 6); os níveis 2 e 3 deixam a magia mais forte. " +
      "Ramos com ✦ se dividem em duas especializações, e a escolha é permanente."));

    // Visão geral: os 3 ramos sem os lados das especializações (no lugar deles, um nó ✦ que abre o ramo em foco).
    // Ramo em foco: só ele, com o tronco no meio e os dois lados da especialização lado a lado.
    const focus = this.treeFocus?.classId === this.treeClass ? this.treeFocus.col : null;
    const specCols = [...new Set(tree.filter((t) => t.side !== undefined).map((t) => t.col))];
    const shown = focus === null
      ? tree.filter((t) => t.side === undefined)
      : tree.filter((t) => t.col === focus && t.row > 0);
    const forks = focus === null
      ? specCols.map((col) => tree.find((t) => t.kind === "trait" && t.col === col)!)
      : [];
    const offset = focus === null ? 0 : Math.min(...shown.map((t) => t.row));
    const rowOf = (def: TalentDef) => def.row - offset;
    const xOf = (def: TalentDef) => focus === null ? (def.col + 0.5) / 3 : def.side === undefined ? 0.5 : def.side === 0 ? 0.25 : 0.75;

    const rows = Math.max(...[...shown, ...forks].map(rowOf)) + 1;
    const grim = el("div", "grimoire");
    grim.style.setProperty("--rows", String(rows));
    grim.style.setProperty("--class-color", hex(CLASSES[this.treeClass].color));

    const branches = el("div", "grim-branches");
    if (focus === null) {
      TREE_BRANCHES[this.treeClass].forEach((name, col) => {
        const spec = specCols.includes(col);
        const head = el(spec ? "button" : "span", spec ? "grim-branch-spec" : "", spec ? `${name} ✦` : name);
        if (spec) head.onclick = () => { this.treeFocus = { classId: this.treeClass, col }; this.render(); };
        branches.append(head);
      });
    } else {
      // Em foco: o nome de cada lado em cima da sua coluna, e o do ramo no meio.
      const sideName = (side: 0 | 1) => {
        const trait = tree.find((t) => t.kind === "trait" && t.col === focus && t.side === side);
        return trait ? TRAITS[trait.traitId!].spec : "";
      };
      branches.append(el("span", "grim-spec-name", sideName(0)), el("span", "", TREE_BRANCHES[this.treeClass][focus]), el("span", "grim-spec-name", sideName(1)));
      const back = el("button", "link grim-back", "‹ Todos os ramos");
      back.onclick = () => { this.treeFocus = null; this.render(); };
      page.append(back);
    }
    grim.append(branches);

    // Galhos: SVG atrás dos nós, em unidades de 300 na largura × pixels de linha.
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("class", "grim-links");
    svg.setAttribute("viewBox", `0 0 300 ${rows * GRIM_ROW}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const link = (parent: TalentDef, child: TalentDef, state: string) => {
      const x0 = xOf(parent) * 300;
      const y0 = rowOf(parent) * GRIM_ROW + GRIM_ORB / 2;
      const x1 = xOf(child) * 300;
      const y1 = rowOf(child) * GRIM_ROW + GRIM_ORB / 2;
      // O galho se divide logo abaixo do nome do pai, antes do nó filho.
      const mid = rowOf(parent) * GRIM_ROW + GRIM_NODE + ((rowOf(child) - rowOf(parent)) * GRIM_ROW - GRIM_NODE) / 2;
      const path = document.createElementNS(svgNs, "path");
      path.setAttribute("d", x0 === x1 ? `M${x0} ${y0} V${y1}` : `M${x0} ${y0} V${mid} H${x1} V${y1}`);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      if (state) path.classList.add(state);
      svg.append(path);
    };
    for (const def of shown) {
      const parent = def.requires && shown.find((t) => t.id === def.requires!.id);
      if (parent) link(parent, def, talentRank(def, ranks) > 0 ? "on" : talentBlocker(def, ranks) ? "" : "open");
    }
    for (const fork of forks) {
      const parent = shown.find((t) => t.id === fork.requires?.id);
      const picked = chosenSide(this.treeClass, fork.col, ranks) !== null;
      if (parent) link(parent, fork, picked ? "on" : talentRank(parent, ranks) > 0 ? "open" : "");
    }
    grim.append(svg);

    const place = (node: HTMLElement, def: TalentDef) => {
      node.style.left = `${xOf(def) * 100}%`;
      node.style.top = `${rowOf(def) * GRIM_ROW}px`;
      return node;
    };
    for (const def of shown) grim.append(place(this.grimNode(def), def));
    for (const fork of forks) grim.append(place(this.forkNode(fork), fork));
    page.append(grim);
    return page;
  }

  /** Nó ✦ da visão geral no fim de um ramo especializado: mostra o lado escolhido (ou o convite) e abre o ramo em foco. */
  private forkNode(trait: TalentDef) {
    const side = chosenSide(trait.classId, trait.col, this.profile.talents);
    const picked = side === null ? null : this.specTrait(trait.classId, trait.col, side);
    const node = el("button", "gnode fork");
    node.classList.toggle("owned", picked !== null);
    const name = picked ? TRAITS[picked.traitId!].spec : "Especialização";
    node.setAttribute("aria-label", `${name}: abrir o ramo`);
    node.append(el("span", "gnode-orb", picked ? picked.icon : "✦"), el("span", "gnode-name", name));
    node.onclick = () => { this.treeFocus = { classId: trait.classId, col: trait.col }; this.render(); };
    return node;
  }

  /** O Traço de um lado de um ramo especializado. */
  private specTrait(classId: ClassId, col: number, side: 0 | 1) {
    return talentTree(classId).find((t) => t.kind === "trait" && t.col === col && t.side === side) ?? null;
  }

  private grimNode(def: TalentDef) {
    const ranks = this.profile.talents;
    const rank = talentRank(def, ranks);
    const blocker = talentBlocker(def, ranks);
    const maxed = rank >= def.maxRank;
    const locked = !!blocker && !maxed;
    const affordable = !blocker && this.profile.gold >= talentCost(def, rank);
    const spell = def.spellId ? SPELLS[def.spellId] : null;

    const node = el("button", `gnode ${def.kind}`);
    node.classList.toggle("owned", rank > 0);
    node.classList.toggle("maxed", maxed);
    node.classList.toggle("locked", locked);
    node.classList.toggle("ready", affordable);
    node.setAttribute("aria-label", `${def.name}, nível ${rank} de ${def.maxRank}${locked ? `, ${blocker}` : ""}`);

    // O Traço é um losango: o ícone vai num span que desfaz a rotação.
    const orb = el("span", "gnode-orb");
    orb.append(def.kind === "trait" ? el("span", "gnode-icon", def.icon) : def.icon);
    if (spell) orb.append(el("b", "gnode-slot", String(spell.slot + 1)));
    if (locked) orb.append(el("b", "gnode-lock", "🔒"));
    const pips = el("span", "gnode-pips");
    for (let i = 0; i < def.maxRank; i++) pips.append(el("i", i < rank ? "on" : ""));
    node.append(orb, pips, el("span", "gnode-name", def.name));
    node.onclick = () => this.openTalentSheet(def);
    return node;
  }

  /** Detalhes de um nó: o que faz no nível atual e no próximo, o pré-requisito e a compra. */
  private openTalentSheet(def: TalentDef) {
    const ranks = this.profile.talents;
    const rank = talentRank(def, ranks);
    const blocker = talentBlocker(def, ranks);
    const maxed = rank >= def.maxRank;
    const spell = def.spellId ? SPELLS[def.spellId] : null;
    const branch = TREE_BRANCHES[def.classId][def.col];
    const trait = def.traitId ? TRAITS[def.traitId] : null;
    // Lado de uma especialização: o nome dela aparece na ficha (do Traço e das magias do lado).
    const sideTrait = def.side === undefined ? null : this.specTrait(def.classId, def.col, def.side);
    const spec = sideTrait ? TRAITS[sideTrait.traitId!].spec : null;
    const rival = def.exclusiveWith ? TALENTS[def.exclusiveWith] : null;

    const sheet = $("sheet");
    sheet.replaceChildren();
    const head = el("div", "sheet-head");
    const title = el("div");
    title.append(
      el("strong", "", def.name),
      el("small", "muted", `${spell ? `Magia · slot ${spell.slot + 1}` : trait ? "Traço" : "Áurea"} · ${spec ? `${spec} · ` : ""}ramo ${branch}${trait ? "" : ` · nível ${rank}/${def.maxRank}`}`),
    );
    head.append(el("span", "sheet-icon", def.icon), title);
    sheet.append(head);
    if (trait) {
      sheet.append(el("p", "", trait.description));
      if (rank === 0 && rival) {
        sheet.append(el("p", "grim-warning",
          `Escolha permanente: comprar ${trait.name} faz de você ${trait.spec} e fecha para sempre o outro lado do ramo ` +
          `(${TRAITS[rival.traitId!].spec}), com as magias dele.`));
      }
    }
    if (spell) {
      sheet.append(el("p", "", spell.description));
      if (rank < MASTERY_RANK) sheet.append(el("p", "muted", `★ Maestria no nível ${MASTERY_RANK}: ${MASTERIES[spell.id].text}`));
    }

    const levels = el("div", "grim-levels");
    const level = (n: number, current: boolean) => {
      const box = el("div", `grim-level${current ? " current" : ""}`);
      box.append(el("strong", "", `Nível ${n}${current ? " (atual)" : ""}`));
      const lines = spell ? spellFacts(spell, n) : [auraText(def, n)];
      const list = el("ul");
      for (const line of lines) list.append(el("li", "", line));
      box.append(list);
      levels.append(box);
    };
    // O Traço não tem níveis: a descrição já diz o que ele faz.
    if (!trait) {
      if (rank > 0) level(rank, true);
      if (!maxed) level(rank + 1, false);
      sheet.append(levels);
    }

    const actions = el("div", "actions");
    if (maxed) {
      actions.append(el("p", "node-state", trait ? `Você é ${trait.spec}` : "Nível máximo"));
    } else if (blocker) {
      actions.append(el("p", "node-state", `🔒 ${blocker} (nível ${def.requires?.rank ?? 1})`));
    } else {
      const cost = talentCost(def, rank);
      const verb = rank > 0 ? `Subir para o nível ${rank + 1}` : spell ? "Aprender" : trait ? `Ser ${trait.spec}` : "Comprar";
      const buy = el("button", "primary", `${verb} · ${gold(cost)}`);
      buy.disabled = this.profile.gold < cost;
      // Escolha permanente: o primeiro toque só pede a confirmação.
      let confirmed = !trait;
      const purchase = () => void this.run(async () => {
        this.profile.gold = await buyTalent(def.id);
        this.profile.talents[def.id] = rank + 1;
        this.toast(trait ? `Agora você é ${trait.spec}!` : rank === 0 && spell ? `${def.name} aprendida!` : `${def.name} nível ${rank + 1}!`);
      }).then(() => this.openTalentSheet(def));
      buy.onclick = () => {
        if (confirmed) return purchase();
        confirmed = true;
        buy.textContent = `Confirmar: ${trait!.spec} para sempre`;
        buy.classList.add("danger");
      };
      actions.append(buy);
    }
    const close = el("button", "", "Fechar");
    close.onclick = () => this.closeSheet();
    actions.append(close);
    sheet.append(actions);
    $("sheet").hidden = false;
    $("sheet-backdrop").hidden = false;
  }

  // --- Inventário -----------------------------------------------------------

  private renderInventory() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Itens"));
    page.append(el("p", "muted hub-hint",
      "O equipamento e a bag entram com você na hunt. Quem foge volta vestido e esvazia a bag no cofre; quem morre perde os dois."));

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
        cell.onclick = () => this.toast(`Toque num item do cofre para equipar ${SLOT_NAMES[slot].toLowerCase()}.`);
      }
      loadout.append(cell);
    }
    const doll = el("div", "doll");
    doll.append(outfitPreview(this.classId, this.loadout()), el("small", "muted", `${CLASSES[this.classId].name} na próxima hunt`));
    page.append(el("h3", "", "Para a próxima hunt"), doll, loadout);

    const vault = this.vaultItems();
    page.append(el("h3", "", `Cofre (${vault.length}/${VAULT_SIZE})`));
    page.append(el("p", "muted hub-hint", vault.length >= VAULT_SIZE
      ? "Cofre cheio: o que vier da bag fica nela, e o mercado não entrega. Venda ou equipe algo para abrir espaço."
      : "Fica guardado na conta. Recebe a bag ao fim de cada hunt e as compras do mercado."));
    page.append(this.itemGrid(vault, VAULT_SIZE));

    const bag = this.bagItems();
    page.append(el("h3", "", `Bag (${bag.length}/${BAG_SIZE})`));
    page.append(el("p", "muted hub-hint",
      "Entra na hunt com você e recebe o que você pega no chão. Com a bag cheia, nada mais sai do chão."));
    page.append(this.itemGrid(bag, BAG_SIZE));
    return page;
  }

  /** Grade com um quadrado por espaço: os itens e os espaços livres até `size`. */
  private itemGrid(items: OwnedItem[], size: number) {
    const grid = el("div", "item-grid");
    for (const owned of sortItems(items)) grid.append(this.itemCell(owned, () => this.openItemSheet(owned)));
    for (let i = items.length; i < size; i++) grid.append(el("div", "item-cell empty"));
    return grid;
  }

  /** Itens no cofre (o equipamento não ocupa espaço). */
  private vaultItems() {
    return this.profile.items.filter((i) => i.location === "vault" && !i.equipped);
  }

  private bagItems() {
    return this.profile.items.filter((i) => i.location === "bag");
  }

  private itemCell(owned: OwnedItem, onclick: () => void) {
    const def = ITEMS[owned.itemId];
    const cell = el("button", "item-cell");
    cell.style.borderColor = hex(TIER_COLORS[def.tier]);
    cell.append(itemImg(owned.itemId));
    cell.setAttribute("aria-label", def.name);
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
    // Como fica vestido: o equipamento atual com este item no slot dele.
    const tryOn = el("div", "doll");
    tryOn.append(outfitPreview(this.classId, { ...this.loadout(), [def.slot]: def.id }),
      el("small", "muted", owned.equipped ? "Vestido" : "Como fica vestido"));
    sheet.append(tryOn);
    const where = owned.equipped ? "Equipado" : owned.location === "bag" ? "Na bag" : "No cofre";
    sheet.append(el("p", "muted", `${where} · ${owned.source === "hunt" ? "trazido de uma hunt" : "comprado no mercado"}.`));

    const actions = el("div", "actions");
    const vaultFull = this.vaultItems().length >= VAULT_SIZE;
    let main: HTMLButtonElement;
    if (owned.location === "bag") {
      // Da bag, só dá para guardar no cofre (ou vender); equipar é a partir do cofre.
      main = el("button", "primary", vaultFull ? "Cofre cheio" : "Guardar no cofre");
      main.disabled = vaultFull;
      main.onclick = () => this.run(async () => {
        await storeItem(owned.id);
        owned.location = "vault";
        this.toast(`${def.name} foi para o cofre.`);
        this.closeSheet();
      });
    } else {
      main = el("button", "primary", owned.equipped ? (vaultFull ? "Cofre cheio" : "Tirar do equipamento") : "Equipar para a hunt");
      // Tirar do equipamento devolve o item ao cofre; trocar no slot não muda a lotação.
      main.disabled = owned.equipped && vaultFull;
      main.onclick = () => this.run(async () => {
        await equipItem(owned.id, !owned.equipped);
        for (const other of this.profile.items) {
          if (other.id === owned.id) other.equipped = !owned.equipped;
          else if (!owned.equipped && other.equipped && ITEMS[other.itemId]?.slot === def.slot) other.equipped = false;
        }
        this.closeSheet();
      });
    }
    const sell = el("button", "", `Vender por ${gold(ITEM_SELL_PRICES[def.tier])}`);
    sell.onclick = () => this.run(async () => {
      this.profile.gold = await sellItem(owned.id);
      this.profile.items = this.profile.items.filter((i) => i.id !== owned.id);
      this.toast(`${def.name} vendido.`);
      this.closeSheet();
    });
    const close = el("button", "", "Fechar");
    close.onclick = () => this.closeSheet();
    actions.append(main, sell, close);
    sheet.append(actions);
    $("sheet").hidden = false;
    $("sheet-backdrop").hidden = false;
  }

  /** Equipamento marcado para a próxima hunt, como roupa do personagem. */
  private loadout(): Outfit {
    const outfit = { ...NO_OUTFIT };
    for (const owned of this.profile.items) {
      const def = ITEMS[owned.itemId];
      if (owned.equipped && def) outfit[def.slot] = def.id;
    }
    return outfit;
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
      const vaultFull = this.vaultItems().length >= VAULT_SIZE;
      page.append(el("p", "muted hub-hint", vaultFull
        ? `Cofre cheio (${VAULT_SIZE}/${VAULT_SIZE}): venda ou equipe algo para comprar.`
        : "Equipamento até Aço, entregue no cofre. Itens de Dragão só saem das hunts."));
      for (const slot of ITEM_SLOTS) {
        list.append(el("h3", "", SLOT_NAMES[slot]));
        for (const def of Object.values(ITEMS).filter((i) => i.slot === slot)) {
          const price = ITEM_BUY_PRICES[def.tier];
          if (price === null) continue;
          const buy = el("button", "buy", gold(price));
          buy.disabled = vaultFull || this.profile.gold < price;
          buy.onclick = () => this.run(async () => {
            this.profile.gold = await buyItem(def.id);
            this.toast(`${def.name} foi para o cofre.`);
            // O id da linha nova vem do banco: recarrega o inventário.
            this.profile = await loadProfile();
          });
          list.append(this.marketRow(def, buy));
        }
      }
    } else {
      page.append(el("p", "muted hub-hint", "O mercado compra qualquer item seu: equipado, no cofre ou na bag."));
      if (this.profile.items.length === 0) list.append(el("p", "muted empty", "Nada para vender."));
      for (const owned of sortItems(this.profile.items)) {
        const def = ITEMS[owned.itemId];
        const sell = el("button", "buy", gold(ITEM_SELL_PRICES[def.tier]));
        sell.onclick = () => this.run(async () => {
          this.profile.gold = await sellItem(owned.id);
          this.profile.items = this.profile.items.filter((i) => i.id !== owned.id);
          this.toast(`${def.name} vendido.`);
        });
        list.append(this.marketRow(def, sell, owned.equipped ? "Equipado" : owned.location === "bag" ? "Na bag" : ""));
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

export function itemEffect(def: ItemDef) {
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
