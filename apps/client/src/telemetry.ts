import { BASIC_ATTACKS, CLASSES, MAPS, MAP_IDS, MONSTERS, PERKS, SPELLS, SUMMONS, type ClassId } from "@kusa/shared";
import { supabase } from "./auth.ts";

// Configurações > Telemetria: os números de todas as hunts, para qualquer jogador logado.
// O banco devolve agregados (função `telemetry_dashboard`) e o ranking por conta, com o nome (`telemetry_ranking`):
// o jogo é entre amigos e a comparação faz parte da brincadeira.

interface Dashboard {
  totais: {
    hunts: number; jogadores: number; abandonos: number;
    sobrevivencia_pct: number | null; boss_pct: number | null; soterrado_pct: number | null;
    nivel_medio: number | null; duracao_media_s: number | null; loot_medio_vivos: number | null;
  };
  por_dia: { dia: string; hunts: number }[];
  fins: Partial<Record<"escaped" | "completed" | "died" | "buried", number>>;
  classes: { class_id: string; hunts: number; sobrevivencia_pct: number; nivel_medio: number; loot_medio_vivos: number | null }[];
  mortes: { causa: string; mortes: number; segundo_medio: number | null }[];
  dano: { class_id: string; fonte: string; dano_total: number; dps_medio: number | null }[];
  magias: { magia: string; escolhas: number; sobrevivencia_pct: number }[];
  melhorias: { melhoria: string; ofertas: number; escolhas: number; taxa_escolha_pct: number }[];
  monstros: { monstro: string; abates: number }[];
  niveis: { nivel: number; hunts: number; segundo_medio: number }[];
  minhas: { hunts: number; sobrevivencia_pct: number | null; bosses: number; melhor_nivel: number | null; loot_total: number; abates: number; classe_favorita: string | null };
}

/** Uma linha por conta (convidados ficam de fora). */
interface Player {
  nome: string; eu: boolean; hunts: number; sobrevivencia_pct: number | null; bosses: number; mortes: number;
  loot_total: number; abates: number; dano_causado: number; dano_recebido: number; cura: number;
  melhor_nivel: number | null; minutos: number; classe_favorita: string | null;
}

type Metric = Exclude<keyof Player, "nome" | "eu" | "classe_favorita">;

/** Métricas do ranking: rótulo do chip, formato do valor e o "prêmio" de quem lidera. */
const METRICS: { key: Metric; label: string; award: string; fmt: (v: number | null) => string }[] = [
  { key: "hunts", label: "Hunts", award: "🎮 Viciado", fmt: (v) => num(v) },
  { key: "sobrevivencia_pct", label: "Sobrevivência", award: "🛡️ Imortal", fmt: (v) => pct(v) },
  { key: "abates", label: "Abates", award: "🗡️ Açougueiro", fmt: (v) => num(v) },
  { key: "dano_causado", label: "Dano causado", award: "💥 Canhão", fmt: (v) => num(v) },
  { key: "loot_total", label: "Gold", award: "💰 Mão de vaca", fmt: (v) => num(v) },
  { key: "bosses", label: "Bosses", award: "🐉 Caçador de boss", fmt: (v) => num(v) },
  { key: "mortes", label: "Mortes", award: "💀 Mais morreu", fmt: (v) => num(v) },
  { key: "dano_recebido", label: "Apanhou", award: "🥊 Saco de pancada", fmt: (v) => num(v) },
  { key: "cura", label: "Cura", award: "💚 Enfermeiro", fmt: (v) => num(v) },
  { key: "melhor_nivel", label: "Nível", award: "⭐ Maior nível", fmt: (v) => num(v) },
  { key: "minutos", label: "Minutos", award: "⏳ Sem vida social", fmt: (v) => num(v) },
];

let metric: Metric = "hunts";

/** Filtros da tela; a escolha fica só enquanto o jogo está aberto. */
const filters: { map: string | null; days: number | null } = { map: null, days: 30 };

const MAP_FILTERS: [string | null, string][] = [[null, "Todos"], ...MAP_IDS.map((id): [string, string] => [id, MAPS[id].name])];
const DAY_FILTERS: [number | null, string][] = [[7, "7 dias"], [30, "30 dias"], [null, "Tudo"]];

