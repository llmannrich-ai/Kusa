import { CLASSES, type ClassId } from "./classes.ts";
import { HERO_SPEED_SCALE } from "./constants.ts";
import { NO_BONUSES, type Bonuses } from "./talents.ts";

export const MAX_LEVEL = 20;

/** XP total necessária para alcançar `level` (nível 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = level - 1;
  return Math.round(50 * n + 25 * n * n);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/**
 * Retorno decrescente dos atributos: a partir deste nível, cada nível dá só `STAT_TAPER` do ganho de vida, mana e dano
 * (a velocidade segue igual). Freia a bola de neve do fim da hunt sem mexer no começo.
 */
export const STAT_TAPER_LEVEL = 11;
export const STAT_TAPER = 0.5;

/** Quantos níveis de ganho de atributo o herói soma no `level` (o nível 1 soma zero). */
export function statLevels(level: number): number {
  const full = Math.min(level, STAT_TAPER_LEVEL - 1) - 1;
  return full + Math.max(0, level - (STAT_TAPER_LEVEL - 1)) * STAT_TAPER;
}

export interface Stats {
  maxHp: number;
  maxMana: number;
  damage: number;
  /** Tiles por segundo. */
  speed: number;
}

/** Atributos de uma classe num nível, com o bônus das áureas compradas na árvore de magias. */
export function statsFor(classId: ClassId, level: number, bonus: Bonuses = NO_BONUSES): Stats {
  const c = CLASSES[classId];
  const l = level - 1;
  const g = statLevels(level);
  return {
    maxHp: Math.round((c.baseHp + c.hpPerLevel * g) * (1 + bonus.hp)),
    maxMana: Math.round((c.baseMana + c.manaPerLevel * g) * (1 + bonus.mana)),
    damage: (c.baseDamage + c.damagePerLevel * g) * (1 + bonus.damage),
    speed: (c.baseSpeed + 0.08 * l) * (1 + bonus.speed) * HERO_SPEED_SCALE,
  };
}
