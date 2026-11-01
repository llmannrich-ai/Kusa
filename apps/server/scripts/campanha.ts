/**
 * Campanha (mapa mundi): cada cenário abre ao vencer o boss do anterior, sem servidor (`arena.ts`):
 *   - a ordem do packages/shared: só o primeiro (Pântano do Kosaradius) começa aberto; cada boss abre o seguinte;
 *   - lado de bifurcação abre com um boss só: as Dunas Cantantes com o Observador, o Bosque Velho com o Basilisco;
 *   - o boss principal morto credita o cenário a todo humano na hunt, vivo ou morto (`HuntHost.mapCleared`,
 *     `stats.bossClear`), e não a quem saiu da hunt nem aos bots;
 *   - mini-boss morto não credita nada.
 * Uso: npx tsx scripts/campanha.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { WORLD_ORDER, lastUnlocked, mapUnlocked, unlockedBy, type MapId } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

// --- Ordem da campanha -----------------------------------------------------------------------
check(WORLD_ORDER.join() === "marsh,crypt,desert,swamp,cavern,oldwood,heartwood,dunes,mesas,gates,fortress", `ordem da campanha: ${WORLD_ORDER}`);
const open = (clears: string[]) => WORLD_ORDER.filter((id) => mapUnlocked(clears, id)).join();
check(open([]) === "marsh", `conta nova: só o Kosaradius aberto (veio ${open([])})`);
check(open(["marsh"]) === "marsh,crypt", `Grumak vencido abre a Cripta (veio ${open(["marsh"])})`);
check(open(["marsh", "crypt"]) === "marsh,crypt,desert", "Dragão jovem abre o Mar de Areia");
check(open(["marsh", "crypt", "desert"]) === "marsh,crypt,desert,swamp", "Verme da Areia abre o Pântano das Ruínas");
check(open(["marsh", "crypt", "desert", "swamp"]) === "marsh,crypt,desert,swamp,cavern", "Hidra ou Dragão negro abre a Caverna da Travessia");
const travessia = ["marsh", "crypt", "desert", "swamp", "cavern"];
check(open(travessia) === travessia.join(), "a Travessia vencida sem um boss de covil não abre nenhum lado");
check(open([...travessia, "basilisk"]) === [...travessia, "oldwood"].join(), "o Basilisco (lado da floresta) abre o Bosque Velho, não as Dunas Cantantes");
check(open([...travessia, "beholder"]) === [...travessia, "dunes"].join(), "o Observador (lado do deserto) abre as Dunas Cantantes, não o Bosque Velho");
check(open([...travessia, "basilisk", "beholder"]) === [...travessia, "oldwood", "dunes"].join(), "os dois bosses da Travessia abrem os dois lados");
check(open(["beholder"]) === "marsh,dunes", "o Observador vencido como convidado abre as Dunas, mesmo sem a Travessia vencida");
check(open(["basilisk"]) === "marsh,oldwood", "o Basilisco vencido como convidado abre o Bosque Velho, mesmo sem a Travessia vencida");
check(open([...travessia, "basilisk", "oldwood"]) === [...travessia, "oldwood", "heartwood"].join(), "o boss do Bosque Velho abre o Coração da Mata");
check(open([...travessia, "beholder", "dunes"]) === [...travessia, "dunes", "mesas"].join(), "o boss das Dunas abre as Mesas de Solária");
check(open([...travessia, "beholder", "dunes", "mesas"]) === [...travessia, "dunes", "mesas", "gates", "fortress"].join(), "o boss das Mesas abre os Portões do Império e a Fortaleza Orc");
check(open([...travessia, "basilisk", "oldwood", "beholder", "dunes", "mesas"]) === WORLD_ORDER.join(), "os dois lados vencidos abrem tudo");
check(open(["crypt"]) === "marsh,desert", "a Cripta vencida (como convidado) abre o Mar de Areia, mesmo sem a Cripta aberta para criar");
check(unlockedBy("marsh") === undefined && unlockedBy("swamp") === "desert" && unlockedBy("cavern") === "swamp", "quem abre cada cenário");
check(unlockedBy("dunes") === "cavern" && unlockedBy("oldwood") === "cavern" && unlockedBy("heartwood") === "oldwood" && unlockedBy("gates") === "mesas" && unlockedBy("fortress") === "mesas", "a bifurcação da Travessia e as Ruínas do Império");
check(lastUnlocked([]) === "marsh" && lastUnlocked(["marsh", "crypt"]) === "desert" && lastUnlocked([...travessia, "basilisk"]) === "oldwood", "o herói espera no último cenário aberto");
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
