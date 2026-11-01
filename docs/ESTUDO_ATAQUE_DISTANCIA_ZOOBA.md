# Estudo: ataque à distância no Zooba e o que serve para o Kusa

Referência: **Zooba** (Wildlife Studios), battle royale mobile visto de cima, com dois polegares.

> **Fonte e limites.** Esta sessão não conseguiu abrir a wiki do Zooba (`zooba.fandom.com`) nem as notas de patch
> (`wildlifestudios.com`): os dois sites estão fora da rede liberada. A descrição abaixo vem do que se sabe do jogo
> e de trechos das notas de patch que apareceram na busca. Os números de cada arma **precisam ser conferidos no jogo**
> antes de virar regra no Kusa.

---

## 1. Como o Zooba faz

### 1.1 Controle (o núcleo)

| Gesto no botão de ataque | O que acontece |
|---|---|
| **Toque rápido** | Atira sozinho no inimigo visível mais próximo dentro do alcance (mira automática). |
| **Segurar e arrastar** | Aparece a mira desenhada no chão, saindo do personagem; o arrasto escolhe a direção (e, nas armas de arremesso, a distância). |
| **Soltar** | Dispara para onde a mira aponta. |
| **Arrastar de volta ao centro** | Cancela o tiro. |

O jogador escolhe a cada tiro: rápido e garantido (toque) ou preciso e arriscado (arrasto).

### 1.2 O projétil existe no mapa

- Ele voa com velocidade própria (o atributo **Velocity** aumenta essa velocidade) e pode **errar**.
- O alvo vê o tiro chegando e pode **sair da frente**. Acertar depende de prever para onde o alvo vai.
- Parede e obstáculo param o tiro. Arremessos passam por cima e caem num ponto.
- O alcance é um atributo da arma (**Range**). Fora dele, o tiro some.
- O arbusto esconde quem está dentro, e atacar entrega a posição.

### 1.3 As armas se definem pelo formato da mira

| Família | Formato da mira | Papel |
|---|---|---|
| Arco / rifle | Linha fina e longa | Alvo único, longe, recompensa a precisão. |
| Espingarda | Leque curto, com vários projéteis | Dano alto de perto que cai com a distância. Perdoa erro de mira. |
| Arremesso (bomba, granada) | Círculo no ponto de queda | Passa por cima de obstáculo, dano em área, expulsa quem está escondido. |
| Corpo a corpo | Arco curto na frente | Dano alto, exige chegar perto. |

### 1.4 Ritmo: cargas e recarga

- A arma tem uma barra de munição em segmentos. Cada tiro gasta um segmento, que volta com o tempo.
- O jogador decide entre soltar a rajada toda ou guardar munição para o próximo encontro.
- O balanceamento mexe direto nesse tempo. Exemplo de patch: a recarga do Arrow caiu de 4 s para 3 s.

### 1.5 Habilidade ativa com mira própria

Cada personagem tem uma habilidade com recarga, mirada pelo mesmo gesto. Exemplo próximo do Kusa: **High Ground**
(Pepper) aumenta o alcance e a visão, mas deixa o personagem parado. É a mesma ideia da 🔭 Postura do Atirador do
Paladino.

---

## 2. Kusa hoje x Zooba

| Ponto | Kusa hoje | Zooba |
|---|---|---|
| Ataque básico | Segura ⚔️ e o servidor escolhe o alvo (travado ou o mais próximo ao alcance). O projétil é teleguiado e **nunca erra** (o dano entra quando chega). | Tiro mirado, que pode errar. |
| Mira das magias | Arrastar a partir do botão, toque rápido no alvo automático, mira que gruda no monstro a até 1 tile, voltar ao botão cancela. **Já é o modelo do Zooba.** | Mesmo gesto. |
| Formatos de mira | Alvo único, área (quadrado), linha (Disparo Perfurante), leque (Barragem), aliado. | Linha, leque, círculo de arremesso, arco curto. |
| Errar | Só na magia mirada à mão ("Errou a mira"). | Em qualquer tiro. |
| Projétil de monstro | **Acerta no disparo**, sem aviso (princípio "difícil e injusto como a vida"). | Desviável. Desviar é metade do jogo. |
| Ritmo do básico | Cadência fixa enquanto o botão está apertado. | Cargas mais recarga. |
| Alcance | Fixo por classe (Paladino 5, Druida e Feiticeiro 4, Cavaleiro 1), com tela de 9 tiles. | Por arma, com atributo de alcance. |

**Resumo:** o Kusa já copiou o que o Zooba tem de melhor no **gesto** de mira (nas magias). A diferença está na
**física**: no Zooba o tiro é um objeto que erra e se desvia, no Kusa o tiro é uma animação de um acerto já decidido.

---

## 3. Análise crítica: o que não traduz

1. **O Zooba é PvP, o Kusa é PvE de horda.** Mirar à mão cada tiro contra um jogador que desvia é o jogo do Zooba.
   Contra 8 monstros andando em tiles, mirar à mão cada básico cansa o polegar e não acrescenta decisão. **Não troque o
   básico automático por tiro mirado obrigatório.**
2. **Grade de tiles.** No Kusa monstro e herói andam tile a tile. Desviar de um projétil exige movimento contínuo e
   fino. Em grade, ou o projétil é lento a ponto de ser trivial, ou o desvio vira sorte.
3. **Latência com servidor autoritativo.** Um projétil que pode errar precisa ser simulado no servidor (`Hunt`), e
   o que o jogador vê chega com atraso. No multiplayer pela rede, o jogador vai "ver" que desviou e tomar o dano
   assim mesmo. A hunt solo e a sala no aparelho rodam local e não têm esse problema.
