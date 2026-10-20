# Kusa — Game Design

RPG de dungeon cooperativo para navegador, com tema de Dungeons & Dragons e visual inspirado no Tibia
(pixel art 32×32, câmera de cima). As partidas são curtas, e entre elas existe um metajogo de progressão.

## Plataforma: mobile primeiro

O jogo roda no navegador, mas **o alvo principal é o celular**. Toda mecânica nasce pensada para o toque;
teclado e mouse no desktop são um extra.

- **Celular na vertical (retrato)**, jogável com uma mão ou com os dois polegares. Deitado, aparece um aviso para voltar à vertical.
- **Movimento:** joystick virtual flutuante, que aparece onde o polegar toca na parte de baixo da tela (abaixo de 45% da altura), com 8 direções.
- **Ações:** botões grandes no canto inferior direito (os 2 slots de magia e o 🎯 "próximo alvo"; depois poções), sem precisar de mira precisa.
- **Mira:** sem alvo travado, o servidor ataca sozinho o monstro mais próximo dentro do alcance. Tocar num monstro (em qualquer parte da tela) trava o alvo nele; o 🎯 troca para o próximo monstro por perto.
- **Tela:** sempre 9 tiles de largura (pelo menos 13 de altura), com o jogador um pouco acima do centro, porque a parte de baixo é dos polegares. HUD no topo (tempo, barras de HP, mana e XP, loot), respeitando o notch (safe area).
- Sem zoom de pinça nem rolagem acidental. O jogo pede tela cheia e tenta travar na vertical ao entrar na hunt.
- **Desktop é só para desenvolvimento:** o jogo aparece numa coluna 9:16 no meio da tela, com WASD, clique, Tab e Esc.
- Sessões curtas (3 a 5 min) e entrar numa partida em poucos toques.

## Menu inicial (estilo Zooba / Clash)

Depois do login, o menu ocupa a tela inteira com 4 abas embaixo (no alcance do polegar) e o botão **Jogar** logo acima delas,
com a escolha do mapa logo acima do Jogar (ver "Mapas").
Código em `apps/client/src/menu.ts`.

- **Classes:** as 4 classes com retrato, papel e atributos (já com o bônus das áureas). Tocar escolhe a classe da próxima hunt.
- **Grimório:** a árvore de magias de cada classe (ver abaixo).
- **Itens:** o inventário da conta e o equipamento que vai para a próxima hunt (um item por slot).
- **Mercado:** compra itens até Aço e vende qualquer item do inventário. Itens de Dragão só saem das hunts.
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

### Inventário e mercado (extração)

- O equipamento escolhido na aba Itens **sai do inventário quando a hunt começa** e entra no personagem.
- Quem foge ou conclui traz para o inventário tudo o que estiver equipado ao sair (inclusive o que achou na dungeon).
- Quem morre perde o que levou: o equipamento cai no chão e outro jogador pode pegar e extrair.
- Mercado: compra Comum 60, Bronze 150, Ferro 350, Aço 800; vende por 20, 60, 140, 320 e Dragão 900.

## Mapas

O jogador escolhe o mapa no menu (botão acima do **Jogar**; a escolha fica salva no aparelho). O mapa vale para as salas
que ele **criar**; quem entra numa sala aberta joga o mapa dela, que aparece na lista de salas e no lobby.
Catálogo em `packages/shared/src/maps.ts`; gerador em `packages/shared/src/dungeon.ts`.

| Mapa | Dificuldade | Tempo | Tamanho | Monstros (comuns → mini-boss → boss) |
|---|---|---|---|---|
| 🏚️ Cripta | 1 ★☆ | 4 min | 72×72, 4 salas no caminho | Ratazana, Goblin, Esqueleto, Orc → Ogro → Dragão jovem |
| 🌿 Pântano das Ruínas | 2 ★★ | 8 min | 112×112, campo aberto com 7 zonas de monstros | Sapo gigante, Cobra-d'água, Afogado, Naga guerreira → Troll do brejo → Hidra do pântano |

### Pântano das Ruínas

- **Campo aberto, sem caminho único:** o mapa nasce todo andável (só a borda é mata fechada) e recebe por cima
  bosques de vários tamanhos, árvores soltas, lagoas e restos de muro. Todo obstáculo que fecharia a passagem
  até uma zona, baú ou boss é descartado, então a equipe pode ir para qualquer região e contornar tudo.
- **Dificuldade em arco:** 7 zonas de monstros vão da entrada até as ruínas do centro, cada uma mais forte;
  5 campinas espalhadas têm alguns monstros extras.
