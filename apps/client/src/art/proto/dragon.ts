import { Canvas, F, Mat, lit, noise, inPoly, pbox, sphere, inEllipse, ebox, type Offset, type Pt } from "./tibiaHero.ts";

/**
 * Dragão verde jovem (boss da Cripta), de perfil olhando para a esquerda, num quadro de 384 px (192 unidades).
 *
 * Pescoço, tronco e cauda são um tubo só ao longo da coluna (`Spine`): a silhueta não tem emenda, a luz é de
 * cilindro e as escamas seguem a curva do corpo, com a borda solta virada para a cauda. A barriga tem placas claras
 * atravessadas; nas costas, uma fileira de espinhos com membrana no pescoço (a crista do dragão verde). Cabeça
 * comprida com crista, chifres de marfim para trás, sobrancelha pesada, olho de pupila em fenda e dentes. Asas de
 * morcego com os dedos à mostra e a membrana em arcos. O sopro é gás venenoso.
 */

export type DragonMode = "idle" | "walk" | "bite" | "breath";

// --- Coluna: tubo de raio variável ----------------------------------------------------------

interface SpinePoint { d: number; v: number; s: number; r: number; nx: number; ny: number; tx: number; ty: number }

/** Coluna: pontos da cabeça para a cauda, com o raio em cada um. */
class Spine {
  readonly len: number[] = [0];
  constructor(readonly pts: readonly Pt[], readonly r: readonly number[]) {
    for (let i = 1; i < pts.length; i++) this.len.push(this.len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }

  get total() { return this.len[this.len.length - 1]; }

  // Consultas já feitas, numa grade por pixel final (o corpo pinta, sombreia e texturiza o mesmo pixel em mais de
  // uma peça). A resposta é sempre o mesmo objeto, reescrito: use antes de perguntar de novo.
  private gx = 0;
  private gy = 0;
  private gw = 0;
  private gh = 0;
  private grid: Float32Array | null = null;
  private seg: Int16Array | null = null;
  private readonly q: SpinePoint = { d: 0, v: 0, s: 0, r: 0, nx: 0, ny: 0, tx: 0, ty: 0 };

  /** O ponto mais "dentro" do tubo: distância ao eixo, lado (`v` > 0 = barriga), arco, raio e direções. */
  at(px: number, py: number): SpinePoint {
    if (!this.grid) {
      const [x0, y0, x1, y1] = this.box();
      this.gx = Math.floor(x0 * 2) - 1; this.gy = Math.floor(y0 * 2) - 1;
      this.gw = Math.ceil(x1 * 2) - this.gx + 2; this.gh = Math.ceil(y1 * 2) - this.gy + 2;
      this.grid = new Float32Array(this.gw * this.gh * 4);
      this.seg = new Int16Array(this.gw * this.gh);
    }
    const X = Math.round(px * 2 - 0.5) - this.gx, Y = Math.round(py * 2 - 0.5) - this.gy;
    const inGrid = X >= 0 && Y >= 0 && X < this.gw && Y < this.gh && Math.abs((X + this.gx + 0.5) / 2 - px) < 1e-6 && Math.abs((Y + this.gy + 0.5) / 2 - py) < 1e-6;
    const i = Y * this.gw + X;
    if (inGrid && this.seg![i] > 0) return this.fromGrid(i);
    const bi = this.find(px, py);
    if (inGrid) {
      const g = this.grid!, q = this.q;
      g[i * 4] = q.d; g[i * 4 + 1] = q.v; g[i * 4 + 2] = q.s; g[i * 4 + 3] = q.r;
      this.seg![i] = bi;
    }
    return this.q;
  }

  private fromGrid(i: number): SpinePoint {
    const g = this.grid!, q = this.q, bi = this.seg![i];
    const a = this.pts[bi - 1], b = this.pts[bi], l = this.len[bi] - this.len[bi - 1] || 1;
    q.d = g[i * 4]; q.v = g[i * 4 + 1]; q.s = g[i * 4 + 2]; q.r = g[i * 4 + 3];
    q.tx = (b[0] - a[0]) / l; q.ty = (b[1] - a[1]) / l; q.nx = -q.ty; q.ny = q.tx;
    return q;
  }

  /** Acha o segmento e preenche `q`; devolve o índice do segmento. */
  private find(px: number, py: number): number {
    let bi = 1, bt = 0, bd = 0, score = Infinity;
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
      const ex = px - a[0] - dx * t, ey = py - a[1] - dy * t;
      const d = Math.sqrt(ex * ex + ey * ey), r = this.r[i - 1] + (this.r[i] - this.r[i - 1]) * t;
      if (d - r < score) { score = d - r; bi = i; bt = t; bd = d; }
    }
    const a = this.pts[bi - 1], b = this.pts[bi];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = dx / l, ty = dy / l, qx = a[0] + dx * bt, qy = a[1] + dy * bt, q = this.q;
    q.d = bd; q.v = (px - qx) * -ty + (py - qy) * tx; q.s = this.len[bi - 1] + l * bt; q.r = this.r[bi - 1] + (this.r[bi] - this.r[bi - 1]) * bt;
    q.nx = -ty; q.ny = tx; q.tx = tx; q.ty = ty;
    return bi;
  }

