/**
 * Teste da bag na arena (`arena.ts`: sem servidor, relógio falso, sorteios de seed fixa): um cavaleiro mata comuns até
 * cair um item que ele veste, veste ao chegar a 1 tile dele (o item voa até o herói, sem precisar pisar em cima),
 * guarda na bag, veste de novo pela bag, larga no chão (e não pega de volta enquanto está em cima ou colado nele),
 * pega de novo ao se afastar e voltar e foge levando o item na bag (que vai para o cofre de quem tem conta). Antes isso rodava numa hunt de verdade, e o cavaleiro de nível 1 morria por azar.
 * Uso: npx tsx apps/server/scripts/bag.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { BAG_SIZE, ITEMS, SERVER_TICK_MS, canUse, tileDistance } from "@kusa/shared";
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

// 1. Chegar a 1 tile do item veste (o slot estava vazio), sem pisar em cima; o cliente recebe quem pegou.
const itemAt = { x: ground.x, y: ground.y };
const groundId = ground.id;
// Anda em linha reta para o item e para assim que vestir: tem que ter pego antes de pisar em cima.
a.until(() => {
  if (p[def.slot] === def.id) return true;
  hunt.move(HERO, { dx: Math.sign(itemAt.x - p.x), dy: Math.sign(itemAt.y - p.y) });
  return false;
}, 3000, "não vestiu o item do chão");
check(tileDistance(p.x, p.y, itemAt.x, itemAt.y) === 1, `devia pegar a 1 tile, pegou a ${tileDistance(p.x, p.y, itemAt.x, itemAt.y)}`);
const takenAt = a.pickups.findIndex((m) => m.id === groundId);
check(takenAt >= 0 && a.pickups[takenAt].sessionId === HERO, "não avisou quem pegou o item (mensagem pickup)");
check(!a.state.items.has(groundId), "o item pego continuou no chão");
console.log(`pegou a 1 tile do item (herói em ${p.x},${p.y})`);
const spot = { x: p.x, y: p.y };

// 2. Guardar na bag e vestir de novo pela bag.
hunt.unequip(HERO, { slot: def.slot });
check(p[def.slot] === "" && bag().includes(def.id), "não guardou na bag");
hunt.bagEquip(HERO, { index: bag().indexOf(def.id) });
check(p[def.slot] === def.id && !bag().includes(def.id), "não vestiu pela bag");

// 3. Largar no chão: fica lá enquanto o cavaleiro continua em cima ou colado no item.
hunt.unequip(HERO, { slot: def.slot });
hunt.bagDrop(HERO, { index: bag().indexOf(def.id) });
const onSpot = () => groundGear().some((it) => it.x === spot.x && it.y === spot.y && it.itemId === def.id);
const picked = () => bag().includes(def.id) || p[def.slot] === def.id;
check(onSpot(), "não largou no chão");
a.advance(600);
check(!picked() && onSpot(), "pegou de volta o item que acabou de largar");
const ring = (r: number) => {
  const tiles: { x: number; y: number }[] = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const t = { x: spot.x + dx, y: spot.y + dy };
    if (tileDistance(t.x, t.y, spot.x, spot.y) === r && a.free(t.x, t.y)) tiles.push(t);
  }
  return tiles;
};
const beside = ring(1)[0];
a.walkTo(beside);
a.advance(600);
check(!picked() && onSpot(), "pegou de volta o item largado só de dar um passo para o lado");
console.log(`largado em ${spot.x},${spot.y}; bag ${bag().length}/${BAG_SIZE}`);

// 4. Afasta 2 tiles e volta para o lado do item: pega de novo, sem pisar nele.
a.walkTo(ring(2)[0]);
a.walkTo(beside);
a.until(() => p[def.slot] === def.id, 2000, "não pegou de novo ao voltar para perto do item");

// 5. Guarda na bag e foge: o item da bag volta no resultado.
hunt.unequip(HERO, { slot: def.slot });
check(bag().includes(def.id), "não guardou antes de fugir");
const ended = a.end("escaped");
check(ended.outcome === "escaped", `esperava fuga, veio ${ended.outcome}`);
check(ended.bag.includes(def.id), `o item da bag não voltou: ${JSON.stringify(ended)}`);
console.log(`fugiu levando na bag: ${ended.bag.join(", ")}`);
console.log("BAG OK");
