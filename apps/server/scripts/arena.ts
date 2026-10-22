/**
 * Ajudantes dos testes que rodam a simulação (`Hunt`) direto, sem servidor e sem rede (efeitos, bestiario):
 *   - relógio falso: o teste avança o tempo, nada depende da velocidade da máquina;
 *   - sorteios com seed fixa (`HuntOptions.random`): dano, chances e recargas dos monstros saem sempre iguais;
 *   - cenário montado: o herói numa sala aberta, sem os monstros do mapa, e cada teste põe os monstros onde precisa.
 * O mesmo commit dá sempre o mesmo resultado: se falha, é bug (ou o teste precisa mudar junto com a mecânica).
 * Não é um teste: não entra na lista do `all.ts`.
 */
import {
  MSG, SERVER_TICK_MS, Tile, createRng, generateDungeon, hasLineOfSight, isWalkable, tileAt, tileDistance,
  type AttackMessage, type ChainMessage, type ClassId, type CooldownMessage, type DamageMessage, type MapId, type MonsterKind, type MonsterStrikeMessage, type SpellId, type SpellMessage,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState, type Monster, type Player } from "../src/state.ts";

export interface ArenaOptions {
  classId?: ClassId;
  mapId?: MapId;
  /** Seed do mapa e dos sorteios. */
  seed?: number;
  startLevel?: number;
  /** Grimório inteiro no nível máximo (como `KUSA_ALL_SPELLS=1`). */
  allSpells?: boolean;
  /** Multiplica a vida dos monstros (como `KUSA_MONSTER_HP`). */
  monsterHp?: number;
  /** Põe o herói no centro de uma sala aberta, longe do portal (padrão). Com false, fica onde nasceu. */
  openRoom?: boolean;
}

/** Id do herói nas arenas. */
export const HERO = "h";

