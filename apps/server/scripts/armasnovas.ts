/**
 * Teste das armas de estilo (uma por classe, `ITEM_FAMILIES` em packages/shared/src/items.ts), sem servidor:
 * - catálogo: as 5 famílias existem em todo material e raridade, só na classe dela, com o traço;
 * - drop: com a equipe (`rollItem` com classes), metade dos drops sai do que ela veste; sem equipe, nada muda;
 * - na arena (`arena.ts`: relógio falso, sorteios de seed fixa), o traço de cada uma no ataque básico:
 *   - a Maça atordoa o alvo;
 *   - a Lança atravessa e acerta o monstro de trás;
 *   - o Orbe alcança mais longe e o tiro chega antes;
 *   - a Foice corta em arco o monstro colado no alvo;
 *   - o Totem de mão cura o aliado ferido por perto.
 * Os monstros ficam parados (atordoados por muito tempo) onde o teste precisa, menos no da maça.
 * Uso: npx tsx apps/server/scripts/armasnovas.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  ITEMS, ITEM_RARITIES, ITEM_TIERS, LEGENDARY_IDS, canUse, createRng, itemId, rollItem, type ClassId, type ItemStats, type MonsterKind,
} from "@kusa/shared";
import { HERO, arena, check, type Arena } from "./arena.ts";

const failures: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

const FAMILIES: [string, ClassId, keyof ItemStats][] = [
  ["mace", "knight", "bash"], ["spear", "paladin", "pierce"], ["orb", "sorcerer", "shotSpeed"], ["scythe", "druid", "cleave"], ["totem", "shaman", "mend"],
];
const TARGET: MonsterKind = "lizardfolk";

console.log("catálogo:");
test("5 famílias em todo material e raridade, só na classe dela, com o traço", () => {
  for (const [key, classId, trait] of FAMILIES) {
    for (const tier of ITEM_TIERS) for (const rarity of ITEM_RARITIES) {
      const id = itemId("weapon", key, tier, rarity);
      const def = ITEMS[id];
      check(!!def, `${id} não existe`);
      check(canUse(id, classId) && def.classes?.length === 1, `${id} devia ser só do ${classId}`);
      check(((def.stats[trait] as number | undefined) ?? 0) > 0, `${id} sem o traço ${trait}`);
    }
  }
});

console.log("drop:");
test("com a equipe, metade dos drops sai do que ela veste", () => {
  const share = (classes: ClassId[]) => {
    const random = createRng(77).next;
    let weapons = 0, usable = 0;
    for (let i = 0; i < 6000; i++) {
      const id = rollItem("common", 4, random, 0, classes);
      if (ITEMS[id].slot !== "weapon") continue;
      weapons++;
      if (canUse(id, "shaman")) usable++;
    }
    return usable / weapons;
  };
  const free = share([]), team = share(["shaman"]);
  // Livre: 3 das 11 armas servem ao xamã (varinha, cajado, totem); com o favor, metade dos sorteios sai só delas.
  check(free > 0.2 && free < 0.36, `sem equipe, ${Math.round(free * 100)}% das armas serviam ao xamã`);
  check(team > 0.55 && team < 0.75, `com o xamã na equipe, ${Math.round(team * 100)}% das armas servem a ele`);
});
test("o lendário do favor é de quem está na equipe", () => {
  // Sorteios: favor, nível de sorte, slot, família, raridade (na faixa do lendário) e qual peça.
  for (const pick of [0, 0.5, 0.99]) {
    const v = [0.1, 0.9, 0.1, 0.1, 0.001, pick];
    let i = 0;
    const id = rollItem("boss", 4, () => v[i++] ?? 0.5, 0, ["druid"]);
    check(LEGENDARY_IDS.includes(id) && canUse(id, "druid"), `${id} não é um lendário que o druida veste`);
  }
});

console.log("na arena:");
function wear(a: Arena, id: string) {
  (a.p as unknown as Record<string, string>).weapon = id;
  a.any.refreshGear(HERO);
}
/** Monstro parado no tile (dx, dy) do herói: atordoado por muito tempo, para o golpe achar ele onde o teste pôs. */
function frozen(a: Arena, dx: number, dy: number, from?: { x: number; y: number }) {
  const m = a.place(TARGET, dx, dy, from);
  a.brain(m).stunnedUntil = 1e12;
  return m;
}
const attack = (a: Arena) => a.hunt.attacking(HERO, { on: true });

