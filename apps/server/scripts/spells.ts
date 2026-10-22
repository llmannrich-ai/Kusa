/**
 * Teste das magias, sem servidor, numa arena (`arena.ts`: relógio falso, sorteios de seed fixa, monstro posto onde o
 * teste precisa), com um feiticeiro convidado no nível 8 (os dois slots já abertos, só as magias iniciais):
 *   - slot vazio não conjura, magia de outra classe e magia da árvore não comprada não entram no slot;
 *   - a Esfera Sombria no toque rápido sai uma vez (a recarga segura o segundo toque), gasta mana, voa até o alvo e
 *     fere; o ataque básico do feiticeiro é um projétil;
 *   - mirada num ponto fora do alcance, a Esfera cai na borda do alcance (ou na parede, se houver).
 * Uso: npx tsx scripts/spells.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { SPELLS, clampToRange, lineEnd } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

const a = arena({ classId: "sorcerer", allSpells: false });
const p = a.p;
const mine = () => a.spells.filter((s) => s.from === HERO);

// Slot vazio não conjura; magia de outra classe não entra no slot.
a.cast(0);
a.hunt.chooseSpell(HERO, { slot: 1, spellId: "war_cry" });
a.advance(200);
check(mine().length === 0, "conjurou com o slot vazio");
check(!p.spell2, "aceitou magia de outra classe");

// Convidado só conhece as magias iniciais: as da árvore precisam ser compradas no menu.
check([...p.knownSpells].join(",") === "shadow_orb,void_storm", `magias conhecidas: ${[...p.knownSpells]}`);
a.hunt.chooseSpell(HERO, { slot: 0, spellId: "lightning_bolt" });
check(!p.spell1, "aceitou magia da árvore sem comprar");
a.choose("shadow_orb", "void_storm");
check(p.spell1 === "shadow_orb" && p.spell2 === "void_storm", `slots: ${p.spell1}, ${p.spell2}`);

// Toque rápido com um monstro ao alcance (e à vista): sai uma Esfera; o segundo toque cai na recarga.
const range = SPELLS.shadow_orb.range;
const target = a.place("lizardfolk", range - 1, 0);
a.hunt.target(HERO, { id: target.id });
a.hunt.attacking(HERO, { on: true });
const manaBefore = p.mana;
a.cast(0);
a.advance(150);
const manaAfter = p.mana;
a.cast(0); // ainda em recarga: ignorado
a.advance(1200);
const hits = a.hitsFrom(0);
console.log(`magias: ${mine().length}, ataques básicos: ${a.attacks.length}, golpes: ${hits}, mana ${manaBefore} → ${manaAfter}`);
check(mine().length === 1, `esperava 1 magia conjurada (recarga), vieram ${mine().length}`);
check(mine()[0].spellId === "shadow_orb" && mine()[0].ms > 0, "a Esfera Sombria devia voar até o alvo");
check(manaAfter <= manaBefore - SPELLS.shadow_orb.manaCost, `a magia não gastou mana (${manaBefore} → ${manaAfter})`);
check(hits > 0, "a magia não causou dano");
check(a.attacks.some((x) => x.from === HERO && x.ms > 0), "o ataque básico do feiticeiro devia ser um projétil");

// Mira: um ponto longe demais é puxado para a borda do alcance (e para na parede, se houver).
a.advance(SPELLS.shadow_orb.cooldownMs);
a.hunt.attacking(HERO, { on: false });
const far = { x: p.x - 20, y: p.y };
const edge = clampToRange(p.x, p.y, far.x, far.y, range);
const expected = lineEnd(a.d, p.x, p.y, edge.x, edge.y);
const manaAim = p.mana;
a.cast(0, far);
a.advance(200);
const aimed = mine()[1];
check(!!aimed, "a magia mirada não saiu");
console.log(`mirada em ${far.x},${far.y}: caiu em ${aimed.tx},${aimed.ty} (esperado ${expected.x},${expected.y})`);
check(aimed.tx === expected.x && aimed.ty === expected.y, "a magia mirada não caiu no ponto esperado");
check(p.mana < manaAim, "a magia mirada não gastou mana");
console.log("SPELLS OK");
process.exit(0);
