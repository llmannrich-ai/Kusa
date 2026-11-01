import * as Phaser from "phaser";
import { MAPS, MAP_IDS, TILE_SIZE, centerOf, generateDungeon, mapIdOf } from "@kusa/shared";
import { createPropsArt, PROP_SCALE } from "./art/props.ts";
import { BLOOD_TEXTURE, CHEST_TEXTURE, PORTAL_TEXTURE, ensureMonsterArt, heroActionAnim, heroActionArt, heroArt, heroIdleFrame, heroWalkAnim, type HeroAction } from "./art/textures.ts";
import { heroSpriteScale, type HeroDir } from "./art/heroes.ts";
import { ITEMS, type ClassId } from "@kusa/shared";
import { NO_OUTFIT, type Outfit } from "./art/outfit.ts";
import { BESTIARY_ART, EXTRA_CLIPS, monsterAnimKey } from "./art/bestiary.ts";
import { scorpionCanvas } from "./art/desertMonsters.ts";
import { CREATURE_SPRITE_SCALE, refineArt } from "./art/refine.ts";
import { CLIP_ORDER } from "./art/rig.ts";
import { drawCavern, CAVERN_VOID } from "./cavernMap.ts";
import { drawCrypt } from "./cryptMap.ts";
import { DESERT_VOID, drawDesert } from "./desertMap.ts";
import { DUNES_VOID, MESAS_VOID, drawDunes } from "./dunesMap.ts";
import { HEARTWOOD_VOID, OLDWOOD_VOID, drawForest } from "./forestMap.ts";
import { FORTRESS_VOID, drawFortress } from "./fortressMap.ts";
import { GATES_VOID, drawGates } from "./gatesMap.ts";
import type { MapAmbience } from "./mapShared.ts";
import { MARSH_VOID, drawMarsh } from "./marshMap.ts";
import { SWAMP_VOID, drawSwamp } from "./swampMap.ts";

/**
 * Prévia de mapa só para desenvolvimento (`npm run dev:client` → `/mapa.html`, fora do build): desenha o cenário de um
 * mapa sem login, servidor nem monstros, com a câmera do celular em pé (9 tiles de largura), para conferir a arte
 * (`docs/CENARIOS_PLANO.md`). Põe também os baús (trancado, destrancado e aberto) na primeira clareira, o portal de
 * saída e uma poça de sangue no começo.
 *
 * Parâmetros: `mapa` (id do mapa), `seed`, `em` (`inicio`, `boss`, `sala` ou `x,y` em tiles), `largura` (tiles no lado
 * curto da tela, 9 se faltar: mais que isso afasta a câmera para ver o mapa inteiro), `bichos` (monstros da arte nova
 * lado a lado, passando por todos os clipes, posicionados como no jogo: `bichos=sandScorpion,goblin`) e `antigo=1` (o
 * escorpião da arte antiga ao lado, para comparar). `herois` (heróis lado a lado, como no jogo, repetindo andar, golpe e
 * magia em cada direção: `herois=knight,paladin`; um item vestido com `:`, `herois=knight:weapon-axe-5-common`) e `lento` (animações N vezes mais devagar).
 * Ex.: `/mapa.html?mapa=marsh&seed=7&em=boss`. Na página, `window.pronto` vira true e `window.desenhoMs` diz quanto o
 * mapa levou para desenhar.
 *
 * **Medição** (`passeio=1`): a câmera anda da entrada até o boss pelas zonas do caminho, no passo de um herói, e a tela
 * mostra o tempo de desenho, a memória das texturas (MB, sem compressão) e os quadros por segundo do passeio (a média e
 * a dos 5% piores quadros). O resultado fica também em `window.medida`. Para medir no celular e comparar mapas.
 */
const q = new URLSearchParams(location.search);
const d = generateDungeon(Number(q.get("seed") ?? 1), mapIdOf(q.get("mapa") ?? MAP_IDS[0]));
const DRAW = { crypt: drawCrypt, swamp: drawSwamp, desert: drawDesert, marsh: drawMarsh, cavern: drawCavern, dunes: drawDunes, mesas: drawDunes, gates: drawGates, fortress: drawFortress, oldwood: drawForest, heartwood: drawForest };
const VOID = { crypt: 0x000000, swamp: SWAMP_VOID, desert: DESERT_VOID, marsh: MARSH_VOID, cavern: CAVERN_VOID, dunes: DUNES_VOID, mesas: MESAS_VOID, gates: GATES_VOID, fortress: FORTRESS_VOID, oldwood: OLDWOOD_VOID, heartwood: HEARTWOOD_VOID };

class Previa extends Phaser.Scene {
  private ambience: MapAmbience | null = null;

