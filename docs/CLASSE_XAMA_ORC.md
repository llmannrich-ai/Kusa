# Xamã Orc — desenho da 5ª classe (proposta)

Status: **decisões 1 a 4 fechadas, 5 em aberto**, nada implementado. Números são de partida (nível 0) e vão para o
`/balanceamento` depois da Fase 1.

## 1. Conceito em uma frase

**O xamã da forja que Vorgak acorrentava.** Vencido o Senhor da Brasa, os xamãs do clã ficam livres e um deles
passa a lutar com o herói. Ele **planta totens** no chão e **muda o campo de batalha**: a força dele está em onde
ele luta, não só em quem ele acerta.

- Papel: **controle de zona e reforço da equipe** (o "comandante do terreno").
- Fantasia: cajado de osso com crânios, tambor de pele nas costas, rosto pintado de cinza e brasa, presas com anéis de
  latão, os grilhões quebrados ainda presos nos pulsos (a marca do desbloqueio).

## 2. Por que ela é diferente das 4 que existem

| Classe | O que faz | O que falta no elenco |
|---|---|---|
| Cavaleiro | segura na frente (corpo a corpo, provoca) | |
| Paladino | dano físico de longe, preciso | |
| Feiticeiro | dano elemental em explosão | |
| Druida | cura, criaturas que andam, veneno | |
| **Xamã Orc** | **estruturas fixas no chão** (totens) que pulsam sozinhas, reforço de ritmo para a equipe, e o único que **converte inimigos** | ninguém hoje joga pelo **posicionamento do grupo**: as magias saem e acabam; o totem fica |

Regra de ouro do desenho: o xamã é bom quando **escolhe o lugar da briga** (puxa os monstros para o totem, segura a
porta da sala). Isso combina com o princípio do GDD "o jogador se defende pela posição".

## 3. Desbloqueio

- **Regra:** a classe abre na conta quando **qualquer personagem** da conta vence **Vorgak** (`emberWarlord`) na
  Fortaleza Orc. Já existe o registro: `profile_boss_clears` (conta + classe + boss). Desbloqueio =
  `exists (... boss_kind = 'emberWarlord')` para qualquer `class_id` da conta. Sem tabela nova.
- **Regra no `packages/shared`:** `CLASS_UNLOCK: Partial<Record<ClassId, MonsterKind>> = { orcShaman: "emberWarlord" }`
  e `classUnlocked(bossClears, classId)`, repetidos no banco (`class_unlocked_by_boss`), como `UNLOCK_BOSS` faz com os mapas.
- **Servidor e banco recusam** hunt com classe trancada (`take_loadout`, `start_solo_run`): o cliente não decide.
- **Menu Heróis:** medalhão em silhueta escura com corrente e "🔒 Vença Vorgak na Fortaleza Orc". Tocar mostra a
  ficha da classe (papel, atributos) para criar desejo antes de liberar.
- **Momento da recompensa:** na tela de resultado da primeira vitória sobre Vorgak, uma carta própria:
  "⛓️ Os xamãs da forja estão livres — **Xamã Orc** liberado" com botão "Ver herói".
- **Campanha do xamã:** o progresso é por personagem (regra atual), então ele começa no Pântano. Ver Decisão 2.

## 4. Atributos (nível 1 e por nível)

| | Cavaleiro | Paladino | Feiticeiro | Druida | **Xamã Orc** |
|---|---|---|---|---|---|
| Vida | 150 (+15) | 120 (+12) | 100 (+8) | 100 (+8) | **135 (+12)** |
| Mana | 20 (+5) | 50 (+15) | 100 (+30) | 95 (+30) | **70 (+20)** |
| Dano | 12 (+2) | 10 (+2) | 14 (+3) | 9 (+2) | **11 (+2)** |
| Velocidade | 4 | 4,2 | 4 | 4 | **3,8** |
| Alcance do básico | 1 | 5 | 4 | 4 | **3** |

- **Básico: "Brasa do Cajado"** (`attackFx` novo `ember`): tiro que pode errar, alcance 3. Alcance curto e mais vida
  de propósito: o xamã fica **no meio** da briga, perto dos totens, não no fundo.
- Cor da classe: `0xd35400` (brasa).

## 5. Mecânica-assinatura: Totens

Um totem é um **campo no chão** (`state.fields`, como a estaca do Cordão de Flechas e a Muralha Mágica), com desenho
próprio: poste de madeira entalhada com o crânio e a chama da magia.

