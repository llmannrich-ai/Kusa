/**
 * Ritmo dos mapas fixos (`docs/GDD.md`, "Mapas fixos"): o herói não pode andar muito sem encontrar inimigos. Para cada
 * mapa fixo, conta a distância a pé (4 direções) de cada tile andável até o ponto de luta mais perto (as zonas, as
 * emboscadas, as salas laterais e a arena do boss) e confere:
 * - no máximo `FAR_SHARE` do chão andável a mais de `NEAR` tiles de uma luta (o alcance de aggro dos monstros);
 * - nenhum tile a mais de `MAX_GAP` tiles (≈5 s de caminhada);
 * - toda luta, sala e o boss alcançáveis da entrada.
 * A entrada conta como ponto de chegada (sem monstros de propósito, `START_ZONE_RADIUS`: é por onde todos começam).
 * Uso: npx tsx apps/server/scripts/ritmo.ts
 */
import { MAPS, generateDungeon, isWalkable, type MapId } from "@kusa/shared";

const FIXED: MapId[] = ["bog", "badlands"];
const NEAR = 6;
const FAR_SHARE = 0.1;
const MAX_GAP = 15;

let failed = false;
for (const id of FIXED) {
  const d = generateDungeon(1, id);
  const W = d.width, N = d.tiles.length;
  const walk = (i: number) => isWalkable(d, i % W, Math.floor(i / W));
  const spots: number[] = [];
  for (const r of [...d.path, ...d.meadows, ...d.side, d.boss, d.spawn])
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x >= 0 && y >= 0 && x < W && walk(y * W + x)) spots.push(y * W + x);
  const bfs = (from: number[]) => {
    const dist = new Int32Array(N).fill(-1);
    const q = [...from];
    for (const f of from) dist[f] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      for (const n of [c - 1, c + 1, c - W, c + W]) if (n >= 0 && n < N && dist[n] < 0 && walk(n)) { dist[n] = dist[c] + 1; q.push(n); }
    }
    return dist;
  };
  const near = bfs(spots);
  const fromPortal = bfs([d.portal.y * W + d.portal.x]);
  let all = 0, far = 0, worst = 0;
  for (let i = 0; i < N; i++) {
    if (!walk(i) || fromPortal[i] < 0) continue;
    all++;
    if (near[i] > NEAR) far++;
    worst = Math.max(worst, near[i]);
  }
  const unreachable = [...d.path, ...d.meadows, ...d.side, d.boss].filter((r) => {
    const cx = r.x + Math.floor(r.w / 2), cy = r.y + Math.floor(r.h / 2);
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (fromPortal[y * W + x] >= 0) return false;
    return true;
  });
  const share = far / all;
  const ok = share <= FAR_SHARE && worst <= MAX_GAP && unreachable.length === 0;
  if (!ok) failed = true;
  console.log(`${ok ? "✔" : "✘"} ${MAPS[id].name}: ${all} tiles andáveis, ${(share * 100).toFixed(1)}% a mais de ${NEAR} tiles de luta (máx. ${FAR_SHARE * 100}%), ponto mais isolado ${worst} tiles (máx. ${MAX_GAP})${unreachable.length ? `, ${unreachable.length} luta(s) inalcançável(is)` : ""}`);
}
if (failed) process.exit(1);
console.log("RITMO OK");
