import { ITEMS, type ItemSlot, type ItemTier } from "@kusa/shared";
import { itemMaterial } from "./items.ts";
import { placed, type Joints, type Point } from "./humanoid.ts";
import { ramp, solid, type Painter, type Ramp } from "./paint.ts";

/**
 * Como cada item aparece vestido no herói, no traço de `paint.ts`: o capacete cobre a cabeça
 * (o chapéu arcano troca por capuz, chapéu pontudo ou coroa), a armadura de guerra recobre o
 * tronco e os braços, as vestes arcanas tingem a túnica inteira, calça e botas trocam a cor das
 * pernas e dos pés, o escudo vai na outra mão e a arma muda pela família (espada ou machado, arco
 * ou besta, cajado ou varinha) e pelo material. As cores vêm de `itemMaterial`, as mesmas dos ícones.
 */

/** Ids dos itens vestidos por slot ("" = vazio). */
export type Outfit = Record<ItemSlot, string>;
export const NO_OUTFIT: Outfit = { weapon: "", helmet: "", armor: "", legs: "", boots: "", shield: "" };

/** Roupa de quem tem os slots como campos (o jogador sincronizado pelo servidor). */
export function outfitOf(p: Readonly<Outfit>): Outfit {
  return { weapon: p.weapon, helmet: p.helmet, armor: p.armor, legs: p.legs, boots: p.boots, shield: p.shield };
}

/** Chave estável de uma roupa (texturas e cache de retratos). */
export function outfitKey(outfit: Outfit) {
  return [outfit.weapon, outfit.helmet, outfit.armor, outfit.legs, outfit.boots, outfit.shield].map((id) => id || "-").join(".");
}

// --- Materiais -------------------------------------------------------------------

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return "#" + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, "0")).join("");
}

/** Um item vestido: nível, família ("weapon-axe", "armor-arcane"...) e as rampas do material e do detalhe. */
export interface Worn {
  tier: ItemTier;
  family: string;
  /** Do tom escuro (`M`) ao claro (`m`), com sombra e brilho além deles. */
  mat: Ramp;
  /** Detalhe do material (amarração, guarda, gema, barra). */
  acc: Ramp;
}

/** O item vestido no slot, ou nada. */
export function worn(outfit: Outfit, slot: ItemSlot): Worn | null {
  const item = ITEMS[outfit[slot]];
  if (item?.slot !== slot) return null;
  const { m, M, a } = itemMaterial(item.id);
  return { tier: item.tier, family: item.family, mat: [mix(M, "#000000", 0.35), M, mix(m, M, 0.45), m, mix(m, "#ffffff", 0.45)], acc: ramp(a) };
}

const WOOD = ramp("#8a5e32");
const DARK = solid("#1a1210");
const IVORY = ramp("#efe3c8");
const BLUE = ramp("#4c7bd9");
const GOLD = ramp("#f2c14e");

// --- Capacetes -----------------------------------------------------------------

/**
 * Capacete sobre a cabeça já desenhada (pele, cabelo e rosto); `r` é o raio da cabeça.
 * Os fechados redesenham a abertura do rosto com `skin` e chamam `eyes` por cima.
 */
