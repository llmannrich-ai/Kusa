import type * as Phaser from "phaser";

export interface MoveVector { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

const RADIUS = 56;
const DEADZONE = 0.3;

/**
 * Entrada de movimento: joystick virtual flutuante (metade esquerda da tela, toque)
 * e WASD/setas no desktop. O resultado é sempre uma das 8 direções, que é o que o servidor aceita.
 */
export class MoveInput {
  private keys: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key> | null;
  private surface: HTMLElement;
  private base: HTMLElement;
  private knob: HTMLElement;
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private stick: MoveVector = { dx: 0, dy: 0 };

  constructor(scene: Phaser.Scene, surface: HTMLElement) {
    this.keys = (scene.input.keyboard?.addKeys("up,down,left,right,w,a,s,d") as MoveInput["keys"]) ?? null;
    this.surface = surface;

    this.base = document.createElement("div");
    this.base.className = "joystick";
    this.knob = document.createElement("div");
    this.knob.className = "joystick-knob";
    this.base.append(this.knob);
    this.base.hidden = true;
    document.body.append(this.base);

    surface.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);
  }

  /** Direção atual; o joystick tem prioridade sobre o teclado. */
  vector(): MoveVector {
    if (this.pointerId !== null) return this.stick;
    const k = this.keys;
    if (!k) return { dx: 0, dy: 0 };
    const dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    return { dx: dx as MoveVector["dx"], dy: dy as MoveVector["dy"] };
  }

  destroy() {
    this.surface.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    this.base.remove();
  }

  private onDown = (e: PointerEvent) => {
    // A metade direita fica livre para tocar em monstros e nos botões de ação.
    if (this.pointerId !== null || e.clientX > window.innerWidth / 2) return;
    this.pointerId = e.pointerId;
    this.origin = { x: e.clientX, y: e.clientY };
    this.base.style.left = `${e.clientX}px`;
    this.base.style.top = `${e.clientY}px`;
    this.base.hidden = false;
    this.setKnob(0, 0);
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    let x = e.clientX - this.origin.x;
    let y = e.clientY - this.origin.y;
    const dist = Math.hypot(x, y);
    if (dist > RADIUS) { x = (x / dist) * RADIUS; y = (y / dist) * RADIUS; }
    this.setKnob(x, y);

    if (dist / RADIUS < DEADZONE) { this.stick = { dx: 0, dy: 0 }; return; }
    // 8 setores de 45°.
    const sector = Math.round(Math.atan2(y, x) / (Math.PI / 4));
    const dirs: MoveVector[] = [
      { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
      { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    ];
    this.stick = dirs[(sector + 8) % 8];
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.stick = { dx: 0, dy: 0 };
    this.base.hidden = true;
  };

  private setKnob(x: number, y: number) {
    this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }
}
