"""
Inimigos da Cripta da arte nova, a partir das folhas geradas por IA com os prompts de `docs/arte/agente/CRIPTA.md`,
guardadas em `docs/arte/cripta/<kind>-A.webp` e `<kind>-B.webp` (WebP sem perda: metade do PNG, os mesmos pixels).

- Folha A (giro): 2 linhas x 6 (parado e andando; colunas: frente, 3/4 de frente, perfil para a esquerda, 3/4 de
  costas, costas, 3/4 de costas para a direita).
- Folha B (ação): 4 linhas x 4, tudo de perfil para a esquerda: andar (4), golpe (4), especial (4) e morte (3).

O fundo deveria vir transparente, mas o gerador às vezes deixa branco nos buracos de dentro da figura (entre os ossos
do esqueleto, entre as pernas do rato) ou pinta o xadrez de "transparente" (folha B da aranha): o claro sem cor que
encosta no fundo, ou que forma um buraco grande, vira transparência (`clean`).

Escala: a altura do perfil parado da A é `HEIGHT` do monstro (px de arte nova, 128 por tile; o herói tem ~120). A B
vai para a escala da A pela área do andar de perfil (média das 4 figuras do andar da B = média das 2 de perfil da A).

Quadro: pés a 10 px do fundo, o meio dos pés no centro (como o clã do Kosaradius, `kosaradiusSprites.py`). Na A e no
andar da B cada figura vai com os pés na linha; no golpe, no especial e na morte a linha inteira guarda a altura de
cada quadro em relação ao chão (o pulo do rato, o corpo caindo), menos quem voa (`FLYERS`): esse vai figura a figura.
O lado do quadro é o menor múltiplo de 16 que cabe a figura mais alta e a mais larga (quadro vazio também pesa na
memória do celular); a figura que não cabe com os pés no meio encosta na borda.

Sai `apps/client/src/art/proto/cripta/<kind>.png`, paleta de 256 cores, com 21 figuras: as 6 da A que o jogo usa
(frente, perfil e costas, parado e depois andando) e as 15 da B (andar, golpe, especial, morte). Quem monta os clipes
é `art/proto/criptaArt.ts`.

Se o perfil de alguma figura vier para a direita, passe os índices dela (A: 0-11; B: 12-26, na ordem da folha) em
`--flip=8,13`.

Uso: python3 apps/client/scripts/criptaSprites.py rat [--flip=8,...]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from frogSprites import components, figures  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs/arte/cripta"
DST = ROOT / "apps/client/src/art/proto/cripta"

# Altura do perfil parado (px de arte nova). Base: o tamanho de hoje no jogo (kit do esqueleto 0,95 e do kobold 0,7
# da altura do herói; os bichos de `proto/beasts.ts`).
HEIGHT = {
    "rat": 80,
    "kobold": 100,
    "stirge": 120,
    "skeleton": 125,
    "giantSpider": 100,
}

# Quem voa: a figura vai com o próprio pé na linha em toda folha (não cai até o chão na morte).
FLYERS = {"stirge"}

# Figuras da folha de giro que vão para o jogo: frente, perfil e costas, parado (0, 2, 4) e andando (6, 8, 10).
USED = (0, 2, 4, 6, 8, 10)
# Linhas da folha B e quantas figuras cada uma tem.
B_ROWS = (4, 4, 4, 3)
HOLE = 60  # células de 2x2 px: claro sem cor desse tamanho para cima, cercado pela figura, é fundo


def clean(path):
    """Folha RGBA: o transparente da folha e o claro sem cor ligado a ele (ou buraco grande) viram transparência."""
    img = Image.open(path).convert("RGBA")
    a = np.array(img).astype(int)
    rgb, alpha = a[..., :3], a[..., 3]
    lo, hi = rgb.min(-1), rgb.max(-1)
    light = (lo >= 196) & (hi - lo <= 16)
    clear = alpha < 128
    cand = clear | light
    k = 2  # a busca roda numa grade 2x menor
    h, w = cand.shape[0] // k, cand.shape[1] // k
    small = cand[: h * k, : w * k].reshape(h, k, w, k).all(axis=(1, 3))
    label, _ = components(small)
    clear_small = clear[: h * k, : w * k].reshape(h, k, w, k).any(axis=(1, 3))
    sizes = np.bincount(label.ravel())
    keep = set(np.unique(label[clear_small])) | {i for i in range(1, len(sizes)) if sizes[i] >= HOLE}
    keep |= set(np.unique(np.concatenate([label[0], label[-1], label[:, 0], label[:, -1]])))
    keep.discard(0)
    bg = np.zeros_like(cand)
    bg[: h * k, : w * k] = np.repeat(np.repeat(np.isin(label, list(keep)), k, axis=0), k, axis=1)
    bg |= clear
    # O pixel claro da borda (antialias com o fundo) também cai.
    near = np.array(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
    bg |= near & light
    out_alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    out_alpha = out_alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    out = np.dstack([rgb.astype(np.uint8), np.array(out_alpha)])
    out[out[:, :, 3] == 0] = 0
    return out


def merge_loose(rows, expected):
    """Peça solta grande (a caveira voando na morte do esqueleto) vira uma linha a mais: junta cada figura das linhas
    sobrando à figura mais perto na horizontal da linha de baixo (ou de cima, na última)."""
    rows = [list(r) for r in rows]
    while len(rows) > len(expected):
        extra = min(range(len(rows)), key=lambda i: sum(int(f[1].sum()) for f in rows[i]))
        loose = rows.pop(extra)
        into = rows[min(extra, len(rows) - 1)]
        for (box, mask) in loose:
            cx = (box[0] + box[2]) / 2
            j = min(range(len(into)), key=lambda j: abs((into[j][0][0] + into[j][0][2]) / 2 - cx))
            (x0, y0, x1, y1), m = into[j]
            into[j] = ((min(x0, box[0]), min(y0, box[1]), max(x1, box[2]), max(y1, box[3])), m | mask)
    return rows


def shrink(rgba, fig, scale, flip):
    """Figura recortada e reduzida (RGBA, alfa duro), espelhada se `flip`; devolve também a base dela na folha."""
    (x0, y0, x1, y1), mask = fig
    crop = rgba[y0:y1, x0:x1].copy()
    crop[~mask[y0:y1, x0:x1]] = 0
    img = Image.fromarray(crop)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    img = img.convert("RGBa")
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    small = img.resize((w, h), Image.LANCZOS).convert("RGBA")
    small = small.filter(ImageFilter.UnsharpMask(radius=0.8, percent=60, threshold=2))
    s = np.array(small)
    s[:, :, 3] = np.where(s[:, :, 3] >= 110, 255, 0)
    s[s[:, :, 3] == 0] = 0
    return s


def foot_x(s):
    """Meio dos pés (a faixa de baixo da figura)."""
    bottom = np.where(s[:, :, 3].any(axis=1))[0][-1]
    band = s[max(0, bottom - round(s.shape[0] * 0.08)) : bottom + 1, :, 3].any(axis=0)
    return np.where(band)[0].mean(), bottom


def height(fig):
    return fig[0][3] - fig[0][1]


def area(fig):
    return int(fig[1].sum())


def main(kind, flip_figs=()):
    a = clean(SRC / f"{kind}-A.webp")
    rows_a = figures(a)
    assert [len(r) for r in rows_a] == [6, 6], f"{kind}-A: esperava 2 linhas de 6, achei {[len(r) for r in rows_a]}"
    b = clean(SRC / f"{kind}-B.webp")
    rows_b = merge_loose(figures(b), B_ROWS)
    assert tuple(len(r) for r in rows_b) == B_ROWS, f"{kind}-B: esperava linhas {B_ROWS}, achei {[len(r) for r in rows_b]}"
    scale = HEIGHT[kind] / height(rows_a[0][2])
    # Pela área, não pela altura: a cauda curvada do rato e as asas da estirge mudam a altura de uma folha para a outra.
    side_a = (area(rows_a[0][2]) + area(rows_a[1][2])) / 2
    walk_b = sum(area(f) for f in rows_b[0]) / 4
    scale_b = scale * (side_a / walk_b) ** 0.5

    figs_a = [f for row in rows_a for f in row]
    # (figura reduzida, quanto ela fica acima da linha do chão, em px reduzidos)
    placed = []
    for i in USED:
        placed.append((shrink(a, figs_a[i], scale, i in flip_figs), 0))
    n = 12
    for r, row in enumerate(rows_b):
        base = max(f[0][3] for f in row)
        for f in row:
            lift = 0 if (r == 0 or kind in FLYERS) else round((base - f[0][3]) * scale_b)
            placed.append((shrink(b, f, scale_b, n in flip_figs), lift))
            n += 1

    # O menor quadro (múltiplo de 16) que cabe a figura mais alta e a mais larga. Os pés vão no meio; a figura larga
    # (a cauda do rato) encosta na borda em vez de crescer o quadro de todas (memória do celular).
    need = 0
    for s, lift in placed:
        fx, bottom = foot_x(s)
        need = max(need, bottom + 1 + 10 + lift, s.shape[1] + 2)
    cell = int(-(-need // 16) * 16)
    sheet = Image.new("RGBA", (cell * len(placed), cell), (0, 0, 0, 0))
    for i, (s, lift) in enumerate(placed):
        fx, bottom = foot_x(s)
        ox, oy = round(cell / 2 - fx), cell - 10 - lift - bottom
        ox = min(max(ox, 0), cell - s.shape[1])
        assert ox >= 0 and ox + s.shape[1] <= cell and oy >= 0, f"figura {i} não cabe no quadro de {cell}"
        sheet.alpha_composite(Image.fromarray(s), (i * cell + ox, oy))
    DST.mkdir(parents=True, exist_ok=True)
    dst = DST / f"{kind}.png"
    sheet.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)
    mb = len(placed) * cell * cell * 4 / 2**20
    print(f"{dst.relative_to(ROOT)}: {len(placed)} figuras de {cell} px (escala A {scale:.3f}, B {scale_b:.3f}; ~{mb:.1f} MB na memória)")


if __name__ == "__main__":
    args = sys.argv[2:]
    some = [x.split("=", 1)[1] for x in args if x.startswith("--flip=")]
    main(sys.argv[1], tuple(int(i) for i in some[0].split(",")) if some else ())
