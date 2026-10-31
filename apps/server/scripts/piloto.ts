/**
 * Piloto automático das hunts simuladas (`simular.ts`): joga um herói sozinho do começo ao fim, como um jogador
 * cuidadoso. Só manda as mesmas intenções que o cliente manda (`move`, `target`, `attacking`, `cast`, `drink`,
 * `chooseSpell`, `choosePerk`); quem calcula tudo é a `Hunt`.
 *
 * O que ele faz, nesta ordem de prioridade:
 *   - bebe poção de vida abaixo de 40% da vida e de mana abaixo de 25% da mana (se tiver magia);
 *   - briga com o monstro visível mais perto a até `FIGHT_TILES` (usa as magias assim que fizer sentido); quem ataca de
 *     longe recua um passo do monstro colado; sem poção e abaixo de 30% da vida, foge do monstro mais perto;
 *   - sem poção, abaixo de 25% da vida e com monstro perto, desiste e volta ao portal de fuga (como fazem os jogadores);
 *   - sem luta e abaixo de 50% da vida, espera a vida voltar (se ainda sobra tempo de hunt);
 *   - pega o que caiu no chão e abre os baús destrancados por perto;
 *   - segue as salas do caminho em ordem até o boss (as laterais, só o que aparece por perto) (no Mar de Areia desce pela caverna; na Caverna da Travessia vai
 *     a um covil sorteado); com o boss morto, fica em cima do portal até sair.
 * Escolhas da subida de nível (magia de cada slot e melhoria) saem do sorteio `random`: a simulação cobre as
 * combinações em vez de repetir sempre a mesma.
 * `play` joga uma hunt inteira com um perfil de jogador (`PERFIS`); quem usa é o `simular.ts` e o teste `simulacao.ts`.
 */
import {
  CLASSES, ITEMS, MAPS, SERVER_TICK_MS, bestPerSlot, createRng, type MapId, type RunEndedMessage, SPELLS, SPELL_SLOT_LEVELS, Tile, hasLineOfSight, isWalkable, lairsOf, runeSpells, spellChoices, tileAt, tileDistance,
  type ClassId, type Dungeon, type PerkId, type Rect, type SpellDef, type SpellId,
} from "@kusa/shared";
import { Hunt, type HuntReport } from "../src/hunt.ts";
import { nextStep } from "../src/pathfinding.ts";
import { DungeonState, type Monster, type Player } from "../src/state.ts";

/** Briga com monstro visível a até isto. */
const FIGHT_TILES = 6;
/** Vai buscar item no chão ou baú a até isto. */
const LOOT_TILES = 8;
/** Revê alvo, magias e escolhas a cada isto (ms); o passo é conferido a cada tick. */
const DECIDE_MS = 250;
/** Abaixo disto (fração da vida), sem poção, foge; sem luta e abaixo de `REST_HP`, espera a vida voltar. */
const FLEE_HP = 0.3;
const REST_HP = 0.5;
/** Abaixo disto, sem poção e com monstro perto, foge da hunt pelo portal. */
const ESCAPE_HP = 0.25;
/** Só descansa se sobram mais que estes segundos de hunt. */
const REST_UNTIL_S = 75;
/** Com isto de monstros a até 3 tiles e a vida caindo, recua. */
const OUTNUMBERED = 3;
/** Espera o monstro vir por até isto (ms) antes de ir até ele. */
const PULL_WAIT_MS = 1000;
/** Destino mais longe que isto vai pelo mapa de distâncias inteiro (`flowStep`). */
const NEAR_TILES = 10;
/** Sem conseguir chegar ao ponto do caminho por isto (ms), pula para o próximo. */
const STUCK_MS = 4000;

