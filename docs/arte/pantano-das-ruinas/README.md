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

## Rei Bullywug (Runway)

Folhas geradas no Runway com o goblin de referência, fundo magenta chapado, aprovadas e usadas no boss do mapa (Rei
Bullywug; o bullywug comum continua com a arte antiga):

- `bullywug-A.png`: turnaround 2×6 (2ª tentativa; a 1ª saiu "fofa"). Linha 2: as colunas 2–4 são três perfis andando
  e a frente andando repete a parada.
- `bullywug-B.png`: ação 4×4 (andar, golpe de lança, bote saindo da lama, morte). Pedida de perfil para a esquerda, veio
  para a direita; no andar ele larga a lança (o jogo anda com os perfis da A).

Processadas por `apps/client/scripts/bullywugKingSprites.py` (ver `docs/ARTE_TIBIA.md`, "Rei Bullywug").