  /** Ponto e direções no arco `s`. */
  point(s: number): { p: Pt; r: number; nx: number; ny: number; tx: number; ty: number } {
    let i = 1;
    while (i < this.pts.length - 1 && this.len[i] < s) i++;
    const a = this.pts[i - 1], b = this.pts[i], l = this.len[i] - this.len[i - 1] || 1;
    const t = Math.max(0, Math.min(1, (s - this.len[i - 1]) / l));
    const tx = (b[0] - a[0]) / l, ty = (b[1] - a[1]) / l;
    return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], r: this.r[i - 1] + (this.r[i] - this.r[i - 1]) * t, nx: -ty, ny: tx, tx, ty };
  }

  box(): readonly [number, number, number, number] {
    const m = Math.max(...this.r) + 1;
    const xs = this.pts.map((p) => p[0]), ys = this.pts.map((p) => p[1]);
    return [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m];
  }
}

/** Luz de cilindro deitado ao longo da coluna. */
const tubeLight = (q: SpinePoint) => {
  const k = Math.min(0.98, q.d / q.r), sx = q.v >= 0 ? 1 : -1;
  const nx = q.nx * sx * k, ny = q.ny * sx * k;
  return lit(nx, ny, Math.sqrt(Math.max(0, 1 - k * k)));
};

const frac = (x: number) => x - Math.floor(x);

/**
 * Escama sobreposta numa grade que segue o corpo: `a` ao longo (0 = frente, 1 = trás) e `b` através. A borda solta
 * é um arco virado para trás, com a sombra logo antes dela e um brilho na frente de cada escama.
 */
function scaleTone(a: number, b: number, X: number, Y: number) {
  const m = 2 * b - 1;
  const edge = 0.62 + 0.34 * (1 - m * m);
  if (a > edge - 0.2 && a <= edge) return -1;
  if (a < 0.3 && a > 0.06 && Math.abs(m) < 0.5) return 1;
  return noise(X, Y) < 0.03 ? -1 : 0;
}

/** Escamas do tubo: tamanho pelo raio (menores no pescoço e na ponta da cauda). */
const spineScales = (sp: Spine, size: number): Offset => (X, Y) => {
  const q = sp.at((X + 0.5) / 2, (Y + 0.5) / 2);
  const w = Math.max(1.3, Math.min(4.2, q.r * size)), h = w * 0.78;
  const vv = q.v / h, row = Math.floor(vv);
  return scaleTone(frac(q.s / w + (row & 1) * 0.5), frac(vv), X, Y);
};

/** Escamas numa direção qualquer (pernas, cabeça): eixo `dir` aponta para trás da escama. */
const dirScales = (o: Pt, dir: Pt, w: number, h = w * 0.78): Offset => (X, Y) => {
  const x = X / 2 - o[0], y = Y / 2 - o[1];
  const u = x * dir[0] + y * dir[1], v = -x * dir[1] + y * dir[0];
  const vv = v / h, row = Math.floor(vv);
  return scaleTone(frac(u / w + (row & 1) * 0.5), frac(vv), X, Y);
};

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const rot = (p: Pt, o: Pt, ang: number): Pt => {
  const c = Math.cos(ang), s = Math.sin(ang), x = p[0] - o[0], y = p[1] - o[1];
  return [o[0] + x * c - y * s, o[1] + x * s + y * c];
};
const mix = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Cápsula (osso, garra, perna) com luz de cilindro e um desvio de tom. */
function capsule(c: Canvas, a: Pt, b: Pt, ra: number, rb: number, mat: Mat, offset?: Offset) {
  const sp = new Spine([a, b], [ra, rb]);
  return c.fill(sp.box(), (x, y) => { const q = sp.at(x + 0.5, y + 0.5); return q.d <= q.r; }, mat, (x, y) => tubeLight(sp.at(x + 0.5, y + 0.5)), offset);
}

