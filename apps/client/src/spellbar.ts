import {
  MSG,
  SPELLS,
  SPELL_SLOT_LEVELS,
  spellChoices,
  heroBonuses,
  runeSpells,
  spellCooldownMs,
  spellManaCost,
  spellAtRank,
  spellFacts,
  type ClassId,
  type SpellDef,
  type SpellId,
  type SpellSlot,
} from "@kusa/shared";
import type { SpellAim } from "./aim.ts";
import { ChoiceCards, type Anchor } from "./choicecards.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";
import { stacksOf } from "./perkchoice.ts";

const SLOTS: SpellSlot[] = [0, 1];

/**
 * A magia como o herói a conjura: no nível ganho com o uso, com a Maestria no último (alcance e área podem mudar) e a
 * força extra das sinergias e do Tomo.
 */
export function rankedSpell(p: PlayerView | undefined, id: string): SpellDef | undefined {
  const base = SPELLS[id as SpellId] as SpellDef | undefined;
  return base && spellAtRank(base, p?.spellRanks.get(id) ?? 0, p?.spellBonus.get(id) ?? 0);
}

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
 * (cartas acima do personagem) que abre quando ele alcança o nível de um slot. Magia com alvo (única ou de área) mira
 * enquanto o polegar segura o botão (ver `SpellAim`); magia em volta de si sai no toque. O servidor valida tudo; aqui só
 * mostramos estado, recarga e mandamos as intenções.
 */
export class SpellBar {
  private slots: SlotView[];
  private chooser: ChoiceCards | null = null;
  /** Slot mirando agora e o dedo que segura o botão. */
  private aiming: { slot: SpellSlot; pointerId: number; x0: number; y0: number } | null = null;

  /**
   * A escolha de magia tem prioridade: o nível que abre um slot não dá melhoria, e uma melhoria que
   * ficou pendente de um nível anterior espera esta janela fechar (ver `PerkChoice`).
   */
  constructor(
    private room: DungeonRoom,
    private actions: HTMLElement,
    private aim: SpellAim,
    private anchor: Anchor,
  ) {
    // O slot 2 fica em cima: o 1, mais usado, fica mais perto do polegar.
    this.slots = SLOTS.map((slot) => this.makeButton(slot));
    actions.prepend(this.slots[1].button, this.slots[0].button);
  }

  /**
   * Teclado (1 e 2) ou toque sem mira de arrasto: conjura no alvo automático.
   * Slot vazio liberado abre a escolha.
   */
  press(slot: SpellSlot) {
    const p = this.me();
    if (!p || p.status !== "playing") return;
    if (p.level < SPELL_SLOT_LEVELS[slot]) return;
    const spell = rankedSpell(p, spellIn(p, slot));
    if (!spell) return this.openChooser(slot);
    this.room.send(MSG.cast, { slot });
  }

  /** O servidor mudou a recarga de um slot (a Maestria do Disparo Certeiro corta a recarga ao matar). */
  setCooldown(slot: SpellSlot, ms: number) {
    this.slots[slot].readyAt = performance.now() + ms;
  }

  /** Janela de escolha de magia aberta. */
  get choosing() {
    return this.chooser !== null;
  }

  /** O servidor confirmou uma magia nossa: começa a recarga do botão. */
  onCast(spellId: SpellId) {
    const spell = SPELLS[spellId];
    const view = this.slots[spell.slot];
    const p = this.me();
    view.cooldownMs = spellCooldownMs(spell.cooldownMs, heroBonuses(p ? stacksOf(p) : {}, p ? [...p.runes] : []));
    view.readyAt = performance.now() + view.cooldownMs;
  }

  update() {
    const p = this.me();
    if (!p) return;
    for (const slot of SLOTS) this.render(slot, p);
    this.chooser?.place(this.anchor);
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

  /** Encostou no botão: magia com alvo começa a mirar; as outras seguem o teclado (`press`). */
  private down(slot: SpellSlot, e: PointerEvent) {
    if (this.aiming) return;
    const p = this.me();
    const spell = p && rankedSpell(p, spellIn(p, slot));
    const ready = performance.now() >= this.slots[slot].readyAt;
    if (!p || !spell || spell.aim === "self" || !ready || p.mana < spellManaCost(spell, p.classId, p.maxMana)) return this.press(slot);
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

    // Magia de runa de outra classe pode custar menos (ver `spellManaCost`).
    const manaCost = spell ? spellManaCost(spell, p.classId, p.maxMana) : 0;
    let state: "locked" | "empty" | "ready" | "cooldown" | "nomana";
    if (p.level < unlockAt) state = "locked";
    else if (!spell) state = "empty";
    else if (left > 0) state = "cooldown";
    else if (p.mana < manaCost) state = "nomana";
    else state = "ready";

    // Liberou agora: abre a escolha sozinha (uma vez; depois, pelo botão ✨).
    // Com dois slots liberados ao mesmo tempo, um de cada vez: o próximo abre quando este fechar.
    if (state === "empty" && !view.offered && !this.chooser && p.status === "playing") {
      view.offered = true;
      this.openChooser(slot);
    }

    view.button.style.setProperty("--cd", state === "cooldown" ? String(left / view.cooldownMs) : "0");
    const key = `${state}|${spell?.id ?? ""}|${manaCost}|${state === "cooldown" ? Math.ceil(left / 1000) : ""}`;
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
      view.label.textContent = state === "cooldown" ? `${Math.ceil(left / 1000)}s` : `${manaCost}`;
      view.button.setAttribute("aria-label", `${spell.name} (${manaCost} de mana)`);
    }
    view.button.title = view.button.getAttribute("aria-label") ?? "";
  }

  /**
   * Escolha da magia do slot (a inicial da classe e as compradas no Grimório): as mesmas cartas da
   * melhoria de nível, acima do personagem, com os efeitos já no nível que a magia tem na conta.
   */
  private openChooser(slot: SpellSlot) {
    const p = this.me();
    if (!p) return;
    this.chooser?.remove();
    this.chooser = new ChoiceCards({
      kind: "spell",
      title: `Nova magia · slot ${slot + 1}`,
      onDismiss: () => this.closeChooser(),
      cards: spellChoices(p.classId as ClassId, slot, [...p.knownSpells], runeSpells([...p.runes])).map((spell) => {
        const rank = p.spellRanks.get(spell.id) ?? 0;
        const bonus = p.spellBonus.get(spell.id) ?? 0;
        return {
          icon: spell.icon,
          name: spell.name,
          description: spell.description,
          badge: `Nv ${rank}${bonus > 0 ? ` · +${Math.round(bonus * 100)}%` : ""}`,
          // A última linha é mana e recarga.
          details: spellFacts(spell, rank, bonus),
          onPick: () => {
            this.room.send(MSG.chooseSpell, { slot, spellId: spell.id });
            this.closeChooser();
          },
        };
      }),
    });
    this.chooser.place(this.anchor);
  }

  private closeChooser() {
    this.chooser?.remove();
    this.chooser = null;
  }
}

function spellIn(p: PlayerView, slot: SpellSlot) {
  return slot === 0 ? p.spell1 : p.spell2;
}
