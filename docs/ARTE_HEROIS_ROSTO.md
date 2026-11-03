# Heróis com tom heroico e sério — rosto, proporção e retrato do menu

Os heróis da arte nova (`apps/client/src/art/proto/tibiaHero.ts`) pareciam bonecos amigáveis: cabeça grande e redonda,
bochecha corada, pele de plástico, olho sem expressão, mãos de luva e pés juntos. Este documento registra a
mudança para um tom **heroico e sério** (estilo Baldur's Gate, sem chegar ao grotesco) e o **retrato de busto** do
menu. Tudo é cliente: sem regra de jogo, sem `RULES_VERSION`, sem migration.

Antes (em cima) e depois (embaixo), sem equipamento: `docs/arte/herois-rosto-antes-depois.png`.
Retratos do menu (sem equipamento e com 4 conjuntos): `docs/arte/herois-retratos.png`. Medalhões no celular, antes e
depois do ajuste de nitidez e moldura: `docs/arte/herois-medalhoes-antes-depois.png`. Xamã Orc de perto (retratos e as 3 direções): `docs/arte/xama-orc-rosto.png`.

## Duas imagens por herói

| Imagem | Onde | Tamanho na tela | Função |
|---|---|---|---|
| Sprite do jogo (`heroSheet`) | hunt, mapa-múndi, palco da página Heróis, prévia do equipamento | ~60 px | silhueta, proporção, postura |
| Retrato de busto (`heroPortrait`) | medalhões de Heróis e Grimório, sala de espera | 44–80 px | rosto, expressão, elmo |

O retrato **não é um segundo desenho**: é a mesma figura parada de frente, vestida, redesenhada 2× maior em volta do
rosto (`protoPortraitData`). As formas e a luz são amostradas na resolução nova; os detalhes desenhados à mão (olhos,
sobrancelha, costuras) viram blocos do tamanho certo (`Canvas.blocks`). Por isso elmo, capuz, armadura e cosméticos
aparecem no retrato sem nenhum desenho a mais, e retrato e sprite nunca divergem: o equipamento do retrato é sempre o
vestido. Sem a arte nova, o retrato é o quadro parado de frente, como antes.

Regras do retrato (ajuste de apresentação):

- **Ampliação inteira** (`PORTRAIT_ZOOM = 2`): com 1,7 os detalhes à mão viravam blocos de 1 e de 2 pixels
  misturados, o que dava o aspecto tosco.
- **Enquadramento:** rosto a 55% da altura (`PORTRAIT_FACE_Y`), para penacho, chapéu e chifres caberem; o peito é
  cortado embaixo.
- **Nitidez:** o retrato de 128 px sai ampliado 2× em pixel duro (`heroPortrait`, 256 px), e o navegador só *reduz*
  para o medalhão (`image-rendering: auto` em `.hero-bust`). Ampliar 128 px com suavização num celular de tela densa
  deixava o retrato borrado.
- **Rosto na resolução do retrato** (`portraitFace` e `portraitOrcFace`, ligados por `Canvas.portrait`): no retrato,
  olhos, sobrancelhas, nariz, boca, cicatriz, pintura, barba rala e brilho do cabelo não são os pixels do sprite
  ampliados em bloco; são formas desenhadas na resolução final (`Canvas.detail`, em unidades, tom fixo, só sobre as
  peças dadas). Olho em amêndoa com cílio grosso, pálpebra pesada sobre a íris, íris com pupila e brilho; sobrancelha
  em fios, mais grossa perto do nariz; nariz com dorso claro, sombra do lado de lá e narinas; boca reta com os cantos
  para baixo e o lábio de baixo com luz. O orc tem os seus: crista pesada com sombra funda, olhos de brasa, focinho
  largo, presas curvas. O sprite do jogo não muda (o `portrait` só liga no retrato). Antes e depois:
  `docs/arte/herois-rosto-retrato.png`.
- **Cabelo do retrato** (`portraitLocks`, `fineHair` em `headFront`): a calota deixa de ser uma elipse lisa (parecia
  elmo) e ganha o volume das mechas em ondas no alto; a franja cai em pontas finas penteadas para um lado (no
  paladino, por baixo da faixa, que vira forma com costura e rebites); as mechas saem do redemoinho com o vão escuro,
  o meio claro e fios finos (`Canvas.shift`, que só muda o tom e deixa a luz da forma); nos cabelos que caem dos lados,
  mechas largas quase retas; a risca do druida é uma linha fina. A pele do retrato não tem pontilhado (o xadrez na
  resolução do retrato parecia sujeira no rosto). Antes e depois: `docs/arte/herois-cabelo-retrato.png`.
- **Elmos de guerra** (`cap2`, `cap4`): o coríntio de bronze deixou de ser uma elipse lisa sobre o rosto (o "ovo"):
  calota redonda, abas da bochecha retas terminando em ponta e o recorte em T (`corinthOpen`: olhos em amêndoa largos
  ligados à fenda da boca); no retrato, bordas claras e escuras em volta do recorte, sobrancelhas gravadas, aresta do
  protetor de nariz, sombra do elmo no rosto dentro das aberturas e brilho do bronze (`corinthEdges`). O barril de
  mithral ganhou duas faces planas que se encontram na quilha, a calota fechando em esfera e, no retrato, fenda dos
  olhos funda, placa da testa com rebites, respiros com sombra e borda virada (`barrelDetail`). O formato vale para o
  sprite também (retrato e jogo continuam o mesmo item); os detalhes finos, só no retrato. No retrato o pontilhado do
  metal e dos tecidos cai para 0,3 (o xadrez grosso nas faces lisas parecia ruído). Antes e depois:
  `docs/arte/herois-elmos-retrato.png`.
- **Moldura** (`.grim-hero-frame` em `style.css`): o busto preenche a largura e sai pela base do arco; luz da classe
  atrás da cabeça, vinheta nas bordas, aro de metal com luz em cima e a silhueta contornada na cor da classe.

## O que mudou no sprite (só nos heróis: os humanoides sem `build` ficam como estavam)

| Antes | Agora | Onde |
|---|---|---|
| Cabeça com ~27% do corpo | cabeça (com cabelo, chapéu e elmo) 0,88× em volta do pescoço | `Build.head`, `headScale` |
| Rosto elíptico 8,6 × 9 | crânio redondo, mandíbula que afina até um queixo largo e reto, face funda abaixo da maçã; no perfil, frente reta e só a mandíbula corta para trás | `faceShape` |
| Bochecha corada (`Mat.Lip`) | maçã do rosto com luz e sombra de osso | `headFront`, `headSide` |
| Pele macia e saturada (contraste 0,75) | pele menos saturada, contraste 0,95, pouco desvio de matiz (`skinShift`) e luz dura (`grim` 1,12) | `HERO_SKIN`, `HERO_GRIM`, `ProtoLook.skinShift` |
| Olho grande com branco | sobrancelha grossa e baixa, sombra da órbita, pálpebra pesada, íris escura de 2 linhas | `headFront` |
| Boca com lábio claro | linha fina e reta, cantos para baixo | `headFront` |
| Mão redonda maior que o antebraço | punho menor e mais quadrado | `hand(…, hero)` |
| Pés juntos | pés afastados 1,6 unidade de cada lado | `front` (`spread`) |
| Ombros da largura do quadril (corpo reto de boneco) | ombros e peito 12% mais largos, em V (de frente e de costas) | `HERO_SHOULDERS`, `Canvas.flared` |
| Xamã Orc: rosto humano pintado de verde, com cabelo comprido | cabeça de orc do D&D própria: careca com cicatriz, crista da testa pesada, olhos de brasa sem branco, nariz achatado de focinho, queixo projetado, presas subindo da mandíbula de baixo, orelhas pontudas com argola de osso, pintura de guerra da testa ao queixo | `orcHeadFront`, `orcHeadSide`, `orcHeadBack` |

Os ombros largos não redesenham nada: `Canvas.flared` alarga na horizontal só a faixa dos ombros e do peito (com
transição suave para o pescoço e para a cintura), por cima de tudo o que é desenhado ali, então tronco, armadura,
ombreira e braço alargam juntos e a cabeça fica de fora. De perfil não alarga (seria profundidade do peito).

A cabeça é reduzida em volta do pescoço, então os encaixes dos itens (centro da cabeça, pescoço, ombros) não mudaram:
os ~140 desenhos de equipamento continuam no lugar, conferidos com `heroiPrevia.ts` (parado, andar e ação).

## Ver e testar

- Sprites: `npx tsx apps/client/scripts/heroiPrevia.ts /tmp/herois.png 4` (`andar` ou `acao` no fim para os outros quadros).
- Retratos: `npx tsx apps/client/scripts/retratoPrevia.ts /tmp/retratos.png 2` (5 conjuntos × 5 classes); no menu, os
  medalhões de Heróis e do Grimório.

## Próximos passos possíveis

- Retrato: chapéus e capuzes arcanos, ombreiras e peitorais vistos de perto, uma família por vez, sempre fiéis ao item
  vestido; a cabeça do orc (costuras e cicatriz do couro cabeludo, faixa de pintura) ainda é a do sprite.

- Braços menos cilíndricos (deltoide e antebraço com forma própria).
- Os heróis no motor de escultura (`sculpt.ts`), no nível do Orc batedor e do Vorgak: teto bem maior, mas reescreve os
  desenhos de itens de `tibiaHero.ts`. Só se este passo não bastar.