const OUTCOMES: [keyof Dashboard["fins"], string][] = [
  ["escaped", "🚪 Fugiu"], ["completed", "🐉 Derrotou o boss"], ["died", "💀 Morreu"], ["buried", "🪨 Soterrado"],
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const className = (id: string) => CLASSES[id as ClassId]?.name ?? id;
const monsterName = (id: string) => (id === "soterrado" ? "Soterrado (o tempo acabou)" : MONSTERS[id as keyof typeof MONSTERS]?.name ?? id);
const spellName = (id: string) => {
  const s = SPELLS[id as keyof typeof SPELLS];
  return s ? `${s.icon} ${s.name}` : id;
};
/** "basic", id de magia ou "summon:<tipo>" (dano das criaturas do druida). */
const sourceName = (classId: string, source: string) => {
  if (source === "basic") return BASIC_ATTACKS[classId as ClassId]?.name ?? "Ataque básico";
  if (source.startsWith("summon:")) return SUMMONS[source.slice(7) as keyof typeof SUMMONS]?.name ?? source;
  return spellName(source);
};
const perkName = (id: string) => {
  const p = PERKS[id as keyof typeof PERKS];
  return p ? `${p.icon} ${p.name}` : id;
};
const pct = (v: number | null | undefined) => (v == null ? "—" : `${String(v).replace(".", ",")}%`);
const num = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("pt-BR"));
const time = (s: number | null | undefined) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);

/** Abre a tela: desenha os filtros e carrega os números. */
export function renderTelemetry(root: HTMLElement) {
  root.innerHTML = "";
  const chips = el("div", "tm-filters");
  chips.append(
    chipRow("Mapa", MAP_FILTERS, () => filters.map, (v) => { filters.map = v; void load(body); }),
    chipRow("Período", DAY_FILTERS, () => filters.days, (v) => { filters.days = v; void load(body); }),
  );
  const body = el("div", "tm-body");
  root.append(chips, body);
  void load(body);
}

function chipRow<T>(label: string, options: [T, string][], current: () => T, pick: (v: T) => void) {
  const row = el("div", "tm-chips");
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", label);
  const paint = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(options[i][0] === current())));
  const buttons = options.map(([value, text]) => {
    const b = el("button", "chip", text);
    b.type = "button";
    b.onclick = () => { pick(value); paint(); };
    return b;
  });
  row.append(...buttons);
  paint();
  return row;
}

let requestId = 0;
async function load(body: HTMLElement) {
  const id = ++requestId;
  body.replaceChildren(el("p", "muted tm-status", "Carregando…"));
  const args = { p_map: filters.map, p_days: filters.days };
  const [dash, rank] = await Promise.all([
    supabase.rpc("telemetry_dashboard", args),
    supabase.rpc("telemetry_ranking", args),
  ]);
  // Trocou o filtro antes de chegar: vale só a resposta mais nova.
  if (id !== requestId) return;
  if (dash.error || !dash.data) {
    body.replaceChildren(el("p", "error tm-status", "Não foi possível carregar a telemetria. Tente de novo."));
    return;
  }
  const out = sections(dash.data as Dashboard);
  // O ranking falhar não esconde o resto: entra logo depois de "Suas hunts".
  const players = (rank.data ?? []) as Player[];
  if (players.length) out.splice(1, 0, awards(players), ranking(players));
  body.replaceChildren(...out);
}

/** Quem lidera cada métrica (empate: quem tem mais hunts, que é a ordem do banco). */
function awards(players: Player[]) {
  const grid = el("dl", "tm-tiles tm-awards");
  for (const m of METRICS) {
    const best = players.reduce<Player | null>((a, p) => ((p[m.key] ?? -1) > (a?.[m.key] ?? -1) ? p : a), null);
    if (!best || !best[m.key]) continue;
    const tile = el("div", best.eu ? "tm-tile eu" : "tm-tile");
    tile.append(el("dt", "", m.award), el("dd", "", best.nome), el("small", "muted", `${m.label}: ${m.fmt(best[m.key])}`));
    grid.append(tile);
  }
  return card("🏆 Prêmios da galera", grid);
}

