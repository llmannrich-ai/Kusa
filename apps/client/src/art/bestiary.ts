import type { MonsterKind } from "@kusa/shared";

/** Sangue do monstro: cor da mancha no chão (`none` = não sangra, vira poeira ao morrer). */
export type BloodKind = "red" | "green" | "purple" | "black" | "none";

/** Tinta da mancha de sangue por tipo (o PNG do pack é vermelho; `red` fica sem tinta). */
export const BLOOD_TINT: Record<Exclude<BloodKind, "none" | "red">, number> = {
  green: 0x7cb342,
  purple: 0x9b59b6,
  black: 0x2b2b2b,
};

export interface MonsterArt {
  /** Chave da textura (e nome do PNG em `assets/dcss/`). */
  texture: string;
  /** O sprite do pack olha para a esquerda (é espelhado quando anda para a direita). */
  facesLeft?: boolean;
  blood: BloodKind;
  /** Voa: flutua sobre a sombra. */
  flies?: boolean;
  /** Texturas por `Monster.variant` (cabeças da Hidra: índice = número de cabeças). */
  variants?: Record<number, string>;
}

/**
 * Registro visual de cada monstro (o servidor não sabe nada disto): textura, para que lado olha, sangue e voo.
 * Texturas novas entram também no `CREDITS.md` do pack.
 */
export const BESTIARY_ART: Record<MonsterKind, MonsterArt> = {
  rat: { texture: "monster-rat", facesLeft: true, blood: "red" },
  goblin: { texture: "monster-goblin", blood: "red" },
  skeleton: { texture: "monster-skeleton", blood: "none" },
  orc: { texture: "monster-orc", blood: "red" },
  ogre: { texture: "monster-ogre", blood: "red" },
  dragon: { texture: "monster-dragon", facesLeft: true, blood: "red" },
  frog: { texture: "monster-frog", facesLeft: true, blood: "green" },
  moccasin: { texture: "monster-moccasin", facesLeft: true, blood: "red" },
  bogBody: { texture: "monster-bog-body", blood: "none" },
  naga: { texture: "monster-naga", blood: "red" },
  troll: { texture: "monster-troll", blood: "green" },
  hydra: {
    texture: "monster-hydra", blood: "green",
    variants: { 1: "monster-hydra-1", 2: "monster-hydra-2", 3: "monster-hydra-3", 4: "monster-hydra-4", 5: "monster-hydra" },
  },
};

/** Todas as texturas de monstro (as variantes incluídas), para carregar e refinar. */
export function monsterTextures() {
  const keys = new Set<string>();
  for (const art of Object.values(BESTIARY_ART)) {
    keys.add(art.texture);
    for (const v of Object.values(art.variants ?? {})) keys.add(v);
  }
  return [...keys];
}

/** Textura do monstro na variante atual (sem variante, a padrão). */
export function monsterTexture(kind: MonsterKind, variant = 0) {
  const art = BESTIARY_ART[kind];
  return art.variants?.[variant] ?? art.texture;
}
