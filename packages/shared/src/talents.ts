import { CLASS_IDS, type ClassId } from "./classes.ts";
import { STARTER_SPELLS, SPELLS, type SpellId } from "./spells.ts";
import { STARTER_SPELL_XP, spellLevelFromXp } from "./spellxp.ts";
import { GIFTS, GIFT_BASE_COST, GIFT_COST_GROWTH, GIFT_MAX_RANK, sumGifts, type GiftEffects, type GiftId } from "./gifts.ts";
import { TRAITS, isTrait, type TraitId } from "./traits.ts";

// Grimório: a árvore de magias de cada classe, comprada no menu com o gold das hunts.
// É uma árvore de verdade: cada nó (fora a raiz) pede o nó pai no nível 1, então as magias da
// ponta só abrem depois das anteriores do mesmo ramo. Três tipos de nó:
//   magia: comprada uma vez, vira opção quando o slot libera na hunt. O nível dela não se compra: sobe com o uso
//          nas hunts (`spellxp.ts`), e o nível 1 é o que os nós de baixo pedem;
//   áurea: bônus passivo de dano, vida, mana ou velocidade, com vários níveis;
//   traço: a passiva de uma especialização. No fim de um ramo, a árvore se divide em dois lados (`side`);
//          comprar o Traço de um lado tranca o outro para sempre (`exclusiveWith`), e as magias do lado
//          pedem o Traço;
//   dom:   passiva comprada só com gold, com 25 níveis (`gifts.ts`). Não pede XP: o gold sempre tem para onde ir.
// Cada ramo é uma espinha de peixe (inspirada no Diablo 2): o tronco desce no meio e as costelas (`RIBS`) saem
// para os lados em alturas e tamanhos diferentes, então nenhum ramo tem a mesma forma. Um nó de costela pode
// pedir dois pais (`alsoRequires`), como a Nevasca do Diablo 2 pede duas magias.
// Sinergias (também do Diablo 2): cada nível de uso de uma magia vizinha na árvore (ligada por galho) deixa a magia
// mais forte, e o Tomo de cada ramo (`kind: "tome"`, comprado com gold) fortalece todas as magias do ramo. A força
// extra soma com a do nível (`spellAtRank`) e é calculada pelo servidor ao entrar na sala (`spellBonuses`).
// As 2 magias iniciais da classe já vêm compradas (`freeRank`) e no nível 1. A tabela `talents` no Supabase
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
  /** Posição de lado dentro do ramo: 0 = tronco, −2 a 2 = costelas e lados das especializações. */
  lane: number;
  kind: "spell" | "aura" | "trait" | "tome" | "gift";
  name: string;
  icon: string;
  /** Magia liberada (só `kind: "spell"`). */
  spellId?: SpellId;
  /** Bônus por nível da áurea, em fração (0.05 = +5%): `perRank` nos `baseRanks` primeiros níveis, `perRankAfter` nos outros. */
  aura?: { stat: AuraStat } & StackedRule;
  /** Força extra por nível do Tomo nas magias do ramo dele (só `kind: "tome"`), em fração, com a mesma regra da áurea. */
  tome?: StackedRule;
  /** Dom liberado (só `kind: "gift"`). */
  giftId?: GiftId;
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
  /** Nó pai, que precisa ter pelo menos `rank` níveis antes (numa magia, o nível ganho com o uso). */
  requires?: { id: string; rank: number };
  /** Segundo pai (nó de costela que cruza com o tronco): também precisa ter `rank` níveis. */
  alsoRequires?: { id: string; rank: number };
}

/**
 * Ganho por nível das áureas e dos Tomos: os `baseRanks` primeiros níveis (os de antes do Grimório 4.0) valem
 * `perRank` cada; do nível seguinte até o 20, cada nível vale `perRankAfter` (menos, mas são muitos níveis).
 */
export interface StackedRule {
  perRank: number;
  perRankAfter: number;
  baseRanks: number;
}

/** Total de uma áurea ou de um Tomo num nível. */
export function stackedValue(rule: StackedRule, rank: number): number {
  const first = Math.min(rank, rule.baseRanks);
  return first * rule.perRank + Math.max(0, rank - rule.baseRanks) * rule.perRankAfter;
}

/** Níveis comprados por nó (id → nível). Nó ausente = 0. Uma magia tem no máximo 1: comprada. */
export type TalentRanks = Record<string, number>;

/** XP de uso de cada magia da conta (id do nó → XP acumulado). Magia ausente = 0. */
export type SpellXp = Record<string, number>;

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
  shaman: { damage: "Áurea da Forja", hp: "Áurea do Couro Curtido", mana: "Áurea do Entalhe", speed: "Áurea do Clã" },
};

