/**
 * Teste do cenário vivo da Fortaleza Orc, sem servidor (a `Hunt` com relógio falso, `arena.ts`):
 *   - a fogueira queima o herói que pisa nela (um pulso por segundo) e continua um pouco depois de ele sair;
 *   - o braseiro do salão bloqueia o tile dele e queima quem encosta;
 *   - o monstro que pisa na fogueira pega fogo;
 *   - a tenda solta um orc quando o herói chega perto, outro a cada minuto, no máximo 3 na hunt;
 *   - o orc perto de um totem bate mais forte (e a telemetria conta o dano a mais);
 *   - os objetos do acampamento (armas, caldeirão, lenha, barris) bloqueiam a passagem;
 *   - o loot máximo da hunt conta os orcs das tendas.
 * Uso: npx tsx apps/server/scripts/cenario.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { SOLO_LIMITS, Tile, centerOf, isWalkable, tileAt, tileDistance } from "@kusa/shared";
import { SCENE_FIRE, SCENE_FIRE_ID, SCENE_TENT, SCENE_TOTEM } from "../src/hunt.ts";
import { HERO, arena, check } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function test(name: string, fn: (a: ReturnType<typeof arena>) => void) {
  const a = arena({ mapId: "fortress", monsterHp: 20, startLevel: 20 });
  try {
    fn(a);
    passed++;
  } catch (e) {
    failures.push(`${name}: ${(e as Error).message}`);
  }
}

/** Põe o herói no tile (sem andar até lá). */
function put(a: ReturnType<typeof arena>, x: number, y: number) {
  a.p.x = x;
  a.p.y = y;
}

test("a fogueira queima o herói e a queimadura dura um pouco depois de sair", (a) => {
  const fire = a.d.fortress!.fires[0];
  put(a, fire.x, fire.y);
  const hp = a.p.hp;
  a.advance(1100);
  const lost = hp - a.p.hp;
  check(lost >= a.p.maxHp * SCENE_FIRE.pct * 0.5, `na fogueira o herói perdeu só ${lost} de vida`);
  check((a.seat().stats.damageTaken[SCENE_FIRE_ID] ?? 0) > 0, "o dano do fogo não entrou na telemetria");
  // Sai da fogueira: ainda queima até acabar o tempo, depois para.
  const off = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: fire.x + dx, y: fire.y + dy })).find((t) => isWalkable(a.d, t.x, t.y))!;
  put(a, off.x, off.y);
  // (pela telemetria: a regeneração do herói esconde o pulso na vida)
  const burned = () => a.seat().stats.damageTaken[SCENE_FIRE_ID] ?? 0;
  const before = burned();
  a.advance(SCENE_FIRE.ms + 500);
  check(burned() > before, "fora da fogueira a queimadura parou na hora");
  const after = burned();
  a.advance(3000);
  check(burned() === after, "a queimadura do fogo não acabou");
});

test("o braseiro bloqueia o tile e queima quem encosta", (a) => {
  const b = a.d.fortress!.braziers[0];
  check(tileAt(a.d, b.x, b.y) === Tile.Ruin, "o braseiro não bloqueia o tile");
  const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: b.x + dx, y: b.y + dy })).find((t) => isWalkable(a.d, t.x, t.y))!;
  put(a, beside.x, beside.y);
  const hp = a.p.hp;
  a.advance(1100);
  check(a.p.hp < hp, "encostado no braseiro o herói não queimou");
});

test("o monstro que pisa na fogueira pega fogo", (a) => {
  const fire = a.d.fortress!.fires[1] ?? a.d.fortress!.fires[0];
  const m = a.any.addMonster("orcGrunt", fire.x, fire.y, 0);
  a.advance(100);
  check(a.brain(m).dot?.kind === "burn", "o orc na fogueira não está queimando");
});

