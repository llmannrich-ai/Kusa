import type { ItemTier } from "@kusa/shared";
import { M } from "./materials.ts";
import { ellipse, limb, or, rect, type Mask } from "./raster.ts";
import type { Ctx, Held, Wear } from "./compose.ts";
import type { Leg } from "./rig.ts";
import { skirt } from "./look.ts";

/**
 * Itens mágicos vestidos: cada um é o desenho do seu nível repintado com materiais próprios (`remap`) e,
 * em vários, um enfeite que só ele tem (emblema, runas, asas, um rosto no escudo). As armas mágicas ficam
 * em `weapons.ts`.
 */

type Remap = [number, number][];

interface MagicLook {
  remap: Remap;
  /** Enfeites pintados depois da peça, nos mesmos ganchos. */
  extra?: Wear & Partial<Held>;
}

const front = (c: Ctx) => c.p.dir === "down";

/** Pontos acesos espalhados numa forma (runas, estrelas, brasas). */
function sparkle(c: Ctx, m: Mask, mat: number, every: number, seed = 0) {
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = i % 48, y = Math.floor(i / 48) - c.p.bob;
    if ((x * 7 + y * 11 + seed) % every === 0) c.cv.dot(x, y + c.p.bob, mat, 4);
  }
}

/** Asinha no tornozelo (botas aladas). */
function ankleWing(c: Ctx, leg: Leg, mat: number) {
  const [ax, ay] = leg.ankle;
  const out = c.p.dir === "side" ? 1 : ax < 24 ? -1 : 1;
  const m = or(ellipse(ax + out * 3, ay - 2.5, 1.8, 1.1), ellipse(ax + out * 4.2, ay - 3.6, 1.2, 0.8));
  c.cv.paint(m, mat, { light: "sphere", dark: leg.far ? -1 : 0, tex: (x) => (x % 2 ? -1 : 0) });
}

