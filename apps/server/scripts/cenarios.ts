/**
 * Teste da arte de cenário no padrão novo (128 px por tile, por código; `docs/CENARIOS_PLANO.md`), sem servidor nem
 * navegador (os pintores só usam arrays). Para cada cenário padronizado, pinta as peças e confere:
 * - nenhuma peça dá erro nem sai vazia;
 * - a pintura não usa `Math.random` (o mesmo desenho em todo aparelho) e dá o mesmo resultado duas vezes;
 * - o chão emenda: a última coluna do tile encosta na primeira (e a última linha na primeira) sem degrau visível;
 * - nenhuma peça passa de `PIECE_MS` (o celular é ≈5× mais lento que o CI);
 * - o atlas de cada mapa cabe no limite de textura do celular (4096 px), em várias seeds;
 * - nenhuma peça mudou sem querer: a impressão digital de cada uma fica em `cenarios.json`. Mexer no pintor de um mapa
 *   (para fazer outro, por exemplo) não pode mudar o desenho dos mapas prontos.
 * Mapa novo no padrão entra em `SCENERY` com as suas peças; peça nova entra sozinha no `cenarios.json`.
 * Uso: npx tsx apps/server/scripts/cenarios.ts            (confere)
 *      npx tsx apps/server/scripts/cenarios.ts --atualizar (mudou o desenho de propósito: grava as impressões novas)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { MAP_IDS, generateDungeon, type MapId } from "@kusa/shared";
import { HD, TileAtlas } from "../../client/src/art/paint.ts";
import { planForest } from "../../client/src/forestPlan.ts";
import { planCave } from "../../client/src/cavePlan.ts";
import {
  FLAT_DECOR as CAVE_FLAT, TALL_DECOR as CAVE_TALL, caveMouth, caveShaft, flatDecor as caveFlat, floorTile as caveFloor, poolTile, rockTile,
  tallDecor as caveTall,
} from "../../client/src/art/caveArt.ts";
import { ruinTile, waterTile as duneWater } from "../../client/src/art/duneArt.ts";
import { PROP_PIECES } from "../../client/src/art/propsArt.ts";
import {
  FLAT_DECOR as DUNE_FLAT, TALL_DECOR as DUNE_TALL, draw as dune, flatDecor as duneFlat, palmCrown, palmTrunk, pillar,
  tallDecor as duneTall, type DuneVariant,
} from "../../client/src/art/duneArt.ts";
import {
  FLAT_DECOR as FOREST_FLAT, OPEN, SPECIES, TALL_DECOR as FOREST_TALL, boardTile, bridgeTile, canopyTile, dirtTile, draw as forest,
  flatDecor as forestFlat, giant, heartTree, litterEdge, logTile, mudEdge, shadowEdge, stone, tallDecor as forestTall, tree,
  wallTile, waterTile, type ForestVariant,
} from "../../client/src/art/forestArt.ts";
import { FLAT_DECOR as EMPIRE_FLAT, flatDecor as empireFlat, grassTile } from "../../client/src/art/empireArt.ts";
import { COLUMN_KINDS, SMALL_DECOR, columnSprite, smallDecor, statueSprite, tombSprite } from "../../client/src/art/empireMonuments.ts";
import { pavingFringe, pavingTile, ruinColumn, ruinFlat, ruinMosaic, ruinRubble, ruinSmall, ruinWall } from "../../client/src/art/swampArt.ts";

/** Tempo máximo de uma peça do tamanho de uma árvore (256×384) no CI; peça maior ganha tempo na proporção da área. */
const PIECE_MS = 400;
const TREE_AREA = 256 * 384;

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
  { name: "pedra", draw: () => stone(variant, false, 1).image },
  ...[0, OPEN.s, OPEN.s | OPEN.e | OPEN.se, OPEN.n | OPEN.w].map((m) => ({ name: `copa ${m}`, draw: () => canopyTile(variant, m, 0).render(true) })),
  { name: "copa miolo 2", draw: () => canopyTile(variant, 0, 2).render(true) },
  ...[0, OPEN.n | OPEN.w, OPEN.s].map((m) => ({ name: `água ${m}`, draw: () => waterTile(variant, m, 1).render(false) })),
  ...[OPEN.e | OPEN.w, OPEN.n | OPEN.s, 0, OPEN.e].map((m) => ({ name: `tronco ${m}`, draw: () => logTile(variant, m, 0).render(true) })),
  ...[OPEN.n, OPEN.n | OPEN.e].map((m) => ({ name: `trilha ${m}`, draw: () => dirtTile(variant, m).render(false) })),
  { name: "barro", draw: () => mudEdge(variant, OPEN.n | OPEN.w).render(false) },
  { name: "folhas", draw: () => litterEdge(variant, OPEN.n).render(true) },
  { name: "sombra", draw: () => shadowEdge(variant, OPEN.n | OPEN.w) },
  ...([-1, 0, 1] as const).map((side) => ({ name: `ponte ${side}`, draw: () => bridgeTile(variant, side, 0).render(false) })),
  { name: "muro", draw: () => wallTile(variant, OPEN.e | OPEN.w, true, 0).render(true) },
  { name: "anciã", draw: () => giant(variant, 0).crown },
  ...(variant === "heartwood" ? [{ name: "árvore do coração", draw: () => heartTree(variant).trunk }] : []),
];

