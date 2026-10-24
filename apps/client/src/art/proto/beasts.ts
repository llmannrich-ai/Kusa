import { makeCanvas } from "../pixels.ts";
import {
  Canvas, F, KNIGHT_LOOK, Mat, chain, ebox, ellipse, fang, flame, fur, horn, inEllipse, inPoly, lerp, limb, lit, noise, pbox, plate,
  poly, rivet, scales, sphere, thread, grain, leather, type Offset, type Pt,
} from "./tibiaHero.ts";

/**
 * Monstros não humanoides da Cripta no padrão novo (`docs/ARTE_TIBIA.md`): rato, stirge, aranha gigante, cubo
 * gelatinoso, mímico e o dragão jovem. Mesmo pincel e mesma escala dos heróis (128 px por tile), olhando para a
 * esquerda (o jogo espelha), com os clipes da folha dos monstros: parado, andar, ataque e magia, 4 quadros cada.
 *
 * O chão fica na linha 91 do quadro (como os pés dos heróis); o quadro do dragão tem o dobro do tamanho.
 */

type Draw = (c: Canvas, k: number) => void;
interface Beast { size: number; fill: number; scale?: number; idle: Draw; walk?: Draw; attack?: Draw; cast?: Draw; same?: (clip: string, k: number) => string }

/** Linha do chão (unidades) num quadro de `size` px. */
const ground = (size: number) => size / 2 - 5;

// --- Rato -------------------------------------------------------------------------------------

function rat(c: Canvas, k: number, bite = false) {
  const g = ground(192), step = [1, 0, -1, 0][k], bob = k % 2 ? -0.4 : 0;
  // Rabo pelado e comprido, enrolando para trás.
  chain(c, [[56, g - 4], [62, g - 3 + step * 0.4], [68, g - 5], [72, g - 9 - step * 0.6]], 0.9, Mat.Lip, (X) => (X % 3 === 0 ? -1 : 0), 0.35);
  // Patas de lá, corpo, patas de cá.
  for (const [x, ph] of [[40, 1], [54, -1]] as const) limb(c, [x, g - 5], [x - 1 + step * ph, g - 0.6], 1.1, 0.9, Mat.Fur, () => -1);
  const body = c.fill(ebox(48, g - 7 + bob, 11, 6.4), inEllipse(48, g - 7 + bob, 10.6, 6), Mat.Fur, sphere(47, g - 9, 11, 7), fur);
  ellipse(c, 47, g - 4 + bob, 7, 2.6, Mat.FurLight, fur);
  for (const [x, ph] of [[42, -1], [55, 1]] as const) limb(c, [x, g - 4], [x - 1.6 + step * ph, g - 0.4], 1.2, 1, Mat.Fur);
  // Cabeça pontuda, orelha rosada, olho vermelho, bigodes e os dentes da frente.
  const head = c.fill(ebox(36, g - 9 + bob, 7, 5), (x, y) => inPoly([[42, g - 14 + bob], [27, g - 8 + bob], [28, g - 6 + bob], [42, g - 3.6 + bob]])(x, y) || inEllipse(40, g - 9 + bob, 4.6, 4.4)(x, y), Mat.Fur, sphere(38, g - 11, 7, 6), fur);
  ellipse(c, 42, g - 14 + bob, 2.6, 2.8, Mat.Fur);
  ellipse(c, 42, g - 13.8 + bob, 1.4, 1.8, Mat.Lip);
  ellipse(c, 27.6, g - 7.4 + bob, 1.1, 1, Mat.Lip);
  c.on(head, F(35.6), F(g - 10 + bob), Mat.Ember, 5); c.on(head, F(36.2), F(g - 10 + bob), Mat.Eye, 0);
  for (const dy of [-1, 0.4]) thread(c, [29, g - 7.4 + bob], [23, g - 8 + dy * 2 + bob], Mat.White, 3);
  if (bite) { fang(c, [29.4, g - 5.8 + bob], 0.5, 1.6); fang(c, [30.6, g - 5.8 + bob], 0.5, 1.4); }
  void body;
}

