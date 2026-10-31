import { HD, Paper as Painter, ebox, ellipse, inEllipse, limb, line, lit, noise, palette, poly, sn, sphere, type Pt } from "./paint.ts";

/**
 * Objetos que aparecem em todos os mapas, no padrão novo (`docs/ARTE_TIBIA.md`, `docs/CENARIOS_PLANO.md`, fase 0):
 * baú (trancado, destrancado e aberto), portal de saída, portal do boss e as manchas de sangue. Tudo em 128 px por
 * tile, pintado por código (`paint.ts`), sem `Math.random`; o jogo desenha em ¼. Só arrays: o teste `cenarios` pinta
 * tudo sem navegador.
 */

/** Materiais dos objetos (índice na paleta). */
export enum P { Wood, Plank, Iron, Gold, Inside, Coin, Stone, Rune, Glow, Void, Blood, Line }

const RAMPS = palette([
  ["#8a5a32", 0.95, 6], // Wood: tábuas do baú
  ["#5e3a22", 0.9, 6], // Plank: madeira por dentro da tampa
  ["#7a7c80", 1.05, 6, true], // Iron: cintas, rebites e corrente
  ["#c99a3a", 1.05, 8, true], // Gold: fechadura e cadeado
  ["#2a1a12", 0.5, 4], // Inside: fundo do baú aberto
  ["#e2b23e", 1.1, 9, true], // Coin: moedas
  ["#8a8478", 1, 5], // Stone: anel de pedra do portal
  ["#6ad2ff", 1.1, 10, true], // Rune: runas acesas no anel
  ["#3a9ee6", 1.2, 10, true], // Glow: redemoinho do portal de saída
  ["#8a4ae0", 1.2, 10, true], // Void: redemoinho do portal do boss
  ["#9a1c1a", 0.8, 5], // Blood: sangue (o jogo tinge para sangue verde, roxo ou preto)
  ["#2a1610", 0.4, 0], // Line: frestas e buraco da fechadura
]);

const paper = (w = HD, h = HD) => new Painter(RAMPS, w, h);

/** Estados do baú, na ordem das chaves de `CHEST_TEXTURE`. */
export type ChestState = "locked" | "unlocked" | "open";

/** Linha do chão do baú no quadro (o jogo centra o quadro no tile). */
const FLOOR = 110;
const L0 = 16, L1 = 112; // laterais
const LID = 58; // junta da tampa com o corpo

/** Tábuas na horizontal: fresta a cada 13 px e veio da madeira. */
const grain = (x: number, y: number) => ((y - 2) % 13 === 0 ? -2 : sn(x * 0.25, y * 3, 8, 41) > 0.68 ? -1 : 0);

/** Cinta de ferro vertical em `x0`, do alto da tampa (`top(x)`) ao chão, com rebites. */
function band(p: Painter, x0: number, top: (x: number) => number, bottom: number) {
  p.fill([x0, 0, x0 + 9, bottom], (x, y) => y >= top(x) - 1, P.Iron, (x) => lit((x - x0 - 4.5) / 9, -0.2, 0.9));
  for (let y = Math.ceil(top(x0 + 4) / 12) * 12 + 4; y < bottom - 3; y += 12) {
    p.on(x0 + 4, y, P.Iron, 5);
    p.on(x0 + 5, y + 1, P.Iron, 1);
  }
}

/**
 * Baú de madeira com cintas de ferro e fechadura dourada, visto de frente e um pouco de cima (aparece o topo da
 * tampa abaulada). Trancado: corrente em X e cadeado. Aberto: tampa para trás e moedas dentro.
 */
