# Fila de arte: Cripta

> Gerado de `cripta.json` (a fonte que o agente lê). Orientação do agente em `ORIENTACAO.md`.

**34 imagens**, só inimigos (17 monstros): o cenário da Cripta é pintado por código em 128 px por tile (`docs/CENARIOS_PLANO.md`). A 1 imagem a cada 2 horas, são ~3 dias.

Ordem: do primeiro andar ao boss (como aparecem na hunt), para os comuns que mais aparecem chegarem primeiro ao jogo.

| # | id | Nome | Tipo | Pasta | Depende de |
|---|---|---|---|---|---|
| 1 | `rat-A` | Ratazana | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/rat` | — |
| 2 | `rat-B` | Ratazana | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/rat` | `rat-A` |
| 3 | `kobold-A` | Kobold | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/kobold` | — |
| 4 | `kobold-B` | Kobold | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/kobold` | `kobold-A` |
| 5 | `stirge-A` | Estirge | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/stirge` | — |
| 6 | `stirge-B` | Estirge | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/stirge` | `stirge-A` |
| 7 | `goblin-A` | Goblin | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/goblin` | — |
| 8 | `goblin-B` | Goblin | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/goblin` | `goblin-A` |
| 9 | `goblinArcher-A` | Goblin arqueiro | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/goblinArcher` | — |
| 10 | `goblinArcher-B` | Goblin arqueiro | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/goblinArcher` | `goblinArcher-A` |
| 11 | `zombie-A` | Zumbi | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/zombie` | — |
| 12 | `zombie-B` | Zumbi | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/zombie` | `zombie-A` |
| 13 | `hobgoblin-A` | Hobgoblin capitão | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/hobgoblin` | — |
| 14 | `hobgoblin-B` | Hobgoblin capitão | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/hobgoblin` | `hobgoblin-A` |
| 15 | `skeleton-A` | Esqueleto | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/skeleton` | — |
| 16 | `skeleton-B` | Esqueleto | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/skeleton` | `skeleton-A` |
| 17 | `skeletonArcher-A` | Esqueleto arqueiro | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/skeletonArcher` | — |
| 18 | `skeletonArcher-B` | Esqueleto arqueiro | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/skeletonArcher` | `skeletonArcher-A` |
| 19 | `giantSpider-A` | Aranha gigante | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/giantSpider` | — |
| 20 | `giantSpider-B` | Aranha gigante | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/giantSpider` | `giantSpider-A` |
| 21 | `orc-A` | Orc guerreiro | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/orc` | — |
| 22 | `orc-B` | Orc guerreiro | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/orc` | `orc-A` |
| 23 | `gnoll-A` | Gnoll | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/gnoll` | — |
| 24 | `gnoll-B` | Gnoll | monstro · comum | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/gnoll` | `gnoll-A` |
| 25 | `ogre-A` | Ogro | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/ogre` | — |
| 26 | `ogre-B` | Ogro | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/ogre` | `ogre-A` |
| 27 | `bugbear-A` | Bugbear chefe | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/bugbear` | — |
| 28 | `bugbear-B` | Bugbear chefe | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/bugbear` | `bugbear-A` |
| 29 | `gelatinousCube-A` | Cubo Gelatinoso | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/gelatinousCube` | — |
| 30 | `gelatinousCube-B` | Cubo Gelatinoso | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/gelatinousCube` | `gelatinousCube-A` |
| 31 | `mimic-A` | Mímico | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/mimic` | `comum-baus-portais` |
| 32 | `mimic-B` | Mímico | monstro · mini-boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/mimic` | `mimic-A` |
| 33 | `dragon-A` | Dragão jovem | monstro · boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/dragon` | — |
| 34 | `dragon-B` | Dragão jovem | monstro · boss | `PGG/FINANCEIRO/00 - DIRETORIA/CONFIDENCIAL LEONARDO/Kusa/Arte/cripta/inimigos/dragon` | `dragon-A` |

## Blocos comuns

Os prompts usam marcadores como `{{ESTILO}}`: o agente troca cada um pelo texto do bloco de mesmo nome, abaixo. Só o `{{CENARIO}}` muda em relação ao Pântano.

**{{ESTILO}}**

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet: high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything.
```

