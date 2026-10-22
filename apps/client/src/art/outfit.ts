import type { ItemSlot } from "@kusa/shared";

/**
 * Equipamento vestido no herói: o id do item em cada slot. Como cada item aparece vestido está em
 * `hero/` (um desenho por item, igual em qualquer classe).
 */

/** Ids dos itens vestidos por slot ("" = vazio). */
export type Outfit = Record<ItemSlot, string>;
export const NO_OUTFIT: Outfit = { weapon: "", helmet: "", armor: "", legs: "", boots: "", shield: "" };

/** Roupa de quem tem os slots como campos (o jogador sincronizado pelo servidor). */
export function outfitOf(p: Readonly<Outfit>): Outfit {
  return { weapon: p.weapon, helmet: p.helmet, armor: p.armor, legs: p.legs, boots: p.boots, shield: p.shield };
}

/** Chave estável de uma roupa (texturas e cache de retratos). */
export function outfitKey(outfit: Outfit) {
  return [outfit.weapon, outfit.helmet, outfit.armor, outfit.legs, outfit.boots, outfit.shield].map((id) => id || "-").join(".");
}
