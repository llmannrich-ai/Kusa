# Fila de arte: Fortaleza Orc (chão e sprites de cenário)

Caminho híbrido (`docs/FORTALEZA_PLANO.md`, seção 5): o **chão** por onde se anda (capim, calçamento, muros, abismo) é
desenhado pelo jogo, por código; os **objetos de pé** (tendas, totens, colunas, árvores, móveis, máquinas de guerra)
vêm de **folhas de sprites geradas no ChatGPT**, como os inimigos do Kosaradius. A pintura grande do vale foi tentada e
descartada: ampliada no mapa todo, ficou borrada e destoou do resto.

**Fluxo:** gerar a folha no ChatGPT → mandar o PNG na conversa com o Claude → ele guarda em
`docs/arte/fortaleza/<id>.png`, separa cada objeto pelo fundo magenta, põe na escala (coluna "Tamanho"), troca a peça
feita por código e manda prints do jogo para aprovação.

**Como gerar:** numa conversa nova do ChatGPT, anexe as duas referências do jogo
(`docs/arte/fortaleza/referencia-ponte.png` e `referencia-acampamento.png`) e cole o prompt da folha com os blocos
`{{...}}` trocados pelo texto de mesmo nome (ou use o prompt já montado que o Claude manda na conversa). Uma folha por
conversa. Se vier errado (perspectiva, objeto cortado, fundo que não é magenta, texto escrito), peça a correção na
mesma conversa.

| # | id | Folha | Objetos | Prioridade |
|---|---|---|---|---|
| 1 | `acampamento` | Acampamento orc | 12 | aparece em todo o mapa |
| 2 | `ruinas` | Ruínas do império | 12 | vila baixa, pátios, marcos |
| 3 | `natureza` | Árvores, moitas e pedras | 12 | vila e beira dos pátios |
| 4 | `interior` | Salão do trono e casernas | 12 | fase 5 (interiores) |
| 5 | `guerra` | Máquinas e marcos de guerra | 6 | terraço, muralhas, pátio |

## Chão (prioridade: vem antes dos objetos)

Cada chão é **uma textura contínua de um material só**, que emenda nos 4 lados (o jogo repete o chão tile a tile). Na
escala do jogo: **128 px da imagem = 1 tile** (o espaço de um orc em pé), então a imagem de 1024×1024 cobre 8×8 tiles e
o Claude a corta em 64 tiles diferentes (o chão não repete). Ele acerta a emenda que sobrar e a paleta. As **bordas
entre materiais** (capim entrando no calçamento, terra na beira da estrada) são feitas pelo jogo, misturando estas
texturas com um recorte irregular: a IA não acerta as 12 peças de borda que se encaixam.

| # | id | Chão | Onde |
|---|---|---|---|
| C1 | `chao-capim` | Capim mediterrâneo | a vila baixa e as bordas dos pátios (o chão mais comum) |
| C2 | `chao-basalto` | Calçamento romano de basalto | a estrada, os pátios e as ruas da vila |
| C3 | `chao-terra` | Terra batida do acampamento | em volta das tendas e fogueiras |
| C4 | `chao-lajes` | Lajes grandes de travertino | o pátio do esporão, o terraço da torre, a ponte |
| C5 | `chao-salao` | Lajes escuras do salão | o salão do trono |
| C6 | `chao-tabuas` | Assoalho de tábuas | o chão das casernas |

**{{TEXTURA}}**

```text
Seamless tileable game ground texture: the image must repeat perfectly on all four sides (the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam), with even detail across the whole image and no single focal point, no vignette, no darker or lighter corners, and no light falloff. Seen straight from above (top-down), flat ground only: no walls, no objects standing up, no characters, no cast shadows from things outside the image. Scale: every 128×128 pixels of the image is one game tile, the floor space where one orc warrior stands. Light from the upper-left. Do NOT include: text, labels, grid lines, frames, borders, watermark or UI.

Square 1:1 (1024×1024).
```

**{{ESTILO_CHAO}}**

