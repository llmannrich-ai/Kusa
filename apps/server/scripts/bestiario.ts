/**
 * Teste do Bestiário, sem servidor: a simulação (`Hunt`) roda sozinha, com o monstro posto ao lado do herói.
 * - Elementos: o Dragão é imune a fogo; mortos-vivos não envenenam; a Fortitude segura o primeiro golpe fatal (menos luz).
 * - Troll: regenera, e fogo interrompe. Hidra: perde cabeça a cada 20% e nascem duas sem fogo; fogo cauteriza.
 * - Efeitos no herói: controle tem teto de 2 s, impede andar e dá imunidade de 4 s; Corroído acumula até 3.
 * - Monstro escondido não pode ser alvo. Língua puxa, Agressivo salta, Voo some invulnerável, cai colado e se recompõe antes de bater de novo;
 *   boss espera 1 s entre uma habilidade e outra.
 * - Táticas de Bando: a ratazana bate mais com outra colada no mesmo alvo.
 * - Pudim Negro se divide com lâmina e raio (fogo não); Monte Errante se cura com raio; Cubo engole e cospe ao apanhar.
 * - Mímico fica disfarçado até o herói encostar e dá o loot do baú; a Bruxa Verde some e deixa cópias que somem com ela.
 * - Arqueiro recua, Bullywug nasce camuflado, Campeão ganha vida, XP e afixo; os encontros saem iguais pela seed.
 * Uso: npx tsx apps/server/scripts/bestiario.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CONTROL_IMMUNE_MS, CONTROL_MAX_MS, CORRODE_MAX, MAPS, MONSTERS, MSG, createRng, generateDungeon, hasLineOfSight, isWalkable, tileDistance,
  type DamageMessage, type MapId, type MonsterKind, type MonsterStrikeMessage,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { DungeonState, type Monster, type Player } from "../src/state.ts";

let clock = 0;
let timers: { at: number; fn: () => void }[] = [];
let damage: DamageMessage[] = [];
/** Habilidades de monstro soltas: quem, qual e quando (ms do relógio falso). */
let strikes: { id: string; ability: string; at: number }[] = [];
const host: HuntHost = {
  now: () => clock,
  setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
  send: () => {},
  broadcast: (type, msg) => {
    if (type === MSG.damage) damage.push(msg as DamageMessage);
    const strike = msg as MonsterStrikeMessage;
    if (type === MSG.monsterStrike && !strike.rising) strikes.push({ id: strike.id, ability: strike.ability, at: clock });
  },
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
  strikes = [];
  const state = new DungeonState();
  // Sorteios de seed fixa (dano, chances): a comparação das Táticas de Bando falhava 1 vez em 20 com Math.random.
  const hunt = new Hunt(state, host, { mapId, seed: 4242, startLevel, random: createRng(Number(process.env.KUSA_SEED) || 4242).next });
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
  hunt.move("h", { dx: dir[0] as -1 | 0 | 1, dy: dir[1] as -1 | 0 | 1 });
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
  // A queda é o golpe: o Multiataque e o sopro não saem colados nela (antes vinham juntos e matavam de uma vez).
  const landed = damage.length;
  const blows = () => damage.slice(landed).filter((x) => x.toPlayer && x.attacker === dragon.id && !x.dot).length;
  advance(hunt, 1200);
  check(blows() === 0, `logo depois de cair, o Dragão devia se recompor (${blows()} golpes)`);
  advance(hunt, 1500);
  check(blows() > 0, "recomposto, o Dragão devia voltar a atacar");
  console.log("Voo do Dragão OK");
}
{
  // Boss enfurecido: as habilidades não saem coladas (antes, sopro e Escuridão vinham com 50 ms de diferença).
  const { spawn, hit, hunt, p, brain } = arena("swamp", "sorcerer", 12);
  p.hp = p.maxHp = 1_000_000;
  const dragon = spawn("blackDragon", 3);
  brain(dragon).targetId = "h";
  advance(hunt, 100);
  hit(dragon, Math.ceil(dragon.maxHp * 0.55), "basic");
  advance(hunt, 20_000);
  const used = strikes.filter((s) => s.id === dragon.id);
  const gaps = used.slice(1).map((s, i) => s.at - used[i].at);
  check(used.length >= 4, `o Dragão negro enfurecido devia usar várias habilidades (${used.length})`);
  check(gaps.every((g) => g >= 1000), `as habilidades do boss deviam ter 1 s entre elas (${gaps.join(", ")} ms)`);
  console.log("Intervalo entre habilidades do boss OK");
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
    // 2 minutos (cerca de 100 mordidas): a média sai da variação de ±15% de cada mordida com folga para os 30% do bando.
    advance(hunt, 120_000);
    const bites = damage.filter((m) => m.toPlayer && m.attacker === rat.id);
    return bites.reduce((sum, m) => sum + m.amount, 0) / Math.max(1, bites.length);
  };
  const alone = average(false);
  const pack = average(true);
  check(pack > alone * 1.25, `Táticas de Bando: ${pack.toFixed(1)} com bando contra ${alone.toFixed(1)} sozinha`);
  console.log(`Táticas de Bando OK (${alone.toFixed(1)} → ${pack.toFixed(1)})`);
}

