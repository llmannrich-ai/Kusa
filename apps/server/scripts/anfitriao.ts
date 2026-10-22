/**
 * Teste da sala hospedada por um jogador, sem servidor: a troca de anfitrião no meio da hunt.
 * Dois heróis caçam numa `Hunt`; o retrato (estado em JSON + `exportInternals`) passa por JSON, como pela
 * rede, e outra `Hunt` continua dali. Confere que heróis, monstros e baús batem, que a hunt segue rodando
 * (o cavaleiro ainda mata e foge) e que o estado restaurado ainda vai pelo encoder do schema.
 * Uso: npx tsx apps/server/scripts/anfitriao.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { Decoder, Encoder, Reflection } from "@colyseus/schema";
import { generateDungeon, type RunEndedMessage } from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { nextStep } from "../src/pathfinding.ts";
import { stateFromJSON } from "../src/snapshot.ts";
import { DungeonState } from "../src/state.ts";

let clock = 0;
const timers: { at: number; fn: () => void }[] = [];
const results: RunEndedMessage[] = [];
const host: HuntHost = {
  now: () => clock,
  setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
  send: () => {},
  broadcast: () => {},
  runEnded: (_id, result) => void results.push(result),
  ended: () => {},
};

/** Avança o relógio da hunt em ticks de 50 ms, disparando os timers vencidos. */
function advance(hunt: Hunt, ms: number) {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    for (const timer of timers.filter((x) => x.at <= clock)) {
      timers.splice(timers.indexOf(timer), 1);
      timer.fn();
    }
    hunt.tick(50);
  }
}

const recruit = { talents: {}, spellXp: {} };
const first = new Hunt(new DungeonState(), host, { mapId: "crypt", seed: 4242, startLevel: 8 });
first.join("a", { ...recruit, name: "Anfitrião", classId: "sorcerer" });
first.join("b", { ...recruit, name: "Cavaleiro", classId: "knight" });
if (!first.start("a")) throw new Error("a hunt não começou");
first.equip("b", []);

// Caça um pouco: o cavaleiro anda e ataca, para ter monstros feridos, alvos e cérebros com estado.
for (let i = 0; i < 40; i++) {
  first.move("b", { dx: (i % 3) - 1, dy: i % 2 ? 1 : -1 });
  first.attacking("b", { on: true });
  advance(first, 100);
}

// O retrato atravessa JSON, como pela rede.
const snapshot = JSON.parse(JSON.stringify({ state: first.state.toJSON(), hunt: first.exportInternals() }));
const restoredState = stateFromJSON(snapshot.state);
const second = new Hunt(restoredState, host, { mapId: restoredState.mapId as "crypt", seed: restoredState.seed, restore: snapshot.hunt });

const before = first.state.toJSON() as Record<string, Record<string, unknown>>;
const after = second.state.toJSON() as Record<string, Record<string, unknown>>;
for (const key of ["players", "monsters", "chests", "items", "summons", "fields"]) {
  if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`${key} mudou na troca de anfitrião`);
}
for (const key of ["phase", "mapId", "seed", "timeLeft", "leaderId", "bossDefeated"]) {
  if (before[key] !== after[key]) throw new Error(`${key} mudou: ${before[key]} → ${after[key]}`);
}
console.log(`retrato: ${JSON.stringify(snapshot).length} bytes, ${second.state.monsters.size} monstros, ${second.state.players.size} heróis`);

// O estado restaurado continua sincronizável: handshake + estado cheio + patches num decoder novo.
const encoder = new Encoder(second.state);
const decoder: Decoder<any> = Reflection.decode(Reflection.encode(encoder));
decoder.decode(encoder.encodeAll());
encoder.discardChanges();

// O anfitrião (feiticeiro) sai: conta como morte; o cavaleiro segue caçando na hunt restaurada.
second.leave("a");
if (results.pop()?.outcome !== "died") throw new Error("o anfitrião que saiu devia contar como morte");
const monstersBefore = second.state.monsters.size;
const dungeon = generateDungeon(second.state.seed, "crypt");
for (let i = 0; i < 400 && second.state.monsters.size === monstersBefore && second.state.players.get("b")!.status === "playing"; i++) {
  const knight = second.state.players.get("b")!;
  let near: { x: number; y: number } | undefined;
  let best = Infinity;
  second.state.monsters.forEach((m) => {
    const d = Math.max(Math.abs(m.x - knight.x), Math.abs(m.y - knight.y));
    if (d < best) { best = d; near = m; }
  });
  // Anda pelo caminho até o monstro mais próximo (em linha reta ficaria preso na parede).
  const step = near && best > 1 ? nextStep(dungeon, knight, near, 1, () => false) : null;
  if (step) second.move("b", { dx: (step.x - knight.x) as -1, dy: (step.y - knight.y) as -1 });
  second.attacking("b", { on: true });
  advance(second, 250);
  const patch = encoder.encode();
  if (patch.length > 0) decoder.decode(patch);
  encoder.discardChanges();
}
const decoded = decoder.state.players.get("b");
const knight = second.state.players.get("b")!;
if (!decoded || decoded.hp !== knight.hp || decoded.x !== knight.x) throw new Error("o decoder não acompanhou a hunt restaurada");
console.log(`depois da troca: ${monstersBefore - second.state.monsters.size} monstro(s) a menos, cavaleiro em ${knight.x},${knight.y} com ${knight.hp} de vida`);
if (second.state.monsters.size === monstersBefore && knight.status === "playing") throw new Error("ninguém morreu na hunt restaurada: ela parou?");
if (second.state.phase !== "running" && knight.status === "playing") throw new Error("a hunt restaurada parou");

console.log("ANFITRIAO OK");
process.exit(0);
