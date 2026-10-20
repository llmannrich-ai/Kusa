import type { ClassId } from "./classes.ts";

/** Opções enviadas pelo cliente ao entrar numa sala. */
export interface JoinOptions {
  name: string;
  classId: ClassId;
  /** JWT do Supabase; o servidor usa para identificar o jogador. */
  accessToken?: string;
}

/** Cliente → servidor: um passo de tile. */
export interface MoveMessage { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

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
  start: "start",
  runEnded: "runEnded",
} as const;
