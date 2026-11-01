# Folhas A, B e C — prompts em sequência para o ChatGPT (Pântano do Kosaradius)

Cada inimigo tem 3 prompts, um por folha, sempre na ordem **A → B → C**. A cada 3 prompts troca o inimigo.

## Regras (o que faz o personagem sair igual nas 3 folhas)

1. **Uma conversa nova do ChatGPT por inimigo.** Os 3 prompts dele vão na mesma conversa, um depois do outro; não misture inimigos na mesma conversa.
2. **Prompt A:** anexe `docs/arte/goblin-referencia.png` (só o estilo). Gere até gostar do personagem: ele vira o modelo das folhas B e C.
3. **Prompts B e C:** anexe de novo a folha A aprovada (a imagem que você baixou) junto com o prompt. Na C, anexe também a B aprovada.
4. **Uma imagem por prompt.** Nunca peça várias folhas numa imagem só.
5. Antes de seguir para o próximo prompt, compare com a folha A: cabeça (elmo/coroa), arma e roupa iguais. Se mudou, peça de novo na mesma conversa: *"The character changed. Redraw it identical to the attached sheet A, only the poses change."*
6. Salve cada imagem com o nome indicado e mande para o Claude, 2 ou mais por mensagem, como arquivo original (não print nem montagem).

As folhas novas substituem as de hoje (`<kind>-A.png` e `<kind>-B.png`): o jogo passa a usar o personagem novo inteiro.

| # | Inimigo | Prompts |
|---|---|---|
| 1 | Grumak, o Rei-Ogro (`ogreKing`) | 1 (A) · 2 (B) · 3 (C) |
| 2 | Chefe de Guerra Orc (`orcWarlord`) | 4 (A) · 5 (B) · 6 (C) |
| 3 | Ogro do Brejo (`ogreBruiser`) | 7 (A) · 8 (B) · 9 (C) |
| 4 | Ogro Xamã (`ogreShaman`) | 10 (A) · 11 (B) · 12 (C) |
| 5 | Ogro jovem (`ogreYoung`) | 13 (A) · 14 (B) · 15 (C) |
| 6 | Orc xamã (`orcShaman`) | 16 (A) · 17 (B) · 18 (C) |
| 7 | Orc berserker (`orcBerserker`) | 19 (A) · 20 (B) · 21 (C) |
| 8 | Orc batedor (`orcScout`) | 22 (A) · 23 (B) · 24 (C) |

---

## 1. Grumak, o Rei-Ogro (`ogreKing`)

### Prompt 1 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `ogreKing-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Grumak, the Ogre King (BOSS), huge, about 2x2 tiles: an enormous, fat ogre king with a gigantic belly, the biggest and most detailed figure of the set. Warty grey-green hide with old scars and leeches, a wild matted beard, broken tusks, small cruel yellow eyes. A crooked iron crown, too small for his head. A cloak of bear and crocodile hides, gold rings, bone and gold jewelry, a wide belt with a rusty iron buckle. Carries as a club a WHOLE TREE TRUNK with the roots still attached.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 2.5 times the height of one human adult (1 tile). Keeps the tree-trunk club in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 2 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`ogreKing-A.png`)
- **Salvar como:** `ogreKing-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Grumak, the Ogre King). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Grumak, the Ogre King (BOSS), huge, about 2x2 tiles: an enormous, fat ogre king with a gigantic belly, the biggest and most detailed figure of the set. Warty grey-green hide with old scars and leeches, a wild matted beard, broken tusks, small cruel yellow eyes. A crooked iron crown, too small for his head. A cloak of bear and crocodile hides, gold rings, bone and gold jewelry, a wide belt with a rusty iron buckle. Carries as a club a WHOLE TREE TRUNK with the roots still attached.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The tree-trunk club stays in hand in EVERY frame. Same scale as sheet A: the character is 2.5 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: CRUSH: ready stance, lifts the trunk high overhead with both hands, smashes it down forward, trunk slammed on the ground, lifts it again, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 3 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`ogreKing-A.png` e `ogreKing-B.png`)
- **Salvar como:** `ogreKing-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Grumak, the Ogre King). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Grumak, the Ogre King (BOSS), huge, about 2x2 tiles: an enormous, fat ogre king with a gigantic belly, the biggest and most detailed figure of the set. Warty grey-green hide with old scars and leeches, a wild matted beard, broken tusks, small cruel yellow eyes. A crooked iron crown, too small for his head. A cloak of bear and crocodile hides, gold rings, bone and gold jewelry, a wide belt with a rusty iron buckle. Carries as a club a WHOLE TREE TRUNK with the roots still attached.

