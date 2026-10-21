import { randomUUID } from "node:crypto";
import { Room, ServerError, type Client } from "colyseus";
import {
  AIM_SNAP_TILES,
  BASIC_ATTACKS,
  BAG_SIZE,
  BOSS_LOOT_BONUS,
  CHEST_LOOT,
  CLASSES,
  MAX_LOGIN_LENGTH,
  COMMON_DROP_CHANCE,
  COMMON_POTION_CHANCE,
  DEPTH_SCALING,
  GUARANTEED_DROPS,
  GUARANTEED_POTIONS,
  ITEMS,
  ITEM_SLOTS,
  MAPS,
  MONSTERS,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MAX_SUMMONS_PER_PLAYER,
  MONSTER_SPEED_SCALE,
  MSG,
  PERKS,
  POTIONS,
  POTION_COOLDOWN_MS,
  POTION_FIELD,
  POTION_IDS,
  POTION_MAX,
  RULES_VERSION,
  VERSION_MISMATCH_CODE,
  SERVER_TICK_MS,
  SPELLS,
  SPELL_SLOT_LEVELS,
  SUMMONS,
  TIER_COLORS,
  Tile,
  armorOf,
  attackCooldownMs,
  auraBonuses,
  bestPerSlot,
  centerOf,
  clampToRange,
  createRng,
  ENRAGE_COOLDOWN,
  ENRAGE_HP,
  SPECIAL_FIRST_DELAY,
  specialTiles,
  generateDungeon,
  grantsPerk,
  damageReduction,
  flightMs,
  hasLineOfSight,
  isPerk,
  isPotion,
  isUpgrade,
  isBagIndex,
  isItemSlot,
  pickupAction,
  isSingleTarget,
  isWalkable,
  knownSpells,
  levelForXp,
  lineEnd,
  mapIdOf,
  monsterStats,
  perkBonuses,
  rankPower,
  rollItem,
  rollPerkOffer,
  rollPotion,
  spellAtRank,
  spellChoices,
  spellCooldownMs,
  spellRanks,
  statsFor,
  summonStats,
  talentTree,
  tileAt,
  tileDistance,
  weaponMultiplier,
  xpForLevel,
  xpShare,
  type AttackMessage,
  type AttackingMessage,
  type Bonuses,
  type CastMessage,
  type ChoosePerkMessage,
  type ChooseSpellMessage,
  type ClassId,
  type DamageMessage,
  type DrankMessage,
  type DrinkMessage,
  type BagDropMessage,
  type BagEquipMessage,
  type UnequipMessage,
  type Dungeon,
  type HuntMetadata,
  type JoinOptions,
  type MapDef,
  type MonsterDef,
  type MonsterCastMessage,
  type MonsterKind,
  type MonsterStrikeMessage,
  type MoveMessage,
  type NoticeMessage,
  type PerkBonuses,
  type PerkStacks,
  type Rect,
  type RunEndedMessage,
  type RunOutcome,
  type SpellDef,
  type SpellMessage,
  type SpellId,
  type SpellSlot,
  type SummonDef,
  type TargetMessage,
} from "@kusa/shared";
import { nextStep } from "./pathfinding.ts";
import { Chest, DungeonState, GroundItem, Monster, Player, Summon } from "./state.ts";
import { recordRun, resolveAccount, takeBag, takeLoadout, type Account } from "./supabase.ts";
import { bump, newRunStats, recordTelemetry, type RunStats } from "./telemetry.ts";

/** Quem deu o golpe e como, repassado ao cliente para desenhar o ataque. */
type Hit = Pick<DamageMessage, "attacker" | "fromX" | "fromY" | "fx" | "special" | "dot">;

interface Seat {
  userId: string | null;
  /** Momento (ms) em que o jogador pode dar o próximo passo. */
  nextMoveAt: number;
  /** Momento (ms) em que o ataque básico volta a poder sair. */
  nextAttackAt: number;
  /** Segurando o botão de ataque: o golpe se repete no ritmo da recarga. */
  attacking: boolean;
  /** Um toque rápido no ataque ainda vale até este momento (sai assim que a recarga deixar). */
  attackUntil: number;
  /** true quando o jogador escolheu o alvo (toque no monstro); false quando a mira automática escolheu. */
  targetLocked: boolean;
  /** Momento (ms) em que cada slot de magia volta a poder ser usado. */
  spellReadyAt: [number, number];
  /** Momento (ms) em que pode beber a próxima poção (recarga compartilhada). */
  potionReadyAt: number;
  /** Grito de Guerra: fração do dano evitada e até quando. */
  guard: number;
  guardUntil: number;
  /** Até quando dura o escudo (`Player.barrier`). */
  barrierUntil: number;
  /** Áureas compradas na árvore da classe. */
  aura: Bonuses;
  /** Melhorias escolhidas ao subir de nível nesta hunt e o efeito somado delas. */
  perks: PerkStacks;
  perkBonus: PerkBonuses;
  /** Áureas + melhorias: o que `statsFor` usa para vida, mana, dano e velocidade. */
  bonus: Bonuses;
  /** Até quando não repete o aviso de bag cheia. */
  bagFullNoticeUntil: number;
  /** Veneno ou queimadura de um monstro (`Player.dot`): dano por pulso, de quem veio, próximo pulso e fim. */
  dot: { damage: number; monsterId: string; kind: MonsterKind; nextAt: number; until: number } | null;
  /** Lentidão de um monstro (`Player.slowed`): fração da velocidade que sobra e até quando. */
  slow: { factor: number; until: number } | null;
  /** Números da hunt para a telemetria. */
  stats: RunStats;
}

/** Dados do monstro que só o servidor precisa (o cliente vê só o schema `Monster`). */
interface Brain {
  def: MonsterDef;
  depth: number;
  damage: number;
  xp: number;
  loot: [number, number];
  nextMoveAt: number;
  nextAttackAt: number;
  /** sessionId do jogador perseguido. */
  targetId: string | null;
  /** Quem acertou o monstro: dividem a XP da morte. */
  participants: Set<string>;
  /** Baú liberado quando este mini-boss morre. */
  chestId?: string;
  /** Preso por raízes até este momento (ms). */
  rootedUntil: number;
  /** Atordoado até este momento (ms). */
  stunnedUntil: number;
  /** Quando a habilidade especial pode sair de novo (0 = ainda não notou ninguém). */
  nextSpecialAt: number;
  /** Habilidade especial em andamento: tiles avisados, alvo e quando o golpe sai. */
  casting: { tiles: { x: number; y: number }[]; tx: number; ty: number; targetId: string; strikeAt: number } | null;
  /** Boss já se enfureceu (aviso dado uma vez). */
  enraged: boolean;
}

/** Dados da criatura invocada que só o servidor precisa. */
interface SummonBrain {
  def: SummonDef;
  /** Magia que invocou: conjurar de novo substitui as criaturas dela. */
  spellId: SpellId;
  damage: number;
  /** Cura por pulso, em fração da vida máxima de cada aliado. */
  heal: number;
  expiresAt: number;
  nextMoveAt: number;
  nextAttackAt: number;
  /** Id do monstro que está caçando. */
  targetId: string | null;
}

/** Quantos tiles além do aggro range o monstro ainda persegue antes de desistir. */
const LEASH_TILES = 4;
/** Regeneração por segundo, em fração do máximo. */
const HP_REGEN = 0.02;
const MANA_REGEN = 0.02;
/** Monstros não nascem tão perto do portal de entrada. */
const SAFE_RADIUS = 6;
/** Item no chão que ninguém pegou some depois deste tempo. */
const ITEM_LIFETIME_MS = 120_000;
/** Intervalo mínimo entre dois avisos de bag cheia para o mesmo jogador. */
const BAG_FULL_NOTICE_MS = 3000;
/** Só para testes: KUSA_START_LEVEL=8 faz todo mundo começar no nível 8 (com os slots de magia abertos). */
const START_LEVEL = Math.min(MAX_LEVEL, Math.max(1, Number(process.env.KUSA_START_LEVEL) || 1));
/** Só para testes: KUSA_ALL_SPELLS=1 dá a todo mundo o Grimório inteiro da classe no nível máximo. */
const ALL_SPELLS = process.env.KUSA_ALL_SPELLS === "1";

/** Uma hunt: a equipe (1 a 4 jogadores) entra junta e cada um sai morto, fugindo ou após o boss. */
export class DungeonRoom extends Room<{ state: DungeonState; metadata: HuntMetadata }> {
  maxClients = MAX_PARTY_SIZE;
  state = new DungeonState();

  private dungeon!: Dungeon;
  private map!: MapDef;
  private matchId = randomUUID();
  private seats = new Map<string, Seat>();
  private elapsedMs = 0;
  private regenMs = 0;
  private brains = new Map<string, Brain>();
  private chestDepth = new Map<string, number>();
  private nextMonsterId = 1;
  private nextItemId = 1;
  private nextSummonId = 1;
  private summonBrains = new Map<string, SummonBrain>();
  /** Momento (ms) em que cada item do chão some. */
  private itemExpiresAt = new Map<string, number>();
  /**
   * Item largado da bag → sessionId de quem largou: essa pessoa só pega de novo depois de sair do tile,
   * senão o item voltaria para a bag no tick seguinte.
   */
  private pickupBlocked = new Map<string, string>();

