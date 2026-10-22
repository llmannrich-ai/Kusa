import {
  COOLDOWN_JITTER,
  ENRAGE_COOLDOWN,
  ENRAGE_HP,
  MONSTER_SPEED_SCALE,
  MSG,
  SPECIAL_FIRST_DELAY,
  Tile,
  abilityTiles,
  elementMultiplier,
  hasLineOfSight,
  isWalkable,
  tileAt,
  tileDistance,
  type DamageElement,
  type DamageMessage,
  type DotKind,
  type Dungeon,
  type HeroEffect,
  type MonsterAbility,
  type MonsterDef,
  type MonsterKind,
  type MonsterStats,
  type MonsterStrikeMessage,
} from "@kusa/shared";
import { nextStep } from "./pathfinding.ts";
import type { DungeonState, Monster, Summon } from "./state.ts";

/** Quem deu o golpe e como, repassado ao cliente para desenhar o ataque. */
export type Hit = Pick<DamageMessage, "attacker" | "fromX" | "fromY" | "fx" | "special" | "dot" | "ability">;

/** Quantos tiles além do aggro range o monstro ainda persegue antes de desistir. */
const LEASH_TILES = 4;
/** Intervalo mínimo entre dois avisos de resistência/imunidade no mesmo monstro. */
const ELEMENT_NOTICE_MS = 1500;
/** Engolido: o herói sai se os aliados tirarem esta fração da vida do monstro. */
const ENGULF_BREAK = 0.15;
/** Cabeças extras da Hidra (sem outro alvo) mordem o alvo com este multiplicador. */
const EXTRA_HEAD_POWER = 0.5;
/** Intervalo entre as mordidas do Multiataque. */
const MULTIATTACK_GAP_MS = 120;

/** Dados do monstro que só o servidor precisa (o cliente vê só o schema `Monster`). */
export interface Brain {
  def: MonsterDef;
  depth: number;
  damage: number;
  xp: number;
  loot: [number, number];
  nextMoveAt: number;
  nextAttackAt: number;
  /** sessionId do jogador perseguido (ou id da criatura invocada). */
  targetId: string | null;
  /** Quem acertou o monstro: dividem a XP da morte. */
  participants: Set<string>;
  /** Baú liberado quando este mini-boss morre. */
  chestId?: string;
  /** Preso por raízes até este momento (ms). */
  rootedUntil: number;
  /** Atordoado até este momento (ms). */
  stunnedUntil: number;
  /** Lento até este momento (ms), perdendo `slowPct` da velocidade. */
  slowUntil: number;
  slowPct: number;
  /** Marcado (Marca do Caçador) até este momento: recebe +`markPct` de dano de qualquer fonte. */
  markUntil: number;
  markPct: number;
  /**
   * Dano contínuo ativo: `amount` por pulso de 1 s até `until`, creditado a `attacker` na fonte `source`. Com a Toxina,
   * o veneno acumula (`stacks` vezes o pulso de `perStack`). `burst`: explode se o monstro morrer com ele (Picada da Mamba).
   */
  dot: {
    amount: number; nextAt: number; until: number; attacker: string; source: string; kind: DotKind; stacks: number; perStack: number;
    burst?: { radius: number; amount: number; source: string };
  } | null;
  /** Quem provocou o monstro por último (Intimidar corta o dano dele nesse herói). */
  tauntedBy: string | null;
  /** Quando cada habilidade pode sair de novo (vazio = ainda não notou ninguém). */
  abilityReadyAt: Record<string, number>;
  /** Trocas de fase já feitas e habilidades `once` já usadas. */
  phased: Set<string>;
  used: Set<string>;
  /** Boss já se enfureceu (aviso dado uma vez). */
  enraged: boolean;
  /** Invulnerável (voando, submerso) até este momento. */
  invulnerableUntil: number;
  /** Escondido por habilidade ou por piscar até este momento (0 = não). */
  hiddenUntil: number;
  /** Camuflado desde que nasceu, até notar alguém ou levar dano. */
  camouflaged: boolean;
  /** No ar (`dive`): a queda já está marcada. */
  diving: boolean;
  nextBlinkAt: number;
  nextRegenAt: number;
  regenBlockedUntil: number;
  fortitudeUsed: boolean;
  /** Divisão: quantos pedaços a família já tem (compartilhado entre os pedaços). */
  family: { count: number } | null;
  heads: number;
  headCuts: number;
  /** As cabeças cortadas crescem de novo neste momento (0 = nada pendente). */
  regrowAt: number;
  hitAndRunAt: number;
  /** Quem já levou o Ataque Surpresa. */
  struck: Set<string>;
  /** Herói engolido agora e o dano que o monstro levou desde então. */
  engulfing: string | null;
  engulfTaken: number;
  lastElementNotice: number;
  lastRegenNotice: number;
}

