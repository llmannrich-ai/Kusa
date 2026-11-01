import { ITEMS } from "@kusa/shared";
import { loadSettings } from "../settings.ts";

/**
 * Arte nova (beta, `Settings.newArt`, `docs/ARTE_TIBIA.md`): lida uma vez; trocar a opção recarrega o jogo. Os
 * desenhos novos só são baixados por quem está com a opção ligada (o padrão).
 */
export const NEW_ART = loadSettings().newArt;
export const protoHero = NEW_ART ? await import("./proto/tibiaHero.ts") : null;
/** A Cripta em 128 px por tile (`cryptArt.ts`): sempre, como os outros cenários (`docs/CENARIOS_PLANO.md`, fase 4). */
export const cryptArt = await import("./cryptArt.ts");
export const protoBeasts = NEW_ART ? await import("./proto/beasts.ts") : null;
/** O sapo gigante a partir das folhas geradas por IA (`docs/arte/pantano-das-ruinas/frog-*.png`). */
export const protoFrog = NEW_ART ? await (await import("./proto/frogArt.ts")).loadFrog() : null;
/** O Rei Bullywug, boss do Pântano das Ruínas, a partir das folhas geradas no Runway (`docs/arte/pantano-das-ruinas/bullywug-*.png`). */
export const protoBullywugKing = NEW_ART ? await (await import("./proto/bullywugKingArt.ts")).loadBullywugKing() : null;
/** O clã do Pântano do Kosaradius (orcs e ogros) a partir das folhas geradas por IA (`docs/arte/pantano-do-kosaradius/`). */
export const protoClan = NEW_ART ? await (await import("./proto/kosaradiusArt.ts")).loadClan() : null;
/** Os inimigos da Cripta que já têm folha gerada por IA (`docs/arte/cripta/`). */
export const protoCrypt = NEW_ART ? await (await import("./proto/criptaArt.ts")).loadCrypt() : null;
/**
 * Arte esculpida por código (`proto/sculpt.ts`, `docs/ARTE_ESCULTURA.md`), piloto no Escorpião da Areia: só código,
 * nada a baixar; cada figura é desenhada no aparelho quando a hunt pede.
 */
export const protoSculpt = NEW_ART ? await import("./proto/sculptArt.ts") : null;
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

/**
 * Heróis e monstros da arte nova vão 10% maiores que o padrão de 128 px por tile: o desenho é mais fino que o antigo
 * e, do mesmo tamanho, parecia menor no celular.
 */
export const NEW_ART_ZOOM = 1.1;
