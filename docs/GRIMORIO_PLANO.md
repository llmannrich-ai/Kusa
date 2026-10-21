# Grimório 2.0 — análise e plano de expansão

Estudo para enriquecer a árvore de magias das 4 classes, com base em Dungeons & Dragons (5e) e Tibia.
Documento de planejamento. Quando uma fase for entregue, o `GDD.md` passa a descrever o que vale e este
arquivo marca a fase como feita. As decisões do Leonardo estão na seção 10 e já valem no resto do texto.

**Andamento:** fase 0 feita (slot 2 no nível 6). Fase 1 feita com escopo reduzido (ver seção 7). Próxima: fase 2.

---

## 1. Resumo executivo

| | Hoje | Proposta |
|---|---|---|
| Nós por classe | 13–15 (4 deles são áureas genéricas) | 31–33 (tronco + 2 especializações por ramo) |
| Magias por classe | 9–10 | ~22 |
| Escolha de build | nenhuma: tudo se compra em fila, cada ramo é uma lista | 1 **especialização** por ramo (A ou B), **permanente**, estilo subclasse de D&D |
| Nível 2 e 3 da magia | só +20% de número | o nível 3 vira **Maestria**: muda o comportamento |
| Tipos de efeito | 10 (dano, cura, raiz, atordoar, guarda, escudo, roubo de vida, provocar, invocar, projétil) | +12 (veneno/queimadura, lentidão, linha, cone, salto em cadeia, investida/teleporte, empurrar/puxar, marca, campo no chão, bônus em aliados, transformação, armadilha) |
| Slot 2 | abre no nível 8 (quase ninguém chega) | abre no nível 6 |

**Ordem recomendada:** primeiro destravar o que já existe (slot 2 mais cedo), depois o motor de efeitos novos, depois
Maestrias, e só então as especializações com conteúdo novo, uma classe por PR.

---

## 2. Análise crítica do Grimório atual

### 2.1 O que funciona

- **Árvore curta e legível no celular:** 3 colunas, 5–6 linhas, toque abre os detalhes. Isso precisa continuar.
- **A identidade das classes está quase certa:** cavaleiro segura, feiticeiro explode área, druida cura e invoca.
- **As invocações do druida** (lobo, vespas, urso, guardião) são o conteúdo mais criativo do jogo hoje.
- **A mira por arrasto** já resolve a parte difícil do mobile, e serve também para linhas e cones (ver 4.2).

### 2.2 Problemas, em ordem de impacto

1. **Metade do Grimório quase nunca aparece em jogo.** Na telemetria (32 hunts, a maioria de teste, então a amostra é pequena),
   só **3 hunts chegaram ao nível 8**, onde abre o slot 2, e só 12 chegaram ao nível 3. Mais da metade das magias compradas
   (todas as de slot 2) são invisíveis para quem morre ou foge cedo. Comprar magia que não aparece não é divertido.
2. **Não existe escolha, só fila.** Cada ramo é uma corrente de pai para filho, sem bifurcação. No fim, todo jogador
   tem a mesma árvore. Falta o momento "eu sou um feiticeiro de fogo e você é de gelo".
3. **Os níveis 2 e 3 são só números.** +20% de dano não muda a forma de jogar. Em D&D, conjurar num círculo mais alto dá
   mais alvos e mais área; no Tibia, cada versão "gran" muda o efeito.
4. **As áureas são iguais nas 4 classes.** São 16 nós (4 por classe) que só trocam de nome. Ocupam espaço de nó sem
   dar personalidade.
5. **Magias que são a mesma coisa com outro número:**
   - Raio em Cadeia não salta: é uma área de raio 2, igual à Chuva de Flechas.
   - Disparo Perfurante não atravessa: é uma área de raio 1.
   - Nevasca, Nova de Gelo e Raízes Espinhosas: as três são "área + prende".
   - Luz Curativa do paladino (30%) cura quase tanto quanto a Bênção da Floresta do druida (35%): o paladino vira um curandeiro.
   - Pele de Ferro e Grito de Guerra: as duas são "corta dano".
   - Mariposa Curandeira e Fogo-Fátuo: as duas são "invocação que cura".
