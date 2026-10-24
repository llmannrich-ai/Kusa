import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export type PlayerStatus = "playing" | "died" | "escaped" | "completed" | "buried";

export class Player extends Schema {
  @type("string") name = "";
  @type("string") classId = "knight";
  /** Bot que completa a equipe (controlado pela `BotAi`): não leva loot, gold nem itens. */
  @type("boolean") bot = false;
  @type("number") x = 0;
  @type("number") y = 0;
  /** Duração (ms) do último passo em linha reta: o cliente desliza a unidade nesse ritmo. */
  @type("number") stepMs = 0;
  /** Runa escolhida num baú de runa (vazio: ainda não escolheu). Uma por jogador. */
  @type("string") chosenRune = "";
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
  @type("string") legs = "";
  @type("string") boots = "";
  @type("string") shield = "";
  /** Bag: itens pegos no chão (e o que sobrou da hunt anterior), até `BAG_SIZE`. Vai para o cofre ao sair vivo. */
  @type(["string"]) bag = new ArraySchema<string>();
  /** Runas equipadas no menu (ids de `RUNES`, até `RUNE_SLOTS`): valem a hunt inteira e não se trocam na dungeon. */
  @type(["string"]) runes = new ArraySchema<string>();
  /** Magias nos slots (ids de `SPELLS`; "" = slot vazio ou ainda trancado). */
  @type("string") spell1 = "";
  @type("string") spell2 = "";
  /** Magias que o jogador pode escolher quando um slot libera: as iniciais e as compradas no Grimório. */
  @type(["string"]) knownSpells = new ArraySchema<string>();
  /** Nível de uso de cada magia conhecida (0 a 5). */
  @type({ map: "number" }) spellRanks = new MapSchema<number>();
  /** Força extra de cada magia conhecida (sinergias e Tomo, em fração; ausente = 0). Ver `spellBonus` em talents.ts. */
  @type({ map: "number" }) spellBonus = new MapSchema<number>();
  /** Melhorias da hunt já escolhidas (id de `PERKS` → quantas vezes). */
  @type({ map: "number" }) perks = new MapSchema<number>();
  /** Melhorias oferecidas agora, para escolher uma (vazio = nenhuma escolha pendente). */
  @type(["string"]) perkOffer = new ArraySchema<string>();
  /** Nível que deu a melhoria oferecida agora (pode ser anterior ao atual, se ela ficou esperando). */
  @type("number") perkLevel = 0;
  /** Escolhas ainda na fila além da oferecida agora (subiu vários níveis de uma vez). */
  @type("number") perksQueued = 0;
  /** Poções carregadas (só valem na hunt; até `POTION_MAX` de cada). */
  @type("number") healthPotions = 0;
  @type("number") manaPotions = 0;
  /** Sob o Grito de Guerra: recebe menos dano. */
  @type("boolean") guarded = false;
  /** Escudo temporário (Escudo da Fé e outros): absorve dano antes da vida. 0 = sem escudo. */
  @type("number") barrier = 0;
  /** Tamanho do escudo quando foi erguido, para desenhar quanto falta. */
  @type("number") maxBarrier = 0;
  /** Dano contínuo de uma habilidade de monstro: "poison", "burn", "bleed" ou "" (nenhum). */
  @type("string") dot = "";
  /** Mais lento por uma habilidade de monstro (Pisão Sísmico, Lodo Sufocante). */
  @type("boolean") slowed = false;
  /** Efeitos de monstro ativos (`HeroEffectKind`, separados por vírgula: "root,corrode"), para o desenho. */
  @type("string") effects = "";
  /** Magia de bônus em si ativa agora (Postura do Atirador, Aljava Veloz), para o desenho; vazio = nenhuma. */
  @type("string") buff = "";
  /** Forma animal do Druida ("panther", "bear"; vazio = nenhuma), para o desenho. */
  @type("string") form = "";
  /** Tem uma semente do Renascer da Semente: se morrer enquanto ela dura, renasce. */
  @type("boolean") seeded = false;
  /** Acabou de renascer da semente: invulnerável por um instante. */
  @type("boolean") reborn = false;
}

