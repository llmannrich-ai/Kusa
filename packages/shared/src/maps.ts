import { MAX_PARTY_SIZE } from "./constants.ts";
import { MONSTERS, type MonsterKind } from "./monsters.ts";

export type MapId = "crypt" | "swamp" | "desert" | "marsh" | "cavern" | "dunes" | "mesas";

/** Nível de dificuldade mostrado no menu (estrelas, de 1 a `MAX_DIFFICULTY`). */
export type MapDifficulty = 1 | 2 | 3 | 4 | 5 | 6;

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
   * Fração do loot (valor dos monstros e dos baús) e a chance dos drops (itens e poções de comuns e mini-bosses, e as
   * poções dos baús) que o mapa paga (padrão 1). O boss fica de fora e o item do baú sai sempre. Mapa com muitos
   * monstros paga menos por cada um.
   */
  lootScale?: number;
  dropScale?: number;
  /** Monstros comuns por campina (padrão 2). */
  meadowMonsters?: number;
  /** Fração das campinas que ganham também um mini-boss solto, sem baú (padrão 0). */
  meadowMinibosses?: number;
  /** Jogadores por hunt no máximo (bots contam). Sem isto, `MAX_PARTY_SIZE`. */
  maxParty?: number;
  /**
   * Covis com boss fixo (Caverna da Travessia): um boss por covil, na ordem de `Dungeon.lairs`, cada um na
   * profundidade dele (o ganho por profundidade) e com o bônus de loot do portal que abre ao lado quando ele morre.
   * Com isto não há sorteio: `bosses` só lista os mesmos bosses (menu e banco).
   */
  lairs?: Lair[];
}

export interface Lair {
  boss: MonsterKind;
  depth: number;
  /** Fração extra de loot de quem sai pelo portal deste covil (o padrão é `BOSS_LOOT_BONUS`). */
  portalBonus: number;
  /** Nome do lado da bifurcação, para o aviso e o mapa mundi. */
  side: string;
}

/**
 * Corte geral do loot, em todos os mapas, por cima de `MapDef.lootScale` e `dropScale`: o gold dos monstros (boss
 * incluído) e dos baús e a chance de item dos comuns e mini-bosses. Fica aqui (arquivo de regras) para o cliente de
 * versão antiga, que roda a hunt solo, recarregar. Poções, os itens do boss e o item do baú não mudam.
 */
export const LOOT_SCALE = 0.8;

/**
 * Corte dos itens de equipamento, em todos os mapas, por cima dos outros: cada sorteio de item (monstro comum,
 * mini-boss, boss, baú e Mímico) só sai com esta chance. Poções, runas e gold não mudam.
 */
