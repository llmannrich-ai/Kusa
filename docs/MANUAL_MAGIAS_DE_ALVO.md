# Manual: como foram feitas as magias de alvo

Resumo de como a mira das magias com alvo foi construída no Kusa, onde está cada peça e como mexer sem quebrar.
Regras de jogo completas: `docs/GDD.md`, seção "Ataques e magias".

## 1. O que é uma magia de alvo

Toda magia em `packages/shared/src/spells.ts` tem um campo `aim`:

| `aim` | Como sai | Exemplos |
|---|---|---|
| `"self"` | No toque, em volta de quem conjura, sem mira | Giro da Lâmina, Grito de Guerra |
| `"target"` | Com mira: num monstro, num ponto, numa linha ou num leque | Flecha Sagrada, Relâmpago, Esfera Sombria |
| `"ally"` | Com mira num herói aliado | Escudo da Luz, Cura Distante |

Dentro de `"target"`, o formato decide o comportamento da mira:

- **Alvo único** (`isSingleTarget`): `radius: 0`, sem `shape`, `dash` ou `field`. A mira **gruda** no monstro a até
  `AIM_SNAP_TILES` (1 tile) do ponto.
- **Área** (`radius > 0`): cai no ponto, sem grudar em monstro.
- **Linha** (`shape: "line"`) e **leque** (`shape: "cone"`): a mira escolhe a direção.

## 2. Como o jogador mira (só toque, celular em pé)

1. **Encostar no botão** do slot mostra o alcance (quadrado tracejado em volta do herói) e a linha pontilhada até o
   alvo automático.
2. **Toque rápido** (sem arrastar): lança no alvo travado, se estiver ao alcance; senão, no monstro mais próximo.
   Sem nenhum monstro ao alcance, não sai e não gasta mana.
3. **Arrastar** a partir do botão: o tamanho do arrasto vira distância. 16 px é a zona morta; 96 px leva ao alcance
   máximo. O ponto para na primeira parede.
4. **Soltar** lança. **Voltar o dedo ao botão** cancela (o botão fica vermelho).
5. Cores: lilás = ponto livre; dourado = grudou num monstro; azul = aliado.
6. **Errou a mira:** a magia sai, gasta mana e recarga, e não acerta ninguém.

## 3. Arquitetura (quem faz o quê)

```
Botão do slot (spellbar.ts)  →  desenho da mira (aim.ts)  →  MSG.cast { slot, aim? }  →  Hunt.cast (hunt.ts)
       pointer events               a cada quadro              intenção do cliente          decisão final
```

| Peça | Arquivo | Responsabilidade |
|---|---|---|
| Regras compartilhadas | `packages/shared/src/spells.ts` | `isSingleTarget`, `AIM_SNAP_TILES`, `clampToRange`, `lineTiles`, `coneTiles` |
| Mensagem | `packages/shared/src/messages.ts` | `CastMessage { slot, aim? }` e `CastAim { x, y, targetId? }` |
| Gesto | `apps/client/src/spellbar.ts` | `pointerdown/move/up` no botão, `setPointerCapture`, estado de cancelado |
| Mira | `apps/client/src/aim.ts` (`SpellAim`) | Converte arrasto em tile, gruda no monstro, desenha linha/área/leque |
| Autoridade | `apps/server/src/hunt.ts` (`cast`) | Confere alcance, parede, linha de visão, monstro escondido; aplica dano |

**Princípio central:** o cliente só sugere. Sem `aim` = toque rápido; com `aim` = ponto (e talvez `targetId`). O
servidor refaz tudo:

- puxa o ponto para dentro do alcance (`clampToRange`) e para na parede (`lineEnd`);
- só aceita o `targetId` se for magia de alvo único, o monstro não estiver escondido, estiver ao alcance com linha de
  visão e a até `AIM_SNAP_TILES + 1` do ponto (1 tile de folga para o atraso da rede);
- cego: o alcance cai para `BLIND_RANGE`.

O cliente usa **as mesmas funções** do `packages/shared` para que o desenho mostre exatamente o que o servidor vai
fazer (por exemplo, `autoTarget` em `aim.ts` repete a regra do toque rápido do servidor).

## 4. Linha do tempo do desenvolvimento

| Data | Commit | O que entrou | Por quê |
|---|---|---|---|
| 20/10 | `94daa55` | Ataque básico manual (⚔️) e mira pontilhada de arrastar nas magias de alvo; `aim.ts` criado | Dar controle ao jogador no celular sem tirar o toque rápido |
| 20/10 | `a87a440` | Alvo automático deixa de ficar preso num monstro fora do alcance | Jogador parava de atacar com outro monstro do lado |
| 20/10 | `de0be41` | Projétil persegue o alvo que anda durante o voo | Impacto aparecia no lugar antigo do monstro |
| 20/10 | `96f25b5` | Área em dois toques (botão + mapa) | Primeira tentativa para área |
| 21/10 | `c976675` | Área passa a mirar arrastando, igual ao alvo único (−120 linhas) | Um gesto só para todas as magias; dois toques era mais lento e confuso |
| 22/10 | `d4d8d32` | Golpe vai no monstro mais próximo ao alcance; tocar de novo destrava; teste `alvo` | ⚔️ parecia quebrado com alvo travado longe |
| depois | Grimório fases 1–5 | Linha, leque, mira em aliado, investida, rolamento | Novos formatos reaproveitando a mesma mira |

Lição principal: a versão de dois toques para área foi descartada em um dia. **Um gesto único e consistente** venceu.

## 5. Como criar uma magia de alvo nova (checklist)

1. Defina a magia em `packages/shared/src/spells.ts` com `aim: "target"`, `range` e `radius` (0 = alvo único).
   Se for linha ou leque, use `shape`.
2. Se precisar de comportamento novo de alvo, implemente em `Hunt.cast` (`apps/server/src/hunt.ts`). Nunca confie
   no `targetId` do cliente sem conferir.
3. Se o formato for novo, ensine `SpellAim.update`/`target` (`aim.ts`) a desenhar, usando funções do `shared`.
4. Mudou dano, cura ou loot: alimente os contadores de `RunStats` (`apps/server/src/runStats.ts`). Falhas de cast
   já contam em `castFails.noTarget/noMana/noRoom`.
5. Teste a mecânica na arena (`apps/server/scripts/arena.ts`, como em `efeitos.ts`), sem depender do mapa sorteado.
   A mira pela rede já é coberta por `scripts/spells.ts` (ponto fora do alcance cai na borda ou na parede).
6. Teste no navegador em 412×915 com toque e deitado (915×412).
7. Atualize o GDD ("Ataques e magias") e rode `npm run check`.

## 6. Riscos e pontos de atenção

- **Duplicação cliente/servidor:** `autoTarget` e `allyAim` em `aim.ts` repetem regras de `hunt.ts`. Mudou num lado,
  mude no outro, ou o desenho mente para o jogador. Candidato a extrair para o `shared`.
- **`dragPoint` e `target` em `aim.ts`** repetem a mesma conta do arrasto: dá para unificar.
- **Folga de rede de 1 tile** no servidor: aumentar facilita trapaça com `targetId`; diminuir faz a mira "falhar"
  em conexão lenta.
- **Constantes de toque** (`DEADZONE_PX = 16`, `FULL_DRAG_PX = 96`) não estão no GDD; mudar altera a sensação de
  mira em todas as magias.
- **Botões com `touch-action: none`:** sem isso o navegador cancela o arrasto (`pointercancel`).
