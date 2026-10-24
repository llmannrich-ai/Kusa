import { loadSettings } from "../settings.ts";

/**
 * Arte nova (beta, `Settings.newArt`, `docs/ARTE_TIBIA.md`): lida uma vez; trocar a opção recarrega o jogo. Os
 * desenhos novos só são baixados por quem ligou a opção.
 */
export const NEW_ART = loadSettings().newArt;
export const protoHero = NEW_ART ? await import("./proto/tibiaHero.ts") : null;
export const protoCrypt = NEW_ART ? await import("./proto/crypt.ts") : null;
/** Quantas vezes a arte nova do cenário é maior que a antiga (128 px por tile contra 32): o mapa desenha em 1/`ART_ZOOM`. */
export const ART_ZOOM = NEW_ART ? 4 : 1;
