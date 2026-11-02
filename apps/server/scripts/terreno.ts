/**
 * Terreno de caça (Fíbula, `docs/TERRENO_DE_CACA_PLANO.md`), sem servidor:
 * - spawns fixos: os mesmos tipos nos mesmos lugares em qualquer seed (só os Campeões mudam);
 * - sala que morre inteira enche de novo no tempo do anel, mas não com herói perto; mini-boss volta sem o baú;
 * - regen fixa em pontos (fração da vida do nível 1, crescendo devagar), quatro vezes mais na fogueira;
 * - sem tempo: a hunt passa dos 4 min da Cripta e o relógio conta até o teto técnico.
 * Uso: npx tsx apps/server/scripts/terreno.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CAMP_REGEN, FLAT_HP_REGEN, FLAT_REGEN_PER_LEVEL, MAPS, MONSTERS, OPEN_HUNT_MAX_SECONDS, SERVER_TICK_MS, createRng, statsFor, tileDistance,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState, type Player } from "../src/state.ts";

const HERO = "h";

function fibula(seed: number) {
  let clock = 0;
  const host: HuntHost = { now: () => clock, setTimeout: () => {}, send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} };
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId: "fibula", seed, random: createRng(seed).next });
  hunt.join(HERO, { name: "Teste", classId: "knight", talents: {}, spellXp: {} });
  hunt.start(HERO);
  const any = hunt as any;
  const p = state.players.get(HERO)! as Player;
  const advance = (ms: number) => { for (let t = 0; t < ms; t += SERVER_TICK_MS) { clock += SERVER_TICK_MS; hunt.tick(SERVER_TICK_MS); } };
  /** Herói no acampamento, longe de tudo, sem tomar dano. */
  const safe = () => { p.x = any.dungeon.portal.x + 1; p.y = any.dungeon.portal.y; };
  return { hunt, state, any, p, advance, safe };
}

function check(ok: boolean, what: string) {
  if (!ok) throw new Error(what);
}

// --- Spawns fixos ------------------------------------------------------------------------
{
  const a = fibula(11);
  const b = fibula(99_999);
  const layout = (h: ReturnType<typeof fibula>) => [...h.state.monsters.values()].map((m) => `${m.kind}@${m.x},${m.y}`).sort().join(" ");
  check(layout(a) === layout(b), "os monstros da Fíbula deviam nascer iguais em qualquer seed");
  const packs = a.any.packs as { ring: number; members: string[]; miniboss: boolean }[];
  check(packs.filter((x) => !x.miniboss).length === 9, "devia haver 9 salas de monstros (3 por anel)");
  check(packs.filter((x) => x.miniboss).length === 4, "devia haver 4 mini-bosses nas salas laterais");
  check(packs.every((x) => x.members.length > 0), "toda sala devia ter monstro");
  check([...a.state.monsters.values()].some((m) => m.kind === "boneKing"), "o Rei Ossudo devia estar no covil");
  const portal = a.any.dungeon.portal;
  check([...a.state.monsters.values()].every((m) => tileDistance(m.x, m.y, portal.x, portal.y) > 6), "ninguém nasce colado no acampamento");
  const perRing = [0, 1, 2].map((r) => packs.filter((x) => !x.miniboss && x.ring === r).reduce((n, x) => n + x.members.length, 0));
  console.log(`  ✔ spawns fixos: ${a.state.monsters.size} monstros, por anel ${perRing.join("/")}`);
}

// --- Respawn ---------------------------------------------------------------------------
{
  const h = fibula(7);
  h.p.hp = h.p.maxHp = 1_000_000;
  h.safe();
  const pack = (h.any.packs as any[]).find((x) => !x.miniboss && x.ring === 0);
  const kill = () => pack.members.forEach((id: string) => { const m = h.state.monsters.get(id); if (m) h.any.killMonster(m, h.any.brains.get(id), HERO); });
  const before = pack.members.map((id: string) => h.state.monsters.get(id)!.kind).sort().join(",");
  kill();
  check(pack.members.every((id: string) => !h.state.monsters.has(id)), "a sala devia estar vazia");
  const wait = MAPS.fibula.huntingGround!.respawnMs[0];
  h.advance(wait - 2000);
  check(pack.members.every((id: string) => !h.state.monsters.has(id)), "a sala não devia encher antes da hora");
  // Herói dentro da sala: espera.
  h.p.x = pack.spots[0].x + 1; h.p.y = pack.spots[0].y;
  h.advance(4000);
  check(pack.members.every((id: string) => !h.state.monsters.has(id)), "a sala não devia encher com o herói dentro");
  h.safe();
  h.advance(200);
  check(pack.members.length > 0 && pack.members.every((id: string) => h.state.monsters.has(id)), "a sala devia encher de novo");
  const after = pack.members.map((id: string) => h.state.monsters.get(id)!.kind).sort().join(",");
  check(before === after, `a sala devia voltar com os mesmos monstros (${before} → ${after})`);
  check(h.any.seats.get(HERO).stats.ground.salas_renascidas === 1, "a telemetria devia contar a sala que encheu");

  const mini = (h.any.packs as any[]).find((x) => x.miniboss);
  const m = h.state.monsters.get(mini.members[0])!;
  const chestId = h.any.brains.get(m.id).chestId;
  check(!!chestId, "o mini-boss devia guardar o baú");
  h.any.killMonster(m, h.any.brains.get(m.id), HERO);
  h.advance(MAPS.fibula.huntingGround!.minibossRespawnMs + 1500);
  const back = h.state.monsters.get(mini.members[0]);
  check(!!back, "o mini-boss devia voltar");
  check(!h.any.brains.get(back!.id).chestId, "o mini-boss que volta não guarda baú");
  console.log("  ✔ salas e mini-boss enchem de novo no tempo, não com herói perto");
}

