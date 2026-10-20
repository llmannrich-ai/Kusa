import { Client, type Room } from "@colyseus/sdk";
import { ROOM_NAME, type JoinOptions } from "@kusa/shared";
// Só tipos: o cliente decodifica o estado por reflexão, sem carregar o código do servidor.
import type { DungeonState, Player } from "../../server/src/state.ts";

export type PlayerView = Player;
export type DungeonRoom = Room<any, DungeonState>;

const client = new Client(import.meta.env.VITE_SERVER_URL ?? "http://localhost:2567");

export function createHunt(options: JoinOptions): Promise<DungeonRoom> {
  return client.create(ROOM_NAME, options);
}

export function joinHunt(code: string, options: JoinOptions): Promise<DungeonRoom> {
  return client.joinById(code.trim(), options);
}
