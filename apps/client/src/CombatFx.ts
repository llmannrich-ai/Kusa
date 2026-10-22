import * as Phaser from "phaser";
import type { AttackFx } from "@kusa/shared";
import { BLOOD_TEXTURE, FX_ANIM, FX_TEXTURE } from "./art/textures.ts";

export interface Point { x: number; y: number }

/** Quem bate se inclina na direção do golpe por este deslocamento (px), somado à posição do sprite. */
export interface Lunge { x: number; y: number }

/** Projétil de cada ataque à distância: textura, se gira no voo e o impacto na chegada (a flecha só fura). */
const PROJECTILES: Partial<Record<AttackFx, { texture: string; spin: boolean; impact: string | null; anim: boolean }>> = {
  arrow: { texture: FX_TEXTURE.arrow, spin: false, impact: null, anim: false },
  energy: { texture: FX_TEXTURE.energyBolt, spin: true, impact: FX_TEXTURE.energyHit, anim: false },
  nature: { texture: FX_TEXTURE.leaf, spin: false, impact: FX_TEXTURE.natureHit, anim: false },
  fire: { texture: FX_TEXTURE.fireball, spin: true, impact: FX_ANIM.fireBurst, anim: true },
};

const MELEE_IMPACT: Partial<Record<AttackFx, string>> = {
  slash: FX_ANIM.slash,
  bite: FX_ANIM.bite,
  smash: FX_ANIM.smash,
};

/** Velocidade dos projéteis (px por ms) e limites do voo. */
const PROJECTILE_SPEED = 0.45;
const FLIGHT_MS = { min: 90, max: 320 };
const LUNGE_PX = 6;
/** Manchas de sangue no chão ao mesmo tempo (as mais antigas somem primeiro). */
const MAX_DECALS = 40;

/**
 * Efeitos de combate no estilo do Tibia: avanço de quem bate, projéteis, impactos, piscar de dano,
 * sangue no chão e cadáver. Só visual: o servidor já decidiu o dano antes de tudo isso.
 */
export class CombatFx {
  private decals: Phaser.GameObjects.Image[] = [];

  /** `fxDepth` fica acima dos personagens e abaixo de barras e números; `decalDepth` logo acima do chão. */
  constructor(private scene: Phaser.Scene, private fxDepth: number, private decalDepth: number) {}

  /**
   * Toca o golpe de `from` no alvo e chama `onImpact` quando ele acerta
   * (na hora, corpo a corpo; na chegada do projétil, à distância).
   * `target` dá a posição atual do alvo: o projétil persegue quem anda durante o voo.
   */
  attack(fx: AttackFx, from: Point, target: () => Point, lunge: Lunge | null, onImpact: () => void) {
    const projectile = PROJECTILES[fx];
    const start = target();
    if (lunge) this.lunge(lunge, from, start, projectile ? 2 : LUNGE_PX);
    if (!projectile) {
      this.impact(MELEE_IMPACT[fx] ?? FX_ANIM.slash, true, start, from.x > start.x);
      onImpact();
      return;
    }
    const distance = Phaser.Math.Distance.Between(from.x, from.y, start.x, start.y);
    const duration = Phaser.Math.Clamp(distance / PROJECTILE_SPEED, FLIGHT_MS.min, FLIGHT_MS.max);
    const shot = this.scene.add.image(from.x, from.y - 6, projectile.texture).setDepth(this.fxDepth);
    if (projectile.texture === FX_TEXTURE.fireball) shot.setScale(0.8);
    const flight = { t: 0 };
    const place = () => {
      const to = target();
      const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
      shot.setPosition(Phaser.Math.Linear(from.x, to.x, flight.t), Phaser.Math.Linear(from.y, to.y, flight.t) - 6);
      shot.setRotation(projectile.spin ? angle + flight.t * Math.PI * 2 : angle);
    };
    place();
    this.scene.tweens.add({
      targets: flight,
      t: 1,
      duration,
      onUpdate: place,
      onComplete: () => {
        shot.destroy();
        const to = target();
        if (projectile.impact) this.impact(projectile.impact, projectile.anim, to, from.x > to.x);
        onImpact();
      },
    });
  }