// --- Regen fixa e fogueira --------------------------------------------------------------
{
  const h = fibula(3);
  const base = statsFor("knight", 1).maxHp;
  const camp = h.any.dungeon.camp;
  const regenAt = (x: number, y: number) => {
    h.p.x = x; h.p.y = y;
    h.p.hp = 10;
    h.any.regenMs = 0;
    h.advance(1000);
    return h.p.hp - 10;
  };
  // Longe da fogueira (no corredor do meio, ainda sem monstro por perto).
  const far = regenAt(h.any.dungeon.portal.x + 1, h.any.dungeon.portal.y - 7);
  check(far === Math.round(base * FLAT_HP_REGEN), `regen fixa no nível 1 devia ser ${Math.round(base * FLAT_HP_REGEN)} (veio ${far})`);
  const fire = regenAt(camp.x + 1, camp.y);
  check(fire === Math.round(base * FLAT_HP_REGEN * CAMP_REGEN), `na fogueira devia ser ${Math.round(base * FLAT_HP_REGEN * CAMP_REGEN)} (veio ${fire})`);
  h.p.level = 15;
  const lvl15 = regenAt(h.any.dungeon.portal.x + 1, h.any.dungeon.portal.y - 7);
  const want15 = Math.round(base * FLAT_HP_REGEN * (1 + FLAT_REGEN_PER_LEVEL * 14));
  check(lvl15 === want15, `no nível 15 devia ser ${want15} (veio ${lvl15})`);
  const pct1 = (far / base) * 100;
  const pct15 = (lvl15 / statsFor("knight", 15).maxHp) * 100;
  check(pct15 < pct1, "a regen devia valer mais (em %) no começo que no fim");
  console.log(`  ✔ regen fixa: ${far}/s no nível 1 (${pct1.toFixed(1)}%), ${lvl15}/s no 15 (${pct15.toFixed(1)}%), ${fire}/s na fogueira`);
}

// --- Telemetria: recuo e tempo por anel ---------------------------------------------------
{
  const h = fibula(8);
  const stats = h.any.seats.get(HERO).stats.ground;
  const ring0 = h.any.dungeon.path[0];
  h.p.x = ring0.x + 1; h.p.y = ring0.y + 1;
  h.p.hp = h.p.maxHp = 1_000_000;
  h.advance(3000);
  check((stats.ring_0_s ?? 0) >= 2, `devia contar o tempo no anel 1 (veio ${JSON.stringify(stats)})`);
  h.p.hp = 10;
  h.safe();
  h.advance(1100);
  check(stats.recuos === 1, `chegar ferido à fogueira devia contar um recuo (veio ${JSON.stringify(stats)})`);
  h.p.hp = h.p.maxHp;
  h.advance(2000);
  check(stats.recuos === 1, "ficar na fogueira não conta outro recuo");
  console.log(`  ✔ telemetria: ${stats.ring_0_s}s no anel 1, ${stats.recuos} recuo`);
}

// --- Sem tempo ---------------------------------------------------------------------------
{
  const h = fibula(5);
  h.p.hp = h.p.maxHp = 1_000_000;
  h.safe();
  h.advance(5 * 60_000);
  check(h.p.status === "playing", "a Fíbula não devia acabar nos 4 min da Cripta");
  check(h.state.timeLeft === OPEN_HUNT_MAX_SECONDS - 300, `o relógio devia contar até o teto (veio ${h.state.timeLeft})`);
  check(MAPS.fibula.durationSeconds === 0 && MONSTERS.boneKing.rank === "boss", "Fíbula sem tempo, com boss");
  console.log("  ✔ sem tempo: 5 min de hunt e o herói segue lá dentro");
}

console.log("TERRENO OK");
