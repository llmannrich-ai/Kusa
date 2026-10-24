// Galeria de desenvolvimento (arte.html): mostra a arte própria ampliada para conferir pixel a pixel.
import {
  CLASS_IDS, CLASSES, ITEMS, MONSTERS, ITEM_FAMILIES, ITEM_SLOTS, ITEM_TIERS, RUNES, RUNE_IDS, SLOT_NAMES, TIER_NAMES, TILE_SIZE, itemId,
  type ClassId, type ItemSlot, type ItemTier,
} from "@kusa/shared";
import { itemIcon } from "./art/items.ts";
import { HERO_DIRS, HERO_FRAMES, HERO_SIZE, heroPoses, heroSheet } from "./art/heroes.ts";
import { NO_OUTFIT, type Outfit } from "./art/outfit.ts";
import { makeCanvas } from "./art/pixels.ts";
import { ART_SCALE, HERO_SCALE, refineArt } from "./art/refine.ts";
import { RIM, WALL_RISE, WALL_VARIANTS, wallCap, wallFace } from "./art/walls.ts";
import { BLOOD_TEXTURE, CHEST_TEXTURE, FLOOR_TEXTURE, FX_ANIM, FX_TEXTURE, PORTAL_TEXTURE, SWAMP_TEXTURE } from "./art/textures.ts";
import { BESTIARY_ART, MONSTER_ANIMS, OWN_MONSTER_ART, OWN_MONSTER_DRAW, monsterTextures } from "./art/bestiary.ts";
import { biteStrip, leafCanvas, slashStrip, smashStrip } from "./art/effects.ts";
import { cryptFloorStrip, cryptTallStrip, cryptWallStrip, dustCanvas, lightCanvas, torchStrip } from "./art/cryptDecor.ts";
import { KNIGHT_COSMETICS, PROTO_CLASSES, PROTO_FEET, PROTO_FRAMES, PROTO_AXES, PROTO_BOWS, PROTO_ITEM_NAMES, PROTO_MAGIC_BOWS, PROTO_MAGIC_STAFFS, PROTO_MAGIC_WANDS, PROTO_ARC_HATS, PROTO_MAGIC_ARC_HATS, PROTO_ROBES, PROTO_MAGIC_ROBES, PROTO_PANTS, PROTO_MAGIC_PANTS, PROTO_MAGIC_XBOWS, PROTO_STAFFS, PROTO_WANDS, PROTO_XBOWS, PROTO_MAGIC_ARMORS, PROTO_MAGIC_AXES, PROTO_MAGIC_HELMETS, PROTO_MAGIC_SWORDS, PROTO_SIZE, PROTO_SWORDS, PROTO_WAR_ARMORS, PROTO_WAR_HELMETS, PROTO_TILE, protoFrame, type ProtoClass, type ProtoDir, type ProtoGear } from "./art/proto/tibiaHero.ts";
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

