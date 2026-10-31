import type { Rgb } from "./hero/color.ts";
import {
  BAYER, FLAT, HD, Paper as Painter, ebox, ellipse, inEllipse, limb, line, lit, noise, palette, poly, sn, sphere,
  type MaterialBase, type Offset, type Shade,
} from "./paint.ts";

/**
 * Arte do Bosque Velho, do Coração da Mata e do Pântano do Kosaradius (a mata alagada), no padrão novo (pintor em
 * `paint.ts`, `docs/ARTE_TIBIA.md`): 128 px por tile, luz de cima à esquerda, 4 tons por material, contorno quase preto
 * nos objetos de pé. Estes mapas usam este arquivo sempre (não há arte antiga deles). O teste `cenarios` guarda a
 * impressão de cada peça: mexer numa variante não pode mudar o desenho das outras.
 *
 * A mata fechada é desenhada pela distância até o chão aberto: cada pixel sabe a que distância está dos tiles
 * vizinhos que não são mata, e cada tufo da copa (um campo de tufos que se repete a cada 128 px) entra se o centro dele
 * estiver longe o bastante. Como a distância é a mesma vista de qualquer tile, a beira da copa emenda sozinha de um
 * tile para o outro, em qualquer combinação de vizinhos. A trilha de terra e as bordas usam a mesma ideia.
 */

export type ForestVariant = "oldwood" | "heartwood" | "marsh" | "swamp";

/** As duas matas alagadas: o Pântano do Kosaradius (`marsh`) e o Pântano das Ruínas (`swamp`, na paleta da baía). */
export const isWetland = (variant: ForestVariant) => variant === "marsh" || variant === "swamp";

/** Materiais (cada um é uma rampa de 6 tons por variante). */
export enum F {
  Grass, Moss, Litter, Dirt, Mud, Under, Leaf, Leaf2, Leaf3, Bark, Birch, Wood, Water, Deep, Foam, Stone, Lichen,
  Fern, Flower, Bloom, Cap, Glow, Line,
}

/**
 * Cores base: o Bosque Velho em verde vivo e sol quente; o Coração da Mata em verde-azulado fechado, com brilho frio; o
 * Pântano do Kosaradius em oliva e marrom de brejo, água turva esverdeada, barba-de-velho cinza e vaga-lumes; o
 * Pântano das Ruínas na paleta da baía (a do Kosaradius mais aberta e clara, com a água verde-azulada).
 */
const BASES: Record<ForestVariant, Record<F, MaterialBase>> = {
  oldwood: {
    [F.Grass]: ["#6c9a3c", 0.62, 6], [F.Moss]: ["#5a8a36", 0.7, 6], [F.Litter]: ["#a2743e", 0.8, 6], [F.Dirt]: ["#9a7650", 0.6, 5],
    [F.Mud]: ["#6a5236", 0.6, 5], [F.Under]: ["#2c3a20", 0.55, 5], [F.Leaf]: ["#3e6e2a", 0.95, 8], [F.Leaf2]: ["#5c8e30", 0.95, 8],
    [F.Leaf3]: ["#b08a2c", 0.95, 8], [F.Bark]: ["#6a4e36", 0.95, 6], [F.Birch]: ["#d8d2c0", 0.7, 4], [F.Wood]: ["#a27a4e", 0.9, 6],
    [F.Water]: ["#4e9aa0", 0.85, 8], [F.Deep]: ["#2a6878", 0.85, 8], [F.Foam]: ["#e6f0e2", 0.35, 4], [F.Stone]: ["#8c8a7a", 1, 5],
    [F.Lichen]: ["#97a85a", 0.8, 6], [F.Fern]: ["#4a8a32", 1, 8], [F.Flower]: ["#f2eee0", 0.5, 4], [F.Bloom]: ["#e8b83a", 0.9, 8],
    [F.Cap]: ["#c4423a", 0.9, 6], [F.Glow]: ["#c8f070", 1.2, 10, true], [F.Line]: ["#1e2414", 0.4, 0],
  },
  heartwood: {
    [F.Grass]: ["#3e6a46", 0.62, 6], [F.Moss]: ["#36684c", 0.7, 6], [F.Litter]: ["#6a5038", 0.8, 6], [F.Dirt]: ["#6a5844", 0.6, 5],
    [F.Mud]: ["#463c30", 0.6, 5], [F.Under]: ["#141e18", 0.5, 5], [F.Leaf]: ["#22463a", 0.95, 8], [F.Leaf2]: ["#2f5e48", 0.95, 8],
    [F.Leaf3]: ["#3a5e6a", 0.95, 8], [F.Bark]: ["#4a3c32", 0.95, 6], [F.Birch]: ["#a8b0a8", 0.7, 4], [F.Wood]: ["#76583e", 0.9, 6],
    [F.Water]: ["#2a4a52", 0.8, 8], [F.Deep]: ["#13283a", 0.8, 8], [F.Foam]: ["#a8c4bc", 0.35, 4], [F.Stone]: ["#5e6a66", 1, 5],
    [F.Lichen]: ["#6a8c72", 0.8, 6], [F.Fern]: ["#2c6a48", 1, 8], [F.Flower]: ["#d6e0f2", 0.5, 4], [F.Bloom]: ["#a070d2", 0.9, 8],
    [F.Cap]: ["#7a4aa6", 0.9, 6], [F.Glow]: ["#62f0d2", 1.2, 10, true], [F.Line]: ["#0e1612", 0.4, 0],
  },
  marsh: {
    [F.Grass]: ["#62783a", 0.6, 6], [F.Moss]: ["#56703a", 0.55, 6], [F.Litter]: ["#86703e", 0.8, 6], [F.Dirt]: ["#6e5a3c", 0.6, 5],
    [F.Mud]: ["#54432c", 0.62, 5], [F.Under]: ["#141c0e", 0.5, 5], [F.Leaf]: ["#33522a", 0.95, 8], [F.Leaf2]: ["#4e6a2c", 0.95, 8],
    [F.Leaf3]: ["#8c967a", 0.8, 5], [F.Bark]: ["#4e4236", 0.95, 6], [F.Birch]: ["#c8c2ac", 0.7, 4], [F.Wood]: ["#7e6446", 0.9, 6],
    [F.Water]: ["#52725a", 0.8, 8], [F.Deep]: ["#34503e", 0.8, 8], [F.Foam]: ["#a8b890", 0.35, 4], [F.Stone]: ["#6e7266", 1, 5],
    [F.Lichen]: ["#8a9a6a", 0.8, 6], [F.Fern]: ["#3e7434", 1, 8], [F.Flower]: ["#ece6d4", 0.5, 4], [F.Bloom]: ["#8a5ac8", 0.9, 8],
    [F.Cap]: ["#e4dccb", 0.7, 5], [F.Glow]: ["#d8f060", 1.2, 10, true], [F.Line]: ["#10180c", 0.4, 0],
  },
  swamp: {
    [F.Grass]: ["#78893f", 0.6, 6], [F.Moss]: ["#6a7e40", 0.55, 6], [F.Litter]: ["#8e7742", 0.8, 6], [F.Dirt]: ["#755f40", 0.6, 5],
    [F.Mud]: ["#59472f", 0.62, 5], [F.Under]: ["#1c2311", 0.5, 5], [F.Leaf]: ["#436130", 0.95, 8], [F.Leaf2]: ["#667d32", 0.95, 8],
    [F.Leaf3]: ["#a3a890", 0.8, 5], [F.Bark]: ["#534639", 0.95, 6], [F.Birch]: ["#d1ccb9", 0.7, 4], [F.Wood]: ["#866a4a", 0.9, 6],
    [F.Water]: ["#5e8c7e", 0.8, 8], [F.Deep]: ["#3e665c", 0.8, 8], [F.Foam]: ["#c4cbad", 0.35, 4], [F.Stone]: ["#6e7266", 1, 5],
    [F.Lichen]: ["#a3ab80", 0.8, 6], [F.Fern]: ["#53883b", 1, 8], [F.Flower]: ["#f4f1e7", 0.5, 4], [F.Bloom]: ["#e0c040", 0.9, 8],
    [F.Cap]: ["#ede7dc", 0.7, 5], [F.Glow]: ["#f4f68b", 1.2, 10, true], [F.Line]: ["#171f0f", 0.4, 0],
  },
};

const rampCache = new Map<ForestVariant, Rgb[][]>();
function ramps(variant: ForestVariant): Rgb[][] {
  let r = rampCache.get(variant);
  if (!r) {
    r = palette(Object.values(F).filter((v): v is F => typeof v === "number").map((m) => BASES[variant][m]));
    rampCache.set(variant, r);
  }
  return r;
}

/** Papel na paleta da variante. */
class Paper extends Painter {
  constructor(variant: ForestVariant, w = HD, h = HD) { super(ramps(variant), w, h); }
}

type Pt = readonly [number, number];

/** Vizinhos (bits). Nas funções pela distância, as quinas contam sempre que o tile da quina for do outro tipo. */
export const OPEN = { n: 1, e: 2, s: 4, w: 8, ne: 16, nw: 32, se: 64, sw: 128 } as const;
const NEIGHBORS: [number, number, number][] = [
  [OPEN.n, 0, -1], [OPEN.e, 1, 0], [OPEN.s, 0, 1], [OPEN.w, -1, 0], [OPEN.ne, 1, -1], [OPEN.nw, -1, -1], [OPEN.se, 1, 1], [OPEN.sw, -1, 1],
];

/**
 * Distância (px) do ponto (x, y), em coordenadas do tile (pode estar fora dele), até o tile vizinho mais perto marcado
 * em `mask`. `south`: quanto o que fica abaixo do ponto conta mais perto (a copa recua mais desse lado, para mostrar os
 * troncos). Só depende de onde o ponto e o tile estão, não de qual tile pergunta: dois tiles vizinhos chegam ao mesmo
 * valor para o mesmo ponto, e é isso que faz a copa emendar.
 */
function distTo(mask: number, x: number, y: number, south = 0) {
  let d = 1e9;
  for (const [bit, dx, dy] of NEIGHBORS) {
    if (!(mask & bit)) continue;
    const rx0 = dx * HD, ry0 = dy * HD;
    const ex = Math.max(rx0 - x, 0, x - (rx0 + HD - 1));
    const ey = Math.max(ry0 - y, 0, y - (ry0 + HD - 1));
    const h = Math.hypot(ex, ey);
    d = Math.min(d, h - (y < ry0 && h > 0 ? (south * ey) / h : 0));
  }
  return d;
}

/**
 * Distância até a terra (`land`) para a água: como `distTo`, mas a quina de fora (terra nos dois lados) vira um arco
 * de raio `R`, e a margem não fica quadrada.
 */
