# Kusa — Game Design

RPG de dungeon cooperativo para navegador, com tema de Dungeons & Dragons e visual inspirado no Tibia
(pixel art 32×32, câmera de cima). As partidas são curtas, e entre elas existe um metajogo de progressão.

## Plataforma: mobile primeiro

O jogo roda no navegador, mas **o alvo principal é o celular**. Toda mecânica nasce pensada para o toque;
teclado e mouse no desktop são um extra.

- **Celular na vertical (retrato)**, jogável com uma mão ou com os dois polegares. Deitado, aparece um aviso para voltar à vertical.
- **Dois polegares:** o esquerdo move, o direito ataca e conjura.
- **Movimento:** joystick virtual flutuante, que aparece onde o polegar toca na metade esquerda da parte de baixo da tela (abaixo de 45% da altura), com 8 direções.
- **Ações:** botões grandes no canto inferior direito: o ⚔️ do ataque básico embaixo, mais perto do polegar, e os 2 slots de magia acima dele; numa coluna ao lado, as poções de vida e de mana.
- **Alvo:** o ataque básico vai no alvo travado ou, sem ele, no monstro mais próximo ao alcance (o anel vermelho mostra qual). Tocar num monstro (em qualquer parte da tela) trava o alvo nele; tocar nele de novo destrava. Se o alvo travado sair do alcance, o golpe vai no monstro mais próximo ao alcance (o alvo continua travado).
- **Mira das magias:** magia com alvo (única ou de área) mira arrastando a partir do botão (ver "Ataques e magias").
- **Tela:** sempre 9 tiles de largura (pelo menos 13 de altura), com o jogador um pouco acima do centro, porque a parte de baixo é dos polegares. HUD no topo (tempo, barras de HP, mana e XP, loot), respeitando o notch (safe area).
- Sem zoom de pinça nem rolagem acidental. O jogo pede tela cheia e tenta travar na vertical ao entrar na hunt.
- **Desktop é só para desenvolvimento:** o jogo aparece numa coluna 9:16 no meio da tela, com WASD, clique, Espaço (atacar), 1 e 2 (magias no alvo automático), Tab e Esc.
- Sessões curtas (3 a 5 min) e entrar numa partida em poucos toques.

## Menu inicial (estilo Zooba / Clash)

Depois do login, o menu ocupa a tela inteira com 4 abas embaixo (no alcance do polegar) e o botão **Jogar** logo acima delas.
O **Jogar** abre a tela de salas (ver "Salas e sala de espera").
Código em `apps/client/src/menu.ts`.

- **Classes:** as 4 classes com retrato, papel e atributos (já com o bônus das áureas). Tocar escolhe a classe da próxima hunt.
- **Grimório:** a árvore de magias de cada classe (ver abaixo).
- **Itens:** o equipamento que vai para a próxima hunt (um item por slot, **separado por classe**: trocar de classe troca o que está no corpo), o **cofre** (20 espaços) e a **bag** (8 espaços). O cofre só é acessado aqui.
- **Mercado:** compra itens comuns até Mithral (entregues no cofre), filtrados por slot e pela classe escolhida, e vende qualquer item da conta. Itens de Dragão, raros e mágicos só saem das hunts.
- Configurações e "Sair da conta" ficam no ⚙️ do topo.
  - **Telemetria** (`apps/client/src/telemetry.ts`): os números de todas as hunts, para qualquer jogador logado, com filtro de mapa e período: visão geral, hunts por dia, como as hunts terminam, sobrevivência por classe, o que mais mata, fontes de dano, magias e melhorias escolhidas, curva de nível e as suas hunts. Só agregados, sem nomes (função `telemetry_dashboard`).
  - **Regras** (`apps/client/src/rules.ts`): como o jogo funciona, em seções que abrem e fecham. Os números (tempos, preços, melhorias, poções) vêm de `packages/shared`, então a página acompanha o balanceamento.
- Ainda por fazer: modo, cosméticos e amigos.

### Grimório (árvore de magias)

Cada classe tem uma árvore de verdade, comprada com o gold das hunts (`packages/shared/src/talents.ts`).
A raiz é a magia inicial do slot 1; dela saem **3 ramos** que descem até 5 nós de profundidade. Cada nó pede
o nó de cima no nível 1, então as magias da ponta só abrem depois das anteriores do mesmo ramo.

- **Espinha de peixe** (inspirada no Diablo 2, plano em `docs/GRIMORIO_GALHOS.md`): o tronco de cada ramo desce no
  meio e as **costelas** (`RIBS`) saem para a esquerda e a direita em alturas e tamanhos diferentes, então nenhum
  ramo tem a mesma forma. A costela nasce num nó do tronco; algumas magias pedem **dois pais** (um da costela e um do
  tronco, como a Nevasca do Diablo 2), ligados no desenho por uma diagonal pontilhada (`also_requires_id` no banco).
- **No menu, um ramo por tela**, com abas no topo (nome, magias compradas/total e ✦ se termina em especialização).
  Até 5 colunas: tronco, costelas dos dois lados e, no pé, os dois lados da especialização. O losango do Traço leva
  o nome da especialização.

- **Magias** (círculo no desenho, com o número do slot): têm **3 níveis**. O 1 libera a magia como opção na
  janela de escolha da hunt; o 2 e o 3 dão +20% de dano, cura, escudo e força das criaturas, e +15% de duração,
  cada um. As 2 magias iniciais já vêm no nível 1, com os níveis 2 e 3 à venda.
- **Maestria (nível 3):** além dos números, o nível 3 de toda magia muda o que ela faz (tabela `MASTERIES` em
  `packages/shared/src/spells.ts`). No menu, a ficha da magia mostra a Maestria antes de comprar; na hunt, a escolha
  mostra "★ Maestria". Três efeitos existem só nas Maestrias: **repetir** (o efeito volta sozinho logo depois, mais
  fraco), **devolver recarga ao matar** e **roubar mana**.
- **Áureas** (quadrado no desenho): dano +4%/nível, vida +6%/nível, mana +8%/nível (3 níveis cada) e
  velocidade +4%/nível (2 níveis). Valem sempre, desde o nível 1.
