/** Tamanho de um tile em pixels (pixel art 32x32, estilo Tibia). */
export const TILE_SIZE = 32;

/** Tamanho máximo da equipe numa partida (single, dupla, trio ou quarteto). */
export const MAX_PARTY_SIZE = 4;

/** Frequência da simulação no servidor (ms por tick). */
export const SERVER_TICK_MS = 50;

export const ROOM_NAME = "dungeon";

/**
 * Versão das regras que cliente e servidor calculam cada um do seu lado (o gerador de mapas pela seed) e do
 * protocolo entre eles (mensagens novas, como a escolha de melhorias).
 * **Suba a cada mudança no gerador (`dungeon.ts`), num mapa (`maps.ts`) ou numa mensagem nova**: o servidor recusa cliente de
 * outra versão, e o cliente desatualizado se recarrega sozinho. Sem isso, cliente e servidor desenhariam
 * mapas diferentes (o personagem atravessa árvores ou trava no nada).
 */
export const RULES_VERSION = 15;

/** Código do erro de entrada numa sala quando a versão das regras do cliente não é a do servidor. */
export const VERSION_MISMATCH_CODE = 4409;

/** Sala que lista as hunts abertas em tempo real (LobbyRoom do Colyseus). */
export const LOBBY_ROOM_NAME = "lobby";

/** Multiplicadores da velocidade de movimento (1 = valores das tabelas de classes e monstros). */
export const HERO_SPEED_SCALE = 0.6885;
export const MONSTER_SPEED_SCALE = 0.6885;
