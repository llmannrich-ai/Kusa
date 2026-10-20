import * as Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import {
  CLASSES,
  MONSTERS,
  MSG,
  TILE_SIZE,
  Tile,
  centerOf,
  generateDungeon,
  type ClassId,
  type DamageMessage,
  type Dungeon,
  type MonsterKind,
  type NoticeMessage,
} from "@kusa/shared";
import { MoveInput } from "./input.ts";
import type { ChestView, DungeonRoom, MonsterView, PlayerView } from "./net.ts";

/** Campo de visão mínimo com o celular na vertical: 9 tiles de largura e pelo menos 13 de altura. */
const VIEW_TILES = { w: 9, h: 13 };
/** Quanto o jogador fica acima do centro da tela, em fração da altura (a parte de baixo é dos polegares). */
const FOLLOW_LIFT = 0.12;
/** Até onde o botão de alvo procura monstros (tiles). */
const TARGET_CYCLE_RANGE = 8;

const COLORS = {
  wall: 0x1a1512,
  wallEdge: 0x2e241d,
  floor: 0x4a4038,
  floorAlt: 0x443a33,
  portal: 0x3fa7d6,
  target: 0xe74c3c,
  hpBack: 0x000000,
  hpPlayer: 0x2ecc71,
  hpMonster: 0xe74c3c,
  chestLocked: 0x5d4037,
  chestUnlocked: 0xc9a24a,
  chestOpen: 0x3e2723,
};

const TEXT_STYLE = {
  fontFamily: "Georgia, serif",
  fontSize: "10px",
  color: "#e8dcc8",
  stroke: "#000",
  strokeThickness: 3,
};

/** Um personagem desenhado: corpo + barra de HP dentro de um container. */
interface Unit {
  container: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Graphics;
  barWidth: number;
  barY: number;
}

/** Cena da hunt: desenha a dungeon gerada pela seed e o estado (jogadores, monstros, baús) sincronizado pelo servidor. */
export class DungeonScene extends Phaser.Scene {
  private room!: DungeonRoom;
  private dungeon!: Dungeon;
  private avatars = new Map<string, Unit>();
  private monsters = new Map<string, Unit>();
  private chests = new Map<string, Phaser.GameObjects.Rectangle>();
  private targetRing!: Phaser.GameObjects.Graphics;
  private move!: MoveInput;
  private nextSendAt = 0;

  constructor() {
    super("dungeon");
  }

  init(data: { room: DungeonRoom }) {
    this.room = data.room;
  }

