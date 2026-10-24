# Kusa — Game Design

RPG de dungeon cooperativo para navegador, com tema de Dungeons & Dragons e visual inspirado no Tibia
(pixel art 32×32, câmera de cima). As partidas são curtas, e entre elas existe um metajogo de progressão.

## Plataforma: mobile primeiro

O jogo roda no navegador, mas **o alvo principal é o celular**. Toda mecânica nasce pensada para o toque;
teclado e mouse no desktop são um extra.

- **Celular na vertical (retrato)**, jogável com uma mão ou com os dois polegares. Deitado fora da hunt (ou na hunt sem o Jogar deitado), aparece um aviso que explica e oferece ligar o Jogar deitado ali mesmo.
- **Jogar deitado (beta):** opção nas Configurações. Da largada da hunt até o resultado, o jogo ocupa a tela deitada
  (o Android vira sozinho; no iPhone o jogador gira): joystick no polegar esquerdo; ataque e magias em arco no canto de
  baixo à direita, com as poções numa fileira ao lado; tempo e barras compactos no alto à esquerda e minimapa no alto à
  direita, para o meio da tela ficar livre (no iPhone, as barras do Safari deixam só uns 330 px de altura). Os menus continuam na vertical. A telemetria compara as hunts em pé e
  deitado (`stats.landscapeMs`) para decidir se o modo fica.
- **Dois polegares:** o esquerdo move, o direito ataca e conjura.
- **Movimento:** joystick virtual com 8 direções, fixo no canto de baixo à esquerda por padrão (ver abaixo). Desligando o fixo, vira flutuante: aparece onde o polegar toca na metade esquerda da parte de baixo da tela (abaixo de 45% da altura; deitado, 40%).
  Na zona do joystick todo toque vira joystick, até em cima de um monstro; um toque rápido parado (menos de 250 ms) trava o alvo ali.
  Curso de 72 px; o pino que passa da borda arrasta a base junto. As retas são mais largas que as diagonais (60° cada reta, 30° cada diagonal), e perto da divisa entre duas direções fica na que já estava (sem tremer nem zigue-zague).
  **Joystick fixo** (padrão; dá para desligar nas Configurações): fica sempre à vista no canto de baixo à esquerda, apagado enquanto ninguém toca; o toque perto dele já anda na direção do toque. Desligado, o joystick nasce onde o polegar toca.
  **Deslizar na parede:** a diagonal bloqueada (parede, quina ou monstro) vira passo no eixo livre, então o polegar um pouco torto num corredor não para o herói.
  Enquanto o polegar segura uma direção, o servidor anda nela sozinho, no ritmo da velocidade do herói, e o
  cliente desenha os passos emendados, com duração constante (sem "trava e corre" quando a rede oscila).
- **Ações:** botões grandes no canto inferior direito: o ⚔️ do ataque básico embaixo, mais perto do polegar, e os 2 slots de magia acima dele; numa coluna ao lado, as poções de vida e de mana.
- **Alvo:** o ataque básico vai no alvo travado ou, sem ele, no monstro mais próximo ao alcance (o anel vermelho mostra qual). Tocar num monstro (em qualquer parte da tela) trava o alvo nele; tocar nele de novo destrava. Se o alvo travado sair do alcance, o golpe vai no monstro mais próximo ao alcance (o alvo continua travado).
- **Mira das magias:** magia com alvo (única ou de área) mira arrastando a partir do botão (ver "Ataques e magias").
- **Tela:** sempre 9 tiles no lado curto (pelo menos 13 no longo): em pé, 9 de largura, com o jogador um pouco acima do centro, porque a parte de baixo é dos polegares; deitado, o tile tem o mesmo tamanho que teria em pé no mesmo celular (no iPhone, com as barras do Safari, sobram uns 7 tiles de altura; nunca menos de 6,5), com o jogador no centro. Deitado se vê menos na vertical e mais para os lados. HUD no topo (tempo, barras de HP, mana e XP, loot), respeitando o notch (safe area).
- Sem zoom de pinça nem rolagem acidental. O jogo pede tela cheia e tenta travar na vertical ao entrar na hunt.
- **Desktop é só para desenvolvimento:** o jogo aparece numa coluna 9:16 no meio da tela, com WASD, clique, Espaço (atacar), 1 e 2 (magias no alvo automático), Tab e Esc.
- Sessões curtas (3 a 5 min) e entrar numa partida em poucos toques.

## Menu inicial (estilo Zooba / Clash)

Depois do login, o menu ocupa a tela inteira com 4 abas embaixo (no alcance do polegar) e, no centro da barra, o botão
redondo de **Batalhas** (espadas cruzadas), um pouco maior que as abas.
O **Batalhas** abre o **mapa mundi** (ver "Salas e sala de espera" e "Mapa mundi").
Código em `apps/client/src/menu.ts`.

- **Classes:** as 4 classes com retrato, papel e atributos (vida, mana, dano, alcance e armadura já com as áureas, as runas e os itens vestidos por aquela classe, na mesma conta da hunt). Tocar escolhe a classe da próxima hunt.
- **Grimório:** a árvore de magias de cada classe (ver abaixo).
- **Itens:** o equipamento que vai para a próxima hunt (um item por slot, **separado por classe**: trocar de classe troca o que está no corpo), logo abaixo os **3 slots de runa** da classe (ver "Runas"), o **cofre** (20 espaços) e a **bag** (8 espaços). O cofre só é acessado aqui.
- **Mercado:** compra itens comuns até Mithral (entregues no cofre), filtrados por slot e pela classe escolhida, e vende qualquer item da conta. Itens de Dragão, raros e mágicos só saem das hunts.
- Configurações e "Sair da conta" ficam no ⚙️ do topo.
  - **Telemetria** (`apps/client/src/telemetry.ts`): os números de todas as hunts, para qualquer jogador logado, com filtro de mapa e período: visão geral, hunts por dia, como as hunts terminam, sobrevivência por classe, o que mais mata, fontes de dano, magias e melhorias escolhidas, curva de nível e as suas hunts. Só agregados, sem nomes (função `telemetry_dashboard`).
  - **Regras** (`apps/client/src/rules.ts`): como o jogo funciona, em seções que abrem e fecham. Os números (tempos, preços, melhorias, poções) vêm de `packages/shared`, então a página acompanha o balanceamento.
- Ainda por fazer: modo, cosméticos e amigos.

### Grimório (árvore de magias)

Cada classe tem uma árvore de verdade (`packages/shared/src/talents.ts`). Os nós se compram com o gold das hunts;
o nível das magias, não: ele sobe com o uso nas hunts (ver "Nível das magias pelo uso").
A raiz é a magia inicial do slot 1; dela saem **3 ramos** que descem até 5 nós de profundidade. Cada nó pede
o nó de cima no nível 1 (numa magia, o nível 1 ganho com o uso), então as magias da ponta só abrem depois de
comprar **e usar** as anteriores do mesmo ramo.

- **Espinha de peixe** (inspirada no Diablo 2, plano em `docs/GRIMORIO_GALHOS.md`): o tronco de cada ramo desce no
  meio e as **costelas** (`RIBS`) saem para a esquerda e a direita em alturas e tamanhos diferentes, então nenhum
  ramo tem a mesma forma. A costela nasce num nó do tronco; algumas magias pedem **dois pais** (um da costela e um do
  tronco, como a Nevasca do Diablo 2), ligados no desenho por uma diagonal pontilhada (`also_requires_id` no banco).
- **No menu, um ramo por tela.** No alto, um botão por personagem (o retrato vestido na cor da classe); abaixo, uma
  aba por ramo com o símbolo dele e as magias compradas/total, e o nome do ramo aberto como título acima da árvore
  (com ✦ se o ramo termina em especialização). As explicações ficam em Configurações › Regras, não na tela.
  Até 5 colunas: tronco, costelas dos dois lados e, no pé, os dois lados da especialização. O losango do Traço leva
  o nome da especialização.

- **Magias** (círculo no desenho, com o número do slot; as 5 bolinhas embaixo são o nível): comprar libera a magia
  no **nível 0 (aprendiz)**, já como opção na janela de escolha da hunt, com os números da tabela. Cada nível, do 1
  ao **5**, dá +10% de dano, cura, escudo e força das criaturas, e +7,5% de duração. As 2 magias iniciais já vêm
  compradas e no nível 1.
- **Maestria (nível 5):** além dos números, o nível 5 de toda magia muda o que ela faz (tabela `MASTERIES` em
  `packages/shared/src/spells.ts`). No menu, a ficha da magia mostra a Maestria antes de comprar; na hunt, a escolha
  mostra "★ Maestria". Três efeitos existem só nas Maestrias: **repetir** (o efeito volta sozinho logo depois, mais
  fraco), **devolver recarga ao matar** e **roubar mana**.
