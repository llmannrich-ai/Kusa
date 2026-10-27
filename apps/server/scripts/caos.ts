/**
 * Job de caos (`npm run test:caos`, todo dia no CI pelo `.github/workflows/caos.yml`): roda os testes da arena com
 * mapas e seeds sorteados, para achar por acaso o que o `npm test` (sempre a mesma seed) não pega: uma mecânica
 * que quebra só num canto do mapa, um sorteio raro, um teste que depende de um mapa só.
 * Não bloqueia PR. Quando falha, mostra o comando que reproduz a falha com a mesma seed: corrija o bug (ou o teste)
 * e, se valer, fixe esse cenário num caso do teste.
 * Uso: npx tsx apps/server/scripts/caos.ts [seeds por mapa e suíte, padrão 20] [suíte...]
 */
import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { appendFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAP_IDS } from "@kusa/shared";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, "..");
/** Testes que rodam numa arena e leem `KUSA_SEED` (o `bestiario` só nos sorteios; o mapa dele é fixo). */
const ARENA = ["efeitos", "grimorio", "costelas", "specials", "spells", "bestiario", "items", "bag"];

const [count = "20", ...only] = process.argv.slice(2);
const perMap = Math.max(1, Number(count) || 20);
const suites = only.length > 0 ? ARENA.filter((s) => only.includes(s)) : ARENA;

interface Run { suite: string; mapId: string; seed: number }
const runs: Run[] = [];
for (const suite of suites) {
  const maps = suite === "bestiario" ? ["crypt"] : MAP_IDS;
  for (const mapId of maps) for (let i = 0; i < perMap; i++) runs.push({ suite, mapId, seed: randomInt(1, 2 ** 31) });
}

console.log(`caos: ${runs.length} execuções (${suites.join(", ")}; ${perMap} seeds por mapa)`);
const failures: (Run & { error: string })[] = [];
let next = 0;
let done = 0;
const start = Date.now();
await Promise.all(Array.from({ length: Math.max(1, availableParallelism() - 1) }, async () => {
  while (next < runs.length) {
    const run = runs[next++];
    const { code, output } = await exec(run);
    done++;
    if (code !== 0) {
      const error = output.split("\n").filter((l) => /Error:|✘/.test(l)).slice(0, 5).join("\n") || output.slice(-500);
      failures.push({ ...run, error });
      console.log(`✘ ${run.suite} ${run.mapId} seed ${run.seed}\n${error}`);
    }
    if (done % 50 === 0) console.log(`  ${done}/${runs.length}`);
  }
}));

const secs = Math.round((Date.now() - start) / 1000);
console.log(`\n${runs.length - failures.length}/${runs.length} OK em ${secs}s`);
report();
process.exit(failures.length > 0 ? 1 : 0);

function exec(run: Run) {
  return new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", join(here, `${run.suite}.ts`)], {
      cwd: serverDir,
      env: { ...process.env, KUSA_SEED: String(run.seed), KUSA_MAP: run.mapId },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => child.kill(), 5 * 60_000);
    child.stdout!.on("data", (chunk: Buffer) => { output += chunk; });
    child.stderr!.on("data", (chunk: Buffer) => { output += chunk; });
    child.on("exit", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, output }); });
  });
}

/** Resumo no fim da execução do GitHub Actions (aba do job), com o comando que reproduz cada falha. */
function report() {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const lines = [`## Caos: ${runs.length - failures.length}/${runs.length} OK`, ""];
  if (failures.length === 0) lines.push(`Nenhuma falha em ${runs.length} mapas e seeds sorteados (${suites.join(", ")}).`);
  for (const f of failures) {
    lines.push(`### ✘ ${f.suite} (${f.mapId}, seed ${f.seed})`, "", "```", f.error, "```", "", "Reproduzir (de dentro de `apps/server`):", "",
      "```", `KUSA_MAP=${f.mapId} KUSA_SEED=${f.seed} npx tsx scripts/${f.suite}.ts`, "```", "");
  }
  appendFileSync(file, lines.join("\n") + "\n");
}
