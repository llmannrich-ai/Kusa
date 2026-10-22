import type { ClassId } from "./classes.ts";

// Traços: a passiva de cada especialização do Grimório. No fim de um ramo, a árvore se divide em dois
// lados; cada lado tem um Traço e duas magias. Comprar o Traço de um lado tranca o outro para sempre
// (a escolha é permanente, como a subclasse do D&D). O Traço vale sempre, como as áureas; as magias do
// lado viram opção na hunt como as outras. Ver docs/GRIMORIO_PLANO.md (seções 4 e 6).

export type TraitId =
  | "eagle_eye" | "light_step"
  | "consecrated_arrows" | "sacred_aura"
  | "gunpowder" | "ingenious"
  | "static_charge" | "combustion" | "shatter" | "mana_shield" | "harvest" | "hex"
  | "wild_bond" | "wild_hide" | "bloom" | "protective_sap" | "toxin" | "charged_sky"
  | "battle_thirst" | "riposte" | "intervene" | "last_bastion" | "leadership" | "intimidate";

export interface TraitDef {
  id: TraitId;
  classId: ClassId;
  /** Nome da especialização (o lado do ramo) e do Traço. */
  spec: string;
  name: string;
  icon: string;
  description: string;
  /** +tiles de alcance no ataque básico. */
  basicRange?: number;
  /** +`bonus` (fração) de dano em monstros a `minTiles` tiles ou mais de quem bate (básico e magias). */
  farDamage?: { minTiles: number; bonus: number };
  /** Depois de conjurar uma magia, +`speed` (fração) de velocidade por `ms`. */
  castHaste?: { speed: number; ms: number };
  /** Ataque básico: +`undead` (fração) de dano em mortos-vivos e queimadura de `perSec` × dano base por `ms`. */
  holyBasic?: { undead: number; perSec: number; ms: number };
  /** Aliados (e o próprio herói) a até `radius` tiles recebem `pct` a menos de dano. */
  allyWard?: { radius: number; pct: number };
  /** Magias de área do herói deixam o chão em chamas: `perSec` × dano base por segundo, por `ms`. */
  areaFire?: { perSec: number; ms: number };
  /** Armadilhas e estacas duram `durationScale` vezes mais e cabem `max` de cada magia ao mesmo tempo. */
  traps?: { durationScale: number; max: number };
  /** Magias do `element` têm `chance` de atordoar cada monstro atingido por `ms`. */
  stunChance?: { element: Element; chance: number; ms: number };
  /** Magias com dano queimam os atingidos: `perSec` × dano base por segundo, por `ms`. */
  spellBurn?: { perSec: number; ms: number };
  /** Dano de magia em monstro preso (raízes, gelo) sai `bonus` maior e solta o monstro. */
  shatter?: { bonus: number };
  /** `pct` do dano recebido sai da mana em vez da vida (enquanto houver mana). */
  manaShield?: { pct: number };
  /** Monstro morto por magia sua devolve `pct` da mana máxima. */
  harvest?: { pct: number };
  /** Magias de alvo único marcam o alvo: +`pct` de dano de toda a equipe por `ms`. */
  hex?: { pct: number; ms: number };
  /** Criaturas invocadas com +`summonBoost` (fração) de vida e de dano. */
  summonBoost?: number;
  /** +pontos de armadura enquanto o herói está numa forma animal. */
  formArmor?: number;
  /** Cura do herói além da vida máxima vira escudo, até `max` (fração da vida máxima) por `ms`. */
  overheal?: { max: number; ms: number };
  /** Quem o herói cura (magias e criaturas) ganha +`points` de armadura por `ms`. */
  healArmor?: { points: number; ms: number };
  /**
   * Magias com dano envenenam (`perSec` × dano base por segundo, por `ms`), e os venenos do herói acumulam até
   * `maxStacks` vezes no mesmo monstro.
   */
  toxin?: { perSec: number; ms: number; maxStacks: number };
  /** A cada `every` magias, um raio (`damage` ×) cai no monstro mais perto a até `range` tiles. */
  chargedSky?: { every: number; damage: number; range: number };
  /** +`perMonster` (fração) de dano por monstro colado no herói, até `max` monstros (básico e magias). */
  crowdDamage?: { perMonster: number; max: number };
  /** Golpe corpo a corpo recebido tem `chance` de ser devolvido: `damage` × dano base no monstro que bateu. */
  riposte?: { chance: number; damage: number };
  /** `pct` do dano que os aliados a até `radius` tiles levam de monstros vem para este herói. */
  intervene?: { radius: number; pct: number };
  /** Ao cair abaixo de `hpPct` da vida, ganha escudo de `barrier` (fração da vida) por `ms`, uma vez a cada `cooldownMs`. */
  lastStand?: { hpPct: number; barrier: number; ms: number; cooldownMs: number };
  /** O herói e os aliados a até `radius` tiles causam +`pct` (fração) de dano. Não acumula entre líderes. */
  leadership?: { radius: number; pct: number };
  /** Monstros provocados pelo herói (e ainda atrás dele) causam `pct` a menos de dano nele. */
  intimidate?: { pct: number };
}