- **Áureas** (quadrado no desenho): dano +4%/nível, vida +6%/nível, mana +8%/nível (3 níveis cada) e
  velocidade +4%/nível (2 níveis). Valem sempre, desde o nível 1.
- **Sinergias** (inspiradas no Diablo 2): cada nível de uso de uma magia **vizinha** na árvore (ligada por galho,
  pai ou filha, inclusive o segundo pai) dá **+2% de força** a esta (`SYNERGY_PER_LEVEL`). Força = dano, dano
  contínuo, cura, escudo, armadura, marca, campos e criaturas, como o nível da magia (multiplica a força do nível).
  Vizinha que a conta não tem não conta. Assim, usar magias variadas entre as hunts fortalece as que ficam no slot.
- **Magias ativas** (✔ verde no nó): só elas aparecem na escolha quando o slot abre na hunt, **até 3 por slot**
  (`ACTIVE_SPELLS_PER_SLOT`). Na ficha de uma magia aprendida, o botão **Ativar / Desativar na hunt** liga e
  desliga e mostra quantas estão ativas no slot ("2/3 ativas no slot 1"). Regras (`activeSlotSpells` em `talents.ts`):
  - com **3 magias ou menos** no slot, todas ficam ativas sozinhas (a ficha avisa e não mostra o botão);
  - com mais de 3, valem as ativadas; a quarta é recusada ("desative uma antes") e a última não pode sair;
  - com mais de 3 e nenhuma ativada (conta antiga), entram as 3 de maior nível de uso, para a escolha nunca ficar vazia.
  A escolha fica na conta (`profiles.active_spells`, gravada por `set_active_spells`) e vale em qualquer aparelho. O
  servidor lê ao entrar na sala e só oferece (e só aceita) as ativas; a hunt solo usa a mesma regra.
- **Tomos** (livro no desenho, um por ramo: 📕 📗 📘): +5% de força em todas as magias do ramo por nível, 3 níveis,
  300 de gold e ×1,8 por nível. Ficam na linha 2, na ponta oposta às costelas, e pedem o primeiro nó do tronco.
  A raiz (magia inicial do slot 1) não é de nenhum ramo: não ganha Tomo.
- A força extra (sinergia + Tomo) é calculada pelo servidor ao entrar na sala (`spellBonuses`) e vai para o cliente em
  `Player.spellBonus`: as cartas da hunt mostram "Nv 2 · +26%" e os números já somados. Não muda durante a hunt.
  Na ficha da magia, o menu mostra as vizinhas (com o nível de cada) e a força extra de hoje.
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
  - **Mortos-vivos:** Esqueleto, Esqueleto arqueiro e Zumbi (Cripta); Afogado, Carniçal e Fogo-fátuo (Pântano) (tipo `undead` em `monsters.ts`).
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
- Preço: uma magia custa 150, 300, 500, 800 ou 1.200 conforme a profundidade, no tronco e nas costelas (1.200
  e 1.600 nas magias das especializações), uma vez só; as áureas custam 120–300 e ×1,8 por nível.
- No menu, tocar num nó abre os detalhes: o que ele faz no nível atual e no próximo, o pré-requisito e a compra.
  Na magia comprada, a ficha mostra a barra de XP até o próximo nível.

#### Nível das magias pelo uso

Regras em `packages/shared/src/spellxp.ts`, repetidas no banco (`spell_level`, `spell_xp_after_run` e
`record_spell_xp`, migration `20261022120000_magias_por_uso.sql`).

- **XP por lançamento:** cada vez que a magia sai **em combate** (algum monstro vivo à vista a até 6 tiles), ela ganha
  XP igual aos segundos de recarga dela (Esfera Sombria, 4 s → 4 XP; Tempestade do Vazio, 12 s → 12 XP). Assim,
  usar a magia o tempo todo rende o mesmo para uma de recarga curta e uma longa. Lançar em sala vazia não conta.
- **Teto:** no máximo 400 XP por magia por hunt. Na hunt solo, que roda no aparelho, o banco também corta em 2 XP
  por segundo de hunt e aceita só 2 magias (uma por slot).
- **Níveis** (XP acumulado): 1 = 60, 2 = 400, 3 = 1.200, 4 = 2.800, 5 = 5.500. O nível 1 chega em 1 ou 2 hunts boas
  (é o pré-requisito da árvore); o 5 pede uma centena de hunts usando a mesma magia.
- **Morte:** morrer (ou ficar soterrado) tira **5% do XP acumulado** de cada magia escolhida na hunt, depois de somar o
  que ela ganhou. A perda pode descer níveis, mas **nunca abaixo do nível 1** (nem tira XP de quem ainda é aprendiz).
  As magias que ficaram fora dos slots não perdem nada. Hunt solo abandonada (aba fechada) conta como morte, mas sem
  perda de XP: o banco não sabe quais magias estavam nos slots.
- **Quando vale:** o nível novo vale da próxima hunt em diante; durante a hunt os números ficam fixos. No fim da hunt,
  a tela de resultado mostra cada magia escolhida com o XP ganho, a perda da morte e se subiu ou caiu de nível.
  Convidado vê o resumo, mas nada é salvo.
- **Contas antigas:** quem tinha comprado níveis com gold ficou com o nível equivalente (comprada → 1, nível 2 → 2,
  nível 3 com a Maestria → 5).
- O servidor lê o Grimório da conta ao entrar na sala; nada disso vem do navegador.

| Classe | Ramo 1 | Ramo 2 | Ramo 3 |
|---|---|---|---|
| Cavaleiro (raiz: Giro da Lâmina) | **Lâmina:** Áurea de Fúria → Golpe Esmagador → Lâmina Sedenta → Terremoto → Execução → ✦ Berserker **ou** Duelista | **Bastião:** Áurea do Bastião → **Escudo da Fé** → Pele de Ferro → Muralha de Aço → ✦ Guardião **ou** Inabalável | **Comando:** Grito de Guerra → Áurea da Disciplina → Áurea da Investida → Brado do Comandante → ✦ Senhor da Guerra **ou** Desafiante |
| Paladino (raiz: Flecha Sagrada) | **Mira:** Áurea da Mira → Disparo Perfurante → Flecha Atordoante → Disparo Certeiro → ✦ Atirador de Elite **ou** Caçador Ágil | **Luz:** Áurea da Fé → Luz Curativa → Bênção Protetora → Julgamento Divino → ✦ Cruzado **ou** Guardião da Luz | **Batedor:** Chuva de Flechas → Áurea Sagrada → Áurea do Batedor → Saraivada Explosiva → ✦ Artilheiro **ou** Armadilheiro |
| Feiticeiro (raiz: Esfera Sombria) | **Raio:** Áurea do Caos → Relâmpago → Raio em Cadeia → Meteoro → ✦ Tempestuoso **ou** Piromante | **Gelo:** Áurea Arcana → Nova de Gelo → Lança de Gelo → Nevasca → ✦ Criomante **ou** Arcanista | **Trevas:** Tempestade do Vazio → Áurea da Égide → Drenar Vida → Áurea do Vento → Pacto Sombrio → ✦ Necromante **ou** Bruxo |
| Druida (raiz: Bênção da Floresta) | **Matilha:** Áurea dos Espinhos → Lobo Espiritual → Chamado da Matilha → Urso Ancestral → Áurea do Cervo → ✦ Mestre das Feras **ou** Metamorfo | **Bosque:** Áurea da Seiva → Mariposa Curandeira → Áurea do Carvalho → Guardião do Bosque → Coração da Floresta → ✦ Círculo da Vida **ou** Guardião da Natureza | **Espinhos:** Raízes Espinhosas → Espinho Venenoso → Enxame de Vespas → Fúria da Natureza → ✦ Peste **ou** Tempestade |

#### Costelas

Magias das costelas (números do nível 0). Todas combinam efeitos que o servidor já tinha; a Maestria muda o efeito no nível 5.
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
- A escolha sorteada da fase 5f deu lugar às magias ativas: o jogador escolhe no Grimório as até 3 por slot.

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

### Runas

