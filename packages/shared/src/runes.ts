import { ITEMS, itemColor, sellPrice } from "./items.ts";
import type { MonsterRank } from "./monsters.ts";
import { perkBonuses, type PerkBonuses, type PerkStacks } from "./perks.ts";
import { SPELLS, type SpellDef, type SpellId } from "./spells.ts";

// Runas: pedras mágicas que só caem dos bosses. Ficam no cofre e na bag como os itens (mesma tabela
// `profile_items`, ids "rune-…") e o jogador equipa até 3 no menu Itens, embaixo do equipamento.
// Cada runa dá um bônus que vale a hunt inteira (soma com as áureas e as melhorias de nível) ou libera
// uma magia de outra classe como opção extra na escolha do slot.
// A tabela `market_items` e as funções `equip_item`, `finish_run` e `store_bag` repetem os ids, preços e o
// limite de runas; mude os dois juntos.

/** Quantas runas o herói leva equipadas. */
export const RUNE_SLOTS = 3;

export type RuneKind =
  | "fury" | "life" | "stone" | "wind" | "arcane" | "blood" | "time" | "troll"
  | "lightning" | "faith" | "meteor" | "dawn"
  | "charge" | "banner" | "roll" | "mark" | "mist" | "grove" | "wolf" | "plague";

export interface RuneDef {
  /** Id de item: "rune-fury". */
  id: string;
  kind: RuneKind;
  name: string;
  icon: string;
  /** Cor do brilho da runa (ícone, chão e avisos). */
  color: number;
  description: string;
  /** Bônus somado às melhorias da hunt (mesmos eixos de `PerkBonuses`). */
  bonus?: Partial<PerkBonuses>;
  /** Magia que entra como opção extra na escolha do slot dela, para qualquer classe. */
  spell?: SpellId;
  /** Peso no sorteio do drop: as runas de magia são mais raras. */
  weight: number;
  /** Quanto o mercado paga. O mercado não vende runas. */
  sellPrice: number;
}

const rune = (kind: RuneKind, def: Omit<RuneDef, "id" | "kind">): RuneDef => ({ id: `rune-${kind}`, kind, ...def });

// Balanceamento: cada runa de bônus vale perto de 1,5 melhoria de nível; as de magia, uma magia do Grimório no nível 1.
// Runas de magia: 3 de cada classe, de preferência as que mais valem emprestadas (mobilidade, cura, invocação, apoio).
const LIST: RuneDef[] = [
  rune("fury", { name: "Runa da Fúria", icon: "⚔️", color: 0xe74c3c, description: "+15% de dano", bonus: { damage: 0.15 }, weight: 3, sellPrice: 120 }),
  rune("life", { name: "Runa da Vida", icon: "❤️", color: 0xff6b81, description: "+18% de vida máxima", bonus: { hp: 0.18 }, weight: 3, sellPrice: 120 }),
  rune("stone", { name: "Runa da Pedra", icon: "🪨", color: 0xf5f6fa, description: "+4 de armadura", bonus: { armor: 4 }, weight: 3, sellPrice: 120 }),
  rune("wind", { name: "Runa do Vento", icon: "👟", color: 0x7bed9f, description: "+12% de velocidade de movimento", bonus: { speed: 0.12 }, weight: 3, sellPrice: 120 }),
  rune("arcane", { name: "Runa Arcana", icon: "💧", color: 0x4aa3df, description: "+20% de mana máxima e +1% de mana por segundo", bonus: { mana: 0.2, manaRegen: 0.01 }, weight: 3, sellPrice: 120 }),
  rune("blood", { name: "Runa do Sangue", icon: "🩸", color: 0xb33939, description: "Cura 5% do dano que causa", bonus: { lifesteal: 0.05 }, weight: 3, sellPrice: 120 }),
  rune("time", { name: "Runa do Tempo", icon: "⏳", color: 0xf1c40f, description: "Recarga das magias 12% menor", bonus: { castHaste: 0.12 }, weight: 3, sellPrice: 120 }),
  rune("troll", { name: "Runa do Troll", icon: "💗", color: 0x2ecc71, description: "+2% de vida por segundo", bonus: { hpRegen: 0.02 }, weight: 3, sellPrice: 120 }),
  rune("lightning", { name: "Runa do Relâmpago", icon: "⚡", color: 0x9ec5ff, description: "Libera o Relâmpago no slot 1", spell: "lightning_bolt", weight: 1, sellPrice: 220 }),
  rune("faith", { name: "Runa da Fé", icon: "🛡️", color: 0x7fc8ff, description: "Libera o Escudo da Fé no slot 1", spell: "holy_shield", weight: 1, sellPrice: 220 }),
  rune("meteor", { name: "Runa do Meteoro", icon: "☄️", color: 0xff7f50, description: "Libera o Meteoro no slot 2", spell: "meteor", weight: 1, sellPrice: 220 }),
  rune("dawn", { name: "Runa da Aurora", icon: "☀️", color: 0xfff6c8, description: "Libera a Luz Curativa no slot 2", spell: "healing_light", weight: 1, sellPrice: 220 }),
  rune("charge", { name: "Runa da Investida", icon: "🐎", color: 0xe67e22, description: "Libera a Investida no slot 1", spell: "charge", weight: 1, sellPrice: 220 }),
  rune("banner", { name: "Runa do Estandarte", icon: "🚩", color: 0xf1c40f, description: "Libera o Estandarte de Guerra no slot 2", spell: "war_banner", weight: 1, sellPrice: 220 }),
  rune("roll", { name: "Runa do Rolamento", icon: "🤸", color: 0x9be15d, description: "Libera o Rolamento no slot 1", spell: "evasive_roll", weight: 1, sellPrice: 220 }),
  rune("mark", { name: "Runa do Caçador", icon: "🎯", color: 0xff5e57, description: "Libera a Marca do Caçador no slot 1", spell: "hunter_mark", weight: 1, sellPrice: 220 }),
  rune("mist", { name: "Runa da Névoa", icon: "💨", color: 0xc7b8ff, description: "Libera o Passo Nebuloso no slot 1", spell: "misty_step", weight: 1, sellPrice: 220 }),
  rune("grove", { name: "Runa do Bosque", icon: "🌿", color: 0x2ecc71, description: "Libera a Bênção da Floresta no slot 1", spell: "forest_blessing", weight: 1, sellPrice: 220 }),
  rune("wolf", { name: "Runa do Lobo", icon: "🐺", color: 0xa9d4ff, description: "Libera o Lobo Espiritual no slot 1", spell: "spirit_wolf", weight: 1, sellPrice: 220 }),
  rune("plague", { name: "Runa da Peste", icon: "🦠", color: 0x9acd32, description: "Libera a Nuvem Venenosa no slot 2", spell: "poison_cloud", weight: 1, sellPrice: 220 }),
];

