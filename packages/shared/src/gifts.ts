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
  // --- Dons da costela de passivas ---
  /** Dano a mais da Hemorragia (Sangue no Aço). */
  hemorrhageDamage: number;
  /** Dano por acúmulo de Fúria Crescente (matar soma um acúmulo). */
  furyStack: number;
  /** Atordoar (ms) do monstro empurrado contra parede ou monstro (Bigorna). */
  anvilStunMs: number;
  /** Fração do absorvido pelo escudo que volta em quem está perto (Repique). */
  chimeReflect: number;
  /** Escudo (fração da vida) por monstro provocado (Eco de Guerra). */
  echoShield: number;
  /** Dano a mais na reação Exposto (Ordem de Execução). */
  exposedDamage: number;
  /** Força das flechas do leque do básico, somada a `QUIVER.base` (Aljava Larga). */
  quiverPower: number;
  /** Dano a mais no Exposto e em monstro marcado e sangrando (Ponto Fraco). */
  weakSpot: number;
  /** Dano a mais do Incandescer (Aurora). */
  incandesceDamage: number;
  /** Dano por segundo da vela (vezes o dano mágico), somado a `CANDLE.base` (Vela Votiva). */
  candlePower: number;
  /** Dano a mais dos campos no chão (Estrepes Afiados). */
  fieldDamage: number;
  /** Força da explosão da armadilha em monstro queimando, somada a 1 (Pavio Curto). */
  fusePower: number;
  /** Marcos de cada Dom (0 a `GIFT_MILESTONES`): nível ÷ `GIFT_MILESTONE_EVERY`. Só os Dons que já têm marcos. */
  marks: Partial<Record<GiftId, number>>;
}

