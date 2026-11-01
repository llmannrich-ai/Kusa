import type { AttackFx } from "./messages.ts";

export type ClassId = "knight" | "paladin" | "sorcerer" | "druid" | "shaman";

export interface ClassDef {
  id: ClassId;
  name: string;
  /** Atributos no nível 1. */
  baseHp: number;
  baseMana: number;
  baseDamage: number;
  /** Tiles por segundo no nível 1. */
  baseSpeed: number;
  /** Ganho por nível. */
  hpPerLevel: number;
  manaPerLevel: number;
  damagePerLevel: number;
  /** Alcance do ataque básico em tiles (1 = corpo a corpo). */
  attackRange: number;
  /** Efeito visual do ataque básico. */
  attackFx: AttackFx;
  /** Cor da classe no menu. */
  color: number;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  knight: {
    id: "knight", name: "Cavaleiro", color: 0xc0392b, attackFx: "slash",
    baseHp: 150, baseMana: 20, baseDamage: 12, baseSpeed: 4,
    hpPerLevel: 15, manaPerLevel: 5, damagePerLevel: 2, attackRange: 1,
  },
  paladin: {
    id: "paladin", name: "Paladino", color: 0xf1c40f, attackFx: "arrow",
    baseHp: 120, baseMana: 50, baseDamage: 10, baseSpeed: 4.2,
    hpPerLevel: 12, manaPerLevel: 15, damagePerLevel: 2, attackRange: 5,
  },
  sorcerer: {
    id: "sorcerer", name: "Feiticeiro", color: 0x8e44ad, attackFx: "energy",
    baseHp: 100, baseMana: 100, baseDamage: 14, baseSpeed: 4,
    hpPerLevel: 8, manaPerLevel: 30, damagePerLevel: 3, attackRange: 4,
  },
  druid: {
    id: "druid", name: "Druida", color: 0x27ae60, attackFx: "nature",
    baseHp: 100, baseMana: 95, baseDamage: 9, baseSpeed: 4,
    hpPerLevel: 8, manaPerLevel: 30, damagePerLevel: 2, attackRange: 4,
  },
  // Xamã Orc: liberado ao vencer Vorgak na Fortaleza Orc (`CLASS_UNLOCK`). Fica no meio da briga, junto dos totens:
  // alcance curto e mais vida que os conjuradores (docs/CLASSE_XAMA_ORC.md).
  shaman: {
    id: "shaman", name: "Xamã Orc", color: 0xd35400, attackFx: "fire",
    baseHp: 135, baseMana: 70, baseDamage: 11, baseSpeed: 3.8,
    hpPerLevel: 12, manaPerLevel: 20, damagePerLevel: 2, attackRange: 3,
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

/**
 * Classes que não vêm abertas: abrem na conta inteira quando qualquer personagem dela vence este boss. O banco repete
 * em `public.class_unlocked` (mude os dois juntos).
 */
export const CLASS_UNLOCK: Partial<Record<ClassId, string>> = { shaman: "emberWarlord" };

/** A classe está aberta para a conta que venceu `bossClears` (bosses vencidos por qualquer personagem da conta)? */
export function classUnlocked(bossClears: readonly string[], classId: ClassId): boolean {
  const boss = CLASS_UNLOCK[classId];
  return boss === undefined || bossClears.includes(boss);
}