  create() {
    createPropsArt(this);
    const t0 = performance.now();
    this.ambience = DRAW[d.mapId](this, d, 0, 1e6);
    const page = window as unknown as { desenhoMs: number; pronto: boolean };
    page.desenhoMs = Math.round(performance.now() - t0);
    const room = d.side[0];
    if (room)
      (["locked", "unlocked", "open"] as const).forEach((k, i) => this.add.image((room.x + 2 + i * 2) * TILE_SIZE + 16, (room.y + 2) * TILE_SIZE + 16, CHEST_TEXTURE[k])
        .setScale(PROP_SCALE).setDepth((room.y + 3) * TILE_SIZE - 1));
    this.add.image(d.portal.x * TILE_SIZE + 16, d.portal.y * TILE_SIZE + 16, PORTAL_TEXTURE.escape).setScale(PROP_SCALE).setDepth(d.portal.y * TILE_SIZE + 1);
    this.add.image((d.spawn.x + 1) * TILE_SIZE, (d.spawn.y + 1) * TILE_SIZE, BLOOD_TEXTURE.puddle, 1).setScale(PROP_SCALE).setDepth(1);
    const em = q.get("em") ?? "inicio";
    const [x, y] = em.split(",").map(Number);
    const at = em === "boss" ? centerOf(d.boss) : em === "sala" && room ? centerOf(room) : Number.isFinite(y) ? { x, y } : d.spawn;
    this.critters(at);
    this.heroes(at);
    const cam = this.cameras.main.setBackgroundColor(VOID[d.mapId]).setRoundPixels(true);
    cam.setZoom(Math.min(this.scale.gameSize.width, this.scale.gameSize.height) / (Number(q.get("largura") ?? 9) * TILE_SIZE)).centerOn(at.x * TILE_SIZE + 16, at.y * TILE_SIZE + 16);
    page.pronto = true;
    if (q.get("passeio")) this.startTour();
  }

  /** Monstros de `bichos` em fila a partir de `at`, como o `DungeonScene.addMonster` os põe (escala, apoio e sombra). */
  private critters(at: { x: number; y: number }) {
    const kinds = (q.get("bichos") ?? "").split(",").filter(Boolean) as (keyof typeof BESTIARY_ART)[];
    const place = (i: number, sprite: Phaser.GameObjects.Sprite, origin = 1) => {
      const x = (at.x + (i % 3) * 2.6 - 2.6) * TILE_SIZE + 16, y = (at.y + 1.5 + Math.floor(i / 3) * 2.5) * TILE_SIZE + 16;
      sprite.setOrigin(0.5, origin).setPosition(x, y + TILE_SIZE / 2).setDepth(y + TILE_SIZE / 2);
      this.add.ellipse(x, y + TILE_SIZE / 2 - 3, sprite.displayWidth * 0.55, (6 * sprite.displayHeight) / TILE_SIZE, 0x000000, 0.35).setDepth(y);
    };
    kinds.forEach((kind, i) => {
      const art = BESTIARY_ART[kind];
      if (!art?.anim) return;
      ensureMonsterArt(this, art.texture);
      const sprite = this.add.sprite(0, 0, art.texture).setScale((art.scale ?? 1) * CREATURE_SPRITE_SCALE);
      place(i, sprite, art.anim.origin ?? 1);
      // Passa por todos os clipes, um depois do outro.
      const clips = [...CLIP_ORDER, ...EXTRA_CLIPS.filter((c) => art.anim!.extra?.[c])];
      let k = 0;
      const next = () => {
        const clip = clips[k++ % clips.length];
        sprite.play({ key: monsterAnimKey(art.texture, clip), repeat: clip.startsWith("idle") || clip.startsWith("walk") ? 3 : 0 });
        sprite.once("animationcomplete", () => this.time.delayedCall(clip === "death" ? 800 : 150, next));
      };
      next();
    });
    if (q.get("antigo")) {
      if (!this.textures.exists("antigo")) this.textures.addCanvas("antigo", refineArt(scorpionCanvas()));
      place(kinds.length, this.add.sprite(0, 0, "antigo").setScale(CREATURE_SPRITE_SCALE).setFlipX(false));
    }
  }

