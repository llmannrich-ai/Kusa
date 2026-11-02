# Telemetria de jogabilidade

O servidor de jogo grava uma linha por jogador por hunt em `public.telemetry_runs` (Supabase), inclusive
de convidados. Nas hunts em equipe tudo é medido no servidor (`apps/server/src/telemetry.ts`). A exceção são as hunts
solo (`solo = true`, `build = 'solo'`): a simulação roda no navegador e a linha chega pelo `finish_solo_run`, com
números do aparelho do jogador. **Separe ou descarte `solo` ao balancear** se houver suspeita de adulteração.
Só o service role lê e grava; consulte pelo painel do Supabase (SQL Editor) ou pela ferramenta de SQL.

Os jogadores veem um resumo em **Configurações > Telemetria** (`apps/client/src/telemetry.ts`). Ele vem da função
`telemetry_dashboard(p_map, p_days)` (`security definer`, só para logados), que devolve apenas agregados, sem nome,
id ou seed de ninguém, mais o resumo das hunts de quem consulta. A tabela e as views continuam fechadas.
Campo novo que deva aparecer para os jogadores entra nessa função e no `Dashboard` do cliente.

Como o jogo é entre amigos, a tela também tem **Prêmios da galera** e **Ranking entre amigos**: a função
`telemetry_ranking(p_map, p_days)` (`security definer`, só para logados) devolve uma linha por conta, **com o nome**
(hunts, sobrevivência, abates, dano causado e recebido, cura, gold, bosses, mortes, melhor nível, minutos e classe
favorita). Convidados ficam de fora. Métrica nova no ranking entra nessa função e em `METRICS` do cliente.

O card **Em pé × deitado (beta)** compara as hunts jogadas com a tela em pé e deitada (Jogar deitado, nas
Configurações): `telemetry_screen(p_map, p_days)` conta como deitada a hunt com pelo menos metade do tempo deitada
(`stats.landscapeMs`) e devolve hunts, jogadores, abandono, sobrevivência, nível, loot e duração de cada grupo. O card
só aparece depois que alguém jogou deitado.

**Configurações > Histórico** (`apps/client/src/history.ts`) lista as partidas, uma por `match_id`, com cada jogador:
classe, nível, desfecho, loot (gold e itens que saíram da hunt) e penalidades da morte (gold juntado, itens perdidos e
a perda de XP das magias dos slots). Vem de `match_history(p_mine, p_before, p_limit)` (`security definer`, só para
logados), que lê esta tabela; `p_mine` filtra as partidas da conta e `p_before` pagina. Seed, build e ids ficam de fora.

## O que é medido

