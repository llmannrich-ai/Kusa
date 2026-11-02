/**
 * Dificuldade por comportamento (GDD, "Combate"): o perigo vem do que os monstros fazem (ouvem, chamam ajuda,
 * patrulham, perseguem e caçam), nunca de números maiores. A ficha de cada monstro não muda.
 * Simulação em `apps/server/src/monsterAi.ts` e `hunt.ts`; o teste `comportamento` confere.
 */
import type { MonsterDef, MonsterRole } from "./monsters.ts";

/** Barulho da luta: quem nota um herói (ou leva um golpe) acorda os monstros parados a até este raio, através de paredes. */
export const ALARM_RADIUS = 5;
/** Grito de Guerra: o líder que nota um herói chama os monstros parados a até este raio. */
export const LEADER_SHOUT_RADIUS = 9;
/** Enxame: os da mesma espécie a até este raio entram juntos na luta. */
export const SWARM_CALL_RADIUS = 8;
/** O mesmo monstro só dá o alarme de novo depois deste tempo. */
export const ALARM_COOLDOWN_MS = 1500;
/** Papéis que não ouvem o alarme: ficam parados no lugar (emboscador camuflado, sentinela lenta). */
export const DEAF_ROLES: readonly MonsterRole[] = ["sentinel", "lurker"];

/**
 * Quantos tiles além do aggro range o monstro persegue antes de desistir, pelo papel. Escaramuçadores e enxames
 * caçam longe; brutos e o resto, um pouco; sentinelas quase nada. Boss e mini-boss ficam perto da sala deles.
 */
export const PURSUIT_TILES: Record<MonsterRole, number> = {
  skirmisher: 12, swarm: 10, brute: 8, controller: 8, leader: 8, artillery: 8, lurker: 6, sentinel: 3,
};
export const BOSS_PURSUIT_TILES = 4;
export const MINIBOSS_PURSUIT_TILES = 6;

export function pursuitTiles(def: MonsterDef): number {
  if (def.rank === "boss") return BOSS_PURSUIT_TILES;
  if (def.rank === "miniboss") return MINIBOSS_PURSUIT_TILES;
  return PURSUIT_TILES[def.role];
}

/**
 * Patrulhas: grupos inteiros de uma sala do caminho que andam de sala em sala, ida e volta, sem esperar o herói.
 * Uma patrulha a cada `PATROL_EVERY_ROOMS` salas do caminho, de 1 a `MAX_PATROLS`. Nunca começam na zona da entrada.
 */
export const PATROL_EVERY_ROOMS = 4;
export const MAX_PATROLS = 4;
/** Patrulhando, o monstro anda a esta fração da velocidade (dá para ver chegando). */
export const PATROL_PACE = 0.7;
/** O primeiro da patrulha espera quem ficou a mais que isto para trás. */
export const PATROL_GATHER_TILES = 5;

/**
 * O Andarilho: um mini-boss do mapa que acorda nesta fração do tempo da hunt, no fundo da dungeon, e caça o herói
 * vivo mais perto pelo mapa inteiro, sem desistir. Anda um pouco mais rápido que a ficha (mas mais devagar que o
 * herói: fugir é possível) e rende mais XP e gold.
 */
export const PROWLER_AT = 0.4;
export const PROWLER_SPEED = 1.15;
export const PROWLER_REWARD = 1.5;
/** A dungeon desperta: nesta fração do tempo, até `AWAKEN_GROUPS` grupos parados saem atrás da equipe. */
export const AWAKEN_AT = 0.6;
export const AWAKEN_GROUPS = 2;

/**
 * Jogo em equipe: com um aliado (humano ou bot) a até `FORMATION_RADIUS` tiles, o herói leva `FORMATION_GUARD` a
 * menos de dano de monstro. Cercado, cada monstro colado nele além do primeiro deixa o golpe `SURROUND_STEP` mais forte,
 * até `SURROUND_MAX` monstros a mais.
 */
export const FORMATION_RADIUS = 4;
export const FORMATION_GUARD = 0.15;
export const SURROUND_STEP = 0.12;
export const SURROUND_MAX = 3;
