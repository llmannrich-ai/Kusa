import { blocksSight, hasLineOfSight, type Dungeon } from "./dungeon.ts";
import type { AttackFx } from "./messages.ts";
import { coneTiles } from "./spells.ts";

export type MonsterKind =
  // Cripta (dificuldade 1)
  | "rat" | "goblin" | "skeleton" | "orc" | "ogre" | "dragon"
  | "kobold" | "stirge" | "goblinArcher" | "zombie" | "skeletonArcher" | "giantSpider" | "hobgoblin" | "gnoll"
  | "mimic" | "gelatinousCube" | "bugbear"
  // Pântano das Ruínas (dificuldade 2)
  | "frog" | "moccasin" | "bogBody" | "naga" | "troll" | "hydra"
  | "bullywug" | "lizardfolk" | "ghoul" | "blackPudding" | "crocodile" | "willOWisp" | "shamblingMound"
  | "greenHag" | "hagIllusion" | "spiritNaga" | "blackDragon" | "bullywugKing"
  // Mar de Areia (dificuldade 1)
  | "sandScorpion" | "giantVulture" | "mummy" | "blackScorpion" | "mummyPriest" | "sandElemental" | "sandWorm"
  // Pântano (dificuldade 1, só para 1 jogador): o clã de orcs e ogros do brejo
  | "orcScout" | "orcGrunt" | "orcSpearman" | "orcArcher" | "orcShaman" | "orcBerserker" | "orcCaptain" | "ogreYoung"
  | "ogreBruiser" | "ogreShaman" | "orcWarlord" | "ogreKing"
  // Caverna da Travessia (dificuldade 2): os dois bosses dos covis
  | "basilisk" | "beholder"
  // Necrópole de Solária (Dunas Cantantes e Mesas de Solária, dificuldades 5 e 6): a legião soterrada e as múmias
  | "boneJackal" | "scarabSwarm" | "boneLegionary" | "boneArcher" | "wrappedMummy" | "mourner" | "buriedDead"
  | "boneCenturion" | "royalMummy" | "sandScribe" | "singingColossus" | "eternalPharaoh"
  // Bosque Velho (dificuldade 5): as feras e os espíritos da floresta antiga do Kosaradius
  | "twigling" | "direWolf" | "satyr" | "thornSpitter" | "shadowPanther" | "owlbear"
  | "corruptedDryad" | "renegadeCentaur" | "menhirGuardian" | "greenDragon"
  // Fortaleza Orc (dificuldade 8): o senhor do castelo (o resto é o clã do Pântano do Kosaradius, mais forte)
  | "emberWarlord"
  // Coração da Mata (dificuldade 6): o fundo da floresta, a caçada do Rei Galhado e os mortos dos santuários élficos
  | "myconid" | "thornBoar" | "corruptedStag" | "elvenShade" | "stranglerVine" | "awakenedTree" | "fallenWarden" | "erlking"
  // Charco Cinzento (dificuldade 8): os afogados do incêndio da turfeira e a dona do lago negro
  | "giantLeech" | "carrionCrow" | "peatDrowned" | "lanternBearer" | "ashOoze" | "poolLurker"
  | "ashHag" | "ashHagIllusion" | "bogMonolith" | "drownedKnight" | "morgrana"
  // Ermos Rubros (dificuldade 8): a mina de ferro desabada, os mortos dela e o gigante da cratera
  | "rustBeetle" | "badlandsHyena" | "redRaider" | "lostMiner" | "plateLizard" | "rustDevil"
  | "deadForeman" | "oreGolem" | "hyenaMatriarch" | "kragmor";

export type MonsterRank = "common" | "miniboss" | "boss";

/** Tipo de criatura do D&D: dá imunidades e fraquezas padrão (`CREATURE_TYPES`). */
export type CreatureType =
  | "aberration" | "beast" | "construct" | "dragon" | "elemental" | "fey" | "fiend" | "giant" | "humanoid"
  | "monstrosity" | "ooze" | "plant" | "undead";

/** Papel do monstro na luta (ver `docs/BESTIARIO_PLANO.md`, 3.1): muda a IA e serve de guia para os números. */
export type MonsterRole = "brute" | "skirmisher" | "artillery" | "controller" | "leader" | "swarm" | "lurker" | "sentinel";

/**
 * Elemento de um dano. Todo dano dos heróis tem um (`damageElement`), e os monstros resistem, são imunes ou
 * vulneráveis a alguns (`MonsterDef.elements`). `nature` junta veneno, ácido e espinhos.
 */
export type DamageElement = "physical" | "fire" | "ice" | "energy" | "dark" | "radiant" | "nature";
export const DAMAGE_ELEMENTS: readonly DamageElement[] = ["physical", "fire", "ice", "energy", "dark", "radiant", "nature"];

export type DotKind = "poison" | "burn" | "bleed";
export const DOT_KINDS: readonly DotKind[] = ["poison", "burn", "bleed"];

/**
 * Efeitos que os monstros deixam nos heróis (além do dano contínuo e da lentidão, que já existiam):
 * - `root`: preso (teia, constrição): não anda;
 * - `stun`: atordoado (paralisia): não anda, não ataca, não conjura nem bebe poção;
 * - `engulf`: engolido: como atordoado, e toma dano por segundo de quem engoliu;
 * - `blind`: cego: não mira nada além de 2 tiles;
 * - `corrode`: corroído: recebe mais dano por acúmulo (até `CORRODE_MAX`).
 * Os quatro primeiros são **controle**: duram no máximo `CONTROL_MAX_MS` e depois o herói fica `CONTROL_IMMUNE_MS`
 * imune ao mesmo efeito.
 */
export type HeroEffectKind = "root" | "stun" | "engulf" | "blind" | "corrode";
export const HERO_EFFECTS: readonly HeroEffectKind[] = ["root", "stun", "engulf", "blind", "corrode"];
export const CONTROL_EFFECTS: readonly HeroEffectKind[] = ["root", "stun", "engulf", "blind"];
export const CONTROL_MAX_MS = 2000;
export const CONTROL_IMMUNE_MS = 4000;
/** Corroído: dano recebido a mais por acúmulo, e o máximo de acúmulos. */
export const CORRODE_PER_STACK = 0.08;
export const CORRODE_MAX = 3;
/** Cego: alcance máximo do ataque básico e das magias com alvo. */
export const BLIND_RANGE = 2;

export interface HeroEffect {
  kind: HeroEffectKind;
  ms: number;
  /** Engolido: dano por segundo, em fração do dano do monstro. */
  power?: number;
}

/**
 * Forma da habilidade:
 * - `target`: área em volta do tile do alvo (`radius` 0 = só o tile dele);
 * - `self`: área em volta do próprio monstro;
 * - `line`: faixa reta do monstro na direção do alvo, `length` tiles, `radius` tiles para cada lado;
 * - `cone`: leque de 90° na direção do alvo, `length` tiles (como o Cone de Frio);
 * - `bolt`: projétil que acerta só o alvo (teia, raio, cuspe);
 * - `leap`: o monstro salta para colar no alvo e acerta a área `radius` em volta de onde caiu (`power` 0 = só o salto);
 * - `pull`: puxa o alvo para colar no monstro (língua, corrente);
 * - `dive`: o monstro some (voa, mergulha) por `vanishMs`, invulnerável, e cai sobre o alvo com área `radius`;
 * - `vanish`: o monstro fica invisível por `vanishMs` (pode deixar cópias com `summon`);
 * - `summon`: chama monstros em volta de si.
 */
export type AbilityShape = "target" | "self" | "line" | "cone" | "bolt" | "leap" | "pull" | "dive" | "vanish" | "summon";

/** Desenho da habilidade no cliente (`fx.ts`). */
export type AbilityFx =
  | "quake" | "breath" | "acidRain" | "boulder" | "leap" | "tongue" | "constrict" | "rend" | "dive" | "web" | "bolt"
  | "engulf" | "summon" | "vanish" | "slam" | "spit" | "lightning" | "emberRift";

/**
 * Habilidade de monstro. Sai **na hora, sem aviso** (princípio do jogo: difícil e injusto como a vida), sempre que a
 * recarga deixa e o alvo está ao alcance. A recarga varia ±`COOLDOWN_JITTER` (a "Recarga 5–6" do D&D): ninguém sabe
 * quando o golpe volta.
 */
export interface MonsterAbility {
  id: string;
  name: string;
  shape: AbilityShape;
  /** Distância máxima (tiles, Chebyshev) até o alvo para usar. */
  range: number;
  /** Distância mínima até o alvo (investidas e puxões não saem com o alvo colado). */
  minRange?: number;
  radius: number;
  /** Comprimento da faixa ou do leque. */
  length?: number;
  cooldownMs: number;
  /** Multiplicador do dano do monstro (0 = sem dano). */
  power: number;
  /** Dano por segundo depois do golpe (veneno, queimadura ou sangramento), em fração do dano do monstro. */
  dot?: { kind: DotKind; power: number; durationMs: number };
  /** Deixa quem foi atingido mais lento (`factor` = fração da velocidade que sobra). */
  slow?: { factor: number; durationMs: number };
  /** Efeito nos heróis atingidos. */
  effect?: HeroEffect;
  /** Empurra os heróis atingidos para longe do monstro. */
  push?: number;
  /** Cura o monstro nesta fração da vida máxima quando o golpe sai. */
  selfHeal?: number;
  /** Monstros chamados (`summon`) ou cópias deixadas ao sumir (`vanish`). */
  summon?: { kind: MonsterKind; count: number };
  /** `dive` e `vanish`: quanto tempo fica sumido. */
  vanishMs?: number;
  /** Só sai com a vida abaixo desta fração. */
  belowHp?: number;
  /** Troca de fase: sai na hora em que a vida cruza `belowHp` (com 1 ou 4 heróis, a fase sempre aparece). */
  phase?: boolean;
  /** Sai uma vez só na luta. */
  once?: boolean;
  /** Cor do efeito e do nome. */
  color: number;
  fx: AbilityFx;
}

/** Passivas tiradas dos blocos de estatística do D&D. */
export interface MonsterTraits {
  /** Táticas de Bando: dano extra (fração) se outro monstro estiver colado no mesmo alvo. */
  packTactics?: number;
  /** Fuga Ágil: depois de acertar, recua 1 tile (com recarga). */
  hitAndRun?: { cooldownMs: number };
  /** Artilheiro: recua se o alvo chegar mais perto que isto (tiles). */
  keepDistance?: number;
  /** Rompante: abaixo de `belowHp` da vida, ataca `haste` (fração) mais rápido. */
  frenzy?: { belowHp: number; haste: number };
  /** Comando: monstros a até `radius` tiles causam `damage` (fração) a mais e atacam `haste` mais rápido. */
  leader?: { radius: number; damage: number; haste: number };
  /** Ataque Surpresa: o primeiro golpe em cada alvo sai com este multiplicador. */
  ambush?: number;
  /** Multiataque: o golpe básico acerta `hits` vezes, cada uma com `power` do dano. */
  multiattack?: { hits: number; power: number };
  /** Efeito do golpe básico (com chance `chance`, padrão 1). */
  onHit?: {
    chance?: number;
    dot?: { kind: DotKind; power: number; durationMs: number };
    effect?: HeroEffect;
    /** Acumula Corroído. */
    corrode?: number;
    /** Cura esta fração do dano causado. */
    lifesteal?: number;
  };
  /** Regeneração: `perSec` da vida máxima por segundo, interrompida por `stopMs` ao levar dano de `stopBy`. */
  regeneration?: { perSec: number; stopBy: DamageElement[]; stopMs: number };
  /** Fortitude Morta-viva: o primeiro golpe que o mataria o deixa com 1 de vida (exceto os elementos de `except`). */
  fortitude?: { except: DamageElement[] };
  /** Divisão: golpe de `by` com pelo menos `minHit` da vida máxima divide o monstro em dois (até `max` pedaços). */
  split?: { by: DamageElement[]; minHit: number; max: number };
  /** Absorve: dano destes elementos cura em vez de ferir. */
  absorb?: DamageElement[];
  /** Camuflado: invisível (não pode ser alvo) até notar alguém ou levar dano. */
  camouflage?: boolean;
  /** Pisca: a cada `everyMs`, fica invisível por `ms`. */
  blink?: { everyMs: number; ms: number };
  /**
   * Cabeças (Hidra): cada cabeça morde um alvo diferente (as que sobram mordem o alvo com metade do dano). A cada
   * `step` da vida perdida, perde uma; se não levar fogo em `regrowMs`, nascem duas no lugar (até `max`).
   */
  heads?: { start: number; max: number; step: number; regrowMs: number; regrowHeal: number };
  /**
   * Mímico: nasce disfarçado de baú (não pode ser alvo, não anda) e abre a boca quando alguém chega a `revealRange`
   * tiles ou o acerta. Morto, deixa o que o baú daria.
   */
  mimic?: { revealRange: number };
  /** Ilusão (cópia da Bruxa Verde): não ataca, some com qualquer golpe e não dá XP, loot nem item. */
  illusion?: boolean;
}

export interface MonsterDef {
  kind: MonsterKind;
  name: string;
  rank: MonsterRank;
  type: CreatureType;
  role: MonsterRole;
  /** Nível de Desafio do Kusa (`crStats`). */
  cr: number;
  /** Atributos na profundidade 0; `monsterStats` aplica o ganho por profundidade. */
  hp: number;
  damage: number;
  xp: number;
  /** Faixa de valor de loot ao morrer (inclusiva). */
  loot: [number, number];
  /** Tiles por segundo. */
  speed: number;
  /** Distância (em tiles, Chebyshev) em que o monstro nota um jogador. */
  aggroRange: number;
  /** Alcance do ataque em tiles (1 = corpo a corpo). */
  attackRange: number;
  /** Intervalo entre ataques. */
  attackCooldownMs: number;
  /** Efeito visual do ataque. */
  attackFx: AttackFx;
  /** Multiplicador do dano recebido por elemento (0 = imune, 0,5 = resiste, 1,5 = vulnerável), por cima do tipo. */
  elements?: Partial<Record<DamageElement, number>>;
  traits?: MonsterTraits;
  /** Habilidades, em ordem de prioridade (a primeira pronta e possível sai). */
  abilities?: MonsterAbility[];
  /** Enxame: nasce em grupo deste tamanho (mínimo, máximo) nos encontros. */
  group?: [number, number];
  /** Frase curta de lore (Bestiário). */
  lore: string;
  /** Morto-vivo (derivado do tipo): a luz sagrada do Paladino fere mais (Flechas Consagradas, Caldeira Divina). */
  undead: boolean;
}

/** O que cada tipo de criatura muda: imunidade a dano contínuo e multiplicadores por elemento. */
export const CREATURE_TYPES: Record<CreatureType, { name: string; immuneDots?: DotKind[]; elements?: Partial<Record<DamageElement, number>> }> = {
  aberration: { name: "Aberração" },
  beast: { name: "Besta" },
  construct: { name: "Constructo", immuneDots: ["poison", "bleed"] },
  dragon: { name: "Dragão" },
  elemental: { name: "Elemental", immuneDots: ["poison", "bleed"] },
  fey: { name: "Fada" },
  fiend: { name: "Corruptor", elements: { physical: 0.75, radiant: 1.5 } },
  giant: { name: "Gigante" },
  humanoid: { name: "Humanoide" },
  monstrosity: { name: "Monstruosidade" },
  ooze: { name: "Limo", immuneDots: ["bleed"] },
  plant: { name: "Planta", elements: { fire: 1.5 } },
  undead: { name: "Morto-vivo", immuneDots: ["poison", "bleed"] },
};

/** Variação da recarga das habilidades (±30%): a "Recarga 5–6" do D&D. */
export const COOLDOWN_JITTER = 0.3;

