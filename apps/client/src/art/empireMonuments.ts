import { E, FLAT, HD, ellipse, hash01, limb, line, lit, noise, paper, poly, sn, worley, type Pt } from "./empireArt.ts";
import type { Paper } from "./duneArt.ts";

/**
 * Monumentos e objetos de pé dos Portões do Império (sprites com contorno, a base no pé do quadro, ordenados pela linha
 * de baixo como os personagens): muros com volume (tampo de alvenaria, face de blocos de tufo com fiadas de tijolo, hera,
 * restos de afresco, buracos de andaime), a muralha com ameias, as torres e o arco do portão com a inscrição, colunas
 * (jônica, coríntia, quebrada e toco), blocos caídos, os guardiões de bronze e o imperador da fonte, mausoléus,
 * ciprestes e pinheiros-mansos, a fachada do templo afundado com a escadaria, braseiros e chamas, e embaixo os pilares,
 * sarcófagos, entulho e o mosaico do santuário.
 */

type Box = readonly [number, number, number, number];
const mod = (v: number, n: number) => ((v % n) + n) % n;

/** Retângulo com luz própria (`shade` fixo ou função) e desvio de tom. */
function box(p: Paper, b: Box, mat: number, shade: number | ((x: number, y: number) => number), offset?: (x: number, y: number) => number) {
  return p.fill(b, () => true, mat, typeof shade === "number" ? () => shade : shade, offset);
}

/** Linha horizontal de tom fixo por cima do que já está pintado. */
function hline(p: Paper, x0: number, x1: number, y: number, mat: number | null, tone: number) {
  for (let x = Math.ceil(x0); x <= x1; x++) p.on(x, y, mat, tone);
}
function vline(p: Paper, x: number, y0: number, y1: number, mat: number | null, tone: number) {
  for (let y = Math.ceil(y0); y <= y1; y++) p.on(x, y, mat, tone);
}

/**
 * Face de alvenaria romana na caixa: blocos de tufo em fiadas de 16 px desencontradas (cada bloco com o seu tom e
 * bisel) e, com `bricks`, uma faixa de 3 fiadas de tijolo a cada 3 de blocos; buracos de andaime numa fiada.
 */
function masonry(p: Paper, b: Box, seed: number, opts: { bricks?: boolean; shade?: number; dark?: number; mat?: number; bw?: number; bh?: number } = {}) {
  const BW = opts.bw ?? 32, BH = opts.bh ?? 16;
  const [x0, y0, x1, y1] = b;
  const base = opts.shade ?? 0.52;
  const pattern = (x: number, y: number) => {
    const ry = y1 - y; // as fiadas contam do pé, para casar entre tiles vizinhos
    const cycle = opts.bricks ? 66 : 1e9;
    const inCycle = mod(ry, cycle);
    if (opts.bricks && inCycle >= 48) {
      const row = Math.floor((inCycle - 48) / 6);
      const lx = mod(x + (row % 2) * 7 + seed, 14);
      return { mat: E.Brick, joint: mod(inCycle - 48, 6) === 0 || lx === 0, id: row * 31 + Math.floor((x + seed) / 14), ly: mod(inCycle - 48, 6), lx, h: 6, w: 14 };
    }
    const row = Math.floor(ry / BH);
    const lx = mod(x + (row % 2) * (BW / 2) + seed * 5, BW);
    return { mat: opts.mat ?? E.Tuff, joint: mod(ry, BH) === BH - 1 || lx === 0, id: row * 17 + Math.floor((x + (row % 2) * (BW / 2) + seed * 5) / BW), ly: BH - 1 - mod(ry, BH), lx, h: BH, w: BW };
  };
  // Uma passada só: pinta a caixa e depois acerta material, luz e juntas pixel a pixel (pelo padrão das fiadas).
  const id = p.fill(b, () => true, opts.mat ?? E.Tuff, () => base, () => 0);
  const mat0 = opts.mat ?? E.Tuff;
  const span = Math.max(1, y1 - y0);
  for (let y = Math.max(0, Math.ceil(y0)); y <= Math.min(p.h - 1, y1); y++)
    for (let x = Math.max(0, Math.ceil(x0)); x <= Math.min(p.w - 1, x1); x++) {
      const i = y * p.w + x;
      if (p.part[i] !== id) continue;
      const c = pattern(x, y);
      let sh = base - ((y - y0) / span) * (opts.dark ?? 0.1) + (hash01(c.id + seed * 101, 500) - 0.5) * 0.14;
      if (c.ly <= 1 || c.lx <= 1) sh += 0.09;
      if (c.ly >= c.h - 2 || c.lx >= c.w - 2) sh -= 0.08;
      p.shade[i] = sh;
      p.off[i] = c.joint ? -2 : noise(x, y, 501 + seed) < 0.05 ? -1 : 0;
      if (c.mat !== mat0) p.mat[i] = c.mat;
    }
  return id;
}

/**
 * Topo de alvenaria: o núcleo de pedras irregulares assentadas na argamassa (cada pedra abaulada, com o seu tom),
 * musgo tomando parte do topo e tufos de capim brotando nas juntas.
 */
function rubbleTop(p: Paper, b: Box, seed: number, test: (x: number, y: number) => boolean = () => true) {
  const id = p.fill(b, test, E.Mortar, () => FLAT, () => 0);
  for (let y = Math.max(0, Math.ceil(b[1])); y <= Math.min(p.h - 1, b[3]); y++)
    for (let x = Math.max(0, Math.ceil(b[0])); x <= Math.min(p.w - 1, b[2]); x++) {
      const i = y * p.w + x;
      if (p.part[i] !== id) continue;
      const c = worley(x, y, 13, HD, 515 + (seed % 5));
      const gap = c.d2 - c.d1;
      if (gap < 2.2) { p.mat[i] = E.Mortar; p.shade[i] = 0.42; continue; }
      const r = 7;
      const nx = Math.max(-1, Math.min(1, c.dx / r)), ny = Math.max(-1, Math.min(1, c.dy / r));
      p.mat[i] = hash01(c.id + seed, 516) < 0.3 ? E.Travertine : E.Tuff;
      p.shade[i] = lit(nx * 0.6, ny * 0.6, 1) + (hash01(c.id, 517) - 0.5) * 0.12;
      if (sn(x, y, 32, 513 + seed) > 0.6 - (gap < 4 ? 0.1 : 0)) { p.mat[i] = E.Moss; p.off[i] = noise(x, y, 514) < 0.3 ? 1 : 0; }
    }
  for (let k = 0; k < 12; k++) {
    const x = b[0] + 4 + noise(k, seed, 518) * (b[2] - b[0] - 8), y = b[1] + 6 + noise(seed, k, 519) * (b[3] - b[1] - 8);
    if (!p.has(x, y)) continue;
    for (let t = -2; t <= 2; t++) for (let s2 = 0; s2 < 5 - Math.abs(t); s2++) p.on(x + t + (s2 > 2 ? Math.sign(t) : 0), y - s2, E.Grass, s2 === 0 ? 1 : s2 > 2 ? 4 : 3);
  }
}

/** Hera caindo de uma linha (y) entre x0 e x1: cortina de folhas que desce até `len` px, mais comprida em alguns trechos. */
function ivy(p: Paper, x0: number, x1: number, y: number, len: number, seed: number) {
  for (let x = Math.ceil(x0); x <= x1; x++) {
    const reach = len * Math.max(0, sn(x, 0, 32, 520 + seed) * 1.6 - 0.45) + (noise(x >> 2, seed, 521) - 0.5) * 6;
    for (let d = 0; d < reach; d++) {
      if (!p.has(x, y + d)) continue;
      const leaf = noise(x >> 1, (y + d) >> 1, 522 + seed);
      if (leaf < 0.62 || d < reach * 0.4) p.on(x, y + d, E.Ivy, leaf < 0.12 ? 4 : leaf < 0.35 ? 3 : leaf < 0.55 ? 2 : 1);
    }
  }
}

// --- Muros (da cidade e da muralha) ------------------------------------------------------

/** Altura máxima do muro acima do tile (px). */
export const WALL_RISE = 144;
export const WALL_SPRITE = { w: HD, h: HD + WALL_RISE } as const;
/** Alturas dos muros dos bairros e da muralha (px acima do chão). */
export const WALL_HEIGHTS = [56, 82] as const;
export const CITY_HEIGHTS = [120] as const;
export const WALL_LINK = { n: 1, e: 2, s: 4, w: 8 } as const;

/**
 * Trecho de muro de 1 tile pelos vizinhos que também são muro (`WALL_LINK`), na altura `h`. O muro tem o tampo (núcleo
 * de alvenaria com musgo) e, sem muro ao sul, a face de blocos da altura toda; com muro mais baixo ao sul, só o degrau
 * (`stepS`). A ponta solta desmorona (blocos faltando). `city`: a muralha, com fiadas de tijolo, ameias e seteiras.
 */
export function wallSprite(links: number, h: number, stepS: number, v: number, city: boolean): Uint8ClampedArray {
  const p = paper(WALL_SPRITE.w, WALL_SPRITE.h);
  const R = WALL_RISE;
  const L = WALL_LINK;
  const m = city ? 0 : 20;
  const x0 = links & L.w ? 0 : m + 4 + Math.floor(noise(v, 1, 530) * 6);
  const x1 = links & L.e ? HD - 1 : HD - 1 - m - 4 - Math.floor(noise(v, 2, 531) * 6);
  const y0 = links & L.n ? 0 : city ? 0 : 30;
  const y1 = links & L.s ? HD - 1 : city ? HD - 1 : HD - 26;
  const capTop = R + y0 - h, capBottom = R + y1 - h;
  // Ponta solta: os blocos de cima caíram (a borda do tampo e da face fica em degraus).
  const crumble = (x: number, y: number) => {
    const fromW = links & L.w ? 1e9 : x - x0, fromE = links & L.e ? 1e9 : x1 - x;
    const edge = Math.min(fromW, fromE);
    if (edge > 26) return false;
    const drop = (26 - edge) * 1.6 + noise(Math.floor(x / 8), v, 532) * 18;
    return y < capTop + drop && noise(x >> 3, y >> 3, 533 + v) < 0.9;
  };
  const faceTop = links & L.s ? capBottom + 1 : capBottom + 1;
  const faceH = links & L.s ? stepS : h;
  // Face (sul): blocos de tufo; a muralha com fiadas de tijolo.
  if (faceH > 0) {
    masonry(p, [x0, faceTop, x1, faceTop + faceH - 1], v + (city ? 9 : 0), { bricks: city || v === 1, shade: 0.5, dark: 0.12 });
    // Pé do muro: terra e musgo subindo, mais escuro.
    for (let y = faceTop + faceH - 8; y < faceTop + faceH; y++)
      for (let x = x0; x <= x1; x++) {
        if (!p.has(x, y)) continue;
        if (noise(x >> 1, y, 534 + v) < 0.5) p.on(x, y, E.Moss, noise(x, y, 535) < 0.5 ? 1 : 2);
      }
    // Buracos de andaime (putlog) numa fiada.
    if (faceH > 40) for (let x = x0 + 18 + v * 9; x < x1 - 8; x += 44) box(p, [x, faceTop + 22, x + 4, faceTop + 26], E.Void, 0.2);
    // Restos de afresco num muro de casa: painel vermelho-pompeiano com a moldura ocre e o filete preto, descascado.
    if (!city && v === 2 && faceH > 40) {
      const fx0 = x0 + 12, fx1 = Math.min(x1 - 12, fx0 + 64), fy0 = faceTop + 8, fy1 = faceTop + faceH - 14;
      for (let y = fy0; y <= fy1; y++)
        for (let x = fx0; x <= fx1; x++) {
          if (sn(x, y, 16, 537) < 0.32 || noise(x >> 1, y >> 1, 536) < 0.08) continue;
          const edge = Math.min(y - fy0, fy1 - y, x - fx0, fx1 - x);
          p.on(x, y, edge < 3 ? E.Gold : edge === 5 ? E.Line : E.Plaster, edge < 3 ? 2 : edge === 5 ? 1 : (noise(x, y, 538) < 0.12 ? 2 : 3));
        }
    }
    // Rachadura descendo.
    if (v !== 1) {
      let cx = x0 + 20 + noise(v, 7, 539) * Math.max(1, x1 - x0 - 40);
      for (let y = faceTop + 2; y < faceTop + faceH - 6; y++) {
        if (noise(y >> 2, v, 540) < 0.4) cx += noise(y, v, 541) < 0.5 ? -1 : 1;
        p.on(cx, y, E.Void, 1);
        p.on(cx + 1, y, null, 4);
      }
    }
    // Quina de cima da face pega luz; seteiras na muralha.
    hline(p, x0, x1, faceTop, null, 5);
    if (city && faceH > 60) for (let x = x0 + 30 + v * 12; x < x1 - 10; x += 64) box(p, [x, faceTop + 30, x + 5, faceTop + 58], E.Void, 0.15);
  }
  // Tampo.
  rubbleTop(p, [x0, capTop, x1, capBottom], v + (city ? 20 : 0));
  // Beira do tampo: luz no norte e no oeste, sombra no leste.
  for (let x = x0; x <= x1; x++) if (!(links & L.n)) { p.on(x, capTop, E.Tuff, 5); p.on(x, capTop + 1, E.Tuff, 4); }
  for (let y = capTop; y <= capBottom; y++) {
    if (!(links & L.w)) { p.on(x0, y, E.Tuff, 5); p.on(x0 + 1, y, E.Tuff, 4); }
    if (!(links & L.e)) { p.on(x1, y, E.Tuff, 1); p.on(x1 - 1, y, E.Tuff, 2); }
  }
  // Ameias da muralha na beira sul do tampo (algumas caídas).
  if (city && !(links & L.s)) {
    for (let x = x0 + 4; x < x1 - 14; x += 34) {
      if (noise(x, v, 542) < 0.3) continue;
      const mx0 = x, mx1 = x + 20, mt = capBottom - 18;
      masonry(p, [mx0, mt + 6, mx1, capBottom], v + x, { shade: 0.55, dark: 0.05 });
      box(p, [mx0, mt, mx1, mt + 6], E.Tuff, FLAT + 0.1);
      hline(p, mx0, mx1, mt, E.Tuff, 5);
    }
  }
  // Ponta desmoronada: apaga os blocos caídos (o contorno contorna o que sobrou).
  if ((links & (L.w | L.e)) !== (L.w | L.e))
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) if (p.has(x, y) && crumble(x, y)) p.mat[y * p.w + x] = -1;
  // Hera caindo do tampo pela face.
  if (faceH > 30 && (v === 0 || city)) ivy(p, x0, x1, faceTop, faceH * 0.8, v + (city ? 3 : 0));
  return p.render(true);
}

