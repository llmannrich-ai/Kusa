# Pântano do Kosaradius — prompts da folha B dos 5 orcs que faltam

Folha B = **golpe e morte**. Já estão no jogo os 7 maiores (Orc capitão, Orc xamã, Ogro jovem, Ogro do Brejo,
Ogro Xamã, Chefe de Guerra e Grumak). Faltam estes 5: **Orc batedor, Orc do Brejo, Orc lanceiro, Orc arqueiro e
Orc berserker**.

Estes prompts pedem o mesmo formato das 7 folhas que funcionaram (e não o do `PROMPTS_FOLHA_B.md`, que ficou
desatualizado). Saindo nesse formato, cada folha entra no jogo sem mudar o código.

## Formato

- **2 linhas × 6 quadros**, fundo magenta chapado.
- **Linha 1, golpe:** parado em guarda → preparo → golpe → fim do golpe → volta à guarda.
- **Linha 2, morte:** golpe recebido → cambaleia → de joelhos → caindo → no chão → corpo parado.
- **3/4 de frente, virado para a esquerda** (o mesmo ângulo da 2ª figura da folha A).

## Como usar

1. Anexe a **folha A do mesmo orc** (a de giro, `<kind>-A.png` nesta pasta) e cole o prompt.
2. Confira antes de mandar:
   - as 12 figuras **não se encostam** (lança, arco e machados longe da figura vizinha);
   - o orc tem o **mesmo tamanho** nas duas linhas;
   - o último quadro da morte é o **corpo parado no chão**.
3. Mande as 5 num zip, como da última vez, com o nome do orc no arquivo.

| # | Orc | Arquivo no jogo |
|---|---|---|
| 1 | Orc batedor | `orcScout-B.png` |
| 2 | Orc do Brejo | `orcGrunt-B.png` |
| 3 | Orc lanceiro | `orcSpearman-B.png` |
| 4 | Orc arqueiro | `orcArcher-B.png` |
| 5 | Orc berserker | `orcBerserker-B.png` |

---

## 1. Orc batedor

```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon (the jagged knife), drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns = 12 figures, each fully separated from the others by empty space. EVERY figure in 3/4 front view turned to the LEFT (the same angle as the second figure of the attached turnaround). Same scale in all figures. Feet on the same baseline in each row. The knife stays in hand in EVERY frame. Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: crouched ready stance; feint, pulling the knife back; lunging forward to the left; quick stab with the knife fully extended to the left; pulling back; ready stance again.
Row 2 - DEATH, 6 frames: hit and recoiling; staggering; falling to the knees; collapsing forward; on the ground; corpse lying still, the knife beside the body.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

## 2. Orc do Brejo

```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapons (the rusty hand axe and the plank shield painted with a red frog skull), drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns = 12 figures, each fully separated from the others by empty space. EVERY figure in 3/4 front view turned to the LEFT (the same angle as the second figure of the attached turnaround). Same scale in all figures. Feet on the same baseline in each row. The axe and the shield stay in hand in EVERY frame. Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: ready stance behind the shield; raising the axe behind the head; axe at the top; overhead chop down to the left; axe at the bottom; ready stance again behind the shield.
Row 2 - DEATH, 6 frames: hit and recoiling; staggering, the shield lowering; falling to the knees; collapsing forward; on the ground; corpse lying still with the shield and the axe beside the body.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

## 3. Orc lanceiro

```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon (the very long mangrove-wood spear with the rusty leaf blade and feathers, and the conical reed hat), drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns = 12 figures, each fully separated from the others by empty space (the spear must not touch the next figure or the image edge). EVERY figure in 3/4 front view turned to the LEFT (the same angle as the second figure of the attached turnaround). Same scale in all figures. Feet on the same baseline in each row. The spear stays in hand in EVERY frame. Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: ready stance, spear upright; lowering the spear to point forward to the left; pulling the spear back with both hands; long thrust to the left, spear fully extended far ahead; pulling it back; ready stance again, spear upright.
Row 2 - DEATH, 6 frames: hit and recoiling, the hat tilting; staggering, leaning on the spear; falling to the knees; collapsing forward; on the ground; corpse lying still, the spear across the ground beside the body.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

## 4. Orc arqueiro

```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon (the bone recurved bow, the hooded burlap cloak and the quiver of crow-feather arrows), drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns = 12 figures, each fully separated from the others by empty space. EVERY figure in 3/4 front view turned to the LEFT (the same angle as the second figure of the attached turnaround). Same scale in all figures. Feet on the same baseline in each row. The bow stays in hand in EVERY frame. Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: ready stance holding the bow low; taking an arrow from the quiver and nocking it; raising the bow and drawing; full draw aiming to the left; release, the arrow flying away to the left; lowering the bow, ready stance again.
Row 2 - DEATH, 6 frames: hit and recoiling; staggering, dropping the arrow; falling to the knees; collapsing forward; on the ground; corpse lying still with the bow beside the body.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

## 5. Orc berserker

```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, red-clay body paint, proportions and weapons (a rusty hand axe in EACH hand), drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns = 12 figures, each fully separated from the others by empty space. EVERY figure in 3/4 front view turned to the LEFT (the same angle as the second figure of the attached turnaround). Same scale in all figures. Feet on the same baseline in each row. Both axes stay in hand in EVERY frame. Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: aggressive ready stance, roaring; both axes raised high; first axe chopping down to the left; second axe chopping down to the left; both axes low after the blows; ready stance again, roaring.
Row 2 - DEATH, 6 frames: hit and recoiling, still roaring; staggering; falling to the knees, axes lowering; collapsing forward; on the ground; corpse lying still with both axes beside the body.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```
