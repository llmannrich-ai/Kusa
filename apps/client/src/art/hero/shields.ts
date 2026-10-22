import type { ItemTier } from "@kusa/shared";
import { M } from "./materials.ts";
import { and, edge, ellipse, limb, minus, poly, rect, type Mask } from "./raster.ts";
import type { Ctx, Held } from "./compose.ts";

/**
 * Escudos: de frente no braço da esquerda da tela; de lado, no braço de cá, mais estreito (em perspectiva);
 * de costas, atrás do corpo, mostrando o verso de madeira; nas costas de quem usa arco ou cajado.
 */

interface ShieldDef {
  /** Forma centrada em (cx, cy); `ws` estreita na horizontal (1 = de frente). */
  shape(cx: number, cy: number, ws: number): Mask;
  /** Face do escudo. */
  face(c: Ctx, m: Mask, cx: number, cy: number, ws: number): void;
  /** Aro (material da borda). */
  rim: number;
}

function heater(cx: number, cy: number, w: number, h: number): Mask {
  const top = cy - h / 2;
  const hw = w / 2;
  return poly([
    [cx - hw, top], [cx + hw, top], [cx + hw, top + h * 0.42], [cx + hw * 0.75, top + h * 0.72],
    [cx + 0.5, top + h], [cx - 0.5, top + h], [cx - hw * 0.75, top + h * 0.72], [cx - hw, top + h * 0.42],
  ]);
}

function kite(cx: number, cy: number, w: number, h: number): Mask {
  const top = cy - h / 2;
  const hw = w / 2;
  return poly([
    [cx - hw * 0.7, top], [cx, top - 1], [cx + hw * 0.7, top], [cx + hw, top + h * 0.22], [cx + hw * 0.8, top + h * 0.5],
    [cx + 0.6, top + h], [cx - 0.6, top + h], [cx - hw * 0.8, top + h * 0.5], [cx - hw, top + h * 0.22],
  ]);
}

const scales = (x: number, y: number) => {
  const k = (x + (Math.floor(y / 2) % 2) * 2 + 64) % 4;
  if (y % 2 === 1) return k === 0 || k === 3 ? -1 : 0;
  return k === 1 ? 1 : 0;
};

const SHIELDS: Record<ItemTier, ShieldDef> = {
  // Broquel de madeira: tábuas, cravo de ferro no meio.
  1: {
    rim: M.darkWood,
    shape: (cx, cy, ws) => ellipse(cx, cy, 4.4 * ws, 4.4),
    face(c, m, cx, cy, ws) {
      c.cv.paint(m, M.wood, { light: "sphere", tex: (x) => (Math.round(x - cx) % 3 === 0 ? -1 : 0), group: "keep" });
      c.cv.paint(ellipse(cx, cy, 1.5 * ws + 0.2, 1.4), M.iron, { light: "sphere", spec: true });
    },
  },
  // Escudo de bronze: redondo, com anel e bossa.
  2: {
    rim: M.bronze,
    shape: (cx, cy, ws) => ellipse(cx, cy, 5.4 * ws, 5.4),
    face(c, m, cx, cy, ws) {
      c.cv.paint(m, M.bronze, { light: "sphere", spec: true, group: "keep" });
      c.cv.paint(minus(ellipse(cx, cy, 3.6 * ws, 3.6), ellipse(cx, cy, 2.8 * ws, 2.8)), M.bronze, { group: "keep", t: 1, light: "flat", bevel: false });
      c.cv.paint(ellipse(cx, cy, 1.6 * ws + 0.2, 1.6), M.bronze, { light: "sphere", spec: true });
    },
  },
  // Escudo de ferro: formato de ferro de engomar, faixas em cruz e rebites.
  3: {
    rim: M.steel,
    shape: (cx, cy, ws) => heater(cx, cy, 10 * ws, 12),
    face(c, m, cx, cy, ws) {
      c.cv.paint(m, M.iron, { light: "sphere", spec: true, group: "keep" });
      const v = and(m, rect(Math.round(cx - 0.5), 0, Math.round(cx + 0.5), 47));
      const h = and(m, rect(0, Math.round(cy - 2), 47, Math.round(cy - 1)));
      c.cv.paint(v, M.darkIron, { group: "keep", light: "flat" });
      c.cv.paint(h, M.darkIron, { group: "keep", light: "flat" });
      for (const [dx, dy] of [[-3, -4], [3, -4], [-3, 1], [3, 1]]) c.cv.dot(Math.round(cx + dx * ws), Math.round(cy + dy), M.steel, 5);
    },
  },
  // Escudo de mithral: alto (pipa), esmalte azul com cruz de mithral e aro de ouro.
  4: {
    rim: M.gold,
    shape: (cx, cy, ws) => kite(cx, cy, 10 * ws, 15),
    face(c, m, cx, cy) {
      c.cv.paint(m, M.plumeBlue, { light: "sphere", group: "keep" });
      const v = and(m, rect(Math.round(cx - 0.5), 0, Math.round(cx + 0.5), 47));
      const h = and(m, rect(0, Math.round(cy - 3), 47, Math.round(cy - 2)));
      c.cv.paint(v, M.mithral, { group: "keep", light: "cyl", spec: true });
      c.cv.paint(h, M.mithral, { group: "keep", light: "row", spec: true });
    },
  },
  // Escudo do dragão: escamas rubras, aro de ouro e um olho de dragão no meio.
  5: {
    rim: M.gold,
    shape: (cx, cy, ws) => heater(cx, cy, 11 * ws, 14),
    face(c, m, cx, cy, ws) {
      c.cv.paint(m, M.dragon, { light: "sphere", tex: scales, group: "keep" });
      c.cv.paint(ellipse(cx, cy - 1, 2.6 * ws + 0.3, 1.7), M.amber, {});
      c.cv.paint(rect(Math.round(cx - 0.5), Math.round(cy - 2), Math.round(cx - 0.5), Math.round(cy)), M.shadow, { light: "flat", bevel: false, group: "keep", t: 0 });
    },
  },
};

/** Desenha o escudo com aro; o verso é de madeira com a alça. */
function paintShield(c: Ctx, def: ShieldDef, cx: number, cy: number, ws: number, back: boolean) {
  const m = def.shape(cx, cy, ws);
  const g = c.cv.paint(m, back ? M.darkWood : def.rim, { light: "sphere", spec: !back });
  if (back) {
    c.cv.paint(edge(m), def.rim, { group: g, light: "sphere" });
    c.cv.paint(limb([[cx - 2 * ws, cy - 2], [cx + 2 * ws, cy + 2]], 0.6), M.darkLeather, { group: "keep", light: "flat" });
    return;
  }
  def.face(c, minus(m, edge(m)), cx, cy, ws);
}

export function shieldHeld(tier: ItemTier): Held {
  const def = SHIELDS[tier];
  return {
    draw(c, arm, behind) {
      const [hx, hy] = arm.hand;
      if (c.p.dir === "up") paintShield(c, def, hx + 1, hy - 3, 1, true);
      else if (c.p.dir === "side") paintShield(c, def, hx - 2.5, hy - 3, 0.6, false);
      else paintShield(c, def, hx - 1, hy - 2.5, 1, behind);
    },
    back(c) {
      const b = c.p.bob;
      paintShield(c, def, 29, 28 + b, 0.45, true);
    },
  };
}
