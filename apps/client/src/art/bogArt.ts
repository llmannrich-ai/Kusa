import type { Rgb } from "./hero/color.ts";
import {
  FLAT, HD, Paper as Painter, ebox, ellipse, inEllipse, limb, line, lit, noise, palette, poly, smoothNoise, sn, sphere, worleyCells,
  type MaterialBase, type Pt,
} from "./paint.ts";
import { OPEN, distTo, field, fieldAt } from "./forestArt.ts";

/**
 * Arte do Charco Cinzento (Verdemar, etapa 9) no padrão novo (`paint.ts`, `docs/ARTE_TIBIA.md`): 128 px por tile, luz
 * de cima à esquerda, 4 tons por material, contorno quase preto nos objetos de pé. Uma turfeira coberta da cinza de um
 * incêndio antigo: capim-de-brejo cinza-oliva, urze malva, manchas de cinza e de turfa, poças negras que espelham o céu
 * branco, a mata morta (árvores secas prateadas, vistas de cima como um emaranhado de galhos), a estrada de basalto do
 * império, passarelas de tábuas, palafitas, monólitos com a runa que brilha e os braseiros de turfa. Só arrays: o teste
 * `cenarios` pinta tudo sem navegador.
 *
 * O chão é uma textura contínua de `BLOCK`×`BLOCK` tiles (cada tile pinta o seu pedaço, `blockPiece`): as manchas de
 * urze, de cinza e de capim seco correm sem emenda. As bordas (água, lama, estrada, mata) são pela distância até o tile
 * vizinho (`distTo`/`field` da mata), então emendam em qualquer combinação de vizinhos.
 */

/** Materiais (cada um é uma rampa de 6 tons). */
export enum B {
  Sedge, Dry, Heath, Peat, Ash, Under, Bark, Dead, Moss, Water, Deep, Sheen, Basalt, Stone, Lichen, Wood, Bone, Cotton, Reed,
  Berry, Cloth, Iron, Ember, Flame, Glow, Line, Mud,
}

const BASES: Record<B, MaterialBase> = {
  [B.Sedge]: ["#6b7360", 0.55, 5], [B.Dry]: ["#848266", 0.55, 5], [B.Heath]: ["#766870", 0.58, 6], [B.Peat]: ["#4f4237", 0.6, 5],
  [B.Ash]: ["#8d8c86", 0.45, 3], [B.Under]: ["#1b1d1d", 0.5, 4], [B.Bark]: ["#423e3a", 0.9, 4], [B.Dead]: ["#8c897f", 0.9, 4],
  [B.Moss]: ["#7e8b77", 0.8, 6], [B.Water]: ["#2d3b41", 0.7, 7], [B.Deep]: ["#172429", 0.7, 7], [B.Sheen]: ["#93a9b1", 0.5, 4],
  [B.Basalt]: ["#5f6062", 0.9, 4], [B.Stone]: ["#87898a", 1, 4], [B.Lichen]: ["#afb27a", 0.8, 6], [B.Wood]: ["#7d7367", 0.9, 5],
  [B.Bone]: ["#ddd6c4", 0.8, 5], [B.Cotton]: ["#efede5", 0.4, 3], [B.Reed]: ["#a8996a", 0.85, 6], [B.Berry]: ["#a83a2e", 0.9, 6],
  [B.Cloth]: ["#8e3e2c", 0.9, 6], [B.Iron]: ["#5a5450", 1, 4, true], [B.Ember]: ["#e0702a", 1.1, 8], [B.Flame]: ["#ffd060", 1.2, 10, true],
  [B.Glow]: ["#8ef0d8", 1.2, 10, true], [B.Line]: ["#121416", 0.4, 0], [B.Mud]: ["#5c5247", 0.55, 4],
};

let rampCache: Rgb[][] | null = null;
const ramps = () => (rampCache ??= palette(Object.values(B).filter((v): v is B => typeof v === "number").map((m) => BASES[m])));

class Paper extends Painter {
  constructor(w = HD, h = HD) { super(ramps(), w, h); }
}

export { OPEN };

/** O chão é uma textura contínua de `BLOCK`×`BLOCK` tiles. */
export const BLOCK = 4;
const PERIOD = HD * BLOCK;
/** Pedaço do bloco que o tile (x, y) usa. */
export const blockPiece = (x: number, y: number) => (((x % BLOCK) + BLOCK) % BLOCK) + BLOCK * (((y % BLOCK) + BLOCK) % BLOCK);
/** Ruído suave no pixel (x, y) do pedaço `q`, periódico no bloco inteiro. */
const bn = (q: number, x: number, y: number, cell: number, seed: number) =>
  smoothNoise(x + (q % BLOCK) * HD, y + Math.floor(q / BLOCK) * HD, cell, seed, PERIOD);
/** Tom do chão plano: no meio de uma faixa (o pontilhado da fronteira entre faixas vira uma trama na tela toda). */
const MID = 0.64;
const wrap = (v: number) => ((Math.round(v) % HD) + HD) % HD;

// --- Chão ---------------------------------------------------------------------------------

/** Folhinha de capim de 3 a 5 px (clara na ponta, escura no pé), por cima do que já está pintado. */
function blade(p: Paper, x: number, y: number, lean: number, tall: number, mat: number | null = null, wrapEdges = true) {
  const put = (px: number, py: number, tone: number) => wrapEdges ? p.on(wrap(px), wrap(py), mat, tone) : p.on(px, py, mat, tone);
  put(x, y, 5);
  put(x + (lean > 0 ? 0 : -1), y + 1, 4);
  if (tall > 2) put(x + lean, y + 2, 4);
  if (tall > 3) put(x + lean, y + 3, 3);
  put(x + (tall > 3 ? lean : 0), y + tall, 2);
}

/** Touceira de capim-de-brejo: um montinho escuro e as folhas abrindo em leque, as da frente mais claras. */
function tussock(p: Paper, cx: number, cy: number, r: number, v: number, dry: boolean, wrapEdges = true) {
  const put = (x: number, y: number, mat: number, tone: number) => wrapEdges ? p.on(wrap(x), wrap(y), mat, tone) : p.on(x, y, mat, tone);
  for (let y = Math.floor(cy - r * 0.5); y <= cy + r * 0.5; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if (((x - cx) / r) ** 2 + ((y - cy) / (r * 0.5)) ** 2 <= 1) put(x, y, B.Sedge, y > cy ? 1 : 2);
  const n = 9 + Math.floor(r);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI * (0.08 + 0.84 * ((k + noise(k, v, 30) * 0.6) / n));
    const len = r * (1.1 + noise(v, k, 31) * 0.8);
    const mat = dry && k % 3 === 0 ? B.Dry : k % 4 === 1 ? B.Dry : B.Sedge;
    for (let s = 0; s <= len; s++) {
      const t = s / len;
      const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s * 0.9 + t * t * 3;
      put(x, y, mat, t < 0.3 ? 2 : t < 0.75 ? 3 + (k % 2) : 5);
    }
  }
}

/**
 * Turfa do charco: capim-de-brejo cinza-oliva com manchas de urze malva, de capim seco, de cinza do incêndio e buracos de
 * turfa molhada, que correm sem emenda pelo bloco (`q`); por cima, o miúdo: folhinhas, touceiras, florzinhas de urze e
 * os pompons brancos do algodão-do-brejo.
 */
