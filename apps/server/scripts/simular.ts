/**
 * Hunts simuladas para a telemetria: o piloto automático (`piloto.ts`) joga hunts inteiras, sem servidor e sem rede,
 * com a mesma `Hunt` do jogo, em todas as classes, mapas e perfis de jogador. Cada hunt vira uma linha em
 * `telemetry_sim_runs` (mesmo formato de `telemetry_runs`, mais `sim` com o perfil): o ranking, o histórico, o painel e
 * as views de balanceamento continuam só com os jogadores reais; `telemetry_all` junta as duas com `simulated`.
 *
 * Perfis (`PERFIS`): o que muda é o que o jogador leva para a hunt.
 *   - novato: sem equipamento e com as magias iniciais;
 *   - medio: o melhor equipamento comum até o nível 3;
 *   - veterano: o melhor equipamento do jogo e o Grimório inteiro no nível máximo.
 * A seed de cada hunt sorteia o mapa gerado, os sorteios da hunt e as escolhas do piloto (magias e melhorias): a
 * mesma seed dá a mesma hunt.
 *
 * Uso (de dentro de apps/server): npx tsx scripts/simular.ts [--hunts N] [--classes a,b] [--mapas a,b] [--perfis a,b]
 * *   [--seed S] [--gravar]   (SIM_DEBUG=1 lista cada hunt: desfecho, morte, profundidade, boss)
 * Sem `--gravar`, só mostra o resumo. Com `--gravar`, precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY; o build
 * vem de `KUSA_BUILD` (no CI, o commit).
 */
import { randomUUID } from "node:crypto";
import { CLASS_IDS, MAP_IDS, createRng, type ClassId, type MapId } from "@kusa/shared";
import { EM_OBRAS, PERFIS, PILOTO_VERSAO, play, type Perfil } from "./piloto.ts";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const list = <T extends string>(name: string, all: readonly T[]) => (opt(name)?.split(",").filter((x) => all.includes(x as T)) as T[] | undefined) ?? [...all];
const huntsPer = Math.max(1, Number(opt("hunts") ?? 2));
const classes = list<ClassId>("classes", CLASS_IDS);
const maps = list<MapId>("mapas", MAP_IDS.filter((m) => !EM_OBRAS.includes(m)));
const perfis = list<Perfil>("perfis", PERFIS);
const baseSeed = Number(opt("seed") ?? Date.now() % 2 ** 31);
const gravar = args.includes("--gravar");
const BUILD = process.env.KUSA_BUILD?.slice(0, 7) ?? "dev";

const runs: { classId: ClassId; mapId: MapId; perfil: Perfil; seed: number }[] = [];
const rng = createRng(baseSeed);
for (const mapId of maps) for (const classId of classes) for (const perfil of perfis) {
  for (let i = 0; i < huntsPer; i++) runs.push({ classId, mapId, perfil, seed: Math.floor(rng.next() * 2 ** 31) });
}
console.log(`simulação: ${runs.length} hunts (${maps.length} mapas × ${classes.length} classes × ${perfis.length} perfis × ${huntsPer}), seed ${baseSeed}${gravar ? ", gravando" : ""}`);

const start = Date.now();
const rows: any[] = [];
const errors: string[] = [];
for (const run of runs) {
  try {
    const sim = play(run.classId, run.mapId, run.perfil, run.seed);
    if (!sim) { errors.push(`${run.mapId} ${run.classId} ${run.perfil} seed ${run.seed}: a hunt não terminou`); continue; }
    const { report: r } = sim;
    r.stats.bossClear ||= sim.cleared;
    rows.push({
      match_id: randomUUID(), profile_id: null, player_name: r.name, class_id: r.classId, party_size: r.partySize,
      map_id: r.mapId, seed: r.seed, build: BUILD, outcome: r.outcome, abandoned: false, level: r.level,
      duration_s: Math.round(r.durationS * 10) / 10, loot: r.loot,
      max_depth: Math.max(-1, ...Object.keys(r.stats.depthAt).map(Number)), path_rooms: r.pathRooms,
      killed_by: r.stats.death?.by ?? null, stats: r.stats, solo: false,
      sim: { perfil: run.perfil, piloto: PILOTO_VERSAO, seed: run.seed },
    });
  } catch (err) {
    errors.push(`${run.mapId} ${run.classId} ${run.perfil} seed ${run.seed}: ${(err as Error).stack?.split("\n").slice(0, 3).join(" ")}`);
  }
}
console.log(`${rows.length} hunts em ${((Date.now() - start) / 1000).toFixed(0)}s${errors.length ? `, ${errors.length} com erro` : ""}`);

// Resumo: vitórias, nível e loot por mapa, classe e perfil.
const groups = new Map<string, any[]>();
for (const row of rows) {
  const key = `${row.map_id.padEnd(7)} ${row.class_id.padEnd(9)} ${row.sim.perfil.padEnd(9)}`;
  groups.set(key, [...(groups.get(key) ?? []), row]);
}
console.log("\nmapa    classe    perfil    hunts vitória nível  loot  morreu para");
for (const [key, g] of [...groups].sort()) {
  const avg = (f: (r: any) => number) => g.reduce((s, r) => s + f(r), 0) / g.length;
  const killers = [...new Set(g.map((r) => r.killed_by).filter(Boolean))].join(", ");
  console.log(`${key} ${String(g.length).padStart(5)} ${(avg((r) => r.outcome === "completed" ? 100 : 0).toFixed(0) + "%").padStart(7)} ${avg((r) => r.level).toFixed(1).padStart(5)} ${avg((r) => r.loot).toFixed(0).padStart(5)}  ${killers}`);
}
for (const e of errors.slice(0, 20)) console.error(`ERRO ${e}`);

if (gravar) {
  const { supabase } = await import("../src/supabase.ts");
  if (!supabase) throw new Error("--gravar precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("telemetry_sim_runs").insert(rows.slice(i, i + 200));
    if (error) throw new Error(`falha ao gravar: ${error.message}`);
  }
  console.log(`\n${rows.length} linhas gravadas em telemetry_sim_runs (build ${BUILD}).`);
}
if (process.env.SIM_DEBUG) for (const r of rows) console.log(r.class_id, r.map_id, r.sim.seed, r.sim.perfil, r.outcome, "lvl", r.level, "morte", JSON.stringify(r.stats.death), "prof", r.max_depth, "/", r.path_rooms, "boss", JSON.stringify(r.stats.bossKills), "dur", r.duration_s, "kills", Object.values(r.stats.kills).reduce((a: number, b: any) => a + b, 0), "pot", JSON.stringify(r.stats.potions.drunk), "dano", JSON.stringify(r.stats.damageTaken));
if (errors.length) process.exit(1);
