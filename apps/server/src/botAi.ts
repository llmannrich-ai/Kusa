import {
  CLASSES,
  SPELLS,
  SPELL_SLOT_LEVELS,
  Tile,
  hasLineOfSight,
  isWalkable,
  runeSpells,
  spellChoices,
  tileAt,
  tileDistance,
  type ChoosePerkMessage,
  type CastMessage,
  type ChooseSpellMessage,
  type ClassId,
  type Dungeon,
  type MoveMessage,
  type PerkId,
  type SpellDef,
  type SpellId,
  type SpellSlot,
  type TargetMessage,
  type AttackingMessage,
} from "@kusa/shared";
import { nextStep } from "./pathfinding.ts";
import type { DungeonState, Monster, Player } from "./state.ts";

/** Longe do líder mais que isto, o bot larga a luta e volta para perto dele. */
const LEASH_TILES = 6;
/** Distância em que o bot fica do líder quando não há luta. */
const FOLLOW_TILES = 2;
/** Longe demais (ou preso sem caminho por `STUCK_MS`), o bot reaparece ao lado do líder. */
const TELEPORT_TILES = 14;
const STUCK_MS = 2000;
/** Só briga com monstro a até isto do líder (ou colado no próprio bot). */
const FIGHT_RADIUS = 6;
/** De quanto em quanto tempo o bot revê alvo, magias e escolhas (o passo é conferido a cada tick). */
const DECIDE_MS = 250;

/** O que a IA dos bots enxerga e pode fazer: as mesmas intenções de um jogador, mais a volta para perto do líder. */
export interface BotWorld {
  state: DungeonState;
  dungeon: Dungeon;
  now(): number;
  occupiedTiles(): Set<number>;
  /** O bot já pode dar o próximo passo (a velocidade deixa). */
  canStep(botId: string): boolean;
  /** Momento em que o slot de magia volta a poder ser usado. */
  spellReadyAt(botId: string, slot: SpellSlot): number;
  /** Põe o bot num tile livre ao lado de `toId`. */
  bringBeside(botId: string, toId: string): void;
  move(botId: string, msg: MoveMessage): void;
  target(botId: string, msg: TargetMessage): void;
  attacking(botId: string, msg: AttackingMessage): void;
  cast(botId: string, msg: CastMessage): void;
  chooseSpell(botId: string, msg: ChooseSpellMessage): void;
  choosePerk(botId: string, msg: ChoosePerkMessage): void;
}

interface BotMemory {
  decideAt: number;
  /** Monstro que o bot escolheu enfrentar (vazio = nenhum). */
  fight: string;
  attacking: boolean;
  /** Desde quando está longe do líder sem caminho (0 = não está preso). */
  stuckSince: number;
}

/**
 * IA dos bots que completam a equipe: segue o líder, enfrenta o que ameaça a equipe e usa as magias assim que der.
 * Só manda intenções para a `Hunt` (como um cliente); a memória daqui não vai no retrato da hunt: depois da troca de
 * anfitrião, o bot só recomeça a decidir.
 */
export class BotAi {
  private memory = new Map<string, BotMemory>();

  constructor(private w: BotWorld) {}

  think(now: number) {
    this.w.state.players.forEach((p, id) => {
      if (!p.bot) return;
      if (p.status !== "playing") {
        this.memory.delete(id);
        return;
      }
      const mem = this.memory.get(id) ?? { decideAt: 0, fight: "", attacking: false, stuckSince: 0 };
      this.memory.set(id, mem);
      const anchorId = this.anchor(p);
      if (!anchorId) return;
      const anchor = this.w.state.players.get(anchorId)!;
      if (now >= mem.decideAt) {
        mem.decideAt = now + DECIDE_MS;
        this.decide(id, p, anchor, mem);
      }
      this.walk(id, p, anchorId, anchor, mem, now);
    });
  }

  /** Quem o bot segue: o líder, ou o humano vivo mais perto se o líder já saiu. */
  private anchor(bot: Player) {
    const { players, leaderId } = this.w.state;
    const leader = players.get(leaderId);
    if (leader && !leader.bot && leader.status === "playing") return leaderId;
    let best = "";
    let bestDist = Infinity;
    players.forEach((p, id) => {
      if (p.bot || p.status !== "playing") return;
      const dist = tileDistance(bot.x, bot.y, p.x, p.y);
      if (dist < bestDist) { best = id; bestDist = dist; }
    });
    return best;
  }

  /** Escolhas da subida de nível, alvo, ataque e magias. */
  private decide(id: string, p: Player, anchor: Player, mem: BotMemory) {
    if (p.perkOffer.length > 0) this.w.choosePerk(id, { perk: p.perkOffer[0] as PerkId });
    for (const slot of [0, 1] as const) {
      if (p.level < SPELL_SLOT_LEVELS[slot] || (slot === 0 ? p.spell1 : p.spell2)) continue;
      const choices = spellChoices(p.classId as ClassId, slot, [...p.knownSpells], runeSpells([...p.runes]));
      if (choices.length > 0) this.w.chooseSpell(id, { slot, spellId: choices[0].id });
    }

    const foe = this.pickFoe(p, anchor);
    mem.fight = foe?.id ?? "";
    if (foe && p.target !== foe.id) this.w.target(id, { id: foe.id });
    if (!!foe !== mem.attacking) {
      mem.attacking = !!foe;
      this.w.attacking(id, { on: mem.attacking });
    }
    this.castSpells(id, p, foe);
  }

