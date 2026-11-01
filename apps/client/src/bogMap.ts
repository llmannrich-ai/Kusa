import * as Phaser from "phaser";
import { TILE_SIZE, Tile, tileAt, type Dungeon } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { HD, TileAtlas, toCanvas } from "./art/paint.ts";
import { FLAME, flameFrame } from "./art/bogArt.ts";
import { BOG_LAYERS, LAYER_ATLAS, SHEETS, planBog, type Sheet } from "./bogPlan.ts";
import { GLOW, createGlowArt } from "./gatesMap.ts";
import { ChunkCuller, focusTile, type MapAmbience } from "./mapShared.ts";

/** Fundo além das bordas: o escuro da mata morta. */
export const BOG_VOID = 0x1a1d1d;

const ZOOM = HD / TILE_SIZE;
const ATLAS = "bog-atlas";

/**
 * Desenha o Charco Cinzento (`generateBog`): o chão em tilemaps de 128 px desenhados em ¼ (a turfa, as poças negras e a
 * mata morta, a lama das trilhas, a estrada afundada e a ilha da arena, as passarelas e os enfeites deitados) e, de pé,
 * ordenados pela linha de baixo, as árvores secas, os monólitos com a runa, as palafitas, a paliçada dos terreiros, os
 * braseiros e os enfeites. O ambiente: névoa baixa andando, cinza caindo, fogos-fátuos sobre a água, as chamas e as
 * runas respirando.
 */
