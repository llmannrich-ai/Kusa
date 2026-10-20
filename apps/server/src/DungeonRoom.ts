import { randomUUID } from "node:crypto";
import { Room, type Client } from "colyseus";
import {
  BASIC_ATTACKS,
  BOSS_KIND,
  BOSS_LOOT_BONUS,
  CHEST_LOOT,
  CLASSES,
  MAX_LOGIN_LENGTH,
  COMMON_DROP_CHANCE,
  DEPTH_SCALING,
  GUARANTEED_DROPS,
  ITEMS,
  ITEM_SLOTS,
  MINIBOSS_KIND,
  MONSTERS,
  MATCH_DURATION_SECONDS,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MSG,
  PATH_SPAWNS,
  SERVER_TICK_MS,
  SPELLS,
  SPELL_SLOT_LEVELS,
  TIER_COLORS,
  Tile,
  armorOf,
  auraBonuses,
  bestPerSlot,
  centerOf,
  createRng,
  generateDungeon,
  damageReduction,
  flightMs,
  hasLineOfSight,
  isUpgrade,
  isWalkable,
  knownSpells,
  levelForXp,
  monsterStats,
  rollItem,
  spellChoices,
  statsFor,
  tileAt,
  tileDistance,
  weaponMultiplier,
  xpForLevel,
  xpShare,
  type AttackMessage,
  type Bonuses,
  type CastMessage,
  type ChooseSpellMessage,
  type ClassId,
  type DamageMessage,
  type Dungeon,
  type HuntMetadata,
  type JoinOptions,
  type MonsterDef,
  type MonsterKind,
  type MoveMessage,
  type NoticeMessage,
  type Rect,
  type RunEndedMessage,
  type RunOutcome,
  type SpellDef,
  type SpellMessage,
  type SpellId,
  type SpellSlot,
  type TargetMessage,
} from "@kusa/shared";
import { nextStep } from "./pathfinding.ts";
import { Chest, DungeonState, GroundItem, Monster, Player } from "./state.ts";
import { recordRun, resolveAccount, takeLoadout, type Account } from "./supabase.ts";

interface Seat {
  userId: string | null;
  /** Momento (ms) em que o jogador pode dar o próximo passo. */
  nextMoveAt: number;
  /** Momento (ms) do próximo auto-attack. */
  nextAttackAt: number;
  /** true quando o jogador escolheu o alvo (toque/🎯); false quando a mira automática escolheu. */
  targetLocked: boolean;
  /** Momento (ms) em que cada slot de magia volta a poder ser usado. */
  spellReadyAt: [number, number];
  /** Grito de Guerra: fração do dano evitada e até quando. */
  guard: number;
  guardUntil: number;
  /** Áureas compradas na árvore da classe. */
  bonus: Bonuses;
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
/** Só para testes: KUSA_START_LEVEL=8 faz todo mundo começar no nível 8 (com os slots de magia abertos). */
const START_LEVEL = Math.min(MAX_LEVEL, Math.max(1, Number(process.env.KUSA_START_LEVEL) || 1));

/** Uma hunt: a equipe (1 a 4 jogadores) entra junta e cada um sai morto, fugindo ou após o boss. */
export class DungeonRoom extends Room<{ state: DungeonState; metadata: HuntMetadata }> {
  maxClients = MAX_PARTY_SIZE;
  state = new DungeonState();

  private dungeon!: Dungeon;
  private matchId = randomUUID();
  private seats = new Map<string, Seat>();
  private elapsedMs = 0;
  private regenMs = 0;
  private brains = new Map<string, Brain>();
  private chestDepth = new Map<string, number>();
  private nextMonsterId = 1;
  private nextItemId = 1;
  /** Momento (ms) em que cada item do chão some. */
  private itemExpiresAt = new Map<string, number>();

  onCreate() {
    this.state.seed = Math.floor(Math.random() * 2 ** 31);
    this.dungeon = generateDungeon(this.state.seed);
    this.spawnMonsters();

    this.onMessage(MSG.start, (client) => {
      if (client.sessionId !== this.state.leaderId || this.state.phase !== "lobby") return;
      this.startRun();
    });

    this.onMessage(MSG.move, (client, msg: MoveMessage) => this.handleMove(client, msg));
    this.onMessage(MSG.target, (client, msg: TargetMessage) => this.handleTarget(client, msg));
    this.onMessage(MSG.chooseSpell, (client, msg: ChooseSpellMessage) => this.handleChooseSpell(client, msg));
    this.onMessage(MSG.cast, (client, msg: CastMessage) => this.handleCast(client, msg));

    this.setSimulationInterval((dt) => this.tick(dt), SERVER_TICK_MS);
  }

