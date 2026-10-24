/**
 * Teste do movimento, sem servidor (`arena.ts`, relógio falso):
 *   - com a direção segurada (`MoveMessage.hold`), o herói anda sozinho no tick, no ritmo da ficha: o atraso do tick
 *     não se acumula (a média dos intervalos fica na velocidade anunciada em `stepMs`) e nenhum passo atrasa mais de
 *     um tick;
 *   - soltar (`{ dx: 0, dy: 0, hold: true }`) para na hora;
 *   - sem o cliente reenviar a direção, o herói para sozinho depois de `MOVE_HOLD_MS`;
 *   - a mensagem sem `hold` continua sendo um passo só;
 *   - o tempo com a tela deitada (`MSG.screen`) soma em `RunStats.landscapeMs` e para de somar em pé;
 *   - diagonal bloqueada desliza no eixo livre: parede ao norte (andando para o nordeste vai para o leste), monstro
 *     na diagonal e quina; com os dois eixos fechados, fica parado.
 * Uso: npx tsx apps/server/scripts/andar.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MOVE_HOLD_MS, MOVE_RESEND_MS, SERVER_TICK_MS, isWalkable } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function test(name: string, fn: (a: ReturnType<typeof arena>) => void) {
  // Sem o Grimório: o passo do cavaleiro no nível 8 (318 ms) não é múltiplo do tick, que é onde o atraso aparecia.
  const a = arena({ classId: "knight", allSpells: false });
  try {
    fn(a);
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

/**
 * Avança `ms` em ticks e devolve a hora de cada passo. O herói volta ao tile de partida depois de cada passo,
 * para a sala não acabar no meio do teste (o relógio do passo não depende da posição).
 */
function walk(a: ReturnType<typeof arena>, ms: number, resend: boolean) {
  const home = { x: a.p.x, y: a.p.y };
  const steps: number[] = [];
  let nextSend = a.now() + MOVE_RESEND_MS;
  for (let t = 0; t < ms; t += SERVER_TICK_MS) {
    if (resend && a.now() >= nextSend) {
      a.hunt.move(HERO, { dx: 1, dy: 0, hold: true });
      nextSend = a.now() + MOVE_RESEND_MS;
    }
    a.advance(SERVER_TICK_MS);
    if (a.p.x !== home.x || a.p.y !== home.y) {
      steps.push(a.now());
      a.p.x = home.x;
      a.p.y = home.y;
    }
  }
  return steps;
}

test("direção segurada anda no ritmo da ficha, sem acumular atraso", (a) => {
  a.hunt.move(HERO, { dx: 1, dy: 0, hold: true });
  a.p.x -= 1;
  const steps = [a.now(), ...walk(a, 6000, true)];
  const stepMs = a.p.stepMs;
  check(stepMs > 0, "o servidor não anunciou o ritmo do passo (stepMs)");
  const gaps = steps.slice(1).map((t, i) => t - steps[i]);
  const average = (steps[steps.length - 1] - steps[0]) / gaps.length;
  check(Math.abs(average - stepMs) <= 5, `intervalo médio ${average.toFixed(0)} ms, ficha ${stepMs} ms`);
  const worst = Math.max(...gaps);
  check(worst <= stepMs + SERVER_TICK_MS, `um passo atrasou: ${worst} ms (ficha ${stepMs} ms)`);
});

test("soltar para na hora", (a) => {
  a.hunt.move(HERO, { dx: 1, dy: 0, hold: true });
  a.p.x -= 1;
  walk(a, 1000, true);
  a.hunt.move(HERO, { dx: 0, dy: 0, hold: true });
  const after = walk(a, 2000, false);
  check(after.length === 0, `andou ${after.length} passo(s) depois de soltar`);
});

test("sem reenvio, para sozinho depois do prazo", (a) => {
  a.hunt.move(HERO, { dx: 1, dy: 0, hold: true });
  a.p.x -= 1;
  const steps = walk(a, MOVE_HOLD_MS * 3, false);
  check(steps.length > 0, "não andou com a direção segurada");
  const last = steps[steps.length - 1];
  check(last <= MOVE_HOLD_MS + SERVER_TICK_MS, `ainda andava ${last} ms depois da última mensagem`);
});

test("mensagem sem hold é um passo só", (a) => {
  const x = a.p.x;
  a.hunt.move(HERO, { dx: 1, dy: 0 });
  check(a.p.x === x + 1, "o passo não saiu");
  a.advance(2000);
  check(a.p.x === x + 1, `andou além do passo: x=${a.p.x}, esperado ${x + 1}`);
});

test("tempo deitado soma na telemetria", (a) => {
  const stats = () => (a.hunt as unknown as { seats: Map<string, { stats: { landscapeMs: number } }> }).seats.get(HERO)!.stats;
  a.advance(1000);
  check(stats().landscapeMs === 0, `contou ${stats().landscapeMs} ms deitado sem a tela deitar`);
  a.hunt.screen(HERO, { landscape: true });
  a.advance(3000);
  const lying = stats().landscapeMs;
  check(Math.abs(lying - 3000) <= SERVER_TICK_MS, `deitado por 3000 ms contou ${lying} ms`);
  a.hunt.screen(HERO, { landscape: false });
  a.advance(2000);
  check(stats().landscapeMs === lying, `continuou contando em pé: ${stats().landscapeMs} ms`);
});

/** Um tile livre com parede ao norte e chão a leste (para deslizar na parede andando para o nordeste). */
function underWall(a: ReturnType<typeof arena>) {
  for (let y = 1; y < a.d.height - 1; y++) {
    for (let x = 1; x < a.d.width - 1; x++) {
      if (a.free(x, y) && a.free(x + 1, y) && !isWalkable(a.d, x, y - 1) && !isWalkable(a.d, x + 1, y - 1)) return { x, y };
    }
  }
  throw new Error("nenhum tile com parede ao norte");
}

test("diagonal na parede desliza pelo eixo livre", (a) => {
  const spot = underWall(a);
  a.p.x = spot.x;
  a.p.y = spot.y;
  a.advance(1000);
  a.hunt.move(HERO, { dx: 1, dy: -1 });
  check(a.p.x === spot.x + 1 && a.p.y === spot.y, `esperado ${spot.x + 1},${spot.y}, foi para ${a.p.x},${a.p.y}`);
});

test("diagonal com monstro desliza; sem saída fica parado", (a) => {
  a.advance(1000);
  const x = a.p.x;
  const y = a.p.y;
  a.place("orc", 1, -1);
  a.hunt.move(HERO, { dx: 1, dy: -1 });
  check(a.p.x === x + 1 && a.p.y === y, `com o orc na diagonal, esperado ${x + 1},${y}, foi para ${a.p.x},${a.p.y}`);
  a.advance(1000);
  // Agora o orc está ao norte e outro fecha o leste e o nordeste: nenhum eixo livre.
  a.place("orc", 1, 0);
  a.place("orc", 1, -1);
  const before = { x: a.p.x, y: a.p.y };
  a.hunt.move(HERO, { dx: 1, dy: -1 });
  check(a.p.x === before.x && a.p.y === before.y, `sem saída, andou para ${a.p.x},${a.p.y}`);
});

console.log(`\n${passed} ok, ${failures.length} falha(s)`);
if (failures.length) {
  for (const f of failures) console.error(`  ✘ ${f}`);
  process.exit(1);
}
