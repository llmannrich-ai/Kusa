# Fila de arte: Pântano do Kosaradius

> Gerado de `pantano-do-kosaradius.json` (a fonte que o agente lê). Orientação do agente em `ORIENTACAO.md`.

**25 imagens de inimigos** (12 monstros: o clã de orcs e ogros do brejo). A 1 imagem a cada 2 horas, são ~2 dias.
Mesmo padrão do sapo e do bullywug do Pântano das Ruínas: folha A (giro de 12 poses) e folha B (animações de perfil
para a esquerda); o Rei-Ogro tem também a folha C, como a Hidra. O cenário do mapa já é desenhado pelo jogo
(`art/marshDecor.ts`): esta fila é só dos inimigos.

| # | id | Nome | Papel | Tamanho (tiles) | Folha | Linhas | Depende de |
|---|---|---|---|---|---|---|---|
| 1 | `orcScout-A` | Orc batedor | comum | 0,85 | A | 2 × 6 | — |
| 2 | `orcScout-B` | Orc batedor | comum | 0,85 | B | 4 × 4 | `orcScout-A` |
| 3 | `orcGrunt-A` | Orc do Brejo | comum | 1,0 | A | 2 × 6 | — |
| 4 | `orcGrunt-B` | Orc do Brejo | comum | 1,0 | B | 3 × 4 | `orcGrunt-A` |
| 5 | `orcSpearman-A` | Orc lanceiro | comum | 1,0 | A | 2 × 6 | — |
| 6 | `orcSpearman-B` | Orc lanceiro | comum | 1,0 | B | 3 × 4 | `orcSpearman-A` |
| 7 | `orcArcher-A` | Orc arqueiro | comum | 0,95 | A | 2 × 6 | — |
| 8 | `orcArcher-B` | Orc arqueiro | comum | 0,95 | B | 4 × 4 | `orcArcher-A` |
| 9 | `orcShaman-A` | Orc xamã | comum | 0,95 | A | 2 × 6 | — |
| 10 | `orcShaman-B` | Orc xamã | comum | 0,95 | B | 4 × 4 | `orcShaman-A` |
| 11 | `orcBerserker-A` | Orc berserker | comum | 1,05 | A | 2 × 6 | — |
| 12 | `orcBerserker-B` | Orc berserker | comum | 1,05 | B | 4 × 4 | `orcBerserker-A` |
| 13 | `orcCaptain-A` | Orc capitão | comum | 1,1 | A | 2 × 6 | — |
| 14 | `orcCaptain-B` | Orc capitão | comum | 1,1 | B | 4 × 4 | `orcCaptain-A` |
| 15 | `ogreYoung-A` | Ogro jovem | comum | 1,4 | A | 2 × 6 | — |
| 16 | `ogreYoung-B` | Ogro jovem | comum | 1,4 | B | 4 × 4 | `ogreYoung-A` |
| 17 | `ogreBruiser-A` | Ogro do Brejo | mini-boss | 1,8 | A | 2 × 6 | — |
| 18 | `ogreBruiser-B` | Ogro do Brejo | mini-boss | 1,8 | B | 5 × 4 | `ogreBruiser-A` |
| 19 | `ogreShaman-A` | Ogro Xamã | mini-boss | 1,7 | A | 2 × 6 | — |
| 20 | `ogreShaman-B` | Ogro Xamã | mini-boss | 1,7 | B | 5 × 4 | `ogreShaman-A` |
| 21 | `orcWarlord-A` | Chefe de Guerra Orc | mini-boss | 1,3 | A | 2 × 6 | — |
| 22 | `orcWarlord-B` | Chefe de Guerra Orc | mini-boss | 1,3 | B | 5 × 4 | `orcWarlord-A` |
| 23 | `ogreKing-A` | Grumak, o Rei-Ogro | boss | 2,5 | A | 2 × 6 | — |
| 24 | `ogreKing-B` | Grumak, o Rei-Ogro | boss | 2,5 | B | 4 × 4 | `ogreKing-A` |
| 25 | `ogreKing-C` | Grumak, o Rei-Ogro | boss | 2,5 | C | 4 × 4 | `ogreKing-A` |

## Blocos comuns

