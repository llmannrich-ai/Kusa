import type { ClassId } from "./classes.ts";
import type { MonsterRank } from "./monsters.ts";

/**
 * Itens no espírito de Dungeons & Dragons. Cada item é uma **família** (Espada, Cajado, Vestes arcanas...)
 * num **nível de material** (1 = rústico … 5 = dragão) e numa **raridade**:
 * - Comum: só os atributos da família;
 * - Raro: o item "+1" do D&D, com os atributos 30% mais fortes;
 * - Mágico: um item com nome próprio (Espada Vorpal, Manto das Estrelas...), atributos 60% mais fortes e
 *   uma propriedade mágica a mais (roubo de vida, chamas, espinhos, velocidade...).
 *
 * As armas são da classe (espada e machado do cavaleiro, arco e besta do paladino, varinha e cajado do
 * feiticeiro e do druida); armaduras de guerra são do cavaleiro e do paladino, vestes arcanas do
 * feiticeiro e do druida; botas e escudos servem a todos. Só varinhas e cajados (e alguns itens mágicos)
 * aumentam o dano das magias.
 *
 * O id é `slot-família-nível-raridade` (ex.: `weapon-sword-3-rare`). O banco (`market_items`) repete o
 * catálogo com preço, nível, raridade e classes; mude os dois juntos (`npx tsx apps/server/scripts/catalog-sql.ts`
 * gera as linhas).
 */

export type ItemSlot = "weapon" | "helmet" | "armor" | "legs" | "boots" | "shield";
export const ITEM_SLOTS: ItemSlot[] = ["weapon", "helmet", "armor", "legs", "boots", "shield"];

export const SLOT_NAMES: Record<ItemSlot, string> = {
  weapon: "Arma",
  helmet: "Capacete",
  armor: "Armadura",
  legs: "Calça",
  boots: "Botas",
  shield: "Escudo",
};

/** Nível do material: 1 = rústico (couro, madeira, linho) … 5 = dragão. */
export type ItemTier = 1 | 2 | 3 | 4 | 5;
export const MAX_TIER: ItemTier = 5;
export const ITEM_TIERS: ItemTier[] = [1, 2, 3, 4, 5];

export const TIER_NAMES: Record<ItemTier, string> = {
  1: "Rústico",
  2: "Bronze",
  3: "Ferro",
  4: "Mithral",
  5: "Dragão",
};

export type ItemRarity = "common" | "rare" | "magic";
export const ITEM_RARITIES: ItemRarity[] = ["common", "rare", "magic"];

export const RARITY_NAMES: Record<ItemRarity, string> = { common: "Comum", rare: "Raro", magic: "Mágico" };

/** Cor de cada raridade (nome, borda, brilho no chão e avisos). */
export const RARITY_COLORS: Record<ItemRarity, number> = {
  common: 0xdcdde1,
  rare: 0x4aa3ff,
  magic: 0xc56cf0,
};

/** Quanto a raridade multiplica os atributos da família. */
export const RARITY_POWER: Record<ItemRarity, number> = { common: 1, rare: 1.3, magic: 1.6 };

/**
 * Atributos de um item. Frações (0,35 = +35%), menos `armor` e `range`, que são pontos e tiles.
 * Tudo soma entre os itens vestidos (`gearStats`).
 */
export interface ItemStats {
  /** Dano do ataque básico. */
  damage?: number;
  /** Dano das magias (e das criaturas invocadas e dos campos no chão). */
  spellPower?: number;
  /** Pontos de armadura (corta o dano recebido, ver `damageReduction`). */
  armor?: number;
  /** Vida máxima. */
  hp?: number;
  /** Mana máxima. */
  mana?: number;
  /** Velocidade de movimento. */
  speed?: number;
  /** Ataque básico mais rápido (negativo = mais lento: machado e besta). */
  haste?: number;
  /** Parte do dano do ataque básico que volta como vida. */
  lifesteal?: number;
  /** Tiles a mais de alcance do ataque básico (só para quem ataca à distância). */
  range?: number;
  /** O ataque básico põe fogo: fração do dano base por segundo, por `ON_HIT_DOT_MS`. */
  burn?: number;
  /** O ataque básico envenena: fração do dano base por segundo, por `ON_HIT_DOT_MS`. */
  poison?: number;
  /** Espinhos: parte do dano de um golpe corpo a corpo recebido volta para o monstro. */
  thorns?: number;
}

