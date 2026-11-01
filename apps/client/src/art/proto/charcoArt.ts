import type { MonsterKind } from "@kusa/shared";
import { BEAST_FEET, BEAST_POSES, shootBeast } from "./forestBeasts.ts";
import { FOLK_FEET, FOLK_POSES, shootFolk } from "./forestFolk.ts";
import { MUMMY_FEET, MUMMY_POSES, PRIEST_POSES, shootMummy } from "./mummy.ts";
import { OOZE_FEET, OOZE_POSES, shootOoze } from "./ooze.ts";
import { WORM_FEET, WORM_POSES, WORM_SIZE, shootWorm } from "./sandWorm.ts";
import { VULTURE_POSES, shootVulture } from "./vulture.ts";
import type { Frame, Skin, View } from "./sculpt.ts";
import { sculptArt, type ClipPoses, type SculptOptions } from "./sculptArt.ts";

/**
 * Inimigos do Charco Cinzento esculpidos por código (`docs/ARTE_ESCULTURA.md`): os modelos que já existem com a pele do
 * charco (`Skin`, em `sculpt.ts`) e um modelo novo, o Lodo de Cinza (`ooze.ts`). A paleta é a do mapa: turfa, cinza,
 * lama escura, ferrugem e a luz verde-água dos fogos-fátuos e das runas.
 */

/** A luz fria do charco: o fogo-fátuo da lanterna, a runa do monólito, os olhos dos afogados. */
const WISP = { hex: "#8ef0d8", amount: 1, light: 0.05 };

export const CHARCO_SKINS = {
  /** O Verme da Areia, pequeno e escuro como sanguessuga de lama, com a boca vermelha de sangue. */
  leech: { tone: { hex: "#2a1414", amount: 0.95, sat: 0.55, light: -0.5 }, glow: { hex: "#d03028", amount: 1 }, rim: { color: "#c8a0a0", power: 0.35 } },
  /** O Abutre Gigante, negro de corvo, com o reflexo azulado nas penas. */
  crow: { tone: { hex: "#262a34", amount: 1, sat: 0.35, light: -0.45 }, glow: { hex: "#ffb040", amount: 1 }, rim: { color: "#a8b8d0", power: 0.4 } },
  /** A Múmia de turfa encharcada: as ataduras viram camadas de turfa, os olhos a luz fria. */
  drowned: { tone: { hex: "#4c3e2e", amount: 0.85, sat: 0.65, light: -0.25 }, glow: WISP, rim: { color: "#b8c8b0", power: 0.4 } },
  /** O Sacerdote Mumificado como o turfeiro da lanterna: pano cinza de lama, o cajado com a luz verde. */
  lantern: { tone: { hex: "#5a5c4e", amount: 0.8, sat: 0.45, light: -0.15 }, glow: WISP, rim: { color: "#c8e0d8", power: 0.45 } },
  /** A Pantera na lama: pelo cinza-oliva de turfa, olhos amarelados. */
  lurker: { tone: { hex: "#3c4234", amount: 0.9, sat: 0.55, light: -0.15 }, glow: { hex: "#d8e070", amount: 1 }, rim: { color: "#b0c0a0", power: 0.35 } },
  /** A Dríade de cinza: a casca e o cabelo cinzentos, o brilho frio. */
  hag: { tone: { hex: "#8a8882", amount: 0.85, sat: 0.3, light: -0.1 }, glow: WISP, rim: { color: "#e0e4dc", power: 0.45 } },
  /** O Guardião do Menir na pedra do charco, com líquen amarelado; a runa já é a luz fria. */
  monolith: { tone: { hex: "#7a7c74", amount: 0.55, sat: 0.7, light: -0.05 }, glow: WISP },
  /** O Guardião Élfico de armadura enferrujada e manto de lama, a lâmina e os olhos de luz fria. */
  knight: { tone: { hex: "#6e3e22", amount: 0.95, sat: 0.8, light: -0.2 }, glow: WISP, rim: { color: "#d0b898", power: 0.4 } },
  /** O Rei Galhado como a Rainha Afogada: a coroa de galhos mortos, o corpo da cor da água negra e a luz fria. */
  queen: { tone: { hex: "#34505a", amount: 0.85, sat: 0.7, light: -0.05 }, glow: { hex: "#9af4e0", amount: 1, light: 0.1 }, rim: { color: "#a8e0d8", power: 0.5 } },
} satisfies Record<string, Skin>;

