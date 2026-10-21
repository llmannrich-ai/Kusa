import { BASIC_ATTACK_COOLDOWN_MS, SPELL_SLOT_LEVELS } from "./spells.ts";

// Melhorias da hunt: a cada nível que não abre slot de magia, o servidor sorteia 2 melhorias e o
// jogador escolhe uma. Valem só até o fim da hunt e somam por cima das áureas do Grimório.
// Balanceamento: cada escolha vale perto de +10% de poder num eixo. Numa hunt de 4 min o jogador
// chega a ~5 escolhas (níveis 2, 4, 5, 7, 8); o limite de cada uma impede empilhar um eixo só.

export type PerkId =
  | "vigor" | "arcana" | "regen" | "clarity" | "might"
  | "haste" | "guard" | "frenzy" | "focus" | "leech";

export interface PerkDef {
  id: PerkId;
  name: string;
  icon: string;
  /** O que cada escolha dá (texto da carta). */
  description: string;
  /** Ganho por escolha: fração (0.1 = +10%), exceto armadura (pontos). */
  perStack: number;
  /** Quantas vezes pode ser escolhida na mesma hunt. */
  maxStacks: number;
  /** Só aparece depois de abrir o 1º slot de magia (não serve para nada antes). */
  needsSpell?: boolean;
}

export const PERKS: Record<PerkId, PerkDef> = {
  vigor: { id: "vigor", name: "Vigor", icon: "❤️", description: "+12% de vida máxima", perStack: 0.12, maxStacks: 5 },
  arcana: { id: "arcana", name: "Reserva arcana", icon: "💧", description: "+15% de mana máxima", perStack: 0.15, maxStacks: 4, needsSpell: true },
  regen: { id: "regen", name: "Regeneração", icon: "💗", description: "+1% de vida por segundo", perStack: 0.01, maxStacks: 3 },
  clarity: { id: "clarity", name: "Clareza", icon: "🔷", description: "+1,5% de mana por segundo", perStack: 0.015, maxStacks: 3, needsSpell: true },
  might: { id: "might", name: "Força", icon: "⚔️", description: "+10% de dano", perStack: 0.1, maxStacks: 5 },
  haste: { id: "haste", name: "Agilidade", icon: "👟", description: "+6% de velocidade de movimento", perStack: 0.06, maxStacks: 3 },
  guard: { id: "guard", name: "Escudo", icon: "🛡️", description: "+3 de armadura (corta dano recebido)", perStack: 3, maxStacks: 4 },
  frenzy: { id: "frenzy", name: "Fúria", icon: "🗡️", description: "Ataque básico 10% mais rápido", perStack: 0.1, maxStacks: 3 },
  focus: { id: "focus", name: "Foco", icon: "⏳", description: "Recarga das magias 10% menor", perStack: 0.1, maxStacks: 3, needsSpell: true },
  leech: { id: "leech", name: "Sede de sangue", icon: "🩸", description: "Cura 4% do dano que causa", perStack: 0.04, maxStacks: 3 },
};

export const PERK_IDS = Object.keys(PERKS) as PerkId[];

/** Quantas melhorias aparecem para escolher a cada nível. */
export const PERK_CHOICES = 2;

export function isPerk(id: unknown): id is PerkId {
  return typeof id === "string" && id in PERKS;
}

/** Níveis que dão uma melhoria: todos a partir do 2, menos os que abrem um slot de magia. */
export function grantsPerk(level: number): boolean {
  return level >= 2 && !(SPELL_SLOT_LEVELS as readonly number[]).includes(level);
}

/** Melhorias escolhidas na hunt (id → quantas vezes). */
export type PerkStacks = Partial<Record<PerkId, number>>;

/** Efeito somado das melhorias escolhidas. */
export interface PerkBonuses {
  /** Frações somadas às áureas (vida, mana, dano, velocidade). */
  hp: number;
  mana: number;
  damage: number;
  speed: number;
  /** Regeneração extra por segundo, em fração do máximo. */
  hpRegen: number;
  manaRegen: number;
  /** Pontos de armadura somados aos do equipamento. */
  armor: number;
  /** Fração cortada da recarga do ataque básico e das magias. */
  attackHaste: number;
  castHaste: number;
  /** Fração do dano causado que vira cura. */
  lifesteal: number;
}

export function perkBonuses(stacks: PerkStacks): PerkBonuses {
  const n = (id: PerkId) => Math.min(stacks[id] ?? 0, PERKS[id].maxStacks) * PERKS[id].perStack;
  return {
    hp: n("vigor"),
    mana: n("arcana"),
    damage: n("might"),
    speed: n("haste"),
    hpRegen: n("regen"),
    manaRegen: n("clarity"),
    armor: n("guard"),
    attackHaste: n("frenzy"),
    castHaste: n("focus"),
    lifesteal: n("leech"),
  };
}

/**
 * Sorteia as melhorias oferecidas: diferentes entre si e fora das que já chegaram ao limite.
 * `roll` devolve um número em [0, 1). Com menos opções disponíveis, oferece as que restam.
 */
export function rollPerkOffer(stacks: PerkStacks, level: number, roll: () => number): PerkId[] {
  const pool = PERK_IDS.filter((id) => (stacks[id] ?? 0) < PERKS[id].maxStacks
    && (!PERKS[id].needsSpell || level >= SPELL_SLOT_LEVELS[0]));
  const offer: PerkId[] = [];
  while (offer.length < PERK_CHOICES && pool.length > 0) {
    offer.push(pool.splice(Math.floor(roll() * pool.length), 1)[0]);
  }
  return offer;
}

/** Recarga do ataque básico com a Fúria. */
export function attackCooldownMs(stacks: PerkStacks): number {
  return Math.round(BASIC_ATTACK_COOLDOWN_MS * (1 - perkBonuses(stacks).attackHaste));
}

/** Recarga de uma magia com o Foco. */
export function spellCooldownMs(cooldownMs: number, stacks: PerkStacks): number {
  return Math.round(cooldownMs * (1 - perkBonuses(stacks).castHaste));
}
