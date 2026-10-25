import { TILE_SIZE } from "@kusa/shared";
import { mummyCanvas } from "./desertMonsters.ts";
import { hash, makeCanvas, px } from "./pixels.ts";

/**
 * Necrópole de Solária (Dunas Cantantes e Mesas de Solária) em arte própria, 32×32 (o `refineArt` dobra, como as do
 * pack): a legião de ossos do Império de Kusa, as múmias da corte e os dois bosses. Todos olham para a esquerda, com a
 * luz de cima à esquerda. Com a Arte nova (beta), os humanoides vêm do protótipo (`MONSTER_KITS` em `tibiaHero.ts`).
 */

type Pt = readonly [number, number];

/** Grade de 32×32 com ajudantes de forma; no fim vira canvas. */
class Grid {
  readonly cells: (string | null)[] = new Array(TILE_SIZE * TILE_SIZE).fill(null);
  set(x: number, y: number, c: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < TILE_SIZE && y < TILE_SIZE) this.cells[y * TILE_SIZE + x] = c;
  }
  get(x: number, y: number) {
    return x >= 0 && y >= 0 && x < TILE_SIZE && y < TILE_SIZE ? this.cells[y * TILE_SIZE + x] : null;
  }
  /** Elipse com luz em cima à esquerda (`pal`: luz, meio, sombra). */
  oval(cx: number, cy: number, rx: number, ry: number, pal: readonly [string, string, string]) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
        const u = (x - cx) / rx + (y - cy) / ry;
        this.set(x, y, u < -0.45 ? pal[0] : u < 0.55 ? pal[1] : pal[2]);
      }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  rect(x0: number, y0: number, x1: number, y1: number, color: (x: number, y: number) => string | null) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = color(x, y); if (c) this.set(x, y, c); }
  }
  /** Polígono cheio. */
  poly(pts: readonly Pt[], color: (x: number, y: number) => string) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
        let on = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) on = !on;
        }
        if (on) this.set(x, y, color(x, y));
      }
  }
  canvas(base?: HTMLCanvasElement) {
    const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE);
    if (base) ctx.drawImage(base, 0, 0);
    this.cells.forEach((c, i) => { if (c) px(ctx, i % TILE_SIZE, Math.floor(i / TILE_SIZE), c); });
    return canvas;
  }
}

const BONE = { light: "#f2ead2", mid: "#d6caa6", dark: "#9c8e6a", gap: "#3a2e22" } as const;
const BRONZE = { light: "#f0c470", mid: "#c8903a", dark: "#7e5420" } as const;
const EMBER = "#ffb347";
const GHOST = "#a0f0ff";

/** Crânio de perfil (olhando para a esquerda) com a órbita e a brasa. */
function skull(g: Grid, cx: number, cy: number, eye = EMBER) {
  g.oval(cx, cy, 3.4, 3.2, [BONE.light, BONE.mid, BONE.dark]);
  g.rect(cx - 3, cy + 2, cx + 1, cy + 3, (x) => (x % 2 ? BONE.mid : BONE.gap));
  g.set(cx - 1.5, cy - 0.5, BONE.gap); g.set(cx - 0.5, cy - 0.5, BONE.gap);
  g.set(cx - 1.5, cy - 0.5, eye);
  g.set(cx - 3, cy + 1, BONE.gap);
}

/** Corpo de esqueleto de pé: costelas, espinha, bacia, braços e pernas finos. `lean` empurra os braços para a frente. */
function skeletonBody(g: Grid, cx: number, top: number) {
  // Espinha e costelas.
  g.line(cx + 1, top, cx + 1, top + 10, BONE.dark);
  for (let k = 0; k < 4; k++) { g.line(cx + 1, top + 1 + k * 2, cx - 3, top + 2 + k * 2, k % 2 ? BONE.mid : BONE.light); g.set(cx + 2, top + 1 + k * 2, BONE.dark); }
  // Bacia.
  g.oval(cx, top + 11, 3, 1.4, [BONE.light, BONE.mid, BONE.dark]);
  // Pernas.
  g.line(cx - 1, top + 12, cx - 2, top + 17, BONE.mid); g.line(cx - 2, top + 17, cx - 3, top + 21, BONE.light);
  g.line(cx + 2, top + 12, cx + 3, top + 17, BONE.dark); g.line(cx + 3, top + 17, cx + 3, top + 21, BONE.dark);
  g.line(cx - 5, top + 21, cx - 2, top + 21, BONE.mid); g.line(cx + 1, top + 21, cx + 4, top + 21, BONE.dark);
}

