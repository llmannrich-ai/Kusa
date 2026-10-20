# Kusa — Game Design

RPG de dungeon cooperativo para navegador, com tema de Dungeons & Dragons e visual inspirado no Tibia
(pixel art 32×32, câmera de cima). As partidas são curtas, e entre elas existe um metajogo de progressão.

## Plataforma: mobile primeiro

O jogo roda no navegador, mas **o alvo principal é o celular**. Toda mecânica nasce pensada para o toque;
teclado e mouse no desktop são um extra.

- **Orientação paisagem**, como no Zooba. Em retrato aparece um aviso para girar o aparelho.
- **Polegar esquerdo:** joystick virtual flutuante, que aparece onde o dedo toca na metade esquerda da tela, com 8 direções.
- **Polegar direito:** botões de ação no canto inferior direito (ataque, magias, poções), grandes e sem precisar de mira precisa.
- **Mira:** auto-ataque no monstro mais próximo dentro do alcance. Tocar num monstro trava o alvo nele.
- **Tela:** sempre se vê cerca de 15×9 tiles, em qualquer tamanho de celular. O HUD respeita o notch (safe area), e nada importante fica longe dos polegares.
- Sem zoom de pinça nem rolagem acidental. O jogo pede tela cheia e tenta travar em paisagem ao entrar na hunt.
- Sessões curtas (3 a 5 min) e entrar numa partida em poucos toques.

## Menu inicial (estilo Zooba / Clash)

- Escolha do modo de jogo e do mapa
- Escolha da classe
- Itens cosméticos para equipar
- Amigos e formação de equipe
- Compra de upgrades permanentes com o gold ganho nas hunts

## Partida (hunt)

- Equipes de 1 a 4 jogadores: single, dupla, trio ou quarteto.
- A equipe nasce junta numa borda aleatória da dungeon, na sala do portal de fuga.
- O limite de tempo fica entre 3 e 5 minutos. **Se o tempo acaba, a dungeon desaba e todos morrem soterrados.**
- Todo mundo começa no nível 1, sem equipamento, magia ou skill.
- Matar monstros dá XP e itens dropados.
- A cada nível: mais HP e mana, mais velocidade de movimento e mais dano base. Magias são desbloqueadas em níveis específicos.
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

- Clique ou Tab seleciona um monstro; o servidor faz auto-attack enquanto ele estiver no alcance da classe e com linha de visão.
- Monstros perseguem o jogador vivo mais próximo dentro do aggro range (ou quem bateu neles) e desistem se ele se afastar demais.
- A XP da morte é dividida entre quem acertou o monstro, com +20% por participante extra; o loot vai para quem deu o último golpe.
- Cada sala do caminho é 12% mais forte que a anterior (HP, dano, XP e loot). Salas laterais têm um Ogro (mini-boss) que destranca um baú; o Dragão jovem fica no centro.
- Vida regenera 2% por segundo e mana 2%; subir de nível cura tudo. Concluir pelo portal do boss dá +50% de loot.
- Tabelas em `packages/shared/src/monsters.ts` e `classes.ts`.

## Decisões em aberto

- Duração exata da hunt (o código usa 4 min em `MATCH_DURATION_SECONDS`).
- Se a morte regride os upgrades permanentes, e quanto.
- Lista de classes (o protótipo usa Cavaleiro, Paladino, Feiticeiro e Druida) e quais magias abrem em quais níveis.
- Tipos de mapa e bosses.
- Os jogadores de uma equipe se reanimam? O loot é compartilhado ou individual?
- Arte: os sprites do Tibia são da CipSoft e **não podem ser usados**. Usaremos assets com licença aberta (OpenGameArt, itch.io) ou arte própria, no mesmo estilo.
