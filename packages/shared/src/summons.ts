import type { AttackFx } from "./messages.ts";

// Criaturas aliadas invocadas por magias (feras do Druida e esqueletos do Necromante). Elas seguem quem invocou,
// atacam os monstros por perto (ou curam a equipe) e somem quando o tempo acaba ou morrem.
// Os monstros também as atacam: as robustas servem de escudo para a equipe.

export type SummonKind = "wolf" | "hornet" | "moth" | "bear" | "treant" | "wisp" | "skeleton" | "eagle";

export interface SummonDef {
  kind: SummonKind;
  name: string;
  /** Vida, em fração da vida máxima de quem invocou. */
  hp: number;
  /** Dano por golpe, em múltiplo do dano base de quem invocou (0 = não ataca). */
  damage: number;
  /** Alcance do golpe em tiles (1 = corpo a corpo). */
  attackRange: number;
  /** Intervalo entre golpes (ou entre curas). */
  attackCooldownMs: number;
  /** Tiles por segundo. */
  speed: number;
  attackFx: AttackFx;
  /** Cura os aliados (jogadores) a até `healRadius` tiles, em fração da vida máxima de cada um. */
  heal?: number;
  healRadius?: number;
  /** Junto com a cura, devolve esta fração da mana máxima de cada aliado na área. */
  mana?: number;
  /** O monstro atingido passa a perseguir a criatura (protege a equipe). */
  taunt?: boolean;
  /** O monstro atingido fica preso por este tempo. */
  rootMs?: number;
  /** O monstro atingido fica atordoado por este tempo. */
  stunMs?: number;
  /** Voa: passa por cima da água (paredes e mata ainda barram). */
  flies?: boolean;
}

export const SUMMONS: Record<SummonKind, SummonDef> = {
  wolf: {
    kind: "wolf", name: "Lobo Espiritual", hp: 0.45, damage: 0.7, attackRange: 1, attackCooldownMs: 900, speed: 5, attackFx: "bite",
  },
  hornet: {
    kind: "hornet", name: "Vespa", hp: 0.15, damage: 0.4, attackRange: 3, attackCooldownMs: 800, speed: 6, attackFx: "nature",
  },
  moth: {
    kind: "moth", name: "Mariposa Curandeira", hp: 0.3, damage: 0, attackRange: 0, attackCooldownMs: 2000, speed: 5, attackFx: "nature",
    heal: 0.05, healRadius: 2,
  },
  bear: {
    kind: "bear", name: "Urso Ancestral", hp: 1.3, damage: 1.1, attackRange: 1, attackCooldownMs: 1300, speed: 3.5, attackFx: "smash",
    taunt: true,
  },
  treant: {
    kind: "treant", name: "Guardião do Bosque", hp: 2.2, damage: 0.8, attackRange: 1, attackCooldownMs: 1600, speed: 2.5, attackFx: "smash",
    taunt: true, rootMs: 1500,
  },
  skeleton: {
    kind: "skeleton", name: "Esqueleto Erguido", hp: 0.6, damage: 0.8, attackRange: 1, attackCooldownMs: 1000, speed: 4, attackFx: "slash",
  },
  eagle: {
    kind: "eagle", name: "Águia Gigante", hp: 0.5, damage: 1.2, attackRange: 1, attackCooldownMs: 1500, speed: 6, attackFx: "bite",
    stunMs: 800, flies: true,
  },
  wisp: {
    kind: "wisp", name: "Fogo-Fátuo", hp: 0.5, damage: 0, attackRange: 0, attackCooldownMs: 2500, speed: 4.5, attackFx: "nature",
    heal: 0.08, healRadius: 4, mana: 0.02,
  },
};

/** Máximo de criaturas vivas de um mesmo jogador. */
export const MAX_SUMMONS_PER_PLAYER = 6;

/** Atributos de uma criatura invocada por alguém com `ownerMaxHp` e `ownerDamage`, com a força da magia. */
export function summonStats(kind: SummonKind, ownerMaxHp: number, ownerDamage: number, power = 1) {
  const def = SUMMONS[kind];
  return {
    maxHp: Math.max(1, Math.round(ownerMaxHp * def.hp * power)),
    damage: ownerDamage * def.damage * power,
    heal: (def.heal ?? 0) * power,
    mana: (def.mana ?? 0) * power,
  };
}
