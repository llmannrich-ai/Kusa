import type { ItemTier } from "@kusa/shared";
import { M } from "./materials.ts";
import {
  and, band, edge, ellipse, grow, limb, minus, or, poly, rect, spans, sym, type Mask,
} from "./raster.ts";
import type { Arm, Leg, Pose } from "./rig.ts";
import type { Ctx, Wear } from "./compose.ts";
import { beltMask, hem, limbDark, skirt } from "./look.ts";

/**
 * Armaduras, mantos, calças e botas vestidos (um desenho por item, igual em qualquer classe).
 * Cada peça pinta sobre as formas do esqueleto (`rig.ts`): tronco, braços, pernas e pés.
 */

// --- Padrões (ajuste de tom por pixel) -----------------------------------------------------

type Tex = (x: number, y: number) => number;

/** Acolchoado em losangos. */
const quilt: Tex = (x, y) => ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0 ? -1 : 0);
/** Malha de anéis. */
const chain: Tex = (x, y) => ((x + y) % 2 === 0 ? -1 : (x * 3 + y) % 7 === 0 ? 1 : 0);
/** Escamas em fileiras desencontradas: borda escura embaixo de cada uma e brilho em cima. */
const scales: Tex = (x, y) => {
  const k = (x + (Math.floor(y / 2) % 2) * 2 + 64) % 4;
  if (y % 2 === 1) return k === 0 || k === 3 ? -1 : 0;
  return k === 1 ? 1 : 0;
};
/** Lâminas horizontais (placas articuladas). */
const lames = (step: number): Tex => (_x, y) => (y % step === 0 ? -1 : 0);
/** Dobras verticais de tecido. */
const folds: Tex = (x) => (x % 5 === 0 ? -1 : 0);

/** O padrão acompanha o balanço do corpo (não "escorrega" no passo). */
const moving = (p: Pose, t: Tex): Tex => (x, y) => t(x, y - p.bob);

const front = (p: Pose) => p.dir === "down";
const side = (p: Pose) => p.dir === "side";

/** Fivela no centro do cinto (de frente) ou na lateral (de lado). */
function buckle(c: Ctx, mat: number, gem?: number) {
  const { cv, p } = c;
  if (p.dir === "up") return;
  const x = front(p) ? 23 : 19;
  cv.paint(rect(x, p.waist, x + 1, p.waist + 1), mat, { light: "flat", spec: true, line: "soft" });
  if (gem) cv.dot(x, p.waist, gem, 4);
}

function belt(c: Ctx, mat: number, buckleMat: number, gem?: number) {
  c.cv.paint(beltMask(c.p), mat, { light: "row" });
  buckle(c, buckleMat, gem);
}

/** Ombreiras em lâminas empilhadas sobre os ombros (de lado, só a do braço de cá). */
function pauldron(c: Ctx, mat: number, layers: number, o: { trim?: number; spikes?: number; size?: number } = {}) {
  const { cv, p } = c;
  const size = o.size ?? 1;
  const xs = side(p) ? [24] : [15.5, 31.5];
  for (const cx of xs) {
    const out = side(p) ? 0 : cx < 24 ? -1 : 1;
    if (o.spikes) {
      for (const k of [0, 1]) {
        const bx = cx + out * (0.5 + k * 1.5) - (side(p) ? 1 + k * 2 : 0);
        cv.paint(limb([[bx, p.shoulder], [bx + out * 1.2 - (side(p) ? 1 : 0), p.shoulder - 3.5 + k]], 0.75), o.spikes, { light: "cyl" });
      }
    }
    for (let i = layers - 1; i >= 0; i--) {
      const m = ellipse(cx + out * 0.4, p.shoulder + 0.8 + i * 1.6, (3.3 - i * 0.25) * size, (2.3 - i * 0.2) * size);
      cv.paint(m, mat, { light: "sphere", spec: mat !== M.leather && mat !== M.dragon && mat !== M.dragonDark });
      if (i === 0 && o.trim) cv.paint(hem(m), o.trim, { group: "keep", light: "row", spec: true });
    }
  }
}