**{{CENARIO}}**

```text
Setting: the Crypt - cramped burial halls and narrow corridors of cold cut stone deep underground, lit only by torches: dust, cobwebs, cracked sarcophagi, bone niches, iron candle racks, old soot. Colors of the place: cold blue-grey stone, bone white, ash, rust, with warm torch-orange highlights. The creature must read clearly against a dark cold-grey stone floor: keep its main colors contrasting with grey.
```

**{{PROIBIDO}}**

```text
Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

**{{FOLHA_A}}**

```text
SHEET: character turnaround sprite sheet on a fully transparent background (PNG with alpha), 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty transparent space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Aspect ratio 3:1.
```

**{{FOLHA_B}}**

```text
SHEET: animation sprite sheet on a fully transparent background (PNG with alpha), 4 columns, one animation per row. EVERY figure is in side profile FACING LEFT. Each figure is completely separated from the others by empty transparent space. The frames of each row are consecutive frames of one animation, read left to right. Use the attached turnaround sheet of this same character as the model: identical design, colors and scale.
```

## Prompts

### 1. `rat-A` · Ratazana

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Táticas de Bando: o especial é o chamado do bando (o jogo usa quando há outras ratazanas perto).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Giant crypt rat the size of a small dog: mangy grey-brown fur with bald scabby patches, long naked pink tail with a notch bitten out, yellow chisel teeth, beady red eyes, a scrap of burial shroud caught on one hind leg, dust and cobwebs on the back. Low to the ground on four legs.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.35 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 2. `rat-B` · Ratazana

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), rat-A (o mesmo personagem)
- Notas: Táticas de Bando: o especial é o chamado do bando (o jogo usa quando há outras ratazanas perto).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Giant crypt rat the size of a small dog: mangy grey-brown fur with bald scabby patches, long naked pink tail with a notch bitten out, yellow chisel teeth, beady red eyes, a scrap of burial shroud caught on one hind leg, dust and cobwebs on the back. Low to the ground on four legs.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.35 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: scurrying run, body low, tail whipping
Row 2 - ATTACK, 4 frames: crouch, spring forward, bite with teeth bared, land
Row 3 - SPECIAL, 4 frames: PACK SQUEAL: rears up on the hind legs, mouth wide open squealing with fur bristling, drops back down, darts forward
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 3. `kobold-A` · Kobold

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Vem em grupo de 2–3: a vela no capacete ajuda a ler o bando no escuro da Cripta.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Kobold: a small scrawny dog-headed reptile humanoid with rust-red scales, a short snout with needle teeth, small horns, yellow slit eyes, a thin whipping tail. Wears a dented oversized iron pot as a helmet with a stub of melted candle glued on top (the flame is a solid pixel shape), a ragged leather vest hung with stolen grave trinkets. Holds a short rusty spear made from a broken pick.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.6 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 4. `kobold-B` · Kobold

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), kobold-A (o mesmo personagem)
- Notas: Vem em grupo de 2–3: a vela no capacete ajuda a ler o bando no escuro da Cripta.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Kobold: a small scrawny dog-headed reptile humanoid with rust-red scales, a short snout with needle teeth, small horns, yellow slit eyes, a thin whipping tail. Wears a dented oversized iron pot as a helmet with a stub of melted candle glued on top (the flame is a solid pixel shape), a ragged leather vest hung with stolen grave trinkets. Holds a short rusty spear made from a broken pick.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.6 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: quick nervous steps, hunched forward
Row 2 - ATTACK, 4 frames: pull the spear back, quick jab, second quick jab, recover
Row 3 - SPECIAL, 4 frames: GANG STAB: crouches low and sneaks one step, darts forward under the guard, stabs upward, hops back grinning
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 5. `stirge-A` · Estirge

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Versão pálida da Cripta. Se preferir uma estirge só para os dois mapas, pule este par e use a do Pântano.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Crypt stirge: a cat-sized blood-sucking horror between a mosquito and a bat, pale from living in the dark. Leathery tattered greyish bat wings with visible veins, sparse bristly ash-colored body, four hooked insect legs, a long needle-like proboscis, small glowing red eyes, a translucent belly swollen with dark red blood.

{{FOLHA_A}} It flies: in every figure the body hovers about one third of a human height above the row's baseline (leave a gap); keep the hover height the same in all figures. Size: the character is 0.4 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 6. `stirge-B` · Estirge

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), stirge-A (o mesmo personagem)
- Notas: Versão pálida da Cripta. Se preferir uma estirge só para os dois mapas, pule este par e use a do Pântano.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Crypt stirge: a cat-sized blood-sucking horror between a mosquito and a bat, pale from living in the dark. Leathery tattered greyish bat wings with visible veins, sparse bristly ash-colored body, four hooked insect legs, a long needle-like proboscis, small glowing red eyes, a translucent belly swollen with dark red blood.

{{FOLHA_B}} 4 rows. It flies: keep the body hovering one third of a human height above each row's baseline. Size: the character is 0.4 times the height of one human adult (1 tile).
Row 1 - FLIGHT cycle, 4 frames: wings up, wings mid, wings down, wings mid
Row 2 - ATTACK, 4 frames: draw back, dive forward, proboscis stabs to the left, pull out
Row 3 - SPECIAL, 4 frames: DRAIN BLOOD: proboscis sunk forward, belly swelling red in steps, belly fully swollen and glowing, pulls away
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 7. `goblin-A` · Goblin

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Fuga Ágil: o especial é o salto para trás depois do golpe. É o monstro mais próximo da referência: tem que parecer da mesma família.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Goblin raider in the exact design family of the attached goblin reference: wiry, hunched, sickly green-grey skin, huge pointed ears with notches, wide grin of crooked yellow teeth, big hooked nose, mean yellow eyes. Wears a patchwork leather jerkin, a cracked skull-cap of bone and a belt of pouches stuffed with stolen grave goods. Holds a jagged notched short sword.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 8. `goblin-B` · Goblin

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), goblin-A (o mesmo personagem)
- Notas: Fuga Ágil: o especial é o salto para trás depois do golpe. É o monstro mais próximo da referência: tem que parecer da mesma família.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Goblin raider in the exact design family of the attached goblin reference: wiry, hunched, sickly green-grey skin, huge pointed ears with notches, wide grin of crooked yellow teeth, big hooked nose, mean yellow eyes. Wears a patchwork leather jerkin, a cracked skull-cap of bone and a belt of pouches stuffed with stolen grave goods. Holds a jagged notched short sword.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (quick, sneaky)
Row 2 - ATTACK, 4 frames: wind up, slash across, follow-through, recover
Row 3 - SPECIAL, 4 frames: HIT AND RUN: slashes, then springs BACKWARD (moving to the right) in a low acrobatic hop, lands crouched, taunting with the tongue out
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 9. `goblinArcher-A` · Goblin arqueiro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Mantém distância: o especial é o recuo. A flecha em voo é desenhada pelo jogo; aqui só a saída do arco.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Goblin archer: wiry, hunched goblin with sickly green-grey skin, huge notched ears, one eye squinting, the other eye covered by a leather patch. Wears a hooded ragged cloak of grave cloth, leather bracers, a quiver of crow-fletched arrows on the back. Holds a crude short bow of bone and sinew.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 10. `goblinArcher-B` · Goblin arqueiro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), goblinArcher-A (o mesmo personagem)
- Notas: Mantém distância: o especial é o recuo. A flecha em voo é desenhada pelo jogo; aqui só a saída do arco.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Goblin archer: wiry, hunched goblin with sickly green-grey skin, huge notched ears, one eye squinting, the other eye covered by a leather patch. Wears a hooded ragged cloak of grave cloth, leather bracers, a quiver of crow-fletched arrows on the back. Holds a crude short bow of bone and sinew.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (crouched, careful)
Row 2 - ATTACK, 4 frames: nock an arrow, draw the bow aiming LEFT, release (arrow just leaving the bow), lower the bow
Row 3 - SPECIAL, 4 frames: BACK OFF: hops backward (moving to the right) while nocking an arrow, lands, aims again to the LEFT, sneers
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 11. `zombie-A` · Zumbi

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Fortitude Morta-viva: o especial é o zumbi que não cai. A morte de verdade (linha 4) só vem com luz ou fogo: dá para desenhar a carne fumegando.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Crypt zombie: a bloated, shambling corpse in a rotted burial shroud and the remains of a noble's doublet, grey-green mottled skin with dark purple bruises, sunken milky eyes, jaw hanging loose, exposed ribs on one side, an iron nail driven through one hand, grave dirt on the knees. Arms reaching forward. Slow and heavy.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.0 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 12. `zombie-B` · Zumbi

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), zombie-A (o mesmo personagem)
- Notas: Fortitude Morta-viva: o especial é o zumbi que não cai. A morte de verdade (linha 4) só vem com luz ou fogo: dá para desenhar a carne fumegando.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Crypt zombie: a bloated, shambling corpse in a rotted burial shroud and the remains of a noble's doublet, grey-green mottled skin with dark purple bruises, sunken milky eyes, jaw hanging loose, exposed ribs on one side, an iron nail driven through one hand, grave dirt on the knees. Arms reaching forward. Slow and heavy.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.0 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: dragging shamble, one foot dragged behind
Row 2 - ATTACK, 4 frames: raise both fists, bring them down, heavy hammer blow, slump
Row 3 - SPECIAL, 4 frames: UNDEAD FORTITUDE: knocked down to one knee with the head lolling, twitches, pushes itself back up, stands again with a broken neck tilt
Row 4 - DEATH, 3 frames: hit by fire and smoking, collapsing into a heap, smouldering corpse on the ground (column 4 empty)

{{PROIBIDO}}
```

