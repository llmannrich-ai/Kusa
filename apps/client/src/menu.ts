import {
  BAG_SIZE,
  CLASSES,
  CLASS_IDS,
  CLASS_UNLOCK,
  MONSTERS,
  classUnlocked,
  type MonsterKind,
  ITEMS,
  ITEM_BUY_PRICES,
  ITEM_FAMILIES,
  ITEM_SLOTS,
  ITEM_TIERS,
  RARITY_NAMES,
  RUNES,
  RUNE_SLOTS,
  SLOT_NAMES,
  SPELLS,
  SPELL_SLOT_LEVELS,
  TREE_BRANCHES,
  TIER_NAMES,
  VAULT_SIZE,
  auraBonuses,
  giftEffects,
  GIFTS,
  auraText,
  knownSpells,
  MASTERIES,
  MASTERY_RANK,
  SPELL_MAX_LEVEL,
  DEATH_SPELL_XP_LOSS,
  nodeLevel,
  ACTIVE_SPELLS_PER_SLOT,
  activeSpells,
  activeSlotSpells,
  toggleActiveSpell,
  SYNERGY_PER_LEVEL,
  spellBonus,
  spellNeighbors,
  spellRanks,
  spellTalentId,
  spellLevelProgress,
  spellXpOf,
  lootColor,
  lootName,
  lootSellPrice,
  runeEffect,
  spellFacts,
  statsFor,
  talentBlocker,
  talentCost,
  talentRank,
  talentTree,
  TALENTS,
  TRAITS,
  damageReduction,
  gearStats,
  heroBonuses,
  canUse,
  classesText,
  describeStats,
  itemColor,
  itemId,
  itemScore,
  itemSummary,
  sellPrice,
  type ClassId,
  type ItemDef,
  type ItemSlot,
  type RuneDef,
  type SpellDef,
  type SpellId,
  type TalentDef,
} from "@kusa/shared";
import { HERO_DIRS, HERO_FRAMES, heroPoses, heroSheet, type HeroDir } from "./art/heroes.ts";
import { branchIcon } from "./branchIcons.ts";
import {
  NEEDS, PLAN_SLOTS, ROLE_INFO, coverage, slotExists, slotSpells, spellRoles, suggestSlot, type PlanSpell,
} from "./spellPlan.ts";
import { itemIcon, slotGhost } from "./art/items.ts";
import { NO_OUTFIT, outfitKey, type Outfit } from "./art/outfit.ts";
import {
  ProfileError,
  buyItem,
  buyTalent,
  buyTalentLevels,
  setActiveSpells,
  equipItem,
  loadProfile,
  sellItem,
  storeItem,
  type OwnedItem,
  type Profile,
} from "./profile.ts";

// Menu do jogador depois do login: heróis, Grimório (árvore de magias), itens (equipamento, cofre e bag) e mercado.
// Abas embaixo (zona do polegar), "Jogar" logo acima delas; tudo funciona só com toque.

/** `loadout`: Magias da hunt (aberta pelo Grimório da página Heróis), sem aba própria na barra. */
type Tab = "heroes" | "spells" | "items" | "market" | "loadout";

const ROLES: Record<ClassId, { text: string; tags: string[] }> = {
  knight: { text: "Corpo a corpo. Aguenta a pancada e segura os monstros.", tags: ["Linha de frente", "Tanque"] },
  paladin: { text: "Ataca de longe com flechas fortes.", tags: ["À distância", "Precisão"] },
  sorcerer: { text: "Dano em área enorme, mas frágil.", tags: ["Dano em área", "Frágil"] },
  druid: { text: "Cura a equipe e prende os monstros.", tags: ["Suporte", "Controle"] },
  shaman: { text: "Finca totens que lutam sozinhos e acelera a equipe com o tambor.", tags: ["Totens", "Reforço"] },
};

/** Um atributo na página Heróis: o valor do nível 1 sem bônus, o valor com bônus e o texto mostrado. */
interface HeroStat { label: string; icon: string; base: number; value: number; text: string }
type HeroStats = Record<"hp" | "mana" | "damage" | "armor" | "range" | "speed", HeroStat>;

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
  img.alt = lootName(itemId);
  return img;
}

function ghostImg(slot: ItemSlot) {
  const key = `ghost:${slot}`;
  if (!iconCache.has(key)) iconCache.set(key, slotGhost(slot).toDataURL());
  const img = el("img", "item-img");
  img.src = iconCache.get(key)!;
  img.alt = "";
  return img;
}

/**
 * Manequim atrás dos slots do equipamento (viewBox no mesmo formato do `.loadout`): parede de
 * pedra, corpo com volume, ombreiras, cinto, joelheiras e botas. Os slots cobrem cabeça, peito,
 * pernas, pés e mãos; o resto do corpo aparece em volta deles.
 */
const BODY_SVG = `<svg class="loadout-body" viewBox="0 0 100 110" aria-hidden="true">
  <defs>
    <pattern id="doll-bricks" width="12" height="7" patternUnits="userSpaceOnUse">
      <rect width="12" height="7" fill="#17110e"/>
      <path d="M0 .5h12M0 4h12M3 .5v3.5M9 4v3" stroke="#0c0907" stroke-width=".6"/>
    </pattern>
    <linearGradient id="doll-skin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2b221c"/><stop offset=".45" stop-color="#4a3c30"/><stop offset="1" stop-color="#241c17"/>
    </linearGradient>
    <radialGradient id="doll-light" cx=".5" cy=".42" r=".6">
      <stop offset="0" stop-color="#c9a24a" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity=".55"/>
    </radialGradient>
  </defs>
  <rect width="100" height="110" fill="url(#doll-bricks)"/>
  <rect width="100" height="110" fill="url(#doll-light)"/>
  <ellipse cx="50" cy="106.5" rx="25" ry="2.6" fill="#000" opacity=".6"/>
  <g fill="url(#doll-skin)" stroke="#6b5640" stroke-width=".7" stroke-linejoin="round" stroke-linecap="round">
    <path d="M32 37 22 49l-6 11 6 4 7-11 6-8zM68 37l10 12 6 11-6 4-7-11-6-8z"/>
    <path d="M37 66h11l-.5 18 .5 14h-9l-1-14zM52 66h11l-1 18-1 14h-9l.5-14z"/>
    <path d="M36 97h12v6q0 2-2 2H33q-2 0-1-2zM52 97h12l4 6q1 2-1 2H54q-2 0-2-2z"/>
    <path d="M45 23h10v9H45z"/>
    <circle cx="50" cy="14" r="10"/>
    <path d="M31 34q19-6 38 0l2 6-4 14-3 12H36l-3-12-4-14z"/>
    <path d="M26 37q4-7 12-5l1 7q-6 3-12 1zM74 37q-4-7-12-5l-1 7q6 3 12 1z"/>
  </g>
  <g fill="none" stroke="#0d0a08" stroke-width=".8" stroke-linecap="round">
    <path d="M50 38v26M40 44q10 4 20 0M38 55q12 3 24 0"/>
    <path d="M24 46l5 4M76 46l-5 4"/>
  </g>
  <g stroke="#0d0a08" stroke-width=".6">
    <rect x="35" y="62" width="30" height="5" fill="#3a2a1c"/>
    <rect x="47" y="61.5" width="6" height="6" fill="#8a6d2c" stroke="#c9a24a"/>
    <rect x="49" y="63.5" width="2" height="2" fill="#17110e"/>
    <path d="M40 83h5l-1 4.5h-3z" fill="#3a2f27"/>
    <path d="M55 83h5l-1 4.5h-3z" fill="#3a2f27"/>
  </g>
  <g fill="#c9a24a" opacity=".45">
    <circle cx="29" cy="35.5" r=".9"/><circle cx="33" cy="33.2" r=".9"/>
    <circle cx="71" cy="35.5" r=".9"/><circle cx="67" cy="33.2" r=".9"/>
  </g>
</svg>`;

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

/** O personagem vestido em pé, um quadro por direção (frente, lado e costas), para a coluna ao lado do boneco. */
function heroColumn(classId: ClassId, outfit: Outfit) {
  const column = el("div", "hero-poses");
  for (const dir of ["down", "side", "up"] as const) {
    const img = el("img", "hero-pose");
    img.src = heroUrl(classId, outfit, dir);
    img.alt = "";
    column.append(img);
  }
  column.setAttribute("role", "img");
  column.setAttribute("aria-label", `${CLASSES[classId].name} com o equipamento`);
  return column;
}

function heroUrl(classId: ClassId, outfit: Outfit, view: HeroDir | "all") {
  const key = `hero:${classId}:${outfitKey(outfit)}:${view}`;
  if (!iconCache.has(key)) {
    const canvas = view === "all" ? heroPoses(classId, outfit) : heroPoses(classId, outfit, [view]);
    iconCache.set(key, canvas.toDataURL());
  }
  return iconCache.get(key)!;
}

const sheetCache = new Map<string, HTMLCanvasElement>();

