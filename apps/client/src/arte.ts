// Galeria de desenvolvimento (arte.html): mostra a arte própria ampliada para conferir pixel a pixel.
import {
  CLASS_IDS, CLASSES, ITEMS, ITEM_FAMILIES, ITEM_SLOTS, ITEM_TIERS, SLOT_NAMES, TIER_NAMES, TILE_SIZE, itemId,
  type ClassId, type ItemTier,
} from "@kusa/shared";
import { itemIcon } from "./art/items.ts";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroPoses, heroSheet } from "./art/heroes.ts";
import { NO_OUTFIT, type Outfit } from "./art/outfit.ts";
import { makeCanvas } from "./art/pixels.ts";
import { ART_SCALE, HERO_SCALE, refineArt } from "./art/refine.ts";
import { RIM, WALL_RISE, WALL_VARIANTS, wallCap, wallFace } from "./art/walls.ts";
import { BLOOD_TEXTURE, CHEST_TEXTURE, FLOOR_TEXTURE, FX_ANIM, FX_TEXTURE, MONSTER_TEXTURE, PORTAL_TEXTURE, SWAMP_TEXTURE } from "./art/textures.ts";
import { biteStrip, leafCanvas, slashStrip, smashStrip } from "./art/effects.ts";
import { cryptFloorStrip, cryptTallStrip, cryptWallStrip, dustCanvas, lightCanvas, torchStrip } from "./art/cryptDecor.ts";
import { decorFloorStrip, decorTallStrip, decorWaterStrip, fireflyCanvas, mistCanvas, rippleStrip, shadeStrip } from "./art/swampDecor.ts";

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
      show(row, canvas, `${dirNames[dir]} ${f}`, ZOOM / ART_SCALE);
    }
  });
}

// Caminhada animada como no jogo (quadros 1, 0, 2, 0 a 8 por segundo), em cada direção.
const walkRow = section("Caminhada");
const WALK = [1, 0, 2, 0];
const walkers: { ctx: CanvasRenderingContext2D; sheet: HTMLCanvasElement; first: number; flip: boolean }[] = [];
for (const id of CLASS_IDS) {
  const sheet = heroSheet(id);
  for (const [dir, flip] of [["down", false], ["side", false], ["side", true], ["up", false]] as const) {
    const { canvas, ctx } = makeCanvas(HERO_SIZE, HERO_SIZE);
    walkers.push({ ctx, sheet, first: HERO_DIRS.indexOf(dir) * HERO_FRAMES, flip });
    show(walkRow, canvas, `${CLASSES[id].name} ${flip ? "direita" : dirNames[dir]}`, 3 / ART_SCALE);
  }
}
let walkStep = 0;
const drawWalk = () => {
  for (const w of walkers) {
    w.ctx.clearRect(0, 0, HERO_SIZE, HERO_SIZE);
    w.ctx.save();
    if (w.flip) w.ctx.setTransform(-1, 0, 0, 1, HERO_SIZE, 0);
    w.ctx.drawImage(w.sheet, (w.first + WALK[walkStep % WALK.length]) * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, 0, 0, HERO_SIZE, HERO_SIZE);
    w.ctx.restore();
  }
  walkStep++;
};
drawWalk();
setInterval(drawWalk, 125);

for (const family of Object.values(ITEM_FAMILIES)) {
  const row = section(`Itens: ${SLOT_NAMES[family.slot]} · ${family.name}`);
  for (const tier of ITEM_TIERS) {
    const id = itemId(family.slot, family.key, tier);
    show(row, itemIcon(id), ITEMS[id].name);
  }
  for (const rarity of ["rare", "magic"] as const) {
    const id = itemId(family.slot, family.key, 3, rarity);
    show(row, itemIcon(id), ITEMS[id].name);
  }
}