- Lagoas e poças: **a água bloqueia o passo, mas não a visão**. Flechas, magias e o ataque de alcance 2 da Hidra passam por cima.
- Ruínas: salas laterais cercadas por muros caídos com 2 portões (Troll + baú), colunas soltas pelo campo e a arena do boss no centro,
  um quadrado de muros com 4 portões e 4 colunas.
- Mais difícil: monstros com mais vida e dano que os da cripta, e mais salas (o ganho de 12% por sala chega a +84% na Hidra).
  Em troca, loot maior e itens de material melhor nas salas fundas.

## Partida (hunt)

- Equipes de 1 a 4 jogadores: single, dupla, trio ou quarteto.
- A equipe nasce junta numa borda aleatória da dungeon, na sala do portal de fuga.
- O limite de tempo depende do mapa (4 min na Cripta, 8 min no Pântano). **Se o tempo acaba, o mapa desaba e todos morrem soterrados.**
- Todo mundo começa no nível 1, sem equipamento, magia ou skill.
- Matar monstros dá XP e itens dropados (ver "Itens").
- A cada nível: mais HP e mana, mais velocidade de movimento e mais dano base. Os slots de magia abrem nos níveis 3 e 8.
- A dungeon é semi-linear: monstros fracos na entrada, ficando mais fortes conforme a equipe se aprofunda.
- Baús no meio da dungeon trazem itens ou upgrades aleatórios poderosos, possivelmente ao matar mini-bosses.
- No centro fica o boss final do tipo de mapa.
- Objetivo: sair com o máximo de loot, que vira gold para os upgrades permanentes.

### Como uma hunt termina

| Fim | Loot | Observação |
|---|---|---|
| **Morte** | Perde tudo | Pode também regredir os upgrades permanentes, para dar o peso da morte do Tibia raiz. |
| **Fuga** | Leva tudo | Basta voltar à sala inicial e entrar no portal. |
| **Dungeon concluída** | Leva tudo + bônus | Matar o boss abre um portal na sala final. |
| **Soterrado** (o tempo acabou) | Perde tudo | Conta como morte. |

## Combate (protótipo)

- O servidor faz auto-attack no alvo enquanto ele estiver no alcance da classe e com linha de visão; sem alvo travado, escolhe sozinho o monstro mais próximo ao alcance.
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida entre quem acertou o monstro, com +20% por participante extra; o loot vai para quem deu o último golpe.
- Cada sala do caminho é 12% mais forte que a anterior (HP, dano, XP e loot). Salas laterais têm um mini-boss (Ogro na cripta, Troll no pântano) que destranca um baú; o boss do mapa fica no centro.
- Vida regenera 2% por segundo e mana 2%; subir de nível cura tudo. Concluir pelo portal do boss dá +50% de loot.
- Tabelas em `packages/shared/src/monsters.ts` e `classes.ts`.

## Ataques e magias (protótipo)

- Ataque básico (auto-attack) de cada classe: Cavaleiro golpeia com a espada (corpo a corpo); Paladino atira flechas; Druida lança uma luz verde; Feiticeiro lança uma luz negra. Os projéteis voam até o alvo e o dano só entra quando chegam.
- Além do básico, 2 slots de magia: o 1º abre no nível 3 e o 2º no nível 8. Ao alcançar o nível, aparece na tela a escolha da magia do slot; depois de escolhida, ela fica até o fim da hunt. Fechar a escolha deixa o botão do slot com ✨ para escolher depois.
- Toda classe tem uma magia inicial por slot; as compradas no Grimório viram opções extras na escolha, já com o nível comprado (ver "Grimório").
- Efeitos que as magias combinam: dano (em área ou num alvo), cura, raízes (não anda), atordoamento (não anda nem ataca),
  guarda (corta parte do dano), **escudo** (absorve dano antes da vida, por alguns segundos), roubo de vida, provocação e invocação.
- Magias de alvo usam o alvo atual (ou o monstro mais próximo ao alcance); paredes bloqueiam o efeito. Cada uma gasta mana e tem recarga.

