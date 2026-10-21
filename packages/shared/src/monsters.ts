import { blocksSight, hasLineOfSight, type Dungeon } from "./dungeon.ts";
import type { AttackFx } from "./messages.ts";

export type MonsterKind =
  // Cripta (dificuldade 1)
  | "rat" | "goblin" | "skeleton" | "orc" | "ogre" | "dragon"
  // Pântano das Ruínas (dificuldade 2)
  | "frog" | "moccasin" | "bogBody" | "naga" | "troll" | "hydra";

export type MonsterRank = "common" | "miniboss" | "boss";

/**
 * Onde a habilidade especial acerta:
 * - `target`: área em volta do tile do alvo (`radius` 0 = só o tile dele);
 * - `self`: área em volta do próprio monstro;
 * - `line`: faixa reta do monstro na direção do alvo, `length` tiles, `radius` tiles para cada lado.
 */
export type SpecialShape = "target" | "self" | "line";

/**
 * Habilidade especial de um monstro: um golpe mais forte que o ataque básico, com aviso.
 * O monstro para, os tiles atingidos acendem no chão por `windupMs` e só então o golpe sai:
 * quem sair da área a tempo escapa. Atordoar o monstro durante o aviso cancela a habilidade.
 */
export interface MonsterSpecial {
  name: string;
  shape: SpecialShape;
  /** Distância máxima (tiles, Chebyshev) até o alvo para usar. */
  range: number;
  radius: number;
  /** Comprimento da faixa (só `line`). */
  length?: number;
  /** Tempo de aviso antes do golpe. */
  windupMs: number;
  cooldownMs: number;
  /** Multiplicador do dano do monstro. */
  power: number;
  /** Dano por segundo depois do golpe (veneno ou queimadura), em fração do dano do monstro. */
  dot?: { kind: DotKind; power: number; durationMs: number };
  /** Deixa quem foi atingido mais lento (`factor` = fração da velocidade que sobra). */
  slow?: { factor: number; durationMs: number };
  /** Puxa o alvo atingido para o lado do monstro (língua do sapo). */
  pull?: boolean;
  /** Cura o monstro nesta fração da vida máxima quando o golpe sai. */
  selfHeal?: number;
  /** Cor do aviso e do efeito. */
  color: number;
}

export type DotKind = "poison" | "burn";

