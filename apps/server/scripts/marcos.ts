/**
 * Teste dos marcos dos Dons (Grimório 4.0, fase 4a-2; `packages/shared/src/gifts.ts`), sem servidor (`arena.ts`):
 *   - regras: um marco a cada 5 níveis, 5 por Dom, texto em cada um;
 *   - Cavaleiro: Fio Temperado (série que sangra e corta em leque), Couro Curtido (escudos, lentidão, vida, quebra),
 *     Voz de Comando (alcance, velocidade, socorro), Último Duelo (limiar, roubo de vida, recarga do slot 3),
 *     Pedra Fundamental (regeneração, provocação, armadura, corte nos colados) e Estandarte Vivo (raio, armadura,
 *     cura ao matar, corte de dano depois do slot 3);
 *   - Paladino: Olhar Paciente (alcance, atordoar no alcance máximo), Fé Ardente (queimadura e ofuscar mais longos, cura
 *     ao matar morto-vivo, luz que atravessa), Passo de Rastreador (armadilhas e tiro calmo), Graça (série menor, cura e
 *     ofuscar), Fôlego do Caçador (tiros carregados, recarga devolvida, escudo) e Mão Rápida (6º básico e explosão);
 *   - Feiticeiro: Condutor (saltos, queimadura), Coração Frio (lentidão, dano em lento, escudo, congelar em volta),
 *     Fome Sombria (marca, mana ao matar, roubo de mana), Circuito (2 elementos, recarga), Reserva Gélida (limiar,
 *     recarga, congelar quem bate, mana ao quebrar) e Ossuário (mais esqueletos, explosão ao sumir).
 * Uso: npx tsx scripts/marcos.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  ALLY_DAMAGE_RADIUS, BANNER, BONES, COLD, CONDUCTOR, FROST_MARKS, HUNGER, SPELLS, BREATH, FAITH, GRACE_EVERY, GRACE_MARKS, HAND, TRACKER, BANNER_RADIUS, CLASS_IDS, GIFTS, GIFT_MILESTONES, HIDE, VOICE, giftMilestones, sumGifts,
  type ClassId, type GiftId, type TalentRanks,
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

const hit = { attacker: "", fromX: 0, fromY: 0, fx: "slash" as const };
/** Arena com o Grimório inteiro (magias) e os Dons pedidos ligados à mão, como a hunt leria. */
const markArena = (classId: ClassId, gifts: Partial<Record<GiftId, number>>, opts: Parameters<typeof arena>[0] = {}) => {
  const a = arena({ classId, monsterHp: 50, ...opts });
  a.seat().gifts = sumGifts(Object.entries(gifts).map(([id, rank]) => ({ id: id as GiftId, rank: rank! })));
  return a;
};
/** Arena pela conta (Dons comprados no Grimório): o que só vale ao entrar na sala, como a vida a mais. */
const accountArena = (classId: ClassId, talents: TalentRanks) => arena({ classId, allSpells: false, talents, monsterHp: 50 });
/** Ataca o monstro com o básico por `ms`. */
const attack = (a: ReturnType<typeof arena>, m: { id: string }, ms: number) => {
  a.p.target = m.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.advance(ms);
  a.seat().attacking = false;
};

console.log("Regras:");
test("um marco a cada 5 níveis, até 5", () => {
  check(giftMilestones(4) === 0 && giftMilestones(5) === 1 && giftMilestones(24) === 4 && giftMilestones(25) === 5, "contagem");
  for (const id of ["honed_edge", "tanned_hide", "command_voice", "last_duel", "bedrock", "living_banner"] as GiftId[]) {
    check(GIFTS[id].milestones?.length === GIFT_MILESTONES, `${id}: sem os 5 marcos`);
  }
  check(sumGifts([{ id: "bedrock", rank: 12 }]).marks.bedrock === 2, "sumGifts conta os marcos");
  check(CLASS_IDS.includes("knight"), "classes");
});

