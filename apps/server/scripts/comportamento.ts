/**
 * Dificuldade por comportamento (`packages/shared/src/threat.ts`), sem servidor:
 * - Barulho da luta: o golpe num monstro acorda os parados a até `ALARM_RADIUS` (mesmo sem ver o herói); mais longe, não.
 * - Grito de Guerra: o líder chama até `LEADER_SHOUT_RADIUS`.
 * - Perseguição: o escaramuçador (Goblin) segue o herói longe; o bruto lento (Zumbi) desiste antes.
 * - Patrulhas: saem iguais pela seed, longe da entrada, e andam sem ninguém por perto.
 * - Andarilho: acorda em `PROWLER_AT` do tempo e vem atrás do herói pelo mapa.
 * - Formação: aliado perto corta o dano; Cerco: monstros colados a mais aumentam.
 * Uso: npx tsx apps/server/scripts/comportamento.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  ALARM_RADIUS, FORMATION_GUARD, LEADER_SHOUT_RADIUS, MAPS, PROWLER_AT, SURROUND_STEP,
  createRng, isWalkable, tileDistance, type MapId,
} from "@kusa/shared";
import { Hunt, START_ZONE_RADIUS, type HuntHost } from "../src/hunt.ts";
import { distanceField } from "../src/pathfinding.ts";
import { DungeonState, type Monster } from "../src/state.ts";
import { HERO, arena, check } from "./arena.ts";

/** Leva o herói para um tile andável a `min`–`max` tiles de `from`, alcançável a pé. */
function moveHeroAway(a: ReturnType<typeof arena>, from: { x: number; y: number }, min: number, max: number) {
  const field = distanceField(a.d, from);
  for (let y = 0; y < a.d.height; y++) {
    for (let x = 0; x < a.d.width; x++) {
      const dist = tileDistance(x, y, from.x, from.y);
      if (dist < min || dist > max || field[y * a.d.width + x] < 0 || !isWalkable(a.d, x, y)) continue;
      if ([...a.state.monsters.values()].some((m) => tileDistance(m.x, m.y, x, y) < min)) continue;
      a.p.x = x;
      a.p.y = y;
      return;
    }
  }
  throw new Error(`sem tile a ${min}-${max} tiles (${a.where()})`);
}

const hit = (attacker: string) => ({ attacker, fromX: 0, fromY: 0 }) as never;

// --- Barulho da luta ----------------------------------------------------------------
{
  const a = arena();
  const struck = a.place("goblin", 3, 0);
  const near = a.place("goblin", -2, 0); // 5 tiles do golpeado
  const far = a.place("goblin", -3, 0); // 6 tiles
  check(tileDistance(struck.x, struck.y, near.x, near.y) === ALARM_RADIUS, "o vizinho perto devia estar no raio do alarme");
  moveHeroAway(a, struck, 18, 30);
  a.any.damageMonster(struck, 1, hit(HERO), "basic");
  check(a.brain(struck).targetId === HERO, "o monstro golpeado devia ir atrás do herói");
  check(a.brain(near).targetId === HERO, `o barulho devia acordar o vizinho a ${ALARM_RADIUS} tiles`);
  check(a.brain(far).targetId === null, "o barulho não devia chegar a 6 tiles");
  check((a.seat().stats.threat.acordados ?? 0) === 1, "a telemetria devia contar 1 acordado");
  console.log("  ✔ barulho da luta acorda quem está a até 5 tiles, através de paredes");
}

// --- Grito de Guerra ----------------------------------------------------------------
{
  const a = arena();
  const leader = a.place("hobgoblin", 3, 0);
  const far = a.place("goblin", -3, 0); // 6 tiles: fora do alarme comum, dentro do grito
  check(tileDistance(leader.x, leader.y, far.x, far.y) <= LEADER_SHOUT_RADIUS, "o goblin devia estar no raio do grito");
  moveHeroAway(a, leader, 18, 30);
  a.any.damageMonster(leader, 1, hit(HERO), "basic");
  check(a.brain(far).targetId === HERO, "o Grito de Guerra devia chamar o goblin a 6 tiles");
  check(a.notices.includes("Grito de Guerra!"), "o líder devia gritar");
  console.log("  ✔ o líder grita e chama de mais longe");
}

// --- Perseguição pelo papel ---------------------------------------------------------
for (const [kind, keeps] of [["goblin", true], ["zombie", false]] as const) {
  const a = arena();
  const m = a.place(kind, 2, 0);
  a.brain(m).targetId = HERO;
  moveHeroAway(a, m, 15, 15);
  a.p.hp = a.p.maxHp = 100_000;
  a.advance(200);
  check((a.brain(m).targetId === HERO) === keeps, `${kind} ${keeps ? "devia seguir" : "devia desistir de"} o herói a 15 tiles (${a.where()})`);
}
console.log("  ✔ o goblin persegue longe; o zumbi desiste");

