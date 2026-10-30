"""
Folha do sapo gigante (Pântano das Ruínas) da arte nova, a partir das folhas geradas por IA e aprovadas:
docs/arte/pantano-das-ruinas/frog-A.png (parado e andando em 6 ângulos, 2 linhas x 6) e frog-B.png (de perfil para a
esquerda: andar, bote, língua e morte, uma animação por linha).

As folhas vêm com o xadrez de "transparência" desenhado no fundo. Aqui:

1. o fundo (branco e cinza claro sem cor) vira transparente, e os pingos soltos de xadrez somem;
2. cada figura é a mancha conectada (a língua passa por cima do quadro vizinho), e as gotas e respingos soltos vão
   para a figura mais perto;
3. as duas folhas vão para a mesma escala (a altura do sapo parado de perfil na A igual à do sapo andando na B), com
   os pés na linha dos outros monstros e o meio dos pés no centro do quadro;
4. sai uma folha com as figuras em quadros de 352 px (a língua esticada pede o quadro largo), sem repetir: as 12 da A (parado em 6 ângulos, depois andando
   nos mesmos 6) e as 15 da B (andar, bote e língua, 4 cada, e a morte, 3). `art/proto/frogArt.ts` monta os clipes.

Uso: python3 apps/client/scripts/frogSprites.py docs/arte/pantano-das-ruinas/frog-A.png \
       docs/arte/pantano-das-ruinas/frog-B.png apps/client/src/art/proto/frog.png
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

CELL = 352
FEET_Y = 342  # última linha dos pés
FOOT_X = 176  # meio dos pés no centro do quadro (o quadro é largo para a língua caber)
HEIGHT = 92  # altura do sapo parado de perfil, em px de arte nova (128 por tile)


def components(mask):
    """Manchas conectadas (vizinhança de 8) de uma máscara pequena: rótulo de cada célula (0 = vazio)."""
    h, w = mask.shape
    label = np.zeros((h, w), int)
    n = 0
    for y, x in zip(*np.nonzero(mask)):
        if label[y, x]:
            continue
        n += 1
        label[y, x] = n
        stack = [(y, x)]
        while stack:
            cy, cx = stack.pop()
            for ny in (cy - 1, cy, cy + 1):
                for nx in (cx - 1, cx, cx + 1):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = n
                        stack.append((ny, nx))
    return label, n


def clean(path):
    """Folha RGBA com o xadrez desenhado transformado em transparência."""
    a = np.array(Image.open(path).convert("RGB")).astype(int)
    lo, hi = a.min(-1), a.max(-1)
    bg = (lo >= 196) & (hi - lo <= 14)
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
    # Some com os pontinhos soltos que sobram do xadrez (e com o miolo claro que vira buraco, fecha de volta).
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    out = np.dstack([a.astype(np.uint8), np.array(alpha)])
    out[out[:, :, 3] == 0] = 0
    return out


def figures(rgba):
    """Figuras da folha, linha a linha, da esquerda para a direita: [(caixa, máscara da figura na folha)].

    A língua de um quadro passa por cima do vizinho na horizontal, então a figura é a mancha conectada, não a coluna.
    Manchas pequenas (gotas, respingos) vão para a figura grande mais perto."""
    m = rgba[:, :, 3] > 0
    k = 4  # a busca roda numa grade 4x menor
    h, w = m.shape[0] // k, m.shape[1] // k
    small = m[: h * k, : w * k].reshape(h, k, w, k).any(axis=(1, 3))
    label, n = components(small)
    sizes = np.bincount(label.ravel(), minlength=n + 1)
    big = [i for i in range(1, n + 1) if sizes[i] >= 300]
    owner = {i: i for i in big}
    centers = {i: np.argwhere(label == i).mean(axis=0) for i in range(1, n + 1)}
    for i in range(1, n + 1):
        if i not in owner and sizes[i]:
            cells = np.argwhere(label == i)
            owner[i] = min(big, key=lambda j: np.abs(np.argwhere(label == j)[:, None] - cells[None]).sum(-1).min())
    figs = []
    for j in big:
        part = np.isin(label, [i for i, o in owner.items() if o == j])
        full = np.repeat(np.repeat(part, k, axis=0), k, axis=1)
        mask = np.zeros_like(m)
        mask[: full.shape[0], : full.shape[1]] = full
        mask &= m
        ys, xs = np.nonzero(mask)
        figs.append(((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), mask))
    # Linhas: pela base da figura (os pés); dentro da linha, pela borda direita (a língua vai para a esquerda).
    figs.sort(key=lambda f: f[0][3])
    rows = []
    for f in figs:
        if rows and f[0][3] - rows[-1][-1][0][3] < 60:
            rows[-1].append(f)
        else:
            rows.append([f])
    return [sorted(r, key=lambda f: f[0][2]) for r in rows]


def place(rgba, fig, scale):
    """Figura reduzida num quadro de CELL x CELL, com os pés na linha e o meio dos pés em FOOT_X."""
    (x0, y0, x1, y1), mask = fig
    box = (x0, y0, x1, y1)
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
    foot = s[max(0, bottom - round(h * 0.12)) : bottom + 1, :, 3].any(axis=0)
    fx = np.where(foot)[0].mean()
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    ox, oy = round(FOOT_X - fx), FEET_Y - bottom
    assert ox >= 0 and ox + w <= CELL and oy >= 0, f"figura {box} não cabe no quadro ({ox}, {oy}, {w}x{h})"
    cell.alpha_composite(Image.fromarray(s), (ox, oy))
    return cell


def main(src_a, src_b, dst):
    a, b = clean(src_a), clean(src_b)
    fa, fb = figures(a), figures(b)
    assert [len(r) for r in fa] == [6, 6], f"frog-A: esperava 2 linhas de 6, achei {[len(r) for r in fa]}"
    assert [len(r) for r in fb] == [4, 4, 4, 3], f"frog-B: esperava linhas de 4, 4, 4 e 3, achei {[len(r) for r in fb]}"
    side = fa[0][2]  # parado, de perfil para a esquerda
    scale_a = HEIGHT / (side[0][3] - side[0][1])
    walk_h = np.median([y1 - y0 for (_, y0, _, y1), _ in fb[0]])
    scale_b = HEIGHT / walk_h
    cells = [place(a, box, scale_a) for line in fa for box in line]
    cells += [place(b, box, scale_b) for line in fb for box in line]
    top = min(np.where(np.array(c)[:, :, 3].any(axis=1))[0][0] for c in cells[2:3])
    print(f"fill do perfil parado: {(CELL - top) / CELL:.2f}")
    sheet = Image.new("RGBA", (CELL * len(cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.alpha_composite(c, (i * CELL, 0))
    sheet.save(dst, optimize=True)
    print(f"{dst}: {len(cells)} quadros de {CELL}x{CELL} (escala A {scale_a:.3f}, B {scale_b:.3f})")


if __name__ == "__main__":
    main(*sys.argv[1:4])
