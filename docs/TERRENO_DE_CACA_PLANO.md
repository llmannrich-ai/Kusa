# Terreno de caça — plano do mapa de teste (dificuldade ★★½)

Objetivo: provar, num cenário novo, o modelo **terreno de caça** no lugar da dungeon de uma passada: mapa fixo em
anéis de perigo, monstros que renascem, regeneração fixa e baixa, **sem tempo de partida**. O jogador decide até onde
vai, quando recua e quando volta para outro mapa (ou para o Mercado) antes de tentar de novo. É a aplicação direta do
princípio do GDD (**dificuldade por comportamento**: o perigo vem de ler a situação e escolher, não de números maiores).

Decisões já tomadas (02/11):
- Regen **fixa em pontos por segundo, não percentual** (como no Tibia) e baixa em todo lugar: recuar é recomendado,
  não obrigatório. Como a vida máxima cresce com o nível, a mesma regen vale mais no começo da hunt que no fim.
- **Sem tempo de partida** neste mapa (o soterramento sai).
- O cenário entra na campanha **depois do Pântano do Kosaradius**, com **dificuldade 2,5**.
- Vale o que já existe: extração pelo portal, morte perde 1 item e a bag, bots na equipe, XP dividida, monstros de
  força fixa, **nenhum golpe com aviso**.

Decisões da 2ª rodada (02/11): nome **Fíbula**, arte 100% por código (o desenho da Cripta, a fogueira e a chama já
existentes, o boss **Rei Ossudo** com a arte do Centurião Ossudo maior), relógio de tempo decorrido no HUD, **regen de
mana fixa também**, mini-boss da sala lateral renasce (240 s), valores iniciais ajustados pelo Claude (regen 1,5% da
vida e 2% da mana do nível 1, +4% por nível; fogueira ×4; salas 60/90/120 s). A implementação está na branch
`feat/fibula`; o estado de cada bloco está na seção 5.

Lições do 1º teste (02/11, 2 hunts): (1) ninguém achava o acampamento → o mapa se explica (avisos, placa da zona,
fogueira grande); (2) salas ligadas por túneis matavam a sensação de mapa aberto → planta refeita em salões contínuos,
sem corredor com menos de 4 tiles; (3) a hunt era recusada pelo banco por causa da runa do Rei Ossudo (bug, migration
`runa_do_rei_ossudo`), e sem ela não houve telemetria: o próximo teste é o primeiro com dados.

Fora deste plano (ficam para depois de medir o mapa de teste): levar o modelo aos outros mapas, poções no Mercado,
corpo que fica 24 h, ficha com taxa de extração por anel.

---

## 1. Por que o jogo está fácil (o que o modelo corrige)

| Hoje | Efeito | Terreno de caça |
|---|---|---|
| Regen de 2%/s de vida e mana em qualquer lugar | Parar 30 s cura tudo; recuar não serve para nada | Regen fixa e baixa; poção e acampamento são o socorro |
| Monstro morto não volta | Sala limpa é sala segura; o mapa só fica mais fácil | Os pontos de spawn renascem; o caminho de volta é perigoso de novo |
| Tempo acaba = morte | Empurra para a frente; recuar é desperdício | Sem tempo; o jogador sai quando quer (ou morre) |
| Dungeon sorteada pela seed | Não dá para aprender o mapa | Planta e **posições de monstro fixas**: aprender o mapa é progressão |
| Perigo cresce pela profundidade do caminho | Linear: só há "ir em frente" | Perigo cresce em **anéis** a partir do acampamento, com mais de uma passagem entre eles |

---

## 2. O cenário

### 2.1 Lugar na campanha

- `WORLD_ORDER`: `grove → marsh → **novo** → crypt → …`. Grumak (Pântano do Kosaradius) abre o novo; o boss do novo
  abre a Cripta (`unlockedBy.crypt` muda de `marsh` para o novo, no `world.ts` **e** no banco, `map_unlocked_by`).
- **Herança:** quem já tem a Cripta aberta continua com ela (a migration marca o novo cenário como vencido para quem já
  venceu Grumak, ou a regra de desbloqueio aceita os dois: Grumak **ou** o boss novo abrem a Cripta). Recomendação:
  a segunda, mais simples e sem reescrever `profile_boss_clears`.