// --- Torres e arco do portão -------------------------------------------------------------

export const TOWER = { w: 3 * HD, h: 4 * HD + 480 } as const;

/**
 * Torre do portão (3×4 tiles): o bloco de tufo com fiadas de tijolo bem mais alto que a muralha, o tampo com ameias,
 * seteiras, uma faixa de cornija e o estandarte do império rasgado (vermelho, com a águia dourada). `side` -1: a do
 * oeste (o estandarte vai do lado do portão), 1: a do leste.
 */
export function towerSprite(side: -1 | 1): Uint8ClampedArray {
  const p = paper(TOWER.w, TOWER.h);
  const H = 440;
  const x0 = 4, x1 = TOWER.w - 5;
  const foot = TOWER.h - 4;
  const capTop = foot - 4 * HD - H + 18, capBottom = foot - H;
  // Face sul, a altura toda, com uma cornija no meio e a base em talude.
  masonry(p, [x0, capBottom + 1, x1, foot], side < 0 ? 3 : 4, { bricks: true, shade: 0.52, dark: 0.14 });
  box(p, [x0 - 2, capBottom + 96, x1 + 2, capBottom + 104], E.Travertine, 0.62);
  hline(p, x0 - 2, x1 + 2, capBottom + 96, E.Travertine, 5);
  hline(p, x0 - 2, x1 + 2, capBottom + 104, E.Travertine, 1);
  for (let x = x0; x <= x1; x += 12) box(p, [x, capBottom + 105, x + 6, capBottom + 108], E.Travertine, 0.4);
  // Seteiras e uma janela arqueada no alto.
  for (const sx of [70, TOWER.w - 76]) box(p, [sx, capBottom + 130, sx + 6, capBottom + 176], E.Void, 0.12);
  const wx = TOWER.w / 2;
  p.fill([wx - 22, capBottom + 26, wx + 22, capBottom + 84], (x, y) => y > capBottom + 48 || Math.hypot(x - wx, y - (capBottom + 48)) < 22, E.Void, () => 0.12);
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.04) p.on(wx + Math.cos(a) * 24, capBottom + 48 + Math.sin(a) * 24, E.Travertine, 4);
  // Tampo: o piso de lajes do alto da torre, com entulho e capim, cercado pelo parapeito de ameias nos 4 lados.
  p.fill([x0, capTop, x1, capBottom], () => true, E.Travertine, (x, y) => {
    const lx = mod(x - x0, 48), ly = mod(y - capTop, 40);
    return FLAT - 0.04 + (hash01(Math.floor((x - x0) / 48) * 7 + Math.floor((y - capTop) / 40) * 13, 557) - 0.5) * 0.12 + (lx < 2 || ly < 2 ? -0.2 : 0);
  }, (x, y) => (noise(x, y, 558) < 0.04 ? -1 : 0));
  for (let y = capTop; y <= capBottom; y++)
    for (let x = x0; x <= x1; x++) if (sn(x, y, 16, 559 + side) + (noise(x, y, 564) - 0.5) * 0.1 > 0.72) p.on(x, y, E.Moss, noise(x, y, 560) < 0.4 ? 2 : 3);
  for (let k = 0; k < 6; k++) ellipse(p, x0 + 40 + noise(k, side, 561) * (x1 - x0 - 80), capTop + 60 + noise(side, k, 562) * (capBottom - capTop - 120), 12, 8, E.Tuff);
  const PAR = 22;
  for (const [a, b] of [[[x0, capTop], [x1, capTop + PAR]], [[x0, capTop], [x0 + PAR, capBottom]], [[x1 - PAR, capTop], [x1, capBottom]]] as const)
    rubbleTop(p, [a[0], a[1], b[0], b[1]], 40 + side + a[0]);
  for (let x = x0; x <= x1; x += 34) {
    if (noise(x, side, 563) < 0.25) continue;
    box(p, [x, capTop - 14, x + 20, capTop + 6], E.Tuff, FLAT + 0.08);
    hline(p, x, x + 20, capTop - 14, E.Tuff, 5);
  }
  hline(p, x0, x1, capTop, E.Tuff, 5);
  for (let y = capTop; y <= capBottom; y++) { p.on(x0, y, E.Tuff, 5); p.on(x1, y, E.Tuff, 1); }
  for (let x = x0 + 4; x < x1 - 20; x += 40) {
    if (noise(x, side, 550) < 0.2) continue;
    const mt = capBottom - 26;
    masonry(p, [x, mt + 8, x + 26, capBottom + 4], x, { shade: 0.56, dark: 0.04 });
    box(p, [x, mt, x + 26, mt + 8], E.Tuff, FLAT + 0.1);
    hline(p, x, x + 26, mt, E.Tuff, 5);
  }
  // Talude no pé.
  for (let y = foot - 26; y <= foot; y++) for (let x = x0; x <= x1; x++) if (p.has(x, y)) p.nudge(x, y, y === foot - 26 ? 1 : -1);
  hline(p, x0, x1, foot - 26, E.Tuff, 5);
  // Estandarte rasgado preso na cornija.
  const bx = side < 0 ? x1 - 110 : x0 + 40;
  const bTop = capBottom + 108, bBottom = capBottom + 250;
  p.fill([bx, bTop, bx + 70, bBottom], (x, y) => {
    const tear = y > bBottom - 30 - noise(Math.floor((x - bx) / 7), side, 551) * 40;
    return !tear && noise((x - bx) >> 2, (y - bTop) >> 3, 552 + side) > 0.06;
  }, E.Cloth, (x, y) => 0.55 + Math.sin((x - bx) / 9) * 0.12 - ((y - bTop) / 150) * 0.1);
  hline(p, bx - 4, bx + 74, bTop, E.Gold, 4);
  limb(p, [bx - 6, bTop], [bx + 76, bTop], 2.5, 2.5, E.Bark);
  // Águia dourada: corpo, asas abertas e a coroa de louros.
  const ex = bx + 35, ey = bTop + 52;
  poly(p, [[ex - 26, ey - 10], [ex - 6, ey - 2], [ex - 4, ey + 6], [ex - 20, ey + 2]], E.Gold, () => 0.62);
  poly(p, [[ex + 26, ey - 10], [ex + 6, ey - 2], [ex + 4, ey + 6], [ex + 20, ey + 2]], E.Gold, () => 0.5);
  ellipse(p, ex, ey + 2, 6, 10, E.Gold);
  ellipse(p, ex, ey - 10, 4, 4, E.Gold);
  for (let a = 0.3; a < Math.PI - 0.3; a += 0.12) p.on(ex + Math.cos(a) * 16, ey + 22 - Math.sin(a) * 6, E.Gold, 3);
  // Hera subindo do pé.
  for (let x = x0; x <= x1; x++) {
    const reach = 120 * Math.max(0, sn(x, 0, 32, 553 + side) * 1.5 - 0.6);
    for (let d = 0; d < reach; d++) {
      const y = foot - d;
      if (p.has(x, y) && noise(x >> 1, y >> 1, 554) < 0.6) p.on(x, y, E.Ivy, noise(x, y, 555) < 0.2 ? 4 : noise(x, y, 556) < 0.5 ? 2 : 3);
    }
  }
  return p.render(true);
}

/** Pixels das letras da inscrição (3×5). */
const GLYPHS: Record<string, string[]> = {
  I: ["111", "010", "010", "010", "111"], M: ["101", "111", "111", "101", "101"], P: ["110", "101", "110", "100", "100"],
  E: ["111", "100", "110", "100", "111"], R: ["110", "101", "110", "101", "101"], V: ["101", "101", "101", "101", "010"],
  K: ["101", "110", "100", "110", "101"], S: ["011", "100", "010", "001", "110"], A: ["010", "101", "111", "101", "101"],
  D: ["110", "101", "101", "101", "110"], "·": ["000", "000", "010", "000", "000"], " ": ["000", "000", "000", "000", "000"],
};

/** Escreve em letras de bronze dourado (cada pixel da letra vira `scale` px), centrado em cx. */
function inscribe(p: Paper, text: string, cx: number, y: number, scale: number, mat = E.Gold) {
  const width = text.length * 4 * scale - scale;
  let x = Math.round(cx - width / 2);
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    g.forEach((row, gy) => {
      for (let gx = 0; gx < 3; gx++) {
        if (row[gx] !== "1") continue;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const top = dy === 0 || dx === 0;
            p.on(x + gx * scale + dx, y + gy * scale + dy, mat, top ? 4 : 3);
            p.on(x + gx * scale + dx + 1, y + gy * scale + dy + 1, null, 1);
          }
      }
    });
    x += 4 * scale;
  }
}

/** Arco do portão: largura do vão mais um tile de cada lado (por cima das torres). */
export const ARCH = { w: 7 * HD, h: 2 * HD + 560 } as const;

/**
 * Arco triunfal sobre o portão, com volume: os tímpanos de tufo com a fiada de tijolo, a arquivolta de aduelas de
 * travertino com a pedra-chave esculpida, a abóbada em sombra por baixo, as Vitórias aladas, o ático de mármore com
 * IMPERIVM · KVSA em letras de bronze e, por cima, a passagem da muralha (2 tiles de fundo) com as ameias. Do lado
 * leste o ático quebrou e uma aduela ficou pendurada. O vão fica alto: os heróis passam por baixo.
 */