### 13. `hobgoblin-A` · Hobgoblin capitão

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Comando: perto dele goblins e kobolds batem mais forte. Os anéis vermelhos do especial ajudam a ler a aura.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Hobgoblin captain: a disciplined, broad-shouldered goblinoid soldier with dark orange skin, flat nose, sharp tusks, cold yellow eyes, black hair in a tight topknot. Wears blackened lamellar armor with rusty red lacing, a captain's crested iron helm, a tattered red war banner strapped to the back on a short pole. Holds a well-kept curved sword and a war horn on the belt.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.05 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 14. `hobgoblin-B` · Hobgoblin capitão

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), hobgoblin-A (o mesmo personagem)
- Notas: Comando: perto dele goblins e kobolds batem mais forte. Os anéis vermelhos do especial ajudam a ler a aura.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Hobgoblin captain: a disciplined, broad-shouldered goblinoid soldier with dark orange skin, flat nose, sharp tusks, cold yellow eyes, black hair in a tight topknot. Wears blackened lamellar armor with rusty red lacing, a captain's crested iron helm, a tattered red war banner strapped to the back on a short pole. Holds a well-kept curved sword and a war horn on the belt.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.05 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (marching, upright)
Row 2 - ATTACK, 4 frames: guard up, precise cut, follow-through, back to guard
Row 3 - SPECIAL, 4 frames: COMMAND: raises the sword high and blows the war horn, solid red pixel rings spread out from him, points the sword forward to the LEFT
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 15. `skeleton-A` · Esqueleto

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Skeleton warrior: yellowed cracked bones held together by faint blue necromantic sparks at the joints (solid pixel sparks), empty eye sockets with tiny cold-blue points of light, a dented rusty half-helm, scraps of rotten chainmail on the ribs, a rusty notched longsword and a splintered round shield with a faded crest.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.0 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 16. `skeleton-B` · Esqueleto

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), skeleton-A (o mesmo personagem)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Skeleton warrior: yellowed cracked bones held together by faint blue necromantic sparks at the joints (solid pixel sparks), empty eye sockets with tiny cold-blue points of light, a dented rusty half-helm, scraps of rotten chainmail on the ribs, a rusty notched longsword and a splintered round shield with a faded crest.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.0 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (stiff, rattling)
Row 2 - ATTACK, 4 frames: raise the sword overhead, chop down, sword hits low, recover
Row 3 - SPECIAL, 4 frames: SHIELD BASH: raises the shield, slams it forward to the LEFT, bones rattling, steps back
Row 4 - DEATH, 3 frames: struck and the skull flying loose, bones collapsing, a pile of bones with helm and sword on the ground (column 4 empty)