export function helmet(s: Painter, j: Joints, w: Worn, r: number, skin: Ramp, eyes: () => void) {
  if (w.family === "helmet-arcane") return arcaneHat(s, j, w, r, skin, eyes);
  const { head: h, k, dir } = j;
  const { tier, mat, acc } = w;
  const side = dir === "side";
  const front = dir === "down";
  const faceX = side ? h.x - r * 0.45 : h.x;
  const opening = (rx: number, ry: number) => {
    if (dir === "up") return;
    s.sphere(faceX, h.y + 2.5 * k, (side ? rx * 0.7 : rx) * k, ry * k, skin, { edge: false });
    eyes();
  };
  switch (tier) {
    case 1: { // Gorro de couro com faixa.
      s.sphere(h.x, h.y - 0.5, r + 0.6, r * 0.95, mat, { clip: { bottom: h.y - 1.5 * k } });
      s.limb(h.x - r - 0.3, h.y - 2 * k, h.x + r + 0.3, h.y - 2 * k, 1.3 * k, 1.3 * k, acc);
      if (dir === "up") s.limb(h.x + 2, h.y - 2 * k, h.x + 4, h.y + 3 * k, 1, 0.8, acc);
      break;
    }
    case 2: { // Elmo de bronze aberto, com crista e protetores de bochecha.
      s.sphere(h.x, h.y - 0.5, r + 0.8, r, mat, { clip: { bottom: h.y - 1 * k } });
      s.limb(h.x - r - 1.2, h.y - 1.5 * k, h.x + r + 1.2, h.y - 1.5 * k, 1.2 * k, 1.2 * k, mat);
      if (side) {
        s.poly([h.x - r + 3, h.y - 1.5 * k, h.x - r + 0.5, h.y - 1.5 * k, h.x - r + 1.5, h.y + 5 * k, h.x - r + 4, h.y + 3 * k], mat);
        s.chain([h.x - r * 0.6, h.y - r - 1, 1.5 * k, h.x + 1, h.y - r - 3.5 * k, 1.7 * k, h.x + r * 0.7, h.y - r * 0.6, 1.3 * k], acc);
      } else {
        if (front) {
          for (const sign of [-1, 1]) {
            s.poly([h.x + sign * (r + 0.5), h.y - 1.5 * k, h.x + sign * (r - 3), h.y - 1.5 * k, h.x + sign * (r - 2), h.y + 5 * k, h.x + sign * (r + 0.5), h.y + 3 * k], mat);
          }
        }
        s.chain([h.x, h.y - r - 3.5 * k, 1.6 * k, h.x, h.y - r + 1 * k, 1.4 * k], acc);
      }
      break;
    }
    case 3: { // Elmo de ferro redondo, com rebites e protetor de nariz.
      s.sphere(h.x, h.y, r + 0.8, r * 0.98, mat);
      opening(5.8, 4.6);
      if (dir !== "up") s.rect(side ? h.x - r * 0.75 : h.x - 0.5, h.y - 2 * k, 1.5, 5 * k, mat, 3);
      s.limb(h.x - r - 0.5, h.y - 2.5 * k, h.x + r + 0.5, h.y - 2.5 * k, 1, 1, mat);
      const rivets = side ? [h.x - 1, h.x + 4] : [h.x - r * 0.6, h.x - r * 0.2, h.x + r * 0.2, h.x + r * 0.6];
      s.dots(rivets.flatMap((x) => [x, h.y - 2.5 * k]), mat, 0);
      break;
    }
    case 4: { // Elmo de aço fechado, com viseira e penacho azul.
      const back = side ? 1 : 0;
      s.chain([h.x, h.y - r, 1.8 * k, h.x + 2 + back * 4, h.y - r - 3.5 * k, 2.3 * k, h.x + 5 + back * 6, h.y - r, 2 * k, h.x + 6 + back * 7, h.y - r + 5 * k, 1.2 * k], BLUE);
      s.sphere(h.x, h.y, r + 0.8, r * 0.98, mat);
      if (dir !== "up") {
        const x0 = side ? h.x - r - 0.5 : h.x - r + 2, x1 = side ? h.x - 1 : h.x + r - 2;
        s.line(x0, h.y + 0.5 * k, x1, h.y + 0.5 * k, DARK);
        const glints = side ? [h.x - 5 * k] : [h.x - 3 * k, h.x + 3 * k];
        s.dots(glints.flatMap((x) => [x, h.y + 0.5 * k]), solid("#9fd8ff"));
        for (let y = 3; y <= 6; y += 1.5) s.line(side ? h.x - r + 0.5 : h.x - 2, h.y + y * k, side ? h.x - r + 2.5 : h.x + 2, h.y + y * k, mat, 1);
      }
      break;
    }
    case 5: { // Elmo do dragão: vermelho, chifres de marfim e guarnição dourada.
      for (const sign of side ? [1] : [-1, 1]) {
        const bx = h.x + sign * (r - 2) + (side ? 2 : 0);
        s.chain([bx, h.y - r * 0.4, 2 * k, bx + sign * 4 * k, h.y - r - 1, 1.4 * k, bx + sign * 3 * k, h.y - r - 6 * k, 0.6], IVORY);
      }
      s.sphere(h.x, h.y, r + 0.8, r * 0.98, mat);
      if (dir !== "up") s.sphere(faceX, h.y + 2.5 * k, (side ? 4.2 : 6) * k, 4.8 * k, GOLD, { edge: false, shade: 2 });
      opening(5, 3.9);
      s.limb(h.x - r * 0.8, h.y - 3 * k, h.x + r * 0.8, h.y - 3 * k, 0.9 * k, 0.9 * k, acc);
      if (front) s.sphere(h.x, h.y - 3 * k, 1.4 * k, 1.4 * k, acc);
      break;
    }
  }
}

