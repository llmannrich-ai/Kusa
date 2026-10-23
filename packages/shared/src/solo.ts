import type { MapId } from "./maps.ts";
import type { SpellXp, TalentRanks } from "./talents.ts";

/**
 * Limites de plausibilidade da hunt solo. Ela roda no aparelho do jogador, então o banco não confia
 * no resultado: `finish_solo_run` corta o que passar daqui. Mude junto com a migration do solo
 * (supabase/migrations/*_hunt_solo.sql); o teste `apps/server/scripts/solo.ts` confere o loot máximo.
 */
export const SOLO_LIMITS = {
  /** Loot máximo de uma hunt por mapa: pouco acima do máximo teórico (todos os monstros e baús no topo, com o bônus do boss). */
  maxLoot: { crypt: 1200, swamp: 3000, desert: 0 } satisfies Record<MapId, number>,
  /** O teto do loot cresce proporcional ao tempo de hunt e só chega ao máximo depois disto (segundos). */
  fullLootSeconds: { crypt: 90, swamp: 180, desert: 180 } satisfies Record<MapId, number>,
  /** Folga além da duração do mapa para o resultado chegar ao banco; depois disso vale como soterrado. */
  graceSeconds: 60,
  /**
   * Resultado que chega atrasado (a rede caiu e o aparelho reenviou) vale por até estas horas, com o tempo de
   * hunt medido no aparelho em vez do atraso.
   */
  lateResultHours: 24,
  /** Itens novos (que não entraram com o jogador) no máximo por hunt: equipamento, runas e a bag cheia. */
  maxNewItems: 15,
  /** Valor máximo (gold + preço de venda dos itens novos) que o solo rende em 24 horas. */
  dailyValue: 12_000,
  /**
   * XP de uso máximo por segundo de hunt, por magia: lançar sem parar rende 1 XP por segundo de recarga, e a
   * melhoria Foco e as recargas devolvidas ao matar encurtam a recarga. Além disso valem o teto por hunt
   * (SPELL_XP_HUNT_CAP) e as 2 magias dos slots.
   */
  spellXpPerSecond: 2,
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
  /** XP de uso de cada magia da conta. */
  spell_xp: SpellXp;
}

/** Resposta de `finish_solo_run`: o que de fato foi creditado depois dos limites. */
export interface SoloRunResult {
  gold: number;
  items: string[];
  bag: string[];
}