/** Manga de armadura: braço de cima (e o antebraço, se `fore`), com textura. */
function armPiece(c: Ctx, arm: Arm, mat: number, o: { fore?: boolean; upper?: boolean; tex?: Tex; spec?: boolean; capOnly?: number } = {}) {
  const parts: Mask[] = [];
  if (o.upper !== false) parts.push(o.capOnly ? band(arm.upper, 0, Math.round(arm.shoulder[1] + o.capOnly)) : arm.upper);
  if (o.fore) parts.push(arm.fore);
  c.cv.paint(or(...parts), mat, { dark: limbDark(arm.far), tex: o.tex ? moving(c.p, o.tex) : undefined, spec: o.spec });
}

/** Manopla: a mão vira metal. */
function gauntlet(c: Ctx, arm: Arm, mat: number) {
  c.cv.paint(arm.handMask, mat, { light: "sphere", dark: limbDark(arm.far), spec: true });
}

/** Tronco da armadura até `bottom` (saia junto). */
function body(p: Pose, bottom: number, flare = 0.5): Mask {
  return bottom > p.waist ? or(p.torso, skirt(p, bottom, flare)) : p.torso;
}

// --- Armaduras de guerra ----------------------------------------------------------------------

const WAR_ARMOR: Record<ItemTier, Wear> = {
  // Gibão de couro: acolchoado em losangos, amarração cruzada no peito e mangas curtas.
  1: {
    torso(c) {
      const { cv, p } = c;
      cv.paint(body(p, p.hip + 1), M.leather, { tex: moving(p, quilt) });
      cv.paint(band(p.torso, p.neck, p.neck), M.darkLeather, { group: "keep", light: "row" });
      if (front(p)) {
        for (let y = p.shoulder; y < p.waist; y++) {
          cv.dot((y - p.bob) % 2 ? 23 : 24, y, M.rope, 4);
          cv.dot((y - p.bob) % 2 ? 24 : 23, y, M.darkLeather, 1);
        }
      }
      belt(c, M.darkLeather, M.iron);
    },
    arm(c, arm) { armPiece(c, arm, M.leather, { capOnly: 3, tex: quilt }); },
  },
  // Couraça de bronze: peitoral modelado, saiote de tiras de couro e correias nos ombros.
  2: {
    torso(c) {
      const { cv, p } = c;
      const b = p.bob;
      const strips = skirt(p, p.hip + 3, 1.2, p.waist + 1);
      cv.paint(strips, M.leather, { tex: (x) => (x % 2 ? -1 : 0) });
      cv.paint(edge(strips, "bottom"), M.bronze, { group: "keep", light: "row", spec: true });
      const chest = band(p.torso, p.neck, p.waist);
      cv.paint(chest, M.bronze, {
        spec: true,
        tex: front(p) ? (x, y) => {
          const yy = y - b;
          if (yy === 27 && x !== 23 && x !== 24 && x > 18 && x < 29) return -1;
          if (yy > 27 && (x === 24) ) return -1;
          if ((yy === 25 || yy === 26) && (x === 20 || x === 26)) return 1;
          return 0;
        } : undefined,
      });
      if (p.dir !== "side") {
        for (const x of [19, 27]) cv.paint(rect(x, p.neck, x + 1, p.shoulder), M.darkLeather, { light: "flat", line: "soft" });
      }
      belt(c, M.darkLeather, M.bronze);
    },
    arm(c, arm) {
      const y = Math.round(arm.elbow[1]) + 2;
      c.cv.paint(and(arm.fore, rect(0, y, 47, y + 1)), M.bronze, { dark: limbDark(arm.far), light: "row", spec: true });
    },
  },
  // Cota de malha: malha até o meio da coxa, mangas até o cotovelo e ombreiras pequenas.
  3: {
    torso(c) {
      const { cv, p } = c;
      const m = body(p, p.hip + 4, 1.2);
      cv.paint(m, M.iron, { tex: moving(p, chain) });
      cv.paint(hem(m), M.darkIron, { group: "keep", light: "row" });
      belt(c, M.darkLeather, M.iron);
    },
    arm(c, arm) { armPiece(c, arm, M.iron, { tex: chain }); },
    over(c) { pauldron(c, M.iron, 1, { size: 0.85 }); },
  },
  // Placas de mithral: peitoral com quilha, faldas articuladas, gola, ombreiras grandes, braçais e manoplas.
  4: {
    torso(c) {
      const { cv, p } = c;
      const faulds = skirt(p, p.hip + 2, 1, p.waist);
      cv.paint(faulds, M.mithral, { spec: true, tex: moving(p, lames(2)) });
      cv.paint(edge(faulds, "bottom"), M.gold, { group: "keep", light: "row", spec: true });
      const chest = band(grow(p.torso), p.neck + 1, p.waist - 1);
      cv.paint(chest, M.mithral, {
        spec: true,
        tex: front(p) ? (x) => (x === 23 ? 1 : x === 24 ? -1 : 0) : undefined,
      });
      cv.paint(edge(chest, "bottom"), M.gold, { group: "keep", light: "row", spec: true });
      cv.paint(band(p.torso, p.neck, p.neck + 1), M.mithral, { light: "row", spec: true });
      if (front(p)) cv.paint(ellipse(23.5, p.shoulder + 2.5, 1.1, 1.1), M.sapphire, {});
    },
    arm(c, arm) {
      armPiece(c, arm, M.mithral, { fore: true, spec: true, tex: lames(3) });
      c.cv.paint(ellipse(arm.elbow[0], arm.elbow[1] + 0.5, 1.9, 1.4), M.mithral, { light: "sphere", spec: true, dark: limbDark(arm.far) });
      gauntlet(c, arm, M.mithral);
    },
    over(c) { pauldron(c, M.mithral, 3, { trim: M.gold }); },
  },
  // Escamas de dragão: escamas rubras com guarnição de ouro, ombreiras com espinhos de marfim.
  5: {
    torso(c) {
      const { cv, p } = c;
      const m = body(p, p.hip + 3, 1);
      cv.paint(m, M.dragon, { tex: moving(p, scales) });
      cv.paint(hem(m), M.gold, { group: "keep", light: "row", spec: true });
      cv.paint(band(p.torso, p.neck, p.neck), M.gold, { light: "row", spec: true, line: "soft" });
      cv.paint(beltMask(p), M.dragonDark, { light: "row" });
      buckle(c, M.gold, M.ruby);
    },
    arm(c, arm) {
      armPiece(c, arm, M.dragon, { fore: true, tex: scales });
      gauntlet(c, arm, M.dragonDark);
    },
    over(c) { pauldron(c, M.dragonDark, 2, { trim: M.gold, spikes: M.ivory }); },
  },
};

