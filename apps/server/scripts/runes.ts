/**
 * Teste de fumaça das runas contra um servidor com KUSA_START_LEVEL=8 e
 * KUSA_RUNES=rune-life,rune-time,rune-meteor,rune-life (a segunda Runa da Vida não vale: não repete):
 *   - regras: o sorteio só dá runas do catálogo, as de magia são raras, e o bônus soma com as melhorias;
 *   - o Cavaleiro entra com as 3 runas, com a vida da Runa da Vida;
 *   - a Runa do Meteoro põe o Meteoro (do Feiticeiro) na escolha do slot 2; ele sai com a mana do cavaleiro
 *     (custo limitado a 40% da mana máxima) e com a recarga da Runa do Tempo.
 * Uso: npm test (sobe o servidor certo sozinho), ou à mão:
 *      KUSA_START_LEVEL=8 KUSA_RUNES=rune-life,rune-time,rune-meteor,rune-life PORT=2603 npx tsx apps/server/src/index.ts
 *      npx tsx apps/server/scripts/runes.ts http://localhost:2603
 */
import { Client } from "@colyseus/sdk";
import {
  MSG, ROOM_NAME, RUNES, SPELLS, heroBonuses, isRune, rollRune, spellChoices, spellCooldownMs, spellManaCost, statsFor,
  type SpellMessage,
} from "@kusa/shared";
import { RULES_VERSION } from "../src/rulesVersion.ts";

const url = process.argv[2] ?? "http://localhost:2567";
const client = new Client(url);

rules();
await knightWithRunes();
console.log("RUNAS OK");
process.exit(0);

function rules() {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rolls = Array.from({ length: 2000 }, () => rollRune(random));
  if (!rolls.every(isRune)) throw new Error("o sorteio deu algo fora do catálogo");
  const spellShare = rolls.filter((id) => RUNES[id].spell).length / rolls.length;
  if (spellShare < 0.07 || spellShare > 0.22) throw new Error(`runas de magia em ${Math.round(spellShare * 100)}% dos drops`);
  if (isRune("__proto__") || isRune("weapon-1")) throw new Error("isRune aceitou algo que não é runa");

  const bonus = heroBonuses({ might: 2 }, ["rune-fury", "rune-fury", "rune-stone", "rune-wind", "rune-life"]);
  // Repetida não conta; só as 3 primeiras diferentes valem (a da Vida fica de fora).
  if (Math.abs(bonus.damage - (0.2 + 0.15)) > 1e-9) throw new Error(`dano ${bonus.damage}`);
  if (bonus.armor !== 4 || Math.abs(bonus.speed - 0.08) > 1e-9 || bonus.hp !== 0) throw new Error(`bônus ${JSON.stringify(bonus)}`);
  const choices = spellChoices("knight", 1, ["war_cry"], ["meteor"]).map((s) => s.id);
  if (!choices.includes("meteor") || !choices.includes("war_cry")) throw new Error(`escolhas ${choices}`);
  if (spellChoices("knight", 0, [], ["meteor"]).some((s) => s.id === "meteor")) throw new Error("o Meteoro é do slot 2");
  console.log(`regras ok (magia em ${Math.round(spellShare * 100)}% dos drops)`);
}

async function knightWithRunes() {
  const room = await client.create<any>(ROOM_NAME, { name: "Teste", classId: "knight", rulesVersion: RULES_VERSION });
  const spells: SpellMessage[] = [];
  room.onMessage(MSG.spell, (msg: SpellMessage) => spells.push(msg));
  for (const type of [MSG.notice, MSG.attack, MSG.damage, MSG.chain]) room.onMessage(type, () => {});
  room.onMessage(MSG.runEnded, (msg) => { throw new Error(`a hunt terminou antes da hora: ${JSON.stringify(msg)}`); });
  await wait(300);
  room.send(MSG.start);
  await wait(300);
  const me = () => room.state.players.get(room.sessionId);
  if (me().level < 8) throw new Error(`o servidor precisa de KUSA_START_LEVEL=8 (nível ${me().level})`);

  const runes = [...me().runes];
  if (runes.join(",") !== "rune-life,rune-time,rune-meteor") throw new Error(`runas ${runes} (o servidor precisa de KUSA_RUNES)`);
  const expected = statsFor("knight", 8, { hp: 0.18, mana: 0, damage: 0, speed: 0 }).maxHp;
  if (me().maxHp !== expected || me().hp !== expected) throw new Error(`vida ${me().hp}/${me().maxHp}, esperava ${expected}`);

  room.send(MSG.chooseSpell, { slot: 1, spellId: "meteor" });
  await wait(200);
  if (me().spell2 !== "meteor") throw new Error(`slot 2: ${me().spell2}`);
  // Um feitiço de outra classe sem runa continua recusado.
  room.send(MSG.chooseSpell, { slot: 0, spellId: "lightning_bolt" });
  await wait(200);
  if (me().spell1) throw new Error(`slot 1 aceitou ${me().spell1}`);

  room.send(MSG.cast, { slot: 1, aim: { x: me().x + 3, y: me().y } });
  await wait(300);
  if (!spells.some((s) => s.spellId === "meteor" && s.from === room.sessionId)) throw new Error("o Meteoro não saiu");
  // O cavaleiro tem pouca mana: a magia de runa custa no máximo 40% da mana máxima dele.
  const cost = spellManaCost(SPELLS.meteor, "knight", me().maxMana);
  if (cost >= SPELLS.meteor.manaCost || cost !== Math.ceil(me().maxMana * 0.4)) throw new Error(`custo ${cost}`);
  const cd = spellCooldownMs(SPELLS.meteor.cooldownMs, heroBonuses({}, runes));
  if (cd !== Math.round(SPELLS.meteor.cooldownMs * 0.88)) throw new Error(`recarga ${cd}`);
  console.log(`cavaleiro: runas ${runes.join(", ")}, vida ${me().maxHp}, Meteoro com recarga de ${cd} ms`);
  await room.leave();
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
