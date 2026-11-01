# Kusa — Game Design

RPG de dungeon cooperativo para navegador, com tema de Dungeons & Dragons e visual inspirado no Tibia
(pixel art 32×32, câmera de cima). As partidas são curtas, e entre elas existe um metajogo de progressão.

## Plataforma: mobile primeiro

O jogo roda no navegador, mas **o alvo principal é o celular**. Toda mecânica nasce pensada para o toque;
teclado e mouse no desktop são um extra.

- **Celular na vertical (retrato)**, jogável com uma mão ou com os dois polegares. Deitado fora da hunt (ou na hunt sem o Jogar deitado), aparece um aviso que explica e oferece ligar o Jogar deitado ali mesmo.
- **Jogar deitado (beta):** opção nas Configurações. Da largada da hunt até o resultado, o jogo ocupa a tela deitada
  (o Android vira sozinho; no iPhone o jogador gira): joystick no polegar esquerdo; ataque e magias em arco embaixo à
  direita, afastados da beirada (ver "Ações"), com as poções na beirada ao lado; tempo e barras compactos no alto à esquerda e minimapa no alto à
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
- **Ações:** o ⚔️ e as magias **miram arrastando**, então ficam **longe da beirada direita** (o centro do ⚔️ a ~120 px
  da borda), para o dedo ter espaço de arrastar para a direita e para baixo; a mira é relativa ao toque e chega ao
  alcance máximo com 72 px de arrasto. O que só se toca (poções de vida e de mana) fica na beirada, ao lado do ⚔️.
  - **Em pé:** o ⚔️ (o maior botão) embaixo à direita e as magias num leque **em cima** dele, da esquerda para a
    direita (slot 1, 2 e 3), sem encostar no joystick fixo (a tela é estreita: ao lado do ⚔️ não cabe).
  - **Deitado:** o mesmo ⚔️ afastado da beirada, com as magias em arco à esquerda e em cima dele (slot 1 à esquerda,
    slot 2 na diagonal, slot 3 em cima).
  - **Slot 3** (magias supremas): abre no **nível 12**, no lugar que estava reservado em cima do ⚔️ (`#actions > [data-slot="2"]`; tecla 3 no desktop). Todas as magias do slot 3 se compram no Grimório; sem nenhuma, o botão mostra 📖 "Grimório" e não abre a escolha (é o caso do Xamã Orc por enquanto).
  - Cada botão se posiciona em volta do centro do ⚔️ (`--dx`, `--dy`); conferido em 360×780, 390×844, 412×915 e 915×412.
- **Alvo:** o ataque básico vai no alvo travado ou, sem ele, no monstro mais próximo ao alcance (o anel vermelho mostra qual). Tocar num monstro (em qualquer parte da tela) trava o alvo nele; tocar nele de novo destrava. Se o alvo travado sair do alcance, o golpe vai no monstro mais próximo ao alcance (o alvo continua travado).
- **Tiro que pode errar:** o básico à distância (Paladino, Feiticeiro, Druida) e as magias de alvo único com projétil são mirados numa **direção** e voam reto até o alcance inteiro (ver "Ataques e magias"). Arrastar o ⚔️ mira à mão.
- **Mira das magias:** magia com alvo (única ou de área) mira arrastando a partir do botão (ver "Ataques e magias").
- **Tela:** sempre 9 tiles no lado curto (pelo menos 13 no longo): em pé, 9 de largura, com o jogador um pouco acima do centro, porque a parte de baixo é dos polegares; deitado, o tile tem o mesmo tamanho que teria em pé no mesmo celular (no iPhone, com as barras do Safari, sobram uns 7 tiles de altura; nunca menos de 6,5), com o jogador no centro. Deitado se vê menos na vertical e mais para os lados. HUD no topo (tempo, barras de HP, mana e XP, loot), respeitando o notch (safe area).
- Sem zoom de pinça nem rolagem acidental. O jogo pede tela cheia e tenta travar na vertical ao entrar na hunt.
- **Princípio: a câmera nunca treme.** Nenhum efeito (magia, golpe, habilidade de boss, explosão) sacode a tela: no
  celular o tremor cansa, atrapalha a mira e esconde o que está acontecendo. O peso de um golpe vem do desenho no chão e
  nos alvos (clarão, rachaduras, fogo, fumaça, número de dano).
- **Desktop é só para desenvolvimento:** o jogo aparece numa coluna 9:16 no meio da tela, com WASD, clique, Espaço (atacar), 1 e 2 (magias na frente do herói, como o toque rápido), Tab e Esc.
- Sessões curtas (3 a 5 min) e entrar numa partida em poucos toques.

## Menu inicial (estilo Zooba / Clash)

Depois do login, o menu ocupa a tela inteira com 4 abas embaixo (no alcance do polegar) e, no centro da barra, o botão
redondo de **Batalhas** (espadas cruzadas), um pouco maior que as abas.
O **Batalhas** abre o **mapa mundi** (ver "Salas e sala de espera" e "Mapa mundi").
Código em `apps/client/src/menu.ts`.

- **Heróis:** um medalhão por classe com o retrato de busto do herói vestido (`heroPortrait`, ver `docs/ARTE_HEROIS_ROSTO.md`; tocar escolhe o herói da próxima hunt) e o palco do escolhido: o herói vestido andando e girando (tocar faz ele pular), as especializações escolhidas, o papel, os atributos em barras (vida, mana, dano, armadura, alcance e velocidade já com as áureas, as runas e os itens vestidos por ele, na mesma conta da hunt; a barra compara com os outros heróis e o trecho listrado é o bônus) e o **Arsenal**: atalhos para o Grimório (os 3 ramos e as magias que vão para a hunt) e para o equipamento (6 slots e 3 runas). Tocar em **Grimório** (ou nas magias que vão para a hunt) abre **Magias da hunt** (ver abaixo); os 3 ramos abrem a árvore no ramo tocado.
  - **Classe trancada:** o **Xamã Orc** só abre quando qualquer personagem da conta vence **Vorgak** na Fortaleza Orc
    (`CLASS_UNLOCK` em `packages/shared/src/classes.ts`, repetido no banco em `class_unlocked`). Antes disso, o
    medalhão aparece em silhueta escura com 🔒 e dá para ver o herói, o papel, os atributos e o Grimório, mas o
    Batalhas recusa ("vença Vorgak..."). O servidor de jogo recusa a sala (e o bot) com a classe trancada e o banco
    recusa a hunt solo (`start_solo_run`). Na tela de resultado da hunt em que Vorgak cai, uma carta avisa:
    "⛓️ Os xamãs da forja estão livres — Xamã Orc liberado". Desenho completo em `docs/CLASSE_XAMA_ORC.md`.
- **Magias da hunt** (subpágina de Heróis, aberta também pelo atalho no topo do Grimório; o "‹" volta para a página de onde veio; `renderLoadout` em `menu.ts`, leitura em `apps/client/src/spellPlan.ts`): onde o jogador escolhe as até 3 magias ativas de cada slot sem abrir ficha por ficha na árvore.
  - No alto, os **3 slots** lado a lado, cada um com o nível em que abre na hunt e 3 encaixes com as magias ativas; tocar abre a lista do slot. O **slot 3** abre no nível 12 (`SPELL_SLOT_LEVELS`).
  - **O que você leva para a hunt:** 4 necessidades (dano em área, dano no alvo, controle, sobrevivência) com as magias ativas de todos os slots que atendem cada uma; a primeira que falta vira uma dica com a solução (ativar uma magia conhecida que está fora, ou aprender uma da árvore).
  - **Lista do slot:** as magias conhecidas da mais forte para a mais fraca (+10% por nível de uso vezes a sinergia e o Tomo), com nível, Maestria, papéis (área, alvo único, controle, defesa, cura, mobilidade, invocação, reforço, tirados dos efeitos), mana, recarga e força extra. A chave ao lado liga e desliga na hunt e grava na hora (`set_active_spells`); com 3 magias ou menos no slot, todas ficam ligadas e a chave trava. Tocar na magia abre a ficha da árvore.
  - **Sugestão:** começa pela mais forte e, a cada vaga, pesa a força contra o papel novo que a magia traz ao slot e a necessidade que o outro slot não cobre, para a escolha na hunt ter opções diferentes. Cada magia sugerida diz o motivo; "Aplicar" troca o slot inteiro e o "Desfazer" volta a escolha anterior.
  - Embaixo, **Para aprender neste slot**: as magias ainda não compradas, com o ramo, os papéis e o preço (ou 🔒), para planejar a próxima compra.
- **Grimório:** a árvore de magias de cada classe (ver abaixo). Os medalhões do alto são os mesmos da página Heróis: trocar de herói numa página troca na outra e no herói da próxima hunt.
- **Itens:** o equipamento que vai para a próxima hunt (um item por slot, **separado por classe**: trocar de classe troca o que está no corpo), logo abaixo os **3 slots de runa** da classe (ver "Runas"), o **cofre** (20 espaços) e a **bag** (8 espaços). O cofre só é acessado aqui.
- **Mercado:** compra itens comuns até Mithral (entregues no cofre), filtrados por slot e pela classe escolhida, e vende qualquer item da conta. Itens de Dragão, raros e mágicos só saem das hunts.
- Configurações e "Sair da conta" ficam no ⚙️ do topo.
  - **Telemetria** (`apps/client/src/telemetry.ts`): os números de todas as hunts, para qualquer jogador logado, com filtro de mapa e período: visão geral, hunts por dia, como as hunts terminam, sobrevivência por classe, o que mais mata, fontes de dano, magias e melhorias escolhidas, curva de nível e as suas hunts. Só agregados, sem nomes (função `telemetry_dashboard`).
  - **Regras** (`apps/client/src/rules.ts`): como o jogo funciona, em seções que abrem e fecham. Os números (tempos, preços, melhorias, poções) vêm de `packages/shared`, então a página acompanha o balanceamento.
  - **Catálogo** (`apps/client/src/catalog.ts`): todo equipamento, runa e poção com o que faz e o preço, e cada inimigo de cada mapa com vida, dano, XP, elementos, habilidades e o que larga (gold, chance de item e de raridade, poções, runa). Tem busca. Tudo vem de `packages/shared` (`dropOdds` em `drops.ts` para as chances), então conteúdo novo aparece sozinho; o teste `catalogo` confere as chances contra a hunt.
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
- **Áureas** (quadrado no desenho): dano +4%/nível, vida +6%/nível, mana +8%/nível nos 3 primeiros níveis e
  velocidade +4%/nível nos 2 primeiros. Do nível seguinte em diante, cada nível vale menos (dano +1%, vida +1,5%,
  mana +2%, velocidade +1%), **até o nível 20** (dano +29%, vida +43,5%, mana +58%); a velocidade para no **6** (+12%),
  porque velocidade alta deixa o herói fugir de tudo. Preço: 120–300 de gold e ×1,15 por nível (velocidade ×1,3).
  Valem sempre, desde o nível 1. Com muitos níveis, o nó mostra "7/20" em vez das bolinhas.
- **Dons** (hexágono no desenho, um no topo e um no fundo de cada ramo): passivas compradas **só com gold**, sem XP, com **25 níveis**
  (`packages/shared/src/gifts.ts`). Ficam na linha 2, do lado oposto ao Tomo, e pedem o mesmo primeiro nó do tronco.
  Valem em toda hunt e não caem na morte. Preço: 60 de gold no 1º nível e ×1,12 por nível (~8 mil até o 25; o último
  nível custa 911). A ficha compra **+1** ou **+5 níveis** de uma vez (`buy_talent_levels`). Plano dos marcos e dos
  outros Dons em `docs/GRIMORIO_4_PLANO.md`.

  | Classe | Ramo | Dom | Por nível | No nível 25 |
  |---|---|---|---|---|
  | Cavaleiro | Lâmina | 🗡️ Fio Temperado | +1,2% de dano do ataque básico | +30% |
  | Cavaleiro | Bastião | 🛡️ Couro Curtido | +0,6 de armadura | +15 |
  | Cavaleiro | Comando | 🎖️ Voz de Comando | +1% de dano para você e os aliados a até 4 tiles (bots incluídos; entre vários, vale a voz mais forte) | +25% |
  | Paladino | Mira | 🦅 Olhar Paciente | +1,2% de dano (básico e magias) em monstros a 4 tiles ou mais | +30% |
  | Paladino | Luz | ✝️ Fé Ardente | +1,6% de dano (básico e magias) em mortos-vivos | +40% |
  | Paladino | Batedor | 🧭 Passo de Rastreador | +0,4% de velocidade de movimento | +10% (teto) |
  | Feiticeiro | Raio | ⚡ Condutor | +1,2% de dano nas magias de energia e de fogo | +30% |
  | Feiticeiro | Gelo | ❄️ Coração Frio | +1% de duração das prisões e lentidões das suas magias | +25% |
  | Feiticeiro | Trevas | 🌑 Fome Sombria | 0,8% do dano das magias de trevas volta como vida | 20% |
  | Druida | Matilha | 🐺 Laço da Matilha | +1,2% de vida e de dano das suas criaturas | +30% |
  | Druida | Bosque | 🌿 Seiva Antiga | +1% de cura (magias, campos e criaturas) | +25% |
  | Druida | Espinhos | 🌵 Seiva Venenosa | +1,2% de dano dos seus venenos e sangramentos | +30% |
  | Xamã Orc | Horda | 📯 Grito do Clã | +1% de dano para você e os aliados a até 4 tiles (entre vários, vale o grito mais forte) | +25% |
  | Xamã Orc | Totens | 🪵 Casca de Ferro | +0,6 de armadura | +15 |
  | Xamã Orc | Brasa | 🔥 Brasa Viva | +1,2% de dano do ataque básico | +30% |

  **Marcos** (`milestones` em `gifts.ts`): a cada 5 níveis (5, 10, 15, 20 e 25) o Dom ganha um comportamento novo,
  como a Maestria das magias; a ficha lista os 5 e acende os alcançados. Entram por classe (fase 4a-2). Cavaleiro:
  - 🗡️ Fio Temperado: o 4º golpe seguido sangra 3 s · esse golpe vira corte em leque de 60° · a cada 3º golpe · o leque
    sangra · o leque abre a 90°.
  - 🛡️ Couro Curtido: escudos +10% · imune às lentidões dos monstros · +5% de vida · escudos +20% no total · escudo
    quebrado dá 2 s com 30% menos dano.
  - 🎖️ Voz de Comando: alcance 5 · magias de área que provocam +1 tile · quem está na voz anda +5% · alcance 6 · aliado
    abaixo de 20% ganha escudo de 15% (uma vez a cada 60 s por cavaleiro).
  - ⚔️ Último Duelo: com a vida baixa, 10% de roubo de vida · vale abaixo de 35% · ataca 15% mais rápido · roubo de 15% ·
    o slot 3 recarrega na metade do tempo.
  - 🏯 Pedra Fundamental: parado, regenera 1% da vida por s · provoca os colados a cada 3 s · +5 de armadura · conta como
    parado depois de 0,5 s · o básico corta todos os colados.
  - 👑 Estandarte Vivo: aura de 4 tiles · +3 de armadura na aura · quem mata na aura cura 2% · aura de 5 · depois do slot 3
    do cavaleiro, a aura corta 10% do dano por 3 s.
  - Paladino:
    - 🦅 Olhar Paciente: +1 tile no básico · o tiro no alcance máximo atordoa 0,3 s (a cada 10 s) · a cada 6 s · 5% de
      chance de flecha dupla · 10%.
    - ✝️ Fé Ardente: queimaduras +1 s · magias de luz ofuscam +0,2 s · matar morto-vivo cura 1% · +0,4 s · a magia de luz
      de alvo único acerta também o monstro logo atrás.
    - 🧭 Passo de Rastreador: armadilhas +10% de duração · +1 armadilha de cada · 3 s sem apanhar: o próximo tiro dá +10%
      · armadilhas +20% · +2 armadilhas.
    - ⛪ Graça: a cada 9 magias · a carregada cura 5% · a cada 8 · e ofusca a até 2 tiles por 0,5 s · a cada 7.
    - 🌬️ Fôlego do Caçador: o tiro carregado atravessa · rolar devolve 10% da recarga do slot 1 · 2 tiros carregados ·
      o tiro carregado atordoa 0,3 s · rolar dá escudo de 5%.
    - 🎇 Mão Rápida: a flecha incendiária explode em raio 1 (0,5× do básico) · +2% de chance · chão em chamas 2 s · +4% ·
      o 6º básico sai sempre incendiário.
  - Feiticeiro:
    - ⚡ Condutor: cadeias +1 salto · queimaduras +1 s · Estática e Combustão +5% · +2 saltos · o 1º salto não perde dano.
    - ❄️ Coração Frio: lentidões +5% · monstro lento recebe +5% do seu dano · +10% · prender com magia dá escudo de 5% ·
      o congelado que morre congela os colados por 1 s.
    - 🌑 Fome Sombria: marcas +1 s · matar com magia devolve 1% da mana · +2 s · +1% de roubo de vida · as magias de
      trevas roubam 2% do dano em mana.
    - 🔁 Circuito: janela de 10 s · a carregada salta para mais 1 monstro · 2 elementos bastam · os efeitos dela duram +30%
      · ela recarrega na metade do tempo.
    - 🔷 Reserva Gélida: quem bate no escudo de gelo congela 1 s · a cada 25 s · abaixo de 20% da mana · o escudo devolve
      10% da mana ao quebrar · a cada 20 s.
    - 🦴 Ossuário: esqueletos de 10 s · até 3 · marcam quem atacam (+10% por 3 s) · 12 s · ao sumir, explodem em
      Condenação (raio 1).

  **Dons do fundo** (um embaixo de cada Ápice, na linha VII, pedindo o Ápice no nível 1; mesmo preço e 25 níveis):
  cada um tem um **gatilho de momento**, calculado no servidor. O Xamã Orc ganha os dele quando o tronco tiver Ápices.

  | Classe | Ápice | Dom | Gatilho e efeito por nível | No nível 25 |
  |---|---|---|---|---|
  | Cavaleiro | Ceifa do Campeão | ⚔️ Último Duelo | vida abaixo de 30%: +1,6% de dano (básico e magias) | +40% |
  | Cavaleiro | Baluarte | 🏯 Pedra Fundamental | parado há 1 s: -1,2% de dano recebido | -30% |
  | Cavaleiro | Carga da Legião | 👑 Estandarte Vivo | aura de 3 tiles: você e os aliados (bots incluídos) com +0,6% de velocidade de ataque (vale o maior) | +15% |
  | Paladino | Tiro do Fim do Mundo | 🌬️ Fôlego do Caçador | depois de rolar ou saltar, o próximo básico: +4% | +100% |
  | Paladino | Coroa Solar | ⛪ Graça | a cada 10 magias, a seguinte sai sem mana e com +2% de dano | +50% |
  | Paladino | Chuva sem Fim | 🎇 Mão Rápida | 0,8% de chance de o básico incendiar o alvo (3 s, 0,4× do básico por segundo) | 20% |
  | Feiticeiro | Relâmpago Ramificado | 🔁 Circuito | magias de 3 elementos em 8 s: a seguinte sai sem mana e com +2% de dano | +50% |
  | Feiticeiro | Era do Gelo | 🔷 Reserva Gélida | mana abaixo de 15% depois de uma magia: escudo de 1,2% da vida por 6 s (recarga 30 s) | 30% |
  | Feiticeiro | Buraco Negro | 🦴 Ossuário | monstro morto por trevas: 1,6% de chance de um esqueleto seu por 8 s (até 2) | 40% |
  | Druida | Caçada Selvagem | 🐾 Instinto | a cada 4º básico, uma mordida de 0,5× +2% do básico | 1× |
  | Druida | Árvore da Vida | 🌀 Ciclo | a cada 300 de cura feita, uma onda cura você e quem estiver colado (5% +0,4% da vida máxima) | 15% |
  | Druida | Furacão de Folhas | ⛈️ Céu Fechado | monstro que morre envenenado ou sangrando por você: 1,2% de chance de um raio (1,5× do dano mágico) no mais perto, até 4 tiles | 30% |
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
- **Tomos** (livro no desenho, um por ramo: 📕 📗 📘): +5% de força em todas as magias do ramo por nível nos 3
  primeiros níveis e +1,2% do 4º ao **20** (+35,4% no 20), 300 de gold e ×1,12 por nível. Ficam na linha 2, na ponta oposta às costelas, e pedem o primeiro nó do tronco.
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
    como mandíbulas de ferro, a estaca como um poste com o alcance em volta e o totem do Xamã Orc como um poste
    entalhado com um crânio de chifres e a chama acesa no alto. Conjurar de novo troca o campo mais antigo da mesma
    magia (o totem deixa 2 de cada vez, `field.max`). A estaca, o totem e a armadilha atiram e disparam sozinhos; o
    dano conta para quem os pôs. Os monstros não atacam campos.
  - **Mira em aliado** (Escudo da Luz): arrastando, o herói a até 1 tile do ponto (círculo azul nos pés); parado no
    botão, o mais ferido ao alcance. **Mira em leque** (Barragem e as magias em leque): a mira acende os tiles do leque, com o ângulo de cada magia.
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
  As magias que ficaram fora dos slots não perdem nada. Hunt solo abandonada (aba fechada) depois da sala inicial conta como morte, mas sem
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
| Xamã Orc (raiz: Totem da Brasa) | **Horda:** Chamar Batedores → Áurea da Forja → Lanceiros do Clã → Arqueiros do Clã → Capitão do Clã | **Totens:** Áurea do Entalhe → Totem do Lodo → Totem do Chamado → Áurea do Clã → Grande Totem do Clã | **Brasa:** Tambor de Guerra → Lança de Brasa → Batida de Guerra → Áurea do Couro Curtido → Ogro da Forja |
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

