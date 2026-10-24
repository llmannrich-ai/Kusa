/**
 * Runas de magia em heróis de outra classe: para cada runa de magia e cada classe que não é a dona da magia,
 * o herói equipa a runa, escolhe a magia no slot dela e conjura. Confere que a magia saiu (mensagem, recarga,
 * mana limitada a 40% da máxima) e o efeito principal (anda, fere, cura, invoca, cria o campo).
 * Roda a `Hunt` direto (arena: relógio falso, seed fixa), sem servidor.
 * Uso: npx tsx apps/server/scripts/runasmagia.ts
 */
import { CLASSES, RUNES, SPELLS, spellManaCost, tileDistance, type ClassId } from "@kusa/shared";
import { arena, HERO } from "./arena.ts";

const failures: string[] = [];
let passed = 0;

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

for (const rune of Object.values(RUNES).filter((r) => r.spell)) {
  const spell = SPELLS[rune.spell!];
  const slot = spell.slot;
  for (const classId of (Object.keys(CLASSES) as ClassId[]).filter((c) => c !== spell.classId)) {
    const name = `${rune.name} no ${CLASSES[classId].name}`;
    const a = arena({ classId, allSpells: false, monsterHp: 20, runes: [rune.id] });
    try {
      check([...a.p.runes].includes(rune.id), "a runa não entrou equipada");
      a.hunt.chooseSpell(HERO, { slot, spellId: spell.id });
      check((slot === 0 ? a.p.spell1 : a.p.spell2) === spell.id, "a magia não entrou na escolha do slot");
      const m = a.spawn("lizardfolk", 3);
      a.ready();
      a.p.hp = Math.floor(a.p.maxHp / 2);
      const before = { x: a.p.x, y: a.p.y, hp: a.p.hp, mana: a.p.mana, monster: m.hp };
      const cost = spellManaCost(spell, classId, a.p.maxMana);
      check(cost <= Math.ceil(a.p.maxMana * 0.4), `custa ${cost} de mana (máx. ${a.p.maxMana})`);

      if (spell.dash) a.cast(slot, { x: a.p.x - 3, y: a.p.y });
      else if (spell.aim === "target") a.cast(slot, m);
      else a.cast(slot);
      check(a.spells.some((s) => s.spellId === spell.id && s.from === HERO), "a magia não saiu");
      check(a.seat().spellReadyAt[slot] > a.now(), "a magia saiu sem recarga");
      check(a.p.mana <= before.mana - cost + 1, `gastou ${before.mana - a.p.mana} de mana (devia ${cost})`);
      a.advance(2500);

      if (spell.dash || spell.charge) check(a.p.x !== before.x || a.p.y !== before.y, "o herói não saiu do lugar");
      if (spell.charge) check(tileDistance(a.p.x, a.p.y, m.x, m.y) <= 1, "a Investida não chegou ao monstro");
      if (spell.damage > 0 || spell.dot) check(m.hp < before.monster, "o monstro não perdeu vida");
      if (spell.heal) check(a.p.hp > before.hp, "o herói não se curou");
      if (spell.summon) check([...a.state.summons.values()].some((s) => s.owner === HERO), "nada foi invocado");
      if (spell.field) check([...a.state.fields.values()].length > 0, "o campo não apareceu");
      passed++;
    } catch (err) {
      failures.push(`${name}: ${(err as Error).message} (${a.where()})`);
      console.log(`  ✘ ${name}: ${(err as Error).message}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} falha(s):\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`RUNAS DE MAGIA OK (${passed} combinações de runa e classe)`);
process.exit(0);