// --- Provador: qualquer classe com qualquer item em cada slot, andando, ampliado e no tamanho do celular.
const WALK = [1, 0, 2, 0];
{
  const row = section("Provador");
  const form = document.createElement("div");
  form.className = "provador";
  const select = (label: string, options: [string, string][]) => {
    const wrap = document.createElement("label");
    wrap.textContent = `${label} `;
    const el = document.createElement("select");
    for (const [value, text] of options) el.append(new Option(text, value));
    wrap.append(el);
    form.append(wrap);
    return el;
  };
  const classSel = select("Classe", CLASS_IDS.map((id) => [id, CLASSES[id].name]));
  const RARITY_TAG = { common: "", rare: " (raro)", magic: " ✦" };
  const slotSel = Object.fromEntries(ITEM_SLOTS.map((slot) => [slot, select(SLOT_NAMES[slot], [
    ["", "—"],
    ...Object.values(ITEMS)
      .filter((item) => item.slot === slot)
      .map((item) => [item.id, `${TIER_NAMES[item.tier]} · ${item.name}${RARITY_TAG[item.rarity]}`] as [string, string]),
  ])])) as Record<ItemSlot, HTMLSelectElement>;
  const views = document.createElement("div");
  views.className = "row";
  row.append(form, views);
  // Tamanho no celular em retrato: 9 tiles na largura de ~412 px, herói com `HERO_SCALE` tiles.
  const PHONE = (412 / 9) * HERO_SCALE;
  const stage = [["down", false, 3], ["side", false, 3], ["side", true, 3], ["up", false, 3], ["down", false, 0], ["side", false, 0]] as const;
  const canvases = stage.map(([dir, flip, zoom]) => {
    const { canvas, ctx } = makeCanvas(HERO_SIZE, HERO_SIZE);
    show(views, canvas, zoom ? `${flip ? "direita" : dirNames[dir]}` : `${dirNames[dir]}, tamanho real`, zoom ? zoom / ART_SCALE : PHONE / HERO_SIZE);
    return { ctx, dir, flip };
  });
  let sheet = heroSheet("knight");
  const rebuild = () => {
    const outfit = Object.fromEntries(ITEM_SLOTS.map((slot) => [slot, slotSel[slot].value])) as Outfit;
    sheet = heroSheet(classSel.value as ClassId, outfit);
  };
  for (const el of [classSel, ...Object.values(slotSel)]) el.addEventListener("change", rebuild);
  let step = 0;
  setInterval(() => {
    for (const v of canvases) {
      v.ctx.clearRect(0, 0, HERO_SIZE, HERO_SIZE);
      v.ctx.save();
      if (v.flip) v.ctx.setTransform(-1, 0, 0, 1, HERO_SIZE, 0);
      const frame = HERO_DIRS.indexOf(v.dir) * HERO_FRAMES + WALK[step % WALK.length];
      v.ctx.drawImage(sheet, frame * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, 0, 0, HERO_SIZE, HERO_SIZE);
      v.ctx.restore();
    }
    step++;
  }, 125);
}

