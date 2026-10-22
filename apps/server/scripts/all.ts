/**
 * Roda todos os testes de fumaça (`npm test`): sobe os servidores de teste em portas próprias, roda cada
 * script, mostra o resumo e derruba os servidores. Não precisa de servidor rodando antes.
 *
 * - Servidor normal: smoke, combat, items, maps, potions, perks e bag (e solo e arte, que não usam o servidor).
 * - Servidor com KUSA_START_LEVEL=8 (slots de magia abertos; o cavaleiro aguenta apanhar parado): spells, specials
 *   e magiaxp.
 * - Servidor com KUSA_START_LEVEL=8 e KUSA_ALL_SPELLS=1 (Grimório inteiro): grimorio e costelas.
 * - O mesmo com KUSA_MONSTER_HP=20 (monstros aguentam mais de um golpe): efeitos.
 *
 * Os bots caçam no nível 1 e às vezes morrem por azar. Só nesse caso (a hunt terminou com "died")
 * o teste roda de novo, até 5 vezes (o bot de nível 1 morre em cerca de
 * metade das hunts); qualquer outra falha conta na hora.
 * Uso: npm test  (ou npx tsx apps/server/scripts/all.ts [nome...] para rodar só alguns)
 */
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, "..");
const ATTEMPTS = 5;

interface Suite { port: number; env: Record<string, string>; tests: string[] }
const SUITES: Suite[] = [
  { port: 2610, env: {}, tests: ["smoke", "combat", "alvo", "items", "maps", "potions", "perks", "bag", "solo", "arte"] },
  { port: 2611, env: { KUSA_START_LEVEL: "8" }, tests: ["spells", "specials", "magiaxp"] },
  { port: 2612, env: { KUSA_START_LEVEL: "8", KUSA_ALL_SPELLS: "1" }, tests: ["grimorio", "costelas"] },
  { port: 2613, env: { KUSA_START_LEVEL: "8", KUSA_ALL_SPELLS: "1", KUSA_MONSTER_HP: "20" }, tests: ["efeitos"] },
];

const only = process.argv.slice(2);
const servers: ChildProcess[] = [];
const results: { name: string; ok: boolean; attempts: number; ms: number }[] = [];
process.on("exit", () => servers.forEach((s) => s.kill()));

for (const suite of SUITES) {
  const tests = suite.tests.filter((t) => only.length === 0 || only.includes(t));
  if (tests.length === 0) continue;
  const server = await startServer(suite.port, suite.env);
  for (const name of tests) results.push(await runTest(name, `http://localhost:${suite.port}`));
  server.kill();
}

console.log("\nResumo:");
for (const r of results) {
  const retry = r.attempts > 1 ? ` (${r.attempts} tentativas: o bot morreu por azar)` : "";
  console.log(`  ${r.ok ? "✔" : "✘"} ${r.name} ${Math.round(r.ms / 1000)}s${retry}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} teste(s) falharam: ${failed.map((r) => r.name).join(", ")}`);
  process.exit(1);
}
console.log("\nTODOS OK");
process.exit(0);

/** Sobe `src/index.ts` numa porta e espera ele começar a ouvir. */
function startServer(port: number, env: Record<string, string>) {
  return new Promise<ChildProcess>((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
      cwd: serverDir,
      // Sem Supabase: os testes rodam em modo convidado e não gravam nada no banco.
      env: { ...process.env, ...env, PORT: String(port), SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    servers.push(child);
    let log = "";
    const timer = setTimeout(() => reject(new Error(`o servidor da porta ${port} não subiu:\n${log}`)), 60_000);
    const onData = (chunk: Buffer) => {
      log += chunk;
      if (log.includes("Listening on")) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout!.on("data", onData);
    child.stderr!.on("data", onData);
    child.on("exit", (code) => reject(new Error(`o servidor da porta ${port} saiu (código ${code}):\n${log}`)));
  });
}

/** Roda um script de teste; repete só se a falha foi o bot morrer. */
async function runTest(name: string, url: string) {
  const start = Date.now();
  for (let attempt = 1; ; attempt++) {
    console.log(`\n▶ ${name}${attempt > 1 ? ` (tentativa ${attempt})` : ""}`);
    const { code, output } = await run(join(here, `${name}.ts`), url);
    const ok = code === 0;
    const botDied = !ok && /"outcome":"died"|\bDied\b/.test(output);
    if (ok || !botDied || attempt === ATTEMPTS) return { name, ok, attempts: attempt, ms: Date.now() - start };
  }
}

function run(script: string, url: string) {
  return new Promise<{ code: number; output: string }>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", script, url], { cwd: serverDir, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const timer = setTimeout(() => child.kill(), 10 * 60_000);
    child.stdout!.on("data", (chunk: Buffer) => { output += chunk; process.stdout.write(chunk); });
    child.stderr!.on("data", (chunk: Buffer) => { output += chunk; process.stderr.write(chunk); });
    child.on("exit", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, output }); });
  });
}