  create() {
    this.dungeon = generateDungeon(this.room.state.seed);
    this.drawMap();

    const callbacks = Callbacks.get(this.room);
    callbacks.onAdd("players", (player: PlayerView, sessionId: string) => {
      this.addAvatar(sessionId, player);
      callbacks.onChange(player, () => this.syncAvatar(sessionId, player));
    });
    callbacks.onRemove("players", (_player: PlayerView, sessionId: string) => {
      this.avatars.get(sessionId)?.container.destroy();
      this.avatars.delete(sessionId);
    });

    callbacks.onAdd("monsters", (monster: MonsterView, id: string) => {
      this.addMonster(id, monster);
      callbacks.onChange(monster, () => this.syncMonster(id, monster));
    });
    callbacks.onRemove("monsters", (_monster: MonsterView, id: string) => {
      this.monsters.get(id)?.container.destroy();
      this.monsters.delete(id);
    });

    callbacks.onAdd("chests", (chest: ChestView, id: string) => {
      const rect = this.add.rectangle(this.toPx(chest.x), this.toPx(chest.y), TILE_SIZE - 10, TILE_SIZE - 14)
        .setStrokeStyle(2, 0x000000).setDepth(5);
      this.chests.set(id, rect);
      this.syncChest(id, chest);
      callbacks.onChange(chest, () => this.syncChest(id, chest));
    });

    callbacks.listen("bossDefeated", (open: boolean) => { if (open) this.drawBossPortal(); });

    this.room.onMessage(MSG.damage, (msg: DamageMessage) =>
      this.floatText(msg.x, msg.y, `-${msg.amount}`, msg.toPlayer ? 0xff5e57 : 0xffffff));
    this.room.onMessage(MSG.notice, (msg: NoticeMessage) => this.floatText(msg.x, msg.y, msg.text, msg.color));

    this.targetRing = this.add.graphics().setDepth(9);

    // Sem alvo travado, o servidor mira sozinho no monstro mais próximo ao alcance.
    // Tocar num monstro trava o alvo; o botão de alvo (ou Tab) troca para o próximo; Esc destrava.
    const kb = this.input.keyboard;
    kb?.addCapture("TAB");
    kb?.on("keydown-TAB", () => this.cycleTarget());
    kb?.on("keydown-ESC", () => this.room.send(MSG.target, { id: null }));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const id = this.monsterAtWorld(pointer.worldX, pointer.worldY);
      if (id) this.room.send(MSG.target, { id });
    });

    this.move = new MoveInput(this, this.game.canvas, (clientX, clientY) => {
      const rect = this.game.canvas.getBoundingClientRect();
      const world = this.cameras.main.getWorldPoint(clientX - rect.left, clientY - rect.top);
      return this.monsterAtWorld(world.x, world.y) !== null;
    });
    const targetButton = this.addActionButton("🎯", "Próximo alvo", () => this.cycleTarget());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.move.destroy();
      targetButton.remove();
    });

    this.cameras.main.setBackgroundColor(COLORS.wall);
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
  }

  update(time: number) {
    const { dx, dy } = this.move.vector();
    // O servidor decide a velocidade real; o cliente só reenvia a intenção enquanto o comando está ativo.
    if ((dx || dy) && time >= this.nextSendAt) {
      this.room.send(MSG.move, { dx, dy });
      this.nextSendAt = time + 60;
    }
    this.drawTargetRing();
  }

  // --- Alvo ---------------------------------------------------------------

  private me() {
    return this.room.state.players.get(this.room.sessionId);
  }

  /** Monstro sob um ponto do mundo, com folga de quase um tile (o dedo é impreciso). */
  private monsterAtWorld(worldX: number, worldY: number): string | null {
    let best: string | null = null;
    let bestDist = TILE_SIZE * 0.9;
    this.monsters.forEach((unit, id) => {
      const dist = Math.hypot(unit.container.x - worldX, unit.container.y - worldY);
      if (dist < bestDist) { bestDist = dist; best = id; }
    });
    return best;
  }

  /** Trava o alvo no próximo monstro por ordem de distância (repetir percorre todos por perto). */
  private cycleTarget() {
    const me = this.me();
    if (!me) return;
    const near: { id: string; dist: number }[] = [];
    this.room.state.monsters.forEach((m, id) => {
      const dist = Math.max(Math.abs(m.x - me.x), Math.abs(m.y - me.y));
      if (dist <= TARGET_CYCLE_RANGE) near.push({ id, dist });
    });
    if (near.length === 0) return;
    near.sort((a, b) => a.dist - b.dist || a.id.localeCompare(b.id));
    const current = near.findIndex((n) => n.id === me.target);
    this.room.send(MSG.target, { id: near[(current + 1) % near.length].id });
  }

  /** Botão grande na zona do polegar direito (`#actions`). */
  private addActionButton(icon: string, label: string, onPress: () => void) {
    const button = document.createElement("button");
    button.className = "action";
    button.textContent = icon;
    button.title = label;
    button.setAttribute("aria-label", label);
    // pointerdown responde na hora, sem o atraso do click no toque.
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); onPress(); });
    document.getElementById("actions")?.append(button);
    return button;
  }

  private drawTargetRing() {
    const g = this.targetRing.clear();
    const unit = this.monsters.get(this.me()?.target ?? "");
    if (!unit) return;
    const half = TILE_SIZE / 2;
    g.lineStyle(2, COLORS.target).strokeRect(unit.container.x - half, unit.container.y - half, TILE_SIZE, TILE_SIZE);
  }

  // --- Mapa ---------------------------------------------------------------

  private drawMap() {
    const g = this.add.graphics();
    const d = this.dungeon;
    for (let y = 0; y < d.height; y++) {
      for (let x = 0; x < d.width; x++) {
        const t = d.tiles[y * d.width + x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (t === Tile.Wall) {
          // Parede com borda clara quando encosta no chão, para dar leitura de volume.
          const touchesFloor = d.tiles[(y + 1) * d.width + x] > 0;
          g.fillStyle(touchesFloor ? COLORS.wallEdge : COLORS.wall).fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          g.fillStyle((x + y) % 2 ? COLORS.floor : COLORS.floorAlt).fillRect(px, py, TILE_SIZE, TILE_SIZE);
          if (t === Tile.Portal) {
            g.fillStyle(COLORS.portal).fillCircle(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 3);
          }
        }
      }
    }
    const b = d.boss;
    g.lineStyle(2, 0x8b1a1a).strokeRect(b.x * TILE_SIZE, b.y * TILE_SIZE, b.w * TILE_SIZE, b.h * TILE_SIZE);
  }

  /** O servidor abre o portal de conclusão no centro da sala do boss quando ele morre. */
  private drawBossPortal() {
    const c = centerOf(this.dungeon.boss);
    const portal = this.add.circle(this.toPx(c.x), this.toPx(c.y), TILE_SIZE / 2 - 3, COLORS.portal).setDepth(1);
    this.tweens.add({ targets: portal, scale: { from: 0.2, to: 1 }, duration: 600, ease: "Back.Out" });
  }

  private syncChest(id: string, chest: ChestView) {
    const rect = this.chests.get(id);
    if (!rect) return;
    const color = chest.opened ? COLORS.chestOpen : chest.locked ? COLORS.chestLocked : COLORS.chestUnlocked;
    rect.setFillStyle(color);
  }

  // --- Jogadores e monstros -------------------------------------------------

  private addAvatar(sessionId: string, player: PlayerView) {
    const color = CLASSES[player.classId as ClassId]?.color ?? 0xffffff;
    const body = this.add.circle(0, 0, TILE_SIZE / 2 - 4, color).setStrokeStyle(2, 0x000000);
    const unit = this.makeUnit(this.toPx(player.x), this.toPx(player.y), body, TILE_SIZE - 6, -TILE_SIZE / 2 - 1);
    const label = this.add.text(0, unit.barY - 2, player.name, TEXT_STYLE).setOrigin(0.5, 1);
    unit.container.add(label).setDepth(10);
    this.avatars.set(sessionId, unit);
    this.drawBar(unit, player.hp, player.maxHp, COLORS.hpPlayer);

    if (sessionId === this.room.sessionId) {
      this.cameras.main.startFollow(unit.container, true, 0.15, 0.15);
    }
  }

  private syncAvatar(sessionId: string, player: PlayerView) {
    const unit = this.avatars.get(sessionId);
    if (!unit) return;
    unit.container.setAlpha(player.status === "playing" ? 1 : 0.35);
    this.drawBar(unit, player.hp, player.maxHp, COLORS.hpPlayer);
    this.moveTo(unit, player.x, player.y);
  }

  private addMonster(id: string, monster: MonsterView) {
    const def = MONSTERS[monster.kind as MonsterKind] ?? MONSTERS.rat;
    const r = (TILE_SIZE * def.size) / 2;
    let body: Phaser.GameObjects.Shape;
    switch (def.shape) {
      case "square": body = this.add.rectangle(0, 0, r * 2, r * 2, def.color); break;
      case "diamond": body = this.add.rectangle(0, 0, r * 1.5, r * 1.5, def.color).setAngle(45); break;
      case "triangle": body = this.add.triangle(0, 0, 0, r * 2, r, 0, r * 2, r * 2, def.color); break;
      default: body = this.add.circle(0, 0, r, def.color);
    }
    body.setStrokeStyle(2, 0x000000);
    const barWidth = Math.max(TILE_SIZE - 8, r * 2);
    const unit = this.makeUnit(this.toPx(monster.x), this.toPx(monster.y), body, barWidth, -Math.max(r, TILE_SIZE / 2 - 4) - 4);
    unit.container.setDepth(def.rank === "common" ? 8 : 9);
    if (def.rank !== "common") {
      const label = this.add.text(0, unit.barY - 2, def.name, { ...TEXT_STYLE, color: "#ff9f9f" }).setOrigin(0.5, 1);
      unit.container.add(label);
    }
    this.monsters.set(id, unit);
    this.drawBar(unit, monster.hp, monster.maxHp, COLORS.hpMonster);
  }

  private syncMonster(id: string, monster: MonsterView) {
    const unit = this.monsters.get(id);
    if (!unit) return;
    this.drawBar(unit, monster.hp, monster.maxHp, COLORS.hpMonster);
    this.moveTo(unit, monster.x, monster.y);
  }

  private makeUnit(x: number, y: number, body: Phaser.GameObjects.GameObject, barWidth: number, barY: number): Unit {
    const bar = this.add.graphics();
    const container = this.add.container(x, y, [body, bar]);
    return { container, bar, barWidth, barY };
  }

  private drawBar(unit: Unit, hp: number, maxHp: number, color: number) {
    const ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    const x = -unit.barWidth / 2;
    unit.bar.clear()
      .fillStyle(COLORS.hpBack).fillRect(x - 1, unit.barY - 1, unit.barWidth + 2, 5)
      .fillStyle(ratio > 0.3 ? color : 0xe67e22).fillRect(x, unit.barY, unit.barWidth * ratio, 3);
  }

  private moveTo(unit: Unit, tileX: number, tileY: number) {
    const x = this.toPx(tileX);
    const y = this.toPx(tileY);
    if (unit.container.x === x && unit.container.y === y) return;
    this.tweens.add({ targets: unit.container, x, y, duration: 120 });
  }

  /** Número ou aviso que sobe e some sobre um tile. */
  private floatText(tileX: number, tileY: number, text: string, color: number) {
    const label = this.add.text(this.toPx(tileX), this.toPx(tileY) - 8, text, {
      ...TEXT_STYLE,
      fontSize: "11px",
      color: `#${color.toString(16).padStart(6, "0")}`,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: label,
      y: label.y - 24,
      alpha: 0,
      duration: 900,
      ease: "Cubic.Out",
      onComplete: () => label.destroy(),
    });
  }

  /** Celular na vertical: 9 tiles de largura em qualquer aparelho, com o jogador um pouco acima do centro. */
  private fitCamera() {
    const { width, height } = this.scale.gameSize;
    const zoom = Math.min(width / (VIEW_TILES.w * TILE_SIZE), height / (VIEW_TILES.h * TILE_SIZE));
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setFollowOffset(0, -(height * FOLLOW_LIFT) / zoom);
  }

  private toPx(tile: number) {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }
}
