import type { ClassId } from "./classes.ts";
import { lineEnd, type Dungeon } from "./dungeon.ts";
import type { DotKind } from "./monsters.ts";
import { SUMMONS, type SummonKind } from "./summons.ts";

/**
 * Ataque básico de cada classe: sai enquanto o jogador segura o botão de ataque. Com `projectileSpeed`, o golpe viaja até o alvo
 * e o dano só entra quando chega; 0 = corpo a corpo, o dano é na hora.
 */
export interface BasicAttackDef {
  name: string;
  /** Tiles por segundo; 0 = corpo a corpo. */
  projectileSpeed: number;
}

export const BASIC_ATTACKS: Record<ClassId, BasicAttackDef> = {
  knight: { name: "Golpe de espada", projectileSpeed: 0 },
  paladin: { name: "Flecha", projectileSpeed: 16 },
  sorcerer: { name: "Luz negra", projectileSpeed: 10 },
  druid: { name: "Luz verde", projectileSpeed: 11 },
};

/** Intervalo entre ataques básicos, igual para todas as classes. */
export const BASIC_ATTACK_COOLDOWN_MS = 1000;

/** Tempo (ms) que um projétil leva entre dois tiles. */
export function flightMs(speed: number, x0: number, y0: number, x1: number, y1: number) {
  return speed > 0 ? Math.round((Math.hypot(x1 - x0, y1 - y0) / speed) * 1000) : 0;
}

/** Nível em que cada slot de magia abre (slot 0 e slot 1). */
export const SPELL_SLOT_LEVELS = [3, 6] as const;
export type SpellSlot = 0 | 1;

export type SpellId =
  | "blade_spin" | "war_cry"
  | "holy_arrow" | "arrow_rain"
  | "shadow_orb" | "void_storm"
  | "forest_blessing" | "thorn_roots"
  // Compradas no Grimório da classe (menu).
  | "crushing_blow" | "holy_shield" | "vampiric_blade" | "iron_skin" | "earthquake" | "steel_wall" | "commander_shout" | "execution"
  | "piercing_shot" | "stun_arrow" | "blessed_ward" | "healing_light" | "deadly_shot" | "divine_judgment" | "explosive_volley"
  | "lightning_bolt" | "chain_lightning" | "ice_lance" | "drain_life" | "frost_nova" | "meteor" | "blizzard" | "dark_pact"
  | "venom_thorn" | "spirit_wolf" | "healing_moth" | "hornet_swarm" | "nature_wrath" | "wolf_pack" | "ancient_bear"
  | "grove_guardian" | "forest_heart";

/**
 * Uma magia. Os efeitos se combinam: dano em área, em linha ou em cadeia, dano contínuo, cura, raízes,
 * lentidão, atordoamento, guarda, armadura, escudo, roubo de vida, provocação e invocação de criaturas.
 * `aim: "self"` centra a área em quem conjura; `aim: "target"` usa a mira (ou o alvo automático no toque rápido).
 * Os números são do nível 1; `spellAtRank` aplica os níveis 2 e 3 comprados no Grimório.
 */
