import { ArraySchema, MapSchema } from "@colyseus/schema";
import { Chest, DungeonState, Field, GroundItem, Monster, Player, Summon } from "./state.ts";

// Retrato de uma hunt para outro aparelho continuar a simulação (sala hospedada por um jogador, quando o
// anfitrião sai): o estado sincronizado em JSON e o interno da `Hunt` com Map e Set marcados.

/** Valor pronto para JSON: Map vira { $map: [[chave, valor]] } e Set vira { $set: [...] }. */
export function toPlain(value: unknown): unknown {
  if (value instanceof Map) return { $map: [...value].map(([k, v]) => [k, toPlain(v)]) };
  if (value instanceof Set) return { $set: [...value].map(toPlain) };
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toPlain(v)]));
  }
  return value;
}

/** Desfaz `toPlain`. */
export function fromPlain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fromPlain);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.$map)) return new Map((obj.$map as [unknown, unknown][]).map(([k, v]) => [k, fromPlain(v)]));
    if (Array.isArray(obj.$set)) return new Set((obj.$set as unknown[]).map(fromPlain));
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fromPlain(v)]));
  }
  return value;
}

const COLLECTIONS = { players: Player, monsters: Monster, chests: Chest, items: GroundItem, summons: Summon, fields: Field };

/** Recria o estado sincronizado a partir de `state.toJSON()`. */
export function stateFromJSON(json: Record<string, unknown>): DungeonState {
  const state = new DungeonState();
  for (const [key, value] of Object.entries(json)) {
    const Kind = COLLECTIONS[key as keyof typeof COLLECTIONS];
    if (Kind) {
      const map = (state as unknown as Record<string, MapSchema>)[key];
      for (const [id, entry] of Object.entries(value as Record<string, Record<string, unknown>>)) map.set(id, fill(new Kind(), entry));
    } else {
      (state as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return state;
}

/** Copia os campos de `json` para a instância do schema, respeitando listas e mapas aninhados. */
function fill<T extends object>(target: T, json: Record<string, unknown>): T {
  const fields = target as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(json)) {
    const current = fields[key];
    if (current instanceof ArraySchema) current.push(...(value as unknown[]));
    else if (current instanceof MapSchema) for (const [k, v] of Object.entries(value as Record<string, unknown>)) current.set(k, v);
    else fields[key] = value;
  }
  return target;
}
