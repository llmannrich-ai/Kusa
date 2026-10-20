// Galeria de desenvolvimento (arte.html): mostra a arte própria ampliada para conferir pixel a pixel.
import { CLASS_IDS, CLASSES, TILE_SIZE } from "@kusa/shared";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroSheet } from "./art/heroes.ts";
import { makeCanvas } from "./art/pixels.ts";
import { RIM, WALL_RISE, WALL_VARIANTS, wallCap, wallFace } from "./art/walls.ts";
import { CHEST_TEXTURE, FLOOR_TEXTURE, MONSTER_TEXTURE, PORTAL_TEXTURE } from "./art/textures.ts";

const ZOOM = 4;
const gallery = document.getElementById("gallery")!;

function section(title: string) {
  const h = document.createElement("h2");
  h.textContent = title;
  const row = document.createElement("div");
  row.className = "row";
  gallery.append(h, row);
  return row;
}

function show(row: HTMLElement, source: HTMLCanvasElement | HTMLImageElement, caption: string, zoom = ZOOM) {
  const fig = document.createElement("figure");
  const el = source;
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  el.style.width = `${w * zoom}px`;
  const cap = document.createElement("figcaption");
  cap.textContent = caption;
  fig.append(el, cap);
  row.append(fig);
}

const dirNames = { down: "frente", up: "costas", side: "lado" };
for (const id of CLASS_IDS) {
  const row = section(CLASSES[id].name);
  const sheet = heroSheet(id);
  HERO_DIRS.forEach((dir, d) => {
    for (let f = 0; f < HERO_FRAMES; f++) {
      const { canvas, ctx } = makeCanvas(HERO_SIZE, HERO_SIZE);
      ctx.drawImage(sheet, (d * HERO_FRAMES + f) * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, 0, 0, HERO_SIZE, HERO_SIZE);
      show(row, canvas, `${dirNames[dir]} ${f}`);
    }
  });
}

const walls = section("Paredes (tampa + face)");
for (let v = 0; v < WALL_VARIANTS; v++) {
  const { canvas, ctx } = makeCanvas(TILE_SIZE, TILE_SIZE + WALL_RISE);
  ctx.drawImage(wallCap(v, RIM.north | RIM.west | RIM.east), 0, 0);
  ctx.drawImage(wallFace(v), 0, TILE_SIZE);
  show(walls, canvas, `variação ${v}`);
}

// Mini-cena: um corredor com parede ao norte e ao sul, as 4 classes e alguns monstros.
const sceneRow = section("Mini-cena");
const W = 9, H = 6;
const { canvas: sceneCanvas, ctx: sceneCtx } = makeCanvas(W * TILE_SIZE, H * TILE_SIZE);
sceneCanvas.className = "scene";
const loadImage = (key: string) => new Promise<HTMLImageElement>((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.src = `assets/dcss/${key}.png`;
});
const [floor, ...monsters] = await Promise.all([
  loadImage(FLOOR_TEXTURE.normal),
  ...Object.values(MONSTER_TEXTURE).map(loadImage),
]);
const isWall = (_x: number, y: number) => y === 0 || y === H - 1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!isWall(x, y)) sceneCtx.drawImage(floor, ((x * 7 + y * 3) % 9) * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }
}
// Ordem de desenho por linha, como no jogo: paredes e personagens da mesma linha, de cima para baixo.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!isWall(x, y)) continue;
    const rim = (!isWall(x, y - 1) && y > 0 ? RIM.north : 0);
    sceneCtx.drawImage(wallCap(x % WALL_VARIANTS, rim), x * TILE_SIZE, y * TILE_SIZE - WALL_RISE);
    if (y + 1 < H && !isWall(x, y + 1)) sceneCtx.drawImage(wallFace(x % WALL_VARIANTS), x * TILE_SIZE, (y + 1) * TILE_SIZE - WALL_RISE);
  }
  if (y === 1) CLASS_IDS.forEach((id, i) => sceneCtx.drawImage(heroSheet(id), 0, 0, HERO_SIZE, HERO_SIZE, (1 + i * 2) * TILE_SIZE, y * TILE_SIZE, HERO_SIZE, HERO_SIZE));
  if (y === 3) monsters.slice(0, 5).forEach((img, i) => sceneCtx.drawImage(img, (i * 2) * TILE_SIZE, y * TILE_SIZE));
  if (y === 4) CLASS_IDS.forEach((id, i) => sceneCtx.drawImage(heroSheet(id), 6 * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, (2 + i * 2) * TILE_SIZE, y * TILE_SIZE, HERO_SIZE, HERO_SIZE));
}
show(sceneRow, sceneCanvas, "corredor", 2);

const pack = section("Pack Dungeon Crawl (CC0)");
for (const key of [...Object.values(MONSTER_TEXTURE), ...Object.values(CHEST_TEXTURE), ...Object.values(PORTAL_TEXTURE)]) {
  show(pack, await loadImage(key), key, 2);
}