- **Especializações** (losango no desenho): no fim de alguns ramos, a árvore se divide em dois lados. Cada lado
  tem um **Traço** (passiva que vale sempre, nível único, 1.000 de gold) e duas magias, uma de cada slot, que pedem o
  Traço. **A escolha é permanente:** comprar o Traço de um lado fecha o outro lado do ramo para sempre, com as
  magias dele (o banco recusa a compra em `buy_talent`). No menu, a aba do ramo aparece com ✦ e os dois lados
  ficam lado a lado no pé do ramo. A ficha do Traço avisa que a escolha é permanente e pede um
  segundo toque para confirmar. Catálogo em `packages/shared/src/traits.ts` e `talents.ts`.
  - **Paladino** (a primeira classe com os 3 ramos especializados). Ramo **Mira**:

    | Lado | Traço | Magia slot 1 | Magia slot 2 |
    |---|---|---|---|
    | **Atirador de Elite** | 🦅 Olho de Águia: +1 de alcance no básico e +20% de dano em monstros a 5 tiles ou mais | 🎯 Marca do Caçador: 0,8× e marca o alvo (+25% de dano de toda a equipe por 10 s) | 🔭 Postura do Atirador: 8 s com básico +100% e +2 de alcance, andando 50% mais devagar |
    | **Caçador Ágil** | 🍃 Passo Leve: depois de cada magia, anda 25% mais rápido por 2 s | 🤸 Rolamento: salta 3 tiles (no toque rápido, para longe do monstro; nunca no portal; com parede atrás, rola para o lado; encurralado, não sai nem gasta mana) e a próxima flecha atordoa por 1 s | 🏹 Aljava Veloz: 6 s com o básico 60% mais rápido |

  - Maestrias: Marca do Caçador marca também quem está colado no alvo; Postura do Atirador não deixa lento; Rolamento
    salta 5 tiles e dá escudo de 15% por 3 s; Aljava Veloz soma +30% de dano no básico.
  - Na hunt, o monstro marcado ganha uma mira vermelha girando, e o herói com Postura ou Aljava fica com um anel na cor da magia.
  - Ramos **Luz** e **Batedor** do Paladino (o Paladino não cura: a cura é do Druida; o Guardião da Luz protege):

    | Ramo | Lado | Traço | Magia slot 1 | Magia slot 2 |
    |---|---|---|---|---|
    | Luz | **Cruzado** | ✝️ Flechas Consagradas: básico +30% em mortos-vivos e queima o alvo por 2 s | 🔱 Lança Etérea: 1,6×, recarga de 2,5 s, +50% em mortos-vivos | 🌞 Caldeira Divina: raio 3 em volta de si, 2,2×, dobro em mortos-vivos |
    | Luz | **Guardião da Luz** | 😇 Aura Sagrada: você e os aliados a até 3 tiles recebem 10% menos dano | 🔆 Escudo da Luz: escudo de 30% num aliado mirado (no toque rápido, o mais ferido ao alcance, você incluído) | ⛪ Solo Consagrado: campo de raio 2 por 8 s, fere os monstros dentro (0,35× por segundo) e dá +5 de armadura aos aliados |
    | Batedor | **Artilheiro** | 🧨 Pólvora: suas magias de área deixam o chão em chamas por 3 s | ⚡ Flecha Relâmpago: 1,5× e salta para mais 3 monstros | 🎇 Barragem: leque de 90° e 5 tiles à sua frente, 2× |
    | Batedor | **Armadilheiro** | ⚙️ Engenhoso: armadilhas e estacas duram o dobro, e cabem 3 de cada | 🪤 Armadilha de Urso: fica no chão por 20 s; o primeiro monstro que pisar fica preso 3 s e sangra | 🎋 Cordão de Flechas: estaca por 12 s que atira 4 vezes nos monstros a até 3 tiles |

  - Maestrias: Lança Etérea atravessa a reta; Caldeira ofusca 1 s; Escudo da Luz dura o dobro; Solo Consagrado em raio 3;
    Flecha Relâmpago salta 5 vezes; Barragem faz sangrar; Armadilha prende quem está colado; Cordão atira 7 vezes.
  - **Mortos-vivos:** Esqueleto (Cripta) e Afogado (Pântano) (`undead` em `monsters.ts`).
  - **Campos no chão** (`state.fields`): a zona brilha nos tiles do raio (laranja no chão em chamas), a armadilha aparece
    como mandíbulas de ferro e a estaca como um poste com o alcance em volta. Conjurar de novo troca o campo mais antigo
    da mesma magia. A estaca e a armadilha atiram e disparam sozinhas; o dano conta para quem as pôs.
  - **Mira em aliado** (Escudo da Luz): arrastando, o herói a até 1 tile do ponto (círculo azul nos pés); parado no
    botão, o mais ferido ao alcance. **Mira em leque** (Barragem): a mira acende os tiles do leque.
  - **Feiticeiro** (os 3 ramos especializados). As magias do Feiticeiro têm elemento (energia, fogo, gelo ou trevas):

    | Ramo | Lado | Traço | Magia slot 1 | Magia slot 2 |
    |---|---|---|---|---|
    | Raio | **Tempestuoso** | 🌩️ Estática: magias de energia têm 25% de chance de atordoar 0,5 s | 📏 Feixe de Energia: linha de 6 tiles, 2× | ⛈️ Fúria dos Céus: nuvem sobre você que solta 6 raios (1,3×) nos monstros a até 4 tiles em 3,5 s |
    | Raio | **Piromante** | 🔥 Combustão: magias com dano queimam os atingidos por 4 s | 🔥 Bola de Fogo: raio 2, 1,6× e queima | 🌋 Núcleo Infernal: raio 4 em volta de si, 3×, recarga de 20 s |
    | Gelo | **Criomante** | 💎 Estilhaçar: magia em monstro preso causa +50% e o solta | 🌬️ Cone de Frio: leque de 4 tiles, 1,7× e 50% de lentidão | 🧊 Prisão de Gelo: prende tudo em raio 3 por 4 s, sem dano |
    | Gelo | **Arcanista** | 🔷 Escudo de Mana: 30% do dano recebido sai da mana | 💨 Passo Nebuloso: teleporta até 4 tiles (passa por cima de monstros) | 🧱 Muralha Mágica: parede de 3 tiles por 6 s que ninguém atravessa |
    | Trevas | **Necromante** | 💀 Colheita: monstro morto por magia devolve 3% da mana | ☠️ Morte Súbita: 3,4× num alvo | 🦴 Erguer Esqueletos: 2 esqueletos por 15 s |
    | Trevas | **Bruxo** | 👁️ Maldição: magia de alvo único marca o alvo (+15% de dano da equipe por 5 s) | 🟣 Rajada Mística: 2,2× e empurra o alvo 1 tile | 🐙 Tentáculos Negros: campo de raio 2 por 6 s que prende e fere |

  - Maestrias: Feixe atordoa 0,5 s; Fúria dos Céus solta 10 raios; Bola de Fogo em raio 3; Núcleo Infernal queima;
    Cone de Frio congela 1,5 s; Prisão de Gelo fere 1×; Passo Nebuloso dá escudo de 20%; Muralha de 5 tiles; Morte
    Súbita dobra abaixo de 30% da vida; 3 esqueletos; Rajada empurra 2 tiles; Tentáculos em raio 3.
  - **Teleporte** (Passo Nebuloso): aparece no tile livre mais longe da reta mirada; se a reta não tiver nenhum, tenta
    as diagonais e as laterais (como o Rolamento). No toque rápido, foge do monstro mais perto; sem lugar, não gasta mana.
  - **Muralha Mágica**: cada tile da parede é um campo `wall`; heróis, monstros e criaturas desviam (os monstros pelo
    pathfinding), mas magias, flechas e a visão passam. Só sobe em tile livre.
  - **Empurrar** (Rajada Mística): o alvo é empurrado para longe de quem conjura, parando em parede, água ou alguém.
  - **Druida** (os 3 ramos especializados). Só o druida do Círculo da Vida reanima (escolha de design: é o motivo para
    ter esse druida na equipe):

    | Ramo | Lado | Traço | Magia slot 1 | Magia slot 2 |
    |---|---|---|---|---|
    | Matilha | **Mestre das Feras** | 🐕 Vínculo Selvagem: criaturas com +25% de vida e de dano | 📣 Grito da Fera: suas criaturas atacam 50% mais rápido por 6 s e recuperam 20% da vida | 🦅 Águia Gigante: voa por cima da água e o mergulho (1,2×) atordoa 0,8 s, por 20 s |
    | Matilha | **Metamorfo** | 🐾 Pele Selvagem: +4 de armadura enquanto transformado | 🐆 Forma de Pantera: 6 s andando 40% mais rápido; o próximo básico salta colado no alvo com 2,5× | 🐻 Forma de Urso: 10 s com +50% de vida; o básico vira patada (1×) em todos os colados, que passam a te perseguir |
    | Bosque | **Círculo da Vida** | 🌸 Florescer: cura que passa da vida máxima vira escudo (até 20% da vida) por 6 s | 💞 Cura Distante: cura 45% de um aliado mirado a até 6 tiles | 🌰 Renascer da Semente: semente num aliado por 25 s; se ele morrer, renasce no lugar com 40% da vida e 2 s invulnerável, sem largar nada (recarga de 60 s) |
    | Bosque | **Guardião da Natureza** | 🍯 Seiva Protetora: quem você cura ganha +3 de armadura por 4 s | 🪵 Pele de Casca: escudo de 30% e +4 de armadura num aliado por 8 s | 🌧️ Chuva Revigorante: campo de raio 3 por 8 s que cura 4% da vida e devolve 2% da mana por segundo |
    | Espinhos | **Peste** | 🧪 Toxina: magias com dano envenenam, e seus venenos acumulam até 3 vezes | 🐍 Picada da Mamba: 1× e veneno forte (0,6× por segundo por 5 s); se o alvo morrer envenenado, explode (1,5× em raio 2) e envenena em volta | 🦠 Nuvem Venenosa: campo de raio 2 por 8 s que fere (0,2×) e envenena a cada segundo |
    | Espinhos | **Tempestade** | 🌩️ Céu Carregado: a cada 4 magias, um raio (2×) cai no monstro mais perto | 💥 Onda Trovejante: raio 2 em volta de si, 1,5× e empurra 2 tiles | 🌦️ Chamar Relâmpago: nuvem no ponto mirado que solta 5 raios (1,6×) a até 3 tiles em 8 s |

  - Maestrias: Grito da Fera chama um lobo por 10 s; 2 águias; o salto da pantera atordoa 1 s; o urso corta 30% do dano;
    Cura Distante tira veneno, queimadura e lentidão; a semente dura 40 s e renasce com 60%; a casca cura 20%; chuva em
    raio 4; explosão da mamba em raio 3; nuvem venenosa em raio 3; a onda atordoa 1 s; a nuvem do relâmpago solta 8 raios.
  - **Formas animais** (Pantera e Urso): a fera aparece no lugar do herói (a pantera é o lobo em tons de noite); uma forma
    troca a outra. A vida extra do urso entra cheia e sai quando a forma acaba.
  - **Renascer da Semente**: uma semente por druida (plantar outra tira a anterior); na mesma pessoa, salva uma vez. Vale
    contra golpes e venenos; não vale contra o desabamento da dungeon. Uma semente com broto flutua sobre quem a tem.
  - **Cavaleiro** (os 3 ramos especializados):

    | Ramo | Lado | Traço | Magia slot 1 | Magia slot 2 |
    |---|---|---|---|---|
    | Lâmina | **Berserker** | 💢 Sede de Batalha: +5% de dano por monstro colado (até 5) | 🌪️ Redemoinho de Aço: 3 giros seguidos em raio 1 (1,1× cada) | 😤 Fúria Berserker: 8 s com básico +40% e 30% mais rápido, recebendo +20% de dano |
    | Lâmina | **Duelista** | 🤺 Riposta: 20% de chance de devolver na hora o golpe corpo a corpo recebido | 🗡️ Lâmina Arremessada: 1,8× num alvo a até 4 tiles, que sangra | 🔪 Mil Cortes: 5 cortes de 0,9× no monstro colado, que fica atordoado enquanto apanha |
    | Bastião | **Guardião** | 🤝 Intervir: 30% do dano que os aliados a até 2 tiles levam de monstros vem para você | 💥 Bater com Escudo: 1,2×, empurra 2 tiles e atordoa 1 s | 🏛️ Égide Compartilhada: escudo de 25% em você e nos aliados a até 3 tiles, e provoca |
    | Bastião | **Inabalável** | 🏯 Último Bastião: abaixo de 25% da vida, escudo de 30% por 6 s (uma vez a cada 60 s) | 🦔 Espinhos de Ferro: 8 s devolvendo 40% do golpe corpo a corpo recebido | 🗿 Fortaleza Viva: 5 s sem andar, cortando 90% do dano; quem bate fica 50% mais lento |
    | Comando | **Senhor da Guerra** | 👑 Liderança: você e os aliados a até 4 tiles causam +8% de dano | 🐎 Investida: corre até um monstro a até 4 tiles, 1,5× e atordoa 1 s | 🚩 Estandarte de Guerra: campo de raio 2 por 10 s, aliados dentro com +20% de dano e +5 de armadura |
    | Comando | **Desafiante** | 😠 Intimidar: monstros que você provocou causam 25% menos dano em você | 🔗 Corrente de Ferro: puxa um monstro de até 5 tiles para perto e o prende 2 s | 👊 Desafio Supremo: provoca em raio 5, corta 40% do dano por 6 s e cura 3% por monstro provocado |

  - Maestrias: Redemoinho em raio 2; a fúria não deixa mais frágil; a lâmina ricocheteia em mais um; 7 cortes; a
    pancada atinge quem está colado no alvo; Égide em raio 5; espinhos devolvem 70%; a fortaleza cura 20%; a investida
    atinge quem está colado no alvo; estandarte em raio 3; a corrente faz sangrar; o desafio corta 60%.
  - **Investida**: sem alvo à vista ou sem lugar livre colado nele, não sai nem gasta mana. **Corrente**: o monstro vem
    para o tile livre colado no cavaleiro mais perto dele.
