// @ts-nocheck -- roda só no navegador do gerador (scripts/verdemar.ts), fora do typecheck do cliente.
import { EDGES, EDGE_D, FOG, FOG_EDGE, H, LABELS, NODES, PLACES, W } from "../src/world/verdemar.ts";

/**
 * Desenha a carta de Verdemar (o continente da campanha) e devolve o SVG em texto. Tudo vem de sorteios com semente:
 * a mesma entrada dá o mesmo desenho. Fica fora do jogo: `npm run mapa -w @kusa/client` roda isto num navegador e
 * grava `public/mapa/verdemar.svg`; o jogo só carrega a imagem pronta (desenhar no celular levaria segundos).
 * Trilhas, nomes de região, pontos e o herói não estão aqui: worldMap.ts desenha por cima.
 */
export function drawVerdemar() {
  const NS = "http://www.w3.org/2000/svg";
  // ---------------------------------------------------------------------------
  // Ferramentas: sorteio com semente, ruído, curvas.
  let seed = 1977;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const rr = (a, b) => a + rnd() * (b - a);
  const perm = new Uint8Array(512);
  {
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const hash = (i, j) => perm[(perm[i & 255] + j) & 255] / 255;
  const fade = (t) => t * t * (3 - 2 * t);
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = fade(x - xi), yf = fade(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  const fbm = (x, y) => (vnoise(x, y) + 0.5 * vnoise(x * 2.03, y * 2.03) + 0.25 * vnoise(x * 4.1, y * 4.1)) / 1.75;
  const f1 = (n) => n.toFixed(1);

  /** Catmull-Rom → Bézier (aberta ou fechada). */
  const smooth = (pts, closed = false) => {
    const n = pts.length, at = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return closed ? d + "Z" : d;
  };
  /** Costa fractal: cada lado ganha pontos no meio, empurrados para fora ou para dentro. */
  const fractal = (pts, levels, rough, closed = true) => {
    let cur = pts;
    for (let l = 0; l < levels; l++) {
      const next = [];
      const n = closed ? cur.length : cur.length - 1;
      for (let i = 0; i < n; i++) {
        const a = cur[i], b = cur[(i + 1) % cur.length];
        next.push(a);
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        const off = (rnd() - 0.5) * 2 * len * rough;
        next.push([(a[0] + b[0]) / 2 - (dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off]);
      }
      if (!closed) next.push(cur[cur.length - 1]);
      cur = next;
    }
    return cur;
  };
  const poly = (pts) => "M" + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L") + "Z";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.append(n);
    return n;
  };

  // ---------------------------------------------------------------------------
  // Geografia de Verdemar.
  const COAST_CTRL = [
    [760, 175], [900, 140], [1040, 190], [1180, 165], [1300, 245], [1345, 380], [1290, 505], [1362, 622], [1402, 782], [1352, 902],
    [1404, 1042], [1382, 1202], [1424, 1332], [1372, 1462], [1282, 1512], [1196, 1572], [1188, 1660], [1262, 1722], [1342, 1712],
    [1334, 1852], [1262, 1992], [1142, 2112], [982, 2162], [822, 2142], [652, 2182], [472, 2152], [332, 2082], [252, 1962],
    [272, 1822], [212, 1682], [252, 1532], [202, 1382], [242, 1222], [192, 1082], [232, 942], [172, 822], [232, 682], [202, 562],
    [292, 432], [402, 322], [542, 232], [652, 192],
  ];
  const COAST = fractal(COAST_CTRL, 5, 0.2);
  const ISLES = [
    [[96, 1120], [140, 1090], [170, 1130], [140, 1170], [100, 1160]],
    [[70, 1290], [110, 1270], [130, 1300], [100, 1330]],
    [[118, 1460], [160, 1440], [176, 1480], [150, 1510], [116, 1500]],
    [[1430, 1960], [1470, 1940], [1500, 1975], [1470, 2010], [1436, 2000]],
    [[1442, 560], [1486, 540], [1510, 576], [1478, 606], [1446, 598]],
  ].map((p) => fractal(p, 3, 0.16));
  const CINZA = fractal([[1420, 1050], [1500, 1010], [1570, 1060], [1560, 1150], [1490, 1180], [1420, 1140]], 4, 0.18);
  const LAKES = [
    fractal([[650, 1330], [700, 1270], [790, 1265], [850, 1310], [830, 1380], [740, 1400], [670, 1385]], 4, 0.16),
    fractal([[600, 405], [630, 390], [652, 412], [630, 432], [604, 428]], 3, 0.15),
    fractal([[1236, 1292], [1262, 1282], [1288, 1296], [1270, 1314], [1240, 1310]], 3, 0.15),
  ];
  const meander = (pts, levels = 3) => fractal(pts, levels, 0.13, false);
  const RIVERS = [
    { pts: meander([[640, 560], [690, 700], [664, 850], [702, 1000], [690, 1150], [712, 1272]]), w: [1.6, 3.4] },
    { pts: meander([[792, 1394], [838, 1520], [884, 1660], [862, 1800], [902, 1960], [934, 2146]]), w: [3.4, 5.2], name: "Rio Velho" },
    { pts: meander([[1060, 560], [1104, 700], [1180, 822], [1262, 942], [1330, 1000], [1392, 1040]]), w: [1.6, 4.4], name: "Rio Rubro" },
    { pts: meander([[400, 720], [362, 820], [322, 900], [262, 980], [204, 1060]]), w: [1.4, 3.6] },
    { pts: meander([[486, 1600], [452, 1760], [424, 1900], [384, 2040], [340, 2090]]), w: [1.2, 3.4] },
  ];

  /** Cenários da campanha. Os 4 primeiros existem hoje; o resto é a campanha por vir. */

  // Biomas: cada âncora puxa a terra em volta; as bordas são torcidas por ruído (nada de elipses).
  const B = { forest: 1, grass: 2, desert: 3, bad: 4, mount: 5, snow: 6, wet: 7, ruins: 8, hills: 9 };
  const BIOME_COLOR = {
    1: [176, 190, 134], 2: [222, 214, 164], 3: [238, 210, 146], 4: [222, 182, 136], 5: [210, 200, 178],
    6: [236, 233, 222], 7: [186, 197, 160], 8: [216, 206, 172], 9: [214, 207, 158],
  };
  const ANCHORS = [
    ...[[300, 1950], [430, 1770], [565, 1640], [390, 1500], [320, 1320], [490, 1370], [290, 1160], [575, 1460], [470, 1180], [255, 1640]].map((p) => [...p, B.forest]),
    ...[[300, 990], [430, 925], [255, 860], [365, 815], [345, 2075], [395, 1080]].map((p) => [...p, B.wet]),
    ...[[705, 1700], [830, 1460], [640, 1250], [920, 1330], [990, 1560], [560, 1050], [960, 1720]].map((p) => [...p, B.grass]),
    ...[[800, 1140], [690, 1040], [915, 1030], [830, 940], [640, 940]].map((p) => [...p, B.ruins]),
    ...[[700, 1935], [830, 2060], [590, 2060], [790, 1820], [560, 1900]].map((p) => [...p, B.hills]),
    ...[[1030, 2030], [1160, 1900], [1100, 1510], [1210, 1360], [1160, 1210], [1270, 1110], [1060, 1270], [1240, 1560], [1080, 1840]].map((p) => [...p, B.desert]),
    ...[[1150, 905], [1260, 800], [1050, 830], [1310, 960], [1200, 1010]].map((p) => [...p, B.bad]),
    ...[[560, 650], [790, 690], [660, 525], [905, 525], [1100, 525], [395, 565], [1255, 455], [300, 660], [1000, 660], [480, 780], [1180, 650]].map((p) => [...p, B.mount]),
    ...[[780, 300], [600, 375], [955, 350], [1160, 290], [455, 410], [870, 210]].map((p) => [...p, B.snow]),
  ];
  const biomeAtRaw = (x, y) => {
    const wx = x + (fbm(x / 260, y / 260) - 0.5) * 170, wy = y + (fbm(x / 260 + 40, y / 260 + 40) - 0.5) * 170;
    let best = 1e12, id = 2;
    for (const a of ANCHORS) { const d = (a[0] - wx) ** 2 + (a[1] - wy) ** 2; if (d < best) { best = d; id = a[2]; } }
    return id;
  };

  // ---------------------------------------------------------------------------
  // Máscaras em canvas (terra, lagos) e o grid de biomas.
  const CELL = 2, GW = W / CELL, GH = H / CELL;
  const coastD = poly(COAST), islesD = ISLES.map(poly), lakesD = LAKES.map(poly), cinzaD = poly(CINZA);
  const mask = document.createElement("canvas");
  mask.width = GW; mask.height = GH;
  const mctx = mask.getContext("2d");
  mctx.scale(1 / CELL, 1 / CELL);
  mctx.fillStyle = "#000";
  mctx.fill(new Path2D(coastD));
  mctx.globalCompositeOperation = "destination-out";
  for (const d of lakesD) mctx.fill(new Path2D(d));
  const landData = mctx.getImageData(0, 0, GW, GH).data;
  const isLand = (x, y) => { const i = Math.floor(y / CELL) * GW + Math.floor(x / CELL); return x >= 0 && y >= 0 && x < W && y < H && landData[i * 4 + 3] > 128; };
  // Biomas numa grade de 4 unidades (a pintura usa a mesma grade; a borda é misturada depois).
  const BC = 4, BW = W / BC, BH = H / BC, biome4 = new Uint8Array(BW * BH);
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) biome4[by * BW + bx] = biomeAtRaw(bx * BC + 2, by * BC + 2);
  const biomeAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H || !isLand(x, y) ? 0 : biome4[Math.floor(y / BC) * BW + Math.floor(x / BC)]);

  // Pintura de fundo: mar, terra com as cores dos biomas, grão de papel e manchas. Vira uma imagem só.
  const paint = document.createElement("canvas");
  paint.width = GW; paint.height = GH;
  const pctx = paint.getContext("2d");
  const img = pctx.createImageData(GW, GH);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, x = gx * CELL, y = gy * CELL;
    const grain = (rnd() - 0.5) * 14 + (fbm(x / 90, y / 90) - 0.5) * 26;
    const here = biomeAt(x, y);
    let c;
    if (here) {
      c = BIOME_COLOR[here];
      // Borda entre biomas suavizada: mistura com o vizinho a 6 unidades.
      const nb = biomeAt(x + 6, y + 4);
      if (nb && nb !== here) { const o = BIOME_COLOR[nb]; c = [(c[0] + o[0]) / 2, (c[1] + o[1]) / 2, (c[2] + o[2]) / 2]; }
    } else c = [195, 203, 178];
    const o = i * 4;
    img.data[o] = c[0] + grain; img.data[o + 1] = c[1] + grain * 0.92; img.data[o + 2] = c[2] + grain * 0.7; img.data[o + 3] = 255;
  }
  pctx.putImageData(img, 0, 0);
  // Manchas de papel velho.
  pctx.globalCompositeOperation = "multiply";
  for (let k = 0; k < 26; k++) {
    const x = rnd() * GW, y = rnd() * GH, r = rr(30, 140);
    const g = pctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(160,120,70,${rr(0.05, 0.13)})`); g.addColorStop(1, "rgba(160,120,70,0)");
    pctx.fillStyle = g; pctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  pctx.globalCompositeOperation = "source-over";
  const paintURL = paint.toDataURL("image/jpeg", 0.88);

  // ---------------------------------------------------------------------------
  // SVG: camadas de baixo para cima.
  const svg = el("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true", "font-family": "Georgia, serif" });
  document.body.append(svg);
  const defs = el("defs", {}, svg);
  const landAll = [coastD, ...islesD, cinzaD].join("");
  defs.innerHTML = `
    <clipPath id="mar"><path clip-rule="evenodd" d="M0 0H${W}V${H}H0Z${landAll}"/></clipPath>
    <clipPath id="terra"><path d="${coastD}"/></clipPath>
    <linearGradient id="veu" gradientUnits="userSpaceOnUse" x1="0" y1="${FOG_EDGE}" x2="0" y2="${FOG_EDGE + 190}">
      <stop offset="0" stop-color="#efe7d2" stop-opacity="0.42"/><stop offset="1" stop-color="#efe7d2" stop-opacity="0"/>
    </linearGradient>
    <filter id="nevoa" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>
    <radialGradient id="vinheta" cx="0.5" cy="0.5" r="0.72"><stop offset="0.55" stop-color="#4a3018" stop-opacity="0"/><stop offset="1" stop-color="#4a3018" stop-opacity="0.38"/></radialGradient>`;
  el("image", { href: paintURL, x: 0, y: 0, width: W, height: H, preserveAspectRatio: "none" }, svg);

  // Mar: rumos da rosa dos ventos, ondinhas soltas, linhas de costa e hachura.
  const sea = el("g", { "clip-path": "url(#mar)" }, svg);
  let rumos = "";
  for (const [cx, cy] of [[1460, 2160], [120, 300]]) for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16;
    rumos += `M${cx} ${cy}L${f1(cx + Math.cos(a) * 3000)} ${f1(cy + Math.sin(a) * 3000)}`;
  }
  el("path", { d: rumos, stroke: "var(--ink)", "stroke-width": 0.7, opacity: 0.12, fill: "none" }, sea);
  const ringed = [COAST, ...ISLES, CINZA];
  for (const [w, o] of [[70, 0.1], [50, 0.15], [32, 0.22], [16, 0.32]]) {
    for (const pts of ringed) {
      const d = poly(pts);
      el("path", { d, fill: "none", stroke: "var(--ink)", "stroke-width": w, "stroke-linejoin": "round", opacity: o }, sea);
      el("path", { d, fill: "none", stroke: "#c3cbb2", "stroke-width": w - 2.4, "stroke-linejoin": "round", opacity: 0.92 }, sea);
    }
  }
  let hatch = "";
  for (const pts of ringed) for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length], p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = dy / len, ny = -dx / len;
    if (isLand(p[0] + nx * 4, p[1] + ny * 4)) { nx = -nx; ny = -ny; }
    if (i % 2) continue;
    const l = rr(4, 9);
    hatch += `M${f1(p[0] + nx * 2)} ${f1(p[1] + ny * 2)}l${f1(nx * l)} ${f1(ny * l)}`;
  }
  el("path", { d: hatch, stroke: "var(--ink)", "stroke-width": 0.7, opacity: 0.26, fill: "none" }, sea);
  let waves = "";
  for (let k = 0; k < 2600 && waves.length < 60000; k++) {
    const x = rr(30, W - 30), y = rr(30, H - 30);
    let ok = !isLand(x, y);
    for (let r = 50; ok && r <= 90; r += 40) for (let a = 0; a < 6.28 && ok; a += 1.05) if (isLand(x + Math.cos(a) * r, y + Math.sin(a) * r)) ok = false;
    if (!ok || rnd() > 0.32) continue;
    const s = rr(5, 9);
    waves += `M${f1(x)} ${f1(y)}q${f1(s)} ${f1(-s)} ${f1(2 * s)} 0q${f1(s)} ${f1(s)} ${f1(2 * s)} 0`;
  }
  el("path", { d: waves, stroke: "#6f7f68", "stroke-width": 1.1, fill: "none", opacity: 0.55 }, sea);

  // Terra: sombra por dentro da costa, ilhas.
  const landG = el("g", { "clip-path": "url(#terra)" }, svg);
  el("path", { d: coastD, fill: "none", stroke: "#8f7448", "stroke-width": 26, opacity: 0.22 }, landG);
  el("path", { d: coastD, fill: "none", stroke: "#8f7448", "stroke-width": 10, opacity: 0.25 }, landG);
  for (const d of islesD) el("path", { d, fill: "#ddd6b0", stroke: "var(--ink)", "stroke-width": 1.6 }, svg);

  // Água doce: lagos com anéis, rios afinando até a nascente.
  const water = el("g", {}, svg);
  for (const d of lakesD) {
    el("path", { d, fill: "#a9bdb2", stroke: "var(--ink)", "stroke-width": 1.6 }, water);
    el("path", { d, fill: "none", stroke: "#c2d0c4", "stroke-width": 7, opacity: 0.7, "clip-path": "url(#terra)", transform: "" }, water);
  }
  const riverPaths = [];
  for (const r of RIVERS) {
    const n = r.pts.length, parts = 4;
    for (let k = 0; k < parts; k++) {
      const seg = r.pts.slice(Math.floor((k * (n - 1)) / parts), Math.floor(((k + 1) * (n - 1)) / parts) + 2);
      const w = r.w[0] + ((r.w[1] - r.w[0]) * k) / (parts - 1);
      const d = smooth(seg);
      el("path", { d, fill: "none", stroke: "var(--ink)", "stroke-width": w + 2.2, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.85 }, water);
      riverPaths.push({ d, w });
    }
    for (const { d, w } of riverPaths.splice(-parts)) el("path", { d, fill: "none", stroke: "#9fb6ae", "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, water);
  }
  const riverPts = RIVERS.flatMap((r) => {
    const out = [];
    for (let i = 0; i < r.pts.length - 1; i++) for (let t = 0; t < 1; t += 0.25) out.push([r.pts[i][0] + (r.pts[i + 1][0] - r.pts[i][0]) * t, r.pts[i][1] + (r.pts[i + 1][1] - r.pts[i][1]) * t]);
    return out;
  });

  // ---------------------------------------------------------------------------
  // Trilhas: curvas orgânicas entre cenários. Cada aresta guarda os pontos para afastar os desenhos dela.
  const keep = []; // [x, y, raio]: lugares onde nada é desenhado por cima
  for (const [a, b] of EDGES) {
    const p = el("path", { d: EDGE_D[a + b] }, defs), len = p.getTotalLength();
    for (let s = 0; s <= len; s += 8) { const q = p.getPointAtLength(s); keep.push([q.x, q.y, 13]); }
  }
  for (const n of Object.values(NODES)) {
    keep.push([n.x, n.y, n.map || n.final ? 46 : 34]);
    const half = (n.name.length * (n.map ? 4.4 : 3.8)) + 8;
    for (let dx = -half; dx <= half; dx += 14) keep.push([n.x + dx, n.y + (n.map ? 44 : 34), 12]);
  }
  for (const [x, y] of riverPts) keep.push([x, y, 7]);

  // Nomes (desenhados por cima, em worldMap.ts): os desenhos ficam longe deles.
  const labelPath = (d) => { const p = el("path", { d }, defs); return p; };
  LABELS.forEach((l, i) => {
    const p = labelPath(l.d);
    p.id = `rot${i}`;
    const len = p.getTotalLength();
    for (let s = 0; s <= len; s += 12) { const q = p.getPointAtLength(s); keep.push([q.x, q.y - l.size * 0.3, l.size * 0.55]); }
  });
  for (const p of PLACES) { const half = p.text.length * (p.big ? 5 : 3.6); for (let dx = -half; dx <= half; dx += 10) keep.push([p.x + dx, p.y - 5, p.big ? 11 : 8]); }

  // Grade de espaço ocupado: cada desenho reserva um círculo; nada nasce em cima de outro.
  const GRID = 24, cols = Math.ceil(W / GRID), occ = new Map();
  const free = (x, y, r) => {
    const gx = Math.floor(x / GRID), gy = Math.floor(y / GRID);
    for (let j = gy - 2; j <= gy + 2; j++) for (let i = gx - 2; i <= gx + 2; i++) {
      for (const o of occ.get(j * cols + i) || []) if ((o[0] - x) ** 2 + (o[1] - y) ** 2 < (o[2] + r) ** 2) return false;
    }
    return true;
  };
  const take = (x, y, r) => { const k = Math.floor(y / GRID) * cols + Math.floor(x / GRID); (occ.get(k) || occ.set(k, []).get(k)).push([x, y, r]); };
  for (const k of keep) take(...k);

  // ---------------------------------------------------------------------------
  // Desenhos à mão. Cada um vira texto SVG; no fim, tudo ordenado de cima para baixo (o de baixo cobre o de cima).
  const glyphs = []; // [y, svg]
  let flat = { tufts: "", dunes: "", dots: "", hills: "", fields: "", blocks: "", pools: "", dead: "", rocks: "", shadows: "", crack: "" };
  const INK = "#3f2c1a";

  const tree = (x, y, r, tint) => {
    const cy = y - r * 1.25, k = 7, rot = rnd() * 6.28;
    let d = "";
    for (let i = 0; i <= k; i++) {
      const a = rot + (i / k) * 6.283, px = x + Math.cos(a) * r, py = cy + Math.sin(a) * r * 0.92;
      d += i ? `A${f1(r * 0.42)} ${f1(r * 0.42)} 0 0 1 ${f1(px)} ${f1(py)}` : `M${f1(px)} ${f1(py)}`;
    }
    const fill = tint || ["#7d9663", "#6f8a58", "#86a06a", "#748f5c"][Math.floor(rnd() * 4)];
    flat.shadows += `M${f1(x - r * 0.9)} ${f1(y)}a${f1(r * 0.9)} ${f1(r * 0.3)} 0 1 0 ${f1(r * 1.8)} 0a${f1(r * 0.9)} ${f1(r * 0.3)} 0 1 0 ${f1(-r * 1.8)} 0`;
    glyphs.push([y, `<path d="M${f1(x)} ${f1(y)}v${f1(-r * 0.6)}" stroke="${INK}" stroke-width="1.5"/><path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="1.05"/><path d="M${f1(x + r * 0.05)} ${f1(cy + r * 0.62)}a${f1(r * 0.8)} ${f1(r * 0.8)} 0 0 0 ${f1(r * 0.72)} ${f1(-r * 0.66)}" fill="none" stroke="#3e5532" stroke-width="${f1(r * 0.3)}" opacity="0.45" stroke-linecap="round"/><path d="M${f1(x - r * 0.5)} ${f1(cy - r * 0.18)}q${f1(r * 0.3)} ${f1(-r * 0.42)} ${f1(r * 0.7)} ${f1(-r * 0.3)}" fill="none" stroke="#c3d2a3" stroke-width="1.2" stroke-linecap="round"/>`]);
  };
  const pine = (x, y, h, snow) => {
    if (!isLand(x, y - h)) return;
    const w = h * 0.36;
    flat.shadows += `M${f1(x - w)} ${f1(y)}a${f1(w)} ${f1(w * 0.3)} 0 1 0 ${f1(2 * w)} 0a${f1(w)} ${f1(w * 0.3)} 0 1 0 ${f1(-2 * w)} 0`;
    const d = `M${f1(x)} ${f1(y - h)}L${f1(x + w * 0.55)} ${f1(y - h * 0.62)}L${f1(x + w * 0.3)} ${f1(y - h * 0.64)}L${f1(x + w * 0.85)} ${f1(y - h * 0.3)}L${f1(x + w * 0.45)} ${f1(y - h * 0.32)}L${f1(x + w)} ${f1(y - h * 0.06)}H${f1(x - w)}L${f1(x - w * 0.45)} ${f1(y - h * 0.32)}L${f1(x - w * 0.85)} ${f1(y - h * 0.3)}L${f1(x - w * 0.3)} ${f1(y - h * 0.64)}L${f1(x - w * 0.55)} ${f1(y - h * 0.62)}Z`;
    glyphs.push([y, `<path d="M${f1(x)} ${f1(y)}v${f1(-h * 0.1)}" stroke="${INK}" stroke-width="1.4"/><path d="${d}" fill="${snow ? "#7f9483" : "#55704b"}" stroke="${INK}" stroke-width="1"/><path d="M${f1(x)} ${f1(y - h)}L${f1(x + w)} ${f1(y - h * 0.06)}H${f1(x + w * 0.2)}Z" fill="#2f4229" opacity="0.35"/>${snow ? `<path d="M${f1(x)} ${f1(y - h)}L${f1(x + w * 0.4)} ${f1(y - h * 0.7)}L${f1(x - w * 0.4)} ${f1(y - h * 0.7)}Z" fill="#f6f3ea"/>` : ""}`]);
  };
  const mountain = (x, y, s, snowy) => {
    if (!isLand(x, y - s * 1.35) || !isLand(x - s, y) || !isLand(x + s, y)) return;
    const px = x + rr(-0.15, 0.15) * s, py = y - s * rr(1.0, 1.3);
    const l = [x - s, y], r = [x + s, y];
    const sh = [x + s * rr(0.05, 0.3), y];
    const ridge = `M${f1(l[0])} ${f1(l[1])}L${f1(x - s * 0.55)} ${f1(y - s * 0.45)}L${f1(x - s * 0.42)} ${f1(y - s * 0.5)}L${f1(px)} ${f1(py)}L${f1(x + s * 0.4)} ${f1(y - s * 0.55)}L${f1(x + s * 0.55)} ${f1(y - s * 0.4)}L${f1(r[0])} ${f1(r[1])}`;
    let hz = "";
    for (let k = 1; k <= 6; k++) {
      const t = k / 7, ax = px + (r[0] - px) * t, ay = py + (r[1] - py) * t;
      hz += `M${f1(ax)} ${f1(ay)}L${f1(ax - s * 0.22)} ${f1(Math.min(y, ay + s * 0.3))}`;
    }
    const snowCap = snowy ? `<path d="M${f1(px)} ${f1(py)}L${f1(px + s * 0.3)} ${f1(py + s * 0.34)}L${f1(px + s * 0.12)} ${f1(py + s * 0.28)}L${f1(px)} ${f1(py + s * 0.4)}L${f1(px - s * 0.14)} ${f1(py + s * 0.3)}L${f1(px - s * 0.3)} ${f1(py + s * 0.36)}Z" fill="#fbf9f2" stroke="${INK}" stroke-width="0.6"/>` : "";
    flat.shadows += `M${f1(x - s)} ${f1(y)}a${f1(s)} ${f1(s * 0.18)} 0 1 0 ${f1(2 * s)} 0a${f1(s)} ${f1(s * 0.18)} 0 1 0 ${f1(-2 * s)} 0`;
    glyphs.push([y, `<path d="${ridge}Z" fill="${snowy ? "#ebe7dc" : "#e3d9c0"}"/><path d="M${f1(px)} ${f1(py)}L${f1(x + s * 0.4)} ${f1(y - s * 0.55)}L${f1(x + s * 0.55)} ${f1(y - s * 0.4)}L${f1(r[0])} ${f1(r[1])}L${f1(sh[0])} ${f1(sh[1])}Z" fill="${snowy ? "#b7b7b0" : "#b4a688"}"/><path d="${hz}" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>${snowCap}<path d="${ridge}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${f1(px)} ${f1(py)}L${f1(sh[0] - s * 0.1)} ${f1(y - s * 0.2)}" stroke="${INK}" stroke-width="0.9" opacity="0.7"/>`]);
  };
  const mesa = (x, y, s) => {
    const top = y - s * rr(0.7, 0.95), w = s * rr(1, 1.4);
    let v = "";
    for (let k = -3; k <= 3; k++) v += `M${f1(x + (k * w) / 4)} ${f1(top + s * 0.1)}v${f1((y - top) * rr(0.5, 0.85))}`;
    glyphs.push([y, `<path d="M${f1(x - w)} ${f1(y)}L${f1(x - w * 0.8)} ${f1(top + s * 0.08)}H${f1(x + w * 0.85)}L${f1(x + w)} ${f1(y)}Z" fill="#c68f62" stroke="${INK}" stroke-width="1.3"/><path d="${v}" stroke="${INK}" stroke-width="0.8" opacity="0.5"/><path d="M${f1(x + w * 0.3)} ${f1(top + s * 0.08)}H${f1(x + w * 0.85)}L${f1(x + w)} ${f1(y)}H${f1(x + w * 0.45)}Z" fill="#8f5a3c" opacity="0.45"/><ellipse cx="${f1(x + w * 0.02)}" cy="${f1(top + s * 0.08)}" rx="${f1(w * 0.83)}" ry="${f1(s * 0.16)}" fill="#e2b58a" stroke="${INK}" stroke-width="1.2"/>`]);
  };
  const column = (x, y, h) => `<path d="M${f1(x - 4.5)} ${f1(y)}v${f1(-h)}l2.5-3.5 2 2.5 2.5-4 2 5v${f1(h)}Z" fill="#f1ead8" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - 6.5)} ${f1(y)}h13" stroke="${INK}" stroke-width="1.5"/>`;
  const ruin = (x, y) => {
    const kind = Math.floor(rnd() * 4);
    if (kind === 0) glyphs.push([y, column(x - 9, y, rr(12, 22)) + column(x + 6, y, rr(6, 14))]);
    else if (kind === 1) glyphs.push([y, `<path d="M${f1(x - 15)} ${f1(y)}v-18a15 15 0 0 1 30 0v18h-6v-17a9 9 0 0 0 -18 0v17Z" fill="#e8dfc8" stroke="${INK}" stroke-width="1.2"/><path d="M${f1(x + 9)} ${f1(y - 25)}l6 3" stroke="${INK}" stroke-width="1"/>`]);
    else if (kind === 2) glyphs.push([y, `<path d="M${f1(x - 18)} ${f1(y)}v-9l4-3v-4l5 2v6l6-2v-7l4 1v13Zm22 0v-6l5-2 3 4v4Z" fill="#ddd2b6" stroke="${INK}" stroke-width="1.1"/>`]);
    else glyphs.push([y, `<path d="M${f1(x - 8)} ${f1(y)}h16l-2-4h-12Z" fill="#cbbf9f" stroke="${INK}" stroke-width="1"/><circle cx="${f1(x)}" cy="${f1(y - 10)}" r="6" fill="#ece4cf" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - 2.5)} ${f1(y - 11)}h1M${f1(x + 1.5)} ${f1(y - 11)}h1M${f1(x - 2)} ${f1(y - 7.5)}h4" stroke="${INK}" stroke-width="1"/>`]);
  };
  const house = (x, y, s = 1) => {
    const w = 9 * s, h = 7 * s;
    glyphs.push([y, `<path d="M${f1(x - w)} ${f1(y)}v${f1(-h)}h${f1(2 * w)}v${f1(h)}Z" fill="#efe6cf" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - w - 2)} ${f1(y - h)}L${f1(x - w * 0.4)} ${f1(y - h - 8 * s)}H${f1(x + w * 0.4)}L${f1(x + w + 2)} ${f1(y - h)}Z" fill="#a4543a" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - 2)} ${f1(y)}v-4h4v4" fill="#5a4128"/>`]);
  };
  const village = (cx, cy, n) => { for (let i = 0, placed = 0; i < 60 && placed < n; i++) { const x = cx + rr(-34, 34), y = cy + rr(-18, 18); if (free(x, y, 10)) { take(x, y, 10); house(x, y, rr(0.85, 1.15)); placed++; } } };
  const tower = (x, y, h = 34, light) => {
    glyphs.push([y, `<path d="M${f1(x - 8)} ${f1(y)}L${f1(x - 6)} ${f1(y - h)}H${f1(x + 6)}L${f1(x + 8)} ${f1(y)}Z" fill="#ede4cd" stroke="${INK}" stroke-width="1.2"/><path d="M${f1(x - 9)} ${f1(y - h)}h18v-6h-3v3h-3v-3h-3v3h-3v-3h-3v3h-3Z" fill="#ddd2b6" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - 1.5)} ${f1(y - h * 0.6)}v5h3v-5Z" fill="${INK}"/>${light ? `<path d="M${f1(x)} ${f1(y - h - 10)}l-26 -10M${f1(x)} ${f1(y - h - 10)}l26 -10" stroke="#e0a640" stroke-width="2" opacity="0.7"/><circle cx="${f1(x)}" cy="${f1(y - h - 9)}" r="4" fill="#f2c45a" stroke="${INK}"/>` : ""}`]);
  };
  const mausoleum = (x, y) => glyphs.push([y, `<path d="M${f1(x - 13)} ${f1(y)}v-14h26v14Z" fill="#e2dac4" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - 16)} ${f1(y - 14)}L${f1(x)} ${f1(y - 25)}L${f1(x + 16)} ${f1(y - 14)}Z" fill="#b9ad93" stroke="${INK}" stroke-width="1.1"/><path d="M${f1(x - 4)} ${f1(y)}v-8a4 4 0 0 1 8 0v8" fill="#4a3420"/>`]);

  // Espalha desenhos pela terra conforme o bioma (tentativas aleatórias com espaço mínimo entre eles).
  const scatter = (tries, test, r, draw) => {
    for (let k = 0; k < tries; k++) {
      const x = rr(150, 1450), y = rr(120, 2200);
      if (!isLand(x, y) || !test(biomeAt(x, y), x, y) || !free(x, y, r)) continue;
      take(x, y, r);
      draw(x, y);
    }
  };
  const nearBiome = (x, y, b, rad) => { for (let a = 0; a < 6.28; a += 0.8) if (biomeAt(x + Math.cos(a) * rad, y + Math.sin(a) * rad) === b) return true; return false; };

  // Lugares fixos primeiro (vilas, torres, farol, mausoléus).
  village(545, 2050, 6); village(1250, 1764, 5); village(1185, 1982, 4); village(305, 1052, 3);
  // Píer do Porto do Sal, entrando na baía.
  glyphs.push([1735, `<path d="M1262 1745l26-30M1270 1752l26-30" stroke="${INK}" stroke-width="1.2"/><path d="M1262 1745l26-30l8 7l-26 30Z" fill="#b58a5a" stroke="${INK}" stroke-width="1"/>`]);
  for (const [x, y, h, light] of [[1356, 1418, 38, true], [960, 1786, 34], [610, 980, 30], [905, 960, 40]]) { take(x, y - 10, 18); tower(x, y, h, light); }
  for (const [x, y] of [[620, 1815], [660, 1860], [585, 1880], [790, 1870], [760, 2040]]) if (free(x, y, 16)) { take(x, y, 16); mausoleum(x, y); }
  // Cordilheira: as maiores primeiro.
  scatter(9000, (b) => b === B.snow, 30, (x, y) => mountain(x, y, rr(30, 44), true));
  scatter(14000, (b) => b === B.mount, 24, (x, y) => mountain(x, y, rr(20, 34), y < 560));
  scatter(5000, (b, x, y) => (b === B.mount || b === B.snow) && rnd() < 0.5, 12, (x, y) => pine(x, y, rr(14, 20), y < 600));
  scatter(9000, (b, x, y) => (b === B.grass || b === B.ruins || b === B.wet || b === B.forest) && nearBiome(x, y, B.mount, 60), 15, (x, y) => {
    const s = rr(10, 17);
    flat.hills += `M${f1(x - s)} ${f1(y)}q${f1(s)} ${f1(-s * 1.1)} ${f1(2 * s)} 0M${f1(x + s * 0.2)} ${f1(y - s * 0.45)}l${f1(s * 0.3)} ${f1(s * 0.35)}M${f1(x + s * 0.5)} ${f1(y - s * 0.3)}l${f1(s * 0.25)} ${f1(s * 0.3)}`;
  });
  // Ermos: mesas e pedras.
  scatter(5000, (b) => b === B.bad, 34, (x, y) => mesa(x, y, rr(18, 28)));
  scatter(5000, (b) => b === B.bad || (b === B.desert && rnd() < 0.15), 8, (x, y) => { const s = rr(3, 6); flat.rocks += `M${f1(x - s)} ${f1(y)}l${f1(s * 0.4)} ${f1(-s)}l${f1(s * 1.1)} ${f1(-s * 0.2)}l${f1(s * 0.5)} ${f1(s * 1.2)}Z`; });
  // Floresta: árvores densas, pinheiros perto das montanhas.
  scatter(26000, (b, x, y) => b === B.forest && fbm(x / 70, y / 70) > 0.32, 9.5, (x, y) => (y < 1250 && rnd() < 0.5 ? pine(x, y, rr(16, 22)) : tree(x, y, rr(7.5, 10.5))));
  // Charco: poças, juncos, árvores mortas e algumas árvores.
  scatter(5000, (b) => b === B.wet, 12, (x, y) => { const rx = rr(6, 16), ry = rx * 0.4; flat.pools += `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`; });
  scatter(6000, (b) => b === B.wet, 7, (x, y) => (flat.tufts += `M${f1(x)} ${f1(y)}l-2.5-6M${f1(x)} ${f1(y)}v-8M${f1(x)} ${f1(y)}l2.5-6M${f1(x + 1)} ${f1(y - 8)}h0.1`));
  scatter(1500, (b) => b === B.wet && rnd() < 0.5, 14, (x, y) => (flat.dead += `M${f1(x)} ${f1(y)}v-16M${f1(x)} ${f1(y - 9)}l-6-6M${f1(x)} ${f1(y - 12)}l5-5M${f1(x - 4)} ${f1(y - 13)}l-2-4`));
  scatter(2000, (b) => b === B.wet && rnd() < 0.4, 10, (x, y) => tree(x, y, rr(6, 8), "#6d7f55"));
  // Marcos das ruínas: anfiteatro, templo e estátua tombada.
  const landmark = (x, y, svgText) => { take(x, y - 14, 34); glyphs.push([y, svgText]); };
  landmark(690, 1075, `<ellipse cx="690" cy="1062" rx="34" ry="16" fill="#e2d8bf" stroke="${INK}" stroke-width="1.3"/><ellipse cx="690" cy="1062" rx="20" ry="8" fill="#cfc19f" stroke="${INK}" stroke-width="1"/><path d="M656 1062v9a34 16 0 0 0 68 0v-9" fill="#d6cbb0" stroke="${INK}" stroke-width="1.3"/><path d="M664 1072v8M676 1076v8M690 1078v8M704 1076v8M716 1072v8" stroke="${INK}" stroke-width="0.9"/><path d="M720 1056l8-6 4 5" fill="none" stroke="${INK}" stroke-width="1"/>`);
  landmark(915, 1095, `<path d="M880 1095h70v-5h-70Z" fill="#cfc4a6" stroke="${INK}" stroke-width="1.1"/><path d="M884 1090v-26M896 1090v-26M908 1090v-20M934 1090v-26M946 1090v-26" stroke="${INK}" stroke-width="5.5"/><path d="M884 1090v-26M896 1090v-26M908 1090v-20M934 1090v-26M946 1090v-26" stroke="#f1ead8" stroke-width="3.2"/><path d="M878 1064h40l-2-8-18-8-18 8Z" fill="#e6dcc4" stroke="${INK}" stroke-width="1.1"/><path d="M926 1064h26" stroke="${INK}" stroke-width="1.3"/><path d="M915 1094l12-4 6 4" fill="#cfc4a6" stroke="${INK}" stroke-width="0.9"/>`);
  landmark(760, 990, `<path d="M736 990l40-6 8 4-40 6Z" fill="#e6dcc4" stroke="${INK}" stroke-width="1.1"/><circle cx="790" cy="984" r="8" fill="#ece4cf" stroke="${INK}" stroke-width="1.1"/><path d="M786 983h1.5M791 983h1.5M787 987h4" stroke="${INK}" stroke-width="1"/><path d="M748 984l-4-10 6 2" fill="none" stroke="${INK}" stroke-width="1"/>`);
  // Ruínas do Império: quarteirões apagados, colunas, arcos e muralhas.
  scatter(5000, (b, x, y) => b === B.ruins, 22, (x, y) => ruin(x, y));
  for (let k = 0; k < 700; k++) {
    const x = rr(600, 980), y = rr(900, 1210);
    if (biomeAt(x, y) !== B.ruins || !free(x, y, 6)) continue;
    const w = rr(8, 18), h = rr(6, 12);
    flat.blocks += `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}M${f1(x)} ${f1(y)}v${f1(h * rr(0.3, 1))}`;
  }
  // Colinas das Tumbas: morros e lápides.
  scatter(6000, (b) => b === B.hills, 15, (x, y) => {
    const s = rr(10, 18);
    flat.hills += `M${f1(x - s)} ${f1(y)}q${f1(s)} ${f1(-s * 1.1)} ${f1(2 * s)} 0M${f1(x + s * 0.2)} ${f1(y - s * 0.45)}l${f1(s * 0.3)} ${f1(s * 0.35)}M${f1(x + s * 0.5)} ${f1(y - s * 0.3)}l${f1(s * 0.25)} ${f1(s * 0.3)}`;
  });
  scatter(1600, (b, x, y) => b === B.hills && Math.hypot(x - 690, y - 1880) < 170, 9, (x, y) => (flat.crack += `M${f1(x - 3)} ${f1(y)}v-6a3 3 0 0 1 6 0v6Z`));
  // Campos: tufos de capim, árvores soltas, plantações abandonadas perto das vilas.
  scatter(9000, (b) => b === B.grass || b === B.ruins, 13, (x, y) => (flat.tufts += `M${f1(x)} ${f1(y)}l-2-5M${f1(x)} ${f1(y)}v-6M${f1(x)} ${f1(y)}l2-5`));
  scatter(1800, (b) => b === B.grass && rnd() < 0.3, 12, (x, y) => tree(x, y, rr(6.5, 8.5)));
  for (const [cx, cy] of [[600, 2020], [1220, 1830], [900, 1700], [760, 1500], [1000, 1460]]) {
    for (let k = 0; k < 3; k++) {
      const x = cx + rr(-40, 40), y = cy + rr(-20, 20), w = rr(22, 36), h = rr(12, 20), ang = rr(-0.4, 0.4);
      if (!free(x, y, 10)) continue;
      const c = Math.cos(ang), s = Math.sin(ang);
      const P = (u, v) => `${f1(x + u * c - v * s)} ${f1(y + u * s + v * c)}`;
      flat.fields += `M${P(0, 0)}L${P(w, 0)}L${P(w, h)}L${P(0, h)}Z`;
      for (let t = 3; t < h; t += 3) flat.fields += `M${P(1, t)}L${P(w - 1, t)}`;
    }
  }
  // Deserto: dunas em meia-lua e pontilhado de areia.
  scatter(12000, (b) => b === B.desert, 16, (x, y) => {
    const s = rr(9, 16);
    flat.dunes += `M${f1(x - s)} ${f1(y)}q${f1(s * 0.9)} ${f1(-s * 0.85)} ${f1(s * 2)} ${f1(-s * 0.1)}M${f1(x - s * 0.3)} ${f1(y + s * 0.35)}q${f1(s * 0.6)} ${f1(-s * 0.45)} ${f1(s * 1.2)} 0`;
  });
  for (let k = 0; k < 9000; k++) { const x = rr(950, 1420), y = rr(1050, 2120); if (biomeAt(x, y) === B.desert && free(x, y, 1.5)) flat.dots += `M${f1(x)} ${f1(y)}h0.1`; }
  // Palmeiras e cactos no deserto.
  const palm = (x, y) => glyphs.push([y, `<path d="M${f1(x)} ${f1(y)}q2-12-1-22" fill="none" stroke="#6b4a2c" stroke-width="2.2"/><path d="M${f1(x - 1)} ${f1(y - 22)}q-10-3-15 5M${f1(x - 1)} ${f1(y - 22)}q10-5 15 3M${f1(x - 1)} ${f1(y - 22)}q-4-10-13-10M${f1(x - 1)} ${f1(y - 22)}q6-10 15-8M${f1(x - 1)} ${f1(y - 22)}q1-9 2-11" fill="none" stroke="#4d6b3a" stroke-width="2.4" stroke-linecap="round"/>`]);
  for (const [x, y] of [[1244, 1300], [1290, 1286], [1250, 1326], [1092, 2048], [1130, 1532]]) { take(x, y, 10); palm(x, y); }
  scatter(1200, (b) => b === B.desert && rnd() < 0.3, 26, (x, y) => glyphs.push([y, `<path d="M${f1(x)} ${f1(y)}v-14M${f1(x)} ${f1(y - 7)}h-4v-5M${f1(x)} ${f1(y - 9)}h4v-4" fill="none" stroke="#4f6e3e" stroke-width="2.6" stroke-linecap="round"/>`]));
  // Arco de pedra do deserto.
  take(1110, 1880, 26);
  glyphs.push([1900, `<path d="M1086 1900h12v-26q12-20 24 0v26h12v-30q-24-40-48 0Z" fill="#d6a06b" stroke="${INK}" stroke-width="1.3"/><path d="M1122 1874q4 6 0 26h12v-30Z" fill="#8f5a3c" opacity="0.4"/>`]);
  // Colunas da Baía Afundada (na água).
  const bayCols = [[1226, 1640, 16], [1252, 1664, 11], [1278, 1622, 20], [1240, 1700, 9]];

  // Camadas planas (sem sobreposição que importe), depois os desenhos ordenados.
  const art = el("g", {}, svg);
  el("path", { d: flat.fields, fill: "#d3c98f", stroke: "#8b7a52", "stroke-width": 0.8, opacity: 0.75 }, art);
  el("path", { d: flat.blocks, fill: "none", stroke: "#7b6a50", "stroke-width": 1.3, opacity: 0.55 }, art);
  el("path", { d: flat.dots, stroke: "#a98552", "stroke-width": 1.5, "stroke-linecap": "round", opacity: 0.55 }, art);
  el("path", { d: flat.dunes, fill: "none", stroke: "#a77d48", "stroke-width": 1.4, "stroke-linecap": "round" }, art);
  el("path", { d: flat.pools, fill: "#a7bcae", stroke: INK, "stroke-width": 0.9, opacity: 0.9 }, art);
  el("path", { d: flat.hills, fill: "none", stroke: INK, "stroke-width": 1.2, "stroke-linecap": "round", opacity: 0.75 }, art);
  el("path", { d: flat.tufts, fill: "none", stroke: "#5f6e43", "stroke-width": 1, "stroke-linecap": "round", opacity: 0.8 }, art);
  el("path", { d: flat.rocks, fill: "#b99a7a", stroke: INK, "stroke-width": 0.8 }, art);
  el("path", { d: flat.crack, fill: "#ddd5bf", stroke: INK, "stroke-width": 0.9 }, art);
  el("path", { d: flat.dead, fill: "none", stroke: "#4a3a2a", "stroke-width": 1.2, "stroke-linecap": "round" }, art);
  el("path", { d: flat.shadows, fill: "#3f2c1a", opacity: 0.13 }, art);
  // Marca d'água com o nome do mundo: laranja, em negrito, por baixo dos desenhos (só a terra e os campos ficam sob ela).
  el("text", { x: 790, y: 1260, transform: "rotate(-90 790 1260)", "text-anchor": "middle", "dominant-baseline": "middle", "font-size": 190, "font-weight": 700, textLength: 1640, lengthAdjust: "spacing", fill: "#d9601a", opacity: 0.24 }, el("g", { "clip-path": "url(#terra)" }, art)).textContent = "KOSARADIUS";
  // Estradas do império (pedra), por baixo dos desenhos.
  el("path", { d: "M640 1210L700 1150L800 1135M800 1135L880 1080L905 960M800 1135L760 1010L700 950", fill: "none", stroke: "#8d7d62", "stroke-width": 3, "stroke-dasharray": "7 4", opacity: 0.75 }, art);
  glyphs.sort((a, b) => a[0] - b[0]);
  const sorted = el("g", { "stroke-linejoin": "round" }, svg);
  sorted.innerHTML = glyphs.map((g) => g[1]).join("");
  // Baía: colunas meio submersas, com anéis na água.
  const bay = el("g", {}, svg);
  bay.innerHTML = bayCols.map(([x, y, h]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="3.5" fill="none" stroke="#6f7f68" stroke-width="1"/>${column(x, y, h)}`).join("");

  // Pontes: onde uma trilha passa a menos de 6 unidades de um rio.
  const bridges = el("g", {}, svg);
  for (const [a, b] of EDGES) {
    const p = el("path", { d: EDGE_D[a + b] }, defs), len = p.getTotalLength();
    let last = -99;
    for (let s = 14; s < len - 14; s += 3) {
      const q = p.getPointAtLength(s);
      if (s - last < 40 || !riverPts.some(([x, y]) => Math.hypot(x - q.x, y - q.y) < 5)) continue;
      last = s;
      const q2 = p.getPointAtLength(s + 2), ang = (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI;
      el("g", { transform: `translate(${f1(q.x)} ${f1(q.y)}) rotate(${f1(ang)})` }, bridges).innerHTML =
        `<rect x="-11" y="-5" width="22" height="10" fill="#c79f6a" stroke="${INK}" stroke-width="1.1"/><path d="M-7-5v10M-2-5v10M3-5v10M8-5v10" stroke="${INK}" stroke-width="0.6" opacity="0.6"/><path d="M-12-6.5h24M-12 6.5h24" stroke="${INK}" stroke-width="1.4"/>`;
    }
  }
  // Névoa da campanha: o que ainda não foi explorado (do 5º cenário ao norte) fica apagado.
  el("rect", { x: 0, y: 0, width: W, height: FOG_EDGE, fill: "#efe7d2", opacity: 0.42, "clip-path": "url(#terra)" }, svg);
  el("rect", { x: 0, y: FOG_EDGE, width: W, height: 190, fill: "url(#veu)", "clip-path": "url(#terra)" }, svg);
  // Contornos por cima de tudo.
  el("path", { d: coastD, fill: "none", stroke: INK, "stroke-width": 2.4, "stroke-linejoin": "round" }, svg);

  // ---------------------------------------------------------------------------
  // Mar: navios, serpente, kraken, baleia; terras em névoa fora do continente.
  const ship = (x, y, s, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M-30 0h60l-9 11h-42Z" fill="#8a5a36" stroke="${INK}" stroke-width="1.3"/><path d="M-26 4h52" stroke="#5e3b22" stroke-width="1"/><path d="M-4 0v-46M14 0v-34" stroke="${INK}" stroke-width="1.6"/><path d="M-4-44q-20 10-20 40h20Z" fill="#f3e7c9" stroke="${INK}" stroke-width="1.2"/><path d="M-4-44q14 12 12 40h-12Z" fill="#e6d8b6" stroke="${INK}" stroke-width="1.1"/><path d="M14-32q12 8 10 28h-10Z" fill="#f3e7c9" stroke="${INK}" stroke-width="1.1"/><path d="M-4-46l12 3-12 3Z" fill="#a4543a" stroke="${INK}" stroke-width="0.7"/><path d="M-40 14q10-5 20 0t20 0t20 0t20 0" fill="none" stroke="#6f7f68" stroke-width="1.2"/></g>`;
  const seaArt = el("g", {}, svg);
  seaArt.innerHTML = [
    ship(96, 1840, 1, false), ship(1500, 1560, 0.9, true), ship(1150, 2290, 0.8, false),
    `<g fill="none" stroke-linecap="round"><path d="M44 760q14-26 28 0M84 760q14-26 28 0M124 760q16-36 34-14" stroke="#3d5a52" stroke-width="6"/><path d="M44 760q14-26 28 0M84 760q14-26 28 0M124 760q16-36 34-14" stroke="#7fa293" stroke-width="2.2"/><circle cx="152" cy="742" r="1.6" fill="${INK}" stroke="none"/></g>`,
    `<g fill="none" stroke-linecap="round" transform="translate(1440 1290)"><path d="M0 0q-10-30 10-44q16-10 8-28M30 6q6-28 30-30q18-2 16-24M-24 8q-20-16-12-40" stroke="#6b4a5c" stroke-width="7"/><path d="M0 0q-10-30 10-44q16-10 8-28M30 6q6-28 30-30q18-2 16-24M-24 8q-20-16-12-40" stroke="#b892a2" stroke-width="2.6" stroke-dasharray="1 5"/><path d="M-40 14q10-5 20 0t20 0t20 0t20 0t20 0" stroke="#6f7f68" stroke-width="1.2"/></g>`,
    `<g transform="translate(120 2050)"><path d="M-36 0q10-18 40-16q22 2 30 16q-34 10-70 0Z" fill="#7d8a86" stroke="${INK}" stroke-width="1.2"/><path d="M34 0l14-8v16Z" fill="#7d8a86" stroke="${INK}" stroke-width="1.1"/><circle cx="-20" cy="-6" r="1.6" fill="${INK}"/><path d="M-10-18q-4-14 0-20M-10-18q4-14 10-18M-10-18q-8-10-12-12" fill="none" stroke="#6f8b96" stroke-width="1.4"/></g>`,
  ].join("");
  // Ilha de Cinza: vulcão, quase todo sob a névoa.
  el("path", { d: cinzaD, fill: "#d8cbb0", stroke: INK, "stroke-width": 1.6 }, svg);
  el("g", {}, svg).innerHTML = `<path d="M1458 1130L1494 1060L1530 1130Z" fill="#8c6a52" stroke="${INK}" stroke-width="1.4"/><path d="M1486 1064h16l-3 8h-10Z" fill="#b8452a"/><path d="M1494 1056q-8-16 4-28q10-10 0-22" fill="none" stroke="#6e6258" stroke-width="3" opacity="0.6"/>`;
  const fog = el("g", { filter: "url(#nevoa)", fill: "#f6efdf", opacity: 0.86 }, svg);
  for (const f of FOG) el("ellipse", { cx: f.x, cy: f.y, rx: f.rx, ry: f.ry }, fog);

  // Nomes fixos na arte: rios e mares (os de região e de lugar ficam em worldMap.ts).
  const labels = el("g", { fill: INK, "text-anchor": "middle" }, svg);
  const halo = { stroke: "#efe5c9", "stroke-width": 3, "paint-order": "stroke", "stroke-linejoin": "round" };
  RIVERS.forEach((r, i) => {
    if (!r.name) return;
    const mid = Math.floor(r.pts.length / 2), seg = r.pts.slice(mid - 6, mid + 6);
    el("path", { id: `rio${i}`, d: smooth(seg.map(([x, y]) => [x + 9, y - 2])) }, defs);
    el("text", { "font-size": 13, "font-style": "italic", fill: "#3d5560", "letter-spacing": 2, ...halo }, labels).innerHTML = `<textPath href="#rio${i}" startOffset="50%">${r.name}</textPath>`;
  });
  const seaLabel = (x, y, text, rot) => (el("text", { x, y, transform: `rotate(${rot} ${x} ${y})`, "font-size": 30, "font-style": "italic", "letter-spacing": 10, fill: "#3d5560", opacity: 0.8 }, labels).textContent = text);
  seaLabel(70, 1560, "Oceano da Grande Maré", -90);
  seaLabel(1530, 1840, "Mar das Brumas", 90);

  // Rosa dos ventos, cartela com escala e moldura.
  const deco = el("g", {}, svg);
  let rose = "";
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2, long = i % 4 === 0 ? 92 : i % 2 === 0 ? 62 : 40, w = i % 4 === 0 ? 12 : 7;
    const tip = [Math.cos(a) * long, Math.sin(a) * long], l = [Math.cos(a - 1.57) * w, Math.sin(a - 1.57) * w], r = [Math.cos(a + 1.57) * w, Math.sin(a + 1.57) * w];
    rose = `<path d="M0 0L${f1(l[0])} ${f1(l[1])}L${f1(tip[0])} ${f1(tip[1])}Z" fill="${i % 4 === 0 ? "#c8962e" : "#efe3c2"}" stroke="${INK}" stroke-width="1"/><path d="M0 0L${f1(r[0])} ${f1(r[1])}L${f1(tip[0])} ${f1(tip[1])}Z" fill="${i % 4 === 0 ? "#6b4a22" : "#b9a37a"}" stroke="${INK}" stroke-width="1"/>` + rose;
  }
  deco.innerHTML = `
    <g transform="translate(1440 2140)"><circle r="70" fill="#efe3c2" stroke="${INK}" stroke-width="1.4" opacity="0.85"/><circle r="62" fill="none" stroke="${INK}" stroke-width="0.8"/><circle r="66" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="1 5"/>${rose}<circle r="6" fill="#c8962e" stroke="${INK}"/><text y="-100" text-anchor="middle" font-variant="small-caps" font-size="26" fill="${INK}">N</text></g>
    <g transform="translate(70 2210)"><path d="M0 0h360c10 0 14 6 14 12v86c0 6-4 12-14 12h-360c-10 0-14-6-14-12v-86c0-6 4-12 14-12Z" fill="#f1e6c8" stroke="${INK}" stroke-width="1.6"/><path d="M-4 4c-14-4-20 10-8 16M364 4c14-4 20 10 8 16M-4 106c-14 4-20-10-8-16M364 106c14 4 20-10 8-16" fill="none" stroke="${INK}" stroke-width="1.3"/>
      <text x="180" y="34" text-anchor="middle" font-variant="small-caps" font-size="30" letter-spacing="4" fill="${INK}">Verdemar</text>
      <text x="180" y="56" text-anchor="middle" font-size="15" font-style="italic" fill="#5a4128">o que restou do Império de Kusa depois da Grande Maré</text>
      <path d="M60 80h240" stroke="${INK}" stroke-width="1.2"/><path d="M60 76h48v8h-48ZM156 76h48v8h-48ZM252 76h48v8h-48Z" fill="${INK}"/><path d="M108 76h48v8h-48ZM204 76h48v8h-48Z" fill="#f1e6c8" stroke="${INK}" stroke-width="0.8"/>
      <text x="60" y="100" text-anchor="middle" font-size="12" fill="${INK}">0</text><text x="180" y="100" text-anchor="middle" font-size="12" fill="${INK}">50</text><text x="300" y="100" text-anchor="middle" font-size="12" fill="${INK}">100 léguas</text></g>
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${INK}" stroke-width="3"/>
    <rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${INK}" stroke-width="1"/>
    <path d="${(() => { let d = ""; for (let x = 22; x < W - 22; x += 40) d += `M${x} 14v8M${x} ${H - 22}v8`; for (let y = 22; y < H - 22; y += 40) d += `M14 ${y}h8M${W - 22} ${y}h8`; return d; })()}" stroke="${INK}" stroke-width="1"/>`;
  el("rect", { width: W, height: H, fill: "url(#vinheta)", "pointer-events": "none" }, svg);

  const out = new XMLSerializer().serializeToString(svg);
  svg.remove();
  return out;
}
