"""
Folha do goblin da arte nova a partir da arte de referência (docs/arte/goblin-referencia.png).

A referência tem 12 figuras em 2 linhas (parado em cima, andando embaixo) e 6 ângulos: frente, ¾ de frente, perfil,
¾ de costas, costas e costas do outro lado. Cada figura é recortada, reduzida para a escala da arte nova (128 px por
tile, o goblin com ~110 px de altura) e posta num quadro de 192 × 192 com os pés na linha dos outros monstros e o meio
dos pés no centro. A saída (apps/client/src/art/proto/goblin.png) tem os 12 quadros lado a lado, na ordem da
referência (linha 1 da esquerda para a direita, depois a linha 2).

Uso: python3 apps/client/scripts/goblinSprites.py docs/arte/goblin-referencia.png apps/client/src/art/proto/goblin.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

CELL = 192
FEET_Y = 183  # última linha dos pés (igual aos monstros desenhados por código)
FOOT_X = 95  # meio do quadro (CX * K)
SCALE = 0.32


def runs(v):
    out, start = [], None
    for i, x in enumerate(v):
        if x and start is None:
            start = i
        if not x and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(v)))
    return out


def main(src, dst):
    im = Image.open(src).convert("RGBA")
    a = np.array(im)[:, :, 3] > 128
    figures = []
    for y0, y1 in runs(a.sum(axis=1) > 0):
        for x0, x1 in runs(a[y0:y1].sum(axis=0) > 0):
            if x1 - x0 > 20:
                figures.append((x0, y0, x1, y1))
    assert len(figures) == 12, f"esperava 12 figuras, achei {len(figures)}"
    sheet = Image.new("RGBA", (CELL * len(figures), CELL), (0, 0, 0, 0))
    for i, (x0, y0, x1, y1) in enumerate(figures):
        crop = im.crop((x0, y0, x1, y1))
        # Sem o ruído quase transparente do fundo; redução com cor pré-multiplicada (sem halo escuro na borda).
        arr = np.array(crop)
        arr[arr[:, :, 3] < 128] = 0
        crop = Image.fromarray(arr).convert("RGBa")
        w, h = round(crop.width * SCALE), round(crop.height * SCALE)
        small = crop.resize((w, h), Image.LANCZOS).convert("RGBA")
        small = small.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
        s = np.array(small)
        s[:, :, 3] = np.where(s[:, :, 3] >= 110, 255, 0)
        s[s[:, :, 3] == 0] = 0
        small = Image.fromarray(s)
        # Âncora: o meio dos pés (colunas opacas nas últimas linhas da figura) e a base dos pés.
        rows = np.where(s[:, :, 3].any(axis=1))[0]
        bottom = rows[-1]
        foot = s[max(0, bottom - round(h * 0.1)) : bottom + 1, :, 3].any(axis=0)
        fx = np.where(foot)[0].mean()
        ox, oy = round(FOOT_X - fx), FEET_Y - bottom
        cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        cell.alpha_composite(small, (max(0, ox), max(0, oy)))
        sheet.alpha_composite(cell, (i * CELL, 0))
    sheet.save(dst, optimize=True)
    print(f"{dst}: {len(figures)} quadros de {CELL}x{CELL}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
