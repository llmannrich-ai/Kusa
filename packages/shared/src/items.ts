import type { MonsterRank } from "./monsters.ts";

export type ItemSlot = "weapon" | "helmet" | "armor" | "shield";
export const ITEM_SLOTS: ItemSlot[] = ["weapon", "helmet", "armor", "shield"];

export const SLOT_NAMES: Record<ItemSlot, string> = {
  weapon: "Arma",
  helmet: "Capacete",
  armor: "Armadura",
  shield: "Escudo",
};

/** Nível do material: 1 = couro/madeira … 5 = dragão. Item de nível maior é sempre melhor no mesmo slot. */
export type ItemTier = 1 | 2 | 3 | 4 | 5;
export const MAX_TIER: ItemTier = 5;

export const TIER_NAMES: Record<ItemTier, string> = {
  1: "Comum",
  2: "Bronze",
  3: "Ferro",
  4: "Aço",
  5: "Dragão",
};

/** Cor de cada nível (avisos, brilho no chão e HUD). */
export const TIER_COLORS: Record<ItemTier, number> = {
  1: 0xdcdde1,
  2: 0xcd7f32,
  3: 0xa4b0be,
  4: 0x70a1ff,
  5: 0xff6b6b,
};

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  tier: ItemTier;
  /** Arma: % a mais de dano. Capacete, armadura e escudo: pontos de armadura. */
  power: number;
}

const TABLE: Record<ItemSlot, [string, number][]> = {
  weapon: [["Porrete", 10], ["Espada de bronze", 20], ["Machado de ferro", 35], ["Espada longa de aço", 55], ["Lâmina do dragão", 80]],
  helmet: [["Gorro de couro", 1], ["Elmo de bronze", 2], ["Elmo de ferro", 3], ["Elmo de aço", 5], ["Elmo do dragão", 7]],
  armor: [["Gibão de couro", 2], ["Couraça de bronze", 4], ["Cota de malha", 6], ["Armadura de placas", 9], ["Escamas de dragão", 13]],
  shield: [["Broquel de madeira", 1], ["Escudo de bronze", 2], ["Escudo de ferro", 3], ["Escudo de aço", 5], ["Escudo do dragão", 7]],
};

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  ITEM_SLOTS.flatMap((slot) => TABLE[slot].map(([name, power], i) => {
    const tier = (i + 1) as ItemTier;
    const id = itemId(slot, tier);
    return [id, { id, name, slot, tier, power }];
  })),
);

export function itemId(slot: ItemSlot, tier: ItemTier) {
  return `${slot}-${tier}`;
}

/** true quando `candidate` é melhor que o item equipado (`""` = slot vazio). */
export function isUpgrade(candidate: string, equipped: string) {
  const next = ITEMS[candidate];
  if (!next) return false;
  return !ITEMS[equipped] || next.tier > ITEMS[equipped].tier;
}

/** Armadura total dos itens equipados. */
export function armorOf(equipped: readonly string[]) {
  return equipped.reduce((sum, id) => {
    const item = ITEMS[id];
    return sum + (item && item.slot !== "weapon" ? item.power : 0);
  }, 0);
}

/** Quanto mais armadura, menos dano: 10 de armadura corta 1/3, 27 (tudo de dragão) corta 57%. */
const ARMOR_HALF = 20;
export function damageReduction(armor: number) {
  return armor / (armor + ARMOR_HALF);
}

/** Multiplicador de dano da arma equipada. */
export function weaponMultiplier(weaponId: string) {
  const item = ITEMS[weaponId];
  return item?.slot === "weapon" ? 1 + item.power / 100 : 1;
}

// --- Mercado -----------------------------------------------------------------
// A tabela `market_items` no Supabase repete estes preços; mude as duas juntas.

/** Preço de compra no mercado por nível. Itens de Dragão não são vendidos: só saem das hunts. */
export const ITEM_BUY_PRICES: Record<ItemTier, number | null> = { 1: 60, 2: 150, 3: 350, 4: 800, 5: null };
/** Quanto o mercado paga por item, por nível. */
export const ITEM_SELL_PRICES: Record<ItemTier, number> = { 1: 20, 2: 60, 3: 140, 4: 320, 5: 900 };

/**
 * Melhor item por slot entre os itens dados (o loadout que entra na hunt).
 * Devolve os ids na ordem de `ITEM_SLOTS` ("" = slot vazio).
 */
export function bestPerSlot(itemIds: readonly string[]): Record<ItemSlot, string> {
  const best = { weapon: "", helmet: "", armor: "", shield: "" } as Record<ItemSlot, string>;
  for (const id of itemIds) {
    const item = ITEMS[id];
    if (item && isUpgrade(id, best[item.slot])) best[item.slot] = id;
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
 * para a bag), `bag` (não é melhor) ou `full` (bag cheia: fica no chão). Slot vazio recebe o item mesmo com a bag cheia.
 */
export type PickupAction = "equip" | "swap" | "bag" | "full";
export function pickupAction(itemId: string, equipped: string, bagCount: number): PickupAction {
  if (!isUpgrade(itemId, equipped)) return bagCount < BAG_SIZE ? "bag" : "full";
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

/**
 * Sorteia o item de um drop. Salas mais fundas e monstros mais fortes dão material melhor.
 * O baú usa o rank de mini-boss com um nível a mais. `random` devolve [0, 1).
 */
export function rollItem(rank: MonsterRank, depth: number, random: () => number, extraTier = 0): string {
  const raw = 1 + Math.floor(Math.max(0, depth) / 2) + RANK_TIER_BONUS[rank] + extraTier
    + (random() < LUCKY_TIER_CHANCE ? 1 : 0);
  const tier = Math.max(1, Math.min(MAX_TIER, raw)) as ItemTier;
  const slot = ITEM_SLOTS[Math.floor(random() * ITEM_SLOTS.length)];
  return itemId(slot, tier);
}
