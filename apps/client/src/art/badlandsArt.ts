import type { Rgb } from "./hero/color.ts";
import {
  HD, Paper as Painter, smoothNoise, ebox, ellipse, inEllipse, limb, line, lit, noise, palette, poly, sn, sphere, worleyCells,
  type MaterialBase, type Pt,
} from "./paint.ts";
import { OPEN, distTo, field, fieldAt } from "./forestArt.ts";

/**
 * Arte dos Ermos Rubros (Verdemar, etapa 9) no padrão novo (`paint.ts`, `docs/ARTE_TIBIA.md`): 128 px por tile, luz de
 * cima à esquerda, 4 tons por material, contorno quase preto nos objetos de pé. Ermos de barro vermelho rachado ao sol em
 * placas (a rede de rachaduras corre sem emenda por um bloco de 4×4 tiles), manchas de areia ocre, crosta de sal e
 * cascalho, o rastro das carroças, os trilhos da mina, as cristas de rocha com o paredão em camadas (ferrugem, ocre e
 * creme, a capa de basalto), as ravinas fundas, as pontes de corda, as torres de pedra roídas pelo vento, as costelas e o
 * crânio de bichos gigantes, os muros de adobe, a boca da mina e a cratera queimada com as rachaduras em brasa. Só arrays:
 * o teste `cenarios` pinta tudo sem navegador.
 */

export enum E {
  Clay, Clay2, Crack, Sand, Salt, Gravel, Rock, RockDark, Band1, Band2, Basalt, Shadow, Abyss, Wood, Rope, Iron, Rust, Bone, Sage,
  Thorn, Flower, Cloth, Ember, Flame, Glow, Line, Adobe, Track, Char,
}

const BASES: Record<E, MaterialBase> = {
  [E.Clay]: ["#a65a3e", 0.55, 5], [E.Clay2]: ["#b56e4e", 0.55, 5], [E.Crack]: ["#4a2218", 0.5, 4], [E.Sand]: ["#c4905c", 0.55, 6],
  [E.Salt]: ["#d8c8b6", 0.4, 4], [E.Gravel]: ["#946a54", 0.8, 5], [E.Rock]: ["#7e3a2c", 0.85, 5], [E.RockDark]: ["#52241e", 0.8, 5],
  [E.Band1]: ["#b97c4a", 0.85, 6], [E.Band2]: ["#d6ae86", 0.75, 5], [E.Basalt]: ["#3f3534", 0.9, 4], [E.Shadow]: ["#3c1d18", 0.6, 4],
  [E.Abyss]: ["#140b0b", 0.4, 3], [E.Wood]: ["#8a6a4a", 0.9, 5], [E.Rope]: ["#c4a474", 0.8, 5], [E.Iron]: ["#5c5654", 1, 4, true],
  [E.Rust]: ["#c46a2c", 0.9, 7], [E.Bone]: ["#e6dcc4", 0.8, 5], [E.Sage]: ["#8a9472", 0.85, 6], [E.Thorn]: ["#6a4a32", 0.9, 5],
  [E.Flower]: ["#e8c040", 0.9, 8], [E.Cloth]: ["#3e5a8a", 0.9, 6], [E.Ember]: ["#e0702a", 1.1, 8], [E.Flame]: ["#ffd060", 1.2, 10, true],
  [E.Glow]: ["#ff8a3a", 1.2, 10, true], [E.Line]: ["#1a0e0c", 0.4, 0], [E.Adobe]: ["#b9825c", 0.8, 5], [E.Track]: ["#b37a58", 0.5, 4],
  [E.Char]: ["#55362e", 0.6, 4],
};

let rampCache: Rgb[][] | null = null;
const ramps = () => (rampCache ??= palette(Object.values(E).filter((v): v is E => typeof v === "number").map((m) => BASES[m])));

class Paper extends Painter {
  constructor(w = HD, h = HD) { super(ramps(), w, h); }
}

export { OPEN };

/** O chão é uma textura contínua de `BLOCK`×`BLOCK` tiles. */
export const BLOCK = 4;
const PERIOD = HD * BLOCK;
export const blockPiece = (x: number, y: number) => (((x % BLOCK) + BLOCK) % BLOCK) + BLOCK * (((y % BLOCK) + BLOCK) % BLOCK);
/** Pedaço (0 a 3) de um bloco de 2×2 tiles (a rocha das cristas). */
export const pairPiece = (x: number, y: number) => (x & 1) + 2 * (y & 1);
/** Tom do chão plano: no meio de uma faixa (o pontilhado da fronteira entre faixas vira uma trama na tela toda). */
const MID = 0.64;
const HI = MID + 0.25;
const LO = MID - 0.25;

// --- Chão ---------------------------------------------------------------------------------

/**
 * Barro rachado: placas poligonais (células de Worley que fecham no bloco de 4×4 tiles, `q` é o pedaço), a rachadura
 * escura entre elas, a beirada de cima à esquerda de cada placa pegando luz (a placa se encurva ao secar) e pedrinhas. Na
 * cratera (`scorched`), o barro queimado, quase preto, com as rachaduras em brasa.
 */
