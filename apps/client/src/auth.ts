import { createClient, type Session } from "@supabase/supabase-js";
import { authPassword, cleanLogin, loginEmail, validateCredentials } from "@kusa/shared";

// Chave pública (publishable): pode ficar no navegador; o RLS do banco protege os dados.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://niaylxoatuxkqwwnlsic.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_jh_w7RCv_E2xnPQ4DW3KZg_QdDk6uc5",
);

/** Jogador logado. */
export interface Account {
  username: string;
  gold: number;
}

/** Erro com mensagem pronta para mostrar ao jogador. */
export class AuthError extends Error {}

/** Sessão salva no aparelho (o jogador continua logado ao reabrir). */
export async function currentAccount(): Promise<Account | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ? loadAccount(data.session) : null;
}

export async function signIn(login: string, password: string): Promise<Account> {
  const invalid = validateCredentials(login, password);
  if (invalid) throw new AuthError(invalid);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: await loginEmail(login),
    password: authPassword(password),
  });
  if (error) {
    throw new AuthError(error.code === "invalid_credentials" ? "Nome ou senha incorretos." : "Não foi possível entrar agora.");
  }
  return loadAccount(data.session);
}

/** Cria a conta (Edge Function `signup`, já confirmada) e entra nela. */
export async function signUp(login: string, password: string): Promise<Account> {
  const invalid = validateCredentials(login, password);
  if (invalid) throw new AuthError(invalid);
  const { error } = await supabase.functions.invoke("signup", { body: { login: cleanLogin(login), password } });
  if (error) {
    const body = await (error.context as Response | undefined)?.json?.().catch(() => null);
    throw new AuthError(body?.error ?? "Não foi possível criar a conta agora.");
  }
  return signIn(login, password);
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** JWT atual (renovado se preciso), enviado ao servidor de jogo ao entrar numa sala. */
export async function accessToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

async function loadAccount(session: Session): Promise<Account> {
  const { data } = await supabase.from("profiles").select("username, gold").eq("id", session.user.id).single();
  return {
    username: data?.username ?? session.user.user_metadata.username ?? "Aventureiro",
    gold: data?.gold ?? 0,
  };
}
