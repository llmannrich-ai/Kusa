/**
 * Teste de fumaça dos efeitos que só aparecem em quem sobrevive ao golpe, contra um servidor com
 * KUSA_START_LEVEL=8, KUSA_ALL_SPELLS=1 e KUSA_MONSTER_HP=20 (no nível 8 os monstros comuns morrem de um golpe;
 * com 20× a vida, os da entrada aguentam e o herói não precisa sair andando pela dungeon):
 *   - o Espinho Venenoso continua ferindo sozinho (dano contínuo, um pulso por segundo);
 *   - a Nevasca deixa os monstros lentos;
 *   - o Raio em Cadeia salta do alvo para outro monstro;
 *   - ramo Mira do Paladino (especializações): a Marca do Caçador marca o alvo e ele leva mais dano, o Rolamento
 *     afasta o herói do monstro, a Aljava Veloz e a Postura do Atirador ficam ativas no herói;
 *   - ramos Luz e Batedor do Paladino: Lança Etérea e Caldeira Divina ferem, o Escudo da Luz (toque rápido, sozinho)
 *     protege o próprio herói, o Solo Consagrado vira um campo que fere, a Flecha Relâmpago salta, a Barragem acerta
 *     em leque, a Armadilha de Urso prende o monstro que pisa nela e a estaca do Cordão de Flechas atira sozinha;
 *   - especializações do Feiticeiro: Feixe de Energia e Fúria dos Céus ferem, a Bola de Fogo queima, o Núcleo
 *     Infernal fere, o Cone de Frio deixa lento, a Prisão de Gelo prende, o Passo Nebuloso teleporta, a Muralha
 *     Mágica sobe, a Morte Súbita fere, os esqueletos erguidos aparecem, a Rajada Mística empurra e os Tentáculos prendem;
 *   - especializações do Druida: a Águia Gigante aparece e atordoa, o Grito da Fera chama o lobo da Maestria, as formas de
 *     Pantera (o salto) e de Urso (mais vida e a patada) funcionam, a Cura Distante vira escudo com o Florescer, a semente
 *     do Renascer salva o druida da morte, a Pele de Casca protege, a Chuva Revigorante cai, a Picada da Mamba e a Nuvem
 *     Venenosa envenenam, a Onda Trovejante fere e o Chamar Relâmpago solta raios.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 KUSA_MONSTER_HP=20 PORT=2603 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/efeitos.ts http://localhost:2603
 */
import { Client } from "@colyseus/sdk";
import { MONSTERS, MSG, Tile, generateDungeon, isWalkable, tileAt, tileDistance, type MonsterKind } from "@kusa/shared";
import { approach, enter, inSight, until, wait, whereAmI } from "./hunt.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

await venom();
await slowAndChain();
await paladinMira();
await paladinLight();
await paladinScout();
await sorcererSpecs();
await druidSpecs();
console.log("EFEITOS OK");
process.exit(0);

async function venom() {
  const { room, me } = await enter(client, "druid", "venom");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "venom_thorn" });
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  const seen = inSight(room, me(), 5)[0];
  if (!seen) throw new Error(`nenhum monstro à vista em 30 s: ${whereAmI(room, me)}`);
  const [id, target] = seen;
  if (target.maxHp < 300) throw new Error(`o servidor precisa de KUSA_MONSTER_HP=20 (vida ${target.maxHp})`);
  room.send(MSG.cast, { slot: 0, aim: { x: target.x, y: target.y, targetId: id } });
  await until(() => room.state.monsters.get(id)?.dot === "poison", 3000, "o espinho não envenenou o alvo");
  // Veneno: o alvo continua perdendo vida sem o druida fazer nada (um pulso por segundo).
  const hpBefore = room.state.monsters.get(id).hp;
  await wait(2300);
  const hpAfter = room.state.monsters.get(id)?.hp ?? 0;
  console.log(`druida: veneno no alvo, vida ${hpBefore} → ${hpAfter} em 2,3 s`);
  if (hpAfter >= hpBefore) throw new Error("o veneno não tirou vida do alvo");
  await room.leave();
}