/** O que a IA dos monstros precisa da hunt (a `Hunt` liga cada função aos seus métodos). */
export interface MonsterWorld {
  state: DungeonState;
  dungeon: Dungeon;
  brains: Map<string, Brain>;
  now(): number;
  after(ms: number, fn: () => void): void;
  broadcast(type: string, msg: unknown): void;
  notice(x: number, y: number, text: string, color: number, ms?: number): void;
  damagePlayer(sessionId: string, raw: number, hit: Hit): void;
  damageSummon(s: Summon, raw: number, hit: Hit): void;
  /** Efeito de monstro num herói (preso, atordoado, engolido...). */
  affectHero(sessionId: string, effect: HeroEffect, m: Monster, damage: number): void;
  /** Veneno, queimadura ou sangramento de monstro num herói. */
  dotHero(sessionId: string, kind: DotKind, damage: number, ms: number, m: Monster): void;
  slowHero(sessionId: string, factor: number, ms: number): void;
  /** Solta o herói engolido por este monstro. */
  releaseEngulf(sessionId: string): void;
  occupiedTiles(): Set<number>;
  spawnMonster(kind: MonsterKind, x: number, y: number, depth: number): Monster;
}

export class MonsterAi {
  constructor(private w: MonsterWorld) {}

  newBrain(def: MonsterDef, depth: number, stats: MonsterStats): Brain {
    const heads = def.traits?.heads?.start ?? 0;
    return {
      def, depth, damage: stats.damage, xp: stats.xp, loot: stats.loot,
      nextMoveAt: 0, nextAttackAt: 0, targetId: null, participants: new Set(), rootedUntil: 0, stunnedUntil: 0, slowUntil: 0, slowPct: 0,
      markUntil: 0, markPct: 0, dot: null, tauntedBy: null, abilityReadyAt: {}, phased: new Set(), used: new Set(), enraged: false,
      invulnerableUntil: 0, hiddenUntil: 0, camouflaged: !!def.traits?.camouflage, diving: false, nextBlinkAt: 0, nextRegenAt: 0,
      regenBlockedUntil: 0, fortitudeUsed: false, family: def.traits?.split ? { count: 1 } : null, heads, headCuts: 0, regrowAt: 0,
      hitAndRunAt: 0, struck: new Set(), engulfing: null, engulfTaken: 0, lastElementNotice: 0, lastRegenNotice: 0,
    };
  }

  /** O monstro acabou de nascer: camuflado começa escondido; a Hidra mostra as cabeças. */
  spawned(m: Monster, brain: Brain) {
    if (brain.camouflaged) m.hidden = true;
    if (brain.heads > 0) m.variant = brain.heads;
  }

  think(m: Monster, now: number) {
    const brain = this.w.brains.get(m.id);
    if (!brain) return;
    const def = brain.def;
    this.upkeep(m, brain, now);
    // No ar ou submerso: a queda já está marcada.
    if (brain.diving) return;
    // Atordoado: não anda nem ataca.
    if (m.stunned) return;
    if (brain.engulfing && !this.w.state.players.has(brain.engulfing)) brain.engulfing = null;

    // Desiste de quem morreu, saiu ou fugiu para longe.
    if (brain.targetId) {
      const t = this.foe(brain.targetId);
      if (!t || tileDistance(m.x, m.y, t.x, t.y) > def.aggroRange + LEASH_TILES) brain.targetId = null;
    }
    if (!brain.targetId) brain.targetId = this.nearestVisibleFoe(m, def.aggroRange);
    if (!brain.targetId) return;
    // Camuflado: aparece quando nota alguém.
    if (brain.camouflaged) this.reveal(m, brain);

    const targetId = brain.targetId;
    const target = this.foe(targetId)!;
    const dist = tileDistance(m.x, m.y, target.x, target.y);
    const sees = hasLineOfSight(this.w.dungeon, m.x, m.y, target.x, target.y);

    // Habilidades: a primeira de cada só sai um pouco depois de notar alguém (não junto com o aggro).
    if (def.abilities && !brain.engulfing) {
      for (const a of def.abilities) {
        if (brain.abilityReadyAt[a.id] === undefined) brain.abilityReadyAt[a.id] = now + a.cooldownMs * SPECIAL_FIRST_DELAY * jitter();
        if (now < brain.abilityReadyAt[a.id] || !this.usable(m, brain, a, dist, sees)) continue;
        if (this.useAbility(m, brain, a, targetId, target, now)) return;
      }
    }

    // Artilheiro: recua se o alvo chegar perto demais (e ainda dá tempo de atirar depois).
    const keep = def.traits?.keepDistance;
    if (keep && dist < keep && now >= brain.nextMoveAt && !m.rooted && !brain.engulfing && this.stepAway(m, brain, target, now)) return;

    if (dist <= def.attackRange && sees) {
      if (now >= brain.nextAttackAt) this.basicAttack(m, brain, targetId, target, now);
      return;
    }

    if (now < brain.nextMoveAt || m.rooted || brain.engulfing) return;
    const blocked = this.w.occupiedTiles();
    const step = nextStep(this.w.dungeon, m, target, def.attackRange, (x, y) => blocked.has(y * this.w.dungeon.width + x));
    if (!step) {
      // Sem caminho agora (corredor bloqueado): tenta de novo daqui a pouco.
      brain.nextMoveAt = now + 400;
      return;
    }
    this.stepTo(m, brain, step, now);
  }

