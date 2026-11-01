# Pântano do Kosaradius — folha C (habilidades) dos orcs e ogros

Folha C = as **habilidades** de cada monstro do clã, uma linha por habilidade, no mesmo formato da folha B entregue
(3/4 de frente, 6 quadros por linha). A folha B já tem o golpe e a morte; a C completa o resto. Hoje toda habilidade
sai da figura de perfil "se erguendo" (`kosaradiusArt.ts`); com a C, cada habilidade ganha o seu movimento.

Fonte das habilidades: `packages/shared/src/monsters.ts` (o `id` da tabela é o que o jogo usa para escolher o clipe).

## 1. Lista de ações

| # | Monstro | Linhas da folha C (habilidade → `id`) | Folha B? | Prioridade |
|---|---|---|---|---|
| 1 | Grumak, o Rei-Ogro (`ogreKing`, boss) | Pisão do Pântano (`swampStomp`) · Investida do Rei (`kingCharge`) · Tronco Arremessado (`logThrow`) · Rugido do Rei (`kingRoar`) | ✅ (o golpe serve de Esmagar, `crush`) | Alta |
| 2 | Chefe de Guerra Orc (`orcWarlord`, mini-boss) | Investida (`charge`) · Golpe Giratório (`whirl`) | ✅ | Alta |
| 3 | Ogro do Brejo (`ogreBruiser`, mini-boss) | Pisão Sísmico (`stomp`) · Arremesso de Pedra (`boulder`) | ✅ | Alta |
| 4 | Ogro Xamã (`ogreShaman`, mini-boss) | Maldição do Brejo (`bogCurse`) · Chamado do Clã (`clanCall`) | ✅ | Alta |
| 5 | Ogro jovem (`ogreYoung`) | Pancada (`wallop`) | ✅ | Média |
| 6 | Orc xamã (`orcShaman`) | Lama Agarrada (`mudGrip`) | ✅ | Média |
| 7 | Orc berserker (`orcBerserker`) | Agressivo, o salto (`aggressive`) | ❌ falta | Média |
| 8 | Orc batedor (`orcScout`) | Fuga Ágil, fura e pula para trás (traço `hitAndRun`) | ❌ falta | Baixa |

**Sem folha C** (não têm habilidade ativa): Orc do Brejo (`orcGrunt`), Orc lanceiro (`orcSpearman`), Orc arqueiro
(`orcArcher`: o recuo é andar para trás) e Orc capitão (`orcCaptain`: o Comando é aura passiva, não tem momento de
disparo). Também ficam de fora o Rompante do berserker e o frenesi do Grumak: são estados passivos (bate mais rápido),
não um movimento; se quisermos, viram tinta no sprite (olho vermelho) feita pelo jogo, sem folha nova.

Total: **15 linhas** em 8 folhas.

## 2. Antes de gerar: riscos

1. **Memória do celular.** Cada linha entra com 4 quadros, e cada quadro custa lado² × 4 bytes. Pelos quadros de hoje
   (`kosaradius/*.png`), a folha C inteira soma ~22 MB aos ~51 MB do mapa (o Grumak sozinho ~12 MB). O jogo já fechou
   com 156 MB; ~73 MB ainda cabe, mas conferir no celular antes de publicar.
2. **Pose larga aumenta o quadro de tudo.** O script cresce o quadro do monstro até caber a figura mais larga (foi o
   que aconteceu com a folha B). Tronco esticado no arremesso ou cutelo aberto no giro aumentam as 30+ figuras do
   monstro. Por isso os prompts pedem arma junto ao corpo e nada mais largo que o golpe da folha B. Se vier largo
   demais, gere de novo em vez de aceitar.
3. **Efeito desenhado no sprite duplica o do jogo.** Anel de lama, névoa, pedra voando e poeira já são desenhados
   pelo jogo (`fx` de cada habilidade: `quake`, `acidRain`, `boulder`, `web`, `leap`, `summon`). Na folha, só o que
   está na mão (pedra, tronco, chifre).
4. **Deslocamento é do jogo.** Investida, salto e pulo para trás: o jogo move o corpo. A figura fica no lugar (sobe no
   ar, mas não anda pela linha), senão o monstro "anda duas vezes".
