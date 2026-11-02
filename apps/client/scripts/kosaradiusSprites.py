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

Folha B (ação), se existir (`docs/arte/pantano-do-kosaradius/<kind>-B.png`): 2 linhas x 6, golpe em cima e morte
embaixo, em 3/4 de frente para a esquerda. Vai para a mesma escala da A (a figura parada do começo do golpe com a
altura da 3/4 de frente parada da A) e entra depois das 6 da A: 4 quadros do golpe (`ATTACK_B`) e 4 da morte
(`DEATH_B`), 14 figuras no total. `art/proto/kosaradiusArt.ts` monta os clipes.

Folha C (habilidades), se existir (`<kind>-C.png`): uma linha de 6 por habilidade, na ordem de `C_ROWS` em
`kosaradiusArt.ts`, em 3/4 de frente como a B. Vai para a escala da B (a figura parada do começo de cada linha com a
altura da parada do golpe) e entra depois da B: 4 quadros por linha (`SKILL_C`).

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

# Figuras da folha B (linha a linha, 0–11) que vão para o jogo: o golpe sem a pose parada do começo e do fim (o jogo
# já mostra a parada) e a morte com o golpe recebido, de joelhos, caindo e o corpo no chão.
ATTACK_B = (1, 2, 3, 4)
DEATH_B = (6, 8, 9, 11)

# Figuras de cada linha da folha C que vão para o jogo: sem a pose parada do começo e do fim.
SKILL_C = (1, 2, 3, 4)


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
    # O golpe e o corpo no chão da folha B são mais largos que a figura parada: cresce o quadro até caber tudo.
    while True:
        try:
            return build(kind, flip, flip_figs, height, cell)
        except AssertionError as e:
            if "não cabe" not in str(e):
                raise
            cell += 16


def build(kind, flip, flip_figs, height, cell):
    rgba = clean(SRC / f"{kind}-A.png")
    rows = figures(rgba)
    assert [len(r) for r in rows] == [6, 6], f"{kind}-A: esperava 2 linhas de 6, achei {[len(r) for r in rows]}"
    side = rows[0][2][0]
    scale = height / (side[3] - side[1])
    figs = [f for line in rows for f in line]
    cells = [place(rgba, f, scale, flip != (i in flip_figs), cell) for i, f in enumerate(figs)]
    DST.mkdir(parents=True, exist_ok=True)
    cells = [cells[i] for i in USED]
    src_b = SRC / f"{kind}-B.png"
    if src_b.exists():
        b = clean(src_b)
        rows_b = figures(b)
        assert [len(r) for r in rows_b] == [6, 6], f"{kind}-B: esperava 2 linhas de 6, achei {[len(r) for r in rows_b]}"
        quarter = rows[0][1][0]
        ready = rows_b[0][0][0]
        scale_b = scale * (quarter[3] - quarter[1]) / (ready[3] - ready[1])
        figs_b = [f for line in rows_b for f in line]
        cells += [place(b, figs_b[i], scale_b, flip, cell) for i in ATTACK_B + DEATH_B]
        print(f"  folha B: escala {scale_b:.3f} (A {scale:.3f})")
        src_c = SRC / f"{kind}-C.png"
        if src_c.exists():
            c = clean(src_c)
            rows_c = figures(c)
            assert all(len(r) == 6 for r in rows_c), f"{kind}-C: esperava linhas de 6, achei {[len(r) for r in rows_c]}"
            # Cada linha começa na pose parada: na altura da parada do golpe da B.
            for row in rows_c:
                start = row[0][0]
                scale_c = scale_b * (ready[3] - ready[1]) / (start[3] - start[1])
                cells += [place(c, row[i], scale_c, flip, cell) for i in SKILL_C]
            print(f"  folha C: {len(rows_c)} linhas")
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
