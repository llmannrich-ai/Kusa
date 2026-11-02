import { MONSTERS, type MonsterKind } from "@kusa/shared";
import { BLACK_SHELL, mummyCanvas, sandElementalCanvas, scorpionCanvas, vultureCanvas } from "./desertMonsters.ts";
import { sandWormCanvas } from "./sandWorm.ts";
import { basiliskCanvas, beholderCanvas } from "./cavernBosses.ts";
import {
  boneArcherCanvas, boneCenturionCanvas, boneJackalCanvas, boneLegionaryCanvas, buriedDeadCanvas, eternalPharaohCanvas, mournerCanvas,
  royalMummyCanvas, sandScribeCanvas, scarabSwarmCanvas, singingColossusCanvas, wrappedMummyCanvas,
} from "./necropolisMonsters.ts";
import {
  corruptedDryadCanvas, direWolfCanvas, greenDragonCanvas, menhirGuardianCanvas, owlbearCanvas, renegadeCentaurCanvas, satyrCanvas,
  shadowPantherCanvas, thornSpitterCanvas, twiglingCanvas,
} from "./forestMonsters.ts";
import { MARSH_MONSTER_OUTLINE, MARSH_SPECIES, speciesPortrait, speciesSheet, type MarshSpecies } from "./marshMonsters.ts";
import type { Clip } from "./rig.ts";
import type { SheetSource } from "./proto/sheetSource.ts";
import { KING_OUTLINE, KING_SIZE, ogreKingPortrait, ogreKingSheet } from "./ogreKing.ts";
import { warlordArt } from "./proto/warlordArt.ts";
import { charcoArt } from "./proto/charcoArt.ts";
import { ermosArt } from "./proto/ermosArt.ts";
import { NEW_ART_ZOOM, protoBeasts, protoBullywugKing, protoClan, protoCrypt, protoFrog, protoHero, protoOrcScout, protoSculpt } from "./newArt.ts";

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
  /**
   * Altura do ponto de apoio no quadro (0 = topo, 1 = base; padrão 1). A arte esculpida (`proto/sculpt.ts`) é vista de
   * cima e as partes de cá (pinças de frente) descem abaixo da base do tile.
   */
  origin?: number;
  /** Parte de cima do quadro que o corpo ocupa (a barra de vida fica logo acima da cabeça; padrão: o quadro todo). */
  fill?: number;
  /**
   * Clipes a mais (arte nova), na folha depois dos de `CLIP_ORDER`, na ordem de `EXTRA_CLIPS`: a morte (o cadáver
   * toca em vez de tombar), o parado e o andar de frente (`Down`) e de costas (`Up`), quando o monstro anda na vertical,
   * e a 2ª habilidade desenhada (`skill`, no ritmo do especial).
   */
  extra?: Partial<Record<ExtraClip, number>>;
  /**
   * Clipe da habilidade (padrão: o golpe; chamar a guarda e sumir: o especial), ou um por habilidade (id → clipe). A
   * 2ª habilidade desenhada (folha C do clã do Kosaradius) é o clipe a mais `skill`.
   */
  strike?: Clip | Record<string, Clip | "skill">;
  /**
   * Folha em PNG de onde saem os quadros (arte desenhada por IA): `hd`, `sheet` e `portrait` só desenham com ela
   * carregada (`loadMapSheets` em `textures.ts`, quando a hunt começa).
   */
  source?: SheetSource;
}