LAYOUT: 4 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The tree-trunk club stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - SWAMP STOMP, 6 frames: shifts weight, lifts the right foot high, foot at the top, stomps down hard, knees bent from the impact, straightens up
Row 2 - KING CHARGE, 6 frames: lowers the head and shoulder, crouches, launches upward, airborne with the trunk held forward, lands heavily with bent knees, straightens up
Row 3 - LOG THROW, 6 frames: trunk club kept in the right hand, reaches behind his back with the LEFT hand, pulls out a short log, raises it over the head, hurls it forward (the log leaves the hand), follow-through
Row 4 - KING ROAR, 6 frames: hunches and breathes in, throws the head back, roars to the sky with the mouth wide open, raises the trunk club high, beats the chest with the left fist, roars at the front-left

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 2. Chefe de Guerra Orc (`orcWarlord`)

### Prompt 4 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `orcWarlord-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Orc warlord (MINI-BOSS): a towering mountain of muscle, the biggest orc of the clan, more detailed than the common monsters. Scavenged full plate armor of rusty iron with spikes on the shoulders, a horned iron helm with an open face showing big tusks, a mantle of black bear fur, a red-clay war paint stripe across the eyes. A huge two-handed RECTANGULAR butcher cleaver (straight edge, square tip, never a curved sword) held in both hands.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 1.3 times the height of one human adult (1 tile). Keeps the two-handed cleaver in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 5 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`orcWarlord-A.png`)
- **Salvar como:** `orcWarlord-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Orc warlord). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc warlord (MINI-BOSS): a towering mountain of muscle, the biggest orc of the clan, more detailed than the common monsters. Scavenged full plate armor of rusty iron with spikes on the shoulders, a horned iron helm with an open face showing big tusks, a mantle of black bear fur, a red-clay war paint stripe across the eyes. A huge two-handed RECTANGULAR butcher cleaver (straight edge, square tip, never a curved sword) held in both hands.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The two-handed cleaver stays in hand in EVERY frame. Same scale as sheet A: the character is 1.3 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: CLEAVE: ready stance, raises the cleaver over the right shoulder, heavy diagonal cleave forward, blade at the bottom, pulls it back up, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 6 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`orcWarlord-A.png` e `orcWarlord-B.png`)
- **Salvar como:** `orcWarlord-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Orc warlord). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc warlord (MINI-BOSS): a towering mountain of muscle, the biggest orc of the clan, more detailed than the common monsters. Scavenged full plate armor of rusty iron with spikes on the shoulders, a horned iron helm with an open face showing big tusks, a mantle of black bear fur, a red-clay war paint stripe across the eyes. A huge two-handed RECTANGULAR butcher cleaver (straight edge, square tip, never a curved sword) held in both hands.

LAYOUT: 2 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The two-handed cleaver stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - CHARGE, 6 frames: lowers the shoulder, crouches, launches upward with the cleaver raised, airborne, crashes down with the cleaver, recovers
Row 2 - WHIRLWIND, 6 frames: cleaver held tight across the chest, starts turning, seen from the side, seen from the back, seen from the other side, back to the 3/4 front view with the blade low

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 3. Ogro do Brejo (`ogreBruiser`)

### Prompt 7 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `ogreBruiser-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Bog ogre (MINI-BOSS): a massive, big-bellied ogre of the bog clan, much bigger and more detailed than the common monsters. Warty grey-green hide, thick neck, tiny eyes, broken tusks. A shoulder guard of iron plates and bones on the left shoulder, a belt of orc and frog skulls, rusty chains wrapped around the arms. A huge wooden club studded with iron spikes in the right hand.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 1.8 times the height of one human adult (1 tile). Keeps the spiked club in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 8 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`ogreBruiser-A.png`)
- **Salvar como:** `ogreBruiser-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Bog ogre). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Bog ogre (MINI-BOSS): a massive, big-bellied ogre of the bog clan, much bigger and more detailed than the common monsters. Warty grey-green hide, thick neck, tiny eyes, broken tusks. A shoulder guard of iron plates and bones on the left shoulder, a belt of orc and frog skulls, rusty chains wrapped around the arms. A huge wooden club studded with iron spikes in the right hand.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The spiked club stays in hand in EVERY frame. Same scale as sheet A: the character is 1.8 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: SMASH: ready stance, lifts the spiked club overhead, smashes it down forward, club hits the ground, pulls it out, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 9 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`ogreBruiser-A.png` e `ogreBruiser-B.png`)
- **Salvar como:** `ogreBruiser-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Bog ogre). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Bog ogre (MINI-BOSS): a massive, big-bellied ogre of the bog clan, much bigger and more detailed than the common monsters. Warty grey-green hide, thick neck, tiny eyes, broken tusks. A shoulder guard of iron plates and bones on the left shoulder, a belt of orc and frog skulls, rusty chains wrapped around the arms. A huge wooden club studded with iron spikes in the right hand.