- Preço: o 1º nível de uma magia custa 300, 500, 800 ou 1.200 conforme a profundidade, no tronco e nas costelas (1.200
  e 1.600 nas magias das especializações), e cada nível seguinte custa ×1,6; as áureas custam 120–300 e ×1,8 por nível.
- No menu, tocar num nó abre os detalhes: o que ele faz no nível atual e no próximo, o pré-requisito e a compra.
- O servidor lê o Grimório da conta ao entrar na sala; nada disso vem do navegador.

| Classe | Ramo 1 | Ramo 2 | Ramo 3 |
|---|---|---|---|
| Cavaleiro (raiz: Giro da Lâmina) | **Lâmina:** Áurea de Fúria → Golpe Esmagador → Lâmina Sedenta → Terremoto → Execução → ✦ Berserker **ou** Duelista | **Bastião:** Áurea do Bastião → **Escudo da Fé** → Pele de Ferro → Muralha de Aço → ✦ Guardião **ou** Inabalável | **Comando:** Grito de Guerra → Áurea da Disciplina → Áurea da Investida → Brado do Comandante → ✦ Senhor da Guerra **ou** Desafiante |
| Paladino (raiz: Flecha Sagrada) | **Mira:** Áurea da Mira → Disparo Perfurante → Flecha Atordoante → Disparo Certeiro → ✦ Atirador de Elite **ou** Caçador Ágil | **Luz:** Áurea da Fé → Luz Curativa → Bênção Protetora → Julgamento Divino → ✦ Cruzado **ou** Guardião da Luz | **Batedor:** Chuva de Flechas → Áurea Sagrada → Áurea do Batedor → Saraivada Explosiva → ✦ Artilheiro **ou** Armadilheiro |
| Feiticeiro (raiz: Esfera Sombria) | **Raio:** Áurea do Caos → Relâmpago → Raio em Cadeia → Meteoro → ✦ Tempestuoso **ou** Piromante | **Gelo:** Áurea Arcana → Nova de Gelo → Lança de Gelo → Nevasca → ✦ Criomante **ou** Arcanista | **Trevas:** Tempestade do Vazio → Áurea da Égide → Drenar Vida → Áurea do Vento → Pacto Sombrio → ✦ Necromante **ou** Bruxo |
| Druida (raiz: Bênção da Floresta) | **Matilha:** Áurea dos Espinhos → Lobo Espiritual → Chamado da Matilha → Urso Ancestral → Áurea do Cervo → ✦ Mestre das Feras **ou** Metamorfo | **Bosque:** Áurea da Seiva → Mariposa Curandeira → Áurea do Carvalho → Guardião do Bosque → Coração da Floresta → ✦ Círculo da Vida **ou** Guardião da Natureza | **Espinhos:** Raízes Espinhosas → Espinho Venenoso → Enxame de Vespas → Fúria da Natureza → ✦ Peste **ou** Tempestade |

