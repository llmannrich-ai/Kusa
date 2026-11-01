/**
 * Escultura por código (protótipo, `docs/ARTE_ESCULTURA.md`): o monstro é montado com formas 3D simples (elipsoides e
 * cones arredondados, que cobrem esferas e cápsulas) e cada quadro é "fotografado" em pixel art, no próprio aparelho.
 *
 * Por que 3D e não pincel 2D: a mesma escultura dá o perfil, a frente e as costas, e cada pose (andar, golpe, morte) é
 * só mudar ângulos. As proporções, as cores e a luz não variam de um quadro para outro, que é onde a arte gerada por
 * IA mais escorrega. Nada é baixado: o desenho é código (poucos KB), e o quadro sai em poucos milissegundos.
 *
 * Etapas do quadro:
 * 1. raio por pixel (câmera ortográfica, de cima a `pitch` graus): interseção exata com cada forma, a mais perto ganha;
 * 2. luz de cima à esquerda (como o resto do jogo), sombra de oclusão pela profundidade, luz rebatida da areia por
 *    baixo, brilho especular na quitina e textura (grão) presa à forma, não à tela;
 * 3. o tom vira uma cor da rampa do material (rampas com o matiz deslocado, à mão), com pontilhado só na transição;
 * 4. contorno: escuro por fora (na cor do vizinho, não preto puro) e linhas por dentro onde uma parte passa na frente
 *    de outra.
 *
 * Não usa DOM: roda no navegador e no Node (`apps/client/scripts/esculturaPrevia.ts` gera as pré-visualizações).
 */

export type V3 = readonly [number, number, number];

/** Lado do quadro e linha do chão (o centro do bicho no chão): as partes de cá descem abaixo dela (vista de cima). */
export const SCULPT_SIZE = 144;
export const SCULPT_FEET = SCULPT_SIZE - 56;
/** Vistas da folha: perfil (olhando para a esquerda), frente e costas. */
export type View = "side" | "front" | "back";

/** Material: rampa de cores do escuro ao claro (hex) e como a superfície reage à luz. */
export interface Material {
  ramp: readonly string[];
  /** Brilho especular (0 = fosco; quitina ~0.6, olho ~1). */
  gloss?: number;
  /** Quão concentrado é o brilho (expoente; maior = ponto menor). */
  shine?: number;
  /** Grão da superfície (0..1): varia o tom em manchas presas à forma. */
  grain?: number;
  /** Escala do grão (unidades por mancha). */
  grainSize?: number;
  /** Material da barriga: a parte de baixo da forma (no espaço dela) usa esta rampa. */
  belly?: number;
  /** Deslocamento do tom (−1..1): clareia ou escurece o material todo. */
  bias?: number;
  /** Relevo (granulado da quitina, verrugas): a luz pega nos montinhos e as covas escurecem. */
  bump?: number;
  /** Escala do relevo (unidades por montinho). */
  bumpSize?: number;
  /** Pintas escuras soltas (cerdas, poros): fração dos pixels (0..1). */
  speck?: number;
  /**
   * Diferença de profundidade (unidades) a partir da qual uma parte na frente desenha a linha sobre esta (padrão 2.2).
   * Penas finas umas sobre as outras pedem menos.
   */
  lineDepth?: number;
  /**
   * Ataduras: faixas em espiral em volta da forma (só elipsoides), cada uma num tom; `width` é a largura (unidades),
   * `tilt` quanto a espiral sobe por volta, `crease` o vinco escuro entre faixas, `vary` a diferença de tom entre elas e
   * `gap` a chance de um pedaço de faixa faltar, mostrando o material `gapMat` por baixo; com `stripe`, as faixas
   * alternam entre este material e o `gapMat` (listras do toucado).
   */
  wrap?: { width: number; tilt: number; crease: number; vary: number; gap?: number; gapMat?: number; stripe?: boolean };
  /** Brilho próprio (olhos que acendem): o tom fixo, sem luz nem sombra. */
  emit?: number;
}

/** Forma da escultura, já no espaço da câmera na hora de desenhar. */
type Shape =
  | { kind: "ell"; c: V3; u: V3; v: V3; w: V3; r: V3; mat: number; part: number; band?: Band }
  | { kind: "cone"; a: V3; b: V3; ra: number; rb: number; mat: number; part: number; band?: Band };

/** Faixas ao longo da forma (anéis de segmento, listras): `n` faixas, a cada uma escurece `depth` no começo. */
export interface Band { n: number; depth: number }

