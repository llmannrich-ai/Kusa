import { E, FLAT, HD, OPEN, ellipse, hash01, limb, line, lit, noise, paper, poly, sn, type Pt } from "./empireArt.ts";
import { box, hline, ivy, masonry, rubbleTop, vline } from "./empireMonuments.ts";
import type { Paper } from "./duneArt.ts";

/**
 * Arte da Fortaleza Orc (Ruínas do Império), no padrão novo (`docs/ARTE_TIBIA.md`, 128 px por tile, pintada por código,
 * sem `Math.random`), com a paleta e as peças dos Portões do Império (muros, torres, arco, colunas) e o que é só daqui:
 *
 * - **Andares**: o paredão do precipício (a face de rocha que desce do andar do castelo até o vale), a beirada de pedra
 *   em volta do abismo e, no andar de cima, o terraço da torre de menagem (lajes, parapeito com ameias, o buraco do
 *   telhado caído), a fachada sul dela e os telhados das casernas. O vale lá embaixo usa os tiles de capim, água e mata
 *   dos Portões, escurecidos.
 * - **Pontes**: o tabuleiro de pedra com parapeitos e a ponte de cordas dos orcs (tábuas com frestas: o vale aparece
 *   por elas).
 * - **Acampamento**: terra batida, a fogueira, tendas de couro, paliçadas de estacas, totens de caveira, estandartes de
 *   guerra, o trono e os enfeites (armas, caldeirão, lenha, ossos).
 */

const mod = (v: number, n: number) => ((v % n) + n) % n;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Pinta um pixel com quebra na borda (texturas que emendam). */
function wrapOn(p: Paper, x: number, y: number, mat: number | null, tone: number) {
  p.on(mod(Math.round(x), HD), mod(Math.round(y), HD), mat, tone);
}

// --- Chão do acampamento -------------------------------------------------------------------

/**
 * Terra batida do acampamento: barro em manchas, poças de lama escura, palha e capim pisado, pedrinhas e pegadas de
 * bota. Tudo embrulha na borda do tile.
 */
export function dirtTile(v: number): Paper {
  const p = paper();
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Dirt, (x, y) => FLAT - 0.08 + (sn(x, y, 32, 700 + (v % 2)) - 0.5) * 0.24 + (sn(x, y, 8, 701 + v) - 0.5) * 0.1,
    (x, y) => (noise(x, y, 702 + v) < 0.05 ? -1 : noise(x, y, 709 + v) > 0.985 ? 1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      const mud = sn(x, y, 16, 703 + v) + (noise(x, y, 704) - 0.5) * 0.1;
      if (mud < 0.2) { p.mat[i] = E.Mortar; p.off[i] = mud < 0.12 ? -1 : 0; }
      else if (sn(x, y, 32, 705 + v) > 0.74 && noise(x, y, 706) < 0.5) p.mat[i] = E.Dry;
    }
  // Palha solta e capim pisado.
  for (let k = 0; k < 26; k++) {
    const x = noise(k, v, 707) * HD, y = noise(v, k, 708) * HD, a = noise(k, k + v, 710) * Math.PI;
    for (let s = 0; s < 7; s++) wrapOn(p, x + Math.cos(a) * s, y + Math.sin(a) * s, E.Dry, s % 3 === 0 ? 2 : 4);
  }
  // Pegadas de bota: pares de solas fundas, cada uma com a borda de baixo clara.
  for (let k = 0; k < 3 + (v % 2); k++) {
    const x = noise(k, v, 711) * HD, y = noise(v, k, 712) * HD;
    for (const [dx, dy] of [[0, 0], [9, -14]] as const)
      for (let yy = -5; yy <= 5; yy++)
        for (let xx = -3; xx <= 3; xx++) {
          const d = (xx / 3) ** 2 + (yy / 5.5) ** 2;
          if (d > 1) continue;
          wrapOn(p, x + dx + xx, y + dy + yy, null, d > 0.7 && yy > 0 ? 4 : 1);
        }
  }
  for (let k = 0; k < 6; k++) {
    const x = noise(k, v, 713) * HD, y = noise(v, k, 714) * HD;
    wrapOn(p, x, y, E.Vein, 4); wrapOn(p, x + 1, y, E.Vein, 3); wrapOn(p, x, y + 1, E.Vein, 1); wrapOn(p, x + 1, y + 1, E.Vein, 2);
  }
  return p;
}

// --- Abismo -----------------------------------------------------------------------------------

/** Andares entre o castelo e o vale: o paredão tem esta altura (tiles) e o vale aparece deslocado isto para o sul. */
export const DROP = 2;

/**
 * Paredão do precipício, a face de rocha que desce da beirada do castelo (a linha de abismo logo ao sul de chão) até o
 * vale. `row` 0 é o tile de cima (a beirada com o capim pendurado e as raízes), 1 o de baixo, que escurece e se desfaz
 * em pontilhado na névoa: dali para baixo aparece o vale. Estratos horizontais de rocha (cada laje com o seu tom,
 * a quina de cima clara e a sombra embaixo), fraturas, musgo e hera. Emenda com o vizinho do lado (período de 128 px).
 */
