import { SPELL_MAX_LEVEL, type SpellDef } from "./spells.ts";

// Nível das magias pelo uso: comprar uma magia no Grimório só a libera (nível 0, aprendiz). Daí em diante ela
// sobe de nível sendo usada nas hunts, devagar. O nível 1 é o pré-requisito dos nós seguintes da árvore, então
// chega rápido (1 ou 2 hunts boas); os outros pedem dezenas de hunts. O banco repete estas regras em
// `spell_level` e `spell_xp_after_run` (supabase/migrations): mude os dois juntos.

/** XP acumulado para chegar a cada nível (índice 0 = nível 1). */
export const SPELL_LEVEL_XP = [60, 400, 1200, 2800, 5500] as const;

/** Teto de XP que uma magia ganha numa hunt (o banco corta acima disso). */
export const SPELL_XP_HUNT_CAP = 400;

/** Morrer (ou ficar soterrado) tira esta fração do XP das magias usadas na hunt, sem cair abaixo do nível 1. */
export const DEATH_SPELL_XP_LOSS = 0.05;

/** Um lançamento só conta XP em combate: algum monstro vivo à vista a até tantos tiles (sem farm em sala vazia). */
export const SPELL_XP_COMBAT_TILES = 6;

if (SPELL_LEVEL_XP.length !== SPELL_MAX_LEVEL) throw new Error("SPELL_LEVEL_XP precisa de um limiar por nível");

/** XP mínimo das magias iniciais da classe: já vêm no nível 1. */
export const STARTER_SPELL_XP = SPELL_LEVEL_XP[0];

/** Nível (0 a SPELL_MAX_LEVEL) de uma magia com este XP acumulado. */
export function spellLevelFromXp(xp: number): number {
  let level = 0;
  while (level < SPELL_MAX_LEVEL && xp >= SPELL_LEVEL_XP[level]) level++;
  return level;
}

/** Quanto falta no nível atual, para a barra de progresso: `need` é 0 no nível máximo. */
export function spellLevelProgress(xp: number): { level: number; into: number; need: number } {
  const level = spellLevelFromXp(xp);
  if (level >= SPELL_MAX_LEVEL) return { level, into: 0, need: 0 };
  const floor = level === 0 ? 0 : SPELL_LEVEL_XP[level - 1];
  return { level, into: xp - floor, need: SPELL_LEVEL_XP[level] - floor };
}

/**
 * XP de um lançamento: os segundos de recarga da magia. Assim, usar a magia o tempo todo rende o mesmo para uma
 * de recarga curta e uma de recarga longa.
 */
export function castXp(spell: SpellDef): number {
  return Math.max(1, Math.round(spell.cooldownMs / 1000));
}

/**
 * XP da magia depois da hunt: soma o ganho (até o teto) e, na morte, tira DEATH_SPELL_XP_LOSS do total. A perda
 * pode descer níveis, mas nunca abaixo do nível 1 (nem abaixo do que a magia tinha, se ainda não chegou nele).
 */
export function spellXpAfterRun(xp: number, gained: number, died: boolean): number {
  const total = Math.max(0, xp) + Math.min(Math.max(0, Math.floor(gained)), SPELL_XP_HUNT_CAP);
  if (!died) return total;
  return Math.max(total - Math.floor(total * DEATH_SPELL_XP_LOSS), Math.min(total, SPELL_LEVEL_XP[0]));
}
