import { sculptArt } from "./sculptArt.ts";
import { WARLORD_FEET, WARLORD_POSES, WARLORD_SIZE, shootWarlord } from "./warlord.ts";

/**
 * Vorgak, o Senhor da Brasa (boss da Fortaleza Orc), esculpido por código (`warlord.ts`): nada é baixado, cada figura é
 * fotografada no aparelho quando a hunt da Fortaleza pede (`warmMapMonsters`). Parado e andar em 8, golpe (o cutelo de
 * cima para baixo) em 8, especial (o grito de guerra, com o cutelo cravado) em 8, a 2ª habilidade (o salto) em 8 e a
 * morte (de joelhos sobre o cutelo, a brasa se apagando) em 5.
 */
export const warlordArt = () => sculptArt(WARLORD_POSES, shootWarlord, { feet: WARLORD_FEET, size: WARLORD_SIZE, attackS: 0.7, castS: 1.1 });
