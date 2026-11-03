/**
 * Campanha (mapa mundi): cada cenário abre ao vencer o boss do anterior, sem servidor (`arena.ts`):
 *   - a ordem do packages/shared: só o primeiro (Orla do Bosque) começa aberto; cada boss abre o seguinte;
 *   - lado de bifurcação abre com um boss só: na trifurcação da Fíbula Profunda, a Cripta com o Rei Ossudo, o Mar de
 *     Areia com o Colosso Cantante e o Bosque Velho com o Dragão Verde Jovem; na Travessia, as Dunas com o Observador;
 *   - os dois lados se reencontram na Fortaleza Orc: abre com o boss das Mesas ou com o do Coração da Mata;
 *   - o boss principal morto credita o cenário a todo humano na hunt, vivo ou morto (`HuntHost.mapCleared`,
 *     `stats.bossClear`), e não a quem saiu da hunt nem aos bots;
 *   - mini-boss morto não credita nada.
 * Uso: npx tsx scripts/campanha.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { UNLOCK_BOSS, WORLD_ORDER, lastUnlocked, mapUnlocked, unlockedBy, unlockedByAny, type MapId } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

// --- Ordem da campanha -----------------------------------------------------------------------
check(WORLD_ORDER.join() === "grove,marsh,fibula,fibula2,crypt,desert,swamp,cavern,oldwood,heartwood,dunes,mesas,fortress,bog,badlands", `ordem da campanha: ${WORLD_ORDER}`);
const open = (clears: string[]) => WORLD_ORDER.filter((id) => mapUnlocked(clears, id)).join();
check(open([]) === "grove", `conta nova: só a Orla do Bosque aberta (veio ${open([])})`);
check(open(["grove"]) === "grove,marsh", `o Dragão jovem da Orla abre o Kosaradius (veio ${open(["grove"])})`);
check(open(["grove", "marsh"]) === "grove,marsh,fibula", `Grumak vencido abre a Fíbula (veio ${open(["grove", "marsh"])})`);
check(open(["grove", "marsh", "fibula"]) === "grove,marsh,fibula,fibula2", `a Fíbula vencida abre a Fíbula Profunda, mas não a Cripta (veio ${open(["grove", "marsh", "fibula"])})`);
// A trifurcação da Fíbula Profunda: cada covil abre o seu lado, e só ele.
const F = ["grove", "marsh", "fibula", "fibula2"];
check(open([...F, "boneKing"]) === [...F, "crypt"].join(), `o Rei Ossudo (oeste) abre a Cripta (veio ${open([...F, "boneKing"])})`);
check(open([...F, "singingColossus"]) === [...F, "desert"].join(), `o Colosso Cantante (norte) abre o Mar de Areia (veio ${open([...F, "singingColossus"])})`);
check(open([...F, "greenDragon"]) === [...F, "oldwood"].join(), `o Dragão Verde Jovem (leste) abre o Bosque Velho (veio ${open([...F, "greenDragon"])})`);
check(open([...F, "boneKing", "singingColossus", "greenDragon"]) === [...F, "crypt", "desert", "oldwood"].join(), "os três covis abrem os três lados");
check(open([...F, "boneKing", "crypt"]) === [...F, "crypt"].join(), "a Cripta vencida não abre mais nada (o Mar de Areia vem do Colosso Cantante)");
check(open(["crypt"]) === "grove", "a Cripta vencida (como convidado) não abre o Mar de Areia");
check(open(["basilisk"]) === "grove", "o Basilisco da Travessia não abre mais o Bosque Velho (a floresta vem da Fíbula Profunda)");
check(open(["singingColossus"]) === "grove,desert" && open(["greenDragon"]) === "grove,oldwood", "o boss do covil vencido como convidado abre o lado dele");
// O deserto, da Fíbula Profunda até a Travessia.
const D = [...F, "singingColossus"];
check(open([...D, "desert"]) === [...F, "desert", "swamp"].join(), "Verme da Areia abre o Pântano das Ruínas");
check(open([...D, "desert", "swamp"]) === [...F, "desert", "swamp", "cavern"].join(), "Hidra ou Dragão negro abre a Caverna da Travessia");
const travessia = [...D, "desert", "swamp", "cavern"];
/** Os cenários abertos com `travessia` (sem os bosses, que não são cenário). */
const T = [...F, "desert", "swamp", "cavern"];
check(open(travessia) === T.join(), "a Travessia vencida sem o Observador não abre as Dunas");
check(open([...travessia, "beholder"]) === [...T, "dunes"].join(), "o Observador abre as Dunas Cantantes");
check(open(["beholder"]) === "grove,dunes", "o Observador vencido como convidado abre as Dunas, mesmo sem a Travessia vencida");
check(open([...travessia, "beholder", "dunes"]) === [...T, "dunes", "mesas"].join(), "o boss das Dunas abre as Mesas de Solária");
check(open([...travessia, "beholder", "dunes", "mesas"]) === [...T, "dunes", "mesas", "fortress"].join(), "o boss das Mesas abre a Fortaleza Orc");
check(open([...travessia, "beholder", "dunes", "mesas", "fortress"]) === [...T, "dunes", "mesas", "fortress", "bog", "badlands"].join(), "Vorgak abre os dois lados da etapa 9 (Charco Cinzento e Ermos Rubros)");
// A floresta, da Fíbula Profunda até a Fortaleza Orc.
const M = [...F, "greenDragon"];
check(open([...M, "oldwood"]) === [...F, "oldwood", "heartwood"].join(), "o boss do Bosque Velho abre o Coração da Mata");
check(open([...M, "oldwood", "heartwood"]) === [...F, "oldwood", "heartwood", "fortress"].join(), "o boss do Coração da Mata também abre a Fortaleza Orc (os dois lados se reencontram)");
check(open([...M, "oldwood", "heartwood", "fortress"]) === [...F, "oldwood", "heartwood", "fortress", "bog", "badlands"].join(), "Vorgak vencido pela floresta abre os dois lados da etapa 9");
check(lastUnlocked([...M, "oldwood", "heartwood"]) === "fortress", "pela floresta, o herói espera na Fortaleza Orc");
check(unlockedByAny("fortress").join() === "mesas,heartwood" && unlockedByAny("grove").length === 0 && unlockedByAny("bog").join() === "fortress", "quem abre cada cenário, com os encontros de dois lados");
check(open([...travessia, "boneKing", "greenDragon", "oldwood", "heartwood", "beholder", "dunes", "mesas", "fortress"]) === WORLD_ORDER.join(), "os três lados vencidos abrem tudo");
check(open(["boneKing"]) === "grove,crypt", "o Rei Ossudo vencido como convidado abre a Cripta, mesmo sem a Fíbula vencida");
check(unlockedBy("fibula") === "marsh" && unlockedBy("fibula2") === "fibula", "a Fíbula e a Fíbula Profunda ficam depois do Kosaradius");
check(unlockedBy("crypt") === "fibula2" && unlockedBy("desert") === "fibula2" && unlockedBy("oldwood") === "fibula2", "a Fíbula Profunda é a trifurcação: Cripta, Mar de Areia e Bosque Velho");
check(UNLOCK_BOSS.crypt === "boneKing" && UNLOCK_BOSS.desert === "singingColossus" && UNLOCK_BOSS.oldwood === "greenDragon", "cada lado da trifurcação com o boss do covil dele");
check(unlockedBy("grove") === undefined && unlockedBy("marsh") === "grove" && unlockedBy("swamp") === "desert" && unlockedBy("cavern") === "swamp", "quem abre cada cenário");
check(unlockedBy("dunes") === "cavern" && unlockedBy("heartwood") === "oldwood" && unlockedBy("fortress") === "mesas", "a Travessia e as Ruínas do Império");
check(unlockedBy("bog") === "fortress" && unlockedBy("badlands") === "fortress", "a bifurcação da Fortaleza Orc");
check(!mapUnlocked([...travessia, "beholder", "dunes", "mesas"], "gates"), "os Portões do Império saíram da campanha (não abrem)");
check(lastUnlocked([]) === "grove" && lastUnlocked(["grove"]) === "marsh" && lastUnlocked(["grove", "marsh"]) === "fibula" && lastUnlocked([...F, "boneKing"]) === "crypt" && lastUnlocked([...M]) === "oldwood", "o herói espera no último cenário aberto");
console.log("ordem da campanha OK");