LAYOUT: 2 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The spiked club stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - SEISMIC STOMP (no rock in this row), 6 frames: shifts weight, lifts the right foot high, foot at the top, stomps down hard, knees bent from the impact, straightens up
Row 2 - BOULDER THROW, 6 frames: bends down, grabs a big mossy rock with the LEFT hand, lifts it to the chest, raises it overhead, hurls it forward (the rock leaves the hand), follow-through

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 4. Ogro Xamã (`ogreShaman`)

### Prompt 10 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `ogreShaman-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Ogre shaman (MINI-BOSS): an old, hunched ogre of the bog clan with a long grey beard braided with reeds, a cloak of moss and swamp hides, several necklaces of frog skulls and teeth, pale clay symbols on the belly. Holds a tall staff made of a dead tree trunk with three orc skulls tied to the top; the skulls' eye sockets and the shaman's eyes glow sickly green.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 1.7 times the height of one human adult (1 tile). Keeps the skull staff in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 11 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`ogreShaman-A.png`)
- **Salvar como:** `ogreShaman-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Ogre shaman). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Ogre shaman (MINI-BOSS): an old, hunched ogre of the bog clan with a long grey beard braided with reeds, a cloak of moss and swamp hides, several necklaces of frog skulls and teeth, pale clay symbols on the belly. Holds a tall staff made of a dead tree trunk with three orc skulls tied to the top; the skulls' eye sockets and the shaman's eyes glow sickly green.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The skull staff stays in hand in EVERY frame. Same scale as sheet A: the character is 1.7 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: STAFF STRIKE: ready stance, raises the staff, the skulls glow, thrusts the staff forward, holds it, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 12 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`ogreShaman-A.png` e `ogreShaman-B.png`)
- **Salvar como:** `ogreShaman-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Ogre shaman). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Ogre shaman (MINI-BOSS): an old, hunched ogre of the bog clan with a long grey beard braided with reeds, a cloak of moss and swamp hides, several necklaces of frog skulls and teeth, pale clay symbols on the belly. Holds a tall staff made of a dead tree trunk with three orc skulls tied to the top; the skulls' eye sockets and the shaman's eyes glow sickly green.

LAYOUT: 2 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The skull staff stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - BOG CURSE, 6 frames: grips the staff with both hands, raises it, holds it high while chanting with the eyes closed, opens the eyes, points the staff forward and down, lowers it
Row 2 - CLAN CALL, 6 frames: lifts a bone war horn with the LEFT hand, brings it to the mouth, blows it with the cheeks puffed, lowers the horn, raises the staff high, slams the staff butt into the ground

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 5. Ogro jovem (`ogreYoung`)

### Prompt 13 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `ogreYoung-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Young ogre: a big young ogre of the bog clan, thick limbs and broad shoulders but no big belly yet, a small head with a dull face and a heavy underbite, patchy hair, greyish-tan skin smeared with mud. Crude hide loincloth held by a rope. A thick knotted tree-branch club in the right hand.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 1.4 times the height of one human adult (1 tile). Keeps the club in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 14 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`ogreYoung-A.png`)
- **Salvar como:** `ogreYoung-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Young ogre). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Young ogre: a big young ogre of the bog clan, thick limbs and broad shoulders but no big belly yet, a small head with a dull face and a heavy underbite, patchy hair, greyish-tan skin smeared with mud. Crude hide loincloth held by a rope. A thick knotted tree-branch club in the right hand.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The club stays in hand in EVERY frame. Same scale as sheet A: the character is 1.4 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: SMASH: ready stance, lifts the club overhead, smashes it down forward, club hits the ground, lifts it again, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 15 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`ogreYoung-A.png` e `ogreYoung-B.png`)
- **Salvar como:** `ogreYoung-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Young ogre). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Young ogre: a big young ogre of the bog clan, thick limbs and broad shoulders but no big belly yet, a small head with a dull face and a heavy underbite, patchy hair, greyish-tan skin smeared with mud. Crude hide loincloth held by a rope. A thick knotted tree-branch club in the right hand.