- **Limite:** 2 totens por xamã ao mesmo tempo (3 com o Traço Mãos de Entalhe). Plantar outro tira o mais antigo.
- **Mira:** igual à magia de área com alvo (arrastar e soltar; toque rápido planta na frente). Só em tile livre.
- **Não bloqueia passagem** (diferente da Muralha) e **os monstros não atacam o totem** na Fase 1 (simples e
  previsível). Totem atacável fica como opção para a Fase 3 (ver Riscos).
- **Pulso:** cada totem age no seu ritmo (ex.: a cada 1 s) sobre o raio dele. O dano conta para o dono (XP, loot,
  telemetria), como a estaca.
- **Sinergia de totens:** cada totem do xamã a até 4 tiles dá **+5% de força** às magias dele (máx. +10%, ou +15%
  com 3 totens). Recompensa ficar perto dos próprios totens sem precisar de barra nova no HUD: o número aparece
  como um anel em volta do herói, mais forte com mais totens.

## 6. Magias iniciais

| Slot | Magia | Efeito (nível 0) | Mana · recarga |
|---|---|---|---|
| 1 (nível 3) | 🔥 **Totem da Brasa** | planta um totem a até 4 tiles por 10 s; a cada 1 s, lança brasa (0,6×) no monstro mais perto a até 3 tiles | 22 · 8 s |
| 2 (nível 6) | 🥁 **Tambor de Guerra** | raio 4 em volta de si: você, os aliados e as criaturas atacam 25% mais rápido e causam +15% de dano por 6 s; monstros a até 2 tiles ficam 30% mais lentos por 3 s | 35 · 14 s |

- Maestria do Totem da Brasa: a brasa salta para mais um monstro.
- Maestria do Tambor de Guerra: cura 10% da vida de quem está no raio.
- O slot 1 já entrega o "jeito" da classe no primeiro minuto (o totem atirando sozinho); o slot 2 é o motivo de
  querer o xamã numa equipe.

## 7. Grimório: 3 ramos

Mesma estrutura das outras classes: raiz = Totem da Brasa, 3 ramos com tronco até 5 nós, Tomos, Áureas, costelas
(Fase 3) e especialização no pé com escolha permanente.

| Ramo | Tronco | Especialização |
|---|---|---|
| 🗿 **Totens** | Áurea da Madeira-de-Ferro → 🪨 Totem do Lodo (S1) → 🩸 Totem de Sangue (S2) → Áurea do Entalhe → 🏯 Grande Totem do Clã (S2) | ✦ **Entalhador** ou **Nômade** |
| 👻 **Ancestrais** | 👻 Espírito Ancestral (S1) → Áurea dos Ossos → 🐺 Lobo de Cinzas (S1) → 💀 Mau Agouro (S2) → 🦴 Guerreiros do Clã (S2) | ✦ **Domador de Sangue** ou **Vidente** |
| 🔥 **Brasa** | Áurea da Forja → 🔱 Lança de Brasa (S1) → 💥 Batida de Guerra (S2) → Áurea do Couro Curtido → ☄️ Chuva de Cinzas (S2) | ✦ **Coração de Brasa** ou **Tamboreiro** |

Tronco (nível 0):

- 🪨 **Totem do Lodo** (S1): totem por 10 s, raio 2, monstros dentro 40% mais lentos. Maestria: prende 1 s quem entra.
- 🩸 **Totem de Sangue** (S2): totem por 10 s, raio 2, você e os aliados dentro roubam 15% do dano como vida. Maestria: 25%.
- 🏯 **Grande Totem do Clã** (S2): totem por 12 s, raio 3; a cada 2 s pulsa 1,2× em volta e **repete o efeito de
  cada outro totem seu ativo** (lentidão, roubo de vida, brasa). Maestria: raio 4.
- 👻 **Espírito Ancestral** (S1): um espírito orc por 12 s que bate a até 1 tile e provoca o monstro que acerta. Maestria: 2 espíritos.
- 🐺 **Lobo de Cinzas** (S1): lobo por 15 s cuja mordida queima. Maestria: ao morrer, explode em brasa (raio 1, 1×).
- 💀 **Mau Agouro** (S2): amaldiçoa um alvo por 8 s (+20% de dano da equipe); se morrer amaldiçoado, a maldição pula
  para o monstro mais perto. Maestria: pula 2 vezes.
- 🦴 **Guerreiros do Clã** (S2): 2 guerreiros espectrais por 15 s. Maestria: 3.
- 🔱 **Lança de Brasa** (S1): linha de 5 tiles, 1,7× e queima 3 s. Maestria: deixa a reta em chamas 2 s.
- 💥 **Batida de Guerra** (S2): bate o cajado no chão, raio 2 em volta de si, 1,4× e atordoa 1 s. Maestria: raio 3.
- ☄️ **Chuva de Cinzas** (S2): campo de raio 3 no ponto mirado por 5 s, 0,4×/s e cega (monstros erram 30% dos golpes).
  Maestria: queima.