- Equipe de 1 a 4 (`MAX_PARTY_SIZE`); o "Jogar sozinho" leva bots (PR da branch `feat/dificuldade-comportamento`).

### 2.2 Dificuldade 2,5

`MapDifficulty` hoje é `1 | 2 | … | 8` inteiro. Opções:
1. Aceitar `2.5` no tipo e desenhar `★★½☆☆☆☆☆` (`difficultyStars`), e o banco não guarda dificuldade (só `map_id`): sem
   migration. **Recomendado.**
2. Reescalar os mapas (Cripta vira 3): mexe em todos os textos e na tabela das Regras. Não vale.

### 2.3 Tema e bestiário (sem monstro nem arte nova na 1ª versão)

Entre o brejo dos orcs e a Cripta, uma **encosta de covas** (nome a escolher: "Covas do Barranco", "Toca dos
Goblins", "Encosta das Covas"). Só criaturas que já existem, para o mapa de teste medir o **modelo**, não o conteúdo:

| Anel | Nível esperado do herói | Espécies (já existem) | Resposta certa que cada uma pede |
|---|---|---|---|
| Acampamento | — | nenhuma (fogueira) | — |
| 1 · Orla da encosta | 1–5 | Ratazana, Kobold, Goblin, Estirge | Enxame: não deixar cercar (Cercado); Estirge: matar antes de sangrar |
| 2 · Covas | 5–10 | Goblin arqueiro, Aranha gigante, Hobgoblin capitão, Lobo atroz | Arqueiro: fechar distância pela quina; Capitão: matar primeiro; Lobo: não fugir dele (persegue) |
| 3 · Fundo das covas | 10–15 | Gnoll, Orc guerreiro, Esqueleto, Bugbear chefe (solto) | Gnoll: não deixar pela metade; Orc: não ficar a 3–5 tiles; Bugbear: nunca levar o 1º golpe |
| Covil | boss | **a decidir** (ver §7) | fases por vida |

A escala de XP e loot por anel é a dos encontros de hoje (`budget`, `crowdAt`): anel 1 ≈ profundidade 0–1 da Cripta,
anel 2 ≈ 2–3, anel 3 ≈ 4–5. O teste `xpmapas` passa a medir **XP por minuto por anel**, não XP total do mapa.

---

## 3. Regras novas (o que muda na simulação)

Tudo em `packages/shared` (regra) e `apps/server/src/hunt.ts` (simulação), ligado por mapa: os mapas atuais
**não mudam** enquanto o teste não for medido.

### 3.1 Planta fixa com anéis e spawns fixos

- Gerador próprio em `dungeon.ts` (`generate<Novo>(SEED_FIXA)`, pincel `fixedCanvas` como Charco e Ermos), 64×120.
- `Dungeon` ganha `rings?: Rect[][]` (as salas de cada anel) e `spawns?: { kind; x; y; ring }[]`: **as posições dos
  monstros ficam no gerador**, não sorteadas na hunt. Assim entram no `RULES_VERSION` (o hash já cobre `dungeon.ts`)
  e cliente e servidor concordam.
- Passagens: **pelo menos 2 entre cada par de anéis** (fugir tem rota alternativa) e corredores de 1 tile em parte
  delas (lutar no corredor evita o Cercado).
- Acampamento: sala de entrada com o portal de fuga e uma **fogueira** (tile especial, só desenho + regra de regen);
  nenhum spawn a 12 tiles dele (vale a "Entrada tranquila").
- A regra dos 6 tiles (teste `ritmo`) continua valendo por anel.

### 3.2 Monstros renascem

- `MapDef.respawn?: { ring: number; ms: number }[]` (ex.: anel 1 a cada 60 s, anel 2 a 90 s, anel 3 a 120 s;
  mini-boss solto e Mímico a 240 s; **boss não renasce**).
- `Hunt`: ao morrer, o monstro de spawn fixo agenda `respawnAt` (campo novo em `INTERNALS`, o teste `anfitriao`
  confere). Renasce **só se não houver herói a 8 tiles do ponto** (senão espera mais 10 s): ninguém leva monstro
  nascendo em cima. Renasce com a ficha cheia, Campeão sorteado de novo (`CHAMPION_CHANCE`).
- O baú da sala lateral não renasce; o mini-boss solto, sim.

### 3.3 Regen fixa

- Constantes novas em `constants.ts`: `HP_REGEN_FLAT` e `MANA_REGEN_FLAT` (pontos por segundo), usadas **só nos mapas
  com `MapDef.flatRegen: true`**; os outros seguem com `HP_REGEN`/`MANA_REGEN` percentuais.
- Ponto de partida para balancear: **2 de vida/s e 1 de mana/s**. No nível 1 (Cavaleiro, 150 de vida) é 1,3%/s;
  no nível 15 (~400) é 0,5%/s: "ligeiramente melhor no início que no final" sai sozinho da vida crescer com o nível.
- **Fogueira do acampamento:** a 3 tiles dela, regen ×4 (encher do nível 10 leva ~50 s: recuar custa tempo, mas
  funciona). Melhorias Regeneração e Clareza somam em pontos (ex.: +1/s cada escolha) em vez de %.
- Subir de nível **continua curando tudo** (é a recompensa do anel 1).

### 3.4 Sem tempo

- `MapDef.durationSeconds: 0` = sem limite. Em `Hunt.tick`, com 0 não há soterramento; `state.timeLeft` fica 0 e o
  HUD esconde o relógio (ou mostra o tempo **decorrido**, útil para a telemetria e para o jogador medir a sessão).
- A ficha mostra `⏱ sem tempo`; as Regras e o Catálogo idem.
- Hunt solo e sala no aparelho: `finish_solo_run` usa a duração do mapa + `graceSeconds` para valer como soterrado.
  Com 0: **sem prazo**; o teto de loot continua proporcional ao tempo de hunt (`fullLootSeconds`), mas vira **taxa
  por hora** (`maxLoot` = teto por 60 min, cresce linear): respawn permite farmar sem fim, e o teto precisa crescer junto.
  `lateResultHours` continua (24 h).

### 3.5 Recuo e fuga (o que fica da branch `feat/dificuldade-comportamento`)

| Mecânica | Fica? | Por quê |
|---|---|---|
| Perseguição pelo papel (escaramuçador 12 tiles, bruto 8, sentinela 3) | Sim | Fugir de lobo não resolve; fugir de zumbi, sim: é leitura |
| Cercado (+12% por monstro colado a mais, até 3) | Sim | Resposta: lutar no corredor |
| Formação (−15% com aliado a 4 tiles) e bots no "Jogar sozinho" | Sim | Resposta: ficar junto; sozinho é pior |
| Grito de Guerra do líder | Sim, ajustado | Só grita se **sobreviver ao 1º golpe**: a resposta é matar o capitão rápido |
| Barulho através de paredes, Andarilho onisciente, dungeon desperta, patrulhas | **Não** | Punem sem resposta; o respawn dá a surpresa |

---

## 4. Telemetria (o que vai dizer se funcionou)

Contadores novos em `RunStats` (`docs/TELEMETRIA.md`):
- `rings`: segundo em que entrou em cada anel pela 1ª vez e **tempo total** em cada um;
- `retreats`: vezes que voltou ao acampamento com menos de 50% de vida (o recuo que se quer);
- `respawns`: monstros renascidos que o herói matou (XP de farm vs. XP de avanço);
- `deaths` por anel (já existe `death.depth`; passa a guardar o anel);
- `sessionSeconds` (sem tempo, a sessão é o que o jogador escolhe).

Metas do teste (comparar com a Cripta, mesma faixa de nível):
| Métrica | Meta |
|---|---|
| Taxa de extração (fuga + boss) | entre 55% e 75% (hoje a Cripta está acima disso; abaixo de 50% é frustração) |
| Recuos por hunt | ≥ 1 em metade das hunts |
| Sessão média | 6–12 min (celular) |
| Mortes | ≥ 60% no anel 3 ou no covil (morrer na orla = modelo errado) |
| Hunts seguidas no mesmo mapa pelo mesmo jogador | sobe (o "volto amanhã" do Tibia) |

---

## 5. Entregas, em ordem (um PR por bloco, cada um com `npm run check` verde)

Estado (branch `feat/fibula`): blocos 0 a 4 feitos; falta o 5 (deploy, com a migration `20261102310000_fibula.sql`,
e a medição).

| # | Bloco | Onde | Testes |
|---|---|---|---|
| 0 | **Limpar a branch atual**: tirar alarme por parede, Andarilho, dungeon desperta e patrulhas; manter perseguição, Cercado, Formação, bots no solo; Grito só se sobreviver ao 1º golpe | `monsterAi.ts`, `hunt.ts`, `threat.ts`, GDD, Regras | `comportamento` (reescrito), `bots`, `bestiario` |
| 1 | **Regras do modelo** (sem mapa ainda): `durationSeconds: 0`, regen fixa por `flatRegen`, respawn por `MapDef.respawn`, spawns fixos lidos de `Dungeon.spawns`; HUD sem relógio; limites do solo por hora + migration | `constants.ts`, `maps.ts`, `hunt.ts`, `solo.ts`, `hud`, `supabase/migrations` | `regenfixa`, `respawn` (arena, relógio falso), `solo`, `anfitriao` |
| 2 | **Gerador do mapa** com acampamento, 3 anéis, ≥2 passagens, covil, spawns por anel; entrada no `MAP_IDS`, `WORLD_ORDER`, banco (`map_id` nos checks, `map_unlocked_by`), `SOLO_LIMITS` | `dungeon.ts`, `maps.ts`, `world.ts`, migration | `maps`, `ritmo`, `entrada`, `xpmapas` (por anel), `campanha` |
| 3 | **Cliente**: arte do chão e paredes (reaproveitar o pincel/arte da Cripta ou do Charco), fogueira, ponto no mapa mundi (`verdemar.ts` + `npm run mapa`), ficha (`★★½`, `⏱ sem tempo`), Regras, Catálogo | `apps/client` | `arte`, `cenarios`, prévia em 412×915 e 915×412 |
| 4 | **Telemetria** (§4) e painel de leitura (`/balanceamento` lê os contadores novos) | `runStats.ts`, `telemetry.ts`, `docs/TELEMETRIA.md` | `catalogo`, revisão manual |
| 5 | **Deploy do mapa de teste** e 1–2 semanas de medição | `/deploy` | advisors do Supabase |

Estimativa: blocos 0–1 curtos (regras); bloco 2 é o maior (gerador + testes); bloco 3 depende da arte escolhida.

---

## 6. Riscos e como segurar

| Risco | Mitigação |
|---|---|
| **Farm infinito** (respawn + sem tempo) sobe a XP das magias e o gold sem teto | O teto de XP de uso das magias já existe; o teto de loot do solo vira por hora; medir gold/hora no bloco 4 e, se preciso, respawn mais lento no anel 3 |
| Nível 20 vira rotina (a curva do Tibia foi feita para hunt de 4–8 min) | Aceitar no mapa de teste; o anel 3 e o covil são balanceados para o 12–15, e o 20 vira "farmei muito" |
| Sessão longa no celular | Extração a qualquer momento pelo acampamento; a ficha e o HUD mostram o tempo decorrido |
| Respawn em cima do herói | Regra dos 8 tiles (§3.2) |
| Regen fixa deixa a hunt lenta demais no anel 3 | Fogueira ×4 e poções (o drop de poção já existe); se a telemetria mostrar sessões >15 min, subir `HP_REGEN_FLAT` |
| `RULES_VERSION` muda (gerador novo) | Esperado: o cliente recarrega sozinho |
| Troca de anfitrião na sala no aparelho perde o respawn | `respawnAt` entra em `INTERNALS`; o teste `anfitriao` confere |
| Jogador que já abriu a Cripta vê um cenário "novo" fechado no meio da trilha | Regra de desbloqueio "Grumak ou boss novo" (§2.1) |

---

## 7. Decisões em aberto (precisam de resposta antes do bloco 2)

1. **Nome e boss do covil.** Opções sem arte nova: promover o Ogro ou o Bugbear chefe a boss com `bossPower` e 2 fases;
   ou um boss novo (precisa de arte e habilidades: plano próprio, como a Fortaleza).
2. **Relógio no HUD:** esconder, ou mostrar o tempo decorrido?
3. **Regen de mana:** fixa também (1/s) ou mantém a percentual? Fixa pesa mais no Feiticeiro (100 de mana no nível 1).
4. **Respawn do mini-boss solto** (240 s) ou nunca?
5. **Valores iniciais** (regen 2/1 por s, fogueira ×4, respawn 60/90/120 s): aceitar como ponto de partida e ajustar
   pela telemetria, ou fazer uma rodada na arena antes?
