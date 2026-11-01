# Xamã Orc — desenho da 5ª classe

Status: **desenho fechado** (decisões na seção 12), nada implementado. Números são de partida (nível 0) e vão para o
`/balanceamento` depois da Fase 1.

## 1. Conceito em uma frase

**O xamã da forja que Vorgak acorrentava.** Vencido o Senhor da Brasa, os xamãs do clã ficam livres e um deles
passa a lutar com o herói. Ele **planta totens** no chão e **chama o clã libertado para a briga**: quanto mais avança
no Grimório, maior e mais forte fica a horda que o segue.

Dois pilares:

1. **Totens:** postes mágicos fincados no chão que agem sozinhos por alguns segundos. Ele escolhe **onde** a briga acontece.
2. **Horda:** a maior coleção de magias de invocação do jogo, todas de orcs e ogros, do batedor ao Chefe de Guerra.
   Ele escolhe **com quem** briga.

- Papel: **comandante de campo** (controle de zona, exército, reforço da equipe).
- Fantasia: cajado de osso com crânios, tambor de pele nas costas, rosto pintado de cinza e brasa, presas com anéis de
  latão, os grilhões quebrados ainda presos nos pulsos (a marca do desbloqueio).

## 2. Por que ela é diferente das 4 que existem

| Classe | O que faz |
|---|---|
| Cavaleiro | segura na frente (corpo a corpo, provoca) |
| Paladino | dano físico de longe, preciso |
| Feiticeiro | dano elemental em explosão |
| Druida | cura, feras que andam, veneno |
| **Xamã Orc** | **estruturas fixas no chão** (totens), um **exército com papéis** (quem segura, quem atira, quem salta, quem comanda) e o único que **converte inimigos** |

**Horda x feras do Druida.** O Druida também invoca, então a diferença precisa ser clara:

| | Druida (Mestre das Feras) | Xamã Orc (Horda) |
|---|---|---|
| Criaturas | feras soltas, cada uma por si | um **clã com hierarquia**: o Capitão e o Chefe de Guerra **comandam** os outros orcs |
| Papéis | morder, curar, voar | segurar (lanceiro), atirar (arqueiro), saltar (berserker), comandar (capitão), esmagar (ogro) |
| Liga com | Grito da Fera | **totens**: orc invocado perto de um totem do xamã fica mais forte |
| Montagem | mais criaturas | **composição**: o jogador monta a horda certa para o mapa |

Regra de ouro do desenho: o xamã é bom quando **escolhe o lugar e a formação** da briga (totens na porta da sala,
lanceiros na frente, arqueiros atrás). Isso combina com o princípio do GDD "o jogador se defende pela posição".

## 3. Desbloqueio

- **Regra:** a classe abre na conta quando **qualquer personagem** da conta vence **Vorgak** (`emberWarlord`) na
  Fortaleza Orc. **Não há outro jeito** de liberar. O registro já existe: `profile_boss_clears` (conta + classe +
  boss). Desbloqueio = `exists (... boss_kind = 'emberWarlord')` para qualquer `class_id` da conta. Sem tabela nova.
- **Regra no `packages/shared`:** `CLASS_UNLOCK: Partial<Record<ClassId, MonsterKind>> = { orcShaman: "emberWarlord" }`
  e `classUnlocked(bossClears, classId)`, repetidos no banco (`class_unlocked_by_boss`), como `UNLOCK_BOSS` faz com os mapas.
- **Servidor e banco recusam** hunt com classe trancada (`take_loadout`, `start_solo_run`): o cliente não decide.
- **Menu Heróis:** medalhão em silhueta escura com corrente e "🔒 Vença Vorgak na Fortaleza Orc". Tocar mostra a
  ficha da classe (papel, atributos) para criar desejo antes de liberar.
- **Momento da recompensa:** na tela de resultado da primeira vitória sobre Vorgak, uma carta própria:
  "⛓️ Os xamãs da forja estão livres — **Xamã Orc** liberado" com botão "Ver herói".
- **Campanha:** começa no Pântano, como qualquer personagem (progresso por personagem, regra atual).
- **Teste e balanceamento:** nas contas de desenvolvimento, a classe é liberada à mão no banco (um registro em
  `profile_boss_clears` com `emberWarlord`), sem mudar a regra dos jogadores.

## 4. Atributos (nível 1 e por nível)