export interface SpellDef {
  id: SpellId;
  classId: ClassId;
  slot: SpellSlot;
  name: string;
  description: string;
  /** Ícone do botão e da escolha. */
  icon: string;
  /** Cor do efeito na tela. */
  color: number;
  manaCost: number;
  cooldownMs: number;
  aim: "self" | "target";
  /** Alcance até o alvo (só `aim: "target"`). */
  range: number;
  /** Raio da área em tiles; 0 = só o alvo. */
  radius: number;
  /**
   * `line`: acerta todos os monstros na reta do herói na direção mirada, até `range` tiles ou a primeira
   * parede (o `radius` não vale).
   */
  shape?: "line";
  /** Multiplicador do dano base nos monstros da área. */
  damage?: number;
  /** Cura, em fração do HP máximo, de quem está na área (aliados e quem conjura). */
  heal?: number;
  /** Monstros da área ficam presos no lugar (ainda atacam quem estiver perto). */
  rootMs?: number;
  /** Monstros da área ficam atordoados: não andam nem atacam. */
  stunMs?: number;
  /** Monstros da área andam mais devagar (`pct` = fração da velocidade perdida). */
  slow?: { pct: number; ms: number };
  /** Dano contínuo nos monstros atingidos: `perSec` × dano base a cada segundo, por `ms`. Não acumula: renova. */
  dot?: { perSec: number; ms: number; kind: DotKind };
  /** Depois do alvo, salta para o monstro mais próximo ainda não atingido (a até `range` tiles), `jumps` vezes, perdendo `falloff` do dano a cada salto. */
  chain?: { jumps: number; range: number; falloff: number };
  /** Dano +`bonus` (fração) em monstro com menos de `hpPct` da vida. */
  execute?: { hpPct: number; bonus: number };
  /** Dano +`perTile` (fração) por tile de distância entre quem conjura e o alvo. */
  distanceBonus?: number;
  /** Armadura extra em quem conjura (soma com o equipamento) por `ms`. */
  armor?: { points: number; ms: number };
  /** Quem conjura recebe só (1 - guard) do dano por `guardMs`. */
  guard?: number;
  guardMs?: number;
  /** Escudo temporário que absorve dano, em fração do HP máximo, por `barrierMs`. */
  barrier?: number;
  barrierMs?: number;
  /** O escudo vai também para os aliados na área (sem isto, só quem conjura). */
  barrierAllies?: boolean;
  /** Fração do dano causado que volta como vida para quem conjura. */
  lifesteal?: number;
  /** Monstros da área passam a perseguir quem conjurou. */
  taunt?: boolean;
  /** Criaturas aliadas que aparecem em volta de quem conjura (ver summons.ts). */
  summon?: { kind: SummonKind; count: number; durationMs: number };
  /** Tiles por segundo até o alvo; sem isso o efeito é imediato. */
  projectileSpeed?: number;
}

const spell = (def: SpellDef) => def;

