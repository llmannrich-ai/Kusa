# Kusa — guia para o Claude

Leia `README.md` (stack, como rodar) e `docs/GDD.md` (game design) antes de mudar algo.

- Idioma: textos do jogo, comentários e mensagens de commit em português.
- **Mobile primeiro** (ver "Plataforma" no GDD): toda mecânica precisa funcionar só com toque, **com o celular em pé (retrato)**. A entrada passa por `apps/client/src/input.ts` (joystick na parte de baixo à esquerda + teclado); botões de ação vão em `#actions` (canto inferior direito); toques na parte de cima da tela são para mirar. Teste com viewport de celular em pé (ex.: 390×844).
- O servidor é autoritativo. Movimento, dano, XP, loot e tempo são calculados em `apps/server`; o cliente só envia intenções (`MSG.move` etc.) e desenha o estado.
- Regras que cliente e servidor precisam concordar (classes, curva de XP, gerador de dungeon, mensagens) ficam em `packages/shared`. O gerador é determinístico pela `seed`: não use `Math.random()` dentro dele.
- O schema sincronizado (`apps/server/src/state.ts`) usa decorators do `@colyseus/schema`. O cliente importa dele **só tipos** (`import type`).
- Supabase (projeto `niaylxoatuxkqwwnlsic`): toda mudança de schema vira um arquivo novo em `supabase/migrations/` e é aplicada com a ferramenta de migration. O cliente nunca grava gold; compras passam por funções `security definer` (`buy_upgrade`, `buy_cosmetic`) e resultados de hunt por `finish_run` (só service role). Rode os advisors de segurança depois de cada migration.
- Antes de commitar: `npm run typecheck`, `npm run build -w @kusa/client` e o teste de fumaça `npx tsx apps/server/scripts/smoke.ts` com o servidor rodando.
