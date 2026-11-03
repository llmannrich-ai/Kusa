import type { MonsterRank } from "./monsters.ts";

/**
 * Poções: não caem de monstro nem de baú (`POTIONS_DROP`); compram-se no Mercado com gold (`MARKET_POTION_PRICES`, guardadas
 * na conta por personagem e levadas para toda hunt) ou com o vendedor do acampamento do terreno de caça, com o loot da
 * hunt (`CAMP_VENDOR_PRICES`). Quem sai vivo leva as que sobraram de volta para a conta; quem morre as deixa no chão.
 */
export type PotionId =
  | "potion-health" | "potion-health-2" | "potion-health-3"
  | "potion-mana" | "potion-mana-2" | "potion-mana-3";
export const POTION_IDS: PotionId[] = ["potion-health", "potion-health-2", "potion-health-3", "potion-mana", "potion-mana-2", "potion-mana-3"];

export type PotionStat = "hp" | "mana";
/** Nível da poção: 1 = pequena (a de sempre), 2 = média, 3 = grande. */
export type PotionTier = 1 | 2 | 3;

export interface PotionDef {
  id: PotionId;
  name: string;
  /** Nome curto do nível ("Pequena", "Média", "Grande"). */
  size: string;
  icon: string;
  tier: PotionTier;
  /** Quanto a poção devolve, em pontos fixos (não depende da vida ou da mana máxima). */
  amount: number;
  stat: PotionStat;
  /** Cor do brilho no chão e do aviso ao beber. */
  color: number;
}

/**
 * Três níveis de cada poção, com cura fixa (decisão de 03/11): a pequena serve para o começo, a grande quase enche
 * um Feiticeiro nível 20. Preços no Mercado em `MARKET_POTION_PRICES` (o banco repete em `potion_price`).
 */
export const POTIONS: Record<PotionId, PotionDef> = {
  "potion-health": { id: "potion-health", name: "Poção pequena de vida", size: "Pequena", icon: "❤️", tier: 1, amount: 60, stat: "hp", color: 0xe74c3c },
  "potion-health-2": { id: "potion-health-2", name: "Poção média de vida", size: "Média", icon: "❤️", tier: 2, amount: 120, stat: "hp", color: 0xd6304a },
  "potion-health-3": { id: "potion-health-3", name: "Poção grande de vida", size: "Grande", icon: "❤️", tier: 3, amount: 220, stat: "hp", color: 0xff4f5e },
  "potion-mana": { id: "potion-mana", name: "Poção pequena de mana", size: "Pequena", icon: "💧", tier: 1, amount: 50, stat: "mana", color: 0x3498db },
  "potion-mana-2": { id: "potion-mana-2", name: "Poção média de mana", size: "Média", icon: "💧", tier: 2, amount: 120, stat: "mana", color: 0x4f6ff0 },
  "potion-mana-3": { id: "potion-mana-3", name: "Poção grande de mana", size: "Grande", icon: "💧", tier: 3, amount: 250, stat: "mana", color: 0x9a6cf5 },
};

/** Poções de cada recurso, da menor para a maior. */
export const POTIONS_BY_STAT: Record<PotionStat, PotionId[]> = {
  hp: ["potion-health", "potion-health-2", "potion-health-3"],
  mana: ["potion-mana", "potion-mana-2", "potion-mana-3"],
};

export type PotionField = "healthPotions" | "healthPotions2" | "healthPotions3" | "manaPotions" | "manaPotions2" | "manaPotions3";
/** Campo do jogador (no estado sincronizado) que conta cada poção. */
export const POTION_FIELD: Record<PotionId, PotionField> = {
  "potion-health": "healthPotions",
  "potion-health-2": "healthPotions2",
  "potion-health-3": "healthPotions3",
  "potion-mana": "manaPotions",
  "potion-mana-2": "manaPotions2",
  "potion-mana-3": "manaPotions3",
};

/**
 * Qual poção beber de `stat` no modo automático: a menor que cobre o que falta (não desperdiça a grande num arranhão);
 * se nenhuma cobre, a maior que houver. `have` diz quantas há de cada; null = nenhuma.
 */
export function pickPotion(stat: PotionStat, missing: number, have: (id: PotionId) => number): PotionId | null {
  const owned = POTIONS_BY_STAT[stat].filter((id) => have(id) > 0);
  if (owned.length === 0) return null;
  return owned.find((id) => POTIONS[id].amount >= missing) ?? owned[owned.length - 1];
}

/** Só chaves próprias: a mensagem do cliente pode trazer qualquer texto (ex.: "__proto__"). */
export function isPotion(id: unknown): id is PotionId {
  return typeof id === "string" && Object.hasOwn(POTIONS, id);
}

/** Quantas poções de cada tipo (e de cada nível) o jogador carrega no máximo. */
export const POTION_MAX = 5;
/** Recarga compartilhada entre os dois tipos: ninguém fica imortal bebendo sem parar. */
export const POTION_COOLDOWN_MS = 6000;

/** Chance de um monstro comum dropar uma poção (sorteio separado do item). */
/**
 * Poções não caem de monstro nem de baú (decisão de 02/11): compram-se no Mercado ou com o vendedor do acampamento
 * (`CAMP_VENDOR_PRICES`, terreno de caça). As constantes de drop ficam em zero; `dropOdds` e a hunt leem as mesmas.
 */
export const POTIONS_DROP = false;
export const COMMON_POTION_CHANCE = 0;
/** Quantas poções cada rank dropa com certeza (comuns usam a chance acima). O baú dá uma de cada. */
export const GUARANTEED_POTIONS: Record<MonsterRank, number> = { common: 0, miniboss: 0, boss: 0 };

/** Mercado: preço de cada poção em gold (o banco repete em `buy_potion`: mude os dois juntos). */
export const MARKET_POTION_PRICES: Record<PotionId, number> = {
  "potion-health": 50, "potion-health-2": 150, "potion-health-3": 400,
  "potion-mana": 40, "potion-mana-2": 120, "potion-mana-3": 320,
};
/** Poções de cada tipo guardadas na conta (por personagem) ou levadas na hunt. */
export type PotionStock = Record<PotionId, number>;
/** Lê a contagem de poções de um json do banco ou de uma mensagem (qualquer coisa fora do catálogo vira 0). */
export function potionStock(raw: unknown): PotionStock {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(POTION_IDS.map((id) => [id, Math.max(0, Math.min(POTION_MAX, Math.floor(Number(src[id]) || 0)))])) as PotionStock;
}
/** Vendedor do acampamento (terreno de caça): preço de cada poção em loot carregado na hunt (uns 4 chacais ou 2 legionários). */
export const CAMP_VENDOR_PRICES: Partial<Record<PotionId, number>> = { "potion-health": 25, "potion-mana": 20 };
/** O que o vendedor do acampamento vende: só as pequenas (as maiores são do Mercado, com gold). */
export const CAMP_VENDOR_POTIONS: PotionId[] = ["potion-health", "potion-mana"];
/** O herói compra do vendedor a até esta distância (tiles). */
export const CAMP_VENDOR_RADIUS = 2;
/** Chance de a poção sorteada ser de vida (o resto é de mana). */
const HEALTH_POTION_CHANCE = 0.6;

/** Sorteia o tipo de uma poção dropada. `random` devolve [0, 1). */
export function rollPotion(random: () => number): PotionId {
  return random() < HEALTH_POTION_CHANCE ? "potion-health" : "potion-mana";
}
