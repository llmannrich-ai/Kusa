import type { RunOutcome } from "@kusa/shared";
import { supabase } from "./supabase.ts";

/**
 * Telemetria de jogabilidade: números de cada jogador numa hunt, para balancear classes, magias,
 * monstros e economia. Vale também para convidados. Uma linha em `telemetry_runs` por jogador
 * por hunt; os tempos são segundos desde o início da hunt.
 */
export interface RunStats {
  /** Segundo em que alcançou cada nível. */
  levelAt: Record<number, number>;
  /** Segundo em que entrou pela primeira vez em cada sala do caminho (a do boss é a última). */
  depthAt: Record<number, number>;
  /** Traços das especializações escolhidas no Grimório (ids de TRAITS). */
  specs: string[];
  /** Magia escolhida em cada slot, nível comprado no Grimório e quando: { "1": { id, rank, at } }. */
  spellsChosen: Record<number, { id: string; rank: number; at: number }>;
  /** Melhorias escolhidas ao subir de nível, com as opções sorteadas, o nível e o segundo. */
  perksChosen: { id: string; offer: string[]; level: number; at: number }[];
  casts: Record<string, number>;
  castFails: { noMana: number; noTarget: number; noRoom: number };
  /** Golpes básicos que foram no monstro mais próximo porque o alvo travado estava fora do alcance. */
  basicRetargets: number;
  /** Dano efetivo causado (sem contar o que passa da vida do monstro), por fonte: "basic", id da magia ou "summon:<tipo>" (criaturas invocadas). */
  damageDealt: Record<string, number>;
  /** Dano recebido por tipo de monstro, depois da armadura e do Grito de Guerra. */
  damageTaken: Record<string, number>;
  /** Dano recebido das habilidades especiais dos mini-bosses e bosses (golpe + veneno/queimadura), por tipo de monstro (já somado em `damageTaken`). */
  specialDamage: Record<string, number>;
  /** Dano evitado pela armadura, pelo Grito de Guerra e pelo escudo. */
  damageMitigated: number;
  /** Vida curada (em si e nos aliados), incluindo roubo de vida (magias e Sede de sangue), criaturas de cura e poções de vida. */
  healing: number;
  /** Mana devolvida aos aliados (e a si) por magias e criaturas, sem contar poções. */
  manaGiven: number;
  /** Tempo de controle aplicado nos monstros, em ms somados por monstro: raízes, atordoamento e lentidão. */
  ccMs: { root: number; stun: number; slow: number };
  /** Poções guardadas e bebidas por tipo, e mana devolvida pelas poções de mana. */
  potions: { picked: Record<string, number>; drunk: Record<string, number>; manaRestored: number };
  /** Abates (último golpe) por tipo de monstro. */
  kills: Record<string, number>;
  firstKillAt: number | null;
  xp: number;
  loot: { monsters: number; chests: number; bossBonus: number };
  chestsOpened: number;
  /**
   * Itens equipados que vieram da conta, bag que entrou na hunt, itens que pegou no chão, que largou pelo menu
   * da bag, que perdeu ao morrer (equipamento e bag) e quantas vezes deixou item no chão por estar com a bag cheia.
   */
  items: { loadout: string[]; bag: string[]; picked: string[]; dropped: string[]; lost: string[]; bagFull: number };
  /** Menor vida na hunt, em fração do máximo (sustos). */
  minHpPct: number;
  /** true se fechou o jogo ou caiu durante a hunt (conta como morte). */
  abandoned: boolean;
  death: { by: string; depth: number; x: number; y: number; at: number } | null;
  /** Renascer da Semente: nomes de quem este jogador salvou com a semente. */
  revives: string[];
  /** Este jogador renasceu de uma semente: de quem, quando e quanto dano levou depois de renascer. */
  revived: { by: string; at: number; damageAfter: number } | null;
}

export function newRunStats(): RunStats {
  return {
    levelAt: {}, depthAt: {}, specs: [], spellsChosen: {}, perksChosen: [], casts: {}, castFails: { noMana: 0, noTarget: 0, noRoom: 0 }, basicRetargets: 0,
    damageDealt: {}, damageTaken: {}, specialDamage: {}, damageMitigated: 0, healing: 0, manaGiven: 0, ccMs: { root: 0, stun: 0, slow: 0 }, potions: { picked: {}, drunk: {}, manaRestored: 0 }, kills: {}, firstKillAt: null, xp: 0,
    loot: { monsters: 0, chests: 0, bossBonus: 0 }, chestsOpened: 0, items: { loadout: [], bag: [], picked: [], dropped: [], lost: [], bagFull: 0 },
    minHpPct: 1, abandoned: false, death: null, revives: [], revived: null,
  };
}

/** Soma `amount` na chave de um contador. */
export function bump(counter: Record<string, number>, key: string, amount = 1) {
  counter[key] = (counter[key] ?? 0) + amount;
}

export interface TelemetryRun {
  matchId: string;
  userId: string | null;
  name: string;
  classId: string;
  partySize: number;
  /** Mapa da hunt (id de `MAPS`): a seed sozinha não diz qual foi o mapa. */
  mapId: string;
  seed: number;
  outcome: RunOutcome;
  level: number;
  durationS: number;
  loot: number;
  /** Quantas salas tem o caminho até o boss (a sala do boss tem esse índice). */
  pathRooms: number;
  stats: RunStats;
}

/** Commit em produção (o Render preenche); permite comparar o antes e o depois de cada ajuste. */
const BUILD = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? process.env.KUSA_BUILD ?? "dev";

/** Grava a hunt do jogador. Sem Supabase, só escreve no console se KUSA_TELEMETRY_LOG=1. */
export async function recordTelemetry(run: TelemetryRun) {
  const row = {
    match_id: run.matchId,
    profile_id: run.userId,
    player_name: run.name,
    class_id: run.classId,
    party_size: run.partySize,
    map_id: run.mapId,
    seed: run.seed,
    build: BUILD,
    outcome: run.outcome,
    abandoned: run.stats.abandoned,
    level: run.level,
    duration_s: Math.round(run.durationS * 10) / 10,
    loot: run.loot,
    max_depth: Math.max(-1, ...Object.keys(run.stats.depthAt).map(Number)),
    path_rooms: run.pathRooms,
    killed_by: run.stats.death?.by ?? null,
    stats: run.stats,
  };
  if (process.env.KUSA_TELEMETRY_LOG === "1") console.log("[telemetria]", JSON.stringify(row));
  if (!supabase) return;
  const { error } = await supabase.from("telemetry_runs").insert(row);
  if (error) console.error("Falha ao gravar telemetria", error);
}
