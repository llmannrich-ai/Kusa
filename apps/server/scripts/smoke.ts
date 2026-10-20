/**
 * Teste de fumaça contra um servidor rodando (npm run dev:server):
 * dois jogadores entram na mesma hunt, o líder inicia e ambos fogem pelo portal.
 * Uso: npx tsx apps/server/scripts/smoke.ts [url]
 */
import { Client } from "@colyseus/sdk";
import { MSG, ROOM_NAME, type RunEndedMessage } from "@kusa/shared";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

const leader = await client.create<any>(ROOM_NAME, { name: "Lider", classId: "knight" });
const friend = await client.joinById<any>(leader.roomId, { name: "Amigo", classId: "druid" });

// Eventos de combate não importam aqui.
for (const room of [leader, friend]) {
  room.onMessage(MSG.damage, () => {});
  room.onMessage(MSG.notice, () => {});
}

const ended = (room: typeof leader) =>
  new Promise<RunEndedMessage>((resolve) => room.onMessage(MSG.runEnded, resolve));
const results = Promise.all([ended(leader), ended(friend)]);

await wait(300);
leader.send(MSG.start);
await wait(300);
if (leader.state.phase !== "running") throw new Error(`fase esperada running, veio ${leader.state.phase}`);

// Os jogadores nascem nas diagonais do portal: um passo diagonal leva até ele.
leader.send(MSG.move, { dx: 1, dy: 1 });
friend.send(MSG.move, { dx: -1, dy: 1 });

const [a, b] = await Promise.race([results, wait(3000).then(() => { throw new Error("timeout"); })]);
console.log("líder:", a, "amigo:", b);
if (a.outcome !== "escaped" || b.outcome !== "escaped") throw new Error("esperava fuga pelo portal");
console.log("SMOKE OK");
process.exit(0);

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