console.log("Cavaleiro:");
test("Fio Temperado: no marco 1, o 4º golpe sangra; sem leque", () => {
  const a = markArena("knight", { honed_edge: 5 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 1, 0);
  const side = a.place("lizardfolk", 1, 1);
  const hp = side.hp;
  a.p.target = m.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.until(() => a.seat().edgeCount >= 4, 8000, "não deu 4 golpes");
  check(a.brain(m).dot?.kind === "bleed" && side.hp === hp, `alvo ${a.brain(m).dot?.kind}, lado ${hp} → ${side.hp}`);
});
test("Fio Temperado: no marco 5, a cada 3 golpes o leque de 90° corta e sangra quem está ao lado", () => {
  const a = markArena("knight", { honed_edge: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 1, 0);
  const side = a.place("lizardfolk", 1, 1);
  const hp = side.hp;
  a.p.target = m.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.until(() => a.seat().edgeCount >= 3, 8000, "não deu 3 golpes");
  check(side.hp < hp && a.brain(side).dot?.kind === "bleed", `lado ${hp} → ${side.hp}, ${a.brain(side).dot?.kind}`);
});
test("Couro Curtido: escudo +20%, imune a lentidão, corte de dano ao quebrar", () => {
  const a = markArena("knight", { tanned_hide: 25 });
  a.p.barrier = a.p.maxBarrier = 100;
  const hp = a.p.hp;
  a.any.damagePlayer(HERO, 200, hit);
  const leaked = hp - a.p.hp;
  const plain = markArena("knight", {});
  plain.p.barrier = plain.p.maxBarrier = 100;
  const plainHp = plain.p.hp;
  plain.any.damagePlayer(HERO, 200, hit);
  check(leaked < plainHp - plain.p.hp && a.p.barrier === 0, `com o Dom ${leaked}, sem ${plainHp - plain.p.hp}`);
  check(a.seat().hideGuardUntil > a.now(), "o escudo quebrou e não deu o corte de dano");
  a.any.slowHero(HERO, 0.5, 3000);
  check(!a.seat().slow, "devia ser imune a lentidão");
});
test(`Couro Curtido: no marco 3, +${HIDE.hp * 100}% de vida`, () => {
  const plain = accountArena("knight", {});
  const hide = accountArena("knight", { knight_tanned_hide: 15 });
  const ratio = hide.p.maxHp / plain.p.maxHp;
  check(ratio > 1.03 && ratio < 1.07, `vida ${plain.p.maxHp} → ${hide.p.maxHp}`);
});
test("Voz de Comando: alcance pelos marcos, velocidade e escudo de socorro", () => {
  const a = markArena("knight", { command_voice: 25 }, { allies: [{ classId: "paladin", bot: true }] });
  const ally = a.state.players.get("h2")!;
  const allySeat = a.seat("h2");
  ally.x = a.p.x + ALLY_DAMAGE_RADIUS + 2;
  ally.y = a.p.y;
  const plainSpeed = a.any.moveSpeed(ally, allySeat, a.now());
  check(a.any.voicesOver(ally).length === 1, "alcance 6 no marco 4");
  ally.x = a.p.x + ALLY_DAMAGE_RADIUS + 3;
  check(a.any.voicesOver(ally).length === 0, "longe demais");
  check(a.any.moveSpeed(ally, allySeat, a.now()) < plainSpeed, "fora da voz devia andar mais devagar");
  ally.x = a.p.x + 1;
  ally.hp = Math.round(ally.maxHp * 0.3);
  ally.barrier = 0;
  a.any.damagePlayer("h2", ally.maxHp * 0.15, hit);
  check(ally.barrier === Math.round(ally.maxHp * VOICE.rescueShield), `escudo ${ally.barrier}`);
});
test("Último Duelo: no marco 2 vale abaixo de 35%, com roubo de vida", () => {
  const a = markArena("knight", { last_duel: 10 }, { monsterHp: 400 });
  a.p.hp = Math.floor(a.p.maxHp * 0.33);
  check(a.any.duelLow(a.seat(), a.p), "33% devia contar como vida baixa");
  const m = a.place("lizardfolk", 1, 0);
  const before = a.p.hp;
  a.any.damageMonster(m, 200, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "slash" }, "basic");
  check(a.p.hp > before, `vida ${before} → ${a.p.hp}`);
});
test("Último Duelo: no marco 5, o slot 3 recarrega na metade com a vida baixa", () => {
  const cd = (low: boolean) => {
    const a = markArena("knight", { last_duel: 25 }, { startLevel: 12 });
    a.hunt.chooseSpell(HERO, { slot: 2, spellId: "titan_fury" });
    const m = a.place("lizardfolk", 3, 0);
    if (low) a.p.hp = Math.floor(a.p.maxHp * 0.2);
    a.ready();
    a.hunt.cast(HERO, { slot: 2, aim: { x: m.x, y: m.y, targetId: m.id } });
    return a.seat().spellReadyAt[2] - a.now();
  };
  const full = cd(false);
  const low = cd(true);
  check(full > 0 && Math.abs(low / full - 0.5) < 0.02, `recarga ${full} → ${low}`);
});
test("Pedra Fundamental: parado 0,5 s, regenera, provoca os colados e corta todos eles", () => {
  const a = markArena("knight", { bedrock: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 1, 0);
  const other = a.place("lizardfolk", -1, 0);
  a.seat().movedAt = a.now() - 600;
  check(a.any.standingStill(a.seat(), a.now()), "0,6 s parado devia contar");
  a.p.hp = Math.round(a.p.maxHp / 2);
  const hp = a.p.hp;
  a.any.regen(1000);
  check(a.p.hp > hp && a.brain(other).targetId === HERO, `vida ${hp} → ${a.p.hp}, alvo ${a.brain(other).targetId}`);
  const otherHp = other.hp;
  attack(a, m, 1500);
  check(other.hp < otherHp, `o colado de trás devia apanhar (${otherHp} → ${other.hp})`);
});
test("Estandarte Vivo: raio 5, armadura e cura ao matar na aura, corte depois do slot 3", () => {
  const a = markArena("knight", { living_banner: 25 }, { allies: [{ classId: "paladin", bot: true }], startLevel: 12 });
  const ally = a.state.players.get("h2")!;
  ally.x = a.p.x + BANNER_RADIUS + 2;
  ally.y = a.p.y;
  check(a.any.bannersOver(ally).length === 1, "raio 5 no marco 4");
  ally.x = a.p.x + 1;
  ally.hp = Math.round(ally.maxHp / 2);
  const hp = ally.hp;
  const m = a.place("lizardfolk", 2, 2);
  a.any.killMonster(m, a.brain(m), "h2");
  check(ally.hp === hp + Math.round(ally.maxHp * BANNER.killHeal), `cura ${hp} → ${ally.hp}`);
  a.hunt.chooseSpell(HERO, { slot: 2, spellId: "titan_fury" });
  const target = a.place("lizardfolk", 3, 0);
  a.ready();
  a.hunt.cast(HERO, { slot: 2, aim: { x: target.x, y: target.y, targetId: target.id } });
  check(a.seat().bannerWardUntil > a.now(), "o slot 3 não ligou o corte de dano");
});

console.log("Paladino:");
test("Olhar Paciente: +1 tile no básico e o tiro no alcance máximo atordoa", () => {
  const plain = markArena("paladin", {});
  const a = markArena("paladin", { patient_eye: 10 }, { monsterHp: 400 });
  plain.advance(100);
  a.advance(100);
  check(a.p.basicRange === plain.p.basicRange + 1, `alcance ${plain.p.basicRange} → ${a.p.basicRange}`);
  const m = a.place("lizardfolk", a.p.basicRange, 0);
  attack(a, m, 2500);
  check(a.seat().eyeStunAt > 0 && (a.seat().stats.giftProcs.patient_eye ?? 0) >= 1, JSON.stringify(a.seat().stats.giftProcs));
});
test("Fé Ardente: queimadura +1 s, ofuscar +0,4 s, cura ao matar morto-vivo, luz que atravessa", () => {
  const a = markArena("paladin", { burning_faith: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 1, 3000, "burn", a.now());
  check(a.brain(m).dot.until - a.now() === 3000 + FAITH.burnMs, `queima até ${a.brain(m).dot.until}`);
  const stun = (gift: number) => {
    const b = markArena("paladin", gift ? { burning_faith: gift } : {}, { monsterHp: 400 });
    b.hunt.chooseSpell(HERO, { slot: 1, spellId: "divine_judgment" });
    const t = b.place("lizardfolk", 2, 0);
    b.ready();
    b.cast(1 as 0, t);
    b.advance(400);
    return b.brain(t).stunnedUntil;
  };
  check(stun(25) - stun(0) === FAITH.dazzleMs * 2, `ofuscar ${stun(0)} → ${stun(25)}`);
  a.p.hp = Math.round(a.p.maxHp / 2);
  const hp = a.p.hp;
  const undead = a.place("skeleton", 3, 0);
  a.kill(undead);
  check(a.p.hp > hp, `vida ${hp} → ${a.p.hp}`);
  a.choose("holy_arrow");
  const front = a.place("lizardfolk", 2, 2);
  const back = a.place("lizardfolk", 3, 3);
  // Presos no lugar: o teste é a luz atravessar, não a perseguição.
  for (const x of [front, back]) a.any.root(x, a.brain(x), a.now() + 60000);
  const backHp = back.hp;
  a.ready();
  a.cast(0, front);
  a.advance(1000);
  check(back.hp < backHp, `o de trás devia apanhar (${backHp} → ${back.hp}; ${a.where()})`);
});
test("Passo de Rastreador: armadilha a mais e mais longa, tiro calmo", () => {
  const a = markArena("paladin", { tracker_step: 25 });
  a.choose("bear_trap");
  for (const dx of [2, 3, 4]) {
    a.ready();
    a.cast(0, { x: a.p.x + dx, y: a.p.y });
    a.advance(200);
  }
  const traps = [...a.state.fields.values()].filter((f) => f.owner === HERO && f.spellId === "bear_trap");
  check(traps.length === 3, `${traps.length} armadilhas (1 + 2 dos marcos)`);
  const until = a.any.fieldBrains.get(traps[2].id).until - a.now();
  check(until > 20000 * (1 + TRACKER.trapMs * 2) - 500, `dura ${until} ms`);
  a.advance(TRACKER.calmMs);
  const m = a.place("lizardfolk", 2, 1);
  attack(a, m, 800);
  check(a.seat().calmShotAt > 0, "o tiro calmo não saiu");
});
test(`Graça: série de ${GRACE_EVERY - 3} no marco 5; a carregada cura e ofusca`, () => {
  const a = markArena("paladin", { grace: 25 }, { monsterHp: 400 });
  a.choose("holy_arrow");
  const target = a.place("lizardfolk", 4, 0);
  const m = a.place("lizardfolk", 1, 1);
  for (const x of [target, m]) a.any.root(x, a.brain(x), a.now() + 60000);
  for (let i = 0; i < GRACE_EVERY - 3; i++) {
    a.ready();
    a.cast(0, target);
    a.advance(200);
  }
  check(a.seat().graceReady, "a série de 7 não carregou");
  a.p.hp = Math.round(a.p.maxHp / 2);
  const hp = a.p.hp;
  a.ready();
  a.cast(0, target);
  check(a.p.hp >= hp + Math.round(a.p.maxHp * GRACE_MARKS.heal) - 1, `vida ${hp} → ${a.p.hp}`);
  check(a.brain(m).dazzledUntil > a.now(), "devia ofuscar quem está perto");
});
test("Fôlego do Caçador: 2 tiros carregados, recarga devolvida e escudo no salto", () => {
  const cd = (gift: number) => {
    const b = markArena("paladin", { hunter_breath: gift });
    b.choose("evasive_roll");
    b.ready();
    b.cast(0, { x: b.p.x + 2, y: b.p.y });
    return { b, cd: b.seat().spellReadyAt[0] - b.now() };
  };
  const plain = cd(1);
  const { b, cd: refunded } = cd(25);
  check(refunded < plain.cd && b.seat().breathShots === BREATH.shots && b.p.barrier > 0, `recarga ${plain.cd} → ${refunded}, tiros ${b.seat().breathShots}, escudo ${b.p.barrier}`);
  const m = b.place("lizardfolk", 2, 1);
  attack(b, m, 600);
  check(b.seat().breathShots <= 1, `tiros que sobraram: ${b.seat().breathShots}`);
});
test(`Mão Rápida: o ${HAND.every}º básico incendeia e a flecha explode em volta`, () => {
  const a = markArena("paladin", { quick_hand: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 3, 0);
  const near = a.place("lizardfolk", 3, 1);
  const hp = near.hp;
  a.p.target = m.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.until(() => a.seat().handCount >= HAND.every, 10000, "não deu 6 básicos");
  a.advance(800);
  check((a.seat().stats.giftProcs.quick_hand ?? 0) >= 1 && near.hp < hp, `procs ${a.seat().stats.giftProcs.quick_hand}, vizinho ${hp} → ${near.hp}`);
});

console.log("Feiticeiro:");
test("Condutor: cadeias +2 saltos, queimadura +1 s, 1º salto sem perda", () => {
  const a = markArena("sorcerer", { conductor: 25 }, { monsterHp: 400 });
  const spell = a.any.markedSpell(a.seat(), SPELLS.chain_lightning);
  check(spell.chain.jumps === SPELLS.chain_lightning.chain!.jumps + CONDUCTOR.jumps * 2, `saltos ${spell.chain.jumps}`);
  const m = a.place("lizardfolk", 2, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 1, 3000, "burn", a.now());
  check(a.brain(m).dot.until - a.now() === 3000 + CONDUCTOR.burnMs, "queimadura");
  const first = a.place("lizardfolk", 3, 0);
  const second = a.place("lizardfolk", 4, 0);
  for (const x of [m, first, second]) a.any.root(x, a.brain(x), a.now() + 60000);
  a.choose("chain_lightning");
  const h0 = m.hp;
  const h1 = first.hp;
  a.ready();
  a.cast(0, m);
  a.advance(800);
  const d0 = h0 - m.hp;
  const d1 = h1 - first.hp;
  check(d0 > 0 && d1 > d0 * 0.75, `alvo ${d0}, 1º salto ${d1}`);
});
test("Coração Frio: lentidão mais forte, dano em lento, escudo ao prender, congelado que morre congela os colados", () => {
  const a = markArena("sorcerer", { cold_heart: 25 }, { monsterHp: 400 });
  const spell = a.any.markedSpell(a.seat(), SPELLS.cone_of_cold);
  check(Math.abs(spell.slow.pct - (SPELLS.cone_of_cold.slow!.pct + COLD.slow * 2)) < 1e-9, `lentidão ${spell.slow.pct}`);
  const slowed = a.place("lizardfolk", 2, 0);
  const plain = a.place("lizardfolk", 3, 0);
  a.brain(slowed).slowUntil = a.now() + 5000;
  const s0 = slowed.hp;
  const p0 = plain.hp;
  a.any.damageMonster(slowed, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "basic");
  a.any.damageMonster(plain, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "basic");
  const ratio = (s0 - slowed.hp) / (p0 - plain.hp);
  check(Math.abs(ratio - (1 + COLD.slowedDamage)) < 0.03, `razão ${ratio}`);
  a.choose("ice_lance");
  const target = a.place("lizardfolk", 2, 2);
  a.brain(target).stunnedUntil = a.now() + 60000;
  a.ready();
  a.cast(0, target);
  a.advance(600);
  // O escudo é pequeno (5%) e os outros monstros da arena podem gastá-lo logo: vale ter saído.
  check(a.seat().barrierUntil > a.now() && a.p.maxBarrier === Math.round(a.p.maxHp * COLD.rootShield), `escudo até ${a.seat().barrierUntil}, ${a.p.maxBarrier}`);
  const victim = a.place("lizardfolk", -2, 0);
  const neighbor = a.place("lizardfolk", -2, 1);
  a.any.root(victim, a.brain(victim), a.now() + 5000, true);
  a.kill(victim);
  check(neighbor.frozen, "o colado devia congelar");
});
test("Fome Sombria: marca +2 s, mana ao matar com magia, roubo de mana nas trevas", () => {
  const a = markArena("sorcerer", { shadow_hunger: 25 });
  const marked = a.any.markedSpell(a.seat(), { ...SPELLS.shadow_orb, mark: { pct: 0.1, ms: 3000 } });
  check(marked.mark.ms === 3000 + HUNGER.markMs * 2, `marca ${marked.mark.ms}`);
  check(Math.abs((a.any.markedSpell(a.seat(), SPELLS.shadow_orb).manaSteal ?? 0) - ((SPELLS.shadow_orb.manaSteal ?? 0) + HUNGER.manaSteal)) < 1e-9, "roubo de mana");
});
test("Circuito: 2 elementos bastam no marco 3 e a carregada recarrega na metade", () => {
  const a = markArena("sorcerer", { circuit: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  for (const spellId of ["fireball", "cone_of_cold"] as const) {
    a.p.spell1 = spellId;
    a.ready();
    a.cast(0, m);
    a.advance(300);
  }
  check(a.seat().circuitReady, "2 elementos deviam fechar o circuito");
  a.p.spell1 = "fireball";
  a.ready();
  a.cast(0, m);
  const charged = a.seat().spellReadyAt[0] - a.now();
  a.advance(300);
  a.ready();
  a.cast(0, m);
  const plain = a.seat().spellReadyAt[0] - a.now();
  check(Math.abs(charged / plain - 0.5) < 0.02, `recarga ${plain} → ${charged}`);
});
test("Reserva Gélida: limiar 20%, quem bate congela, mana ao quebrar, recarga 20 s", () => {
  const a = markArena("sorcerer", { frost_reserve: 25 });
  // Sem o Escudo de Mana (Traço), que também tira mana quando o herói apanha.
  a.seat().traits = [];
  a.choose("fireball");
  const m = a.place("lizardfolk", 1, 0);
  a.ready();
  a.cast(0, m);
  const cost = a.p.maxMana - a.p.mana;
  a.ready();
  a.p.mana = Math.floor(a.p.maxMana * 0.2) + cost - 1;
  a.cast(0, m);
  check(a.p.barrier > 0 && a.seat().frostReadyAt - a.now() === FROST_MARKS.cooldownMsLater, `escudo ${a.p.barrier}, recarga ${a.seat().frostReadyAt - a.now()}`);
  const mana = a.p.mana;
  a.any.damagePlayer(HERO, a.p.barrier * 3, { attacker: m.id, fromX: m.x, fromY: m.y, fx: "bite" });
  check(m.frozen && a.p.barrier === 0 && a.p.mana > mana, `congelado ${m.frozen}, mana ${mana} → ${a.p.mana}`);
});
test("Ossuário: até 3 esqueletos de 12 s, e explodem ao sumir", () => {
  const a = markArena("sorcerer", { ossuary: 25 }, { monsterHp: 400 });
  a.seat().gifts.raiseChance = 1;
  for (const dx of [2, 3, 4, 5]) {
    const m = a.place("lizardfolk", dx, -2);
    a.any.damageMonster(m, 999999, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "shadow_orb");
  }
  const bones = [...a.state.summons.values()].filter((s) => s.owner === HERO);
  check(bones.length === BONES.max, `${bones.length} esqueletos`);
  const brain = a.any.summonBrains.get(bones[0].id);
  check(brain.expiresAt - a.now() === BONES.msLater, `duração ${brain.expiresAt - a.now()}`);
  const victim = a.place("lizardfolk", 0, 3);
  a.any.root(victim, a.brain(victim), a.now() + 60000);
  bones[0].x = victim.x + 1;
  bones[0].y = victim.y;
  brain.expiresAt = a.now();
  const hp = victim.hp;
  a.any.summonThink(bones[0], a.now());
  check(victim.hp < hp && a.seat().stats.reactions.doom === 1, `vida ${hp} → ${victim.hp}`);
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("MARCOS OK");
process.exit(0);