const center = (r: Rect) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });
const inside = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export class Piloto {
  private decideAt = 0;
  private attacking = false;
  private fight = "";
  /** Salas do caminho ainda por visitar, em ordem; a última é o covil do boss. */
  private route: Rect[];
  private lair: number;
  private stuckSince = 0;
  /** Itens e baús que não deu para alcançar: não insiste neles. */
  private skip = new Set<string>();
  /** Quando o piloto viu o monstro chegar mais perto pela última vez (para puxar em vez de entrar). */
  private seenAt = new Map<string, { at: number; dist: number }>();
  /** Desistiu da hunt: vai para o portal de fuga e não briga mais. */
  private escaping = false;
  /** Mapa de distâncias até o destino atual (`flowStep`). */
  private flow: { id: string; dist: Int32Array } | null = null;

  constructor(private hunt: Hunt, private state: DungeonState, private id: string, private random: () => number) {
    const lairs = lairsOf(this.dungeon);
    this.lair = Math.floor(random() * lairs.length);
    this.route = [...this.dungeon.path, lairs[this.lair].room];
  }

  /** A dungeon da hunt (ela abre os portais nos tiles dela). */
  private get dungeon(): Dungeon {
    return (this.hunt as any).dungeon;
  }

  private get seat(): any {
    return (this.hunt as any).seats.get(this.id);
  }

  think(now: number) {
    const p = this.state.players.get(this.id);
    if (!p || p.status !== "playing") return;
    if (now >= this.decideAt) {
      this.decideAt = now + DECIDE_MS;
      this.decide(p, now);
    }
    this.walk(p, now);
  }

  private decide(p: Player, now: number) {
    if (p.perkOffer.length > 0) this.hunt.choosePerk(this.id, { perk: this.pick([...p.perkOffer]) as PerkId });
    for (const slot of [0, 1] as const) {
      if (p.level < SPELL_SLOT_LEVELS[slot] || (slot === 0 ? p.spell1 : p.spell2)) continue;
      const choices = spellChoices(p.classId as ClassId, slot, [...p.knownSpells], runeSpells([...p.runes]));
      if (choices.length > 0) this.hunt.chooseSpell(this.id, { slot, spellId: this.pick(choices).id });
    }
    if (p.hp < p.maxHp * 0.4 && p.healthPotions > 0) this.hunt.drink(this.id, { potion: "potion-health" });
    else if ((p.spell1 || p.spell2) && p.mana < p.maxMana * 0.25 && p.manaPotions > 0) this.hunt.drink(this.id, { potion: "potion-mana" });

    if (!this.escaping && p.hp < p.maxHp * ESCAPE_HP && p.healthPotions === 0 && this.nearestFoe(p)) this.escaping = true;
    const foe = this.escaping ? undefined : this.nearestFoe(p);
    this.fight = foe?.id ?? "";
    if (foe && p.target !== foe.id) this.hunt.target(this.id, { id: foe.id });
    if (!!foe !== this.attacking) {
      this.attacking = !!foe;
      this.hunt.attacking(this.id, { on: this.attacking });
    }
    for (const slot of [0, 1] as const) {
      const spell = SPELLS[(slot === 0 ? p.spell1 : p.spell2) as SpellId];
      if (!spell || now < (this.seat?.spellReadyAt[slot] ?? Infinity) || p.mana < spell.manaCost) continue;
      if (this.worthCasting(p, spell, foe)) this.hunt.cast(this.id, { slot });
    }
  }

  private pick<T>(list: T[]): T {
    return list[Math.floor(this.random() * list.length)];
  }

  private nearestFoe(p: Player): Monster | undefined {
    let best: Monster | undefined;
    let bestDist = Infinity;
    this.state.monsters.forEach((m) => {
      if (m.hidden) return;
      const dist = tileDistance(m.x, m.y, p.x, p.y);
      if (dist > FIGHT_TILES || dist >= bestDist) return;
      if (dist > 1 && !hasLineOfSight(this.dungeon, p.x, p.y, m.x, m.y)) return;
      best = m;
      bestDist = dist;
    });
    return best;
  }

  private worthCasting(p: Player, spell: SpellDef, foe: Monster | undefined) {
    if (spell.aim === "ally" || (spell.heal && !spell.damage)) return p.hp < p.maxHp * 0.7;
    if (spell.aim === "target") {
      return !!foe && tileDistance(p.x, p.y, foe.x, foe.y) <= spell.range && hasLineOfSight(this.dungeon, p.x, p.y, foe.x, foe.y);
    }
    if (spell.dash) return !!foe && tileDistance(p.x, p.y, foe.x, foe.y) <= 1 && p.hp < p.maxHp * 0.5;
    return !!foe && tileDistance(p.x, p.y, foe.x, foe.y) <= Math.max(3, spell.radius + 1);
  }

  /** Para onde andar agora e a que distância parar. */
  private goal(p: Player): { x: number; y: number; reach: number; key?: string; cave?: boolean } | null {
    const foe = this.state.monsters.get(this.fight);
    if (foe) {
      const range = CLASSES[p.classId as ClassId]?.attackRange ?? 1;
      const inRange = tileDistance(p.x, p.y, foe.x, foe.y) <= range && hasLineOfSight(this.dungeon, p.x, p.y, foe.x, foe.y);
      return inRange ? null : { x: foe.x, y: foe.y, reach: range };
    }
    if (this.escaping) return { ...this.dungeon.portal, reach: 0, key: "fuga" };
    let loot: { x: number; y: number; reach: number; key: string } | null = null;
    let lootDist = LOOT_TILES + 1;
    this.state.items.forEach((it) => {
      const dist = tileDistance(p.x, p.y, it.x, it.y);
      if (dist < lootDist && !this.skip.has(it.id)) { loot = { x: it.x, y: it.y, reach: 0, key: it.id }; lootDist = dist; }
    });
    this.state.chests.forEach((c) => {
      if (c.locked || c.opened || c.rune || this.skip.has(c.id)) return;
      const dist = tileDistance(p.x, p.y, c.x, c.y);
      if (dist < lootDist) { loot = { x: c.x, y: c.y, reach: 1, key: c.id }; lootDist = dist; }
    });
    if (loot) return loot;

    // Boss morto: o portal do covil abriu (na Caverna da Travessia, o de qualquer covil vencido; vai ao mais perto).
    const open = lairsOf(this.dungeon).map((l) => l.portal).filter((pt) => tileAt(this.dungeon, pt.x, pt.y) === Tile.Portal)
      .sort((a, b) => tileDistance(p.x, p.y, a.x, a.y) - tileDistance(p.x, p.y, b.x, b.y));
    if (open[0]) return { ...open[0], reach: 0, key: "portal" };
    while (this.route.length > 1 && inside(this.route[0], p.x, p.y)) this.route.shift();
    const room = this.route[0];
    const target = { ...center(room), reach: 1, key: `sala${this.route.length}` };
    // O covil do Mar de Areia fica no subterrâneo: sem estar lá embaixo, o caminho passa pela boca da caverna.
    const cave = this.dungeon.cave;
    if (cave && inside(cave.under, target.x, target.y) && !inside(cave.under, p.x, p.y)) return { ...cave.entrance, reach: 0, key: "caverna", cave: true };
    return target;
  }

  /** Segundos que faltam para a hunt soterrar quem ficou. */
  private secondsLeft() {
    const hunt = this.hunt as any;
    return MAPS[this.dungeon.mapId].durationSeconds - hunt.elapsedMs / 1000;
  }

  /** Um passo para o tile vizinho livre mais longe do ponto (false se não houver para onde ir). */
  private stepAway(p: Player, from: { x: number; y: number }) {
    const d = this.dungeon;
    let best: { dx: number; dy: number } | null = null;
    let bestDist = tileDistance(p.x, p.y, from.x, from.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = p.x + dx;
      const y = p.y + dy;
      if ((!dx && !dy) || !isWalkable(d, x, y) || tileAt(d, x, y) === Tile.Portal || tileAt(d, x, y) === Tile.Cave) continue;
      // Sem cortar quina de parede na diagonal (a hunt recusaria o passo).
      if (dx && dy && (!isWalkable(d, p.x + dx, p.y) || !isWalkable(d, p.x, p.y + dy))) continue;
      if ([...this.state.monsters.values()].some((m) => m.x === x && m.y === y)) continue;
      const dist = tileDistance(x, y, from.x, from.y);
      if (dist > bestDist) { best = { dx, dy }; bestDist = dist; }
    }
    if (!best) return false;
    this.hunt.move(this.id, { dx: best.dx as -1 | 0 | 1, dy: best.dy as -1 | 0 | 1 });
    return true;
  }

  /**
   * Passo pelo mapa de distâncias até o destino (busca em largura a partir dele, refeita só quando o destino muda): o
   * vizinho livre com a menor distância. Sem vizinho que chegue mais perto, null.
   */
  private flowStep(p: Player, goal: { x: number; y: number; key?: string }, walkable: (x: number, y: number) => boolean, blocked: (x: number, y: number) => boolean) {
    const d = this.dungeon;
    const id = `${goal.key}:${goal.x},${goal.y}`;
    if (this.flow?.id !== id) {
      const dist = new Int32Array(d.width * d.height).fill(-1);
      const queue = [goal.y * d.width + goal.x];
      dist[queue[0]] = 0;
      for (let head = 0; head < queue.length; head++) {
        const cur = queue[head];
        const cx = cur % d.width;
        const cy = Math.floor(cur / d.width);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= d.width || ny >= d.height) continue;
          const k = ny * d.width + nx;
          if (dist[k] >= 0 || !walkable(nx, ny)) continue;
          if (dx && dy && (!walkable(nx, cy) || !walkable(cx, ny))) continue;
          dist[k] = dist[cur] + 1;
          queue.push(k);
        }
      }
      this.flow = { id, dist };
    }
    const { dist } = this.flow;
    let best: { x: number; y: number } | null = null;
    let bestDist = dist[p.y * d.width + p.x];
    if (bestDist < 0) bestDist = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = p.x + dx;
      const y = p.y + dy;
      if ((!dx && !dy) || x < 0 || y < 0 || x >= d.width || y >= d.height || blocked(x, y)) continue;
      if (dx && dy && (!walkable(p.x + dx, p.y) || !walkable(p.x, p.y + dy))) continue;
      const k = dist[y * d.width + x];
      if (k >= 0 && k < bestDist) { best = { x, y }; bestDist = k; }
    }
    return best;
  }

  private walk(p: Player, now: number) {
    if (now < (this.seat?.nextMoveAt ?? Infinity)) return;
    const foe = this.state.monsters.get(this.fight);
    if (foe) {
      const range = CLASSES[p.classId as ClassId]?.attackRange ?? 1;
      const close = tileDistance(p.x, p.y, foe.x, foe.y);
      if (p.hp < p.maxHp * FLEE_HP && p.healthPotions === 0 && close <= 2 && this.stepAway(p, foe)) return;
      if (range > 1 && close <= 1 && this.stepAway(p, foe)) return;
      // Cercado e perdendo vida: recua pelo meio do bando, puxando os monstros para trás.
      const near = [...this.state.monsters.values()].filter((m) => !m.hidden && tileDistance(p.x, p.y, m.x, m.y) <= 3);
      if (near.length >= OUTNUMBERED && p.hp < p.maxHp * 0.75) {
        const mid = { x: near.reduce((a, m) => a + m.x, 0) / near.length, y: near.reduce((a, m) => a + m.y, 0) / near.length };
        if (this.stepAway(p, mid)) return;
      }
      // Puxa em vez de entrar: espera o monstro vir até ele (quem atira de longe e não se mexe, ele vai buscar).
      if (close > range) {
        const seen = this.seenAt.get(foe.id);
        if (!seen || seen.dist > close) this.seenAt.set(foe.id, { at: now, dist: close });
        else if (now - seen.at < PULL_WAIT_MS) return;
      }
    } else if (!this.escaping && p.hp < p.maxHp * REST_HP && this.secondsLeft() > REST_UNTIL_S) {
      return;
    }
    const goal = this.goal(p);
    if (!goal || (goal.reach === 0 && p.x === goal.x && p.y === goal.y)) {
      // Em cima de item que ficou no chão (bag cheia, item que não serve): a hunt não pega; deixa para trás.
      if (goal?.key && this.state.items.has(goal.key)) this.skip.add(goal.key);
      this.stuckSince = 0;
      return;
    }
    const d = this.dungeon;
    const occupied = new Set<number>();
    this.state.monsters.forEach((m) => occupied.add(m.y * d.width + m.x));
    this.state.chests.forEach((c) => occupied.add(c.y * d.width + c.x));
    // O portal tira da dungeon: só pisa nele de propósito (o do boss); a caverna, só quando é o destino.
    const walkable = (x: number, y: number) => {
      if (!isWalkable(d, x, y)) return false;
      const t = tileAt(d, x, y);
      if (t === Tile.Portal) return (goal.key === "portal" || goal.key === "fuga") && x === goal.x && y === goal.y;
      if (t === Tile.Cave) return !!goal.cave && x === goal.x && y === goal.y;
      return true;
    };
    const blocked = (x: number, y: number) => occupied.has(y * d.width + x) && !(x === goal.x && y === goal.y);
    // Perto (monstro, item): a busca curta do jogo, que desvia de quem está no caminho. Longe (salas, portais): o mapa
    // de distâncias inteiro, porque a busca do jogo para em `MAX_VISITED` tiles e não atravessa os mapas abertos.
    const step = goal.key && tileDistance(p.x, p.y, goal.x, goal.y) > NEAR_TILES
      ? this.flowStep(p, goal, walkable, blocked)
      : nextStep(d, p, goal, goal.reach, blocked, walkable);
    if (!step) {
      this.stuckSince ||= now;
      if (now - this.stuckSince >= STUCK_MS) {
        this.stuckSince = 0;
        if (goal.key?.startsWith("sala") && this.route.length > 1) this.route.shift();
        else if (goal.key) this.skip.add(goal.key);
      }
      return;
    }
    this.stuckSince = 0;
    this.hunt.move(this.id, { dx: Math.sign(step.x - p.x) as -1 | 0 | 1, dy: Math.sign(step.y - p.y) as -1 | 0 | 1 });
  }
}

