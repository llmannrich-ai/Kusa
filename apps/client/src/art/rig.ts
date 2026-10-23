import { Sheet } from "./pixels.ts";

/**
 * Esqueleto de desenho dos monstros animados (orcs e ogros do Pântano, e o Rei-Ogro): o corpo é montado de peças
 * com volume (cápsulas e elipses sombreadas pela luz), posicionadas por ângulos de articulação. Cada quadro de
 * animação é o mesmo boneco numa pose diferente, então andar, bater e rugir saem coerentes, em qualquer tamanho.
 *
 * O desenho é feito olhando para a direita (+x) e espelhado no fim (os monstros olham para a esquerda, como os do
 * pack). Por isso a luz, que no jogo vem de cima à esquerda, aqui vem de cima à **direita**.
 *
 * Ângulos dos membros: 0 = apontando para baixo, positivo = girando para a frente (+x); π = para cima.
 */

/** Paleta de 5 tons de uma peça: brilho, luz, meio, sombra, fundo. */
export type Pal = readonly [string, string, string, string, string];

export interface Pt { x: number; y: number }

/** Direção da luz no espaço do desenho (de cima à direita). */
const LIGHT = { x: 0.5, y: -0.78, z: 0.37 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export const dir = (a: number): Pt => ({ x: Math.sin(a), y: Math.cos(a) });
export const add = (p: Pt, v: Pt, k = 1): Pt => ({ x: p.x + v.x * k, y: p.y + v.y * k });
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Tom da paleta pela luz que chega na normal (nx, ny) do pixel, com pontilhado para não fazer faixa. */
function tone(pal: Pal, nx: number, ny: number, x: number, y: number, edge: boolean, flat = 0) {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const lit = (nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z) * (1 - flat) + flat * 0.25 + (bayer(x, y) - 0.5) * 0.22;
  if (edge) return lit > 0.25 ? pal[3] : pal[4];
  return lit > 0.72 ? pal[0] : lit > 0.4 ? pal[1] : lit > 0.02 ? pal[2] : lit > -0.38 ? pal[3] : pal[4];
}

/** Opções de pintura: `edge` = contorno interno (largura em px); `flat` achata o volume (0..1); `clip` limita os pixels. */
export interface PaintOptions {
  edge?: number;
  flat?: number;
  clip?: (x: number, y: number) => boolean;
}

/**
 * Cápsula de `a` a `b` com raio `ra` na ponta `a` e `rb` na ponta `b` (braço, perna, porrete). A borda ganha um
 * contorno interno escuro do lado da sombra, que separa a peça do que está atrás.
 */
export function capsule(s: Sheet, a: Pt, b: Pt, ra: number, rb: number, pal: Pal, opt: PaintOptions = {}) {
  const r = Math.max(ra, rb);
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const edgeW = opt.edge ?? 0.9;
  for (let y = Math.floor(Math.min(a.y, b.y) - r - 1); y <= Math.max(a.y, b.y) + r + 1; y++)
    for (let x = Math.floor(Math.min(a.x, b.x) - r - 1); x <= Math.max(a.x, b.x) + r + 1; x++) {
      if (opt.clip && !opt.clip(x, y)) continue;
      const px = x + 0.5;
      const py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / len2));
      const cx = a.x + vx * t;
      const cy = a.y + vy * t;
      const rr = ra + (rb - ra) * t;
      const d = Math.hypot(px - cx, py - cy);
      if (d > rr) continue;
      const nx = (px - cx) / rr;
      const ny = (py - cy) / rr;
      s.set(x, y, tone(pal, nx, ny, x, y, d > rr - edgeW && rr > 1.6, opt.flat));
    }
}