// --- Protótipo da Fase 0 de docs/ARTE_TIBIA.md: corpo base e as 4 classes, ao lado da arte atual.
// Mesma escala de jogo nos dois: o atual tem 96 px de textura para 1,38 tile; o protótipo, `PROTO_TILE` px por tile.
const PHONE_TILE = 412 / 9;
const PROTO_DIRS_ALL: ProtoDir[] = ["down", "side", "up"];
const PROTO_NAMES: Record<ProtoClass, string> = { base: "Corpo base", knight: "Cavaleiro", paladin: "Paladino", sorcerer: "Feiticeiro", druid: "Druida" };
const protoSceneRow = (() => {
  const zoomTile = PROTO_TILE;
  const oldZoom = (zoomTile * HERO_SCALE) / HERO_SIZE;
  const newZoom = zoomTile / PROTO_TILE;
  const oldFrame = (cls: ClassId, dir: "down" | "side" | "up", f: number) => {
    const { canvas, ctx } = makeCanvas(HERO_SIZE, HERO_SIZE);
    ctx.drawImage(heroSheet(cls), (HERO_DIRS.indexOf(dir) * HERO_FRAMES + f) * HERO_SIZE, 0, HERO_SIZE, HERO_SIZE, 0, 0, HERO_SIZE, HERO_SIZE);
    return canvas;
  };
  const classes = section("Protótipo padrão Tibia (Fase 0): corpo base (só de tanga) e as 4 classes vestidas sobre ele");
  for (const cls of PROTO_CLASSES) show(classes, protoFrame("down", 0, cls), PROTO_NAMES[cls], newZoom);
  for (const dir of ["side", "up"] as const) {
    const row = section(`Protótipo: ${dirNames[dir]}`);
    for (const cls of PROTO_CLASSES) show(row, protoFrame(dir, 0, cls), `${PROTO_NAMES[cls]} · ${dirNames[dir]}`, newZoom);
  }

  const compare = section("Protótipo: atual × novo, na mesma escala do jogo");
  for (const cls of CLASS_IDS) {
    show(compare, oldFrame(cls, "down", 0), `atual · ${PROTO_NAMES[cls]}`, oldZoom);
    show(compare, protoFrame("down", 0, cls), `novo · ${PROTO_NAMES[cls]}`, newZoom);
  }

  const walk = section("Protótipo: andando (ampliado e no tamanho do celular em retrato)");
  const walkers: { ctx: CanvasRenderingContext2D; cls: ProtoClass; dir: ProtoDir; flip: boolean }[] = [];
  const realNew = PHONE_TILE / PROTO_TILE;
  for (const [zoom, label] of [[newZoom, ""], [realNew, ", tamanho real"]] as const) {
    for (const cls of PROTO_CLASSES) {
      for (const [dir, flip] of [["down", false], ["side", false], ["side", true], ["up", false]] as const) {
        const neo = makeCanvas(PROTO_SIZE, PROTO_SIZE);
        show(walk, neo.canvas, `${PROTO_NAMES[cls]} · ${flip ? "direita" : dirNames[dir]}${label}`, zoom);
        walkers.push({ ctx: neo.ctx, cls, dir, flip });
      }
    }
  }
  const sheets = new Map(PROTO_CLASSES.flatMap((cls) => PROTO_DIRS_ALL.flatMap((dir) =>
    [...Array(PROTO_FRAMES).keys()].map((f) => [`${cls}${dir}${f}`, protoFrame(dir, f, cls)] as const))));
  let step = 0;
  const tick = () => {
    for (const w of walkers) {
      w.ctx.clearRect(0, 0, PROTO_SIZE, PROTO_SIZE);
      w.ctx.save();
      if (w.flip) w.ctx.setTransform(-1, 0, 0, 1, PROTO_SIZE, 0);
      w.ctx.drawImage(sheets.get(`${w.cls}${w.dir}${step % PROTO_FRAMES}`)!, 0, 0);
      w.ctx.restore();
    }
    step++;
  };
  tick();
  setInterval(tick, 150);

  // Itens no padrão novo (docs/ARTE_ITENS.md): o mesmo desenho em classes diferentes, nas 3 direções.
  const gearRow = (title: string, sets: [ProtoClass, ProtoGear][]) => {
    const row = section(title);
    for (const [cls, gear] of sets) {
      const names = [gear.helmet, gear.armor, gear.legs, gear.weapon].flatMap((id) => (id ? [PROTO_ITEM_NAMES[id]] : [])).join(" + ");
      for (const dir of PROTO_DIRS_ALL) show(row, protoFrame(dir, 0, cls, undefined, gear), `${PROTO_NAMES[cls]} · ${names} · ${dirNames[dir]}`, newZoom);
    }
  };
  gearRow("Itens · lote 1: espadas", PROTO_SWORDS.map((weapon) => ["knight", { weapon }]));
  gearRow("Itens · lote 1: elmos de guerra", PROTO_WAR_HELMETS.flatMap((helmet, i) => [[i % 2 ? "paladin" : "knight", { helmet }]] as [ProtoClass, ProtoGear][]));
  gearRow("Itens · lote 1: armaduras de guerra", PROTO_WAR_ARMORS.flatMap((armor, i) => [[i % 2 ? "paladin" : "knight", { armor }]] as [ProtoClass, ProtoGear][]));
  gearRow("Itens · lote 1: conjunto de cada nível (elmo, armadura e espada)", [1, 2, 3, 4, 5].map((t) => ["knight", { helmet: PROTO_WAR_HELMETS[t - 1], armor: PROTO_WAR_ARMORS[t - 1], weapon: PROTO_SWORDS[t - 1] }]));
  gearRow("Itens · lote 2: espadas mágicas", PROTO_MAGIC_SWORDS.map((weapon) => ["knight", { weapon }]));
  gearRow("Itens · lote 2: elmos mágicos", PROTO_MAGIC_HELMETS.map((helmet, i) => [i % 2 ? "paladin" : "knight", { helmet }]));
  gearRow("Itens · lote 2: armaduras mágicas", PROTO_MAGIC_ARMORS.map((armor, i) => [i % 2 ? "paladin" : "knight", { armor }]));
  gearRow("Itens · lote 2: conjunto mágico de cada nível", [0, 1, 2, 3, 4].map((i) => [i % 2 ? "paladin" : "knight", { helmet: PROTO_MAGIC_HELMETS[i], armor: PROTO_MAGIC_ARMORS[i], weapon: PROTO_MAGIC_SWORDS[i] }]));
  gearRow("Itens · lote 3: machados", PROTO_AXES.map((weapon) => ["knight", { weapon }]));
  gearRow("Itens · lote 3: machados mágicos", PROTO_MAGIC_AXES.map((weapon) => ["knight", { weapon }]));
  gearRow("Itens · lote 4: arcos", PROTO_BOWS.map((weapon) => ["paladin", { weapon }]));
  gearRow("Itens · lote 4: arcos mágicos", PROTO_MAGIC_BOWS.map((weapon) => ["paladin", { weapon }]));
  gearRow("Itens · lote 4: bestas", PROTO_XBOWS.map((weapon) => ["paladin", { weapon }]));
  gearRow("Itens · lote 4: bestas mágicas", PROTO_MAGIC_XBOWS.map((weapon) => ["paladin", { weapon }]));
  const caster = (i: number): ProtoClass => (i % 2 ? "druid" : "sorcerer");
  gearRow("Itens · lote 5: varinhas", PROTO_WANDS.map((weapon, i) => [caster(i), { weapon }]));
  gearRow("Itens · lote 5: varinhas mágicas", PROTO_MAGIC_WANDS.map((weapon, i) => [caster(i), { weapon }]));
  gearRow("Itens · lote 5: cajados", PROTO_STAFFS.map((weapon, i) => [caster(i), { weapon }]));
  gearRow("Itens · lote 5: cajados mágicos", PROTO_MAGIC_STAFFS.map((weapon, i) => [caster(i), { weapon }]));
  gearRow("Itens · lote 6: chapéus arcanos", PROTO_ARC_HATS.map((helmet, i) => [caster(i), { helmet }]));
  gearRow("Itens · lote 6: chapéus arcanos mágicos", PROTO_MAGIC_ARC_HATS.map((helmet, i) => [caster(i), { helmet }]));
  gearRow("Itens · lote 6: mantos arcanos", PROTO_ROBES.map((armor, i) => [caster(i), { armor }]));
  gearRow("Itens · lote 6: mantos arcanos mágicos", PROTO_MAGIC_ROBES.map((armor, i) => [caster(i), { armor }]));
  gearRow("Itens · lote 6: calças arcanas (no corpo base)", PROTO_PANTS.map((legs) => ["base", { legs }]));
  gearRow("Itens · lote 6: calças arcanas mágicas (no corpo base)", PROTO_MAGIC_PANTS.map((legs) => ["base", { legs }]));
  gearRow("Itens · lote 6: conjunto de cada nível (chapéu, manto e cajado)", [0, 1, 2, 3, 4].map((i) => [caster(i), { helmet: PROTO_ARC_HATS[i], armor: PROTO_ROBES[i], weapon: PROTO_STAFFS[i] }]));
  gearRow("Itens · lote 6: conjunto mágico de cada nível", [0, 1, 2, 3, 4].map((i) => [caster(i), { helmet: PROTO_MAGIC_ARC_HATS[i], armor: PROTO_MAGIC_ROBES[i], weapon: PROTO_MAGIC_STAFFS[i] }]));
  gearRow("Itens · piloto: Capuz do Lobo e Elmo do Demônio", [["druid", { helmet: "wolf" }], ["sorcerer", { helmet: "wolf" }], ["knight", { helmet: "demon", weapon: "sword-5" }], ["paladin", { helmet: "demon" }]]);

  const cosmetics = section("Protótipo: zonas de cor (cabeça, primária, secundária, detalhe), como um cosmético trocaria");
  show(cosmetics, protoFrame("down", 0, "knight"), "cavaleiro", newZoom);
  for (const [name, look] of Object.entries(KNIGHT_COSMETICS)) show(cosmetics, protoFrame("down", 0, "knight", look), name, newZoom);

  return section("Protótipo: no chão com os monstros (atual à esquerda, novo à direita)");
})();

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