const sk = CHARCO_SKINS;
export type SculptedArt = ReturnType<typeof sculptArt>;
type Strike = Record<string, "attack" | "cast" | "skill"> | "cast" | "attack";

/** Um inimigo esculpido: as poses, a foto de cada pose, as opções da folha, o tamanho na tela e de onde sai cada habilidade. */
export interface CharcoSpec {
  kind: MonsterKind;
  poses: ClipPoses<never>;
  shoot: (pose: never, view: View) => Frame;
  opts: SculptOptions;
  size: number;
  strike: Strike;
}
const spec = <P>(kind: MonsterKind, poses: ClipPoses<P>, shoot: (pose: P, view: View) => Frame, opts: SculptOptions, size: number, strike: Strike): CharcoSpec =>
  ({ kind, poses: poses as unknown as ClipPoses<never>, shoot: shoot as unknown as (pose: never, view: View) => Frame, opts, size, strike });

export const CHARCO: CharcoSpec[] = [
  spec("giantLeech", WORM_POSES, (p, v) => shootWorm(p, v, sk.leech), { feet: WORM_FEET, size: WORM_SIZE, attackS: 0.55, castS: 0.8 }, 0.85, "attack"),
  spec("carrionCrow", VULTURE_POSES, (p, v) => shootVulture(p, v, sk.crow), {}, 1.25, { crowDive: "cast" }),
  spec("peatDrowned", MUMMY_POSES, (p, v) => shootMummy(p, v, false, sk.drowned), { feet: MUMMY_FEET }, 1.5, "cast"),
  spec("lanternBearer", PRIEST_POSES, (p, v) => shootMummy(p, v, true, sk.lantern), { feet: MUMMY_FEET, castS: 0.8 }, 1.5, { wispFire: "cast" }),
  spec("ashOoze", OOZE_POSES, (p, v) => shootOoze(p, v), { feet: OOZE_FEET, castS: 0.8 }, 1.35, { ashEngulf: "cast" }),
  spec("poolLurker", BEAST_POSES.panther, (p, v) => shootBeast("panther", p, v, sk.lurker), { feet: BEAST_FEET.panther }, 1.5, { poolPull: "cast" }),
  spec("ashHag", FOLK_POSES.dryad, (p, v) => shootFolk("dryad", p, v, sk.hag), { feet: FOLK_FEET, castS: 0.7 }, 1.6, "cast"),
  spec("bogMonolith", FOLK_POSES.menhir, (p, v) => shootFolk("menhir", p, v, sk.monolith), { feet: FOLK_FEET, castS: 0.7 }, 1.85, { runePulse: "cast", monolithSlam: "attack" }),
  spec("drownedKnight", FOLK_POSES.warden, (p, v) => shootFolk("warden", p, v, sk.knight), { feet: FOLK_FEET, castS: 0.7 }, 1.65, { knightCharge: "attack", rustSweep: "cast", drownedCall: "cast" }),
  spec("morgrana", FOLK_POSES.erlking, (p, v) => shootFolk("erlking", p, v, sk.queen), { feet: FOLK_FEET, castS: 0.7 }, 2.7,
    { blackTide: "skill", lakeHand: "attack", drownedCourt: "cast", lakeDive: "cast", drownedLament: "skill" }),
];

/** As folhas no jogo (cada figura é desenhada no aparelho quando a hunt pede). */
export const charcoArt = () => CHARCO.map((c) => [c.kind, sculptArt(c.poses, c.shoot, c.opts), c.size, c.strike] as const);
