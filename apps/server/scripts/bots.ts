/**
 * Teste dos bots que completam a equipe, sem servidor: a `Hunt` direto, com relógio falso e sorteios de seed fixa.
 * - Sala de espera: só o líder põe e tira bot, até a equipe ter `MAX_PARTY_SIZE`; a liderança nunca vai para um bot.
 * - Na hunt: os bots escolhem magias, batem e conjuram, seguem o líder e nunca levam loot, itens nem poções.
 * - O retrato da troca de anfitrião guarda quem é bot; o último humano saindo leva os bots junto e a hunt acaba.
 * - O bot leva o Grimório da conta de quem o pôs e veste uma cópia do equipamento da classe: não larga nada ao morrer.
 * Uso: npx tsx apps/server/scripts/bots.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  MAX_PARTY_SIZE, MSG, RUNE_IDS, SPELLS, SPELL_LEVEL_XP, createRng, generateDungeon, itemId, talentTree, tileDistance,
  type AttackMessage, type SpellMessage,
} from "@kusa/shared";
import { Hunt, type HuntHost } from "../src/hunt.ts";
import { nextStep } from "../src/pathfinding.ts";
import { stateFromJSON } from "../src/snapshot.ts";
import { DungeonState } from "../src/state.ts";

let clock = 0;
const timers: { at: number; fn: () => void }[] = [];
const ended: string[] = [];
const attacks = new Map<string, number>();
const spells = new Map<string, number>();
let huntOver = false;
const host: HuntHost = {
  now: () => clock,
  setTimeout: (fn, ms) => void timers.push({ at: clock + ms, fn }),
  send: () => {},
  broadcast: (type, msg) => {
    if (type === MSG.attack) { const from = (msg as AttackMessage).from; attacks.set(from, (attacks.get(from) ?? 0) + 1); }
    if (type === MSG.spell) { const from = (msg as SpellMessage).from; spells.set(from, (spells.get(from) ?? 0) + 1); }
  },
  runEnded: (id) => void ended.push(id),
  ended: () => { huntOver = true; },
};

function check(ok: boolean, what: string) {
  if (!ok) throw new Error(what);
  console.log(`✔ ${what}`);
}

/** Avança o relógio da hunt em ticks de 50 ms, disparando os timers vencidos. */
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

const recruit = { talents: {}, spellXp: {} };

// --- Sala de espera ---------------------------------------------------------
const lobby = new Hunt(new DungeonState(), host, { mapId: "crypt", seed: 99 });
lobby.join("a", { ...recruit, name: "Líder", classId: "knight" });
lobby.join("b", { ...recruit, name: "Amigo", classId: "druid" });
check(lobby.addBot("b", { classId: "paladin" }) === null, "quem não é líder não põe bot");
check(lobby.addBot("a", { classId: "dragon" as never }) === null, "classe que não existe é recusada");
const bot1 = lobby.addBot("a", { classId: "paladin" });
const bot2 = lobby.addBot("a", { classId: "sorcerer" });
check(!!bot1 && !!bot2 && lobby.state.players.get(bot1)!.bot, "o líder põe bots nas vagas livres");
check(lobby.addBot("a", { classId: "druid" }) === null && lobby.state.players.size === MAX_PARTY_SIZE, "a equipe não passa de 4");
check(!lobby.removeBot("a", { id: "b" }), "removeBot não tira humano");
check(!lobby.removeBot("b", { id: bot1! }), "quem não é líder não tira bot");
lobby.leave("a");
check(lobby.state.leaderId === "b", "a liderança passa para o humano, não para o bot");
check(lobby.removeBot("b", { id: bot1! }) && !lobby.state.players.has(bot1!), "o novo líder tira um bot");
lobby.leave("b");
check(lobby.state.players.size === 0, "sem humanos na sala de espera, os bots saem junto");

// --- Hunt -------------------------------------------------------------------
const hunt = new Hunt(new DungeonState(), host, { mapId: "crypt", seed: 4242, startLevel: 8, random: createRng(7).next });
hunt.join("a", { ...recruit, name: "Cavaleiro", classId: "knight" });
const bots = ["paladin", "sorcerer", "druid"].map((classId) => hunt.addBot("a", { classId: classId as "paladin" }));
check(bots.every(Boolean), "três bots completam a equipe");
check(hunt.start("a"), "a hunt começa");
hunt.equip("a", []);

