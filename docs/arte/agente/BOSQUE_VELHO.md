# Fila de arte: Bosque Velho (inimigos)

> Gerado de `bosque-velho.json` (a fonte que o agente lê). Orientação do agente em `ORIENTACAO.md`. Mesmos blocos de
> `pantano-das-ruinas.json`, só o `{{CENARIO}}` muda. A ordem continua a do Pântano (61 a 80).

**20 imagens de inimigos (10 monstros, folhas A e B).** O mapa está sem monstros (`encounters`, `minibosses` e
`bosses` vazios em `packages/shared/src/maps.ts`); este é o elenco proposto. Os números e habilidades das notas são
rascunho de design: entram no jogo pelo `monsters.ts`, com teste na arena e o simulador de balanço.

| # | id | Nome | Tipo | Depende de |
|---|---|---|---|---|
| 61 | `direWolf-A` | Lobo atroz | monstro · comum | — |
| 62 | `direWolf-B` | Lobo atroz | monstro · comum | `direWolf-A` |
| 63 | `twigling-A` | Galhudo | monstro · comum | — |
| 64 | `twigling-B` | Galhudo | monstro · comum | `twigling-A` |
| 65 | `thornSpitter-A` | Espinheiro | monstro · comum | — |
| 66 | `thornSpitter-B` | Espinheiro | monstro · comum | `thornSpitter-A` |
| 67 | `shadowPanther-A` | Pantera das Sombras | monstro · comum | — |
| 68 | `shadowPanther-B` | Pantera das Sombras | monstro · comum | `shadowPanther-A` |
| 69 | `satyr-A` | Sátiro flautista | monstro · comum | — |
| 70 | `satyr-B` | Sátiro flautista | monstro · comum | `satyr-A` |
| 71 | `owlbear-A` | Urso-coruja | monstro · comum | — |
| 72 | `owlbear-B` | Urso-coruja | monstro · comum | `owlbear-A` |
| 73 | `corruptedDryad-A` | Dríade corrompida | monstro · mini-boss | — |
| 74 | `corruptedDryad-B` | Dríade corrompida | monstro · mini-boss | `corruptedDryad-A` |
| 75 | `renegadeCentaur-A` | Centauro renegado | monstro · mini-boss | — |
| 76 | `renegadeCentaur-B` | Centauro renegado | monstro · mini-boss | `renegadeCentaur-A` |
| 77 | `menhirGuardian-A` | Guardião do Menir | monstro · mini-boss | — |
| 78 | `menhirGuardian-B` | Guardião do Menir | monstro · mini-boss | `menhirGuardian-A` |
| 79 | `greenDragon-A` | Dragão verde jovem | monstro · boss | — |
| 80 | `greenDragon-B` | Dragão verde jovem | monstro · boss | `greenDragon-A` |

## Elenco e legibilidade

Regra 7.5 do bestiário: no mesmo mapa, nenhum par com a mesma cor dominante **e** o mesmo tamanho.

| Monstro | Papel | Tamanho | Cor dominante |
|---|---|---|---|
| Lobo atroz | comum | 0.8 | cinza-ferro |
| Galhudo | comum | 0.5 | palha seca |
| Espinheiro | comum | 1.0 | verde-amarelado |
| Pantera das Sombras | comum | 0.8 | preto-azulado, olho verde |
| Sátiro flautista | comum | 0.9 | castanho |
| Urso-coruja | comum | 1.4 | pardo e creme |
| Dríade corrompida | mini-boss | 1.0 | casca de bétula cinza, cabelo vermelho |
| Centauro renegado | mini-boss | 1.5 | malhado cinza e preto |
| Guardião do Menir | mini-boss | 1.8 | pedra cinza, runa verde-água |
| Dragão verde jovem | boss | 2.5 | esmeralda |

## Blocos comuns