export function groundTile(q: number, scorched = false): Uint8ClampedArray {
  const p = new Paper();
  const ox = (q % BLOCK) * HD, oy = Math.floor(q / BLOCK) * HD;
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const w = worleyCells(x + 0.5 + ox, y + 0.5 + oy, 40, PERIOD, scorched ? 511 : 501);
      const i = y * HD + x;
      const gap = w.d2 - w.d1;
      const tone = noise(w.id, 3, 502);
      p.part[i] = 1;
      if (gap < 2.2) {
        // Na cratera, só algumas rachaduras estão em brasa (as que passam perto de um centro "quente" do bloco).
        const hot = scorched && smoothHot(x + ox, y + oy) > 0.6;
        p.mat[i] = hot ? (gap < 1.1 ? E.Glow : E.Ember) : E.Crack;
        p.shade[i] = hot ? (gap < 1.1 ? 0.9 : 0.55) : MID;
        continue;
      }
      p.mat[i] = scorched ? E.Char : tone < 0.3 ? E.Clay2 : E.Clay;
      // Beirada encurvada: o lado de cima à esquerda da placa, junto da rachadura, mais claro; o de baixo mais escuro.
      const nx = w.dx / (w.d1 || 1), ny = w.dy / (w.d1 || 1);
      const rim = gap < 4 ? -nx - ny : 0;
      p.shade[i] = rim > 0.5 ? HI : rim < -0.6 ? LO : MID;
    }
  // Pedrinhas e grãos.
  for (let k = 0; k < 24; k++) {
    const x = Math.floor(noise(k, q, 503) * HD), y = Math.floor(noise(q, k, 504) * HD);
    if (k % 3 === 0) { ellipse(p, x, y, 2.4, 1.8, E.Gravel); p.on(x - 1, y - 1, E.Gravel, 5); }
    else { p.on(x, y, scorched ? E.Ember : E.Clay2, scorched ? 2 : 1); }
  }
  return p.render(false);
}

/** Onde a cratera está mais quente (ruído suave contínuo no bloco). */
const smoothHot = (x: number, y: number) => smoothNoise(x, y, 128, 512, PERIOD) * 0.6 + smoothNoise(x, y, 32, 513, PERIOD) * 0.4;

/** Manchas do chão (camada por cima do barro): areia ocre, crosta de sal e cascalho. */
export const PATCHES = [E.Sand, E.Salt, E.Gravel] as const;

/**
 * Mancha de `mat` pelos vizinhos que não têm a mesma mancha (`out`, 8 bits), de beira recortada (o mesmo ruído dos dois
 * lados da emenda). A areia tem as marolas do vento; o sal, as placas brancas rachadas; o cascalho, as pedrinhas.
 */
export function patchTile(mat: E, out: number): Uint8ClampedArray {
  const p = new Paper();
  const dist = field(out, 90);
  const edge = (x: number, y: number) => 46 + (sn(x, y, 64, 520 + mat) - 0.5) * 60 + (sn(x, y, 16, 521) - 0.5) * 22 + (sn(x, y, 4, 522) - 0.5) * 6;
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => fieldAt(dist, x, y) > edge(x, y), mat, () => MID);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      if (p.mat[i] < 0) continue;
      const near = fieldAt(dist, x, y) - edge(x + 0.5, y + 0.5) < 4;
      if (mat === E.Sand) {
        // Marolas: faixas finas onduladas de leste a oeste, o lado de cima claro.
        const r = (y + Math.sin(x / 11) * 3 + sn(x, y, 32, 523) * 8) % 9;
        p.shade[i] = r < 1 ? HI : r < 2 ? LO : MID;
      } else if (mat === E.Salt) {
        const w = worleyCells(x + 0.5, y + 0.5, 18, HD, 524);
        if (w.d2 - w.d1 < 1.4) { p.mat[i] = E.Clay2; p.shade[i] = MID; }
        else p.shade[i] = -w.dx - w.dy > 6 ? HI : MID;
      } else {
        const w = worleyCells(x + 0.5, y + 0.5, 9, HD, 525);
        p.shade[i] = w.d1 > 3.6 ? LO : -w.dx - w.dy > 1.5 ? HI : MID;
        if (noise(w.id, 1, 526) < 0.3) p.mat[i] = E.Rock;
      }
      if (near) p.off[i] = -1;
    }
  return p.render(false);
}

/**
 * Rastro das carroças (a região dos tiles de trilha, de beira recuada até os vizinhos que não são trilha): terra batida
 * mais clara e lisa que o barro, sem rachaduras, com sulcos, pedrinhas e a beira empoeirada.
 */
export function trackTile(links: number): Uint8ClampedArray {
  const p = new Paper();
  const shore = field(~links & 255, 110);
  const dist = (x: number, y: number) => 64 - fieldAt(shore, x, y);
  const edge = (x: number, y: number) => 24 + (sn(x, y, 64, 530) - 0.5) * 40 + (sn(x, y, 16, 531) - 0.5) * 14;
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => dist(x, y) < edge(x, y), E.Track, (x, y) => (dist(x, y) > edge(x, y) - 4 ? LO : MID));
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(noise(k, links, 532) * HD), y = Math.floor(noise(links, k, 533) * HD);
    if (dist(x, y) > edge(x, y) - 8) continue;
    if (k % 4 === 0) { ellipse(p, x, y, 2, 1.6, E.Gravel); }
    else if (k % 4 === 1) for (let dx = 0; dx < 6; dx++) p.on(x + dx, y, E.Track, 2);
    else p.on(x, y, E.Track, k % 2 ? 4 : 2);
  }
  return p.render(false);
}

