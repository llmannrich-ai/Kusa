# Pântano do Kosaradius — prompts da folha B (ação) para o ChatGPT

Folha B = as animações de perfil para a esquerda (andar, golpe, especial, morte e, nos mini-bosses, a 2ª habilidade).
As habilidades de todos (folha C) estão em `PROMPTS_FOLHA_C.md`.

> A folha B entregue saiu em outro formato (2 linhas × 6, golpe e morte, 3/4 de frente; ver `README.md`). Os prompts
> abaixo são o formato antigo (perfil, 4×4).

## Como usar

1. Anexe a **folha A aprovada do mesmo monstro** (`<kind>-A.png` nesta pasta): ela é a referência de aparência e de
   estilo (aqui não precisa do goblin).
2. Gere, de preferência, na mesma conversa em que a folha A foi feita.
3. Mande as imagens para o Claude **2 ou mais por mensagem** (sozinha, a imagem não chega como arquivo).
4. Se vier tudo olhando para a direita, não precisa gerar de novo: o script espelha.

Os 3 últimos (Orc xamã, Ogro Xamã e Chefe de Guerra) só depois de a folha A deles estar aprovada.

### 1. Orc batedor — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The knife stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (quick, low, crouched steps)
Row 2 - ATTACK, 4 frames: feint, quick stab forward to the left, knife fully extended, pull back
Row 3 - SPECIAL, 4 frames: HIT AND RUN: stab, kicks off the target, airborne leaping BACKWARD (moving to the right while still facing left), lands crouched
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 2. Orc do Brejo — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 3 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The axe and the plank shield stay in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: raise the axe behind the head, overhead chop to the left, axe at the bottom, recover behind the shield
Row 3 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 3. Orc lanceiro — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 3 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The long spear stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (spear held upright)
Row 2 - ATTACK, 4 frames: pull the spear back, long thrust to the left, spear fully extended far ahead (reaches 2 tiles), recover
Row 3 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 4. Orc arqueiro — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The bow stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: nock an arrow, full draw, release with the arrow flying away to the left, lower the bow
Row 3 - SPECIAL, 4 frames: BACKSTEP: hops backward (moving to the right while still facing left), lands, re-aims the bow to the left, ready
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 5. Orc berserker — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The two axes stay in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (leaning forward, aggressive)
Row 2 - ATTACK, 4 frames: both axes raised, first axe chops to the left, second axe chops, recover
Row 3 - SPECIAL, 4 frames: AGGRESSIVE LEAP: deep crouch, huge leap forward to the left with both axes raised, airborne, lands with both axes slamming down
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 6. Orc capitão — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The cleaver-sword stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: raise the cleaver, diagonal slash to the left, follow-through, recover
Row 3 - SPECIAL, 4 frames: COMMAND: points the cleaver forward to the left, roars an order, the banner on his back waving, fist raised high
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 7. Ogro jovem — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The club stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (heavy, slow steps)
Row 2 - ATTACK, 4 frames: lift the club overhead, smash down to the left, club hits the ground, lift it again
Row 3 - SPECIAL, 4 frames: WALLOP: wind the club far back, huge sideways swing to the left, follow-through spinning the torso, recover
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 8. Ogro do Brejo — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 5 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The spiked club stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Portrait image (taller than wide).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (very heavy, stomping steps)
Row 2 - ATTACK, 4 frames: lift the spiked club, smash down to the left, club buried in the ground, pull it out
Row 3 - SPECIAL, 4 frames: SEISMIC STOMP: lifts the right foot high, stomps down, a ring of mud and water splashes out (solid pixel shapes), straightens up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - BOULDER THROW, 4 frames: club kept in the right hand, bends down and grabs a big mossy rock with the LEFT hand, raises the rock overhead, hurls it far to the left, follow-through

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 9. Grumak, o Rei-Ogro — folha B
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The tree-trunk club stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (very heavy steps, the trunk resting on the shoulder)
Row 2 - ATTACK (CRUSH), 4 frames: lift the trunk high overhead with both hands, smash it down to the left, trunk slammed on the ground, lift it again
Row 3 - SPECIAL, 4 frames: SWAMP STOMP: lifts the right foot high, stomps down, a ring of mud and water splashes out (solid pixel shapes), straightens up
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 10. Grumak, o Rei-Ogro — folha C (substituída por `PROMPTS_FOLHA_C.md`)
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row (in leap frames the body is airborne above it). The tree-trunk club stays in hand in EVERY frame. All figures at the same scale. Square image.
Row 1 - KING CHARGE, 4 frames: lowers the head, charging run to the left with the trunk forward, airborne leap, lands with a heavy splash
Row 2 - LOG THROW, 4 frames: trunk club kept in the right hand, pulls a smaller log from his back with the LEFT hand, raises it over the head, hurls it far to the left, follow-through
Row 3 - KING ROAR, 4 frames: throws the head back and roars to the sky, raises the trunk club high in the right hand, beats the chest with the left fist, roars at the front-left
Row 4 - FRENZY WALK, 4 frames: heavy walk cycle with the trunk on the shoulder, but enraged: hunched forward, eyes glowing red, steam from the nostrils, faster stride

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 11. Orc xamã — folha B (só depois da folha A aprovada)
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The staff stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Square image.
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (leaning on the staff)
Row 2 - ATTACK, 4 frames: raise the staff, the skull glows, thrusts the staff to the left releasing a small green swamp bolt, recover
Row 3 - SPECIAL, 4 frames: MUD GRIP: plants the staff in the ground, mud swirls up around it, gathers a ball of sticky green-brown mud, hurls it far to the left
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 12. Ogro Xamã — folha B (só depois da folha A aprovada)
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 5 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The skull staff stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Portrait image (taller than wide).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (hunched, leaning on the staff)
Row 2 - ATTACK, 4 frames: raise the staff, the skulls glow, thrusts the staff to the left releasing a green swamp bolt, recover
Row 3 - SPECIAL, 4 frames: BOG CURSE: raises the staff with both hands, green toxic mist gathers around the skulls, points the staff to the left, the mist rains down ahead
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - CLAN CALL, 4 frames: staff kept in the right hand, lifts a bone war horn with the LEFT hand, blows it with the cheeks puffed, raises the staff high, slams the staff into the ground

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 13. Chefe de Guerra Orc — folha B (só depois da folha A aprovada)
```text
Animation sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 5 rows x 4 columns, one animation per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure is in side profile FACING LEFT (looking toward the left edge of the image). Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The two-handed cleaver stays in hand in EVERY frame, including the walk cycle. All figures at the same scale. Portrait image (taller than wide).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing
Row 2 - ATTACK, 4 frames: raise the cleaver over the shoulder, heavy diagonal cleave to the left, blade at the bottom, recover
Row 3 - SPECIAL, 4 frames: CHARGE: lowers the shoulder, sprints forward to the left, airborne leap with the cleaver raised, crashes down with the cleaver
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - WHIRLWIND, 4 frames: cleaver held out sideways, spins around in a full circle (the middle frames may show his back and front), blade sweeping, stops facing left again

Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```