/**
 * O herói vestido no palco da página Heróis: anda no lugar e gira (frente, lado, costas, outro lado). Tocar faz ele
 * pular e virar de frente. Com "reduzir movimento" no aparelho, fica parado de frente. Para sozinho ao sair da tela.
 */
function heroWalker(classId: ClassId, outfit: Outfit) {
  const key = `${classId}:${outfitKey(outfit)}`;
  if (!sheetCache.has(key)) sheetCache.set(key, heroSheet(classId, outfit));
  const sheet = sheetCache.get(key)!;
  const size = sheet.height;
  const canvas = el("canvas", "hero-walker");
  canvas.width = size;
  canvas.height = size;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${CLASSES[classId].name} com o equipamento`);
  const ctx = canvas.getContext("2d")!;
  const draw = (dir: HeroDir, frame: number, flip = false) => {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    if (flip) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.drawImage(sheet, (HERO_DIRS.indexOf(dir) * HERO_FRAMES + frame) * size, 0, size, size, 0, 0, size, size);
    ctx.restore();
  };
  draw("down", 0);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return canvas;

  // Passos: a sequência de quadros de cada direção; parado de frente um pouco antes de girar.
  const walk = [1, 0, 2, 0, 1, 0, 2, 0];
  const turns: [HeroDir, boolean][] = [["down", false], ["side", false], ["up", false], ["side", true]];
  let step = 0;
  const tick = () => {
    if (!canvas.isConnected && step > 0) return;
    const turn = Math.floor(step / (walk.length + 4)) % turns.length;
    const i = step % (walk.length + 4);
    const [dir, flip] = turns[turn];
    draw(dir, i < walk.length ? walk[i] : 0, flip);
    step++;
    window.setTimeout(tick, 170);
  };
  window.setTimeout(tick, 170);
  canvas.onclick = () => {
    step = 0;
    canvas.classList.remove("hop");
    void canvas.offsetWidth;
    canvas.classList.add("hop");
  };
  return canvas;
}

export class Hub {
  private profile: Profile = { gold: 0, talents: {}, spellXp: {}, activeSpells: [], items: [], bossClears: [] };
  private tab: Tab = "heroes";
  private marketMode: "buy" | "sell" = "buy";
  /** Slot mostrado na compra do mercado. */
  private marketSlot: ItemSlot = "weapon";
  private busy = false;
  private toastTimer = 0;
  /** Classe escolhida para a próxima hunt: a mesma nas páginas Heróis e Grimório (trocar numa troca na outra). */
  classId: ClassId;
  /** Ramo aberto no Grimório (0 a 2): um por tela. */
  private treeBranch = 0;
  /** Slot aberto em Magias da hunt (0 a 2). */
  private loadoutSlot = 0;
  /** A escolha antes da última sugestão aplicada, para o "Desfazer" (some na próxima mudança). */
  private loadoutUndo: { slot: number; chosen: string[] } | null = null;

  constructor(private onPlay: () => void) {
    const saved = storageGet("kusa:class") as ClassId | null;
    this.classId = saved && saved in CLASSES ? saved : "knight";
    document.querySelectorAll<HTMLButtonElement>(".hub-tabs button[data-tab]").forEach((b) => {
      b.onclick = () => this.setTab(b.dataset.tab as Tab);
    });
    // Classe trancada (Xamã Orc): dá para ver o herói e o Grimório, mas não entrar na hunt com ele.
    $("play").onclick = () => {
      if (this.locked(this.classId)) return this.toast(this.lockText(this.classId), true);
      this.onPlay();
    };
    $("sheet-backdrop").onclick = () => this.closeSheet();
  }

  /** Abre o menu da conta e busca árvore, inventário e gold. */
  async open(username: string, initialGold: number) {
    $("account-name").textContent = username;
    this.profile = { gold: initialGold, talents: {}, spellXp: {}, activeSpells: [], items: [], bossClears: [] };
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
    $("play").setAttribute("aria-label", `Batalhas · ${CLASSES[this.classId].name}`);
    // Magias da hunt é uma subpágina de Heróis: a aba de Heróis segue marcada.
    const shownTab = this.tab === "loadout" ? "heroes" : this.tab;
    document.querySelectorAll<HTMLButtonElement>(".hub-tabs button[data-tab]").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.tab === shownTab));
    });
    const body = $("hub-body");
    body.replaceChildren(
      this.tab === "heroes" ? this.renderHeroes()
        : this.tab === "loadout" ? this.renderLoadout()
        : this.tab === "spells" ? this.renderTree()
          : this.tab === "items" ? this.renderInventory()
            : this.renderMarket(),
    );
  }

  /** Bosses vencidos lidos de novo (fim de hunt): devolve as classes que estavam trancadas e abriram agora. */
  updateBossClears(bossClears: string[]): ClassId[] {
    const opened = CLASS_IDS.filter((id) => this.locked(id) && classUnlocked(bossClears, id));
    this.profile.bossClears = bossClears;
    return opened;
  }

  /** A classe ainda está trancada na conta (o servidor e o banco conferem de novo)? */
  locked(id: ClassId) {
    return !classUnlocked(this.profile.bossClears, id);
  }

  /** Como abrir uma classe trancada. */
  private lockText(id: ClassId) {
    const boss = CLASS_UNLOCK[id] as MonsterKind | undefined;
    return `🔒 ${CLASSES[id].name}: vença ${boss ? MONSTERS[boss].name : "o boss"} na Fortaleza Orc com qualquer herói para liberar.`;
  }

  // --- Heróis ---------------------------------------------------------------

  /**
   * O salão do herói escolhido: os medalhões para trocar, o herói vestido andando num palco, os atributos em barras
   * (a parte base e o bônus, na escala dos 4 heróis) e os atalhos para o Grimório e o equipamento dele.
   */
  private renderHeroes() {
    const id = this.classId;
    const c = CLASSES[id];
    const page = el("div", "hub-page heroes");
    page.style.setProperty("--class-color", hex(c.color));
    page.append(el("h2", "", "Heróis"), el("p", "muted hub-hint", "Toque num herói para entrar com ele na próxima hunt."));
    page.append(this.heroPicks(id, (pick) => this.pickClass(pick)));
    if (this.locked(id)) page.append(el("p", "hero-locked", this.lockText(id)));

    // Palco: o herói vestido anda e gira; as especializações escolhidas ficam em estandartes embaixo.
    const stage = el("section", "hero-stage");
    const scene = el("div", "hero-scene");
    for (let i = 0; i < 9; i++) {
      const ember = el("i", "hero-ember");
      ember.style.setProperty("--x", `${8 + ((i * 37) % 84)}%`);
      ember.style.setProperty("--d", `${(i * 0.73) % 4.5}s`);
      ember.style.setProperty("--t", `${4 + (i % 3)}s`);
      scene.append(ember);
    }
    scene.append(el("span", "hero-plinth"), heroWalker(id, this.loadout(id)));
    const specs = talentTree(id).filter((t) => t.kind === "trait" && talentRank(t, this.profile.talents) > 0);
    if (specs.length) {
      const banners = el("div", "hero-specs");
      for (const t of specs) banners.append(el("span", "hero-spec", `${t.icon} ${TRAITS[t.traitId!].spec}`));
      scene.append(banners);
    }
    const caption = el("div", "hero-caption");
    const tags = el("div", "hero-tags");
    for (const tag of ROLES[id].tags) tags.append(el("span", "", tag));
    caption.append(el("p", "", ROLES[id].text), tags);
    stage.append(el("div", "equip-title", c.name), scene, caption);
    page.append(stage);

    // Atributos: barra na escala do maior valor entre os 4 heróis; o trecho claro é o bônus.
    const all = Object.fromEntries(CLASS_IDS.map((k) => [k, this.heroStats(k)])) as Record<ClassId, HeroStats>;
    const stats = all[id];
    const attrs = el("div", "hero-attrs");
    for (const key of Object.keys(stats) as (keyof HeroStats)[]) {
      const { label, icon, base, value, text } = stats[key];
      const top = Math.max(1, ...CLASS_IDS.map((k) => all[k][key].value));
      const row = el("div", "attr");
      const bar = el("div", "attr-bar");
      const b = el("i", "attr-base");
      b.style.width = `${(Math.min(base, value) / top) * 100}%`;
      const up = el("i", "attr-bonus");
      up.style.width = `${(Math.max(0, value - base) / top) * 100}%`;
      bar.append(b, up);
      const shown = el("span", "attr-value", text);
      const gain = value - base;
      if (gain > 0 && key !== "range" && key !== "armor") shown.append(el("small", "", ` +${key === "speed" ? gain.toFixed(1).replace(".", ",") : Math.round(gain)}`));
      row.append(el("span", "attr-icon", icon), el("span", "attr-label", label), bar, shown);
      attrs.append(row);
    }
    page.append(el("h3", "", "Atributos"), attrs,
      el("p", "muted hub-hint attr-note", "Como ele entra na hunt (nível 1), já com áureas, runas e equipamento. O trecho claro é o bônus."));

    page.append(el("h3", "", "Arsenal"), this.heroGrimoire(id), this.heroGear(id));
    return page;
  }

  /** Atributos do herói como a hunt soma (`applyBonuses` e `baseDamage` em hunt.ts): áureas, runas e itens vestidos por ele. */
  private heroStats(id: ClassId): HeroStats {
    const c = CLASSES[id];
    const worn = this.wornItems(id).map((i) => i.itemId);
    const aura = auraBonuses(id, this.profile.talents);
    const runes = heroBonuses({}, worn);
    const gear = gearStats(worn);
    const bonus = {
      hp: aura.hp + runes.hp + gear.hp, mana: aura.mana + runes.mana + gear.mana,
      // Passo de Rastreador (Dom) soma com a Áurea de velocidade, como na hunt.
      damage: aura.damage + runes.damage, speed: aura.speed + giftEffects(id, this.profile.talents).speed + runes.speed + gear.speed,
    };
    const base = statsFor(id, 1);
    const boosted = statsFor(id, 1, bonus);
    const damage = boosted.damage * (1 + gear.damage);
    const range = c.attackRange + (c.attackRange > 1 ? gear.range : 0);
    const armor = gear.armor + runes.armor;
    const speed = (n: number) => n.toFixed(1).replace(".", ",");
    return {
      hp: { label: "Vida", icon: "❤️", base: base.maxHp, value: boosted.maxHp, text: String(boosted.maxHp) },
      mana: { label: "Mana", icon: "💧", base: base.maxMana, value: boosted.maxMana, text: String(boosted.maxMana) },
      damage: { label: "Dano", icon: "⚔️", base: base.damage, value: damage, text: String(Math.round(damage)) },
      armor: { label: "Armadura", icon: "🛡️", base: 0, value: armor, text: armor ? `${armor} · −${Math.round(damageReduction(armor) * 100)}%` : "0" },
      range: { label: "Alcance", icon: "🏹", base: c.attackRange, value: range, text: range === 1 ? "Corpo a corpo" : `${range} tiles` },
      speed: { label: "Velocidade", icon: "👟", base: base.speed, value: boosted.speed, text: `${speed(boosted.speed)}/s` },
    };
  }

  /** Atalho do Grimório: os 3 ramos (com a especialização escolhida) e as magias que vão para a hunt. */
  private heroGrimoire(id: ClassId) {
    const ranks = this.profile.talents;
    const tree = talentTree(id);
    const card = el("div", "hero-link");
    const open = (branch?: number) => {
      if (branch !== undefined) this.treeBranch = branch;
      this.setTab("spells");
    };
    const known = knownSpells(id, ranks).length;
    const total = Object.values(SPELLS).filter((s) => s.classId === id).length;
    const openLoadout = () => {
      this.loadoutSlot = 0;
      this.loadoutUndo = null;
      this.setTab("loadout");
    };
    card.append(this.linkHead("📖", "Grimório", `${known}/${total} magias · escolher`, openLoadout));

    const branches = el("div", "hero-branches");
    TREE_BRANCHES[id].forEach((name, col) => {
      const spells = tree.filter((t) => t.col === col && t.kind === "spell" && t.row > 0);
      const owned = spells.filter((t) => talentRank(t, ranks) > 0).length;
      const trait = tree.find((t) => t.col === col && t.kind === "trait" && talentRank(t, ranks) > 0);
      const b = el("button", "hero-branch");
      b.classList.toggle("started", owned > 0);
      const emblem = el("span", "grim-tab-emblem");
      emblem.append(branchIcon(id, col));
      b.append(emblem, el("strong", "", name), el("small", trait ? "spec" : "muted", trait ? `✦ ${TRAITS[trait.traitId!].spec}` : `${owned}/${spells.length}`));
      b.setAttribute("aria-label", `${name}: ${owned} de ${spells.length} magias${trait ? `, ${TRAITS[trait.traitId!].spec}` : ""}`);
      b.onclick = () => open(col);
      branches.append(b);
    });
    card.append(branches);

    const { talents, spellXp, activeSpells: chosen } = this.profile;
    const going = el("button", "hero-spells");
    going.setAttribute("aria-label", "Vão para a hunt: escolher as magias de cada slot");
    going.onclick = openLoadout;
    going.append(el("small", "muted", "Vão para a hunt · toque para escolher"));
    const list = el("div", "hero-spell-list");
    for (const spellId of activeSpells(id, talents, spellXp, chosen)) {
      const s = SPELLS[spellId];
      const chip = el("span", "hero-spell");
      chip.style.setProperty("--spell-color", hex(s.color));
      chip.append(el("b", "", String(s.slot + 1)), el("span", "", s.icon), el("span", "hero-spell-name", s.name));
      list.append(chip);
    }
    going.append(list);
    card.append(going);
    return card;
  }

  /** Atalho do equipamento: os 6 slots e as 3 runas do herói, com a armadura e o dano dos itens. */
  private heroGear(id: ClassId) {
    const card = el("div", "hero-link");
    const worn = this.wornItems(id);
    const runes = worn.filter((i) => RUNES[i.itemId]);
    const open = () => this.setTab("items");
    card.append(this.linkHead("🎒", "Equipamento", `Runas ${runes.length}/${RUNE_SLOTS}`, open));
    const strip = el("button", "hero-gear");
    strip.setAttribute("aria-label", `Equipamento do ${CLASSES[id].name}: ${worn.length - runes.length} de ${ITEM_SLOTS.length} slots, ${runes.length} runas`);
    for (const slot of ITEM_SLOTS) {
      const owned = worn.find((i) => ITEMS[i.itemId]?.slot === slot);
      const cell = el("span", "hero-gear-slot");
      if (owned) {
        cell.append(itemImg(owned.itemId));
        cell.style.borderColor = hex(itemColor(owned.itemId));
      } else {
        cell.append(ghostImg(slot));
        cell.classList.add("vacant");
      }
      strip.append(cell);
    }
    for (let i = 0; i < RUNE_SLOTS; i++) {
      const owned = runes[i];
      const cell = el("span", "hero-gear-slot rune");
      if (owned) {
        cell.append(itemImg(owned.itemId));
        cell.style.borderColor = hex(lootColor(owned.itemId));
      } else {
        cell.append(el("span", "slot-empty", "ᚱ"));
        cell.classList.add("vacant");
      }
      strip.append(cell);
    }
    strip.onclick = open;
    const gear = gearStats(worn.map((i) => i.itemId));
    const facts = [`🛡️ Armadura ${gear.armor}`, `⚔️ Dano +${Math.round(gear.damage * 100)}%`];
    if (gear.spellPower) facts.push(`✨ Magias +${Math.round(gear.spellPower * 100)}%`);
    card.append(strip, el("small", "muted hero-gear-facts", facts.join(" · ")));
    return card;
  }

  /** Cabeçalho tocável de um atalho do Arsenal: ícone, nome, resumo e a seta. */
  private linkHead(icon: string, title: string, summary: string, onclick: () => void) {
    const head = el("button", "hero-link-head");
    head.append(el("span", "", icon), el("strong", "", title), el("small", "muted", summary), el("b", "", "›"));
    head.onclick = onclick;
    return head;
  }

  /** Troca o herói da próxima hunt (medalhões de Heróis e do Grimório): vale nas duas páginas e fica salvo. */
  private pickClass(pick: ClassId) {
    if (pick === this.classId) return;
    this.classId = pick;
    this.treeBranch = 0;
    storageSet("kusa:class", pick);
    this.render();
  }

  /** Um medalhão por herói, com o retrato vestido e a cor da classe (Heróis e Grimório). */
  private heroPicks(selected: ClassId, onPick: (id: ClassId) => void) {
    const heroes = el("div", "grim-heroes");
    for (const id of CLASS_IDS) {
      const pick = el("button", this.locked(id) ? "grim-hero locked" : "grim-hero");
      pick.style.setProperty("--class-color", hex(CLASSES[id].color));
      pick.setAttribute("aria-pressed", String(id === selected));
      const frame = el("span", "grim-hero-frame");
      frame.append(portrait(id, this.loadout(id)));
      pick.append(frame, el("span", "grim-hero-name", CLASSES[id].name));
      pick.onclick = () => onPick(id);
      heroes.append(pick);
    }
    return heroes;
  }

  // --- Magias da hunt -----------------------------------------------------------

  /**
   * Magias da hunt (aberta pelo Grimório da página Heróis): as até 3 magias de cada slot que aparecem na escolha quando
   * o slot abre na hunt. No alto, os 3 slots com o que está ativo em cada um (o 3º ainda não existe: "em breve"); embaixo,
   * o que o conjunto cobre (área, alvo, controle, sobrevivência) e a lista do slot aberto, da mais forte para a mais
   * fraca, com o papel de cada magia, uma chave para ativar e a sugestão. Cada toque grava na hora.
   */
  private renderLoadout() {
    const id = this.classId;
    const c = CLASSES[id];
    const { talents, spellXp, activeSpells: chosen } = this.profile;
    const page = el("div", "hub-page loadout-page");
    page.style.setProperty("--class-color", hex(c.color));

    const top = el("header", "lo-top");
    const back = el("button", "icon-button page-back", "‹");
    back.setAttribute("aria-label", "Voltar para Heróis");
    back.onclick = () => this.setTab("heroes");
    const title = el("div", "lo-title");
    title.append(el("h2", "", "Magias da hunt"), el("small", "muted", `Grimório · ${c.name}`));
    const tree = el("button", "lo-tree", "Árvore ›");
    tree.setAttribute("aria-label", "Abrir a árvore de magias");
    tree.onclick = () => this.setTab("spells");
    const face = el("span", "lo-face");
    face.append(portrait(id, this.loadout(id)));
    top.append(back, face, title, tree);
    page.append(top);
    page.append(el("p", "muted hub-hint lo-hint",
      `Quando um slot abre na hunt, você escolhe 1 entre as magias ativas dele. Deixe até ${ACTIVE_SPELLS_PER_SLOT} por slot, de preferência com papéis diferentes.`));

    // Os 3 slots: o que está ativo em cada um. Tocar abre a lista do slot.
    const active = [0, 1].map((slot) => activeSlotSpells(id, slot, talents, spellXp, chosen));
    if (!slotExists(this.loadoutSlot)) this.loadoutSlot = 0;
    const slots = el("div", "lo-slots");
    slots.setAttribute("role", "tablist");
    slots.setAttribute("aria-label", "Slots de magia");
    for (let slot = 0; slot < PLAN_SLOTS; slot++) {
      const exists = slotExists(slot);
      const on = exists ? active[slot] : [];
      const tab = el("button", "lo-slot");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(slot === this.loadoutSlot));
      tab.classList.toggle("soon", !exists);
      const head = el("span", "lo-slot-head");
      head.append(el("b", "", String(slot + 1)), el("small", "", exists ? `nível ${SPELL_SLOT_LEVELS[slot]}` : "em breve"));
      const sockets = el("span", "lo-sockets");
      for (let i = 0; i < ACTIVE_SPELLS_PER_SLOT; i++) {
        const spell = on[i] ? SPELLS[on[i]] : null;
        const socket = el("i", spell ? "filled" : "", spell ? spell.icon : exists ? "" : "🔒");
        if (spell) socket.style.setProperty("--spell-color", hex(spell.color));
        sockets.append(socket);
      }
      tab.append(head, sockets, el("small", "lo-slot-count", exists ? `${on.length}/${ACTIVE_SPELLS_PER_SLOT}` : "—"));
      tab.setAttribute("aria-label", exists
        ? `Slot ${slot + 1}, abre no nível ${SPELL_SLOT_LEVELS[slot]}: ${on.map((s) => SPELLS[s].name).join(", ") || "nenhuma"}`
        : `Slot ${slot + 1}: em breve`);
      tab.onclick = () => {
        if (!exists) return this.toast(`O slot ${slot + 1} ainda não existe no jogo. Quando chegar, ele aparece aqui.`);
        this.loadoutSlot = slot;
        this.render();
      };
      slots.append(tab);
    }
    page.append(slots);

    // Cobertura: o que as magias ativas dos dois slots garantem na hunt, e a dica para a primeira falta.
    page.append(this.loadoutCoverage(id, active));

    // A lista do slot aberto.
    const slot = this.loadoutSlot;
    const spells = slotSpells(id, slot, talents, spellXp);
    const auto = spells.length <= ACTIVE_SPELLS_PER_SLOT;
    const suggestion = suggestSlot(spells, active[1 - slot] ?? []);
    const differs = !auto && suggestion.picks.some((s) => !active[slot].includes(s));

    const listHead = el("div", "lo-list-head");
    listHead.append(el("h3", "", `Slot ${slot + 1} · ${spells.length} ${spells.length === 1 ? "magia" : "magias"}`));
    if (this.loadoutUndo?.slot === slot) {
      const undo = el("button", "lo-undo", "↶ Desfazer");
      const previous = this.loadoutUndo.chosen;
      undo.onclick = () => this.saveLoadout(previous, "Escolha anterior de volta", null);
      listHead.append(undo);
    }
    page.append(listHead);

    if (auto) {
      page.append(el("p", "lo-note", spells.length === 0
        ? "Nenhuma magia neste slot ainda."
        : `Com ${ACTIVE_SPELLS_PER_SLOT} magias ou menos, todas vão para a hunt. Aprenda mais na árvore para poder escolher.`));
    } else if (differs) {
      const box = el("div", "lo-suggest");
      const text = el("div");
      text.append(el("strong", "", "✨ Sugestão para este slot"),
        el("small", "muted", suggestion.picks.map((s) => `${SPELLS[s].icon} ${SPELLS[s].name}`).join(" · ")));
      const apply = el("button", "primary", "Aplicar");
      apply.onclick = () => {
        const others = chosen.filter((t) => {
          const def = TALENTS[t];
          return !(def?.classId === id && def.spellId && SPELLS[def.spellId].slot === slot);
        });
        const next = [...others, ...suggestion.picks.map((s) => spellTalentId(id, s))];
        void this.saveLoadout(next, `Sugestão aplicada no slot ${slot + 1}`, { slot, chosen: [...chosen] });
      };
      box.append(text, apply);
      page.append(box);
    } else {
      page.append(el("p", "lo-note ok", "✔ Seu slot já está igual à sugestão: as mais fortes, com papéis diferentes."));
    }

    const list = el("div", "lo-list");
    for (const spell of spells) {
      list.append(this.loadoutRow(spell, active[slot].includes(spell.id), auto, suggestion.reasons[spell.id] ?? null,
        active[slot].length >= ACTIVE_SPELLS_PER_SLOT));
    }
    page.append(list);

    // O que ainda dá para aprender neste slot, para planejar a próxima compra.
    const locked = talentTree(id).filter((t) => t.spellId && SPELLS[t.spellId].slot === slot && talentRank(t, talents) === 0);
    if (locked.length) {
      const more = el("details", "lo-more");
      more.append(el("summary", "", `Para aprender neste slot (${locked.length})`));
      for (const def of locked) {
        const s = SPELLS[def.spellId!];
        const blocker = talentBlocker(def, talents, spellXp);
        const row = el("button", "lo-locked");
        const roles = spellRolesText(s);
        const text = el("span", "lo-locked-text");
        text.append(el("strong", "", s.name), el("small", "muted", `${TREE_BRANCHES[id][def.col]}${roles ? ` · ${roles}` : ""}`));
        row.append(el("span", "lo-locked-icon", s.icon), text,
          el("small", blocker ? "muted" : "lo-cost", blocker ? "🔒" : gold(talentCost(def, 0))));
        row.setAttribute("aria-label", `${s.name}, não aprendida${blocker ? `, ${blocker}` : `, custa ${talentCost(def, 0)} de gold`}`);
        row.onclick = () => this.openTalentSheet(def);
        more.append(row);
      }
      page.append(more);
    }
    return page;
  }

  /** Painel de cobertura: as 4 necessidades da hunt, quem atende cada uma e uma dica para a primeira que falta. */
  private loadoutCoverage(id: ClassId, active: SpellId[][]) {
    const { talents, spellXp } = this.profile;
    const all = active.flat();
    const cov = coverage(all);
    const box = el("section", "lo-cover");
    box.append(el("strong", "lo-cover-title", "O que você leva para a hunt"));
    const grid = el("div", "lo-needs");
    for (const need of NEEDS) {
      const by = cov[need.id];
      const item = el("div", `lo-need${by.length ? " on" : ""}`);
      item.append(el("b", "", by.length ? "✔" : "✕"), el("span", "", need.label),
        el("small", "muted", by.length ? by.map((s) => SPELLS[s].icon).join(" ") : "falta"));
      item.setAttribute("aria-label", `${need.label}: ${by.length ? by.map((s) => SPELLS[s].name).join(", ") : "falta"}`);
      grid.append(item);
    }
    box.append(grid);
    const gap = NEEDS.find((n) => cov[n.id].length === 0);
    if (gap) {
      // Quem resolveria: uma magia conhecida fora da hunt, ou uma da árvore ainda por aprender.
      const fits = (s: SpellId) => coverage([s])[gap.id].length > 0;
      const idle = [0, 1].flatMap((slot) => slotSpells(id, slot, talents, spellXp)).find((s) => !all.includes(s.id) && fits(s.id));
      const learn = talentTree(id).find((t) => t.spellId && talentRank(t, talents) === 0 && fits(t.spellId));
      const fix = idle
        ? `Ative ${SPELLS[idle.id].icon} ${SPELLS[idle.id].name} (slot ${SPELLS[idle.id].slot + 1}).`
        : learn ? `Aprenda ${SPELLS[learn.spellId!].icon} ${SPELLS[learn.spellId!].name} (ramo ${TREE_BRANCHES[id][learn.col]}).`
          : "Equipamento e áureas ajudam a compensar.";
      box.append(el("p", "lo-gap", `Sem ${gap.label.toLowerCase()}: ${gap.tip}. ${fix}`));
    }
    return box;
  }

  /** Uma magia conhecida do slot: ícone, nível, papéis, custo, motivo da sugestão e a chave de ativar. */
  private loadoutRow(spell: PlanSpell, on: boolean, auto: boolean, reason: string | null, full: boolean) {
    const s = SPELLS[spell.id];
    const def = TALENTS[spellTalentId(s.classId, spell.id)];
    const row = el("div", "lo-row");
    row.classList.toggle("on", on);
    row.style.setProperty("--spell-color", hex(s.color));

    const info = el("button", "lo-info");
    info.setAttribute("aria-label", `${s.name}, nível ${spell.level}: ver detalhes`);
    info.onclick = () => this.openTalentSheet(def);
    const orb = el("span", "lo-orb", s.icon);
    const text = el("span", "lo-text");
    const name = el("span", "lo-name");
    name.append(el("strong", "", s.name));
    if (spell.level >= MASTERY_RANK) name.append(el("em", "lo-mastery", "★ Maestria"));
    const pips = el("span", "gnode-pips lo-pips");
    for (let i = 0; i < SPELL_MAX_LEVEL; i++) pips.append(el("i", i < spell.level ? "on" : ""));
    const roles = el("span", "lo-roles");
    for (const r of spell.roles) roles.append(el("span", `lo-role role-${r}`, `${ROLE_INFO[r].icon} ${ROLE_INFO[r].label}`));
    const facts = [`💧 ${s.manaCost}`, `⏱ ${(s.cooldownMs / 1000).toLocaleString("pt-BR")} s`];
    if (spell.bonus > 0) facts.push(`+${Math.round(spell.bonus * 100)}% força`);
    const meta = el("small", "lo-meta muted", facts.join(" · "));
    text.append(name, pips, roles, meta);
    if (reason && !auto) text.append(el("small", "lo-reason", `✨ Sugerida: ${reason}`));
    info.append(orb, text);

    // Chave: liga e desliga na hunt. Com 3 magias ou menos no slot, todas ficam ligadas sozinhas.
    const toggle = el("button", "lo-switch");
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-checked", String(on));
    toggle.setAttribute("aria-label", `${s.name} na hunt`);
    toggle.append(el("i"));
    if (auto) {
      toggle.disabled = true;
      toggle.title = `Com ${ACTIVE_SPELLS_PER_SLOT} magias ou menos no slot, todas vão para a hunt`;
    } else {
      toggle.classList.toggle("blocked", !on && full);
      toggle.onclick = () => {
        const { talents, spellXp, activeSpells } = this.profile;
        const result = toggleActiveSpell(s.classId, spell.id, talents, spellXp, activeSpells);
        if ("error" in result) return this.toast(result.error, true);
        void this.saveLoadout(result.chosen, on ? `${s.name} fora da hunt` : `${s.name} vai para a hunt`, null);
      };
    }
    row.append(info, toggle);
    return row;
  }

  /** Grava a escolha de magias ativas na conta e redesenha; `undo` guarda a anterior para o "Desfazer". */
  private saveLoadout(next: string[], message: string, undo: { slot: number; chosen: string[] } | null) {
    return this.run(async () => {
      await setActiveSpells(next);
      this.profile.activeSpells = next;
      this.loadoutUndo = undo;
      this.toast(message);
    });
  }

  // --- Grimório ---------------------------------------------------------------

  /**
   * O Grimório desenhado como uma árvore de verdade, um ramo por tela: a raiz (magia inicial do slot 1) no alto,
   * o tronco do ramo descendo no meio e as costelas para os lados, ligados por galhos. Tocar abre os detalhes.
   */
  private renderTree() {
    const page = el("div", "hub-page");
    page.append(el("h2", "", "Grimório"));

    // Um botão por personagem, com o retrato vestido e a cor da classe.
    page.append(this.heroPicks(this.classId, (id) => this.pickClass(id)));

    const tree = talentTree(this.classId);
    const ranks = this.profile.talents;
    const xp = this.profile.spellXp;

    // Um ramo por tela, como as abas do Diablo 2: a raiz no alto, o tronco no meio e as costelas para os lados.
    // Cada aba é o símbolo do ramo; o nome do ramo aberto fica no título acima da árvore.
    const col = this.treeBranch;
    const tabs = el("div", "grim-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.style.setProperty("--class-color", hex(CLASSES[this.classId].color));
    const branchName = TREE_BRANCHES[this.classId];
    const counts = branchName.map((_, c) => {
      const branch = tree.filter((t) => t.col === c && t.kind === "spell" && t.row > 0);
      return { owned: branch.filter((t) => talentRank(t, ranks) > 0).length, total: branch.length, spec: tree.some((t) => t.col === c && t.side !== undefined) };
    });
    branchName.forEach((name, c) => {
      const { owned, total, spec } = counts[c];
      const tab = el("button", "grim-tab");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(c === col));
      tab.setAttribute("aria-label", `${name}${spec ? ", com especialização" : ""}: ${owned} de ${total} magias`);
      const emblem = el("span", "grim-tab-emblem");
      emblem.append(branchIcon(this.classId, c));
      tab.append(emblem, el("small", "", `${owned}/${total}`));
      tab.onclick = () => { this.treeBranch = c; this.render(); };
      tabs.append(tab);
    });
    page.append(tabs);
    const title = el("h3", "grim-branch-title", `${branchName[col]}${counts[col].spec ? " ✦" : ""}`);
    page.append(title);

    const shown = tree.filter((t) => t.col === col || t.row === 0);
    const xOf = (def: TalentDef) => 0.5 + def.lane * 0.2;
    const rows = Math.max(...shown.map((t) => t.row)) + 1;
    const grim = el("div", "grimoire");
    grim.style.setProperty("--rows", String(rows));
    grim.style.setProperty("--class-color", hex(CLASSES[this.classId].color));

    // Galhos: SVG atrás dos nós, em unidades de 300 na largura × pixels de linha.
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("class", "grim-links");
    svg.setAttribute("viewBox", `0 0 300 ${rows * GRIM_ROW}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const link = (parent: TalentDef, child: TalentDef, state: string, also: boolean) => {
      const x0 = xOf(parent) * 300;
      const y0 = parent.row * GRIM_ROW + GRIM_ORB / 2;
      const x1 = xOf(child) * 300;
      const y1 = child.row * GRIM_ROW + GRIM_ORB / 2;
      // O galho se divide logo abaixo do nome do pai, antes do nó filho.
      const mid = parent.row * GRIM_ROW + GRIM_NODE + ((child.row - parent.row) * GRIM_ROW - GRIM_NODE) / 2;
      const path = document.createElementNS(svgNs, "path");
      // O segundo pai liga em diagonal reta, para não se confundir com os galhos do ramo.
      path.setAttribute("d", also ? `M${x0} ${y0} L${x1} ${y1}` : x0 === x1 ? `M${x0} ${y0} V${y1}` : `M${x0} ${y0} V${mid} H${x1} V${y1}`);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      if (state) path.classList.add(state);
      if (also) path.classList.add("also");
      svg.append(path);
    };
    for (const def of shown) {
      const state = talentRank(def, ranks) > 0 ? "on" : talentBlocker(def, ranks, xp) ? "" : "open";
      for (const req of [def.requires, def.alsoRequires]) {
        const parent = req && shown.find((t) => t.id === req.id);
        if (parent) link(parent, def, state, req === def.alsoRequires);
      }
    }
    grim.append(svg);

    for (const def of shown) {
      const node = this.grimNode(def);
      node.style.left = `${xOf(def) * 100}%`;
      node.style.top = `${def.row * GRIM_ROW}px`;
      grim.append(node);
    }
    page.append(grim);
    return page;
  }

  /** Barra do XP de uso de uma magia comprada até o próximo nível. */
  private spellXpBar(progress: { level: number; into: number; need: number }) {
    const box = el("div", "grim-xp");
    const bar = el("div", "grim-xp-bar");
    const fill = el("i");
    fill.style.width = `${progress.need > 0 ? Math.min(100, (progress.into / progress.need) * 100) : 100}%`;
    bar.append(fill);
    box.append(bar, el("small", "muted", progress.need > 0
      ? `${progress.into}/${progress.need} XP para o nível ${progress.level + 1} · morrer tira ${Math.round(DEATH_SPELL_XP_LOSS * 100)}% do XP (nunca abaixo do nível 1)`
      : "Nível máximo"));
    return box;
  }

  /** O Traço de um lado de um ramo especializado. */
  private specTrait(classId: ClassId, col: number, side: 0 | 1) {
    return talentTree(classId).find((t) => t.kind === "trait" && t.col === col && t.side === side) ?? null;
  }

  private grimNode(def: TalentDef) {
    const ranks = this.profile.talents;
    const rank = talentRank(def, ranks);
    const blocker = talentBlocker(def, ranks, this.profile.spellXp);
    const spell = def.spellId ? SPELLS[def.spellId] : null;
    // Magia: as bolinhas são o nível de uso (0 a 5); comprada, ela não tem mais nada à venda.
    const level = spell && rank > 0 ? nodeLevel(def, ranks, this.profile.spellXp) : 0;
    const pipCount = spell ? SPELL_MAX_LEVEL : def.maxRank;
    const pipOn = spell ? level : rank;
    const maxed = spell ? level >= SPELL_MAX_LEVEL : rank >= def.maxRank;
    const locked = !!blocker && rank < def.maxRank;
    const affordable = !blocker && this.profile.gold >= talentCost(def, rank);

    const node = el("button", `gnode ${def.kind}`);
    node.classList.toggle("owned", rank > 0);
    node.classList.toggle("maxed", maxed);
    node.classList.toggle("locked", locked);
    node.classList.toggle("ready", affordable);
    node.setAttribute("aria-label", `${def.name}, ${spell && rank === 0 ? "não aprendida" : `nível ${pipOn} de ${pipCount}`}${locked ? `, ${blocker}` : ""}`);

    // O Traço é um losango: o ícone vai num span que desfaz a rotação.
    const orb = el("span", "gnode-orb");
    orb.append(def.kind === "trait" ? el("span", "gnode-icon", def.icon) : def.icon);
    if (spell) orb.append(el("b", "gnode-slot", String(spell.slot + 1)));
    if (locked) orb.append(el("b", "gnode-lock", "🔒"));
    // Ativa: vai para a escolha do slot na hunt (até 3 por slot).
    if (spell && rank > 0 && this.isActive(def)) {
      node.classList.add("active");
      orb.append(el("b", "gnode-active", "✔"));
    }
    // Com muitos níveis (Dons, áureas e Tomos), as bolinhas viram o número: "7/25".
    const pips = el("span", "gnode-pips");
    if (pipCount > SPELL_MAX_LEVEL) pips.append(el("b", "gnode-rank", `${pipOn}/${pipCount}`));
    else for (let i = 0; i < pipCount; i++) pips.append(el("i", i < pipOn ? "on" : ""));
    // O losango do Traço leva o nome da especialização (Criomante, Arcanista...); o do Traço fica na ficha.
    node.append(orb, pips, el("span", "gnode-name", def.traitId ? TRAITS[def.traitId].spec : def.name));
    node.onclick = () => this.openTalentSheet(def);
    return node;
  }

  /** A magia está entre as que vão para a escolha do slot na hunt (ativas no Grimório, até 3 por slot)? */
  private isActive(def: TalentDef) {
    const spell = SPELLS[def.spellId!];
    const { talents, spellXp, activeSpells } = this.profile;
    return activeSlotSpells(def.classId, spell.slot, talents, spellXp, activeSpells).includes(spell.id);
  }

  /**
   * Na ficha da magia aprendida: se ela vai para a hunt e o botão de ativar ou desativar. Até 3 magias no slot, todas
   * ficam ativas sozinhas e o botão não aparece.
   */
  private activeToggle(def: TalentDef): HTMLElement[] {
    const spell = SPELLS[def.spellId!];
    const { talents, spellXp, activeSpells } = this.profile;
    const slotLabel = `slot ${spell.slot + 1}`;
    const known = knownSpells(def.classId, talents).filter((id) => SPELLS[id].slot === spell.slot);
    if (known.length <= ACTIVE_SPELLS_PER_SLOT) {
      return [el("p", "node-state grim-active-note",
        `✔ Ativa na hunt: com ${ACTIVE_SPELLS_PER_SLOT} magias ou menos no ${slotLabel}, todas aparecem na escolha.`)];
    }
    const active = activeSlotSpells(def.classId, spell.slot, talents, spellXp, activeSpells);
    const on = active.includes(spell.id);
    const note = el("p", "node-state grim-active-note",
      `${on ? "✔ Ativa" : "Fora"} da hunt · ${active.length}/${ACTIVE_SPELLS_PER_SLOT} ativas no ${slotLabel} ` +
      `(você tem ${known.length}; só as ativas aparecem na escolha)`);
    const button = el("button", on ? "" : "primary", on ? "Desativar na hunt" : "Ativar na hunt");
    button.onclick = () => {
      const result = toggleActiveSpell(def.classId, spell.id, talents, spellXp, activeSpells);
      if ("error" in result) return this.toast(result.error, true);
      void this.run(async () => {
        await setActiveSpells(result.chosen);
        this.profile.activeSpells = result.chosen;
        this.toast(on ? `${def.name} fora da hunt` : `${def.name} ativa na hunt`);
      }).then(() => this.openTalentSheet(def));
    };
    return [note, button];
  }

  /** Na ficha da magia: de quem vem a sinergia (as vizinhas na árvore, com o nível de cada) e a força extra de hoje. */
  private synergyNote(def: TalentDef, synergy: number, tome: number) {
    const levels = spellRanks(def.classId, this.profile.talents, this.profile.spellXp);
    const names = spellNeighbors(def.classId, def.spellId!).map((id) => {
      const level = levels[id];
      return `${SPELLS[id].name} (${level === undefined ? "não aprendida" : `nível ${level}`})`;
    });
    const pct = (v: number) => `+${Math.round(v * 100)}%`;
    const parts = [synergy > 0 ? `${pct(synergy)} de sinergia` : "", tome > 0 ? `${pct(tome)} do Tomo` : ""].filter(Boolean);
    const note = el("p", "muted grim-synergy");
    note.textContent = `Sinergia: ${pct(SYNERGY_PER_LEVEL)} de força por nível de ${names.join(", ") || "nenhuma vizinha"}. ` +
      (parts.length > 0 ? `Hoje: ${parts.join(" e ")}.` : "Hoje: nenhuma força extra.");
    return note;
  }

  /** Detalhes de um nó: o que faz no nível atual e no próximo, o pré-requisito e a compra. */
  private openTalentSheet(def: TalentDef) {
    const ranks = this.profile.talents;
    const rank = talentRank(def, ranks);
    const blocker = talentBlocker(def, ranks, this.profile.spellXp);
    const maxed = rank >= def.maxRank;
    const spell = def.spellId ? SPELLS[def.spellId] : null;
    // Magia comprada: o nível vem do XP de uso nas hunts.
    const spellXp = spell && rank > 0 ? spellXpOf(def, this.profile.spellXp) : 0;
    const progress = spellLevelProgress(spellXp);
    // Sinergias e Tomo: os números dos níveis já vêm com a força extra que a conta tem hoje.
    const bonus = spell
      ? spellBonus(def.classId, spell.id, ranks, spellRanks(def.classId, ranks, this.profile.spellXp))
      : { synergy: 0, tome: 0, total: 0 };
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
      el("small", "muted", `${spell ? `Magia · slot ${spell.slot + 1}` : trait ? "Traço" : def.giftId ? "Dom" : def.tome ? "Tomo" : "Áurea"} · ${spec ? `${spec} · ` : ""}ramo ${branch}${trait ? "" : spell ? (rank > 0 ? ` · nível ${progress.level}/${SPELL_MAX_LEVEL}` : " · não aprendida") : ` · nível ${rank}/${def.maxRank}`}`),
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
    if (def.giftId) {
      sheet.append(el("p", "", GIFTS[def.giftId].description));
      sheet.append(el("p", "muted", "Dom: passiva comprada só com gold, sem XP. Vale em toda hunt e não cai na morte."));
    }
    if (spell) {
      sheet.append(el("p", "", spell.description));
      if (progress.level < MASTERY_RANK) sheet.append(el("p", "muted", `★ Maestria no nível ${MASTERY_RANK}: ${MASTERIES[spell.id].text}`));
      if (rank > 0) sheet.append(this.spellXpBar(progress));
      sheet.append(this.synergyNote(def, bonus.synergy, bonus.tome));
    }

    const levels = el("div", "grim-levels");
    const level = (n: number, current: boolean) => {
      const box = el("div", `grim-level${current ? " current" : ""}`);
      box.append(el("strong", "", `Nível ${n}${current ? " (atual)" : ""}`));
      const lines = spell ? spellFacts(spell, n, bonus.total) : [auraText(def, n)];
      const list = el("ul");
      for (const line of lines) list.append(el("li", "", line));
      box.append(list);
      levels.append(box);
    };
    // O Traço não tem níveis: a descrição já diz o que ele faz.
    if (spell) {
      // Não aprendida: o que ela faz ao comprar (nível 0). Aprendida: o nível atual e o próximo.
      level(progress.level, rank > 0);
      if (rank > 0 && progress.level < SPELL_MAX_LEVEL) level(progress.level + 1, false);
      sheet.append(levels);
    } else if (!trait) {
      if (rank > 0) level(rank, true);
      if (!maxed) level(rank + 1, false);
      sheet.append(levels);
    }

    const actions = el("div", "actions");
    if (spell && rank > 0) {
      actions.append(...this.activeToggle(def));
      actions.append(el("p", "node-state", progress.level >= SPELL_MAX_LEVEL ? "Nível máximo" : "Use nas hunts para subir de nível"));
    } else if (maxed) {
      actions.append(el("p", "node-state", trait ? `Você é ${trait.spec}` : "Nível máximo"));
    } else if (blocker) {
      actions.append(el("p", "node-state", `🔒 ${blocker}`));
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
        this.toast(trait ? `Agora você é ${trait.spec}!` : spell ? `${def.name} aprendida! Use nas hunts para subir de nível.` : `${def.name} nível ${rank + 1}!`);
      }).then(() => this.openTalentSheet(def));
      buy.onclick = () => {
        if (confirmed) return purchase();
        confirmed = true;
        buy.textContent = `Confirmar: ${trait!.spec} para sempre`;
        buy.classList.add("danger");
      };
      actions.append(buy);
      // Muitos níveis (Dons, áureas e Tomos): compra até 5 de uma vez, com o preço somado.
      const many = Math.min(5, def.maxRank - rank);
      if (!spell && !trait && def.maxRank > SPELL_MAX_LEVEL && many > 1) {
        const total = Array.from({ length: many }, (_, i) => talentCost(def, rank + i)).reduce((a, b) => a + b, 0);
        const bulk = el("button", "", `+${many} níveis · ${gold(total)}`);
        bulk.disabled = this.profile.gold < total;
        bulk.onclick = () => void this.run(async () => {
          this.profile.gold = await buyTalentLevels(def.id, many);
          this.profile.talents[def.id] = rank + many;
          this.toast(`${def.name} nível ${rank + many}!`);
        }).then(() => this.openTalentSheet(def));
        actions.append(bulk);
      }
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
      `Cada classe tem o próprio equipamento: este é o do ${CLASSES[this.classId].name}. Ele e a bag entram com você na hunt. Quem foge volta vestido e esvazia a bag no cofre; quem morre perde os dois.`));

    // Quadro do equipamento como no Tibia (cada slot no lugar do corpo) ao lado do herói vestido.
    const loadout = el("div", "loadout");
    loadout.innerHTML = BODY_SVG;
    const equipped: string[] = [];
    for (const slot of ITEM_SLOTS) {
      const owned = this.wornItems().find((i) => ITEMS[i.itemId]?.slot === slot);
      const cell = el("button", `loadout-slot at-${slot}`);
      cell.append(el("span", "slot-tag", SLOT_NAMES[slot]));
      if (owned) {
        const def = ITEMS[owned.itemId];
        cell.append(itemImg(owned.itemId));
        cell.style.borderColor = hex(itemColor(owned.itemId));
        cell.title = def.name;
        equipped.push(owned.itemId);
        cell.setAttribute("aria-label", `${SLOT_NAMES[slot]}: ${def.name}`);
        cell.onclick = () => this.openItemSheet(owned);
      } else {
        cell.append(ghostImg(slot));
        cell.classList.add("vacant");
        cell.setAttribute("aria-label", `${SLOT_NAMES[slot]} (vazio)`);
        cell.onclick = () => this.toast(`Toque num item do cofre para equipar ${SLOT_NAMES[slot].toLowerCase()}.`);
      }
      loadout.append(cell);
    }
    // Runas: até 3 diferentes, nos cantos livres do quadro (em cima dos dois lados e embaixo da arma).
    const equippedRunes = this.equippedRunes();
    for (let i = 0; i < RUNE_SLOTS; i++) {
      const owned = equippedRunes[i];
      const cell = el("button", `loadout-slot rune-slot at-rune${i + 1}`);
      if (owned) {
        const rune = RUNES[owned.itemId];
        cell.append(itemImg(owned.itemId), el("span", "slot-tag", rune.name));
        cell.style.borderColor = hex(lootColor(owned.itemId));
        cell.title = rune.name;
        cell.setAttribute("aria-label", `Runa ${i + 1}: ${rune.name}`);
        cell.onclick = () => this.openItemSheet(owned);
      } else {
        cell.append(el("span", "slot-empty", "ᚱ"), el("span", "slot-tag", "Runa"));
        cell.classList.add("vacant");
        cell.setAttribute("aria-label", `Runa ${i + 1} (vazia)`);
        cell.onclick = () => this.toast("Runas caem dos bosses. Toque numa runa do cofre para equipar.");
      }
      loadout.append(cell);
    }
    const gear = gearStats(equipped);
    const stats = el("div", "equip-stats");
    stats.append(
      el("span", "", `🛡️ Armadura ${gear.armor}${gear.armor ? ` (−${Math.round(damageReduction(gear.armor) * 100)}% de dano)` : ""}`),
      el("span", "", `⚔️ Dano +${Math.round(gear.damage * 100)}%`),
    );
    if (gear.spellPower) stats.append(el("span", "", `✨ Magias +${Math.round(gear.spellPower * 100)}%`));
    stats.append(el("span", "", `ᚱ Runas ${equippedRunes.length}/${RUNE_SLOTS}`));
    const panel = el("div", "equip-panel");
    panel.append(el("div", "equip-title", "Equipamento"), loadout, stats);
    const hero = el("div", "equip-hero");
    hero.append(heroColumn(this.classId, this.loadout()), el("small", "muted", CLASSES[this.classId].name));
    const row = el("div", "equip-row");
    row.append(panel, hero);
    page.append(el("h3", "", "Para a próxima hunt"), row);

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

  /** Equipamento da classe escolhida. */
  private wornItems(classId: ClassId = this.classId) {
    return this.profile.items.filter((i) => i.equipped && i.classId === classId);
  }

  /** Itens no cofre (o equipamento, de qualquer classe, não ocupa espaço). */
  private vaultItems() {
    return this.profile.items.filter((i) => i.location === "vault" && !i.equipped);
  }

  private bagItems() {
    return this.profile.items.filter((i) => i.location === "bag");
  }

  /** Runas da classe escolhida para a próxima hunt. */
  private equippedRunes() {
    return this.wornItems().filter((i) => RUNES[i.itemId]);
  }

  private itemCell(owned: OwnedItem, onclick: () => void) {
    const cell = el("button", "item-cell");
    cell.style.borderColor = hex(lootColor(owned.itemId));
    // Runa serve em qualquer classe.
    cell.classList.toggle("unusable", !!ITEMS[owned.itemId] && !canUse(owned.itemId, this.classId));
    cell.append(itemImg(owned.itemId));
    cell.setAttribute("aria-label", lootName(owned.itemId));
    cell.onclick = onclick;
    return cell;
  }

  private openItemSheet(owned: OwnedItem) {
    const rune = RUNES[owned.itemId];
    if (rune) return this.openRuneSheet(owned, rune);
    const def = ITEMS[owned.itemId];
    const sheet = $("sheet");
    sheet.replaceChildren();
    const head = el("div", "sheet-head");
    const title = el("div");
    const name = el("strong", "", def.name);
    name.style.color = hex(itemColor(def.id));
    title.append(name, el("small", "muted", itemLabel(def)));
    head.append(itemImg(def.id), title);
    sheet.append(head, statList(def));
    const usable = canUse(def.id, this.classId);
    if (!usable) sheet.append(el("p", "warn", `${CLASSES[this.classId].name} não usa este item.`));
    // Vestido pela classe escolhida ou por outra (cada classe tem os próprios slots).
    const worn = owned.equipped && owned.classId === this.classId;
    const wearer = owned.equipped && owned.classId && !worn ? CLASSES[owned.classId].name : null;
    // Como fica vestido: o equipamento atual com este item no slot dele.
    const tryOn = el("div", "doll");
    tryOn.append(outfitPreview(this.classId, { ...this.loadout(), [def.slot]: def.id }),
      el("small", "muted", worn ? "Vestido" : "Como fica vestido"));
    sheet.append(tryOn);
    const where = owned.equipped ? `Equipado no ${wearer ?? CLASSES[this.classId].name}` : owned.location === "bag" ? "Na bag" : "No cofre";
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
      const label = worn ? (vaultFull ? "Cofre cheio" : "Tirar do equipamento")
        : !usable ? "Não serve nesta classe"
        : wearer ? `Passar para o ${CLASSES[this.classId].name}` : "Equipar para a hunt";
      main = el("button", "primary", label);
      // Tirar do equipamento devolve o item ao cofre; trocar no slot (ou de classe) não muda a lotação.
      main.disabled = worn ? vaultFull : !usable;
      main.onclick = () => this.run(async () => {
        const classId = this.classId;
        await equipItem(owned.id, !worn, classId);
        for (const other of this.profile.items) {
          if (other.id === owned.id) {
            other.equipped = !worn;
            other.classId = worn ? null : classId;
          } else if (!worn && other.equipped && other.classId === classId && ITEMS[other.itemId]?.slot === def.slot) {
            other.equipped = false;
            other.classId = null;
          }
        }
        this.closeSheet();
      });
    }
    const sell = el("button", "", `Vender por ${gold(sellPrice(def.id))}`);
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

  /** Ficha de uma runa: o que ela faz, equipar num dos 3 slots da classe (sem repetir), guardar e vender. */
  private openRuneSheet(owned: OwnedItem, rune: RuneDef) {
    const sheet = $("sheet");
    sheet.replaceChildren();
    const head = el("div", "sheet-head");
    const title = el("div");
    const name = el("strong", "", rune.name);
    name.style.color = hex(rune.color);
    title.append(name, el("small", "muted", rune.master ? "Runa Mestra" : rune.spell ? "Runa de magia" : "Runa"));
    head.append(itemImg(owned.itemId), title);
    sheet.append(head, el("p", "", `${rune.icon} ${runeEffect(rune)}`));
    sheet.append(el("p", "muted", rune.master
      ? "Muda o jeito de jogar e cobra um preço. Só uma Mestra vale entre as 3 runas equipadas."
      : rune.spell
        ? "A magia aparece como opção extra quando o slot dela abrir na hunt, para qualquer classe."
        : "O bônus vale a hunt inteira e soma com as áureas e as melhorias de nível."));
    // Equipada na classe escolhida ou em outra (cada classe tem os próprios 3 slots).
    const worn = owned.equipped && owned.classId === this.classId;
    const wearer = owned.equipped && owned.classId && !worn ? CLASSES[owned.classId].name : null;
    const where = owned.equipped ? `Equipada no ${wearer ?? CLASSES[this.classId].name}` : owned.location === "bag" ? "Na bag" : "No cofre";
    sheet.append(el("p", "muted", `${where} · runas equipadas voltam com você mesmo se morrer; na bag, se perdem.`));

    const actions = el("div", "actions");
    const vaultFull = this.vaultItems().length >= VAULT_SIZE;
    let main: HTMLButtonElement;
    if (owned.location === "bag") {
      main = el("button", "primary", vaultFull ? "Cofre cheio" : "Guardar no cofre");
      main.disabled = vaultFull;
      main.onclick = () => this.run(async () => {
        await storeItem(owned.id);
        owned.location = "vault";
        this.toast(`${rune.name} foi para o cofre.`);
        this.closeSheet();
      });
    } else if (worn) {
      main = el("button", "primary", vaultFull ? "Cofre cheio" : "Tirar a runa");
      main.disabled = vaultFull;
      main.onclick = () => this.run(async () => {
        await equipItem(owned.id, false, this.classId);
        owned.equipped = false;
        owned.classId = null;
        this.closeSheet();
      });
    } else {
      const equipped = this.equippedRunes();
      const same = equipped.some((i) => i.itemId === owned.itemId);
      const full = equipped.length >= RUNE_SLOTS;
      const otherMaster = !!rune.master && equipped.some((i) => RUNES[i.itemId]?.master);
      main = el("button", "primary", same ? "Já equipada" : full ? "Slots de runa cheios" : otherMaster ? "Já há uma Mestra equipada"
        : wearer ? `Passar para o ${CLASSES[this.classId].name}` : "Equipar runa");
      main.disabled = same || full || otherMaster;
      main.onclick = () => this.run(async () => {
        const classId = this.classId;
        await equipItem(owned.id, true, classId);
        owned.equipped = true;
        owned.classId = classId;
        this.toast(`${rune.name} equipada no ${CLASSES[classId].name}.`);
        this.closeSheet();
      });
    }
    const sell = el("button", "", `Vender por ${gold(rune.sellPrice)}`);
    sell.onclick = () => this.run(async () => {
      this.profile.gold = await sellItem(owned.id);
      this.profile.items = this.profile.items.filter((i) => i.id !== owned.id);
      this.toast(`${rune.name} vendida.`);
      this.closeSheet();
    });
    const close = el("button", "", "Fechar");
    close.onclick = () => this.closeSheet();
    actions.append(main, sell, close);
    sheet.append(actions);
    $("sheet").hidden = false;
    $("sheet-backdrop").hidden = false;
  }

  /** Equipamento de `classId` (por padrão, a escolhida para a próxima hunt) como roupa do personagem. */
  private loadout(classId: ClassId = this.classId): Outfit {
    const outfit = { ...NO_OUTFIT };
    for (const owned of this.wornItems(classId)) {
      const def = ITEMS[owned.itemId];
      if (def) outfit[def.slot] = def.id;
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
        : `Itens comuns até Mithral, entregues no cofre. Raros, mágicos e de Dragão só saem das hunts. Mostrando o que o ${CLASSES[this.classId].name} usa.`));
      const slots = el("div", "chips");
      for (const slot of ITEM_SLOTS) {
        const chip = el("button", "chip", SLOT_NAMES[slot]);
        chip.setAttribute("aria-pressed", String(slot === this.marketSlot));
        chip.onclick = () => { this.marketSlot = slot; this.render(); };
        slots.append(chip);
      }
      page.append(slots);
      const families = Object.values(ITEM_FAMILIES).filter((f) => f.slot === this.marketSlot && (!f.classes || f.classes.includes(this.classId)));
      for (const family of families) {
        if (families.length > 1) list.append(el("h3", "", family.name));
        for (const tier of ITEM_TIERS) {
          const def = ITEMS[itemId(family.slot, family.key, tier)];
          const price = ITEM_BUY_PRICES[tier];
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
      page.append(el("p", "muted hub-hint", "O mercado compra qualquer item ou runa sua: equipado, no cofre ou na bag. Runas não são vendidas aqui: só caem dos bosses."));
      if (this.profile.items.length === 0) list.append(el("p", "muted empty", "Nada para vender."));
      for (const owned of sortItems(this.profile.items)) {
        const sell = el("button", "buy", gold(lootSellPrice(owned.itemId)));
        sell.onclick = () => this.run(async () => {
          this.profile.gold = await sellItem(owned.id);
          this.profile.items = this.profile.items.filter((i) => i.id !== owned.id);
          this.toast(`${lootName(owned.itemId)} vendido.`);
        });
        const note = owned.equipped && owned.classId ? `Equipado no ${CLASSES[owned.classId].name}` : owned.location === "bag" ? "Na bag" : "";
        const rune = RUNES[owned.itemId];
        list.append(rune ? this.runeRow(rune, sell, note) : this.marketRow(ITEMS[owned.itemId], sell, note));
      }
    }
    page.append(list);
    return page;
  }

  private marketRow(def: ItemDef, action: HTMLButtonElement, note = "") {
    const row = el("div", "market-row");
    const text = el("div");
    const name = el("strong", "", def.name);
    name.style.color = hex(itemColor(def.id));
    text.append(name, el("small", "muted", `${itemLabel(def)} · ${itemEffect(def)}${note ? ` · ${note}` : ""}`));
    row.append(itemImg(def.id), text, action);
    return row;
  }

  private runeRow(rune: RuneDef, action: HTMLButtonElement, note = "") {
    const row = el("div", "market-row");
    const text = el("div");
    const name = el("strong", "", rune.name);
    name.style.color = hex(rune.color);
    text.append(name, el("small", "muted", `${rune.master ? "Runa Mestra" : "Runa"} · ${runeEffect(rune)}${note ? ` · ${note}` : ""}`));
    row.append(itemImg(rune.id), text, action);
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
  return itemSummary(def);
}