/** Trilhos da mina (transparente fora deles): dormentes de madeira atravessados e os dois trilhos de ferro, pelos lados ligados (4 bits). */
export function railTile(links: number): Uint8ClampedArray {
  const p = new Paper();
  const vertical = (links & (OPEN.n | OPEN.s)) !== 0 || links === 0;
  const horizontal = (links & (OPEN.e | OPEN.w)) !== 0;
  const arm = (bit: number) => (links & bit) !== 0;
  const runs: [Pt, Pt][] = [];
  if (vertical) runs.push([[64, arm(OPEN.n) ? -2 : 40], [64, arm(OPEN.s) ? 130 : 88]]);
  if (horizontal) runs.push([[arm(OPEN.w) ? -2 : 40, 64], [arm(OPEN.e) ? 130 : 88, 64]]);
  for (const [a, b] of runs) {
    const v = a[0] === b[0];
    // Dormentes.
    for (let t = (v ? a[1] : a[0]) + 6; t < (v ? b[1] : b[0]); t += 18) {
      const c = Math.round(t);
      p.fill(v ? [38, c - 5, 90, c + 5] : [c - 5, 38, c + 5, 90], () => true, E.Wood, (x, y) => (v ? (y < c - 2 ? HI : MID) : x < c - 2 ? HI : MID),
        (x, y) => (noise(x >> 2, y >> 2, 540) < 0.15 ? -1 : 0));
    }
    // Trilhos.
    for (const o of [-16, 16]) {
      if (v) p.fill([64 + o - 2, Math.max(0, a[1]), 64 + o + 2, Math.min(127, b[1])], () => true, E.Iron, (x) => (x < 64 + o ? HI : MID));
      else p.fill([Math.max(0, a[0]), 64 + o - 2, Math.min(127, b[0]), 64 + o + 2], () => true, E.Iron, (x, y) => (y < 64 + o ? HI : MID));
    }
  }
  return p.render(true);
}

// --- Rocha das cristas -----------------------------------------------------------------------

/** Altura do paredão (px) que aparece no tile de rocha com chão ao sul. */
export const FACE = 84;

/**
 * Rocha das cristas pelos vizinhos que não são rocha (`open`, 8 bits); `piece` é o pedaço de um bloco de 2×2 tiles. Em
 * cima, o platô de rocha vermelha em lajes rachadas, com tufos de capim seco; a beira do platô tem a quina clara do lado
 * do sol. Com chão ao sul, o paredão desce até o chão em camadas (ferrugem, ocre, creme, a de basalto em cima), com os
 * sulcos da erosão e o entulho no pé.
 */
export function rockTile(open: number, piece: number): Uint8ClampedArray {
  const p = new Paper();
  const ox = (piece & 1) * HD, oy = (piece >> 1) * HD;
  const south = (open & OPEN.s) !== 0;
  const faceTop = (x: number) => HD - FACE + (sn(x, 0, 32, 550) - 0.5) * 18 + (sn(x, 3, 8, 551) - 0.5) * 6;
  const d = (x: number, y: number) => distTo(open & ~OPEN.s & ~OPEN.se & ~OPEN.sw, x, y);
  const rimW = (x: number, y: number) => 7 + (sn(x, y, 16, 552) - 0.5) * 8;
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      p.part[i] = 1;
      const top = south ? faceTop(x) : 1e9;
      const sideD = d(x + 0.5, y + 0.5);
      if (sideD < rimW(x, y) * 0.6 - 2) continue; // a beira do platô recua: o chão de baixo aparece
      if (y >= top) {
        // Paredão: camadas pela altura (iguais em todo tile, emendam), sulcos verticais, sombra na base.
        const h = y - top;
        if (y > HD - 6 - (sn(x, 5, 16, 553) - 0.5) * 6) { p.mat[i] = -1; continue; }
        const layer = Math.floor((h + sn(x, 7, 32, 554) * 2) / 14);
        p.mat[i] = h < 9 ? E.Basalt : [E.Rock, E.Band1, E.RockDark, E.Band2, E.Rock, E.Band1, E.RockDark][layer % 7];
        const groove = sn(x, (layer * 37) & 127, 8, 555);
        p.shade[i] = h < 9 ? (h < 3 ? HI : MID) : groove > 0.66 ? LO : groove < 0.3 ? HI : MID;
        if ((h + Math.round(sn(x, 7, 32, 554) * 2)) % 14 === 0) p.shade[i] = LO;
        continue;
      }
      // Platô: lajes de rocha rachada (células no bloco de 2×2).
      const w = worleyCells(x + 0.5 + ox, y + 0.5 + oy, 56, HD * 2, 557);
      const gap = w.d2 - w.d1;
      p.mat[i] = gap < 2 ? E.Shadow : noise(w.id, 1, 558) < 0.3 ? E.RockDark : E.Rock;
      const rim = -w.dx / (w.d1 || 1) - w.dy / (w.d1 || 1);
      p.shade[i] = gap < 2 ? MID : gap < 5 && rim > 0.5 ? HI : MID;
      // Quina do platô: clara do lado do sol (norte e oeste), escura do outro.
      if (sideD < rimW(x, y)) {
        const fromN = (open & (OPEN.n | OPEN.nw | OPEN.ne)) && distTo(open & (OPEN.n | OPEN.nw | OPEN.ne), x, y) <= sideD + 0.5;
        const fromW = (open & (OPEN.w | OPEN.nw | OPEN.sw)) && distTo(open & (OPEN.w | OPEN.nw | OPEN.sw), x, y) <= sideD + 0.5;
        p.mat[i] = E.Rock;
        p.shade[i] = fromN || fromW ? HI : LO;
      }
      if (south && y >= top - 4) { p.mat[i] = E.Basalt; p.shade[i] = HI; }
    }
  // Tufos de capim seco no platô.
  for (let k = 0; k < 6; k++) {
    const cx = 10 + noise(k, piece, 559) * 108, cy = 10 + noise(piece, k, 560) * 70;
    if (!p.has(Math.round(cx), Math.round(cy)) || (south && cy > faceTop(cx) - 10)) continue;
    for (let b = 0; b < 7; b++) line(p, [cx, cy], [cx + (b - 3) * 2, cy - 5 - (b % 3)], E.Sage, b % 2 ? 4 : 3);
  }
  // Entulho no pé do paredão.
  if (south)
    for (let k = 0; k < 7; k++) {
      const x = 8 + noise(k, piece, 561) * 112, y = HD - 9 + noise(piece, k, 562) * 5, r = 3 + noise(k, k, 563) * 3;
      p.fill(ebox(x, y, r * 1.3, r), inEllipse(x, y, r * 1.3, r), E.RockDark, sphere(x - 1, y - 2, r * 1.3, r));
    }
  return p.render(false);
}