// --- Stirge -----------------------------------------------------------------------------------

function stirge(c: Canvas, k: number, stab = false) {
  const g = ground(192) - 18, flap = [-1, 0, 1, 0][k];
  // Asa de lá (escura), corpo peludo, asa de cá, ferrão comprido para a frente.
  const wing = (dx: number, dark: number) => {
    const tip: Pt = [48 + dx * 0.4, g - 10 - flap * 9];
    plate(c, [[46, g - 6], [54 + dx, g - 7 - flap * 6], tip, [40 + dx, g - 7 - flap * 6]], Mat.Leather, (X, Y) => dark + ((X + Y) % 5 === 0 ? -1 : 0));
    chain(c, [[46, g - 6], tip], 0.4, Mat.Horn, undefined, 0.2);
  };
  wing(6, -2);
  for (const x of [44, 48, 52]) chain(c, [[x, g - 2], [x - 1, g + 3], [x - 2.4, g + 5]], 0.4, Mat.Leather, () => -1, 0.25);
  ellipse(c, 48, g - 3, 6.6, 5, Mat.Crest, fur);
  ellipse(c, 52, g - 1.6, 4.4, 3.6, Mat.Crest, (X, Y) => fur(X, Y) - 1);
  ellipse(c, 41.6, g - 4.4, 3.2, 2.8, Mat.Crest, fur);
  for (const dx of [0, 1.4]) c.px(F(40.6 + dx), F(g - 5.4), Mat.Amber, 5);
  limb(c, [39, g - 3.6], [stab ? 26 : 29, g - 1 + (stab ? 2 : 0)], 0.7, 0.2, Mat.Horn);
  wing(-6, 0);
}

// --- Aranha gigante ---------------------------------------------------------------------------

function spider(c: Canvas, k: number, lunge = false) {
  const g = ground(192), ph = k % 2 ? 1 : -1;
  const body: Pt = [50, g - 9], head: Pt = [36, g - 8];
  // Pernas de lá (escuras) e de cá: 4 de cada lado, joelho alto, alternando o passo.
  const legs = (far: boolean) => {
    for (let i = 0; i < 4; i++) {
      const base: Pt = [head[0] + 4 + i * 3, g - 9];
      const swing = (i % 2 ? ph : -ph) * 1.6;
      const knee: Pt = [base[0] - 6 + i * 4 + swing, g - 19 + i * 0.6 - (far ? 2 : 0)];
      const foot: Pt = [base[0] - 12 + i * 8 + swing * 1.4, g - (far ? 1.4 : 0)];
      chain(c, [base, knee, foot], 1.1, Mat.Soot, (X, Y) => (far ? -1 : 0) + (noise(X, Y >> 2) < 0.2 ? 1 : 0), 0.45);
    }
  };
  legs(true);
  // Abdômen grande com a ampulheta vermelha e pelos, cefalotórax, olhos vermelhos e quelíceras.
  const abd = c.fill(ebox(body[0] + 4, body[1] - 2, 11, 9), inEllipse(body[0] + 4, body[1] - 2, 10.6, 8.6), Mat.Soot, sphere(body[0] + 2, body[1] - 6, 11, 10), fur);
  for (const [dx, dy] of [[0, -2], [2, 0], [-2, 0], [0, 2], [1, -1], [-1, 1]] as const) c.on(abd, F(body[0] + 6) + dx * 2, F(body[1] - 4) + dy * 2, Mat.Crest, 3);
  ellipse(c, head[0] + (lunge ? -2 : 0), head[1] - 1, 7, 5.4, Mat.Soot, fur);
  for (const [dx, dy] of [[-4, -3], [-2, -4], [-5.4, -1.4], [-3, -1.6]] as const) { c.px(F(head[0] + dx + (lunge ? -2 : 0)), F(head[1] + dy), Mat.Ember, 5); c.px(F(head[0] + dx + (lunge ? -2 : 0)) + 1, F(head[1] + dy), Mat.Ember, 3); }
  for (const s of [0, 1.6]) limb(c, [head[0] - 5 + (lunge ? -2 : 0), head[1] + 1 + s], [head[0] - 8 + (lunge ? -3 : 0), head[1] + 4 + s * 0.6], 1, 0.4, Mat.Horn);
  legs(false);
}

