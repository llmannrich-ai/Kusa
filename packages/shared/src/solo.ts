import { MAX_PARTY_SIZE } from "./constants.ts";
import type { MapId } from "./maps.ts";
import type { SpellXp, TalentRanks } from "./talents.ts";

/**
 * Limites de plausibilidade da hunt solo. Ela roda no aparelho do jogador, então o banco não confia
 * no resultado: `finish_solo_run` corta o que passar daqui. Mude junto com a migration do solo
 * (supabase/migrations/*_hunt_solo.sql); o teste `apps/server/scripts/solo.ts` confere o loot máximo.
 */
export const SOLO_LIMITS = {
  /** Loot máximo de uma hunt por mapa: pouco acima do máximo teórico (todos os monstros e baús no topo, com o bônus do boss). */
  maxLoot: { crypt: 1200, swamp: 3000, desert: 1700, marsh: 1900, cavern: 3000, dunes: 3300, mesas: 3800 } satisfies Record<MapId, number>,
  /** O teto do loot cresce proporcional ao tempo de hunt e só chega ao máximo depois disto (segundos). */
  fullLootSeconds: { crypt: 90, swamp: 180, desert: 180, marsh: 240, cavern: 240, dunes: 240, mesas: 240 } satisfies Record<MapId, number>,
  /**
   * Hunt abandonada (o app fechou ou recarregou no meio) só vale como morte depois que o herói saiu da sala inicial
   * e jogou estes segundos: o cliente avisa o banco (`solo_run_committed`). Antes disso, `start_solo_run` fecha a
   * hunt aberta sem perda (equipamento e bag voltam).
   */
  committedSeconds: 60,
  /** Folga além da duração do mapa para o resultado chegar ao banco; depois disso vale como soterrado. */
  graceSeconds: 60,
  /**
   * Resultado que chega atrasado (a rede caiu e o aparelho reenviou) vale por até estas horas, com o tempo de
   * hunt medido no aparelho em vez do atraso.
   */
  lateResultHours: 24,
  /** Itens novos (que não entraram com o jogador) no máximo por hunt: equipamento, runas e a bag cheia. */
  maxNewItems: 15,
  /**
   * Runas novas além das dos bosses anotados na hunt: a runa passa de mão em mão na equipe (até 3 colegas podem
   * largar a sua para o mesmo herói). `finish_solo_run` aceita no máximo uma por boss anotado mais estas.
   */
  passedRunes: MAX_PARTY_SIZE - 1,
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
  /** Bosses cuja runa este personagem (conta e classe) já levou: eles não dão outra. */
  boss_runes?: string[];
  /** Hunts que estavam abertas (o resultado nunca chegou) e foram fechadas agora, com o que se perdeu. */
  closed?: SoloRunClosed[];
}

/** Hunt aberta fechada por `start_solo_run`: como morte (perde 1 equipamento sorteado e a bag) ou sem perda. */
export interface SoloRunClosed {
  map_id: MapId;
  class_id: string;
  died: boolean;
  /** Equipamento sorteado perdido (null sem perda ou sem equipamento). */
  lost: string | null;
  /** Bag perdida. */
  lost_bag: string[];
}

/** Resposta de `finish_solo_run`: o que de fato foi creditado depois dos limites. */
export interface SoloRunResult {
  gold: number;
  items: string[];
  bag: string[];
}
