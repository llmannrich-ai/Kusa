import { ITEMS, RUNES, isPotion, isRune, type ItemRarity, type ItemSlot, type ItemTier, type PotionId, type RuneKind } from "@kusa/shared";
import { makeCanvas, paintGrid, type Grid, type Palette } from "./pixels.ts";

/**
 * Arte própria dos itens: um ícone 16×16 por família (espada, arco, cajado, manto...) e nível, pintado com
 * a paleta do material (nível 1 = couro/madeira … 5 = dragão; as vestes arcanas usam tecidos, `CLOTH`).
 * "m"/"M" = material claro/escuro, "a" = detalhe (nas varinhas e cajados, a gema). Itens raros e mágicos
 * ganham uma gema no canto, na cor da raridade. Como cada item fica vestido no herói está em `outfit.ts`.
 */

export const ITEM_ICON_SIZE = 16;

export const MATERIALS: Record<ItemTier, { m: string; M: string; a: string }> = {
  1: { m: "#a9794a", M: "#6b4526", a: "#d8b27a" }, // couro e madeira
  2: { m: "#d9994f", M: "#8a5527", a: "#f3cf86" }, // bronze
  3: { m: "#b9c0ca", M: "#666e7a", a: "#8b5a2b" }, // ferro
  4: { m: "#e4ecf7", M: "#7b93b6", a: "#4c7bd9" }, // aço
  5: { m: "#d9483a", M: "#7e1d1d", a: "#f2c14e" }, // dragão
};

/** Tecidos das vestes arcanas: linho, lã azul, seda rúnica, mithral e seda de dragão. */
export const CLOTH: Record<ItemTier, { m: string; M: string; a: string }> = {
  1: { m: "#cdbf9c", M: "#8a7a58", a: "#6b4526" },
  2: { m: "#4f6fb0", M: "#2c3f6e", a: "#d9b25a" },
  3: { m: "#7b4fa8", M: "#46286a", a: "#7fd6ff" },
  4: { m: "#d8e2f0", M: "#7f93b3", a: "#4c7bd9" },
  5: { m: "#b8322a", M: "#5e1414", a: "#f2c14e" },
};

/** Gema das varinhas e cajados: esmeralda, âmbar, safira clara, safira e rubi. */
const GEMS: Record<ItemTier, string> = { 1: "#7fd66a", 2: "#f0a93a", 3: "#7fd6ff", 4: "#4c7bd9", 5: "#ff4d3d" };

/** Paleta (claro, escuro, detalhe) de um item vestível: tecido para as vestes arcanas, material para o resto. */
export function itemMaterial(id: string) {
  const item = ITEMS[id];
  if (!item) return MATERIALS[1];
  return item.family.endsWith("-arcane") ? CLOTH[item.tier] : MATERIALS[item.tier];
}

const BASE: Palette = { o: "#140d0a", w: "#9a6a36", W: "#5e3c1c", i: "#efe3c8" };

/** Completa a grade com linhas vazias até 16. */
const icon = (rows: string[]): Grid => [...rows, ...Array(ITEM_ICON_SIZE - rows.length).fill(".".repeat(ITEM_ICON_SIZE))];

/** Grade só com o preenchimento: o contorno "o" entra sozinho em volta (vizinhos de cima, baixo e lados). */
const outlined = (rows: string[]): Grid => {
  const grid = icon(rows);
  const filled = (x: number, y: number) => grid[y]?.[x] !== undefined && grid[y][x] !== "." && grid[y][x] !== "o";
  return grid.map((row, y) => [...row].map((ch, x) => (
    ch === "." && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) ? "o" : ch
  )).join(""));
};

/** Troca as letras de uma grade pixel a pixel. */
const remap = (grid: Grid, fn: (ch: string, x: number, y: number) => string): Grid =>
  grid.map((row, y) => [...row].map((ch, x) => fn(ch, x, y)).join(""));

const LONG_SWORD = icon([
  "............ooo.",
  "...........omMo.",
  "..........ommo..",
  ".........omMo...",
  "........ommo....",
  ".......omMo.....",
  "......ommo......",
  "..oo.omMo.......",
  "..oaoMmo........",
  "...oaMo.........",
  "...owao.........",
  "..owWoao........",
  ".owWo.oao.......",
  ".oWo...oo.......",
  "..o.............",
]);