function shoreDist(land: number, x: number, y: number, R = 44) {
  let d = distTo(land, x, y);
  const corner = (a: number, b: number, cx: number, cy: number) => {
    if (!(land & a) || !(land & b)) return;
    const ux = Math.abs(x - cx), uy = Math.abs(y - cy);
    if (ux < R && uy < R) d = Math.min(d, R - Math.hypot(R - ux, R - uy));
  };
  corner(OPEN.n, OPEN.w, -0.5, -0.5);
  corner(OPEN.n, OPEN.e, HD - 0.5, -0.5);
  corner(OPEN.s, OPEN.w, -0.5, HD - 0.5);
  corner(OPEN.s, OPEN.e, HD - 0.5, HD - 0.5);
  return d;
}

const fields = new Map<string, Float32Array>();
/** `shoreDist` (ou `distTo`, com `R` 0) de cada pixel do tile, calculado uma vez por máscara e guardado. */
function field(mask: number, R: number) {
  const key = `${mask}:${R}`;
  let f = fields.get(key);
  if (!f) {
    f = new Float32Array(HD * HD);
    for (let y = 0; y < HD; y++) for (let x = 0; x < HD; x++) f[y * HD + x] = R ? shoreDist(mask, x + 0.5, y + 0.5, R) : distTo(mask, x + 0.5, y + 0.5);
    fields.set(key, f);
  }
  return f;
}
/** Valor do campo no pixel (x, y) do tile (coordenadas de `fill`, com o meio do pixel). */
const at = (f: Float32Array, x: number, y: number) => f[Math.min(HD - 1, Math.max(0, Math.floor(y))) * HD + Math.min(HD - 1, Math.max(0, Math.floor(x)))];

// --- Chão ---------------------------------------------------------------------------------

/**
 * Capim da floresta: só textura miúda (folhinhas de capim, tufos pequenos, trevos e uma florzinha), sem mancha grande:
 * mancha que se repete a cada tile vira um padrão de papel de parede. A variação grande de luz vem do tint do tilemap
 * e a variação `v` muda só o miúdo, então tiles vizinhos de variação diferente emendam sem marca.
 */
function grassTile(variant: ForestVariant, v: number, lush = false): Paper {
  const p = new Paper(variant);
  p.fill([0, 0, HD - 1, HD - 1], () => true, F.Grass, () => FLAT - 0.04, (x, y) => {
    const n = noise(x, y, v * 7 + 12);
    return n < 0.06 ? -1 : n > 0.97 ? 1 : 0;
  });
  // Tufos pequenos de musgo mais escuro (até 8 px).
  for (let k = 0; k < 10; k++) {
    const cx = noise(k, v, 14) * HD, cy = noise(v, k, 15) * HD, r = 3 + noise(k, k + v, 16) * 4;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if (Math.hypot(x - cx, (y - cy) * 1.3) <= r && noise(x, y, 17) < 0.8) p.on(x & (HD - 1), y & (HD - 1), F.Moss, noise(x, y, 18) < 0.3 ? 2 : 3);
  }
  // Folhinhas: traços de 3 a 4 px, claros na ponta e escuros no pé, em todas as direções.
  const blades = lush ? 420 : 300;
  for (let k = 0; k < blades; k++) {
    const x = Math.floor(noise(k, v, 19) * HD), y = Math.floor(noise(v, k, 20) * HD);
    const lean = noise(k, k, 21) < 0.5 ? -1 : 1;
    const tall = noise(k, v + 1, 22) < 0.4;
    p.on(x, y, null, 5);
    p.on((x + (lean > 0 ? 0 : -1)) & (HD - 1), (y + 1) & (HD - 1), null, 4);
    if (tall) p.on((x + lean) & (HD - 1), (y + 2) & (HD - 1), null, 4);
    p.on(x, (y + (tall ? 3 : 2)) & (HD - 1), null, 2);
  }
  // Trevos: três pontinhos.
  for (let k = 0; k < 2 + (v % 3); k++) {
    const x = 10 + noise(k, v, 23) * 108, y = 10 + noise(v, k, 24) * 108;
    for (const [dx, dy] of [[0, -2], [-2, 1], [2, 1]] as const) { p.on(x + dx, y + dy, F.Moss, 4); p.on(x + dx + 1, y + dy, F.Moss, 3); }
    p.on(x, y + 2, F.Moss, 1);
  }
  return p;
}

/**
 * Arena: no Bosque Velho, capim baixo e viçoso com florzinhas; no Coração da Mata, um tapete de musgo com esporos que
 * brilham. As manchas são as fixas, então a arena emenda com o capim de fora.
 */
function arenaTile(variant: ForestVariant, v: number): Paper {
  const heart = variant === "heartwood";
  const p = grassTile(variant, v + 7, true);
  // No Coração da Mata, o musgo toma quase tudo (sobra capim em fiapos).
  if (heart)
    for (let y = 0; y < HD; y++)
      for (let x = 0; x < HD; x++) if (noise(x >> 2, y >> 2, 20 + v) < 0.7) { p.mat[y * HD + x] = F.Moss; p.off[y * HD + x] = noise(x, y, 21) < 0.1 ? -1 : 0; }
  for (let k = 0; k < 8; k++) {
    const x = 6 + noise(k, v, 22) * 116, y = 6 + noise(v, k, 23) * 116;
    if (heart) { p.on(x, y, F.Glow, 4); p.on(x + 1, y, F.Glow, 2); }
    else { p.on(x, y, k % 3 ? F.Flower : F.Bloom, 4); p.on(x + 1, y, k % 3 ? F.Flower : F.Bloom, 3); p.on(x, y + 1, F.Grass, 1); }
  }
  return p;
}

/**
 * Terra batida da trilha (por cima do capim), pelos vizinhos que não são trilha (`out`): a beira recua num contorno
 * ondulado que é o mesmo dos dois lados de cada emenda. Sulcos de pisada, pedrinhas e o capim invadindo a beira.
 */
export function dirtTile(variant: ForestVariant, out: number): Paper {
  const p = new Paper(variant);
  const edge = (x: number, y: number) => 26 + (sn(x, y, 32, 30) - 0.5) * 22 + (sn(x, y, 16, 31) - 0.5) * 8;
  const dist = field(out, 62);
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => at(dist, x, y) > edge(x, y), F.Dirt, (x, y) => FLAT + (sn(x, y, 16, 32) - 0.5) * 0.18,
    (x, y) => (noise(x, y, 33) < 0.04 ? -1 : noise(x, y, 34) > 0.975 ? 1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!p.has(x, y)) continue;
      const d = dist[y * HD + x] - edge(x, y);
      // A beira: escura de um lado e clara do outro (um degrauzinho de terra gasta).
      if (d < 2) p.on(x, y, null, 2);
      // Tufos de capim entrando na terra.
      else if (d < 8 && noise(x >> 1, y >> 1, 35) < 0.22) { p.mat[y * HD + x] = F.Grass; p.fixed[y * HD + x] = noise(x, y, 36) < 0.5 ? 4 : 3; }
      // Pedrinhas.
      else if (noise(x, y, 37) < 0.004) { p.on(x, y, F.Stone, 4); p.on(x + 1, y + 1, F.Stone, 1); p.on(x + 1, y, F.Stone, 3); }
    }
  return p;
}

/** Folhas secas no chão perto da mata (`forest`: vizinhos de mata), mais juntas na beira. */
export function litterEdge(variant: ForestVariant, forest: number): Paper {
  const p = new Paper(variant);
  for (let gy = -4; gy < HD + 4; gy += 7)
    for (let gx = -4; gx < HD + 4; gx += 7) {
      const x = gx + noise(gx, gy, 40) * 7, y = gy + noise(gy, gx, 41) * 7;
      const d = distTo(forest, x, y);
      // Mais folhas junto da mata, rareando até ~40 px.
      if (d < 4 || d > 44 || noise(gx, gy, 42) > 0.3 - d / 160) continue;
      const a = noise(gx, gy, 43) * Math.PI;
      const mat = noise(gx, gy, 44) < 0.3 ? F.Leaf3 : F.Litter;
      const ca = Math.cos(a), sa = Math.sin(a), len = 3.5 + noise(gx, gy, 45) * 2.5;
      p.fill([x - 6, y - 6, x + 6, y + 6], (px, py) => {
        const u = (px - x) * ca + (py - y) * sa, w = -(px - x) * sa + (py - y) * ca;
        return (u / len) ** 2 + (w / (len * 0.55)) ** 2 <= 1;
      }, mat, (px, py) => 0.6 + ((x - px) + (y - py)) * 0.05);
      line(p, [x - ca * (len - 1), y - sa * (len - 1)], [x + ca * (len - 1), y + sa * (len - 1)], null, 2);
    }
  return p;
}

/** Barro molhado em volta da água (no chão vizinho do riacho ou da lagoa), mais escuro perto da margem. */
export function mudEdge(variant: ForestVariant, water: number): Paper {
  const p = new Paper(variant);
  const reach = (x: number, y: number) => 30 + (sn(x, y, 32, 50) - 0.5) * 18;
  const dist = field(water, 0);
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => at(dist, x, y) < reach(x, y), F.Mud, (x, y) => 0.48 + Math.min(1, at(dist, x, y) / reach(x, y)) * 0.16,
    (x, y) => (at(dist, x, y) > reach(x, y) - 5 && noise(x, y, 51) < 0.5 ? 1 : noise(x, y, 52) < 0.04 ? -1 : 0));
  // Pedrinhas lavadas e pegadas de bicho na lama.
  for (let k = 0; k < 6; k++) {
    const x = noise(k, water, 53) * HD, y = noise(water, k, 54) * HD;
    if (distTo(water, x, y) > 20) continue;
    ellipse(p, x, y, 3.5, 2.6, F.Stone);
  }
  return p;
}

/** Sombra da mata no chão (o sol vem do noroeste): faixa ao sul e a leste do que é mata. */
export function shadowEdge(variant: ForestVariant, from: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(HD * HD * 4);
  const color = variant === "heartwood" ? [6, 16, 14] : isWetland(variant) ? [10, 20, 8] : [20, 34, 12];
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const d = distTo(from, x, y) / (40 + (sn(x, y, 32, 60) - 0.5) * 16);
      if (d >= 1) continue;
      const v = (1 - d) * 2 + (BAYER[(y & 1) * 2 + (x & 1)] - 0.5) * 0.6;
      const a = v > 1.2 ? 0.36 : v > 0.35 ? 0.2 : 0;
      if (a) out.set([color[0], color[1], color[2], Math.round(a * 255)], (y * HD + x) * 4);
    }
  return out;
}

// --- Mata fechada --------------------------------------------------------------------------

interface Clump { x: number; y: number; r: number; mat: F; k: number }

