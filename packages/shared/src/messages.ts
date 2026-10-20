import type { ClassId } from "./classes.ts";

/** Opções enviadas pelo cliente ao entrar numa sala. */
export interface JoinOptions {
  name: string;
  classId: ClassId;
  /** JWT do Supabase; o servidor usa para identificar o jogador. */
  accessToken?: string;
}

/** Metadata de matchmaking de uma hunt, mostrada na lista de salas. */
export interface HuntMetadata {
  /** Nome do líder da equipe. */
  leader: string;
}

/** Cliente → servidor: um passo de tile. */
export interface MoveMessage { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

/** Cliente → servidor: seleciona o monstro alvo do auto-attack (null limpa). */
export interface TargetMessage { id: string | null }

/** Servidor → todos: um golpe acertou alguém (para números de dano flutuantes). */
export interface DamageMessage {
  x: number;
  y: number;
  amount: number;
  /** true quando quem apanhou foi um jogador. */
  toPlayer: boolean;
}

/** Servidor → todos: aviso flutuante no mapa (XP, nível, loot, baú, boss). */
export interface NoticeMessage {
  x: number;
  y: number;
  text: string;
  color: number;
}

export type RunOutcome = "died" | "escaped" | "completed" | "buried";

/** Servidor → cliente quando a hunt de um jogador termina. */
export interface RunEndedMessage {
  outcome: RunOutcome;
  loot: number;
  level: number;
}

export type MatchPhase = "lobby" | "running" | "ended";

export const MSG = {
  move: "move",
  target: "target",
  damage: "damage",
  notice: "notice",
  start: "start",
  runEnded: "runEnded",
} as const;