const runeRow = section("Runas (caem dos bosses)");
for (const id of RUNE_IDS) show(runeRow, itemIcon(id), RUNES[id].name);

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
/** O mesmo conjunto com todos os itens numa raridade. */
const withRarity = (outfit: Outfit, rarity: "rare" | "magic"): Outfit =>
  Object.fromEntries(ITEM_SLOTS.map((slot) => [slot, outfit[slot].replace(/-common$/, `-${rarity}`)])) as Outfit;
for (const id of CLASS_IDS) {
  const row = section(`Vestimenta: ${CLASSES[id].name}`);
  show(row, heroPoses(id, NO_OUTFIT), "sem equipamento", 3 / ART_SCALE);
  for (const tier of ITEM_TIERS) show(row, heroPoses(id, fullSet(id, tier)), TIER_NAMES[tier], 3 / ART_SCALE);
  show(row, heroPoses(id, fullSet(id, 4, 1)), "outra arma", 3 / ART_SCALE);
  const magic = section(`Itens mágicos: ${CLASSES[id].name}`);
  for (const tier of ITEM_TIERS) {
    for (const pick of [0, 1]) show(magic, heroPoses(id, withRarity(fullSet(id, tier, pick), "magic"), ["down"]), `${TIER_NAMES[tier]} ${pick ? "(outra arma)" : ""}`, 3 / ART_SCALE);
  }
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
  // Arte própria de monstro não tem PNG: entra o desenho direto.
  ...monsterTextures().map((key): Promise<HTMLCanvasElement | HTMLImageElement> =>
    key in OWN_MONSTER_DRAW ? Promise.resolve(OWN_MONSTER_DRAW[key]()) : loadImage(key)),
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

// Cena do protótipo em `PROTO_TILE` px por tile: o chão e os monstros (32 px por tile) entram ampliados.
{
  const T = PROTO_TILE, SW = 9, SH = 3;
  const { canvas, ctx } = makeCanvas(SW * T, SH * T);
  canvas.className = "scene";
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) ctx.drawImage(floor, ((x * 7 + y * 3) % 9) * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, x * T, y * T, T, T);
  }
  const side = T * HERO_SCALE;
  refinedMonsters.slice(0, 4).forEach((art, i) => ctx.drawImage(art, 0, 0, art.width, art.height, (i * 2 + 1) * T, 0, T, T));
  // Atual (esquerda) e novo (direita), as 4 classes, pés na base do tile.
  CLASS_IDS.forEach((cls, i) => {
    ctx.drawImage(heroSheet(cls), 0, 0, HERO_SIZE, HERO_SIZE, (i * 0.9 + 0.2) * T - (side - T) / 2, 2 * T - side, side, side);
    ctx.drawImage(protoFrame(i % 2 ? "side" : "down", 0, cls), (i + 4.8) * T - (PROTO_SIZE - T) / 2, 2 * T - PROTO_FEET);
  });
  show(protoSceneRow, canvas, "mesmo chão, mesma escala", 1);
}

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
  ...monsterTextures().filter((key) => !OWN_MONSTER_ART.includes(key)), ...Object.values(CHEST_TEXTURE), ...Object.values(PORTAL_TEXTURE),
  ...Object.values(FX_TEXTURE).filter((k) => k !== FX_TEXTURE.leaf), FX_ANIM.fireBurst, ...Object.values(BLOOD_TEXTURE),
  ...Object.values(SWAMP_TEXTURE),
];
for (const key of packKeys) {
  show(pack, await loadImage(key), key, 2);
}