// --- Mantos arcanos ---------------------------------------------------------------------------

/** Túnica do manto: tronco e saia até `bottom`, abrindo `flare`. */
function robeBody(c: Ctx, mat: number, bottom: number, flare: number, tex?: Tex) {
  const { cv, p } = c;
  const m = or(p.torso, skirt(p, bottom + p.bob, flare));
  cv.paint(m, mat, { tex: tex ? moving(p, tex) : undefined });
  return m;
}

/** Manga larga que abre no punho. */
function wideSleeve(c: Ctx, arm: Arm, mat: number, cuff?: number, tex?: Tex) {
  const { cv } = c;
  const [hx, hy] = arm.hand;
  const bell = ellipse(hx + (arm.far ? 0 : 0), hy - 2.2, 2.9, 1.8);
  const m = minus(or(arm.upper, arm.fore, bell), arm.handMask);
  cv.paint(m, mat, { dark: limbDark(arm.far), tex: tex ? moving(c.p, tex) : undefined });
  if (cuff) cv.paint(hem(m), cuff, { group: "keep", dark: limbDark(arm.far), light: "row" });
}

/** Capa atrás do corpo (de frente aparece nas bordas; de lado, atrás; de costas, por cima). */
function capeMask(p: Pose, bottom: number): Mask {
  if (p.dir === "side") {
    const sway = p.frame === 0 ? 0 : 1;
    return poly([[24, p.neck], [30, p.neck + 1], [33 + sway, bottom], [26, bottom + 0.99], [25, p.shoulder + 4]]);
  }
  return sym(p.neck, Array.from({ length: bottom - p.neck + 1 }, (_, i) => 6 + Math.min(4, i * 0.35)));
}