/**
 * Ravina pelos vizinhos que são terra (`land`, 8 bits): a quina da beira, a parede do lado norte (a que se vê, em
 * camadas, descendo) e o fundo escuro; do lado sul só a sombra da beirada. Emenda pela distância, como a água.
 */
export function chasmTile(land: number, q: number): Uint8ClampedArray {
  const p = new Paper();
  const shore = field(land, 90);
  const north = land & (OPEN.n | OPEN.ne | OPEN.nw);
  const fromN = north ? field(north, 90) : null;
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = y * HD + x;
      p.part[i] = 1;
      const d = shore[i] - 6 + (sn(x, y, 16, 570) - 0.5) * 10 + (sn(x, y, 64, 571) - 0.5) * 24;
      if (d < 0) { p.mat[i] = -1; continue; }
      if (d < 4) { p.mat[i] = E.Rock; p.shade[i] = HI; continue; }
      const dn = fromN ? fromN[i] + (sn(x, y, 64, 571) - 0.5) * 24 - 6 : 1e9;
      if (dn < 52) {
        // A parede de longe, em camadas, escurecendo com a profundidade.
        const layer = Math.floor((dn + sn(x, 4, 32, 572) * 5) / 9);
        p.mat[i] = dn > 40 ? E.Shadow : [E.Rock, E.Band1, E.RockDark, E.Band2, E.RockDark][layer % 5];
        p.shade[i] = dn > 30 ? LO : sn(x * 4 & 127, 0, 16, 573) > 0.65 ? LO : MID;
        continue;
      }
      p.mat[i] = d < 14 ? E.Shadow : E.Abyss;
      p.shade[i] = MID;
      // Um fio de brasa no fundo, raro.
      if (d > 34 && sn(x, (y * 3) & 127, 32, 574 + q) > 0.86 && noise(x >> 2, y, 575) < 0.5) { p.mat[i] = E.Ember; p.shade[i] = LO; }
    }
  return p.render(false);
}

/**
 * Ponte de tábuas por cima da ravina (transparente fora dela): as tábuas atravessadas ao caminho, as cordas dos lados e os
 * postes nas pontas que encostam na terra (`ends`).
 */
export function bridgeTile(links: number, ends: number, ns: boolean): Uint8ClampedArray {
  const p = new Paper();
  const HALF = 28;
  // Ponte larga: do lado em que há outra ponte, as tábuas vão até a beira do tile (sem corda).
  const lo = ns ? (links & OPEN.w ? 0 : 64 - HALF) : (links & OPEN.n ? 0 : 64 - HALF);
  const hi = ns ? (links & OPEN.e ? 127 : 64 + HALF) : (links & OPEN.s ? 127 : 64 + HALF);
  const PL = 12;
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const across = ns ? x : y, along = ns ? y : x;
      if (across < lo || across > hi) continue;
      const k = Math.floor(along / PL), inPlank = along % PL;
      if (noise(k, Math.floor(across / 24), 580) < 0.05 && k > 1 && k < 9) continue;
      const i = y * HD + x;
      p.part[i] = 1;
      p.mat[i] = inPlank === PL - 1 ? E.Shadow : E.Wood;
      p.shade[i] = inPlank === 0 ? HI : inPlank === PL - 1 ? LO : MID;
      p.off[i] = noise(k, Math.floor(across / 40), 581) < 0.3 ? -1 : 0;
    }
  // Cordas nas beiradas de fora (com a barriga) e os postes nas pontas.
  const rope = (o: number, sgn: number) => {
    for (let t = 0; t < HD; t++) {
      const sag = Math.sin((t / HD) * Math.PI) * 3 * sgn;
      if (ns) { p.px(o + sag, t, E.Rope, 3); p.px(o + sag + 1, t, E.Rope, 2); }
      else { p.px(t, o + Math.abs(sag), E.Rope, 3); p.px(t, o + Math.abs(sag) + 1, E.Rope, 2); }
    }
  };
  if (lo > 0) rope(lo - 2, -1);
  if (hi < 127) rope(hi + 2, 1);
  const post = (x: number, y: number) => { p.fill(ebox(x, y, 6, 6), inEllipse(x, y, 6, 6), E.Wood, sphere(x - 1, y - 2, 6, 6)); p.on(x - 2, y - 2, E.Wood, 5); };
  const near = ns ? [lo > 0 ? lo - 2 : -1, hi < 127 ? hi + 2 : -1] : [lo > 0 ? lo - 2 : -1, hi < 127 ? hi + 2 : -1];
  for (const c of near) {
    if (c < 0) continue;
    if (ns) { if (ends & OPEN.n) post(c, 6); if (ends & OPEN.s) post(c, 122); }
    else { if (ends & OPEN.w) post(6, c); if (ends & OPEN.e) post(122, c); }
  }
  return p.render(true);
}

// --- De pé ----------------------------------------------------------------------------------

export const HOODOO = { w: 180, h: 340 } as const;

/**
 * Torre de pedra roída pelo vento: o fuste em gomos (afina e engorda nas camadas mais moles), as camadas em ferrugem,
 * ocre e creme, a capa de basalto mais larga lá em cima e o entulho no pé.
 */