/** Conjunto completo de um nível com as famílias que a classe usa (a primeira de cada slot). */
const fullSet = (classId: ClassId, tier: ItemTier, pick = 0): Outfit => {
  const outfit = { ...NO_OUTFIT };
  for (const slot of ITEM_SLOTS) {
    const families = Object.values(ITEM_FAMILIES).filter((f) => f.slot === slot && (!f.classes || f.classes.includes(classId)));
    const family = families[Math.min(pick, families.length - 1)];
    outfit[slot] = itemId(slot, family.key, tier);
  }
  return outfit;
};
for (const id of CLASS_IDS) {
  const row = section(`Vestimenta: ${CLASSES[id].name}`);
  show(row, heroPoses(id, NO_OUTFIT), "sem equipamento", 3 / ART_SCALE);
  for (const tier of ITEM_TIERS) show(row, heroPoses(id, fullSet(id, tier)), TIER_NAMES[tier], 3 / ART_SCALE);
  show(row, heroPoses(id, fullSet(id, 4, 1)), "outra arma", 3 / ART_SCALE);
}
for (const slot of ITEM_SLOTS) {
  const row = section(`Vestido no cavaleiro: ${SLOT_NAMES[slot]}`);
  for (const tier of ITEM_TIERS) {
    const id = fullSet("knight", tier)[slot];
    show(row, heroPoses("knight", { ...NO_OUTFIT, [slot]: id }), ITEMS[id].name, 3 / ART_SCALE);
  }
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
/** Personagem do tamanho do jogo (heróis em `HERO_SCALE`, monstros no tile), com os pés na base do tile. */
const drawChar = (art: CanvasImageSource, sx: number, size: number, x: number, y: number, scale = 1) => {
  const side = TILE_SIZE * scale;
  sceneCtx.drawImage(art, sx, 0, size, size, x * TILE_SIZE - (side - TILE_SIZE) / 2, (y + 1) * TILE_SIZE - side, side, side);
};
const drawHero = (sheet: HTMLCanvasElement, frame: number, x: number, y: number) => drawChar(sheet, frame * HERO_SIZE, HERO_SIZE, x, y, HERO_SCALE);
const refinedMonsters = monsters.map((img) => refineArt(img));
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
  if (y === 1) CLASS_IDS.forEach((id, i) => drawHero(heroSheet(id), 0, 1 + i * 2, y));
  if (y === 3) refinedMonsters.slice(0, 5).forEach((art, i) => drawChar(art, 0, art.width, i * 2, y));
  if (y === 4) CLASS_IDS.forEach((id, i) => drawHero(heroSheet(id), 6, 2 + i * 2, y));
}
show(sceneRow, sceneCanvas, "corredor", 2);

const combat = section("Combate (arte própria)");
show(combat, slashStrip(), "corte");
show(combat, biteStrip(), "mordida");
show(combat, smashStrip(), "pancada");
show(combat, leafCanvas(), "folha");

// Detalhes do pântano: cada faixa sobre capim, para ver o contraste como no jogo.
const swamp = section("Pântano: detalhes (arte própria)");
const onGround = (source: HTMLCanvasElement, ground: string) => {
  const { canvas, ctx } = makeCanvas(source.width, source.height);
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);
  return canvas;
};
show(swamp, onGround(decorFloorStrip(), "#3f6a2a"), "chão", 3);
show(swamp, onGround(decorWaterStrip(), "#2f5a5a"), "água", 3);
show(swamp, onGround(decorTallStrip(), "#3f6a2a"), "altos", 3);
show(swamp, onGround(shadeStrip(), "#3f6a2a"), "sombras", 3);
show(swamp, onGround(rippleStrip(), "#2f5a5a"), "ondinha", 3);
show(swamp, onGround(fireflyCanvas(), "#0b140a"), "vaga-lume", 8);
show(swamp, onGround(mistCanvas(), "#3f6a2a"), "névoa", 3);

// Detalhes da cripta: chão sobre ladrilho escuro; paredes sobre a face de tijolos (linhas 16 a 31).
const crypt = section("Cripta: detalhes (arte própria)");
const onWallFaces = (source: HTMLCanvasElement) => {
  const { canvas, ctx } = makeCanvas(source.width, source.height);
  for (let x = 0; x < source.width; x += TILE_SIZE) {
    ctx.drawImage(wallCap(0, RIM.north), x, -WALL_RISE);
    ctx.drawImage(wallFace(x / TILE_SIZE % WALL_VARIANTS), x, TILE_SIZE - WALL_RISE);
  }
  ctx.drawImage(source, 0, 0);
  return canvas;
};
show(crypt, onGround(cryptFloorStrip(), "#5a4a38"), "chão", 3);
show(crypt, onWallFaces(cryptWallStrip()), "paredes", 3);
show(crypt, onWallFaces(torchStrip()), "tocha", 3);
show(crypt, onGround(cryptTallStrip(), "#5a4a38"), "móveis", 3);
show(crypt, onGround(lightCanvas(), "#3a2e22"), "luz", 2);
show(crypt, onGround(dustCanvas(), "#3a2e22"), "poeira", 8);

const pack = section("Pack Dungeon Crawl (CC0)");
const packKeys = [
  ...Object.values(MONSTER_TEXTURE), ...Object.values(CHEST_TEXTURE), ...Object.values(PORTAL_TEXTURE),
  ...Object.values(FX_TEXTURE).filter((k) => k !== FX_TEXTURE.leaf), FX_ANIM.fireBurst, ...Object.values(BLOOD_TEXTURE),
  ...Object.values(SWAMP_TEXTURE),
];
for (const key of packKeys) {
  show(pack, await loadImage(key), key, 2);
}

const refined = section("Monstros refinados (como no jogo)");
Object.keys(MONSTER_TEXTURE).forEach((kind, i) => show(refined, refinedMonsters[i], kind, 2));