/** Tubo de vários pontos (perna, dedo da asa, chifre) numa peça só. */
function tube(c: Canvas, pts: readonly Pt[], r: readonly number[], mat: Mat, offset?: Offset) {
  const sp = new Spine(pts, r);
  return c.fill(sp.box(), (x, y) => { const q = sp.at(x + 0.5, y + 0.5); return q.d <= q.r; }, mat, (x, y) => tubeLight(sp.at(x + 0.5, y + 0.5)), offset);
}

/** Polígono fechado arredondado (Chaikin): músculos sem quina. */
function smooth(pts: readonly Pt[], n = 3): Pt[] {
  let out = [...pts];
  for (let k = 0; k < n; k++) {
    const next: Pt[] = [];
    for (let i = 0; i < out.length; i++) { const a = out[i], b = out[(i + 1) % out.length]; next.push(mix(a, b, 0.25), mix(a, b, 0.75)); }
    out = next;
  }
  return out;
}

/** Polígono com luz de esfera achatada em volta de `o`. */
function shape(c: Canvas, pts: readonly Pt[], mat: Mat, o: Pt, rx: number, ry: number, offset?: Offset) {
  const inside = inPoly(pts);
  return c.fill(pbox(pts), (x, y) => inside(x, y), mat, sphere(o[0], o[1], rx, ry), offset);
}

/** Garra curva de marfim (ponta para `dir`). */
function claw(c: Canvas, base: Pt, dir: Pt, len: number, w: number) {
  const n: Pt = [-dir[1], dir[0]];
  const tip = add(base, [dir[0] * len + n[0] * len * 0.35, dir[1] * len + n[1] * len * 0.35]);
  const mid = add(base, [dir[0] * len * 0.55 + n[0] * len * 0.08, dir[1] * len * 0.55 + n[1] * len * 0.08]);
  shape(c, [add(base, [-n[0] * w, -n[1] * w]), mid, tip, add(base, [n[0] * w, n[1] * w])], Mat.Bone, base, len, w * 2);
  c.px(F(tip[0]), F(tip[1]), Mat.Bone, 5);
}

/** Espinho triangular (crista, cauda, bochecha). */
function spike(c: Canvas, base: Pt, dir: Pt, h: number, half: number, mat = Mat.Horn, dark = 0) {
  const n: Pt = [-dir[1], dir[0]];
  const tip = add(base, [dir[0] * h, dir[1] * h]);
  return shape(c, [add(base, [n[0] * half, n[1] * half]), tip, add(base, [-n[0] * half, -n[1] * half])], mat, mix(base, tip, 0.3), half * 2.2, h,
    (X, Y) => dark + (noise(X, Y >> 1) < 0.15 ? -1 : 0));
}

// --- Partes -------------------------------------------------------------------------------

/** Pé com três dedos grossos e garras de marfim, apoiado no chão em `at` (dedos para a esquerda). */
function foot(c: Canvas, at: Pt, size: number, dark: number, sc: Offset) {
  const dk: Offset = (X, Y) => sc(X, Y) + dark;
  for (const [k, dy] of [[2, -0.4], [1, 0.3], [0, 0.8]] as const) {
    const base: Pt = [at[0] + 1.5 + k * 0.6, at[1] - 1.6 + dy * 0.4];
    const tip: Pt = [at[0] - (5.4 - k * 1.2) * size, at[1] + dy * 0.6];
    capsule(c, base, tip, 2 * size, 1.5 * size, Mat.GreenDragon, (X, Y) => dk(X, Y) - (k === 2 ? 1 : 0));
    claw(c, [tip[0] + 0.4, tip[1] - 0.4], [-0.86, 0.5], 4.2 * size, 1.1 * size);
  }
}