| Classe | Slot 1 (nível 3) | Slot 2 (nível 8) |
| --- | --- | --- |
| Cavaleiro | 🌀 Giro da Lâmina: corta todos os monstros colados (1,6× dano) | 📯 Grito de Guerra: provoca monstros a até 4 tiles e corta 50% do dano recebido por 6 s |
| Paladino | ✴️ Flecha Sagrada: flecha dourada num alvo (2,6× dano) | 🏹 Chuva de Flechas: área de raio 2 no alvo (1,4× dano) |
| Feiticeiro | 🔮 Esfera Sombria: explode no alvo, raio 1 (1,9× dano) | 🌑 Tempestade do Vazio: raio 3 em volta de si (2,3× dano) |
| Druida | 🌿 Bênção da Floresta: cura 35% da vida de quem está a até 4 tiles | 🌱 Raízes Espinhosas: raio 2 no alvo, fere (1,2×) e prende por 3,5 s |

As compradas no Grimório, por slot (números do nível 1):

| Classe | Slot 1 | Slot 2 |
| --- | --- | --- |
| Cavaleiro | 🔨 Golpe Esmagador (2,8×) · 🛡️ **Escudo da Fé** (escudo de 40% da vida por 8 s) · 🩸 Lâmina Sedenta (2× e rouba 50%) | ⛓️ Pele de Ferro · 🌋 Terremoto (raio 2, atordoa) · 🏰 Muralha de Aço (provoca e escudo de 60%) · 🎺 Brado do Comandante (cura e escudo na equipe) · ⚔️ Execução (4,5× e atordoa) |
| Paladino | 🎯 Disparo Perfurante · 💫 Flecha Atordoante · 🕊️ Bênção Protetora (escudo na equipe) | ☀️ Luz Curativa · 🏆 Disparo Certeiro (4×, alcance 8) · ⚖️ Julgamento Divino · 🎆 Saraivada Explosiva |
| Feiticeiro | ⚡ Relâmpago · 🌩️ Raio em Cadeia · 🧊 Lança de Gelo · 🦇 Drenar Vida | ❄️ Nova de Gelo · ☄️ Meteoro · 🌨️ Nevasca · 🩻 Pacto Sombrio |
| Druida | 🦂 Espinho Venenoso · 🐺 Lobo Espiritual · 🦋 Mariposa Curandeira · 🐝 Enxame de Vespas | 🌪️ Fúria da Natureza · 🌕 Chamado da Matilha · 🐻 Urso Ancestral · 🌳 Guardião do Bosque · 💚 Coração da Floresta |

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
| Fogo-Fátuo | 50% | cura 8% da vida de quem está a até 4 tiles, a cada 2,5 s |

- Tabela em `packages/shared/src/spells.ts`; arte de combate em `apps/client/src/art/combat.ts` e efeitos em `apps/client/src/fx.ts`.
- Ao apanhar, quem leva o golpe pisca e sangra; monstros que morrem tombam e deixam uma poça (`apps/client/src/CombatFx.ts`). O ataque dos monstros também tem efeito próprio (mordida, corte, pancada, bola de fogo do dragão).

## Itens (protótipo)

- 4 slots: arma, capacete, armadura e escudo, cada um com 5 níveis de material (Comum, Bronze, Ferro, Aço, Dragão). A arma dá % a mais de dano; capacete, armadura e escudo somam armadura, que corta dano recebido (`armadura / (armadura + 20)`: tudo de dragão corta 57%).
- Drop: comuns têm 15% de chance, o Ogro dropa 1 item, o Dragão 2 e o baú 1 (um nível acima). Salas mais fundas dão material melhor, com 20% de chance de vir um nível acima.
- O item cai no chão onde o monstro morreu e é de quem passar por cima primeiro: não tem dono, então outros jogadores podem "roubar" o que ninguém pegou.
- Passar por cima de um item melhor que o equipado troca na hora; o antigo fica no chão. Item pior fica onde está. Itens no chão somem após 2 minutos.
- Quem morre larga o equipamento no chão. Sem levar nada do inventário, todos começam sem equipamento; quem sai vivo guarda o equipado (ver "Inventário e mercado").
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

## Decisões em aberto

- Duração exata de cada mapa (`durationSeconds` em `packages/shared/src/maps.ts`).
- Se a morte regride os upgrades permanentes, e quanto.
- Lista de classes (o protótipo usa Cavaleiro, Paladino, Feiticeiro e Druida); preços do Grimório e do mercado, e a força das magias e criaturas novas, ainda precisam de balanceamento.
- Balanceamento do Pântano (dificuldade 2) e próximos mapas e bosses.
- Os jogadores de uma equipe se reanimam? O loot é compartilhado ou individual?
- Arte: os sprites do Tibia são da CipSoft e **não podem ser usados**. Usaremos assets com licença aberta (OpenGameArt, itch.io) ou arte própria, no mesmo estilo.