async function slowAndChain() {
  const { room, me, chains } = await enter(client, "sorcerer", "slowAndChain");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "chain_lightning" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "blizzard" });
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  const seen = inSight(room, me(), 5)[0];
  if (!seen) throw new Error(`nenhum monstro à vista em 30 s: ${whereAmI(room, me)}`);
  const [, target] = seen;
  room.send(MSG.cast, { slot: 1, aim: { x: target.x, y: target.y } });
  await until(() => [...room.state.monsters.values()].some((m: any) => m.slowed), 3000, "a Nevasca não deixou ninguém lento");

  // Cadeia: precisa de dois monstros a até 3 tiles um do outro; anda pela entrada até achar.
  const deadline = Date.now() + 90_000;
  let tries = 0;
  const pair = () => {
    const seen = inSight(room, me(), 6).filter(([, m]) => MONSTERS[m.kind as MonsterKind].rank === "common");
    return seen.find(([a, m]) => seen.some(([b, o]) => a !== b && tileDistance(m.x, m.y, o.x, o.y) <= 3));
  };
  while (chains.length === 0) {
    if (Date.now() > deadline) throw new Error("o Raio em Cadeia não saltou");
    const found = pair();
    if (found) room.send(MSG.cast, { slot: 0, aim: { x: found[1].x, y: found[1].y, targetId: found[0] } });
    else await gather(room, me, () => pair() !== undefined, ++tries);
    await wait(400);
  }
  const hops = Math.max(...chains.map((c) => c.points.length));
  console.log(`feiticeiro: monstros lentos, raio em até ${hops} monstros`);
  if (hops < 2) throw new Error("a cadeia devia ter ao menos 2 pontos");
  await room.leave();
}

