import * as Phaser from "phaser";
import { addCanvasTexture } from "./art/canvasTexture.ts";

/** Caracteres da fonte: dano ("-12"), cura ("+8") e XP ("+30 XP"). */
const GLYPHS = "-+0123456789 XP";

/** O texto cabe na fonte bitmap? */
export function fitsDamageFont(text: string) {
  return [...text].every((ch) => GLYPHS.includes(ch));
}

/**
 * Fonte bitmap dos números de dano, cura e XP, pintada uma vez por resolução com a mesma letra dos textos da hunt. Cada
 * número vira só quadrados de uma textura pronta: com um `Text` por número, cada golpe criava um canvas e uma textura
 * nova na GPU, e numa sala cheia (4 heróis batendo em área num bando de orcs) isso era o que mais pesava no quadro.
 * São duas fontes, como o `Text` desenha: o contorno preto (`stroke`) embaixo e o miolo branco (`fill`, tingido na cor
 * do número) por cima, para o contorno de uma letra não cobrir a vizinha.
 */
export function damageFont(scene: Phaser.Scene, style: { fontFamily: string; strokeThickness: number }, size: number, resolution: number) {
  const base = `dano-${size}-${resolution}`;
  const keys = { stroke: `${base}-contorno`, fill: `${base}-miolo` };
  if (scene.cache.bitmapFont.exists(keys.fill)) return keys;
  const r = resolution;
  const fontPx = size * r;
  const stroke = style.strokeThickness * r;
  const pad = Math.ceil(stroke / 2) + 1;
  const font = `${fontPx}px ${style.fontFamily}`;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const widths = [...GLYPHS].map((ch) => measure.measureText(ch).width);
  const cellW = widths.map((w) => Math.ceil(w) + pad * 2);
  const cellH = Math.ceil(fontPx * 1.25) + pad * 2;
  for (const layer of ["stroke", "fill"] as const) {
    const key = keys[layer];
    const canvas = document.createElement("canvas");
    canvas.width = cellW.reduce((a, b) => a + b, 0);
    canvas.height = cellH;
    const ctx = canvas.getContext("2d")!;
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    let x = 0;
    const chars = [...GLYPHS].map((ch, i) => {
      if (layer === "stroke") ctx.strokeText(ch, x + pad, cellH / 2);
      else ctx.fillText(ch, x + pad, cellH / 2);
      const def = `<char id="${ch.charCodeAt(0)}" x="${x}" y="0" width="${cellW[i]}" height="${cellH}" xoffset="0" yoffset="0" xadvance="${widths[i]}"/>`;
      x += cellW[i];
      return def;
    });
    addCanvasTexture(scene.textures, key, canvas);
    const xml = `<font><info face="${key}" size="${fontPx}"/><common lineHeight="${cellH}"/><chars>${chars.join("")}</chars></font>`;
    scene.cache.xml.add(key, new DOMParser().parseFromString(xml, "text/xml"));
    Phaser.GameObjects.BitmapText.ParseFromAtlas(scene, key, key, "__BASE", key);
  }
  return keys;
}
