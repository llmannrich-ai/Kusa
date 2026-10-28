/**
 * Teste do piloto automático das hunts simuladas (`piloto.ts`), sem servidor: com seeds fixas, o piloto joga hunts
 * inteiras e
 *   - toda hunt termina (morto, fugindo, soterrado ou pelo portal do boss), sem erro;
 *   - o veterano (melhor equipamento e Grimório inteiro) vence a Cripta e o Mar de Areia (que tem o covil no
 *     subterrâneo) com pelo menos 3 das 4 classes: se não vence, o piloto se perdeu (mapa novo, portal, caverna) ou
 *     uma mudança de regra quebrou o caminho até o boss;
 *   - o novato também termina as hunts dele (morre ou foge cedo, mas não trava).
 * Se uma mudança de balanceamento fizer o veterano perder uma destas, rode `npx tsx scripts/simular.ts --mapas <mapa>`
 * para ver se é o piloto ou o jogo; ajuste o piloto (e suba `PILOTO_VERSAO`) ou troque a seed aqui.
 * Uso: npx tsx apps/server/scripts/simulacao.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { CLASS_IDS, type MapId } from "@kusa/shared";
import { play, type Perfil } from "./piloto.ts";

const SEED = 4242;
const failures: string[] = [];
let hunts = 0;

for (const [mapId, perfil, minWins] of [["crypt", "veterano", 3], ["desert", "veterano", 3], ["crypt", "novato", 0]] as [MapId, Perfil, number][]) {
  let wins = 0;
  for (const classId of CLASS_IDS) {
    const label = `${mapId} ${classId} ${perfil} (seed ${SEED})`;
    try {
      const sim = play(classId, mapId, perfil, SEED);
      hunts++;
      if (!sim) { failures.push(`${label}: a hunt não terminou`); continue; }
      const { outcome, level, durationS } = sim.report;
      console.log(`  ${outcome === "completed" ? "✔" : "·"} ${label}: ${outcome}, nível ${level}, ${Math.round(durationS)}s`);
      if (outcome === "completed") wins++;
    } catch (err) {
      failures.push(`${label}: ${(err as Error).stack?.split("\n").slice(0, 4).join(" ")}`);
    }
  }
  if (wins < minWins) failures.push(`${mapId} ${perfil}: venceu com ${wins} de ${CLASS_IDS.length} classes (mínimo ${minWins})`);
}

if (failures.length) {
  console.error(`FALHOU (${hunts} hunts):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`SIMULAÇÃO OK: ${hunts} hunts do piloto automático`);