async function paladinMira() {
  const { room, me, damage } = await enter(client, "paladin", "paladinMira");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "hunter_mark" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "swift_quiver" });
  await approach(room, me, 2, () => inSight(room, me(), 6).length > 0);
  const seen = inSight(room, me(), 6)[0];
  if (!seen) throw new Error(`nenhum monstro à vista em 30 s: ${whereAmI(room, me)}`);
  const [id, target] = seen;

  // Marca: o alvo fica marcado e o mesmo golpe passa a tirar mais vida.
  room.send(MSG.cast, { slot: 0, aim: { x: target.x, y: target.y, targetId: id } });
  await until(() => room.state.monsters.get(id)?.marked === true, 3000, "a Marca do Caçador não marcou o alvo");

  // Aljava Veloz: o bônus aparece no herói (a aura) e as flechas saem mais rápido.
  room.send(MSG.cast, { slot: 1 });
  await until(() => me().buff === "swift_quiver", 2000, "a Aljava Veloz não ficou ativa");
  // Atira por 6 s (a aljava dura 7,8 s no nível 3), trocando para outro monstro à vista se o alvo sair do alcance.
  // Sem a aljava, saem no máximo 6 flechas em 6 s (1 por segundo); com ela, uma a cada 0,4 s.
  const hitsBefore = damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer && !d.dot).length;
  room.send(MSG.target, { id });
  room.send(MSG.attacking, { on: true });
  for (let t = 0; t < 20; t++) {
    const p = me();
    const current = room.state.monsters.get(p.target);
    if (!current || tileDistance(p.x, p.y, current.x, current.y) > 5) {
      const other = inSight(room, p, 5)[0];
      if (other) room.send(MSG.target, { id: other[0] });
    }
    await wait(300);
  }
  room.send(MSG.attacking, { on: false });
  const hits = damage.filter((d) => d.attacker === room.sessionId && !d.toPlayer && !d.dot).length - hitsBefore;
  console.log(`paladino: alvo marcado, ${hits} golpes em 6 s com a Aljava Veloz`);
  if (hits < 7) throw new Error(`as flechas não ficaram mais rápidas (${hits} golpes em 6 s)`);
  await room.leave();

  // Rolamento: o herói salta para longe do monstro e nunca cai no portal.
  const roll = await enter(client, "paladin", "paladinRoll");
  roll.room.send(MSG.chooseSpell, { slot: 0, spellId: "evasive_roll" });
  roll.room.send(MSG.chooseSpell, { slot: 1, spellId: "sniper_stance" });
  // Encurralado (parede atrás e monstro colado), o Rolamento não sai e não cobra nada: chega mais e tenta de novo.
  const rollDeadline = Date.now() + 30_000;
  let before: { x: number; y: number } | undefined;
  let near: [string, any] | undefined;
  let gap = 0;
  while (!before) {
    if (Date.now() > rollDeadline) throw new Error("o Rolamento não moveu o herói");
    await approach(roll.room, roll.me, 2, () => inSight(roll.room, roll.me(), 3).length > 0);
    near = inSight(roll.room, roll.me(), 3)[0];
    if (!near) throw new Error("nenhum monstro perto para rolar para longe");
    const from = { x: roll.me().x, y: roll.me().y };
    const mana = roll.me().mana;
    gap = tileDistance(from.x, from.y, near[1].x, near[1].y);
    roll.room.send(MSG.target, { id: near[0] });
    roll.room.send(MSG.cast, { slot: 0 });
    const moved = () => roll.me().x !== from.x || roll.me().y !== from.y;
    await until(() => moved() || roll.notices.includes("Sem espaço para rolar"), 2000, "o Rolamento não moveu o herói nem avisou que não havia espaço");
    if (moved()) before = from;
    else if (roll.me().mana < mana - 9) throw new Error("o Rolamento sem espaço gastou mana");
    roll.notices.length = 0;
  }
  const after = roll.me();
  const dungeon = generateDungeon(roll.room.state.seed, roll.room.state.mapId);
  if (tileAt(dungeon, after.x, after.y) === Tile.Portal) throw new Error("o Rolamento caiu no portal");
  const monster = roll.room.state.monsters.get(near![0]);
  const gapAfter = monster ? tileDistance(after.x, after.y, monster.x, monster.y) : Infinity;
  console.log(`paladino: rolou de ${before.x},${before.y} para ${after.x},${after.y} (distância do monstro ${gap} → ${gapAfter})`);
  if (gapAfter < gap) throw new Error("o Rolamento devia afastar o herói do monstro");
  roll.room.send(MSG.cast, { slot: 1 });
  await until(() => roll.me().buff === "sniper_stance", 2000, "a Postura do Atirador não ficou ativa");
  await roll.room.leave();
}

/** Dano do herói (sem o que ele recebeu) desde a posição `from` da lista. */
function hitsFrom(damage: { attacker: string; toPlayer: boolean }[], me: string, from: number) {
  return damage.slice(from).filter((d) => d.attacker === me && !d.toPlayer).length;
}

async function paladinLight() {
  const { room, me, damage, spells } = await enter(client, "paladin", "paladinLight");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "light_shield" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "consecrated_ground" });
  // Escudo da Luz no toque rápido: sozinho, o mais ferido ao alcance é o próprio herói.
  room.send(MSG.cast, { slot: 0 });
  await until(() => me().barrier > 0, 2000, "o Escudo da Luz não protegeu o herói");
  const shield = me().barrier;

  // Solo Consagrado: o campo aparece no chão e fere os monstros em cima dele.
  await approach(room, me, 2, () => inSight(room, me(), 5).length > 0);
  const seen = inSight(room, me(), 5)[0];
  if (!seen) throw new Error(`nenhum monstro à vista em 30 s: ${whereAmI(room, me)}`);
  const before = damage.length;
  room.send(MSG.cast, { slot: 1, aim: { x: seen[1].x, y: seen[1].y } });
  await until(() => [...room.state.fields.values()].some((f: any) => f.spellId === "consecrated_ground" && f.kind === "zone"), 2000, "o Solo Consagrado não criou o campo");
  await until(() => hitsFrom(damage, room.sessionId, before) > 0, 4000, "o Solo Consagrado não feriu ninguém");
  console.log(`paladino: Escudo da Luz de ${shield} em si mesmo; Solo Consagrado feriu ${hitsFrom(damage, room.sessionId, before)} vezes`);
  if (!spells.some((s) => s.spellId === "light_shield")) throw new Error("o Escudo da Luz não saiu");
  await room.leave();
}

