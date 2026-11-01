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
| Orc xamã (`orcShaman`) | ✅ | ✅ golpe e morte (`orcShaman-B.png`) |
| Orc berserker (`orcBerserker`) | ✅ (`--flip=8`: o perfil andando veio para a direita) | — |
| Orc capitão (`orcCaptain`) | ✅ | ✅ golpe e morte (`orcCaptain-B.png`) |
| Ogro jovem (`ogreYoung`) | ✅ (`--flip=8`: o perfil andando veio para a direita) | ✅ golpe e morte (`ogreYoung-B.png`) |
| Ogro do Brejo (`ogreBruiser`) | ✅ | ✅ golpe e morte (`ogreBruiser-B.png`) |
| Ogro Xamã (`ogreShaman`) | ✅ | ✅ golpe e morte (`ogreShaman-B.png`) |
| Chefe de Guerra Orc (`orcWarlord`) | ✅ | ✅ golpe e morte (`orcWarlord-B.png`) |
| Grumak, o Rei-Ogro (`ogreKing`) | ✅ (2ª versão, com a coroa pequena e torta) | ✅ golpe e morte (`ogreKing-B.png`) |

Folha B (`<kind>-B.png`, 2 linhas × 6: golpe em cima, morte embaixo, em 3/4 de frente): o script põe na escala da A e
leva 4 quadros do golpe e 4 da morte (`ATTACK_B` e `DEATH_B`); o jogo toca o golpe desenhado e, ao morrer, a morte
desenhada (o corpo fica no chão). Sem a folha B, o golpe sai do perfil (com o bote que o jogo já dá) e a morte é o tombo
de sempre. O especial sai do perfil nos dois casos.

O Rei segura o tronco em pé parado e no ombro andando: ele anda só com a figura de andar (`WALK_POSE_ONLY` em
`kosaradiusArt.ts`), senão o tronco pularia do chão para o ombro a cada passo.

Folha C (`<kind>-C.png`, uma linha por habilidade, 6 quadros, 3/4 de frente): lista de ações e prompts em
`PROMPTS_FOLHA_C.md`. Ainda não gerada nem lida pelo jogo.

## Memória no celular

O jogo prepara a folha de todo monstro da arte nova ao abrir (`warmMonsterArt` em `textures.ts`), e cada quadro fica
na memória do celular (canvas e textura). Com uma figura de 256–512 px por quadro (32 quadros por monstro), os 12 do
clã somavam ~156 MB e o celular fechava o jogo no Kosaradius. Agora:

- os quadros repetidos de um clipe apontam para a mesma figura (`hdStep` guarda cada função de `hd()` uma vez; aqui,
  `at()` devolve a mesma função para a mesma figura e deslocamento), e os clipes usam poucas variações: 11 figuras por
  monstro (14 no Rei);
- o quadro é o menor que cabe a figura com a folga do bote (`SIZES` em `kosaradiusSprites.py`).

Resultado: ~28 MB para os 12 só com a folha A; ~51 MB com a folha B de 7 deles (18 figuras por monstro, quadro mais
largo para o golpe e o corpo no chão).

Além disso, o jogo só prepara os monstros do mapa da hunt, quando ela começa (`warmMapMonsters` em `textures.ts`); antes
preparava os de todos os mapas ainda no lobby (163 MB). Monstro novo: conte figuras distintas × lado² × 4 bytes antes de
publicar.

