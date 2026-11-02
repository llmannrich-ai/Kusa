/**
 * Dificuldade por comportamento (`packages/shared/src/threat.ts`), sem servidor. Cada perigo tem uma resposta certa:
 * - Grito de Guerra: o líder que sobrevive ao primeiro golpe chama os parados a até `LEADER_SHOUT_RADIUS`, uma vez só;
 *   morto num golpe, não grita. Golpe em monstro comum não chama ninguém.
 * - Perseguição pelo papel: o escaramuçador (Goblin) segue o herói longe; o bruto lento (Zumbi) desiste antes.
 * - Formação: aliado perto corta o dano; Cercado: cada monstro colado a mais aumenta.
 * Uso: npx tsx apps/server/scripts/comportamento.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { FORMATION_GUARD, LEADER_SHOUT_RADIUS, SURROUND_STEP, isWalkable, tileDistance } from "@kusa/shared";
import { distanceField } from "../src/pathfinding.ts";
import { HERO, arena, check, type Arena } from "./arena.ts";

/** Leva o herói para um tile andável a `min`–`max` tiles de `from`, alcançável a pé e longe dos monstros. */
function moveHeroAway(a: Arena, from: { x: number; y: number }, min: number, max: number) {
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

// --- Golpe comum não chama ninguém ---------------------------------------------------
{
  const a = arena();
  const struck = a.place("goblin", 3, 0);
  const near = a.place("goblin", 1, 0);
  moveHeroAway(a, struck, 18, 30);
  a.any.damageMonster(struck, 1, hit(HERO), "basic");
  check(a.brain(struck).targetId === HERO, "o monstro golpeado devia ir atrás do herói");
  check(a.brain(near).targetId === null, "golpe em monstro comum não devia chamar o vizinho");
  console.log("  ✔ golpe em monstro comum não chama ninguém");
}

// --- Grito de Guerra: só se o líder sobreviver -------------------------------------------
{
  const a = arena();
  const leader = a.place("hobgoblin", 3, 0);
  const far = a.place("goblin", -3, 0); // 6 tiles, dentro do grito
  check(tileDistance(leader.x, leader.y, far.x, far.y) <= LEADER_SHOUT_RADIUS, "o goblin devia estar no raio do grito");
  moveHeroAway(a, leader, 18, 30);
  a.any.damageMonster(leader, 1, hit(HERO), "basic");
  check(a.brain(far).targetId === HERO, "o líder que sobrevive devia chamar o goblin");
  check(a.notices.filter((n) => n === "Grito de Guerra!").length === 1, "o líder devia gritar uma vez");
  a.brain(far).targetId = null;
  a.any.damageMonster(leader, 1, hit(HERO), "basic");
  check(a.brain(far).targetId === null, "o líder só grita uma vez");
  console.log("  ✔ o líder que sobrevive grita uma vez");
}
{
  const a = arena();
  const leader = a.place("hobgoblin", 3, 0);
  const far = a.place("goblin", -3, 0);
  moveHeroAway(a, leader, 18, 30);
  a.any.damageMonster(leader, leader.hp * 10, hit(HERO), "basic");
  check(!a.state.monsters.has(leader.id), "o líder devia morrer no golpe");
  check(a.brain(far).targetId === null, "o líder morto num golpe não devia gritar");
  check(!a.notices.includes("Grito de Guerra!"), "não devia haver grito");
  console.log("  ✔ o líder morto num golpe não grita");
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

// --- Formação e Cercado ----------------------------------------------------------------
{
  const a = arena({ allies: [{ classId: "druid", bot: true }] });
  const m = a.place("goblin", 0, 1);
  const ally = a.state.players.get("h2")!;
  const taken = () => {
    a.p.hp = a.p.maxHp;
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
