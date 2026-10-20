import { defineRoom, defineServer, listen } from "colyseus";
import { ROOM_NAME } from "@kusa/shared";
import { DungeonRoom } from "./DungeonRoom.ts";

const server = defineServer({
  rooms: {
    [ROOM_NAME]: defineRoom(DungeonRoom),
  },
});

await listen(server, Number(process.env.PORT ?? 2567));
