import type { ClassId, ItemTier } from "@kusa/shared";
import { M } from "./materials.ts";
import { ellipse, limb, or, rect, type Legend } from "./raster.ts";
import type { Ctx, Held } from "./compose.ts";
import type { Arm, Hold } from "./rig.ts";
import { FEET } from "./rig.ts";

/**
 * Armas na mão. Espadas, machados, bestas e varinhas são grades desenhadas pixel a pixel (de pé, ponta
 * para cima, como na mão direita da tela vista de frente). Arcos e cajados são desenhados por curva e haste.
 *
 * Nas grades, cada letra é um tom (0–5) de um de 4 materiais da arma:
 * A = a b c d e f · B = g h i j k l · C = m n o p q r · D = s t u v w x
 * (ex.: "d" é o tom base do material A; "f" o brilho; "a" a linha). Em geral A é a lâmina ou a cabeça,
 * B a guarda e as ferragens, C o cabo e D a gema ou o pomo.
 */

const SLOTS = ["abcdef", "ghijkl", "mnopqr", "stuvwx"];

function legendOf(mats: readonly number[]): Legend {
  const out: Record<string, [number, number]> = {};
  SLOTS.forEach((letters, slot) => [...letters].forEach((ch, t) => { out[ch] = [mats[slot] ?? mats[0], t]; }));
  return out;
}

export interface GridArt {
  rows: string[];
  /** Coluna e linha da mão. */
  grip: [number, number];
}

export interface WeaponArt extends Held {
  hold: Hold;
  melee: boolean;
}

/** Mão fechada por cima do cabo. */
function fist(c: Ctx, arm: Arm) {
  c.cv.paint(arm.handMask, c.skin, { light: "sphere", dark: arm.far ? -1 : 0, line: "hard" });
}

/**
 * Inclina a grade para fora: cada linha acima da mão anda `slope` px para a direita (e as de baixo para a
 * esquerda), em degraus, como uma lâmina em diagonal de pixel art. Sem isso a arma de pé some sobre o braço.
 */
function slant(art: GridArt, slope: number): GridArt {
  const offs = art.rows.map((_, r) => Math.round((art.grip[1] - r) * slope));
  const left = -Math.min(0, ...offs);
  const width = art.rows[0].length + left + Math.max(0, ...offs);
  const rows = art.rows.map((row, r) => (".".repeat(left + offs[r]) + row).padEnd(width, "."));
  return { rows, grip: [art.grip[0] + left + offs[art.grip[1]], art.grip[1]] };
}

/** Arma de grade segurada pelo cabo; de costas e de lado ela é espelhada (a lâmina aponta para fora). */
function gridWeapon(source: GridArt, mats: readonly number[], melee = true, slope = 0.45): WeaponArt {
  const legend = legendOf(mats);
  const art = slant(source, slope);
  const width = art.rows[0].length;
  return {
    hold: "blade",
    melee,
    draw(c, arm, behind) {
      const flip = c.p.dir !== "down";
      const gx = flip ? width - 1 - art.grip[0] : art.grip[0];
      const x0 = Math.round(arm.hand[0] - 0.5) - gx;
      const y0 = Math.round(arm.hand[1]) - art.grip[1];
      c.cv.stamp(art.rows, x0, y0, legend, { flip });
      if (!behind) fist(c, arm);
    },
  };
}

// --- Espadas -----------------------------------------------------------------------

const SWORDS: Record<ItemTier, GridArt> = {
  // Espada curta: lâmina de ferro sem brilho, guarda reta e pomo de bronze.
  1: {
    grip: [3, 8],
    rows: [
      "...e...",
      "..edb..",
      "..edb..",
      "..edb..",
      "..efb..",
      "..edb..",
      "..edb..",
      ".hjjjh.",
      "...p...",
      "...o...",
      "..uvu..",
    ],
  },
  // Espada de bronze: gládio de lâmina em folha, cabo de madeira.
  2: {
    grip: [3, 10],
    rows: [
      "...e...",
      "..edb..",
      "..edb..",
      ".eedbb.",
      ".eefbb.",
      ".eedbb.",
      "..edb..",
      "..edb..",
      "..edb..",
      ".ijjji.",
      "...p...",
      "...o...",
      "..vwv..",
    ],
  },
  // Espada longa: lâmina comprida com sulco, guarda em cruz larga.
  3: {
    grip: [3, 13],
    rows: [
      "...e...",
      "..edb..",
      "..edb..",
      "..efb..",
      "..efb..",
      "..efb..",
      "..efb..",
      "..edb..",
      "..edb..",
      "..edb..",
      "..edb..",
      "..edb..",
      "hijkjih",
      "...p...",
      "...o...",
      "...p...",
      "..uvu..",
    ],
  },
  // Espada de mithral: bastarda, sulco escuro, guarda de ouro com safira e pomo de safira.
  4: {
    grip: [3, 15],
    rows: [
      "...f...",
      "..eeb..",
      "..edb..",
      "..ebc..",
      "..ebc..",
      "..ebc..",
      "..ebc..",
      "..ebc..",
      "..ebc..",
      "..ebc..",
      "..edb..",
      "..edb..",
      "..edb..",
      ".hkjkh.",
      "ijjwjji",
      "...p...",
      "...o...",
      "...p...",
      "..jwj..",
    ],
  },
  // Lâmina do dragão: rubra e curva, guarda de asas douradas com rubi.
  5: {
    grip: [3, 15],
    rows: [
      ".....e.",
      "....eda",
      "....edb",
      "...edb.",
      "...edb.",
      "..eeb..",
      "..edb..",
      "..efb..",
      "..efb..",
      "..edb..",
      "..edb..",
      "k.edb.k",
      "lk.d.kl",
      "jkjwjkj",
      ".hjjjh.",
      "...p...",
      "...o...",
      "...p...",
      "..iwi..",
    ],
  },
};
const SWORD_MATS: Record<ItemTier, number[]> = {
  1: [M.iron, M.darkIron, M.leather, M.bronze],
  2: [M.bronze, M.darkWood, M.wood, M.bronze],
  3: [M.steel, M.iron, M.darkLeather, M.iron],
  4: [M.mithral, M.gold, M.darkLeather, M.sapphire],
  5: [M.dragon, M.gold, M.darkLeather, M.ruby],
};