const AURA_ICONS: Record<AuraStat, string> = { damage: "⚔️", hp: "❤️", mana: "💧", speed: "👟" };

/**
 * Bônus, níveis e preço de cada áurea (iguais em todas as classes). Os primeiros níveis são os de antes do Grimório
 * 4.0; os outros (até o 20) valem menos cada. A velocidade para no 6: velocidade alta deixa o herói fugir de tudo.
 */
const AURA_RULES: Record<AuraStat, StackedRule & { maxRank: number; baseCost: number; costGrowth: number }> = {
  damage: { perRank: 0.04, perRankAfter: 0.01, baseRanks: 3, maxRank: 20, baseCost: 120, costGrowth: 1.15 },
  hp: { perRank: 0.06, perRankAfter: 0.015, baseRanks: 3, maxRank: 20, baseCost: 120, costGrowth: 1.15 },
  mana: { perRank: 0.08, perRankAfter: 0.02, baseRanks: 3, maxRank: 20, baseCost: 150, costGrowth: 1.15 },
  speed: { perRank: 0.04, perRankAfter: 0.01, baseRanks: 2, maxRank: 6, baseCost: 300, costGrowth: 1.3 },
};

/** Preço do 1º nível de uma magia do tronco ou de uma costela, pela profundidade na árvore (a ponta é mais cara). */
const SPELL_COST_BY_ROW = [150, 150, 300, 500, 800, 1200];
/** Preço do 1º nível das magias de uma especialização: a 1ª do lado (logo abaixo do Traço) e a 2ª. */
const SIDE_SPELL_COST = [1200, 1600];
/** Preço do Traço de uma especialização (nível único). */
const TRAIT_COST = 1000;
/** As iniciais já vêm compradas: o preço nunca é cobrado (o banco só pede um valor positivo). */
const STARTER_BASE_COST = 150;

