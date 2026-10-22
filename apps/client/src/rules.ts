import {
  BAG_SIZE,
  BOSS_LOOT_BONUS,
  CLASSES,
  CLASS_IDS,
  COMMON_DROP_CHANCE,
  DEPTH_SCALING,
  ITEM_BUY_PRICES,
  ITEM_SELL_PRICES,
  ITEM_RARITIES,
  RARITY_NAMES,
  RARITY_SELL,
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
  mapMonsters,
  CHAMPION_CHANCE,
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
        return [`${m.icon} ${m.name}`, difficultyStars(m.difficulty), minutes(m.durationSeconds), m.bosses.map(([k]) => MONSTERS[k].name).join(" ou ")];
      })),
      `Quem cria a sala escolhe o mapa. Cada sala mais funda é ${pct(DEPTH_SCALING)} mais forte que a anterior (vida, dano, XP e loot). `
      + "Os monstros de cada sala são sorteados a cada hunt. Salas laterais têm um mini-boss que guarda um baú; o boss fica no centro. "
      + "Na Cripta, alguns baús são Mímicos.",
      "Quando o tempo acaba, o mapa desaba e quem ainda estiver lá dentro morre soterrado.",
    ),

    section("👹 Bestiário", false,
      "Nenhum golpe de monstro tem aviso: conheça cada um antes de entrar. Monstros resistem a alguns elementos e são "
      + "vulneráveis a outros (o número aparece em cinza ou amarelo). Mortos-vivos não envenenam nem sangram. "
      + `${pct(CHAMPION_CHANCE)} dos monstros comuns nascem Campeões (nome dourado): mais vida, mais loot e um poder extra.`,
      ...MAP_IDS.map((id) => {
        const m = MAPS[id];
        return table([`${m.icon} ${m.name}`, "Como joga"], mapMonsters(m).map((kind) => {
          const def = MONSTERS[kind];
          const rank = def.rank === "boss" ? " (boss)" : def.rank === "miniboss" ? " (mini-boss)" : "";
          return [`${def.name}${rank}`, def.lore];
        }));
      }),
      "Controle num herói (preso, atordoado, engolido, cego) dura no máximo 2 s, e depois ele fica 4 s imune ao mesmo efeito.",
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
        "6 slots: arma, capacete, armadura, calça, botas e escudo. Armadura corta o dano recebido; botas dão velocidade.",
        "Armas são da classe: espada e machado (Cavaleiro), arco e besta (Paladino), varinha e cajado (Feiticeiro e Druida).",
        "Só varinhas, cajados e alguns itens mágicos aumentam o dano das magias; as outras armas aumentam o ataque básico.",
        "Armaduras de guerra são do Cavaleiro e do Paladino; vestes arcanas (chapéu, manto e calças), do Feiticeiro e do Druida.",
        `Materiais, do pior ao melhor: ${TIERS.map((t) => TIER_NAMES[t]).join(", ")}.`,
        `Raridades: ${ITEM_RARITIES.map((r) => RARITY_NAMES[r]).join(", ")}. O raro (+1) é 30% mais forte; o mágico tem nome próprio, é 60% mais forte e ganha uma propriedade (roubo de vida, chamas, espinhos, velocidade...).`,
        `Monstros comuns têm ${pct(COMMON_DROP_CHANCE)} de chance de dropar item; mini-bosses, bosses e baús sempre dropam. Salas fundas dão material melhor.`,
        "O item no chão é de quem passar por cima primeiro. Se for melhor que o seu, você veste na hora e o antigo vai para a bag.",
        `A bag tem ${BAG_SIZE} espaços e entra com você na hunt. Cheia, você não pega mais nada do chão.`,
        `Saindo vivo, a bag vai sozinha para o cofre (${VAULT_SIZE} espaços), que fica seguro na conta.`,
      ]),
      table(["Material", "Compra (comum)", "Venda (comum · raro · mágico)"], TIERS.map((t) => [
        TIER_NAMES[t], ITEM_BUY_PRICES[t] == null ? "só na hunt" : `${ITEM_BUY_PRICES[t]} gold`,
        ITEM_RARITIES.map((r) => ITEM_SELL_PRICES[t] * RARITY_SELL[r]).join(" · ") + " gold",
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