Os prompts usam marcadores como `{{ESTILO}}`: o agente troca cada um pelo texto do bloco de mesmo nome, abaixo.

**{{ESTILO}}**

```text
Dark fantasy pixel art in the exact style of the attached goblin reference sheet: high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no anti-aliased glow; thick near-black outline (#1a1210) around every silhouette; strong chiaroscuro with light from the upper-left and deep shadows on the lower-right; earthy desaturated palette (olive, moss, rust, bone, peat brown, dark leather) with saturated color only on eyes, blood, poison and magic; gritty surface detail (scars, warts, grime, torn cloth, dried blood, moss); grim and menacing mood, never cute or cartoonish. Top-down 3/4 RPG camera like Tibia: we see the front and a little of the top of everything.
```

**{{CENARIO}}**

```text
Setting: the Old Wood - an ancient temperate forest of huge oaks, beeches, birches and pines, sunlit clearings linked by dirt trails, a clear stream with wooden plank bridges, fallen mossy logs, and a ring of grey standing stones carved with spirals. Colors of the place: deep forest green, moss, bark brown, dry-leaf ochre, grey stone.
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

### 61. `direWolf-A` · Lobo atroz

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 5 · besta · escaramuçador em bando de 2–3. Táticas de Bando (+40% com aliado colado no alvo) e Derrubar (atordoa 1 s, Recarga 5–6). Cinza-ferro: não pode ficar parecido com a Pantera (mesmo tamanho, preto-azulado).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Dire wolf: a huge grey wolf the size of a pony, lean and scarred. Coarse iron-grey fur darker along the spine, a pale muzzle with black lips pulled back over yellowed fangs, one torn ear, glowing amber eyes, mud on the paws, a broken arrow shaft stuck in its shoulder. On four legs, head low.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 62. `direWolf-B` · Lobo atroz

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), direWolf-A (o mesmo personagem)
- Notas: ND 5 · besta · escaramuçador em bando de 2–3. Táticas de Bando (+40% com aliado colado no alvo) e Derrubar (atordoa 1 s, Recarga 5–6). Cinza-ferro: não pode ficar parecido com a Pantera (mesmo tamanho, preto-azulado).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Dire wolf: a huge grey wolf the size of a pony, lean and scarred. Coarse iron-grey fur darker along the spine, a pale muzzle with black lips pulled back over yellowed fangs, one torn ear, glowing amber eyes, mud on the paws, a broken arrow shaft stuck in its shoulder. On four legs, head low.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (prowling trot)
Row 2 - ATTACK, 4 frames: crouch, lunge forward, jaws snap shut, recover
Row 3 - SPECIAL, 4 frames: TRIP: leaps forward, front paws high, slams down onto the prey (paws pinning the ground), lifts the head and snarls
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 63. `twigling-A` · Galhudo

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 3 · planta (fraca a fogo) · enxame de 3–4. Camuflado: parado no chão parece um monte de galhos secos (a linha 3 é o disfarce). Cor de palha seca, para não sumir no capim verde.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Twigling (original creature): a small hunched creature made of dry dead branches and thorny twigs tied together by roots, with a knotted bark face, two pin-prick amber glowing eyes deep in the wood, long splintered claw-fingers, dead leaves and a bird skull caught in its body. Stands on two thin root legs.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.5 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 64. `twigling-B` · Galhudo

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), twigling-A (o mesmo personagem)
- Notas: ND 3 · planta (fraca a fogo) · enxame de 3–4. Camuflado: parado no chão parece um monte de galhos secos (a linha 3 é o disfarce). Cor de palha seca, para não sumir no capim verde.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Twigling (original creature): a small hunched creature made of dry dead branches and thorny twigs tied together by roots, with a knotted bark face, two pin-prick amber glowing eyes deep in the wood, long splintered claw-fingers, dead leaves and a bird skull caught in its body. Stands on two thin root legs.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.5 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (jerky, creaking steps)
Row 2 - ATTACK, 4 frames: raise both claw-hands, rake down, claws scrape forward, recover
Row 3 - SPECIAL, 4 frames: DEAD BRANCH DISGUISE: curls up, folds the limbs in, lies flat as a pile of dry sticks, only the two amber eyes still visible
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 65. `thornSpitter-A` · Espinheiro

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 5 · planta (fraca a fogo) · atirador, alcance 5. Rajada de Espinhos (projétil com sangramento) e, colado, Explosão de Espinhos em volta. A arma visível do atirador são os espinhos das costas.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Thorn spitter (original creature): a walking thorny bush shaped like a hunched man, a body of tangled yellow-green brambles bristling with long needle thorns, a hollow knot for a mouth, two sickly yellow-green glowing eyes, pale fungus on the shoulders, roots dragging behind like a cloak. The thorns on its back are visibly ready to be shot.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.0 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 66. `thornSpitter-B` · Espinheiro

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), thornSpitter-A (o mesmo personagem)
- Notas: ND 5 · planta (fraca a fogo) · atirador, alcance 5. Rajada de Espinhos (projétil com sangramento) e, colado, Explosão de Espinhos em volta. A arma visível do atirador são os espinhos das costas.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Thorn spitter (original creature): a walking thorny bush shaped like a hunched man, a body of tangled yellow-green brambles bristling with long needle thorns, a hollow knot for a mouth, two sickly yellow-green glowing eyes, pale fungus on the shoulders, roots dragging behind like a cloak. The thorns on its back are visibly ready to be shot.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.0 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (dragging root feet)
Row 2 - ATTACK, 4 frames: hunches forward, the back thorns bristle, a volley of thorns flies to the LEFT, recover
Row 3 - SPECIAL, 4 frames: THORN BURST: curls into a ball, swells, bursts open with thorns flying out in every direction, uncurls (bald patches where thorns left)
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 67. `shadowPanther-A` · Pantera das Sombras

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 5 · monstruosidade · emboscador. Camuflada na sombra da mata (opacidade baixa) até alguém chegar a 3 tiles; Bote de 3 tiles com Ataque Surpresa (1,8×). Fumaça desenhada em pixels sólidos, sem transparência.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Shadow panther (original creature): a long, lean black panther with a faint deep-blue sheen on its fur, wisps of solid dark smoke trailing from its shoulders and tail tip, cold bright green eyes, white fangs, a long whip-like tail. Low to the ground on four legs.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 68. `shadowPanther-B` · Pantera das Sombras

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), shadowPanther-A (o mesmo personagem)
- Notas: ND 5 · monstruosidade · emboscador. Camuflada na sombra da mata (opacidade baixa) até alguém chegar a 3 tiles; Bote de 3 tiles com Ataque Surpresa (1,8×). Fumaça desenhada em pixels sólidos, sem transparência.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Shadow panther (original creature): a long, lean black panther with a faint deep-blue sheen on its fur, wisps of solid dark smoke trailing from its shoulders and tail tip, cold bright green eyes, white fangs, a long whip-like tail. Low to the ground on four legs.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (silent stalking)
Row 2 - ATTACK, 4 frames: rear back on hind legs, swipe with a front paw, bite, land
Row 3 - SPECIAL, 4 frames: POUNCE FROM THE SHADOWS: body almost dissolved in dark smoke (only the eyes visible), takes form, long leap to the LEFT, lands claws first
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 69. `satyr-A` · Sátiro flautista

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 4 · fada · líder/controlador, fica atrás. Melodia: aliados a até 3 tiles atacam 15% mais rápido e quem ouve fica lento 1,5 s. Focar nele primeiro. Fada é tipo raro no jogo (só a Bruxa Verde).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Satyr piper: a wiry goat-legged man with shaggy chestnut fur on the legs, cloven hooves, curled ram horns, a pointed beard, a mischievous cruel grin, bare scarred torso with a leaf sash and a pouch of stolen trinkets. Holds a set of wooden reed pan pipes in one hand and a short curved knife in the other.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 0.9 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 70. `satyr-B` · Sátiro flautista

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), satyr-A (o mesmo personagem)
- Notas: ND 4 · fada · líder/controlador, fica atrás. Melodia: aliados a até 3 tiles atacam 15% mais rápido e quem ouve fica lento 1,5 s. Focar nele primeiro. Fada é tipo raro no jogo (só a Bruxa Verde).

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Satyr piper: a wiry goat-legged man with shaggy chestnut fur on the legs, cloven hooves, curled ram horns, a pointed beard, a mischievous cruel grin, bare scarred torso with a leaf sash and a pouch of stolen trinkets. Holds a set of wooden reed pan pipes in one hand and a short curved knife in the other.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 0.9 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (springy, dancing steps)
Row 2 - ATTACK, 4 frames: head lowered, charging head-butt with the horns, impact, step back
Row 3 - SPECIAL, 4 frames: ENCHANTING TUNE: raises the pan pipes, plays with cheeks puffed, small solid pixel music-like swirls (no letters or notes symbols) float LEFT, lowers the pipes
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 71. `owlbear-A` · Urso-coruja

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 6 · monstruosidade · bruto. Multiataque (bico + garras) e Abraço Esmagador (prende 1,5 s, Recarga 5–6). O maior comum do mapa: o único que passa de 1 tile.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Owlbear: a massive bear-shaped beast with the head of a great horned owl, a hooked yellow beak, huge round orange eyes, tawny brown fur on the body turning into cream and brown barred feathers on the head and chest, heavy claws, feathers ruffled with anger. Stands on its hind legs.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.4 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 72. `owlbear-B` · Urso-coruja

- Molde: `moldes/molde-B-acao.png` · proporção 4:4 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), owlbear-A (o mesmo personagem)
- Notas: ND 6 · monstruosidade · bruto. Multiataque (bico + garras) e Abraço Esmagador (prende 1,5 s, Recarga 5–6). O maior comum do mapa: o único que passa de 1 tile.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Owlbear: a massive bear-shaped beast with the head of a great horned owl, a hooked yellow beak, huge round orange eyes, tawny brown fur on the body turning into cream and brown barred feathers on the head and chest, heavy claws, feathers ruffled with anger. Stands on its hind legs.

{{FOLHA_B}} 4 rows. Feet aligned on each row's baseline. Size: the character is 1.4 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (heavy, on four legs)
Row 2 - ATTACK, 4 frames: rises up, claw swipe, beak strike, drops down
Row 3 - SPECIAL, 4 frames: CRUSHING HUG: rears up with both arms wide open, screeching, arms close around an invisible prey, squeezes
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)

{{PROIBIDO}}
```