const ARCANE_ROBE: Record<ItemTier, Wear> = {
  // Túnica de linho: tecido cru com dobras e cordão amarrado na cintura.
  1: {
    torso(c) {
      const { cv, p } = c;
      robeBody(c, M.linen, 39, 1.5, folds);
      cv.paint(beltMask(p, 1), M.rope, { light: "row" });
      if (p.dir !== "up") {
        const x = front(p) ? 21 : 20;
        cv.paint(limb([[x, p.waist + 1], [x - 0.5, p.waist + 4]], 0.6), M.rope, { light: "flat", line: "soft" });
      }
    },
    arm(c, arm) { wideSleeve(c, arm, M.linen); },
  },
  // Manto de viagem: lã azul com faixa dourada, capinha nos ombros, capuz caído nas costas e bolsa.
  2: {
    torso(c) {
      const { cv, p } = c;
      const m = robeBody(c, M.wool, 39, 1.5, folds);
      cv.paint(hem(m), M.gold, { group: "keep", light: "row", spec: true });
      belt(c, M.leather, M.bronze);
      if (front(p)) cv.paint(rect(27, p.waist + 1, 28, p.waist + 3), M.leather, { light: "flat", line: "hard" });
    },
    arm(c, arm) { wideSleeve(c, arm, M.wool, M.gold); },
    over(c) {
      const { cv, p } = c;
      const capelet = side(p)
        ? and(ellipse(24.5, p.shoulder, 6, 4.5), rect(0, p.neck, 47, 47))
        : and(ellipse(23.5, p.shoulder - 0.5, 10.5, 5), rect(0, p.neck, 47, 47));
      cv.paint(capelet, M.wool, { t: 2, light: "sphere" });
      cv.paint(hem(capelet), M.gold, { group: "keep", light: "row" });
    },
    cape(c) {
      const { cv, p } = c;
      const hood = ellipse(23.5, p.shoulder + 3, 6, 4.2);
      cv.paint(hood, M.wool, { t: 2, light: "sphere" });
      cv.paint(ellipse(23.5, p.shoulder + 2.5, 3.6, 2.2), M.wool, { t: 1, group: "keep", light: "flat", bevel: false });
    },
  },
  // Manto rúnico: seda roxa com runas acesas na barra e na frente, faixa escura e mangas largas.
  3: {
    torso(c) {
      const { cv, p } = c;
      const m = robeBody(c, M.runeCloth, 40, 2);
      const hemBand = hem(m, 2);
      cv.paint(hemBand, M.sorcDeep, { group: "keep", light: "row" });
      const glyph = (x: number) => (x % 3 === 0);
      for (let i = 0; i < hemBand.length; i++) {
        if (hemBand[i] && glyph(i % 48) && Math.floor(i / 48) % 2 === (p.bob + 1) % 2) cv.dot(i % 48, Math.floor(i / 48), M.rune, 4);
      }
      if (front(p)) {
        cv.paint(rect(23, p.neck + 1, 24, 40 + p.bob - 2), M.sorcDeep, { group: "keep", light: "flat", bevel: false });
        for (let y = p.shoulder; y < 38 + p.bob; y += 3) cv.dot(23 + ((y >> 1) % 2), y, M.rune, 4);
      }
      cv.paint(beltMask(p), M.sorcDeep, { light: "row" });
    },
    arm(c, arm) {
      wideSleeve(c, arm, M.runeCloth, M.sorcDeep);
      const [hx, hy] = arm.hand;
      if (!arm.far) c.cv.dot(Math.round(hx - 0.5), Math.round(hy - 3), M.rune, 4);
    },
  },
  // Vestes de mithral: seda prateada longa, gola alta, barra azul e fecho de safira.
  4: {
    back(c) {
      const { cv, p } = c;
      if (p.dir === "up") return;
      const y = p.neck;
      const collar = side(p)
        ? poly([[24, y + 2], [27, y - 6], [30, y - 4], [29, y + 3]])
        : or(poly([[18, y + 2], [14, y - 5], [16.5, y - 6], [20, y]]), poly([[29.99, y + 2], [33.99, y - 5], [31.5, y - 6], [28, y]]));
      cv.paint(collar, M.silk, { light: "cyl" });
      cv.paint(edge(collar, "top"), M.plumeBlue, { group: "keep", light: "row" });
    },
    torso(c) {
      const { cv, p } = c;
      const m = robeBody(c, M.silk, 41, 2.2, folds);
      cv.paint(hem(m, 2), M.plumeBlue, { group: "keep", light: "row" });
      if (front(p)) {
        cv.paint(rect(23, p.neck, 24, 41 + p.bob - 2), M.plumeBlue, { group: "keep", light: "flat", bevel: false, t: 2 });
        cv.paint(ellipse(23.5, p.shoulder + 2, 1.2, 1.2), M.sapphire, {});
      }
      cv.paint(beltMask(p, 1), M.gold, { light: "row", spec: true });
    },
    arm(c, arm) { wideSleeve(c, arm, M.silk, M.plumeBlue, folds); },
    cape(c) {
      const { cv, p } = c;
      cv.paint(sym(p.neck - 3, [6, 7, 7, 6.5]), M.silk, { light: "cyl" });
    },
  },
  // Manto de seda de dragão: seda rubra com guarnição de ouro, mantelete de escamas e capa.
  5: {
    back(c) {
      const { cv, p } = c;
      if (p.dir === "up") return;
      cv.paint(capeMask(p, 43), M.dragonSilk, { t: 2, tex: folds });
    },
    torso(c) {
      const { cv, p } = c;
      const m = robeBody(c, M.dragonSilk, 40, 2);
      cv.paint(hem(m, 2), M.gold, { group: "keep", light: "row", spec: true });
      if (front(p)) cv.paint(rect(23, p.neck, 24, 40 + p.bob - 2), M.gold, { group: "keep", light: "flat", bevel: false, spec: true });
      cv.paint(beltMask(p), M.dragonDark, { light: "row" });
      buckle(c, M.gold, M.ruby);
    },
    arm(c, arm) { wideSleeve(c, arm, M.dragonSilk, M.gold); },
    over(c) {
      const { cv, p } = c;
      const mantle = side(p)
        ? and(ellipse(24.5, p.shoulder, 6, 4.2), rect(0, p.neck, 47, 47))
        : and(ellipse(23.5, p.shoulder - 0.5, 10, 4.6), rect(0, p.neck, 47, 47));
      cv.paint(mantle, M.dragon, { light: "sphere", tex: moving(p, scales) });
      cv.paint(hem(mantle), M.gold, { group: "keep", light: "row", spec: true });
      if (front(p)) cv.paint(ellipse(23.5, p.neck + 1.5, 1.3, 1.2), M.ruby, {});
    },
    cape(c) {
      const { cv, p } = c;
      const m = capeMask(p, 43);
      cv.paint(m, M.dragonSilk, { tex: folds });
      cv.paint(hem(m), M.gold, { group: "keep", light: "row", spec: true });
      cv.paint(and(ellipse(23.5, p.shoulder - 0.5, 10, 4.6), rect(0, p.neck, 47, 47)), M.dragon, { light: "sphere", tex: moving(p, scales) });
    },
  },
};

