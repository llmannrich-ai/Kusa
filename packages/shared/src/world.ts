import type { MapId } from "./maps.ts";
import type { MonsterKind } from "./monsters.ts";

// Campanha (mapa mundi de Verdemar): a ordem em que os cenários abrem. Começa na Orla do Bosque (o Dragão jovem dela
// abre o Pântano do Kosaradius). Vencer o boss de um cenário abre o seguinte, por personagem (conta e classe). A
// Fíbula Profunda é a trifurcação: cada covil abre um lado (`UNLOCK_BOSS`): o Rei Ossudo a Cripta, o Colosso Cantante
// o Mar de Areia (e dali o deserto até a Caverna da Travessia) e o Dragão Verde Jovem o Bosque Velho (a floresta, até
// o Coração da Mata). A Cripta, por ora, não abre nada. Na Caverna da Travessia, o Observador (covil leste) abre as
// Dunas Cantantes, depois as Mesas de Solária. Os dois lados se reencontram nas Ruínas do Império: a Fortaleza Orc abre
// com o boss das Mesas **ou** com o do Coração da Mata (`ALSO_UNLOCKED_BY`). A Fortaleza é a outra bifurcação: Vorgak
// abre os dois lados da etapa 9, o Charco Cinzento e os Ermos Rubros. Os Portões do Império saíram da campanha (o mapa
// continua no código, mas não abre para ninguém). O banco repete isto em `public.map_unlocked_by`,
// `public.map_unlocked_by_also` e `public.map_unlocked_by_boss` (mude os dois juntos). Fora de `RULES_FILES`: não muda
// a versão das regras.

/** Os cenários na ordem da campanha (cada lado da bifurcação na sua ordem; o deserto, que segue, por último). O primeiro já vem aberto. */
export const WORLD_ORDER: readonly MapId[] = [
  "grove", "marsh", "fibula", "fibula2", "crypt", "desert", "swamp", "cavern", "oldwood", "heartwood", "dunes", "mesas", "fortress", "bog", "badlands",
];

/** Cenário cujo boss abre cada um (o primeiro não tem). */
const UNLOCKED_BY: Partial<Record<MapId, MapId>> = {
  marsh: "grove", fibula: "marsh", fibula2: "fibula",
  // A trifurcação da Fíbula Profunda (cada lado com o boss do covil dele, em `UNLOCK_BOSS`).
  crypt: "fibula2", desert: "fibula2", oldwood: "fibula2",
  swamp: "desert", cavern: "swamp", heartwood: "oldwood",
  dunes: "cavern", mesas: "dunes", fortress: "mesas",
  // A Fortaleza Orc é a segunda bifurcação: Vorgak abre os dois lados (o Charco Cinzento e os Ermos Rubros).
  bog: "fortress", badlands: "fortress",
};

/**
 * Lados de uma bifurcação: o cenário abre só com **este** boss vencido, não com qualquer boss do cenário anterior. Na
 * Fíbula Profunda, o Rei Ossudo (oeste) abre a Cripta, o Colosso Cantante (norte) o Mar de Areia e o Dragão Verde
 * Jovem (leste) o Bosque Velho; na Caverna da Travessia, o Observador (covil leste) abre as Dunas Cantantes. O banco
 * repete em `public.map_unlocked_by_boss`.
 */
export const UNLOCK_BOSS: Partial<Record<MapId, MonsterKind>> = {
  crypt: "boneKing", desert: "singingColossus", oldwood: "greenDragon", dunes: "beholder",
};

/**
 * Outros cenários cujo boss também abre este (onde dois lados de uma bifurcação se reencontram): a Fortaleza Orc abre
 * pelo deserto (Mesas de Solária, `UNLOCKED_BY`) ou pela floresta (Coração da Mata). O banco repete em
 * `public.map_unlocked_by_also`.
 */
const ALSO_UNLOCKED_BY: Partial<Record<MapId, MapId[]>> = { fortress: ["heartwood"] };

/** Cenário cujo boss abre este (`undefined` para o primeiro). Com outros caminhos, o principal (ver `unlockedByAny`). */
export function unlockedBy(mapId: MapId): MapId | undefined {
  return UNLOCKED_BY[mapId];
}

/** Todos os cenários cujo boss abre este (qualquer um basta): o principal e os de `ALSO_UNLOCKED_BY`. */
export function unlockedByAny(mapId: MapId): MapId[] {
  const before = UNLOCKED_BY[mapId];
  return before === undefined ? [] : [before, ...(ALSO_UNLOCKED_BY[mapId] ?? [])];
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
  return boss ? clears.includes(boss) : unlockedByAny(mapId).some((id) => clears.includes(id));
}

/** Último cenário aberto na ordem da campanha (onde o herói espera no mapa). */
export function lastUnlocked(clears: readonly string[]): MapId {
  return [...WORLD_ORDER].reverse().find((id) => mapUnlocked(clears, id)) ?? WORLD_ORDER[0];
}