export interface MonsterDef {
  kind: MonsterKind;
  name: string;
  rank: MonsterRank;
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
  /** Forma e cor provisórias até termos sprites. */
  shape: "circle" | "square" | "diamond" | "triangle";
  color: number;
  /** Escala do desenho em relação a um tile. */
  size: number;
  /** Ataque extra, mais forte, com aviso no chão (ver `MonsterSpecial`). */
  special: MonsterSpecial;
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  rat: {
    kind: "rat", name: "Ratazana", rank: "common", shape: "circle", color: 0x8d7b68, size: 0.5,
    hp: 25, damage: 3, xp: 20, loot: [1, 2], speed: 2.5, aggroRange: 5, attackRange: 1, attackCooldownMs: 1200, attackFx: "bite",
    special: { name: "Mordida Pestilenta", shape: "target", range: 1, radius: 0, windupMs: 650, cooldownMs: 9000, power: 1.5, dot: { kind: "poison", power: 0.3, durationMs: 4000 }, color: 0x9acd32 },
  },
  goblin: {
    kind: "goblin", name: "Goblin", rank: "common", shape: "triangle", color: 0x6ab04c, size: 0.6,
    hp: 45, damage: 5, xp: 35, loot: [2, 4], speed: 3, aggroRange: 6, attackRange: 1, attackCooldownMs: 1200, attackFx: "slash",
    special: { name: "Bomba de Pólvora", shape: "target", range: 4, radius: 1, windupMs: 1100, cooldownMs: 10000, power: 1.7, color: 0xe67e22 },
  },
  skeleton: {
    kind: "skeleton", name: "Esqueleto", rank: "common", shape: "diamond", color: 0xdcdde1, size: 0.65,
    hp: 70, damage: 7, xp: 55, loot: [3, 6], speed: 2.8, aggroRange: 6, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    special: { name: "Lança de Ossos", shape: "line", range: 4, radius: 0, length: 4, windupMs: 850, cooldownMs: 9000, power: 1.8, color: 0xecf0f1 },
  },
  orc: {
    kind: "orc", name: "Orc guerreiro", rank: "common", shape: "square", color: 0x4b6584, size: 0.7,
    hp: 110, damage: 9, xp: 85, loot: [5, 9], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1400, attackFx: "slash",
    special: { name: "Machado Giratório", shape: "self", range: 1, radius: 1, windupMs: 900, cooldownMs: 9000, power: 1.9, color: 0xc0392b },
  },
  ogre: {
    kind: "ogre", name: "Ogro", rank: "miniboss", shape: "square", color: 0xa0522d, size: 0.9,
    hp: 260, damage: 14, xp: 220, loot: [12, 20], speed: 2.6, aggroRange: 5, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    special: { name: "Pisão Sísmico", shape: "self", range: 2, radius: 2, windupMs: 1200, cooldownMs: 8000, power: 2.1, slow: { factor: 0.5, durationMs: 3000 }, color: 0xb07a45 },
  },
  dragon: {
    kind: "dragon", name: "Dragão jovem", rank: "boss", shape: "diamond", color: 0xb33939, size: 1.4,
    hp: 900, damage: 24, xp: 700, loot: [60, 100], speed: 2.4, aggroRange: 8, attackRange: 2, attackCooldownMs: 1500, attackFx: "fire",
    special: { name: "Sopro Infernal", shape: "line", range: 6, radius: 1, length: 6, windupMs: 1300, cooldownMs: 7000, power: 1.9, dot: { kind: "burn", power: 0.25, durationMs: 4000 }, color: 0xff6b1a },
  },
  // Pântano: mais vida e dano que os equivalentes da cripta, e loot maior.
  frog: {
    kind: "frog", name: "Sapo gigante", rank: "common", shape: "circle", color: 0x4caf50, size: 0.55,
    hp: 50, damage: 5, xp: 40, loot: [2, 4], speed: 3.2, aggroRange: 6, attackRange: 1, attackCooldownMs: 1100, attackFx: "bite",
    special: { name: "Língua Grudenta", shape: "target", range: 4, radius: 0, windupMs: 750, cooldownMs: 9000, power: 1.4, pull: true, color: 0xff8fa3 },
  },
  moccasin: {
    kind: "moccasin", name: "Cobra-d'água", rank: "common", shape: "triangle", color: 0x8d5a3b, size: 0.55,
    hp: 70, damage: 8, xp: 55, loot: [3, 6], speed: 3.4, aggroRange: 6, attackRange: 1, attackCooldownMs: 1000, attackFx: "bite",
    special: { name: "Bote Venenoso", shape: "target", range: 2, radius: 0, windupMs: 550, cooldownMs: 8000, power: 1.4, dot: { kind: "poison", power: 0.4, durationMs: 5000 }, color: 0x7bed9f },
  },
  bogBody: {
    kind: "bogBody", name: "Afogado", rank: "common", shape: "diamond", color: 0x556b2f, size: 0.7,
    hp: 120, damage: 11, xp: 85, loot: [5, 9], speed: 2.6, aggroRange: 6, attackRange: 1, attackCooldownMs: 1400, attackFx: "smash",
    special: { name: "Lodo Sufocante", shape: "target", range: 4, radius: 1, windupMs: 1100, cooldownMs: 10000, power: 1.5, slow: { factor: 0.55, durationMs: 3000 }, color: 0x8b7d4a },
  },
  naga: {
    kind: "naga", name: "Naga guerreira", rank: "common", shape: "square", color: 0x9aa0a6, size: 0.7,
    hp: 160, damage: 13, xp: 120, loot: [7, 12], speed: 3, aggroRange: 7, attackRange: 1, attackCooldownMs: 1300, attackFx: "slash",
    special: { name: "Tridente das Marés", shape: "line", range: 4, radius: 0, length: 4, windupMs: 850, cooldownMs: 8000, power: 1.9, color: 0x48dbfb },
  },
  troll: {
    kind: "troll", name: "Troll do brejo", rank: "miniboss", shape: "square", color: 0x2e4a7d, size: 0.95,
    hp: 520, damage: 20, xp: 400, loot: [24, 36], speed: 2.8, aggroRange: 5, attackRange: 1, attackCooldownMs: 1600, attackFx: "smash",
    special: { name: "Fúria Regenerante", shape: "self", range: 1, radius: 1, windupMs: 1000, cooldownMs: 8000, power: 2.0, selfHeal: 0.08, color: 0x2ecc71 },
  },
  hydra: {
    kind: "hydra", name: "Hidra do pântano", rank: "boss", shape: "diamond", color: 0x2e8b57, size: 1.4,
    hp: 1600, damage: 28, xp: 1300, loot: [120, 180], speed: 2.2, aggroRange: 9, attackRange: 2, attackCooldownMs: 1500, attackFx: "bite",
    special: { name: "Chuva Ácida", shape: "target", range: 7, radius: 2, windupMs: 1300, cooldownMs: 7000, power: 1.7, dot: { kind: "poison", power: 0.25, durationMs: 5000 }, color: 0xa3e635 },
  },
};