### 73. `corruptedDryad-A` · Dríade corrompida

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 7 · fada · controlador. Enraizar (prende 1,5 s em área), Chamado dos Galhos (invoca 3 Galhudos) e Passo Arbóreo (some numa árvore e sai em outra, linha 5). Linha 5 tem o único tronco permitido no desenho.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Corrupted dryad (MINI-BOSS): a tall slender woman whose skin is pale grey birch bark with black cracks, long hair of autumn-red leaves and thin twigs, empty glowing amber eyes, fingers ending in long root-claws, a tattered dress of moss and dead leaves, black rot spreading from her chest. Barefoot, roots sprouting from her feet.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.0 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 74. `corruptedDryad-B` · Dríade corrompida

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), corruptedDryad-A (o mesmo personagem)
- Notas: ND 7 · fada · controlador. Enraizar (prende 1,5 s em área), Chamado dos Galhos (invoca 3 Galhudos) e Passo Arbóreo (some numa árvore e sai em outra, linha 5). Linha 5 tem o único tronco permitido no desenho.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Corrupted dryad (MINI-BOSS): a tall slender woman whose skin is pale grey birch bark with black cracks, long hair of autumn-red leaves and thin twigs, empty glowing amber eyes, fingers ending in long root-claws, a tattered dress of moss and dead leaves, black rot spreading from her chest. Barefoot, roots sprouting from her feet.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.0 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (gliding, leaves trailing)
Row 2 - ATTACK, 4 frames: raises a root-claw arm, the arm stretches long like a whip, lashes to the LEFT, pulls back
Row 3 - SPECIAL, 4 frames: ENTANGLE: kneels and presses hands to the ground, roots burst up from the ground to the LEFT, roots coil into a snare, rises
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - TREE STRIDE, 4 frames: steps into a tree trunk (draw a small trunk), half merged into the bark, only the face in the bark, empty trunk