export function cliffTile(row: 0 | 1, v: number): Uint8ClampedArray {
  const p = paper();
  const span = HD * DROP;
  const ledge = (x: number, gy: number) => {
    const wob = 6 * Math.sin((2 * Math.PI * x) / HD + v) + 3 * Math.sin((4 * Math.PI * x) / HD + v * 2);
    const band = Math.floor((gy + wob) / 24);
    return { band, ly: mod(gy + wob, 24) };
  };
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Slab, (x, y) => {
    const gy = row * HD + y;
    const { band, ly } = ledge(x, gy);
    const block = Math.floor(mod(x + band * 13, HD) / 32);
    let s = 0.56 - (gy / span) * 0.34 + (hash01(band * 7 + block * 31 + v * 3, 720) - 0.5) * 0.16;
    if (ly < 3) s += 0.2;
    else if (ly > 20) s -= 0.16;
    if (mod(x + band * 13, 32) < 2) s -= 0.12;
    return s;
  }, (x, y) => (noise(x, y, 721 + v) < 0.04 ? -1 : 0));
  // Algumas lajes mais quentes (o arenito do império por baixo do castelo).
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const { band } = ledge(x, row * HD + y);
      if (hash01(band * 11 + Math.floor(mod(x + band * 13, HD) / 32) + v, 722) < 0.25) p.mat[y * HD + x] = E.Wall;
    }
  // Fraturas descendo.
  for (let k = 0; k < 3; k++) {
    let cx = 10 + noise(k, v + row * 5, 723) * 108;
    for (let y = 0; y < HD; y++) {
      if (noise(y >> 2, k + v, 724) < 0.35) cx += noise(y, k, 725) < 0.5 ? -1 : 1;
      if (noise(y >> 3, k, 726 + row) < 0.75) { wrapOn(p, cx, y, E.Line, 1); wrapOn(p, cx + 1, y, null, 4); }
    }
  }
  // Musgo e hera nas quinas dos estratos.
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const { ly } = ledge(x, row * HD + y);
      if (ly < 6 && sn(x, y, 16, 727 + v + row) > 0.66) p.on(x, y, E.Moss, noise(x, y, 728) < 0.4 ? 2 : 3);
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
 * Paredão de lado (no tile de abismo com chão a oeste, `side` -1, ou a leste, 1): uma faixa estreita de rocha
 * descendo da beirada, escurecendo para longe dela e se desfazendo no pontilhado (a rocha some na sombra do vale).
 * Transparente no resto do tile.
 */
export function sideCliffTile(side: -1 | 1, v: number): Uint8ClampedArray {
  const p = paper();
  const reach = (y: number) => 50 + 8 * Math.sin((2 * Math.PI * y) / HD * 2 + v) + 4 * Math.sin((6 * Math.PI * y) / HD + v);
  const from = (x: number) => (side < 0 ? x : HD - 1 - x);
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => from(x) < reach(y), E.Slab, (x, y) => {
    const t = from(x) / reach(y);
    const band = Math.floor((y + 9 * Math.sin(from(x) / 6 + v)) / 18);
    const ly = mod(y + band * 7 + Math.round(4 * Math.sin(from(x) / 9 + v)), 18);
    return 0.62 - t * 0.4 + (hash01(band * 5 + v, 735) - 0.5) * 0.16 + (ly < 2 ? 0.16 : ly > 15 ? -0.14 : 0) + (side > 0 ? -0.12 : 0);
  }, (x, y) => (noise(x, y, 736 + v) < 0.05 ? -1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!p.has(x, y)) continue;
      if (from(x) < 3) p.on(x, y, E.Line, 1);
      else if (from(x) < 8 && sn(x, y, 16, 738 + v) > 0.55) p.on(x, y, E.Moss, 2);
    }
  const out = p.render(false);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const t = from(x) / reach(y) - 0.55 + (sn(x, y, 16, 737) - 0.5) * 0.3;
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
    return FLAT + (d > 0.7 ? 0.08 : d < 0.25 ? -0.3 : 0) + (sn(x, y, 16, 740) - 0.5) * 0.2;
  }, (x, y) => (noise(x, y, 741) < 0.08 ? -1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const d = dist(x, y);
      if (d < 0.14) p.on(x, y, E.Line, 1);
      else if (d < 0.3) p.on(x, y, E.Slab, 1);
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

/** Fogueira no chão: a roda de pedras, a cinza e as achas carbonizadas (a chama vai por cima, animada). */
export function firePitTile(): Paper {
  const p = paper();
  const cx = 64, cy = 70;
  ellipse(p, cx, cy, 30, 20, E.Void);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const d = ((x - cx) / 28) ** 2 + ((y - cy) / 18) ** 2;
      if (d < 1) p.on(x, y, noise(x, y, 770) < 0.5 ? E.Mortar : E.Void, d < 0.3 ? 4 : noise(x, y, 771) < 0.3 ? 1 : 2);
    }
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + noise(k, 0, 772) * 0.3;
    ellipse(p, cx + Math.cos(a) * 34, cy + Math.sin(a) * 23, 7 + noise(k, 1, 773) * 3, 5 + noise(k, 2, 774) * 2, k % 3 ? E.Slab : E.Wall);
  }
  limb(p, [cx - 18, cy - 4], [cx + 14, cy + 8], 4, 3.5, E.Bark);
  limb(p, [cx + 16, cy - 8], [cx - 10, cy + 10], 4, 3.5, E.Bark);
  for (let k = 0; k < 14; k++) p.on(cx - 14 + noise(k, 3, 775) * 28, cy - 6 + noise(k, 4, 776) * 14, E.Fire, 3);
  return p;
}

