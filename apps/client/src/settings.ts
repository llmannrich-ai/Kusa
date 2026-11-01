/** Preferências do jogador, salvas só neste aparelho. */
export interface Settings {
  minimap: boolean;
  landscape: boolean;
  fixedStick: boolean;
  /** Heróis e equipamento no padrão novo (docs/ARTE_TIBIA.md), ainda em teste. */
  newArt: boolean;
  /** Mira de arrasto no ⚔️, igual à das magias de alvo único (ainda em teste). */
  attackAim: boolean;
}

const DEFAULTS: Settings = {
  minimap: true,
  landscape: false,
  // Joystick fixo de padrão desde o retorno dos testadores; o flutuante fica como opção.
  fixedStick: true,
  // Arte nova ligada de padrão para todos (a escolha antiga é zerada uma vez em `loadSettings`).
  newArt: true,
  attackAim: false,
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
  {
    key: "attackAim",
    label: "Mira no ataque (beta)",
    hint: "Arraste a partir do ⚔️ para escolher o monstro, como nas magias: soltar trava o alvo e golpeia; voltar ao botão cancela. O toque rápido e o segurar continuam iguais.",
  },
];

const STORAGE_KEY = "kusa:settings";
/** Marca de que a escolha antiga da Arte nova já foi zerada (ver `loadSettings`). */
const NEW_ART_RESET_KEY = "kusa:newArtReset";

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Settings>;
    // Arte nova vira o padrão de todos: a escolha gravada antes disso (de quem desligou no teste) é esquecida uma vez;
    // daqui em diante quem desligar continua com a antiga.
    if (!localStorage.getItem(NEW_ART_RESET_KEY)) {
      delete saved.newArt;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      localStorage.setItem(NEW_ART_RESET_KEY, "1");
    }
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