test("Maça atordoa o alvo", () => {
  const a = arena({ classId: "knight", monsterHp: 50 });
  wear(a, itemId("weapon", "mace", 5, "magic"));
  a.seat().gear.bash = 1;
  const m = a.place(TARGET, 1, 0);
  attack(a);
  a.until(() => (a.seat().stats.weaponTraits.bash ?? 0) > 0, 4000, "a maça não atordoou");
  check(a.brain(m).stunnedUntil > a.now(), "o alvo devia estar atordoado");
});

test("Lança atravessa e acerta o monstro de trás", () => {
  const a = arena({ classId: "paladin", monsterHp: 50 });
  wear(a, itemId("weapon", "spear", 3));
  const front = frozen(a, 2, 0);
  const back = frozen(a, 3, 0);
  attack(a);
  a.until(() => back.hp < back.maxHp, 5000, "o monstro de trás não apanhou");
  check(front.hp < front.maxHp, "o da frente devia apanhar primeiro");
  check((a.seat().stats.weaponTraits.pierce ?? 0) > 0, "a telemetria não contou o tiro que atravessou");
});

test("Orbe alcança mais longe e o tiro chega antes", () => {
  const shot = (orb: boolean) => {
    const a = arena({ classId: "sorcerer", monsterHp: 50 });
    if (orb) wear(a, itemId("weapon", "orb", 2));
    frozen(a, 3, 0);
    attack(a);
    a.until(() => a.attacks.some((x) => x.from === HERO), 4000, "o feiticeiro não atirou");
    return { ms: a.attacks.find((x) => x.from === HERO)!.ms, range: a.p.basicRange };
  };
  const plain = shot(false), orb = shot(true);
  check(orb.range === plain.range + 1, `alcance ${orb.range}, devia ser ${plain.range + 1}`);
  check(orb.ms < plain.ms, `o tiro do orbe devia chegar antes (${orb.ms} × ${plain.ms} ms)`);
});

test("Foice corta em arco o colado no alvo", () => {
  const a = arena({ classId: "druid", monsterHp: 50 });
  wear(a, itemId("weapon", "scythe", 3));
  const target = frozen(a, 3, 0);
  const side = frozen(a, 3, 1);
  attack(a);
  a.hunt.target(HERO, { id: target.id });
  a.until(() => side.hp < side.maxHp && target.hp < target.maxHp, 5000, "o colado no alvo não apanhou");
  check((a.seat().stats.weaponTraits.cleave ?? 0) > 0, "a telemetria não contou o corte em arco");
});

test("Totem de mão cura o aliado ferido por perto", () => {
  const a = arena({ classId: "shaman", monsterHp: 50, allies: [{ classId: "knight", bot: true }] });
  wear(a, itemId("weapon", "totem", 5, "magic"));
  const ally = a.state.players.get("h2")!;
  ally.hp = Math.round(ally.maxHp / 2);
  const before = ally.hp;
  frozen(a, -3, 0);
  attack(a);
  a.until(() => (a.seat().stats.weaponTraits.mend ?? 0) > 0, 5000, "o totem não curou ninguém");
  check(ally.hp > before, `o aliado devia ter sido curado (${before} → ${ally.hp})`);
});

if (failures.length) {
  console.error(`FALHOU:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("OK: armas de estilo no catálogo, no drop e no ataque básico.");
