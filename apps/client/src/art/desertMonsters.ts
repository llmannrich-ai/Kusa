import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas, px } from "./pixels.ts";

/**
 * Monstros comuns do Mar de Areia em arte própria, 32×32 (o `refineArt` dobra, como as do pack): Escorpião da Areia,
 * Abutre Gigante e Múmia. Todos olham para a esquerda, com luz de cima à esquerda, como o resto do deserto.
 */

export const DESERT_MONSTER_OUTLINE = "#1b1008";

/** Grade de pixels com ajudantes de forma: cada pixel guarda uma cor; no fim vira canvas. */
class Pixels {
  readonly cells: (string | null)[] = new Array(TILE_SIZE * TILE_SIZE).fill(null);
  set(x: number, y: number, c: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < TILE_SIZE && y < TILE_SIZE) this.cells[y * TILE_SIZE + x] = c;
  }
  /** Triângulo cheio (asas). */
  tri(a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], color: (x: number, y: number) => string) {
    const minX = Math.floor(Math.min(a[0], b[0], c[0]));
    const maxX = Math.ceil(Math.max(a[0], b[0], c[0]));
    const minY = Math.floor(Math.min(a[1], b[1], c[1]));
    const maxY = Math.ceil(Math.max(a[1], b[1], c[1]));
    const side = (p: readonly [number, number], q: readonly [number, number], x: number, y: number) =>
      (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const s1 = side(a, b, x, y);
        const s2 = side(b, c, x, y);
        const s3 = side(c, a, x, y);
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) this.set(x, y, color(x, y));
      }
  }
  /** Elipse com luz em cima à esquerda (`pal`: luz, meio, sombra). */
  oval(cx: number, cy: number, rx: number, ry: number, pal: readonly [string, string, string], glow?: string) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1) continue;
        const u = (x - cx) / rx + (y - cy) / ry;
        this.set(x, y, glow && u < -1 ? glow : u < -0.45 ? pal[0] : u < 0.55 ? pal[1] : pal[2]);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  canvas() {
    const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE);
    this.cells.forEach((c, i) => { if (c) px(ctx, i % TILE_SIZE, Math.floor(i / TILE_SIZE), c); });
    return canvas;
  }
}

// --- Escorpião da Areia ------------------------------------------------------------------

type Shell = { chitin: readonly [string, string, string]; glow: string; joint: string };
const AMBER: Shell = { chitin: ["#c27a35", "#94511f", "#5a2e10"], glow: "#e6a45c", joint: "#6e3a14" };
/** Escorpião Negro Gigante (mini-boss): couraça negra com reflexo roxo. */
export const BLACK_SHELL: Shell = { chitin: ["#5e4c74", "#2e2438", "#141018"], glow: "#9a86ba", joint: "#0c0810" };

/**
 * Escorpião: corpo em placas, pinças para a frente e a cauda em arco por cima, com o ferrão escuro. Âmbar no comum;
 * o mini-boss usa a couraça negra (e o mapa o desenha maior).
 */
export function scorpionCanvas(shell: Shell = AMBER) {
  const CHITIN = shell.chitin;
  const CHITIN_GLOW = shell.glow;
  const g = new Pixels();
  // Patas (quatro de cada lado; as de trás mais escuras), saindo de baixo do corpo até o chão.
  for (let i = 0; i < 4; i++) {
    const x = 13 + i * 3.5;
    g.line(x, 23, x - 2 - (i % 2), 28, i % 2 ? "#5e3c16" : "#7f521f");
    g.line(x - 2 - (i % 2), 28, x - 3 - (i % 2), 29, "#5e3c16");
  }
  // Cauda: segmentos do fim do corpo subindo em arco até o ferrão, por cima das costas.
  const tail = [[26, 21, 2.6], [28, 17, 2.4], [28, 13, 2.3], [26, 9.5, 2.2], [22.5, 7.5, 2.1]] as const;
  for (const [x, y, r] of tail) g.oval(x, y, r, r, CHITIN, CHITIN_GLOW);
  for (const [x, y] of tail.slice(1)) g.set(x + 1, y + 1, "#5e3c16"); // juntas
  // Ferrão: bolsa de veneno e ponta curva para baixo.
  g.oval(19, 7.5, 2, 1.7, ["#8a2f1c", "#6a2012", "#40100a"]);
  g.line(17, 8, 16, 10, "#2a0e08");
  g.set(16, 11, "#f4ead2");
  // Corpo (abdômen em placas) e cefalotórax na frente.
  g.oval(19, 21, 7.5, 3.8, CHITIN, CHITIN_GLOW);
  for (const x of [15, 18, 21, 24]) g.line(x, 18.5, x, 23.5, shell.joint);
  g.oval(11.5, 21.5, 4, 3.4, CHITIN, CHITIN_GLOW);
  // Pinças: braço e garra aberta, uma alta e outra baixa.
  for (const [ax, ay, cy] of [[9, 20, 17], [9, 23, 25]] as const) {
    g.line(ax, ay, 5, cy, shell.joint);
    g.oval(4, cy, 2.6, 1.9, CHITIN, CHITIN_GLOW);
    g.set(1, cy, "#3a240c");
    g.set(2, cy, "#3a240c");
  }
  // Olhos.
  g.set(10, 19.5, "#1b1008");
  g.set(12, 19, "#1b1008");
  return g.canvas();
}

