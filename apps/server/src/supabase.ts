import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RunOutcome, SpellXp, TalentRanks } from "@kusa/shared";

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
  /** XP de uso de cada magia (id do nó → XP), que dá o nível dela. */
  spellXp: SpellXp;
}

/** Valida o JWT do jogador e devolve a conta, ou null se for convidado. */
export async function resolveAccount(accessToken?: string): Promise<Account | null> {
  if (!supabase || !accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Sessão inválida");
  const [{ data: profile }, { data: talents }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", data.user.id).single(),
    supabase.from("profile_talents").select("talent_id, rank, xp").eq("profile_id", data.user.id),
  ]);
  return {
    userId: data.user.id,
    name: profile?.username ?? data.user.user_metadata.username ?? "Aventureiro",
    talents: Object.fromEntries((talents ?? []).map((t) => [t.talent_id, t.rank])),
    spellXp: Object.fromEntries((talents ?? []).filter((t) => t.xp > 0).map((t) => [t.talent_id, t.xp])),
  };
}

/**
 * A hunt começou: tira do inventário o equipamento da classe escolhida e devolve os ids (`take_loadout`).
 * Cada classe tem os próprios slots; o equipamento das outras fica na conta.
 */
export async function takeLoadout(userId: string, classId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("take_loadout", { p_profile_id: userId, p_class_id: classId });
  if (error) {
    console.error("Falha ao retirar o equipamento do inventário", error);
    return [];
  }
  return (data ?? []) as string[];
}

/** A hunt começou: a bag da conta entra na dungeon com o jogador (`take_bag`). */
export async function takeBag(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("take_bag", { p_profile_id: userId });
  if (error) {
    console.error("Falha ao retirar a bag da conta", error);
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
  /** Itens equipados ao sair; voltam equipados para a conta (na morte, já sem o item perdido). */
  items: string[];
  /** Itens da bag ao sair; vão para o cofre de quem sai vivo (o que não couber fica na bag). */
  bag: string[];
  /** XP de uso ganho por magia escolhida na hunt (id do nó → XP, 0 se não lançou); a morte tira um pouco no banco. */
  spellXp: Record<string, number>;
}

/** Grava o resultado da hunt, credita o gold, devolve equipamento e bag e soma o XP das magias (`finish_run`, `record_spell_xp` e `store_bag`). */
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
  if (error) {
    console.error("Falha ao salvar resultado da hunt", error);
    return;
  }
  // O nível das magias pelo uso (a morte tira um pouco do XP das magias da hunt).
  const { error: xpError } = await supabase.rpc("record_spell_xp", {
    p_profile_id: result.userId,
    p_class_id: result.classId,
    p_outcome: result.outcome,
    p_spell_xp: result.spellXp,
  });
  if (xpError) console.error("Falha ao gravar o XP das magias", xpError);
  // A bag de quem sai vivo vai para o cofre (o que não couber fica na bag).
  if (result.bag.length === 0) return;
  const { error: bagError } = await supabase.rpc("store_bag", { p_profile_id: result.userId, p_bag: result.bag });
  if (bagError) console.error("Falha ao guardar a bag no cofre", bagError);
}
