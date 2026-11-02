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
 *     recarga, congelar quem bate, mana ao quebrar) e Ossuário (mais esqueletos, explosão ao sumir);
 *   - Druida: Laço da Matilha (duração, lobo a mais, volta ao cair), Seiva Antiga (escudo da sobra, lentidão, cura forte),
 *     Seiva Venenosa (duração, lentidão, veneno que pula), Instinto (série, atordoar), Ciclo (onda maior, raiz, escudo)
 *     e Céu Fechado (o raio envenena, prende e cai 2 vezes);
 *   - Dons da costela de passivas do Cavaleiro (fase 4b): lugar na árvore, Sangue no Aço, Fúria Crescente, Bigorna,
 *     Repique, Eco de Guerra e Ordem de Execução, com o efeito por nível e os marcos;
 *   - Dons da costela do Paladino: Aljava Larga (leque de flechas no básico), Ponto Fraco, Aurora, Vela Votiva,
 *     Estrepes Afiados e Pavio Curto;
 *   - Dons da costela do Feiticeiro: Garganta de Brasa, Panela de Pressão, Sopro Glacial, Cristalizar, Lamento Profundo
 *     (com o enfraquecer) e Sentença Lenta;
 *   - Dons da costela do Druida: Eco do Rugido, Presa Venenosa (criaturas envenenam e disparam o Espinheiro), Pólen
 *     Dourado, Néctar, Rajada de Cardos e Espinheiro Antigo.
 * Uso: npx tsx scripts/marcos.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  ALLY_DAMAGE_RADIUS, BRAMBLE, FANG, NECTAR, POLLEN, ROAR, THISTLE, THORNBUSH, EMBER, GLACIAL, LAMENT, PRESSURE, SENTENCE, SHATTER_BONUS, VAPOR, CANDLE, QUIVER, WEAK, ANVIL, BLOOD, EXPOSED_BONUS, FURY, talentTree, BANNER, BONES, CYCLE_MARKS, INSTINCT, PACK, SAP, VENOM, COLD, CONDUCTOR, FROST_MARKS, HUNGER, SPELLS, BREATH, FAITH, GRACE_EVERY, GRACE_MARKS, HAND, TRACKER, BANNER_RADIUS, CLASS_IDS, GIFTS, GIFT_MILESTONES, HIDE, VOICE, giftMilestones, sumGifts,
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