export function archSprite(): Uint8ClampedArray {
  const p = paper(ARCH.w, ARCH.h);
  const foot = ARCH.h - 4;
  const cx = ARCH.w / 2;
  const rIn = 2.5 * HD - 4, ry = 120, band = 44;
  const spring = foot - 236;
  const eTop = foot - 424;
  const attic = eTop - 104;
  const walk = attic - 2 * HD + 40;
  const L = HD - 8, R = ARCH.w - HD + 8;
  const breakX = cx + 210;
  const broken = (x: number, y: number) => x > breakX + (y - walk) * 0.45 + noise(Math.floor(y / 10), 1, 560) * 30 && y < spring - 40;
  const intra = (x: number) => spring - Math.sqrt(Math.max(0, 1 - ((x - cx) / rIn) ** 2)) * ry;
  const extra = (x: number) => spring - Math.sqrt(Math.max(0, 1 - ((x - cx) / (rIn + band)) ** 2)) * (ry + band);
  const inVoid = (x: number, y: number) => Math.abs(x - cx) < rIn && y > intra(x);

  // Passagem por cima do arco: o tampo de alvenaria (2 tiles de fundo) e as ameias na beira de trás.
  p.fill([L, walk, R, attic], () => true, E.Travertine, (x, y) => {
    const lx = mod(x - L, 52), ly = mod(y - walk, 36);
    return FLAT - 0.06 + (hash01(Math.floor((x - L) / 52) * 7 + Math.floor((y - walk) / 36) * 13, 568) - 0.5) * 0.12 + (lx < 2 || ly < 2 ? -0.22 : 0);
  }, (x, y) => (noise(x, y, 569) < 0.04 ? -1 : 0));
  for (let y = walk; y < attic; y++) for (let x = L; x <= R; x++) if (sn(x, y, 16, 570) + (noise(x, y, 571) - 0.5) * 0.1 > 0.7) p.on(x, y, E.Moss, noise(x, y, 572) < 0.4 ? 2 : 3);
  rubbleTop(p, [L, attic - 26, R, attic], 90);
  hline(p, L, R, walk, E.Tuff, 5);
  for (let x = L + 6; x < R - 20; x += 36) {
    box(p, [x, walk - 16, x + 22, walk + 8], E.Tuff, 0.55);
    box(p, [x, walk - 22, x + 22, walk - 16], E.Tuff, FLAT + 0.1);
    hline(p, x, x + 22, walk - 22, E.Tuff, 5);
  }
  // Tímpanos: alvenaria de tufo com a faixa de tijolo, o vão recortado.
  const body = masonry(p, [L - 26, eTop, R + 26, foot], 91, { bricks: true, shade: 0.52, dark: 0.14 });
  for (let y = eTop; y <= foot; y++)
    for (let x = L - 26; x <= R + 26; x++) {
      const i = y * p.w + x;
      if (p.part[i] !== body) continue;
      if (inVoid(x, y) || (y > spring + 6 && Math.abs(x - cx) < rIn)) p.mat[i] = -1;
    }
  // Abóbada em sombra (o fundo do arco, visto por baixo da beira).
  p.fill([cx - rIn, intra(cx), cx + rIn, spring + 6], (x, y) => inVoid(x, y) && y < intra(x) + 46, E.Tuff, (x, y) => 0.22 + (1 - (y - intra(x)) / 46) * 0.08, (x, y) => {
    const a = Math.atan2(spring - y, x - cx);
    const k = a / (Math.PI / 17);
    return Math.abs(k - Math.round(k)) < 0.06 || mod(Math.round(y - intra(x)), 14) === 0 ? -1 : 0;
  });
  // Aduelas da arquivolta (juntas em raio), mais claras que o tímpano.
  p.fill([cx - rIn - band, extra(cx), cx + rIn + band, spring + 4], (x, y) => !inVoid(x, y) && y >= extra(x) && y <= spring + 4 && Math.abs(x - cx) <= rIn + band,
    E.Travertine, (x, y) => {
      const a = Math.atan2((spring - y) / (ry + band / 2), (x - cx) / (rIn + band / 2));
      const k = Math.round(a / (Math.PI / 17));
      return 0.6 + (k % 2 ? 0.04 : -0.02) - Math.max(0, (y - (extra(x) + band * 0.6)) / band) * 0.12;
    }, (x, y) => {
      const a = Math.atan2((spring - y) / (ry + band / 2), (x - cx) / (rIn + band / 2));
      const k = a / (Math.PI / 17);
      return Math.abs(k - Math.round(k)) < 0.05 ? -2 : noise(x, y, 567) < 0.04 ? -1 : 0;
    });
  for (let x = Math.ceil(cx - rIn - band); x <= cx + rIn + band; x++) { const y = Math.round(extra(x)); if (p.has(x, y)) { p.on(x, y, null, 5); p.on(x, y + 1, null, 4); } }
  for (let x = Math.ceil(cx - rIn); x <= cx + rIn; x++) { const y = Math.round(intra(x)); p.on(x, y - 1, E.Travertine, 1); }
  // Pedra-chave com a cabeça de leão.
  const ky = Math.round(extra(cx));
  poly(p, [[cx - 22, ky - 8], [cx + 22, ky - 8], [cx + 14, ky + 52], [cx - 14, ky + 52]], E.Marble, () => 0.64);
  p.together(() => { ellipse(p, cx, ky + 20, 12, 13, E.Marble); ellipse(p, cx, ky + 28, 7, 6, E.Marble); });
  for (let a = 0; a < Math.PI * 2; a += 0.3) p.on(cx + Math.cos(a) * 12, ky + 20 + Math.sin(a) * 13, E.Vein, 2);
  p.on(cx - 4, ky + 17, E.Void, 1); p.on(cx + 4, ky + 17, E.Void, 1); hline(p, cx - 3, cx + 3, ky + 30, E.Void, 1);
  // Impostas onde o arco nasce.
  for (const dir of [-1, 1]) {
    const px = cx + dir * (rIn + band / 2);
    box(p, [px - 30, spring - 8, px + 30, spring + 6], E.Marble, FLAT + 0.04);
    hline(p, px - 30, px + 30, spring - 8, E.Marble, 5);
    hline(p, px - 30, px + 30, spring + 6, E.Marble, 1);
  }
  // Vitórias aladas nos tímpanos (relevo de mármore), cada uma estendendo a coroa de louros para a chave.
  for (const dir of [-1, 1]) {
    const vx = cx + dir * 236, vy = spring - 92;
    if (broken(vx, vy)) continue;
    p.together(() => {
      poly(p, [[vx - 10, vy + 30], [vx + 10, vy + 30], [vx + 6, vy - 6], [vx - 6, vy - 6]], E.Marble, () => 0.6);
      ellipse(p, vx, vy - 12, 6, 7, E.Marble);
      poly(p, [[vx + dir * 4, vy - 4], [vx + dir * 46, vy - 32], [vx + dir * 40, vy - 10], [vx + dir * 26, vy + 8]], E.Marble, () => (dir < 0 ? 0.66 : 0.5));
      limb(p, [vx, vy - 2], [vx - dir * 32, vy - 18], 3, 2, E.Marble);
    });
    for (let a = 0; a < Math.PI * 2; a += 0.35) { p.on(vx - dir * 40 + Math.cos(a) * 7, vy - 22 + Math.sin(a) * 7, E.Ivy, 3); p.on(vx - dir * 40 + Math.cos(a) * 6, vy - 22 + Math.sin(a) * 6, E.Ivy, 4); }
    for (let k = 0; k < 5; k++) line(p, [vx + dir * (10 + k * 7), vy - 6 - k * 4], [vx + dir * (14 + k * 7), vy + 4 - k * 3], null, 1);
  }
  // Entablamento e ático com a inscrição.
  box(p, [L - 36, eTop, R + 36, eTop + 24], E.Marble, 0.62);
  hline(p, L - 36, R + 36, eTop, E.Marble, 5);
  hline(p, L - 36, R + 36, eTop + 24, E.Marble, 1);
  for (let x = L - 34; x < R + 34; x += 10) box(p, [x, eTop + 25, x + 5, eTop + 30], E.Marble, 0.42);
  p.fill([L, attic, R, eTop - 1], () => true, E.Marble, (x, y) => 0.6 + (sn(x, y, 32, 563) - 0.5) * 0.06, (x, y) => (noise(x, y, 564) < 0.04 ? -1 : 0));
  hline(p, L, R, attic, E.Marble, 5);
  box(p, [L + 22, attic + 16, R - 22, eTop - 16], E.Marble, 0.5);
  hline(p, L + 22, R - 22, attic + 16, E.Marble, 1); hline(p, L + 22, R - 22, eTop - 16, E.Marble, 4);
  inscribe(p, "IMPERIVM · KVSA", cx, attic + 38, 6);
  // O ático e a passagem quebraram do lado leste: apaga o que caiu e deixa uma aduela pendurada.
  for (let y = 0; y < spring; y++) for (let x = Math.floor(breakX - 60); x < p.w; x++) if (p.has(x, y) && broken(x, y)) p.mat[y * p.w + x] = -1;
  poly(p, [[breakX + 98, spring - 90], [breakX + 124, spring - 98], [breakX + 128, spring - 52], [breakX + 104, spring - 46]], E.Travertine, () => 0.5);
  // Rachadura no tímpano e hera caindo do entablamento.
  let crx = cx - 120;
  for (let y = attic + 4; y < spring - 10; y++) {
    if (noise(y >> 2, 3, 565) < 0.4) crx += noise(y, 3, 566) < 0.5 ? -1 : 1;
    if (!inVoid(crx, y)) p.on(crx, y, E.Void, 1);
  }
  ivy(p, L - 30, breakX - 40, eTop + 30, 120, 7);
  return p.render(true);
}

// --- Colunas e blocos -------------------------------------------------------------------

export const COLUMN = { w: HD, h: HD + 232 } as const;
export const COLUMN_KINDS = ["ionic", "corinthian", "broken", "stump"] as const;
export type ColumnKind = (typeof COLUMN_KINDS)[number];

/** Fuste de coluna (cilindro canelado) entre y0 (topo) e y1 (pé), com raio afinando para cima. */
function shaft(p: Paper, cx: number, y0: number, y1: number, r0: number, r1: number, mat: number, seed: number) {
  return p.fill([cx - r1 - 1, y0, cx + r1 + 1, y1], (x, y) => {
    const t = (y - y0) / Math.max(1, y1 - y0);
    return Math.abs(x - cx) <= r0 + (r1 - r0) * t;
  }, mat, (x, y) => {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const r = r0 + (r1 - r0) * t;
    const nx = (x - cx) / r;
    return lit(nx, -0.05, Math.sqrt(Math.max(0, 1 - nx * nx)));
  }, (x, y) => {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const r = r0 + (r1 - r0) * t;
    const u = (x - cx) / r;
    // Caneluras: 7 sulcos à vista, mais apertados para as beiradas.
    const ang = Math.asin(Math.max(-1, Math.min(1, u)));
    const f = mod(ang * 7 / Math.PI + 0.5, 1);
    if (f < 0.16) return -1;
    if (f > 0.84 && u < 0.3) return 1;
    return noise(x, y, 570 + seed) < 0.03 ? -1 : 0;
  });
}

/** Base ática: plinto quadrado e dois toros. */
function columnBase(p: Paper, cx: number, foot: number, r: number) {
  box(p, [cx - r - 9, foot - 12, cx + r + 9, foot], E.Marble, 0.55);
  box(p, [cx - r - 9, foot - 16, cx + r + 9, foot - 12], E.Marble, FLAT + 0.1);
  ellipse(p, cx, foot - 19, r + 6, 5, E.Marble);
  ellipse(p, cx, foot - 26, r + 3, 4, E.Marble);
}

/** Capitel jônico (equino e volutas) ou coríntio (folhas de acanto em duas fileiras e volutinhas), com o ábaco. */
function capital(p: Paper, cx: number, top: number, r: number, kind: "ionic" | "corinthian") {
  if (kind === "ionic") {
    ellipse(p, cx, top + 14, r + 3, 6, E.Marble);
    box(p, [cx - r - 14, top + 2, cx + r + 14, top + 10], E.Marble, 0.6);
    for (const dir of [-1, 1]) {
      const vx = cx + dir * (r + 8), vy = top + 12;
      ellipse(p, vx, vy, 8, 8, E.Marble);
      for (let a = 0; a < Math.PI * 3.2; a += 0.12) {
        const rr = 7 - a * 0.6;
        p.on(vx + Math.cos(a * dir) * rr, vy + Math.sin(a) * rr, E.Vein, 1);
      }
    }
  } else {
    for (let row = 0; row < 2; row++)
      for (let k = -2; k <= 2; k++) {
        const lx = cx + k * (r / 2.2) + (row ? r / 4.4 : 0), ly = top + 30 - row * 14;
        if (Math.abs(lx - cx) > r + 6) continue;
        p.together(() => {
          ellipse(p, lx, ly, 6, 10, E.Marble);
          limb(p, [lx, ly + 6], [lx + (lx < cx ? -4 : 4), ly - 10], 3, 1.5, E.Marble);
        });
        line(p, [lx, ly + 8], [lx, ly - 6], E.Vein, 2);
      }
    for (const dir of [-1, 1]) ellipse(p, cx + dir * (r + 6), top + 8, 5, 5, E.Marble);
  }
  box(p, [cx - r - 16, top - 6, cx + r + 16, top + 2], E.Marble, 0.58);
  hline(p, cx - r - 16, cx + r + 16, top - 6, E.Marble, 5);
  hline(p, cx - r - 16, cx + r + 16, top + 2, E.Marble, 1);
}

/** Manchas de chuva escorrendo e musgo no pé. */
function weather(p: Paper, x0: number, x1: number, y0: number, y1: number, seed: number) {
  for (let x = Math.ceil(x0); x <= x1; x++) {
    if (noise(x >> 1, seed, 575) > 0.25) continue;
    const len = 20 + noise(x, seed, 576) * 70;
    for (let y = y0; y < y0 + len && y <= y1; y++) if (p.has(x, y)) p.nudge(x, y, -1);
  }
  for (let y = y1 - 26; y <= y1; y++)
    for (let x = Math.ceil(x0); x <= x1; x++)
      if (p.has(x, y) && noise(x >> 1, y >> 1, 577 + seed) < 0.18 + ((y - (y1 - 26)) / 26) * 0.4) p.on(x, y, E.Moss, noise(x, y, 578) < 0.4 ? 2 : 3);
}

/**
 * Coluna de 1 tile (sobe até ~1,8 tile): jônica ou coríntia inteira, quebrada no meio (topo lascado e o tambor caído
 * no pé) ou só o toco com musgo. `v` muda a altura e o desgaste.
 */
