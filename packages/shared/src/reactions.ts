import type { DamageElement } from "./monsters.ts";

// Reações (Grimório 4.0, plano em docs/GRIMORIO_4_PLANO.md, seção 6.2): um estado no monstro prepara o golpe seguinte.
// O servidor confere a cada golpe de herói, criatura ou campo, de qualquer jogador: no co-op, o fogo de um e o gelo do
// outro combinam. A força base é baixa de propósito (ensina o combo sem mudar o equilíbrio das magias de hoje); os Dons
// de combo e as magias de combo (fases seguintes) é que deixam cada reação forte.
// Toda reação, menos o Exposto, gasta o estado que a preparou: o mesmo monstro não reage de novo sem ser preparado de novo.

export type ReactionId = "vapor" | "shatter" | "hemorrhage" | "toxic_ember" | "thornbush" | "doom" | "incandesce" | "exposed";

export interface ReactionDef {
  id: ReactionId;
  name: string;
  icon: string;
  /** Cor do aviso sobre o monstro. */
  color: number;
  /** O que prepara e o que dispara, em uma frase. */
  when: string;
  /** O que acontece. */
  effect: string;
}

/** Vapor: explosão (vezes o golpe que disparou), raio e ofuscar. */
export const VAPOR = { power: 0.8, radius: 1, dazzleMs: 500 } as const;
/** Estilhaço: dano extra no golpe que quebra o gelo. */
export const SHATTER_BONUS = 0.4;
/** Brasa Tóxica: a nuvem queima quem está no raio por tanto tempo, com esta força por segundo (vezes o golpe). */
export const TOXIC_EMBER = { radius: 1, ms: 2000, perSec: 0.25 } as const;
/**
 * Espinheiro: as raízes viram espinhos e o monstro sangra na hora o que `seconds` pulsos do veneno que disparou
 * feririam (na hora, para não trocar o veneno pelo sangramento: o monstro só guarda um dano contínuo).
 */
export const THORNBUSH = { seconds: 3 } as const;
/** Condenação: a marca explode (vezes o golpe) em raio. */
export const DOOM = { power: 1, radius: 1 } as const;
/** Incandescer: a luz explode (vezes o golpe) em raio, o dobro em mortos-vivos. */
export const INCANDESCE = { power: 0.8, radius: 1, undead: 2 } as const;
/** Exposto: marcado e atordoado ao mesmo tempo recebe mais dano enquanto os dois durarem. */
export const EXPOSED_BONUS = 0.3;

export const REACTIONS: Record<ReactionId, ReactionDef> = {
  vapor: {
    id: "vapor", name: "Vapor", icon: "💨", color: 0xdff6ff,
    when: "monstro queimando + magia de gelo (ou congelado + fogo)",
    effect: `explode em raio ${VAPOR.radius} com ${VAPOR.power * 100}% do golpe, ofusca ${VAPOR.dazzleMs / 1000}s e apaga o fogo e o gelo`,
  },
  shatter: {
    id: "shatter", name: "Estilhaço", icon: "💎", color: 0x9be7ff,
    when: "monstro congelado + golpe de energia ou físico",
    effect: `+${SHATTER_BONUS * 100}% no golpe e o gelo quebra (o Traço Estilhaçar continua mais forte)`,
  },
  hemorrhage: {
    id: "hemorrhage", name: "Hemorragia", icon: "🩸", color: 0xe74c3c,
    when: "monstro sangrando + empurrão ou atordoamento",
    effect: "o resto do sangramento entra todo de uma vez",
  },
  toxic_ember: {
    id: "toxic_ember", name: "Brasa Tóxica", icon: "🌋", color: 0xb8e04a,
    when: "monstro envenenado + fogo",
    effect: `o veneno pega fogo: queima quem está em raio ${TOXIC_EMBER.radius} por ${TOXIC_EMBER.ms / 1000}s`,
  },
  thornbush: {
    id: "thornbush", name: "Espinheiro", icon: "🌿", color: 0x6ab04c,
    when: "monstro preso por raiz + veneno",
    effect: `as raízes viram espinhos: ele sangra na hora ${THORNBUSH.seconds} pulsos do veneno (e o veneno continua)`,
  },
  doom: {
    id: "doom", name: "Condenação", icon: "🌑", color: 0x8e44ad,
    when: "monstro marcado + magia de trevas",
    effect: `a marca explode em raio ${DOOM.radius} com ${DOOM.power * 100}% do golpe`,
  },
  incandesce: {
    id: "incandesce", name: "Incandescer", icon: "🔆", color: 0xffe082,
    when: "monstro ofuscado (atordoado por luz) + fogo",
    effect: `a luz explode em raio ${INCANDESCE.radius} com ${INCANDESCE.power * 100}% do golpe, o dobro em mortos-vivos`,
  },
  exposed: {
    id: "exposed", name: "Exposto", icon: "🎯", color: 0xf7d774,
    when: "monstro marcado e atordoado ao mesmo tempo",
    effect: `recebe +${EXPOSED_BONUS * 100}% de dano de tudo enquanto os dois durarem`,
  },
};

/** Estados do monstro que as reações leem (o servidor monta a partir do `Brain`). */
export interface MonsterStates {
  burning: boolean;
  poisoned: boolean;
  bleeding: boolean;
  /** Preso por raiz (não por gelo). */
  rooted: boolean;
  /** Preso por magia de gelo. */
  frozen: boolean;
  /** Atordoado por magia de luz. */
  dazzled: boolean;
  stunned: boolean;
  marked: boolean;
}

/**
 * Reação que um golpe direto (não o pulso de dano contínuo) dispara num monstro com estes estados. `spell` diz se o golpe
 * é de magia (o Vapor pede "magia de gelo" e a Condenação, "magia de trevas"); fogo dispara de qualquer fonte.
 * Com dois estados que reagem ao mesmo golpe, vale a ordem da lista.
 */
export function hitReaction(states: MonsterStates, element: DamageElement, spell: boolean): ReactionId | null {
  if (states.frozen && element === "fire") return "vapor";
  if (states.burning && element === "ice" && spell) return "vapor";
  if (states.frozen && (element === "energy" || element === "physical")) return "shatter";
  if (states.dazzled && element === "fire") return "incandesce";
  if (states.poisoned && element === "fire") return "toxic_ember";
  if (states.marked && element === "dark" && spell) return "doom";
  return null;
}