Os prompts usam marcadores como `{{ESTILO}}`: o agente troca cada um pelo texto do bloco de mesmo nome, abaixo.
Iguais aos do Pântano das Ruínas, menos o `{{CENARIO}}`, que descreve o Kosaradius e o visual comum do clã (para os
12 saírem com a mesma cara de família).

**{{ESTILO}}**

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet: high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything.
```

**{{CENARIO}}**

```text
Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.
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

### 1. `orcScout-A` · Orc batedor

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Fuga Ágil: o especial é fura e pula para trás, sempre olhando para a esquerda (para o alvo).
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc scout: a young, wiry, lean orc of the bog clan, barefoot, hunched and twitchy, always ready to dart away. Small tusks, torn pointed ears, a greasy black mohawk, ochre mud stripes across the face. Wears only a hide loincloth and a rope belt with a small pouch. Holds a crude jagged knife in the right hand.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.85 times the height of one human adult (1 tile). Keeps the knife in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 2. `orcScout-B` · Orc batedor

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Fuga Ágil: o especial é fura e pula para trás, sempre olhando para a esquerda (para o alvo).
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcScout-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc scout: a young, wiry, lean orc of the bog clan, barefoot, hunched and twitchy, always ready to dart away. Small tusks, torn pointed ears, a greasy black mohawk, ochre mud stripes across the face. Wears only a hide loincloth and a rope belt with a small pouch. Holds a crude jagged knife in the right hand.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.85 times the height of one human adult (1 tile). Keeps the knife in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (quick, low, crouched steps)
Row 2 - ATTACK, 4 frames: feint, quick stab forward to the left, knife fully extended, pull back
Row 3 - SPECIAL, 4 frames: HIT AND RUN: stab, kicks off the target, airborne leaping BACKWARD (moving to the right while still facing left), lands crouched
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 3. `orcGrunt-A` · Orc do Brejo

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Sem habilidade: folha B de 3 linhas. É o orc que o Ogro Xamã e o Rei chamam para a briga.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Bog orc warrior: the common warrior of the clan, stocky and muscular, slightly hunched. Heavy jaw with jutting lower tusks, small angry red eyes, shaved head with a topknot. Patched leather jerkin, hide kilt, rope-wrapped forearms. A rusty hand axe in the right hand and a crude shield of nailed wooden planks, painted with a red-clay frog skull, on the left arm.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is the height of one human adult (1 tile). Keeps the axe and the plank shield in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 4. `orcGrunt-B` · Orc do Brejo

- Molde: `moldes/molde-B-acao.png` · proporção 4:3 (largura:altura)
- Nota: Sem habilidade: folha B de 3 linhas. É o orc que o Ogro Xamã e o Rei chamam para a briga.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcGrunt-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Bog orc warrior: the common warrior of the clan, stocky and muscular, slightly hunched. Heavy jaw with jutting lower tusks, small angry red eyes, shaved head with a topknot. Patched leather jerkin, hide kilt, rope-wrapped forearms. A rusty hand axe in the right hand and a crude shield of nailed wooden planks, painted with a red-clay frog skull, on the left arm.

{{FOLHA_B}} 3 rows. Feet aligned on each row's baseline. Size: the character is the height of one human adult (1 tile). Keeps the axe and the plank shield in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: raise the axe behind the head, overhead chop to the left, axe at the bottom, recover behind the shield
Row 3 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 5. `orcSpearman-A` · Orc lanceiro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Sem habilidade: folha B de 3 linhas. A lança é a assinatura: precisa ficar bem comprida e não pode ser cortada na borda.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc spearman: a lean, upright orc sentry of the bog clan. Conical hat of woven reeds, chest guard of tied reeds over leather, hide wraps on the legs, a fish-bone necklace. Holds with both hands a very long spear of twisted mangrove wood, about 1.6 times his own height, with a rusty iron leaf blade and a tuft of feathers.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is the height of one human adult (1 tile). Keeps the long spear in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 6. `orcSpearman-B` · Orc lanceiro