{{PROIBIDO}}
```

### 17. `skeletonArcher-A` · Esqueleto arqueiro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Skeleton archer: yellowed cracked bones with faint blue necromantic sparks at the joints, empty eye sockets with cold-blue points of light, a tattered hooded cloak of grave cloth, a quiver of black-fletched arrows on the hip, a tall old yew longbow with frayed string.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.0 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 18. `skeletonArcher-B` · Esqueleto arqueiro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), skeletonArcher-A (o mesmo personagem)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Skeleton archer: yellowed cracked bones with faint blue necromantic sparks at the joints, empty eye sockets with cold-blue points of light, a tattered hooded cloak of grave cloth, a quiver of black-fletched arrows on the hip, a tall old yew longbow with frayed string.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.0 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (stiff)
Row 2 - ATTACK, 4 frames: nock an arrow, draw the longbow aiming LEFT, release (arrow just leaving the bow), lower the bow
Row 3 - SPECIAL, 4 frames: BACK OFF: steps backward (moving to the right) with the bow drawn, stops, aims to the LEFT, holds aim
Row 4 - DEATH, 3 frames: struck and the skull flying loose, bones collapsing, a pile of bones with bow and cloak on the ground (column 4 empty)

{{PROIBIDO}}
```

### 19. `giantSpider-A` · Aranha gigante

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Teia: no quadro 3 a teia sai bem comprida para a esquerda (prende de 2 a 5 tiles). Picada envenena: verde só no veneno.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Giant crypt spider, as long as a wolf: bloated black-violet abdomen with a pale bone-white skull-shaped marking, eight long hairy jointed legs with pale bands, a cluster of glossy red eyes, dripping green venom fangs, strands of web and a tiny desiccated rat caught on its back hairs. Low and wide.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.7 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 20. `giantSpider-B` · Aranha gigante

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), giantSpider-A (o mesmo personagem)
- Notas: Teia: no quadro 3 a teia sai bem comprida para a esquerda (prende de 2 a 5 tiles). Picada envenena: verde só no veneno.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Giant crypt spider, as long as a wolf: bloated black-violet abdomen with a pale bone-white skull-shaped marking, eight long hairy jointed legs with pale bands, a cluster of glossy red eyes, dripping green venom fangs, strands of web and a tiny desiccated rat caught on its back hairs. Low and wide.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.7 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: legs moving in alternating sets, body steady
Row 2 - ATTACK, 4 frames: front legs rise, lunge, venomous bite with green drip, back down
Row 3 - SPECIAL, 4 frames: WEB SHOT: abdomen curls forward under the body, a thick white sticky web strand shoots far to the LEFT, strand fully extended, settles
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 21. `orc-A` · Orc guerreiro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Agressivo: o especial é o salto de 3 a 5 tiles até o herói.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc warrior: a muscular, scarred brute with grey-green skin, heavy jaw with big lower tusks, small red eyes under a thick brow, a crest of black hair. Wears spiked black iron pauldrons, a chain shirt, a belt hung with trophy skulls, war paint of a red hand across the face. Holds a huge notched cleaver-axe in two hands.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.1 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 22. `orc-B` · Orc guerreiro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), orc-A (o mesmo personagem)
- Notas: Agressivo: o especial é o salto de 3 a 5 tiles até o herói.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc warrior: a muscular, scarred brute with grey-green skin, heavy jaw with big lower tusks, small red eyes under a thick brow, a crest of black hair. Wears spiked black iron pauldrons, a chain shirt, a belt hung with trophy skulls, war paint of a red hand across the face. Holds a huge notched cleaver-axe in two hands.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.1 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (aggressive stride)
Row 2 - ATTACK, 4 frames: lift the axe over the shoulder, swing down across, axe low after the hit, recover
Row 3 - SPECIAL, 4 frames: AGGRESSIVE CHARGE: crouches roaring, leaps far forward to the LEFT with the axe raised, airborne, lands with the axe smashing down
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 23. `gnoll-A` · Gnoll

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Rompante: ferido (metade da vida) entra em frenesi e ataca mais rápido. A linha 5 é o ataque nesse estado.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Gnoll: a tall, lanky hyena-headed humanoid with spotted dirty-yellow fur, a bristly black mane down the spine, a long muzzle with yellow fangs and drool, mad amber eyes. Wears a ragged hide harness, bone fetishes and a necklace of finger bones. Holds a crude flail of chain and bone.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.2 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 24. `gnoll-B` · Gnoll

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), gnoll-A (o mesmo personagem)
- Notas: Rompante: ferido (metade da vida) entra em frenesi e ataca mais rápido. A linha 5 é o ataque nesse estado.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Gnoll: a tall, lanky hyena-headed humanoid with spotted dirty-yellow fur, a bristly black mane down the spine, a long muzzle with yellow fangs and drool, mad amber eyes. Wears a ragged hide harness, bone fetishes and a necklace of finger bones. Holds a crude flail of chain and bone.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.2 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: hunched loping run, knees bent
Row 2 - ATTACK, 4 frames: snarl, lunge with jaws open, bite, recover
Row 3 - SPECIAL, 4 frames: FRENZY: throws the head back cackling, eyes turn solid red, foam on the jaws, crouches ready to pounce with the mane standing up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - FRENZIED ATTACK, 4 frames: the same attack as row 2 but wilder and faster: bite, claw, bite, claw (eyes red, foaming)