```text
Dark fantasy pixel art ground in the exact style of the attached game screenshots: high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur, no soft gradients and no photographic noise; ground has no outlines; 4 tones per material with a little dithering only at the boundaries between tones; earthy, slightly desaturated palette matching the screenshots. Setting: the courtyards of an ancient roman-like imperial castle on a rocky spur, taken by a clan of orcs, in the late afternoon.
```

### C1. `chao-capim`

```text
{{ESTILO_CHAO}}

Mediterranean grass ground: short olive-green grass in small fan-shaped tufts (dark at the base, light at the tips), soft patches of drier yellow-green grass and of darker clover, a few tiny red poppies and white daisies in small groups, a few small pebbles and bare earth spots. Calm and readable, with small detail (each tuft is a few pixels), so characters stand out on it.

{{TEXTURA}}
```

### C2. `chao-basalto`

```text
{{ESTILO_CHAO}}

Old roman road paving of grey-blue basalt: large polygonal stones (about 3 to 4 stones across each 128-pixel tile), each slightly domed and polished by centuries of use, each with its own shade, dark earth joints between them with tufts of grass growing in the joints, a few cracked or missing stones showing earth, light chips and scratches on the stones.

{{TEXTURA}}
```

### C3. `chao-terra`

```text
{{ESTILO_CHAO}}

Trampled bare earth of an orc war camp: brown packed dirt with patches of darker mud, scattered straw and trampled dry grass, boot prints and claw prints, a few small stones, small dark ash spots. No puddles of water, no blood, no objects.

{{TEXTURA}}
```

### C4. `chao-lajes`

```text
{{ESTILO_CHAO}}

Large worn slabs of warm travertine stone (creamy beige), laid in staggered rows (each slab about one 128-pixel tile wide and half a tile tall), each slab with its own shade, thin dark joints, the slab edges slightly rounded and chipped, moss and little weeds growing in some joints, faint soot marks and a few cracks.

{{TEXTURA}}
```

### C5. `chao-salao`

```text
{{ESTILO_CHAO}}

The floor of a dark great hall: big squared slabs of dark grey-brown stone (each about one 128-pixel tile), polished in the middle by use and dusty at the edges, thin black joints, a few cracks, faint stains of old wine and soot, a little straw scattered by the orcs.

{{TEXTURA}}
```

### C6. `chao-tabuas`

```text
{{ESTILO_CHAO}}

A rough floor of wooden planks in an orc barracks: long planks running left to right (about 4 planks for each 128-pixel tile of height), dark brown weathered wood with visible grain, iron nails, worn lighter paths, gaps between some planks, scattered straw and a few mud stains.

{{TEXTURA}}
```

## Blocos comuns

**{{ESTILO}}**

```text
Dark fantasy pixel art in the exact style of the attached game screenshots: high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur and no soft gradients; a near-black outline (#1a1210) around every object; light from the upper-left with shading to the lower-right; 4 tones per material; earthy, slightly desaturated palette matching the screenshots (warm tuff and travertine stone, grey basalt, olive greens, dark leather, rust), saturated color only on fire, blood and the clan's red hand. Camera exactly like the screenshots (Tibia-like top-down 3/4 view): we look down from above and slightly from the front, so we see the top of each object and its south-facing front side. No isometric view, no side view, no vanishing point.
```

**{{CENARIO}}**

```text
Setting: the Orc Fortress, an ancient castle of the drowned Empire of Kusa (roman-like: tuff and travertine masonry with bands of red brick, ionic and corinthian columns, the golden eagle) standing on a rocky spur, now taken by a clan of orcs. The orcs patched everything with crude things: untanned hides, rough planks, rope, rusty iron spikes, skulls, and black war banners painted with a red hand. Late afternoon light.
```

**{{FOLHA}}**