export const RUNES: Record<string, RuneDef> = Object.fromEntries(LIST.map((r) => [r.id, r]));
export const RUNE_IDS = LIST.map((r) => r.id);

/** Só chaves próprias: o id pode vir de qualquer lugar (ex.: "__proto__"). */
export function isRune(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(RUNES, id);
}

/**
 * Runas que valem de verdade entre as equipadas: até `RUNE_SLOTS`, sem repetir a mesma runa
 * (o banco já impede, mas o servidor não confia na lista).
 */
export function activeRunes(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(isRune))].slice(0, RUNE_SLOTS);
}

/** Bônus somado das melhorias da hunt e das runas equipadas: o que vale para vida, dano, recargas etc. */
export function heroBonuses(stacks: PerkStacks, runes: readonly string[] = []): PerkBonuses {
  const total = perkBonuses(stacks);
  for (const id of activeRunes(runes)) {
    for (const [key, value] of Object.entries(RUNES[id].bonus ?? {}) as [keyof PerkBonuses, number][]) total[key] += value;
  }
  return total;
}

/** Magias liberadas pelas runas equipadas (opções extras na escolha do slot). */
export function runeSpells(runes: readonly string[]): SpellId[] {
  return activeRunes(runes).flatMap((id) => RUNES[id].spell ?? []);
}

/** Magia de runa de outra classe custa no máximo esta fração da mana máxima (o cavaleiro tem pouca mana). */
export const RUNE_SPELL_MANA_CAP = 0.4;

/** Mana que a magia gasta para este herói. */
export function spellManaCost(spell: SpellDef, classId: string, maxMana: number) {
  return spell.classId === classId ? spell.manaCost : Math.min(spell.manaCost, Math.ceil(maxMana * RUNE_SPELL_MANA_CAP));
}

/** Texto da runa: o bônus, ou a magia que ela libera com o que a magia faz. */
export function runeEffect(def: RuneDef) {
  return def.spell ? `${def.description}: ${SPELLS[def.spell].description}` : def.description;
}

// --- Drops -------------------------------------------------------------------

/** Quantas runas cada rank dropa: só os bosses dos mapas. */
export const RUNE_DROPS: Record<MonsterRank, number> = { common: 0, miniboss: 0, boss: 1 };

/** Sorteia uma runa pelo peso. `random` devolve [0, 1). */
export function rollRune(random: () => number): string {
  const total = LIST.reduce((sum, r) => sum + r.weight, 0);
  let roll = random() * total;
  for (const r of LIST) {
    roll -= r.weight;
    if (roll < 0) return r.id;
  }
  return LIST[LIST.length - 1].id;
}

// --- Itens e runas juntos (cofre, bag, mercado) ---------------------------------

/** Nome de um item ou runa da conta. */
export function lootName(id: string) {
  return ITEMS[id]?.name ?? RUNES[id]?.name ?? id;
}

/** Cor de destaque: a da raridade do item ou o brilho da runa. */
export function lootColor(id: string): number {
  if (ITEMS[id]) return itemColor(id);
  return RUNES[id]?.color ?? 0xdcdde1;
}

/** Quanto o mercado paga por um item ou runa (repete `market_items.sell_price`). */
export function lootSellPrice(id: string): number {
  return ITEMS[id] ? sellPrice(id) : RUNES[id]?.sellPrice ?? 0;
}
