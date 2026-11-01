/**
 * Teste dos marcos dos Dons (Grimório 4.0, fase 4a-2; `packages/shared/src/gifts.ts`), sem servidor (`arena.ts`):
 *   - regras: um marco a cada 5 níveis, 5 por Dom, texto em cada um;
 *   - Cavaleiro: Fio Temperado (série que sangra e corta em leque), Couro Curtido (escudos, lentidão, vida, quebra),
 *     Voz de Comando (alcance, velocidade, socorro), Último Duelo (limiar, roubo de vida, recarga do slot 3),
 *     Pedra Fundamental (regeneração, provocação, armadura, corte nos colados) e Estandarte Vivo (raio, armadura,
 *     cura ao matar, corte de dano depois do slot 3).
 * Uso: npx tsx scripts/marcos.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  ALLY_DAMAGE_RADIUS, BANNER, BANNER_RADIUS, CLASS_IDS, GIFTS, GIFT_MILESTONES, HIDE, VOICE, giftMilestones, sumGifts,
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

console.log(`\n${passed} ok, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("MARCOS OK");
process.exit(0);