Pedras mágicas que **só saem dos bosses** (o Dragão jovem e a Hidra dão 1 runa cada) e seguem uma regra própria de loot:
**não caem no chão, vão direto para a bag.** **Cada boss dá a runa uma vez por personagem** (conta e classe): quando ele
morre, cada herói da equipe que está jogando e ainda não levou a runa daquele boss recebe a sua na bag, esteja onde
estiver; quem já levou vê "Runa deste boss já levada" (bots não recebem). Com a bag cheia, o item de menor valor de venda
cai no chão aos pés do herói (qualquer um pega) e a runa ocupa o lugar dele. Depois disso a runa **passa de mão em mão**
livremente: largada da bag, qualquer um da equipe pega. Vale também para os baús de runa atrás do Verme da Areia. O banco
anota em `profile_boss_runes` (`record_boss_runes` no servidor de jogo, `finish_solo_run` na hunt solo e na sala no
aparelho do jogador, que aceita uma runa nova por boss anotado na hunt mais até 3 recebidas de colegas,
`SOLO_LIMITS.passedRunes`).
Tabela em `packages/shared/src/runes.ts`; no banco, os ids "rune-…" ficam em `market_items` e `profile_items` como os itens.

- Ficam no **cofre e na bag como os itens** (ocupam espaço igual) e o mercado compra (120; as de magia, 220). O mercado não vende runas.
- Na aba Itens, **3 slots de runa logo abaixo do equipamento**, separados por classe como o equipamento. Tocar numa runa do
  cofre equipa num slot livre da classe escolhida; não dá para equipar duas iguais na mesma classe. Tirar a runa devolve ao cofre (precisa de espaço). Funções no banco: `equip_item` (limite de 3 por classe e sem repetir), `finish_run` e `drop_random_item` (nunca sorteia runa).
- As runas equipadas **entram com o herói e valem a hunt inteira**, também na hunt solo; na dungeon não se trocam (o menu da bag só mostra quais estão equipadas).
- **Morrer não perde as runas equipadas** (o equipamento sorteado é sempre de arma, capacete, armadura ou escudo). Runa na bag
  cai no chão na morte, como os itens. Runa pega no chão vai sempre para a bag (nunca equipa sozinha).
- O bônus soma com as áureas do Grimório e as melhorias de nível.

| Runa | Efeito | Peso no drop |
|---|---|---|
| ⚔️ Fúria | +15% de dano | 3 |
| ❤️ Vida | +18% de vida máxima | 3 |
| 🛡️ Pedra | +4 de armadura | 3 |
| 👟 Vento | +8% de velocidade | 3 |
| 💧 Arcana | +20% de mana máxima e +1% de mana por segundo | 3 |
| 🩸 Sangue | cura 5% do dano causado | 3 |
| ⏳ Tempo | recarga das magias 12% menor | 3 |
| 💗 Troll | +1,5% de vida por segundo | 3 |
| ⚡ Relâmpago | o Relâmpago (Feiticeiro) vira opção no slot 1 | 1 |
| 🛡️ Fé | o Escudo da Fé (Cavaleiro) vira opção no slot 1 | 1 |
| ☄️ Meteoro | o Meteoro (Feiticeiro) vira opção no slot 2 | 1 |
| ☀️ Aurora | a Luz Curativa (Paladino) vira opção no slot 2 | 1 |

- **Runas de magia:** a magia aparece como opção extra na escolha do slot, para qualquer classe, no nível base (ou no nível
  que a magia já tem, se for da própria classe; magia de outra classe não ganha XP de uso). Magia de outra classe custa no máximo **40% da mana máxima** do herói
  (`spellManaCost`), senão o Cavaleiro nunca teria mana para o Meteoro.

## Salas e sala de espera

Código em `apps/client/src/lobby.ts` e `main.ts`.

1. **Batalhas** (botão central do menu) abre o mapa mundi (ver "Mapa mundi"). Tocar num cenário abre a **ficha** dele,
   baixa (menos de metade da tela, sem textos) para o mapa seguir à vista: nome, região, etiquetas curtas
   (dificuldade ★, ⏱ tempo, 👤/👥 jogadores, ☠ boss), **Jogar sozinho** e **Criar sala** lado a lado, a escolha
   "Sala em ☁️ Nuvem / 📱 Meu aparelho" e, só quando houver, as salas abertas daquele cenário.
   O botão **Salas abertas · N**, no alto do mapa, lista as salas de todos os cenários (líder, cenário e vagas).
2. Criar ou entrar numa sala leva à **sala de espera**: 4 vagas (`MAX_PARTY_SIZE`), cada uma com retrato, nome e classe
   de quem entrou (o líder primeiro, com 👑); as vagas livres ficam tracejadas, "aguardando jogador".
3. Só o líder vê o botão de começar: **"Começar sozinho"** com 1 jogador, "Começar hunt · N jogadores" com mais.
   Os outros veem "Aguardando o líder iniciar…". Ao começar, a sala sai da lista (ninguém mais entra).
4. **Sair da sala** volta para o mapa mundi. Se o líder sai, o próximo humano da sala vira líder.

### Bots na equipe

O líder completa a equipe com bots: cada vaga livre mostra os retratos das 4 classes, e tocar num põe um bot daquela
classe ("Bot Paladino", com 🤖 na vaga); o ✕ tira. O bot ocupa a vaga (a sala aceita um humano a menos) e nunca vira líder.
Funciona nas salas da nuvem e nas do aparelho; a hunt solo não tem sala de espera, então não tem bot.

- **Força:** entra como um convidado, sem Grimório comprado nem equipamento, no mesmo nível inicial dos humanos.
- **Comportamento** (`apps/server/src/botAi.ts`): segue o líder (ou o humano vivo mais perto), enfrenta o alvo do líder ou o monstro
  mais perto da equipe, escolhe a 1ª magia oferecida em cada slot e a 1ª melhoria de cada nível, e conjura assim que a magia recarrega:
  cura e escudo em quem está ferido, dano em quem está ao alcance, bônus e campos quando a luta está perto. Longe demais do líder
  (passou pela caverna, ficou preso), reaparece ao lado dele. Não pisa no portal nem na caverna.
- **Sem gold nem itens:** o bot não abre baú, não pega item nem poção do chão e não recebe runa. Ele conta na divisão da XP e do
  gold como qualquer herói da equipe (com 1 humano e 1 bot, cada um leva metade), mas não guarda gold: a parte dele se perde.
  O que o bot mata rende XP e gold para a equipe como qualquer morte.
- **Menos itens com bots:** como o bot não pega item do chão, sem corte quem joga com bots levaria sozinho os itens da equipe
  inteira. Cada item de equipamento (dos monstros, do boss e do baú) só cai com a chance de humanos ÷ equipe na hora do drop
  (1 humano e 3 bots: 25%; 2 humanos e 2 bots: 50%), o mesmo que cada um levaria numa equipe de humanos. Poções e runas não
  mudam. A telemetria conta o corte em `items.botCut`.
- Quando o último humano sai da dungeon (morto, fugindo ou pelo portal do boss), os bots saem junto e a hunt acaba.

### Jogar sozinho

O botão **"Jogar sozinho"** da ficha do cenário começa uma hunt solo na hora, sem sala de espera e sem
servidor de jogo: a mesma simulação do servidor (`apps/server/src/hunt.ts`) roda no aparelho
(`apps/client/src/solo.ts`). Não há espera para o servidor acordar nem atraso de rede.

Como o aparelho pode ser adulterado, o banco não confia no resultado (`start_solo_run` / `finish_solo_run`,
limites em `SOLO_LIMITS` de `packages/shared/src/solo.ts`):
- o banco sorteia a seed e tira equipamento e bag da conta no início, como numa hunt em equipe;
- o loot tem teto por mapa (pouco acima do máximo possível) e esse teto cresce com o tempo de hunt;
- resultado que chega depois da duração do mapa mais 1 minuto vale como soterrado;
- o que entrou com o jogador volta sem custo; itens novos, no máximo 15 por hunt (o que passar disso fica para
  trás, e a tela de resultado avisa). Não há teto por dia;
- hunt solo deixada aberta (aba fechada) conta como morte na próxima.

### Sala no aparelho do jogador

Ao criar a sala, o jogador escolhe **onde a hunt roda**: **☁️ Nuvem** (o servidor do jogo, que pode levar 1 min para
acordar) ou **📱 Meu aparelho**. No aparelho, quem cria vira o **anfitrião**: a mesma `Hunt` roda no celular dele
(`apps/client/src/hosted.ts`) e os amigos se conectam direto a ele, por WebRTC (`apps/client/src/p2p.ts`). A lista
de salas mostra as duas, com o ícone de cada uma; a lista e o pedido de conexão passam pelo Realtime do Supabase,
então funcionam com o servidor do jogo dormindo.
- **Recompensas:** o celular do anfitrião pode ser adulterado, então cada jogador grava o próprio resultado com os
  limites da hunt solo (`start_solo_run`/`finish_solo_run`): ninguém grava pelos outros.
