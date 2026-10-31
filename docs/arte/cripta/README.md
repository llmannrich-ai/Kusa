# Cripta — inimigos com arte gerada por IA

Folhas geradas com os prompts de `docs/arte/agente/CRIPTA.md` (fila e status em `cripta.json` e `cripta-status.csv`),
guardadas aqui em WebP sem perda (os mesmos pixels do PNG, metade do tamanho):

- `<kind>-A.webp` (giro): 2 linhas × 6, parado e andando; colunas: frente, 3/4 de frente, perfil para a esquerda,
  3/4 de costas, costas, 3/4 de costas para a direita.
- `<kind>-B.webp` (ação): 4 linhas × 4, tudo de perfil para a esquerda: andar (4), golpe (4), especial (4) e morte (3).
  Alguns têm uma 5ª linha (`B_EXTRA_ROW` no script): ela é lida e fica de fora até o jogo ter clipe para ela.

Processadas por `apps/client/scripts/criptaSprites.py <kind>`, que grava `apps/client/src/art/proto/cripta/<kind>.png`
(21 figuras: as 6 da A que o jogo usa e as 15 da B, paleta de 256 cores). O jogo pega sozinho todo PNG daquela pasta
(`art/proto/criptaArt.ts`): monstro com folha usa a arte nova em todos os mapas em que aparece; sem folha, continua com
o desenho por código. Diferente do Kosaradius, aqui o andar, o golpe, o especial e a morte são todos desenhados.

| Monstro | Folhas | Quadro | Memória | Observação |
|---|---|---|---|---|
| Ratazana (`rat`) | A e B | 176 px | ~2,5 MB | branco entre as pernas limpo |
| Kobold (`kobold`) | A e B | 128 px | ~1,3 MB | |
| Estirge (`stirge`) | A e B | 176 px | ~2,5 MB | voa: cada figura com o próprio pé na linha (`FLYERS`) |
| Esqueleto (`skeleton`) | A e B | 176 px | ~2,5 MB | caveira solta da morte juntada à figura; branco entre os ossos limpo |
| Aranha gigante (`giantSpider`) | A e B | 160 px | ~2,1 MB | B veio com o xadrez de "transparente" pintado: limpo; a teia é o especial |
| Goblin arqueiro (`goblinArcher`) | A e B | 144 px | ~1,7 MB | |
| Esqueleto arqueiro (`skeletonArcher`) | A e B | 176 px | ~2,5 MB | |
| Bugbear chefe (`bugbear`) | A e B | 224 px | ~4,0 MB | substitui a arte de referência; o especial é o Golpe Brutal; a 5ª linha (emboscada) fica de fora |
| Cubo Gelatinoso (`gelatinousCube`) | A e B | 176 px | ~2,5 MB | o especial é o Engolfar; a 5ª linha (cuspida) fica de fora |

## O que o script corrige sozinho

- **Fundo:** o claro sem cor que encosta no transparente (ou forma um buraco grande dentro da figura) vira
  transparência. Pega o branco entre ossos e pernas e o xadrez pintado; o branco pequeno (dentes, brilho) e a teia
  (com cor) ficam.
- **Peça solta:** se uma figura da B se parte em duas linhas (a caveira voando), a peça vai para a figura mais perto.
- **Escala:** a altura do perfil parado da A é `HEIGHT` do monstro (o tamanho de hoje no jogo); a B vai para a escala
  da A pela área do andar de perfil (a altura engana: cauda curvada, asas).
- **Quadro:** o menor múltiplo de 16 que cabe a figura mais alta e a mais larga; a figura larga encosta na borda.

## Memória no celular

Só os monstros do mapa da hunt são preparados (`warmMapMonsters` em `textures.ts`). Cada monstro tem 21 figuras
distintas: figuras × lado² × 4 bytes. Os 9 acima somam ~22 MB.
