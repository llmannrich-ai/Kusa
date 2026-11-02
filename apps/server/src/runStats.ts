/**
 * Números de cada jogador numa hunt, para balancear classes, magias, monstros e economia (ver telemetry.ts).
 * Sem dependência do servidor: a hunt solo do navegador também conta.
 */
import type { MonsterRank } from "@kusa/shared";

export interface RunStats {
  /** Segundo em que alcançou cada nível. */
  levelAt: Record<number, number>;
  /** Segundo em que entrou pela primeira vez em cada sala do caminho (a do boss é a última). */
  depthAt: Record<number, number>;
  /** Traços das especializações escolhidas no Grimório (ids de TRAITS). */
  specs: string[];
  /** Níveis das passivas compradas com gold que o herói levou (Dons, áureas e Tomos): id do nó → nível. */
  passives: Record<string, number>;
  /** Magias levadas para a hunt (as ativas no Grimório, até 3 por slot): as opções da escolha de cada slot. */
  spellsActive: string[];
  /**
   * Magia escolhida em cada slot, nível de uso dela (0 a 5), força extra das sinergias e do Tomo (fração) e quando:
   * { "1": { id, rank, bonus, at } }.
   */
  spellsChosen: Record<number, { id: string; rank: number; bonus: number; at: number }>;
  /** Melhorias escolhidas ao subir de nível, com as opções sorteadas, o nível e o segundo. */
  perksChosen: { id: string; offer: string[]; level: number; at: number }[];
  casts: Record<string, number>;
  /** Monstros atingidos pelas magias em leque, somados por magia (dividir por `casts` dá a média por lançamento). */
  fanHits: Record<string, number>;
  /** XP de uso ganho por magia (lançamentos em combate × segundos de recarga, antes do teto e da perda na morte). */
  spellXp: Record<string, number>;
  castFails: { noMana: number; noTarget: number; noRoom: number };
  /** Golpes básicos que foram no monstro mais próximo porque o alvo travado estava fora do alcance. */
  basicRetargets: number;
  /**
   * Tiros que podem errar (básico à distância e magias `isShot`), por fonte ("basic" ou id da magia): disparados,
   * errados (ninguém no caminho até o fim do alcance) e mirados à mão (arrastando o botão).
   */
  shots: Record<string, { fired: number; missed: number; aimed: number }>;
  /** Dano efetivo causado (sem contar o que passa da vida do monstro), por fonte: "basic", id da magia ou "summon:<tipo>" (criaturas invocadas). */
  damageDealt: Record<string, number>;
  /** Dano recebido por tipo de monstro, depois da armadura e do Grito de Guerra. */
  damageTaken: Record<string, number>;
  /** Dano recebido das habilidades especiais dos mini-bosses e bosses (golpe + veneno/queimadura), por tipo de monstro (já somado em `damageTaken`). */
  specialDamage: Record<string, number>;
  /** Dano recebido por habilidade de monstro ("<monstro>:<habilidade>", já somado em `damageTaken`). */
  abilityDamage: Record<string, number>;
  /** Tempo (ms) que este herói passou sob efeito de monstro: preso, atordoado, engolido, cego e corroído. */
  ccTaken: Record<string, number>;
  /** Dano que este herói deixou de causar por resistência ou imunidade dos monstros (negativo = vulnerabilidade rendeu a mais). */
  resisted: number;
  /** Dano evitado pela armadura, pelo Grito de Guerra e pelo escudo. */
  damageMitigated: number;
  /** Vida curada (em si e nos aliados), incluindo roubo de vida (magias e Sede de sangue), criaturas de cura e poções de vida. */
  healing: number;
  /** Mana devolvida aos aliados (e a si) por magias e criaturas, sem contar poções. */
  manaGiven: number;
  /** Tempo de controle aplicado nos monstros, em ms somados por monstro: raízes, atordoamento e lentidão. */
  ccMs: { root: number; stun: number; slow: number };
  /** Poções guardadas e bebidas por tipo, e mana devolvida pelas poções de mana. */
  potions: { picked: Record<string, number>; drunk: Record<string, number>; manaRestored: number };
  /** Abates (último golpe) por tipo de monstro. */
  kills: Record<string, number>;
  firstKillAt: number | null;
  xp: number;
  loot: { monsters: number; chests: number; bossBonus: number };
  chestsOpened: number;
  /** Bosses que deram a runa a este personagem nesta hunt (cada boss dá a runa uma vez por personagem). */
  bossRunes: string[];
  /** Estava na hunt quando o boss principal morreu: venceu o cenário (abre o seguinte da campanha). */
  bossClear: boolean;
  /** Bosses mortos enquanto este herói estava na hunt (vivo ou morto), na ordem; na Caverna da Travessia, os dos covis. */
  bossKills: string[];
  /**
   * Itens equipados que vieram da conta, bag que entrou na hunt, itens que pegou no chão, que largou pelo menu
   * da bag, que perdeu ao morrer (equipamento e bag), quantas vezes deixou item no chão por estar com a bag cheia e
   * quantos itens de equipamento deixaram de cair pela parte dos bots da equipe (`botCut`) e quantos caíram no chão
   * por fonte (`drops`: monstro comum, mini-boss, boss e baú, pegos ou não), para conferir a taxa de drop.
   */
  items: {
    loadout: string[]; bag: string[]; picked: string[]; dropped: string[]; lost: string[]; bagFull: number; botCut: number;
    drops: Record<MonsterRank | "chest", number>;
  };
  /** Menor vida na hunt, em fração do máximo (sustos). */
  minHpPct: number;
  /** true se fechou o jogo ou caiu durante a hunt (conta como morte). */
  abandoned: boolean;
  death: { by: string; depth: number; x: number; y: number; at: number } | null;
  /** Dano que os escudos (magias e Traços) absorveram neste herói (fora do `damageMitigated` da armadura). */
  absorbed: number;
  /** Monstros convertidos em aliado pelo Xamã Orc (Corrente da Submissão, Juramento de Sangue), por espécie. */
  converted: Record<string, number>;
  /** Tempo (ms) com bônus em si ou forma animal ativos (Postura, Fúria, Pantera, Urso...), somado por conjuração. */
  buffMs: number;
  /** Intervir (Traço do Guardião): dano que este herói puxou dos aliados para si. */
  intercepted: number;
  /** Renascer da Semente: nomes de quem este jogador salvou com a semente. */
  revives: string[];
  /** Este jogador renasceu de uma semente: de quem, quando e quanto dano levou depois de renascer. */
  revived: { by: string; at: number; damageAfter: number } | null;
  /** Bots na equipe quando a hunt começou (já contados em `partySize`). */
  bots: number;
  /** Tempo (ms) de hunt jogado com a tela deitada (Jogar deitado, beta); o resto foi em pé. */
  landscapeMs: number;
  /**
   * Runas Mestras: quantas vezes cada efeito disparou ("phoenix", "echo", "reaper", "vengeance") e, no Pacto, a vida
   * gasta no lugar da mana. A cura do Ceifador entra em `healing`; o dano da Vingança, em `damageDealt["rune:vengeance"]`.
   */
  runeProcs: Record<string, number>;
  /**
   * Dons do fundo: quantas vezes cada gatilho disparou (id do Dom). O dano extra entra em `damageDealt` (o raio do Céu
   * Fechado como "closed_sky", a queimadura da Mão Rápida como "quick_hand", os esqueletos do Ossuário como "summon:skeleton"); a cura do Ciclo, em `healing`; o
   * escudo da Reserva Gélida, em `absorbed`.
   */
  giftProcs: Record<string, number>;
  /**
   * Reações (`reactions.ts`) que o herói disparou, por id ("vapor", "shatter"...; o Exposto conta cada golpe
   * amplificado). O dano das explosões entra em `damageDealt["reaction:<id>"]`.
   */
  reactions: Record<string, number>;
}

