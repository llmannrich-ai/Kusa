/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do servidor de jogo (Colyseus). Padrão: http://localhost:2567 */
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

/** Versão das regras (hash do gerador, dos mapas e das mensagens), calculada no build pelo `vite.config.ts`. */
declare module "virtual:rules-version" {
  export const RULES_VERSION: string;
}