| | Cavaleiro | Paladino | Feiticeiro | Druida | **Xamã Orc** |
|---|---|---|---|---|---|
| Vida | 150 (+15) | 120 (+12) | 100 (+8) | 100 (+8) | **135 (+12)** |
| Mana | 20 (+5) | 50 (+15) | 100 (+30) | 95 (+30) | **70 (+20)** |
| Dano | 12 (+2) | 10 (+2) | 14 (+3) | 9 (+2) | **11 (+2)** |
| Velocidade | 4 | 4,2 | 4 | 4 | **3,8** |
| Alcance do básico | 1 | 5 | 4 | 4 | **3** |

- **Básico: "Brasa do Cajado"** (`attackFx` novo `ember`): tiro que pode errar, alcance 3. Alcance curto e mais vida
  de propósito: o xamã fica **no meio** da briga, junto da horda e dos totens, não no fundo.
- A vida das criaturas é uma fração da vida do dono (`summonStats`): a vida alta do xamã também deixa a horda mais robusta.
- Cor da classe: `0xd35400` (brasa).
- **Equipamento:** os cajados e itens arcanos que já existem (os do Feiticeiro e do Druida). Nenhum item novo.

## 5. Pilar 1: Totens

Um totem é um **poste mágico que o xamã finca no chão** e que age sozinho enquanto dura. Tecnicamente é um campo no
chão (`state.fields`, como a estaca do Cordão de Flechas e a Muralha Mágica), com desenho próprio: poste de madeira
entalhada com o crânio e a chama da magia.

- **Sem vida:** os monstros não atacam o totem. Ele dura o tempo da magia e some. Simples e previsível no celular.
- **Não bloqueia passagem** (diferente da Muralha).
- **Limite:** 2 totens por xamã ao mesmo tempo (3 com o Traço Mãos de Entalhe). Plantar outro tira o mais antigo.
- **Mira:** igual à magia de área com alvo (arrastar e soltar; toque rápido planta na frente). Só em tile livre.
- **Pulso:** cada totem age no seu ritmo (ex.: a cada 1 s) sobre o raio dele. O dano conta para o dono (XP, loot,
  telemetria), como a estaca.
- **Força perto dos totens:** cada totem do xamã a até 4 tiles dá **+5% de força** às magias dele (máx. +10%, ou
  +15% com 3 totens). Sem barra nova no HUD: um anel em volta do herói, mais forte com mais totens.
- **Totem + horda:** orc ou ogro invocado a até 3 tiles de um totem do xamã causa **+15% de dano**. É o que amarra os
  dois pilares.

## 6. Pilar 2: Horda

As invocações do xamã são **orcs e ogros do clã libertado**: as mesmas espécies do Pântano do Kosaradius e da
Fortaleza, agora do lado do herói. Elas seguem as regras das criaturas que já existem (`summons.ts`): seguem o dono,
caçam o alvo dele, os monstros as atacam, XP e loot do que matam vão para o dono, e conjurar de novo substitui as da
mesma magia.

- **Limite:** o mesmo de hoje, **6 criaturas vivas por jogador** (`MAX_SUMMONS_PER_PLAYER`). A horda cresce em
  **qualidade** com o Grimório, não em quantidade: com 4 xamãs na equipe já são 24 criaturas na tela de 9 tiles.
- **Aliado tem cara de aliado:** em mapas de orcs (Pântano do Kosaradius, Fortaleza) a horda é da mesma espécie dos
  inimigos. Todo orc invocado leva **pintura de guerra cor de brasa, o grilhão quebrado no pulso e o anel aliado nos
  pés**, e a barra de vida na cor da equipe. Sem isso o jogador mira no próprio orc.
- **Comportamentos que faltam nas criaturas** (já existem nos monstros e serão reaproveitados): liderança (Comando),
  salto, manter distância (arqueiro) e frenesi. As criaturas já têm provocação, prisão, atordoamento e cura.

### O clã (criaturas novas em `summons.ts`)

Vida em fração da vida do xamã; dano em múltiplo do dano base dele (mesma conta das criaturas atuais).

