import {
  BAG_SIZE,
  BOSS_LOOT_BONUS,
  CLASSES,
  CLASS_IDS,
  COMMON_DROP_CHANCE,
  DEPTH_SCALING,
  ITEM_BUY_PRICES,
  ITEM_SELL_PRICES,
  MAPS,
  MAP_IDS,
  MAX_PARTY_SIZE,
  MONSTERS,
  PARTY_XP_BONUS,
  PERKS,
  PERK_IDS,
  POTIONS,
  POTION_COOLDOWN_MS,
  POTION_IDS,
  POTION_MAX,
  SPELLS,
  SPELL_SLOT_LEVELS,
  STARTER_SPELLS,
  TIER_NAMES,
  VAULT_SIZE,
  difficultyStars,
  type ItemTier,
} from "@kusa/shared";

// Configurações > Regras: como o jogo funciona, para o jogador. Os números vêm de `@kusa/shared`,
// então a página acompanha os ajustes de balanceamento sem precisar ser reescrita.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const minutes = (s: number) => `${s / 60} min`;
const [SLOT1, SLOT2] = SPELL_SLOT_LEVELS;

/** Uma seção que abre e fecha com um toque (a página é longa para uma tela de celular). */
function section(title: string, open: boolean, ...content: (HTMLElement | string)[]) {
  const details = el("details", "rule");
  details.open = open;
  details.append(el("summary", "", title));
  for (const c of content) details.append(typeof c === "string" ? el("p", "", c) : c);
  return details;
}

function list(items: string[]) {
  const ul = el("ul");
  for (const item of items) ul.append(el("li", "", item));
  return ul;
}

function table(head: string[], rows: string[][]) {
  const t = el("table", "rule-table");
  const tr = el("tr");
  head.forEach((h) => tr.append(el("th", "", h)));
  t.createTHead().append(tr);
  const body = t.createTBody();
  for (const row of rows) {
    const line = el("tr");
    row.forEach((cell) => line.append(el("td", "", cell)));
    body.append(line);
  }
  return t;
}

const TIERS = [1, 2, 3, 4, 5] as ItemTier[];