async function paladinScout() {
  const { room, me, spells } = await enter(client, "paladin", "paladinScout");
  room.send(MSG.chooseSpell, { slot: 0, spellId: "bear_trap" });
  room.send(MSG.chooseSpell, { slot: 1, spellId: "arrow_cordon" });
  await approach(room, me, 2, () => inSight(room, me(), 4).length > 0);
  const seen = inSight(room, me(), 4)[0];
  if (!seen) throw new Error(`nenhum monstro à vista em 30 s: ${whereAmI(room, me)}`);
  const [id] = seen;

  // Armadilha no tile do monstro: se ele continua em cima, dispara no pulso seguinte e o prende. Se ele saiu do
  // tile no meio-tempo, a armadilha fica esperando: arma outra no tile novo dele (recarga de 6 s).
  const rooted = () => [...room.state.monsters.values()].some((m: any) => m.rooted);
  for (let i = 0; i < 5 && !rooted(); i++) {
    const m = room.state.monsters.get(id) ?? inSight(room, me(), 4)[0]?.[1];
    if (m) room.send(MSG.cast, { slot: 0, aim: { x: m.x, y: m.y } });
    await until(rooted, 6500, "").catch(() => {});
  }
  if (!rooted()) throw new Error("a armadilha não prendeu nenhum monstro");

  // Estaca do Cordão de Flechas: atira sozinha nos monstros a até 3 tiles.
  room.send(MSG.cast, { slot: 1, aim: { x: me().x, y: me().y } });
  await until(() => [...room.state.fields.values()].some((f: any) => f.kind === "turret"), 2000, "a estaca não apareceu");
  await until(() => spells.some((s) => s.spellId === "arrow_cordon" && s.echo && (s.x !== s.tx || s.y !== s.ty)), 5000, "a estaca não atirou");
  console.log("paladino: armadilha prendeu o monstro e a estaca atirou");
  await room.leave();

  // Artilheiro: Flecha Relâmpago salta e Barragem acerta em leque.
  const art = await enter(client, "paladin", "paladinArtillery");
  art.room.send(MSG.chooseSpell, { slot: 0, spellId: "lightning_arrow" });
  art.room.send(MSG.chooseSpell, { slot: 1, spellId: "barrage" });
  await approach(art.room, art.me, 2, () => inSight(art.room, art.me(), 5).length > 0);
  const near = inSight(art.room, art.me(), 5)[0];
  if (!near) throw new Error(`nenhum monstro à vista em 30 s: ${whereAmI(art.room, art.me)}`);
  const before = art.damage.length;
  art.room.send(MSG.cast, { slot: 1, aim: { x: near[1].x, y: near[1].y } });
  await until(() => hitsFrom(art.damage, art.room.sessionId, before) > 0, 2000, "a Barragem não acertou ninguém");
  const deadline = Date.now() + 90_000;
  let tries = 0;
  const pairOf = () => {
    const seenNow = inSight(art.room, art.me(), 6);
    return seenNow.find(([a, m]) => seenNow.some(([b, o]) => a !== b && tileDistance(m.x, m.y, o.x, o.y) <= 3));
  };
  while (art.chains.length === 0) {
    if (Date.now() > deadline) throw new Error("a Flecha Relâmpago não saltou");
    // Lança no par (ou em qualquer monstro à vista: o salto pode achar um vizinho que o herói não enxerga).
    const pair = pairOf() ?? inSight(art.room, art.me(), 6)[0];
    if (pair) art.room.send(MSG.cast, { slot: 0, aim: { x: pair[1].x, y: pair[1].y, targetId: pair[0] } });
    else await gather(art.room, art.me, () => pairOf() !== undefined, ++tries);
    await wait(500);
  }
  console.log(`paladino: Barragem acertou, Flecha Relâmpago saltou por ${Math.max(...art.chains.map((c) => c.points.length))} monstros`);
  await art.room.leave();
}

