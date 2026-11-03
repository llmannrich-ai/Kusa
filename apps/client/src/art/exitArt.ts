import { HD, Paper as Painter, ellipse, limb, noise, palette, poly, type MaterialBase } from "./paint.ts";

/**
 * Saídas dos covis da Fíbula Profunda (`Lair.exit`), desenhadas por código no padrão novo (`paint.ts`): o buraco que se
 * abre no chão da cripta (lajes quebradas em volta, a escada que desce no escuro) e a boca da caverna na parede do fundo,
 * com a luz do dia lá fora: as dunas do Mar de Areia ou a mata do Bosque Velho. Só arrays: o teste `cenarios` pinta sem
 * navegador.
 */
enum X {
  Rock, RockDark, Stone, StoneDark, Pit, Void, Step, Sky, SkyHi, Sand, SandDark, Grass, GrassDark, Leaf, Bark, Dust,
}

const BASES: Record<X, MaterialBase> = {
  [X.Rock]: ["#6a5a4e", 0.85, 5], [X.RockDark]: ["#43372f", 0.8, 5], [X.Stone]: ["#8a8276", 0.75, 4], [X.StoneDark]: ["#5c564e", 0.7, 4],
  [X.Pit]: ["#241a16", 0.5, 3], [X.Void]: ["#0c0807", 0.3, 2], [X.Step]: ["#4e443c", 0.6, 4], [X.Sky]: ["#bfe0f0", 0.4, 6, true],
  [X.SkyHi]: ["#fff2c8", 0.4, 8, true], [X.Sand]: ["#e0b878", 0.55, 6], [X.SandDark]: ["#b88a52", 0.55, 6], [X.Grass]: ["#6c9a3c", 0.62, 6],
  [X.GrassDark]: ["#3e6a30", 0.62, 6], [X.Leaf]: ["#4f8a3a", 0.8, 7], [X.Bark]: ["#6a4a32", 0.9, 5], [X.Dust]: ["#c8b8a0", 0.4, 4],
};

let rampCache: ReturnType<typeof palette> | null = null;
const ramps = () => (rampCache ??= palette(Object.values(X).filter((v): v is X => typeof v === "number").map((m) => BASES[m])));

class Paper extends Painter {
  constructor(w = HD, h = HD) { super(ramps(), w, h); }
}

const MID = 0.64;
const HI = MID + 0.25;
const LO = MID - 0.25;

export const HOLE = { w: 224, h: 160 } as const;

/** O buraco no chão da cripta: lajes quebradas em volta, a borda caindo para dentro e a escada que some no escuro. */
export function floorHole(): Uint8ClampedArray {
  const p = new Paper(HOLE.w, HOLE.h);
  const X0 = HOLE.w / 2, Y0 = HOLE.h / 2 + 6;
  // Lajes soltas em volta, inclinadas para o buraco.
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + noise(k, 1, 701) * 0.3;
    const r = 74 + noise(k, 2, 702) * 16;
    const x = X0 + Math.cos(a) * r, y = Y0 + Math.sin(a) * r * 0.52;
    const s = 12 + noise(k, 3, 703) * 8;
    poly(p, [[x - s, y - s * 0.45], [x + s * 0.9, y - s * 0.55], [x + s, y + s * 0.4], [x - s * 0.8, y + s * 0.5]], k % 3 ? X.Stone : X.StoneDark,
      (_, yy) => (yy < y ? HI : MID));
  }
  // A borda: o chão que afundou, depois o fundo escuro.
  ellipse(p, X0, Y0, 76, 40, X.StoneDark);
  ellipse(p, X0, Y0 + 2, 64, 33, X.Pit);
  ellipse(p, X0, Y0 + 6, 50, 25, X.Void);
  // A escada: degraus que descem do lado de cima e somem no escuro.
  for (let k = 0; k < 5; k++) {
    const y = Y0 - 22 + k * 8, half = 26 - k * 3;
    p.fill([X0 - half, y, X0 + half, y + 4], () => true, X.Step, () => (k < 3 ? MID : LO));
  }
  // Pedrinhas que caíram na borda.
  for (let k = 0; k < 10; k++) {
    const a = noise(k, 7, 704) * Math.PI * 2;
    ellipse(p, X0 + Math.cos(a) * 60, Y0 + Math.sin(a) * 30, 3 + noise(k, 8, 705) * 3, 2.5, X.Dust);
  }
  return p.render(true);
}

export const CAVE = { w: 256, h: 288 } as const;

/**
 * A boca da caverna na parede do fundo, aberta para fora: o arco de rocha e, por ele, a luz do dia sobre a paisagem do
 * cenário que o covil abre (as dunas do Mar de Areia ou a mata do Bosque Velho), com a areia ou o capim entrando pelo
 * chão da caverna. A base do arco fica embaixo da figura (âncora em baixo, no tile da saída).
 */
