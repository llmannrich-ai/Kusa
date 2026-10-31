import type { MonsterKind } from "@kusa/shared";
import { BLACK_SHELL, mummyCanvas, sandElementalCanvas, scorpionCanvas, vultureCanvas } from "./desertMonsters.ts";
import { sandWormCanvas } from "./sandWorm.ts";
import { basiliskCanvas, beholderCanvas } from "./cavernBosses.ts";
import {
  boneArcherCanvas, boneCenturionCanvas, boneJackalCanvas, boneLegionaryCanvas, buriedDeadCanvas, eternalPharaohCanvas, mournerCanvas,
  royalMummyCanvas, sandScribeCanvas, scarabSwarmCanvas, singingColossusCanvas, wrappedMummyCanvas,
} from "./necropolisMonsters.ts";
import { MARSH_MONSTER_OUTLINE, MARSH_SPECIES, speciesPortrait, speciesSheet, type MarshSpecies } from "./marshMonsters.ts";
import type { Clip } from "./rig.ts";
import type { SheetSource } from "./proto/sheetSource.ts";
import { KING_OUTLINE, KING_SIZE, ogreKingPortrait, ogreKingSheet } from "./ogreKing.ts";
import { NEW_ART_ZOOM, protoBeasts, protoBullywugKing, protoClan, protoFrog, protoGoblin, protoHero } from "./newArt.ts";

/**
 * Monstro animado (arte própria em folha, `rig.ts`): os quadros de `CLIP_ORDER` lado a lado, cada um `size` px de
 * lado, olhando para a esquerda. No jogo vira uma textura refinada com uma animação por clipe.
 */
export interface MonsterAnim {
  size: number;
  sheet: () => HTMLCanvasElement;
  /** Primeiro quadro, para a galeria e para quem não anima. */
  portrait: () => HTMLCanvasElement;
  outline: string;
  /** Quadros por segundo de cada clipe (o andar acompanha o passo do monstro no jogo). */
  fps: Record<Clip, number>;
  /** Quadros de cada clipe, se não forem os de `CLIPS` (as invocações têm ciclos mais longos). */
  frames?: Record<Clip, number>;
  /** Quadros do andar por tile andado (padrão 3: o ciclo de 6 quadros cobre 2 tiles). */
  stride?: number;
  /** Arte nova (128 px por tile): a folha entra como está, sem o refinamento 2×, desenhada quadro a quadro. */
  hd?: () => (() => HTMLCanvasElement)[];
  /** Parte de cima do quadro que o corpo ocupa (a barra de vida fica logo acima da cabeça; padrão: o quadro todo). */
  fill?: number;
  /**
   * Clipes a mais (arte nova), na folha depois dos de `CLIP_ORDER`, na ordem de `EXTRA_CLIPS`: a morte (o cadáver
   * toca em vez de tombar) e o parado e o andar de frente (`Down`) e de costas (`Up`), quando o monstro anda na vertical.
   */
  extra?: Partial<Record<ExtraClip, number>>;
  /** Clipe da habilidade (padrão: o golpe; chamar a guarda e sumir: o especial), ou um por habilidade (id → clipe). */
  strike?: Clip | Record<string, Clip>;
  /**
   * Folha em PNG de onde saem os quadros (arte desenhada por IA): `hd`, `sheet` e `portrait` só desenham com ela
   * carregada (`loadMapSheets` em `textures.ts`, quando a hunt começa).
   */
  source?: SheetSource;
}

/** Clipes a mais dos monstros da arte nova (`MonsterAnim.extra`), na ordem da folha. */
export const EXTRA_CLIPS = ["death", "idleDown", "walkDown", "idleUp", "walkUp"] as const;
export type ExtraClip = (typeof EXTRA_CLIPS)[number];

const ANIM_FPS: Record<Clip, number> = { idle: 4, walk: 9, attack: 12, cast: 7 };

