import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RunOutcome, TalentRanks } from "@kusa/shared";

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

/** Jogador identificado pelo token; `name` é o nome de login do perfil. */
export interface Account {
  userId: string;
  name: string;
  /** Árvore de magias comprada (todas as classes). */
  talents: TalentRanks;
}

/** Valida o JWT do jogador e devolve a conta, ou null se for convidado. */
export async function resolveAccount(accessToken?: string): Promise<Account | null> {
  if (!supabase || !accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Sessão inválida");
  const [{ data: profile }, { data: talents }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", data.user.id).single(),
    supabase.from("profile_talents").select("talent_id, rank").eq("profile_id", data.user.id),
  ]);
  return {
    userId: data.user.id,
    name: profile?.username ?? data.user.user_metadata.username ?? "Aventureiro",
    talents: Object.fromEntries((talents ?? []).map((t) => [t.talent_id, t.rank])),
  };
}

/** A hunt começou: tira do inventário os itens equipados no menu e devolve os ids (`take_loadout`). */
export async function takeLoadout(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("take_loadout", { p_profile_id: userId });
  if (error) {
    console.error("Falha ao retirar o equipamento do inventário", error);
    return [];
  }
  return (data ?? []) as string[];
}

export interface RunResult {
  userId: string;
  classId: string;
  outcome: RunOutcome;
  level: number;
  loot: number;
  /** Itens equipados ao sair; voltam para o inventário de quem sai vivo. */
  items: string[];
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
    p_items: result.items,
  });
  if (error) console.error("Falha ao salvar resultado da hunt", error);
}
