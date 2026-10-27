---
name: deploy
description: Publica o que foi desenvolvido no Kusa seguindo todas as regras do projeto, do commit ao jogo no ar - entra na fila de deploy (sessões paralelas publicam uma por vez, por ordem de chegada), branch própria, main mesclado, migrations e advisors do Supabase, npm run check, PR com o template, CI verde, merge commit, Pages e Render conferidos, e main local e remoto iguais no fim. Use quando pedirem para publicar, subir, fazer deploy, mandar para produção ou mesclar o trabalho atual.
---

# Deploy do Kusa

Leva o trabalho da sessão até produção. No Kusa, **produção é o `main`**: cada push nele publica o
cliente no GitHub Pages (`.github/workflows/pages.yml`) e o servidor no Render (`render.yaml`,
`branch: main`). Por isso o único caminho até o `main` é um PR com CI verde, mesclado por merge commit.

O banco (Supabase `niaylxoatuxkqwwnlsic`) **não** é publicado pelo merge: migrations e Edge Functions
são aplicadas à mão nesta skill, antes do merge.

Várias sessões trabalham em paralelo. Para uma não mesclar em cima da outra, o deploy passa por uma
**fila** (tabela `ops.fila_deploy` no Supabase, migration `20261024230000_fila_deploy.sql`):

- a sessão **entra na fila assim que a skill é chamada** (a ordem é a de chegada);
- o preparo (passos 1 a 4, 6 e 7: revisar, testar, commitar, abrir o PR, CI do PR) roda **sem esperar**;
- só a **seção crítica** (passo 8: mesclar o `main` de novo, CI final, aplicar migration, merge do PR)
  espera a vez. Uma sessão por vez, e por poucos minutos: o que pode falhar ou demorar (check local,
  correção, re-run de CI) acontece fora da vez;
- ao mesclar, a sessão sai da fila e avisa a próxima.

## Regras que nunca se quebram

- Nunca dar push direto no `main`, nunca `--force` no `main`, nunca rebase/amend em branch de outra pessoa.
- Nunca mesclar com CI vermelho, nunca pular, desativar ou afrouxar teste para ficar verde.
- Nunca commit vazio nem fechar/reabrir PR para disparar CI.
- Nunca aplicar migration nem mesclar PR **fora da sua vez** na fila. Nunca mexer na entrada de outra
  sessão (entrada abandonada expira sozinha em 45 min sem batida).
- Nunca gravar a `SUPABASE_SERVICE_ROLE_KEY` ou outro segredo em arquivo, commit, PR ou log.
- Migration aplicada no banco não se desfaz com revert de código: se der errado, migration nova corrigindo.
- Parou em algo que não dá para resolver (conflito de lógica, CI vermelho no `main`, advisor de
  segurança novo), **saia da fila com `desistiu`**, pare e relate: não mescle "para resolver depois".

## A fila

Tudo pela ferramenta de SQL do Supabase. Carregue com `ToolSearch`
(`select:mcp__Supabase__execute_sql,mcp__Supabase__list_migrations,mcp__Supabase__apply_migration,mcp__Supabase__get_advisors`),
projeto `niaylxoatuxkqwwnlsic`.

| Ação | SQL | Devolve |
|---|---|---|
| Entrar | `select ops.fila_entrar('<branch>', '<sessão>', '<o que muda, 1 linha>');` | `id` da entrada (a mesma, se a branch já está na fila) |
| Batida e vez | `select ops.fila_vez(<id>);` | `{minha_vez, estado, fila: [...]}` |
| Sair | `select ops.fila_sair(<id>, 'concluido');` (ou `'desistiu'`) | o próximo da fila (`sessao`, `branch`) ou `null` |
| Ver a fila | `select id, branch, sessao, estado, entrou_em, batida_em from ops.fila_deploy where estado in ('aguardando','publicando') order by entrou_em;` | |

- **`<sessão>`**: na nuvem, o id da sessão (`session_…`, o mesmo do link `Claude-Session`, ou
  `mcp__claude-code-remote__get_session` sem argumento). Fora da nuvem: `local:<hostname>`.
