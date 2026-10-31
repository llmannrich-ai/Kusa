# Fila de arte: Fortaleza Orc (cenário)

Caminho híbrido (`docs/FORTALEZA_PLANO.md`, seção 5): o chão por onde se anda é desenhado pelo jogo, por código; o
ChatGPT pinta o que não tem colisão (o vale lá embaixo) e as peças grandes e únicas, que entram como sprites. Mesmo
fluxo dos inimigos do Kosaradius: gerar no ChatGPT, mandar o PNG na conversa com o Claude, que guarda em
`docs/arte/fortaleza/<id>.png`, recorta, põe na escala e liga no jogo.

**Como gerar:** numa conversa nova do ChatGPT, anexe as duas imagens de referência (`docs/arte/fortaleza/referencia-ponte.png`
e `referencia-acampamento.png`, o jogo como está) e cole o prompt da peça, com os blocos `{{...}}` trocados pelo texto
de mesmo nome abaixo. Uma peça por conversa. Se vier errado (perspectiva, fundo, texto escrito), peça a correção na
mesma conversa citando o problema.

| # | id | Peça | Formato | Fundo | Vira no jogo |
|---|---|---|---|---|---|
| 1 | `vale` | O vale lá embaixo, visto do alto | retrato 2:3 (1024×1536) | **cheio** (sem magenta) | a camada de baixo, que aparece pelo abismo, escurecida e com névoa |
| 2 | `torre` | A torre de menagem vista de fora: terraço e fachada sul | quadrado (1024×1024) | magenta | o andar de cima da torre, que some quando o herói entra |
| 3 | `cachoeira` | A cachoeira caindo do castelo pelo paredão do desfiladeiro | retrato 2:3 | magenta | sprite no paredão, com brilho e espuma animados pelo jogo |
| 4 | `trono` | O trono do chefe | quadrado | magenta | sprite no salão do trono |

A ordem é a de prioridade: o vale é o que mais vende a altura e não depende de mais nada.

## Blocos comuns

**{{ESTILO}}**

```text
Dark fantasy pixel art in the exact style of the attached game screenshots: high-detail hand-painted pixel art (late 16-bit / 32-bit era), crisp hard-edged pixels with no blur and no soft gradients; near-black outline (#1a1210) around standing objects, no outline on the ground; light from the upper-left with shadows to the lower-right; 4 tones per material; earthy, slightly desaturated palette that matches the screenshots (olive grass, warm tuff and travertine stone, grey basalt, dark leather, rust), saturated color only on fire, blood and the clan's red hand. Camera exactly like the screenshots (Tibia-like top-down 3/4): we look down from above and slightly from the front, so we see the top of everything and the south-facing side of tall things. No isometric view, no vanishing point, no horizon.
```

**{{CENARIO}}**

```text
Setting: the Orc Fortress, an ancient castle of the drowned Empire of Kusa (roman-like: tuff and travertine masonry with bands of red brick, ionic and corinthian columns, the golden eagle, the inscription IMPERIVM KVSA) standing on a rocky spur high above a misty valley, now taken by a clan of orcs. The orcs patched it with crude things: untanned hides, rough planks, rope, iron spikes, skull totems, and black war banners painted with a red hand. Late afternoon light.
```

**{{MAGENTA}}**

```text
Put the object alone on a perfectly flat, solid magenta background (#FF00FF) that fills the whole canvas, with nothing else on it. Do not draw any magenta or pink inside the object. Do NOT include: ground or floor around the object, cast shadow on the ground, text, labels, numbers, grid lines, frames, borders, watermark, signature or UI.
```

## 1. `vale`: o vale lá embaixo

```text
{{ESTILO}}

{{CENARIO}}

Paint the valley floor far below the castle, seen from very high above, looking straight down (top-down map view, no horizon, no sky, no cliffs, no castle): a winding river with pale sandbanks and small rapids running from the top to the bottom of the image, dense forest canopy in large clumps, small meadows and old fields, the overgrown ruins of a small imperial village (roofless stone houses, broken walls, a few fallen columns, a collapsed stone bridge over the river) half swallowed by trees, and an old paved road disappearing into the woods. Everything is small, as if seen from a great height. Muted greens and blue-greys under a cool afternoon haze. The whole canvas is covered edge to edge with even detail (it will be shown in pieces through gaps in the castle floor), with no single focal point in the middle.

Portrait 2:3 (1024×1536). Do NOT include: text, labels, frames, borders, characters, monsters, clouds covering the ground, sky or horizon.
```

## 2. `torre`: a torre de menagem vista de fora

O andar de cima da torre ocupa 19 tiles de largura por 17 de altura na tela: os 15 de cima são o terraço (o telhado
plano, visto de cima) e os 2 de baixo, a fachada sul (vista de frente, com a porta no meio).

```text
{{ESTILO}}

{{CENARIO}}

The keep of the fortress seen from outside with the game camera: a massive square stone tower. The top 88% of the image is its flat roof terrace seen from above: big worn stone slabs with moss and soot, a crenellated parapet with merlons all around the edge, a square turret at each of the four corners (taller, with its own little crenellated top and an arrow slit), a section of the roof collapsed into a dark hole with charred beams in the left half, an orc bonfire with a few logs and an ember glow, a tall black orc war banner with a red hand on a pole, some barrels and a crude wooden ballista. The bottom 12% of the image is the south face of the tower seen from the front: tuff masonry with bands of red brick, a cornice at the top, two narrow arched windows on each side, and in the exact center a large dark arched doorway (about one sixth of the width) with travertine voussoirs; two black orc banners with the red hand hang from the cornice. The tower fills the canvas from edge to edge, seen straight from the south (not rotated, not from a corner).

{{MAGENTA}}

Square (1024×1024).
```

## 3. `cachoeira`: a cachoeira do desfiladeiro

```text
{{ESTILO}}

{{CENARIO}}

A narrow waterfall, about three times taller than it is wide, pouring over the lip of a grey rock cliff and falling straight down the cliff face: at the top, the stream comes over a mossy stone lip with a few fallen blocks; along the cliff the water is a white and pale-blue sheet with darker streaks and rock showing at the sides; at the bottom it dissolves into white foam and mist that fades out (the bottom edge of the waterfall breaks up into pixel spray, it does not end in a pool). Include the strip of wet dark rock on both sides of the water. Seen from the front with the game camera.

{{MAGENTA}}

Portrait 2:3 (1024×1536).
```

## 4. `trono`: o trono do chefe

```text
{{ESTILO}}

{{CENARIO}}

The war chief's throne in the great hall of the keep: an old imperial throne of travertine on a two-step dais, with a tall carved back crowned by a broken golden eagle, now covered with untanned furs and bear pelts, orc and animal skulls on the armrests and on the back, a black banner with the red hand hanging behind it, two iron braziers with fire on the sides of the dais and a pile of bones and offerings at its foot. Seen from the front with the game camera, centered, the whole throne visible.

{{MAGENTA}}

Square (1024×1024).
```
