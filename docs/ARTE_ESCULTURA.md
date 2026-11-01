# Arte esculpida por código — protótipo (Escorpião da Areia)

Teste de até onde a arte de monstro feita **só por código** chega, como alternativa às folhas geradas por IA
(`docs/arte/cripta/`). Só na Arte nova (`Settings.newArt`); com ela desligada fica a arte antiga.

| Monstro | Modelo | Comparação |
|---|---|---|
| Escorpião da Areia e Escorpião Negro Gigante (mesmo modelo, outra casca) | `proto/scorpion.ts` | `docs/arte/escorpiao-escultura.png` |
| Abutre Gigante (voa: pena, asa e voo) | `proto/vulture.ts` | `docs/arte/abutre-escultura.png` |

As folhas saem por `proto/sculptArt.ts` (`sculptArt(poses, shoot)`): para um bicho novo, basta o modelo, a câmera e as
poses de cada clipe.

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
| Tempo por figura, celular simulado (CPU 4× mais lenta) | ≈ 31 ms o escorpião, ≈ 35 ms o abutre (≈ 1,2–1,3 s por monstro, espalhado) | — |
| Memória (textura) | ≈ 2,5 MB | ≈ 1,7–3 MB |
| Variante (outra cor, outro tamanho) | trocar a paleta: 0 KB | outra folha |
| Consistência entre quadros | exata (mesmo modelo) | varia (a IA redesenha) |

## 2º piloto: Orc batedor (o primeiro humanoide)

`apps/client/src/art/proto/orc.ts` (modelo e poses) e `orcArt.ts` (quadros no jogo), a partir do desenho da folha de
IA `docs/arte/pantano-do-kosaradius/orcScout-A.png` (que saiu do jogo: o batedor não baixa mais PNG nenhum). Folha:
`docs/arte/orc-batedor-escultura.png`.

- **Esqueleto em hierarquia**: pelve → tronco → cabeça (mandíbula, orelhas, moicano) e braços (ombro → cotovelo →
  punho → faca); pernas por cinemática inversa (o pé fica no chão, o joelho dobra para a frente). Cada pose é uma
  lista de ângulos (`OrcPose`).
- **Motor** (`sculpt.ts`), 4 recursos novos e opcionais: pintura presa à forma (`paint`: pintura de guerra, alça,
  sangue na lâmina), brilho próprio (`glow`: os olhos acesos na sombra), luz de recorte (`rim`: a borda de trás
  separa do chão escuro do brejo) e a força das linhas internas (`lines`).
- **Movimento fino**: o parado respira (peito e ombros), passa o peso de um pé para o outro, pisca, dá um tique na
  orelha e gira a faca na mão; o andar tem os 8 tempos do passo (contato, descida, passagem, subida), a pelve quica e
  gira, os ombros giram ao contrário, a cabeça amortece o quique; o golpe tem antecipação, estocada, exagero, volta e
  assentar; na morte a faca escapa, gira no ar e para no chão. Moicano, rabo de cabelo, orelhas e as tiras da tanga
  seguem com atraso (follow-through) em todos os clipes.
- **Peso**: 43 figuras de 136 px (≈ 3 MB de textura, contra 0,5 MB das 6 figuras da folha de IA, que só tinha parado e
  andar), 0 KB baixados, ≈ 9 ms por figura no PC, desenhadas uma por vez no começo da hunt. Os quadros repetidos
  (o especial usa o golpe; frente e costas paradas vão e voltam) não ocupam memória a mais.
- Prévia: `npx tsx apps/client/scripts/orcPrevia.ts /tmp/orc.png 3`; no jogo:
  `/mapa.html?mapa=marsh&bichos=orcScout,orcGrunt`.

## Limites (o que a IA ainda faz melhor)

- **Textura pintada**: sujeira, desgaste, pelos, cicatrizes. O esculpido tem granulado e brilho, mas parece mais
  "limpo". Funciona melhor em bichos de casca, osso, pedra, gosma (insetos, esqueletos, golems, elementais).
- **Rostos e roupas** (humanoides): o orc batedor mostrou que dá para um humanoide de pele à mostra (rosto pela
  silhueta: testa, focinho, presas, orelhas e olhos acesos). Tecido solto, cota de malha e armadura detalhada ainda
  ficam melhores na IA.
- **Custo de autoria**: o escorpião levou um modelo de ~250 linhas; cada criatura nova é um modelo, mas o motor e as
  poses-padrão (andar, golpe, morte) se reaproveitam.

## Ver e testar

- Folha em PNG, sem navegador: `npx tsx apps/client/scripts/esculturaPrevia.ts /tmp/bicho.png 3 [escorpiao|negro|abutre]`
  (mostra também o tempo por quadro).
- No jogo, com o cenário de verdade e o mesmo posicionamento da hunt:
  `npm run dev:client` → `/mapa.html?mapa=desert&bichos=giantVulture,sandScorpion,blackScorpion,goblin,giantSpider,stirge&antigo=1`.
