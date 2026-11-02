/**
 * Teste dos itens lendários (`LEGENDARIES` em packages/shared/src/items.ts), sem servidor:
 * - catálogo: toda peça é única, de Dragão, com história, e mais forte que o mágico de Dragão da família em cada
 *   atributo que os dois têm; as magias que ela fortalece são de uma classe que pode vesti-la; toda classe tem ao menos
 *   uma peça que fortalece magias; as duas artes (antiga e nova) desenham todas;
 * - drop: o sorteio (`rollItem`) dá um lendário quando cai na faixa dele e nunca fora dela;
 * - na arena (`arena.ts`: relógio falso, sorteios de seed fixa), com a peça vestida:
 *   - a Lança de Gelo com o Cajado da Geada Eterna bate mais forte, na conta da força extra (mesma seed, com e sem);
 *   - o Lobo Espiritual do Cajado do Carvalho que Sonha nasce mais forte;
 *   - a Coroa do Olho Tempestuoso encurta a recarga das magias;
 *   - a telemetria conta a magia lançada com a força do item (`gearBoostedCasts`).
 * Uso: npx tsx apps/server/scripts/lendarios.ts (de dentro de apps/server, pelos decorators do schema)
 */
import {
  CLASS_IDS, ITEMS, ITEM_FAMILIES, LEGENDARIES, LEGENDARY_IDS, MAX_TIER, RARITY_CHANCES, SPELLS, canUse, gearStats,
  heroBonuses, itemId, rollItem, spellCooldownMs, type ItemStats, type SpellId,
} from "@kusa/shared";
import { LEGEND_KEYS } from "../../client/src/art/hero/legend.ts";
import { PROTO_LEGENDS } from "../../client/src/art/proto/tibiaHero.ts";
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

console.log("catálogo:");
test("peças únicas, de Dragão e com história", () => {
  check(new Set(LEGENDARIES.map((l) => l.key)).size === LEGENDARIES.length, "chave repetida");
  check(LEGENDARY_IDS.length >= 16, `poucos lendários (${LEGENDARY_IDS.length})`);
  for (const id of LEGENDARY_IDS) {
    const def = ITEMS[id];
    check(!!def && def.rarity === "legendary" && def.tier === MAX_TIER, `${id} não está no catálogo como lendário de Dragão`);
    check(!!def.lore && def.lore.length > 20, `${id} sem história`);
    check(!def.legend!.includes("-"), `${id}: a chave não pode ter hífen (o banco lê o id por partes)`);
    check(id.split("-")[0] === def.slot && id.split("-")[3] === "legendary", `${id}: id fora do padrão slot-família-nível-raridade-chave`);
  }
});
test("mais fortes que o mágico de Dragão da família", () => {
  for (const id of LEGENDARY_IDS) {
    const def = ITEMS[id];
    const f = ITEM_FAMILIES[def.family];
    const magic = ITEMS[itemId(f.slot, f.key, MAX_TIER, "magic")];
    for (const [k, v] of Object.entries(magic.stats) as [keyof ItemStats, number][]) {
      if (k === "spells" || k === "haste") continue;
      const mine = (def.stats[k] as number | undefined) ?? 0;
      // Propriedade mágica que o lendário troca por outra (ex.: espinhos por roubo de vida) não conta; o atributo da família, sim.
      if (f.base(MAX_TIER)[k] !== undefined) check(mine > v, `${def.name}: ${k} ${mine} não passa o mágico (${v})`);
    }
    const extras = Object.keys(def.stats).length + Object.keys(def.stats.spells ?? {}).length;
    check(extras > Object.keys(magic.stats).length, `${def.name}: devia ter mais propriedades que o mágico`);
  }
});
test("magias fortalecidas são de quem veste, e toda classe tem uma peça assim", () => {
  const classesWithSpellItem = new Set<string>();
  for (const id of LEGENDARY_IDS) {
    const def = ITEMS[id];
    for (const spellId of Object.keys(def.stats.spells ?? {}) as SpellId[]) {
      const spell = SPELLS[spellId];
      check(!!spell, `${def.name}: magia ${spellId} não existe`);
      check(canUse(id, spell.classId), `${def.name}: ${spell.name} é do ${spell.classId}, que não veste a peça`);
      classesWithSpellItem.add(spell.classId);
    }
  }
  for (const c of CLASS_IDS) check(classesWithSpellItem.has(c), `nenhum lendário fortalece magias do ${c}`);
});
test("as duas artes desenham todos", () => {
  for (const l of LEGENDARIES) {
    check(LEGEND_KEYS.includes(l.key), `${l.name} sem cores na arte antiga (art/hero/legend.ts)`);
    check(PROTO_LEGENDS.includes(l.key), `${l.name} sem desenho na arte nova (LEGEND_LOOKS em tibiaHero.ts)`);
  }
});

