import { randomUUID } from "node:crypto";
import { Room, type Client } from "colyseus";
import {
  CLASSES,
  MATCH_DURATION_SECONDS,
  MAX_PARTY_SIZE,
  MSG,
  SERVER_TICK_MS,
  Tile,
  generateDungeon,
  isWalkable,
  statsFor,
  tileAt,
  type ClassId,
  type Dungeon,
  type JoinOptions,
  type MoveMessage,
  type RunEndedMessage,
  type RunOutcome,
} from "@kusa/shared";
import { DungeonState, Player } from "./state.ts";
import { recordRun, resolveUserId } from "./supabase.ts";

interface Seat {
  userId: string | null;
  /** Momento (ms) em que o jogador pode dar o próximo passo. */
  nextMoveAt: number;
}

/** Uma hunt: a equipe (1 a 4 jogadores) entra junta e cada um sai morto, fugindo ou após o boss. */
export class DungeonRoom extends Room<{ state: DungeonState }> {
  maxClients = MAX_PARTY_SIZE;
  state = new DungeonState();

  private dungeon!: Dungeon;
  private matchId = randomUUID();
  private seats = new Map<string, Seat>();
  private elapsedMs = 0;

  onCreate() {
    this.state.seed = Math.floor(Math.random() * 2 ** 31);
    this.dungeon = generateDungeon(this.state.seed);

    this.onMessage(MSG.start, (client) => {
      if (client.sessionId !== this.state.leaderId || this.state.phase !== "lobby") return;
      this.startRun();
    });

    this.onMessage(MSG.move, (client, msg: MoveMessage) => this.handleMove(client, msg));

    this.setSimulationInterval((dt) => this.tick(dt), SERVER_TICK_MS);
  }

  async onAuth(_client: Client, options: JoinOptions) {
    return { userId: await resolveUserId(options.accessToken) };
  }

  onJoin(client: Client, options: JoinOptions, auth: { userId: string | null }) {
    const classId: ClassId = options.classId in CLASSES ? options.classId : "knight";
    const stats = statsFor(classId, 1);
    const index = this.state.players.size;

    const player = new Player();
    player.name = (options.name || "Aventureiro").slice(0, 16);
    player.classId = classId;
    player.hp = player.maxHp = stats.maxHp;
    player.mana = player.maxMana = stats.maxMana;
    // A equipe nasce junta, ao redor do portal de fuga.
    player.x = this.dungeon.portal.x + [-1, 1, -1, 1][index];
    player.y = this.dungeon.portal.y + [-1, -1, 1, 1][index];

    this.state.players.set(client.sessionId, player);
    this.seats.set(client.sessionId, { userId: auth.userId, nextMoveAt: 0 });
    if (!this.state.leaderId) this.state.leaderId = client.sessionId;
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    // Abandonar uma hunt em andamento conta como morte.
    if (player && this.state.phase === "running" && player.status === "playing") {
      this.endRun(client.sessionId, "died");
    }
    if (this.state.phase === "lobby") {
      this.state.players.delete(client.sessionId);
      this.seats.delete(client.sessionId);
      if (this.state.leaderId === client.sessionId) {
        this.state.leaderId = this.state.players.keys().next().value ?? "";
      }
    }
  }

  private startRun() {
    this.state.phase = "running";
    this.state.timeLeft = MATCH_DURATION_SECONDS;
    this.lock();
  }

  private handleMove(client: Client, msg: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    const seat = this.seats.get(client.sessionId);
    if (!player || !seat || player.status !== "playing" || this.state.phase === "ended") return;

    const dx = Math.sign(msg?.dx ?? 0);
    const dy = Math.sign(msg?.dy ?? 0);
    if (dx === 0 && dy === 0) return;

    // Velocidade de movimento controlada pelo servidor: um passo a cada 1/speed segundos.
    const now = this.clock.currentTime;
    if (now < seat.nextMoveAt) return;

    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!isWalkable(this.dungeon, nx, ny)) return;
    // Na diagonal, não atravessa quina de parede.
    if (dx !== 0 && dy !== 0 && (!isWalkable(this.dungeon, nx, player.y) || !isWalkable(this.dungeon, player.x, ny))) return;

    const speed = statsFor(player.classId as ClassId, player.level).speed;
    seat.nextMoveAt = now + (1000 / speed) * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
    player.x = nx;
    player.y = ny;

    if (this.state.phase === "running" && tileAt(this.dungeon, nx, ny) === Tile.Portal) {
      this.endRun(client.sessionId, "escaped");
    }
  }

  private tick(dt: number) {
    if (this.state.phase !== "running") return;

    this.elapsedMs += dt;
    const left = Math.max(0, MATCH_DURATION_SECONDS - Math.floor(this.elapsedMs / 1000));
    if (left !== this.state.timeLeft) this.state.timeLeft = left;

    if (left === 0) {
      // A dungeon desaba: quem ainda está dentro morre soterrado.
      this.state.players.forEach((p, sessionId) => {
        if (p.status === "playing") this.endRun(sessionId, "buried");
      });
    }
  }

  private endRun(sessionId: string, outcome: RunOutcome) {
    const player = this.state.players.get(sessionId);
    if (!player || player.status !== "playing") return;

    const survived = outcome === "escaped" || outcome === "completed";
    if (!survived) player.loot = 0; // Morrer perde todo o loot.
    player.status = outcome;

    const result: RunEndedMessage = { outcome, loot: player.loot, level: player.level };
    this.clients.getById(sessionId)?.send(MSG.runEnded, result);

    const userId = this.seats.get(sessionId)?.userId;
    if (userId) {
      void recordRun(this.matchId, { userId, classId: player.classId, outcome, level: player.level, loot: player.loot });
    }

    const everyoneOut = [...this.state.players.values()].every((p) => p.status !== "playing");
    if (everyoneOut) {
      this.state.phase = "ended";
      this.clock.setTimeout(() => this.disconnect(), 10_000);
    }
  }
}
