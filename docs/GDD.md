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
- **Alvo:** o ataque básico vai no alvo travado ou, sem ele, no monstro mais próximo ao alcance (o anel vermelho mostra qual). Tocar num monstro (em qualquer parte da tela) trava o alvo nele.
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
- **Itens:** o equipamento que vai para a próxima hunt (um item por slot), o **cofre** (20 espaços) e a **bag** (8 espaços). O cofre só é acessado aqui.
- **Mercado:** compra itens até Aço (entregues no cofre) e vende qualquer item da conta. Itens de Dragão só saem das hunts.
- Configurações e "Sair da conta" ficam no ⚙️ do topo.
- Ainda por fazer: modo, cosméticos e amigos.

### Grimório (árvore de magias)

Cada classe tem uma árvore de verdade, comprada com o gold das hunts (`packages/shared/src/talents.ts`).
A raiz é a magia inicial do slot 1; dela saem **3 ramos** que descem até 5 nós de profundidade. Cada nó pede
o nó de cima no nível 1, então as magias da ponta só abrem depois das anteriores do mesmo ramo.

- **Magias** (círculo no desenho, com o número do slot): têm **3 níveis**. O 1 libera a magia como opção na
  janela de escolha da hunt; o 2 e o 3 dão +20% de dano, cura, escudo e força das criaturas, e +15% de duração,
  cada um. As 2 magias iniciais já vêm no nível 1, com os níveis 2 e 3 à venda.
- **Áureas** (quadrado no desenho): dano +4%/nível, vida +6%/nível, mana +8%/nível (3 níveis cada) e
  velocidade +4%/nível (2 níveis). Valem sempre, desde o nível 1.
- Preço: o 1º nível de uma magia custa 300, 500, 800 ou 1.200 conforme a profundidade, e cada nível seguinte custa
  ×1,6; as áureas custam 120–300 e ×1,8 por nível.
- No menu, tocar num nó abre os detalhes: o que ele faz no nível atual e no próximo, o pré-requisito e a compra.
- O servidor lê o Grimório da conta ao entrar na sala; nada disso vem do navegador.

| Classe | Ramo 1 | Ramo 2 | Ramo 3 |
|---|---|---|---|
| Cavaleiro (raiz: Giro da Lâmina) | **Lâmina:** Áurea de Fúria → Golpe Esmagador → Lâmina Sedenta → Terremoto → Execução | **Bastião:** Áurea do Bastião → **Escudo da Fé** → Pele de Ferro → Muralha de Aço | **Comando:** Grito de Guerra → Áurea da Disciplina → Áurea da Investida → Brado do Comandante |
| Paladino (raiz: Flecha Sagrada) | **Mira:** Áurea da Mira → Disparo Perfurante → Flecha Atordoante → Disparo Certeiro | **Luz:** Áurea da Fé → Luz Curativa → Bênção Protetora → Julgamento Divino | **Batedor:** Chuva de Flechas → Áurea Sagrada → Áurea do Batedor → Saraivada Explosiva |
| Feiticeiro (raiz: Esfera Sombria) | **Raio:** Áurea do Caos → Relâmpago → Raio em Cadeia → Meteoro | **Gelo:** Áurea Arcana → Nova de Gelo → Lança de Gelo → Nevasca | **Trevas:** Tempestade do Vazio → Áurea da Égide → Drenar Vida → Áurea do Vento → Pacto Sombrio |
| Druida (raiz: Bênção da Floresta) | **Matilha:** Áurea dos Espinhos → Lobo Espiritual → Chamado da Matilha → Urso Ancestral → Áurea do Cervo | **Bosque:** Áurea da Seiva → Mariposa Curandeira → Áurea do Carvalho → Guardião do Bosque → Coração da Floresta | **Espinhos:** Raízes Espinhosas → Espinho Venenoso → Enxame de Vespas → Fúria da Natureza |

### Cofre, bag e mercado (extração)

Cada item da conta está num de três lugares (`VAULT_SIZE` e `BAG_SIZE` em `packages/shared/src/items.ts`):

