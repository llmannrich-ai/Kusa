---
name: deploy
description: Publica o que foi desenvolvido no Kusa seguindo todas as regras do projeto, do commit ao jogo no ar - branch própria, main mesclado, migrations e advisors do Supabase, npm run check, PR com o template, CI verde, merge commit, branch apagada, Pages e Render conferidos, e main local e remoto iguais no fim. Use quando pedirem para publicar, subir, fazer deploy, mandar para produção ou mesclar o trabalho atual.
---

# Deploy do Kusa

Leva o trabalho da sessão até produção. No Kusa, **produção é o `main`**: cada push nele publica o
cliente no GitHub Pages (`.github/workflows/pages.yml`) e o servidor no Render (`render.yaml`,
`branch: main`). Por isso o único caminho até o `main` é um PR com CI verde, mesclado por merge commit.

O banco (Supabase `niaylxoatuxkqwwnlsic`) **não** é publicado pelo merge: migrations e Edge Functions
são aplicadas à mão nesta skill, antes do merge.

## Regras que nunca se quebram

- Nunca dar push direto no `main`, nunca `--force` no `main`, nunca rebase/amend em branch de outra pessoa.
- Nunca mesclar com CI vermelho, nunca pular, desativar ou afrouxar teste para ficar verde.
- Nunca commit vazio nem fechar/reabrir PR para disparar CI.
- Nunca gravar a `SUPABASE_SERVICE_ROLE_KEY` ou outro segredo em arquivo, commit, PR ou log.
- Migration aplicada no banco não se desfaz com revert de código: se der errado, migration nova corrigindo.
- Parou em algo que não dá para resolver (conflito de lógica, CI vermelho no `main`, advisor de
  segurança novo), **pare e relate**: não mescle "para resolver depois".

## 1. Inventário

```bash
git status -sb
git branch --show-current
git fetch origin main
git log --oneline origin/main -5
git diff --stat origin/main...HEAD
```

Responda antes de seguir:

- **Há o que publicar?** Sem diferença para `origin/main` e sem mudança local → vá direto ao passo 9
  (só sincronizar o `main` local) e diga que não havia nada novo.
- **Em qual branch está?** No `main` ou em HEAD solto com mudanças → crie a branch da tarefa a partir
  do ponto atual: `git switch -c <prefixo>/<nome-curto>` com `feat/` (mecânica/tela nova), `fix/`
  (bug) ou `ajuste/` (balanceamento, texto, ferramenta, docs).
- **Já existe PR aberto para esta branch?** Veja com `mcp__github__list_pull_requests`
  (`head: llmannrich-ai:<branch>`). Se o PR dela já foi **mesclado**, o trabalho novo é um PR novo:
  recomece a branch de `origin/main` levando só os commits que faltam.
- **Alguém já fez algo parecido?** Olhe os PRs abertos e os últimos commits do `main`. Se o `main` já
  tem parte da tarefa, construa em cima dele em vez de substituir (já houve trabalho duplicado).

## 2. Mesclar o `main` atualizado

```bash
git fetch origin main
git merge origin/main
```

- Merge, não rebase (o histórico de branch compartilhada continua válido).
- Conflito em `package-lock.json`: aceite a versão do `main` e rode `npm install` para regerar; nunca
  edite lockfile à mão.
- Conflito em que os dois lados mudaram a mesma lógica e escolher um perde comportamento → pergunte.
- Conflito em `supabase/migrations/`: os nomes são timestamps; se a sua migration ficou com timestamp
  **anterior** à última do `main`, renomeie para um timestamp mais novo (a ordem de aplicação importa).

## 3. Revisar o que vai subir

Releia `git diff origin/main...HEAD` como revisor e confira o que vale para a mudança
(o checklist do PR, `.github/pull_request_template.md`, cobra os mesmos itens):

- [ ] Textos do jogo, comentários e commits em português.
- [ ] Mecânica nova funciona só com toque, celular na vertical (412×915) e deitado (915×412).
      Se mexeu em tela, teste com a skill `run` ou Playwright nesse viewport.
- [ ] Servidor continua autoritativo (cliente só manda intenção).
- [ ] Mudou regra compartilhada → está em `packages/shared`. Se tocou `dungeon.ts`, `rng.ts`, `maps.ts`
      ou `messages.ts`, a `RULES_VERSION` muda sozinha: clientes antigos recarregam e o servidor recusa
      versão diferente. Isso é esperado; só avise no relatório.
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

## 5. Supabase (só se a mudança tocar o banco)

Carregue as ferramentas com `ToolSearch` (`select:mcp__Supabase__list_migrations,mcp__Supabase__apply_migration,mcp__Supabase__get_advisors`).
Projeto: `niaylxoatuxkqwwnlsic`.

1. `list_migrations` e compare com `ls supabase/migrations`. Aplique **só** as que estão na pasta e
   faltam no banco, em ordem de timestamp, com `apply_migration` (o `name` é o nome do arquivo sem o
   timestamp e sem `.sql`; o `query` é o conteúdo do arquivo, sem alterar nada).
