# Pântano das Ruínas — arte gerada por IA

Só os **inimigos** do mapa vêm de arte gerada por IA (as folhas abaixo e as do sapo gigante, `frog-A.png` e
`frog-B.png`, ver `docs/ARTE_TIBIA.md`). O cenário é pintado por código em 128 px por tile (`docs/CENARIOS_PLANO.md`,
fase 1b); as texturas de chão que o agente de arte gerou para ele saíram (ficam no histórico do git).

## Rei Bullywug (Runway)

Folhas geradas no Runway com o goblin de referência, fundo magenta chapado, aprovadas e usadas no boss do mapa (Rei
Bullywug; o bullywug comum continua com a arte antiga):

- `bullywug-A.png`: turnaround 2×6 (2ª tentativa; a 1ª saiu "fofa"). Linha 2: as colunas 2–4 são três perfis andando
  e a frente andando repete a parada.
- `bullywug-B.png`: ação 4×4 (andar, golpe de lança, bote saindo da lama, morte). Pedida de perfil para a esquerda, veio
  para a direita; no andar ele larga a lança (o jogo anda com os perfis da A).

Processadas por `apps/client/scripts/bullywugKingSprites.py` (ver `docs/ARTE_TIBIA.md`, "Rei Bullywug").
