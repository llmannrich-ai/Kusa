/** Preferências do jogador, salvas só neste aparelho. */
export interface Settings {
  minimap: boolean;
  landscape: boolean;
}

const DEFAULTS: Settings = {
  minimap: true,
  landscape: false,
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

export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const settings = { ...loadSettings(), [key]: value };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* armazenamento indisponível */ }
}