/** O elmo fechado (nível 4 de guerra) esconde o rosto inteiro. */
export const closedHelmet = (w: Worn | null) => !!w && w.family !== "helmet-arcane" && w.tier === 4;

/**
 * Chapéus arcanos, no tecido do nível: capuz de lã e capuz rúnico (com runas no detalhe),
 * chapéu pontudo e chapéu do mago (com estrelas), e a coroa de chifres de dragão.
 */
function arcaneHat(s: Painter, j: Joints, w: Worn, r: number, skin: Ramp, eyes: () => void) {
  const { head: h, k, dir } = j;
  const { tier, mat, acc } = w;
  const side = dir === "side";
  const u = (dx: number, dy: number) => [h.x + dx * k, h.y + dy * k];
  if (tier === 1 || tier === 3) {
    const rr = r + k;
    if (dir === "up") s.limb(h.x, h.y + 2 * k, h.x + k, h.y + rr + 2 * k, 3 * k, 1.5 * k, mat);
    if (side) s.limb(h.x + 3 * k, h.y, h.x + rr + 2 * k, h.y + 4 * k, 3 * k, 1.5 * k, mat);
    s.sphere(h.x, h.y - 0.5 * k, rr, rr * 0.95, mat);
    if (dir !== "up") {
      s.sphere(h.x + (side ? -rr * 0.45 : 0), h.y + 1.5 * k, (side ? 5.6 : 7.5) * k, 6.5 * k, mat, { edge: false, shade: 1 });
      s.sphere(h.x + (side ? -r * 0.45 : 0), h.y + 2 * k, (side ? 4.5 : 6) * k, 5.2 * k, skin, { edge: false });
      eyes();
    }
    if (tier === 3) s.dots([h.x - 3 * k, h.y - rr + 2 * k, h.x, h.y - rr + 1.2 * k, h.x + 3 * k, h.y - rr + 2 * k], acc, 3);
    return;
  }
  if (tier === 5) {
    // Coroa: aro de seda vermelha com uma gema e chifres de dragão para trás.
    for (const sign of side ? [1] : [-1, 1]) {
      const bx = h.x + sign * (r - 2) + (side ? 2 : 0);
      s.chain([bx, h.y - r * 0.5, 1.8 * k, bx + sign * 3 * k, h.y - r - 2 * k, 1.2 * k, bx + sign * 5 * k, h.y - r - 4 * k, 0.6], IVORY);
    }
    s.sphere(h.x, h.y - r * 0.45, r + 0.6, 3 * k, mat);
    if (!side) s.sphere(h.x, h.y - r * 0.45, 1.4 * k, 1.4 * k, acc);
    return;
  }
  // Chapéu pontudo (nível 2) e chapéu do mago (nível 4, com estrelas).
  const tipX = h.x + (side ? 7 : 3) * k;
  s.poly([...u(-7, -3), ...u(7, -3), ...u(3, -13), tipX, h.y - 18 * k, ...u(-1, -13)], mat);
  s.poly([...u(-6.5, -4.5), ...u(6.5, -4.5), ...u(6, -6.5), ...u(-6, -6.5)], acc, { edge: false, shade: 3 });
  if (tier === 4) s.dots([...u(-1, -9), ...u(2, -12), ...u(1, -7)], solid("#fff2a8"));
  s.sphere(h.x, h.y - 3 * k, r + 3 * k, 3 * k, mat);
}