// --- Cubo gelatinoso --------------------------------------------------------------------------

function cube(c: Canvas, k: number, engulf = false) {
  const g = ground(192), w = 15 + [0, 0.6, 0, -0.6][k] + (engulf ? 1 : 0), h = 26 - [0, 0.8, 0, -0.8][k];
  const x0 = 48 - w, x1 = 48 + w, top = g - h, d = 7;
  // Faces: lateral escura, frente e o tampo claro (perspectiva de cima), com o que ele engoliu dentro.
  const side = plate(c, [[x1, top], [x1 + d * 0.6, top - d], [x1 + d * 0.6, g - d], [x1, g]], Mat.Leaf, (X, Y) => -1 + (noise(X >> 2, Y >> 2) < 0.1 ? 1 : 0));
  const front = c.fill([x0, top, x1, g], (x, y) => x + 0.5 >= x0 && x + 0.5 <= x1 && y + 0.5 >= top && y + 0.5 <= g, Mat.Leaf, (x, y) => lit(((x + 0.5 - 48) / w) * 0.5, -0.1, 0.85) * 0.9, (X, Y) => (noise(X >> 2, Y >> 2) < 0.08 ? 1 : 0));
  const lid = plate(c, [[x0, top], [x0 + d * 0.6, top - d], [x1 + d * 0.6, top - d], [x1, top]], Mat.Leaf, () => 1);
  // Ossos, uma caveira e uma espada boiando dentro (desenhados por cima, mais apagados).
  limb(c, [x0 + 6, g - 6], [x0 + 16, g - 10], 1, 1, Mat.Bone, () => -1);
  const skull = ellipse(c, 50, top + 10, 3.6, 3.2, Mat.Bone, () => -1);
  c.on(skull, F(48.6), F(top + 10), Mat.Leaf, 0); c.on(skull, F(51), F(top + 10), Mat.Leaf, 0);
  limb(c, [x1 - 4, top + 6], [x1 - 10, g - 4], 0.7, 0.5, Mat.Steel, () => -1);
  for (let i = 0; i < 7; i++) c.px(F(x0 + 3 + noise(i, k) * (2 * w - 6)), F(top + 3 + noise(k, i) * (h - 6)), Mat.White, 4);
  // Brilho úmido no canto de cima e a gosma escorrendo no chão.
  thread(c, [x0 + 1, top + 1], [x0 + 1, top + h * 0.6], Mat.White, (j) => (j % 4 === 3 ? -1 : 4), [front]);
  ellipse(c, 48, g + 0.6, w + 3, 1.4, Mat.Leaf, () => -1);
  void side; void lid;
}

// --- Mímico -----------------------------------------------------------------------------------