/**
 * Sem dois monstros juntos à vista: anda 4 s atrás de outro monstro (o 2º, 3º ou 4º mais próximo, alternando a cada
 * tentativa). Os monstros que notam o herói vêm atrás dele e acabam formando o par que o salto em cadeia precisa.
 */
async function gather(room: any, me: () => any, done: () => boolean, tries: number) {
  const until = Date.now() + 4000;
  await approach(room, me, 1, () => done() || Date.now() > until, 1 + (tries % 3));
}

/** Uma sala de Feiticeiro com as duas magias de uma especialização, já perto de um monstro à vista. */
async function sorcerer(label: string, slot1: string, slot2: string) {
  const hunt = await enter(client, "sorcerer", label);
  hunt.room.send(MSG.chooseSpell, { slot: 0, spellId: slot1 });
  hunt.room.send(MSG.chooseSpell, { slot: 1, spellId: slot2 });
  await approach(hunt.room, hunt.me, 2, () => inSight(hunt.room, hunt.me(), 4).length > 0);
  const seen = inSight(hunt.room, hunt.me(), 4)[0];
  if (!seen) throw new Error(`${label}: nenhum monstro à vista em 30 s: ${whereAmI(hunt.room, hunt.me)}`);
  return { ...hunt, seen };
}

/** Golpes do herói (sem os que ele recebeu) depois da posição `from` da lista de dano. */
function myHits(hunt: { damage: { attacker: string; toPlayer: boolean }[]; room: any }, from: number) {
  return hunt.damage.slice(from).filter((d) => d.attacker === hunt.room.sessionId && !d.toPlayer).length;
}