#### Costelas

Magias das costelas (números do nível 1). Todas combinam efeitos que o servidor já tinha; a Maestria muda o efeito no nível 3.
"A + B" = pede os dois pais.

| Classe | Ramo | Costela (pai → magias) | Magias |
|---|---|---|---|
| Cavaleiro | Lâmina | Golpe Esmagador → Corte Duplo → Corte Largo | ✂️ **Corte Duplo** (S1): 1,5× e repete com 90% · Maestria: sangra 4 s · 🌒 **Corte Largo** (S1): leque de 2 tiles, 1,7× · Maestria: leque de 3 |
| Cavaleiro | Lâmina | Lâmina Sedenta → Ferida Aberta → Fenda Sísmica (+ Terremoto) | 💔 **Ferida Aberta** (S2): 2,4× e sangra 0,5×/s por 6 s · Maestria: sangram os colados · 🪨 **Fenda Sísmica** (S2): linha de 5 tiles, 2,2× e atordoa 1 s · Maestria: 40% de lentidão depois |
| Cavaleiro | Bastião | Escudo da Fé → Golpe de Égide → Tremor do Escudo | 🔰 **Golpe de Égide** (S1): 1,4× e escudo de 15% por 6 s · Maestria: atordoa 1 s · 🥁 **Tremor do Escudo** (S2): raio 2, 1,2×, provoca e 40% de lentidão · Maestria: raio 3 |
| Cavaleiro | Comando | Grito de Guerra → Rugido Atordoante | 🦁 **Rugido Atordoante** (S2): atordoa 1,5 s em raio 3, sem dano · Maestria: 40% de lentidão depois |
| Cavaleiro | Comando | Áurea da Disciplina → Ordem de Batalha → Desafio (+ Áurea da Investida) | 🎖️ **Ordem de Batalha** (S1): 6 s com o básico +40% e 30% mais rápido · Maestria: anda 20% mais rápido · 🤜 **Desafio** (S1): provoca e marca um monstro a até 4 tiles (+20% de dano da equipe por 8 s) · Maestria: também os colados |
| Paladino | Mira | Disparo Perfurante → Tiro Duplo → Flecha Farpada | 🪶 **Tiro Duplo** (S1): 1,4× e repete com 90% · Maestria: sangra 3 s · 🪝 **Flecha Farpada** (S2): 2,4× e sangra 0,5×/s por 5 s · Maestria: 30% de lentidão |
| Paladino | Luz | Áurea da Fé → Raio Solar → Martelo Sagrado (+ Bênção Protetora) | 🌅 **Raio Solar** (S1): linha de 6 tiles, 1,6×, +50% em mortos-vivos · Maestria: ofusca 0,5 s · ⚒️ **Martelo Sagrado** (S2): 2,6×, marca o alvo (+15% por 6 s), +50% em mortos-vivos · Maestria: raio 1 |
| Paladino | Batedor | Chuva de Flechas → Flecha de Rede | 🕸️ **Flecha de Rede** (S1): raio 1, 0,6× e prende 2,5 s · Maestria: raio 2 |
| Paladino | Batedor | Áurea do Batedor → Flechas Incendiárias | 🏮 **Flechas Incendiárias** (S2): raio 2, 1× e queima 0,4×/s por 4 s · Maestria: raio 3 |
| Feiticeiro | Raio | Relâmpago → Faísca → Chuva de Brasas | ✨ **Faísca** (S1, energia): 1,1×, salta 1 vez, recarga de 2,5 s · Maestria: salta 2 · 🌠 **Chuva de Brasas** (S2, fogo): campo de raio 2 por 5 s, 0,5×/s · Maestria: queima |
| Feiticeiro | Gelo | Nova de Gelo → Geada → Orbe Congelado (+ Lança de Gelo) | 🥶 **Geada** (S1): 1,3× e 60% de lentidão por 4 s · Maestria: raio 1 · 💠 **Orbe Congelado** (S2): raio 2, 1,8×, lentidão e explode de novo com 60% · Maestria: prende 1,5 s |
| Feiticeiro | Trevas | Tempestade do Vazio → Selo Sombrio | 🕳️ **Selo Sombrio** (S1): 1× e marca o alvo (+20% por 6 s) · Maestria: raio 1 |
| Feiticeiro | Trevas | Drenar Vida → Praga | 🧫 **Praga** (S2): raio 2, 0,8× e veneno 0,4×/s por 6 s · Maestria: raio 3 |
| Druida | Matilha | Lobo Espiritual → Uivo | 🌜 **Uivo** (S1): raio 3, 0,5× e 40% de lentidão · Maestria: atordoa 0,6 s |
| Druida | Bosque | Mariposa Curandeira → Seiva Purificadora → Florada | 🫧 **Seiva Purificadora** (S1): cura 20% de um aliado e tira veneno, queimadura e lentidão · Maestria: escudo de 10% · 🌺 **Florada** (S2): cura 25% e escudo de 10% em raio 3 · Maestria: raio 4 |
| Druida | Espinhos | Raízes Espinhosas → Chicote de Cipó | 🪢 **Chicote de Cipó** (S1): linha de 4 tiles, 1,3× e prende 1 s · Maestria: envenena |
| Druida | Espinhos | Espinho Venenoso → Esporos → Explosão de Espinhos (+ Enxame de Vespas) | 🍄 **Esporos** (S2): raio 2, 0,6×, veneno e 30% de lentidão · Maestria: raio 3 · 🌵 **Explosão de Espinhos** (S2): raio 2 em volta de si, 1,6×, sangra e prende 1,5 s · Maestria: raio 3 |

- A janela de escolha da magia na hunt rola quando há muitas magias compradas no slot.
- Ainda por fazer (fase 5b, depois do PR da hunt solo): **sinergias** (magias e passivas que fortalecem um grupo de
  magias do mesmo ramo) e a escolha sorteada (3 opções por slot).

#### Maestrias

| Classe | Magia → Maestria |
|---|---|
| Cavaleiro | Giro da Lâmina: gira de novo (50%) · Grito de Guerra: cura 15% · Golpe Esmagador: atordoa 1 s · Escudo da Fé: cobre aliados a até 2 tiles e, ao quebrar, empurra os monstros colados · Lâmina Sedenta: corta todos os colados no alvo · Pele de Ferro: provoca e cura aliados a até 3 tiles · Terremoto: réplica (50%) · Muralha de Aço: corta 30% do dano · Brado do Comandante: alcança 6 tiles · Execução: dobro abaixo de 50% da vida |
| Paladino | Flecha Sagrada: salta para mais um · Chuva de Flechas: 30% de lentidão · Disparo Perfurante: alcance 9 e sangra · Flecha Atordoante: atordoa os colados no alvo · Bênção Protetora: ofusca 0,7 s · Luz Curativa: ofusca 1 s · Disparo Certeiro: matar corta metade da recarga · Julgamento Divino: queima · Saraivada Explosiva: queima |
| Feiticeiro | Esfera Sombria: explode duas vezes (50%) · Tempestade do Vazio: rouba 20% de vida · Relâmpago: atordoa 0,5 s · Raio em Cadeia: salta 5 vezes · Lança de Gelo: lentidão depois do gelo · Drenar Vida: rouba 30% em mana · Nova de Gelo: lentidão depois do gelo · Meteoro: queima e deixa uma cratera em chamas · Nevasca: raio 4 · Pacto Sombrio: rouba 50% de vida |
| Druida | Bênção da Floresta: brota uma mariposa · Raízes Espinhosas: envenenam · Espinho Venenoso: o veneno pula para mais 2 · Lobo Espiritual: 2 lobos · Mariposa Curandeira: 2 mariposas · Enxame de Vespas: 5 vespas · Fúria da Natureza: prende 1,5 s · Chamado da Matilha: 4 lobos · Urso Ancestral: dobro do tempo e, ao morrer, cura 15% da equipe · Guardião do Bosque: cura 20% da equipe · Coração da Floresta: 2 fogos-fátuos |

