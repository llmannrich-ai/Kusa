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
  ON_HIT_DOT_MS,
  ITEM_SLOTS,
  MAPS,
  MONSTERS,
  MAX_LEVEL,
  partySize,
  MAX_SUMMONS_PER_PLAYER,
  MOVE_HOLD_MS,
  MSG,
  PERKS,
  POTIONS,
  POTION_COOLDOWN_MS,
  POTION_FIELD,
  POTION_IDS,
  POTION_MAX,
  SPELLS,
  SPELL_SLOT_LEVELS,
  SUMMONS,
  Tile,
  attackCooldownMs,
  auraBonuses,
  bestPerSlot,
  caveDestination,
  centerOf,
  clampToRange,
  createRng,
  encounterAt,
  pickWeighted,
  CHAMPION_AFFIX_IDS,
  CHAMPION_CHANCE,
  MAX_ROOM_ARTILLERY,
  MAX_ROOM_LEADERS,
  MAX_ROOM_MONSTERS,
  type Encounter,
  generateDungeon,
  grantsPerk,
  damageReduction,
  flightMs,
  hasLineOfSight,
  blocksSight,
  isPerk,
  isPotion,
  isUpgrade,
  canUse,
  gearStats,
  itemColor,
  itemScore,
  isBagIndex,
  isItemSlot,
  pickupAction,
  isSingleTarget,
  activeTraits,
  TRAITS,
  lineTiles,
  coneTiles,
  isWalkable,
  activeSpells,
  knownSpells,
  levelForXp,
  lineEnd,
  mapIdOf,
  monsterStats,
  heroBonuses,
  isRune,
  mainBoss,
  RUNES,
  RUNE_DROPS,
  activeRunes,
  rollRune,
  runeSpells,
  spellManaCost,
  rankPower,
  rollItem,
  rollPerkOffer,
  rollPotion,
  spellAtRank,
  spellChoices,
  spellCooldownMs,
  spellBonuses,
  spellRanks,
  spellLevelFromXp,
  spellTalentId,
  spellXpAfterRun,
  spellXpOf,
  castXp,
  SPELL_LEVEL_XP,
  SPELL_XP_COMBAT_TILES,
  SPELL_XP_HUNT_CAP,
  TALENTS,
  type SpellProgress,
  type SpellXp,
  statsFor,
  summonStats,
  talentTree,
  tileAt,
  tileDistance,
  xpForLevel,
  xpShare,
  type AttackMessage,
  type AddBotMessage,
  type AttackingMessage,
  type RemoveBotMessage,
  type Bonuses,
  type CastMessage,
  type ChoosePerkMessage,
  type ChooseRuneMessage,
  type ChooseSpellMessage,
  type ClassId,
  type DamageMessage,
  type DrankMessage,
  type DrinkMessage,
  type BagDropMessage,
  type BagEquipMessage,
  type UnequipMessage,
  type Dungeon,
  type MapId,
  type TalentRanks,
  type MapDef,
  type MonsterDef,
  type MonsterKind,
  type MoveMessage,
  type NoticeMessage,
  type PerkBonuses,
  type PerkStacks,
  type Rect,
  type RunEndedMessage,
  type ScreenMessage,
  type RunOutcome,
  type SpellDef,
  type SpellMessage,
  type SpellId,
  type SpellSlot,
  type ChainMessage,
  type TraitDef,
  type CooldownMessage,
  type HeroEffect,
  type HeroEffectKind,
  CONTROL_EFFECTS,
  CONTROL_IMMUNE_MS,
  CONTROL_MAX_MS,
  CORRODE_MAX,
  CORRODE_PER_STACK,
  BLIND_RANGE,
  damageElement,
  immuneToDot,
  type DotKind,
  type SummonDef,
  type TargetMessage,
} from "@kusa/shared";
import { BotAi } from "./botAi.ts";
import { MonsterAi, rollDamage, type Brain, type Hit } from "./monsterAi.ts";
import { nextStep } from "./pathfinding.ts";
import { bump, newRunStats, type RunStats } from "./runStats.ts";
import { fromPlain, toPlain } from "./snapshot.ts";
import { Chest, DungeonState, Field, GroundItem, Monster, Player, Summon } from "./state.ts";

/** Quem deu o golpe e como, repassado ao cliente para desenhar o ataque. */

interface Seat {
  /** Momento (ms) em que o jogador pode dar o próximo passo. */
  nextMoveAt: number;
  /** Direção segurada (`MoveMessage.hold`) e até quando vale sem o cliente reenviar. */
  heading: { dx: -1 | 0 | 1; dy: -1 | 0 | 1; until: number } | null;
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
  /** Escudo da Fé (Maestria): ao quebrar, empurra os monstros colados estes tiles (0 = não). */
  barrierPush: number;
  /** Pele de Ferro: armadura extra e até quando. */
  armorBonus: number;
  armorUntil: number;
  /** Traços das especializações compradas no Grimório. */
  traits: TraitDef[];
  /** Bônus em si de uma magia (Postura do Atirador, Aljava Veloz) e até quando. */
  buff: {
    until: number; basicDamage: number; attackRange: number; moveSpeed: number; attackHaste: number;
    damageTaken: number; rooted: boolean; slowAttackers: { pct: number; ms: number } | null;
  } | null;
  /** Passo Leve: velocidade extra até este momento. */
  hasteUntil: number;
  /** Rolamento: o próximo ataque básico atordoa por este tempo (0 = não). */
  nextBasicStunMs: number;
  /** Solo Consagrado: armadura extra enquanto o herói está dentro do campo (renovada a cada pulso). */
  fieldArmor: number;
  fieldArmorUntil: number;
  /**
   * Forma animal do Druida até `until`: velocidade extra, salto da pantera (gasto no próximo básico), patada do urso e a
   * vida que o urso somou à máxima (sai quando a forma acaba).
   */
  form: { kind: "panther" | "bear"; until: number; moveSpeed: number; pounce: number; pounceStunMs: number; maul: boolean; hpBonus: number } | null;
  /** Semente do Renascer recebida: até quando vale, de quem, vida ao renascer e tempo de invulnerabilidade. */
  seed: { until: number; by: string; hp: number; invulnMs: number } | null;
  /** Druida: em quem está a semente que ele plantou (só uma de cada vez). */
  seedTarget: string | null;
  /** Renasceu da semente: não leva dano até este momento. */
  invulnUntil: number;
  /** Seiva Protetora: armadura extra de quem foi curado por um Guardião da Natureza, até quando. */
  sapArmor: number;
  sapUntil: number;
  /** Céu Carregado (Traço): magias conjuradas na hunt, para o raio a cada 4. */
  castCount: number;
  /** XP de uso das magias da conta ao entrar (quem grava o novo é o banco, no fim da hunt). */
  spellXp: SpellXp;
  /** Espinhos de Ferro: fração do golpe corpo a corpo devolvida, até quando. */
  thornsPct: number;
  thornsUntil: number;
  /** Último Bastião (Traço): o escudo volta a poder sair a partir deste momento. */
  lastStandReadyAt: number;
  /** Estandarte de Guerra: dano extra enquanto o herói está no campo (renovado a cada pulso). */
  fieldDamage: number;
  fieldDamageUntil: number;
  /** Áureas compradas na árvore da classe. */
  aura: Bonuses;
  /** Melhorias escolhidas ao subir de nível nesta hunt e o efeito somado delas. */
  perks: PerkStacks;
  perkBonus: PerkBonuses;
  /** Níveis com melhoria ainda na fila, além da oferecida agora (`Player.perksQueued` é o tamanho). */
  perkLevels: number[];
  /** Áureas + melhorias: o que `statsFor` usa para vida, mana, dano e velocidade. */
  bonus: Bonuses;
  /** Atributos somados dos itens vestidos (`gearStats`); recalculados a cada troca (`refreshGear`). */
  gear: ReturnType<typeof gearStats>;
  /** Até quando não repete o aviso de bag cheia. */
  bagFullNoticeUntil: number;
  /** Veneno ou queimadura de um monstro (`Player.dot`): dano por pulso, de quem veio, próximo pulso e fim. */
  dot: { damage: number; monsterId: string; kind: MonsterKind; nextAt: number; until: number } | null;
  /** Lentidão de um monstro (`Player.slowed`): fração da velocidade que sobra e até quando. */
  slow: { factor: number; until: number } | null;
  /**
   * Efeitos de monstro ativos (`Player.effects`): até quando, acúmulos (Corroído) e, engolido, quem engoliu, o dano
   * por segundo e o próximo pulso.
   */
  effects: Partial<Record<HeroEffectKind, { until: number; stacks: number; by?: string; perSec?: number; nextAt?: number }>>;
  /** Imunidade a cada controle depois que ele acaba (`CONTROL_IMMUNE_MS`). */
  effectImmuneUntil: Partial<Record<HeroEffectKind, number>>;
  /** Números da hunt para a telemetria. */
  stats: RunStats;
  /** Bosses cuja runa este personagem já levou (no banco e nesta hunt): cada boss dá a runa uma vez por personagem. */
  bossRunes: Set<string>;
  /** A tela do jogador está deitada (`MSG.screen`): o tempo assim soma em `stats.landscapeMs`. */
  landscape: boolean;
}

/** Dados da criatura invocada que só o servidor precisa. */
interface SummonBrain {
  def: SummonDef;
  /** Magia que invocou: conjurar de novo substitui as criaturas dela. */
  spellId: SpellId;
  damage: number;
  /** Cura por pulso, em fração da vida máxima de cada aliado. */
  heal: number;
  /** Mana por pulso, em fração da mana máxima de cada aliado. */
  mana: number;
  expiresAt: number;
  nextMoveAt: number;
  nextAttackAt: number;
  /** Id do monstro que está caçando. */
  targetId: string | null;
  /** Urso Ancestral (Maestria): ao morrer, cura a equipe por perto. */
  deathHeal: { pct: number; radius: number } | null;
  /** Grito da Fera: ataca `haste` (fração da recarga cortada) mais rápido até `hasteUntil`. */
  haste: number;
  hasteUntil: number;
}

/** Dados do campo no chão que só o servidor precisa. */
interface FieldBrain {
  /** A magia no nível de quem criou, sem o `field` (é o que a armadilha dispara). */
  spell: SpellDef;
  rank: number;
  kind: "zone" | "trap" | "turret" | "wall";
  /** Zona que prende os monstros dentro a cada pulso (Tentáculos Negros). */
  rootMs: number;
  /** Dano por pulso (zona), por tiro (estaca) ou do disparo (armadilha), já com o dano base de quem criou. */
  amount: number;
  allyArmor: number;
  /** Estandarte de Guerra: dano extra (fração) dos aliados dentro. */
  allyDamage: number;
  /** Chuva Revigorante: cura e mana por pulso nos aliados dentro, em fração do máximo de cada um. */
  allyHeal: number;
  allyMana: number;
  tickMs: number;
  nextTickAt: number;
  until: number;
  shotsLeft: number;
}

/** Regeneração por segundo, em fração do máximo. */
const HP_REGEN = 0.02;
const MANA_REGEN = 0.02;
/** Monstros não nascem tão perto do portal de entrada. */
const SAFE_RADIUS = 6;
/** Item no chão que ninguém pegou some depois deste tempo. */
const ITEM_LIFETIME_MS = 120_000;
/** Intervalo mínimo entre dois avisos de bag cheia para o mesmo jogador. */
const BAG_FULL_NOTICE_MS = 3000;
/** Nome da melhoria escolhida no nível: fica 30% mais que os outros avisos (900 ms) para dar tempo de ler. */
const PERK_NOTICE_MS = 1170;
/**
 * Onde a hunt roda: a sala do Colyseus (`DungeonRoom`) no servidor ou a hunt solo no navegador.
 * A simulação só fala com o mundo por aqui.
 */
export interface HuntHost {
  /** Relógio em ms (só cresce). */
  now(): number;
  setTimeout(fn: () => void, ms: number): void;
  send(sessionId: string, type: string, msg: unknown): void;
  broadcast(type: string, msg: unknown): void;
  /** O jogador saiu da hunt (morto, fugindo ou pelo portal do boss): avisar, gravar a conta e a telemetria. */
  runEnded(sessionId: string, result: RunEndedMessage, report: HuntReport): void;
  /** Todos saíram: a hunt acabou. */
  ended(): void;
}

/** Números da hunt de um jogador para a telemetria (o host completa com a partida e a conta). */
export interface HuntReport {
  name: string;
  classId: string;
  partySize: number;
  mapId: MapId;
  seed: number;
  outcome: RunOutcome;
  level: number;
  durationS: number;
  loot: number;
  pathRooms: number;
  stats: RunStats;
}

/** Quem entra na hunt. */
export interface Recruit {
  name: string;
  classId: ClassId;
  /** Árvore de magias comprada (todas as classes). */
  talents: TalentRanks;
  /** XP de uso de cada magia, que dá o nível dela (convidado: vazio). */
  spellXp: SpellXp;
  /** Magias ativadas no Grimório (ids de nó, todas as classes): até 3 por slot vão para a hunt (`activeSpells`). */
  activeSpells?: readonly string[];
}

export interface HuntOptions {
  mapId: MapId;
  seed: number;
  /** Só para testes: com 8, todo mundo começa no nível 8 (com os slots de magia abertos). */
  startLevel?: number;
  /** Só para testes: todo mundo com o Grimório inteiro da classe no nível máximo. */
  allSpells?: boolean;
  /** Só para testes: multiplica a vida dos monstros (efeitos como veneno e lentidão aparecem antes de eles morrerem). */
  monsterHp?: number;
  /** Só para testes: todo mundo começa a hunt com estas runas equipadas. */
  runes?: string[];
  /**
   * Só para testes: os sorteios da hunt (dano, chances, loot, recargas dos monstros). Com uma função de seed fixa
   * (ex.: `createRng(1).next`), a mesma hunt dá sempre o mesmo resultado. Sem isto, `Math.random`.
   */
  random?: () => number;
  /**
   * Continua uma hunt de outro aparelho (`Hunt.exportInternals`), com o `state` já restaurado: não sorteia
   * monstros de novo. Sala hospedada por um jogador, quando o anfitrião sai e outro assume.
   */
  restore?: unknown;
}

/**
 * Atraso (ms) do tick que ainda conta como andar sem parar: o passo seguinte conta da hora em que este podia sair.
 * Mais que isso o jogador estava parado, e o relógio do passo recomeça agora.
 */
const MOVE_SLACK_MS = 100;

/** Campos internos que vão no retrato da hunt (o resto se recalcula: mapa, dungeon). */
const INTERNALS = [
  "startLevel", "allSpells", "testRunes", "monsterHp", "seats", "elapsedMs", "regenMs", "brains", "chestDepth", "mimicDepth", "nextMonsterId",
  "nextItemId", "nextSummonId", "summonBrains", "fieldBrains", "nextFieldId", "itemExpiresAt", "pickupBlocked", "nextBotId",
] as const;

/**
 * Uma hunt: a equipe (1 a 4 jogadores) entra junta e cada um sai morto, fugindo ou após o boss.
 * Movimento, combate, XP e loot são calculados aqui; o `HuntHost` entrega as mensagens e o relógio.
 */
export class Hunt {
  private dungeon: Dungeon;
  private map: MapDef;
  private startLevel: number;
  private allSpells: boolean;
  private testRunes: string[];
  private monsterHp: number;
  /** Sorteios da hunt (`HuntOptions.random`); não vai no retrato: quem continua a hunt usa o seu. */
  private random: () => number;
  private seats = new Map<string, Seat>();
  private elapsedMs = 0;
  private regenMs = 0;
  private brains = new Map<string, Brain>();
  private chestDepth = new Map<string, number>();
  /** Mímicos (id → profundidade da sala): morto, o Mímico dá o loot do baú que fingia ser. */
  private mimicDepth = new Map<string, number>();
  private nextMonsterId = 1;
  private nextItemId = 1;
  private nextSummonId = 1;
  private summonBrains = new Map<string, SummonBrain>();
  private fieldBrains = new Map<string, FieldBrain>();
  private nextFieldId = 1;
  /** Momento (ms) em que cada item do chão some. */
  private itemExpiresAt = new Map<string, number>();
  /**
   * Item largado da bag → sessionId de quem largou: essa pessoa só pega de novo depois de sair do tile,
   * senão o item voltaria para a bag no tick seguinte.
   */
  private pickupBlocked = new Map<string, string>();
  /** IA dos monstros (`monsterAi.ts`), ligada aos métodos da hunt. */
  private ai: MonsterAi;
  /** Número do próximo bot posto na sala de espera (o id é `bot<n>`). */
  private nextBotId = 1;
  /** IA dos bots que completam a equipe (`botAi.ts`): manda as mesmas intenções de um jogador. */
  private bots: BotAi;