// --- Torre de menagem (o andar de cima) ----------------------------------------------------

/**
 * Terraço do alto da torre de menagem (o andar de cima, desenhado acima do salão): lajes grandes e gastas, com musgo,
 * manchas de fuligem das fogueiras dos orcs e palha. Período de 2×2 tiles (`q`).
 */
export function terraceTile(q: number, v = 0): Paper {
  const p = paper();
  const ox = (q % 2) * HD, oy = (q >> 1) * HD;
  p.fill([0, 0, HD - 1, HD - 1], () => true, E.Slab, (x, y) => {
    const gx = x + ox, gy = y + oy;
    const row = Math.floor(gy / 64);
    const lx = mod(gx + (row % 2) * 40, 80);
    const id = row * 9 + Math.floor((gx + (row % 2) * 40) / 80);
    let s = FLAT - 0.02 + (hash01(id, 780) - 0.5) * 0.16 + (sn(x, y, 32, 781 + q) - 0.5) * 0.1;
    if (mod(gy, 64) < 2 || lx < 2) s -= 0.26;
    else if (mod(gy, 64) < 4 || lx < 4) s += 0.07;
    return s;
  }, (x, y) => (noise(x, y, 782 + q) < 0.05 ? -1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (sn(x, y, 32, 783 + q * 4 + v) + (noise(x, y, 787) - 0.5) * 0.12 > 0.8) p.on(x, y, E.Moss, noise(x, y, 784) < 0.4 ? 2 : 3);
      else if (sn(x, y, 32, 785 + q) < 0.12 && noise(x, y, 786) < 0.35) p.nudge(x, y, -1);
    }
  return p;
}

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
 * Fachada sul da torre de menagem, 2 tiles de altura (os 2 andares de cima vistos de frente), um tile de largura por
 * vez: `row` 0 em cima (a cornija e as janelas do 2º andar), 1 embaixo (o 1º andar e o rodapé). `kind`: 0 parede,
 * 1 janela, 2 a porta (`part` -1, 0, 1: esquerda, meio, direita do arco); `end` -1 ou 1 nas quinas.
 */
export function keepFaceTile(row: 0 | 1, kind: 0 | 1 | 2, part: -1 | 0 | 1, end: -1 | 0 | 1, v: number): Uint8ClampedArray {
  const p = paper();
  const top = row * HD;
  masonry(p, [0, 0, HD - 1, HD - 1], v * 5 + row * 3, { bricks: true, shade: 0.5 - row * 0.06, dark: 0.08 });
  if (row === 0) {
    // Cornija: a faixa de travertino que separa o terraço da fachada, com dentículos.
    box(p, [0, 0, HD - 1, 14], E.Travertine, 0.64);
    hline(p, 0, HD - 1, 0, E.Travertine, 5);
    hline(p, 0, HD - 1, 14, E.Travertine, 1);
    for (let x = 2; x < HD; x += 12) box(p, [x, 15, x + 6, 19], E.Travertine, 0.42);
  } else {
    // Rodapé em talude.
    box(p, [0, HD - 18, HD - 1, HD - 1], E.Tuff, 0.42);
    hline(p, 0, HD - 1, HD - 18, E.Tuff, 5);
  }
  const cx = 64 + part * 0;
  if (kind === 1) {
    // Janela arqueada estreita (seteira larga), escura, com a soleira clara.
    const y0 = row === 0 ? 34 : 18, y1 = row === 0 ? 104 : 84;
    p.fill([cx - 14, y0, cx + 14, y1], (x, y) => y > y0 + 14 || Math.hypot(x - cx, y - (y0 + 14)) < 14, E.Void, () => 0.1);
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) p.on(cx + Math.cos(a) * 16, y0 + 14 + Math.sin(a) * 16, E.Travertine, 4);
    box(p, [cx - 18, y1 + 1, cx + 18, y1 + 6], E.Travertine, 0.62);
    hline(p, cx - 18, cx + 18, y1 + 1, E.Travertine, 5);
  }
  if (kind === 2) {
    // A porta: um arco de 3 tiles de largura e 1,6 de altura, aduelas de travertino, e o escuro do salão.
    const W3 = HD * 3, ox = (part + 1) * HD;
    const ax = W3 / 2, rIn = W3 / 2 - 44, spring = 2 * HD - 18 - 120;
    const gy = (y: number) => y + top;
    p.fill([0, 0, HD - 1, HD - 1], (x, y) => {
      const X = x + ox, Y = gy(y);
      return Y >= spring && Y < 2 * HD - 18 ? Math.abs(X - ax) <= rIn : Math.hypot((X - ax) / rIn, (Y - spring) / 70) < 1 && Y < spring;
    }, E.Void, (x, y) => 0.08 + (gy(y) / (2 * HD)) * 0.06);
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.004) {
      for (let r = 0; r < 20; r++) {
        const X = ax + Math.cos(a) * (rIn + 2 + r), Y = spring + Math.sin(a) * (70 + 2 + r);
        const x = X - ox, y = Y - top;
        if (x < 0 || x >= HD || y < 0 || y >= HD) continue;
        const seg = Math.floor((a - Math.PI) / (Math.PI / 9));
        p.on(x, y, E.Travertine, r < 2 ? 5 : r > 17 ? 1 : (seg % 2 ? 3 : 4) - (Math.floor(a * 300) % 23 === 0 ? 2 : 0));
      }
    }
    // Ombreiras.
    for (const sx of [ax - rIn - 22, ax + rIn + 2]) {
      const x0 = sx - ox;
      if (x0 + 20 < 0 || x0 >= HD) continue;
      for (let y = Math.max(0, spring - top); y < Math.min(HD, 2 * HD - 18 - top); y++)
        for (let x = Math.max(0, x0); x < Math.min(HD, x0 + 20); x++) p.on(x, y, E.Travertine, mod(y + top, 24) < 2 ? 1 : x - x0 < 3 ? 5 : 3);
    }
  }
  // Quinas da torre: a do oeste na luz, a do leste na sombra.
  if (end < 0) for (let y = 0; y < HD; y++) for (let x = 0; x < 6; x++) p.on(x, y, null, x < 2 ? 5 : 4);
  if (end > 0) for (let y = 0; y < HD; y++) for (let x = HD - 6; x < HD; x++) p.on(x, y, null, x > HD - 3 ? 1 : 2);
  // Hera subindo do pé, em alguns trechos.
  if (row === 1 && kind === 0 && v % 3 === 0)
    for (let x = 0; x < HD; x++) {
      const reach = 90 * Math.max(0, sn(x, 0, 32, 796 + v) * 1.6 - 0.6);
      for (let d = 0; d < reach; d++) if (noise(x >> 1, (HD - d) >> 1, 797) < 0.6) p.on(x, HD - 1 - d, E.Ivy, noise(x, d, 798) < 0.3 ? 4 : 2);
    }
  return p.render(false);
}

