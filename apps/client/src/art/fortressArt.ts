import { E, FLAT, HD, OPEN, ellipse, hash01, limb, lit, noise, paper, poly, sn } from "./empireArt.ts";
import { box, hline, ivy, masonry, rubbleTop, vline } from "./empireMonuments.ts";
import type { Paper } from "./duneArt.ts";

/**
 * Arte da Fortaleza Orc (Ruínas do Império), no padrão novo (`docs/ARTE_TIBIA.md`, 128 px por tile, pintada por código,
 * sem `Math.random`), com a paleta e as peças dos Portões do Império (muros, torres, arco, colunas) e o que é só daqui:
 *
 * - **Andares**: o paredão do precipício (a face de rocha que desce do andar do castelo até o vale), a beirada de pedra
 *   em volta do abismo e, no andar de cima, o terraço da torre de menagem (lajes, parapeito com ameias, o buraco do
 *   telhado caído), a fachada sul dela e os telhados das casernas. O vale lá embaixo é uma textura só, pintada em
 *   `valleyArt.ts`.
 * - **Pontes**: o tabuleiro de pedra com parapeitos e a ponte de cordas dos orcs (tábuas com frestas: o vale aparece
 *   por elas).
 * - **Acampamento**: a terra batida, a paliçada de norte a sul, os panos de guerra pendurados e o trono. Tendas, totens,
 *   estandartes, a fogueira, a paliçada de frente e os enfeites vêm da folha do ChatGPT (`proto/fortalezaArt.ts`).
 */

const mod = (v: number, n: number) => ((v % n) + n) % n;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Pinta um pixel com quebra na borda (texturas que emendam). */
function wrapOn(p: Paper, x: number, y: number, mat: number | null, tone: number) {
  p.on(mod(Math.round(x), HD), mod(Math.round(y), HD), mat, tone);
}

// --- Abismo -----------------------------------------------------------------------------------

/** Andares entre o castelo e o vale: o paredão tem esta altura (tiles) e o vale aparece deslocado isto para o sul. */
export const DROP = 2;

/**
 * Paredão do precipício, a face de rocha que desce da beirada do castelo (a linha de abismo logo ao sul de chão) até o
 * vale. `row` 0 é o tile de cima (a beirada com o capim pendurado e as raízes), 1 o de baixo, que escurece e se desfaz
 * em pontilhado na névoa: dali para baixo aparece o vale. Rocha natural, não muro: estratos de altura irregular, cada
 * um quebrado em blocos por fendas tortas e inclinadas, com a quina de cima clara (a luz vem de cima), a sombra embaixo
 * e o bojo de cada bloco; musgo e tufos nas saliências, raízes descendo. Emenda com o vizinho do lado (período de
 * 128 px); `v` muda o desenho.
 */
export function cliffTile(row: 0 | 1, v: number): Uint8ClampedArray {
  const p = paper();
  const span = HD * DROP;
  // Os estratos: alturas de 26 a 56 px, a linha entre eles ondula (sempre com período de 128 px). Não dependem de `v`:
  // os estratos continuam de um tile para o vizinho, que pode ser de outra variação.
  const tops: number[] = [-40];
  while (tops[tops.length - 1] < span + 40) tops.push(tops[tops.length - 1] + 26 + Math.floor(hash01(tops.length * 13, 760) * 30));
  const wob = (x: number, k: number) => 4 * Math.sin((2 * Math.PI * x) / HD + k * 1.7) + 2 * Math.sin((6 * Math.PI * x) / HD + k * 2.3);
  const strat = (x: number, gy: number) => {
    let k = 0;
    while (k + 1 < tops.length && gy >= tops[k + 1] + wob(x, k + 1)) k++;
    const y0 = tops[k] + wob(x, k), y1 = tops[k + 1] + wob(x, k + 1);
    return { k, ly: gy - y0, h: y1 - y0 };
  };
  // As fendas de cada estrato: a da emenda dos tiles (igual em todas as variações, perto da borda) e até 2 sorteadas
  // no meio, inclinadas e tortas. Devolve o bloco e a posição nele.
  const block = (x: number, k: number, ly: number) => {
    const n = 1 + Math.floor(hash01(k * 7 + v, 761) * 2.4);
    const cuts: number[] = [mod((hash01(k * 3, 770) - 0.5) * 24 + 3 * Math.sin(ly / 6 + k), HD)];
    for (let j = 1; j < n; j++) {
      const slope = (hash01(k * 11 + j * 3 + v, 762) - 0.5) * 0.6;
      cuts.push(24 + ((j - 1 + 0.2 + hash01(k * 5 + j + v * 7, 763) * 0.6) * 80) / (n - 1) + (ly - 12) * slope + 2 * Math.sin(ly / 5 + j));
    }
    cuts.sort((a, b) => a - b);
    let j = cuts.findIndex((c) => c > x);
    if (j < 0) j = 0;
    const right = j === 0 && x >= cuts[n - 1] ? cuts[0] + HD : cuts[j];
    const left = j === 0 ? cuts[n - 1] - (x >= cuts[n - 1] ? 0 : HD) : cuts[j - 1];
    return { id: k * 4 + (j === 0 ? 0 : j), lx: x - left, w: right - left };
  };
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Slab, (x, y) => {
    const gy = row * HD + y;
    const { k, ly, h } = strat(x, gy);
    const { id, lx, w } = block(x, k, ly);
    let s = 0.6 - (gy / span) * 0.36 + (hash01(id * 7 + v * 3, 764) - 0.5) * 0.18;
    // Bojo do bloco: claro em cima e à esquerda, a sombra embaixo e na fenda da direita.
    s += 0.1 * Math.sin((Math.PI * Math.min(lx, w)) / w) - 0.05;
    if (ly < 2) s += 0.26;
    else if (ly < 5) s += 0.12;
    else if (h - ly < 3) s -= 0.28;
    else if (h - ly < 7) s -= 0.12;
    if (lx < 3) s += 0.08;
    else if (w - lx < 4) s -= 0.16;
    return s + (sn(x, y, 8, 765 + v) - 0.5) * 0.16;
  }, (x, y) => (noise(x, y, 766 + v) < 0.05 ? -1 : 0));
  // Rocha mais quente em alguns blocos (o arenito do império por baixo do castelo) e as fendas e juntas escuras.
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const gy = row * HD + y;
      const { k, ly, h } = strat(x, gy);
      const { id, lx, w } = block(x, k, ly);
      if (hash01(id * 3 + v, 767) < 0.3) p.mat[y * HD + x] = E.Wall;
      if (ly < 1 || lx < 1 || w - lx < 1) p.on(x, y, E.Line, h - ly < 3 ? 0 : 1);
      // Musgo e tufos nas saliências (a quina de cima de cada estrato).
      else if (ly < 5 && sn(x, y, 16, 768 + v + row) > 0.6) p.on(x, y, E.Moss, noise(x, y, 769) < 0.4 ? 2 : 3);
    }
  if (row === 0) {
    // A beirada: capim e terra do castelo pendurados, raízes descendo pela rocha.
    for (let x = 0; x < HD; x++) {
      const lip = 8 + 4 * Math.sin((2 * Math.PI * x) / HD * 3 + v) + noise(x >> 2, v, 729) * 5;
      for (let y = 0; y < lip; y++) p.on(x, y, y < lip - 3 ? E.Grass : E.Dirt, y < 2 ? 4 : y < lip - 3 ? 3 : 1);
      if (noise(x, v, 730) < 0.06) {
        const len = 20 + noise(x, v, 731) * 50;
        let rx = x;
        for (let y = lip; y < lip + len; y++) { if (noise(y, x, 732) < 0.2) rx += noise(y, x, 733) < 0.5 ? -1 : 1; wrapOn(p, rx, y, E.Bark, 1); }
      }
    }
    ivy(p, 0, HD - 1, 6, 70, 40 + v);
  }
  const out = p.render(false);
  if (row === 1) {
    // O pé do paredão se desfaz na névoa (pontilhado): o vale aparece por baixo.
    for (let y = 60; y < HD; y++)
      for (let x = 0; x < HD; x++) {
        const t = (y - 60) / (HD - 60) + (sn(x, y, 16, 734 + v) - 0.5) * 0.35;
        if (t > BAYER4[(y & 3) * 4 + (x & 3)]) out[(y * HD + x) * 4 + 3] = 0;
      }
  }
  return out;
}

/**
 * Paredão de lado (no tile de abismo com chão a oeste, `side` -1, ou a leste, 1): uma faixa de rocha descendo da
 * beirada, escurecendo para longe dela e se desfazendo no pontilhado (a rocha some na sombra do vale). O sol do fim
 * de tarde vem do oeste: a face que olha para o oeste (chão a leste) fica na luz, a outra na sombra.
 * Transparente no resto do tile.
 */
export function sideCliffTile(side: -1 | 1, v: number): Uint8ClampedArray {
  const p = paper();
  const reach = (y: number) => 66 + 8 * Math.sin((2 * Math.PI * y) / HD * 2 + v) + 4 * Math.sin((6 * Math.PI * y) / HD + v);
  const from = (x: number) => (side < 0 ? x : HD - 1 - x);
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => from(x) < reach(y), E.Slab, (x, y) => {
    const t = from(x) / reach(y);
    const band = Math.floor((y + 9 * Math.sin(from(x) / 6 + v)) / 18);
    const ly = mod(y + band * 7 + Math.round(4 * Math.sin(from(x) / 9 + v)), 18);
    return 0.62 - t * 0.4 + (hash01(band * 5 + v, 735) - 0.5) * 0.16 + (ly < 2 ? 0.16 : ly > 15 ? -0.14 : 0) + (side > 0 ? 0.04 : -0.1);
  }, (x, y) => (noise(x, y, 736 + v) < 0.05 ? -1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!p.has(x, y)) continue;
      // A laje da beirada sai um pouco por cima do vão (a borda dela é torta, não a linha do tile), clara em cima,
      // com musgo em manchas; logo depois dela, a sombra que ela faz na face.
      const lip = 4 + 7 * sn(0, y, 16, 739 + v) + 3 * noise(0, y >> 2, 744 + v);
      if (from(x) < lip) p.on(x, y, sn(x, y, 16, 738 + v) > 0.64 ? E.Moss : E.Slab, side > 0 ? 4 : 3);
      else if (from(x) < lip + 2) p.on(x, y, E.Slab, 1);
    }
  const out = p.render(false);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const t = from(x) / reach(y) - 0.7 + (sn(x, y, 16, 737) - 0.5) * 0.3;
      if (t > BAYER4[(y & 3) * 4 + (x & 3)] * 0.5) out[(y * HD + x) * 4 + 3] = 0;
    }
  return out;
}

