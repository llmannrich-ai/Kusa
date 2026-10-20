import { CLASSES, Tile, centerOf, hasLineOfSight, type ClassId, type Dungeon, type MapId } from "@kusa/shared";
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
  swamp: { floor: [86, 118, 56], bossFloor: [128, 120, 98], wall: [20, 36, 20], water: [46, 86, 104], ruin: [160, 150, 128] },
} satisfies Record<MapId, Record<string, number[]>>;

const COLORS = {
  me: "#ffffff",
  outline: "#000000",
  portal: "#4aa3ff",
  bossPortal: "#b36bff",
  bossRoom: "#e74c3c",
  chest: "#f1c40f",
};

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
    const b = d.boss;
    const tile = d.tiles[y * d.width + x];
    const colors = TILE_COLORS[d.mapId];
    const inBoss = x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
    const [r, g, bl] = tile === Tile.Wall ? colors.wall : tile === Tile.Water ? colors.water : tile === Tile.Ruin ? colors.ruin
      : inBoss ? colors.bossFloor : colors.floor;
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
    // Compacto: janela centrada no jogador. Aberto: a dungeon inteira.
    const tiles = this.expanded ? d.width : COMPACT_TILES;
    const scale = size / tiles;
    const originX = this.expanded || !me ? 0 : me.x + 0.5 - tiles / 2;
    const originY = this.expanded || !me ? 0 : me.y + 0.5 - tiles / 2;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.fog, 0, 0);

    // Um pixel da tela em tiles: marcadores e linhas têm tamanho fixo na tela nos dois modos.
    const px = dpr / scale;

    // A sala do boss é o objetivo: sempre marcada, mesmo antes de ser vista.
    const b = d.boss;
    ctx.strokeStyle = COLORS.bossRoom;
    ctx.lineWidth = 1.5 * px;
    ctx.setLineDash([4 * px, 3 * px]);
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.setLineDash([]);

    this.mark(d.portal.x, d.portal.y, COLORS.portal, 5 * px, px);
    if (this.room.state.bossDefeated) {
      const c = centerOf(b);
      this.mark(c.x, c.y, COLORS.bossPortal, 6 * px, px);
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
