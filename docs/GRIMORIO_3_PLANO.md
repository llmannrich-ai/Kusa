# Grimório 3.0: slot 3, áureas, passivas e economia de ouro

Plano de expansão do Grimório das 4 classes. Documento de planejamento: quando uma fase for entregue, o `GDD.md`
passa a descrever o que vale e este arquivo marca a fase como feita.

**Andamento:** planejamento (nenhuma fase feita).

---

## 1. Diagnóstico com números (main de 01/11/2026)

### 1.1 Tamanho e custo do Grimório hoje

| Classe | Nós | Magias (slot 1 / slot 2) | Custo de tudo | Linha mais funda |
|---|---|---|---|---|
| Cavaleiro | 44 | 15 / 16 | 42.836 | 8 |
| Paladino | 40 | 13 / 14 | 38.936 | 7 |
| Feiticeiro | 41 | 14 / 14 | 40.036 | 8 |
| Druida | 42 | 14 / 15 | 40.336 | 8 |

Como os dois lados de cada especialização se excluem, o que um jogador **consegue** comprar numa classe é ~29 mil.
Do custo total, 66% são magias, 14% Traços, 13% Tomos e só 8% áureas (as áureas são baratas: 120 a 300 o 1º nível).

### 1.2 Renda

Hunt solo terminada, média de gold creditado: Cripta 67, Brejo 147, Pântano 149, Deserto 171, Dunas 217, Caverna 401.
Nos últimos 7 dias com jogo, entre 130 e 6.300 de gold por dia somando todas as contas.

### 1.3 O achado mais importante: o ouro acumula porque a árvore trava, não só porque acaba

Simulação com a conta `leo` (7.888 de gold, 51 nós comprados):

| Classe | Compráveis agora | Custo deles | Travados por XP de uso da magia-pai | Travados por falta de comprar o pai |
|---|---|---|---|---|
| Cavaleiro | 5 | 1.506 | 14 | 8 |
| Paladino | 6 | 2.059 | 19 | 8 |
| Feiticeiro | 9 | 3.755 | 14 | 8 |
| Druida | 6 | 1.926 | 18 | 9 |

Somando as 4 classes, o jogador pode gastar ~9.200 **hoje**, e já tem 7.888. Ainda há ~100 mil de Grimório que ele
não comprou, mas 65 nós estão travados porque o nó pai é uma magia que pede **nível de uso 1** (60 XP), e o XP de
uso só sobe nas magias que o jogador leva para a hunt (uma por slot; `finish_solo_run` aceita só 2 magias). Várias
magias compradas estão com 0 XP (ex.: Pele de Ferro, Lâmina Dupla, Ferida Aberta) e travam tudo abaixo delas.

**Consequência para o plano:** só adicionar 60 nós novos com o mesmo tipo de trava **piora** o problema: mais
magias, mesma quantidade de slots, mais nós travados e mais ouro parado. A expansão precisa vir junto com uma
correção do ritmo de XP e com um destino de ouro que não dependa de XP.

---

## 2. Objetivos e métricas de sucesso

| Objetivo | Métrica | Alvo (proposta) |
|---|---|---|
| O ouro sempre tem destino | Nós compráveis agora / gold da conta (contas ativas) | ≥ 1,5× o saldo em todas as contas com mais de 20 hunts |
| Grimório mais longo | Custo comprável por classe | de ~29 mil para o que a meta de hunts pedir (D3) |
| Mais profundo | Linha mais funda | de 8 para 11 |
| Slot 3 com escolha real | Magias de slot 3 por classe | 9 (3 sem especialização + 6 de especialização) |
| Poder fora dos botões | Magias passivas por classe | 9 (3 sem especialização + 6 de especialização) |
| Áureas com personalidade | Áureas por classe | de 4 genéricas para 4 + 6 de especialização |
| Não quebrar o começo | Custo das linhas 0–3 | **igual ao de hoje** (o começo é onde o jogador novo fica ou sai) |

Ritmo esperado: a ~250 de gold por hunt no meio do jogo, cada 25 mil de Grimório = ~100 hunts. A meta de hunts para
fechar uma classe precisa ser decidida (seção 10, decisão D3).

---