interface Stamp { half: number; size: number; inside: Uint8Array; shade: Float32Array; off: Int8Array }
const stamps = new Map<string, Stamp>();
/**
 * Um tufo da copa pronto (forma, luz e folhas em volta do centro), guardado por tufo: o mesmo tufo aparece em vários
 * tiles (o dele e os vizinhos) e a textura, presa ao centro do tufo, sai igual dos dois lados da emenda.
 */
function clumpStamp(c: Clump): Stamp {
  const key = `${c.k}:${c.r}`;
  let st = stamps.get(key);
  if (!st) {
    const half = c.r + 1, size = half * 2 + 1, rx = c.r, ry = c.r * 0.88;
    const body = sphere(-2, -3, rx * 1.05, ry * 1.05);
    st = { half, size, inside: new Uint8Array(size * size), shade: new Float32Array(size * size), off: new Int8Array(size * size) };
    for (let sy = 0; sy < size; sy++)
      for (let sx = 0; sx < size; sx++) {
        const x = sx - half + 0.5, y = sy - half + 0.5;
        // Beira de folhas: o contorno ondula em dentes.
        const a = Math.atan2(y, x);
        const bite = 1 - 0.08 * (0.5 + 0.5 * Math.sin(a * 9 + c.k));
        if ((x / rx) ** 2 + (y / ry) ** 2 > bite * bite) continue;
        const i = sy * size + sx;
        st.inside[i] = 1;
        st.shade[i] = body(x, y);
        // Folhas: manchinhas de 3 px mais claras no lado do sol e mais escuras no outro.
        const n = noise(Math.floor((sx - half) / 3) + 50, Math.floor((sy - half) / 3) + 50, 80 + c.k);
        st.off[i] = n < 0.18 ? -1 : n > 0.86 ? 1 : 0;
      }
    stamps.set(key, st);
  }
  return st;
}

/**
 * Campo de tufos da copa, que se repete a cada 128 px: uma grade de 5×5 desencontrada de propósito, com tufos grandes
 * e pequenos misturados, para a repetição não aparecer como xadrez.
 */
const CLUMPS: Clump[] = (() => {
  const out: Clump[] = [];
  const cell = HD / 5;
  for (let j = 0; j < 5; j++)
    for (let i = 0; i < 5; i++) {
      const k = j * 5 + i;
      const big = noise(i, j, 75) < 0.45;
      out.push({
        x: Math.round(i * cell + cell / 2 + (noise(i, j, 70) - 0.5) * cell * 0.9),
        y: Math.round(j * cell + cell / 2 + (noise(j, i, 71) - 0.5) * cell * 0.9),
        r: Math.round(big ? 22 + noise(i, j, 72) * 9 : 13 + noise(i, j, 72) * 6),
        mat: noise(i, j, 73) < 0.34 ? F.Leaf2 : F.Leaf,
        k,
      });
    }
  return out;
})();
/** Quanto a copa recua a mais do lado sul (mostrando o sub-bosque escuro e os troncos). */
const SOUTH_GAP = 30;

/**
 * Tile de mata fechada pelos vizinhos que não são mata (`open`, 8 bits): por baixo, o sub-bosque escuro; perto de um
 * lado sul aberto, os troncos descendo da copa; por cima, os tufos da copa, cada um uma esfera de folhas com luz de
 * cima à esquerda, os da frente riscando os de trás. Tufo de tile vizinho entra pela mesma regra (a distância é a
 * mesma vista dos dois lados), então a copa emenda.
 */
export function canopyTile(variant: ForestVariant, open: number, v: number): Paper {
  const p = new Paper(variant);
  const d = (x: number, y: number) => distTo(open, x, y, SOUTH_GAP);
  const clumps: Clump[] = [];
  for (let oy = -1; oy <= 1; oy++)
    for (let ox = -1; ox <= 1; ox++)
      for (const c0 of CLUMPS) {
        // Tufo que não encosta na beira do tile pode mudar com a variação (a emenda não muda): a mata fechada deixa de
        // repetir o mesmo desenho a cada tile.
        const inner = ox === 0 && oy === 0 && v > 0 && c0.x - c0.r > 8 && c0.y - c0.r > 8 && c0.x + c0.r < HD - 8 && c0.y + c0.r < HD - 8;
        const c = inner
          ? { ...c0, x: c0.x + Math.round((noise(c0.k, v, 81) - 0.5) * 14), y: c0.y + Math.round((noise(v, c0.k, 82) - 0.5) * 14), mat: noise(c0.k, v, 83) < 0.4 ? F.Leaf2 : F.Leaf }
          : c0;
        const x = c.x + ox * HD, y = c.y + oy * HD;
        if (x + c.r < 0 || y + c.r < 0 || x - c.r > HD - 1 || y - c.r > HD - 1) continue;
        // O tufo quase inteiro cabe antes da beira: a copa termina em arcos que tocam a beira, sem corte reto.
        if (d(x, y) <= c.r * 0.85 + noise(c.k, 0, 78) * 7) continue;
        clumps.push({ ...c, x, y });
      }
  clumps.sort((a, b) => a.y - b.y || a.x - b.x);
  // Sub-bosque: o escuro debaixo da copa, um pouco maior que cada tufo e puxado para baixo (a sombra da folhagem).
  const shadow = new Uint8Array(HD * HD);
  for (const c of clumps) {
    const rx = c.r * 1.12, ry = c.r * 1.2, cy = c.y + 5;
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(HD - 1, cy + ry); y++)
      for (let x = Math.max(0, Math.floor(c.x - rx)); x <= Math.min(HD - 1, c.x + rx); x++)
        if (((x + 0.5 - c.x) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) shadow[y * HD + x] = 1;
  }
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => shadow[Math.floor(y) * HD + Math.floor(x)] === 1, F.Under, (x, y) => 0.24 + (sn(x, y, 16, 76) - 0.5) * 0.1, (x, y) => (noise(x >> 1, y >> 1, 77) < 0.08 ? 1 : 0));
  // Troncos: só dos tufos deste tile, longe das emendas de leste e oeste, quando há chão aberto logo ao sul.
  for (const c of clumps) {
    if (c.x < 14 || c.x > HD - 14 || c.y < 0 || c.y > HD) continue;
    const south = distTo(open & OPEN.s, c.x, c.y);
    if (south > 64) continue;
    const foot = c.y + south - SOUTH_GAP + 4;
    if (foot <= c.y + 6) continue;
    const lean = (noise(c.k, v, 79) - 0.5) * 6;
    limb(p, [c.x + lean, foot], [c.x, c.y + 4], 5.2, 3.6, variant === "oldwood" && c.k % 7 === 3 ? F.Birch : F.Bark);
    // Raiz aparecendo dos dois lados do pé.
    limb(p, [c.x + lean - 7, foot + 1], [c.x + lean, foot - 4], 1.6, 3, F.Bark);
    limb(p, [c.x + lean + 7, foot + 1], [c.x + lean, foot - 4], 1.6, 3, F.Bark);
  }
  for (const c of clumps) {
    const st = clumpStamp(c);
    const look = (x: number, y: number) => {
      const sx = Math.floor(x) - c.x + st.half, sy = Math.floor(y) - c.y + st.half;
      return sx >= 0 && sy >= 0 && sx < st.size && sy < st.size ? sy * st.size + sx : -1;
    };
    p.fill([c.x - st.half, c.y - st.half, c.x + st.half, c.y + st.half], (x, y) => { const i = look(x, y); return i >= 0 && st.inside[i] === 1; },
      c.mat, (x, y) => st.shade[look(x, y)], (x, y) => st.off[look(x, y)]);
  }
  return p;
}

// --- Água ---------------------------------------------------------------------------------

/**
 * Água pelos vizinhos que são terra (bits de `OPEN`): no Bosque Velho, o riacho claro com seixos no fundo raso e
 * riscos de correnteza; no Coração da Mata, a lagoa escura e parada com folhas de nenúfar; no pântano, a água turva e
 * parada com manchas de lentilha-d'água e mais nenúfares. Barro na margem.
 */
export function waterTile(variant: ForestVariant, land: number, v: number): Paper {
  const p = new Paper(variant);
  const heart = variant !== "oldwood";
  const marsh = isWetland(variant);
  const shore = field(land, 64);
  p.fill([0, 0, HD - 1, HD - 1], () => true, F.Mud, () => 0.5);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const d = shore[y * HD + x] + (sn(x, y, 16, 90) - 0.5) * 8;
      const i = y * HD + x;
      if (d < 5) { p.mat[i] = F.Mud; p.shade[i] = 0.45; p.off[i] = noise(x, y, 91) < 0.25 ? -1 : 0; continue; }
      if (d < 8 && !heart) { p.mat[i] = F.Foam; p.shade[i] = 0.7; p.off[i] = noise(x, y, 92) < 0.4 ? -1 : 0; continue; }
      const deep = d > 30;
      // No pântano (água larga), o ruído perto da beira do tile é o mesmo para todos (a emenda casa) e no miolo é o da
      // variação: a lagoa não vira um xadrez de tiles iguais.
      const rim = marsh ? Math.min(1, Math.min(x, y, HD - 1 - x, HD - 1 - y) / 14) : 0;
      const mixed = (cell: number, seed: number) => (marsh ? 0.5 + (sn(x, y, cell, seed + 40 + v * 7) - 0.5) * rim : sn(x, y, cell, seed));
      p.mat[i] = deep ? F.Deep : F.Water;
      // (No pântano, a água funda fica no meio de uma faixa de tom: na divisa, o pontilhado vira um xadrez na lagoa toda.)
      p.shade[i] = deep ? (marsh ? 0.6 : 0.48) + (mixed(32, 93) - 0.5) * 0.1 : 0.7 - Math.min(1, d / 30) * 0.22;
      p.off[i] = 0;
      if (heart) {
        // Reflexo parado: manchas largas e suaves.
        if (mixed(32, 94) > 0.7) p.off[i] = 1;
        // Lentilha-d'água: pontinhos verdes em manchas, mais junto da margem.
        const duck = mixed(16, 102);
        if (marsh && duck - Math.min(1, d / 60) * 0.25 > 0.5 && noise(x, y, 103) < 0.55) {
          p.mat[i] = F.Leaf2;
          p.off[i] = noise(x, y, 104) < 0.3 ? 1 : 0;
        }
      } else {
        // Correnteza: riscos claros curtos de oeste a leste.
        const flow = ((y * 7 + Math.floor(x / 9) * 3 + Math.floor(sn(x, y, 32, 95) * 12)) % 19 + 19) % 19;
        if (flow === 0 && noise(x >> 3, y, 96) < 0.55) p.off[i] = 1;
        // Seixos no raso.
        if (!deep && d < 20 && noise(x >> 2, y >> 2, 97 + v) < 0.08) { p.mat[i] = F.Stone; p.off[i] = noise(x, y, 98) < 0.5 ? -1 : 0; }
      }
    }
  if (heart)
    for (let k = 0; k < (marsh ? v % 3 : 1 + (v % 2)); k++) {
      const cx = 30 + noise(k, v, 99) * 68, cy = 30 + noise(v, k, 100) * 68;
      if (distTo(land, cx, cy) < 18) continue;
      const notch = noise(k, v, 101) * Math.PI * 2;
      p.fill(ebox(cx, cy, 9, 7), (x, y) => {
        const a = Math.atan2(y - cy, x - cx);
        const gap = Math.abs(Math.atan2(Math.sin(a - notch), Math.cos(a - notch))) < 0.3;
        return inEllipse(cx, cy, 9, 7)(x, y) && !gap;
      }, F.Leaf2, sphere(cx, cy, 10, 8));
      if (k === 0 && v % 3 === 0) { ellipse(p, cx + 3, cy - 2, 2.4, 2, F.Flower); p.on(cx + 3, cy - 2, F.Bloom, 4); }
      else if (marsh && v % 2 === 1) { ellipse(p, cx + 2, cy - 2, 2.6, 2.2, F.Flower); p.on(cx + 2, cy - 3, F.Glow, 3); }
    }
  return p;
}