type MonsterInput = Omit<MonsterDef, "undead">;
const monster = (def: MonsterInput): MonsterDef => ({ ...def, undead: def.type === "undead" });

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  // --- Cripta -----------------------------------------------------------------
  rat: monster({
    kind: "rat", name: "Ratazana", rank: "common", type: "beast", role: "swarm", cr: 1,
    hp: 20, damage: 3, xp: 20, loot: [1, 2], speed: 2.5, aggroRange: 5, attackRange: 1, attackCooldownMs: 1200, attackFx: "bite",
    traits: { packTactics: 0.3 },
    lore: "Ratazanas gigantes caçam em bando: sozinhas fogem, juntas mordem fundo.",
  }),
  goblin: monster({
    kind: "goblin", name: "Goblin", rank: "common", type: "humanoid", role: "skirmisher", cr: 2,
    hp: 45, damage: 5, xp: 35, loot: [2, 4], speed: 3.4, aggroRange: 6, attackRange: 1, attackCooldownMs: 1200, attackFx: "slash",
    traits: { hitAndRun: { cooldownMs: 4000 } },
    lore: "Covardes e ágeis: golpeiam e saltam para trás antes do troco (Fuga Ágil).",
  }),
  skeleton: monster({
    kind: "skeleton", name: "Esqueleto", rank: "common", type: "undead", role: "brute", cr: 3,
    hp: 70, damage: 7, xp: 55, loot: [3, 6], speed: 2.8, aggroRange: 6, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    lore: "Ossos erguidos por magia antiga. Veneno e sangramento não pegam em quem não tem sangue.",
  }),
  orc: monster({
    kind: "orc", name: "Orc guerreiro", rank: "common", type: "humanoid", role: "brute", cr: 4,
    hp: 110, damage: 9, xp: 85, loot: [5, 9], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    abilities: [
      { id: "aggressive", name: "Agressivo", shape: "leap", range: 5, minRange: 3, radius: 0, cooldownMs: 6000, power: 0, color: 0xc0392b, fx: "leap" },
    ],
    lore: "Orcs não esperam: veem o inimigo e avançam de uma vez (Agressivo).",
  }),
  ogre: monster({
    kind: "ogre", name: "Ogro", rank: "miniboss", type: "giant", role: "brute", cr: 5,
    hp: 260, damage: 18, xp: 220, loot: [12, 20], speed: 2.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1800, attackFx: "smash",
    abilities: [
      { id: "stomp", name: "Pisão Sísmico", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 2.1, slow: { factor: 0.5, durationMs: 3000 }, color: 0xb07a45, fx: "quake" },
      { id: "boulder", name: "Arremesso de Pedra", shape: "target", range: 6, minRange: 3, radius: 1, cooldownMs: 7000, power: 1.6, push: 1, color: 0x8d6e63, fx: "boulder" },
    ],
    lore: "Força bruta sem pressa. De perto pisa, de longe arremessa o que estiver à mão.",
  }),
  dragon: monster({
    kind: "dragon", name: "Dragão jovem", rank: "boss", type: "dragon", role: "brute", cr: 6,
    hp: 1332, damage: 36, xp: 1036, loot: [89, 148], speed: 2.4, aggroRange: 8, attackRange: 2, attackCooldownMs: 1500, attackFx: "fire",
    elements: { fire: 0 },
    // Multiataque: 3 × 0,3 (era 0,4: só as mordidas matavam um feiticeiro solo nível 8 em ~6 s).
    traits: { multiattack: { hits: 3, power: 0.3 } },
    abilities: [
      {
        id: "flight", name: "Voo", shape: "dive", range: 8, radius: 2, cooldownMs: 16000, power: 1.6, vanishMs: 2000,
        belowHp: 0.5, phase: true, color: 0xff9f43, fx: "dive",
      },
      {
        id: "breath", name: "Sopro Infernal", shape: "cone", range: 6, radius: 0, length: 6, cooldownMs: 7000, power: 1.9,
        dot: { kind: "burn", power: 0.25, durationMs: 4000 }, color: 0xff6b1a, fx: "breath",
      },
    ],
    lore: "Dragão vermelho jovem: mordida e duas garras, sopro em leque e, ferido, alça voo e cai sobre a presa. Imune a fogo.",
  }),

  kobold: monster({
    kind: "kobold", name: "Kobold", rank: "common", type: "humanoid", role: "swarm", cr: 1, group: [2, 3],
    hp: 16, damage: 2, xp: 15, loot: [1, 2], speed: 3.2, aggroRange: 6, attackRange: 1, attackCooldownMs: 1000, attackFx: "slash",
    traits: { packTactics: 0.4 },
    lore: "Pequenos e covardes, mas nunca andam sozinhos: cercam a presa e furam juntos (Táticas de Bando).",
  }),
  stirge: monster({
    kind: "stirge", name: "Estirge", rank: "common", type: "beast", role: "lurker", cr: 1, group: [2, 3],
    hp: 12, damage: 2, xp: 14, loot: [1, 2], speed: 4.5, aggroRange: 6, attackRange: 1, attackCooldownMs: 1000, attackFx: "bite",
    traits: { onHit: { dot: { kind: "bleed", power: 0.5, durationMs: 3000 }, lifesteal: 1 } },
    lore: "Mosquito do tamanho de um gato. Fura, suga e sai mais forte do que chegou (Drenar Sangue).",
  }),
  goblinArcher: monster({
    kind: "goblinArcher", name: "Goblin arqueiro", rank: "common", type: "humanoid", role: "artillery", cr: 2,
    hp: 28, damage: 5, xp: 30, loot: [2, 3], speed: 3, aggroRange: 7, attackRange: 4, attackCooldownMs: 1600, attackFx: "arrow",
    traits: { keepDistance: 3 },
    lore: "Atira de trás dos outros e recua quando alguém chega perto. Pegue-o primeiro.",
  }),
  zombie: monster({
    kind: "zombie", name: "Zumbi", rank: "common", type: "undead", role: "brute", cr: 2,
    hp: 70, damage: 6, xp: 40, loot: [2, 4], speed: 1.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1800, attackFx: "smash",
    traits: { fortitude: { except: ["radiant", "fire"] } },
    lore: "Lento e teimoso: o golpe que devia derrubá-lo não derruba, a não ser luz ou fogo (Fortitude Morta-viva).",
  }),
  skeletonArcher: monster({
    kind: "skeletonArcher", name: "Esqueleto arqueiro", rank: "common", type: "undead", role: "artillery", cr: 3,
    hp: 45, damage: 7, xp: 45, loot: [3, 5], speed: 2.6, aggroRange: 7, attackRange: 5, attackCooldownMs: 1800, attackFx: "arrow",
    traits: { keepDistance: 3 },
    lore: "Arqueiro de ossos: mira de longe, não sente veneno e não sangra.",
  }),
  giantSpider: monster({
    kind: "giantSpider", name: "Aranha gigante", rank: "common", type: "beast", role: "controller", cr: 3,
    hp: 55, damage: 6, xp: 50, loot: [3, 5], speed: 3, aggroRange: 6, attackRange: 1, attackCooldownMs: 1500, attackFx: "bite",
    traits: { onHit: { dot: { kind: "poison", power: 0.25, durationMs: 2000 } } },
    abilities: [
      { id: "web", name: "Teia", shape: "bolt", range: 5, minRange: 2, radius: 0, cooldownMs: 7000, power: 0.3, effect: { kind: "root", ms: 1500 }, color: 0xf5f5f5, fx: "web" },
    ],
    lore: "Prende de longe com a teia e chega antes de o herói se soltar. A picada envenena.",
  }),
  hobgoblin: monster({
    kind: "hobgoblin", name: "Hobgoblin capitão", rank: "common", type: "humanoid", role: "leader", cr: 3,
    hp: 70, damage: 6, xp: 60, loot: [4, 7], speed: 2.8, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    traits: { leader: { radius: 3, damage: 0.15, haste: 0.15 } },
    lore: "Disciplina militar: perto dele, goblins e kobolds batem mais forte e mais rápido (Comando).",
  }),
  gnoll: monster({
    kind: "gnoll", name: "Gnoll", rank: "common", type: "humanoid", role: "skirmisher", cr: 4,
    hp: 90, damage: 9, xp: 75, loot: [4, 8], speed: 3.4, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "bite",
    traits: { frenzy: { belowHp: 0.5, haste: 0.4 } },
    lore: "Hiena do demônio Yeenoghu. Ferido, entra em frenesi e ataca cada vez mais rápido (Rompante).",
  }),
  mimic: monster({
    kind: "mimic", name: "Mímico", rank: "miniboss", type: "monstrosity", role: "lurker", cr: 5,
    hp: 240, damage: 16, xp: 220, loot: [12, 20], speed: 2.2, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600, attackFx: "bite",
    traits: { mimic: { revealRange: 1 } },
    abilities: [
      { id: "adhesive", name: "Adesivo", shape: "self", range: 1, radius: 1, cooldownMs: 8000, power: 1, effect: { kind: "root", ms: 2000 }, color: 0xc9a66b, fx: "constrict" },
      {
        id: "acidBite", name: "Mordida Ácida", shape: "target", range: 1, radius: 0, cooldownMs: 6000, power: 2,
        effect: { kind: "corrode", ms: 6000 }, color: 0x9acd32, fx: "rend",
      },
    ],
    lore: "Parece um baú. Não é. Quem encosta fica grudado; morto, guarda o tesouro que fingia guardar.",
  }),
  gelatinousCube: monster({
    kind: "gelatinousCube", name: "Cubo Gelatinoso", rank: "miniboss", type: "ooze", role: "sentinel", cr: 5,
    hp: 280, damage: 12, xp: 240, loot: [12, 20], speed: 1.4, aggroRange: 3, attackRange: 1, attackCooldownMs: 2000, attackFx: "smash",
    traits: { camouflage: true },
    abilities: [
      {
        id: "engulf", name: "Engolfar", shape: "target", range: 1, radius: 0, cooldownMs: 9000, power: 0.5,
        effect: { kind: "engulf", ms: 2000, power: 0.6 }, color: 0x7cb342, fx: "engulf",
      },
    ],
    lore: "Transparente, enche o corredor de parede a parede. Engole quem esbarra e digere com ácido; os aliados batendo o fazem cuspir.",
  }),
  bugbear: monster({
    kind: "bugbear", name: "Bugbear chefe", rank: "miniboss", type: "humanoid", role: "brute", cr: 5,
    hp: 280, damage: 15, xp: 230, loot: [12, 20], speed: 3, aggroRange: 6, attackRange: 2, attackCooldownMs: 1600, attackFx: "smash",
    traits: { ambush: 2.5 },
    abilities: [
      { id: "brutalBlow", name: "Golpe Brutal", shape: "target", range: 2, radius: 0, cooldownMs: 7000, power: 2, push: 1, color: 0xa0522d, fx: "slam" },
    ],
    lore: "Goblinoide peludo de braços longos (alcance 2). O primeiro golpe em quem não esperava sai brutal (Ataque Surpresa).",
  }),

  // --- Pântano: mais vida e dano que os equivalentes da cripta, e loot maior ------------------------------
  frog: monster({
    kind: "frog", name: "Sapo gigante", rank: "common", type: "beast", role: "controller", cr: 3,
    hp: 50, damage: 5, xp: 40, loot: [2, 4], speed: 3.2, aggroRange: 6, attackRange: 1, attackCooldownMs: 1100, attackFx: "bite",
    abilities: [
      { id: "tongue", name: "Língua", shape: "pull", range: 3, minRange: 2, radius: 0, cooldownMs: 7000, power: 0.8, color: 0xe57373, fx: "tongue" },
    ],
    lore: "A língua pegajosa puxa a presa de longe para a boca.",
  }),
  moccasin: monster({
    kind: "moccasin", name: "Cobra-d'água", rank: "common", type: "beast", role: "skirmisher", cr: 4,
    hp: 70, damage: 6, xp: 55, loot: [3, 6], speed: 3.4, aggroRange: 6, attackRange: 1, attackCooldownMs: 1200, attackFx: "bite",
    traits: { onHit: { dot: { kind: "poison", power: 0.3, durationMs: 3000 } } },
    lore: "Cobra venenosa gigante: a mordida é fraca, o veneno não.",
  }),
  bogBody: monster({
    kind: "bogBody", name: "Afogado", rank: "common", type: "undead", role: "brute", cr: 5,
    hp: 140, damage: 11, xp: 95, loot: [5, 9], speed: 2.0, aggroRange: 6, attackRange: 1, attackCooldownMs: 1400, attackFx: "smash",
    traits: { fortitude: { except: ["radiant", "fire"] } },
    lore: "Zumbi do brejo. O primeiro golpe que deveria derrubá-lo não derruba, a não ser luz ou fogo (Fortitude Morta-viva).",
  }),
  naga: monster({
    kind: "naga", name: "Naga guerreira", rank: "common", type: "monstrosity", role: "sentinel", cr: 6,
    hp: 160, damage: 13, xp: 120, loot: [7, 12], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    abilities: [
      { id: "constrict", name: "Constrição", shape: "target", range: 1, radius: 0, cooldownMs: 6000, power: 1, effect: { kind: "root", ms: 1500 }, color: 0x9aa0a6, fx: "constrict" },
    ],
    lore: "Guarda das ruínas. Enrola a cauda em quem chega perto e não solta tão cedo.",
  }),
  troll: monster({
    kind: "troll", name: "Troll do brejo", rank: "miniboss", type: "giant", role: "brute", cr: 7,
    hp: 520, damage: 24, xp: 400, loot: [24, 36], speed: 2.8, aggroRange: 5, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    traits: { regeneration: { perSec: 0.02, stopBy: ["fire", "nature"], stopMs: 5000 } },
    abilities: [
      {
        id: "rend", name: "Dilacerar", shape: "target", range: 1, radius: 0, cooldownMs: 6000, power: 1.8,
        dot: { kind: "bleed", power: 0.3, durationMs: 4000 }, color: 0xc0392b, fx: "rend",
      },
    ],
    lore: "Regenera sem parar. Só fogo ou ácido (natureza) fecham as feridas por alguns segundos.",
  }),
  bullywug: monster({
    kind: "bullywug", name: "Bullywug", rank: "common", type: "humanoid", role: "skirmisher", cr: 3,
    hp: 55, damage: 6, xp: 45, loot: [2, 5], speed: 3.2, aggroRange: 6, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    traits: { camouflage: true },
    abilities: [
      { id: "standingLeap", name: "Salto Parado", shape: "leap", range: 4, minRange: 2, radius: 1, cooldownMs: 6000, power: 1.2, color: 0x9ccc65, fx: "leap" },
    ],
    lore: "Homem-sapo do brejo. Fica parado na lama até a presa passar e então salta em cima dela.",
  }),
  lizardfolk: monster({
    kind: "lizardfolk", name: "Homem-lagarto", rank: "common", type: "humanoid", role: "brute", cr: 4,
    hp: 120, damage: 9, xp: 90, loot: [5, 9], speed: 2.8, aggroRange: 6, attackRange: 1, attackCooldownMs: 1500, attackFx: "bite",
    elements: { physical: 0.8 },
    traits: { multiattack: { hits: 2, power: 0.6 } },
    lore: "Escamas grossas seguram lâminas e flechas (Couraça Natural). Morde e bate com a clava no mesmo golpe.",
  }),
  ghoul: monster({
    kind: "ghoul", name: "Carniçal", rank: "common", type: "undead", role: "controller", cr: 4,
    hp: 85, damage: 7, xp: 70, loot: [4, 8], speed: 3.2, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    traits: { onHit: { chance: 0.25, effect: { kind: "stun", ms: 1000 } } },
    lore: "Devorador de mortos. As garras paralisam por um instante (Garras Paralisantes).",
  }),
  blackPudding: monster({
    kind: "blackPudding", name: "Pudim Negro", rank: "common", type: "ooze", role: "brute", cr: 5,
    hp: 150, damage: 10, xp: 110, loot: [6, 10], speed: 2, aggroRange: 5, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    elements: { ice: 0.5 },
    traits: { split: { by: ["physical", "energy"], minHit: 0.1, max: 4 }, onHit: { corrode: 6000 } },
    lore: "Gosma ácida que corrói armadura e resiste ao gelo. Golpe forte de lâmina ou raio o divide em dois; fogo, não.",
  }),
  crocodile: monster({
    kind: "crocodile", name: "Crocodilo gigante", rank: "common", type: "beast", role: "lurker", cr: 5,
    hp: 130, damage: 12, xp: 105, loot: [6, 10], speed: 2.4, aggroRange: 5, attackRange: 1, attackCooldownMs: 1800, attackFx: "bite",
    traits: { camouflage: true },
    abilities: [
      { id: "clamp", name: "Mordida que Prende", shape: "target", range: 1, radius: 0, cooldownMs: 7000, power: 1.4, effect: { kind: "root", ms: 1500 }, color: 0x8d6e63, fx: "rend" },
      { id: "tailSwipe", name: "Rabada", shape: "self", range: 1, radius: 1, cooldownMs: 8000, power: 0.8, push: 2, color: 0x6d4c41, fx: "quake" },
    ],
    lore: "Submerso, só os olhos aparecem. Morde e não solta; quem fica por perto leva a rabada.",
  }),
  willOWisp: monster({
    kind: "willOWisp", name: "Fogo-fátuo", rank: "common", type: "undead", role: "controller", cr: 5,
    hp: 60, damage: 9, xp: 80, loot: [5, 8], speed: 4, aggroRange: 7, attackRange: 2, attackCooldownMs: 1500, attackFx: "energy",
    traits: { blink: { everyMs: 6000, ms: 2000 } },
    lore: "Luz fria que leva viajantes para o brejo. Some e reaparece, e o toque é um choque.",
  }),
  shamblingMound: monster({
    kind: "shamblingMound", name: "Monte Errante", rank: "common", type: "plant", role: "sentinel", cr: 6,
    hp: 200, damage: 10, xp: 160, loot: [8, 13], speed: 1.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1800, attackFx: "smash",
    traits: { absorb: ["energy"] },
    abilities: [
      {
        id: "engulf", name: "Engolfar", shape: "target", range: 1, radius: 0, cooldownMs: 10000, power: 0.4,
        effect: { kind: "engulf", ms: 2000, power: 0.5 }, color: 0x558b2f, fx: "engulf",
      },
    ],
    lore: "Monte de plantas podres que anda. Raio o alimenta (Absorver Raio); fogo o queima mais.",
  }),
  greenHag: monster({
    kind: "greenHag", name: "Bruxa Verde", rank: "miniboss", type: "fey", role: "controller", cr: 7,
    hp: 420, damage: 18, xp: 380, loot: [24, 36], speed: 3, aggroRange: 6, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    abilities: [
      {
        id: "illusion", name: "Ilusão", shape: "vanish", range: 6, radius: 0, cooldownMs: 14000, power: 0, vanishMs: 3000,
        summon: { kind: "hagIllusion", count: 2 }, color: 0x9ccc65, fx: "vanish",
      },
      {
        id: "poisonCloud", name: "Nuvem Venenosa", shape: "target", range: 5, radius: 1, cooldownMs: 7000, power: 1.2,
        dot: { kind: "poison", power: 0.3, durationMs: 4000 }, color: 0x7cb342, fx: "acidRain",
      },
    ],
    lore: "Bruxa do pântano. Some no ar e deixa cópias de si; só uma delas sangra.",
  }),
  hagIllusion: monster({
    kind: "hagIllusion", name: "Bruxa Verde", rank: "common", type: "fey", role: "swarm", cr: 1,
    hp: 1, damage: 0, xp: 0, loot: [0, 0], speed: 3, aggroRange: 8, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    traits: { illusion: true },
    lore: "Cópia ilusória da Bruxa Verde: some com qualquer golpe.",
  }),
  spiritNaga: monster({
    kind: "spiritNaga", name: "Naga Espiritual", rank: "miniboss", type: "monstrosity", role: "artillery", cr: 7,
    hp: 460, damage: 16, xp: 400, loot: [24, 36], speed: 2.8, aggroRange: 7, attackRange: 1, attackCooldownMs: 1600, attackFx: "bite",
    abilities: [
      {
        id: "rejuvenate", name: "Rejuvenescer", shape: "self", range: 9, radius: 0, cooldownMs: 30000, power: 0, selfHeal: 0.3,
        belowHp: 0.25, phase: true, once: true, color: 0x80deea, fx: "summon",
      },
      { id: "lightning", name: "Relâmpago", shape: "line", range: 6, radius: 0, length: 6, cooldownMs: 7000, power: 1.8, color: 0x9ec5ff, fx: "lightning" },
    ],
    lore: "Conjuradora das ruínas. Lança raios em linha e, quase morta, se refaz uma vez (Rejuvenescer).",
  }),
  blackDragon: monster({
    kind: "blackDragon", name: "Dragão negro jovem", rank: "boss", type: "dragon", role: "brute", cr: 8,
    hp: 1450, damage: 26, xp: 1300, loot: [120, 180], speed: 2.4, aggroRange: 9, attackRange: 2, attackCooldownMs: 1500, attackFx: "bite",
    elements: { nature: 0.5 },
    traits: { multiattack: { hits: 3, power: 0.3 } },
    abilities: [
      {
        id: "submerge", name: "Mergulho", shape: "dive", range: 9, radius: 2, cooldownMs: 15000, power: 1.5, vanishMs: 1800,
        belowHp: 0.5, phase: true, color: 0x4db6ac, fx: "dive",
      },
      {
        id: "acidBreath", name: "Sopro Ácido", shape: "line", range: 6, radius: 0, length: 6, cooldownMs: 7000, power: 1.9,
        dot: { kind: "poison", power: 0.25, durationMs: 5000 }, color: 0x9acd32, fx: "breath",
      },
      { id: "darkness", name: "Escuridão", shape: "target", range: 6, radius: 2, cooldownMs: 12000, power: 0, effect: { kind: "blind", ms: 2000 }, color: 0x37305a, fx: "vanish" },
    ],
    lore: "Dragão do brejo: sopro ácido em linha, nuvem de Escuridão que cega e mergulhos na lama. Resiste a ácido e veneno.",
  }),
  hydra: monster({
    kind: "hydra", name: "Hidra do pântano", rank: "boss", type: "monstrosity", role: "brute", cr: 8,
    hp: 1600, damage: 16, xp: 1300, loot: [120, 180], speed: 2.2, aggroRange: 9, attackRange: 2, attackCooldownMs: 1500, attackFx: "bite",
    traits: { heads: { start: 3, max: 5, step: 0.2, regrowMs: 6000, regrowHeal: 0.05 } },
    abilities: [
      {
        id: "submerge", name: "Mergulho", shape: "dive", range: 9, radius: 1, cooldownMs: 15000, power: 1.2, vanishMs: 1500,
        belowHp: 0.5, phase: true, color: 0x4fc3f7, fx: "dive",
      },
      {
        id: "acid", name: "Chuva Ácida", shape: "target", range: 7, radius: 2, cooldownMs: 7000, power: 1.7,
        dot: { kind: "poison", power: 0.25, durationMs: 5000 }, color: 0xa3e635, fx: "acidRain",
      },
    ],
    lore: "Cada cabeça morde alguém. Corte uma e nascem duas, a não ser que o fogo cauterize o toco.",
  }),
  bullywugKing: monster({
    kind: "bullywugKing", name: "Rei Bullywug", rank: "boss", type: "humanoid", role: "skirmisher", cr: 7,
    hp: 2024, damage: 26, xp: 2024, loot: [221, 331], speed: 2.6, aggroRange: 8, attackRange: 2, attackCooldownMs: 1400, attackFx: "slash",
    traits: { frenzy: { belowHp: 0.3, haste: 0.35 } },
    abilities: [
      {
        id: "mudAmbush", name: "Bote da Lama", shape: "dive", range: 8, minRange: 2, radius: 1, cooldownMs: 12000, power: 1.6, vanishMs: 1500,
        color: 0x6d4c41, fx: "dive",
      },
      { id: "spearThrust", name: "Estocada", shape: "line", range: 3, radius: 0, length: 3, cooldownMs: 7000, power: 1.8, push: 1, color: 0xb0bec5, fx: "tongue" },
      {
        id: "swampCall", name: "Chamado do Brejo", shape: "summon", range: 8, radius: 0, cooldownMs: 30000, power: 0, summon: { kind: "bullywug", count: 2 },
        belowHp: 0.5, phase: true, once: true, color: 0x9ccc65, fx: "summon",
      },
    ],
    lore: "Rei do brejo, com lança de farpas e escudo de junco. Some na lama e sai dela em bote em cima da presa; de perto, estoca em linha e empurra. Com metade da vida, chama a guarda de bullywugs, e quase morto ataca em frenesi.",
  }),

  // --- Mar de Areia ------------------------------------------------------------------------------------------
  sandScorpion: monster({
    kind: "sandScorpion", name: "Escorpião da Areia", rank: "common", type: "beast", role: "swarm", cr: 1, group: [2, 3],
    hp: 22, damage: 3, xp: 20, loot: [1, 2], speed: 2.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1200, attackFx: "bite",
    traits: { onHit: { chance: 0.5, dot: { kind: "poison", power: 0.3, durationMs: 3000 } } },
    lore: "Andam em bando debaixo da areia quente. Metade das ferroadas deixa veneno.",
  }),
  giantVulture: monster({
    kind: "giantVulture", name: "Abutre Gigante", rank: "common", type: "beast", role: "skirmisher", cr: 2,
    hp: 36, damage: 5, xp: 32, loot: [2, 3], speed: 4, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "bite",
    traits: { hitAndRun: { cooldownMs: 3500 }, packTactics: 0.3 },
    lore: "Rodeia quem está ferido. Desce, bica e sobe antes do troco (Fuga Ágil); em dupla, bica mais fundo.",
  }),
  mummy: monster({
    kind: "mummy", name: "Múmia", rank: "common", type: "undead", role: "brute", cr: 4,
    hp: 115, damage: 8, xp: 85, loot: [5, 9], speed: 1.9, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    // As faixas secas pegam fogo.
    elements: { fire: 1.5 },
    traits: { onHit: { dot: { kind: "poison", power: 0.25, durationMs: 4000 } } },
    abilities: [
      { id: "dreadfulGlare", name: "Olhar Pavoroso", shape: "target", range: 4, radius: 0, cooldownMs: 10000, power: 0, effect: { kind: "stun", ms: 1000 }, color: 0x7fd36b, fx: "vanish" },
    ],
    lore: "Guarda as ruínas enterradas. O Olhar Pavoroso paralisa de medo, e o toque apodrece (Podridão). Queima fácil.",
  }),
  // Mini-bosses das ruínas soterradas (destrancam o baú da sala).
  blackScorpion: monster({
    kind: "blackScorpion", name: "Escorpião Negro Gigante", rank: "miniboss", type: "beast", role: "brute", cr: 5,
    hp: 270, damage: 12, xp: 220, loot: [12, 20], speed: 2.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1500, attackFx: "bite",
    traits: { onHit: { dot: { kind: "poison", power: 0.3, durationMs: 3000 } } },
    abilities: [
      { id: "pincers", name: "Pinças", shape: "target", range: 1, radius: 0, cooldownMs: 8000, power: 1, effect: { kind: "root", ms: 1500 }, color: 0x4a3a5a, fx: "constrict" },
      {
        id: "deathSting", name: "Ferrão Letal", shape: "target", range: 2, radius: 0, cooldownMs: 9000, power: 1.8,
        dot: { kind: "poison", power: 0.5, durationMs: 4000 }, color: 0xb03a2e, fx: "rend",
      },
    ],
    lore: "Do tamanho de um camelo, couraça negra. Prende com as pinças e, preso, o ferrão não erra (Ferrão Letal).",
  }),
  mummyPriest: monster({
    kind: "mummyPriest", name: "Sacerdote Mumificado", rank: "miniboss", type: "undead", role: "controller", cr: 5,
    hp: 240, damage: 12, xp: 230, loot: [12, 20], speed: 1.9, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    elements: { fire: 1.5 },
    abilities: [
      {
        id: "scarabs", name: "Praga de Escaravelhos", shape: "summon", range: 6, radius: 0, cooldownMs: 15000, power: 0,
        summon: { kind: "sandScorpion", count: 2 }, color: 0xd9a35b, fx: "summon",
      },
      {
        id: "tombCurse", name: "Maldição da Tumba", shape: "target", range: 5, radius: 1, cooldownMs: 8000, power: 1.3,
        dot: { kind: "poison", power: 0.3, durationMs: 4000 }, slow: { factor: 0.6, durationMs: 3000 }, color: 0x7fd36b, fx: "acidRain",
      },
    ],
    lore: "Guardião do templo enterrado. Chama os bichos da areia para a briga e amaldiçoa quem invade (lento e apodrecendo). Queima fácil.",
  }),
  sandElemental: monster({
    kind: "sandElemental", name: "Elemental de Areia", rank: "miniboss", type: "elemental", role: "skirmisher", cr: 5,
    hp: 220, damage: 13, xp: 220, loot: [12, 20], speed: 3.6, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "smash",
    // Areia solta: corte e perfuração passam por ela; o gelo a endurece.
    elements: { physical: 0.75, ice: 1.4 },
    abilities: [
      {
        id: "whirlwind", name: "Redemoinho", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 1.5, push: 2,
        color: 0xe0b46c, fx: "quake",
      },
      {
        id: "sandBlast", name: "Rajada de Areia", shape: "line", range: 5, radius: 0, length: 5, cooldownMs: 9000, power: 1.2,
        effect: { kind: "blind", ms: 1500 }, color: 0xf0d29c, fx: "breath",
      },
    ],
    lore: "Redemoinho que pensa. Joga longe quem chega perto e cega com a areia (Rajada). Espada e flecha atravessam; gelo, não.",
  }),

  // --- Caverna da Travessia: um boss em cada covil. O Basilisco (oeste) é o médio, perto do Verme da Areia no covil
  // dele; o Observador (leste) é o muito difícil, acima da Hidra. A profundidade de cada covil está em `MAPS.cavern.lairs`.
  basilisk: monster({
    kind: "basilisk", name: "Basilisco", rank: "boss", type: "monstrosity", role: "brute", cr: 6,
    hp: 1344, damage: 32, xp: 1280, loot: [112, 176], speed: 2.2, aggroRange: 7, attackRange: 1, attackCooldownMs: 1500, attackFx: "bite",
    // Escamas de pedra: corte resvala um pouco; o veneno é dele.
    elements: { physical: 0.85, nature: 0.5 },
    traits: { onHit: { chance: 0.4, dot: { kind: "poison", power: 0.25, durationMs: 4000 } } },
    abilities: [
      {
        id: "petrifyingGaze", name: "Olhar Petrificante", shape: "cone", range: 5, radius: 0, length: 5, cooldownMs: 10000, power: 0.6,
        effect: { kind: "stun", ms: 1500 }, color: 0x9be37a, fx: "breath",
      },
      {
        id: "venomBite", name: "Mordida Venenosa", shape: "target", range: 1, radius: 0, cooldownMs: 8000, power: 1.4,
        dot: { kind: "poison", power: 0.3, durationMs: 4000 }, color: 0x6fbf3a, fx: "rend",
      },
      {
        id: "tailSweep", name: "Cauda de Pedra", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 1.3, push: 2,
        belowHp: 0.5, phase: true, color: 0x8a8f7a, fx: "quake",
      },
    ],
    lore: "Lagarto de oito patas que dorme no covil oeste. O olhar dele vira carne em pedra por um instante, a mordida envenena e, ferido, varre tudo em volta com a cauda.",
  }),
  beholder: monster({
    kind: "beholder", name: "Observador das Profundezas", rank: "boss", type: "aberration", role: "controller", cr: 9,
    hp: 2842, damage: 35, xp: 3136, loot: [294, 451], speed: 1.8, aggroRange: 9, attackRange: 3, attackCooldownMs: 1400, attackFx: "energy",
    // Flutua longe de quem chega perto e atira com os olhos menores.
    elements: { dark: 0.5, radiant: 1.25 },
    traits: { keepDistance: 2 },
    abilities: [
      {
        id: "disintegrate", name: "Raio Desintegrador", shape: "line", range: 7, radius: 0, length: 7, cooldownMs: 8000, power: 1.6,
        color: 0xb06bff, fx: "lightning",
      },
      {
        id: "paralyzeRay", name: "Raio Paralisante", shape: "bolt", range: 6, radius: 0, cooldownMs: 12000, power: 0.5,
        effect: { kind: "stun", ms: 1200 }, color: 0xffe066, fx: "bolt",
      },
      {
        id: "repulse", name: "Raio Repulsor", shape: "self", range: 2, radius: 2, cooldownMs: 9000, power: 0.9, push: 3,
        color: 0x7fd6ff, fx: "slam",
      },
      {
        id: "eyeStorm", name: "Tempestade de Olhares", shape: "target", range: 7, radius: 2, cooldownMs: 9000, power: 1.5,
        effect: { kind: "corrode", ms: 6000 }, belowHp: 0.5, phase: true, color: 0xff4fa3, fx: "acidRain",
      },
    ],
    lore: "Uma esfera que flutua no covil leste, com um olho enorme e dez olhos menores nas hastes. Cada olho dispara um raio: desintegra, paralisa, empurra e, ferido, chove olhares que corroem.",
  }),
  sandWorm: monster({
    kind: "sandWorm", name: "Verme da Areia", rank: "boss", type: "monstrosity", role: "lurker", cr: 6,
    hp: 1342, damage: 38, xp: 1204, loot: [103, 172], speed: 2.2, aggroRange: 7, attackRange: 1, attackCooldownMs: 1600, attackFx: "bite",
    // Couro grosso de areia: o frio da caverna o deixa lento de reagir (vulnerável a gelo); resiste ao calor.
    elements: { ice: 1.3, fire: 0.75 },
    abilities: [
      {
        id: "burrow", name: "Emboscada da Areia", shape: "dive", range: 7, radius: 1, cooldownMs: 11000, power: 1.5, vanishMs: 1600,
        color: 0xd9a35b, fx: "dive",
      },
      {
        id: "swallow", name: "Engolir", shape: "target", range: 1, radius: 0, cooldownMs: 10000, power: 0.4,
        effect: { kind: "engulf", ms: 1800, power: 0.5 }, color: 0xb5651d, fx: "engulf",
      },
      {
        id: "quake", name: "Tremor", shape: "self", range: 2, radius: 2, cooldownMs: 9000, power: 1.2, slow: { factor: 0.6, durationMs: 3000 },
        belowHp: 0.5, color: 0xc8a165, fx: "quake",
      },
    ],
    lore: "Verme gigante das dunas, dono da caverna. Some na areia e irrompe debaixo da presa, engole quem fica colado e, ferido, faz o chão tremer.",
  }),
  // --- Necrópole de Solária: Dunas Cantantes (5 estrelas) e Mesas de Solária (6). A legião do Império de Kusa que a areia
  // enterrou viva e as múmias da corte que a guardam. Os dois mapas usam os mesmos comuns e mini-bosses (as Mesas, mais
  // fundas e em bandos maiores); cada um tem o seu boss. Mais fortes que os da Caverna da Travessia na base.
  boneJackal: monster({
    kind: "boneJackal", name: "Chacal de Ossos", rank: "common", type: "undead", role: "skirmisher", cr: 4, group: [2, 3],
    hp: 60, damage: 8, xp: 38, loot: [4, 8], speed: 4, aggroRange: 7, attackRange: 1, attackCooldownMs: 1100, attackFx: "bite",
    traits: { packTactics: 0.35, hitAndRun: { cooldownMs: 3500 } },
    lore: "Os cães de caça da legião, só osso e fome. Correm em matilha, mordem e recuam antes do troco; juntos, mordem fundo.",
  }),
  scarabSwarm: monster({
    kind: "scarabSwarm", name: "Escaravelhos Carniceiros", rank: "common", type: "beast", role: "swarm", cr: 3, group: [3, 4],
    hp: 34, damage: 5, xp: 22, loot: [2, 4], speed: 3.4, aggroRange: 6, attackRange: 1, attackCooldownMs: 1000, attackFx: "bite",
    traits: { onHit: { chance: 0.5, dot: { kind: "bleed", power: 0.35, durationMs: 3000 } } },
    lore: "Saem das frestas das tumbas aos montes. Cada mordida abre um corte; parados, viram ossos limpos em minutos.",
  }),
  boneLegionary: monster({
    kind: "boneLegionary", name: "Legionário Ossudo", rank: "common", type: "undead", role: "sentinel", cr: 5,
    hp: 150, damage: 11, xp: 80, loot: [8, 13], speed: 2.6, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    // O escudo de bronze aguenta corte e flecha; maça e luz quebram osso.
    elements: { physical: 0.8, radiant: 1.25 },
    abilities: [
      { id: "shieldBash", name: "Escudo em Riste", shape: "target", range: 1, radius: 0, cooldownMs: 7000, power: 0.9, push: 1, color: 0xc89b4a, fx: "slam" },
    ],
    lore: "Soldado do Império de Kusa enterrado de pé com a coorte inteira. Ainda marcha em formação, de escudo erguido (resiste a físico).",
  }),
  boneArcher: monster({
    kind: "boneArcher", name: "Sagitário das Dunas", rank: "common", type: "undead", role: "artillery", cr: 5,
    hp: 80, damage: 11, xp: 70, loot: [7, 12], speed: 2.6, aggroRange: 8, attackRange: 6, attackCooldownMs: 1800, attackFx: "arrow",
    traits: { keepDistance: 3 },
    abilities: [
      {
        id: "arrowRain", name: "Chuva de Flechas", shape: "target", range: 7, radius: 1, cooldownMs: 9000, power: 1.1, color: 0xd9c08a, fx: "acidRain",
      },
    ],
    lore: "Arqueiro da legião, do alto das cristas. Atira de longe, recua quando alguém chega perto e, de vez em quando, cobre uma área de flechas.",
  }),
  wrappedMummy: monster({
    kind: "wrappedMummy", name: "Múmia Enfaixada", rank: "common", type: "undead", role: "controller", cr: 6,
    hp: 190, damage: 13, xp: 98, loot: [10, 16], speed: 1.8, aggroRange: 7, attackRange: 1, attackCooldownMs: 1700, attackFx: "smash",
    elements: { fire: 1.5 },
    traits: { onHit: { dot: { kind: "poison", power: 0.25, durationMs: 4000 } } },
    abilities: [
      {
        id: "graveWraps", name: "Faixas Mortuárias", shape: "pull", range: 5, minRange: 2, radius: 0, cooldownMs: 9000, power: 0.5,
        effect: { kind: "root", ms: 1000 }, color: 0xd8c8a0, fx: "tongue",
      },
    ],
    lore: "Lenta demais para alcançar alguém, então não alcança: lança as faixas, puxa a presa até o colo e prende. O toque apodrece. Queima fácil.",
  }),
  mourner: monster({
    kind: "mourner", name: "Carpideira", rank: "common", type: "undead", role: "controller", cr: 5,
    hp: 95, damage: 9, xp: 76, loot: [7, 12], speed: 2.4, aggroRange: 7, attackRange: 4, attackCooldownMs: 1700, attackFx: "energy",
    elements: { fire: 1.5, dark: 0.75 },
    traits: { keepDistance: 2 },
    abilities: [
      {
        id: "lament", name: "Lamento", shape: "cone", range: 4, radius: 0, length: 4, cooldownMs: 8000, power: 0.8,
        slow: { factor: 0.55, durationMs: 2500 }, color: 0xb9c7e0, fx: "breath",
      },
    ],
    lore: "Chorava nos enterros da corte e nunca parou. É dela parte do canto das dunas: o Lamento pesa nas pernas de quem ouve.",
  }),
  buriedDead: monster({
    kind: "buriedDead", name: "Soterrado", rank: "common", type: "undead", role: "lurker", cr: 5,
    hp: 130, damage: 12, xp: 84, loot: [8, 13], speed: 2.8, aggroRange: 3, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    traits: { camouflage: true, ambush: 1.8, fortitude: { except: ["radiant", "fire"] } },
    lore: "Fica debaixo da areia, só esperando passos. Ninguém o vê antes do primeiro golpe, e o golpe que devia derrubá-lo não derruba (a não ser luz ou fogo).",
  }),
  // Mini-bosses das ruínas (destrancam o baú da sala).
  boneCenturion: monster({
    kind: "boneCenturion", name: "Centurião Ossudo", rank: "miniboss", type: "undead", role: "leader", cr: 7,
    hp: 540, damage: 20, xp: 310, loot: [30, 45], speed: 2.6, aggroRange: 7, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    elements: { physical: 0.8, radiant: 1.25 },
    traits: { leader: { radius: 4, damage: 0.25, haste: 0.2 } },
    abilities: [
      { id: "charge", name: "Investida", shape: "leap", range: 5, minRange: 3, radius: 1, cooldownMs: 8000, power: 1.3, push: 1, color: 0xc0392b, fx: "leap" },
      {
        id: "gladius", name: "Golpe de Gládio", shape: "target", range: 1, radius: 0, cooldownMs: 7000, power: 1.6,
        dot: { kind: "bleed", power: 0.3, durationMs: 3000 }, color: 0xd0d4dc, fx: "rend",
      },
      {
        id: "formation", name: "Formação!", shape: "summon", range: 7, radius: 0, cooldownMs: 20000, power: 0,
        summon: { kind: "boneLegionary", count: 2 }, color: 0xc89b4a, fx: "summon",
      },
    ],
    lore: "Comandou a coorte que a duna engoliu. Investe de longe, abre um corte fundo com o gládio, grita e os legionários levantam da areia; perto dele, batem mais forte e mais rápido (Comando).",
  }),
  royalMummy: monster({
    kind: "royalMummy", name: "Múmia Real", rank: "miniboss", type: "undead", role: "controller", cr: 7,
    hp: 500, damage: 18, xp: 295, loot: [30, 45], speed: 1.9, aggroRange: 7, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    elements: { fire: 1.5 },
    traits: { onHit: { dot: { kind: "poison", power: 0.3, durationMs: 4000 } } },
    abilities: [
      {
        id: "royalWraps", name: "Faixas Reais", shape: "pull", range: 6, minRange: 2, radius: 0, cooldownMs: 9000, power: 0.6,
        effect: { kind: "root", ms: 1200 }, color: 0xe8c860, fx: "tongue",
      },
      {
        id: "pharaohCurse", name: "Maldição do Faraó", shape: "target", range: 6, radius: 2, cooldownMs: 10000, power: 1.2,
        effect: { kind: "corrode", ms: 6000 }, color: 0x7fd36b, fx: "acidRain",
      },
      {
        id: "tombSwarm", name: "Enxame da Tumba", shape: "summon", range: 7, radius: 0, cooldownMs: 18000, power: 0,
        summon: { kind: "scarabSwarm", count: 3 }, belowHp: 0.5, phase: true, color: 0x3a5a2a, fx: "summon",
      },
    ],
    lore: "Uma princesa da corte, enfaixada em linho dourado. Puxa quem foge, amaldiçoa quem fica (a carne corrói) e, ferida, solta o enxame que dormia no sarcófago.",
  }),
  sandScribe: monster({
    kind: "sandScribe", name: "Escriba das Areias", rank: "miniboss", type: "undead", role: "artillery", cr: 7,
    hp: 420, damage: 17, xp: 295, loot: [30, 45], speed: 2.4, aggroRange: 8, attackRange: 4, attackCooldownMs: 1500, attackFx: "energy",
    elements: { fire: 1.25, dark: 0.75 },
    traits: { keepDistance: 3 },
    abilities: [
      {
        id: "blindingWord", name: "Palavra Cegante", shape: "line", range: 6, radius: 0, length: 6, cooldownMs: 9000, power: 1,
        effect: { kind: "blind", ms: 1500 }, color: 0xf0d29c, fx: "breath",
      },
      {
        id: "glyphBlast", name: "Hieróglifo Explosivo", shape: "target", range: 6, radius: 1, cooldownMs: 8000, power: 1.6,
        dot: { kind: "burn", power: 0.25, durationMs: 3000 }, color: 0xffb347, fx: "boulder",
      },
      {
        id: "raiseDead", name: "Erguer os Mortos", shape: "summon", range: 7, radius: 0, cooldownMs: 16000, power: 0,
        summon: { kind: "boneJackal", count: 2 }, color: 0xd8cfb2, fx: "summon",
      },
    ],
    lore: "Esqueleto de escriba com o rolo ainda na mão. Cada palavra que lê cega, cada glifo que escreve explode, e os chacais da legião voltam a correr.",
  }),
  // Bosses: o Colosso Cantante (Dunas) e o Faraó Eterno (Mesas). Mais fortes que o Observador, o das Mesas o mais forte.
  singingColossus: monster({
    kind: "singingColossus", name: "Colosso Cantante", rank: "boss", type: "elemental", role: "brute", cr: 10,
    hp: 3312, damage: 42, xp: 3680, loot: [331, 478], speed: 1.9, aggroRange: 9, attackRange: 2, attackCooldownMs: 1600, attackFx: "smash",
    // Areia e osso: corte passa por ela, o veneno não pega e o gelo a endurece.
    elements: { physical: 0.8, ice: 1.3, nature: 0.5 },
    abilities: [
      {
        id: "lowNote", name: "Nota Grave", shape: "self", range: 3, radius: 3, cooldownMs: 9000, power: 1.3, push: 2,
        slow: { factor: 0.6, durationMs: 3000 }, color: 0xe0b46c, fx: "quake",
      },
      {
        id: "shatteringAria", name: "Ária Estilhaçante", shape: "line", range: 8, radius: 0, length: 8, cooldownMs: 8000, power: 1.6,
        effect: { kind: "corrode", ms: 6000 }, color: 0x7fe0f0, fx: "lightning",
      },
      {
        id: "submerge", name: "Submergir", shape: "dive", range: 8, radius: 2, cooldownMs: 14000, power: 1.5, vanishMs: 1800,
        color: 0xd9a35b, fx: "dive",
      },
      {
        id: "buriedChoir", name: "Coro Soterrado", shape: "summon", range: 8, radius: 0, cooldownMs: 20000, power: 0,
        summon: { kind: "mourner", count: 2 }, belowHp: 0.6, phase: true, color: 0xb9c7e0, fx: "summon",
      },
      {
        id: "singingStorm", name: "Tempestade Cantante", shape: "target", range: 7, radius: 3, cooldownMs: 12000, power: 1.1,
        effect: { kind: "blind", ms: 1500 }, belowHp: 0.4, color: 0xf0d29c, fx: "acidRain",
      },
    ],
    lore: "O canto das dunas tem dono. Um gigante de areia em volta dos ossos da legião, furado pelo vento: cada nota empurra, a ária estilhaça, ele some na duna e volta debaixo de quem fugiu e, ferido, chama o coro e a tempestade.",
  }),
  eternalPharaoh: monster({
    kind: "eternalPharaoh", name: "Faraó Eterno", rank: "boss", type: "undead", role: "artillery", cr: 11,
    hp: 4232, damage: 44, xp: 4784, loot: [405, 589], speed: 2, aggroRange: 9, attackRange: 3, attackCooldownMs: 1400, attackFx: "energy",
    elements: { fire: 1.25, dark: 0.5, radiant: 1.25 },
    traits: { keepDistance: 2 },
    abilities: [
      {
        id: "solarRay", name: "Raio do Sol Morto", shape: "line", range: 8, radius: 0, length: 8, cooldownMs: 8000, power: 1.7,
        dot: { kind: "burn", power: 0.3, durationMs: 4000 }, color: 0xffd04a, fx: "lightning",
      },
      {
        id: "shroud", name: "Mortalha", shape: "pull", range: 6, minRange: 2, radius: 0, cooldownMs: 11000, power: 0.6,
        effect: { kind: "root", ms: 1200 }, color: 0xe8c860, fx: "tongue",
      },
      {
        id: "eternalCurse", name: "Maldição Eterna", shape: "target", range: 7, radius: 2, cooldownMs: 10000, power: 1.3,
        effect: { kind: "corrode", ms: 6000 }, color: 0x7fd36b, fx: "acidRain",
      },
      {
        id: "eternalLegion", name: "Legião Eterna", shape: "summon", range: 8, radius: 0, cooldownMs: 18000, power: 0,
        summon: { kind: "boneLegionary", count: 2 }, color: 0xc89b4a, fx: "summon",
      },
      {
        id: "sarcophagus", name: "Sarcófago", shape: "self", range: 2, radius: 2, cooldownMs: 30000, power: 1.2, push: 3,
        selfHeal: 0.2, belowHp: 0.3, phase: true, once: true, color: 0xe8c860, fx: "slam",
      },
    ],
    lore: "O último faraó do Império de Kusa, que se mandou enterrar com a corte e a legião para governar depois da morte. Queima com o sol morto, puxa com a mortalha, corrói com a maldição, chama a legião e, quase vencido, fecha-se no sarcófago e volta mais forte.",
  }),
  // --- Bosque Velho (5 estrelas): a floresta antiga do Kosaradius, do lado oeste da bifurcação da Travessia. Feras,
  // plantas que andam e os espíritos que a corrupção virou contra quem entra. Mesma faixa de força da Necrópole de
  // Solária (o mesmo degrau da campanha, do outro lado), mas quase nada é morto-vivo: veneno e sangramento pegam, e as
  // plantas queimam fácil. Elenco e arte proposta em `docs/arte/agente/BOSQUE_VELHO.md`.
  twigling: monster({
    kind: "twigling", name: "Galhudo", rank: "common", type: "plant", role: "swarm", cr: 3, group: [3, 4],
    hp: 36, damage: 5, xp: 24, loot: [2, 4], speed: 3.2, aggroRange: 4, attackRange: 1, attackCooldownMs: 1100, attackFx: "slash",
    traits: { camouflage: true },
    lore: "Feixe de galhos secos amarrados por raízes, com dois olhos de brasa no fundo. Parado no chão, é só mais um monte de gravetos; quando alguém passa perto, levanta o bando inteiro.",
  }),
  direWolf: monster({
    kind: "direWolf", name: "Lobo Atroz", rank: "common", type: "beast", role: "skirmisher", cr: 4, group: [2, 3],
    hp: 64, damage: 8, xp: 40, loot: [4, 8], speed: 4, aggroRange: 7, attackRange: 1, attackCooldownMs: 1100, attackFx: "bite",
    traits: { packTactics: 0.4 },
    abilities: [
      {
        id: "trip", name: "Derrubar", shape: "target", range: 1, radius: 0, cooldownMs: 6000, power: 0.8,
        effect: { kind: "stun", ms: 1000 }, color: 0x9a9a9a, fx: "rend",
      },
    ],
    lore: "Lobo cinzento do tamanho de um pônei, com uma flecha velha no ombro. Caça em matilha: um derruba a presa e os outros mordem fundo (Táticas de Bando).",
  }),
  satyr: monster({
    kind: "satyr", name: "Sátiro Flautista", rank: "common", type: "fey", role: "leader", cr: 4,
    hp: 85, damage: 8, xp: 72, loot: [7, 12], speed: 2.8, aggroRange: 7, attackRange: 3, attackCooldownMs: 1600, attackFx: "nature",
    traits: { keepDistance: 2, leader: { radius: 3, damage: 0.1, haste: 0.15 } },
    abilities: [
      {
        id: "enchantingTune", name: "Melodia Encantada", shape: "cone", range: 4, radius: 0, length: 4, cooldownMs: 8000, power: 0.5,
        slow: { factor: 0.55, durationMs: 1500 }, color: 0xc8e070, fx: "breath",
      },
    ],
    lore: "Toca a flauta de juncos atrás da briga: perto dele, as feras atacam mais rápido (Comando), e quem ouve a melodia arrasta os pés. Mate-o primeiro.",
  }),
  thornSpitter: monster({
    kind: "thornSpitter", name: "Espinheiro", rank: "common", type: "plant", role: "artillery", cr: 5,
    hp: 90, damage: 11, xp: 72, loot: [7, 12], speed: 2.2, aggroRange: 8, attackRange: 5, attackCooldownMs: 1700, attackFx: "arrow",
    traits: { keepDistance: 2 },
    abilities: [
      {
        id: "thornBurst", name: "Explosão de Espinhos", shape: "self", range: 1, radius: 1, cooldownMs: 8000, power: 1.2,
        dot: { kind: "bleed", power: 0.3, durationMs: 3000 }, color: 0xb8c84a, fx: "quake",
      },
      {
        id: "thornVolley", name: "Rajada de Espinhos", shape: "bolt", range: 6, minRange: 2, radius: 0, cooldownMs: 7000, power: 1.3,
        dot: { kind: "bleed", power: 0.3, durationMs: 3000 }, color: 0xb8c84a, fx: "spit",
      },
    ],
    lore: "Moita de amora que anda curvada como gente. Atira os espinhos das costas de longe (sangra) e, se alguém cola, explode em agulhas para todo lado. Queima fácil.",
  }),
  shadowPanther: monster({
    kind: "shadowPanther", name: "Pantera das Sombras", rank: "common", type: "monstrosity", role: "lurker", cr: 5,
    hp: 120, damage: 12, xp: 84, loot: [8, 13], speed: 3.8, aggroRange: 3, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    elements: { radiant: 1.25 },
    traits: { camouflage: true, ambush: 1.8 },
    abilities: [
      { id: "pounce", name: "Bote", shape: "leap", range: 4, minRange: 2, radius: 0, cooldownMs: 7000, power: 1.2, color: 0x2a3a5a, fx: "leap" },
    ],
    lore: "Fumaça escura com dois olhos verdes. Dorme na sombra da mata até alguém passar a 3 tiles; o primeiro golpe vem de surpresa (1,8×) e, se a presa foge, o bote a alcança. A luz a fere mais.",
  }),
  owlbear: monster({
    kind: "owlbear", name: "Urso-coruja", rank: "common", type: "monstrosity", role: "brute", cr: 6,
    hp: 200, damage: 12, xp: 100, loot: [10, 16], speed: 2.6, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600, attackFx: "slash",
    traits: { multiattack: { hits: 2, power: 0.6 } },
    abilities: [
      {
        id: "crushingHug", name: "Abraço Esmagador", shape: "target", range: 1, radius: 0, cooldownMs: 8000, power: 1.3,
        effect: { kind: "root", ms: 1500 }, color: 0xc89a5a, fx: "constrict",
      },
    ],
    lore: "Corpo de urso, cabeça de coruja e nenhum juízo. Bica e arranha no mesmo golpe (Multiataque) e, de vez em quando, agarra a presa num abraço que não deixa sair.",
  }),
  // Mini-bosses das clareiras cercadas de troncos (destrancam o baú da sala).
  corruptedDryad: monster({
    kind: "corruptedDryad", name: "Dríade Corrompida", rank: "miniboss", type: "fey", role: "controller", cr: 7,
    hp: 460, damage: 17, xp: 295, loot: [30, 45], speed: 2.4, aggroRange: 8, attackRange: 4, attackCooldownMs: 1500, attackFx: "nature",
    elements: { fire: 1.25, nature: 0.75 },
    traits: { keepDistance: 2 },
    abilities: [
      {
        id: "entangle", name: "Enraizar", shape: "target", range: 6, radius: 1, cooldownMs: 9000, power: 0.8,
        effect: { kind: "root", ms: 1500 }, color: 0x6b8e23, fx: "web",
      },
      {
        id: "branchCall", name: "Chamado dos Galhos", shape: "summon", range: 7, radius: 0, cooldownMs: 18000, power: 0,
        summon: { kind: "twigling", count: 3 }, color: 0xc8a060, fx: "summon",
      },
      { id: "treeStride", name: "Passo Arbóreo", shape: "vanish", range: 3, radius: 0, cooldownMs: 14000, power: 0, vanishMs: 1500, belowHp: 0.6, color: 0x4a7a3a, fx: "vanish" },
    ],
    lore: "Era a guardiã de uma bétula velha; a podridão subiu pelas raízes até o coração dela. Prende os pés de quem chega, chama os galhudos e, ferida, some no tronco de uma árvore.",
  }),
  renegadeCentaur: monster({
    kind: "renegadeCentaur", name: "Centauro Renegado", rank: "miniboss", type: "monstrosity", role: "artillery", cr: 7,
    hp: 440, damage: 17, xp: 295, loot: [30, 45], speed: 3.6, aggroRange: 9, attackRange: 5, attackCooldownMs: 1400, attackFx: "arrow",
    traits: { keepDistance: 3 },
    abilities: [
      {
        id: "kick", name: "Coice", shape: "self", range: 1, radius: 1, cooldownMs: 7000, power: 1.4, push: 2, color: 0x8a8a8a, fx: "slam",
      },
      {
        id: "arrowRain", name: "Chuva de Flechas", shape: "target", range: 7, radius: 1, cooldownMs: 9000, power: 1.2, color: 0xd9c08a, fx: "acidRain",
      },
    ],
    lore: "Expulso da manada, caça sozinho no Bosque Velho. Rápido demais para alcançar: atira de longe, cobre a clareira de flechas e, encurralado, dá um coice que joga longe.",
  }),
  menhirGuardian: monster({
    kind: "menhirGuardian", name: "Guardião do Menir", rank: "miniboss", type: "construct", role: "sentinel", cr: 7,
    hp: 600, damage: 19, xp: 310, loot: [30, 45], speed: 1.8, aggroRange: 3, attackRange: 1, attackCooldownMs: 1800, attackFx: "smash",
    // Pedra: corte e flecha resvalam; o raio racha.
    elements: { physical: 0.5, energy: 1.25 },
    traits: { camouflage: true },
    abilities: [
      {
        id: "runeStomp", name: "Pisão Rúnico", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 1.6,
        slow: { factor: 0.5, durationMs: 2500 }, color: 0x4ad0c0, fx: "quake",
      },
      {
        id: "stoneFist", name: "Punho de Pedra", shape: "target", range: 1, radius: 0, cooldownMs: 10000, power: 1.8,
        effect: { kind: "stun", ms: 1000 }, color: 0x8a8f7a, fx: "slam",
      },
    ],
    lore: "Menires empilhados que a runa em espiral mantém de pé. Parado, é só mais uma pedra da clareira; acorda quando alguém encosta, pisa o chão e atordoa com o punho. Corte e flecha resvalam (resiste a físico); raio racha.",
  }),
  // Boss: o Dragão Verde, no círculo de menires do norte. Derrotado, abre o Coração da Mata.
  greenDragon: monster({
    kind: "greenDragon", name: "Dragão Verde Jovem", rank: "boss", type: "dragon", role: "brute", cr: 10,
    hp: 3200, damage: 40, xp: 3600, loot: [320, 465], speed: 2.4, aggroRange: 9, attackRange: 2, attackCooldownMs: 1500, attackFx: "bite",
    // Resiste a natureza, não imune: o Druida não fica sem dano.
    elements: { nature: 0.5 },
    traits: { multiattack: { hits: 3, power: 0.3 } },
    abilities: [
      {
        id: "flight", name: "Voo", shape: "dive", range: 8, radius: 2, cooldownMs: 15000, power: 1.5, vanishMs: 2000,
        belowHp: 0.5, phase: true, color: 0x58d68d, fx: "dive",
      },
      {
        id: "poisonBreath", name: "Sopro Venenoso", shape: "cone", range: 6, radius: 0, length: 6, cooldownMs: 8000, power: 1.8,
        dot: { kind: "poison", power: 0.3, durationMs: 4000 }, color: 0x9acd32, fx: "breath",
      },
      {
        id: "tailSweep", name: "Rabada", shape: "self", range: 2, radius: 2, cooldownMs: 9000, power: 1.3, push: 2, color: 0x2e7d4f, fx: "quake",
      },
      {
        id: "menhirGas", name: "Gás dos Menires", shape: "target", range: 7, radius: 2, cooldownMs: 12000, power: 1,
        slow: { factor: 0.6, durationMs: 2500 }, dot: { kind: "poison", power: 0.25, durationMs: 3000 }, belowHp: 0.6, color: 0x7fd36b, fx: "acidRain",
      },
    ],
    lore: "Fez ninho no círculo de menires e envenenou a clareira inteira. Morde três vezes, sopra veneno em leque e varre com a cauda; ferido, os menires soltam gás e ele alça voo para cair sobre quem fugiu. Resiste a veneno.",
  }),
  // --- Coração da Mata (6 estrelas): o fundo da floresta do Kosaradius, depois do Bosque Velho. A luz quase não chega:
  // fungos e cipós que se mexem, a caçada corrompida do Rei Galhado (javalis e cervos) e os mortos dos santuários
  // élficos. Também vêm do Bosque Velho, mais fundo, a Pantera das Sombras, o Urso-coruja e a Dríade Corrompida. Na
  // faixa de força das Mesas de Solária (o mesmo degrau, do outro lado da bifurcação).
  myconid: monster({
    kind: "myconid", name: "Fungóide", rank: "common", type: "plant", role: "controller", cr: 5, group: [2, 3],
    hp: 110, damage: 10, xp: 74, loot: [7, 12], speed: 2.2, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    traits: { onHit: { chance: 0.5, dot: { kind: "poison", power: 0.25, durationMs: 3000 } } },
    abilities: [
      {
        id: "sporeCloud", name: "Nuvem de Esporos", shape: "self", range: 2, radius: 2, cooldownMs: 9000, power: 0.7,
        slow: { factor: 0.6, durationMs: 2500 }, dot: { kind: "poison", power: 0.3, durationMs: 4000 }, color: 0xb8d070, fx: "acidRain",
      },
    ],
    lore: "Cogumelo do tamanho de um homem, que anda em bando debaixo das árvores anciãs. Bate com o chapéu e, quando alguém chega perto, solta a nuvem de esporos: envenena e pesa nas pernas. Queima fácil.",
  }),
  thornBoar: monster({
    kind: "thornBoar", name: "Javali-Espinho", rank: "common", type: "beast", role: "brute", cr: 5, group: [2, 2],
    hp: 150, damage: 12, xp: 82, loot: [8, 13], speed: 3.4, aggroRange: 6, attackRange: 1, attackCooldownMs: 1400, attackFx: "bite",
    traits: { onHit: { chance: 0.35, dot: { kind: "bleed", power: 0.3, durationMs: 3000 } } },
    abilities: [
      { id: "gore", name: "Investida", shape: "leap", range: 5, minRange: 2, radius: 1, cooldownMs: 7000, power: 1.4, push: 1, color: 0x8a5a3a, fx: "leap" },
    ],
    lore: "Javali da caçada do Rei Galhado, com espinhos de amora nascendo do lombo. Vem em dupla, abaixa a cabeça e investe de longe; a presa rasga quem encosta.",
  }),
  corruptedStag: monster({
    kind: "corruptedStag", name: "Cervo Corrompido", rank: "common", type: "monstrosity", role: "skirmisher", cr: 6,
    hp: 170, damage: 11, xp: 98, loot: [10, 16], speed: 3.8, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "smash",
    traits: { hitAndRun: { cooldownMs: 4000 } },
    abilities: [
      {
        id: "antlerCharge", name: "Galhada", shape: "line", range: 5, minRange: 2, radius: 0, length: 5, cooldownMs: 8000, power: 1.6, push: 2,
        color: 0xc8b890, fx: "breath",
      },
    ],
    lore: "Cervo de olhos vazios e galhada coberta de musgo podre, o cão de caça do Rei Galhado. Atravessa a clareira em linha reta e joga longe quem estiver no caminho; depois de bater, recua (Fuga Ágil).",
  }),
  elvenShade: monster({
    kind: "elvenShade", name: "Sombra Élfica", rank: "common", type: "undead", role: "artillery", cr: 6,
    hp: 95, damage: 13, xp: 92, loot: [9, 15], speed: 2.8, aggroRange: 8, attackRange: 6, attackCooldownMs: 1700, attackFx: "energy",
    elements: { radiant: 1.5, dark: 0.5 },
    traits: { keepDistance: 3, blink: { everyMs: 6500, ms: 1500 } },
    abilities: [
      {
        id: "moonArrow", name: "Flecha da Lua Morta", shape: "line", range: 7, radius: 0, length: 7, cooldownMs: 9000, power: 1.4,
        effect: { kind: "blind", ms: 1200 }, color: 0x9af0e4, fx: "lightning",
      },
    ],
    lore: "Arqueira élfica que morreu no santuário e não saiu de lá. Atira de longe, some no ar de vez em quando e a flecha da lua morta atravessa tudo em linha e cega. A luz a desfaz.",
  }),
  stranglerVine: monster({
    kind: "stranglerVine", name: "Cipó Estrangulador", rank: "common", type: "plant", role: "lurker", cr: 5,
    hp: 140, damage: 11, xp: 86, loot: [8, 14], speed: 2, aggroRange: 3, attackRange: 2, attackCooldownMs: 1500, attackFx: "nature",
    traits: { camouflage: true, ambush: 1.6 },
    abilities: [
      {
        id: "strangle", name: "Estrangular", shape: "pull", range: 5, minRange: 2, radius: 0, cooldownMs: 8000, power: 0.6,
        effect: { kind: "root", ms: 1500 }, color: 0x4a7a2a, fx: "tongue",
      },
    ],
    lore: "Um emaranhado de cipós escuros que parece só mais um pedaço da mata. Ninguém o vê antes do primeiro bote; quem foge é laçado, puxado de volta e preso. Queima fácil.",
  }),
  // Mini-bosses (os santuários élficos guardam o baú).
  awakenedTree: monster({
    kind: "awakenedTree", name: "Árvore Desperta", rank: "miniboss", type: "plant", role: "sentinel", cr: 8,
    hp: 720, damage: 21, xp: 340, loot: [32, 48], speed: 1.7, aggroRange: 4, attackRange: 2, attackCooldownMs: 1900, attackFx: "smash",
    elements: { physical: 0.75 },
    traits: { camouflage: true },
    abilities: [
      {
        id: "rootGrasp", name: "Raízes", shape: "target", range: 6, radius: 2, cooldownMs: 10000, power: 0.9,
        effect: { kind: "root", ms: 1500 }, color: 0x6b4a2a, fx: "web",
      },
      { id: "branchSweep", name: "Varrida de Galho", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 1.6, push: 2, color: 0x5a7a2a, fx: "slam" },
    ],
    lore: "Um carvalho velho que acordou de mau humor. Parado, é só mais uma árvore do santuário; quando alguém encosta, prende os pés com as raízes e varre a clareira com os galhos. A casca aguenta corte (resiste a físico); o fogo, não.",
  }),
  fallenWarden: monster({
    kind: "fallenWarden", name: "Guardião Élfico Caído", rank: "miniboss", type: "undead", role: "leader", cr: 8,
    hp: 560, damage: 22, xp: 330, loot: [32, 48], speed: 3.2, aggroRange: 8, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    elements: { radiant: 1.25, dark: 0.75 },
    traits: { leader: { radius: 4, damage: 0.2, haste: 0.2 } },
    abilities: [
      { id: "shadowStep", name: "Passo Sombrio", shape: "leap", range: 6, minRange: 2, radius: 1, cooldownMs: 8000, power: 1.3, color: 0x4ad0c0, fx: "leap" },
      {
        id: "bladeDance", name: "Dança das Lâminas", shape: "self", range: 1, radius: 1, cooldownMs: 7000, power: 1.7,
        dot: { kind: "burn", power: 0.25, durationMs: 3000 }, color: 0x9af0e4, fx: "slam",
      },
      {
        id: "shadeCall", name: "Chamado do Santuário", shape: "summon", range: 7, radius: 0, cooldownMs: 20000, power: 0,
        summon: { kind: "elvenShade", count: 2 }, belowHp: 0.5, phase: true, color: 0x9af0e4, fx: "summon",
      },
    ],
    lore: "O último guardião do santuário, de armadura élfica e duas lâminas de luz fria. Salta da sombra, gira as lâminas em volta (a luz queima) e, ferido, chama as arqueiras mortas; perto dele, todos batem mais forte e mais rápido (Comando).",
  }),
  // Boss: o Rei Galhado, na clareira da árvore do coração. O último boss do lado da floresta.
  erlking: monster({
    kind: "erlking", name: "Rei Galhado", rank: "boss", type: "fey", role: "brute", cr: 11,
    hp: 4300, damage: 48, xp: 4800, loot: [405, 590], speed: 2.6, aggroRange: 9, attackRange: 2, attackCooldownMs: 1500, attackFx: "slash",
    // Espírito da mata: o veneno da floresta mal o toca; o fogo e o ferro frio (gelo), sim.
    elements: { nature: 0.5, fire: 1.25, ice: 1.15 },
    abilities: [
      {
        id: "royalCharge", name: "Investida da Galhada", shape: "line", range: 7, minRange: 2, radius: 1, length: 7, cooldownMs: 9000, power: 1.7, push: 2,
        color: 0xd8c8a0, fx: "breath",
      },
      {
        id: "heartThorns", name: "Espinhos do Coração", shape: "target", range: 7, radius: 3, cooldownMs: 11000, power: 1.2,
        dot: { kind: "bleed", power: 0.3, durationMs: 4000 }, color: 0x9a2a3a, fx: "acidRain",
      },
      {
        id: "wildHunt", name: "Chamado da Caçada", shape: "summon", range: 8, radius: 0, cooldownMs: 22000, power: 0,
        summon: { kind: "corruptedStag", count: 2 }, belowHp: 0.7, phase: true, color: 0xc8b890, fx: "summon",
      },
      { id: "mistStep", name: "Passo da Névoa", shape: "dive", range: 8, radius: 2, cooldownMs: 15000, power: 1.4, vanishMs: 1600, belowHp: 0.5, color: 0x9ab8a0, fx: "dive" },
      {
        id: "forestWrath", name: "Fúria da Mata", shape: "self", range: 3, radius: 3, cooldownMs: 30000, power: 1.5, push: 3,
        effect: { kind: "root", ms: 1200 }, selfHeal: 0.15, belowHp: 0.3, phase: true, once: true, color: 0x6b8e23, fx: "quake",
      },
    ],
    lore: "O senhor da caçada da floresta do Kosaradius, alto como uma árvore nova, com a galhada de cervo cheia de musgo e o manto de folhas mortas. Atravessa a clareira de galhada baixa, faz chover espinhos que sangram, chama os cervos, some na névoa para cair sobre quem fugiu e, quase vencido, a mata inteira levanta em volta dele.",
  }),
  // --- Charco Cinzento (8 estrelas): a turfeira queimou há gerações; os turfeiros que morreram no fogo e na água voltaram
  // da lama, e o lago negro tem uma dona. No degrau da Fortaleza Orc (a etapa 9 vem depois de Vorgak), sem multiplicador
  // de força: as fichas já são as do degrau.
  giantLeech: monster({
    kind: "giantLeech", name: "Sanguessuga Gigante", rank: "common", type: "beast", role: "swarm", cr: 6, group: [3, 4],
    hp: 95, damage: 11, xp: 72, loot: [7, 11], speed: 2.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1300, attackFx: "bite",
    traits: { onHit: { lifesteal: 0.5 } },
    lore: "Sanguessuga do tamanho de um braço, que sai da lama em bando quando sente passo. Gruda e chupa: cada mordida a deixa mais cheia de vida.",
  }),
  carrionCrow: monster({
    kind: "carrionCrow", name: "Corvo Carniceiro", rank: "common", type: "beast", role: "skirmisher", cr: 6, group: [2, 3],
    hp: 110, damage: 13, xp: 92, loot: [9, 14], speed: 4, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "bite",
    traits: { hitAndRun: { cooldownMs: 3500 }, onHit: { chance: 0.25, effect: { kind: "blind", ms: 900 } } },
    abilities: [
      { id: "crowDive", name: "Mergulho", shape: "dive", range: 6, minRange: 2, radius: 1, cooldownMs: 9000, power: 1.4, vanishMs: 900, color: 0x2a2a30, fx: "dive" },
    ],
    lore: "Corvo grande como um cão, que vive do que o charco devolve. Desce do céu cinza em bando, cai colado em quem anda sozinho e mira nos olhos (a bicada pode cegar).",
  }),
  peatDrowned: monster({
    kind: "peatDrowned", name: "Turfeiro Afogado", rank: "common", type: "undead", role: "brute", cr: 8,
    hp: 300, damage: 21, xp: 175, loot: [14, 22], speed: 2.1, aggroRange: 6, attackRange: 1, attackCooldownMs: 1700, attackFx: "smash",
    // Turfa encharcada: o corte entra pouco; a turfa seca por fora queima bem.
    elements: { physical: 0.85, fire: 1.5 },
    traits: { onHit: { chance: 0.4, corrode: 6000 } },
    lore: "Um dos turfeiros que o incêndio empurrou para dentro da água. Voltou com o corpo de turfa encharcada: anda devagar, aguenta muito, e o golpe de lama gruda e corrói. A turfa queima.",
  }),
  lanternBearer: monster({
    kind: "lanternBearer", name: "Lanterneiro", rank: "common", type: "undead", role: "artillery", cr: 8,
    hp: 170, damage: 19, xp: 165, loot: [13, 21], speed: 2.6, aggroRange: 8, attackRange: 5, attackCooldownMs: 1800, attackFx: "fire",
    elements: { radiant: 1.25 },
    traits: { keepDistance: 3 },
    abilities: [
      {
        id: "wispFire", name: "Fogo-Fátuo", shape: "bolt", range: 6, radius: 1, cooldownMs: 7000, power: 1.4,
        dot: { kind: "burn", power: 0.3, durationMs: 3000 }, color: 0x8ef0d8, fx: "bolt",
      },
    ],
    lore: "O turfeiro que guiava os outros pela névoa com a lanterna verde, e ainda guia. Fica longe, atira o fogo-fátuo da lanterna (queima) e recua se alguém chega perto.",
  }),
  ashOoze: monster({
    kind: "ashOoze", name: "Lodo de Cinza", rank: "common", type: "ooze", role: "controller", cr: 8,
    hp: 250, damage: 17, xp: 180, loot: [14, 22], speed: 1.8, aggroRange: 5, attackRange: 1, attackCooldownMs: 1700, attackFx: "smash",
    elements: { ice: 0.6 },
    traits: { split: { by: ["physical"], minHit: 0.12, max: 3 } },
    abilities: [
      {
        id: "ashEngulf", name: "Engolir", shape: "target", range: 1, radius: 0, cooldownMs: 10000, power: 0.5,
        effect: { kind: "engulf", ms: 1800, power: 0.6 }, color: 0x8d8c86, fx: "engulf",
      },
    ],
    lore: "Cinza do incêndio que a chuva virou lama e a lama aprendeu a andar. Engole quem encosta (os aliados batendo nele o fazem cuspir) e o golpe forte de lâmina o parte em dois.",
  }),
  poolLurker: monster({
    kind: "poolLurker", name: "Espreitador da Poça", rank: "common", type: "monstrosity", role: "lurker", cr: 8,
    hp: 240, damage: 20, xp: 175, loot: [14, 22], speed: 3, aggroRange: 3, attackRange: 1, attackCooldownMs: 1500, attackFx: "bite",
    traits: { camouflage: true, ambush: 1.6 },
    abilities: [
      {
        id: "poolPull", name: "Puxão", shape: "pull", range: 5, minRange: 2, radius: 0, cooldownMs: 8000, power: 0.7,
        effect: { kind: "root", ms: 1200 }, color: 0x2d3b41, fx: "tongue",
      },
    ],
    lore: "Fica deitado na beira das poças, coberto de lama, até ser só mais um monte de turfa. O primeiro bote vem de surpresa; quem foge é puxado de volta para a água.",
  }),
  // Mini-bosses (os terreiros de paliçada guardam o baú; nas emboscadas, 25% trazem um solto).
  ashHag: monster({
    kind: "ashHag", name: "Bruxa Cinzenta", rank: "miniboss", type: "fey", role: "controller", cr: 10,
    hp: 640, damage: 28, xp: 520, loot: [46, 66], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    abilities: [
      {
        id: "ashIllusion", name: "Ilusão", shape: "vanish", range: 6, radius: 0, cooldownMs: 15000, power: 0, vanishMs: 3000,
        summon: { kind: "ashHagIllusion", count: 2 }, belowHp: 0.6, color: 0xb8b8b0, fx: "vanish",
      },
      {
        id: "ashFog", name: "Névoa", shape: "target", range: 6, radius: 2, cooldownMs: 10000, power: 0.9,
        effect: { kind: "blind", ms: 1500 }, color: 0xd8dcd8, fx: "acidRain",
      },
      {
        id: "hagCurse", name: "Maldição", shape: "bolt", range: 6, radius: 0, cooldownMs: 8000, power: 1.2,
        effect: { kind: "corrode", ms: 6000 }, color: 0x7a6272, fx: "bolt",
      },
    ],
    lore: "A velha que os turfeiros pagavam para afastar a névoa e que, no fim, a chamou. Cega a clareira com a névoa, amaldiçoa (corrói) e, ferida, some e volta em três: só uma é ela.",
  }),
  ashHagIllusion: monster({
    kind: "ashHagIllusion", name: "Bruxa Cinzenta", rank: "common", type: "fey", role: "swarm", cr: 1,
    hp: 1, damage: 0, xp: 0, loot: [0, 0], speed: 3, aggroRange: 8, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    traits: { illusion: true },
    lore: "Uma das cópias da Bruxa Cinzenta: desfaz-se no primeiro golpe.",
  }),
  bogMonolith: monster({
    kind: "bogMonolith", name: "Monólito Desperto", rank: "miniboss", type: "construct", role: "sentinel", cr: 10,
    hp: 760, damage: 30, xp: 540, loot: [46, 66], speed: 1.8, aggroRange: 4, attackRange: 2, attackCooldownMs: 2000, attackFx: "smash",
    elements: { physical: 0.8, energy: 1.4 },
    traits: { camouflage: true },
    abilities: [
      {
        id: "runePulse", name: "Pulso da Runa", shape: "self", range: 2, radius: 2, cooldownMs: 10000, power: 1.3,
        effect: { kind: "stun", ms: 900 }, color: 0x8ef0d8, fx: "quake",
      },
      { id: "monolithSlam", name: "Pancada de Pedra", shape: "target", range: 2, radius: 1, cooldownMs: 7000, power: 1.7, push: 2, color: 0x87898a, fx: "slam" },
    ],
    lore: "Um dos monólitos da turfeira, que acordou quando a runa da espiral acendeu de novo. Parado, é só pedra; perto, a runa pulsa e atordoa, e a pancada joga longe. A pedra aguenta corte; o raio a racha.",
  }),
  drownedKnight: monster({
    kind: "drownedKnight", name: "Cavaleiro Afogado", rank: "miniboss", type: "undead", role: "leader", cr: 10,
    hp: 700, damage: 31, xp: 540, loot: [46, 66], speed: 2.8, aggroRange: 8, attackRange: 1, attackCooldownMs: 1500, attackFx: "slash",
    elements: { radiant: 1.25, physical: 0.9 },
    traits: { leader: { radius: 4, damage: 0.2, haste: 0.2 } },
    abilities: [
      { id: "knightCharge", name: "Investida", shape: "leap", range: 6, minRange: 2, radius: 1, cooldownMs: 8000, power: 1.5, push: 1, color: 0x8a6a4a, fx: "leap" },
      {
        id: "rustSweep", name: "Varrida Enferrujada", shape: "self", range: 1, radius: 1, cooldownMs: 7000, power: 1.6,
        dot: { kind: "bleed", power: 0.25, durationMs: 3000 }, color: 0x8a5a34, fx: "slam",
      },
      {
        id: "drownedCall", name: "Chamado dos Afogados", shape: "summon", range: 7, radius: 0, cooldownMs: 22000, power: 0,
        summon: { kind: "peatDrowned", count: 2 }, belowHp: 0.5, phase: true, color: 0x6b7360, fx: "summon",
      },
    ],
    lore: "Cavaleiro do império que guardava a estrada do aterro e afundou com ela, de armadura e tudo. A armadura enferrujou; ele não. Investe, varre em volta com a espada enferrujada (sangra), faz os afogados baterem mais forte e mais rápido (Comando) e, ferido, chama mais dois da lama.",
  }),
  // Boss: Morgrana, na ilha do lago negro. O último boss do lado do charco.
  morgrana: monster({
    kind: "morgrana", name: "Morgrana, a Rainha Afogada", rank: "boss", type: "undead", role: "controller", cr: 13,
    hp: 4900, damage: 49, xp: 5800, loot: [460, 680], speed: 2.5, aggroRange: 9, attackRange: 2, attackCooldownMs: 1600, attackFx: "energy",
    // A água do lago a protege do fogo; a luz e o raio, não.
    elements: { fire: 0.6, radiant: 1.3, energy: 1.15 },
    abilities: [
      {
        id: "blackTide", name: "Maré Negra", shape: "self", range: 3, radius: 3, cooldownMs: 11000, power: 1.4, push: 2,
        slow: { factor: 0.55, durationMs: 2500 }, color: 0x1d2a30, fx: "quake",
      },
      {
        id: "lakeHand", name: "Mão do Lago", shape: "pull", range: 7, minRange: 3, radius: 0, cooldownMs: 9000, power: 1,
        effect: { kind: "root", ms: 1200 }, color: 0x2d3b41, fx: "tongue",
      },
      {
        id: "drownedCourt", name: "Chamado dos Afogados", shape: "summon", range: 8, radius: 0, cooldownMs: 22000, power: 0,
        summon: { kind: "peatDrowned", count: 2 }, belowHp: 0.7, phase: true, color: 0x6b7360, fx: "summon",
      },
      { id: "lakeDive", name: "Mergulho no Lago", shape: "dive", range: 8, radius: 2, cooldownMs: 15000, power: 1.5, vanishMs: 1700, belowHp: 0.5, color: 0x93a9b1, fx: "dive" },
      {
        id: "drownedLament", name: "Lamento", shape: "self", range: 3, radius: 3, cooldownMs: 30000, power: 1.2,
        effect: { kind: "blind", ms: 1500 }, selfHeal: 0.12, belowHp: 0.3, phase: true, once: true, color: 0x8ef0d8, fx: "quake",
      },
    ],
    lore: "Era a senhora da vila dos turfeiros quando o fogo veio; fugiu para o lago e o lago a guardou. Agora é dele: sai da água negra em volta da ilha, empurra tudo com a maré, puxa quem foge e chama os afogados; ferida, mergulha e volta colada, e quase vencida solta o lamento que cega e a cura. A água a protege do fogo.",
  }),
  // --- Ermos Rubros (8 estrelas): a mina de ferro do império, abandonada quando a cratera desabou. A ferrugem tomou o
  // vale, os mineiros que ficaram lá embaixo voltaram e o gigante que cavava com eles ainda guarda a cratera. No degrau
  // do Charco Cinzento (os dois lados da etapa 9 valem o mesmo).
  rustBeetle: monster({
    kind: "rustBeetle", name: "Escaravelho de Ferrugem", rank: "common", type: "beast", role: "swarm", cr: 6, group: [3, 4],
    hp: 100, damage: 11, xp: 72, loot: [7, 11], speed: 2.8, aggroRange: 5, attackRange: 1, attackCooldownMs: 1300, attackFx: "bite",
    elements: { physical: 0.9 },
    traits: { onHit: { chance: 0.35, corrode: 5000 } },
    lore: "Besouro do tamanho de um gato, que vive de comer o ferro largado na mina. Sai do barro em enxame, e a mordida deixa a armadura enferrujada (corrói).",
  }),
  badlandsHyena: monster({
    kind: "badlandsHyena", name: "Hiena dos Ermos", rank: "common", type: "beast", role: "skirmisher", cr: 6, group: [2, 3],
    hp: 120, damage: 13, xp: 92, loot: [9, 14], speed: 3.8, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "bite",
    traits: { packTactics: 0.35, hitAndRun: { cooldownMs: 3800 } },
    lore: "Hiena magra de pelo vermelho do barro, que segue as caravanas até alguém cair. Caça em matilha: morde mais forte quando outra já está mordendo o mesmo (Táticas de Bando) e pula para trás antes do troco.",
  }),
  redRaider: monster({
    kind: "redRaider", name: "Saqueador Rubro", rank: "common", type: "humanoid", role: "artillery", cr: 8,
    hp: 175, damage: 19, xp: 165, loot: [13, 21], speed: 3, aggroRange: 8, attackRange: 5, attackCooldownMs: 1800, attackFx: "arrow",
    traits: { keepDistance: 3 },
    abilities: [
      {
        id: "barbedArrow", name: "Flecha Farpada", shape: "bolt", range: 6, radius: 0, cooldownMs: 7000, power: 1.4,
        dot: { kind: "bleed", power: 0.3, durationMs: 3000 }, color: 0xb0452a, fx: "bolt",
      },
    ],
    lore: "Bandido montado que vive de assaltar quem desce para a mina. Fica longe, atira a flecha farpada (sangra) e recua a galope se alguém chega perto.",
  }),
  lostMiner: monster({
    kind: "lostMiner", name: "Mineiro Perdido", rank: "common", type: "undead", role: "brute", cr: 8,
    hp: 310, damage: 21, xp: 175, loot: [14, 22], speed: 2.1, aggroRange: 6, attackRange: 1, attackCooldownMs: 1700, attackFx: "smash",
    elements: { radiant: 1.3 },
    traits: { onHit: { chance: 0.2, effect: { kind: "stun", ms: 600 } } },
    lore: "Um dos mineiros que ficaram lá embaixo quando a cratera desabou. Voltou de picareta na mão e o capacete amassado: anda devagar, aguenta muito e a picaretada às vezes atordoa. A luz o desfaz.",
  }),
  plateLizard: monster({
    kind: "plateLizard", name: "Lagarto-Couraça", rank: "common", type: "beast", role: "sentinel", cr: 8,
    hp: 270, damage: 19, xp: 180, loot: [14, 22], speed: 2.4, aggroRange: 5, attackRange: 1, attackCooldownMs: 1600, attackFx: "bite",
    // As placas de pedra seguram o corte; o sangue frio sofre com o gelo.
    elements: { physical: 0.7, ice: 1.4 },
    abilities: [
      { id: "plateRoll", name: "Rolada", shape: "leap", range: 5, minRange: 2, radius: 1, cooldownMs: 9000, power: 1.4, push: 1, color: 0x9a5a3a, fx: "leap" },
    ],
    lore: "Lagarto grande e baixo, coberto de placas da cor da rocha, que toma sol nos platôs. Enrola-se e rola em cima de quem chega (Rolada). A couraça segura o corte; o frio o deixa lento e fraco.",
  }),
  rustDevil: monster({
    kind: "rustDevil", name: "Redemoinho de Ferrugem", rank: "common", type: "elemental", role: "controller", cr: 8,
    hp: 230, damage: 17, xp: 180, loot: [14, 22], speed: 3, aggroRange: 6, attackRange: 1, attackCooldownMs: 1600, attackFx: "energy",
    elements: { physical: 0.8, ice: 1.3 },
    traits: { onHit: { chance: 0.4, corrode: 5000 } },
    abilities: [
      {
        id: "rustGust", name: "Poeira de Ferrugem", shape: "self", range: 2, radius: 2, cooldownMs: 10000, power: 0.9,
        effect: { kind: "blind", ms: 1300 }, color: 0xb0582a, fx: "quake",
      },
    ],
    lore: "Redemoinho de pó de ferro que o vento da cratera levanta e não deixa assentar. Gira em volta de quem passa, cega com a poeira e enferruja a armadura (corrói).",
  }),
  // Mini-bosses (os terreiros guardam o baú; nas emboscadas, 25% trazem um solto).
  deadForeman: monster({
    kind: "deadForeman", name: "Capataz Morto", rank: "miniboss", type: "undead", role: "leader", cr: 10,
    hp: 690, damage: 30, xp: 540, loot: [46, 66], speed: 2.7, aggroRange: 8, attackRange: 2, attackCooldownMs: 1500, attackFx: "slash",
    elements: { radiant: 1.3 },
    traits: { leader: { radius: 4, damage: 0.2, haste: 0.2 } },
    abilities: [
      {
        id: "foremanWhip", name: "Chicote", shape: "pull", range: 6, minRange: 2, radius: 0, cooldownMs: 8000, power: 0.9,
        dot: { kind: "bleed", power: 0.25, durationMs: 3000 }, color: 0x6e3e22, fx: "tongue",
      },
      {
        id: "foremanLash", name: "Chicotada em Roda", shape: "self", range: 2, radius: 2, cooldownMs: 7000, power: 1.5,
        dot: { kind: "bleed", power: 0.25, durationMs: 3000 }, color: 0x8a4a2a, fx: "rend",
      },
      {
        id: "minersCall", name: "Turno da Mina", shape: "summon", range: 7, radius: 0, cooldownMs: 22000, power: 0,
        summon: { kind: "lostMiner", count: 2 }, belowHp: 0.5, phase: true, color: 0x7a5a40, fx: "summon",
      },
    ],
    lore: "O capataz da mina, que desceu com a última turma e não deixou ninguém subir. Puxa com o chicote quem foge, estala em roda (sangra), faz os mineiros baterem mais forte e mais rápido (Comando) e, ferido, chama o turno.",
  }),
  oreGolem: monster({
    kind: "oreGolem", name: "Golem de Minério", rank: "miniboss", type: "construct", role: "sentinel", cr: 10,
    hp: 780, damage: 30, xp: 540, loot: [46, 66], speed: 1.8, aggroRange: 5, attackRange: 2, attackCooldownMs: 2000, attackFx: "smash",
    elements: { physical: 0.8, ice: 1.4 },
    traits: { absorb: ["fire"] },
    abilities: [
      {
        id: "seismicPunch", name: "Soco Sísmico", shape: "self", range: 2, radius: 2, cooldownMs: 10000, power: 1.3,
        effect: { kind: "stun", ms: 900 }, color: 0xb0582a, fx: "quake",
      },
      { id: "oreSlam", name: "Marretada de Minério", shape: "target", range: 2, radius: 1, cooldownMs: 7000, power: 1.7, push: 2, color: 0x8a5a44, fx: "slam" },
    ],
    lore: "Minério de ferro que a forja da mina juntou e pôs de pé para carregar o que os homens não aguentavam. O fogo o alimenta (absorve e cura); o gelo racha. O soco no chão atordoa em volta e a marretada joga longe.",
  }),
  hyenaMatriarch: monster({
    kind: "hyenaMatriarch", name: "Mãe-Hiena", rank: "miniboss", type: "beast", role: "leader", cr: 10,
    hp: 760, damage: 29, xp: 520, loot: [46, 66], speed: 3.6, aggroRange: 8, attackRange: 1, attackCooldownMs: 1400, attackFx: "bite",
    traits: { leader: { radius: 4, damage: 0.2, haste: 0.2 }, packTactics: 0.3 },
    abilities: [
      { id: "matriarchPounce", name: "Bote", shape: "leap", range: 6, minRange: 2, radius: 1, cooldownMs: 8000, power: 1.5, push: 1, color: 0x9a4a2a, fx: "leap" },
      {
        id: "matriarchMaul", name: "Dilacerar", shape: "self", range: 1, radius: 1, cooldownMs: 7000, power: 1.6,
        dot: { kind: "bleed", power: 0.25, durationMs: 3000 }, color: 0x8a2a1a, fx: "rend",
      },
      {
        id: "hyenaHowl", name: "Uivo", shape: "summon", range: 7, radius: 0, cooldownMs: 22000, power: 0,
        summon: { kind: "badlandsHyena", count: 2 }, belowHp: 0.6, phase: true, color: 0xb0582a, fx: "summon",
      },
    ],
    lore: "A hiena velha que manda nas matilhas do vale, do tamanho de um pônei e cheia de cicatrizes. Dá o bote em quem foge, dilacera quem fica (sangra), faz a matilha morder mais forte e mais rápido (Comando) e, ferida, uiva e chama mais duas.",
  }),
  // Boss: Kragmor, na cratera do crânio. O último boss do lado dos ermos.
  kragmor: monster({
    kind: "kragmor", name: "Kragmor, o Gigante da Cratera", rank: "boss", type: "giant", role: "brute", cr: 13,
    hp: 5200, damage: 50, xp: 5800, loot: [460, 680], speed: 2.3, aggroRange: 9, attackRange: 2, attackCooldownMs: 1800, attackFx: "smash",
    // A pele de pedra da cratera aguenta o fogo da forja; o gelo a racha.
    elements: { fire: 0.6, physical: 0.9, ice: 1.3 },
    traits: { frenzy: { belowHp: 0.3, haste: 0.3 } },
    abilities: [
      { id: "oreThrow", name: "Arremesso de Minério", shape: "target", range: 7, minRange: 3, radius: 1, cooldownMs: 9000, power: 1.5, color: 0x8a5a44, fx: "boulder" },
      {
        id: "caveIn", name: "Desabamento", shape: "self", range: 3, radius: 3, cooldownMs: 12000, power: 1.4,
        effect: { kind: "stun", ms: 900 }, color: 0x9a6a4a, fx: "quake",
      },
      {
        id: "mineCall", name: "Chamado da Mina", shape: "summon", range: 8, radius: 0, cooldownMs: 22000, power: 0,
        summon: { kind: "lostMiner", count: 2 }, belowHp: 0.7, phase: true, color: 0x7a5a40, fx: "summon",
      },
      {
        id: "craterLeap", name: "Salto da Cratera", shape: "leap", range: 7, minRange: 3, radius: 2, cooldownMs: 14000, power: 1.5,
        push: 1, belowHp: 0.5, color: 0xb0582a, fx: "leap",
      },
      {
        id: "forgeFury", name: "Fúria da Forja", shape: "self", range: 3, radius: 3, cooldownMs: 30000, power: 1.6, push: 2,
        dot: { kind: "burn", power: 0.3, durationMs: 3000 }, selfHeal: 0.12, belowHp: 0.3, phase: true, once: true, color: 0xff6a1a, fx: "emberRift",
      },
    ],
    lore: "O gigante que o império acorrentou para cavar a cratera e que ficou lá dentro quando ela desabou, com o martelo de forja e as correntes quebradas nos pulsos. Joga pedaços de minério em quem fica longe, faz o teto cair em volta (atordoa) e chama os mineiros; ferido, salta sobre quem foge, e quase vencido a forja dentro dele explode (queima, empurra e o cura).",
  }),
  // --- Pântano do Kosaradius: o clã do Rei-Ogro. Mais fracos que os da Cripta na base (o mapa tem 9 zonas e o ganho por
  // profundidade dobra os do fim), em bandos maiores: muito XP para quem joga sozinho. -----------------------
  orcScout: monster({
    kind: "orcScout", name: "Orc batedor", rank: "common", type: "humanoid", role: "skirmisher", cr: 1, group: [2, 3],
    hp: 22, damage: 3, xp: 22, loot: [1, 2], speed: 3.6, aggroRange: 6, attackRange: 1, attackCooldownMs: 1100, attackFx: "slash",
    traits: { hitAndRun: { cooldownMs: 4500 } },
    lore: "Moleque do clã, de faca e tanga. Anda em bando, fura e pula para trás antes do troco (Fuga Ágil).",
  }),
  orcGrunt: monster({
    kind: "orcGrunt", name: "Orc do Brejo", rank: "common", type: "humanoid", role: "brute", cr: 2,
    hp: 50, damage: 5, xp: 38, loot: [2, 4], speed: 3, aggroRange: 6, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    lore: "O guerreiro comum do clã: machadinha, escudo de tábua e nenhuma paciência.",
  }),
  orcSpearman: monster({
    kind: "orcSpearman", name: "Orc lanceiro", rank: "common", type: "humanoid", role: "sentinel", cr: 2,
    hp: 42, damage: 5, xp: 40, loot: [2, 4], speed: 3, aggroRange: 6, attackRange: 2, attackCooldownMs: 1500, attackFx: "slash",
    lore: "Lança comprida de pau de mangue: fura a 2 tiles, antes de o herói chegar perto.",
  }),
  orcArcher: monster({
    kind: "orcArcher", name: "Orc arqueiro", rank: "common", type: "humanoid", role: "artillery", cr: 2,
    hp: 28, damage: 5, xp: 34, loot: [2, 3], speed: 3, aggroRange: 7, attackRange: 5, attackCooldownMs: 1700, attackFx: "arrow",
    traits: { keepDistance: 3 },
    lore: "Arco curto de osso. Fica atrás dos outros e recua quando alguém chega perto.",
  }),
  orcShaman: monster({
    kind: "orcShaman", name: "Orc xamã", rank: "common", type: "humanoid", role: "controller", cr: 3,
    hp: 42, damage: 5, xp: 55, loot: [3, 5], speed: 2.8, aggroRange: 7, attackRange: 4, attackCooldownMs: 1800, attackFx: "nature",
    traits: { keepDistance: 2 },
    abilities: [
      {
        id: "mudGrip", name: "Lama Agarrada", shape: "bolt", range: 5, minRange: 2, radius: 0, cooldownMs: 8000, power: 0.4,
        effect: { kind: "root", ms: 1200 }, color: 0x7a8a2a, fx: "web",
      },
    ],
    lore: "Pinta o rosto com lama e caveira de sapo. Prende os pés do herói no brejo para os outros chegarem.",
  }),
  orcBerserker: monster({
    kind: "orcBerserker", name: "Orc berserker", rank: "common", type: "humanoid", role: "brute", cr: 3,
    hp: 72, damage: 7, xp: 62, loot: [3, 6], speed: 3.2, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    traits: { frenzy: { belowHp: 0.5, haste: 0.4 } },
    abilities: [
      { id: "aggressive", name: "Agressivo", shape: "leap", range: 5, minRange: 3, radius: 0, cooldownMs: 7000, power: 0, color: 0xc0392b, fx: "leap" },
    ],
    lore: "Dois machados e o corpo pintado de vermelho. Salta sobre a presa e, ferido, bate cada vez mais rápido (Rompante).",
  }),
  orcCaptain: monster({
    kind: "orcCaptain", name: "Orc capitão", rank: "common", type: "humanoid", role: "leader", cr: 3,
    hp: 68, damage: 6, xp: 60, loot: [4, 7], speed: 2.9, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    traits: { leader: { radius: 3, damage: 0.15, haste: 0.15 } },
    lore: "Elmo de ferro amassado e estandarte de caveira. Perto dele, os orcs batem mais forte e mais rápido (Comando).",
  }),
  ogreYoung: monster({
    kind: "ogreYoung", name: "Ogro jovem", rank: "common", type: "giant", role: "brute", cr: 4,
    hp: 120, damage: 9, xp: 95, loot: [5, 9], speed: 2.3, aggroRange: 5, attackRange: 1, attackCooldownMs: 1800, attackFx: "smash",
    abilities: [
      { id: "wallop", name: "Pancada", shape: "target", range: 1, radius: 0, cooldownMs: 7000, power: 1.8, push: 1, color: 0xa0522d, fx: "slam" },
    ],
    lore: "Ainda não tem barriga de rei, mas já tem o porrete. Lento, e cada pancada joga o herói para trás.",
  }),
  ogreBruiser: monster({
    kind: "ogreBruiser", name: "Ogro do Brejo", rank: "miniboss", type: "giant", role: "brute", cr: 5,
    hp: 230, damage: 15, xp: 220, loot: [12, 20], speed: 2.5, aggroRange: 5, attackRange: 1, attackCooldownMs: 1800, attackFx: "smash",
    abilities: [
      { id: "stomp", name: "Pisão Sísmico", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 1.8, slow: { factor: 0.5, durationMs: 2500 }, color: 0xb07a45, fx: "quake" },
      { id: "boulder", name: "Arremesso de Pedra", shape: "target", range: 6, minRange: 3, radius: 1, cooldownMs: 7000, power: 1.5, push: 1, color: 0x8d6e63, fx: "boulder" },
    ],
    lore: "Guarda o tesouro do clã numa clareira de troncos. De perto pisa, de longe arremessa pedra.",
  }),
  ogreShaman: monster({
    kind: "ogreShaman", name: "Ogro Xamã", rank: "miniboss", type: "giant", role: "controller", cr: 5,
    hp: 200, damage: 12, xp: 220, loot: [12, 20], speed: 2.4, aggroRange: 6, attackRange: 3, attackCooldownMs: 1700, attackFx: "nature",
    traits: { keepDistance: 2 },
    abilities: [
      { id: "clanCall", name: "Chamado do Clã", shape: "summon", range: 6, radius: 0, cooldownMs: 15000, power: 0, summon: { kind: "orcGrunt", count: 2 }, color: 0x9ccc65, fx: "summon" },
      {
        id: "bogCurse", name: "Maldição do Brejo", shape: "target", range: 5, radius: 1, cooldownMs: 8000, power: 1.3,
        slow: { factor: 0.6, durationMs: 3000 }, dot: { kind: "poison", power: 0.25, durationMs: 3000 }, color: 0x7a9a2a, fx: "acidRain",
      },
    ],
    lore: "Ogro velho de cajado com crânios. Chama orcs do clã para a briga e amaldiçoa o chão (lento e envenenado).",
  }),
  orcWarlord: monster({
    kind: "orcWarlord", name: "Chefe de Guerra Orc", rank: "miniboss", type: "humanoid", role: "leader", cr: 5,
    hp: 220, damage: 14, xp: 230, loot: [12, 20], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    traits: { leader: { radius: 3, damage: 0.2, haste: 0.15 } },
    abilities: [
      { id: "charge", name: "Investida", shape: "leap", range: 5, minRange: 2, radius: 1, cooldownMs: 8000, power: 1.2, color: 0xc0392b, fx: "leap" },
      { id: "whirl", name: "Golpe Giratório", shape: "self", range: 1, radius: 1, cooldownMs: 7000, power: 1.6, color: 0xd35400, fx: "slam" },
    ],
    lore: "Montanha de músculo com armadura de placas e cutelo de duas mãos. Investe, gira a lâmina em volta e comanda os orcs perto.",
  }),
  // --- Fortaleza Orc: o senhor do castelo tomado. O mais forte do jogo; o clã em volta bate mais perto dele (Comando).
  emberWarlord: monster({
    kind: "emberWarlord", name: "Vorgak, o Senhor da Brasa", rank: "boss", type: "humanoid", role: "leader", cr: 12,
    hp: 4400, damage: 46, xp: 5200, loot: [430, 640], speed: 2.4, aggroRange: 9, attackRange: 2, attackCooldownMs: 1700, attackFx: "smash",
    elements: { fire: 0.5, ice: 1.25 },
    traits: {
      leader: { radius: 4, damage: 0.2, haste: 0.15 },
      frenzy: { belowHp: 0.35, haste: 0.3 },
      onHit: { chance: 0.4, dot: { kind: "burn", power: 0.3, durationMs: 3000 } },
    },
    abilities: [
      {
        id: "fortressCall", name: "Chamado da Fortaleza", shape: "summon", range: 9, radius: 0, cooldownMs: 30000, power: 0,
        summon: { kind: "orcBerserker", count: 2 }, belowHp: 0.7, phase: true, once: true, color: 0xc0392b, fx: "summon",
      },
      // A guarda vem antes da Fúria: a Fúria cura e tiraria a vida de baixo dos 35% antes de os ogros saírem.
      {
        id: "ogreGuard", name: "Guarda de Ogros", shape: "summon", range: 9, radius: 0, cooldownMs: 30000, power: 0,
        summon: { kind: "ogreYoung", count: 2 }, belowHp: 0.35, phase: true, once: true, color: 0xa0522d, fx: "summon",
      },
      {
        id: "emberFury", name: "Fúria de Brasa", shape: "self", range: 3, radius: 3, cooldownMs: 30000, power: 1.8, push: 2,
        dot: { kind: "burn", power: 0.3, durationMs: 3000 }, selfHeal: 0.12, belowHp: 0.35, phase: true, once: true, color: 0xff5a14, fx: "emberRift",
      },
      {
        id: "warlordLeap", name: "Salto do Senhor da Guerra", shape: "leap", range: 7, minRange: 3, radius: 2, cooldownMs: 12000, power: 1.4,
        effect: { kind: "stun", ms: 900 }, color: 0xe67e22, fx: "leap",
      },
      {
        id: "emberRift", name: "Fenda de Brasa", shape: "line", range: 6, radius: 0, length: 6, cooldownMs: 9000, power: 1.7,
        dot: { kind: "burn", power: 0.35, durationMs: 4000 }, color: 0xff6a1a, fx: "emberRift",
      },
      {
        id: "ironHook", name: "Gancho de Ferro", shape: "pull", range: 6, minRange: 3, radius: 0, cooldownMs: 11000, power: 0.5,
        color: 0x9aa0a8, fx: "tongue",
      },
    ],
    lore: "Tomou o castelo do Império e fez do salão do trono a forja do clã. Racha o chão com o Cutelo de Brasa (Fenda de Brasa), salta sobre quem foge, puxa com o gancho da corrente, e perto dele os orcs batem mais forte (Comando). Ferido, chama a guarda e explode em brasa.",
  }),
  ogreKing: monster({
    kind: "ogreKing", name: "Grumak, o Rei-Ogro", rank: "boss", type: "giant", role: "brute", cr: 6,
    hp: 894, damage: 21, xp: 707, loot: [62, 104], speed: 2.4, aggroRange: 7, attackRange: 2, attackCooldownMs: 1700, attackFx: "smash",
    traits: { frenzy: { belowHp: 0.3, haste: 0.35 } },
    abilities: [
      {
        id: "kingRoar", name: "Rugido do Rei", shape: "summon", range: 8, radius: 0, cooldownMs: 30000, power: 0, summon: { kind: "orcGrunt", count: 2 },
        belowHp: 0.5, phase: true, once: true, color: 0xe6b422, fx: "summon",
      },
      {
        id: "crush", name: "Esmagar", shape: "target", range: 2, radius: 0, cooldownMs: 11000, power: 2.2,
        effect: { kind: "stun", ms: 1000 }, color: 0x8d5524, fx: "slam",
      },
      { id: "swampStomp", name: "Pisão do Pântano", shape: "self", range: 2, radius: 2, cooldownMs: 8000, power: 1.6, slow: { factor: 0.5, durationMs: 2500 }, color: 0x6b8e23, fx: "quake" },
      { id: "kingCharge", name: "Investida do Rei", shape: "leap", range: 6, minRange: 3, radius: 1, cooldownMs: 9000, power: 1.3, push: 1, color: 0xc0392b, fx: "leap" },
      { id: "logThrow", name: "Tronco Arremessado", shape: "target", range: 6, minRange: 3, radius: 1, cooldownMs: 10000, power: 1.5, push: 1, color: 0x6d4c41, fx: "boulder" },
    ],
    lore: "Rei do clã do brejo, coroa de ferro torta e um tronco inteiro de porrete. Esmaga e atordoa, pisa o chão em volta, investe e arremessa troncos; com metade da vida, ruge e chama a guarda, e quase morto bate em frenesi.",
  }),
};

