# Grimório 3.0 — galhos e espinha de peixe (inspirado em Diablo 2)

Estudo para trocar os 3 ramos retos do Grimório por ramos com **sub-ramificações** (costelas de uma espinha de
peixe) e **mais magias por classe**. Continua o `GRIMORIO_PLANO.md` (fases 0 a 4, especializações): nada do que já
existe é removido, e os ids comprados no banco continuam valendo. Documento de planejamento: nada aqui está
implementado ainda.

---

## 1. Como o Diablo 2 faz

| Elemento | Como funciona no D2 | Efeito no jogador |
|---|---|---|
| **3 abas por classe** | cada aba é uma "escola" (Fogo, Gelo, Raio) com 10 habilidades; 30 por classe | identidade forte; a tela mostra uma escola por vez |
| **6 camadas por nível do personagem** | habilidades abrem nos níveis 1, 6, 12, 18, 24 e 30 | o poder chega em ondas; sempre há algo novo no horizonte |
| **Pré-requisitos em rede, não em fila** | setas ligam habilidades de camadas diferentes; algumas pedem **dois** pais (Nevasca pede Explosão de Gelo **e** Espinho Glacial; Orbe Congelado pede Nevasca **e** Nova de Gelo) | o desenho vira uma rede com galhos e cruzamentos, não uma lista |
| **Passivas no meio da árvore** | Calor, Maestria do Frio, Maestria do Raio, Pele de Ferro | nós que não são magia, mas mudam a build inteira |
| **Pontos escassos** | 1 ponto por nível (+ missões), até 20 por habilidade; ~110 pontos no total | ninguém maximiza tudo; a escolha vem da **escassez**, não de cadeado |
| **Sinergias** (Lord of Destruction) | cada ponto na habilidade A dá +X% na B (Seta de Fogo → Bola de Fogo +14%/ponto) | magias "de passagem" continuam úteis mesmo sem serem usadas |
| **+habilidades nos itens** | itens somam níveis às habilidades | o loot conversa com a árvore |
| **Respec raro** | só uma vez por dificuldade (Token of Absolution depois) | a build é uma decisão de verdade |

### 1.1 O que deu errado no D2 (para não copiar)

1. **"Pedágio" de 1 ponto:** pré-requisitos inúteis que ninguém usa, só pagam passagem. Viram nós mortos.
2. **Sinergias empurraram para 4 habilidades × 20 pontos:** no fim, cada classe tinha 2–3 builds "oficiais".
3. **Imunidades obrigavam a ter duas escolas,** então metade das combinações não funcionava no Inferno.
4. **Habilidades de camada baixa morrem no fim de jogo** (Arremesso de Gelo aos 80 de nível ninguém usa).

---

## 2. O que levar para o Kusa

| Ideia do D2 | Como entra no Kusa | Por quê |
|---|---|---|
| Abas por escola | **Um ramo por tela**: 3 abas no topo do Grimório (já existe a "visão em foco" das especializações) | cabe no celular em retrato; árvore inteira em 412 px não cabe |
| Rede de pré-requisitos | **Espinha de peixe**: tronco vertical no centro, **costelas** saindo para a esquerda e a direita em alturas e tamanhos diferentes; alguns nós com **dois pais** | é o que dá a forma de galho que você pediu |
| Camadas | **Linhas = camadas** (I a VII); a linha define o preço (já é assim em `SPELL_COST_BY_ROW`) | preço sobe com a profundidade, como hoje |
| Passivas | **Talentos passivos novos** nas costelas (+1 alvo no Raio em Cadeia, +1 tile de raio nas áreas de gelo...) em vez de mais áureas genéricas | nó que muda jogo, não só número |
| Sinergias | **Sinergia:** cada nível numa magia dá +5% de dano/cura numa magia vizinha da mesma costela | resolve o maior problema do Kusa (ver 3.1) |
| Escassez | **o gold é a escassez** (não há pontos por nível) | não muda a economia |

O que **não** levar: pontos por nível de personagem (o Kusa reinicia o nível a cada hunt), 20 níveis por magia
(3 + Maestria basta) e pré-requisito sem uso (todo nó intermediário precisa ser uma magia ou passiva desejável).

---

## 3. Análise crítica do pedido

