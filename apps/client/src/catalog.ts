import {
  CHAMPION_CHANCE,
  CHAMPION_HP,
  CHAMPION_REWARD,
  CLASSES,
  CREATURE_TYPES,
  DAMAGE_ELEMENTS,
  CROWD_PER_DEPTH,
  ELEMENT_NAMES,
  ITEMS,
  ITEM_BUY_PRICES,
  ITEM_FAMILIES,
  ITEM_RARITIES,
  ITEM_SLOTS,
  ITEM_TIERS,
  LEGENDARIES,
  LEGENDARY_IDS,
  LUCKY_TIER_CHANCE,
  MAPS,
  MAP_IDS,
  MAX_TIER,
  MONSTERS,
  POTIONS,
  POTION_IDS,
  RANK_TIER_BONUS,
  RARITY_CHANCES,
  RARITY_COLORS,
  RARITY_NAMES,
  RUNES,
  RUNE_IDS,
  SLOT_NAMES,
  TIER_NAMES,
  buyPrice,
  chestItemChance,
  chestPotionChance,
  classesText,
  describeStats,
  dropOdds,
  elementMultiplier,
  itemId,
  lootSellPrice,
  mapMonsters,
  monsterPower,
  monsterStats,
  runeEffect,
  type ClassId,
  type MapDef,
  type MonsterKind,
  type MonsterRank,
} from "@kusa/shared";
import { itemIcon } from "./art/items.ts";

// Configurações > Catálogo: todo item (equipamento, runa e poção) e todo inimigo, com o que cada um larga.
// Tudo sai de `@kusa/shared` (catálogos e `dropOdds`), então item, runa, monstro ou mapa novo aparece aqui
// sozinho, com os números da versão que está no ar. O teste `catalogo` confere as chances contra a hunt.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const pct = (v: number) => {
  const p = v * 100;
  return `${p >= 10 || Number.isInteger(p) ? Math.round(p) : p.toFixed(1).replace(".", ",")}%`;
};
const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
const CLASS_NAMES = Object.fromEntries(Object.entries(CLASSES).map(([id, c]) => [id, c.name])) as Record<ClassId, string>;
const RANK_LABELS: Record<MonsterRank, string> = { common: "Comum", miniboss: "Mini-boss", boss: "Boss" };

/** Seção que abre e fecha com um toque (a mesma das Regras). */
function section(title: string, ...content: HTMLElement[]) {
  const details = el("details", "rule");
  details.append(el("summary", "", title), ...content);
  return details;
}

/**
 * Uma ficha do catálogo: ícone (opcional), nome, linha de detalhe e frases. O texto inteiro vai para a busca.
 */
function entry(opts: { icon?: HTMLCanvasElement; name: string; color?: string; meta: string; lines: string[] }) {
  const card = el("div", "cat-entry");
  if (opts.icon) {
    const img = el("img");
    img.src = opts.icon.toDataURL();
    img.alt = "";
    card.append(img);
  }
  const body = el("div");
  const name = el("b", "", opts.name);
  if (opts.color) name.style.color = opts.color;
  body.append(name, el("small", "", opts.meta));
  for (const line of opts.lines) body.append(el("p", "", line));
  card.append(body);
  card.dataset.search = [opts.name, opts.meta, ...opts.lines].join(" ").toLowerCase();
  return card;
}

function note(text: string) {
  return el("p", "cat-note", text);
}

// --- Equipamento -------------------------------------------------------------

