/**
 * Teste das melhorias, sem servidor: a simulação (`Hunt`) roda sozinha, com relógio falso, sorteios de seed fixa e o
 * monstro posto ao lado do herói (`arena.ts`). Antes, um cavaleiro caçava num mapa sorteado até o nível 2, e o teste
 * falhava por azar (morria ou não achava monstro no prazo). Agora um cavaleiro de nível 1 mata ratazanas até o nível 2:
 *   - o nível 2 oferece 2 melhorias diferentes e válidas;
 *   - uma melhoria fora da oferta é recusada;
 *   - escolher uma da oferta aplica (o Vigor aumenta a vida máxima) e fecha a escolha;
 *   - repetir a escolha sem oferta nova não soma de novo;
 *   - subir vários níveis de uma vez enfileira uma melhoria por nível (menos os que abrem slot de magia).
 * A mensagem `MSG.choosePerk` chega na `Hunt` por uma linha do `DungeonRoom`; a rede é coberta pelos testes de fumaça.
 * Uso: npx tsx apps/server/scripts/perks.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { PERK_CHOICES, PERK_IDS, grantsPerk, isPerk, xpForLevel, type PerkId } from "@kusa/shared";
import { HERO, arena, check } from "./arena.ts";

// --- Nível 2: oferta, recusa, escolha -------------------------------------------------------------
/** Arena de um cavaleiro de nível 1 que mata ratazanas (pelo caminho normal da morte, com XP) até o nível 2. */
function level2(seed: number) {
  const a = arena({ classId: "knight", startLevel: 1, allSpells: false, seed });
  const { p } = a;
  check(p.level === 1 && p.perkOffer.length === 0, `o herói devia começar no nível 1 sem oferta (nível ${p.level})`);
  for (let i = 0; p.level < 2; i++) {
    check(i < 200, `não chegou ao nível 2 depois de ${i} ratazanas (xp ${p.xp}) (${a.where()})`);
    a.kill(a.spawn("rat"));
  }
  a.advance(100);
  return a;
}

{
  // A oferta é sorteada: a primeira seed (a partir da 4242, sempre a mesma) que oferece o Vigor, que dá para conferir
  // na vida máxima.
  let a = level2(4242);
  for (let seed = 4243; !a.p.perkOffer.includes("vigor"); seed++) {
    check(seed < 4342, "nenhuma seed de 4242 a 4341 ofereceu o Vigor");
    a = level2(seed);
  }
  const { p, hunt } = a;

  const offer = [...p.perkOffer] as string[];
  console.log(`nível ${p.level}: oferta ${offer.join(", ")}`);
  check(offer.length === PERK_CHOICES, `esperava ${PERK_CHOICES} melhorias, vieram ${offer.length}`);
  check(new Set(offer).size === offer.length && offer.every(isPerk), `oferta repetida ou inválida: ${offer.join(", ")}`);

  // Fora da oferta: recusada.
  const outside = PERK_IDS.find((id) => !offer.includes(id))!;
  hunt.choosePerk(HERO, { perk: outside });
  check(p.perks.size === 0, `aceitou a melhoria ${outside}, fora da oferta`);

  // Da oferta: aplicada.
  const pick: PerkId = "vigor";
  const maxHp = p.maxHp;
  hunt.choosePerk(HERO, { perk: pick });
  check(p.perks.get(pick) === 1, `a melhoria ${pick} não foi aplicada`);
  check(p.perkOffer.length === 0 && p.perksQueued === 0, `a escolha não fechou (oferta ${[...p.perkOffer].join(", ")})`);
  check(p.maxHp > maxHp, `Vigor não aumentou a vida: ${maxHp} → ${p.maxHp}`);
  console.log(`escolheu ${pick}: vida máxima ${maxHp} → ${p.maxHp}`);

  // Repetir a escolha sem oferta nova não soma de novo.
  hunt.choosePerk(HERO, { perk: pick });
  check(p.perks.get(pick) === 1, `somou ${pick} sem oferta (${p.perks.get(pick)})`);
}

// --- Vários níveis de uma vez: uma melhoria por nível, na fila ------------------------------------
{
  const a = arena({ classId: "knight", startLevel: 1, allSpells: false });
  const { p, hunt, any } = a;
  const target = 6;
  any.gainXp(HERO, xpForLevel(target) - p.xp);
  check(p.level === target, `esperava o nível ${target} de uma vez, ficou no ${p.level}`);
  let expected = 0;
  for (let l = 2; l <= target; l++) if (grantsPerk(l)) expected++;
  check(p.perkOffer.length === PERK_CHOICES, `sem oferta depois de subir ao nível ${target}`);
  check(p.perksQueued === expected - 1, `esperava ${expected - 1} melhoria(s) na fila, vieram ${p.perksQueued}`);
  for (let n = 0; n < expected; n++) {
    check(p.perkOffer.length === PERK_CHOICES, `a ${n + 1}ª melhoria da fila não foi oferecida`);
    hunt.choosePerk(HERO, { perk: p.perkOffer[0] as PerkId });
  }
  const total = [...p.perks.values()].reduce((s, v) => s + v, 0);
  check(total === expected && p.perkOffer.length === 0 && p.perksQueued === 0, `escolheu ${total} de ${expected} e a fila não esvaziou`);
  console.log(`nível 1 → ${target} de uma vez: ${expected} melhorias, uma por vez`);
}

console.log("PERKS OK");
process.exit(0);