{{PROIBIDO}}
```

### 75. `renegadeCentaur-A` · Centauro renegado

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 7 · monstruosidade · atirador. Mantém 4 tiles, Chuva de Flechas (área) e, quando encurralado, Investida (empurra 2 tiles). Malhado cinza e preto: o Urso-coruja tem o mesmo porte e é pardo, não pode ser marrom.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Renegade centaur archer (MINI-BOSS): the upper body of a scarred bearded man joined to the body of a dapple-grey and black horse. Wears a dented leather breastplate, a wolf-pelt mantle, war paint on the face, a quiver of black-feathered arrows on the horse back, a tall recurve longbow in hand.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.5 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 76. `renegadeCentaur-B` · Centauro renegado

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), renegadeCentaur-A (o mesmo personagem)
- Notas: ND 7 · monstruosidade · atirador. Mantém 4 tiles, Chuva de Flechas (área) e, quando encurralado, Investida (empurra 2 tiles). Malhado cinza e preto: o Urso-coruja tem o mesmo porte e é pardo, não pode ser marrom.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Renegade centaur archer (MINI-BOSS): the upper body of a scarred bearded man joined to the body of a dapple-grey and black horse. Wears a dented leather breastplate, a wolf-pelt mantle, war paint on the face, a quiver of black-feathered arrows on the horse back, a tall recurve longbow in hand.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.5 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (trotting, four legs, horse gait)
Row 2 - ATTACK, 4 frames: nock an arrow, draw the bow to the LEFT, release, lower the bow
Row 3 - SPECIAL, 4 frames: RAIN OF ARROWS: aims the bow high up, releases, a fan of arrows flies up and to the LEFT, reaches for the quiver
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - CHARGE, 4 frames: rears up on hind legs, gallops forward with spear-like lunge, hooves strike down, skids to a stop

{{PROIBIDO}}
```