| Criatura | Vida | Dano | Alcance | Papel e habilidade |
|---|---|---|---|---|
| 🏃 Orc batedor | 0,25 | 0,4 | 1 | rápido (5,5), chega primeiro e distrai |
| 🛡️ Orc lanceiro | 0,8 | 0,5 | 1 | **provoca** quem acerta: segura a linha |
| 🏹 Orc arqueiro | 0,3 | 0,6 | 5 | atira de longe e **recua** quando o monstro chega perto |
| 🪓 Orc berserker | 0,6 | 1,0 | 1 | **salta** no monstro a até 5 tiles; abaixo de 50% da vida bate 40% mais rápido |
| 🚩 Orc capitão | 0,7 | 0,6 | 1 | **Comando:** orcs e ogros invocados a até 3 tiles causam +15% de dano e atacam 15% mais rápido |
| 🌿 Orc xamã aliado | 0,4 | 0,3 | 4 | **cura** os orcs invocados perto (5%) e prende o monstro que acerta (Lama Agarrada, 1 s) |
| 🔨 Ogro da Forja | 1,4 | 1,0 | 1 | pancada em brasa que **empurra** 1 tile e queima |
| 👑 Chefe de Guerra Orc | 1,6 | 1,2 | 1 | **investida**, golpe giratório em volta e Comando (+20%) |
| ⛓️ Ogro Acorrentado | 1,8 | 1,1 | 1 | **pisão** em raio 2 (lentidão) e provoca; ao acabar o tempo, arrebenta as correntes e atordoa em raio 2 |

A arte é a dos monstros do clã (`art/proto/orc.ts`, `orcArt.ts`, a do Kosaradius), com a pintura de aliado por cima:
custo de arte baixo para muitas criaturas.

## 7. Magias iniciais

| Slot | Magia | Efeito (nível 0) | Mana · recarga |
|---|---|---|---|
| 1 (nível 3) | 🔥 **Totem da Brasa** | planta um totem a até 4 tiles por 10 s; a cada 1 s, lança brasa (0,6×) no monstro mais perto a até 3 tiles | 22 · 8 s |
| 2 (nível 6) | 🥁 **Tambor de Guerra** | raio 4 em volta de si: você, os aliados e as criaturas atacam 25% mais rápido e causam +15% de dano por 6 s; monstros a até 2 tiles ficam 30% mais lentos por 3 s | 35 · 14 s |

- Maestria do Totem da Brasa: a brasa salta para mais um monstro.
- Maestria do Tambor de Guerra: cura 10% da vida de quem está no raio (criaturas incluídas).
- O slot 1 já mostra o primeiro pilar no primeiro minuto. A horda vem do Grimório: a **primeira compra** do ramo Horda
  (Chamar Batedores, 150 de gold) já abre a primeira invocação.

## 8. Grimório: 3 ramos

Mesma estrutura das outras classes: raiz = Totem da Brasa, 3 ramos com tronco até 5 nós, Tomos, Áureas, costelas
(Fase 3) e especialização no pé com escolha permanente. **9 das magias invocam orcs ou ogros**, espalhadas pelos 3
ramos, e mais 2 efeitos convertem monstros em aliados.

| Ramo | Tronco | Especialização |
|---|---|---|
| 🪓 **Horda** | 🏃 Chamar Batedores (S1) → Áurea do Clã → 🛡️ Lanceiros do Clã (S1) → 🏹 Arqueiros do Clã (S2) → 🚩 Capitão do Clã (S2) | ✦ **Senhor da Horda** ou **Domador de Sangue** |
| 🗿 **Totens** | Áurea da Madeira-de-Ferro → 🪨 Totem do Lodo (S1) → 📯 Totem do Chamado (S2) → Áurea do Entalhe → 🏯 Grande Totem do Clã (S2) | ✦ **Entalhador** ou **Nômade** |
| 🔥 **Brasa** | Áurea da Forja → 🔱 Lança de Brasa (S1) → 💥 Batida de Guerra (S2) → Áurea do Couro Curtido → 🔨 Ogro da Forja (S2) | ✦ **Coração de Brasa** ou **Tamboreiro** |

### A escada da horda (quando cada orc aparece)

| Profundidade | Preço | Invocação | Ramo |
|---|---|---|---|
| 1 | 150 | 🏃 Batedores | Horda |
| 3 | 500 | 🛡️ Lanceiros | Horda |
| 3 | 500 | 📯 Totem do Chamado (batedores sem parar) | Totens |
| 4 | 800 | 🏹 Arqueiros | Horda |
| 5 | 1.200 | 🚩 Capitão | Horda |
| 5 | 1.200 | 🔨 Ogro da Forja | Brasa |
| costela | 800 | 🌿 Orc xamã aliado | Horda |
| especialização | 1.200 | 🪓 Berserker / ⛓️ Corrente da Submissão | Horda |
| especialização | 1.600 | 👑 Chefe de Guerra / ⛓️ Ogro Acorrentado | Horda |