export function columnSprite(kind: ColumnKind, v: number): Uint8ClampedArray {
  const p = paper(COLUMN.w, COLUMN.h);
  const cx = HD / 2;
  const foot = COLUMN.h - 32;
  const r = 19;
  const full = 268 + (v % 2) * 14;
  if (kind === "stump") {
    columnBase(p, cx, foot, r);
    const top = foot - 26 - 34 - (v % 3) * 10;
    shaft(p, cx, top, foot - 26, r, r + 1, E.Marble, v);
    p.fill([cx - r, top - 6, cx + r, top + 6], (x, y) => ((x - cx) / r) ** 2 + ((y - top) / 6) ** 2 <= 1 && noise(x >> 2, y >> 1, 580) > 0.15, E.Marble, () => FLAT + 0.12);
    weather(p, cx - r - 9, cx + r + 9, top, foot, v);
    for (let k = 0; k < 8; k++) { const x = cx - r + noise(k, v, 581) * r * 2; for (let s = 0; s < 6; s++) p.on(x, top - s, E.Grass, s === 0 ? 2 : s > 4 ? 4 : 3); }
    return p.render(true);
  }
  if (kind === "broken") {
    // O tambor de cima caído no chão, encostado no pé.
    p.together(() => {
      limb(p, [cx + 6, foot - 4], [cx + 54, foot - 14], 15, 15, E.Marble);
      ellipse(p, cx + 56, foot - 14, 6, 15, E.Marble);
    });
    for (let k = -12; k <= 12; k += 4) line(p, [cx + 8, foot - 4 + k], [cx + 52, foot - 14 + k], null, 2);
  }
  columnBase(p, cx, foot, r);
  const height = kind === "broken" ? 120 + (v % 3) * 30 : full;
  const top = foot - 26 - height;
  shaft(p, cx, top, foot - 26, r - 2, r, E.Marble, v);
  // Colarinho do fuste.
  hline(p, cx - r, cx + r, foot - 28, E.Marble, 5);
  if (kind === "broken") {
    // Topo lascado: a face de cima clara e o recorte em dentes.
    for (let x = cx - r; x <= cx + r; x++) {
      const cut = Math.floor((x - (cx - r)) * (v % 2 ? 0.35 : -0.35) + (v % 2 ? 0 : 14) + noise(x >> 3, v, 582) * 6);
      for (let y = top; y < top + cut; y++) if (p.has(x, y)) p.mat[y * p.w + x] = -1;
      if (p.has(x, top + cut)) { p.on(x, top + cut, null, 5); p.on(x, top + cut + 1, null, 4); }
    }
  } else capital(p, cx, top - 6, r - 2, kind);
  weather(p, cx - r - 9, cx + r + 9, top + 10, foot, v);
  // Hera subindo em espiral em algumas.
  if (v % 3 === 1) {
    for (let t = 0; t < 1; t += 0.004) {
      const y = foot - 26 - t * height * 0.8;
      const x = cx + Math.sin(t * 14 + v) * (r - 1);
      if (Math.cos(t * 14 + v) < -0.2) continue;
      for (let k = 0; k < 3; k++) p.on(x + noise(t * 999, k, 583) * 6 - 3, y + noise(k, t * 999, 584) * 6 - 3, E.Ivy, noise(t * 99, k, 585) < 0.3 ? 4 : 2);
    }
  }
  return p.render(true);
}

export const BLOCK = { w: HD, h: HD + 80 } as const;

/** Blocos caídos de 1 tile: o bloco grande de cantaria tombado, pedaços menores e um tambor de coluna, com musgo. */
export function rubbleSprite(v: number, under = false): Uint8ClampedArray {
  const p = paper(BLOCK.w, BLOCK.h);
  const foot = BLOCK.h - 24;
  const stone = under ? E.Wall : v % 2 ? E.Tuff : E.Travertine;
  const tilt = (noise(v, 1, 590) - 0.5) * 16;
  // Bloco grande: tampo e face, inclinados.
  const bx = 22 + noise(v, 2, 591) * 10, bw = 62 + noise(v, 3, 592) * 14, bh = 40 + noise(v, 4, 593) * 18;
  poly(p, [[bx, foot - bh - 24 + tilt], [bx + bw, foot - bh - 24 - tilt], [bx + bw + 8, foot - bh - 4 - tilt], [bx + 8, foot - bh - 4 + tilt]], stone, () => FLAT + 0.06);
  poly(p, [[bx + 8, foot - bh - 4 + tilt], [bx + bw + 8, foot - bh - 4 - tilt], [bx + bw + 8, foot - tilt * 0.3], [bx + 8, foot + tilt * 0.3]], stone,
    (x, y) => 0.48 - ((y - (foot - bh)) / bh) * 0.1);
  for (let x = bx + 10; x < bx + bw + 6; x += 1) if (noise(x >> 3, v, 594) < 0.3) p.on(x, foot - bh * 0.5, null, 1);
  // Pedaços menores na frente e o tambor.
  for (let k = 0; k < 4; k++) ellipse(p, 18 + noise(k, v, 595) * 92, foot - 4 - noise(v, k, 596) * 10, 7 + noise(k, k, 597) * 6, 5 + noise(k, v + 1, 598) * 3, stone);
  if (!under && v % 3 === 0) p.together(() => { limb(p, [70, foot - 2], [104, foot - 10], 11, 11, E.Marble); ellipse(p, 106, foot - 10, 5, 11, E.Marble); });
  if (under) for (let k = 0; k < 5; k++) ellipse(p, 30 + noise(k, v, 599) * 70, foot - noise(v, k + 9, 600) * 6, 3, 2.5, E.Bone);
  // Musgo e capim por cima (em cima; embaixo, pó).
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (!p.has(x, y)) continue;
      const i = y * p.w + x;
      if (!under && p.shade[i] > FLAT && sn(x, y, 16, 601 + v) > 0.6) p.mat[i] = E.Moss;
      if (under && p.shade[i] > FLAT && noise(x >> 1, y >> 1, 602) < 0.25) p.mat[i] = E.Bone;
    }
  return p.render(true);
}

// --- Estátuas ---------------------------------------------------------------------------

export const STATUE = { w: HD, h: HD + 296 } as const;

/** Pedestal de mármore com a moldura e a placa (base em `foot`, topo devolvido). */
function pedestal(p: Paper, cx: number, foot: number, w: number, h: number, mat = E.Marble) {
  const top = foot - h;
  box(p, [cx - w / 2 - 6, foot - 12, cx + w / 2 + 6, foot], mat, 0.5);
  hline(p, cx - w / 2 - 6, cx + w / 2 + 6, foot - 12, mat, 4);
  box(p, [cx - w / 2, top + 10, cx + w / 2, foot - 12], mat, (x, y) => 0.55 - ((y - top) / h) * 0.1, (x, y) => (noise(x, y, 610) < 0.04 ? -1 : 0));
  box(p, [cx - w / 2 - 5, top, cx + w / 2 + 5, top + 10], mat, FLAT + 0.08);
  hline(p, cx - w / 2 - 5, cx + w / 2 + 5, top, mat, 5);
  hline(p, cx - w / 2 - 5, cx + w / 2 + 5, top + 10, mat, 1);
  box(p, [cx - w / 2 + 8, top + 22, cx + w / 2 - 8, foot - 24], mat, 0.48);
  hline(p, cx - w / 2 + 8, cx + w / 2 - 8, top + 22, null, 1);
  vline(p, cx - w / 2 + 8, top + 22, foot - 24, null, 1);
  return top;
}

/**
 * Estátua de 1 tile em pedestal. "guard": o legionário de bronze esverdeado guardando a escadaria, de escudo retangular
 * (a águia e os raios dourados) e lança, elmo de crista. "emperor": o imperador de mármore da fonte, de toga e coroa de
 * louros, com o braço erguido. `v` 1: a cabeça do guardião caiu (o pescoço quebrado).
 */
export function statueSprite(kind: "guard" | "emperor", v: number): Uint8ClampedArray {
  const p = paper(STATUE.w, STATUE.h);
  const cx = HD / 2;
  const foot = STATUE.h - 30;
  const top = pedestal(p, cx, foot, kind === "guard" ? 70 : 62, kind === "guard" ? 84 : 96);
  inscribe(p, kind === "guard" ? "S·P·K" : "IMP", cx, top + 36, 3, E.Vein);
  const mat = kind === "guard" ? E.Bronze : E.Marble;
  const f = top; // pé da figura
  if (kind === "guard") {
    p.together(() => {
      // Pernas (com as grevas), saiote de tiras, couraça segmentada, ombreiras, braços.
      limb(p, [cx - 9, f - 4], [cx - 11, f - 52], 6, 7, mat);
      limb(p, [cx + 9, f - 4], [cx + 11, f - 52], 6, 7, mat);
      poly(p, [[cx - 22, f - 54], [cx + 22, f - 54], [cx + 26, f - 76], [cx - 26, f - 76]], mat, (x) => 0.6 - (x - cx) / 90);
      p.fill([cx - 22, f - 124, cx + 22, f - 74], (x, y) => Math.abs(x - cx) < 18 + (y - (f - 124)) * 0.08, mat, (x, y) => lit((x - cx) / 26, -0.2, 0.9));
      ellipse(p, cx - 22, f - 118, 11, 9, mat);
      ellipse(p, cx + 22, f - 118, 11, 9, mat);
      limb(p, [cx + 26, f - 114], [cx + 34, f - 82], 6, 5, mat);
      // Cabeça e elmo com a crista.
      if (v !== 1) {
        // Pescoço, rosto, elmo (calota, aba da nuca e as abas das bochechas) e a crista de crina em leque.
        limb(p, [cx, f - 126], [cx, f - 134], 6, 6, mat);
        ellipse(p, cx, f - 146, 13, 15, mat);
        p.fill([cx - 16, f - 170, cx + 16, f - 144], (x, y) => ((x - cx) / 16) ** 2 + ((y - (f - 146)) / 22) ** 2 <= 1 && y < f - 146, mat, (x, y) => lit((x - cx) / 16, -0.7, 0.6));
        poly(p, [[cx - 17, f - 148], [cx - 12, f - 148], [cx - 10, f - 130], [cx - 16, f - 134]], mat, () => 0.62);
        poly(p, [[cx + 17, f - 148], [cx + 12, f - 148], [cx + 10, f - 130], [cx + 16, f - 134]], mat, () => 0.4);
        p.fill([cx - 18, f - 188, cx + 18, f - 164], (x, y) => ((x - cx) / 18) ** 2 + ((y - (f - 164)) / 22) ** 2 <= 1 && ((x - cx) / 18) ** 2 + ((y - (f - 164)) / 22) ** 2 >= 0.3 && y < f - 165,
          E.Cloth, (x, y) => 0.45 + (cx - x) / 120, (x) => (mod(x, 3) === 0 ? -1 : 0));
      } else box(p, [cx - 7, f - 136, cx + 7, f - 124], mat, 0.5);
    });
    // Tiras da couraça e do saiote.
    for (let y = f - 118; y < f - 76; y += 8) hline(p, cx - 20, cx + 20, y, null, 1);
    for (let x = cx - 24; x < cx + 26; x += 6) vline(p, x, f - 74, f - 56, null, 1);
    if (v !== 1) {
      for (const dx of [-5, 4]) { p.on(cx + dx, f - 146, E.Void, 1); p.on(cx + dx + 1, f - 146, E.Void, 1); }
      vline(p, cx, f - 146, f - 140, null, 1); hline(p, cx - 3, cx + 3, f - 136, null, 1);
      hline(p, cx - 15, cx + 15, f - 150, null, 5); hline(p, cx - 15, cx + 15, f - 149, null, 1);
    }
    // Lança (de pé, ao lado direito) e o escudo na frente do lado esquerdo.
    limb(p, [cx + 36, f - 2], [cx + 38, f - 200], 2.4, 2, E.Bark);
    poly(p, [[cx + 38, f - 222], [cx + 44, f - 200], [cx + 38, f - 194], [cx + 32, f - 200]], mat, () => 0.66);
    p.fill([cx - 44, f - 122, cx - 2, f - 30], () => true, mat, (x, y) => lit((x - (cx - 23)) / 30, (y - (f - 76)) / 120, 0.8), (x, y) => (noise(x, y, 611) < 0.05 ? -1 : 0));
    for (let y = f - 122; y <= f - 30; y++) { p.on(cx - 44, y, null, 4); p.on(cx - 2, y, null, 1); }
    hline(p, cx - 44, cx - 2, f - 122, null, 5);
    // Emblema do escudo: asas, raios e o umbo.
    const sx = cx - 23, sy = f - 76;
    for (const dir of [-1, 1]) {
      line(p, [sx, sy], [sx + dir * 16, sy - 20], E.Gold, 4);
      line(p, [sx, sy], [sx + dir * 16, sy + 24], E.Gold, 3);
      poly(p, [[sx + dir * 4, sy - 2], [sx + dir * 18, sy - 12], [sx + dir * 16, sy - 2]], E.Gold, () => 0.6);
    }
    ellipse(p, sx, sy, 7, 7, E.Gold);
  } else {
    p.together(() => {
      // Toga em dobras até os pés, com o braço direito erguido (a adlocução) e o esquerdo segurando a dobra.
      p.fill([cx - 26, f - 128, cx + 26, f - 2], (x, y) => Math.abs(x - cx) < 16 + (y - (f - 128)) * 0.09, mat, (x, y) => lit((x - cx) / 28, -0.1, 0.9),
        (x, y) => (mod(x - cx + Math.floor((y - f) / 9), 9) === 0 ? -1 : 0));
      ellipse(p, cx - 18, f - 120, 10, 9, mat);
      ellipse(p, cx + 18, f - 120, 10, 9, mat);
      limb(p, [cx + 22, f - 120], [cx + 36, f - 162], 6, 5, mat);
      limb(p, [cx + 36, f - 162], [cx + 38, f - 184], 5, 4, mat);
      limb(p, [cx - 22, f - 118], [cx - 26, f - 82], 6, 6, mat);
      ellipse(p, cx, f - 142, 11, 13, mat);
    });
    // Dobras diagonais da toga, o rosto e a coroa de louros.
    for (let k = 0; k < 6; k++) line(p, [cx - 18 + k * 4, f - 116], [cx + 14, f - 70 + k * 6], null, 1);
    for (const dx of [-5, 4]) { p.on(cx + dx, f - 144, E.Vein, 1); p.on(cx + dx + 1, f - 144, E.Vein, 1); p.on(cx + dx, f - 146, E.Vein, 2); }
    vline(p, cx, f - 144, f - 139, E.Vein, 2); p.on(cx + 1, f - 139, E.Vein, 1); hline(p, cx - 3, cx + 3, f - 135, E.Vein, 1);
    for (let x = cx - 10; x <= cx + 10; x++) if (mod(x, 3) === 0) p.on(x, f - 154 + Math.abs(x - cx) * 0.2, E.Vein, 2);
    for (let a = Math.PI * 1.05; a < Math.PI * 1.95; a += 0.15) {
      const x = cx + Math.cos(a) * 12, y = f - 146 + Math.sin(a) * 9;
      p.on(x, y, E.Ivy, 3); p.on(x + 1, y - 1, E.Ivy, 4);
    }
    weather(p, cx - 26, cx + 26, f - 150, f, 9);
  }
  // Verdete escorrendo no bronze.
  if (kind === "guard")
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        if (!p.has(x, y) || p.mat[y * p.w + x] !== E.Bronze) continue;
        if (sn(x, y, 16, 612) > 0.6 || (noise(x >> 1, 0, 613) < 0.2 && noise(x, y >> 3, 614) < 0.6)) p.mat[y * p.w + x] = E.Patina;
      }
  return p.render(true);
}

