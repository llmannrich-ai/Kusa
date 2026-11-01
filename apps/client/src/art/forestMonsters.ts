import { hash } from "./pixels.ts";
import { Grid } from "./necropolisMonsters.ts";

/**
 * Bosque Velho em arte própria, 32×32 (o `refineArt` dobra, como as do pack): as feras e os espíritos da floresta
 * antiga do Kosaradius, os três mini-bosses das clareiras de troncos e o Dragão Verde Jovem. Todos olham para a
 * esquerda, com a luz de cima à esquerda. As cores seguem o elenco de `docs/arte/agente/BOSQUE_VELHO.md` (nenhum par
 * com a mesma cor dominante e o mesmo tamanho).
 */

type Pal = readonly [string, string, string];

const BARK: Pal = ["#8a6a48", "#5e4630", "#3a2a1c"];
const STRAW: Pal = ["#e2cc92", "#b8975c", "#7a5c34"];
const AMBER = "#ffb020";
const OUTLINE = "#1a1210";

/** Contorno escuro em volta de tudo o que foi desenhado (o padrão do bestiário: silhueta legível no capim). */
function outline(g: Grid) {
  const filled = g.cells.map((c) => c !== null);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      if (filled[y * 32 + x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < 32 && ny < 32 && filled[ny * 32 + nx];
      });
      if (near) g.set(x, y, OUTLINE);
    }
}

// --- Comuns ----------------------------------------------------------------------------------

/** Galhudo: feixe curvado de galhos secos cor de palha, amarrados por raízes, garras de lasca e dois olhos de brasa. */
export function twiglingCanvas() {
  const g = new Grid();
  // Pernas de raiz, finas.
  g.line(14, 22, 12, 29, STRAW[1]); g.line(12, 29, 10, 29, STRAW[2]);
  g.line(18, 22, 19, 29, STRAW[2]); g.line(19, 29, 21, 29, STRAW[2]);
  // Corpo: galhos cruzados em feixe, curvado para a frente.
  for (let k = 0; k < 7; k++) {
    const y0 = 12 + k * 1.5, x0 = 11 + hash(k, 1, 801) * 3;
    g.line(x0, y0, x0 + 9, y0 + 2 + hash(k, 2, 802) * 2, STRAW[k % 3]);
  }
  g.line(13, 11, 19, 23, STRAW[2]); g.line(18, 11, 13, 23, STRAW[1]);
  // Raízes amarrando o feixe.
  g.line(11, 16, 21, 15, BARK[1]); g.line(12, 20, 20, 21, BARK[2]);
  // Cabeça de nó de casca, olhos de brasa no fundo.
  g.oval(12, 9, 3.6, 3.2, BARK);
  g.set(10, 9, "#120a06"); g.set(10, 9, AMBER); g.set(13, 9, "#120a06"); g.set(13, 9, "#c07010");
  g.line(9, 11, 12, 11, BARK[2]);
  // Gravetos espetados na cabeça e uma folha morta.
  g.line(12, 6, 10, 2, STRAW[1]); g.line(14, 6, 17, 3, STRAW[2]); g.line(10, 6, 7, 4, STRAW[0]);
  g.set(17, 2, "#a0522d"); g.set(18, 2, "#7a3a1c");
  // Braço comprido com dedos de lasca.
  g.line(12, 14, 6, 19, STRAW[0]); g.line(6, 19, 3, 22, STRAW[1]);
  for (const [dx, dy] of [[-2, 0], [-1, 2], [0, 2]]) g.line(4, 21, 4 + dx, 21 + dy, STRAW[2]);
  g.line(20, 14, 23, 19, STRAW[2]);
  // Crânio de passarinho preso no corpo.
  g.set(17, 17, "#f0e6cc"); g.set(18, 17, "#d8cca8"); g.set(16, 18, "#c8b890");
  outline(g);
  return g.canvas();
}