/**
 * Beirada do abismo no tile de chão (bits de `OPEN`: os lados com abismo): lajes de rocha quebradas na borda, o fio
 * escuro do vão e tufos de capim. A onda vale o mesmo nas pontas de cada lado, então a beirada segue de tile em tile.
 */
export function ledgeEdge(open: number): Uint8ClampedArray {
  const p = paper();
  const depth = (t: number, seed: number) => 16 + 5 * Math.sin((2 * Math.PI * t) / HD * 2 + seed) + 3 * Math.sin((6 * Math.PI * t) / HD + seed);
  const dist = (x: number, y: number) => {
    let d = 1e9;
    if (open & OPEN.n) d = Math.min(d, y / depth(x, 11));
    if (open & OPEN.s) d = Math.min(d, (HD - 1 - y) / depth(x, 12));
    if (open & OPEN.w) d = Math.min(d, x / depth(y, 13));
    if (open & OPEN.e) d = Math.min(d, (HD - 1 - x) / depth(y, 14));
    if (open & OPEN.nw) d = Math.min(d, Math.hypot(x, y) / 14);
    if (open & OPEN.ne) d = Math.min(d, Math.hypot(HD - 1 - x, y) / 14);
    if (open & OPEN.sw) d = Math.min(d, Math.hypot(x, HD - 1 - y) / 14);
    if (open & OPEN.se) d = Math.min(d, Math.hypot(HD - 1 - x, HD - 1 - y) / 14);
    return d;
  };
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => dist(x, y) < 1, E.Slab, (x, y) => {
    const d = dist(x, y);
    return FLAT + (d > 0.7 ? 0.08 : d < 0.25 ? 0.04 : 0) + (sn(x, y, 16, 740) - 0.5) * 0.2;
  }, (x, y) => (noise(x, y, 741) < 0.08 ? -1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const d = dist(x, y);
      // A quina de fora da laje: clara (pega a luz) nos lados e embaixo, onde a laje continua no paredão do tile do
      // abismo; só a beira do norte (o vão visto de cima) tem o fio escuro.
      if ((open & OPEN.n) && y / depth(x, 11) < 0.14) p.on(x, y, E.Line, 1);
      else if (d < 0.25 && noise(x >> 1, y >> 1, 743) < 0.7) p.on(x, y, E.Slab, 3);
      else if (d < 1 && d > 0.82 && noise(x >> 1, y >> 1, 742) < 0.5) p.on(x, y, E.Grass, 2);
    }
  return p.render(false);
}

// --- Pontes -----------------------------------------------------------------------------------

/**
 * Tabuleiro da ponte de pedra (3 tiles de largura, o caminho é norte-sul): lajes de travertino em fiadas, gastas no
 * meio, com musgo nas juntas; `side` -1 e 1 são as colunas da beira, com o parapeito (o topo claro e a face de dentro).
 */
export function bridgeTile(side: -1 | 0 | 1, q: number): Paper {
  const p = paper();
  const shift = (q >> 1) * 21;
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Travertine, (x, y) => {
    const row = Math.floor(y / 32);
    const lx = mod(x + row * 23 + shift, 48);
    const id = row * 7 + Math.floor((x + row * 23 + shift) / 48);
    let s = FLAT - 0.06 + (hash01(id + q * 13, 750) - 0.5) * 0.14;
    if (mod(y, 32) < 2 || lx < 2) s -= 0.24;
    else if (mod(y, 32) < 4 || lx < 4) s += 0.06;
    return s;
  }, (x, y) => (noise(x, y, 751 + q) < 0.05 ? -1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const lx = mod(x + Math.floor(y / 32) * 23 + shift, 48);
      if ((mod(y, 32) < 2 || lx < 2) && sn(x, y, 16, 752 + q) > 0.55) p.on(x, y, E.Moss, 2);
    }
  if (side !== 0) {
    // Parapeito: o topo (luz de cima) e a face de dentro (a do oeste na sombra, a do leste na luz).
    const top: [number, number] = side < 0 ? [0, 16] : [HD - 17, HD - 1];
    const face: [number, number] = side < 0 ? [17, 24] : [HD - 25, HD - 18];
    masonry(p, [face[0], 0, face[1], HD - 1], 3 + q, { shade: side < 0 ? 0.3 : 0.62, dark: 0, bw: 16, bh: 32 });
    rubbleTop(p, [top[0], 0, top[1], HD - 1], 50 + q);
    vline(p, side < 0 ? top[1] : top[0], 0, HD - 1, E.Tuff, side < 0 ? 2 : 5);
    // A sombra do parapeito no tabuleiro.
    for (let y = 0; y < HD; y++)
      for (let k = 0; k < 10; k++) {
        const x = side < 0 ? face[1] + 1 + k : face[0] - 1 - k;
        if (side < 0 && k < 7 - ((x + y) & 1)) p.nudge(x, y, -1);
      }
  }
  return p;
}

/**
 * Ponte de cordas dos orcs (2 tiles de largura, o caminho é norte-sul): tábuas atravessadas, tortas e desiguais, com
 * frestas por onde se vê o vale (sem pintar), a corda de corrimão na beira de fora (`side`) e as amarras.
 */
export function ropeBridgeTile(side: -1 | 1, v: number): Paper {
  const p = paper();
  for (let b = 0; b < 8; b++) {
    const y0 = b * 16 + 2, y1 = y0 + 11;
    const l = side < 0 ? 18 + noise(b, v, 760) * 8 : 0;
    const r = side < 0 ? HD - 1 : HD - 19 - noise(b, v, 761) * 8;
    const tilt = (noise(b, v, 762) - 0.5) * 4;
    const old = noise(b, v, 763) < 0.2;
    if (noise(b, v, 764) < 0.06) continue; // tábua que caiu
    p.fill([l, y0 - 3, r, y1 + 3], (x, y) => y >= y0 + tilt * ((x - 64) / 64) && y <= y1 + tilt * ((x - 64) / 64), old ? E.Bark : E.Dirt,
      (x, y) => 0.66 - ((y - y0) / 11) * 0.22 + (noise(b, x >> 5, 765) - 0.5) * 0.1, (x, y) => (noise(x >> 2, y, 766 + b) < 0.08 ? -1 : 0));
    for (let x = Math.ceil(l) + 3; x < r - 3; x++) if (noise(x >> 3, b, 767) < 0.4) p.on(x, y0 + 5 + Math.round(Math.sin(x / 7 + b) * 1.2), null, 2);
  }
  // Vigas por baixo das tábuas (aparecem nas frestas) e a corda do corrimão.
  const beam = side < 0 ? 34 : HD - 35;
  for (let y = 0; y < HD; y++) if (!p.has(beam, y)) { p.px(beam, y, E.Bark, 1); p.px(beam + 1, y, E.Bark, 1); }
  const rx = side < 0 ? 10 : HD - 11;
  for (let y = 0; y < HD; y++) {
    const sag = Math.round(Math.sin((Math.PI * y) / HD) * 3);
    for (let k = -2; k <= 2; k++) p.px(rx + k + sag * side, y, E.Dry, Math.abs(k) === 2 ? 1 : k < 0 ? 4 : 3);
    if (y % 9 === 0) { p.px(rx + sag * side, y, E.Bark, 1); p.px(rx + 1 + sag * side, y, E.Bark, 1); }
  }
  // Amarras da corda nas tábuas.
  for (let y = 8; y < HD; y += 32) limb(p, [rx, y], [rx - side * 14, y + 4], 1.5, 1.5, E.Dry);
  return p;
}

// --- Torre de menagem (o andar de cima) ----------------------------------------------------

/** Buraco do telhado caído no terraço (bits de `OPEN`: os lados com terraço): o escuro do salão, vigas quebradas e a borda lascada. */
export function roofHoleTile(rim: number, v: number): Paper {
  const p = paper();
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Void, (x, y) => 0.1 + (sn(x, y, 32, 790 + v) - 0.5) * 0.1);
  const depth = (t: number, seed: number) => 16 + 7 * Math.sin((2 * Math.PI * t) / HD * 2 + seed) + 4 * Math.sin((6 * Math.PI * t) / HD + seed);
  const edge = (x: number, y: number) =>
    (rim & OPEN.n && y < depth(x, 21)) || (rim & OPEN.s && HD - 1 - y < depth(x, 22))
    || (rim & OPEN.w && x < depth(y, 23)) || (rim & OPEN.e && HD - 1 - x < depth(y, 24))
    || (rim & OPEN.nw && Math.hypot(x, y) < 20) || (rim & OPEN.ne && Math.hypot(HD - 1 - x, y) < 20)
    || (rim & OPEN.sw && Math.hypot(x, HD - 1 - y) < 20) || (rim & OPEN.se && Math.hypot(HD - 1 - x, HD - 1 - y) < 20);
  // Vigas carbonizadas atravessando o vão.
  for (let k = 0; k < 2; k++) {
    const y = 30 + k * 60 + noise(k, v, 791) * 12;
    p.fill([0, y - 6, HD - 1, y + 6], (x) => noise(x >> 4, k + v, 792) > 0.18, E.Bark, (x, yy) => 0.36 - (yy - y) * 0.02);
  }
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => Boolean(edge(x, y)), E.Slab, (x, y) => FLAT + (sn(x, y, 16, 793) - 0.5) * 0.2, (x, y) => (noise(x, y, 794) < 0.06 ? -1 : 0));
  // A quina de dentro do buraco: a laje quebrada mostra a espessura (sombra).
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) if (edge(x, y) && !edge(x, y + 3) && y + 3 < HD) p.on(x, y, E.Slab, 1);
  return p;
}