/** Baú de madeira com ferragens; o Mímico abre a tampa em boca, com dentes, língua e olhos. */
function chest(c: Canvas, open: number) {
  const g = ground(192), x0 = 32, x1 = 64, top = g - 16;
  const body = poly(c, [[x0, top], [x1, top], [x1, g], [x0, g]], Mat.Wood, x0, x1, grain);
  for (const y of [top + 5, top + 11]) thread(c, [x0, y], [x1, y], Mat.Wood, 0, [body]);
  for (const x of [x0 + 2, x1 - 2]) limb(c, [x, top], [x, g], 1, 1, Mat.Iron);
  if (open > 0) {
    // Boca: interior escuro, dentes em cima e embaixo, língua roxa saindo.
    plate(c, [[x0 + 1, top - open * 0.4], [x1 - 1, top - open * 0.4], [x1 - 1, top + 3], [x0 + 1, top + 3]], Mat.Eye);
    for (let x = x0 + 2.4; x < x1 - 2; x += 2.6) { fang(c, [x, top + 2.6], 0.8, 2.4, -1); fang(c, [x + 1.2, top - open * 0.4], 0.8, 2.6); }
    chain(c, [[46, top + 1], [40, top + 4], [34, top + 9], [30, top + 8]], 1.6, Mat.Gem, undefined, 0.8);
  }
  // Tampa arredondada (abre para trás) com a fechadura; no Mímico, dois olhos amarelos na tampa.
  const lift = open;
  const lid = c.fill([x0 - 1, top - 8 - lift, x1 + 1, top + 1 - lift * 0.6], (x, y) => x + 0.5 >= x0 && x + 0.5 <= x1 && y + 0.5 <= top - lift * 0.5 + 0.6 && inEllipse(48, top - lift * 0.5, 16.4, 7.4)(x, y), Mat.Wood, sphere(46, top - 4 - lift, 18, 9), grain);
  for (const x of [x0 + 2, x1 - 2]) limb(c, [x, top - 5 - lift * 0.8], [x, top - lift * 0.5], 1, 1, Mat.Iron);
  const lock = plate(c, [[46, top - 1.6 - lift * 0.5], [50, top - 1.6 - lift * 0.5], [50, top + 2.6 - lift * 0.4], [46, top + 2.6 - lift * 0.4]], Mat.Bronze);
  rivet(c, [lock], 48, top + 0.4 - lift * 0.45, Mat.Iron);
  if (open > 0) for (const x of [40, 56]) { const e = ellipse(c, x, top - 4 - lift, 1.8, 1.6, Mat.Amber); c.on(e, F(x), F(top - 4 - lift), Mat.Eye, 0); }
  void lid;
}

// --- Dragão jovem (chefe) -----------------------------------------------------------------------