console.log("Druida:");
test("Laço da Matilha: lobos +1, duram +20% e voltam uma vez ao cair", () => {
  const summon = (gift: number) => {
    const b = markArena("druid", gift ? { pack_bond: gift } : {});
    b.choose("spirit_wolf");
    b.ready();
    b.cast(0);
    const wolves = [...b.state.summons.values()].filter((s) => s.owner === HERO && s.kind === "wolf");
    return { b, wolves, ms: b.any.summonBrains.get(wolves[0].id).expiresAt - b.now() };
  };
  const plain = summon(0);
  const { b: a, wolves, ms } = summon(25);
  check(wolves.length === plain.wolves.length + 1, `${plain.wolves.length} → ${wolves.length} lobos`);
  check(Math.abs(ms - plain.ms * (1 + PACK.duration * 2)) < 2, `duração ${plain.ms} → ${ms}`);
  a.any.damageSummon(wolves[0], wolves[0].hp + 10, { attacker: "", fromX: 0, fromY: 0, fx: "bite" });
  check(a.state.summons.has(wolves[0].id) && wolves[0].hp === Math.round(wolves[0].maxHp * PACK.reviveHp), `voltou com ${wolves[0].hp}`);
  a.any.damageSummon(wolves[0], wolves[0].hp + 10, { attacker: "", fromX: 0, fromY: 0, fx: "bite" });
  check(!a.state.summons.has(wolves[0].id), "só volta uma vez");
});
test("Seiva Antiga: sobra vira escudo, tira lentidão e cura mais quem está mal", () => {
  const a = markArena("druid", { ancient_sap: 25 });
  // Sem o Florescer (Traço), que também guarda a sobra da cura como escudo.
  a.seat().traits = [];
  a.seat().slow = { factor: 0.5, until: a.now() + 5000 };
  a.p.slowed = true;
  a.p.hp = a.p.maxHp - 5;
  a.any.healPlayer(a.p, 100, HERO);
  check(a.p.barrier === Math.round(a.p.maxHp * SAP.overhealLater) && !a.seat().slow, `escudo ${a.p.barrier}`);
  const b = markArena("druid", { ancient_sap: 25 });
  b.seat().traits = [];
  b.p.hp = 1;
  b.any.healPlayer(b.p, 20, HERO);
  // 20 de cura, +25% do próprio Dom no nível 25, e +50% por estar abaixo de 30%.
  check(b.p.hp === 1 + Math.round(Math.round(20 * 1.25) * (1 + SAP.lowHpBonus)), `vida ${b.p.hp}`);
});
test("Seiva Venenosa: veneno +2 s e lento, e pula para o vizinho quando o envenenado morre", () => {
  const a = markArena("druid", { venom_sap: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  const next = a.place("lizardfolk", 3, 0);
  a.any.applyDot(m, a.brain(m), HERO, "teste", 5, 3000, "poison", a.now());
  check(a.brain(m).dot.until - a.now() === 3000 + VENOM.ms * 2 && m.slowed, `veneno até ${a.brain(m).dot.until}, lento ${m.slowed}`);
  a.kill(m);
  check(a.brain(next).dot?.kind === "poison", "o veneno devia pular");
});
test("Instinto: a cada 3º básico, a mordida atordoa", () => {
  const a = markArena("knight", { instinct: 10 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 1, 0);
  a.p.target = m.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.until(() => a.seat().basicCount >= INSTINCT.everyLater, 8000, "não deu 3 básicos");
  check(a.brain(m).stunnedUntil > 0 && a.seat().stats.giftProcs.instinct === 1, `procs ${a.seat().stats.giftProcs.instinct}`);
});
test("Ciclo: a cada 200 de cura, a onda chega a 2 tiles, prende e dá escudo", () => {
  const a = markArena("druid", { cycle: 25 });
  const m = a.place("lizardfolk", 2, 0);
  a.seat().traits = [];
  // Duas curas de 100 (a vida máxima do druida não cabe 200 de uma vez).
  for (let i = 0; i < 2; i++) {
    a.p.hp = 1;
    a.any.healPlayer(a.p, CYCLE_MARKS.healLater / 2, HERO);
  }
  check(a.seat().stats.giftProcs.cycle === 1, JSON.stringify(a.seat().stats.giftProcs));
  check(m.rooted && a.p.barrier === Math.round(a.p.maxHp * CYCLE_MARKS.shield), `preso ${m.rooted}, escudo ${a.p.barrier}`);
});
test("Céu Fechado: 2 raios que envenenam e prendem", () => {
  const a = markArena("druid", { closed_sky: 25 }, { monsterHp: 400 });
  const one = a.place("lizardfolk", 2, 0);
  const two = a.place("lizardfolk", 3, 0);
  a.any.closedSky(HERO, a.p.x + 2, a.p.y + 1);
  a.advance(300);
  check(a.seat().stats.giftProcs.closed_sky === 2, JSON.stringify(a.seat().stats.giftProcs));
  check(a.brain(one).dot?.kind === "poison" && a.brain(two).dot?.kind === "poison" && (one.rooted || two.rooted), "envenena e prende");
});

console.log("Costela de passivas (Cavaleiro):");
test("dois Dons por ramo nas linhas VI e VII, presos à ponta do tronco", () => {
  const tree = talentTree("knight");
  for (const col of [0, 1, 2]) {
    const ribs = tree.filter((t) => t.kind === "gift" && t.col === col && t.lane === -2 && t.row >= 6);
    check(ribs.length === 2, `ramo ${col}: ${ribs.length} Dons na costela`);
    const [p1, p2] = ribs.sort((a, b) => a.row - b.row);
    const tip = tree.find((t) => t.id === p1.requires!.id)!;
    check(tip.kind === "spell" && tip.lane === 0 && tip.col === col && p2.requires!.id === p1.id, `ramo ${col}: pais errados`);
  }
});
test("Sangue no Aço: Hemorragia mais forte, cura e pega os colados", () => {
  const blood = (rank: number) => {
    const a = markArena("knight", rank ? { blood_steel: rank } : {}, { monsterHp: 400 });
    const m = a.place("lizardfolk", 2, 0);
    const side = a.place("lizardfolk", 2, 1);
    a.any.applyDot(m, a.brain(m), HERO, "teste", 20, 5000, "bleed", a.now());
    a.p.hp = Math.round(a.p.maxHp / 2);
    const hp = a.p.hp;
    const m0 = m.hp;
    const s0 = side.hp;
    a.any.hemorrhage(m, a.brain(m), HERO);
    return { dealt: m0 - m.hp, side: s0 - side.hp, healed: a.p.hp - hp };
  };
  const plain = blood(0);
  const full = blood(25);
  // +75% do nível 25 e um pulso a mais (o marco 4 alonga o sangramento em 1 s: 6 pulsos em vez de 5).
  check(Math.abs(full.dealt / plain.dealt - 1.75 * 6 / 5) < 0.05, `Hemorragia ${plain.dealt} → ${full.dealt}`);
  check(full.healed > 0 && full.side > 0 && plain.side === 0, `cura ${full.healed}, colado ${full.side}`);
});
test("Fúria Crescente: matar soma acúmulos de dano, até o teto do marco", () => {
  const a = markArena("knight", { rising_fury: 25 }, { monsterHp: 1 });
  const before = a.any.damageBonus(a.seat(), a.p);
  for (let i = 0; i < 20; i++) a.kill(a.place("lizardfolk", 2 + (i % 4), -2 + Math.floor(i / 4)));
  check(a.seat().furyStacks === FURY.maxLater && a.seat().furyFree, `acúmulos ${a.seat().furyStacks}`);
  const ratio = a.any.damageBonus(a.seat(), a.p) - before;
  check(Math.abs(ratio - 0.05 * FURY.maxLater) < 1e-6, `bônus ${ratio}`);
});
test("Bigorna: empurrado contra o outro, atordoa os dois e o de trás anda", () => {
  const a = markArena("knight", { anvil: 25 }, { monsterHp: 400 });
  const front = a.place("lizardfolk", 1, 0);
  const back = a.place("lizardfolk", 2, 0);
  const bx = back.x;
  const hp = front.hp;
  a.any.push(front, a.p, 1, HERO);
  check(front.stunned && back.stunned && front.hp < hp && back.x === bx + 1, `atordoados ${front.stunned}/${back.stunned}, trás ${bx} → ${back.x}`);
  check(a.brain(front).stunnedUntil - a.now() === ANVIL.maxMs, `atordoar ${a.brain(front).stunnedUntil - a.now()}`);
});
test("Repique: o golpe no escudo fere e provoca quem está perto", () => {
  const a = markArena("knight", { chime: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  a.p.barrier = a.p.maxBarrier = 200;
  const hp = m.hp;
  a.any.damagePlayer(HERO, 100, { attacker: "", fromX: 0, fromY: 0, fx: "slash" });
  check(m.hp < hp && a.brain(m).targetId === HERO, `vida ${hp} → ${m.hp}`);
});
test("Eco de Guerra: provocar dá escudo por monstro provocado", () => {
  const a = markArena("knight", { war_echo: 25 }, { monsterHp: 400 });
  for (const dx of [1, 2]) a.place("lizardfolk", dx, 1);
  a.hunt.chooseSpell(HERO, { slot: 1, spellId: "war_cry" });
  a.ready();
  a.cast(1 as 0);
  check(a.p.barrier >= Math.round(a.p.maxHp * 0.1 * 2) - 1, `escudo ${a.p.barrier} de ${a.p.maxHp}`);
});
test("Ordem de Execução: o Exposto recebe +60% e vale 2 s depois do atordoar", () => {
  const exposedHit = (rank: number, afterStun: boolean) => {
    const a = markArena("knight", rank ? { execution_order: rank } : {}, { monsterHp: 400 });
    // Relógio adiantado: o atordoar "1,5 s atrás" precisa de uma hora positiva.
    a.advance(3000);
    const m = a.place("lizardfolk", 2, 0);
    const b = a.brain(m);
    b.markUntil = a.now() + 10000;
    b.stunnedUntil = afterStun ? a.now() - 1500 : a.now() + 5000;
    const hp = m.hp;
    a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "slash" }, "basic");
    return hp - m.hp;
  };
  const plainExposed = exposedHit(0, false);
  const order = exposedHit(25, false);
  check(Math.abs(order / plainExposed - (1 + EXPOSED_BONUS + 0.6) / (1 + EXPOSED_BONUS)) < 0.03, `${plainExposed} → ${order}`);
  check(exposedHit(25, true) > exposedHit(0, true), "1,5 s depois do atordoar ainda devia contar");
});

console.log("Costela de passivas (Paladino):");
test("dois Dons por ramo nas linhas VI e VII do Paladino", () => {
  const ribs = talentTree("paladin").filter((t) => t.kind === "gift" && t.lane === -2 && t.row >= 6);
  check(ribs.length === 6, `${ribs.length} Dons na costela`);
});
test("Aljava Larga: no marco 5, a cada 3 básicos sai um leque de 5 flechas", () => {
  const a = markArena("paladin", { wide_quiver: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 3, 0);
  const side = a.place("lizardfolk", 3, 1);
  a.any.root(side, a.brain(side), a.now() + 60000);
  a.any.root(m, a.brain(m), a.now() + 60000);
  const shots = a.attacks.length;
  a.p.target = m.id;
  a.seat().attacking = true;
  a.seat().targetLocked = true;
  a.until(() => a.seat().quiverCount >= QUIVER.everyLater, 8000, "não deu 3 básicos");
  a.advance(800);
  check(a.seat().stats.giftProcs.wide_quiver === 1 && a.attacks.length - shots >= QUIVER.everyLater + QUIVER.arrowsLater, `flechas ${a.attacks.length - shots}`);
});
test("Ponto Fraco: marcado e sangrando leva +60%, e a marca faz sangrar", () => {
  const hitMarked = (rank: number) => {
    const a = markArena("paladin", rank ? { weak_spot: rank } : {}, { monsterHp: 400 });
    const m = a.place("lizardfolk", 2, 0);
    a.brain(m).markUntil = a.now() + 10000;
    a.any.applyDot(m, a.brain(m), "outro", "teste", 1, 5000, "bleed", a.now());
    const hp = m.hp;
    a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "arrow" }, "basic");
    return hp - m.hp;
  };
  check(Math.abs(hitMarked(25) / hitMarked(0) - 1.6) < 0.05, `${hitMarked(0)} → ${hitMarked(25)}`);
  const a = markArena("paladin", { weak_spot: 5 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  a.any.applySpell(HERO, { ...SPELLS.holy_arrow, mark: { pct: 0.1, ms: 3000 } }, 0, m.id, m.x, m.y, 10, undefined, 0);
  check(a.brain(m).dot?.kind === "bleed" && a.brain(m).dot.until - a.now() >= WEAK.markBleedMs - 1, `dot ${a.brain(m).dot?.kind}`);
});
test("Aurora: Incandescer +75% e em raio 2", () => {
  const burst = (rank: number) => {
    const a = markArena("paladin", rank ? { dawn: rank } : {}, { monsterHp: 400 });
    const m = a.place("lizardfolk", 2, 0);
    const far = a.place("lizardfolk", 4, 0);
    a.brain(m).stunnedUntil = a.now() + 2000;
    a.brain(m).dazzledUntil = a.now() + 2000;
    const hp = far.hp;
    a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "fire" }, "fireball");
    return hp - far.hp;
  };
  check(burst(0) === 0 && burst(25) > 0, `raio 2: ${burst(0)} / ${burst(25)}`);
});
test("Vela Votiva: morto por luz deixa vela (2 em morto-vivo) que fere e dá armadura", () => {
  const a = markArena("paladin", { votive_candle: 25 }, { monsterHp: 1 });
  const undead = a.place("skeleton", 2, 0);
  a.any.damageMonster(undead, 99999, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "arrow" }, "holy_arrow");
  const candles = [...a.state.fields.values()].filter((f) => f.owner === HERO && f.style === "candle");
  check(candles.length === 2, `${candles.length} velas`);
  const brain = a.any.fieldBrains.get(candles[0].id);
  check(Math.abs(brain.until - a.now() - CANDLE.msLater) < 2 && brain.allyArmor === CANDLE.armor, `vela ${brain.until - a.now()} ms, armadura ${brain.allyArmor}`);
});
test("Estrepes Afiados: campos +30% e mais longos", () => {
  const field = (rank: number) => {
    const a = markArena("paladin", rank ? { sharp_caltrops: rank } : {});
    a.choose("bear_trap");
    a.ready();
    a.cast(0, { x: a.p.x + 2, y: a.p.y });
    const f = [...a.state.fields.values()].find((x) => x.owner === HERO)!;
    const b = a.any.fieldBrains.get(f.id);
    return { amount: b.amount, ms: b.until - a.now() };
  };
  const plain = field(0);
  const full = field(25);
  check(Math.abs(full.amount / plain.amount - 1.3) < 0.01 && full.ms > plain.ms, `força ${plain.amount} → ${full.amount}, ${plain.ms} → ${full.ms} ms`);
});
test("Pavio Curto: a armadilha queima quem prende e explode em volta", () => {
  const a = markArena("paladin", { short_fuse: 25 }, { monsterHp: 400 });
  a.choose("bear_trap");
  a.ready();
  a.cast(0, { x: a.p.x + 3, y: a.p.y });
  const trap = [...a.state.fields.values()].find((x) => x.owner === HERO)!;
  const near = a.place("lizardfolk", 4, 1);
  a.any.root(near, a.brain(near), a.now() + 60000);
  const hp = near.hp;
  const prey = a.place("lizardfolk", trap.x - a.p.x, trap.y - a.p.y);
  a.any.root(prey, a.brain(prey), a.now() + 60000);
  a.advance(500);
  check(near.hp < hp && a.seat().stats.giftProcs.short_fuse >= 1, `vizinho ${hp} → ${near.hp}`);
});

console.log("Costela de passivas (Feiticeiro):");
test("dois Dons por ramo nas linhas VI e VII do Feiticeiro", () => {
  check(talentTree("sorcerer").filter((t) => t.kind === "gift" && t.lane === -2 && t.row >= 6).length === 6, "6 Dons");
});
test("Garganta de Brasa: sopros +40% e mais abertos, e a onda acaba em chamas e explosão", () => {
  const a = markArena("sorcerer", { ember_throat: 25 }, { monsterHp: 400 });
  const spell = a.any.markedSpell(a.seat(), SPELLS.fire_spit);
  check(Math.abs(spell.damage / SPELLS.fire_spit.damage! - 1.4) < 1e-6 && spell.coneAngle === (SPELLS.fire_spit.coneAngle ?? 90) + EMBER.angle * 2, `dano ${spell.damage}, ${spell.coneAngle}°`);
  a.choose("fire_spit");
  const m = a.place("lizardfolk", 2, 0);
  a.any.root(m, a.brain(m), a.now() + 60000);
  a.ready();
  a.cast(0, m);
  a.until(() => (a.seat().stats.giftProcs.ember_throat ?? 0) > 0, 3000, "a onda não explodiu no fim");
  check([...a.state.fields.values()].some((f) => f.owner === HERO && f.style === "fire"), "sem chão em chamas no fim da onda");
});
test("Panela de Pressão: Vapor +75%, em raio 3, deixa névoa e devolve mana", () => {
  const vapor = (rank: number) => {
    const a = markArena("sorcerer", rank ? { pressure_cooker: rank } : {}, { monsterHp: 400 });
    const m = a.place("lizardfolk", 2, 0);
    const far = a.place("lizardfolk", 5, 0);
    a.any.applyDot(m, a.brain(m), HERO, "teste", 1, 5000, "burn", a.now());
    a.p.mana = 0;
    const hp = far.hp;
    a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "ice_lance");
    return { far: hp - far.hp, mist: [...a.state.fields.values()].some((f) => f.style === "mist"), mana: a.p.mana };
  };
  const plain = vapor(0);
  const full = vapor(25);
  check(plain.far === 0 && full.far > 0 && full.mist && full.mana > 0, JSON.stringify(full));
  check(PRESSURE.radiusLater === 3 && VAPOR.radius === 1, "raios");
});
test("Sopro Glacial: o sopro canalizado deixa mais lento, congela em 1,5 s e não prende o herói", () => {
  const a = markArena("sorcerer", { glacial_breath: 25 }, { monsterHp: 400 });
  const spell = a.any.markedSpell(a.seat(), SPELLS.frost_breath);
  check(spell.channel.moveSlow === 0 && spell.range === SPELLS.frost_breath.range + GLACIAL.range, `lentidão do herói ${spell.channel.moveSlow}, alcance ${spell.range}`);
  // Sem o Traço Estilhaçar (que quebra o gelo de quem já estava preso no pulso seguinte).
  a.seat().traits = [];
  a.hunt.chooseSpell(HERO, { slot: 1, spellId: "frost_breath" });
  const m = a.place("lizardfolk", 2, 0);
  // Parado no leque (atordoado, não preso: a prisão de agora não pode esconder a do sopro).
  a.brain(m).stunnedUntil = a.now() + 60000;
  a.ready();
  a.cast(1 as 0, m);
  a.until(() => m.frozen, 2500, "o sopro não congelou em 1,5 s");
  check(a.brain(m).primedUntil > a.now() && a.brain(m).slowPct >= 0.3, `pronto para Estilhaçar ${a.brain(m).primedUntil}, lento ${a.brain(m).slowPct}`);
});
test("Cristalizar: Estilhaço +75% e em volta; o gelo do sopro quebra com qualquer elemento", () => {
  const shatter = (rank: number) => {
    const a = markArena("sorcerer", rank ? { crystallize: rank } : {}, { monsterHp: 400 });
    const m = a.place("lizardfolk", 2, 0);
    const side = a.place("lizardfolk", 2, 1);
    a.any.root(m, a.brain(m), a.now() + 5000, true);
    const h0 = m.hp;
    const s0 = side.hp;
    a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "basic");
    a.advance(100);
    return { main: h0 - m.hp, side: s0 - side.hp, refrozen: m.frozen };
  };
  const plain = shatter(0);
  const full = shatter(25);
  check(Math.abs(full.main / plain.main - (1 + SHATTER_BONUS + 0.75) / (1 + SHATTER_BONUS)) < 0.05, `${plain.main} → ${full.main}`);
  check(plain.side === 0 && full.side > 0 && full.refrozen, `lado ${full.side}, congelou de novo ${full.refrozen}`);
  const a = markArena("sorcerer", {}, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  a.any.root(m, a.brain(m), a.now() + 5000, true);
  a.brain(m).primedUntil = a.now() + 3000;
  // Trevas não reagem com o gelo comum; com o gelo do sopro, Estilhaçam.
  a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "shadow_orb");
  check(a.seat().stats.reactions.shatter === 1, `reações ${JSON.stringify(a.seat().stats.reactions)}`);
});
test("Lamento Profundo: as trevas enfraquecem (−30% de dano do monstro) e o enfraquecido apanha mais", () => {
  const a = markArena("sorcerer", { deep_lament: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 1, 0);
  a.any.applySpell(HERO, SPELLS.shadow_orb, 0, m.id, m.x, m.y, 10, undefined, 0);
  check(Math.abs(a.brain(m).weakPct - 0.3) < 1e-6 && a.brain(m).weakUntil - a.now() === LAMENT.msLater, `enfraquecer ${a.brain(m).weakPct} por ${a.brain(m).weakUntil - a.now()}`);
  const hit = (weak: boolean) => {
    const b = markArena("sorcerer", {}, { monsterHp: 400 });
    b.seat().traits = [];
    const x = b.place("lizardfolk", 1, 0);
    if (weak) {
      b.brain(x).weakPct = 0.3;
      b.brain(x).weakUntil = b.now() + 5000;
    }
    const hp = b.p.hp;
    b.any.damagePlayer(HERO, 100, { attacker: x.id, fromX: x.x, fromY: x.y, fx: "bite" });
    return hp - b.p.hp;
  };
  check(Math.abs(hit(true) / hit(false) - 0.7) < 0.05, `golpe ${hit(false)} → ${hit(true)}`);
});
test("Sentença Lenta: Condenação +75% em raio 2, marca quem pega e passa para o marcado vizinho", () => {
  const a = markArena("sorcerer", { slow_sentence: 25 }, { monsterHp: 400 });
  const m = a.place("lizardfolk", 2, 0);
  const near = a.place("lizardfolk", 4, 0);
  const marked = a.place("lizardfolk", 2, 3);
  a.brain(m).markUntil = a.now() + 5000;
  m.marked = true;
  a.brain(marked).markUntil = a.now() + 5000;
  const hp = near.hp;
  a.any.damageMonster(m, 100, { attacker: HERO, fromX: a.p.x, fromY: a.p.y, fx: "energy" }, "shadow_orb");
  // O vizinho (a 2 tiles) leva a explosão e fica marcado; a Condenação em cadeia passa para o marcado mais perto (ele).
  check(near.hp < hp && a.seat().stats.reactions.doom === 2, `vizinho ${hp} → ${near.hp}, ${JSON.stringify(a.seat().stats.reactions)}`);
  check(SENTENCE.radius === 2, "raio");
});

console.log("Dons da costela do Druida:");
test("lugar na árvore: linha VI pede a ponta do tronco, a VII pede a da VI", () => {
  const tree = talentTree("druid");
  const at = (id: string) => tree.find((t) => t.id === `druid_${id}`)!;
  for (const [six, seven, tip] of [["roar_echo", "venom_fang", "ancient_bear"], ["golden_pollen", "nectar", "forest_heart"], ["thistle_burst", "ancient_bramble", "nature_wrath"]]) {
    check(at(six).row === 6 && at(six).lane === -2 && at(six).requires?.id === `druid_${tip}`, `${six}: ${JSON.stringify(at(six))}`);
    check(at(seven).row === 7 && at(seven).lane === -2 && at(seven).requires?.id === `druid_${six}`, `${seven}`);
  }
});
test("Eco do Rugido: rugido +30% de ataque (+5%), cura, leque maior e o lobo do rugido", () => {
  const a = markArena("druid", { roar_echo: 25 });
  const roar = a.any.markedSpell(a.seat(), SPELLS.pack_roar);
  check(Math.abs(roar.packCall.haste - (0.3 * 1.3 + ROAR.haste)) < 1e-6 && roar.packCall.heal === ROAR.heal, `rugido ${JSON.stringify(roar.packCall)}`);
  check(roar.coneAngle === 90 + ROAR.angle && roar.range === SPELLS.pack_roar.range + ROAR.range, `leque ${roar.coneAngle}° ${roar.range}`);
  a.any.applySpell(HERO, a.any.markedSpell(a.seat(), SPELLS.beast_cry), 0, undefined, a.p.x, a.p.y, 0, undefined, 0);
  const wolves = [...a.state.summons.values()].filter((s) => s.owner === HERO && s.kind === "wolf");
  check(wolves.length === 1 && a.any.summonBrains.get(wolves[0].id).expiresAt - a.now() === ROAR.wolfMs, `lobos ${wolves.length}`);
  check(a.any.summonBrains.get(wolves[0].id).haste > 0.5, "o lobo do rugido já sai enfurecido");
  check(a.seat().stats.giftProcs.roar_echo === 1, "telemetria");
});
test("Presa Venenosa: criaturas envenenam (acumula 2), disparam o Espinheiro em quem está preso e pulam ao matar", () => {
  const a = markArena("druid", { venom_fang: 25 }, { monsterHp: 2000 });
  a.seat().traits = [];
  const m = a.place("lizardfolk", 2, 0);
  a.any.root(m, a.brain(m), a.now() + 600000);
  a.choose("spirit_wolf");
  a.ready();
  a.cast(0);
  a.any.root(m, a.brain(m), a.now() + 600000);
  a.advance(1500);
  check((a.seat().stats.reactions.thornbush ?? 0) >= 1, `Espinheiro das criaturas: ${JSON.stringify(a.seat().stats.reactions)}`);
  a.advance(3000);
  check(a.brain(m).dot?.kind === "poison" && a.brain(m).dot.stacks === FANG.stacks && a.brain(m).fangRooted, `veneno ${JSON.stringify(a.brain(m).dot)}`);
  // O 1º marco: veneno de 4 s (3 + 1).
  check(a.brain(m).dot.until - a.now() <= FANG.ms + FANG.poisonMs, "duração");
  const wolf = [...a.state.summons.values()].find((s) => s.owner === HERO && s.kind === "wolf")!;
  a.state.monsters.delete(m.id);
  const dead = a.place("lizardfolk", -2, 0);
  const deadBrain = a.brain(dead);
  a.state.monsters.delete(dead.id);
  const next = a.place("lizardfolk", 0, 3);
  a.any.venomFang(wolf, a.any.summonBrains.get(wolf.id), dead, deadBrain, 5, false);
  check(Math.max(Math.abs(wolf.x - next.x), Math.abs(wolf.y - next.y)) <= 1 || a.any.summonBrains.get(wolf.id).targetId === next.id, `pulou para ${wolf.x},${wolf.y}`);
  check(a.seat().stats.giftProcs.venom_fang === 1, "telemetria do pulo");
});
test("Pólen Dourado: leque de cura +30%, maior, devolve mana, tira atordoar e dá armadura ao aliado", () => {
  const a = markArena("druid", { golden_pollen: 25 }, { allies: [{ classId: "knight" }] });
  const breeze = a.any.markedSpell(a.seat(), SPELLS.pollen_breeze);
  check(Math.abs(breeze.heal - 0.2 * 1.3) < 1e-6 && breeze.coneAngle === 120 + POLLEN.angle && breeze.range === SPELLS.pollen_breeze.range + POLLEN.range, `leque ${JSON.stringify({ h: breeze.heal, a: breeze.coneAngle, r: breeze.range })}`);
  const ally = a.state.players.get("h2")!;
  const allySeat = a.seat("h2");
  ally.hp = Math.round(ally.maxHp / 2);
  ally.mana = 0;
  allySeat.effects.stun = { until: a.now() + 5000, stacks: 1 };
  a.choose("pack_roar", "pollen_breeze");
  a.p.spell2 = "pollen_breeze";
  a.ready();
  a.cast(1, { x: ally.x + 2, y: ally.y });
  a.advance(1000);
  check(ally.hp > Math.round(ally.maxHp / 2), `aliado curado ${ally.hp}`);
  check(ally.mana >= Math.max(1, Math.round(ally.maxMana * POLLEN.mana)), `mana ${ally.mana}`);
  check(!allySeat.effects.stun && allySeat.sapArmor === POLLEN.armor && allySeat.sapUntil > a.now(), `atordoar ${JSON.stringify(allySeat.effects)} armadura ${allySeat.sapArmor}`);
});
test("Néctar: curar quem está abaixo de 70% devolve 5% da mana (1 vez por s), dá velocidade, escudo e tira o atordoar", () => {
  const a = markArena("druid", { nectar: 25 });
  a.seat().traits = [];
  a.p.mana = 0;
  a.p.hp = Math.round(a.p.maxHp * 0.65);
  a.seat().effects.stun = { until: a.now() + 5000, stacks: 1 };
  a.any.healPlayer(a.p, 1, HERO);
  check(a.p.mana === Math.round(a.p.maxMana * 0.05), `mana ${a.p.mana}`);
  check(a.seat().nectarSpeedUntil === a.now() + NECTAR.speedMs && a.p.barrier === Math.round(a.p.maxHp * NECTAR.shield) && !a.seat().effects.stun, "velocidade, escudo e atordoar");
  a.any.healPlayer(a.p, 1, HERO);
  check(a.p.mana === Math.round(a.p.maxMana * 0.05), "uma vez por segundo");
  a.advance(NECTAR.everyMs);
  a.p.hp = Math.round(a.p.maxHp * 0.8);
  const mana = a.p.mana;
  a.any.healPlayer(a.p, 1, HERO);
  check(a.p.mana === mana && a.seat().stats.giftProcs.nectar === 1, "acima de 70% não devolve");
});
test("Rajada de Cardos: +30% de dano, 8 espinhos, prendem, envenenam e atravessam o 1º monstro", () => {
  const a = markArena("druid", { thistle_burst: 25 }, { monsterHp: 400 });
  a.seat().traits = [];
  const spray = a.any.markedSpell(a.seat(), SPELLS.thorn_spray);
  check(spray.spread.count === SPELLS.thorn_spray.spread!.count + 2 * THISTLE.count && Math.abs(spray.damage - SPELLS.thorn_spray.damage! * 1.3) < 1e-6, `leque ${JSON.stringify(spray.spread)}`);
  check(spray.rootMs === THISTLE.rootMs && spray.dot.kind === "poison", "prende e envenena");
  const first = a.place("lizardfolk", 1, 0);
  const second = a.place("lizardfolk", 2, 0);
  a.any.root(first, a.brain(first), a.now() + 60000);
  a.any.root(second, a.brain(second), a.now() + 60000);
  const hp = second.hp;
  a.choose("thorn_spray");
  a.ready();
  a.cast(0, { x: second.x + 2, y: second.y });
  a.advance(1000);
  check(second.hp < hp && a.brain(second).dot?.kind === "poison", `o espinho atravessou: ${hp} → ${second.hp}`);
});
test("Espinheiro Antigo: +75% e +1 pulso, raio 1, a raiz fica, o veneno renova e prende quem está colado", () => {
  const thorn = (gift: boolean) => {
    const a = markArena("druid", gift ? { ancient_bramble: 25 } : {}, { monsterHp: 2000 });
    a.seat().traits = [];
    const m = a.place("lizardfolk", 2, 0);
    const side = a.place("lizardfolk", 2, 1);
    const b = a.brain(m);
    a.any.root(m, b, a.now() + 5000);
    b.dot = { amount: 10, nextAt: a.now() + 1000, until: a.now() + 500, attacker: HERO, source: "venom_thorn", kind: "poison", stacks: 1, perStack: 10 };
    const hp = m.hp;
    const sideHp = side.hp;
    a.any.thornbush(m, b, HERO, a.now(), false);
    return { a, m, b, side, dealt: hp - m.hp, sideDealt: sideHp - side.hp };
  };
  const plain = thorn(false);
  const { a, m, b, side, dealt, sideDealt } = thorn(true);
  const ratio = dealt / plain.dealt;
  const want = ((THORNBUSH.seconds + BRAMBLE.seconds) / THORNBUSH.seconds) * 1.75;
  check(Math.abs(ratio - want) < 0.1, `dano ${plain.dealt} → ${dealt} (${ratio.toFixed(2)}, esperado ${want.toFixed(2)})`);
  check(plain.sideDealt === 0 && sideDealt > 0, `vizinho ${sideDealt}`);
  check(m.rooted && b.rootedUntil >= a.now() + BRAMBLE.rootMs && !plain.m.rooted, "a raiz fica");
  check(b.dot.until >= a.now() + BRAMBLE.poisonMs, "veneno renovado");
  check(a.brain(side).rootedUntil >= a.now() + BRAMBLE.holdMs, "o colado fica preso");
});

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("MARCOS OK");
process.exit(0);
