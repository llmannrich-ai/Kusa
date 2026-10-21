import { CLASS_IDS, type ClassId } from "./classes.ts";
import { SPELL_MAX_RANK, STARTER_SPELLS, SPELLS, type SpellId } from "./spells.ts";
import { TRAITS, isTrait, type TraitId } from "./traits.ts";

// Grimório: a árvore de magias de cada classe, comprada no menu com o gold das hunts.
// É uma árvore de verdade: cada nó (fora a raiz) pede o nó pai no nível 1, então as magias da
// ponta só abrem depois das anteriores do mesmo ramo. Três tipos de nó:
//   magia: vira opção quando o slot libera na hunt; os níveis 2 e 3 deixam a magia mais forte;
//   áurea: bônus passivo de dano, vida, mana ou velocidade, com vários níveis;
//   traço: a passiva de uma especialização. No fim de um ramo, a árvore se divide em dois lados (`side`);
//          comprar o Traço de um lado tranca o outro para sempre (`exclusiveWith`), e as magias do lado
//          pedem o Traço.
// As 2 magias iniciais da classe já vêm no nível 1 (`freeRank`). A tabela `talents` no Supabase
// repete id, níveis, custo, nível grátis e pré-requisito de cada nó; mude os dois juntos.

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
  /** Posição no desenho do Grimório: coluna (ramo, 0 a 2) e linha (0 = raiz). */
  col: number;
  row: number;
  kind: "spell" | "aura" | "trait";
  name: string;
  icon: string;
  /** Magia liberada (só `kind: "spell"`). */
  spellId?: SpellId;
  /** Bônus por nível da áurea, em fração (0.05 = +5%). */
  aura?: { stat: AuraStat; perRank: number };
  /** Traço liberado (só `kind: "trait"`). */
  traitId?: TraitId;
  /** Lado da especialização (0 ou 1) no fim do ramo; ausente no tronco. */
  side?: 0 | 1;
  /** Traço do outro lado: com qualquer nível nele, este não pode ser comprado (escolha permanente). */
  exclusiveWith?: string;
  maxRank: number;
  /** Níveis que a conta já tem sem comprar (as magias iniciais começam no 1). */
  freeRank: number;
  /** Custo do nível n+1 = baseCost * costGrowth^n. */
  baseCost: number;
  costGrowth: number;
  /** Nó pai, que precisa ter pelo menos `rank` níveis antes. */
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

/** Nome das áureas de cada classe (dano, vida, mana, velocidade). */
const AURA_NAMES: Record<ClassId, Record<AuraStat, string>> = {
  knight: { damage: "Áurea de Fúria", hp: "Áurea do Bastião", mana: "Áurea da Disciplina", speed: "Áurea da Investida" },
  paladin: { damage: "Áurea da Mira", hp: "Áurea da Fé", mana: "Áurea Sagrada", speed: "Áurea do Batedor" },
  sorcerer: { damage: "Áurea do Caos", hp: "Áurea da Égide", mana: "Áurea Arcana", speed: "Áurea do Vento" },
  druid: { damage: "Áurea dos Espinhos", hp: "Áurea do Carvalho", mana: "Áurea da Seiva", speed: "Áurea do Cervo" },
};

const AURA_ICONS: Record<AuraStat, string> = { damage: "⚔️", hp: "❤️", mana: "💧", speed: "👟" };

/** Bônus, níveis e preço de cada áurea (iguais em todas as classes). */
const AURA_RULES: Record<AuraStat, { perRank: number; maxRank: number; baseCost: number }> = {
  damage: { perRank: 0.04, maxRank: 3, baseCost: 120 },
  hp: { perRank: 0.06, maxRank: 3, baseCost: 120 },
  mana: { perRank: 0.08, maxRank: 3, baseCost: 150 },
  speed: { perRank: 0.04, maxRank: 2, baseCost: 300 },
};

/** Preço do 1º nível de uma magia, pela profundidade na árvore (a ponta é mais cara). */
const SPELL_COST_BY_ROW = [150, 150, 300, 500, 800, 1200, 1200, 1600];
/** Preço do Traço de uma especialização (nível único). */
const TRAIT_COST = 1000;
/** As iniciais já vêm no nível 1: o 2 custa base × 1,6. */
const STARTER_BASE_COST = 150;

/** Nome dos 3 ramos (colunas) do Grimório de cada classe. */
export const TREE_BRANCHES: Record<ClassId, [string, string, string]> = {
  knight: ["Lâmina", "Bastião", "Comando"],
  paladin: ["Mira", "Luz", "Batedor"],
  sorcerer: ["Raio", "Gelo", "Trevas"],
  druid: ["Matilha", "Bosque", "Espinhos"],
};