- **Batida**: `fila_vez` renova a entrada. Chame em **todo passo e todo despertar** enquanto estiver na
  fila; sem batida por 45 min a entrada expira e a vez passa adiante. Expirou (`estado: "expirado"`)?
  Entre de novo com `fila_entrar` (vai para o fim) e diga isso ao usuário.
- **Vez**: `minha_vez: true` quer dizer que a entrada virou `publicando` e a seção crítica é sua.

## 0. Entrar na fila

Antes de qualquer outro passo: descubra a branch (passo 1 cria uma se precisar) e entre com
`fila_entrar`. Guarde o `id`. Diga ao usuário a posição e quem está na frente (`fila_vez`).

## 1. Inventário

```bash
git status -sb
git branch --show-current
git fetch origin main
git log --oneline origin/main -5
git diff --stat origin/main...HEAD
```

- **Há o que publicar?** Sem diferença para `origin/main` e sem mudança local → saia da fila com
  `desistiu`, vá direto ao passo 9 (só sincronizar o `main` local) e diga que não havia nada novo.
- **Em qual branch está?** No `main` ou em HEAD solto com mudanças → crie a branch da tarefa a partir
  do ponto atual: `git switch -c <prefixo>/<nome-curto>` com `feat/` (mecânica/tela nova), `fix/`
  (bug) ou `ajuste/` (balanceamento, texto, ferramenta, docs).
- **Já existe PR para esta branch?** `mcp__github__list_pull_requests` (`head: llmannrich-ai:<branch>`).
  Se já foi **mesclado**, o trabalho novo é um PR novo: recomece a branch de `origin/main` levando só os
  commits que faltam.
- **Alguém já fez algo parecido?** Olhe a fila, os PRs abertos e os últimos commits do `main`. Se o
  `main` ou outra entrada da fila já cobre parte da tarefa, construa em cima em vez de substituir.

## 2. Mesclar o `main` atualizado

```bash
git fetch origin main
git merge origin/main
```

- Merge, não rebase.
- Conflito em `package-lock.json`: aceite a versão do `main` e rode `npm install` para regerar; nunca
  edite lockfile à mão.
- Conflito em que os dois lados mudaram a mesma lógica e escolher um perde comportamento → pergunte.
- Migration nova sua, **ainda não aplicada no banco**, com timestamp anterior à última do `main` →
  renomeie para um timestamp mais novo. Já aplicada → mantenha o nome: a ordem dos arquivos deve
  seguir a ordem real em que o banco recebeu (`list_migrations`).

## 3. Revisar o que vai subir

Releia `git diff origin/main...HEAD` como revisor (o checklist do PR,
`.github/pull_request_template.md`, cobra os mesmos itens):

- [ ] Textos do jogo, comentários e commits em português.
- [ ] Mecânica nova funciona só com toque, celular na vertical (412×915) e deitado (915×412).
      Se mexeu em tela, teste com a skill `run` ou Playwright nesse viewport.
- [ ] Servidor continua autoritativo (cliente só manda intenção).
- [ ] Regra compartilhada está em `packages/shared`. Se tocou `dungeon.ts`, `rng.ts`, `maps.ts` ou
      `messages.ts`, a `RULES_VERSION` muda sozinha (clientes antigos recarregam): avise no relatório.
- [ ] Gerador de dungeon sem `Math.random()`.
- [ ] `hunt.ts` sem `process`, `node:*` ou Supabase; campo interno novo que sobrevive à troca de
      anfitrião está em `INTERNALS`.
- [ ] Mecânica que mexe em dano, cura, loot ou progressão alimenta `RunStats`.
- [ ] Teste de fumaça novo está em `SUITES` (`apps/server/scripts/all.ts`).
- [ ] Catálogo (árvore de magias, mercado) ou `SOLO_LIMITS` mudou → mudou também no banco, numa migration.
- [ ] `docs/GDD.md` (e `docs/TELEMETRIA.md`, se for o caso) atualizado.
- [ ] Nenhum segredo, `.env`, arquivo de debug ou `console.log` esquecido no diff.

## 4. Verificação local