| Lugar | Espaços | Onde se mexe | Na hunt |
|---|---|---|---|
| **Equipamento** | 1 por slot | aba Itens | entra vestido no personagem |
| **Cofre** | 20 (o equipamento não ocupa) | só na aba Itens | fica seguro na conta |
| **Bag** | 8 | aba Itens (guardar no cofre ou vender) | entra com o jogador e recebe o que ele pega no chão |

- O equipamento e a bag **saem da conta quando a hunt começa** e entram no personagem.
- Na hunt, todo item que o jogador pisa vai para a bag (ou direto para o equipamento, se for melhor; o trocado vai para a bag).
  **Com a bag cheia, não pega mais nada do chão**: só um slot de equipamento vazio ainda recebe item. O HUD mostra a fileira da bag (vermelha quando cheia; ver "Bag na hunt").
- Quem foge ou conclui volta com o equipamento vestido, e **a bag é transferida sozinha para o cofre**, melhores itens primeiro.
  **Com o cofre cheio, o que não couber fica na bag** e entra na próxima hunt (ocupando espaço e correndo risco).
- Quem morre perde **1 equipamento do corpo, sorteado**, **a bag inteira** e as poções: tudo cai no chão e outro jogador pode pegar e extrair. O resto do equipamento volta para a conta.
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

Todo nível que não abre slot de magia (2, 4, 5, 7 em diante) mostra **duas cartas** no alto da tela e o jogador
toca numa. O servidor sorteia as duas (diferentes, fora das que já chegaram ao limite) e aplica a escolhida; ela vale
até o fim da hunt e soma por cima das áureas do Grimório. Subiu vários níveis de uma vez: as escolhas entram na fila,
uma de cada vez. O jogo não pausa; a escolha de magia e a de melhoria nunca abrem juntas, e a de magia tem
prioridade: uma melhoria ainda pendente de um nível anterior sai da tela quando o slot abre e só volta depois que a
magia for escolhida (ou a janela fechada). O título da carta mostra o nível que deu a melhoria, nunca o 3 ou o 6.

| Melhoria | Cada escolha | Limite |
|---|---|---|
| ❤️ Vigor | +12% de vida máxima | 5 |
| 💧 Reserva arcana | +15% de mana máxima | 4 |
| 💗 Regeneração | +1% de vida por segundo (base 2%) | 3 |
| 🔷 Clareza | +1,5% de mana por segundo (base 2%) | 3 |
| ⚔️ Força | +10% de dano (básico, magias e criaturas) | 5 |
| 👟 Agilidade | +6% de velocidade de movimento | 3 |
| 🛡️ Escudo | +3 de armadura (soma com o equipamento) | 4 |
| 🗡️ Fúria | ataque básico 10% mais rápido | 3 |
| ⏳ Foco | recarga das magias 10% menor | 3 |
| 🩸 Sede de sangue | cura 4% do dano que o herói causa | 3 |

- Reserva arcana, Clareza e Foco só aparecem do nível 4 em diante (antes do 1º slot de magia não servem para nada).
- Balanceamento: cada escolha vale perto de +10% de poder num eixo. Numa hunt de 4 min o jogador faz umas 5 escolhas
  (níveis 2, 4, 5, 7, 8); os limites impedem empilhar um eixo só (ex.: Escudo no máximo = 12 de armadura, 38% de corte).
- Vida e mana que crescem com Vigor e Reserva arcana entram cheias na hora.
- Tabela em `packages/shared/src/perks.ts`; janela em `apps/client/src/perkchoice.ts`.

### Como uma hunt termina

| Fim | Loot | Observação |
|---|---|---|
| **Morte** | Perde o loot, 1 equipamento sorteado e a bag | O item perdido cai no chão para os outros. Pode também regredir os upgrades permanentes, para dar o peso da morte do Tibia raiz. |
| **Fuga** | Leva tudo | Basta voltar à sala inicial e entrar no portal. |
| **Dungeon concluída** | Leva tudo + bônus | Matar o boss abre um portal na sala final. |
| **Soterrado** (o tempo acabou) | Igual à morte | Conta como morte. |

## Combate (protótipo)