/** Lobo Atroz: lobo cinza-ferro enorme, de cabeça baixa, focinho claro, orelha rasgada e uma flecha velha no ombro. */
export function direWolfCanvas() {
  const g = new Grid();
  const fur: Pal = ["#a8acb0", "#6e7378", "#3e4246"];
  // Cauda.
  g.line(26, 15, 30, 19, fur[1]); g.line(27, 16, 30, 21, fur[2]);
  // Pernas de trás e da frente.
  g.line(23, 19, 25, 28, fur[2]); g.line(20, 20, 20, 28, fur[1]);
  g.line(11, 20, 9, 28, fur[1]); g.line(14, 20, 14, 28, fur[2]);
  for (const x of [8, 13, 19, 24]) g.line(x, 28, x + 2, 28, "#2a2420");
  // Corpo comprido, o dorso mais escuro.
  g.oval(18, 17, 9, 4.6, fur);
  for (let x = 12; x <= 25; x++) g.set(x, 13 + (x > 20 ? 0 : 0), fur[2]);
  // Juba no pescoço.
  g.oval(11, 15, 4, 4.4, fur);
  // Cabeça baixa, focinho claro para a esquerda.
  g.oval(7, 15, 3.6, 3, fur);
  g.poly([[5, 14], [0, 16], [0, 18], [5, 19]], (x, y) => (y < 17 ? "#c8c4b8" : "#9a968a"));
  g.line(0, 18, 5, 19, "#1a1210"); g.set(1, 19, "#f0e8d0"); g.set(3, 19, "#f0e8d0");
  g.set(0, 16, "#1a1210");
  // Olho âmbar e orelhas (a de trás rasgada).
  g.set(5, 14, AMBER);
  g.poly([[7, 12], [8, 8], [10, 12]], (x) => (x < 8.5 ? fur[0] : fur[1]));
  g.poly([[10, 12], [11, 9], [12, 12]], () => fur[2]); g.set(11, 9, "#1a1210");
  // Flecha quebrada no ombro.
  g.line(13, 14, 15, 9, "#6a4a2a"); g.set(15, 8, "#e0d8c8"); g.set(16, 9, "#c0392b");
  outline(g);
  return g.canvas();
}

/** Sátiro Flautista: pernas de bode castanhas, cascos, chifres de carneiro, faixa de folhas e a flauta de juncos. */
export function satyrCanvas() {
  const g = new Grid();
  const fur: Pal = ["#9a6a3c", "#6e4826", "#40281a"];
  const skin: Pal = ["#e0b890", "#b88a62", "#7e5a3e"];
  // Pernas de bode (joelho para trás) e cascos.
  g.line(14, 19, 12, 23, fur[0]); g.line(12, 23, 14, 27, fur[1]); g.line(14, 27, 13, 29, "#1a1210");
  g.line(18, 19, 18, 23, fur[1]); g.line(18, 23, 20, 27, fur[2]); g.line(20, 27, 19, 29, "#1a1210");
  g.oval(16, 19, 4, 2.6, fur);
  // Tronco nu, com a faixa de folhas em diagonal e a bolsa.
  g.oval(16, 13, 3.6, 4.6, skin);
  g.line(13, 10, 19, 17, "#4a7a2a"); g.line(14, 10, 20, 16, "#6b9a3a");
  g.rect(19, 16, 21, 18, (x) => (x === 19 ? "#8a5a30" : "#5a3a1c"));
  // Cabeça, barba pontuda, orelha de bode e os chifres de carneiro enrolados.
  g.oval(14, 6, 3, 3, skin);
  g.poly([[12, 8], [14, 8], [13, 11]], () => fur[1]);
  g.set(12, 5, "#1a1210"); g.set(12, 5, "#e04a2a");
  g.line(11, 7, 13, 7, skin[2]);
  for (let a = 0; a < 5.5; a += 0.35) g.set(17 + Math.cos(a) * (1 + a * 0.4), 3 + Math.sin(a) * (1 + a * 0.4), a < 2.5 ? "#d8c8a0" : "#a89870");
  g.line(15, 3, 13, 2, "#d8c8a0");
  g.poly([[17, 6], [20, 5], [18, 8]], () => skin[1]);
  // Braço da frente com a flauta de juncos na boca.
  g.line(13, 11, 10, 9, skin[1]);
  for (let k = 0; k < 5; k++) g.line(7 + k, 7, 7 + k, 10 + k * 0.7, k % 2 ? "#c8a060" : "#a07a40");
  g.line(7, 7, 11, 7, "#6a4a2a");
  // Braço de trás com a faca curva.
  g.line(19, 11, 22, 14, skin[2]); g.line(22, 14, 25, 12, "#c0c4cc"); g.set(25, 11, "#e8ecf0");
  outline(g);
  return g.canvas();
}

