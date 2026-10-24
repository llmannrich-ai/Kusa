import { MAX_PARTY_SIZE } from "./constants.ts";
import { MONSTERS, type MonsterKind } from "./monsters.ts";

export type MapId = "crypt" | "swamp" | "desert" | "marsh";

/** Nível de dificuldade mostrado no menu (estrelas). */
export type MapDifficulty = 1 | 2;

/**
 * Encontro das salas do caminho numa faixa de profundidade, como o orçamento de XP do D&D: a sala recebe monstros
 * sorteados da tabela (pelo peso) até gastar o orçamento (a XP da tabela de cada um, sem o ganho por profundidade).
 */
export interface Encounter {
  /** Primeira e última profundidade (sala do caminho) em que vale. */
  depth: [number, number];
  budget: number;
  table: [MonsterKind, number][];
}

export interface MapDef {
  id: MapId;
  name: string;
  /** Ícone do mapa no menu e na lista de salas. */
  icon: string;
  difficulty: MapDifficulty;
  description: string;
  /** Duração da hunt em segundos. Ao zerar, o mapa desaba e todos morrem soterrados. */
  durationSeconds: number;
  /** Encontros por profundidade. Salas além da última faixa usam a última. */
  encounters: Encounter[];
  /** Mini-bosses das salas laterais (destrancam o baú), sorteados pelo peso em cada sala. */
  minibosses: [MonsterKind, number][];
  /** Fração das salas laterais em que o baú é um Mímico (ele é o mini-boss da sala e guarda o loot do baú). */
  mimicChance: number;
  /** Boss final, no centro do mapa, sorteado pelo peso (o primeiro é o principal do mapa). Vazio: mapa ainda sem monstros. */
  bosses: [MonsterKind, number][];
  /**
   * Baús de runa depois do boss (caverna do deserto): destrancam quando o boss morre e cada jogador leva uma das
   * runas, à escolha. Com eles, o boss não dropa runa.
   */
  rewardRunes?: string[];
  /**
   * Fração do loot (valor dos monstros e dos baús) e dos drops (itens e poções de comuns, mini-bosses e baús) que o
   * mapa paga (padrão 1). O boss fica de fora. Mapa com muitos monstros paga menos por cada um.
   */
  lootScale?: number;
  dropScale?: number;
  /** Monstros comuns por campina (padrão 2). */
  meadowMonsters?: number;
  /** Fração das campinas que ganham também um mini-boss solto, sem baú (padrão 0). */
  meadowMinibosses?: number;
  /** Jogadores por hunt no máximo (bots contam). Sem isto, `MAX_PARTY_SIZE`. */
  maxParty?: number;
}

/** Monstros por sala no máximo (o celular desenha e o servidor sincroniza todos). */
export const MAX_ROOM_MONSTERS = 8;
/** Artilheiros e líderes por sala no máximo. */
export const MAX_ROOM_ARTILLERY = 2;
export const MAX_ROOM_LEADERS = 1;
/** Chance de um monstro comum nascer Campeão (ver `CHAMPION_AFFIXES`). */
export const CHAMPION_CHANCE = 0.05;