// --- Hunt inteira no relógio falso (simular.ts e o teste simulacao.ts) ----------------------------------------

export type Perfil = "novato" | "medio" | "veterano";
export const PERFIS: Perfil[] = ["novato", "medio", "veterano"];
/** Mapas que ainda não têm a dungeon completa (teto de loot simbólico em `SOLO_LIMITS`). */
export const EM_OBRAS: MapId[] = ["gates", "oldwood", "heartwood"];
/** Versão do piloto: mudou o jeito de jogar, sobe o número (as linhas antigas e novas não se comparam). */
export const PILOTO_VERSAO = 1;

function loadout(classId: ClassId, perfil: Perfil) {
  if (perfil === "novato") return [];
  const ids = Object.keys(ITEMS).filter((id) => {
    if (perfil === "veterano") return true;
    const [, , tier, rarity] = id.split("-");
    return Number(tier) <= 3 && rarity === "common";
  });
  return Object.values(bestPerSlot(ids, classId)).filter(Boolean);
}

export interface Sim { report: HuntReport; result: RunEndedMessage; perfil: Perfil; seed: number; cleared: boolean }

/** Joga uma hunt inteira no relógio falso. */
export function play(classId: ClassId, mapId: MapId, perfil: Perfil, seed: number): Sim | null {
  let clock = 0;
  let timers: { at: number; fn: () => void }[] = [];
  let ended: Sim | null = null;
  let cleared = false;
  const state = new DungeonState();
  const hunt = new Hunt(state, {
    now: () => clock,
    setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
    send: () => {},
    broadcast: () => {},
    runEnded: (_id, result, report) => { ended = { report, result, perfil, seed, cleared }; },
    ended: () => {},
    mapCleared: () => { cleared = true; },
  }, { mapId, seed, allSpells: perfil === "veterano", random: createRng(seed ^ 0x5eed).next });
  hunt.join("sim", { name: `sim:${perfil}`, classId, talents: {}, spellXp: {} });
  hunt.equip("sim", loadout(classId, perfil));
  hunt.start("sim");
  const piloto = new Piloto(hunt, state, "sim", createRng(seed ^ 0xb07).next);
  // Folga além da duração do mapa: a hunt soterra quem passa do tempo, e o laço para logo depois.
  const limit = (MAPS[mapId].durationSeconds + 30) * 1000;
  while (!ended && clock < limit) {
    clock += SERVER_TICK_MS;
    const due = timers.filter((t) => t.at <= clock);
    if (due.length) {
      timers = timers.filter((t) => t.at > clock);
      for (const t of due) t.fn();
    }
    piloto.think(clock);
    hunt.tick(SERVER_TICK_MS);
  }
  const sim = ended as Sim | null;
  if (sim) sim.cleared ||= cleared;
  return sim;
}
