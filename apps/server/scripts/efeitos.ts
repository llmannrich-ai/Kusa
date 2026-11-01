/**
 * Teste dos efeitos das magias, sem servidor: a simulação (`Hunt`) roda sozinha, com relógio falso, sorteios de seed
 * fixa e o monstro posto onde o teste precisa (`arena.ts`). Herói no nível 8 com o Grimório inteiro e monstros com
 * 20× a vida (aguentam a magia e o efeito aparece neles):
 *   - o Espinho Venenoso continua ferindo sozinho (dano contínuo, um pulso por segundo);
 *   - a Nevasca deixa os monstros lentos;
 *   - o Raio em Cadeia salta do alvo para outro monstro;
 *   - ramo Mira do Paladino (especializações): a Marca do Caçador marca o alvo, o Rolamento afasta o herói do monstro
 *     (sem cair no portal), a Aljava Veloz deixa as flechas mais rápidas e a Postura do Atirador fica ativa no herói;
 *   - ramos Luz e Batedor do Paladino: o Escudo da Luz (toque rápido, sozinho) protege o próprio herói, o Solo
 *     Consagrado vira um campo que fere, a Flecha Relâmpago salta, a Barragem acerta, a Armadilha de Urso prende o
 *     monstro que pisa nela e a estaca do Cordão de Flechas atira sozinha;
 *   - especializações do Feiticeiro: Feixe de Energia e Fúria dos Céus ferem, a Bola de Fogo queima, o Núcleo
 *     Infernal fere, o Cone de Frio deixa lento, a Prisão de Gelo prende, o Passo Nebuloso teleporta, a Muralha
 *     Mágica sobe, a Morte Súbita fere, os esqueletos erguidos aparecem, a Rajada Mística empurra e os Tentáculos prendem;
 *   - o Urso Ancestral (como toda criatura) leva só parte do dano nas magias do equipamento;
 *   - especializações do Druida: a Águia Gigante aparece e atordoa, o Grito da Fera chama o lobo da Maestria, as formas de
 *     Pantera (o salto) e de Urso (mais vida e a patada) funcionam, a Cura Distante vira escudo com o Florescer, a semente
 *     do Renascer salva o druida da morte, a Pele de Casca protege, a Chuva Revigorante cai, a Picada da Mamba e a Nuvem
 *     Venenosa envenenam, a Onda Trovejante fere e o Chamar Relâmpago solta raios;
 *   - especializações do Cavaleiro: o Redemoinho gira 3 vezes, a Fúria Berserker fica ativa, a Lâmina Arremessada sangra,
 *     os Mil Cortes repetem, o Bater com Escudo atordoa, a Égide dá escudo, os Espinhos de Ferro devolvem o golpe, a
 *     Fortaleza Viva prende o herói no lugar, a Investida leva o herói até o alvo, o Estandarte sobe, a Corrente de Ferro
 *     puxa o monstro e o Desafio Supremo protege;
 *   - a cratera em chamas do Meteoro (Maestria).
 * Cada caso roda numa arena nova; no fim, a lista do que falhou (com a seed e a posição para reproduzir).
 * Uso: npx tsx apps/server/scripts/efeitos.ts (de dentro de apps/server, pelos decorators do schema)
 */
import { SUMMON_SPELL_POWER_SHARE, Tile, hasLineOfSight, tileAt, tileDistance, type ClassId, type MonsterKind } from "@kusa/shared";
import { HERO, arena, check, type ArenaOptions } from "./arena.ts";

/** Alvo padrão: humanoide parrudo, sem fuga nem salto, pega veneno e sangramento. */
const TARGET: MonsterKind = "lizardfolk";

const failures: string[] = [];
let passed = 0;

