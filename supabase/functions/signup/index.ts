// Cria a conta de um jogador com nome + senha, já confirmada (sem e-mail de verificação).
// As regras de nome, senha e e-mail interno repetem packages/shared/src/account.ts; mude as duas juntas.
// Depois daqui o cliente entra normalmente com signInWithPassword.
import { createClient } from "npm:@supabase/supabase-js@2";

const MIN_PASSWORD_LENGTH = 4;
const MAX_PASSWORD_LENGTH = 60;
const MAX_LOGIN_LENGTH = 24;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function loginEmail(name: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name.toLowerCase()));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 32)}@contas.kusa.invalid`;
}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Método não permitido." });

  let login: unknown, password: unknown;
  try {
    ({ login, password } = await req.json());
  } catch {
    return reply(400, { error: "Pedido inválido." });
  }
  if (typeof login !== "string" || typeof password !== "string") return reply(400, { error: "Pedido inválido." });

  const name = login.normalize("NFC").trim();
  const nameLength = [...name].length;
  const passLength = [...password].length;
  if (nameLength === 0) return reply(400, { error: "Digite um nome de login." });
  if (nameLength > MAX_LOGIN_LENGTH) return reply(400, { error: `O nome pode ter no máximo ${MAX_LOGIN_LENGTH} caracteres.` });
  if (passLength < MIN_PASSWORD_LENGTH) return reply(400, { error: `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
  if (passLength > MAX_PASSWORD_LENGTH) return reply(400, { error: `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.` });

  const { error } = await admin.auth.admin.createUser({
    email: await loginEmail(name),
    password: `kusa:${password}`,
    email_confirm: true,
    user_metadata: { username: name },
  });
  if (error) {
    if (error.code === "email_exists" || error.code === "user_already_exists") return reply(409, { error: "Esse nome já está em uso." });
    console.error("Falha ao criar conta", error);
    return reply(500, { error: "Não foi possível criar a conta agora." });
  }
  return reply(200, { ok: true });
});
