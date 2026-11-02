import type { ClassId } from "./classes.ts";
import type { DamageElement, DotKind } from "./monsters.ts";
import { SPELLS, type SpellId } from "./spells.ts";

/** Elemento do ataque básico de cada classe. */
export const BASIC_ELEMENT: Record<ClassId, DamageElement> = {
  knight: "physical",
  paladin: "physical",
  sorcerer: "energy",
  druid: "nature",
  shaman: "fire",
};

/** Elemento do dano contínuo. */
export const DOT_ELEMENT: Record<DotKind, DamageElement> = { poison: "nature", burn: "fire", bleed: "physical" };

/** Magias do Paladino e do Druida que não são do elemento padrão da classe (o Feiticeiro diz o elemento de cada uma). */
const SPELL_ELEMENT: Partial<Record<SpellId, DamageElement>> = {
  holy_arrow: "radiant", holy_hammer: "radiant", holy_spear: "radiant", sunbeam: "radiant", divine_caldera: "radiant",
  divine_judgment: "radiant", consecrated_ground: "radiant", healing_light: "radiant",
  fire_arrows: "fire", explosive_volley: "fire", lightning_arrow: "energy",
  call_lightning: "energy", thunderwave: "energy",
};

const SORCERER_ELEMENT = { energy: "energy", fire: "fire", ice: "ice", dark: "dark" } as const;

/** Elemento de uma magia. */
export function spellElement(id: SpellId): DamageElement {
  const spell = SPELLS[id];
  if (spell.element) return SORCERER_ELEMENT[spell.element];
  if (SPELL_ELEMENT[id]) return SPELL_ELEMENT[id]!;
  if (spell.classId === "shaman") return "fire";
  return spell.classId === "druid" ? "nature" : "physical";
}

/**
 * Elemento de um dano de herói pela fonte da telemetria (`"basic"`, id da magia, `"summon:<tipo>"`, `"item:burn"`...).
 * Dano contínuo vale pelo tipo dele (veneno é natureza, queimadura é fogo, sangramento é físico).
 */
export function damageElement(source: string, classId: ClassId | undefined, dot?: DotKind): DamageElement {
  if (dot) return DOT_ELEMENT[dot];
  if (source === "basic") return classId ? BASIC_ELEMENT[classId] : "physical";
  if (source === "item:burn") return "fire";
  if (source === "item:poison") return "nature";
  if (source === "charged_sky" || source === "closed_sky") return "energy";
  // Reações (`reactions.ts`): a explosão leva o elemento do que reagiu.
  if (source === "reaction:vapor") return "ice";
  if (source === "reaction:doom") return "dark";
  if (source === "reaction:incandesce") return "radiant";
  if (source.startsWith("summon:")) return source === "summon:hornet" || source === "summon:treant" ? "nature" : "physical";
  if (source in SPELLS) return spellElement(source as SpellId);
  return "physical";
}

export const ELEMENT_NAMES: Record<DamageElement, string> = {
  physical: "físico", fire: "fogo", ice: "gelo", energy: "energia", dark: "trevas", radiant: "luz", nature: "natureza",
};