| Coluna / campo | Para que serve |
|---|---|
| `class_id`, `party_size` (humanos + bots), `outcome`, `level`, `duration_s`, `loot` | Resultado da hunt |
| `map_id` | Mapa da hunt (`crypt`, `swamp`). **Compare também por mapa**: as dificuldades são diferentes. `telemetry_classes`, `telemetry_deaths`, `telemetry_levels` e `telemetry_economy` têm a coluna `map_id` |
| `build` | Commit do servidor (`RENDER_GIT_COMMIT`). **Sempre compare por build**: é o antes e o depois de cada ajuste |
| `solo` | Hunt solo, simulada no aparelho do jogador (`build` = `solo`) |
| `max_depth` / `path_rooms` | Até onde a equipe chegou (-1 = não saiu da sala inicial; `path_rooms` = sala do boss) |
| `killed_by`, `stats.death` | Monstro, profundidade, posição e segundo da morte |
| `abandoned` | Fechou o jogo ou caiu no meio (conta como morte, mas não é dificuldade) |
| `stats.levelAt` | Segundo em que cada nível foi alcançado (curva de XP) |
| `stats.depthAt` | Segundo em que entrou em cada sala do caminho (ritmo) |
| `stats.perksChosen` | Melhoria escolhida em cada nível, as duas oferecidas, o nível e o segundo |
| `stats.specs` | Traços das especializações que o jogador tinha na hunt (ex.: `eagle_eye`) |
| `stats.passives` | Níveis das passivas de gold que o jogador levou: Dons, áureas e Tomos (id do nó → nível, ex.: `{"knight_honed_edge": 12}`) |
| `stats.spellsActive` | Magias levadas para a hunt (as ativas no Grimório, até 3 por slot): as opções da escolha de cada slot |
| `stats.spellsChosen`, `casts`, `castFails` | Magia escolhida por slot, quantas vezes usou e quantas falhou (sem mana / sem alvo / sem espaço para o Rolamento) |
| `stats.fanHits` | Monstros atingidos pelas magias em leque, somados por magia (÷ `casts` = média por lançamento; meta ≥ 2) |
| `stats.spellXp` | XP de uso ganho por magia (lançamentos em combate × segundos de recarga), antes do teto por hunt e da perda na morte; `spellsChosen.rank` é o nível de uso (0 a 5) e `spellsChosen.bonus` a força extra das sinergias e do Tomo (fração) |
| `stats.basicRetargets` | Golpes básicos que foram no monstro mais próximo porque o alvo travado estava fora do alcance (muito alto = o jogador trava alvo sem querer) |
| `stats.shots` | Tiros que podem errar (básico à distância e magias de alvo único com projétil), por fonte (`basic` ou id da magia): `fired` disparados, `missed` errados (ninguém no caminho até o fim do alcance), `aimed` mirados à mão. A taxa de erro por classe mede o efeito no balanceamento |
| `stats.damageDealt` | Dano efetivo por fonte (`basic` ou id da magia; o dano contínuo, como o veneno, entra no id da magia que o aplicou; o salto da pantera e a patada do urso em `panther_form` e `bear_form`; o raio do Céu Carregado em `charged_sky`; o contragolpe da Riposta em `riposte`; os Espinhos de Ferro em `iron_thorns`). Itens mágicos: `item:burn`, `item:poison` (chamas e veneno das armas) e `item:thorns` (espinhos) |
| `stats.damageTaken`, `damageMitigated`, `minHpPct` | Dano recebido por monstro, quanto a armadura/Grito evitou e o maior susto |
| `stats.specialDamage` | Dano das habilidades dos monstros (golpe + veneno/queimadura/sangramento + engolido), por monstro |
| `stats.abilityDamage` | O mesmo, por habilidade: `"<monstro>:<habilidade>"` (ex.: `dragon:breath`, `gelatinousCube:engulf`). Meta: nenhuma habilidade sozinha com mais de 20% das mortes do mapa |
| `stats.ccTaken` | Tempo (ms) sob efeito de monstro: `root`, `stun`, `engulf`, `blind`, `corrode` |
| `stats.resisted` | Dano que o herói deixou de causar por resistência ou imunidade dos monstros (negativo = a vulnerabilidade rendeu a mais) |
| `stats.healing` | Cura feita (druida), incluindo o roubo de vida da Sede de sangue e dos itens mágicos |
| `stats.manaGiven` | Mana devolvida aos aliados por magias e criaturas (Fogo-Fátuo), sem as poções |
| `stats.bossRunes` | Bosses que deram a runa a este personagem nesta hunt (cada boss dá a runa uma vez por personagem) |
| `stats.bossKills` | Bosses mortos com este herói na hunt, na ordem (na Caverna da Travessia, Basilisco e/ou Observador: qual lado da bifurcação a equipe venceu) |
| `stats.bossClear` | Estava na hunt (vivo) quando o boss principal morreu: venceu o cenário e abriu o seguinte da campanha. Quem morreu antes do boss também ganha o cenário, mas a linha dele já foi gravada sem a marca |
| `stats.absorbed` | Dano que os escudos (magias e Traços) absorveram no herói |
| `stats.buffMs` | Tempo com bônus em si ou forma animal ativos (Postura, Fúria, Pantera, Urso...), somado por conjuração |
| `stats.reactions` | Reações disparadas pelo herói, por id (`vapor`, `shatter`, `hemorrhage`, `toxic_ember`, `thornbush`, `doom`, `incandesce`; `exposed` conta cada golpe amplificado). O dano das explosões entra em `damageDealt["reaction:<id>"]` (meta da seção 11 do plano: ≥ 1 reação por hunt em quem tem um Dom de combo no nível 5+) |
| `stats.giftProcs` | Dons do fundo e marcos: quantas vezes cada gatilho disparou (marcos do Cavaleiro: `honed_edge` a série do Fio Temperado, `tanned_hide` o escudo quebrado, `command_voice` o escudo de socorro, `bedrock_taunt` os monstros provocados parado, `living_banner` as curas ao matar na aura; do Paladino: `patient_eye` o atordoar no alcance máximo, `patient_eye_double` a flecha dupla, `burning_faith` a luz que atravessa; do Druida: `pack_bond` a criatura que volta, `venom_sap` o veneno que pula; Dons da costela do Cavaleiro: `anvil` o impacto da Bigorna, `chime` o Repique, `war_echo` o Eco de Guerra; do Paladino: `wide_quiver` o leque da Aljava Larga, `votive_candle` as velas, `sharp_caltrops` os estrepes de quem morre num campo, `short_fuse` a explosão do Pavio Curto; do Feiticeiro: `ember_throat` a explosão no fim da onda). O dano da Bigorna e do Repique entra em `damageDealt["anvil"]` e `damageDealt["chime"]`. Dons do fundo, pelo id do Dom ( `bedrock` conta cada golpe amortecido e `last_duel` não conta: `grace`, `circuit`, `frost_reserve`, `ossuary`, `instinct`, `cycle`, `closed_sky`, `hunter_breath`, `quick_hand`). O dano extra entra em `damageDealt` (`closed_sky`, `quick_hand`, `summon:skeleton`); a cura do Ciclo, em `healing`; o escudo da Reserva Gélida, em `absorbed` |
| `stats.converted` | Monstros convertidos em aliado pelo Xamã Orc (Corrente da Submissão, Juramento de Sangue), por espécie |
| `stats.runeProcs` | Runas Mestras: quantas vezes cada efeito disparou (`phoenix`, `echo`, `reaper`, `vengeance`) e, em `pact`, a vida gasta no lugar da mana. A cura do Ceifador soma em `healing`; o dano da Vingança, em `damageDealt["rune:vengeance"]` |
| `stats.intercepted` | Intervir (Guardião): dano que o cavaleiro puxou dos aliados para si |
| `stats.revives`, `stats.revived` | Renascer da Semente: nomes de quem o druida salvou; em quem renasceu, de quem veio a semente, o segundo e o dano que levou depois |
| `stats.bots` | Bots na equipe quando a hunt começou (já contados em `party_size`). Bot não gera linha de telemetria |
| `stats.landscapeMs` | Tempo (ms) de hunt com a tela deitada (o cliente avisa com `MSG.screen`); o resto foi em pé |
| `stats.ccMs` | Tempo de controle aplicado nos monstros (ms somados por monstro): `root`, `stun` e `slow` |
| `stats.potions` | Poções guardadas e bebidas por tipo e mana devolvida (a vida das poções entra em `healing`) |
| `stats.kills`, `firstKillAt`, `xp` | Abates por monstro, tempo até o primeiro abate, XP total |
| `stats.loot`, `chestsOpened`, `items` | De onde veio o loot (monstros, baús, bônus do boss); itens equipados e bag que entraram (`loadout`, `bag`), pegos, largados pelo menu da bag (`dropped`), perdidos na morte (equipamento sorteado + bag) `bagFull` (avisos de bag cheia: item deixado no chão) `botCut` (itens de equipamento que não caíram pela parte dos bots da equipe) e `drops` (itens de equipamento que caíram no chão por fonte: `common`, `miniboss`, `boss`, `chest`, pegos ou não; `picked` ÷ `drops` = quanto do que caiu foi pego) |