/**
 * Afixos dos Campeões: monstro comum que nasce mais forte (`CHAMPION_CHANCE` em `maps.ts`), com nome e contorno
 * dourados, vida × `CHAMPION_HP` e XP e loot × `CHAMPION_REWARD`, mais um afixo.
 */
export type ChampionAffix = "swift" | "vampiric" | "fiery" | "shielded" | "commander";
export const CHAMPION_AFFIXES: Record<ChampionAffix, {
  name: string;
  /** Velocidade × este valor. */
  speed?: number;
  traits?: MonsterTraits;
  /** Multiplicador de dano recebido por elemento. */
  elements?: Partial<Record<DamageElement, number>>;
}> = {
  swift: { name: "Veloz", speed: 1.4 },
  vampiric: { name: "Vampírico", traits: { onHit: { lifesteal: 0.3 } } },
  fiery: { name: "Ígneo", traits: { onHit: { dot: { kind: "burn", power: 0.3, durationMs: 3000 } } } },
  shielded: { name: "Escudado", elements: { physical: 0.5 } },
  commander: { name: "Comandante", traits: { leader: { radius: 3, damage: 0.15, haste: 0.15 } } },
};
export const CHAMPION_AFFIX_IDS = Object.keys(CHAMPION_AFFIXES) as ChampionAffix[];
export const CHAMPION_HP = 2;
export const CHAMPION_REWARD = 2.5;