/** Monstro do clã do brejo, em arte própria animada. */
function marshAnim(kind: MarshSpecies): MonsterAnim {
  const sp = MARSH_SPECIES[kind];
  return { size: sp.size, sheet: () => speciesSheet(sp), portrait: () => speciesPortrait(sp), outline: MARSH_MONSTER_OUTLINE, fps: ANIM_FPS };
}

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
  "monster-sand-scorpion": () => scorpionCanvas(),
  "monster-giant-vulture": vultureCanvas,
  "monster-mummy": () => mummyCanvas(),
  "monster-black-scorpion": () => scorpionCanvas(BLACK_SHELL),
  "monster-mummy-priest": () => mummyCanvas(true),
  "monster-sand-elemental": sandElementalCanvas,
  "monster-basilisk": basiliskCanvas,
  "monster-beholder": beholderCanvas,
  "monster-bone-jackal": boneJackalCanvas,
  "monster-scarab-swarm": scarabSwarmCanvas,
  "monster-bone-legionary": boneLegionaryCanvas,
  "monster-bone-archer": boneArcherCanvas,
  "monster-wrapped-mummy": wrappedMummyCanvas,
  "monster-mourner": mournerCanvas,
  "monster-buried-dead": buriedDeadCanvas,
  "monster-bone-centurion": boneCenturionCanvas,
  "monster-royal-mummy": royalMummyCanvas,
  "monster-sand-scribe": sandScribeCanvas,
  "monster-singing-colossus": singingColossusCanvas,
  "monster-eternal-pharaoh": eternalPharaohCanvas,
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
  /** Disfarce enquanto escondido (o Mímico parece um baú, sem transparência nem barra). */
  disguise?: string;
  /** Opacidade normal do sprite (o Cubo Gelatinoso é translúcido). */
  alpha?: number;
  /**
   * Animado: folha de quadros (o tamanho do quadro já dá o tamanho no jogo: 32 px = 1 tile; `scale` multiplica).
   */
  anim?: MonsterAnim;
  /**
   * Tamanho do sprite em relação ao tile (padrão 1; o boss é sempre 2, menos o animado, que usa o quadro). Mini-boss que é a versão grande de um comum
   * (o Escorpião Negro) fica maior para não ser confundido com ele.
   */
  scale?: number;
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
  // Na arte antiga, o bullywug do pack em tamanho de boss; na nova, a folha própria (abaixo).
  bullywugKing: { texture: "monster-bullywug", facesLeft: true, blood: "green" },
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
  blackScorpion: { texture: "monster-black-scorpion", facesLeft: true, blood: "green", scale: 1.45 },
  mummyPriest: { texture: "monster-mummy-priest", facesLeft: true, blood: "none", scale: 1.15 },
  sandElemental: { texture: "monster-sand-elemental", facesLeft: true, blood: "none", scale: 1.3 },
  sandWorm: { texture: OWN_SAND_WORM, facesLeft: true, blood: "red" },
  // Caverna da Travessia (arte própria, `cavernBosses.ts`).
  basilisk: { texture: "monster-basilisk", facesLeft: true, blood: "green" },
  beholder: { texture: "monster-beholder", facesLeft: true, blood: "purple", flies: true },
  // Necrópole de Solária (arte própria, `necropolisMonsters.ts`; com a Arte nova, os humanoides vêm do protótipo).
  boneJackal: { texture: "monster-bone-jackal", facesLeft: true, blood: "none" },
  scarabSwarm: { texture: "monster-scarab-swarm", facesLeft: true, blood: "green" },
  boneLegionary: { texture: "monster-bone-legionary", facesLeft: true, blood: "none" },
  boneArcher: { texture: "monster-bone-archer", facesLeft: true, blood: "none" },
  wrappedMummy: { texture: "monster-wrapped-mummy", facesLeft: true, blood: "none" },
  mourner: { texture: "monster-mourner", facesLeft: true, blood: "none" },
  buriedDead: { texture: "monster-buried-dead", facesLeft: true, blood: "none" },
  boneCenturion: { texture: "monster-bone-centurion", facesLeft: true, blood: "none", scale: 1.35 },
  royalMummy: { texture: "monster-royal-mummy", facesLeft: true, blood: "none", scale: 1.25 },
  sandScribe: { texture: "monster-sand-scribe", facesLeft: true, blood: "none", scale: 1.2 },
  singingColossus: { texture: "monster-singing-colossus", facesLeft: true, blood: "none" },
  eternalPharaoh: { texture: "monster-eternal-pharaoh", facesLeft: true, blood: "none", flies: true },
  // Pântano (arte própria animada, `marshMonsters.ts` e `ogreKing.ts`).
  orcScout: { texture: "monster-orc-scout", facesLeft: true, blood: "red", anim: marshAnim("orcScout") },
  orcGrunt: { texture: "monster-orc-grunt", facesLeft: true, blood: "red", anim: marshAnim("orcGrunt") },
  orcSpearman: { texture: "monster-orc-spearman", facesLeft: true, blood: "red", anim: marshAnim("orcSpearman") },
  orcArcher: { texture: "monster-orc-archer", facesLeft: true, blood: "red", anim: marshAnim("orcArcher") },
  orcShaman: { texture: "monster-orc-shaman", facesLeft: true, blood: "red", anim: marshAnim("orcShaman") },
  orcBerserker: { texture: "monster-orc-berserker", facesLeft: true, blood: "red", anim: marshAnim("orcBerserker") },
  orcCaptain: { texture: "monster-orc-captain", facesLeft: true, blood: "red", anim: marshAnim("orcCaptain") },
  ogreYoung: { texture: "monster-ogre-young", facesLeft: true, blood: "red", anim: marshAnim("ogreYoung") },
  ogreBruiser: { texture: "monster-ogre-bruiser", facesLeft: true, blood: "red", anim: marshAnim("ogreBruiser") },
  ogreShaman: { texture: "monster-ogre-shaman", facesLeft: true, blood: "red", anim: marshAnim("ogreShaman") },
  orcWarlord: { texture: "monster-orc-warlord", facesLeft: true, blood: "red", anim: marshAnim("orcWarlord") },
  ogreKing: {
    texture: "monster-ogre-king", facesLeft: true, blood: "red", scale: 1.35,
    anim: { size: KING_SIZE, sheet: ogreKingSheet, portrait: ogreKingPortrait, outline: KING_OUTLINE, fps: { idle: 3.5, walk: 8, attack: 9, cast: 6 } },
  },
};