  onCreate(options: JoinOptions) {
    this.map = MAPS[mapIdOf(options?.mapId)];
    this.state.mapId = this.map.id;
    this.state.seed = Math.floor(Math.random() * 2 ** 31);
    this.dungeon = generateDungeon(this.state.seed, this.map.id);
    this.spawnMonsters();

    this.onMessage(MSG.start, (client) => {
      if (client.sessionId !== this.state.leaderId || this.state.phase !== "lobby") return;
      this.startRun();
    });

    this.onMessage(MSG.move, (client, msg: MoveMessage) => this.handleMove(client, msg));
    this.onMessage(MSG.target, (client, msg: TargetMessage) => this.handleTarget(client, msg));
    this.onMessage(MSG.attacking, (client, msg: AttackingMessage) => this.handleAttacking(client, msg));
    this.onMessage(MSG.chooseSpell, (client, msg: ChooseSpellMessage) => this.handleChooseSpell(client, msg));
    this.onMessage(MSG.choosePerk, (client, msg: ChoosePerkMessage) => this.handleChoosePerk(client, msg));
    this.onMessage(MSG.cast, (client, msg: CastMessage) => this.handleCast(client, msg));
    this.onMessage(MSG.drink, (client, msg: DrinkMessage) => this.handleDrink(client, msg));
    this.onMessage(MSG.bagEquip, (client, msg: BagEquipMessage) => this.handleBagEquip(client, msg));
    this.onMessage(MSG.unequip, (client, msg: UnequipMessage) => this.handleUnequip(client, msg));
    this.onMessage(MSG.bagDrop, (client, msg: BagDropMessage) => this.handleBagDrop(client, msg));

    this.setSimulationInterval((dt) => this.tick(dt), SERVER_TICK_MS);
  }

  async onAuth(_client: Client, options: JoinOptions) {
    // Cliente de outra versão geraria outro mapa a partir da mesma seed. A mensagem leva a versão do
    // servidor para o cliente decidir se recarrega (ele está velho) ou espera (o servidor está atualizando).
    if (options?.rulesVersion !== RULES_VERSION) {
      throw new ServerError(VERSION_MISMATCH_CODE, `O jogo foi atualizado: recarregue a página. (servidor v${RULES_VERSION})`);
    }
    // Sempre um objeto (verdadeiro): sem conta, entra como convidado.
    return { account: await resolveAccount(options.accessToken) };
  }

  onJoin(client: Client, options: JoinOptions, auth: { account: Account | null }) {
    const classId: ClassId = options.classId in CLASSES ? options.classId : "knight";
    const talents = ALL_SPELLS
      ? Object.fromEntries(talentTree(classId).map((t) => [t.id, t.maxRank]))
      : auth.account?.talents ?? {};
    const bonus = auraBonuses(classId, talents);
    const stats = statsFor(classId, START_LEVEL, bonus);

    const player = new Player();
    player.name = auth.account?.name ?? [...(options.name || "Aventureiro")].slice(0, MAX_LOGIN_LENGTH).join("");
    player.classId = classId;
    player.level = START_LEVEL;
    player.xp = xpForLevel(START_LEVEL);
    player.hp = player.maxHp = stats.maxHp;
    player.mana = player.maxMana = stats.maxMana;
    player.knownSpells.push(...knownSpells(classId, talents));
    for (const [spellId, rank] of Object.entries(spellRanks(classId, talents))) player.spellRanks.set(spellId, rank);
    // A equipe nasce junta, ao redor do portal de fuga: cada um num canto livre (quem saiu da sala de espera libera o seu).
    const { x: px, y: py } = this.dungeon.portal;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => ({ x: px + dx, y: py + dy }));
    const taken = [...this.state.players.values()];
    const spot = corners.find((c) => !taken.some((o) => o.x === c.x && o.y === c.y)) ?? corners[0];
    player.x = spot.x;
    player.y = spot.y;

