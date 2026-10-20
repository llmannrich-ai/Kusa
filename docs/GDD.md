# Kusa — Game Design

RPG de dungeon cooperativo para navegador, com tema de Dungeons & Dragons e visual inspirado no Tibia
(pixel art 32×32, câmera de cima). As partidas são curtas, e entre elas existe um metajogo de progressão.

## Plataforma: mobile primeiro

O jogo roda no navegador, mas **o alvo principal é o celular**. Toda mecânica nasce pensada para o toque;
teclado e mouse no desktop são um extra.

- **Celular na vertical (retrato)**, jogável com uma mão ou com os dois polegares. Deitado, aparece um aviso para voltar à vertical.
- **Dois polegares:** o esquerdo move, o direito ataca e conjura.
- **Movimento:** joystick virtual flutuante, que aparece onde o polegar toca na metade esquerda da parte de baixo da tela (abaixo de 45% da altura), com 8 direções.
- **Ações:** botões grandes no canto inferior direito: o ⚔️ do ataque básico embaixo, mais perto do polegar, e os 2 slots de magia acima dele (depois poções).
- **Alvo:** o ataque básico vai no alvo travado ou, sem ele, no monstro mais próximo ao alcance (o anel vermelho mostra qual). Tocar num monstro (em qualquer parte da tela) trava o alvo nele.
- **Mira das magias:** magia de alvo único mira arrastando a partir do botão; magia de área se conjura com um toque no botão e outro no mapa (ver "Ataques e magias").
- **Tela:** sempre 9 tiles de largura (pelo menos 13 de altura), com o jogador um pouco acima do centro, porque a parte de baixo é dos polegares. HUD no topo (tempo, barras de HP, mana e XP, loot), respeitando o notch (safe area).
- Sem zoom de pinça nem rolagem acidental. O jogo pede tela cheia e tenta travar na vertical ao entrar na hunt.
- **Desktop é só para desenvolvimento:** o jogo aparece numa coluna 9:16 no meio da tela, com WASD, clique, Espaço (atacar), 1 e 2 (magias: alvo automático, ou modo mira das de área e clique no mapa), Tab e Esc.
- Sessões curtas (3 a 5 min) e entrar numa partida em poucos toques.

## Menu inicial (estilo Zooba / Clash)

Depois do login, o menu ocupa a tela inteira com 4 abas embaixo (no alcance do polegar) e o botão **Jogar** logo acima delas.
Código em `apps/client/src/menu.ts`.

- **Classes:** as 4 classes com retrato, papel e atributos (já com o bônus das áureas). Tocar escolhe a classe da próxima hunt.
- **Magias:** a árvore de magias de cada classe (ver abaixo).
- **Itens:** o inventário da conta e o equipamento que vai para a próxima hunt (um item por slot).
- **Mercado:** compra itens até Aço e vende qualquer item do inventário. Itens de Dragão só saem das hunts.
- Configurações e "Sair da conta" ficam no ⚙️ do topo.
- Ainda por fazer: modo/mapa, cosméticos e amigos.

### Árvore de magias

Cada classe tem a mesma forma de árvore, comprada com o gold das hunts (`packages/shared/src/talents.ts`):

| Círculo | Nó | Pré-requisito |
|---|---|---|
| Iniciais | as 2 magias da classe (uma por slot), de graça | — |
| 1 | Áurea de dano (+4%/nível, 3 níveis) · Áurea de vida (+6%/nível, 3 níveis) | — |
| 2 | Magia nova do slot 1 · Áurea de mana (+8%/nível, 3 níveis) | dano 1 · vida 1 |
| 3 | Magia nova do slot 2 · Áurea de velocidade (+4%/nível, 2 níveis) | a magia do slot 1 · mana 1 |

- **Magias de ataque** compradas viram opção na janela de escolha quando o slot libera na hunt (nível 3 e 8), ao lado da inicial.
- **Áureas** valem sempre, desde o nível 1: multiplicam dano, vida máxima, mana máxima ou velocidade.
- O servidor lê a árvore da conta ao entrar na sala; nada disso vem do navegador.

### Inventário e mercado (extração)

- O equipamento escolhido na aba Itens **sai do inventário quando a hunt começa** e entra no personagem.
- Quem foge ou conclui traz para o inventário tudo o que estiver equipado ao sair (inclusive o que achou na dungeon).
- Quem morre perde o que levou: o equipamento cai no chão e outro jogador pode pegar e extrair.
- Mercado: compra Comum 60, Bronze 150, Ferro 350, Aço 800; vende por 20, 60, 140, 320 e Dragão 900.

## Partida (hunt)

- Equipes de 1 a 4 jogadores: single, dupla, trio ou quarteto.
- A equipe nasce junta numa borda aleatória da dungeon, na sala do portal de fuga.
- O limite de tempo fica entre 3 e 5 minutos. **Se o tempo acaba, a dungeon desaba e todos morrem soterrados.**
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