- **Conexão:** só direta (servidores STUN públicos, sem TURN). Em algumas redes móveis ela não fecha; o jogo avisa
  e a sala na nuvem continua sendo o caminho.
- **O anfitrião saiu ou o celular dele apagou:** a cada segundo ele manda aos convidados um retrato da hunt
  (estado e interno da `Hunt`). Se ele some, o próximo na ordem de entrada assume a partir do último retrato e os
  outros se conectam a ele; a dungeon é remontada e aparece o aviso "<nome> agora hospeda a sala". O que aconteceu
  no último segundo se perde. Quem hospedava conta como morte (abandono). Se ninguém conseguir assumir, a hunt
  acaba para quem ficou.

## Mapa mundi

A tela de **Batalhas** é a carta de **Verdemar**, o continente da campanha no mundo de **Kosaradius**, desenhada como
um pergaminho de D&D. Código em `apps/client/src/worldMap.ts` (câmera, trilhas, nomes, pontos, herói) e
`apps/client/src/world/verdemar.ts` (catálogo: cenários, trilhas, nomes); plano completo (história, fases, desbloqueio)
em `docs/MAPA_MUNDI_PLANO.md`.

- **Arte:** biomas pintados (floresta, colinas, deserto, ermos, charco, ruínas, campos, serra nevada), costa recortada
  com linhas de costa, rios com pontes, lagos, vilas, torres, farol, ruínas do império, navios e monstros no mar,
  moldura, rosa dos ventos e cartela. A arte é uma imagem pronta (`apps/client/public/mapa/verdemar.svg`), gerada por
  sorteio com semente por `npm run mapa -w @kusa/client` (`scripts/verdemarArt.ts`); mudou o catálogo, gere de novo.
- **Mobile:** câmera própria, **arrastar em qualquer direção e pinça** para aproximar (do continente inteiro na tela a
  1,8×). Abre perto, no último cenário escolhido, com o herói da classe em pé em cima dele. 📍 volta ao herói e ⤢
  mostra o continente inteiro. Os pontos e o herói têm o mesmo tamanho na tela em qualquer zoom; de longe, os nomes
  pequenos somem e os grandes crescem para seguir legíveis.
- **Campanha:** uma trilha do sul ao norte com **18 cenários em 13 etapas**. Os 4 de hoje são o começo, na ponta sul:
  🐸 Pântano do Kosaradius → 🏚️ Cripta → 🏜️ Mar de Areia → 🌿 Pântano das Ruínas (trilha vermelha). Daí ao norte, sob a
  névoa da campanha, os cenários por vir (medalhões numerados, trilha pontilhada) até a **Cidadela Caída**.
- **Bifurcações:** 3, cada uma com dois caminhos que se reencontram (selo de placa no ponto): Encruzilhada (floresta ou
  deserto), Portões do Império (charco ou ermos) e Sopé da Serra (passo ou garganta). Tocar num cenário por vir só
  avisa de onde ele abre.
- **Pontos de hoje:** cada um mostra o selo 👥 N quando tem salas abertas. Tocar abre a ficha e leva o herói até ele
  pela trilha, passando pelos pontos do meio, em ~1 s; a câmera vai junto. O boneco vira para o lado da caminhada e
  anima os passos. Tocar de novo no ponto, ou na ficha, pula a caminhada; com "reduzir movimento" ligado no aparelho
  (`prefers-reduced-motion`), o herói só troca de ponto.
- **Névoa:** Gelo de Hrimfal (norte) e Ilha de Cinza (leste), fora do continente; tocar só avisa.
- **Ainda não:** os 4 cenários de hoje estão abertos e os outros 14 ainda não existem. O desbloqueio por boss (por
  classe) e a estrela por ponto vêm na fase 3 do plano.

## Mapas

O jogador escolhe o mapa (cenário) tocando no ponto dele no mapa mundi. O último escolhido fica salvo no aparelho
(na primeira vez, o Pântano do Kosaradius). O mapa vale para as salas que ele **criar**; quem entra numa sala aberta joga o mapa dela, que aparece na lista de salas e na sala de espera.
Catálogo em `packages/shared/src/maps.ts`; gerador em `packages/shared/src/dungeon.ts`.
Cliente e servidor geram o mapa cada um do seu lado pela seed; por isso entram na sala só com a mesma versão das
regras (`RULES_VERSION`, um hash do gerador, dos mapas e das mensagens calculado sozinho). Cliente desatualizado se
recarrega sozinho; se o servidor ainda está terminando o deploy, o cliente pede para esperar 1 ou 2 minutos.

| Mapa | Dificuldade | Tempo | Tamanho | Monstros (comuns → mini-bosses → bosses) |
|---|---|---|---|---|
| 🏚️ Cripta | 1 ★☆ | 4 min | 72×72, 4 salas no caminho | Ratazana, Kobold, Estirge, Goblin, Goblin arqueiro, Zumbi, Hobgoblin capitão, Esqueleto, Esqueleto arqueiro, Aranha gigante, Orc guerreiro, Gnoll → Ogro, Bugbear chefe, Cubo Gelatinoso, Mímico → Dragão jovem |
| 🌿 Pântano das Ruínas | 2 ★★ | 8 min | 112×112, campo aberto com 7 zonas de monstros | Sapo gigante, Bullywug, Estirge, Cobra-d'água, Afogado, Homem-lagarto, Carniçal, Crocodilo gigante, Fogo-fátuo, Naga guerreira, Pudim Negro, Monte Errante → Troll do brejo, Bruxa Verde, Naga Espiritual → Hidra do pântano (3 em 4 hunts) ou Dragão negro jovem |
| 🏜️ Mar de Areia | 1 ★☆ | 6 min | 104×104 de superfície, 6 zonas e 4 campinas + caverna pequena | Escorpião da Areia, Abutre Gigante, Esqueleto, Aranha gigante, Esqueleto arqueiro, Gnoll, Múmia → Escorpião Negro Gigante, Sacerdote Mumificado, Elemental de Areia → Verme da Areia (na caverna) |
| 🐸 Pântano do Kosaradius | 1 ★☆ | 10 min, só 1 jogador | 128×128, o maior: floresta alagada com 9 zonas, 14 campinas, 10–15 clareiras de mini-boss e a clareira do boss | Orc batedor, Orc do Brejo, Orc lanceiro, Orc arqueiro, Orc xamã, Orc berserker, Orc capitão, Ogro jovem → Ogro do Brejo, Ogro Xamã, Chefe de Guerra Orc → Grumak, o Rei-Ogro |

Os monstros de cada mapa (encontros, rodízio de mini-bosses e bosses, Mímicos) estão em "Bestiário".

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

### Mar de Areia

- **Monstros:** 6 zonas em arco da entrada até perto do centro, cada uma mais forte, e 4 campinas com monstros
  extras (como no pântano). Começa com bandos de Escorpiões da Areia e Abutres Gigantes; no meio, esqueletos,
  arqueiros, Aranhas gigantes e os primeiros Gnolls; no fim, Gnolls e Múmias. O objetivo é achar a caverna.
  - **Escorpião da Areia** (enxame, 2 a 3): metade das ferroadas envenena.
  - **Abutre Gigante** (voa): bica e sobe antes do troco (Fuga Ágil) e, em dupla, bica mais fundo (Táticas de Bando).
  - **Múmia** (bruto lento, morto-vivo): Olhar Pavoroso (atordoa 1 s, até 4 tiles), toque que apodrece (dano contínuo);
    vulnerável a fogo.
  - Reaproveitados da Cripta: Gnoll, Esqueleto, Esqueleto arqueiro e Aranha gigante.
- **Ruínas soterradas** (salas laterais): perto de algumas zonas, um quadrado de muro de arenito caído com 2
  portões, piso de lajes meio coberto de areia e colunas quebradas. Um mini-boss sorteado guarda o baú da sala
  (destranca quando ele morre), como no pântano:
  - **Escorpião Negro Gigante** (o mais comum; desenhado maior que o escorpião comum): Pinças (prende 1,5 s) e
    Ferrão Letal (golpe forte que envenena; preso, o herói não foge dele).
  - **Sacerdote Mumificado** (toucado azul e ouro, cajado com ankh): Praga de Escaravelhos (chama 2 Escorpiões da
    Areia) e Maldição da Tumba (área que deixa lento e apodrece). Morto-vivo, vulnerável a fogo.
  - **Elemental de Areia** (redemoinho que voa): Redemoinho (joga longe quem está colado) e Rajada de Areia (linha
    que cega 1,5 s). Resiste a dano físico, vulnerável a gelo; imune a veneno e sangramento.
  - No simulador de duelo (herói nível 5 sozinho), os três ficam entre o Ogro e o Bugbear da Cripta.