// --- Abutre Gigante -------------------------------------------------------------------------

const FEATHER = ["#7a5a42", "#4e3626", "#2c1d13"] as const;

/**
 * Abutre em voo, de lado: asas abertas em V para cima (a silhueta se lê de longe), penas da ponta separadas,
 * cabeça pelada e rosada no pescoço comprido, gola branca, bico em gancho e as garras penduradas.
 */
export function vultureCanvas() {
  const g = new Pixels();
  // Asa: triângulo da raiz (no dorso) até a ponta, com a borda de cima clara, faixas de penas e as penas da ponta
  // separadas como dedos. A de trás é mais escura.
  const wing = (root: readonly [number, number], tip: readonly [number, number], back: readonly [number, number], dark: boolean) => {
    g.tri(root, tip, back, (x, y) => {
      if (dark) return (x + y) % 5 === 0 ? FEATHER[1] : FEATHER[2];
      const edge = ((tip[0] - root[0]) * (y - root[1]) - (tip[1] - root[1]) * (x - root[0])) / Math.hypot(tip[0] - root[0], tip[1] - root[1]);
      return Math.abs(edge) < 1.2 ? FEATHER[0] : (x + 2 * y) % 6 === 0 ? FEATHER[2] : FEATHER[1];
    });
    for (let f = 0; f < 4; f++) {
      const t = 0.15 + f * 0.12;
      const fx = tip[0] + (back[0] - tip[0]) * t;
      const fy = tip[1] + (back[1] - tip[1]) * t;
      g.line(fx, fy, fx + (tip[0] - root[0]) * 0.18, fy + (tip[1] - root[1]) * 0.18, dark ? FEATHER[2] : FEATHER[1]);
    }
  };
  wing([19, 15], [29, 1], [25, 15], true);
  // Cauda em leque.
  for (let k = 0; k < 4; k++) g.line(22, 19 + k * 0.5, 29, 18 + k * 1.5, k % 2 ? FEATHER[1] : FEATHER[2]);
  // Corpo.
  g.oval(17, 18, 6.5, 4.2, FEATHER, "#9a7a5e");
  wing([14, 15], [5, 1], [21, 15], false);
  // Gola branca e pescoço pelado.
  g.oval(11, 15.5, 2.6, 2.2, ["#fbf3e2", "#e6dccb", "#b8ab95"]);
  g.line(10, 14, 8, 12, "#d48a7a");
  g.line(9, 14, 7, 12, "#b56a5c");
  // Cabeça rosada e bico em gancho.
  g.oval(6.5, 10.5, 2.4, 2.1, ["#f0b3a2", "#d48a7a", "#a85e50"]);
  g.set(6, 9.5, "#1b1008");
  g.line(4, 10.5, 2, 11, "#d8cfb4");
  g.set(2, 12, "#8f866e");
  // Garras penduradas.
  g.line(17, 22, 16, 26, "#a39a86");
  g.line(19, 22, 19, 26, "#8a8270");
  g.set(15, 27, "#3a3328");
  g.set(19, 27, "#3a3328");
  return g.canvas();
}

// --- Múmia ---------------------------------------------------------------------------------------

const WRAP = { light: "#ece2c4", mid: "#cfc19a", dark: "#9c8d68", gap: "#3a2e22", stain: "#a3895c" };

/**
 * Múmia de pé, de três quartos para a esquerda, braços esticados para a frente: faixas de linho em diagonal com
 * frestas escuras entre elas, manchas de resina, pontas soltas penduradas e os olhos verdes acesos.
 */