/** Elipse girada `rot` (radianos) com volume. */
export function ellipse(s: Sheet, c: Pt, rx: number, ry: number, rot: number, pal: Pal, opt: PaintOptions = {}) {
  const r = Math.max(rx, ry);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const edgeW = opt.edge ?? 0.9;
  for (let y = Math.floor(c.y - r - 1); y <= c.y + r + 1; y++)
    for (let x = Math.floor(c.x - r - 1); x <= c.x + r + 1; x++) {
      if (opt.clip && !opt.clip(x, y)) continue;
      const dx = x + 0.5 - c.x;
      const dy = y + 0.5 - c.y;
      const u = (dx * cos + dy * sin) / rx;
      const v = (-dx * sin + dy * cos) / ry;
      const d = Math.hypot(u, v);
      if (d > 1) continue;
      // Normal de volta para a tela.
      const nx = u * cos - v * sin;
      const ny = u * sin + v * cos;
      const edge = d > 1 - edgeW / Math.min(rx, ry) && Math.min(rx, ry) > 1.6;
      s.set(x, y, tone(pal, nx * 0.95, ny * 0.95, x, y, edge, opt.flat));
    }
}

/** Polígono cheio; a cor vem de `color(x, y)` (null = não pinta). */
export function poly(s: Sheet, pts: readonly Pt[], color: (x: number, y: number) => string | null) {
  const minX = Math.floor(Math.min(...pts.map((p) => p.x)));
  const maxX = Math.ceil(Math.max(...pts.map((p) => p.x)));
  const minY = Math.floor(Math.min(...pts.map((p) => p.y)));
  const maxY = Math.ceil(Math.max(...pts.map((p) => p.y)));
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i];
        const b = pts[j];
        if ((a.y > y + 0.5) !== (b.y > y + 0.5) && x + 0.5 < ((b.x - a.x) * (y + 0.5 - a.y)) / (b.y - a.y) + a.x) inside = !inside;
      }
      if (!inside) continue;
      const c = color(x, y);
      if (c) s.set(x, y, c);
    }
}

/** Linha de pixels (largura 1), de `a` a `b`. */
export function stroke(s: Sheet, a: Pt, b: Pt, c: string | ((t: number) => string)) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    s.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, typeof c === "string" ? c : c(t));
  }
}

/** Escurece uma paleta um passo (o braço e a perna de trás, na sombra do corpo). */
export function shade(pal: Pal): Pal {
  return [pal[1], pal[2], pal[3], pal[4], pal[4]];
}

// --- Corpo -------------------------------------------------------------------------

/** Proporções do corpo em unidades (1 = 1/32 do quadro). */
export interface Build {
  skin: Pal;
  thigh: number;
  shin: number;
  thighR: number;
  shinR: number;
  foot: number;
  /** Do quadril ao ombro. */
  torso: number;
  chestRx: number;
  chestRy: number;
  /** Barriga (ogros): elipse à frente do quadril, com tom próprio (`pal`, mais claro) e umbigo. */
  belly?: { rx: number; ry: number; dx: number; dy: number; pal?: Pal };
  upperArm: number;
  foreArm: number;
  armR: number;
  foreR: number;
  handR: number;
  head: { rx: number; ry: number; neck: number; dx: number };
  /** Quanto o ombro fica à frente do quadril (corcunda). */
  hunch: number;
}

export interface Limb { a: number; b: number }

/** Pose de um quadro. Ângulos em radianos; distâncias em unidades. */
export interface Pose {
  /** Sobe/desce o corpo (negativo = sobe). */
  bob: number;
  /** Desloca o corpo para a frente. */
  dx: number;
  /** Inclinação do tronco (positivo = para a frente). */
  lean: number;
  /** Fôlego: o peito e a barriga incham (0..1). */
  breath: number;
  /** Pernas de perto e de longe: coxa `a` e dobra do joelho `b`. */
  near: Limb;
  far: Limb;
  /** Braços: ombro `a` e dobra do cotovelo `b` (para a frente). */
  nearArm: Limb;
  farArm: Limb;
  /** Cabeça: inclinação e boca aberta (0..1). */
  tilt: number;
  jaw: number;
}

export const REST: Pose = {
  bob: 0, dx: 0, lean: 0.12, breath: 0, near: { a: 0, b: 0 }, far: { a: 0, b: 0 },
  nearArm: { a: 0.15, b: 0.3 }, farArm: { a: 0.1, b: 0.25 }, tilt: 0, jaw: 0,
};