/** Perna de trás: coxa larga que nasce do quadril, canela para trás até o jarrete e o pé. `step` move o pé. */
function hindLeg(c: Canvas, hip: Pt, g: number, step: number, lift: number, dark: number) {
  const ft: Pt = [hip[0] - 4 + step * 7, g - 1.4 - lift];
  const knee: Pt = [hip[0] - 8 + step * 3, hip[1] + 16 - lift * 0.3];
  const hock: Pt = [ft[0] + 8, ft[1] - 10];
  const sc = dirScales(hip, [0.25, 0.97], 2.8);
  const dk: Offset = (X, Y) => sc(X, Y) + dark;
  tube(c, [knee, hock, [ft[0] + 2, ft[1] - 2]], [5.2, 3.6, 3.2], Mat.GreenDragon, dk);
  foot(c, ft, 1.05, dark, sc);
  // Coxa: gota grande do quadril até o joelho, com o músculo saltado na frente.
  const thighPts: Pt[] = [[hip[0] - 12, hip[1] - 8], [hip[0] + 2, hip[1] - 12], [hip[0] + 11, hip[1] - 4], [hip[0] + 8, hip[1] + 7],
    [knee[0] + 6, knee[1] + 1], [knee[0], knee[1] + 5], [knee[0] - 5, knee[1] - 2], [hip[0] - 13, hip[1] + 4]];
  const thigh = shape(c, smooth(thighPts), Mat.GreenDragon, [hip[0] - 4, hip[1] - 6], 22, 24, (X, Y) => dk(X, Y) + 1);
  for (let t = 0.15; t < 0.9; t += 0.1) { const p = mix([hip[0] - 11, hip[1] + 2], [knee[0] - 2, knee[1]], t); c.on(thigh, F(p[0]), F(p[1]), Mat.GreenDragon, Math.max(0, 1 + dark)); }
  return thigh;
}

/** Perna da frente: ombro, braço com o cotovelo para trás, antebraço forte e a mão com garras. */
function foreLeg(c: Canvas, shoulder: Pt, g: number, step: number, lift: number, dark: number) {
  const hand: Pt = [shoulder[0] - 5 + step * 7, g - 1.4 - lift];
  const elbow: Pt = [shoulder[0] + 5 + step * 2, shoulder[1] + 17 - lift * 0.4];
  const wrist: Pt = [hand[0] + 3, hand[1] - 5];
  const sc = dirScales(shoulder, [0.15, 0.99], 2.6);
  const dk: Offset = (X, Y) => sc(X, Y) + dark;
  // Antebraço grosso perto do cotovelo, afinando no pulso.
  tube(c, [elbow, mix(elbow, wrist, 0.45), wrist, [hand[0] + 1.5, hand[1] - 2]], [4.8, 4.4, 3, 2.8], Mat.GreenDragon, dk);
  foot(c, hand, 0.92, dark, sc);
  // Ombro e braço: músculo largo saindo do peito.
  const arm = shape(c, smooth([[shoulder[0] - 9, shoulder[1] - 6], [shoulder[0] + 6, shoulder[1] - 8], [shoulder[0] + 9, shoulder[1] + 4], [elbow[0] + 5, elbow[1]],
    [elbow[0], elbow[1] + 4.6], [elbow[0] - 5, elbow[1] - 1], [shoulder[0] - 8, shoulder[1] + 6]]), Mat.GreenDragon, [shoulder[0] - 2, shoulder[1] - 5], 18, 20, (X, Y) => dk(X, Y) + 1);
  return arm;
}