/** Nome dos 3 ramos (colunas) do Grimório de cada classe. */
export const TREE_BRANCHES: Record<ClassId, [string, string, string]> = {
  knight: ["Lâmina", "Bastião", "Comando"],
  paladin: ["Mira", "Luz", "Batedor"],
  sorcerer: ["Raio", "Gelo", "Trevas"],
  druid: ["Matilha", "Bosque", "Espinhos"],
  shaman: ["Horda", "Totens", "Brasa"],
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
    // Lâmina: Berserker (lado 0) ou Duelista (lado 1).
    ["battle_thirst", 0, 6, "execution", 0], ["riposte", 0, 6, "execution", 1],
    ["steel_whirlwind", 0, 7, "battle_thirst", 0], ["thrown_blade", 0, 7, "riposte", 1],
    ["berserk_rage", 0, 8, "steel_whirlwind", 0], ["thousand_cuts", 0, 8, "thrown_blade", 1],
    // Bastião: Guardião (lado 0) ou Inabalável (lado 1).
    ["intervene", 1, 5, "steel_wall", 0], ["last_bastion", 1, 5, "steel_wall", 1],
    ["shield_bash", 1, 6, "intervene", 0], ["iron_thorns", 1, 6, "last_bastion", 1],
    ["shared_aegis", 1, 7, "shield_bash", 0], ["living_fortress", 1, 7, "iron_thorns", 1],
    // Comando: Senhor da Guerra (lado 0) ou Desafiante (lado 1).
    ["leadership", 2, 5, "commander_shout", 0], ["intimidate", 2, 5, "commander_shout", 1],
    ["charge", 2, 6, "leadership", 0], ["iron_chain", 2, 6, "intimidate", 1],
    ["war_banner", 2, 7, "charge", 0], ["supreme_challenge", 2, 7, "iron_chain", 1],
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
    // Luz: Cruzado (lado 0) ou Guardião da Luz (lado 1).
    ["consecrated_arrows", 1, 5, "divine_judgment", 0], ["sacred_aura", 1, 5, "divine_judgment", 1],
    ["holy_spear", 1, 6, "consecrated_arrows", 0], ["light_shield", 1, 6, "sacred_aura", 1],
    ["divine_caldera", 1, 7, "holy_spear", 0], ["consecrated_ground", 1, 7, "light_shield", 1],
    // Batedor: Artilheiro (lado 0) ou Armadilheiro (lado 1).
    ["gunpowder", 2, 5, "explosive_volley", 0], ["ingenious", 2, 5, "explosive_volley", 1],
    ["lightning_arrow", 2, 6, "gunpowder", 0], ["bear_trap", 2, 6, "ingenious", 1],
    ["barrage", 2, 7, "lightning_arrow", 0], ["arrow_cordon", 2, 7, "bear_trap", 1],
  ],
  sorcerer: [
    ["shadow_orb", 1, 0],
    ["damage", 0, 1, "shadow_orb"], ["mana", 1, 1, "shadow_orb"], ["void_storm", 2, 1, "shadow_orb"],
    ["lightning_bolt", 0, 2, "damage"], ["frost_nova", 1, 2, "mana"], ["hp", 2, 2, "void_storm"],
    ["chain_lightning", 0, 3, "lightning_bolt"], ["ice_lance", 1, 3, "frost_nova"], ["drain_life", 2, 3, "hp"],
    ["meteor", 0, 4, "chain_lightning"], ["blizzard", 1, 4, "ice_lance"], ["speed", 2, 4, "drain_life"],
    ["dark_pact", 2, 5, "speed"],
    // Raio: Tempestuoso (lado 0) ou Piromante (lado 1).
    ["static_charge", 0, 5, "meteor", 0], ["combustion", 0, 5, "meteor", 1],
    ["energy_beam", 0, 6, "static_charge", 0], ["fireball", 0, 6, "combustion", 1],
    ["sky_fury", 0, 7, "energy_beam", 0], ["infernal_core", 0, 7, "fireball", 1],
    // Gelo: Criomante (lado 0) ou Arcanista (lado 1).
    ["shatter", 1, 5, "blizzard", 0], ["mana_shield", 1, 5, "blizzard", 1],
    ["cone_of_cold", 1, 6, "shatter", 0], ["misty_step", 1, 6, "mana_shield", 1],
    ["ice_prison", 1, 7, "cone_of_cold", 0], ["magic_wall", 1, 7, "misty_step", 1],
    // Trevas: Necromante (lado 0) ou Bruxo (lado 1).
    ["harvest", 2, 6, "dark_pact", 0], ["hex", 2, 6, "dark_pact", 1],
    ["sudden_death", 2, 7, "harvest", 0], ["eldritch_blast", 2, 7, "hex", 1],
    ["raise_skeletons", 2, 8, "sudden_death", 0], ["black_tentacles", 2, 8, "eldritch_blast", 1],
  ],
  druid: [
    ["forest_blessing", 1, 0],
    ["damage", 0, 1, "forest_blessing"], ["mana", 1, 1, "forest_blessing"], ["thorn_roots", 2, 1, "forest_blessing"],
    ["spirit_wolf", 0, 2, "damage"], ["healing_moth", 1, 2, "mana"], ["venom_thorn", 2, 2, "thorn_roots"],
    ["wolf_pack", 0, 3, "spirit_wolf"], ["hp", 1, 3, "healing_moth"], ["hornet_swarm", 2, 3, "venom_thorn"],
    ["ancient_bear", 0, 4, "wolf_pack"], ["grove_guardian", 1, 4, "hp"], ["nature_wrath", 2, 4, "hornet_swarm"],
    ["speed", 0, 5, "ancient_bear"], ["forest_heart", 1, 5, "grove_guardian"],
    // Matilha: Mestre das Feras (lado 0) ou Metamorfo (lado 1).
    ["wild_bond", 0, 6, "speed", 0], ["wild_hide", 0, 6, "speed", 1],
    ["beast_cry", 0, 7, "wild_bond", 0], ["panther_form", 0, 7, "wild_hide", 1],
    ["giant_eagle", 0, 8, "beast_cry", 0], ["bear_form", 0, 8, "panther_form", 1],
    // Bosque: Círculo da Vida (lado 0) ou Guardião da Natureza (lado 1).
    ["bloom", 1, 6, "forest_heart", 0], ["protective_sap", 1, 6, "forest_heart", 1],
    ["distant_heal", 1, 7, "bloom", 0], ["barkskin", 1, 7, "protective_sap", 1],
    ["rebirth_seed", 1, 8, "distant_heal", 0], ["reviving_rain", 1, 8, "barkskin", 1],
    // Espinhos: Peste (lado 0) ou Tempestade (lado 1).
    ["toxin", 2, 5, "nature_wrath", 0], ["charged_sky", 2, 5, "nature_wrath", 1],
    ["mamba_bite", 2, 6, "toxin", 0], ["thunderwave", 2, 6, "charged_sky", 1],
    ["poison_cloud", 2, 7, "mamba_bite", 0], ["call_lightning", 2, 7, "thunderwave", 1],
  ],
  // Xamã Orc, Fase 1 (docs/CLASSE_XAMA_ORC.md): só as iniciais e as áureas. Os ramos Horda, Totens e Brasa crescem
  // na Fase 2, com as invocações do clã.
  shaman: [
    ["ember_totem", 1, 0],
    ["damage", 0, 1, "ember_totem"], ["mana", 1, 1, "ember_totem"], ["war_drum", 2, 1, "ember_totem"],
    ["hp", 2, 2, "war_drum"],
  ],
};