/**
 * Forma do Grimório: [nó, coluna, linha, pai, lado]. O nó é uma magia (id de SPELLS), uma áurea
 * (damage, hp, mana, speed) ou um Traço (id de TRAITS). A raiz é a magia inicial do slot 1; dela saem os
 * 3 ramos. `lado` (0 ou 1) marca os nós de uma especialização; os dois Traços de um ramo se excluem.
 */
type ShapeKey = SpellId | AuraStat | TraitId;
type Shape = [key: ShapeKey, col: number, row: number, parent?: ShapeKey, side?: 0 | 1][];

const SHAPES: Record<ClassId, Shape> = {
  knight: [
    ["blade_spin", 1, 0],
    ["damage", 0, 1, "blade_spin"], ["hp", 1, 1, "blade_spin"], ["war_cry", 2, 1, "blade_spin"],
    ["crushing_blow", 0, 2, "damage"], ["holy_shield", 1, 2, "hp"], ["mana", 2, 2, "war_cry"],
    ["vampiric_blade", 0, 3, "crushing_blow"], ["iron_skin", 1, 3, "holy_shield"], ["speed", 2, 3, "mana"],
    ["earthquake", 0, 4, "vampiric_blade"], ["steel_wall", 1, 4, "iron_skin"], ["commander_shout", 2, 4, "speed"],
    ["execution", 0, 5, "earthquake"],
  ],
  paladin: [
    ["holy_arrow", 1, 0],
    ["damage", 0, 1, "holy_arrow"], ["hp", 1, 1, "holy_arrow"], ["arrow_rain", 2, 1, "holy_arrow"],
    ["piercing_shot", 0, 2, "damage"], ["healing_light", 1, 2, "hp"], ["mana", 2, 2, "arrow_rain"],
    ["stun_arrow", 0, 3, "piercing_shot"], ["blessed_ward", 1, 3, "healing_light"], ["speed", 2, 3, "mana"],
    ["deadly_shot", 0, 4, "stun_arrow"], ["divine_judgment", 1, 4, "blessed_ward"], ["explosive_volley", 2, 4, "speed"],
    // Mira: Atirador de Elite (lado 0) ou Caçador Ágil (lado 1).
    ["eagle_eye", 0, 5, "deadly_shot", 0], ["light_step", 0, 5, "deadly_shot", 1],
    ["hunter_mark", 0, 6, "eagle_eye", 0], ["evasive_roll", 0, 6, "light_step", 1],
    ["sniper_stance", 0, 7, "hunter_mark", 0], ["swift_quiver", 0, 7, "evasive_roll", 1],
  ],
  sorcerer: [
    ["shadow_orb", 1, 0],
    ["damage", 0, 1, "shadow_orb"], ["mana", 1, 1, "shadow_orb"], ["void_storm", 2, 1, "shadow_orb"],
    ["lightning_bolt", 0, 2, "damage"], ["frost_nova", 1, 2, "mana"], ["hp", 2, 2, "void_storm"],
    ["chain_lightning", 0, 3, "lightning_bolt"], ["ice_lance", 1, 3, "frost_nova"], ["drain_life", 2, 3, "hp"],
    ["meteor", 0, 4, "chain_lightning"], ["blizzard", 1, 4, "ice_lance"], ["speed", 2, 4, "drain_life"],
    ["dark_pact", 2, 5, "speed"],
  ],
  druid: [
    ["forest_blessing", 1, 0],
    ["damage", 0, 1, "forest_blessing"], ["mana", 1, 1, "forest_blessing"], ["thorn_roots", 2, 1, "forest_blessing"],
    ["spirit_wolf", 0, 2, "damage"], ["healing_moth", 1, 2, "mana"], ["venom_thorn", 2, 2, "thorn_roots"],
    ["wolf_pack", 0, 3, "spirit_wolf"], ["hp", 1, 3, "healing_moth"], ["hornet_swarm", 2, 3, "venom_thorn"],
    ["ancient_bear", 0, 4, "wolf_pack"], ["grove_guardian", 1, 4, "hp"], ["nature_wrath", 2, 4, "hornet_swarm"],
    ["speed", 0, 5, "ancient_bear"], ["forest_heart", 1, 5, "grove_guardian"],
  ],
};

const isAura = (key: string): key is AuraStat => key in AURA_RULES;

