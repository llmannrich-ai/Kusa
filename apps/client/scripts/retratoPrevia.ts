/**
 * Prévia dos retratos de busto do menu (`protoPortraitData` em `src/art/proto/tibiaHero.ts`) em PNG, sem navegador:
 * uma linha por conjunto de equipamento (nu, ferro, mithral, arcano, dragão), uma coluna por classe, cada retrato
 * ampliado `zoom` vezes sem suavizar.
 *
 *   npx tsx apps/client/scripts/retratoPrevia.ts [saida.png] [zoom]
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { PORTRAIT_SIZE, PROTO_CLASSES, protoPortraitData, type ProtoGear } from "../src/art/proto/tibiaHero.ts";

const out = process.argv[2] ?? "/tmp/retratos.png";
const zoom = Number(process.argv[3] ?? 2);

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

const SETS: ProtoGear[] = [
  {},
  { helmet: "war-2", armor: "armor-2", legs: "greave-2", boots: "boots-2", shield: "shield-2", weapon: "sword-2" },
  { helmet: "war-4", armor: "armor-4", legs: "greave-4", boots: "boots-4", shield: "shield-4", weapon: "axe-4" },
  { helmet: "arc-3", armor: "robe-3", legs: "pants-3", boots: "boots-3", weapon: "staff-3" },
  { helmet: "war-5", armor: "armor-5", legs: "greave-5", boots: "boots-5", weapon: "sword-5" },
];
const classes = PROTO_CLASSES.filter((c) => c !== "base");

const P = PORTRAIT_SIZE, C = P * zoom;
const W = classes.length * C, H = SETS.length * C;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) img.set([40, 32, 26, 255], i * 4);
SETS.forEach((gear, r) => classes.forEach((cls, k) => {
  const data = protoPortraitData(cls, gear);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const i = (Math.floor(y / zoom) * P + Math.floor(x / zoom)) * 4;
    if (data[i + 3]) img.set([data[i], data[i + 1], data[i + 2], 255], ((r * C + y) * W + k * C + x) * 4);
  }
}));
writeFileSync(out, png(W, H, img));
console.log(`${out}: ${SETS.length} linhas × ${classes.length} classes, ${P} px cada`);
