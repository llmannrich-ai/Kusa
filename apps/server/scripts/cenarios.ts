/**
 * Teste da arte de cenário no padrão novo (128 px por tile, por código; `docs/CENARIOS_PLANO.md`), sem servidor nem
 * navegador (os pintores só usam arrays). Para cada cenário padronizado, pinta as peças e confere:
 * - nenhuma peça dá erro nem sai vazia;
 * - a pintura não usa `Math.random` (o mesmo desenho em todo aparelho) e dá o mesmo resultado duas vezes;
 * - o chão emenda: a última coluna do tile encosta na primeira (e a última linha na primeira) sem degrau visível;
 * - nenhuma peça passa de `PIECE_MS` (o celular é ≈5× mais lento que o CI).
 * Mapa novo no padrão entra em `SCENERY` com as suas peças.
 * Uso: npx tsx apps/server/scripts/cenarios.ts
 */
import { HD } from "../../client/src/art/paint.ts";
import { PROP_PIECES } from "../../client/src/art/propsArt.ts";
import {
  FLAT_DECOR as DUNE_FLAT, TALL_DECOR as DUNE_TALL, draw as dune, flatDecor as duneFlat, palmCrown, palmTrunk, pillar,
  tallDecor as duneTall, type DuneVariant,
} from "../../client/src/art/duneArt.ts";
import {
  FLAT_DECOR as FOREST_FLAT, SPECIES, TALL_DECOR as FOREST_TALL, draw as forest, flatDecor as forestFlat, stone,
  tallDecor as forestTall, tree, type ForestVariant,
} from "../../client/src/art/forestArt.ts";
import { FLAT_DECOR as EMPIRE_FLAT, flatDecor as empireFlat, grassTile } from "../../client/src/art/empireArt.ts";
import { COLUMN_KINDS, SMALL_DECOR, columnSprite, smallDecor, statueSprite, tombSprite } from "../../client/src/art/empireMonuments.ts";

/** Tempo máximo de uma peça no CI. */
const PIECE_MS = 400;

interface Piece {
  name: string;
  draw: () => Uint8ClampedArray;
  /** Chão de 128×128 que se repete: confere a emenda. */
  seam?: boolean;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const dunes = (variant: DuneVariant): Piece[] => [
  ...range(4).flatMap((v) => [
    { name: `areia ${v}`, draw: dune.sand(variant, v), seam: true },
    { name: `areia fofa ${v}`, draw: dune.soft(variant, v), seam: true },
  ]),
  ...DUNE_FLAT.map((k) => ({ name: `enfeite ${k}`, draw: () => duneFlat(variant, k, 0).render(false) })),
  ...DUNE_TALL.map((k) => ({ name: `enfeite de pé ${k}`, draw: () => duneTall(variant, k, 0) })),
  { name: "palmeira", draw: () => { const t = palmTrunk(variant, 0); return Uint8ClampedArray.from([...t.image, ...palmCrown(variant, 0, t.top)]); } },
  { name: "pilar", draw: () => pillar(variant, 0).image },
];
const woods = (variant: ForestVariant): Piece[] => [
  ...range(4).map((v) => ({ name: `capim ${v}`, draw: forest.grass(variant, v), seam: true })),
  ...FOREST_FLAT.map((k) => ({ name: `enfeite ${k}`, draw: () => forestFlat(variant, k, 0).render(false) })),
  ...FOREST_TALL.map((k) => ({ name: `enfeite de pé ${k}`, draw: () => forestTall(variant, k, 0) })),
  ...SPECIES[variant].map((s) => ({ name: `árvore ${s}`, draw: () => tree(variant, s, 0).crown })),
  { name: "menir", draw: () => stone(variant, true, 0).image },
];

const SCENERY: Record<string, Piece[]> = {
  "Objetos comuns": Object.entries(PROP_PIECES).map(([name, draw]) => ({ name, draw })),
  "Dunas Cantantes": dunes("dunes"),
  "Mesas de Solária": dunes("mesas"),
  "Bosque Velho": woods("oldwood"),
  "Coração da Mata": woods("heartwood"),
  "Portões do Império": [
    ...range(4).map((v) => ({ name: `capim ${v}`, draw: () => grassTile(v).render(false), seam: true })),
    ...EMPIRE_FLAT.map((k) => ({ name: `enfeite ${k}`, draw: () => empireFlat(k, 0).render(false) })),
    ...SMALL_DECOR.map((k) => ({ name: `enfeite de pé ${k}`, draw: () => smallDecor(k, 0) })),
    ...COLUMN_KINDS.map((k) => ({ name: `coluna ${k}`, draw: () => columnSprite(k, 0) })),
    { name: "estátua", draw: () => statueSprite("guard", 0) },
    { name: "túmulo", draw: () => tombSprite(0) },
  ],
};

const failures: string[] = [];
const fail = (msg: string) => { if (failures.length < 40) failures.push(msg); };

function digest(px: Uint8ClampedArray) {
  let h = 2166136261;
  for (let i = 0; i < px.length; i++) h = Math.imul(h ^ px[i], 16777619);
  return h >>> 0;
}

/** Diferença média de cor entre a coluna (ou linha) `a` e a `b`. */
function gap(px: Uint8ClampedArray, a: number, b: number, column: boolean) {
  let sum = 0;
  for (let k = 0; k < HD; k++) {
    const i = (column ? k * HD + a : a * HD + k) * 4, j = (column ? k * HD + b : b * HD + k) * 4;
    sum += Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]);
  }
  return sum / HD;
}

/** A emenda (última → primeira) não pode destoar muito do vizinho comum dentro do tile. */
function seamOk(px: Uint8ClampedArray, column: boolean) {
  let inside = 0;
  for (let k = 0; k < HD - 1; k++) inside += gap(px, k, k + 1, column);
  inside /= HD - 1;
  return gap(px, HD - 1, 0, column) <= inside * 2.5 + 12;
}

const random = Math.random;
let total = 0;
for (const [map, pieces] of Object.entries(SCENERY)) {
  let ms = 0;
  for (const piece of pieces) {
    const label = `${map} · ${piece.name}`;
    Math.random = () => { throw new Error("Math.random na pintura"); };
    try {
      const t = performance.now();
      const first = piece.draw();
      const spent = performance.now() - t;
      ms += spent;
      const again = piece.draw();
      if (spent > PIECE_MS) fail(`${label}: ${Math.round(spent)} ms (máximo ${PIECE_MS})`);
      if (!first.some((v, i) => i % 4 === 3 && v > 0)) fail(`${label}: saiu vazia`);
      if (digest(first) !== digest(again)) fail(`${label}: duas pinturas diferentes`);
      if (piece.seam) {
        if (first.length !== HD * HD * 4) fail(`${label}: chão fora de ${HD}×${HD}`);
        else {
          if (!seamOk(first, true)) fail(`${label}: degrau na emenda leste-oeste`);
          if (!seamOk(first, false)) fail(`${label}: degrau na emenda norte-sul`);
        }
      }
    } catch (e) {
      fail(`${label}: ${(e as Error).message}`);
    } finally {
      Math.random = random;
    }
  }
  total += ms;
  console.log(`${map}: ${pieces.length} peças em ${Math.round(ms)} ms`);
}

if (failures.length) {
  console.error(`\n${failures.length} falha(s):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`CENÁRIOS OK (${Math.round(total)} ms)`);