/** Espinheiro: moita de amora verde-amarelada curvada como gente, espinhos longos nas costas e o nó-boca. */
export function thornSpitterCanvas() {
  const g = new Grid();
  const bush: Pal = ["#c8d860", "#8aa03a", "#4a6020"];
  // Raízes arrastando atrás, como um manto.
  g.line(18, 26, 27, 29, BARK[2]); g.line(16, 27, 23, 30, BARK[1]); g.line(13, 27, 11, 30, BARK[1]);
  // Corpo de ramos emaranhados, curvado para a frente.
  g.oval(16, 18, 7.5, 9, bush);
  for (let k = 0; k < 14; k++) {
    const x = 10 + hash(k, 1, 811) * 12, y = 10 + hash(k, 2, 812) * 16;
    g.line(x, y, x + 3, y + 2, k % 2 ? bush[2] : "#3a4a18");
  }
  // Cabeça curvada para a frente.
  g.oval(10, 10, 4, 3.6, bush);
  g.set(8, 9, "#1a1a08"); g.set(8, 9, "#e8f040"); g.set(11, 9, "#c0c830");
  g.oval(8, 12, 1.2, 1, ["#1a1208", "#100a04", "#080402"]);
  // Espinhos compridos nas costas, prontos para sair.
  for (const [x, y, dx, dy] of [[20, 10, 4, -5], [22, 13, 6, -3], [23, 17, 6, 0], [22, 21, 6, 3], [18, 9, 2, -6], [15, 9, 0, -5]]) {
    g.line(x, y, x + dx, y + dy, "#e8e0b0"); g.set(x + dx, y + dy, "#ffffff");
  }
  // Fungo claro no ombro.
  g.oval(14, 9, 1.6, 0.9, ["#f0ead8", "#d0c8b0", "#a8a088"]);
  // Braço de ramo com espinhos.
  g.line(10, 15, 5, 20, bush[1]); g.set(6, 18, "#e8e0b0"); g.set(4, 21, "#e8e0b0");
  outline(g);
  return g.canvas();
}

/** Pantera das Sombras: pantera preta comprida e rente ao chão, brilho azul no pelo, fumaça sólida e olhos verdes. */
export function shadowPantherCanvas() {
  const g = new Grid();
  const fur: Pal = ["#3a4a6a", "#1e2638", "#0c0e16"];
  // Cauda de chicote, levantada.
  for (let k = 0; k <= 10; k++) g.set(25 + k * 0.6, 18 - Math.sin(k / 3) * 5, k % 3 ? fur[1] : fur[0]);
  // Pernas.
  g.line(10, 21, 8, 27, fur[1]); g.line(13, 21, 13, 27, fur[2]);
  g.line(21, 21, 22, 27, fur[1]); g.line(24, 20, 26, 27, fur[2]);
  // Corpo comprido e baixo.
  g.oval(17, 18, 9.5, 4, fur);
  g.line(10, 15, 23, 15, fur[0]);
  // Cabeça baixa, olhos verdes frios e presas.
  g.oval(7, 17, 3.6, 3, fur);
  g.poly([[5, 17], [2, 18], [2, 20], [6, 20]], () => fur[1]);
  g.set(5, 16, "#9aff7a"); g.set(6, 16, "#4ad04a");
  g.set(3, 20, "#f0f0f0");
  g.poly([[6, 14], [7, 11], [9, 14]], () => fur[1]);
  // Fumaça escura saindo dos ombros e da ponta da cauda (pixels sólidos).
  for (const [x, y] of [[13, 12], [14, 11], [12, 10], [16, 12], [15, 9], [31, 12], [30, 11], [29, 13]]) g.set(x, y, hash(x, y, 821) < 0.5 ? "#2a3048" : "#424a68");
  outline(g);
  return g.canvas();
}