- Molde: `moldes/molde-B-acao.png` · proporção 4:3 (largura:altura)
- Nota: Sem habilidade: folha B de 3 linhas. A lança é a assinatura: precisa ficar bem comprida e não pode ser cortada na borda.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcSpearman-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc spearman: a lean, upright orc sentry of the bog clan. Conical hat of woven reeds, chest guard of tied reeds over leather, hide wraps on the legs, a fish-bone necklace. Holds with both hands a very long spear of twisted mangrove wood, about 1.6 times his own height, with a rusty iron leaf blade and a tuft of feathers.

{{FOLHA_B}} 3 rows. Feet aligned on each row's baseline. Size: the character is the height of one human adult (1 tile). Keeps the long spear in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (spear held upright)
Row 2 - ATTACK, 4 frames: pull the spear back, long thrust to the left, spear fully extended far ahead (reaches 2 tiles), recover
Row 3 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 7. `orcArcher-A` · Orc arqueiro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Recua quando o herói chega a 3 tiles: o especial é o recuo de frente para o alvo.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc archer: a lean orc of the bog clan with a hooded short cloak of moss-stained burlap, a scar across one eye, leather bracer on the left forearm. A short recurved bow made of bone and sinew, a quiver of crow-feather arrows with bone arrowheads on the back.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.95 times the height of one human adult (1 tile). Keeps the bow in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 8. `orcArcher-B` · Orc arqueiro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Recua quando o herói chega a 3 tiles: o especial é o recuo de frente para o alvo.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcArcher-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc archer: a lean orc of the bog clan with a hooded short cloak of moss-stained burlap, a scar across one eye, leather bracer on the left forearm. A short recurved bow made of bone and sinew, a quiver of crow-feather arrows with bone arrowheads on the back.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.95 times the height of one human adult (1 tile). Keeps the bow in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: nock an arrow, full draw, release with the arrow flying away to the left, lower the bow
Row 3 - SPECIAL, 4 frames: BACKSTEP: hops backward (moving to the right while still facing left), lands, re-aims the bow to the left, ready
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 9. `orcShaman-A` · Orc xamã

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Lama Agarrada: o jogo desenha a lama prendendo o herói; a folha só precisa do arremesso.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc shaman: a thin, old, bent orc of the bog clan. Wears a mask made from a giant frog skull, the face and bare arms painted with mud and pale clay symbols, a cape of reeds and dried frog skins. Holds a staff of twisted mangrove root topped with a frog skull and hanging dried frogs; the skull's eye sockets glow sickly yellow-green.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.95 times the height of one human adult (1 tile). Keeps the staff in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 10. `orcShaman-B` · Orc xamã

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Lama Agarrada: o jogo desenha a lama prendendo o herói; a folha só precisa do arremesso.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcShaman-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc shaman: a thin, old, bent orc of the bog clan. Wears a mask made from a giant frog skull, the face and bare arms painted with mud and pale clay symbols, a cape of reeds and dried frog skins. Holds a staff of twisted mangrove root topped with a frog skull and hanging dried frogs; the skull's eye sockets glow sickly yellow-green.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.95 times the height of one human adult (1 tile). Keeps the staff in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (leaning on the staff)
Row 2 - ATTACK, 4 frames: raise the staff, the skull glows, thrusts the staff to the left releasing a small green swamp bolt, recover
Row 3 - SPECIAL, 4 frames: MUD GRIP: plants the staff in the ground, mud swirls up around it, gathers a ball of sticky green-brown mud, hurls it far to the left
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 11. `orcBerserker-A` · Orc berserker

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Rompante (ferido, bate mais rápido) é do jogo: não precisa de quadro.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc berserker: a huge, bare-chested, heavily muscled orc of the bog clan, the whole body painted with red clay and handprints, many scars, wild long black hair, bloodshot eyes, foam at the mouth, a rusty chain around the neck. A rusty hand axe in EACH hand.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.05 times the height of one human adult (1 tile). Keeps the two axes in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 12. `orcBerserker-B` · Orc berserker

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Rompante (ferido, bate mais rápido) é do jogo: não precisa de quadro.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcBerserker-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc berserker: a huge, bare-chested, heavily muscled orc of the bog clan, the whole body painted with red clay and handprints, many scars, wild long black hair, bloodshot eyes, foam at the mouth, a rusty chain around the neck. A rusty hand axe in EACH hand.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.05 times the height of one human adult (1 tile). Keeps the two axes in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (leaning forward, aggressive)
Row 2 - ATTACK, 4 frames: both axes raised, first axe chops to the left, second axe chops, recover
Row 3 - SPECIAL, 4 frames: AGGRESSIVE LEAP: deep crouch, huge leap forward to the left with both axes raised, airborne, lands with both axes slamming down
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 13. `orcCaptain-A` · Orc capitão

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Comando: o especial é a ordem para o bando (o jogo usa quando ele lidera os orcs perto).
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc captain: a broad, battle-scarred orc officer of the bog clan. Dented iron helmet with two boar tusks as horns, a coat of rusty iron scales over leather, a fur collar, iron bracers. A heavy curved cleaver-sword in the right hand. A war banner pole strapped on the back, with a tattered hide banner painted with a red frog skull rising above his head.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.1 times the height of one human adult (1 tile). Keeps the cleaver-sword in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 14. `orcCaptain-B` · Orc capitão

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Comando: o especial é a ordem para o bando (o jogo usa quando ele lidera os orcs perto).
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcCaptain-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc captain: a broad, battle-scarred orc officer of the bog clan. Dented iron helmet with two boar tusks as horns, a coat of rusty iron scales over leather, a fur collar, iron bracers. A heavy curved cleaver-sword in the right hand. A war banner pole strapped on the back, with a tattered hide banner painted with a red frog skull rising above his head.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.1 times the height of one human adult (1 tile). Keeps the cleaver-sword in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: raise the cleaver, diagonal slash to the left, follow-through, recover
Row 3 - SPECIAL, 4 frames: COMMAND: points the cleaver forward to the left, roars an order, the banner on his back waving, fist raised high
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 15. `ogreYoung-A` · Ogro jovem

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Pancada: golpe forte que empurra o herói; o especial é o balanço de lado.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Young ogre: a big young ogre of the bog clan, thick limbs and broad shoulders but no big belly yet, a small head with a dull face and a heavy underbite, patchy hair, greyish-tan skin smeared with mud. Crude hide loincloth held by a rope. A thick knotted tree-branch club in the right hand.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.4 times the height of one human adult (1 tile). Keeps the club in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 16. `ogreYoung-B` · Ogro jovem

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Pancada: golpe forte que empurra o herói; o especial é o balanço de lado.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_ogreYoung-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Young ogre: a big young ogre of the bog clan, thick limbs and broad shoulders but no big belly yet, a small head with a dull face and a heavy underbite, patchy hair, greyish-tan skin smeared with mud. Crude hide loincloth held by a rope. A thick knotted tree-branch club in the right hand.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.4 times the height of one human adult (1 tile). Keeps the club in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (heavy, slow steps)
Row 2 - ATTACK, 4 frames: lift the club overhead, smash down to the left, club hits the ground, lift it again
Row 3 - SPECIAL, 4 frames: WALLOP: wind the club far back, huge sideways swing to the left, follow-through spinning the torso, recover
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 17. `ogreBruiser-A` · Ogro do Brejo

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Mini-boss: maior e mais detalhado que os comuns. 5 linhas: Pisão Sísmico (perto) e Arremesso de Pedra (longe).
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Bog ogre (MINI-BOSS): a massive, big-bellied ogre of the bog clan, much bigger and more detailed than the common monsters. Warty grey-green hide, thick neck, tiny eyes, broken tusks. A shoulder guard of iron plates and bones on the left shoulder, a belt of orc and frog skulls, rusty chains wrapped around the arms. A huge wooden club studded with iron spikes in the right hand.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.8 times the height of one human adult (1 tile). Keeps the spiked club in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 18. `ogreBruiser-B` · Ogro do Brejo

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Nota: Mini-boss: maior e mais detalhado que os comuns. 5 linhas: Pisão Sísmico (perto) e Arremesso de Pedra (longe).
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_ogreBruiser-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Bog ogre (MINI-BOSS): a massive, big-bellied ogre of the bog clan, much bigger and more detailed than the common monsters. Warty grey-green hide, thick neck, tiny eyes, broken tusks. A shoulder guard of iron plates and bones on the left shoulder, a belt of orc and frog skulls, rusty chains wrapped around the arms. A huge wooden club studded with iron spikes in the right hand.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.8 times the height of one human adult (1 tile). Keeps the spiked club in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (very heavy, stomping steps)
Row 2 - ATTACK, 4 frames: lift the spiked club, smash down to the left, club buried in the ground, pull it out
Row 3 - SPECIAL, 4 frames: SEISMIC STOMP: lifts the right foot high, stomps down, a ring of mud and water splashes out (solid pixel shapes), straightens up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - BOULDER THROW, 4 frames: club kept in the right hand, bends down and grabs a big mossy rock with the LEFT hand, raises the rock overhead, hurls it far to the left, follow-through

