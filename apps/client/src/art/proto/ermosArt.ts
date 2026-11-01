import { BEAST_FEET, BEAST_POSES, shootBeast } from "./forestBeasts.ts";
import { BEETLE_FEET, BEETLE_POSES, shootBeetle } from "./beetle.ts";
import { spec, type CharcoSpec } from "./charcoArt.ts";
import { ELEMENTAL_FEET, ELEMENTAL_POSES, shootElemental } from "./elemental.ts";
import { FOLK_FEET, FOLK_POSES, shootFolk } from "./forestFolk.ts";
import { MUMMY_FEET, MUMMY_POSES, PRIEST_POSES, shootMummy } from "./mummy.ts";
import type { Skin } from "./sculpt.ts";
import { sculptArt } from "./sculptArt.ts";
import { WARLORD_FEET, WARLORD_POSES, WARLORD_SIZE, shootWarlord } from "./warlord.ts";

/**
 * Inimigos dos Ermos Rubros esculpidos por código (`docs/ARTE_ESCULTURA.md`): os modelos que já existem com a pele dos
 * ermos (`Skin`, em `sculpt.ts`) e dois novos, o Escaravelho de Ferrugem (`beetle.ts`) e o Lagarto-Couraça (o
 * quadrúpede baixo de `forestBeasts.ts`). A paleta é a do mapa: barro vermelho, ferrugem, ocre, rocha e a brasa da forja
 * da mina. A luz que sobe do chão é vermelha (o barro), não a verde da mata.
 */

/** A luz rebatida do barro vermelho e o contorno quente do sol dos ermos. */
const CLAY = { color: "#c0603a", power: 0.45 };
const SUN = { color: "#f4c890", power: 0.4 };
/** A brasa da forja: os olhos dos mortos da mina, a lanterna do capacete, as veias do minério. */
const EMBER = { hex: "#ff8a30", amount: 1, light: 0.05 };
const RUST = ["#2a0e06", "#4a1a08", "#6e2a0c", "#923e12", "#b0561a", "#c87028", "#dc8c3c"];
const RUST_DARK = ["#160806", "#2a1008", "#42180a", "#5c240e", "#783414", "#94461c"];

export const ERMOS_SKINS = {
  /** O Lobo Atroz como hiena: pelo ocre-avermelhado do barro, olho âmbar. */
  hyena: { tone: { hex: "#8a5a34", amount: 1, sat: 0.75, light: -0.05 }, glow: { hex: "#ffc040", amount: 1 }, bounce: CLAY, rim: SUN },
  /** A mãe da matilha: mais escura, o pelo queimado de sol e cicatrizes. */
  matriarch: { tone: { hex: "#5e3420", amount: 1, sat: 0.8, light: -0.15 }, glow: { hex: "#ffd050", amount: 1, light: 0.1 }, bounce: CLAY, rim: SUN },
  /** O Centauro Renegado como saqueador: couro e pano vermelho de poeira. */
  // (amount 1: o pelo do centauro é azulado, e o meio do caminho no círculo das cores passa pelo roxo.)
  raider: { tone: { hex: "#8a3a22", amount: 1, sat: 0.85, light: -0.05 }, glow: { hex: "#ffb040", amount: 1 }, bounce: CLAY, rim: SUN },
  /** A Múmia como mineiro: ataduras viram trapos de pó de ferro, os olhos a brasa. */
  miner: { tone: { hex: "#6a4c3a", amount: 0.85, sat: 0.6, light: -0.2 }, glow: EMBER, bounce: CLAY, rim: SUN },
  /** O Sacerdote como capataz: o pano mais escuro de couro, o cajado é o cabo do chicote. */
  foreman: { tone: { hex: "#4a2c22", amount: 0.9, sat: 0.7, light: -0.25 }, glow: { hex: "#ff5a28", amount: 1 }, bounce: CLAY, rim: SUN },
  /** O Lagarto-Couraça já nasce na cor da rocha: só a luz do barro. */
  lizard: { bounce: CLAY, rim: SUN },
  /** O Elemental como redemoinho de pó de ferro, com a brasa no meio. */
  devil: { tone: { hex: "#9a4a22", amount: 1, sat: 0.9, light: -0.05 }, glow: { hex: "#ffb060", amount: 1 }, bounce: CLAY, rim: SUN },
  /** O Guardião do Menir como golem de minério: pedra de ferro escura, as veias acesas da forja. */
  // O líquen, a hera e o musgo do menir viram ferrugem (os materiais 28, 29 e 16 de `forestFolk.ts`).
  golem: { tone: { hex: "#5a3a30", amount: 1, sat: 1.1, light: -0.1 }, glow: EMBER, bounce: CLAY, rim: SUN, ramps: { 16: RUST, 28: RUST, 29: RUST_DARK } },
  /** Vorgak como Kragmor: a pele de pedra cinza-avermelhada da cratera, a brasa da forja no peito e nos olhos. */
  giant: { tone: { hex: "#7a5444", amount: 1, sat: 0.8, light: 0.02 }, glow: { hex: "#ff7a24", amount: 1, light: 0.05 }, bounce: CLAY, rim: SUN },
} satisfies Record<string, Skin>;

