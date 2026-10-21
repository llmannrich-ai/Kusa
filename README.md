# Kusa

RPG de dungeon cooperativo para navegador, estilo Tibia com tema D&D. Equipes de 1 a 4 jogadores entram,
saqueiam e precisam sair antes que a dungeon desabe. Veja o [game design](docs/GDD.md).

## Stack

| Parte | Tecnologia | Pasta |
|---|---|---|
| Cliente (navegador) | Phaser 4 + TypeScript + Vite | `apps/client` |
| Servidor de jogo (autoritativo) | Colyseus 0.18 (Node.js) | `apps/server` |
| Regras compartilhadas | TypeScript puro (classes, progressão, gerador de dungeon) | `packages/shared` |
| Contas, gold, upgrades, amigos | Supabase (Postgres + Auth) | `supabase/migrations` |

O servidor de jogo é a fonte da verdade: movimento, combate, loot e tempo rodam nele, e o navegador
só envia intenções. O gold só é gravado pelo servidor (service role) através da função `finish_run`.

## Jogar

**https://llmannrich-ai.github.io/Kusa/** (feito para celular, na vertical)

- O cliente é publicado no GitHub Pages a cada push no `main` (`.github/workflows/pages.yml`).
- O servidor de jogo roda no Render, plano free (`render.yaml`). Ele dorme após 15 min sem jogadores, e a primeira entrada leva cerca de 1 min.
- O endereço do servidor fica na variável do repositório `KUSA_SERVER_URL` (padrão `https://kusa-server.onrender.com`).

## Testar no navegador (GitHub Codespaces)

[![Abrir no GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/llmannrich-ai/Kusa?quickstart=1)

O Codespace instala tudo, sobe servidor e cliente e abre o jogo na porta 5173.
Para jogar em equipe com amigos, torne a porta 5173 pública (aba **Portas** → botão direito → **Visibilidade da porta → Pública**)
e envie o endereço para eles.

## Rodando localmente

```bash
npm install
npm run dev          # servidor (2567) + cliente em http://localhost:5173
```

O cliente fala com o servidor pelo proxy do Vite em `/colyseus`, então só a porta 5173 precisa ser exposta.

Verificação completa (a mesma do CI em todo PR):

```bash
npm run check        # typecheck + build do cliente + npm test
npm test             # só os testes de fumaça: sobe os servidores de teste sozinho
npm test -- bag maps # só alguns
```

`npm test` (`apps/server/scripts/all.ts`) roda os scripts abaixo em modo convidado (sem Supabase). Os bots caçam no
nível 1 e às vezes morrem por azar: só nesse caso o teste roda de novo (até 3 vezes). Cada script também roda sozinho
contra um servidor já aberto, passando a URL:

- `npx tsx apps/server/scripts/smoke.ts`: dois jogadores entram, o líder inicia e ambos fogem pelo portal.
- `npx tsx apps/server/scripts/combat.ts`: um cavaleiro anda até o monstro mais próximo, segura o ataque básico, mata e ganha XP e loot.
- `npx tsx apps/server/scripts/items.ts`: confere as regras da bag e um cavaleiro mata monstros até cair um item e o equipa ao passar por cima.
- `npx tsx apps/server/scripts/potions.ts`: um cavaleiro caça até cair uma poção de vida, guarda, apanha e bebe.
- `npx tsx apps/server/scripts/bag.ts`: um cavaleiro veste um item, guarda na bag, veste de novo, larga, pega de volta e foge levando o item na bag.
- `npx tsx apps/server/scripts/perks.ts`: um cavaleiro caça até o nível 2, recebe 2 melhorias, uma fora da oferta é recusada e a escolhida é aplicada.
- `npx tsx apps/server/scripts/spells.ts <url>`: com um servidor iniciado com `KUSA_START_LEVEL=8`, um feiticeiro conjura no toque rápido e com a mira.
- `npx tsx apps/server/scripts/maps.ts`: cada mapa gera mapas conectados e determinísticos e cria a sala certa (monstros, tempo).
- `npx tsx apps/server/scripts/grimorio.ts http://localhost:2602`: com um servidor iniciado (em `apps/server`) com
  `KUSA_START_LEVEL=8 KUSA_ALL_SPELLS=1 PORT=2602`, o Escudo da Fé do cavaleiro absorve dano e os lobos do druida atacam.

## Variáveis de ambiente

Copie `.env.example` de cada app para `.env`:

- `apps/server/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Sem elas, o servidor roda em modo convidado e não salva nada.
  `KUSA_TELEMETRY_LOG=1` imprime no console a telemetria de cada hunt (ver [telemetria](docs/TELEMETRIA.md)).
- `apps/client/.env`: `VITE_SERVER_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Supabase

Projeto **Kusa** (`niaylxoatuxkqwwnlsic`, sa-east-1). As migrations em `supabase/migrations` já foram
aplicadas. Toda mudança de schema entra como uma nova migration nessa pasta.

Telemetria de jogabilidade (para balanceamento): tabela `telemetry_runs` e views `telemetry_*`, ver [docs/TELEMETRIA.md](docs/TELEMETRIA.md).

Contas: login por nome + senha (mínimo 4 caracteres), sem e-mail. O nome vira um e-mail interno
(`packages/shared/src/account.ts`) e a conta é criada já confirmada pela Edge Function `signup`
(`supabase/functions/signup`, publicada sem verificação de JWT). As duas precisam seguir as mesmas regras.