/** Espada de treino de madeira (o cavaleiro sem arma). */
const TRAINING_SWORD: GridArt = {
  grip: [3, 9],
  rows: [
    "...d...",
    "..edb..",
    "..edb..",
    "..edb..",
    "..edb..",
    "..edb..",
    "..edb..",
    "..edb..",
    ".ijjji.",
    "...p...",
    "...o...",
    "...j...",
  ],
};

// --- Machados ------------------------------------------------------------------------

const AXES: Record<ItemTier, GridArt> = {
  // Machadinha: cabeça pequena de ferro num cabo curto.
  1: {
    grip: [1, 9],
    rows: [
      ".p....",
      ".pde..",
      ".pddef",
      ".pddef",
      ".pcde.",
      ".p....",
      ".p....",
      ".o....",
      ".p....",
      ".o....",
      ".n....",
    ],
  },
  // Machado de bronze: lâmina em meia-lua.
  2: {
    grip: [1, 11],
    rows: [
      ".q......",
      ".p..ef..",
      ".pdedef.",
      ".pdddef.",
      ".pdddef.",
      ".pdcdef.",
      ".p..cd..",
      ".i......",
      ".p......",
      ".o......",
      ".p......",
      ".o......",
      ".p......",
      ".n......",
    ],
  },
  // Machado de batalha: cabeça barbada (a lâmina desce pelo cabo), cabo enfaixado.
  3: {
    grip: [1, 13],
    rows: [
      ".q......",
      ".pdef...",
      ".pddef..",
      ".pdddef.",
      ".pddddef",
      ".pc.ddef",
      ".p...def",
      ".p....ef",
      ".i......",
      ".j......",
      ".i......",
      ".p......",
      ".o......",
      ".p......",
      ".o......",
      ".p......",
      ".n......",
    ],
  },
  // Machado de mithral: duas lâminas, aro de ouro com safira.
  4: {
    grip: [4, 12],
    rows: [
      "....q....",
      "fe..k..ef",
      "fedcjcdef",
      "fedcwcdef",
      "fedcjcdef",
      "fe..k..ef",
      "....p....",
      "....o....",
      "....p....",
      "....i....",
      "....p....",
      "....o....",
      "....p....",
      "....o....",
      "....n....",
    ],
  },
  // Grande machado do dragão: lâmina rubra em forma de bocarra, olho de rubi e ponta de ouro.
  5: {
    grip: [1, 14],
    rows: [
      ".k.......",
      ".jde.....",
      ".jddef...",
      ".jdddef..",
      ".jwdddef.",
      ".jdddddef",
      ".jdcddddf",
      ".j.cdddef",
      ".j..cddf.",
      ".j...ce..",
      ".p.......",
      ".o.......",
      ".p.......",
      ".o.......",
      ".p.......",
      ".o.......",
      ".p.......",
      ".k.......",
    ],
  },
};
const AXE_MATS: Record<ItemTier, number[]> = {
  1: [M.iron, M.leather, M.wood, M.iron],
  2: [M.bronze, M.leather, M.wood, M.bronze],
  3: [M.steel, M.darkLeather, M.darkWood, M.iron],
  4: [M.mithral, M.gold, M.darkWood, M.sapphire],
  5: [M.dragon, M.gold, M.darkWood, M.ruby],
};

// --- Varinhas --------------------------------------------------------------------------