```bash
npm ci          # só se package-lock.json mudou ou node_modules não existe
npm run check   # typecheck + build do cliente + todos os testes de fumaça
```

Tem que passar inteiro. Falhou → corrija a causa e rode de novo. Teste que falha "às vezes" não é
desculpa: se for por mapa sorteado, reescreva com `apps/server/scripts/arena.ts` (cenário fixo).

## 5. Commit e push

```bash
git add <arquivos>      # nomeie os arquivos; nada de git add -A sem olhar o git status
git commit              # português: linha curta no imperativo + corpo dizendo o porquê
git push -u origin <branch>
```

Termine a mensagem com as linhas de atribuição que a sessão pedir. Push falhou por rede → tente de
novo até 4 vezes (2s, 4s, 8s, 16s). Recusado por não ser fast-forward → `git fetch` e merge, nunca force.

## 6. Pull request

`mcp__github__create_pull_request` (base `main`, `llmannrich-ai/kusa`):

- Título em português, curto, do ponto de vista do jogador.
- Corpo seguindo `.github/pull_request_template.md`: "O que muda" preenchido e o checklist marcado de
  verdade (o que não se aplica: "não se aplica").
- Cite migrations novas, `RULES_VERSION` alterada e qualquer passo manual pós-deploy.

Depois `subscribe_pr_activity` no PR (CI e revisão acordam a sessão).

## 7. CI do PR e revisão (ainda fora da seção crítica)

1. Espere o check **`verificar`** no último commit. Sem `sleep` em loop: os eventos do PR acordam a
   sessão. Para conferir na hora: `mcp__github__pull_request_read` (`get_status` / `get_check_runs`).
2. Vermelho → `mcp__github__get_job_logs`, reproduza localmente, corrija, `npm run check`, push.
   Vermelho também no `main` → não é deste PR: saia da fila com `desistiu`, avise e pare.
3. Comentários de revisão: resolva os pequenos e pontuais; os grandes, leve ao usuário.
4. Enquanto espera a vez, mantenha o PR em dia: o `main` mudou (outra sessão mesclou) → mescle,
   `npm run check`, push e espere o CI de novo **fora da vez**. Na vez, sobra pouco ou nada para mesclar.
5. A cada despertar: `fila_vez` (batida).

## 8. Seção crítica: só na sua vez

A vez para todo mundo: segure-a só pelo necessário (mesclar o `main`, esperar o CI, aplicar a migration e
mesclar). O preparo (check local, CI do PR verde) já ficou pronto no passo 7, fora da vez.

1. **Pegue a vez**: `select ops.fila_vez(<id>);`.
   - `minha_vez: false` → não avance. Diga ao usuário quem está na frente e espere:
     na nuvem, agende `mcp__claude-code-remote__send_later` com `delay_minutes: 5` e a mensagem
     "Deploy: conferir a vez na fila (id <id>)"; a sessão da frente também avisa por `send_message`
     quando sair. Ao acordar, `fila_vez` de novo. Sem `send_later` (sessão local): use `ScheduleWakeup`
     ou, se nenhum existir, peça ao usuário para chamar `/deploy` de novo em alguns minutos. Nunca
     espere com `sleep` longo.
   - `minha_vez: true` → siga, sem pausas longas, renovando com `fila_vez` a cada passo.
2. **Mescle o `main` de novo** (passo 2).
   - Nada novo → siga para o 8.3.
   - Entrou algo e **mesclou sem conflito** → push e espere só o `verificar` do PR (sem rodar o
     `npm run check` local de novo: o CI roda o mesmo).
   - **Conflito** → saia da fila com `desistiu`, resolva fora da vez (merge, `npm run check`, push, CI
     verde) e entre de novo com `fila_entrar` (vai para o fim).
3. **CI verde no commit final** (o do 8.2, se houve push).
   - Vermelho num teste que **não é deste PR** (falha que não toca o diff, como um teste que joga hunt
     de verdade no mapa sorteado e não achou monstro) → saia da fila com `desistiu` **na hora**, para a
     próxima sessão publicar. Fora da vez: um re-run do job (`rerun_failed_jobs`) e um comentário no PR
     dizendo o teste e por que não é deste PR; com o CI verde, entre de novo com `fila_entrar`.
   - Vermelho por causa do PR → saia com `desistiu`, corrija fora da vez e volte.
   - Nunca espere um re-run ou uma correção segurando a vez.
