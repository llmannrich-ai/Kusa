/**
 * Teste das poções em três níveis, sem servidor (`arena.ts`):
 *   - a cura é fixa: a mesma em heróis e níveis diferentes, limitada ao que falta para encher;
 *   - cada nível sai do próprio estoque e a recarga é compartilhada entre todos;
 *   - o automático (`pickPotion`) bebe a menor que cobre o que falta, ou a maior que houver;
 *   - as poções da conta entram até `POTION_MAX` de cada nível, voltam para quem sai vivo e caem no chão de quem morre.
 * Uso: npx tsx apps/server/scripts/pocoes.ts
 */
import { POTIONS, POTIONS_BY_STAT, POTION_COOLDOWN_MS, POTION_FIELD, POTION_IDS, POTION_MAX, pickPotion, type PotionId } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

// Cura fixa: Feiticeiro nível 1 e Cavaleiro nível 20 recebem o mesmo de cada poção.
for (const [classId, startLevel] of [["sorcerer", 1], ["knight", 20]] as const) {
  for (const id of POTION_IDS) {
    const a = arena({ classId, startLevel, allSpells: false });
    const def = POTIONS[id];
    const max = def.stat === "hp" ? a.p.maxHp : a.p.maxMana;
    a.p[def.stat] = 1;
    a.p[POTION_FIELD[id]] = 2;
    a.any.drink(HERO, { potion: id });
    const want = Math.min(max - 1, def.amount);
    check(a.p[def.stat] === 1 + want, `${classId} ${startLevel}: ${def.name} devia curar ${want} (veio ${a.p[def.stat] - 1}, máximo ${max})`);
    check(a.p[POTION_FIELD[id]] === 1, `${classId} ${startLevel}: ${def.name} devia sair do próprio estoque`);
    for (const other of POTION_IDS) if (other !== id) check(a.p[POTION_FIELD[other]] === 0, `${def.name} mexeu no estoque de ${POTIONS[other].name}`);
  }
}
console.log("  ✔ cura fixa, igual no Feiticeiro 1 e no Cavaleiro 20, cada nível do próprio estoque");

// A grande num herói quase cheio cura só o que falta; a recarga vale para todos os níveis.
{
  const a = arena({ classId: "knight", startLevel: 20, allSpells: false });
  a.p.hp = a.p.maxHp - 10;
  a.p.healthPotions3 = 1;
  a.p.healthPotions = 1;
  a.p.manaPotions2 = 1;
  a.any.drink(HERO, { potion: "potion-health-3" });
  check(a.p.hp === a.p.maxHp && a.p.healthPotions3 === 0, "a grande devia encher só os 10 que faltavam");
  a.p.hp = 1;
  a.p.mana = 0;
  a.any.drink(HERO, { potion: "potion-health" });
  a.any.drink(HERO, { potion: "potion-mana-2" });
  check(a.p.healthPotions === 1 && a.p.manaPotions2 === 1 && a.p.hp === 1, "na recarga nenhum nível devia ser bebido");
  a.advance(POTION_COOLDOWN_MS + 100);
  const hp = a.p.hp;
  a.any.drink(HERO, { potion: "potion-health" });
  check(a.p.healthPotions === 0 && a.p.hp === Math.min(a.p.maxHp, hp + POTIONS["potion-health"].amount), "depois da recarga a pequena devia ser bebida");
}
console.log("  ✔ cura limitada ao que falta; recarga compartilhada entre os níveis");

// Automático: a menor que cobre o que falta; se nenhuma cobre, a maior que houver.
{
  const all = (_: PotionId) => 1;
  const [small, mid, big] = POTIONS_BY_STAT.hp;
  check(pickPotion("hp", 30, all) === small, "faltando 30, devia ir a pequena");
  check(pickPotion("hp", POTIONS[small].amount + 1, all) === mid, "faltando um pouco mais que a pequena, devia ir a média");
  check(pickPotion("hp", 999, all) === big, "faltando muito, devia ir a grande");
  check(pickPotion("hp", 999, (id) => (id === big ? 0 : 1)) === mid, "sem grande, devia ir a maior que houver");
  check(pickPotion("hp", 10, (id) => (id === big ? 1 : 0)) === big, "só com a grande, devia ir a grande");
  check(pickPotion("mana", 10, () => 0) === null, "sem nenhuma, nada");
}
console.log("  ✔ automático escolhe a menor que cobre o que falta");

// Conta → hunt → conta: até POTION_MAX de cada nível; quem morre larga todas no chão.
{
  const a = arena({ classId: "druid", allSpells: false });
  const stock = Object.fromEntries(POTION_IDS.map((id, i) => [id, i === 2 ? 9 : i + 1])) as Record<PotionId, number>;
  check(a.any.givePotions(HERO, stock), "as poções da conta deviam entrar");
  for (const id of POTION_IDS) check(a.p[POTION_FIELD[id]] === Math.min(POTION_MAX, stock[id]), `${POTIONS[id].name}: entrou ${a.p[POTION_FIELD[id]]}`);
  const result = a.end("escaped");
  for (const id of POTION_IDS) check(result.potions?.[id] === Math.min(POTION_MAX, stock[id]), `${POTIONS[id].name}: quem sai vivo devia levar de volta (veio ${JSON.stringify(result.potions)})`);

  const b = arena({ classId: "druid", allSpells: false });
  b.any.givePotions(HERO, stock);
  const before = b.state.items.size;
  const died = b.end("died");
  const dropped = [...b.state.items.values()].slice(before).filter((it) => it.itemId.startsWith("potion-")).length;
  const carried = POTION_IDS.reduce((n, id) => n + Math.min(POTION_MAX, stock[id]), 0);
  check(!died.potions && dropped === carried, `quem morre devia largar as ${carried} poções no chão (largou ${dropped})`);
  for (const id of POTION_IDS) check(b.p[POTION_FIELD[id]] === 0, `${POTIONS[id].name} devia zerar no fim`);
}
console.log("  ✔ as da conta entram até o teto de cada nível, voltam para quem sai vivo e caem de quem morre");
console.log("POCOES OK");
