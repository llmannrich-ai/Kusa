import type { ItemTier } from "@kusa/shared";
import { M } from "./materials.ts";
import { and, band, edge, ellipse, limb, minus, or, poly, rect, sym, type Mask } from "./raster.ts";
import type { Pose } from "./rig.ts";
import type { Ctx, HeadCover, Wear } from "./compose.ts";

/**
 * Elmos de guerra e chapéus arcanos, um desenho por item. Coordenadas na cabeça parada (centro em
 * 23.5, 15.5); `at(p)` desloca para o balanço do passo. O que cada um cobre está em `headCover`.
 */

type Tex = (x: number, y: number) => number;
const chain: Tex = (x, y) => ((x + y) % 2 === 0 ? -1 : 0);
const scales: Tex = (x, y) => {
  const k = (x + (Math.floor(y / 2) % 2) * 2 + 64) % 4;
  if (y % 2 === 1) return k === 0 || k === 3 ? -1 : 0;
  return k === 1 ? 1 : 0;
};

/** Linha `v` da cabeça parada no quadro (com o balanço). */
const at = (p: Pose) => (v: number) => p.head[1] - 15.5 + v;
const mirrorPts = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [47 - x, y]);

/** Capuz: cobre a cabeça e os ombros, com a abertura do rosto. */
function hood(c: Ctx, mat: number, o: { tip?: boolean; trim?: number; tex?: Tex } = {}): Mask {
  const { cv, p } = c;
  const [hx, hy] = p.head;
  const y = at(p);
  const outer = ellipse(hx + (p.dir === "side" ? 1 : 0), hy - 0.2, 9.2, 8.6);
  let m: Mask;
  let opening: Mask | null = null;
  if (p.dir === "down") {
    opening = ellipse(hx, hy + 2.6, 6.4, 6.2);
    m = minus(or(outer, sym(Math.round(y(20)), [8, 8.5, 8.5])), opening);
  } else if (p.dir === "up") {
    m = or(outer, sym(Math.round(y(20)), [8, 8.5, 8.5]));
    if (o.tip) m = or(m, poly([[21, y(22)], [26.99, y(22)], [24, y(29)]]));
  } else {
    opening = ellipse(hx - 3.2, hy + 2.5, 5.4, 6);
    m = minus(or(outer, poly([[25, y(18)], [33, y(16)], [31, y(25)], [24, y(24)]])), opening);
    if (o.tip) m = or(m, poly([[29, y(10)], [35, y(14)], [36, y(21)], [31, y(17)]]));
  }
  cv.paint(m, mat, { light: "sphere", tex: o.tex ?? ((x, yy) => ((x + yy * 2) % 9 === 0 ? -1 : 0)) });
  if (o.trim && opening) {
    const rim = p.dir === "side" ? ellipse(hx - 3.2, hy + 2.5, 6.4, 7) : ellipse(hx, hy + 2.6, 7.4, 7.2);
    cv.paint(and(m, minus(rim, opening)), o.trim, { group: "keep", light: "flat", bevel: false });
  }
  return m;
}

/** Chapéu de mago: copa em cone (ponta curvada para `bend`) e aba. */
function wizardHat(c: Ctx, mat: number, o: { brim: number; tall: number; bend: number; band: number; bandT?: number }) {
  const { cv, p } = c;
  const [hx] = p.head;
  const y = at(p);
  const s = p.dir === "side";
  const top = 12 - o.tall;
  const tipX = hx + o.bend * (s ? 1.4 : 1);
  const cone = poly([
    [s ? 16.5 : 16, y(12)], [s ? 31 : 31.99, y(12)],
    [hx + 3.6, y(12 - o.tall * 0.45)], [tipX + 1.2, y(top + 2)], [tipX + o.bend * 0.6, y(top)],
    [tipX - 1, y(top + 1.5)], [hx - 2.6, y(12 - o.tall * 0.5)],
  ]);
  cv.paint(cone, mat, { light: "cyl" });
  cv.paint(band(cone, Math.round(y(10)), Math.round(y(11))), o.band, { group: "keep", light: "row", spec: true, t: o.bandT });
  const brim = s ? ellipse(hx - 0.5, y(12), o.brim - 0.5, 2.2) : ellipse(hx, y(12), o.brim, 2.4);
  cv.paint(brim, mat, { light: "row" });
  return cone;
}

