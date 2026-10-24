import { MAPS, type MapId } from "@kusa/shared";

// Mapa mundi de Kosaradius (tela de Batalhas): o planeta em pergaminho, com um ponto por cenário ligado por trilhas.
// Só escolhe o cenário: não entra em `RULES_FILES`, então mudar o desenho não muda a versão das regras.

/** Tamanho do desenho; os pontos usam as mesmas coordenadas e a largura acompanha a coluna do jogo. */
const W = 412;
const H = 2000;

/** Onde fica cada cenário no mapa e a região da história (`docs/MAPA_MUNDI_PLANO.md`). Mapa novo precisa de um ponto. */
export const WORLD_POINTS: Record<MapId, { x: number; y: number; region: string }> = {
  marsh: { x: 150, y: 1765, region: "Verdemar" },
  crypt: { x: 222, y: 1510, region: "Verdemar · serra do norte" },
  desert: { x: 300, y: 1190, region: "Solária" },
  swamp: { x: 95, y: 840, region: "Arquipélago Afundado" },
};

/** Terras ainda sem cenário, debaixo da névoa: tocar só avisa. */
const FOG = [
  { name: "Gelo de Hrimfal", x: 206, y: 130, w: 300, h: 160 },
  { name: "Ilha de Cinza", x: 328, y: 470, w: 130, h: 110 },
  { name: "Cidadela Caída", x: 262, y: 698, w: 130, h: 110 },
];

const LAND = "#e7dcb2";
const INK = "#4a3420";
const HALO = `fill="none" stroke="#8a7458" stroke-width="11" opacity="0.25"`;

/** Costa com o halo de tinta por fora (desenhado antes) e a terra por cima. */
const coast = (d: string, fill = LAND) => `<path d="${d}" ${HALO}/><path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="1.6"/>`;

const label = (x: number, y: number, text: string, size: number, spacing = 3) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" letter-spacing="${spacing}" font-variant="small-caps" fill="${INK}">${text}</text>`;

