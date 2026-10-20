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
  /** Magia escolhida em cada slot, nível comprado no Grimório e quando: { "1": { id, rank, at } }. */
  spellsChosen: Record<number, { id: string; rank: number; at: number }>;
  casts: Record<string, number>;
  castFails: { noMana: number; noTarget: number };
  /** Dano efetivo causado (sem contar o que passa da vida do monstro), por fonte: "basic", id da magia ou "summon:<tipo>" (criaturas invocadas). */
  damageDealt: Record<string, number>;
  /** Dano recebido por tipo de monstro, depois da armadura e do Grito de Guerra. */
  damageTaken: Record<string, number>;
  /** Dano evitado pela armadura, pelo Grito de Guerra e pelo escudo. */
  damageMitigated: number;
  /** Vida curada (em si e nos aliados), incluindo roubo de vida e criaturas de cura. */
  healing: number;
  /** Abates (último golpe) por tipo de monstro. */
  kills: Record<string, number>;
  firstKillAt: number | null;
  xp: number;
  loot: { monsters: number; chests: number; bossBonus: number };
  chestsOpened: number;
  /** Itens que vieram do inventário, que pegou no chão e que perdeu ao morrer. */
  items: { loadout: string[]; picked: string[]; lost: string[] };
  /** Menor vida na hunt, em fração do máximo (sustos). */
  minHpPct: number;
  /** true se fechou o jogo ou caiu durante a hunt (conta como morte). */
  abandoned: boolean;
  death: { by: string; depth: number; x: number; y: number; at: number } | null;
}

export function newRunStats(): RunStats {
  return {
    levelAt: {}, depthAt: {}, spellsChosen: {}, casts: {}, castFails: { noMana: 0, noTarget: 0 },
    damageDealt: {}, damageTaken: {}, damageMitigated: 0, healing: 0, kills: {}, firstKillAt: null, xp: 0,
    loot: { monsters: 0, chests: 0, bossBonus: 0 }, chestsOpened: 0, items: { loadout: [], picked: [], lost: [] },
    minHpPct: 1, abandoned: false, death: null,
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
