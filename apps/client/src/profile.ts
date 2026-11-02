import { ITEMS, MAP_IDS, POTION_MAX, isRune, potionStock, type ClassId, type MapId, type PotionId, type PotionStock, type SpellXp, type TalentRanks } from "@kusa/shared";
import { supabase } from "./auth.ts";

// Dados do menu: árvore de magias, itens (equipamento, cofre e bag) e gold. O navegador só lê as tabelas;
// toda compra, venda e troca de equipamento é uma função security definer no banco.

/** Item da conta: equipado, no cofre ou na bag. */
export interface OwnedItem {
  /** Id da linha (cada cópia do item é uma linha). */
  id: string;
  /** Chave de `ITEMS` ou de `RUNES` em `@kusa/shared`. */
  itemId: string;
  /** Vai para a próxima hunt vestido (não ocupa o cofre). */
  equipped: boolean;
  /** Classe que veste o item (cada classe tem os próprios slots); `null` fora do equipamento. */
  classId: ClassId | null;
  /** Cofre (até `VAULT_SIZE`, só no menu) ou bag (até `BAG_SIZE`, entra na hunt e se perde ao morrer). */
  location: "vault" | "bag";
  source: "hunt" | "market";
}

export interface Profile {
  gold: number;
  talents: TalentRanks;
  /** XP de uso de cada magia (o nível sobe nas hunts; o navegador só lê). */
  spellXp: SpellXp;
  /** Magias ativadas no Grimório (ids de nó, todas as classes): até 3 por slot vão para a hunt. */
  activeSpells: string[];
  items: OwnedItem[];
  /** Bosses vencidos por qualquer personagem da conta: abrem as classes trancadas (`classUnlocked`). */
  bossClears: string[];
  /** Poções compradas no Mercado, por personagem (classe → contagem de cada poção); entram em toda hunt. */
  potions: Partial<Record<ClassId, PotionStock>>;
}

/** Erro com mensagem pronta para mostrar ao jogador. */
export class ProfileError extends Error {}

/**
 * Cenários vencidos (boss morto) e bosses vencidos, por classe: abrem o seguinte da campanha (`mapUnlocked`; os bosses
 * contam nos lados das bifurcações). Sem conexão, `null`.
 */
export async function loadMapClears(): Promise<Partial<Record<ClassId, string[]>> | null> {
  const [maps, bosses] = await Promise.all([
    supabase.from("profile_map_clears").select("class_id, map_id"),
    supabase.from("profile_boss_clears").select("class_id, boss_kind"),
  ]);
  // Sem resposta do banco: `null`, para quem chama manter a campanha que já tinha (e o cenário salvo).
  if (maps.error || bosses.error) return null;
  const out: Partial<Record<ClassId, string[]>> = {};
  for (const row of maps.data ?? []) {
    if (!MAP_IDS.includes(row.map_id as MapId)) continue;
    (out[row.class_id as ClassId] ??= []).push(row.map_id as string);
  }
  for (const row of bosses.data ?? []) (out[row.class_id as ClassId] ??= []).push(row.boss_kind as string);
  return out;
}

/**
 * Mapa descoberto do personagem num terreno de caça (`profile_map_memory`): o bitset dos tiles vistos em hunts
 * anteriores, em base64, preso ao hash da planta. Sem conta, sem linha ou planta diferente: null.
 */
export async function loadMapMemory(classId: ClassId, mapId: MapId, layout: string): Promise<string | null> {
  const { data, error } = await supabase.from("profile_map_memory").select("layout, explored").eq("class_id", classId).eq("map_id", mapId).maybeSingle();
  if (error || !data || data.layout !== layout) return null;
  return typeof data.explored === "string" ? data.explored : null;
}

/** Grava o mapa descoberto (já mesclado com o que o jogador viu nesta hunt). Sem conta, o banco recusa e nada acontece. */
export async function saveMapMemory(classId: ClassId, mapId: MapId, layout: string, explored: string): Promise<void> {
  const { error } = await supabase.rpc("save_map_memory", { p_class_id: classId, p_map_id: mapId, p_layout: layout, p_explored: explored });
  if (error) console.error("Falha ao guardar o mapa descoberto", error);
}

/** Bosses vencidos por qualquer personagem da conta (abrem as classes trancadas). Sem conexão, nenhum. */
export async function loadBossClears(): Promise<string[]> {
  const { data } = await supabase.from("profile_boss_clears").select("boss_kind");
  return [...new Set((data ?? []).map((b) => b.boss_kind as string))];
}

/** Hunt solo ou sala no aparelho: o boss morreu com este jogador na hunt (anota o cenário e o boss pela hunt aberta). */
export async function recordSoloMapClear(runId: string | null, boss: string) {
  if (!runId) return;
  const [map, kill] = await Promise.all([
    supabase.rpc("record_solo_map_clear", { p_run_id: runId }),
    supabase.rpc("record_solo_boss_clear", { p_run_id: runId, p_boss: boss }),
  ]);
  if (map.error || kill.error) console.error("Falha ao anotar o cenário vencido", map.error ?? kill.error);
}