- **Caverna:** a boca fica num monte de arenito num lugar sorteado pela seed, longe da entrada (pelo menos 40
  tiles) e fora das zonas, aberta para o sul. Pisar nela leva ao **subterrâneo**, pequeno, com o celular na vertical:
  câmara de chegada (com a corda de volta), túnel, o **covil do Verme da Areia** (caverna larga com alguns pilares de
  rocha) e, depois de uma passagem estreita, o **salão dos baús**. Pisar na saída (a corda) leva de volta para a
  frente da boca. As criaturas invocadas vão junto. No minimapa a boca aparece quando é vista, e a caverna tem o
  próprio mapa (aberto, mostra só a área onde o jogador está). Por dentro, o subterrâneo fica na mesma grade da
  superfície, à direita dela e separado por rocha: não há passagem a pé, só pela caverna.
- **Baús de runa:** 4 baús no fundo do salão, sempre com as mesmas runas (`MapDef.rewardRunes`): Fúria, Vida, Tempo e
  Meteoro, cada uma com a pedra flutuando em cima. Ficam trancados até o Verme morrer. Colado num baú aparece a
  carta da runa; um toque leva a runa para a bag. **Cada jogador escolhe uma** (os baús não esvaziam: na equipe,
  cada um leva a sua, igual ou diferente). Com a bag cheia, não leva. O Verme não dropa runa (a recompensa são os
  baús); dropa loot, itens e poções como os outros bosses.
- **Portal do boss:** abre no meio do salão dos baús (não no covil), depois da escolha.
- **Verme da Areia** (boss): mergulha na areia e irrompe debaixo de quem estiver até 7 tiles (Emboscada da Areia),
  engole quem fica colado (Engolir: controle de 1,8 s com dano por segundo) e, abaixo de metade da vida, faz o chão
  tremer em volta (Tremor, deixa lento). Vulnerável a gelo, resiste a fogo.
- **Balanceamento:** o caminho rende um pouco mais de XP que a Cripta (cerca de 36 monstros e 2.700 XP, contra 21 e
  1.700), então a equipe chega na caverna perto do nível 6 a 8. O covil é a profundidade 6 (+72%): o Verme fica com a
  vida do Dragão jovem no covil dele (~1.340) e, no simulador de duelo (herói nível 6 sozinho, só ataque básico),
  derruba o herói entre o Ogro e o Dragão (6,5 a 9,7 s). Os comuns ficam no nível dos da Cripta: Escorpião como a
  Ratazana, Abutre como o Goblin, Múmia como o Orc.
- **Campo aberto, como o pântano:** dunas altas na borda e, por cima, cristas de duna compridas no sentido do
  vento, oásis (lagoas com coqueiros na margem), bosques de coqueiros e coqueiros soltos. Obstáculo que fecharia a
  passagem até uma zona ou ao centro é descartado. **Coqueiro** é um tile de mata sem mata nos 4 lados; mata
  encostada em mata é **duna** (o cliente desenha cada um por essa regra). Os dois bloqueiam passo e visão; a água
  do oásis bloqueia só o passo.
- **Visual** (só no cliente, `apps/client/src/desertMap.ts` e `caveMap.ts`, com toda a arte própria em
  `art/desertDecor.ts`, `art/caveDecor.ts` e `art/sandWorm.ts`, sem pack): sol de cima à esquerda em tudo. Areia com ondulações de vento (fortes, suaves ou lisa, em manchas grandes),
  ladrilhos que fecham nas bordas; dunas com encosta iluminada, encosta na sombra, frente com crista e areia
  escorrendo, e sombra na areia baixa; oásis com água rasa e funda, espuma, margem arredondada, areia molhada,
  papiro, lótus e brilhos do sol na água; coqueiros em 4 formas (tronco curvo com anéis, copa de folhas penadas com
  cocos, folha seca em alguns), com variação de tom e tamanho, sombra no chão, copa que balança e fica transparente
  quando o jogador passa por baixo; cocos e folhas secas caídas, capim seco, arbustos, arenito, pedrinhas,
  conchas, crânio de boi, rastro de cobra e pegadas; grãos de areia e poeira levados pelo vento. Na caverna: chão
  de areia batida, rocha com paredão em camadas de sedimento, sulcos e pele trocada do verme no covil, ossos,
  estalagmites, cristais âmbar que brilham, o facho de luz e a corda da saída, e o salão em lajes de arenito com
  glifos; sem vento, fundo e cantos da tela bem escuros, e a câmera corta (com um clarão) ao passar pela caverna.
  Como nos outros mapas, só os sprites perto da câmera são desenhados.

### Pântano do Kosaradius

- **Para jogar sozinho e mais fácil:** o mapa aceita 1 jogador só (`MapDef.maxParty`; bots contam), então não há
  "Criar sala" nele, só "Jogar sozinho". É o maior mapa (128×128) e o mais longo (10 min): mais monstros que os
  outros, mais níveis e um boss no fim.
- **O clã do brejo:** orcs e ogros em **9 zonas** do caminho em arco (cada uma mais forte), **14 campinas** com 3
  monstros extras cada (e, em 40% delas, um mini-boss solto, sem baú), **clareiras de mini-boss com baú** (até 2 por
  zona, 10 a 15 por mapa) e **Grumak, o Rei-Ogro**, na **clareira dos ciprestes**. Os monstros são mais fracos que
  os da Cripta na base (o ganho de 12% por zona dobra os do fim): o mapa inteiro tem cerca de 100 monstros, 19
  mini-bosses e 14.700 de XP (a Cripta, 23 monstros e 2.800), então quem limpa boa parte chega no Rei bem acima do
  nível 12. Monstro longe da tela não é desenhado nem animado no cliente.
- **Loot por monstro menor:** com tantos monstros, o mapa paga 35% do valor de loot dos monstros e baús e 60% dos
  drops de item e poção dos monstros e das poções dos baús (`MapDef.lootScale` e `dropScale`; o boss fica de fora e
  larga tudo, e o baú sempre dá o item). O loot máximo de uma
  hunt fica em ~1.400 com o corte geral (entre o Mar de Areia e o Pântano das Ruínas). Teto de loot da hunt solo: 1.900.
- **Arte e animação próprias** (`art/rig.ts`, `art/marshMonsters.ts`, `art/ogreKing.ts`): cada monstro é montado de
  peças com volume (membros em cápsula, tronco, barriga, cabeça) postas por ângulos de articulação, então todos
  têm quadros de **parado** (respirando), **andando** (passo no ritmo do monstro; os ogros com passo pesado),
  **golpe** (preparo, golpe, fim, volta) e **especial** (rugido ou cajado no alto), tocados pelo cliente
  (`MonsterArt.anim`). Orcs em 32 px, ogros em 40 e 48 px, o Rei em quadros de 112 px (corpo de 2,5 tiles).
- **Floresta alagada:** mata fechada na borda; por cima, lagoas grandes e poças, ilhas de mata fechada, troncos
  caídos e muitas árvores soltas, algumas de pé dentro da água. **Passarelas de madeira** cruzam algumas lagoas em
  linha reta (atalho; às vezes levam a uma ilha). A clareira do boss é um círculo aberto cercado por um anel de
  ciprestes, com 4 entradas largas. As clareiras dos baús são cercadas de troncos caídos, com 2 passagens. Obstáculo
  que fecharia a passagem até uma zona, campina, clareira ou ao centro é descartado. **Árvore solta** é um tile de
  mata sem mata nos 4 lados; mata encostada em mata é **mata fechada**. As duas bloqueiam passo e visão; a água,
  só o passo; os troncos caídos (pedra), passo e visão.
- **Visual** (só no cliente, `apps/client/src/marshMap.ts`, com toda a arte própria em `art/marshDecor.ts`, sem
  pack): luz baça de cima à esquerda, tons fechados. Capim do brejo com folhinhas e touceiras, lama em grão fino com
  torrões, água escura cor de chá (rasa e funda) com lodo e lentilha-d'água na margem; capim invadindo a lama com
  quinas arredondadas. A **mata fechada** é uma copa contínua de tufos (textura de 3×3 tiles, sem emenda) cuja beira
  recua com borda recortada; do lado sul ela sobe e mostra a sombra, os troncos e a barba-de-velho pendurada. As
  **árvores soltas** são de 4 espécies: **cipreste-calvo** (pé alargado, copa em camadas achatadas, barba-de-velho;
  na água, com os "joelhos" saindo em volta), **salgueiro-chorão** (cortina de ramos até perto do chão),
  **mangue** (raízes em arco) e **árvore morta** (galhos pelados com barba-de-velho); tronco e copa separados, com
  variação de tom e tamanho, sombra no chão, copa que balança e fica transparente com o jogador embaixo; no meio da
  mata fechada, copas mais altas dão volume. Passarelas de tábuas com pregos e lodo; troncos caídos com musgo, anéis
  na ponta e orelhas-de-pau; tocos e pedras com musgo. Enfeites: taboas, juncos e íris amarela na margem, tiririca
  em manchas pelo campo, samambaias, cogumelos, plantas-jarro, raízes, folhas caídas, ossadas, poças e pegadas de
  garça na lama, vitórias-régias, lírios e galhos boiando; na clareira do boss, um círculo de cogumelos brancos.
  Ambiente: vaga-lumes, névoa baixa, folhas caindo, libélulas, marolas e bolhas de gás subindo da água. Como nos
  outros mapas, só os sprites perto da câmera são desenhados.