#### Slot 3: magias supremas (Grimório 4.0)

O 3º slot abre no **nível 12** da hunt. Todas as magias dele se compram (nenhuma vem de graça); a mais barata é a
**magia de entrada** de cada classe, ao lado da raiz do Grimório (aparece em todas as abas), por 1.000 de gold, pedindo
só a raiz. Recarga longa (30 s), efeito que muda a luta. O XP de uso segue a regra dos outros slots, e o banco guarda o
XP de até 3 magias por hunt (`record_spell_xp`). O nível 12 não dá melhoria (é nível de slot).

| Classe | Magia de entrada | O que faz (nível 0) | Maestria |
|---|---|---|---|
| Cavaleiro | 🌋 **Fúria do Titã** | salta até 3 tiles no ponto mirado e cai: raio 2, 2,5× e atordoa 1 s | raio 3 |
| Paladino | 🏹 **Flecha Celeste** | atira para o céu; 1 s depois cai no ponto mirado: raio 2, 3× e ofusca 1 s (`delayMs`) | raio 3 |
| Feiticeiro | 🌀 **Vórtice Arcano** | orbe lento que atravessa a reta (6 tiles, em onda), 2,6× em tudo que pega | alcance 8 |
| Druida | 🦋 **Revoada** | borboletas em leque de 120° e 4 tiles (onda): 1,2×, curam 15% dos aliados no caminho e 20% do dano volta como vida | cura 25% |

O **Xamã Orc** também tem magia de entrada: 🗿 **Totem Ancestral** (campo de raio 3 por 12 s: 0,4× por segundo nos
monstros e +20% de dano para os aliados dentro; Maestria: 18 s).

**Ápices** (2.000 de gold): um no fim do tronco de cada ramo, na ponta direita, fora da especialização (valem para os
dois lados); pedem a última magia do tronco no nível 1 de uso.

| Classe | Ramo | Ápice | O que faz (nível 0) | Maestria |
|---|---|---|---|---|
| Cavaleiro | Lâmina | ⚔️ **Ceifa do Campeão** | **varredura** de 180° e 3 tiles: a lâmina corre de um lado ao outro, 3 passadas de 1,6× que sangram | 4 passadas |
| Cavaleiro | Bastião | 🏰 **Baluarte** | escudo de 35% em você e nos aliados a até 4 tiles, +8 de armadura por 8 s e provoca | escudo de 45% |
| Cavaleiro | Comando | 🐎 **Carga da Legião** | **aura que anda com você** por 8 s: quem estiver a até 4 tiles causa +25% e ataca 20% mais rápido; quem se afasta perde o bônus | 12 s |
| Paladino | Mira | 🎯 **Tiro do Fim do Mundo** | **carrega 1 s parado** e solta uma reta de 12 tiles que atravessa tudo: 4×, dobro abaixo de 30% da vida | carrega em 0,5 s |
| Paladino | Luz | 👑 **Coroa Solar** | **anel de luz em órbita** em volta de você por 8 s: a cada 0,5 s, 0,6× e ofusca 0,3 s quem está a 1–2 tiles; anda com você | o anel vai até 3 tiles |
| Paladino | Batedor | 🏹 **Chuva sem Fim** | canaliza 3 s: leque de 90° e 6 tiles, 0,5× a cada 0,3 s; anda 60% mais devagar | não fica lento |
| Feiticeiro | Raio | 🌩️ **Relâmpago Ramificado** | linha de 7 tiles que se abre em 3 galhos de 4 tiles em leque no fim, 2,4× | 5 galhos |
| Feiticeiro | Gelo | 🧊 **Era do Gelo** | campo de raio 4 por 6 s: 70% de lentidão e, a cada 2 s, 0,6× e prende 1 s | raio 5 |
| Feiticeiro | Trevas | 🕳️ **Buraco Negro** | raio 3 no ponto: **puxa os monstros para o centro** e explode (1,8×) duas vezes | três vezes |
| Druida | Matilha | 🐾 **Caçada Selvagem** | 3 lobos e 1 urso por 12 s | 18 s |
| Druida | Bosque | 🌳 **Árvore da Vida** | campo de raio 3 por 12 s que cura 5% por segundo os aliados dentro | 8% |
| Druida | Espinhos | 🍂 **Furacão de Folhas** | canaliza 3 s: leque de 90° e 5 tiles, 0,5× a cada 0,3 s e empurra | prende 0,5 s por pulso |

Faltam os Ápices do Xamã (quando o tronco dele existir) e as magias de slot 3 das especializações.

#### Magias em leque (Grimório 4.0)

Magias que saem **do herói em leque**, na direção mirada (no toque rápido, para a frente do herói). Plano em
`docs/GRIMORIO_4_PLANO.md` (seções 6.1 e 8). Três formas, todas com a mesma conta no cliente e no servidor:

- **Abertura** (`coneAngle`): de 45° (estreito e longo) a 180° (meia-lua); as 3 magias de leque antigas continuam com 90°.
- **Onda** (`wave`): o leque avança um anel de tiles por vez; quem está na ponta apanha depois, e cada monstro leva o
  efeito uma vez só (o monstro que anda na direção do herói não escapa por trás da onda).
- **Projéteis em leque** (`spread`): vários tiros espalhados em volta da mira, cada um pode errar; colado no monstro,
  todos acertam nele.
- **Canalizar** (`channel`, o "cuspir fogo"): a magia sai ao encostar no botão, para a frente do herói, e o leque se
  repete a cada pulso. **Segurar e arrastar** vira o leque (o cliente manda a direção a cada 80 ms, `MSG.channel`);
  **soltar** encerra. **Toque rápido** (menos de 250 ms, sem arrastar) deixa o sopro ir até o fim para a frente.
  Canalizando, o herói anda mais devagar. Mana e recarga saem uma vez, no começo. Atordoado ou engolido, para.
- **Várias armadilhas** (`field.count`): os Abrolhos espalham as armadilhas no leque, cada uma na ponta da reta dela
  (parando na parede); cabem as de um lançamento ao mesmo tempo (vezes o Engenhoso).
- **Desenho de sopro:** partículas saem do herói e abrem no ângulo; cada tile acende quando a onda chega. Vale também
  para o Corte Largo, a Barragem e o Cone de Frio. A mira mostra os tiles do leque (com o ângulo da magia) ou uma linha
  pontilhada por projétil.

| Classe | Ramo (pai) | Magia | Slot | O que faz (nível 0) | Maestria |
|---|---|---|---|---|---|
| Cavaleiro | Lâmina (Golpe Esmagador) | 🌬️ **Lâmina do Vendaval** | 1 | onda de 60°, 3 tiles, 1,4× e empurra 1 | segunda onda com 60% |
| Cavaleiro | Bastião (Escudo da Fé) | 🔰 **Muro de Escudos** | 2 | leque de 120°, 2 tiles, 1×, empurra 2 e atordoa 0,8 s | escudo de 20% por 5 s |
| Cavaleiro | Comando (Áurea da Disciplina) | 📢 **Brado Cortante** | 1 | leque de 90°, 4 tiles, 0,6×, provoca e marca (+15% por 5 s) | 30% de lentidão |
| Paladino | Mira (Disparo Perfurante) | 🪶 **Leque de Flechas** | 1 | 5 flechas em 45°, 0,9× cada | 7 flechas |
| Paladino | Luz (Luz Curativa) | ☀️ **Clarão Sagrado** | 2 | onda de 120°, 4 tiles, 1,2×, ofusca 1 s, dobro em mortos-vivos | marca os ofuscados (+15% por 4 s) |
| Feiticeiro | Raio (Relâmpago) | 🔥 **Cusparada de Fogo** | 1 | onda de fogo de 60°, 3 tiles, 1,3× e queima 3 s | leque de 90° |
| Feiticeiro | Raio (Cusparada de Fogo) | ⚡ **Leque de Raios** | 2 | 3 raios em 60°, 1,4× cada, e cada um salta 1 vez | 5 raios |
| Feiticeiro | Trevas (Áurea da Égide) | 🌑 **Lamento Sombrio** | 1 | onda de 120°, 3 tiles, 1,1× e rouba 15% de vida | rouba 25% |
| Druida | Matilha (Lobo Espiritual) | 🐺 **Rugido da Alcateia** | 1 | leque de 90°, 3 tiles, 0,8×, empurra 1; criaturas 30% mais rápidas por 4 s | as criaturas curam 10% |
| Druida | Bosque (Mariposa Curandeira) | 🌸 **Brisa de Pólen** | 2 | onda de 120°, 5 tiles: cura 20% dos **aliados** no leque e tira veneno, queimadura e lentidão; monstros 30% lentos | cura 30% |
| Druida | Espinhos (Espinho Venenoso) | 🌵 **Rajada de Espinhos** | 1 | 6 espinhos em 60°, 0,7× cada, que sangram | 8 espinhos |
| Feiticeiro | Gelo (Nova de Gelo) | 🌨️ **Sopro Gélido** | 2 | **canalizada** por até 2 s: leque de 60°, 4 tiles, 0,4× e 40% de lentidão a cada 0,25 s; 6 pulsos seguidos no mesmo monstro o congelam 1 s | congela com 4 pulsos |
| Paladino | Batedor (Áurea Sagrada) | 🪤 **Abrolhos** | 1 | 3 estrepes espalhados num leque de 90°, na ponta do alcance (3 tiles), por 20 s: quem pisa fica 50% lento e sangra | 5 estrepes |

- Preço: 500 (linha 3) e 800 (Leque de Raios, linha 4), como as costelas. Cada uma pede o pai no nível 1 de uso.
- Telemetria: `stats.fanHits` (monstros pegos por magia em leque).

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
  **Com a bag cheia, não pega mais nada do chão**: só um slot de equipamento vazio ainda recebe item. O HUD mostra o botão da bag com a lotação (vermelho quando cheia; ver "Bag na hunt").
- Quem foge ou conclui volta com o equipamento vestido, e **a bag é transferida sozinha para o cofre**, melhores itens primeiro.
  **Com o cofre cheio, o que não couber fica na bag** e entra na próxima hunt (ocupando espaço e correndo risco).
- Quem morre perde **1 equipamento do corpo, sorteado**, **a bag inteira** e as poções: tudo cai no chão e outro jogador pode pegar e extrair. O resto do equipamento volta para a conta.
  - **Morte no começo não custa equipamento:** abaixo do nível 5 do herói (`DEATH_SAFE_LEVEL`) o corpo não perde nada; só a bag, as poções e o loot. Morrer no nível 1 a 3 num mapa difícil apagava o melhor item da conta a cada tentativa.
  - **O item raro pesa menos no sorteio** (`DEATH_LOSS_WEIGHT`): comum 1, raro 0,5, mágico 0,25. Com 4 peças comuns e 1 mágica, o mágico sai em 6% das mortes (antes, 20%).
- Cada classe tem os próprios 6 slots. A aba Itens mostra o equipamento da classe escolhida, e só a classe que usa o item pode vesti-lo. O mesmo item fica num corpo por vez: equipar no Druida um item vestido pelo Feiticeiro tira dele. O equipamento das outras classes não ocupa o cofre e fica em casa na hunt; quem volta vivo devolve o vestido à classe com que jogou.
- Na aba Itens: equipar um item do cofre devolve o do slot ao cofre; tirar do equipamento e guardar da bag precisam de espaço no cofre.
- Funções no banco: `buy_item`, `equip_item`, `store_item` e `sell_item` (jogador); `take_loadout`, `take_bag`, `finish_run` e `store_bag` (servidor de jogo).

#### Bag na hunt (menu)

- **No HUD aparece só um botão de bag** (🎒 com a lotação, ex.: 3/8), embaixo do loot. Os itens da bag e o equipamento vestido aparecem **somente no menu** da bag (e no próprio personagem). Código em `apps/client/src/bagbar.ts`.
- Tocar no botão (ou B no desktop) abre o menu na parte de cima da tela, para o polegar esquerdo continuar andando. A hunt não pausa.
- No menu, tocar num item mostra o que ele faz (e o vestido no mesmo slot, para comparar):
  - item da bag: **Equipar** (troca de lugar com o vestido) ou **Largar** (cai no chão onde o herói está, e qualquer um pode pegar);
  - item vestido: **Guardar na bag**, se couber.
- O que o jogador larga não volta para a bag enquanto ele estiver em cima do item: precisa sair do tile e voltar.
- Mercado: compra Comum 60, Bronze 150, Ferro 350, Aço 800; vende por 10, 25, 60, 130 e Dragão 300.

### Runas

Pedras mágicas que **só saem dos bosses** (o Dragão jovem e o Rei Bullywug dão 1 runa cada) e seguem uma regra própria de loot:
**não caem no chão, vão direto para a bag.** **Cada boss dá a runa uma vez por personagem** (conta e classe): quando ele
morre, cada herói da equipe que está jogando e ainda não levou a runa daquele boss recebe a sua na bag, esteja onde
estiver; quem já levou vê "Runa deste boss já levada" (bots não recebem). Com a bag cheia, o item de menor valor de venda
cai no chão aos pés do herói (qualquer um pega) e a runa ocupa o lugar dele. Depois disso a runa **passa de mão em mão**
livremente: largada da bag, qualquer um da equipe pega. Vale também para os baús de runa atrás do Verme da Areia. O banco
anota em `profile_boss_runes` (`record_boss_runes` no servidor de jogo, `finish_solo_run` na hunt solo e na sala no
aparelho do jogador, que aceita uma runa nova por boss anotado na hunt mais até 3 recebidas de colegas,
`SOLO_LIMITS.passedRunes`).
Tabela em `packages/shared/src/runes.ts`; no banco, os ids "rune-…" ficam em `market_items` e `profile_items` como os itens.

- Ficam no **cofre e na bag como os itens** (ocupam espaço igual) e o mercado compra (120; as de magia, 220; as Mestras, 400). O mercado não vende runas.
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
| 🪨 Pedra | +4 de armadura | 3 |
| 👟 Vento | +12% de velocidade | 3 |
| 💧 Arcana | +20% de mana máxima e +1% de mana por segundo | 3 |
| 🩸 Sangue | cura 5% do dano causado | 3 |
| ⏳ Tempo | recarga das magias 12% menor | 3 |
| 💗 Troll | +2% de vida por segundo | 3 |
| ⚡ Relâmpago | o Relâmpago (Feiticeiro) vira opção no slot 1 | 1 |
| 🛡️ Fé | o Escudo da Fé (Cavaleiro) vira opção no slot 1 | 1 |
| ☄️ Meteoro | o Meteoro (Feiticeiro) vira opção no slot 2 | 1 |
| ☀️ Aurora | a Luz Curativa (Paladino) vira opção no slot 2 | 1 |
| 🐎 Investida | a Investida (Cavaleiro) vira opção no slot 1 | 1 |
| 🚩 Estandarte | o Estandarte de Guerra (Cavaleiro) vira opção no slot 2 | 1 |
| 🤸 Rolamento | o Rolamento (Paladino) vira opção no slot 1 | 1 |
| 🎯 Caçador | a Marca do Caçador (Paladino) vira opção no slot 1 | 1 |
| 💨 Névoa | o Passo Nebuloso (Feiticeiro) vira opção no slot 1 | 1 |
| 🌿 Bosque | a Bênção da Floresta (Druida) vira opção no slot 1 | 1 |
| 🐺 Lobo | o Lobo Espiritual (Druida) vira opção no slot 1 | 1 |
| 🦠 Peste | a Nuvem Venenosa (Druida) vira opção no slot 2 | 1 |