const SCENERY: Record<string, Piece[]> = {
  "Objetos comuns": Object.entries(PROP_PIECES).map(([name, draw]) => ({ name, draw })),
  "Dunas Cantantes": dunes("dunes"),
  "Mesas de Solária": dunes("mesas"),
  "Bosque Velho": woods("oldwood"),
  "Coração da Mata": woods("heartwood"),
  "Pântano do Kosaradius": [
    ...woods("marsh"),
    ...range(3).map((v) => ({ name: `água do miolo ${v}`, draw: () => waterTile("marsh", 0, v + 3).render(false) })),
    ...[0, 5, 10, 15].map((q) => ({ name: `capim do pântano ${q}`, draw: forest.wetGrass("marsh", q) })),
    ...[0, OPEN.w, OPEN.e | OPEN.w].map((e) => ({ name: `passarela leste-oeste ${e}`, draw: () => boardTile("marsh", true, e, 0).render(true) })),
    ...[0, OPEN.n].map((e) => ({ name: `passarela norte-sul ${e}`, draw: () => boardTile("marsh", false, e, 1).render(true) })),
  ],
  "Pântano das Ruínas": [
    ...woods("swamp"),
    ...range(4).map((q) => ({ name: `lajes ${q}`, draw: () => pavingTile(q) })),
    ...[OPEN.n, OPEN.s | OPEN.e].map((m) => ({ name: `capim nas lajes ${m}`, draw: () => pavingFringe(m) })),
    ...[[2 | 8, 56, 0], [1 | 4, 82, 26], [0, 56, 0]].map(([l, h, st]) => ({ name: `muro ${l}-${h}-${st}`, draw: () => ruinWall(l, h, st, 1) })),
    ...(["ionic", "broken", "stump"] as const).map((k) => ({ name: `coluna ${k}`, draw: () => ruinColumn(k, 0) })),
    { name: "entulho", draw: () => ruinRubble(1) },
    { name: "entulho na água", draw: () => ruinRubble(2, true) },
    ...(["head", "urns"] as const).map((k) => ({ name: `enfeite de pé ${k}`, draw: () => ruinSmall(k, 0) })),
    ...(["shards", "inscription", "puddle"] as const).map((k) => ({ name: `enfeite ${k}`, draw: () => ruinFlat(k, 0) })),
    { name: "mosaico", draw: ruinMosaic },
  ],
  "Caverna da Travessia": [
    ...[0, 5, 10, 15].flatMap((q) => [
      { name: `chão ${q}`, draw: () => caveFloor("cavern", q) },
      { name: `chão do covil ${q}`, draw: () => caveFloor("cavern", q, true) },
      { name: `rocha funda ${q}`, draw: () => rockTile("cavern", 0, q) },
    ]),
    ...[OPEN.s, OPEN.s | OPEN.e | OPEN.se, OPEN.n | OPEN.w].map((m) => ({ name: `rocha ${m}`, draw: () => rockTile("cavern", m, 1) })),
    ...[0, OPEN.n | OPEN.w].map((m) => ({ name: `poça ${m}`, draw: () => poolTile("cavern", m, 0) })),
    ...CAVE_FLAT.map((k) => ({ name: `enfeite ${k}`, draw: () => caveFlat("cavern", k, 0) })),
    ...CAVE_TALL.map((k) => ({ name: `enfeite de pé ${k}`, draw: () => caveTall("cavern", k, 0) })),
  ],
  "Mar de Areia": [
    ...dunes("desert"),
    ...[0, 3, 5].map((v) => ({ name: `oásis ${v}`, draw: () => duneWater("desert", 0, v).render(false) })),
    { name: "muro soterrado", draw: () => ruinTile("desert", OPEN.e | OPEN.w, true, 0).render(false) },
    { name: "boca da caverna", draw: caveMouth },
    { name: "corda da saída", draw: () => caveShaft("desert") },
    ...[0, 6].map((q) => ({ name: `caverna: chão ${q}`, draw: () => caveFloor("desert", q) })),
    { name: "caverna: chão do salão", draw: () => caveFloor("desert", 2, true) },
    ...[0, OPEN.s].map((m) => ({ name: `caverna: rocha ${m}`, draw: () => rockTile("desert", m, 1) })),
    ...CAVE_FLAT.map((k) => ({ name: `caverna: enfeite ${k}`, draw: () => caveFlat("desert", k, 0) })),
    ...CAVE_TALL.map((k) => ({ name: `caverna: enfeite de pé ${k}`, draw: () => caveTall("desert", k, 0) })),
  ],
  "Portões do Império": [
    ...range(4).map((v) => ({ name: `capim ${v}`, draw: () => grassTile(v).render(false), seam: true })),
    ...EMPIRE_FLAT.map((k) => ({ name: `enfeite ${k}`, draw: () => empireFlat(k, 0).render(false) })),
    ...SMALL_DECOR.map((k) => ({ name: `enfeite de pé ${k}`, draw: () => smallDecor(k, 0) })),
    ...COLUMN_KINDS.map((k) => ({ name: `coluna ${k}`, draw: () => columnSprite(k, 0) })),
    { name: "estátua", draw: () => statueSprite("guard", 0) },
    { name: "túmulo", draw: () => tombSprite(0) },
  ],
};

