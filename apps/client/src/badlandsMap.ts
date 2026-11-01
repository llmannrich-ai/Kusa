import * as Phaser from "phaser";
import { TILE_SIZE, type Dungeon } from "@kusa/shared";
import { hash, makeCanvas } from "./art/pixels.ts";
import { HD, TileAtlas, toCanvas } from "./art/paint.ts";
import { FLAME, flameFrame } from "./art/bogArt.ts";
import { BADLANDS_LAYERS, LAYER_ATLAS, SHEETS, planBadlands, type Sheet } from "./badlandsPlan.ts";
import { GLOW, createGlowArt } from "./gatesMap.ts";
import { ChunkCuller, focusTile, type MapAmbience } from "./mapShared.ts";

/** Fundo além das bordas: a rocha das cristas na sombra. */
export const BADLANDS_VOID = 0x3a1c16;

const ZOOM = HD / TILE_SIZE;
const ATLAS = "badlands-atlas";

/**
 * Desenha os Ermos Rubros (`generateBadlands`): o chão em tilemaps de 128 px desenhados em ¼ (o barro rachado, as manchas
 * de areia, sal e cascalho, as ravinas, o rastro das carroças, os trilhos, as pontes, os enfeites e, por cima, a rocha
 * das cristas com o paredão) e, de pé, ordenados pela linha de baixo, as torres de pedra, as costelas, o crânio gigante,
 * os muros de adobe, a boca da mina, a vagoneta, as fogueiras e os enfeites. O ambiente: a poeira vermelha correndo com o
 * vento, as rajadas, as macegas rolando, as fagulhas subindo da cratera e as chamas.
 */
