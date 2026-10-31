# Planta da Fortaleza Orc (fase 1, rascunho para aprovação)

- `planta.txt`: o mapa, um caractere por tile (84×128). Legenda na imagem e em `desenhar_imagem.py`.
- `planta.json`: entrada, zonas de combate (na ordem), campinas, salas com telhado, torre de menagem, portões.
- `planta.png`: a planta desenhada (`python3 docs/arte/fortaleza/desenhar_imagem.py`).

Depois de aprovada, a planta entra em `packages/shared/src/dungeon.ts` (o gerador da Fortaleza passa a ler o
desenho) e esta pasta fica só com a imagem.