### Especializações

| Ramo | Lado | Traço (passiva) | Magia slot 1 | Magia slot 2 |
|---|---|---|---|---|
| Totens | **Entalhador** | 🪓 Mãos de Entalhe: cabem 3 totens e eles duram 50% mais | ⚡ Totem do Trovão Ancestral: a cada 2 s, raio em cadeia (1×, salta 2) | 🌋 Totem Vulcânico: dura 8 s e, ao acabar, **explode** em raio 3 (2,6×) e queima |
| Totens | **Nômade** | 🎒 Totem nas Costas: o último totem plantado **anda com você** (a aura acompanha), com metade da duração | 🐗 Investida do Javali: corre até 4 tiles, 1,3× e empurra, deixando um rastro em chamas 3 s | 🌀 Círculo de Totens: 4 totens pequenos em volta de si por 6 s; quem cruza o anel fica 50% mais lento e queima |
| Ancestrais | **Domador de Sangue** | ⛓️ Juramento de Sangue: monstro comum que morre perto de um totem seu tem 20% de chance de se levantar como espírito aliado por 10 s | 🔗 **Corrente da Submissão**: monstro comum abaixo de 30% da vida **vira seu aliado** por 12 s (não vale em mini-boss nem boss) | 👹 Chamar o Campeão: o espírito de um Chefe de Guerra Orc por 15 s (investida, giro e provoca) |
| Ancestrais | **Vidente** | 🐦‍⬛ Olho do Corvo: monstros amaldiçoados levam +10% e aparecem no minimapa | 🪶 Voo do Corvo: o corvo voa em linha de 7 tiles e marca todos que cruza (+15% de dano da equipe por 6 s) | 🌫️ Véu das Cinzas: campo de raio 3 por 6 s; aliados dentro cortam 30% do dano |
| Brasa | **Coração de Brasa** | 🔥 Herança de Vorgak: magias de dano queimam, e monstro que morre queimando espalha a queimadura em raio 1 | 🪓 **Fenda de Brasa**: linha de 6 tiles, 2×, queima e a fenda fica incandescente no chão 3 s | 🌋 **Fúria de Brasa**: raio 3 em volta de si, 1,8×, empurra 2 tiles, queima e cura 12% (recarga 25 s) |
| Brasa | **Tamboreiro** | 🥁 Ritmo de Guerra: a cada 4 básicos que acertam, a equipe a até 4 tiles ataca 8% mais rápido por 4 s (acumula até 3) | 🩸 Tambor de Sangue: aliados a até 4 tiles recuperam 10% da vida e causam +20% de dano por 5 s | 🥾 Marcha do Clã: a equipe anda 30% mais rápido e **não pode ser presa nem ficar lenta** por 6 s |

Os três ganchos que fazem a classe ser lembrada:

