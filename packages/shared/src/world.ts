import type { MapId } from "./maps.ts";
import type { MonsterKind } from "./monsters.ts";

// Campanha (mapa mundi de Verdemar): a ordem em que os cenários abrem. Vencer o boss de um cenário abre o seguinte,
// por personagem (conta e classe). Na Caverna da Travessia a trilha se divide: o Basilisco (covil oeste) abre a
// floresta (Bosque Velho, depois Coração da Mata) e o Observador (covil leste) o deserto (Dunas Cantantes, depois
// Mesas de Solária e, nas Ruínas do Império, a Fortaleza Orc, aberta pelo Faraó Eterno). A Fortaleza é a segunda
// bifurcação: Vorgak abre os dois lados da etapa 9, o Charco Cinzento e os Ermos Rubros. Os Portões do Império
// saíram da campanha (o mapa continua no código, mas não abre para ninguém). O banco repete isto em `public.map_unlocked_by` e `public.map_unlocked_by_boss` (mude os dois juntos). Fora
// de `RULES_FILES`: não muda a versão das regras.

/** Os cenários na ordem da campanha (cada lado da bifurcação na sua ordem; o deserto, que segue, por último). O primeiro já vem aberto. */
export const WORLD_ORDER: readonly MapId[] = [
  "marsh", "crypt", "desert", "swamp", "cavern", "oldwood", "heartwood", "dunes", "mesas", "fortress", "bog", "badlands",
];

/** Cenário cujo boss abre cada um (o primeiro não tem). */
const UNLOCKED_BY: Partial<Record<MapId, MapId>> = {
  crypt: "marsh", desert: "crypt", swamp: "desert", cavern: "swamp",
  oldwood: "cavern", heartwood: "oldwood",
  dunes: "cavern", mesas: "dunes", fortress: "mesas",
  // A Fortaleza Orc é a segunda bifurcação: Vorgak abre os dois lados (o Charco Cinzento e os Ermos Rubros).
  bog: "fortress", badlands: "fortress",
};

/**
 * Lados de uma bifurcação: o cenário abre só com **este** boss vencido, não com qualquer boss do cenário anterior. Na
 * Caverna da Travessia, o Observador (covil leste) abre o deserto e o Basilisco (covil oeste) a floresta. O banco
 * repete em `public.map_unlocked_by_boss`.
 */
export const UNLOCK_BOSS: Partial<Record<MapId, MonsterKind>> = { dunes: "beholder", oldwood: "basilisk" };

/** Cenário cujo boss abre este (`undefined` para o primeiro). */
export function unlockedBy(mapId: MapId): MapId | undefined {
  return UNLOCKED_BY[mapId];
}

/**
 * O cenário está aberto para quem já venceu `clears`? A lista tem os cenários de boss vencido (`MapId`) e os bosses
 * vencidos (`MonsterKind`), que contam nos lados das bifurcações (`UNLOCK_BOSS`).
 */
export function mapUnlocked(clears: readonly string[], mapId: MapId): boolean {
  if (!WORLD_ORDER.includes(mapId)) return false;
  const before = unlockedBy(mapId);
  if (before === undefined) return true;
  const boss = UNLOCK_BOSS[mapId];
  return boss ? clears.includes(boss) : clears.includes(before);
}

/** Último cenário aberto na ordem da campanha (onde o herói espera no mapa). */
export function lastUnlocked(clears: readonly string[]): MapId {
  return [...WORLD_ORDER].reverse().find((id) => mapUnlocked(clears, id)) ?? WORLD_ORDER[0];
}