/** Asa de morcego: braço, antebraço, polegar com garra, quatro dedos finos e a membrana em arcos entre eles. */
function wing(c: Canvas, root: Pt, flap: number, dark: number, near: boolean) {
  const elbow = rot([root[0] + 20, root[1] - 28], root, flap);
  const wrist = rot([root[0] + 2, root[1] - 56], root, flap * 1.4);
  const tips = ([[root[0] + 46, root[1] - 70], [root[0] + 70, root[1] - 48], [root[0] + 78, root[1] - 20], [root[0] + 62, root[1] + 0]] as Pt[])
    .map((p, i) => rot(p, root, flap * (1.5 - i * 0.22)));
  // Dedos levemente curvos (articulação no meio).
  const knuckle = (t: Pt, i: number): Pt => { const m = mix(wrist, t, 0.5); return [m[0] - 2 + i, m[1] - 3 + i * 0.6]; };
  const attach: Pt = [root[0] + 36, root[1] + 10];
  const edge: Pt[] = [root, elbow, wrist, tips[0]];
  // Entre duas pontas, a membrana faz um arco para dentro (mais fundo no meio).
  const arc = (a: Pt, b: Pt, depth: number) => { for (let t = 0.2; t < 0.9; t += 0.2) edge.push(mix(mix(a, b, t), wrist, depth * Math.sin(t * Math.PI))); };
  for (let i = 1; i < tips.length; i++) { arc(tips[i - 1], tips[i], 0.22); edge.push(tips[i]); }
  arc(tips[3], attach, 0.16);
  edge.push(attach);
  const inside = inPoly(edge);
  // Membrana: clara no meio de cada vão (a luz atravessa), escurecendo perto dos dedos e da borda.
  const fingers = [elbow, ...tips];
  c.fill(pbox(edge), (x, y) => inside(x, y), Mat.Membrane, (x, y) => {
    const ang = Math.atan2(y - wrist[1], x - wrist[0]);
    let near2 = 9;
    for (const t of fingers) {
      let d = Math.abs(ang - Math.atan2(t[1] - wrist[1], t[0] - wrist[0]));
      if (d > Math.PI) d = 2 * Math.PI - d;
      near2 = Math.min(near2, d);
    }
    const dw = Math.hypot(x - wrist[0], y - wrist[1]) / 75;
    return 0.4 + Math.min(0.36, near2 * 1.3) - dw * 0.14 + (near ? 0.08 : -0.06);
  }, () => dark);
  const bone = (a: Pt, b: Pt, ra: number, rb: number) => capsule(c, a, b, ra, rb, Mat.GreenDragon, (X, Y) => dark + (noise(X, Y) < 0.12 ? -1 : 0));
  tips.forEach((t, i) => { const kn = knuckle(t, i); bone(wrist, kn, 1.2, 0.9); bone(kn, t, 0.9, 0.35); });
  // Braço: osso com o cotovelo saltado e o punho grosso.
  bone(root, elbow, 3, 2.1);
  bone(elbow, wrist, 2.1, 1.6);
  claw(c, add(wrist, [-1.2, -1.4]), [-0.6, -0.8], 4.6, 1);
  for (const t of tips) c.px(F(t[0]), F(t[1]), Mat.Bone, 4);
}

