/**
 * Teste das habilidades especiais (só mini-bosses e bosses), sem servidor.
 *
 * 1. Regras: mini-bosses e bosses têm uma habilidade forte; golpe forte tem recarga longa; controle não passa de
 *    2 s; `abilityTiles` dá áreas determinísticas, sem paredes e do tamanho certo (faixa e leque na direção do alvo,
 *    área em volta do alvo ou do monstro).
 * 2. Na hunt, numa arena (`arena.ts`: relógio falso, sorteios de seed fixa): cada mini-boss e boss, colado num
 *    cavaleiro que não revida, solta um golpe especial com área e dano, que sai sem aviso (`MSG.monsterStrike`) e
 *    acerta com `special`.
 * Uso: npx tsx scripts/specials.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { MAP_IDS, MONSTERS, abilityTiles, blocksSight, centerOf, generateDungeon, tileDistance, type MonsterKind } from "@kusa/shared";
import { arena, check } from "./arena.ts";

/** Formas sem área para conferir: somem, chamam ajuda, mergulham, puxam ou disparam um raio. */
const NO_AREA: string[] = ["vanish", "summon", "dive", "pull", "bolt"];

// --- 1. Regras -----------------------------------------------------------------

for (const mapId of MAP_IDS) {
  const d = generateDungeon(1234, mapId);
  const c = centerOf(d.boss);
  for (const kind of Object.keys(MONSTERS) as MonsterKind[]) {
    const { rank, abilities = [] } = MONSTERS[kind];
    // Mini-boss e boss: um golpe forte ou um controle (o Cubo engole).
    if (rank !== "common" && !abilities.some((a) => a.power > 1 || a.effect)) throw new Error(`${kind}: ${rank} sem habilidade forte`);
    const ids = new Set(abilities.map((a) => a.id));
    if (ids.size !== abilities.length) throw new Error(`${kind}: habilidades com id repetido`);
    for (const ability of abilities) {
      const name = `${kind}.${ability.id}`;
      if (ability.phase && ability.belowHp === undefined) throw new Error(`${name}: troca de fase sem vida da fase`);
      if ((ability.minRange ?? 0) > ability.range) throw new Error(`${name}: alcance mínimo maior que o máximo`);
      if (ability.power >= 2 && ability.cooldownMs < 6000) throw new Error(`${name}: golpe forte com recarga curta demais`);
      if (ability.effect && ["root", "stun", "engulf", "blind"].includes(ability.effect.kind) && ability.effect.ms > 2000) {
        throw new Error(`${name}: controle passa do teto de 2 s`);
      }
      if (NO_AREA.includes(ability.shape)) continue;
      const target = { x: c.x + Math.max(1, Math.min(2, ability.range)), y: c.y };
      const tiles = abilityTiles(d, ability, c.x, c.y, target.x, target.y);
      const again = abilityTiles(d, ability, c.x, c.y, target.x, target.y);
      if (JSON.stringify(tiles) !== JSON.stringify(again)) throw new Error(`${name}: área não determinística`);
      // Sem dano nem efeito (o salto do Orc, o Rejuvenescer): não tem área para conferir.
      if (ability.power === 0 && !ability.effect) continue;
      if (tiles.length === 0) throw new Error(`${name}: área vazia no centro da sala do boss (${mapId})`);
      if (tiles.some((t) => blocksSight(d, t.x, t.y))) throw new Error(`${name}: área atravessa parede`);
      if (tiles.some((t) => t.x === c.x && t.y === c.y)) throw new Error(`${name}: o monstro se acerta`);
      if (ability.shape === "line") {
        if (tiles.some((t) => t.x <= c.x || t.x > c.x + ability.length!)) throw new Error(`${name}: faixa fora da direção do alvo`);
        if (tiles.some((t) => Math.abs(t.y - c.y) > ability.radius)) throw new Error(`${name}: faixa larga demais`);
      } else if (ability.shape === "cone") {
        if (tiles.some((t) => t.x <= c.x)) throw new Error(`${name}: leque para trás`);
        if (tiles.some((t) => tileDistance(c.x, c.y, t.x, t.y) > ability.length!)) throw new Error(`${name}: leque longo demais`);
      } else {
        const cx = ability.shape === "self" ? c.x : target.x;
        if (tiles.some((t) => tileDistance(cx, c.y, t.x, t.y) > ability.radius)) throw new Error(`${name}: área maior que o raio`);
        if (ability.shape === "target" && !tiles.some((t) => t.x === target.x && t.y === target.y)) throw new Error(`${name}: área não pega o alvo`);
      }
    }
  }
}
console.log("regras das habilidades OK");

// --- 2. Na hunt ----------------------------------------------------------------

for (const kind of Object.keys(MONSTERS) as MonsterKind[]) {
  if (MONSTERS[kind].rank === "common") continue;
  // Golpe com área e dano: o mergulho, a invocação e os efeitos sem dano (a Escuridão que só cega) não servem para
  // conferir área e acerto; o monstro usa as habilidades na ordem que o sorteio der, então espera um golpe que sirva.
  const harmful = new Set(MONSTERS[kind].abilities!.filter((x) => x.power > 0 && !NO_AREA.includes(x.shape)).map((x) => x.id));
  check(harmful.size > 0, `${kind}: nenhuma habilidade especial com área e dano`);
  const a = arena({ classId: "knight" });
  a.p.hp = a.p.maxHp = 1_000_000;
  const m = a.place(kind, 1, 0);
  const strike = () => a.strikes.find((s) => s.id === m.id && harmful.has(s.ability));
  a.until(() => !!strike(), 60_000, `${kind}: não usou golpe especial com área e dano em 60 s (usou: ${a.strikes.filter((s) => s.id === m.id).map((s) => s.ability).join(", ") || "nenhum"})`);
  const s = strike()!;
  const name = MONSTERS[kind].abilities!.find((x) => x.id === s.ability)?.name ?? s.ability;
  const hits = () => a.damage.filter((d) => d.toPlayer && d.special && d.attacker === m.id && d.ability === s.ability);
  a.until(() => hits().length > 0, 2000, `${kind}: o golpe especial (${name}) não acertou o cavaleiro colado`);
  check(s.tiles.length > 0, `${kind}: golpe especial (${name}) sem área`);
  console.log(`${kind}: ${name}, ${s.tiles.length / 2} tiles, -${hits()[0].amount}`);
}

console.log("SPECIALS OK");
process.exit(0);