/** Transformação afim (3×3 + deslocamento), para posar partes inteiras (rolar o corpo na morte). */
export type Mat3 = readonly [V3, V3, V3];
interface Xf { m: Mat3; t: V3 }

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const v3 = { add, sub, mul, dot, cross, len, norm, lerp: lerp3 };

const apply = (m: Mat3, p: V3): V3 => [dot(m[0], p), dot(m[1], p), dot(m[2], p)];
/** Aplica a rotação `m` ao ponto `p` (em volta de `pivot`). */
export const turn = (m: Mat3, p: V3, pivot: V3 = [0, 0, 0]): V3 => add(apply(m, sub(p, pivot)), pivot);
const compose = (a: Mat3, b: Mat3): Mat3 => {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [dot(a[i], col(0)), dot(a[i], col(1)), dot(a[i], col(2))] as V3) as unknown as Mat3;
};
const IDENTITY: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** Rotação em graus em volta de um eixo (x, y ou z), como matriz. */
export function rot(axis: "x" | "y" | "z", deg: number): Mat3 {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  if (axis === "x") return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === "y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/** Base ortonormal com o primeiro eixo em `dir` (o segundo o mais perto possível de `up`). */
export function basis(dir: V3, up: V3 = [0, 1, 0]): [V3, V3, V3] {
  const u = norm(dir);
  let w = cross(u, up);
  if (len(w) < 1e-4) w = cross(u, [0, 0, 1]);
  w = norm(w);
  const v = cross(w, u);
  return [u, v, w];
}

/**
 * A escultura: lista de formas no espaço do modelo (x para a frente do bicho = esquerda da tela no perfil, y para
 * cima, z para o lado de quem olha; o chão é y = 0). `push`/`pop` posam um grupo de formas de uma vez.
 */
export class Sculpt {
  readonly shapes: Shape[] = [];
  private xf: Xf = { m: IDENTITY, t: [0, 0, 0] };
  private stack: Xf[] = [];
  private nextPart = 1;

  /** Começa uma parte nova: as linhas internas só aparecem entre partes diferentes. */
  part() { return this.nextPart++; }

  /** Aplica `m` (em volta de `pivot`) a tudo o que vier até o `pop`. */
  push(m: Mat3, pivot: V3 = [0, 0, 0], move: V3 = [0, 0, 0]) {
    this.stack.push(this.xf);
    const local: Xf = { m, t: add(sub(pivot, apply(m, pivot)), move) };
    this.xf = { m: compose(this.xf.m, local.m), t: add(apply(this.xf.m, local.t), this.xf.t) };
  }
  pop() { this.xf = this.stack.pop() ?? { m: IDENTITY, t: [0, 0, 0] }; }

  private p(p: V3) { return add(apply(this.xf.m, p), this.xf.t); }
  private d(d: V3) { return norm(apply(this.xf.m, d)); }

  /** Elipsoide de centro `c`, raios `r` nos eixos `axes` (padrão: os do modelo). */
  ell(c: V3, r: V3, mat: number, o: { axes?: [V3, V3, V3]; part?: number; band?: Band } = {}) {
    const [u, v, w] = o.axes ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    this.shapes.push({ kind: "ell", c: this.p(c), u: this.d(u), v: this.d(v), w: this.d(w), r, mat, part: o.part ?? this.part(), band: o.band });
  }

  /** Elipsoide esticado de `a` até `b` (gomo de cauda, placa), com raios `ry` (em cima) e `rz` (de lado). */
  seg(a: V3, b: V3, ry: number, rz: number, mat: number, o: { up?: V3; part?: number; band?: Band; over?: number } = {}) {
    const axes = basis(sub(b, a), o.up);
    const half = len(sub(b, a)) / 2 + (o.over ?? 0);
    this.ell(lerp3(a, b, 0.5), [half, ry, rz], mat, { axes, part: o.part, band: o.band });
  }

  /** Cone arredondado de `a` (raio `ra`) a `b` (raio `rb`): com raios iguais é uma cápsula; com `b = a`, uma esfera. */
  cone(a: V3, b: V3, ra: number, rb: number, mat: number, o: { part?: number; band?: Band } = {}) {
    this.shapes.push({ kind: "cone", a: this.p(a), b: this.p(b), ra, rb, mat, part: o.part ?? this.part(), band: o.band });
  }

  ball(c: V3, r: number, mat: number, part?: number) { this.cone(c, c, r, r, mat, { part }); }

  /** Membro por pontos (`pts`), afinando de `r0` a `r1`, com juntas redondas. */
  limb(pts: readonly V3[], r0: number, r1: number, mat: number, o: { part?: number; joint?: number } = {}) {
    const part = o.part ?? this.part();
    const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const ra = r0 + ((r1 - r0) * i) / n, rb = r0 + ((r1 - r0) * (i + 1)) / n;
      this.cone(pts[i], pts[i + 1], ra, rb, mat, { part });
      if (o.joint !== undefined && i > 0) this.cone(pts[i], pts[i], ra * 1.12, ra * 1.12, o.joint, { part });
    }
  }
}

