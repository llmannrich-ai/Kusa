# Pântano do Kosaradius — arte gerada por IA

Folhas do clã de orcs e ogros geradas no ChatGPT com os prompts de `docs/arte/agente/PANTANO_DO_KOSARADIUS.md` e o
goblin de referência, fundo magenta chapado. Cada arquivo é a folha de giro (`<kind>-A.png`: 2 linhas × 6, parado e
andando; colunas: frente, 3/4 de frente, perfil para a esquerda, 3/4 de costas, costas, 3/4 de costas para a direita).

Processadas por `apps/client/scripts/kosaradiusSprites.py <kind>` (`--flip` se o perfil vier para a direita), que grava
`apps/client/src/art/proto/kosaradius/<kind>.png`. O jogo pega sozinho todo PNG dessa pasta (`kosaradiusArt.ts`):
monstro com folha usa a arte nova; sem folha, continua com a arte por código (`art/marshMonsters.ts`).

| Monstro | Folha A | Folha B (ação) |
|---|---|---|
| Orc batedor (`orcScout`) | ✅ | — |
| Orc do Brejo (`orcGrunt`) | ✅ | — |
| Orc lanceiro (`orcSpearman`) | ✅ | — |
| Orc arqueiro (`orcArcher`) | ✅ | — |

Sem a folha B, o golpe e o especial saem do perfil (com o bote que o jogo já dá no golpe) e a morte é o tombo de sempre.