// --- Armaduras -------------------------------------------------------------------

/** Pinta pixels do padrão dentro do peito e da barriga (padrões das armaduras). */
function overChest(s: Painter, j: Joints, rampOf: (x: number, y: number) => Ramp | null, shade: number) {
  const { chest: c, k, b } = j;
  const rx = b.chestRx * (j.dir === "side" ? 0.75 : 1) * k - 1;
  const ry = b.chestRy * k - 1;
  const below = ry + 3 * k;
  const pts: number[] = [];
  let r: Ramp | null = null;
  for (let y = Math.floor(c.y - ry); y <= Math.ceil(c.y + below); y++) {
    for (let x = Math.floor(c.x - rx); x <= Math.ceil(c.x + rx); x++) {
      const nx = (x + 0.5 - c.x) / rx, ny = (y + 0.5 - c.y) / (y > c.y ? below : ry);
      if (nx * nx + ny * ny > 1) continue;
      const hit = rampOf(x, y);
      if (hit) { r = hit; pts.push(x, y); }
    }
  }
  if (r) s.dots(pts, r, shade);
}

/** Detalhes da armadura sobre o tronco (o tronco e os braços já saem na cor do material). */
export function armorDetails(s: Painter, j: Joints, w: Worn) {
  const { chest: c, k, dir, cx, hipY } = j;
  const { tier, mat, acc } = w;
  const front = dir === "down";
  if (w.family === "armor-arcane") {
    // Vestes arcanas: gola e faixa na cor do detalhe (runas a partir do manto rúnico).
    if (front) s.line(c.x - 3 * k, c.y - 5 * k, c.x + 3 * k, c.y - 5 * k, acc, 3);
    s.limb(cx - j.b.waistRx * k, hipY - 2 * k, cx + j.b.waistRx * k, hipY - 2 * k, 1.1 * k, 1.1 * k, acc);
    if (tier >= 3 && front) s.dots([c.x - 3 * k, c.y, c.x + 3 * k, c.y + k, c.x, c.y + 2.5 * k], acc, 4);
    return;
  }
  switch (tier) {
    case 1: // Gibão de couro: amarração cruzada no peito.
      if (front) for (let y = -4; y <= 3; y += 2) s.dots([c.x - 1, c.y + y * k, c.x + 1, c.y + (y + 1) * k], acc, 3);
      break;
    case 2: // Couraça de bronze: peitoral polido e a borda da placa.
      if (front) s.dots([c.x - 3.5 * k, c.y - 1.5 * k, c.x + 2.5 * k, c.y - 1.5 * k], acc, 4);
      s.line(cx - j.b.waistRx * k, hipY - 4 * k, cx + j.b.waistRx * k, hipY - 4 * k, mat, 1);
      break;
    case 3: // Cota de malha: anéis alternados.
      overChest(s, j, (x, y) => ((x + y) % 2 ? mat : null), 1);
      break;
    case 4: // Placas: faixas horizontais e gema azul no peito.
      for (const dy of [-1, 2.5]) s.line(c.x - 6 * k, c.y + dy * k, c.x + 6 * k, c.y + dy * k, mat, 1);
      if (front) s.sphere(c.x, c.y - 3.5 * k, 1.5 * k, 1.5 * k, BLUE);
      break;
    case 5: // Escamas de dragão em fileiras desencontradas e amuleto de ouro.
      overChest(s, j, (x, y) => (y % 2 === 0 && (x + (y % 4 === 0 ? 0 : 2)) % 4 === 0 ? mat : null), 1);
      if (front) s.sphere(c.x, c.y - 4 * k, 1.6 * k, 1.6 * k, acc);
      break;
  }
}

/** Espigão da ombreira do dragão, sobre a ombreira já desenhada. */
export function pauldronSpike(s: Painter, at: Point, k: number) {
  s.poly([at.x - 1.5 * k, at.y - 2.5 * k, at.x + 1.5 * k, at.y - 2.5 * k, at.x, at.y - 6.5 * k], IVORY);
}