/** Clipes a mais dos monstros da arte nova (`MonsterAnim.extra`), na ordem da folha. */
export const EXTRA_CLIPS = ["death", "idleDown", "walkDown", "idleUp", "walkUp", "skill"] as const;
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
  "monster-twigling": twiglingCanvas,
  "monster-dire-wolf": direWolfCanvas,
  "monster-satyr": satyrCanvas,
  "monster-thorn-spitter": thornSpitterCanvas,
  "monster-shadow-panther": shadowPantherCanvas,
  "monster-owlbear": owlbearCanvas,
  "monster-corrupted-dryad": corruptedDryadCanvas,
  "monster-renegade-centaur": renegadeCentaurCanvas,
  "monster-menhir-guardian": menhirGuardianCanvas,
  "monster-green-dragon": greenDragonCanvas,
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
  // Bosque Velho (arte própria, `forestMonsters.ts`). O Galhudo é pequeno; o Urso-coruja, o único comum maior que 1 tile.
  twigling: { texture: "monster-twigling", facesLeft: true, blood: "none", scale: 0.8 },
  direWolf: { texture: "monster-dire-wolf", facesLeft: true, blood: "red" },
  satyr: { texture: "monster-satyr", facesLeft: true, blood: "red" },
  thornSpitter: { texture: "monster-thorn-spitter", facesLeft: true, blood: "green" },
  shadowPanther: { texture: "monster-shadow-panther", facesLeft: true, blood: "black" },
  owlbear: { texture: "monster-owlbear", facesLeft: true, blood: "red", scale: 1.4 },
  corruptedDryad: { texture: "monster-corrupted-dryad", facesLeft: true, blood: "green", scale: 1.25 },
  renegadeCentaur: { texture: "monster-renegade-centaur", facesLeft: true, blood: "red", scale: 1.5 },
  menhirGuardian: { texture: "monster-menhir-guardian", facesLeft: true, blood: "none", scale: 1.6 },
  greenDragon: { texture: "monster-green-dragon", facesLeft: true, blood: "green" },
  // Coração da Mata: na arte antiga, o desenho mais parecido do Bosque Velho e do pack (a arte deles é a esculpida).
  myconid: { texture: "monster-shambling-mound", blood: "green" },
  thornBoar: { texture: "monster-dire-wolf", facesLeft: true, blood: "red" },
  corruptedStag: { texture: "monster-dire-wolf", facesLeft: true, blood: "black", scale: 1.2 },
  elvenShade: { texture: "monster-mourner", facesLeft: true, blood: "none" },
  stranglerVine: { texture: "monster-shambling-mound", blood: "green", scale: 1.15 },
  awakenedTree: { texture: "monster-thorn-spitter", facesLeft: true, blood: "green", scale: 1.7 },
  fallenWarden: { texture: "monster-bone-legionary", facesLeft: true, blood: "none", scale: 1.3 },
  erlking: { texture: "monster-satyr", facesLeft: true, blood: "green" },
  // Charco Cinzento: esculpidos por código (`proto/charcoArt.ts`), com a arte nova ligada ou não (abaixo). A ilusão usa a
  // folha da Bruxa Cinzenta: não dá para saber qual é a verdadeira.
  giantLeech: { texture: "monster-hd-giantLeech", facesLeft: true, blood: "red" },
  carrionCrow: { texture: "monster-hd-carrionCrow", facesLeft: true, blood: "red", flies: true },
  peatDrowned: { texture: "monster-hd-peatDrowned", facesLeft: true, blood: "none" },
  lanternBearer: { texture: "monster-hd-lanternBearer", facesLeft: true, blood: "none" },
  ashOoze: { texture: "monster-hd-ashOoze", facesLeft: true, blood: "black" },
  poolLurker: { texture: "monster-hd-poolLurker", facesLeft: true, blood: "red" },
  ashHag: { texture: "monster-hd-ashHag", facesLeft: true, blood: "red" },
  ashHagIllusion: { texture: "monster-hd-ashHag", facesLeft: true, blood: "none" },
  bogMonolith: { texture: "monster-hd-bogMonolith", facesLeft: true, blood: "none" },
  drownedKnight: { texture: "monster-hd-drownedKnight", facesLeft: true, blood: "none" },
  morgrana: { texture: "monster-hd-morgrana", facesLeft: true, blood: "none" },
  // Ermos Rubros: esculpidos por código (`proto/ermosArt.ts`), como os do Charco.
  rustBeetle: { texture: "monster-hd-rustBeetle", facesLeft: true, blood: "none" },
  badlandsHyena: { texture: "monster-hd-badlandsHyena", facesLeft: true, blood: "red" },
  redRaider: { texture: "monster-hd-redRaider", facesLeft: true, blood: "red" },
  lostMiner: { texture: "monster-hd-lostMiner", facesLeft: true, blood: "none" },
  plateLizard: { texture: "monster-hd-plateLizard", facesLeft: true, blood: "red" },
  rustDevil: { texture: "monster-hd-rustDevil", facesLeft: true, blood: "none" },
  deadForeman: { texture: "monster-hd-deadForeman", facesLeft: true, blood: "none" },
  oreGolem: { texture: "monster-hd-oreGolem", facesLeft: true, blood: "none" },
  hyenaMatriarch: { texture: "monster-hd-hyenaMatriarch", facesLeft: true, blood: "red" },
  kragmor: { texture: "monster-hd-kragmor", facesLeft: true, blood: "red" },
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
  // Fortaleza Orc: a arte (esculpida por código) entra logo abaixo, com a arte nova ligada ou não.
  emberWarlord: { texture: "monster-ember-warlord", facesLeft: true, blood: "red" },
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
      hd: () => king.frames(), fill: king.fill, extra: { ...king.extra }, strike: { spearThrust: "attack", swampCall: "attack" },
      source: king.source,
    },
  };
  OWN_MONSTER_DRAW["monster-bullywug-king"] = () => king.portrait();
}
// O clã do Pântano do Kosaradius que já tem folha gerada por IA (PNG) troca a arte por código: parado, andar, frente e
// costas da folha de giro; golpe e especial saem do perfil até chegar a folha de ação. Orcs e ogros entram 20% maiores
// que os outros monstros da arte nova (só o desenho: a colisão e o alcance são do servidor); o chefe e os semi-chefes
// (`boss` e `miniboss`), que já vêm grandes na folha, ficam 10% abaixo disso.
const CLAN_SCALE = 1.2;
const CLAN_CHIEF_SCALE = 0.9;
if (protoClan) {
  for (const [kind, clan] of Object.entries(protoClan) as [MonsterKind, NonNullable<(typeof protoClan)[MonsterKind]>][]) {
    const chief = MONSTERS[kind].rank !== "common";
    BESTIARY_ART[kind] = {
      ...BESTIARY_ART[kind], facesLeft: true, scale: HD_SCALE * CLAN_SCALE * (chief ? CLAN_CHIEF_SCALE : 1),
      anim: {
        size: clan.size, sheet: () => clan.sheet(), portrait: () => clan.portrait(), outline: "",
        fps: { idle: 4, walk: 6, attack: 10, cast: 6 }, frames: { idle: 4, walk: 4, attack: 4, cast: 4 }, stride: 2,
        hd: () => clan.frames(), fill: clan.fill, extra: { ...clan.extra }, strike: clan.strike, source: clan.source,
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

// Os inimigos da Cripta que já têm folha gerada por IA (PNG) trocam o desenho por código (vem depois dos bichos, que
// também desenham o rato, a estirge e a aranha): andar, golpe, especial e morte desenhados na folha de ação.
/** Habilidades dos inimigos da Cripta que não são o especial da folha: saem do golpe. */
const CRYPT_STRIKE: Partial<Record<MonsterKind, Record<string, Clip>>> = {
  dragon: { breath: "cast" },
  ogre: { stomp: "cast", boulder: "attack" },
  mimic: { acidBite: "cast", adhesive: "attack" },
};
if (protoCrypt) {
  for (const [kind, crypt] of Object.entries(protoCrypt) as [MonsterKind, NonNullable<(typeof protoCrypt)[MonsterKind]>][]) {
    BESTIARY_ART[kind] = {
      ...BESTIARY_ART[kind], facesLeft: true, scale: HD_SCALE,
      anim: {
        size: crypt.size, sheet: () => crypt.sheet(), portrait: () => crypt.portrait(), outline: "",
        fps: { idle: 4, walk: 8, attack: 10, cast: 7 }, frames: { idle: 4, walk: 4, attack: 4, cast: 4 }, stride: 2,
        hd: () => crypt.frames(), fill: crypt.fill, extra: { ...crypt.extra },
        // A habilidade toca o especial desenhado (a teia, o Golpe Brutal, o Engolfar, a investida do orc, o sopro, o
        // pisão do ogro, a mordida ácida); a que não tem especial próprio na folha sai do golpe (`CRYPT_STRIKE`).
        strike: CRYPT_STRIKE[kind] ?? "cast",
      },
    };
  }
}

// Monstros do Mar de Areia e do Bosque Velho esculpidos por código (`proto/sculptArt.ts`): o Verme da Areia (chefe: Emboscada no especial,
// Engolir na 2ª habilidade, Tremor no golpe), o Elemental (Redemoinho no especial, Rajada na 2ª), o Sacerdote e a
// Múmia (as habilidades saem do especial), o Abutre Gigante e os escorpiões (o comum âmbar e o Negro Gigante, o mesmo
// modelo com a casca negra e maior). No Negro, as Pinças saem do golpe e o Ferrão Letal do especial.
if (protoSculpt) {
  const sculpted: [MonsterKind, ReturnType<typeof protoSculpt.scorpionArt>, number, MonsterAnim["strike"]][] = [
    ["giantVulture", protoSculpt.vultureArt(), 1.6, "cast"],
    ["mummy", protoSculpt.mummyArt(), 1.4, { dreadfulGlare: "cast" }],
    ["mummyPriest", protoSculpt.priestArt(), 1.55, "cast"],
    ["sandElemental", protoSculpt.elementalArt(), 2.1, { whirlwind: "cast", sandBlast: "skill" }],
    ["sandWorm", protoSculpt.wormArt(), 2.5, { burrow: "cast", swallow: "skill", quake: "attack" }],
    ["sandScorpion", protoSculpt.scorpionArt(), 1.2, "cast"],
    ["blackScorpion", protoSculpt.scorpionArt(protoSculpt.SHELLS.black), 1.6, { pincers: "attack", deathSting: "cast" }],
    // Bosque Velho: o golpe e o especial de cada um; a 2ª habilidade desenhada é o Coice do centauro e o Voo do dragão.
    ["direWolf", protoSculpt.beastArt("wolf"), 1.5, { trip: "cast" }],
    ["shadowPanther", protoSculpt.beastArt("panther"), 1.45, { pounce: "cast" }],
    ["renegadeCentaur", protoSculpt.beastArt("centaur"), 1.85, { arrowRain: "cast", kick: "skill" }],
    ["satyr", protoSculpt.folkArt("satyr"), 1.3, { enchantingTune: "cast" }],
    ["twigling", protoSculpt.folkArt("twigling"), 1, "cast"],
    ["thornSpitter", protoSculpt.folkArt("thorn"), 1.4, { thornBurst: "cast", thornVolley: "attack" }],
    ["owlbear", protoSculpt.folkArt("owlbear"), 1.65, { crushingHug: "cast" }],
    ["corruptedDryad", protoSculpt.folkArt("dryad"), 1.5, "cast"],
    ["menhirGuardian", protoSculpt.folkArt("menhir"), 1.75, { runeStomp: "cast", stoneFist: "attack" }],
    // Coração da Mata.
    ["thornBoar", protoSculpt.beastArt("boar"), 1.35, { gore: "cast" }],
    ["corruptedStag", protoSculpt.beastArt("stag"), 1.65, { antlerCharge: "cast" }],
    ["myconid", protoSculpt.folkArt("myconid"), 1.2, { sporeCloud: "cast" }],
    ["elvenShade", protoSculpt.folkArt("shade"), 1.35, { moonArrow: "cast" }],
    ["stranglerVine", protoSculpt.folkArt("vine"), 1.35, { strangle: "cast" }],
    ["awakenedTree", protoSculpt.folkArt("tree"), 2, { rootGrasp: "cast", branchSweep: "attack" }],
    ["fallenWarden", protoSculpt.folkArt("warden"), 1.55, { shadowStep: "attack", bladeDance: "cast", shadeCall: "cast" }],
    ["erlking", protoSculpt.folkArt("erlking"), 2.6, { royalCharge: "attack", heartThorns: "cast", wildHunt: "cast", forestWrath: "skill" }],
    ["greenDragon", protoSculpt.greenDragonArt(), 2.3, { poisonBreath: "cast", menhirGas: "cast", tailSweep: "attack" }],
  ];
  // A animação é guardada pela textura: monstro que, na arte antiga, usa a textura de outro (o Coração da Mata) ganha
  // uma só dele, senão os dois tocariam a mesma folha.
  const shared = (kind: MonsterKind) => Object.entries(BESTIARY_ART).some(([k, a]) => k !== kind && a.texture === BESTIARY_ART[kind].texture);
  for (const [kind, art, size, strike] of sculpted) {
    BESTIARY_ART[kind] = {
      ...BESTIARY_ART[kind], ...(shared(kind) ? { texture: `monster-hd-${kind}` } : {}), facesLeft: true, scale: HD_SCALE * size,
      anim: {
        size: art.size, sheet: () => art.sheet(), portrait: () => art.portrait(), outline: "",
        fps: { ...art.fps }, frames: { ...art.clips }, stride: art.stride,
        hd: () => art.frames(), get fill() { return art.fill; }, origin: art.origin, extra: { ...art.extra }, strike,
      },
    };
  }
}

// Orc batedor esculpido por código (`proto/orcArt.ts`): mesmo tamanho na tela que o resto do clã (`CLAN_SCALE`).
// Ciclos mais longos que os 4 quadros de sempre (o parado respira em 6, o andar tem os 8 tempos do passo, o golpe tem
// antecipação e volta): o movimento fino é o ponto deste desenho.
if (protoOrcScout) {
  const art = protoOrcScout.orcScoutArt();
  BESTIARY_ART.orcScout = {
    ...BESTIARY_ART.orcScout, facesLeft: true, scale: HD_SCALE * CLAN_SCALE,
    anim: {
      size: art.size, sheet: () => art.sheet(), portrait: () => art.portrait(), outline: "",
      fps: { idle: 7, walk: 12, attack: 14, cast: 14 }, frames: { ...protoOrcScout.ORC_CLIP_FRAMES }, stride: 4,
      hd: () => art.frames(), get fill() { return art.fill; }, origin: art.origin, extra: { ...art.extra },
    },
  };
}

// Vorgak, o Senhor da Brasa (boss da Fortaleza Orc), esculpido por código (`proto/warlord.ts`): é a única arte dele,
// então vale também com a arte nova desligada. O golpe e o Gancho saem do golpe (o cutelo de cima para baixo; a Fenda de
// Brasa é o cutelo rachando o chão), o salto da 2ª habilidade, e os chamados e a Fúria do grito de guerra (especial).
{
  const art = warlordArt();
  BESTIARY_ART.emberWarlord = {
    ...BESTIARY_ART.emberWarlord, facesLeft: true, scale: HD_SCALE * 3.4,
    anim: {
      size: art.size, sheet: () => art.sheet(), portrait: () => art.portrait(), outline: "",
      fps: { ...art.fps }, frames: { ...art.clips }, stride: art.stride,
      hd: () => art.frames(), get fill() { return art.fill; }, origin: art.origin, extra: { ...art.extra },
      strike: { emberRift: "attack", ironHook: "attack", warlordLeap: "skill", fortressCall: "cast", emberFury: "cast", ogreGuard: "cast" },
    },
  };
}

// Inimigos do Charco Cinzento esculpidos por código (`proto/charcoArt.ts`): são a única arte deles, então valem com a
// arte nova ligada ou não, como Vorgak. A ilusão da Bruxa Cinzenta toca a mesma folha dela.
// Os dos Ermos Rubros (`proto/ermosArt.ts`) também.
for (const [kind, art, size, strike] of [...charcoArt(), ...ermosArt()]) {
  BESTIARY_ART[kind] = {
    ...BESTIARY_ART[kind], facesLeft: true, scale: HD_SCALE * size,
    anim: {
      size: art.size, sheet: () => art.sheet(), portrait: () => art.portrait(), outline: "",
      fps: { ...art.fps }, frames: { ...art.clips }, stride: art.stride,
      hd: () => art.frames(), get fill() { return art.fill; }, origin: art.origin, extra: { ...art.extra }, strike,
    },
  };
}
BESTIARY_ART.ashHagIllusion = { ...BESTIARY_ART.ashHag, blood: "none" };

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
