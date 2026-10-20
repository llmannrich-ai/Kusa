import { CLASS_IDS, type ClassId } from "./classes.ts";
import { STARTER_SPELLS, SPELLS, type SpellId } from "./spells.ts";

// Árvore de magias de cada classe, comprada no menu com o gold das hunts.
// Dois tipos de nó: magia de ataque (vira opção quando o slot libera na hunt) e áurea
// (bônus passivo de dano, vida, mana ou velocidade, com vários níveis).
// A tabela `talents` no Supabase (migration 20261020000300) repete id, nível máximo, custo e
// pré-requisito de cada nó; mude as duas juntas.

export type AuraStat = "damage" | "hp" | "mana" | "speed";

export const AURA_STAT_NAMES: Record<AuraStat, string> = {
  damage: "dano",
  hp: "vida máxima",
  mana: "mana máxima",
  speed: "velocidade",
};

export interface TalentDef {
  id: string;
  classId: ClassId;
  /** Círculo da árvore (1 = raiz). */
  tier: 1 | 2 | 3;
  kind: "spell" | "aura";
  name: string;
  icon: string;
  /** Magia liberada (só `kind: "spell"`). */
  spellId?: SpellId;
  /** Bônus por nível da áurea, em fração (0.05 = +5%). */
  aura?: { stat: AuraStat; perRank: number };
  maxRank: number;
  /** Custo do nível n+1 = baseCost * costGrowth^n. */
  baseCost: number;
  costGrowth: number;
  /** Nó que precisa ter pelo menos `rank` níveis antes. */
  requires?: { id: string; rank: number };
}

/** Níveis comprados por nó (id → nível). Nó ausente = 0. */
export type TalentRanks = Record<string, number>;

/** Bônus das áureas somados, em fração. */
export interface Bonuses {
  damage: number;
  hp: number;
  mana: number;
  speed: number;
}

export const NO_BONUSES: Bonuses = { damage: 0, hp: 0, mana: 0, speed: 0 };

/** Magias compradas de cada classe: [slot 1, slot 2]. */
const TREE_SPELLS: Record<ClassId, [SpellId, SpellId]> = {
  knight: ["crushing_blow", "iron_skin"],
  paladin: ["piercing_shot", "healing_light"],
  sorcerer: ["lightning_bolt", "frost_nova"],
  druid: ["venom_thorn", "nature_wrath"],
};

/** Nome das áureas de cada classe (dano, vida, mana, velocidade). */
const AURA_NAMES: Record<ClassId, Record<AuraStat, string>> = {
  knight: { damage: "Áurea de Fúria", hp: "Áurea do Bastião", mana: "Áurea da Disciplina", speed: "Áurea da Investida" },
  paladin: { damage: "Áurea da Mira", hp: "Áurea da Fé", mana: "Áurea Sagrada", speed: "Áurea do Batedor" },
  sorcerer: { damage: "Áurea do Caos", hp: "Áurea da Égide", mana: "Áurea Arcana", speed: "Áurea do Vento" },
  druid: { damage: "Áurea dos Espinhos", hp: "Áurea do Carvalho", mana: "Áurea da Seiva", speed: "Áurea do Cervo" },
};

const AURA_ICONS: Record<AuraStat, string> = { damage: "⚔️", hp: "❤️", mana: "💧", speed: "👟" };

/**
 * Mesmo formato para todas as classes:
 *   Círculo 1: áurea de dano e áurea de vida
 *   Círculo 2: magia nova do slot 1 (pede dano 1) e áurea de mana (pede vida 1)
 *   Círculo 3: magia nova do slot 2 (pede a do slot 1) e áurea de velocidade (pede mana 1)
 */
function classTree(classId: ClassId): TalentDef[] {
  const [spellA, spellB] = TREE_SPELLS[classId];
  const names = AURA_NAMES[classId];
  const id = (key: string) => `${classId}_${key}`;
  const aura = (key: AuraStat, tier: 1 | 2 | 3, perRank: number, maxRank: number, baseCost: number, requires?: TalentDef["requires"]): TalentDef => ({
    id: id(key), classId, tier, kind: "aura", name: names[key], icon: AURA_ICONS[key],
    aura: { stat: key, perRank }, maxRank, baseCost, costGrowth: 1.8, requires,
  });
  const spell = (spellId: SpellId, tier: 1 | 2 | 3, baseCost: number, requires: TalentDef["requires"]): TalentDef => ({
    id: id(spellId), classId, tier, kind: "spell", name: SPELLS[spellId].name, icon: SPELLS[spellId].icon,
    spellId, maxRank: 1, baseCost, costGrowth: 1, requires,
  });
  return [
    aura("damage", 1, 0.04, 3, 120),
    aura("hp", 1, 0.06, 3, 120),
    spell(spellA, 2, 400, { id: id("damage"), rank: 1 }),
    aura("mana", 2, 0.08, 3, 150, { id: id("hp"), rank: 1 }),
    spell(spellB, 3, 900, { id: id(spellA), rank: 1 }),
    aura("speed", 3, 0.04, 2, 300, { id: id("mana"), rank: 1 }),
  ];
}

export const TALENTS: Record<string, TalentDef> = Object.fromEntries(
  CLASS_IDS.flatMap(classTree).map((t) => [t.id, t]),
);

/** Nós da árvore de uma classe, na ordem de exibição. */
export function talentTree(classId: ClassId): TalentDef[] {
  return Object.values(TALENTS).filter((t) => t.classId === classId);
}

/** Preço do próximo nível (o banco calcula igual em `buy_talent`). */
export function talentCost(def: TalentDef, currentRank: number): number {
  return Math.ceil(def.baseCost * def.costGrowth ** currentRank);
}

/** Por que o nó não pode ser comprado agora (null = pode, se houver gold). */
export function talentBlocker(def: TalentDef, ranks: TalentRanks): string | null {
  if ((ranks[def.id] ?? 0) >= def.maxRank) return def.kind === "spell" ? "Aprendida" : "Nível máximo";
  if (def.requires && (ranks[def.requires.id] ?? 0) < def.requires.rank) {
    return `Requer ${TALENTS[def.requires.id]?.name ?? def.requires.id}`;
  }
  return null;
}

/** Soma das áureas compradas da classe. */
export function auraBonuses(classId: ClassId, ranks: TalentRanks): Bonuses {
  const bonus = { ...NO_BONUSES };
  for (const t of talentTree(classId)) {
    const rank = Math.min(ranks[t.id] ?? 0, t.maxRank);
    if (t.aura && rank > 0) bonus[t.aura.stat] += t.aura.perRank * rank;
  }
  return bonus;
}

/** Magias que a classe conhece: as iniciais e as compradas na árvore. */
export function knownSpells(classId: ClassId, ranks: TalentRanks): SpellId[] {
  const starters = STARTER_SPELLS.filter((id) => SPELLS[id].classId === classId);
  const bought = talentTree(classId).filter((t) => t.spellId && (ranks[t.id] ?? 0) > 0).map((t) => t.spellId!);
  return [...starters, ...bought];
}

/** Texto curto do efeito de um nível de áurea. */
export function auraText(def: TalentDef, rank: number): string {
  if (!def.aura) return "";
  return `+${Math.round(def.aura.perRank * rank * 100)}% de ${AURA_STAT_NAMES[def.aura.stat]}`;
}