5. **Folha B dos comuns.** O batedor e o berserker ainda não têm folha B. O `PROMPTS_FOLHA_B.md` descreve o formato
   antigo (perfil, 4×4), não o entregue (3/4 de frente, 2×6). Gerar a B deles no formato entregue antes ou junto da C.

## 3. Como usar

1. Anexe a **folha A e a folha B aprovadas do mesmo monstro** (`<kind>-A.png` e `<kind>-B.png` nesta pasta). Sem B
   (batedor, berserker), só a A.
2. Gere de preferência na mesma conversa da folha B.
3. Salve como `<kind>-C.png` e mande para o Claude, 2 ou mais imagens por mensagem.
4. Ordem sugerida: Grumak → Chefe de Guerra → Ogro do Brejo → Ogro Xamã (os que o jogador mais vê lutando) e depois
   os comuns. Dá para publicar aos poucos: monstro sem folha C continua com o especial de hoje.

Integração (depois das imagens): o `kosaradiusSprites.py` passa a ler a C (4 dos 6 quadros por linha) e o
`kosaradiusArt.ts` liga cada `id` ao seu clipe, como o `strike` dos outros mapas em `bestiary.ts`.

## 4. Prompts (colar no ChatGPT)

Todos usam a mesma base; muda só o número de linhas e as linhas.

### 1. Grumak, o Rei-Ogro — folha C (4 linhas)
```text
Action sprite sheet of the SAME character shown in the attached sheets (turnaround sheet and attack/death sheet): identical design, colors, outfit, proportions, crown and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 4 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as in the attached attack sheet. The character performs every action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline in each row (in airborne frames the body rises straight up above it). The tree-trunk club stays in hand in EVERY frame. Keep the arms and the trunk close to the body: no pose wider than the attack pose of the attached sheet. All figures at the same scale as the attached sheets.
Row 1 - SWAMP STOMP, 6 frames: shifts weight, lifts the right foot high, foot at the top, stomps down hard, knees bent from the impact, straightens up
Row 2 - KING CHARGE, 6 frames: lowers the head and shoulder, crouches, launches upward, airborne with the trunk held forward, lands heavily with bent knees, straightens up
Row 3 - LOG THROW, 6 frames: trunk club kept in the right hand, reaches behind his back with the LEFT hand, pulls out a short log, raises it over the head, hurls it forward (the log leaves the hand), follow-through
Row 4 - KING ROAR, 6 frames: hunches and breathes in, throws the head back, roars to the sky with the mouth wide open, raises the trunk club high, beats the chest with the left fist, roars at the front-left

No spell effects, flying projectiles, dust, splashes, shockwaves or glow: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 2. Chefe de Guerra Orc — folha C (2 linhas)
```text
Action sprite sheet of the SAME character shown in the attached sheets (turnaround sheet and attack/death sheet): identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as in the attached attack sheet, except where the row says otherwise. The character performs every action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline in each row (in airborne frames the body rises straight up above it). The two-handed cleaver stays in hand in EVERY frame. Keep the arms and the cleaver close to the body: no pose wider than the attack pose of the attached sheet. All figures at the same scale as the attached sheets.
Row 1 - CHARGE, 6 frames: lowers the shoulder, crouches, launches upward with the cleaver raised, airborne, crashes down with the cleaver, recovers
Row 2 - WHIRLWIND, 6 frames: cleaver held tight across the chest, starts turning, seen from the side, seen from the back, seen from the other side, back to the 3/4 front view with the blade low