export function groundTile(q: number): Uint8ClampedArray {
  const p = new Paper();
  const v = q;
  p.fill([0, 0, HD - 1, HD - 1], () => true, B.Sedge, () => MID, (x, y) => {
    const n = noise(x, y, v * 7 + 12);
    return n < 0.07 ? -1 : n > 0.97 ? 1 : 0;
  });
  // Folhinhas (por cima de tudo, menos da cinza e da turfa molhada).
  for (let k = 0; k < 340; k++) {
    const x = Math.floor(noise(k, v, 19) * HD), y = Math.floor(noise(v, k, 20) * HD);
    const m = p.mat[y * HD + x];
    if (m === B.Peat || m === B.Ash) continue;
    blade(p, x, y, noise(k, k, 21) < 0.5 ? -1 : 1, noise(k, v + 1, 22) < 0.4 ? 4 : 2);
  }
  // Urze: florzinhas malva e pontinhos escuros nas manchas de urze.
  for (let k = 0; k < 160; k++) {
    const x = Math.floor(noise(k, v, 23) * HD), y = Math.floor(noise(v, k, 24) * HD);
    if (p.mat[y * HD + x] !== B.Heath) continue;
    p.on(x, y, B.Heath, 5); p.on(wrap(x + 1), y, B.Heath, 4); p.on(x, wrap(y + 1), B.Heath, 1);
  }
  // Brasas velhas e carvão na cinza.
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(noise(k, v, 25) * HD), y = Math.floor(noise(v, k, 26) * HD);
    if (p.mat[y * HD + x] !== B.Ash) continue;
    p.on(x, y, B.Under, 2); p.on(wrap(x + 1), y, B.Under, 1); if (k % 3 === 0) p.on(x, wrap(y + 1), B.Under, 3);
  }
  // Pedrinhas meio enterradas.
  for (let k = 0; k < 3; k++) {
    const cx = 10 + noise(k, q, 35) * 108, cy = 10 + noise(q, k, 36) * 108, r = 2.5 + noise(k, k + q, 37) * 2.5;
    ellipse(p, cx, cy, r * 1.3, r, B.Stone);
    p.on(cx - r * 0.5, cy - r * 0.5, B.Stone, 5);
    for (let x = -r; x <= r; x++) p.on(cx + x, cy + r + 1, B.Sedge, 1);
  }
  // Touceiras: 5 por tile, presas ao pedaço (não repetem lado a lado).
  for (let k = 0; k < 5; k++) {
    const cx = 12 + noise(k, q, 27) * 104, cy = 14 + noise(q, k, 28) * 104;
    tussock(p, cx, cy, 7 + noise(k, q, 29) * 6, q * 5 + k, k % 3 === 2);
  }
  // Algodão-do-brejo: hastes finas com o pompom branco, em grupinhos.
  if (noise(q, 1, 32) < 0.6)
    for (let k = 0; k < 4; k++) {
      const x = 20 + noise(q, k, 33) * 88 + k * 3, y = 20 + noise(k, q, 34) * 88;
      p.on(wrap(x), wrap(y + 1), B.Reed, 2); p.on(wrap(x), wrap(y + 2), B.Reed, 2);
      p.on(wrap(x), wrap(y - 1), B.Cotton, 5); p.on(wrap(x + 1), wrap(y - 1), B.Cotton, 4); p.on(wrap(x), wrap(y), B.Cotton, 3); p.on(wrap(x - 1), wrap(y - 1), B.Cotton, 4);
    }
  return p.render(false);
}

/** Manchas do chão (camada por cima da turfa): urze, capim seco e a cinza do incêndio. */
export const PATCHES = [B.Heath, B.Dry, B.Ash] as const;

/**
 * Mancha de `mat` no tile, pelos vizinhos que não têm a mesma mancha (`out`, 8 bits): a beira recua num contorno
 * recortado (o ruído é o mesmo dos dois lados da emenda), então a mancha emenda com as vizinhas e some no capim. Por
 * cima, o miúdo de cada uma: as florzinhas da urze, as folhas do capim seco, o carvão e as brasas velhas da cinza.
 */
export function patchTile(mat: B, out: number): Uint8ClampedArray {
  const p = new Paper();
  const dist = field(out, 90);
  const edge = (x: number, y: number) => 46 + (sn(x, y, 64, 120 + mat) - 0.5) * 60 + (sn(x, y, 16, 121) - 0.5) * 22 + (sn(x, y, 4, 126) - 0.5) * 6;
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => fieldAt(dist, x, y) > edge(x, y), mat, () => MID,
    (x, y) => (noise(x, y, 123 + mat) < 0.08 ? -1 : 0));
  const inside = (x: number, y: number) => p.has(x, y);
  if (mat === B.Heath)
    for (let k = 0; k < 260; k++) {
      const x = Math.floor(noise(k, mat, 124) * HD), y = Math.floor(noise(mat, k, 125) * HD);
      if (!inside(x, y)) continue;
      if (k % 3) { p.on(x, y, B.Heath, 5); p.on(x + 1, y, B.Heath, 4); p.on(x, y + 1, B.Heath, 1); }
      else blade(p, x, y, k % 2 ? 1 : -1, 3, B.Sedge, false);
    }
  else if (mat === B.Dry)
    for (let k = 0; k < 320; k++) {
      const x = Math.floor(noise(k, mat, 124) * HD), y = Math.floor(noise(mat, k, 125) * HD);
      if (inside(x, y)) blade(p, x, y, k % 2 ? 1 : -1, k % 3 ? 3 : 4, B.Dry, false);
    }
  else
    for (let k = 0; k < 90; k++) {
      const x = Math.floor(noise(k, mat, 124) * HD), y = Math.floor(noise(mat, k, 125) * HD);
      if (!inside(x, y)) continue;
      p.on(x, y, B.Under, 2); p.on(x + 1, y, B.Under, 1);
      if (k % 4 === 0) p.on(x, y + 1, B.Ember, 2);
      else if (k % 3 === 0) blade(p, x, y, 1, 2, B.Dry, false);
    }
  return p.render(false);
}

/**
 * Lama pisada da trilha (por cima da turfa), pelos vizinhos que também são trilha (`links`, 8 bits): faixas de lama do
 * meio do tile até cada lado ligado, de beira ondulada (o ruído é o mesmo dos dois lados da emenda), com poças que
 * espelham o céu, pegadas e o capim invadindo a beira. Fora da lama, transparente.
 */
export function mudTile(links: number): Uint8ClampedArray {
  const p = new Paper();
  // A lama é a região dos tiles de trilha, de beira recuada pela distância até os vizinhos que não são trilha.
  const out = ~links & 255;
  const shore = field(out, 110);
  const dist = (x: number, y: number) => -fieldAt(shore, x, y) + 64;
  const edge = (x: number, y: number) => 64 - 40 + (sn(x, y, 64, 59) - 0.5) * 40 + (sn(x, y, 16, 60) - 0.5) * 14 + (sn(x, y, 4, 61) - 0.5) * 4;
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => dist(x, y) < edge(x, y), B.Mud, (x, y) => (dist(x, y) > edge(x, y) - 5 ? MID - 0.25 : MID),
    (x, y) => (dist(x, y) > edge(x, y) - 3 ? 1 : noise(x, y, 63) < 0.06 ? -1 : 0));
  // Miúdo da lama: pedrinhas, sulcos de pisada e pocinhas.
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(noise(k, links, 64) * HD), y = Math.floor(noise(links, k, 65) * HD);
    if (dist(x, y) > edge(x, y) - 8) continue;
    if (k % 5 === 0) { p.on(x, y, B.Stone, 3); p.on(x + 1, y, B.Stone, 4); p.on(x, y + 1, B.Mud, 1); }
    else if (k % 5 === 1) { for (let dx = 0; dx < 5; dx++) p.on(x + dx, y, B.Mud, 2); }
    else if (k % 7 === 2) { p.on(x, y, B.Sheen, 2); p.on(x + 1, y, B.Water, 3); p.on(x + 2, y, B.Sheen, 2); }
    else p.on(x, y, B.Mud, 2);
  }
  // Capim invadindo a beira.
  for (let k = 0; k < 220; k++) {
    const x = Math.floor(noise(k, 3, 69) * HD), y = Math.floor(noise(3, k, 70) * HD);
    const d = dist(x, y), e = edge(x, y);
    if (d < e - 6 || d > e) continue;
    blade(p, x, y, noise(k, 1, 71) < 0.5 ? -1 : 1, 3, B.Sedge, false);
  }
  return p.render(false);
}

/**
 * Estrada afundada do império (e o chão da ilha da arena): lajes de basalto em células irregulares, cada uma com bisel
 * (luz em cima à esquerda), musgo e turfa nas juntas, líquen claro em algumas. Perto dos vizinhos que não são estrada
 * (`open`), as lajes vão faltando: a beira se desfaz na turfa. No miolo do tile, algumas lajes afundaram (variação `v`)
 * e deixaram uma poça. `ring`: as lajes da ilha da arena, mais claras e gastas.
 */