export class Monster extends Schema {
  @type("string") id = "";
  /** Chave de `MONSTERS` em `@kusa/shared`. */
  @type("string") kind = "rat";
  @type("number") x = 0;
  @type("number") y = 0;
  /** Duração (ms) do último passo em linha reta: o cliente desliza a unidade nesse ritmo. */
  @type("number") stepMs = 0;
  @type("number") hp = 0;
  @type("number") maxHp = 0;
  /** Preso por Raízes Espinhosas: não anda. */
  @type("boolean") rooted = false;
  /** Atordoado: não anda nem ataca. */
  @type("boolean") stunned = false;
  /** Lento (Nevasca): anda mais devagar. */
  @type("boolean") slowed = false;
  /** Dano contínuo ativo ("poison", "burn" ou "bleed"; vazio = nenhum), só para o desenho. */
  @type("string") dot = "";
  /** Marcado (Marca do Caçador): recebe mais dano de toda a equipe. */
  @type("boolean") marked = false;
  /** Invisível, camuflado, voando ou submerso: não pode ser alvo (o cliente desenha quase transparente). */
  @type("boolean") hidden = false;
  /** Variante do desenho: cabeças da Hidra. */
  @type("number") variant = 0;
  /** Campeão: id do afixo (`CHAMPION_AFFIXES`); vazio = monstro comum. */
  @type("string") champion = "";
}

/** Criatura aliada invocada por um jogador (lobo, urso, vespa...). */
export class Summon extends Schema {
  @type("string") id = "";
  /** Chave de `SUMMONS` em `@kusa/shared`. */
  @type("string") kind = "wolf";
  /** sessionId de quem invocou. */
  @type("string") owner = "";
  @type("number") x = 0;
  @type("number") y = 0;
  /** Duração (ms) do último passo em linha reta: o cliente desliza a unidade nesse ritmo. */
  @type("number") stepMs = 0;
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
  /** Baú de runa (sala dos baús da caverna): a runa que ele guarda. Cada jogador leva uma, e o baú não esvazia. */
  @type("string") rune = "";
}

/** Item ou poção largado no chão: qualquer jogador que passar por cima pega (item vai para o equipamento se for melhor, senão para a bag). */
export class GroundItem extends Schema {
  @type("string") id = "";
  /** Chave de `ITEMS`, `POTIONS` ou `RUNES` em `@kusa/shared`. */
  @type("string") itemId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  /** sessionId de quem pode pegar (runa do boss, uma por personagem); vazio = qualquer um. */
  @type("string") owner = "";
}

/** Campo no chão criado por uma magia (Solo Consagrado, armadilha, estaca, chão em chamas da Pólvora). */
export class Field extends Schema {
  @type("string") id = "";
  /** "zone", "trap" ou "turret" (ver `SpellDef.field`). */
  @type("string") kind = "zone";
  /** Magia que criou o campo (cor e desenho). */
  @type("string") spellId = "";
  /** "fire" para o chão em chamas da Pólvora; vazio = o desenho da magia. */
  @type("string") style = "";
  /** sessionId de quem criou. */
  @type("string") owner = "";
  @type("number") x = 0;
  @type("number") y = 0;
  /** Raio da zona ou da armadilha; alcance da estaca. */
  @type("number") radius = 0;
}

export class DungeonState extends Schema {
  @type("string") phase = "lobby";
  /** Mapa da hunt (id de `MAPS` em `@kusa/shared`), escolhido por quem criou a sala. */
  @type("string") mapId = "crypt";
  /** Seed da dungeon: cliente e servidor geram o mesmo mapa a partir dela. */
  @type("number") seed = 0;
  @type("number") timeLeft = 0;
  /** sessionId do líder da equipe (quem pode iniciar a hunt). */
  @type("string") leaderId = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Monster }) monsters = new MapSchema<Monster>();
  @type({ map: Chest }) chests = new MapSchema<Chest>();
  @type({ map: GroundItem }) items = new MapSchema<GroundItem>();
  @type({ map: Summon }) summons = new MapSchema<Summon>();
  @type({ map: Field }) fields = new MapSchema<Field>();
  /** Boss morto: o portal de conclusão fica aberto no centro da sala do boss. */
  @type("boolean") bossDefeated = false;
}