### 77. `menhirGuardian-A` · Guardião do Menir

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 7 · constructo (imune a veneno e sangramento; tipo ainda não usado no jogo) · sentinela. Resiste a físico 0,5 (o único do mapa com resistência física) e Pisão Rúnico em área. Parado, é um menir da sala (linha 5); acorda quando alguém encosta.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Menhir guardian (MINI-BOSS, original creature): a hulking humanoid construct made of stacked grey standing stones, moss and lichen in the cracks, a blocky head without a face except a single carved spiral that glows teal, more teal spiral runes glowing on the chest and fists, roots and ivy wrapped around the legs. Slow and massive.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 1.8 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 78. `menhirGuardian-B` · Guardião do Menir

- Molde: `moldes/molde-B-acao.png` · proporção 4:5 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), menhirGuardian-A (o mesmo personagem)
- Notas: ND 7 · constructo (imune a veneno e sangramento; tipo ainda não usado no jogo) · sentinela. Resiste a físico 0,5 (o único do mapa com resistência física) e Pisão Rúnico em área. Parado, é um menir da sala (linha 5); acorda quando alguém encosta.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Menhir guardian (MINI-BOSS, original creature): a hulking humanoid construct made of stacked grey standing stones, moss and lichen in the cracks, a blocky head without a face except a single carved spiral that glows teal, more teal spiral runes glowing on the chest and fists, roots and ivy wrapped around the legs. Slow and massive.

