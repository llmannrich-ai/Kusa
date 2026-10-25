import { MAPS, type MapId } from "@kusa/shared";
import { CAVERN_BRANCHES, EDGES, EDGE_D, FOG, H, LABELS, NODES, OPEN_CHAIN, PLACES, W } from "./world/verdemar.ts";

// Mapa mundi (tela de Batalhas): a carta de Verdemar, o continente da campanha. A arte é uma imagem pronta
// (public/mapa/verdemar.svg, gerada por scripts/verdemar.ts); por cima vão as trilhas, os nomes, os pontos e o herói.
// Câmera própria: arrastar em qualquer direção e pinça para aproximar (sem a rolagem do navegador).

/** Cenário de hoje → ponto da campanha. */
const NODE_OF = Object.fromEntries(Object.entries(NODES).flatMap(([id, n]) => (n.map ? [[n.map, id]] : []))) as Record<MapId, string>;

/** Onde fica cada cenário e a região (a ficha mostra a região). */
export const WORLD_POINTS = Object.fromEntries(
  Object.values(NODES).flatMap((n) => (n.map ? [[n.map, { x: n.x, y: n.y, region: n.area }]] : [])),
) as Record<MapId, { x: number; y: number; region: string }>;

const NS = "http://www.w3.org/2000/svg";
/** Zoom máximo (o mínimo mostra o continente inteiro). */
const MAX_SCALE = 1.8;
/** O continente, para o zoom de "ver tudo". */
const LAND_BOX = { x: 140, y: 110, w: 1320, h: 2120 };
/** Duração da caminhada, a mesma passando por um trecho ou por vários. */
const WALK_MS = 1000;
/** Altura do herói (px) e quanto ele sobe para ficar de pé em cima do ícone do ponto. */
const HERO_PX = 40;
const ON_POINT_LIFT = 22;
/** Quadros da folha do herói (`heroSheet`): 3 direções × 3 quadros; a caminhada toca `1, 0, 2, 0`. */
const SHEET_DIRS = ["down", "side", "up"] as const;
const STEP_FRAMES = [1, 0, 2, 0];
/** Distância (no desenho) entre um passo e outro. */
const STEP_LEN = 12;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.append(node);
  return node;
};

export interface SelectOptions {
  /** Sem caminhar (ao abrir a tela). Com `prefers-reduced-motion` é sempre assim. */
  instant?: boolean;
  /** Onde o ponto fica na tela ao chegar (fração da altura); a câmera vai junto com o herói. */
  anchor?: number;
}

export interface WorldMapView {
  /** Marca o cenário escolhido e leva o herói até ele pela trilha. */
  select(id: MapId, options?: SelectOptions): void;
  /** Para onde o herói está andando agora (`null` parado). */
  walkingTo(): MapId | null;
  /** Termina a caminhada já: o herói aparece no ponto. */
  skip(): void;
  /** Leva a câmera até o ponto (zoom de perto), que fica a `anchor` da altura da tela (com `smooth`, deslizando). */
  focus(id: MapId, anchor?: number, smooth?: boolean): void;
  /** Quantas salas abertas cada cenário tem (o selo 👥 do ponto). */
  setRoomCounts(counts: Partial<Record<MapId, number>>): void;
  /**
   * Campanha da classe escolhida: `unlocked` são os cenários abertos (os outros ganham cadeado) e `cleared` os de
   * boss vencido (estrela). A trilha fica vermelha entre dois cenários abertos.
   */
  setProgress(unlocked: readonly MapId[], cleared: readonly MapId[]): void;
  /** Troca o boneco do herói: a folha de `heroSheet` da classe escolhida no menu. */
  setHero(sheetUrl: string): void;
  /** Bosses que a classe escolhida já venceu: liberam os lados da bifurcação da Caverna da Travessia. */
  setBossKills(bosses: readonly string[]): void;
}

/**
 * Monta o mapa em `view` (área que ocupa a tela; recebe os toques). `icons` são os desenhos dos cenários,
 * `onPoint` recebe o toque num cenário aberto e `onInfo` os avisos (cenário da campanha por vir, terra em névoa).
 */