1. **Corrente da Submissão** (converter inimigo): nenhuma classe faz; vira história de jogador ("prendi o berserker e
   ele limpou a sala").
2. **Fenda e Fúria de Brasa**: o jogador **ganha os golpes do boss que derrotou**. Recompensa narrativa direta pelo
   desbloqueio.
3. **Marcha do Clã**: o único efeito do jogo contra prisão e lentidão, que hoje são as armas dos xamãs inimigos, do
   Ogro Xamã e do Gancho de Vorgak.

## 8. Visual e animação

- Base: o corpo dos orcs do Kosaradius (`apps/client/src/art/proto/orc.ts`, `orcArt.ts`), adaptado ao sistema de
  heróis vestidos (`art/hero/look.ts`): pele verde-cinza, presas, ombros largos.
- Itens: arma da família **cajado** (o mesmo `staff`/`arcane` do Feiticeiro e do Druida, ver Decisão 3) com crânio na
  ponta; o tambor nas costas é fixo da classe (não é item).
- Totens: poste entalhado com crânio de animal, chama da cor da magia no topo, fumaça. O raio aparece como no campo
  atual (tiles acesos). Sem tremor de câmera: a batida do tambor é uma onda no chão.
- Animações: parado (bate o tambor de leve), andar, básico (aponta o cajado), conjurar (crava o cajado), totem (finca o poste).

## 9. Telemetria

- Classe nova entra em sobrevivência por classe, fontes de dano e magias escolhidas sozinha (`class_id`).
- Novos contadores em `RunStats`: dano e cura **por totem** (fonte = magia do totem), tempo com N totens ativos,
  monstros convertidos e o dano que eles causaram, tempo de buff do Tambor dado a aliados (mede valor em equipe).

## 10. Riscos e contrapontos

1. **Quase ninguém vai liberar logo.** A Fortaleza é ★8, a mais difícil, e entrou ontem
   (`20261031210000_fortaleza_orc.sql`). A classe pode ficar meses sem teste real e sem telemetria. Mitigação:
   liberar para contas de desenvolvimento por flag, e medir quantas contas venceram Vorgak antes de fechar o
   desbloqueio. Alternativa a considerar: abrir também por **conquista acumulada** (ex.: 50 orcs xamãs mortos) para
   quem não passa da ★8.
2. **Custo de implementação é alto.** `ClassId` aparece em ~39 arquivos do cliente/servidor e as restrições
   `class_id in (...)` estão em várias tabelas e funções do banco (`profile_map_clears`, `profile_boss_clears`,
   equipamento por classe, `start_solo_run`...). Uma migration precisa trocar todas, e a arte do herói é um corpo novo.
   É o maior trabalho do projeto desde o Grimório. Por isso a entrega em fases.
3. **Força dependente da equipe.** Tambor e buffs valem pouco sozinho; o Pântano do Kosaradius é só solo. O Totem da
   Brasa precisa dar dano solo suficiente. A conta teórica do `balanco.ts` tem que incluir o xamã sozinho.
4. **Converter inimigo abre brechas.** Regras fechadas desde o início: só comuns; o convertido não larga loot nem XP
   ao morrer; não pode ser convertido de novo; chamados de boss não podem ser convertidos (senão Vorgak vira fábrica
   de aliados); máximo de 1 convertido por vez. Precisa de teste de arena.
5. **Totem parado x mobile.** Mirar o totem é igual a mirar área (já resolvido). O risco é o jogador iniciante plantar
   longe da briga: o toque rápido planta **na frente do herói**, que é onde a briga está.
6. **Desbloqueio pela hunt solo é creditado pelo cliente** (`record_solo_boss_clear`). Hoje isso já abre mapas; abrir
   uma classe pelo mesmo caminho é aceitável, mas é o mesmo nível de confiança, não mais.

## 11. Plano de implementação

| Fase | Entrega | Pronto quando |
|---|---|---|
| **1. Jogável (MVP)** | `orcShaman` em `classes.ts`; básico Brasa do Cajado; totem como campo; Totem da Brasa e Tambor de Guerra; arte base do herói orc; migration com a classe nas restrições do banco + `class_unlocked_by_boss`; desbloqueio no menu e na tela de resultado; recusa no servidor | teste de arena do totem e do tambor (`apps/server/scripts/arena.ts`), teste de desbloqueio, `npm run check` verde |
| **2. Grimório (tronco)** | 3 ramos com tronco, Áureas e Tomos no `talents.ts` e no banco; criaturas novas em `summons.ts` (espírito, lobo de cinzas, guerreiro) | compra pelo `buy_talent`, catálogo e Regras mostram tudo |
| **3. Especializações** | 6 Traços, 12 magias, costelas e Maestrias; conversão de monstro | teste de arena por efeito novo (`efeitos.ts`), regras de conversão cobertas |
| **4. Balanceamento** | `/balanceamento` com a conta teórica e a telemetria das primeiras hunts | xamã solo e em equipe dentro da faixa das outras classes |

Fase 1 sozinha já é um PR grande; as outras são PRs separados.

## 12. Decisões

Respondidas em 2026-11-01:

| # | Decisão | Escolha |
|---|---|---|
| 1 | Nome da classe | **Xamã Orc** |
| 2 | Campanha | **Começa no Pântano**, como todo personagem (progresso por personagem, regra atual) |
| 3 | Equipamento | **Cajados e itens arcanos** que já existem (os mesmos do Feiticeiro e do Druida); nenhum item novo |
| 4 | Desbloqueio | **Só vencendo Vorgak**, sem conquista alternativa |
| 5 | Totem atacável pelos monstros | **Em aberto** (falta explicar o que é o totem; ver seção 5) |

Consequências:

- Decisão 4 deixa o risco 1 da seção 10 de pé: pouca gente vai liberar no começo. Para testar e balancear, a classe
  precisa ser liberada à mão nas contas de desenvolvimento (no banco, um registro em `profile_boss_clears` com
  `emberWarlord`), sem mudar a regra para os jogadores.
- Decisão 3: na migration, o Xamã Orc entra no mesmo grupo do `staff`/`arcane` (`class_id in ('sorcerer', 'druid')`
  passa a incluir `orcShaman`).