const WAR_HELMETS: Record<ItemTier, Wear> = {
  // Gorro de couro: touca com abas sobre as orelhas e costura no meio.
  1: {
    head(c) {
      const { cv, p } = c;
      const [hx] = p.head;
      const y = at(p);
      const dome = and(ellipse(hx, y(14.5), 8.8, 7.6), rect(0, 0, 47, y(13)));
      let m: Mask;
      if (p.dir === "down") m = or(dome, and(or(rect(15, y(12), 17, y(19)), rect(30, y(12), 32, y(19))), ellipse(hx, y(15.5), 9.3, 9)));
      else if (p.dir === "up") m = and(ellipse(hx, y(15), 8.8, 7.8), rect(0, 0, 47, y(20)));
      else m = or(dome, poly([[22, y(10)], [32, y(10)], [32, y(19)], [23, y(19.5)]]));
      cv.paint(m, M.leather, { light: "sphere", tex: (x) => (p.dir !== "side" && x === 24 ? -1 : 0) });
      cv.paint(and(edge(m, "bottom"), m), M.darkLeather, { group: "keep", light: "row" });
    },
  },
  // Elmo de bronze: aberto, com protetores de bochecha e crista de crina vermelha.
  2: {
    head(c) {
      const { cv, p } = c;
      const [hx] = p.head;
      const y = at(p);
      const dome = and(ellipse(hx, y(14), 8.9, 7.6), rect(0, 0, 47, y(13.5)));
      let m: Mask;
      let crest: Mask;
      if (p.dir === "side") {
        m = or(dome, poly([[19, y(13)], [24, y(13)], [23, y(20.5)], [20, y(20)]]), poly([[26, y(12)], [32, y(12)], [33, y(19.5)], [28, y(18)]]));
        crest = poly([[17, y(8)], [20, y(4)], [27, y(3)], [33, y(5)], [35, y(11)], [31, y(8)], [26, y(6.5)], [21, y(7.5)]]);
      } else {
        const cheek: [number, number][] = [[15, y(12)], [18.5, y(12)], [19, y(20.5)], [16, y(19)]];
        m = p.dir === "down" ? or(dome, poly(cheek), poly(mirrorPts(cheek))) : and(ellipse(hx, y(15), 8.9, 7.8), rect(0, 0, 47, y(20)));
        crest = or(ellipse(hx, y(6.2), 1.9, 3.9), ellipse(hx, y(8.5), 1.5, 2));
      }
      cv.paint(crest, M.plumeRed, { light: "cyl", tex: (x, yy) => ((x + yy) % 3 === 0 ? -1 : 0) });
      cv.paint(m, M.bronze, { light: "sphere", spec: true });
      cv.paint(and(m, rect(0, Math.round(y(12)), 47, Math.round(y(13)))), M.bronze, { group: "keep", light: "row", t: 2 });
    },
  },
  // Elmo de ferro: cônico, com rebites, protetor de nariz e malha pendurada na nuca.
  3: {
    head(c) {
      const { cv, p } = c;
      const [hx] = p.head;
      const y = at(p);
      const s = p.dir === "side";
      const aventail = s
        ? poly([[22, y(13)], [32, y(12)], [32.5, y(21.5)], [23, y(21)]])
        : p.dir === "up" ? sym(Math.round(y(13)), [8.6, 8.6, 8.6, 8.4, 8.2, 8, 7.8, 7.6, 7.4, 7])
          : or(rect(15, y(13), 17, y(21)), rect(30, y(13), 32, y(21)));
      cv.paint(aventail, M.iron, { tex: chain });
      const cone: [number, number][] = s
        ? [[15.5, y(13.5)], [16.5, y(9)], [20, y(5.5)], [24.5, y(3.5)], [28.5, y(6)], [31.5, y(10)], [32, y(13.5)]]
        : [[15, y(13.5)], [16, y(9)], [19.5, y(5.5)], [23.5, y(3.5)], [27.5, y(5.5)], [31, y(9)], [32, y(13.5)]];
      const dome = poly(cone);
      cv.paint(dome, M.iron, { light: "sphere", spec: true });
      const brow = and(dome, rect(0, Math.round(y(12)), 47, Math.round(y(13))));
      cv.paint(brow, M.darkIron, { group: "keep", light: "row" });
      if (!s) cv.paint(and(dome, rect(23, 0, 24, 47)), M.darkIron, { group: "keep", light: "flat", bevel: false });
      for (const x of s ? [18, 22, 26, 30] : [17, 20, 27, 30]) cv.dot(x, Math.round(y(12)), M.steel, 5);
      if (p.dir === "down") cv.paint(rect(23, y(13), 24, y(18)), M.iron, { light: "flat", spec: true });
      if (s) cv.paint(rect(15, y(13), 16, y(18)), M.iron, { light: "flat", spec: true });
    },
  },
  // Elmo de mithral: fechado, com viseira, quilha no meio e penacho de penas azuis.
  4: {
    head(c) {
      const { cv, p } = c;
      const [hx] = p.head;
      const y = at(p);
      const s = p.dir === "side";
      const plume = s
        ? poly([[22, y(8)], [25, y(3.5)], [31, y(2.5)], [36, y(5)], [34, y(9)], [29, y(6.5)], [25, y(8)]])
        : or(ellipse(hx + 1, y(5.5), 2.4, 3.3), ellipse(hx + 3, y(4.2), 1.8, 2));
      cv.paint(plume, M.plumeBlue, { light: "cyl", tex: (x, yy) => ((x - yy) % 3 === 0 ? -1 : (x + yy) % 5 === 0 ? 1 : 0) });
      const helm = and(ellipse(hx + (s ? 0.5 : 0), y(15), 8.8, 8.3), rect(0, 0, 47, y(22)));
      cv.paint(helm, M.mithral, { light: "sphere", spec: true, tex: s ? undefined : (x) => (x === 23 ? 1 : x === 24 ? -1 : 0) });
      cv.paint(and(edge(helm, "bottom"), helm), M.gold, { group: "keep", light: "row", spec: true });
      if (p.dir === "down") {
        cv.paint(rect(18, y(16), 29, y(16)), M.shadow, { group: "keep", light: "flat", bevel: false, t: 1 });
        cv.paint(rect(17, y(14), 30, y(14)), M.mithral, { group: "keep", light: "flat", bevel: false, t: 2 });
        for (const x of [20, 22, 25, 27]) cv.dot(x, Math.round(y(19)), M.shadow, 1);
      } else if (s) {
        cv.paint(rect(16, y(16), 21, y(16)), M.shadow, { group: "keep", light: "flat", bevel: false, t: 1 });
        for (const x of [17, 19]) cv.dot(x, Math.round(y(19)), M.shadow, 1);
      }
    },
  },
  // Elmo do dragão: fechado, de escamas, mandíbula dourada, olhos em brasa e chifres de marfim.
  5: {
    head(c) {
      const { cv, p } = c;
      const [hx] = p.head;
      const y = at(p);
      const s = p.dir === "side";
      const horn: [number, number][] = s
        ? [[26, y(9)], [30, y(5.5)], [34, y(4.5)], [37, y(6.5)]]
        : [[17.5, y(10)], [14.5, y(7.5)], [13, y(4.5)], [14, y(2.5)]];
      cv.paint(limb(horn, 1.25), M.ivory, { light: "cyl", tex: (_x, yy) => (yy % 2 ? -1 : 0) });
      if (!s) cv.paint(limb(mirrorPts(horn), 1.25), M.ivory, { light: "cyl", tex: (_x, yy) => (yy % 2 ? -1 : 0) });
      const helm = and(ellipse(hx + (s ? 0.5 : 0), y(15), 8.8, 8.3), rect(0, 0, 47, y(22)));
      cv.paint(helm, M.dragon, { light: "sphere", tex: scales });
      cv.paint(and(helm, rect(0, Math.round(y(12)), 47, Math.round(y(12)))), M.gold, { group: "keep", light: "row", spec: true });
      if (p.dir === "down") {
        for (const x of [19, 20, 27, 28]) cv.dot(x, Math.round(y(16)), M.fire, x === 19 || x === 28 ? 3 : 4);
        const jaw = rect(18, Math.round(y(19)), 29, Math.round(y(20)));
        cv.paint(jaw, M.gold, { group: "keep", light: "row", spec: true });
        for (let x = 19; x <= 28; x += 2) cv.dot(x, Math.round(y(20)), M.ivory, 4);
      } else if (s) {
        cv.dot(17, Math.round(y(16)), M.fire, 4); cv.dot(18, Math.round(y(16)), M.fire, 3);
        cv.paint(rect(16, Math.round(y(19)), 22, Math.round(y(20))), M.gold, { group: "keep", light: "row", spec: true });
      }
    },
  },
};

