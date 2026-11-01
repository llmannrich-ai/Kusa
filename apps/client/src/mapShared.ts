import type * as Phaser from "phaser";
import { TILE_SIZE } from "@kusa/shared";
import { hash } from "./art/pixels.ts";

/** O que a cena chama a cada quadro para o ambiente do mapa (luz, partículas, névoa) acompanhar a câmera. */
export interface MapAmbience {
  update(time: number): void;
}

/** Lado (em tiles) dos blocos de sprites que ligam e desligam conforme a câmera anda. */
const CHUNK = 8;

/**
 * Sprites parados do mapa (paredes, árvores, enfeites) agrupados em blocos de 8×8 tiles: só os blocos
 * que tocam a tela, com um bloco de folga em volta, são desenhados. Mapa grande no celular sem pesar.
 */
export class ChunkCuller {
  private chunks = new Map<number, Phaser.GameObjects.GameObject[]>();
  private shown = new Set<number>();

  /**
   * Registra um sprite no bloco do tile (x, y); ele começa escondido até a câmera chegar perto (ou já aparece, se for
   * registrado depois, com o bloco na tela).
   */
  add<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible>(obj: T, x: number, y: number): T {
    const key = chunkKey(Math.floor(x / CHUNK), Math.floor(y / CHUNK));
    if (!this.chunks.has(key)) this.chunks.set(key, []);
    this.chunks.get(key)!.push(obj);
    obj.setVisible(this.shown.has(key));
    return obj;
  }

  /** Blocos visíveis agora (para efeitos que só precisam rodar perto da câmera). */
  visible(): Phaser.GameObjects.GameObject[][] {
    return [...this.shown].map((key) => this.chunks.get(key) ?? []);
  }

  update(view: Phaser.Geom.Rectangle) {
    const span = CHUNK * TILE_SIZE;
    const x0 = Math.floor(view.x / span) - 1;
    const y0 = Math.floor(view.y / span) - 1;
    const x1 = Math.floor(view.right / span) + 1;
    const y1 = Math.floor(view.bottom / span) + 1;
    const next = new Set<number>();
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) next.add(chunkKey(cx, cy));
    const setAll = (key: number, on: boolean) =>
      this.chunks.get(key)?.forEach((obj) => (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(on));
    for (const key of this.shown) if (!next.has(key)) setAll(key, false);
    for (const key of next) if (!this.shown.has(key)) setAll(key, true);
    this.shown = next;
  }
}

/**
 * Tile de quem a câmera segue (o nosso herói) ou, sem ninguém (prévia do mapa), o do meio da tela: os telhados e os
 * andares de cima somem quando ele entra embaixo deles.
 */
export function focusTile(cam: Phaser.Cameras.Scene2D.Camera) {
  const follow = (cam as unknown as { _follow?: { x: number; y: number } | null })._follow;
  const x = follow ? follow.x : cam.worldView.centerX;
  const y = follow ? follow.y : cam.worldView.centerY;
  return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

const chunkKey = (cx: number, cy: number) => (cy + 64) * 1024 + (cx + 64);

/**
 * Manchas grandes de luz e sombra no chão (ruído suave em grade de `cell` tiles), como tint do tilemap:
 * o chão deixa de parecer chapado. O tint só escurece: o tom vai de `min` a 100% do ladrilho, puxado
 * para a cor `tone` (multiplicadores R, G, B) nas partes escuras.
 */
export function patchTint(x: number, y: number, min: number, tone: readonly [number, number, number], cell = 7, seed = 61) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = smooth(x / cell - gx);
  const fy = smooth(y / cell - gy);
  const top = lerp(hash(gx, gy, seed), hash(gx + 1, gy, seed), fx);
  const bottom = lerp(hash(gx, gy + 1, seed), hash(gx + 1, gy + 1, seed), fx);
  const light = min + (1 - min) * lerp(top, bottom, fy);
  const shade = 1 - light;
  const channel = (k: number) => Math.round(255 * Math.min(1, light * (1 - shade * (1 - tone[k]))));
  return (channel(0) << 16) | (channel(1) << 8) | channel(2);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
