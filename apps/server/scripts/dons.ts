/**
 * Teste dos Dons (passivas de gold com 25 níveis) e das áureas e Tomos até o nível 20, sem servidor (`arena.ts`):
 *   - regras: um Dom no topo de cada ramo (linha 2, do lado oposto ao Tomo, preso ao primeiro nó do tronco), 25 níveis,
 *     preço 60 ×1,12; áureas e Tomos mantêm os números de antes até o nível 3 e vão até o 20 (velocidade até o 6);
 *   - na hunt, cada Dom chega ao herói com o total do nível e muda a conta certa: dano do básico (Fio Temperado),
 *     armadura (Couro Curtido), dano da equipe (Voz de Comando), dano de longe (Olhar Paciente), dano em morto-vivo
 *     (Fé Ardente), velocidade com teto (Passo de Rastreador), elementos (Condutor), prisões e lentidões (Coração Frio),
 *     roubo de vida das trevas (Fome Sombria), criaturas (Laço da Matilha), cura (Seiva Antiga) e venenos (Seiva Venenosa);
 *   - a telemetria guarda os níveis das passivas que o herói levou.
 * Uso: npx tsx scripts/dons.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CLASS_IDS, GIFTS, GIFT_MAX_RANK, GIFT_SPEED_CAP, TALENTS, auraBonuses, auraText, giftEffects, spellBonus, statsFor,
  talentCost, talentTree, type ClassId, type TalentRanks,
} from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
/** Dom da classe no nível máximo (ou no nível pedido). */
const withGift = (classId: ClassId, gift: string, rank = GIFT_MAX_RANK): TalentRanks => ({ [`${classId}_${gift}`]: rank });
const heroArena = (classId: ClassId, talents: TalentRanks = {}) => arena({ classId, allSpells: false, talents, monsterHp: 50 });

console.log("Regras:");
test("um Dom no topo de cada ramo, do lado oposto ao Tomo", () => {
  for (const classId of CLASS_IDS) {
    const tree = talentTree(classId);
    const gifts = tree.filter((t) => t.kind === "gift");
    check(gifts.map((g) => g.col).sort().join() === "0,1,2", `${classId}: devia ter um Dom por ramo`);
    for (const g of gifts) {
      const tome = tree.find((t) => t.kind === "tome" && t.col === g.col)!;
      const parent = TALENTS[g.requires!.id];
      check(g.row === 2 && g.lane === -tome.lane, `${g.id}: fora do lugar (linha ${g.row}, lado ${g.lane})`);
      check(parent.col === g.col && parent.row === 1 && parent.lane === 0 && g.requires!.rank === 1, `${g.id}: pai fora do tronco`);
      check(g.maxRank === GIFT_MAX_RANK && GIFTS[g.giftId!].classId === classId, `${g.id}: níveis ou classe errados`);
    }
  }
});
test("preço dos Dons: 60 no 1º nível, ~8 mil até o 25", () => {
  const def = TALENTS.knight_honed_edge;
  let total = 0;
  for (let rank = 0; rank < def.maxRank; rank++) total += talentCost(def, rank);
  check(talentCost(def, 0) === 60 && talentCost(def, 24) === 911, `preços ${talentCost(def, 0)} e ${talentCost(def, 24)}`);
  check(total > 7900 && total < 8100, `total ${total}`);
});
test("áureas: os níveis 1 a 3 valem o mesmo de antes; depois, menos por nível até o 20", () => {
  const at = (stat: string, rank: number) => auraBonuses("knight", { [`knight_${stat}`]: rank });
  check(near(at("damage", 3).damage, 0.12) && near(at("hp", 3).hp, 0.18) && near(at("mana", 3).mana, 0.24), "nível 3 mudou");
  check(near(at("damage", 20).damage, 0.29) && near(at("hp", 20).hp, 0.435) && near(at("mana", 20).mana, 0.58), "nível 20");
  check(near(at("speed", 2).speed, 0.08) && near(at("speed", 6).speed, 0.12) && TALENTS.knight_speed.maxRank === 6, "velocidade");
  check(auraText(TALENTS.knight_damage, 20) === "+29% de dano", auraText(TALENTS.knight_damage, 20));
  check(talentCost(TALENTS.knight_damage, 1) === 138, `nível 2 da áurea: ${talentCost(TALENTS.knight_damage, 1)}`);
});
test("Tomo: +15% no 3, +35,4% no 20", () => {
  const levels = { crushing_blow: 0 };
  const three = spellBonus("knight", "crushing_blow", { knight_tome0: 3, knight_crushing_blow: 1 }, levels).tome;
  const twenty = spellBonus("knight", "crushing_blow", { knight_tome0: 20, knight_crushing_blow: 1 }, levels).tome;
  check(near(three, 0.15) && near(twenty, 0.354), `Tomo ${three} e ${twenty}`);
});
test("o Passo de Rastreador para no teto de velocidade", () => {
  check(near(giftEffects("paladin", withGift("paladin", "tracker_step")).speed, GIFT_SPEED_CAP), "passou do teto");
});