- O ataque básico sai enquanto o jogador segura o ⚔️ (um toque dá um golpe), no alvo que estiver no alcance da classe e com linha de visão; sem alvo travado, o servidor escolhe o monstro mais próximo ao alcance.
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida entre quem acertou o monstro, com +20% por participante extra; o loot vai para quem deu o último golpe.
- Cada sala do caminho é 12% mais forte que a anterior (HP, dano, XP e loot). Salas laterais têm um Ogro (mini-boss) que destranca um baú; o Dragão jovem fica no centro.
- Vida regenera 2% por segundo e mana 2%; subir de nível cura tudo. Concluir pelo portal do boss dá +50% de loot.
- Tabelas em `packages/shared/src/monsters.ts` e `classes.ts`.

## Ataques e magias (protótipo)

- Ataque básico de cada classe: Cavaleiro golpeia com a espada (corpo a corpo); Paladino atira flechas; Druida lança uma luz verde; Feiticeiro lança uma luz negra. Os projéteis voam até o alvo e o dano só entra quando chegam.
- O ataque básico é manual: um toque no ⚔️ dá um golpe e segurar repete. A recarga é igual para todas as classes (1 s, `BASIC_ATTACK_COOLDOWN_MS`).
- Além do básico, 2 slots de magia: o 1º abre no nível 3 e o 2º no nível 8. Ao alcançar o nível, aparece na tela a escolha da magia do slot; depois de escolhida, ela fica até o fim da hunt. Fechar a escolha deixa o botão do slot com ✨ para escolher depois.
- Toda classe tem uma magia inicial por slot; as compradas na árvore de magias do menu viram opções extras na escolha (ver "Árvore de magias").
- **Magias de alvo único** (Flecha Sagrada, Relâmpago, Espinho Venenoso, Golpe Esmagador) miram arrastando. Encostar no botão mostra uma linha pontilhada do herói até o alvo e o alcance em volta dele; o tamanho do arrasto a partir do botão vira distância, até o alcance máximo. Soltar lança; voltar o dedo para o botão cancela (fica vermelho).
  - **Toque rápido** (sem arrastar): lança no alvo atual ou no monstro mais próximo ao alcance. Sem nenhum monstro ao alcance, não sai nem gasta mana.
  - A mira gruda (fica dourada) no monstro a até 1 tile do ponto; a magia vai nele e o acompanha durante o voo.
- **Magias de área com alvo** (Chuva de Flechas, Esfera Sombria, Raízes Espinhosas, Disparo Perfurante, Fúria da Natureza) usam dois toques: um no botão liga o modo mira (o botão acende e o que está fora do alcance escurece) e outro no mapa conjura ali, sem confirmação.
  - Toque fora do alcance não conjura: o alcance pisca em vermelho e o modo mira continua. Tocar de novo no botão cancela; tocar no outro slot troca.
  - No modo mira, nenhum toque novo vira joystick (o dedo que já move continua movendo) e tocar num monstro não trava o alvo: a magia cai no tile tocado, sem acompanhar ninguém. O ponto para na primeira parede do caminho.
- **Errou a mira:** a magia sai, aparece na tela, gasta mana e recarga, e não acerta ninguém.
- Magias em volta de si (Giro da Lâmina, Grito de Guerra, Tempestade do Vazio, Bênção da Floresta e as compradas do mesmo tipo) saem no toque, sem mira. Paredes bloqueiam o efeito de todas. Cada uma gasta mana e tem recarga.

| Classe | Slot 1 (nível 3) | Slot 2 (nível 8) |
| --- | --- | --- |
| Cavaleiro | 🌀 Giro da Lâmina: corta todos os monstros colados (1,6× dano) | 📯 Grito de Guerra: provoca monstros a até 4 tiles e corta 50% do dano recebido por 6 s |
| Paladino | ✴️ Flecha Sagrada: flecha dourada num alvo (2,6× dano) | 🏹 Chuva de Flechas: área de raio 2 no alvo (1,4× dano) |
| Feiticeiro | 🔮 Esfera Sombria: explode no alvo, raio 1 (1,9× dano) | 🌑 Tempestade do Vazio: raio 3 em volta de si (2,3× dano) |
| Druida | 🌿 Bênção da Floresta: cura 35% da vida de quem está a até 4 tiles | 🌱 Raízes Espinhosas: raio 2 no alvo, fere (1,2×) e prende por 3,5 s |

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

- Duração exata da hunt (o código usa 4 min em `MATCH_DURATION_SECONDS`).
- Se a morte regride os upgrades permanentes, e quanto.
- Lista de classes (o protótipo usa Cavaleiro, Paladino, Feiticeiro e Druida); preços da árvore de magias e do mercado ainda precisam de balanceamento.
- Tipos de mapa e bosses.
- Os jogadores de uma equipe se reanimam? O loot é compartilhado ou individual?
- Arte: os sprites do Tibia são da CipSoft e **não podem ser usados**. Usaremos assets com licença aberta (OpenGameArt, itch.io) ou arte própria, no mesmo estilo.
