import type { MonsterRank } from "./monsters.ts";

/**
 * Poções: só caem na dungeon (não há compra no mercado) e valem só durante a hunt.
 * No chão, viram um `GroundItem` com o id da poção; quem passa por cima guarda, até o limite.
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
export const COMMON_POTION_CHANCE = 0.25;
/** Quantas poções cada rank dropa com certeza (comuns usam a chance acima). O baú dá uma de cada. */
export const GUARANTEED_POTIONS: Record<MonsterRank, number> = { common: 0, miniboss: 1, boss: 2 };
/** Chance de a poção sorteada ser de vida (o resto é de mana). */
const HEALTH_POTION_CHANCE = 0.6;

/** Sorteia o tipo de uma poção dropada. `random` devolve [0, 1). */
export function rollPotion(random: () => number): PotionId {
  return random() < HEALTH_POTION_CHANCE ? "potion-health" : "potion-mana";
}