const WANDS: Record<ItemTier, GridArt> = {
  // Varinha de salgueiro: galho fino com folhinhas e uma gota de esmeralda.
  1: {
    grip: [1, 10],
    rows: [
      ".wv.",
      ".ut.",
      "jed.",
      ".ed.",
      ".edk",
      ".ed.",
      "jed.",
      ".ed.",
      ".ed.",
      ".pn.",
      ".pn.",
      ".dc.",
    ],
  },
  // Varinha de bronze: ponta de âmbar presa em garras de bronze.
  2: {
    grip: [1, 10],
    rows: [
      ".wv.",
      "kvuh",
      ".jh.",
      ".ed.",
      ".ed.",
      ".ed.",
      ".jh.",
      ".ed.",
      ".ed.",
      ".pn.",
      ".pn.",
      ".jh.",
    ],
  },
  // Varinha rúnica: madeira escura com runas acesas e ponta de cristal.
  3: {
    grip: [1, 11],
    rows: [
      ".xw.",
      ".wv.",
      ".ed.",
      ".ld.",
      ".ed.",
      ".el.",
      ".ed.",
      ".ld.",
      ".ed.",
      ".ed.",
      ".pn.",
      ".pn.",
      ".dc.",
    ],
  },
  // Varinha de mithral: cristal de safira longo entre garras de ouro.
  4: {
    grip: [1, 12],
    rows: [
      "..x.",
      ".wv.",
      ".wv.",
      ".vu.",
      "jkji",
      ".ed.",
      ".ed.",
      ".ed.",
      ".ji.",
      ".ed.",
      ".ed.",
      ".pn.",
      ".pn.",
      ".ji.",
    ],
  },
  // Varinha de dente de dragão: presa curva de marfim com rubi num aro de ouro.
  5: {
    grip: [1, 10],
    rows: [
      "...e",
      "..ed",
      ".edc",
      ".ed.",
      ".ed.",
      ".ed.",
      ".ed.",
      ".ed.",
      "jwj.",
      ".pn.",
      ".pn.",
      ".pn.",
      ".ji.",
    ],
  },
};
const WAND_MATS: Record<ItemTier, number[]> = {
  1: [M.wood, M.leaf, M.leather, M.emerald],
  2: [M.wood, M.bronze, M.darkLeather, M.amber],
  3: [M.darkWood, M.rune, M.leather, M.rune],
  4: [M.mithral, M.gold, M.darkLeather, M.sapphire],
  5: [M.ivory, M.gold, M.dragonDark, M.ruby],
};

// --- Bestas -------------------------------------------------------------------------------

const CROSSBOWS: Record<ItemTier, GridArt> = {
  // Besta leve: arco de madeira e coronha simples.
  1: {
    grip: [4, 9],
    rows: [
      "....v....",
      "....d....",
      "ij..d..ji",
      ".ijjejji.",
      "..m.d.m..",
      "...med...",
      "....d....",
      "...cdd...",
      "....d....",
      "....d....",
      "....c....",
    ],
  },
  // Besta de bronze: arco de bronze e ferragens.
  2: {
    grip: [4, 10],
    rows: [
      "....v....",
      "....d....",
      "kj..d..jk",
      ".jkjejkj.",
      ".m..j..m.",
      "..m.d.m..",
      "...med...",
      "....d....",
      "...jdd...",
      "....d....",
      "....d....",
      "....i....",
    ],
  },
  // Besta de ferro: arco de aço com estribo na frente.
  3: {
    grip: [4, 12],
    rows: [
      "...jkj...",
      "...j.j...",
      "...jvj...",
      "kj..d..jk",
      "jkjjejjkj",
      ".m..j..m.",
      "..m.d.m..",
      "...med...",
      "....d....",
      "...jdd...",
      "....d....",
      "....d....",
      "....d....",
      "....c....",
    ],
  },
  // Besta pesada de mithral: arco duplo e manivela de ouro na coronha.
  4: {
    grip: [5, 13],
    rows: [
      ".....v.....",
      ".....d.....",
      "lk...d...kl",
      "jkjkjejkjkj",
      ".jkjjejjkj.",
      "..m..j..m..",
      "...m.d.m...",
      "....med....",
      ".....d.....",
      "....jdd....",
      ".....d.....",
      ".....d.....",
      ".....d.....",
      "....sts....",
      "...stwts...",
      "....sts....",
    ],
  },
  // Balestra de osso de dragão: arco de osso com espinhos rubros e rubi na coronha.
  5: {
    grip: [5, 13],
    rows: [
      ".....v.....",
      ".....d.....",
      "w.k..d..k.w",
      "jkjk.d.kjkj",
      ".jkjjejjkj.",
      "..m..j..m..",
      "...m.d.m...",
      "....med....",
      ".....d.....",
      "....dwd....",
      ".....d.....",
      "....jdd....",
      ".....d.....",
      ".....d.....",
      ".....c.....",
    ],
  },
};
// A = coronha, B = arco, C = corda, D = virote, gema ou manivela.
const CROSSBOW_MATS: Record<ItemTier, number[]> = {
  1: [M.wood, M.wood, M.string, M.iron],
  2: [M.wood, M.bronze, M.string, M.bronze],
  3: [M.darkWood, M.steel, M.string, M.iron],
  4: [M.darkWood, M.mithral, M.string, M.gold],
  5: [M.darkWood, M.bone, M.string, M.ruby],
};

// --- Arcos -------------------------------------------------------------------------------

interface BowDef {
  /** Altura do arco (px). */
  h: number;
  /** Quanto a madeira abre para fora no meio. */
  bulge: number;
  /** Pontas viradas para fora (arco recurvo). */
  recurve: number;
  limb: number;
  grip: number;
  /** Enfeite: espinhos, gema no punho, pontas de outro material. */
  tips?: number;
  gem?: number;
  spikes?: number;
}

const BOWS: Record<ItemTier, BowDef> = {
  1: { h: 15, bulge: 3, recurve: 0, limb: M.wood, grip: M.leather },
  2: { h: 18, bulge: 3.5, recurve: 1, limb: M.wood, grip: M.darkLeather, tips: M.bone },
  3: { h: 25, bulge: 3, recurve: 0, limb: M.wood, grip: M.leather, tips: M.darkWood },
  4: { h: 20, bulge: 4, recurve: 2, limb: M.mithral, grip: M.darkLeather, gem: M.sapphire, tips: M.gold },
  5: { h: 22, bulge: 4, recurve: 1.5, limb: M.bone, grip: M.dragonDark, gem: M.ruby, spikes: M.dragon },
};
const PLAIN_BOW: BowDef = { h: 16, bulge: 3, recurve: 0, limb: M.darkWood, grip: M.darkWood };