/** Quanto dura a queimadura ou o veneno de uma arma mágica. */
export const ON_HIT_DOT_MS = 3000;

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  tier: ItemTier;
  rarity: ItemRarity;
  /** Chave de `ITEM_FAMILIES`. */
  family: string;
  /** Classes que podem usar; sem a lista, todas. */
  classes?: ClassId[];
  stats: ItemStats;
}

export interface ItemFamily {
  key: string;
  slot: ItemSlot;
  /** Nome da família (mercado e regras). */
  name: string;
  classes?: ClassId[];
  /** Nome do item comum de cada nível (o raro ganha "+1"). */
  names: [string, string, string, string, string];
  /** Atributos do item comum de cada nível; a raridade multiplica. */
  base: (tier: ItemTier) => ItemStats;
  /** Atributos que a raridade não multiplica (a lentidão do machado, a rapidez da varinha). */
  fixed?: ItemStats;
  /** Item mágico de cada nível: nome próprio e a propriedade mágica (não multiplicada). */
  magic: [string, ItemStats][];
}

const KNIGHT: ClassId[] = ["knight"];
const PALADIN: ClassId[] = ["paladin"];
const MARTIAL: ClassId[] = ["knight", "paladin"];
const CASTERS: ClassId[] = ["sorcerer", "druid"];

/** Valor do nível (1 a 5) numa tabela. */
const at = <T>(values: T[]) => (tier: ItemTier) => values[tier - 1];

