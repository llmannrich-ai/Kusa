# Planta da Fortaleza Orc (fase 1, rascunho para aprovação)

- `planta.txt`: o mapa, um caractere por tile (84×128). Legenda na imagem e em `desenhar_imagem.py`.
- `planta.json`: entrada, zonas de combate (na ordem), campinas, salas com telhado, torre de menagem, portões.
- `planta.png`: a planta desenhada (`python3 docs/arte/fortaleza/desenhar_imagem.py`).

Depois de aprovada, a planta entra em `packages/shared/src/dungeon.ts` (o gerador da Fortaleza passa a ler o
desenho) e esta pasta fica só com a imagem.

## Arte do ChatGPT

- `vale.png`: o vale lá embaixo (prompt 1 de `docs/arte/agente/FORTALEZA_ORC.md`), original de 1024×1536. No jogo vai
  como `apps/client/src/art/proto/fortaleza/vale.webp` (600 KB), cobrindo o mapa inteiro com folga para a paralaxe,
  escurecido e com névoa (`fortressMap.ts`). Para refazer o WebP:
  `python3 -c "from PIL import Image; Image.open('docs/arte/fortaleza/vale.png').convert('RGB').save('apps/client/src/art/proto/fortaleza/vale.webp', 'WEBP', quality=86, method=6)"`.
- `mapa-com-vale.png`: o mapa inteiro com o vale pintado.
