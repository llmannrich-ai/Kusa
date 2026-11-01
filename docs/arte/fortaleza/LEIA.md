# Planta da Fortaleza Orc (fase 1, rascunho para aprovação)

- `planta.txt`: o mapa, um caractere por tile (84×128). Legenda na imagem e em `desenhar_imagem.py`.
- `planta.json`: entrada, zonas de combate (na ordem), campinas, salas com telhado, torre de menagem, portões.
- `planta.png`: a planta desenhada (`python3 docs/arte/fortaleza/desenhar_imagem.py`).

Depois de aprovada, a planta entra em `packages/shared/src/dungeon.ts` (o gerador da Fortaleza passa a ler o
desenho) e esta pasta fica só com a imagem.

## Folhas de sprites do ChatGPT

| Folha | Original | No jogo | Estado |
|---|---|---|---|
| Acampamento orc | `acampamento.png` | `apps/client/src/art/proto/fortaleza/acampamento.png` + `.json` | ✅ tendas (a do chefe no pátio do esporão), totens, estandartes (também no terraço), fogueiras, paliçada de leste a oeste, armas, caldeirão, lenha, ossos, barris. A jaula ainda não tem lugar |
| Chão C1: capim | `chao-capim.png` (1254 px, emenda nos 4 lados) | `apps/client/src/art/proto/fortaleza/chao-capim.webp` (1024 px, 8×8 tiles, cor média puxada 70% para a do capim antigo, para casar com as bordas pintadas pelo jogo) | ✅ a vila, os pátios e o vale lá embaixo |
| Chão C2: basalto | `chao-basalto.png` (1254 px) | `chao-basalto.webp` (4×4 tiles, pedras menores, escolha do Leonardo; a comparação com 8×8 está em `no-jogo-basalto-A-B.png`) | ✅ a estrada, as ruas e o calçamento quebrado dos pátios |
| Chão C3: terra | `chao-terra.png` (1254 px) | `chao-terra.webp` (4×4 tiles, cor média puxada 40% para a terra antiga) | ✅ os acampamentos; o capim cobre a beira dela como cobre a do calçamento |
| Chão C4: lajes | `chao-lajes.png` (1254 px) | `chao-lajes.webp` (4×4 tiles: cada laje com ~1 tile de largura e meio de altura; a cor quase não muda, o travertino creme é o pedido) | ✅ o pátio do esporão e o terraço da torre de menagem (o terraço num tom mais frio e escuro, para se separar do pátio) |

Para refazer depois de trocar o original: `python3 apps/client/scripts/fortalezaSprites.py acampamento` (ou
`chao-capim`; os chãos ficam em `CHAOS`) (tira o magenta e o
halo rosado, separa os objetos pela célula da grade e põe cada um na largura do jogo, em `FOLHAS`).

## Bordas

O capim do ChatGPT cobre a beira do calçamento (basalto e lajes): uma camada com a textura do capim repetida no mundo
(alinhada com os tiles de capim) é vista só por uma máscara com o formato das bordas (`grassMask` em `fortressArt.ts`:
lóbulos de 25% a 45% do tile e tufos), no filtro de máscara do Phaser 4. A máscara é desenhada em **meia resolução**
(no iPhone, em 3x, a máscara do tamanho da tela pesava ~19 MB: 67 MB no total contra 48 dos Portões), vista por uma
câmera invisível de meio tamanho que acompanha a principal; ela é uma `TilemapGPULayer` (sem frestas entre tiles), com
um atlas próprio sem margem e o quadro 0 vazio, e os tiles de capim em volta da borda levam a máscara cheia (a fresta
que sobrar mostra o capim de baixo). A borda é o próprio capim do vizinho, sem
degrau de tile (`no-jogo-bordas.png`). A terra do acampamento e as lajes ganham o mesmo quando as texturas delas
chegarem.
