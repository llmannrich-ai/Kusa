import type { ClassId } from "./classes.ts";
import type { Element } from "./traits.ts";

// Dons: passivas do Grimório compradas só com gold, com muitos níveis (plano em docs/GRIMORIO_4_PLANO.md, seção 7).
// Não ocupam slot e valem em toda hunt, como as áureas; o nível não sobe com o uso nem cai na morte. Cada nível soma
// um pouco de um efeito com mecânica (dano em morto-vivo, duração do gelo, força das criaturas...), nunca dano cru em
// tudo. Os marcos (comportamento novo a cada 5 níveis) chegam numa fase seguinte, com as reações e os gatilhos.
// A tabela `talents` no Supabase repete id, níveis, preço e pré-requisito de cada Dom (ver `talents.ts`).

/** Níveis de cada Dom. */
export const GIFT_MAX_RANK = 25;
/** Preço do 1º nível e quanto cada nível encarece (o banco calcula igual em `buy_talent`). */
export const GIFT_BASE_COST = 60;
export const GIFT_COST_GROWTH = 1.12;

/** Efeitos dos Dons somados (todos em fração, menos `armor`, que é em pontos). */
export interface GiftEffects {
  /** Dano do ataque básico. */
  basicDamage: number;
  /** Pontos de armadura, somados ao equipamento. */
  armor: number;
  /** Dano do herói e dos aliados a até `ALLY_DAMAGE_RADIUS` tiles (vale o maior entre os heróis por perto). */
  allyDamage: number;
  /** Dano (básico e magias) em monstro a `FAR_DAMAGE_TILES` tiles ou mais. */
  farDamage: number;
  /** Dano (básico e magias) em mortos-vivos. */
  undeadDamage: number;
  /** Velocidade de movimento (soma com a Áurea de velocidade). */
  speed: number;
  /** Dano das magias de cada elemento. */
  elementDamage: Partial<Record<Element, number>>;
  /** Duração das raízes, prisões e lentidões das magias do herói. */
  ccDuration: number;
  /** Fração do dano das magias de trevas que volta como vida. */
  darkLifesteal: number;
  /** Vida e dano das criaturas invocadas (soma com o Vínculo Selvagem). */
  summonBoost: number;
  /** Força das curas do herói (magias, campos e criaturas dele). */
  healPower: number;
  /** Dano dos venenos e sangramentos do herói. */
  dotDamage: number;
}

export const NO_GIFTS: GiftEffects = {
  basicDamage: 0, armor: 0, allyDamage: 0, farDamage: 0, undeadDamage: 0, speed: 0, elementDamage: {},
  ccDuration: 0, darkLifesteal: 0, summonBoost: 0, healPower: 0, dotDamage: 0,
};

/** Raio da Voz de Comando. */
export const ALLY_DAMAGE_RADIUS = 4;
/** Distância mínima do Olhar Paciente. */
export const FAR_DAMAGE_TILES = 4;
/** Teto de velocidade dos Dons (velocidade alta deixa o herói fugir de tudo). */
export const GIFT_SPEED_CAP = 0.1;

export type GiftId =
  | "honed_edge" | "tanned_hide" | "command_voice"
  | "patient_eye" | "burning_faith" | "tracker_step"
  | "conductor" | "cold_heart" | "shadow_hunger"
  | "pack_bond" | "ancient_sap" | "venom_sap";