// --- Mausoléus da via dos túmulos (2×2) -------------------------------------------------

export const TOMB = { w: 2 * HD, h: 2 * HD + 200 } as const;

/** Telhado de telhas (ímbrices em fileiras) entre y0 e y1, de x0 a x1, a cumeeira em cima. */
function tileRoof(p: Paper, x0: number, x1: number, y0: number, y1: number, seed: number) {
  const mid = (x0 + x1) / 2;
  p.fill([x0, y0, x1, y1], (x, y) => noise(x >> 3, y >> 4, 630 + seed) > 0.03, E.Terracotta, (x, y) => {
    // Duas águas com a cumeeira no meio: a de oeste pega sol, a de leste fica na sombra; cada fileira de telhas é abaulada.
    const side = x < mid ? 0.62 : 0.42;
    const u = mod(y - y0, 16) / 16;
    return side + Math.sin(u * Math.PI) * 0.12;
  }, (x, y) => (mod(y - y0, 16) === 0 ? -2 : mod(x - x0 + (Math.floor((y - y0) / 16) % 2) * 9, 18) === 0 ? -1 : noise(x, y, 631 + seed) < 0.04 ? -1 : 0));
  // Cumeeira e as beiradas.
  box(p, [mid - 5, y0, mid + 5, y1], E.Terracotta, FLAT + 0.08, (x, y) => (mod(y - y0, 22) === 0 ? -1 : 0));
  vline(p, mid - 5, y0, y1, E.Terracotta, 5);
  vline(p, x0, y0, y1, E.Terracotta, 4); vline(p, x1, y0, y1, E.Terracotta, 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (p.has(x, y) && sn(x, y, 16, 632 + seed) > 0.72) p.on(x, y, E.Moss, noise(x, y, 633) < 0.5 ? 2 : 3);
}

/**
 * Mausoléu de 2×2 tiles à beira da via: o pódio de blocos com a beira de travertino e, em cima, por `v`: 0 o
 * túmulo-templo (pilastras, porta de bronze, frontão com a placa D·M e o telhado de telhas para trás), 1 o altar
 * funerário (bloco com guirlanda em relevo e a urna em cima, num cercado baixo), 2 o túmulo-templo de telhado caído.
 */
export function tombSprite(v: number): Uint8ClampedArray {
  const p = paper(TOMB.w, TOMB.h);
  const foot = TOMB.h - 6;
  const x0 = 10, x1 = TOMB.w - 11;
  const podH = 52;
  const podTop = foot - podH;
  const cx = TOMB.w / 2;
  // Pódio: face sul e a faixa de cima (o resto do tampo fica debaixo da cela).
  masonry(p, [x0, podTop, x1, foot], 60 + v, { shade: 0.5, dark: 0.12 });
  weather(p, x0, x1, podTop, foot, 30 + v);
  // Tampo do pódio: lajes de travertino (o que a cela não cobre fica à vista), com musgo nas juntas.
  const deckTop = podTop - 2 * HD + podH + 16;
  p.fill([x0 - 4, deckTop, x1 + 4, podTop - 9], () => true, E.Travertine, (x, y) => {
    const lx = mod(x - x0, 40), ly = mod(y - deckTop, 32);
    return FLAT + (hash01(Math.floor((x - x0) / 40) * 5 + Math.floor((y - deckTop) / 32) * 11 + v, 626) - 0.5) * 0.1 + (lx < 2 || ly < 2 ? -0.22 : 0);
  }, (x, y) => (noise(x, y, 627) < 0.04 ? -1 : 0));
  for (let y = deckTop; y < podTop - 9; y++) for (let x = x0; x <= x1; x++) if (sn(x, y, 16, 628 + v) > 0.72) p.on(x, y, E.Moss, noise(x, y, 629) < 0.5 ? 2 : 3);
  hline(p, x0 - 4, x1 + 4, deckTop, E.Travertine, 5);
  box(p, [x0 - 4, podTop - 8, x1 + 4, podTop], E.Travertine, FLAT + 0.06);
  hline(p, x0 - 4, x1 + 4, podTop - 8, E.Travertine, 5);
  hline(p, x0 - 4, x1 + 4, podTop, E.Travertine, 1);
  if (v === 1) {
    // Altar: bloco com cornija, guirlanda pendurada entre crânios de boi, a placa D·M e a urna com tampa.
    const aBottom = podTop - 40, aTop = aBottom - 112;
    box(p, [cx - 60, aTop + 18, cx + 60, aBottom], E.Marble, (x, y) => 0.56 - ((y - aTop) / 140) * 0.1, (x, y) => (noise(x, y, 620) < 0.04 ? -1 : 0));
    box(p, [cx - 68, aTop - 30, cx + 68, aTop], E.Marble, FLAT + 0.1);
    box(p, [cx - 68, aTop, cx + 68, aTop + 18], E.Marble, 0.6);
    hline(p, cx - 68, cx + 68, aTop - 30, E.Marble, 5);
    hline(p, cx - 68, cx + 68, aTop + 18, E.Marble, 1);
    for (let a = 0.2; a < Math.PI - 0.2; a += 0.03) {
      const x = cx - 44 + (a / Math.PI) * 88, y = aTop + 44 + Math.sin(a) * 24;
      for (let r = -4; r <= 4; r++) p.on(x, y + r, E.Ivy, Math.abs(r) > 2 ? 1 : noise(x, y + r, 621) < 0.4 ? 4 : 3);
    }
    for (const dir of [-1, 1]) ellipse(p, cx + dir * 48, aTop + 42, 8, 9, E.Bone);
    inscribe(p, "D·M", cx, aTop + 80, 4, E.Vein);
    p.together(() => {
      ellipse(p, cx, aTop - 44, 20, 24, E.Terracotta);
      box(p, [cx - 9, aTop - 76, cx + 9, aTop - 62], E.Terracotta, 0.55);
      ellipse(p, cx, aTop - 78, 13, 5, E.Terracotta);
    });
    for (let x = cx - 16; x < cx + 16; x++) p.on(x, aTop - 44 + Math.sin(x / 3) * 2, E.Gold, 2);
    return p.render(true);
  }
  // Túmulo-templo: o telhado de telhas para trás, a cela com pilastras, a porta de bronze e o frontão.
  const cBottom = podTop - 34, cTop = cBottom - 128;
  const roofless = v === 2;
  if (!roofless) tileRoof(p, cx - 94, cx + 94, cTop - 176, cTop + 12, v);
  const cella = masonry(p, [cx - 86, cTop + 30, cx + 86, cBottom], 70 + v, { shade: 0.5, dark: 0.1 });
  for (const px of [cx - 86, cx + 70]) box(p, [px, cTop + 30, px + 16, cBottom], E.Marble, (x) => 0.62 - (x - px) / 60);
  box(p, [cx - 26, cBottom - 80, cx + 26, cBottom], E.Bronze, (x) => 0.42 + (x < cx ? 0.06 : -0.04), (x, y) => (Math.abs(x - cx) < 1 ? -2 : mod(y, 20) === 0 ? -1 : 0));
  for (let y = cBottom - 80; y <= cBottom; y++) { p.on(cx - 27, y, E.Marble, 5); p.on(cx + 27, y, E.Marble, 1); }
  box(p, [cx - 34, cBottom - 90, cx + 34, cBottom - 80], E.Marble, 0.62);
  for (const dx of [-14, 14]) for (const dy of [-56, -28]) ellipse(p, cx + dx, cBottom + dy, 3, 3, E.Gold);
  if (!roofless) {
    box(p, [cx - 96, cTop + 12, cx + 96, cTop + 30], E.Marble, 0.6);
    hline(p, cx - 96, cx + 96, cTop + 12, E.Marble, 5);
    hline(p, cx - 96, cx + 96, cTop + 30, E.Marble, 1);
    poly(p, [[cx - 100, cTop + 12], [cx + 100, cTop + 12], [cx, cTop - 40]], E.Marble, (x, y) => 0.62 - (x - cx) / 600 - (y - cTop) / 400);
    poly(p, [[cx - 80, cTop + 6], [cx + 80, cTop + 6], [cx, cTop - 28]], E.Marble, () => 0.46);
    for (let x = cx - 100; x <= cx + 100; x++) p.on(x, cTop + 12 - (40 - Math.abs(x - cx) * 0.4) + 1, E.Marble, x < cx ? 5 : 2);
    box(p, [cx - 28, cTop - 10, cx + 28, cTop + 4], E.Marble, 0.58);
    inscribe(p, "D·M", cx, cTop - 7, 3, E.Vein);
    for (const ax of [cx - 100, cx, cx + 100]) {
      const ay = ax === cx ? cTop - 40 : cTop + 12;
      p.together(() => { ellipse(p, ax, ay - 8, 7, 9, E.Marble); limb(p, [ax - 6, ay - 4], [ax + 6, ay - 4], 3, 3, E.Marble); });
    }
  } else {
    // Telhado caído: a parede de cima em dentes, telhas quebradas e os blocos do frontão no chão do pódio.
    for (let x = cx - 86; x <= cx + 86; x++) {
      const cut = 30 + Math.floor(noise(x >> 3, v, 622) * 46);
      for (let y = cTop + 30; y < cTop + 30 + cut; y++) {
        const i = y * p.w + x;
        if (p.has(x, y) && (p.part[i] === cella || p.mat[i] === E.Marble)) { p.mat[i] = E.Travertine; p.shade[i] = FLAT; p.off[i] = 0; p.fixed[i] = -1; p.part[i] = 0; }
      }
      p.on(x, cTop + 30 + cut, E.Tuff, 5);
    }
    for (let k = 0; k < 5; k++) ellipse(p, cx - 90 + k * 44, podTop - 16 - noise(k, v, 623) * 8, 14, 7, E.Marble);
    for (let k = 0; k < 9; k++) ellipse(p, cx - 80 + noise(k, v, 624) * 160, podTop - 22 - noise(v, k, 625) * 16, 6, 3, E.Terracotta);
  }
  ivy(p, cx - 86, cx + 86, cTop + 30, 70, v + 11);
  return p.render(true);
}

// --- Árvores ----------------------------------------------------------------------------

export const CYPRESS = { w: HD, h: HD + 300 } as const;

/** Cipreste: fuso alto e estreito de folhagem verde-escura em tufos (luz de cilindro), a ponta torta e o pé de tronco. */
export function cypressSprite(v: number): Uint8ClampedArray {
  const p = paper(CYPRESS.w, CYPRESS.h);
  const cx = HD / 2 + (noise(v, 1, 630) - 0.5) * 8;
  const foot = CYPRESS.h - 30;
  const height = 300 + (v % 3) * 40 - 30;
  const top = foot - height;
  const lean = (noise(v, 2, 631) - 0.5) * 14;
  limb(p, [cx, foot], [cx, foot - 36], 6, 5, E.Bark);
  const widthAt = (t: number) => (t < 0.08 ? t / 0.08 : 1) * 30 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.05)), 0.7) * (1 - t * 0.35);
  p.fill([cx - 40, top, cx + 40, foot - 22], (x, y) => {
    const t = (foot - 22 - y) / (height - 22);
    const c = cx + lean * t * t;
    const wob = (sn(x, y, 16, 632 + v) - 0.5) * 10;
    return Math.abs(x - c) < widthAt(t) + wob;
  }, E.Leaf, (x, y) => {
    const t = (foot - 22 - y) / (height - 22);
    const c = cx + lean * t * t;
    const w = Math.max(4, widthAt(t));
    const nx = Math.max(-1, Math.min(1, (x - c) / w));
    return lit(nx, -0.15, Math.sqrt(Math.max(0, 1 - nx * nx))) + (sn(x, y, 8, 633 + v) - 0.5) * 0.28;
  }, (x, y) => (noise(x >> 1, y >> 2, 634 + v) < 0.12 ? -1 : 0));
  // Tufos: pontinhas claras no lado do sol.
  for (let y = top; y < foot; y++)
    for (let x = 0; x < HD; x++) {
      if (!p.has(x, y) || p.mat[y * p.w + x] !== E.Leaf) continue;
      if (noise(x, y, 635 + v) < 0.02 && x < cx) p.on(x, y, null, 5);
    }
  return p.render(true);
}

