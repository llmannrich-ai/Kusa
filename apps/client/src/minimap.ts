import { CLASSES, Tile, hasLineOfSight, isUnderground, lairsOf, type ClassId, type Dungeon, type MapId, type Rect } from "@kusa/shared";
import type { DungeonRoom } from "./net.ts";

/** Quanto cada jogador revela ao redor (tiles): o mesmo que cabe na tela, 9 de largura e 13+ de altura. */
const REVEAL = { x: 5, y: 7 };
/** Tiles mostrados no minimapa compacto, centrado no jogador. */
const COMPACT_TILES = 25;
/** Intervalo entre redesenhos (ms): o minimapa não precisa de 60 quadros por segundo. */
const REDRAW_MS = 150;

/** Cores dos tiles por mapa (RGB). */
const TILE_COLORS = {
  crypt: { floor: [107, 90, 72], bossFloor: [122, 59, 51], wall: [42, 33, 27], water: [42, 33, 27], ruin: [42, 33, 27] },
  swamp: { floor: [88, 118, 54], bossFloor: [110, 110, 92], wall: [24, 46, 26], water: [42, 94, 92], ruin: [156, 152, 126] },
  marsh: { floor: [74, 96, 52], bossFloor: [96, 118, 64], wall: [22, 40, 24], water: [52, 78, 62], ruin: [92, 70, 44] },
  desert: { floor: [214, 178, 118], bossFloor: [226, 196, 140], wall: [150, 108, 60], water: [48, 140, 156], ruin: [150, 108, 60] },
  cavern: { floor: [92, 104, 118], bossFloor: [118, 92, 120], wall: [20, 26, 34], water: [40, 84, 100], ruin: [20, 26, 34] },
  dunes: { floor: [212, 172, 112], bossFloor: [232, 220, 190], wall: [160, 112, 62], water: [52, 150, 156], ruin: [120, 90, 62], sand: [234, 206, 152] },
  mesas: { floor: [204, 146, 98], bossFloor: [214, 160, 112], wall: [130, 60, 38], water: [64, 150, 138], ruin: [96, 52, 34], sand: [228, 182, 132] },
  oldwood: { floor: [112, 150, 66], bossFloor: [140, 172, 84], wall: [34, 62, 28], water: [70, 140, 150], ruin: [110, 82, 52] },
  heartwood: { floor: [66, 108, 74], bossFloor: [84, 132, 112], wall: [16, 38, 30], water: [30, 64, 76], ruin: [92, 104, 100] },
} satisfies Record<MapId, Record<string, number[]>>;
/** Subterrâneo do deserto: rocha escura, chão de areia batida e o salão dos baús em arenito. */
const CAVE_COLORS = { floor: [104, 82, 60], bossFloor: [128, 74, 52], wall: [34, 24, 18], hall: [150, 126, 92] };

const COLORS = {
  me: "#ffffff",
  outline: "#000000",
  portal: "#4aa3ff",
  bossPortal: "#b36bff",
  bossRoom: "#e74c3c",
  chest: "#f1c40f",
  cave: "#e08a2c",
  needleTail: "#e8e0d0",
};
/** Bússola em volta do jogador (px de tela): distância do centro, comprimento e largura da agulha. */
const COMPASS = { radius: 13, length: 11, width: 5 };

