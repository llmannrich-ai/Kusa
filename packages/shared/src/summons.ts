import type { AttackFx } from "./messages.ts";
import type { MonsterKind } from "./monsters.ts";

// Criaturas aliadas invocadas por magias (feras do Druida e esqueletos do Necromante). Elas seguem quem invocou,
// atacam os monstros por perto (ou curam a equipe) e somem quando o tempo acaba ou morrem.
// Os monstros também as atacam: as robustas servem de escudo para a equipe.

/** Criaturas com arte própria de invocação (`summonCreatures.ts` no cliente). */
export type CreatureSummonKind = "wolf" | "hornet" | "moth" | "bear" | "treant" | "wisp" | "skeleton" | "eagle";
/** O clã do Xamã Orc: orcs e ogros libertados, desenhados com a arte dos monstros do clã (`look`) e a marca de aliado. */
export type ClanSummonKind = "clanScout" | "clanSpearman" | "clanArcher" | "clanCaptain" | "forgeOgre";
export type SummonKind = CreatureSummonKind | ClanSummonKind;

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
  /** Desenhada com a arte deste monstro (o clã do Xamã Orc), com a marca de aliado por cima. */
  look?: MonsterKind;
  /** Orc ou ogro do clã: recebe o Comando do capitão e o bônus de perto dos totens do dono. */
  clan?: boolean;
  /** Recua quando o monstro chega a menos de `keepDistance` tiles (o arqueiro). */
  keepDistance?: number;
  /** Comando: os orcs do clã do mesmo dono a até `radius` tiles causam +`damage` e atacam `haste` mais rápido. */
  command?: { radius: number; damage: number; haste: number };
  /** O golpe empurra o monstro `push` tiles para longe. */
  push?: number;
  /** O golpe queima: `perSec` × o dano da criatura por segundo, por `ms`. */
  burn?: { perSec: number; ms: number };
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
  // --- O clã do Xamã Orc (docs/CLASSE_XAMA_ORC.md, seção 6). ---
  clanScout: {
    kind: "clanScout", name: "Orc batedor", hp: 0.25, damage: 0.4, attackRange: 1, attackCooldownMs: 900, speed: 5.5, attackFx: "slash",
    look: "orcScout", clan: true,
  },
  clanSpearman: {
    kind: "clanSpearman", name: "Orc lanceiro", hp: 0.8, damage: 0.5, attackRange: 1, attackCooldownMs: 1200, speed: 3.6, attackFx: "slash",
    look: "orcSpearman", clan: true, taunt: true,
  },
  clanArcher: {
    kind: "clanArcher", name: "Orc arqueiro", hp: 0.3, damage: 0.6, attackRange: 5, attackCooldownMs: 1500, speed: 4, attackFx: "arrow",
    look: "orcArcher", clan: true, keepDistance: 2,
  },
  clanCaptain: {
    kind: "clanCaptain", name: "Orc capitão", hp: 0.7, damage: 0.6, attackRange: 1, attackCooldownMs: 1300, speed: 3.8, attackFx: "slash",
    look: "orcCaptain", clan: true, command: { radius: 3, damage: 0.15, haste: 0.15 },
  },
  forgeOgre: {
    kind: "forgeOgre", name: "Ogro da Forja", hp: 1.4, damage: 1, attackRange: 1, attackCooldownMs: 1700, speed: 3, attackFx: "smash",
    look: "ogreYoung", clan: true, push: 1, burn: { perSec: 0.25, ms: 3000 },
  },
  wisp: {
    kind: "wisp", name: "Fogo-Fátuo", hp: 0.5, damage: 0, attackRange: 0, attackCooldownMs: 2500, speed: 4.5, attackFx: "nature",
    heal: 0.08, healRadius: 4, mana: 0.02,
  },
};

/** Perto de um totem do dono (a até `radius` tiles), os orcs do clã causam +`damage`. */
export const CLAN_TOTEM_BONUS = { radius: 3, damage: 0.15 };

/**
 * Parte do "dano nas magias" do equipamento que vale para as criaturas. Uma magia de ataque usa o bônus uma vez por
 * recarga; a criatura, em todo golpe enquanto dura: com o bônus inteiro, uma varinha boa dobrava o dano contínuo
 * (o Urso Ancestral passava de 300 por golpe no nível 20).
 */
export const SUMMON_SPELL_POWER_SHARE = 0.5;

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
