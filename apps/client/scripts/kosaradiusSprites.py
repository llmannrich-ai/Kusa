"""
Folhas do clã do Pântano do Kosaradius (orcs e ogros) da arte nova, a partir das folhas geradas por IA (ChatGPT) e
aprovadas, em docs/arte/pantano-do-kosaradius/<kind>-A.png: turnaround de 2 linhas x 6 (parado e andando; colunas:
frente, 3/4 de frente, perfil, 3/4 de costas, costas, 3/4 de costas para o outro lado), fundo magenta chapado.

Mesmo processo do Rei Bullywug (`bullywugKingSprites.py`): o magenta vira transparência, cada figura é a mancha
conectada (a lança e o arco passam do quadro), e todas vão para a mesma escala (a altura do perfil parado é `HEIGHT`
do monstro), com os pés na linha dos outros monstros e o meio dos pés no centro do quadro. Se o perfil da folha
olhar para a direita, passe `--flip` (o jogo quer tudo olhando para a esquerda); se só algumas figuras vierem viradas
(o gerador às vezes vira o perfil andando), passe os índices delas (0–11, na ordem da folha) em `--flip=8,7`.

Sai `apps/client/src/art/proto/kosaradius/<kind>.png` só com as 6 figuras que o jogo usa (frente, perfil e costas,
parado e depois andando; as de 3/4 ficam de fora), em quadros de `CELL` px e paleta de 256 cores: o jogo baixa tudo no
começo, e a folha inteira em cores cheias pesava 4 vezes mais.
`art/proto/kosaradiusArt.ts` monta os clipes.

Uso: python3 apps/client/scripts/kosaradiusSprites.py orcSpearman [--flip | --flip=8,...]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from frogSprites import figures  # noqa: E402
from bullywugKingSprites import clean  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs/arte/pantano-do-kosaradius"
DST = ROOT / "apps/client/src/art/proto/kosaradius"

# Altura da figura de perfil parada (do topo da arma ou do chapéu aos pés), em px de arte nova (128 por tile; o herói
# tem ~120) e o lado do quadro: o menor que cabe a figura mais larga com a folga do bote e do especial (o jogo guarda
# cada quadro na memória do celular, e quadro vazio também pesa). A lança e o arco sobem acima da cabeça: a altura conta com eles.
SIZES = {
    "orcScout": (108, 144),
    "orcGrunt": (128, 160),
    "orcSpearman": (150, 176),
    "orcArcher": (122, 160),
    "orcShaman": (130, 176),
    "orcBerserker": (132, 192),
    "orcCaptain": (150, 192),
    "ogreYoung": (170, 240),
    "ogreBruiser": (215, 288),
    "ogreShaman": (215, 256),
    "orcWarlord": (160, 192),
    "ogreKing": (300, 384),
}

# Figuras da folha de giro que vão para o jogo: frente, perfil e costas, parado (0, 2, 4) e andando (6, 8, 10).
USED = (0, 2, 4, 6, 8, 10)


def place(rgba, fig, scale, flip, cell):
    """Figura reduzida num quadro de `cell` px, pés a 10 px do fundo, meio dos pés no centro, espelhada se `flip`."""
    feet_y, foot_x = cell - 10, cell // 2
    (x0, y0, x1, y1), mask = fig
    crop = rgba[y0:y1, x0:x1].copy()
    crop[~mask[y0:y1, x0:x1]] = 0
    img = Image.fromarray(crop)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    img = img.convert("RGBa")
    w, h = round(img.width * scale), round(img.height * scale)
    small = img.resize((w, h), Image.LANCZOS).convert("RGBA")
    small = small.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
    s = np.array(small)
    s[:, :, 3] = np.where(s[:, :, 3] >= 110, 255, 0)
    s[s[:, :, 3] == 0] = 0
    bottom = np.where(s[:, :, 3].any(axis=1))[0][-1]
    foot = s[max(0, bottom - round(h * 0.08)) : bottom + 1, :, 3].any(axis=0)
    fx = np.where(foot)[0].mean()
    ox, oy = round(foot_x - fx), feet_y - bottom
    assert ox >= 0 and ox + w <= cell and oy >= 0, f"figura {(x0, y0, x1, y1)} não cabe no quadro ({ox}, {oy}, {w}x{h})"
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    out.alpha_composite(Image.fromarray(s), (ox, oy))
    return out


def main(kind, flip=False, flip_figs=()):
    height, cell = SIZES[kind]
    rgba = clean(SRC / f"{kind}-A.png")
    rows = figures(rgba)
    assert [len(r) for r in rows] == [6, 6], f"{kind}-A: esperava 2 linhas de 6, achei {[len(r) for r in rows]}"
    side = rows[0][2][0]
    scale = height / (side[3] - side[1])
    figs = [f for line in rows for f in line]
    cells = [place(rgba, f, scale, flip != (i in flip_figs), cell) for i, f in enumerate(figs)]
    DST.mkdir(parents=True, exist_ok=True)
    cells = [cells[i] for i in USED]
    sheet = Image.new("RGBA", (cell * len(cells), cell), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.alpha_composite(c, (i * cell, 0))
    dst = DST / f"{kind}.png"
    sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)
    top = np.where(np.array(cells[1])[:, :, 3].any(axis=1))[0][0]
    print(f"{dst.relative_to(ROOT)}: {len(cells)} quadros de {cell} px (escala {scale:.3f}, fill do perfil {(cell - top) / cell:.2f})")


if __name__ == "__main__":
    args = sys.argv[2:]
    some = [a.split("=", 1)[1] for a in args if a.startswith("--flip=")]
    main(sys.argv[1], "--flip" in args, tuple(int(i) for i in some[0].split(",")) if some else ())