/** Parapeito do terraço (bits de `OPEN`: os lados que dão para fora), com ameias e a sombra dele nas lajes; transparente no resto. */
export function parapetTile(out: number, v: number): Uint8ClampedArray {
  const p = paper();
  const T = 22;
  const sides: [number, number, number, number][] = [];
  if (out & OPEN.n) sides.push([0, 0, HD - 1, T]);
  if (out & OPEN.s) sides.push([0, HD - 1 - T, HD - 1, HD - 1]);
  if (out & OPEN.w) sides.push([0, 0, T, HD - 1]);
  if (out & OPEN.e) sides.push([HD - 1 - T, 0, HD - 1, HD - 1]);
  for (const [k, b] of sides.entries()) rubbleTop(p, b, 60 + v + k);
  // Ameias: blocos altos a cada 32 px na beira de fora.
  const merlon = (x0: number, y0: number, x1: number, y1: number) => {
    box(p, [x0, y0, x1, y1], E.Tuff, FLAT + 0.08);
    hline(p, x0, x1, y0, E.Tuff, 5);
    hline(p, x0, x1, y1, E.Tuff, 1);
  };
  for (let t = 4; t < HD - 12; t += 32) {
    if (noise(t, v, 795) < 0.18) continue;
    if (out & OPEN.n) merlon(t, 0, t + 16, 10);
    if (out & OPEN.s) merlon(t, HD - 11, t + 16, HD - 1);
    if (out & OPEN.w) merlon(0, t, 10, t + 16);
    if (out & OPEN.e) merlon(HD - 11, t, HD - 1, t + 16);
  }
  const img = p.render(true);
  // Sombra do parapeito nas lajes (a luz vem do noroeste: sombra a leste e ao sul dele).
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const o = (y * HD + x) * 4;
      if (img[o + 3]) continue;
      const near = (out & OPEN.n && y > T && y < T + 12) || (out & OPEN.w && x > T && x < T + 12);
      if (near && (x + y) % 2 === 0) img.set([20, 18, 14, 110], o);
    }
  return img;
}

/**
 * Fachada sul da torre de menagem, `KEEP_RISE` tiles de altura (os andares de cima vistos de frente), um tile de
 * largura por vez: `row` 0 em cima (a cornija com dentículos e as janelas do último andar), as do meio com janelas e
 * a de baixo com o rodapé em talude. Cantaria de blocos grandes de travertino (64×32, desencontrados, cada um com o seu
 * tom), não o tijolinho dos muros: a torre é a obra mais nobre do castelo. `kind`: 0 parede, 1 janela, 2 a porta
 * (`part` -1, 0, 1: esquerda, meio, direita do arco, que ocupa os 2 andares de baixo); `end` -1 ou 1 nas quinas.
 */
export function keepFaceTile(row: number, kind: 0 | 1 | 2, part: -1 | 0 | 1, end: -1 | 0 | 1, v: number): Uint8ClampedArray {
  const p = paper();
  const top = row * HD;
  const last = row === KEEP_RISE - 1;
  // Os andares de cima no sol do fim de tarde, o de baixo na sombra do pátio.
  masonry(p, [0, 0, HD - 1, HD - 1], v * 5 + row * 3, { shade: 0.46 - row * 0.05, dark: 0.12, mat: E.Travertine, bw: 64, bh: 32 });
  // Uma fiada de tufo escuro entre os andares.
  if (row > 0) { box(p, [0, 0, HD - 1, 7], E.Tuff, 0.4); hline(p, 0, HD - 1, 0, E.Tuff, 4); }
  if (row === 0) {
    // Cornija: a faixa de travertino que separa o terraço da fachada, com dentículos.
    box(p, [0, 0, HD - 1, 16], E.Travertine, 0.66);
    hline(p, 0, HD - 1, 0, E.Travertine, 5);
    hline(p, 0, HD - 1, 16, E.Travertine, 1);
    for (let x = 2; x < HD; x += 12) box(p, [x, 17, x + 6, 22], E.Travertine, 0.4);
  }
  if (last) {
    // Rodapé em talude.
    box(p, [0, HD - 20, HD - 1, HD - 1], E.Tuff, 0.4);
    hline(p, 0, HD - 1, HD - 20, E.Tuff, 5);
  }
  const cx = 64;
  if (kind === 1 && !last) {
    // Janela arqueada estreita, escura, com a soleira clara.
    const y0 = row === 0 ? 36 : 22, y1 = row === 0 ? 106 : 96;
    p.fill([cx - 14, y0, cx + 14, y1], (x, y) => y > y0 + 14 || Math.hypot(x - cx, y - (y0 + 14)) < 14, E.Void, () => 0.1);
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) p.on(cx + Math.cos(a) * 16, y0 + 14 + Math.sin(a) * 16, E.Travertine, 4);
    box(p, [cx - 18, y1 + 1, cx + 18, y1 + 6], E.Travertine, 0.62);
    hline(p, cx - 18, cx + 18, y1 + 1, E.Travertine, 5);
  }
  if (kind === 1 && last) {
    // Seteira no andar de baixo.
    box(p, [cx - 4, 26, cx + 4, 82], E.Void, 0.1);
    hline(p, cx - 6, cx + 6, 83, E.Travertine, 5);
  }
  if (kind === 2) {
    // A porta: um arco de 3 tiles de largura nos 2 andares de baixo, aduelas de travertino, e o escuro do salão.
    const W3 = HD * 3, ox = (part + 1) * HD, full = KEEP_RISE * HD;
    const ax = W3 / 2, rIn = W3 / 2 - 44, spring = full - 20 - 150;
    const gy = (y: number) => y + top;
    p.fill([0, 0, HD - 1, HD - 1], (x, y) => {
      const X = x + ox, Y = gy(y);
      return Y >= spring && Y < full - 20 ? Math.abs(X - ax) <= rIn : Math.hypot((X - ax) / rIn, (Y - spring) / 80) < 1 && Y < spring;
    }, E.Void, (x, y) => 0.08 + (gy(y) / full) * 0.06);
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.004) {
      for (let r = 0; r < 22; r++) {
        const X = ax + Math.cos(a) * (rIn + 2 + r), Y = spring + Math.sin(a) * (80 + 2 + r);
        const x = X - ox, y = Y - top;
        if (x < 0 || x >= HD || y < 0 || y >= HD) continue;
        const seg = Math.floor((a - Math.PI) / (Math.PI / 9));
        p.on(x, y, E.Travertine, r < 2 ? 5 : r > 19 ? 1 : (seg % 2 ? 3 : 4) - (Math.floor(a * 300) % 23 === 0 ? 2 : 0));
      }
    }
    // Ombreiras.
    for (const sx of [ax - rIn - 22, ax + rIn + 2]) {
      const x0 = sx - ox;
      if (x0 + 20 < 0 || x0 >= HD) continue;
      for (let y = Math.max(0, spring - top); y < Math.min(HD, full - 20 - top); y++)
        for (let x = Math.max(0, x0); x < Math.min(HD, x0 + 20); x++) p.on(x, y, E.Travertine, mod(y + top, 24) < 2 ? 1 : x - x0 < 3 ? 5 : 3);
    }
    // A grade levadiça erguida até a metade: as barras de ferro descendo do alto do arco.
    for (let X = ax - rIn + 10; X < ax + rIn; X += 22) {
      const x = X - ox;
      if (x < 0 || x >= HD) continue;
      for (let Y = spring - 40; Y < spring + 30; Y++) {
        const y = Y - top;
        if (y < 0 || y >= HD || Math.hypot((X - ax) / rIn, (Y - spring) / 80) >= 1 && Y < spring) continue;
        p.on(x, y, E.Iron, 2); p.on(x + 1, y, E.Iron, 3);
      }
      for (const Y of [spring - 10, spring + 18]) for (let k = -11; k < 11; k++) { const y = Y - top; if (y >= 0 && y < HD && x + k >= 0 && x + k < HD) p.on(x + k, y, E.Iron, 2); }
      // As pontas das barras.
      const yp = spring + 30 - top;
      if (yp >= 0 && yp < HD - 3) { p.on(x, yp + 1, E.Iron, 1); p.on(x, yp + 2, E.Iron, 1); }
    }
  }
  // Quinas da torre: a do oeste na luz, a do leste na sombra, com os blocos de canto em amarração.
  if (end < 0) for (let y = 0; y < HD; y++) for (let x = 0; x < (mod(y + top, 64) < 32 ? 20 : 12); x++) p.on(x, y, null, x < 3 ? 5 : mod(y + top, 32) < 2 ? 2 : 4);
  if (end > 0) for (let y = 0; y < HD; y++) for (let x = HD - (mod(y + top, 64) < 32 ? 20 : 12); x < HD; x++) p.on(x, y, null, x > HD - 4 ? 1 : mod(y + top, 32) < 2 ? 1 : 2);
  // Hera subindo do pé, em alguns trechos.
  if (last && kind === 0 && v % 3 === 0)
    for (let x = 0; x < HD; x++) {
      const reach = 110 * Math.max(0, sn(x, 0, 32, 796 + v) * 1.6 - 0.6);
      for (let d = 0; d < reach; d++) if (noise(x >> 1, (HD - d) >> 1, 797) < 0.6) p.on(x, HD - 1 - d, E.Ivy, noise(x, d, 798) < 0.3 ? 4 : 2);
    }
  // Escorrido escuro de fuligem e chuva descendo das janelas e da cornija.
  for (let x = 0; x < HD; x++) {
    if (noise(x >> 2, row, 799 + v) > 0.12) continue;
    const len = 20 + noise(x, row, 800) * 60;
    for (let y = 0; y < len; y++) p.nudge(x, y, -1);
  }
  return p.render(false);
}