/** Andar de cima da torre de menagem, em tiles acima do chão (o terraço aparece deslocado isto para o norte). */
export const KEEP_RISE = 2;

// --- Telhados das casernas (andar de cima das salas) -------------------------------------------

/** Altura (px de arte) dos muros das casernas: o telhado fica deslocado isto para o norte, em cima deles. */
export const ROOM_WALL = 82;
/** Beiral do telhado além dos muros (px de arte), dos lados e embaixo. */
export const EAVE = 18;

/**
 * Telhado de uma caserna (`w`×`h` tiles), com o beiral: tábuas em duas águas (a cumeeira de leste a oeste, a água do
 * norte na luz), remendos de couro dos orcs, um ou dois buracos onde o telhado caiu (vigas aparecendo no escuro),
 * musgo, e caveiras e chifres pregados na cumeeira.
 */
export function roofSprite(w: number, h: number, v: number): Uint8ClampedArray {
  const W = w * HD + EAVE * 2, Hh = h * HD + EAVE;
  const p = paper(W, Hh);
  const ridge = Math.round(Hh * 0.42);
  const holes = [0, 1].slice(0, 1 + (v % 2)).map((k) => ({
    x: EAVE + HD + noise(k, v, 800) * (W - 2 * EAVE - 2 * HD), y: 40 + noise(v, k, 801) * (Hh - 110), r: 34 + noise(k, k + v, 802) * 26,
  }));
  const inHole = (x: number, y: number) => holes.some((o) => Math.hypot((x - o.x) / o.r, (y - o.y) / (o.r * 0.7)) < 1 + (noise(x >> 2, y >> 2, 803) - 0.5) * 0.3);
  p.fill([0, 0, W - 1, Hh - 1], () => true, E.Bark, (x, y) => {
    const north = y < ridge;
    const plank = Math.floor(x / 22);
    let s = (north ? 0.66 : 0.46) + (hash01(plank * 3 + (north ? 0 : 7) + v, 804) - 0.5) * 0.14;
    if (mod(x, 22) < 2) s -= 0.22;
    if (Math.abs(y - ridge) < 3) s += 0.15;
    // Telhas em fiadas (linhas da água).
    if (mod(north ? ridge - y : y - ridge, 26) < 2) s -= 0.12;
    return s;
  }, (x, y) => (noise(x, y, 805 + v) < 0.05 ? -1 : 0));
  // Remendos de couro costurados.
  for (let k = 0; k < 3 + (v % 3); k++) {
    const cx = 40 + noise(k, v, 806) * (W - 80), cy = 30 + noise(v, k, 807) * (Hh - 70), rw = 26 + noise(k, 1, 808) * 20, rh = 18 + noise(k, 2, 809) * 14;
    const mat = k % 2 ? E.Dirt : E.Terracotta;
    p.fill([cx - rw, cy - rh, cx + rw, cy + rh], (x, y) => Math.abs(x - cx) / rw + Math.abs(y - cy) / rh < 1.2 - noise(x >> 3, y >> 3, 810) * 0.25, mat,
      (x, y) => (y < ridge ? 0.66 : 0.48) + (sn(x, y, 16, 811) - 0.5) * 0.12);
    for (let a = 0; a < Math.PI * 2; a += 0.09) p.on(cx + Math.cos(a) * rw * 0.85, cy + Math.sin(a) * rh * 0.85, E.Line, 2);
  }
  // Musgo.
  for (let k = 0; k < 2 + w; k++) {
    const cx = noise(k, v, 812) * W, cy = noise(v, k, 814) * Hh, r = 14 + noise(k, k, 815) * 22;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x++)
        if (((x - cx) / (r * 1.4)) ** 2 + ((y - cy) / r) ** 2 < 1 - noise(x >> 1, y >> 1, 816) * 0.5) p.on(x, y, E.Moss, noise(x, y, 813) < 0.4 ? 2 : 3);
  }
  // Buracos: o escuro de dentro e as vigas.
  for (let y = 0; y < Hh; y++)
    for (let x = 0; x < W; x++) {
      if (!inHole(x, y)) continue;
      const i = y * W + x;
      const beam = mod(x, 44) < 7;
      p.mat[i] = beam ? E.Bark : E.Void;
      p.shade[i] = beam ? 0.3 : 0.08;
      p.off[i] = 0;
      p.fixed[i] = -1;
    }
  // Cumeeira: a viga, caveiras e chifres.
  limb(p, [6, ridge], [W - 7, ridge], 5, 5, E.Bark);
  for (let x = 50 + (v % 3) * 20; x < W - 40; x += 120) {
    ellipse(p, x, ridge - 6, 11, 10, E.Bone);
    p.on(x - 4, ridge - 6, E.Void, 1); p.on(x + 4, ridge - 6, E.Void, 1); p.on(x - 3, ridge - 5, E.Void, 1); p.on(x + 3, ridge - 5, E.Void, 1);
    limb(p, [x - 9, ridge - 10], [x - 22, ridge - 26], 3, 1.2, E.Bone);
    limb(p, [x + 9, ridge - 10], [x + 22, ridge - 26], 3, 1.2, E.Bone);
  }
  // Beiral de baixo: a testeira de tábua, na sombra.
  box(p, [0, Hh - 10, W - 1, Hh - 1], E.Bark, 0.32);
  hline(p, 0, W - 1, Hh - 10, E.Bark, 4);
  return p.render(true);
}