const ARMOR: Record<string, Record<ItemTier, MagicLook>> = {
  "armor-war": {
    1: { remap: [[M.leather, M.greenLeather], [M.rope, M.gold]] }, // Gibão do Aventureiro
    2: { // Couraça do Leão: dourada, tiras vermelhas e a cara do leão no peito.
      remap: [[M.bronze, M.gold], [M.leather, M.plumeRed]],
      extra: {
        torso(c) {
          if (!front(c)) return;
          const y = c.p.shoulder + 2.5;
          c.cv.paint(ellipse(23.5, y, 2.2, 1.9), M.bronze, { light: "sphere", spec: true });
          c.cv.dot(22, Math.round(y) - 1, M.amber, 4); c.cv.dot(25, Math.round(y) - 1, M.amber, 4);
        },
      },
    },
    3: { remap: [[M.iron, M.elfSilver], [M.darkIron, M.greenLeather]] }, // Cota Élfica
    4: { // Armadura de Placas Anã: aço escuro, bronze e runas anãs acesas no peito.
      remap: [[M.mithral, M.steel], [M.gold, M.bronze], [M.sapphire, M.ruby]],
      extra: {
        torso(c) {
          if (c.p.dir === "up") return;
          const b = c.p.bob;
          for (const [x, y] of [[20, 26], [21, 27], [26, 26], [27, 27], [20, 29], [27, 29]]) c.cv.dot(x - (c.p.dir === "side" ? 0 : 0), y + b, M.rune, 4);
        },
      },
    },
    5: { // Escamas do Dragão Vermelho: escamas em brasa entre placas de obsidiana.
      remap: [[M.dragon, M.ember], [M.dragonDark, M.obsidian]],
      extra: { torso(c) { sparkle(c, c.p.torso, M.fire, 9); } },
    },
  },
  "armor-arcane": {
    1: { remap: [[M.linen, M.ash], [M.rope, M.sorcDeep]] }, // Túnica do Aprendiz
    2: { remap: [[M.wool, M.greenCloth], [M.gold, M.silverWhite], [M.bronze, M.silverWhite]] }, // Manto Élfico
    3: { remap: [[M.runeCloth, M.wool], [M.sorcDeep, M.night], [M.rune, M.holy]] }, // Manto da Proteção
    4: { remap: [[M.silk, M.runeCloth], [M.plumeBlue, M.gold], [M.sapphire, M.amethyst]] }, // Manto do Arquimago
    5: { // Manto das Estrelas: azul-noite salpicado de estrelas.
      remap: [[M.dragonSilk, M.night], [M.dragon, M.night], [M.gold, M.silverWhite], [M.ruby, M.star], [M.dragonDark, M.night]],
      extra: {
        torso(c) { sparkle(c, or(c.p.torso, skirt(c.p, 40 + c.p.bob, 2)), M.star, 13, 3); },
        cape(c) { sparkle(c, or(c.p.torso, skirt(c.p, 42 + c.p.bob, 3)), M.star, 11, 5); },
      },
    },
  },
  "helmet-war": {
    1: { remap: [[M.leather, M.plumeRed], [M.darkLeather, M.leather]] }, // Gorro do Escudeiro
    2: { remap: [[M.bronze, M.steel], [M.plumeRed, M.shadow]] }, // Elmo do Vigia
    3: { // Elmo do Brilho: prata e ouro, com luz sagrada no aro.
      remap: [[M.iron, M.silverWhite], [M.darkIron, M.gold], [M.steel, M.holy]],
    },
    4: { // Elmo do Cavaleiro Grifo: ouro, penacho branco e asas de grifo dos lados.
      remap: [[M.mithral, M.gold], [M.plumeBlue, M.feather], [M.gold, M.bronze]],
      extra: {
        head(c) {
          const [hx, hy] = c.p.head;
          const wing = (dir: number) => or(ellipse(hx + dir * 9.5, hy - 4, 1.8, 3), ellipse(hx + dir * 10.5, hy - 6.5, 1.3, 2.2));
          const sides = c.p.dir === "side" ? [1] : [-1, 1];
          for (const d of sides) c.cv.paint(wing(d), M.feather, { light: "cyl", tex: (_x, y) => (y % 2 ? -1 : 0) });
        },
      },
    },
    5: { remap: [[M.dragon, M.obsidian], [M.ivory, M.gold], [M.fire, M.amethyst], [M.gold, M.amethyst]] }, // Elmo do Senhor dos Dragões
  },
  "helmet-arcane": {
    1: { remap: [[M.woolBrown, M.ash]] }, // Capuz do Eremita
    2: { // Chapéu do Ilusionista: roxo, faixa de ouro e uma estrela.
      remap: [[M.wool, M.sorcPurple], [M.leather, M.gold], [M.bronze, M.star]],
    },
    3: { // Capuz da Clarividência: azul-noite com o terceiro olho na testa.
      remap: [[M.runeCloth, M.night], [M.rune, M.amber], [M.sorcDeep, M.wool]],
      extra: {
        head(c) {
          if (!front(c)) return;
          const y = Math.round(c.p.head[1] - 3);
          c.cv.paint(ellipse(23.5, y, 1.6, 1), M.eyeWhite, { light: "flat", line: "hard" });
          c.cv.dot(23, y, M.amber, 4); c.cv.dot(24, y, M.amber, 3);
        },
      },
    },
    4: { remap: [[M.silk, M.sorcPurple], [M.sapphire, M.gold]] }, // Chapéu do Arquimago
    5: { remap: [[M.gold, M.silverWhite], [M.ivory, M.obsidian], [M.ruby, M.amethyst]] }, // Diadema do Dragão Ancião
  },
  "legs-war": {
    1: { remap: [[M.leather, M.woolBrown], [M.darkLeather, M.leather]] }, // Calças do Viajante
    2: { remap: [[M.bronze, M.gold], [M.darkLeather, M.plumeRed]] }, // Perneiras do Gladiador
    3: { remap: [[M.iron, M.elfSilver]] }, // Perneiras de Malha Élfica
    4: { remap: [[M.mithral, M.silverWhite], [M.gold, M.holy], [M.iron, M.steel]] }, // Coxotes do Guardião
    5: { remap: [[M.dragonDark, M.obsidian], [M.gold, M.ember]] }, // Perneiras do Dragão
  },
  "legs-arcane": {
    1: { remap: [[M.linen, M.ash]] }, // Calças do Novato
    2: { remap: [[M.wool, M.sorcPurple], [M.gold, M.star]] }, // Calças de Seda Encantada
    3: { remap: [[M.runeCloth, M.night], [M.rune, M.amber]] }, // Calças do Vidente
    4: { remap: [[M.silk, M.runeCloth], [M.plumeBlue, M.gold]] }, // Calças do Conjurador
    5: { remap: [[M.dragonDark, M.dragonSilk], [M.gold, M.ivory]] }, // Calças da Asa do Dragão
  },
  "boots-boots": {
    1: { remap: [[M.leather, M.greenLeather]] }, // Botas Élficas
    2: { remap: [[M.darkLeather, M.woolBrown], [M.bronze, M.leather]] }, // Botas do Andarilho
    3: { // Botas da Rapidez: aço gélido com um raio aceso na canela.
      remap: [[M.iron, M.frostSteel]],
      extra: {
        leg(c, leg) {
          const [ax, ay] = leg.ankle;
          const x = Math.round(ax - 0.5);
          for (const [dx, dy] of [[1, -6], [0, -5], [1, -4], [0, -3]]) c.cv.dot(x + dx, Math.round(ay) + dy, M.rune, leg.far ? 3 : 4);
        },
      },
    },
    4: { // Botas Aladas: prata com asinhas brancas no tornozelo.
      remap: [[M.mithral, M.silverWhite]],
      extra: { leg(c, leg) { ankleWing(c, leg, M.feather); } },
    },
    5: { // Botas do Dragão Alado: escamas rubras com asas de dragão no tornozelo.
      remap: [[M.dragonDark, M.dragon]],
      extra: { leg(c, leg) { ankleWing(c, leg, M.dragonDark); } },
    },
  },
  "shield-shield": {
    1: { remap: [[M.wood, M.plumeRed], [M.iron, M.gold]] }, // Broquel do Escudeiro
    2: { // Escudo Sentinela: aço com um olho vigilante no meio.
      remap: [[M.bronze, M.steel]],
      extra: {
        draw(c, arm) {
          if (c.p.dir === "up") return;
          const [hx, hy] = arm.hand;
          const cx = c.p.dir === "side" ? hx - 2.5 : hx - 1;
          const cy = hy - (c.p.dir === "side" ? 3 : 2.5);
          c.cv.paint(ellipse(cx, cy, c.p.dir === "side" ? 1.4 : 2, 1.2), M.eyeWhite, { light: "flat", line: "hard" });
          c.cv.dot(Math.round(cx - 0.5), Math.round(cy), M.sapphire, 4);
        },
      },
    },
    3: { // Escudo Animado: bronze, com um rosto que olha de volta.
      remap: [[M.iron, M.bronze], [M.darkIron, M.darkLeather], [M.steel, M.gold]],
      extra: {
        draw(c, arm) {
          if (c.p.dir === "up") return;
          const [hx, hy] = arm.hand;
          const s = c.p.dir === "side";
          const cx = s ? hx - 2.5 : hx - 1;
          const cy = hy - (s ? 3 : 2.5);
          const ex = s ? [Math.round(cx - 1)] : [Math.round(cx - 2.5), Math.round(cx + 1.5)];
          for (const x of ex) c.cv.dot(x, Math.round(cy - 2), M.fire, 4);
          c.cv.paint(rect(Math.round(cx - (s ? 1.5 : 2)), Math.round(cy + 1), Math.round(cx + (s ? 0 : 1)), Math.round(cy + 1)), M.shadow, { light: "flat", bevel: false, t: 1, group: "keep" });
        },
      },
    },
    4: { remap: [[M.plumeBlue, M.runeCloth], [M.mithral, M.rune]] }, // Escudo da Guarda Arcana
    5: { remap: [[M.dragon, M.obsidian], [M.amber, M.fire]] }, // Escudo do Dragão Ancião
  },
};