const BRONZE_HELMET = icon([
  "................",
  ".......aa.......",
  "......oaao......",
  ".....ooaaoo.....",
  "....ommmmmMo....",
  "...ommmmmmmMo...",
  "..omMmmmmmmmMo..",
  "..ommmmmmmmmMo..",
  "..oaaaaaaaaaao..",
  "..oMmo....omMo..",
  "..oMmo....omMo..",
  "..oMMo....oMMo..",
  "...oo......oo...",
]);

const BRONZE_CUIRASS = icon([
  "................",
  "...ooo....ooo...",
  "..ommMo..oMmmo..",
  ".ommmmMooMmmmmo.",
  ".ommmmmmmmmmmmo.",
  ".oMommmmmmmmoMo.",
  "..o.ommaammo.o..",
  "....ommaammo....",
  "....ommmmmmo....",
  "....oMmmmmMo....",
  "....oMMmmMMo....",
  "....oaaaaaao....",
  ".....oooooo.....",
]);

const PLATE_ARMOR = icon([
  "................",
  ".oooo......oooo.",
  "oMmmmo....ommmMo",
  "oMmmmMooooMmmmMo",
  ".oMMommmmmmoMMo.",
  "..oommmmmmmmoo..",
  "...oMMMMMMMMo...",
  "...ommmaammmo...",
  "...oMMMMMMMMo...",
  "....ommmmmmo....",
  "....oMMMMMMo....",
  "....oaaaaaao....",
  ".....oooooo.....",
]);