## 3. Estrutura nova da árvore

Mantém as **3 colunas** (o desenho no celular em retrato não comporta uma 4ª) e cresce para baixo:

```
linha 0      raiz (slot 1)
linhas 1–4   tronco + costelas + Tomo          (igual a hoje, mesmos preços)
linha 5      ★ magia de slot 3 do ramo          (NOVA, sem especialização: todos chegam)
linha 4–5    ○ passiva do ramo, costela         (NOVA, sem especialização: todos chegam)
linhas 5–8   Traço → magias da especialização   (igual a hoje, preços sobem)
linha 9      ◆ magia de slot 3 da especialização (NOVA, uma de cada lado)
             ○ passiva da especialização ao lado dela, nas pistas −2/+2 (NOVA, uma de cada lado)
linha 10     ✦ áurea da especialização, 3 níveis (NOVA, uma de cada lado)
linha 11     ◆ costela rara (slot 1 ou 2), 1 por classe, presa num ramo   (NOVA)
```

Por classe entram **26 nós**: 3 magias de slot 3 do tronco, 6 de especialização, 6 áureas de especialização,
9 passivas (3 do tronco + 6 de especialização) e 2 magias raras de slot 1/2 (costelas). O jogador alcança
3 + 3 + 3 + 6 + 2 = 17 deles.

Onde a classe já está na linha 8 (Cavaleiro Lâmina, Feiticeiro Trevas, Druida Matilha e Bosque), as novas linhas
viram 9–11 do mesmo jeito; o desenho do Grimório (`menu.ts`) precisa de rolagem vertical se ainda não tiver.

### 3.1 Regras de trava (corrige o achado 1.3)

| Nó | Pede hoje | Proposta |
|---|---|---|
| Tronco e costelas (linhas 1–4) | magia-pai no nível de uso 1 | magia-pai **comprada** (sem XP) |
| Traço e magias da especialização | magia-pai no nível 1 | igual (a escolha permanente pede ter usado) |
| Slot 3 do tronco (linha 5) | — | magia-pai no nível de uso **2** |
| Slot 3 e áurea da especialização | — | magia-pai no nível 2 **e** o slot 3 do tronco comprado |

Assim o começo libera rápido (o ouro tem destino) e o fim continua pedindo ter jogado com as magias.

### 3.2 Novo destino de ouro sem XP: "Estudar" (opcional, decisão D2)

Botão na ficha de uma magia comprada: paga gold e recebe XP de uso, **só até o nível 1** (60 XP). Preço proposto:
2× o preço da magia. Resolve o caso "comprei e nunca usei", vira destino de ouro e não deixa pular o fim do jogo.
Risco: cheira a pagar para pular; por isso o teto no nível 1. Precisa de uma função `security definer` nova
(`study_spell`) e da mesma conta no `packages/shared`.

---

## 4. Preços

| Nó | Hoje | Proposta |
|---|---|---|
| Magias linhas 0–3, áureas genéricas, Tomos | 150–500 | igual |
| Magias linha 4 | 800 | 1.000 |
| Traço | 1.000 | 2.000 |
| Magias da especialização (1ª / 2ª) | 1.200 / 1.600 | 2.000 / 2.800 |
| **Slot 3 do tronco** (novo) | — | 3.000 |
| **Slot 3 da especialização** (novo) | — | 5.000 |
| **Áurea da especialização** (nova, 3 níveis, ×1,8) | — | 2.000 + 3.600 + 6.480 = 12.080 |
| **Costela rara** (nova) | — | 2.500 |
| **Passiva do tronco** (nova, 2 níveis, ×1,8) | — | 2.500 + 4.500 = 7.000 |
| **Passiva da especialização** (nova, 2 níveis, ×1,8) | — | 4.000 + 7.200 = 11.200 |

Conta do comprável por classe: ~33 mil (hoje, com os aumentos) + 9 mil (slot 3 tronco) + 15 mil (slot 3 spec) +
36 mil (áureas spec) + 5 mil (raras) + 21 mil (passivas do tronco) + 34 mil (passivas spec) ≈ **153 mil**.