console.log("drop:");
test("rollItem dá lendário só na faixa dele", () => {
  for (const rank of ["common", "miniboss", "boss"] as const) {
    const chance = RARITY_CHANCES[rank].legendary;
    // Sorteios: nível de sorte, slot, família, raridade e (no lendário) qual peça.
    const seq = (roll: number) => { const v = [0.9, 0.1, 0.1, roll, 0.5]; let i = 0; return () => v[i++] ?? 0.5; };
    check(ITEMS[rollItem(rank, 4, seq(chance * 0.5))].rarity === "legendary", `${rank}: dentro da faixa não saiu lendário`);
    check(ITEMS[rollItem(rank, 4, seq(chance + 0.001))].rarity === "magic", `${rank}: logo depois da faixa devia ser mágico`);
  }
});

console.log("na arena:");
/** Veste o item no herói e recalcula o equipamento como na hunt. */
function wear(a: Arena, id: string) {
  const def = ITEMS[id];
  (a.p as unknown as Record<string, string>)[def.slot] = id;
  a.any.refreshGear(HERO);
}
/** Dano que o herói deu em monstros a partir da posição `from` da lista. */
const dealt = (a: Arena, from: number) => a.damage.slice(from).filter((d) => d.attacker === HERO && !d.toPlayer).reduce((s, d) => s + d.amount, 0);

test("Lança de Gelo mais forte com o Cajado da Geada Eterna", () => {
  const staff = LEGENDARY_IDS.find((id) => ITEMS[id].legend === "frost")!;
  const run = (boost: boolean) => {
    const a = arena({ classId: "sorcerer", monsterHp: 50 });
    wear(a, staff);
    if (!boost) a.seat().gear.spells = {};
    a.choose("ice_lance");
    const m = a.spawn("lizardfolk", 3);
    const from = a.damage.length;
    a.cast(0, m);
    a.until(() => dealt(a, from) > 0, 3000, "a Lança de Gelo não acertou");
    return { a, hit: dealt(a, from) };
  };
  const on = run(true), off = run(false);
  const b = on.a.p.spellBonus.get("ice_lance") ?? 0;
  const expected = (1 + b + ITEMS[staff].stats.spells!.ice_lance!) / (1 + b);
  const ratio = on.hit / off.hit;
  check(Math.abs(ratio - expected) < 0.05, `razão do dano ${ratio.toFixed(3)}, esperado ${expected.toFixed(3)} (${on.hit} × ${off.hit})`);
  check(on.a.seat().stats.gearBoostedCasts.ice_lance === 1, "a telemetria não contou a magia com a força do item");
  check(!off.a.seat().stats.gearBoostedCasts.ice_lance, "sem a força do item, a telemetria não devia contar");
});

test("Lobo Espiritual mais forte com o Cajado do Carvalho que Sonha", () => {
  const staff = LEGENDARY_IDS.find((id) => ITEMS[id].legend === "dreamoak")!;
  const wolf = (boost: boolean) => {
    const a = arena({ classId: "druid", monsterHp: 50 });
    wear(a, staff);
    if (!boost) a.seat().gear.spells = {};
    a.choose("spirit_wolf");
    a.spawn("lizardfolk", 3);
    a.cast(0);
    a.until(() => [...a.state.summons.values()].some((s) => s.owner === HERO), 3000, "o lobo não apareceu");
    return [...a.state.summons.values()].find((s) => s.owner === HERO)!;
  };
  const on = wolf(true), off = wolf(false);
  check(on.maxHp > off.maxHp, `o lobo devia ter mais vida com o cajado (${on.maxHp} × ${off.maxHp})`);
});

test("Coroa do Olho Tempestuoso encurta a recarga", () => {
  const crown = LEGENDARY_IDS.find((id) => ITEMS[id].legend === "stormeye")!;
  const a = arena({ classId: "sorcerer", monsterHp: 50 });
  wear(a, crown);
  check(gearStats([crown]).cooldown === 0.1, "a coroa devia ter 10% de recarga");
  a.choose("lightning_bolt");
  const m = a.spawn("lizardfolk", 3);
  a.cast(0, m);
  const left = a.seat().spellReadyAt[0] - a.now();
  const expected = spellCooldownMs(SPELLS.lightning_bolt.cooldownMs, heroBonuses({}), 0.1);
  check(left === expected && expected < SPELLS.lightning_bolt.cooldownMs, `recarga ${left} ms, esperado ${expected} (sem a coroa: ${SPELLS.lightning_bolt.cooldownMs})`);
});

if (failures.length) {
  console.error(`FALHOU:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("OK: lendários no catálogo, no drop, na arte e na hunt.");