const OLD_ICONS = {
  weapon: {
    // Porrete
    1: icon([
      "................",
      "..........ooo...",
      ".........oMmmo..",
      "........omMmmmo.",
      "........ommammo.",
      ".......ommmmMo..",
      "......ommmMoo...",
      ".....ommMo......",
      "....ommMo.......",
      "...ommMo........",
      "..ommMo.........",
      ".oMmMo..........",
      ".oMMo...........",
      "..oo............",
    ]),
    // Espada de bronze: lâmina curta.
    2: icon([
      "................",
      "................",
      "................",
      "................",
      "........ooo.....",
      ".......omMo.....",
      "......ommo......",
      ...LONG_SWORD.slice(7, 15),
    ]),
    // Machado de ferro
    3: icon([
      "................",
      "........oo......",
      "...ooooowWo.....",
      "..ommmmMwWo.....",
      ".ommmmmMwWo.....",
      ".ommmmMMwWo.....",
      ".ommmmMMwWo.....",
      "..oMMMMMwWo.....",
      "...ooooowWo.....",
      ".......owWo.....",
      ".......owWo.....",
      ".......owWo.....",
      ".......owWo.....",
      ".......oaao.....",
      ".......oaao.....",
      "........oo......",
    ]),
    // Espada longa de aço
    4: LONG_SWORD,
    // Lâmina do dragão: fio serrilhado de ouro.
    5: icon([
      "............ooo.",
      "..........oomMo.",
      ".........oammo..",
      "........oomMo...",
      ".......oammo....",
      "......oomMo.....",
      ".....oammo......",
      ...LONG_SWORD.slice(7, 15),
    ]),
  },
  helmet: {
    // Gorro de couro
    1: icon([
      "................",
      "................",
      "................",
      "......oooo......",
      "....oommmMoo....",
      "...ommmmmmmMo...",
      "..ommmmmmmmmMo..",
      "..oMmmmmmmmmMo..",
      "..oaaaaaaaaaao..",
      "..oaaaaaaaaaao..",
      "...oooooooooo...",
    ]),
    2: BRONZE_HELMET,
    // Elmo de ferro: rebites e protetor de nariz.
    3: icon([
      "................",
      "................",
      "......oooo......",
      "....oommmMoo....",
      "...ommmmmmmMo...",
      "..omMmmmmmmmMo..",
      "..ommmmmmmmmMo..",
      "..oMmMMMMMMmMo..",
      "..oMmoomMoomMo..",
      "..oMmo.oo.omMo..",
      "..oMMo....oMMo..",
      "...oo......oo...",
    ]),
    // Elmo de aço: viseira e penacho.
    4: icon([
      "................",
      "......oaao......",
      ".....oaaaao.....",
      "....oooooooo....",
      "...ommmmmmmMo...",
      "..ommmmmmmmmMo..",
      "..ommmmmmmmmMo..",
      "..oMooooooooMo..",
      "..ommmmmmmmmMo..",
      "..omMmMmMmMmMo..",
      "..oMmmmmmmmmMo..",
      "..oMMMMMMMMMMo..",
      "...oooooooooo...",
    ]),
    // Elmo do dragão: chifres de marfim.
    5: icon([
      "................",
      ".o............o.",
      ".oio........oio.",
      "..oio.oooo.oio..",
      "..oiooammaooio..",
      "...ommmmmmmMo...",
      "..oammmmmmmmao..",
      "..oMaaaaaaaaMo..",
      "..oMmooaaoomMo..",
      "..oMmo.oo.omMo..",
      "..oMMo....oMMo..",
      "...oo......oo...",
    ]),
  },
  armor: {
    // Gibão de couro: amarração no peito.
    1: icon([
      "................",
      "...ooo....ooo...",
      "..ommMo..oMmmo..",
      ".ommmmMooMmmmmo.",
      ".ommmmmaMmmmmmo.",
      ".oMommmMammmoMo.",
      "..o.ommaMmmo.o..",
      "....ommMammo....",
      "....ommaMmmo....",
      "....oMmMamMo....",
      "....oMMmmMMo....",
      "....oMMaaMMo....",
      ".....oooooo.....",
    ]),
    2: BRONZE_CUIRASS,
    // Cota de malha: anéis alternados, cinto de couro.
    3: remap(BRONZE_CUIRASS, (ch, x, y) => (ch === "m" || ch === "M" || (ch === "a" && y < 11) ? ((x + y) % 2 ? "M" : "m") : ch)),
    4: PLATE_ARMOR,
    // Escamas de dragão: escamas desencontradas e faixas de ouro.
    5: remap(PLATE_ARMOR, (ch, x, y) => {
      if (y === 0 && (x === 2 || x === 13)) return "o";
      if (ch === "M" && (y === 6 || y === 8)) return "a";
      if (ch === "m") return (x + (y % 2) * 2) % 4 === 0 ? "M" : "m";
      return ch;
    }),
  },
  shield: {
    // Broquel de madeira: tábuas e cravo.
    1: icon([
      "................",
      "................",
      ".....oooooo.....",
      "...omMmmmmMmo...",
      "..ommMmmmmMmmo..",
      ".ommmMmaamMmmmo.",
      ".ommmMmaamMmmmo.",
      ".ommmMmmmmMmmmo.",
      ".oMmmMmmmmMmmMo.",
      "..oMmMmmmmMmMo..",
      "...oMMMmmMMMo...",
      ".....oooooo.....",
    ]),
    // Escudo de bronze: redondo, aro e bossa.
    2: icon([
      "................",
      "................",
      ".....oooooo.....",
      "...ooaaaaaaoo...",
      "..oammmmmmmMao..",
      ".oammmmmmmmmMao.",
      ".oammmmaaMmmMao.",
      ".oammmmaaMmmMao.",
      ".oammmmmmmmMMao.",
      "..oaMmmmmmMMao..",
      "...ooaaaaaaoo...",
      ".....oooooo.....",
    ]),
    // Escudo de ferro: rebites e tiras de couro.
    3: icon([
      "................",
      "...oooooooooo...",
      "..ommmmmmmmmMo..",
      "..omMmmaammMMo..",
      "..ommmmaammmMo..",
      "..oaaaaaaaaaao..",
      "..ommmmaammmMo..",
      "..ommmmaammmMo..",
      "...ommmaammMo...",
      "...oMmmaamMMo...",
      "....oMmaaMMo....",
      ".....oMaaMo.....",
      "......oMMo......",
      ".......oo.......",
    ]),
    // Escudo de aço: moldura e cruz azuis.
    4: icon([
      "................",
      "...oooooooooo...",
      "..ommmmmmmmmMo..",
      "..omaaaaaaaaMo..",
      "..omammmmmmaMo..",
      "..omamMaaMmaMo..",
      "..omamaaaamaMo..",
      "..omammaammaMo..",
      "...omammmmaMo...",
      "...omMammaMMo...",
      "....omMaaMMo....",
      ".....omMMMo.....",
      "......oMMo......",
      ".......oo.......",
    ]),
    // Escudo do dragão: aro de ouro e olho de dragão.
    5: icon([
      "................",
      "...oooooooooo...",
      "..oaaaaaaaaaao..",
      "..oammmmmmmMao..",
      "..oammmaammMao..",
      "..oammaaaaMMao..",
      "..oamaaooaaMao..",
      "..oammaaaaMMao..",
      "...oammaammao...",
      "...oamMmmMMao...",
      "....oamMMMao....",
      ".....oaMMao.....",
      "......oaao......",
      ".......oo.......",
    ]),
  },
};