2. `get_advisors` com `type: "security"` (e `performance`). Aviso **novo** causado pela migration →
   corrija com outra migration antes de seguir. Avisos que já existiam: só cite no relatório.
3. Mudou `supabase/functions/signup` → `deploy_edge_function` dela com `verify_jwt: false`, e confira
   que `packages/shared/src/account.ts` segue as mesmas regras.

Faça isto antes do merge: o servidor novo no Render pode depender da coluna ou função nova assim que
subir. Se a migration quebra o código que está no ar hoje (renomear/apagar coluna usada), pare e
proponha fazer em duas etapas (adicionar → publicar código → remover depois).

## 6. Commit e push

```bash
git add <arquivos>      # nomeie os arquivos; nada de git add -A sem olhar o git status
git commit              # mensagem em português: linha curta no imperativo + corpo dizendo o porquê
git push -u origin <branch>
```

Termine a mensagem de commit com as linhas de atribuição que a sessão pedir. Push falhou por rede →
tente de novo até 4 vezes (2s, 4s, 8s, 16s). Push recusado por não ser fast-forward → `git fetch` e
merge, nunca force.

## 7. Pull request

Crie com `mcp__github__create_pull_request` (base `main`, repositório `llmannrich-ai/kusa`):

- Título em português, curto, do ponto de vista do jogador.
- Corpo seguindo `.github/pull_request_template.md`: "O que muda" preenchido e o checklist marcado de
  verdade (só marque o que foi feito; o que não se aplica, risque ou diga "não se aplica").
- Cite migrations aplicadas, `RULES_VERSION` alterada e qualquer passo manual pós-deploy.

Depois chame `subscribe_pr_activity` no PR para receber o resultado do CI e comentários de revisão.

## 8. CI verde e merge

1. Espere o check **`verificar`** (workflow `CI`) no último commit do PR. Não fique em loop com
   `sleep`: os eventos do PR acordam a sessão. Para conferir na hora:
   `mcp__github__pull_request_read` (`method: get_status` / `get_check_runs`).
2. Vermelho → leia o log (`mcp__github__get_job_logs`), reproduza localmente, corrija, rode
   `npm run check`, push. Repita até verde. Vermelho também no `main` → não é deste PR: avise e pare.
3. Comentários de revisão: resolva os pequenos e pontuais; os grandes, leve ao usuário.
4. **Logo antes de mesclar**, de novo:
   ```bash
   git fetch origin main
   git merge origin/main
   ```
   Entrou algo novo → `npm run check`, push e espere o CI verde de novo.
5. Mescle com `mcp__github__merge_pull_request`, `merge_method: "merge"` (merge commit; nada de squash
   ou rebase). Se o usuário não pediu explicitamente para publicar/mesclar nesta conversa, confirme
   antes: o merge põe o jogo no ar para todos.
6. Apague a branch: `git push origin --delete <branch>`.

## 9. Sincronizar `main` local e remoto

```bash
git fetch origin --prune
git switch main
git merge --ff-only origin/main
git branch -d <branch>                       # -d, não -D: se recusar, há commit não publicado; investigue
git rev-parse main origin/main               # os dois hashes têm que ser iguais
git status -sb                               # limpo, "## main...origin/main" sem ahead/behind
```

`--ff-only` falhou → o `main` local tem commit que não está no remoto. Não descarte: mova esses
commits para uma branch nova (`git branch resgate/<nome> main`), alinhe o `main`
(`git switch main && git reset --keep origin/main`) e avise o usuário.

## 10. Conferir produção

- **Cliente (GitHub Pages):** `mcp__github__actions_list` no workflow `pages.yml` → a execução do commit
  de merge tem que terminar em `success`. Falhou → leia o log e corrija num PR novo (`fix/…`).
- **CI no `main`:** a execução do `ci.yml` no commit de merge também tem que ficar verde.
- **Servidor (Render):** publica sozinho a partir do `main`. Plano free dorme após 15 min; acorde com
  `curl -s -o /dev/null -w "%{http_code}\n" https://kusa-server.onrender.com/` (pode levar ~1 min;
  qualquer resposta HTTP indica que subiu). Não há API do Render nesta sessão: se não responder em
  alguns minutos, peça ao usuário para olhar o painel do Render.

## 11. Relatório final

Responda curto, nesta ordem:

1. **Publicado:** PR (#número e link), commit de merge, o que muda para o jogador.
2. **Banco:** migrations aplicadas, Edge Function publicada, resultado dos advisors (ou "sem mudança").
3. **Produção:** Pages (ok/falhou), CI do `main`, Render (respondeu ou não).
4. **Sincronia:** `main` local = `origin/main` (hash), branch apagada local e remota.
5. **Atenção:** `RULES_VERSION` mudou (clientes vão recarregar), passos manuais pendentes, riscos.