{{PROIBIDO}}
```

### 19. `ogreShaman-A` · Ogro Xamã

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Mini-boss. 5 linhas: Maldição do Brejo (lento e veneno) e Chamado do Clã (chama 2 Orcs do Brejo).
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Ogre shaman (MINI-BOSS): an old, hunched ogre of the bog clan with a long grey beard braided with reeds, a cloak of moss and swamp hides, several necklaces of frog skulls and teeth, pale clay symbols on the belly. Holds a tall staff made of a dead tree trunk with three orc skulls tied to the top; the skulls' eye sockets and the shaman's eyes glow sickly green.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.7 times the height of one human adult (1 tile). Keeps the skull staff in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 20. `ogreShaman-B` · Ogro Xamã

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Nota: Mini-boss. 5 linhas: Maldição do Brejo (lento e veneno) e Chamado do Clã (chama 2 Orcs do Brejo).
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_ogreShaman-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Ogre shaman (MINI-BOSS): an old, hunched ogre of the bog clan with a long grey beard braided with reeds, a cloak of moss and swamp hides, several necklaces of frog skulls and teeth, pale clay symbols on the belly. Holds a tall staff made of a dead tree trunk with three orc skulls tied to the top; the skulls' eye sockets and the shaman's eyes glow sickly green.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.7 times the height of one human adult (1 tile). Keeps the skull staff in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (hunched, leaning on the staff)
Row 2 - ATTACK, 4 frames: raise the staff, the skulls glow, thrusts the staff to the left releasing a green swamp bolt, recover
Row 3 - SPECIAL, 4 frames: BOG CURSE: raises the staff with both hands, green toxic mist gathers around the skulls, points the staff to the left, the mist rains down ahead
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - CLAN CALL, 4 frames: staff kept in the right hand, lifts a bone war horn with the LEFT hand, blows it with the cheeks puffed, raises the staff high, slams the staff into the ground

{{PROIBIDO}}
```