## Partida (hunt)

- Equipes de 1 a 4 jogadores: single, dupla, trio ou quarteto (o Pântano do Kosaradius é só para 1).
- A equipe nasce junta numa borda aleatória da dungeon, na sala do portal de fuga.
- O limite de tempo depende do mapa (4 min na Cripta, 8 min no Pântano das Ruínas, 6 min no Mar de Areia, 10 min no Pântano do Kosaradius). **Se o tempo acaba, o mapa desaba e todos morrem soterrados.**
- Todo mundo começa no nível 1, sem equipamento, magia ou skill.
- Matar monstros dá XP e itens dropados (ver "Itens").
- A cada nível: mais HP e mana, mais velocidade de movimento e mais dano base. Os slots de magia abrem nos níveis 3 e 6;
  os outros níveis dão uma melhoria à escolha (ver "Melhorias de nível").
- A dungeon é semi-linear: monstros fracos na entrada, ficando mais fortes conforme a equipe se aprofunda.
- Baús no meio da dungeon trazem itens ou upgrades aleatórios poderosos, possivelmente ao matar mini-bosses.
- No centro fica o boss final do tipo de mapa.
- **Bússola no minimapa:** uma agulha gira em volta do jogador e aponta para a sala do boss; no Mar de Areia, da
  superfície, aponta para a boca da caverna que leva até ele (mesmo antes de a boca ser vista). Depois que o boss
  morre, aponta para o portal do boss. Some quando o jogador já está na sala do boss (ou em cima do portal).
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
| **Morte** | Perde o loot, 1 equipamento sorteado e a bag | O item perdido cai no chão para os outros. As runas equipadas ficam. Pode também regredir os upgrades permanentes, para dar o peso da morte do Tibia raiz. |
| **Fuga** | Leva tudo | Basta voltar à sala inicial e ficar 1,5 s em cima do portal (um anel enche em volta do herói; sair antes zera a contagem). |
| **Dungeon concluída** | Leva tudo + bônus | Matar o boss abre um portal na sala final; como na fuga, leva quem fica 1,5 s em cima dele. |
| **Soterrado** (o tempo acabou) | Igual à morte | Conta como morte. |

## Combate (protótipo)

- O ataque básico sai enquanto o jogador segura o ⚔️ (um toque dá um golpe), no alvo que estiver no alcance da classe e com linha de visão; sem alvo travado (ou com ele fora do alcance), o servidor escolhe o monstro mais próximo ao alcance.
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida em partes iguais por toda a equipe que está jogando na dungeon (bots incluídos; quem morreu ou saiu fica de fora), tenha batido no monstro ou não: 100 XP com 4 heróis dão 25 a cada um. O gold (loot) do monstro, do baú e do Mímico se divide do mesmo jeito.
- **A dificuldade não depende do tamanho da equipe:** os monstros são os mesmos com 1 ou 4 heróis. Jogar em equipe é mais fácil de propósito, para estimular a equipe; nenhuma regra escala vida, dano ou quantidade de monstros pelo número de jogadores.
- Cada sala do caminho é 12% mais forte que a anterior (HP, dano, XP e loot). Os monstros comuns batem 20% mais forte e têm 25% mais vida que o valor da tabela; mini-bosses e bosses não. Salas laterais têm um mini-boss sorteado (ou, na Cripta, um Mímico no lugar do baú) que destranca um baú; o boss do mapa fica no centro.
- Vida regenera 2% por segundo e mana 2%; subir de nível cura tudo. Concluir pelo portal do boss dá +50% de loot.
- **Corte geral do loot** (`LOOT_SCALE`, 80%, em `packages/shared/src/maps.ts`): todos os mapas pagam 80% do gold
  dos monstros (boss incluído) e dos baús, e a chance de item dos comuns e mini-bosses cai para 80% da base (comum:
  15% → 12%). Vale por cima do corte próprio do mapa (`lootScale`, `dropScale`). Poções, os itens do boss e o item
  do baú não mudam.
- Tabelas em `packages/shared/src/monsters.ts` e `classes.ts`.
- **Princípio: difícil e injusto como a vida.** Nenhum golpe de monstro tem aviso antes (área marcada no chão, brilho de carga, contagem); o jogador se defende pela posição e pela escolha de quem matar primeiro, não reagindo a um sinal.
- Monstros, habilidades e regras dos inimigos: ver "Bestiário".

## Bestiário

Inspirado no Monster Manual do D&D 5e, quase só com criaturas do SRD 5.1 (licença aberta). Tabelas em
`packages/shared/src/monsters.ts` (monstros, tipos, afixos), encontros em `maps.ts`, IA em `apps/server/src/monsterAi.ts`
e arte em `apps/client/src/art/bestiary.ts`. O plano completo e o que falta (mapas novos) estão em `docs/BESTIARIO_PLANO.md`.
Os jogadores veem tudo em Configurações > Regras > Bestiário.

### Regras gerais

- **Papéis:** bruto, escaramuçador (bate e recua, investe), artilheiro (fica a 3–5 tiles e atira; recua se colarem),
  controlador (prende, puxa, paralisa), líder (aura nos aliados), enxame (vem em grupo), emboscador (camuflado até
  atacar) e sentinela (lento, muita vida).
- **Monstros chamados não rendem nada:** quem nasce de uma habilidade de outro monstro (Chamado do Clã, Rugido do
  Rei, Praga de Escaravelhos) não dá XP, loot, item nem poção ao morrer. Sem isso, bastava ficar ao lado de quem chama
  para subir de nível sem fim.
- **Habilidades sem aviso:** cada monstro tem até 3 habilidades, em ordem de prioridade. Saem na hora, sempre que a
  recarga deixa e o alvo está ao alcance, e a recarga varia ±30% (a "Recarga 5–6" do D&D): não dá para decorar o
  ritmo. O nome sobe sobre o monstro, ele brilha na cor da habilidade e o efeito cobre a área. A primeira habilidade
  só sai depois de meia recarga contada de quando o monstro nota alguém. Projéteis de monstro acertam no disparo.
- **Fases dos bosses por vida:** a habilidade de fase sai na hora em que a vida cruza o limite (com 1 ou 4 heróis,
  toda fase aparece). Abaixo de 50% da vida o boss se enfurece e as recargas caem para 60%. Boss espera 1 s
  entre uma habilidade e outra, para não soltar sopro, cegueira e mergulho em sequência.
- **Voo e Mergulho:** o monstro some invulnerável e cai colado no alvo; a queda é o golpe. Depois dela, ele se
  recompõe por 1,5 s (sem ataque básico nem outra habilidade): é a janela para reagir.
- **Tipos de criatura e elementos:** todo dano de herói tem elemento (básico do Cavaleiro e do Paladino é físico,
  do Feiticeiro é energia, do Druida é natureza; cada magia tem o seu, em `elements.ts`). Monstros podem ser imunes (0),
  resistentes (0,5–0,8) ou vulneráveis (1,5): o aviso sobe em cinza ("Imune", "Resiste") ou amarelo ("Vulnerável!").
  Mortos-vivos e constructos não pegam veneno nem sangramento; limos não sangram; plantas são vulneráveis a fogo.
- **Efeitos nos heróis:** preso (não anda), atordoado (não anda, não ataca, não conjura nem bebe poção), engolido
  (como atordoado, e toma dano por segundo; os aliados batendo no monstro o fazem cuspir), cego (não mira além de 2
  tiles) e corroído (+8% de dano recebido por acúmulo, até 3). **Controle dura no máximo 2 s** e depois o herói fica
  **4 s imune** ao mesmo efeito.
- **Encontros sorteados:** cada sala do caminho recebe monstros sorteados da tabela da profundidade (pelo peso) até
  gastar um orçamento de ameaça (a XP da tabela), como o orçamento de XP do D&D. Enxames (Kobold, Estirge) vêm em
  grupo; no máximo 8 monstros, 2 artilheiros e 1 líder por sala. Tudo pela seed.