const BOW = outlined([
  "................",
  "..........Mi....",
  ".........m.i....",
  "........m..i....",
  ".......mM..i....",
  "......mM...i....",
  "......mM...i....",
  ".....aa....i....",
  ".....aa....i....",
  "......mM...i....",
  "......mM...i....",
  ".......mM..i....",
  "........m..i....",
  ".........m.i....",
  "..........Mi....",
]);

const CROSSBOW = outlined([
  "................",
  "................",
  ".......aa.......",
  ".......wW.......",
  "..mmmmmwWmmmmM..",
  ".mM....wW....Mm.",
  ".M.....wW.....M.",
  "..i....wW....i..",
  "...ii..wW..ii...",
  ".....iiwWii.....",
  ".......wW.......",
  "......mwWm......",
  ".......wW.......",
  ".......WW.......",
]);

const WAND = outlined([
  "................",
  "................",
  "................",
  "...........aa...",
  "..........aiaa..",
  "..........aaa...",
  ".........mM.....",
  "........wW......",
  ".......wW.......",
  "......wW........",
  ".....mM.........",
  "....wW..........",
  "...wW...........",
  "..WW............",
]);

const STAFF = outlined([
  "............aa..",
  "...........aiaa.",
  "...........aaaa.",
  "..........mmaa..",
  "..........mM....",
  ".........wW.....",
  "........wW......",
  ".......wW.......",
  "......mM........",
  ".....wW.........",
  "....wW..........",
  "...wW...........",
  "..wW............",
  ".WW.............",
]);

const DOUBLE_AXE = outlined([
  "................",
  ".......wW.......",
  "..mm...wW...mm..",
  ".mmmM..wW..Mmmm.",
  ".mmmMMawWaMMmmm.",
  ".mmmMMawWaMMmmm.",
  ".mmmM..wW..Mmmm.",
  "..mm...wW...mm..",
  ".......wW.......",
  ".......wW.......",
  ".......wW.......",
  ".......aa.......",
  ".......wW.......",
  ".......aa.......",
]);

const PANTS = outlined([
  "................",
  "................",
  "...aaaaaaaaaa...",
  "...mmmmmmmmmM...",
  "...mmmmMmmmmM...",
  "...mmmM..mmmM...",
  "...mmmM..mmmM...",
  "...mmmM..mmmM...",
  "...mMmM..mMmM...",
  "...mmmM..mmmM...",
  "...mmmM..mmmM...",
  "...mmmM..mmmM...",
  "...MMMM..MMMM...",
]);

const BOOTS = outlined([
  "................",
  "................",
  "................",
  "...aaa....aaa...",
  "...mmM....mmM...",
  "...mmM....mmM...",
  "...mmM....mmM...",
  "...mmM....mmM...",
  "..mmmM...mmmM...",
  ".mmmmM..mmmmM...",
  ".mmmmM..mmmmM...",
  ".MMMMM..MMMMM...",
]);

const HAT = outlined([
  "................",
  "..........M.....",
  ".........mM.....",
  "........mmM.....",
  ".......mmmM.....",
  "......mmmmM.....",
  "......mmmmMM....",
  ".....mmmmmMM....",
  ".....aaaaaaa....",
  "..mmmmmmmmmmMM..",
  ".mmmmmmmmmmmmMM.",
]);

const ROBE = outlined([
  "................",
  "....mm....mm....",
  "...mmmmaammmm...",
  "..mmmmmaammmmM..",
  "..mMmmmaammmMM..",
  "..mMmmmaammmMM..",
  "....mmmaammmM...",
  "....mmmaammmM...",
  "...mmmmaammmmM..",
  "...mmmmaammmmM..",
  "..mmmmmaammmmmM.",
  "..mmmmmaammmmmM.",
  "..MMMMMMMMMMMMM.",
]);

/** O mesmo desenho em todos os níveis (o material muda a cor). */
const allTiers = (grid: Grid): Record<ItemTier, Grid> => ({ 1: grid, 2: grid, 3: grid, 4: grid, 5: grid });