  // --- Dano recebido -----------------------------------------------------------

  /**
   * Dano que o monstro leva de verdade, pelo elemento: imune, resiste, vulnerável, absorve (cura) e a Fortitude
   * Morta-viva. Voando ou submerso, nada pega.
   */
  adjustDamage(m: Monster, brain: Brain, raw: number, element: DamageElement): number {
    const now = this.w.now();
    if (now < brain.invulnerableUntil) return 0;
    const traits = brain.def.traits;
    if (traits?.absorb?.includes(element)) {
      const healed = Math.min(m.maxHp - m.hp, raw);
      if (healed > 0) m.hp += healed;
      this.elementNotice(m, brain, "Absorve!", 0x2ecc71);
      return 0;
    }
    const mult = elementMultiplier(m.kind as MonsterKind, element);
    let amount = mult === 0 ? 0 : Math.max(1, Math.round(raw * mult));
    if (mult === 0) this.elementNotice(m, brain, "Imune", 0xbdc3c7);
    else if (mult < 1) this.elementNotice(m, brain, "Resiste", 0xbdc3c7);
    else if (mult > 1) this.elementNotice(m, brain, "Vulnerável!", 0xf1c40f);
    const fortitude = traits?.fortitude;
    if (fortitude && !brain.fortitudeUsed && amount >= m.hp && !fortitude.except.includes(element)) {
      brain.fortitudeUsed = true;
      amount = m.hp - 1;
      this.w.notice(m.x, m.y - 1, "Fortitude Morta-viva!", 0x9fa86b);
    }
    return amount;
  }

  /** Depois do dano: aparece, para de regenerar, perde cabeça, se divide, solta quem engoliu, muda de fase. */
  afterDamage(m: Monster, brain: Brain, dealt: number, element: DamageElement) {
    const now = this.w.now();
    const traits = brain.def.traits;
    if (dealt <= 0) return;
    if (brain.camouflaged) this.reveal(m, brain);
    const regen = traits?.regeneration;
    if (regen && regen.stopBy.includes(element)) {
      if (now >= brain.regenBlockedUntil && now - brain.lastRegenNotice > 2000) {
        brain.lastRegenNotice = now;
        this.w.notice(m.x, m.y - 1, "Regeneração interrompida!", 0xff9f43);
      }
      brain.regenBlockedUntil = now + regen.stopMs;
    }
    const heads = traits?.heads;
    if (heads) {
      while (brain.heads > 1 && m.hp <= m.maxHp * (1 - heads.step * (brain.headCuts + 1))) {
        brain.headCuts++;
        brain.heads--;
        brain.regrowAt = now + heads.regrowMs;
        m.variant = brain.heads;
        this.w.notice(m.x, m.y - 1, "Cabeça cortada!", 0xff7675);
      }
      if (element === "fire" && brain.regrowAt > 0) {
        brain.regrowAt = 0;
        this.w.notice(m.x, m.y - 1, "Cauterizada!", 0xff9f43);
      }
    }
    const split = traits?.split;
    if (split && brain.family && m.hp > 1 && split.by.includes(element) && dealt >= m.maxHp * split.minHit && brain.family.count < split.max) {
      this.split(m, brain);
    }
    if (brain.engulfing) {
      brain.engulfTaken += dealt;
      if (brain.engulfTaken >= m.maxHp * ENGULF_BREAK) this.w.releaseEngulf(brain.engulfing);
    }
    this.checkPhases(m, brain, now);
  }

