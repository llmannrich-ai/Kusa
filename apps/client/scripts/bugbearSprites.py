"""
Folha do Bugbear chefe (miniboss da Cripta e das Cavernas) da arte nova, a partir da arte de referência
(docs/arte/bugbear-referencia.webp: 2 linhas x 6, parado em cima e andando embaixo, nos ângulos frente, ¾ de frente,
perfil, ¾ de costas, costas e costas do outro lado). O perfil da referência olha para a DIREITA.

No molde de `goblinSprites.py`, mas o fundo é branco chapado (não transparente):

1. o branco ligado à borda da folha e os buracos brancos grandes viram transparência (o branco pequeno, de dentes e
   brilhos, fica);
2. cada figura é a mancha conectada (`frogSprites.figures`), com as sobras pequenas indo para a figura mais perto;
3. tudo vai para a mesma escala (o perfil parado com HEIGHT px), pés na linha dos outros monstros e o meio dos pés no
   centro de um quadro de 192 px, sem espelhar: `art/proto/bugbearArt.ts` espelha o que precisa.

Uso: python3 apps/client/scripts/bugbearSprites.py docs/arte/bugbear-referencia.webp apps/client/src/art/proto/bugbear.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

from frogSprites import components, figures

CELL = 192
FEET_Y = 183  # última linha dos pés (igual ao goblin e aos monstros desenhados por código)
FOOT_X = 96
HOLE = 25  # células de 2x2 px: buraco branco desse tamanho para cima é fundo
HEIGHT = 160  # perfil parado, da coroa aos pés: o kit do bugbear tem 1,22 da altura do herói (o goblin, 0,8, tem ~107)


def clean(path):
    """Folha RGBA com o branco do fundo (o que encosta na borda) transformado em transparência."""
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    white = (a.min(-1) >= 228) & (a.max(-1) - a.min(-1) <= 20)
    k = 2  # a busca roda numa grade 2x menor (célula de fundo = toda branca)
    h, w = white.shape[0] // k, white.shape[1] // k
    small = white[: h * k, : w * k].reshape(h, k, w, k).all(axis=(1, 3))
    label, _ = components(small)
    edge = set(np.unique(np.concatenate([label[0], label[-1], label[:, 0], label[:, -1]]))) - {0}
    # Buraco branco grande cercado pela figura (entre o cabo da maça e o corpo) também é fundo; o branco pequeno
    # (dentes, brilho) fica.
    sizes = np.bincount(label.ravel())
    holes = {i for i in range(1, len(sizes)) if sizes[i] >= HOLE}
    bg_small = np.isin(label, list(edge | holes))
    bg = np.zeros_like(white)
    bg[: h * k, : w * k] = np.repeat(np.repeat(bg_small, k, axis=0), k, axis=1)
    # O pixel claro da borda (antialias com o fundo) também cai.
    near = Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
    bg |= (np.array(near) > 0) & (a.min(-1) >= 200)
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    out = np.dstack([a.astype(np.uint8), np.array(alpha)])
    out[out[:, :, 3] == 0] = 0
    return out


def place(rgba, fig, scale):
    """Figura reduzida num quadro de CELL x CELL, pés na linha e o meio dos pés em FOOT_X."""
    (x0, y0, x1, y1), mask = fig
    crop = rgba[y0:y1, x0:x1].copy()
    crop[~mask[y0:y1, x0:x1]] = 0
    crop = Image.fromarray(crop).convert("RGBa")
    w, h = round(crop.width * scale), round(crop.height * scale)
    small = crop.resize((w, h), Image.LANCZOS).convert("RGBA")
    small = small.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
    s = np.array(small)
    s[:, :, 3] = np.where(s[:, :, 3] >= 110, 255, 0)
    s[s[:, :, 3] == 0] = 0
    bottom = np.where(s[:, :, 3].any(axis=1))[0][-1]
    foot = s[max(0, bottom - round(h * 0.08)) : bottom + 1, :, 3].any(axis=0)
    fx = np.where(foot)[0].mean()
    ox, oy = round(FOOT_X - fx), FEET_Y - bottom
    ox = min(max(ox, 0), CELL - w)  # o pé fica perto do meio; a figura larga não sai do quadro
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    assert oy >= 0 and w <= CELL, f"figura {(x0, y0, x1, y1)} não cabe no quadro ({ox}, {oy}, {w}x{h})"
    cell.alpha_composite(Image.fromarray(s), (ox, oy))
    return cell


def main(src, dst):
    rgba = clean(src)
    fs = figures(rgba)
    assert [len(r) for r in fs] == [6, 6], f"esperava 2 linhas de 6, achei {[len(r) for r in fs]}"
    (_, y0, _, y1), _ = fs[0][2]
    scale = HEIGHT / (y1 - y0)
    cells = [place(rgba, f, scale) for line in fs for f in line]
    sheet = Image.new("RGBA", (CELL * len(cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.alpha_composite(c, (i * CELL, 0))
    sheet.save(dst, optimize=True)
    print(f"{dst}: {len(cells)} quadros de {CELL}x{CELL} (escala {scale:.3f})")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