// --- Movimento fino ------------------------------------------------------------------------------------------

const ease = (t: number) => t * t * (3 - 2 * t);
function mix<P extends object>(a: P, b: P, t: number): P {
  const out: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = (a as Record<string, unknown>)[k], y = (b as Record<string, unknown>)[k];
    if (typeof x === "number" && typeof y === "number") out[k] = +(x + (y - x) * t).toFixed(3);
    else if (Array.isArray(x) && Array.isArray(y)) out[k] = (x as number[]).map((v, i) => +(v + ((y as number[])[i] - v) * t).toFixed(3));
    else out[k] = t < 0.5 ? x ?? y : y ?? x;
  }
  return out as P;
}

/**
 * Movimento fino: `n` poses entre as poses-chave `keys`, com o meio suavizado (entra e sai devagar). Em laço (`loop`),
 * a última volta para a primeira e as `n` cobrem o ciclo; senão vão da primeira à última. Campos que faltam numa pose
 * usam o da vizinha; só números (e listas de números) se misturam.
 */
export function tween<P extends object>(keys: readonly P[], n: number, loop = false): P[] {
  const segs = loop ? keys.length : keys.length - 1;
  return Array.from({ length: n }, (_, i) => {
    const u = loop ? (i / n) * segs : (i / Math.max(1, n - 1)) * segs;
    const k = Math.min(segs - 1, Math.floor(u));
    return mix(keys[k], keys[(k + 1) % keys.length], ease(u - k));
  });
}

// --- Câmera e quadro ---------------------------------------------------------------------------------------------

export interface Shot {
  /** Lado do quadro (px). */
  size: number;
  /** Linha dos pés (px a partir de cima). */
  feet: number;
  /** Coluna do centro do modelo (px). */
  cx?: number;
  /** Px por unidade do modelo. */
  scale?: number;
  /** Giro em volta do eixo vertical (graus): 0 = perfil olhando para a esquerda, 90 = de frente, −90 = de costas. */
  yaw: number;
  /** Inclinação da câmera (graus acima do horizonte). */
  pitch: number;
  /** Corta no chão: o que fica abaixo de y = 0 some (o verme mergulhando e saindo da areia). */
  ground?: boolean;
}

export interface Look {
  materials: readonly Material[];
  /** Luz principal (no espaço da tela: x direita, y cima, z para quem olha). */
  light?: V3;
  /** Cor da luz rebatida pelo chão (areia quente) e sua força. */
  bounce?: { color: string; power: number };
  /** Cor do contorno de fora (puxado para a cor do vizinho). */
  outline?: string;
  /** Força da sombra de oclusão (0..1). */
  occlusion?: number;
  /** Sombra projetada (0..1): uma parte faz sombra na outra (o braço no tronco), pelo mapa de sombra da luz. */
  shadow?: number;
  /** Luz de contorno (de trás, à direita): borda clara do lado oposto à luz, que destaca o bicho do chão. */
  rim?: { color: string; power: number };
}

/** Quadro em RGBA (como o `ImageData`). */
export interface Frame { width: number; height: number; data: Uint8ClampedArray }

const hex = (h: string): V3 => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Ruído de valor 3D (suave), determinístico: o grão preso à forma. */
function hash3(x: number, y: number, z: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const ux = s(fx), uy = s(fy), uz = s(fz);
  let acc = 0;
  for (let k = 0; k < 8; k++) {
    const dx = k & 1, dy = (k >> 1) & 1, dz = (k >> 2) & 1;
    const wgt = (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz);
    acc += wgt * hash3(xi + dx, yi + dy, zi + dz);
  }
  return acc;
}

/** Os 4 vizinhos (dx, dy). */
const NEAR4 = [1, 0, -1, 0, 0, 1, 0, -1];