// --- Comuns ----------------------------------------------------------------------------------

/** Chacal de Ossos: esqueleto de cão de focinho comprido, correndo, com a brasa no olho e a cauda de vértebras. */
export function boneJackalCanvas() {
  const g = new Grid();
  // Espinha arqueada e costelas.
  for (let x = 10; x <= 23; x++) g.set(x, 15 - Math.sin(((x - 10) / 13) * Math.PI) * 2, BONE.mid);
  for (let k = 0; k < 4; k++) g.line(12 + k * 2, 15 - (k > 0 && k < 3 ? 2 : 1), 11 + k * 2, 19, k % 2 ? BONE.dark : BONE.light);
  // Bacia, cauda.
  g.oval(23, 15, 2, 1.6, [BONE.light, BONE.mid, BONE.dark]);
  for (let k = 0; k < 6; k++) g.set(25 + k, 14 - k * 0.6 + (k > 3 ? 1 : 0), k % 2 ? BONE.dark : BONE.mid);
  // Pernas (as da frente esticadas, correndo).
  g.line(11, 17, 7, 22, BONE.light); g.line(7, 22, 6, 25, BONE.mid);
  g.line(13, 17, 13, 22, BONE.dark); g.line(13, 22, 12, 25, BONE.dark);
  g.line(22, 16, 25, 21, BONE.mid); g.line(25, 21, 27, 25, BONE.light);
  g.line(24, 16, 23, 21, BONE.dark); g.line(23, 21, 22, 25, BONE.dark);
  // Crânio comprido: focinho para a esquerda, mandíbula aberta e orelhas de chacal.
  g.oval(9, 12, 3, 2.6, [BONE.light, BONE.mid, BONE.dark]);
  g.poly([[7, 10.5], [1, 12], [1, 13.5], [7, 14]], (x, y) => (y < 12 ? BONE.light : BONE.mid));
  g.line(2, 15, 7, 15.5, BONE.dark);
  for (const x of [2, 4, 6]) g.set(x, 14, BONE.gap);
  g.poly([[9, 10], [10, 5], [12, 10]], (x) => (x < 10.5 ? BONE.light : BONE.dark));
  g.poly([[11, 10], [13, 6], [13.5, 10.5]], () => BONE.dark);
  g.set(7, 11, BONE.gap); g.set(7, 11, EMBER); g.set(8, 11, BONE.gap);
  return g.canvas();
}

/** Escaravelhos Carniceiros: três besouros de casco negro esverdeado com o brilho dourado, andando juntos. */
export function scarabSwarmCanvas() {
  const g = new Grid();
  const shell = ["#5e8a5a", "#2e4a34", "#141e18"] as const;
  const beetle = (cx: number, cy: number, s: number) => {
    // Patas.
    for (const k of [-1, 0, 1]) { g.line(cx - 2 * s, cy + k * s, cx - 4 * s, cy + k * s + s, "#1a120c"); g.line(cx + 2 * s, cy + k * s, cx + 4 * s, cy + k * s + s, "#1a120c"); }
    g.oval(cx, cy, 2.6 * s, 3.2 * s, shell);
    g.line(cx, cy - 2.4 * s, cx, cy + 3 * s, "#0c120e");
    g.oval(cx - 0.4 * s, cy - 3.6 * s, 1.6 * s, 1.2 * s, ["#3a3020", "#241c12", "#120c08"]);
    g.set(cx - 1.2 * s, cy - 1.2 * s, "#e0c060");
    g.line(cx - 1.2 * s, cy - 4.6 * s, cx - 2.4 * s, cy - 5.6 * s, "#241c12");
  };
  beetle(9, 20, 1.1);
  beetle(20, 24, 0.95);
  beetle(19, 12, 1);
  return g.canvas();
}

