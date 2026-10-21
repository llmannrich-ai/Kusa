import type { MapId } from "./maps.ts";
import type { TalentRanks } from "./talents.ts";

/**
 * Limites de plausibilidade da hunt solo. Ela roda no aparelho do jogador, então o banco não confia
 * no resultado: `finish_solo_run` corta o que passar daqui. Mude junto com a migration do solo
 * (supabase/migrations/*_hunt_solo.sql); o teste `apps/server/scripts/solo.ts` confere o loot máximo.
 */
export const SOLO_LIMITS = {
  /** Loot máximo de uma hunt por mapa: pouco acima do máximo teórico (todos os monstros e baús no topo, com o bônus do boss). */
  maxLoot: { crypt: 1050, swamp: 2700 } satisfies Record<MapId, number>,
  /** O teto do loot cresce proporcional ao tempo de hunt e só chega ao máximo depois disto (segundos). */
  fullLootSeconds: { crypt: 90, swamp: 180 } satisfies Record<MapId, number>,
  /** Folga além da duração do mapa para o resultado chegar ao banco; depois disso vale como soterrado. */
  graceSeconds: 60,
  /** Itens novos (que não entraram com o jogador) no máximo por hunt: equipamento, runas e a bag cheia. */
  maxNewItems: 15,
  /** Valor máximo (gold + preço de venda dos itens novos) que o solo rende em 24 horas. */
  dailyValue: 12_000,
};

/** Resposta de `start_solo_run`: a hunt começou e o equipamento e a bag saíram da conta. */
export interface SoloRunStart {
  run_id: string;
  /** Seed sorteada pelo banco (o jogador não escolhe a dungeon). */
  seed: number;
  /** Itens equipados no menu, que entram na dungeon. */
  items: string[];
  /** Bag da conta, que entra na dungeon. */
  bag: string[];
  talents: TalentRanks;
}

/** Resposta de `finish_solo_run`: o que de fato foi creditado depois dos limites. */
export interface SoloRunResult {
  gold: number;
  items: string[];
  bag: string[];
}
