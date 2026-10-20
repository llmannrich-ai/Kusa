import type { ClassId } from "./classes.ts";

/**
 * Ataque básico (auto-attack) de cada classe. Com `projectileSpeed`, o golpe viaja até o alvo
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
  | "forest_blessing" | "thorn_roots";

/**
 * Uma magia. Os efeitos se combinam: dano em área, cura, raízes, guarda e provocação.
 * `aim: "self"` centra a área em quem conjura; `aim: "target"` precisa de um monstro no alcance.
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
};

/**
 * Magias que a classe pode pôr num slot. Por enquanto toda classe tem uma por slot, que já vem
 * de graça; quando o mercado do menu existir, as compradas entram aqui como opções extras.
 */
export function spellChoices(classId: ClassId, slot: SpellSlot): SpellDef[] {
  return Object.values(SPELLS).filter((s) => s.classId === classId && s.slot === slot);
}