export const ITEM_FAMILIES: Record<string, ItemFamily> = Object.fromEntries(([
  // --- Armas -----------------------------------------------------------------
  {
    key: "sword", slot: "weapon", name: "Espada", classes: KNIGHT,
    names: ["Espada curta", "Espada de bronze", "Espada longa", "Espada de mithral", "Lâmina do dragão"],
    base: (t) => ({ damage: at([0.1, 0.2, 0.35, 0.55, 0.8])(t) }),
    magic: [
      ["Espada do Juramento", { lifesteal: 0.04 }],
      ["Lâmina Flamejante", { burn: 0.25 }],
      ["Vingadora Sagrada", { hp: 0.1 }],
      ["Espada Dançarina", { haste: 0.15 }],
      ["Espada Vorpal", { lifesteal: 0.08, burn: 0.2 }],
    ],
  },
  {
    key: "axe", slot: "weapon", name: "Machado", classes: KNIGHT,
    names: ["Machadinha", "Machado de bronze", "Machado de batalha", "Machado de mithral", "Grande machado do dragão"],
    base: (t) => ({ damage: at([0.15, 0.28, 0.46, 0.7, 1])(t) }),
    fixed: { haste: -0.12 },
    magic: [
      ["Machado do Berserker", { lifesteal: 0.05 }],
      ["Machado Uivante", { speed: 0.05 }],
      ["Machado dos Reis Anões", { armor: 3 }],
      ["Machado da Tempestade", { burn: 0.3 }],
      ["Ruína dos Gigantes", { lifesteal: 0.06, hp: 0.1 }],
    ],
  },
  {
    key: "bow", slot: "weapon", name: "Arco", classes: PALADIN,
    names: ["Arco curto", "Arco de caça", "Arco longo", "Arco de mithral", "Arco de osso de dragão"],
    base: (t) => ({ damage: at([0.1, 0.2, 0.35, 0.55, 0.8])(t) }),
    magic: [
      ["Arco do Caçador Élfico", { range: 1 }],
      ["Arco do Vento Sul", { haste: 0.12 }],
      ["Arco Solar", { burn: 0.25 }],
      ["Arco do Juramento", { damage: 0.15 }],
      ["Arco de Corda Celestial", { range: 1, haste: 0.12 }],
    ],
  },
  {
    key: "crossbow", slot: "weapon", name: "Besta", classes: PALADIN,
    names: ["Besta leve", "Besta de bronze", "Besta de ferro", "Besta pesada de mithral", "Balestra de osso de dragão"],
    base: (t) => ({ damage: at([0.15, 0.28, 0.46, 0.7, 1])(t) }),
    fixed: { haste: -0.12 },
    magic: [
      ["Besta do Sentinela", { armor: 2 }],
      ["Besta do Caça-Vampiros", { lifesteal: 0.05 }],
      ["Besta de Repetição Gnoma", { haste: 0.25 }],
      ["Besta Trovejante", { burn: 0.3 }],
      ["Balestra do Dragão Rubro", { range: 1, burn: 0.35 }],
    ],
  },
  {
    key: "wand", slot: "weapon", name: "Varinha", classes: CASTERS,
    names: ["Varinha de salgueiro", "Varinha de bronze", "Varinha rúnica", "Varinha de mithral", "Varinha de dente de dragão"],
    base: (t) => ({ damage: at([0.04, 0.08, 0.14, 0.22, 0.32])(t), spellPower: at([0.1, 0.2, 0.34, 0.52, 0.75])(t) }),
    fixed: { haste: 0.08 },
    magic: [
      ["Varinha de Mísseis Mágicos", { haste: 0.1 }],
      ["Varinha da Bola de Fogo", { burn: 0.25 }],
      ["Varinha do Mago de Guerra", { spellPower: 0.1 }],
      ["Varinha dos Segredos", { mana: 0.12 }],
      ["Varinha das Maravilhas", { spellPower: 0.12, lifesteal: 0.05 }],
    ],
  },
  {
    key: "staff", slot: "weapon", name: "Cajado", classes: CASTERS,
    names: ["Cajado de carvalho", "Cajado de bronze", "Cajado rúnico", "Cajado de mithral", "Cajado de presa de dragão"],
    base: (t) => ({ damage: at([0.08, 0.16, 0.28, 0.44, 0.64])(t), spellPower: at([0.07, 0.14, 0.24, 0.37, 0.54])(t) }),
    magic: [
      ["Cajado da Floresta", { hp: 0.08 }],
      ["Cajado da Víbora", { poison: 0.25 }],
      ["Cajado do Poder", { spellPower: 0.1, armor: 2 }],
      ["Cajado do Arquimago", { mana: 0.15, spellPower: 0.08 }],
      ["Cajado do Dragão Ancião", { spellPower: 0.15, hp: 0.1 }],
    ],
  },
  // --- Armaduras de guerra (cavaleiro e paladino) ------------------------------
  {
    key: "war", slot: "helmet", name: "Elmo de guerra", classes: MARTIAL,
    names: ["Gorro de couro", "Elmo de bronze", "Elmo de ferro", "Elmo de mithral", "Elmo do dragão"],
    base: (t) => ({ armor: at([1, 2, 3, 4, 6])(t) }),
    magic: [
      ["Gorro do Escudeiro", { hp: 0.05 }],
      ["Elmo do Vigia", { speed: 0.03 }],
      ["Elmo do Brilho", { spellPower: 0.08 }],
      ["Elmo do Cavaleiro Grifo", { hp: 0.08 }],
      ["Elmo do Senhor dos Dragões", { hp: 0.1, thorns: 0.1 }],
    ],
  },
  {
    key: "war", slot: "armor", name: "Armadura de guerra", classes: MARTIAL,
    names: ["Gibão de couro", "Couraça de bronze", "Cota de malha", "Placas de mithral", "Escamas de dragão"],
    base: (t) => ({ armor: at([2, 3, 5, 8, 11])(t) }),
    magic: [
      ["Gibão do Aventureiro", { speed: 0.03 }],
      ["Couraça do Leão", { thorns: 0.1 }],
      ["Cota Élfica", { speed: 0.05 }],
      ["Armadura de Placas Anã", { hp: 0.1 }],
      ["Escamas do Dragão Vermelho", { thorns: 0.15, hp: 0.08 }],
    ],
  },
  {
    key: "war", slot: "legs", name: "Perneiras de guerra", classes: MARTIAL,
    names: ["Calças de couro", "Perneiras de bronze", "Perneiras de malha", "Coxotes de mithral", "Perneiras de escamas de dragão"],
    base: (t) => ({ armor: at([1, 2, 3, 4, 6])(t) }),
    magic: [
      ["Calças do Viajante", { speed: 0.03 }],
      ["Perneiras do Gladiador", { lifesteal: 0.03 }],
      ["Perneiras de Malha Élfica", { speed: 0.04 }],
      ["Coxotes do Guardião", { hp: 0.08 }],
      ["Perneiras do Dragão", { armor: 2, thorns: 0.08 }],
    ],
  },
  // --- Vestes arcanas (feiticeiro e druida) -------------------------------------
  {
    key: "arcane", slot: "helmet", name: "Chapéu arcano", classes: CASTERS,
    names: ["Capuz de lã", "Chapéu pontudo", "Capuz rúnico", "Chapéu do mago", "Coroa de chifres de dragão"],
    base: (t) => ({ armor: at([1, 1, 2, 2, 3])(t), spellPower: at([0.03, 0.05, 0.08, 0.11, 0.15])(t) }),
    magic: [
      ["Capuz do Eremita", { mana: 0.05 }],
      ["Chapéu do Ilusionista", { speed: 0.04 }],
      ["Capuz da Clarividência", { spellPower: 0.05 }],
      ["Chapéu do Arquimago", { mana: 0.1 }],
      ["Diadema do Dragão Ancião", { spellPower: 0.08, hp: 0.08 }],
    ],
  },
  {
    key: "arcane", slot: "armor", name: "Manto arcano", classes: CASTERS,
    names: ["Túnica de linho", "Manto de viagem", "Manto rúnico", "Vestes de mithral", "Manto de seda de dragão"],
    base: (t) => ({ armor: at([1, 2, 3, 4, 6])(t), mana: at([0.05, 0.08, 0.12, 0.16, 0.2])(t) }),
    magic: [
      ["Túnica do Aprendiz", { spellPower: 0.04 }],
      ["Manto Élfico", { speed: 0.05 }],
      ["Manto da Proteção", { armor: 3, hp: 0.05 }],
      ["Manto do Arquimago", { spellPower: 0.1 }],
      ["Manto das Estrelas", { spellPower: 0.1, mana: 0.1 }],
    ],
  },
  {
    key: "arcane", slot: "legs", name: "Calças arcanas", classes: CASTERS,
    names: ["Calças de linho", "Calças de lã", "Calças rúnicas", "Calças de mithral", "Calças de couro de dragão"],
    base: (t) => ({ armor: at([1, 1, 2, 2, 3])(t), mana: at([0.03, 0.05, 0.07, 0.09, 0.12])(t) }),
    magic: [
      ["Calças do Novato", { hp: 0.04 }],
      ["Calças de Seda Encantada", { mana: 0.06 }],
      ["Calças do Vidente", { spellPower: 0.04 }],
      ["Calças do Conjurador", { hp: 0.08 }],
      ["Calças da Asa do Dragão", { armor: 2, spellPower: 0.06 }],
    ],
  },
  // --- Para todos ---------------------------------------------------------------
  {
    key: "boots", slot: "boots", name: "Botas",
    names: ["Botas de couro", "Botas de bronze", "Grevas de ferro", "Botas de mithral", "Botas de escamas de dragão"],
    base: (t) => ({ armor: at([1, 1, 2, 3, 4])(t), speed: at([0.02, 0.03, 0.04, 0.05, 0.06])(t) }),
    magic: [
      ["Botas Élficas", { speed: 0.03 }],
      ["Botas do Andarilho", { hp: 0.05 }],
      ["Botas da Rapidez", { speed: 0.08 }],
      ["Botas Aladas", { speed: 0.06, haste: 0.06 }],
      ["Botas do Dragão Alado", { speed: 0.08, thorns: 0.08 }],
    ],
  },
  {
    key: "shield", slot: "shield", name: "Escudo",
    names: ["Broquel de madeira", "Escudo de bronze", "Escudo de ferro", "Escudo de mithral", "Escudo do dragão"],
    base: (t) => ({ armor: at([1, 2, 3, 4, 6])(t) }),
    magic: [
      ["Broquel do Escudeiro", { hp: 0.04 }],
      ["Escudo Sentinela", { hp: 0.06 }],
      ["Escudo Animado", { thorns: 0.1 }],
      ["Escudo da Guarda Arcana", { hp: 0.08, mana: 0.08 }],
      ["Escudo do Dragão Ancião", { thorns: 0.15, hp: 0.08 }],
    ],
  },
] satisfies ItemFamily[]).map((f) => [familyId(f.slot, f.key), f]));

