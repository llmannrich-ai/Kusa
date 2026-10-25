import { COMMON_DROP_CHANCE, GUARANTEED_DROPS, RARITY_CHANCES } from "./items.ts";
import { LOOT_SCALE, type MapDef } from "./maps.ts";
import { MONSTERS, monsterStats, type MonsterKind } from "./monsters.ts";
import { COMMON_POTION_CHANCE, GUARANTEED_POTIONS } from "./potions.ts";
import { RUNE_DROPS } from "./runes.ts";

// O que cada monstro larga ao morrer, em números, para o Catálogo (Configurações > Catálogo).
// Repete a conta de `Hunt.killMonster` e `Hunt.chestReward` (apps/server/src/hunt.ts): o teste `catalogo`
// mata monstros na arena e confere que as chances daqui batem com as da hunt. Mudou uma, mude a outra.

export interface DropOdds {
  /** Gold do monstro na primeira sala (a equipe divide). */
  gold: [number, number];
  /** Sorteios de item de equipamento e a chance de cada um sair. */
  items: number;
  itemChance: number;
  /** Chance de cada item sair raro ou mágico (o resto é comum). */
  rarity: { rare: number; magic: number };
  /** Sorteios de poção e a chance de cada um sair. */
  potions: number;
  potionChance: number;
  /** Runas que cada herói recebe direto na bag (uma vez por boss e personagem). */
  runes: number;
  /** Guarda o loot de um baú (o Mímico): mais gold, um item garantido e uma chance de cada poção. */
  chest: boolean;
  /** Não rende nada: ilusão ou monstro que só aparece chamado por outro. */
  nothing: boolean;
}

/** Chance de um drop sair no mapa (`MapDef.dropScale` vezes `extra`), como `Hunt.keepDrop`. */
function keep(map: MapDef, extra = 1) {
  return Math.min(1, (map.dropScale ?? 1) * extra);
}

/** Monstros que só nascem chamados por outro (Chamado do Clã, cópias da Bruxa Verde): não rendem XP, loot nem item. */
export function summonedOnly(map: MapDef, kind: MonsterKind) {
  const spawned = map.encounters.some((e) => e.table.some(([k]) => k === kind))
    || map.minibosses.some(([k]) => k === kind) || map.bosses.some(([k]) => k === kind)
    || (kind === "mimic" && map.mimicChance > 0);
  return !spawned;
}

/** O que `kind` larga ao morrer em `map`, com equipe só de humanos (com bots, os itens caem menos). */
export function dropOdds(map: MapDef, kind: MonsterKind): DropOdds {
  const def = MONSTERS[kind];
  const boss = def.rank === "boss";
  const nothing = !!def.traits?.illusion || summonedOnly(map, kind);
  const scale = LOOT_SCALE * (boss ? 1 : map.lootScale ?? 1);
  const [min, max] = monsterStats(kind, 0).loot;
  const guaranteed = GUARANTEED_DROPS[def.rank];
  const potions = GUARANTEED_POTIONS[def.rank];
  return {
    gold: nothing ? [0, 0] : [Math.round(min * scale), Math.round(max * scale)],
    items: nothing ? 0 : guaranteed || 1,
    itemChance: (guaranteed ? 1 : COMMON_DROP_CHANCE) * (boss ? 1 : keep(map, LOOT_SCALE)),
    rarity: RARITY_CHANCES[def.rank],
    potions: nothing ? 0 : potions || 1,
    potionChance: (potions ? 1 : COMMON_POTION_CHANCE) * (boss ? 1 : keep(map)),
    runes: nothing || map.rewardRunes ? 0 : RUNE_DROPS[def.rank],
    chest: !nothing && kind === "mimic",
    nothing,
  };
}

/** Chance de cada poção do baú (uma de vida e uma de mana) sair no mapa. */
export function chestPotionChance(map: MapDef) {
  return keep(map);
}