### Cofre, bag e mercado (extração)

Cada item da conta está num de três lugares (`VAULT_SIZE` e `BAG_SIZE` em `packages/shared/src/items.ts`):

| Lugar | Espaços | Onde se mexe | Na hunt |
|---|---|---|---|
| **Equipamento** | 1 por slot, por classe | aba Itens | entra vestido no personagem da classe escolhida |
| **Cofre** | 20 (o equipamento não ocupa) | só na aba Itens | fica seguro na conta |
| **Bag** | 8 | aba Itens (guardar no cofre ou vender) | entra com o jogador e recebe o que ele pega no chão |

- O equipamento e a bag **saem da conta quando a hunt começa** e entram no personagem.
- Na hunt, todo item que o jogador pisa vai para a bag (ou direto para o equipamento, se for melhor; o trocado vai para a bag).
  **Com a bag cheia, não pega mais nada do chão**: só um slot de equipamento vazio ainda recebe item. O HUD mostra a fileira da bag (vermelha quando cheia; ver "Bag na hunt").
- Quem foge ou conclui volta com o equipamento vestido, e **a bag é transferida sozinha para o cofre**, melhores itens primeiro.
  **Com o cofre cheio, o que não couber fica na bag** e entra na próxima hunt (ocupando espaço e correndo risco).
- Quem morre perde **1 equipamento do corpo, sorteado**, **a bag inteira** e as poções: tudo cai no chão e outro jogador pode pegar e extrair. O resto do equipamento volta para a conta.
- Cada classe tem os próprios 6 slots. A aba Itens mostra o equipamento da classe escolhida, e só a classe que usa o item pode vesti-lo. O mesmo item fica num corpo por vez: equipar no Druida um item vestido pelo Feiticeiro tira dele. O equipamento das outras classes não ocupa o cofre e fica em casa na hunt; quem volta vivo devolve o vestido à classe com que jogou.
- Na aba Itens: equipar um item do cofre devolve o do slot ao cofre; tirar do equipamento e guardar da bag precisam de espaço no cofre.
- Funções no banco: `buy_item`, `equip_item`, `store_item` e `sell_item` (jogador); `take_loadout`, `take_bag`, `finish_run` e `store_bag` (servidor de jogo).

#### Bag na hunt (menu)

- **No HUD aparece só a bag:** uma fileira com os espaços da bag embaixo do loot. O equipamento vestido aparece **somente no menu** da bag (e no próprio personagem). Código em `apps/client/src/bagbar.ts`.
- Tocar na fileira (ou B no desktop) abre o menu na parte de cima da tela, para o polegar esquerdo continuar andando. A hunt não pausa.
- No menu, tocar num item mostra o que ele faz (e o vestido no mesmo slot, para comparar):
  - item da bag: **Equipar** (troca de lugar com o vestido) ou **Largar** (cai no chão onde o herói está, e qualquer um pode pegar);
  - item vestido: **Guardar na bag**, se couber.
- O que o jogador larga não volta para a bag enquanto ele estiver em cima do item: precisa sair do tile e voltar.
- Mercado: compra Comum 60, Bronze 150, Ferro 350, Aço 800; vende por 10, 25, 60, 130 e Dragão 300.

## Salas e sala de espera

Código em `apps/client/src/lobby.ts` e `main.ts`.

1. **Jogar** (menu) abre a tela de salas: em cima, as **salas abertas** (líder, cenário e vagas); embaixo, **Criar sala**
   com os cartões dos cenários e o botão "Criar sala · <cenário>".
2. Criar ou entrar numa sala leva à **sala de espera**: 4 vagas (`MAX_PARTY_SIZE`), cada uma com retrato, nome e classe
   de quem entrou (o líder primeiro, com 👑); as vagas livres ficam tracejadas, "aguardando jogador".
3. Só o líder vê o botão de começar: **"Começar sozinho"** com 1 jogador, "Começar hunt · N jogadores" com mais.
   Os outros veem "Aguardando o líder iniciar…". Ao começar, a sala sai da lista (ninguém mais entra).
4. **Sair da sala** volta para a tela de salas. Se o líder sai, o próximo da sala vira líder.

## Mapas

O jogador escolhe o mapa (cenário) na tela de criar sala (a escolha fica salva no aparelho). O mapa vale para as salas
que ele **criar**; quem entra numa sala aberta joga o mapa dela, que aparece na lista de salas e na sala de espera.
Catálogo em `packages/shared/src/maps.ts`; gerador em `packages/shared/src/dungeon.ts`.
Cliente e servidor geram o mapa cada um do seu lado pela seed; por isso entram na sala só com a mesma
`RULES_VERSION`. Cliente desatualizado se recarrega sozinho; se o servidor ainda está terminando o deploy, o
cliente pede para tentar de novo em 1 ou 2 minutos.

| Mapa | Dificuldade | Tempo | Tamanho | Monstros (comuns → mini-boss → boss) |
|---|---|---|---|---|
| 🏚️ Cripta | 1 ★☆ | 4 min | 72×72, 4 salas no caminho | Ratazana, Goblin, Esqueleto, Orc → Ogro → Dragão jovem |
| 🌿 Pântano das Ruínas | 2 ★★ | 8 min | 112×112, campo aberto com 7 zonas de monstros | Sapo gigante, Cobra-d'água, Afogado, Naga guerreira → Troll do brejo → Hidra do pântano |

### Cripta

- **Visual** (só no cliente, `apps/client/src/cryptMap.ts` e arte própria em `art/cryptDecor.ts`; não muda a jogabilidade):
  tochas animadas nas paredes com poça de luz quente tremulando no chão, candelabros acesos, estandartes rasgados,
  correntes, nichos com caveira, rachaduras e teias nas paredes; sombra ao pé das paredes e manchas de luz e sujeira
  no chão e nos tampos; ossos, entulho, cacos, poças e teias nos cantos; barris, caixotes e sacos na entrada, urnas,
  pilhas de ossos e caixões nas salas; marcas de queimado, sangue e ossada no covil do dragão; poeira flutuando e
  cantos da tela escurecidos. Como no pântano, só os sprites perto da câmera são desenhados.

### Pântano das Ruínas

- **Campo aberto, sem caminho único:** o mapa nasce todo andável (só a borda é mata fechada) e recebe por cima
  bosques de vários tamanhos, árvores soltas, lagoas e restos de muro. Todo obstáculo que fecharia a passagem
  até uma zona, baú ou boss é descartado, então a equipe pode ir para qualquer região e contornar tudo.
- **Dificuldade em arco:** 7 zonas de monstros vão da entrada até as ruínas do centro, cada uma mais forte;
  5 campinas espalhadas têm alguns monstros extras.
- Lagoas e poças: **a água bloqueia o passo, mas não a visão**. Flechas, magias e o ataque de alcance 2 da Hidra passam por cima.
- Ruínas: salas laterais cercadas por muros caídos com 2 portões (Troll + baú), colunas soltas pelo campo e a arena do boss no centro,
  um quadrado de muros com 4 portões e 4 colunas.
- **Visual** (só no cliente, `apps/client/src/swampMap.ts` e arte própria em `art/swampDecor.ts`; não muda a jogabilidade
  nem o gerador): capim invadindo a lama e a pedra, espuma na margem das lagoas, sombra das árvores e muros no chão,
  manchas de luz no capim, árvores com variação de tom, taboas na margem, samambaias, arbustos e cogumelos no pé das
  árvores, flores, pedrinhas, tocos e troncos no campo, entulho, musgo e ossos nas ruínas, vitórias-régias na água,
  e o ambiente: vaga-lumes, ondinhas nas lagoas, névoa baixa e cantos da tela escurecidos. Só os sprites perto da
  câmera são desenhados (blocos de 8×8 tiles), para o celular aguentar.