/** Andar de cima da torre de menagem, em tiles acima do chão (o terraço aparece deslocado isto para o norte). */
export const KEEP_RISE = 3;

// --- Telhados das casernas (andar de cima das salas) -------------------------------------------

/** Altura (px de arte) dos muros das casernas: o telhado fica deslocado isto para o norte, em cima deles. */
export const ROOM_WALL = 82;
/** Linha do telhado de uma caserna: a beira de cima, a água do norte, a cumeeira, a água do sul e a testeira de baixo. */
export type RoofRow = "top" | "north" | "ridge" | "south" | "bottom";

/**
 * Um tile do telhado de uma caserna (o andar de cima da sala), montado como no Tibia: os mesmos tiles servem para
 * todas as casernas. Telha romana de terracota em duas águas (a cumeeira de leste a oeste, a água do norte na luz, a do
 * sul na sombra): as telhas largas (tégulas) em fiadas de 32 px e, por cima das juntas, as canais redondas (ímbrices)
 * descendo a água a cada 32 px (o tile emenda com o vizinho); cada telha com o seu tom, a fiada de cima jogando
 * sombra na de baixo. `col` -1 e 1 nas pontas (a beirada de pedra). Por variação `v`: 0 inteiro, 1 remendo de couro
 * dos orcs pregado, 2 buraco (as ripas, as vigas e o escuro de dentro), 3 caveira com chifres na cumeeira, 4 telhas
 * faltando (as ripas à mostra).
 */
export function roofTile(row: RoofRow, col: -1 | 0 | 1, v: number): Paper {
  const p = paper();
  const north = row === "top" || row === "north";
  const ridgeY = 54;
  const upperAt = (y: number) => (row === "ridge" ? y < ridgeY : north);
  // A água: as fiadas descem para longe da cumeeira (no norte, de baixo para cima na tela).
  const course = (y: number) => Math.floor(y / 32);
  const inCourse = (y: number) => (upperAt(y) ? 31 - mod(y, 32) : mod(y, 32));
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Terracotta, (x, y) => {
    const up = upperAt(y);
    const lx = mod(x + 16, 32), ly = inCourse(y);
    const id = Math.floor((x + 16) / 32) * 7 + course(y) * 13 + (up ? 0 : 5);
    let s = (up ? 0.6 : 0.42) + (hash01(id + v * 31, 804) - 0.5) * 0.14;
    // A ímbrice: o meio-cilindro por cima da junta, claro no lado do sol (oeste) e escuro do outro.
    const ix = mod(x, 32);
    if (ix < 10) s = (up ? 0.62 : 0.46) + (ix < 3 ? 0.2 : ix > 7 ? -0.2 : 0.06);
    else {
      // A tégula: a borda levantada dos lados e a sombra da fiada de cima.
      if (lx < 2 || lx > 29) s -= 0.1;
      if (ly < 5) s -= 0.2;
      else if (ly > 28) s += 0.08;
    }
    if (ly < 2 && ix >= 10) s -= 0.12;
    if (row === "ridge" && Math.abs(y - ridgeY) < 7) s = 0.5 + (y < ridgeY ? 0.15 : -0.1);
    return s;
  }, (x, y) => (noise(x, y, 805 + v) < 0.04 ? -1 : 0));
  // Telhas faltando: as ripas de madeira à mostra.
  if (v === 4 || v === 2) {
    const cx = 30 + noise(2, col + 2, 818) * 68, cy = 30 + noise(col + 2, 2, 819) * 68;
    for (let y = 0; y < HD; y++)
      for (let x = 0; x < HD; x++) {
        const d = Math.hypot((x - cx) / 34, (y - cy) / 26) + (noise(x >> 3, y >> 3, 820) - 0.5) * 0.5;
        if (d >= 1) continue;
        // As ripas claras e, entre elas, a madeira escura do forro (não o vazio: o buraco de verdade é o `v` 2).
        const i = y * HD + x, batten = mod(y, 16) < 6;
        p.mat[i] = E.Bark; p.shade[i] = batten ? 0.5 : 0.2; p.off[i] = 0; p.fixed[i] = -1;
      }
  }
  if (v === 2) {
    // O telhado caiu aqui: o escuro de dentro e as vigas atravessando.
    for (let y = 0; y < HD; y++)
      for (let x = 0; x < HD; x++) {
        const d = Math.hypot((x - 64) / 52, (y - 64) / 42) + (noise(x >> 2, y >> 2, 803) - 0.5) * 0.3;
        if (d >= 0.82) continue;
        const i = y * HD + x, beam = mod(x, 44) < 7;
        p.mat[i] = beam ? E.Bark : E.Void; p.shade[i] = beam ? 0.3 : 0.06; p.off[i] = 0; p.fixed[i] = -1;
      }
  }
  if (v === 1) {
    // Couro de bicho esticado e pregado por cima das telhas quebradas.
    const cx = 40 + noise(1, col + 2, 806) * 48, cy = 40 + noise(col + 2, 1, 807) * 48;
    p.fill([cx - 34, cy - 24, cx + 34, cy + 24], (x, y) => Math.abs(x - cx) / 30 + Math.abs(y - cy) / 20 < 1.1 - noise(x >> 3, y >> 3, 810) * 0.25,
      E.Dirt, (x, y) => (north ? 0.62 : 0.46) + (sn(x, y, 16, 811) - 0.5) * 0.14);
    for (let a = 0; a < Math.PI * 2; a += 0.6) p.on(cx + Math.cos(a) * 24, cy + Math.sin(a) * 15, E.Iron, 4);
  }
  // Musgo e liquens nas telhas da água do norte (a mais úmida).
  if (north || row === "ridge")
    for (let y = 0; y < HD; y++)
      for (let x = 0; x < HD; x++) if (upperAt(y) && sn(x, y, 16, 812 + v) > 0.8 && noise(x, y, 813) < 0.5) p.on(x, y, E.Moss, 1);
  if (row === "ridge") {
    // As telhas da cumeeira, meio-cilindros em fila.
    for (let x = 0; x < HD; x += 24) ellipse(p, x + 12, ridgeY, 13, 7, E.Terracotta);
    if (v === 3) {
      const x = 64;
      ellipse(p, x, ridgeY - 8, 11, 10, E.Bone);
      p.on(x - 4, ridgeY - 8, E.Void, 1); p.on(x + 4, ridgeY - 8, E.Void, 1); p.on(x - 3, ridgeY - 7, E.Void, 1); p.on(x + 3, ridgeY - 7, E.Void, 1);
      limb(p, [x - 9, ridgeY - 12], [x - 22, ridgeY - 28], 3, 1.2, E.Bone);
      limb(p, [x + 9, ridgeY - 12], [x + 22, ridgeY - 28], 3, 1.2, E.Bone);
    }
  }
  if (row === "top") { hline(p, 0, HD - 1, 0, E.Terracotta, 5); hline(p, 0, HD - 1, 1, E.Terracotta, 4); }
  if (row === "bottom") {
    // A beira do telhado: as bocas redondas das ímbrices e a sombra embaixo.
    box(p, [0, HD - 12, HD - 1, HD - 1], E.Terracotta, 0.26);
    for (let x = 0; x < HD; x += 32) ellipse(p, x + 5, HD - 12, 6, 5, E.Terracotta);
    for (let x = 0; x < HD; x += 32) { p.on(x + 5, HD - 12, E.Void, 1); p.on(x + 4, HD - 12, E.Void, 1); }
  }
  // Beirada de pedra nas pontas (a da esquerda na luz).
  if (col !== 0) {
    const x0 = col < 0 ? 0 : HD - 12;
    box(p, [x0, 0, x0 + 11, HD - 1], E.Tuff, col < 0 ? 0.68 : 0.32);
    vline(p, col < 0 ? x0 : x0 + 11, 0, HD - 1, E.Line, 1);
  }
  return p;
}

/** Linha (`RoofRow`) do telhado de uma sala de `h` tiles de altura: a cumeeira um pouco acima do meio. */
export function roofRow(y: number, h: number): RoofRow {
  const ridge = Math.max(1, Math.floor(h * 0.42));
  return y === 0 ? "top" : y === h - 1 ? "bottom" : y < ridge ? "north" : y === ridge ? "ridge" : "south";
}

// --- Acampamento (de pé) --------------------------------------------------------------------

export const HANG = { w: 96, h: 300 } as const;

/** Pano de guerra pendurado (nas torres, na muralha e na fachada da torre de menagem): preto, rasgado, com o sinal do clã. */
export function hangingBanner(v: number): Uint8ClampedArray {
  const p = paper(HANG.w, HANG.h);
  const x0 = 10, x1 = HANG.w - 10, y0 = 8, y1 = HANG.h - 10;
  limb(p, [2, y0], [HANG.w - 3, y0], 3, 3, E.Bark);
  p.fill([x0, y0 + 2, x1, y1], (x, y) => {
    const tear = y > y1 - 50 - noise(Math.floor((x - x0) / 7), v, 855) * 70;
    return !tear && noise((x - x0) >> 2, (y - y0) >> 3, 856 + v) > 0.05;
  }, E.Iron, (x, y) => 0.5 + Math.sin((x - x0) / 9) * 0.1 - ((y - y0) / 300) * 0.12);
  const sx = HANG.w / 2, sy = 90;
  ellipse(p, sx, sy, 14, 16, E.Cloth);
  for (let f = -2; f <= 2; f++) limb(p, [sx + f * 6, sy - 9], [sx + f * 8, sy - 32 + Math.abs(f) * 4], 3.2, 2.6, E.Cloth);
  for (let y = y0 + 30; y < y1 - 70; y += 3) { p.on(x0 + 4, y, E.Cloth, 3); p.on(x1 - 4, y, E.Cloth, 3); }
  return p.render(true);
}