/** Cabeça: crânio comprido, crista, chifres, olho, narina, dentes e a mandíbula (aberta por `jaw`, em radianos). */
function head(c: Canvas, h: Pt, tilt: number, jaw: number, glare: boolean) {
  const P = (dx: number, dy: number): Pt => rot([h[0] + dx, h[1] + dy], h, tilt);
  const hinge = P(6, 3);
  const J = (dx: number, dy: number): Pt => rot(P(dx, dy), hinge, -jaw);
  // Chifre de lá (mais escuro) e o de cá, longos e curvos para trás, de marfim com anéis.
  const hornAt = (dx: number, dy: number, dark: number) => tube(c, [P(5 + dx, -6 + dy), P(15 + dx, -11 + dy), P(26 + dx, -11 + dy), P(33 + dx, -6 + dy)], [2.6, 2, 1.3, 0.4], Mat.Bone,
    (X, Y) => dark + ((X + Y * 3) % 9 < 1 ? -1 : 0));
  hornAt(3, -1.5, -1);
  // Crista do alto da cabeça: espinhos com membrana, do meio da testa até a nuca.
  for (let i = 0; i < 5; i++) {
    const b = P(-6 + i * 4, -8.2 + i * 0.6);
    spike(c, b, [Math.sin(0.6 + tilt + i * 0.12), -Math.cos(0.6 + tilt + i * 0.12)], 5.6 - i * 0.5, 1.3, Mat.Bone, -1);
  }
  // Mandíbula de baixo (gira na dobradiça) com a garganta clara e a boca por dentro quando abre.
  if (jaw > 0.02) {
    shape(c, [P(-4, 3), P(-26, 1.6), J(-25, 5), J(-6, 6)], Mat.Blood, P(-14, 4), 14, 4, (X, Y) => (noise(X, Y) < 0.2 ? -1 : 0));
    shape(c, [J(-8, 5.4), J(-20, 4.8), J(-16, 6.2), J(-6, 6.6)], Mat.Lip, J(-12, 5.6), 8, 2);
  }
  const lowerPts: Pt[] = [J(8, 3.4), J(-6, 4.4), J(-24, 4.6), J(-27.4, 5.2), J(-26, 8), J(-10, 9.4), J(4, 8.6), J(9, 6.4)];
  const lower = shape(c, lowerPts, Mat.GreenDragon, J(-8, 4), 22, 7, dirScales(h, [1, 0], 1.8));
  // Placas claras embaixo do queixo.
  shape(c, [J(-24, 7.2), J(-10, 8.6), J(4, 8), J(2, 9.6), J(-10, 10.4), J(-25, 8.6)], Mat.DragonBelly, J(-10, 9), 18, 2,
    (X) => (X % 5 === 0 ? -1 : 0));
  for (const [x, len] of [[-24.6, 2.8], [-21.8, 1.6], [-19.2, 2.2], [-16, 1.4], [-12.6, 1.8]] as const) {
    spike(c, J(x, 4.8), [Math.sin(-jaw + tilt + Math.PI), -Math.cos(-jaw + tilt + Math.PI)], len, 0.55, Mat.Bone);
  }
  // Crânio: testa alta com a sobrancelha saltada, focinho comprido e o lábio de cima.
  const skullPts: Pt[] = [P(12, 2), P(11, -4), P(6, -8), P(-2, -9.2), P(-7, -7.6), P(-12, -5.4), P(-20, -4.6), P(-26, -3.4), P(-29, -1), P(-28.6, 2), P(-24, 3.4),
    P(-10, 3.6), P(2, 4.6), P(9, 5)];
  const skull = shape(c, skullPts, Mat.GreenDragon, P(-6, -4), 30, 9, dirScales(h, [Math.cos(tilt), Math.sin(tilt)], 1.8));
  // Dentes de cima (presas maiores na frente).
  for (const [x, len] of [[-26.4, 3.6], [-23.6, 1.6], [-21.4, 2.2], [-18.6, 3.2], [-15.8, 1.8], [-13.4, 2], [-10.8, 1.4]] as const) {
    spike(c, P(x, 3.2), [-Math.sin(tilt), Math.cos(tilt)], len, len > 3 ? 0.75 : 0.55, Mat.Bone);
  }
  // Chifre de cá por cima do crânio, espinhos da bochecha.
  hornAt(0, 0, 0);
  for (let i = 0; i < 3; i++) spike(c, P(8 + i * 1.4, 4 + i * 1.6), [Math.cos(tilt + 0.5), Math.sin(tilt + 0.5)], 4 - i * 0.8, 0.9, Mat.GreenDragon, -1);
  // Sobrancelha pesada (sombra em cima do olho), olho âmbar com pupila em fenda, narina e a linha da boca.
  const eye = P(-6, -4);
  const eyeId = c.fill(ebox(eye[0], eye[1], 3, 2), inEllipse(eye[0], eye[1], 2.6, 1.7), Mat.Amber, sphere(eye[0] - 0.6, eye[1] - 0.6, 2.6, 1.8));
  for (let y = -1; y <= 2; y++) c.on(eyeId, F(eye[0]), F(eye[1]) + y, Mat.Eye, 0);
  c.on(eyeId, F(eye[0]) - 2, F(eye[1]) - 1, Mat.Amber, 5);
  if (glare) c.on(eyeId, F(eye[0]) - 1, F(eye[1]) - 1, Mat.Amber, 5);
  shape(c, [P(-10.6, -5.8), P(-6, -7.6), P(0, -6.8), P(-0.6, -5.6), P(-6, -6.1), P(-9.6, -5)], Mat.GreenDragon, P(-5, -8), 8, 3);
  for (const dx of [0, 1]) c.on(skull, F(P(-26, -1.2)[0]) + dx, F(P(-26, -1.2)[1]), Mat.Eye, 0);
  for (let x = -27; x <= 4; x += 0.5) { const p = P(x, 3.4 + Math.max(0, x + 6) * 0.06); c.on([skull, lower], F(p[0]), F(p[1]), Mat.Eye, 0); }
  // Escamas maiores na testa e no focinho: fileira de placas no alto.
  for (let x = -24; x <= 4; x += 3) { const p = P(x, -4.8 - Math.max(0, -x - 8) * -0.08 - (x > -12 ? 2.6 : 0)); c.on(skull, F(p[0]), F(p[1]), Mat.GreenDragon, 5); }
  return skull;
}