// --- Crédito do boss -------------------------------------------------------------------------
const a = arena({
  mapId: "marsh",
  allies: [{ classId: "sorcerer" }, { classId: "druid" }, { classId: "paladin", bot: true }],
});
const cleared: string[][] = [];
const killed: string[] = [];
a.any.host.mapCleared = (ids: string[], boss: string) => { cleared.push(ids); killed.push(boss); };
// h2 morre antes do boss (ganha o cenário); h3 sai da hunt (não ganha); h4 é bot (não ganha).
a.any.endRun("h2", "died");
a.hunt.leave("h3");
const mini = a.spawn("ogreBruiser", 2);
a.any.killMonster(mini, a.brain(mini), HERO);
check(cleared.length === 0, "mini-boss morto não vence o cenário");
const boss = a.spawn("ogreKing", 2);
a.any.killMonster(boss, a.brain(boss), HERO);
check(cleared.length === 1, `o boss principal avisa uma vez (avisou ${cleared.length})`);
check(killed[0] === "ogreKing", `o aviso diz qual boss caiu (veio ${killed[0]})`);
check(cleared[0]?.sort().join() === [HERO, "h2"].sort().join(), `vencem o vivo e o morto, não quem saiu nem o bot: ${cleared[0]}`);
check(a.seat().stats.bossClear, "stats.bossClear marca quem estava vivo");
check(!a.any.seats.get("h3").stats.bossClear, "quem saiu não ganha bossClear");
console.log("crédito do boss: vivo e morto sim, quem saiu e bot não OK");
console.log("CAMPANHA OK");