export function drawBog(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const { atlases, layers, standing } = planBog(d);
  const W = d.width, H = d.height;
  const sets = atlases.map((atlas, k) => {
    const key = `${ATLAS}-${k}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, atlas.build());
    const map = scene.make.tilemap({ width: W, height: H, tileWidth: HD, tileHeight: HD });
    return { map, set: map.addTilesetImage(key, key, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)! };
  });
  (window as unknown as { bogFrames?: number[] }).bogFrames = atlases.map((a) => a.count);
  for (const name of BOG_LAYERS) {
    const { map, set } = sets[LAYER_ATLAS[name]];
    const l = map.createBlankLayer(name, set)!.setDepth(floorDepth).setScale(1 / ZOOM);
    const data = layers[name];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const f = data[y * W + x]; if (f >= 0) l.putTileAt(f, x, y); }
  }

  const used = new Map<Sheet, Set<number>>();
  for (const s of standing) { if (!used.has(s.sheet)) used.set(s.sheet, new Set()); used.get(s.sheet)!.add(s.frame); }
  for (const [sheet, frames] of used) {
    const key = `bog-${sheet}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const spec = SHEETS[sheet];
    const { canvas, ctx } = makeCanvas(spec.w * spec.frames.length, spec.h);
    for (const i of frames) ctx.drawImage(toCanvas(spec.frames[i](), spec.w, spec.h), i * spec.w, 0);
    const texture = scene.textures.addCanvas(key, canvas)!;
    for (let i = 0; i < spec.frames.length; i++) texture.add(i, 0, i * spec.w, 0, spec.w, spec.h);
  }
  const flameKey = "bog-flame";
  if (scene.textures.exists(flameKey)) scene.textures.remove(flameKey);
  {
    const { canvas, ctx } = makeCanvas(FLAME.w * 4, FLAME.h);
    for (let k = 0; k < 4; k++) ctx.drawImage(toCanvas(flameFrame(k), FLAME.w, FLAME.h), k * FLAME.w, 0);
    const texture = scene.textures.addCanvas(flameKey, canvas)!;
    for (let k = 0; k < 4; k++) texture.add(k, 0, k * FLAME.w, 0, FLAME.w, FLAME.h);
  }
  createGlowArt(scene);

  const culler = new ChunkCuller();
  const trees: Phaser.GameObjects.Image[] = [];
  const pulses: Phaser.GameObjects.Image[] = [];
  const flames: Phaser.GameObjects.Image[] = [];
  const lights: Phaser.GameObjects.Image[] = [];
  for (const s of standing) {
    const px = (s.x + s.span / 2) * TILE_SIZE, py = (s.y + 1) * TILE_SIZE - (s.lift ?? 2);
    const img = scene.add.image(px, py, `bog-${s.sheet}`, s.frame).setOrigin(0.5, 1).setScale(1 / ZOOM)
      .setDepth(s.floor ? floorDepth + 0.4 : s.depth).setFlipX(s.flip);
    culler.add(img, s.x, s.y);
    if (s.sheet === "tree" || s.sheet === "hut") { img.setData("w", SHEETS[s.sheet].w); trees.push(img); }
    if (s.sheet === "stoneGlow" || s.sheet === "sigilGlow") {
      img.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setData("phase", hash(s.x, s.y, 21) * Math.PI * 2);
      pulses.push(img);
    }
    if (s.sheet === "brazier") {
      const f = culler.add(scene.add.image(px, py - 86 / ZOOM, flameKey, 0).setOrigin(0.5, 1).setScale(1.1 / ZOOM).setDepth(s.depth + 0.1)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", hash(s.x, s.y, 22) * 10), s.x, s.y);
      flames.push(f);
      const l = culler.add(scene.add.image(px, py - 26, GLOW).setScale(1.4).setTint(0xd0b060).setAlpha(0.3).setDepth(uiDepth - 6)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", hash(s.x, s.y, 23) * 10), s.x, s.y);
      lights.push(l);
    }
    if (s.sheet === "tree" && s.frame === 4) {
      const l = culler.add(scene.add.image(px + (s.flip ? 1 : -1) * 4, py - 52, GLOW).setScale(0.8).setTint(0x8ef0d8).setAlpha(0.4).setDepth(uiDepth - 6)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", hash(s.x, s.y, 24) * 10), s.x, s.y);
      lights.push(l);
    }
  }
  return createAmbience(scene, d, uiDepth, culler, { trees, pulses, flames, lights });
}

const MIST = "bog-mist";
const ASH = "bog-ash";
const WISP = "bog-wisp";
const MIST_COUNT = 10;

function createAmbienceArt(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const { canvas, ctx } = makeCanvas(w, h);
    paint(ctx);
    scene.textures.addCanvas(key, canvas);
  };
  // Névoa baixa: mancha larga em 3 degraus de transparência, de beira irregular, sem degradê.
  add(MIST, 512, 200, (ctx) => {
    for (let y = 0; y < 200; y++)
      for (let x = 0; x < 512; x++) {
        const u = (x - 256) / 256, w = (y - 100) / 100, a0 = Math.atan2(w, u);
        const dd = Math.hypot(u, w) / (0.84 + 0.09 * Math.sin(a0 * 5 + 2) + 0.05 * Math.sin(a0 * 11 + 1));
        if (dd >= 1) continue;
        const v = (1 - dd) * 3;
        const a = v > 2 ? 0.24 : v > 1 ? 0.14 : v > 0.3 ? 0.06 : 0;
        if (!a) continue;
        ctx.fillStyle = `rgba(200, 206, 204, ${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
  });
  add(ASH, 3, 3, (ctx) => {
    ctx.fillStyle = "#d8d6cf";
    ctx.fillRect(0, 1, 3, 1);
    ctx.fillStyle = "#a9a69e";
    ctx.fillRect(1, 0, 1, 1);
  });
  add(WISP, 5, 5, (ctx) => {
    ctx.fillStyle = "#8ef0d8";
    ctx.fillRect(1, 1, 3, 3);
    ctx.fillStyle = "#e6fff8";
    ctx.fillRect(2, 2, 1, 1);
  });
}

interface Objects { trees: Phaser.GameObjects.Image[]; pulses: Phaser.GameObjects.Image[]; flames: Phaser.GameObjects.Image[]; lights: Phaser.GameObjects.Image[] }

/**
 * Ambiente: a névoa baixa andando devagar para leste, a cinza caindo em diagonal, os fogos-fátuos piscando por cima das
 * poças, as chamas dos braseiros (4 quadros) e a luz delas, as runas dos monólitos e do círculo respirando, e a árvore
 * ou a palafita na frente do herói ficando transparente.
 */
function createAmbience(scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller, o: Objects): MapAmbience {
  createAmbienceArt(scene);
  const cam = scene.cameras.main;
  const ash = scene.add.particles(0, 0, ASH, {
    lifespan: { min: 5000, max: 8000 },
    speedY: { min: 6, max: 14 },
    speedX: { min: 4, max: 12 },
    rotate: { min: 0, max: 360 },
    alpha: { values: [0, 0.75, 0.6, 0], interpolation: "linear" },
    scale: { min: 0.5, max: 1 },
    frequency: 120,
    maxAliveParticles: 40,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const ashZone = (ash.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;
  const wisps = scene.add.particles(0, 0, WISP, {
    lifespan: { min: 2400, max: 4200 },
    speedY: { min: -8, max: 4 },
    speedX: { min: -6, max: 6 },
    alpha: { values: [0, 1, 0.2, 0.9, 0], interpolation: "linear" },
    scale: { min: 0.35, max: 0.6 },
    blendMode: Phaser.BlendModes.ADD,
    frequency: 260,
    maxAliveParticles: 14,
    emitting: false,
  }).setDepth(uiDepth - 4);
  const mists = Array.from({ length: MIST_COUNT }, (_, i) => scene.add.image(0, 0, MIST)
    .setScale((2.4 + hash(i, 51) * 2) / ZOOM).setAlpha(0.35 + hash(i, 52) * 0.35).setDepth(uiDepth - 5).setData("speed", 3 + hash(i, 53) * 5));
  let mistPlaced = false;
  const visible = new Set<Phaser.GameObjects.GameObject>();
  let nextWisp = 0;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      ashZone.setTo(v.x - v.width * 0.2, v.y - v.height * 0.1, v.width * 1.1, v.height);
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

      // Fogo-fátuo por cima de uma poça à vista.
      if (time >= nextWisp) {
        nextWisp = time + 300;
        const x = Math.floor((v.x + Math.random() * v.width) / TILE_SIZE), y = Math.floor((v.y + Math.random() * v.height) / TILE_SIZE);
        if (tileAt(d, x, y) === Tile.Water) wisps.emitParticleAt(x * TILE_SIZE + Math.random() * TILE_SIZE, y * TILE_SIZE + Math.random() * TILE_SIZE);
      }

      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const f = focusTile(cam);
      const fx = (f.x + 0.5) * TILE_SIZE, fy = (f.y + 0.5) * TILE_SIZE;
      for (const t of o.trees) {
        if (!visible.has(t)) continue;
        const half = (t.getData("w") as number) * 0.3 * t.scaleX;
        const over = Math.abs(fx - t.x) < half && fy < t.y - TILE_SIZE * 0.5 && fy > t.y - t.displayHeight * 0.92;
        t.setAlpha(over ? 0.45 : 1);
      }
      for (const g of o.pulses) if (visible.has(g)) g.setAlpha(0.2 + 0.7 * Math.max(0, Math.sin(time / 1900 + g.getData("phase"))) ** 2);
      for (const fl of o.flames) if (visible.has(fl)) fl.setFrame(Math.floor(time / 110 + fl.getData("phase")) % 4);
      for (const l of o.lights) if (visible.has(l)) l.setAlpha(0.26 + Math.sin(time / 170 + l.getData("phase")) * 0.05 + Math.sin(time / 47 + l.getData("phase") * 3) * 0.03);
    },
  };
}