export const THRONE = { w: HD + 64, h: HD + 220 } as const;

/** O trono do chefe: a cadeira de pedra do império com o espaldar alto, coberta de peles, caveiras nos cantos e o pano vermelho. */
export function throneSprite(): Uint8ClampedArray {
  const p = paper(THRONE.w, THRONE.h);
  const cx = THRONE.w / 2, foot = THRONE.h - 16;
  // Degrau.
  box(p, [cx - 86, foot - 30, cx + 86, foot], E.Travertine, 0.5);
  hline(p, cx - 86, cx + 86, foot - 30, E.Travertine, 5);
  // Espaldar.
  masonry(p, [cx - 56, 40, cx + 56, foot - 110], 7, { shade: 0.56, dark: 0.08, mat: E.Travertine, bw: 28, bh: 20 });
  p.fill([cx - 56, 10, cx + 56, 44], (x, y) => Math.hypot((x - cx) / 56, (y - 44) / 34) < 1, E.Travertine, (x, y) => lit((x - cx) / 56, (y - 44) / 34, 0.6));
  // Assento e braços.
  box(p, [cx - 70, foot - 112, cx + 70, foot - 30], E.Travertine, 0.44);
  for (const s of [-1, 1]) {
    box(p, [cx + s * 62 - 14, foot - 150, cx + s * 62 + 14, foot - 40], E.Travertine, s < 0 ? 0.66 : 0.4);
    ellipse(p, cx + s * 62, foot - 156, 16, 14, E.Bone);
    p.on(cx + s * 62 - 5, foot - 156, E.Void, 1); p.on(cx + s * 62 + 5, foot - 156, E.Void, 1);
  }
  // Peles caindo do assento e o pano vermelho no espaldar.
  p.fill([cx - 58, foot - 118, cx + 58, foot - 20], (x, y) => y < foot - 26 - noise((x - cx + 64) >> 3, 0, 860) * 22, E.Dirt,
    (x, y) => 0.55 + (sn(x & 127, y & 127, 8, 861) - 0.5) * 0.3 - ((y - (foot - 118)) / 100) * 0.15);
  p.fill([cx - 30, 30, cx + 30, foot - 120], (x, y) => noise((x - cx) >> 2, y >> 3, 862) > 0.06, E.Cloth, (x) => 0.55 + Math.sin((x - cx) / 8) * 0.12);
  ellipse(p, cx, 80, 12, 14, E.Bone);
  p.on(cx - 4, 80, E.Void, 1); p.on(cx + 4, 80, E.Void, 1);
  return p.render(true);
}

/**
 * Máscara da borda do capim (bits de `OPEN`: os lados com capim), em branco: o capim do ChatGPT aparece por cima do
 * calçamento só aqui. A beira ondula e se quebra em dentes, com tufos saindo para dentro da pedra. A onda vale o mesmo
 * nas duas pontas de cada lado, então a borda segue de um tile para o outro.
 */
export function grassMask(grass: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(HD * HD * 4);
  // Lóbulos largos (o capim avança de 25% a 45% do tile sobre a pedra) com a beira em dentes.
  const depth = (t: number, seed: number) =>
    40 + 14 * Math.sin((2 * Math.PI * t) / HD * 2 + seed) + 7 * Math.sin((6 * Math.PI * t) / HD + seed * 2) + (noise(t >> 2, seed, 880) - 0.5) * 10;
  const corner = (d: number, seed: number) => d < 44 + (noise(Math.round(d) >> 2, seed, 881) - 0.5) * 10;
  const inside = (x: number, y: number) => Boolean(
    (grass & OPEN.n && y < depth(x, 1)) || (grass & OPEN.s && HD - 1 - y < depth(x, 2))
    || (grass & OPEN.w && x < depth(y, 3)) || (grass & OPEN.e && HD - 1 - x < depth(y, 4))
    || (grass & OPEN.nw && corner(Math.hypot(x, y), 5)) || (grass & OPEN.ne && corner(Math.hypot(HD - 1 - x, y), 6))
    || (grass & OPEN.sw && corner(Math.hypot(x, HD - 1 - y), 7)) || (grass & OPEN.se && corner(Math.hypot(HD - 1 - x, HD - 1 - y), 8)));
  const on = (x: number, y: number) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= HD || y >= HD) return;
    out.set([255, 255, 255, 255], (y * HD + x) * 4);
  };
  for (let y = 0; y < HD; y++) for (let x = 0; x < HD; x++) if (inside(x + 0.5, y + 0.5)) on(x, y);
  // Tufos: folhas de 2 a 3 px de largura saindo da beira para dentro da pedra.
  for (let k = 0; k < 220; k++) {
    const x = Math.floor(noise(k, grass, 882) * HD), y = Math.floor(noise(grass, k, 883) * HD);
    if (!inside(x, y)) continue;
    const dirs: [number, number][] = [];
    if (grass & OPEN.n) dirs.push([0, 1]);
    if (grass & OPEN.s) dirs.push([0, -1]);
    if (grass & OPEN.w) dirs.push([1, 0]);
    if (grass & OPEN.e) dirs.push([-1, 0]);
    if (!dirs.length) continue;
    const [dx, dy] = dirs[k % dirs.length];
    const len = 6 + Math.floor(noise(k, 7, 884) * 12);
    for (let s = 0; s < len; s++) { on(x + dx * s, y + dy * s); if (s < len - 2) on(x + dx * s + dy, y + dy * s + dx); }
  }
  return out;
}

// --- A vila baixa ------------------------------------------------------------------------------

/** A fonte seca da praça da vila, pintada para 3×3 tiles de chão (o mapa estica até a bacia); o pedestal sobe além. */
export const FOUNTAIN = { w: HD * 3 + 32, h: HD * 3 + 96 } as const;

/**
 * A fonte seca do império no meio da praça da vila: a bacia redonda de travertino com a
 * borda larga (o topo claro, a face da frente na sombra, juntas das pedras), um trecho da borda quebrado no sudeste com
 * os blocos caídos para fora, o fundo seco de lama rachada com folhas e uma mancha de limo onde ficava a água, e no
 * meio o pedestal com a taça de cima rachada (falta um pedaço). Musgo na borda e capim seco no pé. Luz do oeste.
 */
