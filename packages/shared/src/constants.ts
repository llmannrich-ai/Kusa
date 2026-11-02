/** Tamanho de um tile em pixels (pixel art 32x32, estilo Tibia). */
export const TILE_SIZE = 32;

/** Tamanho máximo da equipe numa partida (single, dupla, trio ou quarteto). */
export const MAX_PARTY_SIZE = 4;

/** Frequência da simulação no servidor (ms por tick). */
export const SERVER_TICK_MS = 50;

export const ROOM_NAME = "dungeon";

/**
 * Direção segurada (`MoveMessage.hold`): o servidor continua andando sozinho, no ritmo da velocidade, até este
 * tempo sem notícia do cliente. O cliente reenvia a direção a cada `MOVE_RESEND_MS` enquanto o comando está ativo.
 */
export const MOVE_HOLD_MS = 500;
export const MOVE_RESEND_MS = 150;

/** Tempo (ms) parado em cima de um portal (fuga ou boss) para ele levar o jogador para fora da dungeon. */
export const PORTAL_HOLD_MS = 1500;

/** Código do erro de entrada numa sala quando a versão das regras do cliente não é a do servidor (`rulesVersion.ts`). */
export const VERSION_MISMATCH_CODE = 4409;

/** Sala que lista as hunts abertas em tempo real (LobbyRoom do Colyseus). */
export const LOBBY_ROOM_NAME = "lobby";

/**
 * Ritmo geral da hunt (1 = valores das tabelas). Abaixo de 1, tudo anda mais devagar na mesma proporção: a velocidade de
 * movimento de heróis, monstros e invocações, os turnos (recarga do ataque básico, das magias e dos ataques e
 * habilidades dos monstros), o voo dos projéteis e as ondas das magias, e as animações de efeito no cliente
 * (`DungeonScene`). 0,9 = 10% mais lento.
 */
export const PACE = 0.9;

/** Multiplicadores da velocidade de movimento (1 = valores das tabelas de classes e monstros), já com o `PACE`. */
export const HERO_SPEED_SCALE = 0.6885 * PACE;
export const MONSTER_SPEED_SCALE = 0.6885 * PACE;

/** Duração de um turno (recarga, intervalo de ataque, passo de onda) no ritmo da hunt. */
export function paced(ms: number): number {
  return ms / PACE;
}