- **Runas Mestras** (pedra dourada): mudam o jeito de jogar e **sempre cobram um preço**. Só **uma** vale entre as 3 runas
  equipadas da classe (`equip_item` recusa a segunda; o servidor também confere com `activeRunes`). O mercado compra por 400.
  Saem dos bosses como as outras, cerca de 1 em cada 5 runas sorteadas. Números em `MASTER_RUNES` (`runes.ts`), efeitos na `Hunt`.

| Mestra | Efeito | Preço |
|---|---|---|
| 🔥 Fênix | na primeira morte da hunt, renasce com 40% da vida (1,5 s sem levar dano; a semente do druida vem antes) | -10% de vida máxima |
| 💎 Vidro | +35% de dano | -25% de vida máxima |
| 🗿 Colosso | +40% de vida máxima e +3 de armadura | -12% de velocidade |
| 🔁 Eco | a cada 4 magias, a seguinte não gasta mana nem recarga | magias custam 15% mais mana |
| ⚰️ Ceifador | cada monstro que o herói mata devolve 3% da vida e da mana | -15% de dano em mini-boss e boss |
| 👑 Regicida | +30% de dano em mini-boss e boss | -10% de dano nos outros monstros |
| 🕯️ Pacto | sem mana, a magia sai gastando vida no lugar (nunca a última) | -30% de regeneração de mana |
| 💢 Vingança | abaixo de 30% da vida, fere (150% do ataque) e empurra quem está colado e ganha escudo de 20% da vida por 6 s; recarga de 45 s | -10% de dano |