// Arte nova (beta): os monstros humanoides da Cripta vêm do protótipo, animados e já em 128 px por tile (o sprite vai
// em metade da escala dos outros, que têm 64 px por tile, com a mesma ampliação dos heróis).
export const HD_FPS: Record<Clip, number> = { idle: 4, walk: 8, attack: 10, cast: 6 };
const HD_SCALE = 0.5 * NEW_ART_ZOOM;
if (protoHero) {
  const proto = protoHero;
  for (const kind of proto.PROTO_MONSTERS as MonsterKind[]) {
    const art = BESTIARY_ART[kind];
    art.facesLeft = true;
    art.scale = HD_SCALE;
    art.anim = {
      size: proto.PROTO_SIZE, sheet: () => proto.protoMonsterSheet(kind), portrait: () => proto.protoMonsterPortrait(kind), outline: "",
      fps: HD_FPS, frames: { ...proto.MONSTER_CLIP_FRAMES }, stride: 2, hd: () => proto.protoMonsterFrames(kind),
      fill: Math.min(1, 0.74 * proto.monsterSize(kind)),
    };
  }
}
// O goblin vem da arte de referência (folha em PNG), não do desenho por código: troca a animação do kit.
if (protoGoblin && protoHero) {
  const goblin = protoGoblin;
  BESTIARY_ART.goblin.anim = {
    ...BESTIARY_ART.goblin.anim!, sheet: () => goblin.sheet(), portrait: () => goblin.portrait(), hd: () => goblin.frames(), fill: goblin.fill,
  };
}
// O sapo vem das folhas geradas por IA (PNG), com mais movimentos: a língua na habilidade, a morte e frente e costas.
if (protoFrog) {
  const frog = protoFrog;
  BESTIARY_ART.frog = {
    ...BESTIARY_ART.frog, facesLeft: true, scale: HD_SCALE,
    anim: {
      size: frog.size, sheet: () => frog.sheet(), portrait: () => frog.portrait(), outline: "",
      fps: { idle: 4, walk: 8, attack: 10, cast: 8 }, frames: { idle: 4, walk: 4, attack: 4, cast: 4 }, stride: 2,
      hd: () => frog.frames(), fill: frog.fill, extra: { ...frog.extra }, strike: "cast", source: frog.source,
    },
  };
}
// O Rei Bullywug vem das folhas geradas no Runway (PNG): o bote saindo da lama no mergulho, a lança na estocada e no
// chamado da guarda, a morte e frente e costas. Textura própria (sem PNG no pack): o retrato fica em `OWN_MONSTER_DRAW`.
if (protoBullywugKing) {
  const king = protoBullywugKing;
  BESTIARY_ART.bullywugKing = {
    ...BESTIARY_ART.bullywugKing, texture: "monster-bullywug-king", facesLeft: true, scale: HD_SCALE,
    anim: {
      size: king.size, sheet: () => king.sheet(), portrait: () => king.portrait(), outline: "",
      fps: { idle: 4, walk: 7, attack: 10, cast: 7 }, frames: { idle: 4, walk: 4, attack: 4, cast: 4 }, stride: 2,
      hd: () => king.frames(), fill: king.fill, extra: { ...king.extra }, strike: { mudAmbush: "cast", spearThrust: "attack", swampCall: "attack" },
      source: king.source,
    },
  };
  OWN_MONSTER_DRAW["monster-bullywug-king"] = () => king.portrait();
}
// O clã do Pântano do Kosaradius que já tem folha gerada por IA (PNG) troca a arte por código: parado, andar, frente e
// costas da folha de giro; golpe e especial saem do perfil até chegar a folha de ação.
if (protoClan) {
  for (const [kind, clan] of Object.entries(protoClan) as [MonsterKind, NonNullable<(typeof protoClan)[MonsterKind]>][]) {
    BESTIARY_ART[kind] = {
      ...BESTIARY_ART[kind], facesLeft: true, scale: HD_SCALE,
      anim: {
        size: clan.size, sheet: () => clan.sheet(), portrait: () => clan.portrait(), outline: "",
        fps: { idle: 4, walk: 6, attack: 10, cast: 6 }, frames: { idle: 4, walk: 4, attack: 4, cast: 4 }, stride: 2,
        hd: () => clan.frames(), fill: clan.fill, extra: { ...clan.extra }, source: clan.source,
      },
    };
  }
}
// Os bichos (rato, stirge, aranha, cubo, mímico e o dragão) têm desenho próprio; o dragão vem num quadro 2× maior.
if (protoBeasts) {
  const proto = protoBeasts;
  for (const kind of proto.PROTO_BEASTS as MonsterKind[]) {
    const art = BESTIARY_ART[kind];
    art.facesLeft = true;
    art.scale = HD_SCALE;
    art.anim = {
      size: proto.beastSize(kind), sheet: () => proto.protoBeastSheet(kind), portrait: () => proto.protoBeastPortrait(kind), outline: "",
      fps: HD_FPS, frames: { ...proto.BEAST_CLIP_FRAMES }, stride: 2, hd: () => proto.protoBeastFrames(kind), fill: proto.beastFill(kind),
    };
  }
  OWN_MONSTER_DRAW["monster-mimic-disguise"] = proto.protoMimicDisguise;
}

/** Monstros animados: textura → animação. */
export const MONSTER_ANIMS: Record<string, MonsterAnim> = Object.fromEntries(
  Object.values(BESTIARY_ART).filter((a) => a.anim).map((a) => [a.texture, a.anim!]),
);
/** Chave da animação de um clipe de um monstro animado. */
export const monsterAnimKey = (texture: string, clip: Clip | ExtraClip) => `${texture}:${clip}`;

// Os animados entram com o primeiro quadro (a galeria usa; no jogo a folha inteira vira textura antes).
for (const [key, anim] of Object.entries(MONSTER_ANIMS)) OWN_MONSTER_DRAW[key] = anim.portrait;
export const OWN_MONSTER_ART: string[] = Object.keys(OWN_MONSTER_DRAW);

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