test("a tenda solta um orc com o herói perto, um por minuto, no máximo 3", (a) => {
  const f = a.d.fortress!;
  // A tenda mais longe das outras (para contar só os orcs dela).
  const tent = f.tents.slice().sort((t1, t2) => {
    const iso = (t: typeof t1) => Math.min(...f.tents.filter((o) => o !== t).map((o) => tileDistance(centerOf(o).x, centerOf(o).y, centerOf(t).x, centerOf(t).y)));
    return iso(t2) - iso(t1);
  })[0];
  const c = centerOf(tent);
  // O herói perto da tenda (mas fora dela), sem morrer: a vida volta a cada passo e os orcs que saem somem.
  const spot = [];
  for (let r = 3; r <= 6 && spot.length === 0; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isWalkable(a.d, c.x + dx, c.y + dy) && tileDistance(c.x + dx, c.y + dy, c.x, c.y) === r) spot.push({ x: c.x + dx, y: c.y + dy });
  put(a, spot[0].x, spot[0].y);
  let born = 0;
  const step = (ms: number) => {
    for (let t = 0; t < ms; t += 500) {
      a.p.hp = a.p.maxHp;
      a.advance(500);
      for (const m of [...a.state.monsters.values()]) { born++; a.any.vanishMonster(m.id); }
    }
  };
  step(1000);
  check(born === 1, `o herói chegou perto e saíram ${born} orcs (esperado 1)`);
  step(SCENE_TENT.everyMs - 5000);
  check(born === 1, `antes de 1 minuto saíram ${born} orcs`);
  step(SCENE_TENT.everyMs * 3);
  check(born === SCENE_TENT.max, `em 4 minutos saíram ${born} orcs (o máximo é ${SCENE_TENT.max})`);
  check((a.seat().stats.scenery.orcs_da_tenda ?? 0) === SCENE_TENT.max, "a telemetria não contou os orcs da tenda");
});

test("o orc perto do totem bate mais forte", (a) => {
  const f = a.d.fortress!;
  const totem = f.totems[0];
  // Um orc a 2 tiles do totem e outro longe de todos.
  const near = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 1], [1, 2]].map(([dx, dy]) => ({ x: totem.x + dx, y: totem.y + dy })).find((t) => isWalkable(a.d, t.x, t.y))!;
  const m1 = a.any.addMonster("orcGrunt", near.x, near.y, 0);
  const m2 = a.spawn("orcGrunt", 1);
  check(f.totems.every((t) => tileDistance(t.x, t.y, m2.x, m2.y) > SCENE_TOTEM.radius), "o orc de controle ficou perto de um totem");
  const hit = (m: { id: string; x: number; y: number }) => {
    a.p.hp = a.p.maxHp;
    const hp = a.p.hp;
    a.any.damagePlayer(HERO, 100, { attacker: m.id, fromX: m.x, fromY: m.y, fx: "slash" });
    return hp - a.p.hp;
  };
  const far = hit(m2), boosted = hit(m1);
  check(boosted > far, `perto do totem o golpe tirou ${boosted}, longe ${far}`);
  check((a.seat().stats.scenery.dano_do_totem ?? 0) > 0, "a telemetria não contou o dano a mais do totem");
});

test("os objetos do acampamento bloqueiam a passagem", (a) => {
  const props = a.d.fortress!.campProps;
  check(props.length > 0, "nenhum objeto de acampamento no mapa");
  for (const o of props) check(tileAt(a.d, o.x, o.y) === Tile.Ruin, `o ${o.kind} em ${o.x},${o.y} não bloqueia`);
});

test("o loot máximo conta os orcs das tendas e cabe no teto do solo", (a) => {
  const max = a.hunt.maxLoot();
  check(max <= SOLO_LIMITS.maxLoot.fortress, `loot máximo ${max} acima do teto do solo (${SOLO_LIMITS.maxLoot.fortress})`);
});

console.log(`cenário vivo da Fortaleza: ${passed} ok, ${failures.length} falharam`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("CENARIO OK");
