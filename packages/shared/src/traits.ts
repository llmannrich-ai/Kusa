import type { ClassId } from "./classes.ts";

// Traços: a passiva de cada especialização do Grimório. No fim de um ramo, a árvore se divide em dois
// lados; cada lado tem um Traço e duas magias. Comprar o Traço de um lado tranca o outro para sempre
// (a escolha é permanente, como a subclasse do D&D). O Traço vale sempre, como as áureas; as magias do
// lado viram opção na hunt como as outras. Ver docs/GRIMORIO_PLANO.md (seções 4 e 6).

export type TraitId = "eagle_eye" | "light_step";

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
}

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
};

export function isTrait(id: string): id is TraitId {
  return id in TRAITS;
}
