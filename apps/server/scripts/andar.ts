/**
 * Teste do movimento, sem servidor (`arena.ts`, relógio falso):
 *   - com a direção segurada (`MoveMessage.hold`), o herói anda sozinho no tick, no ritmo da ficha: o atraso do tick
 *     não se acumula (a média dos intervalos fica na velocidade anunciada em `stepMs`) e nenhum passo atrasa mais de
 *     um tick;
 *   - soltar (`{ dx: 0, dy: 0, hold: true }`) para na hora;
 *   - sem o cliente reenviar a direção, o herói para sozinho depois de `MOVE_HOLD_MS`;
 *   - a mensagem sem `hold` continua sendo um passo só.
 * Uso: npx tsx apps/server/scripts/andar.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MOVE_HOLD_MS, MOVE_RESEND_MS, SERVER_TICK_MS } from "@kusa/shared";
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

console.log(`\n${passed} ok, ${failures.length} falha(s)`);
if (failures.length) {
  for (const f of failures) console.error(`  ✘ ${f}`);
  process.exit(1);
}