- **Campeões:** 5% dos comuns nascem Campeões (nome e brilho dourados): vida × 2, XP e loot × 2,5 e um afixo: Veloz
  (+40% de velocidade), Vampírico (rouba 30% do golpe), Ígneo (o golpe queima), Escudado (metade do dano físico) ou
  Comandante (aura de líder).
- **A dificuldade não muda com o tamanho da equipe** (ver "Partida").

### Cripta (★1)

| Monstro | Papel | Assinatura (D&D) |
|---|---|---|
| Ratazana | enxame | Táticas de Bando: +30% de dano com outro monstro colado no mesmo alvo |
| Kobold | enxame (2–3) | Táticas de Bando +40% |
| Estirge | emboscador (2–3, voa) | Drenar Sangue: o golpe sangra e cura a estirge |
| Goblin | escaramuçador | Fuga Ágil: depois de acertar, recua 1 tile (recarga 4 s) |
| Goblin arqueiro | artilheiro | alcance 4, recua se o herói chegar a menos de 3 tiles |
| Zumbi | bruto lento | Fortitude Morta-viva: o primeiro golpe fatal o deixa com 1 de vida (menos luz e fogo) |
| Hobgoblin capitão | líder | Comando: monstros a até 3 tiles com +15% de dano e 15% mais rápidos |
| Esqueleto | bruto (morto-vivo) | não envenena nem sangra |
| Esqueleto arqueiro | artilheiro (morto-vivo) | alcance 5, recua |
| Aranha gigante | controlador | Teia: prende 1,5 s de longe; a picada envenena |
| Orc guerreiro | bruto | Agressivo: com o alvo a 3–5 tiles, salta até ele |
| Gnoll | escaramuçador | Rompante: abaixo de 50% da vida, ataca 40% mais rápido |
| **Ogro** (mini-boss) | bruto | Pisão Sísmico (raio 2, 2,1× e lentidão) · Arremesso de Pedra (de 3 a 6 tiles, área 1, empurra) |
| **Bugbear chefe** (mini-boss) | bruto | alcance 2 · Ataque Surpresa (primeiro golpe em cada alvo 2,5×) · Golpe Brutal (2×, empurra) |
| **Cubo Gelatinoso** (mini-boss) | sentinela | translúcido e camuflado · Engolfar (engole 2 s com ácido) |
| **Mímico** (mini-boss) | emboscador | 1 em 3 salas laterais: no lugar do baú, disfarçado até alguém encostar · Adesivo (prende 2 s em volta) · Mordida Ácida (2× e corrói). Morto, dá o loot do baú |
| **Dragão jovem** (boss) | — | imune a fogo · Multiataque (3 mordidas de 0,3×) · Sopro Infernal (leque de 6 tiles, 1,9× e queimadura) · abaixo de 50%: Voo (some 2 s, invulnerável, e cai sobre um herói, área 2) |

### Pântano das Ruínas (★2)

| Monstro | Papel | Assinatura (D&D) |
|---|---|---|
| Sapo gigante | controlador | Língua: puxa um herói de 2–3 tiles para colado |
| Bullywug | escaramuçador | camuflado no brejo · Salto Parado (salta 2–4 tiles e acerta em volta) |
| Cobra-d'água | escaramuçador | a mordida envenena |
| Afogado | bruto (morto-vivo) | Fortitude Morta-viva |
| Homem-lagarto | bruto | Couraça Natural (−20% de dano físico) · Multiataque (2 × 0,6) |
| Carniçal | controlador (morto-vivo) | Garras Paralisantes: 25% de chance de atordoar 1 s |
| Crocodilo gigante | emboscador | camuflado · Mordida que Prende (prende 1,5 s) · Rabada (em volta, empurra 2) |
| Fogo-fátuo | controlador (morto-vivo, voa) | alcance 2, choque · some por 2 s a cada ~6 s |
| Naga guerreira | sentinela | Constrição: prende 1,5 s |
| Pudim Negro | bruto (limo) | resiste a gelo · Divisão (golpe físico ou de energia de 10%+ da vida o divide, até 4) · o golpe corrói |
| Monte Errante | sentinela (planta) | Absorver Raio (energia cura) · vulnerável a fogo · Engolfar |
| **Troll do brejo** (mini-boss) | bruto | Regeneração de 2%/s, parada por 5 s com fogo ou natureza · Dilacerar (1,8× e sangramento) |
| **Bruxa Verde** (mini-boss) | controlador | Ilusão (some 3 s e deixa 2 cópias iguais a ela, que somem com um golpe ou quando ela morre) · Nuvem Venenosa |
| **Naga Espiritual** (mini-boss) | artilheiro | Relâmpago (linha de 6, 1,8×) · Rejuvenescer (uma vez, abaixo de 25%: cura 30%) |
| **Hidra do pântano** (boss) | — | Cabeças: começa com 3, cada uma morde um alvo diferente (as que sobram mordem o alvo com metade); perde uma a cada 20% de vida e, sem fogo em 6 s, nascem duas (até 5) e cura 5% · Chuva Ácida · abaixo de 50%: Mergulho |
| **Dragão negro jovem** (boss, 1 em 4 hunts) | — | resiste a natureza · Multiataque (3 mordidas de 0,3×) · Sopro Ácido (linha de 6) · Escuridão (cega 2 s em área) · abaixo de 50%: Mergulho |

### Pântano do Kosaradius (★1)

| Monstro | Papel | Assinatura |
|---|---|---|
| Orc batedor | escaramuçador (bando de 2–3) | faca e tanga · Fuga Ágil (fura e pula para trás) |
| Orc do Brejo | bruto | machadinha e escudo de tábua |
| Orc lanceiro | sentinela | lança de mangue: acerta a 2 tiles |
| Orc arqueiro | artilheiro | arco de osso, alcance 5 · recua se alguém chega a 3 |
| Orc xamã | controlador | máscara de caveira de sapo, cajado · Lama Agarrada (prende 1,2 s, de longe) |
| Orc berserker | bruto | dois machados, pintura vermelha · Agressivo (salta) · Rompante (ferido, bate 40% mais rápido) |
| Orc capitão | líder | elmo e estandarte · Comando (orcs perto batem 15% mais forte e mais rápido) |
| Ogro jovem | bruto | porrete · Pancada (1,8× e empurra) |
| **Ogro do Brejo** (mini-boss) | bruto | porrete de cravos · Pisão Sísmico (em volta, deixa lento) · Arremesso de Pedra |
| **Ogro Xamã** (mini-boss) | controlador | Chamado do Clã (chama 2 Orcs do Brejo) · Maldição do Brejo (área: lento e envenena) |
| **Chefe de Guerra Orc** (mini-boss) | líder | armadura de placas e cutelo · Investida · Golpe Giratório · Comando |
| **Grumak, o Rei-Ogro** (boss) | bruto | coroa de ferro torta e um tronco de porrete (alcance 2) · Esmagar (2,2× e atordoa 1 s) · Pisão do Pântano · Investida do Rei · Tronco Arremessado · com metade da vida, Rugido do Rei (chama 2 Orcs do Brejo, uma vez) · abaixo de 30%, frenesi |

No simulador de duelo (herói sozinho, só ataque básico), os orcs comuns ficam entre o Goblin e o Esqueleto da
Cripta, o Ogro jovem perto do Orc guerreiro, os mini-bosses abaixo do Ogro da Cripta, e o Rei-Ogro (herói nível
12) dura de 10 a 15 s contra o herói, contra 4 a 7 s do Dragão jovem (herói nível 6).

## Ataques e magias (protótipo)

- Ataque básico de cada classe: Cavaleiro golpeia com a espada (corpo a corpo); Paladino atira flechas; Druida lança uma luz verde; Feiticeiro lança uma luz negra. Os projéteis voam até o alvo e o dano só entra quando chegam.
- O ataque básico é manual: um toque no ⚔️ dá um golpe e segurar repete. A recarga é igual para todas as classes (1 s, `BASIC_ATTACK_COOLDOWN_MS`).
- Além do básico, 2 slots de magia: o 1º abre no nível 3 e o 2º no nível 6. Ao alcançar o nível, aparece a escolha da magia do slot, nas mesmas cartas acima do personagem da melhoria de nível (roxas, com descrição, efeitos no nível da magia, mana e recarga; sem rolagem: com 3 a 6 magias as cartas viram uma grade de 3 colunas só com o efeito principal e o custo, e com 7 ou mais, 4 colunas com nome e custo); depois de escolhida, ela fica até o fim da hunt. Fechar a escolha (✕) deixa o botão do slot com ✨ para escolher depois.
- Toda classe tem uma magia inicial por slot; as compradas no Grimório viram opções extras na escolha, já no nível que a magia tem na conta (ver "Grimório").
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