```text
Sprite sheet: exactly 12 separate objects arranged in a clean grid of 4 columns and 3 rows, in the order listed (left to right, top to bottom). Each object is complete, centered in its own cell and never touches or overlaps another object or the edge of the image; leave wide empty space between them. All objects are drawn at the same scale (sizes are given in tiles: 1 tile is the space one orc warrior stands on). Each object stands on its own, as a game asset: no ground, no floor patch, no grass under it, no cast shadow on the ground.
```

**{{MAGENTA}}**

```text
Background: one perfectly flat, solid magenta color (#FF00FF) filling the whole image, with no texture, gradient or vignette. Do not use magenta or pink anywhere inside the objects. Do NOT include: text, labels, numbers, grid lines, frames, borders, watermark, signature or UI.

Landscape 3:2 (1536×1024).
```

## 1. `acampamento`: acampamento orc

| # | Objeto | Tamanho (tiles, largura × altura do chão) |
|---|---|---|
| 1 | Tenda de couro pequena | 2 × 2 |
| 2 | Tenda grande do chefe | 3 × 3 |
| 3 | Fogueira com espeto | 1 × 1 |
| 4 | Totem de caveiras | 1 × 1 (alto) |
| 5 | Estandarte de guerra | 1 × 1 (alto) |
| 6 | Trecho de paliçada | 2 × 1 |
| 7 | Cavalete de armas | 1 × 1 |
| 8 | Caldeirão no tripé | 1 × 1 |
| 9 | Pilha de lenha | 1 × 1 |
| 10 | Monte de ossos | 1 × 1 |
| 11 | Jaula de madeira | 2 × 2 |
| 12 | Barris e caixotes | 1 × 1 |

```text
{{ESTILO}}

{{CENARIO}}

{{FOLHA}}

The 12 objects of the orc war camp:
1. A small orc tent (2×2 tiles): a cone of stitched untanned hides in patches of brown, ochre and grey, poles crossing out of the top, a dark entrance flap on the front, a red hand painted on it, two small skulls hanging by cords, stones holding the hem.
2. The war chief's big tent (3×3 tiles): a wide hide tent on a wooden frame, a front awning held by two spears, a black banner with the red hand on top, animal skulls and a bear pelt over the entrance, dark doorway in the front.
3. A campfire (1×1): a ring of blackened stones, burning logs with bright orange and yellow pixel flames, a spit with a roasting boar leg over it.
4. A skull totem (1×1 base, about 3 tiles tall): a crooked wooden pole with three stacked orc and animal skulls, big curved horns on top, strips of red cloth and feathers, a pile of stones at its foot.
5. A war banner (1×1 base, about 3 tiles tall): a wooden pole with an iron spear tip and a crossbar, a tattered black cloth with a red hand, a fringe of small bones.
6. A palisade section (2 tiles wide, about 2 tiles tall): five sharpened tree-trunk stakes side by side, lashed with rope, a skull stuck on one of the tips.
7. A weapon rack (1×1): two posts and a crossbar with crude axes, a cleaver and two spears leaning on it.
8. A cooking cauldron (1×1): a black iron pot on a tripod of sticks over embers, bubbling green stew, a bone sticking out.
9. A pile of firewood (1×1): split logs stacked in a neat pile, a hand axe stuck in the top log.
10. A pile of bones (1×1): rib cages, long bones and a big horned skull in a heap.
11. A wooden cage (2×2): a square prison cage of lashed poles with a rope-tied door, empty, with straw on its floor.
12. Barrels and crates (1×1): two wooden barrels and a broken crate stacked together, a rope coil on top.

{{MAGENTA}}
```

## 2. `ruinas`: ruínas do império

| # | Objeto | Tamanho (tiles) |
|---|---|---|
| 1 | Coluna coríntia inteira | 1 × 1 (alta) |
| 2 | Coluna quebrada | 1 × 1 |
| 3 | Toco de coluna com tambores caídos | 1 × 1 |
| 4 | Bloco de pedra caído | 1 × 1 |
| 5 | Capitel caído | 1 × 1 |
| 6 | Estátua do imperador derrubada | 2 × 1 |
| 7 | Fonte seca | 2 × 2 |
| 8 | Ânforas e urnas | 1 × 1 |
| 9 | Trecho de muro baixo em ruínas | 2 × 1 |
| 10 | Arco isolado em ruínas | 2 × 1 |
| 11 | Estátua sem cabeça no pedestal | 1 × 1 (alta) |
| 12 | Altar do império | 1 × 1 |

