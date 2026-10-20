import type { ClassId } from "./classes.ts";

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
export const SPELL_SLOT_LEVELS = [3, 8] as const;
export type SpellSlot = 0 | 1;

export type SpellId =
  | "blade_spin" | "war_cry"
  | "holy_arrow" | "arrow_rain"
  | "shadow_orb" | "void_storm"
  | "forest_blessing" | "thorn_roots"
  // Compradas na árvore de magias da classe (menu).
  | "crushing_blow" | "iron_skin"
  | "piercing_shot" | "healing_light"
  | "lightning_bolt" | "frost_nova"
  | "venom_thorn" | "nature_wrath";

/**
 * Uma magia. Os efeitos se combinam: dano em área, cura, raízes, guarda e provocação.
 * `aim: "self"` centra a área em quem conjura; `aim: "target"` usa a mira (ou o alvo automático no toque rápido).
 */
export interface SpellDef {
  id: SpellId;
  classId: ClassId;
  slot: SpellSlot;
  name: string;
  description: string;
  /** Ícone do botão e da escolha. */
  icon: string;
  manaCost: number;
  cooldownMs: number;
  aim: "self" | "target";
  /** Alcance até o alvo (só `aim: "target"`). */
  range: number;
  /** Raio da área em tiles; 0 = só o alvo. */
  radius: number;
  /** Multiplicador do dano base nos monstros da área. */
  damage?: number;
  /** Cura, em fração do HP máximo, de quem está na área (aliados e quem conjura). */
  heal?: number;
  /** Monstros da área ficam presos no lugar (ainda atacam quem estiver perto). */
  rootMs?: number;
  /** Quem conjura recebe só (1 - guard) do dano por `guardMs`. */
  guard?: number;
  guardMs?: number;
  /** Monstros da área passam a perseguir quem conjurou. */
  taunt?: boolean;
  /** Tiles por segundo até o alvo; sem isso o efeito é imediato. */
  projectileSpeed?: number;
}