function bowWeapon(def: BowDef): WeaponArt {
  return {
    hold: "bow",
    melee: false,
    draw(c, arm, behind) {
      const { cv, p } = c;
      // A barriga do arco aponta para fora (direita de frente; esquerda de costas e de lado).
      const out = p.dir === "down" ? 1 : -1;
      const hx = Math.round(arm.hand[0] - 0.5) + 0.5 * out;
      // A mão segura um pouco abaixo do meio (o arco longo não encosta no chão).
      const hy = arm.hand[1] - 2;
      const top = hy - def.h / 2;
      const steps = Math.ceil(def.h * 2);
      const at = (t: number): [number, number] => {
        // t de 0 (ponta de cima) a 1 (de baixo): arco em seno com as pontas recurvas para fora.
        const end = Math.max(0, Math.abs(t - 0.5) * 2 - 0.78) / 0.22;
        const x = hx + out * (def.bulge * Math.sin(Math.PI * t) - def.bulge * 0.35 + def.recurve * end * end * 1.2);
        return [x, top + t * def.h];
      };
      const pts = Array.from({ length: steps + 1 }, (_, i) => at(i / steps));
      const tipTop = pts[0], tipBottom = pts[steps];
      // Corda primeiro (atrás da madeira), reta entre as pontas.
      const sx = hx - out * def.bulge * 0.35 - out * 0.5;
      cv.paint(limb([[sx, tipTop[1] + 0.5], [sx, tipBottom[1] - 0.5]], 0.45), M.string, { light: "flat", bevel: false, line: "none" });
      const g = cv.group("hard");
      cv.paint(limb(pts, 0.85), def.limb, { group: g, spec: def.limb === M.mithral });
      if (def.tips) {
        cv.paint(or(limb(pts.slice(0, 4), 0.95), limb(pts.slice(-4), 0.95)), def.tips, { group: g });
      }
      if (def.spikes) {
        for (const t of [0.2, 0.32, 0.68, 0.8]) {
          const [x, y] = at(t);
          cv.paint(limb([[x + out * 1, y], [x + out * 2.6, y - 1.2]], 0.5), def.spikes, { group: g, light: "flat" });
        }
      }
      const [gx, gy] = at(0.5 + 2 / def.h);
      cv.paint(rect(Math.round(gx - 0.5 - 0.5), Math.round(gy) - 2, Math.round(gx - 0.5 + 0.5), Math.round(gy) + 1), def.grip, { group: g, light: "row" });
      if (def.gem) cv.paint(ellipse(gx + out * 0.8, gy - 3, 0.9, 0.9), def.gem, {});
      if (!behind) fist(c, arm);
    },
  };
}

// --- Cajados ---------------------------------------------------------------------------------

interface StaffDef {
  /** Haste (material). */
  shaft: number;
  /** Ponta: grade com a coluna da haste em `col`, pintada com 4 materiais. */
  top: string[];
  col: number;
  mats: number[];
  /** Linha da ponta mais alta (no quadro). */
  topY: number;
  /** Enfeites na haste: [linha relativa à mão, material]. */
  bands?: [number, number][];
  /** Nós na madeira (haste torta). */
  gnarled?: boolean;
  runes?: boolean;
  /** Folhas brotando perto da ponta. */
  leaves?: boolean;
}

const STAFFS: Record<ItemTier, StaffDef> = {
  // Cajado de carvalho: ponta nodosa que se enrola.
  1: {
    shaft: M.wood, topY: 7, col: 3, mats: [M.wood, M.darkWood, M.leather, M.emerald],
    gnarled: true,
    top: [
      "..eed..",
      ".ed.dc.",
      ".d..dc.",
      ".ec.dc.",
      "..ccdc.",
      "...edc.",
      "...ed..",
    ],
  },
  // Cajado de bronze: anéis e ponta de bronze com âmbar.
  2: {
    shaft: M.wood, topY: 7, col: 3, mats: [M.bronze, M.bronze, M.wood, M.amber],
    bands: [[-12, M.bronze], [-6, M.bronze]],
    top: [
      "...x...",
      "..wvu..",
      ".ewvuc.",
      ".e.u.c.",
      "..edc..",
      "...d...",
      "..jkh..",
    ],
  },
  // Cajado rúnico: forquilha de madeira escura segurando um cristal; runas acesas na haste.
  3: {
    shaft: M.darkWood, topY: 5, col: 3, mats: [M.darkWood, M.rune, M.leather, M.rune],
    runes: true,
    top: [
      "...x...",
      "..xwv..",
      ".dwvut.",
      "ed.vu.c",
      "ed.u..c",
      ".ed..c.",
      "..edc..",
      "...d...",
    ],
  },
  // Cajado de mithral: aro aberto com uma safira flutuando no meio.
  4: {
    shaft: M.mithral, topY: 5, col: 3, mats: [M.mithral, M.gold, M.darkLeather, M.sapphire],
    bands: [[-10, M.gold]],
    top: [
      "..fed..",
      ".e...c.",
      "e..x..c",
      "e.xwv.c",
      "e..u..c",
      ".e...c.",
      "..ejc..",
      "...k...",
    ],
  },
  // Cajado de presa de dragão: presa de marfim curva, rubi e uma chama acesa.
  5: {
    shaft: M.dragonDark, topY: 3, col: 3, mats: [M.ivory, M.gold, M.dragonDark, M.ruby],
    bands: [[-11, M.gold], [-5, M.gold]],
    top: [
      "....x..",
      "...xw..",
      ".e.wv..",
      "ed..v..",
      "ed.....",
      "ed..f..",
      ".ed.ed.",
      ".jwkj..",
      "..jkj..",
      "...p...",
    ],
  },
};

