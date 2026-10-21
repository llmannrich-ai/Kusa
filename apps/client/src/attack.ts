import { MSG, attackCooldownMs } from "@kusa/shared";
import type { DungeonRoom } from "./net.ts";
import { stacksOf } from "./perkchoice.ts";

/**
 * Botão de ataque básico (⚔️), o mais perto do polegar direito. Um toque dá um golpe; segurar
 * repete no ritmo da recarga, que é a mesma para todas as classes (a Fúria encurta). O servidor escolhe o alvo
 * (o travado ou o mais próximo ao alcance) e decide quando o golpe sai; aqui só avisamos
 * quando o botão é apertado e solto. No desktop, a barra de espaço faz o mesmo.
 */
export class AttackButton {
  readonly button: HTMLButtonElement;
  /** Dedos (ou a tecla) segurando o ataque agora. */
  private holders = new Set<number | "key">();
  /** Fim da recarga do último golpe, em `performance.now()`. */
  private readyAt = 0;
  private cooldownMs = 1;

  constructor(private room: DungeonRoom, actions: HTMLElement) {
    const button = document.createElement("button");
    button.className = "action attack";
    button.textContent = "⚔️";
    button.title = "Atacar (segure para repetir)";
    button.setAttribute("aria-label", button.title);
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      this.hold(e.pointerId);
    });
    button.addEventListener("pointerup", (e) => this.release(e.pointerId));
    button.addEventListener("pointercancel", (e) => this.release(e.pointerId));
    button.addEventListener("lostpointercapture", (e) => this.release(e.pointerId));
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
    this.cooldownMs = attackCooldownMs(p ? stacksOf(p) : {});
    this.readyAt = performance.now() + this.cooldownMs;
  }

  update() {
    const left = Math.max(0, this.readyAt - performance.now());
    this.button.style.setProperty("--cd", String(left / this.cooldownMs));
  }

  destroy() {
    this.releaseAll();
    window.removeEventListener("blur", this.releaseAll);
    document.removeEventListener("visibilitychange", this.releaseAll);
    this.button.remove();
  }

  private releaseAll = () => {
    for (const holder of [...this.holders]) this.release(holder);
  };
}