export function caveExit(theme: "desert" | "forest"): Uint8ClampedArray {
  const p = new Paper(CAVE.w, CAVE.h);
  const Xc = CAVE.w / 2, Bt = CAVE.h - 22;
  // A rocha: um paredão arredondado (elipse com a borda ondulada), cortado reto no chão. Luz de cima à esquerda.
  const cy = Bt - 108, rx = 118, ry = 136;
  const inMass = (x: number, y: number) => {
    if (y > Bt) return false;
    const a = Math.atan2(y - cy, x - Xc);
    const wob = 1 + 0.05 * Math.sin(a * 5 + 1.3) + 0.03 * Math.sin(a * 11);
    return ((x - Xc) / (rx * wob)) ** 2 + ((y - cy) / (ry * wob)) ** 2 <= 1;
  };
  const rockShade = (x: number, y: number) => MID + 0.16 * (-(x - Xc) / rx) + 0.14 * (-(y - cy) / ry) + (noise(Math.floor(x / 5), Math.floor(y / 5), 721) - 0.5) * 0.08;
  p.fill([0, 0, CAVE.w - 1, CAVE.h - 1], inMass, X.Rock, rockShade);
  // A abertura: arco de meia elipse sobre pés retos, com a borda de leve ondulada; por dentro, a espessura da rocha.
  const spring = Bt - 70, half = 52, crown = 58;
  const inArch = (x: number, y: number, grow = 0) => {
    if (y > Bt) return false;
    const w = half + grow + 3 * Math.sin(y / 9);
    if (y >= spring) return Math.abs(x - Xc) <= w;
    return ((x - Xc) / w) ** 2 + ((y - spring) / (crown + grow)) ** 2 <= 1;
  };
  p.fill([0, 0, CAVE.w - 1, CAVE.h - 1], (x, y) => inArch(x, y, 7), X.RockDark, (x) => (x < Xc ? MID : LO));
  // O céu lá fora, mais claro perto do horizonte, e o sol baixo.
  p.fill([0, 0, CAVE.w - 1, CAVE.h - 1], (x, y) => inArch(x, y), X.Sky, (_, y) => (y > spring + 10 ? HI : MID + 0.12));
  p.fill([0, 0, CAVE.w - 1, CAVE.h - 1], (x, y) => inArch(x, y) && ((x - Xc - 14) / 26) ** 2 + ((y - (Bt - 52)) / 14) ** 2 <= 1, X.SkyHi, () => HI);
  // A paisagem lá fora, vista pela boca.
  if (theme === "desert") {
    p.fill([0, Bt - 50, CAVE.w - 1, Bt], (x, y) => inArch(x, y) && y > Bt - 38 + Math.sin(x / 20) * 7, X.Sand, (x) => (Math.cos(x / 20) > 0 ? HI : MID));
    p.fill([0, Bt - 30, CAVE.w - 1, Bt], (x, y) => inArch(x, y) && y > Bt - 18 + Math.sin(x / 13 + 2) * 4, X.SandDark, () => MID);
  } else {
    // Copas redondas atrás, troncos e o capim na frente.
    for (let k = 0; k < 6; k++) {
      const x = Xc - 50 + k * 20, y = Bt - 46 - noise(k, 3, 722) * 14, r = 14 + noise(k, 4, 723) * 6;
      p.fill([x - r, y - r, x + r, y + r], (px, py) => inArch(px, py) && (px - x) ** 2 + (py - y) ** 2 <= r * r, k % 2 ? X.Leaf : X.GrassDark,
        (px, py) => (px - x + py - y < 0 ? HI : MID));
    }
    for (const dx of [-26, 4, 30]) p.fill([Xc + dx - 3, Bt - 40, Xc + dx + 3, Bt], (x, y) => inArch(x, y), X.Bark, () => MID);
    p.fill([0, Bt - 22, CAVE.w - 1, Bt], (x, y) => inArch(x, y) && y > Bt - 14 + Math.sin(x / 7) * 2, X.Grass, () => HI);
  }
  // Rachaduras finas na rocha (fora da boca).
  for (let k = 0; k < 7; k++) {
    const x = 30 + noise(k, 1, 711) * (CAVE.w - 60), y = Bt - 30 - noise(k, 2, 712) * 190, len = 12 + noise(k, 3, 713) * 16;
    if (!inMass(x, y) || inArch(x, y, 12) || !inMass(x + len * 0.5, y + len)) continue;
    limb(p, [x, y], [x + len * 0.5, y + len], 1.3, 0.8, X.RockDark);
  }
  // O chão de fora entrando pela caverna: uma língua de areia ou de capim saindo da boca.
  const tongue = theme === "desert" ? X.Sand : X.Grass;
  const tongueDark = theme === "desert" ? X.SandDark : X.GrassDark;
  ellipse(p, Xc, Bt + 8, 70, 13, tongueDark);
  ellipse(p, Xc, Bt + 4, 56, 9, tongue);
  for (let k = 0; k < 6; k++) {
    const x = Xc - 66 + noise(k, 9, 718) * 132;
    ellipse(p, x, Bt + 10 + noise(k, 10, 719) * 5, 5 + noise(k, 11, 720) * 5, 2.5, theme === "desert" ? X.Sand : X.Leaf);
  }
  return p.render(true);
}

/** Para o teste `cenarios` (impressão digital de cada peça). */
export const draw = { floorHole, caveDesert: () => caveExit("desert"), caveForest: () => caveExit("forest") };