/**
 * Costelas de cada ramo: [magia, coluna, linha, pai, lado, segundo pai]. `lado` é a posição na tela do ramo
 * (−1 e −2 à esquerda do tronco, 1 e 2 à direita). Uma costela nasce num nó do tronco e desce em diagonal; o
 * segundo pai, quando existe, é um nó do tronco que a costela cruza (uma diagonal pontilhada no desenho).
 * As costelas ficam acima da bifurcação das especializações, que usa os lados −1 e 1.
 */
type Rib = [key: SpellId, col: number, row: number, parent: ShapeKey, lane: number, also?: ShapeKey];

const RIBS: Record<ClassId, Rib[]> = {
  knight: [
    // Lâmina: costela longa à esquerda; à direita, a Fenda pede o Terremoto do tronco.
    ["twin_slash", 0, 3, "crushing_blow", -1], ["cross_cut", 0, 4, "twin_slash", -2],
    ["open_wound", 0, 4, "vampiric_blade", 1], ["seismic_rift", 0, 5, "open_wound", 1, "earthquake"],
    // Bastião: uma costela só, à direita.
    ["aegis_strike", 1, 3, "holy_shield", 1], ["shield_quake", 1, 4, "aegis_strike", 2],
    // Comando: costela curta à esquerda e outra à direita que cruza com a Áurea da Investida.
    ["stunning_roar", 2, 2, "war_cry", -1],
    ["battle_order", 2, 3, "mana", 1], ["challenge_mark", 2, 4, "battle_order", 1, "speed"],
    // Grimório 4.0: costelas de leque.
    ["gale_blade", 0, 3, "crushing_blow", 2], ["shield_wall", 1, 3, "holy_shield", -1], ["cutting_shout", 2, 3, "mana", -2],
  ],
  paladin: [
    ["double_shot", 0, 3, "piercing_shot", -1], ["barbed_arrow", 0, 4, "double_shot", -2],
    ["sunbeam", 1, 2, "hp", 1], ["holy_hammer", 1, 4, "sunbeam", 1, "blessed_ward"],
    ["net_arrow", 2, 2, "arrow_rain", -1], ["fire_arrows", 2, 4, "speed", 1],
    ["arrow_fan", 0, 3, "piercing_shot", 1], ["holy_flash", 1, 3, "healing_light", -1], ["caltrops", 2, 3, "mana", 1],
  ],
  sorcerer: [
    ["spark", 0, 3, "lightning_bolt", -1], ["ember_rain", 0, 4, "spark", -2],
    // Gelo: o Orbe Congelado pede a Geada e a Lança de Gelo (no Diablo 2, pede a Nevasca e a Nova de Gelo).
    ["frostbite", 1, 3, "frost_nova", 1], ["frozen_orb", 1, 4, "frostbite", 1, "ice_lance"],
    ["dark_seal", 2, 2, "void_storm", -1], ["plague", 2, 4, "drain_life", 1],
    ["fire_spit", 0, 3, "lightning_bolt", 1], ["lightning_fan", 0, 4, "fire_spit", 1], ["dark_wail", 2, 3, "hp", -1],
    ["frost_breath", 1, 3, "frost_nova", -1],
  ],
  druid: [
    ["howl", 0, 3, "spirit_wolf", 1],
    ["purifying_sap", 1, 3, "healing_moth", -1], ["blossom_burst", 1, 4, "purifying_sap", -2],
    ["vine_lash", 2, 2, "thorn_roots", 1],
    ["spore_burst", 2, 3, "venom_thorn", -1], ["bramble_burst", 2, 4, "spore_burst", -1, "hornet_swarm"],
    ["pack_roar", 0, 3, "spirit_wolf", -1], ["pollen_breeze", 1, 3, "healing_moth", 1], ["thorn_spray", 2, 3, "venom_thorn", 1],
  ],
  shaman: [],
};

/** Tomo de cada ramo: +força em todas as magias do ramo por nível. */
const TOME_RULE = { perRank: 0.05, perRankAfter: 0.012, baseRanks: 3, maxRank: 20, baseCost: 300, costGrowth: 1.12 };