- Mais difícil: monstros com mais vida e dano que os da cripta, e mais salas (o ganho de 12% por sala chega a +84% na Hidra).
  Em troca, loot maior e itens de material melhor nas salas fundas.

## Partida (hunt)

- Equipes de 1 a 4 jogadores: single, dupla, trio ou quarteto.
- A equipe nasce junta numa borda aleatória da dungeon, na sala do portal de fuga.
- O limite de tempo depende do mapa (4 min na Cripta, 8 min no Pântano). **Se o tempo acaba, o mapa desaba e todos morrem soterrados.**
- Todo mundo começa no nível 1, sem equipamento, magia ou skill.
- Matar monstros dá XP e itens dropados (ver "Itens").
- A cada nível: mais HP e mana, mais velocidade de movimento e mais dano base. Os slots de magia abrem nos níveis 3 e 6;
  os outros níveis dão uma melhoria à escolha (ver "Melhorias de nível").
- A dungeon é semi-linear: monstros fracos na entrada, ficando mais fortes conforme a equipe se aprofunda.
- Baús no meio da dungeon trazem itens ou upgrades aleatórios poderosos, possivelmente ao matar mini-bosses.
- No centro fica o boss final do tipo de mapa.
- Objetivo: sair com o máximo de loot, que vira gold para os upgrades permanentes.

### Melhorias de nível

Todo nível que não abre slot de magia (2, 4, 5, 7 em diante) mostra **duas cartas** logo acima do
personagem (acompanhando ele) e o jogador toca numa. Cada carta mostra ícone, nome, efeito, um selo ("Nova" ou "2ª vez")
e bolinhas de quantas vezes a melhoria já foi escolhida até o limite. Depois da escolha, o nome sobe sobre o personagem
por 1,17 s (30% a mais que os outros avisos). O servidor sorteia as duas (diferentes, fora das que já chegaram ao limite) e aplica a escolhida; ela vale
até o fim da hunt e soma por cima das áureas do Grimório. Subiu vários níveis de uma vez: as escolhas entram na fila,
uma de cada vez. O jogo não pausa; a escolha de magia e a de melhoria nunca abrem juntas, e a de magia tem
prioridade: uma melhoria ainda pendente de um nível anterior sai da tela quando o slot abre e só volta depois que a
magia for escolhida (ou a janela fechada). O rótulo da escolha diz o nível que deu a melhoria, nunca o 3 ou o 6.

| Melhoria | Cada escolha | Limite |
|---|---|---|
| ❤️ Vigor | +12% de vida máxima | 5 |
| 💧 Reserva arcana | +15% de mana máxima | 4 |
| 🌿 Regeneração | +1% de vida por segundo (base 2%) | 3 |
| 🔷 Clareza | +1,5% de mana por segundo (base 2%) | 3 |
| ⚔️ Força | +10% de dano (básico, magias e criaturas) | 5 |
| 👟 Agilidade | +6% de velocidade de movimento | 3 |
| 🛡️ Escudo | +3 de armadura (soma com o equipamento) | 4 |
| ⚡ Fúria | ataque básico 10% mais rápido | 3 |
| ⏳ Foco | recarga das magias 10% menor | 3 |
| 🩸 Sede de sangue | cura 4% do dano que o herói causa | 3 |

- Reserva arcana, Clareza e Foco só aparecem do nível 4 em diante (antes do 1º slot de magia não servem para nada).
- Balanceamento: cada escolha vale perto de +10% de poder num eixo. Numa hunt de 4 min o jogador faz umas 5 escolhas
  (níveis 2, 4, 5, 7, 8); os limites impedem empilhar um eixo só (ex.: Escudo no máximo = 12 de armadura, 38% de corte).
- Vida e mana que crescem com Vigor e Reserva arcana entram cheias na hora.
- Tabela em `packages/shared/src/perks.ts`; escolha em `apps/client/src/perkchoice.ts` (cartas em `choicecards.ts`).

### Como uma hunt termina

| Fim | Loot | Observação |
|---|---|---|
| **Morte** | Perde o loot, 1 equipamento sorteado e a bag | O item perdido cai no chão para os outros. Pode também regredir os upgrades permanentes, para dar o peso da morte do Tibia raiz. |
| **Fuga** | Leva tudo | Basta voltar à sala inicial e entrar no portal. |
| **Dungeon concluída** | Leva tudo + bônus | Matar o boss abre um portal na sala final. |
| **Soterrado** (o tempo acabou) | Igual à morte | Conta como morte. |

## Combate (protótipo)

- O ataque básico sai enquanto o jogador segura o ⚔️ (um toque dá um golpe), no alvo que estiver no alcance da classe e com linha de visão; sem alvo travado (ou com ele fora do alcance), o servidor escolhe o monstro mais próximo ao alcance.
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida entre quem acertou o monstro, com +20% por participante extra; o loot vai para quem deu o último golpe.
- Cada sala do caminho é 12% mais forte que a anterior (HP, dano, XP e loot). Os monstros comuns batem 20% mais forte e têm 25% mais vida que o valor da tabela; mini-bosses e bosses não. Salas laterais têm um mini-boss (Ogro na cripta, Troll no pântano) que destranca um baú; o boss do mapa fica no centro.
- Vida regenera 2% por segundo e mana 2%; subir de nível cura tudo. Concluir pelo portal do boss dá +50% de loot.
- Tabelas em `packages/shared/src/monsters.ts` e `classes.ts`.
- **Habilidades especiais dos mini-bosses e bosses:** além do ataque básico, eles têm um golpe mais forte, que sai
  na hora, sem aviso, sempre que a recarga deixa e o alvo está ao alcance. O nome do golpe sobe sobre o monstro, ele
  brilha na cor da habilidade e o efeito cobre a área atingida. Monstros comuns só têm o ataque básico.
  Bosses abaixo de 50% da vida se enfurecem e usam o golpe mais vezes.

| Monstro | Habilidade | Efeito |
|---|---|---|
| Ogro (mini-boss) | Pisão Sísmico | 5×5 em volta (2,1×) e deixa lento por 3 s |
| Dragão jovem (boss) | Sopro Infernal | faixa de fogo 3 de largura × 6 (1,9×) + queimadura |
| Troll do brejo (mini-boss) | Fúria Regenerante | acerta tudo em volta (2×) e cura 8% da vida |
| Hidra do pântano (boss) | Chuva Ácida | 5×5 a até 7 tiles (1,7×) + veneno |


## Ataques e magias (protótipo)