/** Juntas calculadas da pose, em pixels do quadro (olhando para a direita). */
export interface Joints {
  u: number;
  hip: Pt;
  shoulder: Pt;
  neck: Pt;
  headC: Pt;
  chestC: Pt;
  bellyC?: Pt;
  lean: number;
  legs: { hip: Pt; knee: Pt; ankle: Pt; toe: Pt }[];
  arms: { shoulder: Pt; elbow: Pt; hand: Pt; foreAngle: number }[];
}

/**
 * Calcula as juntas de um corpo `build` na pose `pose`, num quadro de `size` px (pés no chão do quadro). `unit` muda
 * a escala do corpo (padrão: 1/32 do quadro), para sobrar espaço em volta (o porrete do Rei-Ogro no golpe).
 */
export function joints(build: Build, pose: Pose, size: number, unit = size / 32): Joints {
  const u = unit;
  const ground = size - 1.5 * u;
  const ext = (l: Limb) => build.thigh * Math.cos(l.a) + build.shin * Math.cos(l.a - l.b);
  const legH = Math.max(ext(pose.near), ext(pose.far));
  const hip: Pt = { x: size / 2 + (pose.dx - 1) * u, y: ground - (legH + 1) * u + pose.bob * u };
  const leg = (l: Limb, side: number) => {
    const h = add(hip, { x: side * 0.6 * u, y: 0 });
    const knee = add(h, dir(l.a), build.thigh * u);
    const ankle = add(knee, dir(l.a - l.b), build.shin * u);
    // O pé em pé fica no chão; o que está no ar acompanha o tornozelo.
    const toe = { x: ankle.x + build.foot * u, y: ankle.y + 0.4 * u };
    return { hip: h, knee, ankle, toe };
  };
  const spine = { x: Math.sin(pose.lean), y: -Math.cos(pose.lean) };
  const shoulder = add(add(hip, spine, build.torso * u), { x: build.hunch * u, y: 0 });
  const chestC = lerpPt(hip, shoulder, 0.6);
  const neck = add(shoulder, spine, 0.4 * u);
  const headC = add(add(neck, spine, build.head.neck * u), { x: (build.head.dx + pose.tilt * 1.5) * u, y: pose.tilt * 0.6 * u });
  const bellyC = build.belly ? add(hip, { x: build.belly.dx * u, y: -build.belly.dy * u }) : undefined;
  const arm = (l: Limb, side: number) => {
    const sh = add(shoulder, { x: side * 0.8 * u, y: side * 0.4 * u });
    const elbow = add(sh, dir(l.a), build.upperArm * u);
    const foreAngle = l.a + l.b;
    const hand = add(elbow, dir(foreAngle), build.foreArm * u);
    return { shoulder: sh, elbow, hand, foreAngle };
  };
  return {
    u, hip, shoulder, neck, headC, chestC, bellyC, lean: pose.lean,
    legs: [leg(pose.near, 1), leg(pose.far, -1)],
    arms: [arm(pose.nearArm, 1), arm(pose.farArm, -1)],
  };
}

/** Perna (coxa, canela e pé), com a paleta `pal` (a de trás vem escurecida). */
export function drawLeg(s: Sheet, b: Build, j: Joints, i: 0 | 1, pal: Pal, footPal: Pal = pal) {
  const leg = j.legs[i];
  const u = j.u;
  capsule(s, leg.hip, leg.knee, b.thighR * u, b.shinR * u * 1.05, pal);
  capsule(s, leg.knee, leg.ankle, b.shinR * u, b.shinR * u * 0.85, pal);
  capsule(s, add(leg.ankle, { x: -0.4 * u, y: 0.2 * u }), leg.toe, b.shinR * u * 0.8, b.shinR * u * 0.6, footPal, { flat: 0.3 });
}

/** Braço (ombro, antebraço e mão). */
export function drawArm(s: Sheet, b: Build, j: Joints, i: 0 | 1, pal: Pal) {
  const arm = j.arms[i];
  const u = j.u;
  capsule(s, arm.shoulder, arm.elbow, b.armR * u, b.foreR * u, pal);
  capsule(s, arm.elbow, arm.hand, b.foreR * u, b.foreR * u * 0.9, pal);
  ellipse(s, arm.hand, b.handR * u, b.handR * u, 0, pal);
}

