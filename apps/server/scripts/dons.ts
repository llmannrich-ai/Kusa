/**
 * Teste dos Dons (passivas de gold com 25 níveis) e das áureas e Tomos até o nível 20, sem servidor (`arena.ts`):
 *   - regras: um Dom no topo de cada ramo (linha 2, do lado oposto ao Tomo, preso ao primeiro nó do tronco), 25 níveis,
 *     preço 60 ×1,12; áureas e Tomos mantêm os números de antes até o nível 3 e vão até o 20 (velocidade até o 6);
 *   - na hunt, cada Dom chega ao herói com o total do nível e muda a conta certa: dano do básico (Fio Temperado),
 *     armadura (Couro Curtido), dano da equipe (Voz de Comando), dano de longe (Olhar Paciente), dano em morto-vivo
 *     (Fé Ardente), velocidade com teto (Passo de Rastreador), elementos (Condutor), prisões e lentidões (Coração Frio),
 *     roubo de vida das trevas (Fome Sombria), criaturas (Laço da Matilha), cura (Seiva Antiga) e venenos (Seiva Venenosa);
 *   - Dons do fundo: um embaixo de cada Ápice, pedindo o Ápice no nível 1; cada gatilho dispara na hora certa:
 *     vida baixa (Último Duelo), parado (Pedra Fundamental), aura de ritmo (Estandarte Vivo), depois do salto (Fôlego do
 *     Caçador), a cada 10 magias (Graça), básico incendiário (Mão Rápida), 3 elementos (Circuito), mana baixa com
 *     recarga (Reserva Gélida), morte por trevas (Ossuário), 4º básico (Instinto), cura acumulada (Ciclo) e morte
 *     envenenada (Céu Fechado);
 *   - a telemetria guarda os níveis das passivas que o herói levou.
 * Uso: npx tsx scripts/dons.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CLASS_IDS, CYCLE_BASE, CYCLE_HEAL, GIFTS, GRACE_EVERY, NO_GIFTS, SPELLS, type GiftEffects, GIFT_MAX_RANK, GIFT_SPEED_CAP, TALENTS, auraBonuses, auraText, giftEffects, spellBonus, statsFor,
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
    const gifts = tree.filter((t) => t.kind === "gift" && !GIFTS[t.giftId!].apex);
    check(gifts.map((g) => g.col).sort().join() === "0,1,2", `${classId}: devia ter um Dom por ramo`);
    for (const g of gifts) {
      // Ramo sem magia ainda não tem Tomo (o Xamã Orc da Fase 1): o Dom fica numa ponta do ramo do mesmo jeito.
      const tome = tree.find((t) => t.kind === "tome" && t.col === g.col);
      const parent = TALENTS[g.requires!.id];
      check(g.row === 2 && (tome ? g.lane === -tome.lane : Math.abs(g.lane) === 2), `${g.id}: fora do lugar (linha ${g.row}, lado ${g.lane})`);
      check(parent.col === g.col && parent.row === 1 && parent.lane === 0 && g.requires!.rank === 1, `${g.id}: pai fora do tronco`);
      check(g.maxRank === GIFT_MAX_RANK && GIFTS[g.giftId!].classId === classId, `${g.id}: níveis ou classe errados`);
    }
  }
});
test("um Dom do fundo embaixo de cada Ápice, pedindo o Ápice no nível 1", () => {
  let total = 0;
  for (const classId of CLASS_IDS) {
    const tree = talentTree(classId);
    const apices = tree.filter((t) => t.spellId && SPELLS[t.spellId].slot === 2 && t.row === 6);
    for (const apex of apices) {
      const below = tree.filter((t) => t.kind === "gift" && t.requires?.id === apex.id);
      check(below.length === 1, `${apex.id}: devia ter um Dom embaixo (tem ${below.length})`);
      const g = below[0];
      check(g.col === apex.col && g.row === apex.row + 1 && g.lane === apex.lane && g.requires!.rank === 1, `${g.id}: fora do lugar`);
      check(GIFTS[g.giftId!].apex === apex.spellId && g.maxRank === GIFT_MAX_RANK && talentCost(g, 0) === 60, `${g.id}: regra errada`);
      total++;
    }
  }
  check(total === 12, `${total} Dons do fundo (esperava 12: 3 Ápices em cada uma das 4 classes)`);
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
  // Nível 20: +20% de cura, sem o marco 5 (que cura 50% a mais em quem está abaixo de 30% da vida; ver `marcos`).
  check(healed(withGift("druid", "ancient_sap", 20)) === 120 && healed({}) === 100, "cura");
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

console.log("Dons do fundo:");
/** Arena com o Grimório inteiro (para lançar as magias) e um Dom do fundo ligado à mão, no valor do nível 25. */
const giftArena = (classId: ClassId, gift: Partial<GiftEffects>, opts: Parameters<typeof arena>[0] = {}) => {
  const a = arena({ classId, monsterHp: 50, ...opts });
  a.seat().gifts = { ...NO_GIFTS, elementDamage: {}, ...gift };
  return a;
};
const fx25 = (id: keyof typeof GIFTS) => {
  const fx: GiftEffects = { ...NO_GIFTS, elementDamage: {} };
  GIFTS[id].apply(fx, GIFTS[id].perRank * GIFT_MAX_RANK);
  return fx;
};
test("Último Duelo: +40% de dano só com a vida abaixo de 30%", () => {
  const a = giftArena("knight", fx25("last_duel"));
  const full = a.any.damageBonus(a.seat(), a.p);
  a.p.hp = Math.floor(a.p.maxHp * 0.25);
  const low = a.any.damageBonus(a.seat(), a.p);
  check(near(low - full, 0.4), `cheio ${full}, baixo ${low}`);
});
test("Pedra Fundamental: parado 1s, -30% de dano recebido", () => {
  const hit = { attacker: "", fromX: 0, fromY: 0, fx: "slash" };
  const taken = (still: boolean) => {
    const a = giftArena("knight", fx25("bedrock"));
    a.advance(2000);
    a.seat().movedAt = still ? a.now() - 1500 : a.now();
    const before = a.p.hp;
    a.any.damagePlayer(HERO, 200, hit);
    return before - a.p.hp;
  };
  const moving = taken(false);
  const still = taken(true);
  check(Math.abs(still / moving - 0.7) < 0.03, `andando ${moving}, parado ${still}`);
});
test("Estandarte Vivo: o herói e o aliado a até 3 tiles atacam mais rápido", () => {
  const a = giftArena("knight", fx25("living_banner"), { allies: [{ classId: "paladin", bot: true }] });
  const ally = a.state.players.get("h2")!;
  check(near(a.any.bannerHaste(a.p), 0.15) && near(a.any.bannerHaste(ally), 0.15), "perto");
  ally.x = a.p.x + 6;
  check(near(a.any.bannerHaste(ally), 0), "longe não devia ganhar");
});
test("Fôlego do Caçador: o Rolamento carrega o próximo básico", () => {
  const a = giftArena("paladin", fx25("hunter_breath"));
  a.choose("evasive_roll");
  const m = a.place("lizardfolk", 2, 0);
  a.ready();
  a.cast(0, m);
  check(a.seat().dashBasicReady, `o salto não carregou (${a.where()})`);
  a.seat().attacking = true;
  a.until(() => !a.seat().dashBasicReady, 3000, "o básico não gastou o fôlego");
  check(a.seat().stats.giftProcs.hunter_breath === 1, JSON.stringify(a.seat().stats.giftProcs));
});
test(`Graça: depois de ${GRACE_EVERY} magias, a seguinte sai sem mana e +50%`, () => {
  const a = giftArena("paladin", fx25("grace"));
  a.choose("evasive_roll");
  for (let i = 0; i < GRACE_EVERY; i++) {
    a.ready();
    a.cast(0, { x: a.p.x + 2, y: a.p.y });
    a.advance(200);
  }
  check(a.seat().graceReady, "a série não carregou");
  a.ready();
  const mana = a.p.mana;
  a.cast(0, { x: a.p.x - 2, y: a.p.y });
  check(a.p.mana === mana && !a.seat().graceReady && a.seat().stats.giftProcs.grace === 1, `mana ${mana} → ${a.p.mana}`);
});
test("Mão Rápida: com 100% de chance, todo básico incendeia", () => {
  const a = giftArena("knight", { burnChance: 1 }, { monsterHp: 200 });
  const m = a.place("lizardfolk", 1, 0);
  a.p.target = m.id;
  a.seat().attacking = true;
  a.advance(1500);
  check((a.seat().stats.giftProcs.quick_hand ?? 0) > 0 && a.brain(m).dot?.kind === "burn", JSON.stringify(a.seat().stats.giftProcs));
});
test("Circuito: fogo, gelo e energia carregam a magia seguinte, e só ela", () => {
  const a = giftArena("sorcerer", fx25("circuit"), { monsterHp: 200 });
  const m = a.place("lizardfolk", 2, 0);
  // A escolha do slot só vale uma vez por nível: o teste troca a magia do slot à mão.
  for (const spellId of ["fireball", "cone_of_cold", "energy_beam"] as const) {
    a.p.spell1 = spellId;
    a.ready();
    a.cast(0, m);
    a.advance(300);
  }
  check(a.seat().circuitReady, `o circuito não fechou (${a.where()})`);
  a.p.spell1 = "fireball";
  a.ready();
  const mana = a.p.mana;
  a.cast(0, m);
  check(a.p.mana === mana, `gastou mana: ${mana} → ${a.p.mana}`);
  check(!a.seat().circuitReady && a.seat().castBoost === 0 && a.seat().stats.giftProcs.circuit === 1, JSON.stringify(a.seat().stats.giftProcs));
});
test("Reserva Gélida: escudo de 30% da vida com a mana abaixo de 15%, com recarga", () => {
  const a = giftArena("sorcerer", fx25("frost_reserve"));
  a.choose("fireball");
  const m = a.place("lizardfolk", 3, 0);
  a.ready();
  a.cast(0, m);
  const cost = a.p.maxMana - a.p.mana;
  check(a.p.barrier === 0 && cost > 0, "mana cheia não devia dar escudo");
  a.ready();
  a.p.mana = Math.floor(a.p.maxMana * 0.15) + cost - 1;
  a.cast(0, m);
  check(a.p.mana < a.p.maxMana * 0.15 && a.p.barrier === Math.round(a.p.maxHp * 0.3), `mana ${a.p.mana}/${a.p.maxMana}, escudo ${a.p.barrier}`);
  a.p.barrier = 0;
  a.seat().spellReadyAt = [0, 0, 0];
  a.cast(0, m);
  check(a.p.barrier === 0, "voltou antes da recarga");
});
test("Ossuário: morto por trevas levanta esqueleto, no máximo 2", () => {
  const a = giftArena("sorcerer", { raiseChance: 1 });
  const hit = { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "dark" };
  for (const dx of [2, 3, 4]) {
    const m = a.place("lizardfolk", dx, 0);
    a.any.damageMonster(m, 99999, hit, "shadow_orb");
  }
  const bones = [...a.state.summons.values()].filter((s) => s.owner === HERO && s.kind === "skeleton");
  check(bones.length === 2 && a.seat().stats.giftProcs.ossuary === 3, `${bones.length} esqueletos, ${a.seat().stats.giftProcs.ossuary} levantes`);
  const m = a.place("lizardfolk", 2, 1);
  a.any.damageMonster(m, 99999, hit, "fireball");
  check(a.seat().stats.giftProcs.ossuary === 3, "fogo não levanta esqueleto");
});
test("Instinto: cada 4º básico morde (0,5 + 0,5 do básico no 25)", () => {
  const a = giftArena("knight", fx25("instinct"), { monsterHp: 200 });
  const m = a.place("lizardfolk", 1, 0);
  a.p.target = m.id;
  a.seat().attacking = true;
  a.advance(5000);
  const count = a.seat().basicCount;
  check(count >= 4 && a.seat().stats.giftProcs.instinct === Math.floor(count / 4), `${count} básicos, ${a.seat().stats.giftProcs.instinct} mordidas`);
});
test(`Ciclo: a cada ${CYCLE_HEAL} de cura, uma onda de 15% da vida`, () => {
  const a = giftArena("druid", fx25("cycle"));
  const chunk = Math.min(200, a.p.maxHp - 1);
  let healed = 0;
  while (healed < CYCLE_HEAL) {
    a.p.hp = 1;
    a.any.healPlayer(a.p, chunk, HERO);
    healed += chunk;
  }
  check(a.seat().stats.giftProcs.cycle === 1, JSON.stringify(a.seat().stats.giftProcs));
  check(a.p.hp === Math.min(a.p.maxHp, 1 + chunk + Math.round(a.p.maxHp * (CYCLE_BASE + 0.1))), `vida ${a.p.hp}/${a.p.maxHp}`);
});
test("Céu Fechado: o envenenado morre e um raio cai no vizinho", () => {
  const a = giftArena("druid", { skyStrike: 1 });
  const poisoned = a.place("lizardfolk", 2, 0);
  const other = a.place("lizardfolk", 3, 0);
  a.any.applyDot(poisoned, a.brain(poisoned), HERO, "teste", 1, 5000, "poison", a.now());
  const hp = other.hp;
  a.kill(poisoned);
  a.advance(500);
  check(other.hp < hp && a.seat().stats.giftProcs.closed_sky === 1, `vida ${hp} → ${other.hp} (${a.where()})`);
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("DONS OK");
process.exit(0);
