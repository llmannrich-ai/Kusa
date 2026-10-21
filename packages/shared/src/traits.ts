import type { ClassId } from "./classes.ts";

// Traços: a passiva de cada especialização do Grimório. No fim de um ramo, a árvore se divide em dois
// lados; cada lado tem um Traço e duas magias. Comprar o Traço de um lado tranca o outro para sempre
// (a escolha é permanente, como a subclasse do D&D). O Traço vale sempre, como as áureas; as magias do
// lado viram opção na hunt como as outras. Ver docs/GRIMORIO_PLANO.md (seções 4 e 6).

export type TraitId =
  | "eagle_eye" | "light_step"
  | "consecrated_arrows" | "sacred_aura"
  | "gunpowder" | "ingenious";

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
};

export function isTrait(id: string): id is TraitId {
  return id in TRAITS;
}