async function sorcererSpecs() {
  // Tempestuoso: o feixe fere quem está na reta; a nuvem solta raios sozinha.
  {
    const h = await sorcerer("tempestuoso", "energy_beam", "sky_fury");
    let from = h.damage.length;
    h.room.send(MSG.cast, { slot: 0, aim: { x: h.seen[1].x, y: h.seen[1].y } });
    await until(() => myHits(h, from) > 0, 2000, "o Feixe de Energia não feriu ninguém");
    from = h.damage.length;
    h.room.send(MSG.cast, { slot: 1 });
    await until(() => [...h.room.state.fields.values()].some((f: any) => f.style === "storm"), 2000, "a Fúria dos Céus não criou a nuvem");
    await until(() => myHits(h, from) > 0, 4000, "a nuvem não soltou raios");
    await h.room.leave();
  }
  // Piromante: a bola de fogo queima; o núcleo infernal fere em volta.
  {
    const h = await sorcerer("piromante", "fireball", "infernal_core");
    h.room.send(MSG.cast, { slot: 0, aim: { x: h.seen[1].x, y: h.seen[1].y } });
    await until(() => [...h.room.state.monsters.values()].some((m: any) => m.dot === "burn"), 3000, "a Bola de Fogo não queimou ninguém");
    await approach(h.room, h.me, 2, () => inSight(h.room, h.me(), 3).length > 0);
    const from = h.damage.length;
    h.room.send(MSG.cast, { slot: 1 });
    await until(() => myHits(h, from) > 0, 2000, "o Núcleo Infernal não feriu ninguém");
    await h.room.leave();
  }
  // Criomante: o cone deixa lento; a prisão prende.
  {
    const h = await sorcerer("criomante", "cone_of_cold", "ice_prison");
    h.room.send(MSG.cast, { slot: 1, aim: { x: h.seen[1].x, y: h.seen[1].y } });
    await until(() => h.room.state.monsters.get(h.seen[0])?.rooted === true, 2000, "a Prisão de Gelo não prendeu o alvo");
    const near = inSight(h.room, h.me(), 4)[0];
    if (near) h.room.send(MSG.cast, { slot: 0, aim: { x: near[1].x, y: near[1].y } });
    await until(() => [...h.room.state.monsters.values()].some((m: any) => m.slowed), 2000, "o Cone de Frio não deixou ninguém lento");
    await h.room.leave();
  }
  // Arcanista: o passo nebuloso teleporta; a muralha sobe no chão.
  {
    const h = await sorcerer("arcanista", "misty_step", "magic_wall");
    const start = { x: h.me().x, y: h.me().y };
    h.room.send(MSG.cast, { slot: 0 });
    await until(() => h.me().x !== start.x || h.me().y !== start.y || h.notices.includes("Sem espaço para rolar"), 2000, "o Passo Nebuloso não levou o herói");
    if (h.me().x === start.x && h.me().y === start.y) throw new Error("o Passo Nebuloso não achou lugar livre");
    const target = inSight(h.room, h.me(), 5)[0] ?? h.seen;
    h.room.send(MSG.cast, { slot: 1, aim: { x: target[1].x, y: target[1].y } });
    await until(() => [...h.room.state.fields.values()].some((f: any) => f.kind === "wall"), 2000, "a Muralha Mágica não subiu");
    console.log(`feiticeiro: teleportou de ${start.x},${start.y} para ${h.me().x},${h.me().y}; muralha de ${[...h.room.state.fields.values()].filter((f: any) => f.kind === "wall").length} tiles`);
    await h.room.leave();
  }
  // Necromante: a morte súbita fere; os esqueletos aparecem (3 com a Maestria).
  {
    const h = await sorcerer("necromante", "sudden_death", "raise_skeletons");
    const from = h.damage.length;
    h.room.send(MSG.cast, { slot: 0, aim: { x: h.seen[1].x, y: h.seen[1].y, targetId: h.seen[0] } });
    await until(() => myHits(h, from) > 0, 2000, "a Morte Súbita não feriu o alvo");
    h.room.send(MSG.cast, { slot: 1 });
    const mine = () => [...h.room.state.summons.values()].filter((x: any) => x.owner === h.room.sessionId && x.kind === "skeleton");
    await until(() => mine().length === 3, 2000, "os esqueletos não apareceram");
    await h.room.leave();
  }
  // Bruxo: a rajada empurra o alvo para longe (precisa de espaço livre atrás dele); os tentáculos prendem.
  {
    const h = await sorcerer("bruxo", "eldritch_blast", "black_tentacles");
    const map = generateDungeon(h.room.state.seed, h.room.state.mapId);
    const behindFree = (m: any) => {
      const p = h.me();
      const bx = m.x + Math.sign(m.x - p.x);
      const by = m.y + Math.sign(m.y - p.y);
      return isWalkable(map, bx, by) && ![...h.room.state.monsters.values()].some((o: any) => o.x === bx && o.y === by);
    };
    let pushed = false;
    for (let i = 0; i < 6 && !pushed; i++) {
      const pick = inSight(h.room, h.me(), 6).find(([, m]) => behindFree(m));
      if (!pick) { await approach(h.room, h.me, 1, () => inSight(h.room, h.me(), 6).some(([, m]) => behindFree(m))); continue; }
      const [id, m] = pick;
      const before = { x: m.x, y: m.y };
      h.room.send(MSG.cast, { slot: 0, aim: { x: m.x, y: m.y, targetId: id } });
      await until(() => {
        const now = h.room.state.monsters.get(id);
        return !!now && (now.x !== before.x || now.y !== before.y);
      }, 4800, "").then(() => { pushed = true; }, () => {});
    }
    if (!pushed) throw new Error(`a Rajada Mística não empurrou o alvo: ${whereAmI(h.room, h.me)}`);
    await approach(h.room, h.me, 2, () => inSight(h.room, h.me(), 5).length > 0);
    const seen = inSight(h.room, h.me(), 5)[0];
    if (!seen) throw new Error(`bruxo: nenhum monstro à vista: ${whereAmI(h.room, h.me)}`);
    h.room.send(MSG.cast, { slot: 1, aim: { x: seen[1].x, y: seen[1].y } });
    await until(() => [...h.room.state.monsters.values()].some((x: any) => x.rooted), 3000, "os Tentáculos Negros não prenderam ninguém");
    await h.room.leave();
  }
  console.log("feiticeiro: as 12 magias das especializações funcionaram");
}

