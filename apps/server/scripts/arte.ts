/**
 * Teste da arte vestida dos heróis, sem servidor nem navegador (a pintura em `apps/client/src/art/hero`
 * só usa arrays):
 * - todo item do catálogo aparece no herói, em todas as classes e direções, sem erro;
 * - cada item tem o seu desenho: dois itens diferentes nunca dão o mesmo herói (o raro usa o desenho do
 *   comum; o brilho dele é animado no jogo), e o mágico é diferente do comum;
 * - nada sai do quadro (nenhum pixel encostado na borda de 48×48).
 * Uso: npx tsx apps/server/scripts/arte.ts
 */
import { CLASS_IDS, ITEMS, type ItemSlot } from "@kusa/shared";
import { heroFrame } from "../../client/src/art/hero/hero.ts";
import { HERO_DIRS, HERO_FRAMES } from "../../client/src/art/hero/rig.ts";
import { S } from "../../client/src/art/hero/raster.ts";

const NO: Record<ItemSlot, string> = { weapon: "", helmet: "", armor: "", legs: "", boots: "", shield: "" };
const failures: string[] = [];
const fail = (msg: string) => { if (failures.length < 40) failures.push(msg); };

/** Impressão digital de um herói: os quadros parados das 3 direções. */
function fingerprint(frames: Uint8ClampedArray[]) {
  let h = 2166136261;
  for (const f of frames) for (let i = 0; i < f.length; i++) h = Math.imul(h ^ f[i], 16777619);
  return h >>> 0;
}

function touchesBorder(f: Uint8ClampedArray) {
  for (let i = 0; i < S; i++) {
    for (const [x, y] of [[i, 0], [i, S - 1], [0, i], [S - 1, i]]) if (f[(y * S + x) * 4 + 3]) return true;
  }
  return false;
}

const started = Date.now();
const cut = new Set<string>();
let frames = 0;
for (const classId of CLASS_IDS) {
  const bare = fingerprint(HERO_DIRS.map((d) => heroFrame(classId, NO, d, 0)));
  const seen = new Map<number, string>();
  for (const item of Object.values(ITEMS)) {
    const outfit = { ...NO, [item.slot]: item.id };
    const views: Uint8ClampedArray[] = [];
    try {
      for (const dir of HERO_DIRS) {
        for (let f = 0; f < HERO_FRAMES; f++) {
          const frame = heroFrame(classId, outfit, dir, f);
          frames++;
          if (touchesBorder(frame) && !cut.has(`${classId}${item.id}`)) {
            cut.add(`${classId}${item.id}`);
            fail(`${classId} com ${item.id} sai do quadro (${dir} ${f})`);
          }
          if (f === 0) views.push(frame);
        }
      }
    } catch (err) {
      fail(`${classId} com ${item.id}: ${(err as Error).message}`);
      continue;
    }
    const print = fingerprint(views);
    if (print === bare) fail(`${item.id} não aparece no ${classId}`);
    // O raro tem de ser igual ao comum (mesmo desenho); o resto, único.
    if (item.rarity === "rare") {
      const common = seen.get(print);
      if (common !== item.id.replace(/-rare$/, "-common")) fail(`${item.id} deveria usar o desenho de ${item.id.replace(/-rare$/, "-common")} no ${classId}`);
      continue;
    }
    const other = seen.get(print);
    if (other) fail(`${item.id} e ${other} ficam iguais no ${classId}`);
    seen.set(print, item.id);
  }
}

console.log(`${Object.keys(ITEMS).length} itens × ${CLASS_IDS.length} classes: ${frames} quadros em ${Date.now() - started} ms`);
if (failures.length) {
  console.error(`FALHOU:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("OK: todo item tem a sua arte vestida, única e dentro do quadro.");
