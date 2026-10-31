import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, type Dungeon } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { HD, TileAtlas, toCanvas } from "./art/paint.ts";
import { isWetland, type ForestVariant } from "./art/forestArt.ts";
import { LAYERS, planForest, standingSheets, type Standing } from "./forestPlan.ts";
import { ChunkCuller, type MapAmbience } from "./mapShared.ts";

/** Fundo além das bordas: o escuro do sub-bosque de cada variante. */
export const OLDWOOD_VOID = 0x1c2814;
export const HEARTWOOD_VOID = 0x0c1410;
export const MARSH_VOID = 0x141c0e;
export const SWAMP_VOID = 0x1c2311;

/** Arte de 128 px por tile, desenhada em ¼ (sempre a arte nova: estes mapas não têm a antiga). */
const ZOOM = HD / TILE_SIZE;
const ATLAS = "forest-atlas";

/**
 * Desenha o Bosque Velho e o Coração da Mata (o mesmo gerador, `generateForest`) e o Pântano do Kosaradius (a mesma mata,
 * alagada, `generateMarsh`; o plano em `forestPlan.ts`). Em tilemaps de 128 px (um atlas só,
 * com os quadros que o mapa usa): o capim, a terra das trilhas, o barro da margem, as folhas secas e a sombra perto da
 * mata, a mata fechada (copa de tufos pela distância até o chão aberto, com o sub-bosque e os troncos do lado sul), o
 * riacho ou as lagoas, as pontes, os troncos caídos ou os muros élficos e os enfeites rasteiros. Em sprites ordenados
 * pela linha de baixo: as árvores soltas (4 espécies por variante), as anciãs de 2×2, a árvore do coração, as pedras
 * e os menires da arena e os enfeites de pé. Tudo vem de `hash(x, y)`: todos veem o mesmo, e nada muda a jogabilidade.
 */
export function drawForest(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const { variant, atlas, layers, standing, extraSheets } = planForest(d);
  const W = d.width;
  const H = d.height;
  if (scene.textures.exists(ATLAS)) scene.textures.remove(ATLAS);
  scene.textures.addCanvas(ATLAS, atlas.build());
  (window as unknown as { forestFrames?: number }).forestFrames = atlas.count;
  const map = scene.make.tilemap({ width: W, height: H, tileWidth: HD, tileHeight: HD });
  const set = map.addTilesetImage(ATLAS, ATLAS, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)!;
  for (const name of LAYERS) {
    const l = map.createBlankLayer(name, set)!.setDepth(floorDepth).setScale(1 / ZOOM);
    const data = layers[name];
    // Sem tinta por tile: a variação grande já vem pintada no capim (a tinta deixava a grade aparecendo em quadrados).
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const f = data[y * W + x];
        if (f >= 0) l.putTileAt(f, x, y);
      }
  }

  // Folhas dos objetos de pé: só as que o mapa usa.
  const sheets = { ...standingSheets(variant), ...extraSheets };
  const used = new Map<Standing["sheet"], Set<number>>();
  for (const s of standing) { if (!used.has(s.sheet)) used.set(s.sheet, new Set()); used.get(s.sheet)!.add(s.frame); }
  const keyOf = (sheet: Standing["sheet"]) => `${variant}-${sheet}`;
  for (const [sheet, frames] of used) {
    const key = keyOf(sheet);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const spec = sheets[sheet];
    const { canvas, ctx } = makeCanvas(spec.w * spec.frames.length, spec.h);
    for (const i of frames) ctx.drawImage(toCanvas(spec.frames[i](), spec.w, spec.h), i * spec.w, 0);
    const texture = scene.textures.addCanvas(key, canvas)!;
    for (let i = 0; i < spec.frames.length; i++) texture.add(i, 0, i * spec.w, 0, spec.w, spec.h);
  }

  const culler = new ChunkCuller();
  const crowns: Phaser.GameObjects.Image[] = [];
  const glows: Phaser.GameObjects.Image[] = [];
  for (const s of standing) {
    const img = scene.add.image((s.x + s.span / 2) * TILE_SIZE, (s.y + 1) * TILE_SIZE - (s.lift ?? 2), keyOf(s.sheet), s.frame)
      .setOrigin(0.5, 1).setScale(s.scale / ZOOM).setDepth(s.floor ? floorDepth + 0.4 : s.depth).setFlipX(s.flip);
    culler.add(img, s.x, s.y);
    if (s.sheet === "crown" || s.sheet === "giantCrown" || s.sheet === "heartCrown") {
      img.setData("phase", hash(s.x, s.y, 106) * Math.PI * 2).setData("x0", img.x).setData("w", sheets[s.sheet].w);
      crowns.push(img);
    }
    if (s.sheet === "stoneGlow" || s.sheet === "heartGlow") {
      img.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setData("phase", hash(s.x, s.y, 107) * Math.PI * 2);
      glows.push(img);
    }
  }
  return createAmbience(scene, d, uiDepth, culler, crowns, glows, variant);
}