/** Executa `fn` com a troca de materiais ativa. */
function remapped<T extends unknown[]>(remap: ReadonlyMap<number, number>, fn: (c: Ctx, ...a: T) => void) {
  return (c: Ctx, ...a: T) => {
    const prev = c.cv.remap;
    c.cv.remap = remap;
    try { fn(c, ...a); } finally { c.cv.remap = prev; }
  };
}

/** Versão mágica de uma peça (roupa ou escudo): os mesmos ganchos com outros materiais e o enfeite. */
export function magicWear<T extends Wear | Held>(family: string, tier: ItemTier, base: T): T {
  const look = ARMOR[family]?.[tier];
  if (!look) return base;
  const map = new Map(look.remap);
  const out: Record<string, unknown> = {};
  for (const [k, fn] of Object.entries(base)) {
    if (typeof fn !== "function") continue;
    const wrapped = remapped(map, fn as (c: Ctx, ...a: unknown[]) => void);
    const extra = (look.extra as Record<string, ((c: Ctx, ...a: unknown[]) => void) | undefined> | undefined)?.[k];
    out[k] = extra ? (c: Ctx, ...a: unknown[]) => { wrapped(c, ...a); extra(c, ...a); } : wrapped;
  }
  return out as T;
}

/** Troca de materiais de um item mágico (para a manopla seguir a armadura). */
export function magicRemap(family: string, tier: ItemTier): ReadonlyMap<number, number> | undefined {
  const look = ARMOR[family]?.[tier];
  return look && new Map(look.remap);
}

/** Famílias de peças vestidas que têm versão mágica desenhada (para o teste de cobertura). */
export const MAGIC_FAMILIES = Object.keys(ARMOR);