export function chest(state: ChestState): Uint8ClampedArray {
  const p = paper();
  const open = state === "open";
  // Corpo: a face da frente, levemente voltada para a luz.
  const top = open ? LID - 4 : LID;
  p.fill([L0, top, L1, FLOOR], () => true, P.Wood, (x, y) => lit(-0.15 + ((x - L0) / (L1 - L0)) * 0.3, 0.1 + ((y - top) / (FLOOR - top)) * 0.25, 0.95), grain);
  // Sombra da quina de baixo e da lateral direita.
  for (let x = L0; x <= L1; x++) p.on(x, FLOOR, P.Wood, 1);
  for (let y = top; y <= FLOOR; y++) p.on(L1, y, P.Wood, 1);
  if (open) {
    // Tampa aberta para trás: o lado de dentro, mais escuro, acima da boca.
    const back = (x: number) => 14 + Math.abs(x - 64) * 0.08;
    p.fill([L0 + 2, 10, L1 - 2, top - 14], (x, y) => y >= back(x), P.Plank, (x, y) => lit(0, -0.4 + (y - 10) / 80, 0.9), grain);
    // Boca: o fundo escuro com o monte de moedas.
    p.fill([L0 + 4, top - 14, L1 - 4, top + 2], () => true, P.Inside, () => 0.3);
    const coin = (cx: number, cy: number, k: number) => {
      ellipse(p, cx, cy, 6, 3.6, P.Coin);
      p.on(cx - 2, cy - 1, P.Coin, 5);
      if (k % 3 === 0) p.on(cx + 2, cy + 1, P.Coin, 1);
    };
    p.together(() => ellipse(p, 64, top - 4, 42, 10, P.Coin));
    for (let k = 0; k < 14; k++) coin(30 + (k % 7) * 11 + (k > 6 ? 5 : 0), top - 10 + (k > 6 ? 6 : 0) - Math.sin((k % 7) / 6 * Math.PI) * 4, k);
    // Brilho de uma gema no meio das moedas.
    ellipse(p, 72, top - 9, 4, 3, P.Rune);
    // Beirada da boca, de ferro.
    p.fill([L0, top - 2, L1, top + 3], () => true, P.Iron, (x, y) => lit(0, (y - top) / 3, 0.9));
    p.fill([L0 - 2, 12, L0 + 4, top], (x, y) => y > 12 + (x - L0 + 2) * 0.5, P.Iron, () => 0.7);
    p.fill([L1 - 4, 12, L1 + 2, top], (x, y) => y > 12 + (L1 + 2 - x) * 0.5, P.Iron, () => 0.45);
  } else {
    // Tampa abaulada (meio cilindro deitado): o topo pega a luz.
    const crown = (x: number) => LID - 30 * Math.sqrt(Math.max(0, 1 - ((x - 64) / 50) ** 2)) * 0.9 - 4;
    p.fill([L0, 20, L1, LID], (x, y) => y >= crown(x), P.Wood, (x, y) => {
      const ny = (y - LID) / 30;
      return lit((x - 64) / 70, ny, Math.sqrt(Math.max(0.05, 1 - ny * ny)));
    }, (x, y) => ((x - 4) % 16 === 0 ? -2 : sn(x * 3, y * 0.3, 8, 43) > 0.7 ? -1 : 0));
    // Junta da tampa: cinta de ferro deitada.
    p.fill([L0, LID - 3, L1, LID + 3], () => true, P.Iron, (x, y) => lit(0, (y - LID) / 4, 0.9));
  }
  const lidTop = open ? (x: number) => top - 2 + 0 * x : (x: number) => LID - 30 * Math.sqrt(Math.max(0, 1 - ((x - 64) / 50) ** 2)) * 0.9 - 4;
  band(p, 26, lidTop, FLOOR);
  band(p, 93, lidTop, FLOOR);
  // Cantoneiras de ferro nas quinas de baixo.
  for (const x of [L0, L1 - 10]) p.fill([x, FLOOR - 10, x + 10, FLOOR], () => true, P.Iron, () => 0.55);
  if (!open) {
    // Espelho da fechadura, de ouro, com o buraco.
    p.together(() => {
      poly(p, [[54, LID - 6], [74, LID - 6], [76, LID + 16], [64, LID + 24], [52, LID + 16]], P.Gold, (x, y) => lit((x - 64) / 16, (y - LID - 8) / 24, 0.9));
    });
    line(p, [53, LID - 6], [75, LID - 6], P.Gold, 5);
    ellipse(p, 64, LID + 5, 2.6, 2.6, P.Line);
    p.fill([63, LID + 5, 65, LID + 12], () => true, P.Line, () => 0.2);
  }
  if (state === "locked") {
    // Corrente em X por cima de tudo.
    const link = (a: Pt, b: Pt) => {
      const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7);
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
        if (k % 2) ellipse(p, x, y, 3.4, 2.2, P.Iron);
        else p.fill(ebox(x, y, 3.6, 3.6), (u, v) => {
          const d = Math.hypot(u - x, v - y);
          return d <= 3.6 && d >= 1.6;
        }, P.Iron, sphere(x, y, 3.6, 3.6));
      }
    };
    link([L0 + 4, 30], [L1 - 4, FLOOR - 6]);
    link([L1 - 4, 30], [L0 + 4, FLOOR - 6]);
    // Cadeado no cruzamento: alça de ferro e corpo de ouro.
    p.fill(ebox(64, 66, 10, 11), (x, y) => {
      const d = Math.hypot(x - 64, y - 66);
      return y <= 66 && d <= 10 && d >= 6;
    }, P.Iron, sphere(64, 66, 10, 11));
    p.together(() => {
      p.fill([51, 66, 77, 90], (x, y) => y < 86 || Math.abs(x - 64) < 13 - (y - 86) * 2, P.Gold, (x, y) => lit((x - 64) / 16, (y - 78) / 20, 0.9));
    });
    ellipse(p, 64, 76, 2.4, 2.4, P.Line);
    p.fill([63, 76, 65, 83], () => true, P.Line, () => 0.2);
    p.on(55, 69, P.Gold, 5);
  }
  return p.render(true);
}

/** Portais: o de saída (azul, com anel de pedra) e o do boss (roxo, sem anel: ele surge no meio da sala). */
export type PortalKind = "escape" | "boss";

/**
 * Portal visto de cima, como um poço de luz no chão: redemoinho em espiral, mais claro no centro. O de saída tem um
 * anel de pedras com runas acesas em volta.
 */