// Monstros animados (Pântano): a folha inteira refinada, quadro a quadro (parado, andando, golpe, especial).
const animated = section("Monstros animados (folhas: parado, andando, golpe, especial)");
for (const [key, anim] of Object.entries(MONSTER_ANIMS)) {
  const sheet = anim.sheet();
  const n = sheet.width / anim.size;
  const { canvas, ctx } = makeCanvas(anim.size * 2 * n, anim.size * 2);
  for (let i = 0; i < n; i++) {
    const frame = makeCanvas(anim.size, anim.size);
    frame.ctx.drawImage(sheet, i * anim.size, 0, anim.size, anim.size, 0, 0, anim.size, anim.size);
    ctx.drawImage(refineArt(frame.canvas, { outline: anim.outline }), i * anim.size * 2, 0);
  }
  show(animated, canvas, key, 1);
}

const refined = section("Monstros refinados (como no jogo)");
monsterTextures().forEach((key, i) => show(refined, refinedMonsters[i], key, 2));

// Bestiário: cada monstro com nome, mapa e papel, no tamanho do jogo (1×) e ampliado, para conferir silhueta e cor.
const bestiary = section("Bestiário");
const cloneCanvas = (source: HTMLCanvasElement) => {
  const { canvas, ctx } = makeCanvas(source.width, source.height);
  ctx.drawImage(source, 0, 0);
  return canvas;
};
const textureIndex = new Map(monsterTextures().map((key, i) => [key, i]));
for (const def of Object.values(MONSTERS)) {
  const art = refinedMonsters[textureIndex.get(BESTIARY_ART[def.kind].texture)!];
  show(bestiary, cloneCanvas(art), `${def.name} · ${def.rank} · ND ${def.cr}`, 1);
  show(bestiary, cloneCanvas(art), def.lore.slice(0, 40) + "…", 2);
}
