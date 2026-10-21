import { MSG, PERKS, isPerk, type PerkId, type PerkStacks } from "@kusa/shared";
import type { DungeonRoom, PlayerView } from "./net.ts";

/** Ponto da tela (px do documento) logo acima da cabeça do personagem, ou null se ele não estiver na tela. */
export type Anchor = () => { x: number; y: number } | null;

/**
 * Escolha de melhoria ao subir de nível (só os níveis que não abrem slot de magia): dois ícones
 * pequenos logo acima do personagem, acompanhando ele, enquanto o jogo segue rodando. Um toque
 * escolhe; o nome e o efeito ficam no rótulo acessível (e no `title`, no desktop). O servidor
 * sorteia as opções (`Player.perkOffer`) e valida a escolha; aqui só mostramos e mandamos.
 * Uma melhoria pendente sai da tela enquanto a escolha de magia estiver aberta e volta depois.
 */
export class PerkChoice {
  private panel: HTMLElement | null = null;
  /** Oferta desenhada agora e a última escolhida (esperando o servidor trocar). */
  private shownKey = "";
  private sentKey = "";

  /** `busy` diz se a escolha de magia está aberta: ela tem prioridade, uma janela de cada vez. */
  constructor(private room: DungeonRoom, private busy: () => boolean, private anchor: Anchor) {}

  update() {
    const p = this.room.state.players.get(this.room.sessionId);
    const offer = p && p.status === "playing" ? [...p.perkOffer].filter(isPerk) : [];
    const key = p && offer.length > 0 ? `${offer.join(",")}|${totalStacks(p)}` : "";
    if (!key || key === this.sentKey || this.busy()) return this.close();
    if (key !== this.shownKey) this.render(p!, offer, key);
    this.place();
  }

  destroy() {
    this.close();
  }

  private render(p: PlayerView, offer: PerkId[], key: string) {
    this.panel?.remove();
    const panel = document.createElement("div");
    panel.className = "perk-choice";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", `Nível ${p.perkLevel || p.level}: escolha uma melhoria`);
    const stacks = stacksOf(p);
    for (const id of offer) {
      const perk = PERKS[id];
      const option = document.createElement("button");
      option.className = "perk-option";
      option.textContent = perk.icon;
      const label = `${perk.name}: ${perk.description} (${(stacks[id] ?? 0) + 1}/${perk.maxStacks})`;
      option.setAttribute("aria-label", label);
      option.title = label;
      option.onclick = () => {
        this.room.send(MSG.choosePerk, { perk: id });
        this.sentKey = key;
        this.close();
      };
      panel.append(option);
    }
    document.body.append(panel);
    this.panel = panel;
    this.shownKey = key;
  }

  /** Acompanha o personagem (a câmera o segue com atraso, então muda um pouco a cada quadro). */
  private place() {
    const panel = this.panel;
    if (!panel) return;
    const at = this.anchor();
    panel.hidden = !at;
    if (!at) return;
    panel.style.left = `${Math.round(at.x)}px`;
    panel.style.top = `${Math.round(at.y)}px`;
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