  /**
   * Heróis de `herois` em fila acima de `at`, como o `DungeonScene.addAvatar` os põe, repetindo andar, golpe e magia de
   * frente, de lado (para os dois lados) e de costas, com os mesmos clipes do jogo (`heroActionArt`).
   */
  private heroes(at: { x: number; y: number }) {
    const list = (q.get("herois") ?? "").split(",").filter(Boolean);
    // `lento=4`: tudo 4× mais devagar, para ver quadro a quadro.
    const slow = Number(q.get("lento") ?? 1);
    this.anims.globalTimeScale = 1 / slow;
    this.time.timeScale = 1 / slow;
    list.forEach((entry, i) => {
      const [classId, ...items] = entry.split(":") as [ClassId, ...string[]];
      const outfit: Outfit = { ...NO_OUTFIT };
      for (const id of items) if (ITEMS[id]) outfit[ITEMS[id].slot] = id;
      const key = heroArt(this, classId, outfit);
      const sprite = this.add.sprite(0, 0, key, heroIdleFrame("down")).setScale(heroSpriteScale()).setOrigin(0.5, 1);
      const x = (at.x + (i % 3) * 2.6 - 2.6) * TILE_SIZE + 16, y = (at.y + 0.5 + Math.floor(i / 3) * 2.5) * TILE_SIZE + 16;
      sprite.setPosition(x, y + TILE_SIZE / 2).setDepth(y + TILE_SIZE / 2);
      this.add.ellipse(x, y + TILE_SIZE / 2 - 3, sprite.displayWidth * 0.55, (6 * sprite.displayHeight) / TILE_SIZE, 0x000000, 0.35).setDepth(y);
      const steps: [HeroDir, boolean, "walk" | HeroAction][] = [];
      for (const [dir, flip] of [["down", false], ["side", false], ["side", true], ["up", false]] as [HeroDir, boolean][])
        for (const what of ["walk", "attack", "attack", "cast"] as const) steps.push([dir, flip, what]);
      let k = 0;
      const next = () => {
        const [dir, flip, what] = steps[k++ % steps.length];
        sprite.setFlipX(flip);
        const acts = heroActionArt(this, classId, outfit);
        if (what === "walk" || !acts) {
          sprite.play({ key: heroWalkAnim(key, dir), repeat: 1 });
          sprite.once("animationcomplete", () => { sprite.setTexture(key, heroIdleFrame(dir)); this.time.delayedCall(150, next); });
          return;
        }
        sprite.play(heroActionAnim(acts, what, dir));
        sprite.once("animationcomplete", () => { sprite.setTexture(key, heroIdleFrame(dir)); this.time.delayedCall(350, next); });
      };
      this.time.delayedCall(1500, next);
    });
  }

  /** Pontos do passeio da medição (em px) e onde a câmera está nele. */
  private tour: { pts: { x: number; y: number }[]; dist: number; frames: number[]; t0: number; texMb: number; drawMs: number } | null = null;

  private startTour() {
    const page = window as unknown as { desenhoMs: number };
    const stops = [centerOf(d.spawn), ...d.path.map(centerOf), centerOf(d.boss)];
    const pts = stops.map((p) => ({ x: p.x * TILE_SIZE + 16, y: p.y * TILE_SIZE + 16 }));
    let bytes = 0;
    for (const key of this.textures.getTextureKeys())
      for (const src of this.textures.get(key).source) bytes += src.width * src.height * 4;
    this.tour = { pts, dist: 0, frames: [], t0: -1, texMb: Math.round(bytes / 1048576), drawMs: page.desenhoMs };
    this.cameras.main.centerOn(pts[0].x, pts[0].y);
  }

  update(time: number, delta: number) {
    this.ambience?.update(time);
    const t = this.tour;
    if (!t) return;
    // Espera 1 s para os quadros pintados depois (fachada, mosaico) saírem; depois anda 4 tiles por segundo.
    if (t.t0 < 0) t.t0 = time;
    if (time - t.t0 < 1000) return;
    t.frames.push(delta);
    t.dist += (delta / 1000) * 4 * TILE_SIZE;
    let left = t.dist;
    for (let i = 0; i + 1 < t.pts.length; i++) {
      const a = t.pts[i], b = t.pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
      if (left <= len) { this.cameras.main.centerOn(a.x + (b.x - a.x) * (left / len), a.y + (b.y - a.y) * (left / len)); return; }
      left -= len;
    }
    // Fim do passeio: o resultado na tela.
    const sorted = [...t.frames].sort((x, y) => y - x);
    const worst = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)));
    const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const medida = {
      mapa: d.mapId, desenhoMs: t.drawMs, texturasMb: t.texMb, qps: Math.round(1000 / avg(t.frames)), qpsPiores5: Math.round(1000 / avg(worst)),
      tela: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`,
    };
    (window as unknown as { medida: typeof medida }).medida = medida;
    const box = document.createElement("pre");
    box.style.cssText = "position:fixed;left:8px;top:8px;margin:0;padding:10px 12px;background:rgba(0,0,0,.8);color:#fff;font:15px/1.5 monospace;z-index:9;border-radius:6px";
    box.textContent = `${MAPS[d.mapId].name}\ndesenho: ${medida.desenhoMs} ms\ntexturas: ${medida.texturasMb} MB\nquadros/s: ${medida.qps} (piores 5%: ${medida.qpsPiores5})\ntela: ${medida.tela}`;
    document.body.appendChild(box);
    this.tour = null;
  }
}

const parent = document.getElementById("mapa")!;
const dpr = window.devicePixelRatio || 1;
(window as unknown as { jogo: Phaser.Game }).jogo = new Phaser.Game({
  type: Phaser.AUTO, parent, pixelArt: true, scene: [Previa],
  scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
});