/** Cajado do feiticeiro sem arma: orbe de ametista numa garra de ouro. */
const ORB_STAFF: StaffDef = {
  shaft: M.darkWood, topY: 6, col: 3, mats: [M.gold, M.gold, M.darkWood, M.amethyst],
  top: [
    "..wwv..",
    ".wxwvu.",
    ".wwvvu.",
    "e.vut.c",
    ".e...c.",
    "..edc..",
    "...p...",
  ],
};

/** Galho torto do druida sem arma, com folhas. */
const BRANCH_STAFF: StaffDef = {
  shaft: M.wood, topY: 7, col: 3, mats: [M.wood, M.leaf, M.wood, M.leaf],
  gnarled: true,
  top: [
    "jk...kj",
    ".jk.kj.",
    "..d.d..",
    "..edc..",
    "...d...",
    "...d...",
  ],
};

/** Cajado de osso do Xamã Orc sem arma: um crânio com a brasa acesa entre os chifres. */
const SKULL_STAFF: StaffDef = {
  shaft: M.darkWood, topY: 6, col: 3, mats: [M.bone, M.bone, M.darkWood, M.fire],
  top: [
    "j.....j",
    ".k.v.k.",
    "..cdc..",
    ".cwdwc.",
    "..dcd..",
    "..edc..",
    "...p...",
  ],
};

function staffWeapon(def: StaffDef): WeaponArt {
  const legend = legendOf(def.mats);
  return {
    hold: "staff",
    melee: false,
    draw(c, arm, behind) {
      const { cv } = c;
      const x = Math.round(arm.hand[0] - 0.5);
      const top = def.topY + c.p.bob;
      const shaftTop = top + def.top.length - 1;
      // A haste vai até o chão; torta (nós alternados) no galho e no carvalho.
      const pts: [number, number][] = [];
      for (let y = shaftTop; y <= FEET; y += 4) pts.push([x + 0.5 + (def.gnarled ? ((y / 4) % 2 ? 0.4 : -0.4) : 0), y]);
      pts.push([x + 0.5, FEET]);
      const g = cv.group("hard");
      cv.paint(limb(pts, 0.85), def.shaft, { group: g, spec: def.shaft === M.mithral, tex: def.gnarled ? (_x, y) => (y % 5 === 0 ? -1 : 0) : undefined });
      for (const [dy, mat] of def.bands ?? []) {
        const y = Math.round(arm.hand[1]) + dy;
        cv.paint(rect(x, y, x + 1, y), mat, { group: g, light: "row", spec: true });
      }
      if (def.runes) {
        for (const dy of [-13, -9, 4, 8]) cv.dot(x + (dy % 2 ? 0 : 1), Math.round(arm.hand[1]) + dy, M.rune, 4);
      }
      cv.paint(rect(x, FEET - 1, x + 1, FEET), M.darkIron, { group: g, light: "row" });
      cv.stamp(def.top, x - def.col, top, legend, { group: g });
      if (def.leaves) {
        for (const [dx, dy] of [[-2, 9], [2, 12], [-2, 15]]) cv.paint(ellipse(x + 0.5 + dx, top + dy, 1.4, 0.9), M.leaf, { light: "sphere", line: "soft" });
      }
      if (!behind) fist(c, arm);
    },
  };
}

// --- Armas mágicas ------------------------------------------------------------------------
// Cada arma mágica usa o desenho do seu nível com materiais próprios (e, nos cajados, um enfeite).