  async onAuth(_client: Client, options: JoinOptions) {
    // Sempre um objeto (verdadeiro): sem conta, entra como convidado.
    return { account: await resolveAccount(options.accessToken) };
  }

  onJoin(client: Client, options: JoinOptions, auth: { account: Account | null }) {
    const classId: ClassId = options.classId in CLASSES ? options.classId : "knight";
    const talents = auth.account?.talents ?? {};
    const bonus = auraBonuses(classId, talents);
    const stats = statsFor(classId, START_LEVEL, bonus);
    const index = this.state.players.size;

    const player = new Player();
    player.name = auth.account?.name ?? [...(options.name || "Aventureiro")].slice(0, MAX_LOGIN_LENGTH).join("");
    player.classId = classId;
    player.level = START_LEVEL;
    player.xp = xpForLevel(START_LEVEL);
    player.hp = player.maxHp = stats.maxHp;
    player.mana = player.maxMana = stats.maxMana;
    player.knownSpells.push(...knownSpells(classId, talents));
    // A equipe nasce junta, ao redor do portal de fuga.
    player.x = this.dungeon.portal.x + [-1, 1, -1, 1][index];
    player.y = this.dungeon.portal.y + [-1, -1, 1, 1][index];

    this.state.players.set(client.sessionId, player);
    this.seats.set(client.sessionId, {
      userId: auth.account?.userId ?? null, nextMoveAt: 0, nextAttackAt: 0, targetLocked: false,
      spellReadyAt: [0, 0], guard: 0, guardUntil: 0, bonus,
    });
    if (!this.state.leaderId) {
      this.state.leaderId = client.sessionId;
      void this.setMatchmaking({ metadata: { leader: player.name } });
    }
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
        const leader = this.state.players.get(this.state.leaderId);
        if (leader) void this.setMatchmaking({ metadata: { leader: leader.name } });
      }
    }
  }

  // --- Spawn ------------------------------------------------------------

  /** Popula a dungeon: comuns nas salas do caminho, mini-boss + baú nas laterais e o boss no centro. */
  private spawnMonsters() {
    const d = this.dungeon;
    // RNG próprio derivado da seed, separado do gerador do mapa.
    const rng = createRng(this.state.seed ^ 0x9e3779b9);

    d.path.forEach((room, depth) => {
      const kinds = PATH_SPAWNS[Math.min(depth, PATH_SPAWNS.length - 1)];
      for (const kind of kinds) {
        const spot = this.freeSpotIn(room, () => rng.int(0, 1_000_000));
        if (spot) this.addMonster(kind, spot.x, spot.y, depth);
      }
    });

    d.side.forEach((room, i) => {
      const depth = this.nearestPathDepth(room);
      const c = centerOf(room);
      const boss = this.addMonster(MINIBOSS_KIND, c.x, c.y, depth);
      const chest = new Chest();
      chest.id = `c${i + 1}`;
      chest.x = room.x + 1;
      chest.y = room.y + 1;
      this.state.chests.set(chest.id, chest);
      this.chestDepth.set(chest.id, depth);
      this.brains.get(boss.id)!.chestId = chest.id;
    });

    const c = centerOf(d.boss);
    this.addMonster(BOSS_KIND, c.x, c.y, d.path.length);
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
      nextMoveAt: 0, nextAttackAt: 0, targetId: null, participants: new Set(), rootedUntil: 0,
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

  /** Profundidade de uma sala lateral = índice da sala do caminho mais próxima. */
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
    this.state.timeLeft = MATCH_DURATION_SECONDS;
    this.lock();
    // O equipamento escolhido no menu sai do inventário e entra na dungeon (chega logo depois do início).
    this.seats.forEach((seat, sessionId) => {
      if (!seat.userId) return;
      void takeLoadout(seat.userId).then((items) => {
        const p = this.state.players.get(sessionId);
        if (!p || p.status !== "playing") return;
        const best = bestPerSlot(items);
        for (const slot of ITEM_SLOTS) if (isUpgrade(best[slot], p[slot])) p[slot] = best[slot];
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

    const speed = statsFor(player.classId as ClassId, player.level, seat.bonus).speed;
    seat.nextMoveAt = now + (1000 / speed) * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
    player.x = nx;
    player.y = ny;

    if (this.state.phase === "running" && tileAt(this.dungeon, nx, ny) === Tile.Portal) {
      const bossPortal = centerOf(this.dungeon.boss);
      if (nx === bossPortal.x && ny === bossPortal.y) {
        // Concluir a dungeon dá um bônus sobre o loot carregado.
        player.loot = Math.round(player.loot * (1 + BOSS_LOOT_BONUS));
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
      return;
    }

    const now = this.clock.currentTime;
    this.regen(dt);
    this.expireEffects(now);
    this.state.players.forEach((p, sessionId) => this.playerAttack(sessionId, p, now));
    this.state.monsters.forEach((m) => this.monsterThink(m, now));
    this.openChests();
    this.pickUpItems();
    this.expireItems(now);
  }

  // --- Combate -----------------------------------------------------------

  private regen(dt: number) {
    this.regenMs += dt;
    if (this.regenMs < 1000) return;
    this.regenMs -= 1000;
    this.state.players.forEach((p) => {
      if (p.status !== "playing") return;
      if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(p.maxHp * HP_REGEN)));
      if (p.mana < p.maxMana) p.mana = Math.min(p.maxMana, p.mana + Math.max(1, Math.round(p.maxMana * MANA_REGEN)));
    });
  }

  /**
   * Auto-attack: bate no alvo travado enquanto ele estiver no alcance da classe.
   * Sem alvo, mira sozinho no monstro mais próximo ao alcance (no celular não há mira precisa).
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
    if (now < seat.nextAttackAt) return;

    if (!this.canHit(p, m, cls.attackRange)) return;

    seat.nextAttackAt = now + cls.attackCooldownMs;
    // Flecha e luzes voam até o alvo: o dano entra quando chegam (se o monstro ainda estiver vivo).
    const ms = flightMs(BASIC_ATTACKS[cls.id].projectileSpeed, p.x, p.y, m.x, m.y);
    this.broadcast(MSG.attack, { from: sessionId, x: p.x, y: p.y, tx: m.x, ty: m.y, ms } satisfies AttackMessage);
    const amount = rollDamage(this.baseDamage(sessionId, p));
    this.after(ms, () => {
      const alive = this.state.monsters.get(m.id);
      if (alive) this.damageMonster(alive, amount, sessionId);
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
    this.notice(p.x, p.y - 1, spell.name, 0x9b59b6);
  }

  private handleCast(client: Client, msg: CastMessage) {
    const sessionId = client.sessionId;
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing" || this.state.phase !== "running") return;
    const slot = msg?.slot;
    if (slot !== 0 && slot !== 1) return;
    const spell = SPELLS[spellIn(p, slot) as SpellId];
    if (!spell) return;

    const now = this.clock.currentTime;
    if (now < seat.spellReadyAt[slot]) return;
    if (p.mana < spell.manaCost) {
      client.send(MSG.notice, { x: p.x, y: p.y - 1, text: "Sem mana", color: 0x5dade2 } satisfies NoticeMessage);
      return;
    }

    // Magia de alvo usa o alvo atual se estiver ao alcance; senão, o monstro mais próximo.
    let target: Monster | undefined;
    if (spell.aim === "target") {
      const current = this.state.monsters.get(p.target);
      target = current && this.canHit(p, current, spell.range)
        ? current
        : this.state.monsters.get(this.nearestMonsterInRange(p, spell.range) ?? "");
      if (!target) {
        client.send(MSG.notice, { x: p.x, y: p.y - 1, text: "Nenhum alvo ao alcance", color: 0xbdc3c7 } satisfies NoticeMessage);
        return;
      }
    }

    p.mana -= spell.manaCost;
    seat.spellReadyAt[slot] = now + spell.cooldownMs;
    const tx = target?.x ?? p.x;
    const ty = target?.y ?? p.y;
    const ms = flightMs(spell.projectileSpeed ?? 0, p.x, p.y, tx, ty);
    this.broadcast(MSG.spell, { from: sessionId, spellId: spell.id, x: p.x, y: p.y, tx, ty, ms } satisfies SpellMessage);
    const amount = this.baseDamage(sessionId, p) * (spell.damage ?? 0);
    this.after(ms, () => this.applySpell(sessionId, spell, target?.id, tx, ty, amount));
  }

  /**
   * Efeito da magia ao chegar. A área segue o alvo se ele andou durante o voo; paredes bloqueiam
   * o efeito (precisa de linha de visão do centro até quem é atingido).
   */
  private applySpell(sessionId: string, spell: SpellDef, targetId: string | undefined, tx: number, ty: number, amount: number) {
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
    for (const m of hit) {
      const brain = this.brains.get(m.id);
      if (!brain) continue;
      if (spell.taunt) brain.targetId = sessionId;
      if (spell.rootMs) {
        brain.rootedUntil = now + spell.rootMs;
        m.rooted = true;
      }
      if (spell.damage) this.damageMonster(m, rollDamage(amount), sessionId);
    }

    if (spell.heal) {
      this.state.players.forEach((ally) => {
        if (ally.status !== "playing" || !inArea(ally.x, ally.y)) return;
        const healed = Math.min(ally.maxHp - ally.hp, Math.round(ally.maxHp * spell.heal!));
        if (healed <= 0) return;
        ally.hp += healed;
        this.notice(ally.x, ally.y, `+${healed}`, 0x2ecc71);
      });
    }

    if (spell.guard && spell.guardMs && p.status === "playing") {
      seat.guard = spell.guard;
      seat.guardUntil = now + spell.guardMs;
      p.guarded = true;
    }
  }

  /** Fim do Grito de Guerra e das raízes. */
  private expireEffects(now: number) {
    this.seats.forEach((seat, sessionId) => {
      const p = this.state.players.get(sessionId);
      if (p?.guarded && now >= seat.guardUntil) p.guarded = false;
    });
    this.state.monsters.forEach((m) => {
      if (m.rooted && now >= (this.brains.get(m.id)?.rootedUntil ?? 0)) m.rooted = false;
    });
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

  private damageMonster(m: Monster, amount: number, attackerId: string) {
    const brain = this.brains.get(m.id);
    if (!brain) return;
    m.hp = Math.max(0, m.hp - amount);
    brain.participants.add(attackerId);
    // Apanhar faz o monstro perseguir quem bateu, se ainda não persegue ninguém.
    if (!brain.targetId) brain.targetId = attackerId;
    this.broadcast(MSG.damage, { x: m.x, y: m.y, amount, toPlayer: false } satisfies DamageMessage);
    if (m.hp === 0) this.killMonster(m, brain, attackerId);
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
      this.notice(m.x, m.y - 1, `+${value} loot`, 0xf1c40f);
    }

    // Itens caem no chão onde o monstro morreu: quem passar por cima primeiro leva.
    const drops = GUARANTEED_DROPS[brain.def.rank] || (Math.random() < COMMON_DROP_CHANCE ? 1 : 0);
    for (let i = 0; i < drops; i++) this.dropItem(rollItem(brain.def.rank, brain.depth, Math.random), m.x, m.y);

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
    this.notice(p.x, p.y - 1, `+${amount} XP`, 0xdcdde1);
    const level = levelForXp(p.xp);
    const previous = p.level;
    if (level <= previous) return;
    // Subiu de nível: atributos novos e cura completa.
    const stats = statsFor(p.classId as ClassId, level, this.seats.get(sessionId)?.bonus);
    p.level = level;
    p.hp = p.maxHp = stats.maxHp;
    p.mana = p.maxMana = stats.maxMana;
    this.notice(p.x, p.y - 1, `Nível ${level}!`, 0x2ecc71);
    if (SPELL_SLOT_LEVELS.some((l) => l <= level && l > previous)) this.notice(p.x, p.y - 2, "Nova magia!", 0x9b59b6);
  }

  private damagePlayer(sessionId: string, raw: number) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing") return;
    const guard = p.guarded ? this.seats.get(sessionId)?.guard ?? 0 : 0;
    const amount = Math.max(1, Math.round(raw * (1 - damageReduction(armorOf(equipment(p)))) * (1 - guard)));
    p.hp = Math.max(0, p.hp - amount);
    this.broadcast(MSG.damage, { x: p.x, y: p.y, amount, toPlayer: true } satisfies DamageMessage);
    if (p.hp === 0) this.endRun(sessionId, "died");
  }

  // --- IA dos monstros ------------------------------------------------------

  private monsterThink(m: Monster, now: number) {
    const brain = this.brains.get(m.id);
    if (!brain) return;
    const def = brain.def;

    // Desiste de quem morreu, saiu ou fugiu para longe.
    if (brain.targetId) {
      const t = this.state.players.get(brain.targetId);
      if (!t || t.status !== "playing" || tileDistance(m.x, m.y, t.x, t.y) > def.aggroRange + LEASH_TILES) {
        brain.targetId = null;
      }
    }
    if (!brain.targetId) brain.targetId = this.nearestVisiblePlayer(m, def.aggroRange);
    if (!brain.targetId) return;

    const target = this.state.players.get(brain.targetId)!;
    const inRange = tileDistance(m.x, m.y, target.x, target.y) <= def.attackRange
      && hasLineOfSight(this.dungeon, m.x, m.y, target.x, target.y);

    if (inRange) {
      if (now >= brain.nextAttackAt) {
        brain.nextAttackAt = now + def.attackCooldownMs;
        this.damagePlayer(brain.targetId, rollDamage(brain.damage));
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
    brain.nextMoveAt = now + (1000 / def.speed) * (diagonal ? Math.SQRT2 : 1);
    m.x = step.x;
    m.y = step.y;
  }

  private nearestVisiblePlayer(m: Monster, range: number): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    this.state.players.forEach((p, id) => {
      if (p.status !== "playing") return;
      const dist = tileDistance(m.x, m.y, p.x, p.y);
      if (dist > range || dist >= bestDist) return;
      if (!hasLineOfSight(this.dungeon, m.x, m.y, p.x, p.y)) return;
      best = id;
      bestDist = dist;
    });
    return best;
  }

  /** Tiles ocupados por monstros ou jogadores vivos (monstros não se empilham nem atravessam jogadores). */
  private occupiedTiles() {
    const w = this.dungeon.width;
    const set = new Set<number>();
    this.state.monsters.forEach((m) => set.add(m.y * w + m.x));
    this.state.players.forEach((p) => { if (p.status === "playing") set.add(p.y * w + p.x); });
    return set;
  }

  // --- Baús -------------------------------------------------------------

  private openChests() {
    this.state.chests.forEach((chest) => {
      if (chest.locked || chest.opened) return;
      this.state.players.forEach((p) => {
        if (chest.opened || p.status !== "playing" || tileDistance(p.x, p.y, chest.x, chest.y) > 1) return;
        chest.opened = true;
        const k = 1 + DEPTH_SCALING * (this.chestDepth.get(chest.id) ?? 0);
        const value = Math.round(rollRange(CHEST_LOOT) * k);
        p.loot += value;
        this.notice(chest.x, chest.y, `Baú: +${value} loot`, 0xf1c40f);
        // O baú guarda um item melhor que o do mini-boss.
        this.dropItem(rollItem("miniboss", this.chestDepth.get(chest.id) ?? 0, Math.random, 1), chest.x, chest.y);
      });
    });
  }

  // --- Itens ------------------------------------------------------------

  private dropItem(itemId: string, x: number, y: number) {
    const item = new GroundItem();
    item.id = `i${this.nextItemId++}`;
    item.itemId = itemId;
    item.x = x;
    item.y = y;
    this.state.items.set(item.id, item);
    this.itemExpiresAt.set(item.id, this.clock.currentTime + ITEM_LIFETIME_MS);
  }

  /**
   * Passar por cima de um item melhor que o equipado troca na hora; o antigo fica no chão
   * para quem quiser. Item pior fica onde está (qualquer jogador pode pegar, não há dono).
   */
  private pickUpItems() {
    this.state.players.forEach((p) => {
      if (p.status !== "playing") return;
      const here = [...this.state.items.values()]
        .filter((it) => it.x === p.x && it.y === p.y)
        .sort((a, b) => (ITEMS[b.itemId]?.tier ?? 0) - (ITEMS[a.itemId]?.tier ?? 0));
      for (const ground of here) {
        const def = ITEMS[ground.itemId];
        if (!def || !isUpgrade(def.id, p[def.slot])) continue;
        const old = p[def.slot];
        p[def.slot] = def.id;
        this.state.items.delete(ground.id);
        this.itemExpiresAt.delete(ground.id);
        if (old) this.dropItem(old, p.x, p.y);
        this.notice(p.x, p.y - 1, def.name, TIER_COLORS[def.tier]);
      }
    });
  }

  private expireItems(now: number) {
    this.itemExpiresAt.forEach((at, id) => {
      if (now < at) return;
      this.state.items.delete(id);
      this.itemExpiresAt.delete(id);
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
    // Quem morre larga o equipamento no chão, e os outros podem saquear.
    if (outcome === "died") {
      for (const id of equipment(player)) if (id) this.dropItem(id, player.x, player.y);
    }
    player.status = outcome;
    player.target = "";

    // Quem sai vivo leva o equipamento para o inventário da conta.
    const items = survived ? equipment(player).filter(Boolean) : [];
    const result: RunEndedMessage = { outcome, loot: player.loot, level: player.level, items };
    this.clients.getById(sessionId)?.send(MSG.runEnded, result);

    const userId = this.seats.get(sessionId)?.userId;
    if (userId) {
      void recordRun(this.matchId, { userId, classId: player.classId, outcome, level: player.level, loot: player.loot, items });
    }

    const everyoneOut = [...this.state.players.values()].every((p) => p.status !== "playing");
    if (everyoneOut) {
      this.state.phase = "ended";
      this.clock.setTimeout(() => this.disconnect(), 10_000);
    }
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
function rollDamage(base: number) {
  return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3)));
}

function rollRange([min, max]: [number, number]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