- **Runas de magia:** 3 de cada classe (mobilidade, cura, invocação e apoio valem mais emprestadas), cerca de 1 em cada 4 runas sorteadas. A magia aparece como opção extra na escolha do slot, para qualquer classe, no nível base (ou no nível
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

- **Força:** o bot leva a configuração da classe dele na conta de quem o pôs: o Grimório inteiro (magias compradas e o
  nível delas, magias ativas, auras, traços e tomos) e o equipamento e as runas equipados naquela classe, no mesmo nível
  inicial dos humanos. O equipamento é uma **cópia**: nada sai da conta, o bot não larga nada ao morrer e nada volta
  (o que não serve na classe fica de fora, sem ir para bag). A cópia é lida antes de retirar o equipamento dos humanos,
  então um humano e um bot da mesma classe vestem o mesmo conjunto. Quem entra sem conta põe bot sem nada comprado.
- **Comportamento** (`apps/server/src/botAi.ts`): segue o líder (ou o humano vivo mais perto), enfrenta o alvo do líder ou o monstro
  mais perto da equipe, escolhe a magia de maior nível entre as oferecidas em cada slot e a 1ª melhoria de cada nível, e conjura assim que a magia recarrega:
  cura e escudo em quem está ferido, dano em quem está ao alcance, bônus e campos quando a luta está perto. Longe demais do líder
  (passou pela caverna, ficou preso), reaparece ao lado dele. Não pisa no portal nem na caverna.
- **Sem gold nem loot:** o bot não abre baú, não pega item nem poção do chão e não recebe runa de boss. Ele conta na divisão da XP e do
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
- hunt solo deixada aberta (aba fechada) conta como morte na próxima, mas só depois que o herói saiu da sala inicial
  e jogou 60 s (`SOLO_LIMITS.committedSeconds`); antes disso, fecha sem perda (equipamento e bag voltam). Ao começar a
  próxima, um aviso diz o que aconteceu com a anterior e o que se perdeu.

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

A tela de **Batalhas** é o mapa do mundo de **Kosaradius** (o título no alto), com a carta de **Verdemar**, o continente da
campanha (o subtítulo mostra quantos cenários a classe já abriu), desenhada como
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
  pequenos somem e os grandes crescem para seguir legíveis. A **barra de abas do menu** (Heróis, Grimório, Batalhas,
  Itens, Mercado) continua embaixo do mapa, com Batalhas aceso; tocar numa aba sai do mapa e abre a aba. Tocar de novo
  em Batalhas, já no mapa, leva a câmera ao herói e abre a ficha do cenário onde ele está.
- **Campanha:** uma trilha do sul ao norte com **18 cenários em 13 etapas**. Os 4 de hoje são o começo, na ponta sul:
  🐸 Pântano do Kosaradius → 🏚️ Cripta → 🏜️ Mar de Areia → 🌿 Pântano das Ruínas → 🕳️ Caverna da Travessia (trilha
  vermelha). Daí ao norte, sob a névoa da campanha, os cenários por vir (medalhões numerados, trilha pontilhada) até a
  **Cidadela Caída**. Depois da Travessia, os dois lados já existem: o deserto (🌬️ Dunas Cantantes → 🪨 Mesas de
  Solária → ⚔️ Fortaleza Orc, a etapa 8) e a floresta (🌳 Bosque Velho → 🍄 Coração da
  Mata, por enquanto só o terreno). O herói anda pelos dois ramos: para ir de um lado ao outro, volta pela trilha até a
  Travessia (`OPEN_CHAINS` em `verdemar.ts`).
- **Bifurcações:** 3, cada uma com dois caminhos que se reencontram (selo de placa no ponto): a **Caverna da
  Travessia** (etapa 5, no lugar da antiga Encruzilhada: floresta ou deserto), Fortaleza Orc (charco ou ermos) e
  Sopé da Serra (passo ou garganta). Tocar num cenário por vir só avisa de onde ele abre.
- **Bifurcação da Travessia:** cada lado é de um covil da Caverna: a floresta (oeste, Bosque Velho) é o lado do
  Basilisco, e o deserto (leste, Dunas Cantantes) é o do Observador. **Só o boss de um lado abre aquele lado:** o
  Basilisco abre o Bosque Velho e o Observador as Dunas Cantantes (um não abre o lado do outro). O cliente lê
  `profile_boss_clears` (bosses vencidos por personagem); a trilha fica vermelha entre dois cenários abertos, como no
  resto da campanha.
- **Pontos de hoje:** cada um mostra o selo 👥 N quando tem salas abertas. Tocar abre a ficha e leva o herói até ele
  pela trilha, passando pelos pontos do meio, em ~1 s; a câmera fica onde o jogador deixou (zoom e posição; 📍 leva
  até o herói). O boneco vira para o lado da caminhada e
  anima os passos. Tocar de novo no ponto, ou na ficha, pula a caminhada; com "reduzir movimento" ligado no aparelho
  (`prefers-reduced-motion`), o herói só troca de ponto.
- **Névoa:** Gelo de Hrimfal (norte) e Ilha de Cinza (leste), fora do continente; tocar só avisa.
- **Desbloqueio:** a campanha abre **por personagem (conta e classe)**: só o 🐸 Pântano do Kosaradius começa aberto, e
  vencer o boss de um cenário abre o seguinte (Grumak → Cripta, Dragão jovem → Mar de Areia, Verme da Areia → Pântano
  das Ruínas, Rei Bullywug → Caverna da Travessia, Observador das Profundezas → Dunas Cantantes, Colosso
  Cantante → Mesas de Solária, Faraó Eterno → Fortaleza Orc (boss: Vorgak); Basilisco → Bosque Velho, Dragão Verde Jovem →
  Coração da Mata). Ordem em `packages/shared/src/world.ts` (`WORLD_ORDER` e `unlockedBy`), repetida no banco
  (`map_unlocked_by`). Na Caverna da Travessia, qualquer um dos dois bosses vence o cenário (estrela), mas cada lado da
  bifurcação abre só com o boss dele (`UNLOCK_BOSS`, no banco `map_unlocked_by_boss`): os bosses vencidos ficam em
  `profile_boss_clears`, com a mesma regra do cenário vencido. Vence o cenário **todo humano que estava na hunt** quando o boss principal morreu, vivo ou morto (quem saiu da hunt
  e os bots, não). Cenário fechado tem cadeado e desenho apagado; a ficha mostra só a etiqueta 🔒 com o boss a vencer (a frase
  inteira fica no title), e os botões de
  jogar sozinho e criar sala ficam desligados, mas as **salas de outros jogadores** continuam abertas para entrar
  (convidado joga livre). Cenário de boss vencido ganha estrela (e "★ boss vencido" na ficha). A trilha fica vermelha
  entre dois cenários abertos. Contas de antes herdaram os cenários e os bosses vencidos pelas runas de boss já levadas.
- **Onde vale:** o banco recusa a hunt solo e a sala no aparelho de cenário fechado para quem cria
  (`start_solo_run`; quem entra na sala de outro usa `start_guest_run`); o servidor recusa criar sala na nuvem. O crédito é
  gravado por `record_map_clear` e `record_boss_clear` (servidor) e por `record_solo_map_clear` e `record_solo_boss_clear` (hunt solo e sala no aparelho, cada um o seu).
- **Etapa 9:** o Charco Cinzento e os Ermos Rubros abrem com Vorgak; a Fortaleza Orc virou a segunda
  bifurcação, e o herói troca de ramo voltando pela trilha até o último ponto comum (`worldMap.ts`).
- **Ainda não:** os outros 6 cenários da campanha não existem (medalhões numerados).

## Mapas

O jogador escolhe o mapa (cenário) tocando no ponto dele no mapa mundi. O último escolhido fica salvo no aparelho
(na primeira vez, o Pântano do Kosaradius). O mapa vale para as salas que ele **criar**; quem entra numa sala aberta joga o mapa dela, que aparece na lista de salas e na sala de espera.
Catálogo em `packages/shared/src/maps.ts`; gerador em `packages/shared/src/dungeon.ts`.
Cliente e servidor geram o mapa cada um do seu lado pela seed; por isso entram na sala só com a mesma versão das
regras (`RULES_VERSION`, um hash do gerador, dos mapas e das mensagens calculado sozinho). Cliente desatualizado se
recarrega sozinho; se o servidor ainda está terminando o deploy, o cliente pede para esperar 1 ou 2 minutos.

Escala de dificuldade de 1 a 8 estrelas (`MAX_DIFFICULTY`): 1 para os mapas de entrada, 2 para o Pântano das
Ruínas, 4 para a Caverna da Travessia, 5 para Dunas Cantantes, 6 para Mesas de Solária e 8 para a Fortaleza Orc, o mapa
mais difícil (a 3 e a 7 ficam livres). Os Portões do Império, sem monstros e fora da campanha, ficam com 6 provisório.

| Mapa | Dificuldade | Tempo | Tamanho | Monstros (comuns → mini-bosses → bosses) |
|---|---|---|---|---|
| 🏚️ Cripta | 1 ★☆ | 4 min | 72×72, 4 salas no caminho | Ratazana, Kobold, Estirge, Goblin, Goblin arqueiro, Zumbi, Hobgoblin capitão, Esqueleto, Esqueleto arqueiro, Aranha gigante, Orc guerreiro, Gnoll → Ogro, Bugbear chefe, Cubo Gelatinoso, Mímico → Dragão jovem |
| 🌿 Pântano das Ruínas | 2 ★★ | 8 min | 112×112, campo aberto com 7 zonas de monstros | Sapo gigante, Bullywug, Estirge, Cobra-d'água, Afogado, Homem-lagarto, Carniçal, Crocodilo gigante, Fogo-fátuo, Naga guerreira, Pudim Negro, Monte Errante → Troll do brejo, Bruxa Verde, Naga Espiritual → Rei Bullywug |
| 🏜️ Mar de Areia | 1 ★☆ | 6 min | 104×104 de superfície, 6 zonas e 4 campinas + caverna pequena | Escorpião da Areia, Abutre Gigante, Esqueleto, Aranha gigante, Esqueleto arqueiro, Gnoll, Múmia → Escorpião Negro Gigante, Sacerdote Mumificado, Elemental de Areia → Verme da Areia (na caverna) |
| 🕳️ Caverna da Travessia | 4 ★★★★ | 10 min | 76×108, toda subterrânea: chegada, tronco de 2 zonas, 2 túneis de 3 zonas e 2 covis | Kobold, Estirge, Ratazana, Goblin, Goblin arqueiro, Aranha gigante (tronco); Esqueleto, Esqueleto arqueiro, Gnoll, Hobgoblin, Orc, Carniçal, Homem-lagarto (oeste); Carniçal, Homem-lagarto, Afogado, Crocodilo, Naga, Pudim Negro, Monte Errante, Fogo-fátuo (leste) → Bugbear, Troll, Cubo Gelatinoso, Mímico → Basilisco (covil oeste) e Observador das Profundezas (covil leste) |
| 🌬️ Dunas Cantantes | 5 ★★★★★☆ | 8 min | 96×128, em pé: 4 vales entre cordilheiras de duna, 7 zonas, 5 campinas, ruínas soterradas e a bacia das pedras cantantes | Escaravelhos Carniceiros, Chacal de Ossos, Legionário Ossudo, Sagitário das Dunas, Múmia Enfaixada, Carpideira, Soterrado → Centurião Ossudo, Múmia Real, Escriba das Areias → Colosso Cantante |
| 🌳 Bosque Velho | 5 ★★★★★☆ | 8 min | 96×128, em pé: mata fechada com clareiras ligadas por trilhas, 7 zonas, 5 campinas, um riacho com pontes e o círculo de menires | Galhudo, Lobo Atroz, Espinheiro, Sátiro Flautista, Pantera das Sombras, Urso-coruja → Dríade Corrompida, Centauro Renegado, Guardião do Menir → Dragão Verde Jovem |
| 🍄 Coração da Mata | 6 ★★★★★★ | 8 min | 96×128, em pé: a mesma mata, mais fechada, com lagoas escuras, santuários élficos e a árvore do coração | Fungóide, Javali-Espinho, Cipó Estrangulador, Cervo Corrompido, Sombra Élfica, Pantera das Sombras, Urso-coruja → Árvore Desperta, Guardião Élfico Caído, Dríade Corrompida → Rei Galhado |
| 🪨 Mesas de Solária | 6 ★★★★★★ | 8 min | 96×128, em pé: 4 cânions entre platôs de arenito, 7 zonas, 5 campinas, casas escavadas na rocha e o anfiteatro dos platôs | os mesmos comuns e mini-bosses das Dunas, mais fundos e em bandos maiores → Faraó Eterno |
| 🏛️ Portões do Império | 6 ★★★★★★ (provisório) | 8 min | 84×124 de superfície, em pé: via dos túmulos, muralha com o portão e 2 brechas, cidade em ruínas com 6 zonas, 5 campinas e até 4 casas + ruína subterrânea (vestíbulo, galeria, santuário e tesouro) | ainda sem monstros (só o terreno) |
| 🌫️ Charco Cinzento | 8 ★★★★★★★★ | 8 min | 64×120, mapa fixo, em pé: a estrada afundada com 2 laços (passarelas da Lagoa ou Mata Queimada; Torre de Vigia ou Palafitas) até a ilha do lago negro | Sanguessuga Gigante, Corvo Carniceiro, Turfeiro Afogado, Lanterneiro, Lodo de Cinza, Espreitador da Poça → Bruxa Cinzenta, Monólito Desperto, Cavaleiro Afogado → Morgrana, a Rainha Afogada (~120 monstros por hunt) |
| 🦴 Ermos Rubros | 8 ★★★★★★★★ | 8 min | 64×120, mapa fixo, em pé: desfiladeiro, a bifurcação da mina e do campo das torres, 2 ravinas com pontes, as ossadas e a cratera do crânio | Escaravelho de Ferrugem, Hiena dos Ermos, Saqueador Rubro, Mineiro Perdido, Lagarto-Couraça, Redemoinho de Ferrugem → Capataz Morto, Golem de Minério, Mãe-Hiena → Kragmor, o Gigante da Cratera (~105 monstros por hunt) |
| ⚔️ Fortaleza Orc | 8 ★★★★★★★★ | 8 min | 84×128, mapa fixo, em pé: vila baixa, desfiladeiro com 2 pontes, pátio externo com acampamentos, muralha interna, esporão e torre de menagem | o clã do Pântano do Kosaradius bem mais forte (×2,4 os comuns, ×2,5 os mini-bosses; ~130 monstros por hunt, 40% a mais que nas Mesas) e em bandos que lotam as salas: Orc batedor, Orc do Brejo, Orc lanceiro, Orc arqueiro, Orc xamã, Orc berserker, Orc capitão, Ogro jovem → Ogro do Brejo, Chefe de Guerra Orc, Ogro Xamã → Vorgak, o Senhor da Brasa |
| 🐸 Pântano do Kosaradius | 1 ★☆ | 10 min, só 1 jogador | 128×128, o maior: floresta alagada com 9 zonas, 14 campinas, 10–15 clareiras de mini-boss e a clareira do boss | Orc batedor, Orc do Brejo, Orc lanceiro, Orc arqueiro, Orc xamã, Orc berserker, Orc capitão, Ogro jovem → Ogro do Brejo, Ogro Xamã, Chefe de Guerra Orc → Grumak, o Rei-Ogro |

Os monstros de cada mapa (encontros, rodízio de mini-bosses e bosses, Mímicos) estão em "Bestiário".

### Cripta

- **Visual** (só no cliente, `apps/client/src/cryptMap.ts` e a arte em `art/cryptArt.ts`; não muda a jogabilidade):
  **sempre na arte nova** (128 px por tile, por código, `docs/CENARIOS_PLANO.md`): lajes com bisel e juntas com musgo,
  paredes de tijolos com tampo, tochas animadas nas paredes com poça de luz quente tremulando no chão, candelabros acesos, estandartes rasgados,
  correntes, nichos com caveira, rachaduras e teias nas paredes; sombra ao pé das paredes e manchas de luz e sujeira
  no chão e nos tampos; ossos, entulho, cacos, poças e teias nos cantos; barris, caixotes e sacos na entrada, urnas,
  pilhas de ossos e caixões nas salas; marcas de queimado, sangue e ossada no covil do dragão; poeira flutuando e
  cantos da tela escurecidos. Como no pântano, só os sprites perto da câmera são desenhados.

### Pântano das Ruínas

- **Campo aberto, sem caminho único:** o mapa nasce todo andável (só a borda é mata fechada, com a espessura
  ondulando devagar) e recebe por cima bosques de vários tamanhos, árvores soltas, lagoas alongadas (às vezes com
  uma poça colada) e os restos do império. Todo obstáculo que fecharia a passagem até uma zona, baú ou boss é
  descartado, então a equipe pode ir para qualquer região e contornar tudo.
- **Dificuldade em arco:** 7 zonas de monstros vão da entrada até as ruínas do centro, cada uma mais forte;
  5 campinas espalhadas têm alguns monstros extras.
- Lagoas e poças: **a água bloqueia o passo, mas não a visão**. Flechas, magias e o ataque de alcance 2 da Hidra passam por cima.
- Ruínas: salas laterais cercadas por muros caídos com 2 portões (Troll + baú), a arena do boss no centro (um
  quadrado de muros com 4 portões e 4 colunas) e, pelo campo, 13 restos de construção: trechos de muro, cantos em L,
  colunatas (colunas a cada 2 tiles, umas já caídas) e alicerces de casa com a porta aberta, além de colunas soltas.
  Muro e coluna bloqueiam passo e visão.
- **Visual** (só no cliente, `apps/client/src/swampMap.ts`; não muda a jogabilidade): **sempre na arte nova** (128 px
  por tile, por código, `docs/CENARIOS_PLANO.md`). A natureza é a mata alagada do Pântano do Kosaradius (variante
  `swamp` de `forestPlan.ts` e `art/forestArt.ts`) na paleta da Baía Afundada: verde-oliva mais aberto e claro, água
  verde-azulada parada com lentilha-d'água e nenúfares, íris amarela, sem passarelas. As árvores soltas são
  as mesmas 4 espécies (cipreste, mangue, salgueiro e morta), algumas dentro d'água. As ruínas são o que resta do
  império afundado: as peças dos Portões do Império (`art/swampArt.ts`, que pinta `empireArt.ts` e `empireMonuments.ts`
  noutra paleta: calcário cinza-esverdeado, musgo e hera, o tijolo e o reboco lavados até o tom da pedra):
  - **Lajes** (calçamento que fecha a cada 2×2 tiles) nas salas laterais, na arena (com uma beirada irregular em volta)
    e em volta dos restos de muro pelo campo, com o capim invadindo a beira; rachaduras, cacos, tesselas, inscrições,
    poças, ervas, ossos e caveira por cima, mais no pé dos muros.
  - **Muros:** pedra ligada a outra é trecho de muro montado pelos vizinhos, com tampo de musgo, face de blocos, hera e
    a ponta solta desmoronando; a altura muda por trecho, com degraus.
  - **Colunas:** pedra sozinha é coluna inteira (jônica ou coríntia) na arena, quebrada nas salas e, pelo campo,
    quebrada, toco ou um monte de blocos. Na água perto das ruínas, blocos meio afundados e tocos de coluna.
  - **De pé nas lajes:** cabeças de estátua, urnas, ânforas e acanto.
  - **Arena:** no meio, o mosaico do sol do império em tesselas (11×9 tiles), gasto, com tesselas faltando.
  - **Ambiente:** vaga-lumes, névoa baixa e folhas caindo da beira da mata. Só os sprites perto da câmera são
    desenhados.
- Mais difícil: espécies com mais vida e dano que as da cripta, mais salas e salas fundas mais cheias (o orçamento de
  monstros cresce 12% por sala).
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
- **Verme da Areia** (boss): engole quem fica colado (Engolir: controle de 1,8 s com dano por segundo) e, abaixo de metade da vida, faz o chão
  tremer em volta (Tremor, deixa lento). Vulnerável a gelo, resiste a fogo.
- **Balanceamento:** o caminho rende um pouco mais de XP que a Cripta (cerca de 36 monstros e 2.700 XP, contra 21 e
  1.700), então a equipe chega na caverna perto do nível 6 a 8. O Verme tem a vida do Dragão jovem (~1.340, já na
  ficha: o boss não cresce com a profundidade) e, no simulador de duelo (herói nível 6 sozinho, só ataque básico),
  derruba o herói entre o Ogro e o Dragão (6,5 a 9,7 s). Os comuns ficam no nível dos da Cripta: Escorpião como a
  Ratazana, Abutre como o Goblin, Múmia como o Orc.
- **Campo aberto, como o pântano:** dunas altas na borda e, por cima, cristas de duna compridas no sentido do
  vento, oásis (lagoas com coqueiros na margem), bosques de coqueiros e coqueiros soltos. Obstáculo que fecharia a
  passagem até uma zona ou ao centro é descartado. **Coqueiro** é um tile de mata sem mata nos 4 lados; mata
  encostada em mata é **duna** (o cliente desenha cada um por essa regra). Os dois bloqueiam passo e visão; a água
  do oásis bloqueia só o passo.
- **Visual** (só no cliente, `apps/client/src/desertMap.ts`; o verme em `art/sandWorm.ts`): **sempre na arte nova**
  (128 px por tile, por código, `docs/CENARIOS_PLANO.md`). A superfície é a variante `desert` do desenho das Dunas
  (`dunesMap.ts`, `art/duneArt.ts`), em areia dourada mais quente que a das Dunas: areia com ondulações de vento, dunas
  soltas com encosta iluminada, encosta na sombra e crista, sombra na areia baixa; oásis turquesa com água rasa e
  funda, espuma e areia molhada na margem, juncos; coqueiros com copa que balança e fica transparente com o jogador
  embaixo; ruínas soterradas (muros de arenito meio cobertos de areia, tocos de coluna, ânforas); arbustos secos,
  pedras, costelas, crânio, conchas, rastro de cobra e pegadas; grãos de areia levados pelo vento. A caverna: o monte
  de pedras com a boca escura na superfície e o subterrâneo inteiro na arte das cavernas (`cavernMap.ts`,
  `cavePlan.ts`, `art/caveArt.ts`, paleta `desert`): rocha com paredão em camadas, chão de pedra sem emenda, sulcos e
  pele trocada do verme no covil, ossos, estalagmites, cristais âmbar que brilham, o salão dos baús com o chão gasto, a
  luz e a corda da saída; sem vento, fundo e cantos da tela bem escuros, e a câmera corta (com um clarão) ao passar
  pela caverna. Só os sprites perto da câmera são desenhados.

### Dunas Cantantes e Mesas de Solária (terreno)

O lado do deserto da bifurcação da Travessia (etapas 6 e 7 da campanha): as Dunas abrem com um boss da Caverna da
Travessia e as Mesas com o Colosso Cantante. Os dois mapas usam o mesmo gerador (`generateDunes` em `dungeon.ts`), cada
um com a sua variante, e a mesma Necrópole de Solária (ver "Bestiário"): dificuldade 5 nas Dunas e 6 nas Mesas, o
mapa mais difícil do jogo. 8 min, até 4 jogadores.

- **Em pé, como o celular:** 96×128. A entrada fica na planície do sul e a **arena do boss** na bacia do norte, onde os
  vales se encontram (círculo aberto com um aro de duna ou de rocha aberto para o sul).
- **Vales entre cordilheiras:** 3 cordilheiras compridas, no sentido do vento (norte-sul), serpenteando, separam 4
  vales. Cada cordilheira tem 2 (às vezes 3) **selas** de areia firme (nas Mesas, **cânions** estreitos de 3 tiles) que
  ligam um vale ao outro. As 7 zonas sobem do sul ao norte trocando de vale a cada zona, então a rota sempre cruza
  alguma sela e a equipe escolhe por qual. Obstáculo que fecharia a passagem até uma zona, campina, sala ou a arena é
  descartado; sala lateral que fecharia um vale sai.
- **Areia fofa** (`Tile.Sand`): andável e não tapa a visão, mas quem pisa nela (herói, monstro, invocação que não voa)
  anda a 65% da velocidade (`SAND_SPEED`; o passo que entra nela demora mais). Cobre o pé das cordilheiras (faixa de
  largura ondulante) e manchas compridas no fundo dos vales; selas, entrada, arena, ruínas e oásis ficam firmes. Nas
  Dunas é farta (~2.100 tiles por mapa); nas Mesas, pouca (~750, só onde a areia escorreu). Teste: `areia.ts`.
- **Dunas Cantantes:** cordilheiras de duna (mais grossas a oeste, onde o vento empilha), barcanas (dunas pequenas em
  meia-lua) nos vales, oásis com coqueiros na margem (no máximo um por vale), coqueiros soltos, **ruínas soterradas**
  (muro de arenito com falhas e 2 portões) e, na arena, o círculo de 7 **pedras cantantes** (menires de ruína).
- **Mesas de Solária:** platôs de arenito de beira reta em degraus, morros-testemunho soltos nos vales, poços (oásis
  pequenos), pilares de rocha, **casas escavadas na rocha** (muro inteiro, 2 portas cavadas na encosta) e, na arena, 4
  pilares de pedra.
- **Regra de desenho:** mata sem mata nos 4 lados é coqueiro (nas Dunas sempre; nas Mesas, perto da água) ou pilar de
  rocha; mata encostada em mata é duna ou platô; ruína sem ruína nos 4 lados é pedra cantante. Os dois bloqueiam passo e
  visão; a água, só o passo.
- **Visual** (só no cliente, `apps/client/src/dunesMap.ts` e `art/duneArt.ts`): **sempre na arte nova** (128 px por
  tile, `docs/ARTE_TIBIA.md`), com ou sem a opção Arte nova (beta); os heróis e monstros seguem a opção de cada um.
  Um atlas só com os quadros que o mapa usa (cerca de 180 a 240), cada um pintado pixel a pixel na primeira vez: areia
  firme com ondulações do vento, areia fofa em montinhos com covas de pisada (e a beira entrando na firme), sal rachado
  ou laje na arena; **dunas pelo relevo** (altura nos 4 cantos de cada tile, encosta oeste iluminada, sotavento leste
  íngreme e na sombra com areia escorrendo, fio de luz na crista, ondulações seguindo a curva de nível); **platôs** com
  tampo de rocha rachado, borda clara a norte e oeste, e o **paredão** em camadas de sedimento na face sul, com fendas
  e entulho no pé; muros de arenito com areia empilhada no lado do vento ou de taipa; água do oásis funda no meio, rasa
  e clara na margem, com espuma e areia molhada em volta; sombra do relevo no chão a leste e ao sul. De pé: coqueiros
  em 4 formas (tronco curvo de anéis, copa de folhas penadas com cocos e folha seca; a copa balança e fica
  transparente sobre o jogador), pedras cantantes furadas pelo vento com glifos que acendem e soltam uma onda no auge
  do canto, pilares de arenito com pedra-chapéu, arbustos secos, pedras, costelas, ânforas, colunas quebradas, juncos,
  babosas e marcos de pedra; enfeites rasteiros (crânio de boi, conchas, rastro de cobra, pegadas, capim seco, cacos,
  barro rachado). Ambiente: grãos levados pelo vento norte, fitas de areia soprando das cristas, brilho do sol na água.
  Pintar o atlas leva ~1,3 s num computador (mais no celular), na entrada da hunt.
- **Loot:** teto da hunt solo 3.300 nas Dunas e 3.800 nas Mesas, cheio em 240 s.

### Bosque Velho e Coração da Mata

O lado da floresta da bifurcação da Travessia (etapas 6 e 7 da campanha): o Bosque Velho abre com o Basilisco (o
boss do covil oeste da Caverna da Travessia) e o Coração da Mata com o boss do Bosque Velho. Os dois mapas usam o mesmo gerador (`generateForest` em
`dungeon.ts`), cada um com a sua variante: dificuldade 5 e 6, 8 min, até 4 jogadores. Os
monstros dos dois estão em "Bestiário".

- **Em pé, como o celular:** 96×128. O mapa nasce todo de mata fechada e recebe **clareiras ligadas por trilhas**: a
  entrada na clareira do sul, a **arena do boss** na do norte (círculo aberto, a mata em volta) e, entre elas, as 7
  zonas subindo do sul ao norte, trocando de lado (3 colunas), 5 campinas e ~9 clareirinhas de passagem. Cada zona se
  liga à seguinte por uma trilha que serpenteia e, às vezes, a uma mais longe (atalho); cada campina e clareirinha, às
  1 ou 2 mais perto: há sempre mais de um caminho. Mata fina (faixa de 1 tile) vira chão, então a mata fica em maciços.
  A mata bloqueia passo e visão: só se vê a clareira e a trilha onde se está.
- **Trilha batida** (`Dungeon.trails`): o meio de cada trilha, chão comum; o cliente desenha a terra.
- **Bosque Velho:** trilhas mais largas, um **riacho** que corta o mapa de oeste a leste no terço do meio (2 a 3 tiles,
  bloqueia o passo e não a visão) com uma **ponte de madeira** de 3 tiles onde cada trilha o cruza (`Dungeon.planks`),
  duas lagoas pequenas, **troncos caídos** nas clareiras e as salas laterais cercadas de troncos; na arena, um círculo de
  6 **menires**.
- **Coração da Mata:** mais fechado: trilhas estreitas, quase o dobro de **árvores anciãs**, 4 a 6 **lagoas escuras** na
  beira das clareiras, pedaços de muro élfico e as salas laterais como **santuários élficos** (muro de pedra inteiro, 2
  portões); no alto da arena, a **árvore do coração** (bloco de 3×3) e 4 menires.
- **Salas laterais** (mini-boss e baú): ao lado de uma zona (7 a 9 tiles), 2 portões, cada um com a sua trilha (um até a
  zona, outro até a clareira mais perto). Sala que fecharia a passagem sai.
- **Regra de desenho:** mata sem mata nos 4 lados é **árvore solta**; bloco de 2×2 sem mata encostada é **árvore
  anciã**; a mata dentro da arena do Coração da Mata é a **árvore do coração**; o resto é **mata fechada**. Ruína sem
  ruína nos 4 lados é pedra musgosa (na arena, menir); ruína encostada em ruína é tronco caído (Bosque Velho) ou muro
  élfico (Coração da Mata).
- **Visual** (só no cliente, `apps/client/src/forestMap.ts`, o plano em `forestPlan.ts` e a arte em `art/forestArt.ts`,
  com o pintor do padrão novo em `art/paint.ts`, o mesmo das Dunas): sempre na arte nova (128 px por tile, um atlas só
  com os quadros que o mapa usa, ~300). A **mata fechada** é uma copa de tufos (esferas de folhas com luz de cima à
  esquerda, os da frente riscando os de trás) desenhada **pela distância até o chão aberto**: cada tufo entra se cabe
  antes da beira, e como a distância é a mesma vista de qualquer tile, a copa emenda sozinha em qualquer combinação de
  vizinhos; do lado sul a copa recua e mostra o sub-bosque escuro e os troncos; o miolo da mata tem 4 variações. Capim
  só com textura miúda (sem mancha que se repita) e manchas de luz pelo tint; terra da trilha, barro na margem, folhas
  secas e a sombra da mata no chão (sol do noroeste) com a beira pela mesma distância, arredondada nas quinas; riacho
  claro com seixos e correnteza ou lagoa escura com nenúfar; ponte de tábuas com corrimão; troncos caídos com musgo e o
  corte com os anéis; muro élfico com runa que brilha. De pé: árvores soltas de 4 espécies por variante (carvalho,
  faia, bétula e pinheiro; no Coração, ancião retorcido, salgueiro, cogumelo gigante e árvore morta), anciãs com
  sapopemas e oco, a árvore do coração com o coração de seiva pulsando, pedras e menires (a espiral acende), e
  enfeites (samambaia, arbusto, capim alto, cogumelos, toco, dedaleira, amoreira, pedras); no chão, folhas, gravetos,
  trevos, flores, pinhas, raízes, pegadas e o círculo de cogumelos na arena do Bosque Velho. As copas balançam e ficam
  transparentes sobre o jogador. Ambiente: ciscos de luz (no Coração, vaga-lumes frios), folhas caindo da beira da
  mata, fachos de sol nas clareiras. Pintar tudo leva ~1,5 s num computador (mais no celular), na entrada da hunt.
  Sem faixa de sombra nem folhas em fila na beira da mata, sem tinta por tile (capim e trilha em tom liso, contínuos
  em blocos de 4×4 tiles) e poucos enfeites rasteiros: o chão não mostra a grade dos tiles.
- **Loot:** teto da hunt solo de 3.200 no Bosque Velho e de 3.800 no Coração da Mata, cheio em 240 s nos dois.

### Mapas fixos (regra para todo mapa novo)

Decisão de 01/11: mapa novo é **fixo** (a mesma planta em toda hunt, como a Fortaleza Orc), para controlar quanto o
herói anda sem lutar. Nos mapas sorteados e abertos, de 40% a 55% do chão andável ficava a mais de 6 tiles de qualquer
luta (Dunas 52%, Mesas 55%; a Cripta, 8%) e havia pontos a até 55 s de andada do inimigo mais perto. Regras:

- **Área contida:** cerca de 64×120 tiles e ~2.800 tiles andáveis em 8 min.
- **Regra dos 6 tiles** (teste `ritmo`): no máximo 10% do chão andável a mais de 6 tiles (o alcance de aggro) de uma
  luta (zona, emboscada, sala lateral, arena; a entrada conta como chegada) e nenhum ponto a mais de 15 tiles (~5 s).
- **Uma luta a cada ~18 tiles** em todo caminho, nos dois lados de cada bifurcação; as **emboscadas** são as campinas
  (`meadows`, a tabela da zona mais perto), então o servidor e o spawn não mudam.
- **Nenhum beco sem recompensa:** todo desvio termina numa sala lateral (mini-boss e baú).
- **Laços em vez de labirinto:** espinha central com 2 laços que se reencontram.
- **Sensação de mapa aberto:** caminhos largos (8–10 tiles) e de beira ondulada, áreas que emendam umas nas outras e
  bordas que deixam ver longe (água e ravina bloqueiam o passo, não a visão); parede só onde o desenho pede.

### Charco Cinzento e Ermos Rubros

A etapa 9 da campanha, a segunda bifurcação: os dois lados abrem com **Vorgak**, o boss da Fortaleza Orc (`unlockedBy`,
no banco `map_unlocked_by`). ★★★★★★★★, 8 min, até 4 jogadores. Os dois têm os monstros (ver "Bestiário"; teto da
hunt solo 4.600, cheio em 240 s). Os dois são **mapas fixos**
(`BOG_SEED`, `BADLANDS_SEED`), em pé, 64×120, com 7 zonas, as emboscadas e 4 salas laterais; plantas em
`docs/arte/planta-fixa-*.png`. Ritmo medido: ~1% do chão a mais de 6 tiles de luta, ponto mais isolado a 13 tiles.

- **🌫️ Charco Cinzento** (`generateBog`, a planta em `Dungeon.bog`): uma turfeira sobre o lago negro. Do sul ao norte:
  o Cais, o Aterro (zona 1) e a Vila dos Turfeiros (zona 2) pela **estrada afundada** (aterro largo com as lajes de
  basalto no miolo); o **1º laço**, a oeste pelas **passarelas** da Lagoa (zonas 3 e 4, terreiro T1) e a leste pela
  trilha da **Mata Queimada** (2 emboscadas, terreiro T2), que se reencontram na Ponte do Meio; a **Turfeira das
  Cinzas** (zona 5, terreiro T3); o **2º laço**, a oeste pela estrada da Torre de Vigia (zona 6) e a leste pelas
  passarelas das **Palafitas** (terreiro T4); o Portão dos Monólitos (zona 7) e a **ilha da arena** (praça de lajes,
  círculo entalhado, 6 monólitos, 4 braseiros). 10 emboscadas nas plataformas e nos trechos entre as zonas.
- **🦴 Ermos Rubros** (`generateBadlands`, a planta em `Dungeon.badlands`): vales largos de barro vermelho entre platôs de
  rocha. O Acampamento, o **Desfiladeiro Sul** (a única garganta estreita, zonas 1 e 2), a Encruzilhada da Torre
  (zona 3); a bifurcação, a oeste pelo **Pátio da Mina** (zona 4, trilhos, vagoneta e a boca da mina, posto P1) e a leste
  pelo **Campo das Torres** (2 emboscadas, posto P2); a Cabeceira da Ponte (zona 5) e a **Ponte Grande** sobre a
  ravina; o **Planalto das Ossadas** (zona 6, a luta entre as costelas, postos P3 e P4); a segunda ravina pela **ponte
  de cordas** da Salina ou pelo **arco** do leste; a Escadaria (zona 7) e a **cratera do crânio**. 7 emboscadas.
- **Visual** (só no cliente; arte em `art/bogArt.ts` e `art/badlandsArt.ts`, plano em `bogPlan.ts`/`badlandsPlan.ts`,
  desenho em `bogMap.ts`/`badlandsMap.ts`; 128 px por tile, pintor de `art/paint.ts`, 3 atlas por mapa, todos abaixo de
  2.000 px de altura). O chão é contínuo em blocos de 4×4 tiles (o barro rachado são placas de Worley que fecham no
  bloco); as manchas (urze, capim seco e cinza no Charco; areia com marolas, crosta de sal e cascalho nos Ermos) são
  decididas no mapa inteiro e desenhadas com a beira recortada pela distância aos vizinhos, como a lama e o rastro das
  carroças: nada repete nem mostra a grade. O tom do chão plano fica no meio de uma faixa (sem o pontilhado que vira
  trama na tela). **Charco:** poças com a margem de turfa, o capim debruçado e os reflexos do céu; a mata morta é um
  maciço de troncos secos em pé (4 campos de troncos em blocos de 2×2, para não alinharem em colunas); árvores secas
  de pé (uma com o corvo, outra com a lanterna verde dos turfeiros), barba-de-velho, monólitos com a espiral que
  brilha, palafitas com telhado de junco, paliçadas com crânios e trapos, braseiros, taboas, algodão-do-brejo, leivas,
  ossadas. Ambiente: névoa baixa andando, cinza caindo, fogos-fátuos sobre as poças. **Ermos:** cristas com o platô
  em lajes e o paredão em camadas (ferrugem, ocre e creme, a capa de basalto); ravinas com a parede de longe em camadas
  e o fundo escuro; pontes de corda, torres de pedra, costelas, o crânio com as órbitas em brasa, muros de adobe, a boca
  da mina escorada com a lanterna, artemísia, espinheiro, agave, totem de crânio, fontes de ferrugem. Ambiente: poeira
  vermelha e rajadas de vento, macegas rolando, fagulhas subindo da cratera.

### Portões do Império (terreno, fora da campanha)

**Saiu da campanha em 01/11:** a Fortaleza Orc ocupa o ponto dele no mapa mundi (etapa 8). O mapa continua no código
(gerador, arte, prévia), mas não abre para ninguém (`WORLD_ORDER` e `map_unlocked` no banco).

A etapa 8 da campanha, na área Ruínas do Império (abre com o Faraó Eterno, das Mesas de Solária), e a bifurcação para o
Charco Cinzento ou os Ermos Rubros. Por enquanto só o terreno e a arte: sem monstros nem boss (`encounters`, `bosses`
vazios), ★★★★★★ provisório, 8 min, até 4 jogadores. Gerador `generateGates` em `dungeon.ts`; a planta vai em
`Dungeon.empire` (ruas, praças, muralha, portão, torres, fachada, estátuas, mausoléus, colunas, salas de baixo), que só
o desenho lê.

- **Em pé, como o celular:** superfície de 84×124 e, colada à direita na mesma grade, a ruína subterrânea (44 de
  largura), como o subterrâneo do Mar de Areia.
- **Fora da muralha (sul):** a entrada e a **via dos túmulos**: a estrada calçada sobe da entrada até o portão, com
  **mausoléus** (2×2: túmulo-templo, altar funerário com urna, túmulo de telhado caído) e ciprestes dos dois lados.
- **Muralha:** 2 tiles de pedra de lado a lado, o **portão** (5 de vão) entre duas **torres** (3×4) e 2 **brechas**
  desmoronadas (3 a 4 tiles), então a equipe escolhe por onde entrar.
- **Cidade em ruínas:** a avenida calçada sobe do portão ao **fórum** (praça de travertino com a fonte e a estátua do
  imperador, colunata falhada em volta), ruas transversais cortam os bairros (a de baixo, perto da muralha, e a do
  fórum, de lado a lado), uma rua de cada lado liga as duas, colunatas na avenida, **casas em ruínas** (salas laterais:
  muro com falhas e 2 portas), restos de muro, cantos e alicerces, cisternas, moitas e bosques de ciprestes e
  pinheiros-mansos. 6 zonas do caminho (a via, a praça do portão, o bairro baixo, o fórum, a avenida do norte e o pátio
  do templo) e 5 campinas.
- **Recinto do templo (norte):** pátio de mármore com colunata dos lados e muro baixo, os 2 **guardiões de bronze** e a
  **fachada do templo afundado** (9×4 de ruína) com a **escadaria** no meio da linha de baixo (`Tile.Cave`): pisar
  nela desce para a ruína subterrânea (a câmera corta, como na caverna do deserto).
- **Ruína subterrânea:** construída em pedra (salas retas, não caverna), de baixo para cima: o **vestíbulo** com a
  escada de volta, o corredor das catacumbas (com um ossário), a **galeria das colunas** (duas fileiras de pilares,
  alguns caídos, e um ossário de cada lado), outro corredor e o **santuário do boss** (19×15, pilares na volta e o
  mosaico no chão); atrás dele, o **tesouro**, onde abre o portal do boss (e os 4 lugares de baú, para quando houver
  runas). 2 zonas embaixo (vestíbulo e galeria), depois das 6 de cima.
- **Regra de desenho:** mata de 1 tile é árvore (cipreste ou pinheiro-manso), mata encostada em mata é moita; ruína de 1
  tile é coluna (as postas), estátua (nos lugares marcados) ou bloco caído; ruína encostada em ruína é muro. Embaixo,
  mata de 1 tile é pilar e ruína é sarcófago (nos ossários) ou entulho.
- **Visual** (só no cliente, `apps/client/src/gatesMap.ts`, `art/empireArt.ts` e `art/empireMonuments.ts`): **sempre na
  arte nova** (128 px por tile, `docs/ARTE_TIBIA.md`), com o papel das Dunas e paleta própria. Chão: capim mediterrâneo
  em tufos, papoulas e margaridas; via de basalto em pedras poligonais com capim nas juntas; praça de travertino em
  lajes desencontradas; pátio de mármore com losangos de pórfiro; tanques de fonte com borda de mármore; capim
  entrando no calçamento e sombra das moitas e monumentos. De pé: **muros com volume** (tampo de pedras na argamassa
  com musgo, face de tufo com fiadas de tijolo, buracos de andaime, restos de afresco vermelho, hera, a ponta solta
  desmoronando; a altura muda por trecho), a muralha com ameias e seteiras, as **torres** com o estandarte rasgado da
  águia, o **arco do portão** (tímpanos, aduelas, a abóbada em sombra, as Vitórias aladas, o ático com IMPERIVM · KVSA
  e a passagem com ameias por cima, quebrado do lado leste; fica transparente com o herói embaixo), colunas jônicas,
  coríntias, quebradas e tocos, blocos caídos, mausoléus, os guardiões e o imperador, ciprestes e pinheiros-mansos (a
  copa fica transparente sobre o herói). **A entrada da ruína:** o pórtico do templo afundado com seis colunas
  coríntias (a quinta quebrada, tambores caídos no degrau), a parede da cela em sombra com a sombra de cada coluna, a
  grande porta de moldura de mármore com uma folha de bronze caída e o sol de ouro na verga, a escadaria descendo para o
  escuro entre parapeitos com cabeças de leão, dois braseiros de bronze acesos, o friso com IMPERIVM · KVSA, o frontão
  com a águia entre ramos de louro (o canto leste desabou), hera e uma figueira brotando; luz violeta respirando na porta
  e névoa saindo da escadaria. Embaixo: lajes escuras, muros de cantaria com nichos de ossário, placas e tochas acesas,
  pilares com o começo da abóbada, sarcófagos, entulho, urnas e caveiras, o **mosaico do santuário** (grega, sol de
  raios dourados e vermelhos e a águia no medalhão de lápis-lazúli) e a luz do dia descendo pela escada de volta; fundo
  e cantos da tela escuros. A fachada e o mosaico, as pinturas maiores, saem nos primeiros quadros da hunt (ficam longe
  da entrada). Ambiente: ciscos dourados na luz, chamas e tochas tremendo, brilho do sol nos tanques.

### Fortaleza Orc

Nas Ruínas do Império, a etapa 8 da campanha, no ponto que era dos Portões do Império (abre com o Faraó Eterno; daqui a
trilha se divide para o Charco Cinzento e os Ermos Rubros). Um castelo
do império tomado pelos orcs, no alto de um esporão de rocha. **Dificuldade 8 (★★★★★★★★), o mapa mais difícil do
jogo**, 8 min, até 4 jogadores. **Mapa fixo:** é sempre a mesma planta, qualquer que seja a seed da sala
(`generateFortress` em `dungeon.ts`, sempre com `FORTRESS_SEED`); a planta vai em `Dungeon.fortress`, que só o desenho
lê.

- **Em pé, de baixo para cima:** a **vila baixa** em ruínas (entrada, estrada e travessas de basalto, casas caídas,
  ciprestes, uma casa com mini-boss e baú), o **desfiladeiro** de lado a lado (7 linhas), a **muralha externa** na
  beira dele com o portão entre duas torres, o **pátio externo** fechado por muralhas (dos lados e na beira do
  precipício, com uma torre em cada canto; a mata fica do lado de fora) e virado acampamento (tendas, fogueiras, paliçadas,
  totens de caveira, estandartes, 3 casernas com mini-boss e baú), a **muralha interna** com o segundo portão, e o
  **esporão**: o pátio de lajes com colunata, o parapeito caído na beira do precipício, a guarda do chefe e, no norte, a
  **torre de menagem** (19×15, com torreões nos cantos do terraço), cujo salão
  do trono é a sala do boss. Dos dois lados do esporão e atrás da torre, o precipício.
- **Monstros:** o quartel do clã do Rei-Ogro. São as espécies do Pântano do Kosaradius (mesma arte), com força fixa
  do mapa bem maior (`commonPower` 2,4 e `minibossPower` 2,5: vida, dano, XP e loot), em quantidade
  massiva: orçamento de 320 a 1000 por zona (as salas chegam ao teto de `MAX_ROOM_MONSTERS`), 8 monstros por campina e
  60% das campinas com um mini-boss solto: cerca de 130 monstros por hunt (40% a mais que nas Mesas de Solária). A vila tem batedores e guerreiros; o desfiladeiro, lanceiros, arqueiros
  e os primeiros berserkers; o acampamento, capitães, xamãs e ogros jovens; o esporão e o pé da torre são de ogros e
  berserkers. Mini-bosses: Ogro do Brejo, Chefe de Guerra Orc e Ogro Xamã (casernas e casa da vila, com baú). Boss:
  **Vorgak, o Senhor da Brasa**, no salão do trono (ficha no Bestiário, seção da Fortaleza). O gold de cada monstro cresce com a força; com tanto monstro, os drops de item e poção saem menos (`dropScale` 0,8).
- **Duas travessias:** a ponte de pedra (3 de largura) até o portão, ou a ponte de cordas dos orcs (2 de largura) até
  uma brecha da muralha.
- **Abismo:** nesse mapa toda `Tile.Water` é abismo: bloqueia o passo e deixa passar a visão (flechas e magias passam
  por cima). 6 zonas no caminho (vila, cabeça da ponte, pátio do portão, acampamento de cima, pátio interno, pé da
  torre) e 5 campinas.
- **Andares (como no Tibia, só no desenho):** cada andar é uma camada, desenhada do mais fundo para o mais alto e
  deslocada pela altura, na projeção do Kusa (a altura sobe na tela): o **vale**, um andar abaixo (`DROP` = 2 tiles),
  aparece pelo abismo, escurecido, com névoa e paralaxe (anda mais devagar que o castelo); o **paredão** de rocha desce
  da beirada até ele; e os **andares de cima** (o terraço da torre de menagem com parapeito, o buraco do telhado, a
  fogueira e o estandarte, mais a fachada sul; os telhados das casernas) ficam deslocados para o norte pela altura do
  que está embaixo e **somem quando o herói entra** (a posição vem de quem a câmera segue). Torres e arcos ficam
  transparentes com o herói atrás.
- **Visual** (só no cliente, `apps/client/src/fortressMap.ts` e `art/fortressArt.ts`, com as peças de
  `art/empireArt.ts` e `art/empireMonuments.ts`): 128 px por tile. Chão: capim, basalto, terra batida com pegadas e
  palha, lajes grandes no pátio e no terraço, o calçamento antigo quebrado (capim nas falhas) nos pátios e nas ruas da
  vila, o piso do salão; tendas de couro em gomos com a mão vermelha, paliçadas,
  totens, o trono de pedra com peles, cavaletes de armas, caldeirões, lenha e ossos; as torres e o arco IMPERIVM · KVSA
  dos Portões com os panos pretos do clã.

### Caverna da Travessia

- **Onde:** nos Campos de Kusa, na etapa 5 da campanha de Verdemar (o ponto que era a Encruzilhada), logo depois do
  Pântano das Ruínas: túneis por baixo dos campos, onde a trilha se divide entre a floresta e o deserto. **Dificuldade 4 (★★★★), o mapa mais difícil do jogo**, 10 min, até 4 jogadores.
- **Toda subterrânea, com o celular na vertical** (`generateCavern` em `dungeon.ts`): a câmara de chegada (com o
  portal de fuga) fica embaixo, no meio. Acima dela, o **tronco**: 2 zonas de aquecimento (todo mundo começa no
  nível 1). Dali a caverna se bifurca em dois túneis separados por uma espinha de rocha, sem passagem entre eles: o
  **oeste** sobe por 3 zonas até o covil do **Basilisco**; o **leste**, mais fundo e mais forte, por outras 3 até o
  covil do **Observador das Profundezas**. Cada túnel tem uma câmara lateral com mini-boss e baú (ou Mímico) e um
  nicho com 3 monstros extras. Poças de água escura bloqueiam o passo, não a visão; os covis têm pilares soltos.
  `path` = tronco (profundidade 0–1), oeste (2–4), leste (5–7).
- **Dois bosses, dois portais** (`MapDef.lairs`, `Dungeon.lairs`): um boss fixo por covil, sem sorteio. Matar um
  abre o portal **daquele covil** (o outro continua fechado) e avisa "O portal do covil oeste/leste se abriu!". Sair
  pelo portal oeste dá +50% do loot carregado (o bônus de sempre); pelo leste, +100%. A equipe pode vencer um, os
  dois ou fugir pela chegada. Estado: `lairsDown` (bit por covil; `bossDefeated` continua valendo "algum boss morto").
- **Crédito:** cada boss dá a runa dele uma vez por personagem, como os outros; é isso que libera o caminho daquele
  lado no mapa mundi. `RunStats.bossKills` anota os bosses mortos com o herói na hunt (telemetria).
- **Balanceamento** (medido, não estimado; refazer quando a telemetria da Caverna chegar):
  - **XP:** tronco ~400, oeste ~2.900, leste ~4.100. Matando 75% do caminho, o herói chega no Basilisco no nível
    10–11; no Observador, no 11–13 indo direto e no 14–17 fazendo o oeste antes (a rota pensada para ele).
  - **Régua:** duelo só com ataque básico (`bestiary-sim.ts`) medindo quanto da vida do boss o herói tira antes de
    cair, calibrada com a telemetria de produção: o Grumak (vencido com folga) dá ~50% no nível 10–12; o Dragão jovem
    e o Verme (vencidos por ~1 em 3) dão 15–20% no 8–10; a Hidra e o Dragão negro (0 vitórias) dão 6–7% no 10–12.
  - **Metas:** Basilisco ~15% no nível 10 (no patamar do Dragão e do Verme: difícil e vencível); Observador ~9%
    indo direto (nível 11, perto do muro) e ~12% pela rota completa (nível 14, entre o Dragão e a Hidra).
  - **Picos de dano:** nenhuma habilidade passa de ~25% do dano recebido no duelo (o Raio Desintegrador e a Mordida
    Venenosa foram suavizados para isso); o atordoamento dura no máximo 1,5 s.
- **Basilisco** (covil oeste: ~1.340 de vida): mordida que envenena às vezes, **Olhar
  Petrificante** (leque de 5 tiles que atordoa 1,5 s), **Mordida Venenosa** e, abaixo de metade da vida, **Cauda de
  Pedra** (área em volta que empurra 2 tiles). Resiste a veneno e um pouco a físico.
- **Observador das Profundezas** (covil leste: ~2.840 de vida, o boss mais forte do
  jogo): flutua e foge de quem cola (artilheiro), ataca a 3 tiles, **Raio Desintegrador** (linha de 7 tiles, 1,6×),
  **Raio Paralisante** (atordoa 1,2 s), **Raio Repulsor** (empurra 3 tiles em volta) e, ferido, **Tempestade de
  Olhares** (área que corrói). Resiste a sombra, vulnerável a luz.
- **Loot:** teto da hunt solo 3.000 (o máximo teórico fica em ~2.700), cheio depois de 240 s.
- **Visual** (só no cliente, `apps/client/src/cavernMap.ts`, o plano em `cavePlan.ts` e a arte em `art/caveArt.ts`;
  os bosses em `art/cavernBosses.ts`): **sempre na arte nova** (128 px por tile, por código, `docs/CENARIOS_PLANO.md`).
  Rocha fria e molhada: a massa funda escura e, onde o chão fica ao sul, o paredão em camadas (o das Mesas de Solária
  noutra paleta); chão de pedra com manchas grandes que correm sem emenda por blocos de 4×4 tiles, rachaduras e
  pedrinhas; sombra ao pé da rocha; poças de água escura; estalagmites (uma grande ou um grupo) e cristais azuis que
  brilham nos túneis; pele trocada, sulcos de garras e ossos no covil do Basilisco, chão limpo no do Observador;
  brilho verde e roxo nos covis, luz fraca no poço de chegada, gotas pingando do teto e cantos da tela bem escuros.

### Pântano do Kosaradius

- **Para jogar sozinho e mais fácil:** o mapa aceita 1 jogador só (`MapDef.maxParty`; bots contam), então não há
  "Criar sala" nele, só "Jogar sozinho". É o maior mapa (128×128) e o mais longo (10 min): mais monstros que os
  outros, mais níveis e um boss no fim.
- **O clã do brejo:** orcs e ogros em **9 zonas** do caminho em arco (cada uma mais cheia e com espécies mais fortes), **14 campinas** com 3
  monstros extras cada (e, em 40% delas, um mini-boss solto, sem baú), **clareiras de mini-boss com baú** (até 2 por
  zona, 10 a 15 por mapa) e **Grumak, o Rei-Ogro**, na **clareira dos ciprestes**. Os monstros são mais fracos que
  os da Cripta (a quantidade cresce 12% por zona, quase o dobro no fim): o mapa inteiro tem cerca de 145 monstros, 19
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
- **Visual** (só no cliente, `apps/client/src/marshMap.ts`; não muda a jogabilidade): **sempre na arte nova** (128 px
  por tile, por código, `docs/CENARIOS_PLANO.md`), como a variante `marsh` do desenho da mata (o plano em
  `forestPlan.ts` e a arte em `art/forestArt.ts`, os mesmos do Bosque Velho, com paleta e peças próprias). Tons de brejo:
  capim oliva, lama marrom, água turva esverdeada e parada com manchas de lentilha-d'água e nenúfares (alguns com flor),
  barro na margem. A **mata fechada** é a copa de tufos do Bosque, com o sub-bosque e os troncos aparecendo do lado sul.
  As **árvores soltas** são de 4 espécies: **cipreste-do-brejo** (pé em aba, os "joelhos" saindo do chão, copa estreita
  em andares e barba-de-velho pendurada), **mangue** (ninho de raízes-escora em arco), **salgueiro-chorão** e **árvore
  morta**; a árvore com água em 2 lados ou mais nasce dentro d'água, e em volta da clareira do boss são quase todas
  ciprestes (o anel). Tronco e copa separados; a copa balança e fica transparente com o jogador embaixo.
  O capim tem manchas grandes de luz e de musgo que correm sem emenda (blocos de 4×4 tiles, sem tinta por tile: a
  grade não aparece); a beira da mata não tem faixa de sombra nem folhas em fila, e os enfeites rasteiros são poucos.
  **Passarelas** de tábuas desiguais (algumas velhas, com
  musgo) e postes nas pontas, com a água por baixo. Os troncos caídos das clareiras dos baús são os troncos do Bosque
  (casca, musgo, anéis na ponta); a pedra solta é um toco. Enfeites de pé: taboas, juncos e íris roxa na margem;
  samambaias, plantas-jarro e cogumelos na beira da mata. Rasteiros: folhas caídas, gravetos, raízes, trevos, flores,
  musgo e, nas clareiras, ossadas; na clareira do boss, um círculo de cogumelos brancos. Ambiente: vaga-lumes amarelos
  que piscam, névoa baixa passando devagar e folhas caindo da beira da mata. Só os sprites perto da câmera são
  desenhados.

## Partida (hunt)

- Equipes de 1 a 4 jogadores: single, dupla, trio ou quarteto (o Pântano do Kosaradius é só para 1).
- A equipe nasce junta numa borda aleatória da dungeon, na sala do portal de fuga.
- **Entrada tranquila:** a até 12 tiles do portal de fuga nascem no máximo 3 monstros (mini-boss e Mímico de sala
  lateral contam), para a hunt não começar com uma sala cheia em cima da equipe.
- O limite de tempo depende do mapa (4 min na Cripta, 8 min no Pântano das Ruínas, em Dunas Cantantes, nas Mesas de Solária, nos Portões do Império e na Fortaleza Orc, 6 min no Mar de Areia, 10 min na Caverna da Travessia e no Pântano do Kosaradius). **Se o tempo acaba, o mapa desaba e todos morrem soterrados.**
- Todo mundo começa no nível 1, sem equipamento, magia ou skill.
- Matar monstros dá XP e itens dropados (ver "Itens").
- A cada nível: mais HP e mana, mais velocidade de movimento e mais dano base. Os slots de magia abrem nos níveis 3 e 6;
  os outros níveis dão uma melhoria à escolha (ver "Melhorias de nível").
- A dungeon é semi-linear: poucos monstros fracos na entrada e, conforme a equipe se aprofunda, espécies mais fortes e
  salas mais cheias. **O monstro nunca evolui na partida:** um Orc tem a mesma vida e o mesmo dano em qualquer sala.
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
| **Morte** | Perde o loot, 1 equipamento sorteado (a partir do nível 5; o mágico sai menos) e a bag | O item perdido cai no chão para os outros. As runas equipadas ficam. Pode também regredir os upgrades permanentes, para dar o peso da morte do Tibia raiz. |
| **Fuga** | Leva tudo | Basta voltar à sala inicial e ficar 1,5 s em cima do portal (um anel enche em volta do herói; sair antes zera a contagem). |
| **Dungeon concluída** | Leva tudo + bônus | Matar o boss abre um portal na sala final; como na fuga, leva quem fica 1,5 s em cima dele. |
| **Soterrado** (o tempo acabou) | Igual à morte | Conta como morte. |

## Combate (protótipo)

- O ataque básico sai enquanto o jogador segura o ⚔️ (um toque dá um golpe), no alvo que estiver no alcance da classe e com linha de visão; sem alvo travado (ou com ele fora do alcance), o servidor escolhe o monstro mais próximo ao alcance. À distância, o golpe é um tiro que pode errar (ver "Ataques e magias").
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida em partes iguais por toda a equipe que está jogando na dungeon (bots incluídos; quem morreu ou saiu fica de fora), tenha batido no monstro ou não: 100 XP com 4 heróis dão 25 a cada um. O gold (loot) do monstro, do baú e do Mímico se divide do mesmo jeito.
- **A dificuldade não depende do tamanho da equipe:** os monstros são os mesmos com 1 ou 4 heróis. Jogar em equipe é mais fácil de propósito, para estimular a equipe; nenhuma regra escala vida, dano ou quantidade de monstros pelo número de jogadores.
- **Monstros de força fixa:** vida, dano, XP e loot de cada monstro são os da ficha (`monsterStats`), em qualquer
  sala. A dificuldade sobe para o fundo de dois jeitos: as tabelas de encontro trocam por espécies mais fortes e o
  orçamento de ameaça de cada sala (e os monstros das campinas) cresce 12% por sala (`CROWD_PER_DEPTH`): mais
  monstros, e a XP e o gold totais crescem junto. Os bosses já trazem na ficha a força que tinham no fim do caminho;
  os mini-bosses e o Mímico usam um multiplicador fixo do mapa (`minibossPower`, de 1,24 na Cripta a 1,54 na Caverna,
  2,5 na Fortaleza), que não muda na partida. Um mapa também pode multiplicar os comuns (`commonPower`, só na
  Fortaleza Orc: o clã do brejo levado à dificuldade 8). Os monstros que um boss chama são os comuns do mapa (com o `commonPower` dele). Só os baús pagam mais no fundo (+12%
  de gold por sala, `CHEST_DEPTH_SCALING`), e a faixa dos itens largados ainda sobe com a profundidade. Os monstros comuns batem 20% mais forte e têm 25% mais vida que o valor da tabela; mini-bosses e bosses não. Salas laterais têm um mini-boss sorteado (ou, na Cripta, um Mímico no lugar do baú) que destranca um baú; o boss do mapa fica no centro.
- Vida regenera 2% por segundo e mana 2%; subir de nível cura tudo. Concluir pelo portal do boss dá +50% de loot.
- **Corte geral do loot** (`LOOT_SCALE`, 80%, em `packages/shared/src/maps.ts`): todos os mapas pagam 80% do gold
  dos monstros (boss incluído) e dos baús, e a chance de item dos comuns e mini-bosses cai para 80% da base (comum:
  15% → 12%). Vale por cima do corte próprio do mapa (`lootScale`, `dropScale`). Poções, os itens do boss e o item
  do baú não mudam.
- **Corte dos itens** (`ITEM_DROP_SCALE`, 60%, no mesmo arquivo): cada sorteio de item de equipamento só sai com 60%
  de chance, por cima dos outros cortes: comum 12% → 7,2%, mini-boss 60% (vezes o `dropScale` do mapa e o corte
  geral), cada um dos 2 itens do boss 60% e o item do baú (e do Mímico) 60%. Poções, runas e gold não mudam.
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
  recompõe por 1,5 s (sem ataque básico nem outra habilidade): é a janela para reagir. **Boss não tem Voo nem
  Mergulho** (tirado de todos: sumir invulnerável no meio da luta deixava o boss quase impossível); a mecânica fica nos
  comuns, como o Corvo Carniceiro. O teste `bestiario` confere.
- **Tipos de criatura e elementos:** todo dano de herói tem elemento (básico do Cavaleiro e do Paladino é físico,
  do Feiticeiro é energia, do Druida é natureza; cada magia tem o seu, em `elements.ts`). Monstros podem ser imunes (0),
  resistentes (0,5–0,8) ou vulneráveis (1,5): o aviso sobe em cinza ("Imune", "Resiste") ou amarelo ("Vulnerável!").
  Mortos-vivos e constructos não pegam veneno nem sangramento; limos não sangram; plantas são vulneráveis a fogo.
- **Efeitos nos heróis:** preso (não anda), atordoado (não anda, não ataca, não conjura nem bebe poção), engolido
  (como atordoado, e toma dano por segundo; os aliados batendo no monstro o fazem cuspir), cego (não mira além de 2
  tiles) e corroído (+8% de dano recebido por acúmulo, até 3). **Controle dura no máximo 2 s** e depois o herói fica
  **4 s imune** ao mesmo efeito.
- **Encontros sorteados:** cada sala do caminho recebe monstros sorteados da tabela da profundidade (pelo peso) até
  gastar um orçamento de ameaça (a XP da tabela, mais 12% por sala de profundidade), como o orçamento de XP do D&D.
  Enxames (Kobold, Estirge) vêm em grupo; no máximo 12 monstros, 3 artilheiros e 1 líder por sala. Tudo pela seed.
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
| **Dragão jovem** (boss) | — | imune a fogo · Multiataque (3 mordidas de 0,3×) · Sopro Infernal (leque de 6 tiles, 1,9× e queimadura) |

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
| **Rei Bullywug** (boss) | escaramuçador | arte das folhas do Runway (`docs/arte/pantano-das-ruinas/bullywug-*.png`) · Estocada (linha de 3, 1,8×, empurra) · lança de alcance 2 · abaixo de 50%: Chamado do Brejo (2 bullywugs, uma vez) · abaixo de 30%: frenesi |
| **Hidra do pântano** (boss, fora do mapa desde o Rei Bullywug) | — | Cabeças: começa com 3, cada uma morde um alvo diferente (as que sobram mordem o alvo com metade); perde uma a cada 20% de vida e, sem fogo em 6 s, nascem duas (até 5) e cura 5% · Chuva Ácida |
| **Dragão negro jovem** (boss, fora do mapa desde o Rei Bullywug) | — | resiste a natureza · Multiataque (3 mordidas de 0,3×) · Sopro Ácido (linha de 6) · Escuridão (cega 2 s em área) |

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

### Fortaleza Orc (★8): Vorgak, o Senhor da Brasa

O clã do Pântano do Kosaradius (as mesmas fichas acima, com `commonPower` 2,4 e `minibossPower` 2,5) e o boss
próprio, o mais forte do jogo. Arte **esculpida por código** (`apps/client/src/art/proto/warlord.ts`, ver
`docs/ARTE_ESCULTURA.md`): nada é baixado.

| Monstro | Papel | Destaques |
|---|---|---|
| **Vorgak, o Senhor da Brasa** (boss) | líder | orc enorme de armadura negra com friso de latão, elmo de chifres com os olhos acesos na viseira, três garras em brasa no peitoral, manto de lobo, o estandarte do clã nas costas e o Cutelo de Brasa (alcance 2) · resiste a fogo, fraco contra gelo · golpe básico queima (40%) · Comando (orcs a até 4 tiles batem 20% mais forte e 15% mais rápido) · **Fenda de Brasa** (o cutelo racha o chão numa linha de 6, 1,7×, e queima; a fenda fica incandescente e esfria no chão) · Salto do Senhor da Guerra (de 3 a 7 tiles, cai colado, área de 2, atordoa 0,9 s) · Gancho de Ferro (puxa quem foge) · abaixo de 70%: Chamado da Fortaleza (2 Orcs berserkers) · abaixo de 35%: Guarda de Ogros (2 Ogros jovens) e Fúria de Brasa (rachaduras em volta, raio 3, empurra, queima e cura 12%), cada um uma vez · abaixo de 35%, frenesi |

Animação: parado e andar em 8 quadros (respira, o estandarte ondula, o manto, a corrente e o rabo de cabelo seguem
com atraso, a brasa pulsa), golpe em 8 (o cutelo de cima para baixo até o chão), especial em 8 (crava o cutelo e ruge
com o punho erguido: os chamados e a Fúria), salto em 8 (a Fenda e o Gancho saem do golpe) e morte em 5 (cai de
joelhos sobre o cutelo cravado, e a brasa dos olhos, das garras e da lâmina se apaga).

### Necrópole de Solária: Dunas Cantantes (★5) e Mesas de Solária (★6)

A legião do Império de Kusa que a areia enterrou viva e as múmias da corte do último faraó. Os dois mapas usam os
mesmos comuns e mini-bosses (as Mesas com orçamentos maiores, bandos maiores e 25% das campinas com um mini-boss solto);
cada um tem o seu boss. Quase todos são mortos-vivos (não pegam veneno nem sangramento); as múmias queimam fácil.

| Monstro | Papel | Assinatura |
|---|---|---|
| Chacal de Ossos | escaramuçador (matilha de 2–3) | Táticas de Bando · Fuga Ágil (morde e recua) |
| Escaravelhos Carniceiros | enxame (3–4) | metade das mordidas sangra |
| Legionário Ossudo | sentinela | elmo, escudo de bronze e gládio · resiste a físico, vulnerável a luz · Escudo em Riste (empurra) |
| Sagitário das Dunas | artilheiro | lenço do deserto e arco, alcance 6 · recua se alguém chega a 3 · Chuva de Flechas (área) |
| Múmia Enfaixada | controlador | Faixas Mortuárias: **puxa** o herói de 2–5 tiles para colado e prende 1 s · o toque apodrece · queima fácil |
| Carpideira | controlador | véu escuro, a 4 tiles · Lamento (leque de 4 que deixa lento) · queima fácil |
| Soterrado | emboscador | escondido na areia (camuflado, nota a 3 tiles) · Ataque Surpresa 1,8× · Fortitude Morta-viva |
| **Centurião Ossudo** (mini-boss) | líder | crista e capa vermelhas · Comando (aliados perto +25% de dano e de velocidade) · Investida · Golpe de Gládio (1,6× e sangra) · Formação! (chama 2 Legionários) |
| **Múmia Real** (mini-boss) | controlador | máscara de ouro · Faixas Reais (puxa e prende) · Maldição do Faraó (área que corrói) · ferida, Enxame da Tumba (3 Escaravelhos) |
| **Escriba das Areias** (mini-boss) | artilheiro | túnica azul e o rolo · Palavra Cegante (linha que cega) · Hieróglifo Explosivo (área que queima) · Erguer os Mortos (2 Chacais) |
| **Colosso Cantante** (boss das Dunas) | bruto (elemental) | gigante de areia em volta dos ossos da legião, alcance 2 · resiste a físico e natureza, vulnerável a gelo · Nota Grave (em volta, empurra e deixa lento) · Ária Estilhaçante (linha de 8 que corrói) · abaixo de 60%, Coro Soterrado (2 Carpideiras) · abaixo de 40%, Tempestade Cantante (área que cega) |
| **Faraó Eterno** (boss das Mesas) | artilheiro (morto-vivo, flutua) | ataca a 3 tiles e foge de quem cola · Raio do Sol Morto (linha de 8 que queima) · Mortalha (puxa e prende) · Maldição Eterna (área que corrói) · Legião Eterna (2 Legionários) · abaixo de 30%, Sarcófago (uma vez: cura 20% e empurra 3 em volta) |

**Balanceamento** (medido com o simulador de duelo, herói sozinho só com ataque básico; refazer quando a telemetria
chegar): matando 75% do caminho, o herói chega no boss das Dunas no nível 14 e no das Mesas no 15–16 (XP antes do boss
~7.200 e ~8.300; a Caverna, ~7.000). Na régua de quanto da vida do boss o herói tira antes de cair: o Colosso dá 3–9%
no nível 14 e o Faraó 4–7% no 16, contra 8–16% do Observador no 14. Os mini-bosses ficam entre o Troll e o Bugbear da
Caverna (30–60% no nível 11). Começo no nível 1: Escaravelhos e Chacais vencíveis sozinho, mais lentos que os Kobolds
e Goblins da Caverna. Loot máximo de uma hunt ~2.900 nas Dunas e ~3.400 nas Mesas (teto da hunt solo 3.300 e 3.800).

### Bosque Velho (★5)

A floresta antiga do Kosaradius, do lado oeste da bifurcação da Travessia: feras, plantas que andam e os espíritos
que a corrupção virou contra quem entra. Mesma faixa de força da Necrópole de Solária (o mesmo degrau da campanha), mas
quase nada é morto-vivo: veneno e sangramento pegam, e as plantas queimam fácil. Elenco e arte proposta em
`docs/arte/agente/BOSQUE_VELHO.md`. Na arte nova, os 10 são esculpidos por código e animados (`proto/forestBeasts.ts`,
`proto/forestFolk.ts`, `proto/greenDragon.ts`, ver `docs/ARTE_ESCULTURA.md`); na antiga, o desenho 32×32 de
`apps/client/src/art/forestMonsters.ts`.

| Monstro | Papel | Assinatura |
|---|---|---|
| Galhudo | enxame (3–4, planta) | feixe de galhos secos: camuflado no chão até alguém chegar a 4 tiles · queima fácil |
| Lobo Atroz | escaramuçador (matilha de 2–3) | Táticas de Bando +40% · Derrubar (atordoa 1 s) |
| Espinheiro | artilheiro (planta) | atira espinhos a 5 tiles · Rajada de Espinhos (sangra) · colado, Explosão de Espinhos em volta · queima fácil |
| Sátiro Flautista | líder (fada) | fica a 3 tiles · Comando (feras perto +10% de dano e 15% mais rápidas) · Melodia Encantada (leque de 4 que deixa lento) |
| Pantera das Sombras | emboscadora | camuflada na sombra até 3 tiles · Ataque Surpresa 1,8× · Bote (salta até quem foge) · a luz fere mais |
| Urso-coruja | bruto | o maior comum · Multiataque (bico e garras, 2 × 0,6) · Abraço Esmagador (prende 1,5 s) |
| **Dríade Corrompida** (mini-boss) | controladora (fada) | Enraizar (área que prende 1,5 s) · Chamado dos Galhos (3 Galhudos) · ferida, Passo Arbóreo (some 1,5 s) |
| **Centauro Renegado** (mini-boss) | artilheiro | rápido, fica a 3 tiles · Chuva de Flechas (área) · encurralado, Coice (em volta, empurra 2) |
| **Guardião do Menir** (mini-boss) | sentinela (constructo) | parado é uma pedra (camuflado, acorda a 3 tiles) · resiste a físico (0,5), vulnerável a energia · Pisão Rúnico (em volta, lento) · Punho de Pedra (atordoa 1 s) |
| **Dragão Verde Jovem** (boss) | bruto (dragão) | círculo de menires do norte; vencê-lo abre o Coração da Mata · resiste a natureza (0,5, não imune) · Multiataque (3 × 0,3) · Sopro Venenoso (leque de 6) · Rabada (em volta, empurra 2) · abaixo de 60%, Gás dos Menires (área: lento e veneno) |

**Balanceamento** (simulador de duelo, herói sozinho só com ataque básico, nos mesmos níveis das Dunas): os comuns
ficam entre os Escaravelhos e a Múmia Enfaixada; os mini-bosses aguentam um pouco mais que os das Dunas (o Guardião do
Menir é o mais duro para Cavaleiro e Paladino, pela pedra); o Dragão Verde fica perto do Colosso Cantante. Loot máximo
de uma hunt ~2.700 (teto da hunt solo 3.200). Refazer quando a telemetria chegar.

### Coração da Mata (★6)

O fundo da floresta do Kosaradius, depois do Bosque Velho: a luz quase não chega. Fungos e cipós que se mexem, a
caçada corrompida do Rei Galhado (javalis e cervos) e os mortos dos santuários élficos; do Bosque Velho, mais fundo,
vêm a Pantera das Sombras, o Urso-coruja e a Dríade Corrompida. Na faixa de força das Mesas de Solária (o mesmo degrau
do outro lado da bifurcação): orçamentos maiores, 25% das campinas com um mini-boss solto. Arte esculpida por código na
arte nova (os mesmos modelos do Bosque Velho: `forestBeasts.ts` e `forestFolk.ts`); na antiga, o desenho mais parecido
do Bosque Velho e do pack.

| Monstro | Papel | Assinatura |
|---|---|---|
| Fungóide | controlador (planta, bando de 2–3) | chapéu vermelho de pintas · metade dos golpes envenena · Nuvem de Esporos (em volta: veneno e lento) · queima fácil |
| Javali-Espinho | bruto (dupla) | espinhos de amora no lombo · a presa sangra · Investida (salta de 2–5 tiles, empurra) |
| Cipó Estrangulador | emboscador (planta) | camuflado na mata até 3 tiles · Ataque Surpresa 1,6× · Estrangular (puxa de 2–5 tiles e prende 1,5 s) · queima fácil |
| Cervo Corrompido | escaramuçador | galhada de musgo podre · Galhada (linha de 5 que empurra 2) · Fuga Ágil |
| Sombra Élfica | artilheiro (morto-vivo) | arqueira de luz fria a 6 tiles · some no ar a cada ~6,5 s · Flecha da Lua Morta (linha de 7 que cega) · a luz a desfaz (1,5×) |
| **Árvore Desperta** (mini-boss) | sentinela (planta) | parada é uma árvore (camuflada, acorda a 4 tiles) · resiste a físico · Raízes (área que prende 1,5 s) · Varrida de Galho (em volta, empurra 2) · fogo 1,5× |
| **Guardião Élfico Caído** (mini-boss) | líder (morto-vivo) | duas lâminas de luz fria · Comando (+20% de dano e velocidade) · Passo Sombrio (salta) · Dança das Lâminas (em volta, queima) · ferido, Chamado do Santuário (2 Sombras Élficas) |
| **Rei Galhado** (boss) | bruto (fada) | espírito da caçada, galhada de cervo e lança de galho, alcance 2 · resiste a natureza, vulnerável a fogo e gelo · Investida da Galhada (linha de 7, empurra) · Espinhos do Coração (área de raio 3 que sangra) · abaixo de 70%, Chamado da Caçada (2 Cervos) · abaixo de 30%, Fúria da Mata (uma vez: raízes em volta, prende, empurra 3 e cura 15%) |

**Balanceamento** (duelo, nos mesmos níveis das Mesas): os comuns ficam entre a Carpideira e a Múmia Enfaixada (o Cervo,
o mais duro para o Druida); os mini-bosses perto da Múmia Real (a Árvore Desperta aguenta mais e bate menos); o Rei
Galhado um pouco abaixo do Faraó Eterno no Cavaleiro e igual nos outros. Loot máximo de uma hunt ~3.340, como as Mesas
(teto da hunt solo 3.800).

### Charco Cinzento (★8)

A turfeira queimou há gerações: os turfeiros que morreram no fogo e na água voltaram da lama, e o lago negro tem uma
dona. No degrau da Fortaleza Orc (a etapa 9 vem depois de Vorgak), sem multiplicador de força: as fichas já são as do
degrau. ~120 monstros por hunt (11% menos que a Fortaleza, porque a planta fixa já põe uma luta a cada ~6 s), 4 por
emboscada e 25% delas com um mini-boss solto; loot máximo ~4.060 (`lootScale` 0,78; teto da hunt solo 4.600). Arte
**esculpida por código** (`apps/client/src/art/proto/charcoArt.ts`), a única deles (vale com a arte nova ligada ou não):
os modelos que já existem com a **pele** do charco (`Skin` em `sculpt.ts`: recolore as rampas mantendo luz e volume) e
um modelo novo, o Lodo (`ooze.ts`). Prévia: `npx tsx apps/client/scripts/inimigosPrevia.ts saida.png charco`.

| Monstro | Papel | Assinatura |
|---|---|---|
| Sanguessuga Gigante | enxame (bando de 3–4) | rouba metade do golpe em vida · zonas 1 e 2 · o Verme da Areia pequeno e escuro |
| Corvo Carniceiro | escaramuçador (bando de 2–3) | bate e recua · Mergulho (cai colado) · a bicada pode cegar · o abutre negro |
| Turfeiro Afogado | bruto (morto-vivo) | turfa encharcada: resiste a físico, fogo 1,5× · o golpe corrói · a múmia de turfa com os olhos de luz fria |
| Lanterneiro | artilheiro (morto-vivo) | atira de 5 tiles e recua · Fogo-Fátuo (projétil que queima) · o sacerdote com a lanterna verde |
| Lodo de Cinza | controlador (limo) | Engolir (os aliados batendo o fazem cuspir) · golpe físico forte o divide (até 3) · resiste a gelo |
| Espreitador da Poça | emboscador | camuflado na beira das poças · Ataque Surpresa 1,6× · Puxão (de 2 a 5 tiles, prende) · a pantera de lama |
| **Bruxa Cinzenta** (mini-boss) | controlador (fada) | Névoa (área que cega) · Maldição (corrói) · ferida, some e volta com 2 cópias ilusórias |
| **Monólito Desperto** (mini-boss) | sentinela (constructo) | parado é um monólito (acorda a 4 tiles) · Pulso da Runa (atordoa em volta) · Pancada de Pedra (empurra) · resiste a físico, energia 1,4× |
| **Cavaleiro Afogado** (mini-boss) | líder (morto-vivo) | Comando (+20% de dano e velocidade) · Investida · Varrida Enferrujada (em volta, sangra) · ferido, Chamado dos Afogados (2 Turfeiros) |
| **Morgrana, a Rainha Afogada** (boss) | controlador (morto-vivo) | alcance 2 · resiste a fogo, vulnerável a luz e raio · Maré Negra (empurra e deixa lento em volta) · Mão do Lago (puxa e prende) · abaixo de 70%, Chamado dos Afogados · abaixo de 30%, Lamento (cega em volta e cura 12%, uma vez) |

**Balanceamento** (duelo, herói sozinho só com ataque básico, níveis 15/17/20, ao lado da Fortaleza nos mesmos níveis):
Sanguessuga e Corvo mais fáceis que o Orc batedor (zonas de entrada); Turfeiro e Lodo perto do Ogro jovem; Lanterneiro e
Espreitador perto do Orc berserker; mini-bosses perto do Ogro do Brejo e do Chefe de Guerra (o Monólito aguenta mais
contra físico: é para magia); Morgrana ~10% acima de Vorgak (o fim do ramo).

### Ermos Rubros (★8)

A mina de ferro do império, abandonada quando a cratera desabou: a ferrugem tomou o vale, os mineiros que ficaram lá
embaixo voltaram e o gigante que cavava com eles ainda guarda a cratera. O outro lado da etapa 9, no mesmo degrau do
Charco (as mesmas verbas por zona: ~105 monstros por hunt, menos que os ~120 do Charco porque o Mineiro e o Lagarto
custam mais; 4 por emboscada e 25% delas com um mini-boss solto; loot máximo ~3.750, `lootScale` 0,78; teto da hunt
solo 4.600). Arte **esculpida por código**
(`apps/client/src/art/proto/ermosArt.ts`), com a pele dos ermos (a luz rebatida vermelha do barro no lugar da verde da
mata) e dois modelos novos: o Escaravelho (`beetle.ts`) e o Lagarto-Couraça (o quadrúpede baixo de `forestBeasts.ts`).
Kragmor é o Vorgak na variante gigante (`shootWarlord(..., "giant")`: sem estandarte nem elmo, a cabeça de pedra e o
martelo de forja). Prévia: `npx tsx apps/client/scripts/inimigosPrevia.ts saida.png ermos`.

| Monstro | Papel | Assinatura |
|---|---|---|
| Escaravelho de Ferrugem | enxame (bando de 3–4) | a mordida corrói · resiste um pouco a físico · zonas 1 e 2 · besouro de ferro com placas de ferrugem |
| Hiena dos Ermos | escaramuçador (bando de 2–3) | Táticas de Bando (+35% com outro no mesmo alvo) · bate e recua · o lobo de pelo ocre |
| Saqueador Rubro | artilheiro | atira de 5 tiles e recua · Flecha Farpada (projétil que sangra) · o centauro de couro vermelho |
| Mineiro Perdido | bruto (morto-vivo) | a picaretada às vezes atordoa (0,6 s) · luz 1,3× · a múmia de pó de ferro com os olhos em brasa |
| Lagarto-Couraça | sentinela | couraça: físico 0,7×, gelo 1,4× · Rolada (salta e empurra) · espinhos e placas no dorso |
| Redemoinho de Ferrugem | controlador (elemental) | Poeira de Ferrugem (cega em volta) · o golpe corrói · resiste a físico, gelo 1,3× |
| **Capataz Morto** (mini-boss) | líder (morto-vivo) | Comando (+20% de dano e velocidade) · Chicote (puxa e sangra) · Chicotada em Roda · ferido, Turno da Mina (2 Mineiros) |
| **Golem de Minério** (mini-boss) | sentinela (constructo) | absorve fogo (cura) · gelo 1,4×, físico 0,8× · Soco Sísmico (atordoa em volta) · Marretada (empurra) |
| **Mãe-Hiena** (mini-boss) | líder (besta) | Comando · Táticas de Bando · Bote · Dilacerar (em volta, sangra) · ferida, Uivo (2 Hienas) |
| **Kragmor, o Gigante da Cratera** (boss) | bruto (gigante) | alcance 2 · resiste a fogo e um pouco a físico, gelo 1,3× · Arremesso de Minério (de 3 a 7 tiles) · Desabamento (atordoa em volta) · abaixo de 70%, Chamado da Mina · abaixo de 50%, Salto da Cratera · abaixo de 30%, Fúria da Forja (queima, empurra e cura 12%, uma vez) e Frenesi |

**Balanceamento** (mesmo duelo do Charco): os comuns se equivalem um a um com os do Charco (o Lagarto aguenta mais
contra o Cavaleiro e o Paladino, é para magia); Capataz e Mãe-Hiena perto do Cavaleiro Afogado, Golem perto do
Monólito (o fogo cura o Golem: o Xamã, de básico de brasa, troca para os totens e as magias de outro elemento); Kragmor ~8% acima de Morgrana.

## Ataques e magias (protótipo)

- **Reações** (`packages/shared/src/reactions.ts`, Grimório 4.0): um estado no monstro prepara o golpe seguinte, de
  qualquer herói (no co-op, o fogo de um combina com o gelo do outro). O servidor confere a cada golpe direto; o pulso
  do dano contínuo e a explosão de outra reação não reagem. Toda reação, menos o Exposto, gasta o estado que a preparou.
  Força base baixa; Dons e magias de combo (fases seguintes) é que deixam cada uma forte.
  - 💨 **Vapor**: queimando + magia de gelo (ou congelado + fogo) → explode em raio 1 (0,8× do golpe), ofusca 0,5 s e
    apaga o fogo e o gelo.
  - 💎 **Estilhaço**: congelado + golpe de energia ou físico → +40% no golpe e o gelo quebra (o Traço Estilhaçar,
    quando vale, fica no lugar).
  - 🩸 **Hemorragia**: sangrando + empurrão ou atordoamento → o resto do sangramento entra de uma vez.
  - 🌋 **Brasa Tóxica**: envenenado + fogo → o veneno pega fogo e queima quem está em raio 1 (0,25× do golpe por s, 2 s).
  - 🌿 **Espinheiro**: preso por raiz + magia de veneno → a raiz vira espinhos: sangra na hora 3 pulsos do veneno (o
    veneno continua).
  - 🌑 **Condenação**: marcado + magia de trevas → a marca explode em raio 1 (1× do golpe).
  - 🔆 **Incandescer**: ofuscado + fogo → a luz explode em raio 1 (0,8×), o dobro em mortos-vivos.
  - 🎯 **Exposto**: marcado e atordoado → +30% de dano de tudo enquanto os dois durarem.
  - Estados novos: **congelado** (preso por magia de gelo: Lança de Gelo, Nova de Gelo, Prisão de Gelo, o Sopro Gélido
    canalizado e os campos de gelo que prendem; bloco de gelo no desenho) e **ofuscado** (atordoado por magia de luz).

- Ataque básico de cada classe: Cavaleiro golpeia com a espada (corpo a corpo); Paladino atira flechas; Druida lança uma luz verde; Feiticeiro lança uma luz negra; Xamã Orc lança uma brasa do cajado (fogo, alcance 3: curto de propósito, o xamã luta junto dos totens). Os projéteis voam até o alvo e o dano só entra quando chegam.
- **Tiro que pode errar** (o básico à distância e as magias de alvo único com projétil: Flecha Sagrada, Relâmpago,
  Espinho Venenoso, Lâmina Arremessada, Corrente de Ferro...): é mirado numa **direção**, não num ponto. O projétil voa
  reto nessa direção até o alcance inteiro (ou a primeira parede), **sem seguir o monstro**, passando por um tile de cada
  vez, e para no primeiro monstro à vista que encontrar (`shotPath`, `Hunt.fly`); o cliente para o desenho ali
  (`MSG.shotEnd`). Ninguém no caminho, erra. Quem vem reto na direção do herói continua no caminho e leva o tiro; quem
  anda de lado durante o voo escapa, e o tiro segue e pode acertar quem está atrás dele. Um monstro na frente leva o
  tiro no lugar do de trás. Objetivo: o básico à distância deixa de
  acertar sempre e fica mais perto do Cavaleiro, que precisa chegar colado (a telemetria do nível <10 deu 3 de dano por
  segundo no básico do Cavaleiro contra 5 a 8 nas outras classes). Corpo a corpo, Investida e magias sem projétil não mudam.
  - **No ⚔️:** toque e segurar atiram sozinhos (alvo automático, ao contrário das magias) na direção de onde o alvo está na hora do disparo (sem prever o
    movimento). Arrastar a partir do botão mira a direção à mão (só a direção do arrasto conta, não o tamanho): a mira
    é uma linha reta pontilhada e tênue (como a das magias de área) do herói até onde o tiro para (o primeiro monstro da reta, em dourado, ou o alcance do
    básico); soltar atira, mesmo sem
    monstro à vista; voltar ao botão cancela. O dedo parado vira "segurar" depois de 150 ms.
  - Telemetria: `RunStats.shots` (disparados, errados e mirados à mão, por fonte).
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
  - **Toque rápido** (sem arrastar): **sem mira automática no monstro**. A magia sai reto na **frente do herói**:
    a direção do último passo, ataque básico ou magia mirada (`Player.faceX/faceY`; começa olhando para baixo).
    Tiro, linha, leque e rolamento seguem essa direção até o alcance; alvo único sem projétil (golpes do Cavaleiro,
    Desafio, Investida) e área caem no primeiro monstro dessa reta ou, sem nenhum, no fim dela. Sai sempre (gasta
    mana e recarga, mesmo sem acertar), menos a Investida, que sem monstro na reta não sai. Parado no botão, a mira
    mostra para onde vai. Os bots miram de propósito no monstro deles (`BotAi.aimAt`).
    O ⚔️ é diferente: o toque continua com alvo automático.
  - A mira gruda (fica dourada) no monstro a até 1 tile do ponto; a magia vai nele e o acompanha durante o voo.
    Exceção: o **tiro** (magia de alvo único com projétil) não gruda nem acompanha: é mirado numa direção (a mira
    é a linha pontilhada até onde o tiro para, dourada no primeiro monstro da reta) e pode errar, como o básico à
    distância.
  - **Mira padronizada:** o ⚔️, os tiros, as linhas e o alvo único usam a mesma linha reta pontilhada e tênue do
    herói até o alvo; só área e leque desenham a área (quadrado ou tiles do leque) além da linha.
- **Magias de área com alvo** (Chuva de Flechas, Esfera Sombria, Raízes Espinhosas, Fúria da Natureza) miram do mesmo jeito: segurar o botão, arrastar e soltar. A mira mostra o quadrado da área em volta do ponto, sem grudar em monstro; o toque rápido lança na frente do herói. O ponto para na primeira parede do caminho.
- **Magias em linha** (Disparo Perfurante) miram a direção: a mira é a linha pontilhada até o alcance inteiro (dourada se pega algum monstro); o toque rápido atira na frente do herói.
- **Errou a mira:** a magia sai, aparece na tela, gasta mana e recarga, e não acerta ninguém.
- Magias em volta de si (Giro da Lâmina, Grito de Guerra, Tempestade do Vazio, Bênção da Floresta e as compradas do mesmo tipo) saem no toque, sem mira. Paredes bloqueiam o efeito de todas. Cada uma gasta mana e tem recarga.

| Classe | Slot 1 (nível 3) | Slot 2 (nível 6) |
| --- | --- | --- |
| Cavaleiro | 🌀 Giro da Lâmina: corta todos os monstros colados (1,6× dano) | 📯 Grito de Guerra: provoca monstros a até 4 tiles e corta 50% do dano recebido por 6 s |
| Paladino | ✴️ Flecha Sagrada: flecha dourada num alvo (2,6× dano) | 🏹 Chuva de Flechas: área de raio 2 no alvo (1,4× dano) |
| Feiticeiro | 🔮 Esfera Sombria: explode no alvo, raio 1 (1,9× dano) | 🌑 Tempestade do Vazio: raio 3 em volta de si (2,3× dano) |
| Druida | 🌿 Bênção da Floresta: cura 35% da vida de quem está a até 4 tiles | 🌱 Raízes Espinhosas: raio 2 no alvo, fere (1,2×) e prende por 3,5 s |
| Xamã Orc | 🔥 Totem da Brasa: finca um totem a até 4 tiles por 10 s, que lança brasa (0,6×, fogo) no monstro mais perto a até 3 tiles a cada 1 s; cabem 2 ao mesmo tempo · Maestria: a brasa queima 3 s | 🥁 Tambor de Guerra: você, os aliados e as criaturas (de qualquer herói) a até 4 tiles atacam 25% mais rápido e causam +15% de dano por 6 s; os monstros a até 2 tiles ficam 30% mais lentos por 3 s · Maestria: cura 10% de quem está no raio |

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
| Orc batedor (Xamã Orc) | 25% | rápido (5,5), chega primeiro e distrai (0,4×) |
| Orc lanceiro (Xamã Orc) | 80% | segura a linha: o monstro que ele acerta passa a persegui-lo (0,5×) |
| Orc arqueiro (Xamã Orc) | 30% | atira de até 5 tiles (0,6×) e recua quando o monstro chega a menos de 2 |
| Orc capitão (Xamã Orc) | 70% | Comando: os orcs do clã do mesmo dono a até 3 tiles causam +15% e atacam 15% mais rápido (0,6×) |
| Ogro da Forja (Xamã Orc) | 140% | malho em brasa (1×) que empurra 1 tile e queima |

- **O clã do Xamã Orc** (ramo Horda e o Totem do Chamado): orcs e ogros libertados, desenhados com a **arte dos
  monstros do clã** (`look` em `summons.ts`: os mesmos do Pântano do Kosaradius e da Fortaleza). Para não serem
  confundidos com os inimigos da mesma espécie, levam a **marca de aliado**: anel cor de brasa nos pés, uma faixa cor de
  brasa sobre a barra de vida e a barra das criaturas. Perto de um totem do dono (a até 3 tiles), causam +15%
  (`CLAN_TOTEM_BONUS`); o Comando do capitão soma por cima. Contam no limite de 6 criaturas por jogador.
- **Magias da Horda e do tronco do Xamã** (nível 0; números em `spells.ts`): 🏃 **Chamar Batedores** (S1, 2 batedores
  por 12 s · Maestria: 3) · 🛡️ **Lanceiros do Clã** (S1, 2 por 15 s · Maestria: 3) · 🏹 **Arqueiros do Clã** (S2, 2 por
  15 s · Maestria: 3) · 🚩 **Capitão do Clã** (S2, 1 por 18 s · Maestria: dura 50% mais) · 🪨 **Totem do Lodo** (S1,
  totem de raio 2 por 10 s, monstros 40% mais lentos a cada pulso; cabem 2 · Maestria: também prende 1 s) · 📯 **Totem
  do Chamado** (S2, totem por 12 s que chama 1 batedor a cada 4 s, até 3 · Maestria: até 4) · 🏯 **Grande Totem do Clã**
  (S2, totem de raio 3 por 12 s, 1× a cada 2 s e +15% de dano nos aliados dentro · Maestria: raio 4) · 🔱 **Lança de
  Brasa** (S1, linha de 5 tiles, 1,7× e queima · Maestria: queima o dobro) · 💥 **Batida de Guerra** (S2, raio 2 em
  volta de si, 1,4× e atordoa 1 s · Maestria: raio 3) · 🔨 **Ogro da Forja** (S2, 1 ogro por 15 s · Maestria: dura 50% mais).
- **Especializações do Xamã Orc** (Fase 3; Traço 1.000 de gold e escolha permanente, magias 1.200 e 1.600):

  | Ramo | Lado | Traço | Magia slot 1 | Magia slot 2 |
  |---|---|---|---|---|
  | Horda | **Senhor da Horda** | 🪓 Sangue do Clã: suas criaturas com +25% de vida e de dano | 🪓 Berserkers do Clã: 2 berserkers por 15 s, que feridos (abaixo de 50%) atacam 40% mais rápido | 👑 Chefe de Guerra: 1 Chefe de Guerra Orc por 20 s, que atrai os monstros e comanda os orcs perto (+20% de dano, 15% mais rápidos) |
  | Horda | **Domador de Sangue** | ⛓️ Juramento de Sangue: monstro comum que morre a até 3 tiles de um totem seu tem 20% de chance de se levantar como seu aliado por 10 s | 🔗 Corrente da Submissão: 0,8× num monstro; se ele ficar abaixo de 30% da vida, vira seu aliado por 12 s | ⛓️ Ogro Acorrentado: 1 Ogro do Brejo por 15 s, que atrai os monstros e atordoa 0,6 s a cada pancada |
  | Totens | **Entalhador** | 🪵 Mãos de Entalhe: seus totens duram 50% mais e cabe mais um de cada | ⚡ Totem do Trovão: totem por 12 s, 8 raios de 1,1× a até 4 tiles | 🌋 Totem Vulcânico: totem por 8 s que, no fim, explode em raio 3 (2,6×) e queima |
  | Totens | **Nômade** | 🎒 Totem nas Costas: o último totem que você finca anda com você, com metade da duração | 🐗 Investida do Javali: corre até um monstro a até 4 tiles, 1,3× e empurra 1 tile | 🌀 Círculo de Totens: anel de raio 2 em volta de si por 6 s; quem fica dentro anda 50% mais devagar e queima |
  | Brasa | **Coração de Brasa** | 🔥 Herança de Vorgak: suas magias com dano queimam por 4 s | 🪓 Fenda de Brasa: linha de 6 tiles, 2× e queima | 🌋 Fúria de Brasa: raio 3 em volta de si, 1,8×, empurra 2 tiles, queima e cura 12% (você e os aliados no raio) |
  | Brasa | **Tamboreiro** | 🥁 Ritmo de Guerra: seus tambores duram 50% mais e alcançam 2 tiles além | 🩸 Tambor de Sangue: você, os aliados e as criaturas a até 4 tiles causam +20% de dano por 5 s e recuperam 10% da vida | 🥾 Marcha do Clã: por 6 s, você, os aliados e as criaturas a até 4 tiles andam 30% mais rápido e não ficam presos nem lentos (o que já prendia sai) |

  - Maestrias: 3 berserkers; Chefe de Guerra e Ogro Acorrentado ficam 50% mais; a Corrente converte abaixo de 40%;
    Totem do Trovão solta 12 raios, um por segundo; explosão vulcânica em raio 4; a investida atordoa 1 s; anel em raio
    3; a Fenda atordoa 1 s; a Fúria cura 20%; o Tambor de Sangue cura 20%; a Marcha dura 9 s.
  - **Monstro convertido** (Corrente da Submissão e Juramento de Sangue): some da lista de monstros sem render XP, loot
    nem item e volta como aliado com a arte dele, 60% da vida máxima e 80% do dano (`BOUND_POWER`). Só monstro comum que
    não foi chamado por outro (mini-boss, boss e os chamados de boss nunca); um convertido por herói de cada vez.
  - **Costelas:** 🌿 Xamã do Clã (S1, um xamã que cura 5% da vida de quem está a até 3 tiles, a cada 2 s · Maestria: 2) ·
    💀 Mau Agouro (S2, 1× e marca o alvo, +20% de dano da equipe por 8 s · Maestria: raio 1) · 🩸 Totem de Sangue (S2,
    totem de raio 2 por 10 s que cura 3% da vida por segundo · Maestria: 5%) · ☄️ Chuva de Cinzas (S2, campo de raio 3
    por 5 s, 0,4×/s e 20% de lentidão · Maestria: raio 4).
  - **Ápices (slot 3, 2.000 de gold):** 📣 Fúria da Horda (3 batedores, e todas as suas criaturas atacam 40% mais rápido
    e recuperam 50% da vida por 8 s · Maestria: 4 batedores) · 🗿 Círculo dos Ancestrais (totem de raio 4 por 12 s,
    0,5×/s, 30% de lentidão e cura 3%/s nos aliados · Maestria: raio 5) · ☄️ Chuva da Forja (raio 3 a até 6 tiles, 3,2×,
    queima e deixa o chão em chamas · Maestria: raio 4).
  - **Dons do fundo do Xamã** (embaixo de cada Ápice, 25 níveis): 🪓 Laço da Horda (+1,2% de vida e de dano das
    criaturas por nível) · 🗿 Postura Ancestral (−0,8% de dano recebido parado, por nível) · 🔥 Fagulha da Forja (+0,8%
    de chance por nível de o básico incendiar o alvo). Usam os efeitos dos Dons das outras classes, sem marcos próprios.

- **Arte e animação** (só no cliente, `apps/client/src/art/summonCreatures.ts`): todas as criaturas têm arte própria e
  animada (parada, andando, golpe e especial), no volume de luz dos monstros do Pântano. O lobo trota (patas em
  diagonal) e o urso anda no passo lateral e pesado; as patas pisam e ficam plantadas no chão enquanto o corpo passa
  (cinemática inversa), e o andar acompanha a velocidade da criatura. O Guardião e o Esqueleto usam o esqueleto de
  `rig.ts` (braços balançando contra as pernas); a águia, a vespa e a mariposa batem as asas (a vespa com asas
  transparentes e as pernas penduradas); o Fogo-Fátuo é uma chama que tremula, com bracinhos de fumaça. O lobo
  solta rastro de luz e uiva no especial; o urso empina e desce as garras no golpe, com runas no ombro que acendem.
  As formas animais do Druida usam a mesma arte (andam e respiram com o herói).

- Tabela em `packages/shared/src/spells.ts`; arte de combate em `apps/client/src/art/combat.ts` e efeitos em `apps/client/src/fx.ts`.
- Ao apanhar, quem leva o golpe pisca e sangra; monstros que morrem tombam e deixam uma poça na cor do sangue deles (vermelho, verde, roxo, preto; mortos-vivos viram poeira); o sangue e os corpos ficam no chão até a hunt acabar (`apps/client/src/CombatFx.ts`). O ataque dos monstros também tem efeito próprio (mordida, corte, pancada, flecha dos arqueiros, bola de fogo do dragão), e cada habilidade tem o seu desenho (pedra em arco, teia, língua, salto, sopro, chuva ácida, relâmpago, engolir, voo). Os monstros respiram parados (cada um num ritmo), escondidos ficam quase transparentes e sem barra, o Mímico parece um baú e os Campeões têm nome e brilho dourados. Efeitos no herói: teia nos pés (preso), estrelas (atordoado), bolha verde (engolido), nuvem escura (cego) e gotas ácidas (corroído).

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
  | Escudo | Todas menos o paladino (arco e besta pedem as duas mãos) | armadura |

- **Só varinhas, cajados e alguns itens mágicos aumentam as magias** (e os campos no chão). As criaturas invocadas
  levam só **metade** desse bônus (`SUMMON_SPELL_POWER_SHARE`): elas batem o tempo todo, e com o bônus inteiro uma
  varinha boa dobrava o dano contínuo do Druida.
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
- Quem morre larga 1 equipamento sorteado (a partir do nível 5) e a bag no chão e guarda o resto do equipamento. Sem equipar nada no menu, todos começam sem equipamento; quem sai vivo guarda o equipado e esvazia a bag no cofre (ver "Cofre, bag e mercado").
- Mercado: compra só comuns até Mithral (60, 150, 350 e 800 gold); vende pelo material (10, 25, 60, 130, 300), ×2 se raro e ×4 se mágico.

### Arte dos itens e equipamento visível

Cada família tem arte própria em dois formatos, e o que o personagem veste aparece nele para todos da equipe.
Plano e direção de arte (inspirada em D&D): `docs/ARTE_HEROIS_PLANO.md`. Padrão visual inspirado no Tibia (heróis, monstros e mapas): `docs/ARTE_TIBIA.md`; conceitos de cada item no padrão novo: `docs/ARTE_ITENS.md`.

- **Arte nova (beta)** (opção nas Configurações, ligada de padrão, quem desligar volta à antiga; trocar recarrega o jogo): heróis e todo o
  equipamento no padrão novo (`apps/client/src/art/proto/tibiaHero.ts`), no jogo, nos retratos e no provador. O raro
  usa o desenho do comum. Cada combinação de classe e equipamento é desenhada uma vez ao aparecer (0,1 a 0,3 s num
  computador; mais no celular) e fica guardada. O sprite vai 10% maior que 128 px por tile, com os pés no mesmo
  ponto do herói antigo. O corpo dos heróis é um pouco mais alto e magro que o dos monstros humanoides (pernas mais
  longas, figura 8% mais estreita).
  **Movimentos de ação:** o ataque básico e a magia tocam um clipe de 3 quadros na direção do golpe (preparo, golpe e
  fim): espada e machado cortam com rastro em meia-lua (ciano no item mágico), arco e besta puxam e soltam a corda,
  cajado e varinha estocam com faíscas, e a magia ergue os braços em V com faíscas nas mãos. Os quadros são desenhados
  aos poucos quando o herói aparece ou troca de roupa; até ficarem prontos, o golpe é só o tranco
  (`docs/ARTE_ITENS_CODIGO_PLANO.md`).
  Na Cripta, a opção também troca o cenário e os monstros (piloto dos mapas e monstros, `docs/ARTE_TIBIA.md`).
  Os ícones dos itens (mochila, cofre, mercado, equipamento e chão) passam a ser o mesmo desenho do item vestido
  (`docs/ARTE_ITENS.md`, seção 13).

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
- Lista de classes (Cavaleiro, Paladino, Feiticeiro e Druida, mais o Xamã Orc, liberado por Vorgak: Fase 1 jogável, o resto em `docs/CLASSE_XAMA_ORC.md`); preços do Grimório e do mercado, e a força das magias e criaturas novas, ainda precisam de balanceamento.
- Balanceamento do Pântano (dificuldade 2) e próximos mapas e bosses.
- Os jogadores de uma equipe se reanimam?
- Arte: os sprites do Tibia são da CipSoft e **não podem ser usados**. Usaremos assets com licença aberta (OpenGameArt, itch.io) ou arte própria, no mesmo estilo.
