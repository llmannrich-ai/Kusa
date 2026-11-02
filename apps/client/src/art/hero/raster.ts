import { material } from "./materials.ts";
import { mixRgb, type Rgb } from "./color.ts";

/**
 * Pintura dos heróis em 48×48. Em vez de cores, cada pixel guarda o material, o tom (0–5) e o grupo
 * (a peça que o pintou). Assim a luz sai da forma de cada peça e as linhas aparecem sozinhas:
 *
 * - **Luz**: cada `paint` sombreia a própria forma (cilindro em pé, esfera ou plano), com chanfro claro
 *   em cima e escuro embaixo. A luz vem de cima à esquerda, como no resto do jogo.
 * - **Linhas internas**: a borda de uma peça que fica na frente de outra recebe o tom 0 do seu material
 *   (contorno seletivo, colorido, em vez de preto).
 * - **Contorno externo**: 1 px escuro em volta da figura, mais suave no lado da luz.
 *
 * Tudo em arrays (sem DOM), para os testes conseguirem desenhar todos os itens no Node.
 */

export const S = 48;
const N = S * S;

/** Conjunto de pixels de uma forma (1 = dentro). */
export type Mask = Uint8Array;

const idx = (x: number, y: number) => y * S + x;
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < S && y < S;

/** Forma pelos pixels que passam no teste, só dentro do retângulo dado (o resto do quadro fica vazio). */
function build(test: (x: number, y: number) => boolean, x0 = 0, y0 = 0, x1 = S - 1, y1 = S - 1): Mask {
  const m = new Uint8Array(N);
  const ax = Math.max(0, Math.floor(x0)), ay = Math.max(0, Math.floor(y0));
  const bx = Math.min(S - 1, Math.ceil(x1)), by = Math.min(S - 1, Math.ceil(y1));
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) if (test(x, y)) m[idx(x, y)] = 1;
  return m;
}

export const has = (m: Mask, x: number, y: number) => inside(x, y) && m[idx(x, y)] === 1;

// --- Formas -----------------------------------------------------------------------

export const empty = (): Mask => new Uint8Array(N);

/** Retângulo com os cantos inclusos. */
export const rect = (x0: number, y0: number, x1: number, y1: number) =>
  build((x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, x0, y0, x1, y1);

/** Elipse pelos centros dos pixels (centro em .5 dá forma simétrica em largura par). */
export const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  build((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, cx - rx, cy - ry, cx + rx, cy + ry);

/** Polígono (regra par-ímpar) pelos centros dos pixels. */
export function poly(points: readonly (readonly [number, number])[]): Mask {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return build((x, y) => {
    let on = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) on = !on;
    }
    return on;
  }, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Traço grosso pelos pontos (membros, cabos, cordas). */
export function limb(points: readonly (readonly [number, number])[], r: number): Mask {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return build((x, y) => {
    for (let i = 0; i < points.length - 1; i++) {
      if (segDist(x, y, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]) <= r) return true;
    }
    return points.length === 1 && Math.hypot(x - points[0][0], y - points[0][1]) <= r;
  }, Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) + r, Math.max(...ys) + r);
}

/** Linhas cheias a partir de `y0`: cada item é [x0, x1] (ou null para pular). */
export function spans(y0: number, list: readonly ([number, number] | null)[]): Mask {
  const m = empty();
  list.forEach((s, i) => {
    if (!s) return;
    for (let x = s[0]; x <= s[1]; x++) if (inside(x, y0 + i)) m[idx(x, y0 + i)] = 1;
  });
  return m;
}

/** Linhas simétricas em torno do centro 23.5: cada item é a meia-largura (ou o par [esquerda, direita] de recuo). */
export function sym(y0: number, halfWidths: readonly number[], cx = 23.5): Mask {
  return spans(y0, halfWidths.map((h) => (h > 0 ? [Math.ceil(cx - h), Math.floor(cx + h)] as [number, number] : null)));
}

