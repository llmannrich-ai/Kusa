"""
Texturas e bordas do Pântano das Ruínas para o jogo, a partir das imagens do agente de arte (SharePoint,
`RPG_<id>_vNN.png`; ver docs/arte/agente/ORIENTACAO.md).

O gerador deixa as texturas repetíveis espelhando ~64 px de cada borda, o que cria uma cruz espelhada no mapa. Aqui:

1. textura: corta o miolo (sem a faixa espelhada) e refaz a emenda com um corte irregular entre os dois lados (sem
   degradê, que deixaria fantasma); bordas (transições): só a emenda da esquerda com a direita;
2. bordas: as cores de cima e de baixo são igualadas às das texturas dos dois terrenos (média e desvio por canal);
3. reduz para a escala do jogo (a referência tem 256 px por tile; o jogo, 128) e passa para uma paleta limitada de
   cores chapadas, sem pontilhado, para o pixel ficar duro como o do goblin de referência.

Saída: textura com 3x3 tiles (384x384) e borda com 6x2 tiles (768x256), em docs/arte/pantano-das-ruinas/jogo/.

Uso: python3 apps/client/scripts/pantanoTexturas.py <pasta com os RPG_*.png> docs/arte/pantano-das-ruinas/jogo
"""
import sys, os
import numpy as np
from PIL import Image

SRC_TILE, GAME_TILE = 256, 128
MIRROR = 64  # faixa espelhada em cada borda das texturas do gerador
BAND = 128  # largura da emenda refeita
CORES = 40

TEXTURAS = ["tex-capim", "tex-musgo", "tex-lama", "tex-copa", "tex-agua", "tex-lajes"]
# borda: (terreno de cima, terreno de baixo)
BORDAS = {"borda-margem": ("tex-capim", "tex-agua"), "borda-capim-lama": ("tex-capim", "tex-lama"), "borda-copa": ("tex-copa", "tex-capim")}


def blob_noise(h, w, cell, seed):
    """Ruído em manchas (grade grossa ampliada), determinístico."""
    rng = np.random.default_rng(seed)
    g = rng.random((h // cell + 2, w // cell + 2))
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w + 2 * cell, h + 2 * cell), Image.BILINEAR))[cell:cell + h, cell:cell + w] / 255.0


def seam_axis(a, band, axis, seed):
    """Refaz a emenda num eixo: a saída tem `band` a menos; o começo mistura com o que vinha depois do fim, por um
    corte irregular (cada pixel vem de um lado ou do outro, sem transparência)."""
    if axis == 0:
        return seam_axis(a.transpose(1, 0, 2), band, 1, seed).transpose(1, 0, 2)
    h, m, _ = a.shape
    n = m - band
    out = a[:, :n].copy()
    w = np.linspace(0, 1, band)[None, :]  # 0 no início (lado de lá), 1 no fim da faixa (lado de cá)
    noise = blob_noise(h, band, 12, seed) - 0.5
    keep = (w + noise * 0.9) > 0.5
    out[:, :band] = np.where(keep[..., None], a[:, :band], a[:, n:n + band])
    return out


def match_zone(a, zone, ref):
    """Leva `a` para as cores de `ref` (média e desvio de cada canal), medindo a origem só em `zone`."""
    zm, zsd = zone.reshape(-1, 3).mean(0), zone.reshape(-1, 3).std(0) + 1e-6
    rm, rsd = ref.reshape(-1, 3).mean(0), ref.reshape(-1, 3).std(0)
    return (a - zm) / zsd * rsd + rm


def finish(a, size):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    return im.quantize(colors=CORES, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def load(src, id_):
    for v in range(9, 0, -1):
        p = os.path.join(src, f"RPG_{id_}_v{v:02d}.png")
        if os.path.exists(p):
            return np.asarray(Image.open(p).convert("RGB")).astype(float)
    return None


def main(src, dst):
    tex = {}
    for k, id_ in enumerate(TEXTURAS):
        a = load(src, id_)
        if a is None:
            continue
        tex[id_] = a
        core = a[MIRROR:-MIRROR, MIRROR:-MIRROR]  # 896: 3 tiles + a faixa da emenda
        core = seam_axis(seam_axis(core, BAND, 1, 10 + k), BAND, 0, 20 + k)
        tiles = core.shape[0] // SRC_TILE
        finish(core[: tiles * SRC_TILE, : tiles * SRC_TILE], (tiles * GAME_TILE,) * 2).save(os.path.join(dst, f"{id_}.png"), optimize=True)
        print(id_, f"{tiles}x{tiles} tiles")
    for k, (id_, (top, bottom)) in enumerate(BORDAS.items()):
        a = load(src, id_)
        if a is None:
            continue
        a = np.asarray(Image.fromarray(a.astype(np.uint8)).resize((6 * SRC_TILE + BAND, 2 * SRC_TILE), Image.LANCZOS)).astype(float)
        h = a.shape[0]
        if top in tex and bottom in tex:
            # O lado de cima toma as cores da textura de cima; o de baixo, as da de baixo; no meio, mistura.
            up = match_zone(a, a[: h // 3], tex[top])
            down = match_zone(a, a[-h // 3:], tex[bottom])
            w = np.clip((np.arange(h) / (h - 1) - 0.3) / 0.4, 0, 1)[:, None, None]  # cima até 30%, baixo a partir de 70%
            a = up * (1 - w) + down * w
        a = seam_axis(a, BAND, 1, 40 + k)
        finish(a, (6 * GAME_TILE, 2 * GAME_TILE)).save(os.path.join(dst, f"{id_}.png"), optimize=True)
        print(id_, "6x2 tiles")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
