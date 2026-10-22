/**
 * Ajudantes dos testes de fumaça que jogam uma hunt de verdade (grimorio, efeitos): entrar numa sala já no
 * nível 8, andar até os monstros e esperar uma condição. Não é um teste: não entra na lista do `all.ts`.
 */
import type { Client } from "@colyseus/sdk";
import {
  MSG, ROOM_NAME, RULES_VERSION, generateDungeon, hasLineOfSight, tileDistance,
  type ChainMessage, type CooldownMessage, type DamageMessage, type SpellMessage,
} from "@kusa/shared";
import { nextStep } from "../src/pathfinding.ts";

/** Cria uma sala com um herói da classe e começa a hunt. `label` aparece no erro se o herói morrer. */
export async function enter(client: Client, classId: string, label: string) {
  const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId, rulesVersion: RULES_VERSION });
  const damage: DamageMessage[] = [];
  const spells: SpellMessage[] = [];
  const chains: ChainMessage[] = [];
  const cooldowns: CooldownMessage[] = [];
  room.onMessage(MSG.damage, (msg: DamageMessage) => damage.push(msg));
  room.onMessage(MSG.spell, (msg: SpellMessage) => spells.push(msg));
  room.onMessage(MSG.chain, (msg: ChainMessage) => chains.push(msg));
  room.onMessage(MSG.cooldown, (msg: CooldownMessage) => cooldowns.push(msg));
  const notices: string[] = [];
  room.onMessage(MSG.notice, (msg: { text: string }) => notices.push(msg.text));
  for (const type of [MSG.attack, MSG.monsterStrike]) room.onMessage(type, () => {});
  room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora (${label}, ${classId}): ${JSON.stringify(msg)}`); });
  await wait(300);
  room.send(MSG.start);
  await wait(300);
  const me = () => room.state.players.get(room.sessionId);
  if (me().level < 8) throw new Error(`o servidor precisa de KUSA_START_LEVEL=8 (nível ${me().level})`);
  return { room, me, damage, spells, chains, cooldowns, notices };
}

/**
 * Anda até ficar a `range` tiles do monstro mais próximo (que tem caminho), até `done()` ou 30 s. Com `skip`, pula os
 * `skip` monstros mais próximos: serve para ir buscar outro monstro e juntar um par perto do herói.
 */
export async function approach(room: any, me: () => any, range: number, done: () => boolean, skip = 0) {
  const dungeon = generateDungeon(room.state.seed, room.state.mapId);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !done()) {
    const p = me();
    const blocked = new Set<number>();
    room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
    // O herói nasce colado no portal de fuga: pisar nele no caminho encerra a hunt.
    blocked.add(dungeon.portal.y * dungeon.width + dungeon.portal.x);
    // O monstro mais próximo que tem caminho (o mais perto em linha reta pode estar atrás de uma parede sem passagem).
    // Escondidos (Mímico disfarçado, camuflados) não podem ser alvo: o bot não vai atrás deles.
    const byDistance = ([...room.state.monsters.values()] as any[])
      .filter((m) => !m.hidden)
      .map((m) => ({ m, d: tileDistance(p.x, p.y, m.x, m.y) }))
      .sort((a, b) => a.d - b.d);
    const wanted = byDistance.slice(Math.min(skip, Math.max(0, byDistance.length - 1)));
    // Já perto e `done()` ainda falso (ex.: uma quina tapa a visão): continua até ficar colado no monstro.
    const reach = wanted.length > 0 && wanted[0].d <= range ? 1 : range;
    if (wanted.length > 0 && wanted[0].d > reach) {
      for (const { m } of wanted) {
        const step = nextStep(dungeon, p, m, reach, (x, y) => blocked.has(y * dungeon.width + x));
        if (!step) continue;
        room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
        break;
      }
    }
    await wait(100);
  }
}

/** Monstros a até `range` tiles e com linha de visão (o toque rápido de uma magia acha um alvo neles). */
export function inSight(room: any, p: { x: number; y: number }, range: number): [string, any][] {
  const dungeon = generateDungeon(room.state.seed, room.state.mapId);
  return ([...room.state.monsters.entries()] as [string, any][]).filter(([, m]) =>
    !m.hidden && tileDistance(p.x, p.y, m.x, m.y) <= range && hasLineOfSight(dungeon, p.x, p.y, m.x, m.y));
}

/** Distância até o monstro mais próximo. */
export function nearestMonster(room: any, p: { x: number; y: number }) {
  let best = Infinity;
  room.state.monsters.forEach((m: any) => { if (!m.hidden) best = Math.min(best, tileDistance(p.x, p.y, m.x, m.y)); });
  return best;
}

export async function until(done: () => boolean, ms: number, error: string) {
  const deadline = Date.now() + ms;
  while (!done()) {
    if (Date.now() > deadline) throw new Error(error);
    await wait(50);
  }
}

export function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Onde o herói está e os 3 monstros mais perto (distância e linha de visão), para mensagens de erro. */
export function whereAmI(room: any, me: () => any) {
  const dungeon = generateDungeon(room.state.seed, room.state.mapId);
  const p = me();
  const near = ([...room.state.monsters.values()] as any[])
    .map((m) => ({ k: m.kind, d: tileDistance(p.x, p.y, m.x, m.y), v: hasLineOfSight(dungeon, p.x, p.y, m.x, m.y) }))
    .sort((a, b) => a.d - b.d).slice(0, 3);
  return `herói em ${p.x},${p.y} (${p.status}); perto: ${JSON.stringify(near)}`;
}
