import * as Phaser from "phaser";
import { ITEMS, RARITY_COLORS, TILE_SIZE, type ItemStats } from "@kusa/shared";
import { FX } from "./art/combat.ts";
import type { Outfit } from "./art/outfit.ts";

/**
 * Brilho do equipamento no herói (só visual, ver `docs/ARTE_HEROIS_PLANO.md`):
 * - item raro: uma estrelinha azul pisca de vez em quando sobre o herói;
 * - item mágico: aura roxa nos pés, estrelinhas roxas e partículas das propriedades mágicas que ele veste
 *   (brasas para queimadura, gotas para veneno, fiapos para roubo de vida, faíscas arcanas para poder
 *   mágico e mana, poeira para velocidade, luz dourada para vida, armadura e espinhos), no máximo duas;
 * - item lendário: como o mágico, com a aura dourada e faíscas de ouro subindo do chão em volta do herói.
 */

type Sign = "burn" | "poison" | "lifesteal" | "arcane" | "speed" | "holy";

export interface GearSigns {
  rarity: "rare" | "magic" | "legendary" | null;
  signs: Sign[];
}

/** Ordem de prioridade (as duas primeiras que o herói tiver aparecem). */
const SIGN_OF: [Sign, Exclude<keyof ItemStats, "spells">[]][] = [
  ["burn", ["burn"]],
  ["poison", ["poison"]],
  ["lifesteal", ["lifesteal"]],
  ["arcane", ["spellPower", "mana", "cooldown"]],
  ["speed", ["speed", "haste"]],
  ["holy", ["hp", "armor", "thorns", "damage", "range"]],
];

const COLORS: Record<Sign, number> = {
  burn: 0xff8a24, poison: 0x8cff4a, lifesteal: 0xe0283a, arcane: 0x9f8cff, speed: 0xd6e6ff, holy: 0xffe58a,
};

/** O que o equipamento vestido mostra. As propriedades vêm só dos itens mágicos (a propriedade "a mais" deles). */
export function gearSigns(outfit: Outfit): GearSigns {
  const items = Object.values(outfit).map((id) => ITEMS[id]).filter((item) => !!item);
  const magic = items.filter((item) => item.rarity === "magic" || item.rarity === "legendary");
  const rarity = items.some((item) => item.rarity === "legendary") ? "legendary"
    : magic.length ? "magic" : items.some((item) => item.rarity === "rare") ? "rare" : null;
  const signs = SIGN_OF
    .filter(([, keys]) => magic.some((item) => keys.some((k) => (item.stats[k] ?? 0) > 0)))
    .map(([sign]) => sign)
    .slice(0, 2);
  return { rarity, signs };
}

export const gearKey = (g: GearSigns) => `${g.rarity ?? "-"}:${g.signs.join(",")}`;

/** Altura do herói (px do mundo) acima dos pés; os pés ficam em y = TILE_SIZE / 2 no container. */
const FEET = TILE_SIZE / 2;

