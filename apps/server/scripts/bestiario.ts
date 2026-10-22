/**
 * Teste do Bestiário, sem servidor: a simulação (`Hunt`) roda sozinha, com o monstro posto ao lado do herói.
 * - Elementos: o Dragão é imune a fogo; mortos-vivos não envenenam; a Fortitude segura o primeiro golpe fatal (menos luz).
 * - Troll: regenera, e fogo interrompe. Hidra: perde cabeça a cada 20% e nascem duas sem fogo; fogo cauteriza.
 * - Efeitos no herói: controle tem teto de 2 s, impede andar e dá imunidade de 4 s; Corroído acumula até 3.
 * - Monstro escondido não pode ser alvo. Língua puxa, Agressivo salta, Voo some invulnerável e cai colado.
 * - Táticas de Bando: a ratazana bate mais com outra colada no mesmo alvo.
 * Uso: npx tsx apps/server/scripts/bestiario.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CONTROL_IMMUNE_MS, CONTROL_MAX_MS, CORRODE_MAX, MONSTERS, MSG, generateDungeon, hasLineOfSight, isWalkable, tileDistance,
  type DamageMessage, type MapId, type MonsterKind,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState, type Monster, type Player } from "../src/state.ts";

let clock = 0;
let timers: { at: number; fn: () => void }[] = [];
let damage: DamageMessage[] = [];
const host: HuntHost = {
  now: () => clock,
  setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
  send: () => {},
  broadcast: (type, msg) => { if (type === MSG.damage) damage.push(msg as DamageMessage); },
  runEnded: () => {},
  ended: () => {},
};

function advance(hunt: Hunt, ms: number) {
  for (let t = 0; t < ms; t += 50) {
    clock += 50;
    for (const timer of timers.filter((x) => x.at <= clock)) {
      timers.splice(timers.indexOf(timer), 1);
      timer.fn();
    }
    hunt.tick(50);
  }
}

/** Hunt com um herói e nenhum monstro (os do mapa saem). */
function arena(mapId: MapId = "crypt", classId: "knight" | "sorcerer" = "knight", startLevel = 10) {
  clock = 0;
  timers = [];
  damage = [];
  const state = new DungeonState();
  const hunt = new Hunt(state, host, { mapId, seed: 4242, startLevel });
  hunt.join("h", { name: "Teste", classId, talents: {}, spellXp: {} });
  hunt.start("h");
  state.monsters.clear();
  const any = hunt as any;
  any.brains.clear();
  const p = state.players.get("h")!;
  const d = generateDungeon(4242, mapId);
  /** Põe um monstro a `dist` tiles do herói, num tile livre e à vista. */
  const spawn = (kind: MonsterKind, dist = 1): Monster => {
    for (let r = dist; r <= dist + 4; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          const x = p.x + ox;
          const y = p.y + oy;
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r || !isWalkable(d, x, y) || !hasLineOfSight(d, p.x, p.y, x, y)) continue;
          if ([...state.monsters.values()].some((m) => m.x === x && m.y === y)) continue;
          return any.addMonster(kind, x, y, 0);
        }
      }
    }
    throw new Error(`sem lugar para ${kind}`);
  };
  const brain = (m: Monster) => any.brains.get(m.id);
  const hit = (m: Monster, amount: number, source: string) =>
    any.damageMonster(m, amount, { attacker: "h", fromX: p.x, fromY: p.y, fx: "slash" }, source) as number;
  return { state, hunt, any, p: p as Player, d, spawn, brain, hit };
}

function check(ok: boolean, what: string) {
  if (!ok) throw new Error(what);
}