{{PROIBIDO}}
```

### 25. `ogre-A` · Ogro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Mini-boss: maior e mais detalhado que os comuns. Pisão Sísmico de perto, Arremesso de Pedra de longe.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Ogre (MINI-BOSS): a huge, fat, slow giant with a pot belly, lumpy sallow skin with warts and old scars, tiny dim eyes, a jutting underbite with broken teeth, greasy black hair. Wears a filthy loincloth, a cracked tomb lid strapped to one shoulder as armor, chains around the wrists. Drags a massive club made from a stone grave pillar.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 26. `ogre-B` · Ogro

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), ogre-A (o mesmo personagem)
- Notas: Mini-boss: maior e mais detalhado que os comuns. Pisão Sísmico de perto, Arremesso de Pedra de longe.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Ogre (MINI-BOSS): a huge, fat, slow giant with a pot belly, lumpy sallow skin with warts and old scars, tiny dim eyes, a jutting underbite with broken teeth, greasy black hair. Wears a filthy loincloth, a cracked tomb lid strapped to one shoulder as armor, chains around the wrists. Drags a massive club made from a stone grave pillar.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (slow, heavy, club dragging)
Row 2 - ATTACK, 4 frames: raise the pillar club, swing it down, club smashing the ground, lift it back
Row 3 - SPECIAL, 4 frames: SEISMIC STOMP: lifts one huge foot high, slams it down, cracked-stone ring and dust burst around the foot (solid pixel shapes), stands up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - BOULDER THROW, 4 frames: rips a big chunk of stone from the floor, raises it overhead, throws it to the LEFT (stone leaving the hands), follow-through

{{PROIBIDO}}
```