### 21. `orcWarlord-A` · Chefe de Guerra Orc

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Mini-boss. 5 linhas: Investida e Golpe Giratório. O giro é a única linha que sai do perfil (o meio do giro mostra costas e frente).
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc warlord (MINI-BOSS): a towering mountain of muscle, the biggest orc of the clan, more detailed than the common monsters. Scavenged full plate armor of rusty iron with spikes on the shoulders, a horned iron helm with an open face showing big tusks, a mantle of black bear fur, a red-clay war paint stripe across the eyes. A huge two-handed cleaver held in both hands.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.3 times the height of one human adult (1 tile). Keeps the two-handed cleaver in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 22. `orcWarlord-B` · Chefe de Guerra Orc

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Nota: Mini-boss. 5 linhas: Investida e Golpe Giratório. O giro é a única linha que sai do perfil (o meio do giro mostra costas e frente).
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_orcWarlord-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Orc warlord (MINI-BOSS): a towering mountain of muscle, the biggest orc of the clan, more detailed than the common monsters. Scavenged full plate armor of rusty iron with spikes on the shoulders, a horned iron helm with an open face showing big tusks, a mantle of black bear fur, a red-clay war paint stripe across the eyes. A huge two-handed cleaver held in both hands.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.3 times the height of one human adult (1 tile). Keeps the two-handed cleaver in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: raise the cleaver over the shoulder, heavy diagonal cleave to the left, blade at the bottom, recover
Row 3 - SPECIAL, 4 frames: CHARGE: lowers the shoulder, sprints forward to the left, airborne leap with the cleaver raised, crashes down with the cleaver
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - WHIRLWIND, 4 frames: cleaver held out sideways, spins around in a full circle (the middle frames may show his back and front), blade sweeping, stops facing left again

