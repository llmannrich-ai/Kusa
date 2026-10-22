import type { RunOutcome } from "@kusa/shared";
import { supabase } from "./supabase.ts";
import type { RunStats } from "./runStats.ts";

/**
 * Telemetria de jogabilidade: números de cada jogador numa hunt, para balancear classes, magias,
 * monstros e economia. Vale também para convidados. Uma linha em `telemetry_runs` por jogador
 * por hunt; os tempos são segundos desde o início da hunt.
 */
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