export const SPELLS: Record<SpellId, SpellDef> = {
  // Cavaleiro: aguenta a pancada e segura os monstros perto de si.
  blade_spin: {
    id: "blade_spin", classId: "knight", slot: 0, name: "Giro da Lâmina", icon: "🌀",
    description: "Gira a espada e corta todos os monstros ao redor.",
    manaCost: 12, cooldownMs: 5000, aim: "self", range: 0, radius: 1, damage: 1.6,
  },
  war_cry: {
    id: "war_cry", classId: "knight", slot: 1, name: "Grito de Guerra", icon: "📯",
    description: "Provoca os monstros por perto e reduz pela metade o dano recebido por 6 s.",
    manaCost: 25, cooldownMs: 14000, aim: "self", range: 0, radius: 4, taunt: true, guard: 0.5, guardMs: 6000,
  },
  // Paladino: tiros fortes de longe.
  holy_arrow: {
    id: "holy_arrow", classId: "paladin", slot: 0, name: "Flecha Sagrada", icon: "✴️",
    description: "Uma flecha de luz dourada que causa dano pesado num alvo.",
    manaCost: 25, cooldownMs: 5000, aim: "target", range: 6, radius: 0, damage: 2.6, projectileSpeed: 20,
  },
  arrow_rain: {
    id: "arrow_rain", classId: "paladin", slot: 1, name: "Chuva de Flechas", icon: "🏹",
    description: "Uma saraivada cai sobre o alvo e tudo ao redor dele.",
    manaCost: 45, cooldownMs: 10000, aim: "target", range: 6, radius: 2, damage: 1.4, projectileSpeed: 9,
  },
  // Feiticeiro: dano em área, frágil.
  shadow_orb: {
    id: "shadow_orb", classId: "sorcerer", slot: 0, name: "Esfera Sombria", icon: "🔮",
    description: "Uma esfera de trevas que explode no alvo e atinge quem estiver colado nele.",
    manaCost: 30, cooldownMs: 4000, aim: "target", range: 5, radius: 1, damage: 1.9, projectileSpeed: 8,
  },
  void_storm: {
    id: "void_storm", classId: "sorcerer", slot: 1, name: "Tempestade do Vazio", icon: "🌑",
    description: "Uma onda de vazio rasga todos os monstros num raio de 3 tiles.",
    manaCost: 70, cooldownMs: 12000, aim: "self", range: 0, radius: 3, damage: 2.3,
  },
  // Druida: cura a equipe e controla os monstros.
  forest_blessing: {
    id: "forest_blessing", classId: "druid", slot: 0, name: "Bênção da Floresta", icon: "🌿",
    description: "Cura 35% da vida de você e dos aliados a até 4 tiles.",
    manaCost: 40, cooldownMs: 10000, aim: "self", range: 0, radius: 4, heal: 0.35,
  },
  thorn_roots: {
    id: "thorn_roots", classId: "druid", slot: 1, name: "Raízes Espinhosas", icon: "🌱",
    description: "Raízes brotam em volta do alvo: ferem e prendem os monstros por 3,5 s.",
    manaCost: 55, cooldownMs: 12000, aim: "target", range: 5, radius: 2, damage: 1.2, rootMs: 3500,
  },

  // --- Compradas na árvore de magias (ver talents.ts) ---------------------------
  crushing_blow: {
    id: "crushing_blow", classId: "knight", slot: 0, name: "Golpe Esmagador", icon: "🔨",
    description: "Uma pancada brutal no monstro colado em você.",
    manaCost: 15, cooldownMs: 4500, aim: "target", range: 1, radius: 0, damage: 2.8,
  },
  iron_skin: {
    id: "iron_skin", classId: "knight", slot: 1, name: "Pele de Ferro", icon: "🛡️",
    description: "Recupera 25% da vida e corta 70% do dano recebido por 5 s.",
    manaCost: 30, cooldownMs: 16000, aim: "self", range: 0, radius: 0, heal: 0.25, guard: 0.7, guardMs: 5000,
  },
  piercing_shot: {
    id: "piercing_shot", classId: "paladin", slot: 0, name: "Disparo Perfurante", icon: "🎯",
    description: "Uma flecha de longe que atravessa o alvo e fere quem está colado nele.",
    manaCost: 28, cooldownMs: 5000, aim: "target", range: 7, radius: 1, damage: 1.9, projectileSpeed: 22,
  },
  healing_light: {
    id: "healing_light", classId: "paladin", slot: 1, name: "Luz Curativa", icon: "☀️",
    description: "Cura 30% da vida de você e dos aliados a até 3 tiles.",
    manaCost: 45, cooldownMs: 12000, aim: "self", range: 0, radius: 3, heal: 0.3,
  },
  lightning_bolt: {
    id: "lightning_bolt", classId: "sorcerer", slot: 0, name: "Relâmpago", icon: "⚡",
    description: "Um raio rápido que causa dano altíssimo num único alvo.",
    manaCost: 35, cooldownMs: 4500, aim: "target", range: 6, radius: 0, damage: 2.9, projectileSpeed: 30,
  },
  frost_nova: {
    id: "frost_nova", classId: "sorcerer", slot: 1, name: "Nova de Gelo", icon: "❄️",
    description: "Uma explosão de gelo ao seu redor: fere e congela os monstros por 2,5 s.",
    manaCost: 55, cooldownMs: 11000, aim: "self", range: 0, radius: 2, damage: 1.6, rootMs: 2500,
  },
  venom_thorn: {
    id: "venom_thorn", classId: "druid", slot: 0, name: "Espinho Venenoso", icon: "🦂",
    description: "Um espinho envenenado que causa dano forte num alvo.",
    manaCost: 30, cooldownMs: 4500, aim: "target", range: 5, radius: 0, damage: 2.3, projectileSpeed: 12,
  },
  nature_wrath: {
    id: "nature_wrath", classId: "druid", slot: 1, name: "Fúria da Natureza", icon: "🌪️",
    description: "Um redemoinho de folhas e pedras atinge o alvo e tudo ao redor dele.",
    manaCost: 60, cooldownMs: 11000, aim: "target", range: 5, radius: 2, damage: 1.9, projectileSpeed: 9,
  },
};

/** Magias que toda classe já tem de graça (uma por slot). As outras se compram na árvore. */
export const STARTER_SPELLS: readonly SpellId[] = [
  "blade_spin", "war_cry", "holy_arrow", "arrow_rain", "shadow_orb", "void_storm", "forest_blessing", "thorn_roots",
];

/**
 * Magias que a classe pode pôr num slot: as iniciais mais as compradas na árvore (`known`).
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
  return spell.aim === "target" && spell.radius === 0;
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
