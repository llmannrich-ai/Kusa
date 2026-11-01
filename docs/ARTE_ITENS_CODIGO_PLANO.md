# Redesenho do código dos itens vestidos — plano

Próximo passo depois da nova proporção dos heróis (abaixo). Nada aqui muda regra de jogo: é só cliente
(`apps/client/src/art/proto/`), sem `RULES_VERSION` nem migration. O catálogo de conceitos de cada item continua em
`docs/ARTE_ITENS.md`; este plano trata de **como o código desenha** os itens.

## 0. Feito: proporção dos heróis (mais alto e magro, de propósito sutil)

`HERO_BUILD` em `proto/tibiaHero.ts` (`Kit.build`, só nos 5 kits dos heróis; os monstros humanoides seguem atarracados):

| | Antes | Agora |
|---|---|---|
| Perna (quadril → pé) | 25 unidades | 28 (+12%) |
| Altura da figura | ≈ 70 unidades | ≈ 73 (+4%) |
| Braço (ombro → mão) | 15 | 16 (a mão chega ao quadril) |
| Largura (cabeça, tronco, membros, roupa, arma) | 100% | 92% |
| Cabeça | 16 × 14,4 | 14,7 × 14,4 (mesma altura) |

A largura vem de `Canvas.slimmed`: as formas são amostradas já estreitas, então o pixel continua fino (nada de
reamostrar a imagem). Comparação: `docs/arte/herois-proporcao.png` (em cima antes, embaixo agora). Prévia:
`npx tsx apps/client/scripts/heroiPrevia.ts /tmp/herois.png 2 [andar]`.

## 1. Diagnóstico do código atual

Os 120 itens (6 slots × 2 famílias × 5 níveis × comum/mágico) já têm desenho próprio, mas:

1. **Um arquivo de 5.600 linhas** (`tibiaHero.ts`, 340 KB): corpo, poses, monstros, ícones e os 120 itens juntos.
   Mexer num item exige navegar o arquivo inteiro e qualquer erro quebra todos os heróis.
2. **Coordenadas presas ao corpo antigo**: ~250 números do tipo `top + 13` e `CX ± 13` dentro dos itens. Por isso a
   nova proporção afinou a figura inteira em vez de redesenhar o corpo: nenhum item sabe onde fica o ombro, a
   cintura ou o joelho; ele "chuta" a partir de `top`.
3. **Leitura no celular**: no tamanho real (~60 px CSS) vários conjuntos viram bloco de uma cor só (bronze lê como
   ouro; mithral quase branco some no chão claro), e alguns elmos parecem uma bola (o de bronze de lado).
4. **Volume chapado**: armadura e elmo são polígonos com luz de esfera ou cilindro genérica. A escultura por código
   dos monstros (`proto/sculpt.ts`) já tem luz de contorno e sombra projetada, que os itens não usam.
5. **Custo**: ≈ 20 ms por quadro com conjunto completo (PC); aceitável, mas não pode crescer muito no celular.
6. **Sem teste visual**: só a galeria (`arte.html`) e o olho; um ajuste num item pode estragar outro sem ninguém ver.

## 2. Decisão de técnica

**Continuar no pintor do herói (`Canvas` de `tibiaHero.ts`), reorganizado**, em vez de levar os itens para o motor
3D de `sculpt.ts`. Motivo: os itens precisam encaixar pixel a pixel no corpo, que é pintado nesse motor; misturar os
dois daria dois dialetos de luz na mesma figura. O que o motor de escultura tem de bom (luz de contorno, sombra
projetada) entra no `Canvas` como recurso opcional.

Contraponto: se o corpo dos heróis um dia for para `sculpt.ts` (como o Orc batedor), os itens vão junto e este
plano muda. Recomendo **não** fazer as duas migrações ao mesmo tempo.

## 3. Arquitetura nova