const MAGIC_SWORDS: Record<ItemTier, number[]> = {
  1: [M.steel, M.gold, M.darkLeather, M.blood], // Espada do Juramento
  2: [M.ember, M.darkIron, M.darkLeather, M.fire], // Lâmina Flamejante
  3: [M.silverWhite, M.gold, M.wool, M.holy], // Vingadora Sagrada
  4: [M.frostSteel, M.silverWhite, M.wool, M.frost], // Espada Dançarina
  5: [M.obsidian, M.gold, M.darkLeather, M.amethyst], // Espada Vorpal
};
const MAGIC_AXES: Record<ItemTier, number[]> = {
  1: [M.bloodSteel, M.darkLeather, M.darkWood, M.blood], // Machado do Berserker
  2: [M.frostSteel, M.fur, M.darkWood, M.frost], // Machado Uivante
  3: [M.gold, M.steel, M.darkWood, M.ruby], // Machado dos Reis Anões
  4: [M.stormSteel, M.silverWhite, M.darkWood, M.rune], // Machado da Tempestade
  5: [M.obsidian, M.bronze, M.darkWood, M.ember], // Ruína dos Gigantes
};
const MAGIC_WANDS: Record<ItemTier, number[]> = {
  1: [M.darkWood, M.amethyst, M.leather, M.amethyst], // Varinha de Mísseis Mágicos
  2: [M.ember, M.gold, M.darkLeather, M.fire], // Varinha da Bola de Fogo
  3: [M.steel, M.gold, M.darkLeather, M.ruby], // Varinha do Mago de Guerra
  4: [M.night, M.star, M.darkLeather, M.star], // Varinha dos Segredos
  5: [M.silverWhite, M.amethyst, M.gold, M.rune], // Varinha das Maravilhas
};
const MAGIC_CROSSBOWS: Record<ItemTier, number[]> = {
  1: [M.darkWood, M.steel, M.string, M.sapphire], // Besta do Sentinela
  2: [M.darkWood, M.silverWhite, M.string, M.holy], // Besta do Caça-Vampiros
  3: [M.wood, M.gold, M.string, M.amber], // Besta de Repetição Gnoma
  4: [M.darkWood, M.stormSteel, M.rune, M.rune], // Besta Trovejante
  5: [M.dragonDark, M.dragon, M.fire, M.fire], // Balestra do Dragão Rubro
};
const MAGIC_BOWS: Record<ItemTier, Partial<BowDef>> = {
  1: { limb: M.greenLeather, grip: M.leaf, gem: M.emerald, tips: M.gold }, // Arco do Caçador Élfico
  2: { limb: M.ivory, grip: M.wool, tips: M.feather, gem: M.frost }, // Arco do Vento Sul
  3: { limb: M.gold, grip: M.ember, tips: M.gold, gem: M.holy }, // Arco Solar
  4: { limb: M.silverWhite, grip: M.blood, gem: M.blood, tips: M.gold }, // Arco do Juramento
  5: { limb: M.night, grip: M.silk, tips: M.star, gem: M.star, spikes: M.star }, // Arco de Corda Celestial
};
const MAGIC_STAFFS: Record<ItemTier, Partial<StaffDef>> = {
  1: { mats: [M.wood, M.leaf, M.leather, M.emerald], leaves: true }, // Cajado da Floresta
  2: { shaft: M.darkWood, mats: [M.greenLeather, M.greenLeather, M.darkWood, M.poison] }, // Cajado da Víbora
  3: { shaft: M.obsidian, mats: [M.gold, M.ruby, M.darkLeather, M.ruby] }, // Cajado do Poder
  4: { shaft: M.night, mats: [M.silverWhite, M.gold, M.darkLeather, M.star] }, // Cajado do Arquimago
  5: { shaft: M.ivory, mats: [M.gold, M.gold, M.dragonDark, M.fire] }, // Cajado do Dragão Ancião
};

// --- Escolha da arma ------------------------------------------------------------------------

/** Arma vestida pela família ("weapon-sword"...) e nível; `magic` usa os materiais do item mágico. */
// --- Armas de estilo (maça, lança, orbe, foice e totem de mão) ------------------------------
// Maça e orbe são grades na mão (como espada e varinha); lança, foice e totem são hastes até o chão (como o cajado).

const MACES: Record<ItemTier, GridArt> = {
  // Clava cravejada: tora de madeira com cravos de ferro.
  1: { grip: [2, 9], rows: [".h.h.", "hedch", ".edc.", "hedch", ".edc.", "..o..", "..p..", "..o..", "..p..", "..o..", "..n.."] },
  // Maça de bronze: bola de bronze com um âmbar no topo.
  2: { grip: [2, 9], rows: ["..v..", ".edc.", "eddcc", ".edc.", "..j..", "..p..", "..o..", "..p..", "..o..", "..o..", "..v.."] },
  // Maça de ferro: cabeça de aletas.
  3: { grip: [2, 10], rows: ["e.d.c", "eedcc", "edddc", "eedcc", "e.d.c", "..j..", "..p..", "..o..", "..p..", "..o..", "..o..", "..v.."] },
  // Maça de mithral: aletas com uma safira no meio e guarda de ouro.
  4: { grip: [2, 10], rows: [".e.c.", "eewcc", "ewvuc", "eeucc", ".e.c.", ".ijh.", "..p..", "..o..", "..p..", "..o..", "..o..", ".uvu."] },
  // Maça de osso de dragão: crânio com espinhos e o olho de rubi.
  5: { grip: [2, 11], rows: ["f...c", ".edc.", "edwdc", ".edc.", "f...c", "..j..", "..p..", "..o..", "..p..", "..o..", "..p..", "..o..", ".uvu."] },
};
const MACE_MATS: Record<ItemTier, number[]> = {
  1: [M.wood, M.iron, M.darkWood, M.iron],
  2: [M.bronze, M.bronze, M.wood, M.amber],
  3: [M.iron, M.darkIron, M.darkLeather, M.iron],
  4: [M.mithral, M.gold, M.darkLeather, M.sapphire],
  5: [M.ivory, M.gold, M.dragonDark, M.ruby],
};
const MAGIC_MACES: Record<ItemTier, number[]> = {
  1: [M.silverWhite, M.gold, M.wool, M.holy], // Maça do Capelão
  2: [M.ember, M.darkIron, M.darkLeather, M.fire], // Estrela-d'Alva
  3: [M.stormSteel, M.bronze, M.darkLeather, M.frost], // Martelo do Trovão Anão
  4: [M.bloodSteel, M.darkIron, M.darkLeather, M.blood], // Maça da Ruptura
  5: [M.bone, M.darkIron, M.fur, M.ember], // Quebra-Crânios do Rei Ogro
};

