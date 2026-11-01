/**
 * Teste do tiro que pode errar (básico à distância e magias `isShot`), sem servidor: a `Hunt` roda na arena
 * (`arena.ts`), com o monstro parado (atordoado) e mudado de lugar à mão durante o voo:
 *   - o tiro é mirado numa direção e voa até o alcance inteiro (o fim do caminho vai no `MSG.attack`);
 *   - o básico do Paladino acerta o monstro parado e erra quem sai de lado durante o voo;
 *   - quem vem reto na direção do herói continua no caminho e leva o tiro;
 *   - o primeiro monstro no caminho leva o tiro no lugar do alvo de trás, e o tiro que passa pelo alvo segue e acerta
 *     quem está atrás;
 *   - arrastando o ⚔️, o tiro segue a direção mirada além do ponto e sai mesmo sem monstro à vista;
 *   - o golpe do Cavaleiro (corpo a corpo) não muda;
 *   - a Flecha Sagrada erra quem sai de lado, e a mira com `targetId` não gruda mais no monstro;
 *   - a telemetria conta os tiros, os erros e os mirados (`RunStats.shots`);
 *   - o toque rápido nas magias com alvo sai na frente do herói (último passo, golpe ou mira), sem mira automática no
 *     monstro; o toque no ⚔️ continua mirando sozinho.
 * Uso: npx tsx apps/server/scripts/tiro.ts (de dentro de apps/server)
 */
import { shotPath, type ClassId, type MonsterKind } from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";
import type { Monster } from "../src/state.ts";

/** Alvo padrão: humanoide parrudo, sem fuga nem salto. */
const TARGET: MonsterKind = "lizardfolk";

const failures: string[] = [];
let passed = 0;