/** Legionário Ossudo: elmo de bronze com crista vermelha, escudo redondo de bronze à frente e o gládio. */
export function boneLegionaryCanvas() {
  const g = new Grid();
  skeletonBody(g, 16, 10);
  // Braço da espada (atrás) com o gládio erguido.
  g.line(18, 11, 21, 15, BONE.dark);
  g.line(21, 15, 22, 7, "#b8bcc4"); g.line(22, 15, 23, 8, "#7a7e88"); g.line(20, 15, 23, 15, BRONZE.dark);
  skull(g, 15, 6);
  // Elmo de bronze com a crista.
  g.rect(12, 2, 19, 5, (x, y) => (y === 5 && x < 14 ? null : x < 14 ? BRONZE.light : x > 17 ? BRONZE.dark : BRONZE.mid));
  g.line(19, 5, 19, 9, BRONZE.dark);
  g.rect(13, 0, 19, 1, (x) => (x % 2 ? "#c0392b" : "#8e2018"));
  g.line(20, 1, 22, 4, "#8e2018");
  // Escudo redondo à frente, com o umbo e a borda.
  g.oval(10, 16, 5, 6, [BRONZE.light, BRONZE.mid, BRONZE.dark]);
  for (let a = 0; a < Math.PI * 2; a += 0.25) g.set(10 + Math.cos(a) * 5, 16 + Math.sin(a) * 6, BRONZE.dark);
  g.oval(10, 16, 1.4, 1.6, ["#fff0c0", BRONZE.light, BRONZE.mid]);
  g.line(7, 13, 8, 12, "#fff0c0");
  return g.canvas();
}

/** Sagitário das Dunas: esqueleto com o lenço do deserto na cabeça, arco puxado e a aljava nas costas. */
export function boneArcherCanvas() {
  const g = new Grid();
  skeletonBody(g, 17, 10);
  // Aljava nas costas com as penas.
  g.rect(20, 7, 21, 15, (x) => (x === 20 ? "#8a5a30" : "#5a3a1c"));
  for (const x of [19, 21, 22]) g.line(x, 4, x, 7, x === 21 ? "#e0d8c8" : "#c0392b");
  skull(g, 16, 6);
  // Lenço de linho cru na cabeça, pontas caindo atrás.
  g.rect(13, 2, 20, 4, (x) => (x < 15 ? "#e8d8b0" : x > 18 ? "#a08a5c" : "#cdb88a"));
  g.line(20, 4, 23, 10, "#a08a5c"); g.line(21, 4, 24, 9, "#cdb88a");
  // Arco à frente (curvo) com a corda e a flecha.
  for (let y = 6; y <= 22; y++) g.set(8 - Math.sin(((y - 6) / 16) * Math.PI) * 3, y, y < 14 ? "#a87a44" : "#7a5228");
  g.line(8, 6, 8, 22, "#e8e0d0");
  g.line(3, 14, 15, 14, "#d6caa6"); g.set(2, 14, "#c0c4cc"); g.set(3, 13, "#c0c4cc"); g.set(3, 15, "#c0c4cc");
  g.line(15, 12, 9, 14, BONE.mid); g.line(18, 12, 15, 14, BONE.dark);
  return g.canvas();
}

/** Múmia Enfaixada: a múmia do deserto com as faixas soltas, compridas, se esticando para a frente (para puxar). */
export function wrappedMummyCanvas() {
  const g = new Grid();
  const lash = (y0: number, y1: number, c: string) => {
    for (let x = 0; x <= 8; x++) g.set(x, y0 + ((y1 - y0) * x) / 8 + Math.sin(x * 0.9) * 0.8, c);
  };
  lash(18, 15, "#ece2c4");
  lash(20, 19, "#cfc19a");
  g.set(0, 15, "#9c8d68"); g.set(0, 19, "#9c8d68");
  return g.canvas(mummyCanvas());
}

/** Carpideira: múmia de véu escuro até os pés, as mãos no rosto e as lágrimas que brilham. */
export function mournerCanvas() {
  const g = new Grid();
  const veil = ["#5a6078", "#363a4e", "#1c1e2a"] as const;
  // Véu em sino até o chão, com dobras.
  g.poly([[14, 4], [19, 4], [24, 29], [8, 29]], (x, y) => {
    const fold = (x + Math.floor(y / 3)) % 4 === 0;
    return fold ? veil[2] : x < 13 ? veil[0] : x > 19 ? veil[2] : veil[1];
  });
  // Rosto enfaixado na abertura do véu.
  g.oval(14.5, 8, 2.6, 3, ["#ece2c4", "#cfc19a", "#9c8d68"]);
  g.line(12, 7, 16, 7, "#3a2e22");
  g.set(13, 7, GHOST); g.set(15, 7, "#5ad2e6");
  // Lágrimas de luz escorrendo.
  g.line(13, 8, 12, 12, "#5ad2e6"); g.set(15, 9, "#5ad2e6"); g.set(15, 10, "#3a8aa0");
  // Mãos secas erguidas junto ao rosto.
  g.oval(11, 11, 1.6, 1.4, ["#cfc19a", "#9c8d68", "#6e5a3e"]);
  g.oval(17, 12, 1.4, 1.3, ["#9c8d68", "#6e5a3e", "#4a3a26"]);
  // Barra do véu gasta.
  for (let x = 8; x <= 24; x++) if (hash(x, 29, 701) < 0.4) g.set(x, 30, veil[2]);
  return g.canvas();
}

