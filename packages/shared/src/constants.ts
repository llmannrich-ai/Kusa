/** Tamanho de um tile em pixels (pixel art 32x32, estilo Tibia). */
export const TILE_SIZE = 32;

/** Tamanho máximo da equipe numa partida (single, dupla, trio ou quarteto). */
export const MAX_PARTY_SIZE = 4;

/** Duração da hunt em segundos. Ao zerar, a dungeon desaba e todos morrem soterrados. */
export const MATCH_DURATION_SECONDS = 4 * 60;

/** Frequência da simulação no servidor (ms por tick). */
export const SERVER_TICK_MS = 50;

export const ROOM_NAME = "dungeon";

/** Sala que lista as hunts abertas em tempo real (LobbyRoom do Colyseus). */
export const LOBBY_ROOM_NAME = "lobby";
