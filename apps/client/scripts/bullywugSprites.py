"""
Folha do bullywug (Pântano das Ruínas) da arte nova, a partir das folhas geradas no Runway e aprovadas:
docs/arte/pantano-das-ruinas/bullywug-A.png (turnaround, 2 linhas x 6, de perfil para a DIREITA) e bullywug-B.png
(ação, 4 linhas x 4, de perfil para a esquerda: andar, golpe de lança, bote saindo da lama e morte).

No molde de `frogSprites.py`, mas o fundo é magenta chapado (#FF00FF), não o xadrez:

1. o magenta vira transparente; a borda rosada que o gerador deixa em volta da figura (antialias com o fundo) cai
   junto, e o que sobra de rosa no contorno perde o tom;
2. cada figura é a mancha conectada (a lança passa do quadro), com as sobras pequenas indo para a figura mais perto;
3. as duas folhas vão para a mesma escala (a altura do bullywug parado de perfil na A igual à mediana do andar na B),
   pés na linha dos outros monstros e o meio dos pés no centro do quadro; as figuras da A são espelhadas para a
   esquerda, como as da B;
4. sai uma folha com as figuras em quadros de 352 px (a lança esticada pede o quadro largo): as 12 da A (linha 1:
   frente, 3/4, perfil, 3/4 de costas, costas, costas; linha 2: frente, três perfis andando, costas, costas) e as 16
   da B. `art/proto/bullywugArt.ts` monta os clipes.

Uso: python3 apps/client/scripts/bullywugSprites.py docs/arte/pantano-das-ruinas/bullywug-A.png \
       docs/arte/pantano-das-ruinas/bullywug-B.png apps/client/src/art/proto/bullywug.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

from frogSprites import figures

CELL = 352
FEET_Y = 342
FOOT_X = 176
HEIGHT = 108  # altura do bullywug parado de perfil (lança incluída), em px de arte nova (128 por tile)


def clean(path):
    """Folha RGBA com o magenta do fundo transformado em transparência."""
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    pink = np.minimum(r, b) - g  # quanto do magenta o pixel tem
    alpha = Image.fromarray(np.where(pink > 110, 0, 255).astype(np.uint8))
    # Tira o contorno rosado (um pixel de antialias com o fundo) e os pingos soltos.
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    # O rosa que ainda sobra no contorno: vermelho e azul descem até perto do verde.
    tint = np.clip(pink - 20, 0, None)
    a[..., 0] -= tint
    a[..., 2] -= tint
    out = np.dstack([np.clip(a, 0, 255).astype(np.uint8), np.array(alpha)])
    out[out[:, :, 3] == 0] = 0
    return out


def place(rgba, fig, scale, flip):
    """Figura reduzida num quadro de CELL x CELL, pés na linha, meio dos pés em FOOT_X, espelhada se `flip`."""
    (x0, y0, x1, y1), mask = fig
    crop = rgba[y0:y1, x0:x1].copy()
    crop[~mask[y0:y1, x0:x1]] = 0
    crop = Image.fromarray(crop)
    if flip:
        crop = crop.transpose(Image.FLIP_LEFT_RIGHT)
    crop = crop.convert("RGBa")
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
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    assert ox >= 0 and ox + w <= CELL and oy >= 0, f"figura {(x0, y0, x1, y1)} não cabe no quadro ({ox}, {oy}, {w}x{h})"
    cell.alpha_composite(Image.fromarray(s), (ox, oy))
    return cell


def main(src_a, src_b, dst):
    a, b = clean(src_a), clean(src_b)
    fa, fb = figures(a), figures(b)
    assert [len(r) for r in fa] == [6, 6], f"bullywug-A: esperava 2 linhas de 6, achei {[len(r) for r in fa]}"
    assert [len(r) for r in fb] == [4, 4, 4, 4], f"bullywug-B: esperava 4 linhas de 4, achei {[len(r) for r in fb]}"
    # A A olha para a direita: a ordem da linha fica a da folha (pela borda direita), e a figura é espelhada.
    side = fa[0][2]
    scale_a = HEIGHT / (side[0][3] - side[0][1])
    walk_h = np.median([y1 - y0 for (_, y0, _, y1), _ in fb[0]])
    scale_b = HEIGHT / walk_h
    cells = [place(a, f, scale_a, True) for line in fa for f in line]
    cells += [place(b, f, scale_b, False) for line in fb for f in line]
    top = np.where(np.array(cells[2])[:, :, 3].any(axis=1))[0][0]
    print(f"fill do perfil parado: {(CELL - top) / CELL:.2f}")
    sheet = Image.new("RGBA", (CELL * len(cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.alpha_composite(c, (i * CELL, 0))
    sheet.save(dst, optimize=True)
    print(f"{dst}: {len(cells)} quadros de {CELL}x{CELL} (escala A {scale_a:.3f}, B {scale_b:.3f})")


if __name__ == "__main__":
    main(*sys.argv[1:4])