/** Tronco (peito e, nos ogros, a barriga), com o fôlego da pose. */
export function drawTorso(s: Sheet, b: Build, j: Joints, pose: Pose, pal: Pal) {
  const u = j.u;
  const k = 1 + pose.breath * 0.06;
  capsule(s, j.hip, j.shoulder, b.chestRx * 0.7 * u, b.chestRx * 0.8 * u, pal, { edge: 0.6 });
  ellipse(s, j.chestC, b.chestRx * u * k, b.chestRy * u * k, j.lean, pal);
  if (b.belly && j.bellyC) {
    ellipse(s, j.bellyC, b.belly.rx * u * k, b.belly.ry * u * (1 + pose.breath * 0.08), 0, b.belly.pal ?? pal);
    const navel = add(j.bellyC, { x: b.belly.rx * 0.45 * u, y: b.belly.ry * 0.15 * u });
    s.set(navel.x, navel.y, pal[4]);
    // Dobra entre o peito e a barriga.
    for (let k2 = -2; k2 <= 3; k2++) s.set(j.bellyC.x + (b.belly.rx * 0.15 + k2) * u * 0.6, j.bellyC.y - b.belly.ry * 0.82 * u + Math.abs(k2) * 0.3, pal[3]);
  }
}

/** Cabeça de orc ou ogro: crânio, mandíbula projetada com presas, orelha pontuda, olho, sobrancelha e nariz. */
export interface HeadStyle {
  eye: string;
  tusk: string;
  brow: string;
  /** Orelha pontuda (orc) ou pequena e redonda (ogro). */
  ear: "pointed" | "round";
  /** Presa grande (ogro velho) ou pequena. */
  bigTusk?: boolean;
}

export function drawHead(s: Sheet, b: Build, j: Joints, pose: Pose, pal: Pal, style: HeadStyle) {
  const u = j.u;
  const { rx, ry } = b.head;
  const c = j.headC;
  // Pescoço curto e grosso.
  capsule(s, j.neck, add(c, { x: -0.3 * rx * u, y: 0.3 * ry * u }), b.chestRx * 0.38 * u, rx * 0.55 * u, pal);
  // Orelha atrás.
  if (style.ear === "pointed") {
    const base = add(c, { x: -0.55 * rx * u, y: -0.05 * ry * u });
    poly(s, [base, add(base, { x: -1.9 * u, y: -1.6 * u }), add(base, { x: 0.4 * u, y: 0.9 * u })], (x, y) => ((x + y) % 3 ? pal[2] : pal[3]));
  } else {
    ellipse(s, add(c, { x: -0.6 * rx * u, y: 0 }), 0.32 * rx * u, 0.4 * ry * u, 0, pal);
  }
  ellipse(s, c, rx * u, ry * u, 0.1 + pose.tilt * 0.2, pal);
  // Mandíbula de baixo, para a frente; abre descendo.
  const jaw = add(c, { x: 0.32 * rx * u, y: (0.42 + pose.jaw * 0.25) * ry * u });
  if (pose.jaw > 0.05) ellipse(s, add(c, { x: 0.35 * rx * u, y: 0.3 * ry * u }), 0.45 * rx * u, (0.18 + pose.jaw * 0.2) * ry * u, 0, ["#3a0d0d", "#3a0d0d", "#2a0808", "#1a0505", "#1a0505"]);
  ellipse(s, jaw, 0.62 * rx * u, 0.36 * ry * u, -0.1, pal);
  // Presas saindo do queixo para cima.
  // Boca: risco escuro entre o lábio de cima e a mandíbula.
  stroke(s, add(c, { x: 0.15 * rx * u, y: 0.36 * ry * u }), add(c, { x: 0.85 * rx * u, y: 0.3 * ry * u }), pal[4]);
  const tusk = add(jaw, { x: 0.35 * rx * u, y: -0.3 * ry * u });
  const th = (style.bigTusk ? 1.7 : 1.1) * Math.max(1, 0.9 * u);
  stroke(s, tusk, add(tusk, { x: 0.15 * u, y: -th }), style.tusk);
  if (style.bigTusk || u >= 1.2) stroke(s, add(tusk, { x: -1, y: 0 }), add(tusk, { x: -0.8, y: -th * 0.7 }), style.tusk);
  // Nariz achatado, olho fundo sob a sobrancelha grossa.
  const nose = add(c, { x: 0.92 * rx * u, y: 0.05 * ry * u });
  s.set(nose.x, nose.y, pal[3]);
  s.set(nose.x, nose.y - 1, pal[1]);
  const eye = add(c, { x: 0.45 * rx * u, y: -0.12 * ry * u });
  stroke(s, add(eye, { x: -0.9 * u, y: -1 * u }), add(eye, { x: 1.2 * u, y: -0.6 * u }), style.brow);
  if (u >= 1.2) stroke(s, add(eye, { x: -0.6 * u, y: -1 * u - 1 }), add(eye, { x: 1 * u, y: -0.6 * u - 1 }), style.brow);
  s.set(eye.x, eye.y, style.eye);
  if (u >= 1.2) { s.set(eye.x + 1, eye.y, style.eye); s.set(eye.x, eye.y + 1, pal[4]); }
  if (u >= 2) {
    // Olho grande (boss): órbita funda, íris acesa e um brilho.
    for (const [dx, dy] of [[-1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1]]) s.set(eye.x + dx, eye.y + dy, pal[4]);
    s.set(eye.x, eye.y - 1, style.eye);
    s.set(eye.x + 1, eye.y - 1, "#ffffff");
  }
}