export function pavingTile(open: number, v: number, ring = false, blocks = BLOCK): Uint8ClampedArray {
  // `v` é o pedaço do bloco de `blocks`×`blocks` tiles (`blockPiece` para 4): as lajes não repetem a cada tile.
  const ox = (v % blocks) * HD, oy = Math.floor(v / blocks) * HD;
  const p = new Paper();
  const CELL = ring ? 46 : 40;
  const dist = field(open, 0);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const w = worleyCells(x + 0.5 + ox, y + 0.5 + oy, CELL, HD * blocks, ring ? 77 : 71);
      const cx = x + 0.5 - w.dx, cy = y + 0.5 - w.dy;
      const keepAt = distTo(open, cx, cy) - (14 + noise(w.id, 5, 72) * 26);
      if (keepAt < 0) continue;
      // Laje afundada: só as que cabem inteiras no tile mudam com a variação (a emenda não muda).
      const sunk = noise(w.id, 3, 73) < 0.035;
      const gap = w.d2 - w.d1;
      const i = y * HD + x;
      if (sunk) {
        p.mat[i] = gap < 3 ? B.Peat : B.Water;
        p.shade[i] = 0.55;
        p.off[i] = gap < 3 ? -1 : (sn(x, (y * 5) & 127, 32, 74) > 0.68 ? 1 : 0);
        p.part[i] = 1;
        continue;
      }
      if (gap < 2) {
        p.mat[i] = noise(x >> 1, y >> 1, 75) < 0.55 ? B.Moss : B.Peat;
        p.shade[i] = gap < 1.3 ? 0.3 : 0.45;
        p.off[i] = 0;
        p.part[i] = 1;
        continue;
      }
      const tone = noise(w.id, 7, 76);
      p.mat[i] = ring ? (tone < 0.65 ? B.Stone : B.Basalt) : tone < 0.18 ? B.Stone : B.Basalt;
      // Bisel: perto da junta, o lado de cima à esquerda pega luz, o de baixo à direita fica na sombra.
      const nx = w.dx / (w.d1 || 1), ny = w.dy / (w.d1 || 1);
      const bevel = gap < 6 ? (-nx - ny) * 0.2 : 0;
      p.shade[i] = 0.56 + bevel + (tone - 0.5) * 0.12 + (sn(x, y, 16, 78) - 0.5) * 0.08;
      p.off[i] = noise(x, y, 79) < 0.05 ? -1 : 0;
      p.part[i] = 1;
      // Líquen claro e rachadura.
      if (noise(w.id, 9, 80) < 0.18 && sn(x, y, 8, 81 + (w.id % 5)) > 0.72) { p.mat[i] = B.Lichen; p.off[i] = 0; }
    }
  return p.render(false);
}

// --- Água ---------------------------------------------------------------------------------

/**
 * Poça negra pelos vizinhos que são terra (`land`, 8 bits): a margem de turfa molhada com o capim debruçado, a água
 * escura e, no meio, o fundo quase preto com os reflexos do céu branco em riscos compridos e a película de cinza
 * boiando. `q`: o pedaço do bloco (só a água sem margem varia; a de margem usa o miolo comum, para emendar).
 */
export function waterTile(land: number, q: number): Uint8ClampedArray {
  const p = new Paper();
  const shore = field(land, 120);
  const free = land === 0;
  const inner = (x: number, y: number, cell: number, seed: number) => free ? bn(q, x, y, cell, seed) : sn(x, y, cell, seed);
  p.fill([0, 0, HD - 1, HD - 1], () => true, B.Deep, () => 0.55);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      const d = shore[i] - 10 + (sn(x, y, 16, 90) - 0.5) * 14 + (sn(x, y, 64, 91) - 0.5) * 34;
      if (d < 0) { p.mat[i] = -1; continue; }
      if (d < 5) { p.mat[i] = B.Peat; p.shade[i] = 0.42; p.off[i] = noise(x, y, 92) < 0.25 ? -1 : 0; continue; }
      if (d < 9) { p.mat[i] = B.Peat; p.shade[i] = 0.2; p.off[i] = -1; continue; }
      const deep = d > 26;
      p.mat[i] = deep ? B.Deep : B.Water;
      p.shade[i] = deep ? MID : d < 16 ? MID + 0.25 : MID;
      p.off[i] = 0;
      // Reflexo do céu branco: manchas largas mais claras, de beira limpa (sem pontilhado).
    }
  // Riscos de reflexo, compridos de leste a oeste, e a película de cinza boiando.
  const streaks = free ? 9 : 6;
  for (let k = 0; k < streaks; k++) {
    const sx = 8 + noise(k, q, 94) * 100, sy = 8 + noise(q, k, 95) * 112, len = 10 + noise(k, k + q, 96) * 26;
    for (let x = 0; x < len; x++) {
      const px = sx + x, i = Math.floor(sy) * HD + Math.floor(px);
      if (px >= HD || shore[i] < 14) continue;
      const mid = Math.abs(x - len / 2) < len / 4;
      p.on(px, sy, B.Sheen, mid ? 3 : 2);
    }
  }
  if (free && noise(q, 9, 107) < 0.5)
    for (let k = 0; k < 14; k++) {
      const x = 30 + noise(k, q, 108) * 40 + k * 2, y = 40 + noise(q, k, 109) * 30;
      p.on(x, y, B.Ash, 2); p.on(x + 1, y, B.Ash, 3);
    }
  // Capim debruçado na margem.
  for (let k = 0; k < 260; k++) {
    const x = Math.floor(noise(k, 5, 97) * HD), y = Math.floor(noise(5, k, 98) * HD);
    const d = shore[y * HD + x];
    if (d > 7 || d < 0) continue;
    blade(p, x, y, noise(k, 2, 99) < 0.5 ? -1 : 1, 3, B.Sedge, false);
  }
  // Folhas de nenúfar cinzentas, raras, no miolo.
  if (free && noise(q, 3, 100) < 0.35) {
    const cx = 30 + noise(q, 4, 101) * 68, cy = 30 + noise(4, q, 102) * 68;
    const notch = noise(q, 6, 103) * Math.PI * 2;
    p.fill(ebox(cx, cy, 8, 6), (x, y) => {
      const a = Math.atan2(y - cy, x - cx);
      return inEllipse(cx, cy, 8, 6)(x, y) && Math.abs(Math.atan2(Math.sin(a - notch), Math.cos(a - notch))) > 0.35;
    }, B.Moss, sphere(cx, cy, 9, 7));
    if (noise(q, 7, 104) < 0.5) { ellipse(p, cx + 2, cy - 2, 2.5, 2, B.Cotton); p.on(cx + 2, cy - 2, B.Berry, 4); }
  }
  return p.render(false);
}

/**
 * Passarela de tábuas por cima da água (transparente fora dela: a água fica embaixo). `links`: os lados (4 bits) que
 * ela segue (outra passarela ou a terra nas pontas); as tábuas correm atravessadas ao caminho, com frestas, pregos,
 * uma tábua faltando aqui e ali e os postes nas pontas que encostam na terra (`ends`).
 */
export function boardTile(links: number, ends: number, v: number): Uint8ClampedArray {
  const p = new Paper();
  const HALF = 26;
  const vertical = (links & (OPEN.n | OPEN.s)) !== 0 && (links & (OPEN.e | OPEN.w)) === 0;
  const horizontal = (links & (OPEN.e | OPEN.w)) !== 0 && (links & (OPEN.n | OPEN.s)) === 0;
  const inStrip = (x: number, y: number) => {
    const inC = Math.abs(x - 64) <= HALF && Math.abs(y - 64) <= HALF;
    if (inC) return true;
    if ((links & OPEN.n) && y < 64 && Math.abs(x - 64) <= HALF) return true;
    if ((links & OPEN.s) && y > 64 && Math.abs(x - 64) <= HALF) return true;
    if ((links & OPEN.w) && x < 64 && Math.abs(y - 64) <= HALF) return true;
    if ((links & OPEN.e) && x > 64 && Math.abs(y - 64) <= HALF) return true;
    return false;
  };
  // Direção das tábuas de cada pixel: no braço norte-sul, deitadas de leste a oeste, e o contrário.
  const across = (x: number, y: number) => {
    if (vertical) return true;
    if (horizontal) return false;
    const inC = Math.abs(x - 64) <= HALF && Math.abs(y - 64) <= HALF;
    if (inC) return (links & (OPEN.n | OPEN.s)) !== 0;
    return Math.abs(x - 64) <= HALF;
  };
  const PL = 13;
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!inStrip(x + 0.5, y + 0.5)) continue;
      const a = across(x + 0.5, y + 0.5);
      const along = a ? y : x, side = a ? x - 64 : y - 64;
      const k = Math.floor(along / PL);
      const inPlank = along % PL;
      // Tábua faltando (só as do meio do tile mudam com a variação).
      if (noise(k, v + (a ? 0 : 50), 110) < 0.08 && k > 1 && k < 8) continue;
      const i = y * HD + x;
      if (inPlank === PL - 1) { p.mat[i] = B.Under; p.shade[i] = 0.3; p.off[i] = 0; p.part[i] = 1; continue; }
      // Cada tábua com o seu tom, empenada (as pontas mais escuras), com veios.
      const t = noise(k, 3, 111 + (a ? 0 : 7));
      const bend = Math.abs(side) / HALF;
      p.mat[i] = B.Wood;
      p.shade[i] = 0.62 + (t - 0.5) * 0.18 - bend * bend * 0.14 + (inPlank === 0 ? 0.12 : 0);
      p.off[i] = noise(a ? x >> 3 : x, a ? y : y >> 3, 112) < 0.1 ? -1 : 0;
      p.part[i] = 1;
      // Prego perto da ponta.
      if (Math.abs(Math.abs(side) - (HALF - 5)) < 1 && inPlank === 5) { p.mat[i] = B.Iron; p.fixed[i] = 4; }
    }
  // Postes na ponta que encosta na terra.
  const post = (x: number, y: number) => {
    p.fill(ebox(x, y, 6, 5), inEllipse(x, y, 6, 5), B.Bark, sphere(x - 1, y - 2, 6, 5));
    p.on(x - 2, y - 2, B.Dead, 4);
  };
  if (ends & OPEN.n) { post(64 - HALF, 8); post(64 + HALF, 8); }
  if (ends & OPEN.s) { post(64 - HALF, 120); post(64 + HALF, 120); }
  if (ends & OPEN.w) { post(8, 64 - HALF); post(8, 64 + HALF); }
  if (ends & OPEN.e) { post(120, 64 - HALF); post(120, 64 + HALF); }
  return p.render(true);
}

