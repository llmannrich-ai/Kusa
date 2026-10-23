import { TILE_SIZE } from "@kusa/shared";
import { hash, makeCanvas, px } from "./pixels.ts";

/**
 * Verme da Areia (boss da caverna do deserto): arte própria, 32×32, que o `refineArt` dobra como as do pack.
 * O corpo sai de um monte de areia embaixo à direita e sobe em arco até a cabeça, em cima à esquerda, com a boca
 * redonda aberta para quem olha: anéis de dentes em volta da garganta. Couraça em placas castanho-avermelhadas com as
 * juntas escuras entre os segmentos; luz de cima à esquerda, como no resto do deserto.
 */

export const SAND_WORM_OUTLINE = "#1e1008";

const PLATE = { dark: "#55301f", mid: "#8f5536", light: "#b97a4c", glow: "#d9a06c" };
const JOINT = "#3a1d10";
const MOUTH = { throat: "#2a0606", flesh: "#7a1c1c", lip: "#b5463a", tooth: "#f4ead2", toothShade: "#c9b48e" };
const SAND = { shade: "#b98a4f", mid: "#ddb77a", light: "#f0d29c" };

export function sandWormCanvas() {
  const T = TILE_SIZE;
  const { canvas, ctx } = makeCanvas(T, T);
  const cells: (string | null)[] = new Array(T * T).fill(null);
  const set = (x: number, y: number, c: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < T && y < T) cells[y * T + x] = c;
  };

  // Corpo: segmentos do rabo (no monte de areia) até o pescoço, cada um um disco com junta escura atrás.
  const segments = 7;
  const at = (t: number) => ({
    x: 23 - 12 * t + 2.5 * Math.sin(t * Math.PI),
    y: 27 - 17 * t - 2 * Math.sin(t * Math.PI * 1.2),
    r: 3.6 + 2.2 * t,
  });
  for (let i = 0; i <= segments; i++) {
    const c = at(i / segments);
    for (let y = Math.floor(c.y - c.r - 1); y <= c.y + c.r + 1; y++)
      for (let x = Math.floor(c.x - c.r - 1); x <= c.x + c.r + 1; x++) {
        const d = Math.hypot(x - c.x, y - c.y);
        if (d > c.r) continue;
        const u = (x - c.x + (y - c.y)) / c.r; // -1 no canto iluminado, +1 na sombra
        let color = u < -0.75 ? PLATE.glow : u < -0.2 ? PLATE.light : u < 0.55 ? PLATE.mid : PLATE.dark;
        // Junta: a borda de baixo de cada segmento escurece (o próximo segmento passa por cima).
        if (d > c.r - 1 && y > c.y) color = JOINT;
        // Placas: risco escuro no meio de cada segmento, quebrado.
        if (Math.abs(x - c.x) < 0.6 && y < c.y && hash(x, y, 77) < 0.6) color = PLATE.dark;
        set(x, y, color);
      }
  }

  // Cabeça: disco maior, com a boca redonda aberta (garganta, carne, lábio e um anel de dentes).
  const head = { x: 10, y: 9, r: 7.4 };
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const d = Math.hypot(x - head.x, y - head.y);
      if (d > head.r) continue;
      const u = (x - head.x + (y - head.y)) / head.r;
      let color = u < -0.7 ? PLATE.glow : u < -0.1 ? PLATE.light : u < 0.6 ? PLATE.mid : PLATE.dark;
      // Boca um pouco abaixo do centro da cabeça, levemente oval.
      const mx = x - (head.x + 0.5);
      const my = (y - (head.y + 1)) * 1.15;
      const m = Math.hypot(mx, my);
      if (m < 1.6) color = MOUTH.throat;
      else if (m < 3) color = MOUTH.flesh;
      else if (m < 4.6) {
        // Anel de dentes: pontas brancas apontando para dentro, alternadas com carne.
        const a = Math.atan2(my, mx);
        const tooth = Math.cos(a * 7) > 0.15;
        color = tooth ? (m < 3.8 ? MOUTH.tooth : MOUTH.toothShade) : MOUTH.flesh;
      } else if (m < 5.4) color = MOUTH.lip;
      set(x, y, color);
    }

  // Monte de areia por cima do rabo, de onde o verme sai.
  for (let y = 24; y < T; y++)
    for (let x = 12; x < T; x++) {
      const d = ((x - 23) / 9.5) ** 2 + ((y - 30) / 3.6) ** 2;
      if (d > 1) continue;
      const color = y < 27 && hash(x, y, 78) < 0.5 ? SAND.light : d > 0.7 ? SAND.shade : SAND.mid;
      set(x, y, color);
    }
  // Grãos voando do monte.
  for (const [x, y] of [[12, 24], [30, 23], [14, 22], [28, 21]]) set(x, y, SAND.light);

  cells.forEach((c, i) => { if (c) px(ctx, i % T, Math.floor(i / T), c); });
  return canvas;
}