export const PINE = { w: 2 * HD + 32, h: HD + 300 } as const;

/** Tronco do pinheiro-manso: alto e torto, abrindo em 2 ou 3 galhos lá em cima. Devolve a imagem e onde a copa fica. */
export function pineTrunk(v: number): { image: Uint8ClampedArray; top: Pt } {
  const p = paper(PINE.w, PINE.h);
  const cx = PINE.w / 2;
  const foot = PINE.h - 30;
  const lean = [1, -0.8, 0.5][v % 3] * 30;
  const at = (t: number): Pt => [cx + lean * Math.sin(t * Math.PI * 0.6), foot - 230 * t];
  p.together(() => {
    for (let k = 0; k < 16; k++) limb(p, at(k / 16), at((k + 1) / 16), 9 - k * 0.3 + (k === 0 ? 3 : 0), 9 - (k + 1) * 0.3, E.Bark);
    const [tx, ty] = at(1);
    limb(p, [tx, ty], [tx - 50, ty - 34], 5, 3, E.Bark);
    limb(p, [tx, ty], [tx + 46, ty - 40], 5, 3, E.Bark);
    limb(p, [tx, ty + 30], [tx + 30 * Math.sign(lean || 1), ty - 10], 4, 2.5, E.Bark);
  });
  // Casca em placas: riscos verticais escuros.
  for (let y = foot - 230; y < foot; y += 3) {
    const [x] = at((foot - y) / 230);
    for (let k = -6; k <= 6; k += 4) if (noise(k, y >> 2, 640) < 0.5) p.on(x + k, y, null, 1);
  }
  const top = at(1);
  return { image: p.render(true), top: [top[0], top[1] - 36] };
}

/** Copa do pinheiro-manso: o guarda-chuva largo e chato, em tufos com luz de cima, a barriga escura embaixo. */
export function pineCrown(v: number, top: Pt): Uint8ClampedArray {
  const p = paper(PINE.w, PINE.h);
  const [tx, ty] = top;
  // Barriga escura embaixo, depois os tufos de fora e por cima os tufos claros do alto (a copa é um guarda-chuva).
  p.fill([tx - 104, ty - 10, tx + 104, ty + 30], (x, y) => ((x - tx) / 104) ** 2 + ((y - ty - 8) / 20) ** 2 + (sn(x, y, 8, 646) - 0.5) * 0.4 <= 1,
    E.Pine, (x, y) => 0.3 + (sn(x, y, 8, 647) - 0.5) * 0.2, (x, y) => (noise(x >> 1, y >> 1, 648) < 0.15 ? -1 : 0));
  const clumps = 16;
  for (let k = 0; k < clumps; k++) {
    const ring = k < 10 ? 0 : 1;
    const a = (k / (ring ? 6 : 10)) * Math.PI * 2 + v + ring;
    const rx = ring ? 46 : 84 + noise(k, v, 641) * 14, ry = ring ? 12 : 18;
    const x = tx + Math.cos(a) * rx, y = ty - 6 - ring * 16 + Math.sin(a) * ry;
    const r = (ring ? 30 : 26) + noise(v, k, 642) * 10;
    p.fill([x - r, y - r * 0.6, x + r, y + r * 0.6], (px, py) => ((px - x) / r) ** 2 + ((py - y) / (r * 0.5)) ** 2 + (sn(px, py, 8, 643) - 0.5) * 0.7 <= 1,
      E.Pine, (px, py) => lit(((px - x) / r) * 0.8, ((py - y) / (r * 0.5)) * 0.9 - 0.25, 0.75) + (sn(px, py, 8, 644 + (k % 3)) - 0.5) * 0.35,
      (px, py) => (noise(px >> 1, py >> 1, 645) < 0.12 ? -1 : noise(px, py, 649) < 0.03 ? 1 : 0));
  }
  return p.render(true);
}

// --- Fachada do templo afundado -------------------------------------------------------

export const FACADE = { w: 9 * HD, h: 4 * HD + 176 } as const;
/** Onde ficam as chamas dos braseiros na fachada (px do quadro, centro da boca). */
export const FACADE_FIRES: readonly Pt[] = [[368, FACADE.h - 158], [784, FACADE.h - 158]];
/** Boca da escadaria (px do quadro): o meio da porta, onde a luz de baixo pulsa. */
export const FACADE_DOOR: Pt = [FACADE.w / 2, FACADE.h - 170];

/**
 * Fachada do templo afundado (9×4 tiles, a escadaria no meio da linha de baixo). O templo afundou na encosta: só o
 * pórtico ficou de fora. Embaixo, o estilóbato em 3 degraus, cortado no meio pela escadaria que desce para o escuro,
 * entre parapeitos com cabeças de leão. Seis colunas coríntias (a quinta quebrada, os tambores caídos no degrau), atrás
 * delas a parede da cela em sombra com a grande porta de moldura de mármore e o sol de ouro na verga. Em cima, a
 * arquitrave, o friso com IMPERIVM · KVSA em letras de bronze, a cornija com dentículos e o frontão com a águia entre
 * louros; o canto leste do frontão desabou. Dois braseiros de bronze no degrau (as chamas vêm à parte), hera caindo da
 * cornija e uma figueira brotando do frontão.
 */