/** Hunt com um herói e nenhum monstro (os do mapa saem). */
export function arena(options: ArenaOptions = {}) {
  const { classId = "knight", mapId = "crypt", seed = Number(process.env.KUSA_SEED) || 4242, startLevel = 8, allSpells = true, monsterHp = 1, openRoom = true } = options;
  let clock = 0;
  const timers: { at: number; fn: () => void }[] = [];
  const damage: DamageMessage[] = [];
  const spells: SpellMessage[] = [];
  const chains: ChainMessage[] = [];
  const cooldowns: CooldownMessage[] = [];
  const strikes: MonsterStrikeMessage[] = [];
  const attacks: AttackMessage[] = [];
  const notices: string[] = [];
  let ended: unknown = null;
  const collect = (type: string, msg: any) => {
    if (type === MSG.damage) damage.push(msg);
    else if (type === MSG.spell) spells.push(msg);
    else if (type === MSG.chain) chains.push(msg);
    else if (type === MSG.cooldown) cooldowns.push(msg);
    else if (type === MSG.monsterStrike) strikes.push(msg);
    else if (type === MSG.attack) attacks.push(msg);
    else if (type === MSG.notice) notices.push(msg.text);
  };
  const host: HuntHost = {
    now: () => clock,
    setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
    send: (_id, type, msg) => collect(type, msg),
    broadcast: collect,
    runEnded: (_id, result) => { ended = result; },
    ended: () => {},
  };
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId, seed, startLevel, allSpells, monsterHp, random: createRng(seed).next });
  hunt.join(HERO, { name: "Teste", classId, talents: {}, spellXp: {} });
  hunt.start(HERO);
  const any = hunt as any;
  state.monsters.clear();
  any.brains.clear();
  const p = state.players.get(HERO)! as Player;
  const d = generateDungeon(seed, mapId);
  if (openRoom) {
    const spot = openSpot();
    p.x = spot.x;
    p.y = spot.y;
  }

  /** Tile com espaço livre em volta (7×7 sem parede nem portal), longe do portal: o centro da maior sala, se der. */
  function openSpot() {
    const rooms = [...d.path, ...d.side, d.boss].sort((a, b) => b.w * b.h - a.w * a.h);
    for (const room of rooms) {
      const cx = room.x + Math.floor(room.w / 2);
      const cy = room.y + Math.floor(room.h / 2);
      const tiles: { x: number; y: number }[] = [];
      for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) tiles.push({ x, y });
      tiles.sort((a, b) => tileDistance(a.x, a.y, cx, cy) - tileDistance(b.x, b.y, cx, cy));
      const spot = tiles.find(({ x, y }) => tileDistance(x, y, d.portal.x, d.portal.y) >= 8 && open(x, y));
      if (spot) return spot;
    }
    throw new Error(`arena: nenhum lugar aberto no mapa (seed ${seed})`);
  }

  function open(x: number, y: number) {
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) if (!free(x + ox, y + oy)) return false;
    return true;
  }

  function free(x: number, y: number) {
    return isWalkable(d, x, y) && tileAt(d, x, y) !== Tile.Portal;
  }

  /** Avança o relógio em passos de um tick do servidor (os timers da hunt disparam na hora certa). */
  function advance(ms: number) {
    for (let t = 0; t < ms; t += SERVER_TICK_MS) {
      clock += SERVER_TICK_MS;
      for (const timer of timers.filter((x) => x.at <= clock)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.fn();
      }
      hunt.tick(SERVER_TICK_MS);
      if (ended) throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(ended)} (${where()})`);
    }
  }

  /** Avança o relógio até `done()` ou `ms`; no fim do prazo, falha com `error`. */
  function until(done: () => boolean, ms: number, error: string) {
    for (let t = 0; !done(); t += SERVER_TICK_MS) {
      if (t >= ms) throw new Error(`${error} (${where()})`);
      advance(SERVER_TICK_MS);
    }
  }

  /** Põe um monstro no tile (dx, dy) a partir de `from` (o herói, se omitido). O tile precisa estar livre. */
  function place(kind: MonsterKind, dx: number, dy: number, from: { x: number; y: number } = p): Monster {
    const x = from.x + dx;
    const y = from.y + dy;
    if (!free(x, y) || occupied(x, y)) throw new Error(`arena: o tile ${x},${y} não está livre para ${kind}`);
    return any.addMonster(kind, x, y, 0);
  }

  /** Põe um monstro a `dist` tiles do herói, num tile livre e à vista (o primeiro achado, na mesma ordem sempre). */
  function spawn(kind: MonsterKind, dist = 1): Monster {
    for (let r = dist; r <= dist + 4; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          const x = p.x + ox;
          const y = p.y + oy;
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r || !free(x, y) || occupied(x, y) || !hasLineOfSight(d, p.x, p.y, x, y)) continue;
          return any.addMonster(kind, x, y, 0);
        }
      }
    }
    throw new Error(`arena: sem lugar para ${kind}`);
  }

  function occupied(x: number, y: number) {
    return (x === p.x && y === p.y) || [...state.monsters.values()].some((m) => m.x === x && m.y === y);
  }

  /** Escolhe as magias dos dois slots. */
  function choose(slot1: SpellId, slot2?: SpellId) {
    hunt.chooseSpell(HERO, { slot: 0, spellId: slot1 });
    if (slot2) hunt.chooseSpell(HERO, { slot: 1, spellId: slot2 });
  }

  /** Conjura a magia do slot, mirando no monstro (ou num tile). */
  function cast(slot: 0 | 1, aim?: Monster | { x: number; y: number }) {
    if (!aim) return hunt.cast(HERO, { slot });
    const targetId = "id" in aim ? aim.id : undefined;
    hunt.cast(HERO, { slot, aim: { x: aim.x, y: aim.y, targetId } });
  }

  /** Mana cheia e as duas magias fora da recarga (para testar a magia, não a economia de mana). */
  function ready() {
    p.mana = p.maxMana;
    any.seats.get(HERO).spellReadyAt = [0, 0];
  }

  /** Golpes do herói (dano em monstro) desde a posição `from` da lista de dano. */
  function hitsFrom(from: number) {
    return damage.slice(from).filter((x) => x.attacker === HERO && !x.toPlayer).length;
  }

  /** Onde o herói está e os monstros mais perto, para mensagens de erro. */
  function where() {
    const near = [...state.monsters.values()]
      .map((m) => ({ k: m.kind, x: m.x, y: m.y, hp: m.hp }))
      .sort((a, b) => tileDistance(p.x, p.y, a.x, a.y) - tileDistance(p.x, p.y, b.x, b.y)).slice(0, 3);
    return `seed ${seed}, t=${clock} ms, herói em ${p.x},${p.y} (${p.status}, vida ${p.hp}/${p.maxHp}); perto: ${JSON.stringify(near)}`;
  }

  const brain = (m: Monster) => any.brains.get(m.id);
  const seat = () => any.seats.get(HERO);
  const now = () => clock;
  return {
    hunt, state, any, p, d, damage, spells, chains, cooldowns, strikes, attacks, notices,
    advance, until, place, spawn, choose, cast, ready, hitsFrom, where, brain, seat, now, free,
  };
}

export type Arena = ReturnType<typeof arena>;

export function check(ok: boolean, what: string) {
  if (!ok) throw new Error(what);
}
