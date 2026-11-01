import { MSG, attackCooldownMs, heroBonuses } from "@kusa/shared";
import type { SpellAim } from "./aim.ts";
import type { DungeonRoom } from "./net.ts";
import { stacksOf } from "./perkchoice.ts";

/**
 * Botão de ataque básico (⚔️), o mais perto do polegar direito. Um toque dá um golpe; segurar
 * repete no ritmo da recarga, que é a mesma para todas as classes (a Fúria encurta). O servidor escolhe o alvo
 * (o travado ou o mais próximo ao alcance) e decide quando o golpe sai; aqui só avisamos
 * quando o botão é apertado e solto. No desktop, a barra de espaço faz o mesmo.
 *
 * Com a Mira no ataque (Configurações), o ⚔️ ganha o gesto das magias de alvo único: arrastar a partir do botão mira
 * (a mira gruda no monstro a até 1 tile do ponto), soltar trava o alvo nele e dá um golpe, voltar ao botão cancela.
 * Toque rápido e segurar parado continuam como antes; o segurar só começa depois de `HOLD_DELAY_MS`, para o arrasto
 * não soltar um golpe no alvo automático antes de mirar.
 */
/** Tempo parado no botão (ms) até o segurar começar a repetir golpes, com a Mira no ataque ligada. */
const HOLD_DELAY_MS = 200;

export class AttackButton {
  readonly button: HTMLButtonElement;
  /** Dedos (ou a tecla) segurando o ataque agora. */
  private holders = new Set<number | "key">();
  /** Fim da recarga do último golpe, em `performance.now()`. */
  private readyAt = 0;
  private cooldownMs = 1;
  /** Dedo mirando com o ⚔️ (só com a Mira no ataque) e o temporizador que liga o segurar. */
  private aiming: { pointerId: number; x0: number; y0: number; timer: number } | null = null;

  /**
   * `aim` só vem com a Mira no ataque ligada; `lock` trava o alvo (o mesmo que tocar no monstro).
   */
  constructor(
    private room: DungeonRoom,
    actions: HTMLElement,
    private aim: SpellAim | null = null,
    private lock: (id: string) => void = () => {},
  ) {
    const button = document.createElement("button");
    button.className = "action attack";
    button.textContent = "⚔️";
    button.title = "Atacar (segure para repetir)";
    button.setAttribute("aria-label", button.title);
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      if (this.aim && !this.aim.active && !this.aiming) this.startAim(e);
      else this.hold(e.pointerId);
    });
    button.addEventListener("pointermove", (e) => this.dragAim(e));
    button.addEventListener("pointerup", (e) => this.endAim(e, false) || this.release(e.pointerId));
    button.addEventListener("pointercancel", (e) => this.endAim(e, true) || this.release(e.pointerId));
    button.addEventListener("lostpointercapture", (e) => this.endAim(e, true) || this.release(e.pointerId));
    // App em segundo plano ou aba trocada: solta, para o ataque não ficar preso.
    window.addEventListener("blur", this.releaseAll);
    document.addEventListener("visibilitychange", this.releaseAll);
    actions.append(button);
    this.button = button;
  }

  hold(holder: number | "key") {
    const was = this.holders.size > 0;
    this.holders.add(holder);
    // Cada toque conta como um golpe, mesmo com o botão já apertado por outro dedo.
    if (!was || holder !== "key") this.room.send(MSG.attacking, { on: true });
    this.button.classList.add("held");
  }

  release(holder: number | "key") {
    if (!this.holders.delete(holder) || this.holders.size > 0) return;
    this.room.send(MSG.attacking, { on: false });
    this.button.classList.remove("held");
  }

  /** O servidor confirmou um golpe nosso: começa a recarga do botão. */
  onAttack() {
    const p = this.room.state.players.get(this.room.sessionId);
    this.cooldownMs = attackCooldownMs(heroBonuses(p ? stacksOf(p) : {}, p ? [...p.runes] : []));
    this.readyAt = performance.now() + this.cooldownMs;
  }

  update() {
    const left = Math.max(0, this.readyAt - performance.now());
    this.button.style.setProperty("--cd", String(left / this.cooldownMs));
  }

  destroy() {
    if (this.aiming) {
      clearTimeout(this.aiming.timer);
      this.aiming = null;
      this.aim?.stop();
    }
    this.releaseAll();
    window.removeEventListener("blur", this.releaseAll);
    document.removeEventListener("visibilitychange", this.releaseAll);
    this.button.remove();
  }

  /** Encostou no ⚔️ com a Mira no ataque: mostra o alcance e o alvo automático; parado um instante, vira segurar. */
  private startAim(e: PointerEvent) {
    const pointerId = e.pointerId;
    const timer = window.setTimeout(() => {
      if (this.aiming?.pointerId === pointerId && !this.aim!.dragging) this.hold(pointerId);
    }, HOLD_DELAY_MS);
    this.aiming = { pointerId, x0: e.clientX, y0: e.clientY, timer };
    this.aim!.startAttack();
    this.button.dataset.aim = "on";
  }

  private dragAim(e: PointerEvent) {
    const a = this.aiming;
    if (!a || e.pointerId !== a.pointerId) return;
    this.aim!.move(e.clientX - a.x0, e.clientY - a.y0);
    // Começou a mirar: para de repetir golpes no alvo automático.
    if (this.aim!.dragging) this.release(a.pointerId);
    this.button.dataset.aim = this.aim!.cancelled ? "cancel" : "on";
  }

  /**
   * Soltou o ⚔️ com a Mira no ataque. Arrastou até um monstro: trava o alvo nele e dá um golpe; arrastou para o
   * vazio ou voltou ao botão: nada. Sem arrastar: um golpe (toque rápido) ou fim do segurar. Devolve se tratou o dedo.
   */
  private endAim(e: PointerEvent, aborted: boolean): boolean {
    const a = this.aiming;
    if (!a || e.pointerId !== a.pointerId) return false;
    this.aiming = null;
    clearTimeout(a.timer);
    delete this.button.dataset.aim;
    const manual = this.aim!.dragging;
    const result = this.aim!.finish();
    if (aborted || !manual) {
      // Toque rápido: um golpe (o servidor guarda o toque por uma recarga). Segurando: só solta.
      if (!aborted && !this.holders.has(a.pointerId)) this.hold(a.pointerId);
      this.release(a.pointerId);
      return true;
    }
    const id = result?.aim?.targetId;
    if (id) {
      this.lock(id);
      this.hold(a.pointerId);
      this.release(a.pointerId);
    }
    return true;
  }

  private releaseAll = () => {
    for (const holder of [...this.holders]) this.release(holder);
  };
}
