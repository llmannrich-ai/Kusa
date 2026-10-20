import * as Phaser from "phaser";
import { SPELLS, TILE_SIZE, type ClassId, type SpellId } from "@kusa/shared";
import { FX } from "./art/combat.ts";

/** Efeitos ficam acima dos personagens e abaixo das barras de vida e números. */
const FX_DEPTH = 90_000;

interface Point { x: number; y: number }

/**
 * Efeitos de combate desenhados pelo cliente a partir dos eventos do servidor (`MSG.attack` e
 * `MSG.spell`). Nada aqui decide dano: os tempos de voo vêm do servidor para o impacto
 * desenhado coincidir com o número de dano.
 */
export class CombatFx {
  constructor(private scene: Phaser.Scene) {}

  basicAttack(classId: ClassId, from: Point, to: Point, ms: number) {
    switch (classId) {
      case "knight": return this.slash(from, to);
      case "paladin": return this.projectile(FX.arrow, from, to, ms);
      case "druid": return this.projectile(FX.greenLight, from, to, ms, { trail: 0x7bd36a, glow: 0x3fbf3a, impact: 0x9cff7a });
      case "sorcerer": return this.projectile(FX.darkLight, from, to, ms, { trail: 0x5a1c7a, glow: 0x8e44ad, impact: 0xb04ae0 });
    }
  }

  spell(spellId: SpellId, from: Point, to: Point, ms: number) {
    const radius = SPELLS[spellId].radius * TILE_SIZE;
    switch (spellId) {
      case "blade_spin": return this.bladeSpin(from);
      case "war_cry": return this.ring(from, radius, 0xe67e22, 500, 4);
      case "holy_arrow":
        this.projectile(FX.holyArrow, from, to, ms, { trail: 0xffe9a3, glow: 0xf7d774, impact: 0xfff6c8, scale: 1.5 });
        return this.later(ms, () => this.holyFlash(to));
      case "arrow_rain": return this.arrowRain(to, radius, ms);
      case "shadow_orb":
        this.projectile(FX.shadowOrb, from, to, ms, { trail: 0x2d0a40, glow: 0x6b2a9a, impact: 0xc77dff });
        return this.later(ms, () => this.ring(to, radius + TILE_SIZE / 2, 0x6b2a9a, 350, 6));
      case "void_storm": return this.voidStorm(from, radius);
      case "forest_blessing": return this.ring(from, radius, 0x2ecc71, 600, 3);
      case "thorn_roots": return this.ring(to, radius, 0x6b7a2a, 400, 5);
      // Compradas na árvore de magias.
      case "crushing_blow":
        this.slash(from, to);
        return this.later(120, () => this.ring(to, TILE_SIZE / 2, 0xd35400, 300, 6));
      case "iron_skin": return this.ring(from, TILE_SIZE * 0.8, 0xa4b0be, 500, 5);
      case "piercing_shot":
        this.projectile(FX.arrow, from, to, ms, { scale: 1.4 });
        return this.later(ms, () => this.ring(to, radius + TILE_SIZE / 2, 0xf1c40f, 300, 4));
      case "healing_light": return this.ring(from, radius, 0xfff6c8, 600, 3);
      case "lightning_bolt":
        this.projectile(FX.darkLight, from, to, ms, { trail: 0x9ec5ff, glow: 0x5dade2, impact: 0xffffff });
        return this.later(ms, () => this.sparks(to, 0x9ec5ff, 8));
      case "frost_nova": return this.ring(from, radius, 0x7fd8ff, 450, 6);
      case "venom_thorn": return this.projectile(FX.greenLight, from, to, ms, { trail: 0x6ab04c, glow: 0x2d6a1f, impact: 0xbadc58 });
      case "nature_wrath":
        this.projectile(FX.leaf, from, to, ms, { trail: 0x7bd36a, glow: 0x3fbf3a, impact: 0x9cff7a, scale: 1.5 });
        return this.later(ms, () => this.ring(to, radius, 0x3fbf3a, 450, 5));
    }
  }