Isso é ~600 hunts a 250 de gold: longo demais se nada mais mudar. Recomendação: decidir a meta em hunts (D3) e
calibrar com **um multiplicador único** nos preços novos (`NEW_NODE_PRICE_SCALE` em `talents.ts`, repetido na
migration), em vez de mexer nó por nó. Exemplos: meta de 300 hunts → multiplicador ~0,45 nos nós novos; meta de
400 → ~0,65. Os mapas novos (Mata Antiga, Coração da Mata, Fortaleza) pagam mais e encurtam isso; medir antes.

Quem já comprou não paga a diferença (o banco cobra pelo `base_cost` na hora da compra). Mudar o preço é uma
migration no `talents` + a mesma tabela em `talents.ts` (o teste do catálogo confere).

---

## 5. Identidade do slot 3

Slot 1 = magia rápida, slot 2 = magia forte. **Slot 3 = Poder**: recarga longa (25–45 s), mana alta, efeito que
decide a luta. Dois tipos:

- **Magia de poder:** um golpe grande (área enorme, cadeia longa, invocação forte).
- **Áurea ativa:** campo que **acompanha o herói** por 8–15 s e afeta quem está em volta (aliados e/ou monstros).
  Mecânica nova (seção 7); é o que dá cara de "áurea" ao slot 3.

Cada classe tem pelo menos 2 áureas ativas entre as 9 magias de slot 3.

Áurea passiva (nó de 3 níveis, linha 10) é outra coisa: bônus permanente, como as 4 de hoje, mas com um atributo
ligado à especialização.

---

## 6. Conteúdo por classe

Legenda: **T** = slot 3 do tronco (todos), **E** = slot 3 da especialização, **Á** = áurea passiva da
especialização, **R** = costela rara. Os efeitos usam campos que já existem em `SpellDef` sempre que possível;
"(novo)" marca o que pede código no motor. Números são ponto de partida para o `balanco.ts`, não finais.

### 6.1 Cavaleiro (Lâmina, Bastião, Comando)

| Ramo / lado | Tipo | Nome | Efeito |
|---|---|---|---|
| Lâmina | T | Corte do Horizonte | Cone de 3 tiles, 3,0× de dano e sangramento 0,4×/s por 4 s. Recarga 25 s |
| Bastião | T | Muralha de Escudos | Guarda 50% por 6 s em si e +armadura nos aliados a até 3 tiles |
| Comando | T | Clamor de Guerra | Áurea ativa 10 s, raio 4: aliados +20% de dano; provoca os monstros no raio ao conjurar |
| Berserker | E | Carnificina | 10 s: básico +50% de ritmo e +30% de dano, recebe +20% de dano |
| Berserker | Á | Áurea do Sangue | +2% de roubo de vida por nível (novo atributo) |
| Duelista | E | Dança das Lâminas | Salta em até 4 monstros seguidos, 1,6× em cada (investida + cadeia; novo) |
| Duelista | Á | Áurea da Esgrima | −4% de recarga das magias por nível (novo atributo) |
| Guardião | E | Égide do Rei | Áurea ativa 12 s, raio 3: aliados recebem 30% menos dano (novo: guarda em aliados) |
| Guardião | Á | Áurea do Juramento | +5% de armadura por nível (novo atributo) |
| Inabalável | E | Montanha Viva | Guarda 70% por 5 s; ao fim, explode em raio 2 com 2× de dano |
| Inabalável | Á | Áurea da Rocha | +5% de armadura por nível |
| Senhor da Guerra | E | Estandarte do Conquistador | Campo 15 s: aliados +30% de dano e curam 2%/pulso |
| Senhor da Guerra | Á | Áurea do Comando | −4% de recarga das magias por nível |
| Desafiante | E | Duelo Mortal | Marca 1 monstro (+40% de dano da equipe, 10 s), provoca e cura 5% por monstro provocado |
| Desafiante | Á | Áurea da Provocação | +2% de roubo de vida por nível |
| Lâmina (costela) | R, slot 1 | Golpe Trovejante | Golpe 1,8× que atordoa 0,8 s |
| Comando (costela) | R, slot 2 | Salto Esmagador | Salto de 3 tiles e área de raio 1,5 que atordoa |

### 6.2 Paladino (Mira, Luz, Batedor)