/**
 * Ponte de madeira por cima do riacho (3 tiles de largura, o caminho é norte-sul): tábuas deitadas de leste a oeste,
 * com a água escura aparecendo nas frestas; `side` -1 e 1 são as colunas da beira, com o corrimão e os postes.
 */
export function bridgeTile(variant: ForestVariant, side: -1 | 0 | 1, v: number): Paper {
  const p = new Paper(variant);
  p.fill([0, 0, HD - 1, HD - 1], () => true, F.Deep, () => 0.3);
  for (let b = 0; b < 8; b++) {
    const y0 = b * 16 + 1, y1 = b * 16 + 14;
    const sag = (noise(b, v, 110) - 0.5) * 2;
    p.fill([0, y0, HD - 1, y1], (x, y) => y >= y0 + sag * (x / HD) && y <= y1, F.Wood, (x, y) => 0.62 - ((y - y0) / 14) * 0.18 + (noise(b, x >> 5, 111) - 0.5) * 0.08,
      (x, y) => (noise(x >> 2, y, 112 + b) < 0.08 ? -1 : 0));
    // Veio da madeira e os pregos.
    for (let x = 0; x < HD; x++) if (noise(x >> 3, b, 113) < 0.4) p.on(x, y0 + 5 + Math.round(Math.sin(x / 7 + b) * 1.5), null, 2);
    for (const nx of [10, 64, 118]) { p.on(nx, y0 + 4, F.Stone, 1); p.on(nx, y0 + 9, F.Stone, 1); }
  }
  if (side !== 0) {
    // Corrimão: viga ao longo da beira, postes a cada 2 tábuas.
    const x0 = side < 0 ? 4 : HD - 22, x1 = x0 + 18;
    p.fill([x0, 0, x1, HD - 1], () => true, F.Bark, (x) => lit((x - (x0 + 9)) / 9, -0.3, 0.8), (x, y) => (y % 13 === 0 ? -1 : 0));
    for (let y = 8; y < HD; y += 32) ellipse(p, x0 + 9, y, 11, 8, F.Wood);
  }
  return p;
}

/**
 * Passarela do pântano (1 tile de largura) por cima da água: tábuas atravessadas, de comprimento e altura desiguais, nas
 * duas vigas; `across` é o caminho de leste a oeste. A água aparece dos lados e nas frestas (a camada de baixo).
 * `ends`: os lados do caminho que terminam neste tile (bits de `OPEN`), onde ficam os postes de amarrar.
 */
export function boardTile(variant: ForestVariant, across: boolean, ends: number, v: number): Paper {
  const p = new Paper(variant);
  // Desenha como se o caminho fosse norte-sul e gira no fim.
  const half = 38;
  for (const bx of [64 - half + 8, 64 + half - 8]) p.fill([bx - 4, 0, bx + 4, HD - 1], () => true, F.Bark, () => 0.35);
  for (let b = 0; b < 8; b++) {
    const y0 = b * 16 + 2, y1 = y0 + 12;
    const l = 64 - half + (noise(b, v, 114) - 0.5) * 10, r = 64 + half + (noise(v, b, 115) - 0.5) * 10;
    const tilt = (noise(b, v, 116) - 0.5) * 3;
    const old = noise(b, v, 117) < 0.18;
    p.fill([l, y0 - 2, r, y1 + 2], (x, y) => y >= y0 + tilt * ((x - 64) / half) && y <= y1 + tilt * ((x - 64) / half), old ? F.Bark : F.Wood,
      (x, y) => 0.64 - ((y - y0) / 12) * 0.2 + (noise(b, x >> 5, 118) - 0.5) * 0.08, (x, y) => (noise(x >> 2, y, 119 + b) < 0.08 ? -1 : 0));
    for (let x = Math.ceil(l) + 3; x < r - 3; x++) if (noise(x >> 3, b, 126) < 0.4) p.on(x, y0 + 6 + Math.round(Math.sin(x / 7 + b) * 1.2), null, 2);
    // Musgo na ponta das tábuas velhas.
    if (old) for (let x = Math.ceil(l); x < l + 10; x++) for (let y = y0; y <= y1; y++) if (noise(x, y, 127) < 0.5) p.on(x, y, F.Moss, 3);
  }
  const post = (y: number) => {
    for (const x of [64 - half - 2, 64 + half + 2]) {
      ellipse(p, x, y, 8, 8, F.Bark);
      for (let a = 0; a < 6.3; a += 0.4) p.on(x + Math.cos(a) * 5, y + Math.sin(a) * 5, null, 2);
    }
  };
  const north = across ? ends & OPEN.w : ends & OPEN.n, south = across ? ends & OPEN.e : ends & OPEN.s;
  if (north) post(10);
  if (south) post(HD - 12);
  if (!across) return p;
  // Gira 90° (o norte vira o oeste): a luz continua de cima à esquerda porque as tábuas são quase chatas.
  const q = new Paper(variant);
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      const i = x * HD + y, o = y * HD + x;
      q.mat[o] = p.mat[i]; q.shade[o] = p.shade[i]; q.off[o] = p.off[i]; q.fixed[o] = p.fixed[i]; q.part[o] = p.part[i];
    }
  return q;
}

/**
 * Lamaçal do pântano (por cima do capim), pelos vizinhos que não são lama (`out`): a beira ondulada como a da trilha,
 * a lama escura e brilhante, poças d'água paradas e pegadas afundadas.
 */
export function bogTile(variant: ForestVariant, out: number, v: number): Paper {
  const p = new Paper(variant);
  const edge = (x: number, y: number) => 22 + (sn(x, y, 32, 300) - 0.5) * 24 + (sn(x, y, 16, 301) - 0.5) * 8;
  const dist = field(out, 62);
  p.fill([0, 0, HD - 1, HD - 1], (x, y) => at(dist, x, y) > edge(x, y), F.Mud, (x, y) => FLAT - 0.06 + (sn(x, y, 16, 302) - 0.5) * 0.2,
    (x, y) => (noise(x, y, 303) < 0.05 ? -1 : noise(x, y, 304) > 0.98 ? 1 : 0));
  for (let y = 0; y < HD; y++)
    for (let x = 0; x < HD; x++) {
      if (!p.has(x, y)) continue;
      const i = y * HD + x;
      const d = dist[i] - edge(x, y);
      if (d < 2) p.on(x, y, null, 1);
      else if (d < 7 && noise(x >> 1, y >> 1, 305) < 0.25) { p.mat[i] = F.Grass; p.fixed[i] = noise(x, y, 306) < 0.5 ? 3 : 2; }
    }
  // Poças: água parada no fundo da lama, longe da beira do tile (não cruzam a emenda, então mudam com a variação).
  for (let k = 0; k < 1 + (v % 2); k++) {
    const cx = 34 + noise(k, v, 307) * 60, cy = 34 + noise(v, k, 308) * 60, rx = 10 + noise(k, v + 3, 309) * 12, ry = rx * (0.5 + noise(v, k + 3, 310) * 0.2);
    const wob = (a: number) => 1 + 0.18 * Math.sin(a * 3 + k + v) + 0.1 * Math.sin(a * 5 + v);
    for (let y = Math.floor(cy - ry - 3); y <= cy + ry + 3; y++)
      for (let x = Math.floor(cx - rx - 3); x <= cx + rx + 3; x++) {
        const u = (x + 0.5 - cx) / rx, w = (y + 0.5 - cy) / ry, r = Math.hypot(u, w) / wob(Math.atan2(w, u));
        if (r > 1 || !p.has(x, y)) continue;
        const i = y * HD + x;
        p.mat[i] = F.Water;
        // Beira escura, o meio na cor da água e o brilho do céu em riscos do lado da luz.
        p.fixed[i] = r > 0.85 ? 1 : w < -0.2 && u < 0.2 && noise(x >> 2, y, 311) < 0.25 ? 4 : 2;
      }
  }
  return p;
}

// --- Troncos caídos e muros ----------------------------------------------------------------

/**
 * Tronco caído (Bosque Velho) pelos vizinhos que também são tronco (bits n, e, s, w): deitado de leste a oeste ou de
 * norte a sul, casca com sulcos, musgo por cima e, na ponta solta, o corte com os anéis. Onde dois se cruzam (o canto
 * da cerca), o deitado passa por cima.
 */