// --- Acampamento (de pé) --------------------------------------------------------------------

export const TENT = { w: 2 * HD, h: 2 * HD + 170 } as const;

/**
 * Tenda de couro dos orcs (2×2 tiles): um cone de peles costuradas em gomos (a luz do noroeste), remendos de outras
 * cores, a entrada escura virada para o sul, a mão vermelha pintada, as varas cruzadas saindo do topo e caveiras
 * penduradas; pedras segurando a barra.
 */
export function tentSprite(v: number): Uint8ClampedArray {
  const p = paper(TENT.w, TENT.h);
  const cx = TENT.w / 2;
  const foot = TENT.h - 10;
  const rx = 116, ry = 52;
  const baseY = foot - ry;
  const apex = baseY - 300;
  const hw = (y: number) => rx * Math.max(0, (y - apex) / (baseY - apex));
  const inside = (x: number, y: number) => y >= apex && ((y <= baseY && Math.abs(x - cx) <= hw(y)) || (y > baseY && ((x - cx) / rx) ** 2 + ((y - baseY) / ry) ** 2 <= 1));
  const hide = [E.Dirt, E.Bark, E.Dry, E.Terracotta][v % 4];
  // Varas saindo do topo (atrás do couro).
  for (const dx of [-26, 4, 30]) limb(p, [cx + dx * 0.25, apex + 30], [cx + dx, apex - 46], 4, 3, E.Bark);
  p.together(() => p.fill([cx - rx, apex, cx + rx, foot], inside, hide, (x, y) => {
    const u = Math.max(-1, Math.min(1, (x - cx) / Math.max(8, y <= baseY ? hw(y) : rx)));
    const gore = mod(Math.atan2(x - cx, Math.max(1, y - apex + 40)) * 9, 1);
    return lit(u * 0.95, -0.35, Math.sqrt(Math.max(0, 1 - u * u)) + 0.15) - (gore < 0.06 ? 0.18 : 0) + (sn(x & 127, y & 127, 16, 820 + v) - 0.5) * 0.1;
  }, (x, y) => (noise(x, y, 821 + v) < 0.04 ? -1 : 0)));
  // Remendos de outra pele.
  for (let k = 0; k < 4; k++) {
    const py = apex + 90 + noise(k, v, 822) * 180, px = cx + (noise(v, k, 823) - 0.5) * hw(py) * 1.4;
    const r = 18 + noise(k, k, 824) * 12;
    const mat = [E.Bark, E.Dry, E.Terracotta, E.Dirt][(v + k + 1) % 4];
    for (let y = py - r; y <= py + r; y++)
      for (let x = px - r * 1.2; x <= px + r * 1.2; x++) {
        if (!inside(x, y) || Math.abs(x - px) / (r * 1.2) + Math.abs(y - py) / r > 1) continue;
        const i = Math.round(y) * TENT.w + Math.round(x);
        if (p.mat[i] >= 0) p.mat[i] = mat;
      }
    for (let a = 0; a < Math.PI * 2; a += 0.12) p.on(px + Math.cos(a) * r * 1.1, py + Math.sin(a) * r * 0.92, E.Line, 2);
  }
  // Entrada: o vão triangular escuro virado para o sul, com a aba de couro dobrada.
  const ex = cx + (v % 3 - 1) * 14;
  p.fill([ex - 40, baseY - 140, ex + 40, foot], (x, y) => inside(x, y) && y > baseY - 140 && Math.abs(x - ex) < (y - (baseY - 140)) * 0.26, E.Void, () => 0.08);
  poly(p, [[ex + 2, baseY - 136], [ex + 46, baseY + 20], [ex + 18, baseY + 30]], hide, () => 0.38);
  // A mão vermelha pintada (ou a caveira branca, em algumas).
  const sx = cx - 48 + (v % 2) * 92, sy = baseY - 120;
  if (v % 2 === 0) {
    ellipse(p, sx, sy, 13, 15, E.Cloth);
    for (let f = -2; f <= 2; f++) limb(p, [sx + f * 6, sy - 8], [sx + f * 8, sy - 30 + Math.abs(f) * 4], 3.2, 2.6, E.Cloth);
  } else {
    ellipse(p, sx, sy, 15, 13, E.Bone);
    ellipse(p, sx - 5, sy, 4, 4, E.Void);
    ellipse(p, sx + 5, sy, 4, 4, E.Void);
    box(p, [sx - 6, sy + 10, sx + 6, sy + 16], E.Bone, 0.6);
  }
  // Caveiras penduradas na beira e pedras na barra.
  for (const k of [0, 1]) {
    const x = cx + (k ? 70 : -78), y = baseY + 6;
    line(p, [x, y - 40], [x, y - 12], E.Dry, 2);
    ellipse(p, x, y - 4, 8, 8, E.Bone);
    p.on(x - 3, y - 4, E.Void, 1); p.on(x + 3, y - 4, E.Void, 1);
  }
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (0.08 + 0.84 * (k / 8));
    ellipse(p, cx + Math.cos(a) * rx * 0.96, baseY + Math.sin(a) * ry * 0.96 + 2, 7, 5, E.Slab);
  }
  return p.render(true);
}