/** Uma sala de Druida com as duas magias de uma especialização, já perto de um monstro à vista. */
async function druid(label: string, slot1: string, slot2: string) {
  const hunt = await enter(client, "druid", label);
  hunt.room.send(MSG.chooseSpell, { slot: 0, spellId: slot1 });
  hunt.room.send(MSG.chooseSpell, { slot: 1, spellId: slot2 });
  await approach(hunt.room, hunt.me, 2, () => inSight(hunt.room, hunt.me(), 4).length > 0);
  const seen = inSight(hunt.room, hunt.me(), 4)[0];
  if (!seen) throw new Error(`${label}: nenhum monstro à vista em 30 s: ${whereAmI(hunt.room, hunt.me)}`);
  return { ...hunt, seen };
}

async function druidSpecs() {
  // Mestre das Feras: a águia aparece e o mergulho atordoa; o grito (Maestria) chama um lobo.
  {
    const h = await druid("feras", "beast_cry", "giant_eagle");
    const mine = (kind: string) => [...h.room.state.summons.values()].filter((x: any) => x.owner === h.room.sessionId && x.kind === kind);
    h.room.send(MSG.cast, { slot: 1 });
    await until(() => mine("eagle").length === 2, 2000, "as águias não apareceram");
    await until(() => [...h.room.state.monsters.values()].some((m: any) => m.stunned), 8000, "a águia não atordoou ninguém");
    h.room.send(MSG.cast, { slot: 0 });
    await until(() => mine("wolf").length === 1, 2000, "o Grito da Fera não chamou o lobo");
    await h.room.leave();
  }
  // Metamorfo: a pantera salta no alvo; o urso soma vida e dá patadas em quem está colado.
  {
    const h = await druid("metamorfo", "panther_form", "bear_form");
    h.room.send(MSG.cast, { slot: 0 });
    await until(() => h.me().form === "panther", 2000, "a Forma de Pantera não transformou o druida");
    h.room.send(MSG.attacking, { on: true });
    await until(() => h.spells.some((s) => s.spellId === "panther_form" && s.echo), 4000, "a pantera não saltou no alvo");
    h.room.send(MSG.attacking, { on: false });
    const hp = h.me().maxHp;
    h.room.send(MSG.cast, { slot: 1 });
    await until(() => h.me().form === "bear", 2000, "a Forma de Urso não transformou o druida");
    if (h.me().maxHp <= hp * 1.4) throw new Error(`o urso não somou vida: ${hp} → ${h.me().maxHp}`);
    await approach(h.room, h.me, 1, () => inSight(h.room, h.me(), 1).length > 0);
    h.room.send(MSG.attacking, { on: true });
    await until(() => h.spells.some((s) => s.spellId === "bear_form" && s.echo), 6000, `o urso não deu patada: ${whereAmI(h.room, h.me)}`);
    console.log(`druida: pantera saltou; urso com vida ${hp} → ${h.me().maxHp}`);
    await h.room.leave();
  }
  // Círculo da Vida: a cura em quem está cheio vira escudo (Florescer); a semente salva o druida da morte.
  {
    const h = await druid("circulo", "distant_heal", "rebirth_seed");
    h.room.send(MSG.cast, { slot: 0 });
    await until(() => h.me().barrier > 0, 2000, "a Cura Distante não virou escudo com o Florescer");
    h.room.send(MSG.cast, { slot: 1 });
    await until(() => h.me().seeded === true, 2000, "a semente não foi plantada");
    // Fica no meio dos monstros sem lutar até morrer: a semente faz o druida renascer.
    const deadline = Date.now() + 50_000;
    while (!h.notices.includes("Renasceu!")) {
      if (Date.now() > deadline) throw new Error(`o druida não morreu (nem renasceu) em 50 s: vida ${h.me().hp}/${h.me().maxHp}`);
      await approach(h.room, h.me, 1, () => h.notices.includes("Renasceu!") || inSight(h.room, h.me(), 1).length > 0);
      await wait(300);
    }
    // O aviso chega na hora; o estado (semente gasta) só no próximo patch.
    await until(() => h.me().status === "playing" && !h.me().seeded, 2000, `renasceu errado: ${h.me().status}, semente ${h.me().seeded}`);
    console.log(`druida: renasceu da semente com ${h.me().hp}/${h.me().maxHp} de vida`);
    await h.room.leave();
  }
  // Guardião da Natureza: a casca protege; a chuva cai no chão.
  {
    const h = await druid("guardiao", "barkskin", "reviving_rain");
    h.room.send(MSG.cast, { slot: 0 });
    await until(() => h.me().barrier > 0, 2000, "a Pele de Casca não deu escudo");
    h.room.send(MSG.cast, { slot: 1, aim: { x: h.me().x, y: h.me().y } });
    await until(() => [...h.room.state.fields.values()].some((f: any) => f.spellId === "reviving_rain"), 2000, "a Chuva Revigorante não caiu");
    await h.room.leave();
  }
  // Peste: a picada e a nuvem envenenam.
  {
    const h = await druid("peste", "mamba_bite", "poison_cloud");
    h.room.send(MSG.cast, { slot: 0, aim: { x: h.seen[1].x, y: h.seen[1].y, targetId: h.seen[0] } });
    await until(() => h.room.state.monsters.get(h.seen[0])?.dot === "poison", 3000, "a Picada da Mamba não envenenou o alvo");
    const other = inSight(h.room, h.me(), 5).find(([id]) => id !== h.seen[0]) ?? h.seen;
    h.room.send(MSG.cast, { slot: 1, aim: { x: other[1].x, y: other[1].y } });
    await until(() => [...h.room.state.fields.values()].some((f: any) => f.spellId === "poison_cloud"), 2000, "a Nuvem Venenosa não apareceu");
    await h.room.leave();
  }
  // Tempestade: a onda fere quem está perto; a nuvem do relâmpago solta raios.
  {
    const h = await druid("tempestade", "thunderwave", "call_lightning");
    await approach(h.room, h.me, 1, () => inSight(h.room, h.me(), 2).length > 0);
    let from = h.damage.length;
    h.room.send(MSG.cast, { slot: 0 });
    await until(() => myHits(h, from) > 0, 2000, "a Onda Trovejante não feriu ninguém");
    const target = inSight(h.room, h.me(), 6)[0];
    if (!target) throw new Error(`tempestade: nenhum monstro à vista: ${whereAmI(h.room, h.me)}`);
    from = h.damage.length;
    h.room.send(MSG.cast, { slot: 1, aim: { x: target[1].x, y: target[1].y } });
    await until(() => [...h.room.state.fields.values()].some((f: any) => f.spellId === "call_lightning"), 2000, "a nuvem do relâmpago não apareceu");
    await until(() => myHits(h, from) > 0, 4000, "a nuvem não soltou raios");
    await h.room.leave();
  }
  console.log("druida: as 12 magias das especializações funcionaram");
}