const MOTE = "forest-mote";
const LEAF = "forest-leaf";
const SHAFT = "forest-shaft";
const MIST = "forest-mist";
/** Faixas de névoa do pântano na tela ao mesmo tempo. */
const MIST_COUNT = 9;

/** Texturas do ambiente (cisco de luz, folha caindo, facho de sol). */
function createAmbienceArt(scene: Phaser.Scene, variant: ForestVariant) {
  const add = (key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const { canvas, ctx } = makeCanvas(w, h);
    paint(ctx);
    scene.textures.addCanvas(key, canvas);
  };
  const heart = variant === "heartwood";
  const marsh = isWetland(variant);
  add(MOTE, 3, 3, (ctx) => {
    ctx.fillStyle = heart ? "#9affea" : marsh ? "#e4ff6a" : "#fff4c2";
    ctx.fillRect(1, 0, 1, 3);
    ctx.fillRect(0, 1, 3, 1);
  });
  add(LEAF, 6, 4, (ctx) => {
    ctx.fillStyle = heart ? "#4a8a74" : marsh ? "#8a8a42" : "#c89a3a";
    ctx.fillRect(1, 1, 4, 2);
    ctx.fillRect(0, 2, 1, 1);
    ctx.fillStyle = heart ? "#2a5a4a" : marsh ? "#5a5a2a" : "#8a5a24";
    ctx.fillRect(2, 2, 3, 1);
  });
  // Névoa do pântano: mancha larga e baixa, pintada em pixel fino (desenhada em ¼, como o cenário) com a transparência
  // em 3 degraus de borda irregular, sem degradê e sem pontilhado (que vira uma trama na tela toda).
  if (marsh)
    add(MIST, 512, 200, (ctx) => {
      for (let y = 0; y < 200; y++)
        for (let x = 0; x < 512; x++) {
          const u = (x - 256) / 256, w = (y - 100) / 100, a0 = Math.atan2(w, u);
          const d = Math.hypot(u, w) / (0.86 + 0.08 * Math.sin(a0 * 5 + 1) + 0.05 * Math.sin(a0 * 11 + 2));
          if (d >= 1) continue;
          const v = (1 - d) * 3;
          const a = v > 2 ? 0.2 : v > 1 ? 0.12 : v > 0.3 ? 0.05 : 0;
          if (!a) continue;
          ctx.fillStyle = `rgba(214, 232, 206, ${a})`;
          ctx.fillRect(x, y, 1, 1);
        }
    });
  add(SHAFT, 48, 160, (ctx) => {
    // Facho de sol inclinado (do noroeste), em faixas de transparência sem suavização.
    for (let y = 0; y < 160; y++)
      for (let x = 0; x < 48; x++) {
        const u = (x - 24 + (y - 80) * 0.35) / 14;
        const a = Math.max(0, 1 - u * u) * Math.sin((y / 160) * Math.PI);
        const band = a > 0.66 ? 0.16 : a > 0.3 ? 0.09 : a > 0.08 ? 0.04 : 0;
        if (!band) continue;
        ctx.fillStyle = heart ? `rgba(150, 255, 230, ${band})` : `rgba(255, 240, 180, ${band})`;
        ctx.fillRect(x, y, 1, 1);
      }
  });
}

/** Intervalo entre folhas caindo e entre fachos de sol novos (ms). */
const LEAF_EVERY_MS = 700;
const SHAFT_EVERY_MS = 1600;

/**
 * Ambiente: ciscos de luz flutuando (no Coração da Mata, vaga-lumes frios que piscam; no pântano, vaga-lumes
 * amarelos), folhas caindo da beira da mata, fachos de sol nas clareiras (o pântano é fechado demais e não tem), as
 * copas balançando (a de cima do jogador fica transparente) e o brilho dos menires e do coração da árvore pulsando.
 */