export const STAKE = { w: HD, h: HD + 170 } as const;

/**
 * Paliçada de 1 tile: estacas de tronco apontadas, amarradas com corda. `across`: a cerca corre de leste a oeste (4
 * estacas lado a lado); senão corre de norte a sul (as estacas uma atrás da outra, vistas de frente). Caveiras em
 * algumas pontas.
 */
export function stakeSprite(across: boolean, v: number): Uint8ClampedArray {
  const p = paper(STAKE.w, STAKE.h);
  const foot = STAKE.h - 8;
  const stake = (x: number, y: number, r: number, h: number, k: number) => {
    const top = y - h;
    p.together(() => {
      p.fill([x - r, top, x + r, y], (xx, yy) => Math.abs(xx - x) <= r * Math.min(1, (yy - top) / (r * 2.4)), k % 3 ? E.Bark : E.Dirt,
        (xx) => lit((xx - x) / r, -0.2, Math.sqrt(Math.max(0, 1 - ((xx - x) / r) ** 2))), (xx, yy) => (noise(xx, yy >> 2, 830 + k) < 0.1 ? -1 : 0));
    });
    // A ponta lascada clara e a amarra.
    for (let yy = top; yy < top + r * 2; yy++) for (let xx = x - r; xx <= x + r; xx++) if (p.has(xx, yy) && xx < x) p.on(xx, yy, E.Dry, 4);
    hline(p, x - r, x + r, y - 52, E.Dry, 3);
    hline(p, x - r, x + r, y - 49, E.Dry, 2);
    if (noise(k, v, 831) < 0.16) {
      ellipse(p, x, top + 6, r * 0.9, r * 0.8, E.Bone);
      p.on(x - 3, top + 6, E.Void, 1); p.on(x + 3, top + 6, E.Void, 1);
    }
  };
  if (across) for (let k = 0; k < 4; k++) stake(18 + k * 31 + (noise(k, v, 832) - 0.5) * 4, foot - 40 - noise(k, v, 833) * 6, 14, 128 + noise(v, k, 834) * 30, k + v);
  else for (let k = 0; k < 4; k++) stake(64 + (noise(k, v, 835) - 0.5) * 10, foot - 100 + k * 30, 15, 120 + noise(v, k, 836) * 30, k + v);
  return p.render(true);
}