export function logTile(variant: ForestVariant, joins: number, v: number): Paper {
  const p = new Paper(variant);
  const across = (joins & (OPEN.e | OPEN.w)) !== 0 || (joins & (OPEN.n | OPEN.s)) === 0;
  const down = (joins & (OPEN.n | OPEN.s)) !== 0;
  const R = 26;
  const cut = (x: number, y: number, rx: number, ry: number) => {
    ellipse(p, x, y, rx, ry, F.Wood);
    for (let r = 4; r < rx; r += 5)
      for (let a = 0; a < Math.PI * 2; a += 0.08) p.on(x + Math.cos(a) * r * (rx / rx), y + Math.sin(a) * r * (ry / rx), null, 2);
    p.on(x, y, null, 1);
  };
  if (down) {
    const y0 = joins & OPEN.n ? 0 : 22, y1 = joins & OPEN.s ? HD - 1 : HD - 22;
    p.fill([64 - R, y0, 64 + R, y1], (x) => Math.abs(x - 64) <= R, F.Bark, (x) => lit((x - 64) / R, 0, Math.sqrt(Math.max(0, 1 - ((x - 64) / R) ** 2))),
      (x, y) => ((Math.floor(x / 5) + (y >> 4)) % 3 === 0 && noise(x, y >> 2, 120) < 0.6 ? -1 : 0));
    for (let y = y0; y <= y1; y++) for (let x = 64 - R + 4; x < 64 + 2; x++) if (sn(x, y, 16, 121) > 0.55) p.on(x, y, F.Moss, 3 + (noise(x, y, 122) < 0.3 ? 1 : 0));
    if (!(joins & OPEN.s)) cut(64, y1, R, R * 0.55);
    if (!(joins & OPEN.n)) ellipse(p, 64, y0, R, R * 0.45, F.Bark);
  }
  if (across) {
    const x0 = joins & OPEN.w ? 0 : 20, x1 = joins & OPEN.e ? HD - 1 : HD - 20;
    const cy = 64;
    p.fill([x0, cy - R, x1, cy + R], (x, y) => Math.abs(y - cy) <= R * 0.9, F.Bark, (x, y) => {
      const u = (y - cy) / (R * 0.9);
      return lit(0, u, Math.sqrt(Math.max(0, 1 - u * u)));
    }, (x, y) => ((Math.floor(y / 5) + (x >> 4)) % 3 === 0 && noise(x >> 2, y, 123) < 0.6 ? -1 : 0));
    // Musgo no lombo e a sombra no pé.
    for (let x = x0; x <= x1; x++)
      for (let y = cy - R; y < cy - 4; y++) if (sn(x, y, 16, 124) > 0.5 && p.has(x, y)) p.on(x, y, F.Moss, 3 + (noise(x, y, 125) < 0.3 ? 1 : 0));
    if (!(joins & OPEN.w)) cut(x0, cy, R * 0.55, R * 0.9);
    if (!(joins & OPEN.e)) cut(x1, cy, R * 0.55, R * 0.9);
    // Cogumelos-orelha na casca, às vezes.
    if (v % 3 === 0) for (let k = 0; k < 3; k++) ellipse(p, 40 + k * 14, cy + R * 0.5, 6, 3.5, F.Cap);
  }
  return p;
}

/**
 * Muro do santuário élfico (Coração da Mata) pelos vizinhos que também são muro e se há chão ao sul: tampo de lajes
 * com musgo e a face de blocos na frente, com uma runa que brilha de vez em quando. A ponta solta fica quebrada.
 */
export function wallTile(variant: ForestVariant, joins: number, south: boolean, v: number): Paper {
  const p = new Paper(variant);
  const half = 30;
  const x0 = joins & OPEN.w ? 0 : 64 - half - noise(v, 1, 130) * 8;
  const x1 = joins & OPEN.e ? HD - 1 : 64 + half + noise(v, 2, 131) * 8;
  const y0 = joins & OPEN.n ? 0 : 20;
  const y1 = joins & OPEN.s ? HD - 1 : HD - 24;
  const capBottom = south ? Math.min(y1, HD - 50) : y1;
  const broken = (x: number, y: number) => {
    const jag = noise(x >> 3, y >> 3, 132 + v) * 14;
    return (!(joins & OPEN.w) && x < x0 + jag) || (!(joins & OPEN.e) && x > x1 - jag) || (!(joins & OPEN.n) && y < y0 + jag * 0.6);
  };
  const block = (x: number, y: number, row0 = 0) => {
    const row = Math.floor((y + row0) / 18);
    const jx = ((x + (row % 2) * 14) % 28 + 28) % 28;
    return (y + row0) % 18 === 0 || jx === 0 ? -1 : 0;
  };
  p.fill([x0, y0, x1, capBottom], (x, y) => !broken(x, y), F.Stone, () => FLAT, (x, y) => block(x, y));
  for (let y = y0; y <= capBottom; y++) for (let x = Math.floor(x0); x <= x1; x++) if (sn(x, y, 32, 133) > 0.56 && p.has(x, y)) p.on(x, y, F.Moss, 3 + (noise(x, y, 134) < 0.25 ? 1 : 0));
  if (south) {
    p.fill([x0, capBottom, x1, HD - 1], (x, y) => !broken(x, y), F.Stone, (x, y) => 0.5 - ((y - capBottom) / 50) * 0.26, (x, y) => block(x, y, 9));
    for (let x = Math.ceil(x0); x <= x1; x++) { p.on(x, capBottom, null, 5); p.on(x, capBottom + 1, null, 1); }
    // Musgo escorrendo da borda e a runa entalhada.
    for (let k = 0; k < 5; k++) {
      const x = x0 + 6 + noise(k, v, 135) * (x1 - x0 - 12);
      const len = 6 + noise(v, k, 136) * 22;
      for (let y = capBottom; y < capBottom + len; y++) { p.on(x, y, F.Moss, 3); p.on(x + 1, y, F.Moss, 2); }
    }
    if (v % 2 === 0) {
      const cx = (x0 + x1) / 2, cy = capBottom + 24;
      for (let s = 0; s < 18; s++) { const a = s * 0.6, r = s * 0.45; p.on(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, F.Glow, 3); }
    }
  }
  return p;
}

// --- Enfeites rasteiros --------------------------------------------------------------------

export const FLAT_DECOR = ["leaves", "twigs", "clover", "pebbles", "moss", "flowers", "cones", "shrooms", "roots", "tracks", "bones"] as const;
export type FlatDecor = (typeof FLAT_DECOR)[number];

/** Enfeite rasteiro de 1 tile (sem sair dele): folhas, gravetos, trevos, pedrinhas, flores, pinhas, cogumelos... */
export function flatDecor(variant: ForestVariant, kind: FlatDecor, v: number): Paper {
  const p = new Paper(variant);
  const r = (k: number) => noise(k, v, 140 + FLAT_DECOR.indexOf(kind));
  switch (kind) {
    case "leaves":
      for (let k = 0; k < 9; k++) {
        const x = 30 + r(k) * 68, y = 30 + r(k + 9) * 68, a = r(k + 20) * Math.PI;
        const ca = Math.cos(a), sa = Math.sin(a);
        p.fill([x - 7, y - 7, x + 7, y + 7], (px, py) => {
          const u = (px - x) * ca + (py - y) * sa, w = -(px - x) * sa + (py - y) * ca;
          return (u / 6.5) ** 2 + (w / 3.4) ** 2 <= 1;
        }, k % 3 ? F.Litter : F.Leaf3, (px, py) => 0.58 + ((x - px) + (y - py)) * 0.04);
        line(p, [x - ca * 5, y - sa * 5], [x + ca * 5, y + sa * 5], null, 1);
      }
      break;
    case "twigs":
      for (let k = 0; k < 4; k++) {
        const x = 30 + r(k) * 60, y = 34 + r(k + 4) * 60, a = r(k + 8) * Math.PI;
        const len = 18 + r(k + 12) * 18;
        const b: Pt = [x + Math.cos(a) * len, y + Math.sin(a) * len];
        limb(p, [x, y], b, 1.8, 1.2, F.Bark);
        limb(p, [x + (b[0] - x) * 0.5, y + (b[1] - y) * 0.5], [x + (b[0] - x) * 0.5 + 6, y + (b[1] - y) * 0.5 - 7], 1.2, 0.8, F.Bark);
      }
      break;
    case "clover":
      for (let k = 0; k < 6; k++) {
        const x = 34 + r(k) * 60, y = 34 + r(k + 6) * 60;
        for (const [dx, dy] of [[0, -3.5], [-3.5, 2], [3.5, 2]] as const) ellipse(p, x + dx, y + dy, 3.4, 3, F.Moss);
        if (k === 2 && variant === "oldwood") ellipse(p, x, y - 8, 2.6, 2.6, F.Flower);
      }
      break;
    case "pebbles":
      for (let k = 0; k < 6; k++) ellipse(p, 30 + r(k) * 68, 34 + r(k + 6) * 60, 3 + r(k + 12) * 4, 2.4 + r(k + 18) * 3, F.Stone);
      break;
    case "moss":
      p.fill([16, 24, 112, 104], (x, y) => sn(x, y, 16, 150 + v) > 0.56 && Math.hypot(x - 64, y - 64) < 44, F.Moss, (x, y) => 0.6 + (sn(x, y, 8, 151) - 0.5) * 0.3);
      break;
    case "flowers":
      for (let k = 0; k < 7; k++) {
        const x = 30 + r(k) * 68, y = 32 + r(k + 7) * 64;
        limb(p, [x, y + 6], [x, y], 0.8, 0.8, F.Fern);
        for (let a = 0; a < 5; a++) ellipse(p, x + Math.cos(a * 1.26) * 2.6, y + Math.sin(a * 1.26) * 2.2, 2, 1.8, k % 3 ? F.Flower : F.Bloom);
        p.on(x, y, F.Bloom, 5);
      }
      break;
    case "cones":
      for (let k = 0; k < 4; k++) {
        const x = 34 + r(k) * 60, y = 40 + r(k + 4) * 56;
        ellipse(p, x, y, 5, 7, F.Wood);
        for (let s = -5; s <= 5; s += 3) line(p, [x - 4, y + s], [x + 4, y + s + 1], null, 1);
      }
      break;
    case "shrooms":
      for (let k = 0; k < 3; k++) {
        const x = 40 + r(k) * 48, y = 54 + r(k + 3) * 40, s = 0.8 + r(k + 6) * 0.5;
        limb(p, [x, y + 8 * s], [x, y], 2.4 * s, 2 * s, F.Flower);
        ellipse(p, x, y - 1, 7 * s, 4.5 * s, variant === "heartwood" && k % 2 ? F.Glow : F.Cap);
        p.on(x - 2, y - 3, F.Flower, 5);
      }
      break;
    case "roots":
      for (let k = 0; k < 3; k++) {
        let x = 20 + r(k) * 30, y = 30 + r(k + 3) * 70;
        for (let s = 0; s < 10; s++) {
          const nx = x + 8, ny = y + (r(s + k * 10) - 0.5) * 10;
          limb(p, [x, y], [nx, ny], 3.6 - s * 0.25, 3.4 - s * 0.25, F.Bark);
          x = nx; y = ny;
        }
      }
      break;
    case "tracks":
      // Pegadas de cervo: pares de gotas em fila, na diagonal.
      for (let k = 0; k < 5; k++) {
        const x = 30 + k * 16 + r(k) * 4, y = 34 + k * 14 + (k % 2) * 6;
        ellipse(p, x - 1.6, y, 1.6, 3.2, F.Mud);
        ellipse(p, x + 1.6, y, 1.6, 3.2, F.Mud);
      }
      break;
    case "bones": {
      // Ossos de quem chegou antes: um crânio de bicho e ossos compridos espalhados.
      const cx = 46 + r(1) * 30, cy = 50 + r(2) * 26;
      p.together(() => { ellipse(p, cx, cy, 11, 9, F.Birch); ellipse(p, cx + 8, cy + 4, 6, 4.5, F.Birch); });
      ellipse(p, cx - 3, cy - 1, 2.6, 2.4, F.Line);
      ellipse(p, cx + 4, cy - 1, 2.4, 2.2, F.Line);
      for (let k = 0; k < 3; k++) {
        const x = 30 + r(k + 3) * 66, y = 36 + r(k + 6) * 60, a = r(k + 9) * Math.PI, len = 10 + r(k + 12) * 8;
        const b: Pt = [x + Math.cos(a) * len, y + Math.sin(a) * len];
        p.together(() => {
          limb(p, [x, y], b, 1.8, 1.8, F.Birch);
          ellipse(p, x, y, 3, 2.6, F.Birch);
          ellipse(p, b[0], b[1], 3, 2.6, F.Birch);
        });
      }
      break;
    }
  }
  return p;
}