export const SPELLS: Record<SpellId, SpellDef> = {
  // --- Cavaleiro: aguenta a pancada e segura os monstros perto de si. ----------
  blade_spin: spell({
    id: "blade_spin", classId: "knight", slot: 0, name: "Giro da Lâmina", icon: "🌀", color: 0xd2d6de,
    description: "Gira a espada e corta todos os monstros colados em você.",
    manaCost: 12, cooldownMs: 5000, aim: "self", range: 0, radius: 1, damage: 1.6,
  }),
  war_cry: spell({
    id: "war_cry", classId: "knight", slot: 1, name: "Grito de Guerra", icon: "📯", color: 0xe67e22,
    description: "Provoca os monstros por perto e reduz pela metade o dano que você recebe.",
    manaCost: 25, cooldownMs: 14000, aim: "self", range: 0, radius: 4, taunt: true, guard: 0.5, guardMs: 6000,
  }),
  crushing_blow: spell({
    id: "crushing_blow", classId: "knight", slot: 0, name: "Golpe Esmagador", icon: "🔨", color: 0xd35400,
    description: "Uma pancada brutal no monstro colado em você.",
    manaCost: 15, cooldownMs: 4500, aim: "target", range: 1, radius: 0, damage: 2.8,
  }),
  holy_shield: spell({
    id: "holy_shield", classId: "knight", slot: 0, name: "Escudo da Fé", icon: "🛡️", color: 0x7fc8ff,
    description: "Ergue um escudo de luz que absorve o dano até quebrar ou o tempo acabar.",
    manaCost: 18, cooldownMs: 12000, aim: "self", range: 0, radius: 0, barrier: 0.4, barrierMs: 8000,
  }),
  vampiric_blade: spell({
    id: "vampiric_blade", classId: "knight", slot: 0, name: "Lâmina Sedenta", icon: "🩸", color: 0xc0392b,
    description: "Um corte que bebe o sangue do monstro e devolve parte do dano como vida.",
    manaCost: 16, cooldownMs: 6000, aim: "target", range: 1, radius: 0, damage: 2, lifesteal: 0.5,
  }),
  iron_skin: spell({
    id: "iron_skin", classId: "knight", slot: 1, name: "Pele de Ferro", icon: "⛓️", color: 0xa4b0be,
    description: "Recupera parte da vida, corta quase todo o dano e endurece a armadura por alguns segundos.",
    manaCost: 30, cooldownMs: 16000, aim: "self", range: 0, radius: 0, heal: 0.25, guard: 0.7, guardMs: 5000,
    armor: { points: 5, ms: 5000 },
  }),
  earthquake: spell({
    id: "earthquake", classId: "knight", slot: 1, name: "Terremoto", icon: "🌋", color: 0x8d6e4a,
    description: "Crava a espada no chão: o solo treme, fere e atordoa os monstros ao redor.",
    manaCost: 35, cooldownMs: 13000, aim: "self", range: 0, radius: 2, damage: 1.8, stunMs: 1500,
  }),
  steel_wall: spell({
    id: "steel_wall", classId: "knight", slot: 1, name: "Muralha de Aço", icon: "🏰", color: 0x95a5a6,
    description: "Chama todos os monstros por perto para si e se cobre com um escudo enorme.",
    manaCost: 40, cooldownMs: 18000, aim: "self", range: 0, radius: 3, taunt: true, barrier: 0.6, barrierMs: 8000,
  }),
  commander_shout: spell({
    id: "commander_shout", classId: "knight", slot: 1, name: "Brado do Comandante", icon: "🎺", color: 0xf1c40f,
    description: "Inspira a equipe: cura um pouco e dá um escudo a você e aos aliados por perto.",
    manaCost: 40, cooldownMs: 16000, aim: "self", range: 0, radius: 4, heal: 0.15, barrier: 0.25, barrierMs: 7000, barrierAllies: true,
  }),
  execution: spell({
    id: "execution", classId: "knight", slot: 1, name: "Execução", icon: "⚔️", color: 0x922b21,
    description: "Um golpe devastador no monstro colado, que ainda o deixa atordoado. Dano dobrado em quem já está quase morto.",
    manaCost: 35, cooldownMs: 16000, aim: "target", range: 1, radius: 0, damage: 4.5, stunMs: 1000,
    execute: { hpPct: 0.3, bonus: 1 },
  }),

  // --- Paladino: tiros fortes de longe e luz que protege. ------------------------
  holy_arrow: spell({
    id: "holy_arrow", classId: "paladin", slot: 0, name: "Flecha Sagrada", icon: "✴️", color: 0xf7d774,
    description: "Uma flecha de luz dourada que causa dano pesado num alvo.",
    manaCost: 25, cooldownMs: 5000, aim: "target", range: 6, radius: 0, damage: 2.6, projectileSpeed: 20,
  }),
  arrow_rain: spell({
    id: "arrow_rain", classId: "paladin", slot: 1, name: "Chuva de Flechas", icon: "🏹", color: 0xa08f78,
    description: "Uma saraivada cai sobre o alvo e tudo ao redor dele.",
    manaCost: 45, cooldownMs: 10000, aim: "target", range: 6, radius: 2, damage: 1.4, projectileSpeed: 9,
  }),
  piercing_shot: spell({
    id: "piercing_shot", classId: "paladin", slot: 0, name: "Disparo Perfurante", icon: "🎯", color: 0xf1c40f,
    description: "Uma flecha que atravessa todos os monstros em linha reta, até a primeira parede.",
    manaCost: 28, cooldownMs: 5000, aim: "target", range: 7, radius: 0, shape: "line", damage: 1.9, projectileSpeed: 22,
  }),
  stun_arrow: spell({
    id: "stun_arrow", classId: "paladin", slot: 0, name: "Flecha Atordoante", icon: "💫", color: 0xa4b0be,
    description: "Uma flecha de ponta rombuda que deixa o alvo tonto, sem andar nem atacar.",
    manaCost: 24, cooldownMs: 7000, aim: "target", range: 6, radius: 0, damage: 1.5, stunMs: 2000, projectileSpeed: 20,
  }),
  blessed_ward: spell({
    id: "blessed_ward", classId: "paladin", slot: 0, name: "Bênção Protetora", icon: "🕊️", color: 0xfff6c8,
    description: "Cobre você e os aliados por perto com um escudo de luz que absorve dano.",
    manaCost: 30, cooldownMs: 14000, aim: "self", range: 0, radius: 3, barrier: 0.25, barrierMs: 7000, barrierAllies: true,
  }),
  healing_light: spell({
    id: "healing_light", classId: "paladin", slot: 1, name: "Luz Curativa", icon: "☀️", color: 0xfff6c8,
    description: "Um clarão que cura um pouco você e os aliados por perto e ofusca os monstros em volta.",
    manaCost: 45, cooldownMs: 12000, aim: "self", range: 0, radius: 3, heal: 0.2, stunMs: 500,
  }),
  deadly_shot: spell({
    id: "deadly_shot", classId: "paladin", slot: 1, name: "Disparo Certeiro", icon: "🏆", color: 0xf7d774,
    description: "Mira com calma e acerta um tiro enorme num alvo distante: quanto mais longe, mais forte.",
    manaCost: 40, cooldownMs: 14000, aim: "target", range: 8, radius: 0, damage: 3.2, distanceBonus: 0.1, projectileSpeed: 26,
  }),
  divine_judgment: spell({
    id: "divine_judgment", classId: "paladin", slot: 1, name: "Julgamento Divino", icon: "⚖️", color: 0xfff6c8,
    description: "Um raio de luz cai do céu sobre o alvo: fere e atordoa tudo ao redor.",
    manaCost: 55, cooldownMs: 14000, aim: "target", range: 6, radius: 2, damage: 2, stunMs: 1200,
  }),
  explosive_volley: spell({
    id: "explosive_volley", classId: "paladin", slot: 1, name: "Saraivada Explosiva", icon: "🎆", color: 0xe67e22,
    description: "Flechas com pólvora que explodem numa área larga em volta do alvo.",
    manaCost: 60, cooldownMs: 13000, aim: "target", range: 6, radius: 3, damage: 1.6, projectileSpeed: 10,
  }),

  // --- Feiticeiro: dano em área, frágil. ----------------------------------------
  shadow_orb: spell({
    id: "shadow_orb", classId: "sorcerer", slot: 0, name: "Esfera Sombria", icon: "🔮", color: 0x6b2a9a,
    description: "Uma esfera de trevas que explode no alvo e atinge quem estiver colado nele.",
    manaCost: 30, cooldownMs: 4000, aim: "target", range: 5, radius: 1, damage: 1.9, projectileSpeed: 8,
  }),
  void_storm: spell({
    id: "void_storm", classId: "sorcerer", slot: 1, name: "Tempestade do Vazio", icon: "🌑", color: 0x2d0a40,
    description: "Uma onda de vazio rasga todos os monstros em volta de você.",
    manaCost: 70, cooldownMs: 12000, aim: "self", range: 0, radius: 3, damage: 2.3,
  }),
  lightning_bolt: spell({
    id: "lightning_bolt", classId: "sorcerer", slot: 0, name: "Relâmpago", icon: "⚡", color: 0x9ec5ff,
    description: "Um raio rápido que causa dano altíssimo num único alvo.",
    manaCost: 35, cooldownMs: 4500, aim: "target", range: 6, radius: 0, damage: 2.9, projectileSpeed: 30,
  }),
  chain_lightning: spell({
    id: "chain_lightning", classId: "sorcerer", slot: 0, name: "Raio em Cadeia", icon: "🌩️", color: 0x9ec5ff,
    description: "O raio acerta o alvo e salta de monstro em monstro, perdendo um pouco de força a cada salto.",
    manaCost: 32, cooldownMs: 5500, aim: "target", range: 6, radius: 0, damage: 1.6, projectileSpeed: 30,
    chain: { jumps: 3, range: 3, falloff: 0.15 },
  }),
  ice_lance: spell({
    id: "ice_lance", classId: "sorcerer", slot: 0, name: "Lança de Gelo", icon: "🧊", color: 0x7fd8ff,
    description: "Uma lança de gelo que fere e congela o alvo no lugar.",
    manaCost: 28, cooldownMs: 5000, aim: "target", range: 6, radius: 0, damage: 2, rootMs: 2000, projectileSpeed: 18,
  }),
  drain_life: spell({
    id: "drain_life", classId: "sorcerer", slot: 0, name: "Drenar Vida", icon: "🦇", color: 0x8e44ad,
    description: "Suga a força vital do alvo e devolve boa parte do dano como vida.",
    manaCost: 30, cooldownMs: 6000, aim: "target", range: 5, radius: 0, damage: 1.8, lifesteal: 0.6, projectileSpeed: 12,
  }),
  frost_nova: spell({
    id: "frost_nova", classId: "sorcerer", slot: 1, name: "Nova de Gelo", icon: "❄️", color: 0x7fd8ff,
    description: "Uma explosão de gelo ao seu redor: fere e congela os monstros.",
    manaCost: 55, cooldownMs: 11000, aim: "self", range: 0, radius: 2, damage: 1.6, rootMs: 2500,
  }),
  meteor: spell({
    id: "meteor", classId: "sorcerer", slot: 1, name: "Meteoro", icon: "☄️", color: 0xe74c3c,
    description: "Uma rocha em chamas cai devagar sobre o alvo e esmaga tudo ao redor.",
    manaCost: 80, cooldownMs: 15000, aim: "target", range: 6, radius: 2, damage: 3, stunMs: 1000, projectileSpeed: 7,
  }),
  blizzard: spell({
    id: "blizzard", classId: "sorcerer", slot: 1, name: "Nevasca", icon: "🌨️", color: 0xd6f1ff,
    description: "Uma tempestade de neve cobre uma área grande: fere e deixa os monstros bem lentos.",
    manaCost: 70, cooldownMs: 14000, aim: "target", range: 6, radius: 3, damage: 1.4, slow: { pct: 0.5, ms: 4000 },
  }),
  dark_pact: spell({
    id: "dark_pact", classId: "sorcerer", slot: 1, name: "Pacto Sombrio", icon: "🩻", color: 0x5a1c7a,
    description: "Sombras famintas devoram os monstros ao redor e devolvem parte do dano como vida.",
    manaCost: 60, cooldownMs: 12000, aim: "self", range: 0, radius: 2, damage: 2, lifesteal: 0.3,
  }),

  // --- Druida: cura, controla e invoca as feras da floresta. ---------------------
  forest_blessing: spell({
    id: "forest_blessing", classId: "druid", slot: 0, name: "Bênção da Floresta", icon: "🌿", color: 0x2ecc71,
    description: "Cura você e os aliados por perto.",
    manaCost: 40, cooldownMs: 10000, aim: "self", range: 0, radius: 4, heal: 0.35,
  }),
  thorn_roots: spell({
    id: "thorn_roots", classId: "druid", slot: 1, name: "Raízes Espinhosas", icon: "🌱", color: 0x6b7a2a,
    description: "Raízes brotam em volta do alvo: ferem e prendem os monstros.",
    manaCost: 55, cooldownMs: 12000, aim: "target", range: 5, radius: 2, damage: 1.2, rootMs: 3500,
  }),
  venom_thorn: spell({
    id: "venom_thorn", classId: "druid", slot: 0, name: "Espinho Venenoso", icon: "🦂", color: 0x6ab04c,
    description: "Um espinho envenenado: fere o alvo e o veneno continua corroendo por alguns segundos.",
    manaCost: 30, cooldownMs: 4500, aim: "target", range: 5, radius: 0, damage: 1.4,
    dot: { perSec: 0.3, ms: 4000, kind: "poison" }, projectileSpeed: 12,
  }),
  spirit_wolf: spell({
    id: "spirit_wolf", classId: "druid", slot: 0, name: "Lobo Espiritual", icon: "🐺", color: 0x9ec5ff,
    description: "Invoca um lobo veloz que caça os monstros por perto.",
    manaCost: 35, cooldownMs: 15000, aim: "self", range: 0, radius: 0, summon: { kind: "wolf", count: 1, durationMs: 20000 },
  }),
  healing_moth: spell({
    id: "healing_moth", classId: "druid", slot: 0, name: "Mariposa Curandeira", icon: "🦋", color: 0xf7d774,
    description: "Invoca uma mariposa que voa com você e cura quem estiver perto dela.",
    manaCost: 35, cooldownMs: 18000, aim: "self", range: 0, radius: 0, summon: { kind: "moth", count: 1, durationMs: 20000 },
  }),
  hornet_swarm: spell({
    id: "hornet_swarm", classId: "druid", slot: 0, name: "Enxame de Vespas", icon: "🐝", color: 0xe67e22,
    description: "Solta três vespas que ferroam os monstros de longe por pouco tempo.",
    manaCost: 40, cooldownMs: 15000, aim: "self", range: 0, radius: 0, summon: { kind: "hornet", count: 3, durationMs: 12000 },
  }),
  nature_wrath: spell({
    id: "nature_wrath", classId: "druid", slot: 1, name: "Fúria da Natureza", icon: "🌪️", color: 0x3fbf3a,
    description: "Um redemoinho de folhas e pedras atinge o alvo e tudo ao redor dele.",
    manaCost: 60, cooldownMs: 11000, aim: "target", range: 5, radius: 2, damage: 1.9, projectileSpeed: 9,
  }),
  wolf_pack: spell({
    id: "wolf_pack", classId: "druid", slot: 1, name: "Chamado da Matilha", icon: "🌕", color: 0x9ec5ff,
    description: "Uiva para a lua e invoca uma matilha de três lobos.",
    manaCost: 60, cooldownMs: 22000, aim: "self", range: 0, radius: 0, summon: { kind: "wolf", count: 3, durationMs: 18000 },
  }),
  ancient_bear: spell({
    id: "ancient_bear", classId: "druid", slot: 1, name: "Urso Ancestral", icon: "🐻", color: 0x8d6e4a,
    description: "Invoca um urso enorme que atrai os monstros e aguenta muita pancada.",
    manaCost: 55, cooldownMs: 24000, aim: "self", range: 0, radius: 0, summon: { kind: "bear", count: 1, durationMs: 25000 },
  }),
  grove_guardian: spell({
    id: "grove_guardian", classId: "druid", slot: 1, name: "Guardião do Bosque", icon: "🌳", color: 0x3f6b22,
    description: "Desperta uma árvore viva que atrai os monstros e os prende com raízes a cada golpe.",
    manaCost: 65, cooldownMs: 26000, aim: "self", range: 0, radius: 0, summon: { kind: "treant", count: 1, durationMs: 25000 },
  }),
  forest_heart: spell({
    id: "forest_heart", classId: "druid", slot: 1, name: "Coração da Floresta", icon: "💚", color: 0x9cff7a,
    description: "Cura a equipe por perto e invoca um fogo-fátuo que continua curando todos e devolve um pouco de mana.",
    manaCost: 70, cooldownMs: 24000, aim: "self", range: 0, radius: 3, heal: 0.2, summon: { kind: "wisp", count: 1, durationMs: 20000 },
  }),
};

