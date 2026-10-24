# Mapa mundi — plano

O botão **Batalhas** deixa de abrir a lista de cartões de cenário e passa a abrir o **mapa mundi**: um planeta com mar
predominante, continentes e ilhas de geografias diferentes, onde cada cenário é um ponto ligado por trilhas, como no
mapa do Super Mario World. Tocar num ponto abre a ficha do cenário com os botões de hoje (Jogar sozinho, Criar sala,
salas abertas). Documento de planejamento: quando uma fase for entregue, o `GDD.md` passa a descrever o que vale e
este arquivo marca a fase como feita.

**Andamento:** planejamento. Decisões do Leonardo na seção 2; história, nomes das regiões e maquete visual
(https://claude.ai/artifact/381HUgj2pRPmaFCkbSE7sC) aprovados. Fases 1 (mapa estático, ficha, salas abertas) e 2 (herói andando pela trilha, barco no mar, névoa revisada) feitas.

---

## 1. Referências

| Jogo | O que pegamos |
|---|---|
| Super Mario World / Mario Bros. 3 | pontos ligados por trilhas, o herói anda até o ponto, o boss abre o caminho seguinte |
| Kingdom Rush / Candy Crush Saga | mapa que rola na vertical (feito para o celular em pé), estrela por ponto |
| Zelda Wind Waker / Mario Odyssey | oceano dominante, barco entre ilhas, cada região com geografia própria |
| Mapas de D&D (Forgotten Realms, Greyhawk) | estilo pergaminho: tinta, hachura no litoral, rosa dos ventos, monstros marinhos desenhados no mar |
| Clash Royale | o menu do Kusa já segue o padrão; desbloqueio por progresso |

## 2. Decisões

| Tema | Decisão |
|---|---|
| Navegação | rola só na vertical; o planeta é desenhado alto (cerca de 2,5 telas de altura) |
| Formato | plano, tipo atlas |
| Arte | pergaminho de D&D, desenhado em SVG por nós (sem asset de terceiros) |
| Herói | o boneco da classe escolhida anda pela trilha até o ponto tocado; no mar, vira barco |
| Mar | visual, com barco entre ilhas; sem cenário no mar por agora |
| Bloqueio | o ponto seguinte abre ao **matar o boss** do anterior |
| Escopo do bloqueio | **por classe** (como as runas de boss): cada classe faz a própria jornada |
| Quem ganha em grupo | **todo humano que estava na hunt** quando o boss morreu, vivo ou morto (bots não contam) |
| Convidado | o bloqueio vale só para **criar sala e jogar sozinho**; entrar na sala de outro jogador é livre |
| Estrela | uma por ponto, "Venceu o boss", com a mesma regra do desbloqueio |
| Pontos | 1 por cenário |
| Ordem | 🐸 Pântano do Kosaradius → 🏚️ Cripta → 🏜️ Mar de Areia → 🌿 Pântano das Ruínas |
| Contas atuais | desbloqueio pelo histórico: quem já matou um boss com a classe já tem o ponto seguinte aberto |
| Salas abertas | nos dois lugares: contador no ponto (👥 2) e botão fixo "Salas abertas (N)" com a lista completa |
| Nome do mundo | **Kosaradius**, escrito no fundo do mapa em marca d'água laranja clara, em arco convexo (ver 3) |
| História e regiões | aprovadas como estão na seção 3 |
| Visual | a maquete aprovada é a referência da implementação |
| Abertura | Batalhas abre o mapa já rolado no último ponto aberto da classe, com o herói em cima |
| Caminhada | ~1 s até o ponto tocado; tocar de novo (ou na ficha) pula |
| Amigos no mapa | depois, quando existir o sistema de amigos |
| Geografias futuras (na névoa) | gelo / polo, vulcão, cidade em ruínas / castelo |

## 3. Mundo

**Kosaradius**, um planeta quase todo mar (nome decidido pelo Leonardo). Há mil anos o Império de Kusa dominava um continente só; a **Grande Maré**
subiu numa noite e afundou o império. Sobraram os picos (os continentes de hoje), ilhas e ruínas meio submersas.
Os heróis exploram o que restou, e a névoa no mapa é o mundo que ninguém mapeou ainda. Isso explica as ruínas na água
(Pântano das Ruínas), as tumbas sob as montanhas (Cripta) e por que cada terra virou um bioma diferente.

**De onde vem o nome:** o Pântano do Kosaradius é o primeiro lugar que os sobreviventes mapearam depois da Maré, e
o brejo deu nome ao mundo. Por isso o jogo começa ali e o cenário mantém o nome (decisão do Leonardo: não renomear).

| Região | Geografia | Cenário | Estado |
|---|---|---|---|
| **Verdemar** (continente do sul, onde começa) | floresta alagada, brejos, ciprestes | 🐸 Pântano do Kosaradius | aberto |
| Verdemar, serra do norte | montanhas, tumbas do império | 🏚️ Cripta | abre com Grumak |
| **Solária** (continente do leste) | deserto, dunas, oásis | 🏜️ Mar de Areia | abre com o Dragão jovem |
| **Arquipélago Afundado** (oeste) | ilhas, ruínas na água | 🌿 Pântano das Ruínas | abre com o Verme da Areia |
| Gelo de Hrimfal (polo norte) | tundra, geleiras | — | névoa |
| Ilha de Cinza | vulcão, lava | — | névoa |
| Cidadela Caída (ilha central) | capital do império, castelo | — | névoa (candidata a mapa final) |

Mar ocupando cerca de 70% do desenho; trilhas tracejadas em terra, rota de barco pontilhada no mar.

**Nome do mundo no mapa:** "Kosaradius" em marca d'água no fundo, laranja claro e bem transparente (`#e07a2c` a ~25%),
em letras médio-grandes (~42 px a 412 px de largura) num arco convexo, no mar entre Solária e Verdemar, que aparece na
tela inicial. Fica por cima do mar e das terras, mas por baixo das trilhas, dos pontos e dos nomes, e não recebe toque.

## 4. Como funciona na tela

1. **Batalhas** abre o mapa já rolado até o último ponto aberto da classe escolhida, com o herói em cima dele.
2. Tocar num ponto: o herói anda (ou navega) até ele em ~1 s e sobe a **ficha** de baixo (bottom sheet), no alcance
   do polegar: nome, arte do cenário (os SVGs de `MAP_ART`), boss, dificuldade ★, tempo, jogadores, estrela ganha ou
   não, e os botões **Jogar sozinho** e **Criar sala** (☁️ Nuvem / 📱 Meu aparelho, como hoje).
3. Ponto bloqueado: cadeado e, na ficha, "Derrote <boss> em <cenário> com o <classe>". Os botões ficam desligados,
   mas as salas abertas daquele cenário continuam acessíveis (convidado).
4. **Salas abertas (N)**: botão fixo no alto do mapa; abre a lista de hoje. Cada ponto mostra 👥 N quando há salas.
5. Regiões em névoa: tocar mostra "Terra não mapeada" (sem ficha).
6. Trocar de classe no menu troca os pontos abertos e as estrelas.

## 5. Técnica

**Cliente (fases 1 e 2)**
- `apps/client/src/worldMap.ts`: o mapa (SVG grande num contêiner com rolagem vertical), os pontos, a ficha e o
  herói. A arte fica em `apps/client/src/art/world/` (texto SVG fixo, como `MAP_ART`).
- Catálogo dos pontos (posição, região, trilha até o próximo, trecho de mar) **no cliente**, fora de `maps.ts`, para
  não mudar o `RULES_VERSION`.
- Herói anda com `SVGPathElement.getPointAtLength` pela trilha (`TRAILS` em `worldMap.ts`, um trecho por par de
  pontos vizinhos de `ROUTE`): a jornada é uma linha só e a posição do herói é a distância andada nela. Nos trechos de
  mar troca o sprite pelo barco onde a rota sai das terras (`isPointInFill` nas costas `.wm-terra`).
- O lobby (`lobby.ts`) perde os cartões de cenário (`renderMapPicker`); `createMapId()` passa a vir do ponto tocado.
- Pergaminho com textura feita por filtro SVG (`feTurbulence`) pode pesar em celular fraco: renderizar a textura uma
  vez numa imagem (canvas → `ImageBitmap`) e medir a rolagem a 60 fps num Android de entrada.

**Desbloqueio (fase 3)**
- `packages/shared/src/world.ts`: `WORLD_ORDER` (ordem dos cenários) e `mapUnlocked(clears, mapId)`. Não entra em
  `RULES_FILES`: o cliente desatualizado não quebra a hunt.
- Banco: tabela `profile_map_clears (profile_id, class_id, map_id, first_at)`, só leitura para o dono. A ordem repete
  `WORLD_ORDER` numa função SQL (mude os dois juntos, como `map_bosses`).
- Crédito: quando o boss principal morre (no Pântano das Ruínas, Hidra ou Dragão negro), cada humano que está na hunt
  (vivo ou morto, sem ter saído) ganha o crédito do mapa. Novo campo em `RunStats` (`bossClear`) para a telemetria.
  O servidor grava por `finish_run`; a hunt solo e a sala no aparelho, por `finish_solo_run` (`p_report.map_clear`,
  aceito só se o mapa for o da hunt). No Mar de Areia o Verme fica na caverna: a morte dele conta igual.
- Bloqueio aplicado no banco: `start_solo_run` recusa mapa bloqueado para quem cria; o servidor de jogo recusa criar
  sala na nuvem de mapa bloqueado para o líder.
- Contas atuais: a migration preenche `profile_map_clears` a partir de `profile_boss_runes` (quem levou a runa do
  boss com a classe matou o boss com ela).

## 5b. Continente Verdemar grande (decidido em 24/10)

O continente principal cresce e passa a concentrar os cenários; o mapa deixa de rolar só na vertical.

| Tema | Decisão |
|---|---|
| Escala | Verdemar com **10× a área** de hoje (~1100×1430 no desenho, ~3 telas de largura × 1,5 de altura no zoom de hoje) |
| Navegação | **arrastar em qualquer direção + pinça para zoom**, do continente inteiro na tela até o tamanho de hoje; abre centrado no herói; botão 📍 volta para ele |
| Cenários | os **4 entram no continente**, cada um numa área: floresta, ruínas, deserto e costa alagada |
| Disposição | "volta no continente": floresta no sudoeste (começo), ruínas na serra do norte, deserto no leste, costa alagada no oeste; a trilha cruza o centro numa encruzilhada. Cada área tem espaço para 2 ou 3 pontos futuros |
| Em volta | mar nas bordas, com as terras em névoa (Gelo de Hrimfal, Ilha de Cinza, Cidadela Caída) como cenários futuros; barco só quando houver cenário fora do continente |
| Nomes | o continente inteiro é **Verdemar**; áreas: **Floresta do Kosaradius** (🐸 Pântano do Kosaradius), **Serra das Tumbas** (🏚️ Cripta), **Solária** (🏜️ Mar de Areia), **Costa Afundada** (🌿 Pântano das Ruínas) |
| Execução | maquete navegável para aprovar no celular antes de mexer no jogo; depois, branch nova a partir do `main` com o #137 |

Impacto técnico previsto: `worldMap.ts` troca a rolagem vertical por câmera própria (translate + scale, ponteiros para
arrasto e pinça, sem a rolagem do navegador); pontos e herói ficam em camada HTML com tamanho fixo na tela (não
encolhem com o zoom); `TRAILS`, `WORLD_POINTS` e a arte mudam de coordenadas. A história da seção 3 muda: Solária e o
Arquipélago Afundado deixam de ser continentes e viram áreas de Verdemar.

## 6. Riscos

1. **Começo pesado por classe.** O primeiro ponto é o Kosaradius: 10 min, o maior mapa, só sozinho. Cada classe nova
   precisa vencer o Grumak sozinha antes de criar sala na Cripta. Antes de ligar o bloqueio, olhar na telemetria a
   taxa de vitória sobre o Grumak por classe; se for baixa, trocar o primeiro ponto pela Cripta ou abrir os dois.
2. **Convidado em sala do aparelho.** Na sala no aparelho, o "sou convidado" vem do cliente; um jogador adulterado
   poderia jogar um mapa bloqueado. Ganho pequeno (o loot segue os limites da hunt solo): aceitável.
3. **Mapa vazio.** Só 4 pontos num planeta. A névoa com nomes e desenhos (gelo, vulcão, cidadela) precisa parecer
   promessa, não buraco. Validar na maquete.
4. **Salas escondidas.** Sem o contador e o botão fixo, o multijogador some atrás do mapa. Os dois entram na fase 1.
5. **Arrasto e pinça no celular.** Câmera própria precisa competir com o gesto de voltar do sistema e com a
   rolagem da ficha; testar em Android e iPhone. No zoom mínimo, nomes de área precisam continuar com 13 px ou mais.
6. **Retrato e texto pequeno.** Nomes no mapa com fonte mínima de 13 px a 412 px de largura; pontos com área de toque
   de 44 px.

## 7. Fases

| Fase | Entrega | Mexe em |
|---|---|---|
| 0 | maquete HTML (pergaminho, pontos, névoa, ficha) para aprovar | nada no jogo |
| 1 | mapa estático com os 4 pontos, ficha, salas abertas; substitui os cartões; tudo aberto | cliente · **feito** |
| 2 | herói andando, barco no mar, névoa com nomes | cliente · **feito** |
| 3 | desbloqueio por classe, estrela, crédito do boss, migration e preenchimento das contas atuais | shared, servidor, banco |
| 4 | cenários novos nas regiões em névoa (gelo, vulcão, cidadela), cada um um projeto à parte | tudo |