/** Pixels marcados numa grade de texto (qualquer caractere menos "."). */
export function gridMask(rows: readonly string[], x0: number, y0: number, flip = false): Mask {
  const m = empty();
  rows.forEach((row, gy) => [...row].forEach((ch, gx) => {
    const x = x0 + (flip ? row.length - 1 - gx : gx);
    if (ch !== "." && inside(x, y0 + gy)) m[idx(x, y0 + gy)] = 1;
  }));
  return m;
}

export function or(...ms: Mask[]): Mask {
  const out = empty();
  for (const m of ms) for (let i = 0; i < N; i++) out[i] |= m[i];
  return out;
}

export function minus(a: Mask, ...bs: Mask[]): Mask {
  const out = new Uint8Array(a);
  for (const b of bs) for (let i = 0; i < N; i++) if (b[i]) out[i] = 0;
  return out;
}

export function and(a: Mask, b: Mask): Mask {
  const out = empty();
  for (let i = 0; i < N; i++) out[i] = a[i] & b[i];
  return out;
}

export function shift(m: Mask, dx: number, dy: number): Mask {
  return build((x, y) => has(m, x - dx, y - dy));
}

/** Espelha na horizontal em torno do centro do quadro. */
export const mirror = (m: Mask): Mask => build((x, y) => has(m, S - 1 - x, y));

/** Só as linhas [y0, y1]. */
export const band = (m: Mask, y0: number, y1: number) => and(m, rect(0, y0, S - 1, y1));
/** Só as colunas [x0, x1]. */
export const cols = (m: Mask, x0: number, x1: number) => and(m, rect(x0, 0, x1, S - 1));

/** Borda da forma (pixels dentro com algum vizinho fora); `side` limita a "top", "bottom", "left" ou "right". */
export function edge(m: Mask, side?: "top" | "bottom" | "left" | "right"): Mask {
  const dirs = { top: [[0, -1]], bottom: [[0, 1]], left: [[-1, 0]], right: [[1, 0]] };
  const check = side ? dirs[side] : [[0, -1], [0, 1], [-1, 0], [1, 0]];
  return build((x, y) => has(m, x, y) && check.some(([dx, dy]) => !has(m, x + dx, y + dy)));
}

/** A forma crescida em 1 px (vizinhos em cruz). */
export const grow = (m: Mask) => build((x, y) => has(m, x, y) || has(m, x - 1, y) || has(m, x + 1, y) || has(m, x, y - 1) || has(m, x, y + 1));

export function bounds(m: Mask) {
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!m[idx(x, y)]) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

export const count = (m: Mask) => m.reduce((a, b) => a + b, 0);

// --- Pintura ------------------------------------------------------------------------

export type Light = "cyl" | "sphere" | "flat" | "row";
export type LineMode = "hard" | "soft" | "none";

export interface PaintOptions {
  /** Tom de base (3 = cor do material). */
  t?: number;
  /** Como a forma pega luz (padrão: cilindro em pé). */
  light?: Light;
  /** Chanfro: borda de cima mais clara e de baixo mais escura (padrão: sim). */
  bevel?: boolean;
  /** Metal polido: faixa de brilho no lado da luz. */
  spec?: boolean;
  /** Ajuste de tom por pixel (padrões: malha, escamas, costuras). */
  tex?: (x: number, y: number) => number;
  /** Grupo da peça: "keep" pinta por cima sem criar linha (detalhe); número junta peças num grupo. */
  group?: number | "keep";
  /** Linha onde a peça fica na frente de outra. */
  line?: LineMode;
  /** Soma ao tom (membro do lado de lá, na sombra). */
  dark?: number;
}

export class Canvas {
  /** Troca de materiais ativa (itens mágicos repintam o desenho do nível com outros materiais). */
  remap: ReadonlyMap<number, number> | null = null;
  /** Segunda troca, depois da `remap`: os lendários repintam o desenho do mágico (`legend.ts`). */
  legend: ReadonlyMap<number, number> | null = null;
  private swap(mat: number) {
    const m = this.remap?.get(mat) ?? mat;
    return this.legend?.get(m) ?? m;
  }
  readonly mat = new Uint8Array(N);
  readonly tone = new Int8Array(N);
  readonly grp = new Uint16Array(N);
  private lines: LineMode[] = ["none"];

