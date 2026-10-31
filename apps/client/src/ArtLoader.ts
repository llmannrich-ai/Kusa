import * as Phaser from "phaser";
import { createCombatArt } from "./art/combat.ts";
import { createPropsArt } from "./art/props.ts";
import { createCreatureArt, createEffectArt, createHeroArt, preloadArt } from "./art/textures.ts";

let markReady: () => void;
/** Resolve quando todos os PNGs carregaram e a arte própria virou textura. */
export const artReady = new Promise<void>((resolve) => { markReady = resolve; });

/**
 * Cena que só carrega a arte. Roda desde o lobby, para a hunt não começar com a tela preta
 * enquanto os PNGs chegam pela rede; as texturas ficam no jogo para a cena da dungeon.
 */
export class ArtLoader extends Phaser.Scene {
  constructor() {
    super("arte");
  }

  preload() {
    preloadArt(this);
  }

  create() {
    createHeroArt(this);
    createCreatureArt(this);
    createEffectArt(this);
    createCombatArt(this);
    createPropsArt(this);
    markReady();
    this.scene.stop();
  }
}