// --- Elementos ----------------------------------------------------------------
{
  const { spawn, hit } = arena();
  const dragon = spawn("dragon", 3);
  check(hit(dragon, 50, "fireball") === 0, "o Dragão devia ser imune a fogo");
  check(hit(dragon, 50, "basic") === 50, "o Dragão devia levar dano físico normal");
  console.log("Dragão imune a fogo OK");
}
{
  const { spawn, any, brain } = arena();
  const skeleton = spawn("skeleton");
  any.applyDot(skeleton, brain(skeleton), "h", "test", 5, 3000, "poison", clock);
  check(brain(skeleton).dot === null, "morto-vivo não devia envenenar");
  any.applyDot(skeleton, brain(skeleton), "h", "test", 5, 3000, "burn", clock);
  check(brain(skeleton).dot?.kind === "burn", "morto-vivo devia queimar");
  console.log("morto-vivo imune a veneno OK");
}
{
  const { spawn, hit, state } = arena();
  const bog = spawn("bogBody");
  hit(bog, 99_999, "basic");
  check(state.monsters.has(bog.id) && bog.hp === 1, `a Fortitude devia segurar o golpe fatal (vida ${bog.hp})`);
  hit(bog, 5, "basic");
  check(!state.monsters.has(bog.id), "o segundo golpe devia derrubar o Afogado");
  const holy = spawn("bogBody");
  hit(holy, 99_999, "holy_arrow");
  check(!state.monsters.has(holy.id), "luz devia passar pela Fortitude");
  console.log("Fortitude Morta-viva OK");
}

// --- Troll e Hidra ----------------------------------------------------------------
{
  const { spawn, hit, hunt, p } = arena("swamp");
  p.hp = p.maxHp = 1_000_000;
  const troll = spawn("troll", 6);
  troll.hp = Math.round(troll.maxHp / 2);
  const before = troll.hp;
  advance(hunt, 2100);
  check(troll.hp > before, "o Troll devia regenerar");
  hit(troll, 10, "fireball");
  const burnt = troll.hp;
  advance(hunt, 3000);
  check(troll.hp <= burnt, "fogo devia interromper a regeneração");
  advance(hunt, 3500);
  check(troll.hp > burnt, "a regeneração devia voltar depois de 5 s");
  console.log("Regeneração do Troll OK");
}
{
  const { spawn, hit, hunt, p, brain, state } = arena("swamp");
  p.hp = p.maxHp = 1_000_000;
  const hydra = spawn("hydra", 7);
  check(hydra.variant === 3, `a Hidra devia nascer com 3 cabeças (${hydra.variant})`);
  hit(hydra, Math.ceil(hydra.maxHp * 0.21), "basic");
  check(brain(hydra).heads === 2 && hydra.variant === 2, "a Hidra devia perder uma cabeça a 80% da vida");
  advance(hunt, 6100);
  check(brain(hydra).heads === 4, `sem fogo, deviam nascer duas cabeças (${brain(hydra).heads})`);
  hit(hydra, Math.ceil(hydra.maxHp * 0.25), "fireball");
  const heads = brain(hydra).heads;
  advance(hunt, 6100);
  check(state.monsters.has(hydra.id) && brain(hydra).heads === heads, "o fogo devia cauterizar a cabeça cortada");
  console.log("cabeças da Hidra OK");
}

// --- Efeitos no herói -----------------------------------------------------------
{
  const { spawn, any, hunt, p, d } = arena();
  const naga = spawn("naga", 5);
  any.affectHero("h", { kind: "root", ms: 9000 }, naga, 10);
  check(p.effects === "root", `o herói devia estar preso (${p.effects})`);
  const seat = any.seats.get("h");
  check(seat.effects.root.until - clock === CONTROL_MAX_MS, "o controle devia ter teto de 2 s");
  const x = p.x;
  const y = p.y;
  const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isWalkable(d, x + dx, y + dy))!;
  hunt.move("h", { dx: dir[0], dy: dir[1] });
  check(p.x === x && p.y === y, "preso não devia andar");
  advance(hunt, CONTROL_MAX_MS + 100);
  check(p.effects === "", "o efeito devia acabar");
  any.affectHero("h", { kind: "root", ms: 1000 }, naga, 10);
  check(p.effects === "", "depois do controle, o herói devia ficar imune por um tempo");
  advance(hunt, CONTROL_IMMUNE_MS);
  any.affectHero("h", { kind: "root", ms: 1000 }, naga, 10);
  check(p.effects === "root", "a imunidade devia acabar");
  for (let i = 0; i < 5; i++) any.affectHero("h", { kind: "corrode", ms: 6000 }, naga, 10);
  check(seat.effects.corrode.stacks === CORRODE_MAX, "Corroído devia acumular até o máximo");
  console.log("efeitos no herói OK");
}

