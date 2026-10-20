import type { ClassId } from "./classes.ts";
import type { SpellId, SpellSlot } from "./spells.ts";

/** Como um golpe aparece na tela: o cliente escolhe projétil e impacto a partir disto. */
export type AttackFx = "slash" | "bite" | "smash" | "arrow" | "energy" | "nature" | "fire";

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

/** Servidor → todos: um golpe acertou alguém (efeito do golpe e número de dano flutuante). */
export interface DamageMessage {
  x: number;
  y: number;
  amount: number;
  /** true quando quem apanhou foi um jogador. */
  toPlayer: boolean;
  /** Quem bateu (sessionId do jogador ou id do monstro) e de onde, para o projétil e o avanço do golpe. */
  attacker: string;
  fromX: number;
  fromY: number;
  fx: AttackFx;
}

/** Servidor → todos: aviso flutuante no mapa (XP, nível, loot, baú, boss). */
export interface NoticeMessage {
  x: number;
  y: number;
  text: string;
  color: number;
}

/** Cliente → servidor: põe uma magia num slot liberado. */
export interface ChooseSpellMessage { slot: SpellSlot; spellId: SpellId }

/** Cliente → servidor: conjura a magia de um slot (no alvo atual ou no mais próximo ao alcance). */
export interface CastMessage { slot: SpellSlot }

/** Servidor → todos: um ataque básico saiu (para desenhar golpe ou projétil). */
export interface AttackMessage {
  /** sessionId de quem atacou. */
  from: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Tempo de voo do projétil; 0 = corpo a corpo. */
  ms: number;
}

/** Servidor → todos: uma magia foi conjurada. */
export interface SpellMessage {
  from: string;
  spellId: SpellId;
  x: number;
  y: number;
  /** Centro do efeito (o alvo, ou quem conjurou). */
  tx: number;
  ty: number;
  ms: number;
}

export type RunOutcome = "died" | "escaped" | "completed" | "buried";

/** Servidor → cliente quando a hunt de um jogador termina. */
export interface RunEndedMessage {
  outcome: RunOutcome;
  loot: number;
  level: number;
  /** Itens equipados que voltam para o inventário da conta (só quem sai vivo). */
  items: string[];
}

export type MatchPhase = "lobby" | "running" | "ended";

export const MSG = {
  move: "move",
  target: "target",
  damage: "damage",
  notice: "notice",
  start: "start",
  runEnded: "runEnded",
  attack: "attack",
  chooseSpell: "chooseSpell",
  cast: "cast",
  spell: "spell",
} as const;