| Ramo / lado | Tipo | Nome | Efeito |
|---|---|---|---|
| Mira | T | Flecha do Juízo | Linha de 10 tiles, 4,0× e +8% por tile de distância |
| Luz | T | Coluna de Luz | Campo 8 s, raio 2: fere monstros (+100% em mortos-vivos) e cura aliados dentro |
| Batedor | T | Tempestade de Flechas | Área raio 3 que se repete 4 vezes, 0,9× cada |
| Atirador de Elite | E | Disparo Final | 5,0× num alvo, +150% abaixo de 30% de vida; matar devolve 70% da recarga |
| Atirador de Elite | Á | Áurea do Atirador | +4% de dano em magias de alvo único por nível (novo atributo) |
| Caçador Ágil | E | Corrida do Caçador | Salto + 8 s de +30% de velocidade e +40% de ritmo no básico |
| Caçador Ágil | Á | Áurea do Vento | −4% de recarga das magias por nível |
| Cruzado | E | Julgamento Celestial | Raio em cadeia sagrado, 6 saltos, +100% em mortos-vivos |
| Cruzado | Á | Áurea da Cruzada | +6% de dano em mortos-vivos por nível (novo atributo) |
| Guardião da Luz | E | Santuário | Áurea ativa 10 s, raio 3: aliados curam 3%/s e +armadura |
| Guardião da Luz | Á | Áurea da Graça | +6% de cura feita por nível (novo atributo) |
| Artilheiro | E | Canhão de Pólvora | Área raio 3, 4,0× e empurra 2 tiles |
| Artilheiro | Á | Áurea da Pólvora | +4% de dano em área por nível (novo atributo) |
| Armadilheiro | E | Campo Minado | Espalha 4 armadilhas em volta do ponto mirado (novo: várias armadilhas) |
| Armadilheiro | Á | Áurea do Engenho | Campos e armadilhas duram +15% por nível (novo atributo) |
| Mira (costela) | R, slot 1 | Flecha Gêmea Sagrada | 2 flechas em alvos diferentes, 1,1× cada |
| Luz (costela) | R, slot 2 | Rede Abençoada | Área raio 2 que prende 2,5 s e marca mortos-vivos |

### 6.3 Feiticeiro (Raio, Gelo, Trevas)

| Ramo / lado | Tipo | Nome | Efeito |
|---|---|---|---|
| Raio | T | Tempestade Elétrica | Nuvem (`look: "storm"`) por 10 s que solta raios no monstro mais perto |
| Gelo | T | Era do Gelo | Área raio 4 em si, 2,0× e −60% de velocidade por 6 s |
| Trevas | T | Eclipse | Áurea ativa 8 s, raio 3: monstros sofrem dano contínuo e devolvem 10% como mana |
| Tempestuoso | E | Ira do Trovão | Cadeia de 8 saltos, perde só 10% por salto, atordoa 0,5 s |
| Tempestuoso | Á | Áurea da Estática | +5% de dano de energia por nível (novo atributo) |
| Piromante | E | Chuva de Meteoros | 3 meteoros seguidos (raio 2,5) com queimadura |
| Piromante | Á | Áurea da Brasa | +8% de dano contínuo por nível (novo atributo) |
| Criomante | E | Zero Absoluto | Área raio 5 em si: atordoa 2,5 s e 2,0× |
| Criomante | Á | Áurea do Inverno | +4% de dano em área por nível |
| Arcanista | E | Distorção Arcana | Teletransporte + zera a recarga do slot 1 (novo) |
| Arcanista | Á | Áurea do Arcano | −4% de recarga das magias por nível |
| Necromante | E | Exército dos Mortos | Levanta 4 esqueletos por 20 s |
| Necromante | Á | Áurea da Morte | Criaturas +6% de dano e vida por nível (novo atributo) |
| Bruxo | E | Pacto do Abismo | Marca todos no raio 4 (+30% de dano, 8 s) e dano contínuo |
| Bruxo | Á | Áurea da Maldição | +8% de dano contínuo por nível |
| Raio (costela) | R, slot 1 | Faísca Gêmea | 2 faíscas que saltam 1 vez cada |
| Gelo (costela) | R, slot 2 | Espelho de Gelo | Escudo de 4 s que congela (prende) quem bate corpo a corpo |

