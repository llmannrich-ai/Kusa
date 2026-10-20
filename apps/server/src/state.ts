import { MapSchema, Schema, type } from "@colyseus/schema";

export type PlayerStatus = "playing" | "died" | "escaped" | "completed" | "buried";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") classId = "knight";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  @type("number") mana = 0;
  @type("number") maxMana = 0;
  @type("number") level = 1;
  @type("number") xp = 0;
  /** Valor do loot carregado. Vira gold no menu se o jogador sair vivo. */
  @type("number") loot = 0;
  @type("string") status: PlayerStatus = "playing";
}

export class DungeonState extends Schema {
  @type("string") phase = "lobby";
  /** Seed da dungeon: cliente e servidor geram o mesmo mapa a partir dela. */
  @type("number") seed = 0;
  @type("number") timeLeft = 0;
  /** sessionId do líder da equipe (quem pode iniciar a hunt). */
  @type("string") leaderId = "";
  @type({ map: Player }) players = new MapSchema<Player>();
}
