import type { ClassId } from "./classes.ts";
import type { SpellId } from "./spells.ts";
import type { Element } from "./traits.ts";

// Dons: passivas do Grimório compradas só com gold, com muitos níveis (plano em docs/GRIMORIO_4_PLANO.md, seção 7).
// Não ocupam slot e valem em toda hunt, como as áureas; o nível não sobe com o uso nem cai na morte. Cada nível soma
// um pouco de um efeito com mecânica (dano em morto-vivo, duração do gelo, força das criaturas...), nunca dano cru em
// tudo. A cada `GIFT_MILESTONE_EVERY` níveis o Dom ganha um marco: um comportamento novo (`milestones`), como a Maestria das
// magias. O servidor lê quantos marcos o herói tem (`GiftEffects.marks`) e liga cada um no gancho certo da `Hunt`.
// Os Dons do topo ficam no alto de cada ramo, presos ao primeiro nó do tronco. Os Dons do fundo (`apex`) ficam embaixo
// do Ápice do ramo, pedem o Ápice no nível 1 e trazem um gatilho de momento (vida baixa, parado, depois do salto, a cada
// tantas magias, ao matar...), sempre ligado ao estilo do Ápice.
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
  // --- Dons do fundo (gatilhos) ---
  /** Dano com a vida abaixo de `LOW_HP_PCT` (Último Duelo). */
  lowHpDamage: number;
  /** Dano recebido a menos depois de `STILL_MS` parado (Pedra Fundamental). */
  stillGuard: number;
  /** Velocidade de ataque sua e dos aliados a até `BANNER_RADIUS` tiles, sempre ligada (Estandarte Vivo). */
  bannerHaste: number;
  /** Dano do próximo básico depois de um salto ou rolamento (Fôlego do Caçador). */
  dashBasic: number;
  /** Dano da magia seguinte a cada `GRACE_EVERY` magias, que também sai sem mana (Graça). */
  graceDamage: number;
  /** Chance de o básico sair incendiário (Mão Rápida). */
  burnChance: number;
  /** Dano da magia seguinte a `CIRCUIT_ELEMENTS` elementos diferentes em `CIRCUIT_MS`, que também sai sem mana (Circuito). */
  circuitDamage: number;
  /** Escudo (fração da vida máxima) ao ficar abaixo de `FROST_MANA_PCT` da mana (Reserva Gélida). */
  frostBarrier: number;
  /** Chance de um monstro morto por magia de trevas levantar um esqueleto seu (Ossuário). */
  raiseChance: number;
  /** Dano extra da mordida de cada `BITE_EVERY`º básico, somado a `BITE_BASE` (Instinto). */
  fourthBite: number;
  /** Cura (fração da vida máxima, somada a `CYCLE_BASE`) em volta a cada `CYCLE_HEAL` de cura feita (Ciclo). */
  cycleHeal: number;
  /** Chance de um raio cair quando morre um monstro envenenado ou sangrando por você (Céu Fechado). */
  skyStrike: number;
  /** Marcos de cada Dom (0 a `GIFT_MILESTONES`): nível ÷ `GIFT_MILESTONE_EVERY`. Só os Dons que já têm marcos. */
  marks: Partial<Record<GiftId, number>>;
}

export const NO_GIFTS: GiftEffects = {
  basicDamage: 0, armor: 0, allyDamage: 0, farDamage: 0, undeadDamage: 0, speed: 0, elementDamage: {},
  ccDuration: 0, darkLifesteal: 0, summonBoost: 0, healPower: 0, dotDamage: 0,
  lowHpDamage: 0, stillGuard: 0, bannerHaste: 0, dashBasic: 0, graceDamage: 0, burnChance: 0, circuitDamage: 0,
  frostBarrier: 0, raiseChance: 0, fourthBite: 0, cycleHeal: 0, skyStrike: 0, marks: {},
};

/** Raio da Voz de Comando. */
export const ALLY_DAMAGE_RADIUS = 4;
/** Distância mínima do Olhar Paciente. */
export const FAR_DAMAGE_TILES = 4;
/** Teto de velocidade dos Dons (velocidade alta deixa o herói fugir de tudo). */
export const GIFT_SPEED_CAP = 0.1;
/** Um marco a cada tantos níveis (5, 10, 15, 20 e 25). */
export const GIFT_MILESTONE_EVERY = 5;
export const GIFT_MILESTONES = 5;

