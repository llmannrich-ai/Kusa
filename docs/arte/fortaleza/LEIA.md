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

Para refazer depois de trocar o original: `python3 apps/client/scripts/fortalezaSprites.py acampamento` (ou
`chao-capim`; os chãos ficam em `CHAOS`) (tira o magenta e o
halo rosado, separa os objetos pela célula da grade e põe cada um na largura do jogo, em `FOLHAS`).
