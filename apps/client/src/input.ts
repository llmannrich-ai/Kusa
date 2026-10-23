import type * as Phaser from "phaser";

export interface MoveVector { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }

/** Raio do joystick (px): até onde o pino vai. */
const RADIUS = 72;
const DEADZONE = 0.25;
/** Graus além da metade do setor (22,5°) que o dedo pode ir antes de trocar de direção: sem tremer na diagonal. */
const HYSTERESIS = 10;
/** Toque mais curto que isto, sem sair da zona morta, é um toque (travar alvo), não um passo. */
const TAP_MS = 250;

/** Fração de cima da tela que nunca abre o joystick (fica para ver o mapa e tocar em monstros). */
const JOYSTICK_TOP = 0.45;
/** Deitado, a tela é baixa: o joystick começa mais acima, abaixo do HUD. */
const JOYSTICK_TOP_LANDSCAPE = 0.4;

const DIRS: MoveVector[] = [
  { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
  { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
];

/**
 * Zona do joystick: metade esquerda, abaixo de `JOYSTICK_TOP` (a direita é do outro polegar: ataque e magias).
 * `x` e `y` são frações da largura e da altura da tela do jogo.
 */
export function inJoystickZone(x: number, y: number, landscape: boolean) {
  return x <= 0.5 && y >= (landscape ? JOYSTICK_TOP_LANDSCAPE : JOYSTICK_TOP);
}

/**
 * Entrada de movimento: joystick virtual flutuante (parte de baixo e à esquerda da tela) e WASD/setas no desktop.
 * O resultado é sempre uma das 8 direções, que é o que o servidor aceita.
 *
 * Na zona do joystick, todo toque vira joystick, até em cima de um monstro (antes o toque travava o alvo e o
 * herói não andava). Um toque rápido que não sai da zona morta chama `onTap`, que trava o alvo ali.
 */
export class MoveInput {
  private keys: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key> | null;
  private surface: HTMLElement;
  private base: HTMLElement;
  private knob: HTMLElement;
  private pointerId: number | null = null;
  private origin = { x: 0, y: 0 };
  private downAt = 0;
  /** Saiu da zona morta neste toque: já é movimento, não toque. */
  private moved = false;
  private sector: number | null = null;
  private stick: MoveVector = { dx: 0, dy: 0 };
  private onTap: (clientX: number, clientY: number) => void;

  constructor(scene: Phaser.Scene, surface: HTMLElement, onTap: (clientX: number, clientY: number) => void) {
    this.onTap = onTap;
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

  /** O toque (coordenadas da página) cai na zona do joystick. */
  inZone(clientX: number, clientY: number) {
    const rect = this.surface.getBoundingClientRect();
    return inJoystickZone((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height, rect.width > rect.height);
  }

  destroy() {
    this.surface.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    this.base.remove();
  }

  private onDown = (e: PointerEvent) => {
    if (this.pointerId !== null || !this.inZone(e.clientX, e.clientY)) return;
    // O joystick nasce onde o polegar toca.
    this.pointerId = e.pointerId;
    this.origin = { x: e.clientX, y: e.clientY };
    this.downAt = performance.now();
    this.moved = false;
    this.sector = null;
    this.stick = { dx: 0, dy: 0 };
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
    if (dist > RADIUS) {
      // A base acompanha o dedo que passa da borda: voltar para o outro lado troca de direção na hora.
      this.origin.x = e.clientX - (x / dist) * RADIUS;
      this.origin.y = e.clientY - (y / dist) * RADIUS;
      this.base.style.left = `${this.origin.x}px`;
      this.base.style.top = `${this.origin.y}px`;
      x = (x / dist) * RADIUS;
      y = (y / dist) * RADIUS;
    }
    this.setKnob(x, y);

    if (dist / RADIUS < DEADZONE) { this.stick = { dx: 0, dy: 0 }; this.sector = null; return; }
    this.moved = true;
    // 8 setores de 45°; perto da borda entre dois, fica na direção que já estava.
    const angle = (Math.atan2(y, x) * 180) / Math.PI;
    if (this.sector !== null) {
      const diff = Math.abs(((angle - this.sector * 45 + 540) % 360) - 180);
      if (diff <= 22.5 + HYSTERESIS) return;
    }
    this.sector = (Math.round(angle / 45) + 8) % 8;
    this.stick = DIRS[this.sector];
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const tap = !this.moved && performance.now() - this.downAt < TAP_MS;
    this.pointerId = null;
    this.sector = null;
    this.stick = { dx: 0, dy: 0 };
    this.base.hidden = true;
    if (tap) this.onTap(this.origin.x, this.origin.y);
  };

  private setKnob(x: number, y: number) {
    this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }
}