/** Níveis de uma magia no Grimório (o 1 é o aprendido). */
export const SPELL_MAX_RANK = 3;

/** Força da magia no nível: +20% de dano (também o contínuo), cura, escudo, armadura e criaturas por nível acima do 1. */
export const rankPower = (rank: number) => 1 + 0.2 * (Math.max(1, rank) - 1);
/** Duração dos efeitos no nível: +15% por nível acima do 1. */
export const rankDuration = (rank: number) => 1 + 0.15 * (Math.max(1, rank) - 1);

/** A magia com os números do nível comprado (mana, recarga e área não mudam). */
export function spellAtRank(def: SpellDef, rank: number): SpellDef {
  const k = rankPower(rank);
  const t = rankDuration(rank);
  const ms = (v?: number) => (v === undefined ? undefined : Math.round(v * t));
  return {
    ...def,
    damage: def.damage && def.damage * k,
    heal: def.heal && def.heal * k,
    barrier: def.barrier && def.barrier * k,
    rootMs: ms(def.rootMs),
    stunMs: ms(def.stunMs),
    slow: def.slow && { ...def.slow, ms: Math.round(def.slow.ms * t) },
    dot: def.dot && { ...def.dot, perSec: def.dot.perSec * k, ms: Math.round(def.dot.ms * t) },
    armor: def.armor && { points: Math.round(def.armor.points * k), ms: Math.round(def.armor.ms * t) },
    guardMs: ms(def.guardMs),
    barrierMs: ms(def.barrierMs),
    summon: def.summon && { ...def.summon, durationMs: Math.round(def.summon.durationMs * t) },
  };
}

