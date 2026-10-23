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

/** Código do erro de entrada numa sala quando a versão das regras do cliente não é a do servidor (`rulesVersion.ts`). */
export const VERSION_MISMATCH_CODE = 4409;

/** Sala que lista as hunts abertas em tempo real (LobbyRoom do Colyseus). */
export const LOBBY_ROOM_NAME = "lobby";

/** Multiplicadores da velocidade de movimento (1 = valores das tabelas de classes e monstros). */
export const HERO_SPEED_SCALE = 0.6885;
export const MONSTER_SPEED_SCALE = 0.6885;