export const MAPS: Record<MapId, MapDef> = {
  crypt: {
    id: "crypt", name: "Cripta", icon: "🏚️", difficulty: 1, durationSeconds: 4 * 60,
    description: "Salas de pedra e corredores apertados. Kobolds, goblins, mortos-vivos e orcs até o Dragão jovem. Cuidado com os baús.",
    encounters: [
      { depth: [0, 0], budget: 60, table: [["rat", 4], ["kobold", 4], ["stirge", 2]] },
      { depth: [1, 1], budget: 150, table: [["goblin", 4], ["goblinArcher", 2], ["kobold", 2], ["zombie", 2], ["rat", 1], ["hobgoblin", 1]] },
      {
        depth: [2, 2], budget: 230,
        table: [["skeleton", 4], ["skeletonArcher", 2], ["giantSpider", 2], ["goblin", 2], ["hobgoblin", 1], ["zombie", 1], ["orc", 1]],
      },
      { depth: [3, 9], budget: 360, table: [["orc", 4], ["gnoll", 3], ["skeleton", 2], ["skeletonArcher", 1], ["giantSpider", 1], ["hobgoblin", 1]] },
    ],
    minibosses: [["ogre", 2], ["bugbear", 1], ["gelatinousCube", 1]],
    mimicChance: 1 / 3,
    bosses: [["dragon", 1]],
  },
  swamp: {
    id: "swamp", name: "Pântano das Ruínas", icon: "🌿", difficulty: 2, durationSeconds: 8 * 60,
    description: "Floresta aberta e alagada, com ruínas antigas. Mapa grande, monstros mais fortes e loot melhor. A Hidra espera nas ruínas do centro.",
    encounters: [
      { depth: [0, 0], budget: 160, table: [["frog", 4], ["bullywug", 2], ["stirge", 1]] },
      { depth: [1, 1], budget: 230, table: [["frog", 3], ["moccasin", 3], ["bullywug", 2]] },
      { depth: [2, 2], budget: 350, table: [["moccasin", 3], ["bogBody", 3], ["lizardfolk", 2], ["ghoul", 2]] },
      {
        depth: [3, 3], budget: 430,
        table: [["bogBody", 3], ["lizardfolk", 2], ["ghoul", 2], ["crocodile", 2], ["moccasin", 1], ["willOWisp", 1]],
      },
      { depth: [4, 4], budget: 520, table: [["bogBody", 2], ["naga", 3], ["blackPudding", 2], ["crocodile", 2], ["willOWisp", 2]] },
      {
        depth: [5, 5], budget: 640,
        table: [["naga", 3], ["bogBody", 2], ["blackPudding", 2], ["shamblingMound", 1], ["willOWisp", 2], ["lizardfolk", 1]],
      },
      { depth: [6, 99], budget: 680, table: [["naga", 4], ["shamblingMound", 2], ["blackPudding", 2], ["crocodile", 1], ["bogBody", 1]] },
    ],
    minibosses: [["troll", 2], ["greenHag", 1], ["spiritNaga", 1]],
    mimicChance: 0,
    bosses: [["hydra", 3], ["blackDragon", 1]],
  },
  desert: {
    id: "desert", name: "Mar de Areia", icon: "🏜️", difficulty: 1, durationSeconds: 6 * 60,
    description: "Dunas, oásis e coqueiros. Escorpiões, abutres, gnolls, esqueletos e múmias; ruínas soterradas com mini-boss e baú. Em algum lugar há uma caverna: lá embaixo vive o Verme da Areia, e atrás dele, 4 baús de runa para escolher.",
    encounters: [
      { depth: [0, 0], budget: 60, table: [["sandScorpion", 4], ["giantVulture", 2]] },
      { depth: [1, 1], budget: 130, table: [["sandScorpion", 3], ["giantVulture", 3], ["skeleton", 1], ["giantSpider", 1]] },
      { depth: [2, 2], budget: 200, table: [["giantVulture", 2], ["skeleton", 3], ["skeletonArcher", 2], ["giantSpider", 2], ["gnoll", 1]] },
      { depth: [3, 3], budget: 270, table: [["gnoll", 3], ["skeleton", 2], ["skeletonArcher", 2], ["mummy", 1], ["giantSpider", 1]] },
      { depth: [4, 4], budget: 330, table: [["gnoll", 3], ["mummy", 2], ["skeletonArcher", 2], ["giantVulture", 1]] },
      { depth: [5, 99], budget: 380, table: [["mummy", 3], ["gnoll", 3], ["skeletonArcher", 1], ["giantVulture", 1]] },
    ],
    minibosses: [["blackScorpion", 2], ["mummyPriest", 1], ["sandElemental", 1]],
    mimicChance: 0,
    bosses: [["sandWorm", 1]],
    rewardRunes: ["rune-fury", "rune-life", "rune-time", "rune-meteor"],
  },
  marsh: {
    id: "marsh", name: "Pântano do Kosaradius", icon: "🐸", difficulty: 1, durationSeconds: 10 * 60, maxParty: 1,
    meadowMonsters: 3, meadowMinibosses: 0.4, lootScale: 0.35, dropScale: 0.35,
    description: "Floresta alagada, o maior mapa, só para jogar sozinho. O clã de orcs e ogros do brejo, bando atrás de bando, e ogros e chefes de guerra em cada clareira: muito XP. Grumak, o Rei-Ogro, espera na clareira dos ciprestes.",
    encounters: [
      { depth: [0, 0], budget: 70, table: [["orcScout", 3], ["orcGrunt", 2]] },
      { depth: [1, 1], budget: 110, table: [["orcScout", 3], ["orcGrunt", 3], ["orcArcher", 1]] },
      { depth: [2, 2], budget: 150, table: [["orcGrunt", 3], ["orcSpearman", 2], ["orcArcher", 2], ["orcScout", 1]] },
      {
        depth: [3, 3], budget: 190,
        table: [["orcGrunt", 2], ["orcSpearman", 2], ["orcArcher", 2], ["orcShaman", 1], ["orcCaptain", 1]],
      },
      {
        depth: [4, 4], budget: 230,
        table: [["orcSpearman", 2], ["orcShaman", 2], ["orcBerserker", 2], ["orcCaptain", 1], ["orcGrunt", 1]],
      },
      {
        depth: [5, 5], budget: 260,
        table: [["orcBerserker", 2], ["ogreYoung", 2], ["orcShaman", 1], ["orcArcher", 1], ["orcCaptain", 1]],
      },
      {
        depth: [6, 6], budget: 290,
        table: [["ogreYoung", 3], ["orcBerserker", 2], ["orcSpearman", 1], ["orcShaman", 1], ["orcCaptain", 1]],
      },
      {
        depth: [7, 99], budget: 330,
        table: [["ogreYoung", 3], ["orcBerserker", 2], ["orcCaptain", 1], ["orcShaman", 1], ["orcArcher", 1]],
      },
    ],
    minibosses: [["ogreBruiser", 2], ["ogreShaman", 1], ["orcWarlord", 1]],
    mimicChance: 0,
    bosses: [["ogreKing", 1]],
  },
};

