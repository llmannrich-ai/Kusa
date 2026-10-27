/** Preferências do jogador, salvas só neste aparelho. */
export interface Settings {
  minimap: boolean;
  landscape: boolean;
  fixedStick: boolean;
  /** Heróis e equipamento no padrão novo (docs/ARTE_TIBIA.md), ainda em teste. */
  newArt: boolean;
}

const DEFAULTS: Settings = {
  minimap: true,
  landscape: false,
  // Joystick fixo de padrão desde o retorno dos testadores; o flutuante fica como opção.
  fixedStick: true,
  newArt: false,
};

/** Uma opção como aparece na tela de configurações; novas opções entram aqui e em `Settings`. */
export interface SettingDef {
  key: keyof Settings;
  label: string;
  hint: string;
}

export const SETTING_DEFS: SettingDef[] = [
  { key: "minimap", label: "Minimapa", hint: "Mostra o mapa da dungeon no canto da tela durante a hunt." },
  {
    key: "landscape",
    label: "Jogar deitado (beta)",
    hint: "A hunt vira o celular na horizontal: joystick no polegar esquerdo, botões no direito. Os menus continuam na vertical.",
  },
  {
    key: "fixedStick",
    label: "Joystick fixo",
    hint: "O joystick fica sempre à vista no canto de baixo à esquerda. Desligado, ele aparece onde o polegar toca.",
  },
  {
    key: "newArt",
    label: "Arte nova (beta)",
    hint: "Heróis e equipamento no desenho novo, com mais detalhe. Ainda em teste: o jogo recarrega ao trocar.",
  },
];

const STORAGE_KEY = "kusa:settings";

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Settings>;
    return { ...DEFAULTS, ...saved };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Grava só o que o jogador mudou: o que ele nunca mexeu segue o padrão (`DEFAULTS`), mesmo que o padrão mude. */
export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Settings>;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, [key]: value }));
  } catch { /* armazenamento indisponível */ }
}