- Ataque básico de cada classe: Cavaleiro golpeia com a espada (corpo a corpo); Paladino atira flechas; Druida lança uma luz verde; Feiticeiro lança uma luz negra. Os projéteis voam até o alvo e o dano só entra quando chegam.
- O ataque básico é manual: um toque no ⚔️ dá um golpe e segurar repete. A recarga é igual para todas as classes (1 s, `BASIC_ATTACK_COOLDOWN_MS`).
- Além do básico, 2 slots de magia: o 1º abre no nível 3 e o 2º no nível 6. Ao alcançar o nível, aparece a escolha da magia do slot, nas mesmas cartas acima do personagem da melhoria de nível (roxas, com descrição, efeitos no nível comprado, mana e recarga; sem rolagem: com 3 a 6 magias as cartas viram uma grade de 3 colunas só com o efeito principal e o custo, e com 7 ou mais, 4 colunas com nome e custo); depois de escolhida, ela fica até o fim da hunt. Fechar a escolha (✕) deixa o botão do slot com ✨ para escolher depois.
- Toda classe tem uma magia inicial por slot; as compradas no Grimório viram opções extras na escolha, já com o nível comprado (ver "Grimório").
- Efeitos que as magias combinam: dano (em área, num alvo, **em linha** ou **em cadeia**), **dano contínuo** (veneno: um pulso por
  segundo, que renova em vez de acumular), cura, raízes (não anda), **lentidão** (anda mais devagar), atordoamento (não anda nem ataca),
  guarda (corta parte do dano), armadura extra, **escudo** (absorve dano antes da vida, por alguns segundos), roubo de vida, provocação e invocação.
  - **Linha** (Disparo Perfurante): acerta todos os monstros na reta do herói até o alcance inteiro ou a primeira parede. A reta sempre passa pelo ponto mirado, e o alvo do toque rápido é acertado mesmo se sair da reta durante o voo.
  - **Cadeia** (Raio em Cadeia): depois do alvo, salta para o monstro mais perto ainda não atingido (a até 3 tiles, com linha de visão), perdendo 15% do dano a cada salto.
  - Bônus condicionais: a Execução causa o dobro em quem tem menos de 30% da vida; o Disparo Certeiro ganha +10% de dano por tile até o alvo.
  - No monstro, a lentidão aparece como gelo nos pés e o veneno como bolhas verdes subindo.
- **Magias de alvo único** (Flecha Sagrada, Relâmpago, Espinho Venenoso, Golpe Esmagador, Raio em Cadeia) miram arrastando. Encostar no botão mostra uma linha pontilhada do herói até o alvo e o alcance em volta dele; o tamanho do arrasto a partir do botão vira distância, até o alcance máximo. Soltar lança; voltar o dedo para o botão cancela (fica vermelho).
  - **Toque rápido** (sem arrastar): lança no alvo atual ou no monstro mais próximo ao alcance. Sem nenhum monstro ao alcance, não sai nem gasta mana.
  - A mira gruda (fica dourada) no monstro a até 1 tile do ponto; a magia vai nele e o acompanha durante o voo.
- **Magias de área com alvo** (Chuva de Flechas, Esfera Sombria, Raízes Espinhosas, Fúria da Natureza) miram do mesmo jeito: segurar o botão, arrastar e soltar. A mira mostra o quadrado da área em volta do ponto, sem grudar em monstro; o toque rápido lança no alvo automático. O ponto para na primeira parede do caminho.
- **Magias em linha** (Disparo Perfurante) miram a direção: a mira acende os tiles da reta até o alcance inteiro; o toque rápido atira na direção do alvo automático.
- **Errou a mira:** a magia sai, aparece na tela, gasta mana e recarga, e não acerta ninguém.
- Magias em volta de si (Giro da Lâmina, Grito de Guerra, Tempestade do Vazio, Bênção da Floresta e as compradas do mesmo tipo) saem no toque, sem mira. Paredes bloqueiam o efeito de todas. Cada uma gasta mana e tem recarga.

| Classe | Slot 1 (nível 3) | Slot 2 (nível 6) |
| --- | --- | --- |
| Cavaleiro | 🌀 Giro da Lâmina: corta todos os monstros colados (1,6× dano) | 📯 Grito de Guerra: provoca monstros a até 4 tiles e corta 50% do dano recebido por 6 s |
| Paladino | ✴️ Flecha Sagrada: flecha dourada num alvo (2,6× dano) | 🏹 Chuva de Flechas: área de raio 2 no alvo (1,4× dano) |
| Feiticeiro | 🔮 Esfera Sombria: explode no alvo, raio 1 (1,9× dano) | 🌑 Tempestade do Vazio: raio 3 em volta de si (2,3× dano) |
| Druida | 🌿 Bênção da Floresta: cura 35% da vida de quem está a até 4 tiles | 🌱 Raízes Espinhosas: raio 2 no alvo, fere (1,2×) e prende por 3,5 s |

As compradas no Grimório, por slot (números do nível 1):

| Classe | Slot 1 | Slot 2 |
| --- | --- | --- |
| Cavaleiro | 🔨 Golpe Esmagador (2,8×) · 🛡️ **Escudo da Fé** (escudo de 40% da vida por 8 s) · 🩸 Lâmina Sedenta (2× e rouba 50%) | ⛓️ Pele de Ferro (cura, corta 70% do dano e +5 de armadura) · 🌋 Terremoto (raio 2, atordoa) · 🏰 Muralha de Aço (provoca e escudo de 60%) · 🎺 Brado do Comandante (cura e escudo na equipe) · ⚔️ Execução (4,5× e atordoa; o dobro abaixo de 30% da vida) |
| Paladino | 🎯 Disparo Perfurante (1,9× em linha, alcance 7) · 💫 Flecha Atordoante · 🕊️ Bênção Protetora (escudo na equipe) | ☀️ Luz Curativa (cura 20% e ofusca os monstros por 0,5 s) · 🏆 Disparo Certeiro (3,2× +10% por tile, alcance 8) · ⚖️ Julgamento Divino · 🎆 Saraivada Explosiva |
| Feiticeiro | ⚡ Relâmpago · 🌩️ Raio em Cadeia (1,6× e salta 3 vezes) · 🧊 Lança de Gelo · 🦇 Drenar Vida | ❄️ Nova de Gelo · ☄️ Meteoro · 🌨️ Nevasca (raio 3, 1,4× e 50% mais lento por 4 s) · 🩻 Pacto Sombrio |
| Druida | 🦂 Espinho Venenoso (1,4× e veneno de 0,3× por segundo por 4 s) · 🐺 Lobo Espiritual · 🦋 Mariposa Curandeira · 🐝 Enxame de Vespas | 🌪️ Fúria da Natureza · 🌕 Chamado da Matilha · 🐻 Urso Ancestral · 🌳 Guardião do Bosque · 💚 Coração da Floresta |

- **Escudo da Fé:** enquanto dura, uma bolha de luz azul envolve o cavaleiro com o brasão (cruz branca no azul, borda
  dourada) flutuando à frente; uma faixa azul sob a barra de vida mostra quanto falta. A bolha enfraquece a cada
  golpe absorvido e se estilhaça quando quebra.
- **Invocações do Druida** (`packages/shared/src/summons.ts`): as criaturas aparecem em volta do druida, seguem o
  dono, caçam o alvo dele (ou o monstro mais próximo) e somem quando o tempo acaba ou morrem. Os monstros também as
  atacam. XP e loot do que elas matam vão para o dono. Conjurar de novo substitui as criaturas da mesma magia
  (máximo de 6 por jogador).

| Criatura | Vida (da do druida) | Papel |
|---|---|---|
| Lobo Espiritual | 45% | rápido, morde (0,7× dano) |
| Vespa | 15% | ferroa de longe, até 3 tiles (0,4×) |
| Mariposa Curandeira | 30% | cura 5% da vida de quem está a até 2 tiles, a cada 2 s |
| Urso Ancestral | 130% | tanque: atrai os monstros que acerta (1,1×) |
| Guardião do Bosque | 220% | tanque: atrai e prende com raízes a cada golpe (0,8×) |
| Fogo-Fátuo | 50% | cura 8% da vida e devolve 2% da mana de quem está a até 4 tiles, a cada 2,5 s |
| Esqueleto Erguido (Feiticeiro Necromante) | 60% | corpo a corpo (0,8×) |
| Águia Gigante (Mestre das Feras) | 50% | voa por cima da água; o mergulho (1,2×) atordoa 0,8 s |

- Tabela em `packages/shared/src/spells.ts`; arte de combate em `apps/client/src/art/combat.ts` e efeitos em `apps/client/src/fx.ts`.
- Ao apanhar, quem leva o golpe pisca e sangra; monstros que morrem tombam e deixam uma poça (`apps/client/src/CombatFx.ts`). O ataque dos monstros também tem efeito próprio (mordida, corte, pancada, bola de fogo do dragão).