### 27. `bugbear-A` · Bugbear chefe

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Ataque Surpresa: o primeiro golpe em quem não esperava sai brutal. Alcance 2: o golpe tem que chegar longe.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Bugbear chieftain (MINI-BOSS): a big, hairy goblinoid with very long arms that reach past the knees, coarse matted brown fur, a bear-like face with a flat nose, yellow fangs and small cruel eyes, big round ears. Wears a trophy cloak of patched hides, a chieftain's iron crown of spikes, bone bracers. Holds a heavy spiked morningstar on a long haft.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.5 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 28. `bugbear-B` · Bugbear chefe

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), bugbear-A (o mesmo personagem)
- Notas: Ataque Surpresa: o primeiro golpe em quem não esperava sai brutal. Alcance 2: o golpe tem que chegar longe.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Bugbear chieftain (MINI-BOSS): a big, hairy goblinoid with very long arms that reach past the knees, coarse matted brown fur, a bear-like face with a flat nose, yellow fangs and small cruel eyes, big round ears. Wears a trophy cloak of patched hides, a chieftain's iron crown of spikes, bone bracers. Holds a heavy spiked morningstar on a long haft.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.5 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (prowling, long arms swinging)
Row 2 - ATTACK, 4 frames: wind up the morningstar, long reaching swing far to the LEFT, impact, recover
Row 3 - SPECIAL, 4 frames: BRUTAL BLOW: raises the morningstar with both hands, smashes it down, impact burst knocks forward (solid pixel shapes), heaves it back up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - AMBUSH, 4 frames: crouched low half-hidden in shadow (body darkened), eyes gleaming, explodes upward, first swing at full reach