/** Chave de uma família em `ITEM_FAMILIES` (a mesma família de armadura aparece em vários slots). */
export function familyId(slot: ItemSlot, key: string) {
  return `${slot}-${key}`;
}

export function itemId(slot: ItemSlot, family: string, tier: ItemTier, rarity: ItemRarity = "common") {
  return `${slot}-${family}-${tier}-${rarity}`;
}

/** Multiplica os atributos pela raridade: armadura e alcance em pontos inteiros, o resto em centésimos. */
function scale(stats: ItemStats, factor: number): ItemStats {
  const out: ItemStats = {};
  for (const [key, value] of Object.entries(stats) as [keyof ItemStats, number][]) {
    out[key] = key === "armor" || key === "range" ? Math.round(value * factor) : Math.round(value * factor * 100) / 100;
  }
  return out;
}

/** Soma atributos (`into` muda). */
function addStats(into: ItemStats, more: ItemStats) {
  for (const [key, value] of Object.entries(more) as [keyof ItemStats, number][]) {
    into[key] = Math.round(((into[key] ?? 0) + value) * 100) / 100;
  }
  return into;
}

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  Object.values(ITEM_FAMILIES).flatMap((f) => ITEM_TIERS.flatMap((tier) => ITEM_RARITIES.map((rarity) => {
    const id = itemId(f.slot, f.key, tier, rarity);
    const stats = addStats(scale(f.base(tier), RARITY_POWER[rarity]), f.fixed ?? {});
    const [magicName, magicStats] = f.magic[tier - 1];
    if (rarity === "magic") addStats(stats, magicStats);
    const name = rarity === "magic" ? magicName : rarity === "rare" ? `${f.names[tier - 1]} +1` : f.names[tier - 1];
    const def: ItemDef = { id, name, slot: f.slot, tier, rarity, family: familyId(f.slot, f.key), stats };
    if (f.classes) def.classes = f.classes;
    return [id, def];
  }))),
);