const sk = ERMOS_SKINS;

export const ERMOS: CharcoSpec[] = [
  spec("rustBeetle", BEETLE_POSES, (p, v) => shootBeetle(p, v, { bounce: CLAY }), { feet: BEETLE_FEET }, 0.9, "attack"),
  spec("badlandsHyena", BEAST_POSES.wolf, (p, v) => shootBeast("wolf", p, v, sk.hyena), { feet: BEAST_FEET.wolf }, 1.3, "attack"),
  spec("redRaider", BEAST_POSES.centaur, (p, v) => shootBeast("centaur", p, v, sk.raider), { feet: BEAST_FEET.centaur }, 1.75, { barbedArrow: "attack" }),
  spec("lostMiner", MUMMY_POSES, (p, v) => shootMummy(p, v, false, sk.miner), { feet: MUMMY_FEET }, 1.5, "attack"),
  spec("plateLizard", BEAST_POSES.lizard, (p, v) => shootBeast("lizard", p, v, sk.lizard), { feet: BEAST_FEET.lizard }, 1.45, { plateRoll: "cast" }),
  spec("rustDevil", ELEMENTAL_POSES, (p, v) => shootElemental(p, v, sk.devil), { feet: ELEMENTAL_FEET, castS: 0.75 }, 1.4, { rustGust: "cast" }),
  spec("deadForeman", PRIEST_POSES, (p, v) => shootMummy(p, v, true, sk.foreman), { feet: MUMMY_FEET, castS: 0.8 }, 1.75,
    { foremanWhip: "cast", foremanLash: "attack", minersCall: "cast" }),
  spec("oreGolem", FOLK_POSES.menhir, (p, v) => shootFolk("menhir", p, v, sk.golem), { feet: FOLK_FEET, castS: 0.7 }, 1.9, { seismicPunch: "cast", oreSlam: "attack" }),
  spec("hyenaMatriarch", BEAST_POSES.wolf, (p, v) => shootBeast("wolf", p, v, sk.matriarch), { feet: BEAST_FEET.wolf }, 1.85,
    { matriarchPounce: "cast", matriarchMaul: "attack", hyenaHowl: "cast" }),
  spec("kragmor", WARLORD_POSES, (p, v) => shootWarlord(p, v, sk.giant, "giant"), { feet: WARLORD_FEET, size: WARLORD_SIZE, attackS: 0.7, castS: 1.1 }, 3.7,
    { oreThrow: "attack", caveIn: "cast", mineCall: "cast", craterLeap: "skill", forgeFury: "cast" }),
];

/** As folhas no jogo (cada figura é desenhada no aparelho quando a hunt pede). */
export const ermosArt = () => ERMOS.map((c) => [c.kind, sculptArt(c.poses, c.shoot, c.opts), c.size, c.strike] as const);