const DOT_NAMES: Record<DotKind, string> = { poison: "Veneno", burn: "Queimadura", bleed: "Sangramento" };

const num = (v: number, digits = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const sec = (ms: number) => `${num(ms / 1000)} s`;

/** Efeitos da magia num nível, em linhas curtas para o menu e a escolha na hunt. */
export function spellFacts(def: SpellDef, rank = 1): string[] {
  const s = spellAtRank(def, rank);
  const area = s.shape === "line" ? ` em linha (${s.range} tiles)` : s.radius > 0 ? ` em raio ${s.radius}` : "";
  const facts: string[] = [];
  if (s.damage) facts.push(`Dano ${num(s.damage)}×${area}`);
  if (s.chain) facts.push(`Salta para mais ${s.chain.jumps} monstros (−${pct(s.chain.falloff)} por salto)`);
  if (s.execute) facts.push(`+${pct(s.execute.bonus)} de dano em quem tem menos de ${pct(s.execute.hpPct)} da vida`);
  if (s.distanceBonus) facts.push(`+${pct(s.distanceBonus)} de dano por tile até o alvo`);
  if (s.dot) facts.push(`${DOT_NAMES[s.dot.kind]}: ${num(s.dot.perSec)}× por segundo por ${sec(s.dot.ms)}`);
  if (s.lifesteal) facts.push(`Rouba ${pct(s.lifesteal)} do dano em vida`);
  if (s.heal) facts.push(`Cura ${pct(s.heal)} da vida${s.radius > 0 ? ` (raio ${s.radius})` : ""}`);
  if (s.barrier && s.barrierMs) facts.push(`Escudo de ${pct(s.barrier)} da vida por ${sec(s.barrierMs)}${s.barrierAllies ? " (aliados também)" : ""}`);
  if (s.guard && s.guardMs) facts.push(`Corta ${pct(s.guard)} do dano por ${sec(s.guardMs)}`);
  if (s.rootMs) facts.push(`Prende por ${sec(s.rootMs)}`);
  if (s.stunMs) facts.push(`Atordoa por ${sec(s.stunMs)}`);
  if (s.slow) facts.push(`Deixa ${pct(s.slow.pct)} mais lento por ${sec(s.slow.ms)}`);
  if (s.armor) facts.push(`+${s.armor.points} de armadura por ${sec(s.armor.ms)}`);
  if (s.taunt) facts.push(`Provoca monstros a até ${s.radius} tiles`);
  if (s.summon) {
    const sum = SUMMONS[s.summon.kind];
    const power = rankPower(rank);
    const what = s.summon.count > 1 ? `${s.summon.count}× ${sum.name}` : sum.name;
    facts.push(`Invoca ${what} por ${sec(s.summon.durationMs)}`);
    facts.push(`Criatura: vida ${pct(sum.hp * power)} da sua${sum.damage ? ` · dano ${num(sum.damage * power)}×` : ""}${sum.heal ? ` · cura ${pct(sum.heal * power)}` : ""}${sum.mana ? ` · mana ${pct(sum.mana * power)}` : ""}`);
  }
  facts.push(`${s.manaCost} de mana · recarga ${num(s.cooldownMs / 1000)} s${s.aim === "target" ? ` · alcance ${s.range}` : ""}`);
  return facts;
}

/** Magias que toda classe já tem de graça (uma por slot). As outras se compram no Grimório. */
export const STARTER_SPELLS: readonly SpellId[] = [
  "blade_spin", "war_cry", "holy_arrow", "arrow_rain", "shadow_orb", "void_storm", "forest_blessing", "thorn_roots",
];

/**
 * Magias que a classe pode pôr num slot: as iniciais mais as compradas no Grimório (`known`).
 * Aparecem como opções quando o slot libera na hunt.
 */
export function spellChoices(classId: ClassId, slot: SpellSlot, known: readonly string[] = []): SpellDef[] {
  return Object.values(SPELLS).filter((s) =>
    s.classId === classId && s.slot === slot && (STARTER_SPELLS.includes(s.id) || known.includes(s.id)));
}

/**
 * Magia de alvo único (`aim: "target"` sem área): a mira gruda no monstro a até `AIM_SNAP_TILES`
 * do ponto mirado. As de área caem no ponto, sem ímã.
 */
export function isSingleTarget(spell: SpellDef) {
  return spell.aim === "target" && spell.radius === 0 && spell.shape !== "line";
}

/**
 * Tiles de uma magia em linha: do herói na direção do ponto mirado até `length` tiles, parando antes
 * da primeira parede. Não inclui o tile do herói. Cliente (mira e efeito) e servidor (dano) usam a mesma conta.
 */
export function lineTiles(d: Dungeon, x0: number, y0: number, ax: number, ay: number, length: number) {
  const dx = ax - x0;
  const dy = ay - y0;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist === 0) return [];
  const end = lineEnd(d, x0, y0, x0 + Math.round((dx * length) / dist), y0 + Math.round((dy * length) / dist));
  const tiles: { x: number; y: number }[] = [];
  const adx = Math.abs(end.x - x0);
  const ady = -Math.abs(end.y - y0);
  const sx = x0 < end.x ? 1 : -1;
  const sy = y0 < end.y ? 1 : -1;
  let err = adx + ady;
  let x = x0;
  let y = y0;
  while (x !== end.x || y !== end.y) {
    const e2 = 2 * err;
    if (e2 >= ady) { err += ady; x += sx; }
    if (e2 <= adx) { err += adx; y += sy; }
    tiles.push({ x, y });
  }
  return tiles;
}

/** Distância (tiles) do ponto mirado em que a mira de alvo único gruda num monstro. */
export const AIM_SNAP_TILES = 1;

/** Puxa o ponto mirado para dentro do alcance (distância em tiles, como `tileDistance`). */
export function clampToRange(fromX: number, fromY: number, x: number, y: number, range: number) {
  const dx = x - fromX;
  const dy = y - fromY;
  const dist = Math.max(Math.abs(dx), Math.abs(dy));
  if (dist <= range) return { x, y };
  return { x: fromX + Math.round((dx * range) / dist), y: fromY + Math.round((dy * range) / dist) };
}
