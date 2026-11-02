/**
 * Dificuldade por comportamento (GDD, "Combate"): cada perigo tem uma resposta certa que o jogador escolhe (matar o
 * líder rápido, não fugir de quem é mais rápido, lutar no corredor, ficar junto da equipe). A ficha dos monstros não muda.
 * Simulação em `apps/server/src/monsterAi.ts` e `hunt.ts`; o teste `comportamento` confere.
 */
import type { MonsterDef, MonsterRole } from "./monsters.ts";

/**
 * Grito de Guerra: o líder que sobrevive ao primeiro golpe chama os monstros parados a até este raio (através de
 * paredes, uma vez só). A resposta é matá-lo num golpe, ou antes de ele perceber.
 */
export const LEADER_SHOUT_RADIUS = 9;
/** Papéis que não ouvem o grito: ficam parados no lugar (emboscador camuflado, sentinela lenta). */
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
 * Jogo em equipe: com um aliado (humano ou bot) a até `FORMATION_RADIUS` tiles, o herói leva `FORMATION_GUARD` a
 * menos de dano de monstro. Cercado, cada monstro colado nele além do primeiro deixa o golpe `SURROUND_STEP` mais forte,
 * até `SURROUND_MAX` monstros a mais.
 */
export const FORMATION_RADIUS = 4;
export const FORMATION_GUARD = 0.15;
export const SURROUND_STEP = 0.12;
export const SURROUND_MAX = 3;
