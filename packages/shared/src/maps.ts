import type { MonsterKind } from "./monsters.ts";

export type MapId = "crypt" | "swamp";

/** Nível de dificuldade mostrado no menu (estrelas). */
export type MapDifficulty = 1 | 2;

export interface MapDef {
  id: MapId;
  name: string;
  /** Ícone do mapa no menu e na lista de salas. */
  icon: string;
  difficulty: MapDifficulty;
  description: string;
  /** Duração da hunt em segundos. Ao zerar, o mapa desaba e todos morrem soterrados. */
  durationSeconds: number;
  /** Monstros comuns por sala do caminho principal (índice = profundidade). Salas além da tabela repetem a última. */
  pathSpawns: MonsterKind[][];
  /** Mini-boss das salas laterais (destranca o baú). */
  miniboss: MonsterKind;
  /** Boss final, no centro do mapa. */
  boss: MonsterKind;
}

export const MAPS: Record<MapId, MapDef> = {
  crypt: {
    id: "crypt", name: "Cripta", icon: "🏚️", difficulty: 1, durationSeconds: 4 * 60,
    description: "Salas de pedra e corredores apertados. Ratazanas, goblins e orcs até o Dragão jovem.",
    pathSpawns: [
      ["rat", "rat", "rat"],
      ["goblin", "goblin", "rat", "skeleton"],
      ["skeleton", "skeleton", "goblin", "orc"],
      ["orc", "orc", "skeleton", "skeleton", "orc"],
    ],
    miniboss: "ogre",
    boss: "dragon",
  },
  swamp: {
    id: "swamp", name: "Pântano das Ruínas", icon: "🌿", difficulty: 2, durationSeconds: 8 * 60,
    description: "Floresta aberta e alagada, com ruínas antigas. Mapa grande, monstros mais fortes e loot melhor. A Hidra espera nas ruínas do centro.",
    pathSpawns: [
      ["frog", "frog", "frog", "frog"],
      ["frog", "frog", "moccasin", "moccasin", "frog"],
      ["moccasin", "moccasin", "moccasin", "bogBody", "bogBody"],
      ["bogBody", "bogBody", "bogBody", "moccasin", "moccasin", "frog"],
      ["bogBody", "bogBody", "bogBody", "naga", "naga"],
      ["naga", "naga", "naga", "bogBody", "bogBody", "bogBody"],
      ["naga", "naga", "naga", "naga", "bogBody", "bogBody"],
    ],
    miniboss: "troll",
    boss: "hydra",
  },
};

export const MAP_IDS = Object.keys(MAPS) as MapId[];

export const DEFAULT_MAP: MapId = "crypt";

/** Id de mapa válido vindo de fora (opções de entrada, localStorage); senão, o mapa padrão. */
export function mapIdOf(value: unknown): MapId {
  return typeof value === "string" && value in MAPS ? (value as MapId) : DEFAULT_MAP;
}

export function difficultyStars(difficulty: MapDifficulty) {
  return "★".repeat(difficulty) + "☆".repeat(2 - difficulty);
}
