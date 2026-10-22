/** Ponto da tela (px do documento) logo acima da cabeça do personagem, ou null se ele não estiver na tela. */
export type Anchor = () => { x: number; y: number } | null;

export interface ChoiceCard {
  icon: string;
  name: string;
  description: string;
  /** Linhas pequenas embaixo da descrição (efeitos da magia, mana e recarga). */
  details?: string[];
  /** Selo no canto da carta ("Nv 2", "Novo"). */
  badge?: string;
  /** Bolinhas de quantas vezes já foi escolhida: `filled` cheias, a próxima acesa, até `total`. */
  pips?: { filled: number; total: number };
  onPick: () => void;
}

export interface ChoiceOptions {
  /** "perk" (dourado) ou "spell" (roxo): só muda a cor. */
  kind: "perk" | "spell";
  title: string;
  cards: ChoiceCard[];
  /** Com isso aparece o ✕ ("Depois") no título. */
  onDismiss?: () => void;
}

/** Folga das bordas da coluna do jogo. */
const MARGIN = 8;

/**
 * Cartas de escolha logo acima do personagem, acompanhando ele, enquanto o jogo segue rodando:
 * usada na melhoria de nível (`PerkChoice`) e na magia de um slot novo (`SpellBar`). Um toque na
 * carta escolhe. Nunca rola: com 1 ou 2 cartas elas vêm inteiras; com mais, viram uma grade de 3 ou 4
 * colunas que ocupa a largura da coluna, e cada carta mostra menos (o texto inteiro fica no rótulo).
 */
export class ChoiceCards {
  readonly el: HTMLElement;

  constructor(opts: ChoiceOptions) {
    const el = document.createElement("div");
    el.className = `choice choice-${opts.kind}`;
    const n = opts.cards.length;
    if (n > 2) {
      el.dataset.density = n > 6 ? "mini" : "compact";
      el.style.setProperty("--cols", String(n > 6 ? 4 : 3));
    }
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", opts.title);

    const head = document.createElement("div");
    head.className = "choice-head";
    const title = document.createElement("span");
    title.textContent = opts.title;
    head.append(title);
    if (opts.onDismiss) {
      const later = document.createElement("button");
      later.className = "choice-later";
      later.textContent = "✕";
      later.setAttribute("aria-label", "Depois");
      later.title = "Depois";
      later.onclick = opts.onDismiss;
      head.append(later);
    }

    const row = document.createElement("div");
    row.className = "choice-row";
    for (const card of opts.cards) row.append(cardButton(card));
    el.append(head, row);
    document.body.append(el);
    this.el = el;
  }

  /**
   * Acompanha o personagem (a câmera o segue com atraso, então muda um pouco a cada quadro), sem
   * sair da coluna do jogo. Sem o personagem na tela, fica no alto da coluna.
   */
  place(anchor: Anchor) {
    const col = document.getElementById("game")!.getBoundingClientRect();
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const at = anchor() ?? { x: col.left + col.width / 2, y: col.top + MARGIN + h };
    const left = clamp(at.x - w / 2, col.left + MARGIN, col.right - MARGIN - w);
    const top = Math.max(col.top + MARGIN, at.y - h);
    this.el.style.left = `${Math.round(left)}px`;
    this.el.style.top = `${Math.round(top)}px`;
  }

  remove() {
    this.el.remove();
  }
}

function cardButton(card: ChoiceCard) {
  const button = document.createElement("button");
  button.className = "choice-card";
  const icon = document.createElement("span");
  icon.className = "choice-icon";
  icon.textContent = card.icon;
  const name = document.createElement("strong");
  name.textContent = card.name;
  const description = document.createElement("small");
  description.textContent = card.description;
  button.append(icon, name, description);
  if (card.badge) {
    const badge = document.createElement("span");
    badge.className = "choice-badge";
    badge.textContent = card.badge;
    button.append(badge);
  }
  if (card.details?.length) {
    const list = document.createElement("ul");
    card.details.forEach((line, i) => {
      const item = document.createElement("li");
      // Na grade compacta só ficam o efeito principal (1ª linha) e mana e recarga (última).
      if (i === 0) item.className = "main";
      if (i === card.details!.length - 1) item.className = "cost";
      item.textContent = line;
      list.append(item);
    });
    button.append(list);
  }
  let label = `${card.name}: ${card.description}`;
  if (card.pips) {
    const pips = document.createElement("span");
    pips.className = "choice-pips";
    for (let i = 0; i < card.pips.total; i++) {
      const pip = document.createElement("i");
      if (i < card.pips.filled) pip.className = "on";
      else if (i === card.pips.filled) pip.className = "next";
      pips.append(pip);
    }
    button.append(pips);
    label += ` (${card.pips.filled + 1}/${card.pips.total})`;
  }
  if (card.details?.length) label += `. ${card.details.join(". ")}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.onclick = card.onPick;
  return button;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
