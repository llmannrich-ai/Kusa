import type { MapId } from "./maps.ts";

// Campanha (mapa mundi de Verdemar): a ordem em que os cenários abrem. Vencer o boss de um cenário abre o seguinte,
// por personagem (conta e classe). O banco repete esta ordem em `public.map_unlocked` (mude os dois juntos).
// Fora de `RULES_FILES`: não muda a versão das regras.

/** Os cenários na ordem da campanha. O primeiro já vem aberto. */
export const WORLD_ORDER: readonly MapId[] = ["marsh", "crypt", "desert", "swamp"];

/** Cenário cujo boss abre este (`undefined` para o primeiro). */
export function unlockedBy(mapId: MapId): MapId | undefined {
  const i = WORLD_ORDER.indexOf(mapId);
  return i > 0 ? WORLD_ORDER[i - 1] : undefined;
}

/** O cenário está aberto para quem já venceu o boss de `clears`? */
export function mapUnlocked(clears: readonly MapId[], mapId: MapId): boolean {
  const before = unlockedBy(mapId);
  return !WORLD_ORDER.includes(mapId) ? false : before === undefined || clears.includes(before);
}

/** Último cenário aberto na ordem da campanha (onde o herói espera no mapa). */
export function lastUnlocked(clears: readonly MapId[]): MapId {
  return [...WORLD_ORDER].reverse().find((id) => mapUnlocked(clears, id)) ?? WORLD_ORDER[0];
}
