import { LobbyRoom, defineRoom, defineServer, listen } from "colyseus";
import { LOBBY_ROOM_NAME, ROOM_NAME } from "@kusa/shared";
import { DungeonRoom } from "./DungeonRoom.ts";

const server = defineServer({
  rooms: {
    [LOBBY_ROOM_NAME]: defineRoom(LobbyRoom),
    // Toda hunt aparece no lobby; por ora qualquer um entra (testes entre amigos).
    [ROOM_NAME]: defineRoom(DungeonRoom).enableRealtimeListing(),
  },
});

await listen(server, Number(process.env.PORT ?? 2567));
