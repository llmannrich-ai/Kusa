import { ramp, rgb, type RampOptions, type Rgb } from "./color.ts";

/**
 * Materiais dos heróis. Cada um é uma rampa de 6 tons (`color.ts`); o índice do material é o que a
 * pintura guarda em cada pixel. `glow` = brilha sozinho (gema, runa, fogo): não recebe sombra nem linha.
 */

export interface Material {
  name: string;
  tones: string[];
  /** Os mesmos tons em RGB (a pintura não converte o hex a cada pixel). */
  rgb: Rgb[];
  glow: boolean;
}

const LIST: Material[] = [{ name: "", tones: [], rgb: [], glow: false }];

function def(name: string, base: string, opts: RampOptions & { glow?: boolean } = {}) {
  const tones = ramp(base, opts);
  LIST.push({ name, tones, rgb: tones.map(rgb), glow: !!opts.glow });
  return LIST.length - 1;
}

/** Material pelo índice guardado no pixel. */
export const material = (id: number) => LIST[id];

const METAL: RampOptions = { contrast: 1.35, shift: 8, shine: true };
const CLOTH: RampOptions = { contrast: 0.9, shift: 7 };
const GEM: RampOptions & { glow: boolean } = { contrast: 1.3, shift: 4, shine: true, glow: true };