// --- Escudos ---------------------------------------------------------------------

/** Escudo na mão `at`; de costas mostra a madeira com a alça, de lado fica de perfil. */
export function shield(s: Painter, j: Joints, at: Point, w: Worn) {
  const { k, dir } = j;
  const { tier, mat, acc } = w;
  const o = { x: at.x, y: at.y - 2 * k };
  const shape = (pts: number[], r: Ramp) => s.poly(placed(pts.map((v) => v * k), o), r);
  if (dir === "side") {
    shape([-1.2, -7, 1.8, -7, 1.8, 5, -1.2, 7], mat);
    return;
  }
  const back = dir === "up";
  const face = back ? WOOD : mat;
  switch (tier) {
    case 1: // Broquel de madeira com cravo.
      s.sphere(o.x, o.y, 4.8 * k, 4.8 * k, face);
      if (!back) s.sphere(o.x, o.y, 1.4 * k, 1.4 * k, acc);
      break;
    case 2: // Escudo redondo de bronze com bossa.
      s.sphere(o.x, o.y, 5.8 * k, 5.8 * k, face);
      if (!back) {
        s.sphere(o.x, o.y, 4.4 * k, 4.4 * k, mat, { light: -0.15 });
        s.sphere(o.x, o.y, 1.8 * k, 1.8 * k, acc);
      }
      break;
    case 3: // Escudo de ferro com faixa de couro.
      shape([-5.5, -6.5, 5.5, -6.5, 5.5, 1, 0, 8, -5.5, 1], face);
      if (!back) s.rect(o.x - 5 * k, o.y - 2 * k, 10 * k, 2 * k, acc, 2);
      break;
    case 4: // Escudo de aço alto, com cruz azul.
      shape([-5.5, -8, 5.5, -8, 5.5, 3, 0, 10, -5.5, 3], face);
      if (!back) {
        s.rect(o.x - 0.8 * k, o.y - 6.5 * k, 2 * k, 13 * k, BLUE, 2);
        s.rect(o.x - 4 * k, o.y - 3 * k, 8.5 * k, 2 * k, BLUE, 2);
      }
      break;
    case 5: // Escudo do dragão: aro e olho dourados.
      if (!back) shape([-6.8, -8, 6.8, -8, 6.8, 2.5, 0, 11, -6.8, 2.5], acc);
      shape([-5.5, -6.8, 5.5, -6.8, 5.5, 2, 0, 9.3, -5.5, 2], face);
      if (!back) {
        s.sphere(o.x, o.y - 0.5 * k, 2.6 * k, 1.8 * k, acc);
        s.line(o.x, o.y - 2 * k, o.x, o.y + 1 * k, DARK);
      }
      break;
  }
  if (back) s.line(o.x, o.y - 4 * k, o.x, o.y + 4 * k, ramp("#5e3c1c"), 1);
}

// --- Armas -----------------------------------------------------------------------

const seg = (pts: number[], at: Point, angle: number) => placed(pts, at, angle) as [number, number, number, number];

/** Espada reta: `length` da lâmina a partir da guarda. */
export function sword(s: Painter, at: Point, angle: number, k: number, blade: Ramp, guard: Ramp, length = 15) {
  const L = length * k, w = 1.6 * k;
  s.poly(placed([-w, -3 * k, w, -3 * k, w, -L, 0, -L - 3.5 * k, -w, -L], at, angle), blade);
  s.line(...seg([0, -4 * k, 0, -L], at, angle), blade, 4);
  s.limb(...seg([-4 * k, -2.5 * k, 4 * k, -2.5 * k], at, angle), 1.3 * k, 1.3 * k, guard);
  const [px, py] = placed([0, 3 * k], at, angle);
  s.sphere(px, py, 1.5 * k, 1.5 * k, guard);
}

