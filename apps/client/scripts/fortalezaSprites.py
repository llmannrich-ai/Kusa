"""Folhas de sprites de cenário da Fortaleza Orc (geradas no ChatGPT, fundo magenta) para o jogo.

Uso: python3 apps/client/scripts/fortalezaSprites.py acampamento    (folha de objetos)
     python3 apps/client/scripts/fortalezaSprites.py chao-capim     (textura de chão, ver CHAOS)

Lê docs/arte/fortaleza/<folha>.png (grade de colunas × linhas, na ordem de `objetos`), tira o magenta, separa as
manchas conectadas e põe cada uma no objeto da célula onde fica o centro dela (uma caveira solta conta com o objeto da
célula; a ponta de um objeto que invade a célula de baixo continua com ele), põe cada objeto na largura do jogo (LARGURA,
em px de arte: 128 por tile), afina o contorno do alfa (sem meio-transparente) e grava
apps/client/src/art/proto/fortaleza/<folha>.png (os objetos lado a lado, paleta de 256 cores) e <folha>.json (onde
cada um está na folha). O pé do objeto é o meio da linha de baixo.
"""
import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

FOLHAS = {
    "acampamento": {
        "grade": (4, 3),
        # nome: largura em px de arte (128 = 1 tile)
        "objetos": [
            ("tenda", 250), ("tendaChefe", 380), ("fogueira", 150), ("totem", 140),
            ("estandarte", 150), ("palicada", 128), ("armas", 150), ("caldeirao", 150),
            ("lenha", 125), ("ossos", 140), ("jaula", 230), ("barris", 140),
        ],
    },
}

# Texturas de chão: cada uma vira `tiles`×`tiles` tiles de 128 px (padrão 8: 1024×1024; o jogo corta nos tiles) e tem a
# cor média puxada para a do chão que ela substitui (`media`, RGB), na fração `forca`, para casar com as bordas pintadas
# pelo jogo.
CHAOS = {
    "chao-capim": {"media": (119, 142, 63), "forca": 0.7},
    "chao-basalto": {"media": (105, 107, 108), "forca": 0.6, "tiles": 4},
    "chao-terra": {"media": (127, 101, 71), "forca": 0.4, "tiles": 4},
    # O travertino creme é o que se pediu (as lajes antigas eram cinza): a cor quase não muda.
    "chao-lajes": {"media": (160, 128, 94), "forca": 0.5, "tiles": 4},
    # Interiores: a cor fica a do ChatGPT (não há chão antigo para casar; só se vê com o telhado sumido).
    "chao-salao": {"media": (87, 72, 64), "forca": 0, "tiles": 4},
    "chao-tabuas": {"media": (90, 54, 37), "forca": 0, "tiles": 4},
}

ROOT = Path(__file__).resolve().parents[3]


def chao(nome):
    spec = CHAOS[nome]
    src = Image.open(ROOT / "docs/arte/fortaleza" / f"{nome}.png").convert("RGB")
    side = 128 * int(sys.argv[2] if len(sys.argv) > 2 else spec.get("tiles", 8))
    img = src.resize((side, side), Image.LANCZOS)
    arr = np.array(img).astype(np.float32)
    mean = arr.reshape(-1, 3).mean(0)
    gain = 1 + (np.array(spec["media"], np.float32) / np.maximum(mean, 1) - 1) * spec["forca"]
    arr = np.clip(arr * gain, 0, 255).astype(np.uint8)
    dest = ROOT / "apps/client/src/art/proto/fortaleza"
    dest.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGB").save(dest / f"{nome}.webp", "WEBP", quality=90, method=6)
    print(f"{nome}: média {mean.round().tolist()} -> {arr.reshape(-1, 3).mean(0).round().tolist()}")


def magenta(r, g, b):
    """Fundo: magenta e o halo rosado ou roxo em volta dos objetos (vermelho e azul juntos, bem acima do verde)."""
    return min(r, b) - g > 50 and abs(r - b) < 90


def main(nome):
    spec = FOLHAS[nome]
    src = Image.open(ROOT / "docs/arte/fortaleza" / f"{nome}.png").convert("RGBA")
    W, H = src.size
    px = src.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if magenta(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    cols, rows = spec["grade"]
    arr = np.array(src)
    # O que sobrou do halo na borda (um pouco rosado, encostado no fundo) vira o contorno escuro do jogo.
    a = arr[:, :, 3] > 0
    edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
    pink = edge & (np.minimum(r, b) - g > 22)
    arr[pink, :3] = (26, 18, 16)
    solid = arr[:, :, 3] > 0
    # Manchas conectadas (8 vizinhos); cada uma vai para a célula do seu centro. Migalhas (< 40 px) saem.
    label = np.full(solid.shape, -1, dtype=np.int32)
    owner = {}
    n = 0
    for y0, x0 in zip(*np.nonzero(solid)):
        if label[y0, x0] >= 0:
            continue
        q = deque([(y0, x0)])
        label[y0, x0] = n
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and solid[ny, nx] and label[ny, nx] < 0:
                        label[ny, nx] = n
                        q.append((ny, nx))
        if len(pts) >= 40:
            cy = sum(p[0] for p in pts) / len(pts)
            cx = sum(p[1] for p in pts) / len(pts)
            owner[n] = min(cols - 1, int(cx * cols / W)) + cols * min(rows - 1, int(cy * rows / H))
        n += 1
    sprites = []
    for i, (obj, largura) in enumerate(spec["objetos"]):
        mine = [k for k, cell in owner.items() if cell == i]
        if not mine:
            raise SystemExit(f"{nome}: célula {i + 1} ({obj}) vazia")
        keep = np.isin(label, mine)
        piece = arr.copy()
        piece[~keep] = 0
        img = Image.fromarray(piece, "RGBA")
        part = img.crop(img.getchannel("A").getbbox())
        scale = largura / part.width
        out = part.resize((max(1, round(part.width * scale)), max(1, round(part.height * scale))), Image.LANCZOS)
        # Alfa duro (pixel art): meio-transparente vira cheio ou vazio.
        out.putalpha(out.getchannel("A").point(lambda v: 255 if v >= 110 else 0))
        sprites.append((obj, out))
    # Lado a lado, numa linha só (alinhados por baixo).
    total_w = sum(s.width for _, s in sprites) + 2 * len(sprites)
    total_h = max(s.height for _, s in sprites)
    sheet = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    frames = {}
    x = 0
    for obj, s in sprites:
        y = total_h - s.height
        sheet.paste(s, (x, y))
        frames[obj] = {"x": x, "y": y, "w": s.width, "h": s.height}
        x += s.width + 2
    dest = ROOT / "apps/client/src/art/proto/fortaleza"
    dest.mkdir(parents=True, exist_ok=True)
    # Paleta de 256 cores (o arquivo fica pequeno), com o índice 255 transparente.
    alpha = np.array(sheet.getchannel("A"))
    pal = sheet.convert("RGB").quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    idx = np.array(pal)
    idx[alpha == 0] = 255
    out = Image.fromarray(idx.astype(np.uint8), "P")
    palette = pal.getpalette()[: 255 * 3] + [0, 0, 0]
    out.putpalette(palette)
    out.save(dest / f"{nome}.png", optimize=True, transparency=255)
    (dest / f"{nome}.json").write_text(json.dumps(frames, indent=1) + "\n")
    print(f"{nome}: {len(frames)} objetos, folha {total_w}×{total_h}")


if __name__ == "__main__":
    chao(sys.argv[1]) if sys.argv[1] in CHAOS else main(sys.argv[1])
