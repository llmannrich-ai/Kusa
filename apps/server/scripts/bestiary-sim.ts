/**
 * Simulador de balanceamento do Bestiário (não é teste: não entra no `all.ts`). Roda a `Hunt` sem rede, põe um herói
 * de cada classe sozinho contra cada monstro do mapa e mede, só com o ataque básico (sem magias, poções nem
 * melhorias), em quanto tempo o herói mata o monstro e quanto da vida dele o monstro tira. Serve de linha de base
 * para comparar antes e depois de mexer nos números (`docs/BESTIARIO_PLANO.md`, seção 8).
 *
 * Uso (de dentro de apps/server, pelos decorators do schema):
 *   npx tsx scripts/bestiary-sim.ts [mapa] [repetições]
 */
import {
  CLASS_IDS, MAPS, MAP_IDS, MONSTERS, generateDungeon, mapMonsters, hasLineOfSight, isWalkable, tileDistance,
  type ClassId, type MapId, type MonsterKind,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { nextStep } from "../src/pathfinding.ts";
import { DungeonState } from "../src/state.ts";

const onlyMap = process.argv[2] as MapId | undefined;
const RUNS = Number(process.argv[3] ?? 6);
const TICK = 50;
const LIMIT_MS = 120_000;

/** Nível típico do herói ao encontrar o monstro (comuns no meio do mapa, mini-boss, boss). */
const LEVEL: Record<MapId, Record<"common" | "miniboss" | "boss", number>> = {
  crypt: { common: 3, miniboss: 5, boss: 6 },
  swamp: { common: 6, miniboss: 8, boss: 10 },
};
/** Profundidade típica (sala do caminho) de cada rank. */
const DEPTH: Record<MapId, Record<"common" | "miniboss" | "boss", number>> = {
  crypt: { common: 1, miniboss: 2, boss: 4 },
  swamp: { common: 3, miniboss: 4, boss: 7 },
};

interface Result { ttk: number; hpLost: number; died: boolean; timeout: boolean }

function duel(mapId: MapId, classId: ClassId, kind: MonsterKind, seed: number): Result {
  let clock = 0;
  const timers: { at: number; fn: () => void }[] = [];
  const host: HuntHost = {
    now: () => clock,
    setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
    send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {},
  };
  const rank = MONSTERS[kind].rank;
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId, seed, startLevel: LEVEL[mapId][rank] });
  hunt.join("h", { name: "Sim", classId, talents: {}, spellXp: {} });
  hunt.start("h");
  // Arena limpa: tira os monstros do mapa e põe só o duelista, a 4 tiles do herói, com linha de visão.
  const anyHunt = hunt as any;
  state.monsters.clear();
  anyHunt.brains.clear();
  const p = state.players.get("h")!;
  const d = generateDungeon(seed, mapId);
  let spot: { x: number; y: number } | null = null;
  for (let r = 4; r <= 8 && !spot; r++) {
    for (let oy = -r; oy <= r && !spot; oy++) {
      for (let ox = -r; ox <= r && !spot; ox++) {
        const x = p.x + ox;
        const y = p.y + oy;
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== r || !isWalkable(d, x, y) || !hasLineOfSight(d, p.x, p.y, x, y)) continue;
        spot = { x, y };
      }
    }
  }
  if (!spot) return { ttk: NaN, hpLost: NaN, died: false, timeout: true };
  const m = anyHunt.addMonster(kind, spot.x, spot.y, DEPTH[mapId][rank]);
  anyHunt.brains.get(m.id).targetId = "h";
  const startHp = p.maxHp;
  let lost = 0;
  let lastHp = p.hp;
  hunt.target("h", { id: m.id });
  hunt.attacking("h", { on: true });
  // O Mímico só se revela com o herói encostado.
  const range = classId === "knight" || MONSTERS[kind].traits?.mimic ? 1 : 4;
  for (let t = 0; t < LIMIT_MS; t += TICK) {
    clock += TICK;
    for (const timer of timers.filter((x) => x.at <= clock)) {
      timers.splice(timers.indexOf(timer), 1);
      timer.fn();
    }
    hunt.tick(TICK);
    if (p.hp < lastHp) lost += lastHp - p.hp;
    lastHp = p.hp;
    if (p.status !== "playing") return { ttk: t / 1000, hpLost: lost / startHp, died: true, timeout: false };
    const alive = state.monsters.get(m.id) ?? [...state.monsters.values()].find((o) => o.kind === kind);
    if (!alive) return { ttk: t / 1000, hpLost: lost / startHp, died: false, timeout: false };
    if (alive.id !== m.id) hunt.target("h", { id: alive.id });
    // Persegue o monstro até ficar ao alcance (o artilheiro foge).
    if (tileDistance(p.x, p.y, alive.x, alive.y) > range || !hasLineOfSight(d, p.x, p.y, alive.x, alive.y)) {
      const blocked = new Set<number>([...state.monsters.values()].map((o) => o.y * d.width + o.x));
      const step = nextStep(d, p, alive, range, (x, y) => blocked.has(y * d.width + x));
      if (step) hunt.move("h", { dx: (step.x - p.x) as -1 | 0 | 1, dy: (step.y - p.y) as -1 | 0 | 1 });
    }
  }
  return { ttk: LIMIT_MS / 1000, hpLost: lost / startHp, died: false, timeout: true };
}

function kindsOf(mapId: MapId): MonsterKind[] {
  return mapMonsters(MAPS[mapId]);
}

for (const mapId of onlyMap ? [onlyMap] : MAP_IDS) {
  console.log(`\n=== ${MAPS[mapId].name} (${RUNS} duelos por par; tempo para matar em s / vida perdida / mortes) ===`);
  console.log(["monstro".padEnd(18), ...CLASS_IDS.map((c) => c.padEnd(24))].join(""));
  for (const kind of kindsOf(mapId)) {
    const cells: string[] = [];
    for (const classId of CLASS_IDS) {
      const results = Array.from({ length: RUNS }, (_, i) => duel(mapId, classId, kind, 1000 + i * 7919));
      const ok = results.filter((r) => !Number.isNaN(r.ttk));
      const avg = (f: (r: Result) => number) => ok.reduce((sum, r) => sum + f(r), 0) / Math.max(1, ok.length);
      const deaths = ok.filter((r) => r.died).length;
      const timeouts = ok.filter((r) => r.timeout).length;
      cells.push(`${avg((r) => r.ttk).toFixed(1)}s ${Math.round(avg((r) => r.hpLost) * 100)}% ${deaths}†${timeouts ? ` ${timeouts}⏱` : ""}`.padEnd(24));
    }
    console.log([`${MONSTERS[kind].name}`.slice(0, 17).padEnd(18), ...cells].join(""));
  }
}
process.exit(0);
