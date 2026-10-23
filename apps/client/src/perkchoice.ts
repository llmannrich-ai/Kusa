import { MSG, PERKS, isPerk, type PerkId, type PerkStacks } from "@kusa/shared";
import { ChoiceCards, type Anchor } from "./choicecards.ts";
import type { DungeonRoom, PlayerView } from "./net.ts";

/**
 * Escolha de melhoria ao subir de nível (só os níveis que não abrem slot de magia): cartas logo acima
 * do personagem, acompanhando ele, enquanto o jogo segue rodando (ver `ChoiceCards`). Cada carta mostra
 * nome, efeito e quantas vezes já foi escolhida; um toque escolhe. O servidor sorteia as opções
 * (`Player.perkOffer`) e valida a escolha; aqui só mostramos e mandamos.
 * Uma melhoria pendente sai da tela enquanto a escolha de magia estiver aberta e volta depois.
 */
export class PerkChoice {
  private cards: ChoiceCards | null = null;
  /** Oferta desenhada agora e a última escolhida (esperando o servidor trocar). */
  private shownKey = "";
  private sentKey = "";

  /** Cartas na tela agora (a escolha de runa espera). */
  get open() {
    return this.cards !== null;
  }

  /** `busy` diz se a escolha de magia está aberta: ela tem prioridade, uma janela de cada vez. */
  constructor(private room: DungeonRoom, private busy: () => boolean, private anchor: Anchor) {}

  update() {
    const p = this.room.state.players.get(this.room.sessionId);
    const offer = p && p.status === "playing" ? [...p.perkOffer].filter(isPerk) : [];
    const key = p && offer.length > 0 ? `${offer.join(",")}|${totalStacks(p)}` : "";
    if (!key || key === this.sentKey || this.busy()) return this.close();
    if (key !== this.shownKey) this.render(p!, offer, key);
    this.cards?.place(this.anchor);
  }

  destroy() {
    this.close();
  }

  private render(p: PlayerView, offer: PerkId[], key: string) {
    this.cards?.remove();
    const stacks = stacksOf(p);
    this.cards = new ChoiceCards({
      kind: "perk",
      title: `Nível ${p.perkLevel || p.level} · escolha uma melhoria`,
      cards: offer.map((id) => {
        const perk = PERKS[id];
        const have = stacks[id] ?? 0;
        return {
          icon: perk.icon,
          name: perk.name,
          description: perk.description,
          badge: have > 0 ? `${have + 1}ª vez` : "Nova",
          pips: { filled: have, total: perk.maxStacks },
          onPick: () => {
            this.room.send(MSG.choosePerk, { perk: id });
            this.sentKey = key;
            this.close();
          },
        };
      }),
    });
    this.shownKey = key;
  }

  private close() {
    this.cards?.remove();
    this.cards = null;
    this.shownKey = "";
  }
}

/** Melhorias escolhidas pelo jogador, no formato das regras compartilhadas. */
export function stacksOf(p: PlayerView): PerkStacks {
  return Object.fromEntries(p.perks.entries()) as PerkStacks;
}

function totalStacks(p: PlayerView) {
  let n = 0;
  p.perks.forEach((v) => { n += v; });
  return n;
}