/** Nome do Tomo de cada ramo (na ordem de `TREE_BRANCHES`). */
const TOME_NAMES: Record<ClassId, [string, string, string]> = {
  knight: ["Tomo da Lâmina", "Tomo do Bastião", "Tomo do Comando"],
  paladin: ["Tomo da Mira", "Tomo da Luz", "Tomo do Batedor"],
  sorcerer: ["Tomo do Raio", "Tomo do Gelo", "Tomo das Trevas"],
  druid: ["Tomo da Matilha", "Tomo do Bosque", "Tomo dos Espinhos"],
  shaman: ["Tomo da Horda", "Tomo dos Totens", "Tomo da Brasa"],
};

const TOME_ICONS = ["📕", "📗", "📘"];

/**
 * Lado de cada Tomo na tela do ramo (coluna 0 a 2): fica na linha 2, na ponta oposta às costelas, e pede o
 * primeiro nó do tronco do ramo.
 */
const TOME_LANES: Record<ClassId, [number, number, number]> = {
  knight: [2, -2, -2],
  paladin: [2, -2, 2],
  sorcerer: [2, -2, 2],
  druid: [-2, 2, 2],
  shaman: [2, -2, 2],
};

/** Força extra que cada nível de uso de uma magia vizinha na árvore dá (Diablo 2: sinergia). */
export const SYNERGY_PER_LEVEL = 0.02;

const isAura = (key: string): key is AuraStat => key in AURA_RULES;

function classTree(classId: ClassId): TalentDef[] {
  const id = (key: string) => `${classId}_${key}`;
  const shape = SHAPES[classId];
  const trunk = shape.map(([key, col, row, parent, side]): TalentDef => {
    const requires = parent ? { id: id(parent), rank: 1 } : undefined;
    if (isTrait(key)) {
      const trait = TRAITS[key];
      if (trait.classId !== classId) throw new Error(`${key} não é Traço de ${classId}`);
      const other = shape.find(([k, c, r, , s]) => isTrait(k) && k !== key && c === col && r === row && s !== side);
      if (!other) throw new Error(`${key}: Traço sem o outro lado`);
      return {
        id: id(key), classId, col, row, lane: laneOf(side), side, kind: "trait", name: trait.name, icon: trait.icon, traitId: key,
        maxRank: 1, freeRank: 0, baseCost: TRAIT_COST, costGrowth: 1, requires, exclusiveWith: id(other[0]),
      };
    }
    if (isAura(key)) {
      const rule = AURA_RULES[key];
      return {
        id: id(key), classId, col, row, lane: 0, kind: "aura", name: AURA_NAMES[classId][key], icon: AURA_ICONS[key],
        aura: { stat: key, perRank: rule.perRank, perRankAfter: rule.perRankAfter, baseRanks: rule.baseRanks }, maxRank: rule.maxRank,
        freeRank: 0, baseCost: rule.baseCost, costGrowth: rule.costGrowth, requires,
      };
    }
    const spell = SPELLS[key];
    if (spell.classId !== classId) throw new Error(`${key} não é magia de ${classId}`);
    const starter = STARTER_SPELLS.includes(key);
    return {
      id: id(key), classId, col, row, lane: laneOf(side), side, kind: "spell", name: spell.name, icon: spell.icon, spellId: key,
      maxRank: 1, freeRank: starter ? 1 : 0,
      baseCost: starter ? STARTER_BASE_COST : side === undefined ? SPELL_COST_BY_ROW[row] : SIDE_SPELL_COST[isTrait(parent!) ? 0 : 1],
      costGrowth: 1, requires,
    };
  });
  const keys = new Set(shape.map(([key]) => key));
  const ribs = RIBS[classId].map(([key, col, row, parent, lane, also]): TalentDef => {
    const spell = SPELLS[key];
    if (spell.classId !== classId) throw new Error(`${key} não é magia de ${classId}`);
    for (const p of [parent, also]) if (p && !keys.has(p)) throw new Error(`${key}: pai ${p} fora do Grimório de ${classId}`);
    keys.add(key);
    return {
      id: id(key), classId, col, row, lane, kind: "spell", name: spell.name, icon: spell.icon, spellId: key,
      maxRank: 1, freeRank: 0, baseCost: SPELL_COST_BY_ROW[row], costGrowth: 1,
      requires: { id: id(parent), rank: 1 }, alsoRequires: also ? { id: id(also), rank: 1 } : undefined,
    };
  });
  // Ramo ainda sem magia (o Xamã Orc da Fase 1) não ganha Tomo: não teria o que fortalecer.
  const branchHasSpell = (col: number) => [...trunk, ...ribs].some((t) => t.col === col && t.row > 0 && t.kind === "spell");
  const tomes = TOME_LANES[classId].flatMap((lane, col): TalentDef[] => {
    if (!branchHasSpell(col)) return [];
    const first = trunk.find((t) => t.col === col && t.row === 1);
    if (!first) throw new Error(`${classId}: ramo ${col} sem o primeiro nó do tronco`);
    return [{
      id: id(`tome${col}`), classId, col, row: 2, lane, kind: "tome", name: TOME_NAMES[classId][col], icon: TOME_ICONS[col],
      tome: { perRank: TOME_RULE.perRank, perRankAfter: TOME_RULE.perRankAfter, baseRanks: TOME_RULE.baseRanks },
      maxRank: TOME_RULE.maxRank, freeRank: 0,
      baseCost: TOME_RULE.baseCost, costGrowth: TOME_RULE.costGrowth, requires: { id: first.id, rank: 1 },
    }];
  });
  // Dons do topo: na linha 2, do lado oposto ao Tomo, pedindo o mesmo primeiro nó do tronco (comprado, sem XP).
  const gifts = Object.values(GIFTS).filter((g) => g.classId === classId).map((g): TalentDef => {
    const first = trunk.find((t) => t.col === g.col && t.row === 1)!;
    return {
      id: id(g.id), classId, col: g.col, row: 2, lane: -TOME_LANES[classId][g.col], kind: "gift", name: g.name, icon: g.icon,
      giftId: g.id, maxRank: GIFT_MAX_RANK, freeRank: 0, baseCost: GIFT_BASE_COST, costGrowth: GIFT_COST_GROWTH,
      requires: { id: first.id, rank: 1 },
    };
  });
  const tree = [...trunk, ...ribs, ...tomes, ...gifts];
  // Dois nós no mesmo lugar do desenho seriam um erro de digitação na forma.
  const spots = new Set<string>();
  for (const t of tree) {
    const spot = `${t.col}:${t.row}:${t.lane}`;
    if (spots.has(spot)) throw new Error(`${t.id}: já existe um nó em ${spot}`);
    spots.add(spot);
  }
  return tree;
}