export function drawBadlands(scene: Phaser.Scene, d: Dungeon, floorDepth: number, uiDepth: number): MapAmbience {
  const { atlases, layers, standing } = planBadlands(d);
  const W = d.width, H = d.height;
  const sets = atlases.map((atlas, k) => {
    const key = `${ATLAS}-${k}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, atlas.build());
    const map = scene.make.tilemap({ width: W, height: H, tileWidth: HD, tileHeight: HD });
    return { map, set: map.addTilesetImage(key, key, HD, HD, TileAtlas.PAD, TileAtlas.PAD * 2, 0)! };
  });
  (window as unknown as { badFrames?: number[] }).badFrames = atlases.map((a) => a.count);
  for (const name of BADLANDS_LAYERS) {
    const { map, set } = sets[LAYER_ATLAS[name]];
    const l = map.createBlankLayer(name, set)!.setDepth(floorDepth).setScale(1 / ZOOM);
    const data = layers[name];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const f = data[y * W + x]; if (f >= 0) l.putTileAt(f, x, y); }
  }

  const used = new Map<Sheet, Set<number>>();
  for (const s of standing) { if (!used.has(s.sheet)) used.set(s.sheet, new Set()); used.get(s.sheet)!.add(s.frame); }
  for (const [sheet, frames] of used) {
    const key = `badlands-${sheet}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const spec = SHEETS[sheet];
    const { canvas, ctx } = makeCanvas(spec.w * spec.frames.length, spec.h);
    for (const i of frames) ctx.drawImage(toCanvas(spec.frames[i](), spec.w, spec.h), i * spec.w, 0);
    const texture = scene.textures.addCanvas(key, canvas)!;
    for (let i = 0; i < spec.frames.length; i++) texture.add(i, 0, i * spec.w, 0, spec.w, spec.h);
  }
  const flameKey = "badlands-flame";
  if (scene.textures.exists(flameKey)) scene.textures.remove(flameKey);
  {
    const { canvas, ctx } = makeCanvas(FLAME.w * 4, FLAME.h);
    for (let k = 0; k < 4; k++) ctx.drawImage(toCanvas(flameFrame(k), FLAME.w, FLAME.h), k * FLAME.w, 0);
    const texture = scene.textures.addCanvas(flameKey, canvas)!;
    for (let k = 0; k < 4; k++) texture.add(k, 0, k * FLAME.w, 0, FLAME.w, FLAME.h);
  }
  createGlowArt(scene);

  const culler = new ChunkCuller();
  const fade: Phaser.GameObjects.Image[] = [];
  const flames: Phaser.GameObjects.Image[] = [];
  const lights: Phaser.GameObjects.Image[] = [];
  for (const s of standing) {
    const px = (s.x + s.span / 2) * TILE_SIZE, py = (s.y + 1) * TILE_SIZE - (s.lift ?? 2);
    const img = scene.add.image(px, py, `badlands-${s.sheet}`, s.frame).setOrigin(0.5, 1).setScale(1 / ZOOM).setDepth(s.depth).setFlipX(s.flip);
    culler.add(img, s.x, s.y);
    if (s.sheet === "hoodoo" || s.sheet === "skull") { img.setData("w", SHEETS[s.sheet].w); fade.push(img); }
    if (s.sheet === "fire") {
      const f = culler.add(scene.add.image(px, py - 30 / ZOOM, flameKey, 0).setOrigin(0.5, 1).setScale(1.2 / ZOOM).setDepth(s.depth + 0.1)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", hash(s.x, s.y, 22) * 10), s.x, s.y);
      flames.push(f);
      const l = culler.add(scene.add.image(px, py - 12, GLOW).setScale(1.5).setTint(0xff9a40).setAlpha(0.3).setDepth(uiDepth - 6)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", hash(s.x, s.y, 23) * 10), s.x, s.y);
      lights.push(l);
    }
    if (s.sheet === "mine") {
      const l = culler.add(scene.add.image(px + 62 / ZOOM, py - 100 / ZOOM, GLOW).setScale(0.7).setTint(0xffc060).setAlpha(0.35).setDepth(uiDepth - 6)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", hash(s.x, s.y, 24) * 10), s.x, s.y);
      lights.push(l);
    }
    if (s.sheet === "skull") {
      // O brilho de brasa nas órbitas.
      const l = culler.add(scene.add.image(px, py - 150 / ZOOM, GLOW).setScale(1.3, 0.7).setTint(0xff6a2a).setAlpha(0.35).setDepth(s.depth + 0.2)
        .setBlendMode(Phaser.BlendModes.ADD).setData("phase", 3), s.x, s.y);
      lights.push(l);
    }
  }
  return createAmbience(scene, d, uiDepth, culler, { fade, flames, lights });
}

const DUST = "badlands-dust";
const STREAK = "badlands-streak";
const WEED = "badlands-weed";
const SPARK = "badlands-spark";

function createAmbienceArt(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    if (scene.textures.exists(key)) return;
    const { canvas, ctx } = makeCanvas(w, h);
    paint(ctx);
    scene.textures.addCanvas(key, canvas);
  };
  add(DUST, 3, 3, (ctx) => { ctx.fillStyle = "#e0a070"; ctx.fillRect(0, 1, 2, 1); ctx.fillStyle = "#c27a50"; ctx.fillRect(1, 0, 1, 1); });
  add(STREAK, 40, 2, (ctx) => {
    for (let x = 0; x < 40; x++) { ctx.fillStyle = `rgba(236, 196, 156, ${x < 10 ? 0.12 : x < 30 ? 0.24 : 0.12})`; ctx.fillRect(x, 0, 1, 1); }
    ctx.fillStyle = "rgba(236, 196, 156, 0.1)";
    ctx.fillRect(12, 1, 20, 1);
  });
  // Macega rolando: um novelo de gravetos.
  add(WEED, 24, 24, (ctx) => {
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2 * 3, r = 4 + (k % 7) * 1.2;
      ctx.fillStyle = k % 3 ? "#8a6a4a" : "#5e4630";
      ctx.fillRect(Math.round(12 + Math.cos(a) * r), Math.round(12 + Math.sin(a) * r), 2, 1);
    }
  });
  add(SPARK, 3, 3, (ctx) => { ctx.fillStyle = "#ffb050"; ctx.fillRect(1, 0, 1, 3); ctx.fillRect(0, 1, 3, 1); ctx.fillStyle = "#fff0b0"; ctx.fillRect(1, 1, 1, 1); });
}

interface Objects { fade: Phaser.GameObjects.Image[]; flames: Phaser.GameObjects.Image[]; lights: Phaser.GameObjects.Image[] }

/** Intervalo entre macegas rolando (ms). */
const WEED_EVERY_MS = 9000;

/**
 * Ambiente: poeira vermelha e rajadas correndo de oeste a leste, uma macega rolando de vez em quando, as fagulhas subindo
 * da cratera, as chamas (4 quadros) e a luz delas, e a torre ou o crânio na frente do herói ficando transparente.
 */
function createAmbience(scene: Phaser.Scene, d: Dungeon, uiDepth: number, culler: ChunkCuller, o: Objects): MapAmbience {
  createAmbienceArt(scene);
  const cam = scene.cameras.main;
  const zoneOf = (p: Phaser.GameObjects.Particles.ParticleEmitter) => (p.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle }).source;
  const randomZone = { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData;
  const dust = scene.add.particles(0, 0, DUST, {
    lifespan: { min: 3000, max: 5000 }, speedX: { min: 30, max: 60 }, speedY: { min: -4, max: 6 },
    alpha: { values: [0, 0.7, 0.5, 0], interpolation: "linear" }, scale: { min: 0.5, max: 1 }, frequency: 90, maxAliveParticles: 40,
    emitZone: randomZone,
  }).setDepth(uiDepth - 4);
  const streaks = scene.add.particles(0, 0, STREAK, {
    lifespan: { min: 1400, max: 2200 }, speedX: { min: 110, max: 170 }, speedY: { min: -2, max: 2 },
    alpha: { values: [0, 1, 0], interpolation: "linear" }, scaleX: { min: 0.6, max: 1.4 }, scaleY: 0.5, frequency: 260, maxAliveParticles: 10,
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const crater = d.badlands!.crater;
  scene.add.particles(crater.x * TILE_SIZE + 16, crater.y * TILE_SIZE + 16, SPARK, {
    lifespan: { min: 1600, max: 2800 }, speedY: { min: -26, max: -10 }, speedX: { min: -8, max: 8 },
    alpha: { values: [0, 1, 0.6, 0], interpolation: "linear" }, scale: { min: 0.4, max: 0.8 }, blendMode: Phaser.BlendModes.ADD,
    frequency: 160, maxAliveParticles: 24,
    emitZone: { type: "random", source: new Phaser.Geom.Circle(0, 0, crater.r * TILE_SIZE * 0.7), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
  }).setDepth(uiDepth - 4);
  const visible = new Set<Phaser.GameObjects.GameObject>();
  let nextWeed = 3000;
  return {
    update(time: number) {
      const v = cam.worldView;
      if (v.width === 0) return;
      culler.update(v);
      zoneOf(dust).setTo(v.x - v.width * 0.3, v.y, v.width * 1.2, v.height);
      zoneOf(streaks).setTo(v.x - v.width * 0.4, v.y, v.width, v.height);
      if (time >= nextWeed) {
        nextWeed = time + WEED_EVERY_MS + Math.random() * 6000;
        const y = v.y + v.height * (0.25 + Math.random() * 0.6);
        const weed = scene.add.image(v.x - 20, y, WEED).setDepth(y + 8).setScale(0.6);
        scene.tweens.add({ targets: weed, x: v.right + 20, angle: 720, duration: 5200, ease: "Linear", onComplete: () => weed.destroy() });
        scene.tweens.add({ targets: weed, y: y - 6, duration: 320, yoyo: true, repeat: 7, ease: "Quad.easeOut" });
      }
      visible.clear();
      for (const chunk of culler.visible()) for (const obj of chunk) visible.add(obj);
      const f = focusTile(cam);
      const fx = (f.x + 0.5) * TILE_SIZE, fy = (f.y + 0.5) * TILE_SIZE;
      for (const t of o.fade) {
        if (!visible.has(t)) continue;
        const half = (t.getData("w") as number) * 0.3 * t.scaleX;
        const over = Math.abs(fx - t.x) < half && fy < t.y - TILE_SIZE * 0.5 && fy > t.y - t.displayHeight * 0.92;
        t.setAlpha(over ? 0.45 : 1);
      }
      for (const fl of o.flames) if (visible.has(fl)) fl.setFrame(Math.floor(time / 110 + fl.getData("phase")) % 4);
      for (const l of o.lights) if (visible.has(l)) l.setAlpha(0.28 + Math.sin(time / 170 + l.getData("phase")) * 0.05 + Math.sin(time / 47 + l.getData("phase") * 3) * 0.03);
    },
  };
}