LAYOUT: 1 row x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The club stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - WALLOP, 6 frames: twists the torso and winds the club far back over the right shoulder, holds, starts a huge sideways swing, club sweeps across the front, follow-through with the torso turned, recovers

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 6. Orc xamã (`orcShaman`)

### Prompt 16 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `orcShaman-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Orc shaman: a thin, old, bent orc of the bog clan. Wears a mask made from a giant frog skull, the face and bare arms painted with mud and pale clay symbols, a cape of reeds and dried frog skins. Holds a staff of twisted mangrove root topped with a frog skull and hanging dried frogs; the skull's eye sockets glow sickly yellow-green.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 0.95 times the height of one human adult (1 tile). Keeps the staff in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 17 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`orcShaman-A.png`)
- **Salvar como:** `orcShaman-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Orc shaman). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc shaman: a thin, old, bent orc of the bog clan. Wears a mask made from a giant frog skull, the face and bare arms painted with mud and pale clay symbols, a cape of reeds and dried frog skins. Holds a staff of twisted mangrove root topped with a frog skull and hanging dried frogs; the skull's eye sockets glow sickly yellow-green.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The staff stays in hand in EVERY frame. Same scale as sheet A: the character is 0.95 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: STAFF STRIKE: ready stance, raises the staff, the skull glows, thrusts the staff forward, holds it, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 18 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`orcShaman-A.png` e `orcShaman-B.png`)
- **Salvar como:** `orcShaman-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Orc shaman). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc shaman: a thin, old, bent orc of the bog clan. Wears a mask made from a giant frog skull, the face and bare arms painted with mud and pale clay symbols, a cape of reeds and dried frog skins. Holds a staff of twisted mangrove root topped with a frog skull and hanging dried frogs; the skull's eye sockets glow sickly yellow-green.

LAYOUT: 1 row x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The staff stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - MUD GRIP, 6 frames: plants the staff in the ground, crouches and scoops a ball of sticky green-brown mud with the LEFT hand, stands up holding it, pulls the arm back, hurls it forward (the mud leaves the hand), follow-through

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 7. Orc berserker (`orcBerserker`)

### Prompt 19 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `orcBerserker-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Orc berserker: a huge, bare-chested, heavily muscled orc of the bog clan, the whole body painted with red clay and handprints, many scars, wild long black hair, bloodshot eyes, foam at the mouth, a rusty chain around the neck. A rusty hand axe in EACH hand.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 1.05 times the height of one human adult (1 tile). Keeps the two axes in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 20 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`orcBerserker-A.png`)
- **Salvar como:** `orcBerserker-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Orc berserker). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc berserker: a huge, bare-chested, heavily muscled orc of the bog clan, the whole body painted with red clay and handprints, many scars, wild long black hair, bloodshot eyes, foam at the mouth, a rusty chain around the neck. A rusty hand axe in EACH hand.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The two axes stays in hand in EVERY frame. Same scale as sheet A: the character is 1.05 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: DOUBLE CHOP: ready stance, both axes raised, first axe chops down forward, second axe chops down, both axes low, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 21 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`orcBerserker-A.png` e `orcBerserker-B.png`)
- **Salvar como:** `orcBerserker-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Orc berserker). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc berserker: a huge, bare-chested, heavily muscled orc of the bog clan, the whole body painted with red clay and handprints, many scars, wild long black hair, bloodshot eyes, foam at the mouth, a rusty chain around the neck. A rusty hand axe in EACH hand.

LAYOUT: 1 row x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The two axes stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - AGGRESSIVE LEAP, 6 frames: deep crouch, springs up with both axes raised, airborne at the top, falling with the axes overhead, lands with both axes slamming down, straightens up

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

---

## 8. Orc batedor (`orcScout`)

### Prompt 22 — folha A (giro)