    this.state.players.set(client.sessionId, player);
    this.seats.set(client.sessionId, {
      userId: auth.account?.userId ?? null, nextMoveAt: 0, nextAttackAt: 0, attacking: false, attackUntil: 0, targetLocked: false,
      spellReadyAt: [0, 0], potionReadyAt: 0, guard: 0, guardUntil: 0, barrierUntil: 0,
      aura: bonus, perks: {}, perkBonus: perkBonuses({}), bonus, bagFullNoticeUntil: 0, dot: null, slow: null, stats: newRunStats(),
    });
    if (!this.state.leaderId) {
      this.state.leaderId = client.sessionId;
      void this.setMatchmaking({ metadata: { leader: player.name, mapId: this.map.id } });
    }
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    // Abandonar uma hunt em andamento conta como morte.
    if (player && this.state.phase === "running" && player.status === "playing") {
      const seat = this.seats.get(client.sessionId);
      if (seat) seat.stats.abandoned = true;
      this.endRun(client.sessionId, "died");
    }
    if (this.state.phase === "lobby") {
      this.state.players.delete(client.sessionId);
      this.seats.delete(client.sessionId);
      if (this.state.leaderId === client.sessionId) {
        this.state.leaderId = this.state.players.keys().next().value ?? "";
        const leader = this.state.players.get(this.state.leaderId);
        if (leader) void this.setMatchmaking({ metadata: { leader: leader.name, mapId: this.map.id } });
      }
    }
  }

  // --- Spawn ------------------------------------------------------------

  /** Popula o mapa: comuns nas salas do caminho (e nas campinas), mini-boss + baú nas laterais e o boss no centro. */
  private spawnMonsters() {
    const d = this.dungeon;
    // RNG próprio derivado da seed, separado do gerador do mapa.
    const rng = createRng(this.state.seed ^ 0x9e3779b9);

    const spawns = this.map.pathSpawns;
    d.path.forEach((room, depth) => {
      const kinds = spawns[Math.min(depth, spawns.length - 1)];
      for (const kind of kinds) {
        const spot = this.freeSpotIn(room, () => rng.int(0, 1_000_000));
        if (spot) this.addMonster(kind, spot.x, spot.y, depth);
      }
    });

    // Campinas: dois monstros da sala do caminho mais próxima.
    d.meadows.forEach((room) => {
      const depth = this.nearestPathDepth(room);
      const kinds = spawns[Math.min(depth, spawns.length - 1)];
      for (let i = 0; i < 2; i++) {
        const spot = this.freeSpotIn(room, () => rng.int(0, 1_000_000));
        if (spot) this.addMonster(rng.pick(kinds), spot.x, spot.y, depth);
      }
    });

    d.side.forEach((room, i) => {
      const depth = this.nearestPathDepth(room);
      const c = centerOf(room);
      const boss = this.addMonster(this.map.miniboss, c.x, c.y, depth);
      const chest = new Chest();
      chest.id = `c${i + 1}`;
      chest.x = room.x + 1;
      chest.y = room.y + 1;
      this.state.chests.set(chest.id, chest);
      this.chestDepth.set(chest.id, depth);
      this.brains.get(boss.id)!.chestId = chest.id;
    });

    const c = centerOf(d.boss);
    this.addMonster(this.map.boss, c.x, c.y, d.path.length);
  }

  private addMonster(kind: MonsterKind, x: number, y: number, depth: number) {
    const def = MONSTERS[kind];
    const stats = monsterStats(kind, depth);
    const m = new Monster();
    m.id = `m${this.nextMonsterId++}`;
    m.kind = kind;
    m.x = x;
    m.y = y;
    m.hp = m.maxHp = stats.maxHp;
    this.state.monsters.set(m.id, m);
    this.brains.set(m.id, {
      def, depth, damage: stats.damage, xp: stats.xp, loot: stats.loot,
      nextMoveAt: 0, nextAttackAt: 0, targetId: null, participants: new Set(), rootedUntil: 0, stunnedUntil: 0,
      nextSpecialAt: 0, casting: null, enraged: false,
    });
    return m;
  }

  private freeSpotIn(room: Rect, roll: () => number) {
    const portal = this.dungeon.portal;
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = room.x + (roll() % room.w);
      const y = room.y + (roll() % room.h);
      if (!isWalkable(this.dungeon, x, y) || tileAt(this.dungeon, x, y) === Tile.Portal) continue;
      if (tileDistance(x, y, portal.x, portal.y) <= SAFE_RADIUS) continue;
      if (this.monsterAt(x, y)) continue;
      return { x, y };
    }
    return null;
  }

  /** Profundidade de uma sala lateral ou campina = índice da sala do caminho mais próxima. */
  private nearestPathDepth(room: Rect) {
    const c = centerOf(room);
    let best = 0;
    let bestDist = Infinity;
    this.dungeon.path.forEach((r, i) => {
      const p = centerOf(r);
      const dist = Math.hypot(p.x - c.x, p.y - c.y);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    return best;
  }

  private monsterAt(x: number, y: number) {
    for (const m of this.state.monsters.values()) if (m.x === x && m.y === y) return m;
    return undefined;
  }

  private startRun() {
    this.state.phase = "running";
    this.state.timeLeft = this.map.durationSeconds;
    this.lock();
    this.state.players.forEach((p, sessionId) => this.trackDepth(sessionId, p));
    // O equipamento escolhido no menu e a bag saem da conta e entram na dungeon (chegam logo depois do início).
    this.seats.forEach((seat, sessionId) => {
      if (!seat.userId) return;
      void takeLoadout(seat.userId).then((items) => {
        const p = this.state.players.get(sessionId);
        if (!p || p.status !== "playing") return;
        seat.stats.items.loadout = items;
        const best = bestPerSlot(items);
        for (const slot of ITEM_SLOTS) if (isUpgrade(best[slot], p[slot])) p[slot] = best[slot];
      });
      void takeBag(seat.userId).then((items) => {
        const p = this.state.players.get(sessionId);
        if (!p || p.status !== "playing") return;
        seat.stats.items.bag = items;
        // Pode passar de BAG_SIZE se o equipamento não coube no slot ao voltar (raro): nada se perde.
        p.bag.push(...items);
      });
    });
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
    if (!isWalkable(this.dungeon, nx, ny) || this.monsterAt(nx, ny)) return;
    // Na diagonal, não atravessa quina de parede.
    if (dx !== 0 && dy !== 0 && (!isWalkable(this.dungeon, nx, player.y) || !isWalkable(this.dungeon, player.x, ny))) return;

    const speed = statsFor(player.classId as ClassId, player.level, seat.bonus).speed * (seat.slow?.factor ?? 1);
    seat.nextMoveAt = now + (1000 / speed) * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
    player.x = nx;
    player.y = ny;
    if (this.state.phase === "running") this.trackDepth(client.sessionId, player);

    if (this.state.phase === "running" && tileAt(this.dungeon, nx, ny) === Tile.Portal) {
      const bossPortal = centerOf(this.dungeon.boss);
      if (nx === bossPortal.x && ny === bossPortal.y) {
        // Concluir a dungeon dá um bônus sobre o loot carregado.
        const bonus = Math.round(player.loot * BOSS_LOOT_BONUS);
        player.loot += bonus;
        seat.stats.loot.bossBonus = bonus;
        this.endRun(client.sessionId, "completed");
      } else {
        this.endRun(client.sessionId, "escaped");
      }
    }
  }

  private handleTarget(client: Client, msg: TargetMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.status !== "playing") return;
    const id = typeof msg?.id === "string" ? msg.id : "";
    player.target = this.state.monsters.has(id) ? id : "";
    const seat = this.seats.get(client.sessionId);
    if (seat) seat.targetLocked = player.target !== "";
  }

  private handleAttacking(client: Client, msg: AttackingMessage) {
    const seat = this.seats.get(client.sessionId);
    if (!seat) return;
    seat.attacking = msg?.on === true;
    // O toque vale por uma recarga inteira: se o golpe anterior ainda recarrega, sai assim que puder.
    if (seat.attacking) seat.attackUntil = this.clock.currentTime + attackCooldownMs(seat.perks);
  }

  private tick(dt: number) {
    if (this.state.phase !== "running") return;

    this.elapsedMs += dt;
    const left = Math.max(0, this.map.durationSeconds - Math.floor(this.elapsedMs / 1000));
    if (left !== this.state.timeLeft) this.state.timeLeft = left;

    if (left === 0) {
      // A dungeon desaba: quem ainda está dentro morre soterrado.
      this.state.players.forEach((p, sessionId) => {
        if (p.status === "playing") this.endRun(sessionId, "buried");
      });
      return;
    }

    const now = this.clock.currentTime;
    this.regen(dt);
    this.expireEffects(now);
    this.state.players.forEach((p, sessionId) => this.playerAttack(sessionId, p, now));
    this.state.monsters.forEach((m) => this.monsterThink(m, now));
    this.state.summons.forEach((s) => this.summonThink(s, now));
    this.openChests();
    this.pickUpItems();
    this.expireItems(now);
  }

  // --- Combate -----------------------------------------------------------

  private regen(dt: number) {
    this.regenMs += dt;
    if (this.regenMs < 1000) return;
    this.regenMs -= 1000;
    this.state.players.forEach((p, sessionId) => {
      if (p.status !== "playing") return;
      // Regeneração e Clareza (melhorias) somam à regeneração base.
      const perk = this.seats.get(sessionId)?.perkBonus;
      if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * (HP_REGEN + (perk?.hpRegen ?? 0)))));
      if (p.mana < p.maxMana) p.mana = Math.min(p.maxMana, p.mana + Math.max(1, Math.round(p.maxMana * (MANA_REGEN + (perk?.manaRegen ?? 0)))));
    });
  }

  /**
   * Ataque básico: sai enquanto o jogador segura o botão (ou logo após um toque), no alvo travado
   * se estiver no alcance da classe. Sem alvo, mira sozinho no monstro mais próximo ao alcance;
   * esse alvo automático é escolhido mesmo sem atacar, para o cliente mostrar quem vai apanhar.
   */
  private playerAttack(sessionId: string, p: Player, now: number) {
    if (p.status !== "playing") return;
    const cls = CLASSES[p.classId as ClassId];
    const seat = this.seats.get(sessionId);
    if (!seat) return;
    if (p.target && !this.state.monsters.has(p.target)) p.target = "";
    if (!p.target) seat.targetLocked = false;
    // Alvo escolhido sozinho não fica preso: se saiu do alcance, troca pelo mais próximo que está no alcance.
    if (!seat.targetLocked && p.target && !this.canHit(p, this.state.monsters.get(p.target)!, cls.attackRange)) p.target = "";
    if (!p.target) p.target = this.nearestMonsterInRange(p, cls.attackRange) ?? "";
    if (!p.target) return;

    const m = this.state.monsters.get(p.target)!;
    if (!seat.attacking && now >= seat.attackUntil) return;
    if (now < seat.nextAttackAt) return;

    if (!this.canHit(p, m, cls.attackRange)) return;

    seat.nextAttackAt = now + attackCooldownMs(seat.perks);
    seat.attackUntil = 0;
    // Flecha e luzes voam até o alvo: o dano entra quando chegam (se o monstro ainda estiver vivo).
    const ms = flightMs(BASIC_ATTACKS[cls.id].projectileSpeed, p.x, p.y, m.x, m.y);
    this.broadcast(MSG.attack, { from: sessionId, x: p.x, y: p.y, tx: m.x, ty: m.y, ms } satisfies AttackMessage);
    const amount = rollDamage(this.baseDamage(sessionId, p));
    // O cliente já desenhou o golpe pelo `MSG.attack`: o dano chega sem projétil de novo.
    const hit: Hit = { attacker: sessionId, fromX: p.x, fromY: p.y, fx: cls.attackFx };
    this.after(ms, () => {
      const alive = this.state.monsters.get(m.id);
      if (alive) this.damageMonster(alive, amount, hit, "basic");
    });
  }

  /** Roda `fn` depois de `ms` (na hora se 0), só enquanto a hunt estiver rolando. */
  private after(ms: number, fn: () => void) {
    if (ms <= 0) return fn();
    this.clock.setTimeout(() => { if (this.state.phase === "running") fn(); }, ms);
  }

  // --- Magias -------------------------------------------------------------

  /** Escolha da magia de um slot recém-liberado. Uma vez escolhida, fica até o fim da hunt. */
  private handleChooseSpell(client: Client, msg: ChooseSpellMessage) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.status !== "playing") return;
    const slot = msg?.slot;
    if (slot !== 0 && slot !== 1) return;
    if (p.level < SPELL_SLOT_LEVELS[slot] || spellIn(p, slot)) return;
    const spell = spellChoices(p.classId as ClassId, slot, [...p.knownSpells]).find((s) => s.id === msg.spellId);
    if (!spell) return;
    if (slot === 0) p.spell1 = spell.id; else p.spell2 = spell.id;
    const seat = this.seats.get(client.sessionId);
    if (seat) seat.stats.spellsChosen[slot + 1] = { id: spell.id, rank: p.spellRanks.get(spell.id) ?? 1, at: this.seconds() };
    this.notice(p.x, p.y - 1, spell.name, 0x9b59b6);
  }

  private handleCast(client: Client, msg: CastMessage) {
    const sessionId = client.sessionId;
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing" || this.state.phase !== "running") return;
    const slot = msg?.slot;
    if (slot !== 0 && slot !== 1) return;
    const base = SPELLS[spellIn(p, slot) as SpellId];
    if (!base) return;
    // Os níveis 2 e 3 comprados no Grimório deixam a magia mais forte.
    const spell = spellAtRank(base, p.spellRanks.get(base.id) ?? 1);

    const now = this.clock.currentTime;
    if (now < seat.spellReadyAt[slot]) return;
    if (p.mana < spell.manaCost) {
      seat.stats.castFails.noMana++;
      client.send(MSG.notice, { x: p.x, y: p.y - 1, text: "Sem mana", color: 0x5dade2 } satisfies NoticeMessage);
      return;
    }

    let target: Monster | undefined;
    let tx = p.x;
    let ty = p.y;
    const aim = msg.aim;
    if (spell.aim === "target" && aim && Number.isFinite(aim.x) && Number.isFinite(aim.y)) {
      // Mira: o ponto é puxado para dentro do alcance e para na primeira parede do caminho.
      const point = clampToRange(p.x, p.y, Math.round(aim.x), Math.round(aim.y), spell.range);
      const end = lineEnd(this.dungeon, p.x, p.y, point.x, point.y);
      tx = end.x;
      ty = end.y;
      // Alvo único: vale o monstro em que a mira grudou (com 1 tile de folga para o atraso da rede).
      // Errou a mira: a magia sai do mesmo jeito, gasta mana e recarga, e só acerta quem estiver no ponto.
      const snapped = isSingleTarget(spell) && typeof aim.targetId === "string" ? this.state.monsters.get(aim.targetId) : undefined;
      if (snapped && this.canHit(p, snapped, spell.range) && tileDistance(snapped.x, snapped.y, aim.x, aim.y) <= AIM_SNAP_TILES + 1) {
        target = snapped;
        tx = snapped.x;
        ty = snapped.y;
      }
    } else if (spell.aim === "target") {
      // Toque rápido: alvo atual se estiver ao alcance; senão, o monstro mais próximo. Sem nenhum, não sai.
      const current = this.state.monsters.get(p.target);
      target = current && this.canHit(p, current, spell.range)
        ? current
        : this.state.monsters.get(this.nearestMonsterInRange(p, spell.range) ?? "");
      if (!target) {
        seat.stats.castFails.noTarget++;
        client.send(MSG.notice, { x: p.x, y: p.y - 1, text: "Nenhum alvo ao alcance", color: 0xbdc3c7 } satisfies NoticeMessage);
        return;
      }
      tx = target.x;
      ty = target.y;
    }

    p.mana -= spell.manaCost;
    bump(seat.stats.casts, spell.id);
    seat.spellReadyAt[slot] = now + spellCooldownMs(spell.cooldownMs, seat.perks);
    const ms = flightMs(spell.projectileSpeed ?? 0, p.x, p.y, tx, ty);
    this.broadcast(MSG.spell, { from: sessionId, spellId: spell.id, x: p.x, y: p.y, tx, ty, ms } satisfies SpellMessage);
    const amount = this.baseDamage(sessionId, p) * (spell.damage ?? 0);
    const rank = p.spellRanks.get(base.id) ?? 1;
    this.after(ms, () => this.applySpell(sessionId, spell, rank, target?.id, tx, ty, amount));
  }

  /**
   * Efeito da magia ao chegar. Com alvo (toque rápido ou mira grudada), a área segue o monstro se ele
   * andou durante o voo; mirada no chão, cai no ponto. Paredes bloqueiam o efeito (precisa de linha
   * de visão do centro até quem é atingido).
   */
  private applySpell(sessionId: string, spell: SpellDef, rank: number, targetId: string | undefined, tx: number, ty: number, amount: number) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat) return;
    const now = this.clock.currentTime;
    const anchor = targetId ? this.state.monsters.get(targetId) : undefined;
    // Alvo único que morreu no caminho: a magia se perde.
    if (targetId && !anchor && spell.radius === 0) return;
    const cx = anchor?.x ?? tx;
    const cy = anchor?.y ?? ty;
    const inArea = (x: number, y: number) =>
      tileDistance(cx, cy, x, y) <= spell.radius && hasLineOfSight(this.dungeon, cx, cy, x, y);

    const hit = spell.radius === 0 && anchor
      ? [anchor]
      : [...this.state.monsters.values()].filter((m) => inArea(m.x, m.y));
    let dealt = 0;
    for (const m of hit) {
      const brain = this.brains.get(m.id);
      if (!brain) continue;
      if (spell.taunt) brain.targetId = sessionId;
      if (spell.rootMs) this.root(m, brain, now + spell.rootMs);
      if (spell.stunMs) {
        brain.stunnedUntil = Math.max(brain.stunnedUntil, now + spell.stunMs);
        m.stunned = true;
        if (brain.casting) {
          this.interruptSpecial(m, brain);
          seat.stats.specialsInterrupted++;
        }
      }
      if (spell.damage) {
        const value = Math.min(m.hp, rollDamage(amount));
        dealt += value;
        this.damageMonster(m, value, { attacker: sessionId, fromX: cx, fromY: cy, fx: CLASSES[spell.classId].attackFx }, spell.id);
      }
    }

    if (spell.lifesteal && dealt > 0 && p.status === "playing") this.healPlayer(p, Math.round(dealt * spell.lifesteal), sessionId);

    if (spell.heal) {
      this.state.players.forEach((ally) => {
        if (ally.status === "playing" && inArea(ally.x, ally.y)) this.healPlayer(ally, Math.round(ally.maxHp * spell.heal!), sessionId);
      });
    }

    if (spell.barrier && spell.barrierMs) {
      this.state.players.forEach((ally, allyId) => {
        if (ally.status !== "playing") return;
        if (allyId !== sessionId && !(spell.barrierAllies && inArea(ally.x, ally.y))) return;
        const allySeat = this.seats.get(allyId);
        if (!allySeat) return;
        // Escudo novo não soma com o antigo: fica o maior.
        const amountBarrier = Math.round(ally.maxHp * spell.barrier!);
        if (amountBarrier >= ally.barrier) {
          ally.barrier = ally.maxBarrier = amountBarrier;
        }
        allySeat.barrierUntil = Math.max(allySeat.barrierUntil, now + spell.barrierMs!);
      });
    }

    if (spell.guard && spell.guardMs && p.status === "playing") {
      seat.guard = spell.guard;
      seat.guardUntil = now + spell.guardMs;
      p.guarded = true;
    }

    if (spell.summon && p.status === "playing") this.summon(sessionId, p, spell, rank);
  }

  // --- Poções -------------------------------------------------------------

  /** Bebe uma poção carregada. Com a barra cheia, não gasta a poção nem a recarga. */
  private handleDrink(client: Client, msg: DrinkMessage) {
    const p = this.state.players.get(client.sessionId);
    const seat = this.seats.get(client.sessionId);
    if (!p || !seat || p.status !== "playing" || this.state.phase !== "running") return;
    if (!isPotion(msg?.potion)) return;
    const potion = POTIONS[msg.potion];
    const field = POTION_FIELD[potion.id];
    const now = this.clock.currentTime;
    if (p[field] <= 0 || now < seat.potionReadyAt) return;

    const max = potion.stat === "hp" ? p.maxHp : p.maxMana;
    const restored = Math.min(max - p[potion.stat], Math.round(max * potion.restore));
    if (restored <= 0) {
      const text = potion.stat === "hp" ? "Vida cheia" : "Mana cheia";
      client.send(MSG.notice, { x: p.x, y: p.y - 1, text, color: 0xbdc3c7 } satisfies NoticeMessage);
      return;
    }
    p[field] -= 1;
    p[potion.stat] += restored;
    seat.potionReadyAt = now + POTION_COOLDOWN_MS;
    seat.stats.potions.drunk[potion.id] = (seat.stats.potions.drunk[potion.id] ?? 0) + 1;
    if (potion.stat === "hp") seat.stats.healing += restored;
    else seat.stats.potions.manaRestored += restored;
    client.send(MSG.drank, { potion: potion.id, cooldownMs: POTION_COOLDOWN_MS } satisfies DrankMessage);
    this.notice(p.x, p.y, `+${restored}`, potion.color);
  }

  /** `healerId` é quem leva o crédito da cura na telemetria. */
  private healPlayer(p: Player, amount: number, healerId: string) {
    const healed = Math.min(p.maxHp - p.hp, amount);
    if (healed <= 0) return;
    p.hp += healed;
    const stats = this.seats.get(healerId)?.stats;
    if (stats) stats.healing += healed;
    this.notice(p.x, p.y, `+${healed}`, 0x2ecc71);
  }

  private root(m: Monster, brain: Brain, until: number) {
    brain.rootedUntil = Math.max(brain.rootedUntil, until);
    m.rooted = true;
  }

  /** Fim do Grito de Guerra, dos escudos, das raízes e do atordoamento. */
  private expireEffects(now: number) {
    this.seats.forEach((seat, sessionId) => {
      const p = this.state.players.get(sessionId);
      if (p?.guarded && now >= seat.guardUntil) p.guarded = false;
      if (p && p.barrier > 0 && now >= seat.barrierUntil) p.barrier = 0;
      if (p && seat.slow && now >= seat.slow.until) {
        seat.slow = null;
        p.slowed = false;
      }
      if (p) this.tickDot(sessionId, p, seat, now);
    });
    this.state.monsters.forEach((m) => {
      const brain = this.brains.get(m.id);
      if (m.rooted && now >= (brain?.rootedUntil ?? 0)) m.rooted = false;
      if (m.stunned && now >= (brain?.stunnedUntil ?? 0)) m.stunned = false;
    });
  }

  // --- Criaturas invocadas ----------------------------------------------------

  /** Põe as criaturas da magia em volta de quem conjurou. Conjurar de novo substitui as anteriores da mesma magia. */
  private summon(sessionId: string, p: Player, spell: SpellDef, rank: number) {
    const { kind, count, durationMs } = spell.summon!;
    this.state.summons.forEach((s) => {
      if (s.owner === sessionId && this.summonBrains.get(s.id)?.spellId === spell.id) this.removeSummon(s.id);
    });
    const now = this.clock.currentTime;
    const stats = summonStats(kind, p.maxHp, this.baseDamage(sessionId, p), rankPower(rank));
    for (let i = 0; i < count; i++) {
      const mine = [...this.state.summons.values()].filter((s) => s.owner === sessionId);
      // No limite, a criatura mais antiga dá lugar à nova.
      if (mine.length >= MAX_SUMMONS_PER_PLAYER) this.removeSummon(mine[0].id);
      const spot = this.freeSpotNear(p.x, p.y);
      if (!spot) break;
      const s = new Summon();
      s.id = `s${this.nextSummonId++}`;
      s.kind = kind;
      s.owner = sessionId;
      s.x = spot.x;
      s.y = spot.y;
      s.hp = s.maxHp = stats.maxHp;
      this.state.summons.set(s.id, s);
      this.summonBrains.set(s.id, {
        def: SUMMONS[kind], spellId: spell.id, damage: stats.damage, heal: stats.heal,
        expiresAt: now + durationMs, nextMoveAt: now + 300, nextAttackAt: now + 300, targetId: null,
      });
    }
  }

  /** Tile livre mais perto de (x, y), com linha de visão, a até 2 tiles. */
  private freeSpotNear(x: number, y: number) {
    const blocked = this.occupiedTiles();
    const w = this.dungeon.width;
    for (let r = 1; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (!isWalkable(this.dungeon, nx, ny) || blocked.has(ny * w + nx)) continue;
          if (!hasLineOfSight(this.dungeon, x, y, nx, ny)) continue;
          return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  private removeSummon(id: string) {
    this.state.summons.delete(id);
    this.summonBrains.delete(id);
  }

  /**
   * IA da criatura: some quando o tempo acaba ou o dono sai; as de cura curam a equipe por perto;
   * as de luta caçam o alvo do dono (ou o monstro mais próximo) e, sem monstro, seguem o dono.
   */
  private summonThink(s: Summon, now: number) {
    const brain = this.summonBrains.get(s.id);
    const owner = this.state.players.get(s.owner);
    if (!brain || !owner || owner.status !== "playing" || now >= brain.expiresAt) return this.removeSummon(s.id);
    const def = brain.def;

    if (brain.heal > 0) {
      if (now >= brain.nextAttackAt) {
        brain.nextAttackAt = now + def.attackCooldownMs;
        this.state.players.forEach((ally) => {
          if (ally.status !== "playing" || ally.hp >= ally.maxHp) return;
          if (tileDistance(s.x, s.y, ally.x, ally.y) > (def.healRadius ?? 0)) return;
          this.healPlayer(ally, Math.max(1, Math.round(ally.maxHp * brain.heal)), s.owner);
        });
      }
      return this.summonFollow(s, brain, owner, now);
    }

    // Alvo: o que já caçava, senão o alvo do dono, senão o monstro mais próximo (sem se afastar demais do dono).
    let target = brain.targetId ? this.state.monsters.get(brain.targetId) : undefined;
    if (target && tileDistance(target.x, target.y, owner.x, owner.y) > 8) target = undefined;
    if (!target) {
      const ownerTarget = this.state.monsters.get(owner.target);
      target = ownerTarget && tileDistance(s.x, s.y, ownerTarget.x, ownerTarget.y) <= 6 ? ownerTarget : this.nearestMonsterTo(s.x, s.y, 5);
    }
    brain.targetId = target?.id ?? null;
    if (!target) return this.summonFollow(s, brain, owner, now);

    const inRange = tileDistance(s.x, s.y, target.x, target.y) <= def.attackRange
      && hasLineOfSight(this.dungeon, s.x, s.y, target.x, target.y);
    if (inRange) {
      if (now < brain.nextAttackAt) return;
      brain.nextAttackAt = now + def.attackCooldownMs;
      const m = target;
      const amount = rollDamage(brain.damage);
      const hit: Hit = { attacker: s.id, fromX: s.x, fromY: s.y, fx: def.attackFx };
      // À distância (vespa), o ferrão voa; o cliente desenha o projétil pelo `fx` do dano.
      this.after(def.attackRange > 1 ? 200 : 0, () => {
        const alive = this.state.monsters.get(m.id);
        const brainM = this.brains.get(m.id);
        if (!alive || !brainM || !this.state.summons.has(s.id)) return;
        if (def.taunt) brainM.targetId = s.id;
        if (def.rootMs) this.root(alive, brainM, this.clock.currentTime + def.rootMs);
        this.damageMonster(alive, amount, hit, `summon:${s.kind}`, s.owner);
      });
      return;
    }
    this.summonStep(s, brain, target, def.attackRange, now);
  }

  /** Sem monstro por perto: anda até ficar a 1 ou 2 tiles do dono. */
  private summonFollow(s: Summon, brain: SummonBrain, owner: Player, now: number) {
    if (tileDistance(s.x, s.y, owner.x, owner.y) <= 2) return;
    this.summonStep(s, brain, owner, 1, now);
  }

  private summonStep(s: Summon, brain: SummonBrain, to: { x: number; y: number }, range: number, now: number) {
    if (now < brain.nextMoveAt) return;
    const blocked = this.occupiedTiles();
    const step = nextStep(this.dungeon, s, to, range, (x, y) => blocked.has(y * this.dungeon.width + x));
    if (!step) {
      brain.nextMoveAt = now + 400;
      return;
    }
    const diagonal = step.x !== s.x && step.y !== s.y;
    brain.nextMoveAt = now + (1000 / brain.def.speed) * (diagonal ? Math.SQRT2 : 1);
    s.x = step.x;
    s.y = step.y;
  }

  private nearestMonsterTo(x: number, y: number, range: number): Monster | undefined {
    let best: Monster | undefined;
    let bestDist = Infinity;
    this.state.monsters.forEach((m) => {
      const dist = tileDistance(x, y, m.x, m.y);
      if (dist > range || dist >= bestDist || !hasLineOfSight(this.dungeon, x, y, m.x, m.y)) return;
      best = m;
      bestDist = dist;
    });
    return best;
  }

  private damageSummon(s: Summon, raw: number, hit: Hit) {
    const amount = Math.max(1, Math.round(raw));
    s.hp = Math.max(0, s.hp - amount);
    this.broadcast(MSG.damage, { x: s.x, y: s.y, amount, toPlayer: true, ...hit } satisfies DamageMessage);
    if (s.hp === 0) this.removeSummon(s.id);
  }

  private canHit(p: Player, m: Monster, range: number) {
    return tileDistance(p.x, p.y, m.x, m.y) <= range && hasLineOfSight(this.dungeon, p.x, p.y, m.x, m.y);
  }

  private nearestMonsterInRange(p: Player, range: number): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    this.state.monsters.forEach((m, id) => {
      const dist = tileDistance(p.x, p.y, m.x, m.y);
      if (dist > range || dist >= bestDist) return;
      if (!hasLineOfSight(this.dungeon, p.x, p.y, m.x, m.y)) return;
      best = id;
      bestDist = dist;
    });
    return best;
  }

  /**
   * `source` é "basic", o id da magia ou "summon:<tipo>", para a telemetria.
   * `creditId` é o jogador que leva XP e loot (o dono, quando quem bate é uma criatura invocada).
   */
  private damageMonster(m: Monster, amount: number, hit: Hit, source: string, creditId = hit.attacker) {
    const brain = this.brains.get(m.id);
    if (!brain) return;
    const seat = this.seats.get(creditId);
    const dealt = Math.min(amount, m.hp);
    if (seat) bump(seat.stats.damageDealt, source, dealt);
    m.hp = Math.max(0, m.hp - amount);
    // Sede de sangue (melhoria): o golpe do próprio herói cura uma parte do dano, sem aviso a cada golpe.
    const hero = this.state.players.get(creditId);
    if (seat && hero?.status === "playing" && seat.perkBonus.lifesteal > 0 && !source.startsWith("summon:")) {
      const healed = Math.min(hero.maxHp - hero.hp, Math.round(dealt * seat.perkBonus.lifesteal));
      if (healed > 0) {
        hero.hp += healed;
        seat.stats.healing += healed;
      }
    }
    brain.participants.add(creditId);
    // Apanhar faz o monstro perseguir quem bateu, se ainda não persegue ninguém.
    if (!brain.targetId) brain.targetId = hit.attacker;
    this.broadcast(MSG.damage, { x: m.x, y: m.y, amount, toPlayer: false, ...hit } satisfies DamageMessage);
    if (m.hp === 0) this.killMonster(m, brain, creditId);
    else this.checkEnrage(m, brain);
  }

  private killMonster(m: Monster, brain: Brain, killerId: string) {
    this.state.monsters.delete(m.id);
    this.brains.delete(m.id);
    this.state.players.forEach((p) => { if (p.target === m.id) p.target = ""; });

    // XP: a equipe que participou divide (com bônus por participante).
    const sharers = [...brain.participants].filter((id) => this.state.players.get(id)?.status === "playing");
    const share = xpShare(brain.xp, sharers.length);
    for (const id of sharers) this.gainXp(id, share);

    // Loot: vai para quem deu o último golpe.
    const killer = this.state.players.get(killerId);
    if (killer?.status === "playing") {
      const value = rollRange(brain.loot);
      killer.loot += value;
      const stats = this.seats.get(killerId)?.stats;
      if (stats) {
        stats.loot.monsters += value;
        bump(stats.kills, m.kind);
        stats.firstKillAt ??= this.seconds();
      }
      this.notice(m.x, m.y - 1, `+${value} loot`, 0xf1c40f);
    }

    // Itens caem no chão onde o monstro morreu: quem passar por cima primeiro leva.
    // O boss que morre no centro da sala larga ao lado: ali abre o portal, que esconderia o loot
    // (e pegar o loot faria a equipe sair da dungeon).
    const at = brain.def.rank === "boss" ? this.besidePortal(m.x, m.y) : { x: m.x, y: m.y };
    const drops = GUARANTEED_DROPS[brain.def.rank] || (Math.random() < COMMON_DROP_CHANCE ? 1 : 0);
    for (let i = 0; i < drops; i++) this.dropItem(rollItem(brain.def.rank, brain.depth, Math.random), at.x, at.y);
    const potions = GUARANTEED_POTIONS[brain.def.rank] || (Math.random() < COMMON_POTION_CHANCE ? 1 : 0);
    for (let i = 0; i < potions; i++) this.dropItem(rollPotion(Math.random), at.x, at.y);

    if (brain.chestId) {
      const chest = this.state.chests.get(brain.chestId);
      if (chest) {
        chest.locked = false;
        this.notice(chest.x, chest.y, "Baú destrancado!", 0xf39c12);
      }
    }

    if (brain.def.rank === "boss") {
      const c = centerOf(this.dungeon.boss);
      this.dungeon.tiles[c.y * this.dungeon.width + c.x] = Tile.Portal;
      this.state.bossDefeated = true;
      this.notice(c.x, c.y, "O portal se abriu!", 0x3fa7d6);
    }
  }

  private gainXp(sessionId: string, amount: number) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing") return;
    p.xp += amount;
    const seat = this.seats.get(sessionId);
    if (seat) seat.stats.xp += amount;
    this.notice(p.x, p.y - 1, `+${amount} XP`, 0xdcdde1);
    const level = levelForXp(p.xp);
    const previous = p.level;
    if (level <= previous) return;
    // Subiu de nível: atributos novos e cura completa.
    const stats = statsFor(p.classId as ClassId, level, seat?.bonus);
    p.level = level;
    if (seat) for (let l = previous + 1; l <= level; l++) seat.stats.levelAt[l] = this.seconds();
    p.hp = p.maxHp = stats.maxHp;
    p.mana = p.maxMana = stats.maxMana;
    this.notice(p.x, p.y - 1, `Nível ${level}!`, 0x2ecc71);
    if (SPELL_SLOT_LEVELS.some((l) => l <= level && l > previous)) this.notice(p.x, p.y - 2, "Nova magia!", 0x9b59b6);
    // Os outros níveis dão uma melhoria para escolher (uma de cada vez, se subiu vários).
    let perks = 0;
    for (let l = previous + 1; l <= level; l++) if (grantsPerk(l)) perks++;
    if (perks > 0 && seat) {
      if (p.perkOffer.length === 0) {
        this.offerPerks(p, seat);
        perks--;
      }
      p.perksQueued += perks;
    }
  }

  // --- Melhorias ---------------------------------------------------------------

  /** Sorteia as melhorias da próxima escolha (some sozinha se todas já chegaram ao limite). */
  private offerPerks(p: Player, seat: Seat) {
    p.perkOffer.clear();
    p.perkOffer.push(...rollPerkOffer(seat.perks, p.level, Math.random));
  }

  /** Escolha de uma das melhorias oferecidas. Vale até o fim da hunt. */
  private handleChoosePerk(client: Client, msg: ChoosePerkMessage) {
    const p = this.state.players.get(client.sessionId);
    const seat = this.seats.get(client.sessionId);
    if (!p || !seat || p.status !== "playing") return;
    const perk = msg?.perk;
    if (!isPerk(perk) || !p.perkOffer.includes(perk)) return;

    seat.perks[perk] = (seat.perks[perk] ?? 0) + 1;
    p.perks.set(perk, seat.perks[perk]!);
    seat.perkBonus = perkBonuses(seat.perks);
    const b = seat.perkBonus;
    seat.bonus = { hp: seat.aura.hp + b.hp, mana: seat.aura.mana + b.mana, damage: seat.aura.damage + b.damage, speed: seat.aura.speed + b.speed };
    // Vida e mana máximas crescem na hora, e o que cresceu entra cheio.
    const stats = statsFor(p.classId as ClassId, p.level, seat.bonus);
    p.hp = Math.min(stats.maxHp, p.hp + Math.max(0, stats.maxHp - p.maxHp));
    p.mana = Math.min(stats.maxMana, p.mana + Math.max(0, stats.maxMana - p.maxMana));
    p.maxHp = stats.maxHp;
    p.maxMana = stats.maxMana;
    seat.stats.perksChosen.push({ id: perk, offer: [...p.perkOffer], level: p.level, at: this.seconds() });
    this.notice(p.x, p.y - 1, PERKS[perk].name, 0xf1c40f);

    if (p.perksQueued > 0) {
      p.perksQueued--;
      this.offerPerks(p, seat);
    } else {
      p.perkOffer.clear();
    }
  }

  private damagePlayer(sessionId: string, raw: number, hit: Hit) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing") return;
    const seat = this.seats.get(sessionId);
    const guard = p.guarded ? seat?.guard ?? 0 : 0;
    const armor = armorOf(equipment(p)) + (seat?.perkBonus.armor ?? 0);
    let amount = Math.max(1, Math.round(raw * (1 - damageReduction(armor)) * (1 - guard)));
    // O escudo absorve primeiro; o que sobra vai para a vida.
    const absorbed = Math.min(p.barrier, amount);
    if (absorbed > 0) {
      p.barrier -= absorbed;
      amount -= absorbed;
    }
    if (seat) {
      const kind = this.state.monsters.get(hit.attacker)?.kind ?? seat.dot?.kind ?? "?";
      bump(seat.stats.damageTaken, kind, Math.min(amount, p.hp));
      if (hit.special) bump(seat.stats.specialDamage, kind, Math.min(amount, p.hp));
      seat.stats.damageMitigated += Math.max(0, raw - amount);
      seat.stats.minHpPct = Math.min(seat.stats.minHpPct, Math.max(0, p.hp - amount) / p.maxHp);
      if (amount > 0 && amount >= p.hp) {
        const depth = this.brains.get(hit.attacker)?.depth ?? -1;
        seat.stats.death = { by: kind, depth, x: p.x, y: p.y, at: this.seconds() };
      }
    }
    p.hp = Math.max(0, p.hp - amount);
    this.broadcast(MSG.damage, { x: p.x, y: p.y, amount, absorbed, toPlayer: true, ...hit } satisfies DamageMessage);
    if (p.hp === 0) this.endRun(sessionId, "died");
  }

  // --- IA dos monstros ------------------------------------------------------

  private monsterThink(m: Monster, now: number) {
    const brain = this.brains.get(m.id);
    if (!brain) return;
    const def = brain.def;

    // Atordoado: não anda nem ataca.
    if (m.stunned) return;

    // Habilidade especial em andamento: parado até o golpe sair.
    if (brain.casting) {
      if (now >= brain.casting.strikeAt) this.strikeSpecial(m, brain, now);
      return;
    }

    // Desiste de quem morreu, saiu ou fugiu para longe.
    if (brain.targetId) {
      const t = this.foe(brain.targetId);
      if (!t || tileDistance(m.x, m.y, t.x, t.y) > def.aggroRange + LEASH_TILES) brain.targetId = null;
    }
    if (!brain.targetId) brain.targetId = this.nearestVisibleFoe(m, def.aggroRange);
    if (!brain.targetId) return;

    const target = this.foe(brain.targetId)!;
    // A primeira habilidade especial espera um pouco depois de notar alguém (não sai junto com o aggro).
    if (brain.nextSpecialAt === 0) brain.nextSpecialAt = now + def.special.cooldownMs * SPECIAL_FIRST_DELAY;
    if (now >= brain.nextSpecialAt && this.startSpecial(m, brain, target, now)) return;

    const inRange = tileDistance(m.x, m.y, target.x, target.y) <= def.attackRange
      && hasLineOfSight(this.dungeon, m.x, m.y, target.x, target.y);

    if (inRange) {
      if (now >= brain.nextAttackAt) {
        brain.nextAttackAt = now + def.attackCooldownMs;
        const hit: Hit = { attacker: m.id, fromX: m.x, fromY: m.y, fx: def.attackFx };
        const summon = this.state.summons.get(brain.targetId);
        if (summon) this.damageSummon(summon, rollDamage(brain.damage), hit);
        else this.damagePlayer(brain.targetId, rollDamage(brain.damage), hit);
      }
      return;
    }

    if (now < brain.nextMoveAt || m.rooted) return;
    const blocked = this.occupiedTiles();
    const step = nextStep(this.dungeon, m, target, def.attackRange, (x, y) => blocked.has(y * this.dungeon.width + x));
    if (!step) {
      // Sem caminho agora (corredor bloqueado): tenta de novo daqui a pouco.
      brain.nextMoveAt = now + 400;
      return;
    }
    const diagonal = step.x !== m.x && step.y !== m.y;
    brain.nextMoveAt = now + (1000 / (def.speed * MONSTER_SPEED_SCALE)) * (diagonal ? Math.SQRT2 : 1);
    m.x = step.x;
    m.y = step.y;
  }

  // --- Habilidades especiais dos monstros ---------------------------------------

  /**
   * Começa a habilidade especial se o alvo estiver ao alcance e à vista: o monstro para e os tiles atingidos
   * acendem no chão (aviso). O golpe sai em `strikeSpecial`, nos tiles avisados: quem sair deles escapa.
   */
  private startSpecial(m: Monster, brain: Brain, target: { x: number; y: number }, now: number) {
    const special = brain.def.special;
    if (tileDistance(m.x, m.y, target.x, target.y) > special.range || !hasLineOfSight(this.dungeon, m.x, m.y, target.x, target.y)) return false;
    // A faixa vai até a ponta do alcance na direção do alvo; as áreas ficam no alvo (ou em volta do monstro).
    let tx = target.x;
    let ty = target.y;
    if (special.shape === "line") {
      const len = Math.hypot(tx - m.x, ty - m.y) || 1;
      const reach = special.length ?? 1;
      tx = m.x + Math.round(((tx - m.x) / len) * reach);
      ty = m.y + Math.round(((ty - m.y) / len) * reach);
    }
    const tiles = specialTiles(this.dungeon, special, m.x, m.y, target.x, target.y);
    if (tiles.length === 0) return false;
    brain.casting = { tiles, tx, ty, targetId: brain.targetId!, strikeAt: now + special.windupMs };
    brain.nextSpecialAt = now + special.windupMs + special.cooldownMs * (brain.enraged ? ENRAGE_COOLDOWN : 1);
    // Não emenda o ataque básico logo depois do golpe especial.
    brain.nextAttackAt = Math.max(brain.nextAttackAt, now + special.windupMs + brain.def.attackCooldownMs * 0.5);
    this.broadcast(MSG.monsterCast, {
      id: m.id, kind: m.kind as MonsterKind, x: m.x, y: m.y, tx, ty, tiles: flatTiles(tiles), ms: special.windupMs,
    } satisfies MonsterCastMessage);
    return true;
  }

  /** O golpe especial sai: dano em quem ainda está nos tiles avisados, mais o efeito da habilidade. */
  private strikeSpecial(m: Monster, brain: Brain, now: number) {
    const cast = brain.casting!;
    brain.casting = null;
    const special = brain.def.special;
    const kind = m.kind as MonsterKind;
    this.broadcast(MSG.monsterStrike, {
      id: m.id, kind, x: m.x, y: m.y, tx: cast.tx, ty: cast.ty, tiles: flatTiles(cast.tiles),
    } satisfies MonsterStrikeMessage);
    const inArea = (x: number, y: number) => cast.tiles.some((t) => t.x === x && t.y === y);
    const raw = brain.damage * special.power;
    const hit: Hit = { attacker: m.id, fromX: m.x, fromY: m.y, fx: brain.def.attackFx, special: true };
    let targetHit = false;

    this.state.summons.forEach((s) => {
      if (!inArea(s.x, s.y)) return;
      if (s.id === cast.targetId) targetHit = true;
      this.damageSummon(s, rollDamage(raw), hit);
    });
    this.state.players.forEach((p, sessionId) => {
      if (p.status !== "playing" || !inArea(p.x, p.y)) return;
      if (sessionId === cast.targetId) targetHit = true;
      this.damagePlayer(sessionId, rollDamage(raw), hit);
      const seat = this.seats.get(sessionId);
      if (!seat || p.status !== "playing") return;
      if (special.dot) {
        const damage = Math.max(1, Math.round(brain.damage * special.dot.power));
        // Um veneno novo substitui o antigo se for mais forte ou se o antigo estiver acabando.
        if (!seat.dot || damage >= seat.dot.damage || seat.dot.until < now + special.dot.durationMs) {
          seat.dot = { damage, monsterId: m.id, kind, nextAt: now + 1000, until: now + special.dot.durationMs };
          p.dot = special.dot.kind;
        }
      }
      if (special.slow) {
        seat.slow = { factor: Math.min(special.slow.factor, seat.slow?.factor ?? 1), until: now + special.slow.durationMs };
        p.slowed = true;
      }
      if (special.pull) this.pullBeside(p, m);
    });

    // Quem era o alvo e saiu da área esquivou.
    if (!targetHit) {
      const seat = this.seats.get(cast.targetId);
      if (seat && this.state.players.get(cast.targetId)?.status === "playing") bump(seat.stats.specialsDodged, kind);
    }
    if (special.selfHeal && m.hp > 0) {
      const healed = Math.min(m.maxHp - m.hp, Math.round(m.maxHp * special.selfHeal));
      if (healed > 0) {
        m.hp += healed;
        this.notice(m.x, m.y, `+${healed}`, 0x2ecc71);
      }
    }
  }

  /** Atordoado durante o aviso: a habilidade se perde (o cliente apaga o aviso quando o monstro fica atordoado). */
  private interruptSpecial(m: Monster, brain: Brain) {
    brain.casting = null;
    this.notice(m.x, m.y - 1, "Interrompido!", 0xf1c40f);
  }

  /** Abaixo de `ENRAGE_HP` da vida, o boss se enfurece: a habilidade especial volta mais rápido. */
  private checkEnrage(m: Monster, brain: Brain) {
    if (brain.enraged || brain.def.rank !== "boss" || m.hp > m.maxHp * ENRAGE_HP) return;
    brain.enraged = true;
    brain.nextSpecialAt = Math.min(brain.nextSpecialAt, this.clock.currentTime + 1500);
    this.notice(m.x, m.y - 1, `${brain.def.name} se enfurece!`, 0xff5e57);
  }

  /** Língua Grudenta: puxa o jogador para o tile livre ao lado do monstro mais perto de onde ele está. */
  private pullBeside(p: Player, m: Monster) {
    if (tileDistance(p.x, p.y, m.x, m.y) <= 1) return;
    const blocked = this.occupiedTiles();
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = m.x + dx;
        const y = m.y + dy;
        if ((dx === 0 && dy === 0) || !isWalkable(this.dungeon, x, y) || blocked.has(y * this.dungeon.width + x)) continue;
        // Não puxa para cima de um portal (sairia da hunt sem querer).
        if (tileAt(this.dungeon, x, y) === Tile.Portal) continue;
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist < bestDist) {
          best = { x, y };
          bestDist = dist;
        }
      }
    }
    if (!best) return;
    p.x = best.x;
    p.y = best.y;
  }

  /** Veneno ou queimadura: um pulso de dano por segundo até acabar. */
  private tickDot(sessionId: string, p: Player, seat: Seat, now: number) {
    const dot = seat.dot;
    if (!dot) return;
    if (p.status !== "playing" || now >= dot.until) {
      seat.dot = null;
      p.dot = "";
      return;
    }
    if (now < dot.nextAt) return;
    dot.nextAt += 1000;
    this.damagePlayer(sessionId, dot.damage, {
      attacker: dot.monsterId, fromX: p.x, fromY: p.y, fx: "bite", special: true, dot: p.dot as "poison" | "burn",
    });
  }

  /** Quem o monstro pode atacar: jogador vivo na hunt ou criatura invocada. */
  private foe(id: string): { x: number; y: number } | undefined {
    const p = this.state.players.get(id);
    if (p) return p.status === "playing" ? p : undefined;
    return this.state.summons.get(id);
  }

  /** Jogador ou criatura invocada mais perto do monstro, com linha de visão. */
  private nearestVisibleFoe(m: Monster, range: number): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    const consider = (x: number, y: number, id: string) => {
      const dist = tileDistance(m.x, m.y, x, y);
      if (dist > range || dist >= bestDist) return;
      if (!hasLineOfSight(this.dungeon, m.x, m.y, x, y)) return;
      best = id;
      bestDist = dist;
    };
    this.state.players.forEach((p, id) => { if (p.status === "playing") consider(p.x, p.y, id); });
    this.state.summons.forEach((s, id) => consider(s.x, s.y, id));
    return best;
  }

  /** Tiles ocupados por monstros, criaturas invocadas ou jogadores vivos (ninguém se empilha). */
  private occupiedTiles() {
    const w = this.dungeon.width;
    const set = new Set<number>();
    this.state.monsters.forEach((m) => set.add(m.y * w + m.x));
    this.state.summons.forEach((s) => set.add(s.y * w + s.x));
    this.state.players.forEach((p) => { if (p.status === "playing") set.add(p.y * w + p.x); });
    return set;
  }

  // --- Baús -------------------------------------------------------------

  private openChests() {
    this.state.chests.forEach((chest) => {
      if (chest.locked || chest.opened) return;
      this.state.players.forEach((p, sessionId) => {
        if (chest.opened || p.status !== "playing" || tileDistance(p.x, p.y, chest.x, chest.y) > 1) return;
        chest.opened = true;
        const k = 1 + DEPTH_SCALING * (this.chestDepth.get(chest.id) ?? 0);
        const value = Math.round(rollRange(CHEST_LOOT) * k);
        p.loot += value;
        const stats = this.seats.get(sessionId)?.stats;
        if (stats) {
          stats.loot.chests += value;
          stats.chestsOpened++;
        }
        this.notice(chest.x, chest.y, `Baú: +${value} loot`, 0xf1c40f);
        // O baú guarda um item melhor que o do mini-boss.
        this.dropItem(rollItem("miniboss", this.chestDepth.get(chest.id) ?? 0, Math.random, 1), chest.x, chest.y);
        for (const potion of POTION_IDS) this.dropItem(potion, chest.x, chest.y);
      });
    });
  }

  // --- Itens ------------------------------------------------------------

  /** O tile dado, ou um vizinho andável se ele for o centro da sala do boss (onde abre o portal). */
  private besidePortal(x: number, y: number) {
    const c = centerOf(this.dungeon.boss);
    if (x !== c.x || y !== c.y) return { x, y };
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (isWalkable(this.dungeon, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
    return { x, y };
  }

  private dropItem(itemId: string, x: number, y: number) {
    const item = new GroundItem();
    item.id = `i${this.nextItemId++}`;
    item.itemId = itemId;
    item.x = x;
    item.y = y;
    this.state.items.set(item.id, item);
    this.itemExpiresAt.set(item.id, this.clock.currentTime + ITEM_LIFETIME_MS);
    return item;
  }

  /** Some com o item do chão (pego ou expirado). */
  private removeGroundItem(id: string) {
    this.state.items.delete(id);
    this.itemExpiresAt.delete(id);
    this.pickupBlocked.delete(id);
  }

  // Menu da bag na hunt: o cliente só manda a intenção; aqui se valida e se troca.

  private handleBagEquip(client: Client, msg: BagEquipMessage) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.status !== "playing" || this.state.phase === "ended" || !isBagIndex(msg?.index, p.bag.length)) return;
    const def = ITEMS[p.bag[msg.index]];
    if (!def) return;
    // Troca de lugar: o item da bag veste, o que estava no slot ocupa a mesma posição da bag.
    const old = p[def.slot];
    p[def.slot] = def.id;
    if (old) p.bag[msg.index] = old;
    else p.bag.splice(msg.index, 1);
  }

  private handleUnequip(client: Client, msg: UnequipMessage) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.status !== "playing" || this.state.phase === "ended" || !isItemSlot(msg?.slot)) return;
    if (!p[msg.slot] || p.bag.length >= BAG_SIZE) return;
    p.bag.push(p[msg.slot]);
    p[msg.slot] = "";
  }

  private handleBagDrop(client: Client, msg: BagDropMessage) {
    const p = this.state.players.get(client.sessionId);
    if (!p || p.status !== "playing" || this.state.phase !== "running" || !isBagIndex(msg?.index, p.bag.length)) return;
    const [itemId] = p.bag.splice(msg.index, 1);
    const ground = this.dropItem(itemId, p.x, p.y);
    this.pickupBlocked.set(ground.id, client.sessionId);
    this.seats.get(client.sessionId)?.stats.items.dropped.push(itemId);
  }

  /**
   * Passar por cima de um item melhor que o equipado troca na hora e o antigo vai para a bag.
   * Os outros itens vão para a bag. Com a bag cheia, nada sai do chão (o item trocado também fica
   * no chão) e qualquer jogador pode pegar, não há dono. Poções vão para a mochila até o limite de cada tipo.
   */
  private pickUpItems() {
    // Quem largou um item já saiu de cima dele: volta a poder pegar.
    this.pickupBlocked.forEach((sessionId, id) => {
      const p = this.state.players.get(sessionId);
      const it = this.state.items.get(id);
      if (!p || !it || p.x !== it.x || p.y !== it.y) this.pickupBlocked.delete(id);
    });
    this.state.players.forEach((p, sessionId) => {
      if (p.status !== "playing") return;
      const here = [...this.state.items.values()]
        .filter((it) => it.x === p.x && it.y === p.y && this.pickupBlocked.get(it.id) !== sessionId)
        .sort((a, b) => (ITEMS[b.itemId]?.tier ?? 0) - (ITEMS[a.itemId]?.tier ?? 0));
      for (const ground of here) {
        if (isPotion(ground.itemId)) {
          // Poção: guarda enquanto couber; com a mochila cheia, fica no chão.
          const field = POTION_FIELD[ground.itemId];
          if (p[field] >= POTION_MAX) continue;
          p[field] += 1;
          const picked = this.seats.get(sessionId)?.stats.potions.picked;
          if (picked) picked[ground.itemId] = (picked[ground.itemId] ?? 0) + 1;
          this.removeGroundItem(ground.id);
          this.notice(p.x, p.y - 1, POTIONS[ground.itemId].name, POTIONS[ground.itemId].color);
          continue;
        }
        const def = ITEMS[ground.itemId];
        if (!def) continue;
        const seat = this.seats.get(sessionId);
        const action = pickupAction(def.id, p[def.slot], p.bag.length);
        if (action === "full") {
          const now = this.clock.currentTime;
          if (seat && now >= seat.bagFullNoticeUntil) {
            seat.bagFullNoticeUntil = now + BAG_FULL_NOTICE_MS;
            seat.stats.items.bagFull++;
            this.notice(p.x, p.y - 1, "Bag cheia", 0xe74c3c);
          }
          continue;
        }
        if (action === "bag") p.bag.push(def.id);
        else {
          if (action === "swap") p.bag.push(p[def.slot]);
          p[def.slot] = def.id;
        }
        seat?.stats.items.picked.push(def.id);
        this.removeGroundItem(ground.id);
        this.notice(p.x, p.y - 1, action === "bag" ? `${def.name} 🎒${p.bag.length}/${BAG_SIZE}` : def.name, TIER_COLORS[def.tier]);
      }
    });
  }

  private expireItems(now: number) {
    this.itemExpiresAt.forEach((at, id) => {
      if (now < at) return;
      this.removeGroundItem(id);
    });
  }

  private notice(x: number, y: number, text: string, color: number) {
    this.broadcast(MSG.notice, { x, y, text, color } satisfies NoticeMessage);
  }

  private endRun(sessionId: string, outcome: RunOutcome) {
    const player = this.state.players.get(sessionId);
    if (!player || player.status !== "playing") return;

    const survived = outcome === "escaped" || outcome === "completed";
    if (!survived) player.loot = 0; // Morrer perde todo o loot.
    // Quem morre (ou fica soterrado) perde 1 equipamento sorteado, a bag inteira e as poções: caem no chão e
    // os outros podem saquear. O resto do equipamento volta para a conta.
    const seat = this.seats.get(sessionId);
    let lost: string | undefined;
    if (!survived) {
      const worn = ITEM_SLOTS.filter((slot) => player[slot]);
      const slot = worn[Math.floor(Math.random() * worn.length)];
      if (slot) {
        lost = player[slot];
        this.dropItem(lost, player.x, player.y);
        // O corpo fica sem o que largou (o equipamento aparece no personagem).
        player[slot] = "";
      }
      for (const id of player.bag) this.dropItem(id, player.x, player.y);
      if (seat) seat.stats.items.lost = [...(lost ? [lost] : []), ...player.bag];
      for (const potion of POTION_IDS) {
        for (let i = 0; i < player[POTION_FIELD[potion]]; i++) this.dropItem(potion, player.x, player.y);
      }
    }
    const bag = survived ? [...player.bag] : [];
    player.bag.clear();
    // Poções não saem da dungeon.
    player.healthPotions = player.manaPotions = 0;
    player.status = outcome;
    player.target = "";
    player.dot = "";
    player.slowed = false;
    if (seat) {
      seat.dot = null;
      seat.slow = null;
    }
    player.barrier = 0;
    this.state.summons.forEach((s) => { if (s.owner === sessionId) this.removeSummon(s.id); });

    // O equipamento que sobrou no corpo volta equipado para a conta; a bag de quem sai vivo vai para o cofre.
    const items = equipment(player).filter(Boolean);
    const result: RunEndedMessage = { outcome, loot: player.loot, level: player.level, items, bag, lost };
    this.clients.getById(sessionId)?.send(MSG.runEnded, result);

    const userId = seat?.userId;
    if (userId) {
      void recordRun(this.matchId, { userId, classId: player.classId, outcome, level: player.level, loot: player.loot, items, bag });
    }
    if (seat) {
      void recordTelemetry({
        matchId: this.matchId, userId: userId ?? null, name: player.name, classId: player.classId,
        partySize: this.state.players.size, mapId: this.map.id, seed: this.state.seed, outcome, level: player.level,
        durationS: this.seconds(), loot: player.loot, pathRooms: this.dungeon.path.length, stats: seat.stats,
      });
    }

    const everyoneOut = [...this.state.players.values()].every((p) => p.status !== "playing");
    if (everyoneOut) {
      this.state.phase = "ended";
      this.clock.setTimeout(() => this.disconnect(), 10_000);
    }
  }

  /** Segundos desde o início da hunt, para a telemetria. */
  private seconds() {
    return Math.round(this.elapsedMs / 100) / 10;
  }

  /** Telemetria: primeira vez que o jogador pisa em cada sala do caminho (a do boss conta como a última). */
  private trackDepth(sessionId: string, p: Player) {
    const stats = this.seats.get(sessionId)?.stats;
    if (!stats) return;
    const inside = (r: Rect) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
    // A primeira sala do caminho às vezes encosta na inicial: o trecho em comum conta como sala inicial.
    if (inside(this.dungeon.spawn)) return;
    const depth = [...this.dungeon.path, this.dungeon.boss].findIndex(inside);
    if (depth >= 0 && !(depth in stats.depthAt)) stats.depthAt[depth] = this.seconds();
  }

  /** Dano base do jogador (classe, nível, áureas e arma), antes da variação. */
  private baseDamage(sessionId: string, p: Player) {
    return statsFor(p.classId as ClassId, p.level, this.seats.get(sessionId)?.bonus).damage * weaponMultiplier(p.weapon);
  }
}

function spellIn(p: Player, slot: SpellSlot) {
  return slot === 0 ? p.spell1 : p.spell2;
}

function equipment(p: Player) {
  return ITEM_SLOTS.map((slot) => p[slot]);
}

/** Dano com variação de ±15%. */
/** Tiles em pares [x0, y0, x1, y1, ...] para as mensagens. */
function flatTiles(tiles: { x: number; y: number }[]) {
  return tiles.flatMap((t) => [t.x, t.y]);
}

function rollDamage(base: number) {
  return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3)));
}

function rollRange([min, max]: [number, number]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