/** Nuvem de gás venenoso (o sopro): desce da boca até o chão e se espalha para os lados, crescendo de `size` 0 a 1. */
function venomCloud(c: Canvas, mouth: Pt, g: number, size: number, seed: number) {
  const land: Pt = [mouth[0] + 6, g - 8];
  const puffs: { at: Pt; r: number; far: boolean }[] = [];
  // Jorro: da boca até o chão.
  for (let t = 0; t <= 1.001; t += 0.1) {
    const p = mix(mouth, land, t * size);
    puffs.push({ at: [p[0] + Math.sin(t * 7 + seed) * 2.4 - t * 4, p[1]], r: 3 + t * 8 * size, far: false });
  }
  // No chão: rola para os dois lados, em bolos grandes.
  if (size > 0.5) {
    const spread = (size - 0.5) * 2;
    for (const [dx, r] of [[-12, 10], [0, 12], [12, 11], [23, 8.6], [-21, 7], [33, 6.4]] as const) {
      puffs.push({ at: [land[0] + dx * spread, g - r * 0.75 * (0.6 + spread * 0.4)], r: r * (0.5 + spread * 0.5), far: Math.abs(dx) > 20 });
    }
  }
  puffs.forEach(({ at, r, far }, i) => {
    const [cx, cy] = at;
    c.fill(ebox(cx, cy, r, r), (x, y) => {
      const k = ((x + 0.5 - cx) / r) ** 2 + ((y + 0.5 - cy) / (r * 0.85)) ** 2;
      // Borda esfiapada: pixels somem perto da borda.
      if (k > 1) return false;
      // Miolo cheio; perto da borda o gás fica ralo (xadrez e falhas), como fumaça.
      if (k > 0.55) return ((Math.floor(x * 2) + Math.floor(y * 2)) & 1) === 0 && noise(x * 2 + seed, y * 2 + i) > (k - 0.55);
      return k < 0.35 || noise(x * 2 + seed, y * 2 + i) > 0.12;
    }, Mat.Venom, sphere(cx - r * 0.25, cy - r * 0.35, r, r), (X, Y) => (noise(X >> 1, Y >> 1) < 0.2 ? -1 : 0) - (far ? 1 : 0));
  });
}

// --- Quadros ------------------------------------------------------------------------------

/**
 * Um quadro do dragão. Parado: respira (o peito sobe), a cabeça balança e a ponta da cauda mexe. Andar: patas em
 * diagonal (a da frente de cá com a de trás de lá). Mordida: recua a cabeça, avança com a boca aberta e fecha.
 * Sopro: ergue a cabeça e as asas e solta a nuvem de gás.
 */