export const TOTEM = { w: HD, h: HD + 260 } as const;

/** Totem de caveira: o poste de tronco, caveiras empilhadas (de orc, de bicho), chifres no alto, tiras de pano vermelho e penas; pedras no pé. */
export function totemSprite(v: number): Uint8ClampedArray {
  const p = paper(TOTEM.w, TOTEM.h);
  const cx = 64, foot = TOTEM.h - 30;
  limb(p, [cx, foot], [cx, 50], 9, 7, E.Bark);
  // Tiras de pano.
  for (let k = 0; k < 3; k++) {
    const x = cx - 18 + k * 18, y = 92 + k * 6;
    p.fill([x - 5, y, x + 5, y + 70 + k * 10], (xx, yy) => noise(xx >> 1, yy >> 3, 840 + k) > 0.12 && Math.abs(xx - x - Math.sin(yy / 9 + k) * 3) < 4, E.Cloth,
      (xx, yy) => 0.55 + Math.sin(yy / 9 + k) * 0.12);
  }
  // Caveiras empilhadas.
  for (let k = 0; k < 3; k++) {
    const y = 110 + k * 46, big = k === 0 ? 1.15 : 1;
    ellipse(p, cx, y, 17 * big, 15 * big, E.Bone);
    ellipse(p, cx - 6, y, 4.5, 4.5, E.Void);
    ellipse(p, cx + 6, y, 4.5, 4.5, E.Void);
    box(p, [cx - 7, y + 10, cx + 7, y + 16], E.Bone, 0.55);
    for (let t = -6; t <= 6; t += 3) p.on(cx + t, y + 13, E.Line, 1);
    // Presas de orc na de cima.
    if (k === 0) { limb(p, [cx - 6, y + 14], [cx - 9, y + 4], 2.4, 1, E.Bone); limb(p, [cx + 6, y + 14], [cx + 9, y + 4], 2.4, 1, E.Bone); }
  }
  // Chifres.
  const hornL: Pt[] = [[cx - 8, 90], [cx - 30, 74], [cx - 40, 48], [cx - 34, 28]];
  const hornR: Pt[] = [[cx + 8, 90], [cx + 30, 74], [cx + 40, 48], [cx + 34, 28]];
  for (const horn of [hornL, hornR]) for (let k = 0; k < horn.length - 1; k++) limb(p, horn[k], horn[k + 1], 7 - k * 2, 5 - k * 1.6, E.Bone);
  // Penas.
  for (const [dx, a] of [[-12, -0.5], [12, 0.5]] as const) limb(p, [cx + dx, 60], [cx + dx + a * 30, 22], 4, 1, v % 2 ? E.Iron : E.Cloth);
  // Pedras no pé.
  for (let k = 0; k < 5; k++) ellipse(p, cx - 26 + k * 13, foot + 4 + (k % 2) * 4, 9, 7, E.Slab);
  return p.render(true);
}

export const BANNER = { w: HD, h: HD + 300 } as const;

/**
 * Estandarte de guerra dos orcs fincado no chão: a haste com a ponta de lança, a travessa e o pano preto rasgado com a
 * mão vermelha (ou a caveira branca) e franjas de osso.
 */