/** Jogadores por hunt no mapa, bots incluídos (o Pântano do Kosaradius é só para 1). */
export function partySize(map: MapDef) {
  return map.maxParty ?? MAX_PARTY_SIZE;
}

/** Encontro de uma profundidade. */
export function encounterAt(map: MapDef, depth: number): Encounter {
  return map.encounters.find((e) => depth >= e.depth[0] && depth <= e.depth[1]) ?? map.encounters[map.encounters.length - 1];
}

/** Boss principal do mapa (o de maior peso), para o menu; nenhum no mapa ainda sem monstros. */
export function mainBoss(map: MapDef): MonsterKind | undefined {
  return [...map.bosses].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Todos os monstros que podem nascer no mapa (encontros, mini-bosses, Mímico, bosses). */
export function mapMonsters(map: MapDef): MonsterKind[] {
  const kinds = new Set<MonsterKind>();
  for (const e of map.encounters) for (const [kind] of e.table) kinds.add(kind);
  for (const [kind] of map.minibosses) kinds.add(kind);
  for (const [kind] of map.bosses) kinds.add(kind);
  if (map.mimicChance > 0) kinds.add("mimic");
  // O que as habilidades chamam (cópias da Bruxa Verde).
  for (const kind of [...kinds]) for (const a of MONSTERS[kind].abilities ?? []) if (a.summon) kinds.add(a.summon.kind);
  return [...kinds];
}

/** Sorteio pelo peso (`roll` em [0, 1)). */
export function pickWeighted<T>(options: [T, number][], roll: number): T {
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  let r = roll * total;
  for (const [value, weight] of options) {
    r -= weight;
    if (r < 0) return value;
  }
  return options[options.length - 1][0];
}

export const MAP_IDS = Object.keys(MAPS) as MapId[];

export const DEFAULT_MAP: MapId = "crypt";

/** Id de mapa válido vindo de fora (opções de entrada, localStorage); senão, o mapa padrão. */
export function mapIdOf(value: unknown): MapId {
  return typeof value === "string" && value in MAPS ? (value as MapId) : DEFAULT_MAP;
}

export function difficultyStars(difficulty: MapDifficulty) {
  return "★".repeat(difficulty) + "☆".repeat(2 - difficulty);
}