- O ataque básico sai enquanto o jogador segura o ⚔️ (um toque dá um golpe), no alvo que estiver no alcance da classe e com linha de visão; sem alvo travado, o servidor escolhe o monstro mais próximo ao alcance.
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida entre quem acertou o monstro, com +20% por participante extra; o loot vai para quem deu o último golpe.
- Cada sala do caminho é 12% mais forte que a anterior (HP, dano, XP e loot). Os monstros comuns batem 20% mais forte que o valor da tabela; mini-bosses e bosses não. Salas laterais têm um mini-boss (Ogro na cripta, Troll no pântano) que destranca um baú; o boss do mapa fica no centro.
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
- Além do básico, 2 slots de magia: o 1º abre no nível 3 e o 2º no nível 6. Ao alcançar o nível, aparece na tela a escolha da magia do slot; depois de escolhida, ela fica até o fim da hunt. Fechar a escolha deixa o botão do slot com ✨ para escolher depois.
- Toda classe tem uma magia inicial por slot; as compradas no Grimório viram opções extras na escolha, já com o nível comprado (ver "Grimório").
- Efeitos que as magias combinam: dano (em área, num alvo, **em linha** ou **em cadeia**), **dano contínuo** (veneno: um pulso por
  segundo, que renova em vez de acumular), cura, raízes (não anda), **lentidão** (anda mais devagar), atordoamento (não anda nem ataca),
  guarda (corta parte do dano), armadura extra, **escudo** (absorve dano antes da vida, por alguns segundos), roubo de vida, provocação e invocação.
  - **Linha** (Disparo Perfurante): acerta todos os monstros na reta do herói até o alcance inteiro ou a primeira parede.
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

- Tabela em `packages/shared/src/spells.ts`; arte de combate em `apps/client/src/art/combat.ts` e efeitos em `apps/client/src/fx.ts`.
- Ao apanhar, quem leva o golpe pisca e sangra; monstros que morrem tombam e deixam uma poça (`apps/client/src/CombatFx.ts`). O ataque dos monstros também tem efeito próprio (mordida, corte, pancada, bola de fogo do dragão).

## Itens (protótipo)

- 4 slots: arma, capacete, armadura e escudo, cada um com 5 níveis de material (Comum, Bronze, Ferro, Aço, Dragão). A arma dá % a mais de dano; capacete, armadura e escudo somam armadura, que corta dano recebido (`armadura / (armadura + 20)`: tudo de dragão corta 57%).
- Drop: comuns têm 15% de chance, o Ogro dropa 1 item, o Dragão 2 e o baú 1 (um nível acima). Salas mais fundas dão material melhor, com 20% de chance de vir um nível acima.
- O item cai no chão onde o monstro morreu e é de quem passar por cima primeiro: não tem dono, então outros jogadores podem "roubar" o que ninguém pegou.
- Passar por cima de um item melhor que o equipado troca na hora e o antigo vai para a bag; item pior vai para a bag. Com a bag cheia, o item fica no chão (`pickupAction` em `items.ts`). Itens no chão somem após 2 minutos.
- Quem morre larga 1 equipamento sorteado e a bag no chão e guarda o resto do equipamento. Sem equipar nada no menu, todos começam sem equipamento; quem sai vivo guarda o equipado e esvazia a bag no cofre (ver "Cofre, bag e mercado").
- Tabela em `packages/shared/src/items.ts`.

### Arte dos itens e equipamento visível

Cada um dos 20 itens tem arte própria em dois formatos, e o que o personagem veste aparece nele para todos da equipe.

- **Ícone 16×16** (chão, HUD, inventário, slots e mercado): um desenho por item, não só a cor do material (`apps/client/src/art/items.ts`).
- **Vestido no herói** (`apps/client/src/art/outfit.ts`), por cima do corpo da classe:
  - Armadura recobre o tronco com o padrão do material (amarração de couro, couraça, malha, placas com ombreiras, escamas); calça e saia continuam com a cor da classe.
  - Capacete substitui o chapéu ou capuz da classe (gorro, elmo com crista, elmo com nasal, elmo fechado com penacho, elmo com chifres).
  - Escudo vai na mão esquerda (nas costas quando o herói está de costas ou, para quem usa arco/cajado, de lado).
  - Arma: o cavaleiro empunha a arma do item (porrete, espada, machado, espada longa, lâmina do dragão). Paladino, druida e feiticeiro mantêm o arco ou cajado da classe (é o ataque básico deles), feito do material da arma equipada.
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