/** Elemento de uma magia do Feiticeiro (Estática vale para energia). */
export type Element = "energy" | "fire" | "ice" | "dark";

const trait = (def: TraitDef) => def;

export const TRAITS: Record<TraitId, TraitDef> = {
  // Paladino, ramo Mira.
  eagle_eye: trait({
    id: "eagle_eye", classId: "paladin", spec: "Atirador de Elite", name: "Olho de Águia", icon: "🦅",
    description: "+1 de alcance no ataque básico e +20% de dano em monstros a 5 tiles ou mais.",
    basicRange: 1, farDamage: { minTiles: 5, bonus: 0.2 },
  }),
  light_step: trait({
    id: "light_step", classId: "paladin", spec: "Caçador Ágil", name: "Passo Leve", icon: "🍃",
    description: "Depois de cada magia, anda 25% mais rápido por 2 s.",
    castHaste: { speed: 0.25, ms: 2000 },
  }),
  // Paladino, ramo Luz.
  consecrated_arrows: trait({
    id: "consecrated_arrows", classId: "paladin", spec: "Cruzado", name: "Flechas Consagradas", icon: "✝️",
    description: "O ataque básico causa +30% em mortos-vivos e queima o alvo por 2 s.",
    holyBasic: { undead: 0.3, perSec: 0.15, ms: 2000 },
  }),
  sacred_aura: trait({
    id: "sacred_aura", classId: "paladin", spec: "Guardião da Luz", name: "Aura Sagrada", icon: "😇",
    description: "Você e os aliados a até 3 tiles recebem 10% menos dano.",
    allyWard: { radius: 3, pct: 0.1 },
  }),
  // Paladino, ramo Batedor.
  gunpowder: trait({
    id: "gunpowder", classId: "paladin", spec: "Artilheiro", name: "Pólvora", icon: "🧨",
    description: "Suas magias de área deixam o chão em chamas por 3 s.",
    areaFire: { perSec: 0.25, ms: 3000 },
  }),
  ingenious: trait({
    id: "ingenious", classId: "paladin", spec: "Armadilheiro", name: "Engenhoso", icon: "⚙️",
    description: "Armadilhas e estacas duram o dobro, e cabem 3 de cada ao mesmo tempo.",
    traps: { durationScale: 2, max: 3 },
  }),
  // Feiticeiro, ramo Raio.
  static_charge: trait({
    id: "static_charge", classId: "sorcerer", spec: "Tempestuoso", name: "Estática", icon: "🌩️",
    description: "Magias de energia têm 25% de chance de atordoar cada monstro atingido por 0,5 s.",
    stunChance: { element: "energy", chance: 0.25, ms: 500 },
  }),
  combustion: trait({
    id: "combustion", classId: "sorcerer", spec: "Piromante", name: "Combustão", icon: "🔥",
    description: "Suas magias que causam dano queimam os atingidos por 4 s.",
    spellBurn: { perSec: 0.2, ms: 4000 },
  }),
  // Feiticeiro, ramo Gelo.
  shatter: trait({
    id: "shatter", classId: "sorcerer", spec: "Criomante", name: "Estilhaçar", icon: "💎",
    description: "Magia em monstro preso causa +50% de dano e quebra o gelo (ele fica solto).",
    shatter: { bonus: 0.5 },
  }),
  mana_shield: trait({
    id: "mana_shield", classId: "sorcerer", spec: "Arcanista", name: "Escudo de Mana", icon: "🔷",
    description: "30% do dano que você recebe sai da mana em vez da vida, enquanto houver mana.",
    manaShield: { pct: 0.3 },
  }),
  // Feiticeiro, ramo Trevas.
  harvest: trait({
    id: "harvest", classId: "sorcerer", spec: "Necromante", name: "Colheita", icon: "💀",
    description: "Cada monstro que você mata com uma magia devolve 3% da sua mana.",
    harvest: { pct: 0.03 },
  }),
  hex: trait({
    id: "hex", classId: "sorcerer", spec: "Bruxo", name: "Maldição", icon: "👁️",
    description: "Suas magias de alvo único amaldiçoam o alvo: ele recebe +15% de dano de toda a equipe por 5 s.",
    hex: { pct: 0.15, ms: 5000 },
  }),
  // Cavaleiro, ramo Lâmina.
  battle_thirst: trait({
    id: "battle_thirst", classId: "knight", spec: "Berserker", name: "Sede de Batalha", icon: "💢",
    description: "+5% de dano por monstro colado em você (até 5 monstros).",
    crowdDamage: { perMonster: 0.05, max: 5 },
  }),
  riposte: trait({
    id: "riposte", classId: "knight", spec: "Duelista", name: "Riposta", icon: "🤺",
    description: "20% de chance de devolver na hora o golpe corpo a corpo que você leva.",
    riposte: { chance: 0.2, damage: 1 },
  }),
  // Cavaleiro, ramo Bastião.
  intervene: trait({
    id: "intervene", classId: "knight", spec: "Guardião", name: "Intervir", icon: "🤝",
    description: "30% do dano que os aliados a até 2 tiles levam de monstros vem para você.",
    intervene: { radius: 2, pct: 0.3 },
  }),
  last_bastion: trait({
    id: "last_bastion", classId: "knight", spec: "Inabalável", name: "Último Bastião", icon: "🏯",
    description: "Ao cair abaixo de 25% da vida, ganha um escudo de 30% da vida por 6 s (uma vez a cada 60 s).",
    lastStand: { hpPct: 0.25, barrier: 0.3, ms: 6000, cooldownMs: 60000 },
  }),
  // Cavaleiro, ramo Comando.
  leadership: trait({
    id: "leadership", classId: "knight", spec: "Senhor da Guerra", name: "Liderança", icon: "👑",
    description: "Você e os aliados a até 4 tiles causam +8% de dano.",
    leadership: { radius: 4, pct: 0.08 },
  }),
  intimidate: trait({
    id: "intimidate", classId: "knight", spec: "Desafiante", name: "Intimidar", icon: "😠",
    description: "Monstros que você provocou causam 25% menos dano em você.",
    intimidate: { pct: 0.25 },
  }),
  // Druida, ramo Matilha.
  wild_bond: trait({
    id: "wild_bond", classId: "druid", spec: "Mestre das Feras", name: "Vínculo Selvagem", icon: "🐕",
    description: "Suas criaturas têm +25% de vida e de dano.",
    summonBoost: 0.25,
  }),
  wild_hide: trait({
    id: "wild_hide", classId: "druid", spec: "Metamorfo", name: "Pele Selvagem", icon: "🐾",
    description: "+4 de armadura enquanto você está numa forma animal.",
    formArmor: 4,
  }),
  // Druida, ramo Bosque.
  bloom: trait({
    id: "bloom", classId: "druid", spec: "Círculo da Vida", name: "Florescer", icon: "🌸",
    description: "Suas curas que passam da vida máxima viram escudo (até 20% da vida) por 6 s.",
    overheal: { max: 0.2, ms: 6000 },
  }),
  protective_sap: trait({
    id: "protective_sap", classId: "druid", spec: "Guardião da Natureza", name: "Seiva Protetora", icon: "🍯",
    description: "Quem você cura (com magias ou criaturas) ganha +3 de armadura por 4 s.",
    healArmor: { points: 3, ms: 4000 },
  }),
  // Druida, ramo Espinhos.
  toxin: trait({
    id: "toxin", classId: "druid", spec: "Peste", name: "Toxina", icon: "🧪",
    description: "Suas magias com dano envenenam, e seus venenos acumulam até 3 vezes no mesmo monstro.",
    toxin: { perSec: 0.15, ms: 4000, maxStacks: 3 },
  }),
  charged_sky: trait({
    id: "charged_sky", classId: "druid", spec: "Tempestade", name: "Céu Carregado", icon: "🌩️",
    description: "A cada 4 magias, um raio cai no monstro mais perto de você.",
    chargedSky: { every: 4, damage: 2, range: 6 },
  }),
};

export function isTrait(id: string): id is TraitId {
  return id in TRAITS;
}