// --- Escondido, Língua, Agressivo e Voo -----------------------------------------------
{
  const { spawn, any, hunt, p } = arena();
  const rat = spawn("rat");
  rat.hidden = true;
  check(any.nearestMonsterInRange(p, 3) === null, "monstro escondido não devia ser alvo automático");
  hunt.target("h", { id: rat.id });
  check(p.target === "", "monstro escondido não devia ser travado como alvo");
  console.log("monstro escondido OK");
}
{
  const { spawn, hunt, p, brain } = arena("swamp");
  p.hp = p.maxHp = 1_000_000;
  const frog = spawn("frog", 3);
  brain(frog).abilityReadyAt = { tongue: 0 };
  brain(frog).targetId = "h";
  advance(hunt, 100);
  check(tileDistance(p.x, p.y, frog.x, frog.y) <= 1, "a Língua devia puxar o herói para colado no sapo");
  const orcHunt = arena();
  orcHunt.p.hp = orcHunt.p.maxHp = 1_000_000;
  const orc = orcHunt.spawn("orc", 4);
  orcHunt.brain(orc).abilityReadyAt = { aggressive: 0 };
  orcHunt.brain(orc).targetId = "h";
  advance(orcHunt.hunt, 100);
  check(tileDistance(orcHunt.p.x, orcHunt.p.y, orc.x, orc.y) <= 1, "o Orc devia saltar até o herói");
  console.log("Língua e Agressivo OK");
}
{
  const { spawn, hit, hunt, p, brain } = arena();
  p.hp = p.maxHp = 1_000_000;
  const dragon = spawn("dragon", 4);
  brain(dragon).targetId = "h";
  advance(hunt, 100);
  hit(dragon, Math.ceil(dragon.maxHp * 0.55), "basic");
  advance(hunt, 100);
  check(dragon.hidden && brain(dragon).diving, "abaixo de 50% o Dragão devia alçar voo na hora");
  check(hit(dragon, 100, "basic") === 0, "voando, o Dragão não devia levar dano");
  advance(hunt, (MONSTERS.dragon.abilities!.find((a) => a.id === "flight")!.vanishMs ?? 2000) + 100);
  check(!dragon.hidden && tileDistance(p.x, p.y, dragon.x, dragon.y) <= 1, "o Dragão devia cair colado no herói");
  console.log("Voo do Dragão OK");
}

// --- Táticas de Bando ----------------------------------------------------------------
{
  const average = (pack: boolean) => {
    const { spawn, hunt, p, any } = arena("crypt", "knight", 20);
    p.hp = p.maxHp = 1_000_000;
    const rat = spawn("rat");
    if (pack) {
      const other = spawn("rat");
      any.brains.get(other.id).abilityReadyAt = {};
    }
    damage = [];
    advance(hunt, 30_000);
    const bites = damage.filter((m) => m.toPlayer && m.attacker === rat.id);
    return bites.reduce((sum, m) => sum + m.amount, 0) / Math.max(1, bites.length);
  };
  const alone = average(false);
  const pack = average(true);
  check(pack > alone * 1.25, `Táticas de Bando: ${pack.toFixed(1)} com bando contra ${alone.toFixed(1)} sozinha`);
  console.log(`Táticas de Bando OK (${alone.toFixed(1)} → ${pack.toFixed(1)})`);
}

console.log("BESTIÁRIO OK");
process.exit(0);