  /** O monstro morreu: solta quem estava engolido. */
  died(brain: Brain) {
    if (brain.engulfing) this.w.releaseEngulf(brain.engulfing);
  }

  /** Abaixo de `ENRAGE_HP` o boss se enfurece; ao cruzar a vida de uma fase, a habilidade dela sai na hora. */
  private checkPhases(m: Monster, brain: Brain, now: number) {
    if (!brain.enraged && brain.def.rank === "boss" && m.hp <= m.maxHp * ENRAGE_HP) {
      brain.enraged = true;
      for (const id of Object.keys(brain.abilityReadyAt)) brain.abilityReadyAt[id] = Math.min(brain.abilityReadyAt[id], now + 1500);
      this.w.notice(m.x, m.y - 1, `${brain.def.name} se enfurece!`, 0xff5e57);
    }
    for (const a of brain.def.abilities ?? []) {
      if (!a.phase || a.belowHp === undefined || brain.phased.has(a.id) || m.hp > m.maxHp * a.belowHp) continue;
      brain.phased.add(a.id);
      brain.abilityReadyAt[a.id] = now;
    }
  }

  // --- Habilidades ---------------------------------------------------------------

  private usable(m: Monster, brain: Brain, a: MonsterAbility, dist: number, sees: boolean) {
    if (a.belowHp !== undefined && m.hp > m.maxHp * a.belowHp) return false;
    if (a.once && brain.used.has(a.id)) return false;
    if (dist > a.range || dist < (a.minRange ?? 0)) return false;
    return sees;
  }

  /** Solta a habilidade (sem aviso). Devolve false se não deu (sem lugar para cair, alvo que não pode ser puxado...). */
  private useAbility(m: Monster, brain: Brain, a: MonsterAbility, targetId: string, target: { x: number; y: number }, now: number) {
    let tx = target.x;
    let ty = target.y;
    if (a.shape === "leap") {
      const spot = this.besideTarget(m, target);
      if (!spot) return false;
      m.x = spot.x;
      m.y = spot.y;
      tx = spot.x;
      ty = spot.y;
    } else if (a.shape === "pull") {
      if (!this.pull(m, targetId)) return false;
      const pulled = this.foe(targetId)!;
      tx = pulled.x;
      ty = pulled.y;
    } else if (a.shape === "line") {
      // A faixa vai até a ponta do alcance na direção do alvo (para o efeito).
      const len = Math.hypot(tx - m.x, ty - m.y) || 1;
      const reach = a.length ?? 1;
      tx = m.x + Math.round(((tx - m.x) / len) * reach);
      ty = m.y + Math.round(((ty - m.y) / len) * reach);
    }
    this.cooldown(brain, a, now);
    if (a.once) brain.used.add(a.id);
    // Não emenda o ataque básico logo depois da habilidade.
    brain.nextAttackAt = Math.max(brain.nextAttackAt, now + brain.def.attackCooldownMs * 0.5);

    if (a.shape === "dive") {
      this.dive(m, brain, a, targetId);
      return true;
    }
    if (a.shape === "vanish") {
      this.hide(m, brain, now + (a.vanishMs ?? 2000));
      this.strike(m, a, m.x, m.y, []);
      if (a.summon) this.summon(m, brain, a.summon.kind, a.summon.count);
      return true;
    }
    if (a.shape === "summon") {
      this.strike(m, a, m.x, m.y, []);
      if (a.summon) this.summon(m, brain, a.summon.kind, a.summon.count);
      return true;
    }
    const tiles = a.shape === "leap" && a.power === 0 ? [] : abilityTiles(this.w.dungeon, a, m.x, m.y, tx, ty);
    this.strike(m, a, tx, ty, tiles);
    this.hitArea(m, brain, a, tiles);
    if (a.effect?.kind === "engulf") {
      const hero = this.w.state.players.get(targetId);
      if (hero?.status === "playing" && tiles.some((t) => t.x === hero.x && t.y === hero.y)) {
        brain.engulfing = targetId;
        brain.engulfTaken = 0;
      }
    }
    if (a.selfHeal && m.hp > 0) {
      const healed = Math.min(m.maxHp - m.hp, Math.round(m.maxHp * a.selfHeal));
      if (healed > 0) {
        m.hp += healed;
        this.w.notice(m.x, m.y, `+${healed}`, 0x2ecc71);
      }
    }
    return true;
  }

  private cooldown(brain: Brain, a: MonsterAbility, now: number) {
    brain.abilityReadyAt[a.id] = now + a.cooldownMs * jitter() * (brain.enraged ? ENRAGE_COOLDOWN : 1);
  }