const DIGESTS = new URL("./cenarios.json", import.meta.url);
const update = process.argv.includes("--atualizar");
const saved: Record<string, number> = existsSync(DIGESTS) ? JSON.parse(readFileSync(DIGESTS, "utf8")) : {};
const digests: Record<string, number> = {};
let added = 0;

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

// Atlas dos mapas desenhados pelo plano da mata: cabe em 4096 px de altura (o limite de textura dos celulares).
const PLANNED: MapId[] = ["oldwood", "heartwood", "marsh", "swamp"];
for (const mapId of PLANNED.filter((m) => MAP_IDS.includes(m))) {
  let worst = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const { atlas } = planForest(generateDungeon(seed * 7919, mapId));
    worst = Math.max(worst, Math.ceil(atlas.count / TileAtlas.COLUMNS) * (HD + TileAtlas.PAD * 2));
  }
  if (worst > 4096) fail(`${mapId}: atlas de ${worst} px de altura (máximo 4096)`);
  console.log(`${mapId}: atlas de até ${worst} px de altura`);
}
{
  let worst = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const { atlas } = planCave(generateDungeon(seed * 7919, "cavern"), "cavern");
    worst = Math.max(worst, Math.ceil(atlas.count / TileAtlas.COLUMNS) * (HD + TileAtlas.PAD * 2));
  }
  if (worst > 4096) fail(`cavern: atlas de ${worst} px de altura (máximo 4096)`);
  console.log(`cavern: atlas de até ${worst} px de altura`);
  // Subterrâneo do Mar de Areia (a superfície usa o atlas das Dunas, medido no navegador: ≈1.700 px).
  let under = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const d = generateDungeon(seed * 7919, "desert");
    if (!d.cave) continue;
    const { atlas } = planCave(d, "desert", d.cave.under);
    under = Math.max(under, Math.ceil(atlas.count / TileAtlas.COLUMNS) * (HD + TileAtlas.PAD * 2));
  }
  if (under > 4096) fail(`desert (caverna): atlas de ${under} px de altura (máximo 4096)`);
  console.log(`desert (caverna): atlas de até ${under} px de altura`);
}

const random = Math.random;
let total = 0;
for (const [map, pieces] of Object.entries(SCENERY)) {
  let ms = 0;
  for (const piece of pieces) {
    const label = `${map} · ${piece.name}`;
    Math.random = () => { throw new Error("Math.random na pintura"); };
    try {
      // O tempo é o menor de duas pinturas: a primeira paga a compilação do pintor e a máquina pode estar ocupada.
      let t = performance.now();
      const first = piece.draw();
      const once = performance.now() - t;
      t = performance.now();
      const again = piece.draw();
      const spent = Math.min(once, performance.now() - t);
      ms += spent;
      const budget = PIECE_MS * Math.max(1, first.length / 4 / TREE_AREA);
      if (spent > budget) fail(`${label}: ${Math.round(spent)} ms (máximo ${Math.round(budget)})`);
      if (!first.some((v, i) => i % 4 === 3 && v > 0)) fail(`${label}: saiu vazia`);
      const h = digest(first);
      if (h !== digest(again)) fail(`${label}: duas pinturas diferentes`);
      digests[label] = h;
      if (!(label in saved)) added++;
      else if (saved[label] !== h && !update) fail(`${label}: o desenho mudou (se foi de propósito, rode com --atualizar)`);
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

// Grava as impressões: sempre com --atualizar; sem ele, só se entrou peça nova (e nada falhou).
if (update || (added && !failures.length)) {
  const sorted = Object.fromEntries(Object.keys(digests).sort().map((k) => [k, digests[k]]));
  writeFileSync(DIGESTS, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(update ? "impressões gravadas" : `${added} peça(s) nova(s) gravada(s) em cenarios.json`);
}

if (failures.length) {
  console.error(`\n${failures.length} falha(s):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`CENÁRIOS OK (${Math.round(total)} ms)`);
