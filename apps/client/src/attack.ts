import { BASIC_ATTACKS, MSG, attackCooldownMs, basicShotAim, heroBonuses, type ClassId } from "@kusa/shared";
import type { SpellAim } from "./aim.ts";
import type { DungeonRoom } from "./net.ts";
import { stacksOf } from "./perkchoice.ts";

/**
 * Espera (ms) antes de um dedo parado no ⚔️ do básico à distância virar "segurar" (repete sozinho). Antes disso, ou
 * ele arrasta (mira à mão) ou solta (um toque, um golpe). Curta o bastante para o toque não parecer atrasado.
 */
const HOLD_DELAY_MS = 150;

/**
 * Botão de ataque básico (⚔️), o mais perto do polegar direito. Um toque dá um golpe; segurar
 * repete no ritmo da recarga, que é a mesma para todas as classes (a Fúria encurta). O servidor escolhe o alvo
 * (o travado ou o mais próximo ao alcance) e decide quando o golpe sai; aqui só avisamos
 * quando o botão é apertado e solto. No desktop, a barra de espaço faz o mesmo.
 *
 * Básico à distância (Paladino, Feiticeiro, Druida): o tiro pode errar. Arrastar a partir do botão mira à mão,
 * com a mesma mira das magias (`SpellAim`): soltar atira na direção mirada, voltar ao botão cancela.
 */
export class AttackButton {
  readonly button: HTMLButtonElement;
  /** Dedos (ou a tecla) segurando o ataque agora. */
  private holders = new Set<number | "key">();
  /** Fim da recarga do último golpe, em `performance.now()`. */
  private readyAt = 0;
  private cooldownMs = 1;
  /** Dedo no ⚔️ do básico à distância: ainda decidindo entre toque, segurar e mirar. */
  private aiming: { pointerId: number; x0: number; y0: number; timer: number; manual: boolean; session: number } | null = null;

  constructor(private room: DungeonRoom, actions: HTMLElement, private aim: SpellAim) {
    const button = document.createElement("button");
    button.className = "action attack";
    button.textContent = "⚔️";
    button.title = "Atacar (segure para repetir; arraste para mirar)";
    button.setAttribute("aria-label", button.title);
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      this.down(e);
    });
    button.addEventListener("pointermove", (e) => this.drag(e));
    button.addEventListener("pointerup", (e) => this.up(e));
    button.addEventListener("pointercancel", (e) => this.up(e, true));
    button.addEventListener("lostpointercapture", (e) => this.up(e, true));
    // Rede de segurança: o dedo saiu da tela sem o `pointerup` chegar no botão (iPhone): termina por aqui.
    window.addEventListener("pointerup", this.onWindowUp);
    window.addEventListener("pointercancel", this.onWindowCancel);
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
    this.releaseAll();
    window.removeEventListener("pointerup", this.onWindowUp);
    window.removeEventListener("pointercancel", this.onWindowCancel);
    window.removeEventListener("blur", this.releaseAll);
    document.removeEventListener("visibilitychange", this.releaseAll);
    this.button.remove();
  }

  /** Corpo a corpo (ou outra mira já aberta): segura na hora, como sempre. À distância: espera para ver se arrasta. */
  private down(e: PointerEvent) {
    const p = this.room.state.players.get(this.room.sessionId);
    const ranged = p && BASIC_ATTACKS[p.classId as ClassId]?.projectileSpeed > 0;
    if (!p || !ranged || this.aiming || this.aim.active) return this.hold(e.pointerId);
    const pointerId = e.pointerId;
    const timer = window.setTimeout(() => {
      // Ficou parado: vira segurar (repete sozinho). Ainda dá para arrastar e mirar depois.
      if (this.aiming?.pointerId === pointerId && !this.aiming.manual) this.hold(pointerId);
    }, HOLD_DELAY_MS);
    // O ⚔️ mira sozinho no toque (alvo automático); a mira é a mesma linha pontilhada das magias.
    const session = this.aim.start(basicShotAim(p.basicRange), { auto: true });
    this.aiming = { pointerId, x0: e.clientX, y0: e.clientY, timer, manual: false, session };
  }

  private drag(e: PointerEvent) {
    const a = this.aiming;
    if (!a || e.pointerId !== a.pointerId || !this.aim.owns(a.session)) return;
    this.aim.move(e.clientX - a.x0, e.clientY - a.y0);
    if (!a.manual && this.aim.aimed) {
      // Saiu do botão: agora é mira à mão. Para a repetição, se já tinha começado.
      a.manual = true;
      window.clearTimeout(a.timer);
      this.release(a.pointerId);
    }
    if (a.manual) this.button.dataset.aim = this.aim.cancelled ? "cancel" : "on";
  }

  /** Soltou: mirado à mão, atira no tile; parado e rápido, um toque; segurando, para de repetir. */
  private up(e: PointerEvent, aborted = false) {
    const a = this.aiming;
    if (!a || e.pointerId !== a.pointerId) return this.release(e.pointerId);
    this.aiming = null;
    window.clearTimeout(a.timer);
    delete this.button.dataset.aim;
    // Uma magia tomou a mira depois (dois dedos): a dela fica; o ⚔️ só solta o botão.
    if (!this.aim.owns(a.session)) return this.release(a.pointerId);
    if (a.manual) {
      const result = this.aim.finish();
      if (result?.aim && !aborted) this.room.send(MSG.attacking, { on: true, aim: { x: result.aim.x, y: result.aim.y } });
      return;
    }
    this.aim.stop();
    if (aborted) return this.release(a.pointerId);
    // Soltou antes de virar segurar: um toque, um golpe (como o toque no corpo a corpo).
    if (!this.holders.has(a.pointerId)) this.hold(a.pointerId);
    this.release(a.pointerId);
  }

  /** Só termina o que é deste botão: o dedo que mira o ⚔️ ou que o segura (a tecla Espaço não passa por aqui). */
  private onWindowUp = (e: PointerEvent) => {
    if (this.aiming?.pointerId === e.pointerId || this.holders.has(e.pointerId)) this.up(e);
  };
  private onWindowCancel = (e: PointerEvent) => {
    if (this.aiming?.pointerId === e.pointerId || this.holders.has(e.pointerId)) this.up(e, true);
  };

  private releaseAll = () => {
    if (this.aiming) {
      window.clearTimeout(this.aiming.timer);
      if (this.aim.owns(this.aiming.session)) this.aim.stop();
      this.aiming = null;
      delete this.button.dataset.aim;
    }
    for (const holder of [...this.holders]) this.release(holder);
  };
}