// --- Mata morta ----------------------------------------------------------------------------

interface Snag { x: number; y: number; h: number; r: number; k: number; pale: boolean }

/**
 * Campo de troncos secos que se repete a cada 128 px: 11 por tile, em fileiras desencontradas, cada um com a altura, a
 * grossura e a cor (prateado ou carvão) dele.
 */
const snagField = (piece: number): Snag[] => {
  const out: Snag[] = [];
  const rows = 4, per = [3, 3, 2, 3];
  let k = 0;
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < per[j]; i++, k++)
      out.push({
        x: Math.round(((i + 0.5 + ((j + piece) % 2) * 0.5) * HD) / per[j] + (noise(i + piece * 7, j, 170) - 0.5) * 30) % HD,
        y: Math.round(((j + 0.8) * HD) / rows + (noise(j, i + piece * 7, 171) - 0.5) * 16),
        h: 70 + Math.round(noise(i, j + piece * 5, 172) * 80),
        r: 4 + noise(j + piece * 3, i, 173) * 4,
        k: k + piece * 16,
        pale: noise(i + piece, j, 174) < 0.6,
      });
  return out;
};
/** Os 4 campos de troncos (um por pedaço de 2×2 tiles): fileiras vizinhas não alinham os troncos em colunas. */
const SNAGS = [0, 1, 2, 3].map(snagField);
/** Pedaço (0 a 3) do bloco de 2×2 tiles de mata morta. */
export const snagPiece = (x: number, y: number) => (x & 1) + 2 * (y & 1);

/** Tronco seco em pé (a mata morta): o fuste afinando, tocos de galho, a ponta lascada e a barba-de-velho. */
function snag(p: Paper, s: Snag, back: number) {
  const top: Pt = [s.x + (noise(s.k, 1, 175) - 0.5) * 8, s.y - s.h];
  const mat = s.pale ? B.Dead : B.Bark;
  const off = back ? -1 : 0;
  p.together(() => {
    limb(p, [s.x, s.y], top, s.r, Math.max(1.5, s.r * 0.45), mat, (x, y) => off + (Math.floor(x - s.x + 20) % 4 === 0 && noise(x, y >> 2, 176) < 0.5 ? -1 : 0));
    // Tocos de galho subindo em diagonal.
    for (let b2 = 0; b2 < 3; b2++) {
      const t = 0.35 + b2 * 0.2 + noise(s.k, b2, 177) * 0.1;
      const from: Pt = [s.x + (top[0] - s.x) * t, s.y - s.h * t];
      const side = (b2 + s.k) % 2 ? 1 : -1;
      const len = 10 + noise(b2, s.k, 178) * 16;
      limb(p, from, [from[0] + side * len, from[1] - len * 0.8], Math.max(1.4, s.r * 0.4), 1.1, mat, () => off);
    }
    // Raízes no pé.
    limb(p, [s.x - s.r * 1.8, s.y + 1], [s.x, s.y - s.r], 1.4, s.r * 0.5, mat, () => off);
    limb(p, [s.x + s.r * 1.8, s.y + 1], [s.x, s.y - s.r], 1.4, s.r * 0.5, mat, () => off);
  });
  // Barba-de-velho num toco.
  if (noise(s.k, 2, 179) < 0.5) {
    const hx = s.x + (noise(s.k, 3, 180) - 0.5) * s.r * 2, hy = s.y - s.h * 0.62;
    for (let y = 0; y < 14 + noise(s.k, 4, 181) * 12; y++) p.on(hx + Math.round(Math.sin(y / 5)), hy + y, B.Moss, y % 5 === 0 ? 2 : 3);
  }
}

/**
 * Mata morta pelos vizinhos que não são mata (`open`, 8 bits): o escuro do sub-bosque e, por cima, o maciço de troncos
 * secos em pé, dos de trás (mais escuros) para os da frente. Cada tronco nasce num ponto de um campo que se repete a cada
 * 128 px; o tile pinta os troncos dele e os dos vizinhos que entram nele, pela mesma regra (o pé e a ponta longe o
 * bastante do chão aberto), então a mata emenda. Perto da beira norte só ficam os troncos baixos, e na beira sul aparece
 * a primeira fileira inteira, com os pés no capim.
 */
export function deadwoodTile(open: number, v: number, piece = 0): Uint8ClampedArray {
  const p = new Paper();
  const d = (x: number, y: number) => distTo(open, x, y);
  const edge = (x: number, y: number) => 16 + (sn(x, y, 32, 190) - 0.5) * 22 + (sn(x, y, 8, 189) - 0.5) * 8;
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => d(x, y) > edge(x, y), B.Under, (x, y) => 0.26 + (sn(x, y, 16, 191) - 0.5) * 0.14,
    (x, y) => (noise(x >> 1, y >> 1, 192) < 0.06 ? 1 : 0));
  // Galhos caídos e cinza no chão escuro.
  for (let k = 0; k < 8; k++) {
    const x = 8 + noise(k, v, 193) * 112, y = 8 + noise(v, k, 194) * 112, a = noise(k, k, 195) * Math.PI;
    if (d(x, y) < 18) continue;
    line(p, [x, y], [x + Math.cos(a) * 12, y + Math.sin(a) * 5], B.Bark, 2);
  }
  const snags: Snag[] = [];
  for (let oy = -1; oy <= 1; oy++)
    for (let ox = -1; ox <= 1; ox++)
      for (const s1 of SNAGS[(((piece & 1) + ox) & 1) + 2 * (((piece >> 1) + oy) & 1)]) {
        const x = s1.x + ox * HD, y = s1.y + oy * HD;
        if (y < 0 || y - s1.h > HD || x < -30 || x > HD + 30) continue;
        if (d(x, y) < 14) continue;
        // A ponta não sai da mata: o tronco alto perto da beira encolhe até caber.
        const room = Math.min(s1.h, d(x, y - s1.h * 0.5) * 1.6 + 30);
        const h = Math.min(s1.h, distTo(open & (OPEN.n | OPEN.ne | OPEN.nw | OPEN.e | OPEN.w), x, y - s1.h) > 10 ? s1.h : room * 0.7);
        if (h < 30) continue;
        snags.push({ ...s1, x, y, h });
      }
  snags.sort((a, b) => a.y - b.y || a.x - b.x);
  const front = snags.length ? snags[snags.length - 1].y : 0;
  for (const s2 of snags) snag(p, s2, front - s2.y > 40 ? 1 : 0);
  return p.render(false);
}

// --- De pé ----------------------------------------------------------------------------------

export const TREE = { w: 256, h: 400 } as const;