/** Ícone de cada família (`ITEM_FAMILIES`) por nível. */
const ICONS: Record<string, Record<ItemTier, Grid>> = {
  "weapon-sword": { ...OLD_ICONS.weapon, 1: OLD_ICONS.weapon[2], 3: LONG_SWORD },
  "weapon-axe": { ...allTiers(OLD_ICONS.weapon[3]), 5: DOUBLE_AXE },
  "weapon-bow": allTiers(BOW),
  "weapon-crossbow": allTiers(CROSSBOW),
  "weapon-wand": allTiers(WAND),
  "weapon-staff": allTiers(STAFF),
  "helmet-war": OLD_ICONS.helmet,
  "helmet-arcane": allTiers(HAT),
  "armor-war": OLD_ICONS.armor,
  "armor-arcane": allTiers(ROBE),
  "legs-war": allTiers(PANTS),
  "legs-arcane": allTiers(PANTS),
  "boots-boots": allTiers(BOOTS),
  "shield-shield": OLD_ICONS.shield,
};

/** Gema no canto dos itens raros (azul) e mágicos (roxa, com brilho). */
const RARITY_GEM: Partial<Record<ItemRarity, { grid: Grid; palette: Palette }>> = {
  rare: { grid: [".o.", "oro", ".o."], palette: { o: "#0b1a33", r: "#4aa3ff" } },
  magic: { grid: [".o.", "oro", ".o."], palette: { o: "#2a0b33", r: "#c56cf0" } },
};

/** Frasco das poções: "c" = rolha, "g" = brilho do vidro, "l"/"L" = líquido claro/escuro. */
const POTION_GRID: Grid = [
  "................",
  "......oooo......",
  "......occo......",
  "......occo......",
  ".....oooooo.....",
  "......ogLo......",
  "......ogLo......",
  ".....oglllo.....",
  "....ogllllLo....",
  "...ogllllllLo...",
  "...olllllllLo...",
  "...olllllllLo...",
  "...oLllllllLo...",
  "....oLLLLLLo....",
  ".....oooooo.....",
  "................",
];

const LIQUIDS: Record<PotionId, Palette> = {
  "potion-health": { l: "#e74c3c", L: "#8e1f16" },
  "potion-mana": { l: "#4aa3df", L: "#1f4f8e" },
};

const GLASS: Palette = { o: "#140d0a", c: "#a9794a", g: "#f4f7fb" };

/** Pedra das runas: "s"/"S" = pedra clara/escura; o símbolo de cada runa é entalhado por cima na cor dela. */
const RUNE_STONE: Grid = [
  "................",
  "....oooooooo....",
  "...osssssssSo...",
  "..ossssssssSSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..osssssssssSo..",
  "..oSssssssssSo..",
  "...oSSSSSSSSo...",
  "....oooooooo....",
  "................",
];

const STONE: Palette = { o: "#14121a", s: "#6b6f7a", S: "#3f424b" };