/** Urso-coruja: corpo de urso pardo de pé, cabeça de coruja com penas barradas creme, bico amarelo e olhos laranja. */
export function owlbearCanvas() {
  const g = new Grid();
  const fur: Pal = ["#a07850", "#74522e", "#46301a"];
  const feather: Pal = ["#f0e0b8", "#c8a878", "#8a6a44"];
  // Pernas grossas.
  g.oval(12, 26, 3, 4, fur); g.oval(21, 26, 3.2, 4, [fur[1], fur[2], "#2a1c10"]);
  // Corpo enorme de pé.
  g.oval(17, 18, 8.5, 9, fur);
  // Peito de penas barradas.
  g.oval(14, 17, 4.5, 6, feather);
  for (let y = 12; y <= 22; y += 2) g.line(11, y, 17, y + 0.5, feather[2]);
  // Cabeça de coruja com os tufos de "orelha".
  g.oval(14, 7, 6, 5, feather);
  for (let x = 9; x <= 19; x += 2) g.set(x, 10, feather[2]);
  g.poly([[9, 4], [8, 0], [11, 3]], () => fur[1]); g.poly([[17, 3], [20, 0], [20, 4]], () => fur[2]);
  // Olhos redondos laranja e o bico curvo.
  g.oval(11, 6, 1.8, 1.8, ["#ffb040", "#e07a10", "#a04a08"]); g.set(11, 6, "#120a04");
  g.oval(16, 6, 1.6, 1.6, ["#e07a10", "#a04a08", "#702a04"]); g.set(16, 6, "#120a04");
  g.poly([[12, 8], [15, 8], [13, 12]], (x) => (x < 13.5 ? "#f8d040" : "#c09020"));
  // Braços com as garras pesadas, um erguido.
  g.oval(7, 15, 2.8, 5, fur);
  for (const dx of [-2, 0, 2]) g.line(6 + dx, 19, 5 + dx, 21, "#f0e8d0");
  g.oval(25, 14, 2.6, 5, [fur[1], fur[2], "#2a1c10"]);
  for (const dx of [-1, 1]) g.line(25 + dx, 9, 25 + dx, 7, "#d8d0b8");
  outline(g);
  return g.canvas();
}

// --- Mini-bosses -----------------------------------------------------------------------------

/** Dríade Corrompida: alta e magra, pele de casca de bétula com rachaduras pretas, cabelo de folhas vermelhas e raízes. */
export function corruptedDryadCanvas() {
  const g = new Grid();
  const birch: Pal = ["#e8e4dc", "#b8b4aa", "#7a7670"];
  // Vestido de musgo e folhas mortas até o chão, raízes saindo dos pés.
  g.poly([[13, 13], [19, 13], [22, 28], [10, 28]], (x, y) => (hash(x, y, 831) < 0.2 ? "#8a5a2a" : x < 14 ? "#6b8a3a" : x > 19 ? "#2e4018" : "#4a6a28"));
  for (const [x0, dx] of [[11, -4], [15, -1], [20, 4]]) g.line(x0, 28, x0 + dx, 31, BARK[1]);
  // Tronco de casca de bétula, com a podridão preta saindo do peito.
  g.oval(16, 10, 3, 4, birch);
  g.line(15, 8, 17, 12, "#1a1a1a"); g.line(17, 9, 16, 11, "#1a1a1a");
  g.oval(16, 11, 1.4, 1.2, ["#3a2a3a", "#1e141e", "#0e080e"]);
  // Cabeça e o cabelo de folhas de outono, comprido, caindo nas costas.
  g.oval(15, 4, 2.6, 3, birch);
  g.set(14, 4, AMBER); g.set(16, 4, "#c07010");
  g.line(14, 7, 16, 7, birch[2]);
  for (let k = 0; k < 16; k++) {
    const x = 15 + hash(k, 1, 832) * 7, y = 1 + hash(k, 2, 833) * 13;
    g.set(x, y, k % 3 ? "#c0392b" : "#e8762a");
  }
  g.line(17, 2, 21, 13, "#a02a1c"); g.line(18, 1, 22, 9, "#d04a24");
  // Galhinhos no cabelo.
  g.line(13, 2, 11, 0, BARK[1]); g.line(17, 1, 19, 0, BARK[1]);
  // Braço erguido com os dedos-raiz compridos.
  g.line(14, 9, 9, 12, birch[1]); g.line(9, 12, 6, 10, birch[1]);
  for (const [dx, dy] of [[-3, -2], [-3, 0], [-2, 2]]) g.line(6, 10, 6 + dx, 10 + dy, BARK[1]);
  g.line(18, 9, 21, 14, birch[2]);
  outline(g);
  return g.canvas();
}