  private strike(m: Monster, a: MonsterAbility, tx: number, ty: number, tiles: { x: number; y: number }[], rising?: boolean) {
    this.w.broadcast(MSG.monsterStrike, {
      id: m.id, kind: m.kind as MonsterKind, ability: a.id, x: m.x, y: m.y, tx, ty, tiles: tiles.flatMap((t) => [t.x, t.y]),
      ...(rising ? { rising } : {}),
    } satisfies MonsterStrikeMessage);
  }

  /** Acerta os heróis e as criaturas invocadas nos tiles: dano, dano contínuo, lentidão, efeito e empurrão. */
  private hitArea(m: Monster, brain: Brain, a: MonsterAbility, tiles: { x: number; y: number }[]) {
    if (tiles.length === 0) return;
    const inArea = (x: number, y: number) => tiles.some((t) => t.x === x && t.y === y);
    const raw = brain.damage * a.power;
    const hit: Hit = { attacker: m.id, fromX: m.x, fromY: m.y, fx: brain.def.attackFx, special: true, ability: a.id };
    if (a.power > 0) {
      for (const s of [...this.w.state.summons.values()]) if (inArea(s.x, s.y)) this.w.damageSummon(s, rollDamage(raw), hit);
    }
    this.w.state.players.forEach((p, sessionId) => {
      if (p.status !== "playing" || !inArea(p.x, p.y)) return;
      if (a.power > 0) this.w.damagePlayer(sessionId, rollDamage(raw), hit);
      if (p.status !== "playing") return;
      if (a.dot) this.w.dotHero(sessionId, a.dot.kind, Math.max(1, Math.round(brain.damage * a.dot.power)), a.dot.durationMs, m);
      if (a.slow) this.w.slowHero(sessionId, a.slow.factor, a.slow.durationMs);
      if (a.effect) this.w.affectHero(sessionId, a.effect, m, brain.damage);
      if (a.push) this.pushHero(m, p, a.push);
    });
  }

  /** Voo ou mergulho: some (invulnerável) e cai colado no alvo, acertando a área em volta. */
  private dive(m: Monster, brain: Brain, a: MonsterAbility, targetId: string) {
    const ms = a.vanishMs ?? 2000;
    brain.diving = true;
    brain.invulnerableUntil = this.w.now() + ms;
    m.hidden = true;
    this.strike(m, a, m.x, m.y, [], true);
    this.w.after(ms, () => {
      brain.diving = false;
      if (!this.w.state.monsters.has(m.id)) return;
      m.hidden = brain.camouflaged;
      const target = this.foe(targetId) ?? (brain.targetId ? this.foe(brain.targetId) : undefined);
      const spot = target ? this.besideTarget(m, target, true) : null;
      if (spot) {
        m.x = spot.x;
        m.y = spot.y;
      }
      const at = target ?? m;
      const tiles = abilityTiles(this.w.dungeon, { ...a, shape: "target" }, m.x, m.y, spot ? at.x : m.x, spot ? at.y : m.y);
      this.strike(m, a, at.x, at.y, tiles);
      this.hitArea(m, brain, a, tiles);
    });
  }

  private hide(m: Monster, brain: Brain, until: number) {
    brain.hiddenUntil = until;
    m.hidden = true;
  }

  private reveal(m: Monster, brain: Brain) {
    brain.camouflaged = false;
    if (brain.hiddenUntil === 0 && !brain.diving) m.hidden = false;
  }

  /** Chama monstros em volta (cópias da Bruxa, filhotes...): mesma profundidade, perseguindo o mesmo alvo. */
  private summon(m: Monster, brain: Brain, kind: MonsterKind, count: number) {
    for (let i = 0; i < count; i++) {
      const spot = this.freeNear(m.x, m.y, 2);
      if (!spot) return;
      const minion = this.w.spawnMonster(kind, spot.x, spot.y, brain.depth);
      const mb = this.w.brains.get(minion.id);
      if (mb) mb.targetId = brain.targetId;
    }
  }

  /** Divisão (Pudim Negro): metade da vida vai para um pedaço novo ao lado; XP e loot também se dividem. */
  private split(m: Monster, brain: Brain) {
    const spot = this.freeNear(m.x, m.y, 1);
    if (!spot || !brain.family) return;
    const part = this.w.spawnMonster(m.kind as MonsterKind, spot.x, spot.y, brain.depth);
    const pb = this.w.brains.get(part.id);
    if (!pb) return;
    const half = Math.floor(m.hp / 2);
    m.hp -= half;
    part.hp = half;
    part.maxHp = m.maxHp;
    brain.family.count++;
    pb.family = brain.family;
    brain.xp = pb.xp = Math.max(1, Math.round(brain.xp / 2));
    brain.loot = pb.loot = [Math.round(brain.loot[0] / 2), Math.max(1, Math.round(brain.loot[1] / 2))];
    pb.targetId = brain.targetId;
    this.w.notice(m.x, m.y - 1, "Divide-se!", 0x8e44ad);
  }