{{FOLHA_B}} 5 rows. Feet aligned on each row's baseline. Size: the character is 1.8 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (very heavy, grinding stone)
Row 2 - ATTACK, 4 frames: raises a stone fist, swings, smashes forward, recover
Row 3 - SPECIAL, 4 frames: RUNE STOMP: the runes glow brighter, lifts one leg, stomps, a ring of solid teal pixel cracks spreads on the ground
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - DORMANT, 3 frames: kneels down, folds into a single standing stone (a plain menhir with the spiral), spiral goes dark (column 4 empty)

{{PROIBIDO}}
```

### 79. `greenDragon-A` · Dragão verde jovem

- Molde: `moldes/molde-A-turnaround.png` · proporção 3:1
- Referências: _referencias/goblin-referencia.png (estilo)
- Notas: ND 9 · dragão · boss do círculo de menires; derrotá-lo abre o Coração da Mata. Sopro Venenoso em cone (veneno), Multiataque, Voo (fase, 50%) e Rasante. Resiste a natureza 0,5, não imune (lição do Dragão negro: o Druida não pode ficar sem dano). Ação de Covil: os menires brilham e soltam gás.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Young green dragon (BOSS), about 2x2 tiles: emerald green scales darkening to near-black on the back, a crest of frills and a long horned jaw like a crown of thorns, poison-yellow eyes, pale green-yellow belly plates, leathery wings with torn membranes, ivy and moss caught on the horns, sickly green vapour dripping from the mouth.

{{FOLHA_A}} All feet on the same horizontal baseline in each row. Size: the character is 2.5 times the height of one human adult (1 tile).

{{PROIBIDO}}
```

### 80. `greenDragon-B` · Dragão verde jovem

- Molde: `moldes/molde-B-acao.png` · proporção 4:6 (largura:altura)
- Referências: _referencias/goblin-referencia.png (estilo), greenDragon-A (o mesmo personagem)
- Notas: ND 9 · dragão · boss do círculo de menires; derrotá-lo abre o Coração da Mata. Sopro Venenoso em cone (veneno), Multiataque, Voo (fase, 50%) e Rasante. Resiste a natureza 0,5, não imune (lição do Dragão negro: o Druida não pode ficar sem dano). Ação de Covil: os menires brilham e soltam gás.

```text
{{ESTILO}} {{CENARIO}}

SUBJECT: Young green dragon (BOSS), about 2x2 tiles: emerald green scales darkening to near-black on the back, a crest of frills and a long horned jaw like a crown of thorns, poison-yellow eyes, pale green-yellow belly plates, leathery wings with torn membranes, ivy and moss caught on the horns, sickly green vapour dripping from the mouth.

{{FOLHA_B}} 6 rows. Feet aligned on each row's baseline. Size: the character is 2.5 times the height of one human adult (1 tile).
Row 1 - WALK cycle, 4 frames: contact, passing, contact with the other leg, passing (heavy, wings folded)
Row 2 - ATTACK, 4 frames: rear back, bite forward, jaws snap, tail sweeps
Row 3 - SPECIAL, 4 frames: POISON BREATH: inhales with chest swelling, jaws open wide, a wide cone of thick solid-pixel green poison gas pours to the LEFT, gas fades
Row 4 - DEATH, 3 frames: hit and recoiling, collapsing, corpse lying on the ground (column 4 empty)
Row 5 - TAKE OFF, 4 frames: crouches, wings spread, leaps up, hovering high (leave a big gap below)
Row 6 - DIVE ATTACK, 4 frames: high in the air, dives down to the LEFT, crashes with claws first, folds the wings

{{PROIBIDO}}
```