/** Centauro Renegado: tronco de homem barbado com couraça de couro e pele de lobo, corpo de cavalo malhado cinza e preto. */
export function renegadeCentaurCanvas() {
  const g = new Grid();
  const horse: Pal = ["#b8b8b8", "#7a7a7a", "#3a3a3a"];
  const skin: Pal = ["#d8a880", "#a87a52", "#6e4a30"];
  // Cauda preta.
  g.line(27, 15, 30, 23, "#1e1e1e"); g.line(28, 15, 31, 21, "#2e2e2e");
  // Pernas de cavalo e cascos.
  for (const [x, c] of [[12, horse[1]], [15, horse[2]], [23, horse[1]], [26, horse[2]]] as const) { g.line(x, 20, x, 28, c); g.set(x, 29, "#1a1210"); }
  // Corpo de cavalo, malhado.
  g.oval(19, 17, 8.5, 4.5, horse);
  for (let k = 0; k < 9; k++) g.set(13 + hash(k, 1, 841) * 13, 14 + hash(k, 2, 842) * 6, "#2a2a2a");
  // Aljava de penas pretas no lombo.
  g.rect(21, 9, 23, 14, (x) => (x === 21 ? "#8a5a30" : "#5a3a1c"));
  for (const x of [21, 23]) g.line(x, 6, x, 9, "#1a1a1a");
  // Tronco humano com a couraça de couro e a pele de lobo nos ombros.
  g.oval(12, 10, 3.4, 4.6, skin);
  g.rect(9, 9, 15, 14, (x, y) => (y === 11 ? "#3a2414" : x < 11 ? "#9a6a3a" : "#6e4826"));
  g.oval(13, 6, 3.6, 1.6, ["#a8acb0", "#6e7378", "#3e4246"]);
  // Cabeça barbada com a pintura de guerra.
  g.oval(11, 3, 2.4, 2.6, skin);
  g.rect(9, 4, 12, 6, (x) => (x % 2 ? "#4a3020" : "#2e1c10"));
  g.line(9, 2, 11, 2, "#c0392b"); g.set(10, 3, "#1a1210");
  // Arco recurvo alto, à frente.
  for (let y = 0; y <= 18; y++) g.set(5 - Math.sin((y / 18) * Math.PI) * 2.5, y, y < 9 ? "#8a5a30" : "#5a3a1c");
  g.line(5, 0, 5, 18, "#e8e0d0");
  g.line(9, 9, 5, 9, skin[1]);
  outline(g);
  return g.canvas();
}

/** Guardião do Menir: constructo de pedras de menir empilhadas, musgo nas frestas, a espiral verde-água acesa. */
export function menhirGuardianCanvas() {
  const g = new Grid();
  const stone: Pal = ["#b0b4a8", "#7e8276", "#4a4e44"];
  const RUNE = "#4ad0c0";
  const spiral = (cx: number, cy: number, r: number) => {
    for (let a = 0; a < 9; a += 0.4) g.set(cx + Math.cos(a) * (a / 9) * r, cy + Math.sin(a) * (a / 9) * r, RUNE);
  };
  // Pernas: dois blocos com hera.
  g.rect(9, 23, 14, 30, (x) => (x < 11 ? stone[1] : stone[2]));
  g.rect(18, 23, 23, 30, (x) => (x < 20 ? stone[1] : stone[2]));
  g.line(9, 25, 14, 28, "#4a7a2a"); g.line(18, 26, 23, 24, "#4a7a2a");
  // Tronco: uma laje larga em pé.
  g.poly([[7, 9], [25, 8], [26, 23], [6, 24]], (x, y) => {
    const u = (x - 16) / 10 + (y - 16) / 9;
    return hash(x, y, 851) < 0.08 ? "#5a7a3a" : u < -0.5 ? stone[0] : u < 0.5 ? stone[1] : stone[2];
  });
  g.line(7, 16, 25, 15, stone[2]);
  spiral(16, 15, 4);
  // Braços: menires deitados, com os punhos de pedra e runas.
  g.rect(1, 10, 6, 24, (x) => (x < 3 ? stone[0] : stone[1]));
  g.rect(26, 9, 30, 22, (x) => (x < 28 ? stone[1] : stone[2]));
  g.set(3, 20, RUNE); g.set(4, 21, RUNE); g.set(28, 18, RUNE); g.set(28, 19, RUNE);
  // Cabeça: bloco sem rosto, só a espiral acesa.
  g.rect(11, 1, 21, 8, (x, y) => (x < 13 || y < 2 ? stone[0] : x > 19 ? stone[2] : stone[1]));
  spiral(16, 4.5, 2.6);
  // Líquen nas frestas.
  for (const [x, y] of [[8, 12], [22, 20], [12, 7], [24, 11], [2, 15]]) g.set(x, y, "#c8d070");
  outline(g);
  return g.canvas();
}

