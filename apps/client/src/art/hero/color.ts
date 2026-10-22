/**
 * Cores dos heróis: cada material é uma rampa de 6 tons (0 = linha, 1 sombra, 2 meia-sombra, 3 base,
 * 4 luz, 5 brilho), gerada a partir da cor base com o desvio de matiz da pixel art: a sombra puxa para o
 * azul-violeta e a luz para o amarelo, em vez de só escurecer e clarear.
 */

export type Rgb = [number, number, number];

export function rgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

export function hexOf([r, g, b]: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function toHsl([r, g, b]: Rgb): Rgb {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl([h, s, l]: Rgb): Rgb {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Gira a matiz `h` em direção a `target` por até `deg` graus. */
function towards(h: number, target: number, deg: number) {
  const diff = ((target - h + 540) % 360) - 180;
  return h + Math.sign(diff) * Math.min(Math.abs(diff), deg);
}

export interface RampOptions {
  /** Distância entre os tons (1 = normal; metais polidos ~1.3, tecido fosco ~0.85). */
  contrast?: number;
  /** Graus de desvio de matiz por tom. */
  shift?: number;
  /** O tom 5 vira um brilho quase branco (metal polido, gema). */
  shine?: boolean;
}

const STEPS = [-0.33, -0.21, -0.1, 0, 0.1, 0.21];

/** Rampa de 6 tons com a cor base no tom 3. */
export function ramp(base: string, { contrast = 1, shift = 6, shine = false }: RampOptions = {}): string[] {
  const [h, s, l] = toHsl(rgb(base));
  return STEPS.map((step, i) => {
    const d = i - 3;
    if (d === 0) return base;
    const hue = d < 0 ? towards(h, 245, -d * shift) : towards(h, 55, d * shift);
    const sat = Math.max(0, Math.min(1, s * (d < 0 ? 1 + 0.05 * -d : 1 - 0.07 * d)));
    const light = Math.max(0.03, Math.min(0.97, l + step * contrast));
    let c = fromHsl([hue, sat, light]);
    if (shine && i === 5) c = mixRgb(c, [255, 252, 240], 0.55);
    return hexOf(c);
  });
}