export function newRunStats(): RunStats {
  return {
    levelAt: {}, depthAt: {}, specs: [], passives: {}, spellsActive: [], spellsChosen: {}, perksChosen: [], casts: {}, fanHits: {}, spellXp: {}, castFails: { noMana: 0, noTarget: 0, noRoom: 0 }, basicRetargets: 0, shots: {},
    damageDealt: {}, damageTaken: {}, specialDamage: {}, abilityDamage: {}, ccTaken: {}, resisted: 0, damageMitigated: 0, healing: 0, manaGiven: 0, ccMs: { root: 0, stun: 0, slow: 0 }, potions: { picked: {}, drunk: {}, manaRestored: 0 }, kills: {}, firstKillAt: null, xp: 0,
    loot: { monsters: 0, chests: 0, bossBonus: 0 }, chestsOpened: 0, bossRunes: [], bossClear: false, bossKills: [], items: { loadout: [], bag: [], picked: [], dropped: [], lost: [], bagFull: 0, botCut: 0, drops: { common: 0, miniboss: 0, boss: 0, chest: 0 } },
    minHpPct: 1, abandoned: false, death: null, absorbed: 0, converted: {}, buffMs: 0, intercepted: 0, revives: [], revived: null, bots: 0, landscapeMs: 0, runeProcs: {}, giftProcs: {}, reactions: {},
  };
}

/** Soma `amount` na chave de um contador. */
export function bump(counter: Record<string, number>, key: string, amount = 1) {
  counter[key] = (counter[key] ?? 0) + amount;
}

