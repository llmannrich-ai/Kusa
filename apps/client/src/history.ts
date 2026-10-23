import { CLASSES, DEATH_SPELL_XP_LOSS, MAPS, MONSTERS, SPELLS, lootColor, lootName, type ClassId } from "@kusa/shared";
import { supabase } from "./auth.ts";

// Configurações > Histórico: cada partida com quem jogou, personagem, desfecho, loot e penalidades.
// Vem da função `match_history` do banco, que agrupa por partida as linhas que a telemetria já grava.

interface Player {
  nome: string; conta: boolean; eu: boolean | null; classe: string; nivel: number;
  desfecho: "escaped" | "completed" | "died" | "buried"; abandonou: boolean; morto_por: string | null;
  loot: number; gold_coletado: number;
  itens_pegos: string[]; itens_largados: string[]; itens_perdidos: string[];
  magias: string[]; xp_magias: Record<string, number>;
}

interface Match {
  match_id: string; quando: string; mapa: string | null; solo: boolean; equipe: number; duracao_s: number;
  jogadores: Player[];
}

const PAGE = 20;

const OUTCOMES: Record<Player["desfecho"], string> = {
  escaped: "🚪 Fugiu", completed: "🐉 Derrotou o boss", died: "💀 Morreu", buried: "🪨 Soterrado",
};

/** Filtro da tela; a escolha fica só enquanto o jogo está aberto. */
let mine = true;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const className = (id: string) => CLASSES[id as ClassId]?.name ?? id;
const mapName = (id: string | null) => (id ? MAPS[id as keyof typeof MAPS]?.name ?? id : "—");
const monsterName = (id: string) => MONSTERS[id as keyof typeof MONSTERS]?.name ?? id;
const spellName = (id: string) => {
  const s = SPELLS[id as keyof typeof SPELLS];
  return s ? `${s.icon} ${s.name}` : id;
};
const num = (v: number) => Math.round(v).toLocaleString("pt-BR");
const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const died = (p: Player) => p.desfecho === "died" || p.desfecho === "buried";

/** Itens de `a` que sobram depois de tirar os de `b` (repetidos contam um a um). */
function minus(a: string[], b: string[]) {
  const left = [...b];
  return a.filter((id) => {
    const i = left.indexOf(id);
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
}

/** Abre a tela: filtro e a primeira página de partidas. */
export function renderHistory(root: HTMLElement) {
  root.innerHTML = "";
  const chips = el("div", "tm-chips");
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", "Partidas");
  const options: [boolean, string][] = [[true, "Minhas"], [false, "Todas"]];
  const buttons = options.map(([value, text]) => {
    const b = el("button", "chip", text);
    b.type = "button";
    b.onclick = () => { mine = value; paint(); void load(list, null); };
    return b;
  });
  const paint = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i][0] === mine)));
  chips.append(...buttons);
  paint();
  const filters = el("div", "tm-filters");
  filters.append(chips);
  const list = el("div", "tm-body");
  root.append(filters, list);
  void load(list, null);
}

let requestId = 0;
/** Carrega uma página; `before` = início da partida mais antiga já mostrada (null = do começo). */
async function load(list: HTMLElement, before: string | null) {
  const id = ++requestId;
  const more = list.querySelector(".hist-more");
  if (before) more?.replaceChildren(el("span", "muted", "Carregando…"));
  else list.replaceChildren(el("p", "muted tm-status", "Carregando…"));
  const { data, error } = await supabase.rpc("match_history", { p_mine: mine, p_before: before, p_limit: PAGE });
  // Trocou o filtro antes de chegar: vale só a resposta mais nova.
  if (id !== requestId) return;
  more?.remove();
  if (error || !data) {
    const msg = el("p", "error tm-status", "Não foi possível carregar o histórico. Tente de novo.");
    if (before) list.append(msg); else list.replaceChildren(msg);
    return;
  }
  const matches = data as Match[];
  if (!before) list.replaceChildren();
  if (!before && !matches.length) {
    list.append(el("p", "muted tm-status", mine ? "Você ainda não jogou nenhuma partida." : "Nenhuma partida gravada ainda."));
    return;
  }
  list.append(...matches.map(matchCard));
  if (matches.length === PAGE) {
    const button = el("button", "hist-more", "Carregar mais");
    button.type = "button";
    button.onclick = () => void load(list, matches[matches.length - 1].quando);
    list.append(button);
  }
}

/** Uma partida: cabeçalho (quando, mapa, duração) e um bloco por jogador. */
function matchCard(m: Match) {
  const card = el("section", "tm-card hist-match");
  const head = el("header", "hist-head");
  const kind = m.solo ? "Solo" : m.equipe > 1 ? `Equipe de ${m.equipe}` : "Sozinho";
  head.append(el("h3", "", mapName(m.mapa)), el("small", "muted", `${when(m.quando)} · ${kind} · ${time(m.duracao_s)}`));
  card.append(head, ...m.jogadores.map(playerRow));
  return card;
}

function playerRow(p: Player) {
  const row = el("div", p.eu ? "hist-player eu" : "hist-player");
  const top = el("div", "hist-top");
  top.append(
    el("strong", "", `${p.nome}${p.eu ? " (você)" : ""}${p.conta ? "" : " · convidado"}`),
    el("span", died(p) ? "hist-outcome lost" : "hist-outcome", OUTCOMES[p.desfecho] ?? p.desfecho),
  );
  const killer = p.morto_por && p.desfecho === "died" ? ` · por ${monsterName(p.morto_por)}` : "";
  const quit = p.abandonou ? " · saiu no meio" : "";
  row.append(top, el("small", "muted", `${className(p.classe)} · nível ${p.nivel}${killer}${quit}`));

  // Loot: o que saiu da hunt com o jogador.
  if (!died(p)) {
    const kept = minus(p.itens_pegos, p.itens_largados);
    row.append(line("Loot", `💰 ${num(p.loot)} gold`, kept));
  }

  // Penalidades da morte: gold juntado, equipamento sorteado + bag e XP das magias dos slots.
  if (died(p)) {
    const xp = p.abandonou || !p.magias.length
      ? null
      : `−${DEATH_SPELL_XP_LOSS * 100}% do XP de ${p.magias.map(spellName).join(", ")}`;
    const parts = [p.gold_coletado ? `💰 −${num(p.gold_coletado)} gold` : "", xp ?? ""].filter(Boolean);
    const text = parts.join(" · ") || (p.itens_perdidos.length ? "" : "Nada perdido");
    row.append(line("Penalidades", text, p.itens_perdidos, true));
  }

  const gained = Object.entries(p.xp_magias).filter(([, v]) => v > 0);
  if (gained.length) row.append(el("small", "muted hist-xp", `XP de magia: ${gained.map(([id, v]) => `${spellName(id)} +${num(v)}`).join(" · ")}`));
  return row;
}

/** Linha de loot ou penalidade: texto e os itens como etiquetas na cor da raridade. */
function line(label: string, text: string, items: string[], lost = false) {
  const wrap = el("div", lost ? "hist-line lost" : "hist-line");
  wrap.append(el("b", "", label), el("span", "", text));
  if (items.length) {
    const tags = el("ul", "hist-items");
    for (const id of items) {
      const tag = el("li", "", lootName(id));
      tag.style.borderColor = `#${lootColor(id).toString(16).padStart(6, "0")}`;
      tags.append(tag);
    }
    wrap.append(tags);
  }
  return wrap;
}