function equipment() {
  return section("⚔️ Equipamentos",
    note(`Cada família tem ${ITEM_TIERS.length} materiais (${ITEM_TIERS.map((t) => TIER_NAMES[t]).join(", ")}) e 3 raridades. `
      + "O raro (+1) é mais forte; o mágico tem nome próprio e uma propriedade a mais. "
      + `Os ${LEGENDARIES.length} lendários são peças únicas de Dragão, bem mais fortes, e os de classe fortalecem magias específicas.`),
    section("★ Lendários", ...LEGENDARY_IDS.map((id) => {
      const def = ITEMS[id];
      return entry({
        icon: itemIcon(id), name: def.name, color: hex(RARITY_COLORS.legendary),
        meta: `${SLOT_NAMES[def.slot]} · ${classesText(def, CLASS_NAMES)} · só na hunt · venda ${lootSellPrice(id)} gold`,
        lines: [def.lore!, ...describeStats(def.stats)],
      });
    })),
    ...ITEM_SLOTS.map((slot) => section(SLOT_NAMES[slot],
      ...Object.entries(ITEM_FAMILIES).filter(([, f]) => f.slot === slot).map(([, f]) => {
        const first = ITEMS[itemId(f.slot, f.key, 1)];
        const family = el("div", "cat-group");
        family.append(el("h4", "", `${f.name} · ${classesText(first, CLASS_NAMES)}`));
        for (const tier of ITEM_TIERS) for (const rarity of ITEM_RARITIES) {
          const id = itemId(f.slot, f.key, tier, rarity);
          const def = ITEMS[id];
          const buy = buyPrice(id);
          family.append(entry({
            icon: itemIcon(id), name: def.name, color: hex(RARITY_COLORS[rarity]),
            meta: `${TIER_NAMES[tier]} · ${RARITY_NAMES[rarity]} · ${buy == null ? "só na hunt" : `compra ${buy}`} · venda ${lootSellPrice(id)} gold`,
            lines: describeStats(def.stats),
          }));
        }
        return family;
      }))),
  );
}

// --- Runas e poções ------------------------------------------------------------

function runes() {
  const total = RUNE_IDS.reduce((sum, id) => sum + RUNES[id].weight, 0);
  return section("🔮 Runas",
    note("Só os bosses dão runa: uma por boss e personagem, direto na bag. Equipe até 3 no menu Itens. "
      + "No Mar de Areia, a runa sai dos baús atrás do Verme da Areia, à escolha. O mercado não vende runas."),
    ...RUNE_IDS.map((id) => {
      const r = RUNES[id];
      return entry({
        icon: itemIcon(id), name: `${r.icon} ${r.name}`, color: hex(r.color),
        meta: `${r.spell ? "Magia" : "Bônus"} · chance no sorteio ${pct(r.weight / total)} · venda ${r.sellPrice} gold`,
        lines: [runeEffect(r)],
      });
    }),
  );
}

function potions() {
  return section("🧪 Poções",
    note("Só caem dos monstros e baús e valem só na hunt."),
    ...POTION_IDS.map((id) => {
      const p = POTIONS[id];
      return entry({
        icon: itemIcon(id), name: `${p.icon} ${p.name}`, color: hex(p.color),
        meta: "Consumível · só na hunt",
        lines: [`Devolve ${pct(p.restore)} da ${p.stat === "hp" ? "vida" : "mana"} máxima.`],
      });
    }),
  );
}

// --- Inimigos ----------------------------------------------------------------