// --- Boss (desenhado em 32×32 e mostrado em 2 tiles) -----------------------------------------

/**
 * Dragão Verde Jovem: escamas esmeralda escurecendo nas costas, crista de babados, chifres com hera, olhos amarelos de
 * veneno, ventre verde-amarelado, asas de membrana rasgada e o vapor verde pingando da boca.
 */
export function greenDragonCanvas() {
  const g = new Grid();
  const scale: Pal = ["#4ade80", "#1f9a54", "#0e4a2a"];
  const belly: Pal = ["#e0f0a0", "#b8d070", "#7a9a40"];
  // Asa de trás, aberta (membrana rasgada).
  g.poly([[18, 10], [27, 0], [31, 4], [29, 14]], (x, y) => ((x + y) % 6 === 0 ? scale[2] : hash(x, y, 861) < 0.1 ? "#2a7a4a" : "#16603a"));
  g.line(18, 10, 27, 0, scale[2]); g.line(27, 0, 31, 4, scale[2]);
  // Cauda.
  for (let k = 0; k <= 10; k++) g.set(24 + k * 0.7, 22 + Math.sin(k / 2.5) * 2, k % 2 ? scale[1] : scale[2]);
  // Pernas.
  g.oval(21, 25, 3, 3.6, [scale[1], scale[2], "#062a16"]);
  g.oval(11, 25, 2.6, 3.4, scale);
  for (const x of [8, 10, 12, 19, 21]) g.set(x, 28, "#f0e8d0");
  // Corpo, com o ventre de placas.
  g.oval(17, 19, 8, 6, scale);
  g.oval(13, 21, 4, 3.6, belly);
  for (let y = 18; y <= 24; y += 2) g.line(10, y, 16, y, belly[2]);
  // Pescoço curvo e cabeça de mandíbula comprida, olhando para a esquerda.
  g.oval(11, 12, 3, 4.6, scale);
  g.oval(8, 7, 4, 3, scale);
  g.poly([[5, 6], [0, 8], [0, 10], [6, 10]], (x, y) => (y < 8.5 ? scale[1] : scale[2]));
  g.line(0, 10, 6, 10, "#062a16");
  for (const x of [1, 3, 5]) g.set(x, 11, "#f0f0d8");
  g.set(6, 6, "#ffe840"); g.set(7, 6, "#c0a010");
  // Chifres e a crista de babados, com hera.
  g.line(9, 4, 13, 0, "#d8d0b0"); g.line(11, 5, 15, 2, "#b8b090");
  for (let y = 7; y <= 16; y += 2) g.poly([[12, y], [15, y - 1], [13, y + 1]], () => scale[2]);
  g.set(13, 1, "#4a7a2a"); g.set(14, 2, "#6b9a3a");
  // Asa da frente, meio fechada.
  g.poly([[14, 13], [20, 4], [24, 12]], (x, y) => ((x + y) % 5 === 0 ? scale[2] : scale[1]));
  g.line(14, 13, 20, 4, "#0a3a20");
  // Vapor venenoso pingando da boca.
  for (const [x, y] of [[1, 12], [2, 13], [0, 14], [3, 15], [1, 16]]) g.set(x, y, hash(x, y, 862) < 0.5 ? "#9acd32" : "#c8f060");
  outline(g);
  return g.canvas();
}
