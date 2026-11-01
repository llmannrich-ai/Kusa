import type { CreatureSummonKind as SummonKind } from "@kusa/shared";
import { Sheet, makeCanvas } from "./pixels.ts";
import {
  CLIP_ORDER, add, blitMirrored, capsule, dir, ellipse, joints, lerpPt, poly, posed, shade, stroke, weaponAngle,
  type Build, type Clip, type Grip, type Joints, type Pal, type PaintOptions, type Pose, type Pt,
} from "./rig.ts";

/**
 * As criaturas invocadas pelo Druida em arte própria e animada (parado, andando, golpe, especial), no mesmo volume de
 * luz dos monstros do Pântano (`rig.ts`). Cada uma tem o seu jeito de andar:
 *
 * - quadrúpedes (Lobo Espiritual, Urso Ancestral): as patas pisam e ficam plantadas no chão enquanto o corpo passa por
 *   cima (cinemática inversa de duas juntas), o lobo em trote (patas em diagonal) e o urso no passo lateral e pesado;
 * - bípedes (Guardião do Bosque, Esqueleto Erguido): o esqueleto de `rig.ts`, com braços balançando contra as pernas;
 * - voadores (Águia, Vespa, Mariposa): asas batendo em ciclo, pernas penduradas ou recolhidas no voo;
 * - o Fogo-Fátuo: chama que tremula, com bracinhos de fumaça.
 *
 * Os desenhos são feitos olhando para a direita (+x) e espelhados na folha (olham para a esquerda, como os monstros).
 * Medidas em unidades de 1/32 do quadro: a mesma criatura sai em qualquer tamanho de quadro.
 */

export const SUMMON_OUTLINE = "#120c10";

/** Quadros de cada clipe das invocações (ciclos mais longos que os dos monstros: o andar fica mais suave). */
export const SUMMON_FRAMES: Record<Clip, number> = { idle: 6, walk: 8, attack: 5, cast: 5 };

// --- Paletas ------------------------------------------------------------------------

const SPIRIT_FUR: Pal = ["#eef4ff", "#bccbe2", "#8ea3c2", "#62779a", "#3e4e72"];
const SPIRIT_BELLY: Pal = ["#ffffff", "#e9f0fa", "#c6d4e6", "#9aabc5", "#6d7e9c"];
const SPIRIT_SADDLE: Pal = ["#8fa2bf", "#687c9c", "#4c5d7c", "#36435e", "#232c40"];
const SPIRIT_GLOW = "#8ff7ff";
const SPIRIT_CORE = "#e6ffff";
const NOSE = "#1d2233";
const MOUTH: Pal = ["#7a2a3a", "#5e1d2c", "#46131f", "#2f0b14", "#1e060c"];
const FANG = "#fffdf2";

const BEAR_FUR: Pal = ["#9c7658", "#7b5841", "#5f412f", "#462e21", "#2d1c14"];
const BEAR_MUZZLE: Pal = ["#dcbd93", "#c09f74", "#9c7b57", "#76593e", "#4e3a28"];
const MOSS: Pal = ["#b6e07a", "#8cc252", "#67993a", "#487029", "#2d4a1a"];
const RUNE = "#a8ff74";
const RUNE_CORE = "#efffd8";
const CLAW = "#efe6d2";

const BARK: Pal = ["#c09466", "#9a6f45", "#775332", "#573b22", "#372413"];
const LEAF: Pal = ["#cdf27e", "#97d34e", "#64a931", "#407d23", "#275016"];
const BLOSSOM = "#ffc4e1";
const EMBER = "#ffe066";

const BONE: Pal = ["#fffbea", "#ece2c4", "#c9bc96", "#9b8e6c", "#665c45"];
const RAG: Pal = ["#8a9a62", "#6c7c49", "#525f36", "#3b4526", "#252c18"];
const RUST: Pal = ["#e2d6c8", "#b4aca2", "#8a817a", "#5f5852", "#3a3532"];
const HILT: Pal = ["#b98a54", "#94693b", "#714e2a", "#53381b", "#33210f"];
const NECRO_GLOW = "#9dff6a";

const EAGLE_BROWN: Pal = ["#b98252", "#93613a", "#714727", "#523119", "#331d0e"];
const EAGLE_DARK: Pal = ["#7d5434", "#5f3d24", "#462b18", "#311d10", "#1f1209"];
const EAGLE_WHITE: Pal = ["#ffffff", "#f4efe4", "#dcd3c1", "#b2a68f", "#7c715d"];
const TALON: Pal = ["#ffe38a", "#f6c444", "#dc9a22", "#a76c15", "#6d450b"];

const HORNET_YELLOW: Pal = ["#fff27c", "#f8d334", "#dba914", "#a47a0b", "#6a4c06"];
const HORNET_BLACK: Pal = ["#6e5d4c", "#4a3d32", "#312821", "#201a15", "#120e0b"];
const HORNET_LEG: Pal = ["#ffd277", "#e8a93c", "#c27f22", "#8f5915", "#5c380b"];

const MOTH_BODY: Pal = ["#fffaf0", "#f3e4c8", "#dcc49c", "#b39a73", "#7d6a4e"];
const MOTH_EYE = "#3b2a4a";

// --- Caneta com transformação ------------------------------------------------------

interface Frame { pivot: Pt; rot: number; off: Pt }

/**
 * Desenha em unidades (1/32 do quadro) com uma pilha de transformações (girar em volta de um ponto e deslocar): o corpo
 * do urso empina girando em volta do quadril e a cabeça do lobo gira no pescoço sem refazer as contas de cada peça.
 */
class Pen {
  private stack: Frame[] = [];
  /** `base` desloca o desenho todo (unidades), para centrar a criatura no quadro. */
  constructor(readonly s: Sheet, readonly u: number, readonly base: Pt = { x: 0, y: 0 }) {}

  /** Empilha uma transformação: gira `rot` (horário) em volta de `pivot` e desloca `off`. */
  push(pivot: Pt, rot = 0, off: Pt = { x: 0, y: 0 }) { this.stack.push({ pivot, rot, off }); }
  pop() { this.stack.pop(); }

  /** Ponto local → ponto do quadro (unidades). */
  at(p: Pt): Pt {
    let q = p;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const f = this.stack[i];
      const dx = q.x - f.pivot.x;
      const dy = q.y - f.pivot.y;
      const c = Math.cos(f.rot);
      const s = Math.sin(f.rot);
      q = { x: f.pivot.x + dx * c - dy * s + f.off.x, y: f.pivot.y + dx * s + dy * c + f.off.y };
    }
    return q;
  }
  get rot() { return this.stack.reduce((r, f) => r + f.rot, 0); }
  /** Em pixels. */
  px(p: Pt): Pt {
    const q = this.at(p);
    return { x: (q.x + this.base.x) * this.u, y: (q.y + this.base.y) * this.u };
  }
  /** Desenha sem as transformações (pés no chão do quadro). */
  flat(fn: () => void) {
    const saved = this.stack;
    this.stack = [];
    fn();
    this.stack = saved;
  }

  cap(a: Pt, b: Pt, ra: number, rb: number, pal: Pal, opt?: PaintOptions) {
    capsule(this.s, this.px(a), this.px(b), ra * this.u, rb * this.u, pal, opt);
  }
  ell(c: Pt, rx: number, ry: number, rot: number, pal: Pal, opt?: PaintOptions) {
    ellipse(this.s, this.px(c), rx * this.u, ry * this.u, rot + this.rot, pal, opt);
  }
  shape(pts: readonly Pt[], color: (x: number, y: number) => string | null) {
    poly(this.s, pts.map((p) => this.px(p)), color);
  }
  line(a: Pt, b: Pt, c: string | ((t: number) => string)) { stroke(this.s, this.px(a), this.px(b), c); }
  dot(p: Pt, c: string) {
    const q = this.px(p);
    this.s.set(q.x, q.y, c);
  }
  /** Pixel translúcido: mistura com o que já está pintado (asa da vespa sobre o corpo). */
  glass(p: Pt, rgb: readonly [number, number, number], alpha: number) {
    const q = this.px(p);
    glassPixel(this.s, q.x, q.y, rgb, alpha);
  }
  /** Teste "dentro da elipse" em pixels, para recortar uma pintura (sela do lobo, faixas da vespa). */
  insideEllipse(c: Pt, rx: number, ry: number, rot: number) {
    const pc = this.px(c);
    const a = rot + this.rot;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return (x: number, y: number) => {
      const dx = x + 0.5 - pc.x;
      const dy = y + 0.5 - pc.y;
      const uu = (dx * cos + dy * sin) / (rx * this.u);
      const vv = (-dx * sin + dy * cos) / (ry * this.u);
      return uu * uu + vv * vv <= 1;
    };
  }
}

const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