// Números dos marcos do Cavaleiro (os textos ficam em `milestones` de cada Dom).
/** Fio Temperado: o golpe da série (o 4º; o 3º no marco 3) sangra e vira corte em leque. */
export const EDGE = { every: 4, everyLater: 3, bleedPerSec: 0.3, bleedMs: 3000, fanRange: 1, fanAngle: 60, fanAngleLater: 90 } as const;
/** Couro Curtido: escudos mais fortes, vida extra e o corte de dano quando um escudo quebra. */
export const HIDE = { shield: 0.1, hp: 0.05, breakGuard: 0.3, breakMs: 2000 } as const;
/** Voz de Comando: raio a mais por marco, provocar mais longe, velocidade e o escudo de socorro. */
export const VOICE = { tauntRadius: 1, speed: 0.05, rescueHpPct: 0.2, rescueShield: 0.15, rescueMs: 6000, rescueCooldownMs: 60000 } as const;
/** Último Duelo: roubo de vida, limiar maior, ritmo de ataque e a recarga do slot 3 com a vida baixa. */
export const DUEL = { lifesteal: 0.1, lifestealLater: 0.15, hpPctLater: 0.35, haste: 0.15, slot3Cooldown: 0.5 } as const;
/** Pedra Fundamental: regeneração, provocação, armadura e o tempo parado menor. */
export const BEDROCK = { regen: 0.01, tauntEveryMs: 3000, armor: 5, stillMsLater: 500 } as const;
/** Estandarte Vivo: armadura na aura, cura ao matar e o corte de dano depois do slot 3. */
export const BANNER = { armor: 3, killHeal: 0.02, ward: 0.1, wardMs: 3000 } as const;

// Gatilhos dos Dons do fundo.
/** Último Duelo: vale abaixo desta fração da vida. */
export const LOW_HP_PCT = 0.3;
/** Pedra Fundamental: parado há tanto tempo. */
export const STILL_MS = 1000;
/** Estandarte Vivo: raio da aura. */
export const BANNER_RADIUS = 3;
/** Graça: a cada tantas magias. */
export const GRACE_EVERY = 10;
/** Mão Rápida: duração da queimadura e dano por segundo (vezes o dano do básico). */
export const BURN_MS = 3000;
export const BURN_PER_SEC = 0.4;
/** Circuito: elementos diferentes dentro da janela. */
export const CIRCUIT_ELEMENTS = 3;
export const CIRCUIT_MS = 8000;
/** Reserva Gélida: limiar de mana, duração do escudo e recarga. */
export const FROST_MANA_PCT = 0.15;
export const FROST_MS = 6000;
export const FROST_COOLDOWN_MS = 30000;
/** Ossuário: duração dos esqueletos e quantos de uma vez. */
export const OSSUARY_MS = 8000;
export const OSSUARY_MAX = 2;
/** Instinto: a cada tantos básicos, e a força da mordida no nível 1 (vezes o dano do básico, antes do Dom). */
export const BITE_EVERY = 4;
export const BITE_BASE = 0.5;
/** Ciclo: cura feita para soltar a onda, a cura dela antes do Dom (fração da vida máxima) e o raio. */
export const CYCLE_HEAL = 300;
export const CYCLE_BASE = 0.05;
export const CYCLE_RADIUS = 1;
/** Céu Fechado: força do raio (vezes o dano mágico) e até onde ele procura monstro. */
export const SKY_STRIKE_DAMAGE = 1.5;
export const SKY_STRIKE_TILES = 4;

export type GiftId =
  | "honed_edge" | "tanned_hide" | "command_voice"
  | "patient_eye" | "burning_faith" | "tracker_step"
  | "conductor" | "cold_heart" | "shadow_hunger"
  | "pack_bond" | "ancient_sap" | "venom_sap"
  | "clan_cry" | "ironwood_skin" | "living_ember"
  | "last_duel" | "bedrock" | "living_banner"
  | "hunter_breath" | "grace" | "quick_hand"
  | "circuit" | "frost_reserve" | "ossuary"
  | "instinct" | "cycle" | "closed_sky";

