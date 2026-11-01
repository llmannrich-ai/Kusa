/**
 * Teste da arte animada das invocações do Druida (`apps/client/src/art/summonCreatures.ts`), sem servidor nem
 * navegador (o desenho só usa arrays):
 * - todo clipe de toda criatura desenha todos os quadros, sem erro e sem quadro vazio;
 * - nada sai do quadro (nenhum pixel encostado na borda: asa, rabo ou garra cortados);
 * - a animação anda de verdade: no ciclo parado e no andar não há dois quadros seguidos iguais, e o golpe muda a pose.
 * Uso: npx tsx apps/server/scripts/invocacoes.ts
 */
import { MONSTERS, SUMMONS, type CreatureSummonKind, type SummonKind } from "@kusa/shared";
import { SUMMON_ART, SUMMON_FRAMES, drawSummon } from "../../client/src/art/summonCreatures.ts";
import { CLIP_ORDER } from "../../client/src/art/rig.ts";

const failures: string[] = [];
const fail = (msg: string) => { if (failures.length < 40) failures.push(msg); };

let frames = 0;
// O clã do Xamã Orc usa a arte dos monstros do clã (`look`), conferida no `arte` e no bestiário.
for (const kind of (Object.keys(SUMMONS) as SummonKind[]).filter((k): k is CreatureSummonKind => !SUMMONS[k].look)) {
  const art = SUMMON_ART[kind];
  if (!art) { fail(`${kind}: sem arte animada`); continue; }
  for (const clip of CLIP_ORDER) {
    const prints: string[] = [];
    for (let i = 0; i < SUMMON_FRAMES[clip]; i++) {
      const s = drawSummon(art, clip, i);
      frames++;
      const filled = s.cells.filter(Boolean).length;
      if (filled < 40) fail(`${kind} ${clip} ${i}: quadro quase vazio (${filled} px)`);
      for (let k = 0; k < s.w; k++) {
        for (const [x, y] of [[k, 0], [k, s.h - 1], [0, k], [s.w - 1, k]]) {
          if (s.get(x, y)) { fail(`${kind} ${clip} ${i}: encosta na borda em (${x}, ${y})`); k = s.w; break; }
        }
      }
      prints.push(s.cells.join(","));
    }
    if (clip === "idle" || clip === "walk") {
      prints.forEach((p, i) => { if (p === prints[(i + 1) % prints.length]) fail(`${kind} ${clip}: quadros ${i} e ${(i + 1) % prints.length} iguais`); });
    } else if (new Set(prints).size < 3) fail(`${kind} ${clip}: quase sem movimento`);
  }
}

for (const [kind, def] of Object.entries(SUMMONS)) {
  if (def.look && !MONSTERS[def.look]) fail(`${kind}: a arte ${def.look} não é de um monstro`);
}

if (failures.length) {
  console.error(`FALHOU (${frames} quadros):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(SUMMONS).length} invocações, ${frames} quadros animados dentro do quadro`);
