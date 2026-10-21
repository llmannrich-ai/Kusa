# Telemetria de jogabilidade

O servidor de jogo grava uma linha por jogador por hunt em `public.telemetry_runs` (Supabase), inclusive
de convidados. Nada vem do navegador: tudo é medido no servidor (`apps/server/src/telemetry.ts`).
Só o service role lê e grava; consulte pelo painel do Supabase (SQL Editor) ou pela ferramenta de SQL.

## O que é medido

| Coluna / campo | Para que serve |
|---|---|
| `class_id`, `party_size`, `outcome`, `level`, `duration_s`, `loot` | Resultado da hunt |
| `map_id` | Mapa da hunt (`crypt`, `swamp`). **Compare também por mapa**: as dificuldades são diferentes. `telemetry_classes`, `telemetry_deaths`, `telemetry_levels` e `telemetry_economy` têm a coluna `map_id` |
| `build` | Commit do servidor (`RENDER_GIT_COMMIT`). **Sempre compare por build**: é o antes e o depois de cada ajuste |
| `max_depth` / `path_rooms` | Até onde a equipe chegou (-1 = não saiu da sala inicial; `path_rooms` = sala do boss) |
| `killed_by`, `stats.death` | Monstro, profundidade, posição e segundo da morte |
| `abandoned` | Fechou o jogo ou caiu no meio (conta como morte, mas não é dificuldade) |
| `stats.levelAt` | Segundo em que cada nível foi alcançado (curva de XP) |
| `stats.depthAt` | Segundo em que entrou em cada sala do caminho (ritmo) |
| `stats.spellsChosen`, `casts`, `castFails` | Magia escolhida por slot, quantas vezes usou e quantas falhou (sem mana / sem alvo) |
| `stats.damageDealt` | Dano efetivo por fonte (`basic` ou id da magia) |
| `stats.damageTaken`, `damageMitigated`, `minHpPct` | Dano recebido por monstro, quanto a armadura/Grito evitou e o maior susto |
| `stats.healing` | Cura feita (druida) |
| `stats.potions` | Poções guardadas e bebidas por tipo e mana devolvida (a vida das poções entra em `healing`) |
| `stats.kills`, `firstKillAt`, `xp` | Abates por monstro, tempo até o primeiro abate, XP total |
| `stats.loot`, `chestsOpened`, `items` | De onde veio o loot (monstros, baús, bônus do boss); itens equipados e bag que entraram (`loadout`, `bag`), pegos, perdidos na morte (equipamento sorteado + bag) e `bagFull` (avisos de bag cheia: item deixado no chão) |

## Views prontas

| View | Pergunta que responde |
|---|---|
| `telemetry_classes` | Alguma classe sobrevive muito mais ou menos? Quanto loot leva e até onde chega? |
| `telemetry_deaths` | O que mata, em que sala e em que momento? (soterrado = tempo curto demais) |
| `telemetry_damage` | Quanto do dano vem do ataque básico e de cada magia? DPS médio |
| `telemetry_spell_picks` | Qual magia é escolhida em cada slot e se ela muda a sobrevivência |
| `telemetry_levels` | Em que segundo cada nível chega (os slots abrem no 3 e no 8) |
| `telemetry_monsters` | Abates, dano causado nos jogadores e mortes por monstro |
| `telemetry_economy` | Gold médio por hunt e de onde vem, por tamanho de equipe |

Exemplo: `select * from telemetry_classes where build = '<commit>' order by sobrevivencia_pct;`

## Roteiro de balanceamento

1. **Juntar pelo menos ~20 hunts por classe no mesmo build** antes de mexer. Com menos, a variação engana.
2. Ignorar `abandoned = true` ao medir dificuldade (`where not abandoned`).
3. Sinais e ajustes típicos:
   - `soterrado_pct` alto → hunt curta demais (`MATCH_DURATION_SECONDS`) ou dungeon longa demais.
   - Uma classe com sobrevivência muito abaixo das outras → vida/armadura dela em `classes.ts`.
   - Um monstro concentra as mortes numa profundidade → dano dele ou `DEPTH_SCALING` em `monsters.ts`.
   - Nível 3 chegando tarde (`telemetry_levels`) → a primeira magia demora; ver curva de XP em `progression.ts`.
   - Magia com muitas conjurações e pouco dano, ou muitas falhas `noTarget` → alcance ou custo em `spells.ts`.
   - Gold médio por hunt × preços do mercado e da árvore → quantas hunts para cada compra.
4. Mudou um número? O próximo deploy gera um build novo; compare as mesmas views entre os dois builds.

## Local

Sem `SUPABASE_SERVICE_ROLE_KEY`, nada é gravado. Para ver o que seria gravado: `KUSA_TELEMETRY_LOG=1 npm run dev`.