export function fountainSprite(): Uint8ClampedArray {
  const p = paper(FOUNTAIN.w, FOUNTAIN.h);
  const cx = FOUNTAIN.w / 2, foot = FOUNTAIN.h - 12;
  const R = 176, RIN = 146, RISE = 30;
  /** Centro da bacia no chão e o do topo da borda (levantado `RISE` px). */
  const gy = foot - R, ty = gy - RISE;
  const ang = (x: number, y: number, oy: number) => Math.atan2(y - oy, x - cx);
  // A brecha da borda: o trecho do sudeste caiu.
  const broken = (a: number) => a > 0.35 && a < 0.8;
  const inC = (x: number, y: number, oy: number, r: number) => Math.hypot(x - cx, y - oy) < r;
  // 1. Corpo da borda (a face de fora): os círculos do chão até o topo; a face é o que fica abaixo do topo.
  p.fill([cx - R, ty - R, cx + R, gy + R], (x, y) => {
    if (inC(x, y, ty, R)) return false;
    if (broken(ang(x, y, gy)) && y > gy) return false;
    for (let t = 0; t <= RISE; t += 3) if (inC(x, y, ty + t, R)) return true;
    return inC(x, y, gy, R);
  }, E.Travertine, (x, y) => {
    const a = ang(x, y, gy);
    const block = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 36);
    const edge = mod((a + Math.PI) / (2 * Math.PI) * 36, 1);
    // A face olha para o sul: mais clara do lado oeste (o sol baixo), escura no leste; juntas entre os blocos.
    let s = 0.42 - Math.cos(a) * 0.12 + (hash01(block, 900) - 0.5) * 0.1;
    if (edge < 0.08) s -= 0.18;
    const depth = (y - (ty + Math.sqrt(Math.max(0, R * R - (x - cx) ** 2)))) / RISE;
    if (depth < 0.15) s += 0.08;
    return s;
  }, (x, y) => (noise(x, y, 901) < 0.06 ? -1 : 0));
  // 2. O topo da borda (anel claro), com juntas radiais e musgo em manchas.
  p.fill([cx - R, ty - R, cx + R, ty + R], (x, y) => {
    const d = Math.hypot(x - cx, y - ty);
    return d < R && d >= RIN && !broken(ang(x, y, ty));
  }, E.Travertine, (x, y) => {
    const a = ang(x, y, ty);
    const d = Math.hypot(x - cx, y - ty);
    const edge = mod((a + Math.PI) / (2 * Math.PI) * 36, 1);
    let s = 0.66 - (y - ty) / R * 0.08 + (hash01(Math.floor(((a + Math.PI) / (2 * Math.PI)) * 36), 902) - 0.5) * 0.08;
    if (edge < 0.06) s -= 0.2;
    if (d > R - 4) s -= 0.12;
    else if (d < RIN + 4) s += 0.06;
    return s;
  }, (x, y) => (noise(x, y, 903) < 0.05 ? -1 : 0));
  for (let y = ty - R; y < ty + R; y++)
    for (let x = cx - R; x < cx + R; x++) {
      const d = Math.hypot(x - cx, y - ty);
      if (d < R && d >= RIN && sn(x & 127, y & 127, 8, 904) > 0.74) p.on(x, y, E.Moss, noise(x, y, 905) < 0.5 ? 1 : 2);
    }
  // 3. Dentro: a face de dentro da borda do norte (o crescente) e o fundo seco.
  p.fill([cx - RIN, ty - RIN, cx + RIN, ty + RIN], (x, y) => inC(x, y, ty, RIN) && !inC(x, y, gy, RIN), E.Travertine,
    (x, y) => 0.5 + (y - ty) / RIN * 0.15 - Math.cos(ang(x, y, ty)) * 0.06);
  // Lama rachada em placas: as células de Voronoi de uma grade de 28 px sorteada; a fenda é onde as duas sementes mais
  // perto ficam à mesma distância. Cada placa tem o seu tom e a beira de cima clara (as placas se encurvam ao secar).
  const CELL = 28;
  const plate = (x: number, y: number) => {
    let d1 = 1e9, d2 = 1e9, id = 0;
    const gx0 = Math.floor(x / CELL), gy0 = Math.floor(y / CELL);
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        const sx = (gx0 + i + 0.2 + hash01((gx0 + i) * 31 + (gy0 + j) * 7, 906) * 0.6) * CELL;
        const sy = (gy0 + j + 0.2 + hash01((gx0 + i) * 13 + (gy0 + j) * 29, 907) * 0.6) * CELL;
        const d = Math.hypot(x - sx, y - sy);
        if (d < d1) { d2 = d1; d1 = d; id = (gx0 + i) * 97 + gy0 + j; } else if (d < d2) d2 = d;
      }
    return { gap: d2 - d1, id, d1 };
  };
  p.fill([cx - RIN, gy - RIN, cx + RIN, ty + RIN], (x, y) => inC(x, y, ty, RIN) && inC(x, y, gy, RIN), E.Dirt, (x, y) => {
    const { gap, id, d1 } = plate(x, y);
    let s = 0.52 + (hash01(id, 908) - 0.5) * 0.14 - d1 / CELL * 0.08 - Math.max(0, 1 - (y - (gy - RIN)) / 50) * 0.25;
    if (gap < 2.2) s -= 0.4;
    else if (gap < 4) s += 0.1;
    return s;
  });
  for (let y = gy - RIN; y < ty + RIN; y++)
    for (let x = cx - RIN; x < cx + RIN; x++) {
      if (!(inC(x, y, ty, RIN) && inC(x, y, gy, RIN))) continue;
      // A mancha de limo seco onde a água durou mais (o meio) e folhas secas.
      if (Math.hypot((x - cx) / 80, (y - gy - 10) / 56) < 1 && plate(x, y).gap > 2.2 && sn(x & 127, y & 127, 8, 909) > 0.6) p.on(x, y, E.Dry, 1);
      if (noise(x >> 2, y >> 2, 910) < 0.035) p.on(x, y, noise(x, y, 911) < 0.5 ? E.Dry : E.Terracotta, 2);
    }
  // 4. O pedestal e a taça de cima, rachada (falta o pedaço do leste).
  const shaftTop = gy - 150;
  for (let k = 0; k < 3; k++) {
    // Base em degraus.
    const w = 46 - k * 10, y0 = gy + 14 - k * 12;
    box(p, [cx - w, y0 - 12, cx + w, y0], E.Travertine, (x) => 0.58 - ((x - cx) / w) * 0.18);
    hline(p, cx - w, cx + w, y0 - 12, E.Travertine, 5);
  }
  p.fill([cx - 18, shaftTop, cx + 18, gy - 22], () => true, E.Travertine, (x) => lit((x - cx) / 18, 0, 0.45));
  for (let y = shaftTop + 10; y < gy - 22; y += 16) hline(p, cx - 17, cx + 17, y, E.Travertine, 1);
  const bowlY = shaftTop - 6;
  const bowlBroken = (x: number, y: number) => x > cx + 26 && y < bowlY + 4 + (x - cx - 26) * 0.6;
  // A taça vista de cima: o fundo de fora (a sombra) e a boca.
  p.fill([cx - 78, bowlY - 26, cx + 78, bowlY + 30], (x, y) => Math.hypot((x - cx) / 78, (y - bowlY) / 28) < 1 && y > bowlY - 2 && !bowlBroken(x, y),
    E.Marble, (x, y) => 0.45 - (x - cx) / 78 * 0.15 - (y - bowlY) / 28 * 0.1);
  p.fill([cx - 78, bowlY - 26, cx + 78, bowlY + 26], (x, y) => Math.hypot((x - cx) / 78, (y - bowlY + 2) / 24) < 1 && !bowlBroken(x, y), E.Marble,
    (x, y) => (Math.hypot((x - cx) / 66, (y - bowlY + 2) / 18) < 1 ? 0.3 + (y - bowlY) / 18 * 0.12 : 0.74 - (x - cx) / 78 * 0.12));
  // A rachadura descendo da quebra.
  for (let k = 0; k < 40; k++) p.on(cx + 26 - (k >> 2), bowlY + 2 + k * 0.4 + Math.sin(k) * 1.5, E.Line, 1);
  // Um toco no meio da taça: os pés da estátua que ficava em cima.
  box(p, [cx - 10, bowlY - 30, cx + 10, bowlY - 6], E.Marble, (x) => 0.6 - (x - cx) / 10 * 0.2);
  // 5. Os blocos da borda caídos para fora, na frente da brecha.
  // Do mais longe para o mais perto (o de baixo cobre o de cima); cada um com o topo, a face da frente e o lado.
  const blocks = [0, 1, 2, 3, 4].map((k) => {
    const a = 0.3 + hash01(k, 912) * 0.55, r = R - 6 + hash01(k, 913) * 44;
    return { k, bx: cx + Math.cos(a) * r, by: Math.min(foot - 2, gy + Math.sin(a) * r), w: 12 + hash01(k, 914) * 12, h: 9 + hash01(k, 915) * 8 };
  }).sort((a, b) => a.by - b.by);
  for (const { k, bx, by, w, h } of blocks) {
    const tilt = (hash01(k, 916) - 0.5) * 8;
    poly(p, [[bx - w, by - h - 12 + tilt], [bx + w, by - h - 12 - tilt], [bx + w, by - h - tilt], [bx - w, by - h + tilt]], E.Travertine, () => 0.72);
    poly(p, [[bx - w, by - h + tilt], [bx + w, by - h - tilt], [bx + w, by - tilt], [bx - w, by + tilt]], E.Travertine, (x) => 0.48 - (x - bx) / w * 0.1);
    hline(p, bx - w + 2, bx + w - 2, by - h, E.Travertine, 5);
  }
  // 6. Capim seco no pé da borda.
  for (let x = cx - R; x < cx + R; x++) {
    const a = Math.acos(Math.max(-1, Math.min(1, (x - cx) / R)));
    if (broken(a)) continue;
    const base = gy + Math.sin(a) * R;
    if (noise(x >> 2, 0, 916) < 0.45) continue;
    const len = 4 + noise(x, 1, 917) * 10;
    for (let k = 0; k < len; k++) p.px(x + (k > len / 2 ? 1 : 0), base - k, k < 3 ? E.Grass : E.Dry, k < len - 2 ? 2 : 4);
  }
  return p.render(true);
}

/** A estátua derrubada: 2 tiles de chão deitada (a cabeça rolou para o leste). */
export const STATUE = { w: HD * 2 + 48, h: HD + 72 } as const;

/**
 * Estátua de mármore do império derrubada pelos orcs: o pedestal quebrado no oeste com o pé ainda preso em cima, o
 * corpo deitado de lado (a toga com as dobras, o braço por cima), a cabeça laureada que rolou para o leste e cacos em
 * volta; musgo e uma pichação de sangue dos orcs no pedestal. Luz do oeste, sombra no chão para o leste.
 */
export function statueSprite(): Uint8ClampedArray {
  const p = paper(STATUE.w, STATUE.h);
  const foot = STATUE.h - 14, x0 = 24;
  // Pedestal quebrado (oeste): o bloco com a face da frente e o topo.
  box(p, [x0, foot - 96, x0 + 72, foot - 70], E.Marble, 0.72);
  box(p, [x0, foot - 70, x0 + 72, foot], E.Marble, (x) => 0.5 - (x - x0) / 72 * 0.1);
  hline(p, x0, x0 + 72, foot - 70, E.Marble, 5);
  for (const y of [foot - 50, foot - 28]) hline(p, x0 + 2, x0 + 70, y, E.Vein, 1);
  // A quina de cima lascada e o pé que sobrou.
  p.fill([x0 + 50, foot - 98, x0 + 74, foot - 80], (x, y) => y < foot - 98 + (x - x0 - 50) * 0.8, E.Marble, () => 0.35);
  box(p, [x0 + 20, foot - 118, x0 + 40, foot - 96], E.Marble, (x) => 0.66 - (x - x0 - 20) / 20 * 0.2);
  // A marca de sangue dos orcs no pedestal (um risco em garra).
  for (let k = 0; k < 3; k++) for (let y = foot - 60; y < foot - 18; y++) p.on(x0 + 22 + k * 10 + (y >> 4), y, E.Cloth, 2);
  // O corpo deitado: a toga (um tronco comprido), as pernas para o oeste, o braço por cima.
  const body: [number, number] = [x0 + 92, foot - 30], chest: [number, number] = [x0 + 196, foot - 36];
  limb(p, body, chest, 26, 32, E.Marble);
  for (let k = 0; k < 4; k++) {
    // As dobras da toga: sulcos curvos em diagonal, com o lado de cima claro.
    const fx = x0 + 106 + k * 22;
    for (let t = -20; t < 22; t++) {
      const x = fx + Math.round(t * 0.45 + Math.sin(t / 7) * 3), y = foot - 34 + t;
      if (!p.has(x, y)) continue;
      p.on(x, y, E.Marble, 1);
      p.on(x - 1, y, E.Marble, 5);
    }
  }
  limb(p, [x0 + 120, foot - 58], [x0 + 186, foot - 64], 9, 10, E.Marble);
  limb(p, [x0 + 72, foot - 22], [x0 + 96, foot - 24], 16, 22, E.Marble);
  // O pescoço quebrado e a cabeça rolada (de lado, com a coroa de louros).
  box(p, [x0 + 222, foot - 46, x0 + 232, foot - 24], E.Marble, 0.4);
  const hx = x0 + 262, hy = foot - 28;
  ellipse(p, hx, hy, 26, 25, E.Marble);
  // O nariz e o queixo de perfil (a cabeça caiu virada para o oeste), o olho, a orelha.
  ellipse(p, hx - 26, hy + 2, 5, 6, E.Marble);
  ellipse(p, hx - 18, hy + 18, 8, 6, E.Marble);
  p.on(hx - 14, hy - 4, E.Line, 1); p.on(hx - 13, hy - 4, E.Line, 1); p.on(hx - 12, hy - 5, E.Line, 1);
  for (let y = hy - 2; y < hy + 8; y++) p.on(hx + 4 + ((y - hy) >> 2), y, E.Vein, 1);
  // A coroa de louros: folhas de bronze verde em volta do alto da cabeça.
  for (let a = -2.9; a < -0.1; a += 0.22) {
    const lx = hx + Math.cos(a) * 24, ly = hy + Math.sin(a) * 23;
    ellipse(p, lx, ly, 5, 3, E.Bronze);
  }
  // Cacos em volta e musgo em cima do corpo.
  for (let k = 0; k < 9; k++) {
    const sx = x0 + 60 + hash01(k, 920) * 230, sy = foot - 4 - hash01(k, 921) * 10;
    box(p, [sx - 4, sy - 4, sx + 4, sy], E.Marble, 0.6);
  }
  for (let y = 0; y < STATUE.h; y++)
    for (let x = 0; x < STATUE.w; x++)
      if (p.has(x, y) && y < foot - 50 && sn(x & 127, y & 127, 8, 922) > 0.8) p.on(x, y, E.Moss, 1);
  return p.render(true);
}