6. **Faltam efeitos clássicos de RPG:** dano contínuo (veneno, fogo), lentidão (o "paralyze" do Tibia), linha e cone
   (o "beam" e o "wave" do Tibia), salto (Misty Step), campo no chão (fire field, magic wall), bônus em aliado
   (Bless, Haste), marca no alvo (Hunter's Mark), transformação (Wild Shape).
7. **Elemento ausente:** o feiticeiro não tem **fogo**, que é o símbolo da classe nos dois jogos (Fireball no D&D,
   Great Fireball e Hell's Core no Tibia).
8. **O paladino está dividido.** O ramo Luz é de cura e escudo, o que puxa a classe para suporte. No Tibia (referência
   principal do Kusa), o paladino é o atirador: flechas, lanças e dano sagrado.

### 2.3 Conclusão

A árvore está **funcional, mas pouco divertida**: tem bastante coisa para comprar e pouca coisa para decidir. O problema
não é a quantidade de magias, é a **falta de decisão** (bifurcações), de **variedade de efeito** e de **visibilidade**
(slot 2 tardio). Mais magias sem resolver esses três pontos só aumentam a lista.

---

## 3. O que levar de D&D e do Tibia

| Ideia | De onde vem | Como entra no Kusa |
|---|---|---|
| **Subclasse** (Juramento, Escola, Círculo, Arquétipo) | D&D | 1 especialização por ramo, A ou B, com um **Traço** passivo e 2 magias próprias |
| **Conjurar em círculo mais alto** | D&D | Maestria no nível 3 da magia: +1 alvo, +1 raio, efeito extra |
| **Magias "gran" e "mas"** (exori → exori gran → exori mas) | Tibia | mesmas famílias de magia em força crescente pela árvore |
| **Formas de área** (beam, wave, ball, ring) | Tibia | linha, cone, área no alvo, área em volta de si |
| **Runas e campos** (fire field, poison field, magic wall) | Tibia | campos no chão que duram alguns segundos |
| **Utamo vita** (dano sai da mana) | Tibia | Traço do Arcanista |
| **Exura sio** (cura à distância num aliado) | Tibia | Cura Distante do druida (mira em aliado) |
| **Utito tempo / utani hur** (fúria, pressa) | Tibia | Fúria Berserker, Pés Ligeiros |
| **Wild Shape** | D&D (druida) | Forma de Urso e Forma de Pantera |
| **Hunter's Mark, Cordon of Arrows, Swift Quiver** | D&D (ranger) | Marca do Caçador, Cordão de Flechas, Aljava Veloz |
| **Fireball, Misty Step, Black Tentacles, Cone of Cold** | D&D (mago) | Bola de Fogo, Passo Nebuloso, Tentáculos Negros, Cone de Frio |
| **Call Lightning, Thunderwave** | D&D (druida) | Chamar Relâmpago, Onda Trovejante |
| **Battle Master** (Riposte, Pushing, Commander's Strike) | D&D (guerreiro) | Riposta, Bater com Escudo, Liderança |
| **Animate Dead** | D&D (necromante) | Erguer Esqueletos (feiticeiro) |

Observação: no D&D o paladino é um cavaleiro sagrado de corpo a corpo. O Kusa segue o Tibia (paladino atirador), como
você pediu. O lado "sagrado" do D&D entra como **flechas consagradas**, não como cura forte.

Papel de cada classe, que todo conteúdo novo precisa respeitar:

| Classe | Papel principal | Papel secundário | O que **não** deve fazer bem |
|---|---|---|---|
| Cavaleiro | defesa e corpo a corpo | controle (provocar, puxar, atordoar) | dano à distância |
| Paladino | dano à distância, alvo único | área de flechas, armadilhas, luz | curar a equipe toda |
| Feiticeiro | dano em área | dano explosivo num alvo, fuga (teleporte) | aguentar pancada |
| Druida | cura e invocação | controle pela natureza, transformação | dano explosivo |

---

## 4. Nova arquitetura da árvore

### 4.1 Forma de cada ramo

```
            [raiz: magia inicial do slot 1]
      ┌──────────────┼──────────────┐
   Ramo 1          Ramo 2          Ramo 3
   tronco          tronco          tronco        ← os nós de hoje (ids mantidos)
   (4–5 nós)       (4–5 nós)       (4–5 nós)
      │               │               │
   ┌──┴──┐         ┌──┴──┐         ┌──┴──┐
  Esp.A Esp.B     Esp.A Esp.B     Esp.A Esp.B   ← Traço passivo (nó novo)
   │     │         │     │         │     │
  mag.  mag.      mag.  mag.      mag.  mag.     ← 1 magia de slot 1
   │     │         │     │         │     │
  mag.  mag.      mag.  mag.      mag.  mag.     ← 1 magia de slot 2
```

- **Tronco:** os nós atuais ficam onde estão (mesmos ids no banco), então nada do que alguém já comprou se perde.
- **Especialização:** no fim do tronco, o ramo se divide em dois. Cada lado tem um **Traço** (passiva com mecânica,
  não só número) e 2 magias (uma de cada slot, para as duas escolhas na hunt sempre terem opção nova).
- **A escolha é permanente** (decisão do Leonardo): comprar o Traço de um lado tranca o outro lado daquele ramo para
  sempre, naquela classe da conta. Como na subclasse do D&D, é uma decisão de identidade, não de hunt.
  - Cada classe tem 3 escolhas (uma por ramo), então são 8 combinações por classe e 32 no jogo.
  - Nada do que já foi comprado é afetado: os lados só têm conteúdo novo.
  - Como não dá para voltar atrás, o jogador precisa ver **tudo** antes: o Traço e as 2 magias de cada lado, com os
    números do nível 1 ao 3, e uma confirmação clara ("Esta escolha é permanente. O outro lado fica fechado.").
  - O banco garante a regra: `talents` ganha `exclusive_with` (o Traço do outro lado), e `buy_talent` recusa a compra
    se o outro lado tiver qualquer nível.
- **Áureas:** as 4 de hoje ficam no tronco (mesmos ids e bônus). Conteúdo novo nunca é áurea genérica.

### 4.2 Maestria (nível 3 de cada magia)

O nível 2 continua +20%. O nível 3 dá +20% **e** uma Maestria, uma linha de texto que muda o efeito. Exemplos:

| Magia | Maestria (nível 3) |
|---|---|
| Giro da Lâmina | gira duas vezes (o 2º giro com 50% do dano) |
| Grito de Guerra | monstros provocados causam 20% menos dano |
| Escudo da Fé | ao quebrar, empurra os monstros colados |
| Flecha Sagrada | atravessa e acerta o 2º monstro da linha |
| Chuva de Flechas | deixa o chão com lentidão de 30% por 3 s |
| Disparo Certeiro | se matar, devolve a recarga pela metade |
| Esfera Sombria | explode duas vezes (a 2ª meio segundo depois) |
| Raio em Cadeia | +2 saltos |
| Nova de Gelo | monstros que saem do gelo ficam lentos |
| Meteoro | deixa uma cratera em chamas por 4 s |
| Bênção da Floresta | o excesso de cura vira escudo |
| Raízes Espinhosas | envenena quem fica preso |
| Lobo Espiritual | invoca 2 lobos |
| Urso Ancestral | ao morrer, cura a equipe por perto em 15% |

Toda magia nova já nasce com a sua Maestria. Implementação: `mastery?: Partial<SpellDef>` no `SpellDef`, aplicado em
`spellAtRank` quando `rank === 3`, mais um texto em `spellFacts`.

### 4.3 Slot 2 mais cedo

Mudar `SPELL_SLOT_LEVELS` de `[3, 8]` para `[3, 6]`. É uma linha de código e é o ajuste de maior impacto do plano: com ele,
metade do Grimório passa a aparecer na maior parte das hunts. As melhorias de nível passam para os níveis 2, 4, 5, 7, 8, 9...
(o 6 deixa de dar melhoria e o 8 passa a dar; vale conferir o balanceamento na telemetria).

Fica em aberto um 3º slot ("magia suprema") no nível 12 para mapas longos como o Pântano. Recomendo **não** fazer agora:
primeiro medir se o slot 2 no nível 6 resolve.

### 4.4 Interface no celular

Com 2 sub-colunas por ramo, a árvore teria 6 colunas na parte de baixo, o que não cabe com legibilidade em 412 px.
Proposta:

- **Visão geral** (como hoje): mostra o tronco dos 3 ramos e, no fim de cada um, um nó duplo "A | B".
- **Tocar no nome do ramo** (ou no nó duplo) **foca o ramo**: ele ocupa a largura toda, com as 2 especializações lado a lado.
  Voltar com o ✕ ou deslizando para o lado.
- Antes da escolha, os dois lados aparecem abertos para ler. Depois, o lado escolhido fica aceso e o outro fica
  apagado com um cadeado.
- O nó do Traço é um losango (o círculo é magia e o quadrado é áurea).

---

## 5. Motor de efeitos: o que precisa existir no servidor

Hoje `applySpell` (`apps/server/src/DungeonRoom.ts`) só sabe aplicar os 10 efeitos da tabela do resumo. As magias novas
precisam destas peças, que entram como campos novos do `SpellDef` (em `packages/shared/src/spells.ts`) e são calculadas no servidor.
Tamanho: **P** = até 1 dia, **M** = 2–3 dias, **G** = 1 semana ou mais (inclui o efeito visual no cliente).

| # | Peça | Campo novo | Tam. | Usado por |
|---|---|---|---|---|
| 1 | Dano contínuo (veneno, queimadura, sangramento) | `dot: { perSec, ms, kind }` | P | Combustão, Toxina, Ferida, Picada da Mamba |
| 2 | Lentidão | `slow: { pct, ms }` | P | Cone de Frio, Chuva (Maestria), Geada |
| 3 | Forma linha | `shape: "line"`, `length` | M | Feixe de Energia, Disparo Perfurante |
| 4 | Forma cone | `shape: "cone"`, `length` | M | Cone de Frio, Barragem |
| 5 | Salto em cadeia | `chain: { jumps, falloff }` | P | Raio em Cadeia, Flecha Relâmpago |
| 6 | Movimento do herói (investida, salto, teleporte) | `dash: { tiles, to: "target" \| "aim" \| "back" }` | M | Investida, Rolamento, Passo Nebuloso |
| 7 | Empurrar / puxar monstro | `push: tiles` (negativo = puxa) | M | Bater com Escudo, Corrente, Onda Trovejante |
| 8 | Bônus em aliados | `buff: { damage?, haste?, armor?, ms }` | P | Estandarte, Fúria Berserker, Pés Ligeiros |
| 9 | Marca (alvo recebe mais dano) | `mark: { pct, ms }` | P | Marca do Caçador, Maldição |
| 10 | Campo no chão (dura alguns segundos) | `field: { ms, tickMs, ... }` | G | Solo Consagrado, Nuvem Venenosa, Tentáculos, Chamar Relâmpago |
| 11 | Traços (gatilhos passivos) | ganchos `onHit`, `onHurt`, `onKill`, `onCast` | G | as 24 especializações |
| 12 | Armadilha | `field` que dispara 1 vez quando um monstro pisa | M (depois do 10) | Armadilha de Urso, Cordão de Flechas |
| 13 | Mirar em aliado | `aim: "ally"` | M | Cura Distante, Escudo da Luz, Renascer da Semente |
| 14 | Transformação | estado no `Player` + troca de ataque básico | G | Forma de Urso, Forma de Pantera |
| 15 | Parede temporária | tiles bloqueados com tempo (pathfinding e visão) | G | Muralha Mágica |
| 16 | Reanimar aliado | semente no aliado: se ele morrer enquanto ela dura, renasce no lugar em vez de morrer (ver 6.4) | M | Renascer da Semente |

Regras de implementação:

- **Efeito visual por família, não por magia.** O cliente desenha 7 famílias (projétil, explosão, linha, cone, campo,
  invocação, aura no herói) parametrizadas pela `color` da magia. Sem isso, ~50 magias novas viram ~50 efeitos para desenhar,
  e esse seria o maior gargalo do plano.
- **Telemetria:** dano contínuo e campos entram em `damageDealt` com o id da magia (como hoje). Novos contadores em `RunStats`:
  `specs` (especializações ativas), `ccMs` (tempo de monstro preso, atordoado ou lento), `buffMs`, `absorbed` (escudo, separado
  de `damageMitigated`) e `revives`.
- Testes de fumaça novos para cada peça (entram em `SUITES` de `apps/server/scripts/all.ts`).

---

## 6. Catálogo proposto por classe

Legenda: **S1** = slot 1 (recarga curta, nível 3), **S2** = slot 2 (forte, nível 6). Números são ponto de partida para
o balanceamento, sempre no nível 1. ♻️ = magia que já existe e muda.

### 6.1 Cavaleiro — "a muralha que bate"

Ramos: **Lâmina** (dano corpo a corpo) · **Bastião** (defesa) · **Comando** (controle e equipe).

**Ajustes no que existe**
- ♻️ Execução: +100% de dano em monstro abaixo de 30% da vida (hoje é só um golpe maior).
- ♻️ Pele de Ferro: passa a dar também +5 de armadura, para não ser uma cópia do Grito de Guerra.

| Ramo | Especialização | Traço (passiva) | Magia S1 | Magia S2 |
|---|---|---|---|---|
| Lâmina | **Berserker** (Rage do D&D, utito tempo do Tibia) | *Sede de Batalha:* +5% de dano por monstro colado (até 5) | 🌪️ **Redemoinho de Aço** (exori gran): 3 giros seguidos em raio 1 | 😤 **Fúria Berserker:** 8 s com +40% de dano e +30% de velocidade de ataque, mas recebe +20% de dano |
| Lâmina | **Duelista** (Battle Master) | *Riposta:* 20% de chance de devolver um golpe corpo a corpo recebido | 🗡️ **Lâmina Arremessada** (exori hur): espada voa até 4 tiles e sangra o alvo | ⚔️ **Mil Cortes:** 5 golpes rápidos num alvo, o último atordoa |
| Bastião | **Guardião** (Protection style) | *Intervir:* 30% do dano dos aliados a até 2 tiles vem para você | 🛡️ **Bater com Escudo:** empurra 2 tiles e atordoa 1 s | 🏛️ **Égide Compartilhada:** escudo de 25% em você e nos aliados, e provoca em raio 3 |
| Bastião | **Inabalável** (Relentless Endurance) | *Último Bastião:* ao cair abaixo de 25% da vida, ganha escudo de 30% (1 vez a cada 60 s) | 🦔 **Espinhos de Ferro:** 8 s devolvendo 40% do dano corpo a corpo recebido | 🗿 **Fortaleza Viva:** 5 s sem andar, corta 90% do dano, e quem bate fica lento |
| Comando | **Senhor da Guerra** (Commander's Strike, Bless) | *Liderança:* aliados a até 4 tiles causam +8% de dano | 🐎 **Investida:** corre até 4 tiles até o alvo e o atordoa | 🚩 **Estandarte de Guerra:** campo de raio 2 por 10 s, aliados dentro com +20% de dano e +5 de armadura |
| Comando | **Desafiante** (exeta res) | *Intimidar:* monstros provocados por você causam −25% de dano | ⛓️ **Corrente de Ferro:** puxa um monstro de até 5 tiles para perto e o prende | 👊 **Desafio Supremo:** provoca em raio 5, corta 40% do dano e cura 3% por monstro provocado |

### 6.2 Paladino — "o atirador sagrado"

Ramos: **Mira** (alvo único) · **Luz** (flechas sagradas, pouco suporte) · **Batedor** (área e armadilhas).

**Ajustes no que existe**
- ♻️ Disparo Perfurante: vira **linha** de 7 tiles que atravessa todos os monstros (hoje é área de raio 1).
- ♻️ Disparo Certeiro: +10% de dano por tile de distância até o alvo (recompensa jogar longe).
- ♻️ Luz Curativa: cura 20% (era 30%) e ofusca, atordoando 0,5 s os monstros em volta. A luz do paladino fere; quem cura de verdade é o druida.

| Ramo | Especialização | Traço (passiva) | Magia S1 | Magia S2 |
|---|---|---|---|---|
| Mira | **Atirador de Elite** (Sharpshooter, utito tempo san) | *Olho de Águia:* +1 de alcance no básico e +20% de dano em alvos a 5 tiles ou mais | 🎯 **Marca do Caçador** (Hunter's Mark): marca um alvo por 10 s, que recebe +25% de dano de toda a equipe | 🦅 **Postura do Atirador:** 8 s com básico de dano dobrado e +2 de alcance, andando 50% mais devagar |
| Mira | **Caçador Ágil** (Disengage, Zephyr Strike) | *Passo Leve:* +25% de velocidade por 2 s depois de cada magia | 🤸 **Rolamento:** salta 3 tiles para trás e a próxima flecha atordoa | 🏹 **Aljava Veloz** (Swift Quiver): 6 s de ataque básico a cada 0,4 s |
| Luz | **Cruzado** (exori san) | *Flechas Consagradas:* básico causa +30% em mortos-vivos (Esqueleto, Afogado) e queima por 2 s | ✝️ **Lança Etérea** (exori con): lança rápida com recarga de 2,5 s | ☀️ **Caldeira Divina** (exevo mas san): luz em raio 3 em volta de si, dano dobrado em mortos-vivos |
| Luz | **Guardião da Luz** | *Aura Sagrada:* aliados a até 3 tiles recebem 10% menos dano | 🕯️ **Escudo da Luz:** escudo de 30% da vida num aliado mirado a até 6 tiles | ⛪ **Solo Consagrado:** campo de raio 2 por 8 s que fere monstros e dá +5 de armadura aos aliados dentro |
| Batedor | **Artilheiro** (Lightning Arrow, Conjure Barrage) | *Pólvora:* as magias de área do paladino deixam o chão em chamas por 3 s | ⚡ **Flecha Relâmpago:** acerta o alvo e salta para mais 3 | 🎇 **Barragem:** cone de 5 tiles à frente com uma chuva de flechas |
| Batedor | **Armadilheiro** (Cordon of Arrows) | *Engenhoso:* armadilhas duram o dobro e cabem 3 ao mesmo tempo | 🪤 **Armadilha de Urso:** o 1º monstro que pisar fica preso 3 s e sangra | 🎋 **Cordão de Flechas:** estaca que dispara 4 vezes em monstros que chegam a 3 tiles |

### 6.3 Feiticeiro — "a explosão de vidro"

Ramos: **Raio** (energia) · **Gelo** · **Trevas**. O fogo entra como especialização do ramo Raio ("Elementos").

**Ajustes no que existe**
- ♻️ Raio em Cadeia: **salta de verdade** por até 4 monstros, com −15% de dano por salto.
- ♻️ Nevasca: em vez de prender, vira **campo** de 5 s que fere e deixa lento (fica diferente da Nova de Gelo).

| Ramo | Especialização | Traço (passiva) | Magia S1 | Magia S2 |
|---|---|---|---|---|
| Raio | **Tempestuoso** (exevo vis lux, Rage of the Skies) | *Estática:* magias de energia têm 25% de chance de atordoar 0,5 s | 📏 **Feixe de Energia** (beam): linha de 6 tiles que atravessa tudo | 🌩️ **Fúria dos Céus** (exevo gran mas vis): por 3 s caem 6 raios em monstros a até 4 tiles |
| Raio | **Piromante** (Fireball, Hell's Core) | *Combustão:* suas magias queimam o alvo por 4 s | 🔥 **Bola de Fogo:** explode em raio 2 e queima | 🌋 **Núcleo Infernal:** inferno em raio 4 em volta de si, o maior dano em área do jogo (recarga 20 s) |
| Gelo | **Criomante** (Cone of Cold) | *Estilhaçar:* dano em monstro preso pelo gelo causa +50% e quebra o gelo | 🌬️ **Cone de Frio:** cone de 4 tiles que fere e deixa lento 3 s | 🧊 **Prisão de Gelo:** prende tudo em raio 3 por 4 s, sem dano (prepara o Estilhaçar) |
| Gelo | **Arcanista** (utamo vita, Misty Step, magic wall) | *Escudo de Mana:* 30% do dano recebido sai da mana em vez da vida | 💨 **Passo Nebuloso:** teleporta até 4 tiles para o ponto mirado | 🧱 **Muralha Mágica:** parede de 3 tiles que bloqueia passagem por 6 s |
| Trevas | **Necromante** (exori mort, Animate Dead) | *Colheita:* monstro morto por magia sua devolve 3% de mana | 💀 **Morte Súbita** (SD): 3,4× num alvo, recarga de 8 s | 🦴 **Erguer Esqueletos:** 2 esqueletos lutam por você por 15 s (as feras são do druida; os mortos-vivos são do feiticeiro) |
| Trevas | **Bruxo** (Hex, Eldritch Blast, Black Tentacles) | *Maldição:* alvos das suas magias de alvo único recebem +15% de dano por 5 s | 👁️ **Rajada Mística:** 3 raios que empurram 1 tile cada | 🐙 **Tentáculos Negros:** campo de raio 2 por 6 s que prende e fere |

### 6.4 Druida — "a floresta que cura e morde"

Ramos: **Matilha** (invocação) · **Bosque** (cura) · **Espinhos** (natureza e controle).

**Ajustes no que existe**
- ♻️ Fogo-Fátuo (Coração da Floresta): devolve também 2% de mana, para não ser uma cópia da Mariposa.

| Ramo | Especialização | Traço (passiva) | Magia S1 | Magia S2 |
|---|---|---|---|---|
| Matilha | **Mestre das Feras** | *Vínculo Selvagem:* criaturas com +25% de vida e de dano | 📣 **Grito da Fera:** suas criaturas atacam 50% mais rápido por 6 s e recuperam 20% da vida | 🦅 **Águia Gigante:** voa sobre água e obstáculos e mergulha atordoando |
| Matilha | **Metamorfo** (Wild Shape) | *Pele Selvagem:* +4 de armadura enquanto transformado | 🐆 **Forma de Pantera:** 6 s com +40% de velocidade; o próximo básico salta no alvo (2,5×) | 🐻 **Forma de Urso:** 10 s com +50% de vida e básico corpo a corpo em raio 1 que provoca |
| Bosque | **Círculo da Vida** (exura sio, Revivify) | *Florescer:* cura além da vida máxima vira escudo (até 20%) | 💞 **Cura Distante** (exura sio): cura 45% de um aliado mirado a até 6 tiles | 🌰 **Renascer da Semente:** a única magia que reanima no jogo (ver abaixo) |
| Bosque | **Guardião da Natureza** (Barkskin, utura gran) | *Seiva Protetora:* quem você cura ganha +3 de armadura por 4 s | 🪵 **Pele de Casca:** o aliado mais ferido por perto ganha escudo de 30% | 🌧️ **Chuva Revigorante:** campo de raio 3 por 8 s que cura 4% de vida e devolve 2% de mana por segundo |
| Espinhos | **Peste** (poison field, Stinking Cloud) | *Toxina:* dano de natureza envenena (acumula até 3 vezes) | 🐍 **Picada da Mamba:** veneno forte num alvo, que explode em área se ele morrer | ☠️ **Nuvem Venenosa:** campo de raio 2 por 8 s |
| Espinhos | **Tempestade** (Call Lightning, Thunderwave) | *Céu Carregado:* a cada 4 magias, um raio cai no monstro mais próximo | 💥 **Onda Trovejante:** empurra tudo em raio 2 e fere | ⛈️ **Chamar Relâmpago:** nuvem sobre o ponto mirado que solta um raio a cada 1,5 s por 8 s |

**Renascer da Semente** (decisão do Leonardo: só o druida reanima, e só com esta magia)
- O druida mira um aliado (ou a si mesmo) e planta uma semente que dura 25 s. Recarga de 60 s, mana alta.
- Se esse aliado morrer com a semente ativa, ele **não morre**: renasce no mesmo lugar com 40% da vida e 2 s de
  invulnerabilidade. Não larga item, bag nem poções, e a hunt continua normal.
- Só uma semente por druida de cada vez. Na mesma pessoa, a semente salva só uma vez (ela some quando salva).
- Por que antes e não depois da morte: reanimar um corpo caído obrigaria a mudar a regra da morte (adiar o
  `finish_run`, segurar o item largado, criar um estado de "caído"). A semente entrega o mesmo momento ("o druida me
  salvou") sem mexer nisso. Se depois quiserem reanimar de verdade, isso vira a Maestria dela.
- Telemetria: contador `revives` em `RunStats` (quem salvou quem) e o dano que a pessoa recebeu depois de renascer.
- Consequência da escolha permanente: só o druida do **Círculo da Vida** reanima. É de propósito: vira o motivo para
  ter esse druida na equipe.

### 6.5 Contagem

| | Cavaleiro | Paladino | Feiticeiro | Druida | Total |
|---|---|---|---|---|---|
| Magias novas | 12 | 12 | 12 | 12 | **48** |
| Traços novos | 6 | 6 | 6 | 6 | **24** |
| Magias que mudam (♻️) | 2 | 3 | 2 | 1 | 8 |
| Nós por classe (hoje → depois) | 14 → 32 | 13 → 31 | 14 → 32 | 15 → 33 | |

---

## 7. Plano de execução

Cada fase é um PR que pode ir sozinho para produção (CI verde, `RULES_VERSION` +1 sempre que mudar regra compartilhada).

| Fase | Entrega | Depende de | Tamanho | Impacto |
|---|---|---|---|---|
| **0. Destravar o que existe** ✅ | slot 2 no nível 6 (`SPELL_SLOT_LEVELS`) e conferir as melhorias de nível na telemetria | — | P | **alto**: metade do Grimório passa a aparecer |
| **1. Motor de efeitos (parte 1)** | peças 1–9 da seção 5, testes de fumaça, 7 famílias de efeito visual; aplicar os ♻️ que dependem delas (Raio em Cadeia, Disparo Perfurante, Nevasca...) | 0 | G | alto: tira as magias repetidas |
| **2. Maestrias** | `mastery` no `SpellDef`, texto no menu, Maestria das 39 magias atuais | 1 | M | médio: dá motivo para o nível 3 |
| **3. Especializações (estrutura)** | ganchos de Traço no servidor; banco: nós novos em `talents`, coluna `exclusive_with` e a regra da escolha permanente em `buy_talent`; menu com o ramo em foco | 1 | G | alto: cria a escolha de build |
| **4a–4d. Conteúdo por classe** | 12 magias + 6 Traços por classe, um PR por classe | 3 | M cada | alto |
| **5. Peças grandes** | campo, armadilha, mirar em aliado, transformação, parede, semente (peças 10–16) e as magias que dependem delas | 3 | G | médio-alto |
| **6. Balanceamento** | ajustes pela telemetria (seção 8) | 4 | contínuo | — |

**Fase 1, como foi entregue:** entraram só as peças que as magias repetidas precisavam para virar únicas: dano contínuo (1),
lentidão (2), linha (3), salto em cadeia (5), mais bônus contra alvo ferido (Execução), bônus por distância (Disparo
Certeiro), armadura temporária (Pele de Ferro) e mana na criatura (Fogo-Fátuo). As magias retrabalhadas: Disparo
Perfurante, Raio em Cadeia, Nevasca, Espinho Venenoso, Execução, Disparo Certeiro, Pele de Ferro, Luz Curativa e
Coração da Floresta. **Cone (4), investida (6), empurrar/puxar (7), bônus em aliados (8) e marca (9) ficaram para o PR
da primeira classe que os usar**: sem nenhuma magia usando, seriam código sem teste de verdade e um desenho no escuro.
A Nevasca ganhou lentidão em vez de campo no chão; o campo (peça 10) vem na fase 5.

**Ordem das classes na fase 4:** Paladino (tem o maior problema de identidade) → Feiticeiro (falta o fogo; e é a
classe mais jogada: 21 de 32 hunts) → Druida → Cavaleiro (o que está mais redondo hoje).

Como a escolha é permanente, uma especialização só abre para compra com o Traço e as 2 magias prontos, e os dois
lados do ramo abrem juntos. Por isso as peças da fase 5 que uma classe usa entram **antes** do PR dessa classe na
fase 4. Exemplos: o campo (peça 10) antes do Paladino (Solo Consagrado, Cordão de Flechas); a mira em aliado e a
semente (peças 13 e 16) antes do Druida.

**Banco e economia (fase 3):**
- Nós novos entram em `talents` com `requires_id` apontando para o fim do tronco, e os Traços com custo próprio.
- A tabela de preços (`SPELL_COST_BY_ROW`) precisa ir até a linha 8. Hoje não há dados de gold por hunt suficientes:
  meta inicial de uma especialização completa a cada ~8–10 hunts de quem conclui o mapa, e revisar com dados reais.
- Catálogo no `packages/shared` e no banco mudam juntos, e os advisors de segurança rodam depois de cada migration.

---

## 8. Como medir se ficou divertido

Já dá para medir com a telemetria (`stats.spellsChosen`, `casts`, `damageDealt`) e o que a seção 5 acrescenta:

| Métrica | Meta |
|---|---|
| Hunts que chegam ao slot 2 | > 40% (hoje: 3 de 32) |
| Magia mais escolhida num slot, por classe | < 50% das escolhas (nenhuma magia obrigatória) |
| Especializações escolhidas | nenhuma abaixo de 20% das escolhas do ramo (um lado ruim tranca o jogador para sempre) |
| Gold gasto no Grimório por jogador ativo | subir semana a semana até a fase 4 |
| Taxa de conclusão por classe | diferença < 10 pontos percentuais entre classes |
| Magias por minuto | não cair (efeitos novos não podem deixar o jogo lento de jogar) |

---

## 9. Riscos e como reduzir

| Risco | Por quê | Mitigação |
|---|---|---|
| **Escopo grande** (48 magias, 24 Traços) | dá para passar meses só nisso | fases independentes; a fase 0 sozinha já resolve o maior problema |
| **Efeito visual vira gargalo** | cada magia precisa aparecer bem num celular | 7 famílias de efeito parametrizadas por cor |
| **Poder demais** | Traço + Maestria + áureas + melhorias de nível se somam | Traço vale ~+8–10% num eixo, como as melhorias; telemetria antes de subir números |
| **Tela poluída** | campos, venenos e armadilhas no chão em 9 tiles de largura | campos com borda clara e transparência; no máximo 2 campos do mesmo jogador ao mesmo tempo |
| **Celular fraco** | campos e danos contínuos geram mais atualizações por segundo | tique de 500 ms (não por frame); medir o tick do servidor com 4 jogadores |
| **Só 2 slots** | 22 magias por classe e 2 por hunt: muita coisa não é usada | é intencional (a escolha é o jogo), e os Traços garantem que a especialização vale mesmo sem a magia dela no slot |
| **Escolha permanente errada** | o jogador escolhe um lado fraco e fica preso nele | lados lançados juntos e balanceados antes; confirmação clara; ajustar números do lado fraco em vez de liberar troca |
| **Reanimar forte demais** | um druida torna a equipe quase imortal | 1 semente por druida, 60 s de recarga e só salva uma vez |
| **Paladino perde a cura** | quem joga de suporte com ele pode não gostar | Guardião da Luz vira proteção (escudo e armadura), sem cura: cura é do druida |

---

## 10. Decisões tomadas

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Slot 2 no nível 6? | **Sim.** Feito na fase 0. |
| 2 | Especialização: ativar por hunt ou permanente? | **Permanente.** Comprar um lado tranca o outro (seção 4.1). |
| 3 | Os jogadores se reanimam? | **Sim, só com a magia do druida** (Renascer da Semente, seção 6.4). |
| 4 | Ordem das classes e cortes no catálogo | **Decisão do Claude** (abaixo). |

Ajustes no catálogo que decidi (já aplicados na seção 6):

- **Paladino sem cura.** A primeira versão dava ao Guardião da Luz uma cura num aliado e um campo de cura, o que
  repetia o druida. Agora ele protege: Escudo da Luz (escudo num aliado mirado), Solo Consagrado dá armadura e a
  Aura Sagrada corta dano. Cura e reanimar ficam só com o druida.
- **Renascer da Semente** virou a magia de reanimar, salvando o aliado no momento da morte (seção 6.4).
- **Ordem da fase 4:** Paladino → Feiticeiro → Druida → Cavaleiro, como recomendado na seção 7.
- Lados de um mesmo ramo **saem juntos no mesmo PR**: com a escolha permanente, lançar só um lado forçaria quem
  quer a especialização a escolher antes de ver a outra.
