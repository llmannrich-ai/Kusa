import { MSG, PERKS, isPerk, type PerkId, type PerkStacks } from "@kusa/shared";
import type { DungeonRoom, PlayerView } from "./net.ts";

/**
 * Escolha de melhoria ao subir de nível (os níveis que não abrem slot de magia): duas cartas lado a
 * lado no alto da tela, longe do joystick, enquanto o jogo segue rodando. Um toque escolhe. O
 * servidor sorteia as opções (`Player.perkOffer`) e valida a escolha; aqui só mostramos e mandamos.
 */
export class PerkChoice {
  private panel: HTMLElement | null = null;
  /** Oferta desenhada agora e a última escolhida (esperando o servidor trocar). */
  private shownKey = "";
  private sentKey = "";

  /** `busy` diz se outra janela (a escolha de magia) está aberta: uma de cada vez. */
  constructor(private room: DungeonRoom, private busy: () => boolean) {}

  /** Janela aberta agora (a escolha de magia espera ela fechar). */
  get open() {
    return this.panel !== null;
  }

  update() {
    const p = this.room.state.players.get(this.room.sessionId);
    const offer = p && p.status === "playing" ? [...p.perkOffer].filter(isPerk) : [];
    const key = p && offer.length > 0 ? `${offer.join(",")}|${totalStacks(p)}` : "";
    if (!key || key === this.sentKey) return this.close();
    if (key === this.shownKey || (!this.panel && this.busy())) return;
    this.render(p!, offer, key);
  }

  destroy() {
    this.close();
  }

  private render(p: PlayerView, offer: PerkId[], key: string) {
    this.panel?.remove();
    const panel = document.createElement("section");
    panel.className = "panel perk-choice";
    const title = document.createElement("h2");
    title.textContent = `Nível ${p.level}: escolha uma melhoria`;
    const list = document.createElement("div");
    list.className = "perk-options";
    const stacks = stacksOf(p);
    for (const id of offer) {
      const perk = PERKS[id];
      const option = document.createElement("button");
      option.className = "perk-option";
      option.innerHTML = `<span class="perk-icon"></span><strong></strong><small></small><em></em>`;
      option.querySelector(".perk-icon")!.textContent = perk.icon;
      option.querySelector("strong")!.textContent = perk.name;
      option.querySelector("small")!.textContent = perk.description;
      option.querySelector("em")!.textContent = `${(stacks[id] ?? 0) + 1}/${perk.maxStacks}`;
      option.setAttribute("aria-label", `${perk.name}: ${perk.description}`);
      option.onclick = () => {
        this.room.send(MSG.choosePerk, { perk: id });
        this.sentKey = key;
        this.close();
      };
      list.append(option);
    }
    panel.append(title, list);
    if (p.perksQueued > 0) {
      const more = document.createElement("p");
      more.className = "muted";
      more.textContent = `Mais ${p.perksQueued} na fila.`;
      panel.append(more);
    }
    document.body.append(panel);
    this.panel = panel;
    this.shownKey = key;
  }

  private close() {
    this.panel?.remove();
    this.panel = null;
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
