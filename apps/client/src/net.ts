import { Client, type Room } from "@colyseus/sdk";
import { LOBBY_ROOM_NAME, ROOM_NAME, type HuntMetadata, type JoinOptions } from "@kusa/shared";
// Só tipos: o cliente decodifica o estado por reflexão, sem carregar o código do servidor.
import type { Chest, DungeonState, Field, GroundItem, Monster, Player, Summon } from "../../server/src/state.ts";

export type PlayerView = Player;
export type MonsterView = Monster;
export type ChestView = Chest;
export type GroundItemView = GroundItem;
export type SummonView = Summon;
export type FieldView = Field;
export type DungeonRoom = Room<any, DungeonState>;

// Sem VITE_SERVER_URL, usa o proxy do Vite (vite.config.ts) no mesmo endereço da página.
const client = new Client(import.meta.env.VITE_SERVER_URL || `${location.origin}/colyseus`);

/**
 * O servidor não guarda a vaga de quem cai (não há `allowReconnection`). Sem isto, o SDK passava até
 * 1 min tentando voltar a uma sala que já tinha tirado o jogador, com a tela parada nesse tempo.
 */
function noReconnect<T extends Room<any, any>>(room: T): T {
  room.reconnection.enabled = false;
  return room;
}

export async function createHunt(options: JoinOptions): Promise<DungeonRoom> {
  return noReconnect(await client.create(ROOM_NAME, options));
}

export async function joinHunt(roomId: string, options: JoinOptions): Promise<DungeonRoom> {
  return noReconnect(await client.joinById(roomId, options));
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
 *
 * No celular a conexão cai à toa (troca de rede, app em segundo plano). Antes, a lista congelava
 * ("Nenhuma sala aberta") e o amigo nunca via a sala nova; agora ela reconecta sozinha e, ao voltar
 * para o jogo, recomeça do zero.
 */
export async function watchHunts(onChange: (hunts: HuntListing[]) => void): Promise<() => void> {
  let lobby: Room | null = null;
  let stopped = false;
  let retry = 0;

  const connect = async () => {
    const room = noReconnect(await client.joinOrCreate(LOBBY_ROOM_NAME, { filter: { name: ROOM_NAME } }));
    if (stopped) return void room.leave();
    lobby = room;
    let all: HuntListing[] = [];
    const emit = () => onChange(all.filter((h) => !h.locked && h.clients < h.maxClients));
    room.onMessage("rooms", (rooms: HuntListing[]) => { all = rooms; emit(); });
    room.onMessage("+", ([roomId, listing]: [string, HuntListing]) => {
      const i = all.findIndex((h) => h.roomId === roomId);
      if (i === -1) all.push(listing); else all[i] = listing;
      emit();
    });
    room.onMessage("-", (roomId: string) => { all = all.filter((h) => h.roomId !== roomId); emit(); });
    room.onLeave(() => {
      if (lobby !== room) return;
      lobby = null;
      reconnectSoon();
    });
  };

  const reconnectSoon = (delay = 2000) => {
    if (stopped) return;
    window.clearTimeout(retry);
    retry = window.setTimeout(() => connect().catch(() => reconnectSoon(5000)), delay);
  };

  // Voltou ao app: a conexão pode estar morta sem ter avisado. Troca por uma nova.
  const onVisible = () => {
    if (document.visibilityState !== "visible" || stopped) return;
    const old = lobby;
    lobby = null;
    void old?.leave(false);
    reconnectSoon(0);
  };
  document.addEventListener("visibilitychange", onVisible);

  await connect();
  return () => {
    stopped = true;
    window.clearTimeout(retry);
    document.removeEventListener("visibilitychange", onVisible);
    void lobby?.leave();
    lobby = null;
  };
}