const ORBS: Record<ItemTier, GridArt> = {
  // Orbe de quartzo num cabo curto.
  1: { grip: [1, 6], rows: [".wv.", "wvut", ".ut.", ".jh.", ".pn.", ".pn.", ".pn.", ".dc."] },
  // Orbe de âmbar preso em garras de bronze.
  2: { grip: [1, 7], rows: ["j..h", "jwvh", "wvut", ".ut.", ".ih.", ".pn.", ".pn.", ".pn.", ".jh."] },
  // Orbe rúnico dentro de um aro.
  3: { grip: [2, 8], rows: [".jih.", "jwvuh", "iwvti", "jvuth", ".jih.", "..k..", "..o..", "..p..", "..o..", "..p..", "..j.."] },
  // Orbe de mithral com a coroa de pontas.
  4: { grip: [2, 8], rows: ["..l..", ".wvu.", "jwvuh", ".vut.", ".jkh.", "..k..", "..o..", "..p..", "..o..", "..p..", ".jkh."] },
  // Orbe de olho de dragão entre garras.
  5: { grip: [2, 8], rows: ["e...c", ".wvu.", "ewxuc", ".vut.", "e.d.c", "..d..", "..o..", "..p..", "..o..", "..p..", "..d.."] },
};
const ORB_MATS: Record<ItemTier, number[]> = {
  1: [M.wood, M.iron, M.leather, M.frost],
  2: [M.wood, M.bronze, M.darkLeather, M.amber],
  3: [M.darkWood, M.rune, M.leather, M.amethyst],
  4: [M.mithral, M.mithral, M.darkLeather, M.sapphire],
  5: [M.dragonDark, M.gold, M.dragonDark, M.ruby],
};
const MAGIC_ORBS: Record<ItemTier, number[]> = {
  1: [M.wood, M.gold, M.leather, M.emerald], // Orbe do Aprendiz
  2: [M.darkIron, M.darkIron, M.darkLeather, M.fire], // Orbe da Brasa Presa
  3: [M.night, M.gold, M.darkLeather, M.rune], // Orbe do Vidente
  4: [M.stormSteel, M.silverWhite, M.darkLeather, M.frost], // Orbe da Tempestade Contida
  5: [M.bone, M.obsidian, M.night, M.poison], // Olho do Lich
};

const SPEARS: Record<ItemTier, StaffDef> = {
  1: { shaft: M.wood, topY: 5, col: 3, mats: [M.iron, M.leather, M.wood, M.iron], top: ["...d...", "..edc..", "..edc..", "...d...", "..ppp.."] },
  2: { shaft: M.wood, topY: 4, col: 3, mats: [M.bronze, M.bronze, M.wood, M.amber], bands: [[-8, M.bronze]], top: ["...e...", "..edc..", ".eedcc.", "..edc..", "...d...", "..jih.."] },
  3: { shaft: M.darkWood, topY: 4, col: 3, mats: [M.steel, M.iron, M.darkWood, M.iron], top: ["...e...", "..edc..", "..edc.c", "..edcc.", "...d...", "..jih.."] },
  4: { shaft: M.mithral, topY: 3, col: 3, mats: [M.mithral, M.gold, M.darkLeather, M.sapphire], bands: [[-10, M.gold]], top: ["...f...", "..edc..", "..edc..", "e.edc.c", ".eedcc.", "..jkh..", "...x..."] },
  5: { shaft: M.dragonDark, topY: 2, col: 3, mats: [M.ivory, M.gold, M.dragonDark, M.ruby], bands: [[-11, M.gold], [-5, M.gold]], top: ["...f...", "...e...", "..edc..", "..edc..", ".eedcc.", "e.edc.c", "..jwh..", "...k..."] },
};
const MAGIC_SPEARS: Record<ItemTier, Partial<StaffDef>> = {
  1: { shaft: M.greenLeather, mats: [M.elfSilver, M.greenLeather, M.wood, M.emerald] }, // Lança do Batedor
  2: { shaft: M.darkWood, mats: [M.gold, M.ember, M.darkWood, M.fire] }, // Lança Solar
  3: { shaft: M.darkIron, mats: [M.silverWhite, M.gold, M.darkIron, M.holy] }, // Pique do Guardião
  4: { shaft: M.wood, mats: [M.gold, M.feather, M.wood, M.amber] }, // Lança do Grifo
  5: { shaft: M.bloodSteel, mats: [M.bloodSteel, M.obsidian, M.bloodSteel, M.blood] }, // Tridente da Maré Rubra
};

const SCYTHES: Record<ItemTier, StaffDef> = {
  1: { shaft: M.wood, topY: 7, col: 4, mats: [M.iron, M.leather, M.wood, M.iron], top: ["..eed..", ".e..d..", "e...d..", "....d.."] },
  2: { shaft: M.wood, topY: 6, col: 5, mats: [M.bronze, M.bronze, M.wood, M.amber], top: [".eeedd.", "e....d.", "e....d.", "....jh."] },
  3: { shaft: M.darkWood, topY: 5, col: 6, mats: [M.steel, M.iron, M.darkWood, M.iron], top: ["..eeedd", ".ee...d", "e.....d", "e.....d", ".....jh"] },
  4: { shaft: M.mithral, topY: 5, col: 6, mats: [M.mithral, M.gold, M.darkLeather, M.sapphire], top: ["..eeewd", ".ee..vd", "e.....d", "e.....d", ".....jh"] },
  5: { shaft: M.dragonDark, topY: 4, col: 6, mats: [M.ivory, M.gold, M.dragonDark, M.ruby], top: [".feeexd", "ee...wd", "e.....d", "ef....d", ".e...jh"] },
};
const MAGIC_SCYTHES: Record<ItemTier, Partial<StaffDef>> = {
  1: { mats: [M.iron, M.leaf, M.wood, M.emerald], leaves: true }, // Foice do Colhedor
  2: { shaft: M.darkWood, mats: [M.greenLeather, M.greenLeather, M.darkWood, M.poison] }, // Foice da Mandrágora
  3: { shaft: M.night, mats: [M.silverWhite, M.silverWhite, M.night, M.star] }, // Foice da Lua Cheia
  4: { shaft: M.darkWood, mats: [M.amber, M.plumeRed, M.darkWood, M.ember], leaves: true }, // Foice do Outono Eterno
  5: { shaft: M.wood, mats: [M.bone, M.leaf, M.wood, M.poison], leaves: true }, // Ceifadora do Bosque Antigo
};