- **Conversa:** nova
- **Anexar:** `goblin-referencia.png`
- **Salvar como:** `orcScout-A.png`

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet (style only, not the character): high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything. Setting: the Kosaradius Marsh - a vast flooded forest of bald cypresses, weeping willows and mangroves over tea-dark water and mud, with Spanish moss hanging from the branches. It is the home of the bog clan of orcs and ogres. Clan look shared by EVERY orc and ogre of this set: coarse grey-green to olive skin streaked with dried swamp mud; crude gear of rusty iron, mangrove wood, reeds, rope and untanned hides; frog and fish skulls worn as trophies; war paint of ochre mud and red clay. Colors of the place: olive green, moss, mud brown, tea-dark water, rust.

SUBJECT: Orc scout: a young, wiry, lean orc of the bog clan, barefoot, hunched and twitchy, always ready to dart away. Small tusks, torn pointed ears, a greasy black mohawk, ochre mud stripes across the face. Wears only a hide loincloth and a rope belt with a small pouch. Holds a crude jagged knife in the right hand.

SHEET: character turnaround sprite sheet, 2 rows x 6 columns = 12 figures of the SAME character, each figure completely separated from the others by empty space (no overlap, nothing touching). Row 1: standing idle. Row 2: walking, mid-stride. Columns from left to right: (1) front view; (2) 3/4 front view turned to the LEFT; (3) side profile facing LEFT; (4) 3/4 back view turned to the LEFT; (5) back view; (6) 3/4 back view turned to the right. Same scale, outfit, colors and proportions in all figures. Large figures that fill the height of each row. Aspect ratio 3:1. All feet on the same horizontal baseline in each row. Size: the character is 0.85 times the height of one human adult (1 tile). Keeps the knife in hand in EVERY frame, including the walk cycle.

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 23 — folha B (golpe e morte)

- **Conversa:** a mesma do prompt anterior
- **Anexar:** a folha A aprovada (`orcScout-A.png`)
- **Salvar como:** `orcScout-B.png`

```text
Action sprite sheet of the character in the attached sheet A (Orc scout). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc scout: a young, wiry, lean orc of the bog clan, barefoot, hunched and twitchy, always ready to dart away. Small tusks, torn pointed ears, a greasy black mohawk, ochre mud stripes across the face. Wears only a hide loincloth and a rope belt with a small pouch. Holds a crude jagged knife in the right hand.

LAYOUT: 2 rows x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (column 2 of sheet A). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The knife stays in hand in EVERY frame. Same scale as sheet A: the character is 0.85 times the height of one human adult (1 tile). Aspect ratio 3:1.
Row 1 - ATTACK, 6 frames: STAB: ready stance, feint, quick stab forward, knife fully extended, pulls back, back to the ready stance
Row 2 - DEATH, 6 frames: hit and recoiling, staggering, falls to the knees, falling forward, hits the ground, corpse lying still with the weapon beside it

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```

### Prompt 24 — folha C (habilidades)

- **Conversa:** a mesma dos prompts anteriores
- **Anexar:** as folhas A e B aprovadas (`orcScout-A.png` e `orcScout-B.png`)
- **Salvar como:** `orcScout-C.png`

```text
Action sprite sheet of the character in the attached sheets A and B (Orc scout). IDENTICAL CHARACTER to the previous image(s) in this conversation: same head, face, hair, headgear, armor, clothes, colors, weapon shape and size, proportions, pixel art style, outline and level of detail. Do not redesign, simplify or restyle anything; only the poses change.

SUBJECT (reminder): Orc scout: a young, wiry, lean orc of the bog clan, barefoot, hunched and twitchy, always ready to dart away. Small tusks, torn pointed ears, a greasy black mohawk, ochre mud stripes across the face. Wears only a hide loincloth and a rope belt with a small pouch. Holds a crude jagged knife in the right hand.

LAYOUT: 1 row x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as sheet B. The character performs every action IN PLACE: the body never travels across the row (in airborne frames it rises straight up). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The knife stays in hand in EVERY frame. Keep the arms and the weapon close to the body: no pose wider than the attack pose of sheet B. Same scale as sheets A and B.
Row 1 - HIT AND RUN, 6 frames: quick stab forward, knife extended, pulls the knife back and crouches, springs up leaning backward, airborne, lands crouched with the knife ready

No spell effects, flying projectiles, dust, splashes, shockwaves or motion trails: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. Do NOT include: background scenery, floor, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature, UI, or soft semi-transparent glow (draw glows as solid pixel rings).
```
