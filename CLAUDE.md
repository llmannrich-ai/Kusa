# Kusa — guia para o Claude

Leia `README.md` (stack, como rodar) e `docs/GDD.md` (game design) antes de mudar algo.

- Idioma: textos do jogo, comentários e mensagens de commit em português.
- **Mobile primeiro** (ver "Plataforma" no GDD): toda mecânica precisa funcionar só com toque, **com o celular na vertical**. A entrada passa por `apps/client/src/input.ts` (joystick na parte de baixo + teclado); botões de ação vão em `#actions` (canto inferior direito). Teste com viewport de celular em retrato (ex.: 412×915 com toque); o desktop só mostra uma coluna 9:16 para desenvolvimento.
- O servidor é autoritativo. Movimento, dano, XP, loot e tempo são calculados em `apps/server`; o cliente só envia intenções (`MSG.move` etc.) e desenha o estado.
- Regras que cliente e servidor precisam concordar (classes, curva de XP, gerador de dungeon, mensagens) ficam em `packages/shared`. O gerador é determinístico pela `seed`: não use `Math.random()` dentro dele. **Toda mudança no gerador (`dungeon.ts`) ou num mapa (`maps.ts`) sobe `RULES_VERSION`** (`constants.ts`): o servidor recusa cliente de outra versão e o cliente se recarrega sozinho.
- O schema sincronizado (`apps/server/src/state.ts`) usa decorators do `@colyseus/schema`. O cliente importa dele **só tipos** (`import type`), com uma exceção: a hunt solo (`apps/client/src/solo.ts`) carrega `state.ts` e `hunt.ts` por `import()` dinâmico.
- A simulação da hunt fica em `apps/server/src/hunt.ts` (classe `Hunt`), sem Node nem Colyseus: o `DungeonRoom` só liga a rede, o banco e a telemetria, e a hunt solo roda a mesma classe no navegador. Não use `process`, `node:*` nem o Supabase dentro de `hunt.ts` (opções de teste entram por `HuntOptions`).
- Supabase (projeto `niaylxoatuxkqwwnlsic`): toda mudança de schema vira um arquivo novo em `supabase/migrations/` e é aplicada com a ferramenta de migration. O cliente nunca grava gold; compras, vendas e equipamento passam por funções `security definer` (`buy_talent`, `buy_item`, `sell_item`, `equip_item`, `buy_cosmetic`) e o servidor de jogo usa `take_loadout`, `finish_run` e `record_spell_xp` (só service role). A hunt solo é a exceção que credita pelo cliente: só por `start_solo_run`/`finish_solo_run`, que aplicam os limites de `SOLO_LIMITS` (mude o banco e o `packages/shared` juntos). Catálogos da árvore de magias e do mercado existem no `packages/shared` e no banco: mude os dois juntos. Rode os advisors de segurança depois de cada migration.
- Antes de commitar: `npm run check` (typecheck, build do cliente e `npm test`, que sobe os servidores de teste sozinho e roda todos os testes de fumaça). Teste de fumaça novo entra na lista `SUITES` de `apps/server/scripts/all.ts`. O mesmo roda no CI (`.github/workflows/ci.yml`) em todo PR: não mescle PR com o CI vermelho.
- Fluxo com várias sessões em paralelo (já houve trabalho duplicado):
  - comece de `origin/main` atualizado, numa branch nova por tarefa (`feat/…`, `fix/…`, `ajuste/…`);
  - antes de abrir o PR e de novo antes de mesclar, `git fetch` e mescle `origin/main`; se o `main` já tiver algo parecido com a sua tarefa, construa em cima dele em vez de substituir;
  - conflito em `RULES_VERSION`: fique com o maior valor dos dois lados **+ 1**;
  - mescle pelo PR (merge commit) e apague a branch depois.
- Telemetria (`apps/server/src/telemetry.ts`, `docs/TELEMETRIA.md`): mecânica nova que mexe em dano, cura, loot ou progressão deve alimentar os contadores de `RunStats` (`apps/server/src/runStats.ts`).