export function portal(kind: PortalKind): Uint8ClampedArray {
  const p = paper();
  const cx = 64, cy = 66;
  const rx = kind === "escape" ? 44 : 52, ry = kind === "escape" ? 32 : 40;
  const mat = kind === "escape" ? P.Glow : P.Void;
  // Redemoinho: braços em espiral (seno do ângulo somado ao raio) e o centro aceso.
  p.fill(ebox(cx, cy, rx, ry), inEllipse(cx, cy, rx, ry), mat, (x, y) => {
    const u = (x - cx) / rx, v = (y - cy) / ry;
    const r = Math.hypot(u, v);
    const arm = 0.5 + 0.5 * Math.sin(Math.atan2(v, u) * 3 + r * 9);
    return Math.min(1, 0.18 + (1 - r) * 0.6 + arm * 0.3 * (1 - r * 0.4));
  });
  // Faíscas presas na espiral.
  for (let k = 0; k < 18; k++) {
    const a = k * 2.4, r = 0.25 + noise(k, 3, 77) * 0.6;
    p.on(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, mat, 5);
  }
  if (kind === "escape") {
    // Anel de 10 pedras gastas em volta, cada uma com uma runa acesa.
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + 0.3;
      const sx = cx + Math.cos(a) * (rx + 8), sy = cy + Math.sin(a) * (ry + 7);
      const w = 9 + noise(k, 1, 78) * 3, h = 7 + noise(k, 2, 78) * 2;
      ellipse(p, sx, sy, w, h, P.Stone, (x, y) => (noise(x, y, 79) > 0.86 ? -1 : 0));
      p.on(sx, sy - 1, P.Rune, 5);
      p.on(sx - 1, sy, P.Rune, 4);
      p.on(sx + 1, sy, P.Rune, 4);
    }
  }
  return p.render(true);
}

/** Tipos de mancha de sangue (cada um com `BLOOD_VARIANTS` desenhos). */
export type BloodKind = "splat" | "puddle";
export const BLOOD_VARIANTS = 3;

/**
 * Mancha de sangue no chão, sem contorno (é chão): o respingo é um borrão pequeno com gotas em volta; a poça, uma
 * mancha maior e abaulada, com o brilho molhado em cima à esquerda.
 */
export function blood(kind: BloodKind, v: number): Uint8ClampedArray {
  const p = paper();
  const r = (k: number) => noise(k, v, kind === "splat" ? 81 : 82);
  const cx = 64, cy = 64;
  const size = kind === "splat" ? 16 : 30;
  // Borda irregular: o raio varia com o ângulo (3 ondas de sorteio fixo por desenho).
  const edge = (a: number) => 1 + 0.22 * Math.sin(a * 3 + r(1) * 6) + 0.14 * Math.sin(a * 5 + r(2) * 6) + 0.08 * Math.sin(a * 9 + r(3) * 6);
  const rx = size * (1.15 + r(4) * 0.3), ry = size * (0.8 + r(5) * 0.2);
  p.fill(ebox(cx, cy, rx * 1.5, ry * 1.5), (x, y) => {
    const u = (x - cx) / rx, w = (y - cy) / ry;
    return Math.hypot(u, w) <= edge(Math.atan2(w, u));
  }, P.Blood, (x, y) => {
    const u = (x - cx) / (rx * 1.4), w = (y - cy) / (ry * 1.4);
    return lit(u, w, Math.sqrt(Math.max(0.2, 1 - u * u - w * w)) * 2.2) * 0.85;
  });
  // Gotas e escorridos em volta.
  const drops = kind === "splat" ? 9 : 6;
  for (let k = 0; k < drops; k++) {
    const a = r(10 + k) * Math.PI * 2;
    const d = (kind === "splat" ? 1.5 : 1.2) + r(20 + k) * 1.1;
    const dx = cx + Math.cos(a) * rx * d, dy = cy + Math.sin(a) * ry * d;
    const s = (kind === "splat" ? 2.2 : 3) + r(30 + k) * 3;
    ellipse(p, dx, dy, s, s * 0.8, P.Blood);
    // Gota alongada: afina na direção de onde veio.
    if (k % 3 === 0) limb(p, [dx, dy], [dx - Math.cos(a) * s * 2.6, dy - Math.sin(a) * s * 2], s * 0.8, s * 0.25, P.Blood);
  }
  // Brilho molhado.
  for (let k = 0; k < 4; k++) p.on(cx - rx * 0.4 + k, cy - ry * 0.45 - (k > 1 ? 1 : 0), P.Blood, 5);
  return p.render(false, kind === "splat" ? 235 : 245);
}

/** Todas as peças desta arte, por nome (o teste `cenarios` pinta todas). */
export const PROP_PIECES: Record<string, () => Uint8ClampedArray> = {
  "chest-locked": () => chest("locked"),
  "chest-unlocked": () => chest("unlocked"),
  "chest-open": () => chest("open"),
  "portal-escape": () => portal("escape"),
  "portal-boss": () => portal("boss"),
  ...Object.fromEntries((["splat", "puddle"] as const).flatMap((k) =>
    Array.from({ length: BLOOD_VARIANTS }, (_, v) => [`blood-${k}-${v}`, () => blood(k, v)]))),
};