/** Soterrado: esqueleto saindo do monte de areia, um braço esticado para agarrar e o crânio meio coberto. */
export function buriedDeadCanvas() {
  const g = new Grid();
  // Braço esticado para cima e para a frente, com os dedos abertos.
  g.line(14, 18, 8, 10, BONE.light); g.line(8, 10, 6, 6, BONE.mid);
  for (const [dx, dy] of [[-2, -2], [-1, -3], [0, -3], [1, -2]]) g.line(6, 6, 6 + dx, 6 + dy, BONE.light);
  g.line(20, 19, 23, 14, BONE.dark); g.line(23, 14, 25, 12, BONE.dark);
  // Costelas aparecendo.
  for (let k = 0; k < 3; k++) g.line(19, 16 + k * 2, 14, 17 + k * 2, k % 2 ? BONE.mid : BONE.light);
  g.line(19, 15, 19, 22, BONE.dark);
  skull(g, 16, 12);
  // Monte de areia por cima da cintura, com areia escorrendo.
  g.oval(16, 25, 12, 5, ["#ecd09a", "#d4aa70", "#a8784a"]);
  for (const [x, y] of [[13, 13], [17, 9], [21, 16], [9, 19]]) g.set(x, y, "#d4aa70");
  return g.canvas();
}

// --- Mini-bosses -----------------------------------------------------------------------------

/** Centurião Ossudo: crista transversal vermelha, capa vermelha, couraça de bronze, gládio erguido e escudo retangular. */
export function boneCenturionCanvas() {
  const g = new Grid();
  // Capa vermelha atrás.
  g.poly([[17, 9], [22, 9], [26, 28], [18, 28]], (x, y) => ((x + y) % 5 === 0 ? "#6e1610" : x > 22 ? "#7e1a14" : "#a02820"));
  skeletonBody(g, 16, 10);
  // Couraça de bronze no peito.
  g.rect(12, 10, 19, 17, (x, y) => (y === 13 || y === 16 ? BRONZE.dark : x < 14 ? BRONZE.light : x > 17 ? BRONZE.dark : BRONZE.mid));
  // Gládio erguido.
  g.line(20, 12, 23, 9, BONE.dark);
  g.line(23, 9, 26, 1, "#d0d4dc"); g.line(24, 9, 27, 2, "#8a8e98"); g.line(22, 9, 25, 10, BRONZE.dark);
  skull(g, 15, 6);
  // Elmo com a crista transversal.
  g.rect(12, 2, 19, 5, (x, y) => (y === 5 && x < 14 ? null : x < 14 ? BRONZE.light : x > 17 ? BRONZE.dark : BRONZE.mid));
  g.rect(9, 0, 22, 1, (x) => (x % 2 ? "#e04a3a" : "#a02820"));
  // Escudo retangular curvo (scutum) com a águia.
  g.rect(5, 11, 11, 25, (x, y) => (x === 5 || y === 11 || y === 25 ? BRONZE.mid : x === 11 ? "#5a120c" : x < 8 ? "#c0392b" : "#962a20"));
  g.line(6, 18, 10, 18, BRONZE.light); g.line(8, 13, 8, 23, BRONZE.mid);
  g.oval(8, 18, 1.2, 1.2, ["#fff0c0", BRONZE.light, BRONZE.mid]);
  return g.canvas();
}