/**
 * Desenha a `Sheet` no quadro (x, y) do canvas, espelhada (o monstro passa a olhar para a esquerda), com contorno
 * `outline` de 1 px em volta da silhueta.
 */
export function blitMirrored(ctx: CanvasRenderingContext2D, s: Sheet, ox: number, oy: number, outline: string) {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      let c = s.get(x, y);
      if (!c && (s.get(x - 1, y) || s.get(x + 1, y) || s.get(x, y - 1) || s.get(x, y + 1))) c = outline;
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + s.w - 1 - x, oy + y, 1, 1);
    }
}

// --- Ciclos de animação ---------------------------------------------------------------

/** Quadros de cada clipe, na ordem da folha. */
export const CLIPS = { idle: 4, walk: 6, attack: 4, cast: 4 } as const;
export type Clip = keyof typeof CLIPS;
export const CLIP_ORDER: Clip[] = ["idle", "walk", "attack", "cast"];
export const FRAME_COUNT = CLIP_ORDER.reduce((n, c) => n + CLIPS[c], 0);
/** Primeiro quadro de um clipe na folha. */
export function clipStart(clip: Clip) {
  let n = 0;
  for (const c of CLIP_ORDER) {
    if (c === clip) return n;
    n += CLIPS[c];
  }
  return n;
}

/** Como o monstro segura a arma: muda os braços em todos os clipes. */
export type Grip = "oneHand" | "twoHand" | "club" | "spear" | "bow" | "staff" | "dual" | "fists";

/**
 * Pose de um quadro de um clipe. `weight` (0..1) deixa o andar mais pesado (ogros: passo curto, corpo balançando
 * para os lados, braços quase parados); `castStyle` escolhe o quadro especial (rugido, ou erguer o cajado).
 */
