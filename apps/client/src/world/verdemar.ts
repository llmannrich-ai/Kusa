import type { MapId } from "@kusa/shared";

// Catálogo da carta de Verdemar (a campanha): onde fica cada cenário, as trilhas entre eles e os nomes no mapa.
// O jogo (worldMap.ts) e o gerador da arte (verdemarArt.ts) leem daqui; mudou algo, gere a arte de novo
// (`npm run mapa -w @kusa/client`). Fica no cliente, fora de `RULES_FILES`: não muda a versão das regras.

/** Tamanho do desenho, em px no zoom 1 (a tela de 412 px mostra 412 unidades). */
export const W = 1600;
export const H = 2400;

export interface CampaignNode {
  /** Etapa da campanha: os dois lados de uma bifurcação têm a mesma. */
  step: number;
  x: number;
  y: number;
  name: string;
  area: string;
  /** Cenário que já existe (os outros são da campanha por vir). */
  map?: MapId;
  /** Aqui o caminho se divide: as duas opções. */
  fork?: string;
  final?: boolean;
}

/** A campanha, do sul ao norte. Os 4 cenários de hoje são o começo. */
export const NODES: Record<string, CampaignNode> = {
  n1: { step: 1, x: 390, y: 1990, name: "Pântano do Kosaradius", area: "Floresta do Kosaradius", map: "marsh" },
  n2: { step: 2, x: 700, y: 1925, name: "Cripta", area: "Colinas das Tumbas", map: "crypt" },
  n3: { step: 3, x: 1030, y: 2000, name: "Mar de Areia", area: "Solária", map: "desert" },
  n4: { step: 4, x: 1105, y: 1680, name: "Pântano das Ruínas", area: "Baía Afundada", map: "swamp" },
  // A Caverna da Travessia é a primeira bifurcação: o covil oeste (Basilisco) dá na floresta, o leste (Observador) no deserto.
  n5: { step: 5, x: 905, y: 1560, name: "Caverna da Travessia", area: "Campos de Kusa", map: "cavern", fork: "floresta ou deserto" },
  n6a: { step: 6, x: 610, y: 1565, name: "Bosque Velho", area: "Floresta do Kosaradius", map: "oldwood" },
  n7a: { step: 7, x: 425, y: 1365, name: "Coração da Mata", area: "Floresta do Kosaradius", map: "heartwood" },
  n6b: { step: 6, x: 1155, y: 1440, name: "Dunas Cantantes", area: "Solária", map: "dunes" },
  n7b: { step: 7, x: 1170, y: 1225, name: "Mesas de Solária", area: "Solária", map: "mesas" },
  n8: { step: 8, x: 800, y: 1135, name: "Portões do Império", area: "Ruínas do Império", fork: "charco ou ermos" },
  n9a: { step: 9, x: 440, y: 960, name: "Charco Cinzento", area: "Charco Cinzento" },
  n9b: { step: 9, x: 1120, y: 905, name: "Ermos Rubros", area: "Ermos Rubros" },
  n10: { step: 10, x: 785, y: 800, name: "Sopé da Serra", area: "Serra do Norte", fork: "passo ou garganta" },
  n11a: { step: 11, x: 525, y: 645, name: "Passo do Lobo", area: "Serra do Norte" },
  n12a: { step: 12, x: 545, y: 445, name: "Mosteiro Gelado", area: "Serra do Norte" },
  n11b: { step: 11, x: 1010, y: 655, name: "Garganta do Rio", area: "Serra do Norte" },
  n12b: { step: 12, x: 1010, y: 440, name: "Forjas Anãs", area: "Serra do Norte" },
  n13: { step: 13, x: 780, y: 300, name: "Cidadela Caída", area: "Capital do Império de Kusa", final: true },
};

/**
 * Os cenários de hoje: o herói anda por estas trilhas. Elas são iguais até a Caverna da Travessia (`FORK`) e lá se
 * dividem: o lado do deserto (Dunas Cantantes, Mesas de Solária) e o da floresta (Bosque Velho, Coração da Mata).
 */
export const OPEN_CHAINS = [
  ["n1", "n2", "n3", "n4", "n5", "n6b", "n7b"],
  ["n1", "n2", "n3", "n4", "n5", "n6a", "n7a"],
] as const;
export const FORK = "n5";

