import type { ClassId } from "./classes.ts";
import { blocksSight, hasLineOfSight, tileDistance, type Dungeon } from "./dungeon.ts";
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
  | "grove_guardian" | "forest_heart"
  // Especializações (lados no fim de um ramo do Grimório).
  | "hunter_mark" | "sniper_stance" | "evasive_roll" | "swift_quiver"
  | "holy_spear" | "divine_caldera" | "light_shield" | "consecrated_ground"
  | "lightning_arrow" | "barrage" | "bear_trap" | "arrow_cordon";

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
  /** `ally`: mira um aliado (ou a si mesmo); no toque rápido, o aliado mais ferido ao alcance. */
  aim: "self" | "target" | "ally";
  /** Alcance até o alvo (só `aim: "target"`). */
  range: number;
  /** Raio da área em tiles; 0 = só o alvo. */
  radius: number;
  /**
   * `line`: acerta todos os monstros na reta do herói na direção mirada, até `range` tiles ou a primeira
   * parede (o `radius` não vale).
   * `cone`: acerta os monstros num leque de 90° à frente do herói, na direção mirada, até `range` tiles.
   */
  shape?: "line" | "cone";
  /**
   * Campo no chão onde a magia cai, por `ms`:
   * - `zone`: a cada `tickMs`, fere os monstros no raio (`damage` × dano base) e dá `allyArmor` aos aliados dentro;
   * - `trap`: armadilha invisível para os monstros; o primeiro que pisar dispara os efeitos da magia
   *   (raízes, dano contínuo) no raio dela, e a armadilha some;
   * - `turret`: estaca que, a cada `tickMs`, atira (`damage` ×) no monstro mais perto a até `reach` tiles, `shots` vezes.
   * Conjurar de novo troca o campo anterior da mesma magia.
   */
  field?: { kind: "zone" | "trap" | "turret"; ms: number; tickMs?: number; damage?: number; allyArmor?: number; reach?: number; shots?: number };
  /** Dano +`undeadBonus` (fração) em mortos-vivos. */
  undeadBonus?: number;
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
  /** O efeito inteiro se repete `delayMs` depois do primeiro, com `power` do dano (sem gastar mana de novo). */
  repeat?: { delayMs: number; power: number };
  /** Se a magia matar algum monstro, a recarga cai esta fração do que ainda falta. */
  killRefund?: number;
  /** Fração do dano causado que volta como mana para quem conjura. */
  manaSteal?: number;
  /** Monstros atingidos ficam marcados: recebem +`pct` de dano de toda a equipe por `ms`. */
  mark?: { pct: number; ms: number };
  /**
   * Bônus em quem conjura por `ms`: dano do ataque básico (+fração), alcance do básico (+tiles), velocidade de
   * movimento (fração, negativa = mais lento) e ritmo do básico (fração cortada da recarga).
   */
  selfBuff?: { ms: number; basicDamage?: number; attackRange?: number; moveSpeed?: number; attackHaste?: number };
  /** Quem conjura salta até `tiles` tiles na direção mirada (no toque rápido, para longe do alvo), parando em parede ou monstro. */
  dash?: { tiles: number };
  /** O próximo ataque básico de quem conjura atordoa o alvo por este tempo. */
  nextBasicStunMs?: number;
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

  // Especialização Atirador de Elite (ramo Mira).
  hunter_mark: spell({
    id: "hunter_mark", classId: "paladin", slot: 0, name: "Marca do Caçador", icon: "🎯", color: 0xe74c3c,
    description: "Marca um monstro: ele recebe mais dano de toda a equipe por alguns segundos.",
    manaCost: 20, cooldownMs: 9000, aim: "target", range: 7, radius: 0, damage: 0.8, mark: { pct: 0.25, ms: 10000 },
    projectileSpeed: 24,
  }),
  sniper_stance: spell({
    id: "sniper_stance", classId: "paladin", slot: 1, name: "Postura do Atirador", icon: "🔭", color: 0xf7d774,
    description: "Firma os pés e mira com calma: flechas mais fortes e mais longas, mas anda devagar.",
    manaCost: 40, cooldownMs: 18000, aim: "self", range: 0, radius: 0,
    selfBuff: { ms: 8000, basicDamage: 1, attackRange: 2, moveSpeed: -0.5 },
  }),
  // Especialização Caçador Ágil (ramo Mira).
  evasive_roll: spell({
    id: "evasive_roll", classId: "paladin", slot: 0, name: "Rolamento", icon: "🤸", color: 0x9be15d,
    description: "Rola para o lado mirado (no toque rápido, para longe do monstro) e a próxima flecha atordoa.",
    manaCost: 18, cooldownMs: 8000, aim: "target", range: 3, radius: 0, dash: { tiles: 3 }, nextBasicStunMs: 1000,
  }),
  swift_quiver: spell({
    id: "swift_quiver", classId: "paladin", slot: 1, name: "Aljava Veloz", icon: "🏹", color: 0x9be15d,
    description: "Por alguns segundos, as flechas saem uma atrás da outra.",
    manaCost: 45, cooldownMs: 18000, aim: "self", range: 0, radius: 0, selfBuff: { ms: 6000, attackHaste: 0.6 },
  }),

  // Especialização Cruzado (ramo Luz).
  holy_spear: spell({
    id: "holy_spear", classId: "paladin", slot: 0, name: "Lança Etérea", icon: "🔱", color: 0xfff6c8,
    description: "Uma lança de luz rápida, de recarga curta. Fere mais os mortos-vivos.",
    manaCost: 14, cooldownMs: 2500, aim: "target", range: 6, radius: 0, damage: 1.6, undeadBonus: 0.5, projectileSpeed: 26,
  }),
  divine_caldera: spell({
    id: "divine_caldera", classId: "paladin", slot: 1, name: "Caldeira Divina", icon: "🌞", color: 0xf7d774,
    description: "A luz explode em volta de você. Mortos-vivos levam o dobro.",
    manaCost: 55, cooldownMs: 13000, aim: "self", range: 0, radius: 3, damage: 2.2, undeadBonus: 1,
  }),
  // Especialização Guardião da Luz (ramo Luz).
  light_shield: spell({
    id: "light_shield", classId: "paladin", slot: 0, name: "Escudo da Luz", icon: "🔆", color: 0x7fc8ff,
    description: "Põe um escudo de luz num aliado (ou em você). No toque rápido, vai no mais ferido por perto.",
    manaCost: 25, cooldownMs: 9000, aim: "ally", range: 6, radius: 0, barrier: 0.3, barrierMs: 6000,
  }),
  consecrated_ground: spell({
    id: "consecrated_ground", classId: "paladin", slot: 1, name: "Solo Consagrado", icon: "⛪", color: 0xf7c948,
    description: "Consagra o chão: fere os monstros que pisam nele e protege os aliados dentro.",
    manaCost: 50, cooldownMs: 16000, aim: "target", range: 5, radius: 2,
    field: { kind: "zone", ms: 8000, tickMs: 1000, damage: 0.35, allyArmor: 5 },
  }),
  // Especialização Artilheiro (ramo Batedor).
  lightning_arrow: spell({
    id: "lightning_arrow", classId: "paladin", slot: 0, name: "Flecha Relâmpago", icon: "⚡", color: 0x9ec5ff,
    description: "Uma flecha carregada que acerta o alvo e salta para os monstros perto dele.",
    manaCost: 28, cooldownMs: 6000, aim: "target", range: 6, radius: 0, damage: 1.5, projectileSpeed: 28,
    chain: { jumps: 3, range: 3, falloff: 0.2 },
  }),
  barrage: spell({
    id: "barrage", classId: "paladin", slot: 1, name: "Barragem", icon: "🎇", color: 0xe67e22,
    description: "Uma rajada de flechas em leque à sua frente.",
    manaCost: 50, cooldownMs: 12000, aim: "target", range: 5, radius: 0, shape: "cone", damage: 2,
  }),
  // Especialização Armadilheiro (ramo Batedor).
  bear_trap: spell({
    id: "bear_trap", classId: "paladin", slot: 0, name: "Armadilha de Urso", icon: "🪤", color: 0xa4b0be,
    description: "Arma uma armadilha no chão: o primeiro monstro que pisar fica preso e sangra.",
    manaCost: 20, cooldownMs: 6000, aim: "target", range: 4, radius: 0, damage: 1,
    rootMs: 3000, dot: { perSec: 0.3, ms: 4000, kind: "bleed" }, field: { kind: "trap", ms: 20000 },
  }),
  arrow_cordon: spell({
    id: "arrow_cordon", classId: "paladin", slot: 1, name: "Cordão de Flechas", icon: "🎋", color: 0xc8a165,
    description: "Finca uma estaca que atira sozinha nos monstros que chegam perto.",
    manaCost: 45, cooldownMs: 15000, aim: "target", range: 4, radius: 0,
    field: { kind: "turret", ms: 12000, tickMs: 900, damage: 1, reach: 3, shots: 4 },
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

/**
 * Maestria: o nível 3 de cada magia muda o efeito, além dos +20%. `changes` troca campos da magia no nível 1
 * (antes de aplicar a força do nível); objetos como `summon` e `chain` entram inteiros.
 */
export interface Mastery {
  text: string;
  changes: Partial<Omit<SpellDef, "id" | "classId" | "slot" | "name" | "description" | "icon" | "color">>;
}

/** Nível em que a Maestria entra. */
export const MASTERY_RANK = 3;

export const MASTERIES: Record<SpellId, Mastery> = {
  // Cavaleiro
  blade_spin: { text: "Gira de novo logo depois, com metade do dano.", changes: { repeat: { delayMs: 450, power: 0.5 } } },
  war_cry: { text: "O grito também cura 15% da sua vida.", changes: { heal: 0.15 } },
  crushing_blow: { text: "A pancada atordoa o monstro por 1 s.", changes: { stunMs: 1000 } },
  holy_shield: { text: "O escudo cobre também os aliados a até 2 tiles.", changes: { radius: 2, barrierAllies: true } },
  vampiric_blade: { text: "Corta todos os monstros colados no alvo.", changes: { radius: 1 } },
  iron_skin: { text: "Provoca os monstros a até 3 tiles e a cura chega aos aliados nessa área.", changes: { radius: 3, taunt: true } },
  earthquake: { text: "Réplica: o chão treme de novo, com metade do dano, e atordoa outra vez.", changes: { repeat: { delayMs: 900, power: 0.5 } } },
  steel_wall: { text: "Também corta 30% do dano recebido enquanto o escudo dura.", changes: { guard: 0.3, guardMs: 8000 } },
  commander_shout: { text: "Alcança aliados a até 6 tiles.", changes: { radius: 6 } },
  execution: { text: "O dano dobrado vale abaixo de 50% da vida.", changes: { execute: { hpPct: 0.5, bonus: 1 } } },
  // Paladino
  holy_arrow: { text: "A flecha salta para mais um monstro perto do alvo.", changes: { chain: { jumps: 1, range: 3, falloff: 0.3 } } },
  arrow_rain: { text: "As flechas fincadas deixam os monstros 30% mais lentos.", changes: { slow: { pct: 0.3, ms: 3000 } } },
  piercing_shot: { text: "Alcance 9 e quem é atravessado sangra.", changes: { range: 9, dot: { perSec: 0.2, ms: 3000, kind: "bleed" } } },
  stun_arrow: { text: "Atordoa também quem está colado no alvo.", changes: { radius: 1 } },
  blessed_ward: { text: "A luz ofusca os monstros em volta por 0,7 s.", changes: { stunMs: 700 } },
  healing_light: { text: "O clarão ofusca por 1 s.", changes: { stunMs: 1000 } },
  deadly_shot: { text: "Se o tiro matar, a recarga cai pela metade.", changes: { killRefund: 0.5 } },
  divine_judgment: { text: "A luz queima tudo o que atinge.", changes: { dot: { perSec: 0.3, ms: 4000, kind: "burn" } } },
  explosive_volley: { text: "A pólvora deixa os monstros em chamas.", changes: { dot: { perSec: 0.25, ms: 3000, kind: "burn" } } },
  // Feiticeiro
  shadow_orb: { text: "A esfera explode duas vezes (a segunda com metade do dano).", changes: { repeat: { delayMs: 500, power: 0.5 } } },
  void_storm: { text: "O vazio devolve 20% do dano como vida.", changes: { lifesteal: 0.2 } },
  lightning_bolt: { text: "O raio atordoa o alvo por 0,5 s.", changes: { stunMs: 500 } },
  chain_lightning: { text: "Salta 5 vezes.", changes: { chain: { jumps: 5, range: 3, falloff: 0.15 } } },
  ice_lance: { text: "Quando o gelo solta, o monstro fica 50% mais lento.", changes: { slow: { pct: 0.5, ms: 4000 } } },
  drain_life: { text: "Também rouba mana: 30% do dano volta como mana.", changes: { manaSteal: 0.3 } },
  frost_nova: { text: "Quando o gelo solta, os monstros ficam 50% mais lentos.", changes: { slow: { pct: 0.5, ms: 4000 } } },
  meteor: { text: "Deixa os atingidos em chamas.", changes: { dot: { perSec: 0.4, ms: 4000, kind: "burn" } } },
  blizzard: { text: "A tempestade cobre raio 4.", changes: { radius: 4 } },
  dark_pact: { text: "Devolve 50% do dano como vida.", changes: { lifesteal: 0.5 } },
  // Druida
  forest_blessing: { text: "Uma mariposa curandeira brota e acompanha você por 10 s.", changes: { summon: { kind: "moth", count: 1, durationMs: 10000 } } },
  thorn_roots: { text: "Os espinhos envenenam quem fica preso.", changes: { dot: { perSec: 0.25, ms: 4000, kind: "poison" } } },
  venom_thorn: { text: "O veneno pula para mais 2 monstros perto do alvo.", changes: { chain: { jumps: 2, range: 3, falloff: 0.3 } } },
  spirit_wolf: { text: "Invoca 2 lobos.", changes: { summon: { kind: "wolf", count: 2, durationMs: 20000 } } },
  healing_moth: { text: "Invoca 2 mariposas.", changes: { summon: { kind: "moth", count: 2, durationMs: 20000 } } },
  hornet_swarm: { text: "Solta 5 vespas.", changes: { summon: { kind: "hornet", count: 5, durationMs: 12000 } } },
  nature_wrath: { text: "O redemoinho prende os monstros por 1,5 s.", changes: { rootMs: 1500 } },
  wolf_pack: { text: "A matilha vem com 4 lobos.", changes: { summon: { kind: "wolf", count: 4, durationMs: 18000 } } },
  ancient_bear: { text: "O urso fica o dobro do tempo.", changes: { summon: { kind: "bear", count: 1, durationMs: 50000 } } },
  grove_guardian: { text: "Ao despertar, a árvore cura 20% da vida da equipe a até 3 tiles.", changes: { heal: 0.2, radius: 3 } },
  forest_heart: { text: "Dois fogos-fátuos.", changes: { summon: { kind: "wisp", count: 2, durationMs: 20000 } } },
  // Especializações
  hunter_mark: { text: "Marca também quem está colado no alvo.", changes: { radius: 1 } },
  sniper_stance: { text: "Firme sem ficar lento: anda na velocidade normal.", changes: { selfBuff: { ms: 8000, basicDamage: 1, attackRange: 2, moveSpeed: 0 } } },
  evasive_roll: { text: "Rola 5 tiles e ganha um escudo de 15% da vida por 3 s.", changes: { dash: { tiles: 5 }, range: 5, barrier: 0.15, barrierMs: 3000 } },
  swift_quiver: { text: "As flechas rápidas também causam +30% de dano.", changes: { selfBuff: { ms: 6000, attackHaste: 0.6, basicDamage: 0.3 } } },
  holy_spear: { text: "A lança atravessa todos os monstros na reta.", changes: { shape: "line", range: 7 } },
  divine_caldera: { text: "A luz ofusca os atingidos por 1 s.", changes: { stunMs: 1000 } },
  light_shield: { text: "O escudo dura o dobro do tempo.", changes: { barrierMs: 12000 } },
  consecrated_ground: { text: "O solo consagrado cobre raio 3.", changes: { radius: 3 } },
  lightning_arrow: { text: "Salta 5 vezes.", changes: { chain: { jumps: 5, range: 3, falloff: 0.2 } } },
  barrage: { text: "As flechas fazem sangrar.", changes: { dot: { perSec: 0.2, ms: 3000, kind: "bleed" } } },
  bear_trap: { text: "A armadilha prende também quem estiver colado no monstro.", changes: { radius: 1 } },
  arrow_cordon: { text: "A estaca atira 7 vezes.", changes: { field: { kind: "turret", ms: 12000, tickMs: 900, damage: 1, reach: 3, shots: 7 } } },
};

/** A magia com os números do nível comprado e, no nível 3, a Maestria (mana e recarga não mudam). */
export function spellAtRank(base: SpellDef, rank: number): SpellDef {
  const def = rank >= MASTERY_RANK ? { ...base, ...MASTERIES[base.id].changes } : base;
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
    mark: def.mark && { pct: def.mark.pct * k, ms: Math.round(def.mark.ms * t) },
    selfBuff: def.selfBuff && { ...def.selfBuff, ms: Math.round(def.selfBuff.ms * t) },
    field: def.field && { ...def.field, ms: Math.round(def.field.ms * t), damage: def.field.damage && def.field.damage * k },
    nextBasicStunMs: ms(def.nextBasicStunMs),
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
  const area = s.shape === "line" ? ` em linha (${s.range} tiles)` : s.shape === "cone" ? ` em leque (${s.range} tiles)`
    : s.radius > 0 && !s.field ? ` em raio ${s.radius}` : "";
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
  if (s.manaSteal) facts.push(`Rouba ${pct(s.manaSteal)} do dano em mana`);
  if (s.mark) facts.push(`Marca: +${pct(s.mark.pct)} de dano da equipe no alvo por ${sec(s.mark.ms)}`);
  if (s.undeadBonus) facts.push(`+${pct(s.undeadBonus)} de dano em mortos-vivos`);
  if (s.field?.kind === "zone") {
    facts.push(`Campo de raio ${s.radius} por ${sec(s.field.ms)}: ${num(s.field.damage ?? 0)}× por segundo nos monstros${s.field.allyArmor ? `, +${s.field.allyArmor} de armadura nos aliados` : ""}`);
  }
  if (s.field?.kind === "trap") facts.push(`Armadilha por ${sec(s.field.ms)}: dispara no primeiro monstro que pisar${s.radius > 0 ? ` (raio ${s.radius})` : ""}`);
  if (s.field?.kind === "turret") facts.push(`Estaca por ${sec(s.field.ms)}: ${s.field.shots} tiros de ${num(s.field.damage ?? 0)}× a até ${s.field.reach} tiles`);
  if (s.dash) facts.push(`Salta até ${s.dash.tiles} tiles`);
  if (s.nextBasicStunMs) facts.push(`A próxima flecha atordoa por ${sec(s.nextBasicStunMs)}`);
  if (s.selfBuff) {
    const b = s.selfBuff;
    const parts = [
      b.basicDamage ? `básico +${pct(b.basicDamage)}` : "",
      b.attackRange ? `alcance +${b.attackRange}` : "",
      b.attackHaste ? `básico ${pct(b.attackHaste)} mais rápido` : "",
      b.moveSpeed ? `anda ${pct(Math.abs(b.moveSpeed))} mais ${b.moveSpeed < 0 ? "devagar" : "rápido"}` : "",
    ].filter(Boolean);
    facts.push(`Por ${sec(b.ms)}: ${parts.join(", ")}`);
  }
  if (s.repeat) facts.push(`Repete depois de ${sec(s.repeat.delayMs)} com ${pct(s.repeat.power)} do dano`);
  if (s.killRefund) facts.push(`Se matar, a recarga cai ${pct(s.killRefund)}`);
  if (s.taunt) facts.push(`Provoca monstros a até ${s.radius} tiles`);
  if (s.summon) {
    const sum = SUMMONS[s.summon.kind];
    const power = rankPower(rank);
    const what = s.summon.count > 1 ? `${s.summon.count}× ${sum.name}` : sum.name;
    facts.push(`Invoca ${what} por ${sec(s.summon.durationMs)}`);
    facts.push(`Criatura: vida ${pct(sum.hp * power)} da sua${sum.damage ? ` · dano ${num(sum.damage * power)}×` : ""}${sum.heal ? ` · cura ${pct(sum.heal * power)}` : ""}${sum.mana ? ` · mana ${pct(sum.mana * power)}` : ""}`);
  }
  facts.push(`${s.manaCost} de mana · recarga ${num(s.cooldownMs / 1000)} s${s.aim !== "self" ? ` · alcance ${s.range}` : ""}`);
  if (rank >= MASTERY_RANK) facts.push(`★ Maestria: ${MASTERIES[def.id].text}`);
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
  return spell.aim === "target" && spell.radius === 0 && !spell.shape && !spell.dash && !spell.field;
}

/**
 * Tiles de uma magia em linha: do herói na direção do ponto mirado até `length` tiles, parando antes
 * da primeira parede. Não inclui o tile do herói. A reta segue o caminho exato (Bresenham) até o ponto
 * mirado e depois repete o mesmo passo, então sempre passa pelo alvo que o jogador viu.
 * Cliente (mira e efeito) e servidor (dano) usam a mesma conta.
 */
/**
 * Tiles de uma magia em cone: um leque de 90° do herói na direção do ponto mirado, até `length` tiles, só os que o
 * herói enxerga (paredes cortam o leque). Não inclui o tile do herói. Cliente e servidor usam a mesma conta.
 */
export function coneTiles(d: Dungeon, x0: number, y0: number, ax: number, ay: number, length: number) {
  const dir = Math.atan2(ay - y0, ax - x0);
  if (ax === x0 && ay === y0) return [];
  const tiles: { x: number; y: number }[] = [];
  for (let y = y0 - length; y <= y0 + length; y++) {
    for (let x = x0 - length; x <= x0 + length; x++) {
      if ((x === x0 && y === y0) || tileDistance(x0, y0, x, y) > length || blocksSight(d, x, y)) continue;
      let diff = Math.abs(Math.atan2(y - y0, x - x0) - dir);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      // Meia abertura de 45°, com folga para os tiles da borda não piscarem com o arredondamento.
      if (diff <= Math.PI / 4 + 0.01 && hasLineOfSight(d, x0, y0, x, y)) tiles.push({ x, y });
    }
  }
  return tiles;
}

export function lineTiles(d: Dungeon, x0: number, y0: number, ax: number, ay: number, length: number) {
  const path: { x: number; y: number }[] = [];
  const dx = Math.abs(ax - x0);
  const dy = -Math.abs(ay - y0);
  const sx = x0 < ax ? 1 : -1;
  const sy = y0 < ay ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  while (x !== ax || y !== ay) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
    path.push({ x, y });
  }
  const tiles: { x: number; y: number }[] = [];
  for (let i = 0; path.length > 0; i++) {
    const lap = Math.floor(i / path.length);
    const step = path[i % path.length];
    const t = { x: step.x + (ax - x0) * lap, y: step.y + (ay - y0) * lap };
    if (tileDistance(x0, y0, t.x, t.y) > length || blocksSight(d, t.x, t.y)) break;
    tiles.push(t);
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