{{PROIBIDO}}
```

### 29. `gelatinousCube-A` · Cubo Gelatinoso

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Mini-boss. Translúcido sem transparência de verdade: tudo em cor chapada (o recorte do jogo não aceita alfa parcial). Camuflado: o jogo escurece quando ele está parado.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Gelatinous cube (MINI-BOSS): a perfect cube of pale glassy green ooze that fills a corridor from wall to wall. Draw the translucency with SOLID pixel colors only (lighter green where you see through, darker green inside, bright highlight pixels on the upper-left edges, no alpha blending). Things are suspended inside it: a half-dissolved adventurer's skeleton, a rusty sword, a helmet, gold coins and bubbles. Slime drips from the bottom edges.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.3 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 30. `gelatinousCube-B` · Cubo Gelatinoso

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), gelatinousCube-A (o mesmo personagem)
- Notas: Mini-boss. Translúcido sem transparência de verdade: tudo em cor chapada (o recorte do jogo não aceita alfa parcial). Camuflado: o jogo escurece quando ele está parado.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Gelatinous cube (MINI-BOSS): a perfect cube of pale glassy green ooze that fills a corridor from wall to wall. Draw the translucency with SOLID pixel colors only (lighter green where you see through, darker green inside, bright highlight pixels on the upper-left edges, no alpha blending). Things are suspended inside it: a half-dissolved adventurer's skeleton, a rusty sword, a helmet, gold coins and bubbles. Slime drips from the bottom edges.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.3 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: the cube slides forward, the bottom edge bulging and dragging, wobble, settle
Row 2 - ATTACK, 4 frames: the front face swells, surges forward, slams, ripples back
Row 3 - SPECIAL, 4 frames: ENGULF: the front face opens like a mouth, surges over the space to the LEFT, closes around it (a dark silhouette of a victim inside), bubbling
Row 4 - DEATH, 3 frames: the cube quivers, collapses into a spreading puddle, flat puddle of ooze with the skeleton, sword and coins left on it (column 4 empty)
Row 5 - SPIT OUT, 3 frames: the cube convulses, bulges forward, spits a gob of slime to the LEFT (column 4 empty)

{{PROIBIDO}}
```

### 31. `mimic-A` · Mímico

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo), comum-baus-portais (o baú do jogo)
- Notas: Mini-boss. Anexe também a folha de baús aprovada (`comum-baus-portais`, item 60 do Pântano): fechado, ele tem que ser igual ao baú do jogo. Quem encosta fica grudado (Adesivo).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Mimic (MINI-BOSS): a monster disguised as an old iron-banded wooden treasure chest. Revealed: the lid is a huge jaw lined with rows of jagged teeth, a long purple-red tongue, a single yellow eye opening on the front where the lock was, wood grain that turns into wet flesh at the edges, sticky amber glue dripping, four stubby pseudopod legs pushing out from under the chest. When disguised it must look EXACTLY like the attached chest from the common chests sheet.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 32. `mimic-B` · Mímico