function glassPixel(s: Sheet, x: number, y: number, rgb: readonly [number, number, number], alpha: number) {
  const under = s.get(Math.round(x), Math.round(y));
  if (under && under.startsWith("#")) {
    const b = hex(under);
    s.set(x, y, toHex(b.map((v, i) => v + (rgb[i] - v) * alpha)));
  } else if (!under) {
    s.set(x, y, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(2)})`);
  }
}

/**
 * Duas juntas (coxa e canela, ou braço e antebraço) de `root` até `target`: devolve o joelho, dobrado para a frente
 * (`bend` = -1) ou para trás (1), e o fim (o alvo, ou o mais perto dele que a perna alcança).
 */
function ik(root: Pt, target: Pt, l1: number, l2: number, bend: 1 | -1) {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const dist = Math.hypot(dx, dy) || 0.001;
  const d = Math.min(l1 + l2 - 0.02, Math.max(Math.abs(l1 - l2) + 0.02, dist));
  const base = Math.atan2(dy, dx);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = base + bend * a;
  const knee = { x: root.x + Math.cos(ang) * l1, y: root.y + Math.sin(ang) * l1 };
  const k = Math.atan2(target.y - knee.y, target.x - knee.x);
  const end = { x: knee.x + Math.cos(k) * l2, y: knee.y + Math.sin(k) * l2 };
  return { knee, end };
}

/**
 * Pata no passo: na fase de apoio (`duty`) ela fica no chão e vai para trás enquanto o corpo avança; no resto do ciclo
 * sobe num arco e volta para a frente. `phase` de 0 a 1.
 */
function stepFoot(phase: number, baseX: number, ground: number, stride: number, lift: number, duty = 0.55) {
  const q = ((phase % 1) + 1) % 1;
  if (q < duty) return { x: baseX + stride * (0.5 - q / duty), y: ground, up: 0 };
  const t = (q - duty) / (1 - duty);
  // Sobe rápido e desce suave (a pata é puxada para cima e pousa).
  const up = Math.sin(Math.PI * Math.pow(t, 0.8));
  return { x: baseX + stride * (-0.5 + (1 - Math.cos(Math.PI * t)) / 2), y: ground - up * lift, up };
}

/** Pontinhos de luz que se desprendem de uma criatura espiritual (posições fixas por quadro, sem sorteio). */
function motes(pen: Pen, from: Pt, n: number, seed: number, spread: number, rise: number, colors: readonly string[]) {
  for (let k = 0; k < n; k++) {
    const a = seed * 1.7 + k * 2.39;
    const t = ((seed * 0.21 + k * 0.37) % 1 + 1) % 1;
    const p = { x: from.x + Math.sin(a) * spread * (0.4 + t), y: from.y - t * rise };
    pen.dot(p, colors[k % colors.length]);
  }
}

/**
 * Franja de pelos: pontas de `len` caindo para baixo ao longo do segmento de `a` a `b`, afastadas `r` do eixo
 * (barriga, garganta e rabo ficam com a borda desfiada em vez de lisa).
 */
function fringe(pen: Pen, a: Pt, b: Pt, r: number, len: number, color: string) {
  const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 1.2));
  for (let k = 0; k <= n; k++) {
    const c = lerpPt(a, b, k / n);
    const base = { x: c.x, y: c.y + r };
    const l = len * (k % 2 ? 0.7 : 1);
    pen.shape([{ x: base.x - 0.6, y: base.y - 0.4 }, { x: base.x + 0.5, y: base.y - 0.4 }, { x: base.x - 0.3, y: base.y + l }], () => color);
  }
}

// --- Quadrúpedes -------------------------------------------------------------------

interface QuadLegSpec {
  /** Raiz (cotovelo ou quadril), no espaço do corpo. */
  root: Pt;
  /** Pata (no chão do quadro, sem a transformação do corpo). */
  foot: Pt;
  /** Fração do passo no ar (0 = no chão): dobra mais a junta de baixo. */
  up: number;
}

/** Pata da frente: antebraço e mão, com o pulso dobrando para a frente quando a pata sobe. */
function frontLeg(pen: Pen, leg: QuadLegSpec, len: [number, number], r: [number, number], pal: Pal, paw: Pal, claws: string | null) {
  const root = pen.at(leg.root);
  pen.flat(() => {
    const { knee, end } = ik(root, leg.foot, len[0], len[1], -1);
    pen.cap(root, knee, r[0], r[1], pal);
    pen.cap(knee, end, r[1], r[1] * 0.8, pal);
    // Pata: almofada achatada à frente do pulso; no ar ela pende (dedos para baixo).
    const tilt = leg.up * 0.9;
    const pc = add(end, { x: 0.55 * Math.cos(tilt) * r[1], y: -0.15 + leg.up * 0.4 });
    pen.ell(pc, r[1] * 1.15, r[1] * 0.7, tilt, paw, { flat: 0.2 });
    if (claws) for (let k = 0; k < 2; k++) pen.dot(add(pc, { x: r[1] * 0.9 - k * 0.7, y: r[1] * 0.55 }), claws);
  });
}

/**
 * Pata de trás: coxa (forte), canela e o metatarso inclinado (o "calcanhar" alto do lobo), dobrando para trás no
 * jarrete. `meta` = comprimento do metatarso; o urso, que pisa com a sola inteira, usa um metatarso curto e deitado.
 */
function hindLeg(pen: Pen, leg: QuadLegSpec, len: [number, number, number], r: [number, number, number], pal: Pal, paw: Pal, claws: string | null, metaSlant = 0.38) {
  const root = pen.at(leg.root);
  pen.flat(() => {
    const slant = metaSlant + leg.up * 0.7;
    const hock = { x: leg.foot.x - Math.sin(slant) * len[2], y: leg.foot.y - Math.cos(slant) * len[2] };
    const { knee, end } = ik(root, hock, len[0], len[1], -1);
    pen.cap(root, knee, r[0], r[1], pal);
    pen.cap(knee, end, r[1], r[2], pal);
    const foot = { x: end.x + Math.sin(slant) * len[2], y: end.y + Math.cos(slant) * len[2] };
    pen.cap(end, foot, r[2], r[2] * 0.9, pal);
    const pc = add(foot, { x: 0.5 * r[2], y: -0.1 + leg.up * 0.3 });
    pen.ell(pc, r[2] * 1.35, r[2] * 0.8, leg.up * 0.8, paw, { flat: 0.2 });
    if (claws) for (let k = 0; k < 2; k++) pen.dot(add(pc, { x: r[2] * 1.1 - k * 0.7, y: r[2] * 0.6 }), claws);
  });
}

// --- Lobo Espiritual ---------------------------------------------------------------

interface WolfPose {
  /** Corpo: deslocamento, sobe/desce e inclinação (negativo = empina, focinho para cima). */
  dx: number;
  bob: number;
  rot: number;
  /** Cabeça: deslocamento no pescoço, giro (negativo = focinho para cima), boca aberta (0..1) e orelha. */
  head: Pt;
  headRot: number;
  jaw: number;
  ear: number;
  tail: number;
  /** Fôlego (0..1): o peito incha. */
  breath: number;
  feet: { nf: Pt; ff: Pt; nh: Pt; fh: Pt };
  ups: { nf: number; ff: number; nh: number; fh: number };
  /** Rastro de luz espiritual (quantos pontinhos). */
  glow: number;
  seed: number;
}

const WOLF_GROUND = 30.6;

function wolfPose(clip: Clip, i: number): WolfPose {
  const n = SUMMON_FRAMES[clip];
  const g = WOLF_GROUND;
  const p: WolfPose = {
    dx: 0, bob: 0, rot: 0, head: { x: 0, y: 0 }, headRot: 0, jaw: 0, ear: 0, tail: 0, breath: 0,
    feet: { nf: { x: 22, y: g }, ff: { x: 20.6, y: g }, nh: { x: 8.2, y: g }, fh: { x: 9.6, y: g } },
    ups: { nf: 0, ff: 0, nh: 0, fh: 0 }, glow: 2, seed: i,
  };
  if (clip === "idle") {
    const t = (i / n) * Math.PI * 2;
    p.breath = 0.5 + 0.5 * Math.sin(t);
    p.bob = Math.sin(t) * 0.25;
    p.headRot = Math.sin(t) * 0.05;
    p.head = { x: 0, y: Math.sin(t) * 0.2 };
    p.tail = Math.sin(t) * 0.25;
    // Orelha mexe uma vez no ciclo.
    p.ear = i === 3 ? -0.35 : 0;
  } else if (clip === "walk") {
    // Trote: pata da frente de perto junto com a de trás de longe, e vice-versa.
    const ph = i / n;
    const stride = 6.2;
    const lift = 2.4;
    const nf = stepFoot(ph, 21.4, g, stride, lift, 0.5);
    const fh = stepFoot(ph, 9.2, g, stride, lift * 0.9, 0.5);
    const ff = stepFoot(ph + 0.5, 20.6, g, stride, lift, 0.5);
    const nh = stepFoot(ph + 0.5, 8.4, g, stride, lift * 0.9, 0.5);
    p.feet = { nf, ff, nh, fh };
    p.ups = { nf: nf.up, ff: ff.up, nh: nh.up, fh: fh.up };
    // O corpo desce quando as patas apoiam (duas vezes por ciclo) e a cabeça balança no contratempo.
    p.bob = Math.cos(ph * Math.PI * 4) * 0.45;
    p.rot = Math.sin(ph * Math.PI * 4) * 0.025;
    p.head = { x: 0.3, y: -Math.cos(ph * Math.PI * 4) * 0.35 };
    p.headRot = 0.06;
    p.tail = Math.sin(ph * Math.PI * 2) * 0.35 - 0.15;
    p.breath = 0.4;
    p.glow = 4;
  } else if (clip === "attack") {
    // Agacha, salta com a boca escancarada, morde, sacode e volta.
    p.dx = [-0.8, 0.6, 1, 0.8, 0.3][i];
    p.bob = [1.1, -1.4, 0, 0.2, 0.2][i];
    p.rot = [0.1, -0.16, 0.08, 0.04, 0][i];
    p.head = [{ x: -0.3, y: 1 }, { x: 0.4, y: -0.2 }, { x: 0.2, y: 0.6 }, { x: 0.2, y: 0.5 }, { x: 0.1, y: 0.2 }][i];
    p.headRot = [0.22, -0.1, 0.12, -0.08, 0.05][i];
    p.jaw = [0.25, 1, 0.1, 0, 0][i];
    p.ear = [-0.4, -0.5, -0.5, -0.4, -0.1][i];
    p.tail = [-0.1, 0.5, 0.2, 0.1, 0][i];
    p.feet = [
      { nf: { x: 20.8, y: g }, ff: { x: 19.6, y: g }, nh: { x: 7.4, y: g }, fh: { x: 8.6, y: g } },
      { nf: { x: 26, y: 26.2 }, ff: { x: 24.6, y: 27.4 }, nh: { x: 5.6, y: g }, fh: { x: 6.6, y: g } },
      { nf: { x: 25.2, y: g }, ff: { x: 23.8, y: g }, nh: { x: 8.6, y: g }, fh: { x: 9.6, y: g } },
      { nf: { x: 24.6, y: g }, ff: { x: 23.4, y: g }, nh: { x: 8.8, y: g }, fh: { x: 9.6, y: g } },
      { nf: { x: 23.2, y: g }, ff: { x: 21.8, y: g }, nh: { x: 8.8, y: g }, fh: { x: 10, y: g } },
    ][i];
    p.ups = [
      { nf: 0, ff: 0, nh: 0, fh: 0 }, { nf: 0.8, ff: 0.7, nh: 0, fh: 0 }, { nf: 0, ff: 0, nh: 0.2, fh: 0.2 },
      { nf: 0, ff: 0, nh: 0, fh: 0 }, { nf: 0, ff: 0, nh: 0, fh: 0 },
    ][i];
    p.glow = [1, 5, 3, 2, 1][i];
  } else {
    // Uivo: senta para trás, ergue o focinho e solta luz pela boca.
    const k = [0.45, 1, 1, 1, 0.5][i];
    p.rot = -0.22 * k;
    p.bob = 0.8 * k;
    p.dx = -0.6 * k;
    p.head = { x: -1.2 * k, y: -2.4 * k };
    p.headRot = -0.95 * k;
    p.jaw = [0.2, 0.7, 0.85, 0.7, 0.2][i];
    p.ear = -0.3 * k;
    p.tail = -0.15 * k;
    p.breath = 1;
    p.feet = { nf: { x: 21.4, y: g }, ff: { x: 20.2, y: g }, nh: { x: 9.4, y: g }, fh: { x: 10.4, y: g } };
    p.glow = [2, 4, 6, 6, 3][i];
  }
  return p;
}

function drawWolf(s: Sheet, clip: Clip, i: number) {
  const pen = new Pen(s, s.w / 38, { x: 3.1, y: 5.8 });
  const p = wolfPose(clip, i);
  const fur = SPIRIT_FUR;
  const far = shade(fur);
  // Corpo gira em volta do quadril (empinar/sentar) e se desloca com o passo.
  const hip = { x: 9.8, y: 17.4 };
  pen.push(hip, p.rot, { x: p.dx, y: p.bob });

  // Rabo (atrás de tudo): grosso e peludo, caído, balança e termina numa ponta escura com uma chama de espírito.
  const tailBase = { x: 6.2, y: 14.2 };
  let prev = tailBase;
  const tailPts = [tailBase];
  [-1.2, -0.65, -0.35, -0.15].forEach((a, k) => {
    const next = add(prev, dir(a + p.tail * (0.4 + k * 0.35)), 2.3);
    tailPts.push(next);
    prev = next;
  });
  const tailR = [1.4, 2.2, 2.4, 2.0, 1.0];
  for (let k = 0; k < tailPts.length - 1; k++) pen.cap(tailPts[k], tailPts[k + 1], tailR[k], tailR[k + 1], k >= 3 ? SPIRIT_SADDLE : fur, { flat: 0.3 });
  // Franja do rabo: pelos soltos para baixo.
  for (let k = 1; k < 4; k++) fringe(pen, tailPts[k], tailPts[k + 1], tailR[k] * 0.9, 1.1, k >= 3 ? SPIRIT_SADDLE[2] : fur[2]);
  pen.dot(add(tailPts[4], { x: -0.3, y: 0.8 }), SPIRIT_GLOW);
  pen.dot(add(tailPts[4], { x: -0.8, y: 1.4 }), SPIRIT_CORE);

  // Patas de longe, na sombra do corpo.
  hindLeg(pen, { root: { x: 8.9, y: 17.6 }, foot: p.feet.fh, up: p.ups.fh }, [5, 5, 3.6], [2.2, 1.05, 0.8], far, shade(SPIRIT_SADDLE), null);
  frontLeg(pen, { root: { x: 19.6, y: 19.6 }, foot: p.feet.ff, up: p.ups.ff }, [5, 5.1], [1.3, 0.85], far, shade(SPIRIT_SADDLE), null);

  // Tronco: anca mais baixa que a cernelha, barriga recolhida, peito fundo.
  const k = 1 + p.breath * 0.05;
  const soft = { flat: 0.3 };
  pen.ell({ x: 9.8, y: 17 }, 4.3, 4.2, 0.1, fur, soft);
  pen.ell({ x: 15, y: 17.1 }, 7.6, 4.1 * k, -0.06, fur, soft);
  pen.ell({ x: 19.4, y: 17.6 }, 3.6 * k, 4.6 * k, 0.2, fur, soft);
  // Sela escura no dorso (recortada dentro do corpo) e a franja da barriga.
  const body = pen.insideEllipse({ x: 15, y: 17.1 }, 7.6, 4.1 * k, -0.06);
  pen.ell({ x: 14, y: 13.6 }, 7.6, 2.8, -0.08, SPIRIT_SADDLE, { clip: body, edge: 0, flat: 0.4 });
  const rump = pen.insideEllipse({ x: 9.8, y: 17 }, 4.3, 4.2, 0.1);
  pen.ell({ x: 9.4, y: 13.9 }, 4, 2.2, 0.2, SPIRIT_SADDLE, { clip: rump, edge: 0, flat: 0.4 });
  fringe(pen, { x: 12, y: 20.6 }, { x: 19, y: 21.4 }, 0, 1.3, SPIRIT_BELLY[2]);
  // Pelagem: mechas riscadas na anca, no lombo e no ombro.
  for (const [a, b] of [[{ x: 7.4, y: 15.6 }, { x: 6.6, y: 17.8 }], [{ x: 10.8, y: 15.6 }, { x: 10, y: 17.8 }], [{ x: 14.6, y: 16 }, { x: 14, y: 18 }], [{ x: 17.8, y: 15.8 }, { x: 17.2, y: 18 }]] as const) {
    pen.line(a, b, fur[3]);
  }

  // Pescoço grosso com juba: tufos em ponta descendo pela garganta.
  const neckTop = { x: 23.4 + p.head.x * 0.6, y: 13.6 + p.head.y * 0.6 };
  pen.cap({ x: 19.4, y: 16 }, neckTop, 3.5, 2.8, fur, soft);
  pen.cap({ x: 18.4, y: 13.8 }, { x: neckTop.x - 0.8, y: neckTop.y - 2 }, 1.4, 1, SPIRIT_SADDLE, { edge: 0, flat: 0.4 });
  const ruff = { x: 21.6 + p.head.x * 0.4, y: 17 + p.head.y * 0.3 };
  pen.ell(ruff, 2.6, 3.5, -0.4, SPIRIT_BELLY, { edge: 0.5, flat: 0.3 });
  fringe(pen, { x: ruff.x - 1.6, y: ruff.y + 2.4 }, { x: ruff.x + 1.6, y: ruff.y + 1.2 }, 0, 1.6, SPIRIT_BELLY[1]);
  for (let t = 0; t < 3; t++) pen.line({ x: ruff.x - 1 + t * 0.9, y: ruff.y + 0.4 + t * 0.1 }, { x: ruff.x - 0.7 + t * 0.9, y: ruff.y + 2 }, SPIRIT_BELLY[3]);

  // Cabeça (gira no pescoço).
  const H = { x: 25 + p.head.x, y: 12.8 + p.head.y };
  pen.push(H, p.headRot);
  // Orelha de longe, atrás do crânio.
  pen.push({ x: H.x - 1.4, y: H.y - 1.8 }, p.ear * 0.7);
  pen.shape([{ x: H.x - 2.7, y: H.y - 1.4 }, { x: H.x - 2.9, y: H.y - 4.5 }, { x: H.x - 1.1, y: H.y - 2.1 }], () => far[2]);
  pen.pop();
  pen.ell(H, 3.1, 2.7, 0.15, fur, soft);
  pen.ell({ x: H.x - 0.6, y: H.y - 1.2 }, 2.2, 1.2, 0.15, SPIRIT_SADDLE, { clip: pen.insideEllipse(H, 3.1, 2.7, 0.15), edge: 0 });
  // Tufo da bochecha, em ponta para trás.
  pen.shape([{ x: H.x - 1.2, y: H.y + 0.6 }, { x: H.x - 3.6, y: H.y + 2.4 }, { x: H.x - 0.4, y: H.y + 2.4 }], () => SPIRIT_BELLY[1]);
  // Bochecha clara.
  pen.ell({ x: H.x + 0.4, y: H.y + 1.2 }, 2.2, 1.2, 0.1, SPIRIT_BELLY, { edge: 0 });
  // Mandíbula: gira para baixo na boca aberta; o céu da boca aparece escuro, com as presas.
  const jawPivot = { x: H.x + 1.2, y: H.y + 1.5 };
  const jawA = p.jaw * 0.75;
  if (p.jaw > 0.05) {
    pen.shape([jawPivot, { x: H.x + 5.8, y: H.y + 1.7 }, add(jawPivot, { x: Math.cos(jawA) * 4.4, y: Math.sin(jawA) * 4.4 })], () => MOUTH[2]);
    pen.dot({ x: H.x + 5.2, y: H.y + 2.2 }, FANG);
    pen.dot(add(jawPivot, { x: Math.cos(jawA) * 3.6, y: Math.sin(jawA) * 3.6 - 0.8 }), FANG);
  }
  pen.push(jawPivot, jawA);
  pen.cap(jawPivot, { x: H.x + 5.2, y: H.y + 2.1 }, 0.9, 0.6, SPIRIT_BELLY);
  pen.pop();
  // Focinho comprido, com o nariz na ponta.
  pen.cap({ x: H.x + 1.4, y: H.y + 0.3 }, { x: H.x + 5.8, y: H.y + 1.2 }, 1.6, 1.0, fur);
  pen.line({ x: H.x + 2.2, y: H.y - 0.6 }, { x: H.x + 5.4, y: H.y + 0.2 }, fur[0]);
  pen.dot({ x: H.x + 6.6, y: H.y + 1.0 }, NOSE);
  pen.dot({ x: H.x + 6.3, y: H.y + 0.6 }, NOSE);
  pen.dot({ x: H.x + 6.2, y: H.y + 1.1 }, NOSE);
  if (p.jaw <= 0.05) {
    pen.line({ x: H.x + 2.4, y: H.y + 2 }, { x: H.x + 5.8, y: H.y + 1.9 }, fur[4]);
    pen.dot({ x: H.x + 4.8, y: H.y + 2.3 }, FANG);
  }
  // Olho aceso de espírito, sob a testa.
  const eye = { x: H.x + 1.5, y: H.y - 0.6 };
  pen.line({ x: eye.x - 1, y: eye.y - 0.9 }, { x: eye.x + 0.9, y: eye.y - 0.6 }, fur[3]);
  pen.dot(eye, SPIRIT_GLOW);
  pen.dot({ x: eye.x + 0.5, y: eye.y }, SPIRIT_CORE);
  // Orelha de perto, pontuda, com o miolo escuro.
  pen.push({ x: H.x - 0.6, y: H.y - 2 }, p.ear);
  pen.shape([{ x: H.x - 2, y: H.y - 1.5 }, { x: H.x - 1.9, y: H.y - 5.1 }, { x: H.x + 0.3, y: H.y - 2 }], (x, y) => ((x + y) % 5 ? SPIRIT_SADDLE[1] : SPIRIT_SADDLE[2]));
  pen.shape([{ x: H.x - 1.4, y: H.y - 2 }, { x: H.x - 1.5, y: H.y - 4 }, { x: H.x - 0.4, y: H.y - 2.2 }], () => SPIRIT_SADDLE[4]);
  pen.pop();
  pen.pop();

  // Patas de perto, por cima do corpo.
  hindLeg(pen, { root: { x: 10, y: 18 }, foot: p.feet.nh, up: p.ups.nh }, [5, 5, 3.6], [2.4, 1.15, 0.85], fur, SPIRIT_BELLY, null);
  frontLeg(pen, { root: { x: 20.5, y: 20 }, foot: p.feet.nf, up: p.ups.nf }, [5, 5.1], [1.45, 0.95], fur, SPIRIT_BELLY, null);
  pen.pop();

  // Rastro de luz: pontinhos que sobem das patas e do rabo.
  pen.flat(() => {
    motes(pen, { x: 5 + p.dx, y: 18 }, p.glow, p.seed + (clip === "walk" ? 0 : 7), 2.4, 6, [SPIRIT_GLOW, SPIRIT_CORE, SPIRIT_FUR[1]]);
    if (clip === "cast" && i > 0) motes(pen, { x: 24 + p.head.x, y: 8 + p.head.y }, 3 + i, i * 3, 2.2, 5, [SPIRIT_GLOW, SPIRIT_CORE]);
  });
  return s;
}

// --- Urso Ancestral ---------------------------------------------------------------

interface BearPose {
  dx: number;
  bob: number;
  /** Empinar: gira o corpo em volta do quadril (negativo = de pé nas patas de trás). */
  rot: number;
  hump: number;
  head: Pt;
  headRot: number;
  jaw: number;
  breath: number;
  feet: { nf: Pt; ff: Pt; nh: Pt; fh: Pt };
  ups: { nf: number; ff: number; nh: number; fh: number };
  /** Patas da frente no ar (empinado): posição relativa ao ombro, em vez de pisar. */
  reach?: { nf: Pt; ff: Pt };
  /** Brilho das runas (0..1). */
  rune: number;
}

const BEAR_GROUND = 30.8;

function bearPose(clip: Clip, i: number): BearPose {
  const n = SUMMON_FRAMES[clip];
  const g = BEAR_GROUND;
  const p: BearPose = {
    dx: 0, bob: 0, rot: 0, hump: 0, head: { x: 0, y: 0 }, headRot: 0, jaw: 0, breath: 0,
    feet: { nf: { x: 22.2, y: g }, ff: { x: 21, y: g }, nh: { x: 7.6, y: g }, fh: { x: 9, y: g } },
    ups: { nf: 0, ff: 0, nh: 0, fh: 0 }, rune: 0.4,
  };
  if (clip === "idle") {
    const t = (i / n) * Math.PI * 2;
    p.breath = 0.5 + 0.5 * Math.sin(t);
    p.bob = Math.sin(t) * 0.3;
    // Fareja: a cabeça balança devagar de um lado para o outro.
    p.head = { x: Math.sin(t) * 0.4, y: Math.cos(t) * 0.3 };
    p.headRot = Math.sin(t) * 0.08;
    p.rune = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(t));
  } else if (clip === "walk") {
    // Passo lateral do urso: trás e frente do mesmo lado em sequência, com o corpo rolando e a cabeça baixa balançando.
    const ph = i / n;
    const stride = 5.4;
    const lift = 1.8;
    const nh = stepFoot(ph, 8, g, stride, lift, 0.6);
    const nf = stepFoot(ph + 0.25, 21.6, g, stride, lift, 0.6);
    const fh = stepFoot(ph + 0.5, 9.2, g, stride, lift, 0.6);
    const ff = stepFoot(ph + 0.75, 20.6, g, stride, lift, 0.6);
    p.feet = { nf, ff, nh, fh };
    p.ups = { nf: nf.up, ff: ff.up, nh: nh.up, fh: fh.up };
    p.bob = Math.cos(ph * Math.PI * 4) * 0.4;
    p.hump = Math.sin(ph * Math.PI * 2) * 0.6;
    p.head = { x: 0.4, y: 0.7 + Math.sin(ph * Math.PI * 4 + 1) * 0.5 };
    p.headRot = 0.1 + Math.sin(ph * Math.PI * 2) * 0.06;
    p.rune = 0.5;
  } else if (clip === "attack") {
    // Empina, ergue as garras e despenca com as duas patas sobre o alvo.
    p.rot = [-0.35, -0.62, 0.06, 0.03, 0][i];
    p.dx = [-0.6, -0.8, 1.8, 1.5, 0.6][i];
    p.bob = [0, 0, 0.6, 0.4, 0.1][i];
    p.head = [{ x: 0, y: -0.4 }, { x: 0.4, y: -0.6 }, { x: 0.8, y: 1.2 }, { x: 0.6, y: 0.9 }, { x: 0.2, y: 0.3 }][i];
    p.headRot = [-0.15, -0.3, 0.25, 0.15, 0.05][i];
    p.jaw = [0.5, 0.9, 0.7, 0.3, 0][i];
    p.reach = i < 2 ? [{ nf: { x: 2.6, y: 5.6 }, ff: { x: 1.6, y: 6 } }, { nf: { x: 4.4, y: 3.4 }, ff: { x: 3.4, y: 4 } }][i] : undefined;
    p.feet = [
      { nf: { x: 22, y: g }, ff: { x: 21, y: g }, nh: { x: 7, y: g }, fh: { x: 8.4, y: g } },
      { nf: { x: 22, y: g }, ff: { x: 21, y: g }, nh: { x: 7.6, y: g }, fh: { x: 9, y: g } },
      { nf: { x: 26.4, y: g }, ff: { x: 25, y: g }, nh: { x: 8.4, y: g }, fh: { x: 9.6, y: g } },
      { nf: { x: 26, y: g }, ff: { x: 24.6, y: g }, nh: { x: 8.6, y: g }, fh: { x: 9.6, y: g } },
      { nf: { x: 23.6, y: g }, ff: { x: 22.4, y: g }, nh: { x: 8, y: g }, fh: { x: 9.2, y: g } },
    ][i];
    p.rune = [0.6, 0.9, 1, 0.7, 0.5][i];
  } else {
    // Rugido em pé: empina, abre os braços e as runas acendem.
    const k = [0.5, 1, 1, 1, 0.5][i];
    p.rot = -0.55 * k;
    p.dx = -0.6 * k;
    p.head = { x: 0.2, y: -0.4 * k };
    p.headRot = -0.35 * k;
    p.jaw = [0.4, 1, 1, 0.9, 0.3][i];
    p.breath = 1;
    p.reach = { nf: { x: 4.8 * k + 1, y: 2 + (1 - k) * 4 }, ff: { x: -0.6, y: 5.6 - k } };
    p.rune = [0.6, 1, 1, 1, 0.7][i];
  }
  return p;
}

function drawBear(s: Sheet, clip: Clip, i: number) {
  const pen = new Pen(s, s.w / 34.5, { x: -0.6, y: 1.2 });
  const p = bearPose(clip, i);
  const fur = BEAR_FUR;
  const far = shade(fur);
  const soft = { flat: 0.25 };
  const hip = { x: 8.6, y: 19.6 };
  pen.push(hip, p.rot, { x: p.dx, y: p.bob });

  const shoulder = { x: 20.2, y: 20.8 };
  const reachFoot = (r: Pt) => pen.at(add(shoulder, r));
  const nf = p.reach ? reachFoot(p.reach.nf) : p.feet.nf;
  const ff = p.reach ? reachFoot(p.reach.ff) : p.feet.ff;

  // Patas de longe.
  hindLeg(pen, { root: { x: 7.8, y: 19.6 }, foot: p.feet.fh, up: p.ups.fh }, [4.6, 4, 2.6], [3, 2.2, 1.8], far, shade(far), CLAW, 1.05);
  frontLeg(pen, { root: { x: 19.4, y: 20.4 }, foot: ff, up: p.reach ? 0.7 : p.ups.ff }, [4.6, 4.6], [2.5, 2], far, shade(far), CLAW);

  // Tronco pesado: anca, barriga e o cupim (corcova) dos ombros, que rola no passo.
  const k = 1 + p.breath * 0.05;
  pen.ell({ x: 8.6, y: 18.2 }, 5.4, 5.6, 0, fur, soft);
  pen.ell({ x: 14.4, y: 18.6 }, 9, 5.8 * k, 0, fur, soft);
  pen.ell({ x: 18.6, y: 14.8 + p.hump * 0.4 }, 5.2, 4 + p.hump * 0.2, 0.2, fur, soft);
  pen.ell({ x: 20.8, y: 19.6 }, 4, 4.8 * k, 0.1, fur, soft);
  // Pelagem: mechas escuras no lombo, franja na barriga.
  for (let t = 0; t < 6; t++) {
    const x = 6 + t * 2.6;
    pen.line({ x, y: 14.4 + Math.abs(t - 3) * 0.3 }, { x: x - 0.8, y: 16.8 + Math.abs(t - 3) * 0.3 }, fur[3]);
  }
  fringe(pen, { x: 9, y: 23.4 }, { x: 19, y: 23.8 }, 0, 1.4, fur[3]);
  fringe(pen, { x: 18, y: 23.4 }, { x: 22.6, y: 23.2 }, 0, 1.2, fur[2]);
  // Musgo no lombo e runas ancestrais no ombro, que brilham mais no golpe e no rugido.
  for (const [x, y, r] of [[15, 13.4, 1.6], [17.6, 11.6, 1.8], [12.6, 13.6, 1.2], [20, 11.6, 1.2]] as const) pen.ell({ x, y: y + p.hump * 0.4 }, r * 1.3, r * 0.7, 0, MOSS, { edge: 0.4 });
  pen.dot({ x: 16.4, y: 11.4 + p.hump * 0.4 }, MOSS[0]);
  pen.dot({ x: 18.8, y: 10.4 + p.hump * 0.4 }, MOSS[0]);
  // Marca do espírito do bosque: três garras riscadas no ombro, que brilham mais no golpe e no rugido.
  const rune = p.rune > 0.75 ? RUNE_CORE : RUNE;
  for (let t = 0; t < 3; t++) {
    const top = { x: 16.6 + t * 1.5, y: 15.4 + p.hump * 0.3 };
    pen.line(top, { x: top.x - 1.2, y: top.y + 3.4 }, p.rune > 0.5 ? RUNE : MOSS[2]);
    if (p.rune > 0.6) pen.dot({ x: top.x - 0.6, y: top.y + 1.6 }, rune);
  }
  // Cabeça baixa e larga, focinho claro.
  const H = { x: 25 + p.head.x, y: 17.4 + p.head.y };
  pen.cap({ x: 21, y: 16.4 }, { x: H.x - 1.2, y: H.y - 0.4 }, 3.6, 3, fur, soft);
  pen.push(H, p.headRot);
  pen.ell({ x: H.x - 1.4, y: H.y - 2.8 }, 1.3, 1.2, 0, far);
  pen.ell(H, 3.4, 3, 0.1, fur, soft);
  // Mandíbula: abre girando para baixo, com presas.
  const jp = { x: H.x + 1.2, y: H.y + 1.8 };
  const ja = p.jaw * 0.6;
  if (p.jaw > 0.05) {
    pen.shape([jp, { x: H.x + 5.4, y: H.y + 1.8 }, add(jp, { x: Math.cos(ja) * 4, y: Math.sin(ja) * 4 })], () => MOUTH[2]);
    pen.dot({ x: H.x + 4.8, y: H.y + 2.4 }, FANG);
    pen.dot(add(jp, { x: Math.cos(ja) * 3.4, y: Math.sin(ja) * 3.4 - 0.8 }), FANG);
  }
  pen.push(jp, ja);
  pen.cap(jp, { x: H.x + 4.4, y: H.y + 2.4 }, 1.3, 1, BEAR_MUZZLE);
  pen.pop();
  pen.cap({ x: H.x + 1.4, y: H.y + 0.6 }, { x: H.x + 5, y: H.y + 1.2 }, 2, 1.55, BEAR_MUZZLE, soft);
  pen.ell({ x: H.x + 5.6, y: H.y + 0.8 }, 1, 0.8, 0, ["#4a3a3a", "#2e2424", "#1d1717", "#120e0e", "#0a0808"]);
  pen.dot({ x: H.x + 5.8, y: H.y + 0.4 }, "#8a7a7a");
  // Orelha redonda de perto, olho pequeno aceso de musgo, testa franzida.
  pen.ell({ x: H.x - 0.6, y: H.y - 3 }, 1.4, 1.3, 0, fur);
  pen.dot({ x: H.x - 0.6, y: H.y - 2.9 }, fur[4]);
  const eye = { x: H.x + 1.5, y: H.y - 0.7 };
  pen.line({ x: eye.x - 1.1, y: eye.y - 0.9 }, { x: eye.x + 0.9, y: eye.y - 0.7 }, fur[4]);
  pen.dot(eye, RUNE);
  pen.dot({ x: eye.x + 0.5, y: eye.y }, p.rune > 0.75 ? RUNE_CORE : fur[4]);
  pen.pop();

  // Patas de perto.
  hindLeg(pen, { root: { x: 9, y: 20 }, foot: p.feet.nh, up: p.ups.nh }, [4.6, 4, 2.6], [3.3, 2.4, 2], fur, far, CLAW, 1.05);
  frontLeg(pen, { root: { x: 20.6, y: 21 }, foot: nf, up: p.reach ? 0.7 : p.ups.nf }, [4.6, 4.6], [2.8, 2.2], fur, far, CLAW);
  pen.pop();

  if (p.rune > 0.8) pen.flat(() => motes(pen, { x: 17 + p.dx, y: 12 }, 4, i * 2 + 3, 3, 7, [RUNE, RUNE_CORE, MOSS[0]]));
  return s;
}

// --- Bípedes (Guardião do Bosque e Esqueleto Erguido) ------------------------------

/** Pose do esqueleto de `rig.ts` com os ciclos das invocações (parado e andar mais longos). */
function bipedPose(clip: Clip, i: number, grip: Grip, weight: number, castStyle: "roar" | "raise", attackGrip: Grip = grip) {
  // O golpe e o especial do `rig.ts` têm 4 quadros: o 5º repete a volta à guarda.
  // No ciclo parado, a fase começa fora do pico para nenhum par de quadros cair na mesma pose (o seno é simétrico).
  const frame = clip === "attack" || clip === "cast" ? Math.min(i, 3) : clip === "idle" ? i + 0.25 : i;
  const pose = posed(clip, frame, clip === "attack" ? attackGrip : grip, weight, castStyle, SUMMON_FRAMES[clip]);
  if ((clip === "attack" || clip === "cast") && i === 4) {
    pose.lean *= 0.4;
    pose.dx *= 0.3;
    pose.bob *= 0.3;
    pose.jaw *= 0.3;
  }
  return pose;
}

const TREANT_BUILD: Build = {
  skin: BARK, thigh: 4.2, shin: 3.8, thighR: 2.6, shinR: 2.3, foot: 2.4, torso: 9.4, chestRx: 5.4, chestRy: 6,
  upperArm: 5.4, foreArm: 5, armR: 1.9, foreR: 1.5, handR: 1.2, head: { rx: 3.2, ry: 3, neck: 0.6, dx: 1 }, hunch: 1.4,
};

/** Galho: braço de madeira com nós e três dedos de graveto (um com folha). */
function branchArm(s: Sheet, j: Joints, i: 0 | 1, pal: Pal, leaf: Pal) {
  const arm = j.arms[i];
  const u = j.u;
  capsule(s, arm.shoulder, arm.elbow, 2 * u, 1.6 * u, pal, { flat: 0.2 });
  capsule(s, arm.elbow, arm.hand, 1.6 * u, 1.1 * u, pal, { flat: 0.2 });
  // Nó no cotovelo e um broto saindo do antebraço.
  ellipse(s, arm.elbow, 1.2 * u, 1 * u, 0, pal);
  const mid = lerpPt(arm.elbow, arm.hand, 0.45);
  const sprout = add(mid, dir(arm.foreAngle - 1.6), 2.2 * u);
  stroke(s, mid, sprout, pal[2]);
  ellipse(s, sprout, 1.1 * u, 0.7 * u, 0.6, leaf);
  // Dedos: três gravetos abrindo em leque na direção do antebraço.
  for (const [da, len] of [[-0.55, 3.2], [0, 3.6], [0.5, 2.8]] as const) {
    const a = arm.foreAngle + da;
    const tip = add(arm.hand, dir(a), len * u);
    const knuckle = add(arm.hand, dir(a), len * 0.55 * u);
    stroke(s, arm.hand, knuckle, pal[2]);
    stroke(s, knuckle, add(tip, dir(a + 0.4), 0.3 * u), pal[3]);
  }
}

/** Perna de raiz: tronco grosso e o pé que se abre em três raízes no chão. */
function rootLeg(s: Sheet, j: Joints, i: 0 | 1, pal: Pal) {
  const leg = j.legs[i];
  const u = j.u;
  capsule(s, leg.hip, leg.knee, 2.7 * u, 2.4 * u, pal, { flat: 0.2 });
  capsule(s, leg.knee, leg.ankle, 2.4 * u, 2.6 * u, pal, { flat: 0.2 });
  // Sulcos da casca na canela.
  stroke(s, add(leg.knee, { x: -0.6 * u, y: 0.8 * u }), add(leg.ankle, { x: -0.8 * u, y: -0.6 * u }), pal[3]);
  for (const [dx, dy, r] of [[2.8, 0.9, 1.1], [-2.2, 1, 0.9], [0.6, 1.3, 1]] as const) {
    capsule(s, add(leg.ankle, { x: 0, y: 0.4 * u }), add(leg.ankle, { x: dx * u, y: dy * u }), 1.4 * u, r * u, pal, { flat: 0.3 });
  }
}

function drawTreant(out: Sheet, clip: Clip, i: number) {
  const s = new Shifted(out, -4, -2);
  const b = TREANT_BUILD;
  const pose = bipedPose(clip, i, "fists", 0.85, "raise", "twoHand");
  const j = joints(b, pose, s.w, s.w / 37);
  const u = j.u;
  const bark = BARK;
  const sway = clip === "walk" ? Math.sin((i / SUMMON_FRAMES.walk) * Math.PI * 4) : clip === "idle" ? Math.sin(((i + 0.25) / SUMMON_FRAMES.idle) * Math.PI * 2) * 0.6 : 0;
  // Copa atrás (folhas de trás, mais escuras), balançando contra o passo.
  const crown = add(j.headC, { x: (-1.2 - sway * 0.6 - pose.lean * 3) * u, y: -2.6 * u });
  for (const [dx, dy, rx, ry] of [[-4.6, 1.6, 3.2, 2.8], [3.4, 0.8, 3, 2.6], [-1.2, -1.8, 3.6, 3]] as const) {
    ellipse(s, add(crown, { x: dx * u, y: dy * u }), rx * u, ry * u, 0, shade(LEAF));
  }
  branchArm(s, j, 1, shade(bark), shade(LEAF));
  rootLeg(s, j, 1, shade(bark));
  // Tronco: mais largo no peito, casca com sulcos e um nó oco na barriga.
  capsule(s, j.hip, j.shoulder, 4.3 * u, 4.9 * u, bark, { flat: 0.15 });
  ellipse(s, j.chestC, 5.1 * u, 5.4 * u, j.lean, bark, { flat: 0.15 });
  const spine = { x: Math.sin(j.lean), y: -Math.cos(j.lean) };
  const across = { x: -spine.y, y: spine.x };
  for (const k of [-3, -1.3, 0.6, 2.4]) {
    const a = add(add(j.hip, across, k * u), spine, 0.6 * u);
    const c = add(add(j.shoulder, across, (k * 1.05 + 0.4) * u), spine, -0.4 * u);
    const m = add(lerpPt(a, c, 0.5), across, (k % 2 ? 0.5 : -0.5) * u);
    stroke(s, a, m, bark[3]);
    stroke(s, m, c, bark[3]);
  }
  const knot = add(lerpPt(j.hip, j.chestC, 0.4), across, 1.4 * u);
  ellipse(s, knot, 1.2 * u, 1.5 * u, 0, [bark[3], bark[4], "#1c1209", "#1c1209", "#1c1209"]);
  // Musgo pendurado no ombro e na cintura.
  for (const [p, n] of [[j.shoulder, 4], [j.hip, 3]] as const) {
    for (let t = 0; t < n; t++) {
      const top = add(p, across, (t - n / 2 + 0.5) * 1.5 * u);
      stroke(s, top, add(top, { x: 0, y: (1.6 + (t % 2) * 1.2) * u }), MOSS[t % 2 ? 2 : 1]);
    }
  }
  // Rosto no alto do tronco: sobrancelha de casca, olhos de brasa no oco, boca rachada (abre no golpe).
  const face = add(j.headC, { x: 0.6 * u, y: 1.4 * u });
  ellipse(s, face, 3.4 * u, 3.2 * u, 0, bark, { flat: 0.15 });
  const hollow: Pal = ["#2a1a0e", "#22150b", "#1a1008", "#140c06", "#0e0804"];
  const eyeA = add(face, { x: 0.2 * u, y: -0.6 * u });
  const eyeB = add(face, { x: 2.4 * u, y: -0.4 * u });
  for (const e of [eyeA, eyeB]) {
    ellipse(s, e, 0.9 * u, 0.8 * u, 0, hollow, { edge: 0 });
    s.set(e.x, e.y, EMBER);
  }
  if (clip === "attack" || clip === "cast") s.set(eyeB.x + 1, eyeB.y, "#fff6c0");
  stroke(s, add(eyeA, { x: -1.2 * u, y: -1.2 * u }), add(eyeB, { x: 1 * u, y: -1.1 * u }), bark[4]);
  const mouth = add(face, { x: 1.2 * u, y: 1.6 * u });
  if (pose.jaw > 0.1) ellipse(s, mouth, 1.3 * u, (0.4 + pose.jaw * 0.8) * u, 0, hollow, { edge: 0 });
  else stroke(s, add(mouth, { x: -1.2 * u, y: 0 }), add(mouth, { x: 1.2 * u, y: 0.3 * u }), bark[4]);
  // Copa da frente: folhas claras, flores e um passarinho de luz no alto.
  for (const [dx, dy, rx, ry] of [[-2.8, -0.4, 3.4, 2.8], [1.4, -1.2, 3.6, 3], [0.2, -3.6, 3, 2.4], [-5, -2.2, 2.2, 2]] as const) {
    ellipse(s, add(crown, { x: (dx + sway * 0.3) * u, y: dy * u }), rx * u, ry * u, 0.2, LEAF);
  }
  for (const [dx, dy] of [[-3.4, -2.2], [2.2, -3.2], [-0.6, -5.2], [3.8, -0.8]] as const) {
    const f = add(crown, { x: (dx + sway * 0.3) * u, y: dy * u });
    s.set(f.x, f.y, BLOSSOM);
  }
  rootLeg(s, j, 0, bark);
  branchArm(s, j, 0, bark, LEAF);
  // Especial: folhas e luz subindo em volta.
  if (clip === "cast") {
    const pen = new Pen(s, u);
    pen.flat(() => motes(pen, { x: j.chestC.x / u, y: j.chestC.y / u + 4 }, 4 + i, i * 5, 6, 12, [LEAF[0], EMBER, LEAF[1]]));
  }
  return out;
}

const SKELETON_BUILD: Build = {
  skin: BONE, thigh: 5, shin: 5, thighR: 1, shinR: 0.9, foot: 2.1, torso: 7.6, chestRx: 4.2, chestRy: 3.8,
  upperArm: 4.6, foreArm: 4.2, armR: 0.95, foreR: 0.85, handR: 1, head: { rx: 3, ry: 2.9, neck: 2.4, dx: 0.8 }, hunch: 0.6,
};

function boneArm(s: Sheet, j: Joints, i: 0 | 1, pal: Pal) {
  const a = j.arms[i];
  const u = j.u;
  // Úmero fino (1 px): o peito aparece atrás dele.
  stroke(s, a.shoulder, a.elbow, pal[1]);
  ellipse(s, a.shoulder, 0.7 * u, 0.7 * u, 0, pal);
  // Rádio e ulna: dois ossos finos lado a lado.
  const off = add({ x: 0, y: 0 }, dir(a.foreAngle + Math.PI / 2), 0.5 * u);
  stroke(s, add(a.elbow, off), add(a.hand, off), pal[1]);
  stroke(s, add(a.elbow, off, -1), add(a.hand, off, -1), pal[2]);
  ellipse(s, a.elbow, 0.8 * u, 0.8 * u, 0, pal);
  ellipse(s, a.hand, 0.8 * u, 0.6 * u, a.foreAngle, pal);
}

function boneLeg(s: Sheet, j: Joints, i: 0 | 1, pal: Pal) {
  const l = j.legs[i];
  const u = j.u;
  capsule(s, l.hip, l.knee, 0.75 * u, 0.6 * u, pal, { edge: 0.3 });
  capsule(s, l.knee, l.ankle, 0.55 * u, 0.5 * u, pal, { edge: 0.3 });
  ellipse(s, l.knee, 0.9 * u, 0.85 * u, 0, pal);
  // Pé de ossinhos: calcanhar e dedos.
  capsule(s, add(l.ankle, { x: -0.5 * u, y: 0.3 * u }), l.toe, 0.8 * u, 0.5 * u, pal, { flat: 0.3, edge: 0.3 });
}

/** Espada curta enferrujada. */
function rustySword(s: Sheet, hand: Pt, a: number, u: number) {
  const d = dir(a);
  const n = { x: d.y, y: -d.x };
  capsule(s, add(hand, d, -1.2 * u), add(hand, d, 0.8 * u), 0.5 * u, 0.5 * u, HILT, { edge: 0.3 });
  stroke(s, add(add(hand, d, 0.9 * u), n, -1.5 * u), add(add(hand, d, 0.9 * u), n, 1.5 * u), RUST[3]);
  poly(s, [add(add(hand, d, 1.2 * u), n, 0.75 * u), add(hand, d, 7.2 * u), add(add(hand, d, 1.2 * u), n, -0.75 * u)],
    (x, y) => ((x * 7 + y * 3) % 9 === 0 ? "#9a5a2a" : (x + y) % 2 ? RUST[1] : RUST[2]));
  stroke(s, add(hand, d, 1.4 * u), add(hand, d, 6.4 * u), RUST[0]);
}

function drawSkeleton(out: Sheet, clip: Clip, i: number) {
  const s = new Shifted(out, -5, 0);
  const b = SKELETON_BUILD;
  const pose = bipedPose(clip, i, "oneHand", 0, "raise");
  const j = joints(b, pose, s.w, s.w / 34.5);
  const u = j.u;
  const far = shade(shade(BONE));
  boneArm(s, j, 1, far);
  boneLeg(s, j, 1, far);
  // Coluna fina (vértebras separadas), bacia e costelas com vão entre elas: o fundo aparece por dentro do peito.
  const spine = { x: Math.sin(j.lean), y: -Math.cos(j.lean) };
  const across = { x: -spine.y, y: spine.x };
  const back = (p: Pt) => add(p, across, -0.9 * u);
  stroke(s, back(j.hip), back(j.neck), BONE[3]);
  for (let k = 0; k <= 4; k++) s.set(back(lerpPt(j.hip, j.neck, k / 4)).x, back(lerpPt(j.hip, j.neck, k / 4)).y, BONE[1]);
  // Oco do peito, escuro, por trás das costelas.
  ellipse(s, add(lerpPt(j.chestC, j.shoulder, 0.45), across, 1.6 * u), 3.4 * u, 3.6 * u, j.lean, ["#3a342a", "#2e2920", "#231f18", "#1a1712", "#12100c"], { edge: 0, flat: 0.6 });
  // Bacia: asa do ilíaco e o buraco no meio.
  const pelvis = add(j.hip, spine, 0.4 * u);
  ellipse(s, pelvis, 2 * u, 1.2 * u, j.lean - 0.3, BONE, { edge: 0.4 });
  s.set(pelvis.x + 0.4 * u, pelvis.y + 0.2 * u, "#2a2a1e");
  for (let r = 0; r < 4; r++) {
    const t = 1.05 - r * 0.42;
    const root = back(lerpPt(j.chestC, j.shoulder, t));
    const w = (5 - Math.abs(r - 1) * 0.5) * u;
    const front = add(add(root, across, w), spine, -1.4 * u);
    const mid = add(add(root, across, w * 0.55), spine, 0.4 * u);
    stroke(s, root, mid, BONE[1]);
    stroke(s, mid, front, BONE[2]);
  }
  // Esterno ligando a ponta das costelas.
  stroke(s, add(add(lerpPt(j.chestC, j.shoulder, 0.95), across, 3.4 * u), spine, -1.2 * u), add(add(lerpPt(j.chestC, j.shoulder, 0.1), across, 3.6 * u), spine, -1.2 * u), BONE[0]);
  // Clavícula.
  stroke(s, back(j.shoulder), add(j.shoulder, across, 1.6 * u), BONE[1]);
  // Trapo puído preso por um cipó (erguido pelo Druida: o mato cresceu nele).
  poly(s, [add(pelvis, { x: -1.8 * u, y: 0.2 * u }), add(pelvis, { x: 1.8 * u, y: 0.2 * u }), add(pelvis, { x: 1.2 * u + pose.dx * u * 0.3, y: 3 * u }), add(pelvis, { x: 0.1 * u, y: 2.2 * u }), add(pelvis, { x: -1.3 * u, y: 3.2 * u })],
    (x, y) => ((x + y * 2) % 5 === 0 ? RAG[4] : RAG[3]));
  stroke(s, add(pelvis, { x: -2 * u, y: 0 }), add(pelvis, { x: 2 * u, y: 0.2 * u }), MOSS[1]);
  // Crânio: caixa, maxilar (abre no golpe), órbita funda com brilho verde.
  const c = j.headC;
  stroke(s, j.neck, c, BONE[2]);
  ellipse(s, c, 2.7 * u, 2.4 * u, 0.1, BONE);
  // Face: o osso do rosto avança um pouco e o maxilar fica separado por uma fresta escura.
  ellipse(s, add(c, { x: 1.4 * u, y: 0.9 * u }), 1.5 * u, 1.2 * u, 0, BONE);
  const jaw = add(c, { x: 1.3 * u, y: (2.5 + pose.jaw * 1.3) * u });
  stroke(s, add(c, { x: 0.2 * u, y: 2 * u }), add(c, { x: 2.8 * u, y: 1.9 * u }), "#2a2a1e");
  capsule(s, add(jaw, { x: -1.5 * u, y: -0.4 * u }), add(jaw, { x: 1.3 * u, y: 0 }), 0.7 * u, 0.6 * u, BONE, { edge: 0.3 });
  for (let t = 0; t < 3; t++) s.set(c.x + (0.8 + t) * u, c.y + 1.6 * u, t % 2 ? BONE[3] : BONE[0]);
  const eye = add(c, { x: 1.1 * u, y: -0.3 * u });
  ellipse(s, eye, 1.15 * u, 1.1 * u, 0, ["#2a2a1e", "#1e1e16", "#14140e", "#0c0c08", "#0c0c08"], { edge: 0 });
  s.set(eye.x, eye.y, NECRO_GLOW);
  if (clip === "attack" || clip === "cast") s.set(eye.x + 1, eye.y, "#eaffd8");
  s.set(c.x + 2.6 * u, c.y + 0.6 * u, BONE[4]);
  // Raminho brotando do crânio.
  const top = add(c, { x: -0.8 * u, y: -2.6 * u });
  stroke(s, top, add(top, { x: -0.8 * u, y: -1.6 * u }), MOSS[2]);
  s.set(top.x - 1.4 * u, top.y - 1.8 * u, MOSS[0]);
  boneLeg(s, j, 0, BONE);
  boneArm(s, j, 0, BONE);
  rustySword(s, j.arms[0].hand, weaponAngle(j, 0, "oneHand", clip, Math.min(i, 3)), u);
  ellipse(s, j.arms[0].hand, 1 * u, 0.8 * u, 0, BONE);
  return out;
}

// --- Voadores ----------------------------------------------------------------------

/**
 * Asa de ave vista de lado: a borda da frente (ombro → cotovelo → pulso → ponta) e as penas atrás dela. `lift` vai de
 * -1 (asa toda para baixo) a 1 (toda para cima); perto de 0 a asa aponta para quem olha e fica curta. `fold` dobra a
 * mão para trás (subida da asa, mergulho). As primárias saem separadas na ponta, como dedos.
 */
function birdWing(pen: Pen, shoulder: Pt, lift: number, fold: number, span: number, pal: Pal, cover: Pal, tip: Pal) {
  const up = lift >= 0 ? -1 : 1;
  const reach = 0.28 + 0.72 * Math.abs(lift);
  // Ângulos (0 = para a frente, 90° = para baixo): a asa sai para cima ou para baixo, varrida para trás.
  const deg = Math.PI / 180;
  const a1 = (up < 0 ? -112 : 108) * deg;
  const a2 = a1 + (up < 0 ? -1 : 1) * (14 + fold * 30) * deg;
  const a3 = a2 + (up < 0 ? -1 : 1) * (12 + fold * 40) * deg;
  const L = span * reach;
  const elbow = add(shoulder, { x: Math.cos(a1), y: Math.sin(a1) }, L * 0.32);
  const wrist = add(elbow, { x: Math.cos(a2), y: Math.sin(a2) }, L * 0.3);
  const tipP = add(wrist, { x: Math.cos(a3), y: Math.sin(a3) }, L * 0.38);
  // Penas: a borda de trás corre paralela à da frente, puxada para a cauda.
  const back = (p: Pt, k: number) => ({ x: p.x - k, y: p.y + up * k * 0.15 });
  const feather = 4.6 + reach * 2.2;
  pen.shape([shoulder, elbow, wrist, tipP, back(tipP, 1.2), back(wrist, feather), back(elbow, feather * 0.95), back(shoulder, feather * 0.7)],
    (x, y) => ((x * 2 + y) % 5 === 0 ? pal[3] : pal[2]));
  // Coberteiras: faixa clara junto da borda da frente.
  pen.cap(shoulder, elbow, 1.4, 1.2, cover, { edge: 0.4 });
  pen.cap(elbow, wrist, 1.2, 0.9, cover, { edge: 0.4 });
  // Primárias separadas: cinco penas em leque na ponta, as de trás mais curtas.
  for (let k = 0; k < 5; k++) {
    const base = lerpPt(wrist, tipP, 0.35 + k * 0.12);
    const a = Math.atan2(tipP.y - wrist.y, tipP.x - wrist.x) - up * k * 0.08 + Math.PI * 0.06 * k * (up < 0 ? 1 : -1);
    const end = add(base, { x: Math.cos(a) - 0.5, y: Math.sin(a) }, (2.2 + k * 0.5) * (0.5 + reach * 0.5));
    pen.cap(back(base, 0.6 + k * 0.5), end, 0.7, 0.4, tip, { edge: 0.3, flat: 0.3 });
  }
  // Secundárias: riscos das penas na borda de trás.
  for (let k = 1; k <= 4; k++) {
    const a = lerpPt(shoulder, wrist, k / 5);
    pen.line(back(a, feather * 0.45), back(a, feather * 0.95), pal[4]);
  }
}

interface EaglePose {
  dx: number;
  dy: number;
  pitch: number;
  lift: number;
  fold: number;
  /** Pernas: 0 = penduradas, 1 = recolhidas para trás, -1 = garras lançadas para a frente. */
  legs: number;
  beak: number;
  head: number;
  tail: number;
}

function eaglePose(clip: Clip, i: number): EaglePose {
  const n = SUMMON_FRAMES[clip];
  const p: EaglePose = { dx: 0, dy: 0, pitch: 0, lift: 0, fold: 0, legs: 0, beak: 0, head: 0, tail: 0 };
  if (clip === "idle" || clip === "walk") {
    // Batida: desce forte (asa aberta) e sobe dobrada. O corpo sobe quando a asa desce.
    const t = (i / n) * Math.PI * 2;
    p.lift = Math.cos(t);
    p.fold = Math.max(0, Math.sin(t)) * 0.8;
    p.dy = Math.cos(t) * 0.7;
    p.pitch = clip === "walk" ? 0.12 : -0.04;
    p.legs = clip === "walk" ? 1 : 0.15;
    p.head = Math.sin(t + 1) * 0.06;
    p.tail = Math.sin(t) * 0.1;
  } else if (clip === "attack") {
    // Ergue as asas, mergulha com as garras para a frente, crava e bate de volta.
    p.lift = [1, 0.75, -0.4, -0.75, 0.3][i];
    p.fold = [0.1, 0.9, 0.2, 0, 0.4][i];
    p.dx = [-1, 1.6, 2.6, 2, 0.6][i];
    p.dy = [-1.2, 0.6, 1.4, 0.8, 0][i];
    p.pitch = [-0.3, 0.25, -0.1, -0.15, 0][i];
    p.legs = [0, -0.6, -1, -0.8, 0][i];
    p.beak = [0.6, 0.3, 0.9, 0.4, 0][i];
    p.tail = [0.3, -0.2, 0.2, 0.1, 0][i];
  } else {
    // Grito: asas abertas para cima, cabeça erguida, bico aberto, cauda em leque.
    const k = [0.5, 1, 1, 1, 0.5][i];
    p.lift = 0.6 + 0.4 * k;
    p.fold = 0;
    p.pitch = -0.18 * k;
    p.dy = -0.8 * k;
    p.head = -0.35 * k;
    p.beak = [0.3, 1, 1, 0.8, 0.2][i];
    p.tail = 0.35 * k;
  }
  return p;
}

function drawEagle(s: Sheet, clip: Clip, i: number) {
  const pen = new Pen(s, s.w / 38, { x: 3.4, y: 3.6 });
  const p = eaglePose(clip, i);
  const B = { x: 15, y: 17 };
  pen.push(B, p.pitch, { x: p.dx, y: p.dy });
  const shoulder = { x: 17, y: 14.6 };
  // Asa de longe, atrás e mais escura.
  birdWing(pen, { x: shoulder.x - 1, y: shoulder.y - 0.6 }, p.lift * 0.92, p.fold, 16, shade(EAGLE_DARK), shade(EAGLE_BROWN), shade(EAGLE_DARK));
  // Cauda branca em leque.
  const tb = { x: 9.4, y: 17.6 };
  for (let k = -2; k <= 2; k++) {
    const a = Math.PI - 0.18 + k * (0.12 + p.tail * 0.12);
    pen.cap(tb, add(tb, { x: Math.cos(a), y: Math.sin(a) }, 6.2 - Math.abs(k) * 0.5), 1.2, 0.9, EAGLE_WHITE, { edge: 0.3, flat: 0.3 });
  }
  // Pernas: calça de penas, tarso amarelo e garras curvas.
  const legRoot = { x: 15.6, y: 19.4 };
  const foot = p.legs >= 0
    ? lerpPt({ x: 16.6, y: 25.6 }, { x: 11.4, y: 22.4 }, p.legs)
    : lerpPt({ x: 16.6, y: 25.6 }, { x: 23.2, y: 22.8 }, -p.legs);
  for (const side of [1, 0]) {
    const off = side ? { x: -0.8, y: -0.3 } : { x: 0, y: 0 };
    const r = add(legRoot, off);
    const f = add(foot, off);
    const pal = side ? shade(TALON) : TALON;
    pen.ell(add(r, { x: 0.3, y: 1 }), 1.8, 2.2, 0.3, side ? shade(EAGLE_BROWN) : EAGLE_BROWN, { flat: 0.3 });
    pen.cap(add(r, { x: 0.3, y: 2.4 }), f, 0.8, 0.7, pal, { edge: 0.3 });
    // Garras: abertas no golpe, fechadas no voo.
    const open = p.legs < 0 ? 1 : 0.3;
    for (const [a, l] of [[0.2, 2], [-0.6, 1.8], [1.8, 1.4]] as const) {
      const ang = a * open + (p.legs < 0 ? -0.8 : 0.2);
      const t = add(f, { x: Math.cos(ang), y: Math.sin(ang) }, l);
      pen.line(f, t, pal[2]);
      pen.dot(add(t, { x: 0, y: 0.6 }), "#2a1d10");
    }
  }
  // Corpo: costas marrons, peito com penas escamadas.
  pen.ell(B, 6.6, 4, -0.12, EAGLE_BROWN, { flat: 0.2 });
  pen.ell({ x: 17.4, y: 18.4 }, 3.6, 3.4, 0.3, EAGLE_BROWN);
  for (let k = 0; k < 9; k++) {
    const q = { x: 12 + (k % 5) * 1.6 + (k > 4 ? 0.8 : 0), y: 17.2 + (k > 4 ? 1.6 : 0) };
    pen.dot(q, EAGLE_BROWN[0]);
    pen.dot({ x: q.x + 0.6, y: q.y + 0.6 }, EAGLE_BROWN[3]);
  }
  // Cabeça branca, nuca de penas, sobrancelha que dá a cara brava, bico curvo amarelo.
  const H = { x: 21.4, y: 12.4 };
  pen.push({ x: 19, y: 14.6 }, p.head);
  pen.cap({ x: 18.2, y: 15.6 }, H, 2.8, 2.5, EAGLE_WHITE);
  pen.shape([{ x: 18.6, y: 13.8 }, { x: 16.2, y: 14.8 }, { x: 18.4, y: 15.8 }], () => EAGLE_WHITE[2]);
  pen.ell(H, 2.8, 2.5, 0, EAGLE_WHITE);
  const bk = { x: H.x + 2.1, y: H.y + 0.2 };
  pen.cap({ x: bk.x - 0.6, y: bk.y }, { x: bk.x + 1.6, y: bk.y + 0.1 }, 1.2, 0.8, TALON);
  pen.push(bk, p.beak * 0.45);
  pen.line({ x: bk.x, y: bk.y + 1 }, { x: bk.x + 1.4, y: bk.y + 1.1 }, TALON[2]);
  pen.pop();
  if (p.beak > 0.2) pen.line({ x: bk.x + 0.2, y: bk.y + 0.9 }, { x: bk.x + 1, y: bk.y + 0.9 + p.beak }, MOUTH[2]);
  // Gancho da ponta do bico.
  pen.dot({ x: bk.x + 2.2, y: bk.y + 0.8 }, TALON[3]);
  pen.dot({ x: bk.x + 2.1, y: bk.y + 1.4 }, "#3a2410");
  pen.dot({ x: bk.x - 0.6, y: bk.y - 0.4 }, TALON[0]);
  const eye = { x: H.x + 0.9, y: H.y - 0.4 };
  pen.line({ x: eye.x - 1.2, y: eye.y - 1 }, { x: eye.x + 1.2, y: eye.y - 0.4 }, EAGLE_WHITE[4]);
  pen.dot(eye, "#1b1410");
  pen.dot({ x: eye.x - 0.6, y: eye.y }, "#e8a020");
  pen.pop();
  // Asa de perto, por cima de tudo.
  birdWing(pen, shoulder, p.lift, p.fold, 17.5, EAGLE_DARK, EAGLE_BROWN, EAGLE_DARK);
  pen.pop();
  return s;
}

/** Asa de inseto translúcida: elipse comprida que sai do ombro, com nervura clara. */
function glassWing(pen: Pen, root: Pt, angle: number, len: number, width: number, alpha: number) {
  const c = add(root, { x: Math.cos(angle), y: Math.sin(angle) }, len / 2);
  const inside = pen.insideEllipse(c, len / 2, width, angle);
  const P0 = pen.px(c);
  const R = len / 2 * pen.u + 1;
  for (let y = Math.floor(P0.y - R); y <= P0.y + R; y++)
    for (let x = Math.floor(P0.x - R); x <= P0.x + R; x++) {
      if (!inside(x, y)) continue;
      glassPixel(pen.s, x, y, [200, 228, 255], alpha);
    }
  // Nervura da frente, clara (só na asa nítida; o borrão fica sem).
  if (alpha > 0.2) {
    const a = pen.px(root);
    const b = pen.px(add(root, { x: Math.cos(angle), y: Math.sin(angle) }, len * 0.85));
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let k = 0; k <= steps; k++) glassPixel(pen.s, a.x + (b.x - a.x) * (k / steps), a.y + (b.y - a.y) * (k / steps), [255, 255, 255], 0.55);
  }
}

function hornetPose(clip: Clip, i: number) {
  const n = SUMMON_FRAMES[clip];
  // As asas batem a cada quadro (em cima / embaixo), mais o borrão do quadro anterior.
  const p = { dx: 0, dy: 0, pitch: 0, curl: 0, wing: i % 2, legSwing: Math.sin((i / n) * Math.PI * 2), sting: 0, antenna: Math.sin((i / n) * Math.PI * 4) * 0.2 };
  if (clip === "walk") p.pitch = 0.18;
  if (clip === "idle") p.dy = Math.sin((i / n) * Math.PI * 2) * 0.5;
  if (clip === "attack" || clip === "cast") {
    // Dobra o abdômen para baixo do corpo e crava o ferrão para a frente.
    p.curl = [0.4, 1, 1.2, 0.9, 0.3][i];
    p.dx = [-0.8, 0.6, 2, 1.4, 0.4][i];
    p.pitch = [-0.15, -0.05, 0.1, 0.05, 0][i];
    p.sting = i === 2 ? 1 : 0;
  }
  return p;
}

function drawHornet(s: Sheet, clip: Clip, i: number) {
  const pen = new Pen(s, s.w / 32, { x: 0, y: -2 });
  const p = hornetPose(clip, i);
  const T = { x: 17, y: 15 };
  pen.push(T, p.pitch, { x: p.dx, y: p.dy });
  // Asas de trás (par de longe): borrão do quadro anterior.
  const wingUp = -2.0;
  const wingDown = -3.05;
  const wa = p.wing ? wingUp : wingDown;
  const wb = p.wing ? wingDown : wingUp;
  glassWing(pen, { x: T.x - 0.6, y: T.y - 2.2 }, wb + 0.25, 9, 1.6, 0.12);
  glassWing(pen, { x: T.x - 0.6, y: T.y - 2.2 }, wa + 0.25, 9, 1.8, 0.3);
  // Pernas de longe.
  const legs = (pal: Pal, side: number) => {
    for (let k = 0; k < 3; k++) {
      const root = { x: T.x - 1.4 + k * 1.5 + side * -0.5, y: T.y + 2 };
      const swing = p.legSwing * (k % 2 ? 1 : -1) * 0.25;
      const knee = add(root, dir(0.5 - k * 0.45 + swing + (clip === "walk" ? -0.6 : 0)), 2.6);
      const foot = add(knee, dir(-0.3 - k * 0.35 + swing * 1.5 + (clip === "walk" ? -0.6 : 0)), 3);
      pen.line(root, knee, pal[2]);
      pen.line(knee, foot, pal[1]);
      pen.dot(foot, pal[3]);
    }
  };
  legs(shade(HORNET_LEG), 1);
  // Abdômen listrado (gira no pecíolo para dar a ferroada).
  const pet = { x: T.x - 3, y: T.y + 0.8 };
  pen.push(pet, -p.curl);
  const A = { x: pet.x - 5.4, y: pet.y + 2.2 };
  const rot = 0.38;
  pen.ell(A, 5.6, 3.4, rot, HORNET_YELLOW);
  const inA = pen.insideEllipse(A, 5.6, 3.4, rot);
  const C = pen.px(A);
  const ax = Math.cos(rot + pen.rot);
  const ay = Math.sin(rot + pen.rot);
  const band = (x: number, y: number) => inA(x, y) && Math.floor(((x + 0.5 - C.x) * ax + (y + 0.5 - C.y) * ay) / (1.7 * pen.u) + 10) % 2 === 0;
  pen.ell(A, 5.6, 3.4, rot, HORNET_BLACK, { clip: band, edge: 0 });
  // Ferrão.
  const tail = add(A, { x: -Math.cos(rot), y: -Math.sin(rot) }, 5.4);
  const stingTip = add(tail, { x: -Math.cos(rot), y: -Math.sin(rot) }, 2.2 + p.sting * 1.2);
  pen.line(tail, stingTip, "#1a1410");
  if (p.sting) {
    pen.dot(stingTip, "#c8ff6a");
    pen.dot(add(stingTip, { x: 0, y: 1 }), "#9dff6a");
  }
  pen.pop();
  pen.cap({ x: T.x - 1.8, y: T.y + 0.4 }, pet, 1, 0.6, HORNET_BLACK);
  // Tórax peludo com manchas amarelas nos ombros.
  pen.ell(T, 3.3, 2.9, 0, HORNET_BLACK);
  pen.ell({ x: T.x + 0.6, y: T.y - 1.4 }, 1.4, 0.8, 0.2, HORNET_YELLOW, { edge: 0 });
  pen.dot({ x: T.x - 1.6, y: T.y + 0.4 }, HORNET_YELLOW[2]);
  // Cabeça: rosto amarelo, olho composto grande, mandíbulas, antenas com cotovelo.
  const H = { x: T.x + 4.2, y: T.y + 0.4 };
  pen.ell(H, 2.3, 2.6, 0.2, HORNET_YELLOW);
  pen.ell({ x: H.x - 0.3, y: H.y - 0.4 }, 1.3, 2, 0.2, ["#8a3a2a", "#5a1e14", "#3a120c", "#240a06", "#140604"], { edge: 0 });
  pen.dot({ x: H.x - 0.6, y: H.y - 1.4 }, "#ffd0b0");
  pen.line({ x: H.x + 1.2, y: H.y + 1.8 }, { x: H.x + 2.4, y: H.y + 2.6 }, "#3a2410");
  pen.line({ x: H.x + 0.6, y: H.y + 2.2 }, { x: H.x + 1.6, y: H.y + 3 }, "#3a2410");
  for (const off of [0, -0.8]) {
    const base = { x: H.x + 0.6 + off, y: H.y - 2.2 };
    const elbow = add(base, dir(Math.PI - 0.2 + p.antenna), 2.6);
    const tip = add(elbow, dir(Math.PI * 0.62 + p.antenna * 1.5), 2.8);
    pen.line(base, elbow, off ? "#2a1e14" : "#1a1410");
    pen.line(elbow, tip, off ? "#2a1e14" : "#1a1410");
  }
  legs(HORNET_LEG, 0);
  // Asas de perto.
  glassWing(pen, { x: T.x, y: T.y - 2.4 }, wb, 10, 1.8, 0.14);
  glassWing(pen, { x: T.x, y: T.y - 2.4 }, wa, 10, 2, 0.38);
  pen.pop();
  return s;
}

/** Mariposa vista de frente: asas que abrem e fecham (escala no eixo x), com olhos nas asas e pó de luz que cura. */
function drawMoth(s: Sheet, clip: Clip, i: number) {
  const pen = new Pen(s, s.w / 32, { x: 0, y: -2 });
  const n = SUMMON_FRAMES[clip];
  const t = (i / n) * Math.PI * 2;
  let open = clip === "attack" || clip === "cast" ? [0.75, 1, 1, 1, 0.85][i] : 0.55 + 0.45 * (0.5 + 0.5 * Math.cos(t));
  if (clip === "walk") open = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(t));
  const bob = clip === "idle" || clip === "walk" ? -Math.cos(t) * 0.8 : -0.5;
  const glow = clip === "attack" || clip === "cast";
  const cx = 16;
  const cy = 17 + bob;
  // Forma da asa (lado esquerdo, em coordenadas de asa aberta): anterior e posterior.
  const fore: Pt[] = [{ x: -0.6, y: -2.8 }, { x: -6.4, y: -9.4 }, { x: -12.6, y: -9.2 }, { x: -13.4, y: -5 }, { x: -10, y: -0.2 }, { x: -1, y: 0.4 }];
  const hind: Pt[] = [{ x: -0.8, y: 0 }, { x: -8.4, y: 0.4 }, { x: -10.2, y: 5 }, { x: -7.4, y: 9 }, { x: -3.4, y: 8.4 }, { x: -0.6, y: 3.6 }];
  const inside = (pts: Pt[], x: number, y: number) => {
    let ins = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const A = pts[a];
      const B = pts[b];
      if ((A.y > y) !== (B.y > y) && x < ((B.x - A.x) * (y - A.y)) / (B.y - A.y) + A.x) ins = !ins;
    }
    return ins;
  };
  const edgeDist = (pts: Pt[], x: number, y: number) => {
    let d = Infinity;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const A = pts[a];
      const B = pts[b];
      const vx = B.x - A.x;
      const vy = B.y - A.y;
      const k = Math.max(0, Math.min(1, ((x - A.x) * vx + (y - A.y) * vy) / (vx * vx + vy * vy)));
      d = Math.min(d, Math.hypot(x - A.x - vx * k, y - A.y - vy * k));
    }
    return d;
  };
  const cream = ["#fff8e6", "#f6e3bc", "#e7c995", "#c9a574"];
  const lilac = ["#e9d8ff", "#c8a8f0", "#9c78cf", "#6e4e9e"];
  const wingColor = (pts: Pt[], wx: number, wy: number, spot: Pt, shadeK: number) => {
    if (!inside(pts, wx, wy)) return null;
    const e = edgeDist(pts, wx, wy);
    const ds = Math.hypot(wx - spot.x, wy - spot.y);
    const lit = (wx + wy) * -0.04 + shadeK;
    if (ds < 0.8) return "#ffffff";
    if (ds < 1.6) return glow ? "#d9ff9a" : "#7ad06a";
    if (ds < 2.3) return "#3b2a4a";
    if (e < 0.75) return lilac[lit > 0.3 ? 1 : 2];
    if (e < 1.3) return lilac[0];
    // Veias finas saindo da raiz.
    const ang = Math.atan2(wy, wx);
    if (Math.abs(((ang * 5) % 1 + 1) % 1 - 0.5) < 0.05 && e > 2) return cream[3];
    return cream[lit > 0.5 ? 0 : lit > 0.1 ? 1 : 2];
  };
  const shadeK = 0.2 + open * 0.4;
  // Pinta cada lado: o pixel volta para o espaço da asa aberta (x dividido pela abertura).
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const ux = (x + 0.5) / pen.u - pen.base.x - cx;
      const uy = (y + 0.5) / pen.u - pen.base.y - cy;
      const side = ux < 0 ? 1 : -1;
      const wx = -Math.abs(ux) / open;
      // A ponta sobe quando a asa fecha.
      const wy = uy + (1 - open) * Math.abs(wx) * 0.35;
      const c = wingColor(fore, wx, wy, { x: -8.4, y: -4.8 }, shadeK) ?? wingColor(hind, wx, wy, { x: -5.8, y: 4.6 }, shadeK - 0.2);
      if (c) s.set(x, y, side > 0 ? c : c);
    }
  // Corpo felpudo: tórax, abdômen em anéis, cabeça com olhos grandes.
  pen.ell({ x: cx, y: cy - 0.4 }, 2.2, 2.7, 0, MOTH_BODY, { flat: 0.2 });
  pen.ell({ x: cx, y: cy + 4 }, 1.7, 3.2, 0, MOTH_BODY);
  for (let k = 0; k < 3; k++) pen.line({ x: cx - 1.2, y: cy + 3 + k * 1.3 }, { x: cx + 1.2, y: cy + 3 + k * 1.3 }, MOTH_BODY[3]);
  pen.ell({ x: cx, y: cy - 3.6 }, 2.4, 1.3, 0, MOTH_BODY, { flat: 0.5 });
  pen.ell({ x: cx, y: cy - 4.6 }, 1.8, 1.5, 0, MOTH_BODY);
  for (const sx of [-1, 1]) {
    pen.dot({ x: cx + sx * 1.1, y: cy - 4.6 }, MOTH_EYE);
    pen.dot({ x: cx + sx * 1.1, y: cy - 5.2 }, "#9a86b8");
    // Antena de pena: haste curva e as barbas.
    const base = { x: cx + sx * 0.6, y: cy - 6 };
    const sway = Math.sin(t) * 0.25;
    for (let k = 1; k <= 5; k++) {
      const a = { x: base.x + sx * k * 0.8, y: base.y - k * 0.9 + k * k * 0.05 + sway * k * 0.1 };
      pen.dot(a, MOTH_BODY[2]);
      if (k > 1 && k < 5) {
        pen.dot({ x: a.x + sx * 0.6, y: a.y + 0.4 }, MOTH_BODY[1]);
        pen.dot({ x: a.x - sx * 0.4, y: a.y - 0.6 }, MOTH_BODY[1]);
      }
    }
    // Perninhas penduradas.
    for (let k = 0; k < 2; k++) {
      const r = { x: cx + sx * 1.2, y: cy + 0.6 + k * 1.2 };
      pen.line(r, { x: r.x + sx * 1.4, y: r.y + 1.8 + Math.sin(t + k) * 0.4 }, MOTH_BODY[3]);
    }
  }
  // Pó de luz caindo das asas (cura); no especial, um anel de brilho.
  pen.flat(() => {
    for (let k = 0; k < 5; k++) {
      const ph = ((i / n) + k * 0.23) % 1;
      const x = cx + (k % 2 ? -1 : 1) * (3 + k * 1.6) * (0.6 + open * 0.4);
      pen.dot({ x, y: cy + 3 + ph * 9 }, ph > 0.6 ? "#b8ff8a" : "#eaffc8");
    }
    if (glow) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 + i * 0.3;
        const r = 9 + i * 0.6;
        pen.dot({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.55 }, k % 2 ? "#d9ff9a" : "#ffffff");
      }
    }
  });
  return s;
}

// --- Fogo-Fátuo --------------------------------------------------------------------

/** Chama viva vista de frente: miolo branco, línguas que tremulam, bracinhos de fumaça e faíscas em volta. */
function drawWisp(s: Sheet, clip: Clip, i: number) {
  const pen = new Pen(s, s.w / 32, { x: 0, y: -2 });
  const n = SUMMON_FRAMES[clip];
  const t = (i / n) * Math.PI * 2;
  const flare = clip === "attack" || clip === "cast" ? [0.4, 1, 1, 0.8, 0.3][i] : 0;
  const cx = 16;
  const cy = 19 + Math.sin(t) * 0.6;
  // Línguas de fogo: cada uma balança no seu ritmo (frequências diferentes, para não parecer um pêndulo).
  const tongues = [
    { x: 0, y: 0, top: -11 - flare * 3, sw: Math.sin(t * 2) * 1.4, r: 3.6 },
    { x: -2.8, y: 0.8, top: -7.4 - flare * 2, sw: Math.sin(t * 3 + 1) * 1.2, r: 2.2 },
    { x: 2.8, y: 0.6, top: -8 - flare * 2, sw: Math.sin(t * 2 + 2.4) * 1.3, r: 2.2 },
  ];
  const field = (x: number, y: number) => {
    // Dentro da chama: o quanto (0 = borda, 1 = miolo).
    const dx = x - cx;
    const dy = y - cy;
    let v = 1 - Math.hypot(dx / 5.2, dy / 5) ;
    for (const tg of tongues) {
      const h = -tg.top;
      const k = Math.max(0, Math.min(1, -(dy - tg.y) / h));
      if (dy - tg.y > 1 || k >= 1) continue;
      const midX = tg.x + tg.sw * k * k;
      const r = tg.r * (1 - k) + 0.2;
      v = Math.max(v, (1 - Math.abs(dx - midX) / r) * (1 - k * 0.6));
    }
    // Cauda que se enrola embaixo.
    const ty = dy - 4;
    if (ty > 0 && ty < 6) {
      const midX = -Math.sin(ty * 0.7 + t) * 1.6;
      v = Math.max(v, (1 - Math.abs(dx - midX) / (2 - ty * 0.3)) * 0.7);
    }
    return v;
  };
  const tones = ["#1f7a3a", "#3fbf54", "#7fee6a", "#c8ffb0", "#f4fff0"];
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const v = field((x + 0.5) / pen.u - pen.base.x, (y + 0.5) / pen.u - pen.base.y);
      if (v <= 0) continue;
      const d = v + (((x * 3 + y * 5 + i) % 4) - 1.5) * 0.03;
      s.set(x, y, d > 0.72 ? tones[4] : d > 0.5 ? tones[3] : d > 0.3 ? tones[2] : d > 0.12 ? tones[1] : tones[0]);
    }
  // Bracinhos de fumaça verde que acenam.
  for (const sx of [-1, 1]) {
    const sh = { x: cx + sx * 4.4, y: cy + 0.6 };
    const wave = Math.sin(t + (sx > 0 ? 1.6 : 0)) * 0.5 - flare * 0.9;
    const elbow = add(sh, dir(sx * (1.9 + wave)), 2.4);
    const hand = add(elbow, dir(sx * (2.5 + wave * 1.4)), 2);
    pen.cap(sh, elbow, 1.2, 0.8, ["#c8ffb0", "#7fee6a", "#3fbf54", "#1f7a3a", "#14552a"], { flat: 0.6 });
    pen.cap(elbow, hand, 0.8, 0.5, ["#c8ffb0", "#7fee6a", "#3fbf54", "#1f7a3a", "#14552a"], { flat: 0.6 });
    pen.dot(hand, "#f4fff0");
  }
  // Olhos (piscam uma vez no ciclo parado) e um sorriso no especial.
  const blink = clip === "idle" && i === 4;
  for (const sx of [-1, 1]) {
    const e = { x: cx + sx * 1.7, y: cy - 0.4 };
    pen.dot(e, "#1d4a2a");
    if (!blink) pen.dot({ x: e.x, y: e.y - 1 }, "#1d4a2a");
  }
  if (flare > 0.5) {
    pen.dot({ x: cx - 0.6, y: cy + 1.6 }, "#1d4a2a");
    pen.dot({ x: cx + 0.6, y: cy + 1.6 }, "#1d4a2a");
    pen.dot({ x: cx, y: cy + 2 }, "#1d4a2a");
  }
  // Faíscas girando em volta (no especial, saem para fora).
  for (let k = 0; k < 4; k++) {
    const a = t + (k / 4) * Math.PI * 2;
    const r = 7 + flare * 3 + (k % 2) * 0.8;
    const sp = { x: cx + Math.cos(a) * r, y: cy - 1 + Math.sin(a) * r * 0.45 };
    pen.dot(sp, k % 2 ? "#c8ffb0" : "#f4fff0");
    if (Math.sin(a) > 0) pen.dot({ x: sp.x - Math.sin(a) * 0.8, y: sp.y + 0.6 }, "#3fbf54");
  }
  return s;
}

/**
 * Folha deslocada: o que for pintado nela cai `dx`, `dy` px adiante na folha de verdade (o esqueleto de `rig.ts` centra
 * o quadril no quadro, e o golpe para a frente pede o corpo mais atrás).
 */
class Shifted extends Sheet {
  constructor(readonly base: Sheet, readonly dx: number, readonly dy: number) { super(base.w, base.h); }
  override set(x: number, y: number, c: string) { this.base.set(x + this.dx, y + this.dy, c); }
  override get(x: number, y: number) { return this.base.get(Math.round(x) + this.dx, Math.round(y) + this.dy); }
}

// --- Folha -------------------------------------------------------------------------

export interface SummonArt {
  /** Lado do quadro (32 px = 1 tile no jogo). */
  size: number;
  draw: (s: Sheet, clip: Clip, frame: number) => Sheet;
  fps: Record<Clip, number>;
  /** Quadros do andar por tile andado (o ciclo de 8 quadros cobre 2 tiles). */
  stride: number;
}

export const SUMMON_ART: Record<SummonKind, SummonArt> = {
  wolf: { size: 36, draw: drawWolf, fps: { idle: 5, walk: 12, attack: 13, cast: 7 }, stride: 4 },
  bear: { size: 40, draw: drawBear, fps: { idle: 4, walk: 9, attack: 10, cast: 6 }, stride: 4 },
  treant: { size: 40, draw: drawTreant, fps: { idle: 4, walk: 8, attack: 8, cast: 6 }, stride: 4 },
  skeleton: { size: 36, draw: drawSkeleton, fps: { idle: 5, walk: 11, attack: 12, cast: 7 }, stride: 4 },
  eagle: { size: 40, draw: drawEagle, fps: { idle: 7, walk: 11, attack: 12, cast: 8 }, stride: 4 },
  hornet: { size: 32, draw: drawHornet, fps: { idle: 16, walk: 18, attack: 14, cast: 14 }, stride: 4 },
  moth: { size: 32, draw: drawMoth, fps: { idle: 7, walk: 10, attack: 8, cast: 8 }, stride: 4 },
  wisp: { size: 32, draw: drawWisp, fps: { idle: 8, walk: 10, attack: 9, cast: 9 }, stride: 4 },
};

/** Desenha um quadro (olhando para a direita). */
export function drawSummon(art: SummonArt, clip: Clip, frame: number) {
  return art.draw(new Sheet(art.size, art.size), clip, frame);
}

/** Folha com todos os quadros (`CLIP_ORDER`, `SUMMON_FRAMES`), olhando para a esquerda. */
export function summonSheet(art: SummonArt) {
  const total = CLIP_ORDER.reduce((n, c) => n + SUMMON_FRAMES[c], 0);
  const { canvas, ctx } = makeCanvas(art.size * total, art.size);
  let n = 0;
  for (const clip of CLIP_ORDER) for (let i = 0; i < SUMMON_FRAMES[clip]; i++) blitMirrored(ctx, drawSummon(art, clip, i), (n++) * art.size, 0, SUMMON_OUTLINE);
  return canvas;
}

/** Primeiro quadro (parado). */
export function summonPortrait(art: SummonArt) {
  const { canvas, ctx } = makeCanvas(art.size, art.size);
  blitMirrored(ctx, drawSummon(art, "idle", 0), 0, 0, SUMMON_OUTLINE);
  return canvas;
}