/** Abaixo desta fração da vida, o boss se enfurece e usa as habilidades mais vezes. */
export const ENRAGE_HP = 0.5;
/** Multiplicador da recarga das habilidades com o boss enfurecido. */
export const ENRAGE_COOLDOWN = 0.6;
/** A primeira habilidade só sai depois desta fração da recarga, contada de quando o monstro nota alguém. */
export const SPECIAL_FIRST_DELAY = 0.5;

/** Multiplicador do dano de `element` num monstro (tipo de criatura e o próprio monstro). */
export function elementMultiplier(kind: MonsterKind, element: DamageElement) {
  const def = MONSTERS[kind];
  return (def.elements?.[element] ?? 1) * (CREATURE_TYPES[def.type].elements?.[element] ?? 1);
}

/** O monstro não pega este dano contínuo (morto-vivo não envenena nem sangra). */
export function immuneToDot(kind: MonsterKind, dot: DotKind) {
  return CREATURE_TYPES[MONSTERS[kind].type].immuneDots?.includes(dot) ?? false;
}

/** Faixa de vida e de dano por segundo do Nível de Desafio (seção 4.1 do plano do Bestiário). */
export function crStats(cr: number) {
  return { hp: 25 * 1.55 ** (cr - 1), dps: 2.5 * 1.35 ** (cr - 1) };
}