4. **Conflito com o GDD.** Projétil de monstro desviável é, na prática, um **aviso** (o jogador vê o tiro e reage).
   Isso contraria o princípio "nenhum golpe de monstro tem aviso". Mudar isso é uma decisão de design sua, não um
   ajuste técnico.

---

## 4. O que vale trazer (em ordem de retorno/custo)

### A. Mira manual opcional no básico (custo baixo, retorno médio)
- Toque e segurar no ⚔️ continuam como hoje (automático).
- **Arrastar o ⚔️** atira na direção mirada, como uma magia de linha sem custo: acerta o primeiro monstro da reta e
  pode errar.
- Serve para escolher alvo no meio da horda sem travar o alvo antes (hoje são 2 toques).
- Sem bônus de dano: é só controle. Bônus faria a mira à mão virar obrigatória, o que cai no problema do item 3.1.
- Onde mexe: `apps/client/src/input.ts` (gesto), `MSG` novo ou campo de direção na mensagem de ataque em
  `packages/shared/src/messages.ts` (muda o `RULES_VERSION` sozinho), resolução em `hunt.ts`.

### B. Formatos de mira que faltam (custo médio, retorno alto em variedade)
- **Leque curto com queda por distância** (a "espingarda"): ótimo para uma magia de Caçador ou Batedor. Dano cheio
  colado, menos dano longe. Recompensa ficar perto em vez de mirar bem.
- **Arremesso por cima de parede**: hoje o ponto das magias de área "para na primeira parede". Uma magia em arco que
  ignora parede (granada, frasco de veneno) abre jogada de esquina, que hoje não existe.
- Os dois cabem na mira por arrasto que já existe. Teste com `apps/server/scripts/arena.ts`.

### C. Cargas em magias escolhidas (custo médio, retorno médio)
- Algumas magias com **2 cargas** e recarga por carga (exemplo: Tiro Duplo, Lâmina Arremessada).
- Cria a decisão do Zooba (gastar tudo agora ou guardar) sem mexer no básico.
- Precisa de UI: segmentos no botão da magia.

### D. Projéteis de monstro desviáveis (custo alto, decisão de design)
- Só faz sentido para tiros lentos e grandes de boss (exemplo: uma bola de fogo de 1 tile por segundo), nunca para
  artilheiro comum.
- Contraria o princípio "sem aviso". Se aprovar, mude o GDD antes e restrinja a 1 ou 2 bosses como teste.
- Na rede, aceite que o desvio vale pela posição no servidor.

### Não recomendo
- Munição no básico: em PvE de horda vira tempo parado sem decisão.
- Atributos de Range e Velocity por arma: o Kusa equilibra alcance por classe e magia. Abrir isso por item complica o
  balanceamento (`balanco.ts`) sem ganho claro.

---

## 5. Como medir

Antes de construir A ou C, meça se existe o problema:

- **Fração de magias mirando à mão x toque rápido.** Se quase todo mundo usa o toque rápido, mira manual no básico
  (A) não vai ser usada.
- **Fração de "Errou a mira"** nas magias miradas à mão. Se for alta no celular, mirar à mão já é difícil, e o
  item A precisa de mira que gruda.
- **Trocas de alvo travado por hunt.** Se for alta, há demanda por escolher alvo rápido, o que justifica o item A.

Se esses contadores ainda não existem em `RunStats` (`apps/server/src/runStats.ts`), adicioná-los é o primeiro passo
(custo baixo).

---

## 6. Próximos passos sugeridos

1. Decidir sobre o item D (mexe num princípio do GDD).
2. Adicionar à telemetria os contadores da seção 5 e coletar 1 a 2 semanas.
3. Prototipar o item B (leque com queda e arremesso por cima de parede) numa magia nova e testar na arena.
4. Com os dados, decidir sobre o item A.

---

## 7. Decisão (01/11/2026)

O objetivo é balancear: o básico à distância acerta sempre e rende mais que o do Cavaleiro, que precisa chegar colado.
O jogador perder tiros por desvio é desejado.

**Dados que sustentam** (telemetria dos últimos 30 dias, amostra pequena: 2 a 4 jogadores por classe):

| Classe | Básico, dano/s, nível < 10 | Básico, dano/s, nível 10+ |
|---|---|---|
| Cavaleiro | 3 | 12 |
| Feiticeiro | 5 | 14 |
| Paladino | 7 | 13 |
| Druida | 8 | 9 |

No papel (`balanco.ts`, nível 20) os quatro básicos estão empatados (~110 de dano/s, Druida 71). A diferença real vem
do tempo atacando: quem atira começa antes e não precisa correr atrás.

**Implementado:**
- O básico à distância e as magias de alvo único com projétil voam reto até o tile mirado, sem seguir o monstro. Na
  chegada, acertam o primeiro monstro no caminho; quem andou de lado escapa.
- No ⚔️: toque e segurar miram onde o alvo está; arrastar mira à mão.
- As magias de projétil não grudam mais no monstro (dá para mirar à frente dele).
- Telemetria `RunStats.shots`: disparados, errados e mirados, por fonte.

**Fora deste ajuste (continua aberto):** a vantagem maior do Feiticeiro e do Druida vem das criaturas invocadas
(Erguer Esqueletos, Chamado da Matilha, Enxame de Vespas: 4 a 7× a mediana do slot no `balanco.ts`), que não são
tiros e não mudam aqui.

**Medir em 1 a 2 semanas:** taxa de erro por classe (`stats.shots`), dano/s do básico por classe e vitórias por classe.
