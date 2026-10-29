import { ITEMS } from "@kusa/shared";
import { loadSettings } from "../settings.ts";

/**
 * Arte nova (beta, `Settings.newArt`, `docs/ARTE_TIBIA.md`): lida uma vez; trocar a opção recarrega o jogo. Os
 * desenhos novos só são baixados por quem ligou a opção.
 */
export const NEW_ART = loadSettings().newArt;
export const protoHero = NEW_ART ? await import("./proto/tibiaHero.ts") : null;
export const protoCrypt = NEW_ART ? await import("./proto/crypt.ts") : null;
export const protoBeasts = NEW_ART ? await import("./proto/beasts.ts") : null;
/** O goblin desenhado a partir da arte de referência (`docs/arte/goblin-referencia.png`), não por código. */
export const protoGoblin = NEW_ART ? await (await import("./proto/goblinArt.ts")).loadGoblin() : null;
/** Chão do Pântano das Ruínas feito com as imagens do agente de arte (`docs/arte/pantano-das-ruinas/`). */
export const protoSwamp = NEW_ART ? await (await import("./proto/swampHd.ts")).loadSwampHd() : null;
/** Família de cada item do jogo no desenho novo (o id do protótipo é `<família>-<nível>`, `-magic` no mágico). */
const PROTO_FAMILY: Record<string, string> = {
  "weapon-sword": "sword", "weapon-axe": "axe", "weapon-bow": "bow", "weapon-crossbow": "xbow", "weapon-wand": "wand", "weapon-staff": "staff",
  "helmet-war": "war", "helmet-arcane": "arc", "armor-war": "armor", "armor-arcane": "robe", "legs-war": "greave", "legs-arcane": "pants",
  "boots-boots": "boots", "shield-shield": "shield",
};

/** O item do jogo no desenho novo (o raro usa o desenho do comum: o "+1" fica só no nome). */
export function protoItemOf(itemId: string): string | undefined {
  const def = ITEMS[itemId];
  const family = def && PROTO_FAMILY[def.family];
  return family && `${family}-${def.tier}${def.rarity === "magic" ? "-magic" : ""}`;
}

/** Quantas vezes a arte nova do cenário é maior que a antiga (128 px por tile contra 32): o mapa desenha em 1/`ART_ZOOM`. */
export const ART_ZOOM = NEW_ART ? 4 : 1;
/**
 * Heróis e monstros da arte nova vão 10% maiores que o padrão de 128 px por tile: o desenho é mais fino que o antigo
 * e, do mesmo tamanho, parecia menor no celular.
 */
export const NEW_ART_ZOOM = 1.1;
