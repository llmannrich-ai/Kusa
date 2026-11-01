# Arte esculpida por código — protótipo (Escorpião da Areia)

Teste de até onde a arte de monstro feita **só por código** chega, como alternativa às folhas geradas por IA
(`docs/arte/cripta/`). Só na Arte nova (`Settings.newArt`); com ela desligada fica a arte antiga.

| Monstro | Modelo | Comparação |
|---|---|---|
| Escorpião da Areia e Escorpião Negro Gigante (mesmo modelo, outra casca) | `proto/scorpion.ts` | `docs/arte/escorpiao-escultura.png` |
| Abutre Gigante (voa: pena, asa e voo) | `proto/vulture.ts` | `docs/arte/abutre-escultura.png` |
| Múmia (humanoide: ataduras, ouro e lápis, olhos que acendem) | `proto/mummy.ts` | `docs/arte/mumia-escultura.png` |

As folhas saem por `proto/sculptArt.ts` (`sculptArt(poses, shoot)`): para um bicho novo, basta o modelo, a câmera e as
poses de cada clipe.

**Humanoides** (múmia): esqueleto por ângulos (quadril, joelho, ombro, cotovelo), e o pé mais baixo encosta sozinho no
chão; a linha do chão fica mais baixa no quadro (`sculptArt(..., feet)`), porque nada desce abaixo dela.

**Recursos do motor** (todos opcionais, por material ou por `Look`):
- `Material.wrap`: ataduras em espiral, cada faixa num tom, com o vinco entre elas e pedaços faltando (mostra o
  material de baixo, a carne seca);
- `Material.emit`: brilho próprio (os olhos verdes do Olhar Pavoroso), sem luz nem sombra;
- `Look.shadow`: sombra projetada de uma parte na outra (braço no tronco), por mapa de sombra visto da luz;
- `Look.rim`: luz de contorno do lado oposto à luz, que destaca o bicho da areia.
A múmia usa os quatro; o escorpião e o abutre ainda não (ficaram iguais pixel a pixel).

**Voadores** (abutre): o corpo é desenhado já pairando acima do chão (o jogo só balança 3 px) e o perfil fica em
três-quartos (giro de 40°): de lado, a asa aberta vira uma faixa vertical. As asas são montadas pena a pena (cobertas,
secundárias e primárias em leque); `Material.lineDepth` baixo separa as penas finas umas das outras.

## Como funciona

1. **Escultura** (`apps/client/src/art/proto/sculpt.ts`): o bicho é montado com formas 3D simples — elipsoides e
   cones arredondados (que dão esferas e cápsulas). Anatomia em `proto/scorpion.ts`: carapaça, olhos, quelíceras,
   pinças com o dedo móvel, 8 patas por cinemática inversa, 7 placas, 5 gomos de cauda, vesícula e ferrão.
2. **Pose**: cada quadro é só um conjunto de ângulos (`Pose`): passo das patas (marcha tetrápode), curva da cauda,
   abertura das pinças, inclinação, rolar o corpo na morte.
3. **Foto em pixel art**: raio por pixel com interseção exata, luz de cima à esquerda (como o resto do jogo), oclusão
   pela profundidade, luz quente rebatida da areia, brilho na quitina, granulado em relevo preso à forma, rampas de cor
   à mão com matiz deslocado, pontilhado só nas transições, contorno colorido por fora e linhas onde uma parte passa
   na frente da outra.
4. **No jogo** (`proto/sculptArt.ts`, `bestiary.ts`): mesma ordem de quadros das folhas da Cripta (parado, andar,
   golpe, especial, morte, frente e costas). Cada figura é desenhada no aparelho quando a hunt pede, uma por vez
   (`hdStep`), e só nos mapas que têm o bicho. `MonsterAnim.origin` diz onde fica o apoio no quadro (a vista é de
   cima: as pinças de frente descem abaixo da base do tile).

## Números

| | Esculpido (código) | Folha de IA (Cripta) |
|---|---|---|
| Download | 0 (≈ 20 KB de código no bundle) | 100–570 KB de PNG por monstro |
| Figuras por monstro | 30 (todas diferentes) | 21 |
| Tempo por figura, PC | ≈ 9 ms | decodificar o PNG |
| Tempo por figura, celular simulado (CPU 4× mais lenta) | ≈ 31 ms o escorpião, ≈ 35 ms o abutre, ≈ 32 ms a múmia (≈ 1,1–1,3 s por monstro, espalhado) | — |
| Memória (textura) | ≈ 2,5 MB | ≈ 1,7–3 MB |
| Variante (outra cor, outro tamanho) | trocar a paleta: 0 KB | outra folha |
| Consistência entre quadros | exata (mesmo modelo) | varia (a IA redesenha) |

## Limites (o que a IA ainda faz melhor)

- **Textura pintada**: sujeira, desgaste, pelos, cicatrizes. O esculpido tem granulado e brilho, mas parece mais
  "limpo". Funciona melhor em bichos de casca, osso, pedra, gosma (insetos, esqueletos, golems, elementais).
- **Rostos e roupas** (humanoides): formas 3D simples não dão expressão nem tecido solto. A múmia funciona porque é
  "roupa justa" (ataduras); um goblin de capa e cara expressiva ainda pede a IA.
- **Custo de autoria**: o escorpião levou um modelo de ~250 linhas; cada criatura nova é um modelo, mas o motor e as
  poses-padrão (andar, golpe, morte) se reaproveitam.

## Ver e testar

- Folha em PNG, sem navegador: `npx tsx apps/client/scripts/esculturaPrevia.ts /tmp/bicho.png 3 [escorpiao|negro|abutre|mumia]`
  (mostra também o tempo por quadro).
- No jogo, com o cenário de verdade e o mesmo posicionamento da hunt:
  `npm run dev:client` → `/mapa.html?mapa=desert&bichos=mummy,zombie,giantVulture,sandScorpion,blackScorpion,goblin,giantSpider,stirge&antigo=1`.
