/**
 * Teste da bag na arena (`arena.ts`: sem servidor, relógio falso, sorteios de seed fixa): um cavaleiro mata comuns até
 * cair um item que ele veste, veste ao passar por cima, guarda na bag, veste de novo pela bag, larga no chão (e não
 * pega de volta enquanto está em cima), pega de novo ao voltar ao tile e foge levando o item na bag (que vai para o
 * cofre de quem tem conta). Antes isso rodava numa hunt de verdade, e o cavaleiro de nível 1 morria por azar.
 * Uso: npx tsx apps/server/scripts/bag.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { BAG_SIZE, ITEMS, SERVER_TICK_MS, canUse } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const a = arena({ classId: "knight", startLevel: 1 });
const { hunt, p } = a;
// Poções também caem no chão: aqui só interessa equipamento que o cavaleiro veste (o drop não olha a classe).
const groundGear = () => [...a.state.items.values()].filter((it) => ITEMS[it.itemId] && canUse(it.itemId, "knight"));
const bag = () => [...p.bag];

// Mata zumbis até cair um item que o cavaleiro veste.
let kills = 0;
while (groundGear().length === 0) {
  check(kills < 500, `nenhum equipamento caiu em ${kills} mortes (${a.where()})`);
  a.kill(a.place("zombie", 2, 0));
  kills++;
  a.advance(SERVER_TICK_MS);
}
const [ground] = groundGear();
const def = ITEMS[ground.itemId];
console.log(`${kills} mortes; caiu ${def.name} (${def.slot}) em ${ground.x},${ground.y}`);

// 1. Passar por cima veste (o slot estava vazio).
a.walkTo(ground);
a.until(() => p[def.slot] === def.id, 2000, "não vestiu o item do chão");
const spot = { x: p.x, y: p.y };

// 2. Guardar na bag e vestir de novo pela bag.
hunt.unequip(HERO, { slot: def.slot });
check(p[def.slot] === "" && bag().includes(def.id), "não guardou na bag");
hunt.bagEquip(HERO, { index: bag().indexOf(def.id) });
check(p[def.slot] === def.id && !bag().includes(def.id), "não vestiu pela bag");

// 3. Largar no chão: fica lá enquanto o cavaleiro continua em cima.
hunt.unequip(HERO, { slot: def.slot });
hunt.bagDrop(HERO, { index: bag().indexOf(def.id) });
const onSpot = () => groundGear().some((it) => it.x === spot.x && it.y === spot.y && it.itemId === def.id);
check(onSpot(), "não largou no chão");
a.advance(600);
check(!bag().includes(def.id) && p[def.slot] !== def.id && onSpot(), "pegou de volta o item que acabou de largar");
console.log(`largado em ${spot.x},${spot.y}; bag ${bag().length}/${BAG_SIZE}`);

// 4. Sai do tile e volta: pega de novo.
const away = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: spot.x + dx, y: spot.y + dy })).find((t) => a.free(t.x, t.y))!;
a.walkTo(away);
a.walkTo(spot);
a.until(() => p[def.slot] === def.id, 2000, "não pegou de novo ao voltar ao tile");

// 5. Guarda na bag e foge: o item da bag volta no resultado.
hunt.unequip(HERO, { slot: def.slot });
check(bag().includes(def.id), "não guardou antes de fugir");
const ended = a.end("escaped");
check(ended.outcome === "escaped", `esperava fuga, veio ${ended.outcome}`);
check(ended.bag.includes(def.id), `o item da bag não voltou: ${JSON.stringify(ended)}`);
console.log(`fugiu levando na bag: ${ended.bag.join(", ")}`);
console.log("BAG OK");