export function renderRules(root: HTMLElement) {
  root.replaceChildren(
    section("🎯 O objetivo", true,
      `Kusa é uma dungeon cooperativa para até ${MAX_PARTY_SIZE} jogadores. Você entra, mata monstros, junta loot e itens `
      + "e precisa sair vivo antes que o tempo acabe. O loot de quem sai vivo vira gold para comprar magias e equipamento no menu.",
      "Toda hunt começa do zero: nível 1, sem magia. O que você leva de uma hunt para outra é o equipamento, o gold e o Grimório.",
    ),

    section("👆 Controles", false, list([
      "Polegar esquerdo, na parte de baixo da tela: o joystick aparece onde você toca e move o herói.",
      "⚔️ ataque básico: um toque dá um golpe, segurar repete. Vai no alvo travado ou no monstro mais próximo ao alcance.",
      "Tocar num monstro trava o alvo nele (anel vermelho).",
      "Magias de alvo: segure o botão, arraste para mirar e solte para lançar. Voltar o dedo para o botão cancela. Um toque rápido lança no alvo automático.",
      "Poções: botões ❤️ e 💧 ao lado das magias.",
      "Bag: toque na fileira embaixo do loot para ver, equipar ou largar itens sem pausar a hunt.",
      "Minimapa: toque nele para ver o mapa inteiro.",
    ])),

    section("🗺️ Mapas e tempo", false,
      table(["Mapa", "Dificuldade", "Tempo", "Boss"], MAP_IDS.map((id) => {
        const m = MAPS[id];
        return [`${m.icon} ${m.name}`, difficultyStars(m.difficulty), minutes(m.durationSeconds), MONSTERS[m.boss].name];
      })),
      `Quem cria a sala escolhe o mapa. Cada sala mais funda é ${pct(DEPTH_SCALING)} mais forte que a anterior (vida, dano, XP e loot). `
      + "Salas laterais têm um mini-boss que guarda um baú; o boss fica no centro.",
      "Quando o tempo acaba, o mapa desaba e quem ainda estiver lá dentro morre soterrado.",
    ),

    section("🏁 Como a hunt termina", false,
      table(["Fim", "O que acontece"], [
        ["🚪 Fuga", "Volte à sala inicial e entre no portal: leva todo o loot e os itens."],
        ["🐉 Boss derrotado", `Matar o boss abre um portal na sala final: leva tudo e +${pct(BOSS_LOOT_BONUS)} de loot.`],
        ["💀 Morte", "Perde o loot, a bag inteira, as poções e 1 equipamento sorteado. Tudo cai no chão para os outros pegarem."],
        ["🪨 Soterrado", "O tempo acabou: igual à morte."],
      ]),
    ),

    section("⭐ Níveis, magias e melhorias", false, list([
      "Matar monstros dá XP. Cada nível aumenta vida, mana, dano e velocidade, e cura tudo.",
      `A XP de um monstro é dividida entre quem acertou nele, com +${pct(PARTY_XP_BONUS)} por participante extra. O loot vai para quem deu o último golpe.`,
      `No nível ${SLOT1} abre o 1º slot de magia e no nível ${SLOT2} o 2º: você escolhe uma magia, que fica até o fim da hunt.`,
      "Nos outros níveis aparecem duas melhorias e você toca numa. Elas valem até o fim da hunt e somam com as áureas do Grimório.",
    ]),
    table(["Melhoria", "Cada escolha", "Máx."], PERK_IDS.map((id) => {
      const p = PERKS[id];
      return [`${p.icon} ${p.name}`, p.description, String(p.maxStacks)];
    }))),

    section("🛡️ Classes", false,
      table(["Classe", "Vida", "Mana", "Alcance", "Magias iniciais"], CLASS_IDS.map((id) => {
        const c = CLASSES[id];
        const spells = STARTER_SPELLS.map((s) => SPELLS[s]).filter((s) => s.classId === id).map((s) => `${s.icon} ${s.name}`);
        return [c.name, String(c.baseHp), String(c.baseMana), c.attackRange === 1 ? "corpo a corpo" : `${c.attackRange} tiles`, spells.join(" · ")];
      })),
      "Vida e mana do nível 1, sem áureas. A classe é escolhida na aba Classes, antes de jogar.",
    ),

    section("✨ Grimório", false,
      "Na aba Grimório cada classe tem uma árvore de magias comprada com gold. Ela não se perde ao morrer.",
      list([
        "Magias novas viram opção na escolha do slot durante a hunt. Os níveis 2 e 3 de uma magia a deixam mais forte e mais longa.",
        "Áureas (dano, vida, mana e velocidade) valem sempre, desde o nível 1 da hunt.",
        "Cada nó pede o anterior do mesmo ramo: as magias da ponta são as mais caras.",
      ]),
    ),

    section("🎒 Itens, bag e cofre", false,
      list([
        "4 slots: arma (mais dano), capacete, armadura e escudo (armadura, que corta o dano recebido).",
        `Materiais, do pior ao melhor: ${TIERS.map((t) => TIER_NAMES[t]).join(", ")}.`,
        `Monstros comuns têm ${pct(COMMON_DROP_CHANCE)} de chance de dropar item; mini-bosses, bosses e baús sempre dropam. Salas fundas dão material melhor.`,
        "O item no chão é de quem passar por cima primeiro. Se for melhor que o seu, você veste na hora e o antigo vai para a bag.",
        `A bag tem ${BAG_SIZE} espaços e entra com você na hunt. Cheia, você não pega mais nada do chão.`,
        `Saindo vivo, a bag vai sozinha para o cofre (${VAULT_SIZE} espaços), que fica seguro na conta.`,
      ]),
      table(["Material", "Compra", "Venda"], TIERS.map((t) => [
        TIER_NAMES[t], ITEM_BUY_PRICES[t] == null ? "só na hunt" : `${ITEM_BUY_PRICES[t]} gold`, `${ITEM_SELL_PRICES[t]} gold`,
      ])),
    ),

    section("🧪 Poções", false, list([
      ...POTION_IDS.map((id) => {
        const p = POTIONS[id];
        return `${p.icon} ${p.name}: devolve ${pct(p.restore)} da ${p.stat === "hp" ? "vida" : "mana"} máxima.`;
      }),
      `Você carrega até ${POTION_MAX} de cada. A recarga de ${POTION_COOLDOWN_MS / 1000} s é a mesma para as duas.`,
      "Só caem dos monstros e baús, e valem só na hunt: as que sobram não vão para a conta.",
      "Com a barra cheia, a poção não é gasta.",
    ])),
  );
}