function test(name: string, classId: ClassId, fn: (a: Arena) => void) {
  const a = arena({ classId, monsterHp: 20 });
  try {
    fn(a);
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

/** Monstro parado no lugar (atordoado por muito tempo): o teste é quem o move. */
function still(a: Arena, m: Monster) {
  a.brain(m).stunnedUntil = Number.MAX_SAFE_INTEGER;
  return m;
}

/** Um toque no ⚔️: espera o tiro sair e devolve a posição na lista de dano de antes do toque. */
function shoot(a: Arena, aim?: { x: number; y: number }) {
  const before = a.attacks.length;
  const from = a.damage.length;
  a.hunt.attacking(HERO, aim ? { on: true, aim } : { on: true });
  if (!aim) a.hunt.attacking(HERO, { on: false });
  a.until(() => a.attacks.length > before, 2000, "o tiro não saiu");
  return from;
}

/** Deixa o projétil chegar (e um pouco mais). */
const land = (a: Arena) => a.advance(600);

const shots = (a: Arena, source: string) => a.seat().stats.shots[source] ?? { fired: 0, missed: 0, aimed: 0 };

console.log("básico à distância:");
test("voa na direção até o alcance inteiro", "paladin", (a) => {
  still(a, a.place(TARGET, 2, 0));
  shoot(a);
  const shot = a.attacks[a.attacks.length - 1];
  check(shot.shot !== undefined, "o tiro devia ter id");
  // O alcance inteiro na direção do monstro, ou até a primeira parede (o mapa sorteado pode ter uma antes).
  const path = shotPath(a.d, a.p.x, a.p.y, a.p.x + 40, a.p.y, a.p.basicRange);
  const end = path[path.length - 1];
  check(path.length >= 3 && shot.tx === end.x && shot.ty === end.y, `o fim do caminho devia ser ${end.x - a.p.x},${end.y - a.p.y} (${shot.tx - a.p.x},${shot.ty - a.p.y})`);
});

test("acerta o monstro parado", "paladin", (a) => {
  const m = still(a, a.place(TARGET, 3, 0));
  const from = shoot(a);
  land(a);
  check(a.hitsFrom(from) === 1, `devia acertar 1 vez (${a.hitsFrom(from)})`);
  check(m.hp < m.maxHp, "o monstro devia perder vida");
  check(shots(a, "basic").fired === 1 && shots(a, "basic").missed === 0, `telemetria: ${JSON.stringify(shots(a, "basic"))}`);
});

test("erra quem sai de lado durante o voo", "paladin", (a) => {
  const m = still(a, a.place(TARGET, 3, 0));
  const from = shoot(a);
  m.y += 1;
  land(a);
  check(a.hitsFrom(from) === 0, `devia errar (${a.hitsFrom(from)} golpes)`);
  check(m.hp === m.maxHp, "o monstro não devia perder vida");
  check(shots(a, "basic").missed === 1, `telemetria: ${JSON.stringify(shots(a, "basic"))}`);
});

test("acerta quem vem reto na direção do herói", "paladin", (a) => {
  const m = still(a, a.place(TARGET, 3, 0));
  const from = shoot(a);
  m.x -= 1;
  land(a);
  check(a.hitsFrom(from) === 1, `devia acertar (${a.hitsFrom(from)} golpes)`);
});

test("o primeiro monstro no caminho leva o tiro", "druid", (a) => {
  const front = still(a, a.place(TARGET, 1, 0));
  const back = still(a, a.place(TARGET, 3, 0));
  a.p.target = back.id;
  a.seat().targetLocked = true;
  shoot(a);
  land(a);
  check(front.hp < front.maxHp, "o monstro da frente devia levar o tiro");
  check(back.hp === back.maxHp, "o monstro de trás não devia levar o tiro");
});

test("o tiro que passa pelo alvo acerta quem está atrás", "paladin", (a) => {
  // A arena só garante 3 tiles livres em volta do herói.
  const front = still(a, a.place(TARGET, 1, 0));
  const back = still(a, a.place(TARGET, 3, 0));
  shoot(a);
  front.y += 1;
  land(a);
  check(front.hp === front.maxHp, "o alvo que saiu de lado não devia levar o tiro");
  check(back.hp < back.maxHp, "o monstro de trás devia levar o tiro");
});

test("mirado à mão: segue a direção além do ponto", "sorcerer", (a) => {
  const m = still(a, a.place(TARGET, 3, 0));
  const from = shoot(a, { x: a.p.x + 1, y: a.p.y });
  land(a);
  check(a.hitsFrom(from) === 1, `devia acertar (${a.hitsFrom(from)} golpes)`);
  check(m.hp < m.maxHp, "o monstro devia perder vida");
  check(shots(a, "basic").aimed === 1, `telemetria: ${JSON.stringify(shots(a, "basic"))}`);
});

test("mirado à mão: acerta quem entra no caminho", "sorcerer", (a) => {
  const m = still(a, a.place(TARGET, 3, 1));
  const from = shoot(a, { x: a.p.x + 1, y: a.p.y });
  m.y -= 1;
  land(a);
  check(a.hitsFrom(from) === 1, `devia acertar (${a.hitsFrom(from)} golpes)`);
});

test("mirado à mão: sai mesmo sem monstro à vista", "paladin", (a) => {
  const before = a.attacks.length;
  a.hunt.attacking(HERO, { on: true, aim: { x: a.p.x - 3, y: a.p.y } });
  a.advance(1500);
  check(a.attacks.length === before + 1, `devia sair 1 tiro (${a.attacks.length - before})`);
  check(shots(a, "basic").missed === 1, `telemetria: ${JSON.stringify(shots(a, "basic"))}`);
});

test("o golpe do Cavaleiro não muda", "knight", (a) => {
  const m = still(a, a.place(TARGET, 1, 0));
  const from = shoot(a);
  land(a);
  check(a.hitsFrom(from) >= 1, `devia acertar (${a.hitsFrom(from)} golpes)`);
  check(m.hp < m.maxHp, "o monstro devia perder vida");
  check(!a.seat().stats.shots.basic, "o golpe corpo a corpo não é tiro");
});

console.log("magias de alvo único:");
test("Flecha Sagrada acerta o monstro parado", "paladin", (a) => {
  a.choose("holy_arrow");
  const m = still(a, a.place(TARGET, 3, 0));
  a.ready();
  a.cast(0);
  land(a);
  check(m.hp < m.maxHp, "o monstro devia perder vida");
});

test("Flecha Sagrada erra quem sai de lado", "paladin", (a) => {
  a.choose("holy_arrow");
  const m = still(a, a.place(TARGET, 3, 0));
  a.ready();
  a.cast(0);
  m.y += 1;
  land(a);
  check(m.hp === m.maxHp, "o monstro não devia perder vida");
  check(shots(a, "holy_arrow").missed === 1, `telemetria: ${JSON.stringify(shots(a, "holy_arrow"))}`);
});

test("Flecha Sagrada segue a direção além do ponto mirado", "paladin", (a) => {
  a.choose("holy_arrow");
  const m = still(a, a.place(TARGET, 3, 0));
  a.ready();
  a.cast(0, { x: a.p.x + 1, y: a.p.y });
  land(a);
  check(m.hp < m.maxHp, "o monstro devia perder vida");
});

test("a mira não gruda no monstro ao lado do ponto", "sorcerer", (a) => {
  a.choose("lightning_bolt");
  const m = still(a, a.place(TARGET, 3, 0));
  a.ready();
  // Mira um tile abaixo do monstro, mandando o id dele como o cliente antigo mandava ao grudar.
  a.hunt.cast(HERO, { slot: 0, aim: { x: m.x, y: m.y + 1, targetId: m.id } });
  land(a);
  check(m.hp === m.maxHp, "o tiro devia ir na direção mirada, não no monstro");
  check(shots(a, "lightning_bolt").aimed === 1, `telemetria: ${JSON.stringify(shots(a, "lightning_bolt"))}`);
});

console.log("toque rápido:");
test("o toque rápido na magia sai na frente do herói, não no monstro", "paladin", (a) => {
  a.choose("holy_arrow");
  const m = still(a, a.place(TARGET, 3, 0));
  a.ready();
  // O herói olha para baixo (como ao entrar); o monstro está à direita.
  a.face({ x: a.p.x, y: a.p.y + 1 });
  a.hunt.cast(HERO, { slot: 0 });
  land(a);
  const shot = a.spells[a.spells.length - 1];
  check(shot.tx === a.p.x && shot.ty > a.p.y, `a flecha devia sair para baixo (${shot.tx - a.p.x},${shot.ty - a.p.y})`);
  check(m.hp === m.maxHp, "o monstro à direita não devia levar a flecha");
});

test("a frente do herói segue o último passo", "paladin", (a) => {
  a.choose("holy_arrow");
  a.hunt.move(HERO, { dx: 1, dy: 0 });
  a.advance(400);
  check(a.p.faceX === 1 && a.p.faceY === 0, `o herói devia olhar para a direita (${a.p.faceX},${a.p.faceY})`);
  const m = still(a, a.place(TARGET, 2, 0));
  a.ready();
  a.hunt.cast(HERO, { slot: 0 });
  land(a);
  check(m.hp < m.maxHp, "a flecha devia sair para a direita e acertar");
});

test("a frente do herói segue o último ataque básico (que mira sozinho)", "sorcerer", (a) => {
  a.choose("lightning_bolt");
  const m = still(a, a.place(TARGET, -3, 0));
  a.face({ x: a.p.x, y: a.p.y + 1 });
  shoot(a);
  land(a);
  check(a.p.faceX < 0 && a.p.faceY === 0, `o herói devia olhar para o monstro (${a.p.faceX},${a.p.faceY})`);
  const hp = m.hp;
  a.ready();
  a.hunt.cast(HERO, { slot: 0 });
  land(a);
  check(m.hp < hp, "o Relâmpago devia sair na direção do último golpe e acertar");
});

test("golpe do Cavaleiro no toque rápido vai no monstro da frente", "knight", (a) => {
  a.choose("crushing_blow");
  // O monstro colado pode morder e a Riposta devolver (dano do herói): confere pelo golpe, não pela vida.
  const right = still(a, a.place(TARGET, 1, 0));
  a.face({ x: a.p.x, y: a.p.y + 1 });
  a.ready();
  a.hunt.cast(HERO, { slot: 0 });
  land(a);
  const down = a.spells[a.spells.length - 1];
  check(down.tx === a.p.x && down.ty === a.p.y + 1, `olhando para baixo, o golpe devia ir no tile de baixo (${down.tx - a.p.x},${down.ty - a.p.y})`);
  a.face(right);
  a.ready();
  a.hunt.cast(HERO, { slot: 0 });
  land(a);
  const side = a.spells[a.spells.length - 1];
  check(side.tx === right.x && side.ty === right.y, `olhando para ele, o golpe devia ir no monstro (${side.tx - a.p.x},${side.ty - a.p.y})`);
});

console.log(`\n${passed} ok, ${failures.length} falha(s)`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  ✘ ${f}`);
  process.exit(1);
}
console.log("TODOS OK");