const CLASS_NAMES = Object.fromEntries(CLASS_IDS.map((id) => [id, CLASSES[id].name])) as Record<ClassId, string>;

/** "Arma · Raro · Ferro · Só Cavaleiro". */
export function itemLabel(def: ItemDef) {
  return `${SLOT_NAMES[def.slot]} · ${RARITY_NAMES[def.rarity]} · ${TIER_NAMES[def.tier]} · ${classesText(def, CLASS_NAMES)}`;
}

/** Lista do que o item faz, uma linha por atributo. */
export function statList(def: ItemDef) {
  const list = el("ul", "item-stats");
  for (const line of describeStats(def.stats)) list.append(el("li", "", line));
  return list;
}

/** Runas primeiro (as de magia na frente); depois os itens, melhores primeiro (material e raridade) e, empatados, na ordem dos slots. */
function sortItems(items: OwnedItem[]) {
  const runeKey = (id: string) => RUNES[id] ? -RUNES[id].sellPrice * 100 + Object.keys(RUNES).indexOf(id) : 0;
  return [...items].sort((a, b) => {
    const ra = RUNES[a.itemId], rb = RUNES[b.itemId];
    if (ra || rb) return ra && rb ? runeKey(a.itemId) - runeKey(b.itemId) : ra ? -1 : 1;
    const x = ITEMS[a.itemId], y = ITEMS[b.itemId];
    return itemScore(y.id) - itemScore(x.id) || ITEM_SLOTS.indexOf(x.slot) - ITEM_SLOTS.indexOf(y.slot);
  });
}

/** Papéis de uma magia em texto curto ("Área, Controle"). */
function spellRolesText(s: SpellDef) {
  return spellRoles(s).map((r) => ROLE_INFO[r].label).join(", ");
}

function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* armazenamento indisponível */ }
}