  // --- Ataque básico -------------------------------------------------------------

  private basicAttack(m: Monster, brain: Brain, targetId: string, target: { x: number; y: number }, now: number) {
    const def = brain.def;
    const traits = def.traits;
    const leader = this.leaderAura(m);
    const frenzy = traits?.frenzy && m.hp <= m.maxHp * traits.frenzy.belowHp ? traits.frenzy.haste : 0;
    brain.nextAttackAt = now + def.attackCooldownMs * Math.max(0.4, 1 - frenzy - leader.haste);
    let damage = brain.damage * (1 + leader.damage);
    // Táticas de Bando: outro monstro colado no mesmo alvo.
    if (traits?.packTactics && this.allyBeside(m, target)) damage *= 1 + traits.packTactics;
    // Ataque Surpresa: o primeiro golpe em cada alvo.
    if (traits?.ambush && !brain.struck.has(targetId)) {
      brain.struck.add(targetId);
      damage *= traits.ambush;
      this.w.notice(m.x, m.y - 1, "Ataque Surpresa!", 0xe67e22);
    }
    const hit: Hit = { attacker: m.id, fromX: m.x, fromY: m.y, fx: def.attackFx };

    // Hidra: cada cabeça morde um alvo diferente ao alcance; as que sobram mordem o alvo com metade do dano.
    if (brain.heads > 0) {
      const others = this.foesInRange(m, def.attackRange).filter((id) => id !== targetId);
      const bites = [targetId, ...others].slice(0, brain.heads);
      while (bites.length < brain.heads) bites.push(targetId);
      bites.forEach((id, i) => {
        const extra = i > 0 && id === targetId;
        this.w.after(i * MULTIATTACK_GAP_MS, () => this.bite(m, brain, id, damage * (extra ? EXTRA_HEAD_POWER : 1), hit));
      });
      return;
    }
    const multi = traits?.multiattack;
    if (multi) {
      for (let i = 0; i < multi.hits; i++) this.w.after(i * MULTIATTACK_GAP_MS, () => this.bite(m, brain, targetId, damage * multi.power, hit));
    } else {
      this.bite(m, brain, targetId, damage, hit);
    }
    // Fuga Ágil: depois de acertar de perto, recua 1 tile.
    if (traits?.hitAndRun && def.attackRange === 1 && now >= brain.hitAndRunAt && !m.rooted) {
      if (this.stepAway(m, brain, target, now)) brain.hitAndRunAt = now + traits.hitAndRun.cooldownMs;
    }
  }

  /** Um golpe básico num alvo (o monstro pode ter morrido ou o alvo saído entre as mordidas). */
  private bite(m: Monster, brain: Brain, id: string, raw: number, hit: Hit) {
    if (!this.w.state.monsters.has(m.id)) return;
    const summon = this.w.state.summons.get(id);
    const amount = rollDamage(raw);
    if (summon) return this.w.damageSummon(summon, amount, { ...hit, fromX: m.x, fromY: m.y });
    const p = this.w.state.players.get(id);
    if (!p || p.status !== "playing") return;
    this.w.damagePlayer(id, amount, { ...hit, fromX: m.x, fromY: m.y });
    const onHit = brain.def.traits?.onHit;
    if (!onHit || p.status !== "playing" || Math.random() >= (onHit.chance ?? 1)) return;
    if (onHit.dot) this.w.dotHero(id, onHit.dot.kind, Math.max(1, Math.round(brain.damage * onHit.dot.power)), onHit.dot.durationMs, m);
    if (onHit.effect) this.w.affectHero(id, onHit.effect, m, brain.damage);
    if (onHit.corrode) this.w.affectHero(id, { kind: "corrode", ms: onHit.corrode }, m, brain.damage);
    if (onHit.lifesteal) {
      const healed = Math.min(m.maxHp - m.hp, Math.round(amount * onHit.lifesteal));
      if (healed > 0) m.hp += healed;
    }
  }

  /** Comando (Hobgoblin capitão): bônus do líder vivo mais forte por perto (o líder não se beneficia de si). */
  private leaderAura(m: Monster) {
    let damage = 0;
    let haste = 0;
    this.w.state.monsters.forEach((o) => {
      const aura = o.id !== m.id ? this.w.brains.get(o.id)?.def.traits?.leader : undefined;
      if (!aura || tileDistance(m.x, m.y, o.x, o.y) > aura.radius) return;
      damage = Math.max(damage, aura.damage);
      haste = Math.max(haste, aura.haste);
    });
    return { damage, haste };
  }