export function facadeSprite(): Uint8ClampedArray {
  const p = paper(FACADE.w, FACADE.h);
  const W = FACADE.w, Hh = FACADE.h;
  const cx = W / 2;
  const ground = Hh - 6;
  const stepTop = ground - 42;
  const colFoot = stepTop;
  const colH = 388;
  const colTop = colFoot - colH;
  const archTop = colTop - 34, friezeTop = archTop - 44, cornTop = friezeTop - 20;
  const apex = cornTop - 128;
  const cols = [110, 280, 448, 704, 872, 1042];
  const r = 25;
  const collapse = (x: number, y: number) => x > 880 + (cornTop - y) * 0.9 + noise(Math.floor(y / 12), 2, 650) * 40 && y < colTop + 20;
  const doorL = cx - 62, doorR = cx + 62, doorTop = colFoot - 250;
  const pitL = cx - 60, pitR = cx + 60;

  // Parede da cela (recuada, na sombra do pórtico): blocos grandes de travertino; em cima, a sombra do teto do pórtico
  // e, à direita de cada coluna, a sombra dela na parede (o sol vem de cima à esquerda).
  masonry(p, [60, archTop, W - 60, colFoot - 30], 80, { shade: 0.5, dark: 0.12, mat: E.Wall, bw: 64, bh: 30 });
  for (let y = archTop; y <= colFoot - 30; y++)
    for (let x = 60; x <= W - 60; x++) {
      if (!p.has(x, y)) continue;
      const roof = y < archTop + 46 + (x % 7 === 0 ? 1 : 0);
      const shadow = cols.some((c) => x > c + r - 4 && x < c + r + 34 + (y - colTop) * 0.06);
      if (roof || shadow) p.nudge(x, y, -1);
      if (roof && y < archTop + 20) p.nudge(x, y, -1);
    }
  // Porta: moldura de mármore em três faixas e o vão escuro.
  for (let k = 0; k < 3; k++) {
    const m = 30 - k * 9;
    box(p, [doorL - m, doorTop - m, doorR + m, colFoot - 30], E.Marble, 0.5 + k * 0.05);
    hline(p, doorL - m, doorR + m, doorTop - m, E.Marble, 5);
    vline(p, doorL - m, doorTop - m, colFoot - 30, E.Marble, 4);
    vline(p, doorR + m, doorTop - m, colFoot - 30, E.Marble, 1);
  }
  box(p, [doorL, doorTop, doorR, colFoot - 30], E.Void, (x, y) => 0.06 + ((y - doorTop) / 240) * 0.05);
  // Dentro da porta, os degraus continuam descendo para o escuro (cada vez mais estreitos e apagados) e lá no fundo a
  // luz violeta do santuário.
  for (let k = 0; k < 7; k++) {
    const y1 = colFoot - 30 - k * 16, y0 = y1 - 12, inset = 6 + k * 5;
    box(p, [doorL + inset, y0, doorR - inset, y1], E.Slab, 0.3 - k * 0.035);
    hline(p, doorL + inset, doorR - inset, y0, E.Slab, k < 3 ? 3 : 2);
  }

  // Uma folha da porta de bronze caída de lado, encostada no batente (a outra sumiu).
  poly(p, [[doorR - 6, doorTop + 20], [doorR + 4, doorTop + 14], [doorR + 4, colFoot - 34], [doorR - 30, colFoot - 30]], E.Bronze, (x, y) => 0.32 + (y - doorTop) / 900);
  for (let y = doorTop + 30; y < colFoot - 40; y += 34) ellipse(p, doorR - 8, y, 3, 3, E.Gold);
  // Sol de ouro na verga, com os raios.
  const sx = cx, sy = doorTop - 52;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) line(p, [sx, sy], [sx + Math.cos(a) * 22, sy + Math.sin(a) * 16], E.Gold, a % (Math.PI / 4) < 0.01 ? 4 : 3);
  ellipse(p, sx, sy, 10, 9, E.Gold);
  p.on(sx - 3, sy - 2, E.Gold, 5);

  // Escadaria: o corte no estilóbato e os degraus descendo para o escuro até a porta (cada um mais escuro e estreito).
  const steps = 9;
  for (let k = 0; k < steps; k++) {
    const t = k / steps;
    const y1 = ground - t * (ground - (colFoot - 30)), y0 = ground - ((k + 1) / steps) * (ground - (colFoot - 30));
    const inset = t * 10;
    box(p, [pitL + inset, y0, pitR - inset, y1], E.Slab, 0.5 - t * 0.42);
    hline(p, pitL + inset, pitR - inset, Math.round(y0), E.Slab, k < 4 ? 5 - Math.floor(k / 2) : 2);
    hline(p, pitL + inset, pitR - inset, Math.round(y1) - 1, E.Void, 1);
  }
  // Paredes do poço: a oeste pega luz, a leste fica escura; parapeitos de mármore com cabeça de leão na ponta.
  for (const dir of [-1, 1]) {
    const px0 = dir < 0 ? pitL - 30 : pitR, px1 = dir < 0 ? pitL : pitR + 30;
    box(p, [px0, colFoot - 60, px1, ground], E.Marble, dir < 0 ? 0.62 : 0.42, (x, y) => (mod(ground - y, 28) === 0 ? -1 : 0));
    box(p, [px0 - 2, colFoot - 70, px1 + 2, colFoot - 60], E.Marble, FLAT + 0.1);
    hline(p, px0 - 2, px1 + 2, colFoot - 70, E.Marble, 5);
    const lx = (px0 + px1) / 2, ly = ground - 30;
    p.together(() => { ellipse(p, lx, ly, 13, 12, E.Marble); ellipse(p, lx, ly + 6, 7, 6, E.Marble); });
    for (let a = 0; a < Math.PI * 2; a += 0.35) p.on(lx + Math.cos(a) * 13, ly + Math.sin(a) * 12, E.Vein, 2);
    p.on(lx - 4, ly - 2, E.Void, 1); p.on(lx + 4, ly - 2, E.Void, 1);
    box(p, [lx - 3, ly + 8, lx + 3, ly + 12], E.Void, 0.1);
  }

  // Estilóbato em 3 degraus (cortado no meio pelo poço).
  for (let k = 0; k < 3; k++) {
    const yTop = stepTop + k * 14, inset = 40 - k * 16;
    for (const [a, b] of [[inset, pitL - 31], [pitR + 31, W - inset]] as const) {
      box(p, [a, yTop, b, yTop + 5], E.Marble, FLAT + 0.08);
      box(p, [a, yTop + 5, b, yTop + 14], E.Marble, 0.48, (x) => (mod(x + k * 30, 76) === 0 ? -1 : 0));
      hline(p, a, b, yTop, E.Marble, 5);
    }
  }
  for (let y = stepTop; y <= ground; y++) for (let x = 0; x < W; x++) if (p.has(x, y) && sn(x, y, 16, 651) + (noise(x, y, 656) - 0.5) * 0.16 > 0.72) p.on(x, y, E.Moss, noise(x, y, 652) < 0.4 ? 2 : 3);

  // Braseiros de bronze no degrau: tripé de pernas abertas com patas de leão, o anel do meio e a bacia larga com as brasas.
  for (const [fx] of FACADE_FIRES) {
    const base = stepTop + 4, bowl = base - 104;
    p.together(() => {
      for (const dx of [-30, 30]) limb(p, [fx + dx, base - 4], [fx + dx * 0.25, bowl + 18], 3.2, 2.6, E.Bronze);
      limb(p, [fx, base - 2], [fx, bowl + 18], 3.2, 2.6, E.Bronze);
      for (const dx of [-30, 0, 30]) ellipse(p, fx + dx, base - 3, 5, 3, E.Bronze);
      p.fill([fx - 12, base - 54, fx + 12, base - 44], (x, y) => ((x - fx) / 12) ** 2 + ((y - base + 49) / 5) ** 2 <= 1 && ((x - fx) / 12) ** 2 + ((y - base + 49) / 5) ** 2 >= 0.4, E.Bronze, () => 0.55);
      p.fill([fx - 38, bowl - 8, fx + 38, bowl + 22], (x, y) => ((x - fx) / 38) ** 2 + ((y - bowl - 4) / 16) ** 2 <= 1 && y > bowl - 2, E.Bronze,
        (x, y) => lit((x - fx) / 38, (y - bowl) / 16, 0.7));
      ellipse(p, fx, bowl - 2, 36, 7, E.Bronze);
    });
    for (let x = fx - 36; x <= fx + 36; x++) p.on(x, bowl - 9 + (Math.abs(x - fx) > 30 ? 2 : 0), E.Bronze, 5);
    for (let x = fx - 30; x <= fx + 30; x++) for (let y = bowl - 6; y <= bowl + 1; y++) if (((x - fx) / 32) ** 2 + ((y - bowl + 2) / 5) ** 2 <= 1) p.on(x, y, noise(x, y, 653) < 0.35 ? E.Fire : E.Iron, noise(x, y, 654) < 0.5 ? 2 : 3);
    for (let x = fx - 34; x <= fx + 34; x += 8) ellipse(p, x, bowl + 10, 2, 2, E.Gold);
    // Verdete do bronze.
    for (let y = bowl - 10; y <= base; y++) for (let x = fx - 40; x <= fx + 40; x++) if (p.has(x, y) && p.mat[y * p.w + x] === E.Bronze && sn(x, y, 16, 655) > 0.6) p.mat[y * p.w + x] = E.Patina;
  }

  // Colunas coríntias; a quinta quebrou (tambores caídos no degrau, à direita).
  for (const [i, x] of cols.entries()) {
    const brokenAt = i === 4 ? colTop + 190 : 0;
    columnBase(p, x, colFoot, r);
    shaft(p, x, brokenAt || colTop + 10, colFoot - 26, r - 3, r, E.Marble, i);
    hline(p, x - r, x + r, colFoot - 28, E.Marble, 5);
    if (brokenAt) {
      for (let xx = x - r; xx <= x + r; xx++) {
        const cut = Math.floor(noise(xx >> 2, 4, 655) * 20);
        for (let y = brokenAt; y < brokenAt + cut; y++) if (p.has(xx, y)) p.mat[y * p.w + xx] = -1;
        if (p.has(xx, brokenAt + cut)) p.on(xx, brokenAt + cut, null, 5);
      }
    } else capital(p, x, colTop + 4, r - 3, "corinthian");
    weather(p, x - r - 9, x + r + 9, colTop + 40, colFoot, i);
  }
  p.together(() => { limb(p, [890, stepTop + 6], [960, stepTop + 2], 20, 20, E.Marble); ellipse(p, 962, stepTop + 2, 7, 20, E.Marble); });
  p.together(() => { limb(p, [968, stepTop + 26], [1040, stepTop + 30], 18, 18, E.Marble); ellipse(p, 1042, stepTop + 30, 6, 18, E.Marble); });
  for (let k = 0; k < 4; k++) ellipse(p, 860 + k * 50, stepTop + 34 - (k % 2) * 6, 14, 8, E.Travertine);

  // Arquitrave (3 faixas), friso com a inscrição, cornija com dentículos.
  const eL = 40, eR = W - 40;
  for (let k = 0; k < 3; k++) {
    const y0 = archTop + k * 11, x0 = eL + 6 - k * 3;
    box(p, [x0, y0, W - x0, y0 + 11], E.Marble, 0.56 + k * 0.02);
    hline(p, x0, W - x0, y0, E.Marble, 5);
  }
  box(p, [eL, friezeTop, eR, archTop], E.Marble, (x, y) => 0.6 + (sn(x, y, 32, 656) - 0.5) * 0.06, (x, y) => (noise(x, y, 657) < 0.03 ? -1 : 0));
  inscribe(p, "IMPERIVM · KVSA", cx, friezeTop + 12, 5);
  box(p, [eL - 14, cornTop, eR + 14, friezeTop], E.Marble, FLAT + 0.06);
  hline(p, eL - 14, eR + 14, cornTop, E.Marble, 5);
  hline(p, eL - 14, eR + 14, friezeTop, E.Marble, 1);
  for (let x = eL - 12; x < eR + 12; x += 10) box(p, [x, friezeTop + 1, x + 5, friezeTop + 6], E.Marble, 0.4);

  // Frontão: o tímpano recuado, a cornija inclinada clara, a águia entre louros e os acrotérios.
  const half = eR - cx + 14;
  poly(p, [[eL - 14, cornTop], [eR + 14, cornTop], [cx, apex]], E.Marble, (x, y) => 0.62 - (x - cx) / 3000);
  poly(p, [[eL + 30, cornTop - 4], [eR - 30, cornTop - 4], [cx, apex + 22]], E.Marble, (x, y) => 0.44 + (sn(x, y, 32, 658) - 0.5) * 0.06);
  for (let x = eL - 14; x <= eR + 14; x++) {
    const y = cornTop - (1 - Math.abs(x - cx) / half) * (cornTop - apex);
    for (let k = 0; k < 12; k++) p.on(x, y + k, E.Marble, k < 2 ? (x < cx ? 5 : 3) : k > 9 ? 1 : 3);
  }
  const ex = cx, ey = cornTop - 50;
  for (const dir of [-1, 1]) {
    poly(p, [[ex, ey - 4], [ex + dir * 56, ey - 30], [ex + dir * 70, ey - 18], [ex + dir * 48, ey + 4], [ex + dir * 10, ey + 10]], E.Gold, () => (dir < 0 ? 0.6 : 0.46));
    for (let k = 0; k < 5; k++) line(p, [ex + dir * (16 + k * 9), ey - 4 - k * 4], [ex + dir * (20 + k * 9), ey + 6 - k * 2], E.Gold, 1);
    // Ramo de louro: o galho em arco e as folhas aos pares, inclinadas para fora.
    for (let a = 0; a < 1.5; a += 0.05) p.on(ex + dir * (78 + Math.sin(a) * 20), ey + 30 - a * 32, E.Bark, 2);
    for (let a = 0.1; a < 1.5; a += 0.16)
      for (const side of [-1, 1]) {
        const bx = ex + dir * (78 + Math.sin(a) * 20), by = ey + 30 - a * 32;
        const lx = bx + side * 6, ly = by - 3;
        for (let t = 0; t < 7; t++) { p.px(bx + (lx - bx) * (t / 6), by + (ly - by) * (t / 6), E.Ivy, t < 2 ? 2 : t < 5 ? 3 : 4); p.px(bx + (lx - bx) * (t / 6), by + (ly - by) * (t / 6) + 1, E.Ivy, 2); }
      }
  }
  ellipse(p, ex, ey, 12, 18, E.Gold);
  ellipse(p, ex, ey - 22, 8, 8, E.Gold);
  poly(p, [[ex + 6, ey - 24], [ex + 16, ey - 20], [ex + 6, ey - 18]], E.Gold, () => 0.5);
  for (const [ax, ay] of [[eL - 14, cornTop], [cx, apex]] as const) p.together(() => { ellipse(p, ax, ay - 12, 12, 14, E.Marble); limb(p, [ax - 10, ay - 6], [ax + 10, ay - 6], 4, 4, E.Marble); });

  // O canto leste desabou: apaga o que caiu e quebra a beira.
  for (let y = 0; y < colTop + 21; y++) for (let x = 860; x < p.w; x++) if (p.has(x, y) && collapse(x, y)) p.mat[y * p.w + x] = -1;
  // Onde o telhado caiu, o alto da parede da cela ficou em dentes.
  for (let x = 900; x < W - 60; x++) {
    const cut = Math.floor(noise(x >> 3, 9, 657) * 40 + Math.max(0, x - 900) * 0.1);
    for (let y = archTop; y < archTop + cut; y++) if (p.has(x, y) && !cols.some((c) => Math.abs(x - c) <= r + 16)) p.mat[y * p.w + x] = -1;
    if (p.has(x, archTop + cut) && !cols.some((c) => Math.abs(x - c) <= r + 16)) p.on(x, archTop + cut, null, 4);
  }
  // Rachadura no frontão e na arquitrave.
  let crx = cx - 150;
  for (let y = apex + 40; y < colTop; y++) {
    if (noise(y >> 2, 5, 659) < 0.4) crx += noise(y, 5, 660) < 0.5 ? -1 : 1;
    p.on(crx, y, E.Void, 1); p.on(crx + 1, y, null, 4);
  }
  // Hera caindo da cornija (do lado oeste) e a figueira no frontão.
  ivy(p, 70, 300, archTop + 34, 110, 21);
  ivy(p, 760, 860, archTop + 34, 60, 22);
  const fx = cx - 210, fy = cornTop - (1 - Math.abs(fx - cx) / half) * (cornTop - apex);
  limb(p, [fx, fy + 4], [fx - 10, fy - 30], 3, 2, E.Bark);
  limb(p, [fx - 6, fy - 16], [fx + 18, fy - 34], 2, 1.5, E.Bark);
  for (let k = 0; k < 9; k++) ellipse(p, fx - 18 + noise(k, 1, 661) * 40, fy - 30 - noise(1, k, 662) * 26, 8, 6, E.Leaf);
  return p.render(true);
}

/** Chama de braseiro ou tocha (4 quadros), em tons de fogo, para piscar por cima da bacia. */
export const FLAME = { w: 64, h: 96 } as const;
export function flameFrame(k: number): Uint8ClampedArray {
  const p = paper(FLAME.w, FLAME.h);
  const cx = FLAME.w / 2, foot = FLAME.h - 8;
  for (let tongue = 0; tongue < 5; tongue++) {
    const ox = (tongue - 2) * 8 + Math.sin(k * 1.7 + tongue) * 3;
    const h = 46 + noise(k, tongue, 670) * 30 - Math.abs(tongue - 2) * 9;
    p.fill([cx + ox - 12, foot - h, cx + ox + 12, foot], (x, y) => {
      const t = (foot - y) / h;
      const w = 11 * (1 - t) ** 0.8 * (t < 0.15 ? t / 0.15 + 0.3 : 1);
      return Math.abs(x - (cx + ox + Math.sin(t * 5 + k) * 3 * t)) < w;
    }, E.Fire, (x, y) => 0.5 + ((foot - y) / h) * 0.45);
  }
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (!p.has(x, y)) continue;
      const core = Math.abs(x - cx) < 7 && y > foot - 34;
      if (core) p.on(x, y, E.Gold, 5);
    }
  return p.render(false);
}

// --- Subterrâneo -----------------------------------------------------------------------

export const PILLAR = { w: HD, h: HD + 200 } as const;

/** Pilar das catacumbas: pilastra de cantaria com o capitel em bloco e o começo dos arcos da abóbada; `torch`: tocha presa na frente. */
export function pillarSprite(v: number, torch: boolean): Uint8ClampedArray {
  const p = paper(PILLAR.w, PILLAR.h);
  const cx = HD / 2, foot = PILLAR.h - 30;
  const w = 26;
  const top = foot - 250;
  // Arcos da abóbada saindo do capitel (cortados na beira do quadro).
  for (const dir of [-1, 1])
    p.fill([dir < 0 ? 0 : cx, top - 30, dir < 0 ? cx : HD - 1, top + 40], (x, y) => {
      const d = Math.abs(x - cx);
      return y > top - 26 + d * 0.3 && y < top + 8 + d * 0.5;
    }, E.Wall, (x, y) => 0.4 - Math.abs(x - cx) / 300);
  box(p, [cx - w, top, cx + w, foot - 12], E.Wall, (x) => 0.56 - (x - (cx - w)) / (w * 2) * 0.22, (x, y) => {
    const ry = foot - y;
    return mod(ry, 26) === 0 || (mod(ry, 52) < 26 ? Math.abs(x - cx) < 1 : false) ? -2 : noise(x, y, 680 + v) < 0.05 ? -1 : 0;
  });
  for (let y = top; y < foot - 12; y++) { p.on(cx - w, y, null, 5); p.on(cx + w, y, null, 1); }
  box(p, [cx - w - 8, top - 16, cx + w + 8, top], E.Wall, FLAT);
  hline(p, cx - w - 8, cx + w + 8, top - 16, E.Wall, 5);
  hline(p, cx - w - 8, cx + w + 8, top, E.Wall, 1);
  box(p, [cx - w - 6, foot - 12, cx + w + 6, foot], E.Wall, 0.5);
  hline(p, cx - w - 6, cx + w + 6, foot - 12, E.Wall, 4);
  // Umidade e pó no pé.
  for (let y = foot - 40; y < foot; y++) for (let x = cx - w - 6; x <= cx + w + 6; x++) if (p.has(x, y) && noise(x >> 1, y >> 1, 681) < 0.25) p.on(x, y, E.Bone, 2);
  if (v % 2) for (let k = 0; k < 4; k++) { const rx = cx - 20 + k * 13; for (let y = top; y < top + 40 + k * 14; y++) p.on(rx + Math.round(Math.sin(y / 6 + k) * 2), y, E.Bark, 2); }
  if (torch) {
    limb(p, [cx, top + 106], [cx, top + 92], 3, 3, E.Iron);
    limb(p, [cx - 8, top + 96], [cx + 8, top + 96], 2, 2, E.Iron);
    limb(p, [cx, top + 94], [cx, top + 70], 4, 5, E.Bark);
  }
  return p.render(true);
}
/** Onde fica a chama da tocha no pilar (px do quadro). */
export const PILLAR_TORCH: Pt = [PILLAR.w / 2, PILLAR.h - 30 - 250 + 70];

