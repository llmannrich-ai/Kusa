# Heróis com tom heroico e sério — rosto, proporção e retrato do menu

Os heróis da arte nova (`apps/client/src/art/proto/tibiaHero.ts`) pareciam bonecos amigáveis: cabeça grande e redonda,
bochecha corada, pele de plástico, olho sem expressão, mãos de luva e pés juntos. Este documento registra a
mudança para um tom **heroico e sério** (estilo Baldur's Gate, sem chegar ao grotesco) e o **retrato de busto** do
menu. Tudo é cliente: sem regra de jogo, sem `RULES_VERSION`, sem migration.

Antes (em cima) e depois (embaixo), sem equipamento: `docs/arte/herois-rosto-antes-depois.png`.
Retratos do menu (sem equipamento e com 4 conjuntos): `docs/arte/herois-retratos.png`.

## Duas imagens por herói

| Imagem | Onde | Tamanho na tela | Função |
|---|---|---|---|
| Sprite do jogo (`heroSheet`) | hunt, mapa-múndi, palco da página Heróis, prévia do equipamento | ~60 px | silhueta, proporção, postura |
| Retrato de busto (`heroPortrait`) | medalhões de Heróis e Grimório, sala de espera | 44–80 px | rosto, expressão, elmo |

O retrato **não é um segundo desenho**: é a mesma figura parada de frente, vestida, redesenhada 1,7× maior em volta do
rosto (`protoPortraitData`). As formas e a luz são amostradas na resolução nova; os detalhes desenhados à mão (olhos,
sobrancelha, costuras) viram blocos do tamanho certo (`Canvas.blocks`). Por isso elmo, capuz, armadura e cosméticos
aparecem no retrato sem nenhum desenho a mais, e retrato e sprite nunca divergem. Sem a arte nova, o retrato é o quadro
parado de frente, como antes. O retrato tem 128 px e é reduzido no medalhão com `image-rendering: auto` (`.hero-bust`),
porque o `pixelated` serrilha ao diminuir.

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
| Pintura do Xamã Orc parecia blush | riscos finos e escuros cruzando o olho | `headFront`, `headSide` |

A cabeça é reduzida em volta do pescoço, então os encaixes dos itens (centro da cabeça, pescoço, ombros) não mudaram:
os ~140 desenhos de equipamento continuam no lugar, conferidos com `heroiPrevia.ts` (parado, andar e ação).

## Ver e testar

- Sprites: `npx tsx apps/client/scripts/heroiPrevia.ts /tmp/herois.png 4` (`andar` ou `acao` no fim para os outros quadros).
- Retratos: `protoPortraitData(classe, equipamento)` em `tibiaHero.ts`; no menu, os medalhões de Heróis e do Grimório.

## Próximos passos possíveis

- Ombros mais largos e braços menos cilíndricos (mexe no tronco e nas armaduras: pede conferir item por item).
- Os heróis no motor de escultura (`sculpt.ts`), no nível do Orc batedor e do Vorgak: teto bem maior, mas reescreve os
  desenhos de itens de `tibiaHero.ts`. Só se este passo não bastar.