  private allyBeside(m: Monster, target: { x: number; y: number }) {
    for (const o of this.w.state.monsters.values()) {
      if (o.id !== m.id && !o.hidden && tileDistance(o.x, o.y, target.x, target.y) <= 1) return true;
    }
    return false;
  }

  // --- Manutenção (todo tick) -----------------------------------------------------

  private upkeep(m: Monster, brain: Brain, now: number) {
    const traits = brain.def.traits;
    // Fim da invisibilidade de habilidade ou de piscar.
    if (brain.hiddenUntil > 0 && now >= brain.hiddenUntil) {
      brain.hiddenUntil = 0;
      if (!brain.diving && !brain.camouflaged) m.hidden = false;
    }
    const regen = traits?.regeneration;
    if (regen && now >= brain.nextRegenAt) {
      brain.nextRegenAt = now + 1000;
      if (now >= brain.regenBlockedUntil && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + Math.max(1, Math.round(m.maxHp * regen.perSec)));
    }
    const heads = traits?.heads;
    if (heads && brain.regrowAt > 0 && now >= brain.regrowAt) {
      brain.regrowAt = 0;
      brain.heads = Math.min(heads.max, brain.heads + 2);
      m.variant = brain.heads;
      m.hp = Math.min(m.maxHp, m.hp + Math.round(m.maxHp * heads.regrowHeal));
      this.w.notice(m.x, m.y - 1, "Duas cabeças nascem!", 0x2ecc71);
    }
    const blink = traits?.blink;
    if (blink && brain.targetId && !brain.diving && brain.hiddenUntil === 0) {
      if (brain.nextBlinkAt === 0) brain.nextBlinkAt = now + blink.everyMs * jitter();
      else if (now >= brain.nextBlinkAt) {
        brain.nextBlinkAt = now + blink.everyMs * jitter();
        this.hide(m, brain, now + blink.ms);
      }
    }
  }

  // --- Movimento ---------------------------------------------------------------

  private stepTo(m: Monster, brain: Brain, step: { x: number; y: number }, now: number) {
    const diagonal = step.x !== m.x && step.y !== m.y;
    const slow = m.slowed ? 1 - brain.slowPct : 1;
    brain.nextMoveAt = now + (1000 / (brain.def.speed * MONSTER_SPEED_SCALE * slow)) * (diagonal ? Math.SQRT2 : 1);
    m.x = step.x;
    m.y = step.y;
  }

  /** Um passo para longe do alvo (o vizinho livre que mais se afasta). */
  private stepAway(m: Monster, brain: Brain, from: { x: number; y: number }, now: number) {
    const blocked = this.w.occupiedTiles();
    let best: { x: number; y: number } | null = null;
    let bestDist = tileDistance(m.x, m.y, from.x, from.y) + Math.hypot(m.x - from.x, m.y - from.y) / 10;
    for (const [dx, dy] of NEIGHBORS) {
      const x = m.x + dx;
      const y = m.y + dy;
      if (!this.free(x, y, blocked)) continue;
      if (dx !== 0 && dy !== 0 && (!isWalkable(this.w.dungeon, x, m.y) || !isWalkable(this.w.dungeon, m.x, y))) continue;
      const dist = tileDistance(x, y, from.x, from.y) + Math.hypot(x - from.x, y - from.y) / 10;
      if (dist > bestDist) {
        best = { x, y };
        bestDist = dist;
      }
    }
    if (!best) return false;
    this.stepTo(m, brain, best, now);
    return true;
  }