export const M = {
  // Corpo.
  skinFair: def("pele clara", "#eebf98", { contrast: 0.85, shift: 3 }),
  skinRose: def("pele rosada", "#e8b08c", { contrast: 0.85, shift: 3 }),
  skinTan: def("pele morena", "#c88d62", { contrast: 0.85, shift: 3 }),
  eye: def("olho", "#3a2418", { contrast: 0.6 }),
  eyeWhite: def("branco do olho", "#f4efe6", { contrast: 0.3 }),
  mouth: def("boca", "#a85a48", { contrast: 0.7 }),
  hairBrown: def("cabelo castanho", "#7a4a26", { contrast: 1.1 }),
  hairBlond: def("cabelo loiro", "#e2b44e", { contrast: 1.05, shift: 8 }),
  hairWhite: def("cabelo branco", "#dedae6", { contrast: 0.95, shift: 5 }),
  hairAuburn: def("cabelo ruivo", "#9a4a22", { contrast: 1.1 }),
  facePaint: def("pintura verde", "#4f9a3a", { contrast: 0.8 }),
  skinOrc: def("pele de orc", "#7d9256", { contrast: 0.85, shift: 3 }),
  hairBlack: def("cabelo preto", "#2e2624", { contrast: 1.1 }),
  emberPaint: def("pintura de brasa", "#d8561c", { contrast: 0.8 }),

  // Roupa das classes (o que aparece sem equipamento ou onde ele não cobre).
  knightRed: def("vermelho do cavaleiro", "#b8362d", CLOTH),
  knightGray: def("calça cinza", "#6e7280", CLOTH),
  paladinGold: def("amarelo do paladino", "#d6a42c", CLOTH),
  paladinBrown: def("calça marrom", "#6e4f30", CLOTH),
  sorcPurple: def("roxo do feiticeiro", "#6a35a0", CLOTH),
  sorcDeep: def("roxo escuro", "#41255f", CLOTH),
  druidGreen: def("verde do druida", "#3f8a3c", CLOTH),
  druidBrown: def("calça de couro", "#5e4329", CLOTH),
  shamanHide: def("couro do xamã", "#6b4a2e", CLOTH),
  shamanAsh: def("pano de cinzas do xamã", "#4e4a46", CLOTH),
  shoe: def("sapato", "#5a3822", { contrast: 0.9 }),

  // Materiais dos itens.
  leather: def("couro", "#9a6438", { contrast: 1, shift: 7 }),
  darkLeather: def("couro escuro", "#5e3b22", { contrast: 0.95, shift: 7 }),
  wood: def("madeira", "#9a6a36", { contrast: 1, shift: 6 }),
  darkWood: def("madeira escura", "#64401f", { contrast: 0.95, shift: 6 }),
  rope: def("corda", "#c9a86a", { contrast: 0.9 }),
  bronze: def("bronze", "#c98a3e", METAL),
  iron: def("ferro", "#9aa2ad", { ...METAL, contrast: 1.25 }),
  darkIron: def("ferro escuro", "#5c636e", METAL),
  steel: def("aço", "#c4ccd6", METAL),
  mithral: def("mithral", "#9fb9dc", { ...METAL, contrast: 1.25, shift: 4 }),
  dragon: def("escama de dragão", "#c0392f", { contrast: 1.2, shift: 10 }),
  dragonDark: def("dragão escuro", "#7a1c1c", { contrast: 1.1, shift: 10 }),
  gold: def("ouro", "#e0ac3a", { ...METAL, shift: 10 }),
  ivory: def("marfim", "#efe2c4", { contrast: 0.95, shift: 7 }),
  bone: def("osso", "#e2d6b4", { contrast: 1, shift: 7 }),
  fur: def("pele de animal", "#b2926a", { contrast: 0.9, shift: 6 }),
  leaf: def("folha", "#5ea442", { contrast: 1, shift: 9 }),
  feather: def("pena", "#eef2f8", { contrast: 0.8 }),
  plumeRed: def("penacho vermelho", "#c8302a", CLOTH),
  plumeBlue: def("penacho azul", "#3f6fd0", CLOTH),
  string: def("corda do arco", "#e8e0cc", { contrast: 0.5 }),
  shadow: def("sombra", "#2a2026", { contrast: 0.5 }),

  // Materiais dos itens mágicos.
  ember: def("aço em brasa", "#e8562a", { contrast: 1.2, shift: 10, shine: true }),
  obsidian: def("obsidiana", "#3a3048", { ...METAL, contrast: 1.4 }),
  frostSteel: def("aço gélido", "#9fdcec", { ...METAL, shift: 4 }),
  silverWhite: def("prata sagrada", "#e6e8f0", { ...METAL, contrast: 1.15, shift: 6 }),
  elfSilver: def("prata élfica", "#b9d8c4", { ...METAL, shift: 5 }),
  stormSteel: def("aço da tempestade", "#6f86a8", METAL),
  bloodSteel: def("aço sangrento", "#8c2a32", { ...METAL, shift: 8 }),
  greenLeather: def("couro élfico", "#5f7a3a", { contrast: 1, shift: 7 }),
  greenCloth: def("tecido élfico", "#3f7a52", CLOTH),
  ash: def("lã cinza", "#8a8a96", CLOTH),

  // Tecidos das vestes arcanas.
  linen: def("linho", "#cdbd98", CLOTH),
  wool: def("lã azul", "#4a68aa", CLOTH),
  woolBrown: def("lã marrom", "#8a6a48", CLOTH),
  runeCloth: def("seda rúnica", "#6a3f9a", CLOTH),
  silk: def("seda de mithral", "#dbe3ef", { ...CLOTH, shift: 5 }),
  dragonSilk: def("seda de dragão", "#b3302a", { ...CLOTH, shift: 9 }),
  night: def("azul-noite", "#26306a", CLOTH),

  // Brilham sozinhos.
  ruby: def("rubi", "#ff4a3a", GEM),
  sapphire: def("safira", "#4f86ff", GEM),
  emerald: def("esmeralda", "#4fdc6a", GEM),
  amber: def("âmbar", "#ffa83a", GEM),
  amethyst: def("ametista", "#c46cff", GEM),
  rune: def("runa", "#7fe8ff", GEM),
  holy: def("luz sagrada", "#ffe58a", GEM),
  fire: def("fogo", "#ff8a24", GEM),
  poison: def("veneno", "#8cff4a", GEM),
  frost: def("gelo", "#bff0ff", GEM),
  blood: def("sangue", "#e0283a", GEM),
  star: def("estrela", "#fff6c8", GEM),
} as const;