### 6.4 Druida (Matilha, Bosque, Espinhos)

| Ramo / lado | Tipo | Nome | Efeito |
|---|---|---|---|
| Matilha | T | Chamado Ancestral | Invoca 2 lobos e dá às criaturas +40% de ritmo por 8 s |
| Bosque | T | Árvore da Vida | Campo 12 s: aliados dentro curam e recuperam mana a cada pulso |
| Espinhos | T | Selva de Espinhos | Campo 8 s, raio 3: prende e dá dano contínuo de veneno |
| Mestre das Feras | E | Fera Primordial | Invoca um Grifo por 25 s (invocação nova; arte nova) |
| Mestre das Feras | Á | Áurea da Matilha | Criaturas +6% de dano e vida por nível |
| Metamorfo | E | Fúria Primal | Prolonga a forma animal atual em 8 s e dá +40% de dano nela |
| Metamorfo | Á | Áurea da Fera | +5% de dano em forma animal por nível (novo atributo) |
| Círculo da Vida | E | Florada Eterna | Cura 40% de todos os aliados a até 6 tiles e dá cura contínua |
| Círculo da Vida | Á | Áurea da Primavera | +6% de cura feita por nível |
| Guardião da Natureza | E | Casca Anciã | Áurea ativa 12 s, raio 3: aliados +armadura e devolvem 20% do golpe corpo a corpo |
| Guardião da Natureza | Á | Áurea da Raiz | +5% de armadura por nível |
| Peste | E | Praga Rastejante | Veneno forte; monstro que morre envenenado passa o veneno aos vizinhos (novo) |
| Peste | Á | Áurea do Veneno | +8% de dano contínuo por nível |
| Tempestade | E | Olho do Furacão | Áurea ativa 10 s, raio 2: fere e empurra os monstros que entram |
| Tempestade | Á | Áurea do Trovão | +5% de dano de energia por nível |
| Bosque (costela) | R, slot 1 | Semente Explosiva | Semente no alvo que explode em 1,5 s (raio 1,5) |
| Espinhos (costela) | R, slot 2 | Raízes Profundas | Linha de raízes que prende todos na reta por 2 s |

### 6.5 Magias passivas (não ocupam slot)

Nó novo do tipo **passiva**: comprada no Grimório, vale a hunt inteira e **dispara sozinha** quando o gatilho
acontece. Não tem botão, não gasta mana e não entra na escolha dos slots. Cada uma tem **chance** e **recarga
interna** (para não disparar sem parar), e 2 níveis comprados com gold (o nível 2 sobe chance ou força). Não sobe
por uso: é o destino de ouro que não depende de XP.

Diferença para o resto: a **áurea** é número fixo (+5% de armadura); o **Traço** é a regra da especialização
(nível único, um por ramo); a **passiva** é um evento ("ao matar, explode").

Gatilhos (cada um é um gancho na `Hunt`): acertar o básico, matar, levar golpe, cair abaixo de X% da vida, a cada
N s, a cada N magias, ficar parado, sair da forma animal, criatura matar, curar com magia.