Começa com orcs fracos e numerosos e termina com poucos campeões fortes. Cada compra muda a horda de um jeito que o
jogador sente na hunt seguinte.

### Tronco (nível 0)

- 🏃 **Chamar Batedores** (S1): 2 Orcs batedores por 12 s. Maestria: 3 batedores.
- 🛡️ **Lanceiros do Clã** (S1): 2 Orcs lanceiros por 15 s, que provocam. Maestria: os lanceiros cortam 30% do dano recebido.
- 🏹 **Arqueiros do Clã** (S2): 2 Orcs arqueiros por 15 s. Maestria: as flechas queimam.
- 🚩 **Capitão do Clã** (S2): 1 Orc capitão por 18 s (Comando). Maestria: o capitão chega com 1 batedor de escolta e o Comando sobe para +25%.
- 🪨 **Totem do Lodo** (S1): totem por 10 s, raio 2, monstros dentro 40% mais lentos. Maestria: prende 1 s quem entra.
- 📯 **Totem do Chamado** (S2): totem por 12 s que chama um Orc batedor a cada 4 s (até 3 do totem vivos). Maestria: chama um lanceiro a cada 3º chamado.
- 🏯 **Grande Totem do Clã** (S2): totem por 12 s, raio 3; a cada 2 s pulsa 1,2× em volta e **repete o efeito de
  cada outro totem seu ativo**. Maestria: raio 4.
- 🔱 **Lança de Brasa** (S1): linha de 5 tiles, 1,7× e queima 3 s. Maestria: deixa a reta em chamas 2 s.
- 💥 **Batida de Guerra** (S2): bate o cajado no chão, raio 2 em volta de si, 1,4× e atordoa 1 s. Maestria: raio 3.
- 🔨 **Ogro da Forja** (S2): 1 Ogro da Forja por 15 s, com malho em brasa. Maestria: ao morrer ou acabar o tempo, explode em brasa (raio 2, 1,5×).

### Costelas (Fase 3, primeira lista)

- Horda: Lanceiros → 🌿 **Orc Xamã Aliado** (S1, cura a horda) → 💀 **Mau Agouro** (S2, maldição +20% de dano da
  equipe; se o alvo morrer, pula para o mais perto).
- Totens: Totem do Lodo → 🩸 **Totem de Sangue** (S2, raio 2, roubo de vida de 15% para aliados e criaturas dentro).
- Brasa: Lança de Brasa → ☄️ **Chuva de Cinzas** (S2, campo raio 3 por 5 s, 0,4×/s e cega: monstros erram 30% dos golpes).

### Especializações

| Ramo | Lado | Traço (passiva) | Magia slot 1 | Magia slot 2 |
|---|---|---|---|---|
| Horda | **Senhor da Horda** | 📣 Grito do Clã: orcs e ogros invocados com +25% de vida e de dano | 🪓 **Berserkers do Clã**: 2 Orcs berserkers por 15 s, que saltam nos monstros | 👑 **Chefe de Guerra**: 1 Chefe de Guerra Orc por 20 s (investida, giro e Comando +20%) |
| Horda | **Domador de Sangue** | ⛓️ Juramento de Sangue: monstro comum que morre perto de um totem seu tem 20% de chance de se levantar como aliado por 10 s | 🔗 **Corrente da Submissão**: monstro comum abaixo de 30% da vida **vira seu aliado** por 12 s (não vale em mini-boss nem boss) | ⛓️ **Ogro Acorrentado**: 1 Ogro do Brejo acorrentado por 15 s; ao acabar, arrebenta as correntes e atordoa em raio 2 |
| Totens | **Entalhador** | 🪓 Mãos de Entalhe: cabem 3 totens e eles duram 50% mais | ⚡ Totem do Trovão Ancestral: a cada 2 s, raio em cadeia (1×, salta 2) | 🌋 Totem Vulcânico: dura 8 s e, ao acabar, **explode** em raio 3 (2,6×) e queima |
| Totens | **Nômade** | 🎒 Totem nas Costas: o último totem plantado **anda com você** (a aura acompanha), com metade da duração | 🐗 Investida do Javali: corre até 4 tiles, 1,3× e empurra, deixando um rastro em chamas 3 s | 🌀 Círculo de Totens: 4 totens pequenos em volta de si por 6 s; quem cruza o anel fica 50% mais lento e queima |
| Brasa | **Coração de Brasa** | 🔥 Herança de Vorgak: magias de dano queimam, e monstro que morre queimando espalha a queimadura em raio 1 | 🪓 **Fenda de Brasa**: linha de 6 tiles, 2×, queima e a fenda fica incandescente no chão 3 s | 🌋 **Fúria de Brasa**: raio 3 em volta de si, 1,8×, empurra 2 tiles, queima e cura 12% (recarga 25 s) |
| Brasa | **Tamboreiro** | 🥁 Ritmo de Guerra: a cada 4 básicos que acertam, a equipe e a horda a até 4 tiles atacam 8% mais rápido por 4 s (acumula até 3) | 🩸 Tambor de Sangue: aliados e criaturas a até 4 tiles recuperam 10% da vida e causam +20% de dano por 5 s | 🥾 Marcha do Clã: a equipe anda 30% mais rápido e **não pode ser presa nem ficar lenta** por 6 s |