// --- Calças ------------------------------------------------------------------------------------

/** Pinta a perna inteira (coxa, canela e a bacia) com um material. */
function legCloth(c: Ctx, leg: Leg, mat: number, tex?: Tex, o: { t?: number; loose?: boolean } = {}) {
  const shin = o.loose ? or(leg.shin, limb([[leg.knee[0], leg.knee[1] + 1], leg.ankle], 2.7)) : leg.shin;
  const m = minus(or(leg.thigh, shin, c.p.pelvis), leg.foot);
  return c.cv.paint(m, mat, { dark: limbDark(leg.far), tex: tex ? moving(c.p, tex) : undefined, t: o.t });
}

/** Joelheira: elipse no joelho. */
function kneeCop(c: Ctx, leg: Leg, mat: number, r = 2, spike?: number) {
  const [kx, ky] = leg.knee;
  const m = ellipse(kx + (side(c.p) ? -0.8 : 0), ky + 0.3, r, r * 0.8);
  c.cv.paint(m, mat, { light: "sphere", spec: mat !== M.darkLeather && mat !== M.leather, dark: limbDark(leg.far) });
  if (spike) c.cv.paint(limb([[kx - (side(c.p) ? 2 : 0), ky], [kx - (side(c.p) ? 3.5 : 0), ky + (side(c.p) ? -0.5 : 1.8)]], 0.6), spike, { light: "flat", dark: limbDark(leg.far) });
}

