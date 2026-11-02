import type { MonsterRank } from "./monsters.ts";

/**
 * Poções: não caem de monstro nem de baú (`POTIONS_DROP`); compram-se no Mercado com gold (`MARKET_POTION_PRICES`, guardadas
 * na conta por personagem e levadas para toda hunt) ou com o vendedor do acampamento do terreno de caça, com o loot da
 * hunt (`CAMP_VENDOR_PRICES`). Quem sai vivo leva as que sobraram de volta para a conta; quem morre as deixa no chão.
 */
export type PotionId = "potion-health" | "potion-mana";
export const POTION_IDS: PotionId[] = ["potion-health", "potion-mana"];

export interface PotionDef {
  id: PotionId;
  name: string;
  icon: string;
  /** Fração do máximo que a poção devolve. */
  restore: number;
  stat: "hp" | "mana";
  /** Cor do brilho no chão e do aviso ao beber. */
  color: number;
}

export const POTIONS: Record<PotionId, PotionDef> = {
  "potion-health": { id: "potion-health", name: "Poção de vida", icon: "❤️", restore: 0.35, stat: "hp", color: 0xe74c3c },
  "potion-mana": { id: "potion-mana", name: "Poção de mana", icon: "💧", restore: 0.4, stat: "mana", color: 0x3498db },
};

/** Campo do jogador (no estado sincronizado) que conta cada tipo de poção. */
export const POTION_FIELD: Record<PotionId, "healthPotions" | "manaPotions"> = {
  "potion-health": "healthPotions",
  "potion-mana": "manaPotions",
};

/** Só chaves próprias: a mensagem do cliente pode trazer qualquer texto (ex.: "__proto__"). */
export function isPotion(id: unknown): id is PotionId {
  return typeof id === "string" && Object.hasOwn(POTIONS, id);
}

/** Quantas poções de cada tipo o jogador carrega no máximo. */
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
export const MARKET_POTION_PRICES: Record<PotionId, number> = { "potion-health": 50, "potion-mana": 40 };
/** Poções de cada tipo guardadas na conta (por personagem) ou levadas na hunt. */
export type PotionStock = Record<PotionId, number>;
/** Lê a contagem de poções de um json do banco ou de uma mensagem (qualquer coisa fora do catálogo vira 0). */
export function potionStock(raw: unknown): PotionStock {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(POTION_IDS.map((id) => [id, Math.max(0, Math.min(POTION_MAX, Math.floor(Number(src[id]) || 0)))])) as PotionStock;
}
/** Vendedor do acampamento (terreno de caça): preço de cada poção em loot carregado na hunt (uns 4 chacais ou 2 legionários). */
export const CAMP_VENDOR_PRICES: Record<PotionId, number> = { "potion-health": 25, "potion-mana": 20 };
/** O herói compra do vendedor a até esta distância (tiles). */
export const CAMP_VENDOR_RADIUS = 2;
/** Chance de a poção sorteada ser de vida (o resto é de mana). */
const HEALTH_POTION_CHANCE = 0.6;

/** Sorteia o tipo de uma poção dropada. `random` devolve [0, 1). */
export function rollPotion(random: () => number): PotionId {
  return random() < HEALTH_POTION_CHANCE ? "potion-health" : "potion-mana";
}
