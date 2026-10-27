import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas, px } from "./pixels.ts";

/**
 * Bosses da Caverna da Travessia: arte própria, 32×32, que o `refineArt` dobra como as do pack (o boss aparece com
 * o dobro do tile). Os dois olham para a esquerda, com a luz de cima à esquerda, como no resto do jogo.
 */

type Cells = (string | null)[];

function grid() {
  const T = TILE_SIZE;
  const cells: Cells = new Array(T * T).fill(null);
  const set = (x: number, y: number, c: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < T && y < T) cells[y * T + x] = c;
  };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < T && y < T ? cells[y * T + x] : null);
  const paint = () => {
    const { canvas, ctx } = makeCanvas(T, T);
    cells.forEach((c, i) => { if (c) px(ctx, i % T, Math.floor(i / T), c); });
    return canvas;
  };
  return { set, get, paint };
}

const SCALE = { dark: "#2f3b2c", mid: "#55684a", light: "#7f9468", glow: "#a9bd88" };
const BELLY = "#b9b28a";
const SPINE = "#3c2f24";
const EYE = { glow: "#d8ff7a", core: "#7cff3a" };

/**
 * Basilisco: lagarto comprido de oito patas curtas, escamas de pedra cinza-esverdeadas, crista de espinhos nas
 * costas, rabo grosso enrolando para cima à direita e os olhos verdes acesos (o olhar que petrifica).
 */
export function basiliskCanvas() {
  const { set, get, paint } = grid();
  // Corpo: elipse comprida, com o rabo afinando para a direita e subindo.
  const body = (x: number) => ({ cy: 19 + Math.sin((x - 6) / 9) * 0.8, r: x < 22 ? 5.2 - Math.max(0, x - 15) * 0.12 : 4.4 - (x - 22) * 0.38 });
  for (let x = 5; x < 31; x++) {
    const { cy, r } = body(x);
    const lift = x > 24 ? (x - 24) * 0.9 : 0;
    for (let y = Math.floor(cy - r - lift); y <= cy + r - lift; y++) {
      const v = (y - (cy - lift)) / r; // -1 em cima, +1 embaixo
      if (Math.abs(v) > 1) continue;
      let c = v < -0.6 ? SCALE.glow : v < -0.1 ? SCALE.light : v < 0.55 ? SCALE.mid : SCALE.dark;
      if (v > 0.62 && x < 23) c = BELLY;
      // Escamas: um ponto escuro em xadrez.
      if (v < 0.4 && (x + y * 2) % 4 === 0 && hash(x, y, 31) < 0.7) c = SCALE.dark;
      set(x, y, c);
    }
  }
  // Crista de espinhos nas costas.
  for (let x = 8; x < 26; x += 2) {
    const { cy, r } = body(x);
    const top = Math.floor(cy - r);
    set(x, top - 1, SPINE);
    if (x % 4 === 0) set(x, top - 2, SPINE);
  }
  // Oito patas: quatro à vista, abertas para os lados (as da frente para a frente, as de trás para trás), e as
  // quatro do outro lado, mais escuras e curtas, aparecendo entre elas.
  const leg = (x: number, dir: number, len: number, color: string) => {
    const { cy, r } = body(x);
    let lx = x;
    let ly = Math.floor(cy + r) - 1;
    for (let k = 0; k < len; k++) {
      ly += 1;
      if (k % 2 === 1) lx += dir;
      set(lx, ly, color);
      set(lx + 1, ly, color);
    }
    set(lx - 1 + (dir > 0 ? 2 : 0), ly, SCALE.dark);
    set(lx + (dir > 0 ? 3 : -1), ly, SCALE.dark);
  };
  for (const x of [9, 18]) leg(x + 2, x < 12 ? -1 : 1, 3, SCALE.dark);
  for (const x of [7, 11, 16, 20]) leg(x, x < 12 ? -1 : 1, 4, SCALE.mid);
  // Cabeça: cunha achatada à esquerda, boca com dentes.
  for (let y = 12; y <= 23; y++)
    for (let x = 0; x <= 9; x++) {
      const d = ((x - 6) / 6.2) ** 2 + ((y - 17.5) / 4.6) ** 2;
      if (d > 1) continue;
      const v = (y - 17.5) / 4.6;
      set(x, y, v < -0.5 ? SCALE.glow : v < 0 ? SCALE.light : v < 0.6 ? SCALE.mid : SCALE.dark);
    }
  for (let x = 1; x <= 7; x++) set(x, 19, "#1a120c");
  for (const x of [2, 4, 6]) set(x, 20, "#efe6cf");
  for (const x of [3, 5]) set(x, 18, "#efe6cf");
  // Olhos acesos, com um halo.
  for (const [x, y] of [[4, 15], [7, 14]]) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (get(x + dx, y + dy)) set(x + dx, y + dy, EYE.glow);
    set(x, y, EYE.core);
  }
  set(3, 13, SPINE);
  set(6, 12, SPINE);
  return paint();
}