## Itens

Inspirados em Dungeons & Dragons. Tabela em `packages/shared/src/items.ts` (o banco repete o catálogo em `market_items`).

- **6 slots:** arma, capacete, armadura, calça, botas e escudo.
- **Família × material × raridade.** Cada item é de uma família (Espada, Cajado, Armadura de guerra, Vestes arcanas...),
  num dos 5 materiais (Rústico, Bronze, Ferro, Mithral, Dragão) e numa raridade:

  | Raridade | Cor | Atributos | Nome |
  |---|---|---|---|
  | Comum | branco | os da família | "Espada longa" |
  | Raro | azul | +30% | "Espada longa +1" |
  | Mágico | roxo | +60% e uma propriedade mágica | nome próprio: "Vingadora Sagrada", "Manto das Estrelas"... |

- **Restrição de classe** (a classe que não usa não veste: na hunt vai só para a bag; no menu, não dá para equipar nela):

  | Família | Classes | O que dá |
  |---|---|---|
  | Espada | Cavaleiro | dano do básico |
  | Machado | Cavaleiro | mais dano do básico, ataque 12% mais lento |
  | Arco | Paladino | dano do básico |
  | Besta | Paladino | mais dano do básico, ataque 12% mais lento |
  | Varinha | Feiticeiro e Druida | **dano das magias** alto, pouco no básico, ataque 8% mais rápido |
  | Cajado | Feiticeiro e Druida | dano do básico **e das magias**, equilibrado |
  | Elmo, armadura e perneiras de guerra | Cavaleiro e Paladino | armadura |
  | Chapéu, manto e calças arcanos | Feiticeiro e Druida | menos armadura, + dano nas magias (chapéu) e + mana (manto e calças) |
  | Botas | Todas | armadura e velocidade |
  | Escudo | Todas | armadura |

- **Só varinhas, cajados e alguns itens mágicos aumentam as magias** (e as criaturas invocadas e os campos no chão).
  Espadas, machados, arcos e bestas aumentam só o ataque básico.
- **Propriedades mágicas:** roubo de vida no básico, chamas ou veneno no básico (dano por segundo por 3 s), espinhos
  (devolve parte do golpe corpo a corpo recebido), + alcance (arcos e bestas), ataque mais rápido, + vida, + mana,
  + velocidade, + armadura e + dano nas magias.
- Armadura corta dano recebido: `armadura / (armadura + 25)`; o conjunto comum de Dragão (33) corta 57%.
- **Drop:** comuns têm 15% de chance, o Ogro dropa 1 item, o Dragão 2 e o baú 1 (um nível acima). Salas mais fundas dão material melhor, com 20% de chance de vir um nível acima.
  Raridade: monstro comum 18% raro e 4% mágico; mini-boss e baú 35% e 12%; boss 40% e 25%.
  **Só cai o que alguém da equipe pode usar** (um cavaleiro sozinho não acha cajado).
- O item cai no chão onde o monstro morreu e é de quem passar por cima primeiro: não tem dono, então outros jogadores podem "roubar" o que ninguém pegou.
- Passar por cima de um item melhor que o equipado (material, e a raridade vale meio nível) troca na hora e o antigo vai para a bag; item pior, ou de outra classe, vai para a bag. Com a bag cheia, o item fica no chão (`pickupAction` em `items.ts`). Itens no chão somem após 2 minutos.
- Quem morre larga 1 equipamento sorteado e a bag no chão e guarda o resto do equipamento. Sem equipar nada no menu, todos começam sem equipamento; quem sai vivo guarda o equipado e esvazia a bag no cofre (ver "Cofre, bag e mercado").
- Mercado: compra só comuns até Mithral (60, 150, 350 e 800 gold); vende pelo material (10, 25, 60, 130, 300), ×2 se raro e ×4 se mágico.

### Arte dos itens e equipamento visível

Cada família tem arte própria em dois formatos, pintada com o material do nível, e o que o personagem veste aparece nele para todos da equipe.

- **Ícone 16×16** (chão, HUD, inventário, slots e mercado): um desenho por família (espada, machado, arco, besta, varinha, cajado, elmo, chapéu, armadura, manto, calça, botas, escudo), na cor do material; as vestes arcanas usam tecido (linho, lã, seda rúnica, mithral, seda de dragão), e varinhas e cajados têm uma gema por nível. Raros e mágicos levam uma gema azul ou roxa no canto (`apps/client/src/art/items.ts`).
- **Vestido no herói** (`apps/client/src/art/outfit.ts`), por cima do corpo da classe:
  - Armadura de guerra recobre o tronco com o padrão do material (amarração de couro, couraça, malha, placas com ombreiras, escamas). O manto arcano tinge a túnica inteira (tronco e saia) com o tecido.
  - Calça tinge a calça da classe e botas tingem as botas (a túnica de feiticeiro e druida cobre a calça; as botas aparecem).
  - Capacete substitui o chapéu ou capuz da classe (gorro, elmo com crista, elmo com nasal, elmo fechado com penacho, elmo com chifres; chapéu pontudo de mago nas vestes arcanas).
  - Escudo vai na mão esquerda (nas costas quando o herói está de costas ou, para quem usa arco/cajado, de lado).
  - Arma: o cavaleiro empunha a espada (curta, longa, lâmina do dragão) ou o machado. O paladino com arco e o feiticeiro e o druida com cajado mantêm a arma da classe, feita do material da arma equipada; a besta e a varinha trocam a arma da mão.
- Sem equipamento, o herói aparece só com a roupa e a arma básica da classe. Ao pegar, trocar ou largar um item, o sprite muda na hora. Quem morre fica sem o que largou no chão.
- O menu mostra o personagem vestido de frente, de lado e de costas na aba Itens, e a ficha de cada item mostra "como fica vestido" antes de equipar. Os retratos das classes usam o equipamento da próxima hunt.
- Galeria de conferência: `apps/client/arte.html` (todas as combinações por classe e nível).

## Poções (protótipo)

- 2 tipos: ❤️ vida (devolve 35% da vida máxima) e 💧 mana (devolve 40% da mana máxima). Cada jogador carrega até 5 de cada.
- Só caem na dungeon (não há compra no mercado): comuns têm 25% de chance de dropar uma, o Ogro dropa 1, o Dragão 2 e o baú 1 de cada tipo. 60% das poções sorteadas são de vida.
- A poção cai no chão como os itens e vai para a mochila de quem passar por cima primeiro, se ainda couber. Some após 2 minutos no chão.
- Beber: botão da poção (ou Q/E no desktop). A recarga de 6 s é **compartilhada** entre os dois tipos, para ninguém ficar imortal bebendo sem parar. Com a barra cheia, a poção não é gasta.
- Valem só durante a hunt: quem morre larga as poções no chão junto com o equipamento, e quem sai vivo perde as que sobraram (não vão para o inventário da conta).
- Tabela em `packages/shared/src/potions.ts`; o frasco é desenhado em `apps/client/src/art/items.ts` e os botões em `apps/client/src/potionbar.ts`.

## Decisões em aberto

- Duração exata de cada mapa (`durationSeconds` em `packages/shared/src/maps.ts`).
- Se a morte regride os upgrades permanentes, e quanto.
- Lista de classes (o protótipo usa Cavaleiro, Paladino, Feiticeiro e Druida); preços do Grimório e do mercado, e a força das magias e criaturas novas, ainda precisam de balanceamento.
- Balanceamento do Pântano (dificuldade 2) e próximos mapas e bosses.
- Os jogadores de uma equipe se reanimam? O loot é compartilhado ou individual?
- Arte: os sprites do Tibia são da CipSoft e **não podem ser usados**. Usaremos assets com licença aberta (OpenGameArt, itch.io) ou arte própria, no mesmo estilo.
