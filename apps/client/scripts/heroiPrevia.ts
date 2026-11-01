/**
 * Prévia dos heróis da Arte nova (`src/art/proto/tibiaHero.ts`) em PNG, sem navegador: as 5 figuras (corpo base e as
 * 4 classes) nas 3 direções, nu de equipamento e com alguns conjuntos vestidos, num chão de grama.
 *
 *   npx tsx apps/client/scripts/heroiPrevia.ts [saida.png] [zoom] [andar|acao]
 *
 * Com `andar`, cada linha mostra os 4 quadros da caminhada de frente e de lado. Com `acao`, os movimentos de ação de
 * cada tipo de arma: parado, golpe de frente, de lado e de costas, e a magia de frente e de lado.
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { HERO_ACTION_FRAMES, PROTO_CLASSES, PROTO_SIZE, protoActionData, protoHeroData, type HeroAction, type ProtoClass, type ProtoDir, type ProtoGear } from "../src/art/proto/tibiaHero.ts";

const out = process.argv[2] ?? "/tmp/herois.png";
const zoom = Number(process.argv[3] ?? 2);
const walk = process.argv[4] === "andar";
const action = process.argv[4] === "acao";

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

const SETS: Record<string, ProtoGear> = {
  ferro: { helmet: "war-2", armor: "armor-2", legs: "greave-2", boots: "boots-2", shield: "shield-2", weapon: "sword-2" },
  mithral: { helmet: "war-4", armor: "armor-4", legs: "greave-4", boots: "boots-4", shield: "shield-4", weapon: "axe-4" },
  arcano: { helmet: "arc-3", armor: "robe-3", legs: "pants-3", boots: "boots-3", weapon: "staff-3" },
  dragao: { helmet: "war-5", armor: "armor-5", legs: "greave-5", boots: "boots-5", weapon: "sword-5" },
};

type Cell = { dir: ProtoDir; frame: number; cls: ProtoClass; gear?: ProtoGear; action?: HeroAction };
const rows: Cell[][] = [];
const DIRS: ProtoDir[] = ["down", "side", "up"];
if (action) {
  const ACTORS: [ProtoClass, ProtoGear?][] = [
    ["knight"], ["knight", { weapon: "axe-5", armor: "armor-3", helmet: "war-3" }], ["knight", { weapon: "sword-3-magic", shield: "shield-3", armor: "armor-4" }],
    ["paladin"], ["paladin", { weapon: "xbow-3" }], ["sorcerer"], ["sorcerer", { weapon: "wand-4", armor: "robe-2" }], ["druid"],
  ];
  const clip = (cls: ProtoClass, gear: ProtoGear | undefined, a: HeroAction, dir: ProtoDir) =>
    [...Array(HERO_ACTION_FRAMES).keys()].map((f) => ({ dir, frame: f, cls, gear, action: a }));
  for (const [cls, gear] of ACTORS) rows.push([{ dir: "down", frame: 0, cls, gear }, ...clip(cls, gear, "attack", "down"), ...clip(cls, gear, "attack", "side"), ...clip(cls, gear, "attack", "up"), ...clip(cls, gear, "cast", "down"), ...clip(cls, gear, "cast", "side")]);
} else if (walk) {
  for (const cls of PROTO_CLASSES) rows.push([...[0, 1, 2, 3].map((f) => ({ dir: "down" as const, frame: f, cls })), ...[0, 1, 2, 3].map((f) => ({ dir: "side" as const, frame: f, cls }))]);
} else {
  rows.push(PROTO_CLASSES.flatMap((cls) => [{ dir: "down" as const, frame: 0, cls }]).concat(PROTO_CLASSES.slice(1).map((cls) => ({ dir: "side" as const, frame: 0, cls }))));
  for (const gear of Object.values(SETS)) rows.push(PROTO_CLASSES.slice(1).flatMap((cls) => DIRS.slice(0, 2).map((dir) => ({ dir, frame: 0, cls, gear }))));
}

const S = PROTO_SIZE;
const cols = Math.max(...rows.map((r) => r.length));
const W = cols * S * zoom / 2, H = rows.length * S * zoom / 2;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { const g = ((i % W >> 4) + ((i / W) >> 4)) & 1; img.set([g ? 74 : 80, g ? 106 : 112, g ? 52 : 56, 255], i * 4); }
rows.forEach((row, r) => row.forEach((cell, k) => {
  const data = cell.action ? protoActionData(cell.dir, cell.action, cell.frame, cell.cls, cell.gear) : protoHeroData(cell.dir, cell.frame, cell.cls, cell.gear);
  const ox = k * S * zoom / 2, oy = r * S * zoom / 2;
  for (let y = 0; y < S * zoom / 2; y++) for (let x = 0; x < S * zoom / 2; x++) {
    const sx = Math.floor((x * 2) / zoom), sy = Math.floor((y * 2) / zoom);
    const i = (sy * S + sx) * 4;
    if (data[i + 3]) img.set([data[i], data[i + 1], data[i + 2], 255], ((oy + y) * W + ox + x) * 4);
  }
  // Linha dos pés e topo da cabeça de referência (pés em 184 px, altura antiga ≈ 140 px).
}));
writeFileSync(out, png(W, H, img));
console.log(`${out}: ${rows.length} linhas × ${cols} colunas`);
