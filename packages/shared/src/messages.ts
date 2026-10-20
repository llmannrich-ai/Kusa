import type { ClassId } from "./classes.ts";
import type { MapId } from "./maps.ts";
import type { PotionId } from "./potions.ts";
import type { SpellId, SpellSlot } from "./spells.ts";

/** Como um golpe aparece na tela: o cliente escolhe projétil e impacto a partir disto. */
export type AttackFx = "slash" | "bite" | "smash" | "arrow" | "energy" | "nature" | "fire";

/** Opções enviadas pelo cliente ao entrar numa sala. */
export interface JoinOptions {
  name: string;
  classId: ClassId;
  /** JWT do Supabase; o servidor usa para identificar o jogador. */
  accessToken?: string;
  /** `RULES_VERSION` do cliente: o servidor recusa outra versão. */
  rulesVersion?: number;
  /** Mapa da hunt. Só vale para quem cria a sala; quem entra numa sala aberta joga o mapa dela. */
  mapId?: MapId;
}

/** Metadata de matchmaking de uma hunt, mostrada na lista de salas. */
export interface HuntMetadata {
  /** Nome do líder da equipe. */
  leader: string;
  mapId: MapId;
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
  /** true quando quem apanhou foi um jogador ou uma criatura invocada. */
  toPlayer: boolean;
  /** Dano que o escudo (Escudo da Fé e outros) absorveu antes de chegar à vida. */
  absorbed?: number;
  /** Quem bateu (sessionId do jogador, id do monstro ou da criatura invocada) e de onde, para o projétil e o avanço do golpe. */
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

/** Cliente → servidor: segurando (true) ou soltando (false) o botão de ataque básico. Um toque dá um golpe. */
export interface AttackingMessage { on: boolean }

/** Ponto escolhido com a mira (tile). `targetId` é o monstro em que a mira de alvo único grudou. */
export interface CastAim { x: number; y: number; targetId?: string }

/**
 * Cliente → servidor: conjura a magia de um slot. Sem `aim` (toque rápido), usa o alvo atual
 * ou o monstro mais próximo ao alcance.
 */
export interface CastMessage { slot: SpellSlot; aim?: CastAim }

/** Cliente → servidor: bebe uma poção carregada (recarga compartilhada entre os tipos). */
export interface DrinkMessage { potion: PotionId }

/** Servidor → quem bebeu: a poção foi bebida e a recarga começou. */
export interface DrankMessage { potion: PotionId; cooldownMs: number }

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
  attacking: "attacking",
  chooseSpell: "chooseSpell",
  cast: "cast",
  spell: "spell",
  drink: "drink",
  drank: "drank",
} as const;