export function bannerSprite(v: number): Uint8ClampedArray {
  const p = paper(BANNER.w, BANNER.h);
  const cx = 30, foot = BANNER.h - 20;
  limb(p, [cx, foot], [cx, 24], 5, 4, E.Bark);
  poly(p, [[cx - 7, 30], [cx, 4], [cx + 7, 30]], E.Iron, (x) => (x < cx ? 0.75 : 0.4));
  limb(p, [cx - 6, 50], [cx + 86, 50], 3.5, 3.5, E.Bark);
  const x0 = cx + 2, x1 = cx + 84, y0 = 54, y1 = 230;
  p.fill([x0, y0, x1, y1], (x, y) => {
    const tear = y > y1 - 36 - noise(Math.floor((x - x0) / 8), v, 850) * 50;
    return !tear && noise((x - x0) >> 2, (y - y0) >> 3, 851 + v) > 0.05;
  }, E.Iron, (x, y) => 0.5 + Math.sin((x - x0) / 10) * 0.12 - ((y - y0) / 180) * 0.12);
  const sx = (x0 + x1) / 2, sy = 120;
  if (v % 2 === 0) {
    ellipse(p, sx, sy, 15, 17, E.Cloth);
    for (let f = -2; f <= 2; f++) limb(p, [sx + f * 7, sy - 9], [sx + f * 9, sy - 34 + Math.abs(f) * 5], 3.6, 3, E.Cloth);
  } else {
    ellipse(p, sx, sy, 18, 16, E.Bone);
    ellipse(p, sx - 6, sy, 5, 5, E.Void);
    ellipse(p, sx + 6, sy, 5, 5, E.Void);
    box(p, [sx - 7, sy + 12, sx + 7, sy + 19], E.Bone, 0.6);
    limb(p, [sx - 28, sy + 30], [sx + 28, sy + 56], 3, 3, E.Bone);
    limb(p, [sx + 28, sy + 30], [sx - 28, sy + 56], 3, 3, E.Bone);
  }
  for (let x = x0 + 6; x < x1; x += 16) { line(p, [x, y0], [x, y0 + 8], E.Bone, 3); ellipse(p, x, y0 + 10, 3, 3, E.Bone); }
  for (let k = 0; k < 4; k++) ellipse(p, cx - 10 + k * 8, foot + 4, 7, 5, E.Slab);
  return p.render(true);
}

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

export const CAMP = { w: HD, h: HD + 110 } as const;
export const CAMP_DECOR = ["rack", "pot", "logs", "bones"] as const;
export type CampDecor = (typeof CAMP_DECOR)[number];

/** Enfeites de acampamento (não bloqueiam): o cavalete de armas, o caldeirão no tripé, a pilha de lenha e o monte de ossos. */
export function campDecor(kind: CampDecor, v: number): Uint8ClampedArray {
  const p = paper(CAMP.w, CAMP.h);
  const foot = CAMP.h - 24;
  if (kind === "rack") {
    for (const x of [24, 104]) limb(p, [x, foot], [x, foot - 96], 4, 3.5, E.Bark);
    limb(p, [18, foot - 86], [110, foot - 86], 3.5, 3.5, E.Bark);
    // Machados e lanças encostados.
    for (let k = 0; k < 3; k++) {
      const x = 38 + k * 26;
      limb(p, [x - 6, foot + 2], [x + 6, foot - 110], 2.6, 2.2, E.Bark);
      if ((k + v) % 2) poly(p, [[x + 2, foot - 104], [x + 22, foot - 112], [x + 20, foot - 84], [x + 4, foot - 92]], E.Iron, () => 0.62);
      else poly(p, [[x + 3, foot - 128], [x + 10, foot - 108], [x + 3, foot - 104], [x - 2, foot - 110]], E.Iron, (xx) => (xx < x + 4 ? 0.75 : 0.4));
    }
  } else if (kind === "pot") {
    for (const [a, b] of [[[20, foot], [64, foot - 92]], [[108, foot], [64, foot - 92]], [[64, foot + 6], [64, foot - 92]]] as const) limb(p, a, b, 3, 2.4, E.Bark);
    p.fill([30, foot - 66, 98, foot - 6], (x, y) => Math.hypot((x - 64) / 34, (y - (foot - 36)) / 30) < 1, E.Iron, (x, y) => lit((x - 64) / 34, (y - (foot - 36)) / 30, 0.6));
    ellipse(p, 64, foot - 60, 30, 9, E.Moss);
    for (let k = 0; k < 6; k++) p.on(48 + k * 6, foot - 61 + (k % 2), E.Bone, 4);
    line(p, [64, foot - 92], [64, foot - 62], E.Iron, 1);
  } else if (kind === "logs") {
    for (let k = 0; k < 5; k++) {
      const y = foot - 8 - (k < 3 ? 0 : 16), x0 = 18 + (k % 3) * 8 + (k >= 3 ? 14 : 0);
      limb(p, [x0, y - k * 2], [x0 + 80, y - 6 - k * 2], 9, 9, E.Bark);
      ellipse(p, x0 + 80, y - 6 - k * 2, 7, 8, E.Dry);
    }
    limb(p, [70, foot - 6], [90, foot - 50], 2, 2, E.Iron);
  } else {
    for (let k = 0; k < 9; k++) {
      const a = noise(k, v, 870) * Math.PI, x = 30 + noise(v, k, 871) * 68, y = foot - 8 - noise(k, k, 872) * 30;
      limb(p, [x - Math.cos(a) * 18, y - Math.sin(a) * 6], [x + Math.cos(a) * 18, y + Math.sin(a) * 6], 3, 3, E.Bone);
    }
    ellipse(p, 64, foot - 46, 18, 16, E.Bone);
    ellipse(p, 57, foot - 46, 5, 5, E.Void);
    ellipse(p, 71, foot - 46, 5, 5, E.Void);
    limb(p, [50, foot - 54], [32, foot - 76], 4, 1.5, E.Bone);
    limb(p, [78, foot - 54], [96, foot - 76], 4, 1.5, E.Bone);
  }
  return p.render(true);
}