  constructor(readonly state: DungeonState, private host: HuntHost, options: HuntOptions) {
    this.map = MAPS[mapIdOf(options.mapId)];
    this.startLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(options.startLevel ?? 1) || 1));
    this.allSpells = options.allSpells ?? false;
    this.testRunes = options.runes ?? [];
    this.monsterHp = Math.max(1, options.monsterHp ?? 1);
    this.random = options.random ?? Math.random;
    this.state.mapId = this.map.id;
    this.state.seed = options.seed;
    this.dungeon = generateDungeon(this.state.seed, this.map.id);
    // Continuando a hunt de outro aparelho, o interno vem do retrato (antes da IA, que usa os `brains`).
    if (options.restore) {
      Object.assign(this, fromPlain(options.restore));
      // O portal do boss abre mudando o tile: a dungeon regenerada pela seed ainda não tem.
      if (this.state.bossDefeated) {
        const c = this.dungeon.bossPortal;
        this.dungeon.tiles[c.y * this.dungeon.width + c.x] = Tile.Portal;
      }
    }
    this.ai = new MonsterAi({
      state: this.state,
      dungeon: this.dungeon,
      brains: this.brains,
      now: () => this.host.now(),
      random: () => this.random(),
      after: (ms, fn) => this.after(ms, fn),
      broadcast: (type, msg) => this.host.broadcast(type, msg),
      notice: (x, y, text, color, ms) => this.notice(x, y, text, color, ms),
      damagePlayer: (id, raw, hit) => this.damagePlayer(id, raw, hit),
      damageSummon: (s, raw, hit) => this.damageSummon(s, raw, hit),
      affectHero: (id, effect, m, damage) => this.affectHero(id, effect, m, damage),
      dotHero: (id, kind, damage, ms, m) => this.dotHero(id, kind, damage, ms, m),
      slowHero: (id, factor, ms) => this.slowHero(id, factor, ms),
      releaseEngulf: (id) => this.releaseEngulf(id),
      occupiedTiles: () => this.occupiedTiles(),
      spawnMonster: (kind, x, y, depth) => this.addMonster(kind, x, y, depth),
    });
    this.bots = new BotAi({
      state: this.state,
      dungeon: this.dungeon,
      now: () => this.host.now(),
      occupiedTiles: () => this.occupiedTiles(),
      canStep: (id) => this.host.now() >= (this.seats.get(id)?.nextMoveAt ?? Infinity),
      spellReadyAt: (id, slot) => this.seats.get(id)?.spellReadyAt[slot] ?? Infinity,
      bringBeside: (id, toId) => this.bringBeside(id, toId),
      move: (id, msg) => this.move(id, msg),
      target: (id, msg) => this.target(id, msg),
      attacking: (id, msg) => this.attacking(id, msg),
      cast: (id, msg) => this.cast(id, msg),
      chooseSpell: (id, msg) => this.chooseSpell(id, msg),
      choosePerk: (id, msg) => this.choosePerk(id, msg),
    });
    if (!options.restore) this.spawnMonsters();
  }

  /**
   * Interno da hunt em JSON (com Map e Set marcados), para outro aparelho continuar com `HuntOptions.restore`.
   * Os tempos são do relógio do `HuntHost`: quem continua precisa seguir o mesmo relógio.
   */
  exportInternals() {
    return toPlain(Object.fromEntries(INTERNALS.map((key) => [key, this[key]])));
  }

  join(sessionId: string, recruit: Recruit) {
    const classId: ClassId = recruit.classId in CLASSES ? recruit.classId : "knight";
    const talents = this.allSpells
      ? Object.fromEntries(talentTree(classId).map((t) => [t.id, t.maxRank]))
      : recruit.talents;
    const spellXp: SpellXp = this.allSpells
      ? Object.fromEntries(talentTree(classId).filter((t) => t.spellId).map((t) => [t.id, SPELL_LEVEL_XP[SPELL_LEVEL_XP.length - 1]]))
      : recruit.spellXp;
    const bonus = auraBonuses(classId, talents);
    const stats = statsFor(classId, this.startLevel, bonus);

    const player = new Player();
    player.name = [...(recruit.name || "Aventureiro")].slice(0, MAX_LOGIN_LENGTH).join("");
    player.classId = classId;
    player.level = this.startLevel;
    player.xp = xpForLevel(this.startLevel);
    player.hp = player.maxHp = stats.maxHp;
    player.mana = player.maxMana = stats.maxMana;
    // Só as magias ativas no Grimório (até 3 por slot) aparecem na escolha; nos testes com o Grimório inteiro, todas.
    player.knownSpells.push(...(this.allSpells
      ? knownSpells(classId, talents)
      : activeSpells(classId, talents, spellXp, recruit.activeSpells ?? [])));
    for (const [spellId, rank] of Object.entries(spellRanks(classId, talents, spellXp))) player.spellRanks.set(spellId, rank);
    // Sinergias e Tomos: a força extra fica parada durante a hunt (o XP ganho só conta depois dela).
    for (const [spellId, bonus] of Object.entries(spellBonuses(classId, talents, spellXp))) player.spellBonus.set(spellId, bonus!);
    // A equipe nasce junta, ao redor do portal de fuga: cada um num canto livre (quem saiu da sala de espera libera o seu).
    const { x: px, y: py } = this.dungeon.portal;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => ({ x: px + dx, y: py + dy }));
    const taken = [...this.state.players.values()];
    const spot = corners.find((c) => !taken.some((o) => o.x === c.x && o.y === c.y)) ?? corners[0];
    player.x = spot.x;
    player.y = spot.y;

    this.state.players.set(sessionId, player);
    this.seats.set(sessionId, {
      nextMoveAt: 0, heading: null, nextAttackAt: 0, attacking: false, attackUntil: 0, targetLocked: false,
      spellReadyAt: [0, 0], potionReadyAt: 0, guard: 0, guardUntil: 0, barrierUntil: 0, barrierPush: 0, armorBonus: 0, armorUntil: 0,
      traits: activeTraits(classId, talents).map((id) => TRAITS[id]), buff: null, hasteUntil: 0, nextBasicStunMs: 0,
      fieldArmor: 0, fieldArmorUntil: 0, form: null, seed: null, seedTarget: null, invulnUntil: 0, sapArmor: 0, sapUntil: 0, castCount: 0, spellXp,
      thornsPct: 0, thornsUntil: 0, lastStandReadyAt: 0, fieldDamage: 0, fieldDamageUntil: 0,
      aura: bonus, perks: {}, perkBonus: heroBonuses({}), perkLevels: [], bonus, gear: gearStats([]), bagFullNoticeUntil: 0, dot: null, slow: null, effects: {}, effectImmuneUntil: {}, stats: newRunStats(), bossRunes: new Set(),
      landscape: false,
    });
    const joined = this.seats.get(sessionId)!;
    joined.stats.specs = joined.traits.map((t) => t.id);
    joined.stats.spellsActive = [...player.knownSpells];
    if (!this.state.leaderId) this.state.leaderId = sessionId;
  }

  leave(sessionId: string) {
    const player = this.state.players.get(sessionId);
    // Abandonar uma hunt em andamento conta como morte.
    if (player && this.state.phase === "running" && player.status === "playing") {
      const seat = this.seats.get(sessionId);
      if (seat) seat.stats.abandoned = true;
      this.endRun(sessionId, "died");
    }
    if (this.state.phase === "lobby") {
      this.state.players.delete(sessionId);
      this.seats.delete(sessionId);
      // A liderança passa para outro humano; sem nenhum, os bots saem junto.
      const humans = [...this.state.players].filter(([, p]) => !p.bot).map(([id]) => id);
      if (humans.length === 0) {
        for (const id of [...this.state.players.keys()]) {
          this.state.players.delete(id);
          this.seats.delete(id);
        }
      }
      if (this.state.leaderId === sessionId) this.state.leaderId = humans[0] ?? "";
    }
  }

  /** O líder põe um bot da classe numa vaga livre da sala de espera. Devolve o id do bot (null se não puder). */
  addBot(sessionId: string, msg: AddBotMessage): string | null {
    if (sessionId !== this.state.leaderId || this.state.phase !== "lobby") return null;
    if (this.state.players.size >= this.partySize() || typeof msg?.classId !== "string" || !(msg.classId in CLASSES)) return null;
    const id = `bot${this.nextBotId++}`;
    // Bot entra como um convidado: sem Grimório comprado nem equipamento.
    this.join(id, { name: `Bot ${CLASSES[msg.classId].name}`, classId: msg.classId, talents: {}, spellXp: {} });
    this.state.players.get(id)!.bot = true;
    return id;
  }

  /** O líder tira um bot da sala de espera. */
  removeBot(sessionId: string, msg: RemoveBotMessage): boolean {
    if (sessionId !== this.state.leaderId || this.state.phase !== "lobby") return false;
    if (!this.state.players.get(msg?.id)?.bot) return false;
    this.leave(msg.id);
    return true;
  }

  /** Jogadores na hunt no máximo, bots incluídos (depende do mapa). */
  partySize() {
    return partySize(this.map);
  }

  /** Quantos bots estão na equipe. */
  botCount() {
    return [...this.state.players.values()].filter((p) => p.bot).length;
  }

  /**
   * Teto do loot desta dungeon: todos os monstros no loot máximo, todos os baús e o bônus do boss.
   * Os limites da hunt solo (SOLO_LIMITS) são conferidos contra isto.
   */
  maxLoot() {
    let total = 0;
    this.brains.forEach((b) => { total += b.loot[1]; });
    this.chestDepth.forEach((depth) => { total += Math.round(CHEST_LOOT[1] * (1 + DEPTH_SCALING * depth) * (this.map.lootScale ?? 1)); });
    this.mimicDepth.forEach((depth) => { total += Math.round(CHEST_LOOT[1] * (1 + DEPTH_SCALING * depth) * (this.map.lootScale ?? 1)); });
    return Math.round(total * (1 + BOSS_LOOT_BONUS));
  }

  // --- Spawn ------------------------------------------------------------

  /**
   * Popula o mapa: encontros sorteados nas salas do caminho (e nas campinas), mini-boss + baú (ou o Mímico) nas
   * laterais e o boss no centro. Tudo pelo RNG da seed; alguns comuns nascem Campeões.
   */
  private spawnMonsters() {
    const d = this.dungeon;
    // Mapa ainda em construção (só o cenário): ninguém nasce.
    if (this.map.bosses.length === 0) return;
    // RNG próprio derivado da seed, separado do gerador do mapa.
    const rng = createRng(this.state.seed ^ 0x9e3779b9);
    const roll = () => rng.int(0, 1_000_000);

    // Mapa só com o boss (o deserto, por enquanto): sem encontros nas zonas nem nas campinas.
    const encounters = this.map.encounters.length > 0;
    d.path.forEach((room, depth) => {
      if (!encounters) return;
      for (const kind of this.rollEncounter(encounterAt(this.map, depth), rng.next)) {
        const spot = this.freeSpotIn(room, roll);
        if (spot) this.spawnCommon(kind, spot.x, spot.y, depth, rng.next);
      }
    });

    // Campinas: monstros da tabela da sala do caminho mais próxima (2, ou `meadowMonsters`) e, em parte delas
    // (`meadowMinibosses`), um mini-boss solto, sem baú.
    d.meadows.forEach((room) => {
      if (!encounters) return;
      const depth = this.nearestPathDepth(room);
      const table = encounterAt(this.map, depth).table.filter(([kind]) => !MONSTERS[kind].group);
      for (let i = 0; i < (this.map.meadowMonsters ?? 2); i++) {
        const spot = this.freeSpotIn(room, roll);
        if (spot) this.spawnCommon(pickWeighted(table, rng.next()), spot.x, spot.y, depth, rng.next);
      }
      if (rng.next() < (this.map.meadowMinibosses ?? 0)) {
        const spot = this.freeSpotIn(room, roll);
        if (spot) this.addMonster(pickWeighted(this.map.minibosses, rng.next()), spot.x, spot.y, depth);
      }
    });

    d.side.forEach((room, i) => {
      const depth = this.nearestPathDepth(room);
      // Mímico: a sala não tem baú; ele fica onde o baú estaria e guarda o loot dele.
      if (rng.next() < this.map.mimicChance) {
        const mimic = this.addMonster("mimic", room.x + 1, room.y + 1, depth);
        this.mimicDepth.set(mimic.id, depth);
        return;
      }
      const c = centerOf(room);
      const boss = this.addMonster(pickWeighted(this.map.minibosses, rng.next()), c.x, c.y, depth);
      const chest = new Chest();
      chest.id = `c${i + 1}`;
      chest.x = room.x + 1;
      chest.y = room.y + 1;
      this.state.chests.set(chest.id, chest);
      this.chestDepth.set(chest.id, depth);
      this.brains.get(boss.id)!.chestId = chest.id;
    });

    const c = centerOf(d.boss);
    this.addMonster(pickWeighted(this.map.bosses, rng.next()), c.x, c.y, d.path.length);

    // Baús de runa da caverna: trancados até o boss morrer; cada jogador leva a runa de um.
    (this.map.rewardRunes ?? []).forEach((rune, i) => {
      const at = d.cave?.chests[i];
      if (!at) return;
      const chest = new Chest();
      chest.id = `r${i + 1}`;
      chest.x = at.x;
      chest.y = at.y;
      chest.rune = rune;
      this.state.chests.set(chest.id, chest);
    });
  }

  /**
   * Monstros de uma sala: sorteia da tabela pelo peso até gastar o orçamento (XP da tabela). Enxames vêm em grupo;
   * no máximo `MAX_ROOM_ARTILLERY` artilheiros, `MAX_ROOM_LEADERS` líder e `MAX_ROOM_MONSTERS` monstros.
   */
  private rollEncounter(encounter: Encounter, next: () => number): MonsterKind[] {
    const kinds: MonsterKind[] = [];
    let left = encounter.budget;
    const count = (role: string) => kinds.filter((k) => MONSTERS[k].role === role).length;
    for (let attempt = 0; attempt < 30 && left > 0 && kinds.length < MAX_ROOM_MONSTERS; attempt++) {
      const options = encounter.table.filter(([kind]) => {
        const def = MONSTERS[kind];
        if (def.xp > left && kinds.length > 0) return false;
        if (def.role === "artillery" && count("artillery") >= MAX_ROOM_ARTILLERY) return false;
        return !(def.role === "leader" && count("leader") >= MAX_ROOM_LEADERS);
      });
      if (options.length === 0) break;
      const kind = pickWeighted(options, next());
      const group = MONSTERS[kind].group;
      const size = group ? group[0] + Math.floor(next() * (group[1] - group[0] + 1)) : 1;
      for (let i = 0; i < size && kinds.length < MAX_ROOM_MONSTERS; i++) {
        kinds.push(kind);
        left -= MONSTERS[kind].xp;
      }
    }
    return kinds;
  }

  /** Monstro comum dos encontros: às vezes nasce Campeão (vida, XP e loot maiores e um afixo). */
  private spawnCommon(kind: MonsterKind, x: number, y: number, depth: number, next: () => number) {
    const m = this.addMonster(kind, x, y, depth);
    if (next() < CHAMPION_CHANCE) this.ai.makeChampion(m, this.brains.get(m.id)!, CHAMPION_AFFIX_IDS[Math.floor(next() * CHAMPION_AFFIX_IDS.length)]);
    return m;
  }

  private addMonster(kind: MonsterKind, x: number, y: number, depth: number) {
    const def = MONSTERS[kind];
    const stats = monsterStats(kind, depth);
    // Mapa que paga menos loot por monstro (muitos monstros): o boss fica de fora.
    if (def.rank !== "boss") stats.loot = this.scaleLoot(stats.loot[0], stats.loot[1]);
    const m = new Monster();
    m.id = `m${this.nextMonsterId++}`;
    m.kind = kind;
    m.x = x;
    m.y = y;
    m.hp = m.maxHp = Math.round(stats.maxHp * this.monsterHp);
    this.state.monsters.set(m.id, m);
    const brain = this.ai.newBrain(def, depth, stats);
    this.brains.set(m.id, brain);
    this.ai.spawned(m, brain);
    return m;
  }

  private freeSpotIn(room: Rect, roll: () => number) {
    const portal = this.dungeon.portal;
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = room.x + (roll() % room.w);
      const y = room.y + (roll() % room.h);
      if (!isWalkable(this.dungeon, x, y) || this.specialTile(x, y)) continue;
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

  /** O líder começa a hunt. Devolve false se não puder (não é o líder ou já começou). */
  start(sessionId: string) {
    if (sessionId !== this.state.leaderId || this.state.phase !== "lobby") return false;
    this.state.phase = "running";
    this.state.timeLeft = this.map.durationSeconds;
    this.state.players.forEach((p, id) => this.trackDepth(id, p));
    const bots = this.botCount();
    this.seats.forEach((seat) => { seat.stats.bots = bots; });
    if (this.testRunes.length > 0) {
      this.state.players.forEach((p, id) => this.equipRunes(p, this.seats.get(id)!, this.testRunes));
    }
    return true;
  }

  /** O equipamento escolhido no menu entra na dungeon (chega logo depois do início). */
  equip(sessionId: string, items: string[]): boolean {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return false;
    seat.stats.items.loadout = items;
    // As runas equipadas no menu entram com o herói; o resto é equipamento.
    this.equipRunes(p, seat, items.filter(isRune));
    items = items.filter((id) => !isRune(id));
    const classId = p.classId as ClassId;
    const best = bestPerSlot(items, classId);
    const rest = [...items];
    for (const slot of ITEM_SLOTS) {
      if (!isUpgrade(best[slot], p[slot], classId)) continue;
      rest.splice(rest.indexOf(best[slot]), 1);
      // Já pegou algo no chão nesse slot antes do loadout chegar: o pior vai para a bag.
      if (p[slot]) rest.push(p[slot]);
      p[slot] = best[slot];
    }
    // O que não foi vestido vai para a bag (pode passar de BAG_SIZE, raro): nada se perde.
    p.bag.push(...rest);
    this.refreshGear(sessionId);
    return true;
  }

  /** A bag da conta entra na dungeon com o jogador. */
  fillBag(sessionId: string, items: string[]): boolean {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return false;
    seat.stats.items.bag = items;
    // Pode passar de BAG_SIZE se o equipamento não coube no slot ao voltar (raro): nada se perde.
    p.bag.push(...items);
    return true;
  }

  move(sessionId: string, msg: MoveMessage) {
    const player = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!player || !seat || player.status !== "playing" || this.state.phase === "ended") return;

    const dx = Math.sign(msg?.dx ?? 0) as -1 | 0 | 1;
    const dy = Math.sign(msg?.dy ?? 0) as -1 | 0 | 1;
    const now = this.host.now();
    // Direção segurada: o tick continua andando nela, sem depender de quando as mensagens chegam.
    if (msg?.hold === true) seat.heading = dx || dy ? { dx, dy, until: now + MOVE_HOLD_MS } : null;
    if (dx === 0 && dy === 0) return;
    this.step(sessionId, player, seat, dx, dy, now);
  }

  /** Anda na direção segurada de cada jogador, assim que a velocidade deixar. */
  private walkHeld(now: number) {
    this.state.players.forEach((player, sessionId) => {
      const seat = this.seats.get(sessionId);
      if (!seat?.heading) return;
      if (player.status !== "playing" || now >= seat.heading.until) seat.heading = null;
      else this.step(sessionId, player, seat, seat.heading.dx, seat.heading.dy, now);
    });
  }

  /**
   * Para onde o passo vai: a direção pedida ou, na diagonal bloqueada (parede, quina ou monstro), o eixo livre.
   * Com o joystick, o polegar um pouco torto num corredor vira diagonal: o herói desliza na parede em vez de parar.
   */
  private walkDir(player: Player, dx: number, dy: number) {
    const open = (sx: number, sy: number) => {
      const nx = player.x + sx;
      const ny = player.y + sy;
      if (!isWalkable(this.dungeon, nx, ny) || this.monsterAt(nx, ny) || this.wallAt(nx, ny)) return false;
      // Bot não sai da dungeon nem atravessa a caverna sozinho: sai junto com os humanos.
      if (player.bot && this.specialTile(nx, ny)) return false;
      // Na diagonal, não atravessa quina de parede.
      return sx === 0 || sy === 0 || (isWalkable(this.dungeon, nx, player.y) && isWalkable(this.dungeon, player.x, ny));
    };
    if (open(dx, dy)) return { dx, dy };
    if (dx === 0 || dy === 0) return null;
    if (open(dx, 0)) return { dx, dy: 0 };
    if (open(0, dy)) return { dx: 0, dy };
    return null;
  }

  private step(sessionId: string, player: Player, seat: Seat, dx: number, dy: number, now: number) {
    // Velocidade de movimento controlada pelo servidor: um passo a cada 1/speed segundos.
    if (now < seat.nextMoveAt) return;
    // Fortaleza Viva: pés fincados no chão.
    if (seat.buff?.rooted && now < seat.buff.until) return;
    // Preso, atordoado ou engolido por um monstro.
    if (this.held(seat, "root", "stun", "engulf")) return;

    const dir = this.walkDir(player, dx, dy);
    if (!dir) return;
    ({ dx, dy } = dir);
    const nx = player.x + dx;
    const ny = player.y + dy;

    const stepMs = 1000 / this.moveSpeed(player, seat, now);
    // Andando sem parar, o próximo passo conta da hora em que este podia sair, não de quando o tick chegou:
    // o atraso do tick não se acumula e a velocidade real fica igual à da ficha.
    const from = now - seat.nextMoveAt <= MOVE_SLACK_MS ? seat.nextMoveAt : now;
    seat.nextMoveAt = from + stepMs * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
    player.stepMs = Math.round(stepMs);
    player.x = nx;
    player.y = ny;
    if (this.state.phase === "running") this.trackDepth(sessionId, player);

    if (tileAt(this.dungeon, nx, ny) === Tile.Cave) this.throughCave(sessionId, player);
    if (this.state.phase === "running" && tileAt(this.dungeon, nx, ny) === Tile.Portal) {
      const bossPortal = this.dungeon.bossPortal;
      if (nx === bossPortal.x && ny === bossPortal.y) {
        // Concluir a dungeon dá um bônus sobre o loot carregado.
        const bonus = Math.round(player.loot * BOSS_LOOT_BONUS);
        player.loot += bonus;
        seat.stats.loot.bossBonus = bonus;
        this.endRun(sessionId, "completed");
      } else {
        this.endRun(sessionId, "escaped");
      }
    }
  }

  target(sessionId: string, msg: TargetMessage) {
    const player = this.state.players.get(sessionId);
    if (!player || player.status !== "playing") return;
    const id = typeof msg?.id === "string" ? msg.id : "";
    player.target = this.state.monsters.has(id) && !this.state.monsters.get(id)!.hidden ? id : "";
    const seat = this.seats.get(sessionId);
    if (seat) seat.targetLocked = player.target !== "";
  }

  /** Só telemetria: quanto da hunt cada jogador passou com a tela deitada. */
  screen(sessionId: string, msg: ScreenMessage) {
    const seat = this.seats.get(sessionId);
    if (seat) seat.landscape = msg?.landscape === true;
  }

  attacking(sessionId: string, msg: AttackingMessage) {
    const seat = this.seats.get(sessionId);
    if (!seat) return;
    seat.attacking = msg?.on === true;
    // O toque vale por uma recarga inteira: se o golpe anterior ainda recarrega, sai assim que puder.
    if (seat.attacking) seat.attackUntil = this.host.now() + attackCooldownMs(seat.perkBonus);
  }

  tick(dt: number) {
    if (this.state.phase === "ended") return;
    this.walkHeld(this.host.now());
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

    const now = this.host.now();
    this.regen(dt);
    this.tallyScreen(dt);
    this.expireEffects(now);
    this.bots.think(now);
    this.state.players.forEach((p, sessionId) => this.playerAttack(sessionId, p, now));
    for (const m of [...this.state.monsters.values()]) this.ai.think(m, now);
    this.state.summons.forEach((s) => this.summonThink(s, now));
    this.tickFields(now);
    this.openChests();
    this.pickUpItems();
    this.expireItems(now);
  }

  // --- Combate -----------------------------------------------------------

  private tallyScreen(dt: number) {
    this.state.players.forEach((p, sessionId) => {
      const seat = this.seats.get(sessionId);
      if (seat?.landscape && p.status === "playing") seat.stats.landscapeMs += dt;
    });
  }

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
    // Alcance: o da classe, mais o Olho de Águia (Traço) e a Postura do Atirador (bônus em si).
    const buff = seat.buff && now < seat.buff.until ? seat.buff : null;
    const form = seat.form && now < seat.form.until ? seat.form : null;
    // Na Forma de Urso, o básico é uma patada: só alcança quem está colado.
    const reach = form?.maul ? 1 : cls.attackRange + seat.traits.reduce((sum, t) => sum + (t.basicRange ?? 0), 0) + (buff?.attackRange ?? 0)
      + (cls.attackRange > 1 ? seat.gear.range : 0);
    // Cego: não mira nada além de perto.
    const range = this.held(seat, "blind") ? Math.min(reach, BLIND_RANGE) : reach;
    // Atordoado ou engolido: não ataca.
    if (this.held(seat, "stun", "engulf")) return;
    // Alvo escondido (camuflado, invisível, voando) não pode ser atacado.
    if (p.target && this.state.monsters.get(p.target)?.hidden) p.target = "";
    // Alvo escolhido sozinho não fica preso: se saiu do alcance, troca pelo mais próximo que está no alcance.
    if (!seat.targetLocked && p.target && !this.canHit(p, this.state.monsters.get(p.target)!, range)) p.target = "";
    if (!p.target) p.target = this.nearestMonsterInRange(p, range) ?? "";
    if (!p.target) return;

    if (!seat.attacking && now >= seat.attackUntil) return;
    if (now < seat.nextAttackAt) return;

    // Alvo travado fora do alcance (ou atrás de parede) não trava o botão: o golpe vai no mais próximo ao alcance
    // e o alvo continua travado para quando voltar ao alcance.
    let m = this.state.monsters.get(p.target)!;
    if (!this.canHit(p, m, range)) {
      const near = this.nearestMonsterInRange(p, range);
      if (!near) return;
      m = this.state.monsters.get(near)!;
      seat.stats.basicRetargets++;
    }

    // Arma e botas mudam o ritmo (machado e besta são mais lentos; varinha e itens mágicos, mais rápidos).
    seat.nextAttackAt = now + Math.round(attackCooldownMs(seat.perkBonus) * Math.max(0.4, 1 - (buff?.attackHaste ?? 0) - seat.gear.haste));
    seat.attackUntil = 0;
    if (form?.maul) return this.maul(sessionId, p, m);
    if (form && form.pounce > 0) return this.pounce(sessionId, p, seat, m, form, now);
    // Flecha e luzes voam até o alvo: o dano entra quando chegam (se o monstro ainda estiver vivo).
    const ms = flightMs(BASIC_ATTACKS[cls.id].projectileSpeed, p.x, p.y, m.x, m.y);
    this.host.broadcast(MSG.attack, { from: sessionId, x: p.x, y: p.y, tx: m.x, ty: m.y, ms } satisfies AttackMessage);
    // Flechas Consagradas (Traço): mais dano em morto-vivo e uma queimadura curta no alvo.
    const holy = seat.traits.find((t) => t.holyBasic)?.holyBasic;
    const undead = holy && MONSTERS[m.kind as MonsterKind]?.undead ? 1 + holy.undead : 1;
    const amount = rollDamage(this.random, this.baseDamage(sessionId, p, "basic") * (1 + (buff?.basicDamage ?? 0)) * this.farBonus(seat, p, m) * undead);
    // Rolamento: a próxima flecha atordoa (gasta no disparo, mesmo que o monstro morra antes).
    const stunMs = seat.nextBasicStunMs;
    seat.nextBasicStunMs = 0;
    // O cliente já desenhou o golpe pelo `MSG.attack`: o dano chega sem projétil de novo.
    const hit: Hit = { attacker: sessionId, fromX: p.x, fromY: p.y, fx: cls.attackFx };
    this.after(ms, () => {
      const alive = this.state.monsters.get(m.id);
      if (!alive) return;
      const brain = this.brains.get(alive.id);
      if (stunMs > 0 && brain) {
        brain.stunnedUntil = Math.max(brain.stunnedUntil, this.host.now() + stunMs);
        alive.stunned = true;
        seat.stats.ccMs.stun += stunMs;
      }
      if (holy && brain) this.applyDot(alive, brain, sessionId, "basic", this.baseDamage(sessionId, p, "basic") * holy.perSec, holy.ms, "burn", this.host.now());
      // Armas mágicas: chamas ou veneno no alvo.
      const g = seat.gear;
      if (brain && (g.burn > 0 || g.poison > 0)) {
        const kind = g.burn >= g.poison ? "burn" : "poison";
        this.applyDot(alive, brain, sessionId, `item:${kind}`, this.baseDamage(sessionId, p, "basic") * Math.max(g.burn, g.poison), ON_HIT_DOT_MS, kind, this.host.now());
      }
      const dealt = this.damageMonster(alive, amount, hit, "basic");
      // Roubo de vida dos itens (Espada do Juramento...): sem aviso a cada golpe, como a Sede de sangue.
      const hero = this.state.players.get(sessionId);
      if (g.lifesteal > 0 && dealt > 0 && hero?.status === "playing") {
        const healed = Math.min(hero.maxHp - hero.hp, Math.round(dealt * g.lifesteal));
        if (healed > 0) {
          hero.hp += healed;
          seat.stats.healing += healed;
        }
      }
    });
  }

  /** Forma de Urso: o básico vira uma patada em todos os monstros colados no druida, que passam a persegui-lo. */
  private maul(sessionId: string, p: Player, target: Monster) {
    this.host.broadcast(MSG.spell, { from: sessionId, spellId: "bear_form", x: p.x, y: p.y, tx: target.x, ty: target.y, ms: 0, echo: true } satisfies SpellMessage);
    const hit: Hit = { attacker: sessionId, fromX: p.x, fromY: p.y, fx: "smash" };
    const base = this.baseDamage(sessionId, p, "basic");
    for (const m of [...this.state.monsters.values()]) {
      if (!this.canHit(p, m, 1)) continue;
      const brain = this.brains.get(m.id);
      if (brain) brain.targetId = sessionId;
      this.damageMonster(m, rollDamage(this.random, base), hit, "bear_form");
    }
  }

  /**
   * Forma de Pantera: o próximo básico salta no alvo (o druida pousa colado nele, se houver lugar) com um golpe forte,
   * que atordoa com a Maestria. O salto se gasta nesse golpe.
   */
  private pounce(sessionId: string, p: Player, seat: Seat, m: Monster, form: NonNullable<Seat["form"]>, now: number) {
    const power = form.pounce;
    form.pounce = 0;
    const from = { x: p.x, y: p.y };
    const spot = this.besideMonster(p, m);
    if (spot) {
      p.x = spot.x;
      p.y = spot.y;
      seat.nextMoveAt = Math.max(seat.nextMoveAt, now + 200);
      this.trackDepth(sessionId, p);
    }
    this.host.broadcast(MSG.spell, { from: sessionId, spellId: "panther_form", x: from.x, y: from.y, tx: m.x, ty: m.y, ms: 0, echo: true } satisfies SpellMessage);
    const brain = this.brains.get(m.id);
    if (form.pounceStunMs > 0 && brain) {
      brain.stunnedUntil = Math.max(brain.stunnedUntil, now + form.pounceStunMs);
      m.stunned = true;
      seat.stats.ccMs.stun += form.pounceStunMs;
    }
    const hit: Hit = { attacker: sessionId, fromX: p.x, fromY: p.y, fx: "bite" };
    this.damageMonster(m, rollDamage(this.random, this.baseDamage(sessionId, p, "basic") * power), hit, "panther_form");
  }

  /** Tile livre colado no monstro e mais perto do herói, à vista dele (null se o herói já está colado ou não há lugar). */
  private besideMonster(p: Player, m: Monster) {
    if (tileDistance(p.x, p.y, m.x, m.y) <= 1) return null;
    const blocked = this.occupiedTiles();
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = m.x + dx;
        const y = m.y + dy;
        if ((dx === 0 && dy === 0) || !isWalkable(this.dungeon, x, y) || this.specialTile(x, y)) continue;
        if (blocked.has(y * this.dungeon.width + x) || !hasLineOfSight(this.dungeon, p.x, p.y, x, y)) continue;
        const dist = Math.hypot(x - p.x, y - p.y);
        if (dist < bestDist) {
          best = { x, y };
          bestDist = dist;
        }
      }
    }
    return best;
  }

  /** Bot longe ou preso: reaparece num tile livre a até 2 do herói `toId` (fica onde está se não houver lugar). */
  private bringBeside(botId: string, toId: string) {
    const bot = this.state.players.get(botId);
    const to = this.state.players.get(toId);
    if (!bot || !to || bot.status !== "playing") return;
    const blocked = this.occupiedTiles();
    for (let r = 1; r <= 2; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = to.x + dx;
          const y = to.y + dy;
          if (!isWalkable(this.dungeon, x, y) || this.specialTile(x, y) || blocked.has(y * this.dungeon.width + x)) continue;
          if (!hasLineOfSight(this.dungeon, to.x, to.y, x, y)) continue;
          bot.x = x;
          bot.y = y;
          bot.stepMs = 0;
          this.trackDepth(botId, bot);
          return;
        }
      }
    }
  }

  /** Roda `fn` depois de `ms` (na hora se 0), só enquanto a hunt estiver rolando. */
  private after(ms: number, fn: () => void) {
    if (ms <= 0) return fn();
    this.host.setTimeout(() => { if (this.state.phase === "running") fn(); }, ms);
  }

  // --- Magias -------------------------------------------------------------

  /** Escolha da magia de um slot recém-liberado. Uma vez escolhida, fica até o fim da hunt. */
  chooseSpell(sessionId: string, msg: ChooseSpellMessage) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing") return;
    const slot = msg?.slot;
    if (slot !== 0 && slot !== 1) return;
    if (p.level < SPELL_SLOT_LEVELS[slot] || spellIn(p, slot)) return;
    const spell = spellChoices(p.classId as ClassId, slot, [...p.knownSpells], runeSpells([...p.runes])).find((s) => s.id === msg.spellId);
    if (!spell) return;
    if (slot === 0) p.spell1 = spell.id; else p.spell2 = spell.id;
    const seat = this.seats.get(sessionId);
    if (seat) {
      seat.stats.spellsChosen[slot + 1] = {
        id: spell.id, rank: p.spellRanks.get(spell.id) ?? 0, bonus: p.spellBonus.get(spell.id) ?? 0, at: this.seconds(),
      };
    }
    this.notice(p.x, p.y - 1, spell.name, 0x9b59b6);
  }

  cast(sessionId: string, msg: CastMessage) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing" || this.state.phase !== "running") return;
    const slot = msg?.slot;
    if (slot !== 0 && slot !== 1) return;
    const base = SPELLS[spellIn(p, slot) as SpellId];
    if (!base) return;
    // O nível de uso, as sinergias e o Tomo do ramo deixam a magia mais forte.
    let spell = spellAtRank(base, p.spellRanks.get(base.id) ?? 0, p.spellBonus.get(base.id) ?? 0);

    const now = this.host.now();
    if (now < seat.spellReadyAt[slot]) return;
    // Atordoado ou engolido: não conjura. Cego: magia com alvo só alcança perto.
    if (this.held(seat, "stun", "engulf")) return;
    if (this.held(seat, "blind") && spell.aim === "target") spell = { ...spell, range: Math.min(spell.range, BLIND_RANGE) };
    // Magia de runa de outra classe custa no máximo uma parte da mana máxima.
    const manaCost = spellManaCost(spell, p.classId, p.maxMana);
    if (p.mana < manaCost) {
      seat.stats.castFails.noMana++;
      this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text: "Sem mana", color: 0x5dade2 } satisfies NoticeMessage);
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
      // Monstro escondido (camuflado, invisível, voando) não pode ser mirado.
      if (snapped && !snapped.hidden && this.canHit(p, snapped, spell.range) && tileDistance(snapped.x, snapped.y, aim.x, aim.y) <= AIM_SNAP_TILES + 1) {
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
        this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text: "Nenhum alvo ao alcance", color: 0xbdc3c7 } satisfies NoticeMessage);
        return;
      }
      tx = target.x;
      ty = target.y;
    }

    // Mira em aliado (Escudo da Luz): o aliado mais perto do ponto mirado; no toque rápido, o mais ferido ao alcance.
    let ally: string | undefined;
    if (spell.aim === "ally") {
      ally = this.allyTarget(sessionId, p, spell.range, aim);
      const chosen = ally && this.state.players.get(ally);
      if (!chosen) {
        seat.stats.castFails.noTarget++;
        this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text: "Nenhum aliado ali", color: 0xbdc3c7 } satisfies NoticeMessage);
        return;
      }
      tx = chosen.x;
      ty = chosen.y;
    }

    // Linha: vai até o alcance inteiro na direção mirada (ou do alvo, no toque rápido), parando na parede.
    const ox = p.x;
    const oy = p.y;
    let line: { x: number; y: number }[] | undefined;
    // Cone: o leque fica fixo na direção mirada na hora do tiro.
    if (spell.shape === "cone") line = coneTiles(this.dungeon, ox, oy, tx, ty, spell.range);
    if (spell.shape === "line") {
      line = lineTiles(this.dungeon, ox, oy, tx, ty, spell.range);
      const end = line[line.length - 1] ?? { x: ox, y: oy };
      tx = end.x;
      ty = end.y;
      // O alvo do toque rápido continua valendo: a flecha o segue mesmo se ele sair da reta durante o voo.
    }

    // Rolamento: o herói salta na hora, antes do resto do efeito. Toque rápido foge do alvo; mirado, vai para o ponto.
    if (spell.dash) {
      const threat = !aim ? target : undefined;
      const toX = threat ? 2 * p.x - threat.x : tx;
      const toY = threat ? 2 * p.y - threat.y : ty;
      const landing = spell.dash.teleport
        ? this.teleportLanding(p, toX, toY, spell.dash.tiles, threat)
        : this.dashLanding(p, toX, toY, spell.dash.tiles, threat);
      if (!landing) {
        // Encurralado: nenhuma direção livre. A magia não sai, e não gasta mana nem recarga.
        seat.stats.castFails.noRoom++;
        this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text: "Sem espaço para rolar", color: 0xbdc3c7 } satisfies NoticeMessage);
        return;
      }
      p.x = landing.x;
      p.y = landing.y;
      seat.nextMoveAt = Math.max(seat.nextMoveAt, now + 150);
      this.trackDepth(sessionId, p);
      tx = p.x;
      ty = p.y;
      target = undefined;
    }
    // Investida: corre até ficar colado no alvo antes do golpe (sem alvo ou sem lugar, não sai nem gasta mana).
    if (spell.charge) {
      if (!target) target = this.nearestMonsterTo(tx, ty, AIM_SNAP_TILES);
      if (!target || !this.canHit(p, target, spell.range)) {
        seat.stats.castFails.noTarget++;
        this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text: "Nenhum alvo ao alcance", color: 0xbdc3c7 } satisfies NoticeMessage);
        return;
      }
      if (tileDistance(p.x, p.y, target.x, target.y) > 1) {
        const spot = this.besideMonster(p, target);
        if (!spot) {
          seat.stats.castFails.noRoom++;
          this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text: "Sem espaço para a investida", color: 0xbdc3c7 } satisfies NoticeMessage);
          return;
        }
        p.x = spot.x;
        p.y = spot.y;
        seat.nextMoveAt = Math.max(seat.nextMoveAt, now + 200);
        this.trackDepth(sessionId, p);
      }
      tx = target.x;
      ty = target.y;
    }
    if (spell.nextBasicStunMs) seat.nextBasicStunMs = spell.nextBasicStunMs;
    // Passo Leve (Traço): toda magia dá um pouco de velocidade.
    for (const t of seat.traits) if (t.castHaste) seat.hasteUntil = now + t.castHaste.ms;

    p.mana -= manaCost;
    bump(seat.stats.casts, spell.id);
    // Nível pelo uso: só conta em combate (algum monstro à vista por perto), para não render XP em sala vazia.
    if (this.nearestMonsterInRange(p, SPELL_XP_COMBAT_TILES)) bump(seat.stats.spellXp, base.id, castXp(base));
    // Céu Carregado (Traço): a cada tantas magias, um raio cai no monstro mais perto.
    const sky = seat.traits.find((t) => t.chargedSky)?.chargedSky;
    if (sky && ++seat.castCount % sky.every === 0) this.skyBolt(sessionId, p, sky);
    seat.spellReadyAt[slot] = now + spellCooldownMs(spell.cooldownMs, seat.perkBonus);
    const ms = flightMs(spell.projectileSpeed ?? 0, ox, oy, tx, ty);
    this.host.broadcast(MSG.spell, { from: sessionId, spellId: spell.id, x: ox, y: oy, tx, ty, ms } satisfies SpellMessage);
    // Disparo Certeiro: mais forte quanto mais longe estava o alvo na hora do tiro.
    const far = spell.distanceBonus ? 1 + spell.distanceBonus * tileDistance(ox, oy, tx, ty) : 1;
    const amount = this.baseDamage(sessionId, p, "spell") * (spell.damage ?? 0) * far;
    const rank = p.spellRanks.get(base.id) ?? 0;
    this.after(ms, () => this.applySpell(sessionId, spell, rank, target?.id, tx, ty, amount, line, slot, ally));
    // Maestria que repete (Giro da Lâmina, Terremoto, Esfera Sombria): o efeito volta mais fraco, sem gastar mana.
    // Em volta de si, segue o herói; com alvo, segue o monstro se ele ainda estiver vivo.
    if (spell.repeat) {
      const echo = spell.repeat;
      const once = { ...spell, repeat: undefined, summon: undefined, charge: undefined, pull: undefined };
      for (let k = 1; k <= (echo.times ?? 1); k++) this.after(ms + echo.delayMs * k, () => {
        const caster = this.state.players.get(sessionId);
        if (!caster || caster.status !== "playing") return;
        const anchor = target && this.state.monsters.get(target.id);
        const at = spell.aim === "self" ? caster : anchor ?? { x: tx, y: ty };
        // O eco nasce no próprio ponto do efeito: nada voa de novo do herói.
        this.host.broadcast(MSG.spell, {
          from: sessionId, spellId: spell.id, x: at.x, y: at.y, tx: at.x, ty: at.y, ms: 0, echo: true,
        } satisfies SpellMessage);
        this.applySpell(sessionId, once, rank, anchor?.id, at.x, at.y, amount * echo.power, line, slot);
      });
    }
  }

  /** Céu Carregado (Traço): um raio cai do céu no monstro mais perto do druida. */
  private skyBolt(sessionId: string, p: Player, sky: NonNullable<TraitDef["chargedSky"]>) {
    const target = this.nearestMonsterTo(p.x, p.y, sky.range);
    if (!target) return;
    this.host.broadcast(MSG.spell, { from: sessionId, spellId: "call_lightning", x: p.x, y: p.y, tx: target.x, ty: target.y, ms: 150, echo: true } satisfies SpellMessage);
    const amount = rollDamage(this.random, this.baseDamage(sessionId, p, "spell") * sky.damage);
    this.after(150, () => {
      const alive = this.state.monsters.get(target.id);
      if (alive) this.damageMonster(alive, amount, { attacker: sessionId, fromX: alive.x, fromY: alive.y, fx: "nature" }, "charged_sky");
    });
  }

  /**
   * Efeito da magia ao chegar. Com alvo (toque rápido ou mira grudada), a área segue o monstro se ele
   * andou durante o voo; mirada no chão, cai no ponto. Paredes bloqueiam o efeito (precisa de linha
   * de visão do centro até quem é atingido).
   */
  private applySpell(
    sessionId: string, spell: SpellDef, rank: number, targetId: string | undefined, tx: number, ty: number, amount: number,
    line: { x: number; y: number }[] | undefined, slot: SpellSlot, allyId?: string,
  ) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat) return;
    // Campo no chão (Solo Consagrado, armadilha, estaca): os efeitos saem depois, pelos pulsos do campo.
    if (spell.field) {
      if (p.status === "playing") this.placeField(sessionId, p, seat, spell, rank, tx, ty, amount);
      return;
    }
    const now = this.host.now();
    const anchor = targetId ? this.state.monsters.get(targetId) : undefined;
    // Alvo único que morreu no caminho: a magia se perde.
    if (targetId && !anchor && spell.radius === 0 && !line) return;
    const cx = anchor?.x ?? tx;
    const cy = anchor?.y ?? ty;
    const inArea = (x: number, y: number) =>
      tileDistance(cx, cy, x, y) <= spell.radius && hasLineOfSight(this.dungeon, cx, cy, x, y);

    const onLine = line && new Set(line.map((t) => t.y * this.dungeon.width + t.x));
    // Linha: quem está na reta na chegada, mais o alvo do toque rápido (que pode ter saído dela durante o voo).
    const hit = onLine
      ? [...this.state.monsters.values()].filter((m) => m === anchor || onLine.has(m.y * this.dungeon.width + m.x))
      : spell.radius === 0 && anchor
        ? [anchor]
        : [...this.state.monsters.values()].filter((m) => inArea(m.x, m.y));
    // Cadeia: depois do alvo, salta para o monstro mais perto ainda não atingido, perdendo força a cada salto.
    const power = hit.map(() => 1);
    if (spell.chain && anchor) {
      const points = [{ x: anchor.x, y: anchor.y }];
      let from = anchor;
      for (let i = 1; i <= spell.chain.jumps; i++) {
        const next = this.nearestMonsterTo(from.x, from.y, spell.chain.range, new Set(hit.map((m) => m.id)));
        if (!next) break;
        hit.push(next);
        power.push((1 - spell.chain.falloff) ** i);
        points.push({ x: next.x, y: next.y });
        from = next;
      }
      if (points.length > 1) this.host.broadcast(MSG.chain, { spellId: spell.id, points } satisfies ChainMessage);
    }
    let dealt = 0;
    let killed = false;
    let taunted = 0;
    // Traços do Feiticeiro que valem a cada monstro atingido.
    const stunChance = seat.traits.find((t) => t.stunChance && t.stunChance.element === spell.element)?.stunChance;
    const spellBurn = seat.traits.find((t) => t.spellBurn)?.spellBurn;
    const shatter = seat.traits.find((t) => t.shatter)?.shatter;
    const harvest = seat.traits.find((t) => t.harvest)?.harvest;
    const hex = seat.traits.find((t) => t.hex)?.hex;
    const toxin = seat.traits.find((t) => t.toxin)?.toxin;
    // Picada da Mamba: o veneno leva a explosão junto, para o caso de o monstro morrer com ele.
    const burst = spell.burst && { radius: spell.burst.radius, amount: this.baseDamage(sessionId, p, "spell") * spell.burst.damage, source: spell.id };
    hit.forEach((m, i) => {
      const brain = this.brains.get(m.id);
      if (!brain) return;
      // Estilhaçar vale para quem já estava preso antes desta magia (a Prisão de Gelo não se quebra sozinha).
      const wasRooted = m.rooted;
      if (spell.taunt) {
        brain.targetId = sessionId;
        brain.tauntedBy = sessionId;
        taunted++;
      }
      // Corrente de Ferro: o alvo vem parar colado em quem conjura.
      if (spell.pull && m === anchor && p.status === "playing") this.pullTo(m, p);
      if (spell.rootMs) {
        this.root(m, brain, now + spell.rootMs);
        seat.stats.ccMs.root += spell.rootMs;
      }
      if (spell.stunMs) {
        brain.stunnedUntil = Math.max(brain.stunnedUntil, now + spell.stunMs);
        m.stunned = true;
        seat.stats.ccMs.stun += spell.stunMs;
      }
      if (spell.slow) {
        // Lentidão nova não soma com a antiga: fica a mais forte enquanto as duas valem.
        brain.slowPct = Math.max(now < brain.slowUntil ? brain.slowPct : 0, spell.slow.pct);
        brain.slowUntil = Math.max(brain.slowUntil, now + spell.slow.ms);
        m.slowed = true;
        seat.stats.ccMs.slow += spell.slow.ms;
      }
      if (spell.mark) {
        brain.markPct = Math.max(now < brain.markUntil ? brain.markPct : 0, spell.mark.pct);
        brain.markUntil = Math.max(brain.markUntil, now + spell.mark.ms);
        m.marked = true;
      }
      if (stunChance && this.random() < stunChance.chance) {
        brain.stunnedUntil = Math.max(brain.stunnedUntil, now + stunChance.ms);
        m.stunned = true;
        seat.stats.ccMs.stun += stunChance.ms;
      }
      // Maldição (Traço): magia de alvo único marca o alvo para toda a equipe.
      if (hex && m === anchor && spell.radius === 0 && !line) {
        brain.markPct = Math.max(now < brain.markUntil ? brain.markPct : 0, hex.pct);
        brain.markUntil = Math.max(brain.markUntil, now + hex.ms);
        m.marked = true;
      }
      if (spell.dot) this.applyDot(m, brain, sessionId, spell.id, this.baseDamage(sessionId, p, "spell") * spell.dot.perSec, spell.dot.ms, spell.dot.kind, now, burst);
      // Toxina (Traço): magia com dano envenena (e o veneno acumula, ver `applyDot`).
      else if (toxin && spell.damage) this.applyDot(m, brain, sessionId, spell.id, this.baseDamage(sessionId, p, "spell") * toxin.perSec, toxin.ms, "poison", now);
      if (spellBurn && spell.damage && !spell.dot) {
        this.applyDot(m, brain, sessionId, spell.id, this.baseDamage(sessionId, p, "spell") * spellBurn.perSec, spellBurn.ms, "burn", now);
      }
      if (spell.damage) {
        // Execução: mais forte em quem já está quase morto (vale a vida antes do golpe).
        const execute = spell.execute && m.hp < m.maxHp * spell.execute.hpPct ? 1 + spell.execute.bonus : 1;
        const undead = spell.undeadBonus && MONSTERS[m.kind as MonsterKind]?.undead ? 1 + spell.undeadBonus : 1;
        const shattered = shatter && wasRooted ? 1 + shatter.bonus : 1;
        if (shattered > 1) {
          brain.rootedUntil = now;
          m.rooted = false;
        }
        const value = Math.min(m.hp, rollDamage(this.random, amount * power[i] * execute * undead * shattered * this.farBonus(seat, p, m)));
        dealt += value;
        this.damageMonster(m, value, { attacker: sessionId, fromX: cx, fromY: cy, fx: CLASSES[spell.classId].attackFx }, spell.id);
        if (m.hp === 0) {
          killed = true;
          // Colheita (Traço): matar com magia devolve mana.
          if (harvest && p.status === "playing") this.giveMana(p, Math.max(1, Math.round(p.maxMana * harvest.pct)), sessionId);
        }
      }
      if (spell.push && m.hp > 0) this.push(m, p, spell.push);
    });

    // Pólvora (Traço): magia de área deixa o chão em chamas onde caiu.
    const fire = seat.traits.find((t) => t.areaFire)?.areaFire;
    if (fire && spell.damage && (spell.radius > 0 || spell.shape === "cone") && p.status === "playing") {
      const burning: SpellDef = { ...spell, radius: Math.max(1, spell.radius), field: { kind: "zone", ms: fire.ms, tickMs: 1000 } };
      this.placeField(sessionId, p, seat, burning, rank, cx, cy, this.baseDamage(sessionId, p, "spell") * fire.perSec, "fire");
    }

    // Desafio Supremo: cura por cada monstro provocado.
    if (spell.tauntHeal && taunted > 0 && p.status === "playing") this.healPlayer(p, Math.round(p.maxHp * spell.tauntHeal * taunted), sessionId);
    if (spell.thorns && p.status === "playing") {
      seat.thornsPct = spell.thorns.pct;
      seat.thornsUntil = now + spell.thorns.ms;
    }
    // Meteoro (Maestria): a cratera fica em chamas.
    if (spell.groundFire && p.status === "playing") {
      const crater: SpellDef = { ...spell, radius: Math.max(1, spell.radius), field: { kind: "zone", ms: spell.groundFire.ms, tickMs: 1000 } };
      this.placeField(sessionId, p, seat, crater, rank, cx, cy, this.baseDamage(sessionId, p, "spell") * spell.groundFire.perSec, "fire");
    }
    if (spell.lifesteal && dealt > 0 && p.status === "playing") this.healPlayer(p, Math.round(dealt * spell.lifesteal), sessionId);
    if (spell.manaSteal && dealt > 0 && p.status === "playing") this.giveMana(p, Math.round(dealt * spell.manaSteal), sessionId);
    // Disparo Certeiro (Maestria): matar corta o que falta da recarga; o botão do jogador acompanha.
    if (spell.killRefund && killed && now < seat.spellReadyAt[slot]) {
      const left = Math.round((seat.spellReadyAt[slot] - now) * (1 - spell.killRefund));
      seat.spellReadyAt[slot] = now + left;
      this.host.send(sessionId, MSG.cooldown, { slot, ms: left } satisfies CooldownMessage);
    }

    if (spell.heal) {
      this.state.players.forEach((ally) => {
        if (ally.status === "playing" && inArea(ally.x, ally.y)) this.healPlayer(ally, Math.round(ally.maxHp * spell.heal!), sessionId);
      });
    }

    if (spell.barrier && spell.barrierMs) {
      this.state.players.forEach((ally, id) => {
        if (ally.status !== "playing") return;
        // Mira em aliado: só ele ganha o escudo (pode ser o próprio herói).
        if (spell.aim === "ally" ? id !== allyId : id !== sessionId && !(spell.barrierAllies && inArea(ally.x, ally.y))) return;
        const allySeat = this.seats.get(id);
        if (!allySeat) return;
        // Escudo novo não soma com o antigo: fica o maior.
        const amountBarrier = Math.round(ally.maxHp * spell.barrier!);
        if (amountBarrier >= ally.barrier) {
          ally.barrier = ally.maxBarrier = amountBarrier;
          allySeat.barrierPush = spell.breakPush ?? 0;
        }
        allySeat.barrierUntil = Math.max(allySeat.barrierUntil, now + spell.barrierMs!);
      });
    }

    if (spell.guard && spell.guardMs && p.status === "playing") {
      seat.guard = spell.guard;
      seat.guardUntil = now + spell.guardMs;
      p.guarded = true;
    }

    if (spell.selfBuff && p.status === "playing") {
      const b = spell.selfBuff;
      seat.buff = {
        until: now + b.ms, basicDamage: b.basicDamage ?? 0, attackRange: b.attackRange ?? 0,
        moveSpeed: b.moveSpeed ?? 0, attackHaste: b.attackHaste ?? 0,
        damageTaken: b.damageTaken ?? 0, rooted: b.rooted ?? false, slowAttackers: b.slowAttackers ?? null,
      };
      p.buff = spell.id;
      seat.stats.buffMs += b.ms;
    }

    if (spell.armor && p.status === "playing") {
      // Mira em aliado (Pele de Casca): a armadura vai para ele.
      const armorSeat = spell.aim === "ally" ? allyId && this.seats.get(allyId) : seat;
      if (armorSeat) {
        armorSeat.armorBonus = spell.armor.points;
        armorSeat.armorUntil = now + spell.armor.ms;
      }
    }

    if (spell.form && p.status === "playing") {
      this.startForm(p, seat, spell.form, now);
      seat.stats.buffMs += spell.form.ms;
    }

    // Grito da Fera: as criaturas do druida atacam mais rápido e recuperam vida.
    if (spell.packCall && p.status === "playing") {
      const call = spell.packCall;
      this.state.summons.forEach((s) => {
        const summonBrain = this.summonBrains.get(s.id);
        if (s.owner !== sessionId || !summonBrain) return;
        summonBrain.haste = call.haste;
        summonBrain.hasteUntil = now + call.ms;
        s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * call.heal));
      });
    }

    const ally = allyId ? this.state.players.get(allyId) : undefined;
    const allySeat = allyId ? this.seats.get(allyId) : undefined;
    if (spell.cleanse && ally && allySeat) {
      allySeat.dot = null;
      ally.dot = "";
      allySeat.slow = null;
      ally.slowed = false;
    }
    if (spell.seed && allyId && ally?.status === "playing" && allySeat) this.plantSeed(sessionId, seat, allyId, ally, allySeat, spell.seed, now);

    if (spell.summon && p.status === "playing") this.summon(sessionId, p, spell, rank);
  }

  /** Forma animal: troca a anterior. O urso soma vida à máxima (entra cheia) e tira de volta quando a forma acaba. */
  private startForm(p: Player, seat: Seat, form: NonNullable<SpellDef["form"]>, now: number) {
    this.endForm(p, seat);
    const hpBonus = form.hp ? Math.round(p.maxHp * form.hp) : 0;
    seat.form = {
      kind: form.kind, until: now + form.ms, moveSpeed: form.moveSpeed ?? 0, pounce: form.pounce ?? 0,
      pounceStunMs: form.pounceStunMs ?? 0, maul: form.maul ?? false, hpBonus,
    };
    p.maxHp += hpBonus;
    p.hp += hpBonus;
    p.form = form.kind;
  }

  private endForm(p: Player, seat: Seat) {
    if (!seat.form) return;
    p.maxHp -= seat.form.hpBonus;
    p.hp = Math.min(p.hp, p.maxHp);
    seat.form = null;
    p.form = "";
  }

  /** Renascer da Semente: uma semente por druida (a nova troca a anterior, onde quer que esteja). */
  private plantSeed(
    sessionId: string, seat: Seat, allyId: string, ally: Player, allySeat: Seat, seed: NonNullable<SpellDef["seed"]>, now: number,
  ) {
    const oldId = seat.seedTarget;
    const old = oldId ? this.seats.get(oldId) : undefined;
    if (oldId && old?.seed?.by === sessionId) {
      old.seed = null;
      const holder = this.state.players.get(oldId);
      if (holder) holder.seeded = false;
    }
    allySeat.seed = { until: now + seed.ms, by: sessionId, hp: seed.hp, invulnMs: seed.invulnMs };
    ally.seeded = true;
    seat.seedTarget = allyId;
  }

  /**
   * Renascer da Semente: quem ia morrer com a semente ativa renasce no lugar com parte da vida e um instante de
   * invulnerabilidade, sem largar item, bag nem poções. A semente some.
   */
  private rebirth(sessionId: string, p: Player, seat: Seat, now: number) {
    const seed = seat.seed;
    if (!seed || now >= seed.until) return false;
    seat.seed = null;
    p.seeded = false;
    const druid = this.seats.get(seed.by);
    if (druid?.seedTarget === sessionId) druid.seedTarget = null;
    p.hp = Math.max(1, Math.round(p.maxHp * seed.hp));
    seat.invulnUntil = now + seed.invulnMs;
    p.reborn = true;
    seat.dot = null;
    p.dot = "";
    seat.slow = null;
    p.slowed = false;
    seat.stats.death = null;
    druid?.stats.revives.push(p.name);
    seat.stats.revived = { by: this.state.players.get(seed.by)?.name ?? "?", at: this.seconds(), damageAfter: 0 };
    this.host.broadcast(MSG.spell, { from: seed.by, spellId: "rebirth_seed", x: p.x, y: p.y, tx: p.x, ty: p.y, ms: 0, echo: true } satisfies SpellMessage);
    this.notice(p.x, p.y - 1, "Renasceu!", 0x9cff7a);
    return true;
  }

  /** Picada da Mamba: o monstro que morreu envenenado explode e envenena quem estiver em volta. */
  private venomBurst(x: number, y: number, attacker: string, burst: { radius: number; amount: number; source: string }) {
    const p = this.state.players.get(attacker);
    if (!p) return;
    this.host.broadcast(MSG.spell, { from: attacker, spellId: "mamba_bite", x, y, tx: x, ty: y, ms: 0, echo: true } satisfies SpellMessage);
    const hit: Hit = { attacker, fromX: x, fromY: y, fx: "nature" };
    const now = this.host.now();
    for (const m of [...this.state.monsters.values()]) {
      if (tileDistance(x, y, m.x, m.y) > burst.radius || !hasLineOfSight(this.dungeon, x, y, m.x, m.y)) continue;
      const brain = this.brains.get(m.id);
      if (brain) this.applyDot(m, brain, attacker, burst.source, burst.amount * 0.2, 3000, "poison", now);
      this.damageMonster(m, rollDamage(this.random, burst.amount), hit, burst.source);
    }
  }

  private seatOf(p: Player) {
    for (const [id, other] of this.state.players) if (other === p) return this.seats.get(id);
    return undefined;
  }

  // --- Poções -------------------------------------------------------------

  /** Bebe uma poção carregada. Com a barra cheia, não gasta a poção nem a recarga. */
  drink(sessionId: string, msg: DrinkMessage) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing" || this.state.phase !== "running") return;
    if (!isPotion(msg?.potion)) return;
    const potion = POTIONS[msg.potion];
    const field = POTION_FIELD[potion.id];
    const now = this.host.now();
    if (p[field] <= 0 || now < seat.potionReadyAt) return;
    if (this.held(seat, "stun", "engulf")) return;

    const max = potion.stat === "hp" ? p.maxHp : p.maxMana;
    const restored = Math.min(max - p[potion.stat], Math.round(max * potion.restore));
    if (restored <= 0) {
      const text = potion.stat === "hp" ? "Vida cheia" : "Mana cheia";
      this.host.send(sessionId, MSG.notice, { x: p.x, y: p.y - 1, text, color: 0xbdc3c7 } satisfies NoticeMessage);
      return;
    }
    p[field] -= 1;
    p[potion.stat] += restored;
    seat.potionReadyAt = now + POTION_COOLDOWN_MS;
    seat.stats.potions.drunk[potion.id] = (seat.stats.potions.drunk[potion.id] ?? 0) + 1;
    if (potion.stat === "hp") seat.stats.healing += restored;
    else seat.stats.potions.manaRestored += restored;
    this.host.send(sessionId, MSG.drank, { potion: potion.id, cooldownMs: POTION_COOLDOWN_MS } satisfies DrankMessage);
    this.notice(p.x, p.y, `+${restored}`, potion.color);
  }

  /** `healerId` é quem leva o crédito da cura na telemetria. */
  private healPlayer(p: Player, amount: number, healerId: string) {
    const healer = this.seats.get(healerId);
    const sap = healer?.traits.find((t) => t.healArmor)?.healArmor;
    const bloom = healer?.traits.find((t) => t.overheal)?.overheal;
    const seat = (sap || bloom) && p.status === "playing" ? this.seatOf(p) : undefined;
    if (seat) {
      const now = this.host.now();
      // Seiva Protetora (Traço): quem o druida cura endurece a pele.
      if (sap) {
        seat.sapArmor = sap.points;
        seat.sapUntil = now + sap.ms;
      }
      // Florescer (Traço): o que passa da vida máxima vira escudo, até o teto.
      const extra = amount - (p.maxHp - p.hp);
      const barrier = bloom ? Math.min(Math.round(p.maxHp * bloom.max), p.barrier + Math.max(0, extra)) : 0;
      if (bloom && barrier > p.barrier) {
        p.maxBarrier = p.barrier > 0 ? Math.max(p.maxBarrier, barrier) : barrier;
        p.barrier = barrier;
        seat.barrierUntil = Math.max(seat.barrierUntil, now + bloom.ms);
      }
    }
    const healed = Math.min(p.maxHp - p.hp, amount);
    if (healed <= 0) return;
    p.hp += healed;
    const stats = this.seats.get(healerId)?.stats;
    if (stats) stats.healing += healed;
    this.notice(p.x, p.y, `+${healed}`, 0x2ecc71);
  }

  /** Mana dada por magia ou criatura (não poção); `giverId` leva o crédito na telemetria. */
  private giveMana(p: Player, amount: number, giverId: string) {
    const given = Math.min(p.maxMana - p.mana, amount);
    if (given <= 0) return;
    p.mana += given;
    const stats = this.seats.get(giverId)?.stats;
    if (stats) stats.manaGiven += given;
  }

  private root(m: Monster, brain: Brain, until: number) {
    brain.rootedUntil = Math.max(brain.rootedUntil, until);
    m.rooted = true;
  }

  /** Fim do Grito de Guerra, dos escudos, da armadura extra, das raízes, do atordoamento e da lentidão; pulsos do dano contínuo. */
  private expireEffects(now: number) {
    this.seats.forEach((seat, sessionId) => {
      const p = this.state.players.get(sessionId);
      if (p?.guarded && now >= seat.guardUntil) p.guarded = false;
      if (p && p.barrier > 0 && now >= seat.barrierUntil) {
        p.barrier = 0;
        seat.barrierPush = 0;
      }
      if (seat.armorBonus > 0 && now >= seat.armorUntil) seat.armorBonus = 0;
      if (seat.buff && now >= seat.buff.until) {
        seat.buff = null;
        if (p) p.buff = "";
      }
      if (p && seat.slow && now >= seat.slow.until) {
        seat.slow = null;
        p.slowed = false;
      }
      if (p && seat.form && now >= seat.form.until) this.endForm(p, seat);
      if (p?.reborn && now >= seat.invulnUntil) p.reborn = false;
      if (p && seat.seed && now >= seat.seed.until) {
        const druid = this.seats.get(seat.seed.by);
        if (druid?.seedTarget === sessionId) druid.seedTarget = null;
        seat.seed = null;
        p.seeded = false;
      }
      if (p) this.tickDot(sessionId, p, seat, now);
      if (p) this.tickEffects(sessionId, p, seat, now);
    });
    // Cópia da lista: o pulso do dano contínuo pode matar (e tirar do estado) o monstro.
    for (const m of [...this.state.monsters.values()]) {
      const brain = this.brains.get(m.id);
      if (!brain) continue;
      if (m.rooted && now >= brain.rootedUntil) m.rooted = false;
      if (m.stunned && now >= brain.stunnedUntil) m.stunned = false;
      if (m.slowed && now >= brain.slowUntil) m.slowed = false;
      if (m.marked && now >= brain.markUntil) m.marked = false;
      const dot = brain.dot;
      if (!dot) continue;
      if (now >= dot.nextAt) {
        dot.nextAt += 1000;
        const hit: Hit = { attacker: dot.attacker, fromX: m.x, fromY: m.y, fx: dot.kind === "burn" ? "fire" : "nature", dot: dot.kind };
        this.damageMonster(m, Math.max(1, Math.round(dot.amount)), hit, dot.source);
      }
      if (now >= dot.until) {
        brain.dot = null;
        m.dot = "";
      }
    }
  }

  // --- Criaturas invocadas ----------------------------------------------------

  /** Põe as criaturas da magia em volta de quem conjurou. Conjurar de novo substitui as anteriores da mesma magia. */
  private summon(sessionId: string, p: Player, spell: SpellDef, rank: number) {
    const { kind, count, durationMs } = spell.summon!;
    this.state.summons.forEach((s) => {
      if (s.owner === sessionId && this.summonBrains.get(s.id)?.spellId === spell.id) this.removeSummon(s.id);
    });
    const now = this.host.now();
    const stats = summonStats(kind, p.maxHp, this.baseDamage(sessionId, p, "spell"), rankPower(rank) * (1 + (p.spellBonus.get(spell.id) ?? 0)));
    // Vínculo Selvagem (Traço): criaturas com mais vida e mais dano.
    const boost = 1 + (this.seats.get(sessionId)?.traits.reduce((sum, t) => sum + (t.summonBoost ?? 0), 0) ?? 0);
    stats.maxHp = Math.round(stats.maxHp * boost);
    stats.damage *= boost;
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
        def: SUMMONS[kind], spellId: spell.id, damage: stats.damage, heal: stats.heal, mana: stats.mana,
        expiresAt: now + durationMs, nextMoveAt: now + 300, nextAttackAt: now + 300, targetId: null, haste: 0, hasteUntil: 0,
        deathHeal: spell.summonDeathHeal ?? null,
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
          if (ally.status !== "playing") return;
          if (tileDistance(s.x, s.y, ally.x, ally.y) > (def.healRadius ?? 0)) return;
          if (ally.hp < ally.maxHp) this.healPlayer(ally, Math.max(1, Math.round(ally.maxHp * brain.heal)), s.owner);
          if (brain.mana > 0) this.giveMana(ally, Math.max(1, Math.round(ally.maxMana * brain.mana)), s.owner);
        });
      }
      return this.summonFollow(s, brain, owner, now);
    }

    // Alvo: o que já caçava, senão o alvo do dono, senão o monstro mais próximo (sem se afastar demais do dono).
    let target = brain.targetId ? this.state.monsters.get(brain.targetId) : undefined;
    if (target && (target.hidden || tileDistance(target.x, target.y, owner.x, owner.y) > 8)) target = undefined;
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
      brain.nextAttackAt = now + def.attackCooldownMs * (now < brain.hasteUntil ? 1 - brain.haste : 1);
      const m = target;
      const amount = rollDamage(this.random, brain.damage);
      const hit: Hit = { attacker: s.id, fromX: s.x, fromY: s.y, fx: def.attackFx };
      // À distância (vespa), o ferrão voa; o cliente desenha o projétil pelo `fx` do dano.
      this.after(def.attackRange > 1 ? 200 : 0, () => {
        const alive = this.state.monsters.get(m.id);
        const brainM = this.brains.get(m.id);
        if (!alive || !brainM || !this.state.summons.has(s.id)) return;
        if (def.taunt) brainM.targetId = s.id;
        if (def.rootMs) this.root(alive, brainM, this.host.now() + def.rootMs);
        // Águia Gigante: o mergulho deixa o monstro tonto.
        if (def.stunMs) {
          brainM.stunnedUntil = Math.max(brainM.stunnedUntil, this.host.now() + def.stunMs);
          alive.stunned = true;
          const ownerStats = this.seats.get(s.owner)?.stats;
          if (ownerStats) ownerStats.ccMs.stun += def.stunMs;
        }
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
    // Quem voa (Águia Gigante) passa por cima da água; paredes e mata ainda barram.
    const walkable = brain.def.flies ? (x: number, y: number) => !blocksSight(this.dungeon, x, y) : undefined;
    const step = nextStep(this.dungeon, s, to, range, (x, y) => blocked.has(y * this.dungeon.width + x), walkable);
    if (!step) {
      brain.nextMoveAt = now + 400;
      return;
    }
    const diagonal = step.x !== s.x && step.y !== s.y;
    brain.nextMoveAt = now + (1000 / brain.def.speed) * (diagonal ? Math.SQRT2 : 1);
    s.stepMs = Math.round(1000 / brain.def.speed);
    s.x = step.x;
    s.y = step.y;
  }

  private nearestMonsterTo(x: number, y: number, range: number, skip?: Set<string>): Monster | undefined {
    let best: Monster | undefined;
    let bestDist = Infinity;
    this.state.monsters.forEach((m) => {
      if (skip?.has(m.id) || m.hidden) return;
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
    this.host.broadcast(MSG.damage, { x: s.x, y: s.y, amount, toPlayer: true, ...hit } satisfies DamageMessage);
    if (s.hp === 0) {
      // Urso Ancestral (Maestria): ao cair, cura a equipe por perto.
      const heal = this.summonBrains.get(s.id)?.deathHeal;
      if (heal) {
        this.state.players.forEach((ally) => {
          if (ally.status === "playing" && tileDistance(s.x, s.y, ally.x, ally.y) <= heal.radius) {
            this.healPlayer(ally, Math.round(ally.maxHp * heal.pct), s.owner);
          }
        });
      }
      this.removeSummon(s.id);
    }
  }

  private canHit(p: Player, m: Monster, range: number) {
    return tileDistance(p.x, p.y, m.x, m.y) <= range && hasLineOfSight(this.dungeon, p.x, p.y, m.x, m.y);
  }

  private nearestMonsterInRange(p: Player, range: number): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    this.state.monsters.forEach((m, id) => {
      if (m.hidden) return;
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
  private damageMonster(m: Monster, raw: number, hit: Hit, source: string, creditId = hit.attacker): number {
    const brain = this.brains.get(m.id);
    if (!brain) return 0;
    // Marca do Caçador: o marcado leva mais dano de qualquer fonte (heróis, magias e criaturas).
    const marked = m.marked ? Math.round(raw * (1 + brain.markPct)) : raw;
    // Elemento: imune, resiste, vulnerável, absorve e a Fortitude Morta-viva (`monsterAi.ts`).
    const seat = this.seats.get(creditId);
    const element = damageElement(source, this.state.players.get(creditId)?.classId as ClassId | undefined, hit.dot);
    const amount = this.ai.adjustDamage(m, brain, marked, element);
    if (seat) seat.stats.resisted += marked - amount;
    brain.participants.add(creditId);
    if (!brain.targetId) brain.targetId = hit.attacker;
    if (amount <= 0) return 0;
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
    // Apanhar faz o monstro perseguir quem bateu, se ainda não persegue ninguém (acima).
    this.host.broadcast(MSG.damage, { x: m.x, y: m.y, amount, toPlayer: false, ...hit } satisfies DamageMessage);
    if (m.hp === 0) this.killMonster(m, brain, creditId);
    else this.ai.afterDamage(m, brain, dealt, element);
    return dealt;
  }

  private killMonster(m: Monster, brain: Brain, killerId: string) {
    // Picada da Mamba: morreu com o veneno dela, explode logo depois.
    const venom = brain.dot;
    if (venom?.burst && this.host.now() < venom.until) {
      const burst = venom.burst;
      this.after(150, () => this.venomBurst(m.x, m.y, venom.attacker, burst));
    }
    this.ai.died(brain);
    this.state.monsters.delete(m.id);
    this.brains.delete(m.id);
    this.state.players.forEach((p) => { if (p.target === m.id) p.target = ""; });

    // Ilusão (cópia da Bruxa Verde): some sem dar nada.
    if (brain.traits.illusion) {
      this.notice(m.x, m.y - 1, "Era uma ilusão!", 0x9ccc65);
      return;
    }
    // Quem chamou morreu: as ilusões dele somem junto.
    for (const [id, other] of [...this.brains]) {
      if (other.summonedBy === m.id && other.traits.illusion) this.vanishMonster(id);
    }

    // Chamado por outro monstro (Chamado do Clã, Rugido do Rei, Praga de Escaravelhos): não rende XP, loot nem item,
    // senão bastava ficar ao lado de quem chama para subir de nível sem fim.
    if (brain.summonedBy) {
      const stats = this.seats.get(killerId)?.stats;
      if (stats) bump(stats.kills, m.kind);
      return;
    }

    // XP: a equipe que participou divide (com bônus por participante). Os bots não contam na divisão: ganham a mesma
    // parte de um humano, para subirem de nível junto, sem tirar XP de ninguém.
    const sharers = [...brain.participants].filter((id) => this.state.players.get(id)?.status === "playing");
    const humans = sharers.filter((id) => !this.state.players.get(id)!.bot).length;
    const share = xpShare(brain.xp, humans || sharers.length);
    for (const id of sharers) this.gainXp(id, share);

    // Loot: vai para quem deu o último golpe (o que um bot mata não dá loot a ninguém).
    const killer = this.state.players.get(killerId);
    if (killer?.status === "playing" && !killer.bot) {
      const value = rollRange(this.random, brain.loot);
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
    const drops = GUARANTEED_DROPS[brain.def.rank] || (this.random() < COMMON_DROP_CHANCE ? 1 : 0);
    // O boss sempre larga o que tem; os outros, com a chance do mapa (`MapDef.dropScale`).
    const boss = brain.def.rank === "boss";
    for (let i = 0; i < drops; i++) {
      if (boss || this.keepDrop()) this.dropItem(rollItem(brain.def.rank, brain.depth, this.random, 0, this.partyClasses()), at.x, at.y);
    }
    const potions = GUARANTEED_POTIONS[brain.def.rank] || (this.random() < COMMON_POTION_CHANCE ? 1 : 0);
    for (let i = 0; i < potions; i++) if (boss || this.keepDrop()) this.dropItem(rollPotion(this.random), at.x, at.y);
    // Runas só caem dos bosses, uma vez por personagem: cada herói que ainda não levou a runa deste boss ganha a
    // sua, que só ele pega do chão (o da caverna, não: a runa sai dos baús, à escolha).
    if (!this.map.rewardRunes && RUNE_DROPS[brain.def.rank] > 0) {
      this.state.players.forEach((p, id) => {
        const seat = this.seats.get(id);
        if (p.status !== "playing" || p.bot || !seat) return;
        if (seat.bossRunes.has(m.kind)) {
          this.noticeTo(id, at.x, at.y - 2, "Runa deste boss já levada", 0x95a5a6);
          return;
        }
        seat.bossRunes.add(m.kind);
        seat.stats.bossRunes.push(m.kind);
        for (let i = 0; i < RUNE_DROPS[brain.def.rank]; i++) {
          const item = this.dropItem(rollRune(this.random), at.x, at.y);
          item.owner = id;
          const rune = RUNES[item.itemId];
          this.noticeTo(id, at.x, at.y - 2, `${rune.name}!`, rune.color);
        }
      });
    }

    // Mímico: guarda o loot do baú que fingia ser (vai para quem deu o último golpe).
    const mimicDepth = this.mimicDepth.get(m.id);
    if (mimicDepth !== undefined) {
      this.mimicDepth.delete(m.id);
      if (killer?.status === "playing" && !killer.bot) this.chestReward(killerId, killer, m.x, m.y, mimicDepth);
    }

    if (brain.chestId) {
      const chest = this.state.chests.get(brain.chestId);
      if (chest) {
        chest.locked = false;
        this.notice(chest.x, chest.y, "Baú destrancado!", 0xf39c12);
      }
    }

    if (brain.def.rank === "boss") {
      const c = this.dungeon.bossPortal;
      this.dungeon.tiles[c.y * this.dungeon.width + c.x] = Tile.Portal;
      this.state.bossDefeated = true;
      this.notice(c.x, c.y, "O portal se abriu!", 0x3fa7d6);
      this.state.chests.forEach((chest) => {
        if (!chest.rune) return;
        chest.locked = false;
        this.notice(chest.x, chest.y, "Escolha uma runa!", RUNES[chest.rune]?.color ?? 0xf39c12);
      });
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
    // A Forma de Urso continua somando a vida dela até acabar.
    p.hp = p.maxHp = stats.maxHp + (seat?.form?.hpBonus ?? 0);
    p.mana = p.maxMana = stats.maxMana;
    this.notice(p.x, p.y - 1, `Nível ${level}!`, 0x2ecc71);
    if (SPELL_SLOT_LEVELS.some((l) => l <= level && l > previous)) this.notice(p.x, p.y - 2, "Nova magia!", 0x9b59b6);
    // Só os níveis que não abrem slot de magia dão melhoria (uma de cada vez, se subiu vários).
    if (!seat) return;
    for (let l = previous + 1; l <= level; l++) if (grantsPerk(l)) seat.perkLevels.push(l);
    if (p.perkOffer.length === 0) this.offerPerks(p, seat);
    p.perksQueued = seat.perkLevels.length;
  }

  // --- Melhorias ---------------------------------------------------------------

  /** Sorteia as melhorias do próximo nível da fila (some sozinha se todas já chegaram ao limite). */
  private offerPerks(p: Player, seat: Seat) {
    p.perkOffer.clear();
    const level = seat.perkLevels.shift();
    p.perksQueued = seat.perkLevels.length;
    p.perkLevel = level ?? 0;
    if (level === undefined) return;
    p.perkOffer.push(...rollPerkOffer(seat.perks, p.level, this.random));
  }

  /** Escolha de uma das melhorias oferecidas. Vale até o fim da hunt. */
  choosePerk(sessionId: string, msg: ChoosePerkMessage) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return;
    const perk = msg?.perk;
    if (!isPerk(perk) || !p.perkOffer.includes(perk)) return;

    seat.perks[perk] = (seat.perks[perk] ?? 0) + 1;
    p.perks.set(perk, seat.perks[perk]!);
    seat.perkBonus = heroBonuses(seat.perks, [...p.runes]);
    this.applyBonuses(p, seat);
    seat.stats.perksChosen.push({ id: perk, offer: [...p.perkOffer], level: p.perkLevel, at: this.seconds() });
    this.notice(p.x, p.y - 1, PERKS[perk].name, 0xf1c40f, PERK_NOTICE_MS);

    this.offerPerks(p, seat);
  }

  /**
   * Baú de runa: o jogador colado nele leva a runa para a bag. Uma por jogador; o baú continua cheio para os outros
   * (cada um escolhe a sua). Só depois do boss morto.
   */
  chooseRune(sessionId: string, msg: ChooseRuneMessage) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    const chest = typeof msg?.chest === "string" ? this.state.chests.get(msg.chest) : undefined;
    if (!p || !seat || p.status !== "playing" || this.state.phase !== "running" || !chest?.rune || chest.locked) return;
    if (p.chosenRune || tileDistance(p.x, p.y, chest.x, chest.y) > 1) return;
    // Cada boss dá a runa uma vez por personagem (aqui, a dos baús atrás dele).
    const boss = this.rewardBoss();
    if (boss && seat.bossRunes.has(boss)) {
      this.noticeTo(sessionId, chest.x, chest.y, "Runa deste boss já levada", 0x95a5a6);
      return;
    }
    if (p.bag.length >= BAG_SIZE) {
      this.bagFull(p, seat);
      return;
    }
    if (boss) {
      seat.bossRunes.add(boss);
      seat.stats.bossRunes.push(boss);
    }
    p.chosenRune = chest.rune;
    p.bag.push(chest.rune);
    seat.stats.items.picked.push(chest.rune);
    seat.stats.chestsOpened++;
    const rune = RUNES[chest.rune];
    this.notice(p.x, p.y - 1, `${rune.name} 🎒${p.bag.length}/${BAG_SIZE}`, rune.color);
  }

  /**
   * Caverna: quem pisa numa ponta sai do lado da outra (na boca, logo na frente dela; no subterrâneo, logo acima da
   * saída), e as criaturas que invocou vão junto.
   */
  private throughCave(sessionId: string, p: Player) {
    const to = caveDestination(this.dungeon, p.x, p.y);
    if (!to) return;
    const land = this.landingNear(to.x, to.y, to === this.dungeon.cave?.exit ? -1 : 1);
    if (!land) return;
    const seat = this.seats.get(sessionId);
    if (seat) seat.heading = null;
    p.x = land.x;
    p.y = land.y;
    p.stepMs = 0;
    this.state.summons.forEach((s) => {
      if (s.owner !== sessionId) return;
      const spot = this.landingNear(land.x, land.y, 0);
      if (!spot) return;
      s.x = spot.x;
      s.y = spot.y;
      s.stepMs = 0;
    });
  }

  /** Tile livre perto de (x, y) para chegar pela caverna: primeiro o lado `dy` (para onde a caverna abre). */
  private landingNear(x: number, y: number, dy: number) {
    const blocked = this.occupiedTiles();
    const w = this.dungeon.width;
    const free = (tx: number, ty: number) =>
      isWalkable(this.dungeon, tx, ty) && !this.specialTile(tx, ty) && !blocked.has(ty * w + tx);
    if (dy && free(x, y + dy)) return { x, y: y + dy };
    for (let r = 1; r <= 3; r++)
      for (let oy = -r; oy <= r; oy++)
        for (let ox = -r; ox <= r; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
          if (free(x + ox, y + oy) && hasLineOfSight(this.dungeon, x, y, x + ox, y + oy)) return { x: x + ox, y: y + oy };
        }
    return null;
  }

  /** Portal ou caverna: ninguém nasce, cai, salta ou levanta parede ali. */
  private specialTile(x: number, y: number) {
    const t = tileAt(this.dungeon, x, y);
    return t === Tile.Portal || t === Tile.Cave;
  }

  /**
   * Junta áureas, melhorias e equipamento em `seat.bonus`. Vida e mana máximas mudam na hora: o que cresceu
   * entra cheio, e o que diminuiu (tirou um item) só corta o que passar do novo máximo.
   */
  private applyBonuses(p: Player, seat: Seat) {
    const b = seat.perkBonus;
    const g = seat.gear;
    seat.bonus = {
      hp: seat.aura.hp + b.hp + g.hp, mana: seat.aura.mana + b.mana + g.mana,
      damage: seat.aura.damage + b.damage, speed: seat.aura.speed + b.speed + g.speed,
    };
    const stats = statsFor(p.classId as ClassId, p.level, seat.bonus);
    const maxHp = stats.maxHp + (seat.form?.hpBonus ?? 0);
    p.hp = Math.min(maxHp, p.hp + Math.max(0, maxHp - p.maxHp));
    p.mana = Math.min(stats.maxMana, p.mana + Math.max(0, stats.maxMana - p.maxMana));
    p.maxHp = maxHp;
    p.maxMana = stats.maxMana;
  }

  /**
   * Bosses cuja runa este personagem (conta e classe) já levou em outras hunts, vindos do banco quando a hunt
   * começa: eles não dão outra.
   */
  knownBossRunes(sessionId: string, bosses: readonly string[]) {
    const seat = this.seats.get(sessionId);
    if (!seat) return;
    for (const kind of bosses) if (typeof kind === "string") seat.bossRunes.add(kind);
  }

  /** Boss que guarda os baús de runa do mapa (o principal; os baús só destrancam com ele morto). */
  private rewardBoss(): string | undefined {
    return this.map.rewardRunes ? mainBoss(this.map) : undefined;
  }

  /** As runas equipadas no menu entram com o herói e valem desde já (vida, dano, magias extras na escolha do slot). */
  private equipRunes(p: Player, seat: Seat, ids: readonly string[]) {
    const runes = activeRunes([...p.runes, ...ids]);
    if (runes.length === p.runes.length) return;
    p.runes.clear();
    p.runes.push(...runes);
    seat.perkBonus = heroBonuses(seat.perks, runes);
    this.applyBonuses(p, seat);
  }

  /** O equipamento vestido mudou (pegou, trocou, guardou ou largou): recalcula os atributos dos itens. */
  private refreshGear(sessionId: string) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return;
    seat.gear = gearStats(equipment(p));
    this.applyBonuses(p, seat);
  }

  /** `redirected`: dano que um Guardião puxou de um aliado (Intervir), que não é puxado de novo. */
  private damagePlayer(sessionId: string, raw: number, hit: Hit, redirected = false) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing") return;
    const seat = this.seats.get(sessionId);
    const guard = p.guarded ? seat?.guard ?? 0 : 0;
    const now = this.host.now();
    // Recém-renascido da semente: nada o fere por um instante.
    if (seat && now < seat.invulnUntil) return;
    const attacker = this.state.monsters.get(hit.attacker);
    const attackerBrain = attacker && this.brains.get(attacker.id);
    // Fúria Berserker: mais frágil enquanto dura.
    const buff = seat?.buff && now < seat.buff.until ? seat.buff : null;
    if (buff?.damageTaken) raw *= 1 + buff.damageTaken;
    // Intimidar (Traço): o monstro que este herói provocou (e ainda o persegue) bate mais fraco nele.
    const intimidate = seat?.traits.find((t) => t.intimidate)?.intimidate;
    if (intimidate && attackerBrain?.tauntedBy === sessionId && attackerBrain.targetId === sessionId) raw *= 1 - intimidate.pct;
    // Intervir (Traço): um Guardião perto puxa parte do golpe de monstro para si.
    if (!redirected && attacker) {
      const guardian = this.guardianFor(sessionId, p);
      if (guardian) {
        const taken = raw * guardian.pct;
        raw -= taken;
        const guardianStats = this.seats.get(guardian.id)?.stats;
        if (guardianStats) guardianStats.intercepted += Math.round(taken);
        this.damagePlayer(guardian.id, taken, hit, true);
      }
    }
    const fieldArmor = seat && now < seat.fieldArmorUntil ? seat.fieldArmor : 0;
    // Pele Selvagem (Traço) vale enquanto a forma animal dura; a Seiva Protetora, por alguns segundos depois da cura.
    const formArmor = seat?.form && now < seat.form.until ? seat.traits.reduce((sum, t) => sum + (t.formArmor ?? 0), 0) : 0;
    const sapArmor = seat && now < seat.sapUntil ? seat.sapArmor : 0;
    const armor = (seat?.gear.armor ?? 0) + (seat?.perkBonus.armor ?? 0) + (seat?.armorBonus ?? 0) + fieldArmor + formArmor + sapArmor;
    // Corroído: a armadura derrete e cada acúmulo deixa o golpe mais forte.
    const corrode = seat?.effects.corrode && now < seat.effects.corrode.until ? 1 + CORRODE_PER_STACK * seat.effects.corrode.stacks : 1;
    let amount = Math.max(1, Math.round(raw * corrode * (1 - damageReduction(armor)) * (1 - guard) * (1 - this.allyWard(p))));
    // Escudo de Mana (Traço): parte do golpe sai da mana, enquanto houver.
    const manaShield = seat?.traits.find((t) => t.manaShield)?.manaShield;
    if (manaShield && p.mana > 0) {
      const fromMana = Math.min(p.mana, Math.round(amount * manaShield.pct));
      p.mana -= fromMana;
      amount -= fromMana;
    }
    // O escudo absorve primeiro; o que sobra vai para a vida.
    const absorbed = Math.min(p.barrier, amount);
    if (absorbed > 0) {
      p.barrier -= absorbed;
      amount -= absorbed;
      if (seat) seat.stats.absorbed += absorbed;
      // Escudo da Fé (Maestria): ao quebrar, joga longe quem está colado.
      if (p.barrier === 0 && seat?.barrierPush) {
        const tiles = seat.barrierPush;
        seat.barrierPush = 0;
        this.state.monsters.forEach((m) => { if (tileDistance(p.x, p.y, m.x, m.y) <= 1) this.push(m, p, tiles); });
        this.notice(p.x, p.y - 1, "Escudo quebrou!", 0x7fc8ff);
      }
    }
    if (seat) {
      const kind = this.state.monsters.get(hit.attacker)?.kind ?? seat.dot?.kind ?? "?";
      bump(seat.stats.damageTaken, kind, Math.min(amount, p.hp));
      if (hit.special) bump(seat.stats.specialDamage, kind, Math.min(amount, p.hp));
      if (hit.ability) bump(seat.stats.abilityDamage, `${kind}:${hit.ability}`, Math.min(amount, p.hp));
      seat.stats.damageMitigated += Math.max(0, raw - amount);
      seat.stats.minHpPct = Math.min(seat.stats.minHpPct, Math.max(0, p.hp - amount) / p.maxHp);
      if (amount > 0 && amount >= p.hp) {
        const depth = this.brains.get(hit.attacker)?.depth ?? -1;
        seat.stats.death = { by: kind, depth, x: p.x, y: p.y, at: this.seconds() };
      }
    }
    p.hp = Math.max(0, p.hp - amount);
    if (seat?.stats.revived) seat.stats.revived.damageAfter += amount;
    this.host.broadcast(MSG.damage, { x: p.x, y: p.y, amount, absorbed, toPlayer: true, ...hit } satisfies DamageMessage);
    if (p.hp === 0 && seat && this.rebirth(sessionId, p, seat, now)) return;
    if (p.hp === 0) return this.endRun(sessionId, "died");
    // Último Bastião (Traço): quase caindo, ganha um escudo (com recarga longa).
    const lastStand = seat?.traits.find((t) => t.lastStand)?.lastStand;
    if (seat && lastStand && p.hp < p.maxHp * lastStand.hpPct && now >= seat.lastStandReadyAt) {
      seat.lastStandReadyAt = now + lastStand.cooldownMs;
      const shield = Math.round(p.maxHp * lastStand.barrier);
      if (shield > p.barrier) p.barrier = p.maxBarrier = shield;
      seat.barrierUntil = Math.max(seat.barrierUntil, now + lastStand.ms);
      this.notice(p.x, p.y - 1, "Último Bastião!", 0x9fd8ff);
    }
    if (!seat || !attacker || hit.dot || tileDistance(p.x, p.y, attacker.x, attacker.y) > 1) return;
    // Daqui para baixo, só golpe corpo a corpo de monstro.
    // Espinhos (itens) e Espinhos de Ferro (magia): parte do golpe volta para o monstro.
    const spellThorns = now < seat.thornsUntil ? seat.thornsPct : 0;
    const thorns = seat.gear.thorns + spellThorns;
    if (thorns > 0) {
      const back = Math.max(1, Math.round((amount + absorbed) * thorns));
      const source = spellThorns >= seat.gear.thorns ? "iron_thorns" : "item:thorns";
      this.damageMonster(attacker, back, { attacker: sessionId, fromX: p.x, fromY: p.y, fx: "slash" }, source);
    }
    // Riposta (Traço): às vezes devolve o golpe na hora.
    const riposte = seat.traits.find((t) => t.riposte)?.riposte;
    if (riposte && this.state.monsters.has(attacker.id) && this.random() < riposte.chance) {
      this.host.broadcast(MSG.attack, { from: sessionId, x: p.x, y: p.y, tx: attacker.x, ty: attacker.y, ms: 0 } satisfies AttackMessage);
      const counter = rollDamage(this.random, this.baseDamage(sessionId, p, "basic") * riposte.damage);
      this.damageMonster(attacker, counter, { attacker: sessionId, fromX: p.x, fromY: p.y, fx: "slash" }, "riposte");
    }
    // Fortaleza Viva: quem bate fica lento.
    const slow = buff?.slowAttackers;
    const brain = this.brains.get(attacker.id);
    if (slow && brain) {
      brain.slowPct = Math.max(now < brain.slowUntil ? brain.slowPct : 0, slow.pct);
      brain.slowUntil = Math.max(brain.slowUntil, now + slow.ms);
      attacker.slowed = true;
      seat.stats.ccMs.slow += slow.ms;
    }
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
      attacker: dot.monsterId, fromX: p.x, fromY: p.y, fx: "bite", special: true, dot: p.dot as DotKind,
    });
  }

  // --- Efeitos de monstro nos heróis -------------------------------------------------

  /** Veneno, queimadura ou sangramento de monstro: um novo substitui o antigo se for mais forte ou se o antigo estiver acabando. */
  private dotHero(sessionId: string, kind: DotKind, damage: number, ms: number, m: Monster) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return;
    const now = this.host.now();
    if (!seat.dot || damage >= seat.dot.damage || seat.dot.until < now + ms) {
      seat.dot = { damage, monsterId: m.id, kind: m.kind as MonsterKind, nextAt: now + 1000, until: now + ms };
      p.dot = kind;
    }
  }

  private slowHero(sessionId: string, factor: number, ms: number) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return;
    seat.slow = { factor: Math.min(factor, seat.slow?.factor ?? 1), until: this.host.now() + ms };
    p.slowed = true;
  }

  /**
   * Efeito de monstro num herói. Controle (preso, atordoado, engolido, cego) dura no máximo `CONTROL_MAX_MS`, não
   * se renova enquanto dura e, ao acabar, o herói fica `CONTROL_IMMUNE_MS` imune ao mesmo efeito. Corroído acumula.
   */
  private affectHero(sessionId: string, effect: HeroEffect, m: Monster, damage: number) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat || p.status !== "playing") return false;
    const now = this.host.now();
    const kind = effect.kind;
    const current = seat.effects[kind];
    if (CONTROL_EFFECTS.includes(kind)) {
      if (current && now < current.until) return false;
      if (now < (seat.effectImmuneUntil[kind] ?? 0)) return false;
      const ms = Math.min(effect.ms, CONTROL_MAX_MS);
      seat.effects[kind] = {
        until: now + ms, stacks: 1,
        ...(kind === "engulf" ? { by: m.id, perSec: Math.max(1, Math.round(damage * (effect.power ?? 0.5))), nextAt: now + 1000 } : {}),
      };
      seat.effectImmuneUntil[kind] = now + ms + CONTROL_IMMUNE_MS;
      bump(seat.stats.ccTaken, kind, ms);
    } else {
      const stacks = current && now < current.until ? Math.min(CORRODE_MAX, current.stacks + 1) : 1;
      seat.effects[kind] = { until: now + effect.ms, stacks };
      bump(seat.stats.ccTaken, kind, effect.ms);
    }
    this.syncEffects(p, seat);
    return true;
  }

  /** Solta o herói engolido (o monstro morreu ou apanhou demais). */
  private releaseEngulf(sessionId: string) {
    const p = this.state.players.get(sessionId);
    const seat = this.seats.get(sessionId);
    if (!p || !seat?.effects.engulf) return;
    const by = seat.effects.engulf.by;
    delete seat.effects.engulf;
    const brain = by ? this.brains.get(by) : undefined;
    if (brain?.engulfing === sessionId) brain.engulfing = null;
    this.syncEffects(p, seat);
  }

  /** Fim dos efeitos e pulsos de quem está engolido. */
  private tickEffects(sessionId: string, p: Player, seat: Seat, now: number) {
    let changed = false;
    for (const kind of Object.keys(seat.effects) as HeroEffectKind[]) {
      const e = seat.effects[kind]!;
      if (p.status !== "playing" || now >= e.until || (kind === "engulf" && (!e.by || !this.state.monsters.has(e.by)))) {
        if (kind === "engulf") this.releaseEngulf(sessionId);
        else delete seat.effects[kind];
        changed = true;
        continue;
      }
      if (kind === "engulf" && e.nextAt !== undefined && now >= e.nextAt) {
        e.nextAt += 1000;
        this.damagePlayer(sessionId, e.perSec ?? 1, { attacker: e.by!, fromX: p.x, fromY: p.y, fx: "bite", special: true, ability: "engulf" });
      }
    }
    if (changed) this.syncEffects(p, seat);
  }

  private syncEffects(p: Player, seat: Seat) {
    const now = this.host.now();
    const active = (Object.keys(seat.effects) as HeroEffectKind[]).filter((k) => now < seat.effects[k]!.until);
    const text = active.join(",");
    if (p.effects !== text) p.effects = text;
  }

  /** O herói está sob algum destes efeitos agora. */
  private held(seat: Seat, ...kinds: HeroEffectKind[]) {
    const now = this.host.now();
    return kinds.some((k) => { const e = seat.effects[k]; return !!e && now < e.until; });
  }

  private occupiedTiles() {
    const w = this.dungeon.width;
    const set = new Set<number>();
    this.state.monsters.forEach((m) => set.add(m.y * w + m.x));
    this.state.summons.forEach((s) => set.add(s.y * w + s.x));
    this.state.players.forEach((p) => { if (p.status === "playing") set.add(p.y * w + p.x); });
    // Muralha Mágica: ninguém atravessa (monstros e criaturas desviam pelo pathfinding).
    this.state.fields.forEach((f) => { if (f.kind === "wall") set.add(f.y * w + f.x); });
    return set;
  }

  private wallAt(x: number, y: number) {
    return [...this.state.fields.values()].some((f) => f.kind === "wall" && f.x === x && f.y === y);
  }

  // --- Baús -------------------------------------------------------------

  private openChests() {
    this.state.chests.forEach((chest) => {
      if (chest.locked || chest.opened || chest.rune) return;
      this.state.players.forEach((p, sessionId) => {
        if (chest.opened || p.status !== "playing" || p.bot || tileDistance(p.x, p.y, chest.x, chest.y) > 1) return;
        chest.opened = true;
        this.chestReward(sessionId, p, chest.x, chest.y, this.chestDepth.get(chest.id) ?? 0);
      });
    });
  }

  /** O que um baú dá (aberto ou o Mímico morto): loot para quem abriu, um item melhor que o do mini-boss e poções. */
  private chestReward(sessionId: string, p: Player, x: number, y: number, depth: number) {
    const value = Math.round(rollRange(this.random, CHEST_LOOT) * (1 + DEPTH_SCALING * depth) * (this.map.lootScale ?? 1));
    p.loot += value;
    const stats = this.seats.get(sessionId)?.stats;
    if (stats) {
      stats.loot.chests += value;
      stats.chestsOpened++;
    }
    this.notice(x, y, `Baú: +${value} loot`, 0xf1c40f);
    // O item do baú sai sempre; as poções, com a chance do mapa.
    this.dropItem(rollItem("miniboss", depth, this.random, 1, this.partyClasses()), x, y);
    for (const potion of POTION_IDS) if (this.keepDrop()) this.dropItem(potion, x, y);
  }

  /** Faixa de loot com a fração do mapa (`MapDef.lootScale`). */
  private scaleLoot(min: number, max: number): [number, number] {
    const k = this.map.lootScale ?? 1;
    return [Math.round(min * k), Math.round(max * k)];
  }

  /** Um drop (item ou poção) sai com a chance do mapa (`MapDef.dropScale`, padrão: sempre). */
  private keepDrop() {
    const k = this.map.dropScale ?? 1;
    return k >= 1 || this.random() < k;
  }

  /** Tira um monstro do mapa sem morte nem recompensa (ilusões que somem). */
  private vanishMonster(id: string) {
    const m = this.state.monsters.get(id);
    const brain = this.brains.get(id);
    if (!m || !brain) return;
    this.ai.died(brain);
    this.state.monsters.delete(id);
    this.brains.delete(id);
    this.state.players.forEach((p) => { if (p.target === id) p.target = ""; });
  }

  // --- Itens ------------------------------------------------------------

  /** O tile dado, ou um vizinho andável se ele for onde abre o portal do boss. */
  private besidePortal(x: number, y: number) {
    const c = this.dungeon.bossPortal;
    if (x !== c.x || y !== c.y) return { x, y };
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (isWalkable(this.dungeon, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
    return { x, y };
  }

  /** Classes da equipe (sem os bots): os drops saem só do que alguém dela pode usar. */
  private partyClasses() {
    return [...new Set([...this.state.players.values()].filter((p) => !p.bot).map((p) => p.classId as ClassId))];
  }

  private dropItem(itemId: string, x: number, y: number) {
    const item = new GroundItem();
    item.id = `i${this.nextItemId++}`;
    item.itemId = itemId;
    item.x = x;
    item.y = y;
    this.state.items.set(item.id, item);
    this.itemExpiresAt.set(item.id, this.host.now() + ITEM_LIFETIME_MS);
    return item;
  }

  /** Some com o item do chão (pego ou expirado). */
  private removeGroundItem(id: string) {
    this.state.items.delete(id);
    this.itemExpiresAt.delete(id);
    this.pickupBlocked.delete(id);
  }

  // Menu da bag na hunt: o cliente só manda a intenção; aqui se valida e se troca.

  bagEquip(sessionId: string, msg: BagEquipMessage) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing" || this.state.phase === "ended" || !isBagIndex(msg?.index, p.bag.length)) return;
    const def = ITEMS[p.bag[msg.index]];
    if (!def) return;
    if (!canUse(def.id, p.classId as ClassId)) {
      this.notice(p.x, p.y - 1, `${CLASSES[p.classId as ClassId].name} não usa`, 0xe74c3c);
      return;
    }
    // Troca de lugar: o item da bag veste, o que estava no slot ocupa a mesma posição da bag.
    const old = p[def.slot];
    p[def.slot] = def.id;
    if (old) p.bag[msg.index] = old;
    else p.bag.splice(msg.index, 1);
    this.refreshGear(sessionId);
  }

  unequip(sessionId: string, msg: UnequipMessage) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing" || this.state.phase === "ended" || !isItemSlot(msg?.slot)) return;
    if (!p[msg.slot] || p.bag.length >= BAG_SIZE) return;
    p.bag.push(p[msg.slot]);
    p[msg.slot] = "";
    this.refreshGear(sessionId);
  }

  bagDrop(sessionId: string, msg: BagDropMessage) {
    const p = this.state.players.get(sessionId);
    if (!p || p.status !== "playing" || this.state.phase !== "running" || !isBagIndex(msg?.index, p.bag.length)) return;
    const [itemId] = p.bag.splice(msg.index, 1);
    const ground = this.dropItem(itemId, p.x, p.y);
    this.pickupBlocked.set(ground.id, sessionId);
    this.seats.get(sessionId)?.stats.items.dropped.push(itemId);
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
      // Bot não pega nada do chão: itens e poções ficam para os humanos.
      if (p.status !== "playing" || p.bot) return;
      const here = [...this.state.items.values()]
        .filter((it) => it.x === p.x && it.y === p.y && this.pickupBlocked.get(it.id) !== sessionId && (!it.owner || it.owner === sessionId))
        .sort((a, b) => itemScore(b.itemId) - itemScore(a.itemId));
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
        const seat = this.seats.get(sessionId);
        if (isRune(ground.itemId)) {
          // Runa vai sempre para a bag (só se equipa no menu, fora da dungeon).
          if (p.bag.length >= BAG_SIZE) {
            this.bagFull(p, seat);
            continue;
          }
          p.bag.push(ground.itemId);
          seat?.stats.items.picked.push(ground.itemId);
          this.removeGroundItem(ground.id);
          this.notice(p.x, p.y - 1, `${RUNES[ground.itemId].name} 🎒${p.bag.length}/${BAG_SIZE}`, RUNES[ground.itemId].color);
          continue;
        }
        const def = ITEMS[ground.itemId];
        if (!def) continue;
        const action = pickupAction(def.id, p[def.slot], p.bag.length, p.classId as ClassId);
        if (action === "full") {
          this.bagFull(p, seat);
          continue;
        }
        if (action === "bag") p.bag.push(def.id);
        else {
          if (action === "swap") p.bag.push(p[def.slot]);
          p[def.slot] = def.id;
          this.refreshGear(sessionId);
        }
        seat?.stats.items.picked.push(def.id);
        this.removeGroundItem(ground.id);
        this.notice(p.x, p.y - 1, action === "bag" ? `${def.name} 🎒${p.bag.length}/${BAG_SIZE}` : def.name, itemColor(def.id));
      }
    });
  }

  /** Aviso de bag cheia, no máximo um a cada `BAG_FULL_NOTICE_MS`. */
  private bagFull(p: Player, seat: Seat | undefined) {
    const now = this.host.now();
    if (!seat || now < seat.bagFullNoticeUntil) return;
    seat.bagFullNoticeUntil = now + BAG_FULL_NOTICE_MS;
    seat.stats.items.bagFull++;
    this.notice(p.x, p.y - 1, "Bag cheia", 0xe74c3c);
  }

  private expireItems(now: number) {
    this.itemExpiresAt.forEach((at, id) => {
      if (now < at) return;
      this.removeGroundItem(id);
    });
  }

  private notice(x: number, y: number, text: string, color: number, ms?: number) {
    this.host.broadcast(MSG.notice, { x, y, text, color, ms } satisfies NoticeMessage);
  }

  /** Aviso que só um jogador vê. */
  private noticeTo(sessionId: string, x: number, y: number, text: string, color: number, ms?: number) {
    this.host.send(sessionId, MSG.notice, { x, y, text, color, ms } satisfies NoticeMessage);
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
    let lostBag: string[] = [];
    if (!survived) {
      const worn = ITEM_SLOTS.filter((slot) => player[slot]);
      const slot = worn[Math.floor(this.random() * worn.length)];
      if (slot) {
        lost = player[slot];
        this.dropItem(lost, player.x, player.y);
        // O corpo fica sem o que largou (o equipamento aparece no personagem).
        player[slot] = "";
      }
      for (const id of player.bag) this.dropItem(id, player.x, player.y);
      if (seat) seat.stats.items.lost = [...(lost ? [lost] : []), ...player.bag];
      lostBag = [...player.bag];
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
      seat.buff = null;
    }
    player.barrier = 0;
    player.buff = "";
    player.form = "";
    player.seeded = false;
    player.reborn = false;
    if (seat) {
      seat.form = null;
      seat.seed = null;
    }
    this.state.summons.forEach((s) => { if (s.owner === sessionId) this.removeSummon(s.id); });

    // O equipamento que sobrou no corpo e as runas voltam equipados para a conta; a bag de quem sai vivo vai para o cofre.
    const items = [...equipment(player).filter(Boolean), ...player.runes];
    const spells = seat ? this.spellProgress(player.classId as ClassId, seat, !survived) : [];
    const result: RunEndedMessage = { outcome, loot: player.loot, level: player.level, items, bag, lost, lostBag, spells };
    // O host avisa o jogador e grava o resultado na conta e na telemetria (bot não tem conta nem telemetria).
    if (!player.bot) {
      this.host.runEnded(sessionId, result, {
        name: player.name, classId: player.classId, partySize: this.state.players.size, mapId: this.map.id,
        seed: this.state.seed, outcome, level: player.level, durationS: this.seconds(), loot: player.loot,
        pathRooms: this.dungeon.path.length, stats: seat?.stats ?? newRunStats(),
      });
      // O último humano saiu: os bots saem junto.
      const players = [...this.state.players];
      if (!players.some(([, p]) => !p.bot && p.status === "playing")) {
        for (const [id, p] of players) if (p.bot) this.endRun(id, "escaped");
      }
    }

    const everyoneOut = [...this.state.players.values()].every((p) => p.status !== "playing");
    if (everyoneOut && this.state.phase !== "ended") {
      this.state.phase = "ended";
      this.host.ended();
    }
  }

  /**
   * XP de uso das magias escolhidas na hunt: o ganho (até o teto) e, na morte, a perda. O banco faz a mesma conta
   * em `record_spell_xp` a partir do XP gravado; aqui é para mostrar no fim da hunt.
   */
  private spellProgress(classId: ClassId, seat: Seat, died: boolean): SpellProgress[] {
    // Magia de runa de outra classe não ganha XP: ela não está no Grimório desta classe.
    return Object.values(seat.stats.spellsChosen).filter(({ id }) => SPELLS[id as SpellId]?.classId === classId).map(({ id }) => {
      const before = spellXpOf(TALENTS[spellTalentId(classId, id as SpellId)], seat.spellXp);
      const gained = Math.min(seat.stats.spellXp[id] ?? 0, SPELL_XP_HUNT_CAP);
      const xp = spellXpAfterRun(before, gained, died);
      return { id, gained, lost: before + gained - xp, xp, level: spellLevelFromXp(xp), levelBefore: spellLevelFromXp(before) };
    });
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

  /** Aura Sagrada (Traço): fração cortada do dano de quem está perto de um herói com ela (não acumula). */
  private allyWard(p: Player) {
    let best = 0;
    this.state.players.forEach((other, id) => {
      if (other.status !== "playing") return;
      for (const t of this.seats.get(id)?.traits ?? []) {
        if (t.allyWard && tileDistance(p.x, p.y, other.x, other.y) <= t.allyWard.radius) best = Math.max(best, t.allyWard.pct);
      }
    });
    return best;
  }

  /**
   * Aliado de uma magia com `aim: "ally"`: com mira, o herói vivo mais perto do ponto (a até 1 tile dele); no toque
   * rápido, o mais ferido (em fração da vida) ao alcance, contando quem conjura. Precisa de linha de visão.
   */
  private allyTarget(sessionId: string, p: Player, range: number, aim?: { x: number; y: number }) {
    let best: string | undefined;
    let score = Infinity;
    this.state.players.forEach((ally, id) => {
      if (ally.status !== "playing" || tileDistance(p.x, p.y, ally.x, ally.y) > range) return;
      if (!hasLineOfSight(this.dungeon, p.x, p.y, ally.x, ally.y)) return;
      let value: number;
      if (aim && Number.isFinite(aim.x) && Number.isFinite(aim.y)) {
        value = tileDistance(ally.x, ally.y, Math.round(aim.x), Math.round(aim.y));
        if (value > 1) return;
      } else {
        value = ally.hp / ally.maxHp + (id === sessionId ? 0.001 : 0);
      }
      if (value < score) { score = value; best = id; }
    });
    return best;
  }

  /**
   * Dano contínuo no monstro. Renova em vez de acumular: o novo substitui o antigo se for mais forte ou durar mais.
   * Toxina (Traço): o veneno de quem a tem acumula no mesmo monstro até o limite (cada camada soma um pulso).
   */
  private applyDot(
    m: Monster, brain: Brain, attacker: string, source: string, perTick: number, ms: number, kind: DotKind, now: number,
    burst?: { radius: number; amount: number; source: string },
  ) {
    // Morto-vivo não envenena nem sangra (tipo de criatura).
    if (immuneToDot(m.kind as MonsterKind, kind)) return;
    const until = now + ms;
    const old = brain.dot;
    const toxin = kind === "poison" ? this.seats.get(attacker)?.traits.find((t) => t.toxin)?.toxin : undefined;
    if (toxin && old?.kind === "poison" && old.attacker === attacker && now < old.until) {
      const stacks = Math.min(toxin.maxStacks, old.stacks + 1);
      const perStack = Math.max(old.perStack, perTick);
      brain.dot = { ...old, stacks, perStack, amount: perStack * stacks, until: Math.max(old.until, until), source, burst: burst ?? old.burst };
      m.dot = kind;
      return;
    }
    if (old && old.amount > perTick && old.until >= until) return;
    brain.dot = { amount: perTick, nextAt: now + 1000, until, attacker, source, kind, stacks: 1, perStack: perTick, burst };
    m.dot = kind;
  }

  /**
   * Põe um campo no chão. Conjurar de novo troca o campo mais antigo da mesma magia (o Engenhoso deixa até 3
   * armadilhas e estacas de cada e dobra a duração delas). `style` "fire" é o chão em chamas da Pólvora.
   */
  private placeField(sessionId: string, p: Player, seat: Seat, spell: SpellDef, rank: number, x: number, y: number, amount: number, style = "") {
    const def = spell.field!;
    const now = this.host.now();
    const traps = def.kind !== "zone" ? seat.traits.find((t) => t.traps)?.traps : undefined;
    const max = style === "fire" ? 3 : def.kind === "wall" ? def.length ?? 3 : traps?.max ?? 1;
    const mine = [...this.state.fields.values()]
      .filter((f) => f.owner === sessionId && f.spellId === spell.id && f.style === style)
      .sort((a, b) => (this.fieldBrains.get(a.id)?.until ?? 0) - (this.fieldBrains.get(b.id)?.until ?? 0));
    // A parede troca a anterior inteira (são vários tiles da mesma magia).
    if (def.kind === "wall") mine.forEach((old) => this.removeField(old.id));
    else while (mine.length >= max) this.removeField(mine.shift()!.id);
    if (def.kind === "wall") return this.placeWall(sessionId, p, spell, x, y, now);

    const f = new Field();
    f.id = `f${this.nextFieldId++}`;
    f.kind = def.kind;
    f.spellId = spell.id;
    f.style = style || (def.look ?? "");
    f.owner = sessionId;
    f.x = x;
    f.y = y;
    f.radius = def.kind === "turret" ? def.reach ?? 3 : spell.radius;
    this.state.fields.set(f.id, f);
    const tickMs = def.tickMs ?? 250;
    this.fieldBrains.set(f.id, {
      spell: { ...spell, field: undefined }, rank, kind: def.kind,
      amount: def.kind === "trap" ? amount : this.baseDamage(sessionId, p, "spell") * (def.damage ?? 0) || amount,
      allyArmor: def.allyArmor ?? 0, allyDamage: def.allyDamage ?? 0, allyHeal: def.allyHeal ?? 0, allyMana: def.allyMana ?? 0, rootMs: def.rootMs ?? 0, tickMs, nextTickAt: now + (def.kind === "turret" ? 300 : tickMs),
      until: now + def.ms * (traps?.durationScale ?? 1), shotsLeft: def.shots ?? 0,
    });
  }

  /**
   * Muralha Mágica: `length` tiles de lado para a direção do herói até o ponto, centrada no ponto. Só sobe em tile
   * andável e livre (nunca em cima de alguém nem do portal).
   */
  private placeWall(sessionId: string, p: Player, spell: SpellDef, x: number, y: number, now: number) {
    const def = spell.field!;
    const dx = Math.sign(x - p.x);
    const dy = Math.sign(y - p.y);
    // De lado: perpendicular à direção do tiro (na diagonal, a parede também fica na diagonal oposta).
    const [sx, sy] = dx === 0 && dy === 0 ? [1, 0] : [-dy, dx];
    const blocked = this.occupiedTiles();
    const half = Math.floor((def.length ?? 3) / 2);
    for (let k = -half; k <= half; k++) {
      const tx = x + sx * k;
      const ty = y + sy * k;
      if (!isWalkable(this.dungeon, tx, ty) || this.specialTile(tx, ty) || blocked.has(ty * this.dungeon.width + tx)) continue;
      const f = new Field();
      f.id = `f${this.nextFieldId++}`;
      f.kind = "wall";
      f.spellId = spell.id;
      f.owner = sessionId;
      f.x = tx;
      f.y = ty;
      this.state.fields.set(f.id, f);
      this.fieldBrains.set(f.id, {
        spell: { ...spell, field: undefined }, rank: 0, kind: "wall", amount: 0, allyArmor: 0, allyDamage: 0, allyHeal: 0, allyMana: 0, rootMs: 0,
        tickMs: 1000, nextTickAt: now + 1000, until: now + def.ms, shotsLeft: 0,
      });
    }
  }

  /** Empurra o monstro até `tiles` tiles para longe de quem bateu, parando em parede, água, alguém ou Muralha. */
  private push(m: Monster, from: { x: number; y: number }, tiles: number) {
    const dx = Math.sign(m.x - from.x);
    const dy = Math.sign(m.y - from.y);
    if (dx === 0 && dy === 0) return;
    const blocked = this.occupiedTiles();
    const w = this.dungeon.width;
    for (let i = 0; i < tiles; i++) {
      const nx = m.x + dx;
      const ny = m.y + dy;
      if (!isWalkable(this.dungeon, nx, ny) || blocked.has(ny * w + nx)) return;
      if (dx !== 0 && dy !== 0 && (!isWalkable(this.dungeon, nx, m.y) || !isWalkable(this.dungeon, m.x, ny))) return;
      blocked.delete(m.y * w + m.x);
      m.x = nx;
      m.y = ny;
      blocked.add(ny * w + nx);
    }
  }

  /**
   * Passo Nebuloso: o tile mais longe da reta até (tx, ty), a até `tiles`, que esteja livre e andável (pula por cima de
   * monstros no caminho; a reta já para na parede, então o herói sempre vê onde aparece). Como o Rolamento, se essa
   * reta não tiver nenhum tile livre, tenta as diagonais (±45°) e as laterais (±90°); fugindo de um monstro
   * (`threat`), fica com o ponto que mais se afasta dele. Sem nenhum, null.
   */
  private teleportLanding(p: Player, tx: number, ty: number, tiles: number, threat?: { x: number; y: number }) {
    const blocked = this.occupiedTiles();
    const free = (t: { x: number; y: number }) =>
      isWalkable(this.dungeon, t.x, t.y) && !this.specialTile(t.x, t.y) && !blocked.has(t.y * this.dungeon.width + t.x);
    const base = Math.atan2(ty - p.y, tx - p.x);
    let best: { x: number; y: number } | null = null;
    let bestGap = threat ? tileDistance(p.x, p.y, threat.x, threat.y) : 0;
    for (const turn of [0, 1, -1, 2, -2]) {
      const angle = base + (turn * Math.PI) / 4;
      const path = lineTiles(this.dungeon, p.x, p.y, p.x + Math.round(Math.cos(angle) * tiles), p.y + Math.round(Math.sin(angle) * tiles), tiles);
      const end = [...path].reverse().find(free);
      if (!end) continue;
      if (!threat) return end;
      const gap = tileDistance(end.x, end.y, threat.x, threat.y);
      if (gap > bestGap) {
        best = end;
        bestGap = gap;
      }
    }
    return best;
  }

  private removeField(id: string) {
    this.state.fields.delete(id);
    this.fieldBrains.delete(id);
  }

  /** Pulsos dos campos: a zona fere e protege, a armadilha espera um monstro pisar, a estaca atira. */
  private tickFields(now: number) {
    for (const f of [...this.state.fields.values()]) {
      const brain = this.fieldBrains.get(f.id);
      const owner = this.state.players.get(f.owner);
      const seat = this.seats.get(f.owner);
      if (!brain || !owner || !seat || owner.status !== "playing" || now >= brain.until) {
        this.removeField(f.id);
        continue;
      }
      if (now < brain.nextTickAt) continue;
      brain.nextTickAt += brain.tickMs;
      const sees = (x: number, y: number, reach: number) =>
        tileDistance(f.x, f.y, x, y) <= reach && hasLineOfSight(this.dungeon, f.x, f.y, x, y);

      if (brain.kind === "wall") continue;
      if (brain.kind === "zone") {
        const hit: Hit = { attacker: f.owner, fromX: f.x, fromY: f.y, fx: f.style === "fire" ? "fire" : CLASSES[owner.classId as ClassId].attackFx };
        for (const m of [...this.state.monsters.values()]) {
          if (!sees(m.x, m.y, f.radius)) continue;
          const mBrain = this.brains.get(m.id);
          if (brain.rootMs > 0 && mBrain) {
            this.root(m, mBrain, now + brain.rootMs);
            seat.stats.ccMs.root += brain.rootMs;
          }
          // Nuvem Venenosa: cada pulso envenena (com a Toxina, acumula).
          const dot = brain.spell.dot;
          if (dot && mBrain) this.applyDot(m, mBrain, f.owner, brain.spell.id, this.baseDamage(f.owner, owner, "spell") * dot.perSec, dot.ms, dot.kind, now);
          if (brain.amount > 0) this.damageMonster(m, Math.max(1, rollDamage(this.random, brain.amount)), hit, brain.spell.id);
        }
        // Chuva Revigorante: cura e devolve mana a quem está dentro.
        if (brain.allyHeal > 0 || brain.allyMana > 0) {
          this.state.players.forEach((ally) => {
            if (ally.status !== "playing" || !sees(ally.x, ally.y, f.radius)) return;
            if (brain.allyHeal > 0) this.healPlayer(ally, Math.max(1, Math.round(ally.maxHp * brain.allyHeal)), f.owner);
            if (brain.allyMana > 0) this.giveMana(ally, Math.max(1, Math.round(ally.maxMana * brain.allyMana)), f.owner);
          });
        }
        if (brain.allyArmor > 0 || brain.allyDamage > 0) {
          this.state.players.forEach((ally, id) => {
            const allySeat = this.seats.get(id);
            if (ally.status !== "playing" || !allySeat || !sees(ally.x, ally.y, f.radius)) return;
            allySeat.fieldArmor = brain.allyArmor;
            allySeat.fieldArmorUntil = now + brain.tickMs + 100;
            allySeat.fieldDamage = brain.allyDamage;
            allySeat.fieldDamageUntil = now + brain.tickMs + 100;
          });
        }
      } else if (brain.kind === "trap") {
        // Dispara no primeiro monstro que pisar no tile da armadilha; os efeitos valem no raio da magia.
        const prey = [...this.state.monsters.values()].find((m) => m.x === f.x && m.y === f.y);
        if (!prey) continue;
        this.removeField(f.id);
        this.host.broadcast(MSG.spell, { from: f.owner, spellId: brain.spell.id, x: f.x, y: f.y, tx: f.x, ty: f.y, ms: 0, echo: true } satisfies SpellMessage);
        this.applySpell(f.owner, brain.spell, brain.rank, undefined, f.x, f.y, brain.amount, undefined, 0);
      } else {
        const target = this.nearestMonsterTo(f.x, f.y, f.radius);
        if (!target) continue;
        brain.shotsLeft--;
        // O raio da Fúria dos Céus cai do céu quase na hora; a flecha da estaca voa até o alvo.
        const ms = f.style === "storm" ? 150 : flightMs(18, f.x, f.y, target.x, target.y);
        this.host.broadcast(MSG.spell, { from: f.owner, spellId: brain.spell.id, x: f.x, y: f.y, tx: target.x, ty: target.y, ms, echo: true } satisfies SpellMessage);
        const hit: Hit = { attacker: f.owner, fromX: f.x, fromY: f.y, fx: "arrow" };
        const amount = rollDamage(this.random, brain.amount);
        // Estática (Traço) vale também para os raios da Fúria dos Céus (magia de energia).
        const stun = seat.traits.find((t) => t.stunChance && t.stunChance.element === brain.spell.element)?.stunChance;
        this.after(ms, () => {
          const alive = this.state.monsters.get(target.id);
          const aliveBrain = alive && this.brains.get(alive.id);
          if (!alive || !aliveBrain) return;
          if (stun && this.random() < stun.chance) {
            aliveBrain.stunnedUntil = Math.max(aliveBrain.stunnedUntil, this.host.now() + stun.ms);
            alive.stunned = true;
            seat.stats.ccMs.stun += stun.ms;
          }
          this.damageMonster(alive, amount, hit, brain.spell.id);
        });
        if (brain.shotsLeft <= 0) this.removeField(f.id);
      }
    }
  }

  /** Velocidade de movimento agora: classe e nível, lentidão dos monstros, Passo Leve, bônus em si e Forma de Pantera. */
  private moveSpeed(p: Player, seat: Seat, now: number) {
    const base = statsFor(p.classId as ClassId, p.level, seat.bonus).speed * (seat.slow?.factor ?? 1);
    const haste = now < seat.hasteUntil ? seat.traits.reduce((sum, t) => sum + (t.castHaste?.speed ?? 0), 0) : 0;
    const buff = seat.buff && now < seat.buff.until ? seat.buff.moveSpeed : 0;
    const form = seat.form && now < seat.form.until ? seat.form.moveSpeed : 0;
    return base * Math.max(0.2, 1 + haste + buff + form);
  }

  /** Olho de Águia (Traço): mais dano em monstro longe de quem bate. */
  private farBonus(seat: Seat, from: { x: number; y: number }, m: Monster) {
    let bonus = 1;
    for (const t of seat.traits) {
      if (t.farDamage && tileDistance(from.x, from.y, m.x, m.y) >= t.farDamage.minTiles) bonus += t.farDamage.bonus;
    }
    return bonus;
  }

  /**
   * Onde o Rolamento pousa, saltando até `tiles` na direção de (tx, ty). Se essa reta estiver bloqueada logo de cara
   * (parede, portal, monstro), tenta as diagonais (±45°) e as laterais (±90°). Fugindo de um monstro (`threat`),
   * fica com o pouso que mais se afasta dele, e só vale pouso que aumenta a distância; mirado, com a direção mais
   * próxima da escolhida. Sem nenhum pouso, devolve null.
   */
  private dashLanding(p: Player, tx: number, ty: number, tiles: number, threat?: { x: number; y: number }) {
    const base = Math.atan2(ty - p.y, tx - p.x);
    const gap = threat ? tileDistance(p.x, p.y, threat.x, threat.y) : 0;
    let best: { x: number; y: number } | null = null;
    let bestGap = gap;
    for (const turn of [0, 1, -1, 2, -2]) {
      const angle = base + (turn * Math.PI) / 4;
      const end = this.dashPath(p, p.x + Math.round(Math.cos(angle) * tiles), p.y + Math.round(Math.sin(angle) * tiles), tiles);
      if (end.x === p.x && end.y === p.y) continue;
      if (!threat) return end;
      const after = tileDistance(end.x, end.y, threat.x, threat.y);
      if (after > bestGap) {
        best = end;
        bestGap = after;
      }
    }
    return best;
  }

  /** Último tile livre da reta do Rolamento (para antes de parede, portal ou alguém; não corta quina de parede). */
  private dashPath(p: Player, tx: number, ty: number, tiles: number) {
    const path = lineTiles(this.dungeon, p.x, p.y, tx, ty, tiles);
    const blocked = this.occupiedTiles();
    const w = this.dungeon.width;
    let last = { x: p.x, y: p.y };
    for (const t of path) {
      if (!isWalkable(this.dungeon, t.x, t.y) || this.specialTile(t.x, t.y) || blocked.has(t.y * w + t.x)) break;
      if (t.x !== last.x && t.y !== last.y && (!isWalkable(this.dungeon, t.x, last.y) || !isWalkable(this.dungeon, last.x, t.y))) break;
      last = t;
    }
    return last;
  }

  /**
   * Dano base do jogador (classe, nível, áureas e equipamento), antes da variação. O ataque básico usa o
   * dano da arma; magias, invocações e campos usam o dano mágico (varinhas, cajados e alguns itens mágicos).
   */
  private baseDamage(sessionId: string, p: Player, kind: "basic" | "spell") {
    const seat = this.seats.get(sessionId);
    const gear = kind === "basic" ? seat?.gear.damage ?? 0 : seat?.gear.spellPower ?? 0;
    return statsFor(p.classId as ClassId, p.level, seat?.bonus).damage * (1 + gear) * this.damageBonus(seat, p);
  }

  /**
   * Bônus de dano de Traços e campos: Sede de Batalha (por monstro colado), Liderança (o maior entre os líderes por perto,
   * contando o próprio herói) e o Estandarte de Guerra.
   */
  private damageBonus(seat: Seat | undefined, p: Player) {
    if (!seat) return 1;
    let bonus = 1;
    const crowd = seat.traits.find((t) => t.crowdDamage)?.crowdDamage;
    if (crowd) {
      let near = 0;
      this.state.monsters.forEach((m) => { if (tileDistance(p.x, p.y, m.x, m.y) <= 1) near++; });
      bonus += crowd.perMonster * Math.min(crowd.max, near);
    }
    let lead = 0;
    this.state.players.forEach((other, id) => {
      if (other.status !== "playing") return;
      for (const t of this.seats.get(id)?.traits ?? []) {
        if (t.leadership && tileDistance(p.x, p.y, other.x, other.y) <= t.leadership.radius) lead = Math.max(lead, t.leadership.pct);
      }
    });
    bonus += lead;
    if (this.host.now() < seat.fieldDamageUntil) bonus += seat.fieldDamage;
    return bonus;
  }

  /** Intervir (Traço): o Guardião vivo mais perto (que não seja o próprio herói) dentro do raio dele. */
  private guardianFor(sessionId: string, p: Player) {
    let best: { id: string; pct: number } | null = null;
    let bestDist = Infinity;
    this.state.players.forEach((other, id) => {
      if (id === sessionId || other.status !== "playing") return;
      const t = this.seats.get(id)?.traits.find((x) => x.intervene)?.intervene;
      const dist = tileDistance(p.x, p.y, other.x, other.y);
      if (!t || dist > t.radius || dist >= bestDist) return;
      best = { id, pct: t.pct };
      bestDist = dist;
    });
    return best as { id: string; pct: number } | null;
  }

  /** Corrente de Ferro: leva o monstro para o tile livre colado no herói mais perto dele (fica onde está se não houver). */
  private pullTo(m: Monster, p: Player) {
    if (tileDistance(p.x, p.y, m.x, m.y) <= 1) return;
    const blocked = this.occupiedTiles();
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = p.x + dx;
        const y = p.y + dy;
        if ((dx === 0 && dy === 0) || !isWalkable(this.dungeon, x, y) || this.specialTile(x, y)) continue;
        if (blocked.has(y * this.dungeon.width + x) || !hasLineOfSight(this.dungeon, m.x, m.y, x, y)) continue;
        const dist = Math.hypot(x - m.x, y - m.y);
        if (dist < bestDist) {
          best = { x, y };
          bestDist = dist;
        }
      }
    }
    if (!best) return;
    m.x = best.x;
    m.y = best.y;
  }
}

function spellIn(p: Player, slot: SpellSlot) {
  return slot === 0 ? p.spell1 : p.spell2;
}

function equipment(p: Player) {
  return ITEM_SLOTS.map((slot) => p[slot]);
}

function rollRange(random: () => number, [min, max]: [number, number]) {
  return min + Math.floor(random() * (max - min + 1));
}
