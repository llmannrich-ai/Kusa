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
  /** Id do monstro selecionado para o auto-attack ("" = nenhum). */
  @type("string") target = "";
  /** Itens equipados (ids de `ITEMS` em `@kusa/shared`; "" = slot vazio). */
  @type("string") weapon = "";
  @type("string") helmet = "";
  @type("string") armor = "";
  @type("string") shield = "";
}

export class Monster extends Schema {
  @type("string") id = "";
  /** Chave de `MONSTERS` em `@kusa/shared`. */
  @type("string") kind = "rat";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
}

/** Baú de uma sala lateral: trancado até o mini-boss da sala morrer. */
export class Chest extends Schema {
  @type("string") id = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("boolean") locked = true;
  @type("boolean") opened = false;
}

/** Item largado no chão: qualquer jogador que passar por cima pega, se for melhor que o equipado. */
export class GroundItem extends Schema {
  @type("string") id = "";
  /** Chave de `ITEMS` em `@kusa/shared`. */
  @type("string") itemId = "";
  @type("number") x = 0;
  @type("number") y = 0;
}

export class DungeonState extends Schema {
  @type("string") phase = "lobby";
  /** Seed da dungeon: cliente e servidor geram o mesmo mapa a partir dela. */
  @type("number") seed = 0;
  @type("number") timeLeft = 0;
  /** sessionId do líder da equipe (quem pode iniciar a hunt). */
  @type("string") leaderId = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Monster }) monsters = new MapSchema<Monster>();
  @type({ map: Chest }) chests = new MapSchema<Chest>();
  @type({ map: GroundItem }) items = new MapSchema<GroundItem>();
  /** Boss morto: o portal de conclusão fica aberto no centro da sala do boss. */
  @type("boolean") bossDefeated = false;
}