### 3.1 Mais magias tem um custo escondido: só existem 2 slots por hunt

Hoje cada classe tem 22–32 nós e **o jogador usa 2 magias por hunt**. Ir para ~40 magias por classe significa que
95% do Grimório fica **no banco de reservas** em cada hunt. No D2 isso não acontece porque o jogador usa 5–8
habilidades ao mesmo tempo. Sem correção, mais magias = mais gold gasto em coisa que não aparece.

Correções, em ordem de impacto:

1. **Sinergias** (do D2): a magia que ficou fora do slot ainda fortalece a que entrou. Comprar continua valendo.
2. **Passivas nas costelas:** valem sempre, como os Traços.
3. **Escolha melhor na hunt:** a janela de escolha mostra 3 opções sorteadas entre as magias conhecidas do slot (hoje
   mostra todas). Com 15+ magias por slot, a lista inteira fica ilegível no celular, e o sorteio dá variedade de hunt
   para hunt (é o "aleatório" que melhora a rejogabilidade sem bagunçar a árvore).
4. **3º slot no nível 10** (fica para depois, medindo na telemetria).

### 3.2 "Aleatória": três leituras, só uma recomendada

| Leitura | O que é | Prós | Contras |
|---|---|---|---|
| **A. Forma irregular, fixa** (recomendado) | cada ramo tem um desenho diferente, com costelas de tamanhos e lados variados; igual para todos os jogadores | equilíbrio controlado; o banco espelha o catálogo; jogadores trocam builds | dá trabalho de design (cada costela é escolhida à mão) |
| B. Árvore sorteada por conta | cada jogador recebe uma forma diferente, gerada por seed | novidade | impossível balancear; o banco precisa guardar a árvore de cada conta; "guia de build" deixa de existir; uma conta azarada fica sem a magia boa |
| C. Ofertas sorteadas na hunt | a árvore é fixa, mas a escolha do slot sorteia 3 das magias conhecidas | rejogabilidade; resolve a lista longa no celular | pode faltar a magia que o jogador quer (mitigar com "re-sortear" 1 vez por hunt) |

Recomendação: **A + C**. A forma é irregular e fixa; a sorte entra na hunt.

### 3.3 Riscos

