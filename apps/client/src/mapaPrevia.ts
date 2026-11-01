import * as Phaser from "phaser";
import { MAP_IDS, TILE_SIZE, centerOf, generateDungeon, mapIdOf } from "@kusa/shared";
import { createPropsArt, PROP_SCALE } from "./art/props.ts";
import { BLOOD_TEXTURE, CHEST_TEXTURE, PORTAL_TEXTURE, ensureMonsterArt } from "./art/textures.ts";
import { BESTIARY_ART, EXTRA_CLIPS, monsterAnimKey } from "./art/bestiary.ts";
import { scorpionCanvas } from "./art/desertMonsters.ts";
import { CREATURE_SPRITE_SCALE, refineArt } from "./art/refine.ts";
import { CLIP_ORDER } from "./art/rig.ts";
import { drawCavern, CAVERN_VOID } from "./cavernMap.ts";
import { drawCrypt } from "./cryptMap.ts";
import { DESERT_VOID, drawDesert } from "./desertMap.ts";
import { DUNES_VOID, MESAS_VOID, drawDunes } from "./dunesMap.ts";
import { HEARTWOOD_VOID, OLDWOOD_VOID, drawForest } from "./forestMap.ts";
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
 * Parâmetros: `mapa` (id do mapa), `seed`, `em` (`inicio`, `boss`, `sala` ou `x,y` em tiles), `bichos` (monstros da
 * arte nova lado a lado, passando por todos os clipes, posicionados como no jogo: `bichos=sandScorpion,goblin`) e
 * `antigo=1` (o escorpião da arte antiga ao lado, para comparar).
 * Ex.: `/mapa.html?mapa=marsh&seed=7&em=boss`. Na página, `window.pronto` vira true e `window.desenhoMs` diz quanto o
 * mapa levou para desenhar.
 */
const q = new URLSearchParams(location.search);
const d = generateDungeon(Number(q.get("seed") ?? 1), mapIdOf(q.get("mapa") ?? MAP_IDS[0]));
const DRAW = { crypt: drawCrypt, swamp: drawSwamp, desert: drawDesert, marsh: drawMarsh, cavern: drawCavern, dunes: drawDunes, mesas: drawDunes, gates: drawGates, oldwood: drawForest, heartwood: drawForest };
const VOID = { crypt: 0x000000, swamp: SWAMP_VOID, desert: DESERT_VOID, marsh: MARSH_VOID, cavern: CAVERN_VOID, dunes: DUNES_VOID, mesas: MESAS_VOID, gates: GATES_VOID, oldwood: OLDWOOD_VOID, heartwood: HEARTWOOD_VOID };

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
    const cam = this.cameras.main.setBackgroundColor(VOID[d.mapId]).setRoundPixels(true);
    cam.setZoom(Math.min(this.scale.gameSize.width, this.scale.gameSize.height) / (9 * TILE_SIZE)).centerOn(at.x * TILE_SIZE + 16, at.y * TILE_SIZE + 16);
    page.pronto = true;
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

  update(time: number) {
    this.ambience?.update(time);
  }
}

const parent = document.getElementById("mapa")!;
const dpr = window.devicePixelRatio || 1;
new Phaser.Game({
  type: Phaser.AUTO, parent, pixelArt: true, scene: [Previa],
  scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
});
