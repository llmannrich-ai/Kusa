import { CLASSES, type ClassId } from "./classes.ts";
import { HERO_SPEED_SCALE } from "./constants.ts";
import { NO_BONUSES, type Bonuses } from "./talents.ts";

export const MAX_LEVEL = 20;

/**
 * Escala da curva de XP: a forma é a do Tibia (cúbica, 50/3 × (L³ − 6L² + 17L − 12)), num terço do valor, porque a XP
 * dos monstros foi calibrada para a curva antiga (reta: 50n + 25n²). Os primeiros níveis saem quase de graça e o custo
 * de cada nível cresce com o quadrado do nível: limpando 75% de um mapa, o herói chega no boss entre o 7 (Cripta) e o
 * 16 (Fortaleza), sem corte de XP por mapa, e o nível 20 (~33 mil de XP) virou conquista rara.
 */
export const XP_CURVE_SCALE = 1 / 3;

/** XP total necessária para alcançar `level` (nível 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const l = level;
  return Math.round(XP_CURVE_SCALE * (50 / 3) * (l * l * l - 6 * l * l + 17 * l - 12));
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

/** Atributos de uma classe num nível, com o bônus das áureas compradas na árvore de magias. */
export function statsFor(classId: ClassId, level: number, bonus: Bonuses = NO_BONUSES): Stats {
  const c = CLASSES[classId];
  const l = level - 1;
  return {
    maxHp: Math.round((c.baseHp + c.hpPerLevel * l) * (1 + bonus.hp)),
    maxMana: Math.round((c.baseMana + c.manaPerLevel * l) * (1 + bonus.mana)),
    damage: (c.baseDamage + c.damagePerLevel * l) * (1 + bonus.damage),
    speed: (c.baseSpeed + 0.08 * l) * (1 + bonus.speed) * HERO_SPEED_SCALE,
  };
}
