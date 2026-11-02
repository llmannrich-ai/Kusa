/**
 * Prévia dos itens lendários na Arte nova, em PNG e sem navegador: cada lendário vestido na classe que o usa (frente,
 * lado e costas), ao lado do mágico de Dragão da mesma família, para comparar.
 *
 *   npx tsx apps/client/scripts/lendariosPrevia.ts [saida.png] [zoom]
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { ITEMS, LEGENDARY_IDS, type ClassId } from "@kusa/shared";
import { LEGEND_BASE, PROTO_SIZE, protoHeroData, type ProtoDir, type ProtoGear } from "../src/art/proto/tibiaHero.ts";

const out = process.argv[2] ?? "/tmp/lendarios.png";
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

/** Mesmo mapa de `newArt.ts` (sem o navegador). */
const PROTO_FAMILY: Record<string, string> = {
  "weapon-sword": "sword", "weapon-axe": "axe", "weapon-bow": "bow", "weapon-crossbow": "xbow", "weapon-wand": "wand", "weapon-staff": "staff",
  "weapon-mace": "mace", "weapon-spear": "spear", "weapon-orb": "orb", "weapon-scythe": "scythe", "weapon-totem": "totem",
  "helmet-war": "war", "helmet-arcane": "arc", "armor-war": "armor", "armor-arcane": "robe", "legs-war": "greave", "legs-arcane": "pants",
  "boots-boots": "boots", "shield-shield": "shield",
};
const DIRS: ProtoDir[] = ["down", "side", "up"];
const rows = LEGENDARY_IDS.map((id) => {
  const def = ITEMS[id];
  // A calça arcana fica escondida sob o manto do feiticeiro: mostra no druida.
  const cls: ClassId = def.family === "legs-arcane" ? "druid" : def.classes?.[0] ?? "knight";
  const base = { [def.slot]: LEGEND_BASE[def.legend!] ?? `${PROTO_FAMILY[def.family]}-5-magic` } as ProtoGear;
  return [...DIRS.map((dir) => ({ dir, cls, gear: base })), ...DIRS.map((dir) => ({ dir, cls, gear: { ...base, legend: { [def.slot]: def.legend! } } }))];
});
const cell = PROTO_SIZE;
const W = 6 * cell, H = rows.length * cell;
const img = new Uint8Array(W * H * 4);
rows.forEach((row, r) => row.forEach((c, k) => {
  const data = protoHeroData(c.dir, 0, c.cls, c.gear);
  for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
    const i = (y * cell + x) * 4, j = ((r * cell + y) * W + k * cell + x) * 4;
    const a = data[i + 3];
    const bg = k < 3 ? [70, 86, 60] : [60, 70, 92];
    for (let ch = 0; ch < 3; ch++) img[j + ch] = a ? data[i + ch] : bg[ch];
    img[j + 3] = 255;
  }
}));
const Z = zoom, ZW = W * Z, ZH = H * Z;
const big = new Uint8Array(ZW * ZH * 4);
for (let y = 0; y < ZH; y++) for (let x = 0; x < ZW; x++) big.set(img.subarray(((((y / Z) | 0) * W) + ((x / Z) | 0)) * 4, ((((y / Z) | 0) * W) + ((x / Z) | 0)) * 4 + 4), (y * ZW + x) * 4);
writeFileSync(out, png(ZW, ZH, big));
console.log(`${rows.length} lendários em ${out}`);