4. **Supabase** (só se a mudança toca o banco), **só agora, com o CI verde**: a migration entra logo
   antes do merge, para uma sessão que sai da fila não deixar o banco à frente do `main`.
   1. `list_migrations` e compare com `ls supabase/migrations`. Aplique **só** as que estão na pasta e
      faltam no banco, em ordem de timestamp, com `apply_migration` (`name` = nome do arquivo sem
      timestamp e sem `.sql`; `query` = conteúdo do arquivo, sem alterar).
   2. `get_advisors` `security` (e `performance`). Aviso **novo** causado pela migration → corrija com
      outra migration antes de seguir. Avisos que já existiam: só cite no relatório.
   3. Mudou `supabase/functions/signup` → `deploy_edge_function` com `verify_jwt: false`, e confira que
      `packages/shared/src/account.ts` segue as mesmas regras.
   4. Migration que quebra o código no ar hoje (renomear/apagar coluna usada) → saia com `desistiu` e
      proponha duas etapas (adicionar → publicar código → remover depois).
5. **Merge**: `mcp__github__merge_pull_request`, `merge_method: "merge"` (nada de squash ou rebase).
   Se o usuário não pediu explicitamente para publicar nesta conversa, confirme antes: o merge põe o
   jogo no ar para todos.
6. **Saia da fila**: `select ops.fila_sair(<id>, 'concluido');`. Se devolveu um próximo com `sessao`
   `session_…`, avise: `mcp__claude-code-remote__send_message` para essa sessão com
   "Deploy: sua vez na fila (id <id dele>). O main mudou: mescle o origin/main antes de seguir."
   Cancele o `send_later` pendente desta sessão, se houver (`delete_trigger`).
7. **Apague a branch**: `git push origin --delete <branch>`. Nas sessões na nuvem o proxy de git
   recusa apagar branch remota; aí ela some pela opção do repositório "Automatically delete head
   branches" (Settings → General). Se continuar lá (`git ls-remote origin <branch>`), cite no relatório.

## 9. Sincronizar `main` local e remoto

```bash
git fetch origin --prune
git switch main
git merge --ff-only origin/main
git branch -d <branch>                       # -d, não -D: se recusar, há commit não publicado; investigue
git rev-parse main origin/main               # os dois hashes têm que ser iguais
git status -sb                               # limpo, "## main...origin/main" sem ahead/behind
```

`--ff-only` falhou → o `main` local tem commit que não está no remoto. Não descarte: guarde numa branch
(`git branch resgate/<nome> main`), alinhe (`git switch main && git reset --keep origin/main`) e avise.

## 10. Conferir produção

- **Cliente (GitHub Pages):** `mcp__github__actions_list` no workflow `pages.yml` → a execução do commit
  de merge tem que terminar em `success`. Falhou → leia o log e corrija num PR novo (`fix/…`).
- **CI no `main`:** a execução do `ci.yml` no commit de merge também tem que ficar verde.
- **Servidor (Render):** publica sozinho a partir do `main`. Plano free dorme após 15 min; acorde com
  `curl -s -o /dev/null -w "%{http_code}\n" https://kusa-server.onrender.com/` (pode levar ~1 min;
  qualquer resposta HTTP indica que subiu). Sem API do Render nesta sessão: se não responder em alguns
  minutos, peça ao usuário para olhar o painel do Render.

## 11. Relatório final

Curto, nesta ordem:

1. **Publicado:** PR (#número e link), commit de merge, o que muda para o jogador.
2. **Fila:** quanto esperou, quem foi avisado em seguida (ou "fila vazia").
3. **Banco:** migrations aplicadas, Edge Function publicada, advisors (ou "sem mudança").
4. **Produção:** Pages, CI do `main`, Render.
5. **Sincronia:** `main` local = `origin/main` (hash), branch apagada local e remota.
6. **Atenção:** `RULES_VERSION` mudou, passos manuais pendentes, riscos.