/** O que o monstro larga no mapa, em frases curtas. */
function dropLines(map: MapDef, kind: MonsterKind) {
  const odds = dropOdds(map, kind);
  if (odds.nothing) {
    return [MONSTERS[kind].traits?.illusion ? "Drops: nenhum (é uma ilusão)." : "Drops: nenhum (só aparece chamado por outro monstro)."];
  }
  const rarity = `raro ${pct(odds.rarity.rare)}, mágico ${pct(odds.rarity.magic)}, lendário ${pct(odds.rarity.legendary)}`;
  const items = odds.itemChance >= 1
    ? `${odds.items} ${odds.items === 1 ? "item garantido" : "itens garantidos"}`
    : odds.items === 1 ? `item ${pct(odds.itemChance)}` : `${odds.items} itens, ${pct(odds.itemChance)} cada`;
  const potions = odds.potionChance >= 1
    ? `${odds.potions} ${odds.potions === 1 ? "poção garantida" : "poções garantidas"}`
    : odds.potions === 1 ? `poção ${pct(odds.potionChance)}` : `${odds.potions} poções, ${pct(odds.potionChance)} cada`;
  const lines = [
    `Gold: ${odds.gold[0]}–${odds.gold[1]} na 1ª sala.`,
    `Drops: ${items} (${rarity}) · ${potions}.`,
  ];
  if (odds.runes) lines.push(`Runa: ${odds.runes} por herói, direto na bag (uma vez por personagem).`);
  if (map.rewardRunes && MONSTERS[kind].rank === "boss") lines.push("Runa: atrás dele, um baú de runa por herói, à escolha.");
  if (odds.chest) lines.push(`Guarda o baú: mais gold, ${pct(chestItemChance())} de 1 item (material acima do mini-boss) e ${pct(chestPotionChance(map))} de cada poção.`);
  return lines;
}

function elementsLine(kind: MonsterKind) {
  const weak: string[] = [];
  const strong: string[] = [];
  const immune: string[] = [];
  for (const e of DAMAGE_ELEMENTS) {
    const k = elementMultiplier(kind, e);
    if (k === 0) immune.push(ELEMENT_NAMES[e]);
    else if (k > 1) weak.push(`${ELEMENT_NAMES[e]} ×${String(k).replace(".", ",")}`);
    else if (k < 1) strong.push(`${ELEMENT_NAMES[e]} ×${String(k).replace(".", ",")}`);
  }
  const parts = [
    immune.length ? `imune a ${immune.join(", ")}` : "",
    strong.length ? `resiste a ${strong.join(", ")}` : "",
    weak.length ? `fraco a ${weak.join(", ")}` : "",
  ].filter(Boolean);
  const dots = CREATURE_TYPES[MONSTERS[kind].type].immuneDots;
  if (dots?.length) parts.push(`não pega ${dots.map((d) => ({ poison: "veneno", burn: "queimadura", bleed: "sangramento" })[d]).join(" nem ")}`);
  return parts.length ? `Elementos: ${parts.join("; ")}.` : "";
}

function monsterEntry(map: MapDef, kind: MonsterKind) {
  const def = MONSTERS[kind];
  const stats = monsterStats(kind, monsterPower(map, kind));
  const abilities = (def.abilities ?? []).map((a) => a.name);
  return entry({
    name: def.name,
    color: def.rank === "boss" ? "#e74c3c" : def.rank === "miniboss" ? "#f39c12" : undefined,
    meta: `${RANK_LABELS[def.rank]} · ${CREATURE_TYPES[def.type].name} · Vida ${stats.maxHp} · Dano ${stats.damage} · XP ${stats.xp}`,
    lines: [
      def.lore,
      ...(abilities.length ? [`Habilidades: ${abilities.join(", ")}.`] : []),
      elementsLine(kind),
      ...dropLines(map, kind),
    ].filter(Boolean),
  });
}

const RANK_ORDER: Record<MonsterRank, number> = { common: 0, miniboss: 1, boss: 2 };

function enemies() {
  return section("👹 Inimigos",
    note(`Vida, dano, XP e gold são os mesmos em qualquer sala. Mais fundo, as espécies são mais fortes e cada sala tem ${pct(CROWD_PER_DEPTH)} mais monstros que a anterior. `
      + `${pct(CHAMPION_CHANCE)} dos comuns nascem Campeões: vida ×${CHAMPION_HP} e XP e gold ×${String(CHAMPION_REWARD).replace(".", ",")}. `
      + "O gold se divide pela equipe. As chances de drop valem para uma equipe só de humanos (com bots, os itens caem menos)."),
    ...MAP_IDS.map((id) => MAPS[id]).filter((m) => mapMonsters(m).length > 0).map((map) => section(
      `${map.icon} ${map.name}`,
      ...mapMonsters(map)
        .sort((a, b) => RANK_ORDER[MONSTERS[a].rank] - RANK_ORDER[MONSTERS[b].rank] || MONSTERS[a].cr - MONSTERS[b].cr)
        .map((kind) => monsterEntry(map, kind)),
    )),
  );
}