| Classe | Ramo / lado | Nome | Gatilho → efeito |
|---|---|---|---|
| Cavaleiro | Lâmina (T) | Golpe Reflexo | Básico, 15%: corte em volta (raio 1, 1,2×). Recarga 2 s |
| Cavaleiro | Bastião (T) | Vigília | 8 s sem levar dano: o próximo golpe recebido sai pela metade |
| Cavaleiro | Comando (T) | Brado Vitorioso | Matar: aliados a até 4 tiles curam 3% da vida. Recarga 5 s |
| Cavaleiro | Berserker | Sede Insaciável | Matar com o básico: recupera 4% da vida |
| Cavaleiro | Duelista | Golpe de Misericórdia | Básico em monstro abaixo de 25% da vida: +60% de dano |
| Cavaleiro | Guardião | Escudo Leal | A cada 10 s: o aliado mais ferido a até 4 tiles ganha +6 de armadura por 4 s |
| Cavaleiro | Inabalável | Raiz de Ferro | Parado por 2 s: +5 de armadura até andar |
| Cavaleiro | Senhor da Guerra | Tambores de Guerra | A cada 3 magias: aliados a até 4 tiles +15% de dano por 5 s |
| Cavaleiro | Desafiante | Ira Provocada | Monstro provocado que bate em você leva 0,5× de volta |
| Paladino | Mira (T) | Tiro Certeiro | 4º básico seguido no mesmo alvo: 2× de dano |
| Paladino | Luz (T) | Bênção Silenciosa | A cada 12 s: cura 5% em você e no aliado mais ferido a até 5 tiles |
| Paladino | Batedor (T) | Flecha Ricochete | Básico, 15%: a flecha salta para outro monstro (0,7×) |
| Paladino | Atirador de Elite | Ponto Fraco | Básico a 6 tiles ou mais: marca o alvo (+10% de dano da equipe, 4 s) |
| Paladino | Caçador Ágil | Instinto de Fuga | Abaixo de 35% da vida: +40% de velocidade por 3 s e monstros a até 2 tiles ficam 50% mais lentos. Recarga 25 s |
| Paladino | Cruzado | Martelo da Fé | Matar morto-vivo: explosão sagrada (raio 1,5, 1×) |
| Paladino | Guardião da Luz | Graça Protetora | Aliado abaixo de 30% da vida: +8 de armadura e cura de 10%. Recarga 20 s por aliado |
| Paladino | Artilheiro | Estilhaços | Monstro morto por magia de área explode (raio 1, 0,5×) |
| Paladino | Armadilheiro | Mina de Sobra | Armadilha disparada deixa uma menor no lugar (uma vez) |
| Feiticeiro | Raio (T) | Descarga | Magia, 15%: solta uma faísca (0,6×) no monstro mais perto |
| Feiticeiro | Gelo (T) | Pele Gélida | Quem bate em você corpo a corpo fica 30% mais lento por 2 s |
| Feiticeiro | Trevas (T) | Toque Sombrio | Básico, 20%: dano contínuo de sombra (0,3×/s por 4 s) |
| Feiticeiro | Tempestuoso | Sobrecarga | A cada 4 magias de energia: a próxima salta em +2 monstros |
| Feiticeiro | Piromante | Rastro em Chamas | Monstro que morre queimando explode em fogo (raio 1, 0,6×) |
| Feiticeiro | Criomante | Fragmentos | Monstro que morre preso ou lento solta estilhaços (raio 1,5, 0,6×) |
| Feiticeiro | Arcanista | Eco Arcano | Magia, 10%: não entra em recarga. Recarga 10 s |
| Feiticeiro | Necromante | Servo Eterno | Matar, 10%: levanta um esqueleto por 8 s. Recarga 6 s |
| Feiticeiro | Bruxo | Mau Olhado | Básico, 25%: amaldiçoa o alvo (+8% de dano da equipe, 4 s) |
| Druida | Matilha (T) | Instinto da Matilha | Criatura sua mata: você cura 5% da vida |
| Druida | Bosque (T) | Orvalho | A cada 8 s: aliados a até 4 tiles curam 2% da vida |
| Druida | Espinhos (T) | Pólen Tóxico | Básico, 20%: envenena (0,3×/s por 4 s) |
| Druida | Mestre das Feras | Ira do Alfa | Você abaixo de 50% da vida: criaturas +30% de dano por 6 s. Recarga 20 s |
| Druida | Metamorfo | Instinto Selvagem | Ao sair da forma animal: cura 10% da vida |
| Druida | Círculo da Vida | Cura Gêmea | Curar com magia, 20%: outro aliado ferido recebe metade da cura |
| Druida | Guardião da Natureza | Casca Viva | Levar golpe, 15%: +4 de armadura por 4 s |
| Druida | Peste | Toxina Lenta | Monstros envenenados por você andam 15% mais devagar |
| Druida | Tempestade | Condutor | Monstro atingido por raio seu recebe +20% do próximo dano (3 s) |

Cuidados de design das passivas:
- **Não repetir Traço:** contra-ataque (Riposta), escudo abaixo de 25% (Último Bastião), raio a cada 4 magias (Céu
  Carregado) e mana ao matar (Colheita) já existem e ficaram de fora.
