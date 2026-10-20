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

Teste de fumaça (com o servidor rodando): `npx tsx apps/server/scripts/smoke.ts`

## Variáveis de ambiente

Copie `.env.example` de cada app para `.env`:

- `apps/server/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Sem elas, o servidor roda em modo convidado e não salva nada.
- `apps/client/.env`: `VITE_SERVER_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Supabase

Projeto **Kusa** (`niaylxoatuxkqwwnlsic`, sa-east-1). As migrations em `supabase/migrations` já foram
aplicadas. Toda mudança de schema entra como uma nova migration nessa pasta.