- Molde: `moldes/molde-B-acao.png` · proporção 4:6 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), comum-baus-portais (o baú do jogo), mimic-A (o mesmo personagem)
- Notas: Mini-boss. Anexe também a folha de baús aprovada (`comum-baus-portais`, item 60 do Pântano): fechado, ele tem que ser igual ao baú do jogo. Quem encosta fica grudado (Adesivo).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Mimic (MINI-BOSS): a monster disguised as an old iron-banded wooden treasure chest. Revealed: the lid is a huge jaw lined with rows of jagged teeth, a long purple-red tongue, a single yellow eye opening on the front where the lock was, wood grain that turns into wet flesh at the edges, sticky amber glue dripping, four stubby pseudopod legs pushing out from under the chest. When disguised it must look EXACTLY like the attached chest from the common chests sheet.

{{FOLHA_B}} 6 rows. Feet aligned on each row's baseline. Size: the character is 0.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: lurching hops on the pseudopod legs, lid flapping
Row 2 - ATTACK, 4 frames: lid opens wide, lunge forward, jaws snap shut, settle
Row 3 - SPECIAL, 4 frames: ACID BITE: tongue lashes out to the LEFT, jaws open dripping acid-green, bite, acid drool
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - REVEAL, 4 frames: closed chest identical to the attached chest, lid twitches with teeth showing at the seam, the eye opens, fully revealed with jaws open
Row 6 - ADHESIVE, 3 frames: amber glue bursts out of the body in sticky strands (solid pixel strands), strands spread around the base, glue settles (column 4 empty)

{{PROIBIDO}}
```

### 33. `dragon-A` · Dragão jovem

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: Boss. Dragão vermelho, imune a fogo (é o que a regra do jogo diz: `monsters.ts`). Voo abaixo de metade da vida: some e cai sobre a presa (linhas 5 e 6).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Young red dragon (BOSS), about 2x2 tiles: crimson-red scales darkening to black at the edges, a pale ember-orange throat and belly that glows faintly from inside (solid pixel glow), swept-back horns and a frill of spines, smoke curling from the nostrils, cracked old scars, big leathery bat wings with torn membranes, a long spiked tail, molten-gold eyes. Soot and old bones from its burned lair stuck to the claws.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 2.5 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 34. `dragon-B` · Dragão jovem

- Molde: `moldes/molde-B-acao.png` · proporção 4:6 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), dragon-A (o mesmo personagem)
- Notas: Boss. Dragão vermelho, imune a fogo (é o que a regra do jogo diz: `monsters.ts`). Voo abaixo de metade da vida: some e cai sobre a presa (linhas 5 e 6).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Young red dragon (BOSS), about 2x2 tiles: crimson-red scales darkening to black at the edges, a pale ember-orange throat and belly that glows faintly from inside (solid pixel glow), swept-back horns and a frill of spines, smoke curling from the nostrils, cracked old scars, big leathery bat wings with torn membranes, a long spiked tail, molten-gold eyes. Soot and old bones from its burned lair stuck to the claws.

{{FOLHA_B}} 6 rows. Feet aligned on each row's baseline. Size: the character is 2.5 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (heavy, wings half open)
Row 2 - ATTACK, 4 frames: bite forward, left claw rake, right claw rake, recover (one bite and two claws)
Row 3 - SPECIAL, 4 frames: INFERNAL BREATH: inhales with the chest glowing, jaws open, a wide cone of fire pours out to the LEFT, fire ends in smoke
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - TAKE OFF, 4 frames: crouches and spreads the wings, beats the wings lifting off, rising with legs tucked, high in the air (hovering above the baseline)
Row 6 - DIVE LANDING, 4 frames: diving down head first, wings folded, slams into the ground with a burst of fire and cracked stone (solid pixel shapes), rises roaring

{{PROIBIDO}}
```