/** Trilhas: 3 bifurcações (Caverna da Travessia, Portões do Império, Sopé da Serra), cada uma com dois caminhos que se reencontram. */
export const EDGES: [string, string][] = [
  ["n1", "n2"], ["n2", "n3"], ["n3", "n4"], ["n4", "n5"],
  ["n5", "n6a"], ["n6a", "n7a"], ["n7a", "n8"], ["n5", "n6b"], ["n6b", "n7b"], ["n7b", "n8"],
  ["n8", "n9a"], ["n9a", "n10"], ["n8", "n9b"], ["n9b", "n10"],
  ["n10", "n11a"], ["n11a", "n12a"], ["n12a", "n13"], ["n10", "n11b"], ["n11b", "n12b"], ["n12b", "n13"],
];

/** Curva de cada trilha (Bézier cúbica), com as curvas sorteadas por semente: igual no jogo e na arte. */
export const EDGE_D: Record<string, string> = (() => {
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const out: Record<string, string> = {};
  for (const [a, b] of EDGES) {
    const A = NODES[a], B = NODES[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const o1 = (rnd() - 0.5) * 0.32 * len, o2 = (rnd() - 0.5) * 0.32 * len;
    const c = [A.x + dx / 3 + nx * o1, A.y + dy / 3 + ny * o1, A.x + (2 * dx) / 3 + nx * o2, A.y + (2 * dy) / 3 + ny * o2].map((v) => v.toFixed(1));
    out[a + b] = `M${A.x} ${A.y}C${c[0]} ${c[1]} ${c[2]} ${c[3]} ${B.x} ${B.y}`;
  }
  return out;
})();

/** Onde a névoa da campanha começa (para o norte, ainda não explorado). */
export const FOG_EDGE = 1500;

/** Terras fora do continente, sob névoa: tocar só avisa. */
export const FOG = [
  { name: "Gelo de Hrimfal", x: 800, y: 66, rx: 640, ry: 80 },
  { name: "Ilha de Cinza", x: 1494, y: 1090, rx: 110, ry: 100 },
];

/** Nomes de região, em curva. `px`: tamanho mínimo na tela quando o mapa está longe. */
export const LABELS = [
  { text: "Floresta do Kosaradius", d: "M282 1880Q236 1560 318 1210", size: 34, px: 15, sp: 6 },
  { text: "Ruínas do Império", d: "M620 1020Q805 960 990 1030", size: 32, px: 15, sp: 5 },
  { text: "Solária", d: "M1300 1600Q1340 1400 1290 1160", size: 40, px: 16, sp: 14 },
  { text: "Serra do Norte", d: "M262 640Q330 400 560 290", size: 32, px: 15, sp: 6 },
  { text: "Charco Cinzento", d: "M190 806Q300 736 440 766", size: 22, px: 13, sp: 3 },
  { text: "Ermos Rubros", d: "M1130 810Q1250 758 1376 788", size: 22, px: 13, sp: 3 },
  { text: "Colinas das Tumbas", d: "M520 2090Q700 2044 880 2094", size: 22, px: 13, sp: 3 },
  { text: "Campos de Kusa", d: "M730 1652Q880 1612 1030 1662", size: 22, px: 13, sp: 3 },
];

/** Lugares menores (somem com o mapa longe). */
export const PLACES = [
  { text: "Vila do Brejo", x: 540, y: 2088 }, { text: "Porto do Sal", x: 1262, y: 1792 }, { text: "Farol da Maré", x: 1356, y: 1440 },
  { text: "Lago Espelho", x: 752, y: 1336, water: true }, { text: "Torre de Vigia", x: 960, y: 1810 }, { text: "Oásis de Âmbar", x: 1262, y: 1340 },
  { text: "Aldeia das Dunas", x: 1180, y: 2010 }, { text: "Ponte do Rei", x: 860, y: 1420 }, { text: "Baía Afundada", x: 1290, y: 1630, water: true, big: true },
  { text: "Cemitério dos Reis", x: 640, y: 1840 }, { text: "Picos de Hrim", x: 960, y: 250 }, { text: "Vau das Garças", x: 300, y: 1080 },
];