  /** Novo grupo (peças pintadas com ele não fazem linha entre si). */
  group(line: LineMode = "hard") {
    this.lines.push(line);
    return this.lines.length - 1;
  }

  get(x: number, y: number) {
    return inside(x, y) ? this.mat[idx(x, y)] : 0;
  }

  /** Forma do que já foi pintado. */
  silhouette(): Mask {
    return build((x, y) => this.mat[idx(x, y)] !== 0);
  }

  /** Pinta a forma no material, com luz calculada pela própria forma. Devolve o grupo usado. */
  paint(m: Mask, mat: number, o: PaintOptions = {}): number {
    mat = this.swap(mat);
    const keep = o.group === "keep";
    const group = typeof o.group === "number" ? o.group : keep ? 0 : this.group(o.line ?? "hard");
    let fresh = 0;
    const { x0, y0, x1, y1 } = bounds(m);
    if (x1 < 0) return group;
    const light = o.light ?? "cyl";
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const rx = Math.max(1, (x1 - x0 + 1) / 2), ry = Math.max(1, (y1 - y0 + 1) / 2);
    // Extensão de cada linha e coluna da forma (para a luz de cilindro).
    const rowA = new Int8Array(S).fill(S), rowB = new Int8Array(S).fill(-1);
    const colA = new Int8Array(S).fill(S), colB = new Int8Array(S).fill(-1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!m[idx(x, y)]) continue;
      if (x < rowA[y]) rowA[y] = x;
      if (x > rowB[y]) rowB[y] = x;
      if (y < colA[x]) colA[x] = y;
      if (y > colB[x]) colB[x] = y;
    }
    const glow = material(mat).glow;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      if (!m[i]) continue;
      let t = (o.t ?? 3) + (o.dark ?? 0);
      if (!glow) {
        if (light === "cyl" || light === "row") {
          const a = light === "cyl" ? rowA[y] : colA[x];
          const b = light === "cyl" ? rowB[y] : colB[x];
          const pos = light === "cyl" ? x : y;
          const u = b === a ? 0 : ((pos - a) / (b - a)) * 2 - 1;
          if (o.spec) t += u < -0.7 ? 1 : u < -0.2 ? 2 : u > 0.75 ? -2 : u > 0.35 ? -1 : 0;
          else t += u < -0.35 ? 1 : u > 0.45 ? -1 : 0;
        } else if (light === "sphere") {
          const d = -0.62 * ((x - cx) / rx) - 0.78 * ((y - cy) / ry);
          t += d > 0.5 ? (o.spec && d > 0.8 ? 2 : 1) : d < -0.45 ? -1 : 0;
        }
        if (o.bevel !== false) {
          if (!has(m, x, y - 1)) t += 1;
          else if (!has(m, x, y + 1)) t -= 1;
          if (light === "flat") {
            if (!has(m, x - 1, y)) t += 1;
            else if (!has(m, x + 1, y)) t -= 1;
          }
        }
      }
      if (o.tex) t += o.tex(x, y);
      this.mat[i] = mat;
      this.tone[i] = Math.max(o.t === 0 ? 0 : 1, Math.min(5, t));
      if (keep) {
        if (!this.grp[i]) this.grp[i] = fresh ||= this.group("none");
      } else this.grp[i] = group;
    }
    return group;
  }

  /** Um pixel de detalhe (sem linha nova). */
  dot(x: number, y: number, mat: number, t = 3) {
    if (!inside(x, y)) return;
    mat = this.swap(mat);
    const i = idx(x, y);
    this.mat[i] = mat;
    this.tone[i] = t;
    if (!this.grp[i]) this.grp[i] = this.group("none");
  }

  /**
   * Grade desenhada à mão: cada caractere vira [material, tom] pela legenda ("." = vazio).
   * Usada em rostos, ornamentos e armas, onde cada pixel importa.
   */
  stamp(rows: readonly string[], x0: number, y0: number, legend: Legend, o: { flip?: boolean; group?: number | "keep"; line?: LineMode } = {}) {
    const keep = o.group === "keep";
    const group = typeof o.group === "number" ? o.group : keep ? 0 : this.group(o.line ?? "hard");
    rows.forEach((row, gy) => [...row].forEach((ch, gx) => {
      if (ch === ".") return;
      const paint = legend[ch];
      if (!paint) throw new Error(`Caractere "${ch}" fora da legenda`);
      const x = x0 + (o.flip ? row.length - 1 - gx : gx);
      const y = y0 + gy;
      if (!inside(x, y)) return;
      const i = idx(x, y);
      this.mat[i] = this.swap(paint[0]);
      this.tone[i] = paint[1];
      if (keep) { if (!this.grp[i]) this.grp[i] = this.group("none"); } else this.grp[i] = group;
    }));
    return group;
  }

  /** Cores finais (RGBA), com as linhas internas e o contorno. */
  resolve(): Uint8ClampedArray {
    const tone = new Int8Array(this.tone);
    const hard = new Uint8Array(N);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = idx(x, y);
      const g = this.grp[i];
      if (!this.mat[i] || material(this.mat[i]).glow) continue;
      const mode = this.lines[g];
      if (mode === "none") continue;
      // Só vira linha onde a peça tem espessura: o vizinho do lado oposto é da mesma peça.
      // Assim um cabo ou uma corda de 1 px não fica inteiro escuro.
      const same = (dx: number, dy: number) => inside(x + dx, y + dy) && this.grp[idx(x + dx, y + dy)] === g;
      const behind = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        if (!inside(x + dx, y + dy)) return false;
        const j = idx(x + dx, y + dy);
        return this.mat[j] !== 0 && this.grp[j] < g && same(-dx, -dy);
      });
      if (behind) {
        if (mode === "hard") { tone[i] = 0; hard[i] = 1; } else tone[i] = Math.min(tone[i], 1);
      }
    }
    const out = new Uint8ClampedArray(N * 4);
    const put = (i: number, c: Rgb) => { out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2]; out[i * 4 + 3] = 255; };
    for (let i = 0; i < N; i++) {
      if (!this.mat[i]) continue;
      const c = material(this.mat[i]).rgb[tone[i]];
      // Linha interna: o tom mais escuro do material, puxado para o contorno (não fica vermelha na pele).
      put(i, hard[i] ? mixRgb(c, OUTLINE, 0.55) : c);
    }
    // Contorno: escuro, puxando a cor vizinha; no lado da luz (em cima e à esquerda da figura) fica mais suave.
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = idx(x, y);
      if (this.mat[i]) continue;
      const near = (dx: number, dy: number) => (inside(x + dx, y + dy) ? this.mat[idx(x + dx, y + dy)] : 0);
      const right = near(1, 0), below = near(0, 1), left = near(-1, 0), above = near(0, -1);
      const lit = right || below;
      const any = lit || left || above;
      if (!any || material(any).glow) continue;
      const dark = material(any).rgb[0];
      put(i, lit && !left && !above ? mixRgb(dark, OUTLINE, 0.55) : mixRgb(dark, OUTLINE, 0.78));
    }
    return out;
  }
}

const OUTLINE: Rgb = [16, 10, 14];

/** Legenda de uma grade: caractere → [material, tom]. */
export type Legend = Readonly<Record<string, readonly [number, number]>>;

/** Legenda de um material só: "0"–"5" são os tons. */
export function tones(mat: number): Legend {
  return Object.fromEntries([0, 1, 2, 3, 4, 5].map((t) => [String(t), [mat, t] as const]));
}
