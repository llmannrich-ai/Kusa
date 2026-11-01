/**
 * Pré-visualização da arte esculpida por código (`src/art/proto/sculpt.ts`), sem navegador: gera a folha do Escorpião
 * da Areia em PNG, ampliada, e mede quanto cada quadro leva para sair.
 *
 *   npx tsx apps/client/scripts/esculturaPrevia.ts [saida.png] [zoom]
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { CLIP_POSES, SCORPION_SIZE, SHELLS, shoot, type View } from "../src/art/proto/scorpion.ts";
import type { Frame } from "../src/art/proto/sculpt.ts";

const out = process.argv[2] ?? "/tmp/escorpiao.png";
const zoom = Number(process.argv[3] ?? 3);
const shellName = (process.argv[4] ?? "amber") as keyof typeof SHELLS;

function png(w: number, h: number, rgba: Uint8Array) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type), len = Buffer.alloc(4), c = Buffer.alloc(4);
    len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const S = SCORPION_SIZE;
const rows: { name: string; frames: Frame[] }[] = [];
const times: number[] = [];
const take = (pose: Parameters<typeof shoot>[0], view: View) => {
  const t0 = performance.now();
  const f = shoot(pose, view, SHELLS[shellName]);
  times.push(performance.now() - t0);
  return f;
};
for (const [clip, poses] of Object.entries(CLIP_POSES)) rows.push({ name: clip, frames: poses.map((p) => take(p, "side")) });
rows.push({ name: "front", frames: [CLIP_POSES.idle[0], ...CLIP_POSES.walk].map((p) => take(p, "front")) });
rows.push({ name: "back", frames: [CLIP_POSES.idle[0], ...CLIP_POSES.walk].map((p) => take(p, "back")) });

const cols = Math.max(...rows.map((r) => r.frames.length));
const W = cols * S * zoom, H = rows.length * S * zoom;
const img = new Uint8Array(W * H * 4);
// Fundo de areia (como o chão do Mar de Areia), para julgar o contraste de verdade.
for (let i = 0; i < W * H; i++) { img[i * 4] = 0xd9; img[i * 4 + 1] = 0xa0; img[i * 4 + 2] = 0x62; img[i * 4 + 3] = 255; }
rows.forEach((row, ry) => row.frames.forEach((f, cx) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const a = f.data[(y * S + x) * 4 + 3];
    if (!a) continue;
    for (let dy = 0; dy < zoom; dy++) for (let dx = 0; dx < zoom; dx++) {
      const o = ((ry * S + y) * zoom + dy) * W + (cx * S + x) * zoom + dx;
      img.set(f.data.subarray((y * S + x) * 4, (y * S + x) * 4 + 4), o * 4);
    }
  }
}));
writeFileSync(out, png(W, H, img));
times.sort((a, b) => a - b);
console.log(`${out}: ${times.length} quadros, mediana ${times[times.length >> 1].toFixed(1)} ms, pior ${times[times.length - 1].toFixed(1)} ms`);