// --- De pé ---------------------------------------------------------------------------------

/** Quadros dos objetos de pé (px): a base fica no pé do quadro, no meio. */
export const TREE = { w: 256, h: 384 } as const;
export const GIANT = { w: 512, h: 640 } as const;
export const HEART = { w: 704, h: 832 } as const;
export const TALL = { w: 128, h: 224 } as const;

export const SPECIES: Record<ForestVariant, readonly string[]> = {
  oldwood: ["oak", "beech", "birch", "pine"],
  heartwood: ["elder", "willow", "mushroom", "dead"],
  marsh: ["cypress", "mangrove", "willow", "dead"],
  swamp: ["cypress", "mangrove", "willow", "dead"],
};

/** Copa de tufos: várias esferas de folhas numa cúpula, as de trás primeiro; cada tufo risca o de trás. */
function crown(p: Paper, cx: number, cy: number, rx: number, ry: number, v: number, mats: F[], count = 14, tuft = 0.42) {
  const whole = sphere(cx - rx * 0.15, cy - ry * 0.2, rx * 1.1, ry * 1.1);
  const tufts: { x: number; y: number; r: number; m: F }[] = [];
  for (let k = 0; k < count; k++) {
    const a = noise(k, v, 160) * Math.PI * 2, d = Math.sqrt(noise(v, k, 161)) * 0.72;
    tufts.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, r: Math.min(rx, ry) * (tuft + noise(k, k + v, 162) * 0.18), m: mats[k % mats.length] });
  }
  tufts.sort((a, b) => a.y - b.y);
  for (const t of tufts) {
    const local = sphere(t.x - 2, t.y - 3, t.r, t.r * 0.9);
    p.fill(ebox(t.x, t.y, t.r, t.r * 0.9), (x, y) => {
      const a = Math.atan2(y - t.y, x - t.x);
      const bite = 1 - 0.09 * (0.5 + 0.5 * Math.sin(a * 8 + t.x));
      return ((x - t.x) / t.r) ** 2 + ((y - t.y) / (t.r * 0.9)) ** 2 <= bite * bite;
    }, t.m, (x, y) => whole(x, y) * 0.55 + local(x, y) * 0.45, (x, y) => {
      const n = noise(Math.floor(x / 3), Math.floor(y / 3), 163 + t.m);
      return n < 0.18 ? -1 : n > 0.87 ? 1 : 0;
    });
  }
}

/** Tronco de casca com sulcos (cápsula afinando), da base até `top`, com as raízes saindo do pé. */
function trunk(p: Paper, base: Pt, top: Pt, rb: number, rt: number, mat: F, roots = 3) {
  p.together(() => {
    limb(p, base, top, rb, rt, mat, (x, y) => (Math.floor((x - base[0]) / 4) % 3 === 0 && noise(x, y >> 2, 170) < 0.65 ? -1 : 0));
    for (let k = 0; k < roots; k++) {
      const side = k % 2 ? 1 : -1, spread = rb * (1.4 + (k >> 1) * 0.6);
      limb(p, [base[0] + side * spread, base[1] + 2], [base[0] + side * rb * 0.3, base[1] - rb * 0.9], rb * 0.22, rb * 0.5, mat);
    }
  });
}

/** Árvore solta (1 tile): o tronco e a copa em quadros separados (a copa fica transparente com o jogador embaixo). */
export function tree(variant: ForestVariant, species: string, v: number): { trunk: Uint8ClampedArray; crown: Uint8ClampedArray } {
  const t = new Paper(variant, TREE.w, TREE.h);
  const c = new Paper(variant, TREE.w, TREE.h);
  const B = TREE.h - 8, X = TREE.w / 2;
  const lean = (noise(v, 1, 180) - 0.5) * 16;
  const h = 0.85 + noise(v, 2, 181) * 0.25;
  switch (species) {
    case "oak": {
      const top: Pt = [X + lean, B - 150 * h];
      trunk(t, [X, B], top, 15, 10, F.Bark, 4);
      limb(t, [X + lean * 0.6, B - 110 * h], [X - 44, B - 168 * h], 7, 4, F.Bark);
      limb(t, [X + lean * 0.7, B - 120 * h], [X + 48, B - 176 * h], 7, 4, F.Bark);
      crown(c, X + lean, B - 210 * h, 108, 92, v, [F.Leaf, F.Leaf2, F.Leaf]);
      break;
    }
    case "beech": {
      const top: Pt = [X + lean * 0.5, B - 190 * h];
      trunk(t, [X, B], top, 12, 9, F.Stone, 3);
      crown(c, X + lean * 0.5, B - 240 * h, 82, 110, v, [F.Leaf2, F.Leaf2, F.Leaf, noise(v, 3, 182) < 0.3 ? F.Leaf3 : F.Leaf2]);
      break;
    }
    case "birch": {
      const top: Pt = [X + lean, B - 230 * h];
      trunk(t, [X, B], top, 9, 6, F.Birch, 2);
      // Faixas pretas da bétula.
      for (let k = 0; k < 16; k++) {
        const s = 0.08 + k * 0.055, y = B - (B - top[1]) * s, x = X + lean * s;
        const w = 3 + noise(k, v, 183) * 5;
        for (let dx = -w; dx <= w; dx++) t.on(x + dx + (noise(k, v, 184) - 0.5) * 6, y, F.Line, 1);
      }
      crown(c, X + lean, B - 250 * h, 70, 80, v, [F.Leaf2, F.Leaf3, F.Leaf2], 12, 0.36);
      break;
    }
    case "pine": {
      trunk(t, [X, B], [X, B - 120], 10, 6, F.Bark, 2);
      // Andares de galhos em triângulo, de baixo para cima (o de cima por cima).
      for (let k = 0; k < 5; k++) {
        const yb = B - 70 - k * 52 * h, w = 96 - k * 16, hh = 92;
        c.fill([X - w - 4, yb - hh, X + w + 4, yb + 6], (x, y) => {
          const u = (yb - y) / hh;
          const edge = w * (1 - u) + Math.sin(x / 5 + k) * 3;
          return u >= 0 && u <= 1 && Math.abs(x - X) <= edge;
        }, k % 2 ? F.Leaf : F.Leaf2, (x, y) => lit((x - X) / w, -0.4 + (y - yb) / hh * 0.3, 0.7), (x, y) => (noise(x >> 2, y >> 1, 185 + k) < 0.15 ? -1 : 0));
      }
      break;
    }
    case "elder": {
      // Ancião retorcido: tronco grosso e torto, copa larga e baixa.
      const mid: Pt = [X - 18 + lean, B - 80 * h], top: Pt = [X + 14 + lean, B - 150 * h];
      t.together(() => { trunk(t, [X, B], mid, 18, 14, F.Bark, 4); limb(t, mid, top, 14, 10, F.Bark); });
      limb(t, top, [X - 52, B - 180 * h], 7, 4, F.Bark);
      for (let k = 0; k < 4; k++) t.on(X - 6 + k, B - 60, F.Lichen, 4);
      crown(c, X + lean, B - 205 * h, 116, 84, v, [F.Leaf, F.Leaf, F.Leaf2, F.Leaf3]);
      break;
    }
    case "willow": {
      const top: Pt = [X + lean, B - 150 * h];
      trunk(t, [X, B], top, 13, 9, F.Bark, 3);
      crown(c, X + lean, B - 205 * h, 96, 70, v, [F.Leaf2, F.Leaf], 10, 0.4);
      // Ramos caindo como cortina.
      for (let k = 0; k < 22; k++) {
        const x = X + lean - 96 + k * 9 + (noise(k, v, 186) - 0.5) * 6;
        const y0 = B - 205 * h + Math.abs(x - X) * 0.2, len = 70 + noise(v, k, 187) * 60;
        limb(c, [x, y0], [x + (noise(k, k, 188) - 0.5) * 8, y0 + len], 3.2, 1.6, k % 3 ? F.Leaf2 : F.Leaf3);
      }
      break;
    }
    case "mushroom": {
      // Cogumelo gigante: pé claro e grosso, chapéu largo com pintas que brilham.
      const top: Pt = [X + lean * 0.4, B - 150 * h];
      t.together(() => { limb(t, [X, B], top, 18, 13, F.Flower); ellipse(t, X, B - 4, 26, 9, F.Flower); });
      for (let k = 0; k < 9; k++) t.on(X - 10 + k * 2, B - 90 * h, null, 2);
      const cy = top[1] - 18;
      c.fill([X - 110, cy - 70, X + 110, cy + 34], (x, y) => {
        const u = (x - (X + lean * 0.4)) / 104, w = (y - cy) / 64;
        return u * u + (w < 0 ? w * w : (w * 64 / 30) ** 2) <= 1;
      }, F.Cap, sphere(X + lean * 0.4 - 20, cy - 30, 120, 80));
      for (let x = X - 100; x < X + 100; x++) c.on(x + lean * 0.4, cy + 26 - Math.abs(x - X) * 0.06, F.Flower, 2);
      for (let k = 0; k < 10; k++) {
        const a = noise(k, v, 189) * Math.PI, d = 0.2 + noise(v, k, 190) * 0.65;
        ellipse(c, X + lean * 0.4 + Math.cos(a) * 90 * d * (k % 2 ? 1 : -1), cy - Math.sin(a) * 48 * d, 6, 4, F.Glow);
      }
      break;
    }
    case "cypress": {
      // Cipreste-do-brejo: pé largo em aba, os joelhos (raízes que saem da água) em volta, copa estreita em andares e
      // barba-de-velho pendurada.
      const top: Pt = [X + lean * 0.4, B - 200 * h];
      t.together(() => {
        limb(t, [X, B], top, 12, 6, F.Bark, (x, y) => (Math.floor((x - X) / 3) % 3 === 0 && noise(x, y >> 2, 171) < 0.7 ? -1 : 0));
        t.fill([X - 30, B - 60, X + 30, B], (x, y) => Math.abs(x - X) < 12 + ((y - (B - 60)) / 60) ** 2.2 * 18, F.Bark,
          (x) => lit((x - X) / 30, 0, 0.8), (x) => (Math.floor((x - X) / 3) % 3 === 0 ? -1 : 0));
      });
      for (let k = 0; k < 5; k++) {
        const kx = X + (k - 2) * 22 + (noise(k, v, 191) - 0.5) * 10, kh = 10 + noise(v, k, 192) * 12;
        if (Math.abs(kx - X) < 26) continue;
        limb(t, [kx, B - 2], [kx + 1, B - 2 - kh], 4.6, 2.4, F.Bark);
      }
      for (let k = 0; k < 4; k++) {
        const yb = B - 120 * h - k * 34 * h, w = 70 - k * 12;
        crown(c, X + lean * 0.4 + (k % 2 ? 8 : -8), yb - 24, w, 30, v + k * 3, [F.Leaf, F.Leaf2, F.Leaf], 7, 0.48);
      }
      for (let k = 0; k < 14; k++) {
        const x = X + lean * 0.4 - 60 + k * 9 + (noise(k, v, 193) - 0.5) * 6;
        const y0 = B - 130 * h - noise(v, k, 194) * 80 * h, len = 20 + noise(k, k, 195) * 34;
        if (!c.has(x, y0)) continue;
        for (let y = y0; y < y0 + len; y++) { c.on(x + Math.sin(y / 4) * 1.2, y, F.Leaf3, 3); c.px(x + Math.sin(y / 4) * 1.2, y, F.Leaf3, noise(x, y, 196) < 0.4 ? 2 : 3); }
      }
      break;
    }
    case "mangrove": {
      // Mangue: o tronco sai de um ninho de raízes-escora em arco e a copa é baixa e redonda.
      const foot = B - 46;
      const top: Pt = [X + lean, B - 150 * h];
      trunk(t, [X, foot], top, 10, 7, F.Bark, 0);
      for (let k = 0; k < 7; k++) {
        const side = k % 2 ? 1 : -1, reach = 18 + (k >> 1) * 14 + noise(k, v, 197) * 6;
        const from: Pt = [X + side * 4, foot - 6 - (k >> 1) * 8];
        const mid: Pt = [X + side * reach * 0.6, foot - 18 - (k >> 1) * 4];
        const end: Pt = [X + side * reach, B - (k % 3)];
        limb(t, from, mid, 3.4, 3, F.Bark);
        limb(t, mid, end, 3, 2.2, F.Bark);
      }
      limb(t, [X + lean * 0.5, B - 110 * h], [X - 40, B - 150 * h], 5, 3, F.Bark);
      limb(t, [X + lean * 0.6, B - 120 * h], [X + 44, B - 156 * h], 5, 3, F.Bark);
      crown(c, X + lean, B - 190 * h, 100, 66, v, [F.Leaf, F.Leaf2, F.Leaf, F.Leaf2], 16, 0.36);
      break;
    }
    default: {
      // Árvore morta: galhos pelados, musgo pendurado e quase sem folha.
      const top: Pt = [X + lean, B - 200 * h];
      trunk(t, [X, B], top, 13, 6, F.Bark, 3);
      const branch = (a: Pt, ang: number, len: number, r: number, depth: number) => {
        const b: Pt = [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len];
        limb(t, a, b, r, r * 0.6, F.Bark);
        if (depth > 0) { branch(b, ang - 0.5, len * 0.7, r * 0.6, depth - 1); branch(b, ang + 0.45, len * 0.65, r * 0.6, depth - 1); }
        else for (let y = b[1]; y < b[1] + 24; y++) t.on(b[0] + Math.sin(y / 3) * 1.5, y, F.Lichen, 3);
      };
      branch([X + lean * 0.6, B - 120 * h], -2.3, 56, 6, 2);
      branch([X + lean * 0.8, B - 150 * h], -0.9, 52, 5.5, 2);
      crown(c, X + lean, B - 220 * h, 50, 34, v, [F.Lichen, F.Leaf], 5, 0.4);
      break;
    }
  }
  return { trunk: t.render(true), crown: c.render(true) };
}