{{PROIBIDO}}
```

### 23. `ogreKing-A` · Grumak, o Rei-Ogro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Nota: Boss: quadro grande. Tem 5 habilidades: a folha B traz Esmagar e Pisão do Pântano; a folha C, as outras e o frenesi.
- Anexar: `goblin-referencia.jpeg`

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Grumak, the Ogre King (BOSS), huge, about 2x2 tiles: an enormous, fat ogre king with a gigantic belly, the biggest and most detailed figure of the set. Warty grey-green hide with old scars and leeches, a wild matted beard, broken tusks, small cruel yellow eyes. A crooked iron crown, too small for his head. A cloak of bear and crocodile hides, gold rings, bone and gold jewelry, a wide belt with a rusty iron buckle. Carries as a club a WHOLE TREE TRUNK with the roots still attached.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 2.5 times the height of one human adult (1 tile). Keeps the tree-trunk club in hand in EVERY frame, including the walk cycle.

{{PROIBIDO}}
```

### 24. `ogreKing-B` · Grumak, o Rei-Ogro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Boss: quadro grande. Tem 5 habilidades: a folha B traz Esmagar e Pisão do Pântano; a folha C, as outras e o frenesi.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_ogreKing-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Grumak, the Ogre King (BOSS), huge, about 2x2 tiles: an enormous, fat ogre king with a gigantic belly, the biggest and most detailed figure of the set. Warty grey-green hide with old scars and leeches, a wild matted beard, broken tusks, small cruel yellow eyes. A crooked iron crown, too small for his head. A cloak of bear and crocodile hides, gold rings, bone and gold jewelry, a wide belt with a rusty iron buckle. Carries as a club a WHOLE TREE TRUNK with the roots still attached.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 2.5 times the height of one human adult (1 tile). Keeps the tree-trunk club in hand in EVERY frame, including the walk cycle.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (very heavy steps, the trunk resting on the shoulder)
Row 2 - ATTACK (CRUSH), 4 frames: lift the trunk high overhead with both hands, smash it down to the left, trunk slammed on the ground, lift it again
Row 3 - SPECIAL, 4 frames: SWAMP STOMP: lifts the right foot high, stomps down, a ring of mud and water splashes out (solid pixel shapes), straightens up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 25. `ogreKing-C` · Grumak, o Rei-Ogro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Nota: Boss: quadro grande. Tem 5 habilidades: a folha B traz Esmagar e Pisão do Pântano; a folha C, as outras e o frenesi.
- Anexar: `goblin-referencia.jpeg` e a folha A aprovada (`RPG_ogreKing-A_vNN.png`)

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Grumak, the Ogre King (BOSS), huge, about 2x2 tiles: an enormous, fat ogre king with a gigantic belly, the biggest and most detailed figure of the set. Warty grey-green hide with old scars and leeches, a wild matted beard, broken tusks, small cruel yellow eyes. A crooked iron crown, too small for his head. A cloak of bear and crocodile hides, gold rings, bone and gold jewelry, a wide belt with a rusty iron buckle. Carries as a club a WHOLE TREE TRUNK with the roots still attached.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline (in the leap frames the body is airborne above it). Size: the character is 2.5 times the height of one human adult (1 tile). Keeps the tree-trunk club in hand in EVERY frame, including the walk cycle.
Row 1 - KING CHARGE, 4 frames: lowers the head, charging run to the left with the trunk forward, airborne leap, lands with a heavy splash
Row 2 - LOG THROW, 4 frames: trunk club kept in the right hand, pulls a smaller log from his back with the LEFT hand, raises it over the head, hurls it far to the left, follow-through
Row 3 - KING ROAR, 4 frames: throws the head back and roars to the sky, raises the trunk club high in the right hand, beats the chest with the left fist, roars at the front-left
Row 4 - FRENZY WALK, 4 frames: same walk cycle as row 1 of the action sheet, but enraged: hunched forward, eyes glowing red, steam from the nostrils, faster stride

{{PROIBIDO}}
```