  /** Pisca o sprite de branco por um instante, como no Tibia quando alguém apanha. */
  flash(sprite: Phaser.GameObjects.Sprite) {
    sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => { if (sprite.active) sprite.clearTint(); });
  }

  /** Respingo de sangue no chão perto de `at`. */
  bleed(at: Point, tint?: number) {
    const jitter = () => Phaser.Math.Between(-6, 6);
    this.decal(BLOOD_TEXTURE.splat, { x: at.x + jitter(), y: at.y + jitter() + 6 }, 0.85, 6000, tint);
  }

  /**
   * Morte: o sprite cai de lado e some; no lugar fica uma poça de sangue (ou poeira, se não sangra).
   * `sprite` é copiado, porque a unidade original é destruída em seguida.
   */
  death(sprite: Phaser.GameObjects.Sprite, at: Point, bleeds: boolean, tint?: number) {
    const corpse = this.scene.add.sprite(at.x, at.y + sprite.y, sprite.texture.key, sprite.frame.name)
      .setOrigin(0.5, 1)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setDepth(this.decalDepth + 1)
      .setTint(0xff6a6a);
    this.scene.tweens.add({
      targets: corpse,
      angle: corpse.flipX ? -90 : 90,
      y: corpse.y - 4,
      duration: 220,
      ease: "Quad.In",
      onComplete: () => {
        corpse.setTint(0x6a5a50);
        this.scene.tweens.add({ targets: corpse, alpha: 0, delay: 1800, duration: 900, onComplete: () => corpse.destroy() });
      },
    });
    if (bleeds) this.decal(BLOOD_TEXTURE.puddle, { x: at.x, y: at.y + 8 }, 1, 15000, tint);
    else this.impact(FX_ANIM.smash, true, at, false);
  }

  private lunge(lunge: Lunge, from: Point, to: Point, px: number) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    this.scene.tweens.add({
      targets: lunge,
      x: Math.round(Math.cos(angle) * px),
      y: Math.round(Math.sin(angle) * px),
      duration: 70,
      yoyo: true,
      ease: "Quad.Out",
      onComplete: () => { lunge.x = 0; lunge.y = 0; },
    });
  }

  /** Impacto em cima do alvo: animação de quadros (some ao terminar) ou imagem que estoura e some. */
  private impact(key: string, animated: boolean, at: Point, flip: boolean) {
    if (animated) {
      const sprite = this.scene.add.sprite(at.x, at.y - 4, key).setDepth(this.fxDepth).setFlipX(flip);
      sprite.play(key);
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
      return;
    }
    const image = this.scene.add.image(at.x, at.y - 4, key).setDepth(this.fxDepth).setScale(0.4);
    this.scene.tweens.add({ targets: image, scale: 1, alpha: 0, duration: 260, ease: "Quad.Out", onComplete: () => image.destroy() });
  }

  /** Mancha no chão (variação aleatória da faixa, na cor `tint` se o sangue não for vermelho) que desbota e some. */
  private decal(key: string, at: Point, alpha: number, lifeMs: number, tint?: number) {
    const frames = this.scene.textures.get(key).frameTotal - 1;
    const image = this.scene.add.image(at.x, at.y, key, Phaser.Math.Between(0, frames - 1))
      .setDepth(this.decalDepth)
      .setAlpha(alpha)
      .setFlipX(Math.random() < 0.5);
    if (tint !== undefined) image.setTint(tint);
    this.decals.push(image);
    if (this.decals.length > MAX_DECALS) this.decals.shift()?.destroy();
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      delay: lifeMs * 0.7,
      duration: lifeMs * 0.3,
      onComplete: () => {
        this.decals = this.decals.filter((d) => d !== image);
        image.destroy();
      },
    });
  }
}