export async function loadProfile(): Promise<Profile> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new ProfileError("Sessão expirada. Entre de novo.");
  const [profile, talents, items, bosses, potions] = await Promise.all([
    supabase.from("profiles").select("gold, active_spells").eq("id", uid).single(),
    supabase.from("profile_talents").select("talent_id, rank, xp"),
    supabase.from("profile_items").select("id, item_id, equipped, class_id, source, location").order("acquired_at", { ascending: false }),
    supabase.from("profile_boss_clears").select("boss_kind"),
    supabase.from("profile_potions").select("class_id, potion_id, qty"),
  ]);
  const stock: Partial<Record<ClassId, PotionStock>> = {};
  for (const row of potions.data ?? []) {
    const classId = row.class_id as ClassId;
    (stock[classId] ??= potionStock(null))[row.potion_id as PotionId] = Math.max(0, Math.min(POTION_MAX, Number(row.qty) || 0));
  }
  if (!profile.data || !talents.data || !items.data) throw new ProfileError("Não foi possível carregar a conta.");
  return {
    gold: profile.data.gold,
    talents: Object.fromEntries(talents.data.map((t) => [t.talent_id, t.rank])),
    spellXp: Object.fromEntries(talents.data.filter((t) => t.xp > 0).map((t) => [t.talent_id, t.xp])),
    activeSpells: profile.data.active_spells ?? [],
    // Id fora do catálogo (banco e cliente em versões diferentes durante uma atualização): não aparece.
    items: items.data.filter((i) => ITEMS[i.item_id] || isRune(i.item_id)).map((i) => ({ id: i.id, itemId: i.item_id, equipped: i.equipped, classId: i.class_id, source: i.source, location: i.location })),
    bossClears: [...new Set((bosses.data ?? []).map((b) => b.boss_kind as string))],
    potions: stock,
  };
}

/** Compra uma magia, uma áurea (próximo nível) ou um Traço; devolve o gold que sobrou. */
export function buyTalent(talentId: string): Promise<number> {
  return call("buy_talent", { p_talent_id: talentId });
}

/** Compra vários níveis de uma vez (Dom, áurea ou Tomo, até 5); devolve o gold que sobrou. */
export function buyTalentLevels(talentId: string, count: number): Promise<number> {
  return call("buy_talent_levels", { p_talent_id: talentId, p_count: count });
}

/** Grava as magias ativadas no Grimório (a lista inteira, de todas as classes; ver `toggleActiveSpell`). */
export async function setActiveSpells(spells: string[]): Promise<void> {
  await call("set_active_spells", { p_spells: spells });
}

/** Compra um item no mercado; devolve o gold que sobrou. */
export function buyItem(itemId: string): Promise<number> {
  return call("buy_item", { p_item_id: itemId });
}

/** Compra poções no Mercado para o personagem (até `POTION_MAX` de cada na conta); devolve o gold que sobrou. */
export function buyPotion(classId: ClassId, potionId: PotionId, count = 1): Promise<number> {
  return call("buy_potion", { p_class_id: classId, p_potion_id: potionId, p_count: count });
}

/** Hunt solo ou sala no aparelho: leva as poções do personagem para a hunt aberta no banco. Sem conexão, nenhuma. */
export async function takeMyPotions(runId: string | null): Promise<PotionStock> {
  if (!runId) return potionStock(null);
  const { data, error } = await supabase.rpc("take_my_potions", { p_run_id: runId });
  if (error) {
    console.error("Falha ao levar as poções para a hunt", error);
    return potionStock(null);
  }
  return potionStock(data);
}

/** Hunt solo ou sala no aparelho: devolve à conta as poções que sobraram (só depois de o banco fechar a hunt). */
export async function storeMyPotions(runId: string, potions: PotionStock): Promise<void> {
  if (!Object.values(potions).some((n) => n > 0)) return;
  const { error } = await supabase.rpc("store_my_potions", { p_run_id: runId, p_potions: potions });
  if (error) console.error("Falha ao devolver as poções à conta", error);
}

/** Vende uma cópia do inventário; devolve o gold novo. */
export function sellItem(id: string): Promise<number> {
  return call("sell_item", { p_item: id });
}

/**
 * Equipa um item na classe (o que estava no mesmo slot dela volta para o cofre; um item vestido por outra
 * classe passa para esta) ou desequipa um item para a próxima hunt.
 */
export async function equipItem(id: string, equipped: boolean, classId: ClassId): Promise<void> {
  await call("equip_item", { p_item: id, p_equipped: equipped, p_class_id: classId });
}

/** Tira um item da bag e guarda no cofre. */
export async function storeItem(id: string): Promise<void> {
  await call("store_item", { p_item: id });
}

/** Mensagens do banco (`raise exception`) que já servem para o jogador. */
const KNOWN_ERRORS = ["gold insuficiente", "pré-requisito não comprado", "já está no nível máximo", "magia já aprendida", "item fora de venda", "sem lugar para mais", "quantidade inválida", "item não está no inventário", "cofre cheio", "item está na bag", "item não está na bag", "classe não usa este item", "slot ocupado por outra classe", "magias ativas demais", "runa igual já equipada", "slots de runa cheios"];

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const known = KNOWN_ERRORS.find((m) => error.message.includes(m));
    throw new ProfileError(known ? known[0].toUpperCase() + known.slice(1) + "." : "Não foi possível concluir agora.");
  }
  return data as T;
}