const FLESH = { dark: "#3d1a4a", mid: "#6e2f7f", light: "#9c4fb0", glow: "#c983d6" };
const STALK = "#52245f";

/**
 * Observador das Profundezas: esfera roxa flutuando, com o olho central enorme (íris verde, pupila em fenda), a boca
 * larga cheia de dentes embaixo e dez hastes no alto, cada uma com um olho menor na ponta.
 */
export function beholderCanvas() {
  const { set, paint } = grid();
  const c = { x: 15.5, y: 17, r: 10.5 };
  // Hastes primeiro (o corpo passa por cima da base delas).
  const stalks = [-1.25, -0.95, -0.65, -0.35, -0.08, 0.2, 0.48, 0.78, 1.08, 1.38];
  stalks.forEach((a, i) => {
    const ang = -Math.PI / 2 + a;
    const len = 6 + (i % 3) * 1.5;
    let x = c.x + Math.cos(ang) * (c.r - 2);
    let y = c.y + Math.sin(ang) * (c.r - 2);
    const bend = (i % 2 ? 1 : -1) * 0.35;
    for (let k = 0; k < len; k++) {
      const t = ang + bend * (k / len);
      x += Math.cos(t);
      y += Math.sin(t);
      set(x, y, STALK);
    }
    // Olho menor na ponta.
    set(x, y, "#f2ecd8");
    set(x + 1, y, "#f2ecd8");
    set(x + (i % 2 ? 1 : 0), y, i % 3 === 0 ? "#ff4fa3" : "#ffd23a");
  });
  // Corpo.
  for (let y = 0; y < TILE_SIZE; y++)
    for (let x = 0; x < TILE_SIZE; x++) {
      const d = Math.hypot(x - c.x, y - c.y);
      if (d > c.r) continue;
      const u = (x - c.x + (y - c.y)) / c.r;
      let col = u < -0.75 ? FLESH.glow : u < -0.2 ? FLESH.light : u < 0.55 ? FLESH.mid : FLESH.dark;
      // Placas da couraça: veios escuros.
      if (hash(x, y, 33) < 0.08 && d < c.r - 1) col = FLESH.dark;
      set(x, y, col);
    }
  // Olho central, puxado para a esquerda (olha para quem está à esquerda).
  const eye = { x: 12.5, y: 14.5 };
  for (let y = 9; y <= 20; y++)
    for (let x = 6; x <= 19; x++) {
      const ex = (x - eye.x) / 5.2;
      const ey = (y - eye.y) / 4.2;
      const d = Math.hypot(ex, ey);
      if (d > 1) continue;
      let col = d > 0.82 ? "#d8cfb8" : "#f6f0de";
      const iris = Math.hypot(x - (eye.x - 0.5), y - eye.y);
      if (iris < 3) col = iris < 2 ? "#3fae4c" : "#2a7a36";
      if (Math.abs(x - (eye.x - 0.5)) < 0.6 && Math.abs(y - eye.y) < 2.6) col = "#0b0b0b";
      set(x, y, col);
    }
  set(10, 12, "#ffffff");
  // Pálpebra de cima, escura.
  for (let x = 8; x <= 17; x++) set(x, 9 + Math.round(Math.abs(x - 12.5) * 0.35), FLESH.dark);
  // Boca larga embaixo, com dentes.
  for (let x = 8; x <= 23; x++) {
    const y = 22 + Math.round(((x - 15.5) / 8) ** 2 * 2.2);
    set(x, y, "#1a0612");
    set(x, y + 1, "#1a0612");
    if (x % 2 === 0) set(x, y, "#efe6cf");
    if (x % 2 === 1) set(x, y + 1, "#efe6cf");
  }
  return paint();
}