const ARCANE_HATS: Record<ItemTier, Wear> = {
  // Capuz de lã: lã marrom grossa caindo nos ombros.
  1: { head(c) { hood(c, M.woolBrown, { tex: (x, y) => ((x + y) % 4 === 0 ? -1 : 0) }); } },
  // Chapéu pontudo: lã azul com a ponta caída, faixa de couro e fivela de bronze.
  2: {
    head(c) {
      const cone = wizardHat(c, M.wool, { brim: 11, tall: 9, bend: 3, band: M.leather });
      const { p } = c;
      const y = at(p);
      if (p.dir !== "up") {
        const x = p.dir === "side" ? 19 : 26;
        c.cv.paint(rect(x, Math.round(y(10)), x + 1, Math.round(y(11))), M.bronze, { light: "flat", spec: true, line: "soft" });
      }
      void cone;
    },
  },
  // Capuz rúnico: seda roxa com runas acesas em volta do rosto e a ponta caída nas costas.
  3: {
    head(c) {
      const { cv, p } = c;
      hood(c, M.runeCloth, { tip: true, trim: M.sorcDeep });
      if (p.dir === "up") return;
      const [hx, hy] = p.head;
      const cx = p.dir === "side" ? hx - 3.2 : hx;
      const cy = p.dir === "side" ? hy + 2.5 : hy + 2.6;
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.95 + k * 0.14);
        const x = Math.round(cx + Math.cos(a) * (p.dir === "side" ? 6 : 7));
        const yy = Math.round(cy + Math.sin(a) * 6.8);
        if (k % 2 === 0) cv.dot(x, yy, M.rune, 4);
      }
    },
  },
  // Chapéu do mago: aba larga, copa alta prateada com estrelas e faixa de safira.
  4: {
    head(c) {
      const cone = wizardHat(c, M.silk, { brim: 13, tall: 9.5, bend: -3.5, band: M.sapphire, bandT: 2 });
      for (let i = 0; i < cone.length; i++) {
        if (!cone[i]) continue;
        const x = i % 48, y = Math.floor(i / 48);
        if ((x * 7 + y * 5) % 23 === 0) c.cv.dot(x, y, M.star, 4);
      }
    },
  },
  // Coroa de chifres de dragão: aro de ouro com rubi e chifres de marfim.
  5: {
    head(c) {
      const { cv, p } = c;
      const [hx, hy] = p.head;
      const y = at(p);
      const s = p.dir === "side";
      const horns: [number, number][][] = s
        ? [[[22, y(10)], [24.5, y(5.5)], [28.5, y(3.2)], [31, y(3.5)]], [[26, y(10)], [28, y(7)], [30.5, y(6.5)]]]
        : [[[18, y(10.5)], [16.5, y(7.5)], [17, y(4.5)], [18.5, y(2.8)]], [[21, y(9.5)], [20.5, y(6)]]];
      const all = s ? horns : [...horns, ...horns.map(mirrorPts)];
      all.forEach((pts, i) => cv.paint(limb(pts, i % 2 && !s ? 0.85 : 1.1), M.ivory, { light: "cyl", tex: (_x, yy) => (yy % 2 ? -1 : 0) }));
      const circlet = minus(and(ellipse(hx, hy - 0.5, 8.6, 7.9), rect(0, Math.round(y(10.5)), 47, Math.round(y(12)))), s ? rect(0, 0, 15, 47) : rect(0, 0, 0, 0));
      cv.paint(circlet, M.gold, { light: "row", spec: true });
      if (p.dir !== "up") cv.paint(ellipse(s ? 17.5 : hx, y(11.2), 1.1, 1), M.ruby, {});
    },
  },
};

export function helmetWear(family: string, tier: ItemTier): Wear {
  return family === "helmet-arcane" ? ARCANE_HATS[tier] : WAR_HELMETS[tier];
}

/** O que cada capacete cobre. */
export function headCover(family: string, tier: ItemTier): HeadCover {
  if (family === "helmet-arcane") {
    if (tier === 1 || tier === 3) return { hair: true, sides: true, face: false };
    if (tier === 5) return { hair: false, sides: false, face: false };
    return { hair: true, sides: false, face: false };
  }
  if (tier >= 4) return { hair: true, sides: true, face: true };
  return { hair: true, sides: true, face: false };
}