```
apps/client/src/art/proto/
  tibiaHero.ts        → só corpo, poses e despacho (alvo: < 1.500 linhas)
  hero/canvas.ts      → Canvas, formas, texturas e materiais (o motor)
  hero/body.ts        → "encaixes" do corpo por pose (Body)
  items/armor.ts      → armaduras de guerra (comum e mágica)
  items/robe.ts       → mantos arcanos
  items/helmet.ts     → elmos e chapéus
  items/legs.ts       → perneiras e calças
  items/boots.ts
  items/shield.ts
  items/weapons/{sword,axe,bow,xbow,wand,staff}.ts
  items/index.ts      → registro: id → desenho (um objeto por item)
```

**Encaixes (`Body`)**: a pose calcula uma vez e passa ao item: ombros, peito, cintura, quadril (y e meia-largura),
pescoço, centro e raio da cabeça, joelho, tornozelo, mão. O item desenha em relação a eles
(`body.waist.y`, `body.chest.half`), nunca a `top + 13`. Assim a proporção do corpo muda num lugar só e os itens
acompanham; com isso, a largura deixa de depender do `slimmed` (que fica só como ajuste fino).

**Registro por item**: cada item é um objeto com os ganchos que usa (`torso`, `arm`, `shoulder`, `head`, `leg`,
`hand`, `icon`), no mesmo modelo dos `Wear` de `art/hero/compose.ts`. O mágico declara `base` (o comum) e só o
que muda.

## 4. Fases (ordem por impacto no que o jogador vê)

| Fase | O quê | Entrega | Tamanho |
|---|---|---|---|
| 1. Infra | separar o motor (`hero/canvas.ts`) e o `Body`; prévia por slot (`heroiPrevia.ts --slot armadura`); teste que guarda a impressão (hash) de cada item vestido nas 3 direções | nada muda na tela (o teste prova) | M |
| 2. Armaduras | 10 armaduras de guerra + 10 mantos no `Body`: 3 materiais por peça (metal, couro, tecido), ombreira que muda a silhueta a cada nível, cor da classe aparecendo na barra e na manga | a maior área do herói | G |
| 3. Elmos e chapéus | 20 peças: silhueta própria por nível de lado e de costas, viseira e crista legíveis a 60 px | o que mais identifica de longe | G |
| 4. Armas | 60 armas: tamanho cresce com o nível (o nível 5 sai da silhueta), brilho do mágico no gume | o que o jogador mais exibe | G |
| 5. Pernas e botas | 30 peças: joelheira, cano da bota e sola com forma própria | detalhe | M |
| 6. Escudos | 10 escudos: emblema legível de frente, espessura de lado | detalhe | P |
| 7. Ícones | ícone sai do mesmo desenho, enquadrado (já é assim; conferir cada um com a peça nova) | consistência | P |

Cada fase vira um PR próprio (`feat/arte-itens-<slot>`), com a folha de comparação em `docs/arte/` e o teste da
fase 1 atualizado de propósito.

## 5. Critérios de aceite de cada item

- Reconhecível **a 60 px** (prévia em zoom 1, no chão do mapa onde mais aparece), de frente, de lado e de costas.
- **Três materiais** no mínimo; nenhum conjunto completo de uma cor só.
- Nível N+1 muda a **forma**, não só o material.
- Igual em qualquer classe (o item não sabe a classe), e a classe continua aparecendo (cabelo, barba, cor de baixo).
- Quadro com conjunto completo **≤ 25 ms no PC** (medido pela prévia); memória igual à de hoje (mesmo número de
  quadros).
- Funciona na caminhada (4 quadros) sem "pular" pixel entre quadros.

## 6. Riscos

- **Regressão silenciosa** ao separar o arquivo: mitigada pelo teste de impressão da fase 1, que precisa vir antes de
  qualquer redesenho.
- **Escopo**: 120 peças. Se o ritmo cair, priorizar os níveis 1–3 (os que a maioria dos jogadores veste) e os mágicos
  mais desejados (Espada Vorpal, Couraça do Leão).
- **Celular fraco**: medir o tempo de montar a folha no início da hunt com CPU 4× mais lenta a cada fase.
- **Sessões paralelas**: `tibiaHero.ts` é mexido por quem faz monstros humanoides; a fase 1 deve sair rápido e num PR
  só, para não conflitar por semanas.
