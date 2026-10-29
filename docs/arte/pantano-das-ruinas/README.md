# Pântano das Ruínas — arte gerada pelo agente

Imagens do agente de arte (SharePoint, `CONFIDENCIAL LEONARDO/RPG_<id>_vNN.png`; orientação em
`docs/arte/agente/ORIENTACAO.md`) processadas para o jogo por `apps/client/scripts/pantanoTexturas.py`:
emenda refeita (o gerador espelha ~64 px de cada borda), cores das bordas igualadas às das texturas, escala de
128 px por tile e paleta de 40 cores chapadas.

| Arquivo (`jogo/`) | Origem | Tamanho |
|---|---|---|
| `tex-capim.png`, `tex-musgo.png`, `tex-lama.png`, `tex-copa.png` | `RPG_tex-*_v01` | 3×3 tiles |
| `borda-margem.png` (capim → água), `borda-capim-lama.png`, `borda-copa.png` (copa → capim, com os troncos) | `RPG_borda-*_v01` | 6×2 tiles |

Pendentes: `tex-agua` e `tex-lajes` voltaram para o agente (`refazer`: a água tinha plantas demais e as lajes, a cruz
espelhada). Quando chegarem, rode o script de novo: ele também recalcula a cor da `borda-margem` pela água nova.

No jogo (Arte nova, beta): `apps/client/src/art/proto/pantano/` (cópia de `jogo/` mais a `tex-agua` provisória: a
versão recusada, com a lâmina d'água passada para azul-petróleo pelo script, senão ela some no meio do capim), lida
por `swampHd.ts` e desenhada por `apps/client/src/wetlandHd.ts`, por baixo das lajes, enfeites, árvores e ruínas
antigas:

- cada tile pega o pedaço da textura da sua posição (`x % 3`, `y % 3`), então a textura corre sem emenda;
- as bordas vêm numa direção só (terreno de cima → de baixo): são usadas onde o mapa tem essa situação (margem com a
  terra em cima, capim sobre lama, copa com o capim embaixo, onde aparecem os troncos). Nos outros lados e nas quinas,
  o terreno mais alto (copa > musgo > capim > lama > água > lajes) invade o tile vizinho com um contorno irregular;
- musgo no pé da mata e em manchas pelo campo; as lajes continuam as antigas e recebem a beira do capim.

`cena-teste.png`: as peças juntas, como num trecho do mapa (a água ainda é a versão recusada).