export function posed(clip: Clip, i: number, grip: Grip, weight = 0, castStyle: "roar" | "raise" = "roar"): Pose {
  const p: Pose = structuredClone(REST);
  const heavy = weight;
  armsFor(p, grip, 0);
  if (clip === "idle") {
    const t = (i / CLIPS.idle) * Math.PI * 2;
    p.breath = 0.5 + 0.5 * Math.sin(t);
    p.bob = Math.sin(t) * -0.35;
    p.nearArm.a += Math.sin(t) * 0.05;
    p.farArm.a -= Math.sin(t) * 0.05;
    p.tilt = Math.sin(t) * 0.08;
    p.near = { a: 0.1, b: 0.12 + heavy * 0.1 };
    p.far = { a: -0.12, b: 0.08 + heavy * 0.1 };
  } else if (clip === "walk") {
    const t = (i / CLIPS.walk) * Math.PI * 2;
    const swing = 0.5 - heavy * 0.18;
    p.near = { a: Math.sin(t) * swing, b: Math.max(0, -Math.cos(t)) * (0.9 - heavy * 0.3) + 0.1 };
    p.far = { a: -Math.sin(t) * swing, b: Math.max(0, Math.cos(t)) * (0.9 - heavy * 0.3) + 0.1 };
    p.bob = -Math.abs(Math.cos(t)) * (0.9 + heavy * 0.6) + 0.5;
    p.lean = 0.16 + heavy * 0.05 + Math.sin(t * 2) * 0.03;
    p.breath = 0.3;
    // Braço livre balança contra a perna; o da arma, menos.
    const armSwing = (0.35 - heavy * 0.15) * Math.sin(t);
    p.nearArm.a -= armSwing * (grip === "oneHand" || grip === "fists" ? 1 : grip === "club" ? 0.2 : 0.35);
    p.farArm.a += armSwing * (grip === "fists" || grip === "oneHand" ? 1 : 0.3);
    p.tilt = Math.sin(t * 2) * 0.06;
    p.dx = Math.sin(t * 2) * heavy * 0.4;
  } else if (clip === "attack") {
    armsFor(p, grip, i + 1);
    p.near = [{ a: -0.15, b: 0.25 }, { a: 0.45, b: 0.15 }, { a: 0.35, b: 0.2 }, { a: 0.1, b: 0.15 }][i];
    p.far = [{ a: 0.2, b: 0.2 }, { a: -0.3, b: 0.1 }, { a: -0.25, b: 0.12 }, { a: -0.1, b: 0.1 }][i];
    p.lean = [-0.05, 0.42, 0.35, 0.2][i];
    p.dx = [-0.6, 1.4, 1.1, 0.4][i];
    p.bob = [-0.3, 0.6, 0.5, 0.1][i];
    p.jaw = [0.3, 0.6, 0.2, 0][i];
  } else {
    // Especial: rugido (braços abertos, peito estufado, boca escancarada) ou erguer o cajado/arma para o alto.
    const k = [0.4, 1, 1, 0.5][i];
    p.breath = 1;
    p.jaw = castStyle === "roar" ? [0.4, 1, 1, 0.5][i] : 0.3;
    p.tilt = castStyle === "roar" ? -0.25 * k : -0.1 * k;
    p.lean = castStyle === "roar" ? -0.12 * k + 0.05 : 0.02;
    p.bob = [-0.2, -0.6, -0.5, -0.2][i];
    p.near = { a: 0.15, b: 0.25 };
    p.far = { a: -0.2, b: 0.2 };
    if (castStyle === "roar" && grip !== "staff") {
      // Braços flexionados para os lados (cotovelo baixo, punho para cima), peito estufado.
      p.nearArm = { a: 0.5 + k * 0.6, b: 0.8 + k * 1.0 };
      p.farArm = { a: -0.2 - k * 0.4, b: 1.2 + k * 0.9 };
    } else {
      p.nearArm = { a: 1.4 + k * 1.4, b: 0.25 };
      p.farArm = { a: 0.8 + k * 0.6, b: 0.6 };
    }
  }
  return p;
}

/**
 * Braços pela pegada; `strike` 0 = parado, 1..4 = quadros do golpe (preparo, golpe, fim, volta). O ângulo da arma
 * sai do antebraço (`weaponAngle`).
 */