/** Barras por jogador na métrica escolhida; os chips trocam a métrica sem recarregar. */
function ranking(players: Player[]) {
  const wrap = el("div");
  const list = el("div");
  const paint = () => {
    const m = METRICS.find((x) => x.key === metric)!;
    const sorted = [...players].sort((a, b) => (b[m.key] ?? -1) - (a[m.key] ?? -1));
    const medals = ["🥇", "🥈", "🥉"];
    const chart = bars(sorted.map((p, i) => ({
      label: `${medals[i] ?? `${i + 1}º`} ${p.nome}${p.eu ? " (você)" : ""}`,
      value: p[m.key] ?? 0,
      max: m.key === "sobrevivencia_pct" ? 100 : undefined,
      text: m.fmt(p[m.key]),
      sub: `${num(p.hunts)} hunts${p.classe_favorita ? ` · joga mais de ${className(p.classe_favorita)}` : ""}`,
      mine: p.eu,
    })));
    list.replaceChildren(chart);
  };
  const chips = chipRow("Comparar", METRICS.map((m): [Metric, string] => [m.key, m.label]), () => metric, (v) => { metric = v; paint(); });
  chips.classList.add("tm-metrics");
  wrap.append(chips, list);
  paint();
  return card("⚔️ Ranking entre amigos", wrap);
}

function sections(d: Dashboard): HTMLElement[] {
  const t = d.totais;
  if (t.hunts === 0) return [mine(d), el("p", "muted tm-status", "Nenhuma hunt neste filtro ainda.")];

  const out: HTMLElement[] = [mine(d)];
  out.push(card("Visão geral", tiles([
    ["Hunts", num(t.hunts)],
    ["Jogadores", num(t.jogadores)],
    ["Sobrevivência", pct(t.sobrevivencia_pct)],
    ["Boss derrotado", pct(t.boss_pct)],
    ["Duração média", time(t.duracao_media_s)],
    ["Loot médio (vivos)", num(t.loot_medio_vivos)],
  ])));

  out.push(card("Hunts por dia (últimos 14)", columns(d.por_dia)));

  out.push(card("Como as hunts terminam", bars(
    OUTCOMES.map(([key, label]) => ({ label, value: d.fins[key] ?? 0, text: num(d.fins[key] ?? 0) })),
  )));

  if (d.classes.length) {
    out.push(card("Sobrevivência por classe", bars(d.classes.map((c) => ({
      label: className(c.class_id),
      value: c.sobrevivencia_pct,
      max: 100,
      text: pct(c.sobrevivencia_pct),
      sub: `${num(c.hunts)} hunts · nível médio ${String(c.nivel_medio).replace(".", ",")} · loot ${num(c.loot_medio_vivos)}`,
    })))));
  }

  if (d.mortes.length) {
    out.push(card("O que mais mata", bars(d.mortes.map((m) => ({
      label: monsterName(m.causa),
      value: m.mortes,
      text: num(m.mortes),
      sub: m.segundo_medio == null ? undefined : `em média aos ${time(m.segundo_medio)}`,
    })))));
  }

  if (d.dano.length) {
    out.push(card("Maiores fontes de dano", bars(d.dano.map((x) => ({
      label: `${className(x.class_id)} · ${sourceName(x.class_id, x.fonte)}`,
      value: x.dano_total,
      text: num(x.dano_total),
      sub: x.dps_medio == null ? undefined : `${String(x.dps_medio).replace(".", ",")} de dano por segundo de hunt`,
    })))));
  }

  if (d.magias.length) {
    out.push(card("Magias mais escolhidas", bars(d.magias.map((m) => ({
      label: spellName(m.magia),
      value: m.escolhas,
      text: num(m.escolhas),
      sub: `sobrevivência de quem escolheu: ${pct(m.sobrevivencia_pct)}`,
    })))));
  }

  if (d.melhorias.length) {
    out.push(card("Melhorias: taxa de escolha", bars(d.melhorias.map((p) => ({
      label: perkName(p.melhoria),
      value: p.taxa_escolha_pct,
      max: 100,
      text: pct(p.taxa_escolha_pct),
      sub: `escolhida ${num(p.escolhas)} de ${num(p.ofertas)} vezes que apareceu`,
    })))));
  }

  if (d.niveis.length) {
    out.push(card("Quando cada nível chega", bars(d.niveis.map((n) => ({
      label: `Nível ${n.nivel}`,
      value: n.segundo_medio,
      text: time(n.segundo_medio),
      sub: `${num(n.hunts)} hunts chegaram`,
    })))));
  }

  if (d.monstros.length) {
    out.push(card("Monstros mais abatidos", bars(d.monstros.map((m) => ({
      label: monsterName(m.monstro), value: m.abates, text: num(m.abates),
    })))));
  }

  out.push(el("p", "muted tm-note",
    `Números de todos os jogadores (os rankings mostram só contas; convidados ficam de fora). Hunts abandonadas no meio (${num(t.abandonos)}) contam no total, mas não nas taxas. `
    + "Com poucas hunts os números mudam bastante."));
  return out;
}

