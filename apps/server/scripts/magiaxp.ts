/**
 * Teste de fumaça do nível das magias pelo uso, contra um servidor com KUSA_START_LEVEL=8 (slots abertos):
 *   - regras: limiares de XP, teto por hunt, XP por lançamento (segundos de recarga) e a perda na morte, que desce
 *     níveis mas nunca abaixo do nível 1;
 *   - na arena (`arena.ts`, sem servidor e sem sorteio de mapa): o Feiticeiro lança a Tempestade do Vazio sem monstro
 *     por perto (não conta XP) e a Esfera Sombria num monstro posto a 3 tiles (conta), e o resumo do fim da hunt traz
 *     as duas magias;
 *   - pela rede: um Feiticeiro convidado escolhe as magias, lança a Tempestade, foge pelo portal e recebe o resumo das
 *     magias (sem procurar monstro no mapa sorteado, que falhava por azar).
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 PORT=2601 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/magiaxp.ts http://localhost:2601
 */
import { Client } from "@colyseus/sdk";
import {
  MSG, ROOM_NAME, SPELLS, SPELL_LEVEL_XP, SPELL_XP_COMBAT_TILES, SPELL_XP_HUNT_CAP, castXp,
  generateDungeon, spellLevelFromXp, spellLevelProgress, spellXpAfterRun, type RunEndedMessage,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";
import { nextStep } from "../src/pathfinding.ts";
import { HERO, arena, check } from "./arena.ts";
import { until, wait } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

rules();
inArena();
await hunt();
console.log("MAGIAXP OK");
process.exit(0);

function rules() {
  const [l1, l2, , , l5] = SPELL_LEVEL_XP;
  check(spellLevelFromXp(0) === 0 && spellLevelFromXp(l1 - 1) === 0 && spellLevelFromXp(l1) === 1, "nível 1 no limiar errado");
  check(spellLevelFromXp(l5) === 5 && spellLevelFromXp(l5 * 10) === 5, "nível máximo errado");
  const p = spellLevelProgress(l1 + 10);
  check(p.level === 1 && p.into === 10 && p.need === l2 - l1, `progresso errado: ${JSON.stringify(p)}`);
  check(castXp(SPELLS.shadow_orb) === 4 && castXp(SPELLS.void_storm) === 12, "XP por lançamento devia ser a recarga em segundos");
  check(spellXpAfterRun(0, 10_000, false) === SPELL_XP_HUNT_CAP, "o teto por hunt não cortou");
  check(spellXpAfterRun(100, 50, false) === 150, "sair vivo soma o ganho inteiro");
  // Morte: tira 5% do total, desce de nível, mas para no nível 1 (e não mexe em quem ainda não chegou nele).
  check(spellXpAfterRun(l5, 0, true) === l5 - Math.floor(l5 * 0.05), "a morte devia tirar 5%");
  check(spellLevelFromXp(spellXpAfterRun(l5, 0, true)) === 4, "a morte devia poder descer de nível");
  check(spellXpAfterRun(l1, 0, true) === l1, "a morte não pode tirar o nível 1");
  check(spellXpAfterRun(l1 + 2, 0, true) === l1, "a perda para no limiar do nível 1");
  check(spellXpAfterRun(30, 10, true) === 40, "aprendiz não perde XP");
}

function inArena() {
  const a = arena({ classId: "sorcerer", startLevel: 8, allSpells: false });
  check(a.p.spellRanks.get("shadow_orb") === 1, `Esfera Sombria no nível ${a.p.spellRanks.get("shadow_orb")}`);
  a.choose("shadow_orb", "void_storm");
  // Sem monstro na arena: a Tempestade sai, mas não rende XP.
  a.ready();
  a.cast(1);
  a.advance(1000);
  check(a.spells.some((x) => x.spellId === "void_storm"), "a Tempestade do Vazio não saiu");
  // A Esfera num monstro a 3 tiles (dentro de SPELL_XP_COMBAT_TILES) conta.
  check(SPELL_XP_COMBAT_TILES >= 3, "o monstro a 3 tiles devia estar perto o bastante para contar XP");
  const m = a.place("zombie", 3, 0);
  a.ready();
  a.cast(0, m);
  a.advance(500);
  let result: RunEndedMessage | undefined;
  a.any.host.runEnded = (_id: string, r: RunEndedMessage) => { result = r; };
  a.any.endRun(HERO, "escaped");
  check(!!result, "a hunt não mandou o resumo");
  const r = result!;
  console.log("arena:", JSON.stringify(r.spells));
  const orb = r.spells.find((s) => s.id === "shadow_orb");
  const storm = r.spells.find((s) => s.id === "void_storm");
  check(!!orb && !!storm, "o resumo devia trazer as duas magias escolhidas");
  check(orb!.gained === castXp(SPELLS.shadow_orb), `a Esfera no monstro devia render ${castXp(SPELLS.shadow_orb)} XP (${orb!.gained})`);
  check(storm!.gained === 0, `a Tempestade sem monstro por perto rendeu ${storm!.gained} XP`);
  check(orb!.lost === 0 && orb!.levelBefore === 1 && orb!.xp === SPELL_LEVEL_XP[0] + orb!.gained, `Esfera: ${JSON.stringify(orb)}`);
}

async function hunt() {
  const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "sorcerer", rulesVersion: RULES_VERSION });
  room.onMessage("*", () => {});
  const ended = new Promise<RunEndedMessage>((resolve) => room.onMessage(MSG.runEnded, resolve));
  await wait(300);
  room.send(MSG.start);
  await wait(300);
  const me = () => room.state.players.get(room.sessionId);
  if (me().level < 8) throw new Error(`o servidor precisa de KUSA_START_LEVEL=8 (nível ${me().level})`);
  if (me().spellRanks.get("shadow_orb") !== 1) throw new Error(`Esfera Sombria no nível ${me().spellRanks.get("shadow_orb")}`);
  room.send(MSG.chooseSpell, { slot: 0, spellId: "shadow_orb" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "void_storm" });
  await wait(200);
  room.send(MSG.cast, { slot: 1 });
  await wait(200);

  // Volta para o portal e foge.
  const dungeon = generateDungeon(room.state.seed, room.state.mapId);
  const portal = dungeon.portal;
  const deadline = Date.now() + 30_000;
  let result: RunEndedMessage | undefined;
  void ended.then((r) => { result = r; });
  while (!result && Date.now() < deadline) {
    const p = me();
    const blocked = new Set<number>();
    room.state.monsters.forEach((o: any) => blocked.add(o.y * dungeon.width + o.x));
    const step = nextStep(dungeon, p, portal, 0, (x, y) => blocked.has(y * dungeon.width + x));
    if (step) room.send(MSG.move, { dx: step.x - p.x, dy: step.y - p.y });
    await wait(100);
  }
  await until(() => !!result, 1000, `não chegou ao portal (${me().x},${me().y} → ${portal.x},${portal.y})`);
  const r = result!;
  console.log("fim da hunt:", r.outcome, JSON.stringify(r.spells));
  if (r.outcome !== "escaped") throw new Error(`esperava fuga, veio ${r.outcome}`);
  const orb = r.spells.find((s) => s.id === "shadow_orb");
  const storm = r.spells.find((s) => s.id === "void_storm");
  if (!orb || !storm) throw new Error("o resumo devia trazer as duas magias escolhidas");
  if (orb.levelBefore !== 1 || orb.lost !== 0) throw new Error(`Esfera: ${JSON.stringify(orb)}`);
}