// --- Pudim Negro, Monte Errante, Cubo Gelatinoso ------------------------------------
{
  const { spawn, hit, state } = arena("swamp");
  const pudding = spawn("blackPudding", 3);
  const total = pudding.hp;
  hit(pudding, Math.ceil(pudding.maxHp * 0.2), "basic");
  const parts = [...state.monsters.values()].filter((m) => m.kind === "blackPudding");
  check(parts.length === 2, `golpe forte de lâmina devia dividir o pudim (${parts.length})`);
  check(parts.reduce((sum, m) => sum + m.hp, 0) === total - Math.ceil(pudding.maxHp * 0.2), "a divisão não devia criar vida");
  const before = parts.length;
  hit(parts[0], Math.ceil(parts[0].maxHp * 0.2), "fireball");
  check([...state.monsters.values()].filter((m) => m.kind === "blackPudding").length === before, "fogo não devia dividir");
  const mound = spawn("shamblingMound", 3);
  mound.hp -= 50;
  const hp = mound.hp;
  check(hit(mound, 40, "lightning_bolt") === 0 && mound.hp === hp + 40, "energia devia curar o Monte Errante");
  console.log("Divisão e Absorver OK");
}
{
  const { spawn, hit, hunt, p, brain, any } = arena();
  p.hp = p.maxHp = 1_000_000;
  const cube = spawn("gelatinousCube");
  check(cube.hidden, "o Cubo devia nascer camuflado");
  brain(cube).abilityReadyAt = { engulf: 0 };
  advance(hunt, 100);
  check(!cube.hidden, "o Cubo devia aparecer ao notar o herói");
  check(p.effects.includes("engulf") && brain(cube).engulfing === "h", `o herói devia ser engolido (${p.effects})`);
  const x = p.x;
  hunt.move("h", { dx: 1, dy: 0 });
  hunt.move("h", { dx: -1, dy: 0 });
  check(p.x === x, "engolido não devia andar");
  hit(cube, Math.ceil(cube.maxHp * 0.16), "basic");
  check(!p.effects.includes("engulf") && brain(cube).engulfing === null, "apanhar muito devia fazer o Cubo cuspir o herói");
  // Logo depois, o herói está imune: o Cubo não pode ficar "engolindo" ninguém (e parado para sempre).
  brain(cube).abilityReadyAt = { engulf: 0 };
  brain(cube).nextAttackAt = 0;
  advance(hunt, 100);
  check(!p.effects.includes("engulf") && brain(cube).engulfing === null, "herói imune não devia ser engolido nem travar o Cubo");
  void any;
  console.log("Cubo Gelatinoso OK");
}

