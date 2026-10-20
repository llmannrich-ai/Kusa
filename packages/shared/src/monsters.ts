export type MonsterKind = "rat" | "goblin" | "skeleton" | "orc" | "ogre" | "dragon";

export type MonsterRank = "common" | "miniboss" | "boss";

export interface MonsterDef {
  kind: MonsterKind;
  name: string;
  rank: MonsterRank;
  /** Atributos na profundidade 0; `monsterStats` aplica o ganho por profundidade. */
  hp: number;
  damage: number;
  xp: number;
  /** Faixa de valor de loot ao morrer (inclusiva). */
  loot: [number, number];
  /** Tiles por segundo. */
  speed: number;
  /** Distância (em tiles, Chebyshev) em que o monstro nota um jogador. */
  aggroRange: number;
  /** Alcance do ataque em tiles (1 = corpo a corpo). */
  attackRange: number;
  /** Intervalo entre ataques. */
  attackCooldownMs: number;
  /** Forma e cor provisórias até termos sprites. */
  shape: "circle" | "square" | "diamond" | "triangle";
  color: number;
  /** Escala do desenho em relação a um tile. */
  size: number;
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  rat: {
    kind: "rat", name: "Ratazana", rank: "common", shape: "circle", color: 0x8d7b68, size: 0.5,
    hp: 25, damage: 3, xp: 20, loot: [2, 5], speed: 2.5, aggroRange: 5, attackRange: 1, attackCooldownMs: 1200,
  },
  goblin: {
    kind: "goblin", name: "Goblin", rank: "common", shape: "triangle", color: 0x6ab04c, size: 0.6,
    hp: 45, damage: 5, xp: 35, loot: [4, 9], speed: 3, aggroRange: 6, attackRange: 1, attackCooldownMs: 1200,
  },
  skeleton: {
    kind: "skeleton", name: "Esqueleto", rank: "common", shape: "diamond", color: 0xdcdde1, size: 0.65,
    hp: 70, damage: 8, xp: 55, loot: [7, 14], speed: 2.8, aggroRange: 6, attackRange: 1, attackCooldownMs: 1300,
  },
  orc: {
    kind: "orc", name: "Orc guerreiro", rank: "common", shape: "square", color: 0x4b6584, size: 0.7,
    hp: 110, damage: 11, xp: 85, loot: [12, 22], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400,
  },
  ogre: {
    kind: "ogre", name: "Ogro", rank: "miniboss", shape: "square", color: 0xa0522d, size: 0.9,
    hp: 260, damage: 16, xp: 220, loot: [30, 50], speed: 2.6, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600,
  },
  dragon: {
    kind: "dragon", name: "Dragão jovem", rank: "boss", shape: "diamond", color: 0xb33939, size: 1.4,
    hp: 900, damage: 24, xp: 700, loot: [150, 250], speed: 2.4, aggroRange: 8, attackRange: 2, attackCooldownMs: 1500,
  },
};

/** Monstros comuns por sala do caminho principal (índice = profundidade). Salas além da tabela repetem a última. */
export const PATH_SPAWNS: MonsterKind[][] = [
  ["rat", "rat", "rat"],
  ["goblin", "goblin", "rat", "skeleton"],
  ["skeleton", "skeleton", "goblin", "orc"],
  ["orc", "orc", "skeleton", "skeleton", "orc"],
];

export const MINIBOSS_KIND: MonsterKind = "ogre";
export const BOSS_KIND: MonsterKind = "dragon";

/** Ganho de HP, dano, XP e loot por sala de profundidade (+12% por sala). */
export const DEPTH_SCALING = 0.12;

/** Bônus de loot do baú das salas laterais (liberado ao matar o mini-boss). */
export const CHEST_LOOT: [number, number] = [80, 140];

/** Fração extra de loot ao concluir a dungeon pelo portal do boss. */
export const BOSS_LOOT_BONUS = 0.5;

/** XP extra por participante além do primeiro, antes da divisão (incentiva jogar em equipe). */
export const PARTY_XP_BONUS = 0.2;

export interface MonsterStats {
  maxHp: number;
  damage: number;
  xp: number;
  loot: [number, number];
}

/** Atributos de um monstro numa profundidade (0 = primeira sala depois da entrada). */
export function monsterStats(kind: MonsterKind, depth: number): MonsterStats {
  const m = MONSTERS[kind];
  const k = 1 + DEPTH_SCALING * Math.max(0, depth);
  return {
    maxHp: Math.round(m.hp * k),
    damage: Math.round(m.damage * k),
    xp: Math.round(m.xp * k),
    loot: [Math.round(m.loot[0] * k), Math.round(m.loot[1] * k)],
  };
}

/** XP que cada participante recebe pela morte de um monstro. */
export function xpShare(totalXp: number, participants: number): number {
  if (participants <= 0) return 0;
  return Math.max(1, Math.round((totalXp * (1 + PARTY_XP_BONUS * (participants - 1))) / participants));
}