function classTree(classId: ClassId): TalentDef[] {
  const id = (key: string) => `${classId}_${key}`;
  const shape = SHAPES[classId];
  return shape.map(([key, col, row, parent, side]): TalentDef => {
    const requires = parent ? { id: id(parent), rank: 1 } : undefined;
    if (isTrait(key)) {
      const trait = TRAITS[key];
      if (trait.classId !== classId) throw new Error(`${key} não é Traço de ${classId}`);
      const other = shape.find(([k, c, r, , s]) => isTrait(k) && k !== key && c === col && r === row && s !== side);
      if (!other) throw new Error(`${key}: Traço sem o outro lado`);
      return {
        id: id(key), classId, col, row, side, kind: "trait", name: trait.name, icon: trait.icon, traitId: key,
        maxRank: 1, freeRank: 0, baseCost: TRAIT_COST, costGrowth: 1, requires, exclusiveWith: id(other[0]),
      };
    }
    if (isAura(key)) {
      const rule = AURA_RULES[key];
      return {
        id: id(key), classId, col, row, kind: "aura", name: AURA_NAMES[classId][key], icon: AURA_ICONS[key],
        aura: { stat: key, perRank: rule.perRank }, maxRank: rule.maxRank, freeRank: 0,
        baseCost: rule.baseCost, costGrowth: 1.8, requires,
      };
    }
    const spell = SPELLS[key];
    if (spell.classId !== classId) throw new Error(`${key} não é magia de ${classId}`);
    const starter = STARTER_SPELLS.includes(key);
    return {
      id: id(key), classId, col, row, side, kind: "spell", name: spell.name, icon: spell.icon, spellId: key,
      maxRank: SPELL_MAX_RANK, freeRank: starter ? 1 : 0,
      baseCost: starter ? STARTER_BASE_COST : SPELL_COST_BY_ROW[row], costGrowth: 1.6, requires,
    };
  });
}

export const TALENTS: Record<string, TalentDef> = Object.fromEntries(
  CLASS_IDS.flatMap(classTree).map((t) => [t.id, t]),
);

/** Nós do Grimório de uma classe, da raiz para as pontas. */
export function talentTree(classId: ClassId): TalentDef[] {
  return Object.values(TALENTS).filter((t) => t.classId === classId);
}

/** Preço do próximo nível (o banco calcula igual em `buy_talent`). */
export function talentCost(def: TalentDef, currentRank: number): number {
  return Math.ceil(def.baseCost * def.costGrowth ** currentRank);
}

/** Nível do nó na conta: o comprado, ou o grátis se for maior. */
export function talentRank(def: TalentDef, ranks: TalentRanks): number {
  return Math.min(def.maxRank, Math.max(ranks[def.id] ?? 0, def.freeRank));
}

/** Por que o nó não pode ser comprado agora (null = pode, se houver gold). */
export function talentBlocker(def: TalentDef, ranks: TalentRanks): string | null {
  if (talentRank(def, ranks) >= def.maxRank) return "Nível máximo";
  const rival = def.exclusiveWith && TALENTS[def.exclusiveWith];
  if (rival && talentRank(rival, ranks) > 0) return `Você escolheu ${TRAITS[rival.traitId!].spec}`;
  const parent = def.requires && TALENTS[def.requires.id];
  if (parent && talentRank(parent, ranks) < def.requires!.rank) return `Requer ${parent.name}`;
  return null;
}

/** Soma das áureas compradas da classe. */
export function auraBonuses(classId: ClassId, ranks: TalentRanks): Bonuses {
  const bonus = { ...NO_BONUSES };
  for (const t of talentTree(classId)) {
    const rank = talentRank(t, ranks);
    if (t.aura && rank > 0) bonus[t.aura.stat] += t.aura.perRank * rank;
  }
  return bonus;
}

/** Nível de cada magia que a classe conhece (as iniciais e as compradas no Grimório). */
export function spellRanks(classId: ClassId, ranks: TalentRanks): Partial<Record<SpellId, number>> {
  const out: Partial<Record<SpellId, number>> = {};
  for (const t of talentTree(classId)) {
    const rank = talentRank(t, ranks);
    if (t.spellId && rank > 0) out[t.spellId] = rank;
  }
  return out;
}

/** Traços que a conta tem na classe (um por ramo especializado, no máximo). */
export function activeTraits(classId: ClassId, ranks: TalentRanks): TraitId[] {
  return talentTree(classId).filter((t) => t.traitId && talentRank(t, ranks) > 0).map((t) => t.traitId!);
}

/** O lado escolhido de cada ramo especializado (coluna → 0 ou 1), para o menu mostrar o cadeado no outro. */
export function chosenSide(classId: ClassId, col: number, ranks: TalentRanks): 0 | 1 | null {
  const picked = talentTree(classId).find((t) => t.kind === "trait" && t.col === col && talentRank(t, ranks) > 0);
  return picked?.side ?? null;
}

/** Magias que a classe conhece: as iniciais e as compradas no Grimório. */
export function knownSpells(classId: ClassId, ranks: TalentRanks): SpellId[] {
  return Object.keys(spellRanks(classId, ranks)) as SpellId[];
}

/** Texto curto do efeito de um nível de áurea. */
export function auraText(def: TalentDef, rank: number): string {
  if (!def.aura) return "";
  return `+${Math.round(def.aura.perRank * rank * 100)}% de ${AURA_STAT_NAMES[def.aura.stat]}`;
}