/**
 * Tiles atingidos por uma habilidade de monstro em (x, y) mirando (tx, ty), na ordem do centro para fora. Paredes, o
 * que estiver atrás delas (sem linha de visão do centro) e o tile do monstro ficam de fora. `leap` e `dive` usam
 * (tx, ty) como o ponto onde o monstro cai.
 */
export function abilityTiles(dungeon: Dungeon, ability: MonsterAbility, x: number, y: number, tx: number, ty: number) {
  const tiles: { x: number; y: number }[] = [];
  const add = (cx: number, cy: number, tileX: number, tileY: number) => {
    // O próprio monstro não se acerta.
    if (tileX === x && tileY === y) return;
    if (blocksSight(dungeon, tileX, tileY) || !hasLineOfSight(dungeon, cx, cy, tileX, tileY)) return;
    tiles.push({ x: tileX, y: tileY });
  };
  switch (ability.shape) {
    case "line": {
      const len = Math.hypot(tx - x, ty - y) || 1;
      const dx = (tx - x) / len;
      const dy = (ty - y) / len;
      const reach = ability.length ?? 1;
      const box = reach + ability.radius;
      const hits: { x: number; y: number; along: number }[] = [];
      for (let oy = -box; oy <= box; oy++) {
        for (let ox = -box; ox <= box; ox++) {
          const along = ox * dx + oy * dy;
          if (along < 0.5 || along > reach + 0.5 || Math.abs(ox * dy - oy * dx) > ability.radius + 0.5) continue;
          hits.push({ x: x + ox, y: y + oy, along });
        }
      }
      // Do monstro para fora, para o efeito correr pela faixa.
      hits.sort((a, b) => a.along - b.along);
      for (const h of hits) add(x, y, h.x, h.y);
      return tiles;
    }
    case "cone":
      return coneTiles(dungeon, x, y, tx, ty, ability.length ?? 1)
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    case "bolt":
    case "pull":
      return [{ x: tx, y: ty }];
    case "vanish":
    case "summon":
      return [];
  }
  // Área: em volta do monstro (`self`), do alvo (`target`) ou de onde cai (`leap`, `dive`).
  const cx = ability.shape === "self" ? x : tx;
  const cy = ability.shape === "self" ? y : ty;
  for (let r = 0; r <= ability.radius; r++) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
        add(cx, cy, cx + ox, cy + oy);
      }
    }
  }
  return tiles;
}