export function dragon(c: Canvas, k: number, mode: DragonMode, g: number) {
  const breathe = [0, 0.6, 1, 0.6][k];
  const step = mode === "walk" ? [1, 0, -1, 0][k] : 0, lift = mode === "walk" ? [0, 2.4, 0, 2.4][k] : 0;
  const bob = mode === "walk" ? [0, -1.2, 0, -1.2][k] : -breathe * 0.4;
  // Cabeça: recuo e bote na mordida, ergue no sopro.
  const lunge = mode === "bite" ? [-6, 7, 6, 2][k] : mode === "breath" ? [-4, -2, -2, -3][k] : 0;
  const rise = mode === "bite" ? [-5, 8, 7, 1][k] : mode === "breath" ? [-6, -2, 0, -2][k] : breathe * 0.5;
  const jaw = mode === "bite" ? [0.3, 0.48, 0.05, 0][k] : mode === "breath" ? [0.12, 0.34, 0.38, 0.32][k] : 0;
  // Giro da cabeça (positivo ergue o focinho): a mordida e o sopro descem o focinho.
  const tilt = mode === "bite" ? [0.14, -0.22, -0.2, -0.05][k] : mode === "breath" ? [0.2, -0.38, -0.46, -0.4][k] : -breathe * 0.03;
  const flap = mode === "breath" ? [-0.12, -0.3, -0.34, -0.28][k] : mode === "walk" ? [0, -0.05, 0, -0.05][k] : -breathe * 0.04;
  const sway = Math.sin((k / 4) * Math.PI * 2) * (mode === "walk" ? 3 : 2);

  const y = (v: number) => g - v + bob;
  const headAt: Pt = [46 - lunge, y(98) + rise];
  const neckTop: Pt = [headAt[0] + 10, headAt[1] + 3];
  const spine = new Spine(
    [neckTop, [neckTop[0] + 3, y(86) + rise * 0.6], [62 - lunge * 0.3, y(74) + rise * 0.3], [72, y(62)], [86, y(55) - breathe * 0.4], [104, y(52) - breathe * 0.6],
      [122, y(52)], [136, y(50)], [150, y(44)], [162, y(37)], [172, y(33) + sway * 0.3], [181, y(35) + sway * 0.7], [187, y(42) + sway]],
    [5.6, 7.4, 9.6, 14, 19 + breathe * 0.4, 18.6 + breathe * 0.6, 16.4, 12.4, 9, 6.4, 4.2, 2.4, 0.6],
  );

  // Asa de lá, atrás de tudo, e as pernas de lá (mais escuras).
  wing(c, [104, y(64)], flap - 0.05, 0, false);
  hindLeg(c, [130, y(50)], g, -step, mode === "walk" ? [2.4, 0, 0, 0][k] : 0, -1);
  foreLeg(c, [82, y(52)], g, step, mode === "walk" ? [0, 0, 2.4, 0][k] : 0, -1);

  // Espinhos das costas (atrás do tubo): com membrana no pescoço (a crista), sozinhos no resto.
  const backs: { base: Pt; tip: Pt; s: number }[] = [];
  for (let s = 3; s < spine.total - 4; s += Math.max(3.2, spine.point(s).r * 0.42)) {
    const q = spine.point(s);
    const out: Pt = [-q.nx, -q.ny];
    const dir: Pt = [out[0] * 0.8 + q.tx * 0.6, out[1] * 0.8 + q.ty * 0.6];
    const len = Math.hypot(dir[0], dir[1]);
    const h = Math.max(2, Math.min(10, q.r * (s < 40 ? 1.15 : 0.62)));
    const base = add(q.p, [out[0] * q.r * 0.72, out[1] * q.r * 0.72]);
    backs.push({ base, tip: add(base, [(dir[0] / len) * h, (dir[1] / len) * h]), s });
  }
  for (let i = 1; i < backs.length && backs[i].s < 40; i++) {
    const a = backs[i - 1], b = backs[i];
    shape(c, [a.base, mix(a.tip, a.base, 0.12), mix(b.tip, b.base, 0.12), b.base], Mat.Membrane, mix(a.tip, b.base, 0.5), 6, 6, (X, Y) => (noise(X >> 1, Y) < 0.12 ? -1 : 0));
  }
  for (const b of backs) {
    const dx = b.tip[0] - b.base[0], dy = b.tip[1] - b.base[1], l = Math.hypot(dx, dy);
    spike(c, b.base, [dx / l, dy / l], l, Math.max(0.9, l * 0.3), Mat.Bone, -1);
  }

  // Pescoço, tronco e cauda numa peça só, com a barriga de placas claras atravessadas.
  const box = spine.box();
  const body = c.fill(box, (px, py) => { const q = spine.at(px + 0.5, py + 0.5); return q.d <= q.r; }, Mat.GreenDragon,
    (px, py) => tubeLight(spine.at(px + 0.5, py + 0.5)), spineScales(spine, 0.32));
  c.fill(box, (px, py) => {
    const q = spine.at(px + 0.5, py + 0.5);
    return q.d <= q.r && q.v > q.r * 0.38 && q.s > 4;
  }, Mat.DragonBelly, (px, py) => tubeLight(spine.at(px + 0.5, py + 0.5)) * 0.92, (X, Y) => {
    const q = spine.at((X + 0.5) / 2, (Y + 0.5) / 2);
    const w = Math.max(1.2, Math.min(3.6, q.r * 0.24)), a = frac(q.s / w);
    return a < 0.18 ? -1 : a < 0.4 && q.v < q.r * 0.7 ? 1 : 0;
  });

  // Pernas de cá: a coxa e o ombro entram no corpo.
  hindLeg(c, [124, y(48)], g, step, mode === "walk" ? [0, 0, 2.4, 0][k] : 0, 0);
  foreLeg(c, [78, y(50)], g, -step, mode === "walk" ? [2.4, 0, 0, 0][k] : 0, 0);

  // Asa de cá, dobrada para trás por cima das costas.
  wing(c, [96, y(62)], flap, 0, true);

  // Cabeça por cima do pescoço; no sopro, a nuvem sai da boca.
  const HEAD = 1.22;
  c.scaled(headAt, HEAD, () => head(c, headAt, tilt, jaw, mode !== "idle"));
  // A boca (na ponta do focinho, girada com a cabeça): o gás desce dela até o chão à frente.
  if (mode === "breath" && k > 0) venomCloud(c, rot([headAt[0] - 22 * HEAD, headAt[1] + 5 * HEAD], headAt, tilt), g, [0, 0.55, 1, 0.8][k], k * 7);
  void body;
}