```text
{{ESTILO}}

{{CENARIO}}

{{FOLHA}}

The 12 objects of the ruined Empire:
1. A standing corinthian column (1×1 base, about 3 tiles tall): fluted travertine shaft, carved acanthus capital, square base, ivy climbing from the foot, some moss.
2. A broken column (1×1 base, about 2 tiles tall): the shaft snapped at an angle, chipped edges, moss on the break.
3. A column stump (1×1): the base and one drum still standing, two fallen drums lying next to it.
4. A fallen stone block (1×1): a big squared tuff block lying on its side, cracked, with moss and a tuft of grass.
5. A fallen corinthian capital (1×1): lying on the ground, acanthus leaves chipped.
6. The toppled statue of the emperor (2×1): a bronze-green statue of a laurel-crowned emperor lying on its back, broken off its pedestal, with an orc rope still tied around its neck.
7. A dry fountain (2×2): a round travertine basin with a cracked rim and a dry, dirty bottom, a small broken column with a lion head in the middle.
8. Amphorae and urns (1×1): three terracotta amphorae, one standing, one leaning, one broken in pieces.
9. A low ruined wall section (2 tiles wide, about 1 tile tall): tuff masonry with a band of red brick, crumbling at both ends, grass on top.
10. A lone ruined arch (2 tiles wide, about 2.5 tiles tall): two piers and a round arch of travertine voussoirs, one side cracked, ivy hanging from it.
11. A headless statue on a pedestal (1×1 base, about 3 tiles tall): a robed marble figure with the head broken off, on a square pedestal.
12. An imperial altar (1×1): a square carved stone altar with garlands and a bowl on top, chipped corners, an orc skull placed on it as an offering.

{{MAGENTA}}
```

## 3. `natureza`: árvores, moitas e pedras

| # | Objeto | Tamanho (tiles) |
|---|---|---|
| 1 | Cipreste | 1 × 1 (alto) |
| 2 | Pinheiro-manso | 2 × 2 (copa) |
| 3 | Oliveira velha | 2 × 2 |
| 4 | Árvore morta | 1 × 1 (alta) |
| 5 | Arbusto | 1 × 1 |
| 6 | Moita florida | 1 × 1 |
| 7 | Rocha grande | 2 × 1 |
| 8 | Grupo de pedras | 1 × 1 |
| 9 | Tronco caído | 2 × 1 |
| 10 | Capim alto | 1 × 1 |
| 11 | Samambaias | 1 × 1 |
| 12 | Toco de árvore | 1 × 1 |

```text
{{ESTILO}}

{{CENARIO}}

{{FOLHA}}

The 12 plants and rocks around the ruins (mediterranean hills):
1. A tall italian cypress (1×1 base, about 3.5 tiles tall): narrow dark green flame shape, visible trunk at the foot.
2. A stone pine (2×2 crown, about 3 tiles tall): a flat umbrella-shaped crown on a tall leaning reddish trunk.
3. An old olive tree (2×2): a gnarled twisted grey trunk, silver-green leaves in clumps.
4. A dead tree (1×1 base, about 3 tiles tall): bare twisted branches, a crow on one branch.
5. A green shrub (1×1): a round dense bush.
6. A flowering bush (1×1): a bush with small red poppies and white flowers.
7. A big boulder (2×1): a grey weathered rock with moss on top and cracks.
8. A cluster of stones (1×1): three or four small rocks with grass between them.
9. A fallen log (2×1): a mossy fallen tree trunk with a broken stub of a branch.
10. Tall grass (1×1): a clump of tall dry and green grass blades.
11. Ferns (1×1): a clump of ferns.
12. A tree stump (1×1): a cut stump with rings visible on top, roots, a small mushroom.

{{MAGENTA}}
```