/** Lado da especialização na tela do ramo: o lado 0 à esquerda do tronco, o 1 à direita. */
const laneOf = (side?: 0 | 1) => (side === undefined ? 0 : side === 0 ? -1 : 1);

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

/** XP de uso da magia na conta (as iniciais nunca ficam abaixo do nível 1). O banco calcula igual. */
export function spellXpOf(def: TalentDef, xp: SpellXp): number {
  return Math.max(xp[def.id] ?? 0, def.kind === "spell" && def.freeRank > 0 ? STARTER_SPELL_XP : 0);
}

/**
 * Nível do nó para os pré-requisitos: numa magia comprada, o nível ganho com o uso (0 a 5); numa magia que a
 * conta não tem, −1; numa áurea ou num Traço, os níveis comprados.
 */
export function nodeLevel(def: TalentDef, ranks: TalentRanks, xp: SpellXp): number {
  const rank = talentRank(def, ranks);
  if (def.kind !== "spell") return rank;
  return rank > 0 ? spellLevelFromXp(spellXpOf(def, xp)) : -1;
}

/** Por que o nó não pode ser comprado agora (null = pode, se houver gold). */
export function talentBlocker(def: TalentDef, ranks: TalentRanks, xp: SpellXp): string | null {
  if (talentRank(def, ranks) >= def.maxRank) return def.kind === "spell" ? "Já aprendida" : "Nível máximo";
  const rival = def.exclusiveWith && TALENTS[def.exclusiveWith];
  if (rival && talentRank(rival, ranks) > 0) return `Você escolheu ${TRAITS[rival.traitId!].spec}`;
  const missing = [def.requires, def.alsoRequires]
    .filter((r): r is { id: string; rank: number } => !!r && nodeLevel(TALENTS[r.id], ranks, xp) < r.rank)
    .map((r) => {
      const parent = TALENTS[r.id];
      return parent.kind === "spell" ? `${parent.name} no nível ${r.rank}` : parent.name;
    });
  if (missing.length > 0) return `Requer ${missing.join(" e ")}`;
  return null;
}

