import {
  MSG,
  SPELLS,
  SPELL_SLOT_LEVELS,
  spellChoices,
  type ClassId,
  type SpellDef,
  type SpellId,
  type SpellSlot,
} from "@kusa/shared";
import type { SpellAim } from "./aim.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";

const SLOTS: SpellSlot[] = [0, 1];

interface SlotView {
  button: HTMLButtonElement;
  icon: HTMLElement;
  label: HTMLElement;
  /** Fim da recarga em `performance.now()`. */
  readyAt: number;
  cooldownMs: number;
  /** A escolha já abriu sozinha uma vez quando o slot liberou. */
  offered: boolean;
  /** Último estado desenhado, para não mexer no DOM a cada quadro. */
  key: string;
}

/**
 * Botões dos 2 slots de magia (acima do ⚔️, na zona do polegar direito) e a janela de escolha
 * que abre quando o personagem alcança o nível de um slot. Magia de alvo mira enquanto o polegar
 * segura o botão (ver `SpellAim`); magia em volta de si sai no toque. O servidor valida tudo;
 * aqui só mostramos estado, recarga e mandamos as intenções.
 */
export class SpellBar {
  private slots: SlotView[];
  private chooser: HTMLElement | null = null;
  /** Slot mirando agora e o dedo que segura o botão. */
  private aiming: { slot: SpellSlot; pointerId: number; x0: number; y0: number } | null = null;

  constructor(private room: DungeonRoom, private actions: HTMLElement, private aim: SpellAim) {
    // O slot 2 fica em cima: o 1, mais usado, fica mais perto do polegar.
    this.slots = SLOTS.map((slot) => this.makeButton(slot));
    actions.prepend(this.slots[1].button, this.slots[0].button);
  }

  /** Conjura pelo teclado (1 e 2), no alvo automático; slot vazio liberado abre a escolha. */
  press(slot: SpellSlot) {
    const p = this.me();
    if (!p || p.status !== "playing") return;
    if (p.level < SPELL_SLOT_LEVELS[slot]) return;
    if (!spellIn(p, slot)) return this.openChooser(slot);
    this.room.send(MSG.cast, { slot });
  }

  /** O servidor confirmou uma magia nossa: começa a recarga do botão. */
  onCast(spellId: SpellId) {
    const spell = SPELLS[spellId];
    const view = this.slots[spell.slot];
    view.cooldownMs = spell.cooldownMs;
    view.readyAt = performance.now() + spell.cooldownMs;
  }

  update() {
    const p = this.me();
    if (!p) return;
    for (const slot of SLOTS) this.render(slot, p);
  }

  destroy() {
    this.aim.stop();
    this.slots.forEach((s) => s.button.remove());
    this.chooser?.remove();
  }

  private me(): PlayerView | undefined {
    return this.room.state.players.get(this.room.sessionId);
  }