export function hoodoo(v: number): Uint8ClampedArray {
  const p = new Paper(HOODOO.w, HOODOO.h);
  const X = HOODOO.w / 2, Bt = HOODOO.h - 10;
  const h = 170 + noise(v, 1, 600) * 120;
  const lean = (noise(v, 2, 601) - 0.5) * 14;
  const radius = (t: number) => 34 - t * 12 + Math.sin(t * 7 + v) * 7 + Math.sin(t * 19 + v * 2) * 2.5 + (t < 0.12 ? (0.12 - t) * 60 : 0);
  const top = Bt - h;
  p.together(() => {
    p.fill([X - 44, top, X + 44, Bt], (x, y) => {
      const t = (Bt - y) / h, cx = X + lean * t;
      return Math.abs(x - cx) <= radius(t);
    }, E.Band1, (x, y) => {
      const t = (Bt - y) / h, cx = X + lean * t, r = radius(t);
      const nx = (x - cx) / r;
      return lit(nx, 0, Math.sqrt(Math.max(0, 1 - nx * nx)));
    });
    // Capa de basalto.
    const cr = 30 + noise(v, 3, 603) * 10;
    ellipse(p, X + lean, top + 2, cr, 12, E.Basalt);
    p.fill([X + lean - cr, top + 2, X + lean + cr, top + 14], (x, y) => Math.abs(x - X - lean) <= cr - (y - top - 2) * 1.2, E.Basalt,
      (x) => lit((x - X - lean) / cr, 0.3, 0.7));
  });
  // Camadas mais claras (creme) e mais escuras.
  for (let y = Math.floor(top + 14); y < Bt; y++) {
    const band = Math.floor((Bt - y + sn(0, y, 16, 604) * 8) / 22) % 5;
    if (band !== 2 && band !== 0) continue;
    const t = (Bt - y) / h, cx = X + lean * t, r = radius(t);
    for (let x = Math.ceil(cx - r); x <= cx + r; x++) {
      const i = y * HOODOO.w + x;
      if (x >= 0 && x < HOODOO.w && p.mat[i] === E.Band1) p.mat[i] = band === 2 ? E.Band2 : E.Rock;
    }
  }
  // Entulho no pé.
  for (let k = 0; k < 6; k++) {
    const x = X - 34 + noise(k, v, 605) * 68, y = Bt - 2 + noise(v, k, 606) * 6, r = 4 + noise(k, k, 607) * 5;
    ellipse(p, x, y, r * 1.3, r, k % 2 ? E.RockDark : E.Rock);
  }
  return p.render(true);
}

export const RIB = { w: 128, h: 240 } as const;

/** Costela de um bicho gigante saindo do chão em arco, com a vértebra no pé (`v`: a posição na fila, 0 a 3). */
export function rib(v: number): Uint8ClampedArray {
  const p = new Paper(RIB.w, RIB.h);
  const Bt = RIB.h - 12;
  const h = 150 - Math.abs(v - 1.5) * 26;
  const pts: Pt[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    pts.push([30 + Math.sin(t * Math.PI * 0.9) * 62, Bt - t * h]);
  }
  p.together(() => {
    for (let k = 0; k < pts.length - 1; k++) limb(p, pts[k], pts[k + 1], 9 - k * 0.7, 9 - (k + 1) * 0.7, E.Bone);
  });
  // Rachaduras e o desgaste.
  for (let k = 1; k < pts.length - 1; k += 2) p.on(pts[k][0] + 2, pts[k][1], E.Gravel, 1);
  // Vértebra no pé.
  p.together(() => {
    ellipse(p, 26, Bt - 4, 20, 11, E.Bone);
    limb(p, [26, Bt - 10], [22, Bt - 30], 5, 3, E.Bone);
  });
  // Areia juntando no pé.
  p.fill([0, Bt - 4, RIB.w - 1, Bt + 10], (x, y) => y > Bt - 2 + Math.abs(x - 40) * 0.08 + sn(x, 0, 16, 610) * 3, E.Sand, () => MID);
  return p.render(true);
}

export const SKULL = { w: 400, h: 330 } as const;

/** O crânio gigante encostado na borda da cratera: a abóbada rachada, as órbitas escuras, os chifres e a fileira de dentes, meio enterrado. */
export function giantSkull(): Uint8ClampedArray {
  const p = new Paper(SKULL.w, SKULL.h);
  const X = SKULL.w / 2, Bt = SKULL.h - 16;
  p.together(() => {
    // Chifres.
    for (const sgn of [-1, 1]) {
      const pts: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        pts.push([X + sgn * (70 + t * 110 - Math.sin(t * Math.PI) * 10), Bt - 150 - Math.sin(t * Math.PI * 0.8) * 110 + t * 40]);
      }
      for (let k = 0; k < pts.length - 1; k++) limb(p, pts[k], pts[k + 1], 22 - k * 2, 22 - (k + 1) * 2, E.Bone);
    }
    // Abóbada e focinho.
    p.fill(ebox(X, Bt - 140, 110, 100), inEllipse(X, Bt - 140, 110, 100), E.Bone, sphere(X - 20, Bt - 170, 120, 110));
    p.fill([X - 80, Bt - 120, X + 80, Bt], (x, y) => Math.abs(x - X) <= 80 - (y - (Bt - 120)) * 0.25, E.Bone, (x, y) => lit((x - X) / 80, -0.1, 0.8) * 0.9);
  });
  // Órbitas, narinas e os dentes.
  for (const sgn of [-1, 1]) {
    p.fill(ebox(X + sgn * 46, Bt - 150, 26, 22), inEllipse(X + sgn * 46, Bt - 150, 26, 22), E.Abyss, () => MID);
    p.fill(ebox(X + sgn * 46, Bt - 150, 26, 22), (x, y) => inEllipse(X + sgn * 46, Bt - 150, 26, 22)(x, y) && y > Bt - 152 && Math.hypot(x - X - sgn * 46, y - Bt + 150) > 18, E.Glow, () => 0.5);
    p.fill(ebox(X + sgn * 14, Bt - 70, 7, 11), inEllipse(X + sgn * 14, Bt - 70, 7, 11), E.Abyss, () => MID);
  }
  for (let k = 0; k < 9; k++) {
    const tx = X - 64 + k * 16;
    p.fill([tx - 6, Bt - 34, tx + 6, Bt - 4], (x, y) => Math.abs(x - tx) <= 6 - (y - (Bt - 34)) * 0.18, E.Bone, (x) => (x < tx ? HI : MID));
  }
  // Rachaduras na abóbada.
  let cx = X + 10, cy = Bt - 236;
  for (let k = 0; k < 14; k++) { const nx = cx + (noise(k, 1, 620) - 0.5) * 16, ny = cy + 7; line(p, [cx, cy], [nx, ny], null, 1); cx = nx; cy = ny; }
  // Meio enterrado na areia.
  p.fill([0, Bt - 30, SKULL.w - 1, Bt + 14], (x, y) => y > Bt - 12 + Math.abs(x - X) * 0.05 + sn(x, 0, 32, 621) * 10, E.Sand, () => MID,
    (x, y) => ((y + Math.sin(x / 9) * 2) % 7 < 1 ? 1 : 0));
  return p.render(true);
}