/** Soma das áureas compradas da classe. */
export function auraBonuses(classId: ClassId, ranks: TalentRanks): Bonuses {
  const bonus = { ...NO_BONUSES };
  for (const t of talentTree(classId)) {
    const rank = talentRank(t, ranks);
    if (t.aura && rank > 0) bonus[t.aura.stat] += stackedValue(t.aura, rank);
  }
  return bonus;
}

/** Nível de uso (0 a 5) de cada magia que a classe conhece (as iniciais e as compradas no Grimório). */
export function spellRanks(classId: ClassId, ranks: TalentRanks, xp: SpellXp): Partial<Record<SpellId, number>> {
  const out: Partial<Record<SpellId, number>> = {};
  for (const t of talentTree(classId)) {
    if (t.spellId && talentRank(t, ranks) > 0) out[t.spellId] = spellLevelFromXp(spellXpOf(t, xp));
  }
  return out;
}

/** Id do nó do Grimório de uma magia (é por ele que o banco guarda o XP). */
export function spellTalentId(classId: ClassId, spellId: SpellId): string {
  return `${classId}_${spellId}`;
}

/** XP ganho na hunt por nó do Grimório, como o banco recebe (`record_spell_xp`). */
export function spellXpGains(classId: ClassId, spells: { id: string; gained: number }[]): Record<string, number> {
  return Object.fromEntries(spells.map((s) => [spellTalentId(classId, s.id as SpellId), s.gained]));
}

/**
 * Magias vizinhas de uma magia na árvore: os pais e as filhas que são magias (ligadas por galho, inclusive o
 * segundo pai). Cada nível de uso delas dá `SYNERGY_PER_LEVEL` de força a esta.
 */
export function spellNeighbors(classId: ClassId, spellId: SpellId): SpellId[] {
  const self = TALENTS[spellTalentId(classId, spellId)];
  if (!self) return [];
  const linked = (a: TalentDef, b: TalentDef) => a.requires?.id === b.id || a.alsoRequires?.id === b.id;
  return talentTree(classId)
    .filter((t) => t.spellId && t !== self && (linked(self, t) || linked(t, self)))
    .map((t) => t.spellId!);
}

/** Força extra de uma magia: sinergia (níveis das vizinhas) e o Tomo do ramo dela (a raiz não tem ramo). */
export interface SpellBonus {
  synergy: number;
  tome: number;
  total: number;
}

/**
 * Força extra de uma magia na conta. `levels` é o nível de uso das magias conhecidas (de `spellRanks`): uma vizinha
 * que a conta não tem não conta.
 */
export function spellBonus(
  classId: ClassId, spellId: SpellId, ranks: TalentRanks, levels: Partial<Record<SpellId, number>>,
): SpellBonus {
  const synergy = spellNeighbors(classId, spellId).reduce((sum, id) => sum + (levels[id] ?? 0) * SYNERGY_PER_LEVEL, 0);
  const self = TALENTS[spellTalentId(classId, spellId)];
  const book = self && self.row > 0 ? talentTree(classId).find((t) => t.kind === "tome" && t.col === self.col) : undefined;
  const tome = book ? stackedValue(book.tome!, talentRank(book, ranks)) : 0;
  return { synergy, tome, total: synergy + tome };
}

/** Força extra (fração) de cada magia conhecida, como o servidor manda para o cliente (`Player.spellBonus`). */
export function spellBonuses(classId: ClassId, ranks: TalentRanks, xp: SpellXp): Partial<Record<SpellId, number>> {
  const levels = spellRanks(classId, ranks, xp);
  const out: Partial<Record<SpellId, number>> = {};
  for (const id of Object.keys(levels) as SpellId[]) {
    const { total } = spellBonus(classId, id, ranks, levels);
    if (total > 0) out[id] = Math.round(total * 1000) / 1000;
  }
  return out;
}

/**
 * Grimório inteiro dos testes (`KUSA_ALL_SPELLS`): magias e Traços no máximo; as passivas de gold no teto de antes do
 * Grimório 4.0 (áureas e Tomos no 3, a velocidade no 2, sem Dons), para os números dos testes antigos não mudarem.
 */
export function allSpellsRanks(classId: ClassId): TalentRanks {
  return Object.fromEntries(talentTree(classId).map((t) => [t.id, t.kind === "gift" ? 0 : (t.aura ?? t.tome)?.baseRanks ?? t.maxRank]));
}

/** Efeitos somados dos Dons que a conta tem na classe (o servidor lê ao entrar na sala). */
export function giftEffects(classId: ClassId, ranks: TalentRanks): GiftEffects {
  return sumGifts(talentTree(classId).filter((t) => t.giftId).map((t) => ({ id: t.giftId!, rank: talentRank(t, ranks) })));
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
  return talentTree(classId).filter((t) => t.spellId && talentRank(t, ranks) > 0).map((t) => t.spellId!);
}