export const NO_GIFTS: GiftEffects = {
  basicDamage: 0, armor: 0, allyDamage: 0, farDamage: 0, undeadDamage: 0, speed: 0, elementDamage: {},
  ccDuration: 0, darkLifesteal: 0, summonBoost: 0, healPower: 0, dotDamage: 0,
  lowHpDamage: 0, stillGuard: 0, bannerHaste: 0, dashBasic: 0, graceDamage: 0, burnChance: 0, circuitDamage: 0,
  frostBarrier: 0, raiseChance: 0, fourthBite: 0, cycleHeal: 0, skyStrike: 0,
  hemorrhageDamage: 0, furyStack: 0, anvilStunMs: 0, chimeReflect: 0, echoShield: 0, exposedDamage: 0,
  quiverPower: 0, weakSpot: 0, incandesceDamage: 0, candlePower: 0, fieldDamage: 0, fusePower: 0, marks: {},
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

// Dons da costela de passivas do Cavaleiro (efeito por nível e marcos).
/** Sangue no Aço: cura, o empurrão que faz sangrar, os colados, sangramentos mais longos e a recarga devolvida. */
export const BLOOD = { heal: 0.02, pushBleedMs: 2000, pushBleedPerSec: 0.3, splash: 0.5, bleedMs: 1000, refundMs: 1000 } as const;
/** Fúria Crescente: acúmulos, duração, ritmo no máximo e a magia grátis no máximo. */
export const FURY = { max: 10, maxMid: 12, maxLater: 15, ms: 6000, msLater: 8000, haste: 0.15 } as const;
/** Bigorna: teto do atordoar, dano do impacto e lentidão do impacto. */
export const ANVIL = { maxMs: 2000, impact: 0.5, slow: 0.3, slowMs: 3000 } as const;
/** Repique: raio, mana, atordoar. */
export const CHIME = { radius: 1, mana: 0.01, stunMs: 300 } as const;
/** Eco de Guerra: monstros contados, duração do escudo, lentidão, cura e o eco. */
export const WAR_ECHO = { max: 8, maxLater: 10, ms: 4000, msLater: 6000, slow: 0.15, slowMs: 4000, heal: 0.01, echoMs: 2000, echo: 0.5 } as const;
/** Ordem de Execução: o Exposto que dura depois do atordoar, o atordoar da marca e a marca ao matar. */
export const ORDER = { graceMs: 1000, markStunMs: 300, killMark: { pct: 0.15, ms: 5000 } } as const;

// Dons da costela de passivas do Paladino.
/** Aljava Larga: a cada tantos básicos, um leque de flechas (força base, flechas, abertura). */
export const QUIVER = { base: 0.3, every: 5, everyMid: 4, everyLater: 3, arrows: 3, arrowsMid: 4, arrowsLater: 5, angle: 50 } as const;
/** Ponto Fraco: o sangramento da marca, o tempo de graça do Exposto, sangramento em marcado e a marca ao matar. */
export const WEAK = { markBleedMs: 2000, markBleedPerSec: 0.3, graceMs: 1000, markedBleed: 0.2, killMark: { pct: 0.15, ms: 5000 } } as const;
/** Aurora: raio do Incandescer, ofuscar a mais em quem queima, queimadura mais longa, cura e ofuscar da explosão. */
export const DAWN = { radius: 2, dazzleMs: 300, burnMs: 1000, heal: 0.01, healRadius: 3, stunMs: 500 } as const;
/** Vela Votiva: força base, duração, ofuscar, velas por morto-vivo e armadura. */
export const CANDLE = { base: 0.1, ms: 3000, msMid: 4000, msLater: 5000, radius: 1, dazzleMs: 300, armor: 3 } as const;
/** Estrepes Afiados: lentidão nos campos, duração a mais, sangramento e os estrepes de quem morre num campo. */
export const SPIKES = { slow: 0.05, slowMs: 1500, ms: 1000, bleedPerSec: 0.3, bleedMs: 2000 } as const;
/** Pavio Curto: raio, queimadura da explosão, empurrão e a armadilha seguinte. */
export const FUSE = { radius: 1, radiusLater: 2, burnPerSec: 0.3, burnMs: 3000, push: 1, chainTiles: 4 } as const;

// Números dos marcos do Paladino.
/** Olhar Paciente: alcance do básico, o atordoar no alcance máximo (com recarga) e a flecha dupla. */
export const EYE = { range: 1, stunMs: 300, stunEveryMs: 10000, stunEveryMsLater: 6000, double: 0.05, doubleLater: 0.1 } as const;
/** Fé Ardente: queimaduras mais longas, ofuscar mais longo, cura ao matar morto-vivo e a luz que atravessa. */
export const FAITH = { burnMs: 1000, dazzleMs: 200, undeadKillHeal: 0.01 } as const;
/** Passo de Rastreador: duração das armadilhas, armadilhas a mais e o tiro depois de um tempo sem apanhar. */
export const TRACKER = { trapMs: 0.1, calmMs: 3000, calmShot: 0.1 } as const;
/** Graça: a série encurta, a magia carregada cura e ofusca em volta. */
export const GRACE_MARKS = { heal: 0.05, dazzleMs: 500, dazzleRadius: 2 } as const;
/** Fôlego do Caçador: recarga devolvida ao rolar, tiros carregados, atordoar e escudo. */
export const BREATH = { refund: 0.1, shots: 2, stunMs: 300, shield: 0.05, shieldMs: 4000 } as const;
// Números dos marcos do Feiticeiro.
/** Condutor: saltos a mais nas cadeias, queimaduras mais longas, Estática e Combustão mais fortes. */
export const CONDUCTOR = { jumps: 1, burnMs: 1000, traitBonus: 0.05 } as const;
/** Coração Frio: lentidão mais forte, dano a mais em monstro lento, escudo ao prender e o congelar em volta. */
export const COLD = { slow: 0.05, slowedDamage: 0.05, rootShield: 0.05, rootShieldMs: 4000, shatterRootMs: 1000 } as const;
/** Fome Sombria: marcas mais longas, mana ao matar com magia, roubo de vida e de mana. */
export const HUNGER = { markMs: 1000, killMana: 0.01, lifesteal: 0.01, manaSteal: 0.02 } as const;
/** Circuito: janela maior, salto a mais, menos elementos, efeitos mais longos e recarga menor na magia carregada. */
export const CIRCUIT_MARKS = { msLater: 10000, chain: { jumps: 1, range: 3, falloff: 0.3 }, duration: 0.3, cooldown: 0.5 } as const;
/** Reserva Gélida: quem bate no escudo congela, recargas menores, limiar maior e mana ao quebrar. */
export const FROST_MARKS = { freezeMs: 1000, cooldownMs: 25000, cooldownMsLater: 20000, manaPctLater: 0.2, breakMana: 0.1 } as const;
/** Ossuário: esqueletos mais longos, mais esqueletos, marca e a explosão ao sumir. */
export const BONES = { ms: 10000, msLater: 12000, max: 3, markPct: 0.1, markMs: 3000, burst: 1, burstRadius: 1 } as const;

// Números dos marcos do Druida.
/** Laço da Matilha: duração das criaturas, lobo a mais, roubo de vida e a volta da criatura que cai. */
export const PACK = { duration: 0.1, lifesteal: 0.03, reviveHp: 0.3 } as const;
/** Seiva Antiga: cura além da vida vira escudo, cura que tira lentidão, raio a mais e cura forte em quem está mal. */
export const SAP = { overheal: 0.03, overhealLater: 0.06, lowHpPct: 0.3, lowHpBonus: 0.5 } as const;
/** Seiva Venenosa: veneno mais longo, acúmulo a mais da Toxina, lentidão no envenenado e o veneno que pula. */
export const VENOM = { ms: 1000, slow: 0.1, jumpTiles: 3 } as const;
/** Instinto: atordoar da mordida, séries menores, veneno da mordida e a segunda mordida. */
export const INSTINCT = { stunMs: 300, everyLater: 3, everyForm: 2, poisonPerSec: 0.3, poisonMs: 3000 } as const;
/** Ciclo: cura menor para a onda, raio maior, raiz em volta e escudo. */
export const CYCLE_MARKS = { heal: 250, healLater: 200, radius: 2, rootMs: 1000, shield: 0.05, shieldMs: 4000 } as const;
/** Céu Fechado: o raio envenena, prende, chance a mais e o segundo raio. */
export const SKY = { poisonPerSec: 0.3, poisonMs: 3000, rootMs: 500, chance: 0.05 } as const;

/** Mão Rápida: a explosão da flecha incendiária, o chão em chamas, a chance a mais e o 6º básico. */
export const HAND = { burstRadius: 1, burst: 0.5, fireMs: 2000, firePerSec: 0.2, chance: 0.02, every: 6 } as const;

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
  | "instinct" | "cycle" | "closed_sky"
  | "blood_steel" | "rising_fury" | "anvil" | "chime" | "war_echo" | "execution_order"
  | "wide_quiver" | "weak_spot" | "dawn" | "votive_candle" | "sharp_caltrops" | "short_fuse"
  | "horde_bond" | "ancestor_stance" | "forge_spark";

export interface GiftDef {
  id: GiftId;
  classId: ClassId;
  /** Ramo do Grimório (coluna 0 a 2). */
  col: number;
  /** Dom do fundo: fica embaixo deste Ápice e pede o Ápice no nível 1. Sem isso, é Dom do topo. */
  apex?: SpellId;
  /** Dom da costela de passivas: 1 = linha VI (pede a ponta do tronco), 2 = linha VII (pede o da linha VI). */
  rib?: 1 | 2;
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
    milestones: [
      `básico com +${EYE.range} tile de alcance`,
      `o básico no alcance máximo atordoa ${EYE.stunMs / 1000}s (a cada ${EYE.stunEveryMs / 1000}s)`.replace(".", ","),
      `o atordoar volta a cada ${EYE.stunEveryMsLater / 1000}s`,
      `${pct(EYE.double)} de chance de flecha dupla`,
      `${pct(EYE.doubleLater)} de chance de flecha dupla`,
    ],
  }),
  burning_faith: gift({
    id: "burning_faith", classId: "paladin", col: 1, name: "Fé Ardente", icon: "✝️",
    description: "A fé queima os mortos que andam: mais dano em mortos-vivos (básico e magias).",
    perRank: 0.016, apply: (fx, v) => { fx.undeadDamage += v; }, text: (v) => `+${pct(v)} de dano em mortos-vivos`,
    milestones: [
      `suas queimaduras duram +${FAITH.burnMs / 1000}s`,
      `suas magias de luz ofuscam +${FAITH.dazzleMs / 1000}s`.replace(".", ","),
      `matar um morto-vivo cura ${pct(FAITH.undeadKillHeal)} da vida`,
      `ofuscam +${(FAITH.dazzleMs * 2) / 1000}s`.replace(".", ","),
      "a magia de luz de alvo único atravessa: acerta também o monstro logo atrás",
    ],
  }),
  tracker_step: gift({
    id: "tracker_step", classId: "paladin", col: 2, name: "Passo de Rastreador", icon: "🧭",
    description: `Passos leves de quem segue rastros: mais velocidade de movimento (até +${pct(GIFT_SPEED_CAP)}).`,
    perRank: 0.004, apply: (fx, v) => { fx.speed += v; }, text: (v) => `+${pct(Math.min(GIFT_SPEED_CAP, v))} de velocidade de movimento`,
    milestones: [
      `armadilhas duram +${pct(TRACKER.trapMs)}`,
      "+1 armadilha de cada ao mesmo tempo",
      `${TRACKER.calmMs / 1000}s sem levar dano: o próximo tiro dá +${pct(TRACKER.calmShot)}`,
      `armadilhas duram +${pct(TRACKER.trapMs * 2)}`,
      "+2 armadilhas de cada ao mesmo tempo",
    ],
  }),
  // --- Feiticeiro --------------------------------------------------------------------------------------------
  conductor: gift({
    id: "conductor", classId: "sorcerer", col: 0, name: "Condutor", icon: "⚡",
    description: "O corpo vira condutor dos elementos: mais dano nas magias de energia e de fogo.",
    perRank: 0.012, apply: (fx, v) => addElement(fx, ["energy", "fire"], v), text: (v) => `+${pct(v)} de dano nas magias de energia e de fogo`,
    milestones: [
      "suas magias em cadeia saltam +1 vez",
      `suas queimaduras duram +${CONDUCTOR.burnMs / 1000}s`,
      `Estática e Combustão (se tiver) +${pct(CONDUCTOR.traitBonus)}`,
      "as cadeias saltam +2 vezes",
      "o 1º salto da cadeia não perde dano",
    ],
  }),
  cold_heart: gift({
    id: "cold_heart", classId: "sorcerer", col: 1, name: "Coração Frio", icon: "❄️",
    description: "O frio demora a sair: as raízes, prisões e lentidões das suas magias duram mais.",
    perRank: 0.01, apply: (fx, v) => { fx.ccDuration += v; }, text: (v) => `+${pct(v)} de duração das prisões e lentidões das suas magias`,
    milestones: [
      `suas lentidões +${pct(COLD.slow)} mais fortes`,
      `monstro lento recebe +${pct(COLD.slowedDamage)} do seu dano`,
      `lentidões +${pct(COLD.slow * 2)} mais fortes`,
      `prender um monstro com magia dá um escudo de ${pct(COLD.rootShield)} da vida`,
      `monstro que morre congelado congela os colados por ${COLD.shatterRootMs / 1000}s`,
    ],
  }),
  shadow_hunger: gift({
    id: "shadow_hunger", classId: "sorcerer", col: 2, name: "Fome Sombria", icon: "🌑",
    description: "As trevas bebem por você: parte do dano das magias de trevas volta como vida.",
    perRank: 0.008, apply: (fx, v) => { fx.darkLifesteal += v; }, text: (v) => `${pct(v)} do dano das magias de trevas volta como vida`,
    milestones: [
      `suas marcas duram +${HUNGER.markMs / 1000}s`,
      `matar com magia devolve ${pct(HUNGER.killMana)} da mana`,
      `marcas +${(HUNGER.markMs * 2) / 1000}s`,
      `+${pct(HUNGER.lifesteal)} de roubo de vida`,
      `as magias de trevas roubam também ${pct(HUNGER.manaSteal)} do dano em mana`,
    ],
  }),
  // --- Druida ------------------------------------------------------------------------------------------------
  pack_bond: gift({
    id: "pack_bond", classId: "druid", col: 0, name: "Laço da Matilha", icon: "🐺",
    description: "Suas criaturas confiam em você: mais vida e mais dano em todas elas.",
    perRank: 0.012, apply: (fx, v) => { fx.summonBoost += v; }, text: (v) => `+${pct(v)} de vida e de dano das suas criaturas`,
    milestones: [
      `suas criaturas duram +${pct(PACK.duration)}`,
      "+1 lobo em cada invocação de lobos",
      `suas criaturas curam ${pct(PACK.lifesteal)} do dano que causam`,
      `criaturas duram +${pct(PACK.duration * 2)}`,
      `a criatura que cai volta uma vez com ${pct(PACK.reviveHp)} da vida`,
    ],
  }),
  ancient_sap: gift({
    id: "ancient_sap", classId: "druid", col: 1, name: "Seiva Antiga", icon: "🌿",
    description: "A seiva das árvores mais velhas: todas as suas curas curam mais.",
    perRank: 0.01, apply: (fx, v) => { fx.healPower += v; }, text: (v) => `+${pct(v)} de cura`,
    milestones: [
      `a cura que passa da vida vira escudo (até ${pct(SAP.overheal)} da vida)`,
      "curar tira a lentidão",
      `escudo de até ${pct(SAP.overhealLater)}`,
      "+1 tile nas curas em área",
      `curar alguém abaixo de ${pct(SAP.lowHpPct)} da vida cura ${pct(SAP.lowHpBonus)} a mais`,
    ],
  }),
  venom_sap: gift({
    id: "venom_sap", classId: "druid", col: 2, name: "Seiva Venenosa", icon: "🌵",
    description: "Espinhos mergulhados em seiva amarga: seus venenos e sangramentos ferem mais.",
    perRank: 0.012, apply: (fx, v) => { fx.dotDamage += v; }, text: (v) => `+${pct(v)} de dano dos seus venenos e sangramentos`,
    milestones: [
      `seus venenos duram +${VENOM.ms / 1000}s`,
      "Toxina (se tiver): +1 acúmulo",
      `o envenenado anda ${pct(VENOM.slow)} mais devagar`,
      `venenos +${(VENOM.ms * 2) / 1000}s`,
      `o veneno de quem morre pula para o monstro mais perto (até ${VENOM.jumpTiles} tiles)`,
    ],
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
    milestones: [
      "o tiro carregado atravessa e acerta também o monstro de trás",
      `rolar devolve ${pct(BREATH.refund)} da recarga da magia do slot 1`,
      `os ${BREATH.shots} próximos tiros saem carregados`,
      `o tiro carregado atordoa ${BREATH.stunMs / 1000}s`.replace(".", ","),
      `rolar dá um escudo de ${pct(BREATH.shield)} da vida`,
    ],
  }),
  grace: gift({
    id: "grace", classId: "paladin", col: 1, apex: "solar_crown", name: "Graça", icon: "⛪",
    description: `A cada ${GRACE_EVERY} magias lançadas, a seguinte não gasta mana e sai mais forte.`,
    perRank: 0.02, apply: (fx, v) => { fx.graceDamage += v; }, text: (v) => `+${pct(v)} de dano, sem mana, na magia depois de cada ${GRACE_EVERY}`,
    milestones: [
      `a cada ${GRACE_EVERY - 1} magias`,
      `a magia carregada também cura ${pct(GRACE_MARKS.heal)} da vida`,
      `a cada ${GRACE_EVERY - 2} magias`,
      `e ofusca os monstros a até ${GRACE_MARKS.dazzleRadius} tiles por ${GRACE_MARKS.dazzleMs / 1000}s`.replace(".", ","),
      `a cada ${GRACE_EVERY - 3} magias`,
    ],
  }),
  quick_hand: gift({
    id: "quick_hand", classId: "paladin", col: 2, apex: "endless_rain", name: "Mão Rápida", icon: "🎇",
    description: `Às vezes, o ataque básico sai incendiário: o alvo queima por ${BURN_MS / 1000}s.`,
    perRank: 0.008, apply: (fx, v) => { fx.burnChance += v; }, text: (v) => `${pct(v)} de chance de o básico incendiar o alvo`,
    milestones: [
      `a flecha incendiária explode em raio ${HAND.burstRadius}`,
      `+${pct(HAND.chance)} de chance`,
      `a explosão deixa o chão em chamas por ${HAND.fireMs / 1000}s`,
      `+${pct(HAND.chance * 2)} de chance no total`,
      `a cada ${HAND.every}º básico, a flecha sai sempre incendiária`,
    ],
  }),
  circuit: gift({
    id: "circuit", classId: "sorcerer", col: 0, apex: "branching_bolt", name: "Circuito", icon: "🔁",
    description: `Lance magias de ${CIRCUIT_ELEMENTS} elementos diferentes em ${CIRCUIT_MS / 1000}s e o circuito fecha: a magia seguinte não gasta mana e causa mais dano.`,
    perRank: 0.02, apply: (fx, v) => { fx.circuitDamage += v; }, text: (v) => `+${pct(v)} de dano na magia depois do circuito`,
    milestones: [
      `a janela do circuito vai a ${CIRCUIT_MARKS.msLater / 1000}s`,
      "a magia carregada também salta para mais 1 monstro",
      "2 elementos bastam para fechar o circuito",
      `os efeitos da magia carregada duram +${pct(CIRCUIT_MARKS.duration)}`,
      "a magia carregada recarrega na metade do tempo",
    ],
  }),
  frost_reserve: gift({
    id: "frost_reserve", classId: "sorcerer", col: 1, apex: "ice_age", name: "Reserva Gélida", icon: "🔷",
    description: `Com a mana abaixo de ${pct(FROST_MANA_PCT)}, uma casca de gelo absorve dano por ${FROST_MS / 1000}s (uma vez a cada ${FROST_COOLDOWN_MS / 1000}s).`,
    perRank: 0.012, apply: (fx, v) => { fx.frostBarrier += v; }, text: (v) => `escudo de ${pct(v)} da vida máxima com a mana baixa`,
    milestones: [
      `quem bate no escudo de gelo congela por ${FROST_MARKS.freezeMs / 1000}s`,
      `volta a cada ${FROST_MARKS.cooldownMs / 1000}s`,
      `vale abaixo de ${pct(FROST_MARKS.manaPctLater)} da mana`,
      `o escudo de gelo devolve ${pct(FROST_MARKS.breakMana)} da mana ao quebrar`,
      `volta a cada ${FROST_MARKS.cooldownMsLater / 1000}s`,
    ],
  }),
  ossuary: gift({
    id: "ossuary", classId: "sorcerer", col: 2, apex: "black_hole", name: "Ossuário", icon: "🦴",
    description: `Monstro morto por magia de trevas às vezes se levanta como esqueleto seu por ${OSSUARY_MS / 1000}s (até ${OSSUARY_MAX} de uma vez).`,
    perRank: 0.016, apply: (fx, v) => { fx.raiseChance += v; }, text: (v) => `${pct(v)} de chance de levantar um esqueleto`,
    milestones: [
      `os esqueletos duram ${BONES.ms / 1000}s`,
      `até ${BONES.max} esqueletos`,
      `os esqueletos marcam quem atacam (+${pct(BONES.markPct)} de dano por ${BONES.markMs / 1000}s)`,
      `duram ${BONES.msLater / 1000}s`,
      `o esqueleto explode ao sumir (Condenação em raio ${BONES.burstRadius})`,
    ],
  }),
  instinct: gift({
    id: "instinct", classId: "druid", col: 0, apex: "wild_hunt", name: "Instinto", icon: "🐾",
    description: `A cada ${BITE_EVERY} ataques básicos, um lobo espectral morde junto com o último.`,
    perRank: 0.02, apply: (fx, v) => { fx.fourthBite += v; }, text: (v) => `mordida de ${pct(BITE_BASE + v)} do básico a cada ${BITE_EVERY}º básico`,
    milestones: [
      `a mordida atordoa ${INSTINCT.stunMs / 1000}s`.replace(".", ","),
      `a cada ${INSTINCT.everyLater}º básico`,
      `em forma animal, a cada ${INSTINCT.everyForm}º golpe`,
      "a mordida envenena",
      "morde 2 vezes",
    ],
  }),
  cycle: gift({
    id: "cycle", classId: "druid", col: 1, apex: "tree_of_life", name: "Ciclo", icon: "🌀",
    description: `A cada ${CYCLE_HEAL} de cura que você faz, uma onda de seiva cura você e os aliados a até ${CYCLE_RADIUS} tiles.`,
    perRank: 0.004, apply: (fx, v) => { fx.cycleHeal += v; }, text: (v) => `onda de ${pct(CYCLE_BASE + v)} da vida máxima a cada ${CYCLE_HEAL} de cura`,
    milestones: [
      `a cada ${CYCLE_MARKS.heal} de cura`,
      `a onda chega a ${CYCLE_MARKS.radius} tiles`,
      `a onda prende os monstros em volta por ${CYCLE_MARKS.rootMs / 1000}s`,
      `a cada ${CYCLE_MARKS.healLater} de cura`,
      `a onda também dá escudo de ${pct(CYCLE_MARKS.shield)} da vida`,
    ],
  }),
  closed_sky: gift({
    id: "closed_sky", classId: "druid", col: 2, apex: "leaf_hurricane", name: "Céu Fechado", icon: "⛈️",
    description: `Quando morre um monstro envenenado ou sangrando por você, às vezes um raio cai no monstro mais perto (até ${SKY_STRIKE_TILES} tiles).`,
    perRank: 0.012, apply: (fx, v) => { fx.skyStrike += v; }, text: (v) => `${pct(v)} de chance de um raio ao matar envenenado`,
    milestones: [
      "o raio envenena",
      `+${pct(SKY.chance)} de chance`,
      `o raio prende ${SKY.rootMs / 1000}s`.replace(".", ","),
      `+${pct(SKY.chance * 2)} de chance no total`,
      "caem 2 raios",
    ],
  }),
  // --- Dons da costela de passivas (linhas VI e VII, do outro lado do Ápice) ------------------------------
  blood_steel: gift({
    id: "blood_steel", classId: "knight", col: 0, rib: 1, name: "Sangue no Aço", icon: "🩸",
    description: "A Hemorragia (sangrando + empurrão ou atordoamento) fere mais.",
    perRank: 0.03, apply: (fx, v) => { fx.hemorrhageDamage += v; }, text: (v) => `+${pct(v)} de dano da Hemorragia`,
    milestones: [
      `a Hemorragia cura ${pct(BLOOD.heal)} da sua vida`,
      `empurrar faz sangrar por ${BLOOD.pushBleedMs / 1000}s`,
      `a Hemorragia pega também quem está colado (${pct(BLOOD.splash)})`,
      `seus sangramentos duram +${BLOOD.bleedMs / 1000}s`,
      `a Hemorragia devolve ${BLOOD.refundMs / 1000}s da recarga da magia do slot 1`,
    ],
  }),
  rising_fury: gift({
    id: "rising_fury", classId: "knight", col: 0, rib: 2, name: "Fúria Crescente", icon: "💢",
    description: `Cada monstro que você mata soma um acúmulo de fúria (até ${FURY.max}, por ${FURY.ms / 1000}s): mais dano.`,
    perRank: 0.002, apply: (fx, v) => { fx.furyStack += v; }, text: (v) => `+${pct(v)} de dano por acúmulo (até ${FURY.max})`,
    milestones: [
      `até ${FURY.maxMid} acúmulos`,
      `com o máximo, o básico sai ${pct(FURY.haste)} mais rápido`,
      `os acúmulos duram ${FURY.msLater / 1000}s`,
      `até ${FURY.maxLater} acúmulos`,
      "com o máximo, a próxima magia do slot 1 não gasta mana",
    ],
  }),
  anvil: gift({
    id: "anvil", classId: "knight", col: 1, rib: 1, name: "Bigorna", icon: "🔨",
    description: `Monstro que você empurra contra parede ou outro monstro fica atordoado (até ${ANVIL.maxMs / 1000}s).`,
    perRank: 80, apply: (fx, v) => { fx.anvilStunMs += v; }, text: (v) => `${(Math.min(ANVIL.maxMs, v) / 1000).toFixed(2).replace(".", ",")}s de atordoar no impacto`,
    milestones: [
      `o impacto fere com ${pct(ANVIL.impact)} do seu básico`,
      "o monstro de trás também é empurrado",
      "+1 tile em todos os seus empurrões",
      "o impacto atordoa também o monstro que segurou o empurrão",
      `o impacto deixa ${pct(ANVIL.slow)} lento por ${ANVIL.slowMs / 1000}s`,
    ],
  }),
  chime: gift({
    id: "chime", classId: "knight", col: 1, rib: 2, name: "Repique", icon: "🔔",
    description: `Golpe que bate no seu escudo devolve parte do absorvido nos monstros a até ${CHIME.radius} tile.`,
    perRank: 0.02, apply: (fx, v) => { fx.chimeReflect += v; }, text: (v) => `${pct(v)} do absorvido volta em quem está perto`,
    milestones: [
      `raio ${CHIME.radius + 1}`,
      "o repique provoca quem pega",
      `o repique devolve ${pct(CHIME.mana)} da sua mana`,
      `raio ${CHIME.radius + 2}`,
      `o repique atordoa ${CHIME.stunMs / 1000}s`.replace(".", ","),
    ],
  }),
  war_echo: gift({
    id: "war_echo", classId: "knight", col: 2, rib: 1, name: "Eco de Guerra", icon: "📢",
    description: `Ao provocar, você ganha um escudo por monstro provocado (até ${WAR_ECHO.max}).`,
    perRank: 0.004, apply: (fx, v) => { fx.echoShield += v; }, text: (v) => `escudo de ${pct(v)} da vida por monstro provocado`,
    milestones: [
      `o escudo dura ${WAR_ECHO.msLater / 1000}s`,
      `os provocados andam ${pct(WAR_ECHO.slow)} mais devagar`,
      `conta até ${WAR_ECHO.maxLater} monstros`,
      `provocar cura ${pct(WAR_ECHO.heal)} da vida por monstro`,
      `o eco se repete ${WAR_ECHO.echoMs / 1000}s depois com ${pct(WAR_ECHO.echo)}`,
    ],
  }),
  execution_order: gift({
    id: "execution_order", classId: "knight", col: 2, rib: 2, name: "Ordem de Execução", icon: "⚖️",
    description: "O Exposto (marcado e atordoado) recebe ainda mais do seu dano.",
    perRank: 0.024, apply: (fx, v) => { fx.exposedDamage += v; }, text: (v) => `+${pct(v)} de dano no Exposto`,
    milestones: [
      `o Exposto dura +${ORDER.graceMs / 1000}s depois do atordoar`,
      `suas marcas atordoam ${ORDER.markStunMs / 1000}s`.replace(".", ","),
      "monstro colado num Exposto também conta como Exposto",
      `+${(ORDER.graceMs * 2) / 1000}s depois do atordoar`,
      "matar um Exposto marca o monstro mais perto",
    ],
  }),
  wide_quiver: gift({
    id: "wide_quiver", classId: "paladin", col: 0, rib: 1, name: "Aljava Larga", icon: "🪶",
    description: `A cada ${QUIVER.every} ataques básicos, o último solta junto um leque de ${QUIVER.arrows} flechas.`,
    perRank: 0.02, apply: (fx, v) => { fx.quiverPower += v; }, text: (v) => `flechas do leque com ${pct(QUIVER.base + v)} do básico`,
    milestones: [
      `a cada ${QUIVER.everyMid}º básico`,
      `${QUIVER.arrowsMid} flechas`,
      `a cada ${QUIVER.everyLater}º básico`,
      `${QUIVER.arrowsLater} flechas`,
      "as flechas do leque atravessam 1 monstro",
    ],
  }),
  weak_spot: gift({
    id: "weak_spot", classId: "paladin", col: 0, rib: 2, name: "Ponto Fraco", icon: "🎯",
    description: "Mais dano no Exposto (marcado e atordoado) e em monstro marcado e sangrando.",
    perRank: 0.024, apply: (fx, v) => { fx.weakSpot += v; }, text: (v) => `+${pct(v)} de dano no Exposto e em marcado sangrando`,
    milestones: [
      `suas marcas fazem sangrar por ${WEAK.markBleedMs / 1000}s`,
      `o Exposto vale ${WEAK.graceMs / 1000}s depois do atordoar`,
      `sangramento em monstro marcado fere +${pct(WEAK.markedBleed)}`,
      `${(WEAK.graceMs * 2) / 1000}s depois do atordoar`,
      "matar um monstro marcado marca o mais perto",
    ],
  }),
  dawn: gift({
    id: "dawn", classId: "paladin", col: 1, rib: 1, name: "Aurora", icon: "🔆",
    description: "O Incandescer (ofuscado + fogo) explode mais forte.",
    perRank: 0.03, apply: (fx, v) => { fx.incandesceDamage += v; }, text: (v) => `+${pct(v)} de dano do Incandescer`,
    milestones: [
      `o Incandescer explode em raio ${DAWN.radius}`,
      `monstro ofuscado que começa a queimar fica ofuscado +${DAWN.dazzleMs / 1000}s`.replace(".", ","),
      `suas queimaduras duram +${DAWN.burnMs / 1000}s`,
      `o Incandescer cura ${pct(DAWN.heal)} dos aliados perto`,
      `o Incandescer ofusca quem pega por ${DAWN.stunMs / 1000}s`.replace(".", ","),
    ],
  }),
  votive_candle: gift({
    id: "votive_candle", classId: "paladin", col: 1, rib: 2, name: "Vela Votiva", icon: "🕯️",
    description: `Monstro morto por luz deixa uma vela por ${CANDLE.ms / 1000}s que fere em raio ${CANDLE.radius}.`,
    perRank: 0.02, apply: (fx, v) => { fx.candlePower += v; }, text: (v) => `vela com ${pct(CANDLE.base + v)} do dano mágico por segundo`,
    milestones: [
      `a vela dura ${CANDLE.msMid / 1000}s`,
      `a vela ofusca quem passa por ${CANDLE.dazzleMs / 1000}s`.replace(".", ","),
      "2 velas quando morre um morto-vivo",
      `a vela dura ${CANDLE.msLater / 1000}s`,
      `a vela dá +${CANDLE.armor} de armadura aos aliados perto`,
    ],
  }),
  sharp_caltrops: gift({
    id: "sharp_caltrops", classId: "paladin", col: 2, rib: 1, name: "Estrepes Afiados", icon: "🪤",
    description: "Seus campos no chão (armadilhas, chão em chamas, zonas) ferem mais.",
    perRank: 0.012, apply: (fx, v) => { fx.fieldDamage += v; }, text: (v) => `+${pct(v)} de dano dos seus campos`,
    milestones: [
      `seus campos deixam ${pct(SPIKES.slow)} lento`,
      `campos +${SPIKES.ms / 1000}s`,
      `seus campos fazem sangrar por ${SPIKES.bleedMs / 1000}s`,
      `campos +${(SPIKES.ms * 2) / 1000}s`,
      "monstro que morre num campo seu deixa estrepes no tile",
    ],
  }),
  short_fuse: gift({
    id: "short_fuse", classId: "paladin", col: 2, rib: 2, name: "Pavio Curto", icon: "🧨",
    description: `Armadilha que dispara em monstro queimando explode em raio ${FUSE.radius}.`,
    perRank: 0.04, apply: (fx, v) => { fx.fusePower += v; }, text: (v) => `explosão de ${pct(1 + v)} do dano mágico`,
    milestones: [
      `raio ${FUSE.radiusLater}`,
      `a explosão queima por ${FUSE.burnMs / 1000}s`,
      "a armadilha queima quem ela prende (e a explosão sai sempre)",
      `a explosão empurra ${FUSE.push} tile`,
      "a explosão dispara a sua armadilha mais perto",
    ],
  }),
  // Xamã Orc: Dons do fundo, embaixo dos Ápices (com os efeitos que já existem nos outros Dons).
  horde_bond: gift({
    id: "horde_bond", classId: "shaman", col: 0, apex: "horde_roar", name: "Laço da Horda", icon: "🪓",
    description: "A horda luta por você: seus orcs, ogros e demais criaturas têm mais vida e mais dano.",
    perRank: 0.012, apply: (fx, v) => { fx.summonBoost += v; }, text: (v) => `+${pct(v)} de vida e de dano das suas criaturas`,
  }),
  ancestor_stance: gift({
    id: "ancestor_stance", classId: "shaman", col: 1, apex: "ancestor_circle", name: "Postura Ancestral", icon: "🗿",
    description: "Parado junto dos totens, o xamã finca os pés como eles: recebe menos dano depois de um tempo sem andar.",
    perRank: 0.008, apply: (fx, v) => { fx.stillGuard += v; }, text: (v) => `${pct(v)} de dano a menos parado`,
  }),
  forge_spark: gift({
    id: "forge_spark", classId: "shaman", col: 2, apex: "forge_rain", name: "Fagulha da Forja", icon: "🔥",
    description: "Às vezes, a brasa do cajado sai mais quente: o alvo queima.",
    perRank: 0.008, apply: (fx, v) => { fx.burnChance += v; }, text: (v) => `${pct(v)} de chance de o básico incendiar o alvo`,
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