/** Pontilhado ordenado 4×4 (Bayer), de −0.5 a 0.5. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

/** Interseção do raio (x, y) vindo de +z com a forma: profundidade (z), normal e coordenada local (grão, faixas). */
interface Hit { z: number; nx: number; ny: number; nz: number; lx: number; ly: number; lz: number; along: number }

function hitEll(s: Extract<Shape, { kind: "ell" }>, x: number, y: number, out: Hit): boolean {
  const ox = x - s.c[0], oy = y - s.c[1], oz = -s.c[2];
  const a = s.r[0], b = s.r[1], c = s.r[2];
  const q0x = (ox * s.u[0] + oy * s.u[1] + oz * s.u[2]) / a, q0y = (ox * s.v[0] + oy * s.v[1] + oz * s.v[2]) / b, q0z = (ox * s.w[0] + oy * s.w[1] + oz * s.w[2]) / c;
  const qdx = s.u[2] / a, qdy = s.v[2] / b, qdz = s.w[2] / c;
  const A = qdx * qdx + qdy * qdy + qdz * qdz;
  const B = 2 * (q0x * qdx + q0y * qdy + q0z * qdz);
  const C = q0x * q0x + q0y * q0y + q0z * q0z - 1;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return false;
  const t = (-B + Math.sqrt(disc)) / (2 * A);
  const lx = q0x + qdx * t, ly = q0y + qdy * t, lz = q0z + qdz * t;
  // Normal = gradiente do elipsoide (no espaço da câmera).
  const gx = lx / a, gy = ly / b, gz = lz / c;
  let nx = s.u[0] * gx + s.v[0] * gy + s.w[0] * gz;
  let ny = s.u[1] * gx + s.v[1] * gy + s.w[1] * gz;
  let nz = s.u[2] * gx + s.v[2] * gy + s.w[2] * gz;
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  out.z = t; out.nx = nx; out.ny = ny; out.nz = nz; out.lx = lx * a; out.ly = ly * b; out.lz = lz * c; out.along = (lx + 1) / 2;
  return true;
}

/** Cone arredondado (fórmula de Inigo Quilez), raio de (x, y, z0) para −z; tudo em números soltos (é o laço quente). */
function hitCone(s: Extract<Shape, { kind: "cone" }>, x: number, y: number, out: Hit): boolean {
  const z0 = Math.max(s.a[2] + s.ra, s.b[2] + s.rb) + 1;
  const bax = s.b[0] - s.a[0], bay = s.b[1] - s.a[1], baz = s.b[2] - s.a[2];
  const oax = x - s.a[0], oay = y - s.a[1], oaz = z0 - s.a[2];
  const obx = x - s.b[0], oby = y - s.b[1], obz = z0 - s.b[2];
  const ra = s.ra, rb = s.rb, rr = ra - rb;
  const m0 = bax * bax + bay * bay + baz * baz, m1 = bax * oax + bay * oay + baz * oaz, m2 = -baz, m3 = -oaz;
  const m5 = oax * oax + oay * oay + oaz * oaz, m6 = -obz, m7 = obx * obx + oby * oby + obz * obz;
  let t = -1, nx = 0, ny = 0, nz = 1;
  const d2 = m0 - rr * rr;
  if (m0 > 1e-6) {
    const k2 = d2 - m2 * m2;
    const k1 = d2 * m3 - m1 * m2 + m2 * rr * ra;
    const k0 = d2 * m5 - m1 * m1 + m1 * rr * ra * 2 - m0 * ra * ra;
    const h = k1 * k1 - k0 * k2;
    if (h < 0) return false;
    if (Math.abs(k2) > 1e-9) {
      const tb = (-Math.sqrt(h) - k1) / k2;
      const yy = m1 - ra * rr + tb * m2;
      if (yy > 0 && yy < d2) {
        t = tb;
        nx = d2 * oax - bax * yy; ny = d2 * oay - bay * yy; nz = d2 * (oaz - tb) - baz * yy;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
      }
    }
  }
  if (t < 0) {
    const h1 = m3 * m3 - m5 + ra * ra, h2 = m6 * m6 - m7 + rb * rb;
    if (h1 <= 0 && h2 <= 0) return false;
    t = Infinity;
    if (h1 > 0) { t = -m3 - Math.sqrt(h1); nx = oax / ra; ny = oay / ra; nz = (oaz - t) / ra; }
    if (h2 > 0) { const t2 = -m6 - Math.sqrt(h2); if (t2 < t) { t = t2; nx = obx / rb; ny = oby / rb; nz = (obz - t2) / rb; } }
  }
  const z = z0 - t;
  const along = m0 > 1e-6 ? Math.min(1, Math.max(0, ((x - s.a[0]) * bax + (y - s.a[1]) * bay + (z - s.a[2]) * baz) / m0)) : 0.5;
  // Coordenada local presa ao membro (ao longo dele e em volta), para o grão não escorregar quando ele se mexe.
  const r = ra + (rb - ra) * along;
  out.z = z; out.nx = nx; out.ny = ny; out.nz = nz;
  out.lx = along * Math.sqrt(m0); out.ly = ny * r; out.lz = nz * r + nx * r * 0.5; out.along = along;
  return true;
}