function armsFor(p: Pose, grip: Grip, strike: number) {
  const s = strike;
  switch (grip) {
    case "oneHand":
      p.nearArm = [{ a: 0.35, b: 0.9 }, { a: 3.3, b: 0.3 }, { a: 1.5, b: 0.15 }, { a: 0.8, b: 0.2 }, { a: 0.45, b: 0.7 }][s];
      p.farArm = [{ a: 0.2, b: 0.6 }, { a: 0.6, b: 0.6 }, { a: -0.3, b: 0.4 }, { a: -0.2, b: 0.4 }, { a: 0.1, b: 0.5 }][s];
      return;
    case "dual":
      p.nearArm = [{ a: 0.35, b: 0.9 }, { a: 3.3, b: 0.3 }, { a: 1.5, b: 0.15 }, { a: 0.8, b: 0.2 }, { a: 0.45, b: 0.7 }][s];
      p.farArm = [{ a: 0.45, b: 0.9 }, { a: 0.7, b: 0.8 }, { a: 2.9, b: 0.4 }, { a: 1.9, b: 0.2 }, { a: 0.6, b: 0.6 }][s];
      return;
    case "twoHand":
      p.nearArm = [{ a: 0.55, b: 0.8 }, { a: 3.2, b: 0.5 }, { a: 1.6, b: 0.2 }, { a: 1.0, b: 0.3 }, { a: 0.65, b: 0.7 }][s];
      p.farArm = [{ a: 0.75, b: 0.7 }, { a: 3.0, b: 0.6 }, { a: 1.5, b: 0.3 }, { a: 0.95, b: 0.4 }, { a: 0.8, b: 0.6 }][s];
      return;
    case "club":
      // Porrete pesado: parado, fica baixo na frente, a ponta quase no chão; o golpe vem de cima, com as duas mãos.
      p.nearArm = [{ a: 0.3, b: 0.45 }, { a: 3.1, b: 0.5 }, { a: 1.5, b: 0.15 }, { a: 0.9, b: 0.25 }, { a: 0.45, b: 0.45 }][s];
      p.farArm = [{ a: 0.5, b: 0.5 }, { a: 2.9, b: 0.6 }, { a: 1.4, b: 0.25 }, { a: 0.85, b: 0.35 }, { a: 0.6, b: 0.45 }][s];
      return;
    case "spear":
      p.nearArm = [{ a: 0.6, b: 0.6 }, { a: 0.2, b: 1.0 }, { a: 1.35, b: 0.1 }, { a: 1.2, b: 0.2 }, { a: 0.7, b: 0.5 }][s];
      p.farArm = [{ a: 1.0, b: 0.4 }, { a: 0.7, b: 0.8 }, { a: 1.5, b: 0.05 }, { a: 1.4, b: 0.1 }, { a: 1.05, b: 0.35 }][s];
      return;
    case "bow":
      p.farArm = [{ a: 1.2, b: 0.2 }, { a: 1.5, b: 0.05 }, { a: 1.55, b: 0.0 }, { a: 1.5, b: 0.05 }, { a: 1.3, b: 0.15 }][s];
      p.nearArm = [{ a: 0.9, b: 0.9 }, { a: 1.3, b: 2.2 }, { a: 1.1, b: 0.5 }, { a: 1.0, b: 0.6 }, { a: 0.9, b: 0.9 }][s];
      return;
    case "staff":
      p.nearArm = [{ a: 0.7, b: 0.4 }, { a: 2.6, b: 0.2 }, { a: 1.7, b: 0.0 }, { a: 1.3, b: 0.1 }, { a: 0.8, b: 0.35 }][s];
      p.farArm = [{ a: 0.2, b: 0.6 }, { a: 0.9, b: 0.9 }, { a: 1.2, b: 0.4 }, { a: 0.6, b: 0.5 }, { a: 0.3, b: 0.6 }][s];
      return;
    case "fists":
      p.nearArm = [{ a: 0.25, b: 0.5 }, { a: 2.9, b: 0.5 }, { a: 1.3, b: 0.2 }, { a: 0.7, b: 0.3 }, { a: 0.35, b: 0.4 }][s];
      p.farArm = [{ a: 0.15, b: 0.4 }, { a: 0.4, b: 0.6 }, { a: -0.2, b: 0.3 }, { a: -0.1, b: 0.3 }, { a: 0.1, b: 0.4 }][s];
  }
}

/** Quanto a arma dobra para a frente do antebraço em cada quadro do golpe (no resto, empunhada para cima). */
const STRIKE_BEND = [1.15, 0.35, 0.05, 0.85];

/** Ângulo da arma na mão (absoluto): segue o antebraço, dobrado para a frente como quem empunha. */
export function weaponAngle(j: Joints, i: 0 | 1, grip: Grip, clip: Clip, frame: number) {
  const fore = j.arms[i].foreAngle;
  if (grip === "spear") return Math.PI / 2 + (fore - Math.PI / 2) * 0.15;
  if (grip === "staff") return Math.PI - 0.08 + (fore - 0.7) * 0.15;
  if (grip === "bow") return fore;
  if (grip === "club" && clip !== "attack") return fore + 0.55;
  return fore + (clip === "attack" ? STRIKE_BEND[frame] : 1.25);
}