/** Galho de árvore de pé: sobe e se divide; as pontas viram gravetos e às vezes seguram a barba-de-velho. */
function sideBranch(p: Paper, a: Pt, angle: number, len: number, r: number, depth: number, seed: number, tips: Pt[]) {
  const mid: Pt = [a[0] + Math.cos(angle) * len * 0.5 + (noise(seed, 1, 200) - 0.5) * len * 0.25, a[1] + Math.sin(angle) * len * 0.5];
  const b: Pt = [a[0] + Math.cos(angle) * len, a[1] + Math.sin(angle) * len];
  limb(p, a, mid, r, r * 0.85, B.Bark);
  limb(p, mid, b, r * 0.85, Math.max(1.2, r * 0.6), B.Bark);
  if (depth === 0) { tips.push(b); return; }
  const n = noise(seed, depth, 201) < 0.3 ? 3 : 2;
  for (let k = 0; k < n; k++) {
    const turn = (k - (n - 1) / 2) * (0.5 + noise(seed, k, 202) * 0.4);
    // Os galhos tendem para cima (a árvore morta abre em candelabro).
    const next = angle + turn + (-Math.PI / 2 - angle) * 0.25;
    sideBranch(p, b, next, len * (0.6 + noise(seed + k, depth, 203) * 0.18), r * 0.64, depth - 1, seed * 3 + k + 1, tips);
  }
}

/**
 * Árvore seca solta (1 tile): tronco carvoado e torto, com a casca descascando em faixas prateadas e as raízes; os
 * galhos abrem em candelabro e a barba-de-velho pende das pontas. `v`: 0 a 2, árvores; 3, o toco partido com o
 * corvo; 4, a árvore da lanterna (a luz verde dos turfeiros).
 */
export function deadTree(v: number): Uint8ClampedArray {
  const p = new Paper(TREE.w, TREE.h);
  const X = TREE.w / 2, Bt = TREE.h - 10;
  const lean = (noise(v, 1, 204) - 0.5) * 30;
  const snag = v === 3;
  const h = snag ? 0.42 : 0.82 + noise(v, 2, 205) * 0.25;
  const top: Pt = [X + lean, Bt - 230 * h];
  const tips: Pt[] = [];
  p.together(() => {
    // Raízes.
    for (let k = 0; k < 4; k++) {
      const side = k % 2 ? 1 : -1, spread = 16 + (k >> 1) * 12;
      limb(p, [X + side * spread, Bt + 2], [X + side * 4, Bt - 20], 2.5, 6, B.Bark);
    }
    // Tronco em dois trechos (torto).
    const mid: Pt = [X + lean * 0.35 + (noise(v, 3, 206) - 0.5) * 16, Bt - 120 * h];
    limb(p, [X, Bt], mid, 13, 10, B.Bark, (x, y) => (Math.floor((x - X) / 4) % 3 === 0 && noise(x, y >> 2, 207) < 0.6 ? -1 : 0));
    limb(p, mid, top, 10, snag ? 9 : 6.5, B.Bark, (x, y) => (Math.floor((x - X) / 4) % 3 === 0 && noise(x, y >> 2, 207) < 0.6 ? -1 : 0));
    if (!snag) {
      const n = 3 + (v % 2);
      for (let k = 0; k < n; k++) {
        const t = 0.55 + k * 0.12;
        const from: Pt = [X + (top[0] - X) * t, Bt - (Bt - top[1]) * t];
        const side = k % 2 ? 1 : -1;
        sideBranch(p, from, -Math.PI / 2 + side * (0.6 + noise(v, k, 208) * 0.5), 70 + noise(k, v, 209) * 30, 6 - k * 0.6, 2, v * 10 + k, tips);
      }
      sideBranch(p, top, -Math.PI / 2 + (noise(v, 9, 210) - 0.5) * 0.4, 60, 5, 2, v * 10 + 9, tips);
    }
  });
  // Casca descascada: faixas prateadas no lado do sol; ponta lascada no toco.
  for (let y = Math.floor(top[1]) + 6; y < Bt - 6; y++) {
    const t = (Bt - y) / (Bt - top[1]);
    const x = X + (top[0] - X) * t;
    if (noise(v, y >> 3, 211) < 0.55) for (let dx = -5; dx <= -1; dx++) if (noise(x + dx, y, 212) < 0.7) p.on(x + dx - 2, y, B.Dead, dx > -3 ? 3 : 4);
  }
  if (snag) {
    // Lascas da ponta partida.
    for (let k = 0; k < 6; k++) limb(p, [top[0] - 8 + k * 3, top[1] + 4], [top[0] - 9 + k * 3.4 + (noise(k, v, 213) - 0.5) * 4, top[1] - 8 - noise(v, k, 214) * 14], 2.2, 1, B.Dead);
    // O corvo, empoleirado.
    const cx = top[0] + 2, cy = top[1] - 12;
    p.together(() => {
      ellipse(p, cx, cy, 11, 8, B.Under);
      ellipse(p, cx + 9, cy - 7, 5.5, 5, B.Under);
      poly(p, [[cx + 13, cy - 8], [cx + 21, cy - 6], [cx + 13, cy - 5]], B.Bark, () => 0.6);
      poly(p, [[cx - 9, cy - 2], [cx - 22, cy + 6], [cx - 8, cy + 4]], B.Under, () => 0.3);
    });
    p.on(cx + 10, cy - 8, B.Ember, 4);
    p.on(cx - 2, cy - 4, B.Sheen, 3); p.on(cx - 1, cy - 4, B.Sheen, 2);
  }
  // Barba-de-velho: fios pendurados nas pontas.
  for (const [k, t] of tips.entries()) {
    if (noise(v, k, 215) < 0.4) continue;
    const len = 10 + noise(k, v, 216) * 26;
    for (let s = 0; s < 3; s++) {
      const x0 = t[0] - 3 + s * 3;
      for (let y = 0; y < len - s * 4; y++) p.px(x0 + Math.round(Math.sin((y + s * 5) / 6) * 1.2), t[1] + y, B.Moss, y > len - s * 4 - 4 ? 2 : s === 1 ? 4 : 3);
    }
  }
  // A lanterna dos turfeiros, pendurada num galho.
  if (v === 4 && tips.length) {
    const t = tips.reduce((a, b) => (Math.abs(b[0] - X) > 40 && b[1] > a[1] ? b : a), tips[0]);
    const lx = t[0], ly = Math.min(Bt - 90, t[1] + 34);
    line(p, [lx, t[1]], [lx, ly - 10], B.Iron, 1, false);
    p.together(() => {
      p.fill([lx - 7, ly - 10, lx + 7, ly + 9], (x, y) => Math.abs(x - lx) <= 7 - Math.max(0, y - ly - 4) * 0.6, B.Iron, () => 0.4);
      p.fill([lx - 5, ly - 6, lx + 5, ly + 5], (x, y) => Math.abs(x - lx) <= 5, B.Glow, (x, y) => 0.95 - Math.hypot(x - lx, y - ly) * 0.06);
      poly(p, [[lx - 9, ly - 10], [lx + 9, ly - 10], [lx, ly - 18]], B.Iron, () => 0.55);
    });
  }
  return p.render(true);
}

export const STONE = { w: 128, h: 300 } as const;

/**
 * Monólito: pedra alta e lascada, inclinada, com duas faces (a da esquerda no sol), manchas de líquen, o pé enterrado no
 * capim e a espiral entalhada. `glow`: só a espiral, para brilhar por cima (somada).
 */
export function monolith(v: number): { image: Uint8ClampedArray; glow: Uint8ClampedArray } {
  const p = new Paper(STONE.w, STONE.h);
  const g = new Paper(STONE.w, STONE.h);
  const X = STONE.w / 2, Bt = STONE.h - 14;
  const h = 190 + noise(v, 1, 220) * 70;
  const lean = (noise(v, 2, 221) - 0.5) * 22;
  const w0 = 30 + noise(v, 3, 222) * 6, w1 = 18 + noise(v, 4, 223) * 6;
  const L: Pt = [X - w0, Bt], R: Pt = [X + w0, Bt], TL: Pt = [X - w1 + lean, Bt - h], TR: Pt = [X + w1 + lean, Bt - h + 14], TT: Pt = [X + lean - 4, Bt - h - 12];
  const ridge = (y: number) => X + lean * ((Bt - y) / h) - 4 + Math.sin(y / 23 + v) * 2;
  p.together(() => {
    poly(p, [L, [X - 4, Bt + 6], TT, TL], B.Stone, (x, y) => (x < ridge(y) ? 0.72 : 0.4) + (sn(x, y, 16, 224 + v) - 0.5) * 0.14);
    poly(p, [[X - 4, Bt + 6], R, TR, TT], B.Stone, (x, y) => (x < ridge(y) ? 0.66 : 0.36) + (sn(x, y, 16, 225 + v) - 0.5) * 0.14);
  });
  // Lascas e rachaduras.
  for (let k = 0; k < 4; k++) {
    let x = X - 16 + noise(k, v, 226) * 32, y = Bt - 30 - noise(v, k, 227) * (h - 60);
    for (let s = 0; s < 8; s++) { const nx = x + (noise(s, k + v, 228) - 0.5) * 6, ny = y + 4; line(p, [x, y], [nx, ny], null, 1); x = nx; y = ny; }
  }
  // Líquen claro em manchas.
  for (let y = 0; y < STONE.h; y++)
    for (let x = 0; x < STONE.w; x++) {
      if (!p.has(x, y)) continue;
      const n = sn(x, y, 16, 229 + v) * 0.7 + noise(x >> 1, y >> 1, 230) * 0.3;
      if (n > 0.72) p.on(x, y, B.Lichen, n > 0.78 ? 4 : 3);
    }
  // A espiral entalhada (escura na pedra, e o brilho por cima).
  const cx = X + lean * 0.45 - 6, cy = Bt - h * 0.5;
  for (let t = 0; t < 4.2 * Math.PI; t += 0.05) {
    const r = 2 + t * 1.25;
    const x = cx + Math.cos(t + v) * r, y = cy + Math.sin(t + v) * r * 1.15;
    p.on(x, y, B.Line, 1); p.on(x + 1, y, B.Line, 1);
    g.px(x, y, B.Glow, 4); g.px(x + 1, y, B.Glow, 3);
  }
  // O pé no capim: touceiras na frente.
  tussock(p, X - 22, Bt + 2, 9, v, false, false);
  tussock(p, X + 20, Bt + 4, 8, v + 5, true, false);
  return { image: p.render(true), glow: g.render(false) };
}