// --- Muralhas orcizadas ------------------------------------------------------------------------

/** O que os orcs penduram e pregam na frente da muralha do império: por cima do sprite do muro, no mesmo tamanho. */
export const ORC_DRESS = { w: HD, h: HD + 144 } as const;
/** Altura da muralha (px acima do chão) e onde começa a face dela no sprite (`wallSprite` com `city`). */
const DRESS_WALL = 120, DRESS_FACE = ORC_DRESS.h - DRESS_WALL;

/**
 * Enfeite orc na face sul de um tile de muralha (transparente no resto): `kind` 0 escudo redondo de tábuas pregado,
 * com a lança atravessada atrás e a marca de mão vermelha; 1 remendo de tábuas pregadas tapando uma brecha (o escuro
 * aparece pelas frestas); 2 estacas afiadas saindo da beira do tampo, inclinadas para fora, uma com caveira espetada;
 * 3 sangue escorrendo da ameia e uma corrente pendurada com argola; 4 o pano de guerra vermelho pendurado da ameia,
 * rasgado embaixo, com a caveira de chifres pintada em preto.
 */
export function orcDressing(kind: number, v: number): Uint8ClampedArray {
  const p = paper(ORC_DRESS.w, ORC_DRESS.h);
  const face = DRESS_FACE, cx = 40 + Math.floor(hash01(v * 7 + kind, 930) * 48);
  if (kind === 0) {
    const cy = face + 56, r = 36;
    limb(p, [cx - 40, cy + 30], [cx + 42, cy - 34], 2.5, 2.5, E.Bark);
    poly(p, [[cx + 42, cy - 34], [cx + 52, cy - 50], [cx + 36, cy - 40]], E.Iron, () => 0.6);
    p.fill([cx - r, cy - r, cx + r, cy + r], (x, y) => Math.hypot(x - cx, y - cy) < r, E.Bark, (x, y) => {
      const plank = Math.floor((x - cx + r) / 13);
      return 0.5 + (hash01(plank + v, 931) - 0.5) * 0.16 - (x - cx) / r * 0.1 - (y - cy) / r * 0.08 + (mod(x - cx + r, 13) < 1 ? -0.2 : 0);
    });
    for (let a = 0; a < Math.PI * 2; a += 0.01) for (let k = 0; k < 3; k++) p.on(cx + Math.cos(a) * (r - 1 - k), cy + Math.sin(a) * (r - 1 - k), E.Iron, k === 0 ? 1 : 3);
    ellipse(p, cx, cy, 7, 7, E.Iron);
    // A mão vermelha dos orcs pintada no escudo.
    p.fill([cx - 14, cy - 18, cx + 2, cy + 4], (x, y) => Math.hypot((x - cx + 6) / 7, (y - cy + 2) / 8) < 1
      || (y < cy - 6 && [-12, -8, -4, 0].some((f) => Math.abs(x - (cx + f)) < 1.6 && y > cy - 17 + Math.abs(f + 6) * 0.4)), E.Cloth, () => 0.5);
  } else if (kind === 1) {
    // Brecha tapada com tábuas pregadas na diagonal e na vertical.
    const x0 = cx - 30, x1 = cx + 30, y0 = face + 16, y1 = face + DRESS_WALL - 14;
    p.fill([x0 - 4, y0 - 4, x1 + 4, y1 + 4], (x, y) => Math.hypot((x - cx) / 36, (y - (y0 + y1) / 2) / 48) < 1 - noise(x >> 2, y >> 2, 932) * 0.15, E.Void, () => 0.1);
    for (let k = 0; k < 4; k++) {
      const px = x0 + 2 + k * 15 + Math.floor(hash01(k + v, 933) * 4);
      box(p, [px, y0 + hash01(k, 934) * 8, px + 12, y1 - hash01(k, 935) * 8], E.Bark, (x) => 0.52 + (hash01(k * 3 + v, 936) - 0.5) * 0.2 - (x - px) * 0.012);
      for (const ny of [y0 + 10, y1 - 12]) { p.on(px + 6, ny, E.Iron, 5); p.on(px + 6, ny + 1, E.Iron, 2); }
    }
    limb(p, [x0 - 6, y0 + 20], [x1 + 6, y1 - 24], 4, 4, E.Bark);
  } else if (kind === 2) {
    // Estacas afiadas na beira do tampo (a beira fica logo acima da face), inclinadas para o sul.
    for (let k = 0; k < 5; k++) {
      const bx = 14 + k * 24 + (hash01(k + v * 5, 937) - 0.5) * 10, by = face + 6;
      const tx = bx + (hash01(k, 938) - 0.5) * 16, ty = face - 46 - hash01(k + v, 939) * 18;
      limb(p, [bx, by], [tx, ty + 8], 4, 3, E.Bark);
      poly(p, [[tx - 3, ty + 9], [tx + 3, ty + 9], [tx, ty]], E.Dry, () => 0.7);
      if (k === 2) {
        ellipse(p, tx, ty + 18, 9, 8, E.Bone);
        p.on(tx - 3, ty + 18, E.Void, 1); p.on(tx + 3, ty + 18, E.Void, 1); p.on(tx - 3, ty + 19, E.Void, 1); p.on(tx + 3, ty + 19, E.Void, 1);
        for (let x = tx - 4; x <= tx + 4; x += 2) p.on(x, ty + 24, E.Void, 1);
      }
    }
  } else if (kind === 4) {
    const x0 = cx - 24, x1 = cx + 24, y0 = face - 6, y1 = face + DRESS_WALL - 8;
    limb(p, [x0 - 6, y0], [x1 + 6, y0], 3, 3, E.Bark);
    p.fill([x0, y0, x1, y1], (x, y) => y < y1 - 10 - noise(x >> 2, 0, 941 + v) * 22 && Math.abs(x - cx) < 24 - (y - y0) * 0.04, E.Cloth,
      (x, y) => 0.5 + Math.sin((x - x0) / 7) * 0.12 - (y - y0) / (y1 - y0) * 0.12);
    // A caveira de chifres em preto no meio do pano.
    const sy = y0 + 40;
    p.fill([cx - 12, sy - 12, cx + 12, sy + 14], (x, y) => Math.hypot((x - cx) / 11, (y - sy) / 12) < 1 || (y > sy + 6 && y < sy + 14 && Math.abs(x - cx) < 7), E.Line, () => 0.4);
    for (const sx of [-1, 1]) limb(p, [cx + sx * 9, sy - 6], [cx + sx * 20, sy - 20], 3, 1.5, E.Line);
    for (const sx of [-1, 1]) ellipse(p, cx + sx * 5, sy, 3, 3, E.Cloth);
  } else {
    // Sangue escorrendo da beira e uma corrente com argola.
    for (let k = 0; k < 4; k++) {
      const x = cx - 18 + k * 11, len = 20 + hash01(k + v, 940) * 50;
      for (let y = face; y < face + len; y++) { p.px(x, y, E.Cloth, y > face + len - 3 ? 1 : 2); if (y < face + 8) p.px(x + 1, y, E.Cloth, 2); }
    }
    for (let k = 0; k < 9; k++) {
      const y = face - 4 + k * 8, x = cx + 26 + Math.sin(k * 0.6) * 2;
      p.fill([x - 4, y - 4, x + 4, y + 4], (a, b) => { const d = Math.hypot((a - x) / 3, (b - y) / 4); return d < 1 && d > 0.45; }, E.Iron, () => (k % 2 ? 0.4 : 0.66));
    }
    const ry = face + 72;
    p.fill([cx + 14, ry - 12, cx + 38, ry + 12], (a, b) => { const d = Math.hypot(a - cx - 26, b - ry); return d < 11 && d > 7; }, E.Iron, (a) => 0.6 - (a - cx - 26) / 11 * 0.2);
  }
  return p.render(true);
}

// --- Interiores --------------------------------------------------------------------------------

/**
 * Um tile do tapete do salão do trono (3 tiles de largura, da porta até o trono), por cima das lajes: lã vermelha
 * gasta com a barra dourada e a grega nas beiras (`part` -1 e 1, as colunas da beira; 0 o meio), puído e manchado,
 * rasgado na ponta da porta (`end` 2) e com a franja na ponta do trono (`end` 1). Transparente fora do tapete.
 */