/** Família do item (`undefined` se o id não existe). */
export function familyOf(id: string): ItemFamily | undefined {
  const def = ITEMS[id];
  return def && ITEM_FAMILIES[def.family];
}

/** A classe pode vestir o item? */
export function canUse(id: string, classId: ClassId) {
  const def = ITEMS[id];
  return !!def && (!def.classes || def.classes.includes(classId));
}

/** Cor do item: a da raridade. */
export function itemColor(id: string) {
  const def = ITEMS[id];
  return def ? RARITY_COLORS[def.rarity] : RARITY_COLORS.common;
}

/** Força do item para comparar dentro do slot: o material pesa mais, e a raridade vale meio nível por degrau. */
export function itemScore(id: string) {
  const def = ITEMS[id];
  if (!def) return 0;
  return def.tier + ITEM_RARITIES.indexOf(def.rarity) * 0.5;
}

/** true quando `candidate` é melhor que o item equipado (`""` = slot vazio) e a classe pode usá-lo. */
export function isUpgrade(candidate: string, equipped: string, classId: ClassId) {
  if (!canUse(candidate, classId)) return false;
  return !ITEMS[equipped] || itemScore(candidate) > itemScore(equipped);
}

/** Atributos somados dos itens vestidos. */
export function gearStats(equipped: readonly string[]): Required<ItemStats> {
  const total: Required<ItemStats> = {
    damage: 0, spellPower: 0, armor: 0, hp: 0, mana: 0, speed: 0, haste: 0, lifesteal: 0, range: 0, burn: 0, poison: 0, thorns: 0,
  };
  for (const id of equipped) {
    const def = ITEMS[id];
    if (def) addStats(total, def.stats);
  }
  return total;
}

