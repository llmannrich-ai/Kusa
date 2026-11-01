/**
 * Teste da Mira no ataque (opção beta das Configurações), sem servidor (`arena.ts`):
 *   - o alcance do ataque básico vai para o estado (`Player.reach`), com o bônus da classe e a Forma de Urso, porque a
 *     mira do ⚔️ desenha este alcance e não pode mentir para o jogador;
 *   - o que o cliente manda ao soltar a mira num monstro (trava o alvo e dá um toque no ⚔️) acerta esse monstro, não o
 *     mais próximo;
 *   - monstro escondido não pode ser travado pela mira (o servidor ignora).
 * Uso: npx tsx apps/server/scripts/miraataque.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { CLASSES, type ClassId } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function test(name: string, classId: ClassId, fn: (a: ReturnType<typeof arena>) => void) {
  const a = arena({ classId, monsterHp: 20 });
  try {
    fn(a);
    passed++;
    console.log(`✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.error(`✘ ${name}: ${(err as Error).message}`);
  }
}

for (const classId of Object.keys(CLASSES) as ClassId[]) {
  test(`alcance do ⚔️ no estado (${classId})`, classId, (a) => {
    a.advance(200);
    const base = CLASSES[classId].attackRange;
    check(a.p.reach >= base, `reach ${a.p.reach}, esperado pelo menos ${base}`);
  });
}

test("Forma de Urso: a patada só alcança quem está colado", "druid", (a) => {
  a.advance(200);
  check(a.p.reach > 1, `druida sem forma deveria alcançar longe, veio ${a.p.reach}`);
  a.seat().form = { kind: "bear", until: a.now() + 10_000, moveSpeed: 0, pounce: 0, pounceStunMs: 0, maul: true, hpBonus: 0 };
  a.advance(200);
  check(a.p.reach === 1, `na Forma de Urso o reach deveria ser 1, veio ${a.p.reach}`);
});

test("soltar a mira num monstro trava e acerta ele, não o mais próximo", "paladin", (a) => {
  const near = a.place("lizardfolk", 1, 0);
  const far = a.place("lizardfolk", -3, 0);
  a.advance(200);
  // O que o ⚔️ manda ao soltar a mira: trava o alvo e um toque (liga e desliga o ataque).
  a.hunt.target(HERO, { id: far.id });
  a.hunt.attacking(HERO, { on: true });
  a.hunt.attacking(HERO, { on: false });
  a.until(() => far.hp < far.maxHp, 2000, "o golpe não acertou o monstro mirado");
  check(near.hp === near.maxHp, "o golpe foi no monstro mais próximo, não no mirado");
  check(a.p.target === far.id, "o alvo não ficou travado no monstro mirado");
});

test("monstro escondido não é travado", "paladin", (a) => {
  const m = a.place("lizardfolk", 2, 0);
  m.hidden = true;
  a.hunt.target(HERO, { id: m.id });
  check(a.p.target !== m.id, "travou um monstro escondido");
});

console.log(`\n${passed} ok, ${failures.length} falha(s)`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