console.log("Na hunt:");
test("Fio Temperado e Couro Curtido chegam ao herói", () => {
  const a = heroArena("knight", { ...withGift("knight", "honed_edge"), ...withGift("knight", "tanned_hide") });
  check(near(a.seat().gifts.basicDamage, 0.3) && near(a.seat().gifts.armor, 15), JSON.stringify(a.seat().gifts));
});
test("Couro Curtido corta o dano recebido", () => {
  const hit = { attacker: "", fromX: 0, fromY: 0, fx: "slash" };
  const taken = (talents: TalentRanks) => {
    const a = heroArena("knight", talents);
    const before = a.p.hp;
    a.any.damagePlayer(HERO, 100, hit);
    return before - a.p.hp;
  };
  const plain = taken({});
  const hide = taken(withGift("knight", "tanned_hide"));
  check(hide < plain * 0.75, `sem o Dom ${plain}, com o Dom ${hide}`);
});
test("Voz de Comando soma no dano do herói", () => {
  const a = heroArena("knight", withGift("knight", "command_voice"));
  const plain = heroArena("knight");
  const ratio = a.any.damageBonus(a.seat(), a.p) / plain.any.damageBonus(plain.seat(), plain.p);
  check(near(ratio, 1.25), `razão ${ratio}`);
});
test("Olhar Paciente vale só a 4 tiles ou mais", () => {
  const a = heroArena("paladin", withGift("paladin", "patient_eye"));
  const far = a.place("lizardfolk", 5, 0);
  const close = a.place("lizardfolk", 1, 0);
  check(near(a.any.farBonus(a.seat(), a.p, far), 1.3), `longe ${a.any.farBonus(a.seat(), a.p, far)}`);
  check(near(a.any.farBonus(a.seat(), a.p, close), 1), `perto ${a.any.farBonus(a.seat(), a.p, close)}`);
});
test("Fé Ardente vale só em morto-vivo", () => {
  const a = heroArena("paladin", withGift("paladin", "burning_faith"));
  const undead = a.place("skeleton", 2, 0);
  const living = a.place("lizardfolk", 3, 0);
  check(near(a.any.undeadBonus(a.seat(), undead, 0), 1.4), `morto-vivo ${a.any.undeadBonus(a.seat(), undead, 0)}`);
  check(near(a.any.undeadBonus(a.seat(), living, 0), 1), "vivo não devia ganhar");
});
test("Passo de Rastreador deixa o herói mais rápido", () => {
  const a = heroArena("paladin", withGift("paladin", "tracker_step"));
  const plain = heroArena("paladin");
  const ratio = a.any.moveSpeed(a.p, a.seat(), a.now()) / plain.any.moveSpeed(plain.p, plain.seat(), plain.now());
  check(near(ratio, 1 + GIFT_SPEED_CAP, 1e-3), `razão ${ratio}`);
  check(near(statsFor("paladin", 1, a.seat().bonus).speed / statsFor("paladin", 1).speed, 1.1, 1e-3), "bônus de velocidade");
});
test("Condutor, Coração Frio e Fome Sombria chegam ao Feiticeiro", () => {
  const a = heroArena("sorcerer", { ...withGift("sorcerer", "conductor"), ...withGift("sorcerer", "cold_heart"), ...withGift("sorcerer", "shadow_hunger") });
  const g = a.seat().gifts;
  check(near(g.elementDamage.energy, 0.3) && near(g.elementDamage.fire, 0.3) && !g.elementDamage.ice, "elementos");
  check(near(g.ccDuration, 0.25) && near(g.darkLifesteal, 0.2), JSON.stringify(g));
});
test("Fome Sombria cura com a Esfera Sombria (trevas)", () => {
  const a = heroArena("sorcerer", withGift("sorcerer", "shadow_hunger"));
  a.choose("shadow_orb");
  const m = a.place("lizardfolk", 3, 0);
  a.p.hp = Math.round(a.p.maxHp / 2);
  const before = a.p.hp;
  a.ready();
  a.cast(0, m);
  a.advance(1500);
  check(a.p.hp > before, `vida ${before} → ${a.p.hp} (${a.where()})`);
});
test("Laço da Matilha e Seiva Antiga chegam ao Druida", () => {
  const a = heroArena("druid", { ...withGift("druid", "pack_bond"), ...withGift("druid", "ancient_sap") });
  check(near(a.seat().gifts.summonBoost, 0.3) && near(a.seat().gifts.healPower, 0.25), JSON.stringify(a.seat().gifts));
});
test("Seiva Antiga cura mais", () => {
  const healed = (talents: TalentRanks) => {
    const a = heroArena("druid", talents);
    a.p.hp = 1;
    a.any.healPlayer(a.p, 100, HERO);
    return a.p.hp - 1;
  };
  check(healed(withGift("druid", "ancient_sap")) === 125 && healed({}) === 100, "cura");
});
test("Seiva Venenosa fortalece o veneno, não a queimadura", () => {
  const a = heroArena("druid", withGift("druid", "venom_sap"));
  const poisoned = a.place("lizardfolk", 2, 0);
  const burned = a.place("lizardfolk", 3, 0);
  a.any.applyDot(poisoned, a.brain(poisoned), HERO, "teste", 10, 3000, "poison", a.now());
  a.any.applyDot(burned, a.brain(burned), HERO, "teste", 10, 3000, "burn", a.now());
  check(near(a.brain(poisoned).dot.amount, 13) && near(a.brain(burned).dot.amount, 10), "dano contínuo");
});
test("a telemetria guarda os níveis das passivas", () => {
  const a = heroArena("knight", { knight_damage: 7, knight_tome1: 4, knight_honed_edge: 12, knight_crushing_blow: 1 });
  const p = a.seat().stats.passives;
  check(p.knight_damage === 7 && p.knight_tome1 === 4 && p.knight_honed_edge === 12 && !("knight_crushing_blow" in p), JSON.stringify(p));
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("DONS OK");
process.exit(0);
