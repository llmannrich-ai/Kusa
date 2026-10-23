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
  | "greenHag" | "hagIllusion" | "spiritNaga" | "blackDragon"
  // Mar de Areia (dificuldade 1)
  | "sandScorpion" | "giantVulture" | "mummy" | "sandWorm";

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
  | "engulf" | "summon" | "vanish" | "slam" | "spit" | "lightning";

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
    hp: 900, damage: 24, xp: 700, loot: [60, 100], speed: 2.4, aggroRange: 8, attackRange: 2, attackCooldownMs: 1500, attackFx: "fire",
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
  sandWorm: monster({
    kind: "sandWorm", name: "Verme da Areia", rank: "boss", type: "monstrosity", role: "lurker", cr: 6,
    hp: 780, damage: 22, xp: 700, loot: [60, 100], speed: 2.2, aggroRange: 7, attackRange: 1, attackCooldownMs: 1600, attackFx: "bite",
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

/** Ganho de HP, dano, XP e loot por sala de profundidade (+12% por sala). */
export const DEPTH_SCALING = 0.12;

/** Bônus de loot do baú das salas laterais (liberado ao matar o mini-boss). */
export const CHEST_LOOT: [number, number] = [30, 55];

/** Fração extra de loot ao concluir a dungeon pelo portal do boss. */
export const BOSS_LOOT_BONUS = 0.5;

/** Dano extra dos monstros comuns (mini-bosses e bosses ficam de fora). */
export const COMMON_DAMAGE_BONUS = 0.2;

/** Vida extra dos monstros comuns (mini-bosses e bosses ficam de fora). */
export const COMMON_HP_BONUS = 0.25;

/** XP extra por participante além do primeiro, antes da divisão (incentiva jogar em equipe). */
export const PARTY_XP_BONUS = 0.2;

export interface MonsterStats {
  maxHp: number;
  damage: number;
  xp: number;
  loot: [number, number];
}

/** Atributos de um monstro numa profundidade (0 = primeira sala depois da entrada). */
export function monsterStats(kind: MonsterKind, depth: number): MonsterStats {
  const m = MONSTERS[kind];
  const k = 1 + DEPTH_SCALING * Math.max(0, depth);
  const common = m.rank === "common";
  const hit = common ? 1 + COMMON_DAMAGE_BONUS : 1;
  const life = common ? 1 + COMMON_HP_BONUS : 1;
  return {
    maxHp: Math.round(m.hp * k * life),
    damage: Math.round(m.damage * k * hit),
    xp: Math.round(m.xp * k),
    loot: [Math.round(m.loot[0] * k), Math.round(m.loot[1] * k)],
  };
}

/** XP que cada participante recebe pela morte de um monstro. */
export function xpShare(totalXp: number, participants: number): number {
  if (participants <= 0) return 0;
  return Math.max(1, Math.round((totalXp * (1 + PARTY_XP_BONUS * (participants - 1))) / participants));
}