export interface GiftDef {
  id: GiftId;
  classId: ClassId;
  /** Ramo do Grimório (coluna 0 a 2). */
  col: number;
  name: string;
  icon: string;
  /** O que o Dom faz, em uma frase (sem número: o número vem de `giftText`). */
  description: string;
  /** Quanto cada nível soma no efeito. */
  perRank: number;
  /** Aplica `value` (o total do nível) nos efeitos somados. */
  apply: (fx: GiftEffects, value: number) => void;
  /** Texto do efeito com o total de um nível. */
  text: (value: number) => string;
}

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`.replace(".", ",");
const addElement = (fx: GiftEffects, elements: Element[], value: number) => {
  for (const e of elements) fx.elementDamage[e] = (fx.elementDamage[e] ?? 0) + value;
};

const gift = (def: GiftDef) => def;

/** Os Dons do topo de cada ramo (linha 2 do Grimório, do lado oposto ao Tomo). */
export const GIFTS: Record<GiftId, GiftDef> = {
  // --- Cavaleiro ---------------------------------------------------------------------------------------------
  honed_edge: gift({
    id: "honed_edge", classId: "knight", col: 0, name: "Fio Temperado", icon: "🗡️",
    description: "A espada afiada a cada nível: o ataque básico bate mais forte.",
    perRank: 0.012, apply: (fx, v) => { fx.basicDamage += v; }, text: (v) => `+${pct(v)} de dano do ataque básico`,
  }),
  tanned_hide: gift({
    id: "tanned_hide", classId: "knight", col: 1, name: "Couro Curtido", icon: "🛡️",
    description: "Couro curtido por baixo da armadura: mais armadura em toda hunt.",
    perRank: 0.6, apply: (fx, v) => { fx.armor += v; }, text: (v) => `+${Math.round(v * 10) / 10} de armadura`.replace(".", ","),
  }),
  command_voice: gift({
    id: "command_voice", classId: "knight", col: 2, name: "Voz de Comando", icon: "🎖️",
    description: `Você e os aliados a até ${ALLY_DAMAGE_RADIUS} tiles (bots incluídos) causam mais dano. Entre vários comandantes, vale a voz mais forte.`,
    perRank: 0.01, apply: (fx, v) => { fx.allyDamage += v; }, text: (v) => `+${pct(v)} de dano para você e aliados a até ${ALLY_DAMAGE_RADIUS} tiles`,
  }),
  // --- Paladino ----------------------------------------------------------------------------------------------
  patient_eye: gift({
    id: "patient_eye", classId: "paladin", col: 0, name: "Olhar Paciente", icon: "🦅",
    description: `Quem mira com calma acerta onde dói: mais dano em monstros a ${FAR_DAMAGE_TILES} tiles ou mais (básico e magias).`,
    perRank: 0.012, apply: (fx, v) => { fx.farDamage += v; }, text: (v) => `+${pct(v)} de dano a ${FAR_DAMAGE_TILES} tiles ou mais`,
  }),
  burning_faith: gift({
    id: "burning_faith", classId: "paladin", col: 1, name: "Fé Ardente", icon: "✝️",
    description: "A fé queima os mortos que andam: mais dano em mortos-vivos (básico e magias).",
    perRank: 0.016, apply: (fx, v) => { fx.undeadDamage += v; }, text: (v) => `+${pct(v)} de dano em mortos-vivos`,
  }),
  tracker_step: gift({
    id: "tracker_step", classId: "paladin", col: 2, name: "Passo de Rastreador", icon: "🧭",
    description: `Passos leves de quem segue rastros: mais velocidade de movimento (até +${pct(GIFT_SPEED_CAP)}).`,
    perRank: 0.004, apply: (fx, v) => { fx.speed += v; }, text: (v) => `+${pct(Math.min(GIFT_SPEED_CAP, v))} de velocidade de movimento`,
  }),
  // --- Feiticeiro --------------------------------------------------------------------------------------------
  conductor: gift({
    id: "conductor", classId: "sorcerer", col: 0, name: "Condutor", icon: "⚡",
    description: "O corpo vira condutor dos elementos: mais dano nas magias de energia e de fogo.",
    perRank: 0.012, apply: (fx, v) => addElement(fx, ["energy", "fire"], v), text: (v) => `+${pct(v)} de dano nas magias de energia e de fogo`,
  }),
  cold_heart: gift({
    id: "cold_heart", classId: "sorcerer", col: 1, name: "Coração Frio", icon: "❄️",
    description: "O frio demora a sair: as raízes, prisões e lentidões das suas magias duram mais.",
    perRank: 0.01, apply: (fx, v) => { fx.ccDuration += v; }, text: (v) => `+${pct(v)} de duração das prisões e lentidões das suas magias`,
  }),
  shadow_hunger: gift({
    id: "shadow_hunger", classId: "sorcerer", col: 2, name: "Fome Sombria", icon: "🌑",
    description: "As trevas bebem por você: parte do dano das magias de trevas volta como vida.",
    perRank: 0.008, apply: (fx, v) => { fx.darkLifesteal += v; }, text: (v) => `${pct(v)} do dano das magias de trevas volta como vida`,
  }),
  // --- Druida ------------------------------------------------------------------------------------------------
  pack_bond: gift({
    id: "pack_bond", classId: "druid", col: 0, name: "Laço da Matilha", icon: "🐺",
    description: "Suas criaturas confiam em você: mais vida e mais dano em todas elas.",
    perRank: 0.012, apply: (fx, v) => { fx.summonBoost += v; }, text: (v) => `+${pct(v)} de vida e de dano das suas criaturas`,
  }),
  ancient_sap: gift({
    id: "ancient_sap", classId: "druid", col: 1, name: "Seiva Antiga", icon: "🌿",
    description: "A seiva das árvores mais velhas: todas as suas curas curam mais.",
    perRank: 0.01, apply: (fx, v) => { fx.healPower += v; }, text: (v) => `+${pct(v)} de cura`,
  }),
  venom_sap: gift({
    id: "venom_sap", classId: "druid", col: 2, name: "Seiva Venenosa", icon: "🌵",
    description: "Espinhos mergulhados em seiva amarga: seus venenos e sangramentos ferem mais.",
    perRank: 0.012, apply: (fx, v) => { fx.dotDamage += v; }, text: (v) => `+${pct(v)} de dano dos seus venenos e sangramentos`,
  }),
};

export function isGift(id: string): id is GiftId {
  return id in GIFTS;
}

/** Efeito de um Dom num nível (0 = sem efeito). */
export function giftText(id: GiftId, rank: number): string {
  const def = GIFTS[id];
  return def.text(def.perRank * rank);
}

/** Soma os Dons de uma lista de (id, nível). A velocidade para no teto. */
export function sumGifts(levels: { id: GiftId; rank: number }[]): GiftEffects {
  const fx: GiftEffects = { ...NO_GIFTS, elementDamage: {} };
  for (const { id, rank } of levels) if (rank > 0) GIFTS[id].apply(fx, GIFTS[id].perRank * rank);
  fx.speed = Math.min(GIFT_SPEED_CAP, fx.speed);
  return fx;
}