## Views prontas

| View | Pergunta que responde |
|---|---|
| `telemetry_grimoire` | O Grimório está sendo usado? Hunts que chegam a cada slot, nível médio das magias escolhidas, especializações por herói, escudo absorvido, tempo de bônus em si, Intervir e reanimações |
| `telemetry_specs` | Cada especialização (Traço) vai bem? Hunts, sobrevivência e chegada ao boss por Traço |
| `telemetry_classes` | Alguma classe sobrevive muito mais ou menos? Quanto loot leva e até onde chega? |
| `telemetry_deaths` | O que mata, em que sala e em que momento? (soterrado = tempo curto demais) |
| `telemetry_damage` | Quanto do dano vem do ataque básico e de cada magia? DPS médio |
| `telemetry_spell_picks` | Qual magia é escolhida em cada slot e se ela muda a sobrevivência |
| `telemetry_perk_picks` | Quantas vezes cada melhoria foi oferecida e escolhida, e a sobrevivência de quem escolheu |
| `telemetry_levels` | Em que segundo cada nível chega (os slots abrem no 3 e no 6) |
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
   - Melhoria com taxa de escolha perto de 100% (ou de 0%) → forte (ou fraca) demais; ajuste `perStack` em `perks.ts`.
   - Magia com muitas conjurações e pouco dano, ou muitas falhas `noTarget` → alcance ou custo em `spells.ts`.
   - Gold médio por hunt × preços do mercado e da árvore → quantas hunts para cada compra.
4. Mudou um número? O próximo deploy gera um build novo; compare as mesmas views entre os dois builds.

## Agente de balanceamento

A skill `/balanceamento` (`.claude/skills/balanceamento/SKILL.md`) faz o roteiro acima sozinha: roda a conta teórica
(`npx tsx scripts/balanco.ts` de dentro de `apps/server`: DPS de toda magia e criatura no nível 20, com e sem
equipamento, e o que sai da curva), cruza com as consultas prontas desta tabela, separa jogador bom de classe forte,
acha a causa na fórmula e entrega as propostas com números, risco e como medir no build novo.

## Local

Sem `SUPABASE_SERVICE_ROLE_KEY`, nada é gravado. Para ver o que seria gravado: `KUSA_TELEMETRY_LOG=1 npm run dev`.