// --- Patrulhas pela seed ------------------------------------------------------------
function huntOn(mapId: MapId, seed: number) {
  let clock = 0;
  const host: HuntHost = {
    now: () => clock, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {},
  };
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId, seed, random: createRng(seed).next, calm: true });
  hunt.join(HERO, { name: "Teste", classId: "knight", talents: {}, spellXp: {} });
  hunt.start(HERO);
  const any = hunt as any;
  const patrols = () => [...state.monsters.values()].filter((m: Monster) => any.brains.get(m.id)?.roam);
  return { hunt, state, any, patrols, tick: (ms: number) => { for (let t = 0; t < ms; t += 50) { clock += 50; hunt.tick(50); } } };
}
{
  let maps = 0;
  for (const mapId of ["crypt", "swamp", "oldwood", "fortress"] as MapId[]) {
    const h1 = huntOn(mapId, 777);
    const h2 = huntOn(mapId, 777);
    const ids1 = h1.patrols().map((m) => m.id).join(",");
    check(ids1 === h2.patrols().map((m) => m.id).join(","), `${mapId}: as patrulhas deviam sair iguais pela seed`);
    if (h1.patrols().length === 0) continue;
    maps++;
    const portal = h1.any.dungeon.portal;
    for (const m of h1.patrols()) check(tileDistance(m.x, m.y, portal.x, portal.y) > START_ZONE_RADIUS, `${mapId}: patrulha nasceu na entrada`);
    // O herói fica parado no portal: a patrulha anda sozinha.
    const lead = h1.patrols().find((m) => !h1.any.brains.get(m.id).roam.lead)!;
    const start = { x: lead.x, y: lead.y };
    h1.tick(20_000);
    check(lead.x !== start.x || lead.y !== start.y, `${mapId}: a patrulha devia andar (${lead.kind} em ${lead.x},${lead.y})`);
  }
  check(maps >= 3, `devia haver patrulha em pelo menos 3 de 4 mapas (houve em ${maps})`);
  console.log("  ✔ patrulhas saem pela seed, longe da entrada, e andam sozinhas");
}

// --- Andarilho -----------------------------------------------------------------------
{
  const a = arena({ mapId: "swamp", calm: false });
  a.p.hp = a.p.maxHp = 1_000_000;
  const at = MAPS.swamp.durationSeconds * 1000 * PROWLER_AT;
  a.advance(at + 100);
  const prowler = [...a.state.monsters.values()].find((m) => a.brain(m).prowler);
  check(!!prowler, `o Andarilho devia acordar em ${PROWLER_AT * 100}% do tempo`);
  check(a.seat().stats.threat.andarilho === 1, "a telemetria devia contar o Andarilho");
  const before = tileDistance(prowler!.x, prowler!.y, a.p.x, a.p.y);
  a.advance(8000);
  const after = tileDistance(prowler!.x, prowler!.y, a.p.x, a.p.y);
  check(after < before, `o Andarilho devia se aproximar (de ${before} para ${after} tiles)`);
  check(a.brain(prowler!).targetId === HERO, "o Andarilho devia caçar o herói");
  console.log(`  ✔ o Andarilho (${prowler!.kind}) acorda e caça: ${before} → ${after} tiles em 8 s`);
}

// --- Formação e Cerco ----------------------------------------------------------------
{
  const a = arena({ allies: [{ classId: "druid", bot: true }] });
  const m = a.place("goblin", 0, 1);
  const ally = a.state.players.get("h2")!;
  const taken = () => {
    a.p.hp = a.p.maxHp;
    a.any.seats.get(HERO).invulnUntil = 0;
    a.p.barrier = 0;
    a.any.damagePlayer(HERO, 200, { attacker: m.id, fromX: m.x, fromY: m.y });
    return a.p.maxHp - a.p.hp;
  };
  const together = taken();
  ally.x = a.p.x + 10;
  const alone = taken();
  check(Math.abs(together / alone - (1 - FORMATION_GUARD)) < 0.03, `Formação devia cortar ${FORMATION_GUARD * 100}% (${together} junto, ${alone} sozinho)`);
  a.place("goblin", 1, 1);
  a.place("goblin", -1, 1);
  const surrounded = taken();
  check(Math.abs(surrounded / alone - (1 + 2 * SURROUND_STEP)) < 0.03, `cercado por 3 devia levar +${2 * SURROUND_STEP * 100}% (${surrounded} contra ${alone})`);
  console.log(`  ✔ Formação: ${alone} → ${together}; cercado por 3: ${surrounded}`);
}

console.log("COMPORTAMENTO OK");