function dragon(c: Canvas, k: number, mode: "idle" | "walk" | "bite" | "breath") {
  const S = 384, g = ground(S), step = mode === "walk" ? [1, 0, -1, 0][k] : 0, breathe = [0, 0.6, 0, -0.6][k];
  const sc: Offset = scales(6, 5), belly: Offset = (X, Y) => (Y % 6 < 1 ? -1 : 0);
  const wingFlap = mode === "breath" ? -4 : [0, -1.4, 0, 1.4][k];
  // Rabo para trás, asa de lá, pernas de lá.
  chain(c, [[118, g - 30], [136, g - 22 + step], [152, g - 26], [164, g - 38 - step], [170, g - 50]], 6, Mat.RedDragon, sc, 0.8);
  for (const p of [[152, g - 26], [164, g - 38]] as const) plate(c, [[p[0] - 2, p[1] - 4], [p[0] + 2, p[1] - 5], [p[0] + 1, p[1] - 11]], Mat.Horn);
  const wing = (dx: number, dark: number) => {
    const root: Pt = [96 + dx, g - 62], tips: Pt[] = [[70 + dx, g - 118 + wingFlap * 3], [104 + dx, g - 128 + wingFlap * 4], [138 + dx, g - 104 + wingFlap * 3], [150 + dx, g - 74]];
    const pts: Pt[] = [root, tips[0]];
    for (let i = 1; i < tips.length; i++) { const m = lerp(tips[i - 1], tips[i], 0.5); pts.push([m[0], m[1] + 10], tips[i]); }
    pts.push([118 + dx, g - 54]);
    plate(c, pts, Mat.Dragon, (X, Y) => dark + ((X + Y) % 7 === 0 ? -1 : 0));
    for (const tp of tips) chain(c, [root, lerp(root, tp, 0.5), tp], 1.6, Mat.Horn, undefined, 0.7);
  };
  wing(14, -2);
  for (const [x, ph] of [[82, -1], [126, 1]] as const) chain(c, [[x, g - 34], [x - 4 + step * ph * 3, g - 16], [x - 8 + step * ph * 4, g - 2]], 6, Mat.RedDragon, (X, Y) => sc(X, Y) - 1, 4.6);
  // Corpo, barriga clara em faixas, pernas de cá com garras.
  const body = c.fill(ebox(104, g - 40 + breathe, 34, 20), inEllipse(104, g - 40 + breathe, 33, 19), Mat.RedDragon, sphere(100, g - 50, 34, 22), sc);
  c.fill(ebox(98, g - 30 + breathe, 26, 9), (x, y) => inEllipse(98, g - 28 + breathe, 25, 9)(x, y) && y > g - 34 + breathe, Mat.Amber, sphere(98, g - 30, 26, 10), belly);
  for (const [x, ph] of [[88, 1], [128, -1]] as const) {
    chain(c, [[x, g - 30], [x - 4 + step * ph * 3, g - 14], [x - 8 + step * ph * 4, g - 1]], 7, Mat.RedDragon, sc, 5);
    for (const d of [-3, 0, 3]) plate(c, [[x - 10 + step * ph * 4 + d, g - 1], [x - 8 + step * ph * 4 + d, g - 1], [x - 12 + step * ph * 4 + d, g + 1.4]], Mat.Horn);
  }
  // Pescoço curvo para a frente, espinhos nas costas, cabeça com chifres, olho em brasa e a boca.
  const jaw = mode === "bite" ? [0, 4, 8, 4][k] : mode === "breath" ? 7 : 0;
  const head: Pt = [44 - (mode === "bite" ? [0, 4, 8, 4][k] : 0), g - 88 + breathe];
  chain(c, [[84, g - 50], [70, g - 66], [58, g - 80], head], 10, Mat.RedDragon, sc, 8);
  for (const t of [0.2, 0.4, 0.6, 0.8]) { const p = lerp([84, g - 56], [52, g - 92], t); plate(c, [[p[0] + 2, p[1] - 6], [p[0] + 7, p[1] - 4], [p[0] + 6, p[1] - 13]], Mat.Horn); }
  for (let x = 90; x < 130; x += 7) plate(c, [[x, g - 58 + breathe], [x + 5, g - 58 + breathe], [x + 3, g - 66 + breathe]], Mat.Horn);
  horn(c, [[head[0] + 8, head[1] - 6], [head[0] + 18, head[1] - 14], [head[0] + 28, head[1] - 14]], 3.4);
  const skull = c.fill(ebox(head[0], head[1], 16, 10), (x, y) => inEllipse(head[0] + 4, head[1] - 1, 11, 8)(x, y) || inPoly([[head[0] - 2, head[1] - 7], [head[0] - 22, head[1] - 2], [head[0] - 22, head[1] + 3], [head[0] - 2, head[1] + 4]])(x, y), Mat.RedDragon, sphere(head[0], head[1] - 4, 18, 10), sc);
  const lower = plate(c, [[head[0] - 2, head[1] + 3], [head[0] - 20, head[1] + 4 + jaw], [head[0] - 19, head[1] + 7 + jaw], [head[0], head[1] + 8]], Mat.RedDragon, sc);
  for (let x = -18; x < -2; x += 3) { fang(c, [head[0] + x, head[1] + 3.4], 0.6, 2.2); if (jaw > 0) fang(c, [head[0] + x + 1, head[1] + 4.4 + jaw * (1 + x / 22)], 0.6, 2, -1); }
  if (jaw > 0) plate(c, [[head[0] - 3, head[1] + 3.6], [head[0] - 19, head[1] + 4], [head[0] - 18, head[1] + 3.4 + jaw], [head[0] - 3, head[1] + 7.4]], Mat.Eye);
  c.on(skull, F(head[0] - 20), F(head[1] - 1), Mat.Eye, 0);
  const eye = ellipse(c, head[0] + 2, head[1] - 4, 2.4, 1.8, Mat.Ember);
  c.on(eye, F(head[0] + 2), F(head[1] - 4), Mat.Eye, 0); c.on(eye, F(head[0] + 1), F(head[1] - 5), Mat.Ember, 5);
  thread(c, [head[0] - 4, head[1] - 7], [head[0] + 8, head[1] - 8], Mat.RedDragon, 0, [skull]);
  if (mode === "breath") for (let i = 0; i < 3; i++) flame(c, [head[0] - 24 - i * 9, head[1] + 10 + i], 9 + i * 2, 4 + i, -0.4);
  // Asa de cá por cima do corpo.
  wing(0, 0);
  void body; void lower; void leather;
}

