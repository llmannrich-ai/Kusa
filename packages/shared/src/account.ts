// Contas: login por nome + senha, sem e-mail.
// O Supabase Auth exige e-mail, então cada nome vira um e-mail interno derivado dele (nunca recebe mensagens).
// A Edge Function `signup` (supabase/functions/signup) repete estas regras; mude as duas juntas.

/** Tamanho mínimo da senha escolhida pelo jogador. */
export const MIN_PASSWORD_LENGTH = 4;
/** Tamanho máximo da senha (o bcrypt do Supabase usa só os primeiros 72 bytes). */
export const MAX_PASSWORD_LENGTH = 60;
/** Tamanho máximo do nome de login (que também é o nome do jogador na hunt). */
export const MAX_LOGIN_LENGTH = 24;

/** Nome como fica no perfil: o que foi digitado, sem espaços nas pontas. */
export function cleanLogin(login: string): string {
  return login.normalize("NFC").trim();
}

/** Valida nome e senha; devolve a mensagem de erro ou null. */
export function validateCredentials(login: string, password: string): string | null {
  const name = [...cleanLogin(login)];
  if (name.length === 0) return "Digite um nome de login.";
  if (name.length > MAX_LOGIN_LENGTH) return `O nome pode ter no máximo ${MAX_LOGIN_LENGTH} caracteres.`;
  const pass = [...password];
  if (pass.length < MIN_PASSWORD_LENGTH) return `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (pass.length > MAX_PASSWORD_LENGTH) return `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`;
  return null;
}

/**
 * E-mail interno da conta: hash do nome sem diferenciar maiúsculas,
 * então "Leo" e "leo" são a mesma conta e qualquer caractere funciona.
 */
export async function loginEmail(login: string): Promise<string> {
  const key = cleanLogin(login).toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 32)}@contas.kusa.invalid`;
}

/** Senha gravada no Supabase: com prefixo, para atender o mínimo de 6 do Auth com senhas de 4. */
export function authPassword(password: string): string {
  return `kusa:${password}`;
}