export const ITEM_DROP_SCALE = 0.6;

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
    meadowMonsters: 3, meadowMinibosses: 0.4, lootScale: 0.35, dropScale: 0.6,
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
  cavern: {
    id: "cavern", name: "Caverna da Travessia", icon: "🕳️", difficulty: 4, durationSeconds: 10 * 60, meadowMonsters: 3,
    description: "Túneis por baixo dos Campos de Kusa, onde a campanha se divide entre a floresta e o deserto: o mapa mais difícil do jogo. Depois do tronco, a caverna se bifurca: a oeste, o Basilisco; a leste, mais fundo, o Observador das Profundezas, o boss mais forte de Kosaradius. Cada boss morto abre o portal do covil dele.",
    encounters: [
      // Tronco (zonas 0 e 1): aquecimento, todo mundo começa no nível 1.
      { depth: [0, 0], budget: 120, table: [["kobold", 4], ["stirge", 3], ["rat", 2]] },
      { depth: [1, 1], budget: 230, table: [["goblin", 3], ["goblinArcher", 2], ["giantSpider", 2], ["kobold", 1]] },
      // Túnel oeste (zonas 2 a 4), até o Basilisco.
      { depth: [2, 2], budget: 420, table: [["skeleton", 3], ["skeletonArcher", 2], ["gnoll", 2], ["hobgoblin", 1], ["giantSpider", 1]] },
      { depth: [3, 3], budget: 560, table: [["gnoll", 3], ["orc", 2], ["ghoul", 2], ["skeletonArcher", 2]] },
      { depth: [4, 4], budget: 680, table: [["orc", 3], ["ghoul", 2], ["lizardfolk", 2], ["gnoll", 1], ["skeletonArcher", 1]] },
      // Túnel leste (zonas 5 a 7), mais fundo e mais forte, até o Observador.
      { depth: [5, 5], budget: 520, table: [["ghoul", 3], ["lizardfolk", 2], ["bogBody", 2], ["crocodile", 1], ["willOWisp", 1]] },
      { depth: [6, 6], budget: 600, table: [["naga", 3], ["blackPudding", 2], ["ghoul", 2], ["willOWisp", 2]] },
      { depth: [7, 99], budget: 680, table: [["naga", 3], ["shamblingMound", 2], ["blackPudding", 2], ["willOWisp", 2]] },
    ],
    minibosses: [["bugbear", 2], ["troll", 2], ["gelatinousCube", 1]],
    mimicChance: 1 / 4,
    bosses: [["beholder", 1], ["basilisk", 1]],
    lairs: [
      { boss: "basilisk", depth: 5, portalBonus: 0.5, side: "oeste" },
      { boss: "beholder", depth: 8, portalBonus: 1, side: "leste" },
    ],
  },
  dunes: {
    id: "dunes", name: "Dunas Cantantes", icon: "🌬️", difficulty: 5, durationSeconds: 8 * 60, meadowMonsters: 3,
    description: "Solária profunda: cordilheiras de dunas que cantam com o vento, vales compridos e selas entre eles, e a areia fofa que prende o passo. A legião soterrada do Império marcha de novo: chacais e legionários de osso, arqueiros nas cristas, múmias que puxam com as faixas e mortos escondidos na areia. Na bacia das pedras cantantes, o Colosso Cantante.",
    encounters: [
      // Todo mundo começa no nível 1: as duas primeiras zonas são de bichos e chacais.
      { depth: [0, 0], budget: 130, table: [["scarabSwarm", 4], ["boneJackal", 2], ["boneLegionary", 1]] },
      { depth: [1, 1], budget: 225, table: [["boneJackal", 4], ["scarabSwarm", 2], ["boneLegionary", 1]] },
      { depth: [2, 2], budget: 345, table: [["boneLegionary", 3], ["boneJackal", 2], ["boneArcher", 2], ["buriedDead", 1]] },
      { depth: [3, 3], budget: 450, table: [["boneLegionary", 3], ["boneArcher", 2], ["wrappedMummy", 2], ["buriedDead", 2], ["mourner", 1]] },
      { depth: [4, 4], budget: 540, table: [["wrappedMummy", 3], ["boneLegionary", 2], ["mourner", 2], ["boneArcher", 2], ["buriedDead", 1]] },
      { depth: [5, 99], budget: 615, table: [["wrappedMummy", 3], ["mourner", 2], ["boneLegionary", 2], ["boneArcher", 2], ["buriedDead", 1]] },
    ],
    minibosses: [["boneCenturion", 2], ["royalMummy", 1], ["sandScribe", 1]],
    mimicChance: 0,
    bosses: [["singingColossus", 1]],
  },
  mesas: {
    id: "mesas", name: "Mesas de Solária", icon: "🪨", difficulty: 6, durationSeconds: 8 * 60, meadowMonsters: 3, meadowMinibosses: 0.25,
    description: "Platôs de arenito em camadas cortados por cânions estreitos, casas escavadas na rocha e a corte enterrada do último faraó. A mesma legião e as mesmas múmias, mais fundas e em bandos maiores, e mini-bosses soltos nos cânions: o mapa mais difícil do jogo. No anfiteatro dos platôs, o Faraó Eterno.",
    encounters: [
      { depth: [0, 0], budget: 170, table: [["scarabSwarm", 3], ["boneJackal", 3], ["boneLegionary", 1]] },
      { depth: [1, 1], budget: 300, table: [["boneJackal", 3], ["boneLegionary", 2], ["scarabSwarm", 1], ["boneArcher", 1]] },
      { depth: [2, 2], budget: 440, table: [["boneLegionary", 3], ["boneArcher", 2], ["wrappedMummy", 1], ["buriedDead", 2]] },
      { depth: [3, 3], budget: 570, table: [["boneLegionary", 3], ["wrappedMummy", 2], ["boneArcher", 2], ["mourner", 2], ["buriedDead", 1]] },
      { depth: [4, 4], budget: 680, table: [["wrappedMummy", 3], ["boneLegionary", 3], ["mourner", 2], ["boneArcher", 2]] },
      { depth: [5, 99], budget: 760, table: [["wrappedMummy", 4], ["mourner", 2], ["boneLegionary", 2], ["boneArcher", 2], ["buriedDead", 1]] },
    ],
    minibosses: [["royalMummy", 2], ["boneCenturion", 1], ["sandScribe", 1]],
    mimicChance: 0,
    bosses: [["eternalPharaoh", 1]],
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
  // Mapa de covis: o boss do último covil (o mais difícil).
  if (map.lairs?.length) return map.lairs[map.lairs.length - 1].boss;
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

/** Maior dificuldade da escala (as Mesas de Solária). */
export const MAX_DIFFICULTY = 6;

export function difficultyStars(difficulty: MapDifficulty) {
  return "★".repeat(difficulty) + "☆".repeat(MAX_DIFFICULTY - difficulty);
}