export const ADOBE = { w: 128, h: 220 } as const;

/** Muro de adobe do posto abandonado (1 tile): os tijolos de barro, o reboco caindo, o topo desmoronado e às vezes uma seteira. */
export function adobeWall(v: number): Uint8ClampedArray {
  const p = new Paper(ADOBE.w, ADOBE.h);
  const Bt = ADOBE.h - 8;
  const top = (x: number) => Bt - 104 - (sn(x, v * 9, 32, 630) - 0.5) * 36 - (noise(Math.floor(x / 14), v, 631) < 0.25 ? 18 : 0);
  p.fill([0, 0, ADOBE.w - 1, Bt], (x, y) => y >= top(x), E.Adobe, (x, y) => (y < top(x) + 6 ? HI : MID), (x, y) => {
    // Tijolos: fiadas desencontradas.
    const row = Math.floor((Bt - y) / 12);
    const bx = (x + (row % 2) * 13) % 26;
    return (Bt - y) % 12 === 0 || bx === 0 ? -1 : 0;
  });
  // Reboco caindo: manchas lisas mais claras.
  for (let k = 0; k < 3; k++) {
    const cx = 18 + noise(k, v, 632) * 92, cy = Bt - 30 - noise(v, k, 633) * 60, r = 12 + noise(k, k, 634) * 10;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r * 1.3); x <= cx + r * 1.3; x++)
        if (((x - cx) / (r * 1.3)) ** 2 + ((y - cy) / r) ** 2 <= 1 && p.has(x, y) && sn(x, y, 8, 635) > 0.35) p.on(x, y, E.Band2, 3);
  }
  if (v % 3 === 1) p.fill([58, Bt - 74, 70, Bt - 52], () => true, E.Abyss, () => MID);
  // Base úmida e terra.
  for (let x = 0; x < ADOBE.w; x++) for (let y = Bt - 6; y <= Bt; y++) p.on(x, y, E.RockDark, 2);
  return p.render(true);
}

export const MINE = { w: 256, h: 300 } as const;

/** Boca da mina, por cima do paredão: o vão escuro escorado por dois esteios e a viga, a lanterna e o letreiro rachado. */
export function mineMouth(): Uint8ClampedArray {
  const p = new Paper(MINE.w, MINE.h);
  const X = MINE.w / 2, Bt = MINE.h - 6;
  p.fill([X - 46, Bt - 120, X + 46, Bt], (x, y) => y > Bt - 120 + Math.abs(x - X) ** 2 / 90, E.Abyss, (x, y) => MID);
  p.together(() => {
    limb(p, [X - 50, Bt], [X - 46, Bt - 126], 9, 8, E.Wood);
    limb(p, [X + 50, Bt], [X + 46, Bt - 126], 9, 8, E.Wood);
    limb(p, [X - 66, Bt - 128], [X + 66, Bt - 126], 10, 10, E.Wood);
    limb(p, [X - 46, Bt - 40], [X - 20, Bt - 122], 4, 4, E.Wood);
  });
  // Letreiro.
  p.together(() => {
    p.fill([X - 34, Bt - 160, X + 34, Bt - 136], () => true, E.Wood, (x, y) => (y < Bt - 156 ? HI : MID), (x, y) => (Math.floor(y) % 8 === 0 ? -1 : 0));
    line(p, [X - 30, Bt - 160], [X - 20, Bt - 128], E.Rope, 3, false);
    line(p, [X + 30, Bt - 160], [X + 20, Bt - 128], E.Rope, 3, false);
  });
  for (const [a, b] of [[[X - 20, Bt - 150], [X - 6, Bt - 146]], [[X + 2, Bt - 152], [X + 22, Bt - 144]]] as [Pt, Pt][]) line(p, a, b, E.Line, 1);
  // Lanterna.
  const lx = X + 62, ly = Bt - 100;
  line(p, [lx, Bt - 126], [lx, ly - 10], E.Iron, 1, false);
  p.together(() => {
    p.fill([lx - 7, ly - 10, lx + 7, ly + 9], (x, y) => Math.abs(x - lx) <= 7 - Math.max(0, y - ly - 4) * 0.6, E.Iron, () => 0.4);
    p.fill([lx - 5, ly - 6, lx + 5, ly + 5], (x) => Math.abs(x - lx) <= 5, E.Flame, (x, y) => 0.95 - Math.hypot(x - lx, y - ly) * 0.06);
  });
  return p.render(true);
}

