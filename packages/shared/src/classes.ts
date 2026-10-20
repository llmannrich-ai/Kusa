import type { AttackFx } from "./messages.ts";

export type ClassId = "knight" | "paladin" | "sorcerer" | "druid";

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
  /** Intervalo entre ataques básicos (auto-attack). */
  attackCooldownMs: number;
  /** Efeito visual do ataque básico. */
  attackFx: AttackFx;
  /** Cor da classe no menu. */
  color: number;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  knight: {
    id: "knight", name: "Cavaleiro", color: 0xc0392b, attackFx: "slash",
    baseHp: 150, baseMana: 20, baseDamage: 12, baseSpeed: 4,
    hpPerLevel: 15, manaPerLevel: 5, damagePerLevel: 2, attackRange: 1, attackCooldownMs: 900,
  },
  paladin: {
    id: "paladin", name: "Paladino", color: 0xf1c40f, attackFx: "arrow",
    baseHp: 110, baseMana: 50, baseDamage: 10, baseSpeed: 4.2,
    hpPerLevel: 10, manaPerLevel: 15, damagePerLevel: 2, attackRange: 5, attackCooldownMs: 1100,
  },
  sorcerer: {
    id: "sorcerer", name: "Feiticeiro", color: 0x8e44ad, attackFx: "energy",
    baseHp: 80, baseMana: 100, baseDamage: 14, baseSpeed: 4,
    hpPerLevel: 5, manaPerLevel: 30, damagePerLevel: 3, attackRange: 4, attackCooldownMs: 1200,
  },
  druid: {
    id: "druid", name: "Druida", color: 0x27ae60, attackFx: "nature",
    baseHp: 85, baseMana: 95, baseDamage: 9, baseSpeed: 4,
    hpPerLevel: 5, manaPerLevel: 30, damagePerLevel: 2, attackRange: 4, attackCooldownMs: 1100,
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];