/** Resumo das hunts de quem está vendo (só as da conta, com os mesmos filtros). */
function mine(d: Dashboard) {
  const m = d.minhas;
  if (!m.hunts) return card("Suas hunts", el("p", "muted", "Você ainda não tem hunts neste filtro."));
  return card("Suas hunts", tiles([
    ["Hunts", num(m.hunts)],
    ["Sobrevivência", pct(m.sobrevivencia_pct)],
    ["Bosses", num(m.bosses)],
    ["Melhor nível", num(m.melhor_nivel)],
    ["Gold de loot", num(m.loot_total)],
    ["Classe favorita", m.classe_favorita ? className(m.classe_favorita) : "—"],
  ]), "mine");
}

function card(title: string, content: HTMLElement, extra = "") {
  const section = el("section", `tm-card ${extra}`.trim());
  section.append(el("h3", "", title), content);
  return section;
}

function tiles(items: [string, string][]) {
  const grid = el("dl", "tm-tiles");
  for (const [label, value] of items) {
    const tile = el("div", "tm-tile");
    tile.append(el("dt", "", label), el("dd", "", value));
    grid.append(tile);
  }
  return grid;
}

interface Bar { label: string; value: number; max?: number; text: string; sub?: string; mine?: boolean }

/** Barras horizontais com o valor escrito ao lado (toque não tem hover, então o número fica sempre visível). */
function bars(rows: Bar[]) {
  const list = el("ul", "tm-bars");
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.value));
  for (const r of rows) {
    const li = el("li", r.mine ? "mine" : "");
    const head = el("div", "tm-bar-head");
    head.append(el("span", "", r.label), el("strong", "", r.text));
    const track = el("div", "tm-track");
    const fill = el("i");
    fill.style.width = `${Math.max(0, Math.min(1, r.value / (r.max ?? max))) * 100}%`;
    track.append(fill);
    li.append(head, track);
    if (r.sub) li.append(el("small", "muted", r.sub));
    list.append(li);
  }
  return list;
}

/** Colunas por dia; tocar numa coluna mostra o dia e o número embaixo do gráfico. */
function columns(days: Dashboard["por_dia"]) {
  const wrap = el("div", "tm-columns-wrap");
  const chart = el("div", "tm-columns");
  const readout = el("p", "muted tm-readout");
  const max = Math.max(1, ...days.map((d) => d.hunts));
  const label = (d: Dashboard["por_dia"][number]) => {
    const [, m, day] = d.dia.split("-");
    return `${day}/${m}: ${d.hunts} ${d.hunts === 1 ? "hunt" : "hunts"}`;
  };
  const cols = days.map((d) => {
    const col = el("button", "tm-col");
    col.type = "button";
    col.setAttribute("aria-label", label(d));
    const fill = el("i");
    fill.style.height = d.hunts ? `${Math.max(4, (d.hunts / max) * 100)}%` : "0";
    col.append(fill);
    col.onclick = () => {
      cols.forEach((c) => c.classList.toggle("active", c === col));
      readout.textContent = label(d);
    };
    return col;
  });
  chart.append(...cols);
  const axis = el("div", "tm-axis");
  const fmt = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/");
  if (days.length) axis.append(el("span", "", fmt(days[0].dia)), el("span", "", fmt(days[days.length - 1].dia)));
  const last = days[days.length - 1];
  const peak = Math.max(0, ...days.map((d) => d.hunts));
  readout.textContent = last ? `Hoje: ${last.hunts} ${last.hunts === 1 ? "hunt" : "hunts"} · máximo de ${peak} num dia. Toque numa coluna.` : "";
  wrap.append(chart, axis, readout);
  return wrap;
}