/**
 * Minimapa do canto superior esquerdo, como no Tibia: norte para cima, só o que a equipe já viu
 * (cada jogador revela os tiles à vista, sem atravessar paredes). Tocar nele abre o mapa inteiro.
 */
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  /** Mapa explorado com 1 pixel por tile; é escalado ao desenhar. */
  private fog: HTMLCanvasElement;
  private fogPixels: ImageData;
  private explored: Uint8Array;
  /** Último tile onde cada jogador revelou o entorno (só revela de novo quando ele anda). */
  private lastReveal = new Map<string, number>();
  private nextDrawAt = 0;
  private expanded = false;

  constructor(private room: DungeonRoom, private dungeon: Dungeon) {
    this.canvas = document.getElementById("minimap") as HTMLCanvasElement;
    this.canvas.hidden = false;
    this.ctx = this.canvas.getContext("2d")!;
    this.fog = document.createElement("canvas");
    this.fog.width = dungeon.width;
    this.fog.height = dungeon.height;
    this.fogPixels = new ImageData(dungeon.width, dungeon.height);
    this.explored = new Uint8Array(dungeon.width * dungeon.height);
    this.canvas.addEventListener("pointerdown", this.onPress);
    window.addEventListener("keydown", this.onKey);
  }

  destroy() {
    this.setExpanded(false);
    this.canvas.hidden = true;
    this.canvas.removeEventListener("pointerdown", this.onPress);
    window.removeEventListener("keydown", this.onKey);
  }

  update(time: number) {
    if (time < this.nextDrawAt) return;
    this.nextDrawAt = time + REDRAW_MS;
    this.revealAroundPlayers();
    this.draw();
  }

  private onPress = (e: PointerEvent) => {
    // Não deixa o toque chegar ao jogo (joystick ou alvo).
    e.preventDefault();
    e.stopPropagation();
    this.setExpanded(!this.expanded);
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === "m" || e.key === "M") this.setExpanded(!this.expanded);
  };

  private setExpanded(expanded: boolean) {
    this.expanded = expanded;
    this.canvas.classList.toggle("expanded", expanded);
    this.nextDrawAt = 0;
  }

  // --- Exploração ------------------------------------------------------------

  private revealAroundPlayers() {
    const d = this.dungeon;
    let changed = false;
    this.room.state.players.forEach((p, id) => {
      if (p.status !== "playing") return;
      const at = p.y * d.width + p.x;
      if (this.lastReveal.get(id) === at) return;
      this.lastReveal.set(id, at);
      for (let y = p.y - REVEAL.y; y <= p.y + REVEAL.y; y++) {
        for (let x = p.x - REVEAL.x; x <= p.x + REVEAL.x; x++) {
          if (x < 0 || y < 0 || x >= d.width || y >= d.height) continue;
          const i = y * d.width + x;
          if (this.explored[i] || !hasLineOfSight(d, p.x, p.y, x, y)) continue;
          this.explored[i] = 1;
          this.paintTile(x, y);
          changed = true;
        }
      }
    });
    if (changed) this.fog.getContext("2d")!.putImageData(this.fogPixels, 0, 0);
  }

  private paintTile(x: number, y: number) {
    const d = this.dungeon;
    const tile = d.tiles[y * d.width + x];
    const colors = TILE_COLORS[d.mapId];
    const inBoss = lairsOf(d).some((l) => inRect(l.room, x, y));
    const [r, g, bl] = d.cave && isUnderground(d, x)
      ? (tile === Tile.Wall ? CAVE_COLORS.wall : d.cave && inRect(d.cave.reward, x, y) ? CAVE_COLORS.hall : inBoss ? CAVE_COLORS.bossFloor : CAVE_COLORS.floor)
      : tile === Tile.Wall ? colors.wall : tile === Tile.Water ? colors.water : tile === Tile.Ruin ? colors.ruin
      : inBoss ? colors.bossFloor : tile === Tile.Sand ? ("sand" in colors ? colors.sand : colors.floor) : colors.floor;
    const i = (y * d.width + x) * 4;
    this.fogPixels.data.set([r, g, bl, 255], i);
  }

  // --- Desenho ---------------------------------------------------------------

  private draw() {
    const d = this.dungeon;
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const size = Math.round(canvas.clientWidth * dpr);
    if (size === 0) return;
    if (canvas.width !== size) { canvas.width = size; canvas.height = size; }

    const me = this.room.state.players.get(this.room.sessionId);
    // Compacto: janela centrada no jogador. Aberto: a área inteira onde ele está (no deserto, a superfície ou a caverna).
    const area = this.areaOf(me);
    const tiles = this.expanded ? Math.max(area.w, area.h) : COMPACT_TILES;
    const scale = size / tiles;
    const originX = this.expanded || !me ? area.x + (area.w - tiles) / 2 : me.x + 0.5 - tiles / 2;
    const originY = this.expanded || !me ? area.y + (area.h - tiles) / 2 : me.y + 0.5 - tiles / 2;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.fog, 0, 0);

    // Um pixel da tela em tiles: marcadores e linhas têm tamanho fixo na tela nos dois modos.
    const px = dpr / scale;

    // A sala do boss é o objetivo: sempre marcada, mesmo antes de ser vista (no deserto, só quando já se está na
    // caverna: achar a caverna faz parte da hunt).
    for (const { room: b } of lairsOf(d)) {
      if (!inRect(area, b.x, b.y)) continue;
      ctx.strokeStyle = COLORS.bossRoom;
      ctx.lineWidth = 1.5 * px;
      ctx.setLineDash([4 * px, 3 * px]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
    }

    this.mark(d.portal.x, d.portal.y, COLORS.portal, 5 * px, px);
    const down = this.room.state.lairsDown;
    lairsOf(d).forEach((l, i) => { if (down & (1 << i)) this.mark(l.portal.x, l.portal.y, COLORS.bossPortal, 6 * px, px); });
    for (const c of d.cave ? [d.cave.entrance, d.cave.exit] : []) {
      if (this.explored[c.y * d.width + c.x]) this.mark(c.x, c.y, COLORS.cave, 5 * px, px);
    }
    this.room.state.chests.forEach((chest) => {
      if (!chest.opened && this.explored[chest.y * d.width + chest.x]) this.mark(chest.x, chest.y, COLORS.chest, 4 * px, px);
    });
    this.room.state.players.forEach((p, id) => {
      if (p.status !== "playing" || id === this.room.sessionId) return;
      const color = `#${(CLASSES[p.classId as ClassId]?.color ?? 0xffffff).toString(16).padStart(6, "0")}`;
      this.mark(p.x, p.y, color, 5 * px, px);
    });
    if (me) this.mark(me.x, me.y, COLORS.me, 6 * px, px);
    if (me && me.status === "playing") this.drawCompass(me, area, px);
  }

  /**
   * Para onde a bússola aponta: o boss; no deserto, da superfície, a boca da caverna que leva até ele; depois que
   * o boss morre, o portal do boss. Nulo quando o jogador já chegou (dentro da sala do boss ou em cima do portal).
   */
  private compassTarget(me: { x: number; y: number }, area: Rect): { x: number; y: number; color: string } | null {
    const d = this.dungeon;
    if (d.lairs) return this.lairTarget(me);
    if (this.room.state.bossDefeated) {
      const p = d.bossPortal;
      if (!inRect(area, p.x, p.y)) return d.cave ? { ...d.cave.entrance, color: COLORS.cave } : null;
      return Math.abs(p.x - me.x) <= 1 && Math.abs(p.y - me.y) <= 1 ? null : { ...p, color: COLORS.bossPortal };
    }
    const b = d.boss;
    if (!inRect(area, b.x, b.y)) return d.cave ? { ...d.cave.entrance, color: COLORS.cave } : null;
    if (inRect(b, me.x, me.y)) return null;
    return { x: b.x + b.w / 2 - 0.5, y: b.y + b.h / 2 - 0.5, color: COLORS.bossRoom };
  }

  /**
   * Caverna da Travessia: o portal aberto mais perto; sem nenhum, o covil mais perto com o boss vivo. Nulo dentro
   * do covil ou ao lado do portal.
   */
  private lairTarget(me: { x: number; y: number }): { x: number; y: number; color: string } | null {
    const down = this.room.state.lairsDown;
    const lairs = lairsOf(this.dungeon);
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x - me.x, p.y - me.y);
    const open = lairs.filter((_, i) => down & (1 << i)).map((l) => l.portal).sort((a, b) => dist(a) - dist(b))[0];
    if (open) return Math.abs(open.x - me.x) <= 1 && Math.abs(open.y - me.y) <= 1 ? null : { ...open, color: COLORS.bossPortal };
    const room = lairs.map((l) => l.room).sort((a, b) => dist(centerOfRect(a)) - dist(centerOfRect(b)))[0];
    if (!room || inRect(room, me.x, me.y)) return null;
    return { x: room.x + room.w / 2 - 0.5, y: room.y + room.h / 2 - 0.5, color: COLORS.bossRoom };
  }

  /** Agulha de bússola girando em volta do jogador: a ponta na cor do destino, a cauda clara. */
  private drawCompass(me: { x: number; y: number }, area: Rect, px: number) {
    const target = this.compassTarget(me, area);
    if (!target) return;
    const dx = target.x - me.x;
    const dy = target.y - me.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const ux = dx / dist;
    const uy = dy / dist;
    // Perpendicular, para a largura da agulha.
    const vx = -uy;
    const vy = ux;
    const cx = me.x + 0.5 + ux * COMPASS.radius * px;
    const cy = me.y + 0.5 + uy * COMPASS.radius * px;
    const half = (COMPASS.length / 2) * px;
    const w = (COMPASS.width / 2) * px;
    const tip = { x: cx + ux * half, y: cy + uy * half };
    const tail = { x: cx - ux * half, y: cy - uy * half };
    const left = { x: cx + vx * w, y: cy + vy * w };
    const right = { x: cx - vx * w, y: cy - vy * w };

    const ctx = this.ctx;
    ctx.lineJoin = "round";
    ctx.lineWidth = 2 * px;
    ctx.strokeStyle = COLORS.outline;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(tail.x, tail.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = target.color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.needleTail;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
  }

  /** A parte do mapa onde o jogador está: no deserto, a superfície ou o subterrâneo; nos outros, a dungeon toda. */
  private areaOf(me: { x: number; y: number } | undefined): Rect {
    const d = this.dungeon;
    const under = d.cave?.under;
    if (!under) return { x: 0, y: 0, w: d.width, h: d.height };
    if (me && isUnderground(d, me.x)) return under;
    return { x: 0, y: 0, w: under.x, h: d.height };
  }

  /** Quadrado com contorno escuro centrado num tile (`size` e `px` em tiles). */
  private mark(x: number, y: number, color: string, size: number, px: number) {
    const ctx = this.ctx;
    const cx = x + 0.5;
    const cy = y + 0.5;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(cx - size / 2 - px, cy - size / 2 - px, size + 2 * px, size + 2 * px);
    ctx.fillStyle = color;
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
  }
}

function inRect(r: Rect, x: number, y: number) {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

function centerOfRect(r: Rect) {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
