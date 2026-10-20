import { Client, type Room } from "@colyseus/sdk";
import { LOBBY_ROOM_NAME, ROOM_NAME, type HuntMetadata, type JoinOptions } from "@kusa/shared";
// Só tipos: o cliente decodifica o estado por reflexão, sem carregar o código do servidor.
import type { Chest, DungeonState, GroundItem, Monster, Player, Summon } from "../../server/src/state.ts";

export type PlayerView = Player;
export type MonsterView = Monster;
export type ChestView = Chest;
export type GroundItemView = GroundItem;
export type SummonView = Summon;
export type DungeonRoom = Room<any, DungeonState>;

// Sem VITE_SERVER_URL, usa o proxy do Vite (vite.config.ts) no mesmo endereço da página.
const client = new Client(import.meta.env.VITE_SERVER_URL || `${location.origin}/colyseus`);

export function createHunt(options: JoinOptions): Promise<DungeonRoom> {
  return client.create(ROOM_NAME, options);
}

export function joinHunt(roomId: string, options: JoinOptions): Promise<DungeonRoom> {
  return client.joinById(roomId, options);
}

/** Uma hunt como aparece na lista de salas. */
export interface HuntListing {
  roomId: string;
  clients: number;
  maxClients: number;
  locked?: boolean;
  metadata?: HuntMetadata;
}

/**
 * Acompanha em tempo real as hunts que ainda aceitam jogadores (no lobby e com vaga).
 * Devolve a função que para de acompanhar.
 */
export async function watchHunts(onChange: (hunts: HuntListing[]) => void): Promise<() => void> {
  const lobby = await client.joinOrCreate(LOBBY_ROOM_NAME, { filter: { name: ROOM_NAME } });
  let all: HuntListing[] = [];
  const emit = () => onChange(all.filter((h) => !h.locked && h.clients < h.maxClients));
  lobby.onMessage("rooms", (rooms: HuntListing[]) => { all = rooms; emit(); });
  lobby.onMessage("+", ([roomId, room]: [string, HuntListing]) => {
    const i = all.findIndex((h) => h.roomId === roomId);
    if (i === -1) all.push(room); else all[i] = room;
    emit();
  });
  lobby.onMessage("-", (roomId: string) => { all = all.filter((h) => h.roomId !== roomId); emit(); });
  return () => void lobby.leave();
}