/** Armadura total dos itens equipados. */
export function armorOf(equipped: readonly string[]) {
  return gearStats(equipped).armor;
}

/** Quanto mais armadura, menos dano: 10 de armadura corta 29%, 33 (tudo de dragão comum) corta 57%. */
const ARMOR_HALF = 25;
export function damageReduction(armor: number) {
  return armor / (armor + ARMOR_HALF);
}

/** "Cavaleiro", "Feiticeiro e Druida"... (`names` = nome de cada classe). */
export function classesText(def: ItemDef, names: Record<ClassId, string>) {
  if (!def.classes) return "Todas as classes";
  const list = def.classes.map((c) => names[c]);
  return list.length === 1 ? `Só ${list[0]}` : `${list.slice(0, -1).join(", ")} e ${list[list.length - 1]}`;
}

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;

/** O que cada atributo faz, em frases curtas (fichas, bag e mercado). */
export function describeStats(stats: ItemStats): string[] {
  const lines: string[] = [];
  const s = stats;
  if (s.damage) lines.push(`+${pct(s.damage)} de dano no ataque básico`);
  if (s.spellPower) lines.push(`+${pct(s.spellPower)} de dano nas magias`);
  if (s.armor) lines.push(`+${s.armor} de armadura`);
  if (s.hp) lines.push(`+${pct(s.hp)} de vida máxima`);
  if (s.mana) lines.push(`+${pct(s.mana)} de mana máxima`);
  if (s.speed) lines.push(`+${pct(s.speed)} de velocidade`);
  if (s.haste) lines.push(s.haste > 0 ? `Ataque básico ${pct(s.haste)} mais rápido` : `Ataque básico ${pct(s.haste)} mais lento`);
  if (s.lifesteal) lines.push(`Rouba ${pct(s.lifesteal)} do dano do ataque básico como vida`);
  if (s.range) lines.push(`+${s.range} de alcance no ataque básico`);
  if (s.burn) lines.push(`Ataque básico queima: ${pct(s.burn)} do dano por segundo, por ${ON_HIT_DOT_MS / 1000} s`);
  if (s.poison) lines.push(`Ataque básico envenena: ${pct(s.poison)} do dano por segundo, por ${ON_HIT_DOT_MS / 1000} s`);
  if (s.thorns) lines.push(`Espinhos: devolve ${pct(s.thorns)} do dano corpo a corpo recebido`);
  return lines;
}

/** Resumo de uma linha (mercado e listas). */
export function itemSummary(def: ItemDef) {
  return describeStats(def.stats).join(" · ");
}

// --- Mercado -----------------------------------------------------------------
// A tabela `market_items` no Supabase repete estes preços; mude as duas juntas.

/** Preço de compra no mercado por nível, só dos itens comuns. Os de Dragão, raros e mágicos só saem das hunts. */
export const ITEM_BUY_PRICES: Record<ItemTier, number | null> = { 1: 60, 2: 150, 3: 350, 4: 800, 5: null };
/** Quanto o mercado paga por um item comum, por nível; a raridade multiplica (`RARITY_SELL`). */
export const ITEM_SELL_PRICES: Record<ItemTier, number> = { 1: 10, 2: 25, 3: 60, 4: 130, 5: 300 };
export const RARITY_SELL: Record<ItemRarity, number> = { common: 1, rare: 2, magic: 4 };

export function buyPrice(id: string): number | null {
  const def = ITEMS[id];
  return def && def.rarity === "common" ? ITEM_BUY_PRICES[def.tier] : null;
}

export function sellPrice(id: string): number {
  const def = ITEMS[id];
  return def ? ITEM_SELL_PRICES[def.tier] * RARITY_SELL[def.rarity] : 0;
}

/**
 * Melhor item por slot entre os itens dados, que a classe pode usar (o loadout que entra na hunt).
 * `""` = slot vazio.
 */
export function bestPerSlot(itemIds: readonly string[], classId: ClassId): Record<ItemSlot, string> {
  const best = Object.fromEntries(ITEM_SLOTS.map((s) => [s, ""])) as Record<ItemSlot, string>;
  for (const id of itemIds) {
    const item = ITEMS[id];
    if (item && isUpgrade(id, best[item.slot], classId)) best[item.slot] = id;
  }
  return best;
}