function createAmbience(
  scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller,
  crowns: Phaser.GameObjects.Image[], glows: Phaser.GameObjects.Image[], variant: ForestVariant,
): MapAmbience {
  createAmbienceArt(scene, variant);
  const heart = variant === "heartwood";
  // Vaga-lume pisca: o Coração da Mata e o pântano.
  const blink = heart || isWetland(variant);
  const cam = scene.cameras.main;
  const motes = scene.add.particles(0, 0, MOTE, {
    lifespan: { min: 2600, max: 4200 },
    speedY: { min: -10, max: 6 },
    speedX: { min: -8, max: 10 },
    alpha: blink ? { values: [0, 1, 0.2, 1, 0], interpolation: "linear" } : { values: [0, 0.8, 0.5, 0], interpolation: "linear" },
    scale: { min: 0.4, max: 0.8 },
    blendMode: Phaser.BlendModes.ADD,
    frequency: blink ? 140 : 180,
    quantity: 1,
    maxAliveParticles: blink ? 30 : 22,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const zone = (motes.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;

  // Névoa (pântano): espalhada na primeira vez; depois anda devagar para a direita e reaparece do outro lado da tela.
  const mists = isWetland(variant)
    ? Array.from({ length: MIST_COUNT }, (_, i) => scene.add.image(0, 0, MIST)
      .setScale((2.2 + hash(i, 51) * 1.8) / ZOOM).setAlpha(0.5 + hash(i, 52) * 0.5).setDepth(uiDepth - 5).setData("speed", 3 + hash(i, 53) * 5))
    : [];
  let mistPlaced = false;

  const visible = new Set<Phaser.GameObjects.GameObject>();
  let nextLeaf = 0;
  let nextShaft = 0;
  const wood = (x: number, y: number) => tileAt(d, x, y) === Tile.Wall;
  const open = (x: number, y: number) => tileAt(d, x, y) === Tile.Floor;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      zone.setTo(v.x, v.y, v.width, v.height);
      const dt = scene.game.loop.delta / 1000;
      mists.forEach((m, i) => {
        if (!mistPlaced) m.setPosition(v.x + hash(i, 54) * v.width, v.y + hash(i, 55) * v.height);
        m.x += m.getData("speed") * dt;
        const mx = m.displayWidth / 2, my = m.displayHeight / 2;
        if (m.x - mx > v.right) m.x = v.x - mx;
        else if (m.x + mx < v.x) m.x = v.right + mx;
        if (m.y - my > v.bottom) m.y = v.y - my;
        else if (m.y + my < v.y) m.y = v.bottom + my;
      });
      mistPlaced = true;

      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const mx = v.centerX;
      const my = v.centerY;
      for (const crown of crowns) {
        if (!visible.has(crown)) continue;
        // Balanço sem girar: a copa anda meio pixel de lado.
        crown.x = crown.getData("x0") + Math.round(Math.sin(time / 1500 + crown.getData("phase")) * 1.5) * 0.5;
        const half = (crown.getData("w") as number) * 0.36 * crown.scaleX;
        const over = Math.abs(mx - crown.x) < half && my < crown.y - TILE_SIZE * 0.6 && my > crown.y - crown.displayHeight * 0.95;
        crown.setAlpha(over ? 0.42 : 1);
      }
      for (const glow of glows) {
        if (!visible.has(glow)) continue;
        glow.setAlpha(0.25 + 0.75 * Math.max(0, Math.sin(time / 1700 + glow.getData("phase"))) ** 2);
      }

      // Folha caindo da beira da mata à vista.
      if (time >= nextLeaf) {
        nextLeaf = time + LEAF_EVERY_MS;
        const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
        const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
        if (wood(x, y) && open(x, y + 1)) {
          const leaf = scene.add.image(x * TILE_SIZE + Math.random() * 32, (y + 0.6) * TILE_SIZE, LEAF).setDepth(uiDepth - 5).setScale(0.6).setAlpha(0.9);
          scene.tweens.add({
            targets: leaf, y: leaf.y + 40 + Math.random() * 30, x: leaf.x + (Math.random() - 0.3) * 30, angle: 200 + Math.random() * 200,
            alpha: { from: 0.9, to: 0 }, duration: 2600, ease: "Sine.easeIn", onComplete: () => leaf.destroy(),
          });
        }
      }
      // Facho de sol numa clareira (chão aberto em volta).
      if (time >= nextShaft && !isWetland(variant)) {
        nextShaft = time + SHAFT_EVERY_MS;
        const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE);
        const y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
        let clear = true;
        for (let dy = -1; dy <= 1 && clear; dy++) for (let dx = -1; dx <= 1 && clear; dx++) if (!open(x + dx, y + dy)) clear = false;
        if (clear) {
          const shaft = scene.add.image(x * TILE_SIZE + 16, y * TILE_SIZE, SHAFT).setDepth(uiDepth - 6).setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0).setScale(0.75);
          scene.tweens.add({ targets: shaft, alpha: { from: 0, to: 1 }, duration: 2200, yoyo: true, hold: 1800, ease: "Sine.easeInOut", onComplete: () => shaft.destroy() });
        }
      }
    },
  };
}
