/** Tamanho de um tile em pixels (pixel art 32x32, estilo Tibia). */
export const TILE_SIZE = 32;

/** Tamanho máximo da equipe numa partida (single, dupla, trio ou quarteto). */
export const MAX_PARTY_SIZE = 4;

/** Frequência da simulação no servidor (ms por tick). */
export const SERVER_TICK_MS = 50;

export const ROOM_NAME = "dungeon";

/** Sala que lista as hunts abertas em tempo real (LobbyRoom do Colyseus). */
export const LOBBY_ROOM_NAME = "lobby";

/** Multiplicador global da velocidade de movimento de jogadores e monstros (1 = valores das tabelas). */
export const MOVE_SPEED_SCALE = 0.85;