/** Múmia Real: a máscara de ouro, o toucado listrado de ouro e lápis, a gola larga e as faixas douradas. */
export function royalMummyCanvas() {
  const g = new Grid();
  // Máscara de ouro por cima do rosto, toucado caindo nos ombros.
  for (let y = 1; y <= 14; y++)
    for (let x = 10; x <= 21; x++) {
      const inFace = ((x - 15.5) / 3.4) ** 2 + ((y - 7) / 4) ** 2 <= 1;
      const cloth = y <= 4 ? Math.abs(x - 15.5) <= 5 : (x <= 12 || x >= 19) && y <= 14 - Math.abs(x - 15.5) * 0.2;
      if (inFace) g.set(x, y, x < 14 ? "#ffe08a" : x > 17 ? "#b8892a" : "#e8b830");
      else if (cloth) g.set(x, y, Math.floor(y / 2) % 2 ? "#26468a" : "#e0b23a");
    }
  g.line(13, 6, 14, 6, "#1a2a5a"); g.line(17, 6, 18, 6, "#1a2a5a");
  g.set(13, 7, "#7fd36b"); g.set(17, 7, "#7fd36b");
  g.line(15, 9, 16, 9, "#b8892a");
  g.line(15, 11, 15, 13, "#8a6418");
  return g.canvas(mummyCanvas());
}

/** Escriba das Areias: esqueleto de túnica azul com o rolo de papiro aberto e os glifos acesos flutuando. */
export function sandScribeCanvas() {
  const g = new Grid();
  // Túnica azul até os pés, com o cinto dourado.
  g.poly([[12, 10], [20, 10], [23, 29], [10, 29]], (x, y) => ((x + y) % 6 === 0 ? "#1a2e5a" : x < 14 ? "#4a6ab0" : x > 20 ? "#1a2e5a" : "#2e4a8a"));
  g.line(11, 17, 21, 17, "#e0b23a");
  skull(g, 15, 6, GHOST);
  // Toucado de linho.
  g.rect(12, 2, 19, 4, (x) => (x < 14 ? "#e8d8b0" : x > 17 ? "#a08a5c" : "#cdb88a"));
  // Braços de osso segurando o rolo aberto à frente.
  g.line(13, 12, 9, 15, BONE.light); g.line(18, 12, 9, 18, BONE.dark);
  g.rect(3, 14, 9, 19, (x, y) => (x === 3 || x === 9 ? "#a8844a" : (x + y) % 3 === 0 ? "#8a6a3a" : "#ecd8a6"));
  // Glifos acesos no ar.
  for (const [x, y] of [[4, 9], [7, 7], [2, 5], [24, 8], [26, 13]]) { g.set(x, y, GHOST); g.set(x + 1, y, "#5ad2e6"); g.set(x, y + 1, "#5ad2e6"); }
  return g.canvas();
}

// --- Bosses (desenhados em 32×32 e mostrados em 2 tiles) ------------------------------------

/**
 * Colosso Cantante: gigante de areia em volta dos ossos da legião, ombros largos e braços que tocam o chão, furado
 * pelo vento (os furos brilham com o canto), a boca aberta cantando e a areia escorrendo.
 */
export function singingColossusCanvas() {
  const g = new Grid();
  const sand = ["#f2d29a", "#d4a868", "#9a6a3a"] as const;
  // Corpo: torso largo e cabeça encaixada nos ombros.
  g.poly([[8, 9], [24, 8], [27, 20], [22, 27], [10, 27], [5, 20]], (x, y) => {
    const u = (x - 16) / 11 + (y - 17) / 12;
    const grain = hash(x, y, 711) < 0.12;
    return grain ? sand[2] : u < -0.5 ? sand[0] : u < 0.5 ? sand[1] : sand[2];
  });
  // Braços pesados, o da frente tocando o chão.
  g.oval(5, 18, 3.2, 7, sand);
  g.oval(4, 26, 3.4, 2.6, sand);
  g.oval(27, 17, 2.8, 6, [sand[1], sand[2], "#6e4a26"]);
  // Pernas curtas.
  g.rect(10, 27, 14, 31, (x) => (x < 12 ? sand[1] : sand[2]));
  g.rect(18, 27, 22, 31, () => sand[2]);
  // Costelas e ossos da legião presos na areia.
  for (let k = 0; k < 3; k++) g.line(19, 13 + k * 3, 13, 14 + k * 3, k % 2 ? BONE.mid : BONE.light);
  g.line(20, 12, 20, 22, BONE.dark);
  g.set(8, 22, BONE.light); g.set(25, 11, BONE.mid); g.set(14, 24, BONE.light);
  // Cabeça: crânio de areia, boca redonda aberta cantando e os olhos acesos.
  g.oval(14, 6, 5, 4.6, sand);
  g.oval(11, 9, 1.8, 2, ["#2a1a10", "#1a0e08", "#0e0804"]);
  g.set(11, 9, "#5ad2e6");
  g.set(12, 4, "#1a0e08"); g.set(12, 4, GHOST); g.set(15, 4, "#1a0e08"); g.set(16, 4, "#5ad2e6");
  // Furos do vento no corpo, brilhando com o canto.
  for (const [x, y] of [[12, 17], [17, 20], [23, 15], [9, 13]]) { g.set(x, y, "#2a1a10"); g.set(x, y - 1, GHOST); }
  // Areia escorrendo dos braços.
  for (const [x, y] of [[2, 28], [7, 29], [29, 23], [26, 25]]) g.set(x, y, sand[1]);
  return g.canvas();
}

