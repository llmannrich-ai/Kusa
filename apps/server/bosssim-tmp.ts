// Duelo herói sozinho (só ataque básico) contra um boss, por nível: base de comparação com a telemetria.
import { CLASS_IDS, MONSTERS, generateDungeon, hasLineOfSight, isWalkable, tileDistance, type ClassId, type MapId, type MonsterKind } from "@kusa/shared";
import { Hunt, type HuntHost } from "/home/user/Kusa/apps/server/src/hunt.ts";
import { nextStep } from "/home/user/Kusa/apps/server/src/pathfinding.ts";
import { DungeonState } from "/home/user/Kusa/apps/server/src/state.ts";
const TICK = 50, LIMIT = 150_000;
function duel(mapId: MapId, classId: ClassId, kind: MonsterKind, depth: number, level: number, seed: number) {
  let clock = 0; const timers: { at: number; fn: () => void }[] = [];
  const host: HuntHost = { now: () => clock, setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }), send: () => {}, broadcast: () => {}, runEnded: () => {}, ended: () => {} };
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId, seed, startLevel: level });
  hunt.join("h", { name: "S", classId, talents: {}, spellXp: {} }); hunt.start("h");
  const a = hunt as any; state.monsters.clear(); a.brains.clear();
  const p = state.players.get("h")!; const d = generateDungeon(seed, mapId);
  let spot: any = null;
  for (let r = 5; r <= 9 && !spot; r++) for (let oy = -r; oy <= r && !spot; oy++) for (let ox = -r; ox <= r && !spot; ox++) {
    const x = p.x + ox, y = p.y + oy;
    if (Math.max(Math.abs(ox), Math.abs(oy)) === r && isWalkable(d, x, y) && hasLineOfSight(d, p.x, p.y, x, y)) spot = { x, y };
  }
  if (!spot) return null;
  const m = a.addMonster(kind, spot.x, spot.y, depth); a.brains.get(m.id).targetId = "h";
  hunt.target("h", { id: m.id }); hunt.attacking("h", { on: true });
  const range = classId === "knight" ? 1 : 4;
  for (let t = 0; t < LIMIT; t += TICK) {
    clock += TICK;
    for (const tm of timers.filter((x) => x.at <= clock)) { timers.splice(timers.indexOf(tm), 1); tm.fn(); }
    hunt.tick(TICK);
    if (p.status !== "playing") return { win: false, t: t / 1000, left: m.hp / m.maxHp };
    const alive = [...state.monsters.values()].find((o) => o.kind === kind);
    if (!alive) return { win: true, t: t / 1000, left: p.hp / p.maxHp };
    if (alive.id !== m.id) hunt.target("h", { id: alive.id });
    hunt.attacking("h", { on: true });
    if (tileDistance(p.x, p.y, alive.x, alive.y) > range || !hasLineOfSight(d, p.x, p.y, alive.x, alive.y)) {
      const blocked = new Set<number>([...state.monsters.values()].map((o) => o.y * d.width + o.x));
      const step = nextStep(d, p, alive, range, (x, y) => blocked.has(y * d.width + x));
      if (step) hunt.move("h", { dx: (step.x - p.x) as any, dy: (step.y - p.y) as any });
    }
  }
  return { win: false, t: LIMIT / 1000, left: 1 };
}
const [mapId, kind, depth, levels] = process.argv.slice(2);
const RUNS = Number(process.env.RUNS ?? 5);
for (const level of levels.split(",").map(Number)) {
  const row: string[] = [];
  let total = 0, n = 0;
  for (const c of CLASS_IDS) {
    let sum = 0, k = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = duel(mapId as MapId, c, kind as MonsterKind, Number(depth), level, 1000 + i * 7919);
      if (!r) continue;
      const prog = r.win ? 1 + r.left : 1 - r.left; // >1: venceu (com a vida que sobrou); <1: parte do boss tirada
      sum += prog; k++;
    }
    total += sum; n += k;
    row.push(`${c.slice(0, 4)} ${Math.round(100 * sum / k)}%`);
  }
  console.log(`${kind.padEnd(12)} prof ${depth} nv ${String(level).padStart(2)}: progresso ${Math.round(100 * total / n)}%  | ${row.join("  ")}`);
}
process.exit(0);