// --- Cofre e bag --------------------------------------------------------------
// As funções do Supabase (`buy_item`, `equip_item`, `store_item`, `finish_run`, `store_bag`) repetem estes limites; mude os dois juntos.

/** Espaços do cofre da conta (fora do equipamento). Só se mexe nele pelo menu Itens. */
export const VAULT_SIZE = 20;
/**
 * Espaços da bag: entra na hunt com o jogador e guarda o que ele pega no chão. Ao sair vivo, a bag é
 * esvaziada no cofre e o que não couber fica nela para a próxima hunt. Com a bag cheia, não pega mais nada.
 */
export const BAG_SIZE = 8;

/** Índice válido da bag (a mensagem do cliente pode trazer qualquer coisa). */
export function isBagIndex(index: unknown, bagLength: number): index is number {
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < bagLength;
}

/** Só chaves próprias: a mensagem do cliente pode trazer qualquer texto (ex.: "__proto__"). */
export function isItemSlot(slot: unknown): slot is ItemSlot {
  return typeof slot === "string" && (ITEM_SLOTS as string[]).includes(slot);
}

/**
 * O que acontece ao passar por cima de um item: `equip` (slot vazio), `swap` (melhor que o equipado; o antigo vai
 * para a bag), `bag` (não é melhor, ou a classe não usa) ou `full` (bag cheia: fica no chão). Slot vazio recebe o
 * item mesmo com a bag cheia.
 */
export type PickupAction = "equip" | "swap" | "bag" | "full";
export function pickupAction(itemId: string, equipped: string, bagCount: number, classId: ClassId): PickupAction {
  if (!isUpgrade(itemId, equipped, classId)) return bagCount < BAG_SIZE ? "bag" : "full";
  if (!equipped) return "equip";
  return bagCount < BAG_SIZE ? "swap" : "full";
}

// --- Drops -------------------------------------------------------------------

/** Chance de um monstro comum dropar um item. */
export const COMMON_DROP_CHANCE = 0.15;
/** Quantos itens cada rank dropa com certeza (comuns usam a chance acima). */
export const GUARANTEED_DROPS: Record<MonsterRank, number> = { common: 0, miniboss: 1, boss: 2 };
const RANK_TIER_BONUS: Record<MonsterRank, number> = { common: 0, miniboss: 1, boss: 2 };
/** Chance de o drop vir um nível acima do esperado. */
const LUCKY_TIER_CHANCE = 0.2;
/** Chance de o drop ser raro ou mágico, por rank (o resto é comum). O baú usa a do mini-boss. */
export const RARITY_CHANCES: Record<MonsterRank, { rare: number; magic: number }> = {
  common: { rare: 0.18, magic: 0.04 },
  miniboss: { rare: 0.35, magic: 0.12 },
  boss: { rare: 0.4, magic: 0.25 },
};

/**
 * Sorteia o item de um drop. Salas mais fundas e monstros mais fortes dão material melhor e mais raro.
 * O baú usa o rank de mini-boss com um nível a mais. Cai qualquer família, sem olhar a classe de quem está na
 * hunt: item que ninguém da equipe usa é comum (vai para a bag e se vende). `random` devolve [0, 1).
 */
export function rollItem(rank: MonsterRank, depth: number, random: () => number, extraTier = 0): string {
  const raw = 1 + Math.floor(Math.max(0, depth) / 2) + RANK_TIER_BONUS[rank] + extraTier
    + (random() < LUCKY_TIER_CHANCE ? 1 : 0);
  const tier = Math.max(1, Math.min(MAX_TIER, raw)) as ItemTier;
  const slot = ITEM_SLOTS[Math.floor(random() * ITEM_SLOTS.length)];
  const families = Object.values(ITEM_FAMILIES).filter((f) => f.slot === slot);
  const family = families[Math.floor(random() * families.length)];
  const roll = random();
  const chance = RARITY_CHANCES[rank];
  const rarity: ItemRarity = roll < chance.magic ? "magic" : roll < chance.magic + chance.rare ? "rare" : "common";
  return itemId(slot, family.key, tier, rarity);
}