  /** Tile livre colado no alvo, o mais perto do monstro (com linha de visão dele, salvo `anywhere`). */
  private besideTarget(m: Monster, target: { x: number; y: number }, anywhere = false) {
    const blocked = this.w.occupiedTiles();
    blocked.delete(m.y * this.w.dungeon.width + m.x);
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const [dx, dy] of NEIGHBORS) {
      const x = target.x + dx;
      const y = target.y + dy;
      if (!this.free(x, y, blocked)) continue;
      if (!anywhere && !hasLineOfSight(this.w.dungeon, m.x, m.y, x, y)) continue;
      const dist = Math.hypot(x - m.x, y - m.y);
      if (dist < bestDist) {
        best = { x, y };
        bestDist = dist;
      }
    }
    return best;
  }

  /** Puxa o herói ou a criatura para colar no monstro (língua, corrente). */
  private pull(m: Monster, targetId: string) {
    const unit = this.w.state.players.get(targetId) ?? this.w.state.summons.get(targetId);
    if (!unit) return false;
    const blocked = this.w.occupiedTiles();
    blocked.delete(unit.y * this.w.dungeon.width + unit.x);
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (const [dx, dy] of NEIGHBORS) {
      const x = m.x + dx;
      const y = m.y + dy;
      if (!this.free(x, y, blocked) || !hasLineOfSight(this.w.dungeon, x, y, unit.x, unit.y)) continue;
      const dist = Math.hypot(x - unit.x, y - unit.y);
      if (dist < bestDist) {
        best = { x, y };
        bestDist = dist;
      }
    }
    if (!best) return false;
    unit.x = best.x;
    unit.y = best.y;
    return true;
  }

  /** Empurra o herói para longe do monstro, tile a tile, até parede ou alguém no caminho. */
  private pushHero(m: Monster, p: { x: number; y: number }, tiles: number) {
    const dx = Math.sign(p.x - m.x);
    const dy = Math.sign(p.y - m.y);
    if (dx === 0 && dy === 0) return;
    const blocked = this.w.occupiedTiles();
    for (let i = 0; i < tiles; i++) {
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (!this.free(nx, ny, blocked)) return;
      if (dx !== 0 && dy !== 0 && (!isWalkable(this.w.dungeon, nx, p.y) || !isWalkable(this.w.dungeon, p.x, ny))) return;
      p.x = nx;
      p.y = ny;
    }
  }

  private free(x: number, y: number, blocked: Set<number>) {
    return isWalkable(this.w.dungeon, x, y) && tileAt(this.w.dungeon, x, y) !== Tile.Portal && !blocked.has(y * this.w.dungeon.width + x);
  }

  /** Tile livre mais perto de (x, y), até `radius`. */
  private freeNear(x: number, y: number, radius: number) {
    const blocked = this.w.occupiedTiles();
    for (let r = 1; r <= radius; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
          if (this.free(x + ox, y + oy, blocked) && hasLineOfSight(this.w.dungeon, x, y, x + ox, y + oy)) return { x: x + ox, y: y + oy };
        }
      }
    }
    return null;
  }

  // --- Alvos ---------------------------------------------------------------

  /** Quem o monstro pode atacar: jogador vivo na hunt ou criatura invocada. */
  foe(id: string): { x: number; y: number } | undefined {
    const p = this.w.state.players.get(id);
    if (p) return p.status === "playing" ? p : undefined;
    return this.w.state.summons.get(id);
  }

  /** Jogador ou criatura invocada mais perto do monstro, com linha de visão. */
  private nearestVisibleFoe(m: Monster, range: number): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    const consider = (x: number, y: number, id: string) => {
      const dist = tileDistance(m.x, m.y, x, y);
      if (dist > range || dist >= bestDist) return;
      if (!hasLineOfSight(this.w.dungeon, m.x, m.y, x, y)) return;
      best = id;
      bestDist = dist;
    };
    this.w.state.players.forEach((p, id) => { if (p.status === "playing") consider(p.x, p.y, id); });
    this.w.state.summons.forEach((s, id) => consider(s.x, s.y, id));
    return best;
  }

  /** Heróis e criaturas ao alcance, do mais perto para o mais longe. */
  private foesInRange(m: Monster, range: number) {
    const found: { id: string; dist: number }[] = [];
    const consider = (x: number, y: number, id: string) => {
      const dist = tileDistance(m.x, m.y, x, y);
      if (dist <= range && hasLineOfSight(this.w.dungeon, m.x, m.y, x, y)) found.push({ id, dist });
    };
    this.w.state.players.forEach((p, id) => { if (p.status === "playing") consider(p.x, p.y, id); });
    this.w.state.summons.forEach((s, id) => consider(s.x, s.y, id));
    return found.sort((a, b) => a.dist - b.dist).map((f) => f.id);
  }

  private elementNotice(m: Monster, brain: Brain, text: string, color: number) {
    const now = this.w.now();
    if (now - brain.lastElementNotice < ELEMENT_NOTICE_MS) return;
    brain.lastElementNotice = now;
    this.w.notice(m.x, m.y - 1, text, color);
  }
}

const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/** Recarga 5–6: entre 70% e 130% da recarga da tabela. */
function jitter() {
  return 1 - COOLDOWN_JITTER + Math.random() * 2 * COOLDOWN_JITTER;
}

/** Dano com variação de ±15%. */
export function rollDamage(base: number) {
  return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3)));
}