/**
 * Faraó Eterno: o faraó morto-vivo que flutua, de toucado listrado de ouro e lápis, máscara funerária, gancho e
 * mangual cruzados no peito, a túnica que termina em farrapos sobre o chão e os olhos acesos de luz verde.
 */
export function eternalPharaohCanvas() {
  const g = new Grid();
  // Túnica que flutua e termina em farrapos.
  g.poly([[11, 12], [21, 12], [25, 27], [7, 27]], (x, y) => ((x + y) % 5 === 0 ? "#b8a070" : x < 13 ? "#f2e6c4" : x > 21 ? "#a8946a" : "#ddd0a8"));
  for (let x = 7; x <= 25; x++) if (hash(x, 28, 721) < 0.6) g.line(x, 27, x, 27 + Math.floor(hash(x, 29, 722) * 3), "#a8946a");
  // Gola larga de ouro e lápis.
  for (let x = 10; x <= 22; x++) { g.set(x, 12, x % 2 ? "#e0b23a" : "#3a8f8a"); g.set(x, 13, "#26468a"); g.set(x, 14, "#b8892a"); }
  // Toucado (nemes) com as abas caindo nos ombros e a serpente na testa.
  for (let y = 1; y <= 13; y++)
    for (let x = 9; x <= 22; x++) {
      const inFace = ((x - 15.5) / 3.2) ** 2 + ((y - 7) / 3.8) ** 2 <= 1;
      const cloth = y <= 4 ? Math.abs(x - 15.5) <= 5.6 : (x <= 12 || x >= 19) && y <= 13 - Math.abs(x - 15.5) * 0.15;
      if (inFace) g.set(x, y, x < 14 ? "#8a7a5a" : x > 17 ? "#4a3e2a" : "#6e5e42");
      else if (cloth) g.set(x, y, Math.floor(y / 2) % 2 ? "#26468a" : "#e8b830");
    }
  g.set(15, 1, "#2e8a3a"); g.set(15, 0, "#7fd36b");
  // Rosto seco, olhos de luz verde e a barba postiça de ouro.
  g.set(13, 6, "#0e0a06"); g.set(13, 6, "#b9ff9a"); g.set(17, 6, "#7fd36b");
  g.line(14, 9, 17, 9, "#2a2014");
  g.rect(15, 10, 16, 12, (x) => (x === 15 ? "#e8b830" : "#8a6418"));
  // Gancho e mangual cruzados no peito.
  g.line(11, 22, 20, 15, "#e0b23a"); g.line(12, 22, 21, 15, "#26468a");
  g.set(20, 14, "#e0b23a"); g.set(21, 13, "#e0b23a"); g.set(22, 14, "#e0b23a");
  g.line(21, 22, 12, 15, "#e0b23a");
  for (const dy of [0, 2, 4]) g.line(12, 15 + dy, 9, 17 + dy, dy % 4 ? "#26468a" : "#e0b23a");
  // Mãos secas segurando.
  g.oval(16, 18, 1.6, 1.4, ["#8a7a5a", "#6e5e42", "#4a3e2a"]);
  // Brilho verde em volta (a magia que o mantém).
  for (const [x, y] of [[4, 8], [27, 6], [3, 18], [28, 19], [6, 26]]) g.set(x, y, "#7fd36b");
  return g.canvas();
}