const unmapped = (x: number, y: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-style="italic" fill="#5a4128">terra não mapeada</text>`;

/** O desenho (texto fixo, sem nada de fora: pode ir por innerHTML). Pontos e herói vão por cima, em HTML. */
const ART = `<svg class="world-art" viewBox="0 0 ${W} ${H}" aria-hidden="true" font-family="Georgia, serif">
  <defs>
    <pattern id="wm-ondas" width="46" height="30" patternUnits="userSpaceOnUse">
      <path d="M6 10q5-5 10 0q5 5 10 0" fill="none" stroke="#8f9c83" stroke-width="1" opacity="0.55"/>
      <path d="M26 25q4-4 8 0q4 4 8 0" fill="none" stroke="#8f9c83" stroke-width="1" opacity="0.4"/>
    </pattern>
    <filter id="wm-nevoa" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
    <radialGradient id="wm-vinheta" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="#5a3f24" stop-opacity="0"/><stop offset="1" stop-color="#5a3f24" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#d3d6bd"/>
  <rect width="${W}" height="${H}" fill="url(#wm-ondas)"/>

  ${coast("M0 0H412V200C380 230 350 190 320 220C290 250 250 205 215 235C180 260 150 210 115 240C80 265 45 215 0 245Z", "#f1ece0")}
  <path d="M60 150l20 18-8 22M250 120l18 30 22 6M330 170l-14 20M150 90l24 12" fill="none" stroke="#8a9aa8" stroke-width="1.2"/>
  <path d="M95 200l10-18 10 18ZM290 190l12-22 12 22ZM190 160l8-14 8 14Z" fill="#e2e6ea" stroke="${INK}" stroke-width="1"/>

  <path d="M42 495q10-18 20 0M70 495q10-18 20 0M98 495q12-26 26-8" fill="none" stroke="#3d5a52" stroke-width="5" stroke-linecap="round"/>
  <path d="M42 495q10-18 20 0M70 495q10-18 20 0M98 495q12-26 26-8" fill="none" stroke="#7fa293" stroke-width="2" stroke-linecap="round"/>
  <path d="M122 485l12-6-4 10Z" fill="#3d5a52"/>
  <text x="206" y="590" text-anchor="middle" font-size="15" font-style="italic" letter-spacing="3" fill="#4d5c4f">Oceano da Grande Maré</text>

  ${coast("M270 470C270 420 330 400 365 430C395 455 390 510 350 525C310 540 270 515 270 470Z", "#e6d3ad")}
  <path d="M302 488L328 436L354 488Z" fill="#8c6a52" stroke="${INK}" stroke-width="1.4"/>
  <path d="M322 440H334L332 448H324Z" fill="#b8452a"/>
  <path d="M328 432q-6-12 2-20q8-8 0-18" fill="none" stroke="#6e6258" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>

  ${coast("M200 690C200 650 260 630 300 655C335 675 330 730 290 745C250 760 200 735 200 690Z")}
  <path d="M244 712V682H252V676H258V682H266V676H272V682H280V712Z" fill="#b5a689" stroke="${INK}" stroke-width="1.2"/>
  <path d="M234 712V688L240 680L246 688V712ZM278 712V690L284 682L290 690V712Z" fill="#a39477" stroke="${INK}" stroke-width="1.2"/>

  <g filter="url(#wm-nevoa)" fill="#f6efdf" opacity="0.88">
    <ellipse cx="206" cy="130" rx="230" ry="120"/><ellipse cx="328" cy="470" rx="92" ry="74"/><ellipse cx="262" cy="698" rx="90" ry="70"/>
  </g>
  ${label(206, 118, "Gelo de Hrimfal", 21, 4)}${unmapped(206, 140)}
  ${label(328, 462, "Ilha de Cinza", 17)}${unmapped(328, 482)}
  ${label(262, 694, "Cidadela Caída", 17)}${unmapped(262, 714)}

  ${coast("M45 820C45 790 100 780 130 800C155 818 145 860 110 868C75 876 45 850 45 820Z")}
  ${coast("M18 915C20 895 60 893 68 910C74 928 40 938 18 915Z")}
  ${coast("M150 905C152 885 195 885 200 905C203 925 160 935 150 905Z")}
  ${coast("M70 745C72 732 100 730 104 744C106 758 74 760 70 745Z")}
  <g fill="#c9c1a6" stroke="${INK}" stroke-width="1"><path d="M168 846V828l3-3 3 4V846Z"/><path d="M180 850V836l3 2 3-3V850Z"/><path d="M176 900V888l3-2 3 3V900Z"/></g>
  ${label(112, 975, "Arquipélago Afundado", 16)}

  ${coast("M138 1110C140 1100 160 1098 163 1108C165 1120 142 1122 138 1110Z")}
  ${coast("M75 1245C77 1228 115 1225 118 1243C120 1260 80 1265 75 1245Z")}

  ${coast("M210 1060C260 1020 360 1030 395 1080C410 1140 400 1240 360 1300C320 1340 250 1330 220 1290C190 1250 230 1200 205 1160C185 1120 180 1090 210 1060Z", "#efd9a4")}
  <path d="M232 1110q14-10 28 0M262 1138q14-10 28 0M340 1130q14-10 28 0M240 1250q14-10 28 0M330 1240q14-10 28 0M360 1180q12-8 24 0" fill="none" stroke="#a9834a" stroke-width="1.3" stroke-linecap="round"/>
  <ellipse cx="362" cy="1214" rx="9" ry="3" fill="#7fa6aa"/>
  <path d="M360 1212q-1-10 2-16M362 1196q-7-2-10 3M362 1196q7-3 10 2M362 1196q-2-6-6-7M362 1196q3-6 7-6" fill="none" stroke="#3f6a3a" stroke-width="1.6" stroke-linecap="round"/>
  ${label(306, 1078, "Solária", 19, 5)}

  <g transform="translate(52 1040)">
    <circle r="30" fill="none" stroke="${INK}" stroke-width="1"/><circle r="24" fill="none" stroke="${INK}" stroke-width="0.6"/>
    <path d="M0-38L6 0L0 38L-6 0Z" fill="${INK}"/><path d="M-38 0L0-6L38 0L0 6Z" fill="${INK}"/>
    <path d="M0-38L6 0H0ZM0 38L-6 0H0ZM-38 0L0 6V0ZM38 0L0-6V0Z" fill="#c8962e"/>
    <text y="-42" text-anchor="middle" font-size="14" fill="${INK}">N</text>
  </g>
  <g transform="translate(60 1160)">
    <path d="M-16 0H16L11 8H-11Z" fill="#7a5a3a" stroke="${INK}" stroke-width="1"/><path d="M0 0V-24" stroke="${INK}" stroke-width="1.4"/>
    <path d="M1-22Q13-14 1-4Z" fill="#f1ece0" stroke="${INK}" stroke-width="1"/><path d="M-1-20Q-10-13-1-6Z" fill="#f1ece0" stroke="${INK}" stroke-width="1"/>
  </g>

  ${coast("M30 1450C80 1400 180 1410 250 1430C320 1445 370 1500 380 1580C392 1660 360 1720 330 1780C300 1850 230 1900 160 1890C90 1880 40 1830 30 1760C20 1690 50 1640 40 1590C30 1540 0 1500 30 1450Z")}
  <path d="M262 1520C280 1580 300 1640 336 1700C352 1726 364 1748 376 1760" fill="none" stroke="#7f9a95" stroke-width="2.2"/>
  <g fill="#d2c39c" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round">
    <path d="M140 1484L160 1452L180 1484Z"/><path d="M176 1478L200 1440L224 1478Z"/><path d="M238 1482L262 1446L286 1482Z"/>
    <path d="M276 1490L294 1462L312 1490Z"/><path d="M86 1480L102 1458L118 1480Z"/>
  </g>
  <g fill="#5d7450" stroke="#2f3d2a" stroke-width="0.8">
    <path d="M62 1690l7-18 7 18Z"/><path d="M84 1700l6-16 6 16Z"/><path d="M240 1700l7-18 7 18Z"/><path d="M262 1716l6-16 6 16Z"/>
    <path d="M70 1810l7-18 7 18Z"/><path d="M244 1820l7-18 7 18Z"/><path d="M266 1806l6-16 6 16Z"/><path d="M110 1660l6-16 6 16Z"/>
    <path d="M300 1640l6-16 6 16Z"/><path d="M200 1850l6-16 6 16Z"/><path d="M96 1850l6-16 6 16Z"/><path d="M320 1740l6-16 6 16Z"/>
  </g>
  <path d="M120 1740q10-3 20 0M190 1790q10-3 20 0M60 1760q8-3 16 0" fill="none" stroke="#7f9a95" stroke-width="1.4"/>
  ${label(300, 1612, "Verdemar", 19, 5)}

  <path id="wm-arco" d="M14 1446Q206 1268 398 1446" fill="none"/>
  <text font-size="42" letter-spacing="9" font-variant="small-caps" fill="#e07a2c" opacity="0.26"><textPath href="#wm-arco" xlink:href="#wm-arco" startOffset="50%" text-anchor="middle">Kosaradius</textPath></text>

  <path d="M150 1765C140 1690 210 1610 222 1510" fill="none" stroke="#7a2e22" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/>
  <path d="M222 1510C250 1430 330 1330 300 1190" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.7"/>
  <path d="M300 1190C260 1060 140 1010 95 840" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.7"/>

  <rect width="${W}" height="${H}" fill="url(#wm-vinheta)"/>
</svg>`;

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

export interface WorldMapView {
  /** Marca o cenário escolhido e leva o herói até ele (`instant`: sem caminhar, ao abrir a tela). */
  select(id: MapId, instant?: boolean): void;
  /** Rola o mapa até o ponto, que fica a `anchor` da altura da tela (com `smooth`, deslizando). */
  scrollTo(id: MapId, anchor?: number, smooth?: boolean): void;
  /** Quantas salas abertas cada cenário tem (o selo 👥 do ponto). */
  setRoomCounts(counts: Partial<Record<MapId, number>>): void;
  /** Troca o boneco do herói (a classe escolhida no menu). */
  setHero(url: string): void;
}

/**
 * Monta o mapa em `root` (dentro de um contêiner que rola na vertical). `icons` são os desenhos dos cenários,
 * `onPoint` recebe o toque num ponto e `onFog` o toque numa terra sem cenário.
 */
export function createWorldMap(root: HTMLElement, icons: Record<MapId, string>, onPoint: (id: MapId) => void, onFog: (name: string) => void): WorldMapView {
  root.innerHTML = ART;
  const points = new Map<MapId, { button: HTMLButtonElement; count: HTMLElement }>();
  for (const fog of FOG) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "world-fog";
    button.setAttribute("aria-label", `${fog.name}: terra não mapeada`);
    Object.assign(button.style, {
      left: pct(fog.x - fog.w / 2, W), top: pct(fog.y - fog.h / 2, H), width: pct(fog.w, W), height: pct(fog.h, H),
    });
    button.onclick = () => onFog(fog.name);
    root.append(button);
  }
  for (const id of Object.keys(WORLD_POINTS) as MapId[]) {
    const at = WORLD_POINTS[id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "world-point";
    button.style.left = pct(at.x, W);
    button.style.top = pct(at.y, H);
    const icon = document.createElement("span");
    icon.className = "world-icon";
    icon.innerHTML = icons[id];
    const name = document.createElement("span");
    name.className = "world-name";
    name.textContent = MAPS[id].name;
    const count = document.createElement("span");
    count.className = "world-count";
    count.hidden = true;
    icon.append(count);
    button.append(icon, name);
    button.onclick = () => onPoint(id);
    root.append(button);
    points.set(id, { button, count });
  }
  const hero = document.createElement("img");
  hero.className = "world-hero";
  hero.alt = "";
  root.append(hero);

  return {
    select(id, instant = false) {
      for (const [pid, p] of points) {
        p.button.classList.toggle("selected", pid === id);
        p.button.setAttribute("aria-pressed", String(pid === id));
      }
      hero.classList.toggle("instant", instant);
      hero.style.left = pct(WORLD_POINTS[id].x, W);
      hero.style.top = pct(WORLD_POINTS[id].y, H);
    },
    scrollTo(id, anchor = 0.55, smooth = false) {
      const scroller = root.parentElement!;
      const y = (WORLD_POINTS[id].y / H) * root.clientHeight;
      scroller.scrollTo({ top: Math.max(0, y - scroller.clientHeight * anchor), behavior: smooth ? "smooth" : "auto" });
    },
    setRoomCounts(counts) {
      for (const [id, p] of points) {
        const n = counts[id] ?? 0;
        p.count.hidden = n === 0;
        p.count.textContent = `👥 ${n}`;
        p.button.setAttribute("aria-label", `${MAPS[id].name}${n > 0 ? `, ${n} ${n === 1 ? "sala aberta" : "salas abertas"}` : ""}`);
      }
    },
    setHero(url) {
      hero.src = url;
    },
  };
}