// --- Folhas ------------------------------------------------------------------------------------

const BEASTS: Record<string, Beast> = {
  rat: { size: 192, fill: 0.5, scale: 1.7, idle: (c, k) => rat(c, k % 2 ? 1 : 3), walk: rat, attack: (c, k) => rat(c, k, k > 0) },
  stirge: { size: 192, fill: 0.75, scale: 1.6, idle: stirge, attack: (c, k) => stirge(c, k, k > 1) },
  giantSpider: { size: 192, fill: 0.6, scale: 1.55, idle: (c, k) => spider(c, k >> 1), walk: spider, attack: (c, k) => spider(c, k, k === 1 || k === 2) },
  gelatinousCube: { size: 192, fill: 0.62, scale: 1.3, idle: cube, attack: (c, k) => cube(c, k, k > 0) },
  mimic: { size: 192, fill: 0.5, scale: 1.4, idle: (c, k) => chest(c, [2, 3, 2, 1][k]), attack: (c, k) => chest(c, [3, 7, 9, 5][k]) },
  dragon: {
    size: 384, fill: 0.62, idle: (c, k) => dragon(c, k, "idle"), walk: (c, k) => dragon(c, k, "walk"),
    attack: (c, k) => dragon(c, k, "bite"), cast: (c, k) => dragon(c, k, "breath"),
    // Parado e soprando repetem os quadros pares e ímpares (o dragão é o quadro mais caro de desenhar).
    same: (clip, k) => (clip === "idle" || clip === "cast" ? `${clip}${k % 2}` : `${clip}${k}`),
  },
};

export const PROTO_BEASTS = Object.keys(BEASTS);
export const BEAST_CLIP_FRAMES = { idle: 4, walk: 4, attack: 4, cast: 4 } as const;
export const beastSize = (kind: string) => BEASTS[kind].size;
export const beastFill = (kind: string) => BEASTS[kind].fill;

function render(size: number, draw: () => void, c = new Canvas(size, size)) {
  draw();
  const { canvas, ctx } = makeCanvas(size, size);
  const image = ctx.createImageData(size, size);
  image.data.set(c.render(KNIGHT_LOOK));
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Um quadro do bicho, ampliado em volta do ponto do chão (`scale`). */
function beastFrame(kind: string, clip: "idle" | "walk" | "attack" | "cast", k: number) {
  const b = BEASTS[kind];
  const draw = (clip === "walk" ? b.walk : clip === "attack" ? b.attack : clip === "cast" ? b.cast : undefined) ?? b.idle;
  const c = new Canvas(b.size, b.size);
  return render(b.size, () => c.scaled([b.size / 4, ground(b.size)], b.scale ?? 1, () => draw(c, k)), c);
}

/** Os 16 quadros da folha do bicho (parado, andar, ataque e magia), um por chamada; quadros iguais saem uma vez só. */
export function protoBeastFrames(kind: string): (() => HTMLCanvasElement)[] {
  const memo = new Map<string, HTMLCanvasElement>();
  const same = BEASTS[kind].same ?? ((clip: string, k: number) => `${clip}${k}`);
  return (["idle", "walk", "attack", "cast"] as const).flatMap((clip) => [0, 1, 2, 3].map((k) => () => {
    const key = same(clip, k);
    if (!memo.has(key)) memo.set(key, beastFrame(kind, clip, k));
    return memo.get(key)!;
  }));
}

/** Folha do bicho inteira de uma vez (galeria). */
export function protoBeastSheet(kind: string) {
  const size = BEASTS[kind].size;
  const { canvas, ctx } = makeCanvas(size * 16, size);
  protoBeastFrames(kind).forEach((draw, i) => ctx.drawImage(draw(), i * size, 0));
  return canvas;
}

export const protoBeastPortrait = (kind: string) => beastFrame(kind, "idle", 0);
/** O baú fechado em que o Mímico se disfarça. */
export const protoMimicDisguise = () => { const c = new Canvas(192, 192); return render(192, () => chest(c, 0), c); };

void pbox; void lit; void leather;