Maestrias das especializações: 3 berserkers; o Chefe de Guerra chega com 2 batedores; a Corrente vale em monstro
abaixo de 40%; o Ogro Acorrentado provoca em raio 3; 3 raios por pulso no Totem do Trovão; explosão vulcânica em
raio 4; o totem nas costas dura o tempo inteiro; a investida atordoa 1 s; a fenda dura 5 s; a Fúria cura 20%; o
Tambor de Sangue tira lentidão e prisão; a Marcha dura 9 s.

**Regras da conversão** (Corrente da Submissão e Juramento de Sangue): só monstros comuns; o convertido não larga
loot nem XP ao morrer e não volta a ser inimigo; monstro chamado por boss ou mini-boss não pode ser convertido
(senão Vorgak vira fábrica de aliados); no máximo 1 convertido por vez, e ele conta no limite de 6 criaturas.

### Os ganchos que fazem a classe ser lembrada

1. **Montar o exército:** a horda cresce de batedores a um Chefe de Guerra, e a escolha de quais orcs levar muda a hunt.
2. **Corrente da Submissão:** converter um inimigo. Nenhuma classe faz; vira história de jogador ("prendi o
   berserker e ele limpou a sala").
3. **Fenda e Fúria de Brasa:** o jogador **ganha os golpes do boss que derrotou**.
4. **Marcha do Clã:** o único efeito do jogo contra prisão e lentidão, que hoje são as armas dos xamãs inimigos, do
   Ogro Xamã e do Gancho de Vorgak.

## 9. Visual e animação

- Herói: o corpo dos orcs do Kosaradius (`apps/client/src/art/proto/orc.ts`, `orcArt.ts`), adaptado ao sistema de
  heróis vestidos (`art/hero/look.ts`): pele verde-cinza, presas, ombros largos. O tambor nas costas é fixo da classe.
- Horda: a arte dos monstros do clã com a marca de aliado (pintura de brasa, grilhão quebrado, anel nos pés).
- Totens: poste entalhado com crânio de animal, chama da cor da magia no topo, fumaça. O raio aparece como no campo
  atual (tiles acesos). Sem tremor de câmera: a batida do tambor é uma onda no chão.
- Animações do herói: parado (bate o tambor de leve), andar, básico (aponta o cajado), conjurar (crava o cajado),
  totem (finca o poste), chamado (ergue o cajado e o tambor ressoa; os orcs saem de um círculo de brasa no chão).

## 10. Telemetria

- Classe nova entra em sobrevivência por classe, fontes de dano e magias escolhidas sozinha (`class_id`).
- Novos contadores em `RunStats`: dano **por tipo de criatura do clã** e por totem; tempo com N criaturas e N totens
  ativos; quantas criaturas morreram e para quem; monstros convertidos e o dano que eles causaram; tempo de buff do
  Tambor e do Comando dado a aliados (mede valor em equipe).

## 11. Riscos e contrapontos

1. **Quase ninguém vai liberar logo.** A Fortaleza é ★8, a mais difícil, e entrou em 31/10
   (`20261031210000_fortaleza_orc.sql`); o desbloqueio é só por Vorgak. A classe vai ficar um tempo sem telemetria
   real. Mitigação: liberação à mão nas contas de desenvolvimento e balanceamento pela conta teórica (`balanco.ts`).
2. **Custo de implementação é alto.** `ClassId` aparece em ~39 arquivos do cliente/servidor e as restrições
   `class_id in (...)` estão em várias tabelas e funções do banco. Somam-se 9 criaturas novas com comportamentos que
   hoje só os monstros têm (Comando, salto, recuo, frenesi). É o maior trabalho do projeto desde o Grimório: por
   isso a entrega em fases.
3. **Tela cheia e servidor carregado.** Até 6 criaturas por xamã; numa equipe de 4 xamãs na Fortaleza (cerca de 130
   monstros) são 24 aliados a mais andando e procurando caminho. Medir o custo do pathfinding e o FPS no celular na
   Fase 2; se pesar, o limite cai para 4 criaturas por xamã.
4. **Aliado igual ao inimigo.** Nos mapas de orcs, a horda é da mesma espécie dos monstros. Sem a marca de aliado
   bem visível, o jogador erra a mira e não entende a briga. A marca entra junto com a primeira criatura, não depois.
5. **Sobreposição com o Druida.** As duas classes invocam. A diferença (hierarquia, papéis, totens) tem que aparecer
   na hunt, não só no texto: o Capitão e o Chefe de Guerra precisam mudar visivelmente a força dos outros orcs.
6. **Força dependente da equipe e da horda.** Tambor e buffs valem pouco sozinho; o Pântano do Kosaradius é só solo.
   O Totem da Brasa e a horda precisam dar dano solo suficiente. A conta teórica tem que incluir o xamã sozinho.
7. **Converter inimigo abre brechas.** Regras fechadas na seção 8 e cobertas por teste de arena.
8. **Totem parado x mobile.** O toque rápido planta **na frente do herói**, que é onde a briga está.
9. **Desbloqueio pela hunt solo é creditado pelo cliente** (`record_solo_boss_clear`), como já acontece com os
   mapas. Mesmo nível de confiança, não mais.

## 12. Plano de implementação

| Fase | Entrega | Pronto quando |
|---|---|---|
| **1. Jogável (MVP)** | `orcShaman` em `classes.ts`; básico Brasa do Cajado; totem como campo; Totem da Brasa e Tambor de Guerra; arte base do herói orc; migration com a classe nas restrições do banco (grupo `staff`/`arcane`) + `class_unlocked_by_boss`; desbloqueio no menu e na tela de resultado; recusa no servidor | teste de arena do totem e do tambor (`apps/server/scripts/arena.ts`), teste de desbloqueio, `npm run check` verde |
| **2. Horda e Grimório (tronco)** | comportamentos de criatura (Comando, salto, recuo, frenesi); criaturas do clã do tronco (batedor, lanceiro, arqueiro, capitão, Ogro da Forja) com a marca de aliado; 3 ramos com tronco, Áureas e Tomos no `talents.ts` e no banco | teste de arena de cada criatura e do Comando; medição de FPS e servidor com 4 xamãs; compra pelo `buy_talent` |
| **3. Especializações** | 6 Traços, 12 magias (berserker, Chefe de Guerra, Ogro Acorrentado, conversão), costelas e Maestrias | teste de arena por efeito novo (`efeitos.ts`), regras de conversão cobertas |
| **4. Balanceamento** | `/balanceamento` com a conta teórica e a telemetria das primeiras hunts | xamã solo e em equipe dentro da faixa das outras classes |

Cada fase é um PR separado.

## 13. Decisões

Respondidas em 2026-11-01:

| # | Decisão | Escolha |
|---|---|---|
| 1 | Nome da classe | **Xamã Orc** |
| 2 | Campanha | **Começa no Pântano**, como todo personagem (progresso por personagem, regra atual) |
| 3 | Equipamento | **Cajados e itens arcanos** que já existem (os mesmos do Feiticeiro e do Druida); nenhum item novo |
| 4 | Desbloqueio | **Só vencendo Vorgak**, sem conquista alternativa |
| 5 | Totem atacável pelos monstros | **Não**: o totem não tem vida, dura o tempo da magia |
| 6 | Identidade | **Muitas magias de invocação de orcs** que crescem com o Grimório (pilar Horda) |
