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

As bordas vêm numa direção só (terreno de cima → terreno de baixo). O motor do mapa precisa girar e espelhar as de chão
plano para os 4 lados; a da copa só vale no lado sul (é onde aparecem os troncos).

`cena-teste.png`: as peças juntas, como num trecho do mapa (a água ainda é a versão recusada).