/** Retângulo (x, y) que a forma pode cobrir. */
function bounds(s: Shape) {
  if (s.kind === "ell") {
    const ex = Math.hypot(s.u[0] * s.r[0], s.v[0] * s.r[1], s.w[0] * s.r[2]), ey = Math.hypot(s.u[1] * s.r[0], s.v[1] * s.r[1], s.w[1] * s.r[2]);
    return { x0: s.c[0] - ex, x1: s.c[0] + ex, y0: s.c[1] - ey, y1: s.c[1] + ey };
  }
  return {
    x0: Math.min(s.a[0] - s.ra, s.b[0] - s.rb), x1: Math.max(s.a[0] + s.ra, s.b[0] + s.rb),
    y0: Math.min(s.a[1] - s.ra, s.b[1] - s.rb), y1: Math.max(s.a[1] + s.ra, s.b[1] + s.rb),
  };
}

/** A forma girada por `R` (para o espaço da luz). */
function rotShape(s: Shape, R: Mat3): Shape {
  if (s.kind === "ell") return { ...s, c: apply(R, s.c), u: apply(R, s.u), v: apply(R, s.v), w: apply(R, s.w) };
  return { ...s, a: apply(R, s.a), b: apply(R, s.b) };
}

/**
 * Raio por pixel numa grade `W`×`H` (o ponto (0, 0) fica no pixel (`ox`, `oy`), y para cima): para cada forma, cada
 * pixel do retângulo dela; `hit` decide se fica (devolve a profundidade em `out`).
 */
function raster(shapes: readonly Shape[], W: number, H: number, ox: number, oy: number, put: (i: number, si: number, h: Hit) => void) {
  const hit: Hit = { z: 0, nx: 0, ny: 0, nz: 0, lx: 0, ly: 0, lz: 0, along: 0 };
  shapes.forEach((s, si) => {
    const b = bounds(s);
    const px0 = Math.max(0, Math.floor(ox + b.x0)), px1 = Math.min(W - 1, Math.ceil(ox + b.x1));
    const py0 = Math.max(0, Math.floor(oy - b.y1)), py1 = Math.min(H - 1, Math.ceil(oy - b.y0));
    for (let py = py0; py <= py1; py++) {
      const y = oy - (py + 0.5);
      for (let px = px0; px <= px1; px++) {
        const x = px + 0.5 - ox;
        if (s.kind === "ell" ? hitEll(s, x, y, hit) : hitCone(s, x, y, hit)) put(py * W + px, si, hit);
      }
    }
  });
}