/** Abaixo desta fração da vida, o boss se enfurece e usa a habilidade especial mais vezes. */
export const ENRAGE_HP = 0.5;
/** Multiplicador da recarga da habilidade especial com o boss enfurecido. */
export const ENRAGE_COOLDOWN = 0.6;
/** A primeira habilidade especial só sai depois desta fração da recarga, contada de quando o monstro nota alguém. */
export const SPECIAL_FIRST_DELAY = 0.5;

/**
 * Tiles atingidos pela habilidade especial de um monstro em (x, y) mirando (tx, ty), na ordem do centro
 * para fora. Paredes, o que estiver atrás delas (sem linha de visão do centro) e o tile do monstro ficam de fora.
 */
export function specialTiles(dungeon: Dungeon, special: MonsterSpecial, x: number, y: number, tx: number, ty: number) {
  const tiles: { x: number; y: number }[] = [];
  const add = (cx: number, cy: number, tileX: number, tileY: number) => {
    // O próprio monstro não se acerta.
    if (tileX === x && tileY === y) return;
    if (blocksSight(dungeon, tileX, tileY) || !hasLineOfSight(dungeon, cx, cy, tileX, tileY)) return;
    tiles.push({ x: tileX, y: tileY });
  };
  if (special.shape === "line") {
    const len = Math.hypot(tx - x, ty - y) || 1;
    const dx = (tx - x) / len;
    const dy = (ty - y) / len;
    const reach = special.length ?? 1;
    const box = reach + special.radius;
    const hits: { x: number; y: number; along: number }[] = [];
    for (let oy = -box; oy <= box; oy++) {
      for (let ox = -box; ox <= box; ox++) {
        const along = ox * dx + oy * dy;
        if (along < 0.5 || along > reach + 0.5 || Math.abs(ox * dy - oy * dx) > special.radius + 0.5) continue;
        hits.push({ x: x + ox, y: y + oy, along });
      }
    }
    // Do monstro para fora, para o efeito correr pela faixa.
    hits.sort((a, b) => a.along - b.along);
    for (const h of hits) add(x, y, h.x, h.y);
    return tiles;
  }
  const cx = special.shape === "self" ? x : tx;
  const cy = special.shape === "self" ? y : ty;
  for (let r = 0; r <= special.radius; r++) {
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
  return {
    maxHp: Math.round(m.hp * k),
    damage: Math.round(m.damage * k),
    xp: Math.round(m.xp * k),
    loot: [Math.round(m.loot[0] * k), Math.round(m.loot[1] * k)],
  };
}

/** XP que cada participante recebe pela morte de um monstro. */
export function xpShare(totalXp: number, participants: number): number {
  if (participants <= 0) return 0;
  return Math.max(1, Math.round((totalXp * (1 + PARTY_XP_BONUS * (participants - 1))) / participants));
}