## 4. `interior`: salão do trono e casernas

| # | Objeto | Tamanho (tiles) |
|---|---|---|
| 1 | Trono do chefe | 2 × 1 (alto) |
| 2 | Braseiro de ferro | 1 × 1 |
| 3 | Beliche de palha | 2 × 1 |
| 4 | Mesa com restos de banquete | 2 × 1 |
| 5 | Banco de madeira | 2 × 1 |
| 6 | Forja orc com fole | 2 × 1 |
| 7 | Bigorna | 1 × 1 |
| 8 | Tapete de pele de urso | 2 × 2 (no chão, plano) |
| 9 | Baú de guerra | 1 × 1 |
| 10 | Pilha de escudos | 1 × 1 |
| 11 | Estandarte de parede | 1 × 1 (alto) |
| 12 | Gaiola pendurada | 1 × 1 (alta) |

```text
{{ESTILO}}

{{CENARIO}}

{{FOLHA}}

The 12 objects inside the keep's throne hall and the orc barracks:
1. The war chief's throne (2×1 base, about 3 tiles tall): an old imperial travertine throne on a two-step dais, tall carved back with a broken golden eagle on top, covered with furs and bear pelts, skulls on the armrests.
2. An iron brazier (1×1): a tall three-legged iron bowl with burning coals and bright pixel flames.
3. A straw bunk (2×1): a crude wooden bed frame with a straw mattress and a dirty hide blanket.
4. A feast table (2×1): a heavy plank table with bones, a roast, tankards, a knife stuck in the wood.
5. A wooden bench (2×1): a rough plank bench.
6. An orc forge (2×1): a stone forge with glowing coals, a leather bellows on the side, tongs hanging.
7. An anvil (1×1): a black iron anvil on a tree stump, a hammer leaning on it.
8. A bear-skin rug (2×2, flat on the floor): a brown bear pelt with the head, seen from above.
9. A war chest (1×1): an iron-banded wooden chest, closed, with a big padlock.
10. A pile of shields (1×1): round wooden shields with the red hand and dented imperial shields stacked together.
11. A wall banner (1×1, about 2 tiles tall): a long black cloth with the red hand, hanging from an iron rod.
12. A hanging cage (1×1, about 3 tiles tall): a small iron cage hanging from a wooden post by a chain, a skeleton inside.

{{MAGENTA}}
```

## 5. `guerra`: máquinas e marcos de guerra (6 objetos, grade 3 × 2)

Igual às outras, com uma troca no bloco `{{FOLHA}}`: "exactly 6 separate objects arranged in a clean grid of 3
columns and 2 rows".

| # | Objeto | Tamanho (tiles) |
|---|---|---|
| 1 | Forca | 2 × 1 (alta) |
| 2 | Balista | 2 × 2 |
| 3 | Catapulta | 3 × 3 |
| 4 | Guarita de madeira | 2 × 2 (alta) |
| 5 | Escada de assalto | 1 × 2 |
| 6 | Armadilha de estacas | 2 × 1 |

```text
{{ESTILO}}

{{CENARIO}}

{{FOLHA}}

The 6 orc war machines and landmarks:
1. A gallows (2×1 base, about 3 tiles tall): a crude wooden frame with a crossbeam, a noose of rope hanging from it, a crow sitting on top.
2. A ballista (2×2): a big wooden crossbow on a rotating base, a huge iron-tipped bolt loaded, ropes and a crank.
3. A catapult (3×3): a wooden siege catapult with a throwing arm and a basket loaded with a boulder, wheels, ropes.
4. A wooden watchtower (2×2 base, about 4 tiles tall): a lookout platform on four poles with a ladder and a hide roof, a black banner with the red hand.
5. A siege ladder (1×2): a long crude wooden ladder lying on the ground.
6. A spike trap (2×1): a row of sharpened stakes pointing outward, set in the ground at an angle.

{{MAGENTA}}
```