  /** Brilho de cura subindo de um aliado (Bênção da Floresta). */
  heal(at: Point) {
    for (let i = 0; i < 6; i++) {
      const leaf = this.scene.add.image(at.x + Phaser.Math.Between(-10, 10), at.y + 8, FX.leaf).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: leaf,
        y: at.y - 18 - Phaser.Math.Between(0, 10),
        angle: Phaser.Math.Between(-90, 90),
        alpha: { from: 1, to: 0 },
        delay: i * 60,
        duration: 700,
        onComplete: () => leaf.destroy(),
      });
    }
  }

  // --- Ataques básicos ------------------------------------------------------

  /** Golpe de espada: meia-lua virada para o alvo, girando um pouco. */
  private slash(from: Point, to: Point) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const x = Phaser.Math.Linear(from.x, to.x, 0.6);
    const y = Phaser.Math.Linear(from.y, to.y, 0.6);
    const arc = this.scene.add.image(x, y, FX.slash).setDepth(FX_DEPTH).setRotation(angle - 0.9).setScale(0.8);
    this.scene.tweens.add({
      targets: arc,
      rotation: angle + 0.9,
      scale: 1.1,
      alpha: { from: 1, to: 0 },
      duration: 220,
      ease: "Cubic.Out",
      onComplete: () => arc.destroy(),
    });
    this.later(90, () => this.sparks(to, 0xffffff, 4));
  }

  /** Projétil reto até o alvo, com rastro e brilho opcionais. */
  private projectile(
    key: string, from: Point, to: Point, ms: number,
    opts: { trail?: number; glow?: number; impact?: number; scale?: number } = {},
  ) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
    const scale = opts.scale ?? 1;
    const parts: Phaser.GameObjects.GameObject[] = [];
    let glow: Phaser.GameObjects.Arc | undefined;
    if (opts.glow !== undefined) {
      glow = this.scene.add.circle(from.x, from.y - 6, 7 * scale, opts.glow, 0.35).setDepth(FX_DEPTH);
      parts.push(glow);
    }
    const shot = this.scene.add.image(from.x, from.y - 6, key).setDepth(FX_DEPTH).setRotation(angle).setScale(scale);
    parts.push(shot);
    const duration = Math.max(60, ms);
    let lastTrail = 0;
    this.scene.tweens.add({
      targets: glow ? [shot, glow] : shot,
      x: to.x,
      y: to.y - 6,
      duration,
      onUpdate: () => {
        if (opts.trail === undefined || this.scene.time.now - lastTrail < 30) return;
        lastTrail = this.scene.time.now;
        this.puff(shot.x, shot.y, opts.trail, 3 * scale);
      },
      onComplete: () => {
        parts.forEach((p) => p.destroy());
        if (opts.impact !== undefined) this.sparks({ x: to.x, y: to.y - 6 }, opts.impact, 6);
      },
    });
  }

  // --- Magias ---------------------------------------------------------------

  /** Giro da Lâmina: quatro meias-luas dando a volta no cavaleiro. */
  private bladeSpin(at: Point) {
    for (let i = 0; i < 4; i++) {
      const start = (i * Math.PI) / 2;
      const arc = this.scene.add.image(at.x, at.y, FX.slash).setDepth(FX_DEPTH).setScale(1.3).setOrigin(0, 0.5);
      this.scene.tweens.addCounter({
        from: 0, to: 1, duration: 420, ease: "Cubic.Out",
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          arc.setRotation(start + t * Math.PI * 2).setAlpha(1 - t * 0.8);
        },
        onComplete: () => arc.destroy(),
      });
    }
  }

  /** Flecha Sagrada: cruz de luz dourada no impacto. */
  private holyFlash(at: Point) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH).setPosition(at.x, at.y - 6);
    g.fillStyle(0xfff6c8, 0.9).fillRect(-2, -14, 4, 28).fillRect(-14, -2, 28, 4);
    g.fillStyle(0xf7d774, 0.5).fillCircle(0, 0, 9);
    this.scene.tweens.add({ targets: g, scale: { from: 0.4, to: 1.4 }, alpha: { from: 1, to: 0 }, duration: 350, onComplete: () => g.destroy() });
  }

  /** Chuva de Flechas: flechas caindo do alto sobre a área até a hora do impacto. */
  private arrowRain(center: Point, radius: number, ms: number) {
    const total = 14;
    const window = Math.max(200, ms);
    for (let i = 0; i < total; i++) {
      const tx = center.x + Phaser.Math.Between(-radius, radius);
      const ty = center.y + Phaser.Math.Between(-radius, radius);
      const delay = (i / total) * window * 0.7;
      this.later(delay, () => {
        const arrow = this.scene.add.image(tx - 10, ty - 90, FX.arrow).setDepth(FX_DEPTH).setRotation(Math.PI / 2 - 0.12);
        this.scene.tweens.add({
          targets: arrow, x: tx, y: ty, duration: window * 0.3 + 80, ease: "Quad.In",
          onComplete: () => {
            arrow.destroy();
            this.puff(tx, ty, 0xa08f78, 4);
          },
        });
      });
    }
  }

  /** Tempestade do Vazio: escuridão gira e explode até o raio. */
  private voidStorm(at: Point, radius: number) {
    this.ring(at, radius, 0x2d0a40, 550, 10);
    this.ring(at, radius * 0.7, 0x8e44ad, 450, 3);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const orb = this.scene.add.image(at.x, at.y, FX.darkLight).setDepth(FX_DEPTH);
      this.scene.tweens.add({
        targets: orb,
        x: at.x + Math.cos(a + 1) * radius,
        y: at.y + Math.sin(a + 1) * radius,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.4, to: 0.6 },
        duration: 520,
        ease: "Cubic.Out",
        onComplete: () => orb.destroy(),
      });
    }
    this.scene.cameras.main.shake(180, 0.004);
  }

  // --- Peças ------------------------------------------------------------------

  /** Onda circular que cresce até `radius` e some. */
  private ring(at: Point, radius: number, color: number, duration: number, width: number) {
    const g = this.scene.add.graphics().setDepth(FX_DEPTH);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration, ease: "Cubic.Out",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        g.clear().lineStyle(width * (1 - t * 0.6), color, 1 - t).strokeCircle(at.x, at.y, Math.max(2, radius * t));
        g.fillStyle(color, 0.18 * (1 - t)).fillCircle(at.x, at.y, Math.max(2, radius * t));
      },
      onComplete: () => g.destroy(),
    });
  }

  /** Faíscas saindo de um ponto. */
  private sparks(at: Point, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 8 + Math.random() * 8;
      const s = this.scene.add.image(at.x, at.y, FX.spark).setDepth(FX_DEPTH).setTint(color);
      this.scene.tweens.add({
        targets: s,
        x: at.x + Math.cos(a) * d,
        y: at.y + Math.sin(a) * d,
        alpha: { from: 1, to: 0 },
        duration: 260,
        onComplete: () => s.destroy(),
      });
    }
  }

  /** Fumacinha do rastro. */
  private puff(x: number, y: number, color: number, size: number) {
    const c = this.scene.add.circle(x, y, size, color, 0.6).setDepth(FX_DEPTH - 1);
    this.scene.tweens.add({ targets: c, scale: 0.2, alpha: 0, duration: 260, onComplete: () => c.destroy() });
  }

  private later(ms: number, fn: () => void) {
    if (ms <= 0) fn(); else this.scene.time.delayedCall(ms, fn);
  }
}