/** Fotografa a escultura: devolve o quadro em RGBA. */
export function render(sculpt: Sculpt, shot: Shot, look: Look): Frame {
  const S = shot.size, scale = shot.scale ?? 1, cx = shot.cx ?? S / 2;
  const yaw = (shot.yaw * Math.PI) / 180, pitch = (shot.pitch * Math.PI) / 180;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Modelo → câmera (em px da tela, y para cima a partir da linha dos pés, z para quem olha).
  const cam = (p: V3): V3 => {
    const x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy;
    return [(x) * scale, (p[1] * cp - z * sp) * scale, (p[1] * sp + z * cp) * scale];
  };
  const camDir = (d: V3): V3 => norm(sub(cam(d), cam([0, 0, 0])));
  // Formas no espaço da câmera (px da tela).
  const shapes: { s: Shape }[] = sculpt.shapes.map((s) => ({
    s: s.kind === "ell"
      ? { ...s, c: cam(s.c), u: camDir(s.u), v: camDir(s.v), w: camDir(s.w), r: mul(s.r, scale) }
      : { ...s, a: cam(s.a), b: cam(s.b), ra: s.ra * scale, rb: s.rb * scale },
  }));
  const N = S * S;
  const zbuf = new Float32Array(N).fill(-Infinity);
  const nrm = new Float32Array(N * 3), loc = new Float32Array(N * 3), alongBuf = new Float32Array(N);
  const owner = new Int32Array(N).fill(-1);
  raster(shapes.map((x) => x.s), S, S, cx, shot.feet, (i, si, hit) => {
    if (hit.z <= zbuf[i]) return;
    // Altura no modelo do ponto atingido (y da tela e profundidade de volta ao modelo): abaixo do chão, some.
    if (shot.ground && ((shot.feet - (Math.floor(i / S) + 0.5)) * cp + hit.z * sp) / scale < -0.05) return;
    zbuf[i] = hit.z; owner[i] = si; alongBuf[i] = hit.along;
    nrm[i * 3] = hit.nx; nrm[i * 3 + 1] = hit.ny; nrm[i * 3 + 2] = hit.nz;
    loc[i * 3] = hit.lx / scale; loc[i * 3 + 1] = hit.ly / scale; loc[i * 3 + 2] = hit.lz / scale;
  });

  // Parte de cada pixel (−1 = vazio), para as contas com os vizinhos.
  const partOf = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (owner[i] >= 0) partOf[i] = shapes[owner[i]].s.part;

  // --- Relevo: altura por pixel (presa à forma) e a normal inclinada pela diferença com os vizinhos ---
  const height = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (owner[i] < 0) continue;
    const m = look.materials[shapes[owner[i]].s.mat];
    if (!m.bump) continue;
    const g = m.bumpSize ?? 1.2;
    height[i] = noise3(loc[i * 3] / g, loc[i * 3 + 1] / g, loc[i * 3 + 2] / g) * m.bump;
  }
  for (let py = 1; py < S - 1; py++)
    for (let px = 1; px < S - 1; px++) {
      const i = py * S + px;
      if (owner[i] < 0 || !height[i]) continue;
      const part = partOf[i];
      const hR = partOf[i + 1] === part ? height[i + 1] : height[i], hL = partOf[i - 1] === part ? height[i - 1] : height[i];
      const hU = partOf[i - S] === part ? height[i - S] : height[i], hD = partOf[i + S] === part ? height[i + S] : height[i];
      const dx = hR - hL, dy = hU - hD;
      let nx = nrm[i * 3] - dx * 1.4, ny = nrm[i * 3 + 1] - dy * 1.4;
      const nz = nrm[i * 3 + 2], l = Math.hypot(nx, ny, nz) || 1;
      nx /= l; ny /= l;
      nrm[i * 3] = nx; nrm[i * 3 + 1] = ny; nrm[i * 3 + 2] = nz / l;
    }

  // --- Luz ---
  const L = norm(look.light ?? [-0.55, 0.7, 0.55]);
  const H = norm(add(L, [0, 0, 1]));
  // Mapa de sombra: a escultura vista da luz (z para a luz), com a parte de quem está mais perto dela.
  let lit: ((i: number, x: number, y: number) => number) | null = null;
  if (look.shadow) {
    let lx = cross([0, 1, 0], L);
    if (len(lx) < 1e-3) lx = [1, 0, 0];
    lx = norm(lx);
    const R: Mat3 = [lx, cross(L, lx), L];
    const SL = S * 2, o = S;
    const zl = new Float32Array(SL * SL).fill(-Infinity), pl = new Int32Array(SL * SL).fill(-1);
    raster(shapes.map((x) => rotShape(x.s, R)), SL, SL, o, o, (i, si, hit) => {
      if (hit.z > zl[i]) { zl[i] = hit.z; pl[i] = shapes[si].s.part; }
    });
    const bias = 1.2 * scale;
    // Fração da luz que chega (3×3 em volta, contra o ponto): sombra só de outra parte (a própria forma já escurece
    // pela normal).
    lit = (i, x, y) => {
      const P: V3 = [x, y, zbuf[i]];
      const q = apply(R, P);
      const qx = Math.floor(o + q[0]), qy = Math.floor(o - q[1]);
      let blocked = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = qx + dx, yy = qy + dy;
          if (xx < 0 || yy < 0 || xx >= SL || yy >= SL) continue;
          const j = yy * SL + xx;
          if (pl[j] >= 0 && pl[j] !== partOf[i] && zl[j] - q[2] > bias) blocked++;
        }
      return 1 - blocked / 9;
    };
  }
  const rim = look.rim ? { c: hex(look.rim.color), p: look.rim.power, d: norm([-L[0] * 1.4, 0.25, -0.35] as V3) } : null;
  const ramps = look.materials.map((m) => m.ramp.map(hex));
  const bounce = look.bounce ? { c: hex(look.bounce.color), p: look.bounce.power } : null;
  const occ = look.occlusion ?? 0.55;
  let zmin = Infinity, zmax = -Infinity;
  for (let i = 0; i < N; i++) if (owner[i] >= 0) { zmin = Math.min(zmin, zbuf[i]); zmax = Math.max(zmax, zbuf[i]); }
  const zr = Math.max(1, zmax - zmin);
  const color = new Float32Array(N * 3);
  const tone = new Float32Array(N);
  const AO = [3, 0, -3, 0, 0, 3, 0, -3, 2, 2, -2, 2, 2, -2, -2, -2, 6, 0, -6, 0, 0, 6, 0, -6, 4, 4, -4, 4, 4, -4, -4, -4];
  for (let py = 0; py < S; py++)
    for (let px = 0; px < S; px++) {
      const i = py * S + px;
      if (owner[i] < 0) continue;
      const sh = shapes[owner[i]].s;
      const nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
      let mi = sh.mat;
      const m0 = look.materials[mi];
      // Barriga: a metade de baixo da forma, no espaço dela.
      if (m0.belly !== undefined && sh.kind === "ell") {
        const ly = loc[i * 3 + 1] * scale / sh.r[1];
        if (ly < -0.35) mi = m0.belly;
      }
      const m = look.materials[mi];
      // Oclusão: vizinhos bem na frente escondem a luz do céu.
      let o = 0;
      for (let k = 0; k < AO.length; k += 2) {
        const qx = px + AO[k], qy = py + AO[k + 1];
        if (qx < 0 || qy < 0 || qx >= S || qy >= S) continue;
        const j = qy * S + qx;
        if (owner[j] < 0) continue;
        o += Math.min(1, Math.max(0, (zbuf[j] - zbuf[i] - 1.5) / 6));
      }
      o /= AO.length / 2;
      let diff = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2] + 0.25) / 1.25);
      if (lit && diff > 0) diff *= 1 - (look.shadow ?? 0) * (1 - lit(i, px + 0.5 - cx, shot.feet - (py + 0.5)));
      const sky = 0.5 + 0.5 * ny;
      let t = 0.12 + diff * 0.72 + sky * 0.16;
      t *= 1 - occ * Math.min(1, o * 2.2);
      // O lado de lá (mais fundo) fica um pouco mais escuro: separa as patas de lá das de cá.
      t -= 0.16 * (1 - (zbuf[i] - zmin) / zr);
      // Faixas (anéis dos gomos): escurece o começo de cada uma.
      if (sh.band) {
        const f = (alongBuf[i] * sh.band.n) % 1;
        if (f < 0.22) t -= sh.band.depth * (1 - f / 0.22);
      }
      if (m.grain) {
        const g = m.grainSize ?? 2.2;
        const nn = noise3(loc[i * 3] / g, loc[i * 3 + 1] / g, loc[i * 3 + 2] / g) * 0.65 + noise3(loc[i * 3] / (g * 0.4), loc[i * 3 + 1] / (g * 0.4), loc[i * 3 + 2] / (g * 0.4)) * 0.35;
        t += (nn - 0.5) * m.grain;
      }
      t += m.bias ?? 0;
      // Ataduras: faixas em espiral, cada uma num tom, com o vinco entre elas e pedaços faltando.
      let gapped = false;
      if (m.wrap && sh.kind === "ell") {
        const w = m.wrap;
        const ang = Math.atan2(loc[i * 3 + 2] * scale / sh.r[2], loc[i * 3 + 1] * scale / sh.r[1]) / (Math.PI * 2);
        const sp = loc[i * 3] / w.width + ang * w.tilt;
        const band = Math.floor(sp), f = sp - band;
        const hb = hash3(band, sh.part, 7);
        t += (hb - 0.5) * w.vary;
        if (f < 0.18) t -= w.crease * (1 - f / 0.18);
        else if (f > 0.9) t += w.crease * 0.35;
        if (w.stripe && w.gapMat !== undefined && (band & 1)) gapped = true;
        else if (w.gap && w.gapMat !== undefined && hash3(band, sh.part, Math.floor((ang + 0.5) * 4)) < w.gap && f > 0.12) gapped = true;
      }
      if (gapped) mi = m.wrap!.gapMat!;
      if (m.emit !== undefined) t = m.emit + (0.5 - Math.abs(nz - 0.5)) * 0.1;
      // Covas do relevo e pintas: escurecem.
      if (m.bump) t -= Math.max(0, 0.35 * m.bump - height[i]) * 0.9;
      if (m.speck && hash3(Math.round(loc[i * 3] * 2.2), Math.round(loc[i * 3 + 1] * 2.2), Math.round(loc[i * 3 + 2] * 2.2)) < m.speck) t -= 0.22;
      // Brilho especular da quitina.
      const spec = m.gloss ? Math.pow(Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]), m.shine ?? 24) * m.gloss : 0;
      t += spec * 0.9;
      // Pontilhado só onde o tom muda de cor.
      const ramp = ramps[mi];
      const k = ramp.length - 1;
      if (gapped && !m.wrap?.stripe) t -= 0.15;
      const td = Math.min(1, Math.max(0, t)) * k + BAYER[(py & 3) * 4 + (px & 3)] * 0.55;
      const idx = Math.min(k, Math.max(0, Math.round(td)));
      tone[i] = t;
      const rgb = ramp[idx];
      let r = rgb[0], g = rgb[1], b = rgb[2];
      // Luz de contorno: borda clara nas faces de lado, viradas para longe da luz.
      if (rim && m.emit === undefined) {
        const e = Math.max(0, nx * rim.d[0] + ny * rim.d[1] + nz * rim.d[2]) * Math.pow(1 - Math.max(0, nz), 2) * rim.p * (1 - o);
        r += (rim.c[0] - r) * e; g += (rim.c[1] - g) * e; b += (rim.c[2] - b) * e;
      }
      // Luz rebatida da areia (de baixo), quente, nas faces viradas para o chão.
      if (bounce) {
        const up = Math.max(0, -ny) * bounce.p * (1 - o);
        r += (bounce.c[0] - r) * up * 0.45; g += (bounce.c[1] - g) * up * 0.45; b += (bounce.c[2] - b) * up * 0.45;
      }
      color[i * 3] = r; color[i * 3 + 1] = g; color[i * 3 + 2] = b;
    }

  // --- Contornos ---
  const out = new Uint8ClampedArray(N * 4);
  const outline = hex(look.outline ?? "#1b1008");
  for (let i = 0; i < N; i++) {
    if (owner[i] < 0) continue;
    let r = color[i * 3], g = color[i * 3 + 1], b = color[i * 3 + 2];
    // Linha interna: um vizinho de outra parte bem na frente deste pixel.
    const px = i % S, py = (i / S) | 0;
    let line = false;
    for (let k = 0; k < 8; k += 2) {
      const dx = NEAR4[k], dy = NEAR4[k + 1];
      const qx = px + dx, qy = py + dy;
      if (qx < 0 || qy < 0 || qx >= S || qy >= S) continue;
      const j = qy * S + qx;
      if (owner[j] < 0) continue;
      if (partOf[j] !== partOf[i] && zbuf[j] - zbuf[i] > (look.materials[shapes[owner[i]].s.mat].lineDepth ?? 2.2) * scale) { line = true; break; }
    }
    if (line) { r = r * 0.42 + outline[0] * 0.58; g = g * 0.42 + outline[1] * 0.58; b = b * 0.42 + outline[2] * 0.58; }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  }
  // Contorno de fora: pixel vazio colado no desenho, na cor do contorno puxada para a do vizinho.
  for (let py = 0; py < S; py++)
    for (let px = 0; px < S; px++) {
      const i = py * S + px;
      if (owner[i] >= 0) continue;
      let n = 0, r = 0, g = 0, b = 0;
      for (let k = 0; k < 8; k += 2) {
      const dx = NEAR4[k], dy = NEAR4[k + 1];
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qy < 0 || qx >= S || qy >= S) continue;
        const j = qy * S + qx;
        if (owner[j] < 0) continue;
        n++; r += color[j * 3]; g += color[j * 3 + 1]; b += color[j * 3 + 2];
      }
      if (!n) continue;
      out[i * 4] = outline[0] * 0.8 + (r / n) * 0.2;
      out[i * 4 + 1] = outline[1] * 0.8 + (g / n) * 0.2;
      out[i * 4 + 2] = outline[2] * 0.8 + (b / n) * 0.2;
      out[i * 4 + 3] = 255;
    }
  void tone;
  return { width: S, height: S, data: out };
}
