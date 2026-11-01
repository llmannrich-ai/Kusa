/**
 * Prévia dos inimigos esculpidos por código de um mapa (Charco Cinzento em `src/art/proto/charcoArt.ts`, Ermos Rubros em
 * `ermosArt.ts`), sem navegador: uma linha por monstro com o parado, o andar, o golpe e o especial de perfil, a morte e
 * o parado de frente e de costas.
 *
 *   npx tsx apps/client/scripts/inimigosPrevia.ts saida.png charco|ermos [zoom]
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { CHARCO } from "../src/art/proto/charcoArt.ts";
import { ERMOS } from "../src/art/proto/ermosArt.ts";

// Galeria: para cada inimigo, alguns quadros lado a lado (parado de perfil, golpe, especial, morte, frente e costas).
const LISTS = { charco: CHARCO, ermos: ERMOS };
const list = LISTS[(process.argv[3] ?? "charco") as keyof typeof LISTS];
if (!list) throw new Error(`mapa: ${Object.keys(LISTS).join(" ou ")}`);
const zoom = Number(process.argv[4] ?? 2);
type F = { width: number; height: number; data: Uint8ClampedArray };
const rows: F[][] = [];
for (const c of list) {
  const P = c.poses as unknown as Record<string, never[]>;
  const mid = (a: never[]) => a[Math.floor(a.length / 2)];
  rows.push([
    c.shoot(P.idle[0], "side"), c.shoot(mid(P.walk), "side"), c.shoot(mid(P.attack), "side"), c.shoot(mid(P.special), "side"),
    c.shoot(P.death[P.death.length - 1], "side"), c.shoot(P.idle[0], "front"), c.shoot(P.idle[0], "back"),
  ]);
}
const pick = rows[0];
const S = Math.max(...rows.flat().map((f) => f.width));
const W = S * pick.length * zoom, H = S * rows.length * zoom;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = 107; img[i * 4 + 1] = 115; img[i * 4 + 2] = 96; img[i * 4 + 3] = 255; }
rows.forEach((row, r) => row.forEach((f, c) => {
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
    const s = (y * f.width + x) * 4; const a = f.data[s + 3] / 255; if (!a) continue;
    for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
      const X = (c * S + x) * zoom + dx, Y = (r * S + y + (S - f.height)) * zoom + dy, o = (Y * W + X) * 4;
      for (let k = 0; k < 3; k++) img[o + k] = Math.round(img[o + k] * (1 - a) + f.data[s + k] * a);
    }
  }
}));
function png(w: number, h: number, rgba: Uint8Array) {
  const t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (ty: string, d: Buffer) => { const tb = Buffer.from(ty), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(d.length); c.writeUInt32BE(crc(Buffer.concat([tb, d]))); return Buffer.concat([l, tb, d, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
writeFileSync(process.argv[2], png(W, H, img));
console.log("ok", list.length, "monstros");