export const CART = { w: 128, h: 150 } as const;

/** Vagoneta de minério, parada no fim dos trilhos, cheia de pedras de ferro. */
export function oreCart(): Uint8ClampedArray {
  const p = new Paper(CART.w, CART.h);
  const Bt = CART.h - 10;
  for (const x of [34, 94]) { p.fill(ebox(x, Bt - 10, 11, 11), inEllipse(x, Bt - 10, 11, 11), E.Iron, sphere(x - 3, Bt - 14, 11, 11)); ellipse(p, x, Bt - 10, 3, 3, E.Basalt); }
  p.fill([16, Bt - 62, 112, Bt - 18], (x, y) => Math.abs(x - 64) <= 48 - (y - (Bt - 62)) * 0.25, E.Iron, (x, y) => (y < Bt - 56 ? HI : x > 90 ? LO : MID));
  for (const x of [30, 64, 98]) line(p, [x, Bt - 60], [x - (x - 64) * 0.1, Bt - 20], E.Basalt, 1);
  for (let k = 0; k < 9; k++) {
    const x = 26 + k * 9 + noise(k, 1, 640) * 6, y = Bt - 64 - noise(1, k, 641) * 10, r = 7 + noise(k, k, 642) * 3;
    ellipse(p, x, y, r, r * 0.8, k % 3 ? E.Rust : E.RockDark);
  }
  return p.render(true);
}

export const CAMPFIRE = { w: 128, h: 110 } as const;

/** Fogueira de acampamento: o anel de pedras e as achas cruzadas (a chama é o mesmo quadro animado do Charco). */
export function campfire(): Uint8ClampedArray {
  const p = new Paper(CAMPFIRE.w, CAMPFIRE.h);
  const X = 64, Y = CAMPFIRE.h - 30;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    ellipse(p, X + Math.cos(a) * 30, Y + Math.sin(a) * 13, 9, 7, k % 2 ? E.Gravel : E.RockDark);
  }
  ellipse(p, X, Y, 22, 9, E.Char);
  limb(p, [X - 22, Y + 4], [X + 18, Y - 6], 5, 4, E.Wood);
  limb(p, [X + 22, Y + 5], [X - 16, Y - 6], 5, 4, E.Wood);
  for (let k = 0; k < 8; k++) p.on(X - 14 + noise(k, 2, 643) * 28, Y - 2 + noise(2, k, 644) * 6, E.Ember, 4);
  return p.render(true);
}

export const TALL = { w: 128, h: 200 } as const;
export const TALL_DECOR = ["sage", "thorn", "agave", "snag", "rocks", "totem", "flag"] as const;
export type TallDecor = (typeof TALL_DECOR)[number];

/** Enfeite de pé (não bloqueia): artemísia, arbusto de espinho, agave, galho seco, monte de pedras, totem de crânio, bandeira. */
export function tallDecor(kind: TallDecor, v: number): Uint8ClampedArray {
  const p = new Paper(TALL.w, TALL.h);
  const X = 64, Bt = TALL.h - 8;
  switch (kind) {
    case "sage":
      for (let k = 0; k < 9; k++) {
        const cx = X - 26 + noise(k, v, 650) * 52, cy = Bt - 14 - noise(v, k, 651) * 22, r = 10 + noise(k, k, 652) * 6;
        p.fill(ebox(cx, cy, r, r * 0.8), (x, y) => inEllipse(cx, cy, r, r * 0.8)(x, y) && noise(x >> 1, y >> 1, 653) < 0.85, E.Sage, sphere(cx - 3, cy - 4, r, r * 0.8));
      }
      for (let k = 0; k < 4; k++) limb(p, [X - 8 + k * 5, Bt], [X - 14 + k * 9, Bt - 14], 2, 1.4, E.Thorn);
      break;
    case "thorn":
      for (let k = 0; k < 11; k++) {
        const a = -Math.PI * (0.1 + 0.8 * (k / 10)), len = 30 + noise(k, v, 654) * 26;
        const e: Pt = [X + Math.cos(a) * len, Bt + Math.sin(a) * len * 0.9];
        limb(p, [X, Bt], e, 2.2, 1.1, E.Thorn);
        if (k % 3 === 0) { p.on(e[0], e[1], E.Flower, 4); p.on(e[0] + 1, e[1], E.Flower, 3); }
      }
      break;
    case "agave":
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI * (0.08 + 0.84 * (k / 8)), len = 36 + noise(k, v, 655) * 20;
        const tip: Pt = [X + Math.cos(a) * len, Bt - 4 + Math.sin(a) * len];
        poly(p, [[X - 5, Bt - 2], tip, [X + 5, Bt - 2]], E.Sage, (x) => (x < X ? HI : MID));
      }
      if (v % 2) { limb(p, [X, Bt - 10], [X + 4, Bt - 130], 3, 2, E.Thorn); for (let k = 0; k < 4; k++) ellipse(p, X + 4 + (k % 2 ? 8 : -8), Bt - 100 - k * 8, 5, 3, E.Flower); }
      break;
    case "snag": {
      limb(p, [X, Bt], [X + 6, Bt - 90], 6, 3, E.Thorn);
      limb(p, [X + 3, Bt - 50], [X - 26, Bt - 84], 3, 1.5, E.Thorn);
      limb(p, [X + 5, Bt - 70], [X + 30, Bt - 104], 3, 1.5, E.Thorn);
      break;
    }
    case "rocks":
      for (const [dx, dy, r] of [[-18, 0, 14], [12, 2, 12], [-2, -14, 11], [24, -6, 8]] as const)
        ellipse(p, X + dx, Bt - 10 + dy, r * 1.2, r, E.Rock, (x, y) => (sn(x, y, 8, 656) > 0.7 ? 1 : 0));
      break;
    case "totem":
      limb(p, [X, Bt], [X, Bt - 120], 4, 3.5, E.Wood);
      limb(p, [X - 14, Bt - 96], [X + 14, Bt - 96], 2.5, 2.5, E.Wood);
      p.together(() => { ellipse(p, X, Bt - 128, 12, 11, E.Bone); limb(p, [X - 10, Bt - 134], [X - 26, Bt - 148], 3.5, 1.2, E.Bone); limb(p, [X + 10, Bt - 134], [X + 26, Bt - 148], 3.5, 1.2, E.Bone); });
      ellipse(p, X - 4, Bt - 128, 3, 3.5, E.Line); ellipse(p, X + 4, Bt - 128, 3, 3.5, E.Line);
      for (const s2 of [-1, 1]) for (let y = 0; y < 22; y++) p.px(X + s2 * 14, Bt - 96 + y, y % 7 === 6 ? E.Bone : E.Rope, 3);
      break;
    case "flag":
      limb(p, [X, Bt], [X + 2, Bt - 150], 3, 2.5, E.Wood);
      poly(p, [[X + 3, Bt - 148], [X + 46, Bt - 140], [X + 38, Bt - 126], [X + 48, Bt - 112], [X + 3, Bt - 116]], E.Cloth, (x, y) => (Math.floor(x / 8) % 2 ? HI : MID));
      break;
  }
  return p.render(true);
}