As compradas no Grimório, por slot (números do nível 0):

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

- **Arte e animação** (só no cliente, `apps/client/src/art/summonCreatures.ts`): todas as criaturas têm arte própria e
  animada (parada, andando, golpe e especial), no volume de luz dos monstros do Pântano. O lobo trota (patas em
  diagonal) e o urso anda no passo lateral e pesado; as patas pisam e ficam plantadas no chão enquanto o corpo passa
  (cinemática inversa), e o andar acompanha a velocidade da criatura. O Guardião e o Esqueleto usam o esqueleto de
  `rig.ts` (braços balançando contra as pernas); a águia, a vespa e a mariposa batem as asas (a vespa com asas
  transparentes e as pernas penduradas); o Fogo-Fátuo é uma chama que tremula, com bracinhos de fumaça. O lobo
  solta rastro de luz e uiva no especial; o urso empina e desce as garras no golpe, com runas no ombro que acendem.
  As formas animais do Druida usam a mesma arte (andam e respiram com o herói).

- Tabela em `packages/shared/src/spells.ts`; arte de combate em `apps/client/src/art/combat.ts` e efeitos em `apps/client/src/fx.ts`.
- Ao apanhar, quem leva o golpe pisca e sangra; monstros que morrem tombam e deixam uma poça na cor do sangue deles (vermelho, verde, roxo, preto; mortos-vivos viram poeira) (`apps/client/src/CombatFx.ts`). O ataque dos monstros também tem efeito próprio (mordida, corte, pancada, flecha dos arqueiros, bola de fogo do dragão), e cada habilidade tem o seu desenho (pedra em arco, teia, língua, salto, sopro, chuva ácida, relâmpago, engolir, voo). Os monstros respiram parados (cada um num ritmo), escondidos ficam quase transparentes e sem barra, o Mímico parece um baú e os Campeões têm nome e brilho dourados. Efeitos no herói: teia nos pés (preso), estrelas (atordoado), bolha verde (engolido), nuvem escura (cego) e gotas ácidas (corroído).

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
  **O drop não olha a classe de ninguém:** cai qualquer item, mesmo jogando sozinho (um cavaleiro acha cajado; vai para a bag e se vende).
- O item cai no chão onde o monstro morreu (o do baú, aos pés de quem abriu, que já pega) e é de quem passar por cima primeiro: nada no chão tem dono, então qualquer jogador pega a qualquer momento e os outros podem "roubar" o que ninguém pegou.
- Passar por cima de um item melhor que o equipado (material, e a raridade vale meio nível) troca na hora e o antigo vai para a bag; item pior, ou de outra classe, vai para a bag. Com a bag cheia, o item fica no chão (`pickupAction` em `items.ts`). Itens no chão somem após 2 minutos.
- Quem morre larga 1 equipamento sorteado e a bag no chão e guarda o resto do equipamento. Sem equipar nada no menu, todos começam sem equipamento; quem sai vivo guarda o equipado e esvazia a bag no cofre (ver "Cofre, bag e mercado").
- Mercado: compra só comuns até Mithral (60, 150, 350 e 800 gold); vende pelo material (10, 25, 60, 130, 300), ×2 se raro e ×4 se mágico.

### Arte dos itens e equipamento visível

Cada família tem arte própria em dois formatos, e o que o personagem veste aparece nele para todos da equipe.
Plano e direção de arte (inspirada em D&D): `docs/ARTE_HEROIS_PLANO.md`. Padrão visual inspirado no Tibia (heróis, monstros e mapas): `docs/ARTE_TIBIA.md`; conceitos de cada item no padrão novo: `docs/ARTE_ITENS.md`.

- **Ícone 16×16** (chão, HUD, inventário, slots e mercado): um desenho por família (espada, machado, arco, besta, varinha, cajado, elmo, chapéu, armadura, manto, calça, botas, escudo), na cor do material; as vestes arcanas usam tecido (linho, lã, seda rúnica, mithral, seda de dragão), e varinhas e cajados têm uma gema por nível. Raros e mágicos levam uma gema azul ou roxa no canto (`apps/client/src/art/items.ts`).
- **Vestido no herói** (`apps/client/src/art/hero/`): **cada item tem o seu desenho, igual em qualquer classe**.
  - Heróis em 48×48 (a mesma densidade de pixel dos monstros), ampliados 2× com Scale2x. Cada pixel guarda material,
    tom e peça; a luz sai da forma de cada peça (cilindro, esfera, chanfro) e o contorno é seletivo (`raster.ts`).
    Os materiais são rampas de 6 tons com desvio de matiz (`materials.ts`).
  - Um esqueleto único (`rig.ts`) dá a forma de cabeça, tronco, braços e pernas em cada direção e quadro; o corpo das
    classes (`look.ts`) e os itens pintam sobre essas formas, por isso um item encaixa em qualquer classe e passo.
  - A classe aparece no que não é item: rosto, cabelo, barba, a roupa por baixo e o que a identifica por cima de tudo
    (aljava e faixa do paladino, broche do druida).
  - Ordem das camadas (`compose.ts`): costas → braço de lá → pernas (calça, botas) → tronco (roupa, armadura, saia) →
    braços → por cima (cinto, ombreiras) → capa (de costas) → cabeça (rosto, cabelo, capacete) → arma e escudo.
  - Armaduras (`gear.ts`): gibão acolchoado, couraça com saiote de tiras, cota de malha, placas de mithral com ombreiras
    e manoplas, escamas de dragão com espinhos; mantos de linho, de viagem (capinha e capuz), rúnico (runas acesas), de
    mithral (gola alta) e de seda de dragão (mantelete de escamas e capa). Calças e botas mudam de forma por nível
    (joelheiras, coxotes, grevas até o joelho, sabatons, garras).
  - Capacetes e chapéus (`headgear.ts`): gorro, elmo com crista, elmo nórdico com nasal e malha, elmo fechado com
    penacho, elmo do dragão com chifres; capuz de lã, chapéu pontudo, capuz rúnico, chapéu do mago, coroa de chifres.
    Cada um diz o que cobre (cabelo, nuca, rosto e barba).
  - Armas (`weapons.ts`): espadas, machados, bestas e varinhas desenhadas pixel a pixel e inclinadas para fora;
    arcos por curva (recurvos, longo, de osso com espinhos) e cajados por haste com ponta própria. Sem arma, cada
    classe segura a sua (espada de treino, arco simples, cajado com orbe, galho). De lado, arco, cajado e arma sem
    escudo vão à frente; com escudo, a arma vai no braço de lá e o escudo no de cá.
  - Escudos (`shields.ts`): broquel, redondo, "ferro de engomar", pipa, do dragão; de lado em perspectiva, de costas
    o verso de madeira, nas costas de quem usa arco ou cajado.
  - **Itens mágicos** (`magic.ts` e o fim de `weapons.ts`): o desenho do nível com materiais próprios e, em vários, um
    enfeite que só ele tem (a Lâmina Flamejante em brasa, a Espada Vorpal de obsidiana, a Couraça do Leão com a cara do
    leão, o Elmo do Cavaleiro Grifo com asas, as Botas Aladas, o Escudo Animado com rosto, o Manto das Estrelas).
  - **Raridade no jogo** (`apps/client/src/gearFx.ts`): item raro faz piscar uma estrelinha azul no herói; item mágico
    põe uma aura roxa nos pés e partículas das suas propriedades (brasas, veneno, roubo de vida, faíscas arcanas,
    poeira de velocidade, luz dourada), no máximo duas.
- Sem equipamento, o herói aparece só com a roupa e a arma básica da classe. Ao pegar, trocar ou largar um item, o sprite muda na hora. Quem morre fica sem o que largou no chão.
- O menu mostra o personagem vestido de frente, de lado e de costas na aba Itens, e a ficha de cada item mostra "como fica vestido" antes de equipar. Os retratos das classes usam o equipamento da próxima hunt.
- Galeria de conferência: `apps/client/arte.html`, com o **provador** (qualquer classe com qualquer item em cada slot,
  andando, ampliado e no tamanho do celular), as combinações por classe e nível e os itens mágicos.
- Teste `apps/server/scripts/arte.ts` (no `npm test`): todo item aparece, com desenho único, sem sair do quadro.

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
- Os jogadores de uma equipe se reanimam?
- Arte: os sprites do Tibia são da CipSoft e **não podem ser usados**. Usaremos assets com licença aberta (OpenGameArt, itch.io) ou arte própria, no mesmo estilo.