/** Sapopemas: raízes grossas que saem do tronco em curva e afinam até o chão, dos dois lados. */
function roots(p: Paper, X: number, B: number, count: number, trunkR: number, reach: number, v: number) {
  for (let k = 0; k < count; k++) {
    const side = k % 2 ? 1 : -1, t = (k >> 1) / Math.max(1, (count >> 1) - 1);
    const far = reach * (0.55 + t * 0.45) + noise(k, v, 204) * 16;
    const from: Pt = [X + side * trunkR * 0.55, B - trunkR * (1.1 - t * 0.5)];
    // A raiz sobe num arco antes de afundar no chão (sapopema), em vez de sair reta.
    const mid: Pt = [X + side * (trunkR * 0.8 + far * 0.4), B - trunkR * 0.75 + t * 10];
    const end: Pt = [X + side * (trunkR * 0.6 + far), B - 2 + (k % 3) * 2];
    limb(p, from, mid, trunkR * 0.42, trunkR * 0.28, F.Bark);
    limb(p, mid, end, trunkR * 0.28, 3, F.Bark);
  }
}

/**
 * Árvore anciã (bloco de 2×2): tronco largo de sapopemas (raízes em aba) cobrindo os 2 tiles, casca funda com musgo e
 * líquen, um oco escuro e a copa enorme.
 */
export function giant(variant: ForestVariant, v: number): { trunk: Uint8ClampedArray; crown: Uint8ClampedArray } {
  const t = new Paper(variant, GIANT.w, GIANT.h);
  const c = new Paper(variant, GIANT.w, GIANT.h);
  const B = GIANT.h - 12, X = GIANT.w / 2;
  const heart = variant === "heartwood";
  t.together(() => {
    limb(t, [X, B - 10], [X + (noise(v, 1, 200) - 0.5) * 20, B - 300], 52, 36, F.Bark, (x, y) => (Math.floor((x - X) / 6) % 3 === 0 && noise(x >> 1, y >> 3, 201) < 0.7 ? -1 : 0));
    roots(t, X, B, 6, 50, 130, v);
  });
  // Musgo do lado da sombra (norte-leste) e o oco.
  for (let y = B - 300; y < B; y++) for (let x = X - 60; x < X + 70; x++) if (t.has(x, y) && sn(x, y, 16, 203) > 0.55 && noise(x >> 1, y >> 1, 205) < 0.55 && x > X - 10) t.on(x, y, F.Moss, 3);
  t.fill(ebox(X - 8, B - 120, 16, 24), inEllipse(X - 8, B - 120, 16, 24), F.Under, () => 0.15);
  if (heart) for (let k = 0; k < 5; k++) ellipse(t, X - 40 + k * 22, B - 6 - (k % 2) * 8, 7, 4.5, F.Glow);
  crown(c, X, B - 400, 236, 200, v, [F.Leaf, F.Leaf2, F.Leaf, heart ? F.Leaf3 : F.Leaf], 80, 0.15);
  return { trunk: t.render(true), crown: c.render(true) };
}

/**
 * A árvore do coração (Coração da Mata, 3×3 no alto da arena): tronco imenso com sapopemas que abraçam o chão, um oco
 * com o coração de seiva que pulsa (camada de brilho à parte) e a copa que cobre a arena por trás.
 */
export function heartTree(variant: ForestVariant): { trunk: Uint8ClampedArray; crown: Uint8ClampedArray; glow: Uint8ClampedArray } {
  const t = new Paper(variant, HEART.w, HEART.h);
  const c = new Paper(variant, HEART.w, HEART.h);
  const g = new Paper(variant, HEART.w, HEART.h);
  const B = HEART.h - 14, X = HEART.w / 2;
  t.together(() => {
    limb(t, [X, B - 20], [X - 10, B - 440], 78, 46, F.Bark, (x, y) => (Math.floor((x - X) / 7) % 3 === 0 && noise(x >> 1, y >> 3, 210) < 0.7 ? -1 : 0));
    roots(t, X, B, 10, 84, 250, 3);
  });
  for (let y = B - 420; y < B; y++) for (let x = X - 110; x < X + 110; x++) if (t.has(x, y) && sn(x, y, 16, 211) > 0.55 && noise(x >> 1, y >> 1, 214) < 0.55) t.on(x, y, F.Moss, 3 + (x < X ? 1 : 0));
  // Oco do coração: escuro por dentro, e o coração de seiva brilhando.
  t.fill(ebox(X - 4, B - 190, 34, 48), inEllipse(X - 4, B - 190, 34, 48), F.Under, () => 0.12);
  g.fill(ebox(X - 4, B - 186, 18, 24), inEllipse(X - 4, B - 186, 18, 24), F.Glow, sphere(X - 10, B - 194, 18, 24));
  for (let k = 0; k < 14; k++) {
    const a = noise(k, 1, 212) * Math.PI * 2, d = 40 + noise(1, k, 213) * 120;
    g.px(X + Math.cos(a) * d, B - 220 + Math.sin(a) * d * 0.8, F.Glow, 4);
  }
  crown(c, X, B - 520, 330, 250, 7, [F.Leaf, F.Leaf2, F.Leaf3, F.Leaf], 150, 0.12);
  return { trunk: t.render(true), crown: c.render(true), glow: g.render(false) };
}

/** Pedra musgosa (pedra solta) ou, na arena, o menir com a espiral entalhada que acende (camada de brilho à parte). */
export function stone(variant: ForestVariant, menhir: boolean, v: number): { image: Uint8ClampedArray; glow: Uint8ClampedArray } {
  const p = new Paper(variant, TALL.w, TALL.h);
  const g = new Paper(variant, TALL.w, TALL.h);
  const B = TALL.h - 10;
  if (menhir) {
    const hgt = 150 + noise(v, 1, 220) * 40, lean = (noise(v, 2, 221) - 0.5) * 12;
    const width = (t: number) => 32 - t * 10 + Math.sin(t * 7 + v) * 2;
    p.fill([20, B - hgt - 4, 108, B], (x, y) => {
      const t = (B - y) / hgt;
      const w = width(t) * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) : 1);
      return t >= 0 && t <= 1 && Math.abs(x - (64 + lean * t)) < w;
    }, F.Stone, (x, y) => {
      const t = (B - y) / hgt, u = (x - (64 + lean * t)) / width(t);
      return lit(u, -0.3, Math.sqrt(Math.max(0, 1 - u * u)));
    }, (x, y) => (noise(x >> 1, y >> 1, 222) < 0.1 ? -1 : 0));
    for (let y = B - hgt; y < B; y++) for (let x = 30; x < 100; x++) if (p.has(x, y) && sn(x, y, 16, 223) > 0.6) p.on(x, y, F.Lichen, 3);
    for (let s = 0; s < 34; s++) {
      const a = s * 0.5, r = s * 0.42, x = 64 + lean * 0.5 + Math.cos(a) * r, y = B - hgt * 0.5 + Math.sin(a) * r * 1.2;
      p.on(x, y, null, 1);
      g.px(x, y, F.Glow, 4);
      g.px(x + 1, y, F.Glow, 2);
    }
    ellipse(p, 64, B - 2, 30, 7, F.Moss);
  } else {
    p.together(() => {
      ellipse(p, 60, B - 26, 40, 30, F.Stone);
      ellipse(p, 88, B - 14, 22, 16, F.Stone);
    });
    for (let y = B - 60; y < B; y++) for (let x = 16; x < 112; x++) if (p.has(x, y) && y < B - 30 + sn(x, 0, 16, 224) * 14) p.on(x, y, F.Moss, 3 + (noise(x, y, 225) < 0.3 ? 1 : 0));
    ellipse(p, 36, B - 4, 8, 5, F.Fern);
  }
  return { image: p.render(true), glow: g.render(false) };
}