/** Machado: cabo de madeira e lâmina no material; maior a cada nível, com a lâmina dupla a partir do mithral. */
function axe(s: Painter, at: Point, angle: number, k: number, w: Worn) {
  const f = (0.85 + w.tier * 0.06) * k;
  s.limb(...seg([0, 5 * f, 0, -16 * f], at, angle), 1.2 * k, 1.2 * k, WOOD);
  s.poly(placed([0, -15, -7, -18, -8.5, -12, -7, -6, 0, -9].map((v) => v * f), at, angle), w.mat);
  s.line(...seg([-8 * f, -17 * f, -8 * f, -7 * f], at, angle), w.mat, 4);
  if (w.tier >= 4) s.poly(placed([0, -14, 3.5, -16, 3.5, -10, 0, -11].map((v) => v * f), at, angle), w.mat);
}

/**
 * Arma do cavaleiro pela família e pelo nível (sem arma, a espada simples da classe): espadas
 * crescem de curta a longa, com guarda azul no mithral e a lâmina curva do dragão; machados são machados.
 */
export function knightWeapon(s: Painter, at: Point, angle: number, k: number, w: Worn | null) {
  if (!w) return sword(s, at, angle, k, ramp("#b4bcc8", 1.2), ramp("#8a6a48"));
  if (w.family === "weapon-axe") return axe(s, at, angle, k, w);
  const { mat, acc } = w;
  switch (w.tier) {
    case 1: return sword(s, at, angle, k, mat, acc, 11);
    case 2: return sword(s, at, angle, k, mat, acc);
    case 3: return sword(s, at, angle, k, mat, acc, 18);
    case 4: return sword(s, at, angle, k, mat, BLUE, 20);
    case 5: { // Lâmina do dragão: curva, rubra, guarda de asas douradas.
      const pts = [-1.8, -3, 1.8, -3, 2.6, -10, 3.4, -16, 1.5, -21, -0.6, -16, -1.4, -10].map((v) => v * k);
      s.poly(placed(pts, at, angle), mat);
      s.line(...seg([0.4 * k, -4 * k, 1.6 * k, -17 * k], at, angle), mat, 4);
      s.poly(placed([-6, -4.5, -1, -2.5, -1, -1.5, -5, -1].map((v) => v * k), at, angle), acc);
      s.poly(placed([6, -4.5, 1, -2.5, 1, -1.5, 5, -1].map((v) => v * k), at, angle), acc);
      const [px, py] = placed([0, 3 * k], at, angle);
      s.sphere(px, py, 1.5 * k, 1.5 * k, acc);
      return;
    }
  }
}

/** Besta do paladino em pé na mão: coronha de madeira, arco atravessado no material e corda. */
export function crossbow(s: Painter, at: Point, k: number, w: Worn) {
  const top = at.y - 9 * k;
  s.limb(at.x, at.y + 3 * k, at.x, top, 1.3 * k, 1.1 * k, WOOD);
  s.chain([at.x - 6 * k, top + 3 * k, 0.9 * k, at.x, top, 1.4 * k, at.x + 6 * k, top + 3 * k, 0.9 * k], w.mat);
  s.line(at.x - 6 * k, top + 3 * k, at.x + 6 * k, top + 3 * k, solid("#e8e0c8"), 2);
  s.dots([at.x, top - 1, at.x, top - 2], w.acc, 3);
}

/** Varinha curta na mão, com a gema do detalhe na ponta. */
export function wand(s: Painter, at: Point, k: number, w: Worn) {
  s.limb(at.x, at.y + 2 * k, at.x + 0.5 * k, at.y - 9 * k, 0.9 * k, 0.8 * k, w.mat);
  s.sphere(at.x + 0.5 * k, at.y - 10.5 * k, 1.8 * k, 1.8 * k, w.acc, { light: 0.2 });
  s.dots([at.x, at.y - 11 * k], solid("#ffffff"));
}

/** Madeira do arco e do cajado: a do material da arma equipada, ou madeira comum. */
export const weaponWood = (w: Worn | null): Ramp => w?.mat ?? WOOD;
/** Anéis e pontas do arco e do cajado. */
export const weaponTrim = (w: Worn | null): Ramp => w?.acc ?? ramp("#5e3c1c");