export function carpetTile(part: -1 | 0 | 1, end: 0 | 1 | 2, v: number): Uint8ClampedArray {
  const p = paper();
  const inset = 14;
  const inside = (x: number, y: number) => {
    if (part < 0 && x < inset) return false;
    if (part > 0 && x > HD - 1 - inset) return false;
    if (end === 1 && y < 20) return false;
    if (end === 2 && y > HD - 18 - noise(x >> 3, v, 950) * 30) return false;
    return true;
  };
  p.fill([0, 0, HD - 1, HD - 1], inside, E.Cloth, (x, y) => {
    let s = 0.46 + (sn(x, y, 32, 951 + v) - 0.5) * 0.14;
    // Puído no meio (o caminho de quem anda até o trono) e as manchas escuras.
    if (part === 0) s += Math.max(0, 0.12 - Math.abs(x - 64) / 400);
    if (sn(x, y, 16, 952 + v) > 0.74) s -= 0.16;
    return s;
  });
  // A barra dourada e a grega na beira de cada lado.
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!inside(x, y)) continue;
      const fromEdge = part < 0 ? x - inset : part > 0 ? HD - 1 - inset - x : 99;
      if (fromEdge < 4) p.on(x, y, E.Gold, fromEdge < 1 ? 1 : 3);
      else if (fromEdge < 14 && fromEdge > 6) {
        // Grega (o meandro do império): um degrau a cada 8 px.
        const t = mod(y, 16), u = fromEdge - 7;
        if ((t < 8 && u === 0) || (t === 8 && u < 6) || (t >= 8 && u === 5) || (t === 0 && u < 6)) p.on(x, y, E.Gold, 2);
      }
      if (end === 1 && y < 26) p.on(x, y, E.Gold, 2);
    }
  // Franja na ponta do trono.
  if (end === 1) for (let x = part < 0 ? inset : 0; x < (part > 0 ? HD - inset : HD); x += 3) for (let y = 12; y < 20; y++) p.px(x, y, E.Gold, 3);
  // Rasgos e furos.
  for (let y = 0; y < HD; y++) for (let x = 0; x < HD; x++) if (inside(x, y) && noise(x >> 2, y >> 2, 953 + v) < 0.012) p.on(x, y, E.Void, 1);
  return p.render(false);
}

/** O braseiro do salão (de pé): o fogo é desenhado à parte, por cima, pelo mapa. */
export const BRAZIER = { w: HD, h: HD + 40 } as const;
/** Altura (px de arte, a partir do pé do sprite) da boca do braseiro, onde o mapa põe as chamas. */
export const BRAZIER_MOUTH = 104;

/** Braseiro de ferro do império em três pés de garra, a bacia cheia de brasa e um anel de caveiras dos orcs no aro. */
export function brazierSprite(): Uint8ClampedArray {
  const p = paper(BRAZIER.w, BRAZIER.h);
  const cx = BRAZIER.w / 2, foot = BRAZIER.h - 10, mouth = foot - BRAZIER_MOUTH;
  // Os três pés (o do meio atrás) e o fuste.
  for (const [dx, back] of [[-30, 0], [30, 0], [0, 1]] as const) limb(p, [cx + dx, foot - (back ? 10 : 0)], [cx + dx * 0.25, mouth + 34], 4, 3, E.Iron);
  limb(p, [cx, mouth + 40], [cx, mouth + 16], 6, 6, E.Iron);
  // A bacia: a boca vista um pouco de cima, cheia de brasa, e o bojo embaixo.
  p.fill([cx - 40, mouth - 4, cx + 40, mouth + 24], (x, y) => Math.hypot((x - cx) / 40, (y - mouth) / 22) < 1 && y >= mouth, E.Iron, (x, y) => 0.5 - (x - cx) / 40 * 0.2 - (y - mouth) / 22 * 0.15);
  p.fill([cx - 40, mouth - 12, cx + 40, mouth + 12], (x, y) => Math.hypot((x - cx) / 40, (y - mouth) / 11) < 1, E.Iron, (x) => 0.66 - (x - cx) / 40 * 0.15);
  p.fill([cx - 34, mouth - 9, cx + 34, mouth + 9], (x, y) => Math.hypot((x - cx) / 34, (y - mouth) / 8) < 1, E.Fire, (x, y) => 0.3 + sn(x & 127, y & 127, 8, 960) * 0.5);
  // Caveirinhas no aro.
  for (const dx of [-26, 0, 26]) {
    ellipse(p, cx + dx, mouth + 14, 6, 6, E.Bone);
    p.on(cx + dx - 2, mouth + 14, E.Void, 1); p.on(cx + dx + 2, mouth + 14, E.Void, 1);
  }
  return p.render(true);
}

/** Cama de palha dos orcs na caserna (no chão, 1 tile): o monte de palha, a pele por cima e um osso roído. */
export function strawBed(v: number): Uint8ClampedArray {
  const p = paper();
  const cx = 64 + (v - 0.5) * 10, cy = 66;
  p.fill([8, 20, 120, 112], (x, y) => Math.hypot((x - cx) / 54, (y - cy) / 40) < 1 - noise(x >> 2, y >> 2, 961 + v) * 0.18, E.Dry,
    (x, y) => 0.55 + (noise(x, y >> 1, 962) - 0.5) * 0.3 - (y - cy) / 40 * 0.12);
  // Palhas soltas riscando.
  for (let k = 0; k < 40; k++) {
    const x = 12 + noise(k, v, 963) * 104, y = 24 + noise(v, k, 964) * 84, a = noise(k, k, 965) * Math.PI;
    for (let t = 0; t < 9; t++) p.on(x + Math.cos(a) * t, y + Math.sin(a) * t * 0.5, E.Dry, noise(k, t, 966) < 0.5 ? 4 : 2);
  }
  // A pele por cima (a cabeça do bicho para o lado).
  p.fill([30, 34, 104, 96], (x, y) => Math.hypot((x - cx - 4) / 32, (y - cy + 2) / 24) < 1 - noise(x >> 2, y >> 2, 967 + v) * 0.2, E.Dirt,
    (x, y) => 0.5 + (sn(x, y, 8, 968) - 0.5) * 0.2 - (x - cx) / 32 * 0.1);
  ellipse(p, cx + 34, cy - 6, 9, 7, E.Dirt);
  limb(p, [cx - 40, cy + 30], [cx - 22, cy + 36], 3, 3, E.Bone);
  return p.render(true);
}

// --- A cachoeira -------------------------------------------------------------------------------

/** A água caindo da cachoeira: repete na vertical (o mapa a faz descer rolando a textura). */
export const FALL = { w: 64, h: 256 } as const;

/**
 * A água da cachoeira que sai do esgoto da muralha e cai no abismo: fios verticais de água (cada coluna com o seu tom
 * e a sua velocidade de risco), espuma branca em riscos compridos, mais transparente nas beiras. Emenda em cima e
 * embaixo (período `FALL.h`).
 */
export function waterfallTexture(): Uint8ClampedArray {
  const out = new Uint8ClampedArray(FALL.w * FALL.h * 4);
  const deep = [58, 98, 116], light = [120, 170, 186], foam = [226, 236, 238];
  for (let x = 0; x < FALL.w; x++) {
    const edge = Math.min(x, FALL.w - 1 - x) / 14;
    const col = noise(x >> 1, 0, 970);
    for (let y = 0; y < FALL.h; y++) {
      // Riscos verticais: um ruído que repete na altura da textura (a fase anda com a coluna).
      const t = (y / FALL.h + col) * Math.PI * 2;
      const streak = 0.5 + 0.3 * Math.sin(t * 3 + x * 0.7) + 0.2 * Math.sin(t * 7 + x * 1.9);
      const c = streak > 0.82 ? foam : streak > 0.55 ? light : deep;
      const o = (y * FALL.w + x) * 4;
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
      const a = Math.min(1, edge) * (streak > 0.82 ? 1 : 0.86);
      out[o + 3] = a > ((x * 7 + y * 3) % 4) / 4 * 0.6 + 0.2 ? Math.round(a * 255) : 0;
    }
  }
  return out;
}

/** A boca do esgoto na face do paredão, de onde sai a água: o arco de pedra, o escuro e a grade quebrada. */
export const DRAIN = { w: 96, h: 80 } as const;
export function drainSprite(): Uint8ClampedArray {
  const p = paper(DRAIN.w, DRAIN.h);
  const cx = DRAIN.w / 2, base = DRAIN.h - 8;
  p.fill([cx - 40, 8, cx + 40, base], (x, y) => y > 30 ? Math.abs(x - cx) < 40 : Math.hypot((x - cx) / 40, (y - 30) / 22) < 1, E.Travertine,
    (x, y) => 0.6 - (x - cx) / 40 * 0.15 - (y - 8) / 70 * 0.1);
  p.fill([cx - 26, 20, cx + 26, base], (x, y) => y > 36 ? Math.abs(x - cx) < 26 : Math.hypot((x - cx) / 26, (y - 36) / 16) < 1, E.Void, () => 0.08);
  for (let x = cx - 22; x < cx + 22; x += 9) for (let y = 26; y < base - 10 - (x > cx ? 12 : 0); y++) p.on(x, y, E.Iron, 2);
  for (let y = 10; y < base; y += 14) hline(p, cx - 40, cx - 27, y, E.Travertine, 1);
  for (let y = 10; y < base; y += 14) hline(p, cx + 27, cx + 40, y, E.Travertine, 1);
  // O limo verde escorrido em volta da boca.
  for (let y = 20; y < base; y++) for (let x = cx - 30; x < cx + 30; x++) if (p.has(x, y) && sn(x, y, 8, 971) > 0.62 && Math.abs(x - cx) > 24) p.on(x, y, E.Moss, 1);
  return p.render(true);
}