/** Quantas magias de cada slot o herói leva para a hunt (as que aparecem na escolha quando o slot abre). */
export const ACTIVE_SPELLS_PER_SLOT = 3;

/**
 * Magias ativas de um slot: as que aparecem na escolha da hunt. `chosen` são os ids de nó (`spellTalentId`) que o
 * jogador ativou no Grimório (todas as classes; `profiles.active_spells` no banco).
 * - Até 3 magias conhecidas no slot: todas, sozinhas.
 * - Mais de 3: as ativadas (até 3, na ordem da árvore).
 * - Mais de 3 e nenhuma ativada (conta antiga, ou a escolha ficou com magias que a conta não tem): as 3 de maior
 *   nível de uso, para a escolha da hunt nunca ficar vazia.
 */
export function activeSlotSpells(
  classId: ClassId, slot: number, ranks: TalentRanks, xp: SpellXp, chosen: readonly string[],
): SpellId[] {
  const known = knownSpells(classId, ranks).filter((id) => SPELLS[id].slot === slot);
  if (known.length <= ACTIVE_SPELLS_PER_SLOT) return known;
  const picked = known.filter((id) => chosen.includes(spellTalentId(classId, id))).slice(0, ACTIVE_SPELLS_PER_SLOT);
  if (picked.length > 0) return picked;
  const levels = spellRanks(classId, ranks, xp);
  const byLevel = [...known].sort((a, b) => (levels[b] ?? 0) - (levels[a] ?? 0));
  const top = byLevel.slice(0, ACTIVE_SPELLS_PER_SLOT);
  return known.filter((id) => top.includes(id));
}

/** Magias ativas da classe nos dois slots (as que vão para a hunt). */
export function activeSpells(classId: ClassId, ranks: TalentRanks, xp: SpellXp, chosen: readonly string[]): SpellId[] {
  return [0, 1].flatMap((slot) => activeSlotSpells(classId, slot, ranks, xp, chosen));
}

/**
 * Liga ou desliga uma magia no Grimório e devolve a nova escolha (`chosen` inteira, para gravar), ou o motivo de
 * não poder. Ao mexer num slot, a escolha desse slot passa a ser a lista ativa de hoje (inclusive a automática).
 */
export function toggleActiveSpell(
  classId: ClassId, spellId: SpellId, ranks: TalentRanks, xp: SpellXp, chosen: readonly string[],
): { chosen: string[] } | { error: string } {
  const slot = SPELLS[spellId].slot;
  const known = knownSpells(classId, ranks).filter((id) => SPELLS[id].slot === slot);
  if (!known.includes(spellId)) return { error: "Aprenda a magia antes de ativar" };
  if (known.length <= ACTIVE_SPELLS_PER_SLOT) {
    return { error: `Com ${ACTIVE_SPELLS_PER_SLOT} magias ou menos no slot ${slot + 1}, todas ficam ativas` };
  }
  const active = activeSlotSpells(classId, slot, ranks, xp, chosen);
  let next: SpellId[];
  if (active.includes(spellId)) {
    if (active.length === 1) return { error: `Deixe pelo menos uma magia ativa no slot ${slot + 1}` };
    next = active.filter((id) => id !== spellId);
  } else {
    if (active.length >= ACTIVE_SPELLS_PER_SLOT) {
      return { error: `Já há ${ACTIVE_SPELLS_PER_SLOT} magias ativas no slot ${slot + 1}: desative uma antes` };
    }
    next = [...active, spellId];
  }
  const others = chosen.filter((id) => {
    const t = TALENTS[id];
    return !(t?.classId === classId && t.spellId && SPELLS[t.spellId].slot === slot);
  });
  return { chosen: [...others, ...next.map((id) => spellTalentId(classId, id))] };
}

/** Texto curto do efeito de um nível de áurea ou de Tomo. */
export function auraText(def: TalentDef, rank: number): string {
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`.replace(".", ",");
  if (def.giftId) return GIFTS[def.giftId].text(GIFTS[def.giftId].perRank * rank);
  if (def.tome) return `+${pct(stackedValue(def.tome, rank))} de força nas magias do ramo ${TREE_BRANCHES[def.classId][def.col]}`;
  if (!def.aura) return "";
  return `+${pct(stackedValue(def.aura, rank))} de ${AURA_STAT_NAMES[def.aura.stat]}`;
}