export const SARCOPHAGUS = { w: HD, h: HD + 90 } as const;

/** Sarcófago de mármore encostado no fundo do ossário: caixa com estrígilos e guirlanda, a tampa de duas águas deslocada. */
export function sarcophagusSprite(v: number): Uint8ClampedArray {
  const p = paper(SARCOPHAGUS.w, SARCOPHAGUS.h);
  const foot = SARCOPHAGUS.h - 26;
  const x0 = 12, x1 = HD - 13;
  box(p, [x0, foot - 54, x1, foot], E.Marble, (x, y) => 0.5 - ((y - (foot - 54)) / 54) * 0.1, (x, y) => (noise(x, y, 690) < 0.04 ? -1 : 0));
  // Estrígilos (ondas em S) e a guirlanda no meio.
  for (let x = x0 + 6; x < x1 - 6; x++) {
    if (Math.abs(x - HD / 2) < 14) continue;
    for (let y = foot - 48; y < foot - 8; y++) if (mod(Math.round(x + Math.sin((y - foot) / 7) * 5), 6) === 0) p.on(x, y, null, 1);
  }
  ellipse(p, HD / 2, foot - 28, 10, 12, E.Ivy);
  box(p, [x0, foot - 54, x1, foot - 50], E.Marble, FLAT + 0.1);
  // Tampa deslocada (escorregou para a direita), mostrando o escuro e um osso.
  const shift = 10 + v * 6;
  box(p, [x0 + 4, foot - 60, x0 + shift + 2, foot - 54], E.Void, 0.1);
  limb(p, [x0 + 6, foot - 58], [x0 + shift, foot - 56], 1.6, 1.6, E.Bone);
  p.together(() => {
    poly(p, [[x0 + shift - 4, foot - 56], [x1 + shift - 4, foot - 56], [x1 + shift - 12, foot - 74], [x0 + shift + 4, foot - 74]], E.Marble, () => FLAT + 0.06);
    box(p, [x0 + shift - 6, foot - 60, x1 + shift - 2, foot - 54], E.Marble, 0.5);
  });
  for (const ax of [x0 + shift - 2, x1 + shift - 8]) ellipse(p, ax, foot - 64, 5, 7, E.Marble);
  return p.render(true);
}

export const MOSAIC_TILES = { w: 11, h: 9 } as const;

/**
 * Mosaico do santuário (11×9 tiles, no chão, por baixo do boss): borda de grega, o campo de tesselas escuras com o sol
 * de raios dourados e vermelhos e, no medalhão de lápis-lazúli, a águia do império. Falhas onde as tesselas soltaram
 * (a argamassa aparece) e rachaduras. Sem contorno.
 */
export function mosaicImage(): Uint8ClampedArray {
  const W = MOSAIC_TILES.w * HD, H = MOSAIC_TILES.h * HD;
  const p = paper(W, H);
  const cx = W / 2, cy = H / 2;
  const T = 6; // tessela
  p.fill([0, 0, W - 1, H - 1], (x, y) => {
    const ex = Math.min(x, W - 1 - x), ey = Math.min(y, H - 1 - y);
    return Math.min(ex, ey) > 6 && !(ex < 40 && ey < 40 && Math.hypot(40 - ex, 40 - ey) > 34);
  }, E.Void, () => 0.5);
  // Cada tessela é calculada uma vez (cor e tom) e pintada nos seus 6×6 px, com a argamassa em cima e à esquerda.
  for (let ty = 0; ty < Math.ceil(H / T); ty++)
    for (let tx = 0; tx < Math.ceil(W / T); tx++) {
      const qx = tx * T + T / 2, qy = ty * T + T / 2;
      const border = Math.min(qx, W - qx, qy, H - qy);
      let mat = E.Void;
      let tone = 2;
      if (border < 70) {
        // Grega (meandro) em tesselas claras sobre o escuro.
        const bx = Math.floor((border - 14) / 8);
        const along = Math.floor((qy < 70 || qy > H - 70 ? qx : qy) / 8);
        const key = mod(along, 6);
        const meander = border >= 14 && border < 62 && (bx === 0 || bx === 5 || (key === 0 && bx < 5) || (bx === 2 && key < 4) || (key === 3 && bx >= 2));
        mat = meander ? E.Marble : border < 14 ? E.Terracotta : E.Void;
        tone = meander ? 4 : 2;
      } else {
        const dx = qx - cx, dy = (qy - cy) * 1.25;
        const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const ray = mod(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 32), 2);
        tone = 1 + (noise(tx, ty, 699) < 0.35 ? 1 : 0);
        if (d < 170) {
          mat = E.Lapis; tone = 2 + (noise(tx, ty, 700) < 0.3 ? 1 : 0);
          if (d > 156) { mat = E.Gold; tone = 4; }
        } else if (d < 500) {
          const lenRay = ray ? 500 : 400;
          if (Math.abs(d - 178) < 5) { mat = E.Marble; tone = 4; }
          else if (d < lenRay) {
            const w = (1 - (d - 170) / (lenRay - 170)) * 0.18;
            const ang = mod(((a + Math.PI) / (Math.PI * 2)) * 32, 1);
            if (Math.abs(ang - 0.5) < w * 2.5) { mat = ray ? E.Gold : E.Terracotta; tone = ray ? 3 + (noise(tx, ty, 701) < 0.3 ? 1 : 0) : 3; }
          }
        }
        // Águia no medalhão: asas abertas, corpo e cabeça, em ouro.
        const ux = dx / 130, uy = dy / 130;
        const wing = Math.abs(uy + 0.15 - Math.abs(ux) * 0.45) < 0.16 && Math.abs(ux) < 0.95 && Math.abs(ux) > 0.08;
        const body = (ux * ux) / 0.03 + (uy - 0.15) ** 2 / 0.3 < 1;
        const head = ux * ux + (uy + 0.55) ** 2 < 0.03;
        if (d < 156 && (wing || body || head)) { mat = E.Gold; tone = ux < 0 ? 4 : 2; }
      }
      const lost = sn(qx, qy, 64, 702) > 0.7 && noise(tx, ty, 703) < 0.7;
      tone = Math.max(1, Math.min(5, tone + (noise(tx, ty, 705) < 0.15 ? -1 : 0)));
      for (let ly = 0; ly < T; ly++)
        for (let lx = 0; lx < T; lx++) {
          const x = tx * T + lx, y = ty * T + ly;
          if (x >= W || y >= H) continue;
          const i = y * W + x;
          if (p.mat[i] < 0) continue;
          if (lx === 0 || ly === 0) { p.mat[i] = mat === E.Void ? E.Void : E.Mortar; p.fixed[i] = mat === E.Void ? 0 : 1; continue; }
          if (lost) { p.mat[i] = E.Mortar; p.fixed[i] = noise(tx, ty, 704) < 0.5 ? 2 : 3; continue; }
          p.mat[i] = mat;
          p.fixed[i] = lx === 1 && ly === 1 ? Math.min(5, tone + 1) : tone;
        }
    }
  for (let k = 0; k < 4; k++) {
    let x = 200 + noise(k, 1, 706) * (W - 400), y = 150 + noise(1, k, 707) * (H - 300), a = noise(k, 2, 708) * Math.PI * 2;
    for (let s = 0; s < 60; s++) {
      a += (noise(s, k, 709) - 0.5) * 0.8;
      const nx = x + Math.cos(a) * 4, ny = y + Math.sin(a) * 4;
      line(p, [x, y], [nx, ny], E.Void, 0);
      x = nx; y = ny;
    }
  }
  return p.render(false, 235);
}

// --- Enfeites de pé baixos (andáveis) ---------------------------------------------------

export const SMALL = { w: HD, h: HD + 64 } as const;
export const SMALL_DECOR = ["acanthus", "shrub", "amphora", "head", "grass", "urns", "skulls"] as const;
export type SmallDecor = (typeof SMALL_DECOR)[number];

/** Enfeite de pé de 1 tile (sobe até meio tile acima): acanto, arbusto, ânfora, cabeça de estátua, capim alto, urnas, caveiras. */
export function smallDecor(kind: SmallDecor, v: number): Uint8ClampedArray {
  const p = paper(SMALL.w, SMALL.h);
  const B = SMALL.h - 30;
  const r = (k: number) => noise(k, v, 720 + SMALL_DECOR.indexOf(kind));
  switch (kind) {
    case "acanthus":
      // Acanto: folhas largas recortadas arqueando para fora (a planta dos capitéis).
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.42;
        const len = 38 + r(k) * 18;
        const tip: Pt = [64 + Math.cos(a) * len * 1.2, B + Math.sin(a) * len * 0.8];
        p.together(() => {
          limb(p, [64, B], tip, 7, 2, E.Clover);
          for (let s = 1; s < 5; s++) {
            const t = s / 5;
            const qx = 64 + (tip[0] - 64) * t, qy = B + (tip[1] - B) * t;
            ellipse(p, qx + (k < 3 ? -4 : 4), qy - 2, 6 - t * 3, 4, E.Clover);
          }
        });
        line(p, [64, B], tip, null, 4);
      }
      break;
    case "shrub":
      for (let k = 0; k < 6; k++) ellipse(p, 46 + r(k) * 36, B - 14 - r(k + 6) * 26, 14 + r(k + 2) * 6, 11 + r(k + 3) * 4, k % 3 ? E.Bush : E.Leaf);
      break;
    case "amphora":
      // Ânfora tombada encostada, com a boca quebrada.
      p.together(() => {
        limb(p, [40, B - 8], [86, B - 34], 15, 9, E.Terracotta);
        limb(p, [86, B - 34], [100, B - 44], 5, 5, E.Terracotta);
        limb(p, [34, B - 4], [28, B + 2], 4, 2, E.Terracotta);
      });
      limb(p, [82, B - 40], [92, B - 26], 2, 2, E.Terracotta);
      for (let k = 0; k < 4; k++) ellipse(p, 60 + r(k) * 40, B + 4 - r(k + 4) * 6, 4, 3, E.Terracotta);
      break;
    case "head":
      // Cabeça de estátua tombada no capim: perfil de mármore com o louro, o nariz quebrado.
      p.together(() => { ellipse(p, 62, B - 22, 24, 20, E.Marble); ellipse(p, 80, B - 12, 10, 8, E.Marble); });
      p.on(56, B - 24, E.Vein, 1); p.on(57, B - 24, E.Vein, 1); hline(p, 52, 60, B - 30, E.Vein, 2);
      for (let a = 3.4; a < 5.8; a += 0.2) { const x = 62 + Math.cos(a) * 22, y = B - 22 + Math.sin(a) * 18; p.on(x, y, E.Ivy, 3); p.on(x, y - 1, E.Ivy, 4); }
      for (let x = 40; x < 90; x++) if (noise(x, 1, 730) < 0.6) for (let s = 0; s < 3 + (x % 4); s++) p.on(x, B - s, E.Grass, s === 0 ? 2 : 4);
      break;
    case "grass":
      for (let k = 0; k < 16; k++) {
        const bx = 34 + r(k) * 60;
        limb(p, [bx, B], [bx + (r(k + 1) - 0.5) * 26, B - 26 - r(k + 2) * 26], 2, 0.6, k % 3 ? E.Grass : E.Dry);
      }
      break;
    case "urns":
      for (let k = 0; k < 3; k++) {
        const ux = 36 + k * 28, h = 26 + r(k) * 12;
        p.together(() => {
          ellipse(p, ux, B - h / 2, 11, h / 2, E.Terracotta);
          box(p, [ux - 5, B - h - 6, ux + 5, B - h + 2], E.Terracotta, 0.55);
        });
      }
      break;
    case "skulls":
      for (let k = 0; k < 6; k++) {
        const sx = 36 + (k % 3) * 22 + (k > 2 ? 11 : 0), sy = B - 8 - (k > 2 ? 16 : 0);
        ellipse(p, sx, sy, 10, 9, E.Bone);
        p.on(sx - 4, sy, E.Void, 1); p.on(sx + 3, sy, E.Void, 1);
      }
      break;
  }
  return p.render(true);
}
