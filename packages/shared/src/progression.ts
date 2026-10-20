import { CLASSES, type ClassId } from "./classes.ts";

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

export interface Stats {
  maxHp: number;
  maxMana: number;
  damage: number;
  /** Tiles por segundo. */
  speed: number;
}

/** Atributos de uma classe num nível. Upgrades permanentes entram aqui no futuro. */
export function statsFor(classId: ClassId, level: number): Stats {
  const c = CLASSES[classId];
  const l = level - 1;
  return {
    maxHp: c.baseHp + c.hpPerLevel * l,
    maxMana: c.baseMana + c.manaPerLevel * l,
    damage: c.baseDamage + c.damagePerLevel * l,
    speed: c.baseSpeed + 0.08 * l,
  };
}