  /** O alvo do líder, se ele estiver brigando; senão o monstro mais perto do bot que ameaça a equipe. */
  private pickFoe(p: Player, anchor: Player): Monster | undefined {
    const { monsters } = this.w.state;
    const near = (m: Monster) => !m.hidden
      && (tileDistance(m.x, m.y, anchor.x, anchor.y) <= FIGHT_RADIUS || tileDistance(m.x, m.y, p.x, p.y) <= 1);
    const led = monsters.get(anchor.target);
    if (led && near(led)) return led;
    let best: Monster | undefined;
    let bestDist = Infinity;
    monsters.forEach((m) => {
      if (!near(m)) return;
      const dist = tileDistance(m.x, m.y, p.x, p.y);
      if (dist < bestDist) { best = m; bestDist = dist; }
    });
    return best;
  }

  /** Magia pronta e com mana sai assim que fizer sentido: cura em quem está ferido, dano em quem está ao alcance. */
  private castSpells(id: string, p: Player, foe: Monster | undefined) {
    const now = this.w.now();
    for (const slot of [0, 1] as const) {
      const spell = SPELLS[(slot === 0 ? p.spell1 : p.spell2) as SpellId];
      if (!spell || now < this.w.spellReadyAt(id, slot) || p.mana < spell.manaCost) continue;
      if (this.worthCasting(p, spell, foe)) this.w.cast(id, { slot });
    }
  }

  private worthCasting(p: Player, spell: SpellDef, foe: Monster | undefined) {
    if (spell.aim === "ally") return this.hurtAlly(p, spell.range, 0.7);
    if (spell.heal && !spell.damage) return this.hurtAlly(p, Math.max(1, spell.radius), 0.6);
    if (spell.aim === "target") {
      return !!foe && tileDistance(p.x, p.y, foe.x, foe.y) <= spell.range && hasLineOfSight(this.w.dungeon, p.x, p.y, foe.x, foe.y);
    }
    // Em si: rolar só para fugir de um aperto; o resto (bônus, campos, invocações) quando a luta está perto.
    if (spell.dash) return !!foe && tileDistance(p.x, p.y, foe.x, foe.y) <= 1 && p.hp < p.maxHp * 0.5;
    return !!foe && tileDistance(p.x, p.y, foe.x, foe.y) <= Math.max(3, spell.radius + 1);
  }

  /** Algum aliado vivo (ou o próprio bot) abaixo de `pct` da vida, a até `range` tiles. */
  private hurtAlly(p: Player, range: number, pct: number) {
    return [...this.w.state.players.values()].some((ally) => ally.status === "playing"
      && ally.hp < ally.maxHp * pct && tileDistance(p.x, p.y, ally.x, ally.y) <= range);
  }

  /** Um passo por vez: para o alvo até o alcance do básico, ou para perto do líder. */
  private walk(id: string, p: Player, anchorId: string, anchor: Player, mem: BotMemory, now: number) {
    const fromAnchor = tileDistance(p.x, p.y, anchor.x, anchor.y);
    if (fromAnchor > TELEPORT_TILES) return this.rejoin(id, anchorId, mem);
    if (!this.w.canStep(id)) return;

    const foe = this.w.state.monsters.get(mem.fight);
    const range = CLASSES[p.classId as ClassId]?.attackRange ?? 1;
    let goal: { x: number; y: number } | null = null;
    let reach = FOLLOW_TILES;
    if (fromAnchor > LEASH_TILES || !foe) {
      if (fromAnchor > FOLLOW_TILES) goal = anchor;
    } else if (tileDistance(p.x, p.y, foe.x, foe.y) > range || !hasLineOfSight(this.w.dungeon, p.x, p.y, foe.x, foe.y)) {
      goal = foe;
      reach = range;
    }
    if (!goal) {
      mem.stuckSince = 0;
      return;
    }

    const blocked = this.w.occupiedTiles();
    const d = this.w.dungeon;
    // Portal e caverna tiram da dungeon ou levam para longe: o bot nunca pisa neles.
    const walkable = (x: number, y: number) => isWalkable(d, x, y) && tileAt(d, x, y) !== Tile.Portal && tileAt(d, x, y) !== Tile.Cave;
    const step = nextStep(d, p, goal, reach, (x, y) => blocked.has(y * d.width + x), walkable);
    if (!step) {
      // Sem caminho até o líder (ele passou pela caverna, ou a passagem está entupida): depois de um tempo, reaparece.
      if (goal === anchor && fromAnchor > LEASH_TILES) {
        mem.stuckSince ||= now;
        if (now - mem.stuckSince >= STUCK_MS) this.rejoin(id, anchorId, mem);
      }
      return;
    }
    mem.stuckSince = 0;
    this.w.move(id, { dx: Math.sign(step.x - p.x) as -1 | 0 | 1, dy: Math.sign(step.y - p.y) as -1 | 0 | 1 });
  }

  private rejoin(id: string, anchorId: string, mem: BotMemory) {
    mem.stuckSince = 0;
    this.w.bringBeside(id, anchorId);
  }
}