const WAR_LEGS: Record<ItemTier, Wear> = {
  // Calças de couro com joelheiras de couro escuro.
  1: {
    leg(c, leg) {
      legCloth(c, leg, M.leather, (x) => (x % 6 === 0 ? -1 : 0));
      kneeCop(c, leg, M.darkLeather, 1.9);
    },
  },
  // Perneiras de bronze: placas nas coxas e joelheiras redondas sobre calça escura.
  2: {
    leg(c, leg) {
      legCloth(c, leg, M.darkLeather);
      c.cv.paint(minus(leg.thigh, c.p.pelvis), M.bronze, { spec: true, dark: limbDark(leg.far) });
      kneeCop(c, leg, M.bronze, 2.2);
    },
  },
  // Perneiras de malha: a perna inteira em malha.
  3: {
    leg(c, leg) {
      legCloth(c, leg, M.iron, chain);
      kneeCop(c, leg, M.iron, 1.8);
    },
  },
  // Coxotes de mithral: placas articuladas na coxa, joelheira com asa e malha na canela.
  4: {
    leg(c, leg) {
      legCloth(c, leg, M.iron, chain);
      c.cv.paint(or(minus(leg.thigh, c.p.pelvis), and(c.p.pelvis, rect(0, c.p.waist + 2, 47, 47))), M.mithral, { spec: true, tex: moving(c.p, lames(2)), dark: limbDark(leg.far) });
      kneeCop(c, leg, M.mithral, 2.4);
      const [kx, ky] = leg.knee;
      if (!side(c.p)) c.cv.paint(ellipse(kx + (kx < 24 ? -2 : 2), ky, 1.2, 1.6), M.gold, { light: "sphere", spec: true });
    },
  },
  // Perneiras de escamas de dragão (escamas escuras do ventre), joelheira de ouro com espinho de marfim.
  5: {
    leg(c, leg) {
      legCloth(c, leg, M.dragonDark, scales);
      kneeCop(c, leg, M.gold, 2, M.ivory);
    },
  },
};

const ARCANE_LEGS: Record<ItemTier, Wear> = {
  // Calças de linho largas, amarradas no tornozelo.
  1: {
    leg(c, leg) {
      legCloth(c, leg, M.linen, folds, { loose: true });
      const y = Math.round(leg.ankle[1]) - 1;
      c.cv.paint(and(grow(leg.shin), rect(0, y, 47, y)), M.rope, { light: "row", dark: limbDark(leg.far) });
    },
  },
  // Calças de lã azul com listra dourada na lateral.
  2: {
    leg(c, leg) {
      legCloth(c, leg, M.wool);
      const outer = side(c.p) ? leg.knee[0] + 1 : leg.knee[0] < 24 ? leg.knee[0] - 1.5 : leg.knee[0] + 1.5;
      c.cv.paint(limb([[outer, leg.hip[1]], [outer, leg.ankle[1] - 1]], 0.45), M.gold, { light: "flat", line: "none", group: "keep", dark: limbDark(leg.far) });
    },
  },
  // Calças rúnicas: seda roxa com runas acesas descendo pela lateral.
  3: {
    leg(c, leg) {
      legCloth(c, leg, M.runeCloth);
      const x = Math.round(side(c.p) ? leg.knee[0] + 1 : leg.knee[0] < 24 ? leg.knee[0] - 1 : leg.knee[0] + 1);
      for (let y = Math.round(leg.knee[1]) - 3; y < leg.ankle[1] - 1; y += 2) c.cv.dot(x, y, M.rune, leg.far ? 3 : 4);
    },
  },
  // Calças de mithral: seda prateada com bordado azul na canela.
  4: {
    leg(c, leg) {
      legCloth(c, leg, M.silk, folds);
      const [kx, ky] = leg.knee;
      const y = Math.round((ky + leg.ankle[1]) / 2);
      c.cv.paint(and(leg.shin, rect(0, y, 47, y + 1)), M.plumeBlue, { group: "keep", light: "row", dark: limbDark(leg.far) });
      c.cv.dot(Math.round(kx - 0.5), y, M.sapphire, 4);
    },
  },
  // Calças de couro de dragão: couro rubro escuro em escamas, com tachas de ouro.
  5: {
    leg(c, leg) {
      legCloth(c, leg, M.dragonDark, scales);
      const [kx] = leg.knee;
      for (let y = Math.round(leg.knee[1]); y < leg.ankle[1] - 1; y += 2) c.cv.dot(Math.round(kx - 0.5), y, M.gold, 4);
    },
  },
};

// --- Botas --------------------------------------------------------------------------------------

/** Cano da bota: do pé até `h` px acima do tornozelo. */
function bootShaft(leg: Leg, h: number): Mask {
  return band(or(leg.shin, leg.foot), Math.round(leg.ankle[1]) - h, 47);
}

function boot(c: Ctx, leg: Leg, mat: number, h: number, o: { tex?: Tex; spec?: boolean } = {}) {
  const m = or(bootShaft(leg, h), leg.foot);
  c.cv.paint(m, mat, { dark: limbDark(leg.far), tex: o.tex ? moving(c.p, o.tex) : undefined, spec: o.spec, light: "cyl" });
  return m;
}