  private makeButton(slot: SpellSlot): SlotView {
    const button = document.createElement("button");
    button.className = "action spell";
    const icon = document.createElement("span");
    icon.className = "spell-icon";
    const label = document.createElement("small");
    label.className = "spell-label";
    button.append(icon, label);
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); this.down(slot, e); });
    button.addEventListener("pointermove", (e) => this.drag(e));
    button.addEventListener("pointerup", (e) => this.up(e));
    button.addEventListener("pointercancel", (e) => this.up(e, true));
    return { button, icon, label, readyAt: 0, cooldownMs: 1, offered: false, key: "" };
  }

  /** Encostou no botão: magia de alvo começa a mirar; as outras saem na hora (como no teclado). */
  private down(slot: SpellSlot, e: PointerEvent) {
    if (this.aiming) return;
    const p = this.me();
    const spell = p && SPELLS[spellIn(p, slot) as SpellId] as SpellDef | undefined;
    const ready = performance.now() >= this.slots[slot].readyAt;
    if (!p || !spell || spell.aim === "self" || !ready || p.mana < spell.manaCost) return this.press(slot);
    // Segura o dedo no botão mesmo quando ele sai de cima, para o arrasto da mira chegar aqui.
    this.slots[slot].button.setPointerCapture(e.pointerId);
    this.aiming = { slot, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY };
    this.aim.start(spell);
    this.slots[slot].button.dataset.aim = "on";
  }

  private drag(e: PointerEvent) {
    const a = this.aiming;
    if (!a || e.pointerId !== a.pointerId) return;
    this.aim.move(e.clientX - a.x0, e.clientY - a.y0);
    this.slots[a.slot].button.dataset.aim = this.aim.cancelled ? "cancel" : "on";
  }

  /** Soltou: lança no ponto mirado, no alvo automático (toque rápido) ou nada (cancelou). */
  private up(e: PointerEvent, aborted = false) {
    const a = this.aiming;
    if (!a || e.pointerId !== a.pointerId) return;
    this.aiming = null;
    delete this.slots[a.slot].button.dataset.aim;
    const result = this.aim.finish();
    if (result && !aborted) this.room.send(MSG.cast, { slot: a.slot, ...result });
  }

  private render(slot: SpellSlot, p: PlayerView) {
    const view = this.slots[slot];
    const unlockAt = SPELL_SLOT_LEVELS[slot];
    const spell = SPELLS[spellIn(p, slot) as SpellId] as SpellDef | undefined;
    const left = Math.max(0, view.readyAt - performance.now());

    let state: "locked" | "empty" | "ready" | "cooldown" | "nomana";
    if (p.level < unlockAt) state = "locked";
    else if (!spell) state = "empty";
    else if (left > 0) state = "cooldown";
    else if (p.mana < spell.manaCost) state = "nomana";
    else state = "ready";

    // Liberou agora: abre a escolha sozinha (uma vez; depois, pelo botão ✨).
    // Com dois slots liberados ao mesmo tempo, um de cada vez: o próximo abre quando este fechar.
    if (state === "empty" && !view.offered && !this.chooser && p.status === "playing") {
      view.offered = true;
      this.openChooser(slot);
    }

    view.button.style.setProperty("--cd", state === "cooldown" ? String(left / view.cooldownMs) : "0");
    const key = `${state}|${spell?.id ?? ""}|${state === "cooldown" ? Math.ceil(left / 1000) : ""}`;
    if (key === view.key) return;
    view.key = key;
    view.button.dataset.state = state;
    if (state === "locked") {
      view.icon.textContent = "🔒";
      view.label.textContent = `Nv ${unlockAt}`;
      view.button.setAttribute("aria-label", `Slot de magia ${slot + 1}: abre no nível ${unlockAt}`);
    } else if (!spell) {
      view.icon.textContent = "✨";
      view.label.textContent = "Escolher";
      view.button.setAttribute("aria-label", `Escolher magia do slot ${slot + 1}`);
    } else {
      view.icon.textContent = spell.icon;
      view.label.textContent = state === "cooldown" ? `${Math.ceil(left / 1000)}s` : `${spell.manaCost}`;
      view.button.setAttribute("aria-label", `${spell.name} (${spell.manaCost} de mana)`);
    }
    view.button.title = view.button.getAttribute("aria-label") ?? "";
  }

  /** Janela de escolha da magia do slot: a inicial da classe e as compradas na árvore de magias. */
  private openChooser(slot: SpellSlot) {
    const p = this.me();
    if (!p) return;
    this.chooser?.remove();
    const panel = document.createElement("section");
    panel.className = "panel spell-choice";
    const title = document.createElement("h2");
    title.textContent = `Nova magia — slot ${slot + 1}`;
    const hint = document.createElement("p");
    hint.className = "muted";
    hint.textContent = "Escolha a magia deste slot. Ela fica com você até o fim da hunt.";
    const list = document.createElement("div");
    list.className = "spell-options";
    for (const spell of spellChoices(p.classId as ClassId, slot, [...p.knownSpells])) {
      const option = document.createElement("button");
      option.className = "spell-option";
      option.innerHTML = `<span class="spell-option-icon"></span><span><strong></strong><small></small><em></em></span>`;
      option.querySelector(".spell-option-icon")!.textContent = spell.icon;
      option.querySelector("strong")!.textContent = spell.name;
      option.querySelector("small")!.textContent = spell.description;
      option.querySelector("em")!.textContent = `${spell.manaCost} de mana · recarga ${spell.cooldownMs / 1000}s`;
      option.onclick = () => {
        this.room.send(MSG.chooseSpell, { slot, spellId: spell.id });
        this.closeChooser();
      };
      list.append(option);
    }
    const later = document.createElement("button");
    later.textContent = "Depois";
    later.onclick = () => this.closeChooser();
    panel.append(title, hint, list, later);
    document.body.append(panel);
    this.chooser = panel;
  }

  private closeChooser() {
    this.chooser?.remove();
    this.chooser = null;
  }
}

function spellIn(p: PlayerView, slot: SpellSlot) {
  return slot === 0 ? p.spell1 : p.spell2;
}
