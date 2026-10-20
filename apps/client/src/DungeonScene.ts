import * as Phaser from "phaser";
import { Callbacks } from "@colyseus/sdk";
import { CLASSES, MSG, TILE_SIZE, Tile, generateDungeon, type ClassId, type Dungeon } from "@kusa/shared";
import type { DungeonRoom, PlayerView } from "./net.ts";

const COLORS = {
  wall: 0x1a1512,
  wallEdge: 0x2e241d,
  floor: 0x4a4038,
  floorAlt: 0x443a33,
  portal: 0x3fa7d6,
};

/** Cena da hunt: desenha a dungeon gerada pela seed e os jogadores sincronizados pelo servidor. */
export class DungeonScene extends Phaser.Scene {
  private room!: DungeonRoom;
  private dungeon!: Dungeon;
  private avatars = new Map<string, Phaser.GameObjects.Container>();
  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
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
      this.avatars.get(sessionId)?.destroy();
      this.avatars.delete(sessionId);
    });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys("up,down,left,right,w,a,s,d") as typeof this.keys;
    this.cameras.main.setZoom(2);
    this.cameras.main.setBackgroundColor(COLORS.wall);
  }

  update(time: number) {
    const k = this.keys;
    const dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    // O servidor decide a velocidade real; o cliente só reenvia a intenção enquanto a tecla está pressionada.
    if ((dx || dy) && time >= this.nextSendAt) {
      this.room.send(MSG.move, { dx, dy });
      this.nextSendAt = time + 60;
    }
  }

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
    // Marca a sala do boss enquanto não há monstros.
    const b = d.boss;
    g.lineStyle(2, 0x8b1a1a).strokeRect(b.x * TILE_SIZE, b.y * TILE_SIZE, b.w * TILE_SIZE, b.h * TILE_SIZE);
  }

  private addAvatar(sessionId: string, player: PlayerView) {
    const color = CLASSES[player.classId as ClassId]?.color ?? 0xffffff;
    const body = this.add.circle(0, 0, TILE_SIZE / 2 - 4, color).setStrokeStyle(2, 0x000000);
    const label = this.add.text(0, -TILE_SIZE / 2 - 6, player.name, {
      fontFamily: "Georgia, serif",
      fontSize: "10px",
      color: "#e8dcc8",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5, 1);
    const avatar = this.add.container(this.toPx(player.x), this.toPx(player.y), [body, label]).setDepth(10);
    this.avatars.set(sessionId, avatar);

    if (sessionId === this.room.sessionId) {
      this.cameras.main.startFollow(avatar, true, 0.15, 0.15);
    }
  }

  private syncAvatar(sessionId: string, player: PlayerView) {
    const avatar = this.avatars.get(sessionId);
    if (!avatar) return;
    avatar.setAlpha(player.status === "playing" ? 1 : 0.35);
    this.tweens.add({ targets: avatar, x: this.toPx(player.x), y: this.toPx(player.y), duration: 120 });
  }

  private toPx(tile: number) {
    return tile * TILE_SIZE + TILE_SIZE / 2;
  }
}
