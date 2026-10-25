import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MapId, RunOutcome, SpellXp, TalentRanks } from "@kusa/shared";

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
  /** Magias ativadas no Grimório (ids de nó): até 3 por slot vão para a hunt. */
  activeSpells: string[];
}

/** Valida o JWT do jogador e devolve a conta, ou null se for convidado. */
export async function resolveAccount(accessToken?: string): Promise<Account | null> {
  if (!supabase || !accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Sessão inválida");
  const [{ data: profile }, { data: talents }] = await Promise.all([
    supabase.from("profiles").select("username, active_spells").eq("id", data.user.id).single(),
    supabase.from("profile_talents").select("talent_id, rank, xp").eq("profile_id", data.user.id),
  ]);
  return {
    userId: data.user.id,
    name: profile?.username ?? data.user.user_metadata.username ?? "Aventureiro",
    talents: Object.fromEntries((talents ?? []).map((t) => [t.talent_id, t.rank])),
    spellXp: Object.fromEntries((talents ?? []).filter((t) => t.xp > 0).map((t) => [t.talent_id, t.xp])),
    activeSpells: profile?.active_spells ?? [],
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

/** Cenários cujo boss este personagem (conta e classe) já venceu: abrem o seguinte da campanha (`mapUnlocked`). */
export async function mapClears(userId: string, classId: string): Promise<MapId[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("profile_map_clears").select("map_id").eq("profile_id", userId).eq("class_id", classId);
  if (error) {
    console.error("Falha ao ler os cenários vencidos", error);
    return [];
  }
  return (data ?? []).map((r) => r.map_id as MapId);
}

/** O personagem venceu o boss do cenário (`record_map_clear`): abre o seguinte da campanha. */
export async function recordMapClear(userId: string, classId: string, mapId: MapId) {
  if (!supabase) return;
  const { error } = await supabase.rpc("record_map_clear", { p_profile_id: userId, p_class_id: classId, p_map_id: mapId });
  if (error) console.error("Falha ao anotar o cenário vencido", error);
}

/** Bosses cuja runa este personagem (conta e classe) já levou: na hunt, eles não dão outra. */
export async function takenBossRunes(userId: string, classId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("profile_boss_runes").select("boss_kind").eq("profile_id", userId).eq("class_id", classId);
  if (error) {
    console.error("Falha ao ler as runas de boss já levadas", error);
    return [];
  }
  return (data ?? []).map((r) => r.boss_kind as string);
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
  /** Bosses que deram a runa nesta hunt (cada boss dá a runa uma vez por personagem). */
  bossRunes: string[];
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
  // Os bosses que já deram a runa a este personagem não dão outra (vale mesmo se ele morreu depois).
  if (result.bossRunes.length > 0) {
    const { error: runeError } = await supabase.rpc("record_boss_runes", {
      p_profile_id: result.userId,
      p_class_id: result.classId,
      p_bosses: result.bossRunes,
    });
    if (runeError) console.error("Falha ao anotar as runas de boss", runeError);
  }
  // A bag de quem sai vivo vai para o cofre (o que não couber fica na bag).
  await storeBag(result.userId, result.bag);
}

/**
 * Guarda itens no cofre da conta; o que não couber fica na bag (`store_bag`). Também devolve o equipamento
 * e a bag que só saíram da conta depois que a hunt do jogador já tinha acabado: eles nem chegaram ao corpo.
 */
export async function storeBag(userId: string, items: string[]) {
  if (!supabase || items.length === 0) return;
  const { error } = await supabase.rpc("store_bag", { p_profile_id: userId, p_bag: items });
  if (error) console.error("Falha ao guardar itens no cofre", items, error);
}