No spell effects, motion trails, dust, sparks or glow: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 3. Ogro do Brejo — folha C (2 linhas)
```text
Action sprite sheet of the SAME character shown in the attached sheets (turnaround sheet and attack/death sheet): identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as in the attached attack sheet. The character performs every action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The spiked club stays in the right hand in EVERY frame. Keep the arms and the club close to the body: no pose wider than the attack pose of the attached sheet. All figures at the same scale as the attached sheets.
Row 1 - SEISMIC STOMP, 6 frames: shifts weight, lifts the right foot high, foot at the top, stomps down hard, knees bent from the impact, straightens up
Row 2 - BOULDER THROW, 6 frames: bends down, grabs a big mossy rock with the LEFT hand, lifts it to the chest, raises it overhead, hurls it forward (the rock leaves the hand), follow-through

No spell effects, flying rocks, dust, splashes, shockwaves or glow: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 4. Ogro Xamã — folha C (2 linhas)
```text
Action sprite sheet of the SAME character shown in the attached sheets (turnaround sheet and attack/death sheet): identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 2 rows x 6 columns, one action per row, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as in the attached attack sheet. The character performs every action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline in each row. The skull staff stays in the right hand in EVERY frame. Keep the arms and the staff close to the body: no pose wider than the attack pose of the attached sheet. All figures at the same scale as the attached sheets.
Row 1 - BOG CURSE, 6 frames: grips the staff with both hands, raises it, holds it high while chanting with the eyes closed, opens the eyes, points the staff forward and down, lowers it
Row 2 - CLAN CALL, 6 frames: lifts a bone war horn with the LEFT hand, brings it to the mouth, blows it with the cheeks puffed, lowers the horn, raises the staff high, slams the staff butt into the ground

No spell effects, mist, sound waves, dust or glow: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 5. Ogro jovem — folha C (1 linha)
```text
Action sprite sheet of the SAME character shown in the attached sheets (turnaround sheet and attack/death sheet): identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 1 row x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as in the attached attack sheet. The character performs the action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline. The club stays in hand in EVERY frame. No pose wider than the attack pose of the attached sheet. All figures at the same scale as the attached sheets.
Row 1 - WALLOP, 6 frames: twists the torso and winds the club far back over the right shoulder, holds, starts a huge sideways swing, club sweeps across the front, follow-through with the torso turned, recovers

No motion trails, dust or impact effects: the game draws them.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 6. Orc xamã — folha C (1 linha)
```text
Action sprite sheet of the SAME character shown in the attached sheets (turnaround sheet and attack/death sheet): identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 1 row x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in the same 3/4 front view facing the lower-left as in the attached attack sheet. The character performs the action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline. The staff stays in the right hand in EVERY frame. No pose wider than the attack pose of the attached sheet. All figures at the same scale as the attached sheets.
Row 1 - MUD GRIP, 6 frames: plants the staff in the ground, crouches and scoops a ball of sticky green-brown mud with the LEFT hand, stands up holding it, pulls the arm back, hurls it forward (the mud leaves the hand), follow-through

No spell effects, flying mud, splashes or glow: the game draws them. Only objects held in the hands.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 7. Orc berserker — folha C (1 linha)
```text
Action sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapons, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 1 row x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (between the front view and the left profile of the attached sheet). The character performs the action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline (in airborne frames the body rises straight up above it). The two axes stay in hand in EVERY frame. Keep the arms and the axes close to the body. All figures at the same scale as the attached sheet.
Row 1 - AGGRESSIVE LEAP, 6 frames: deep crouch, springs up with both axes raised, airborne at the top, falling with the axes overhead, lands with both axes slamming down, straightens up

No motion trails, dust or impact effects: the game draws them.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```

### 8. Orc batedor — folha C (1 linha)
```text
Action sprite sheet of the SAME character shown in the attached turnaround sheet: identical design, colors, outfit, proportions and weapon, drawn in the exact same pixel art style (crisp hard-edged pixels, thick near-black outline, light from the upper-left, deep shadows, grim and menacing).

LAYOUT: 1 row x 6 columns, frames read from left to right as consecutive frames of ONE motion (not separate poses). EVERY figure in 3/4 front view facing the lower-left (between the front view and the left profile of the attached sheet). The character performs the action IN PLACE: the body never travels across the row. Every figure fully separated from the others by empty space. Feet on the same baseline (in airborne frames the body rises straight up above it). The knife stays in hand in EVERY frame. Keep the arms close to the body. All figures at the same scale as the attached sheet.
Row 1 - HIT AND RUN, 6 frames: quick stab forward, knife extended, pulls the knife back and crouches, springs up leaning backward, airborne, lands crouched with the knife ready

No motion trails, dust or impact effects: the game draws them.
Background: one flat solid magenta color (#FF00FF), no checkerboard pattern. No text, numbers, labels, grid, frame, floor, scenery, cast shadow or watermark.
```