function test(name: string, classId: ClassId, fn: (a: ReturnType<typeof arena>) => void, options: ArenaOptions = {}) {
  const a = arena({ classId, monsterHp: 20, ...options });
  try {
    fn(a);
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${(err as Error).message}`);
    console.log(`  ✘ ${name}: ${(err as Error).message}`);
  }
}

const fieldOf = (a: ReturnType<typeof arena>, ok: (f: any) => boolean) => [...a.state.fields.values()].some(ok);
const anyMonster = (a: ReturnType<typeof arena>, ok: (m: any) => boolean) => [...a.state.monsters.values()].some(ok);
const mine = (a: ReturnType<typeof arena>, kind: string) => [...a.state.summons.values()].filter((s) => s.owner === HERO && s.kind === kind);
const castsOf = (a: ReturnType<typeof arena>, spellId: string) => a.spells.filter((s) => s.spellId === spellId);

// --- Druida, Feiticeiro: dano contínuo, lentidão e cadeia -------------------------------
console.log("básicos:");
test("Espinho Venenoso envenena e fere sozinho", "druid", (a) => {
  a.choose("venom_thorn");
  const m = a.spawn(TARGET, 3);
  check(m.maxHp >= 300, `a vida dos monstros devia estar 20× maior (${m.maxHp})`);
  a.cast(0, m);
  a.until(() => m.dot === "poison", 3000, "o espinho não envenenou o alvo");
  const before = m.hp;
  a.advance(2300);
  check(m.hp < before, `o veneno não tirou vida do alvo (${before} → ${m.hp})`);
});
test("Nevasca deixa lento", "sorcerer", (a) => {
  a.choose("chain_lightning", "blizzard");
  const m = a.spawn(TARGET, 3);
  a.cast(1, { x: m.x, y: m.y });
  a.until(() => anyMonster(a, (x) => x.slowed), 3000, "a Nevasca não deixou ninguém lento");
});
test("Raio em Cadeia salta", "sorcerer", (a) => {
  a.choose("chain_lightning");
  const m = a.place(TARGET, 3, 0);
  a.place(TARGET, 0, 1, m);
  a.cast(0, m);
  a.until(() => a.chains.length > 0, 3000, "o Raio em Cadeia não saltou");
  const hops = Math.max(...a.chains.map((c) => c.points.length));
  check(hops >= 2, `a cadeia devia ter ao menos 2 pontos (${hops})`);
});

// --- Paladino ---------------------------------------------------------------------------
console.log("paladino:");
test("Marca do Caçador marca o alvo", "paladin", (a) => {
  a.choose("hunter_mark", "swift_quiver");
  const m = a.spawn(TARGET, 4);
  a.cast(0, m);
  a.until(() => m.marked, 3000, "a Marca do Caçador não marcou o alvo");
});
test("Aljava Veloz deixa as flechas mais rápidas", "paladin", (a) => {
  a.choose("hunter_mark", "swift_quiver");
  const m = a.spawn(TARGET, 3);
  a.p.hp = a.p.maxHp = 1_000_000;
  // Sem a aljava, conta as flechas em 4 s; com ela, de novo: devem sair bem mais.
  const shots = () => {
    const from = a.damage.length;
    a.hunt.target(HERO, { id: m.id });
    a.hunt.attacking(HERO, { on: true });
    a.advance(4000);
    a.hunt.attacking(HERO, { on: false });
    return a.hitsFrom(from);
  };
  const slow = shots();
  a.cast(1);
  a.until(() => a.p.buff === "swift_quiver", 2000, "a Aljava Veloz não ficou ativa");
  const fast = shots();
  console.log(`    flechas em 4 s: ${slow} sem a aljava, ${fast} com ela`);
  check(slow >= 2, `o paladino quase não atirou (${slow} flechas em 4 s)`);
  check(fast >= slow * 1.5, `as flechas não ficaram mais rápidas (${slow} → ${fast} em 4 s)`);
});
test("Rolamento afasta do monstro e Postura do Atirador fica ativa", "paladin", (a) => {
  a.choose("evasive_roll", "sniper_stance");
  // Fugindo, o Rolamento fica com o pouso que mais se afasta do monstro: com a reta para trás livre, é o lado
  // oposto; com parede atrás, pode ser de lado (foi o que o job de caos achou, issue #93). O monstro fica no lado
  // cuja reta oposta está livre pelo salto inteiro (até 6 tiles), para conferir que o herói foge para trás.
  // Se a sala não tem esse espaço em volta do herói, ele vai para o tile mais perto que tenha.
  const sideAt = (x: number, y: number) => ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).find(([dx, dy]) =>
    a.free(x + dx, y + dy) && Array.from({ length: 6 }, (_, k) => k + 1).every((k) => a.free(x - k * dx, y - k * dy)));
  const spots = Array.from({ length: 13 * 13 }, (_, i) => ({ x: a.p.x - 6 + (i % 13), y: a.p.y - 6 + Math.floor(i / 13) }))
    .filter((t) => a.free(t.x, t.y))
    .sort((u, v) => tileDistance(u.x, u.y, a.p.x, a.p.y) - tileDistance(v.x, v.y, a.p.x, a.p.y));
  const spot = spots.find((t) => sideAt(t.x, t.y));
  if (!spot) throw new Error(`arena: nenhum lugar com 6 tiles livres atrás do herói (${a.where()})`);
  a.p.x = spot.x;
  a.p.y = spot.y;
  const side = sideAt(spot.x, spot.y)!;
  const m = a.place(TARGET, side[0], side[1]);
  const from = { x: a.p.x, y: a.p.y };
  const start = { x: m.x, y: m.y };
  a.hunt.target(HERO, { id: m.id });
  // Toque rápido: rola para a frente do herói, que está de costas para o monstro.
  a.face({ x: 2 * from.x - start.x, y: 2 * from.y - start.y });
  a.hunt.cast(HERO, { slot: 0 });
  a.until(() => a.p.x !== from.x || a.p.y !== from.y, 2000, `o Rolamento não moveu o herói (avisos: ${a.notices.join(", ")})`);
  check(tileAt(a.d, a.p.x, a.p.y) !== Tile.Portal, "o Rolamento caiu no portal");
  // Para o lado oposto ao do monstro (com espaço livre, não de lado) e longe dele.
  const away = (a.p.x - from.x) * (from.x - start.x) + (a.p.y - from.y) * (from.y - start.y);
  const gap = tileDistance(a.p.x, a.p.y, m.x, m.y);
  check(away > 0, `o Rolamento devia ir para o lado oposto ao monstro (${from.x},${from.y} → ${a.p.x},${a.p.y}, monstro em ${start.x},${start.y})`);
  check(gap >= 3, `o Rolamento devia afastar o herói do monstro (distância ${gap})`);
  a.cast(1);
  a.until(() => a.p.buff === "sniper_stance", 2000, "a Postura do Atirador não ficou ativa");
});
test("Escudo da Luz protege o próprio herói", "paladin", (a) => {
  a.choose("light_shield", "consecrated_ground");
  a.cast(0);
  a.until(() => a.p.barrier > 0, 2000, "o Escudo da Luz não protegeu o herói");
  check(castsOf(a, "light_shield").length > 0, "o Escudo da Luz não saiu");
});
test("Solo Consagrado vira campo e fere", "paladin", (a) => {
  a.choose("light_shield", "consecrated_ground");
  const m = a.spawn(TARGET, 3);
  const from = a.damage.length;
  a.cast(1, { x: m.x, y: m.y });
  a.until(() => fieldOf(a, (f) => f.spellId === "consecrated_ground" && f.kind === "zone"), 2000, "o Solo Consagrado não criou o campo");
  a.until(() => a.hitsFrom(from) > 0, 4000, "o Solo Consagrado não feriu ninguém");
});
test("Armadilha de Urso prende quem pisa", "paladin", (a) => {
  a.choose("bear_trap", "arrow_cordon");
  // A armadilha fica no caminho: o monstro vem até o herói e pisa nela.
  const m = a.place(TARGET, 3, 0);
  a.cast(0, { x: a.p.x + 1, y: a.p.y });
  a.until(() => m.rooted, 6000, "a armadilha não prendeu o monstro");
});
test("estaca do Cordão de Flechas atira sozinha", "paladin", (a) => {
  a.choose("bear_trap", "arrow_cordon");
  a.place(TARGET, 2, 0);
  a.cast(1, { x: a.p.x, y: a.p.y });
  a.until(() => fieldOf(a, (f) => f.kind === "turret"), 2000, "a estaca não apareceu");
  a.until(() => castsOf(a, "arrow_cordon").some((s) => s.echo && (s.x !== s.tx || s.y !== s.ty)), 5000, "a estaca não atirou");
});
test("Barragem acerta", "paladin", (a) => {
  a.choose("lightning_arrow", "barrage");
  const m = a.place(TARGET, 3, 0);
  const from = a.damage.length;
  a.cast(1, { x: m.x, y: m.y });
  a.until(() => a.hitsFrom(from) > 0, 2000, "a Barragem não acertou ninguém");
});
test("Flecha Relâmpago salta", "paladin", (a) => {
  a.choose("lightning_arrow", "barrage");
  const m = a.place(TARGET, 3, 0);
  a.place(TARGET, 0, 1, m);
  a.cast(0, m);
  a.until(() => a.chains.length > 0, 3000, "a Flecha Relâmpago não saltou");
});

// --- Feiticeiro -------------------------------------------------------------------------
console.log("feiticeiro:");
test("Feixe de Energia fere e Fúria dos Céus solta raios", "sorcerer", (a) => {
  a.choose("energy_beam", "sky_fury");
  const m = a.place(TARGET, 3, 0);
  let from = a.damage.length;
  a.cast(0, { x: m.x, y: m.y });
  a.until(() => a.hitsFrom(from) > 0, 2000, "o Feixe de Energia não feriu ninguém");
  from = a.damage.length;
  a.ready();
  a.cast(1);
  a.until(() => fieldOf(a, (f) => f.style === "storm"), 2000, "a Fúria dos Céus não criou a nuvem");
  a.until(() => a.hitsFrom(from) > 0, 4000, "a nuvem não soltou raios");
});
test("Bola de Fogo queima e Núcleo Infernal fere em volta", "sorcerer", (a) => {
  a.choose("fireball", "infernal_core");
  const m = a.place(TARGET, 3, 0);
  a.cast(0, { x: m.x, y: m.y });
  a.until(() => m.dot === "burn", 3000, "a Bola de Fogo não queimou");
  a.place(TARGET, -1, 0);
  const from = a.damage.length;
  a.ready();
  a.cast(1);
  a.until(() => a.hitsFrom(from) > 0, 2000, "o Núcleo Infernal não feriu ninguém");
});
test("Prisão de Gelo prende e Cone de Frio deixa lento", "sorcerer", (a) => {
  a.choose("cone_of_cold", "ice_prison");
  const m = a.place(TARGET, 3, 0);
  a.cast(1, m);
  a.until(() => m.rooted, 2000, "a Prisão de Gelo não prendeu o alvo");
  a.ready();
  a.cast(0, { x: m.x, y: m.y });
  a.until(() => m.slowed, 2000, "o Cone de Frio não deixou o alvo lento");
});
test("Passo Nebuloso teleporta e Muralha Mágica sobe", "sorcerer", (a) => {
  a.choose("misty_step", "magic_wall");
  // No toque rápido, o passo leva para longe do monstro mais perto.
  a.place(TARGET, 1, 0);
  const start = { x: a.p.x, y: a.p.y };
  a.cast(0);
  a.until(() => a.p.x !== start.x || a.p.y !== start.y, 2000, `o Passo Nebuloso não levou o herói (avisos: ${a.notices.join(", ")})`);
  a.ready();
  // Depois do passo, o herói pode estar perto de parede: mira num tile livre e à vista a 3 tiles.
  const spot = ([[3, 0], [-3, 0], [0, 3], [0, -3], [3, 3], [-3, -3], [3, -3], [-3, 3]] as const)
    .map(([dx, dy]) => ({ x: a.p.x + dx, y: a.p.y + dy }))
    .find((t) => a.free(t.x, t.y) && hasLineOfSight(a.d, a.p.x, a.p.y, t.x, t.y));
  if (!spot) throw new Error(`arena: nenhum tile livre à vista para a Muralha (${a.where()})`);
  a.cast(1, spot);
  a.until(() => fieldOf(a, (f) => f.kind === "wall"), 2000, "a Muralha Mágica não subiu");
});
test("Morte Súbita fere e os esqueletos aparecem", "sorcerer", (a) => {
  a.choose("sudden_death", "raise_skeletons");
  const m = a.place(TARGET, 3, 0);
  const from = a.damage.length;
  a.cast(0, m);
  a.until(() => a.hitsFrom(from) > 0, 2000, "a Morte Súbita não feriu o alvo");
  a.ready();
  a.cast(1);
  a.until(() => mine(a, "skeleton").length === 3, 2000, `os esqueletos não apareceram (${mine(a, "skeleton").length})`);
});
test("Rajada Mística empurra e Tentáculos prendem", "sorcerer", (a) => {
  a.choose("eldritch_blast", "black_tentacles");
  const m = a.place(TARGET, 2, 0);
  const before = { x: m.x, y: m.y };
  a.cast(0, m);
  a.until(() => m.x !== before.x || m.y !== before.y, 3000, "a Rajada Mística não empurrou o alvo");
  a.ready();
  a.cast(1, { x: m.x, y: m.y });
  a.until(() => anyMonster(a, (x) => x.rooted), 3000, "os Tentáculos Negros não prenderam ninguém");
});
test("Meteoro deixa a cratera em chamas", "sorcerer", (a) => {
  a.choose("shadow_orb", "meteor");
  const m = a.place(TARGET, 3, 0);
  a.cast(1, { x: m.x, y: m.y });
  a.until(() => fieldOf(a, (f) => f.spellId === "meteor" && f.style === "fire"), 4000, "o Meteoro não deixou a cratera em chamas");
});

// --- Druida -----------------------------------------------------------------------------
console.log("druida:");
test("Águia Gigante atordoa e Grito da Fera chama o lobo", "druid", (a) => {
  a.choose("beast_cry", "giant_eagle");
  a.place(TARGET, 3, 0);
  a.cast(1);
  a.until(() => mine(a, "eagle").length === 2, 2000, "as águias não apareceram");
  a.until(() => anyMonster(a, (m) => m.stunned), 8000, "a águia não atordoou ninguém");
  a.ready();
  a.cast(0);
  a.until(() => mine(a, "wolf").length === 1, 2000, "o Grito da Fera não chamou o lobo");
});
test("Urso Ancestral leva só metade do dano nas magias do equipamento", "druid", (a) => {
  a.choose("spirit_wolf", "ancient_bear");
  const seat = (a.hunt as any).seats.get(HERO);
  const bearDamage = (spellPower: number) => {
    seat.gear.spellPower = spellPower;
    a.ready();
    a.cast(1);
    a.until(() => mine(a, "bear").length === 1, 2000, "o urso não apareceu");
    return (a.hunt as any).summonBrains.get(mine(a, "bear")[0].id).damage as number;
  };
  const bare = bearDamage(0);
  // Varinha de dente de dragão mágica + elmo: +150% nas magias; o urso deve ganhar +75%, não +150%.
  const geared = bearDamage(1.5);
  console.log(`    golpe do urso: ${bare.toFixed(1)} sem equipamento, ${geared.toFixed(1)} com +150% nas magias`);
  check(Math.abs(geared / bare - (1 + 1.5 * SUMMON_SPELL_POWER_SHARE)) < 0.01, `o urso devia ganhar ${1.5 * SUMMON_SPELL_POWER_SHARE * 100}% (${bare} → ${geared})`);
});
test("Pantera salta e Urso soma vida e dá patada", "druid", (a) => {
  a.choose("panther_form", "bear_form");
  const m = a.place(TARGET, 3, 0);
  a.cast(0);
  a.until(() => a.p.form === "panther", 2000, "a Forma de Pantera não transformou o druida");
  a.hunt.target(HERO, { id: m.id });
  a.hunt.attacking(HERO, { on: true });
  a.until(() => castsOf(a, "panther_form").some((s) => s.echo), 4000, "a pantera não saltou no alvo");
  a.hunt.attacking(HERO, { on: false });
  const hp = a.p.maxHp;
  a.ready();
  a.cast(1);
  a.until(() => a.p.form === "bear", 2000, "a Forma de Urso não transformou o druida");
  check(a.p.maxHp > hp * 1.4, `o urso não somou vida: ${hp} → ${a.p.maxHp}`);
  a.until(() => tileDistance(a.p.x, a.p.y, m.x, m.y) <= 1, 3000, "o monstro não chegou perto do urso");
  a.hunt.target(HERO, { id: m.id });
  a.hunt.attacking(HERO, { on: true });
  a.until(() => castsOf(a, "bear_form").some((s) => s.echo), 6000, "o urso não deu patada");
});
test("semente do Renascer salva o druida da morte", "druid", (a) => {
  a.choose("distant_heal", "rebirth_seed");
  a.cast(1);
  a.until(() => a.p.seeded, 2000, "a semente não foi plantada");
  // Quase morto e cercado: o próximo golpe mata, e a semente faz o druida renascer.
  a.p.hp = 1;
  a.place("orc", 1, 0);
  a.place("orc", -1, 0);
  a.until(() => a.notices.includes("Renasceu!"), 6000, `o druida não renasceu (vida ${a.p.hp}/${a.p.maxHp})`);
  check(a.p.status === "playing" && !a.p.seeded, `renasceu errado: ${a.p.status}, semente ${a.p.seeded}`);
});
test("Cura Distante em quem está cheio vira escudo (Florescer)", "druid", (a) => {
  a.choose("distant_heal", "rebirth_seed");
  check(a.p.hp === a.p.maxHp, "o druida devia começar com a vida cheia");
  a.cast(0);
  a.until(() => a.p.barrier > 0, 3000, "a Cura Distante não virou escudo com o Florescer");
});
test("Pele de Casca protege e Chuva Revigorante cai", "druid", (a) => {
  a.choose("barkskin", "reviving_rain");
  a.cast(0);
  a.until(() => a.p.barrier > 0, 2000, "a Pele de Casca não deu escudo");
  a.ready();
  a.cast(1, { x: a.p.x, y: a.p.y });
  a.until(() => fieldOf(a, (f) => f.spellId === "reviving_rain"), 2000, "a Chuva Revigorante não caiu");
});
test("Picada da Mamba envenena e Nuvem Venenosa aparece", "druid", (a) => {
  a.choose("mamba_bite", "poison_cloud");
  const m = a.place(TARGET, 3, 0);
  a.cast(0, m);
  a.until(() => m.dot === "poison", 3000, "a Picada da Mamba não envenenou o alvo");
  a.ready();
  a.cast(1, { x: m.x, y: m.y });
  a.until(() => fieldOf(a, (f) => f.spellId === "poison_cloud"), 2000, "a Nuvem Venenosa não apareceu");
});
test("Onda Trovejante fere e Chamar Relâmpago solta raios", "druid", (a) => {
  a.choose("thunderwave", "call_lightning");
  a.place(TARGET, 1, 0);
  let from = a.damage.length;
  a.cast(0);
  a.until(() => a.hitsFrom(from) > 0, 2000, "a Onda Trovejante não feriu ninguém");
  const far = a.place(TARGET, -3, 0);
  from = a.damage.length;
  a.ready();
  a.cast(1, { x: far.x, y: far.y });
  a.until(() => fieldOf(a, (f) => f.spellId === "call_lightning"), 2000, "a nuvem do relâmpago não apareceu");
  a.until(() => a.hitsFrom(from) > 0, 4000, "a nuvem não soltou raios");
});

// --- Cavaleiro --------------------------------------------------------------------------
console.log("cavaleiro:");
test("Redemoinho gira 3 vezes e Fúria Berserker fica ativa", "knight", (a) => {
  a.choose("steel_whirlwind", "berserk_rage");
  a.place(TARGET, 1, 0);
  a.cast(0);
  a.until(() => castsOf(a, "steel_whirlwind").length >= 3, 3000, "o Redemoinho de Aço não girou 3 vezes");
  a.ready();
  a.cast(1);
  a.until(() => a.p.buff === "berserk_rage", 2000, "a Fúria Berserker não ficou ativa");
});
test("Lâmina Arremessada sangra e Mil Cortes repetem", "knight", (a) => {
  a.choose("thrown_blade", "thousand_cuts");
  const m = a.place(TARGET, 3, 0);
  a.cast(0, m);
  a.until(() => m.dot === "bleed", 3000, "a Lâmina Arremessada não fez sangrar");
  const near = a.place(TARGET, -1, 0);
  a.ready();
  a.cast(1, near);
  a.until(() => castsOf(a, "thousand_cuts").length >= 5, 3000, "os Mil Cortes não repetiram");
});
test("Bater com Escudo atordoa e Égide dá escudo", "knight", (a) => {
  a.choose("shield_bash", "shared_aegis");
  const m = a.place(TARGET, 1, 0);
  a.cast(0, m);
  a.until(() => m.stunned, 2000, "o Bater com Escudo não atordoou");
  a.ready();
  a.cast(1);
  a.until(() => a.p.barrier > 0, 2000, "a Égide Compartilhada não deu escudo");
});
test("Espinhos de Ferro devolvem o golpe e Fortaleza Viva prende o herói", "knight", (a) => {
  a.choose("iron_thorns", "living_fortress");
  a.place(TARGET, 1, 0);
  const from = a.damage.length;
  a.cast(0);
  a.until(() => a.hitsFrom(from) > 0, 8000, "os Espinhos de Ferro não devolveram nenhum golpe");
  a.ready();
  a.cast(1);
  a.until(() => a.p.buff === "living_fortress" && a.p.guarded, 2000, "a Fortaleza Viva não ficou ativa");
  const at = { x: a.p.x, y: a.p.y };
  for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0]] as const) { a.hunt.move(HERO, { dx, dy }); a.advance(300); }
  check(a.p.x === at.x && a.p.y === at.y, "o herói andou durante a Fortaleza Viva");
});
test("Estandarte sobe e Investida leva o herói até o alvo", "knight", (a) => {
  a.choose("charge", "war_banner");
  a.cast(1);
  a.until(() => fieldOf(a, (f) => f.spellId === "war_banner"), 2000, "o Estandarte de Guerra não subiu");
  const m = a.place(TARGET, 3, 0);
  a.ready();
  a.cast(0, m);
  a.until(() => tileDistance(a.p.x, a.p.y, m.x, m.y) <= 1, 2000, `a Investida não levou o herói até o alvo (avisos: ${a.notices.slice(-3).join(", ")})`);
});
test("Desafio Supremo protege e Corrente de Ferro puxa", "knight", (a) => {
  a.choose("iron_chain", "supreme_challenge");
  a.cast(1);
  a.until(() => a.p.guarded, 2000, "o Desafio Supremo não protegeu o herói");
  const m = a.place(TARGET, 3, 0);
  a.ready();
  a.cast(0, m);
  a.until(() => tileDistance(a.p.x, a.p.y, m.x, m.y) <= 1 && m.rooted, 3000, "a Corrente de Ferro não puxou o monstro");
});

console.log(`\n${passed} casos OK, ${failures.length} falharam`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("EFEITOS OK");
process.exit(0);