export const FLAT_DECOR = ["bones", "skull", "pebbles", "rust", "wheel", "pick"] as const;
export type FlatDecor = (typeof FLAT_DECOR)[number];

/** Enfeite deitado no chão (transparente fora dele). */
export function flatDecor(kind: FlatDecor, v: number): Uint8ClampedArray {
  const p = new Paper();
  const cx = 64 + (noise(v, 1, 660) - 0.5) * 30, cy = 64 + (noise(1, v, 661) - 0.5) * 30;
  switch (kind) {
    case "bones":
      for (let k = 0; k < 3; k++) {
        const a = noise(k, v, 662) * Math.PI, l = 13 + noise(v, k, 663) * 8, ox = cx + (k - 1) * 12, oy = cy + (noise(k, 2, 664) - 0.5) * 14;
        limb(p, [ox - Math.cos(a) * l, oy - Math.sin(a) * l * 0.6], [ox + Math.cos(a) * l, oy + Math.sin(a) * l * 0.6], 2.6, 2.6, E.Bone);
        ellipse(p, ox - Math.cos(a) * l, oy - Math.sin(a) * l * 0.6, 4, 3.4, E.Bone);
        ellipse(p, ox + Math.cos(a) * l, oy + Math.sin(a) * l * 0.6, 4, 3.4, E.Bone);
      }
      break;
    case "skull":
      p.together(() => {
        ellipse(p, cx, cy, 12, 10, E.Bone);
        p.fill([cx - 6, cy + 4, cx + 6, cy + 16], () => true, E.Bone, () => MID);
        limb(p, [cx - 10, cy - 5], [cx - 28, cy - 2], 4, 1.4, E.Bone);
        limb(p, [cx + 10, cy - 5], [cx + 28, cy - 2], 4, 1.4, E.Bone);
      });
      ellipse(p, cx - 5, cy - 1, 3.2, 3.6, E.Line); ellipse(p, cx + 5, cy - 1, 3.2, 3.6, E.Line);
      break;
    case "pebbles":
      for (let k = 0; k < 8; k++) ellipse(p, cx + (noise(k, v, 665) - 0.5) * 50, cy + (noise(v, k, 666) - 0.5) * 34, 3 + noise(k, k, 667) * 3, 2.4 + noise(k, k, 667) * 2, k % 3 ? E.Gravel : E.Rock);
      break;
    case "rust": {
      // Fonte de ferrugem: poça laranja com a borda de crosta.
      const rx = 22 + noise(v, 3, 668) * 8, ry = 12 + noise(3, v, 669) * 4;
      p.fill(ebox(cx, cy, rx + 4, ry + 4), (x, y) => ((x - cx) / (rx + 4)) ** 2 + ((y - cy) / (ry + 4)) ** 2 <= 1 + (sn(x, y, 8, 670) - 0.5) * 0.4, E.Rust, () => LO);
      p.fill(ebox(cx, cy, rx, ry), (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (sn(x, y, 8, 671) - 0.5) * 0.4, E.Rust, (x, y) => (y < cy - ry * 0.3 ? HI : MID));
      for (let x = cx - rx * 0.5; x < cx + rx * 0.2; x++) p.on(x, cy - ry * 0.35, E.Flame, 2);
      break;
    }
    case "wheel":
      for (let a = 0; a < Math.PI * 2; a += 0.04) { p.px(cx + Math.cos(a) * 16, cy + Math.sin(a) * 9, E.Wood, 3); p.px(cx + Math.cos(a) * 14, cy + Math.sin(a) * 8, E.Wood, 2); }
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; line(p, [cx, cy], [cx + Math.cos(a) * 14, cy + Math.sin(a) * 8], E.Wood, 3, false); }
      ellipse(p, cx, cy, 3, 2, E.Iron);
      break;
    case "pick":
      limb(p, [cx - 20, cy + 10], [cx + 14, cy - 6], 2.4, 2.4, E.Wood);
      limb(p, [cx + 4, cy - 16], [cx + 24, cy + 4], 3, 1.4, E.Iron);
      break;
  }
  return p.render(true);
}

export const draw = { groundTile, patchTile, trackTile, railTile, rockTile, chasmTile, bridgeTile, hoodoo, rib, giantSkull, adobeWall, mineMouth, oreCart, campfire, tallDecor, flatDecor };