/** Cano até o joelho (grevas). */
const greaveHeight = (leg: Leg) => Math.round(leg.ankle[1] - leg.knee[1]) + 1;

const BOOTS: Record<ItemTier, Wear> = {
  // Botas de couro com o cano dobrado.
  1: {
    leg(c, leg) {
      const m = boot(c, leg, M.leather, 3);
      c.cv.paint(edge(m, "top"), M.leather, { group: "keep", t: 4, dark: limbDark(leg.far), light: "row" });
    },
  },
  // Botas de bronze: couro com caneleira e biqueira de bronze.
  2: {
    leg(c, leg) {
      boot(c, leg, M.darkLeather, 4);
      const [ax, ay] = leg.ankle;
      const plate = side(c.p) ? limb([[ax - 1.5, ay - 4], [ax - 1.5, ay - 1]], 1) : limb([[ax, ay - 4], [ax, ay - 1]], 1.3);
      c.cv.paint(plate, M.bronze, { spec: true, dark: limbDark(leg.far) });
      const toe = side(c.p) ? ellipse(leg.toe[0] + 0.5, leg.toe[1] + 0.3, 1.3, 1) : ellipse(ax, ay + 1.5, 1.6, 1);
      c.cv.paint(toe, M.bronze, { light: "sphere", spec: true, dark: limbDark(leg.far) });
    },
  },
  // Grevas de ferro: cobrem a canela até o joelho, com correias.
  3: {
    leg(c, leg) {
      const m = boot(c, leg, M.iron, greaveHeight(leg), { spec: true });
      const mid = Math.round((leg.knee[1] + leg.ankle[1]) / 2);
      c.cv.paint(and(m, rect(0, mid, 47, mid)), M.darkLeather, { group: "keep", light: "row" });
      c.cv.paint(and(m, rect(0, Math.round(leg.ankle[1]) - 1, 47, Math.round(leg.ankle[1]) - 1)), M.darkLeather, { group: "keep", light: "row" });
    },
  },
  // Botas de mithral: sabatons articulados e greva até o joelho com borda de ouro.
  4: {
    leg(c, leg) {
      const m = boot(c, leg, M.mithral, greaveHeight(leg), { spec: true });
      c.cv.paint(edge(m, "top"), M.gold, { group: "keep", light: "row", spec: true });
      c.cv.paint(and(leg.foot, rect(0, 0, 47, 47)), M.mithral, { spec: true, tex: side(c.p) ? (x) => (x % 2 ? -1 : 0) : (_x, y) => (y % 2 ? -1 : 0), dark: limbDark(leg.far) });
    },
  },
  // Botas de escamas de dragão: escamas, punho de ouro e garras de marfim na ponta.
  5: {
    leg(c, leg) {
      const m = boot(c, leg, M.dragonDark, 5, { tex: scales });
      c.cv.paint(edge(m, "top"), M.gold, { group: "keep", light: "row", spec: true });
      const [ax, ay] = leg.ankle;
      const claws: [number, number][] = side(c.p)
        ? [[leg.toe[0] - 1.5, leg.toe[1] + 0.6]]
        : [[ax - 2, ay + 1.9], [ax, ay + 2.2], [ax + 2, ay + 1.9]];
      for (const [x, y] of claws) c.cv.paint(ellipse(x, y, 0.8, 0.7), M.ivory, { light: "flat", dark: limbDark(leg.far) });
    },
  },
};

// --- Escolha -----------------------------------------------------------------------------------

export function armorWear(family: string, tier: ItemTier): Wear {
  return family === "armor-arcane" ? ARCANE_ROBE[tier] : WAR_ARMOR[tier];
}

export function legsWear(family: string, tier: ItemTier): Wear {
  return family === "legs-arcane" ? ARCANE_LEGS[tier] : WAR_LEGS[tier];
}

export const bootsWear = (tier: ItemTier): Wear => BOOTS[tier];

/** Manoplas de metal nas armaduras de placas e de escamas (a mão fechada no cabo fica do metal). */
export function gauntletOf(family: string, tier: ItemTier): number | undefined {
  if (family !== "armor-war") return undefined;
  return tier === 4 ? M.mithral : tier === 5 ? M.dragonDark : undefined;
}