// --- Mímico e Bruxa Verde ------------------------------------------------------------
{
  const { spawn, hunt, p, state, any, hit } = arena();
  p.hp = p.maxHp = 1_000_000;
  const mimic = spawn("mimic", 3);
  any.mimicDepth.set(mimic.id, 0);
  advance(hunt, 2000);
  check(mimic.hidden && tileDistance(p.x, p.y, mimic.x, mimic.y) >= 3, "o Mímico devia ficar parado, disfarçado");
  hunt.target("h", { id: mimic.id });
  check(p.target === "", "o Mímico disfarçado não devia ser alvo");
  any.mimicDepth.delete(mimic.id);
  const near = spawn("mimic", 1);
  any.mimicDepth.set(near.id, 0);
  advance(hunt, 100);
  check(!near.hidden, "o Mímico devia se revelar quando o herói encosta");
  const loot = p.loot;
  hit(near, 1_000_000, "basic");
  check(!state.monsters.has(near.id) && p.loot - loot >= 30, `o Mímico devia dar o loot do baú (+${p.loot - loot})`);
  console.log("Mímico OK");
}
{
  const { spawn, hunt, p, state, brain, hit } = arena("swamp");
  p.hp = p.maxHp = 1_000_000;
  const hag = spawn("greenHag", 3);
  brain(hag).targetId = "h";
  brain(hag).abilityReadyAt = { illusion: 0, poisonCloud: 999_999 };
  advance(hunt, 100);
  const copies = [...state.monsters.values()].filter((m) => m.kind === "hagIllusion");
  check(hag.hidden && copies.length === 2, `a Bruxa devia sumir e deixar 2 cópias (${copies.length})`);
  check(copies.every((c) => c.hp === hag.hp && c.maxHp === hag.maxHp), "as cópias deviam aparentar a vida da Bruxa");
  const xp = p.xp;
  hit(copies[0], 1, "basic");
  check(!state.monsters.has(copies[0].id) && p.xp === xp, "a cópia devia sumir com um golpe e sem dar XP");
  hit(hag, 1_000_000, "basic");
  check(![...state.monsters.values()].some((m) => m.kind === "hagIllusion"), "as cópias deviam sumir com a Bruxa");
  console.log("Bruxa Verde OK");
}

// --- Líder, artilheiro, camuflado, Campeão ----------------------------------------------
{
  const { spawn, hunt, p, brain } = arena();
  p.hp = p.maxHp = 1_000_000;
  const archer = spawn("goblinArcher", 2);
  brain(archer).targetId = "h";
  advance(hunt, 3000);
  check(tileDistance(p.x, p.y, archer.x, archer.y) >= 3, `o arqueiro devia recuar até 3 tiles (${tileDistance(p.x, p.y, archer.x, archer.y)})`);
  const frog = arena("swamp");
  const bully = frog.spawn("bullywug", 8);
  check(bully.hidden, "o Bullywug devia nascer camuflado");
  console.log("Artilheiro e camuflagem OK");
}
{
  const { spawn, any, brain } = arena();
  const orc = spawn("orc", 3);
  const hp = orc.maxHp;
  const xp = brain(orc).xp;
  any.ai.makeChampion(orc, brain(orc), "shielded");
  check(orc.champion === "shielded" && orc.maxHp === hp * 2 && brain(orc).xp === Math.round(xp * 2.5), "o Campeão devia ter vida e XP maiores");
  check(brain(orc).elements.physical === 0.5, "o Escudado devia resistir a físico");
  const leader = spawn("goblin", 3);
  any.ai.makeChampion(leader, brain(leader), "commander");
  check(!!brain(leader).traits.leader, "o Comandante devia ganhar a aura de líder");
  check(!MONSTERS.goblin.traits?.leader, "o afixo não devia mudar a tabela do monstro");
  console.log("Campeões OK");
}

// --- Encontros -----------------------------------------------------------------------
{
  for (const mapId of ["crypt", "swamp", "desert"] as MapId[]) {
    const counts = new Map<string, number>();
    for (let seed = 1; seed <= 40; seed++) {
      const state = new DungeonState();
      new Hunt(state, host, { mapId, seed });
      const again = new DungeonState();
      new Hunt(again, host, { mapId, seed });
      const list = (st: DungeonState) => [...st.monsters.values()].map((m) => `${m.kind}@${m.x},${m.y}`).sort().join();
      check(list(state) === list(again), `${mapId}: os monstros deviam sair iguais pela seed`);
      state.monsters.forEach((m) => counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1));
    }
    const missing = MAPS[mapId].encounters.flatMap((e) => e.table.map(([k]) => k)).filter((k) => !counts.has(k));
    check(missing.length === 0, `${mapId}: monstros que nunca nasceram em 40 seeds: ${missing.join()}`);
    console.log(`${mapId}: ${[...counts].map(([k, n]) => `${k} ${n}`).join(", ")}`);
  }
  console.log("Encontros OK");
}

console.log("BESTIÁRIO OK");
process.exit(0);
