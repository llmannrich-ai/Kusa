# Pântano do Kosaradius — arte gerada por IA

Folhas do clã de orcs e ogros geradas no ChatGPT com os prompts de `docs/arte/agente/PANTANO_DO_KOSARADIUS.md` e o
goblin de referência, fundo magenta chapado. Cada arquivo é a folha de giro (`<kind>-A.png`: 2 linhas × 6, parado e
andando; colunas: frente, 3/4 de frente, perfil para a esquerda, 3/4 de costas, costas, 3/4 de costas para a direita).

Processadas por `apps/client/scripts/kosaradiusSprites.py <kind>` (`--flip` se o perfil vier para a direita), que grava
`apps/client/src/art/proto/kosaradius/<kind>.png` só com as 6 figuras usadas (frente, perfil e costas, parado e andando)
e paleta de 256 cores: o jogo baixa as 12 no começo (~0,9 MB no total; em cores cheias e com as 12 figuras, 7,3 MB). O jogo pega sozinho todo PNG dessa pasta (`kosaradiusArt.ts`):
monstro com folha usa a arte nova; sem folha, continua com a arte por código (`art/marshMonsters.ts`).

| Monstro | Folha A | Folha B (ação) |
|---|---|---|
| Orc batedor (`orcScout`) | ✅ | — |
| Orc do Brejo (`orcGrunt`) | ✅ | — |
| Orc lanceiro (`orcSpearman`) | ✅ | — |
| Orc arqueiro (`orcArcher`) | ✅ | — |
| Orc xamã (`orcShaman`) | ✅ | — |
| Orc berserker (`orcBerserker`) | ✅ (`--flip=8`: o perfil andando veio para a direita) | — |
| Orc capitão (`orcCaptain`) | ✅ | — |
| Ogro jovem (`ogreYoung`) | ✅ (`--flip=8`: o perfil andando veio para a direita) | — |
| Ogro do Brejo (`ogreBruiser`) | ✅ | — |
| Ogro Xamã (`ogreShaman`) | ✅ | — |
| Chefe de Guerra Orc (`orcWarlord`) | ✅ | — |
| Grumak, o Rei-Ogro (`ogreKing`) | ✅ (2ª versão, com a coroa pequena e torta) | — |

Sem a folha B, o golpe e o especial saem do perfil (com o bote que o jogo já dá no golpe) e a morte é o tombo de sempre.

O Rei segura o tronco em pé parado e no ombro andando: ele anda só com a figura de andar (`WALK_POSE_ONLY` em
`kosaradiusArt.ts`), senão o tronco pularia do chão para o ombro a cada passo.

## Memória no celular

O jogo prepara a folha de todo monstro da arte nova ao abrir (`warmMonsterArt` em `textures.ts`), e cada quadro fica
na memória do celular (canvas e textura). Com uma figura de 256–512 px por quadro (32 quadros por monstro), os 12 do
clã somavam ~156 MB e o celular fechava o jogo no Kosaradius. Agora:

- os quadros repetidos de um clipe apontam para a mesma figura (`hdStep` guarda cada função de `hd()` uma vez; aqui,
  `at()` devolve a mesma função para a mesma figura e deslocamento), e os clipes usam poucas variações: 11 figuras por
  monstro (14 no Rei);
- o quadro é o menor que cabe a figura com a folga do bote (`SIZES` em `kosaradiusSprites.py`).

Resultado: ~28 MB para os 12. Monstro novo: conte figuras distintas × lado² × 4 bytes antes de publicar.