const dungeon = generateDungeon(hunt.state.seed, "crypt");
const me = () => hunt.state.players.get("a")!;
let farthest = 0;
// O cavaleiro caça: anda até o monstro mais próximo e ataca. Os bots têm que acompanhar e brigar junto.
for (let i = 0; i < 900 && me().status === "playing"; i++) {
  const p = me();
  let goal: { x: number; y: number } | null = null;
  let best = Infinity;
  hunt.state.monsters.forEach((m) => {
    const dist = tileDistance(p.x, p.y, m.x, m.y);
    if (!m.hidden && dist < best) { best = dist; goal = m; }
  });
  hunt.attacking("a", { on: true });
  if (goal && best > 1) {
    const occupied = new Set<string>();
    hunt.state.monsters.forEach((m) => occupied.add(`${m.x},${m.y}`));
    hunt.state.players.forEach((o) => occupied.add(`${o.x},${o.y}`));
    const step = nextStep(dungeon, p, goal, 1, (x, y) => occupied.has(`${x},${y}`));
    if (step) hunt.move("a", { dx: Math.sign(step.x - p.x) as -1, dy: Math.sign(step.y - p.y) as -1 });
  }
  if (p.hp < p.maxHp * 0.3) p.hp = p.maxHp; // o teste é dos bots: o cavaleiro não morre.
  advance(hunt, 100);
  for (const id of bots) {
    const b = hunt.state.players.get(id!)!;
    if (b.status === "playing") farthest = Math.max(farthest, tileDistance(b.x, b.y, me().x, me().y));
    if (b.loot !== 0 || b.bag.length > 0 || b.healthPotions + b.manaPotions > 0) throw new Error(`${b.name} pegou loot, item ou poção`);
  }
}

const team = bots.map((id) => hunt.state.players.get(id!)!);
console.log(team.map((b) => `${b.name}: nível ${b.level}, ${b.status}, ${attacks.get(bots[team.indexOf(b)]!) ?? 0} golpes, ${spells.get(bots[team.indexOf(b)]!) ?? 0} magias, ${b.spell1}/${b.spell2}`).join("\n"));
check(team.every((b) => b.spell1 && b.spell2), "os bots escolhem as duas magias");
check(bots.some((id) => (attacks.get(id!) ?? 0) > 5), "os bots batem nos monstros");
check(bots.some((id) => (spells.get(id!) ?? 0) > 0), "os bots conjuram magias");
check(farthest <= 15, `os bots seguem o líder (o mais longe ficou a ${farthest} tiles)`);
check(me().loot > 0, "o humano leva loot normalmente");

// A troca de anfitrião guarda quem é bot.
const snapshot = JSON.parse(JSON.stringify({ state: hunt.state.toJSON(), hunt: hunt.exportInternals() }));
const restored = stateFromJSON(snapshot.state);
check(bots.every((id) => restored.players.get(id!)?.bot === true), "o retrato da hunt guarda quem é bot");

// O último humano sai: os bots saem junto, sem resultado para gravar, e a hunt acaba.
hunt.leave("a");
check(ended.length === 1 && ended[0] === "a", "só o humano tem resultado de hunt (bot não grava conta nem telemetria)");
check(team.every((b) => b.status !== "playing") && huntOver, "sem humanos na dungeon, os bots saem e a hunt acaba");

// --- Configuração da conta --------------------------------------------------
// O bot copia o Grimório de quem o pôs (magia comprada e o nível dela) e veste uma cópia do equipamento da classe.
const bought = talentTree("knight").find((t) => t.spellId && t.freeRank === 0 && SPELLS[t.spellId].slot === 0)!;
const maxXp = SPELL_LEVEL_XP[SPELL_LEVEL_XP.length - 1];
const account = new Hunt(new DungeonState(), host, { mapId: "crypt", seed: 777, startLevel: 8, random: createRng(3).next });
account.join("dono", { name: "Dono", classId: "sorcerer", talents: { [bought.id]: 1 }, spellXp: { [bought.id]: maxXp }, activeSpells: [] });
const copy = account.addBot("dono", { classId: "knight" })!;
const knightBot = () => account.state.players.get(copy)!;
check(knightBot().knownSpells.includes(bought.spellId!), "o bot conhece a magia que a conta comprou no Grimório");
check((knightBot().spellRanks.get(bought.spellId!) ?? 0) > 1, "a magia do bot tem o nível da conta");
check(account.botsOf("dono").length === 1 && account.botsOf("dono")[0].classId === "knight", "a hunt sabe de quem é o bot");
check(account.start("dono"), "a hunt com o bot da conta começa");
const sword = itemId("weapon", "sword", 3);
account.equip(copy, [sword, itemId("helmet", "arcane", 2), RUNE_IDS[0]]);
check(knightBot().weapon === sword, "o bot veste o equipamento da classe");
check(knightBot().runes.includes(RUNE_IDS[0]), "o bot leva as runas equipadas na classe");
check(knightBot().bag.length === 0, "o que não serve no bot não vira item na bag dele");
(account as unknown as { endRun(id: string, outcome: string): void }).endRun(copy, "died");
check(account.state.items.size === 0, "o bot morto não larga equipamento no chão (é cópia)");

console.log("\nBOTS OK");