export interface GiftDef {
  id: GiftId;
  classId: ClassId;
  /** Ramo do Grimório (coluna 0 a 2). */
  col: number;
  /** Dom do fundo: fica embaixo deste Ápice e pede o Ápice no nível 1. Sem isso, é Dom do topo. */
  apex?: SpellId;
  name: string;
  icon: string;
  /** O que o Dom faz, em uma frase (sem número: o número vem de `giftText`). */
  description: string;
  /** Quanto cada nível soma no efeito. */
  perRank: number;
  /** Os 5 marcos (níveis 5, 10, 15, 20 e 25), em uma frase cada. Sem isso, o Dom ainda não tem marcos. */
  milestones?: readonly [string, string, string, string, string];
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

/** Os Dons de cada ramo: os do topo (linha 2 do Grimório, do lado oposto ao Tomo) e os do fundo (embaixo do Ápice). */
export const GIFTS: Record<GiftId, GiftDef> = {
  // --- Cavaleiro ---------------------------------------------------------------------------------------------
  honed_edge: gift({
    id: "honed_edge", classId: "knight", col: 0, name: "Fio Temperado", icon: "🗡️",
    description: "A espada afiada a cada nível: o ataque básico bate mais forte.",
    perRank: 0.012, apply: (fx, v) => { fx.basicDamage += v; }, text: (v) => `+${pct(v)} de dano do ataque básico`,
    milestones: [
      `a cada ${EDGE.every} golpes, o golpe faz sangrar por ${EDGE.bleedMs / 1000}s`,
      `esse golpe vira um corte em leque de ${EDGE.fanAngle}°`,
      `a cada ${EDGE.everyLater} golpes`,
      "o leque também faz sangrar",
      `o leque abre a ${EDGE.fanAngleLater}°`,
    ],
  }),
  tanned_hide: gift({
    id: "tanned_hide", classId: "knight", col: 1, name: "Couro Curtido", icon: "🛡️",
    description: "Couro curtido por baixo da armadura: mais armadura em toda hunt.",
    perRank: 0.6, apply: (fx, v) => { fx.armor += v; }, text: (v) => `+${Math.round(v * 10) / 10} de armadura`.replace(".", ","),
    milestones: [
      `seus escudos absorvem +${pct(HIDE.shield)}`,
      "imune às lentidões dos monstros",
      `+${pct(HIDE.hp)} de vida`,
      `escudos +${pct(HIDE.shield)} (+${pct(HIDE.shield * 2)} no total)`,
      `quando um escudo seu quebra, ${HIDE.breakMs / 1000}s com ${pct(HIDE.breakGuard)} menos dano`,
    ],
  }),
  command_voice: gift({
    id: "command_voice", classId: "knight", col: 2, name: "Voz de Comando", icon: "🎖️",
    description: `Você e os aliados a até ${ALLY_DAMAGE_RADIUS} tiles (bots incluídos) causam mais dano. Entre vários comandantes, vale a voz mais forte.`,
    perRank: 0.01, apply: (fx, v) => { fx.allyDamage += v; }, text: (v) => `+${pct(v)} de dano para você e aliados a até ${ALLY_DAMAGE_RADIUS} tiles`,
    milestones: [
      `alcance ${ALLY_DAMAGE_RADIUS + 1}`,
      `suas magias que provocam alcançam +${VOICE.tauntRadius} tile`,
      `você e os aliados na voz andam +${pct(VOICE.speed)} mais rápido`,
      `alcance ${ALLY_DAMAGE_RADIUS + 2}`,
      `aliado na voz que cai abaixo de ${pct(VOICE.rescueHpPct)} da vida ganha escudo de ${pct(VOICE.rescueShield)} (uma vez a cada ${VOICE.rescueCooldownMs / 1000}s)`,
    ],
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
  // --- Xamã Orc ----------------------------------------------------------------------------------------------
  clan_cry: gift({
    id: "clan_cry", classId: "shaman", col: 0, name: "Grito do Clã", icon: "📯",
    description: `O clã luta junto: você e os aliados a até ${ALLY_DAMAGE_RADIUS} tiles (bots incluídos) causam mais dano. Entre vários, vale o grito mais forte.`,
    perRank: 0.01, apply: (fx, v) => { fx.allyDamage += v; }, text: (v) => `+${pct(v)} de dano para você e aliados a até ${ALLY_DAMAGE_RADIUS} tiles`,
  }),
  ironwood_skin: gift({
    id: "ironwood_skin", classId: "shaman", col: 1, name: "Casca de Ferro", icon: "🪵",
    description: "Placas de madeira-de-ferro entalhadas presas no couro: mais armadura em toda hunt.",
    perRank: 0.6, apply: (fx, v) => { fx.armor += v; }, text: (v) => `+${Math.round(v * 10) / 10} de armadura`.replace(".", ","),
  }),
  living_ember: gift({
    id: "living_ember", classId: "shaman", col: 2, name: "Brasa Viva", icon: "🔥",
    description: "A brasa do cajado nunca apaga: o ataque básico bate mais forte.",
    perRank: 0.012, apply: (fx, v) => { fx.basicDamage += v; }, text: (v) => `+${pct(v)} de dano do ataque básico`,
  }),
  // --- Dons do fundo: um embaixo de cada Ápice ------------------------------------------------------------
  last_duel: gift({
    id: "last_duel", classId: "knight", col: 0, apex: "champion_reap", name: "Último Duelo", icon: "⚔️",
    description: `Encurralado, o campeão bate mais forte: com a vida abaixo de ${pct(LOW_HP_PCT)}, mais dano (básico e magias).`,
    perRank: 0.016, apply: (fx, v) => { fx.lowHpDamage += v; }, text: (v) => `+${pct(v)} de dano com a vida abaixo de ${pct(LOW_HP_PCT)}`,
    milestones: [
      `com a vida baixa, ${pct(DUEL.lifesteal)} do dano volta como vida`,
      `vale abaixo de ${pct(DUEL.hpPctLater)} da vida`,
      `com a vida baixa, ataca ${pct(DUEL.haste)} mais rápido`,
      `roubo de vida de ${pct(DUEL.lifestealLater)}`,
      "com a vida baixa, a magia do slot 3 recarrega na metade do tempo",
    ],
  }),
  bedrock: gift({
    id: "bedrock", classId: "knight", col: 1, apex: "bulwark", name: "Pedra Fundamental", icon: "🏯",
    description: `Pés fincados viram muralha: parado há ${STILL_MS / 1000}s ou mais, você recebe menos dano.`,
    perRank: 0.012, apply: (fx, v) => { fx.stillGuard += v; }, text: (v) => `-${pct(v)} de dano recebido depois de ${STILL_MS / 1000}s parado`,
    milestones: [
      `parado, regenera ${pct(BEDROCK.regen)} da vida por segundo`,
      `parado, provoca os monstros colados a cada ${BEDROCK.tauntEveryMs / 1000}s`,
      `parado, +${BEDROCK.armor} de armadura`,
      `conta como parado depois de ${BEDROCK.stillMsLater / 1000}s`.replace(".", ","),
      "parado, o ataque básico corta todos os monstros colados",
    ],
  }),
  living_banner: gift({
    id: "living_banner", classId: "knight", col: 2, apex: "legion_charge", name: "Estandarte Vivo", icon: "👑",
    description: `O estandarte anda com você: você e os aliados a até ${BANNER_RADIUS} tiles (bots incluídos) atacam mais rápido. Entre vários, vale o mais forte.`,
    perRank: 0.006, apply: (fx, v) => { fx.bannerHaste += v; }, text: (v) => `+${pct(v)} de velocidade de ataque para você e aliados a até ${BANNER_RADIUS} tiles`,
    milestones: [
      `aura de ${BANNER_RADIUS + 1} tiles`,
      `+${BANNER.armor} de armadura na aura`,
      `quem mata um monstro na aura cura ${pct(BANNER.killHeal)} da vida`,
      `aura de ${BANNER_RADIUS + 2} tiles`,
      `depois da sua magia do slot 3, a aura corta ${pct(BANNER.ward)} do dano por ${BANNER.wardMs / 1000}s`,
    ],
  }),
  hunter_breath: gift({
    id: "hunter_breath", classId: "paladin", col: 0, apex: "doomsday_shot", name: "Fôlego do Caçador", icon: "🌬️",
    description: "Depois de um salto ou rolamento, o próximo ataque básico sai mais forte.",
    perRank: 0.04, apply: (fx, v) => { fx.dashBasic += v; }, text: (v) => `+${pct(v)} de dano no primeiro básico depois de um salto`,
  }),
  grace: gift({
    id: "grace", classId: "paladin", col: 1, apex: "solar_crown", name: "Graça", icon: "⛪",
    description: `A cada ${GRACE_EVERY} magias lançadas, a seguinte não gasta mana e sai mais forte.`,
    perRank: 0.02, apply: (fx, v) => { fx.graceDamage += v; }, text: (v) => `+${pct(v)} de dano, sem mana, na magia depois de cada ${GRACE_EVERY}`,
  }),
  quick_hand: gift({
    id: "quick_hand", classId: "paladin", col: 2, apex: "endless_rain", name: "Mão Rápida", icon: "🎇",
    description: `Às vezes, o ataque básico sai incendiário: o alvo queima por ${BURN_MS / 1000}s.`,
    perRank: 0.008, apply: (fx, v) => { fx.burnChance += v; }, text: (v) => `${pct(v)} de chance de o básico incendiar o alvo`,
  }),
  circuit: gift({
    id: "circuit", classId: "sorcerer", col: 0, apex: "branching_bolt", name: "Circuito", icon: "🔁",
    description: `Lance magias de ${CIRCUIT_ELEMENTS} elementos diferentes em ${CIRCUIT_MS / 1000}s e o circuito fecha: a magia seguinte não gasta mana e causa mais dano.`,
    perRank: 0.02, apply: (fx, v) => { fx.circuitDamage += v; }, text: (v) => `+${pct(v)} de dano na magia depois do circuito`,
  }),
  frost_reserve: gift({
    id: "frost_reserve", classId: "sorcerer", col: 1, apex: "ice_age", name: "Reserva Gélida", icon: "🔷",
    description: `Com a mana abaixo de ${pct(FROST_MANA_PCT)}, uma casca de gelo absorve dano por ${FROST_MS / 1000}s (uma vez a cada ${FROST_COOLDOWN_MS / 1000}s).`,
    perRank: 0.012, apply: (fx, v) => { fx.frostBarrier += v; }, text: (v) => `escudo de ${pct(v)} da vida máxima com a mana baixa`,
  }),
  ossuary: gift({
    id: "ossuary", classId: "sorcerer", col: 2, apex: "black_hole", name: "Ossuário", icon: "🦴",
    description: `Monstro morto por magia de trevas às vezes se levanta como esqueleto seu por ${OSSUARY_MS / 1000}s (até ${OSSUARY_MAX} de uma vez).`,
    perRank: 0.016, apply: (fx, v) => { fx.raiseChance += v; }, text: (v) => `${pct(v)} de chance de levantar um esqueleto`,
  }),
  instinct: gift({
    id: "instinct", classId: "druid", col: 0, apex: "wild_hunt", name: "Instinto", icon: "🐾",
    description: `A cada ${BITE_EVERY} ataques básicos, um lobo espectral morde junto com o último.`,
    perRank: 0.02, apply: (fx, v) => { fx.fourthBite += v; }, text: (v) => `mordida de ${pct(BITE_BASE + v)} do básico a cada ${BITE_EVERY}º básico`,
  }),
  cycle: gift({
    id: "cycle", classId: "druid", col: 1, apex: "tree_of_life", name: "Ciclo", icon: "🌀",
    description: `A cada ${CYCLE_HEAL} de cura que você faz, uma onda de seiva cura você e os aliados a até ${CYCLE_RADIUS} tiles.`,
    perRank: 0.004, apply: (fx, v) => { fx.cycleHeal += v; }, text: (v) => `onda de ${pct(CYCLE_BASE + v)} da vida máxima a cada ${CYCLE_HEAL} de cura`,
  }),
  closed_sky: gift({
    id: "closed_sky", classId: "druid", col: 2, apex: "leaf_hurricane", name: "Céu Fechado", icon: "⛈️",
    description: `Quando morre um monstro envenenado ou sangrando por você, às vezes um raio cai no monstro mais perto (até ${SKY_STRIKE_TILES} tiles).`,
    perRank: 0.012, apply: (fx, v) => { fx.skyStrike += v; }, text: (v) => `${pct(v)} de chance de um raio ao matar envenenado`,
  }),
};

/** Quantos marcos um Dom tem neste nível. */
export function giftMilestones(rank: number): number {
  return Math.min(GIFT_MILESTONES, Math.floor(rank / GIFT_MILESTONE_EVERY));
}

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
  const fx: GiftEffects = { ...NO_GIFTS, elementDamage: {}, marks: {} };
  for (const { id, rank } of levels) {
    if (rank <= 0) continue;
    GIFTS[id].apply(fx, GIFTS[id].perRank * rank);
    if (GIFTS[id].milestones) fx.marks[id] = giftMilestones(rank);
  }
  fx.speed = Math.min(GIFT_SPEED_CAP, fx.speed);
  // Chances não passam de 100% (e ficam longe disso com 25 níveis).
  fx.burnChance = Math.min(1, fx.burnChance);
  fx.raiseChance = Math.min(1, fx.raiseChance);
  fx.skyStrike = Math.min(1, fx.skyStrike);
  return fx;
}