export function createWorldMap(view: HTMLElement, icons: Record<MapId, string>, onPoint: (id: MapId) => void, onInfo: (message: string) => void): WorldMapView {
  // Mundo: a arte (imagem) e, por cima, as trilhas e os nomes, tudo na mesma escala da câmera.
  const world = document.createElement("div");
  world.className = "world-plane";
  Object.assign(world.style, { width: `${W}px`, height: `${H}px` });
  const art = document.createElement("img");
  art.className = "world-art";
  art.alt = "";
  art.src = `${import.meta.env.BASE_URL}mapa/verdemar.svg`;
  art.width = W;
  art.height = H;
  art.decoding = "async";
  const over = svgEl("svg", { class: "world-over", viewBox: `0 0 ${W} ${H}`, width: W, height: H, "aria-hidden": "true" });
  world.append(art, over);
  // Pontos e herói ficam fora da escala: o mesmo tamanho na tela em qualquer zoom.
  const layer = document.createElement("div");
  layer.className = "world-layer";
  view.replaceChildren(world, layer);

  // Trilhas: pontilhadas até abrir; o trecho entre dois cenários abertos fica em tinta vermelha (`setProgress`).
  const trails = new Map<string, { bed: SVGPathElement; line: SVGPathElement }>();
  for (const [a, b] of EDGES) {
    const bed = svgEl("path", { d: EDGE_D[a + b], class: "world-trail-bed" }, over);
    const line = svgEl("path", { d: EDGE_D[a + b], class: "world-trail-next" }, over);
    trails.set(a + b, { bed, line });
  }
  // Lados da bifurcação da Travessia: a tinta vermelha por cima da trilha pontilhada aparece com o boss vencido.
  const branches = CAVERN_BRANCHES.map((b) => ({
    boss: b.boss,
    beds: svgEl("path", { d: EDGE_D[b.from + b.to], class: "world-trail-bed open world-branch" }, over),
    ink: svgEl("path", { d: EDGE_D[b.from + b.to], class: "world-trail-open world-branch" }, over),
  }));
  // A trilha dos cenários de hoje, inteira e sem traço: o herói anda nela.
  const openD = OPEN_CHAIN.slice(1).map((b, i) => EDGE_D[OPEN_CHAIN[i] + b].replace(/^M[^C]+/, (m) => (i ? "" : m))).join("");
  const route = svgEl("path", { d: openD, fill: "none" }, over);

  // Nomes: crescem quando o zoom afasta (para seguir legíveis) até caber na curva; os pequenos somem de longe.
  const readable: { t: SVGTextElement; px: number; min: number; max: number }[] = [];
  const small = svgEl("g", { class: "world-small" }, over);
  LABELS.forEach((l, i) => {
    const path = svgEl("path", { id: `wm-rot${i}`, d: l.d, fill: "none" }, over);
    const t = svgEl("text", { class: "world-label", "font-size": l.size, "letter-spacing": l.sp }, l.size < 30 ? small : over);
    const probe = svgEl("text", { class: "world-label", "font-size": l.size, "letter-spacing": l.sp }, over);
    probe.textContent = l.text;
    t.innerHTML = `<textPath href="#wm-rot${i}" startOffset="50%">${l.text}</textPath>`;
    readable.push({ t, px: l.px, min: l.size, max: (path.getTotalLength() / Math.max(1, probe.getComputedTextLength())) * l.size * 0.94 });
    probe.remove();
  });
  for (const p of PLACES) {
    const t = svgEl("text", { x: p.x, y: p.y, class: `world-place${p.water ? " water" : ""}`, "font-size": p.big ? 20 : 15 }, p.big ? over : small);
    t.textContent = p.text;
    if (p.big) readable.push({ t, px: 12, min: 20, max: 60 });
  }
  for (const f of FOG) {
    const t = svgEl("text", { x: f.x, y: f.y, class: "world-label", "font-size": 26, "letter-spacing": 3 }, over);
    t.textContent = f.name;
    readable.push({ t, px: 14, min: 26, max: 90 });
    svgEl("text", { x: f.x, y: f.y + 24, class: "world-place", "font-size": 18 }, small).textContent = "terra não mapeada";
  }

  // Pontos: os cenários de hoje com o desenho deles; os da campanha por vir, numerados (com placa nas bifurcações).
  type Pin = { el: HTMLElement; x: number; y: number };
  const pins: Pin[] = [];
  const points = new Map<MapId, { button: HTMLButtonElement; count: HTMLElement; name: HTMLElement }>();
  const before = (id: string) => EDGES.filter(([, b]) => b === id).map(([a]) => NODES[a].name);
  for (const [id, n] of Object.entries(NODES)) {
    const button = document.createElement("button");
    button.type = "button";
    const icon = document.createElement("span");
    icon.className = "world-icon";
    const name = document.createElement("span");
    name.className = "world-name";
    if (n.map) {
      const mapId = n.map;
      // Cenário que é bifurcação (a Caverna da Travessia) leva a placa também.
      button.className = `world-point${n.fork ? " fork" : ""}`;
      icon.innerHTML = icons[mapId];
      name.textContent = MAPS[mapId].name;
      const count = document.createElement("span");
      count.className = "world-count";
      count.hidden = true;
      icon.append(count);
      // Cadeado (cenário ainda fechado) e estrela (boss vencido com a classe), ligados por `setProgress`.
      const badge = document.createElement("span");
      badge.className = "world-badge";
      icon.append(badge);
      button.onclick = () => onPoint(mapId);
      points.set(mapId, { button, count, name });
    } else {
      button.className = `world-point next${n.fork ? " fork" : ""}${n.final ? " final" : ""}`;
      icon.textContent = n.final ? "🏰" : String(n.step);
      name.textContent = n.name;
      button.setAttribute("aria-label", `${n.step}. ${n.name}${n.fork ? ", bifurcação" : ""}: ainda fechado`);
      button.onclick = () => {
        const prev = before(id);
        onInfo(`${n.step} · ${n.name} (${n.area})${n.fork ? `: aqui o caminho se divide, ${n.fork}` : ""}. Abre depois de ${prev.join(" ou ")}.`);
      };
    }
    button.append(icon, name);
    layer.append(button);
    pins.push({ el: button, x: n.x, y: n.y });
  }
  // Nome falado de cada ponto: cenário, estado na campanha e salas abertas.
  const rooms = new Map<MapId, number>();
  const labelPoints = () => {
    for (const [id, p] of points) {
      const n = rooms.get(id) ?? 0;
      const state = p.button.classList.contains("locked") ? ", fechado" : p.button.classList.contains("cleared") ? ", boss vencido" : "";
      p.button.setAttribute("aria-label", `${MAPS[id].name}${state}${n > 0 ? `, ${n} ${n === 1 ? "sala aberta" : "salas abertas"}` : ""}`);
    }
  };
  const hero = document.createElement("div");
  hero.className = "world-hero";
  const sprite = document.createElement("span");
  sprite.className = "world-hero-sprite";
  hero.append(sprite);
  layer.append(hero);
  const heroPin: Pin = { el: hero, x: NODES[OPEN_CHAIN[0]].x, y: NODES[OPEN_CHAIN[0]].y };
  pins.push(heroPin);
  // Atalhos da câmera: voltar ao herói e ver o continente inteiro.
  const tools = document.createElement("div");
  tools.className = "world-tools";
  const tool = (label: string, text: string, act: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "world-chip icon-button";
    b.setAttribute("aria-label", label);
    b.textContent = text;
    b.onclick = act;
    tools.append(b);
  };
  tool("Voltar ao herói", "📍", () => lookAt(heroPin.x, heroPin.y, Math.max(cam.s, 0.8), 0.5));
  tool("Ver o continente inteiro", "⤢", () => lookAt(LAND_BOX.x + LAND_BOX.w / 2, LAND_BOX.y + LAND_BOX.h / 2, minScale(), 0.5));
  layer.append(tools);

  // --- Câmera -------------------------------------------------------------------------------------------------
  const cam = { x: 0, y: 0, s: 1 };
  const minScale = () => Math.min(view.clientWidth / LAND_BOX.w, view.clientHeight / LAND_BOX.h);
  const render = () => {
    cam.s = Math.min(MAX_SCALE, Math.max(minScale(), cam.s));
    const vw = view.clientWidth, vh = view.clientHeight, ww = W * cam.s, wh = H * cam.s;
    cam.x = ww <= vw ? (vw - ww) / 2 : Math.min(0, Math.max(vw - ww, cam.x));
    cam.y = wh <= vh ? (vh - wh) / 2 : Math.min(0, Math.max(vh - wh, cam.y));
    world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
    for (const r of readable) r.t.setAttribute("font-size", Math.min(r.max, Math.max(r.min, r.px / cam.s)).toFixed(1));
    // Longe, só os ícones (os nomes se encostariam); um pouco mais perto, só os nomes dos cenários de hoje.
    view.classList.toggle("far", cam.s < 0.5);
    view.classList.toggle("mid", cam.s < 0.7);
    for (const p of pins) p.el.style.transform = `translate(${(p.x * cam.s + cam.x).toFixed(1)}px, ${(p.y * cam.s + cam.y).toFixed(1)}px)`;
  };
  let camAnim = 0;
  /** Leva a câmera até (x, y) do desenho, que fica a `ax`/`ay` da tela, no zoom `s`. */
  const lookAt = (x: number, y: number, s: number, ay: number, ms = 450) => {
    cancelAnimationFrame(camAnim);
    const from = { ...cam };
    const to = { s, x: view.clientWidth / 2 - x * s, y: view.clientHeight * ay - y * s };
    if (reducedMotion() || ms === 0) { Object.assign(cam, to); render(); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms), e = 1 - (1 - t) ** 3;
      cam.s = from.s + (to.s - from.s) * e; cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e;
      render();
      if (t < 1) camAnim = requestAnimationFrame(step);
    };
    camAnim = requestAnimationFrame(step);
  };
  const zoomAt = (sx: number, sy: number, factor: number) => {
    const s = Math.min(MAX_SCALE, Math.max(minScale(), cam.s * factor));
    cam.x = sx - ((sx - cam.x) * s) / cam.s;
    cam.y = sy - ((sy - cam.y) * s) / cam.s;
    cam.s = s;
    render();
  };

  // Arrasto com um dedo, pinça com dois; um toque que mal se mexeu continua sendo toque (clique).
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = 0;
  let pinch: { d: number; s: number } | null = null;
  view.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) moved = 0;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: cam.s }; }
    cancelAnimationFrame(camAnim);
    if (walk) walk.follow = false;
  });
  view.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 8 && !view.hasPointerCapture(e.pointerId)) { view.setPointerCapture(e.pointerId); view.classList.add("dragging"); }
      cam.x += dx; cam.y += dy; render();
    } else if (pointers.size === 2 && pinch) {
      moved = 99;
      const [a, b] = [...pointers.values()];
      const r = view.getBoundingClientRect();
      cam.x += dx / 2; cam.y += dy / 2;
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)) / cam.s);
    }
  });
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) view.classList.remove("dragging");
  };
  view.addEventListener("pointerup", up);
  view.addEventListener("pointercancel", up);
  // Depois de arrastar, o clique que o navegador solta no fim não conta.
  view.addEventListener("click", (e) => { if (moved > 8) { e.stopPropagation(); e.preventDefault(); } }, true);
  view.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  // Toque numa terra em névoa (fora dos pontos).
  view.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".world-point")) return;
    const r = view.getBoundingClientRect();
    const x = (e.clientX - r.left - cam.x) / cam.s, y = (e.clientY - r.top - cam.y) / cam.s;
    const fog = FOG.find((f) => ((x - f.x) / f.rx) ** 2 + ((y - f.y) / f.ry) ** 2 < 1);
    if (fog) onInfo(`${fog.name}: terra não mapeada. Ainda ninguém voltou de lá.`);
  });
  new ResizeObserver(() => render()).observe(view);

  // --- Herói e caminhada ---------------------------------------------------------------------------------------
  // A parte aberta da trilha é uma linha só: a posição do herói é a distância andada nela, e `stops` diz onde fica
  // cada cenário aberto.
  const total = route.getTotalLength();
  const stops = new Map<string, number>([[OPEN_CHAIN[0], 0]]);
  {
    let acc = 0;
    for (let i = 1; i < OPEN_CHAIN.length; i++) {
      const piece = svgEl("path", { d: EDGE_D[OPEN_CHAIN[i - 1] + OPEN_CHAIN[i]] }, over);
      acc += piece.getTotalLength();
      piece.remove();
      stops.set(OPEN_CHAIN[i], Math.min(acc, total));
    }
  }
  let at = 0;
  let facing: (typeof SHEET_DIRS)[number] = "down";
  let flip = false;
  /** Desenha o herói na distância `s`; `heading` é o sentido da caminhada (+1 para a frente, 0 parado). */
  const place = (s: number, heading: number) => {
    at = s;
    const p = route.getPointAtLength(s);
    if (heading !== 0) {
      const clamp = (v: number) => Math.min(total, Math.max(0, v));
      const a = route.getPointAtLength(clamp(s - heading * 2)), b = route.getPointAtLength(clamp(s + heading * 2));
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        facing = Math.abs(dx) > Math.abs(dy) ? "side" : dy < 0 ? "up" : "down";
        if (Math.abs(dx) > 0.2) flip = dx > 0;
      }
    } else facing = "down";
    // Perto de um ponto o herói sobe no ícone; no meio do caminho pisa na trilha.
    const near = Math.min(...[...stops.values()].map((stop) => Math.abs(stop - s)));
    const lift = ON_POINT_LIFT * Math.max(0, 1 - near / 34);
    heroPin.x = p.x;
    heroPin.y = p.y;
    sprite.style.marginTop = `${(-HERO_PX - lift).toFixed(1)}px`;
    const frame = SHEET_DIRS.indexOf(facing) * 3 + (heading === 0 ? 0 : STEP_FRAMES[Math.floor(s / STEP_LEN) % 4]);
    sprite.style.backgroundPosition = `${(frame / 8) * 100}% 0`;
    sprite.style.scale = facing === "side" && flip ? "-1 1" : "";
  };
  let walk: { target: MapId; to: number; ay: number; follow: boolean; raf: number } | null = null;
  const finish = () => {
    if (!walk) return;
    cancelAnimationFrame(walk.raf);
    const { to, ay, follow } = walk;
    walk = null;
    place(to, 0);
    if (follow) { const p = route.getPointAtLength(to); lookAt(p.x, p.y, cam.s, ay, 0); } else render();
  };

  return {
    select(id, { instant = false, anchor } = {}) {
      for (const [pid, p] of points) {
        p.button.classList.toggle("selected", pid === id);
        p.button.setAttribute("aria-pressed", String(pid === id));
      }
      if (walk) { cancelAnimationFrame(walk.raf); walk = null; }
      const to = stops.get(NODE_OF[id]) ?? 0;
      const n = NODES[NODE_OF[id]];
      if (instant || reducedMotion() || Math.abs(to - at) < 0.5) {
        place(to, 0);
        if (anchor !== undefined) lookAt(n.x, n.y, Math.max(cam.s, 0.8), anchor, instant ? 0 : 400);
        else render();
        return;
      }
      // A câmera vai junto: chega no zoom de perto, com o ponto a `anchor` da tela.
      const from = at, t0 = performance.now(), s0 = cam.s, s1 = Math.max(cam.s, 0.8), ay = anchor ?? 0.45;
      const p0 = route.getPointAtLength(from);
      const ay0 = Math.min(0.85, Math.max(0.15, (p0.y * cam.s + cam.y) / view.clientHeight));
      walk = { target: id, to, ay, follow: anchor !== undefined, raf: 0 };
      const step = (now: number) => {
        if (!walk) return;
        const t = Math.min(1, (now - t0) / WALK_MS), e = easeInOut(t);
        place(from + (to - from) * e, Math.sign(to - from));
        if (walk.follow) {
          cam.s = s0 + (s1 - s0) * e;
          cam.x = view.clientWidth / 2 - heroPin.x * cam.s;
          cam.y = view.clientHeight * (ay0 + (ay - ay0) * e) - heroPin.y * cam.s;
        }
        render();
        if (t >= 1) finish();
        else walk.raf = requestAnimationFrame(step);
      };
      walk.raf = requestAnimationFrame(step);
    },
    walkingTo() {
      return walk?.target ?? null;
    },
    skip: finish,
    focus(id, anchor = 0.5, smooth = false) {
      const n = NODES[NODE_OF[id]];
      lookAt(n.x, n.y, 0.8, anchor, smooth ? 450 : 0);
    },
    setRoomCounts(counts) {
      for (const [id, p] of points) {
        const n = counts[id] ?? 0;
        p.count.hidden = n === 0;
        p.count.textContent = `👥 ${n}`;
        rooms.set(id, n);
      }
      labelPoints();
    },
    setProgress(unlocked, cleared) {
      for (const [id, p] of points) {
        p.button.classList.toggle("locked", !unlocked.includes(id));
        p.button.classList.toggle("cleared", cleared.includes(id));
      }
      const open = (node: string) => { const m = NODES[node].map; return !!m && unlocked.includes(m); };
      for (const [a, b] of EDGES) {
        const t = trails.get(a + b)!;
        const on = open(a) && open(b);
        t.line.setAttribute("class", on ? "world-trail-open" : "world-trail-next");
        t.bed.classList.toggle("open", on);
      }
      labelPoints();
    },
    setHero(sheetUrl) {
      sprite.style.backgroundImage = `url("${sheetUrl}")`;
    },
    setBossKills(bosses) {
      for (const b of branches) {
        const open = bosses.includes(b.boss);
        b.beds.classList.toggle("on", open);
        b.ink.classList.toggle("on", open);
      }
    },
  };
}
