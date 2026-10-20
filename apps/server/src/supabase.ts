import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RunOutcome } from "@kusa/shared";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente com service role: só o servidor de jogo grava resultados e gold,
 * para o jogador não conseguir forjar loot pelo navegador.
 * Sem as variáveis de ambiente, o servidor roda em modo convidado (nada é salvo).
 */
export const supabase: SupabaseClient | null =
  url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

if (!supabase) console.warn("⚠️  SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes: modo convidado, resultados não serão salvos.");

/** Valida o JWT do jogador e devolve o id do usuário, ou null se for convidado. */
export async function resolveUserId(accessToken?: string): Promise<string | null> {
  if (!supabase || !accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Sessão inválida");
  return data.user.id;
}

export interface RunResult {
  userId: string;
  classId: string;
  outcome: RunOutcome;
  level: number;
  loot: number;
}

/** Grava o resultado da hunt e credita o gold (função `finish_run` no banco). */
export async function recordRun(matchId: string, result: RunResult) {
  if (!supabase) return;
  const { error } = await supabase.rpc("finish_run", {
    p_match_id: matchId,
    p_profile_id: result.userId,
    p_class_id: result.classId,
    p_outcome: result.outcome,
    p_level: result.level,
    p_loot: result.loot,
  });
  if (error) console.error("Falha ao salvar resultado da hunt", error);
}