- **Ver que disparou:** no celular, efeito invisível não existe para o jogador. Toda passiva mostra um ícone pequeno
  sobre o herói quando dispara (sem tremor de câmera) e conta na telemetria como fonte de dano/cura própria.
- **Orçamento de poder:** cada passiva vale ~5–10% do DPS ou da sobrevivência da classe; o `balanco.ts` confere.
- **Bots:** passivas funcionam sozinhas, então os bots ganham com elas sem código novo no `botAi.ts`.

**Total:** 36 magias de slot 3, 36 passivas, 8 raras de slot 1/2 e 24 áureas de especialização (104 nós novos).

---

## 7. Trabalho no motor (antes do conteúdo)

Para não espalhar código único, os efeitos novos foram agrupados em poucas peças reaproveitáveis:

| Peça | Usada por | Onde mexe |
|---|---|---|
| **Campo que acompanha o herói** (`field.follow: true`) | 9 áureas ativas | `hunt.ts` (posição do campo = posição do herói a cada pulso), desenho no cliente |
| **Guarda em aliados** no campo (`field.allyGuard`) | Égide do Rei | `hunt.ts` |
| **Atributos novos de áurea**: roubo de vida, recarga e armadura **já existem** em `PerkBonuses` (`lifesteal`, `castHaste`, `armor`): a áurea só passa a alimentá-los. Novos de verdade: cura feita, dano em área, dano contínuo, poder das criaturas, dano por tipo (energia, mortos-vivos, alvo único, forma animal) | 24 áureas | `AuraStat`/`Bonuses` em `talents.ts`, aplicação em `hunt.ts`, ficha do herói, `RunStats` |
| **Passivas**: tipo de nó `passive`, catálogo novo `packages/shared/src/passives.ts` (`{ trigger, chance, cooldownMs, efeito }`), 10 ganchos de gatilho na `Hunt`. O efeito reaproveita `applySpell` (mesmo caminho das armadilhas e campos) ou um bônus curto. Teto global: 1 disparo de passiva a cada 300 ms por herói | 36 passivas | `hunt.ts`, `talents.ts`, ícone de disparo no cliente, `RunStats` (fonte `passiva:<id>`) |
| Peças únicas (1 por classe no máximo): cadeia de investidas, várias armadilhas, zerar recarga, veneno que se espalha, Grifo | 5 magias | `hunt.ts`, `summons.ts`, arte |

Recomendação: se o prazo apertar, as 5 peças únicas são as primeiras a virar efeito simples (ex.: Campo Minado vira
uma armadilha grande). O resto do conteúdo não depende delas.

---

## 8. Fases e PRs

Uma branch e um PR por fase (fluxo do `CLAUDE.md`). Fases 4 a 7 podem andar em paralelo depois da 3.

| Fase | Entrega | Depende de | Tamanho |
|---|---|---|---|
| **0. Contrato com o slot 3** | Combinar com a sessão do slot 3: `SpellSlot = 0 \| 1 \| 2`, nível de abertura (`SPELL_SLOT_LEVELS[2]`), `finish_solo_run`/`record_spell_xp` aceitando 3 magias, botão na `#actions`, bot usando o slot 3. **Esta sessão não mexe nisso.** | — | conversa |
| **1. Ritmo de XP e economia** | Travas da seção 3.1, preços da seção 4, `study_spell` (se D2 = sim). Migration + `talents.ts`. Mede o efeito antes de entrar conteúdo | — | P |
| **2. Motor** | Campo que acompanha, guarda em aliados, 8 atributos de áurea, contadores no `RunStats`. Testes na arena (`arena.ts`) para cada peça | 0 mesclado | M |
| **2b. Passivas (motor + 3 do tronco de 1 classe)** | Tipo `passive`, `passives.ts`, ganchos de gatilho, ícone de disparo, telemetria. Pode entrar **antes do slot 3** (não depende dele) e já dá destino ao ouro | 1 | M |
| **3. Desenho do Grimório** | Linhas 9–11, rolagem, selo "slot 3" no nó, desenho do nó de passiva (anel), ficha da áurea nova. Testar em 412×915 com toque e deitado (915×412) | 0 | P |
| **4. Cavaleiro** | 26 nós: `spells.ts`, `talents.ts`, migration dos `talents`, testes na arena, ícones | 1, 2, 3 | M |
| **5. Paladino** | idem | 1, 2, 3 | M |
| **6. Feiticeiro** | idem | 1, 2, 3 | M |
| **7. Druida** | idem (+ Grifo) | 1, 2, 3 | M+ |
| **8. Balanceamento** | `balanco.ts` (DPS no nível 20 com slot 3) + `/balanceamento` com 1–2 semanas de telemetria; ajuste de números | 4–7 no ar | P, contínuo |

