import { ITEMS, type ClassId, type ItemDef, type ItemSlot } from "@kusa/shared";
import type { Outfit } from "../outfit.ts";
import { drawFigure, type Figure, type Held, type Wear } from "./compose.ts";
import { armorWear, bootsWear, gauntletOf, legsWear } from "./gear.ts";
import { headCover, helmetWear } from "./headgear.ts";
import { classSkin, classWear } from "./look.ts";
import { pose, type HeroDir } from "./rig.ts";
import { legendMap, legendWear } from "./legend.ts";
import { magicRemap, magicWear } from "./magic.ts";
import { shieldHeld } from "./shields.ts";
import { classWeapon, weaponArt } from "./weapons.ts";

/** Item vestido no slot (ou nada, se o id não é desse slot). */
function worn(outfit: Outfit, slot: ItemSlot) {
  const item = ITEMS[outfit[slot]];
  return item?.slot === slot ? item : undefined;
}

/**
 * Monta a figura: corpo da classe por baixo, depois calça, botas, armadura e capacete, e por cima o que
 * identifica a classe (aljava, faixa, broche). O desenho de cada item não depende da classe.
 */
export function heroFigure(classId: ClassId, outfit: Outfit): Figure {
  const weaponItem = worn(outfit, "weapon");
  const helmet = worn(outfit, "helmet");
  const armor = worn(outfit, "armor");
  const legs = worn(outfit, "legs");
  const boots = worn(outfit, "boots");
  const shield = worn(outfit, "shield");
  const { base, extras } = classWear(classId);
  // Item mágico: o mesmo desenho do nível com os materiais e o enfeite dele. Lendário: o mágico repintado.
  const legend = <T extends Wear | Held>(item: ItemDef, art: T) => (item.legend ? legendWear(item.legend, art) : art);
  const dress = <T extends Wear | Held>(item: ItemDef, art: T) =>
    (item.rarity === "magic" || item.rarity === "legendary" ? legend(item, magicWear(item.family, item.tier, art)) : art);
  const wears: Wear[] = [base];
  if (legs) wears.push(dress(legs, legsWear(legs.family, legs.tier)));
  if (boots) wears.push(dress(boots, bootsWear(boots.tier)));
  if (armor) wears.push(dress(armor, armorWear(armor.family, armor.tier)));
  if (helmet) wears.push(dress(helmet, helmetWear(helmet.family, helmet.tier)));
  if (extras) wears.push(extras);
  const weapon = weaponItem
    ? legend(weaponItem, weaponArt(weaponItem.family, weaponItem.tier, weaponItem.rarity !== "common" && weaponItem.rarity !== "rare"))
    : classWeapon(classId);
  const gauntlet = armor && gauntletOf(armor.family, armor.tier);
  const magicMat = gauntlet && armor && armor.rarity !== "common" && armor.rarity !== "rare" ? magicRemap(armor.family, armor.tier)?.get(gauntlet) ?? gauntlet : gauntlet;
  const gauntletMat = magicMat && armor?.legend ? legendMap(armor.legend).get(magicMat) ?? magicMat : magicMat;
  return {
    wears,
    weapon,
    shield: shield ? dress(shield, shieldHeld(shield.tier)) : undefined,
    melee: weapon.melee,
    helmet: helmet ? headCover(helmet.family, helmet.tier) : null,
    robe: armor?.family === "armor-arcane",
    skin: gauntletMat ?? classSkin(classId),
  };
}

/** Um quadro 48×48 (RGBA) da classe vestindo `outfit`. */
export function heroFrame(classId: ClassId, outfit: Outfit, dir: HeroDir, frame: number): Uint8ClampedArray {
  const figure = heroFigure(classId, outfit);
  const weapon = weaponItemArt(classId, outfit);
  // Arma corpo a corpo com escudo: de lado, o braço de lá empunha a arma e o de cá segura o escudo.
  const hold = weapon.melee && figure.shield ? "guard" : weapon.hold;
  return drawFigure(pose(dir, frame, hold), figure).resolve();
}

function weaponItemArt(classId: ClassId, outfit: Outfit) {
  const item = worn(outfit, "weapon");
  return item ? weaponArt(item.family, item.tier) : classWeapon(classId);
}