export const HUT = { w: 300, h: 420 } as const;

/**
 * Palafita dos turfeiros (2×2): a plataforma de tábuas em estacas que entram na água, a casa de pau-a-pique com o
 * telhado de junco cinza, a porta escura, a janelinha com a brasa, a escada, a rede secando e as leivas de turfa
 * empilhadas.
 */
export function stiltHut(v: number): Uint8ClampedArray {
  const p = new Paper(HUT.w, HUT.h);
  const X = HUT.w / 2, Bt = HUT.h - 16;
  const deck = Bt - 92;
  const flip = v % 2 ? -1 : 1;
  // Estacas (com a marca da água) e a escada.
  for (let k = 0; k < 5; k++) {
    const x = X - 110 + k * 55 + (noise(k, v, 240) - 0.5) * 8;
    limb(p, [x, Bt - (k % 2) * 6], [x + (noise(v, k, 241) - 0.5) * 6, deck - 4], 6, 5, B.Bark);
    for (let dx = -5; dx <= 5; dx++) p.on(x + dx, Bt - 26 - (k % 2) * 6, B.Peat, 1);
  }
  limb(p, [X - 60, deck + 10], [X - 80, deck + 50], 4, 4, B.Bark);
  limb(p, [X - 110, deck - 6], [X + 112, deck - 2], 5, 5, B.Bark);
  // Plataforma de tábuas (de frente: a borda grossa).
  p.together(() => {
    p.fill([X - 124, deck - 30, X + 124, deck], (x, y) => y > deck - 30 + Math.abs(x - X) * 0.02, B.Wood,
      (x, y) => 0.58 + (Math.floor(x / 16) % 2 ? 0.06 : -0.04) + (y > deck - 8 ? -0.2 : 0), (x, y) => (Math.floor(x) % 16 === 0 ? -2 : noise(x >> 2, y, 242) < 0.08 ? -1 : 0));
  });
  // Casa: paredes de pau-a-pique (tábuas em pé e barro), sobre a plataforma.
  const wx0 = X - 80, wx1 = X + 80, wy0 = deck - 150, wy1 = deck - 26;
  p.fill([wx0, wy0, wx1, wy1], () => true, B.Wood, (x) => 0.5 + (Math.floor((x - wx0) / 12) % 2 ? 0.07 : -0.03) - (x > X + 40 ? 0.14 : 0),
    (x, y) => (Math.floor(x - wx0) % 12 === 0 ? -2 : noise(x >> 1, y >> 3, 243) < 0.1 ? -1 : 0));
  // Remendos de barro.
  for (let k = 0; k < 4; k++) {
    const cx = wx0 + 20 + noise(k, v, 244) * 120, cy = wy0 + 30 + noise(v, k, 245) * 70;
    p.fill(ebox(cx, cy, 14, 9), inEllipse(cx, cy, 14, 9), B.Peat, sphere(cx, cy, 14, 9));
  }
  // Porta e janela.
  const dx = X - 30 * flip;
  p.fill([dx - 17, wy1 - 78, dx + 17, wy1], (x, y) => y > wy1 - 78 + (Math.abs(x - dx) > 11 ? 0 : 0), B.Under, () => 0.2);
  p.fill([dx - 19, wy1 - 82, dx + 19, wy1 - 76], () => true, B.Bark, () => 0.5);
  const wx = X + 42 * flip;
  p.fill([wx - 12, wy0 + 44, wx + 12, wy0 + 66], () => true, B.Ember, (x, y) => 0.9 - Math.hypot(x - wx, y - wy0 - 56) * 0.04);
  line(p, [wx, wy0 + 44], [wx, wy0 + 66], B.Bark, 1, false);
  line(p, [wx - 12, wy0 + 55], [wx + 12, wy0 + 55], B.Bark, 1, false);
  // Telhado de junco: duas águas, com a palha em mechas e a cumeeira amarrada.
  const ridgeY = wy0 - 92;
  p.together(() => {
    poly(p, [[wx0 - 30, wy0 + 14], [X, ridgeY], [wx1 + 30, wy0 + 14]], B.Reed, (x, y) => {
      const left = x < X;
      return (left ? 0.74 : 0.42) + (sn(x, y, 8, 246 + v) - 0.5) * 0.18;
    }, (x, y) => (noise(Math.floor(x / 3), Math.floor((y + Math.abs(x - X) * 0.6) / 9), 247) < 0.25 ? -1 : 0));
  });
  for (let k = 0; k < 40; k++) {
    const x = wx0 - 26 + noise(k, v, 248) * (wx1 - wx0 + 52);
    const yTop = ridgeY + Math.abs(x - X) * ((wy0 + 14 - ridgeY) / (X - wx0 + 30));
    line(p, [x, yTop + 6], [x + (x < X ? -2 : 2), wy0 + 12], null, noise(k, 1, 249) < 0.5 ? 2 : 5);
  }
  // Beiral desfiado.
  for (let x = wx0 - 30; x < wx1 + 30; x += 3) p.px(x, wy0 + 15 + (noise(x, v, 250) < 0.5 ? 1 : 3), B.Reed, 2);
  limb(p, [X - 18, ridgeY + 6], [X + 18, ridgeY + 6], 4, 4, B.Dry);
  // Rede secando num varal e as leivas de turfa empilhadas na plataforma.
  const nx = X + 100 * flip;
  limb(p, [nx, deck - 30], [nx, deck - 120], 3, 3, B.Bark);
  for (let y = deck - 112; y < deck - 40; y += 6) for (let x = 0; x < 30; x += 6) { p.px(nx - flip * (x + 4), y, B.Dry, 3); p.px(nx - flip * (x + 7), y + 3, B.Dry, 2); }
  for (let r = 0; r < 3; r++)
    for (let k = 0; k < 4 - r; k++) {
      const bx = X - 110 * flip + flip * (k * 16 + r * 8), by = deck - 34 - r * 10;
      p.fill([bx - 7, by - 9, bx + 7, by], () => true, B.Peat, (x, y) => (y < by - 6 ? 0.7 : 0.4));
    }
  return p.render(true);
}

export const STAKE = { w: 128, h: 240 } as const;

/**
 * Paliçada do terreiro (1 tile): 3 estacas pretas de pontas lascadas, amarradas por uma corda; às vezes um crânio
 * espetado ou um trapo vermelho.
 */