export function mummyCanvas(priest = false) {
  const g = new Pixels();
  /** Faixa: tom pela luz (esquerda clara) e pelas listras diagonais do enrolado. */
  const wrap = (x: number, y: number, shade = 0) => {
    // Faixas quase na horizontal, um pouco inclinadas: uma linha de sombra a cada 3 px, fresta escura de vez em quando.
    const band = Math.floor(y + x * 0.35) % 3;
    let c = band === 0 ? (hash(x, y, 611) < 0.25 ? WRAP.gap : WRAP.dark) : shade < 0 ? WRAP.light : shade > 0 ? WRAP.dark : WRAP.mid;
    if (band > 0 && hash(x, y, 610) < 0.07) c = WRAP.stain;
    g.set(x, y, c);
  };
  // Pernas.
  for (let y = 22; y <= 30; y++) {
    for (let x = 12; x <= 14; x++) wrap(x, y, x === 12 ? -1 : 0);
    for (let x = 17; x <= 19; x++) wrap(x, y, x === 19 ? 1 : 0);
  }
  // Tronco.
  for (let y = 12; y <= 22; y++) for (let x = 11; x <= 20; x++) wrap(x, y, x < 13 ? -1 : x > 18 ? 1 : 0);
  // Braços esticados para a frente (para a esquerda), o de trás mais escuro e um pouco mais alto.
  for (let x = 3; x <= 12; x++) {
    for (let y = 13; y <= 14; y++) g.set(x, y, x % 3 === 0 ? WRAP.gap : WRAP.dark);
    for (let y = 15; y <= 17; y++) wrap(x, y, y === 15 ? -1 : 0);
  }
  // Mãos: dedos secos saindo das faixas.
  for (const [x, y] of [[2, 15], [2, 16], [1, 17], [2, 13]]) g.set(x, y, "#6e5a3e");
  // Cabeça.
  for (let y = 3; y <= 11; y++)
    for (let x = 12; x <= 19; x++) {
      if (((x - 15.5) / 4) ** 2 + ((y - 7) / 4.6) ** 2 > 1) continue;
      wrap(x, y, x < 14 ? -1 : x > 18 ? 1 : 0);
    }
  // Olhos verdes acesos numa fresta escura.
  g.line(12, 7, 17, 7, WRAP.gap);
  g.set(13, 7, "#b9ff9a");
  g.set(16, 7, "#7fd36b");
  // Pontas de faixa soltas, penduradas no braço e na cintura.
  g.line(6, 18, 5, 21, WRAP.mid);
  g.line(10, 18, 9, 23, WRAP.dark);
  g.line(20, 21, 22, 26, WRAP.mid);
  if (priest) {
    // Sacerdote: toucado listrado de azul e ouro caindo nos ombros, gola larga de ouro e o cajado com o ankh.
    for (let y = 2; y <= 13; y++)
      for (let x = 10; x <= 21; x++) {
        const inHead = ((x - 15.5) / 4) ** 2 + ((y - 7) / 4.6) ** 2 <= 1;
        const cloth = y <= 4 ? Math.abs(x - 15.5) <= 4.5 : (x <= 12 || x >= 19) && y <= 13 - Math.abs(x - 15.5) * 0.2;
        if (!cloth || (inHead && y > 4 && x > 12 && x < 19)) continue;
        g.set(x, y, Math.floor(y / 2) % 2 ? "#2f5fa8" : "#e0b23a");
      }
    for (let x = 11; x <= 20; x++) {
      g.set(x, 12, x % 2 ? "#e0b23a" : "#3a8f8a");
      g.set(x, 13, "#b8892a");
    }
    g.line(2, 9, 2, 29, "#c99a2e");
    g.line(3, 10, 3, 29, "#8a6418");
    for (let a = 0; a < Math.PI * 2; a += 0.5) g.set(2.5 + Math.cos(a) * 1.6, 6 + Math.sin(a) * 2, "#f0c84a");
    g.line(0, 9, 5, 9, "#f0c84a");
  }
  return g.canvas();
}

// --- Elemental de Areia -------------------------------------------------------------------

/**
 * Elemental de Areia: um redemoinho que pensa. Funil estreito embaixo (tocando o chão numa nuvem de poeira) e largo
 * em cima, feito de faixas de areia que giram (claras do lado do sol), com pedrinhas presas no vento e dois olhos
 * acesos no meio da tempestade.
 */
export function sandElementalCanvas() {
  const g = new Pixels();
  const bands = ["#f6e2b4", "#c9995a", "#94643a", "#5a381c"];
  for (let y = 2; y <= 27; y++) {
    const t = (27 - y) / 25; // 0 embaixo, 1 em cima
    const half = 2 + t * 11;
    const cx = 16 + Math.sin(y * 0.45) * 2.2 * (1 - t * 0.4);
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = (x - cx) / half; // -1 esquerda .. 1 direita
      // Faixas inclinadas que dão a ideia de giro; o lado esquerdo pega a luz.
      const swirl = Math.floor((x * 0.6 + y * 1.4) / 3) % 4;
      let k = swirl === 0 ? 3 : swirl === 1 ? 2 : u < -0.3 ? 0 : 1;
      if (Math.abs(u) > 0.85 && hash(x, y, 630) < 0.5) continue; // borda desfiada
      if (u > 0.5 && k < 2) k = 2;
      g.set(x, y, bands[k]);
    }
  }
  // Olhos no meio da tempestade.
  g.set(13, 9, "#fff1c4"); g.set(14, 9, "#ffb84d");
  g.set(18, 9, "#ffb84d"); g.set(19, 9, "#fff1c4");
  g.line(13, 10, 19, 10, "#5a3a20");
  // Pedrinhas presas no vento.
  for (const [x, y] of [[7, 6], [26, 8], [9, 15], [24, 17], [20, 4]]) g.set(x, y, "#6e4a2a");
  // Nuvem de poeira no chão.
  g.oval(16, 28.5, 8, 2.2, ["#ecd09a", "#d4aa70", "#b9874f"]);
  return g.canvas();
}