/** Símbolo 6×8 de cada runa ("g" = brilho na cor da runa), entalhado no meio da pedra. */
const RUNE_GLYPHS: Record<RuneKind, Grid> = {
  fury: ["..gg..", ".gggg.", "g.gg.g", "..gg..", "..gg..", "..gg..", "..gg..", "..gg.."],
  life: ["g.gg.g", "g.gg.g", ".gggg.", "..gg..", "..gg..", "..gg..", "..gg..", "..gg.."],
  stone: ["..gg..", ".g..g.", "g....g", ".g..g.", "..gg..", ".g..g.", "g....g", "g....g"],
  wind: ["gg....", ".gg...", "..gg..", "...gg.", "..gg..", ".gg...", "gg....", "g....."],
  arcane: ["..g...", "..gg..", ".gggg.", ".gggg.", "gggggg", "gggggg", ".gggg.", "..gg.."],
  blood: ["gg....", "gg.g..", "gg..g.", "gg...g", "gg..g.", "gg.g..", "gg....", "gg...."],
  time: ["gggggg", "g....g", ".g..g.", "..gg..", "..gg..", ".g..g.", "g....g", "gggggg"],
  troll: ["..gg..", "..gg..", "gggggg", "gggggg", "..gg..", "..gg..", "..gg..", "..gg.."],
  lightning: ["...gg.", "..gg..", ".gg...", "ggggg.", "...gg.", "..gg..", ".gg...", "gg...."],
  faith: ["gggggg", "g.gg.g", "gggggg", "g.gg.g", "g.gg.g", ".g..g.", "..gg..", "......"],
  meteor: ["g.....", ".g....", "..g...", "...gg.", "..gggg", "..gggg", "...gg.", "......"],
  dawn: ["..gg..", "g....g", "..gg..", ".gggg.", ".gggg.", "..gg..", "g....g", "..gg.."],
  charge: ["g..g..", ".g..g.", "..g..g", ".g..g.", "g..g..", "......", "gggggg", "......"],
  banner: ["gggg..", "ggggg.", "gggg..", "g.....", "g.....", "g.....", "g.....", "g....."],
  roll: [".ggg..", "g...g.", "g....g", "g....g", "g...g.", "g..g..", ".gggg.", "...g.."],
  mark: ["..gg..", ".g..g.", "g.gg.g", "gggggg", "g.gg.g", ".g..g.", "..gg..", "......"],
  mist: ["......", "gg..gg", "..gg..", "......", "gg..gg", "..gg..", "......", "gg..gg"],
  grove: ["...gg.", "..gggg", ".gggg.", "gggg..", "ggg...", ".g....", "g.....", "......"],
  wolf: ["g.gg.g", "g.gg.g", "......", ".gggg.", "gggggg", "gggggg", ".gggg.", "......"],
  plague: [".gg...", "g..g..", ".gg.gg", "...g.g", "gg..g.", "g.g...", ".g..gg", "....gg"],
  phoenix: ["g....g", "gg..gg", ".gggg.", "..gg..", ".gggg.", "g.gg.g", "..gg..", ".g..g."],
  glass: ["..gg..", ".g..g.", "g....g", "g....g", ".g..g.", "..gg..", "..gg..", "..gg.."],
  colossus: [".gggg.", "gggggg", "g.gg.g", "gggggg", ".gggg.", ".g..g.", ".g..g.", "gg..gg"],
  echo: ["gggg..", "g.....", "g.ggg.", "g.g...", "g.g.g.", "g...g.", "ggggg.", "......"],
  reaper: ["gggg..", "....g.", ".....g", "..g..g", ".g....", "g.....", "g.....", "g....."],
  regicide: ["g.gg.g", "gggggg", "gggggg", "......", "..gg..", "..gg..", "..gg..", ".gggg."],
  pact: ["g....g", ".g..g.", "..gg..", "..gg..", ".g..g.", "g....g", "gggggg", "......"],
  vengeance: ["g..g.g", ".g.g..", "gggggg", "..g.g.", "gggggg", "..g.g.", ".g.g.g", "g....."],
};

/** Pedra das Runas Mestras: dourada, para se distinguir das outras no cofre e na bag. */
const MASTER_STONE: Palette = { o: "#2b1d06", s: "#b8892b", S: "#7a5714" };

/** Ícone 16×16 de um item do equipamento, de uma poção ou de uma runa. */
export function itemIcon(itemId: string) {
  const { canvas, ctx } = makeCanvas(ITEM_ICON_SIZE, ITEM_ICON_SIZE);
  if (isPotion(itemId)) {
    paintGrid(ctx, POTION_GRID, { ...GLASS, ...LIQUIDS[itemId] }, 0, 0);
    return canvas;
  }
  if (isRune(itemId)) {
    const rune = RUNES[itemId];
    paintGrid(ctx, RUNE_STONE, rune.master ? MASTER_STONE : STONE, 0, 0);
    paintGrid(ctx, RUNE_GLYPHS[rune.kind], { g: `#${rune.color.toString(16).padStart(6, "0")}` }, 5, 4);
    return canvas;
  }
  const item = ITEMS[itemId];
  if (!item) return canvas;
  const gem = item.slot === "weapon" && (item.family === "weapon-wand" || item.family === "weapon-staff") ? { a: GEMS[item.tier] } : {};
  paintGrid(ctx, ICONS[item.family][item.tier], { ...BASE, ...itemMaterial(itemId), ...gem }, 0, 0);
  const mark = RARITY_GEM[item.rarity];
  if (mark) paintGrid(ctx, mark.grid, mark.palette, 0, 0);
  return canvas;
}

/** Contorno apagado do slot vazio (como no Tibia): o ícone de ferro do slot numa cor só, quase sumindo no fundo. */
const GHOST: Palette = { o: "#3a3029", m: "#2a221d", M: "#2a221d", a: "#2a221d", w: "#2a221d", W: "#2a221d", i: "#2a221d" };

const GHOST_FAMILY: Record<ItemSlot, string> = {
  weapon: "weapon-sword", helmet: "helmet-war", armor: "armor-war", legs: "legs-war", boots: "boots-boots", shield: "shield-shield",
};

export function slotGhost(slot: ItemSlot) {
  const { canvas, ctx } = makeCanvas(ITEM_ICON_SIZE, ITEM_ICON_SIZE);
  paintGrid(ctx, ICONS[GHOST_FAMILY[slot]][3], GHOST, 0, 0);
  return canvas;
}