Ordem das classes: começar pela que tem mais telemetria (Cavaleiro) para validar o molde antes de replicar.

### 8.1 Checklist de cada PR de conteúdo

- [ ] Magia nova em `SpellId` e `SPELLS` (ou passiva em `passives.ts`), nó em `SHAPES`/`RIBS`, preço na tabela.
- [ ] Passiva: teste na arena do gatilho, da chance (seed fixa) e da recarga interna.
- [ ] Migration nova em `supabase/migrations/` com as linhas do `talents` (mesmo id, preço e pai); advisors de segurança.
- [ ] Teste na arena para cada efeito novo ou combinação nova (sem depender de mapa sorteado).
- [ ] Catálogo mostra as magias (vem sozinho do `packages/shared`); teste `catalogo` verde.
- [ ] Contadores de `RunStats` para dano, cura e invocação das magias novas.
- [ ] Bot sabe usar as magias novas (`botAi.ts`), ou fica fora delas de propósito.
- [ ] `GDD.md` atualizado (tabelas de especialização ganham a coluna "slot 3" e "áurea").
- [ ] `npm run check` verde; teste manual em 412×915 e 915×412.

---

## 9. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Mais magias, mesmos slots: mais nós travados por XP | ouro continua parado | Fase 1 vem **antes** do conteúdo |
| Conflito com a sessão do slot 3 nos mesmos arquivos (`spells.ts`, `hunt.ts`, `spellbar.ts`, `messages.ts`) | retrabalho, merge difícil | Fase 0; conteúdo só depois do slot 3 no `main`; esta frente não mexe em `spellbar.ts` nem no fluxo do slot |
| `messages.ts` e `dungeon.ts` mudam o `RULES_VERSION` | cliente antigo recarrega sozinho | aceitável; evitar mexer neles fora do necessário |
| Slot 3 forte demais (3 magias de recarga longa empilhadas) | hunt trivial | recarga 25–45 s, mana alta, conferir DPS no `balanco.ts` antes do merge |
| Áureas passivas somadas (8 atributos + 4 antigos) | ficha confusa, poder escondido | 1 áurea nova por especialização; mostrar tudo na ficha do herói |
| Preço do fim alto demais | jogador desiste antes de completar | medir "hunts até completar a classe" na telemetria; cortar a áurea de especialização para 2 níveis |
| Hunt solo credita pelo cliente | XP de 3 magias precisa caber no `SOLO_LIMITS` | parte da Fase 0 (`spellXpPerSecond` e o limite de magias por hunt) |
| Passivas disparando demais (efeito poluído na tela, custo de CPU na sala do aparelho) | celular esquenta, jogador não entende | recarga interna em toda passiva + teto global por herói; medir na sala hospedada |
| 104 nós novos de uma vez | bug difícil de achar | 1 classe por PR, arena para cada efeito |

---

## 10. Decisões pendentes

- **D1. Áurea ativa no slot 3:** aceitar a mecânica "campo que acompanha o herói" (proposta) ou deixar o slot 3 só
  com magias de poder?
- **D2. "Estudar" magia com gold até o nível 1:** sim ou não?
- **D3. Meta de hunts para fechar uma classe:** com tudo a preço cheio são ~153 mil (~600 hunts). Proposta: meta de
  ~300–400 hunts, calibrada pelo multiplicador único dos nós novos (seção 4).
- **D4. Preço dos nós antigos de especialização:** subir como na seção 4 (quem já comprou não perde nada) ou só os
  nós novos ficam caros?
- **D5. Passivas com 2 níveis** (destino de ouro sem XP, proposta) ou nível único (árvore mais barata)?
