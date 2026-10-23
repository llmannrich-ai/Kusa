import type { MonsterKind } from "@kusa/shared";
import { mummyCanvas, scorpionCanvas, vultureCanvas } from "./desertMonsters.ts";
import { sandWormCanvas } from "./sandWorm.ts";

/** Sangue do monstro: cor da mancha no chão (`none` = não sangra, vira poeira ao morrer). */
export type BloodKind = "red" | "green" | "purple" | "black" | "none";

/** Tinta da mancha de sangue por tipo (o PNG do pack é vermelho; `red` fica sem tinta). */
export const BLOOD_TINT: Record<Exclude<BloodKind, "none" | "red">, number> = {
  green: 0x7cb342,
  purple: 0x9b59b6,
  black: 0x2b2b2b,
};

/** Texturas de monstro desenhadas aqui mesmo (não há PNG no pack para carregar): chave → desenho 32×32. */
export const OWN_SAND_WORM = "monster-sand-worm";
export const OWN_MONSTER_DRAW: Record<string, () => HTMLCanvasElement> = {
  [OWN_SAND_WORM]: sandWormCanvas,
  "monster-sand-scorpion": scorpionCanvas,
  "monster-giant-vulture": vultureCanvas,
  "monster-mummy": mummyCanvas,
};
export const OWN_MONSTER_ART: string[] = Object.keys(OWN_MONSTER_DRAW);

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
  /** Disfarce enquanto escondido (o Mímico parece um baú, sem transparência nem barra). */
  disguise?: string;
  /** Opacidade normal do sprite (o Cubo Gelatinoso é translúcido). */
  alpha?: number;
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
  // Cripta 2.0
  kobold: { texture: "monster-kobold", blood: "red" },
  stirge: { texture: "monster-stirge", facesLeft: true, blood: "red", flies: true },
  goblinArcher: { texture: "monster-goblin-archer", blood: "red" },
  zombie: { texture: "monster-zombie", blood: "none" },
  skeletonArcher: { texture: "monster-skeleton-archer", blood: "none" },
  giantSpider: { texture: "monster-giant-spider", blood: "green" },
  hobgoblin: { texture: "monster-hobgoblin", blood: "red" },
  gnoll: { texture: "monster-gnoll", blood: "red" },
  mimic: { texture: "monster-mimic", blood: "purple", disguise: "monster-mimic-disguise" },
  gelatinousCube: { texture: "monster-gelatinous-cube", blood: "green", alpha: 0.75 },
  bugbear: { texture: "monster-bugbear", blood: "red" },
  // Pântano 2.0
  bullywug: { texture: "monster-bullywug", facesLeft: true, blood: "green" },
  lizardfolk: { texture: "monster-lizardfolk", blood: "red" },
  ghoul: { texture: "monster-ghoul", blood: "none" },
  blackPudding: { texture: "monster-black-pudding", blood: "black" },
  crocodile: { texture: "monster-crocodile", facesLeft: true, blood: "red" },
  willOWisp: { texture: "monster-will-o-wisp", blood: "none", flies: true },
  shamblingMound: { texture: "monster-shambling-mound", blood: "green" },
  greenHag: { texture: "monster-green-hag", blood: "red" },
  // A ilusão é igual à Bruxa: não dá para saber qual é a verdadeira.
  hagIllusion: { texture: "monster-green-hag", blood: "none" },
  spiritNaga: { texture: "monster-spirit-naga", blood: "red" },
  blackDragon: { texture: "monster-black-dragon", facesLeft: true, blood: "red" },
  // Mar de Areia (arte própria, `desertMonsters.ts` e `sandWorm.ts`: não vem do pack).
  sandScorpion: { texture: "monster-sand-scorpion", facesLeft: true, blood: "green" },
  giantVulture: { texture: "monster-giant-vulture", facesLeft: true, blood: "red", flies: true },
  mummy: { texture: "monster-mummy", facesLeft: true, blood: "none" },
  sandWorm: { texture: OWN_SAND_WORM, facesLeft: true, blood: "red" },
};

/** Todas as texturas de monstro (as variantes incluídas), para carregar e refinar. */
export function monsterTextures() {
  const keys = new Set<string>();
  for (const art of Object.values(BESTIARY_ART)) {
    keys.add(art.texture);
    if (art.disguise) keys.add(art.disguise);
    for (const v of Object.values(art.variants ?? {})) keys.add(v);
  }
  return [...keys];
}

/** Textura do monstro na variante atual (sem variante, a padrão). */
export function monsterTexture(kind: MonsterKind, variant = 0) {
  const art = BESTIARY_ART[kind];
  return art.variants?.[variant] ?? art.texture;
}