/**
 * Gold a mais do baú por sala de profundidade (+12% por sala). Só os baús (e o Mímico, que guarda o baú) pagam mais
 * no fundo: os monstros não ficam mais fortes com a profundidade (ver `monsterStats` e `CROWD_PER_DEPTH`).
 */
export const CHEST_DEPTH_SCALING = 0.12;

/** Bônus de loot do baú das salas laterais (liberado ao matar o mini-boss). */
export const CHEST_LOOT: [number, number] = [30, 55];

/** Fração extra de loot ao concluir a dungeon pelo portal do boss. */
export const BOSS_LOOT_BONUS = 0.5;

/** Dano extra dos monstros comuns (mini-bosses e bosses ficam de fora). */
export const COMMON_DAMAGE_BONUS = 0.2;

/** Vida extra dos monstros comuns (mini-bosses e bosses ficam de fora). */
export const COMMON_HP_BONUS = 0.25;

export interface MonsterStats {
  maxHp: number;
  damage: number;
  xp: number;
  loot: [number, number];
}

/**
 * Atributos de um monstro. São sempre os mesmos durante a partida, em qualquer sala: a dificuldade cresce para o fundo
 * do mapa com espécies mais fortes e mais monstros por sala (`CROWD_PER_DEPTH`), nunca com o mesmo monstro mais forte.
 * `power` é o multiplicador fixo do mapa (`monsterPower`: `MapDef.minibossPower` e `commonPower`; padrão 1).
 */
export function monsterStats(kind: MonsterKind, power = 1): MonsterStats {
  const m = MONSTERS[kind];
  const common = m.rank === "common";
  const hit = common ? 1 + COMMON_DAMAGE_BONUS : 1;
  const life = common ? 1 + COMMON_HP_BONUS : 1;
  return {
    maxHp: Math.round(m.hp * power * life),
    damage: Math.round(m.damage * power * hit),
    xp: Math.round(m.xp * power),
    loot: [Math.round(m.loot[0] * power), Math.round(m.loot[1] * power)],
  };
}

/** Parte de cada herói da equipe na XP e no gold de uma morte ou baú: partes iguais (100 com 4 heróis dão 25 a cada um). */
export function teamShare(total: number, team: number): number {
  if (team <= 0) return 0;
  return Math.max(1, Math.round(total / team));
}