export const TALL_DECOR = ["fern", "bush", "grass", "mushrooms", "stump", "foxglove", "bramble", "rocks", "cattail", "reeds", "iris", "pitcher"] as const;
export type TallDecor = (typeof TALL_DECOR)[number];

/** Enfeite de pé de 1 tile (sobe até 0,75 tile acima): samambaia, arbusto, capim alto, cogumelos, toco, dedaleira... */
export function tallDecor(variant: ForestVariant, kind: TallDecor, v: number): Uint8ClampedArray {
  const p = new Paper(variant, TALL.w, TALL.h);
  const B = TALL.h - 10;
  const r = (k: number) => noise(k, v, 230 + TALL_DECOR.indexOf(kind));
  const heart = variant === "heartwood";
  switch (kind) {
    case "fern":
      // Samambaia: frondes em arco com folíolos dos dois lados.
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.38;
        const len = 54 + r(k) * 22;
        const pt = (t: number): Pt => [64 + Math.cos(a) * len * t, B - 4 + Math.sin(a) * len * t + 30 * t * t];
        p.together(() => {
          for (let s = 0; s < 10; s++) limb(p, pt(s / 10), pt((s + 1) / 10), 1.8, 1.4, F.Fern);
          for (let s = 2; s < 14; s++) {
            const [x, y] = pt(s / 14), lw = 10 * Math.sin(Math.PI * (s / 14)) + 2;
            for (const side of [-1, 1]) limb(p, [x, y], [x + Math.cos(a + side * 1.4) * lw, y + Math.sin(a + side * 1.4) * lw + 3], 1.5, 0.6, F.Fern);
          }
        });
      }
      break;
    case "bush":
      for (let k = 0; k < 6; k++) ellipse(p, 40 + r(k) * 48, B - 22 - r(k + 6) * 34, 20 + r(k + 12) * 8, 16 + r(k + 18) * 6, k % 2 ? F.Leaf2 : F.Leaf);
      for (let k = 0; k < 7; k++) ellipse(p, 36 + r(k + 30) * 56, B - 18 - r(k + 40) * 40, 2.6, 2.6, heart ? F.Glow : F.Cap);
      break;
    case "grass":
      for (let k = 0; k < 16; k++) {
        const x = 34 + r(k) * 60, hgt = 40 + r(k + 16) * 46, bend = (r(k + 32) - 0.5) * 22;
        limb(p, [x, B], [x + bend, B - hgt], 2.2, 0.8, k % 3 ? F.Grass : F.Moss);
      }
      break;
    case "mushrooms":
      for (let k = 0; k < 4; k++) {
        const x = 34 + r(k) * 60, s = 0.7 + r(k + 4) * 0.7, top = B - 14 - 22 * s;
        limb(p, [x, B - 2], [x, top], 4 * s, 3.4 * s, F.Flower);
        ellipse(p, x, top - 2, 13 * s, 8 * s, heart ? (k % 2 ? F.Glow : F.Cap) : k % 2 ? F.Cap : F.Litter);
        if (!heart) for (let d = 0; d < 3; d++) ellipse(p, x - 6 * s + d * 5 * s, top - 4 - (d % 2) * 2, 1.6, 1.4, F.Flower);
      }
      break;
    case "stump":
      p.together(() => { limb(p, [64, B - 4], [64, B - 34], 28, 26, F.Bark); ellipse(p, 64, B - 36, 27, 11, F.Wood); });
      for (let r0 = 5; r0 < 26; r0 += 5) for (let a = 0; a < Math.PI * 2; a += 0.1) p.on(64 + Math.cos(a) * r0, B - 36 + Math.sin(a) * r0 * 0.4, null, 2);
      for (let k = 0; k < 3; k++) ellipse(p, 44 + k * 14, B - 12 - (k % 2) * 6, 6, 3.6, heart ? F.Glow : F.Cap);
      limb(p, [30, B], [44, B - 10], 3, 5, F.Bark);
      limb(p, [98, B], [84, B - 10], 3, 5, F.Bark);
      break;
    case "foxglove":
      // Dedaleira: hastes com sininhos de flor do meio para cima.
      for (let k = 0; k < 4; k++) {
        const x = 40 + k * 16 + r(k) * 6, hgt = 90 + r(k + 4) * 50;
        limb(p, [x, B], [x, B - hgt], 2, 1.2, F.Fern);
        for (let s = 0; s < 8; s++) ellipse(p, x + (s % 2 ? 4 : -4), B - hgt * 0.4 - s * hgt * 0.07, 4.2, 3.4, heart ? F.Glow : F.Bloom);
        ellipse(p, x, B - 6, 10, 6, F.Fern);
      }
      break;
    case "bramble":
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI + r(k) * Math.PI, len = 34 + r(k + 9) * 26;
        limb(p, [64, B - 6], [64 + Math.cos(a) * len, B - 6 + Math.sin(a) * len * 0.9], 2.2, 1.2, F.Bark);
        ellipse(p, 64 + Math.cos(a) * len, B - 6 + Math.sin(a) * len * 0.9, 8, 6, F.Leaf);
      }
      for (let k = 0; k < 6; k++) ellipse(p, 40 + r(k + 20) * 48, B - 20 - r(k + 26) * 30, 2.8, 2.8, F.Line);
      break;
    case "rocks":
      ellipse(p, 52, B - 14, 24, 17, F.Stone);
      ellipse(p, 84, B - 8, 15, 10, F.Stone);
      for (let x = 30; x < 76; x++) if (sn(x, 0, 16, 240) > 0.45) p.on(x, B - 26 + Math.sin(x / 4) * 2, F.Moss, 3);
      break;
    case "cattail":
      // Taboa: folhas compridas em fita e as espigas marrons em charuto.
      for (let k = 0; k < 10; k++) {
        const x = 38 + r(k) * 52, hgt = 70 + r(k + 10) * 70, bend = (r(k + 20) - 0.5) * 30;
        limb(p, [x, B], [x + bend, B - hgt], 2.6, 0.8, k % 3 ? F.Fern : F.Grass);
      }
      for (let k = 0; k < 4; k++) {
        const x = 46 + k * 12 + r(k + 30) * 6, hgt = 110 + r(k + 34) * 50;
        limb(p, [x, B], [x + (k - 1.5) * 3, B - hgt], 1.4, 1, F.Grass);
        p.together(() => limb(p, [x + (k - 1.5) * 2.4, B - hgt + 30], [x + (k - 1.5) * 2.8, B - hgt + 6], 4.6, 4.2, F.Wood));
      }
      break;
    case "reeds":
      // Junco: muitas hastes finas com o penacho claro no alto.
      for (let k = 0; k < 18; k++) {
        const x = 34 + r(k) * 60, hgt = 60 + r(k + 18) * 80, bend = (r(k + 36) - 0.5) * 24;
        limb(p, [x, B], [x + bend, B - hgt], 1.6, 0.7, k % 4 ? F.Grass : F.Litter);
        if (k % 3 === 0) for (let s = 0; s < 6; s++) ellipse(p, x + bend + (s % 2 ? 3 : -3), B - hgt + s * 4, 3, 2.4, F.Litter);
      }
      break;
    case "iris":
      // Íris-do-brejo: leque de folhas em espada e as flores roxas.
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (k - 4) * 0.16, len = 54 + (4 - Math.abs(k - 4)) * 9 + r(k) * 10;
        limb(p, [64 + (k - 4) * 2, B], [64 + Math.cos(a) * len, B + Math.sin(a) * len], 3.4, 0.8, k % 2 ? F.Fern : F.Leaf2);
      }
      for (let k = 0; k < 3; k++) {
        const x = 46 + k * 18 + r(k + 12) * 6, y = B - 80 - r(k + 15) * 26;
        limb(p, [x, B - 30], [x, y], 1.4, 1.2, F.Fern);
        p.together(() => {
          ellipse(p, x - 5, y + 2, 5, 3.4, F.Bloom);
          ellipse(p, x + 5, y + 2, 5, 3.4, F.Bloom);
          ellipse(p, x, y - 4, 3.6, 5.4, F.Bloom);
        });
        p.on(x, y, F.Glow, 4);
      }
      break;
    case "pitcher":
      // Planta-jarro: jarros verdes com veios escuros, boca aberta e a tampa por cima.
      for (let k = 0; k < 4; k++) {
        const x = 38 + k * 17 + r(k) * 6, s = 0.7 + r(k + 4) * 0.5, top = B - 30 - 34 * s;
        p.together(() => {
          limb(p, [x, B - 4], [x + 2, top + 8], 6 * s, 8 * s, F.Leaf2);
          ellipse(p, x + 2, top + 4, 8 * s, 4 * s, F.Litter);
        });
        ellipse(p, x + 2, top + 4, 5 * s, 2.2 * s, F.Line);
        ellipse(p, x + 6, top - 3, 6 * s, 3.4 * s, F.Litter);
        for (let y = top + 10; y < B - 6; y += 6) line(p, [x - 4 * s, y], [x + 6 * s, y + 2], null, 2);
      }
      for (let k = 0; k < 5; k++) limb(p, [64, B - 2], [30 + k * 17, B - 10 - r(k + 9) * 8], 3, 1, F.Fern);
      break;
  }
  return p.render(true);
}

/** Atalhos dos quadros de chão. */
export const draw = {
  grass: (variant: ForestVariant, v: number) => () => grassTile(variant, v).render(false),
  arena: (variant: ForestVariant, v: number) => () => arenaTile(variant, v).render(false),
};

export type { Offset, Shade };