| Risco | Mitigação |
|---|---|
| Escopo (≈ 40 magias novas, 4 classes) | um PR por classe; o Cavaleiro primeiro (não tem especializações ainda e não conflita com o PR #65 do Druida) |
| Magias novas que são cópia de outra com outro número (já foi problema, ver `GRIMORIO_PLANO.md` 2.2) | toda magia nova combina efeitos que **já existem** no motor (`SpellDef`) de um jeito novo, ou é cortada |
| Árvore ilegível no celular | 1 ramo por tela, no máximo 5 colunas (tronco + 2 de cada lado), rolagem vertical |
| Quem já comprou | ids e níveis ficam; nós existentes só ganham costelas, e as especializações continuam no pé do tronco |
| Duas sessões mexendo em `talents.ts` | esperar o PR #65 (Druida) entrar no `main` antes de mudar a estrutura |

---

## 4. Proposta de estrutura

### 4.1 Forma de um ramo (espinha de peixe)

```
 linha                 [ raiz: magia inicial ]
   I                ●────── Áurea ──────●
   II        ◆ ─ ● ─┤                   │
   III              ● Magia do tronco   ├─ ● ─ ●          ← costela à direita, 2 nós
   IV        ● ─────┤                   │
   V                ● Magia do tronco ──┴─ ● (2 pais)     ← nó que pede tronco E costela
   VI          ┌────┴────┐
   VII      Traço A    Traço B                            ← especialização (já existe)
             ● ●         ● ●
```

- **Tronco** (centro): os nós de hoje, nas mesmas linhas.
- **Costelas**: 2 a 4 por ramo, com 1 a 3 nós cada, saindo de qualquer nó do tronco para a esquerda **ou** para a
  direita. Tamanho e lado variam de ramo para ramo (é o "galho aleatório", mas desenhado).
- **Nó de dois pais**: 1 por ramo, no máximo. Pede o nó do tronco e o fim de uma costela (como a Nevasca do D2).
- **Especialização**: continua no pé do tronco, com a regra de hoje.

### 4.2 Tamanho por classe

| | Hoje (com especializações) | Proposta |
|---|---|---|
| Nós por ramo | 7–11 | 13–16 |
| Magias por classe | 22 (Cavaleiro: 10) | ~34 |
| Passivas novas (não áurea) | 0 | 3 por classe (1 por ramo) |
| Sinergias | 0 | ~6 por classe |

### 4.3 Exemplo: ramo Lâmina do Cavaleiro

| Linha | Tronco | Costela esquerda | Costela direita |
|---|---|---|---|
| I | Áurea de Fúria | | |
| II | Golpe Esmagador | 🪓 **Corte Duplo** (2 golpes de 1,3× no alvo) | |
| III | Lâmina Sedenta | | 🩸 **Ferida Aberta** (1,5× e sangra 4 s) → 🔪 **Hemorragia** (passiva: sangramento pula para 1 colado quando o alvo morre) |
| IV | Terremoto | 🌀 **Redemoinho** (raio 1, 3 giros) → 🌪️ **Ciclone de Aço** (raio 2, 2 giros e puxa 1 tile) | |
| V | Execução | | ⚡ **Fenda Sísmica** (pede Terremoto **e** Ferida Aberta: linha de 5 tiles que atordoa) |
| VI–VII | ✦ Berserker ou Duelista (fase 4d do plano) | | |

Sinergias do ramo: Corte Duplo → Golpe Esmagador (+5%/nível), Ferida Aberta → Lâmina Sedenta, Terremoto → Fenda Sísmica.
Quase todas usam peças do motor que já existem (`repeat`, `dot`, `shape: "line"`, `stunMs`). A exceção é o **puxar**
do Ciclone de Aço: hoje `push` só empurra para longe; puxar é uma peça pequena nova (P), que também serve à Corrente
de Ferro do Desafiante (`GRIMORIO_PLANO.md` 6.1).

### 4.4 Mudanças técnicas

| Onde | Mudança |
|---|---|
| `packages/shared/src/talents.ts` | `Shape` ganha `lane` (−2 a +2, 0 = tronco) e aceita **lista** de pais; `requires` vira lista (todos obrigatórios); campo novo `synergy` (magia que recebe o bônus e o % por nível); passiva nova `kind: "passive"` |
| `packages/shared/src/spells.ts` | magias novas (só dados, peças existentes) e Maestria de cada uma; `spellAtRank` soma a sinergia |
| `apps/server/src/DungeonRoom.ts` | ler as passivas; janela de escolha com 3 opções sorteadas pelo servidor (`Math.random` no servidor é permitido; não é o gerador de dungeon) |
| `apps/client/src/menu.ts` | Grimório com 3 abas (um ramo por tela) desenhando costelas por `lane`, linhas tracejadas para o 2º pai; ficha mostra "Sinergia: +X% em Y" |
| Supabase | migration: tabela `talent_requires (talent_id, requires_id, rank)` para nós de dois pais, `buy_talent` passa a conferir todos; nós novos em `talents`; advisors |
| `constants.ts` | `RULES_VERSION` +1 |
| Testes | `grimorio.ts` confere sinergia e nó de dois pais; magias novas entram no `efeitos.ts` |
| Telemetria | `RunStats.synergyBonus` (dano extra vindo de sinergia) para medir se ela pesa demais |

---

## 5. Plano de execução

| Fase | Entrega | Tamanho |
|---|---|---|
| 5a. Estrutura | `lane`, vários pais, sinergia, passivas, abas no menu, migration; nenhum conteúdo novo além de reposicionar os nós atuais | M |
| 5b. Cavaleiro | costelas dos 3 ramos (~12 magias e 3 passivas) **junto** com a fase 4d (especializações) | G |
| 5c–5e. Paladino, Feiticeiro, Druida | costelas de cada classe, um PR por classe | M cada |
| 5f. Escolha sorteada | 3 opções na janela do slot + 1 re-sorteio por hunt | P |

Meta de medição (telemetria): magia mais escolhida num slot < 35% das escolhas da classe; gold gasto no Grimório por
jogador ativo subindo; nenhuma costela com menos de 10% de compra depois de 2 semanas.