// --- Como os drops funcionam ---------------------------------------------------

function dropRules() {
  const t = el("table", "rule-table");
  const head = el("tr");
  ["Quem", "Material na 1ª sala", "Raro", "Mágico"].forEach((h) => head.append(el("th", "", h)));
  t.createTHead().append(head);
  const body = t.createTBody();
  for (const rank of ["common", "miniboss", "boss"] as MonsterRank[]) {
    const row = el("tr");
    const tier = Math.min(MAX_TIER, 1 + RANK_TIER_BONUS[rank]) as keyof typeof TIER_NAMES;
    [RANK_LABELS[rank], TIER_NAMES[tier], pct(RARITY_CHANCES[rank].rare), pct(RARITY_CHANCES[rank].magic)]
      .forEach((c) => row.append(el("td", "", c)));
    body.append(row);
  }
  const card = el("div", "cat-group");
  card.dataset.search = "drop material raridade";
  card.append(
    t,
    note(`O material melhora um nível a cada 2 salas de profundidade e tem ${pct(LUCKY_TIER_CHANCE)} de chance de vir um nível acima. `
      + "O baú usa a raridade do mini-boss, com um nível de material a mais. Cai item de qualquer classe: o que ninguém usa, se vende."),
    note(`O mercado só vende itens comuns, até ${TIER_NAMES[ITEM_TIERS.filter((t) => ITEM_BUY_PRICES[t] != null).at(-1)!]}: `
      + "o resto só sai das hunts."),
  );
  return section("🎲 Como os drops funcionam", card);
}

// --- Busca ---------------------------------------------------------------------

/** Mostra só as fichas com o texto buscado e abre as seções onde há resultado. */
function filter(root: HTMLElement, query: string) {
  const q = query.trim().toLowerCase();
  root.querySelectorAll<HTMLElement>("[data-search]").forEach((node) => {
    node.hidden = q !== "" && !node.dataset.search!.includes(q);
  });
  root.querySelectorAll<HTMLElement>(".cat-group").forEach((group) => {
    const entries = group.querySelectorAll<HTMLElement>(".cat-entry");
    if (entries.length) group.hidden = [...entries].every((e) => e.hidden);
  });
  // De dentro para fora: a seção some quando nada nela aparece.
  const all = [...root.querySelectorAll<HTMLDetailsElement>("details")];
  all.forEach((details) => { details.hidden = false; });
  all.reverse().forEach((details) => {
    const visible = [...details.querySelectorAll<HTMLElement>(".cat-entry, .cat-group")].some((n) => !n.hidden && !n.closest("[hidden]"));
    details.hidden = q !== "" && !visible;
    if (q !== "") details.open = visible;
  });
  const empty = root.querySelector<HTMLElement>(".cat-empty")!;
  empty.hidden = q === "" || [...root.querySelectorAll("details")].some((d) => !d.hidden);
}

export function renderCatalog(root: HTMLElement) {
  // O catálogo não muda durante a sessão: monta uma vez e guarda a busca.
  if (root.childElementCount > 0) return;
  const search = el("input", "cat-search");
  search.type = "search";
  search.placeholder = "Buscar item, runa ou monstro";
  search.setAttribute("aria-label", "Buscar no catálogo");
  const sections = el("div");
  sections.append(equipment(), runes(), potions(), enemies(), dropRules(), el("p", "cat-empty muted", "Nada encontrado."));
  search.oninput = () => filter(sections, search.value);
  root.append(search, sections);
  filter(sections, "");
}