export function stakeTile(v: number): Uint8ClampedArray {
  const p = new Paper(STAKE.w, STAKE.h);
  const Bt = STAKE.h - 10;
  for (let k = 0; k < 3; k++) {
    const x = 22 + k * 42 + (noise(k, v, 260) - 0.5) * 8;
    const top = Bt - 120 - noise(v, k, 261) * 50;
    const r = 11 + noise(k, v, 262) * 3;
    p.together(() => {
      p.fill([x - r, top, x + r, Bt], (px, py) => Math.abs(px - x) <= r * Math.min(1, (py - top) / (r * 1.8)), B.Bark,
        (px) => 0.66 - ((px - x) / r) * 0.3, (px, py) => (Math.floor(px - x + 20) % 5 === 0 && noise(px, py >> 2, 263) < 0.6 ? -1 : 0));
    });
    // Ponta queimada mais clara (lascada).
    for (let y = top; y < top + 14; y++) p.on(x - 3 + (noise(y, k, 264) - 0.5) * 2, y + 4, B.Dead, 3);
  }
  // Corda amarrando.
  for (let x = 6; x < STAKE.w - 6; x++) {
    const y = Bt - 70 + Math.sin(x / 7) * 1.5;
    p.on(x, y, B.Reed, 3); p.on(x, y + 1, B.Reed, 2); p.on(x, y + 2, B.Reed, 1);
  }
  if (v % 4 === 1) {
    const sx = 64 + (noise(v, 2, 265) - 0.5) * 30, sy = Bt - 150;
    p.together(() => {
      ellipse(p, sx, sy, 13, 12, B.Bone);
      p.fill([sx - 8, sy + 6, sx + 8, sy + 16], () => true, B.Bone, () => 0.5);
    });
    ellipse(p, sx - 5, sy, 3.5, 4, B.Line); ellipse(p, sx + 5, sy, 3.5, 4, B.Line);
    p.on(sx, sy + 6, B.Line, 0); p.on(sx - 1, sy + 7, B.Line, 0);
  } else if (v % 4 === 3) {
    poly(p, [[60, Bt - 112], [86, Bt - 108], [82, Bt - 70], [74, Bt - 84], [64, Bt - 66]], B.Cloth, (x, y) => 0.6 - (y - (Bt - 112)) * 0.004);
  }
  return p.render(true);
}

export const BRAZIER = { w: 128, h: 200 } as const;

/** Braseiro de turfa: o cesto de ferro em 3 pés, com as leivas em brasa. */
export function brazier(): Uint8ClampedArray {
  const p = new Paper(BRAZIER.w, BRAZIER.h);
  const X = 64, Bt = BRAZIER.h - 8, top = Bt - 90;
  p.together(() => {
    limb(p, [X - 30, Bt], [X - 14, top + 20], 3.5, 3.5, B.Iron);
    limb(p, [X + 30, Bt], [X + 14, top + 20], 3.5, 3.5, B.Iron);
    limb(p, [X, Bt + 2], [X, top + 22], 3.5, 3.5, B.Iron);
    p.fill([X - 30, top, X + 30, top + 26], (x, y) => Math.abs(x - X) <= 30 - (y - top) * 0.5, B.Iron, (x) => 0.66 - ((x - X) / 30) * 0.3);
  });
  for (let x = X - 26; x <= X + 26; x += 7) line(p, [x, top + 1], [X + (x - X) * 0.6, top + 25], B.Under, 1);
  ellipse(p, X, top, 26, 7, B.Ember);
  for (let k = 0; k < 9; k++) p.on(X - 20 + noise(k, 1, 270) * 40, top - 2 + noise(1, k, 271) * 4, B.Flame, 4);
  return p.render(true);
}

export const FLAME = { w: 64, h: 96 } as const;

/** Chama verde-pálida da turfa (4 quadros), acesa por cima do braseiro. */
export function flameFrame(k: number): Uint8ClampedArray {
  const p = new Paper(FLAME.w, FLAME.h);
  const X = 32, Bt = FLAME.h - 6;
  const sway = Math.sin((k / 4) * Math.PI * 2) * 4;
  const tongue = (dx: number, h: number, r: number, mat: B, shade: number) =>
    p.fill([X + dx - r, Bt - h, X + dx + r, Bt], (x, y) => {
      const t = (Bt - y) / h;
      const cx = X + dx + sway * t * t;
      return Math.abs(x - cx) <= r * Math.sin(Math.min(1, (1 - t) * 1.4) * Math.PI * 0.5) * (1 - t * 0.2);
    }, mat, () => shade);
  tongue(0, 70 + (k % 2) * 8, 18, B.Ember, 0.6);
  tongue(-6, 46 + ((k + 1) % 3) * 6, 10, B.Flame, 0.8);
  tongue(7, 40 + (k % 3) * 6, 8, B.Flame, 0.95);
  return p.render(false);
}

/** Pedras da ilha da arena: o círculo entalhado (5×5 tiles) com as runas, deitado no chão; `glow`, só os sulcos. */
export const SIGIL_TILES = 5;
export function arenaSigil(): { image: Uint8ClampedArray; glow: Uint8ClampedArray } {
  const S = HD * SIGIL_TILES;
  const p = new Paper(S, S);
  const g = new Paper(S, S);
  const c = S / 2;
  const ring = (r: number, w: number) => {
    for (let a = 0; a < Math.PI * 2; a += 0.6 / r)
      for (let k = -w; k <= w; k++) {
        const x = c + Math.cos(a) * (r + k), y = c + Math.sin(a) * (r + k) * 0.92;
        p.px(x, y, B.Line, 1);
        p.px(x + 1, y, B.Line, 1);
        if (Math.abs(k) < w) g.px(x, y, B.Glow, 3);
      }
  };
  ring(250, 2);
  ring(214, 1);
  ring(90, 2);
  // Runas entre os anéis.
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x = c + Math.cos(a) * 232, y = c + Math.sin(a) * 232 * 0.92;
    const glyph = k % 4;
    const strokes: [Pt, Pt][] = glyph === 0 ? [[[0, -10], [0, 10]], [[0, -4], [8, -10]], [[0, 2], [8, -4]]]
      : glyph === 1 ? [[[-6, -10], [6, 10]], [[6, -10], [-6, 10]]]
      : glyph === 2 ? [[[0, -10], [0, 10]], [[0, -10], [-7, -2]], [[0, -10], [7, -2]]]
      : [[[-7, 10], [0, -10]], [[0, -10], [7, 10]], [[-4, 2], [4, 2]]];
    for (const [s, e] of strokes) {
      const rot = (q: Pt): Pt => [x + q[0] * Math.cos(a + Math.PI / 2) - q[1] * Math.sin(a + Math.PI / 2), y + q[0] * Math.sin(a + Math.PI / 2) + q[1] * Math.cos(a + Math.PI / 2)];
      for (const o of [0, 1]) {
        line(p, [rot(s)[0] + o, rot(s)[1]], [rot(e)[0] + o, rot(e)[1]], B.Line, 1, false);
        line(g, [rot(s)[0] + o, rot(s)[1]], [rot(e)[0] + o, rot(e)[1]], B.Glow, 4, false);
      }
    }
  }
  // Raios do centro.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.26;
    for (const o of [0, 1]) {
      line(p, [c + Math.cos(a) * 96 + o, c + Math.sin(a) * 88], [c + Math.cos(a) * 208 + o, c + Math.sin(a) * 191], B.Line, 1, false);
      line(g, [c + Math.cos(a) * 96 + o, c + Math.sin(a) * 88], [c + Math.cos(a) * 208 + o, c + Math.sin(a) * 191], B.Glow, 2, false);
    }
  }
  return { image: p.render(false, 210), glow: g.render(false) };
}

// --- Enfeites --------------------------------------------------------------------------------

export const FLAT_DECOR = ["bones", "skull", "puddle", "shrooms", "char", "feathers", "rib"] as const;
export type FlatDecor = (typeof FLAT_DECOR)[number];

