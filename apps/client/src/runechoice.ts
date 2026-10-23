import { MSG, RUNES, isRune, runeEffect, tileDistance } from "@kusa/shared";
import { ChoiceCards, type Anchor } from "./choicecards.ts";
import type { DungeonRoom } from "./net.ts";

/**
 * Baús de runa da caverna do deserto: colado num baú destrancado (o boss já morreu) e sem runa escolhida, aparece
 * a carta daquela runa logo acima do personagem; um toque leva a runa para a bag. Para trocar de ideia, basta ir
 * para o baú do lado. O servidor confere tudo (`Hunt.chooseRune`); aqui só mostramos e mandamos.
 * Espera a escolha de magia e a de melhoria: uma janela de cada vez.
 */
export class RuneChoice {
  private cards: ChoiceCards | null = null;
  private shownChest = "";
  private sentChest = "";

  constructor(private room: DungeonRoom, private busy: () => boolean, private anchor: Anchor) {}

  update() {
    const chest = this.nearChest();
    // Longe dos baús, uma escolha recusada (bag cheia) pode ser tentada de novo.
    if (!chest) this.sentChest = "";
    if (!chest || chest === this.sentChest || this.busy()) return this.close();
    if (chest !== this.shownChest) this.render(chest);
    this.cards?.place(this.anchor);
  }

  destroy() {
    this.close();
  }

  /** Baú de runa destrancado colado no jogador, se ele ainda não escolheu a sua. */
  private nearChest() {
    const p = this.room.state.players.get(this.room.sessionId);
    if (!p || p.status !== "playing" || p.chosenRune) return "";
    let found = "";
    this.room.state.chests.forEach((c, id) => {
      if (!found && c.rune && !c.locked && tileDistance(p.x, p.y, c.x, c.y) <= 1) found = id;
    });
    return found;
  }

  private render(chestId: string) {
    this.cards?.remove();
    const runeId = this.room.state.chests.get(chestId)?.rune ?? "";
    if (!isRune(runeId)) return;
    const rune = RUNES[runeId];
    this.cards = new ChoiceCards({
      kind: "perk",
      title: "Baú de runa · escolha só uma",
      cards: [{
        icon: rune.icon,
        name: rune.name,
        description: runeEffect(rune),
        badge: "Levar",
        onPick: () => {
          this.room.send(MSG.chooseRune, { chest: chestId });
          this.sentChest = chestId;
          this.close();
        },
      }],
    });
    this.shownChest = chestId;
  }

  private close() {
    this.cards?.remove();
    this.cards = null;
    this.shownChest = "";
  }
}
