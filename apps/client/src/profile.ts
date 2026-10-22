import { ITEMS, type ClassId, type TalentRanks } from "@kusa/shared";
import { supabase } from "./auth.ts";

// Dados do menu: árvore de magias, itens (equipamento, cofre e bag) e gold. O navegador só lê as tabelas;
// toda compra, venda e troca de equipamento é uma função security definer no banco.

/** Item da conta: equipado, no cofre ou na bag. */
export interface OwnedItem {
  /** Id da linha (cada cópia do item é uma linha). */
  id: string;
  /** Chave de `ITEMS` em `@kusa/shared`. */
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
  items: OwnedItem[];
}

/** Erro com mensagem pronta para mostrar ao jogador. */
export class ProfileError extends Error {}

export async function loadProfile(): Promise<Profile> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) throw new ProfileError("Sessão expirada. Entre de novo.");
  const [profile, talents, items] = await Promise.all([
    supabase.from("profiles").select("gold").eq("id", uid).single(),
    supabase.from("profile_talents").select("talent_id, rank"),
    supabase.from("profile_items").select("id, item_id, equipped, class_id, source, location").order("acquired_at", { ascending: false }),
  ]);
  if (!profile.data || !talents.data || !items.data) throw new ProfileError("Não foi possível carregar a conta.");
  return {
    gold: profile.data.gold,
    talents: Object.fromEntries(talents.data.map((t) => [t.talent_id, t.rank])),
    // Id fora do catálogo (banco e cliente em versões diferentes durante uma atualização): não aparece.
    items: items.data.filter((i) => ITEMS[i.item_id]).map((i) => ({ id: i.id, itemId: i.item_id, equipped: i.equipped, classId: i.class_id, source: i.source, location: i.location })),
  };
}

/** Compra o próximo nível de um nó da árvore; devolve o gold que sobrou. */
export function buyTalent(talentId: string): Promise<number> {
  return call("buy_talent", { p_talent_id: talentId });
}

/** Compra um item no mercado; devolve o gold que sobrou. */
export function buyItem(itemId: string): Promise<number> {
  return call("buy_item", { p_item_id: itemId });
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
const KNOWN_ERRORS = ["gold insuficiente", "pré-requisito não comprado", "já está no nível máximo", "item fora de venda", "item não está no inventário", "cofre cheio", "item está na bag", "item não está na bag", "classe não usa este item", "slot ocupado por outra classe"];

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const known = KNOWN_ERRORS.find((m) => error.message.includes(m));
    throw new ProfileError(known ? known[0].toUpperCase() + known.slice(1) + "." : "Não foi possível concluir agora.");
  }
  return data as T;
}