/** Enfeite deitado no chão (camada de enfeites, transparente fora dele). */
export function flatDecor(kind: FlatDecor, v: number): Uint8ClampedArray {
  const p = new Paper();
  const cx = 64 + (noise(v, 1, 280) - 0.5) * 30, cy = 64 + (noise(1, v, 281) - 0.5) * 30;
  switch (kind) {
    case "bones":
      for (let k = 0; k < 3; k++) {
        const a = noise(k, v, 282) * Math.PI, l = 14 + noise(v, k, 283) * 8;
        const ox = cx + (k - 1) * 12, oy = cy + (noise(k, 2, 284) - 0.5) * 16;
        limb(p, [ox - Math.cos(a) * l, oy - Math.sin(a) * l * 0.6], [ox + Math.cos(a) * l, oy + Math.sin(a) * l * 0.6], 2.6, 2.6, B.Bone);
        ellipse(p, ox - Math.cos(a) * l, oy - Math.sin(a) * l * 0.6, 4, 3.4, B.Bone);
        ellipse(p, ox + Math.cos(a) * l, oy + Math.sin(a) * l * 0.6, 4, 3.4, B.Bone);
      }
      break;
    case "skull": {
      p.together(() => {
        ellipse(p, cx, cy, 13, 11, B.Bone);
        p.fill([cx - 8, cy + 4, cx + 8, cy + 14], () => true, B.Bone, () => 0.5);
        // Chifres: bicho grande do brejo.
        limb(p, [cx - 10, cy - 6], [cx - 26, cy - 14], 4, 1.5, B.Bone);
        limb(p, [cx + 10, cy - 6], [cx + 26, cy - 14], 4, 1.5, B.Bone);
      });
      ellipse(p, cx - 5, cy - 1, 3.5, 4, B.Line); ellipse(p, cx + 5, cy - 1, 3.5, 4, B.Line);
      for (let x = -5; x <= 5; x += 2) p.on(cx + x, cy + 10, B.Line, 0);
      break;
    }
    case "puddle": {
      const rx = 22 + noise(v, 3, 285) * 10, ry = 12 + noise(3, v, 286) * 5;
      p.fill(ebox(cx, cy, rx + 3, ry + 3), (x, y) => ((x - cx) / (rx + 3)) ** 2 + ((y - cy) / (ry + 3)) ** 2 <= 1 + (sn(x, y, 8, 287) - 0.5) * 0.4, B.Peat, () => 0.35);
      p.fill(ebox(cx, cy, rx, ry), (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (sn(x, y, 8, 288) - 0.5) * 0.4, B.Water, (x, y) => 0.5 + (y < cy ? 0.1 : 0));
      for (let x = cx - rx * 0.6; x < cx + rx * 0.3; x++) p.on(x, cy - ry * 0.3, B.Sheen, 4);
      break;
    }
    case "shrooms":
      for (let k = 0; k < 5; k++) {
        const x = cx + (noise(k, v, 289) - 0.5) * 36, y = cy + (noise(v, k, 290) - 0.5) * 24, r = 3 + noise(k, k, 291) * 3;
        limb(p, [x, y + r + 3], [x, y], 1.4, 1.4, B.Bone);
        p.fill(ebox(x, y, r + 1, r * 0.7), (px, py) => inEllipse(x, y, r + 1, r * 0.7)(px, py) && py < y + 1, B.Ash, sphere(x - 1, y - 2, r + 1, r));
        p.on(x - 1, y - 1, B.Cotton, 4);
      }
      break;
    case "char":
      for (let k = 0; k < 4; k++) {
        const a = noise(k, v, 292) * Math.PI;
        const ox = cx + (noise(k, 3, 293) - 0.5) * 30, oy = cy + (noise(3, k, 294) - 0.5) * 20, l = 12 + noise(k, v, 295) * 10;
        limb(p, [ox - Math.cos(a) * l, oy - Math.sin(a) * l * 0.5], [ox + Math.cos(a) * l, oy + Math.sin(a) * l * 0.5], 3.5, 3, B.Under);
        p.on(ox, oy, B.Ember, 3);
      }
      break;
    case "feathers":
      for (let k = 0; k < 4; k++) {
        const a = noise(k, v, 296) * Math.PI * 2, x = cx + (noise(k, 4, 297) - 0.5) * 30, y = cy + (noise(4, k, 298) - 0.5) * 20;
        limb(p, [x, y], [x + Math.cos(a) * 12, y + Math.sin(a) * 6], 2.5, 0.8, B.Under);
      }
      break;
    case "rib":
      // Costelas de um bicho grande saindo da turfa.
      for (let k = 0; k < 5; k++) {
        const x = cx - 28 + k * 14;
        limb(p, [x, cy + 12], [x + 4, cy - 10], 3, 2, B.Bone);
        limb(p, [x + 4, cy - 10], [x + 12, cy - 16], 2, 1.4, B.Bone);
      }
      limb(p, [cx - 34, cy + 13], [cx + 34, cy + 11], 3.5, 3, B.Bone);
      break;
  }
  return p.render(true);
}

export const TALL = { w: 128, h: 200 } as const;
export const TALL_DECOR = ["reeds", "cotton", "bush", "stump", "peat", "post", "cairn"] as const;
export type TallDecor = (typeof TALL_DECOR)[number];

/** Enfeite de pé (não bloqueia): taboas e juncos na beira d'água, algodão-do-brejo, arbusto seco, toco, leivas, poste. */
export function tallDecor(kind: TallDecor, v: number): Uint8ClampedArray {
  const p = new Paper(TALL.w, TALL.h);
  const X = 64, Bt = TALL.h - 8;
  switch (kind) {
    case "reeds":
      for (let k = 0; k < 14; k++) {
        const x = X - 36 + noise(k, v, 300) * 72, h = 60 + noise(v, k, 301) * 70, lean = (noise(k, k, 302) - 0.5) * 24;
        limb(p, [x, Bt], [x + lean, Bt - h], 2, 1, k % 3 ? B.Reed : B.Sedge);
        if (k % 4 === 0) p.fill(ebox(x + lean * 0.9, Bt - h * 0.86, 3, 9), inEllipse(x + lean * 0.9, Bt - h * 0.86, 3, 9), B.Peat, sphere(x + lean * 0.9 - 1, Bt - h * 0.86 - 3, 3, 9));
      }
      break;
    case "cotton":
      for (let k = 0; k < 9; k++) {
        const x = X - 26 + noise(k, v, 303) * 52, h = 34 + noise(v, k, 304) * 30, lean = (noise(k, k, 305) - 0.5) * 14;
        limb(p, [x, Bt], [x + lean, Bt - h], 1.2, 1, B.Reed);
        ellipse(p, x + lean, Bt - h - 3, 5, 4.5, B.Cotton);
      }
      tussock(p, X, Bt, 12, v, false, false);
      break;
    case "bush": {
      const tips: Pt[] = [];
      for (let k = 0; k < 5; k++) sideBranch(p, [X + (k - 2) * 4, Bt], -Math.PI / 2 + (k - 2) * 0.35, 30 + noise(k, v, 306) * 14, 2.6, 2, v * 7 + k, tips);
      for (const [k, t] of tips.entries()) if (k % 3 === 0) { p.on(t[0], t[1], B.Berry, 4); p.on(t[0] + 1, t[1], B.Berry, 2); }
      break;
    }
    case "stump":
      p.together(() => {
        limb(p, [X, Bt], [X, Bt - 40], 20, 18, B.Bark);
        for (let k = 0; k < 4; k++) limb(p, [X + (k - 1.5) * 18, Bt + 2], [X + (k - 1.5) * 6, Bt - 16], 3, 6, B.Bark);
      });
      ellipse(p, X, Bt - 40, 18, 7, B.Dead);
      for (let r = 4; r < 16; r += 5) for (let a = 0; a < 6.3; a += 0.3) p.on(X + Math.cos(a) * r, Bt - 40 + Math.sin(a) * r * 0.38, B.Bark, 2);
      break;
    case "peat":
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 4 - r; k++) {
          const bx = X - 36 + k * 22 + r * 11, by = Bt - r * 15;
          p.together(() => {
            p.fill([bx - 10, by - 14, bx + 10, by], () => true, B.Peat, (x, y) => (y < by - 10 ? 0.72 : x > bx + 6 ? 0.3 : 0.45), (x, y) => (noise(x >> 1, y >> 1, 307) < 0.15 ? -1 : 0));
          });
        }
      break;
    case "post":
      limb(p, [X, Bt], [X + 2, Bt - 110], 6, 5, B.Bark);
      limb(p, [X - 18, Bt - 92], [X + 20, Bt - 96], 3.5, 3.5, B.Bark);
      poly(p, [[X + 4, Bt - 92], [X + 18, Bt - 90], [X + 14, Bt - 56], [X + 6, Bt - 70]], B.Cloth, () => 0.6);
      for (const s of [-1, 1]) line(p, [X + 18 * s, Bt - 92], [X + 18 * s + 2, Bt - 70], B.Moss, 3, false);
      break;
    case "cairn":
      for (const [dx, dy, r] of [[-16, 0, 13], [14, 2, 12], [0, -2, 14], [-6, -20, 11], [8, -22, 10], [1, -38, 9], [0, -52, 7]] as const)
        ellipse(p, X + dx, Bt - 10 + dy, r, r * 0.78, B.Stone, (x, y) => (sn(x, y, 8, 308) > 0.7 ? 1 : 0));
      break;
  }
  return p.render(true);
}

/** Tudo o que o teste `cenarios` pinta. */
export const draw = { groundTile, patchTile, mudTile, pavingTile, waterTile, boardTile, deadwoodTile, deadTree, monolith, stiltHut, stakeTile, brazier, flameFrame, arenaSigil, flatDecor, tallDecor };
export { lit, fieldAt };
