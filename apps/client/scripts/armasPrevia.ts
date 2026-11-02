/**
 * Prévia das armas de estilo (maça, lança, orbe, foice e totem de mão) na Arte nova, em PNG e sem navegador: para cada
 * família, uma linha de frente e uma de lado, com os 5 níveis comuns e os 5 mágicos, na classe que usa a arma.
 *
 *   npx tsx apps/client/scripts/armasPrevia.ts [saida.png] [zoom]
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { PROTO_SIZE, protoHeroData, type ProtoClass, type ProtoDir, type ProtoGear, type ProtoWeapon } from "../src/art/proto/tibiaHero.ts";

const out = process.argv[2] ?? "/tmp/armas.png";
const zoom = Number(process.argv[3] ?? 1);

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

const FAMILIES: [string, ProtoClass][] = [["mace", "knight"], ["spear", "paladin"], ["orb", "sorcerer"], ["scythe", "druid"], ["totem", "shaman"]];
const DIRS: ProtoDir[] = ["down", "side"];
const rows = FAMILIES.flatMap(([fam, cls]) => DIRS.map((dir) => [1, 2, 3, 4, 5].flatMap((t) => [false, true].map((magic) => ({
  dir, cls, gear: { weapon: `${fam}-${t}${magic ? "-magic" : ""}` as ProtoWeapon } as ProtoGear,
}))).sort((a, b) => Number(a.gear.weapon!.endsWith("magic")) - Number(b.gear.weapon!.endsWith("magic")))));
const cell = PROTO_SIZE, cols = 10;
const W = cols * cell, H = rows.length * cell;
const img = new Uint8Array(W * H * 4);
rows.forEach((row, r) => row.forEach((c, k) => {
  const data = protoHeroData(c.dir, 0, c.cls, c.gear);
  for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
    const i = (y * cell + x) * 4, j = ((r * cell + y) * W + k * cell + x) * 4;
    const bg = k < 5 ? [70, 86, 60] : [72, 60, 92];
    for (let ch = 0; ch < 3; ch++) img[j + ch] = data[i + 3] ? data[i + ch] : bg[ch];
    img[j + 3] = 255;
  }
}));
const ZW = W * zoom, ZH = H * zoom;
const big = new Uint8Array(ZW * ZH * 4);
for (let y = 0; y < ZH; y++) for (let x = 0; x < ZW; x++) { const s = (((y / zoom) | 0) * W + ((x / zoom) | 0)) * 4; big.set(img.subarray(s, s + 4), (y * ZW + x) * 4); }
writeFileSync(out, png(ZW, ZH, big));
console.log(`${rows.length} linhas em ${out}`);
