import type { TalentRanks } from "@kusa/shared";
import { supabase } from "./auth.ts";

// Dados do menu: árvore de magias, inventário e gold. O navegador só lê as tabelas;
// toda compra, venda e troca de equipamento é uma função security definer no banco.

/** Item guardado no inventário da conta. */
export interface OwnedItem {
  /** Id da linha (cada cópia do item é uma linha). */
  id: string;
  /** Chave de `ITEMS` em `@kusa/shared`. */
  itemId: string;
  /** Vai para a próxima hunt. */
  equipped: boolean;
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
    supabase.from("profile_items").select("id, item_id, equipped, source").order("acquired_at", { ascending: false }),
  ]);
  if (!profile.data || !talents.data || !items.data) throw new ProfileError("Não foi possível carregar a conta.");
  return {
    gold: profile.data.gold,
    talents: Object.fromEntries(talents.data.map((t) => [t.talent_id, t.rank])),
    items: items.data.map((i) => ({ id: i.id, itemId: i.item_id, equipped: i.equipped, source: i.source })),
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

/** Equipa (o que estava no mesmo slot sai) ou desequipa um item para a próxima hunt. */
export async function equipItem(id: string, equipped: boolean): Promise<void> {
  await call("equip_item", { p_item: id, p_equipped: equipped });
}

/** Mensagens do banco (`raise exception`) que já servem para o jogador. */
const KNOWN_ERRORS = ["gold insuficiente", "pré-requisito não comprado", "já está no nível máximo", "item fora de venda", "item não está no inventário"];

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const known = KNOWN_ERRORS.find((m) => error.message.includes(m));
    throw new ProfileError(known ? known[0].toUpperCase() + known.slice(1) + "." : "Não foi possível concluir agora.");
  }
  return data as T;
}