const TOTEMS: Record<ItemTier, StaffDef> = {
  1: { shaft: M.wood, topY: 6, col: 3, mats: [M.wood, M.feather, M.darkWood, M.amber], gnarled: true, top: ["..edc..", ".ewdwc.", ".edddc.", ".ed.dc.", "..edc..", "...d..."] },
  2: { shaft: M.wood, topY: 5, col: 3, mats: [M.bronze, M.bone, M.wood, M.amber], top: ["j.....h", "jeddcch", ".ewdwc.", ".edddc.", ".ed.dc.", "..edc..", "...k..."] },
  3: { shaft: M.darkWood, topY: 5, col: 3, mats: [M.iron, M.plumeRed, M.darkWood, M.ember], top: ["g..d..g", ".hedch.", ".ewdwc.", ".edddc.", ".ed.dc.", "..edc..", "..jkh.."] },
  4: { shaft: M.mithral, topY: 4, col: 3, mats: [M.mithral, M.gold, M.darkLeather, M.sapphire], top: ["..edc..", ".ewdwc.", ".ed.dc.", "..jkh..", ".ewdwc.", ".edddc.", "..edc.."] },
  5: { shaft: M.dragonDark, topY: 3, col: 3, mats: [M.ivory, M.gold, M.dragonDark, M.ruby], top: ["f.....f", ".e...c.", ".eedcc.", "ewdddwc", "edd.ddc", ".e.d.c.", "..ddd.."] },
};
const MAGIC_TOTEMS: Record<ItemTier, Partial<StaffDef>> = {
  1: { mats: [M.night, M.feather, M.darkWood, M.amber] }, // Totem do Corvo
  2: { mats: [M.ember, M.darkIron, M.darkWood, M.fire] }, // Totem da Brasa
  3: { shaft: M.wood, mats: [M.fur, M.ivory, M.wood, M.blood] }, // Totem do Javali
  4: { shaft: M.darkWood, mats: [M.bone, M.rune, M.darkWood, M.rune], runes: true }, // Totem dos Ancestrais
  5: { shaft: M.obsidian, mats: [M.bone, M.obsidian, M.obsidian, M.poison] }, // Totem do Grande Chefe Morto
};

export function weaponArt(family: string, tier: ItemTier, magic = false): WeaponArt {
  switch (family) {
    case "weapon-mace": return gridWeapon(MACES[tier], (magic ? MAGIC_MACES : MACE_MATS)[tier]);
    case "weapon-orb": return gridWeapon(ORBS[tier], (magic ? MAGIC_ORBS : ORB_MATS)[tier], false);
    case "weapon-spear": return staffWeapon(magic ? { ...SPEARS[tier], ...MAGIC_SPEARS[tier] } : SPEARS[tier]);
    case "weapon-scythe": return staffWeapon(magic ? { ...SCYTHES[tier], ...MAGIC_SCYTHES[tier] } : SCYTHES[tier]);
    case "weapon-totem": return staffWeapon(magic ? { ...TOTEMS[tier], ...MAGIC_TOTEMS[tier] } : TOTEMS[tier]);
    case "weapon-sword": return gridWeapon(SWORDS[tier], (magic ? MAGIC_SWORDS : SWORD_MATS)[tier]);
    case "weapon-axe": return gridWeapon(AXES[tier], (magic ? MAGIC_AXES : AXE_MATS)[tier]);
    case "weapon-wand": return gridWeapon(WANDS[tier], (magic ? MAGIC_WANDS : WAND_MATS)[tier], false);
    case "weapon-crossbow": return { ...gridWeapon(CROSSBOWS[tier], (magic ? MAGIC_CROSSBOWS : CROSSBOW_MATS)[tier], false, 0.2), hold: "bow" };
    case "weapon-bow": return bowWeapon(magic ? { ...BOWS[tier], ...MAGIC_BOWS[tier] } : BOWS[tier]);
    case "weapon-staff": return staffWeapon(magic ? { ...STAFFS[tier], ...MAGIC_STAFFS[tier] } : STAFFS[tier]);
  }
  throw new Error(`Sem arte para a arma ${family}`);
}

/** Arma básica da classe (sem arma equipada). */
export function classWeapon(classId: ClassId): WeaponArt {
  switch (classId) {
    case "knight": return gridWeapon(TRAINING_SWORD, [M.wood, M.darkWood, M.leather, M.wood]);
    case "paladin": return bowWeapon(PLAIN_BOW);
    case "sorcerer": return staffWeapon(ORB_STAFF);
    case "druid": return staffWeapon(BRANCH_STAFF);
    case "shaman": return staffWeapon(SKULL_STAFF);
  }
}