/** Efeitos do equipamento, num container para pôr no corpo da unidade (ou `null` se não há o que mostrar). */
export function gearFx(scene: Phaser.Scene, g: GearSigns, height: number): Phaser.GameObjects.Container | null {
  if (!g.rarity) return null;
  const root = scene.add.container(0, 0);
  const top = FEET - height;
  const events: Phaser.Time.TimerEvent[] = [];
  const every = (delay: number, fn: () => void) => events.push(scene.time.addEvent({ delay, loop: true, callback: () => root.visible && fn() }));

  if (g.rarity === "magic" || g.rarity === "legendary") {
    const tint = RARITY_COLORS[g.rarity];
    const aura = scene.add.graphics();
    aura.fillStyle(tint, 0.16).fillEllipse(0, FEET - 3, TILE_SIZE - 4, 9);
    aura.lineStyle(1, tint, 0.4).strokeEllipse(0, FEET - 3, TILE_SIZE - 4, 9);
    root.add(aura);
    scene.tweens.add({ targets: aura, alpha: { from: 1, to: 0.35 }, duration: 900, yoyo: true, repeat: -1 });
  }
  if (g.rarity === "legendary") {
    // Faíscas de ouro sobem do chão em volta do herói e somem na altura do peito.
    every(420, () => {
      const x = Phaser.Math.Between(-12, 12);
      const spark = scene.add.circle(x, FEET - 4, Phaser.Math.FloatBetween(0.8, 1.4), RARITY_COLORS.legendary, 0.9).setBlendMode(Phaser.BlendModes.ADD);
      root.add(spark);
      scene.tweens.add({ targets: spark, y: FEET - Phaser.Math.Between(14, 22), alpha: 0, duration: 1100, onComplete: () => spark.destroy() });
    });
  }

  // Estrelinha que pisca num ponto do corpo.
  const color = RARITY_COLORS[g.rarity];
  every(g.rarity === "rare" ? 1600 : 1000, () => {
    const star = scene.add.image(Phaser.Math.Between(-9, 9), Phaser.Math.Between(top + 6, FEET - 10), FX.star)
      .setTint(color).setScale(0).setBlendMode(Phaser.BlendModes.ADD);
    root.add(star);
    scene.tweens.add({ targets: star, scale: { from: 0, to: 0.55 }, angle: 90, duration: 260, yoyo: true, onComplete: () => star.destroy() });
  });

  for (const sign of g.signs) {
    const c = COLORS[sign];
    const mote = (x: number, y: number, r: number, alpha = 0.9) => {
      const dot = scene.add.circle(x, y, r, c, alpha).setBlendMode(Phaser.BlendModes.ADD);
      root.add(dot);
      return dot;
    };
    switch (sign) {
      case "burn": // Brasas subindo.
        every(240, () => {
          const d = mote(Phaser.Math.Between(-10, 10), Phaser.Math.Between(top + 14, FEET - 8), Phaser.Math.Between(1, 2) / 2 + 0.5);
          scene.tweens.add({ targets: d, y: d.y - 14, x: d.x + Phaser.Math.Between(-3, 3), alpha: 0, duration: 650, onComplete: () => d.destroy() });
        });
        break;
      case "poison": // Gotas pingando.
        every(420, () => {
          const d = mote(Phaser.Math.Between(-9, 9), Phaser.Math.Between(top + 18, FEET - 10), 1);
          scene.tweens.add({ targets: d, y: d.y + 9, alpha: 0, duration: 600, ease: "Quad.In", onComplete: () => d.destroy() });
        });
        break;
      case "lifesteal": // Fiapos vermelhos subindo em curva.
        every(420, () => {
          const d = mote(Phaser.Math.Between(-11, 11), FEET - 6, 1, 0.8);
          scene.tweens.add({ targets: d, y: top + 10, x: d.x * 0.3, alpha: 0, duration: 900, ease: "Sine.Out", onComplete: () => d.destroy() });
        });
        break;
      case "arcane": // Faíscas arcanas girando em volta.
        every(300, () => {
          const a = Math.random() * Math.PI * 2;
          const d = mote(Math.cos(a) * 12, FEET - 14 + Math.sin(a) * 5, 1);
          scene.tweens.add({ targets: d, x: Math.cos(a + 1.4) * 12, y: d.y - 10, alpha: 0, duration: 800, onComplete: () => d.destroy() });
        });
        break;
      case "speed": // Poeira leve nos pés.
        every(320, () => {
          const d = mote(Phaser.Math.Between(-6, 6), FEET - 2, 1.5, 0.45);
          scene.tweens.add({ targets: d, x: d.x + Phaser.Math.Between(-8, 8), scale: 2, alpha: 0, duration: 500, onComplete: () => d.destroy() });
        });
        break;
      case "holy": // Luz dourada subindo devagar.
        every(480, () => {
          const d = mote(Phaser.Math.Between(-10, 10), Phaser.Math.Between(top + 10, FEET - 4), 1, 0.75);
          scene.tweens.add({ targets: d, y: d.y - 8, alpha: 0, duration: 900, onComplete: () => d.destroy() });
        });
        break;
    }
  }
  root.once(Phaser.GameObjects.Events.DESTROY, () => events.forEach((e) => e.remove()));
  return root;
}
